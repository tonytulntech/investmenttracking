import { describe, it, expect } from 'vitest';
import { planInitialSync, resolveConflict, isSyncKey, SYNC_KEYS } from './cloudSyncCore';

const TX = 'investment_tracker_transactions';
const CFG = 'inv_portfolio_config_v1';
const row = (value, updatedAt = 1000) => ({ value, updatedAt });
const base = { local: {}, meta: {}, owner: null, userId: 'u1', cloud: {} };

describe('SYNC_KEYS', () => {
  it('non include cache né preferenze del dispositivo', () => {
    for (const k of ['price_cache', 'ter_cache', 'inv-theme', 'privacy-mode', 'perf_computed_v2', 'etf_remote_db_cache']) {
      expect(isSyncKey(k)).toBe(false);
    }
  });
  it('include i dati dell\'utente', () => {
    for (const k of [TX, CFG, 'inv-mode']) expect(SYNC_KEYS).toContain(k);
  });
});

describe('planInitialSync — primo accesso (dati mai sincronizzati)', () => {
  it('browser vuoto + cloud con dati → scarica il cloud', () => {
    const p = planInitialSync({ ...base, cloud: { [TX]: row('[1]') } });
    expect(p.conflict).toBe(false);
    expect(p.toLocal).toEqual({ [TX]: '[1]' });
    expect(p.toCloud).toEqual([]);
  });
  it('browser con dati + cloud vuoto → migra i dati locali nel cloud', () => {
    const p = planInitialSync({ ...base, local: { [TX]: '[1]', [CFG]: '{}' } });
    expect(p.conflict).toBe(false);
    expect(p.toCloud.sort()).toEqual([CFG, TX].sort());
    expect(p.clearLocal).toEqual([]);
  });
  it('dati da entrambe le parti → conflitto, nessuna azione automatica', () => {
    const p = planInitialSync({ ...base, local: { [TX]: '[1]' }, cloud: { [TX]: row('[2]') } });
    expect(p.conflict).toBe(true);
    expect(p.toLocal).toEqual({});
    expect(p.toCloud).toEqual([]);
    expect(p.clearLocal).toEqual([]);
  });
  it('solo chiavi banali in locale (modalità/impostazioni di default) non creano conflitto', () => {
    const p = planInitialSync({
      ...base, local: { 'inv-mode': 'advanced', investment_tracker_settings: '{}' },
      cloud: { [TX]: row('[2]') },
    });
    expect(p.conflict).toBe(false);
    expect(p.toLocal[TX]).toBe('[2]');
  });
  it('solo chiavi banali nel cloud + dati veri in locale → migra, nessun conflitto', () => {
    const p = planInitialSync({ ...base, local: { [TX]: '[1]' }, cloud: { 'inv-mode': row('guided') } });
    expect(p.conflict).toBe(false);
    expect(p.toCloud).toContain(TX);
  });
});

describe('planInitialSync — dispositivo condiviso', () => {
  it('dati locali di un altro utente non vengono mai caricati né mescolati', () => {
    const p = planInitialSync({
      ...base, owner: 'altro', local: { [TX]: '[dati altrui]' }, cloud: { [CFG]: row('{}') },
    });
    expect(p.toCloud).toEqual([]);
    expect(p.conflict).toBe(false);
    expect(p.clearLocal).toEqual([TX]);
    expect(p.toLocal).toEqual({ [CFG]: '{}' });
  });
  it('altro utente con cloud vuoto → il browser viene ripulito', () => {
    const p = planInitialSync({ ...base, owner: 'altro', local: { [TX]: '[x]' } });
    expect(p.clearLocal).toEqual([TX]);
    expect(p.toCloud).toEqual([]);
  });
});

describe('planInitialSync — stesso utente (riaccesso)', () => {
  it('vince la modifica più recente, chiave per chiave', () => {
    const p = planInitialSync({
      ...base, owner: 'u1',
      local: { [TX]: 'L-tx', [CFG]: 'L-cfg' },
      meta: { [TX]: 5000, [CFG]: 1000 },
      cloud: { [TX]: row('C-tx', 2000), [CFG]: row('C-cfg', 3000) },
    });
    expect(p.toCloud).toEqual([TX]);          // locale più recente
    expect(p.toLocal).toEqual({ [CFG]: 'C-cfg' }); // cloud più recente
  });
  it('chiave solo nel cloud → scaricata; solo in locale → caricata', () => {
    const p = planInitialSync({
      ...base, owner: 'u1', local: { [TX]: '[1]' }, meta: { [TX]: 1 }, cloud: { [CFG]: row('{}') },
    });
    expect(p.toLocal).toEqual({ [CFG]: '{}' });
    expect(p.toCloud).toEqual([TX]);
  });
  it('valori identici → nessuna azione', () => {
    const p = planInitialSync({ ...base, owner: 'u1', local: { [TX]: 'same' }, cloud: { [TX]: row('same') } });
    expect(p).toEqual({ conflict: false, toLocal: {}, clearLocal: [], toCloud: [], deleteCloud: [] });
  });
  it('senza meta locale non sovrascrive il cloud', () => {
    const p = planInitialSync({ ...base, owner: 'u1', local: { [TX]: 'L' }, cloud: { [TX]: row('C', 10) } });
    expect(p.toLocal).toEqual({ [TX]: 'C' });
    expect(p.toCloud).toEqual([]);
  });
});

describe('resolveConflict', () => {
  const local = { [TX]: 'L', 'inv-mode': 'pro' };
  const cloud = { [TX]: row('C'), [CFG]: row('{}') };
  it('"cloud": il browser diventa una copia del cloud', () => {
    const p = resolveConflict({ local, cloud }, 'cloud');
    expect(p.toLocal).toEqual({ [TX]: 'C', [CFG]: '{}' });
    expect(p.clearLocal).toEqual(['inv-mode']);
    expect(p.toCloud).toEqual([]);
  });
  it('"local": il cloud diventa una copia del browser', () => {
    const p = resolveConflict({ local, cloud }, 'local');
    expect(p.toCloud.sort()).toEqual(['inv-mode', TX].sort());
    expect(p.deleteCloud).toEqual([CFG]);
    expect(p.toLocal).toEqual({});
  });
  it('scelta non valida → errore', () => {
    expect(() => resolveConflict({ local, cloud }, 'boh')).toThrow();
  });
});
