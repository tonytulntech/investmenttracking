import {
  getQuote,
  getBulkQuotes,
  getHistoricalPrices,
  getETFFundamentals,
  searchSymbols,
  parseTicker,
  type EODHDQuote,
  type EODHDHistoricalPrice,
  type EODHDFundamentals,
} from './eodhd';

// Cache duration in milliseconds
const CACHE_DURATION = {
  QUOTE: 60 * 60 * 1000,        // 1 hour for real-time quotes
  HISTORICAL: 24 * 60 * 60 * 1000, // 24 hours for historical data
  FUNDAMENTALS: 7 * 24 * 60 * 60 * 1000, // 7 days for fundamentals
  SEARCH: 24 * 60 * 60 * 1000,  // 24 hours for search results
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Check if we're in browser
const isBrowser = typeof window !== 'undefined';

// Get from cache
function getFromCache<T>(key: string): T | null {
  if (!isBrowser) return null;

  try {
    const cached = localStorage.getItem(`eodhd_${key}`);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    return entry.data;
  } catch {
    return null;
  }
}

// Check if cache is valid
function isCacheValid(key: string, maxAge: number): boolean {
  if (!isBrowser) return false;

  try {
    const cached = localStorage.getItem(`eodhd_${key}`);
    if (!cached) return false;

    const entry: CacheEntry<unknown> = JSON.parse(cached);
    return Date.now() - entry.timestamp < maxAge;
  } catch {
    return false;
  }
}

// Save to cache
function saveToCache<T>(key: string, data: T): void {
  if (!isBrowser) return;

  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`eodhd_${key}`, JSON.stringify(entry));
  } catch (error) {
    console.warn('Failed to save to cache:', error);
  }
}

// Track API calls today
function getApiCallsToday(): number {
  if (!isBrowser) return 0;

  const today = new Date().toDateString();
  const stored = localStorage.getItem('eodhd_api_calls');

  if (stored) {
    const { date, count } = JSON.parse(stored);
    if (date === today) return count;
  }

  return 0;
}

function incrementApiCalls(): void {
  if (!isBrowser) return;

  const today = new Date().toDateString();
  const current = getApiCallsToday();

  localStorage.setItem('eodhd_api_calls', JSON.stringify({
    date: today,
    count: current + 1,
  }));
}

// Check if we can make API calls (limit: 20/day for free tier)
function canMakeApiCall(): boolean {
  return getApiCallsToday() < 18; // Leave 2 buffer
}

// Cached quote fetch
export async function getCachedQuote(ticker: string): Promise<EODHDQuote | null> {
  const cacheKey = `quote_${ticker}`;

  // Check cache first
  if (isCacheValid(cacheKey, CACHE_DURATION.QUOTE)) {
    console.log(`[EODHD] Using cached quote for ${ticker}`);
    return getFromCache<EODHDQuote>(cacheKey);
  }

  // Check API limit
  if (!canMakeApiCall()) {
    console.warn('[EODHD] API limit reached, using cached data');
    return getFromCache<EODHDQuote>(cacheKey);
  }

  // Fetch new data
  const { symbol, exchange } = parseTicker(ticker);
  const quote = await getQuote(symbol, exchange);

  if (quote) {
    incrementApiCalls();
    saveToCache(cacheKey, quote);
    console.log(`[EODHD] Fetched fresh quote for ${ticker} (${getApiCallsToday()}/20 calls today)`);
  }

  return quote;
}

