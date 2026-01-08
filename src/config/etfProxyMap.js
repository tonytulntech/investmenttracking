/**
 * ETF Proxy Mapping for Extended Backtesting
 *
 * Maps ETFs to their underlying index proxies available on Yahoo Finance
 * for backtesting before the ETF's inception date.
 *
 * Structure:
 * - proxyTicker: Yahoo Finance ticker for the underlying index/proxy
 * - inception: ETF launch date (YYYY-MM-DD or YYYY)
 * - ter: Total Expense Ratio (annual %) to subtract from proxy returns
 * - description: Human-readable description
 */

export const ETF_PROXY_MAP = {
  // ==========================================
  // AZIONARIO GLOBALE / MSCI World / All-World
  // ==========================================
  'SWDA.MI': {
    proxyTicker: 'URTH',  // iShares MSCI World ETF (longer history than ACWI)
    inception: '2009-09-25',
    ter: 0.20,
    description: 'iShares Core MSCI World UCITS ETF'
  },
  'IWDA.AS': {
    proxyTicker: 'URTH',
    inception: '2009-09-25',
    ter: 0.20,
    description: 'iShares Core MSCI World UCITS ETF (Amsterdam)'
  },
  'VWCE.DE': {
    proxyTicker: 'VT',  // Vanguard Total World Stock ETF
    inception: '2019-07-23',
    ter: 0.22,
    description: 'Vanguard FTSE All-World UCITS ETF'
  },
  'VWRL.AS': {
    proxyTicker: 'VT',
    inception: '2012-05-22',
    ter: 0.22,
    description: 'Vanguard FTSE All-World UCITS ETF (Distributing)'
  },
  'ACWIA.MI': {
    proxyTicker: 'ACWI',  // iShares MSCI ACWI ETF
    inception: '2018-01-01',
    ter: 0.30,
    description: 'SPDR MSCI ACWI IMI UCITS ETF'
  },
  'IMIE.MI': {
    proxyTicker: 'ACWI',
    inception: '2011-01-01',
    ter: 0.40,
    description: 'iShares MSCI ACWI UCITS ETF'
  },

  // ==========================================
  // AZIONARIO USA / S&P 500
  // ==========================================
  'CSPX.L': {
    proxyTicker: '^GSPC',  // S&P 500 Index
    inception: '2010-05-19',
    ter: 0.07,
    description: 'iShares Core S&P 500 UCITS ETF'
  },
  'SXR8.DE': {
    proxyTicker: '^GSPC',
    inception: '2010-05-19',
    ter: 0.07,
    description: 'iShares Core S&P 500 UCITS ETF (Xetra)'
  },
  'A500.MI': {
    proxyTicker: '^GSPC',
    inception: '2020-01-01',
    ter: 0.15,
    description: 'Amundi S&P 500 UCITS ETF'
  },
  'SXRV.DE': {
    proxyTicker: '^GSPC',
    inception: '2019-01-01',
    ter: 0.20,
    description: 'iShares S&P 500 Swap UCITS ETF'
  },
  'VUAA.MI': {
    proxyTicker: '^GSPC',
    inception: '2019-02-13',
    ter: 0.07,
    description: 'Vanguard S&P 500 UCITS ETF'
  },
  'VUSA.L': {
    proxyTicker: '^GSPC',
    inception: '2012-05-22',
    ter: 0.07,
    description: 'Vanguard S&P 500 UCITS ETF (Distributing)'
  },

  // ==========================================
  // NASDAQ 100
  // ==========================================
  'EQQQ.DE': {
    proxyTicker: '^IXIC',  // NASDAQ Composite (proxy for NASDAQ 100)
    inception: '2010-01-01',
    ter: 0.30,
    description: 'Invesco EQQQ NASDAQ-100 UCITS ETF'
  },
  'CNDX.L': {
    proxyTicker: '^IXIC',
    inception: '2010-07-01',
    ter: 0.33,
    description: 'iShares NASDAQ 100 UCITS ETF'
  },

  // ==========================================
  // SMALL CAP / VALUE / MOMENTUM / QUALITY
  // ==========================================
  'ZPRV.DE': {
    proxyTicker: '^RUT',  // Russell 2000 Index
    inception: '2020-01-01',
    ter: 0.30,
    description: 'SPDR MSCI USA Small Cap Value Weighted UCITS ETF'
  },
  'ZPRX.DE': {
    proxyTicker: '^STOXX',  // STOXX Europe 600
    inception: '2020-01-01',
    ter: 0.30,
    description: 'SPDR MSCI Europe Small Cap Value Weighted UCITS ETF'
  },
  'XDEM.DE': {
    proxyTicker: 'MTUM',  // iShares MSCI USA Momentum Factor ETF
    inception: '2019-01-01',
    ter: 0.25,
    description: 'Xtrackers MSCI World Momentum UCITS ETF'
  },
  'XDEQ.DE': {
    proxyTicker: 'QUAL',  // iShares MSCI USA Quality Factor ETF
    inception: '2019-01-01',
    ter: 0.25,
    description: 'Xtrackers MSCI World Quality UCITS ETF'
  },
  'IUSN.DE': {
    proxyTicker: '^RUT',
    inception: '2018-03-01',
    ter: 0.35,
    description: 'iShares MSCI World Small Cap UCITS ETF'
  },

  // ==========================================
  // EMERGING MARKETS
  // ==========================================
  'EIMI.L': {
    proxyTicker: 'EEM',  // iShares MSCI Emerging Markets ETF
    inception: '2014-10-01',
    ter: 0.18,
    description: 'iShares Core MSCI EM IMI UCITS ETF'
  },
  'EMIM.AS': {
    proxyTicker: 'EEM',
    inception: '2014-05-30',
    ter: 0.18,
    description: 'iShares Core MSCI EM IMI UCITS ETF (Amsterdam)'
  },
  'VFEM.L': {
    proxyTicker: 'VWO',  // Vanguard FTSE Emerging Markets ETF
    inception: '2012-05-22',
    ter: 0.22,
    description: 'Vanguard FTSE Emerging Markets UCITS ETF'
  },
  'EMXC.BE': {
    proxyTicker: 'EEM',
    inception: '2018-01-01',
    ter: 0.25,
    description: 'iShares MSCI EM ex-China UCITS ETF'
  },

  // ==========================================
  // CHINA
  // ==========================================
  'LCCN.MI': {
    proxyTicker: 'MCHI',  // iShares MSCI China ETF
    inception: '2011-01-01',
    ter: 0.60,
    description: 'UBS ETF MSCI China UCITS ETF'
  },
  'ICHN.L': {
    proxyTicker: 'MCHI',
    inception: '2019-01-01',
    ter: 0.40,
    description: 'iShares MSCI China UCITS ETF'
  },

  // ==========================================
  // EUROPA
  // ==========================================
  'SMEA.MI': {
    proxyTicker: 'VGK',  // Vanguard FTSE Europe ETF
    inception: '2010-01-01',
    ter: 0.20,
    description: 'iShares Core MSCI Europe UCITS ETF'
  },
  'VEUR.L': {
    proxyTicker: 'VGK',
    inception: '2013-05-21',
    ter: 0.12,
    description: 'Vanguard FTSE Developed Europe UCITS ETF'
  },
  'MEUD.PA': {
    proxyTicker: '^STOXX50E',  // Euro Stoxx 50
    inception: '2008-01-01',
    ter: 0.20,
    description: 'Amundi MSCI Europe UCITS ETF'
  },

  // ==========================================
  // ORO FISICO
  // ==========================================
  'PHAU.MI': {
    proxyTicker: 'GC=F',  // Gold Futures
    inception: '2010-01-01',
    ter: 0.40,
    description: 'WisdomTree Physical Gold'
  },
  'SGLD.L': {
    proxyTicker: 'GC=F',
    inception: '2009-03-01',
    ter: 0.12,
    description: 'Invesco Physical Gold ETC'
  },
  'EGLN.L': {
    proxyTicker: 'GC=F',
    inception: '2019-01-01',
    ter: 0.17,
    description: 'iShares Physical Gold ETC'
  },
  '4GLD.DE': {
    proxyTicker: 'GC=F',
    inception: '2007-03-01',
    ter: 0.00,  // Xetra-Gold è backed 1:1
    description: 'Xetra-Gold'
  },

  // ==========================================
  // ARGENTO FISICO
  // ==========================================
  'PHAG.MI': {
    proxyTicker: 'SI=F',  // Silver Futures
    inception: '2010-01-01',
    ter: 0.49,
    description: 'WisdomTree Physical Silver'
  },
  'SSLN.L': {
    proxyTicker: 'SI=F',
    inception: '2009-04-01',
    ter: 0.20,
    description: 'Invesco Physical Silver ETC'
  },

  // ==========================================
  // COMMODITY DIVERSIFICATE
  // ==========================================
  'CMOD.MI': {
    proxyTicker: 'DBC',  // Invesco DB Commodity Index Tracking Fund
    inception: '2010-01-01',
    ter: 0.85,
    description: 'UBS ETF Bloomberg Commodity UCITS ETF'
  },
  'LYTR.MI': {
    proxyTicker: 'DBC',
    inception: '2007-01-01',
    ter: 0.35,
    description: 'Lyxor Commodities Refinitiv UCITS ETF'
  },

  // ==========================================
  // OBBLIGAZIONARIO AGGREGATE / CORPORATE
  // ==========================================
  'VECA.MI': {
    proxyTicker: 'AGG',  // iShares Core U.S. Aggregate Bond ETF
    inception: '2018-01-01',
    ter: 0.15,
    description: 'Vanguard EUR Corporate Bond UCITS ETF'
  },
  'VAGF.MI': {
    proxyTicker: 'BND',  // Vanguard Total Bond Market ETF
    inception: '2016-01-01',
    ter: 0.10,
    description: 'Vanguard Global Aggregate Bond UCITS ETF'
  },
  'AGGH.L': {
    proxyTicker: 'AGG',
    inception: '2017-11-01',
    ter: 0.10,
    description: 'iShares Core Global Aggregate Bond UCITS ETF'
  },
  'IEAG.L': {
    proxyTicker: 'AGG',
    inception: '2009-03-01',
    ter: 0.25,
    description: 'iShares Core EUR Corporate Bond UCITS ETF'
  },

  // ==========================================
  // OBBLIGAZIONARIO GOVERNATIVO
  // ==========================================
  'SEGA.DE': {
    proxyTicker: '^TNX',  // 10-Year Treasury Yield (proxy)
    inception: '2019-01-01',
    ter: 0.07,
    description: 'iShares EUR Government Bond UCITS ETF'
  },
  'IBGS.L': {
    proxyTicker: '^FVX',  // 5-Year Treasury Yield
    inception: '2006-06-01',
    ter: 0.20,
    description: 'iShares EUR Government Bond 1-3yr UCITS ETF'
  },
  'CSBGU7.MI': {
    proxyTicker: '^TNX',
    inception: '2015-01-01',
    ter: 0.20,
    description: 'iShares EUR Govt Bond 7-10yr UCITS ETF'
  },

  // ==========================================
  // OBBLIGAZIONARIO INFLATION-LINKED
  // ==========================================
  'IBCI.L': {
    proxyTicker: 'TIP',  // iShares TIPS Bond ETF
    inception: '2006-11-01',
    ter: 0.25,
    description: 'iShares EUR Inflation Linked Govt Bond UCITS ETF'
  },
  'LYQ7.DE': {
    proxyTicker: 'TIP',
    inception: '2015-01-01',
    ter: 0.20,
    description: 'Lyxor EUR Inflation Expectations UCITS ETF'
  },

  // ==========================================
  // OBBLIGAZIONARIO HIGH YIELD
  // ==========================================
  'IHYG.L': {
    proxyTicker: 'HYG',  // iShares iBoxx $ High Yield Corporate Bond ETF
    inception: '2010-09-01',
    ter: 0.50,
    description: 'iShares EUR High Yield Corporate Bond UCITS ETF'
  },

  // ==========================================
  // CRYPTOCURRENCY (dati reali lunghi su Yahoo)
  // ==========================================
  'BTC-EUR': {
    proxyTicker: 'BTC-USD',  // Bitcoin in USD, longer history
    inception: '2014-09-17',
    ter: 0,
    description: 'Bitcoin'
  },
  'BTC-USD': {
    proxyTicker: 'BTC-USD',
    inception: '2014-09-17',
    ter: 0,
    description: 'Bitcoin USD'
  },
  'ETH-EUR': {
    proxyTicker: 'ETH-USD',
    inception: '2016-01-01',
    ter: 0,
    description: 'Ethereum'
  },
  'ETH-USD': {
    proxyTicker: 'ETH-USD',
    inception: '2016-01-01',
    ter: 0,
    description: 'Ethereum USD'
  },
  'SOL-EUR': {
    proxyTicker: 'SOL-USD',
    inception: '2020-04-01',
    ter: 0,
    description: 'Solana'
  },
  'BNB-EUR': {
    proxyTicker: 'BNB-USD',
    inception: '2017-07-01',
    ter: 0,
    description: 'Binance Coin'
  },
  'ADA-EUR': {
    proxyTicker: 'ADA-USD',
    inception: '2017-10-01',
    ter: 0,
    description: 'Cardano'
  },
  'XRP-EUR': {
    proxyTicker: 'XRP-USD',
    inception: '2015-01-01',
    ter: 0,
    description: 'Ripple'
  },
  'DOGE-EUR': {
    proxyTicker: 'DOGE-USD',
    inception: '2017-12-01',
    ter: 0,
    description: 'Dogecoin'
  },

  // ==========================================
  // REIT / IMMOBILIARE
  // ==========================================
  'IPRP.L': {
    proxyTicker: 'VNQ',  // Vanguard Real Estate ETF
    inception: '2006-10-01',
    ter: 0.40,
    description: 'iShares European Property Yield UCITS ETF'
  },
  'EPRA.MI': {
    proxyTicker: 'VNQ',
    inception: '2008-01-01',
    ter: 0.40,
    description: 'iShares Developed Markets Property Yield UCITS ETF'
  },

  // ==========================================
  // SETTORIALI
  // ==========================================
  'IUIT.L': {
    proxyTicker: 'XLK',  // Technology Select Sector SPDR Fund
    inception: '2015-09-01',
    ter: 0.15,
    description: 'iShares S&P 500 Information Technology Sector UCITS ETF'
  },
  'HEAL.L': {
    proxyTicker: 'XLV',  // Health Care Select Sector SPDR Fund
    inception: '2016-11-01',
    ter: 0.15,
    description: 'iShares S&P 500 Health Care Sector UCITS ETF'
  },
  'IUFS.L': {
    proxyTicker: 'XLF',  // Financial Select Sector SPDR Fund
    inception: '2016-11-01',
    ter: 0.15,
    description: 'iShares S&P 500 Financials Sector UCITS ETF'
  },
  'INRG.L': {
    proxyTicker: 'ICLN',  // iShares Global Clean Energy ETF
    inception: '2007-07-01',
    ter: 0.65,
    description: 'iShares Global Clean Energy UCITS ETF'
  }
};

