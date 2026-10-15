/**
 * Glide path: allocazione per bucket in funzione degli anni all'obiettivo
 * (GUIDED_MODE_SPEC.md §3). Funzioni pure.
 *
 * Bucket: equity, bondShort (1-3 anni), bondMedium (7-10 anni), cash, gold.
 * Le soglie degli anni sono incluse nel limite superiore: un obiettivo a
 * esattamente 20 anni ricade nella fascia "15–20".
 *
 * Per gli obiettivi di tipo rendita (`income`) passare come `years` l'orizzonte
 * fino a `horizonEndAge`, non gli anni all'inizio dei prelievi (§12.3).
 */

export const BUCKETS = ['equity', 'bondShort', 'bondMedium', 'cash', 'gold'];

// [anni minimi (esclusi), equity, bondShort, bondMedium, cash]
const BASE_TABLE = [
  [20, 90, 0, 10, 0],
  [15, 80, 5, 15, 0],
  [10, 70, 10, 20, 0],
  [7, 60, 15, 25, 0],
  [5, 45, 30, 25, 0],
  [3, 30, 50, 20, 0],
  [1, 10, 70, 0, 20],
  [-Infinity, 0, 30, 0, 70],
];

const LOSS_ADJUSTMENT = { 10: -20, 20: -10, 30: 0, 40: 10 };

export function baseAllocation(years) {
  const row = BASE_TABLE.find(([min]) => years > min);
  return { equity: row[1], bondShort: row[2], bondMedium: row[3], cash: row[4], gold: 0 };
}

/** Sposta `points` punti di azionario verso il bond breve (senza scendere sotto 0). */
function reduceEquity(a, points) {
  const moved = Math.min(a.equity, points);
  a.equity -= moved;
  a.bondShort += moved;
}

/** Aumenta l'azionario prendendo da bond medio, poi bond breve, poi liquidità. */
function increaseEquity(a, points) {
  let left = points;
  for (const source of ['bondMedium', 'bondShort', 'cash']) {
    const take = Math.min(a[source], left);
    a[source] -= take;
    a.equity += take;
    left -= take;
    if (left === 0) break;
  }
}

/**
 * @param {Object} p
 * @param {number} p.years                 anni all'obiettivo (o all'orizzonte, per la rendita)
 * @param {string} [p.type]                'emergency' → sempre 0 azionario, 50 liquidità / 50 bond breve
 * @param {{maxTolerableLoss?:10|20|30|40, incomeStability?:'stable'|'variable'}} [p.riskProfile]
 * @returns {{equity:number, bondShort:number, bondMedium:number, cash:number, gold:number}} somma sempre 100
 */
export function glidePathAllocation({ years, type, riskProfile = {} }) {
  if (type === 'emergency') return { equity: 0, bondShort: 50, bondMedium: 0, cash: 50, gold: 0 };

  const a = baseAllocation(years);
  const adj = LOSS_ADJUSTMENT[riskProfile.maxTolerableLoss] ?? 0;
  if (adj < 0) reduceEquity(a, -adj);
  else if (adj > 0) increaseEquity(a, adj);
  if (riskProfile.incomeStability === 'variable') reduceEquity(a, 10);
  return a;
}

/**
 * Sposta l'azionario di `delta` punti (−10…+10), a spese/favore dei bucket meno rischiosi.
 * Serve allo slider dello studente: stessa logica dell'aggiustamento per rischio.
 */
export function adjustEquity(allocation, delta) {
  const d = Math.max(-10, Math.min(10, Math.round(delta)));
  const a = { ...allocation };
  if (d < 0) reduceEquity(a, -d);
  else if (d > 0) increaseEquity(a, d);
  return a;
}

/**
 * Aggiunge fino al 10% di oro (solo su scelta manuale dello studente), sottraendolo
 * dagli altri bucket in proporzione (metodo del resto maggiore: somma sempre 100).
 */
export function withGold(allocation, goldPct) {
  const gold = Math.min(10, Math.max(0, Math.round(goldPct)));
  const out = { ...allocation, gold: 0 };
  if (gold === 0) return out;

  const others = BUCKETS.filter(b => b !== 'gold');
  const total = others.reduce((s, b) => s + out[b], 0);
  const cuts = others.map(b => {
    const exact = (out[b] * gold) / total;
    return { b, take: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = gold - cuts.reduce((s, c) => s + c.take, 0);
  for (const c of [...cuts].sort((x, y) => y.rest - x.rest)) {
    if (left > 0 && out[c.b] > c.take) { c.take += 1; left -= 1; }
  }
  for (const c of cuts) out[c.b] -= c.take;
  out.gold = gold;
  return out;
}

/** Indice della fascia in cui ricade un orizzonte: serve a rilevare il cambio di fascia (§3.4). */
export function bandFor(years) {
  return BASE_TABLE.findIndex(([min]) => years > min);
}
