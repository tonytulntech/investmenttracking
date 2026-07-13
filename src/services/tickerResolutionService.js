/**
 * tickerResolutionService.js
 *
 * Sistema di risoluzione intelligente per ticker non riconosciuti.
 *
 * Strategie (in ordine di priorità):
 *  1. Exchange variant — stesso ETF su una borsa diversa (SWDA.L → SWDA.MI)
 *  2. Profile match   — cerca altri ETF con lo stesso profilo, trovato per keyword sul nome
 *
 * Gli alias accettati dall'utente vengono salvati in localStorage e applicati
 * trasparentemente in getRemoteProfile() / getRemoteTer().
 *
 * Alias storage format: { 'ORIGINAL_TICKER': 'RESOLVED_TICKER', ... }
 */

import { _getRawDatabase, getCompositionProfile } from '../data/etfComposition';
import { getRemoteProfile, getTickerAliases } from './etfDatabaseService';

// ── Exchange metadata ─────────────────────────────────────────────────────────
export const EXCHANGE_METADATA = {
  'MI': { name: 'Borsa Italiana',          currency: 'EUR', flag: '🇮🇹', priority: 1 },
  'DE': { name: 'Deutsche Börse (XETRA)',  currency: 'EUR', flag: '🇩🇪', priority: 2 },
  'PA': { name: 'Euronext Paris',          currency: 'EUR', flag: '🇫🇷', priority: 3 },
  'AS': { name: 'Euronext Amsterdam',      currency: 'EUR', flag: '🇳🇱', priority: 4 },
  'BR': { name: 'Euronext Brussels',       currency: 'EUR', flag: '🇧🇪', priority: 5 },
  'MC': { name: 'Bolsa de Madrid',         currency: 'EUR', flag: '🇪🇸', priority: 6 },
  'VI': { name: 'Wiener Börse',            currency: 'EUR', flag: '🇦🇹', priority: 7 },
  'SN': { name: 'Euronext Lisbon',         currency: 'EUR', flag: '🇵🇹', priority: 8 },
  'L':  { name: 'London Stock Exchange',   currency: 'GBP', flag: '🇬🇧', priority: 9 },
  'SW': { name: 'SIX Swiss Exchange',      currency: 'CHF', flag: '🇨🇭', priority: 10 },
  'HE': { name: 'Nasdaq Helsinki',         currency: 'EUR', flag: '🇫🇮', priority: 11 },
  'CO': { name: 'Nasdaq Copenhagen',       currency: 'DKK', flag: '🇩🇰', priority: 12 },
  'ST': { name: 'Nasdaq Stockholm',        currency: 'SEK', flag: '🇸🇪', priority: 13 },
  'AX': { name: 'Australian Securities Exchange', currency: 'AUD', flag: '🇦🇺', priority: 14 },
};

/** All supported exchange suffixes, sorted by priority (EUR first) */
const ALL_SUFFIXES = Object.entries(EXCHANGE_METADATA)
  .sort((a, b) => a[1].priority - b[1].priority)
  .map(([sfx]) => sfx);

// ── Alias storage re-exports (stored in etfDatabaseService to avoid circular deps) ──
// Alias CRUD: getTickerAliases, setTickerAlias, removeTickerAlias, clearAllTickerAliases
// → importa da etfDatabaseService

// ── Ticker parsing ────────────────────────────────────────────────────────────

/**
 * Splits "SWDA.MI" into { base: "SWDA", exchangeSuffix: "MI" }.
 * Returns { base: ticker, exchangeSuffix: null } if no suffix.
 */
export function getBaseAndExchange(ticker) {
  if (!ticker) return { base: '', exchangeSuffix: null };
  const t = ticker.toUpperCase();
  const dot = t.lastIndexOf('.');
  if (dot === -1) return { base: t, exchangeSuffix: null };
  const sfx = t.slice(dot + 1);
  // Only treat as exchange suffix if it's in our known list
  if (EXCHANGE_METADATA[sfx] || ['OQ', 'N', 'O', 'T', 'TO'].includes(sfx)) {
    return { base: t.slice(0, dot), exchangeSuffix: sfx };
  }
  return { base: t, exchangeSuffix: null };
}

// ── Profile reverse index ─────────────────────────────────────────────────────

let _profileToTickers = null;

