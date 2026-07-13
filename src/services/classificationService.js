/**
 * classificationService.js
 *
 * FONTE DI VERITÀ UNICA per la classificazione di un holding.
 *
 * Non usa il campo macroCategory salvato nella transazione (generico e
 * inaffidabile), ma DERIVA la categoria dal database di composizione
 * (etfComposition.js) tramite il ticker/ISIN. Questo dà una tassonomia
 * coerente per la torta di allocazione: azionario globale, settoriale,
 * emergenti, obbligazionario, ecc.
 *
 * Per i ticker sconosciuti (non nel DB) ripiega sul dato salvato e il titolo
 * viene comunque segnalato dal flusso "titoli mancanti" → quando il DB si
 * aggiorna, la classificazione migliora automaticamente per tutti.
 */

import { getCompositionProfile, getSubCategory, MICRO_SUB_CATEGORIES } from '../data/etfComposition';

const MACRO_LABELS = {
  equity:     'Azioni',
  bond:       'Obbligazioni',
  commodity:  'Materie Prime',
  realEstate: 'Immobiliare',
  crypto:     'Crypto',
  cash:       'Liquidità',
};

const MACRO_COLORS = {
  equity:     '#0A84FF',
  bond:       '#30D158',
  commodity:  '#FF9F0A',
  realEstate: '#BF5AF2',
  crypto:     '#FF453A',
  cash:       '#8E8E93',
  unknown:    '#636366',
};

/**
 * Classifica un holding.
 * @param {Object} holding { ticker, isin, macroCategory, microCategory, isCash }
 * @returns {{ microKey, microLabel, macroKey, macroLabel, color, macroColor, derived }}
 */
export function classifyHolding(holding = {}) {
  const { ticker, macroCategory, microCategory, isCash } = holding;

  // Cash
  if (isCash || macroCategory === 'Cash') {
    return {
      microKey: 'cash', microLabel: 'Liquidità',
      macroKey: 'cash', macroLabel: 'Liquidità',
      color: '#8E8E93', macroColor: MACRO_COLORS.cash, derived: true,
    };
  }

  // Profilo dal DB di composizione (se _isFallback → non è un match vero)
  const profile = getCompositionProfile(ticker, macroCategory);
  if (profile && !profile._isFallback) {
    const microKey = getSubCategory(ticker);
    const meta = MICRO_SUB_CATEGORIES[microKey];
    if (meta && meta.macro) {
      return {
        microKey,
        microLabel: meta.label,
        macroKey:   meta.macro,
        macroLabel: MACRO_LABELS[meta.macro] || 'Altro',
        color:      meta.color,
        macroColor: MACRO_COLORS[meta.macro] || MACRO_COLORS.unknown,
        derived: true,
      };
    }
  }

  // ── Ticker non trovato nel DB: classifica dal tipo di attivo salvato ────────
  const storedMacro = (macroCategory || '').trim();
  const m = storedMacro.toLowerCase();

  // Azioni singole (anche salvate con codice broker tipo MSF, RY6, 3V64):
  // sappiamo che sono azioni dal macroCategory → "Azioni singole", non "Da classificare".
  const STOCK_CATS = ['azioni', 'azione', 'stock', 'stocks', 'reit', 'reits', 'bdc', 'equity'];
  if (STOCK_CATS.includes(m)) {
    return {
      microKey: 'equity_single', microLabel: 'Azioni singole',
      macroKey: 'equity', macroLabel: MACRO_LABELS.equity,
      color: MICRO_SUB_CATEGORIES.equity_single?.color || '#AC8E68',
      macroColor: MACRO_COLORS.equity, derived: false, // classe nota, ticker da mappare
    };
  }
  // Obbligazioni / commodity / crypto / immobiliare salvate ma senza profilo
  const CAT_MAP = {
    obbligazioni: ['bond', 'Obbligazioni'], obbligazionario: ['bond', 'Obbligazioni'],
    'materie prime': ['commodity', 'Materie Prime'], commodity: ['commodity', 'Materie Prime'],
    crypto: ['crypto', 'Crypto'], immobiliare: ['realEstate', 'Immobiliare'],
  };
  if (CAT_MAP[m]) {
    const [mk, ml] = CAT_MAP[m];
    return { microKey: 'altro', microLabel: ml, macroKey: mk, macroLabel: ml, color: MACRO_COLORS[mk], macroColor: MACRO_COLORS[mk], derived: false };
  }

  // Contenitori (ETF/ETC/ETN) senza profilo: è un fondo azionario ma non sappiamo il sotto-tipo.
  const WRAPPERS = ['etf', 'etc', 'etn', 'etp'];
  if (WRAPPERS.includes(m)) {
    return {
      microKey: 'altro', microLabel: 'ETF da mappare',
      macroKey: 'equity', macroLabel: MACRO_LABELS.equity,
      color: '#8E8E93', macroColor: MACRO_COLORS.equity, derived: false,
    };
  }

  // Davvero ignoto
  return {
    microKey: 'altro', microLabel: microCategory || 'Da classificare',
    macroKey: 'unknown', macroLabel: 'Da classificare',
    color: '#636366', macroColor: MACRO_COLORS.unknown, derived: false,
  };
}

