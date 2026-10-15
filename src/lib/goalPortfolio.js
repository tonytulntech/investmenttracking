/**
 * Portafoglio per obiettivo (GUIDED_MODE_SPEC.md §5.2, §6). Funzioni pure.
 * Ogni transazione può portare un `goalId`: le quote appartengono all'obiettivo, non al titolo.
 * Senza `goalId` (o con un obiettivo che non esiste più) la transazione è "da assegnare".
 * L'app non sceglie mai gli ETF né il loro bucket: lo fa lo studente. Qui ci sono solo suggerimenti
 * di *classificazione* (da categoria dichiarata) e di *assegnazione* (da ciò che ha già fatto lui).
 */
import { BUCKETS } from './glidePath';

const isCash = (tx) => tx.isCash || tx.macroCategory === 'Cash' || tx.ticker === 'CASH';
const isTradable = (tx) => !isCash(tx) && !tx.excludeFromStats && (tx.type === 'buy' || tx.type === 'sell');

/** Transazioni di titoli senza un obiettivo valido. */
export function unassignedTransactions(transactions, goals) {
  const ids = new Set(goals.map(g => g.id));
  return transactions.filter(tx => isTradable(tx) && !(tx.goalId && ids.has(tx.goalId)));
}

/** Raggruppa per titolo: un solo gesto assegna tutte le transazioni dello stesso titolo. */
export function groupByTicker(transactions) {
  const map = new Map();
  for (const tx of transactions) {
    const key = tx.ticker;
    if (!map.has(key)) map.set(key, { ticker: key, name: tx.name || key, isin: tx.isin || '', txs: [] });
    map.get(key).txs.push(tx);
  }
  return [...map.values()]
    .map(g => {
      const dates = g.txs.map(t => t.date).sort();
      return { ...g, count: g.txs.length, firstDate: dates[0], lastDate: dates[dates.length - 1] };
    })
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}

/**
 * Suggerimento di assegnazione, solo da ciò che lo studente ha già fatto:
 * l'obiettivo a cui ha già assegnato più transazioni di quel titolo; con un solo obiettivo, quello.
 * @returns {string|null} goalId
 */
export function suggestGoalForTicker(ticker, transactions, goals) {
  const ids = new Set(goals.map(g => g.id));
  const counts = {};
  for (const tx of transactions) {
    if (tx.ticker === ticker && tx.goalId && ids.has(tx.goalId)) counts[tx.goalId] = (counts[tx.goalId] ?? 0) + 1;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (best.length) return best[0][0];
  const active = goals.filter(g => g.status === 'active');
  return active.length === 1 ? active[0].id : null;
}

/**
 * Bucket suggerito dalla categoria dichiarata del titolo. Alta confidenza solo dove la categoria lo dice
 * senza ambiguità; per le obbligazioni la durata (breve/medio termine) non si indovina: la sceglie lo studente.
 * @returns {{bucket:string, confidence:'high'}|null}
 */
export function suggestBucket({ macroCategory, microCategory, name } = {}) {
  const macro = String(macroCategory ?? '');
  const micro = String(microCategory ?? '');
  const text = `${micro} ${name ?? ''}`;
  if (macro === 'Monetario' || macro === 'Cash' || /monetari|liquidit/i.test(micro)) return { bucket: 'cash', confidence: 'high' };
  if (/^oro$|\boro\b|\bgold\b/i.test(micro)) return { bucket: 'gold', confidence: 'high' };
  if (macro === 'Azioni' || /^azionario/i.test(micro)) return { bucket: 'equity', confidence: 'high' };
  if (macro === 'Obbligazioni' || /^obbligazion/i.test(micro)) {
    if (/breve|short|1-3|0-3|ultra/i.test(text)) return { bucket: 'bondShort', confidence: 'high' };
    return null;
  }
  return null;
}

/**
 * Pesi per bucket di un portafoglio.
 * @param {{ticker:string, marketValue:number}[]} holdings  posizioni già valorizzate (una riga per titolo)
 * @param {Object<string,string>} bucketMap  ticker → bucket scelto dallo studente
 * @returns {{total:number, weights:Object<string,number>, values:Object<string,number>, unclassified:{value:number, tickers:string[]}}}
 *   `weights` in % del totale; `unclassified` = titoli senza bucket (contano nel totale)
 */
export function bucketWeights(holdings, bucketMap = {}) {
  const values = Object.fromEntries(BUCKETS.map(b => [b, 0]));
  const unclassified = { value: 0, tickers: [] };
  let total = 0;
  for (const h of holdings) {
    const v = Number(h.marketValue) || 0;
    total += v;
    const bucket = bucketMap[h.ticker];
    if (BUCKETS.includes(bucket)) values[bucket] += v;
    else { unclassified.value += v; unclassified.tickers.push(h.ticker); }
  }
  const weights = Object.fromEntries(BUCKETS.map(b => [b, total > 0 ? (values[b] / total) * 100 : 0]));
  return { total, weights, values, unclassified };
}

/** Scostamento in punti percentuali dal modello (positivo = sopra il modello). */
export function driftFromTarget(weights, target) {
  return Object.fromEntries(BUCKETS.map(b => [b, Math.round(((weights[b] ?? 0) - (target[b] ?? 0)) * 10) / 10]));
}

/** Aggrega le posizioni per titolo (lo stesso ETF su più broker è una riga sola). */
export function mergeByTicker(holdings) {
  const map = new Map();
  for (const h of holdings) {
    const cur = map.get(h.ticker);
    if (!cur) map.set(h.ticker, { ...h });
    else {
      cur.quantity += h.quantity;
      cur.totalCost += h.totalCost;
      cur.marketValue += h.marketValue;
      cur.unrealizedPL += h.unrealizedPL;
      cur.avgPrice = cur.quantity > 0 ? cur.totalCost / cur.quantity : 0;
      cur.priceUnavailable = cur.priceUnavailable || h.priceUnavailable;
    }
  }
  return [...map.values()];
}
