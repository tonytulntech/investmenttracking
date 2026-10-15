import { describe, it, expect } from 'vitest';
import { fetchBenchmarkDrawdown } from './stressSources';

const NOW = new Date('2026-10-15T12:00:00Z');
const chart = (closes) => ({
  chart: { result: [{ timestamp: closes.map((_, i) => Math.floor((NOW.getTime() - (closes.length - 1 - i) * 86400000) / 1000)), indicators: { quote: [{ close: closes }] } }] },
});
const ok = (body) => async () => ({ ok: true, status: 200, json: async () => body });

describe('fetchBenchmarkDrawdown', () => {
  it('calcola il calo dal massimo dei 60 giorni', async () => {
    const r = await fetchBenchmarkDrawdown(ok(chart([100, 110, 105, 100, 93.5])), NOW);
    expect(r).toMatchObject({ benchmark: 'IWDA.AS', drawdownPct: 15, windowDays: 60 });
  });
  it('se la prima fonte fallisce prova la successiva e registra il tentativo', async () => {
    let n = 0;
    const f = async () => (n++ === 0 ? { ok: false, status: 429, json: async () => ({}) } : { ok: true, status: 200, json: async () => chart([100, 100, 100, 100, 100]) });
    const r = await fetchBenchmarkDrawdown(f, NOW);
    expect(r.benchmark).toBe('SWDA.MI');
    expect(r.attempts).toEqual([{ source: 'IWDA.AS', error: 'HTTP 429' }]);
  });
  it('nessuna fonte → errore con il motivo di ogni tentativo (mai un numero inventato)', async () => {
    const f = async () => { throw new Error('rete'); };
    await expect(fetchBenchmarkDrawdown(f, NOW)).rejects.toMatchObject({ attempts: [{ source: 'IWDA.AS' }, { source: 'SWDA.MI' }, { source: 'URTH' }] });
  });
  it('dati insufficienti = tentativo fallito', async () => {
    await expect(fetchBenchmarkDrawdown(ok(chart([100, 99])), NOW)).rejects.toThrow(/non disponibile/);
  });
});
