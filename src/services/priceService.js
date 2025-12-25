/**
 * Price Service
 * VERSION: 2025-12-25-v3 - NO Google Apps Script dependency
 *
 * Fetches real-time prices from:
 * 1. Yahoo Finance (via CORS proxy) - PRIMARY for ALL assets (stocks, ETFs, crypto)
 * 2. CoinGecko - FALLBACK for crypto only
 *
 * This version eliminates Google Apps Script for faster, more reliable pricing.
 */

import axios from 'axios';
import { getCachedPrices, cachePrices } from './priceCache';
import { normalizeTicker } from './historicalPriceService';
import { isCrypto } from './coinGecko';

console.log('📦 priceService.js v3 loaded - Yahoo Finance primary, NO Google Apps Script');

const CORS_PROXY = 'https://corsproxy.io/?';

/**
 * Fetch stock/ETF/crypto price from Yahoo Finance via CORS proxy
 * Yahoo Finance supports crypto pairs like BTC-EUR, ETH-EUR
 *
 * @param {string} ticker - Ticker symbol (e.g., 'VWCE.DE', 'BTC-EUR')
 * @param {boolean} silent - Suppress error logging (default: false)
 * @returns {Promise<Object|null>} Price data or null
 */
export const fetchYahooPrice = async (ticker, silent = false) => {
  try {
    const yahooURL = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const url = CORS_PROXY + encodeURIComponent(yahooURL);

    const response = await axios.get(url, {
      timeout: 10000 // 10 second timeout
    });

    const data = response.data;

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      if (!silent) console.warn(`⚠️ No data from Yahoo for ${ticker}`);
      return null;
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];

    const currentPrice = meta.regularMarketPrice ||
                         (quote?.close ? quote.close[quote.close.length - 1] : null);

    if (!currentPrice || currentPrice <= 0) {
      if (!silent) console.warn(`⚠️ Invalid price from Yahoo for ${ticker}`);
      return null;
    }

    const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      ticker,
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      currency: meta.currency || 'EUR',
      timestamp: new Date().toISOString(),
      source: 'yahoo',
      name: meta.longName || meta.shortName || ticker
    };
  } catch (error) {
    if (!silent) {
      console.warn(`⚠️ Yahoo Finance error for ${ticker}:`, error.message);
    }
    return null;
  }
};

// Alias for backward compatibility
export const fetchStockPrice = fetchYahooPrice;

/**
 * Fetch cryptocurrency price from CoinGecko (fallback for crypto)
 * @param {string} ticker - Crypto ticker (e.g., 'BTC', 'BTC-EUR', 'ETH-USD')
 * @param {string} vsCurrency - Fiat currency to convert to (default: 'eur')
 * @returns {Promise<Object|null>} Price data or null
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
      'XRP': 'ripple',
      'DOGE': 'dogecoin',
      'SHIB': 'shiba-inu'
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
    console.warn(`⚠️ CoinGecko error for ${ticker}:`, error.message);
    return null;
  }
};

/**
 * Fetch price for any asset (auto-detect and route appropriately)
 * Flow: Yahoo Finance first, CoinGecko fallback for crypto
 *
 * @param {string} ticker - Ticker symbol
 * @param {string} category - Asset category (optional, helps routing)
 * @returns {Promise<Object|null>} Price data or null
 */
export const fetchPrice = async (ticker, category = null) => {
  const normalizedTicker = normalizeTicker(ticker);

  // Try Yahoo Finance first (works for stocks, ETFs, AND crypto like BTC-EUR)
  const yahooPrice = await fetchYahooPrice(normalizedTicker, true);
  if (yahooPrice) {
    return yahooPrice;
  }

  // Fallback to CoinGecko for crypto only
  if (isCrypto(normalizedTicker) || category === 'Crypto') {
    console.log(`🪙 ${normalizedTicker} - Yahoo failed, trying CoinGecko`);
    return await fetchCryptoPrice(normalizedTicker);
  }

  console.warn(`❌ No price available for ${ticker}`);
  return null;
};

