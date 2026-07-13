/**
 * Historical Price Service
 * VERSION: 2025-12-25-v2
 *
 * Fetches historical prices from multiple sources:
 * 1. Yahoo Finance API (via CORS proxy) - primary for ETFs and stocks
 * 2. Google Apps Script API - fallback
 * 3. CoinGecko API - for cryptocurrencies
 *
 * Supports monthly historical data for accurate performance calculations
 */

import { isCrypto, fetchCryptoHistoricalPrices, fetchMultipleCryptoHistoricalPrices } from './coinGecko';

console.log('📦 historicalPriceService.js v2 loaded - using Yahoo Finance direct + CORS proxy');

// HARDCODED Google Apps Script URL
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzrNB1TkO1COP5DxUqxlbY-nwEPghn4bNqAgeKCGXHcBnIkXQc69_uCF6oxIX8lRczWDg/exec';

// Timeout for fetch requests (10 seconds for historical data)
const FETCH_TIMEOUT = 10000;

// ── Historical price cache ───────────────────────────────────────────────────
// Stale-While-Revalidate: serve cached data immediately (even if expired),
// then refresh silently in the background so the next visit is instant.
// TTL: 7 days for completed past months (prices are immutable);
//      2 hours for the current month (intraday movements acceptable lag).
const HIST_CACHE_PREFIX = 'hist_v2_'; // bump version to invalidate old entries
const HIST_CACHE_TTL_PAST    = 7 * 24 * 60 * 60 * 1000;  // 7 days
const HIST_CACHE_TTL_CURRENT =      2 * 60 * 60 * 1000;  // 2 hours

function _histCacheKey(ticker, startDate) {
  return `${HIST_CACHE_PREFIX}${ticker}_${startDate}`;
}

/**
 * Returns { data, isStale } if a cache entry exists (fresh or expired),
 * or null if no entry exists at all.
 * Stale entries are intentionally kept so the SWR path can serve them
 * while a background refresh runs.
 */
function _getHistCached(ticker, startDate) {
  try {
    const raw = localStorage.getItem(_histCacheKey(ticker, startDate));
    if (!raw) return null;
    const { ts, data, miss } = JSON.parse(raw);
    const now = Date.now();
    // Cached misses (ticker that returned no data from any source) use 30-min TTL
    if (miss) {
      return { data: [], isStale: now - ts >= 30 * 60 * 1000 };
    }
    const currentMonth = new Date().toISOString().substring(0, 7); // 'YYYY-MM'
    // Use shorter TTL if cache contains data for the current month
    const hasCurrentMonth = data.some(d => d.date.startsWith(currentMonth));
    const ttl = hasCurrentMonth ? HIST_CACHE_TTL_CURRENT : HIST_CACHE_TTL_PAST;
    const isStale = now - ts >= ttl;
    return { data, isStale };
  } catch { return null; }
}

/**
 * Background refresh — fire-and-forget after serving stale data.
 * Updates the cache silently so the next load is instant.
 */
async function _refreshInBackground(ticker, startDate, endDate) {
  try {
    console.log(`🔄 Background refresh started for ${ticker}`);
    // Use exchange fallbacks (.MI → .DE → .L) just like the cold-fetch path
    const yahooPrices = await _fetchYahooWithExchangeFallback(ticker, startDate, endDate);
    if (yahooPrices && yahooPrices.length > 0) {
      _setHistCached(ticker, startDate, yahooPrices);
      console.log(`✅ Background refresh complete for ${ticker}`);
      return;
    }
    if (isCrypto(ticker)) {
      const cgPrices = await fetchCryptoHistoricalPrices(ticker, startDate, endDate, 'eur');
      if (cgPrices && cgPrices.length > 0) _setHistCached(ticker, startDate, cgPrices);
      return;
    }
    const gasPrices = await fetchHistoricalPricesFromGAS(ticker, startDate, endDate);
    if (gasPrices && gasPrices.length > 0) _setHistCached(ticker, startDate, gasPrices);
  } catch (e) {
    console.warn(`⚠️ Background refresh failed for ${ticker}:`, e.message);
  }
}

