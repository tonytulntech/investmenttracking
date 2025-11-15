/**
 * Historical Price Service
 *
 * Fetches historical prices and current prices from Google Apps Script API
 * Supports monthly historical data for accurate performance calculations
 * Also provides current price fetching as primary method (faster and more reliable than CORS proxies)
 */

// HARDCODED Google Apps Script URL
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxOnB9j5LNJrebcBTVbZhQQITv77hCdty5nv-6Oq20ahdEkt9x5R-I5Ci-8s4kQYLIX8Q/exec';

// Timeout for fetch requests (5 seconds)
const FETCH_TIMEOUT = 5000;

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
 * Fetch historical prices for a ticker from Google Apps Script API
 *
 * @param {string} ticker - Ticker symbol (e.g., 'VWCE.DE', 'AAPL')
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of {date, price} objects
 */
export async function fetchHistoricalPrices(ticker, startDate, endDate) {
  try {
    // Build URL with parameters
    const url = `${GOOGLE_APPS_SCRIPT_URL}?ticker=${encodeURIComponent(ticker)}&startDate=${startDate}&endDate=${endDate}`;

    console.log(`📡 Fetching historical prices for ${ticker} from ${startDate} to ${endDate}`);

    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      console.warn(`⚠️ API request failed for ${ticker}: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    console.log(`📦 Response for ${ticker}:`, data);

    if (data.error) {
      console.warn(`⚠️ API returned error for ${ticker}:`, data.error);
      return [];
    }

    // Check if historicalPrices exists and is an array
    if (!data.historicalPrices || !Array.isArray(data.historicalPrices)) {
      console.warn(`⚠️ Invalid response format for ${ticker}. Expected {historicalPrices: [...]}, got:`, data);
      return [];
    }

    console.log(`✅ Received ${data.historicalPrices.length} historical prices for ${ticker}`);

    return data.historicalPrices;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`⏱️ Timeout fetching historical prices for ${ticker} (exceeded ${FETCH_TIMEOUT}ms)`);
    } else {
      console.warn(`⚠️ Error fetching historical prices for ${ticker}:`, error.message);
    }
    return [];
  }
}

/**
 * Fetch historical prices for multiple tickers
 * Processes in parallel for better performance
 *
 * @param {Array<string>} tickers - Array of ticker symbols
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} Object with ticker as key, historical prices as value
 */
export async function fetchMultipleHistoricalPrices(tickers, startDate, endDate) {
  try {
    console.log(`📊 Fetching historical prices for ${tickers.length} tickers`);

    // Fetch all tickers in parallel
    const promises = tickers.map(ticker =>
      fetchHistoricalPrices(ticker, startDate, endDate)
        .then(prices => ({ ticker, prices }))
    );

    const results = await Promise.all(promises);

    // Convert array to object with ticker as key
    const pricesMap = {};
    results.forEach(({ ticker, prices }) => {
      pricesMap[ticker] = prices;
    });

    console.log(`✅ Fetched historical prices for ${Object.keys(pricesMap).length} tickers`);

    return pricesMap;

  } catch (error) {
    console.error('Error fetching multiple historical prices:', error);
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
 *
 * @param {Array} historicalPrices - Array of {date, price} objects
 * @returns {Object} Object with YYYY-MM keys and price values
 */
export function buildMonthlyPriceTable(historicalPrices) {
  const table = {};

  if (!historicalPrices || historicalPrices.length === 0) {
    return table;
  }

  historicalPrices.forEach(item => {
    // Extract YYYY-MM from date
    const month = item.date.substring(0, 7); // "2024-01-15" -> "2024-01"
    table[month] = item.price;
  });

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
    if (data.currentPrice) {
      console.log(`✅ Current price for ${ticker}: ${data.currentPrice}`);
      return {
        ticker,
        price: data.currentPrice,
        timestamp: new Date().toISOString(),
        source: 'google-apps-script'
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
