/**
 * Comprehensive Asset Categories Database
 *
 * Contains expected annual returns (real, after inflation) and volatility
 * for all MICRO asset categories, organized by MACRO category.
 *
 * Data based on historical performance and financial research.
 * Returns are expressed in EUR, real terms (net of ~2% inflation).
 */

export const ASSET_CATEGORIES_DATA = {
  // ============================================
  // ETF - Exchange Traded Funds
  // ============================================
  'ETF': {
    name: 'ETF',
    description: 'Fondi negoziati in borsa',
    microCategories: {
      // Azionari Geografici
      'Azionario Mondiale': { expectedReturn: 7.0, volatility: 16, description: 'MSCI World, FTSE All-World' },
      'Azionario USA': { expectedReturn: 7.5, volatility: 17, description: 'S&P 500, Total US Market' },
      'Azionario USA Large Cap': { expectedReturn: 7.0, volatility: 16, description: 'S&P 500 Large Cap' },
      'Azionario USA Mid Cap': { expectedReturn: 8.0, volatility: 20, description: 'US Mid Cap Index' },
      'Azionario USA Small Cap': { expectedReturn: 8.5, volatility: 23, description: 'Russell 2000, S&P 600' },
      'Azionario Europa': { expectedReturn: 6.0, volatility: 18, description: 'STOXX Europe 600, MSCI Europe' },
      'Azionario Europa Large Cap': { expectedReturn: 5.5, volatility: 17, description: 'Euro STOXX 50' },
      'Azionario Europa Mid Cap': { expectedReturn: 6.5, volatility: 20, description: 'MSCI Europe Mid Cap' },
      'Azionario Europa Small Cap': { expectedReturn: 7.5, volatility: 24, description: 'MSCI Europe Small Cap' },
      'Azionario UK': { expectedReturn: 5.5, volatility: 17, description: 'FTSE 100, FTSE All-Share' },
      'Azionario Germania': { expectedReturn: 6.0, volatility: 20, description: 'DAX, MDAX' },
      'Azionario Francia': { expectedReturn: 5.5, volatility: 19, description: 'CAC 40' },
      'Azionario Italia': { expectedReturn: 5.0, volatility: 22, description: 'FTSE MIB' },
      'Azionario Svizzera': { expectedReturn: 6.0, volatility: 15, description: 'SMI' },
      'Azionario Giappone': { expectedReturn: 5.0, volatility: 19, description: 'Nikkei 225, TOPIX' },
      'Azionario Asia Pacifico': { expectedReturn: 6.5, volatility: 20, description: 'MSCI Asia Pacific' },
      'Azionario Asia ex-Japan': { expectedReturn: 7.0, volatility: 22, description: 'MSCI Asia ex-Japan' },
      'Azionario Emergenti': { expectedReturn: 8.0, volatility: 24, description: 'MSCI Emerging Markets' },
      'Azionario Emergenti Asia': { expectedReturn: 8.5, volatility: 25, description: 'MSCI EM Asia' },
      'Azionario Emergenti LatAm': { expectedReturn: 7.5, volatility: 28, description: 'MSCI EM Latin America' },
      'Azionario Emergenti EMEA': { expectedReturn: 7.0, volatility: 26, description: 'MSCI EM EMEA' },
      'Azionario China': { expectedReturn: 7.0, volatility: 28, description: 'MSCI China, CSI 300' },
      'Azionario China A-Shares': { expectedReturn: 7.5, volatility: 30, description: 'CSI 300 A-Shares' },
      'Azionario India': { expectedReturn: 9.0, volatility: 25, description: 'MSCI India, Nifty 50' },
      'Azionario Brasile': { expectedReturn: 8.0, volatility: 32, description: 'MSCI Brazil, Bovespa' },
      'Azionario Russia': { expectedReturn: 6.0, volatility: 35, description: 'MSCI Russia (alto rischio)' },
      'Azionario Corea': { expectedReturn: 7.5, volatility: 24, description: 'MSCI Korea, KOSPI' },
      'Azionario Taiwan': { expectedReturn: 8.0, volatility: 23, description: 'MSCI Taiwan' },
      'Azionario Australia': { expectedReturn: 6.0, volatility: 18, description: 'ASX 200' },
      'Azionario Canada': { expectedReturn: 6.5, volatility: 17, description: 'TSX Composite' },
      'Azionario Frontier Markets': { expectedReturn: 9.0, volatility: 28, description: 'MSCI Frontier Markets' },

      // Azionari per Stile/Fattore
      'Value Mondiale': { expectedReturn: 7.5, volatility: 18, description: 'MSCI World Value' },
      'Value USA': { expectedReturn: 7.5, volatility: 18, description: 'Russell 1000 Value' },
      'Value Europa': { expectedReturn: 6.5, volatility: 19, description: 'MSCI Europe Value' },
      'Growth Mondiale': { expectedReturn: 8.0, volatility: 20, description: 'MSCI World Growth' },
      'Growth USA': { expectedReturn: 8.5, volatility: 21, description: 'Russell 1000 Growth' },
      'Growth Europa': { expectedReturn: 7.0, volatility: 20, description: 'MSCI Europe Growth' },
      'Dividend Mondiale': { expectedReturn: 6.5, volatility: 14, description: 'MSCI World High Dividend' },
      'Dividend USA': { expectedReturn: 6.5, volatility: 14, description: 'S&P Dividend Aristocrats' },
      'Dividend Europa': { expectedReturn: 5.5, volatility: 15, description: 'Euro STOXX Select Dividend' },
      'Dividend Emergenti': { expectedReturn: 7.0, volatility: 20, description: 'MSCI EM High Dividend' },
      'Quality Mondiale': { expectedReturn: 7.5, volatility: 15, description: 'MSCI World Quality' },
      'Quality USA': { expectedReturn: 8.0, volatility: 15, description: 'MSCI USA Quality' },
      'Quality Europa': { expectedReturn: 6.5, volatility: 16, description: 'MSCI Europe Quality' },
      'Momentum Mondiale': { expectedReturn: 8.0, volatility: 18, description: 'MSCI World Momentum' },
      'Momentum USA': { expectedReturn: 8.5, volatility: 18, description: 'MSCI USA Momentum' },
      'Momentum Europa': { expectedReturn: 7.0, volatility: 19, description: 'MSCI Europe Momentum' },
      'Low Volatility Mondiale': { expectedReturn: 5.5, volatility: 12, description: 'MSCI World Min Vol' },
      'Low Volatility USA': { expectedReturn: 5.5, volatility: 11, description: 'S&P 500 Low Volatility' },
      'Low Volatility Europa': { expectedReturn: 5.0, volatility: 12, description: 'MSCI Europe Min Vol' },
      'Multi-Factor Mondiale': { expectedReturn: 7.5, volatility: 16, description: 'MSCI World Multi-Factor' },
      'Multi-Factor USA': { expectedReturn: 8.0, volatility: 16, description: 'MSCI USA Multi-Factor' },
      'Multi-Factor Europa': { expectedReturn: 6.5, volatility: 17, description: 'MSCI Europe Multi-Factor' },
      'Equal Weight USA': { expectedReturn: 7.5, volatility: 18, description: 'S&P 500 Equal Weight' },
      'Equal Weight Europa': { expectedReturn: 6.0, volatility: 19, description: 'STOXX Europe 600 EW' },

      // Settoriali
      'Technology Mondiale': { expectedReturn: 10.0, volatility: 25, description: 'MSCI World IT' },
      'Technology USA': { expectedReturn: 11.0, volatility: 26, description: 'NASDAQ 100, S&P Tech' },
      'Semiconductors': { expectedReturn: 12.0, volatility: 32, description: 'Semiconductor Index' },
      'Software & Cloud': { expectedReturn: 11.0, volatility: 28, description: 'Cloud Computing' },
      'Cybersecurity': { expectedReturn: 10.0, volatility: 28, description: 'Cybersecurity Index' },
      'Healthcare Mondiale': { expectedReturn: 7.0, volatility: 15, description: 'MSCI World Healthcare' },
      'Healthcare USA': { expectedReturn: 7.5, volatility: 16, description: 'S&P Healthcare' },
      'Biotech': { expectedReturn: 9.0, volatility: 30, description: 'NASDAQ Biotech' },
      'Pharma': { expectedReturn: 6.0, volatility: 14, description: 'S&P Pharma' },
      'Medical Devices': { expectedReturn: 8.0, volatility: 18, description: 'Medical Devices Index' },
      'Finance Mondiale': { expectedReturn: 6.5, volatility: 20, description: 'MSCI World Financials' },
      'Finance USA': { expectedReturn: 7.0, volatility: 21, description: 'S&P Financials' },
      'Finance Europa': { expectedReturn: 5.5, volatility: 22, description: 'STOXX Europe Banks' },
      'Insurance': { expectedReturn: 6.0, volatility: 18, description: 'Insurance Sector' },
      'Fintech': { expectedReturn: 10.0, volatility: 30, description: 'Fintech Index' },
      'Energy Mondiale': { expectedReturn: 5.0, volatility: 28, description: 'MSCI World Energy' },
      'Energy USA': { expectedReturn: 5.5, volatility: 30, description: 'S&P Energy' },
      'Clean Energy': { expectedReturn: 8.0, volatility: 30, description: 'S&P Global Clean Energy' },
      'Solar': { expectedReturn: 9.0, volatility: 35, description: 'Solar Energy Index' },
      'Wind': { expectedReturn: 7.0, volatility: 28, description: 'Wind Energy Index' },
      'Consumer Discretionary': { expectedReturn: 7.5, volatility: 20, description: 'MSCI World Cons Disc' },
      'Consumer Staples': { expectedReturn: 5.0, volatility: 12, description: 'MSCI World Cons Staples' },
      'Luxury': { expectedReturn: 8.0, volatility: 22, description: 'S&P Global Luxury' },
      'Retail': { expectedReturn: 6.0, volatility: 22, description: 'Retail Sector' },
      'E-commerce': { expectedReturn: 10.0, volatility: 28, description: 'E-commerce Index' },
      'Industrials Mondiale': { expectedReturn: 6.5, volatility: 18, description: 'MSCI World Industrials' },
      'Aerospace & Defense': { expectedReturn: 7.0, volatility: 20, description: 'Aerospace & Defense' },
      'Infrastructure': { expectedReturn: 6.0, volatility: 15, description: 'Global Infrastructure' },
      'Materials Mondiale': { expectedReturn: 6.0, volatility: 22, description: 'MSCI World Materials' },
      'Mining': { expectedReturn: 7.0, volatility: 28, description: 'Global Mining' },
      'Steel': { expectedReturn: 5.0, volatility: 30, description: 'Steel Sector' },
      'Utilities Mondiale': { expectedReturn: 4.5, volatility: 14, description: 'MSCI World Utilities' },
      'Utilities USA': { expectedReturn: 4.5, volatility: 14, description: 'S&P Utilities' },
      'Utilities Europa': { expectedReturn: 4.0, volatility: 15, description: 'STOXX Europe Utilities' },
      'Communication Services': { expectedReturn: 6.5, volatility: 20, description: 'Communication Services' },
      'Telecom': { expectedReturn: 4.0, volatility: 16, description: 'Telecom Sector' },
      'Media & Entertainment': { expectedReturn: 7.0, volatility: 22, description: 'Media & Entertainment' },

      // Tematici
      'Robotica & AI': { expectedReturn: 11.0, volatility: 28, description: 'Robotics & AI Index' },
      'Artificial Intelligence': { expectedReturn: 12.0, volatility: 32, description: 'AI & Machine Learning' },
      'Blockchain & Crypto Related': { expectedReturn: 15.0, volatility: 45, description: 'Blockchain Companies' },
      'Gaming & Esports': { expectedReturn: 9.0, volatility: 30, description: 'Video Games & Esports' },
      'Metaverse': { expectedReturn: 10.0, volatility: 35, description: 'Metaverse & VR' },
      'Space': { expectedReturn: 10.0, volatility: 35, description: 'Space Exploration' },
      'Electric Vehicles': { expectedReturn: 10.0, volatility: 35, description: 'EV & Battery' },
      'Autonomous Vehicles': { expectedReturn: 9.0, volatility: 32, description: 'Self-Driving Tech' },
      'Water': { expectedReturn: 6.0, volatility: 16, description: 'Water Resources' },
      'Agribusiness': { expectedReturn: 5.5, volatility: 18, description: 'Agriculture & Food' },
      'Aging Population': { expectedReturn: 6.5, volatility: 15, description: 'Healthcare & Senior Living' },
      'Millennials': { expectedReturn: 7.5, volatility: 20, description: 'Millennial Consumer Trends' },
      'Pet Economy': { expectedReturn: 7.0, volatility: 22, description: 'Pet Care Industry' },
      'Cannabis': { expectedReturn: 8.0, volatility: 50, description: 'Cannabis Industry (alto rischio)' },

      // ESG / Sostenibili
      'ESG Mondiale': { expectedReturn: 7.0, volatility: 16, description: 'MSCI World ESG Leaders' },
      'ESG USA': { expectedReturn: 7.5, volatility: 17, description: 'S&P 500 ESG' },
      'ESG Europa': { expectedReturn: 6.0, volatility: 17, description: 'MSCI Europe ESG' },
      'ESG Emergenti': { expectedReturn: 7.5, volatility: 23, description: 'MSCI EM ESG' },
      'Low Carbon': { expectedReturn: 7.0, volatility: 16, description: 'Low Carbon Index' },
      'Climate Change': { expectedReturn: 7.5, volatility: 20, description: 'Climate Transition' },
      'Gender Diversity': { expectedReturn: 7.0, volatility: 16, description: 'Gender Diversity Index' },
      'SRI (Socially Responsible)': { expectedReturn: 6.5, volatility: 16, description: 'Socially Responsible' },

      // Obbligazionari ETF
      'Obbligazioni Aggregate Globali': { expectedReturn: 2.5, volatility: 6, description: 'Bloomberg Global Agg' },
      'Obbligazioni Aggregate USA': { expectedReturn: 2.5, volatility: 5, description: 'Bloomberg US Agg' },
      'Obbligazioni Aggregate Europa': { expectedReturn: 1.5, volatility: 5, description: 'Bloomberg Euro Agg' },
      'Treasury USA Breve': { expectedReturn: 2.0, volatility: 2, description: 'US Treasury 1-3Y' },
      'Treasury USA Medio': { expectedReturn: 2.5, volatility: 5, description: 'US Treasury 3-7Y' },
      'Treasury USA Lungo': { expectedReturn: 3.0, volatility: 12, description: 'US Treasury 10-20Y' },
      'Treasury USA Ultra-Lungo': { expectedReturn: 3.5, volatility: 18, description: 'US Treasury 20+Y' },
      'Bund Germania Breve': { expectedReturn: 1.0, volatility: 2, description: 'German Bund 1-3Y' },
      'Bund Germania Medio': { expectedReturn: 1.5, volatility: 4, description: 'German Bund 3-7Y' },
      'Bund Germania Lungo': { expectedReturn: 2.0, volatility: 10, description: 'German Bund 10+Y' },
      'BTP Italia': { expectedReturn: 2.5, volatility: 8, description: 'Italian Government Bonds' },
      'Governativi Eurozona': { expectedReturn: 1.5, volatility: 5, description: 'Euro Government Bonds' },
      'Governativi UK': { expectedReturn: 2.0, volatility: 8, description: 'UK Gilts' },
      'Governativi Emergenti USD': { expectedReturn: 4.5, volatility: 12, description: 'EM Govt USD' },
      'Governativi Emergenti Local': { expectedReturn: 5.0, volatility: 15, description: 'EM Govt Local Currency' },
      'Corporate Investment Grade USA': { expectedReturn: 3.0, volatility: 7, description: 'US IG Corporate' },
      'Corporate Investment Grade Europa': { expectedReturn: 2.0, volatility: 5, description: 'Euro IG Corporate' },
      'Corporate Investment Grade Globali': { expectedReturn: 2.5, volatility: 6, description: 'Global IG Corporate' },
      'Corporate High Yield USA': { expectedReturn: 5.0, volatility: 12, description: 'US High Yield' },
      'Corporate High Yield Europa': { expectedReturn: 4.0, volatility: 10, description: 'Euro High Yield' },
      'Corporate High Yield Globali': { expectedReturn: 4.5, volatility: 11, description: 'Global High Yield' },
      'Fallen Angels': { expectedReturn: 5.5, volatility: 14, description: 'Fallen Angels Bonds' },
      'Inflation-Linked USA (TIPS)': { expectedReturn: 2.0, volatility: 6, description: 'US TIPS' },
      'Inflation-Linked Europa': { expectedReturn: 1.5, volatility: 5, description: 'Euro Inflation-Linked' },
      'Inflation-Linked Globali': { expectedReturn: 2.0, volatility: 6, description: 'Global Inflation-Linked' },
      'Floating Rate': { expectedReturn: 3.0, volatility: 3, description: 'Floating Rate Notes' },
      'Convertibili': { expectedReturn: 5.0, volatility: 12, description: 'Convertible Bonds' },
      'Municipal USA': { expectedReturn: 2.5, volatility: 5, description: 'US Municipal Bonds' },
      'Green Bonds': { expectedReturn: 2.0, volatility: 5, description: 'Green Bonds' },

      // Multi-Asset ETF
      'Bilanciato Conservativo': { expectedReturn: 4.0, volatility: 6, description: '30/70 Equity/Bond' },
      'Bilanciato Moderato': { expectedReturn: 5.0, volatility: 9, description: '50/50 Equity/Bond' },
      'Bilanciato Aggressivo': { expectedReturn: 6.0, volatility: 12, description: '70/30 Equity/Bond' },
      'Target Date 2030': { expectedReturn: 5.0, volatility: 10, description: 'Target Date 2030' },
      'Target Date 2040': { expectedReturn: 5.5, volatility: 12, description: 'Target Date 2040' },
      'Target Date 2050': { expectedReturn: 6.0, volatility: 14, description: 'Target Date 2050' },
      'Income Focus': { expectedReturn: 4.5, volatility: 8, description: 'Multi-Asset Income' },
    }
  },

  // ============================================
  // ETC - Exchange Traded Commodities
  // ============================================
  'ETC': {
    name: 'ETC (Exchange Traded Commodities)',
    description: 'Strumenti per investire in materie prime',
    microCategories: {
      // Metalli Preziosi
      'Oro Fisico': { expectedReturn: 4.0, volatility: 15, description: 'Physical Gold' },
      'Oro': { expectedReturn: 4.0, volatility: 15, description: 'Gold ETC' },
      'Argento Fisico': { expectedReturn: 3.5, volatility: 22, description: 'Physical Silver' },
      'Argento': { expectedReturn: 3.5, volatility: 22, description: 'Silver ETC' },
      'Platino': { expectedReturn: 3.0, volatility: 20, description: 'Platinum ETC' },
      'Palladio': { expectedReturn: 4.0, volatility: 28, description: 'Palladium ETC' },
      'Metalli Preziosi Basket': { expectedReturn: 3.5, volatility: 16, description: 'Precious Metals Basket' },

      // Energia
      'Petrolio WTI': { expectedReturn: 2.0, volatility: 35, description: 'WTI Crude Oil' },
      'Petrolio Brent': { expectedReturn: 2.0, volatility: 32, description: 'Brent Crude Oil' },
      'Gas Naturale': { expectedReturn: 0.0, volatility: 50, description: 'Natural Gas (alto contango)' },
      'Energia Basket': { expectedReturn: 1.5, volatility: 30, description: 'Energy Basket' },

      // Metalli Industriali
      'Rame': { expectedReturn: 4.0, volatility: 25, description: 'Copper' },
      'Alluminio': { expectedReturn: 2.5, volatility: 22, description: 'Aluminium' },
      'Zinco': { expectedReturn: 2.0, volatility: 24, description: 'Zinc' },
      'Nichel': { expectedReturn: 3.0, volatility: 30, description: 'Nickel' },
      'Piombo': { expectedReturn: 1.5, volatility: 22, description: 'Lead' },
      'Stagno': { expectedReturn: 2.5, volatility: 28, description: 'Tin' },
      'Metalli Industriali Basket': { expectedReturn: 3.0, volatility: 20, description: 'Industrial Metals Basket' },
      'Litio': { expectedReturn: 6.0, volatility: 40, description: 'Lithium' },
      'Uranio': { expectedReturn: 5.0, volatility: 35, description: 'Uranium' },
      'Terre Rare': { expectedReturn: 5.0, volatility: 38, description: 'Rare Earth' },

      // Agricoltura
      'Grano': { expectedReturn: 1.0, volatility: 25, description: 'Wheat' },
      'Mais': { expectedReturn: 1.0, volatility: 24, description: 'Corn' },
      'Soia': { expectedReturn: 1.5, volatility: 22, description: 'Soybeans' },
      'Caffè': { expectedReturn: 2.0, volatility: 30, description: 'Coffee' },
      'Cacao': { expectedReturn: 2.0, volatility: 28, description: 'Cocoa' },
      'Zucchero': { expectedReturn: 1.5, volatility: 28, description: 'Sugar' },
      'Cotone': { expectedReturn: 1.0, volatility: 26, description: 'Cotton' },
      'Agricoltura Basket': { expectedReturn: 1.5, volatility: 18, description: 'Agriculture Basket' },
      'Bestiame': { expectedReturn: 1.0, volatility: 18, description: 'Livestock' },

      // Diversificati
      'Materie Prime Diversificate': { expectedReturn: 3.0, volatility: 15, description: 'Broad Commodities' },
      'Bloomberg Commodity Index': { expectedReturn: 2.5, volatility: 14, description: 'BCOM Index' },
      'S&P GSCI': { expectedReturn: 2.0, volatility: 18, description: 'S&P GSCI' },
    }
  },

  // ============================================
  // ETN - Exchange Traded Notes
  // ============================================
  'ETN': {
    name: 'ETN (Exchange Traded Notes)',
    description: 'Note negoziate in borsa',
    microCategories: {
      'Volatilità VIX': { expectedReturn: -5.0, volatility: 80, description: 'VIX Futures (contango decay)' },
      'Volatilità VIX Breve': { expectedReturn: -20.0, volatility: 120, description: 'VIX Short-Term (alto decay)' },
      'Volatilità VIX Medio': { expectedReturn: -8.0, volatility: 60, description: 'VIX Mid-Term' },
      'Inverse VIX': { expectedReturn: 10.0, volatility: 50, description: 'Short VIX (rischio elevato)' },
      'Valute EUR/USD': { expectedReturn: 0.0, volatility: 8, description: 'Euro/Dollar' },
      'Valute GBP/USD': { expectedReturn: 0.0, volatility: 10, description: 'Sterling/Dollar' },
      'Valute JPY/USD': { expectedReturn: -0.5, volatility: 9, description: 'Yen/Dollar' },
      'Valute Emergenti': { expectedReturn: 1.0, volatility: 12, description: 'EM Currencies' },
      'Dollar Index': { expectedReturn: 0.5, volatility: 7, description: 'US Dollar Index' },
      'Leveraged Equity': { expectedReturn: 12.0, volatility: 45, description: '2x/3x Equity (alto rischio)' },
      'Inverse Equity': { expectedReturn: -8.0, volatility: 25, description: 'Short Equity' },
    }
  },

  // ============================================
  // Azioni Singole
  // ============================================
  'Azioni': {
    name: 'Azioni',
    description: 'Azioni singole di società quotate',
    microCategories: {
      'Large Cap USA': { expectedReturn: 8.0, volatility: 20, description: 'Mega/Large Cap americane' },
      'Mid Cap USA': { expectedReturn: 9.0, volatility: 25, description: 'Mid Cap americane' },
      'Small Cap USA': { expectedReturn: 10.0, volatility: 30, description: 'Small Cap americane' },
      'Large Cap Europa': { expectedReturn: 6.5, volatility: 22, description: 'Large Cap europee' },
      'Mid Cap Europa': { expectedReturn: 7.5, volatility: 26, description: 'Mid Cap europee' },
      'Small Cap Europa': { expectedReturn: 8.5, volatility: 30, description: 'Small Cap europee' },
      'Large Cap Italia': { expectedReturn: 5.5, volatility: 25, description: 'FTSE MIB Large' },
      'Mid Cap Italia': { expectedReturn: 6.5, volatility: 28, description: 'FTSE Italia Mid Cap' },
      'Small Cap Italia': { expectedReturn: 7.5, volatility: 32, description: 'FTSE Italia Small Cap' },
      'Large Cap UK': { expectedReturn: 6.0, volatility: 22, description: 'FTSE 100 components' },
      'Large Cap Germania': { expectedReturn: 6.5, volatility: 24, description: 'DAX components' },
      'Large Cap Francia': { expectedReturn: 6.0, volatility: 23, description: 'CAC 40 components' },
      'Large Cap Svizzera': { expectedReturn: 6.5, volatility: 18, description: 'SMI components' },
      'Large Cap Giappone': { expectedReturn: 5.5, volatility: 22, description: 'Nikkei components' },
      'Large Cap Emergenti': { expectedReturn: 9.0, volatility: 32, description: 'EM Blue Chips' },
      'Technology Stocks': { expectedReturn: 12.0, volatility: 35, description: 'Tech stocks singole' },
      'Growth Stocks': { expectedReturn: 10.0, volatility: 30, description: 'High growth stocks' },
      'Value Stocks': { expectedReturn: 7.5, volatility: 22, description: 'Value stocks' },
      'Dividend Stocks': { expectedReturn: 6.5, volatility: 18, description: 'High dividend stocks' },
      'Blue Chip': { expectedReturn: 7.0, volatility: 18, description: 'Blue chip quality' },
      'Penny Stocks': { expectedReturn: 5.0, volatility: 60, description: 'Penny stocks (alto rischio)' },
      'IPO / Pre-IPO': { expectedReturn: 8.0, volatility: 50, description: 'IPO e Pre-IPO (alto rischio)' },
    }
  },

  // ============================================
  // Obbligazioni Singole
  // ============================================
  'Obbligazioni': {
    name: 'Obbligazioni',
    description: 'Obbligazioni singole',
    microCategories: {
      // Governativi per Paese
      'BTP Italia': { expectedReturn: 2.5, volatility: 8, description: 'Titoli di Stato italiani' },
      'BTP Italia Breve (1-3Y)': { expectedReturn: 2.0, volatility: 3, description: 'BTP breve termine' },
      'BTP Italia Medio (3-7Y)': { expectedReturn: 2.5, volatility: 6, description: 'BTP medio termine' },
      'BTP Italia Lungo (10Y+)': { expectedReturn: 3.0, volatility: 12, description: 'BTP lungo termine' },
      'BTP Indicizzati Inflazione': { expectedReturn: 2.0, volatility: 6, description: 'BTP Italia inflation-linked' },
      'Bund Germania': { expectedReturn: 1.0, volatility: 5, description: 'Titoli tedeschi' },
      'Bund Germania Breve': { expectedReturn: 0.5, volatility: 2, description: 'Bund 1-3Y' },
      'Bund Germania Lungo': { expectedReturn: 1.5, volatility: 10, description: 'Bund 10Y+' },
      'OAT Francia': { expectedReturn: 1.5, volatility: 6, description: 'Titoli francesi' },
      'Bonos Spagna': { expectedReturn: 2.0, volatility: 7, description: 'Titoli spagnoli' },
      'Gilt UK': { expectedReturn: 2.0, volatility: 10, description: 'Titoli britannici' },
      'Treasury USA': { expectedReturn: 2.5, volatility: 6, description: 'US Treasury Bonds' },
      'Treasury USA Breve': { expectedReturn: 2.0, volatility: 2, description: 'T-Bills 3-12M' },
      'Treasury USA Medio': { expectedReturn: 2.5, volatility: 5, description: 'T-Notes 2-10Y' },
      'Treasury USA Lungo': { expectedReturn: 3.0, volatility: 15, description: 'T-Bonds 20-30Y' },
      'JGB Giappone': { expectedReturn: 0.5, volatility: 4, description: 'Titoli giapponesi' },
      'Governativi Svizzera': { expectedReturn: 0.5, volatility: 4, description: 'Titoli svizzeri' },
      'Governativi Canada': { expectedReturn: 2.0, volatility: 6, description: 'Titoli canadesi' },
      'Governativi Australia': { expectedReturn: 2.5, volatility: 7, description: 'Titoli australiani' },
      'Governativi Emergenti': { expectedReturn: 5.0, volatility: 14, description: 'EM Sovereign' },
      'Governativi Emergenti High Yield': { expectedReturn: 6.0, volatility: 18, description: 'EM Sovereign HY' },

      // Corporate
      'Corporate Investment Grade': { expectedReturn: 3.0, volatility: 6, description: 'IG Corporate Bonds' },
      'Corporate Investment Grade Breve': { expectedReturn: 2.5, volatility: 3, description: 'IG Corporate 1-5Y' },
      'Corporate Investment Grade Lungo': { expectedReturn: 3.5, volatility: 10, description: 'IG Corporate 10Y+' },
      'Corporate High Yield': { expectedReturn: 5.5, volatility: 12, description: 'HY Corporate Bonds' },
      'Corporate High Yield Breve': { expectedReturn: 5.0, volatility: 8, description: 'HY Corporate 1-5Y' },
      'Corporate Emergenti': { expectedReturn: 5.0, volatility: 12, description: 'EM Corporate' },
      'Corporate Emergenti HY': { expectedReturn: 6.5, volatility: 16, description: 'EM Corporate High Yield' },
      'Corporativi Finanziari': { expectedReturn: 3.5, volatility: 8, description: 'Financial Sector Bonds' },
      'Subordinati Bancari': { expectedReturn: 4.5, volatility: 12, description: 'Bank Subordinated' },
      'AT1 / CoCo Bonds': { expectedReturn: 5.5, volatility: 18, description: 'Contingent Convertibles' },

      // Speciali
      'Inflation-Linked': { expectedReturn: 2.0, volatility: 5, description: 'Inflation-linked bonds' },
      'Floating Rate Notes': { expectedReturn: 3.0, volatility: 2, description: 'Floating rate' },
      'Convertibili': { expectedReturn: 5.0, volatility: 12, description: 'Convertible bonds' },
      'Municipali USA': { expectedReturn: 2.5, volatility: 5, description: 'US Municipal' },
      'Green Bonds': { expectedReturn: 2.0, volatility: 5, description: 'Green/Climate bonds' },
      'Social Bonds': { expectedReturn: 2.0, volatility: 5, description: 'Social bonds' },
      'Covered Bonds': { expectedReturn: 1.5, volatility: 3, description: 'Covered bonds' },
    }
  },

  // ============================================
  // Crypto
  // ============================================
  'Crypto': {
    name: 'Crypto',
    description: 'Criptovalute e token digitali',
    microCategories: {
      // Major
      'Bitcoin': { expectedReturn: 25.0, volatility: 65, description: 'BTC - Store of value' },
      'Ethereum': { expectedReturn: 22.0, volatility: 70, description: 'ETH - Smart contracts' },
      'Bitcoin + Ethereum Basket': { expectedReturn: 23.0, volatility: 65, description: 'BTC+ETH 50/50' },

      // Stablecoins
      'Stablecoin USD': { expectedReturn: 4.0, volatility: 1, description: 'USDT, USDC, BUSD' },
      'Stablecoin EUR': { expectedReturn: 3.0, volatility: 1, description: 'EURS, EUROC' },
      'Stablecoin Yield': { expectedReturn: 8.0, volatility: 5, description: 'Stablecoin staking/lending' },

      // Layer 1
      'Solana': { expectedReturn: 30.0, volatility: 85, description: 'SOL - High throughput L1' },
      'Cardano': { expectedReturn: 18.0, volatility: 75, description: 'ADA - Academic L1' },
      'Avalanche': { expectedReturn: 25.0, volatility: 80, description: 'AVAX - EVM L1' },
      'Polkadot': { expectedReturn: 20.0, volatility: 75, description: 'DOT - Interoperability' },
      'Cosmos': { expectedReturn: 22.0, volatility: 75, description: 'ATOM - Interchain' },
      'Near Protocol': { expectedReturn: 25.0, volatility: 85, description: 'NEAR - Sharding L1' },
      'Algorand': { expectedReturn: 15.0, volatility: 70, description: 'ALGO - Pure PoS' },
      'Tezos': { expectedReturn: 12.0, volatility: 65, description: 'XTZ - Self-amending' },
      'Fantom': { expectedReturn: 20.0, volatility: 85, description: 'FTM - DAG-based' },
      'Hedera': { expectedReturn: 18.0, volatility: 70, description: 'HBAR - Enterprise' },
      'Aptos': { expectedReturn: 28.0, volatility: 90, description: 'APT - Move L1' },
      'Sui': { expectedReturn: 28.0, volatility: 90, description: 'SUI - Move L1' },
      'Layer 1 Basket': { expectedReturn: 22.0, volatility: 75, description: 'Diversified L1s' },

      // Layer 2
      'Polygon': { expectedReturn: 25.0, volatility: 80, description: 'MATIC - Ethereum L2' },
      'Arbitrum': { expectedReturn: 25.0, volatility: 85, description: 'ARB - Optimistic rollup' },
      'Optimism': { expectedReturn: 25.0, volatility: 85, description: 'OP - Optimistic rollup' },
      'zkSync': { expectedReturn: 28.0, volatility: 90, description: 'ZK rollup' },
      'StarkNet': { expectedReturn: 28.0, volatility: 90, description: 'STARK rollup' },
      'Immutable X': { expectedReturn: 22.0, volatility: 85, description: 'IMX - Gaming L2' },
      'Layer 2 Basket': { expectedReturn: 25.0, volatility: 80, description: 'Diversified L2s' },

      // DeFi
      'Uniswap': { expectedReturn: 20.0, volatility: 80, description: 'UNI - DEX' },
      'Aave': { expectedReturn: 18.0, volatility: 75, description: 'AAVE - Lending' },
      'MakerDAO': { expectedReturn: 15.0, volatility: 70, description: 'MKR - CDP' },
      'Lido': { expectedReturn: 20.0, volatility: 75, description: 'LDO - Liquid staking' },
      'Compound': { expectedReturn: 15.0, volatility: 70, description: 'COMP - Lending' },
      'Curve': { expectedReturn: 18.0, volatility: 75, description: 'CRV - Stablecoin DEX' },
      'Synthetix': { expectedReturn: 20.0, volatility: 80, description: 'SNX - Derivatives' },
      'GMX': { expectedReturn: 22.0, volatility: 85, description: 'GMX - Perps DEX' },
      'DeFi Basket': { expectedReturn: 18.0, volatility: 75, description: 'Diversified DeFi' },

      // Infrastructure
      'Chainlink': { expectedReturn: 18.0, volatility: 70, description: 'LINK - Oracles' },
      'The Graph': { expectedReturn: 20.0, volatility: 80, description: 'GRT - Indexing' },
      'Filecoin': { expectedReturn: 15.0, volatility: 75, description: 'FIL - Storage' },
      'Arweave': { expectedReturn: 20.0, volatility: 85, description: 'AR - Permanent storage' },
      'Render': { expectedReturn: 25.0, volatility: 90, description: 'RNDR - GPU computing' },
      'Infrastructure Basket': { expectedReturn: 18.0, volatility: 75, description: 'Diversified infra' },

      // Gaming / Metaverse
      'Axie Infinity': { expectedReturn: 15.0, volatility: 90, description: 'AXS - P2E Gaming' },
      'The Sandbox': { expectedReturn: 18.0, volatility: 85, description: 'SAND - Metaverse' },
      'Decentraland': { expectedReturn: 15.0, volatility: 85, description: 'MANA - Metaverse' },
      'Gala': { expectedReturn: 18.0, volatility: 90, description: 'GALA - Gaming' },
      'Enjin': { expectedReturn: 15.0, volatility: 80, description: 'ENJ - Gaming NFTs' },
      'Gaming/Metaverse Basket': { expectedReturn: 16.0, volatility: 85, description: 'Diversified gaming' },

      // Privacy
      'Monero': { expectedReturn: 12.0, volatility: 70, description: 'XMR - Privacy coin' },
      'Zcash': { expectedReturn: 10.0, volatility: 75, description: 'ZEC - Privacy coin' },

      // Exchange Tokens
      'Binance Coin': { expectedReturn: 18.0, volatility: 65, description: 'BNB - Exchange token' },
      'OKB': { expectedReturn: 15.0, volatility: 70, description: 'OKB - Exchange token' },
      'Cronos': { expectedReturn: 12.0, volatility: 75, description: 'CRO - Exchange token' },

      // Meme Coins
      'Dogecoin': { expectedReturn: 10.0, volatility: 90, description: 'DOGE - Meme coin' },
      'Shiba Inu': { expectedReturn: 8.0, volatility: 100, description: 'SHIB - Meme coin' },
      'Pepe': { expectedReturn: 5.0, volatility: 120, description: 'PEPE - Meme coin' },
      'Meme Basket': { expectedReturn: 8.0, volatility: 95, description: 'Diversified memes (alto rischio)' },

      // Alt diversificati
      'Alt Coin Large Cap': { expectedReturn: 20.0, volatility: 70, description: 'Top 20 altcoins' },
      'Alt Coin Mid Cap': { expectedReturn: 25.0, volatility: 85, description: 'Top 21-100 altcoins' },
      'Alt Coin Small Cap': { expectedReturn: 30.0, volatility: 100, description: 'Small cap altcoins' },
      'Crypto Index Top 10': { expectedReturn: 22.0, volatility: 60, description: 'Top 10 crypto index' },
      'Crypto Index Top 20': { expectedReturn: 23.0, volatility: 65, description: 'Top 20 crypto index' },
    }
  },

  // ============================================
  // Materie Prime (Direct)
  // ============================================
  'Materie Prime': {
    name: 'Materie Prime',
    description: 'Investimento diretto in commodity',
    microCategories: {
      'Oro Fisico': { expectedReturn: 4.0, volatility: 15, description: 'Lingotti/monete oro' },
      'Argento Fisico': { expectedReturn: 3.5, volatility: 22, description: 'Lingotti/monete argento' },
      'Platino Fisico': { expectedReturn: 3.0, volatility: 20, description: 'Platino fisico' },
      'Diamanti': { expectedReturn: 2.0, volatility: 12, description: 'Diamanti certificati' },
      'Orologi di Lusso': { expectedReturn: 5.0, volatility: 15, description: 'Rolex, Patek, etc.' },
      'Arte e Collezionismo': { expectedReturn: 6.0, volatility: 20, description: 'Fine art, collectibles' },
      'Vino Pregiato': { expectedReturn: 5.0, volatility: 12, description: 'Fine wine investment' },
      'Whisky Raro': { expectedReturn: 6.0, volatility: 15, description: 'Rare whisky' },
    }
  },

  // ============================================
  // Monetario
  // ============================================
  'Monetario': {
    name: 'Monetario',
    description: 'Strumenti a breve termine e liquidità',
    microCategories: {
      'Fondi Monetari EUR': { expectedReturn: 2.5, volatility: 0.5, description: 'Money market EUR' },
      'Fondi Monetari USD': { expectedReturn: 3.5, volatility: 0.5, description: 'Money market USD' },
      'Conto Deposito Vincolato': { expectedReturn: 3.0, volatility: 0, description: 'Time deposits' },
      'Conto Deposito Libero': { expectedReturn: 2.0, volatility: 0, description: 'Savings accounts' },
      'Treasury Bills USA': { expectedReturn: 3.5, volatility: 0.5, description: 'US T-Bills' },
      'BOT Italia': { expectedReturn: 2.5, volatility: 0.5, description: 'Buoni Ordinari Tesoro' },
      'Commercial Paper': { expectedReturn: 3.0, volatility: 1, description: 'Commercial paper' },
      'Certificati di Deposito': { expectedReturn: 2.5, volatility: 0, description: 'CD bancari' },
      'Pronti Contro Termine': { expectedReturn: 2.5, volatility: 0, description: 'Repo agreements' },
      'Ultra Short Bond': { expectedReturn: 2.5, volatility: 1, description: 'Ultra short duration' },
    }
  },

  // ============================================
  // Immobiliare
  // ============================================
  'Immobiliare': {
    name: 'Immobiliare',
    description: 'Investimenti immobiliari',
    microCategories: {
      // REITs
      'REITs USA Diversificati': { expectedReturn: 7.0, volatility: 20, description: 'US REITs diversified' },
      'REITs USA Residenziali': { expectedReturn: 6.5, volatility: 18, description: 'US Residential REITs' },
      'REITs USA Commerciali': { expectedReturn: 6.0, volatility: 22, description: 'US Commercial REITs' },
      'REITs USA Uffici': { expectedReturn: 5.0, volatility: 25, description: 'US Office REITs' },
      'REITs USA Industriali/Logistica': { expectedReturn: 7.5, volatility: 20, description: 'US Industrial REITs' },
      'REITs USA Retail': { expectedReturn: 5.5, volatility: 24, description: 'US Retail REITs' },
      'REITs USA Healthcare': { expectedReturn: 6.5, volatility: 18, description: 'US Healthcare REITs' },
      'REITs USA Data Center': { expectedReturn: 8.0, volatility: 22, description: 'Data Center REITs' },
      'REITs USA Torri Cellulari': { expectedReturn: 7.5, volatility: 18, description: 'Cell Tower REITs' },
      'REITs USA Self-Storage': { expectedReturn: 7.0, volatility: 18, description: 'Self-Storage REITs' },
      'REITs USA Hotel': { expectedReturn: 6.0, volatility: 28, description: 'Hospitality REITs' },
      'REITs Europa': { expectedReturn: 5.5, volatility: 20, description: 'European REITs' },
      'REITs UK': { expectedReturn: 5.0, volatility: 22, description: 'UK REITs' },
      'REITs Asia': { expectedReturn: 6.5, volatility: 22, description: 'Asian REITs' },
      'REITs Giappone': { expectedReturn: 5.0, volatility: 18, description: 'J-REITs' },
      'REITs Singapore': { expectedReturn: 6.0, volatility: 16, description: 'Singapore REITs' },
      'REITs Australia': { expectedReturn: 6.0, volatility: 18, description: 'A-REITs' },
      'REITs Globali': { expectedReturn: 6.5, volatility: 18, description: 'Global REITs' },
      'REITs Emergenti': { expectedReturn: 7.5, volatility: 25, description: 'EM REITs' },

      // Immobiliare diretto
      'Immobiliare Diretto Residenziale': { expectedReturn: 5.0, volatility: 10, description: 'Direct residential' },
      'Immobiliare Diretto Commerciale': { expectedReturn: 6.0, volatility: 15, description: 'Direct commercial' },
      'Immobiliare Diretto Affitto Breve': { expectedReturn: 7.0, volatility: 18, description: 'Short-term rental' },
      'Fondi Immobiliari Chiusi': { expectedReturn: 6.0, volatility: 15, description: 'Closed-end RE funds' },
      'Crowdfunding Immobiliare': { expectedReturn: 8.0, volatility: 20, description: 'RE crowdfunding' },
      'Mortgage REITs': { expectedReturn: 8.0, volatility: 25, description: 'Mortgage REITs' },
    }
  },

  // ============================================
  // Cash / Liquidità
  // ============================================
  'Cash': {
    name: 'Cash',
    description: 'Liquidità e conti correnti',
    microCategories: {
      'Conto Corrente': { expectedReturn: 0.5, volatility: 0, description: 'Checking account' },
      'Conto Corrente Remunerato': { expectedReturn: 1.5, volatility: 0, description: 'Interest checking' },
      'Liquidità': { expectedReturn: 0.0, volatility: 0, description: 'Cash holdings' },
      'Liquidità USD': { expectedReturn: 0.5, volatility: 8, description: 'USD cash (currency risk)' },
      'Liquidità GBP': { expectedReturn: 0.5, volatility: 10, description: 'GBP cash (currency risk)' },
      'Liquidità CHF': { expectedReturn: -0.5, volatility: 6, description: 'CHF cash (safe haven)' },
    }
  },

  // ============================================
  // Alternative
  // ============================================
  'Alternative': {
    name: 'Alternative',
    description: 'Investimenti alternativi',
    microCategories: {
      'Private Equity': { expectedReturn: 12.0, volatility: 25, description: 'PE funds' },
      'Venture Capital': { expectedReturn: 15.0, volatility: 40, description: 'VC funds' },
      'Private Credit': { expectedReturn: 8.0, volatility: 10, description: 'Private debt' },
      'Hedge Funds Multi-Strategy': { expectedReturn: 6.0, volatility: 8, description: 'Multi-strat HF' },
      'Hedge Funds Long/Short Equity': { expectedReturn: 7.0, volatility: 12, description: 'L/S Equity HF' },
      'Hedge Funds Global Macro': { expectedReturn: 6.0, volatility: 10, description: 'Global Macro HF' },
      'Hedge Funds Event Driven': { expectedReturn: 7.0, volatility: 10, description: 'Event Driven HF' },
      'Managed Futures (CTA)': { expectedReturn: 5.0, volatility: 15, description: 'Trend following' },
      'Infrastructure Private': { expectedReturn: 8.0, volatility: 12, description: 'Private infrastructure' },
      'Farmland': { expectedReturn: 7.0, volatility: 10, description: 'Agricultural land' },
      'Timberland': { expectedReturn: 6.0, volatility: 12, description: 'Timber investments' },
      'Royalties Musicali': { expectedReturn: 8.0, volatility: 15, description: 'Music royalties' },
      'Royalties Farmaceutiche': { expectedReturn: 9.0, volatility: 18, description: 'Pharma royalties' },
      'Litigation Finance': { expectedReturn: 12.0, volatility: 20, description: 'Legal financing' },
      'Life Settlements': { expectedReturn: 8.0, volatility: 8, description: 'Life insurance policies' },
      'Peer-to-Peer Lending': { expectedReturn: 6.0, volatility: 8, description: 'P2P lending' },
      'Invoice Factoring': { expectedReturn: 5.0, volatility: 5, description: 'Invoice financing' },
    }
  }
};

