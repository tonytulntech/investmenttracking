import { describe, it, expect } from 'vitest';
import { parseJsonStat, summarizeInflation, getItalianInflation, normalizePeriod, parseEcbCsv, annualFromMonthly } from './inflationData';
import { fetchInflationSeries, monthsSince } from './inflationSources';

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

describe('normalizePeriod', () => {
  it("'2025M09' → '2025-09'; gli altri formati restano invariati", () => {
    expect(normalizePeriod('2025M09')).toBe('2025-09');
    expect(normalizePeriod('2025-09')).toBe('2025-09');
    expect(normalizePeriod('2025')).toBe('2025');
  });
});

describe('parseEcbCsv', () => {
  const csv = [
    'KEY,FREQ,REF_AREA,ADJUSTMENT,ICP_ITEM,STS_INSTITUTION,ICP_SUFFIX,TIME_PERIOD,OBS_VALUE,OBS_STATUS,UNIT,TITLE',
    'ICP.M.IT.N.000000.4.ANR,M,IT,N,000000,4,ANR,2024-02,0.8,A,PCCH,"HICP - Overall index, Italy, Monthly"',
    'ICP.M.IT.N.000000.4.ANR,M,IT,N,000000,4,ANR,2024-01,0.9,A,PCCH,"HICP - Overall index, Italy, Monthly"',
    'ICP.M.IT.N.000000.4.ANR,M,IT,N,000000,4,ANR,2024-03,,A,PCCH,"mancante"',
  ].join('\r\n');
  it('legge periodo e valore anche con virgole tra virgolette, ordina e salta i valori vuoti', () => {
    expect(parseEcbCsv(csv)).toEqual([{ period: '2024-01', value: 0.9 }, { period: '2024-02', value: 0.8 }]);
  });
  it('rifiuta CSV vuoti o senza le colonne attese', () => {
    expect(() => parseEcbCsv('')).toThrow();
    expect(() => parseEcbCsv('A,B\n1,2')).toThrow(/Colonne/);
  });
  it('ignora righe con periodo non mensile', () => {
    const c = 'TIME_PERIOD,OBS_VALUE\n2024,3.1\n2024-05,1.2';
    expect(parseEcbCsv(c)).toEqual([{ period: '2024-05', value: 1.2 }]);
  });
});

describe('annualFromMonthly', () => {
  const months = (year, vals) => vals.map((v, i) => ({ period: `${year}-${String(i + 1).padStart(2, '0')}`, value: v }));
  it('media dei 12 mesi, solo anni completi', () => {
    const m = [...months(2023, Array(12).fill(6)), ...months(2024, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), ...months(2025, [1, 2, 3])];
    expect(annualFromMonthly(m)).toEqual([{ period: '2023', value: 6 }, { period: '2024', value: 6.5 }]);
  });
  it('lista vuota → vuota', () => expect(annualFromMonthly([])).toEqual([]));
});

describe('summarizeInflation', () => {
  const annual = (vals, from = 2000) => vals.map((value, i) => ({ period: String(from + i), value }));
  const monthly = [{ period: '2025-08', value: 1.6 }, { period: '2025-09', value: 1.8 }];

  it('ultimo dato mensile e statistiche storiche', () => {
    const s = summarizeInflation({ annual: annual(Array(10).fill(2)), monthly });
    expect(s.latest).toEqual({ period: '2025-09', value: 1.8 });
    expect(s.history.mean).toBeCloseTo(2, 8);
    expect(s.history.vol).toBeCloseTo(0, 8);
    expect(s.history.years).toBe(10);
  });
  it('deviazione standard campionaria su valori noti', () => {
    const s = summarizeInflation({ annual: annual([1, 2, 3, 4, 5]), monthly });
    expect(s.history.mean).toBe(3);
    expect(s.history.vol).toBeCloseTo(Math.sqrt(2.5), 8);
  });
  it('usa solo la finestra richiesta', () => {
    const s = summarizeInflation({ annual: annual(Array(10).fill(2), 2015), monthly }, 6);
    expect(s.history.years).toBe(6);
    expect(s.history.from).toBe('2019');
  });
  it("storico troppo corto → nessuna statistica, ma l'ultimo dato resta", () => {
    const s = summarizeInflation({ annual: annual([5.9, 1.1]), monthly });
    expect(s.history).toBeNull();
    expect(s.latest.value).toBe(1.8);
  });
  it('input vuoto o mancante non lancia', () => {
    expect(summarizeInflation({})).toEqual({ latest: null, history: null });
    expect(summarizeInflation()).toEqual({ latest: null, history: null });
  });
});