function getProfileToTickers() {
  if (_profileToTickers) return _profileToTickers;
  const { tickers } = _getRawDatabase();
  const index = {};
  for (const [ticker, profileKey] of Object.entries(tickers)) {
    if (!index[profileKey]) index[profileKey] = [];
    index[profileKey].push(ticker);
  }
  // Sort each list: EUR exchanges first, then by priority
  for (const key of Object.keys(index)) {
    index[key].sort((a, b) => {
      const { exchangeSuffix: sa } = getBaseAndExchange(a);
      const { exchangeSuffix: sb } = getBaseAndExchange(b);
      const pa = sa ? (EXCHANGE_METADATA[sa]?.priority ?? 99) : 0;
      const pb = sb ? (EXCHANGE_METADATA[sb]?.priority ?? 99) : 0;
      return pa - pb;
    });
  }
  _profileToTickers = index;
  return index;
}

/** Returns up to `max` tickers that share a given profile key, preferring EUR exchanges. */
export function getTickersForProfile(profileKey, max = 6) {
  const idx = getProfileToTickers();
  return (idx[profileKey] || []).slice(0, max);
}

// ── Name-based profile guessing ───────────────────────────────────────────────

const KEYWORD_PROFILE_MAP = [
  // Azionario globale
  { kws: ['msci world acc',      'core msci world'], pk: 'msci_world' },
  { kws: ['msci world'], pk: 'msci_world' },
  { kws: ['ftse all-world', 'ftse all world', 'all-world', 'all world ucits'], pk: 'ftse_all_world' },
  { kws: ['s&p 500', 'sp 500', 'sp500', 's&p500', 'standard & poor'], pk: 'sp500' },
  { kws: ['nasdaq-100', 'nasdaq 100', 'nasdaq100', 'ndx 100'], pk: 'nasdaq100' },
  { kws: ['msci europe', 'ftse developed europe'], pk: 'msci_europe' },
  { kws: ['euro stoxx 50', 'eurostoxx 50', 'euro stoxx50'], pk: 'euro_stoxx50' },
  { kws: ['stoxx europe 600', 'stoxx 600', 'europe 600'], pk: 'stoxx_europe_600' },
  { kws: ['msci emerging markets', 'em imi', 'msci em imi', 'ftse emerging', 'emerging market'], pk: 'msci_em' },
  { kws: ['msci japan', 'ftse japan'], pk: 'msci_japan' },
  { kws: ['msci india', 'nifty 50'], pk: 'msci_india' },
  { kws: ['msci pacific', 'pacific ex japan', 'pacific ex-japan'], pk: 'msci_pacific_exjp' },
  { kws: ['world small cap', 'small cap world', 'msci world small'], pk: 'msci_world_sc' },
  { kws: ['small cap value', 'us small cap value', 'small-cap value'], pk: 'us_smallcap_value' },
  // Obbligazionario
  { kws: ['global aggregate', 'bloomberg global agg'], pk: 'global_aggregate_bond' },
  { kws: ['euro aggregate', 'eur aggregate', 'euro corporate'], pk: 'euro_aggregate_bond' },
  { kws: ['us treasury', 'us government bond', 'treasury bond'], pk: 'us_treasuries' },
  { kws: ['euro government bond', 'eur government bond'], pk: 'euro_government_bond' },
  { kws: ['btp', 'btpi', 'italy government'], pk: 'btp_italy' },
  { kws: ['high yield eur', 'euro high yield', 'eur high yield'], pk: 'high_yield_eur' },
  { kws: ['high yield', 'us high yield'], pk: 'usd_high_yield' },
  { kws: ['short duration', 'short-duration', 'ultrashort bond'], pk: 'short_duration_eur' },
  { kws: ['inflation linked', 'inflation-linked', 'tips', 'linker'], pk: 'us_tips' },
  // Commodity
  { kws: ['physical gold', 'gold bullion', 'xau', 'oro fisico'], pk: 'physical_gold' },
  { kws: ['gold', 'oro'], pk: 'physical_gold' },
  { kws: ['silver', 'argento', 'xag'], pk: 'silver_spot' },
  { kws: ['bloomberg commodity', 'broad commodity'], pk: 'bloomberg_commodity' },
  // Factor
  { kws: ['minimum volatility', 'min volatility', 'min vol', 'low volatility'], pk: 'msci_world_min_vol' },
  { kws: ['momentum factor', 'world momentum'], pk: 'msci_world_momentum' },
  { kws: ['quality factor', 'world quality'], pk: 'msci_world_quality' },
  { kws: ['value weighted', 'value factor', 'world value'], pk: 'msci_world_value' },
  { kws: ['multifactor', 'multi-factor', 'multi factor'], pk: 'msci_world_multifactor' },
  { kws: ['equal weight', 'equal-weight'], pk: 'msci_world_equal_weight' },
  { kws: ['dividend aristocrat', 'dividend aristocrat'], pk: 'dividend_aristocrats' },
  // ESG
  { kws: ['msci world esg', 'world sri', 'world esg'], pk: 'msci_world_esg' },
  { kws: ['msci europe esg', 'europe sri', 'europe esg'], pk: 'msci_europe_esg' },
  // Real estate
  { kws: ['real estate', 'property yield', 'reit', 'developed markets property'], pk: 'msci_world_real_estate' },
  // Tematici
  { kws: ['clean energy', 'global clean energy', 'renewable energy'], pk: 'clean_energy' },
  { kws: ['automation', 'robotics', 'automation & robotics'], pk: 'automation_robotics' },
  { kws: ['healthcare', 'health care', 'global healthcare'], pk: 'global_healthcare' },
  { kws: ['cybersecurity', 'cyber security'], pk: 'cybersecurity' },
  { kws: ['water'], pk: 'water_global' },
  { kws: ['semiconductor', 'semicon', 'chips'], pk: 'semiconductors' },
  { kws: ['ftse mib', 'mib', 'italy equity', 'italian equity'], pk: 'ftse_mib' },
  { kws: ['latin america', 'latam'], pk: 'em_latin_america' },
];