function _setHistCached(ticker, startDate, prices) {
  try {
    localStorage.setItem(
      _histCacheKey(ticker, startDate),
      JSON.stringify({
        ts: Date.now(),
        data: prices,
        // Flag empty results so the cache applies a short (30-min) TTL
        miss: prices.length === 0
      })
    );
  } catch (e) {
    // localStorage full — silently skip caching
    console.warn('⚠️ Could not cache historical prices (storage full?):', e.message);
  }
}

/** Clear all historical price cache entries (call when user forces refresh) */
export function clearHistoricalPriceCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(HIST_CACHE_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
  console.log(`🗑️ Historical price cache cleared (${keys.length} entries)`);
}

/**
 * Normalize ticker to standard format for Yahoo Finance / CoinGecko
 * Handles various input formats:
 * - BIT:A500 → A500.MI (Italian stocks)
 * - BIT:EMI → EMI.MI
 * - BTCEUR → BTC-EUR (crypto)
 * - ETHEUR → ETH-EUR
 * - Already correct formats pass through unchanged
 *
 * @param {string} ticker - Raw ticker symbol
 * @returns {string} Normalized ticker
 */
// ── TABELLA DI RISOLUZIONE TICKER ─────────────────────────────────────────────
// Mappa un ticker "come appare nel CSV / broker" → ticker Yahoo Finance che
// restituisce il prezzo corretto. Serve quando lo stesso simbolo indica sia un
// fondo USA sia la versione UCITS europea, o quando il broker usa un codice locale.
//
// ►► QUESTO È IL PUNTO UNICO DA AGGIORNARE quando arriva una segnalazione. ◄◄
// Aggiungi una riga: 'TICKER_UTENTE': 'TICKER_YAHOO_FUNZIONANTE'
// Al prossimo "Aggiorna prezzi" dell'utente il titolo viene prezzato correttamente.
//
// Come trovare il ticker Yahoo giusto da una segnalazione (ticker + ISIN + nome):
//   1. Cerca l'ISIN su justetf.com o finance.yahoo.com
//   2. Prendi il ticker della borsa quotata (es. .MI Milano, .DE Xetra, .L Londra, .PA Parigi)
//   3. Verifica che finance.yahoo.com/quote/TICKER mostri un prezzo
const UCITS_TICKER_OVERRIDES = {
  // VanEck Semiconductor UCITS Acc (IE00BMC38736) — non il fondo USA
  'SMH':  'SMH.MI',
  'SMGB': 'SMH.MI',
  'VVSM': 'SMH.MI',
  // Amundi MSCI Water UCITS — listato a Londra
  'WATL': 'WATL.L',
  // Micron Technology — stessa società del ticker USA MU
  'MTE':  'MU',
  // Global X Copper Miners UCITS — Xetra
  '4COP': '4COP.DE',
};

export function normalizeTicker(ticker) {
  if (!ticker) return ticker;

  let normalized = ticker.trim().toUpperCase();

  // Override UCITS (deve precedere ogni altra logica)
  if (UCITS_TICKER_OVERRIDES[normalized]) {
    const mapped = UCITS_TICKER_OVERRIDES[normalized];
    console.log(`🔄 UCITS override ${ticker} → ${mapped}`);
    return mapped;
  }

  // Handle BIT: prefix (Italian stocks) → convert to .MI suffix
  if (normalized.startsWith('BIT:')) {
    normalized = normalized.replace('BIT:', '') + '.MI';
    console.log(`🔄 Normalized ${ticker} → ${normalized}`);
    return normalized;
  }

  // Handle crypto tickers without hyphen (BTCEUR → BTC-EUR)
  const cryptoPatterns = [
    { pattern: /^(BTC)(EUR|USD)$/, replace: '$1-$2' },
    { pattern: /^(ETH)(EUR|USD)$/, replace: '$1-$2' },
    { pattern: /^(BNB)(EUR|USD)$/, replace: '$1-$2' },
    { pattern: /^(SOL)(EUR|USD)$/, replace: '$1-$2' },
    { pattern: /^(ADA)(EUR|USD)$/, replace: '$1-$2' },
    { pattern: /^(DOT)(EUR|USD)$/, replace: '$1-$2' },
    { pattern: /^(DOGE)(EUR|USD)$/, replace: '$1-$2' },
    { pattern: /^(SHIB)(EUR|USD)$/, replace: '$1-$2' },
    { pattern: /^(XRP)(EUR|USD)$/, replace: '$1-$2' },
    { pattern: /^(AVAX)(EUR|USD)$/, replace: '$1-$2' },
    { pattern: /^(MATIC)(EUR|USD)$/, replace: '$1-$2' },
    { pattern: /^(LINK)(EUR|USD)$/, replace: '$1-$2' },
  ];

  for (const { pattern, replace } of cryptoPatterns) {
    if (pattern.test(normalized)) {
      const newTicker = normalized.replace(pattern, replace);
      console.log(`🔄 Normalized ${ticker} → ${newTicker}`);
      return newTicker;
    }
  }

  return normalized;
}