describe('fetchInflationSeries — fonti e diagnostica', () => {
  const ecbCsv = (n) => ['TIME_PERIOD,OBS_VALUE', ...Array.from({ length: n }, (_, i) => `${2020 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')},2`)].join('\n');
  const stat36 = () => {
    const periods = Array.from({ length: 24 }, (_, i) => `${2023 + Math.floor(i / 12)}M${String((i % 12) + 1).padStart(2, '0')}`);
    return JSON.stringify(stat(periods, Object.fromEntries(periods.map((_, i) => [i, 3]))));
  };
  const reply = (status, body) => ({ ok: status < 400, status, text: async () => body });

  it('usa la BCE se risponde, senza tentativi falliti', async () => {
    const calls = [];
    const r = await fetchInflationSeries(async (url) => { calls.push(url); return reply(200, ecbCsv(60)); }, Date.UTC(2025, 0, 15));
    expect(r.source).toMatch(/BCE/);
    expect(r.monthly).toHaveLength(60);
    expect(r.annual).toHaveLength(5);
    expect(r.attempts).toEqual([]);
    expect(calls).toHaveLength(1);
  });
  it('BCE giù → Eurostat; registra i tentativi falliti con stato e testo', async () => {
    const r = await fetchInflationSeries(async (url) => {
      if (url.includes('data-api.ecb')) return reply(503, 'servizio non disponibile');
      if (url.includes('coicop=CP00')) return reply(400, '{"error":"unknown dimension coicop"}');
      if (url.includes('coicop18=TOTAL')) return reply(200, stat36());
      return reply(404, '');
    });
    expect(r.source).toMatch(/Eurostat/);
    expect(r.monthly[0]).toEqual({ period: '2023-01', value: 3 });
    expect(r.annual).toEqual([{ period: '2023', value: 3 }, { period: '2024', value: 3 }]);
    expect(r.attempts.map(a => a.source)).toEqual(['bce', 'eurostat coicop=CP00']);
    expect(r.attempts[1].status).toBe(400);
    expect(r.attempts[1].body).toMatch(/unknown dimension/);
  });
  it('BCE restituisce un CSV inutilizzabile → passa a Eurostat', async () => {
    const r = await fetchInflationSeries(async (url) => (url.includes('ecb') ? reply(200, 'non è un csv') : reply(200, stat36())));
    expect(r.source).toMatch(/Eurostat/);
    expect(r.attempts[0].source).toBe('bce');
  });
  it('tutte le fonti falliscono → errore con il dettaglio di ogni tentativo', async () => {
    let err;
    try { await fetchInflationSeries(async () => reply(400, 'no')); } catch (e) { err = e; }
    expect(err.message).toMatch(/Nessuna fonte/);
    expect(err.attempts.map(a => a.source)).toEqual(['bce', 'eurostat coicop=CP00', 'eurostat coicop18=TOTAL', 'eurostat coicop18=CP00']);
  });
  it('errore di rete (fetch che lancia) viene catturato, non propagato crudo', async () => {
    let err;
    try { await fetchInflationSeries(async () => { throw new Error('ECONNRESET'); }); } catch (e) { err = e; }
    expect(err.attempts[0].error).toBe('ECONNRESET');
  });
});

describe('dato obsoleto: età e integrazione con Eurostat', () => {
  const reply = (status, body) => ({ ok: status < 400, status, text: async () => body });
  const csvTo = (lastYear, lastMonth) => {
    const rows = [];
    for (let y = 2020; y <= lastYear; y++) for (let m = 1; m <= 12; m++) { if (y === lastYear && m > lastMonth) break; rows.push(`${y}-${String(m).padStart(2, '0')},2`); }
    return ['TIME_PERIOD,OBS_VALUE', ...rows].join('\n');
  };
  const euroUntil = (periods) => JSON.stringify(stat(periods, Object.fromEntries(periods.map((_, i) => [i, 1.5]))));
  const NOW = Date.UTC(2026, 9, 15); // 15 ottobre 2026

  it('monthsSince', () => {
    expect(monthsSince('2026-10', NOW)).toBe(0);
    expect(monthsSince('2026-07', NOW)).toBe(3);
    expect(monthsSince('2025-12', NOW)).toBe(10);
  });
  it('BCE aggiornata: nessuna chiamata a Eurostat, staleMonths piccolo', async () => {
    const calls = [];
    const r = await fetchInflationSeries(async (url) => { calls.push(url); return reply(200, csvTo(2026, 9)); }, NOW);
    expect(calls).toHaveLength(1);
    expect(r.staleMonths).toBe(1);
  });
  it('BCE ferma a dicembre 2025 e Eurostat più recente → serie unite, età corretta', async () => {
    const periods = ['2025M11', '2025M12', '2026M01', '2026M02', '2026M03'];
    const r = await fetchInflationSeries(async (url) => (url.includes('ecb') ? reply(200, csvTo(2025, 12)) : reply(200, euroUntil(periods))), NOW);
    expect(r.monthly[r.monthly.length - 1].period).toBe('2026-03');
    expect(r.monthly.filter(p => p.period === '2025-12')).toHaveLength(1); // nessun duplicato
    expect(r.source).toMatch(/BCE.*Eurostat/);
    expect(r.staleMonths).toBe(7);
  });
  it('BCE ferma e Eurostat non disponibile → si tiene la BCE e si segnala l\'età', async () => {
    const r = await fetchInflationSeries(async (url) => (url.includes('ecb') ? reply(200, csvTo(2025, 12)) : reply(400, 'no')), NOW);
    expect(r.source).toMatch(/BCE/);
    expect(r.staleMonths).toBe(10);
    expect(r.attempts.length).toBe(3);
  });
  it('BCE ferma ma Eurostat non ha mesi più recenti → resta la BCE', async () => {
    const r = await fetchInflationSeries(async (url) => (url.includes('ecb') ? reply(200, csvTo(2025, 12)) : reply(200, euroUntil(['2025M10', '2025M11', '2025M12']))), NOW);
    expect(r.source).toBe('BCE · IPCA Italia');
    expect(r.staleMonths).toBe(10);
  });
  it('summarizeInflation riporta fonte e età se presenti', () => {
    const s = summarizeInflation({ annual: [], monthly: [{ period: '2025-12', value: 1.2 }], source: 'BCE', staleMonths: 10 });
    expect(s.staleMonths).toBe(10);
    expect(s.source).toBe('BCE');
  });
});

describe('getItalianInflation', () => {
  const payload = {
    annual: Array.from({ length: 8 }, (_, i) => ({ period: String(2017 + i), value: 2 })),
    monthly: [{ period: '2025-09', value: 1.8 }],
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
    expect(a.history.mean).toBe(2);
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
