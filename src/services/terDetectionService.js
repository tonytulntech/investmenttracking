/**
 * TER (Total Expense Ratio) Detection Service
 *
 * Detects and provides TER information for common ETFs and investment instruments.
 * TER represents the annual cost of holding an ETF as a percentage of assets.
 */

// Database of common ETF TERs (in %)
const TER_DATABASE = {
  // Vanguard ETFs - World Equity
  'VWCE': 0.22,
  'VWRL': 0.22,
  'VT': 0.07,
  'VTI': 0.03,
  'VXUS': 0.07,

  // iShares World Equity
  'SWDA': 0.20,
  'IWDA': 0.20,
  'ACWI': 0.20,
  'URTH': 0.24,

  // USA Equity
  'SPY': 0.09,
  'VOO': 0.03,
  'IVV': 0.03,
  'VUSA': 0.07,
  'CSPX': 0.07,
  'QQQ': 0.20,

  // Europe Equity
  'VEUR': 0.12,
  'IEUR': 0.12,
  'EXS1': 0.05,
  'SMEA': 0.25,

  // Emerging Markets
  'VFEM': 0.22,
  'EIMI': 0.18,
  'AEEM': 0.14,
  'EMIM': 0.18,

  // Japan
  'VJPN': 0.19,
  'EWJ': 0.50,
  'JPXN': 0.12,

  // Asia
  'AAXJ': 0.70,
  'VPL': 0.08,

  // China
  'MCHI': 0.59,
  'FXI': 0.74,
  'CNYA': 0.68,

  // India
  'INDA': 0.65,
  'PIN': 0.85,

  // Small Cap
  'VB': 0.05,
  'IWM': 0.19,
  'IJR': 0.06,
  'VSS': 0.11,

  // Sector - Technology
  'VGT': 0.10,
  'XLK': 0.10,
  'QTEC': 0.57,

  // Sector - Healthcare
  'VHT': 0.10,
  'XLV': 0.10,

  // Sector - Financial
  'VFH': 0.10,
  'XLF': 0.10,

  // Sector - Energy
  'VDE': 0.10,
  'XLE': 0.10,

  // Sector - Real Estate
  'VNQ': 0.12,
  'XLRE': 0.10,
  'IYR': 0.40,

  // Bonds - Government
  'TLT': 0.15,
  'IEF': 0.15,
  'SHY': 0.15,
  'GOVT': 0.05,

  // Bonds - Corporate
  'LQD': 0.14,
  'VCIT': 0.04,
  'HYG': 0.49,
  'JNK': 0.40,

  // Bonds - Global
  'AGG': 0.03,
  'BND': 0.03,
  'VWOB': 0.25,

  // Commodities - Gold
  'GLD': 0.40,
  'IAU': 0.25,
  'SGOL': 0.17,

  // Commodities - Silver
  'SLV': 0.50,
  'SIVR': 0.30,

  // Commodities - Oil
  'USO': 0.60,
  'UCO': 1.07,

  // Commodities - Diversified
  'DBC': 0.87,
  'GSG': 0.75,

  // Thematic - Clean Energy
  'ICLN': 0.42,
  'TAN': 0.69,
  'QCLN': 0.60,

  // Thematic - ESG
  'ESGV': 0.09,
  'USSG': 0.04,
  'SUSL': 0.15,

  // Thematic - AI/Robotics
  'BOTZ': 0.68,
  'ROBO': 0.95,
  'AIQ': 0.68,

  // Multi-Asset
  'AOR': 0.15,
  'AOM': 0.15,
  'AOK': 0.15,
  'AOA': 0.15,
};

/**
 * Get TER for a ticker symbol
 * @param {string} ticker - The ticker symbol
 * @returns {number|null} - TER percentage or null if not found
 */
export function getTER(ticker) {
  if (!ticker) return null;

  // Normalize ticker (remove exchange suffixes)
  const normalizedTicker = ticker.toUpperCase()
    .replace(/\.DE$|\.L$|\.MI$|\.PA$|\.AS$|\.SW$/g, '')
    .trim();

  return TER_DATABASE[normalizedTicker] || null;
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
 * Batch get TERs for multiple tickers
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

export default {
  getTER,
  calculateAnnualTERCost,
  getTERCategory,
  getTERBadgeColor,
  getBatchTER
};
