/**
 * Local ETF Database
 *
 * Since FMP API's ETF endpoints require a premium plan,
 * we maintain a local database of popular ETFs with their allocation data.
 *
 * Data sources: Official ETF provider websites (Vanguard, iShares, etc.)
 * Last updated: 2024
 */

export const ETF_DATA = {
  // Vanguard ETFs
  'VWCE': {
    name: 'Vanguard FTSE All-World UCITS ETF',
    isin: 'IE00BK5BQT80',
    countries: {
      'United States': 61.8,
      'Japan': 5.8,
      'United Kingdom': 3.8,
      'China': 3.4,
      'France': 2.8,
      'Canada': 2.8,
      'Switzerland': 2.5,
      'Germany': 2.3,
      'Australia': 2.0,
      'Taiwan': 1.8
    },
    sectors: {
      'Technology': 23.5,
      'Financials': 15.2,
      'Industrials': 11.8,
      'Consumer Discretionary': 10.9,
      'Health Care': 10.8,
      'Consumer Staples': 6.2,
      'Energy': 4.8,
      'Materials': 4.3,
      'Real Estate': 2.8,
      'Utilities': 2.5
    },
    currency: 'USD'
  },
  'VWCE.DE': {
    name: 'Vanguard FTSE All-World UCITS ETF',
    isin: 'IE00BK5BQT80',
    countries: {
      'United States': 61.8,
      'Japan': 5.8,
      'United Kingdom': 3.8,
      'China': 3.4,
      'France': 2.8,
      'Canada': 2.8,
      'Switzerland': 2.5,
      'Germany': 2.3,
      'Australia': 2.0,
      'Taiwan': 1.8
    },
    sectors: {
      'Technology': 23.5,
      'Financials': 15.2,
      'Industrials': 11.8,
      'Consumer Discretionary': 10.9,
      'Health Care': 10.8,
      'Consumer Staples': 6.2,
      'Energy': 4.8,
      'Materials': 4.3,
      'Real Estate': 2.8,
      'Utilities': 2.5
    },
    currency: 'EUR'
  },
  'VTI': {
    name: 'Vanguard Total Stock Market ETF',
    isin: 'US9229087690',
    countries: {
      'United States': 100
    },
    sectors: {
      'Technology': 31.2,
      'Financials': 13.1,
      'Health Care': 12.8,
      'Consumer Discretionary': 10.5,
      'Industrials': 8.9,
      'Consumer Staples': 5.8,
      'Energy': 4.2,
      'Real Estate': 3.8,
      'Materials': 2.5,
      'Utilities': 2.3
    },
    currency: 'USD'
  },
  'SPY': {
    name: 'SPDR S&P 500 ETF Trust',
    isin: 'US78462F1030',
    countries: {
      'United States': 100
    },
    sectors: {
      'Technology': 29.8,
      'Financials': 13.2,
      'Health Care': 12.5,
      'Consumer Discretionary': 10.8,
      'Industrials': 8.4,
      'Communication Services': 8.9,
      'Consumer Staples': 6.1,
      'Energy': 3.8,
      'Utilities': 2.5,
      'Real Estate': 2.3
    },
    currency: 'USD'
  },
  'IWDA': {
    name: 'iShares Core MSCI World UCITS ETF',
    isin: 'IE00B4L5Y983',
    countries: {
      'United States': 70.5,
      'Japan': 6.1,
      'United Kingdom': 3.7,
      'France': 3.1,
      'Canada': 3.0,
      'Switzerland': 2.6,
      'Germany': 2.2,
      'Australia': 1.9,
      'Netherlands': 1.3,
      'Sweden': 1.0
    },
    sectors: {
      'Technology': 24.8,
      'Financials': 14.8,
      'Health Care': 11.9,
      'Consumer Discretionary': 11.2,
      'Industrials': 10.8,
      'Consumer Staples': 6.8,
      'Communication Services': 7.2,
      'Energy': 4.1,
      'Materials': 3.8,
      'Utilities': 2.4
    },
    currency: 'USD'
  },
  'IWDA.L': {
    name: 'iShares Core MSCI World UCITS ETF',
    isin: 'IE00B4L5Y983',
    countries: {
      'United States': 70.5,
      'Japan': 6.1,
      'United Kingdom': 3.7,
      'France': 3.1,
      'Canada': 3.0,
      'Switzerland': 2.6,
      'Germany': 2.2,
      'Australia': 1.9,
      'Netherlands': 1.3,
      'Sweden': 1.0
    },
    sectors: {
      'Technology': 24.8,
      'Financials': 14.8,
      'Health Care': 11.9,
      'Consumer Discretionary': 11.2,
      'Industrials': 10.8,
      'Consumer Staples': 6.8,
      'Communication Services': 7.2,
      'Energy': 4.1,
      'Materials': 3.8,
      'Utilities': 2.4
    },
    currency: 'USD'
  },
  'EIMI': {
    name: 'iShares Core MSCI Emerging Markets IMI UCITS ETF',
    isin: 'IE00BKM4GZ66',
    countries: {
      'China': 28.5,
      'India': 19.8,
      'Taiwan': 16.2,
      'South Korea': 11.8,
      'Brazil': 5.2,
      'Saudi Arabia': 3.8,
      'South Africa': 3.2,
      'Mexico': 2.8,
      'Indonesia': 2.1,
      'Thailand': 1.9
    },
    sectors: {
      'Technology': 22.8,
      'Financials': 21.5,
      'Consumer Discretionary': 14.2,
      'Communication Services': 9.8,
      'Materials': 8.5,
      'Energy': 6.8,
      'Industrials': 5.9,
      'Consumer Staples': 5.2,
      'Health Care': 3.1,
      'Utilities': 2.2
    },
    currency: 'USD'
  },
  'VUSA': {
    name: 'Vanguard S&P 500 UCITS ETF',
    isin: 'IE00B3XXRP09',
    countries: {
      'United States': 100
    },
    sectors: {
      'Technology': 29.8,
      'Financials': 13.2,
      'Health Care': 12.5,
      'Consumer Discretionary': 10.8,
      'Communication Services': 8.9,
      'Industrials': 8.4,
      'Consumer Staples': 6.1,
      'Energy': 3.8,
      'Utilities': 2.5,
      'Real Estate': 2.3
    },
    currency: 'USD'
  },
  'VUSA.L': {
    name: 'Vanguard S&P 500 UCITS ETF',
    isin: 'IE00B3XXRP09',
    countries: {
      'United States': 100
    },
    sectors: {
      'Technology': 29.8,
      'Financials': 13.2,
      'Health Care': 12.5,
      'Consumer Discretionary': 10.8,
      'Communication Services': 8.9,
      'Industrials': 8.4,
      'Consumer Staples': 6.1,
      'Energy': 3.8,
      'Utilities': 2.5,
      'Real Estate': 2.3
    },
    currency: 'USD'
  },
  'SPPW': {
    name: 'Invesco S&P 500 UCITS ETF',
    isin: 'IE00B6YX5C33',
    countries: {
      'United States': 100
    },
    sectors: {
      'Technology': 29.5,
      'Financials': 13.0,
      'Health Care': 12.8,
      'Consumer Discretionary': 11.0,
      'Communication Services': 9.0,
      'Industrials': 8.5,
      'Consumer Staples': 6.0,
      'Energy': 4.0,
      'Utilities': 2.5,
      'Real Estate': 2.2
    },
    currency: 'USD'
  },
  'SPPW.DE': {
    name: 'Invesco S&P 500 UCITS ETF',
    isin: 'IE00B6YX5C33',
    countries: {
      'United States': 100
    },
    sectors: {
      'Technology': 29.5,
      'Financials': 13.0,
      'Health Care': 12.8,
      'Consumer Discretionary': 11.0,
      'Communication Services': 9.0,
      'Industrials': 8.5,
      'Consumer Staples': 6.0,
      'Energy': 4.0,
      'Utilities': 2.5,
      'Real Estate': 2.2
    },
    currency: 'EUR'
  },
  'IS3N': {
    name: 'iShares Core MSCI World UCITS ETF',
    isin: 'IE00B4L5Y983',
    countries: {
      'United States': 70.5,
      'Japan': 6.1,
      'United Kingdom': 3.7,
      'France': 3.1,
      'Canada': 3.0,
      'Switzerland': 2.6,
      'Germany': 2.2,
      'Australia': 1.9,
      'Netherlands': 1.3,
      'Sweden': 1.0
    },
    sectors: {
      'Technology': 24.8,
      'Financials': 14.8,
      'Health Care': 11.9,
      'Consumer Discretionary': 11.2,
      'Industrials': 10.8,
      'Consumer Staples': 6.8,
      'Communication Services': 7.2,
      'Energy': 4.1,
      'Materials': 3.8,
      'Utilities': 2.4
    },
    currency: 'EUR'
  },
  'IS3N.DE': {
    name: 'iShares Core MSCI World UCITS ETF',
    isin: 'IE00B4L5Y983',
    countries: {
      'United States': 70.5,
      'Japan': 6.1,
      'United Kingdom': 3.7,
      'France': 3.1,
      'Canada': 3.0,
      'Switzerland': 2.6,
      'Germany': 2.2,
      'Australia': 1.9,
      'Netherlands': 1.3,
      'Sweden': 1.0
    },
    sectors: {
      'Technology': 24.8,
      'Financials': 14.8,
      'Health Care': 11.9,
      'Consumer Discretionary': 11.2,
      'Industrials': 10.8,
      'Consumer Staples': 6.8,
      'Communication Services': 7.2,
      'Energy': 4.1,
      'Materials': 3.8,
      'Utilities': 2.4
    },
    currency: 'EUR'
  },
  'SXRV': {
    name: 'iShares Core S&P 500 UCITS ETF',
    isin: 'IE00B5BMR087',
    countries: {
      'United States': 100
    },
    sectors: {
      'Technology': 30.2,
      'Financials': 13.0,
      'Health Care': 12.3,
      'Consumer Discretionary': 10.5,
      'Communication Services': 9.2,
      'Industrials': 8.3,
      'Consumer Staples': 6.2,
      'Energy': 3.9,
      'Utilities': 2.6,
      'Real Estate': 2.4
    },
    currency: 'USD'
  },
  'SXRV.DE': {
    name: 'iShares Core S&P 500 UCITS ETF',
    isin: 'IE00B5BMR087',
    countries: {
      'United States': 100
    },
    sectors: {
      'Technology': 30.2,
      'Financials': 13.0,
      'Health Care': 12.3,
      'Consumer Discretionary': 10.5,
      'Communication Services': 9.2,
      'Industrials': 8.3,
      'Consumer Staples': 6.2,
      'Energy': 3.9,
      'Utilities': 2.6,
      'Real Estate': 2.4
    },
    currency: 'EUR'
  },
  'QQQ': {
    name: 'Invesco QQQ Trust',
    isin: 'US46090E1038',
    countries: {
      'United States': 100
    },
    sectors: {
      'Technology': 51.2,
      'Communication Services': 18.5,
      'Consumer Discretionary': 14.8,
      'Health Care': 6.2,
      'Consumer Staples': 4.8,
      'Industrials': 3.2,
      'Energy': 0.8,
      'Utilities': 0.3,
      'Financials': 0.2
    },
    currency: 'USD'
  },
  'CSPX': {
    name: 'iShares Core S&P 500 UCITS ETF',
    isin: 'IE00B5BMR087',
    countries: {
      'United States': 100
    },
    sectors: {
      'Technology': 30.2,
      'Financials': 13.0,
      'Health Care': 12.3,
      'Consumer Discretionary': 10.5,
      'Communication Services': 9.2,
      'Industrials': 8.3,
      'Consumer Staples': 6.2,
      'Energy': 3.9,
      'Utilities': 2.6,
      'Real Estate': 2.4
    },
    currency: 'USD'
  }
};

/**
 * Search for ETF data in local database
 * @param {string} ticker - ETF ticker symbol
 * @returns {object|null} ETF allocation data or null if not found
 */
export function getLocalETFData(ticker) {
  const normalizedTicker = ticker.toUpperCase();
  return ETF_DATA[normalizedTicker] || null;
}

/**
 * Check if ticker exists in local database
 * @param {string} ticker - Ticker symbol
 * @returns {boolean}
 */
export function hasLocalETFData(ticker) {
  return ticker.toUpperCase() in ETF_DATA;
}

export default {
  ETF_DATA,
  getLocalETFData,
  hasLocalETFData
};
