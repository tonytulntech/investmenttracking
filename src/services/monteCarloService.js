/**
 * Monte Carlo Simulation Service
 *
 * Motore di simulazione stocastica estratto da Backtest.jsx e arricchito
 * con parametri per il contesto italiano (tasse, inflazione, FIRE).
 */

function gaussianRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function getPercentile(sorted, p) {
  const i = Math.floor(sorted.length * p / 100);
  return sorted[Math.min(i, sorted.length - 1)];
}

/**
 * @typedef {Object} MonteCarloParams
 * @property {number} initialValue       - Valore attuale del portafoglio
 * @property {number} monthlyContribution - Contributo mensile (PAC). 0 se nessuno.
 * @property {number} expectedReturn      - Rendimento annuo atteso (% lordo, es. 7)
 * @property {number} volatility          - Volatilita annua (%, es. 15)
 * @property {number} years               - Orizzonte temporale in anni
 * @property {number} [simulations=1000]  - Numero di simulazioni
 * @property {number} [inflation=2]       - Inflazione annua (%)
 * @property {number} [taxRate=26]        - Aliquota capital gain Italia (%)
 * @property {number} [withdrawalRate=0]  - Safe Withdrawal Rate annuo (%, 0 = nessun prelievo)
 * @property {number} [monthlyWithdrawal=0] - Prelievo mensile fisso (alternativo a SWR)
 * @property {number} [targetAmount=0]    - Obiettivo da raggiungere (per probabilita di successo)
 */

/**
 * @typedef {Object} MonteCarloResults
 * @property {Object} percentiles - { p5, p10, p25, p50, p75, p90, p95 }
 * @property {number} successProbability - % scenari che raggiungono targetAmount
 * @property {number} ruinProbability    - % scenari che finiscono a 0 (se prelievi attivi)
 * @property {number} totalContributions - Contributi totali versati
 * @property {Array}  histogram          - Distribuzione dei valori finali
 * @property {Array}  fanChart           - Serie temporale con bande percentili
 * @property {number} medianReal         - Mediana al netto di inflazione
 * @property {number} medianAfterTax     - Mediana al netto di tasse sul gain
 */