/**
 * Guesses the profile key from an ETF name.
 * @param {string} name
 * @returns {string|null}
 */
export function guessProfileFromName(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  for (const { kws, pk } of KEYWORD_PROFILE_MAP) {
    if (kws.some(kw => n.includes(kw))) return pk;
  }
  return null;
}

// ── Core resolution logic ─────────────────────────────────────────────────────

/**
 * Builds a suggestion object from a candidate ticker.
 */
function buildSuggestion(candidateTicker, matchType, confidence) {
  const { exchangeSuffix } = getBaseAndExchange(candidateTicker);
  const exchangeInfo = exchangeSuffix ? (EXCHANGE_METADATA[exchangeSuffix] || null) : null;
  const profile = getRemoteProfile(candidateTicker) || getCompositionProfile(candidateTicker);
  if (!profile) return null;
  return {
    ticker: candidateTicker,
    exchangeSuffix,
    exchangeInfo,
    profile,
    matchType,    // 'exchange_variant' | 'profile_match'
    confidence,   // 'high' | 'medium'
  };
}

/**
 * Resolves a single unknown ticker by looking for alternatives.
 *
 * @param {string} ticker  - The unknown ticker (e.g., "SWDA.L")
 * @param {string} [name]  - ETF name for keyword-based profile guessing
 * @returns {{
 *   originalTicker: string,
 *   originalName: string,
 *   originalExchangeInfo: object|null,
 *   suggestions: Array,
 *   guessedProfileKey: string|null,
 *   hasSuggestions: boolean,
 * }}
 */
export function resolveUnknownTicker(ticker, name = '') {
  const { base, exchangeSuffix: origSuffix } = getBaseAndExchange(ticker);
  const origExchangeInfo = origSuffix ? (EXCHANGE_METADATA[origSuffix] || null) : null;

  const suggestions = [];
  const seen = new Set([ticker.toUpperCase()]);

  // ── Step 1: Exchange variants (same base ticker, different exchange) ──────
  for (const sfx of ALL_SUFFIXES) {
    if (sfx === origSuffix) continue;
    const candidate = `${base}.${sfx}`;
    if (seen.has(candidate)) continue;
    const s = buildSuggestion(candidate, 'exchange_variant', 'high');
    if (s) { suggestions.push(s); seen.add(candidate); }
  }
  // Also try without exchange suffix (US tickers)
  if (origSuffix && !seen.has(base)) {
    const s = buildSuggestion(base, 'exchange_variant', 'high');
    if (s) { suggestions.push(s); seen.add(base); }
  }

  // ── Step 2: Profile-based matches (same strategy, possibly different fund) ─
  const guessedProfile = guessProfileFromName(name);
  if (guessedProfile) {
    const profileTickers = getTickersForProfile(guessedProfile, 8);
    for (const t of profileTickers) {
      if (seen.has(t.toUpperCase())) continue;
      const s = buildSuggestion(t, 'profile_match', 'medium');
      if (s) { suggestions.push(s); seen.add(t.toUpperCase()); }
    }
  }

  return {
    originalTicker: ticker,
    originalName: name,
    originalExchangeInfo: origExchangeInfo,
    suggestions: suggestions.slice(0, 5),
    guessedProfileKey: guessedProfile,
    hasSuggestions: suggestions.length > 0,
  };
}

/**
 * Resolves a list of unknown tickers, skipping ones already aliased.
 * @param {Array<{ ticker: string, name?: string }>} items
 * @returns {Array} resolution results (only for unaliased ones)
 */
export function resolveUnknownTickers(items) {
  const aliases = getTickerAliases();
  return items
    .filter(({ ticker }) => !aliases[ticker.toUpperCase()])
    .map(({ ticker, name }) => resolveUnknownTicker(ticker, name));
}