/**
 * Get all MICRO categories with their data
 */
export function getAllMicroCategoriesWithData() {
  const result = [];
  Object.entries(ASSET_CATEGORIES_DATA).forEach(([macro, data]) => {
    Object.entries(data.microCategories).forEach(([micro, metrics]) => {
      result.push({
        macro,
        micro,
        ...metrics
      });
    });
  });
  return result;
}

/**
 * Get MICRO categories for a specific MACRO
 */
export function getMicroCategoriesForMacro(macro) {
  return ASSET_CATEGORIES_DATA[macro]?.microCategories || {};
}

/**
 * Get data for a specific MICRO category
 */
export function getMicroCategoryData(microName) {
  for (const [macro, data] of Object.entries(ASSET_CATEGORIES_DATA)) {
    if (data.microCategories[microName]) {
      return {
        macro,
        ...data.microCategories[microName]
      };
    }
  }
  return null;
}

/**
 * Find MACRO from MICRO name
 */
export function findMacroFromMicro(microName) {
  for (const [macro, data] of Object.entries(ASSET_CATEGORIES_DATA)) {
    if (data.microCategories[microName]) {
      return macro;
    }
  }
  return null;
}

/**
 * Get all MACRO categories
 */
export function getAllMacroCategories() {
  return Object.keys(ASSET_CATEGORIES_DATA);
}

