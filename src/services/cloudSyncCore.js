/**
 * Logica pura della sincronizzazione cloud (nessun accesso a storage/rete).
 * Decide, al login, quali dati vanno dal cloud al browser e viceversa.
 * Principio: non perdere mai dati in silenzio. Dove c'è ambiguità → conflitto
 * esplicito all'utente.
 */

// Dati dell'utente che vivono anche nel cloud. Le cache (prezzi, TER, storico)
// sono rigenerabili; tema e privacy sono preferenze del dispositivo.
export const SYNC_KEYS = [
  'investment_tracker_transactions',
  'investment_tracker_settings',
  'investment_tracker_import_batches',
  'investment_tracker_pac_templates',
  'inv_portfolio_config_v1',
  'inv_hidden_portfolios_v1',
  'inv_dividend_annual_goal_v1',
  'investment_strategy',
  'last_rebalancing_date',
  'div_tax_pct',
  'dg_metadata',
  'etf_missing_dismissed',
  'reported_tickers_v1',
  'inv-mode',
];

// Chiavi che da sole non contano come "dati": preferenze/default creati all'avvio.
const TRIVIAL_KEYS = new Set(['inv-mode', 'investment_tracker_settings']);

export const isSyncKey = (key) => SYNC_KEYS.includes(key);

const hasMeaningfulData = (keys) => keys.some(k => !TRIVIAL_KEYS.has(k));

/**
 * @typedef {Object} SyncInput
 * @property {Object<string,string>} local   - valori in localStorage per le SYNC_KEYS presenti
 * @property {Object<string,number>} meta    - key → ms dell'ultima modifica locale/sincronizzazione
 * @property {string|null} owner             - id utente a cui appartengono i dati locali (null = mai sincronizzati)
 * @property {string} userId                 - utente che sta accedendo
 * @property {Object<string,{value:string, updatedAt:number}>} cloud
 *
 * @typedef {Object} SyncPlan
 * @property {boolean} conflict              - serve la scelta dell'utente
 * @property {Object<string,string>} toLocal - key → valore da scrivere nel browser
 * @property {string[]} clearLocal           - chiavi da rimuovere dal browser
 * @property {string[]} toCloud              - chiavi da caricare nel cloud
 * @property {string[]} deleteCloud          - chiavi da eliminare dal cloud
 */

const emptyPlan = () => ({ conflict: false, toLocal: {}, clearLocal: [], toCloud: [], deleteCloud: [] });

/** @param {SyncInput} input @returns {SyncPlan} */
export function planInitialSync({ local, meta, owner, userId, cloud }) {
  const plan = emptyPlan();
  const localKeys = Object.keys(local);
  const cloudKeys = Object.keys(cloud);

  // 1) Dati locali di un ALTRO utente (dispositivo condiviso): mai mescolarli né caricarli.
  if (owner && owner !== userId) {
    plan.clearLocal = localKeys.filter(k => !(k in cloud));
    for (const k of cloudKeys) plan.toLocal[k] = cloud[k].value;
    return plan;
  }

  // 2) Stesso utente: riconciliazione per chiave, vince la modifica più recente.
  if (owner === userId) {
    for (const k of new Set([...localKeys, ...cloudKeys])) {
      const inLocal = k in local, inCloud = k in cloud;
      if (inCloud && !inLocal) plan.toLocal[k] = cloud[k].value;
      else if (inLocal && !inCloud) plan.toCloud.push(k);
      else if (local[k] !== cloud[k].value) {
        if ((meta[k] ?? 0) > cloud[k].updatedAt) plan.toCloud.push(k);
        else plan.toLocal[k] = cloud[k].value;
      }
    }
    return plan;
  }

  // 3) Dati locali mai sincronizzati (primo accesso su questo dispositivo).
  const localHas = hasMeaningfulData(localKeys);
  const cloudHas = hasMeaningfulData(cloudKeys);

  if (!localHas) {
    plan.clearLocal = localKeys.filter(k => !(k in cloud));
    for (const k of cloudKeys) plan.toLocal[k] = cloud[k].value;
  } else if (!cloudHas) {
    plan.toCloud = [...localKeys];
  } else {
    plan.conflict = true;
  }
  return plan;
}

/** Risolve un conflitto: 'cloud' tiene il cloud, 'local' tiene il dispositivo. */
export function resolveConflict({ local, cloud }, choice) {
  const plan = emptyPlan();
  if (choice === 'cloud') {
    for (const k of Object.keys(cloud)) plan.toLocal[k] = cloud[k].value;
    plan.clearLocal = Object.keys(local).filter(k => !(k in cloud));
  } else if (choice === 'local') {
    plan.toCloud = Object.keys(local);
    plan.deleteCloud = Object.keys(cloud).filter(k => !(k in local));
  } else {
    throw new Error(`Scelta non valida: ${choice}`);
  }
  return plan;
}
