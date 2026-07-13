/**
 * Portfolio Configuration Service
 * Gestisce portafogli, assegnazioni ticker→portafoglio, alias e target di allocazione.
 * Tutti i dati sono persistiti in localStorage.
 */

const KEY = 'inv_portfolio_config_v1';

// ── Costanti UI ──────────────────────────────────────────────────────────────

export const MACRO_CATEGORIES = [
  { key: 'equity',     label: 'Azionario',      color: '#0A84FF', emoji: '📈' },
  { key: 'bond',       label: 'Obbligazionario', color: '#30D158', emoji: '🏦' },
  { key: 'commodity',  label: 'Materie prime',   color: '#FF9F0A', emoji: '🥇' },
  { key: 'realEstate', label: 'Immobiliare',     color: '#BF5AF2', emoji: '🏠' },
  { key: 'crypto',     label: 'Crypto',          color: '#FF453A', emoji: '₿'  },
  { key: 'cash',       label: 'Liquidità',       color: '#32ADE6', emoji: '💵' },
];

export const PRESET_TARGETS = [
  { name: 'Crescita 100%',    icon: '🚀', target: { equity: 100, bond: 0,  commodity: 0, realEstate: 0, crypto: 0, cash: 0 } },
  { name: 'Crescita 80/20',   icon: '📈', target: { equity: 80,  bond: 20, commodity: 0, realEstate: 0, crypto: 0, cash: 0 } },
  { name: 'Bilanciato 60/40', icon: '⚖️', target: { equity: 60,  bond: 40, commodity: 0, realEstate: 0, crypto: 0, cash: 0 } },
  { name: 'Difensivo',        icon: '🛡', target: { equity: 40,  bond: 50, commodity: 10, realEstate: 0, crypto: 0, cash: 0 } },
  { name: 'All Weather',      icon: '🌤', target: { equity: 30,  bond: 55, commodity: 10, realEstate: 0, crypto: 0, cash: 5 } },
];

export const PORTFOLIO_COLORS = [
  '#0A84FF', '#30D158', '#FF9F0A', '#FF453A', '#BF5AF2',
  '#32ADE6', '#FF6961', '#AC8E68', '#64D2FF', '#5E5CE6',
];

export const PORTFOLIO_EMOJIS = [
  '📈', '💰', '🎯', '🛡', '🌍', '🏠', '🚀', '⚖️', '💼', '🌱',
  '🏦', '💎', '📊', '🔑', '⭐', '🌙', '🔥', '❤️', '🎖️', '🏆',
];

// ── Default config ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  portfolios: [],
  assignments: {},    // { [ticker]: portfolioId | null }
  aliases: {},        // { [ticker]: customDisplayName }
  globalTarget: null, // null = nessun target globale impostato
  globalThreshold: 5, // % tolleranza prima di alert
};

// ── Storage helpers ──────────────────────────────────────────────────────────

function getConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

function saveConfig(config) {
  localStorage.setItem(KEY, JSON.stringify(config));
  return config;
}

/** Legge la config raw (utile in componenti). */
export const getPortfolioConfig = getConfig;

// ── Portfolio CRUD ───────────────────────────────────────────────────────────

/**
 * Crea un nuovo portafoglio.
 * @returns {Object} il portafoglio creato
 */
export function createPortfolio({ name, color, emoji, description, targetAllocation, rebalanceThreshold }) {
  const config = getConfig();
  const portfolio = {
    id: `port_${Date.now()}`,
    name: name.trim(),
    color: color || PORTFOLIO_COLORS[config.portfolios.length % PORTFOLIO_COLORS.length],
    emoji: emoji || '📈',
    description: description?.trim() || '',
    targetAllocation: targetAllocation || null,  // null = nessun target
    rebalanceThreshold: rebalanceThreshold ?? 5,
    createdAt: new Date().toISOString(),
  };
  config.portfolios.push(portfolio);
  saveConfig(config);
  return portfolio;
}

