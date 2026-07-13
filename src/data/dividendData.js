/**
 * dividendData.js
 * Database statico: yield annuo (%) + mesi di pagamento (1=Gen … 12=Dic)
 * per ETF a distribuzione, obbligazioni e azioni singole.
 * Fonti: dati storici provider / Morningstar / Bloomberg (maggio 2026).
 *
 * Accumulating ETF → yield: 0, months: []
 */

// ─────────────────────────────────────────────────────────────────────────────
const DIVIDEND_DB = {

  // ── ETF Azionari a DISTRIBUZIONE ─────────────────────────────────────────

  // Global High Dividend
  'VHYL.MI': { yield: 3.30, months: [2, 5, 8, 11], note: 'Vanguard FTSE All-World High Div.' },
  'VHYL.AS': { yield: 3.30, months: [2, 5, 8, 11], note: 'Vanguard FTSE All-World High Div.' },
  'GGRP.DE': { yield: 3.30, months: [2, 5, 8, 11], note: 'Vanguard FTSE All-World High Div.' },
  'IDVY.MI': { yield: 4.00, months: [3, 6, 9, 12], note: 'iShares STOXX Global Select Div.' },
  'IDVY.DE': { yield: 4.00, months: [3, 6, 9, 12] },

  // S&P 500 High Dividend
  'SPYD.MI': { yield: 4.30, months: [3, 6, 9, 12], note: 'SPDR S&P 500 High Dividend' },
  'SPYD.DE': { yield: 4.30, months: [3, 6, 9, 12] },
  'HDIV.MI': { yield: 4.30, months: [3, 6, 9, 12] },

  // MSCI World / All-World – distribuzione
  'VWRL.AS': { yield: 1.90, months: [3, 6, 9, 12], note: 'Vanguard FTSE All-World (dist.)' },
  'VWRA.L':  { yield: 1.90, months: [3, 6, 9, 12] },
  'HMWO.L':  { yield: 1.60, months: [3, 6, 9, 12], note: 'HSBC MSCI World (dist.)' },
  'SWDA.L':  { yield: 1.60, months: [3, 6, 9, 12] },

  // S&P 500 – distribuzione
  'VUSA.MI': { yield: 1.30, months: [3, 6, 9, 12], note: 'Vanguard S&P 500 (dist.)' },
  'CSPX.L':  { yield: 1.30, months: [3, 6, 9, 12] },

  // MSCI Europe – distribuzione
  'VEUR.MI': { yield: 2.80, months: [3, 6, 9, 12], note: 'Vanguard FTSE Dev. Europe' },
  'SMEA.MI': { yield: 2.40, months: [3, 6, 9, 12] },

  // Emerging Markets – distribuzione
  'VFEM.MI': { yield: 2.60, months: [3, 6, 9, 12], note: 'Vanguard FTSE EM (dist.)' },

  // Real Estate / REIT
  'IWDP.MI': { yield: 2.50, months: [2, 5, 8, 11], note: 'iShares EPRA NAREIT Dev.' },
  'EPRA.MI': { yield: 2.50, months: [2, 5, 8, 11] },

  // ── ETF Obbligazionari / Monetari (cedole = "dividendi") ─────────────────

  // Global Aggregate
  'AGGH.MI': { yield: 3.50, months: [1, 4, 7, 10], note: 'iShares Core Global Agg' },
  'VAGF.MI': { yield: 3.20, months: [3, 6, 9, 12] },
  'XBAG.DE': { yield: 3.20, months: [3, 6, 9, 12] },

  // Euro Gov Bond
  'VETY.MI': { yield: 3.20, months: [3, 6, 9, 12], note: 'Vanguard EUR Gov. Bond' },
  'IBTS.MI': { yield: 3.00, months: [2, 5, 8, 11] },
  'IEGE.MI': { yield: 3.00, months: [2, 5, 8, 11] },
  'IBCI.MI': { yield: 2.80, months: [3, 6, 9, 12] },
  'ETLB.MI': { yield: 3.10, months: [3, 6, 9, 12] },
  'IGLT.L':  { yield: 3.20, months: [3, 6, 9, 12] },
  'CSBGE0.DE':{ yield: 3.00, months: [3, 6, 9, 12] },

  // Euro Corp Bond
  'EUNA.DE': { yield: 3.60, months: [2, 5, 8, 11] },
  'VCBO.MI': { yield: 3.60, months: [2, 5, 8, 11] },
  'IEAA.L':  { yield: 3.80, months: [2, 5, 8, 11] },
  'IHYG.MI': { yield: 6.50, months: [2, 5, 8, 11], note: 'High Yield EUR' },
  'HYLD.DE': { yield: 6.50, months: [2, 5, 8, 11] },

  // USD Treasury
  'IDTL.L':  { yield: 4.20, months: [3, 6, 9, 12], note: 'USD Treasury Long' },
  'DTLA.L':  { yield: 4.20, months: [3, 6, 9, 12] },
  'IBTM.L':  { yield: 4.10, months: [3, 6, 9, 12] },
  'IBTU.L':  { yield: 4.30, months: [3, 6, 9, 12] },
  'VDTY.L':  { yield: 4.10, months: [3, 6, 9, 12] },
  'TIPS.L':  { yield: 3.80, months: [1, 4, 7, 10] },

  // USD Corp
  'LQDA.L':  { yield: 4.50, months: [2, 5, 8, 11] },
  'VUCP.MI': { yield: 4.50, months: [2, 5, 8, 11] },
  'LQDE.L':  { yield: 4.50, months: [2, 5, 8, 11] },

  // EM Bond
  'SEML.MI': { yield: 5.80, months: [3, 6, 9, 12] },
  'VDEM.L':  { yield: 5.80, months: [3, 6, 9, 12] },

  // Overnight EUR (interesse mensile accumulato, prezzi adjusted)
  'XEON.DE': { yield: 3.40, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], note: 'Euro Overnight (€STR)' },
  'CSH2.PA': { yield: 3.40, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  'IBGS.L':  { yield: 3.30, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },

  // ── ETF ACCUMULANTI (yield = 0, nessuna distribuzione) ───────────────────

  // MSCI World / FTSE All-World accum
  'SWDA.MI': { yield: 0, months: [] }, 'IWDA.AS': { yield: 0, months: [] },
  'MEUD.MI': { yield: 0, months: [] }, 'LCWD.MI': { yield: 0, months: [] },
  'LCWL.MI': { yield: 0, months: [] }, 'SUWS.MI': { yield: 0, months: [] },
  'SUSW.MI': { yield: 0, months: [] },
  'VWCE.DE': { yield: 0, months: [] }, 'VWCE.MI': { yield: 0, months: [] },
  'FWRA.MI': { yield: 0, months: [] }, 'IUSQ.DE': { yield: 0, months: [] },
  'HMWO.MI': { yield: 0, months: [] },

  // S&P 500 / Nasdaq accum
  'SXR8.DE': { yield: 0, months: [] }, 'VUAA.MI': { yield: 0, months: [] },
  'CSX5.DE': { yield: 0, months: [] }, 'SPXS.MI': { yield: 0, months: [] },
  'LSPU.MI': { yield: 0, months: [] }, 'CSP1.MI': { yield: 0, months: [] },
  'QDVE.DE': { yield: 0, months: [] },
  'EQQQ.MI': { yield: 0, months: [] }, 'CNDX.MI': { yield: 0, months: [] },
  'LQQ.PA':  { yield: 0, months: [] }, 'QQQM':    { yield: 0, months: [] },

  // MSCI Europe / Euro Stoxx accum
  'SXRJ.DE': { yield: 0, months: [] }, 'EXW1.DE': { yield: 0, months: [] },
  'LYYS.DE': { yield: 0, months: [] }, 'EUNY.MI': { yield: 0, months: [] },
  'EUNU.MI': { yield: 0, months: [] }, 'IEUR.MI': { yield: 0, months: [] },
  'SPEURO.MI':{ yield: 0, months: [] },

  // EM accum
  'IS3N.DE': { yield: 0, months: [] }, 'EMIM.MI': { yield: 0, months: [] },
  'SEMA.MI': { yield: 0, months: [] }, 'AEEM.MI': { yield: 0, months: [] },
  'EIMI.L':  { yield: 0, months: [] },

  // Japan
  'IJPA.L':  { yield: 0, months: [] }, 'VJPN.MI': { yield: 0, months: [] },

  // Factor ETF (tutti accum)
  'XDEM.MI': { yield: 0, months: [] }, 'XDEM.DE': { yield: 0, months: [] },
  'IWMO.MI': { yield: 0, months: [] }, 'IS3M.DE': { yield: 0, months: [] },
  'IMOM.L':  { yield: 0, months: [] },
  'XDEQ.MI': { yield: 0, months: [] }, 'XDEQ.DE': { yield: 0, months: [] },
  'IWQU.MI': { yield: 0, months: [] }, 'IQSA.L':  { yield: 0, months: [] },
  'IWVL.MI': { yield: 0, months: [] }, 'IWVL.L':  { yield: 0, months: [] },
  'ZPRV.MI': { yield: 0, months: [] }, 'ZPRV.DE': { yield: 0, months: [] },
  'ISUS.MI': { yield: 0, months: [] },
  'ZPRX.MI': { yield: 0, months: [] }, 'ZPRX.DE': { yield: 0, months: [] },
  'ISEV.MI': { yield: 0, months: [] },

  // Small Cap accum
  'IUSN.DE': { yield: 0, months: [] }, 'WSML.MI': { yield: 0, months: [] },

  // LifeStrategy (multi-asset accum/dist mixed — semplificato)
  'V20A.DE': { yield: 1.50, months: [3, 6, 9, 12] },
  'V40A.DE': { yield: 1.50, months: [3, 6, 9, 12] },
  'V60A.DE': { yield: 2.00, months: [3, 6, 9, 12] },
  'V80A.DE': { yield: 2.20, months: [3, 6, 9, 12] },

  // Gold / Commodity / Crypto — nessuna distribuzione
  'PPFB.MI': { yield: 0, months: [] }, 'SGLD.MI': { yield: 0, months: [] },
  'PHAU.MI': { yield: 0, months: [] }, 'SGLN.MI': { yield: 0, months: [] },
  'IGLN.MI': { yield: 0, months: [] }, 'IGLN.L':  { yield: 0, months: [] },
  'GLD':     { yield: 0, months: [] }, 'IAU':     { yield: 0, months: [] },
  'CMOD.MI': { yield: 0, months: [] }, 'AIGI.MI': { yield: 0, months: [] },
  'BTCE.DE': { yield: 0, months: [] }, 'VBTC.L':  { yield: 0, months: [] },
  'BTC-USD': { yield: 0, months: [] }, 'ETH-USD': { yield: 0, months: [] },
  'BNB-USD': { yield: 0, months: [] }, 'SOL-USD': { yield: 0, months: [] },
  'XRP-USD': { yield: 0, months: [] }, 'ADA-USD': { yield: 0, months: [] },

  // ── AZIONI SINGOLE USA ────────────────────────────────────────────────────

  // Technology
  'MSFT':  { yield: 0.73, months: [3, 6, 9, 12],  note: 'Microsoft' },
  'AAPL':  { yield: 0.51, months: [2, 5, 8, 11],  note: 'Apple' },
  'NVDA':  { yield: 0.03, months: [3, 6, 9, 12],  note: 'NVIDIA (micro-dividendo)' },
  'INTC':  { yield: 0.00, months: [],              note: 'Intel (sospeso 2024)' },
  'AMD':   { yield: 0.00, months: [] },
  'ORCL':  { yield: 1.30, months: [2, 5, 8, 11],  note: 'Oracle' },
  'CRM':   { yield: 0.00, months: [] },
  'ADBE':  { yield: 0.00, months: [] },
  'CSCO':  { yield: 2.90, months: [1, 4, 7, 10],  note: 'Cisco' },

  // Communication
  'GOOGL': { yield: 0.46, months: [3, 6, 9, 12],  note: 'Alphabet A (dist. dal 2024)' },
  'GOOG':  { yield: 0.46, months: [3, 6, 9, 12],  note: 'Alphabet C' },
  'META':  { yield: 0.38, months: [3, 6, 9, 12],  note: 'Meta Platforms (dist. dal 2024)' },
  'DIS':   { yield: 0.00, months: [],              note: 'Disney (sospeso)' },
  'NFLX':  { yield: 0.00, months: [] },
  'T':     { yield: 6.40, months: [2, 5, 8, 11],  note: 'AT&T' },
  'VZ':    { yield: 6.50, months: [2, 5, 8, 11],  note: 'Verizon' },

  // Consumer Discretionary
  'AMZN':  { yield: 0.00, months: [] },
  'TSLA':  { yield: 0.00, months: [] },
  'NKE':   { yield: 1.65, months: [1, 4, 7, 10],  note: 'Nike' },
  'HD':    { yield: 2.30, months: [3, 6, 9, 12],  note: 'Home Depot' },
  'MCD':   { yield: 2.31, months: [3, 6, 9, 12],  note: "McDonald's" },
  'SBUX':  { yield: 2.55, months: [2, 5, 8, 11],  note: 'Starbucks' },
  'TGT':   { yield: 3.30, months: [3, 6, 9, 12],  note: 'Target' },
  'LOW':   { yield: 1.70, months: [2, 5, 8, 11],  note: "Lowe's" },

  // Consumer Staples
  'PG':    { yield: 2.32, months: [2, 5, 8, 11],  note: 'Procter & Gamble' },
  'KO':    { yield: 3.00, months: [1, 4, 7, 10],  note: 'Coca-Cola' },
  'PEP':   { yield: 3.05, months: [1, 4, 7, 10],  note: 'PepsiCo' },
  'WMT':   { yield: 1.02, months: [1, 4, 7, 10],  note: 'Walmart' },
  'COST':  { yield: 0.60, months: [2, 5, 8, 11],  note: 'Costco' },
  'PM':    { yield: 5.10, months: [1, 4, 7, 10],  note: 'Philip Morris' },
  'MO':    { yield: 8.50, months: [1, 4, 7, 10],  note: 'Altria' },

  // Healthcare
  'ABBV':  { yield: 3.50, months: [2, 5, 8, 11],  note: 'AbbVie' },
  'JNJ':   { yield: 2.90, months: [3, 6, 9, 12],  note: 'Johnson & Johnson' },
  'LLY':   { yield: 0.68, months: [3, 6, 9, 12],  note: 'Eli Lilly' },
  'UNH':   { yield: 1.60, months: [3, 6, 9, 12],  note: 'UnitedHealth' },
  'MRK':   { yield: 2.65, months: [1, 4, 7, 10],  note: 'Merck' },
  'PFE':   { yield: 6.50, months: [3, 6, 9, 12],  note: 'Pfizer' },
  'TMO':   { yield: 0.25, months: [1, 4, 7, 10],  note: 'Thermo Fisher' },
  'ABT':   { yield: 1.85, months: [2, 5, 8, 11],  note: 'Abbott' },
  'MDT':   { yield: 3.60, months: [1, 4, 7, 10],  note: 'Medtronic' },

  // Finance
  'AXP':   { yield: 1.20, months: [2, 5, 8, 11],  note: 'American Express' },
  'V':     { yield: 0.78, months: [3, 6, 9, 12],  note: 'Visa' },
  'MA':    { yield: 0.54, months: [2, 5, 8, 11],  note: 'Mastercard' },
  'JPM':   { yield: 2.25, months: [1, 4, 7, 10],  note: 'JPMorgan Chase' },
  'BAC':   { yield: 2.35, months: [3, 6, 9, 12],  note: 'Bank of America' },
  'BRK.B': { yield: 0.00, months: [],              note: 'Berkshire (nessun dividendo)' },
  'GS':    { yield: 2.50, months: [3, 6, 9, 12],  note: 'Goldman Sachs' },
  'MS':    { yield: 3.45, months: [2, 5, 8, 11],  note: 'Morgan Stanley' },
  'BLK':   { yield: 2.80, months: [3, 6, 9, 12],  note: 'BlackRock' },
  'SCHW':  { yield: 1.50, months: [2, 5, 8, 11],  note: 'Charles Schwab' },

  // Energy
  'XOM':   { yield: 3.52, months: [3, 6, 9, 12],  note: 'ExxonMobil' },
  'CVX':   { yield: 4.12, months: [3, 6, 9, 12],  note: 'Chevron' },
  'COP':   { yield: 1.60, months: [2, 5, 8, 11],  note: 'ConocoPhillips' },

  // Industrials
  'CAT':   { yield: 1.62, months: [2, 5, 8, 11],  note: 'Caterpillar' },
  'GE':    { yield: 0.10, months: [3, 6, 9, 12],  note: 'GE Aerospace' },
  'HON':   { yield: 2.10, months: [3, 6, 9, 12],  note: 'Honeywell' },
  'UPS':   { yield: 4.55, months: [3, 6, 9, 12],  note: 'UPS' },
  'RTX':   { yield: 2.20, months: [2, 5, 8, 11],  note: 'RTX Corp' },

  // Real Estate (REIT individuali)
  'O':     { yield: 5.50, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], note: 'Realty Income (mensile!)' },
  'AMT':   { yield: 2.80, months: [2, 5, 8, 11],  note: 'American Tower' },
  'PLD':   { yield: 2.78, months: [3, 6, 9, 12],  note: 'Prologis' },
  'SPG':   { yield: 5.20, months: [1, 4, 7, 10],  note: 'Simon Property' },

  // ── AZIONI SINGOLE UK (GBP) ───────────────────────────────────────────────

  'CCL.L':  { yield: 1.50, months: [2, 8],         note: 'Carnival (semestrale)' },
  'BP.L':   { yield: 5.80, months: [3, 6, 9, 12],  note: 'BP' },
  'SHEL.L': { yield: 4.20, months: [3, 6, 9, 12],  note: 'Shell' },
  'HSBA.L': { yield: 7.50, months: [4, 10],         note: 'HSBC (semestrale)' },
  'AZN.L':  { yield: 1.90, months: [3, 9],          note: 'AstraZeneca (semestrale)' },
  'GSK.L':  { yield: 3.80, months: [4, 10],         note: 'GSK (semestrale)' },
  'RIO.L':  { yield: 7.20, months: [4, 10],         note: 'Rio Tinto (semestrale)' },
  'VOD.L':  { yield: 9.50, months: [2, 8],          note: 'Vodafone (semestrale)' },

  // Specifici usati in SPYD, etc.
  'IBM':    { yield: 3.10, months: [3, 6, 9, 12],  note: 'IBM' },
  'VNQ':    { yield: 4.20, months: [3, 6, 9, 12],  note: 'Vanguard Real Estate ETF' },
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Restituisce le info dividendo per un ticker.
 * Prova il ticker esatto, poi rimuove il suffisso borsa (.MI, .L, .DE…).
 * @param {string} ticker
 * @returns {{ yield: number, months: number[], note?: string }}
 */