// ── Terzo livello: STILE / FATTORE ────────────────────────────────────────────
// Es. "Azionario globale" → Momentum / Quality / Value / Small Cap / High Dividend
//     "Materie prime" → Oro / Argento / Ampie / Energia
const STYLE_COLORS = {
  'Cap-weighted (ampio)': '#0A84FF',
  'Momentum':             '#BF5AF2',
  'Quality':              '#5E5CE6',
  'Value':                '#FF9F0A',
  'Small Cap':            '#FF6B35',
  'Minimum Volatility':   '#64D2FF',
  'High Dividend':        '#30D158',
  'Growth':               '#FF453A',
  'Azioni singole':       '#AC8E68',
  'Oro':                  '#FFD60A',
  'Argento':              '#AEAEB2',
  'Materie prime':        '#FF9F0A',
  'Energia':              '#FF6B35',
  'Immobiliare (REIT)':   '#BF5AF2',
  'Crypto':               '#FF453A',
  'Obbligazionario':      '#30D158',
  'Da classificare':      '#636366',
  'Liquidità':            '#8E8E93',
};

export function classifyStyle(holding = {}) {
  const { ticker, isCash, macroCategory } = holding;
  if (isCash || macroCategory === 'Cash') return { label: 'Liquidità', color: STYLE_COLORS['Liquidità'] };

  const profile = getCompositionProfile(ticker, macroCategory);
  if (!profile || profile._isFallback) {
    return { label: 'Da classificare', color: STYLE_COLORS['Da classificare'] };
  }

  // Materie prime → quale
  if (profile.assetType === 'commodity') {
    const th = (profile.topHoldings?.[0]?.name || '').toLowerCase();
    const ct = profile._commodityType;
    if (th.includes('oro') || th.includes('gold'))       return { label: 'Oro', color: STYLE_COLORS['Oro'] };
    if (th.includes('argento') || th.includes('silver')) return { label: 'Argento', color: STYLE_COLORS['Argento'] };
    if (ct === 'energy')                                 return { label: 'Energia', color: STYLE_COLORS['Energia'] };
    return { label: 'Materie prime', color: STYLE_COLORS['Materie prime'] };
  }
  if (profile.assetType === 'real-estate') return { label: 'Immobiliare (REIT)', color: STYLE_COLORS['Immobiliare (REIT)'] };
  if (profile.assetType === 'crypto')      return { label: 'Crypto', color: STYLE_COLORS['Crypto'] };
  if (profile.assetType === 'bond')        return { label: 'Obbligazionario', color: STYLE_COLORS['Obbligazionario'] };

  // Azione singola → un solo secchio (non è uno "stile" fattoriale)
  if (profile._isDirectStock) return { label: 'Azioni singole', color: STYLE_COLORS['Azioni singole'] };

  // ETF azionario → FATTORE DOMINANTE singolo (nessun multifattoriale, nessun settore)
  const f = profile.factors || {};
  const scored = [
    ['Momentum',           f.momentum ?? 0],
    ['Quality',            f.quality  ?? 0],
    ['Value',              f.value    ?? 0],
    ['Small Cap',        -(f.size     ?? 0)],  // size negativo = small cap
    ['Minimum Volatility', f.lowVol   ?? 0],
    ['High Dividend',      f.yield    ?? 0],
    ['Growth',             f.growth   ?? 0],
  ];
  const top = scored.reduce((a, b) => (b[1] > a[1] ? b : a));
  // Soglia: sotto 0.8 non c'è un vero tilt → indice ampio pesato per cap
  if (top[1] >= 0.8) return { label: top[0], color: STYLE_COLORS[top[0]] };
  return { label: 'Cap-weighted (ampio)', color: STYLE_COLORS['Cap-weighted (ampio)'] };
}

/**
 * Aggrega gli holdings per STILE/FATTORE (terzo livello).
 */
export function buildStyleAllocation(holdings = []) {
  const map = {};
  let total = 0;
  holdings.forEach(h => {
    const v = h.marketValue || 0;
    if (v <= 0) return;
    total += v;
    const s = classifyStyle(h);
    if (!map[s.label]) map[s.label] = { key: s.label, name: s.label, color: s.color, value: 0 };
    map[s.label].value += v;
  });
  return Object.values(map)
    .map(x => ({ ...x, percentage: total > 0 ? +((x.value / total) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Aggrega un elenco di holdings per micro-categoria derivata.
 * @param {Array} holdings [{ ...holding, marketValue }]
 * @returns {{ micro: Array, macro: Array, total, underivedValue }}
 */
export function buildAllocation(holdings = []) {
  const microMap = {};
  const macroMap = {};
  let total = 0;
  let underivedValue = 0;

  holdings.forEach(h => {
    const v = h.marketValue || 0;
    if (v <= 0) return;
    total += v;
    const c = classifyHolding(h);
    if (!c.derived && !h.isCash) underivedValue += v;

    if (!microMap[c.microKey]) microMap[c.microKey] = { key: c.microKey, name: c.microLabel, color: c.color, value: 0, macroKey: c.macroKey };
    microMap[c.microKey].value += v;

    if (!macroMap[c.macroKey]) macroMap[c.macroKey] = { key: c.macroKey, name: c.macroLabel, color: c.macroColor, value: 0 };
    macroMap[c.macroKey].value += v;
  });

  const withPct = (obj) => Object.values(obj)
    .map(x => ({ ...x, percentage: total > 0 ? +((x.value / total) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.value - a.value);

  return {
    micro: withPct(microMap),
    macro: withPct(macroMap),
    total,
    underivedValue,
    undivedPct: total > 0 ? (underivedValue / total) * 100 : 0,
  };
}

export default { classifyHolding, buildAllocation };
