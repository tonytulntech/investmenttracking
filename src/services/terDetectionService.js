/**
 * TER (Total Expense Ratio) Detection Service
 *
 * Detects and provides TER information for common ETFs and investment instruments.
 * TER represents the annual cost of holding an ETF as a percentage of assets.
 *
 * TER Sources (in order of preference):
 * 1. Cache (terCache) - Fast, stored in localStorage
 * 2. Google Apps Script API - Automatic fetching from Yahoo Finance
 * 3. Hardcoded database - Fallback for common ETFs
 */

import { getCachedTER, cacheTER } from './terCache';
import { fetchTER } from './historicalPriceService';

// Note: Hardcoded TER database removed - using automatic fetching instead
// TER will be fetched from JustETF (via ISIN) or Yahoo Finance (via ticker)
// If automatic fetch fails, user can input TER manually in the transaction form

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

  // 2. Try JustETF with ISIN if provided (best source for European ETFs)
  if (isin) {
    try {
      const justETFTer = await fetchTERFromJustETF(isin);
      if (justETFTer !== null) {
        const terData = {
          ter: justETFTer,
          source: 'justetf',
          lastUpdated: new Date().toISOString()
        };
        cacheTER(ticker, terData);
        console.log(`✅ Fetched TER for ${ticker} from JustETF: ${justETFTer}%`);
        return justETFTer;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch TER from JustETF for ${isin}:`, error);
    }
  }

  // 3. Try ExtraETF with ISIN (alternative European ETF source)
  if (isin) {
    try {
      const extraETFTer = await fetchTERFromExtraETF(isin);
      if (extraETFTer !== null) {
        const terData = {
          ter: extraETFTer,
          source: 'extraetf',
          lastUpdated: new Date().toISOString()
        };
        cacheTER(ticker, terData);
        console.log(`✅ Fetched TER for ${ticker} from ExtraETF: ${extraETFTer}%`);
        return extraETFTer;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch TER from ExtraETF for ${isin}:`, error);
    }
  }

  // 4. Try Yahoo Finance directly (with CORS proxy)
  try {
    const yahooTer = await fetchTERFromYahoo(ticker);
    if (yahooTer !== null) {
      const terData = {
        ter: yahooTer,
        source: 'yahoo-finance',
        lastUpdated: new Date().toISOString()
      };
      cacheTER(ticker, terData);
      console.log(`✅ Fetched TER for ${ticker} from Yahoo Finance: ${yahooTer}%`);
      return yahooTer;
    }
  } catch (error) {
    console.warn(`⚠️ Failed to fetch TER from Yahoo Finance for ${ticker}:`, error);
  }

  // 5. Try Morningstar as last resort
  try {
    const morningstarTer = await fetchTERFromMorningstar(ticker, isin);
    if (morningstarTer !== null) {
      const terData = {
        ter: morningstarTer,
        source: 'morningstar',
        lastUpdated: new Date().toISOString()
      };
      cacheTER(ticker, terData);
      console.log(`✅ Fetched TER for ${ticker} from Morningstar: ${morningstarTer}%`);
      return morningstarTer;
    }
  } catch (error) {
    console.warn(`⚠️ Failed to fetch TER from Morningstar for ${ticker}:`, error);
  }

  // 6. No TER found - return null (user can input manually)
  console.log(`❌ TER not found for ${ticker}. User can input manually.`);
  return null;
}

/**
 * Fetch TER from JustETF using ISIN
 * @param {string} isin - ISIN code (e.g., 'IE00BK5BQT80')
 * @returns {Promise<number|null>} - TER percentage or null if not found
 */
