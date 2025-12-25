/**
 * TER (Total Expense Ratio) Service - CACHE ONLY
 *
 * TER represents the annual cost of holding an ETF as a percentage of assets.
 *
 * TER is now MANUAL ONLY:
 * - User enters TER manually in transaction form
 * - TER is cached (7-day expiry) and automatically syncs to other transactions with same ticker
 * - No automatic fetching to avoid CORS errors and slow page loads
 */

import { getCachedTER, cacheTER } from './terCache';

// Re-export cacheTER for convenience
export { cacheTER } from './terCache';

/**
 * Get TER for a ticker symbol (synchronous - uses cache only)
 * For automatic fetching, use getTERWithAPI instead
 * @param {string} ticker - The ticker symbol
 * @returns {number|null} - TER percentage or null if not found
 */
export function getTER(ticker) {
  if (!ticker) return null;

  // Try cache first (fast)
  const cached = getCachedTER(ticker);
  if (cached && cached.ter !== null) {
    return cached.ter;
  }

  // No automatic fetch in sync mode - use getTERWithAPI for that
  return null;
}

/**
 * Get TER for a ticker symbol with API fetch (asynchronous)
 * Tries multiple sources in order: cache, JustETF, ExtraETF, Yahoo Finance, Morningstar
 * @param {string} ticker - The ticker symbol
 * @param {string} isin - Optional ISIN for better fetching from JustETF
 * @param {boolean} forceRefresh - Force refresh from API even if cached
 * @returns {Promise<number|null>} - TER percentage or null if not found
 */
export async function getTERWithAPI(ticker, isin = null, forceRefresh = false) {
  if (!ticker) return null;

  // 1. Try cache first (unless forceRefresh)
  if (!forceRefresh) {
    const cached = getCachedTER(ticker);
    if (cached && cached.ter !== null) {
      console.log(`💾 Using cached TER for ${ticker}: ${cached.ter}%`);
      return cached.ter;
    }
  }

  // CORS proxies (JustETF, ExtraETF, Yahoo, Morningstar) have been completely removed
  // due to frequent CORS errors and rate limiting that slow down page loads.
  //
  // TER is now MANUAL ONLY with cache synchronization:
  // - User enters TER manually in transaction form
  // - TER is cached (7-day expiry) and syncs to other transactions with same ticker
  // - No automatic fetching to ensure fast, reliable page loads

  return null;
}

/**
 * Calculate annual TER cost for a position
 * @param {number} marketValue - Current market value
 * @param {number} ter - TER percentage
 * @returns {number} - Annual cost in currency
 */
export function calculateAnnualTERCost(marketValue, ter) {
  if (!marketValue || !ter) return 0;
  return (marketValue * ter) / 100;
}

/**
 * Get TER category (Low, Medium, High)
 * @param {number} ter - TER percentage
 * @returns {string} - Category
 */
export function getTERCategory(ter) {
  if (ter === null || ter === undefined) return 'Unknown';
  if (ter <= 0.15) return 'Low';
  if (ter <= 0.50) return 'Medium';
  return 'High';
}

/**
 * Get TER badge color
 * @param {number} ter - TER percentage
 * @returns {string} - Color class
 */
export function getTERBadgeColor(ter) {
  const category = getTERCategory(ter);
  switch (category) {
    case 'Low': return 'badge-success';
    case 'Medium': return 'badge-warning';
    case 'High': return 'badge-danger';
    default: return 'badge-secondary';
  }
}

/**
 * Batch get TERs for multiple tickers (synchronous - cache + hardcoded only)
 * @param {Array<string>} tickers - Array of ticker symbols
 * @returns {Object} - Map of ticker to TER
 */
export function getBatchTER(tickers) {
  const result = {};
  tickers.forEach(ticker => {
    result[ticker] = getTER(ticker);
  });
  return result;
}

/**
 * Batch fetch TERs for multiple tickers with API (asynchronous)
 * @param {Array<string|Object>} tickersOrHoldings - Array of ticker symbols OR array of {ticker, isin} objects
 * @param {boolean} forceRefresh - Force refresh from API even if cached
 * @returns {Promise<Object>} - Map of ticker to TER
 */
export async function getBatchTERWithAPI(tickersOrHoldings, forceRefresh = false) {
  // Support both array of strings and array of objects
  const promises = tickersOrHoldings.map(item => {
    const ticker = typeof item === 'string' ? item : item.ticker;
    const isin = typeof item === 'object' ? item.isin : null;

    return getTERWithAPI(ticker, isin, forceRefresh)
      .then(ter => ({ ticker, ter }));
  });

  const results = await Promise.all(promises);

  const terMap = {};
  results.forEach(({ ticker, ter }) => {
    terMap[ticker] = ter;
  });

  return terMap;
}

export default {
  getTER,
  getTERWithAPI,
  calculateAnnualTERCost,
  getTERCategory,
  getTERBadgeColor,
  getBatchTER,
  getBatchTERWithAPI
};
