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
 * Handles both plain symbols (BTC) and ticker formats (BTC-EUR, BTC-USD, BTCEUR)
 * @param {string} symbol - Symbol to check
 * @returns {boolean} True if it's a known crypto
 */
export const isCrypto = (symbol) => {
  if (!symbol) return false;

  // Extract base symbol from various formats
  // BTC-EUR -> BTC
  // BTCEUR -> BTC
  // ETH-USD -> ETH
  let baseSymbol = symbol.toUpperCase();

  if (baseSymbol.includes('-')) {
    baseSymbol = baseSymbol.split('-')[0];
  } else if (baseSymbol.endsWith('EUR') || baseSymbol.endsWith('USD')) {
    baseSymbol = baseSymbol.replace(/EUR$|USD$/, '');
  }

  return baseSymbol in CRYPTO_ID_MAP;
};

/**
 * Extract base crypto symbol from ticker
 * @param {string} ticker - Ticker like BTC-EUR, BTCEUR, ETH-USD
 * @returns {string} Base symbol like BTC, ETH
 */
export const extractCryptoSymbol = (ticker) => {
  if (!ticker) return null;

  let baseSymbol = ticker.toUpperCase();

  if (baseSymbol.includes('-')) {
    baseSymbol = baseSymbol.split('-')[0];
  } else if (baseSymbol.endsWith('EUR') || baseSymbol.endsWith('USD')) {
    baseSymbol = baseSymbol.replace(/EUR$|USD$/, '');
  }

  return baseSymbol;
};

/**
 * Fetch historical prices for a cryptocurrency from CoinGecko
 * Returns monthly prices (one price per month)
 * @param {string} symbol - Crypto symbol (e.g., 'BTC', 'ETH', 'BTC-EUR')
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {string} vsCurrency - Fiat currency (default: 'eur')
 * @returns {Promise<Array>} Array of {date, price} objects
 */
export const fetchCryptoHistoricalPrices = async (symbol, startDate, endDate, vsCurrency = 'eur') => {
  try {
    const baseSymbol = extractCryptoSymbol(symbol);
    const cryptoId = getCryptoId(baseSymbol);

    console.log(`📈 Fetching historical crypto prices for ${baseSymbol} (${cryptoId}) from ${startDate} to ${endDate}`);

    // CoinGecko market_chart/range endpoint
    // Convert dates to Unix timestamps
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    const url = `${COINGECKO_API}/coins/${cryptoId}/market_chart/range`;

    const response = await axios.get(url, {
      params: {
        vs_currency: vsCurrency,
        from: startTimestamp,
        to: endTimestamp
      },
      timeout: 15000
    });

    const prices = response.data.prices; // Array of [timestamp, price]

    if (!prices || prices.length === 0) {
      console.warn(`⚠️ No historical data from CoinGecko for ${symbol}`);
      return [];
    }

    // Group prices by month and take the last price of each month
    const monthlyPrices = {};

    prices.forEach(([timestamp, price]) => {
      const date = new Date(timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Keep the last price of each month
      monthlyPrices[monthKey] = {
        date: `${monthKey}-${String(date.getDate()).padStart(2, '0')}`,
        price: price
      };
    });

    // Convert to array sorted by date
    const result = Object.values(monthlyPrices).sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    console.log(`✅ Fetched ${result.length} monthly prices from CoinGecko for ${symbol}`);

    return result;

  } catch (error) {
    console.error(`Error fetching historical crypto prices for ${symbol}:`, error.message);
    return [];
  }
};

/**
 * Fetch historical prices for multiple cryptocurrencies
 * @param {string[]} symbols - Array of crypto symbols/tickers
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {string} vsCurrency - Fiat currency
 * @returns {Promise<Object>} Object mapping symbol to historical prices array
 */
export const fetchMultipleCryptoHistoricalPrices = async (symbols, startDate, endDate, vsCurrency = 'eur') => {
  try {
    console.log(`📊 Fetching historical prices for ${symbols.length} cryptocurrencies`);

    // CoinGecko has rate limits, so we need to be careful
    // Free tier: 10-30 calls/minute
    const results = {};

    for (const symbol of symbols) {
      try {
        const prices = await fetchCryptoHistoricalPrices(symbol, startDate, endDate, vsCurrency);
        results[symbol] = prices;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.warn(`Failed to fetch historical prices for ${symbol}:`, error.message);
        results[symbol] = [];
      }
    }

    console.log(`✅ Fetched historical prices for ${Object.keys(results).length} cryptocurrencies`);

    return results;

  } catch (error) {
    console.error('Error fetching multiple crypto historical prices:', error);
    return {};
  }
};
