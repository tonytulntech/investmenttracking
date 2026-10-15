/**
 * Stress di mercato lato client: chiede il calo del benchmark a /api/market-stress (cache condivisa lato server).
 * Se il dato non c'è, dichiara "non verificabile": la decisione di prudenza è di revisionModel.
 */
import { evaluateStress } from '../lib/stress';

export async function getMarketStress({ fetchImpl = fetch, portfolioDrawdownPct = null } = {}) {
  let benchmark = null;
  try {
    const res = await fetchImpl('/api/market-stress');
    if (res.ok) {
      const j = await res.json();
      if (Number.isFinite(j.drawdownPct)) benchmark = j;
    }
  } catch {
    // rete assente o funzione non raggiungibile: dato non verificabile
  }
  const { known, flag } = evaluateStress({ benchmarkDrawdownPct: benchmark?.drawdownPct ?? null, portfolioDrawdownPct });
  return {
    known, flag,
    benchmarkDrawdownPct: benchmark?.drawdownPct ?? null,
    portfolioDrawdownPct,
    asOf: benchmark?.lastDate ?? null,
    benchmarkName: benchmark?.benchmark ?? null,
  };
}
