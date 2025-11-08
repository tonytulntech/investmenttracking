import axios from 'axios';

/**
 * Allocation Service
 *
 * Automatically fetches allocation data for stocks, ETFs, and crypto:
 * - Country & Continent exposure
 * - Sector breakdown
 * - Market type (Developed, Emerging, Frontier)
 * - Currency
 *
 * APIs used:
 * - Financial Modeling Prep (FMP) for ETF data
 * - Yahoo Finance for stock data
 * - CoinGecko for crypto data
 *
 * Note: You need a FREE API key from financialmodelingprep.com
 * Sign up at: https://site.financialmodelingprep.com/register
 */

// FMP API Key - Get yours free at https://site.financialmodelingprep.com/register
const FMP_API_KEY = 'demo'; // Replace with your API key (free tier: 250 requests/day)

// CORS proxies for API requests
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// Country to Continent mapping
const COUNTRY_TO_CONTINENT = {
  'United States': 'North America',
  'Canada': 'North America',
  'Mexico': 'North America',
  'United Kingdom': 'Europe',
  'Germany': 'Europe',
  'France': 'Europe',
  'Italy': 'Europe',
  'Spain': 'Europe',
  'Netherlands': 'Europe',
  'Switzerland': 'Europe',
  'Sweden': 'Europe',
  'Norway': 'Europe',
  'Denmark': 'Europe',
  'Finland': 'Europe',
  'Ireland': 'Europe',
  'Belgium': 'Europe',
  'Austria': 'Europe',
  'Poland': 'Europe',
  'Russia': 'Europe',
  'Japan': 'Asia',
  'China': 'Asia',
  'Hong Kong': 'Asia',
  'South Korea': 'Asia',
  'Taiwan': 'Asia',
  'Singapore': 'Asia',
  'India': 'Asia',
  'Thailand': 'Asia',
  'Indonesia': 'Asia',
  'Malaysia': 'Asia',
  'Philippines': 'Asia',
  'Vietnam': 'Asia',
  'Australia': 'Oceania',
  'New Zealand': 'Oceania',
  'Brazil': 'South America',
  'Argentina': 'South America',
  'Chile': 'South America',
  'Colombia': 'South America',
  'Peru': 'South America',
  'South Africa': 'Africa',
  'Egypt': 'Africa',
  'Nigeria': 'Africa',
  'Kenya': 'Africa',
  'Israel': 'Middle East',
  'Saudi Arabia': 'Middle East',
  'United Arab Emirates': 'Middle East',
  'Turkey': 'Middle East'
};

// Market type classification
const MARKET_TYPES = {
  'Developed Markets': ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain',
                        'Netherlands', 'Switzerland', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland',
                        'Belgium', 'Austria', 'Japan', 'Australia', 'New Zealand', 'Singapore', 'Hong Kong'],
  'Emerging Markets': ['China', 'India', 'Brazil', 'Russia', 'South Korea', 'Taiwan', 'Mexico', 'South Africa',
                       'Indonesia', 'Thailand', 'Malaysia', 'Philippines', 'Turkey', 'Poland', 'Chile',
                       'Colombia', 'Peru', 'Egypt', 'Saudi Arabia', 'United Arab Emirates'],
  'Frontier Markets': ['Vietnam', 'Argentina', 'Nigeria', 'Kenya', 'Bangladesh', 'Pakistan', 'Morocco']
};

/**
 * Get continent from country name
 */
function getContinent(country) {
  return COUNTRY_TO_CONTINENT[country] || 'Other';
}

/**
 * Get market type from country name
 */
function getMarketType(country) {
  for (const [type, countries] of Object.entries(MARKET_TYPES)) {
    if (countries.includes(country)) {
      return type;
    }
  }
  return 'Other';
}

/**
 * Fetch ETF sector allocation from Financial Modeling Prep
 */