export function runMonteCarlo(params) {
  const {
    initialValue,
    monthlyContribution = 0,
    expectedReturn,
    volatility,
    years,
    simulations = 1000,
    inflation = 2,
    taxRate = 26,
    withdrawalRate = 0,
    monthlyWithdrawal = 0,
    targetAmount = 0,
  } = params;

  const monthlyReturn = expectedReturn / 12 / 100;
  const monthlyVol = (volatility / Math.sqrt(12)) / 100;
  const monthlyInflation = Math.pow(1 + inflation / 100, 1 / 12) - 1;
  const totalMonths = years * 12;
  const totalContributions = initialValue + monthlyContribution * totalMonths;

  const finals = [];
  const samplePaths = [];
  const NUM_SAMPLE = 20;

  // per-month accumulators for percentile fan chart
  const monthlyValues = Array.from({ length: totalMonths + 1 }, () => []);

  for (let sim = 0; sim < simulations; sim++) {
    let value = initialValue;
    let costBasis = initialValue;
    const isPath = sim < NUM_SAMPLE;
    const path = isPath ? [value] : null;

    monthlyValues[0].push(value);

    for (let m = 1; m <= totalMonths; m++) {
      value += monthlyContribution;
      costBasis += monthlyContribution;

      const r = monthlyReturn + monthlyVol * gaussianRandom();
      value *= (1 + r);

      // prelievi
      if (monthlyWithdrawal > 0) {
        value -= monthlyWithdrawal;
      } else if (withdrawalRate > 0) {
        value -= (value * withdrawalRate / 100) / 12;
      }

      if (value < 0) value = 0;

      monthlyValues[m].push(value);
      if (isPath) path.push(value);
    }

    finals.push({ nominal: value, costBasis });
    if (isPath) samplePaths.push(path);
  }

  // sort for percentiles
  const sorted = finals.map(f => f.nominal).sort((a, b) => a - b);

  const percentiles = {
    p5:  getPercentile(sorted, 5),
    p10: getPercentile(sorted, 10),
    p25: getPercentile(sorted, 25),
    p50: getPercentile(sorted, 50),
    p75: getPercentile(sorted, 75),
    p90: getPercentile(sorted, 90),
    p95: getPercentile(sorted, 95),
  };

  // success & ruin probability
  const successCount = targetAmount > 0 ? sorted.filter(v => v >= targetAmount).length : 0;
  const ruinCount = sorted.filter(v => v <= 0).length;

  // median in real terms (deflated)
  const deflator = Math.pow(1 + inflation / 100, years);
  const medianReal = percentiles.p50 / deflator;

  // median after tax on gain
  const medianGain = Math.max(0, percentiles.p50 - totalContributions);
  const medianAfterTax = percentiles.p50 - medianGain * (taxRate / 100);

  // histogram
  const minVal = sorted[0];
  const maxVal = sorted[sorted.length - 1];
  const bucketCount = 30;
  const bucketSize = maxVal > minVal ? (maxVal - minVal) / bucketCount : 1;
  const histogram = [];
  for (let i = 0; i < bucketCount; i++) {
    const lo = minVal + i * bucketSize;
    const hi = lo + bucketSize;
    const count = sorted.filter(v => v >= lo && (i === bucketCount - 1 ? v <= hi : v < hi)).length;
    histogram.push({ range: `${Math.round(lo / 1000)}k`, value: lo + bucketSize / 2, count, frequency: count / simulations * 100 });
  }

  // fan chart (month-by-month percentile bands)
  const fanChart = monthlyValues.map((vals, m) => {
    vals.sort((a, b) => a - b);
    return {
      month: m,
      p5:  getPercentile(vals, 5),
      p10: getPercentile(vals, 10),
      p25: getPercentile(vals, 25),
      p50: getPercentile(vals, 50),
      p75: getPercentile(vals, 75),
      p90: getPercentile(vals, 90),
      p95: getPercentile(vals, 95),
    };
  });

  return {
    percentiles,
    successProbability: targetAmount > 0 ? (successCount / simulations) * 100 : null,
    ruinProbability: (ruinCount / simulations) * 100,
    totalContributions,
    medianReal,
    medianAfterTax,
    histogram,
    fanChart,
    samplePaths,
    params: { ...params, simulations, inflation, taxRate },
  };
}

/**
 * Calcola l'eta di indipendenza finanziaria (FIRE).
 * Prova anni crescenti finché la probabilita di non esaurire il capitale
 * supera la soglia (default 90%).
 */
export function findFIREAge({
  currentAge,
  initialValue,
  monthlyContribution,
  expectedReturn,
  volatility,
  monthlyExpenses,
  inflation = 2,
  taxRate = 26,
  maxAge = 90,
  simulations = 500,
  successThreshold = 90,
}) {
  for (let retireAge = currentAge + 1; retireAge <= 70; retireAge++) {
    const accumYears = retireAge - currentAge;
    const drawdownYears = maxAge - retireAge;

    // Fase 1: accumulo fino a retireAge
    const accumResult = runMonteCarlo({
      initialValue,
      monthlyContribution,
      expectedReturn,
      volatility,
      years: accumYears,
      simulations,
      inflation,
      taxRate,
    });

    // Fase 2: decumulo da retireAge a maxAge con spese mensili
    const drawResult = runMonteCarlo({
      initialValue: accumResult.percentiles.p50,
      monthlyContribution: 0,
      expectedReturn: expectedReturn * 0.7, // portafoglio piu conservativo in decumulo
      volatility: volatility * 0.7,
      years: drawdownYears,
      simulations,
      inflation,
      taxRate,
      monthlyWithdrawal: monthlyExpenses,
    });

    if (drawResult.ruinProbability <= (100 - successThreshold)) {
      return {
        fireAge: retireAge,
        accumMedian: accumResult.percentiles.p50,
        drawdownSurvival: 100 - drawResult.ruinProbability,
        accumYears,
        drawdownYears,
      };
    }
  }

  return { fireAge: null, message: 'FIRE non raggiungibile con i parametri attuali' };
}