/**
 * Get proxy info for a ticker
 * @param {string} ticker - The ETF ticker
 * @returns {Object|null} Proxy info or null if not found
 */
export function getProxyInfo(ticker) {
  return ETF_PROXY_MAP[ticker] || ETF_PROXY_MAP[ticker.toUpperCase()] || null;
}

/**
 * Check if a ticker has proxy data available
 * @param {string} ticker - The ETF ticker
 * @returns {boolean}
 */
export function hasProxy(ticker) {
  return !!getProxyInfo(ticker);
}

/**
 * Get all tickers that have proxy mappings
 * @returns {string[]}
 */
export function getAvailableProxyTickers() {
  return Object.keys(ETF_PROXY_MAP);
}

/**
 * Adjust returns for TER (Total Expense Ratio)
 * @param {number} annualReturn - Annual return percentage
 * @param {number} ter - TER percentage
 * @returns {number} Adjusted return
 */
export function adjustReturnForTER(annualReturn, ter) {
  // Simple subtraction for approximation
  return annualReturn - ter;
}

/**
 * Adjust price series for TER
 * Reduces each price point by accumulated TER over time
 * @param {Array} prices - Array of {date, close} objects
 * @param {number} ter - Annual TER percentage
 * @returns {Array} Adjusted price array
 */
export function adjustPricesForTER(prices, ter) {
  if (!prices || prices.length === 0 || ter === 0) return prices;

  const dailyTER = ter / 365 / 100; // Convert annual % to daily decimal

  return prices.map((price, index) => {
    // Compound TER reduction
    const accumulatedTER = Math.pow(1 - dailyTER, index);
    return {
      ...price,
      close: price.close * accumulatedTER,
      adjustedForTER: true
    };
  });
}

export default {
  ETF_PROXY_MAP,
  getProxyInfo,
  hasProxy,
  getAvailableProxyTickers,
  adjustReturnForTER,
  adjustPricesForTER
};
