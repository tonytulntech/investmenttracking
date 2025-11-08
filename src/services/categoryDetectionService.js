import axios from 'axios';

/**
 * Category Detection Service
 *
 * Automatically detects sub-categories for assets:
 * - ETF: Azionario, Obbligazionario, Materie Prime, Misto, Monetario, Immobiliare
 * - Crypto: Bitcoin, Stablecoin, DeFi, Layer-1, Layer-2, Meme Coin, Alt Coin
 * - Stock: Large Cap, Mid Cap, Small Cap
 * - Bond: Governativi, Corporativi, High Yield
 *
 * Uses free APIs: Yahoo Finance, CoinGecko
 */

// Try multiple CORS proxies for better reliability
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/'
];

let currentProxyIndex = 0;

function getCorsProxy() {
  return CORS_PROXIES[currentProxyIndex];
}

/**
 * Smart fallback: detect category from ticker name patterns
 */
function detectFromTickerName(ticker) {
  const t = ticker.toUpperCase();

  // Common ETF patterns
  const patterns = {
    // Equity/Azionario
    'VWCE': 'Azionario', 'SWDA': 'Azionario', 'IWDA': 'Azionario', 'IS3N': 'Azionario',
    'SPY': 'Azionario', 'VOO': 'Azionario', 'VTI': 'Azionario', 'VUSA': 'Azionario',
    'QQQ': 'Azionario', 'CSPX': 'Azionario', 'SXRV': 'Azionario', 'SPPW': 'Azionario',

    // Bond/Obbligazionario
    'AGG': 'Obbligazionario', 'BND': 'Obbligazionario', 'TLT': 'Obbligazionario',
    'VGLT': 'Obbligazionario', 'IBTA': 'Obbligazionario',

    // Commodities
    'GLD': 'Materie Prime', 'SLV': 'Materie Prime', 'DBC': 'Materie Prime',

    // Real Estate/Immobiliare
    'VNQ': 'Immobiliare', 'VNQI': 'Immobiliare'
  };

  // Direct match
  if (patterns[t]) {
    console.log(`✓ Matched ticker ${ticker} to ${patterns[t]} via pattern`);
    return patterns[t];
  }

  // Keyword matching
  if (t.includes('WORLD') || t.includes('MSCI') || t.includes('S&P') || t.includes('STOXX')) {
    return 'Azionario';
  }
  if (t.includes('BOND') || t.includes('TREASURY') || t.includes('GILT')) {
    return 'Obbligazionario';
  }
  if (t.includes('GOLD') || t.includes('SILVER') || t.includes('COMMODITY')) {
    return 'Materie Prime';
  }
  if (t.includes('REIT') || t.includes('REAL')) {
    return 'Immobiliare';
  }

  return null;
}

/**
 * Detect ETF sub-category from Yahoo Finance data
 */
