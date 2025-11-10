/**
 * Google Apps Script Price Service
 * Uses your custom Google Apps Script as backend API
 * to fetch Yahoo Finance prices with cookie/crumb authentication
 */

import axios from 'axios';
import { getCachedPrices, cachePrices } from './priceCache';

// Google Apps Script Web App URL
// Deployed: 2025-11-10 18:35 - Version with historical prices support
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfgvRFaG-NGrFsXHki7_dnZ3zaIQf3oWpT6f9WzQcQRAb8RC0L4uU59VferfN-EwORPg/exec';

// Check if URL is configured
export function isConfigured() {
  return GOOGLE_SCRIPT_URL && !GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE');
}

/**
 * Fetch stock price using Google Apps Script backend
 * @param {string} ticker - Stock ticker (e.g., 'VWCE.DE', 'BTC-USD')
 * @returns {Promise<Object>} Price data
 */
export async function fetchStockPriceViaScript(ticker) {
  if (!isConfigured()) {
    console.warn('⚠️ Google Apps Script URL not configured. Using fallback method.');
    return null;
  }

  try {
    const url = `${GOOGLE_SCRIPT_URL}?ticker=${encodeURIComponent(ticker)}`;

    const response = await axios.get(url, {
      timeout: 15000 // Google Apps Script might take longer
    });

    const data = response.data;

    if (data.error) {
      throw new Error(data.error);
    }

    // Convert to our standard format
    return {
      ticker: data.ticker,
      price: parseFloat(data.price) || null,
      change: parseFloat(data.change) || 0,
      changePercent: data.price && data.change
        ? (parseFloat(data.change) / (parseFloat(data.price) - parseFloat(data.change))) * 100
        : 0,
      bid: parseFloat(data.bid) || null,
      ask: parseFloat(data.ask) || null,
      currency: 'USD', // Yahoo Finance default
      timestamp: data.timestamp || new Date().toISOString(),
      source: 'google-apps-script',
      name: ticker
    };

  } catch (error) {
    console.error(`Error fetching price via Google Script for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Fetch multiple prices using Google Apps Script
 * @param {Array<string>} tickers - Array of ticker symbols
 * @param {Object} categoriesMap - Map of ticker to category (optional)
 * @returns {Promise<Object>} Map of ticker to price data
 */
export async function fetchMultiplePricesViaScript(tickers, categoriesMap = {}) {
  // Check cache first
  const cachedPrices = getCachedPrices();
  const uniqueTickers = [...new Set(tickers)];

  if (cachedPrices) {
    const allCached = uniqueTickers.every(ticker => cachedPrices[ticker]);
    if (allCached) {
      console.log('💾 Using fully cached prices');
      const filteredCache = {};
      uniqueTickers.forEach(ticker => {
        if (cachedPrices[ticker]) {
          filteredCache[ticker] = cachedPrices[ticker];
        }
      });
      return filteredCache;
    }
  }

  if (!isConfigured()) {
    console.warn('⚠️ Google Apps Script URL not configured');
    return {};
  }

  console.log(`📊 Fetching ${uniqueTickers.length} prices via Google Apps Script...`);

  const results = {};

  // Fetch sequentially with delay to respect rate limits
  for (let i = 0; i < uniqueTickers.length; i++) {
    const ticker = uniqueTickers[i];

    // Add delay between requests (1.5 seconds)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const priceData = await fetchStockPriceViaScript(ticker);
    if (priceData && priceData.price) {
      results[ticker] = priceData;
    } else {
      // Use cached data if available
      if (cachedPrices && cachedPrices[ticker]) {
        console.log(`💾 Using cached price for ${ticker}`);
        results[ticker] = cachedPrices[ticker];
      }
    }
  }

  // Cache the results
  if (Object.keys(results).length > 0) {
    cachePrices(results);
  }

  return results;
}

/**
 * Fetch historical monthly prices for a ticker
 * @param {string} ticker - Stock ticker (e.g., 'VWCE.DE', 'BTC-USD')
 * @param {string} startDate - Start date (YYYY-MM-DD format)
 * @param {string} endDate - End date (YYYY-MM-DD format)
 * @returns {Promise<Array>} Array of {date, price} objects
 */
export async function fetchHistoricalPrices(ticker, startDate, endDate) {
  if (!isConfigured()) {
    console.warn('⚠️ Google Apps Script URL not configured');
    return [];
  }

  try {
    const url = `${GOOGLE_SCRIPT_URL}?ticker=${encodeURIComponent(ticker)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;

    console.log(`📊 Fetching historical prices for ${ticker} (${startDate} to ${endDate})...`);

    const response = await axios.get(url, {
      timeout: 30000, // 30 seconds for historical data
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.data && response.data.historicalPrices) {
      console.log(`✓ Got ${response.data.historicalPrices.length} historical data points for ${ticker}`);
      return response.data.historicalPrices;
    }

    console.warn(`⚠️ No historical data returned for ${ticker}`);
    return [];

  } catch (error) {
    console.error(`Error fetching historical prices for ${ticker}:`, error.message);
    return [];
  }
}

/**
 * Fetch historical prices for multiple tickers in parallel
 * @param {Array} tickers - Array of ticker symbols
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Object mapping ticker to historical price array
 */
export async function fetchMultipleHistoricalPrices(tickers, startDate, endDate) {
  if (!isConfigured()) {
    console.warn('⚠️ Google Apps Script URL not configured');
    return {};
  }

  try {
    const uniqueTickers = [...new Set(tickers)];

    console.log(`📊 Fetching historical prices for ${uniqueTickers.length} tickers...`);

    // Fetch all in parallel with rate limiting
    const promises = uniqueTickers.map((ticker, index) =>
      new Promise(resolve => {
        // Stagger requests by 500ms each to avoid overwhelming the script
        setTimeout(() => {
          fetchHistoricalPrices(ticker, startDate, endDate)
            .then(data => resolve({ ticker, data }))
            .catch(() => resolve({ ticker, data: [] }));
        }, index * 500);
      })
    );

    const results = await Promise.all(promises);

    // Convert to object map
    const historicalMap = {};
    results.forEach(({ ticker, data }) => {
      historicalMap[ticker] = data;
    });

    const successCount = Object.values(historicalMap).filter(data => data.length > 0).length;
    console.log(`✓ Successfully fetched historical data for ${successCount}/${uniqueTickers.length} tickers`);

    return historicalMap;

  } catch (error) {
    console.error('Error fetching multiple historical prices:', error);
    return {};
  }
}

/**
 * Check if Google Apps Script service is configured and available
 * @returns {Promise<boolean>}
 */
export async function testGoogleScriptConnection() {
  if (!isConfigured()) {
    return false;
  }

  try {
    const testTicker = 'AAPL';
    const result = await fetchStockPriceViaScript(testTicker);
    return result !== null && result.price !== null;
  } catch (error) {
    console.error('Google Apps Script connection test failed:', error);
    return false;
  }
}

export default {
  fetchStockPriceViaScript,
  fetchMultiplePricesViaScript,
  fetchHistoricalPrices,
  fetchMultipleHistoricalPrices,
  testGoogleScriptConnection,
  isConfigured
};