async function fetchTERFromJustETF(isin) {
  if (!isin) return null;

  try {
    // JustETF URL with ISIN
    const url = `https://www.justetf.com/en/etf-profile.html?isin=${isin}`;

    console.log(`🔍 Fetching TER from JustETF for ISIN: ${isin}`);

    // Use CORS proxy to avoid CORS issues
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl, {
      headers: {
        'Accept': 'text/html',
      }
    });

    if (!response.ok) {
      console.warn(`❌ JustETF request failed: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Look for TER in the HTML
    // JustETF shows TER as "Total expense ratio" or "Ongoing charges"
    const terPatterns = [
      /Ongoing\s+charges?[^0-9]*([0-9]+[.,][0-9]+)\s*%/i,
      /Total\s+expense\s+ratio[^0-9]*([0-9]+[.,][0-9]+)\s*%/i,
      /TER[^0-9]*([0-9]+[.,][0-9]+)\s*%/i,
      /"ter":\s*"?([0-9]+[.,][0-9]+)"?/i,
      /"ongoingCharge":\s*"?([0-9]+[.,][0-9]+)"?/i,
      /data-value="ter"[^>]*>([0-9]+[.,][0-9]+)/i,
      /<td[^>]*>TER<\/td>[^<]*<td[^>]*>([0-9]+[.,][0-9]+)\s*%/i
    ];

    for (const pattern of terPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const terString = match[1].replace(',', '.');
        const ter = parseFloat(terString);

        if (!isNaN(ter) && ter >= 0 && ter < 10) { // Sanity check: TER should be < 10%
          console.log(`✅ Found TER from JustETF for ${isin}: ${ter}%`);
          return ter;
        }
      }
    }

    console.log(`❌ TER not found in JustETF page for ${isin}`);
    return null;

  } catch (error) {
    console.error(`❌ Error fetching TER from JustETF for ${isin}:`, error);
    return null;
  }
}

/**
 * Fetch TER from ExtraETF using ISIN
 * @param {string} isin - ISIN code
 * @returns {Promise<number|null>} - TER percentage or null if not found
 */
async function fetchTERFromExtraETF(isin) {
  if (!isin) return null;

  try {
    const url = `https://extraetf.com/etf-profile/${isin}`;
    console.log(`🔍 Fetching TER from ExtraETF for ISIN: ${isin}`);

    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, { headers: { 'Accept': 'text/html' } });

    if (!response.ok) {
      console.warn(`❌ ExtraETF request failed: ${response.status}`);
      return null;
    }

    const html = await response.text();

    const terPatterns = [
      /Total Expense Ratio.*?([0-9]+[.,][0-9]+)\s*%/i,
      /TER.*?([0-9]+[.,][0-9]+)\s*%/i,
      /Gesamtkostenquote.*?([0-9]+[.,][0-9]+)\s*%/i,
      /"ter":([0-9]+[.,][0-9]+)/i
    ];

    for (const pattern of terPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const ter = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(ter) && ter >= 0 && ter < 10) {
          console.log(`✅ Found TER from ExtraETF for ${isin}: ${ter}%`);
          return ter;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`❌ Error fetching TER from ExtraETF for ${isin}:`, error);
    return null;
  }
}

/**
 * Fetch TER from Yahoo Finance directly (without Google Apps Script)
 * @param {string} ticker - Ticker symbol
 * @returns {Promise<number|null>} - TER percentage or null if not found
 */
async function fetchTERFromYahoo(ticker) {
  if (!ticker) return null;

  try {
    const url = `https://finance.yahoo.com/quote/${ticker}`;
    console.log(`🔍 Fetching TER from Yahoo Finance for: ${ticker}`);

    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, { headers: { 'Accept': 'text/html' } });

    if (!response.ok) {
      console.warn(`❌ Yahoo Finance request failed: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Yahoo Finance patterns for expense ratio
    const terPatterns = [
      /Expense Ratio.*?([0-9]+[.,][0-9]+)%/i,
      /Net Expense Ratio.*?([0-9]+[.,][0-9]+)%/i,
      /Annual Report Expense Ratio.*?([0-9]+[.,][0-9]+)%/i,
      /"annualReportExpenseRatio"[^}]*?([0-9]+[.,][0-9]+)/i,
      /"yield"[^}]*?"annualReportExpenseRatio":([0-9]+[.,][0-9]+)/i
    ];

    for (const pattern of terPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const ter = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(ter) && ter >= 0 && ter < 10) {
          console.log(`✅ Found TER from Yahoo Finance for ${ticker}: ${ter}%`);
          return ter;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`❌ Error fetching TER from Yahoo Finance for ${ticker}:`, error);
    return null;
  }
}

/**
 * Fetch TER from Morningstar
 * @param {string} ticker - Ticker symbol
 * @param {string} isin - ISIN code (optional)
 * @returns {Promise<number|null>} - TER percentage or null if not found
 */
async function fetchTERFromMorningstar(ticker, isin = null) {
  if (!ticker && !isin) return null;

  try {
    // Try with ISIN first if available
    const searchTerm = isin || ticker;
    const url = `https://www.morningstar.com/search?query=${encodeURIComponent(searchTerm)}`;

    console.log(`🔍 Fetching TER from Morningstar for: ${searchTerm}`);

    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, { headers: { 'Accept': 'text/html' } });

    if (!response.ok) {
      console.warn(`❌ Morningstar request failed: ${response.status}`);
      return null;
    }

    const html = await response.text();

    const terPatterns = [
      /Expense Ratio.*?([0-9]+[.,][0-9]+)%/i,
      /Net Expense Ratio.*?([0-9]+[.,][0-9]+)%/i,
      /Ongoing Charge.*?([0-9]+[.,][0-9]+)%/i,
      /"expenseRatio":([0-9]+[.,][0-9]+)/i
    ];

    for (const pattern of terPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const ter = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(ter) && ter >= 0 && ter < 10) {
          console.log(`✅ Found TER from Morningstar for ${searchTerm}: ${ter}%`);
          return ter;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`❌ Error fetching TER from Morningstar:`, error);
    return null;
  }
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
