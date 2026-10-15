// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createCloudSync, OWNER_KEY, META_KEY } from './cloudSync';

const TX = 'investment_tracker_transactions';
const CFG = 'inv_portfolio_config_v1';
const origSet = Object.getPrototypeOf(window.localStorage).setItem;
const origRemove = Object.getPrototypeOf(window.localStorage).removeItem;

function fakeClient(initial = {}) {
  const rows = new Map(Object.entries(initial).map(([key, v]) => [key, { key, value: v.value, updated_at: new Date(v.at ?? 1000).toISOString() }]));
  const c = {
    rows, failNext: false, upserts: 0,
    from() {
      return {
        select: async () => ({ data: [...rows.values()], error: null }),
        upsert: async (arr) => {
          if (c.failNext) return { error: new Error('rete assente') };
          c.upserts++;
          arr.forEach(r => rows.set(r.key, r));
          return { error: null };
        },
        delete: () => ({ eq: () => ({ in: async (_col, keys) => {
          if (c.failNext) return { error: new Error('rete assente') };
          keys.forEach(k => rows.delete(k));
          return { error: null };
        } }) }),
      };
    },
  };
  return c;
}

let sync;
const make = (client, userId = 'u1', onStatus) => (sync = createCloudSync({ client, userId, onStatus }));

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { sync?.stop(); sync = null; vi.useRealTimers(); });

describe('avvio', () => {
  it('browser vuoto: scarica il cloud e imposta il proprietario', async () => {
    const client = fakeClient({ [TX]: { value: '[1]' } });
    const r = await make(client).start();
    expect(r.conflict).toBe(false);
    expect(localStorage.getItem(TX)).toBe('[1]');
    expect(localStorage.getItem(OWNER_KEY)).toBe('u1');
  });

  it('dati locali e cloud vuoto: migra nel cloud', async () => {
    localStorage.setItem(TX, '[7]');
    const client = fakeClient();
    await make(client).start();
    expect(client.rows.get(TX).value).toBe('[7]');
    expect(localStorage.getItem(OWNER_KEY)).toBe('u1');
  });

  it('dati da entrambe le parti: conflitto senza toccare nulla', async () => {
    localStorage.setItem(TX, 'locale');
    const client = fakeClient({ [TX]: { value: 'cloud' } });
    const r = await make(client).start();
    expect(r.conflict).toBe(true);
    expect(localStorage.getItem(TX)).toBe('locale');
    expect(client.rows.get(TX).value).toBe('cloud');
    expect(localStorage.getItem(OWNER_KEY)).toBeNull();
  });

  it('conflitto → "cloud": il browser prende il cloud', async () => {
    localStorage.setItem(TX, 'locale');
    const client = fakeClient({ [TX]: { value: 'cloud' } });
    const r = await make(client).start();
    await r.resolve('cloud');
    expect(localStorage.getItem(TX)).toBe('cloud');
    expect(client.rows.get(TX).value).toBe('cloud');
  });

  it('conflitto → "local": il cloud prende il browser e perde le chiavi in più', async () => {
    localStorage.setItem(TX, 'locale');
    const client = fakeClient({ [TX]: { value: 'cloud' }, [CFG]: { value: 'extra' } });
    const r = await make(client).start();
    await r.resolve('local');
    expect(client.rows.get(TX).value).toBe('locale');
    expect(client.rows.has(CFG)).toBe(false);
  });

  it('dispositivo condiviso: i dati di un altro utente non finiscono nel nuovo account', async () => {
    localStorage.setItem(TX, '[dati di Mario]');
    localStorage.setItem(OWNER_KEY, 'mario');
    const client = fakeClient();
    await make(client, 'luisa').start();
    expect(localStorage.getItem(TX)).toBeNull();
    expect(client.rows.size).toBe(0);
    expect(localStorage.getItem(OWNER_KEY)).toBe('luisa');
  });

  it('errore di rete durante la migrazione: dati locali intatti, nessun hook, nessun proprietario', async () => {
    localStorage.setItem(TX, '[7]');
    const client = fakeClient();
    client.failNext = true;
    await expect(make(client).start()).rejects.toThrow('rete assente');
    expect(localStorage.getItem(TX)).toBe('[7]');
    expect(localStorage.getItem(OWNER_KEY)).toBeNull();
    expect(Object.getPrototypeOf(localStorage).setItem).toBe(origSet);
  });
});

