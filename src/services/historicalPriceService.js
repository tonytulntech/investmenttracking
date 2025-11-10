/**
 * Historical Price Service
 *
 * Fetches historical prices from Google Apps Script API
 * Supports monthly historical data for accurate performance calculations
 */

import { getSettings } from './localStorageService';

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
    const settings = getSettings();
    const apiUrl = settings.googleAppsScriptUrl;

    if (!apiUrl) {
      console.warn('Google Apps Script URL not configured in settings');
      return [];
    }

    // Build URL with parameters
    const url = `${apiUrl}?ticker=${encodeURIComponent(ticker)}&startDate=${startDate}&endDate=${endDate}`;

    console.log(`📡 Fetching historical prices for ${ticker} from ${startDate} to ${endDate}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.error(`API returned error for ${ticker}:`, data.error);
      return [];
    }

    if (!data.historicalPrices || !Array.isArray(data.historicalPrices)) {
      console.error(`Invalid response format for ${ticker}:`, data);
      return [];
    }

    console.log(`✅ Received ${data.historicalPrices.length} historical prices for ${ticker}`);

    return data.historicalPrices;

  } catch (error) {
    console.error(`Error fetching historical prices for ${ticker}:`, error);
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

export default {
  fetchHistoricalPrices,
  fetchMultipleHistoricalPrices,
  getPriceForMonth,
  buildMonthlyPriceTable
};