/**
 * Calculate portfolio expected return (weighted average)
 */
export function calculatePortfolioReturn(allocation) {
  let totalReturn = 0;
  let totalWeight = 0;

  Object.entries(allocation).forEach(([micro, percentage]) => {
    const data = getMicroCategoryData(micro);
    if (data && percentage > 0) {
      totalReturn += data.expectedReturn * percentage;
      totalWeight += percentage;
    }
  });

  return totalWeight > 0 ? totalReturn / totalWeight : 0;
}

/**
 * Calculate portfolio volatility (simplified weighted average)
 * Note: This is a simplified calculation. Real volatility calculation
 * would require correlation matrix between assets.
 */
export function calculatePortfolioVolatility(allocation) {
  let totalVolatility = 0;
  let totalWeight = 0;

  Object.entries(allocation).forEach(([micro, percentage]) => {
    const data = getMicroCategoryData(micro);
    if (data && percentage > 0) {
      // Simplified: weighted average of volatilities
      // Real calculation would use sqrt(sum of weighted covariances)
      totalVolatility += data.volatility * percentage;
      totalWeight += percentage;
    }
  });

  // Apply diversification benefit (roughly 0.7-0.8 factor for diversified portfolios)
  const numAssets = Object.keys(allocation).filter(k => allocation[k] > 0).length;
  const diversificationFactor = numAssets > 1 ? Math.max(0.6, 1 - (numAssets * 0.03)) : 1;

  return totalWeight > 0 ? (totalVolatility / totalWeight) * diversificationFactor : 0;
}

/**
 * Get risk level description based on volatility
 */
export function getRiskLevelDescription(volatility) {
  if (volatility <= 5) return { level: 'Molto Basso', color: 'text-green-600', bg: 'bg-green-100' };
  if (volatility <= 10) return { level: 'Basso', color: 'text-green-500', bg: 'bg-green-50' };
  if (volatility <= 15) return { level: 'Moderato', color: 'text-yellow-600', bg: 'bg-yellow-100' };
  if (volatility <= 25) return { level: 'Alto', color: 'text-orange-600', bg: 'bg-orange-100' };
  if (volatility <= 40) return { level: 'Molto Alto', color: 'text-red-600', bg: 'bg-red-100' };
  return { level: 'Estremo', color: 'text-red-800', bg: 'bg-red-200' };
}

export default ASSET_CATEGORIES_DATA;
