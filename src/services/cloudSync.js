/**
 * Sincronizzazione localStorage ⇄ Supabase (tabella public.user_data).
 *
 * I servizi dell'app scrivono direttamente su localStorage (sincrono). Per non
 * riscriverli, intercettiamo setItem/removeItem sulle sole SYNC_KEYS e
 * inviamo le modifiche al cloud con un piccolo ritardo (debounce).
 * Conflitti: vince la modifica più recente per chiave (orologio del dispositivo).
 * La decisione su cosa scaricare/caricare al login sta in cloudSyncCore.js.
 */
import { SYNC_KEYS, isSyncKey, planInitialSync, resolveConflict } from './cloudSyncCore';

export const META_KEY = 'inv-cloud-meta';
export const OWNER_KEY = 'inv-cloud-owner';
const TABLE = 'user_data';
const DEBOUNCE_MS = 1500;
const RETRY_MS = 8000;

export function createCloudSync({ client, userId, onStatus = () => {} }) {
  const ls = window.localStorage;
  const proto = Object.getPrototypeOf(ls);
  const orig = { set: proto.setItem, remove: proto.removeItem };

  const dirty = new Map(); // key → 'set' | 'delete'
  let meta = {};
  let suspended = false;
  let hooked = false;
  let timer = null;
  let queue = Promise.resolve();

  const readMeta = () => {
    try { return JSON.parse(ls.getItem(META_KEY)) || {}; } catch { return {}; }
  };
  const saveMeta = () => orig.set.call(ls, META_KEY, JSON.stringify(meta));

  const readLocal = () => {
    const local = {};
    for (const k of SYNC_KEYS) {
      const v = ls.getItem(k);
      if (v !== null) local[k] = v;
    }
    return local;
  };

  async function loadCloud() {
    const { data, error } = await client.from(TABLE).select('key,value,updated_at');
    if (error) throw error;
    const cloud = {};
    for (const r of data ?? []) {
      if (isSyncKey(r.key)) cloud[r.key] = { value: r.value, updatedAt: Date.parse(r.updated_at) || 0 };
    }
    return cloud;
  }

  // ── Invio verso il cloud ────────────────────────────────────────────────────
  async function pushDirty() {
    if (dirty.size === 0) return;
    const batch = new Map(dirty);
    dirty.clear();
    onStatus('syncing');
    try {
      const upserts = [], deletes = [];
      for (const [key, op] of batch) {
        const value = ls.getItem(key);
        if (op === 'delete' || value === null) deletes.push(key);
        else upserts.push({ user_id: userId, key, value, updated_at: new Date(meta[key] ?? Date.now()).toISOString() });
      }
      if (upserts.length) {
        const { error } = await client.from(TABLE).upsert(upserts, { onConflict: 'user_id,key' });
        if (error) throw error;
      }
      if (deletes.length) {
        const { error } = await client.from(TABLE).delete().eq('user_id', userId).in('key', deletes);
        if (error) throw error;
      }
      onStatus(dirty.size ? 'syncing' : 'idle');
    } catch (err) {
      for (const [k, op] of batch) if (!dirty.has(k)) dirty.set(k, op);
      onStatus('error', err);
      schedule(RETRY_MS);
      throw err;
    }
  }

  const enqueue = () => {
    queue = queue.then(pushDirty, pushDirty);
    return queue;
  };

  function schedule(ms = DEBOUNCE_MS) {
    clearTimeout(timer);
    timer = setTimeout(() => { enqueue().catch(() => {}); }, ms);
  }

  function markDirty(key, op) {
    if (op === 'set') { meta[key] = Date.now(); saveMeta(); } else { delete meta[key]; saveMeta(); }
    dirty.set(key, op);
    schedule();
  }

  // ── Intercettazione delle scritture ─────────────────────────────────────────
  function installHook() {
    if (hooked) return;
    hooked = true;
    proto.setItem = function (key, value) {
      orig.set.call(this, key, value);
      if (this === ls && !suspended && isSyncKey(key)) markDirty(key, 'set');
    };
    proto.removeItem = function (key) {
      orig.remove.call(this, key);
      if (this === ls && !suspended && isSyncKey(key)) markDirty(key, 'delete');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('pagehide', onPageHide);
  }

  const onOnline = () => { if (dirty.size) schedule(0); };
  const onPageHide = () => { if (dirty.size) enqueue().catch(() => {}); };

  function removeHook() {
    if (!hooked) return;
    hooked = false;
    proto.setItem = orig.set;
    proto.removeItem = orig.remove;
    window.removeEventListener('online', onOnline);
    window.removeEventListener('pagehide', onPageHide);
  }

  // ── Applicazione di un piano ────────────────────────────────────────────────
  async function applyPlan(plan, cloud) {
    suspended = true;
    try {
      for (const [k, v] of Object.entries(plan.toLocal)) {
        orig.set.call(ls, k, v);
        meta[k] = cloud[k]?.updatedAt ?? Date.now();
      }
      for (const k of plan.clearLocal) {
        orig.remove.call(ls, k);
        delete meta[k];
      }
      saveMeta();
    } finally {
      suspended = false;
    }
    for (const k of plan.toCloud) { meta[k] = Date.now(); dirty.set(k, 'set'); }
    for (const k of plan.deleteCloud) dirty.set(k, 'delete');
    saveMeta();
    if (dirty.size) await enqueue(); // se fallisce, l'errore risale: nessun dato locale è stato toccato
  }

  function finalize() {
    orig.set.call(ls, OWNER_KEY, userId);
    installHook();
    onStatus('idle');
  }

  // ── API ─────────────────────────────────────────────────────────────────────
  /** @returns {Promise<{conflict:false}|{conflict:true, resolve:(choice:'cloud'|'local')=>Promise<void>}>} */
  async function start() {
    meta = readMeta();
    const cloud = await loadCloud();
    const local = readLocal();
    const plan = planInitialSync({ local, meta, owner: ls.getItem(OWNER_KEY), userId, cloud });

    if (plan.conflict) {
      return {
        conflict: true,
        resolve: async (choice) => {
          await applyPlan(resolveConflict({ local, cloud }, choice), cloud);
          finalize();
        },
      };
    }
    await applyPlan(plan, cloud);
    finalize();
    return { conflict: false };
  }

  async function flush() {
    clearTimeout(timer);
    await enqueue();
  }

  function stop() {
    clearTimeout(timer);
    removeHook();
  }

  /** Rimuove dal browser i dati dell'utente (da chiamare dopo flush riuscito, al logout). */
  function wipeLocal() {
    stop();
    for (const k of SYNC_KEYS) orig.remove.call(ls, k);
    orig.remove.call(ls, META_KEY);
    orig.remove.call(ls, OWNER_KEY);
  }

  return { start, flush, stop, wipeLocal, hasPending: () => dirty.size > 0 };
}
