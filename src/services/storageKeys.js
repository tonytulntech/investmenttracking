/**
 * Registry centralizzata delle chiavi localStorage.
 *
 * Il backup esporta TUTTE le chiavi presenti tranne quelle elencate in CACHE_KEYS:
 * così una chiave nuova finisce nel backup anche se nessuno si ricorda di
 * registrarla qui. CACHE_KEYS è quindi l'unica lista che va tenuta aggiornata.
 */

export const STORAGE_KEYS = {
  TRANSACTIONS:   'investment_tracker_transactions',
  SETTINGS:       'investment_tracker_settings',
  LAST_SYNC:      'investment_tracker_last_sync',
  IMPORT_BATCHES: 'investment_tracker_import_batches',
  PAC_TEMPLATES:  'investment_tracker_pac_templates',

  PORTFOLIO_CONFIG:   'inv_portfolio_config_v1',
  HIDDEN_PORTFOLIOS:  'inv_hidden_portfolios_v1',
  STRATEGY:           'investment_strategy',
  LAST_REBALANCING:   'last_rebalancing_date',
  REPORTED_TICKERS:   'reported_tickers_v1',

  THEME:            'inv-theme',
  PRIVACY_MODE:     'privacy-mode',
  DIVIDEND_TAX_PCT: 'div_tax_pct',
  ETF_MISSING_DISMISSED: 'etf_missing_dismissed',
};

/** Chiavi rigenerabili: escluse dal backup e svuotabili senza perdita di dati. */
export const CACHE_KEYS = [
  'price_cache',
  'ter_cache',
  'dg_metadata',
  'etf_remote_db_cache',
  'etf_ticker_aliases',
];

/** Famiglie di chiavi di cache con nome dinamico (una per ticker/data). */
export const CACHE_KEY_PREFIXES = [
  'hist_v2_',   // historicalPriceService: prezzi storici mensili
];

/** Etichette leggibili per il riepilogo di backup/ripristino. */
export const KEY_LABELS = {
  [STORAGE_KEYS.TRANSACTIONS]:      'Transazioni',
  [STORAGE_KEYS.SETTINGS]:          'Impostazioni',
  [STORAGE_KEYS.IMPORT_BATCHES]:    'Batch di import',
  [STORAGE_KEYS.PAC_TEMPLATES]:     'Template PAC',
  [STORAGE_KEYS.PORTFOLIO_CONFIG]:  'Portafogli',
  [STORAGE_KEYS.STRATEGY]:          'Strategia',
  [STORAGE_KEYS.LAST_REBALANCING]:  'Ultimo ribilanciamento',
};

export function isCacheKey(key) {
  return CACHE_KEYS.includes(key) || CACHE_KEY_PREFIXES.some(p => key.startsWith(p));
}

/** Tutte le chiavi attualmente in localStorage che vanno nel backup. */
export function getBackupKeys(storage = localStorage) {
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && !isCacheKey(key)) keys.push(key);
  }
  return keys.sort();
}
