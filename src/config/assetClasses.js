/**
 * Asset Class Configuration
 *
 * Hierarchical structure:
 * MACRO-Asset Class → MICRO-Asset Class
 */

export const ASSET_CLASSES = {
  'ETF': {
    name: 'ETF',
    microCategories: {
      // Azionari Geografici
      'Azionario Mondiale': ['VWCE', 'VWRL', 'SWDA', 'IWDA', 'ACWI'],
      'Azionario USA': ['SPY', 'VOO', 'VTI', 'VUSA', 'QQQ', 'CSPX', 'IVV'],
      'Azionario Europa': ['VEUR', 'IEUR', 'EXS1', 'SMEA', 'VJPN'],
      'Azionario Giappone': ['VJPN', 'EWJ', 'JPXN'],
      'Azionario Emergenti': ['VFEM', 'EIMI', 'AEEM', 'EMIM'],
      'Azionario Asia ex-Japan': ['AAXJ', 'VPL'],
      'Azionario Pacifico': ['VPL', 'IPAC'],
      'Azionario China': ['MCHI', 'FXI', 'CNYA'],
      'Azionario India': ['INDA', 'PIN'],
      'Azionario LatAm': ['ILF', 'MEXX'],
      'Azionario Africa': ['AFK', 'GAF'],

      // Azionari per Capitalizzazione
      'Large Cap USA': ['VOO', 'SPY', 'IVV'],
      'Mid Cap USA': ['VO', 'IJH', 'MDY'],
      'Small Cap USA': ['VB', 'IWM', 'IJR'],
      'Small Cap Europa': ['ZPRV', 'IEUS'],
      'Small Cap Mondo': ['VSS', 'SMLF'],

      // Azionari per Stile
      'Value USA': ['VTV', 'IVE', 'VONV'],
      'Growth USA': ['VUG', 'IVW', 'VONG'],
      'Dividend USA': ['VYM', 'SCHD', 'DVY'],
      'Dividend Europa': ['VHYL'],
      'Dividend Emergenti': ['EDIV'],

      // Settoriali
      'Technology': ['VGT', 'XLK', 'QTEC'],
      'Healthcare': ['VHT', 'XLV', 'IXJ'],
      'Finance': ['VFH', 'XLF', 'IYF'],
      'Energy': ['VDE', 'XLE', 'IYE'],
      'Consumer Discretionary': ['VCR', 'XLY'],
      'Consumer Staples': ['VDC', 'XLP'],
      'Industrials': ['VIS', 'XLI'],
      'Materials': ['VAW', 'XLB'],
      'Real Estate': ['VNQ', 'XLRE'],
      'Utilities': ['VPU', 'XLU'],
      'Communication': ['VOX', 'XLC'],

      // Obbligazionari
      'Obbligazionario Globale': ['AGG', 'BND', 'VWOB'],
      'Obbligazionario USA': ['BND', 'AGG', 'VBTLX'],
      'Obbligazionario Europa': ['IEAG', 'VGEA'],
      'Governativi USA': ['TLT', 'IEF', 'SHY', 'GOVT'],
      'Governativi Europa': ['IEGL', 'DBZB'],
      'Corporativi IG': ['LQD', 'VCIT', 'IGIB'],
      'High Yield': ['HYG', 'JNK', 'SHYG'],
      'Obbligazionario Emergenti': ['EMB', 'VWOB', 'EMHY'],
      'Inflation-Linked': ['TIP', 'VTIP', 'SCHP'],

      // Tematici
      'ESG/Sostenibili': ['ESGV', 'USSG', 'SUSL'],
      'Clean Energy': ['ICLN', 'TAN', 'QCLN'],
      'Robotica/AI': ['BOTZ', 'ROBO', 'AIQ'],
      'Cloud Computing': ['SKYY', 'CLOU'],
      'Cybersecurity': ['HACK', 'CIBR'],
      'Gaming/Esports': ['ESPO', 'GAMR'],

      // Multi-Asset
      'Bilanciato': ['AOR', 'AOM'],
      'Conservativo': ['AOK'],
      'Aggressivo': ['AOA']
    }
  },

  'ETC': {
    name: 'ETC (Exchange Traded Commodities)',
    microCategories: {
      'Oro': ['GLD', 'IAU', 'SGOL'],
      'Argento': ['SLV', 'SIVR'],
      'Petrolio': ['USO', 'UCO'],
      'Gas Naturale': ['UNG', 'BOIL'],
      'Metalli Industriali': ['DBB', 'CPER'],
      'Agricoltura': ['DBA', 'CORN', 'SOYB'],
      'Materie Prime Diversificate': ['DBC', 'GSG']
    }
  },

  'ETN': {
    name: 'ETN (Exchange Traded Notes)',
    microCategories: {
      'Volatilità': ['VXX', 'VIXY'],
      'Valute': ['UUP', 'FXE'],
      'Materie Prime': ['DJP'],
      'Alternative': []
    }
  },

  'Azioni': {
    name: 'Azioni',
    microCategories: {
      'Large Cap': [],
      'Mid Cap': [],
      'Small Cap': [],
      'Growth': [],
      'Value': [],
      'Technology': [],
      'Healthcare': [],
      'Finance': [],
      'Energy': [],
      'Consumer': [],
      'Industrials': [],
      'Real Estate': [],
      'Utilities': []
    }
  },

  'Obbligazioni': {
    name: 'Obbligazioni',
    microCategories: {
      // Governativi per Paese
      'BTP Italia': [],
      'Bund Germania': [],
      'OAT Francia': [],
      'Bonos Spagna': [],
      'Gilt UK': [],
      'Treasury USA': [],
      'JGB Giappone': [],
      'Governativi Svizzera': [],
      'Governativi Canada': [],
      'Governativi Australia': [],
      'Governativi Emergenti': [],

      // Corporativi
      'Corporativi Investment Grade': [],
      'Corporativi High Yield': [],
      'Corporativi Emergenti': [],
      'Corporativi Finanziari': [],

      // Municipali
      'Municipali USA': [],

      // Speciali
      'Inflation-Linked': [],
      'Floating Rate': [],
      'Convertibili': []
    }
  },

  'Crypto': {
    name: 'Crypto',
    microCategories: {
      'Bitcoin': ['BTC', 'BTCUSD', 'BTCEUR'],
      'Ethereum': ['ETH', 'ETHUSD', 'ETHEUR'],
      'Stablecoin': ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDD', 'FRAX'],
      'Layer 1': ['SOL', 'ADA', 'AVAX', 'DOT', 'ATOM', 'ALGO', 'NEAR', 'FTM', 'EGLD'],
      'Layer 2': ['MATIC', 'ARB', 'OP', 'IMX', 'LRC'],
      'DeFi': ['UNI', 'AAVE', 'SNX', 'COMP', 'CRV', 'MKR', 'SUSHI'],
      'Meme Coin': ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONE'],
      'Exchange Token': ['BNB', 'FTT', 'CRO', 'HT', 'OKB'],
      'Smart Contract Platform': ['ETH', 'SOL', 'ADA', 'AVAX'],
      'Metaverse/Gaming': ['SAND', 'MANA', 'AXS', 'GALA', 'ENJ'],
      'Privacy Coin': ['XMR', 'ZEC', 'DASH'],
      'Oracle': ['LINK', 'BAND'],
      'Alt Coin': []
    }
  },

  'Materie Prime': {
    name: 'Materie Prime',
    microCategories: {
      'Oro': [],
      'Argento': [],
      'Platino': [],
      'Palladio': [],
      'Petrolio': [],
      'Gas Naturale': [],
      'Rame': [],
      'Alluminio': [],
      'Zinco': [],
      'Nichel': [],
      'Grano': [],
      'Mais': [],
      'Soia': [],
      'Caffè': [],
      'Zucchero': [],
      'Cacao': []
    }
  },

  'Monetario': {
    name: 'Monetario',
    microCategories: {
      'Fondi Monetari': [],
      'Conto Deposito': [],
      'Treasury Bills': [],
      'Commercial Paper': []
    }
  },

  'Immobiliare': {
    name: 'Immobiliare',
    microCategories: {
      'REIT USA Diversificati': ['VNQ', 'IYR', 'SCHH'],
      'REIT USA Residenziali': ['REZ'],
      'REIT USA Commerciali': ['VNQ'],
      'REIT USA Industriali': ['REET'],
      'REIT Europa': ['IQQP'],
      'REIT Asia': ['VNQI'],
      'REIT Globali': ['VNQI', 'RWO'],
      'Immobiliare Diretto': []
    }
  },

  'Cash': {
    name: 'Cash',
    microCategories: {
      'Conto Corrente': [],
      'Liquidità': []
    }
  }
};

/**
 * Get micro categories for a specific macro asset class
 */
export function getMicroCategories(macroAssetClass) {
  return ASSET_CLASSES[macroAssetClass]?.microCategories || {};
}

/**
 * Get all macro asset classes
 */
export function getMacroAssetClasses() {
  return Object.keys(ASSET_CLASSES);
}

/**
 * Get all micro categories as flat array
 */
export function getAllMicroCategories() {
  const all = [];
  Object.entries(ASSET_CLASSES).forEach(([macro, config]) => {
    Object.keys(config.microCategories).forEach(micro => {
      all.push({ macro, micro });
    });
  });
  return all;
}

/**
 * Find macro asset class from micro category
 */
export function findMacroFromMicro(microCategory) {
  for (const [macro, config] of Object.entries(ASSET_CLASSES)) {
    if (microCategory in config.microCategories) {
      return macro;
    }
  }
  return null;
}

export default ASSET_CLASSES;