/**
 * Fetch with timeout to avoid hanging requests
 * @param {string} url - URL to fetch
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Try Yahoo Finance for a ticker, with automatic exchange fallback for .MI tickers.
 * Mirrors the logic in the current-price service: .MI → .DE → .L
 * @returns {Array|null} prices or null if not found
 */
async function _fetchYahooWithExchangeFallback(ticker, startDate, endDate) {
  // Primary attempt
  const prices = await fetchHistoricalPricesFromYahooDirect(ticker, startDate, endDate);
  if (prices && prices.length > 0) return prices;

  // For Borsa Italiana tickers that Yahoo doesn't carry, try Xetra (.DE) then London (.L)
  if (ticker.endsWith('.MI')) {
    const base = ticker.slice(0, -3);

    const dePrices = await fetchHistoricalPricesFromYahooDirect(`${base}.DE`, startDate, endDate);
    if (dePrices && dePrices.length > 0) {
      console.log(`✅ Historical .DE fallback: ${ticker} → ${base}.DE`);
      return dePrices;
    }

    const lPrices = await fetchHistoricalPricesFromYahooDirect(`${base}.L`, startDate, endDate);
    if (lPrices && lPrices.length > 0) {
      console.log(`✅ Historical .L fallback: ${ticker} → ${base}.L`);
      return lPrices;
    }
  }

  return null;
}

export async function fetchHistoricalPrices(ticker, startDate, endDate) {
  // Normalize the ticker first
  const normalizedTicker = normalizeTicker(ticker);

  // ── Stale-While-Revalidate cache check ──────────────────────────────────
  const cached = _getHistCached(normalizedTicker, startDate);

  if (cached && !cached.isStale) {
    // Fresh cache — return immediately, no network call (including cached misses)
    if (cached.data.length > 0) {
      console.log(`💾 Historical cache hit for ${normalizedTicker} (${cached.data.length} months)`);
    } else {
      console.log(`⏭️ Skipping ${normalizedTicker} — no data available (cached miss, retrying in 30 min)`);
    }
    return cached.data;
  }

  if (cached && cached.isStale) {
    // Stale cache — return stored data instantly, refresh silently in background
    console.log(`⚡ Stale-While-Revalidate: serving stale data for ${normalizedTicker}, refreshing in background`);
    _refreshInBackground(normalizedTicker, startDate, endDate); // intentionally no await
    return cached.data;
  }

  // ── No cache at all — cold fetch ─────────────────────────────────────────
  // Try Yahoo Finance with .MI→.DE→.L exchange fallbacks
  const yahooPrices = await _fetchYahooWithExchangeFallback(normalizedTicker, startDate, endDate);
  if (yahooPrices && yahooPrices.length > 0) {
    _setHistCached(normalizedTicker, startDate, yahooPrices);
    return yahooPrices;
  }

  // Fallback to CoinGecko for crypto if Yahoo Finance fails
  if (isCrypto(normalizedTicker)) {
    console.log(`🪙 ${normalizedTicker} - Yahoo failed, trying CoinGecko API`);
    const cgPrices = await fetchCryptoHistoricalPrices(normalizedTicker, startDate, endDate, 'eur');
    if (cgPrices && cgPrices.length > 0) {
      _setHistCached(normalizedTicker, startDate, cgPrices);
      return cgPrices;
    }
    // Cache the miss
    _setHistCached(normalizedTicker, startDate, []);
    return [];
  }

  // Last resort: Google Apps Script (direct, no Yahoo retry)
  const gasPrices = await fetchHistoricalPricesFromGAS(normalizedTicker, startDate, endDate);
  if (gasPrices && gasPrices.length > 0) {
    _setHistCached(normalizedTicker, startDate, gasPrices);
    return gasPrices;
  }

  // All sources exhausted — cache the miss so we don't hammer the network for 30 min
  console.log(`⚠️ No historical data found for ${normalizedTicker} from any source — caching miss for 30 min`);
  _setHistCached(normalizedTicker, startDate, []);
  return [];
}

