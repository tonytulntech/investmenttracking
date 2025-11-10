/**
 * Advanced Yahoo Finance Service
 * Uses cookie + crumb authentication for more reliable price fetching
 * Based on Tony Pezzella's Google Apps Script implementation
 */

import axios from 'axios';

// Cache for cookie and crumb to avoid repeated auth requests
let authCache = {
  cookie: null,
  crumb: null,
  timestamp: 0,
  expiresIn: 30 * 60 * 1000 // 30 minutes
};

/**
 * Get cookie and crumb from Yahoo Finance
 * This is needed for authenticated API requests
 */
async function getCookieAndCrumb(ticker = 'AAPL') {
  // Check if cached auth is still valid
  const now = Date.now();
  if (authCache.cookie && authCache.crumb && (now - authCache.timestamp < authCache.expiresIn)) {
    console.log('✓ Using cached cookie/crumb');
    return {
      cookie: authCache.cookie,
      crumb: authCache.crumb
    };
  }

  try {
    console.log('🔑 Fetching new cookie and crumb from Yahoo Finance...');

    // Step 1: Get cookie from quote page
    const quoteUrl = `https://finance.yahoo.com/quote/${ticker}`;
    const quoteResponse = await axios.get(quoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      withCredentials: true,
      timeout: 10000
    });

    // Extract cookies from response
    const cookies = quoteResponse.headers['set-cookie'];
    if (!cookies) {
      throw new Error('No cookies received from Yahoo Finance');
    }

    const cookie = Array.isArray(cookies) ? cookies.join('; ') : cookies;

    // Step 2: Get crumb using the cookie
    const crumbUrl = 'https://query2.finance.yahoo.com/v1/test/getcrumb';
    const crumbResponse = await axios.get(crumbUrl, {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    });

    const crumb = crumbResponse.data.trim();

    if (!crumb) {
      throw new Error('No crumb received from Yahoo Finance');
    }

    // Cache the auth data
    authCache = {
      cookie,
      crumb,
      timestamp: now
    };

    console.log('✓ Successfully obtained cookie and crumb');

    return { cookie, crumb };

  } catch (error) {
    console.error('Error getting cookie/crumb:', error.message);
    return { cookie: null, crumb: null };
  }
}

/**
 * Fetch stock price using cookie + crumb authentication
 * @param {string} ticker - Stock ticker (e.g., 'VWCE.DE', 'BTC-USD')
 * @returns {Promise<Object>} Price data
 */
export async function fetchStockPriceAdvanced(ticker) {
  try {
    // Validate ticker
    if (!ticker || typeof ticker !== 'string' || ticker.trim() === '') {
      console.error('Invalid ticker:', ticker);
      return null;
    }

    // Get authentication
    const auth = await getCookieAndCrumb(ticker);
    if (!auth.cookie || !auth.crumb) {
      console.error('Failed to get authentication for', ticker);
      return null;
    }

    // Build API URL with crumb
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price,summaryDetail&crumb=${encodeURIComponent(auth.crumb)}`;

    // Make authenticated request
    const response = await axios.get(url, {
      headers: {
        'Cookie': auth.cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    });

    const data = response.data;

    if (!data.quoteSummary || !data.quoteSummary.result || data.quoteSummary.result.length === 0) {
      throw new Error('Invalid response format');
    }

    const result = data.quoteSummary.result[0];
    const price = result.price;
    const summaryDetail = result.summaryDetail;

    const marketPrice = price.regularMarketPrice?.raw || price.regularMarketPrice;
    const change = price.regularMarketChange?.raw || price.regularMarketChange || 0;
    const previousClose = price.regularMarketPreviousClose?.raw || price.regularMarketPreviousClose || marketPrice;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      ticker,
      price: marketPrice,
      change: change,
      changePercent: changePercent,
      bid: summaryDetail.bid?.raw || null,
      ask: summaryDetail.ask?.raw || null,
      currency: price.currency || 'USD',
      timestamp: new Date().toISOString(),
      source: 'yahoo-advanced',
      name: price.longName || price.shortName || ticker
    };

  } catch (error) {
    console.error(`Error fetching advanced price for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Fetch multiple stock prices using cookie + crumb authentication
 * @param {Array<string>} tickers - Array of ticker symbols
 * @returns {Promise<Object>} Map of ticker to price data
 */
export async function fetchMultiplePricesAdvanced(tickers) {
  const uniqueTickers = [...new Set(tickers)];

  console.log(`📊 Fetching ${uniqueTickers.length} prices using advanced method...`);

  // Get authentication once for all requests
  const auth = await getCookieAndCrumb();
  if (!auth.cookie || !auth.crumb) {
    console.error('Failed to get authentication');
    return {};
  }

  // Fetch all prices with delay between requests
  const results = {};

  for (let i = 0; i < uniqueTickers.length; i++) {
    const ticker = uniqueTickers[i];

    // Add delay between requests (respect rate limits)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }

    const priceData = await fetchStockPriceAdvanced(ticker);
    if (priceData) {
      results[ticker] = priceData;
    }
  }

  return results;
}

/**
 * Clear authentication cache (force re-authentication)
 */
export function clearAuthCache() {
  authCache = {
    cookie: null,
    crumb: null,
    timestamp: 0,
    expiresIn: 30 * 60 * 1000
  };
  console.log('🗑️ Auth cache cleared');
}

export default {
  fetchStockPriceAdvanced,
  fetchMultiplePricesAdvanced,
  clearAuthCache
};
