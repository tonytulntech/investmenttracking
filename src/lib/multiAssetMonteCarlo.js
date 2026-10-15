/**
 * Monte Carlo multi-bucket in termini REALI (GUIDED_MODE_SPEC.md §11).
 *
 * - Allocazione variabile nel tempo (glide path) tramite `weightsAt(mesiRimanenti)`.
 * - Inflazione casuale, correlata al rendimento del portafoglio.
 * - Esito: valore finale in euro di OGGI, dopo le tasse sulle plusvalenze.
 *
 * Il rendimento mensile del portafoglio e l'inflazione sono due normali
 * correlate: la correlazione si ricava ogni mese dall'allocazione e dalle
 * correlazioni tra bucket e inflazione. È esatto per combinazioni lineari di
 * normali e non richiede una matrice di covarianza completa e coerente.
 */
import { createSeededRandom } from '../services/monteCarloService';
import { MARKET_ASSUMPTIONS } from '../config/marketAssumptions';

const gaussian = (rand) => {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const percentile = (sorted, p) => sorted[Math.min(Math.floor((sorted.length * p) / 100), sorted.length - 1)];

function corr(assumptions, a, b) {
  if (a === b) return 1;
  const c = assumptions.correlations ?? {};
  return c[`${a}|${b}`] ?? c[`${b}|${a}`] ?? 0;
}

/**
 * Parametri MENSILI del portafoglio per una data allocazione.
 * @param {Object<string,number>} weights pesi (qualsiasi scala, normalizzati)
 * @returns {{mu:number, sigma:number, rho:number}|null} rendimento medio, volatilità, correlazione con l'inflazione
 */
export function portfolioMonthlyModel(weights, assumptions = MARKET_ASSUMPTIONS) {
  const entries = Object.entries(weights ?? {}).filter(([k, w]) => assumptions.assets[k] && w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return null;
  const w = entries.map(([k, x]) => [k, x / total]);

  const mu = w.reduce((s, [k, x]) => s + x * assumptions.assets[k].return, 0) - (assumptions.costDrag ?? 0);
  let variance = 0;
  for (const [ki, xi] of w) {
    for (const [kj, xj] of w) {
      variance += xi * xj * assumptions.assets[ki].volatility * assumptions.assets[kj].volatility * corr(assumptions, ki, kj);
    }
  }
  const sigmaAnnual = Math.sqrt(Math.max(0, variance));
  const infVol = assumptions.inflationVol ?? 0;
  const cov = w.reduce((s, [k, x]) => s + x * assumptions.assets[k].volatility * infVol * corr(assumptions, k, 'inflation'), 0);
  const rho = sigmaAnnual > 0 && infVol > 0 ? Math.max(-1, Math.min(1, cov / (sigmaAnnual * infVol))) : 0;

  return { mu: mu / 100 / 12, sigma: sigmaAnnual / 100 / Math.sqrt(12), rho };
}

/**
 * @param {Object} p
 * @param {number} p.initialValue
 * @param {number} [p.initialCostBasis]            default: initialValue
 * @param {number} [p.monthlyContribution=0]       € nominali al mese
 * @param {boolean} [p.indexContribution=false]    il versamento cresce con l'inflazione
 * @param {number} p.months
 * @param {Object<string,number>} [p.weights]      allocazione costante…
 * @param {(monthsLeft:number)=>Object<string,number>} [p.weightsAt] …oppure variabile nel tempo
 * @param {number} p.targetAmount                  in € di oggi (indexTarget) o nominali
 * @param {boolean} [p.indexTarget=true]
 * @param {number} [p.taxRate]                     % plusvalenze al ritiro
 * @param {number} [p.simulations=2000]
 * @param {number} [p.seed=42]
 * @param {Object} [p.assumptions]                 default MARKET_ASSUMPTIONS (iniettabile nei test)
 */
export function simulateGoal({
  initialValue,
  initialCostBasis,
  monthlyContribution = 0,
  indexContribution = false,
  months,
  weights,
  weightsAt,
  targetAmount,
  indexTarget = true,
  taxRate,
  simulations = 2000,
  seed = 42,
  assumptions = MARKET_ASSUMPTIONS,
}) {
  const tax = (taxRate ?? assumptions.taxRate) / 100;
  const infMean = assumptions.inflation / 100 / 12;
  const infVol = (assumptions.inflationVol ?? 0) / 100 / Math.sqrt(12);
  const basis0 = initialCostBasis ?? initialValue;
  const rng = createSeededRandom(seed);

  // Parametri mensili precalcolati: m = 1..months, mesi rimanenti = months - m + 1
  const models = [];
  for (let m = 1; m <= months; m++) {
    const model = portfolioMonthlyModel(weightsAt ? weightsAt(months - m + 1) : weights, assumptions);
    if (!model) throw new Error('Allocazione vuota o sconosciuta: impossibile simulare.');
    models.push(model);
  }

  const finals = new Array(simulations);
  const yearly = Math.floor(months / 12);
  const fanSamples = Array.from({ length: yearly + 1 }, () => new Array(simulations));
  let success = 0;

  for (let s = 0; s < simulations; s++) {
    let value = initialValue, basis = basis0, level = 1;
    fanSamples[0][s] = value;
    for (let m = 1; m <= months; m++) {
      const { mu, sigma, rho } = models[m - 1];
      const contribution = indexContribution ? monthlyContribution * level : monthlyContribution;
      value += contribution;
      basis += contribution;

      const zi = gaussian(rng);
      const zp = rho * zi + Math.sqrt(1 - rho * rho) * gaussian(rng);
      value = Math.max(0, value * (1 + mu + sigma * zp));
      level *= 1 + infMean + infVol * zi;

      if (m % 12 === 0) fanSamples[m / 12][s] = value / level;
    }
    const afterTax = value - tax * Math.max(0, value - basis);
    const realAfterTax = afterTax / level; // € di oggi, dopo le tasse
    if ((indexTarget ? realAfterTax : afterTax) >= targetAmount) success++;
    finals[s] = realAfterTax;
  }

  const sorted = [...finals].sort((a, b) => a - b);
  const fan = fanSamples.map((arr, year) => {
    arr.sort((a, b) => a - b);
    return { year, p5: percentile(arr, 5), p25: percentile(arr, 25), p50: percentile(arr, 50), p75: percentile(arr, 75), p95: percentile(arr, 95) };
  });

  return {
    successProbability: (success / simulations) * 100,
    percentiles: Object.fromEntries([5, 10, 25, 50, 75, 90, 95].map(p => [`p${p}`, percentile(sorted, p)])),
    fan,
    months,
    assumptionsVersion: assumptions.version,
  };
}
