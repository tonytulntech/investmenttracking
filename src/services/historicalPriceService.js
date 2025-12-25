/**
 * Historical Price Service
 *
 * Fetches historical prices from multiple sources:
 * 1. Google Apps Script API (Yahoo Finance) - for ETFs and stocks
 * 2. CoinGecko API - for cryptocurrencies
 *
 * Supports monthly historical data for accurate performance calculations
 */

import { isCrypto, fetchCryptoHistoricalPrices, fetchMultipleCryptoHistoricalPrices } from './coinGecko';

// HARDCODED Google Apps Script URL
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzrNB1TkO1COP5DxUqxlbY-nwEPghn4bNqAgeKCGXHcBnIkXQc69_uCF6oxIX8lRczWDg/exec';

// Timeout for fetch requests (10 seconds for historical data)
const FETCH_TIMEOUT = 10000;

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
export function normalizeTicker(ticker) {
  if (!ticker) return ticker;

  let normalized = ticker.trim().toUpperCase();

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
 * Fetch historical prices for a ticker
 * Automatically routes to the correct API based on ticker type
 *
 * @param {string} ticker - Ticker symbol (e.g., 'VWCE.DE', 'BTC-EUR')
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of {date, price} objects
 */
export async function fetchHistoricalPrices(ticker, startDate, endDate) {
  // Normalize the ticker first
  const normalizedTicker = normalizeTicker(ticker);

  // Check if it's a cryptocurrency
  if (isCrypto(normalizedTicker)) {
    console.log(`🪙 ${normalizedTicker} is a cryptocurrency, using CoinGecko API`);
    return await fetchCryptoHistoricalPrices(normalizedTicker, startDate, endDate, 'eur');
  }

  // Otherwise use Google Apps Script (Yahoo Finance)
  return await fetchHistoricalPricesFromGAS(normalizedTicker, startDate, endDate);
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

    // Use CORS proxy
    const corsProxy = 'https://corsproxy.io/?';
    const url = corsProxy + encodeURIComponent(yahooUrl);

    console.log(`📡 Fetching historical prices for ${ticker} via Yahoo Finance (direct)`);

    const response = await fetchWithTimeout(url, 15000); // 15 second timeout

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

    const prices = [];

    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const closePrice = closePrices[i];

      if (timestamp && closePrice && closePrice > 0) {
        const date = new Date(timestamp * 1000);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        prices.push({
          date: dateStr,
          price: closePrice
        });
      }
    }

    console.log(`✅ Received ${prices.length} monthly prices from Yahoo Finance for ${ticker}`);

    return prices;

  } catch (error) {
    console.warn(`⚠️ Error fetching from Yahoo Finance direct for ${ticker}:`, error.message);
    return null; // Return null to signal fallback needed
  }
}

/**
 * Fetch historical prices - tries Yahoo Finance direct first, then Google Apps Script
 *
 * @param {string} ticker - Ticker symbol (e.g., 'VWCE.DE', 'SWDA.MI')
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of {date, price} objects
 */
async function fetchHistoricalPricesFromGAS(ticker, startDate, endDate) {
  // Try Yahoo Finance direct first (faster)
  const yahooPrices = await fetchHistoricalPricesFromYahooDirect(ticker, startDate, endDate);
  if (yahooPrices && yahooPrices.length > 0) {
    return yahooPrices;
  }

  // Fallback to Google Apps Script
  console.log(`🔄 Falling back to Google Apps Script for ${ticker}`);

  try {
    // Build URL with parameters
    const url = `${GOOGLE_APPS_SCRIPT_URL}?ticker=${encodeURIComponent(ticker)}&startDate=${startDate}&endDate=${endDate}`;

    console.log(`📡 Fetching historical prices for ${ticker} via Google Apps Script`);

    const response = await fetchWithTimeout(url, 30000); // 30 second timeout for GAS

    if (!response.ok) {
      console.warn(`⚠️ API request failed for ${ticker}: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.warn(`⚠️ API returned error for ${ticker}:`, data.error);
      return [];
    }

    if (!data.historicalPrices || !Array.isArray(data.historicalPrices)) {
      console.warn(`⚠️ Invalid response format for ${ticker}`);
      return [];
    }

    console.log(`✅ Received ${data.historicalPrices.length} historical prices for ${ticker} (source: GAS)`);

    return data.historicalPrices;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`⏱️ Timeout fetching historical prices for ${ticker}`);
    } else {
      console.warn(`⚠️ Error fetching historical prices for ${ticker}:`, error.message);
    }
    return [];
  }
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

    // Separate crypto from traditional assets using normalized tickers
    const cryptoTickers = uniqueNormalized.filter(ticker => isCrypto(ticker));
    const traditionalTickers = uniqueNormalized.filter(ticker => !isCrypto(ticker));

    console.log(`🪙 Crypto tickers (${cryptoTickers.length}): ${cryptoTickers.join(', ')}`);
    console.log(`📈 Traditional tickers (${traditionalTickers.length}): ${traditionalTickers.join(', ')}`);

    // Fetch in parallel
    const [cryptoPrices, traditionalPrices] = await Promise.all([
      // Fetch crypto prices from CoinGecko
      cryptoTickers.length > 0
        ? fetchMultipleCryptoHistoricalPrices(cryptoTickers, startDate, endDate, 'eur')
        : {},
      // Fetch traditional prices from Google Apps Script (Yahoo Finance)
      fetchMultipleTraditionalPrices(traditionalTickers, startDate, endDate)
    ]);

    // Merge results with normalized ticker keys
    const normalizedPricesMap = { ...cryptoPrices, ...traditionalPrices };

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
