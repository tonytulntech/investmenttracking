/**
 * Storage Adapter — interfaccia unica per la persistenza.
 *
 * Oggi: localStorage.
 * Domani: Supabase (o qualsiasi backend) — basta aggiungere un adapter
 * e switchare con setAdapter().
 *
 * Tutti i servizi dovrebbero migrare a usare questo invece di
 * localStorage.getItem/setItem diretto.
 */

const localAdapter = {
  async get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return localStorage.getItem(key);
    }
  },

  async set(key, value) {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  },

  async remove(key) {
    localStorage.removeItem(key);
  },

  async keys(prefix) {
    const result = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!prefix || k.startsWith(prefix)) result.push(k);
    }
    return result;
  },
};

let currentAdapter = localAdapter;

export function setAdapter(adapter) {
  currentAdapter = adapter;
}

export function getAdapter() {
  return currentAdapter;
}

export const storage = {
  get:    (key)        => currentAdapter.get(key),
  set:    (key, value) => currentAdapter.set(key, value),
  remove: (key)        => currentAdapter.remove(key),
  keys:   (prefix)     => currentAdapter.keys(prefix),
};