/**
 * Fetch historical prices directly from Yahoo Finance via CORS proxy
 * This is faster and more reliable than going through Google Apps Script
 *
 * @param {string} ticker - Ticker symbol (e.g., 'VWCE.DE', 'SWDA.MI')
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of {date, price} objects
 */
async function fetchHistoricalPricesFromYahooDirect(ticker, startDate, endDate) {
  try {
    // Convert dates to Unix timestamps
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000) + 86400;

    // Yahoo Finance API v8 endpoint with monthly interval
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1mo`;

    // Use CORS proxy (serverless function in prod, public proxy in dev)
    const corsProxy = import.meta.env.DEV ? 'https://corsproxy.io/?' : '/api/price?url=';
    const url = corsProxy + encodeURIComponent(yahooUrl);

    console.log(`📡 Fetching historical prices for ${ticker} via Yahoo Finance (direct)`);

    const response = await fetchWithTimeout(url, 8000); // 8 second timeout

    if (!response.ok) {
      console.warn(`⚠️ Yahoo Finance request failed for ${ticker}: ${response.status}`);
      return null; // Return null to signal fallback needed
    }

    const data = await response.json();

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      console.warn(`⚠️ No data returned from Yahoo Finance for ${ticker}`);
      return null;
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0];
    const closePrices = quotes.close || [];

    // Detect currency and compute conversion factor to EUR
    const currency = result.meta?.currency || 'EUR';
    let conversionFactor = 1.0;
    if (currency === 'GBp' || currency === 'GBX') {
      // GBX (pence) → GBP → EUR: ÷100 × ~1.18
      conversionFactor = (1 / 100) * 1.18;
      console.log(`💱 Historical ${ticker}: GBX → EUR conversion applied (÷100 × 1.18)`);
    } else if (currency === 'GBP') {
      conversionFactor = 1.18;
      console.log(`💱 Historical ${ticker}: GBP → EUR conversion applied (× 1.18)`);
    } else if (currency === 'USD') {
      conversionFactor = 0.93;
      console.log(`💱 Historical ${ticker}: USD → EUR conversion applied (× 0.93)`);
    }

    const prices = [];

    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const closePrice = closePrices[i];

      if (timestamp && closePrice && closePrice > 0) {
        const date = new Date(timestamp * 1000);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        prices.push({
          date: dateStr,
          price: closePrice * conversionFactor
        });
      }
    }

    console.log(`✅ Received ${prices.length} monthly prices from Yahoo Finance for ${ticker} (currency: ${currency})`);

    return prices;

  } catch (error) {
    console.warn(`⚠️ Error fetching from Yahoo Finance direct for ${ticker}:`, error.message);
    return null; // Return null to signal fallback needed
  }
}

/**
 * Fetch historical prices from Google Apps Script (last-resort fallback).
 * NOTE: Yahoo Finance (with exchange fallbacks) must already have been tried
 * by the caller — this function goes DIRECTLY to GAS without retrying Yahoo.
 *
 * @param {string} ticker - Ticker symbol (e.g., 'VWCE.DE', 'SWDA.MI')
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of {date, price} objects
 */
async function fetchHistoricalPricesFromGAS(ticker, startDate, endDate) {
  console.log(`🔄 Falling back to Google Apps Script for ${ticker}`);
  try {
    const url = `${GOOGLE_APPS_SCRIPT_URL}?ticker=${encodeURIComponent(ticker)}&startDate=${startDate}&endDate=${endDate}`;
    console.log(`📡 Fetching historical prices for ${ticker} via Google Apps Script`);
    const response = await fetchWithTimeout(url, 8000); // 8s — same as Yahoo
    if (!response.ok) {
      console.warn(`⚠️ GAS request failed for ${ticker}: ${response.status}`);
      return [];
    }
    const data = await response.json();
    if (data.error || !data.historicalPrices || !Array.isArray(data.historicalPrices)) {
      console.warn(`⚠️ GAS returned no usable data for ${ticker}`);
      return [];
    }
    console.log(`✅ Received ${data.historicalPrices.length} historical prices for ${ticker} (source: GAS)`);
    return data.historicalPrices;
  } catch (error) {
    if (error.name === 'AbortError') console.warn(`⏱️ Timeout fetching historical prices for ${ticker}`);
    else console.warn(`⚠️ Error fetching historical prices for ${ticker}:`, error.message);
    return [];
  }
}

/**
 * Run async tasks with a maximum concurrency limit.
 * Prevents overwhelming the CORS proxy with too many simultaneous requests.
 * @param {Array<Function>} fns - Array of async functions (no args) to run
 * @param {number} limit - Max simultaneous tasks
 * @returns {Promise<Array>} Results in the same order as fns
 */
async function withConcurrencyLimit(fns, limit) {
  const results = new Array(fns.length);
  let nextIdx = 0;

  async function worker() {
    while (nextIdx < fns.length) {
      const i = nextIdx++;
      try { results[i] = await fns[i](); }
      catch { results[i] = null; }
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, fns.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

/**
 * Fetch historical prices for multiple tickers
 * Automatically separates crypto from traditional assets
 *
 * @param {Array<string>} tickers - Array of ticker symbols
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} Object with ticker as key, historical prices as value
 */
export async function fetchMultipleHistoricalPrices(tickers, startDate, endDate) {
  try {
    console.log(`📊 Fetching historical prices for ${tickers.length} tickers`);

    // Normalize all tickers first and create mapping
    const tickerMapping = {}; // originalTicker -> normalizedTicker
    const normalizedTickers = tickers.map(ticker => {
      const normalized = normalizeTicker(ticker);
      tickerMapping[ticker] = normalized;
      return normalized;
    });

    // Remove duplicates after normalization
    const uniqueNormalized = [...new Set(normalizedTickers)];

    console.log(`📈 Fetching ${uniqueNormalized.length} unique tickers (max 4 concurrent) via Yahoo Finance`);

    // Fetch with concurrency limit of 4 to avoid CORS proxy rate-limiting.
    // Cached tickers resolve in microseconds so the limit doesn't slow them down.
    const fns = uniqueNormalized.map(ticker => () =>
      fetchHistoricalPrices(ticker, startDate, endDate)
        .then(prices => ({ ticker, prices }))
    );

    const results = await withConcurrencyLimit(fns, 4);

    // Build normalized prices map (guard against null results from failed fetches)
    const normalizedPricesMap = {};
    results.forEach(r => {
      if (r) normalizedPricesMap[r.ticker] = r.prices;
    });

    // Map back to original ticker names for backward compatibility
    const pricesMap = {};
    for (const [originalTicker, normalizedTicker] of Object.entries(tickerMapping)) {
      if (normalizedPricesMap[normalizedTicker]) {
        pricesMap[originalTicker] = normalizedPricesMap[normalizedTicker];
      }
    }

    console.log(`✅ Fetched historical prices for ${Object.keys(pricesMap).length} tickers`);

    return pricesMap;

  } catch (error) {
    console.error('Error fetching multiple historical prices:', error);
    return {};
  }
}

/**
 * Fetch historical prices for traditional assets (ETFs, stocks)
 */
async function fetchMultipleTraditionalPrices(tickers, startDate, endDate) {
  if (tickers.length === 0) return {};

  try {
    // Fetch all tickers in parallel
    const promises = tickers.map(ticker =>
      fetchHistoricalPricesFromGAS(ticker, startDate, endDate)
        .then(prices => ({ ticker, prices }))
    );

    const results = await Promise.all(promises);

    // Convert array to object with ticker as key
    const pricesMap = {};
    results.forEach(({ ticker, prices }) => {
      pricesMap[ticker] = prices;
    });

    return pricesMap;

  } catch (error) {
    console.error('Error fetching multiple traditional prices:', error);
    return {};
  }
}

/**
 * Get price for a specific month from historical data
 *
 * @param {Array} historicalPrices - Array of {date, price} objects
 * @param {string} targetMonth - Month in YYYY-MM format
 * @returns {number|null} Price for that month or null if not found
 */
export function getPriceForMonth(historicalPrices, targetMonth) {
  if (!historicalPrices || historicalPrices.length === 0) {
    return null;
  }

  // Find exact match or closest month
  const match = historicalPrices.find(item => item.date.startsWith(targetMonth));

  if (match) {
    return match.price;
  }

  // If no exact match, find closest date before target
  const targetDate = new Date(targetMonth + '-01');
  let closestPrice = null;
  let closestDiff = Infinity;

  historicalPrices.forEach(item => {
    const itemDate = new Date(item.date);
    const diff = Math.abs(targetDate - itemDate);

    if (diff < closestDiff && itemDate <= targetDate) {
      closestDiff = diff;
      closestPrice = item.price;
    }
  });

  return closestPrice;
}

/**
 * Build a price lookup table by month for efficient access
 * Also fills in gaps with interpolation
 *
 * @param {Array} historicalPrices - Array of {date, price} objects
 * @returns {Object} Object with YYYY-MM keys and price values
 */
export function buildMonthlyPriceTable(historicalPrices) {
  const table = {};

  if (!historicalPrices || historicalPrices.length === 0) {
    return table;
  }

  // First pass: add all available prices
  historicalPrices.forEach(item => {
    // Extract YYYY-MM from date
    const month = item.date.substring(0, 7); // "2024-01-15" -> "2024-01"
    table[month] = item.price;
  });

  // Second pass: fill gaps using linear interpolation
  const months = Object.keys(table).sort();

  if (months.length >= 2) {
    const firstMonth = months[0];
    const lastMonth = months[months.length - 1];

    // Generate all months in range
    const allMonths = [];
    let current = new Date(firstMonth + '-01');
    const end = new Date(lastMonth + '-01');

    while (current <= end) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      allMonths.push(monthKey);
      current.setMonth(current.getMonth() + 1);
    }

    // Fill gaps
    let lastKnownPrice = null;
    allMonths.forEach(month => {
      if (table[month]) {
        lastKnownPrice = table[month];
      } else if (lastKnownPrice) {
        // Use last known price for missing months
        table[month] = lastKnownPrice;
        console.log(`📊 Filled gap for ${month} with price ${lastKnownPrice}`);
      }
    });
  }

  return table;
}

/**
 * Fetch CURRENT price for a ticker from Google Apps Script API
 * This is faster and more reliable than using CORS proxies
 *
 * @param {string} ticker - Ticker symbol (e.g., 'ACWIA.MI', 'VWCE.DE')
 * @returns {Promise<Object|null>} Price data or null if failed
 */
export async function fetchCurrentPrice(ticker) {
  try {
    // Request without date range to get only current price
    const url = `${GOOGLE_APPS_SCRIPT_URL}?ticker=${encodeURIComponent(ticker)}&current=true`;

    console.log(`💰 Fetching current price for ${ticker} via Google Apps Script`);

    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      console.warn(`⚠️ API request failed for ${ticker}: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.warn(`⚠️ API returned error for ${ticker}:`, data.error);
      return null;
    }

    // Check for current price in response
    if (data.currentPrice || data.price) {
      const price = data.currentPrice || data.price;
      console.log(`✅ Current price for ${ticker}: ${price}`);
      return {
        ticker,
        price: price,
        change: data.change || 0,
        changePercent: data.changePercent || 0,
        timestamp: new Date().toISOString(),
        source: data.source || 'google-apps-script'
      };
    }

    // Fallback: use most recent historical price if available
    if (data.historicalPrices && data.historicalPrices.length > 0) {
      const mostRecent = data.historicalPrices[data.historicalPrices.length - 1];
      console.log(`✅ Using most recent price for ${ticker}: ${mostRecent.price}`);
      return {
        ticker,
        price: mostRecent.price,
        timestamp: new Date().toISOString(),
        source: 'google-apps-script'
      };
    }

    console.warn(`⚠️ No price data found for ${ticker}`);
    return null;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`⏱️ Timeout fetching current price for ${ticker}`);
    } else {
      console.warn(`⚠️ Error fetching current price for ${ticker}:`, error.message);
    }
    return null;
  }
}

