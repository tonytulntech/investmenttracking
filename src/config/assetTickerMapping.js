/**
 * Central Asset Ticker Mapping Database
 *
 * Maps specific ticker symbols (with exchange suffix) to MICRO categories.
 * This is the SINGLE SOURCE OF TRUTH for:
 * - Transactions auto-fill
 * - Strategy ticker associations
 * - Rebalancing calculations
 * - Performance grouping
 * - Backtest analysis
 *
 * IMPORTANT: This mapping is used for NEW transactions only.
 * Existing transactions are NOT modified retroactively.
 */

export const ASSET_TICKER_MAPPING = {
  // ============================================
  // AZIONARIO MONDIALE
  // ============================================
  'SWDA.MI': {
    micro: 'Azionario Mondiale',
    macro: 'ETF',
    name: 'iShares Core MSCI World UCITS ETF',
    expectedReturn: 7.0,
    volatility: 16,
    isin: 'IE00B4L5Y983'
  },
  'SWDA.L': {
    micro: 'Azionario Mondiale',
    macro: 'ETF',
    name: 'iShares Core MSCI World UCITS ETF',
    expectedReturn: 7.0,
    volatility: 16,
    isin: 'IE00B4L5Y983'
  },
  'IWDA.AS': {
    micro: 'Azionario Mondiale',
    macro: 'ETF',
    name: 'iShares Core MSCI World UCITS ETF',
    expectedReturn: 7.0,
    volatility: 16,
    isin: 'IE00B4L5Y983'
  },
  'VWCE.DE': {
    micro: 'Azionario Mondiale',
    macro: 'ETF',
    name: 'Vanguard FTSE All-World UCITS ETF Acc',
    expectedReturn: 7.0,
    volatility: 16,
    isin: 'IE00BK5BQT80'
  },
  'VWCE.MI': {
    micro: 'Azionario Mondiale',
    macro: 'ETF',
    name: 'Vanguard FTSE All-World UCITS ETF Acc',
    expectedReturn: 7.0,
    volatility: 16,
    isin: 'IE00BK5BQT80'
  },
  'VWRL.AS': {
    micro: 'Azionario Mondiale',
    macro: 'ETF',
    name: 'Vanguard FTSE All-World UCITS ETF Dist',
    expectedReturn: 7.0,
    volatility: 16,
    isin: 'IE00B3RBWM25'
  },
  'URTH': {
    micro: 'Azionario Mondiale',
    macro: 'ETF',
    name: 'iShares MSCI World ETF',
    expectedReturn: 7.0,
    volatility: 16,
    isin: 'US46434V6478'
  },
  'VT': {
    micro: 'Azionario Mondiale',
    macro: 'ETF',
    name: 'Vanguard Total World Stock ETF',
    expectedReturn: 7.0,
    volatility: 16,
    isin: 'US9220427424'
  },
  'ACWI': {
    micro: 'Azionario Mondiale',
    macro: 'ETF',
    name: 'iShares MSCI ACWI ETF',
    expectedReturn: 7.0,
    volatility: 16,
    isin: 'US4642882819'
  },

  // ============================================
  // AZIONARIO USA
  // ============================================
  'CSPX.MI': {
    micro: 'Azionario USA',
    macro: 'ETF',
    name: 'iShares Core S&P 500 UCITS ETF',
    expectedReturn: 7.5,
    volatility: 17,
    isin: 'IE00B5BMR087'
  },
  'CSPX.L': {
    micro: 'Azionario USA',
    macro: 'ETF',
    name: 'iShares Core S&P 500 UCITS ETF',
    expectedReturn: 7.5,
    volatility: 17,
    isin: 'IE00B5BMR087'
  },
  'VUSA.MI': {
    micro: 'Azionario USA',
    macro: 'ETF',
    name: 'Vanguard S&P 500 UCITS ETF',
    expectedReturn: 7.5,
    volatility: 17,
    isin: 'IE00B3XXRP09'
  },
  'VUAA.DE': {
    micro: 'Azionario USA',
    macro: 'ETF',
    name: 'Vanguard S&P 500 UCITS ETF Acc',
    expectedReturn: 7.5,
    volatility: 17,
    isin: 'IE00BFMXXD54'
  },
  'SPY': {
    micro: 'Azionario USA',
    macro: 'ETF',
    name: 'SPDR S&P 500 ETF Trust',
    expectedReturn: 7.5,
    volatility: 17,
    isin: 'US78462F1030'
  },
  'VOO': {
    micro: 'Azionario USA',
    macro: 'ETF',
    name: 'Vanguard S&P 500 ETF',
    expectedReturn: 7.5,
    volatility: 17,
    isin: 'US9229083632'
  },
  'IVV': {
    micro: 'Azionario USA',
    macro: 'ETF',
    name: 'iShares Core S&P 500 ETF',
    expectedReturn: 7.5,
    volatility: 17,
    isin: 'US4642872000'
  },
  'VTI': {
    micro: 'Azionario USA',
    macro: 'ETF',
    name: 'Vanguard Total Stock Market ETF',
    expectedReturn: 7.5,
    volatility: 17,
    isin: 'US9229087690'
  },
  'QQQ': {
    micro: 'Technology USA',
    macro: 'ETF',
    name: 'Invesco QQQ Trust (NASDAQ-100)',
    expectedReturn: 10.0,
    volatility: 22,
    isin: 'US46090E1038'
  },
  'EQQQ.DE': {
    micro: 'Technology USA',
    macro: 'ETF',
    name: 'Invesco EQQQ NASDAQ-100 UCITS ETF',
    expectedReturn: 10.0,
    volatility: 22,
    isin: 'IE0032077012'
  },

  // ============================================
  // AZIONARIO EUROPA
  // ============================================
  'VEUR.AS': {
    micro: 'Azionario Europa',
    macro: 'ETF',
    name: 'Vanguard FTSE Developed Europe UCITS ETF',
    expectedReturn: 6.0,
    volatility: 18,
    isin: 'IE00B945VV12'
  },
  'IMEU.MI': {
    micro: 'Azionario Europa',
    macro: 'ETF',
    name: 'iShares Core MSCI Europe UCITS ETF',
    expectedReturn: 6.0,
    volatility: 18,
    isin: 'IE00B4K48X80'
  },
  'MEUD.PA': {
    micro: 'Azionario Europa',
    macro: 'ETF',
    name: 'Amundi MSCI Europe UCITS ETF',
    expectedReturn: 6.0,
    volatility: 18,
    isin: 'LU1681042609'
  },

  // ============================================
  // AZIONARIO EMERGENTI
  // ============================================
  'EIMI.MI': {
    micro: 'Azionario Emergenti',
    macro: 'ETF',
    name: 'iShares Core MSCI EM IMI UCITS ETF',
    expectedReturn: 8.0,
    volatility: 24,
    isin: 'IE00BKM4GZ66'
  },
  'VFEM.AS': {
    micro: 'Azionario Emergenti',
    macro: 'ETF',
    name: 'Vanguard FTSE Emerging Markets UCITS ETF',
    expectedReturn: 8.0,
    volatility: 24,
    isin: 'IE00B3VVMM84'
  },
  'EEM': {
    micro: 'Azionario Emergenti',
    macro: 'ETF',
    name: 'iShares MSCI Emerging Markets ETF',
    expectedReturn: 8.0,
    volatility: 24,
    isin: 'US4642872349'
  },
  'VWO': {
    micro: 'Azionario Emergenti',
    macro: 'ETF',
    name: 'Vanguard FTSE Emerging Markets ETF',
    expectedReturn: 8.0,
    volatility: 24,
    isin: 'US9220428588'
  },
  'EMXC.BE': {
    micro: 'Azionario Emergenti ex-China',
    macro: 'ETF',
    name: 'iShares MSCI EM ex-China UCITS ETF',
    expectedReturn: 8.5,
    volatility: 24,
    isin: 'IE00BMG6Z448'
  },
  'EMXC': {
    micro: 'Azionario Emergenti ex-China',
    macro: 'ETF',
    name: 'iShares MSCI Emerging Markets ex China ETF',
    expectedReturn: 8.5,
    volatility: 24,
    isin: 'US46434G8226'
  },

  // ============================================
  // AZIONARIO CHINA
  // ============================================
  'LCCN.MI': {
    micro: 'Azionario China',
    macro: 'ETF',
    name: 'Amundi MSCI China UCITS ETF',
    expectedReturn: 7.0,
    volatility: 28,
    isin: 'LU1841731745'
  },
  'MCHI': {
    micro: 'Azionario China',
    macro: 'ETF',
    name: 'iShares MSCI China ETF',
    expectedReturn: 7.0,
    volatility: 28,
    isin: 'US46429B6719'
  },
  'FXI': {
    micro: 'Azionario China',
    macro: 'ETF',
    name: 'iShares China Large-Cap ETF',
    expectedReturn: 7.0,
    volatility: 28,
    isin: 'US4642871846'
  },
  'CNYA': {
    micro: 'Azionario China A-Shares',
    macro: 'ETF',
    name: 'iShares MSCI China A UCITS ETF',
    expectedReturn: 7.5,
    volatility: 30,
    isin: 'IE00BQT3WG13'
  },

  // ============================================
  // SMALL CAP VALUE (Factor Investing)
  // ============================================
  'ZPRV.DE': {
    micro: 'Small Cap Value USA',
    macro: 'ETF',
    name: 'SPDR MSCI USA Small Cap Value Weighted UCITS ETF',
    expectedReturn: 9.0,
    volatility: 23,
    isin: 'IE00BSPLC298'
  },
  'ZPRV.MI': {
    micro: 'Small Cap Value USA',
    macro: 'ETF',
    name: 'SPDR MSCI USA Small Cap Value Weighted UCITS ETF',
    expectedReturn: 9.0,
    volatility: 23,
    isin: 'IE00BSPLC298'
  },
  'AVUV': {
    micro: 'Small Cap Value USA',
    macro: 'ETF',
    name: 'Avantis U.S. Small Cap Value ETF',
    expectedReturn: 9.0,
    volatility: 23,
    isin: 'US0250726504'
  },
  'IJS': {
    micro: 'Small Cap Value USA',
    macro: 'ETF',
    name: 'iShares S&P Small-Cap 600 Value ETF',
    expectedReturn: 9.0,
    volatility: 23,
    isin: 'US4642876555'
  },
  'VIOV': {
    micro: 'Small Cap Value USA',
    macro: 'ETF',
    name: 'Vanguard S&P Small-Cap 600 Value ETF',
    expectedReturn: 9.0,
    volatility: 23,
    isin: 'US92206C8139'
  },
  'ZPRX.DE': {
    micro: 'Small Cap Value Europa',
    macro: 'ETF',
    name: 'SPDR MSCI Europe Small Cap Value Weighted UCITS ETF',
    expectedReturn: 8.5,
    volatility: 24,
    isin: 'IE00BSPLC413'
  },
  'ZPRX.MI': {
    micro: 'Small Cap Value Europa',
    macro: 'ETF',
    name: 'SPDR MSCI Europe Small Cap Value Weighted UCITS ETF',
    expectedReturn: 8.5,
    volatility: 24,
    isin: 'IE00BSPLC413'
  },

  // ============================================
  // MOMENTUM (Factor Investing)
  // ============================================
  'XDEM.DE': {
    micro: 'Momentum Mondiale',
    macro: 'ETF',
    name: 'Xtrackers MSCI World Momentum Factor UCITS ETF',
    expectedReturn: 8.0,
    volatility: 18,
    isin: 'IE00BL25JP72'
  },
  'XDEM.MI': {
    micro: 'Momentum Mondiale',
    macro: 'ETF',
    name: 'Xtrackers MSCI World Momentum Factor UCITS ETF',
    expectedReturn: 8.0,
    volatility: 18,
    isin: 'IE00BL25JP72'
  },
  'IWMO.L': {
    micro: 'Momentum Mondiale',
    macro: 'ETF',
    name: 'iShares Edge MSCI World Momentum Factor UCITS ETF',
    expectedReturn: 8.0,
    volatility: 18,
    isin: 'IE00BP3QZ825'
  },
  'MTUM': {
    micro: 'Momentum USA',
    macro: 'ETF',
    name: 'iShares MSCI USA Momentum Factor ETF',
    expectedReturn: 8.5,
    volatility: 18,
    isin: 'US46432F3863'
  },

  // ============================================
  // QUALITY (Factor Investing)
  // ============================================
  'XDEQ.DE': {
    micro: 'Quality Mondiale',
    macro: 'ETF',
    name: 'Xtrackers MSCI World Quality Factor UCITS ETF',
    expectedReturn: 7.5,
    volatility: 15,
    isin: 'IE00BL25JL35'
  },
  'XDEQ.MI': {
    micro: 'Quality Mondiale',
    macro: 'ETF',
    name: 'Xtrackers MSCI World Quality Factor UCITS ETF',
    expectedReturn: 7.5,
    volatility: 15,
    isin: 'IE00BL25JL35'
  },
  'IWQU.L': {
    micro: 'Quality Mondiale',
    macro: 'ETF',
    name: 'iShares Edge MSCI World Quality Factor UCITS ETF',
    expectedReturn: 7.5,
    volatility: 15,
    isin: 'IE00BP3QZ601'
  },
  'QUAL': {
    micro: 'Quality USA',
    macro: 'ETF',
    name: 'iShares MSCI USA Quality Factor ETF',
    expectedReturn: 8.0,
    volatility: 15,
    isin: 'US46432F6339'
  },

  // ============================================
  // VALUE (Factor Investing)
  // ============================================
  'XDEV.DE': {
    micro: 'Value Mondiale',
    macro: 'ETF',
    name: 'Xtrackers MSCI World Value Factor UCITS ETF',
    expectedReturn: 7.5,
    volatility: 18,
    isin: 'IE00BL25JM42'
  },
  'IWVL.L': {
    micro: 'Value Mondiale',
    macro: 'ETF',
    name: 'iShares Edge MSCI World Value Factor UCITS ETF',
    expectedReturn: 7.5,
    volatility: 18,
    isin: 'IE00BP3QZB59'
  },
  'VTV': {
    micro: 'Value USA',
    macro: 'ETF',
    name: 'Vanguard Value ETF',
    expectedReturn: 7.5,
    volatility: 18,
    isin: 'US9229087286'
  },

  // ============================================
  // LOW VOLATILITY (Factor Investing)
  // ============================================
  'XDEB.DE': {
    micro: 'Low Volatility Mondiale',
    macro: 'ETF',
    name: 'Xtrackers MSCI World Minimum Volatility UCITS ETF',
    expectedReturn: 5.5,
    volatility: 12,
    isin: 'IE00BL25JN58'
  },
  'USMV': {
    micro: 'Low Volatility USA',
    macro: 'ETF',
    name: 'iShares MSCI USA Min Vol Factor ETF',
    expectedReturn: 5.5,
    volatility: 11,
    isin: 'US46429B6974'
  },
  'SPLV': {
    micro: 'Low Volatility USA',
    macro: 'ETF',
    name: 'Invesco S&P 500 Low Volatility ETF',
    expectedReturn: 5.5,
    volatility: 11,
    isin: 'US46138E1064'
  },

  // ============================================
  // ORO / COMMODITY (ETC)
  // ============================================
  'PHAU.MI': {
    micro: 'Oro Fisico',
    macro: 'ETC',
    name: 'WisdomTree Physical Gold',
    expectedReturn: 4.0,
    volatility: 15,
    isin: 'JE00B1VS3770'
  },
  'PHAU.L': {
    micro: 'Oro Fisico',
    macro: 'ETC',
    name: 'WisdomTree Physical Gold',
    expectedReturn: 4.0,
    volatility: 15,
    isin: 'JE00B1VS3770'
  },
  'PPFB.SG': {
    micro: 'Oro Fisico',
    macro: 'ETC',
    name: 'WisdomTree Physical Gold EUR Hedged',
    expectedReturn: 4.0,
    volatility: 15,
    isin: 'DE000A1MECS1'
  },
  'SGLD.MI': {
    micro: 'Oro Fisico',
    macro: 'ETC',
    name: 'Invesco Physical Gold ETC',
    expectedReturn: 4.0,
    volatility: 15,
    isin: 'IE00B579F325'
  },
  'GLD': {
    micro: 'Oro Fisico',
    macro: 'ETC',
    name: 'SPDR Gold Shares',
    expectedReturn: 4.0,
    volatility: 15,
    isin: 'US78463V1070'
  },
  'IAU': {
    micro: 'Oro Fisico',
    macro: 'ETC',
    name: 'iShares Gold Trust',
    expectedReturn: 4.0,
    volatility: 15,
    isin: 'US4642851053'
  },
  'PHAG.MI': {
    micro: 'Argento Fisico',
    macro: 'ETC',
    name: 'WisdomTree Physical Silver',
    expectedReturn: 3.5,
    volatility: 22,
    isin: 'JE00B1VS3333'
  },
  'SLV': {
    micro: 'Argento Fisico',
    macro: 'ETC',
    name: 'iShares Silver Trust',
    expectedReturn: 3.5,
    volatility: 22,
    isin: 'US46428Q1094'
  },
  'CMOD.MI': {
    micro: 'Materie Prime Diversificate',
    macro: 'ETC',
    name: 'Lyxor Commodities Refinitiv/CoreCommodity CRB TR UCITS ETF',
    expectedReturn: 3.0,
    volatility: 15,
    isin: 'LU1829218749'
  },
  'DBC': {
    micro: 'Materie Prime Diversificate',
    macro: 'ETC',
    name: 'Invesco DB Commodity Index Tracking Fund',
    expectedReturn: 3.0,
    volatility: 15,
    isin: 'US46140H1023'
  },

  // ============================================
  // OBBLIGAZIONARIO
  // ============================================
  'VECA.MI': {
    micro: 'Corporate Investment Grade Europa',
    macro: 'ETF',
    name: 'Vanguard EUR Corporate Bond UCITS ETF',
    expectedReturn: 2.0,
    volatility: 5,
    isin: 'IE00BZ163G84'
  },
  'IEAC.L': {
    micro: 'Corporate Investment Grade Europa',
    macro: 'ETF',
    name: 'iShares Core EUR Corporate Bond UCITS ETF',
    expectedReturn: 2.0,
    volatility: 5,
    isin: 'IE00B3F81R35'
  },
  'LQD': {
    micro: 'Corporate Investment Grade USA',
    macro: 'ETF',
    name: 'iShares iBoxx $ Investment Grade Corporate Bond ETF',
    expectedReturn: 3.0,
    volatility: 7,
    isin: 'US4642872265'
  },
  'VCIT': {
    micro: 'Corporate Investment Grade USA',
    macro: 'ETF',
    name: 'Vanguard Intermediate-Term Corporate Bond ETF',
    expectedReturn: 3.0,
    volatility: 7,
    isin: 'US92206C1036'
  },
  'LYQ7.DE': {
    micro: 'Inflation-Linked Europa',
    macro: 'ETF',
    name: 'Lyxor EUR 2-10Y Inflation Expectations UCITS ETF',
    expectedReturn: 1.5,
    volatility: 5,
    isin: 'LU1390062245'
  },
  'TIP': {
    micro: 'Inflation-Linked USA (TIPS)',
    macro: 'ETF',
    name: 'iShares TIPS Bond ETF',
    expectedReturn: 2.0,
    volatility: 6,
    isin: 'US4642874659'
  },
  'CSBGU7.MI': {
    micro: 'Treasury USA Medio',
    macro: 'ETF',
    name: 'iShares $ Treasury Bond 7-10yr UCITS ETF',
    expectedReturn: 2.5,
    volatility: 7,
    isin: 'IE00B1FZS798'
  },
  'IEF': {
    micro: 'Treasury USA Medio',
    macro: 'ETF',
    name: 'iShares 7-10 Year Treasury Bond ETF',
    expectedReturn: 2.5,
    volatility: 7,
    isin: 'US4642874576'
  },
  'TLT': {
    micro: 'Treasury USA Lungo',
    macro: 'ETF',
    name: 'iShares 20+ Year Treasury Bond ETF',
    expectedReturn: 3.0,
    volatility: 15,
    isin: 'US4642874329'
  },
  'VGLT': {
    micro: 'Treasury USA Lungo',
    macro: 'ETF',
    name: 'Vanguard Long-Term Treasury ETF',
    expectedReturn: 3.0,
    volatility: 15,
    isin: 'US9219464065'
  },
  'AGG': {
    micro: 'Obbligazioni Aggregate USA',
    macro: 'ETF',
    name: 'iShares Core U.S. Aggregate Bond ETF',
    expectedReturn: 2.5,
    volatility: 5,
    isin: 'US4642872422'
  },
  'BND': {
    micro: 'Obbligazioni Aggregate USA',
    macro: 'ETF',
    name: 'Vanguard Total Bond Market ETF',
    expectedReturn: 2.5,
    volatility: 5,
    isin: 'US9219378356'
  },
  'EMB': {
    micro: 'Obbligazioni Emergenti',
    macro: 'ETF',
    name: 'iShares J.P. Morgan USD Emerging Markets Bond ETF',
    expectedReturn: 4.5,
    volatility: 12,
    isin: 'US4642882579'
  },
  'VWOB': {
    micro: 'Obbligazioni Emergenti',
    macro: 'ETF',
    name: 'Vanguard Emerging Markets Government Bond ETF',
    expectedReturn: 4.5,
    volatility: 12,
    isin: 'US9219467928'
  },
  'HYG': {
    micro: 'Corporate High Yield USA',
    macro: 'ETF',
    name: 'iShares iBoxx $ High Yield Corporate Bond ETF',
    expectedReturn: 5.0,
    volatility: 12,
    isin: 'US4642885135'
  },
  'JNK': {
    micro: 'Corporate High Yield USA',
    macro: 'ETF',
    name: 'SPDR Bloomberg High Yield Bond ETF',
    expectedReturn: 5.0,
    volatility: 12,
    isin: 'US78464A6982'
  },

  // ============================================
  // IMMOBILIARE (REITs)
  // ============================================
  'VNQ': {
    micro: 'REITs USA Diversificati',
    macro: 'ETF',
    name: 'Vanguard Real Estate ETF',
    expectedReturn: 7.0,
    volatility: 20,
    isin: 'US9229085538'
  },
  'IYR': {
    micro: 'REITs USA Diversificati',
    macro: 'ETF',
    name: 'iShares U.S. Real Estate ETF',
    expectedReturn: 7.0,
    volatility: 20,
    isin: 'US4642877397'
  },
  'VNQI': {
    micro: 'REITs Globali',
    macro: 'ETF',
    name: 'Vanguard Global ex-U.S. Real Estate ETF',
    expectedReturn: 6.5,
    volatility: 18,
    isin: 'US9220427788'
  },
  'REET': {
    micro: 'REITs Globali',
    macro: 'ETF',
    name: 'iShares Global REIT ETF',
    expectedReturn: 6.5,
    volatility: 18,
    isin: 'US46434V7617'
  },

  // ============================================
  // CRYPTO
  // ============================================
  'BTC-EUR': {
    micro: 'Bitcoin',
    macro: 'Crypto',
    name: 'Bitcoin',
    expectedReturn: 25.0,
    volatility: 65,
    isin: null
  },
  'BTC-USD': {
    micro: 'Bitcoin',
    macro: 'Crypto',
    name: 'Bitcoin',
    expectedReturn: 25.0,
    volatility: 65,
    isin: null
  },
  'BTCEUR': {
    micro: 'Bitcoin',
    macro: 'Crypto',
    name: 'Bitcoin',
    expectedReturn: 25.0,
    volatility: 65,
    isin: null
  },
  'BTCUSD': {
    micro: 'Bitcoin',
    macro: 'Crypto',
    name: 'Bitcoin',
    expectedReturn: 25.0,
    volatility: 65,
    isin: null
  },
  'ETH-EUR': {
    micro: 'Ethereum',
    macro: 'Crypto',
    name: 'Ethereum',
    expectedReturn: 22.0,
    volatility: 70,
    isin: null
  },
  'ETH-USD': {
    micro: 'Ethereum',
    macro: 'Crypto',
    name: 'Ethereum',
    expectedReturn: 22.0,
    volatility: 70,
    isin: null
  },
  'ETHEUR': {
    micro: 'Ethereum',
    macro: 'Crypto',
    name: 'Ethereum',
    expectedReturn: 22.0,
    volatility: 70,
    isin: null
  },
  'ETHUSD': {
    micro: 'Ethereum',
    macro: 'Crypto',
    name: 'Ethereum',
    expectedReturn: 22.0,
    volatility: 70,
    isin: null
  },
  'SOL-EUR': {
    micro: 'Solana',
    macro: 'Crypto',
    name: 'Solana',
    expectedReturn: 30.0,
    volatility: 85,
    isin: null
  },
  'SOL-USD': {
    micro: 'Solana',
    macro: 'Crypto',
    name: 'Solana',
    expectedReturn: 30.0,
    volatility: 85,
    isin: null
  },
  'SOLUSD': {
    micro: 'Solana',
    macro: 'Crypto',
    name: 'Solana',
    expectedReturn: 30.0,
    volatility: 85,
    isin: null
  },
  'SOLEUR': {
    micro: 'Solana',
    macro: 'Crypto',
    name: 'Solana',
    expectedReturn: 30.0,
    volatility: 85,
    isin: null
  },
  'BNB-EUR': {
    micro: 'Binance Coin',
    macro: 'Crypto',
    name: 'Binance Coin',
    expectedReturn: 18.0,
    volatility: 65,
    isin: null
  },
  'BNB-USD': {
    micro: 'Binance Coin',
    macro: 'Crypto',
    name: 'Binance Coin',
    expectedReturn: 18.0,
    volatility: 65,
    isin: null
  },
  'BNBEUR': {
    micro: 'Binance Coin',
    macro: 'Crypto',
    name: 'Binance Coin',
    expectedReturn: 18.0,
    volatility: 65,
    isin: null
  },
  'BNBUSD': {
    micro: 'Binance Coin',
    macro: 'Crypto',
    name: 'Binance Coin',
    expectedReturn: 18.0,
    volatility: 65,
    isin: null
  },
  'ADA-EUR': {
    micro: 'Cardano',
    macro: 'Crypto',
    name: 'Cardano',
    expectedReturn: 18.0,
    volatility: 75,
    isin: null
  },
  'ADA-USD': {
    micro: 'Cardano',
    macro: 'Crypto',
    name: 'Cardano',
    expectedReturn: 18.0,
    volatility: 75,
    isin: null
  },
  'ADAEUR': {
    micro: 'Cardano',
    macro: 'Crypto',
    name: 'Cardano',
    expectedReturn: 18.0,
    volatility: 75,
    isin: null
  },
  'ADAUSD': {
    micro: 'Cardano',
    macro: 'Crypto',
    name: 'Cardano',
    expectedReturn: 18.0,
    volatility: 75,
    isin: null
  },
  'SHIB-EUR': {
    micro: 'Shiba Inu',
    macro: 'Crypto',
    name: 'Shiba Inu',
    expectedReturn: 8.0,
    volatility: 100,
    isin: null
  },
  'SHIB-USD': {
    micro: 'Shiba Inu',
    macro: 'Crypto',
    name: 'Shiba Inu',
    expectedReturn: 8.0,
    volatility: 100,
    isin: null
  },
  'SHIBEUR': {
    micro: 'Shiba Inu',
    macro: 'Crypto',
    name: 'Shiba Inu',
    expectedReturn: 8.0,
    volatility: 100,
    isin: null
  },
  'SHIBUSD': {
    micro: 'Shiba Inu',
    macro: 'Crypto',
    name: 'Shiba Inu',
    expectedReturn: 8.0,
    volatility: 100,
    isin: null
  },
  'DOGE-EUR': {
    micro: 'Dogecoin',
    macro: 'Crypto',
    name: 'Dogecoin',
    expectedReturn: 10.0,
    volatility: 90,
    isin: null
  },
  'DOGE-USD': {
    micro: 'Dogecoin',
    macro: 'Crypto',
    name: 'Dogecoin',
    expectedReturn: 10.0,
    volatility: 90,
    isin: null
  },
  'DOGEEUR': {
    micro: 'Dogecoin',
    macro: 'Crypto',
    name: 'Dogecoin',
    expectedReturn: 10.0,
    volatility: 90,
    isin: null
  },
  'DOGEUSD': {
    micro: 'Dogecoin',
    macro: 'Crypto',
    name: 'Dogecoin',
    expectedReturn: 10.0,
    volatility: 90,
    isin: null
  },
  'XRP-EUR': {
    micro: 'XRP',
    macro: 'Crypto',
    name: 'XRP (Ripple)',
    expectedReturn: 15.0,
    volatility: 80,
    isin: null
  },
  'XRP-USD': {
    micro: 'XRP',
    macro: 'Crypto',
    name: 'XRP (Ripple)',
    expectedReturn: 15.0,
    volatility: 80,
    isin: null
  },
  'MATIC-EUR': {
    micro: 'Polygon',
    macro: 'Crypto',
    name: 'Polygon (MATIC)',
    expectedReturn: 25.0,
    volatility: 80,
    isin: null
  },
  'MATIC-USD': {
    micro: 'Polygon',
    macro: 'Crypto',
    name: 'Polygon (MATIC)',
    expectedReturn: 25.0,
    volatility: 80,
    isin: null
  },
  'DOT-EUR': {
    micro: 'Polkadot',
    macro: 'Crypto',
    name: 'Polkadot',
    expectedReturn: 20.0,
    volatility: 75,
    isin: null
  },
  'DOT-USD': {
    micro: 'Polkadot',
    macro: 'Crypto',
    name: 'Polkadot',
    expectedReturn: 20.0,
    volatility: 75,
    isin: null
  },
  'AVAX-EUR': {
    micro: 'Avalanche',
    macro: 'Crypto',
    name: 'Avalanche',
    expectedReturn: 25.0,
    volatility: 80,
    isin: null
  },
  'AVAX-USD': {
    micro: 'Avalanche',
    macro: 'Crypto',
    name: 'Avalanche',
    expectedReturn: 25.0,
    volatility: 80,
    isin: null
  },
  'LINK-EUR': {
    micro: 'Chainlink',
    macro: 'Crypto',
    name: 'Chainlink',
    expectedReturn: 18.0,
    volatility: 70,
    isin: null
  },
  'LINK-USD': {
    micro: 'Chainlink',
    macro: 'Crypto',
    name: 'Chainlink',
    expectedReturn: 18.0,
    volatility: 70,
    isin: null
  },
  'UNI-EUR': {
    micro: 'Uniswap',
    macro: 'Crypto',
    name: 'Uniswap',
    expectedReturn: 20.0,
    volatility: 80,
    isin: null
  },
  'UNI-USD': {
    micro: 'Uniswap',
    macro: 'Crypto',
    name: 'Uniswap',
    expectedReturn: 20.0,
    volatility: 80,
    isin: null
  },
  'ATOM-EUR': {
    micro: 'Cosmos',
    macro: 'Crypto',
    name: 'Cosmos',
    expectedReturn: 22.0,
    volatility: 75,
    isin: null
  },
  'ATOM-USD': {
    micro: 'Cosmos',
    macro: 'Crypto',
    name: 'Cosmos',
    expectedReturn: 22.0,
    volatility: 75,
    isin: null
  },

  // ============================================
  // CRYPTO ETPs (Exchange Traded Products)
  // ============================================
  'BTCE.DE': {
    micro: 'Bitcoin',
    macro: 'ETC',
    name: 'BTCetc Bitcoin Exchange Traded Crypto',
    expectedReturn: 25.0,
    volatility: 65,
    isin: 'DE000A27Z304'
  },
  'ETHE': {
    micro: 'Ethereum',
    macro: 'ETC',
    name: 'Grayscale Ethereum Trust',
    expectedReturn: 22.0,
    volatility: 70,
    isin: 'US29608X1000'
  },
  'GBTC': {
    micro: 'Bitcoin',
    macro: 'ETC',
    name: 'Grayscale Bitcoin Trust',
    expectedReturn: 25.0,
    volatility: 65,
    isin: 'US38960P1093'
  },

  // ============================================
  // SETTORIALI
  // ============================================
  'XLK': {
    micro: 'Technology USA',
    macro: 'ETF',
    name: 'Technology Select Sector SPDR Fund',
    expectedReturn: 11.0,
    volatility: 26,
    isin: 'US81369Y8030'
  },
  'VGT': {
    micro: 'Technology USA',
    macro: 'ETF',
    name: 'Vanguard Information Technology ETF',
    expectedReturn: 11.0,
    volatility: 26,
    isin: 'US92204A7028'
  },
  'XLV': {
    micro: 'Healthcare USA',
    macro: 'ETF',
    name: 'Health Care Select Sector SPDR Fund',
    expectedReturn: 7.5,
    volatility: 16,
    isin: 'US81369Y2090'
  },
  'VHT': {
    micro: 'Healthcare USA',
    macro: 'ETF',
    name: 'Vanguard Health Care ETF',
    expectedReturn: 7.5,
    volatility: 16,
    isin: 'US92204A5063'
  },
  'XLF': {
    micro: 'Finance USA',
    macro: 'ETF',
    name: 'Financial Select Sector SPDR Fund',
    expectedReturn: 7.0,
    volatility: 21,
    isin: 'US81369Y6059'
  },
  'VFH': {
    micro: 'Finance USA',
    macro: 'ETF',
    name: 'Vanguard Financials ETF',
    expectedReturn: 7.0,
    volatility: 21,
    isin: 'US92204A3076'
  },
  'XLE': {
    micro: 'Energy USA',
    macro: 'ETF',
    name: 'Energy Select Sector SPDR Fund',
    expectedReturn: 5.5,
    volatility: 30,
    isin: 'US81369Y5069'
  },
  'ICLN': {
    micro: 'Clean Energy',
    macro: 'ETF',
    name: 'iShares Global Clean Energy ETF',
    expectedReturn: 8.0,
    volatility: 30,
    isin: 'US4642882405'
  },
  'TAN': {
    micro: 'Solar',
    macro: 'ETF',
    name: 'Invesco Solar ETF',
    expectedReturn: 9.0,
    volatility: 35,
    isin: 'US46138G7060'
  },

  // ============================================
  // DIVIDEND
  // ============================================
  'VYM': {
    micro: 'Dividend USA',
    macro: 'ETF',
    name: 'Vanguard High Dividend Yield ETF',
    expectedReturn: 6.5,
    volatility: 14,
    isin: 'US9219464065'
  },
  'SCHD': {
    micro: 'Dividend USA',
    macro: 'ETF',
    name: 'Schwab U.S. Dividend Equity ETF',
    expectedReturn: 6.5,
    volatility: 14,
    isin: 'US8085247976'
  },
  'DVY': {
    micro: 'Dividend USA',
    macro: 'ETF',
    name: 'iShares Select Dividend ETF',
    expectedReturn: 6.5,
    volatility: 14,
    isin: 'US4642874402'
  },
  'VHYL.AS': {
    micro: 'Dividend Mondiale',
    macro: 'ETF',
    name: 'Vanguard FTSE All-World High Dividend Yield UCITS ETF',
    expectedReturn: 6.5,
    volatility: 14,
    isin: 'IE00B8GKDB10'
  },

  // ============================================
  // ESG / SOSTENIBILI
  // ============================================
  'SUSW.MI': {
    micro: 'ESG Mondiale',
    macro: 'ETF',
    name: 'iShares MSCI World SRI UCITS ETF',
    expectedReturn: 7.0,
    volatility: 16,
    isin: 'IE00BYX2JD69'
  },
  'ESGV': {
    micro: 'ESG USA',
    macro: 'ETF',
    name: 'Vanguard ESG U.S. Stock ETF',
    expectedReturn: 7.5,
    volatility: 17,
    isin: 'US9219097683'
  },

  // ============================================
  // CASH / MONETARIO
  // ============================================
  'CASH': {
    micro: 'Liquidità',
    macro: 'Cash',
    name: 'Cash / Liquidità',
    expectedReturn: 0.0,
    volatility: 0,
    isin: null
  },
  'EUR': {
    micro: 'Liquidità',
    macro: 'Cash',
    name: 'Euro Cash',
    expectedReturn: 0.0,
    volatility: 0,
    isin: null
  },
  'USD': {
    micro: 'Liquidità USD',
    macro: 'Cash',
    name: 'USD Cash',
    expectedReturn: 0.5,
    volatility: 8,
    isin: null
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get full asset info for a ticker
 * @param {string} ticker - The ticker symbol (e.g., 'SWDA.MI', 'BTC-EUR')
 * @returns {object|null} - Asset info or null if not found
 */
export function getAssetInfo(ticker) {
  if (!ticker) return null;

  const normalizedTicker = ticker.toUpperCase().trim();

  // Direct match
  if (ASSET_TICKER_MAPPING[normalizedTicker]) {
    return { ticker: normalizedTicker, ...ASSET_TICKER_MAPPING[normalizedTicker] };
  }

  // Try without exchange suffix
  const baseTicker = normalizedTicker.split('.')[0].split('-')[0];
  for (const [key, value] of Object.entries(ASSET_TICKER_MAPPING)) {
    if (key.startsWith(baseTicker + '.') || key.startsWith(baseTicker + '-') || key === baseTicker) {
      return { ticker: key, ...value };
    }
  }

  return null;
}

/**
 * Get MICRO category for a ticker
 * @param {string} ticker - The ticker symbol
 * @returns {string|null} - MICRO category name or null
 */
export function getMicroFromTicker(ticker) {
  const info = getAssetInfo(ticker);
  return info ? info.micro : null;
}

/**
 * Get MACRO category for a ticker
 * @param {string} ticker - The ticker symbol
 * @returns {string|null} - MACRO category name or null
 */
export function getMacroFromTicker(ticker) {
  const info = getAssetInfo(ticker);
  return info ? info.macro : null;
}

/**
 * Get all tickers for a specific MICRO category
 * @param {string} microCategory - The MICRO category name
 * @returns {string[]} - Array of ticker symbols
 */
export function getTickersForMicroCategory(microCategory) {
  if (!microCategory) return [];

  const tickers = [];
  const normalizedMicro = microCategory.toLowerCase();

  for (const [ticker, info] of Object.entries(ASSET_TICKER_MAPPING)) {
    if (info.micro.toLowerCase() === normalizedMicro) {
      tickers.push(ticker);
    }
  }

  return tickers;
}

/**
 * Get all unique MICRO categories from the mapping
 * @returns {string[]} - Array of unique MICRO category names
 */
export function getAllMappedMicroCategories() {
  const categories = new Set();
  for (const info of Object.values(ASSET_TICKER_MAPPING)) {
    categories.add(info.micro);
  }
  return Array.from(categories).sort();
}

/**
 * Get all unique MACRO categories from the mapping
 * @returns {string[]} - Array of unique MACRO category names
 */
export function getAllMappedMacroCategories() {
  const categories = new Set();
  for (const info of Object.values(ASSET_TICKER_MAPPING)) {
    categories.add(info.macro);
  }
  return Array.from(categories).sort();
}

/**
 * Check if a ticker is in the mapping
 * @param {string} ticker - The ticker symbol
 * @returns {boolean}
 */
export function isTickerMapped(ticker) {
  return getAssetInfo(ticker) !== null;
}

/**
 * Get tickers grouped by MICRO category
 * @returns {object} - { microCategory: [tickers] }
 */
export function getTickersGroupedByMicro() {
  const grouped = {};

  for (const [ticker, info] of Object.entries(ASSET_TICKER_MAPPING)) {
    if (!grouped[info.micro]) {
      grouped[info.micro] = [];
    }
    grouped[info.micro].push({
      ticker,
      name: info.name,
      macro: info.macro
    });
  }

  return grouped;
}

/**
 * Search tickers by partial match
 * @param {string} query - Search query
 * @returns {object[]} - Array of matching assets
 */
export function searchTickers(query) {
  if (!query || query.length < 1) return [];

  const normalizedQuery = query.toUpperCase().trim();
  const results = [];

  for (const [ticker, info] of Object.entries(ASSET_TICKER_MAPPING)) {
    if (
      ticker.includes(normalizedQuery) ||
      info.name.toUpperCase().includes(normalizedQuery) ||
      info.micro.toUpperCase().includes(normalizedQuery)
    ) {
      results.push({ ticker, ...info });
    }
  }

  // Sort by relevance (exact ticker match first)
  results.sort((a, b) => {
    if (a.ticker === normalizedQuery) return -1;
    if (b.ticker === normalizedQuery) return 1;
    if (a.ticker.startsWith(normalizedQuery)) return -1;
    if (b.ticker.startsWith(normalizedQuery)) return 1;
    return a.ticker.localeCompare(b.ticker);
  });

  return results.slice(0, 20); // Limit to 20 results
}

export default ASSET_TICKER_MAPPING;