async function fetchETFSectorAllocation(ticker) {
  try {
    const url = `https://financialmodelingprep.com/api/v3/etf-sector-weightings/${ticker}?apikey=${FMP_API_KEY}`;
    const response = await axios.get(url, { timeout: 10000 });

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      // Convert array of sector objects to a simple object
      const sectors = {};
      response.data.forEach(item => {
        if (item.sector && item.weightPercentage) {
          sectors[item.sector] = parseFloat(item.weightPercentage);
        }
      });
      return sectors;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ETF sector allocation for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Fetch ETF country allocation from Financial Modeling Prep
 */
async function fetchETFCountryAllocation(ticker) {
  try {
    const url = `https://financialmodelingprep.com/api/v3/etf-country-weightings/${ticker}?apikey=${FMP_API_KEY}`;
    const response = await axios.get(url, { timeout: 10000 });

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      // Convert array of country objects to a simple object
      const countries = {};
      response.data.forEach(item => {
        if (item.country && item.weightPercentage) {
          countries[item.country] = parseFloat(item.weightPercentage);
        }
      });
      return countries;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ETF country allocation for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Fetch stock profile from Yahoo Finance (includes sector, industry, country)
 */
async function fetchStockProfile(ticker) {
  try {
    const yahooURL = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=assetProfile,summaryProfile`;
    const response = await axios.get(CORS_PROXY + encodeURIComponent(yahooURL), { timeout: 10000 });

    if (response.data && response.data.quoteSummary && response.data.quoteSummary.result) {
      const result = response.data.quoteSummary.result[0];
      const profile = result.assetProfile || result.summaryProfile || {};

      return {
        sector: profile.sector || null,
        industry: profile.industry || null,
        country: profile.country || null,
        currency: profile.currency || null
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching stock profile for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Fetch crypto info from CoinGecko
 */
async function fetchCryptoInfo(symbol) {
  try {
    const searchUrl = `https://api.coingecko.com/api/v3/search?query=${symbol}`;
    const searchResponse = await axios.get(searchUrl, { timeout: 10000 });

    if (searchResponse.data && searchResponse.data.coins && searchResponse.data.coins.length > 0) {
      const coin = searchResponse.data.coins[0];
      return {
        name: coin.name,
        symbol: coin.symbol,
        // Crypto doesn't have traditional allocation data
        sector: 'Cryptocurrency',
        country: 'Global',
        continent: 'Global',
        marketType: 'Cryptocurrency',
        currency: 'USD' // Most crypto priced in USD
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching crypto info for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Main function: Fetch complete allocation data for any ticker
 *
 * @param {string} ticker - Stock/ETF ticker symbol
 * @param {string} category - 'Stock', 'ETF', 'Crypto', 'Bond', etc.
 * @returns {Object} Allocation data with country, sector, continent, marketType, currency
 */
export async function fetchAllocationData(ticker, category) {
  try {
    console.log(`Fetching allocation data for ${ticker} (${category})...`);

    // Handle Crypto differently
    if (category === 'Crypto') {
      const cryptoInfo = await fetchCryptoInfo(ticker);
      if (cryptoInfo) {
        return {
          ticker,
          category,
          allocation: {
            countries: { 'Global': 100 },
            continents: { 'Global': 100 },
            sectors: { 'Cryptocurrency': 100 },
            marketTypes: { 'Cryptocurrency': 100 },
            currency: 'USD'
          },
          metadata: {
            name: cryptoInfo.name,
            lastUpdated: new Date().toISOString()
          }
        };
      }
    }

    // Handle ETFs
    if (category === 'ETF') {
      const [sectorData, countryData] = await Promise.all([
        fetchETFSectorAllocation(ticker),
        fetchETFCountryAllocation(ticker)
      ]);

      if (countryData || sectorData) {
        // Calculate continent allocation from countries
        const continents = {};
        const marketTypes = {};

        if (countryData) {
          Object.entries(countryData).forEach(([country, percentage]) => {
            const continent = getContinent(country);
            const marketType = getMarketType(country);

            continents[continent] = (continents[continent] || 0) + percentage;
            marketTypes[marketType] = (marketTypes[marketType] || 0) + percentage;
          });
        }

        return {
          ticker,
          category,
          allocation: {
            countries: countryData || {},
            continents: Object.keys(continents).length > 0 ? continents : {},
            sectors: sectorData || {},
            marketTypes: Object.keys(marketTypes).length > 0 ? marketTypes : {},
            currency: 'USD' // Most ETFs are USD-denominated
          },
          metadata: {
            lastUpdated: new Date().toISOString()
          }
        };
      }
    }

    // Handle Stocks
    if (category === 'Stock' || category === 'Azione') {
      const stockProfile = await fetchStockProfile(ticker);

      if (stockProfile && stockProfile.country) {
        const continent = getContinent(stockProfile.country);
        const marketType = getMarketType(stockProfile.country);

        return {
          ticker,
          category,
          allocation: {
            countries: { [stockProfile.country]: 100 },
            continents: { [continent]: 100 },
            sectors: stockProfile.sector ? { [stockProfile.sector]: 100 } : {},
            marketTypes: { [marketType]: 100 },
            currency: stockProfile.currency || 'USD'
          },
          metadata: {
            industry: stockProfile.industry,
            lastUpdated: new Date().toISOString()
          }
        };
      }
    }

    // Fallback: No allocation data available
    console.warn(`No allocation data found for ${ticker}`);
    return {
      ticker,
      category,
      allocation: {
        countries: {},
        continents: {},
        sectors: {},
        marketTypes: {},
        currency: 'EUR'
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        note: 'No allocation data available'
      }
    };

  } catch (error) {
    console.error(`Error fetching allocation data for ${ticker}:`, error);
    return {
      ticker,
      category,
      allocation: {
        countries: {},
        continents: {},
        sectors: {},
        marketTypes: {},
        currency: 'EUR'
      },
      metadata: {
        error: error.message,
        lastUpdated: new Date().toISOString()
      }
    };
  }
}

/**
 * Calculate portfolio-wide allocation across all holdings
 *
 * @param {Array} portfolio - Array of holdings with allocation data
 * @returns {Object} Aggregated allocation percentages
 */
export function calculatePortfolioAllocation(portfolio) {
  const totalValue = portfolio.reduce((sum, holding) => sum + holding.marketValue, 0);

  if (totalValue === 0) {
    return {
      countries: {},
      continents: {},
      sectors: {},
      marketTypes: {},
      currencies: {}
    };
  }

  const aggregated = {
    countries: {},
    continents: {},
    sectors: {},
    marketTypes: {},
    currencies: {}
  };

  portfolio.forEach(holding => {
    if (!holding.allocation) return;

    const weight = holding.marketValue / totalValue;

    // Aggregate countries
    if (holding.allocation.countries) {
      Object.entries(holding.allocation.countries).forEach(([country, percentage]) => {
        aggregated.countries[country] = (aggregated.countries[country] || 0) + (percentage * weight);
      });
    }

    // Aggregate continents
    if (holding.allocation.continents) {
      Object.entries(holding.allocation.continents).forEach(([continent, percentage]) => {
        aggregated.continents[continent] = (aggregated.continents[continent] || 0) + (percentage * weight);
      });
    }

    // Aggregate sectors
    if (holding.allocation.sectors) {
      Object.entries(holding.allocation.sectors).forEach(([sector, percentage]) => {
        aggregated.sectors[sector] = (aggregated.sectors[sector] || 0) + (percentage * weight);
      });
    }

    // Aggregate market types
    if (holding.allocation.marketTypes) {
      Object.entries(holding.allocation.marketTypes).forEach(([type, percentage]) => {
        aggregated.marketTypes[type] = (aggregated.marketTypes[type] || 0) + (percentage * weight);
      });
    }

    // Aggregate currencies
    if (holding.allocation.currency) {
      aggregated.currencies[holding.allocation.currency] =
        (aggregated.currencies[holding.allocation.currency] || 0) + (weight * 100);
    }
  });

  return aggregated;
}

export default {
  fetchAllocationData,
  calculatePortfolioAllocation
};