/**
 * Aggiorna un portafoglio esistente.
 */
export function updatePortfolio(id, updates) {
  const config = getConfig();
  const idx = config.portfolios.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Portfolio not found: ' + id);
  config.portfolios[idx] = { ...config.portfolios[idx], ...updates };
  saveConfig(config);
  return config.portfolios[idx];
}

/**
 * Elimina un portafoglio e rimuove le assegnazioni dei suoi ticker.
 */
export function deletePortfolio(id) {
  const config = getConfig();
  config.portfolios = config.portfolios.filter(p => p.id !== id);
  Object.keys(config.assignments).forEach(ticker => {
    if (config.assignments[ticker] === id) delete config.assignments[ticker];
  });
  saveConfig(config);
}

// ── Assegnazioni ─────────────────────────────────────────────────────────────

/**
 * Assegna un singolo ticker a un portafoglio (null = rimuove assegnazione).
 */
export function assignTicker(ticker, portfolioId) {
  const config = getConfig();
  if (portfolioId === null || portfolioId === undefined) {
    delete config.assignments[ticker];
  } else {
    config.assignments[ticker] = portfolioId;
  }
  saveConfig(config);
}

/**
 * Assegna in bulk una lista di ticker allo stesso portafoglio.
 */
export function bulkAssign(tickers, portfolioId) {
  const config = getConfig();
  tickers.forEach(ticker => {
    if (portfolioId === null) delete config.assignments[ticker];
    else config.assignments[ticker] = portfolioId;
  });
  saveConfig(config);
}

/**
 * Restituisce il portfolioId assegnato a un ticker (o null).
 */
export function getPortfolioForTicker(ticker) {
  return getConfig().assignments[ticker] ?? null;
}

/**
 * Rimuove tutte le assegnazioni (tutti i ticker tornano "non assegnati").
 */
export function unassignAll() {
  const config = getConfig();
  config.assignments = {};
  saveConfig(config);
}

/**
 * Assegna tutti i ticker di una specifica macroCategory a un portafoglio.
 * @param {string} macroCategory  – es. 'Crypto', 'ETF', 'Azioni'
 * @param {string|null} portfolioId – null = rimuove assegnazione
 * @param {Array}  holdings       – array di holding con { ticker, macroCategory }
 */
export function assignByMacroCategory(macroCategory, portfolioId, holdings) {
  const keys = holdings
    .filter(h => (h.macroCategory || h.category || '').toLowerCase() === macroCategory.toLowerCase())
    .map(h => h.holdingKey || h.ticker);
  bulkAssign(keys, portfolioId);
}

// ── Alias (rinomina display) ─────────────────────────────────────────────────

/**
 * Imposta o rimuove un nome personalizzato per un ticker.
 */
export function setAlias(ticker, name) {
  const config = getConfig();
  const trimmed = name?.trim();
  if (!trimmed) delete config.aliases[ticker];
  else config.aliases[ticker] = trimmed;
  saveConfig(config);
}

/**
 * Restituisce il display name di un ticker (alias se presente, altrimenti il nome originale).
 */
export function getDisplayName(ticker, originalName, config) {
  const cfg = config || getConfig();
  return cfg.aliases[ticker] || originalName || ticker;
}

// ── Target globale ────────────────────────────────────────────────────────────

/**
 * Imposta o aggiorna il target di allocazione globale.
 */
export function updateGlobalTarget(target, threshold) {
  const config = getConfig();
  config.globalTarget = target;
  if (threshold != null) config.globalThreshold = threshold;
  saveConfig(config);
}

// ── Portfolio visibility (per YouTube / privacy) ─────────────────────────────

const HIDDEN_KEY = 'inv_hidden_portfolios_v1';

export function getHiddenPortfolioIds() {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY)) || []; }
  catch { return []; }
}

export function toggleHiddenPortfolio(id) {
  const cur = getHiddenPortfolioIds();
  const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
  return next;
}

