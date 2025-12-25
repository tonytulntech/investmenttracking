import axios from 'axios';

// CORS proxy to avoid CORS issues when calling Yahoo Finance directly from browser
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

/**
 * Fetch real-time stock/ETF price from Yahoo Finance
 * @param {string} ticker - Stock ticker symbol (e.g., 'VWCE.DE', 'AAPL')
 * @returns {Promise<Object>} Price data with current price, change, changePercent
 */
export const fetchStockPrice = async (ticker) => {
  try {
    const yahooURL = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
    const response = await axios.get(CORS_PROXY + encodeURIComponent(yahooURL), {
      timeout: 10000
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
      currency: meta.currency || 'EUR',
      timestamp: new Date().toISOString(),
      source: 'yahoo'
    };
  } catch (error) {
    console.error(`Error fetching price for ${ticker}:`, error.message);
    throw error;
  }
};

/**
 * Fetch prices for multiple tickers in parallel
 * @param {string[]} tickers - Array of ticker symbols
 * @returns {Promise<Object>} Object mapping ticker to price data
 */
export const fetchMultiplePrices = async (tickers) => {
  try {
    const uniqueTickers = [...new Set(tickers)]; // Remove duplicates
    const promises = uniqueTickers.map(ticker =>
      fetchStockPrice(ticker).catch(err => ({
        ticker,
        error: err.message,
        price: null
      }))
    );

    const results = await Promise.all(promises);

    // Convert array to object for easy lookup
    const pricesMap = {};
    results.forEach(result => {
      pricesMap[result.ticker] = result;
    });

    return pricesMap;
  } catch (error) {
    console.error('Error fetching multiple prices:', error);
    throw error;
  }
};

/**
 * Get fallback price with simulated variation (±2%)
 * Used when Yahoo Finance API fails
 * @param {string} ticker - Ticker symbol
 * @param {number} lastKnownPrice - Last known price for this ticker
 * @returns {Object} Simulated price data
 */
export const getFallbackPrice = (ticker, lastKnownPrice) => {
  // Simulate ±2% random variation
  const variation = (Math.random() - 0.5) * 0.04; // -2% to +2%
  const price = lastKnownPrice * (1 + variation);
  const change = price - lastKnownPrice;
  const changePercent = (change / lastKnownPrice) * 100;

  return {
    ticker,
    price: price,
    change: change,
    changePercent: changePercent,
    currency: 'EUR',
    timestamp: new Date().toISOString(),
    source: 'fallback'
  };
};

/**
 * Validate if a ticker symbol is valid format
 * @param {string} ticker - Ticker to validate
 * @returns {boolean} True if valid format
 */
export const isValidTicker = (ticker) => {
  if (!ticker || typeof ticker !== 'string') {
    return false;
  }

  // Basic validation: alphanumeric, dots, hyphens
  const tickerRegex = /^[A-Z0-9.-]+$/i;
  return tickerRegex.test(ticker.trim());
};
