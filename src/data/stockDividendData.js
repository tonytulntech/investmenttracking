/**
 * stockDividendData.js
 * Database statico per azioni dividend growth comuni.
 * Dati approssimativi (maggio 2026) — l'utente può sovrascrivere nella posizione.
 *
 * Campi: name, sector, geography, assetType,
 *        dividendPerShare (annuale, valuta locale),
 *        dividendFrequency, paymentMonths,
 *        dividendGrowthRate (CAGR 5Y %),
 *        moatRating, lynchCategory,
 *        consecutiveDividendYears, payoutRatio, roe, roic
 */

export const STOCK_DB = {

  // ── US REIT ────────────────────────────────────────────────────────────────

  'O': {
    name: 'Realty Income',
    sector: 'Real Estate', geography: 'US', assetType: 'REIT',
    dividendPerShare: 3.17, dividendFrequency: 'Monthly',
    paymentMonths: [1,2,3,4,5,6,7,8,9,10,11,12],
    dividendGrowthRate: 3.2, moatRating: 'Wide', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 30, payoutRatio: 75, roe: 3.5, roic: 5.2,
  },
  'STAG': {
    name: 'STAG Industrial',
    sector: 'Real Estate', geography: 'US', assetType: 'REIT',
    dividendPerShare: 1.47, dividendFrequency: 'Monthly',
    paymentMonths: [1,2,3,4,5,6,7,8,9,10,11,12],
    dividendGrowthRate: 1.2, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 13, payoutRatio: 85, roe: 5.5, roic: 6.2,
  },
  'WPC': {
    name: 'W.P. Carey',
    sector: 'Real Estate', geography: 'US', assetType: 'REIT',
    dividendPerShare: 3.44, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 0.5, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 3, payoutRatio: 72, roe: 5.2, roic: 5.8,
  },
  'NNN': {
    name: 'NNN REIT',
    sector: 'Real Estate', geography: 'US', assetType: 'REIT',
    dividendPerShare: 2.32, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 3.5, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 35, payoutRatio: 68, roe: 8.5, roic: 7.2,
  },

  // ── US BDC ─────────────────────────────────────────────────────────────────

  'ARCC': {
    name: 'Ares Capital',
    sector: 'Financials', geography: 'US', assetType: 'BDC',
    dividendPerShare: 1.92, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 4.5, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 15, payoutRatio: 90, roe: 12.5, roic: 9.8,
  },
  'MAIN': {
    name: 'Main Street Capital',
    sector: 'Financials', geography: 'US', assetType: 'BDC',
    dividendPerShare: 3.00, dividendFrequency: 'Monthly',
    paymentMonths: [1,2,3,4,5,6,7,8,9,10,11,12],
    dividendGrowthRate: 5.5, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 14, payoutRatio: 80, roe: 14.2, roic: 10.5,
  },
  'OBDC': {
    name: 'Blue Owl Capital',
    sector: 'Financials', geography: 'US', assetType: 'BDC',
    dividendPerShare: 1.72, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 3.0, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 6, payoutRatio: 88, roe: 11.5, roic: 9.0,
  },

  // ── US Healthcare ──────────────────────────────────────────────────────────

  'ABBV': {
    name: 'AbbVie',
    sector: 'Healthcare', geography: 'US', assetType: 'Stock',
    dividendPerShare: 6.40, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 8.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 52, payoutRatio: 48, roe: 185.0, roic: 22.5,
  },
  'JNJ': {
    name: 'Johnson & Johnson',
    sector: 'Healthcare', geography: 'US', assetType: 'Stock',
    dividendPerShare: 4.96, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 5.8, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 62, payoutRatio: 44, roe: 22.5, roic: 17.8,
  },

  // ── US Consumer Staples ────────────────────────────────────────────────────

  'KO': {
    name: 'Coca-Cola',
    sector: 'Consumer Staples', geography: 'US', assetType: 'Stock',
    dividendPerShare: 1.94, dividendFrequency: 'Quarterly',
    paymentMonths: [4,7,10,12],
    dividendGrowthRate: 4.8, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 62, payoutRatio: 72, roe: 38.5, roic: 15.2,
  },
  'PG': {
    name: 'Procter & Gamble',
    sector: 'Consumer Staples', geography: 'US', assetType: 'Stock',
    dividendPerShare: 4.03, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 5.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 68, payoutRatio: 58, roe: 32.5, roic: 21.5,
  },
  'PEP': {
    name: 'PepsiCo',
    sector: 'Consumer Staples', geography: 'US', assetType: 'Stock',
    dividendPerShare: 5.42, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 7.8, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 52, payoutRatio: 70, roe: 52.5, roic: 18.5,
  },

  // ── US Consumer Discretionary / Restaurants ────────────────────────────────

  'MCD': {
    name: "McDonald's",
    sector: 'Consumer Discretionary', geography: 'US', assetType: 'Stock',
    dividendPerShare: 7.08, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 8.2, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 48, payoutRatio: 58, roe: 0, roic: 18.5,
  },

  // ── US Technology ──────────────────────────────────────────────────────────

  'MSFT': {
    name: 'Microsoft',
    sector: 'Technology', geography: 'US', assetType: 'Stock',
    dividendPerShare: 3.32, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 10.5, moatRating: 'Wide', lynchCategory: 'FastGrower',
    consecutiveDividendYears: 20, payoutRatio: 22, roe: 38.5, roic: 28.5,
  },
  'AVGO': {
    name: 'Broadcom',
    sector: 'Technology', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.36, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 15.0, moatRating: 'Wide', lynchCategory: 'FastGrower',
    consecutiveDividendYears: 14, payoutRatio: 48, roe: 28.5, roic: 22.5,
  },

  // ── US Energy ─────────────────────────────────────────────────────────────

  'XOM': {
    name: 'ExxonMobil',
    sector: 'Energy', geography: 'US', assetType: 'Stock',
    dividendPerShare: 3.96, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 4.5, moatRating: 'Narrow', lynchCategory: 'Cyclical',
    consecutiveDividendYears: 42, payoutRatio: 40, roe: 14.5, roic: 12.5,
  },
  'CVX': {
    name: 'Chevron',
    sector: 'Energy', geography: 'US', assetType: 'Stock',
    dividendPerShare: 6.52, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 6.5, moatRating: 'Narrow', lynchCategory: 'Cyclical',
    consecutiveDividendYears: 37, payoutRatio: 55, roe: 13.5, roic: 11.2,
  },

  // ── US Telecom ─────────────────────────────────────────────────────────────

  'VZ': {
    name: 'Verizon',
    sector: 'Communication', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.71, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 2.0, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 18, payoutRatio: 62, roe: 18.5, roic: 8.5,
  },
  'T': {
    name: 'AT&T',
    sector: 'Communication', geography: 'US', assetType: 'Stock',
    dividendPerShare: 1.11, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 0.5, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 5, payoutRatio: 55, roe: 12.5, roic: 6.2,
  },

  // ── US Utilities ──────────────────────────────────────────────────────────

  'NEE': {
    name: 'NextEra Energy',
    sector: 'Utilities', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.14, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 10.5, moatRating: 'Wide', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 30, payoutRatio: 55, roe: 12.5, roic: 7.8,
  },

  // ── US Industrials / Defense ──────────────────────────────────────────────

  'HD': {
    name: 'Home Depot',
    sector: 'Retail', geography: 'US', assetType: 'Stock',
    dividendPerShare: 9.00, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 12.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 15, payoutRatio: 52, roe: 0, roic: 22.5,
  },
  'LOW': {
    name: "Lowe's Companies",
    sector: 'Retail', geography: 'US', assetType: 'Stock',
    dividendPerShare: 4.60, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 18.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 53, payoutRatio: 34, roe: 0, roic: 18.5,
  },
  'CAT': {
    name: 'Caterpillar',
    sector: 'Industrials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 5.40, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 8.5, moatRating: 'Wide', lynchCategory: 'Cyclical',
    consecutiveDividendYears: 30, payoutRatio: 22, roe: 52.5, roic: 22.5,
  },
  'EMR': {
    name: 'Emerson Electric',
    sector: 'Industrials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.10, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 2.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 47, payoutRatio: 40, roe: 18.5, roic: 14.5,
  },
  'ITW': {
    name: 'Illinois Tool Works',
    sector: 'Industrials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 5.68, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 7.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 60, payoutRatio: 55, roe: 0, roic: 24.5,
  },
  'HON': {
    name: 'Honeywell International',
    sector: 'Industrials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 4.52, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 6.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 14, payoutRatio: 42, roe: 35.5, roic: 12.5,
  },
  'LMT': {
    name: 'Lockheed Martin',
    sector: 'Industrials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 13.20, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 7.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 21, payoutRatio: 45, roe: 0, roic: 12.5,
  },
  'GD': {
    name: 'General Dynamics',
    sector: 'Industrials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 5.56, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 8.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 32, payoutRatio: 38, roe: 28.5, roic: 16.5,
  },
  'RTX': {
    name: 'RTX Corporation',
    sector: 'Industrials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.52, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 5.5, moatRating: 'Narrow', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 30, payoutRatio: 32, roe: 8.5, roic: 7.5,
  },
  'WM': {
    name: 'Waste Management',
    sector: 'Industrials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 3.30, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 7.8, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 21, payoutRatio: 48, roe: 35.5, roic: 14.5,
  },
  'ADP': {
    name: 'Automatic Data Processing',
    sector: 'Technology', geography: 'US', assetType: 'Stock',
    dividendPerShare: 5.80, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 12.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 49, payoutRatio: 62, roe: 72.5, roic: 28.5,
  },

  // ── US Healthcare (aggiuntivi) ─────────────────────────────────────────────

  'ABT': {
    name: 'Abbott Laboratories',
    sector: 'Healthcare', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.24, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 7.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 52, payoutRatio: 48, roe: 18.5, roic: 14.5,
  },
  'MDT': {
    name: 'Medtronic',
    sector: 'Healthcare', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.80, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 4.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 47, payoutRatio: 58, roe: 8.5, roic: 8.2,
  },
  'BMY': {
    name: 'Bristol-Myers Squibb',
    sector: 'Healthcare', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.48, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 3.5, moatRating: 'Narrow', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 15, payoutRatio: 45, roe: 12.5, roic: 8.5,
  },
  'MRK': {
    name: 'Merck & Co.',
    sector: 'Healthcare', geography: 'US', assetType: 'Stock',
    dividendPerShare: 3.20, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 5.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 14, payoutRatio: 42, roe: 38.5, roic: 22.5,
  },
  'PFE': {
    name: 'Pfizer',
    sector: 'Healthcare', geography: 'US', assetType: 'Stock',
    dividendPerShare: 1.68, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 2.5, moatRating: 'Narrow', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 14, payoutRatio: 65, roe: 8.5, roic: 7.5,
  },
  'AMGN': {
    name: 'Amgen',
    sector: 'Healthcare', geography: 'US', assetType: 'Stock',
    dividendPerShare: 9.52, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 10.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 13, payoutRatio: 48, roe: 0, roic: 22.5,
  },
  'UNH': {
    name: 'UnitedHealth Group',
    sector: 'Healthcare', geography: 'US', assetType: 'Stock',
    dividendPerShare: 8.40, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 14.5, moatRating: 'Wide', lynchCategory: 'FastGrower',
    consecutiveDividendYears: 14, payoutRatio: 30, roe: 22.5, roic: 14.5,
  },
  'CVS': {
    name: 'CVS Health',
    sector: 'Healthcare', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.66, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 0.0, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 5, payoutRatio: 28, roe: 7.5, roic: 6.5,
  },

  // ── US Consumer Staples (aggiuntivi) ──────────────────────────────────────

  'CL': {
    name: 'Colgate-Palmolive',
    sector: 'Consumer Staples', geography: 'US', assetType: 'Stock',
    dividendPerShare: 1.96, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 4.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 62, payoutRatio: 58, roe: 0, roic: 18.5,
  },
  'KMB': {
    name: 'Kimberly-Clark',
    sector: 'Consumer Staples', geography: 'US', assetType: 'Stock',
    dividendPerShare: 5.04, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 3.8, moatRating: 'Narrow', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 52, payoutRatio: 62, roe: 0, roic: 18.5,
  },
  'GIS': {
    name: 'General Mills',
    sector: 'Consumer Staples', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.48, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 4.0, moatRating: 'Narrow', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 5, payoutRatio: 52, roe: 22.5, roic: 12.5,
  },
  'HRL': {
    name: 'Hormel Foods',
    sector: 'Consumer Staples', geography: 'US', assetType: 'Stock',
    dividendPerShare: 1.16, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 3.5, moatRating: 'Narrow', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 58, payoutRatio: 72, roe: 10.5, roic: 8.5,
  },
  'MKC': {
    name: 'McCormick & Company',
    sector: 'Consumer Staples', geography: 'US', assetType: 'Stock',
    dividendPerShare: 1.64, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 8.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 38, payoutRatio: 55, roe: 15.5, roic: 10.5,
  },
  'SYY': {
    name: 'Sysco Corporation',
    sector: 'Consumer Staples', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.12, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 5.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 54, payoutRatio: 52, roe: 0, roic: 14.5,
  },
  'WMT': {
    name: 'Walmart',
    sector: 'Retail', geography: 'US', assetType: 'Stock',
    dividendPerShare: 0.83, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 3.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 51, payoutRatio: 32, roe: 18.5, roic: 12.5,
  },
  'COST': {
    name: 'Costco Wholesale',
    sector: 'Retail', geography: 'US', assetType: 'Stock',
    dividendPerShare: 4.64, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 12.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 21, payoutRatio: 28, roe: 35.5, roic: 22.5,
  },
  'TGT': {
    name: 'Target',
    sector: 'Retail', geography: 'US', assetType: 'Stock',
    dividendPerShare: 4.44, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 10.5, moatRating: 'Narrow', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 53, payoutRatio: 58, roe: 32.5, roic: 14.5,
  },

  // ── US Technology (aggiuntivi) ─────────────────────────────────────────────

  'AAPL': {
    name: 'Apple',
    sector: 'Technology', geography: 'US', assetType: 'Stock',
    dividendPerShare: 1.00, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 5.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 12, payoutRatio: 15, roe: 152.0, roic: 38.5,
  },
  'QCOM': {
    name: 'Qualcomm',
    sector: 'Technology', geography: 'US', assetType: 'Stock',
    dividendPerShare: 4.00, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 6.5, moatRating: 'Wide', lynchCategory: 'FastGrower',
    consecutiveDividendYears: 21, payoutRatio: 42, roe: 38.5, roic: 22.5,
  },
  'TXN': {
    name: 'Texas Instruments',
    sector: 'Technology', geography: 'US', assetType: 'Stock',
    dividendPerShare: 6.40, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 13.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 21, payoutRatio: 68, roe: 38.5, roic: 28.5,
  },
  'IBM': {
    name: 'IBM',
    sector: 'Technology', geography: 'US', assetType: 'Stock',
    dividendPerShare: 6.68, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 0.5, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 29, payoutRatio: 62, roe: 38.5, roic: 8.5,
  },
  'ORCL': {
    name: 'Oracle',
    sector: 'Technology', geography: 'US', assetType: 'Stock',
    dividendPerShare: 1.60, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 5.0, moatRating: 'Wide', lynchCategory: 'FastGrower',
    consecutiveDividendYears: 10, payoutRatio: 22, roe: 0, roic: 18.5,
  },

  // ── US Financials ──────────────────────────────────────────────────────────

  'JPM': {
    name: 'JPMorgan Chase',
    sector: 'Financials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 5.00, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 8.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 14, payoutRatio: 28, roe: 14.5, roic: 12.5,
  },
  'BLK': {
    name: 'BlackRock',
    sector: 'Financials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 20.40, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 10.5, moatRating: 'Wide', lynchCategory: 'FastGrower',
    consecutiveDividendYears: 16, payoutRatio: 52, roe: 14.5, roic: 8.5,
  },
  'V': {
    name: 'Visa',
    sector: 'Financials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.36, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 18.5, moatRating: 'Wide', lynchCategory: 'FastGrower',
    consecutiveDividendYears: 15, payoutRatio: 22, roe: 42.5, roic: 28.5,
  },
  'MA': {
    name: 'Mastercard',
    sector: 'Financials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.64, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 16.5, moatRating: 'Wide', lynchCategory: 'FastGrower',
    consecutiveDividendYears: 13, payoutRatio: 18, roe: 158.0, roic: 35.5,
  },
  'AFL': {
    name: 'Aflac',
    sector: 'Financials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 1.80, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 10.5, moatRating: 'Narrow', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 42, payoutRatio: 22, roe: 12.5, roic: 8.5,
  },
  'CB': {
    name: 'Chubb',
    sector: 'Financials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 3.64, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 5.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 31, payoutRatio: 18, roe: 12.5, roic: 8.5,
  },
  'AXP': {
    name: 'American Express',
    sector: 'Financials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.80, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 17.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 35, payoutRatio: 20, roe: 28.5, roic: 20.5,
  },
  'TROW': {
    name: 'T. Rowe Price',
    sector: 'Financials', geography: 'US', assetType: 'Stock',
    dividendPerShare: 4.96, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 10.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 38, payoutRatio: 52, roe: 18.5, roic: 12.5,
  },

  // ── US Consumer Disc. (aggiuntivi) ────────────────────────────────────────

  'NKE': {
    name: 'Nike',
    sector: 'Consumer Discretionary', geography: 'US', assetType: 'Stock',
    dividendPerShare: 1.50, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 11.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 22, payoutRatio: 42, roe: 28.5, roic: 18.5,
  },
  'SBUX': {
    name: 'Starbucks',
    sector: 'Consumer Discretionary', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.44, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 8.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 14, payoutRatio: 55, roe: 0, roic: 12.5,
  },
  'YUM': {
    name: 'Yum! Brands',
    sector: 'Consumer Discretionary', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.68, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 7.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 22, payoutRatio: 52, roe: 0, roic: 14.5,
  },

  // ── US Tobacco / Altria ────────────────────────────────────────────────────

  'MO': {
    name: 'Altria Group',
    sector: 'Consumer Staples', geography: 'US', assetType: 'Stock',
    dividendPerShare: 4.08, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 4.0, moatRating: 'Wide', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 54, payoutRatio: 78, roe: 0, roic: 35.5,
  },
  'PM': {
    name: 'Philip Morris International',
    sector: 'Consumer Staples', geography: 'US', assetType: 'Stock',
    dividendPerShare: 5.40, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 3.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 16, payoutRatio: 88, roe: 0, roic: 28.5,
  },
  'BTI': {
    name: 'British American Tobacco ADR',
    sector: 'Consumer Staples', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 2.94, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 1.5, moatRating: 'Wide', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 25, payoutRatio: 62, roe: 8.5, roic: 7.5,
  },

  // ── US Utilities (aggiuntivi) ──────────────────────────────────────────────

  'DUK': {
    name: 'Duke Energy',
    sector: 'Utilities', geography: 'US', assetType: 'Stock',
    dividendPerShare: 4.24, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 2.5, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 18, payoutRatio: 72, roe: 10.5, roic: 6.5,
  },
  'SO': {
    name: 'Southern Company',
    sector: 'Utilities', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.80, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 3.5, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 23, payoutRatio: 75, roe: 12.5, roic: 5.5,
  },
  'ED': {
    name: 'Consolidated Edison',
    sector: 'Utilities', geography: 'US', assetType: 'Stock',
    dividendPerShare: 3.36, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 2.0, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 50, payoutRatio: 68, roe: 9.5, roic: 5.5,
  },

  // ── US Energy (aggiuntivi) ─────────────────────────────────────────────────

  'EPD': {
    name: 'Enterprise Products Partners',
    sector: 'Energy', geography: 'US', assetType: 'Stock',
    dividendPerShare: 2.12, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 3.5, moatRating: 'Narrow', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 25, payoutRatio: 58, roe: 18.5, roic: 12.5,
  },
  'ENB': {
    name: 'Enbridge',
    sector: 'Energy', geography: 'US', assetType: 'Stock',
    dividendPerShare: 3.80, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 3.0, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 29, payoutRatio: 72, roe: 8.5, roic: 7.5,
  },

  // ── US REIT (aggiuntivi) ──────────────────────────────────────────────────

  'OHI': {
    name: 'Omega Healthcare Investors',
    sector: 'Real Estate', geography: 'US', assetType: 'REIT',
    dividendPerShare: 2.80, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 2.5, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 10, payoutRatio: 80, roe: 8.5, roic: 7.5,
  },
  'VICI': {
    name: 'VICI Properties',
    sector: 'Real Estate', geography: 'US', assetType: 'REIT',
    dividendPerShare: 1.72, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 7.0, moatRating: 'Wide', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 7, payoutRatio: 82, roe: 12.5, roic: 8.5,
  },
  'AMT': {
    name: 'American Tower',
    sector: 'Real Estate', geography: 'US', assetType: 'REIT',
    dividendPerShare: 6.80, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 8.5, moatRating: 'Wide', lynchCategory: 'FastGrower',
    consecutiveDividendYears: 13, payoutRatio: 82, roe: 8.5, roic: 7.5,
  },
  'DLR': {
    name: 'Digital Realty Trust',
    sector: 'Real Estate', geography: 'US', assetType: 'REIT',
    dividendPerShare: 4.88, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 3.0, moatRating: 'Narrow', lynchCategory: 'FastGrower',
    consecutiveDividendYears: 20, payoutRatio: 92, roe: 5.5, roic: 5.5,
  },
  'ADC': {
    name: 'Agree Realty',
    sector: 'Real Estate', geography: 'US', assetType: 'REIT',
    dividendPerShare: 3.00, dividendFrequency: 'Monthly',
    paymentMonths: [1,2,3,4,5,6,7,8,9,10,11,12],
    dividendGrowthRate: 5.5, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 12, payoutRatio: 78, roe: 4.5, roic: 5.5,
  },
  'FRT': {
    name: 'Federal Realty Investment Trust',
    sector: 'Real Estate', geography: 'US', assetType: 'REIT',
    dividendPerShare: 4.52, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 2.0, moatRating: 'Wide', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 56, payoutRatio: 102, roe: 8.5, roic: 6.5,
  },

  // ── Europe — UK (aggiuntivi) ──────────────────────────────────────────────

  'CCL.L': {
    name: 'Carnival PLC (London)',
    sector: 'Consumer Discretionary', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0, dividendFrequency: 'Quarterly',
    paymentMonths: [],
    dividendGrowthRate: 0, moatRating: 'None', lynchCategory: 'Turnaround',
    consecutiveDividendYears: 0, payoutRatio: 0, roe: 8.5, roic: 5.5,
  },
  'CCL': {
    name: 'Carnival Corp (NYSE)',
    sector: 'Consumer Discretionary', geography: 'US', assetType: 'Stock',
    dividendPerShare: 0, dividendFrequency: 'Quarterly',
    paymentMonths: [],
    dividendGrowthRate: 0, moatRating: 'None', lynchCategory: 'Turnaround',
    consecutiveDividendYears: 0, payoutRatio: 0, roe: 8.5, roic: 5.5,
  },

  // ── Europe — ADR su NYSE/NASDAQ ───────────────────────────────────────────

  'AZN': {
    name: 'AstraZeneca ADR',
    sector: 'Healthcare', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 3.14, dividendFrequency: 'SemiAnnual',
    paymentMonths: [3,9],
    dividendGrowthRate: 4.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 31, payoutRatio: 62, roe: 22.5, roic: 12.5,
  },
  'GSK': {
    name: 'GSK ADR',
    sector: 'Healthcare', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 3.90, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 3.5, moatRating: 'Narrow', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 8, payoutRatio: 72, roe: 38.5, roic: 14.5,
  },
  'SHEL': {
    name: 'Shell ADR',
    sector: 'Energy', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 2.52, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 4.0, moatRating: 'Narrow', lynchCategory: 'Cyclical',
    consecutiveDividendYears: 5, payoutRatio: 28, roe: 12.5, roic: 10.5,
  },
  'BP': {
    name: 'BP ADR',
    sector: 'Energy', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 1.67, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 3.0, moatRating: 'Narrow', lynchCategory: 'Cyclical',
    consecutiveDividendYears: 5, payoutRatio: 35, roe: 8.5, roic: 8.5,
  },
  'RIO': {
    name: 'Rio Tinto ADR',
    sector: 'Materials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 5.00, dividendFrequency: 'SemiAnnual',
    paymentMonths: [4,9],
    dividendGrowthRate: 0.0, moatRating: 'Narrow', lynchCategory: 'Cyclical',
    consecutiveDividendYears: 10, payoutRatio: 55, roe: 22.5, roic: 18.5,
  },
  'UL': {
    name: 'Unilever ADR',
    sector: 'Consumer Staples', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 2.10, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 3.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 30, payoutRatio: 65, roe: 35.5, roic: 18.5,
  },
  'DEO': {
    name: 'Diageo ADR',
    sector: 'Consumer Staples', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 4.50, dividendFrequency: 'SemiAnnual',
    paymentMonths: [4,10],
    dividendGrowthRate: 5.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 23, payoutRatio: 58, roe: 42.5, roic: 18.5,
  },
  'NVS': {
    name: 'Novartis ADR',
    sector: 'Healthcare', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 3.80, dividendFrequency: 'Annual',
    paymentMonths: [3],
    dividendGrowthRate: 3.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 25, payoutRatio: 52, roe: 18.5, roic: 14.5,
  },

  // ── Europe — Germania ─────────────────────────────────────────────────────

  'SIE.DE': {
    name: 'Siemens',
    sector: 'Industrials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 5.20, dividendFrequency: 'Annual',
    paymentMonths: [2],
    dividendGrowthRate: 5.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 10, payoutRatio: 38, roe: 18.5, roic: 12.5,
  },
  'ALV.DE': {
    name: 'Allianz',
    sector: 'Financials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 15.40, dividendFrequency: 'Annual',
    paymentMonths: [5],
    dividendGrowthRate: 8.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 12, payoutRatio: 52, roe: 14.5, roic: 10.5,
  },
  'MUV2.DE': {
    name: 'Munich Re',
    sector: 'Financials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 18.00, dividendFrequency: 'Annual',
    paymentMonths: [5],
    dividendGrowthRate: 7.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 34, payoutRatio: 48, roe: 14.5, roic: 10.5,
  },
  'BAS.DE': {
    name: 'BASF',
    sector: 'Materials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 3.40, dividendFrequency: 'Annual',
    paymentMonths: [5],
    dividendGrowthRate: 0.0, moatRating: 'Narrow', lynchCategory: 'Cyclical',
    consecutiveDividendYears: 10, payoutRatio: 82, roe: 5.5, roic: 6.5,
  },
  'DHL.DE': {
    name: 'DHL Group',
    sector: 'Industrials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 1.85, dividendFrequency: 'Annual',
    paymentMonths: [5],
    dividendGrowthRate: 5.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 10, payoutRatio: 42, roe: 22.5, roic: 14.5,
  },

  // ── Europe — UK ───────────────────────────────────────────────────────────

  'SHEL.L': {
    name: 'Shell (London)',
    sector: 'Energy', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 1.00, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 4.0, moatRating: 'Narrow', lynchCategory: 'Cyclical',
    consecutiveDividendYears: 5, payoutRatio: 28, roe: 12.5, roic: 10.5,
  },
  'BP.L': {
    name: 'BP (London)',
    sector: 'Energy', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0.28, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 3.0, moatRating: 'Narrow', lynchCategory: 'Cyclical',
    consecutiveDividendYears: 5, payoutRatio: 35, roe: 8.5, roic: 8.5,
  },
  'AZN.L': {
    name: 'AstraZeneca (London)',
    sector: 'Healthcare', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 3.14, dividendFrequency: 'SemiAnnual',
    paymentMonths: [3,9],
    dividendGrowthRate: 4.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 31, payoutRatio: 62, roe: 22.5, roic: 12.5,
  },
  'GSK.L': {
    name: 'GSK (London)',
    sector: 'Healthcare', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0.65, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 3.5, moatRating: 'Narrow', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 8, payoutRatio: 72, roe: 38.5, roic: 14.5,
  },
  'ULVR.L': {
    name: 'Unilever (London)',
    sector: 'Consumer Staples', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0.50, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 3.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 30, payoutRatio: 65, roe: 35.5, roic: 18.5,
  },
  'DGE.L': {
    name: 'Diageo (London)',
    sector: 'Consumer Staples', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0.82, dividendFrequency: 'SemiAnnual',
    paymentMonths: [4,10],
    dividendGrowthRate: 5.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 23, payoutRatio: 58, roe: 42.5, roic: 18.5,
  },
  'RIO.L': {
    name: 'Rio Tinto (London)',
    sector: 'Materials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 3.80, dividendFrequency: 'SemiAnnual',
    paymentMonths: [4,9],
    dividendGrowthRate: 0.0, moatRating: 'Narrow', lynchCategory: 'Cyclical',
    consecutiveDividendYears: 10, payoutRatio: 55, roe: 22.5, roic: 18.5,
  },
  'BATS.L': {
    name: 'British American Tobacco (London)',
    sector: 'Consumer Staples', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 2.36, dividendFrequency: 'Quarterly',
    paymentMonths: [2,5,8,11],
    dividendGrowthRate: 2.0, moatRating: 'Wide', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 25, payoutRatio: 62, roe: 8.5, roic: 7.5,
  },

  // ── Europe — Francia (aggiuntivi) ─────────────────────────────────────────

  'TTE.PA': {
    name: 'TotalEnergies',
    sector: 'Energy', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 3.01, dividendFrequency: 'Quarterly',
    paymentMonths: [1,4,7,10],
    dividendGrowthRate: 5.0, moatRating: 'Narrow', lynchCategory: 'Cyclical',
    consecutiveDividendYears: 30, payoutRatio: 38, roe: 12.5, roic: 10.5,
  },
  'OR.PA': {
    name: "L'Oréal",
    sector: 'Consumer Staples', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 6.60, dividendFrequency: 'Annual',
    paymentMonths: [4],
    dividendGrowthRate: 10.5, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 28, payoutRatio: 58, roe: 18.5, roic: 14.5,
  },
  'AIR.PA': {
    name: 'Airbus',
    sector: 'Industrials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 1.80, dividendFrequency: 'Annual',
    paymentMonths: [4],
    dividendGrowthRate: 10.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 5, payoutRatio: 22, roe: 22.5, roic: 12.5,
  },

  // ── Europe — Olanda ───────────────────────────────────────────────────────

  'ASML.AS': {
    name: 'ASML Holding',
    sector: 'Technology', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 7.20, dividendFrequency: 'SemiAnnual',
    paymentMonths: [5,11],
    dividendGrowthRate: 15.0, moatRating: 'Wide', lynchCategory: 'FastGrower',
    consecutiveDividendYears: 12, payoutRatio: 22, roe: 52.5, roic: 38.5,
  },
  'INGA.AS': {
    name: 'ING Group',
    sector: 'Financials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0.75, dividendFrequency: 'Annual',
    paymentMonths: [5],
    dividendGrowthRate: 5.0, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 5, payoutRatio: 42, roe: 10.5, roic: 8.5,
  },

  // ── Europe — Italia ────────────────────────────────────────────────────────

  'ENEL.MI': {
    name: 'Enel',
    sector: 'Utilities', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0.43, dividendFrequency: 'Annual',
    paymentMonths: [7],
    dividendGrowthRate: 3.5, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 15, payoutRatio: 68, roe: 12.5, roic: 8.2,
  },
  'ENI.MI': {
    name: 'ENI',
    sector: 'Energy', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 1.00, dividendFrequency: 'SemiAnnual',
    paymentMonths: [5,11],
    dividendGrowthRate: 4.0, moatRating: 'Narrow', lynchCategory: 'Cyclical',
    consecutiveDividendYears: 20, payoutRatio: 42, roe: 11.5, roic: 9.5,
  },
  'ISP.MI': {
    name: 'Intesa Sanpaolo',
    sector: 'Financials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0.40, dividendFrequency: 'SemiAnnual',
    paymentMonths: [5,11],
    dividendGrowthRate: 5.0, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 10, payoutRatio: 60, roe: 14.5, roic: 12.5,
  },
  'UCG.MI': {
    name: 'UniCredit',
    sector: 'Financials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 2.00, dividendFrequency: 'Annual',
    paymentMonths: [5],
    dividendGrowthRate: 8.0, moatRating: 'Narrow', lynchCategory: 'Turnaround',
    consecutiveDividendYears: 5, payoutRatio: 35, roe: 18.5, roic: 15.2,
  },
  'TRN.MI': {
    name: 'Terna',
    sector: 'Utilities', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0.36, dividendFrequency: 'SemiAnnual',
    paymentMonths: [1,7],
    dividendGrowthRate: 4.0, moatRating: 'Wide', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 18, payoutRatio: 78, roe: 18.5, roic: 8.5,
  },
  'A2A.MI': {
    name: 'A2A',
    sector: 'Utilities', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0.11, dividendFrequency: 'Annual',
    paymentMonths: [6],
    dividendGrowthRate: 5.0, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 8, payoutRatio: 55, roe: 10.5, roic: 7.5,
  },
  'BAMI.MI': {
    name: 'Banco BPM',
    sector: 'Financials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 1.04, dividendFrequency: 'Annual',
    paymentMonths: [4],
    dividendGrowthRate: 12.0, moatRating: 'None', lynchCategory: 'Turnaround',
    consecutiveDividendYears: 4, payoutRatio: 42, roe: 12.5, roic: 10.5,
  },
  'PRY.MI': {
    name: 'Prysmian',
    sector: 'Industrials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0.73, dividendFrequency: 'Annual',
    paymentMonths: [4],
    dividendGrowthRate: 8.0, moatRating: 'Narrow', lynchCategory: 'FastGrower',
    consecutiveDividendYears: 10, payoutRatio: 28, roe: 18.5, roic: 12.5,
  },
  'G.MI': {
    name: 'Generali',
    sector: 'Financials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 1.36, dividendFrequency: 'Annual',
    paymentMonths: [5],
    dividendGrowthRate: 5.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 14, payoutRatio: 55, roe: 12.5, roic: 8.5,
  },
  'MB.MI': {
    name: 'Mediobanca',
    sector: 'Financials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 1.20, dividendFrequency: 'Annual',
    paymentMonths: [11],
    dividendGrowthRate: 6.0, moatRating: 'Narrow', lynchCategory: 'SlowGrower',
    consecutiveDividendYears: 10, payoutRatio: 48, roe: 10.5, roic: 8.5,
  },
  'SPM.MI': {
    name: 'Saipem',
    sector: 'Energy', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0.05, dividendFrequency: 'Annual',
    paymentMonths: [5],
    dividendGrowthRate: 0.0, moatRating: 'None', lynchCategory: 'Turnaround',
    consecutiveDividendYears: 2, payoutRatio: 15, roe: 5.5, roic: 5.5,
  },
  'RACE.MI': {
    name: 'Ferrari',
    sector: 'Consumer Discretionary', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 2.24, dividendFrequency: 'Annual',
    paymentMonths: [5],
    dividendGrowthRate: 20.0, moatRating: 'Wide', lynchCategory: 'FastGrower',
    consecutiveDividendYears: 8, payoutRatio: 18, roe: 42.5, roic: 22.5,
  },
  'STLAM.MI': {
    name: 'Stellantis',
    sector: 'Consumer Discretionary', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0.68, dividendFrequency: 'Annual',
    paymentMonths: [4],
    dividendGrowthRate: 0.0, moatRating: 'None', lynchCategory: 'Cyclical',
    consecutiveDividendYears: 4, payoutRatio: 18, roe: 12.5, roic: 10.5,
  },
  'BZU.MI': {
    name: 'Buzzi',
    sector: 'Materials', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0.45, dividendFrequency: 'Annual',
    paymentMonths: [5],
    dividendGrowthRate: 5.0, moatRating: 'Narrow', lynchCategory: 'Cyclical',
    consecutiveDividendYears: 10, payoutRatio: 12, roe: 14.5, roic: 10.5,
  },
  'STM.MI': {
    name: 'STMicroelectronics',
    sector: 'Technology', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0.48, dividendFrequency: 'Quarterly',
    paymentMonths: [3,6,9,12],
    dividendGrowthRate: 8.0, moatRating: 'Narrow', lynchCategory: 'Cyclical',
    consecutiveDividendYears: 10, payoutRatio: 15, roe: 22.5, roic: 14.5,
  },
  'AMP.MI': {
    name: 'Amplifon',
    sector: 'Healthcare', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 0.26, dividendFrequency: 'Annual',
    paymentMonths: [5],
    dividendGrowthRate: 10.0, moatRating: 'Wide', lynchCategory: 'FastGrower',
    consecutiveDividendYears: 12, payoutRatio: 22, roe: 18.5, roic: 12.5,
  },
  'DIA.MI': {
    name: 'DiaSorin',
    sector: 'Healthcare', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 1.00, dividendFrequency: 'Annual',
    paymentMonths: [5],
    dividendGrowthRate: 5.0, moatRating: 'Wide', lynchCategory: 'FastGrower',
    consecutiveDividendYears: 15, payoutRatio: 22, roe: 18.5, roic: 14.5,
  },

  // ── Europe — Francia ──────────────────────────────────────────────────────

  'SAN.PA': {
    name: 'Sanofi',
    sector: 'Healthcare', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 3.92, dividendFrequency: 'Annual',
    paymentMonths: [5],
    dividendGrowthRate: 3.8, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 29, payoutRatio: 48, roe: 13.5, roic: 10.2,
  },
  'MC.PA': {
    name: 'LVMH',
    sector: 'Consumer Discretionary', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 13.00, dividendFrequency: 'SemiAnnual',
    paymentMonths: [4,12],
    dividendGrowthRate: 12.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 20, payoutRatio: 35, roe: 22.5, roic: 18.5,
  },

  // ── Europe — Svizzera ─────────────────────────────────────────────────────

  'NESN.SW': {
    name: 'Nestlé',
    sector: 'Consumer Staples', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 3.00, dividendFrequency: 'Annual',
    paymentMonths: [4],
    dividendGrowthRate: 4.2, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 28, payoutRatio: 65, roe: 28.5, roic: 12.5,
  },
  'NOVN.SW': {
    name: 'Novartis',
    sector: 'Healthcare', geography: 'Europe', assetType: 'Stock',
    dividendPerShare: 3.50, dividendFrequency: 'Annual',
    paymentMonths: [3],
    dividendGrowthRate: 3.0, moatRating: 'Wide', lynchCategory: 'Stalwart',
    consecutiveDividendYears: 25, payoutRatio: 52, roe: 18.5, roic: 14.5,
  },
};

// ── Helper per lookup ─────────────────────────────────────────────────────────

export function getStockDefaults(ticker) {
  return STOCK_DB[ticker.toUpperCase()] || STOCK_DB[ticker] || null;
}

export const SECTORS = [
  'Consumer Staples', 'Consumer Discretionary', 'Energy', 'Financials',
  'Healthcare', 'Industrials', 'Real Estate', 'Retail', 'Technology',
  'Communication', 'Utilities', 'Materials', 'Altro',
];

export const GEOGRAPHIES = ['US', 'Europe', 'EM', 'Other'];

export const ASSET_TYPES = ['Stock', 'REIT', 'BDC', 'ETF'];

export const MOAT_RATINGS = ['Wide', 'Narrow', 'None'];

export const LYNCH_CATEGORIES = ['SlowGrower', 'Stalwart', 'FastGrower', 'Cyclical', 'Turnaround'];

export const FREQUENCIES = ['Monthly', 'Quarterly', 'SemiAnnual', 'Annual'];

export const FREQUENCY_MONTHS = {
  Monthly:    [1,2,3,4,5,6,7,8,9,10,11,12],
  Quarterly:  [3,6,9,12],
  SemiAnnual: [3,9],
  Annual:     [6],
};