describe('sincronizzazione continua', () => {
  it('invia le modifiche alle chiavi sincronizzate dopo il debounce, in un solo invio', async () => {
    const client = fakeClient();
    await make(client).start();
    localStorage.setItem(TX, '[1]');
    localStorage.setItem(TX, '[1,2]');
    localStorage.setItem(CFG, '{}');
    expect(client.rows.size).toBe(0);
    await vi.advanceTimersByTimeAsync(2000);
    expect(client.rows.get(TX).value).toBe('[1,2]');
    expect(client.rows.get(CFG).value).toBe('{}');
    expect(client.upserts).toBe(1);
  });

  it('ignora cache e preferenze del dispositivo', async () => {
    const client = fakeClient();
    await make(client).start();
    localStorage.setItem('price_cache', 'x');
    localStorage.setItem('inv-theme', 'dark');
    localStorage.setItem('privacy-mode', 'true');
    await vi.advanceTimersByTimeAsync(2000);
    expect(client.rows.size).toBe(0);
  });

  it('removeItem elimina la riga nel cloud', async () => {
    const client = fakeClient({ [TX]: { value: '[1]' } });
    await make(client).start();
    localStorage.removeItem(TX);
    await vi.advanceTimersByTimeAsync(2000);
    expect(client.rows.has(TX)).toBe(false);
  });

  it('errore di rete: segnala, conserva le modifiche e riprova da solo', async () => {
    const client = fakeClient();
    const statuses = [];
    await make(client, 'u1', (s) => statuses.push(s)).start();
    client.failNext = true;
    localStorage.setItem(TX, '[9]');
    await vi.advanceTimersByTimeAsync(2000);
    expect(statuses).toContain('error');
    expect(client.rows.size).toBe(0);
    expect(sync.hasPending()).toBe(true);
    client.failNext = false;
    await vi.advanceTimersByTimeAsync(9000);
    expect(client.rows.get(TX).value).toBe('[9]');
    expect(sync.hasPending()).toBe(false);
    expect(statuses.at(-1)).toBe('idle');
  });

  it('flush() invia subito le modifiche in sospeso', async () => {
    const client = fakeClient();
    await make(client).start();
    localStorage.setItem(TX, '[5]');
    await sync.flush();
    expect(client.rows.get(TX).value).toBe('[5]');
  });

  it('riaccesso dello stesso utente: la modifica locale più recente non viene persa', async () => {
    const client = fakeClient({ [TX]: { value: 'vecchio', at: 1000 } });
    await make(client).start();
    sync.stop();
    // modifica offline, poi nuova sessione
    localStorage.setItem(TX, 'offline');
    const meta = JSON.parse(localStorage.getItem(META_KEY));
    meta[TX] = Date.now() + 5000;
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    await make(client).start();
    expect(client.rows.get(TX).value).toBe('offline');
  });
});

describe('chiusura', () => {
  it('stop() ripristina localStorage e smette di sincronizzare', async () => {
    const client = fakeClient();
    await make(client).start();
    sync.stop();
    expect(Object.getPrototypeOf(localStorage).setItem).toBe(origSet);
    expect(Object.getPrototypeOf(localStorage).removeItem).toBe(origRemove);
    localStorage.setItem(TX, '[1]');
    await vi.advanceTimersByTimeAsync(3000);
    expect(client.rows.size).toBe(0);
  });

  it('wipeLocal() rimuove dati, meta e proprietario ma non le preferenze del dispositivo', async () => {
    const client = fakeClient({ [TX]: { value: '[1]' } });
    await make(client).start();
    localStorage.setItem('inv-theme', 'light');
    sync.wipeLocal();
    expect(localStorage.getItem(TX)).toBeNull();
    expect(localStorage.getItem(OWNER_KEY)).toBeNull();
    expect(localStorage.getItem(META_KEY)).toBeNull();
    expect(localStorage.getItem('inv-theme')).toBe('light');
    expect(client.rows.has(TX)).toBe(true); // il cloud non viene toccato
  });
});
