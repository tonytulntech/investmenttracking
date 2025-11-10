/**
 * Price Cache Service
 *
 * Caches price data to avoid excessive API calls and improve performance.
 * Cache expires after 30 minutes.
 */

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const CACHE_KEY = 'price_cache';

/**
 * Get cached prices
 * @returns {Object|null} Cached prices or null if expired
 */
export function getCachedPrices() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { timestamp, data } = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - timestamp < CACHE_DURATION) {
      console.log('💾 Using cached prices (age: ' + Math.round((now - timestamp) / 1000) + 's)');
      return data;
    } else {
      console.log('⏰ Price cache expired');
      return null;
    }
  } catch (error) {
    console.error('Error reading price cache:', error);
    return null;
  }
}

/**
 * Cache prices with current timestamp
 * @param {Object} prices - Price data to cache
 */
export function cachePrices(prices) {
  try {
    const cacheData = {
      timestamp: Date.now(),
      data: prices
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log('✓ Prices cached successfully');
  } catch (error) {
    console.error('Error caching prices:', error);
  }
}

/**
 * Clear price cache (force refresh)
 */
export function clearPriceCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Price cache cleared');
  } catch (error) {
    console.error('Error clearing price cache:', error);
  }
}

/**
 * Get cache age in seconds
 * @returns {number|null} Age in seconds or null if no cache
 */
export function getCacheAge() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { timestamp } = JSON.parse(cached);
    return Math.round((Date.now() - timestamp) / 1000);
  } catch (error) {
    return null;
  }
}

export default {
  getCachedPrices,
  cachePrices,
  clearPriceCache,
  getCacheAge
};
