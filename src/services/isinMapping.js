/**
 * ISIN → { ticker, macroCategory, microCategory }
 *
 * ticker     = Yahoo Finance ticker (es. SWDA.MI, MSFT)
 * Fonte ETF  : etf-catalog da qualeetf + integrazioni manuali
 * Fonte Stock: ISIN standard → ticker Yahoo Finance
 */

const ISIN_MAP = {

  // ── Azionario Globale ────────────────────────────────────────────────────
  'IE00B4L5Y983': { ticker: 'SWDA.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Globale' },   // iShares Core MSCI World
  'IE00BK5BQT80': { ticker: 'VWCE.DE',   macroCategory: 'ETF',   microCategory: 'Azionario Globale' },   // Vanguard FTSE All-World (Acc)
  'IE00B3RBWM25': { ticker: 'VWRL.L',    macroCategory: 'ETF',   microCategory: 'Azionario Globale' },   // Vanguard FTSE All-World (Dist)
  'IE00B6R52259': { ticker: 'IUSQ.DE',   macroCategory: 'ETF',   microCategory: 'Azionario Globale' },   // iShares MSCI ACWI
  'IE00B441G979': { ticker: 'FWRA.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Globale' },   // Invesco FTSE All-World
  'IE00077FRP95': { ticker: 'MEUD.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Globale' },   // Amundi MSCI World
  'IE00BD45KH83': { ticker: 'LCWD.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Globale' },   // L&G Core Global Equity
  'IE00B60SX394': { ticker: 'HMWO.L',    macroCategory: 'ETF',   microCategory: 'Azionario Globale' },   // HSBC MSCI World

  'IE00BFY0GT14': { ticker: 'SPPW.DE',  macroCategory: 'ETF',   microCategory: 'Azionario Globale' },   // SPDR MSCI World (Acc)

  // ── S&P 500 ──────────────────────────────────────────────────────────────
  'IE00B5BMR087': { ticker: 'CSPX.L',    macroCategory: 'ETF',   microCategory: 'Azionario USA' },       // iShares Core S&P 500 (LSE)
  'IE00BFMXXD54': { ticker: 'SXR8.DE',   macroCategory: 'ETF',   microCategory: 'Azionario USA' },       // iShares Core S&P 500 (Xetra)
  'IE00B3XXRP09': { ticker: 'VUAA.MI',   macroCategory: 'ETF',   microCategory: 'Azionario USA' },       // Vanguard S&P 500 (Acc)
  'IE00BKX55T58': { ticker: 'VUSA.MI',   macroCategory: 'ETF',   microCategory: 'Azionario USA' },       // Vanguard S&P 500 (Dist)
  'LU1681049097': { ticker: 'CSX5.DE',   macroCategory: 'ETF',   microCategory: 'Azionario USA' },       // Amundi S&P 500
  'IE00B3YCGJ38': { ticker: 'SPXS.MI',   macroCategory: 'ETF',   microCategory: 'Azionario USA' },       // SPDR S&P 500
  'IE00BYML9W36': { ticker: 'LSPU.MI',   macroCategory: 'ETF',   microCategory: 'Azionario USA' },       // L&G S&P 500

  // ── NASDAQ ───────────────────────────────────────────────────────────────
  'IE0032077012': { ticker: 'EQQQ.MI',   macroCategory: 'ETF',   microCategory: 'Azionario NASDAQ' },    // Invesco NASDAQ-100
  'IE00B53SZB19': { ticker: 'CNDX.MI',   macroCategory: 'ETF',   microCategory: 'Azionario NASDAQ' },    // iShares NASDAQ-100
  'LU1829221024': { ticker: 'LQQ.PA',    macroCategory: 'ETF',   microCategory: 'Azionario NASDAQ' },    // Amundi NASDAQ-100

  // ── Azionario Europa ─────────────────────────────────────────────────────
  'IE00B60SX170': { ticker: 'SMEA.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Europa' },    // iShares Core MSCI Europe
  'IE00B945VV12': { ticker: 'VEUR.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Europa' },    // Vanguard FTSE Developed Europe
  'LU0908500753': { ticker: 'LYYS.DE',   macroCategory: 'ETF',   microCategory: 'Azionario Europa' },    // Amundi MSCI Europe
  'IE00B60SX487': { ticker: 'SXRJ.DE',   macroCategory: 'ETF',   microCategory: 'Azionario Europa' },    // iShares Euro STOXX 50
  'DE0005933956': { ticker: 'EXW1.DE',   macroCategory: 'ETF',   microCategory: 'Azionario Europa' },    // iShares Euro STOXX 50 (DE)

  // ── Azionario Emergenti ──────────────────────────────────────────────────
  'IE00BKM4GZ66': { ticker: 'IS3N.DE',   macroCategory: 'ETF',   microCategory: 'Azionario Emergenti' }, // iShares Core MSCI EM IMI
  'IE00B3F81G20': { ticker: 'EMIM.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Emergenti' }, // iShares Core MSCI EM IMI (Dist)
  'IE00B3CNHF18': { ticker: 'VFEM.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Emergenti' }, // Vanguard FTSE Emerging Markets
  'IE00B469F816': { ticker: 'SEMA.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Emergenti' }, // SPDR MSCI Emerging Markets
  'LU1681045370': { ticker: 'AEEM.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Emergenti' }, // Amundi MSCI Emerging Markets
  'LU2009202107': { ticker: 'EMXC.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Emergenti' }, // Amundi MSCI Emerging Markets ex China
  'LU1650491282': { ticker: 'EMI.MI',    macroCategory: 'ETF',   microCategory: 'Obbligazioni' },        // Amundi/Lyxor EUR Govt Inflation-Linked Bond

  // ── Asia / Giappone ──────────────────────────────────────────────────────
  'IE00B02KXH56': { ticker: 'IJPA.L',    macroCategory: 'ETF',   microCategory: 'Azionario Asia' },      // iShares MSCI Japan IMI
  'IE00B95PGT31': { ticker: 'VJPN.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Asia' },      // Vanguard FTSE Japan
  'IE00B5WW6R17': { ticker: 'IASP.L',    macroCategory: 'ETF',   microCategory: 'Azionario Asia' },      // iShares MSCI Pacific ex-Japan

  // ── Small Cap / Value ────────────────────────────────────────────────────
  'IE00B3VVMM84': { ticker: 'IUSN.DE',   macroCategory: 'ETF',   microCategory: 'Azionario Small Cap' }, // iShares MSCI World Small Cap
  'IE00B42W4L06': { ticker: 'WSML.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Small Cap' }, // SPDR MSCI World Small Cap
  'IE00BSPLC413': { ticker: 'ZPRV.MI',   macroCategory: 'ETF',   microCategory: 'Azionario USA' },       // SPDR MSCI USA Small Cap Value
  'IE00BSPLC298': { ticker: 'ZPRX.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Europa' },    // SPDR MSCI Europe Small Cap Value

  // ── Factor ETF ───────────────────────────────────────────────────────────
  'IE00BL25JP72': { ticker: 'XDEM.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Globale' },   // Xtrackers MSCI World Momentum
  'IE00BL25JL35': { ticker: 'XDEQ.MI',   macroCategory: 'ETF',   microCategory: 'Azionario Globale' },   // Xtrackers MSCI World Quality
  'IE00BP3QZ825': { ticker: 'IWMO.L',    macroCategory: 'ETF',   microCategory: 'Azionario Globale' },   // iShares MSCI World Momentum
  'IE00BP3QZ601': { ticker: 'IWQU.L',    macroCategory: 'ETF',   microCategory: 'Azionario Globale' },   // iShares MSCI World Quality
  'IE00BP3QZB59': { ticker: 'IWVL.L',    macroCategory: 'ETF',   microCategory: 'Azionario Globale' },   // iShares MSCI World Value

  // ── Dividendi ────────────────────────────────────────────────────────────
  'IE00B8GKDB10': { ticker: 'VHYL.MI',   macroCategory: 'ETF',   microCategory: 'Dividendi' },           // Vanguard FTSE All-World High Div Yield (Dist)
  'IE00BK5BR626': { ticker: 'VGWE.MI',   macroCategory: 'ETF',   microCategory: 'Dividendi' },           // Vanguard FTSE All-World High Div Yield (Acc)
  'IE00B0M62Q58': { ticker: 'IDVY.MI',   macroCategory: 'ETF',   microCategory: 'Dividendi' },           // iShares Euro Dividend
  'IE00B652H904': { ticker: 'EUNY.MI',   macroCategory: 'ETF',   microCategory: 'Dividendi' },           // iShares EM Dividend
  'IE00B6YX5D40': { ticker: 'SPYD.MI',   macroCategory: 'ETF',   microCategory: 'Dividendi' },           // SPDR S&P US Dividend Aristocrats
  'IE00B9CQXS71': { ticker: 'ZPRG.DE',   macroCategory: 'ETF',   microCategory: 'Dividendi' },           // SPDR S&P Global Dividend Aristocrats

  // ── Immobiliare ──────────────────────────────────────────────────────────
  'IE00B1FZS350': { ticker: 'IWDP.MI',   macroCategory: 'ETF',   microCategory: 'Immobiliare' },         // iShares Developed Markets Property
  'IE00B8GF1M35': { ticker: 'EPRA.MI',   macroCategory: 'ETF',   microCategory: 'Immobiliare' },         // Amundi FTSE EPRA/NAREIT Global
  'IE00B83YJG36': { ticker: 'REIT.MI',   macroCategory: 'ETF',   microCategory: 'Immobiliare' },         // iShares European Property Yield

  // ── Settoriali ───────────────────────────────────────────────────────────
  'IE00B3WJKG14': { ticker: 'QDVE.DE',   macroCategory: 'ETF',   microCategory: 'Settoriale Tech' },     // iShares S&P 500 IT Sector
  'IE00BGDQ0L74': { ticker: 'XTEC.DE',   macroCategory: 'ETF',   microCategory: 'Settoriale Tech' },     // Xtrackers MSCI World IT
  'IE00B4BNMY34': { ticker: 'HEAL.MI',   macroCategory: 'ETF',   microCategory: 'Settoriale Health' },   // iShares S&P 500 Health Care
  'IE00BD4TXV59': { ticker: 'XHCA.DE',   macroCategory: 'ETF',   microCategory: 'Settoriale Health' },   // Xtrackers MSCI World Health Care
  'IE00BGDPWW94': { ticker: 'XENR.DE',   macroCategory: 'ETF',   microCategory: 'Settoriale Energia' },  // Xtrackers MSCI World Energy
  'IE00B4WXJK79': { ticker: 'XFIN.DE',   macroCategory: 'ETF',   microCategory: 'Settoriale Finanza' },  // Xtrackers MSCI World Financials

  // ── ESG ──────────────────────────────────────────────────────────────────
  'IE00BHZRR030': { ticker: 'SUWS.MI',   macroCategory: 'ETF',   microCategory: 'ESG' },                 // UBS MSCI World SRI
  'IE00BYVJRP78': { ticker: 'SUSW.MI',   macroCategory: 'ETF',   microCategory: 'ESG' },                 // iShares MSCI World SRI
  'IE00BK5BCH80': { ticker: 'LCWL.MI',   macroCategory: 'ETF',   microCategory: 'ESG' },                 // L&G Clean Energy

  // ── Obbligazionari Globali ───────────────────────────────────────────────
  'IE00BDBRDM35': { ticker: 'AGGH.MI',   macroCategory: 'ETF',   microCategory: 'Obbligazionario Globale' },
  'IE00BG47KJ78': { ticker: 'VAGF.MI',   macroCategory: 'ETF',   microCategory: 'Obbligazionario Globale' },
  'IE00BYZZ5V50': { ticker: 'XBAG.DE',   macroCategory: 'ETF',   microCategory: 'Obbligazionario Globale' },

  // ── Obbligazionari Governativi ───────────────────────────────────────────
  'IE00B3F81409': { ticker: 'IGLT.L',    macroCategory: 'ETF',   microCategory: 'Obbligazionario Gov' },
  'IE00B1FZSC47': { ticker: 'IBTS.MI',   macroCategory: 'ETF',   microCategory: 'Obbligazionario Gov' },
  'IE00B4WXJJ64': { ticker: 'CSBGE0.DE', macroCategory: 'ETF',   microCategory: 'Obbligazionario Gov' },
  'IE00BYXGMM52': { ticker: 'VETY.MI',   macroCategory: 'ETF',   microCategory: 'Obbligazionario Gov' },
  'IE00B3VTML14': { ticker: 'ETLB.MI',   macroCategory: 'ETF',   microCategory: 'Obbligazionario Gov' },

  // ── Obbligazionari Corporate ─────────────────────────────────────────────
  'IE00B3F81R35': { ticker: 'EUNA.DE',   macroCategory: 'ETF',   microCategory: 'Obbligazionario Corp' },
  'IE00BZ163G84': { ticker: 'VCBO.MI',   macroCategory: 'ETF',   microCategory: 'Obbligazionario Corp' },
  'IE00BF11F565': { ticker: 'IEAA.L',    macroCategory: 'ETF',   microCategory: 'Obbligazionario Corp' },
  'IE00B66F4759': { ticker: 'IHYG.MI',   macroCategory: 'ETF',   microCategory: 'High Yield' },
  'IE00B4PY7Y77': { ticker: 'HYLD.DE',   macroCategory: 'ETF',   microCategory: 'High Yield' },

  // ── Inflation-Linked ─────────────────────────────────────────────────────
  'IE00B3B8Q275': { ticker: 'IBCI.MI',   macroCategory: 'ETF',   microCategory: 'Inflation-Linked' },
  'IE00B3VTQ640': { ticker: 'TIPS.L',    macroCategory: 'ETF',   microCategory: 'Inflation-Linked' },

  // ── USD Treasury ─────────────────────────────────────────────────────────
  'IE00BSKRJZ44': { ticker: 'IDTL.L',    macroCategory: 'ETF',   microCategory: 'USD Treasury' },
  'IE00B3VWN179': { ticker: 'DTLA.L',    macroCategory: 'ETF',   microCategory: 'USD Treasury' },
  'IE00B3DKXQ41': { ticker: 'IBTM.L',    macroCategory: 'ETF',   microCategory: 'USD Treasury' },
  'IE00BGSF1W54': { ticker: 'IBTU.L',    macroCategory: 'ETF',   microCategory: 'USD Treasury' },
  'IE00BYSTBW60': { ticker: 'VDTY.L',    macroCategory: 'ETF',   microCategory: 'USD Treasury' },

  // ── USD Corporate ────────────────────────────────────────────────────────
  'IE00BYZTVT56': { ticker: 'LQDA.L',    macroCategory: 'ETF',   microCategory: 'USD Corporate' },
  'IE00BZ163K21': { ticker: 'VUCP.MI',   macroCategory: 'ETF',   microCategory: 'USD Corporate' },
  'IE00B3F81G35': { ticker: 'LQDE.L',    macroCategory: 'ETF',   microCategory: 'USD Corporate' },

  // ── EM Bond ──────────────────────────────────────────────────────────────
  'IE00B2NPKV68': { ticker: 'SEML.MI',   macroCategory: 'ETF',   microCategory: 'Obbligazionario EM' },
  'IE00BZ163M45': { ticker: 'VDEM.L',    macroCategory: 'ETF',   microCategory: 'Obbligazionario EM' },
  'LU1507526163': { ticker: 'EMBE.MI',   macroCategory: 'ETF',   microCategory: 'Obbligazionario EM' },

  // ── ESG Bond ─────────────────────────────────────────────────────────────
  'LU2145461893': { ticker: 'CLMA.MI',   macroCategory: 'ETF',   microCategory: 'ESG Bond' },

  // ── Ultra-Short / Monetario ──────────────────────────────────────────────
  'LU0290358497': { ticker: 'XEON.DE',   macroCategory: 'ETF',   microCategory: 'Monetario' },
  'LU1190417599': { ticker: 'CSH2.PA',   macroCategory: 'ETF',   microCategory: 'Monetario' },
  'IE00B4WXJJ65': { ticker: 'IBGS.L',    macroCategory: 'ETF',   microCategory: 'Monetario' },
  'IE00BLDGH553': { ticker: 'IEGE.MI',   macroCategory: 'ETF',   microCategory: 'Obbligazionario Gov' },

  // ── LifeStrategy / Bilanciati ────────────────────────────────────────────
  'IE00BGSF1X88': { ticker: 'V20A.DE',   macroCategory: 'ETF',   microCategory: 'Multi-Asset' },
  'IE00BMVB5P51': { ticker: 'V40A.DE',   macroCategory: 'ETF',   microCategory: 'Multi-Asset' },
  'IE00BLLZQL78': { ticker: 'V60A.DE',   macroCategory: 'ETF',   microCategory: 'Multi-Asset' },
  'IE00BGDS8G36': { ticker: 'V80A.DE',   macroCategory: 'ETF',   microCategory: 'Multi-Asset' },

  // ── Metalli Preziosi / Materie Prime ─────────────────────────────────────
  'IE00B4ND3602': { ticker: 'SGLN.MI',   macroCategory: 'ETF',   microCategory: 'Oro' },                 // iShares Physical Gold
  'IE00B579F325': { ticker: 'SGLD.MI',   macroCategory: 'ETF',   microCategory: 'Oro' },                 // Invesco Physical Gold
  'JE00B1VS3770': { ticker: 'PHAU.MI',   macroCategory: 'ETF',   microCategory: 'Oro' },                 // WisdomTree Physical Gold
  'IE00BDFL4P12': { ticker: 'CMOD.MI',   macroCategory: 'ETF',   microCategory: 'Materie Prime' },       // iShares Bloomberg Commodity
  'GB00B15KYG56': { ticker: 'AIGI.MI',   macroCategory: 'ETF',   microCategory: 'Materie Prime' },       // WisdomTree Industrial Metals

  // ── Crypto ETP ───────────────────────────────────────────────────────────
  'CH1134541153': { ticker: 'BTCE.DE',   macroCategory: 'Crypto', microCategory: 'Bitcoin' },
  'XS2376095068': { ticker: 'VBTC.L',    macroCategory: 'Crypto', microCategory: 'Bitcoin' },

  // ── Azioni individuali (ISIN → ticker Yahoo Finance reale) ───────────────
  'US5949181045': { ticker: 'MSFT',      macroCategory: 'Azioni',  microCategory: 'Large Cap' },  // Microsoft
  'US7561091049': { ticker: 'O',         macroCategory: 'Azioni',  microCategory: 'Large Cap' },  // Realty Income
  'US0258161092': { ticker: 'AXP',       macroCategory: 'Azioni',  microCategory: 'Large Cap' },  // American Express
  'US00287Y1091': { ticker: 'ABBV',      macroCategory: 'Azioni',  microCategory: 'Large Cap' },  // AbbVie
  'US04010L1035': { ticker: 'ARCC',      macroCategory: 'Azioni',  microCategory: 'Large Cap' },  // Ares Capital (BDC)
  'US56035L1044': { ticker: 'MAIN',      macroCategory: 'Azioni',  microCategory: 'Large Cap' },  // Main Street Capital (BDC)
  'BMG2004J1036': { ticker: 'CCL',       macroCategory: 'Azioni',  microCategory: 'Large Cap' },  // Carnival Corp (NYSE, dopo corporate action da CCL.L)
  'US5801351017': { ticker: 'MCD',       macroCategory: 'Azioni',  microCategory: 'Large Cap' },  // McDonald's
  'US92826C8394': { ticker: 'V',         macroCategory: 'Azioni',  microCategory: 'Large Cap' },  // Visa
  'US6541061031': { ticker: 'NKE',       macroCategory: 'Azioni',  microCategory: 'Large Cap' },  // Nike
  'GB0031215220': { ticker: 'CCL.L',     macroCategory: 'Azioni',  microCategory: 'Large Cap' },  // Carnival PLC
}

/**
 * Lookup ISIN → { ticker, macroCategory, microCategory }
 * Ritorna null se l'ISIN non è in mappa (usa fallback nell'import)
 */
export function lookupISIN(isin) {
  if (!isin) return null
  return ISIN_MAP[isin.trim().toUpperCase()] || null
}

export default ISIN_MAP