/**
 * Restituisce tutti i ticker ETF nel database con i loro dati, per il simulatore.
 */
export function getAllEtfDividendEntries() {
  return Object.entries(DIVIDEND_DB).map(([ticker, data]) => ({
    ticker,
    name: data.note || ticker,
    yieldPct: data.yield || 0,
    months: data.months || [],
    frequency: data.months?.length >= 11 ? 'Monthly'
             : data.months?.length >= 5  ? 'SemiAnnual'
             : data.months?.length >= 3  ? 'Quarterly' : 'Annual',
    type: 'ETF',
    sector: 'ETF',
  }));
}

export function getDividendInfo(ticker) {
  if (!ticker) return { yield: 0, months: [], note: '' };
  const t = ticker.toUpperCase().trim();

  // 1. Match esatto
  if (DIVIDEND_DB[t]) return DIVIDEND_DB[t];

  // 2. Senza suffisso borsa (es. MSFT.O → MSFT)
  const base = t.split('.')[0];
  if (base !== t && DIVIDEND_DB[base]) return DIVIDEND_DB[base];

  // 3. Non trovato → nessuna distribuzione (accum o non in DB)
  return { yield: 0, months: [], note: '' };
}

/**
 * Restituisce la frequenza testuale (es. "Trimestrale", "Mensile") dato il numero di mesi.
 */
export function getFrequencyLabel(monthsCount) {
  switch (monthsCount) {
    case 12: return 'Mensile';
    case 6:  return 'Bimestrale';
    case 4:  return 'Trimestrale';
    case 3:  return 'Quadrimestrale';
    case 2:  return 'Semestrale';
    case 1:  return 'Annuale';
    case 0:  return 'Accumulante';
    default: return `${12 / monthsCount}x/anno`;
  }
}