/**
 * Fetch prices for multiple tickers in parallel
 * Strategy:
 * 1. Check cache first (unless force refresh)
 * 2. Yahoo Finance for ALL tickers (primary)
 * 3. CoinGecko fallback for failed crypto tickers
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
        const uniqueTickers = [...new Set(tickers)];
        const allCached = uniqueTickers.every(ticker => cachedPrices[ticker]);

        if (allCached) {
          console.log('💾 Using cached prices for all tickers');
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

    // Normalize tickers and create mapping for backward compatibility
    const tickerMapping = {}; // originalTicker -> normalizedTicker
    const normalizedTickers = uniqueTickers.map(ticker => {
      const normalized = normalizeTicker(ticker);
      tickerMapping[ticker] = normalized;
      return normalized;
    });
    const uniqueNormalized = [...new Set(normalizedTickers)];

    console.log(`🚀 Fetching ${uniqueNormalized.length} prices via Yahoo Finance (primary)`);

    // Step 1: Fetch ALL tickers from Yahoo Finance in parallel
    const yahooPromises = uniqueNormalized.map(ticker =>
      fetchYahooPrice(ticker, true).then(result => ({ ticker, result }))
    );

    const yahooResults = await Promise.all(yahooPromises);

    let pricesMap = {};
    const failedTickers = [];

    yahooResults.forEach(({ ticker, result }) => {
      if (result && result.price > 0) {
        pricesMap[ticker] = result;
      } else {
        failedTickers.push(ticker);
      }
    });

    const yahooSuccessCount = Object.keys(pricesMap).length;
    console.log(`✅ Yahoo Finance: ${yahooSuccessCount}/${uniqueNormalized.length} prices fetched`);

    // Step 2: Fallback to CoinGecko for failed crypto tickers
    const failedCryptoTickers = failedTickers.filter(ticker =>
      isCrypto(ticker) || categoriesMap[ticker] === 'Crypto'
    );

    if (failedCryptoTickers.length > 0) {
      console.log(`🪙 Trying CoinGecko for ${failedCryptoTickers.length} failed crypto tickers...`);

      const cryptoPromises = failedCryptoTickers.map(ticker =>
        fetchCryptoPrice(ticker).then(result => ({ ticker, result }))
      );

      const cryptoResults = await Promise.all(cryptoPromises);
      let cryptoSuccessCount = 0;

      cryptoResults.forEach(({ ticker, result }) => {
        if (result && result.price > 0) {
          pricesMap[ticker] = result;
          cryptoSuccessCount++;
        }
      });

      if (cryptoSuccessCount > 0) {
        console.log(`✅ CoinGecko fallback: ${cryptoSuccessCount}/${failedCryptoTickers.length} crypto prices fetched`);
      }
    }

    // Log any remaining failures
    const stillFailed = uniqueNormalized.filter(ticker => !pricesMap[ticker]);
    if (stillFailed.length > 0) {
      console.warn(`⚠️ ${stillFailed.length} tickers unavailable:`, stillFailed);
    }

    const totalSuccess = Object.keys(pricesMap).length;
    console.log(`🏁 Total: ${totalSuccess}/${uniqueNormalized.length} prices fetched`);

    // Map back to original ticker names for backward compatibility
    const finalPricesMap = {};
    for (const [originalTicker, normalizedTicker] of Object.entries(tickerMapping)) {
      if (pricesMap[normalizedTicker]) {
        finalPricesMap[originalTicker] = pricesMap[normalizedTicker];
      }
    }

    // Cache the results
    cachePrices(finalPricesMap);

    return finalPricesMap;
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
    const response = await axios.get(CORS_PROXY + encodeURIComponent(yahooURL), {
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
 * Get fallback/mock price (when all APIs fail)
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
  fetchYahooPrice,
  fetchStockPrice,
  fetchCryptoPrice,
  fetchMultiplePrices,
  searchSecurity,
  getMockPrice
};
