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
const CORS_PROXY_FALLBACK = 'https://api.allorigins.win/raw?url=';

// Concorrenza max simultanea per non saturare il proxy CORS gratuito
const FETCH_CONCURRENCY = 4;
const FETCH_MAX_RETRIES = 3;

/**
 * Esegue task in batch con concorrenza limitata (pool pattern).
 * Mantiene l'ordine di input nell'array di risultati.
 */
const _runWithConcurrency = async (items, worker, concurrency = FETCH_CONCURRENCY) => {
  const results = new Array(items.length);
  let idx = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const cur = idx++;
      if (cur >= items.length) return;
      results[cur] = await worker(items[cur], cur);
    }
  });
  await Promise.all(runners);
  return results;
};

const _sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * GET con retry esponenziale + fallback proxy.
 * Retry solo su errori di rete / 429 / 5xx.
 */
const _getWithRetry = async (yahooURL, timeout = 10000) => {
  let lastErr;
  for (let attempt = 0; attempt < FETCH_MAX_RETRIES; attempt++) {
    const proxy = attempt < FETCH_MAX_RETRIES - 1 ? CORS_PROXY : CORS_PROXY_FALLBACK;
    try {
      return await axios.get(proxy + encodeURIComponent(yahooURL), { timeout });
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      const retriable = !status || status === 429 || status >= 500;
      if (!retriable) throw err;
      // backoff con jitter: 400ms, 900ms, 1800ms
      await _sleep(400 * Math.pow(2, attempt) + Math.random() * 300);
    }
  }
  throw lastErr;
};

// ─── Cambio FX (cache 1 ora) ────────────────────────────────────────────────
let _fxRates = null;
let _fxFetchTime = 0;

/**
 * Chiama Yahoo Finance in modo grezzo senza conversione valuta.
 * Usato internamente per i tassi FX (evita ricorsione).
 */
const _fetchRawYahoo = async (ticker) => {
  try {
    const yahooURL = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const response = await axios.get(CORS_PROXY + encodeURIComponent(yahooURL), { timeout: 8000 });
    const result = response.data?.chart?.result?.[0];
    if (!result) return null;
    const price = result.meta?.regularMarketPrice;
    return price > 0 ? price : null;
  } catch {
    return null;
  }
};

/**
 * Restituisce i tassi FX EUR-base, con cache di 1 ora.
 * usdToEur: quanto vale 1 USD in EUR
 * gbpToEur: quanto vale 1 GBP in EUR
 */
const _ensureFXRates = async () => {
  if (_fxRates && Date.now() - _fxFetchTime < 3_600_000) return _fxRates;
  const [eurusd, gbpeur] = await Promise.all([
    _fetchRawYahoo('EURUSD=X'),   // es. 1.09 → 1 EUR = 1.09 USD
    _fetchRawYahoo('GBPEUR=X')    // es. 1.18 → 1 GBP = 1.18 EUR
  ]);
  _fxRates = {
    usdToEur: eurusd ? 1 / eurusd : 0.917,
    gbpToEur: gbpeur || 1.18
  };
  _fxFetchTime = Date.now();
  console.log('💱 FX rates updated:', _fxRates);
  return _fxRates;
};

/**
 * Converte un prezzo nella valuta locale → EUR.
 * GBp/GBX = pence britannici (dividi per 100, poi × GBP→EUR)
 */
const _toEUR = (price, currency, fx) => {
  if (!currency || currency === 'EUR') return price;
  if (currency === 'GBp' || currency === 'GBX') return (price / 100) * fx.gbpToEur;
  if (currency === 'GBP')                        return price * fx.gbpToEur;
  if (currency === 'USD')                        return price * fx.usdToEur;
  // CHF, CAD, SEK ecc.: nessuna conversione configurata → restituisce raw con avviso
  console.warn(`💱 No EUR conversion for currency ${currency} — using raw price`);
  return price;
};

/**
 * Fetch stock/ETF/crypto price from Yahoo Finance via CORS proxy.
 * Il prezzo restituito è sempre convertito in EUR.
 *
 * @param {string} ticker - Ticker symbol (e.g., 'VWCE.DE', 'BTC-EUR', 'CCL.L')
 * @param {boolean} silent - Suppress error logging (default: false)
 * @returns {Promise<Object|null>} Price data in EUR or null
 */
