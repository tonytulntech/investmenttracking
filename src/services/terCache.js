/**
 * TER Cache Service
 *
 * Manages caching of TER (Total Expense Ratio) data in localStorage
 * Similar to priceCache but for TER data
 */

const TER_CACHE_KEY = 'ter_cache';
const TER_CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Get cached TER data from localStorage
 * @returns {Object} Object mapping ticker to TER data
 */
export function getCachedTERs() {
  try {
    const cached = localStorage.getItem(TER_CACHE_KEY);
    if (!cached) {
      return {};
    }

    const data = JSON.parse(cached);
    const now = Date.now();

    // Filter out expired entries
    const valid = {};
    Object.entries(data).forEach(([ticker, terData]) => {
      if (terData.timestamp && (now - terData.timestamp) < TER_CACHE_EXPIRY) {
        valid[ticker] = terData;
      }
    });

    return valid;
  } catch (error) {
    console.error('Error reading TER cache:', error);
    return {};
  }
}

/**
 * Cache TER data for a ticker
 * @param {string} ticker - Ticker symbol
 * @param {Object} terData - TER data object {ter, source, lastUpdated}
 */
export function cacheTER(ticker, terData) {
  try {
    const cached = getCachedTERs();

    cached[ticker] = {
      ...terData,
      timestamp: Date.now()
    };

    localStorage.setItem(TER_CACHE_KEY, JSON.stringify(cached));
    console.log(`💾 Cached TER for ${ticker}: ${terData.ter}%`);
  } catch (error) {
    console.error('Error caching TER:', error);
  }
}

/**
 * Cache multiple TERs
 * @param {Object} terMap - Object mapping ticker to TER data
 */
export function cacheMultipleTERs(terMap) {
  try {
    const cached = getCachedTERs();

    Object.entries(terMap).forEach(([ticker, terData]) => {
      cached[ticker] = {
        ...terData,
        timestamp: Date.now()
      };
    });

    localStorage.setItem(TER_CACHE_KEY, JSON.stringify(cached));
    console.log(`💾 Cached ${Object.keys(terMap).length} TERs`);
  } catch (error) {
    console.error('Error caching multiple TERs:', error);
  }
}

/**
 * Get TER for a specific ticker from cache
 * @param {string} ticker - Ticker symbol
 * @returns {Object|null} TER data or null if not cached/expired
 */
export function getCachedTER(ticker) {
  const cached = getCachedTERs();
  return cached[ticker] || null;
}

/**
 * Clear TER cache
 */
export function clearTERCache() {
  try {
    localStorage.removeItem(TER_CACHE_KEY);
    console.log('🗑️ TER cache cleared');
  } catch (error) {
    console.error('Error clearing TER cache:', error);
  }
}

/**
 * Check if TER is cached and valid for a ticker
 * @param {string} ticker - Ticker symbol
 * @returns {boolean} True if valid cached TER exists
 */
export function hasCachedTER(ticker) {
  const cached = getCachedTER(ticker);
  return cached !== null && cached.ter !== null;
}

export default {
  getCachedTERs,
  cacheTER,
  cacheMultipleTERs,
  getCachedTER,
  clearTERCache,
  hasCachedTER
};
