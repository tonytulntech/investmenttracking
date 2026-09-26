/**
 * Simulazione Monte Carlo di un piano di accumulo.
 *
 * Funzione pura, senza dipendenze da React o da localStorage: la stessa
 * chiamata con lo stesso `seed` dà sempre lo stesso risultato.
 *
 * Due modi di specificare le ipotesi:
 *  - `expectedReturn` + `volatility` espliciti (modalità avanzata / Backtest);
 *  - `allocation` per bucket, da cui si ricavano tramite marketAssumptions
 *    (modalità guidata).
 *
 * Il modello è un moto browniano geometrico a passo mensile, con il versamento
 * aggiunto a inizio mese. Assume rendimenti indipendenti fra un mese e l'altro:
 * ignora quindi il mean reversion, e tende a sovrastimare la dispersione sugli
 * orizzonti lunghi.
 */

import { portfolioAssumptions } from '../config/marketAssumptions';

export const PERCENTILES = [5, 25, 50, 75, 95];

/** PRNG deterministico a 32 bit. Serve a rendere i test riproducibili. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normale standard via Box-Muller. */
export function gaussian(rand = Math.random) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Percentile su un array già ordinato in senso crescente. */
export function percentileOf(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length * p) / 100));
  return sorted[index];
}

/**
 * @param {Object}  params
 * @param {number}  params.initialInvestment
 * @param {number}  params.monthlyContribution
 * @param {number}  params.years
 * @param {number} [params.expectedReturn]  % annuo — alternativo ad allocation
 * @param {number} [params.volatility]      % annua — alternativo ad allocation
 * @param {Object} [params.allocation]      allocazione per bucket
 * @param {number} [params.targetAmount]    obiettivo per successProbability
 * @param {number} [params.simulations=1000]
 * @param {number} [params.samplePaths=20]  traiettorie restituite per il grafico
 * @param {number} [params.seed]            null = non deterministico
 * @param {boolean}[params.computeBands=true] fasce di percentili mese per mese
 */
export function runMonteCarlo({
  initialInvestment = 0,
  monthlyContribution = 0,
  years = 10,
  expectedReturn,
  volatility,
  allocation = null,
  targetAmount = 0,
  simulations = 1000,
  samplePaths = 20,
  seed = null,
  computeBands = true,
} = {}) {
  if (allocation && (expectedReturn === undefined || volatility === undefined)) {
    const derived = portfolioAssumptions(allocation);
    expectedReturn = expectedReturn ?? derived.expectedReturn;
    volatility = volatility ?? derived.volatility;
  }
  if (expectedReturn === undefined || volatility === undefined) {
    throw new Error('runMonteCarlo richiede expectedReturn+volatility oppure allocation');
  }

  const months = Math.max(0, Math.round(years * 12));
  const sims = Math.max(1, Math.round(simulations));
  const monthlyReturn = expectedReturn / 12 / 100;
  const monthlyVol = volatility / Math.sqrt(12) / 100;

  const rand = seed === null ? Math.random : mulberry32(seed);
  const pathCount = Math.min(samplePaths, sims);

  // Griglia sim × mese: serve per i percentili mese per mese. A 1000 sim e 40
  // anni sono ~3.8 MB, accettabile; con computeBands=false si tiene solo il
  // valore finale.
  const grid = computeBands ? new Float64Array(sims * (months + 1)) : null;
  const finalValues = new Float64Array(sims);
  const paths = [];

  for (let sim = 0; sim < sims; sim++) {
    let value = initialInvestment;
    const path = sim < pathCount ? [value] : null;
    if (grid) grid[sim * (months + 1)] = value;

    for (let month = 1; month <= months; month++) {
      value += monthlyContribution;
      value *= 1 + monthlyReturn + monthlyVol * gaussian(rand);
      if (path) path.push(value);
      if (grid) grid[sim * (months + 1) + month] = value;
    }

    finalValues[sim] = value;
    if (path) paths.push(path);
  }

  const sortedFinal = Float64Array.from(finalValues).sort();

  const percentiles = {};
  PERCENTILES.forEach(p => { percentiles[`p${p}`] = percentileOf(sortedFinal, p); });

  let successCount = 0;
  for (let i = 0; i < sims; i++) if (finalValues[i] >= targetAmount) successCount++;

  const bands = [];
  if (grid) {
    const column = new Float64Array(sims);
    for (let month = 0; month <= months; month++) {
      for (let sim = 0; sim < sims; sim++) column[sim] = grid[sim * (months + 1) + month];
      const sortedColumn = Float64Array.from(column).sort();
      const point = { month };
      PERCENTILES.forEach(p => { point[`p${p}`] = percentileOf(sortedColumn, p); });
      bands.push(point);
    }
  }

  return {
    months,
    simulations: sims,
    assumptions: { expectedReturn, volatility },
    percentiles,
    successProbability: targetAmount > 0 ? (successCount / sims) * 100 : null,
    totalContributions: initialInvestment + monthlyContribution * months,
    finalValues: sortedFinal,
    bands,
    samplePaths: paths,
  };
}

/** Istogramma dei valori finali, per il grafico a barre del Backtest. */
export function buildHistogram(finalValues, bucketCount = 30) {
  if (finalValues.length === 0) return [];

  const min = finalValues[0];
  const max = finalValues[finalValues.length - 1];
  const bucketSize = (max - min) / bucketCount;
  if (bucketSize === 0) return [];

  const counts = new Array(bucketCount).fill(0);
  for (let i = 0; i < finalValues.length; i++) {
    const index = Math.min(bucketCount - 1, Math.floor((finalValues[i] - min) / bucketSize));
    counts[index]++;
  }

  return counts.map((count, i) => {
    const start = min + i * bucketSize;
    return {
      range: `€${Math.round(start / 1000)}k`,
      value: start + bucketSize / 2,
      count,
      frequency: (count / finalValues.length) * 100,
    };
  });
}

/**
 * Compone i dati del grafico traiettorie: una riga per mese con le fasce di
 * percentili e le traiettorie campione.
 */
export function buildPathChartData({ bands, samplePaths }) {
  return bands.map((band, month) => {
    const point = { ...band };
    samplePaths.forEach((path, index) => { point[`path${index}`] = path[month]; });
    return point;
  });
}