export function clearHiddenPortfolios() {
  localStorage.removeItem(HIDDEN_KEY);
  return [];
}

// ── Macro allocation calculator ───────────────────────────────────────────────

/**
 * Calcola l'allocazione macro attuale da un array di holdings con market value.
 * Usa i profili ETF per determinare assetType di ciascuna posizione.
 *
 * @param {Array}    holdingsWithValues  [{ticker, marketValue, ...}]
 * @param {Function} getProfile          (ticker) => profile | null
 * @returns {{ equity, bond, commodity, realEstate, crypto, cash, uncoveredPct }}
 */
export function calcMacroAllocation(holdingsWithValues, getProfile) {
  const total = holdingsWithValues.reduce((s, h) => s + h.marketValue, 0);
  if (!total) return null;

  const buckets = { equity: 0, bond: 0, commodity: 0, realEstate: 0, crypto: 0, cash: 0 };
  let uncovered = 0;

  holdingsWithValues.forEach(h => {
    const profile = getProfile(h.ticker);
    const v = h.marketValue;

    if (!profile?.assetType) { uncovered += v; return; }

    switch (profile.assetType) {
      case 'equity':       buckets.equity     += v; break;
      case 'real-estate':  buckets.realEstate += v; break;
      case 'bond':         buckets.bond       += v; break;
      case 'money-market': buckets.cash       += v; break;
      case 'commodity':    buckets.commodity  += v; break;
      case 'crypto':       buckets.crypto     += v; break;
      case 'multi-asset': {
        const ep = (profile.equityPct ?? 50) / 100;
        const bp = (profile.bondPct   ?? 50) / 100;
        buckets.equity += v * ep;
        buckets.bond   += v * bp;
        break;
      }
      default: uncovered += v;
    }
  });

  // Converti in %
  const result = {};
  Object.keys(buckets).forEach(k => {
    result[k] = Math.round((buckets[k] / total) * 1000) / 10;
  });
  result.uncoveredPct = Math.round((uncovered / total) * 1000) / 10;
  return result;
}

/**
 * Calcola le azioni di ribilanciamento: quanto comprare/vendere per ogni categoria.
 * Restituisce anche il "consiglio prossimo versamento" per un importo dato.
 *
 * @param {Object} current   { equity: 82, bond: 14, ... }  (percentuali attuali)
 * @param {Object} target    { equity: 80, bond: 15, ... }  (percentuali target)
 * @param {number} totalValue  valore totale portafoglio in €
 * @param {number} nextContrib importo del prossimo versamento (opzionale)
 */
export function calcRebalancing(current, target, totalValue, nextContrib = 0) {
  const actions = MACRO_CATEGORIES.map(cat => {
    const cur  = current[cat.key]  ?? 0;
    const tgt  = target[cat.key]   ?? 0;
    const diff = cur - tgt;                          // + = sovrappeso, - = sottopeso
    const diffVal = (diff / 100) * totalValue;       // € da aggiustare
    return { ...cat, current: cur, target: tgt, diff, diffVal };
  }).filter(a => a.target > 0 || a.current > 0);

  // Consiglio prossimo versamento (greedy: metti tutto sulla categoria più sottopesata)
  let nextContribAdvice = [];
  if (nextContrib > 0) {
    const underweight = actions
      .filter(a => a.diff < 0)
      .sort((a, b) => a.diff - b.diff); // più negativo = più sottopesato

    if (underweight.length > 0) {
      // Distribuisci il versamento proporzionalmente al gap
      const totalGap = underweight.reduce((s, a) => s + Math.abs(a.diff), 0);
      nextContribAdvice = underweight.map(a => ({
        ...a,
        amount: Math.round((Math.abs(a.diff) / totalGap) * nextContrib),
      })).filter(a => a.amount > 0);
    }
  }

  return { actions, nextContribAdvice };
}
