/**
 * etfDatabaseService.js
 *
 * Servizio per il database remoto delle composizioni ETF.
 * Recupera dati aggiornati da GitHub Gist, li mette in cache in localStorage
 * con un TTL di 72 ore e li unisce con il database locale (etfComposition.js).
 *
 * Flusso:
 *  1. Al primo utilizzo, o quando il TTL è scaduto, tenta il fetch remoto.
 *  2. Il risultato viene salvato in localStorage insieme al timestamp.
 *  3. Ogni chiamata a `getRemoteProfile(ticker)` controlla prima la cache remota,
 *     poi ricade sul database locale.
 *  4. `getMissingTickers(tickerList)` restituisce i ticker senza profilo in
 *     NESSUNA delle due sorgenti → devono essere aggiunti manualmente.
 *
 * Formato del JSON remoto:
 * {
 *   version: "2026-Q2",
 *   profiles: { [profileKey]: { ...stessa struttura di PROFILES in etfComposition.js } },
 *   tickers:  { [ticker]: profileKey },
 *   ter:      { [ticker]: number }   // TER in % per anno
 * }
 */

import { getCompositionProfile, getTerForTicker } from '../data/etfComposition';

// ── Configurazione ────────────────────────────────────────────────────────────

/**
 * URL del JSON remoto (GitHub Gist raw).
 * Sostituire con l'URL reale del Gist dopo averlo creato.
 * Formato atteso: { version, profiles, tickers, ter }
 */
export const REMOTE_DB_URL =
  'https://gist.githubusercontent.com/tonytulntech/1efbea5d6bd919c73cee6055bf37a052/raw/etf-db.json';

/** Durata della cache in millisecondi (default: 72 ore) */
export const CACHE_TTL_MS = 72 * 60 * 60 * 1000;

const STORAGE_KEY = 'etf_remote_db_cache';

// ── Cache in memoria (evita fetch ripetuti nella stessa sessione) ─────────────
let _memCache = null; // { profiles, tickers, ter, fetchedAt }

// ── Funzioni interne ──────────────────────────────────────────────────────────

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.fetchedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[etfDB] impossibile salvare cache:', e);
  }
}

function isCacheValid(cached) {
  if (!cached?.fetchedAt) return false;
  return Date.now() - cached.fetchedAt < CACHE_TTL_MS;
}

/**
 * Cerca il profilo nel database remoto in cache.
 * Restituisce null se non trovato.
 */
function lookupInRemote(ticker, cache) {
  if (!cache) return null;
  const { profiles, tickers } = cache;
  if (!profiles || !tickers) return null;
  const profileKey = tickers[ticker] || tickers[ticker?.toUpperCase()];
  if (!profileKey) return null;
  return profiles[profileKey] || null;
}

// ── API pubblica ──────────────────────────────────────────────────────────────

/**
 * Inizializza il database remoto.
 * Chiama questa funzione al mount dell'app (o di PortfolioAnalysis).
 * Non blocca: il refresh avviene in background.
 *
 * @returns {Promise<{ fresh: boolean, version: string|null, error: string|null }>}
 */
