import { describe, it, expect } from 'vitest';
import { parseJsonStat, summarizeInflation, getItalianInflation } from './inflationData';

const stat = (periods, values, { asArray = false } = {}) => ({
  version: '2.0', class: 'dataset',
  id: ['freq', 'unit', 'coicop', 'geo', 'time'],
  size: [1, 1, 1, 1, periods.length],
  dimension: {
    freq: { category: { index: { A: 0 } } }, unit: { category: { index: { RCH_A_AVG: 0 } } },
    coicop: { category: { index: { CP00: 0 } } }, geo: { category: { index: { IT: 0 } } },
    time: { category: { index: asArray ? periods : Object.fromEntries(periods.map((p, i) => [p, i])) } },
  },
  value: values,
});

describe('parseJsonStat', () => {
  it('legge una serie con valori come oggetto sparso e salta i mancanti', () => {
    const j = stat(['2021', '2022', '2023', '2024'], { 0: 1.9, 1: 8.7, 3: 1.1 });
    expect(parseJsonStat(j)).toEqual([
      { period: '2021', value: 1.9 }, { period: '2022', value: 8.7 }, { period: '2024', value: 1.1 },
    ]);
  });
  it('accetta indici e valori come array', () => {
    const j = stat(['2022', '2023'], [8.7, 5.9], { asArray: true });
    expect(parseJsonStat(j).map(p => p.value)).toEqual([8.7, 5.9]);
  });
  it('ordina per periodo anche se l\'indice è in disordine', () => {
    const j = stat(['2023', '2021', '2022'], [5.9, 1.9, 8.7]);
    expect(parseJsonStat(j).map(p => p.period)).toEqual(['2021', '2022', '2023']);
  });
  it('rifiuta serie ambigue invece di indovinare', () => {
    const j = stat(['2022'], [8.7]);
    j.size = [1, 2, 1, 1, 1];
    expect(() => parseJsonStat(j)).toThrow(/ambigua/);
  });
  it('rifiuta formati inattesi', () => {
    expect(() => parseJsonStat({})).toThrow();
    expect(() => parseJsonStat(null)).toThrow();
  });
});

describe('summarizeInflation', () => {
  const years = Array.from({ length: 10 }, (_, i) => String(2015 + i));
  const annual = stat(years, Object.fromEntries([2, 2, 2, 2, 2, 2, 2, 2, 2, 2].map((v, i) => [i, v])));
  const monthly = stat(['2025M08', '2025M09'], { 0: 1.6, 1: 1.8 });

  it('ultimo dato mensile e statistiche storiche', () => {
    const s = summarizeInflation({ annualRaw: annual, monthlyRaw: monthly });
    expect(s.latest).toEqual({ period: '2025M09', value: 1.8 });
    expect(s.history.mean).toBeCloseTo(2, 8);
    expect(s.history.vol).toBeCloseTo(0, 8);
    expect(s.history.years).toBe(10);
  });
  it('deviazione standard campionaria su valori noti', () => {
    const a = stat(['1', '2', '3', '4', '5'], { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5 });
    const s = summarizeInflation({ annualRaw: a, monthlyRaw: monthly });
    expect(s.history.mean).toBe(3);
    expect(s.history.vol).toBeCloseTo(Math.sqrt(2.5), 8);
  });
  it('usa solo la finestra richiesta', () => {
    const s = summarizeInflation({ annualRaw: annual, monthlyRaw: monthly }, 6);
    expect(s.history.years).toBe(6);
    expect(s.history.from).toBe('2019');
  });
  it('storico troppo corto → nessuna statistica, ma l\'ultimo dato resta', () => {
    const a = stat(['2023', '2024'], { 0: 5.9, 1: 1.1 });
    const s = summarizeInflation({ annualRaw: a, monthlyRaw: monthly });
    expect(s.history).toBeNull();
    expect(s.latest.value).toBe(1.8);
  });
  it('un dataset rotto non rovina l\'altro', () => {
    const s = summarizeInflation({ annualRaw: {}, monthlyRaw: monthly });
    expect(s.history).toBeNull();
    expect(s.latest.value).toBe(1.8);
  });
});

describe('getItalianInflation', () => {
  const years = Array.from({ length: 8 }, (_, i) => String(2017 + i));
  const payload = {
    annualRaw: stat(years, Object.fromEntries(years.map((_, i) => [i, 2]))),
    monthlyRaw: stat(['2025M09'], { 0: 1.8 }),
  };
  const mem = () => { const m = {}; return { getItem: k => m[k] ?? null, setItem: (k, v) => { m[k] = v; } }; };
  const okFetch = () => async () => ({ ok: true, json: async () => payload });

  it('scarica, salva in cache e poi riusa la cache', async () => {
    const storage = mem();
    let calls = 0;
    const fetchImpl = async () => { calls++; return { ok: true, json: async () => payload }; };
    const a = await getItalianInflation({ fetchImpl, storage, now: 1000 });
    expect(a.status).toBe('live');
    expect(a.latest.value).toBe(1.8);
    const b = await getItalianInflation({ fetchImpl, storage, now: 2000 });
    expect(b.status).toBe('cached');
    expect(calls).toBe(1);
  });
  it('cache scaduta (>24h) → nuova richiesta', async () => {
    const storage = mem();
    let calls = 0;
    const fetchImpl = async () => { calls++; return { ok: true, json: async () => payload }; };
    await getItalianInflation({ fetchImpl, storage, now: 0 });
    await getItalianInflation({ fetchImpl, storage, now: 25 * 3600 * 1000 });
    expect(calls).toBe(2);
  });
  it('errore di rete o risposta non valida → "unavailable", senza eccezioni', async () => {
    const storage = mem();
    expect((await getItalianInflation({ fetchImpl: async () => { throw new Error('rete'); }, storage })).status).toBe('unavailable');
    expect((await getItalianInflation({ fetchImpl: async () => ({ ok: false, status: 502 }), storage })).status).toBe('unavailable');
    expect((await getItalianInflation({ fetchImpl: async () => ({ ok: true, json: async () => ({}) }), storage })).status).toBe('unavailable');
  });
  it('senza fetch disponibile → "unavailable"', async () => {
    expect((await getItalianInflation({ fetchImpl: null, storage: mem() })).status).toBe('unavailable');
  });
  it('dopo un errore, la cache valida precedente non viene cancellata', async () => {
    const storage = mem();
    await getItalianInflation({ fetchImpl: okFetch(), storage, now: 0 });
    const r = await getItalianInflation({ fetchImpl: async () => { throw new Error('x'); }, storage, now: 1000 });
    expect(r.status).toBe('cached');
  });
});
