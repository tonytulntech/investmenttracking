/**
 * Google Apps Script Price Service
 * Uses your custom Google Apps Script as backend API
 * to fetch Yahoo Finance prices with cookie/crumb authentication
 */

import axios from 'axios';
import { getCachedPrices, cachePrices } from './priceCache';

// TODO: Replace with your actual Google Apps Script Web App URL
// Get this from: Deploy > New deployment > Copy web app URL
const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

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
  testGoogleScriptConnection,
  isConfigured
};