export async function initRemoteDB() {
  // 1. Controlla cache in memoria
  if (_memCache && isCacheValid(_memCache)) {
    return { fresh: false, version: _memCache.version || null, error: null };
  }

  // 2. Controlla localStorage
  const stored = loadFromStorage();
  if (stored && isCacheValid(stored)) {
    _memCache = stored;
    return { fresh: false, version: stored.version || null, error: null };
  }

  // 3. Fetch remoto
  try {
    const response = await fetch(REMOTE_DB_URL, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();

    const cacheEntry = {
      version: json.version || null,
      profiles: json.profiles || {},
      tickers: json.tickers || {},
      ter: json.ter || {},
      fetchedAt: Date.now(),
    };

    _memCache = cacheEntry;
    saveToStorage(cacheEntry);

    console.info('[etfDB] DB remoto aggiornato:', cacheEntry.version, `(${Object.keys(cacheEntry.tickers).length} ticker)`);
    return { fresh: true, version: cacheEntry.version, error: null };

  } catch (err) {
    // Fallback: usa cache scaduta se disponibile
    if (stored) {
      _memCache = stored;
      console.warn('[etfDB] Fetch fallito, uso cache scaduta:', err.message);
      return { fresh: false, version: stored.version || null, error: err.message };
    }
    console.warn('[etfDB] Nessuna cache disponibile, uso solo dati locali:', err.message);
    return { fresh: false, version: null, error: err.message };
  }
}

/**
 * Forza il refresh immediato del database remoto, ignorando il TTL.
 * @returns {Promise<{ fresh: boolean, version: string|null, error: string|null }>}
 */
export async function forceRefreshRemoteDB() {
  _memCache = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  return initRemoteDB();
}

// ── Alias utente (localStorage) ───────────────────────────────────────────────
// Formato: { 'ORIGINAL_TICKER': 'RESOLVED_TICKER', ... }
// Utilizzato per mappare ticker non riconosciuti a un equivalente noto.

const ALIAS_STORAGE_KEY = 'etf_ticker_aliases';

/**
 * Legge la mappa degli alias dal localStorage.
 * @returns {{ [originalTicker: string]: string }}
 */
export function getTickerAliases() {
  try {
    return JSON.parse(localStorage.getItem(ALIAS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * Salva un alias: ogni volta che si chiede il profilo di `from`, verrà usato `to`.
 * @param {string} from - Ticker originale (es. "SWDA.L")
 * @param {string} to   - Ticker alternativo con profilo noto (es. "SWDA.MI")
 */
export function setTickerAlias(from, to) {
  const aliases = getTickerAliases();
  aliases[from.toUpperCase()] = to.toUpperCase();
  try { localStorage.setItem(ALIAS_STORAGE_KEY, JSON.stringify(aliases)); } catch {}
}

/**
 * Rimuove un alias precedentemente salvato.
 * @param {string} from
 */
export function removeTickerAlias(from) {
  const aliases = getTickerAliases();
  delete aliases[from.toUpperCase()];
  try { localStorage.setItem(ALIAS_STORAGE_KEY, JSON.stringify(aliases)); } catch {}
}

/** Cancella tutti gli alias. */
export function clearAllTickerAliases() {
  try { localStorage.removeItem(ALIAS_STORAGE_KEY); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Restituisce il profilo per un ticker, combinando dati remoti e locali.
 * Controlla prima gli alias utente (es. SWDA.L → SWDA.MI), poi DB remoto, poi locale.
 *
 * @param {string} ticker
 * @returns {object|null}
 */
export function getRemoteProfile(ticker) {
  if (!ticker) return null;
  // Resolve alias (user-defined, stored in localStorage)
  const aliases = getTickerAliases();
  const resolved = aliases[ticker.toUpperCase()] || ticker;
  const remoteProfile = lookupInRemote(resolved, _memCache);
  if (remoteProfile) return remoteProfile;
  return getCompositionProfile(resolved); // fallback locale
}

/**
 * Restituisce il TER per un ticker, combinando dati remoti e locali.
 * Rispetta gli alias utente.
 * @param {string} ticker
 * @returns {number|null}
 */
export function getRemoteTer(ticker) {
  if (!ticker) return null;
  const aliases = getTickerAliases();
  const resolved = aliases[ticker.toUpperCase()] || ticker;
  if (_memCache?.ter) {
    const ter = _memCache.ter[resolved] ?? _memCache.ter[resolved.toUpperCase()];
    if (ter != null) return ter;
  }
  return getTerForTicker(resolved);
}

/**
 * Filtra una lista di ticker e restituisce quelli che non hanno un profilo
 * in NESSUNA delle due sorgenti (remota + locale).
 *
 * @param {string[]} tickerList
 * @param {{ isCash?: boolean, macroCategory?: string }[]} [holdingsMeta] - metadati opzionali
 * @returns {string[]} ticker senza profilo
 */
export function getMissingTickers(tickerList, holdingsMeta = []) {
  return tickerList.filter(ticker => {
    // Salta cash
    const meta = holdingsMeta.find(m => m.ticker === ticker);
    if (meta?.isCash) return false;
    if (ticker?.startsWith('CASH_')) return false;
    // Controlla se esiste un profilo
    return !getRemoteProfile(ticker);
  });
}

/**
 * Restituisce metadati sulla cache corrente.
 * @returns {{ version: string|null, fetchedAt: number|null, ageHours: number|null, isValid: boolean }}
 */
export function getDBCacheInfo() {
  const cache = _memCache || loadFromStorage();
  if (!cache) return { version: null, fetchedAt: null, ageHours: null, isValid: false };
  const ageMs = Date.now() - cache.fetchedAt;
  return {
    version: cache.version || null,
    fetchedAt: cache.fetchedAt,
    ageHours: ageMs / 3_600_000,
    isValid: isCacheValid(cache),
    tickerCount: Object.keys(cache.tickers || {}).length,
  };
}
