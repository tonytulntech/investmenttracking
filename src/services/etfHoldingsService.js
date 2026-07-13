/**
 * ETF Holdings Service — JustETF API
 *
 * Fetches underlying holdings for European ETFs via JustETF's public API,
 * identified by ISIN.  Results are cached in localStorage for 7 days.
 *
 * API:  GET https://www.justetf.com/api/etfs/{ISIN}/holdings
 *       ?locale=en&valuesType=ABSOLUTE&maxBenchmarks=1
 *       &sortField=weightPercent&sortOrder=DESC
 */

const CORS_PROXY = 'https://corsproxy.io/?';
const CACHE_PREFIX = 'etf_holdings_v1_';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;   // 7 days
const MISS_TTL  = 24 * 60 * 60 * 1000;         // 24 h negative-result cache

// ── Cache helpers ─────────────────────────────────────────────────────────────

function _cacheKey(isin) {
  return CACHE_PREFIX + isin;
}

function _getCached(isin) {
  try {
    const raw = localStorage.getItem(_cacheKey(isin));
    if (!raw) return null;
    const { ts, data, miss } = JSON.parse(raw);
    const age = Date.now() - ts;
    if (miss) return age < MISS_TTL ? [] : null;   // [] = "known empty"
    if (age > CACHE_TTL) return null;
    return data;   // Array<{name, isin, pct}>
  } catch {
    return null;
  }
}

function _setCache(isin, holdings) {
  try {
    const entry = holdings.length === 0
      ? { ts: Date.now(), miss: true }
      : { ts: Date.now(), data: holdings };
    localStorage.setItem(_cacheKey(isin), JSON.stringify(entry));
  } catch {}
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function _fetchWithTimeout(url, ms = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Parse a single raw holding entry from JustETF
function _parseHolding(h) {
  const pct = h.weightPercent ?? h.weight ?? h.percentage ?? 0;
  const name = h.holdingName ?? h.name ?? h.description ?? h.isin ?? null;
  if (!name || pct <= 0) return null;
  return {
    name,
    isin: h.isin ?? h.ISIN ?? null,
    pct: Math.round(pct * 100) / 100,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch holdings for a single ETF by ISIN.
 * Returns an array of { name, isin, pct } sorted descending by pct,
 * or null if the fetch fails (network error / bad response).
 * Returns [] if JustETF returned an empty list (edge case) — also cached.
 */
export async function getHoldingsByIsin(isin) {
  if (!isin) return null;

  const cached = _getCached(isin);
  if (cached !== null) {
    if (cached.length > 0) {
      console.log(`📦 ETF holdings cache hit: ${isin} (${cached.length} holdings)`);
    }
    return cached;
  }

  try {
    const apiUrl =
      `https://www.justetf.com/api/etfs/${isin}/holdings` +
      `?locale=en&valuesType=ABSOLUTE&maxBenchmarks=1` +
      `&sortField=weightPercent&sortOrder=DESC`;

    const proxied = CORS_PROXY + encodeURIComponent(apiUrl);
    console.log(`🌐 JustETF fetch: ${isin}`);

    const resp = await _fetchWithTimeout(proxied, 12000);
    if (!resp.ok) {
      console.warn(`❌ JustETF HTTP ${resp.status} for ${isin}`);
      _setCache(isin, []);
      return null;
    }

    const json = await resp.json();

    // JustETF may wrap in different shapes
    const rawList =
      json.holdings ??
      json.data?.holdings ??
      json.items ??
      json.positions ??
      [];

    const holdings = rawList
      .map(_parseHolding)
      .filter(Boolean)
      .sort((a, b) => b.pct - a.pct);

    console.log(`✅ JustETF ${isin}: ${holdings.length} holdings`);
    _setCache(isin, holdings);
    return holdings;
  } catch (err) {
    console.warn(`❌ JustETF fetch error for ${isin}:`, err.message);
    return null;   // Do NOT cache network errors — allow retry
  }
}

/**
 * Fetch holdings for multiple ETFs concurrently (max `limit` in parallel).
 *
 * @param {Record<string, string>} isinMap  { 'XDEM.MI': 'IE00BL25JN58', ... }
 * @param {number}                 limit    max concurrent requests (default 3)
 * @returns {Record<string, Array>}          { 'XDEM.MI': [{name, isin, pct}] }
 */
export async function getMultipleHoldings(isinMap, limit = 3) {
  const results = {};
  const entries = Object.entries(isinMap);
  if (entries.length === 0) return results;

  let nextIdx = 0;

  async function worker() {
    while (nextIdx < entries.length) {
      const i = nextIdx++;
      const [ticker, isin] = entries[i];
      const holdings = await getHoldingsByIsin(isin);
      if (holdings && holdings.length > 0) {
        results[ticker] = holdings;
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, entries.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return results;
}

/**
 * Wipe all cached ETF holdings from localStorage.
 */
export function clearHoldingsCache() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    console.log(`🗑️ Cleared ${keys.length} ETF holdings cache entries`);
  } catch {}
}

/**
 * Check whether all ISINs in a map are already cached (and non-empty).
 * Useful to decide whether to show a "loading" state.
 */
export function areHoldingsCached(isinMap) {
  return Object.values(isinMap).every(isin => {
    const cached = _getCached(isin);
    return cached !== null && cached.length > 0;
  });
}
