/**
 * Goal Service — logica degli obiettivi (modalità Guidata).
 * Funzioni pure: nessun accesso a storage/DOM. Vedi GUIDED_MODE_SPEC.md.
 *
 * Convenzioni: importi in euro di OGGI (reali) e DOPO le tasse sul gain.
 * Il Monte Carlo lavora in valori nominali lordi, quindi il target viene
 * convertito prima della simulazione. I versamenti mensili sono costanti
 * in termini nominali (ipotesi prudente: non indicizzati all'inflazione).
 */
import { simulateGoal } from '../lib/multiAssetMonteCarlo';
import { glidePathAllocation, withGold } from '../lib/glidePath';
import { MARKET_ASSUMPTIONS as MA, getCorrelation } from '../config/marketAssumptions';

export const GOAL_STATUS = {
  REACHED: 'reached',
  ON_TRACK: 'on_track',
  WATCH: 'watch',
  REVIEW: 'review',
  EXPIRED: 'expired',
};

const MS_PER_MONTH = 30.4375 * 24 * 60 * 60 * 1000;

/** Anni (frazionari) da `now` al 31/12 di `goalYear`. Negativo se già passato. */
export function yearsUntilGoal(goalYear, now = new Date()) {
  const end = new Date(goalYear, 11, 31);
  return Math.round((end - now) / MS_PER_MONTH) / 12;
}

/**
 * Rendimento e volatilità attesi (% annua) di un'allocazione.
 * @param {Object<string, number>} weights - pesi per macro categoria (qualsiasi scala, vengono normalizzati)
 * @returns {{expectedReturn:number, volatility:number}|null} null se allocazione vuota/sconosciuta
 */
export function portfolioStats(weights) {
  const entries = Object.entries(weights || {})
    .filter(([k, w]) => MA.assets[k] && w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return null;
  const w = entries.map(([k, v]) => [k, v / total]);

  const ret = w.reduce((s, [k, x]) => s + x * MA.assets[k].return, 0) - MA.costDrag;
  let variance = 0;
  for (const [ki, xi] of w) {
    for (const [kj, xj] of w) {
      variance += xi * xj * MA.assets[ki].volatility * MA.assets[kj].volatility * getCorrelation(ki, kj);
    }
  }
  return { expectedReturn: ret, volatility: Math.sqrt(Math.max(0, variance)) };
}

/**
 * Allocazione che segue il glide path nel tempo: `monthsLeft → pesi per bucket`.
 * @param {Object} p
 * @param {string} [p.type]                  tipo di obiettivo ('emergency' = niente azionario)
 * @param {Object} [p.riskProfile]           { maxTolerableLoss, incomeStability }
 * @param {number} [p.extraYears=0]          anni oltre la data (rendita: orizzonte fino a horizonEndAge)
 * @param {number} [p.goldPct=0]             oro scelto a mano, 0–10
 */
export function glideSchedule({ type, riskProfile, extraYears = 0, goldPct = 0 } = {}) {
  return (monthsLeft) => {
    const a = glidePathAllocation({ years: monthsLeft / 12 + extraYears, type, riskProfile });
    return goldPct ? withGold(a, goldPct) : a;
  };
}

export function statusFromProbability(p) {
  if (p >= MA.thresholds.onTrack) return GOAL_STATUS.ON_TRACK;
  if (p >= MA.thresholds.watch) return GOAL_STATUS.WATCH;
  return GOAL_STATUS.REVIEW;
}

/** Valore nominale lordo → euro di oggi dopo le tasse sul gain. */
export function toRealAfterTax(nominal, costBasis, years, inflation = MA.inflation, taxRate = MA.taxRate) {
  const gain = Math.max(0, nominal - costBasis);
  const afterTax = nominal - gain * (taxRate / 100);
  return afterTax / Math.pow(1 + inflation / 100, years);
}

/**
 * Valore nominale lordo che, dopo tasse e inflazione, vale `targetReal` euro di oggi.
 * Inversa di toRealAfterTax: V − t·(V − C) = T  ⇒  V = (T − t·C) / (1 − t).
 */
export function nominalTargetForSuccess(targetReal, costBasis, years, inflation = MA.inflation, taxRate = MA.taxRate) {
  const t = taxRate / 100;
  const nominalAfterTax = targetReal * Math.pow(1 + inflation / 100, years);
  if (nominalAfterTax <= costBasis) return nominalAfterTax;
  return (nominalAfterTax - t * costBasis) / (1 - t);
}

/**
 * Valuta un obiettivo.
 * @param {Object} input
 * @param {number} input.currentValue          - valore attuale del portafoglio (€)
 * @param {number} [input.initialCostBasis]    - capitale già versato (default: currentValue, cioè si assume nessun gain già maturato; passare il valore reale per tasse più accurate)
 * @param {number} input.targetAmount          - importo obiettivo in € di oggi
 * @param {number} input.goalYear
 * @param {number} [input.monthlyContribution=0]
 * @param {Object<string, number>} [input.weights] - allocazione costante per macro categoria/bucket
 * @param {(monthsLeft:number)=>Object<string, number>} [input.allocationAt] - allocazione che cambia nel tempo (glide path)
 * @param {boolean} [input.indexContribution=false] - il versamento cresce con l'inflazione
 * @param {boolean} [input.indexTarget=true]   - il target è in € di oggi (false: € nominali fissi)
 * @param {Date}   [input.now]
 * @param {number} [input.simulations=2000]
 * @param {number} [input.seed=42]             - seme: stesso input → stesso output
 * @param {number} [input.taxRate]             - % plusvalenze al ritiro (default: Italia); vedi resolveTaxRate()
 */
export function evaluateGoal({
  currentValue,
  initialCostBasis,
  targetAmount,
  goalYear,
  monthlyContribution = 0,
  weights,
  allocationAt,
  indexContribution = false,
  indexTarget = true,
  now = new Date(),
  simulations = 2000,
  seed = 42,
  taxRate = MA.taxRate,
}) {
  const yearsLeft = yearsUntilGoal(goalYear, now);
  const months = Math.round(yearsLeft * 12);

  const funded = currentValue >= targetAmount;

  if (months <= 0) {
    return funded
      ? { status: GOAL_STATUS.REACHED, successProbability: 100, yearsLeft: 0, outcomes: null, stats: null }
      : { status: GOAL_STATUS.EXPIRED, successProbability: 0, yearsLeft: 0, outcomes: null, stats: null };
  }

  const stats = portfolioStats(allocationAt ? allocationAt(months) : weights);
  if (!stats) throw new Error('Allocazione vuota o sconosciuta: impossibile simulare.');

  const mc = simulateGoal({
    initialValue: currentValue,
    initialCostBasis: initialCostBasis ?? currentValue,
    monthlyContribution,
    indexContribution,
    months,
    weights,
    weightsAt: allocationAt,
    targetAmount,
    indexTarget,
    taxRate,
    simulations,
    seed,
  });

  // REACHED = l'importo c'è già oggi. La probabilità resta quella reale di
  // ritrovarlo alla scadenza (dopo inflazione e tasse): non è forzata a 100.
  return {
    status: funded ? GOAL_STATUS.REACHED : statusFromProbability(mc.successProbability),
    successProbability: mc.successProbability,
    yearsLeft: months / 12,
    outcomes: { p10: mc.percentiles.p10, p50: mc.percentiles.p50, p90: mc.percentiles.p90 },
    percentiles: mc.percentiles,
    fan: mc.fan,
    stats,
    assumptionsVersion: MA.version,
  };
}

/**
 * Versamento mensile minimo per raggiungere la probabilità `targetProbability`.
 * @returns {number|null} euro/mese (arrotondato per eccesso); 0 se già sufficiente; null se irraggiungibile
 */
export function monthlyNeededForSuccess(input, targetProbability = MA.thresholds.onTrack) {
  const probAt = (monthly) => evaluateGoal({ ...input, monthlyContribution: monthly, simulations: 1000 }).successProbability;

  if (probAt(0) >= targetProbability) return 0;

  const months = Math.max(1, Math.round(yearsUntilGoal(input.goalYear, input.now) * 12));
  const base = Math.max(100, (input.targetAmount - input.currentValue) / months);
  const cap = base * 4; // copre ampiamente inflazione, tasse e volatilità
  let hi = base;
  while (probAt(hi) < targetProbability) {
    if (hi >= cap) return null;
    hi = Math.min(hi * 1.5, cap);
  }

  let lo = 0;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (probAt(mid) >= targetProbability) hi = mid; else lo = mid;
  }
  return Math.ceil(hi);
}

