import { describe, it, expect } from 'vitest';
import { drawdownFromPeak, parseYahooChart, evaluateStress, STRESS_THRESHOLD_PCT } from './stress';

const NOW = new Date('2026-10-15T12:00:00Z');
const day = (n) => new Date(NOW.getTime() - n * 86400000).toISOString().slice(0, 10);
const series = (closes) => closes.map((c, i) => ({ date: day(closes.length - 1 - i), close: c }));

describe('drawdownFromPeak', () => {
  it('calo dal massimo della finestra all\'ultimo prezzo', () => {
    const r = drawdownFromPeak(series([100, 110, 105, 100, 93.5]), { windowDays: 60, now: NOW });
    expect(r.drawdownPct).toBe(15);
    expect(r.peak).toBe(110);
    expect(r.last).toBe(93.5);
  });
  it('mercato in salita: calo 0', () => {
    expect(drawdownFromPeak(series([90, 95, 100, 105, 110]), { windowDays: 60, now: NOW }).drawdownPct).toBe(0);
  });
  it('un massimo fuori finestra non conta', () => {
    const pts = [{ date: day(100), close: 200 }, ...series([100, 101, 102, 103, 104])];
    expect(drawdownFromPeak(pts, { windowDays: 60, now: NOW }).drawdownPct).toBe(0);
  });
  it('un massimo dentro la finestra conta anche se l\'ultimo giorno è in recupero', () => {
    const r = drawdownFromPeak(series([100, 120, 90, 95, 96]), { windowDays: 60, now: NOW });
    expect(r.drawdownPct).toBe(20);
  });
  it('dati insufficienti o sporchi → null (mai un numero inventato)', () => {
    expect(drawdownFromPeak([], { windowDays: 60, now: NOW })).toBeNull();
    expect(drawdownFromPeak(null, { windowDays: 60, now: NOW })).toBeNull();
    expect(drawdownFromPeak(series([100, 99, 98]), { windowDays: 60, now: NOW })).toBeNull();
    const dirty = series([100, null, 'x', 0, -5, 100, 100, 100, 100]);
    expect(drawdownFromPeak(dirty, { windowDays: 60, now: NOW }).drawdownPct).toBe(0);
  });
  it('ignora punti nel futuro e accetta l\'ordine casuale', () => {
    const pts = [...series([100, 100, 100, 100, 80])].reverse();
    pts.push({ date: new Date(NOW.getTime() + 5 * 86400000).toISOString(), close: 500 });
    expect(drawdownFromPeak(pts, { windowDays: 60, now: NOW }).drawdownPct).toBe(20);
  });
});

describe('parseYahooChart', () => {
  it('converte timestamp (secondi) e chiusure', () => {
    const pts = parseYahooChart({ chart: { result: [{ timestamp: [1700000000, 1700086400], indicators: { quote: [{ close: [10, 11] }] } }] } });
    expect(pts).toEqual([{ date: 1700000000000, close: 10 }, { date: 1700086400000, close: 11 }]);
  });
  it('formato inatteso → errore esplicito', () => {
    expect(() => parseYahooChart({})).toThrow(/non riconosciuta/);
    expect(() => parseYahooChart({ chart: { result: [{ timestamp: [1], indicators: { quote: [{ close: [1, 2] }] } }] } })).toThrow();
  });
});

describe('evaluateStress', () => {
  it('soglia inclusiva al 15%', () => {
    expect(STRESS_THRESHOLD_PCT).toBe(15);
    expect(evaluateStress({ benchmarkDrawdownPct: 15 })).toEqual({ known: true, flag: true });
    expect(evaluateStress({ benchmarkDrawdownPct: 14.9 })).toEqual({ known: true, flag: false });
  });
  it('basta uno dei due indicatori', () => {
    expect(evaluateStress({ benchmarkDrawdownPct: 3, portfolioDrawdownPct: 18 }).flag).toBe(true);
  });
  it('nessun dato → non determinabile, non "tutto bene"', () => {
    expect(evaluateStress({})).toEqual({ known: false, flag: false });
    expect(evaluateStress({ benchmarkDrawdownPct: null, portfolioDrawdownPct: null }).known).toBe(false);
  });
});