// Cached bulk quotes - fetches all tickers in ONE API call
// Much more efficient for portfolio refresh (1 call instead of N calls)
export async function getCachedBulkQuotes(
  tickers: string[]
): Promise<Record<string, EODHDQuote>> {
  const results: Record<string, EODHDQuote> = {};
  const tickersToFetch: string[] = [];

  // Check cache for each ticker
  for (const ticker of tickers) {
    const cacheKey = `quote_${ticker}`;

    if (isCacheValid(cacheKey, CACHE_DURATION.QUOTE)) {
      const cached = getFromCache<EODHDQuote>(cacheKey);
      if (cached) {
        results[ticker] = cached;
        console.log(`[EODHD] Using cached quote for ${ticker}`);
      }
    } else {
      tickersToFetch.push(ticker);
    }
  }

  // Fetch uncached tickers in bulk (1 API call)
  if (tickersToFetch.length > 0) {
    if (!canMakeApiCall()) {
      console.warn('[EODHD] API limit reached, using only cached data');
      // Return whatever we have in cache, even if expired
      for (const ticker of tickersToFetch) {
        const cached = getFromCache<EODHDQuote>(`quote_${ticker}`);
        if (cached) results[ticker] = cached;
      }
    } else {
      console.log(`[EODHD] Fetching ${tickersToFetch.length} quotes in 1 bulk call`);
      const freshQuotes = await getBulkQuotes(tickersToFetch);

      // Cache each result
      for (const [ticker, quote] of Object.entries(freshQuotes)) {
        saveToCache(`quote_${ticker}`, quote);
        results[ticker] = quote;
      }

      // Only count as 1 API call since bulk endpoint
      incrementApiCalls();
      console.log(`[EODHD] Bulk fetch complete (${getApiCallsToday()}/20 calls today)`);
    }
  }

  return results;
}

// Cached historical prices
export async function getCachedHistoricalPrices(
  ticker: string,
  from?: string,
  to?: string
): Promise<EODHDHistoricalPrice[]> {
  const cacheKey = `historical_${ticker}_${from || 'start'}_${to || 'end'}`;

  if (isCacheValid(cacheKey, CACHE_DURATION.HISTORICAL)) {
    console.log(`[EODHD] Using cached historical for ${ticker}`);
    return getFromCache<EODHDHistoricalPrice[]>(cacheKey) || [];
  }

  if (!canMakeApiCall()) {
    console.warn('[EODHD] API limit reached, using cached data');
    return getFromCache<EODHDHistoricalPrice[]>(cacheKey) || [];
  }

  const { symbol, exchange } = parseTicker(ticker);
  const prices = await getHistoricalPrices(symbol, exchange, from, to);

  if (prices.length > 0) {
    incrementApiCalls();
    saveToCache(cacheKey, prices);
    console.log(`[EODHD] Fetched historical for ${ticker} (${getApiCallsToday()}/20 calls today)`);
  }

  return prices;
}

// Cached fundamentals
export async function getCachedETFFundamentals(ticker: string): Promise<EODHDFundamentals | null> {
  const cacheKey = `fundamentals_${ticker}`;

  if (isCacheValid(cacheKey, CACHE_DURATION.FUNDAMENTALS)) {
    console.log(`[EODHD] Using cached fundamentals for ${ticker}`);
    return getFromCache<EODHDFundamentals>(cacheKey);
  }

  if (!canMakeApiCall()) {
    console.warn('[EODHD] API limit reached, using cached data');
    return getFromCache<EODHDFundamentals>(cacheKey);
  }

  const { symbol, exchange } = parseTicker(ticker);
  const fundamentals = await getETFFundamentals(symbol, exchange);

  if (fundamentals) {
    incrementApiCalls();
    saveToCache(cacheKey, fundamentals);
    console.log(`[EODHD] Fetched fundamentals for ${ticker} (${getApiCallsToday()}/20 calls today)`);
  }

  return fundamentals;
}

// Cached search
export async function getCachedSearch(query: string) {
  const cacheKey = `search_${query.toLowerCase()}`;

  if (isCacheValid(cacheKey, CACHE_DURATION.SEARCH)) {
    console.log(`[EODHD] Using cached search for ${query}`);
    return getFromCache(cacheKey) || [];
  }

  if (!canMakeApiCall()) {
    console.warn('[EODHD] API limit reached');
    return getFromCache(cacheKey) || [];
  }

  const results = await searchSymbols(query);

  if (results.length > 0) {
    incrementApiCalls();
    saveToCache(cacheKey, results);
    console.log(`[EODHD] Fetched search for ${query} (${getApiCallsToday()}/20 calls today)`);
  }

  return results;
}

// Get API usage stats
export function getApiUsageStats() {
  return {
    callsToday: getApiCallsToday(),
    limit: 20,
    remaining: 20 - getApiCallsToday(),
    canMakeCall: canMakeApiCall(),
  };
}

// Clear all cache (useful for debugging)
export function clearEodhdCache() {
  if (!isBrowser) return;

  const keys = Object.keys(localStorage).filter(k => k.startsWith('eodhd_'));
  keys.forEach(k => localStorage.removeItem(k));
  console.log(`[EODHD] Cleared ${keys.length} cached items`);
}
