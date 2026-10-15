/**
 * Rilevamento dello stress di mercato (GUIDED_MODE_SPEC.md §7, passo 2). Funzioni pure.
 * Stress = il benchmark (MSCI World) è sceso di almeno il 15% dal suo massimo degli ultimi 60 giorni
 * oppure il portafoglio è sceso di almeno il 15% dal massimo degli ultimi 90 giorni.
 * Il calo del portafoglio non è ancora calcolato (arriva con l'assegnazione delle transazioni agli obiettivi):
 * si passa `null` e il risultato lo dichiara.
 */
export const STRESS_THRESHOLD_PCT = 15;
export const BENCHMARK_WINDOW_DAYS = 60;
export const PORTFOLIO_WINDOW_DAYS = 90;

const DAY = 24 * 60 * 60 * 1000;

/**
 * Calo percentuale dell'ultimo prezzo rispetto al massimo degli ultimi `windowDays` giorni.
 * @param {{date:string|number|Date, close:number|null}[]} points  serie giornaliera, in qualsiasi ordine
 * @returns {{drawdownPct:number, peakDate:string, peak:number, last:number, lastDate:string}|null}  null se i dati non bastano
 */
export function drawdownFromPeak(points, { windowDays, now = new Date() }) {
  const from = now.getTime() - windowDays * DAY;
  const valid = (points ?? [])
    .map(p => ({ t: new Date(p.date).getTime(), close: Number(p.close) }))
    .filter(p => Number.isFinite(p.t) && Number.isFinite(p.close) && p.close > 0 && p.t <= now.getTime())
    .sort((a, b) => a.t - b.t);
  const window = valid.filter(p => p.t >= from);
  if (window.length < 5) return null; // troppo pochi punti per dire qualcosa
  const last = window[window.length - 1];
  const peak = window.reduce((m, p) => (p.close > m.close ? p : m), window[0]);
  return {
    drawdownPct: Math.round(Math.max(0, (peak.close - last.close) / peak.close * 100) * 10) / 10,
    peakDate: new Date(peak.t).toISOString().slice(0, 10),
    peak: peak.close,
    last: last.close,
    lastDate: new Date(last.t).toISOString().slice(0, 10),
  };
}

/** Estrae i punti giornalieri dalla risposta del grafico di Yahoo Finance. */
export function parseYahooChart(json) {
  const r = json?.chart?.result?.[0];
  const ts = r?.timestamp;
  const close = r?.indicators?.quote?.[0]?.close;
  if (!Array.isArray(ts) || !Array.isArray(close) || ts.length !== close.length) throw new Error('Risposta del grafico non riconosciuta');
  return ts.map((t, i) => ({ date: t * 1000, close: close[i] }));
}

/**
 * Combina i due indicatori. `null` = non determinabile.
 * `known` è true solo se almeno un indicatore è disponibile.
 */
export function evaluateStress({ benchmarkDrawdownPct = null, portfolioDrawdownPct = null }) {
  const values = [benchmarkDrawdownPct, portfolioDrawdownPct].filter(v => v !== null && v !== undefined && Number.isFinite(v));
  if (values.length === 0) return { known: false, flag: false };
  return { known: true, flag: values.some(v => v >= STRESS_THRESHOLD_PCT) };
}