/**
 * "Devo fare qualcosa?" — una sola azione, in ordine di priorità:
 * rivedere > ribilanciare > versare > niente.
 * @param {Object} p
 * @param {Object} p.evaluation            - risultato di evaluateGoal
 * @param {number} [p.maxDriftPct=0]       - massimo scostamento dall'allocazione target (punti %)
 * @param {number} [p.rebalanceThresholdPct=5]
 * @param {number} [p.contributionShortfall=0] - € di versamenti previsti e non effettuati
 * @param {number|null} [p.monthlyNeeded]  - da monthlyNeededForSuccess
 */
export function recommendAction({
  evaluation,
  maxDriftPct = 0,
  rebalanceThresholdPct = 5,
  contributionShortfall = 0,
  monthlyNeeded = null,
}) {
  const { status } = evaluation;

  if (status === GOAL_STATUS.REACHED) {
    return { type: 'none', code: 'goal_reached', message: 'L\'importo è già disponibile: mantieni l\'allocazione prevista dal percorso per proteggerlo fino alla scadenza.' };
  }
  if (status === GOAL_STATUS.EXPIRED) {
    return { type: 'review', code: 'goal_expired', message: 'La data dell\'obiettivo è passata: aggiorna importo o scadenza.' };
  }
  if (status === GOAL_STATUS.REVIEW) {
    return {
      type: 'review',
      code: 'low_probability',
      message: monthlyNeeded == null
        ? 'L\'obiettivo, così com\'è, è difficilmente raggiungibile: rivedi importo o scadenza.'
        : `Probabilità bassa. Per tornare in linea servirebbero circa €${monthlyNeeded} al mese, oppure più tempo o un importo più basso.`,
      amount: monthlyNeeded,
    };
  }
  if (maxDriftPct > rebalanceThresholdPct) {
    return {
      type: 'rebalance',
      code: 'drift',
      message: `Il portafoglio si è spostato di ${maxDriftPct.toFixed(1)} punti dall'allocazione prevista: ribilancia.`,
    };
  }
  if (contributionShortfall > 0) {
    return {
      type: 'contribute',
      code: 'missed_contributions',
      message: `Mancano €${Math.round(contributionShortfall)} di versamenti previsti.`,
      amount: Math.round(contributionShortfall),
    };
  }
  if (status === GOAL_STATUS.WATCH) {
    return {
      type: 'contribute',
      code: 'watch',
      message: monthlyNeeded == null
        ? 'Sei un po\' sotto il percorso: valuta di aumentare il versamento.'
        : `Sei un po' sotto il percorso: con circa €${monthlyNeeded} al mese torneresti in linea.`,
      amount: monthlyNeeded,
    };
  }
  return { type: 'none', code: 'on_track', message: 'Niente da fare: sei in linea con il tuo obiettivo.' };
}
