/**
 * Calo recente del benchmark azionario mondiale (MSCI World) per il rilevamento dello stress di mercato.
 * Prova più ETF che lo replicano finché uno risponde. Logica pura (`fetch` iniettato): usata da api/market-stress.js.
 */
import { drawdownFromPeak, parseYahooChart, BENCHMARK_WINDOW_DAYS } from '../lib/stress.js';

export const BENCHMARKS = [
  { symbol: 'IWDA.AS', name: 'iShares Core MSCI World (Amsterdam)' },
  { symbol: 'SWDA.MI', name: 'iShares Core MSCI World (Milano)' },
  { symbol: 'URTH', name: 'iShares MSCI World (USA)' },
];

const url = (symbol) => `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d`;

export async function fetchBenchmarkDrawdown(fetchImpl, now = new Date()) {
  const attempts = [];
  for (const b of BENCHMARKS) {
    try {
      const res = await fetchImpl(url(b.symbol), {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = drawdownFromPeak(parseYahooChart(await res.json()), { windowDays: BENCHMARK_WINDOW_DAYS, now });
      if (!d) throw new Error('Dati insufficienti');
      return { benchmark: b.symbol, windowDays: BENCHMARK_WINDOW_DAYS, ...d, attempts };
    } catch (err) {
      attempts.push({ source: b.symbol, error: err.message });
    }
  }
  throw Object.assign(new Error('Benchmark non disponibile'), { attempts });
}