async function detectETFSubCategory(ticker) {
  // First try: Smart fallback based on ticker name
  const fallbackResult = detectFromTickerName(ticker);
  if (fallbackResult) {
    return fallbackResult;
  }

  try {
    // Try direct call first (no CORS proxy)
    const yahooURL = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=fundProfile,assetProfile,price`;

    let response;
    try {
      response = await axios.get(yahooURL, { timeout: 10000 });
    } catch (error) {
      // If direct call fails, try with CORS proxy
      console.log('Direct call failed, trying with CORS proxy...');
      response = await axios.get(getCorsProxy() + encodeURIComponent(yahooURL), { timeout: 10000 });
    }

    if (response.data && response.data.quoteSummary && response.data.quoteSummary.result) {
      const result = response.data.quoteSummary.result[0];
      const fundProfile = result.fundProfile || {};
      const assetProfile = result.assetProfile || {};
      const price = result.price || {};

      // Get category from Yahoo
      const category = fundProfile.categoryName || assetProfile.category || '';
      const longName = price.longName || price.shortName || '';

      console.log(`ETF ${ticker} - Category: ${category}, Name: ${longName}`);

      // Check for specific types based on category and name
      const categoryLower = category.toLowerCase();
      const nameLower = longName.toLowerCase();

      // Money Market / Monetario
      if (categoryLower.includes('money market') ||
          nameLower.includes('money market') ||
          nameLower.includes('cash')) {
        return 'Monetario';
      }

      // Bond / Obbligazionario
      if (categoryLower.includes('bond') ||
          categoryLower.includes('fixed income') ||
          categoryLower.includes('obblig') ||
          nameLower.includes('bond') ||
          nameLower.includes('treasury') ||
          nameLower.includes('debt')) {
        return 'Obbligazionario';
      }

      // Commodities / Materie Prime
      if (categoryLower.includes('commodit') ||
          categoryLower.includes('precious metal') ||
          categoryLower.includes('gold') ||
          categoryLower.includes('silver') ||
          nameLower.includes('gold') ||
          nameLower.includes('silver') ||
          nameLower.includes('commodity') ||
          nameLower.includes('oil') ||
          nameLower.includes('energy')) {
        return 'Materie Prime';
      }

      // Real Estate / Immobiliare
      if (categoryLower.includes('real estate') ||
          categoryLower.includes('reit') ||
          nameLower.includes('reit') ||
          nameLower.includes('real estate')) {
        return 'Immobiliare';
      }

      // Check stock/bond position if available
      if (fundProfile.stockPosition !== undefined && fundProfile.bondPosition !== undefined) {
        const stockPos = fundProfile.stockPosition * 100;
        const bondPos = fundProfile.bondPosition * 100;

        console.log(`Stock: ${stockPos}%, Bond: ${bondPos}%`);

        // Azionario (mostly equity)
        if (stockPos > 80) {
          return 'Azionario';
        }

        // Obbligazionario (mostly bonds)
        if (bondPos > 80) {
          return 'Obbligazionario';
        }

        // Misto (balanced)
        if (stockPos > 20 && bondPos > 20) {
          return 'Misto';
        }
      }

      // Default: if contains "equity", "stock", "world", "all-world" → Azionario
      if (categoryLower.includes('equity') ||
          categoryLower.includes('stock') ||
          nameLower.includes('equity') ||
          nameLower.includes('world') ||
          nameLower.includes('s&p') ||
          nameLower.includes('msci')) {
        return 'Azionario';
      }

      // Fallback
      return null;
    }

    return null;
  } catch (error) {
    console.error(`Error detecting ETF sub-category for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Detect Crypto sub-category from CoinGecko
 */
async function detectCryptoSubCategory(symbol) {
  // Smart fallback for common cryptos
  const s = symbol.toUpperCase();
  const cryptoPatterns = {
    'BTC': 'Bitcoin', 'BITCOIN': 'Bitcoin',
    'ETH': 'Layer 1', 'ETHEREUM': 'Layer 1',
    'SOL': 'Layer 1', 'SOLANA': 'Layer 1',
    'ADA': 'Layer 1', 'CARDANO': 'Layer 1',
    'AVAX': 'Layer 1', 'AVALANCHE': 'Layer 1',
    'DOT': 'Layer 1', 'POLKADOT': 'Layer 1',
    'MATIC': 'Layer 2', 'POLYGON': 'Layer 2',
    'ARB': 'Layer 2', 'ARBITRUM': 'Layer 2',
    'OP': 'Layer 2', 'OPTIMISM': 'Layer 2',
    'USDT': 'Stablecoin', 'TETHER': 'Stablecoin',
    'USDC': 'Stablecoin', 'DAI': 'Stablecoin',
    'BUSD': 'Stablecoin', 'TUSD': 'Stablecoin',
    'DOGE': 'Meme Coin', 'SHIB': 'Meme Coin', 'PEPE': 'Meme Coin',
    'FLOKI': 'Meme Coin', 'BONK': 'Meme Coin',
    'UNI': 'DeFi', 'AAVE': 'DeFi', 'COMP': 'DeFi', 'MKR': 'DeFi',
    'SUSHI': 'DeFi', 'CRV': 'DeFi', 'SNX': 'DeFi'
  };

  if (cryptoPatterns[s]) {
    console.log(`✓ Matched crypto ${symbol} to ${cryptoPatterns[s]} via pattern`);
    return cryptoPatterns[s];
  }

  try {
    // First search for the coin
    const searchUrl = `https://api.coingecko.com/api/v3/search?query=${symbol}`;
    const searchResponse = await axios.get(searchUrl, { timeout: 10000 });

    if (searchResponse.data && searchResponse.data.coins && searchResponse.data.coins.length > 0) {
      const coin = searchResponse.data.coins[0];
      const coinId = coin.id;

      // Get detailed coin data
      const detailUrl = `https://api.coingecko.com/api/v3/coins/${coinId}`;
      const detailResponse = await axios.get(detailUrl, { timeout: 10000 });

      if (detailResponse.data) {
        const categories = detailResponse.data.categories || [];
        const symbol = detailResponse.data.symbol?.toUpperCase() || '';
        const name = detailResponse.data.name?.toLowerCase() || '';

        console.log(`Crypto ${symbol} - Categories:`, categories);

        // Bitcoin
        if (symbol === 'BTC' || coinId === 'bitcoin') {
          return 'Bitcoin';
        }

        // Ethereum (treat as Layer 1)
        if (symbol === 'ETH' || coinId === 'ethereum') {
          return 'Layer 1';
        }

        // Check categories from CoinGecko
        const categoryStr = categories.join(' ').toLowerCase();

        // Stablecoin
        if (categoryStr.includes('stablecoin') ||
            name.includes('usd') ||
            name.includes('tether') ||
            name.includes('usdc') ||
            name.includes('dai')) {
          return 'Stablecoin';
        }

        // DeFi
        if (categoryStr.includes('decentralized finance') ||
            categoryStr.includes('defi') ||
            categoryStr.includes('lending') ||
            categoryStr.includes('dex')) {
          return 'DeFi';
        }

        // Layer 1
        if (categoryStr.includes('layer 1') ||
            categoryStr.includes('smart contract platform') ||
            categoryStr.includes('blockchain platform')) {
          return 'Layer 1';
        }

        // Layer 2
        if (categoryStr.includes('layer 2') ||
            categoryStr.includes('scaling') ||
            categoryStr.includes('rollup')) {
          return 'Layer 2';
        }

        // Meme Coin
        if (categoryStr.includes('meme') ||
            name.includes('doge') ||
            name.includes('shib') ||
            name.includes('pepe') ||
            name.includes('floki')) {
          return 'Meme Coin';
        }

        // Default: Alt Coin
        return 'Alt Coin';
      }
    }

    return null;
  } catch (error) {
    console.error(`Error detecting crypto sub-category for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Detect Stock sub-category from Yahoo Finance (market cap)
 */
async function detectStockSubCategory(ticker) {
  try {
    const yahooURL = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price,summaryDetail`;
    const response = await axios.get(CORS_PROXY + encodeURIComponent(yahooURL), { timeout: 10000 });

    if (response.data && response.data.quoteSummary && response.data.quoteSummary.result) {
      const result = response.data.quoteSummary.result[0];
      const summaryDetail = result.summaryDetail || {};
      const price = result.price || {};

      // Get market cap
      const marketCap = summaryDetail.marketCap?.raw || price.marketCap?.raw || 0;

      console.log(`Stock ${ticker} - Market Cap: $${(marketCap / 1e9).toFixed(2)}B`);

      // Classification based on market cap (in USD)
      if (marketCap > 10e9) {
        return 'Large Cap'; // > $10 billion
      } else if (marketCap > 2e9) {
        return 'Mid Cap'; // $2-10 billion
      } else if (marketCap > 0) {
        return 'Small Cap'; // < $2 billion
      }

      return null;
    }

    return null;
  } catch (error) {
    console.error(`Error detecting stock sub-category for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Detect Bond sub-category from Yahoo Finance
 */
async function detectBondSubCategory(ticker) {
  try {
    const yahooURL = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=assetProfile,price`;
    const response = await axios.get(CORS_PROXY + encodeURIComponent(yahooURL), { timeout: 10000 });

    if (response.data && response.data.quoteSummary && response.data.quoteSummary.result) {
      const result = response.data.quoteSummary.result[0];
      const assetProfile = result.assetProfile || {};
      const price = result.price || {};

      const longName = price.longName || price.shortName || '';
      const nameLower = longName.toLowerCase();

      // Government bonds
      if (nameLower.includes('treasury') ||
          nameLower.includes('government') ||
          nameLower.includes('sovereign') ||
          nameLower.includes('btp') ||
          nameLower.includes('bund')) {
        return 'Governativi';
      }

      // Corporate bonds
      if (nameLower.includes('corporate') ||
          nameLower.includes('company')) {
        return 'Corporativi';
      }

      // High yield
      if (nameLower.includes('high yield') ||
          nameLower.includes('junk')) {
        return 'High Yield';
      }

      // Municipal
      if (nameLower.includes('municipal') ||
          nameLower.includes('muni')) {
        return 'Municipali';
      }

      // Default corporate
      return 'Corporativi';
    }

    return null;
  } catch (error) {
    console.error(`Error detecting bond sub-category for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Main function: Auto-detect sub-category for any asset
 *
 * @param {string} ticker - Asset ticker/symbol
 * @param {string} category - Main category (ETF, Crypto, Stock, Bond, etc.)
 * @returns {Promise<string|null>} Detected sub-category or null
 */
export async function detectSubCategory(ticker, category) {
  try {
    console.log(`Auto-detecting sub-category for ${ticker} (${category})...`);

    switch (category) {
      case 'ETF':
        return await detectETFSubCategory(ticker);

      case 'Crypto':
        return await detectCryptoSubCategory(ticker);

      case 'Stock':
        return await detectStockSubCategory(ticker);

      case 'Bond':
        return await detectBondSubCategory(ticker);

      case 'Cash':
        // Cash is usually manual
        return 'Conto Corrente';

      default:
        return null;
    }
  } catch (error) {
    console.error(`Error in detectSubCategory for ${ticker}:`, error);
    return null;
  }
}

export default {
  detectSubCategory,
  detectETFSubCategory,
  detectCryptoSubCategory,
  detectStockSubCategory,
  detectBondSubCategory
};