export const fetchYahooPrice = async (ticker, silent = false) => {
  try {
    const yahooURL = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const response = await _getWithRetry(yahooURL, 10000);
    const data = response.data;

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      if (!silent) console.warn(`⚠️ No data from Yahoo for ${ticker}`);
      return null;
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];

    const rawPrice = meta.regularMarketPrice ||
                     (quote?.close ? quote.close[quote.close.length - 1] : null);

    if (!rawPrice || rawPrice <= 0) {
      if (!silent) console.warn(`⚠️ Invalid price from Yahoo for ${ticker}`);
      return null;
    }

    const rawCurrency = meta.currency || 'EUR';
    const previousRaw = meta.previousClose || meta.chartPreviousClose || rawPrice;

    // Converti in EUR
    let price = rawPrice;
    let previousClose = previousRaw;
    if (rawCurrency !== 'EUR') {
      const fx = await _ensureFXRates();
      price = _toEUR(rawPrice, rawCurrency, fx);
      previousClose = _toEUR(previousRaw, rawCurrency, fx);
      if (!silent) console.log(`💱 ${ticker}: ${rawPrice} ${rawCurrency} → €${price.toFixed(4)}`);
    }

    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      ticker,
      price,
      change,
      changePercent,
      currency: 'EUR',
      originalCurrency: rawCurrency,
      timestamp: new Date().toISOString(),
      source: 'yahoo',
      name: meta.longName || meta.shortName || ticker
    };
  } catch (error) {
    if (!silent) console.warn(`⚠️ Yahoo Finance error for ${ticker}:`, error.message);
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

    // Step 1: Fetch tickers da Yahoo Finance con concorrenza limitata (evita rate-limit proxy CORS)
    const yahooResults = await _runWithConcurrency(uniqueNormalized, async (ticker) => {
      const result = await fetchYahooPrice(ticker, true);
      return { ticker, result };
    });

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

      const cryptoResults = await _runWithConcurrency(failedCryptoTickers, async (ticker) => {
        const result = await fetchCryptoPrice(ticker);
        return { ticker, result };
      });
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

    // Step 3: fallback .MI → .DE per ETF europei non trovati su Borsa Italiana
    const miFailedETF = failedTickers.filter(t => t.endsWith('.MI'));
    if (miFailedETF.length > 0) {
      console.log(`🔄 Trying .DE fallback for ${miFailedETF.length} ETFs: ${miFailedETF.join(', ')}`);
      const deFallbackResults = await _runWithConcurrency(miFailedETF, async (ticker) => {
        const deTicker = ticker.replace(/\.MI$/, '.DE');
        const result = await fetchYahooPrice(deTicker, true);
        return { original: ticker, deTicker, result };
      });
      deFallbackResults.forEach(({ original, deTicker, result }) => {
        if (result && result.price > 0) {
          pricesMap[original] = { ...result, ticker: original }; // store under original ticker key
          console.log(`✅ .DE fallback ok: ${original} → ${deTicker} @ €${result.price.toFixed(2)}`);
        }
      });
    }

    // Step 4: fallback .MI → .L per ETF europei ancora non trovati (GBX→EUR già gestito)
    const stillMiFailed = miFailedETF.filter(t => !pricesMap[t]);
    if (stillMiFailed.length > 0) {
      console.log(`🔄 Trying .L fallback for ${stillMiFailed.length} ETFs: ${stillMiFailed.join(', ')}`);
      const lFallbackResults = await _runWithConcurrency(stillMiFailed, async (ticker) => {
        const lTicker = ticker.replace(/\.MI$/, '.L');
        const result = await fetchYahooPrice(lTicker, true);
        return { original: ticker, lTicker, result };
      });
      lFallbackResults.forEach(({ original, lTicker, result }) => {
        if (result && result.price > 0) {
          pricesMap[original] = { ...result, ticker: original };
          console.log(`✅ .L fallback ok: ${original} → ${lTicker} @ €${result.price.toFixed(2)}`);
        }
      });
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
 * Restituisce il fattore di conversione EUR → valuta nativa e il simbolo.
 * Usa i FX live se disponibili (dopo il primo fetch), altrimenti approssimazioni.
 * Moltiplica un prezzo in EUR per `factor` per ottenere il prezzo nella valuta originale.
 */
export const getNativeConversionFactor = (originalCurrency) => {
  const fx = _fxRates || { usdToEur: 0.926, gbpToEur: 1.18 };
  if (!originalCurrency || originalCurrency === 'EUR')
    return { factor: 1, symbol: '€', isForeign: false };
  if (originalCurrency === 'USD')
    return { factor: 1 / fx.usdToEur, symbol: '$', isForeign: true };
  if (originalCurrency === 'GBp' || originalCurrency === 'GBX')
    return { factor: 100 / fx.gbpToEur, symbol: 'p', isForeign: true };
  if (originalCurrency === 'GBP')
    return { factor: 1 / fx.gbpToEur, symbol: '£', isForeign: true };
  return { factor: 1, symbol: originalCurrency, isForeign: true };
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

/**
 * Fetch quote NATIVA (senza conversione EUR) — per indici/commodity/bond.
 * Usa lo stesso CORS proxy collaudato del resto dell'app.
 * @returns {Object|null} { ticker, price, change, changePercent, currency }
 */
export const fetchRawQuote = async (ticker) => {
  const yahooURL = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  try {
    const response = await axios.get(CORS_PROXY + encodeURIComponent(yahooURL), { timeout: 10000 });
    const meta = response.data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose || meta.chartPreviousClose || price;
    if (price == null) return null;

    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
    return { ticker, price, change, changePercent, currency: meta.currency || 'USD' };
  } catch {
    return null;
  }
};

export default {
  fetchPrice,
  fetchYahooPrice,
  fetchStockPrice,
  fetchCryptoPrice,
  fetchMultiplePrices,
  fetchRawQuote,
  searchSecurity,
  getMockPrice
};
