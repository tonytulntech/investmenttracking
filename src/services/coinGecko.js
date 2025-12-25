import axios from 'axios';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Map common crypto symbols to CoinGecko IDs
const CRYPTO_ID_MAP = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'ADA': 'cardano',
  'SOL': 'solana',
  'DOT': 'polkadot',
  'AVAX': 'avalanche-2',
  'MATIC': 'matic-network',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'XRP': 'ripple',
  'DOGE': 'dogecoin',
  'SHIB': 'shiba-inu',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'ALGO': 'algorand',
  'XLM': 'stellar',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'DAI': 'dai',
  'BUSD': 'binance-usd'
};

/**
 * Convert crypto symbol to CoinGecko ID
 * @param {string} symbol - Crypto symbol (e.g., 'BTC', 'ETH')
 * @returns {string} CoinGecko ID (e.g., 'bitcoin', 'ethereum')
 */
export const getCryptoId = (symbol) => {
  const upperSymbol = symbol.toUpperCase();
  return CRYPTO_ID_MAP[upperSymbol] || symbol.toLowerCase();
};

/**
 * Fetch cryptocurrency price from CoinGecko
 * @param {string} symbol - Crypto symbol (e.g., 'BTC', 'ETH')
 * @param {string} vsCurrency - Fiat currency to convert to (default: 'eur')
 * @returns {Promise<Object>} Price data with current price, change, changePercent
 */
export const fetchCryptoPrice = async (symbol, vsCurrency = 'eur') => {
  try {
    const cryptoId = getCryptoId(symbol);
    const url = `${COINGECKO_API}/simple/price`;

    const response = await axios.get(url, {
      params: {
        ids: cryptoId,
        vs_currencies: vsCurrency,
        include_24hr_change: true,
        include_last_updated_at: true
      },
      timeout: 10000
    });

    const data = response.data[cryptoId];

    if (!data) {
      throw new Error(`Crypto ${symbol} not found on CoinGecko`);
    }

    const price = data[vsCurrency];
    const changePercent = data[`${vsCurrency}_24h_change`] || 0;
    const change = (price * changePercent) / 100;

    return {
      ticker: symbol.toUpperCase(),
      cryptoId: cryptoId,
      price: price,
      change: change,
      changePercent: changePercent,
      currency: vsCurrency.toUpperCase(),
      timestamp: new Date(data.last_updated_at * 1000).toISOString(),
      source: 'coingecko'
    };
  } catch (error) {
    console.error(`Error fetching crypto price for ${symbol}:`, error.message);
    throw error;
  }
};

/**
 * Fetch prices for multiple cryptocurrencies in parallel
 * @param {string[]} symbols - Array of crypto symbols
 * @param {string} vsCurrency - Fiat currency to convert to
 * @returns {Promise<Object>} Object mapping symbol to price data
 */
export const fetchMultipleCryptoPrices = async (symbols, vsCurrency = 'eur') => {
  try {
    const uniqueSymbols = [...new Set(symbols)];

    // CoinGecko allows fetching multiple at once
    const cryptoIds = uniqueSymbols.map(getCryptoId).join(',');
    const url = `${COINGECKO_API}/simple/price`;

    const response = await axios.get(url, {
      params: {
        ids: cryptoIds,
        vs_currencies: vsCurrency,
        include_24hr_change: true,
        include_last_updated_at: true
      },
      timeout: 10000
    });

    const pricesMap = {};
    uniqueSymbols.forEach(symbol => {
      const cryptoId = getCryptoId(symbol);
      const data = response.data[cryptoId];

      if (data) {
        const price = data[vsCurrency];
        const changePercent = data[`${vsCurrency}_24h_change`] || 0;
        const change = (price * changePercent) / 100;

        pricesMap[symbol.toUpperCase()] = {
          ticker: symbol.toUpperCase(),
          cryptoId: cryptoId,
          price: price,
          change: change,
          changePercent: changePercent,
          currency: vsCurrency.toUpperCase(),
          timestamp: new Date(data.last_updated_at * 1000).toISOString(),
          source: 'coingecko'
        };
      } else {
        pricesMap[symbol.toUpperCase()] = {
          ticker: symbol.toUpperCase(),
          error: 'Not found',
          price: null
        };
      }
    });

    return pricesMap;
  } catch (error) {
    console.error('Error fetching multiple crypto prices:', error);
    throw error;
  }
};

/**
 * Get crypto market data with more details
 * @param {string} symbol - Crypto symbol
 * @param {string} vsCurrency - Fiat currency
 * @returns {Promise<Object>} Extended market data
 */
export const fetchCryptoMarketData = async (symbol, vsCurrency = 'eur') => {
  try {
    const cryptoId = getCryptoId(symbol);
    const url = `${COINGECKO_API}/coins/${cryptoId}`;

    const response = await axios.get(url, {
      params: {
        localization: false,
        tickers: false,
        community_data: false,
        developer_data: false
      },
      timeout: 10000
    });

    const data = response.data;
    const marketData = data.market_data;
    const currentPrice = marketData.current_price[vsCurrency];

    return {
      ticker: symbol.toUpperCase(),
      cryptoId: cryptoId,
      name: data.name,
      price: currentPrice,
      change24h: marketData.price_change_24h_in_currency[vsCurrency],
      changePercent24h: marketData.price_change_percentage_24h,
      marketCap: marketData.market_cap[vsCurrency],
      volume24h: marketData.total_volume[vsCurrency],
      high24h: marketData.high_24h[vsCurrency],
      low24h: marketData.low_24h[vsCurrency],
      ath: marketData.ath[vsCurrency],
      athDate: marketData.ath_date[vsCurrency],
      currency: vsCurrency.toUpperCase(),
      timestamp: new Date().toISOString(),
      source: 'coingecko'
    };
  } catch (error) {
    console.error(`Error fetching market data for ${symbol}:`, error.message);
    throw error;
  }
};

/**
 * Check if a symbol is a known cryptocurrency
 * Handles both plain symbols (BTC) and ticker formats (BTC-EUR, BTC-USD)
 * @param {string} symbol - Symbol to check
 * @returns {boolean} True if it's a known crypto
 */
export const isCrypto = (symbol) => {
  if (!symbol) return false;

  // Extract base symbol (BTC from BTC-EUR, ETH from ETH-USD, etc.)
  const baseSymbol = symbol.split('-')[0].toUpperCase();
  return baseSymbol in CRYPTO_ID_MAP;
};