/**
 * Fetch current prices for multiple tickers using Google Apps Script
 * @param {Array<string>} tickers - Array of ticker symbols
 * @returns {Promise<Object>} Object mapping ticker to price data
 */
export async function fetchMultipleCurrentPrices(tickers) {
  try {
    console.log(`💰 Fetching current prices for ${tickers.length} tickers via Google Apps Script`);

    const promises = tickers.map(ticker =>
      fetchCurrentPrice(ticker)
        .then(priceData => ({ ticker, priceData }))
    );

    const results = await Promise.all(promises);

    const pricesMap = {};
    results.forEach(({ ticker, priceData }) => {
      if (priceData) {
        pricesMap[ticker] = priceData;
      }
    });

    console.log(`✅ Fetched ${Object.keys(pricesMap).length}/${tickers.length} current prices`);

    return pricesMap;

  } catch (error) {
    console.error('Error fetching multiple current prices:', error);
    return {};
  }
}

/**
 * Fetch TER (Total Expense Ratio) for a ticker from Google Apps Script API
 * @param {string} ticker - Ticker symbol (e.g., 'VWCE.DE')
 * @returns {Promise<Object|null>} TER data object or null if not found
 */
export async function fetchTER(ticker) {
  try {
    const url = `${GOOGLE_APPS_SCRIPT_URL}?ticker=${encodeURIComponent(ticker)}&ter=true`;

    console.log(`📊 Fetching TER for ${ticker} via Google Apps Script`);

    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      console.warn(`⚠️ API request failed for ${ticker}: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.warn(`⚠️ TER not found for ${ticker}:`, data.error);
      return null;
    }

    if (data.ter !== null && data.ter !== undefined) {
      console.log(`✅ Received TER for ${ticker}: ${data.ter}% (source: ${data.source})`);
      return {
        ticker: data.ticker,
        ter: data.ter,
        source: data.source,
        lastUpdated: data.lastUpdated
      };
    }

    return null;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`⏱️ Timeout fetching TER for ${ticker}`);
    } else {
      console.warn(`⚠️ Error fetching TER for ${ticker}:`, error.message);
    }
    return null;
  }
}

/**
 * Fetch TERs for multiple tickers
 * @param {Array<string>} tickers - Array of ticker symbols
 * @returns {Promise<Object>} Object mapping ticker to TER data
 */
export async function fetchMultipleTERs(tickers) {
  try {
    console.log(`📊 Fetching TERs for ${tickers.length} tickers`);

    const promises = tickers.map(ticker =>
      fetchTER(ticker)
        .then(terData => ({ ticker, terData }))
    );

    const results = await Promise.all(promises);

    const terMap = {};
    results.forEach(({ ticker, terData }) => {
      if (terData && terData.ter !== null) {
        terMap[ticker] = terData;
      }
    });

    console.log(`✅ Fetched ${Object.keys(terMap).length}/${tickers.length} TERs`);

    return terMap;

  } catch (error) {
    console.error('Error fetching multiple TERs:', error);
    return {};
  }
}

export default {
  fetchHistoricalPrices,
  fetchMultipleHistoricalPrices,
  getPriceForMonth,
  buildMonthlyPriceTable,
  fetchCurrentPrice,
  fetchMultipleCurrentPrices,
  fetchTER,
  fetchMultipleTERs
};
