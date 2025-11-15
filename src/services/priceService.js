/**
 * Price Service
 * Fetches real-time prices from multiple sources:
 * 1. CoinGecko (for cryptocurrencies) - fast, reliable, no API key needed
 * 2. Google Apps Script (for stocks/ETFs) - primary source
 *
 * CORS proxy fallback has been removed to eliminate slow page loads and error spam.
 * If Google Apps Script fails, prices simply won't update (cache is used instead).
 */

import axios from 'axios';
import { getCachedPrices, cachePrices } from './priceCache';
import { fetchMultipleCurrentPrices } from './historicalPriceService';
import { isCrypto } from './coinGecko';

/**
 * Fetch stock/ETF price from Yahoo Finance with retry logic
 * @param {string} ticker - Stock ticker symbol (e.g., 'AAPL', 'VWCE.DE')
 * @param {number} retries - Number of retry attempts (default: 2)
 * @returns {Promise<Object>} Price data
 */
export const fetchStockPrice = async (ticker, retries = 2) => {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const yahooURL = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
      const response = await axios.get(getCorsProxy() + encodeURIComponent(yahooURL), {
        timeout: 15000 // Increased to 15 seconds
      });

      const data = response.data;

      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        throw new Error('Invalid response from Yahoo Finance');
      }

      const result = data.chart.result[0];
      const meta = result.meta;
      const quote = result.indicators.quote[0];

      const currentPrice = meta.regularMarketPrice || quote.close[quote.close.length - 1];
      const previousClose = meta.previousClose || meta.chartPreviousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      return {
        ticker,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        currency: meta.currency || 'USD',
        timestamp: new Date().toISOString(),
        source: 'yahoo',
        name: meta.longName || meta.shortName || ticker
      };
    } catch (error) {
      lastError = error;

      // Try rotating proxy on error
      rotateProxy();

      // If not last attempt, wait before retry (exponential backoff)
      if (attempt < retries) {
        const waitMs = 1000 * Math.pow(2, attempt); // 1s, 2s
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }
  }

  console.error(`Error fetching price for ${ticker}:`, lastError?.message);
  return null;
};

/**
 * Fetch cryptocurrency price from CoinGecko (free, no API key needed)
 * Handles both plain symbols (BTC) and ticker formats (BTC-EUR, ETH-USD)
 * @param {string} ticker - Crypto ticker (e.g., 'BTC', 'BTC-EUR', 'ETH-USD')
 * @param {string} vsCurrency - Fiat currency to convert to (default: 'eur')
 * @returns {Promise<Object>} Price data
 */
export const fetchCryptoPrice = async (ticker, vsCurrency = 'eur') => {
  try {
    // Extract base symbol and currency from ticker (BTC-EUR -> BTC, EUR)
    const parts = ticker.split('-');
    const baseSymbol = parts[0].toUpperCase();
    const currency = parts.length > 1 ? parts[1].toLowerCase() : vsCurrency;

    const cryptoIdMap = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'ADA': 'cardano',
      'SOL': 'solana',
      'DOT': 'polkadot',
      'AVAX': 'avalanche-2',
      'MATIC': 'matic-network',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'ATOM': 'cosmos',
      'XRP': 'ripple'
    };

    const cryptoId = cryptoIdMap[baseSymbol] || baseSymbol.toLowerCase();
    const url = `https://api.coingecko.com/api/v3/simple/price`;

    const response = await axios.get(url, {
      params: {
        ids: cryptoId,
        vs_currencies: currency,
        include_24hr_change: true,
        include_last_updated_at: true
      },
      timeout: 10000
    });

    const data = response.data[cryptoId];

    if (!data) {
      console.warn(`⚠️ Crypto ${ticker} (${cryptoId}) not found on CoinGecko`);
      return null;
    }

    const price = data[currency];
    const changePercent = data[`${currency}_24h_change`] || 0;
    const change = (price * changePercent) / 100;

    return {
      ticker: ticker.toUpperCase(),
      price: price,
      change: change,
      changePercent: changePercent,
      currency: currency.toUpperCase(),
      timestamp: new Date(data.last_updated_at * 1000).toISOString(),
      source: 'coingecko',
      name: baseSymbol
    };
  } catch (error) {
    console.error(`❌ Error fetching crypto price for ${ticker}:`, error.message);
    return null;
  }
};

/**
 * Fetch price for any asset (auto-detect crypto vs stock)
 * @param {string} ticker - Ticker symbol
 * @param {string} category - Asset category (optional, helps routing)
 * @returns {Promise<Object>} Price data
 */
export const fetchPrice = async (ticker, category = null) => {
  // Common crypto symbols
  const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'AVAX', 'MATIC', 'LINK', 'UNI', 'ATOM', 'XRP'];

  // If explicitly crypto or detected as crypto
  if (category === 'Crypto' || cryptoSymbols.includes(ticker.toUpperCase())) {
    const cryptoPrice = await fetchCryptoPrice(ticker);
    if (cryptoPrice) return cryptoPrice;
  }

  // Try Yahoo Finance for stocks/ETFs
  return await fetchStockPrice(ticker);
};

/**
 * Fetch prices for multiple tickers in parallel
 * Strategy:
 * 1. Check cache first (unless force refresh)
 * 2. Try Google Apps Script (primary, most reliable)
 * 3. Fall back to CORS proxy for any failures
 *
 * @param {Array} tickers - Array of ticker symbols
 * @param {Object} categoriesMap - Map of ticker to category (optional)
 * @param {boolean} forceRefresh - Force refresh bypassing cache (default: false)
 * @returns {Promise<Object>} Object mapping ticker to price data
 */
export const fetchMultiplePrices = async (tickers, categoriesMap = {}, forceRefresh = false) => {
  try {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedPrices = getCachedPrices();
      if (cachedPrices) {
        // Check if we have all tickers in cache
        const uniqueTickers = [...new Set(tickers)];
        const allCached = uniqueTickers.every(ticker => cachedPrices[ticker]);

        if (allCached) {
          // Return cached prices
          const filteredCache = {};
          uniqueTickers.forEach(ticker => {
            if (cachedPrices[ticker]) {
              filteredCache[ticker] = cachedPrices[ticker];
            }
          });
          return filteredCache;
        }
      }
    }

    // Fetch fresh prices
    const uniqueTickers = [...new Set(tickers)];

    // Separate crypto from stocks/ETFs
    const cryptoTickers = uniqueTickers.filter(ticker => isCrypto(ticker) || categoriesMap[ticker] === 'Crypto');
    const stockTickers = uniqueTickers.filter(ticker => !isCrypto(ticker) && categoriesMap[ticker] !== 'Crypto');

    console.log('🔄 Fetching prices - Crypto via CoinGecko, Stocks via Google Apps Script');
    console.log(`📊 ${cryptoTickers.length} crypto, ${stockTickers.length} stocks/ETFs`);

    let pricesMap = {};

    // Step 1: Fetch crypto prices directly from CoinGecko (skip Google Apps Script)
    if (cryptoTickers.length > 0) {
      console.log('💰 Fetching crypto prices from CoinGecko...');
      for (const ticker of cryptoTickers) {
        try {
          const cryptoPrice = await fetchCryptoPrice(ticker);
          if (cryptoPrice && !cryptoPrice.error) {
            pricesMap[ticker] = cryptoPrice;
          }
        } catch (err) {
          console.warn(`⚠️ Failed to fetch crypto price for ${ticker}`);
        }
      }
    }

    // Step 2: Try Google Apps Script for stocks/ETFs only (no crypto!)
    if (stockTickers.length > 0) {
      console.log('📡 Fetching stock/ETF prices via Google Apps Script...');
      const googlePrices = await fetchMultipleCurrentPrices(stockTickers);

      // Merge Google prices
      pricesMap = { ...pricesMap, ...googlePrices };

      // Log failed tickers (but don't retry with CORS proxy to avoid errors)
      const failedStockTickers = stockTickers.filter(ticker => !googlePrices[ticker]);
      if (failedStockTickers.length > 0) {
        console.warn(`⚠️ ${failedStockTickers.length} stocks failed to fetch:`, failedStockTickers);
        console.log('💡 Tip: Check if Google Apps Script is running correctly');
      }
    }

    const successCount = Object.keys(pricesMap).length;
    console.log(`✅ Successfully fetched ${successCount}/${uniqueTickers.length} prices`);

    // Cache the results
    cachePrices(pricesMap);

    return pricesMap;
  } catch (error) {
    console.error('Error fetching multiple prices:', error);
    return {};
  }
};

/**
 * Search for a ticker/ISIN to get full info
 * @param {string} query - Ticker or ISIN to search
 * @returns {Promise<Array>} Array of matching securities
 */
export const searchSecurity = async (query) => {
  try {
    const yahooURL = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10`;
    const response = await axios.get(getCorsProxy() + encodeURIComponent(yahooURL), {
      timeout: 10000
    });

    const quotes = response.data.quotes || [];

    return quotes.map(q => ({
      ticker: q.symbol,
      name: q.longname || q.shortname,
      type: q.quoteType,
      exchange: q.exchange,
      isin: q.isin || ''
    }));
  } catch (error) {
    console.error('Error searching security:', error);
    return [];
  }
};

/**
 * Get fallback/mock price (when API fails)
 * Simulates a small random variation
 * @param {string} ticker - Ticker symbol
 * @param {number} basePrice - Base price to vary from
 * @returns {Object} Mock price data
 */
export const getMockPrice = (ticker, basePrice = 100) => {
  const variation = (Math.random() - 0.5) * 0.04; // ±2%
  const price = basePrice * (1 + variation);
  const change = price - basePrice;
  const changePercent = (change / basePrice) * 100;

  return {
    ticker,
    price: price,
    change: change,
    changePercent: changePercent,
    currency: 'EUR',
    timestamp: new Date().toISOString(),
    source: 'mock',
    name: ticker
  };
};

export default {
  fetchPrice,
  fetchStockPrice,
  fetchCryptoPrice,
  fetchMultiplePrices,
  searchSecurity,
  getMockPrice
};
