/**
 * Fattibilità di un obiettivo e analisi del versamento. Funzioni pure.
 * L'app non propone come investire: stima solo se, con le ipotesi dichiarate (rendimento, inflazione, tasse),
 * l'importo è raggiungibile e se il versamento mensile è troppo basso, adeguato o più del necessario.
 * Importi in € di oggi, al netto delle tasse sulle plusvalenze al ritiro.
 */
import { evaluateGoal, monthlyNeededForSuccess, yearsUntilGoal, portfolioStats } from '../services/goalService';
import { MARKET_ASSUMPTIONS as MA, resolveTaxRate } from '../config/marketAssumptions';
import { SCENARIOS, EMERGENCY_MIX, DEFAULT_SCENARIO, scenarioById } from '../config/scenarios';
import { nominalAtDate, incomeTarget } from './goalModel';

const ON_TRACK = MA.thresholds.onTrack;
// Oltre questa quota sopra il minimo necessario il versamento è "più del necessario". Valore iniziale da validare con l'autore.
export const CONTRIBUTION_TOLERANCE = 0.2;

/**
 * Pesi (qualsiasi scala) da usare per la simulazione.
 * `declared` = composizione dichiarata dallo studente nelle regole firmate (se esiste e se scelta).
 */
export function allocationFor(goal, { scenarioId, declared = null } = {}) {
  if (goal.type === 'emergency') return EMERGENCY_MIX;
  const id = scenarioId ?? goal.scenario ?? DEFAULT_SCENARIO;
  if (id === 'declared' && declared) return declared;
  return scenarioById(id).mix;
}

const engineInput = (goal, { allocation, currentValue, costBasis, now, simulations }) => ({
  currentValue: currentValue ?? goal.initialCapital,
  initialCostBasis: costBasis ?? currentValue ?? goal.initialCapital,
  targetAmount: goal.targetAmount,
  goalDate: goal.targetDate,
  monthlyContribution: goal.monthlyContribution,
  weights: allocation,
  taxRate: resolveTaxRate(goal.taxResidence),
  now,
  simulations,
});

/** Esito di un obiettivo con una certa composizione/ipotesi. */
export function evaluateFeasibility(goal, { allocation = allocationFor(goal), currentValue, costBasis, now = new Date(), simulations = 1500 } = {}) {
  const input = engineInput(goal, { allocation, currentValue, costBasis, now, simulations });
  const evaluation = evaluateGoal(input);
  const years = yearsUntilGoal(goal.targetDate, now);
  return { evaluation, input, years, nominalTarget: nominalAtDate(goal.targetAmount, Math.max(0, years)) };
}

/**
 * Le tre ipotesi di rendimento (+ la composizione dichiarata, se c'è). Per il fondo emergenza una sola riga.
 * @returns {{id:string,label:string,expectedReturn:number,volatility:number,probability:number,status:string}[]}
 */
export function evaluateScenarios(goal, { declared = null, currentValue, costBasis, now = new Date(), simulations = 800 } = {}) {
  const rows = goal.type === 'emergency'
    ? [{ id: 'cash', label: 'Liquidità', mix: EMERGENCY_MIX }]
    : [...SCENARIOS, ...(declared ? [{ id: 'declared', label: 'La tua composizione', mix: declared }] : [])];
  return rows.map(s => {
    const stats = portfolioStats(s.mix);
    const { evaluation } = evaluateFeasibility(goal, { allocation: s.mix, currentValue, costBasis, now, simulations });
    return {
      id: s.id, label: s.label,
      expectedReturn: stats.expectedReturn, volatility: stats.volatility,
      expectedRealReturn: ((1 + stats.expectedReturn / 100) / (1 + MA.inflation / 100) - 1) * 100,
      probability: evaluation.successProbability, status: evaluation.status,
    };
  });
}

/** Importo massimo il cui raggiungimento ha probabilità ≥ soglia, con il versamento attuale (arrotondato per difetto a 100 €). */
function maxTargetForSuccess(goal, opts, threshold) {
  const months = Math.max(1, Math.round(yearsUntilGoal(goal.targetDate, opts.now) * 12));
  const start = opts.currentValue ?? goal.initialCapital;
  let lo = 0;
  let hi = Math.max(1000, (start + goal.monthlyContribution * months) * 3);
  // Stesse simulazioni e stesso seme di monthlyNeededForSuccess (1000): i due numeri sono coerenti tra loro.
  const prob = (t) => evaluateGoal(engineInput({ ...goal, targetAmount: t }, { ...opts, simulations: 1000 })).successProbability;
  if (prob(hi) >= threshold) return hi;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (prob(mid) >= threshold) lo = mid; else hi = mid;
  }
  return Math.floor(lo / 100) * 100;
}

/**
 * Il versamento mensile è troppo basso, adeguato o più del necessario?
 * Riferimento: versamento minimo per arrivare alla soglia "in linea" (75%) con l'ipotesi scelta.
 * @returns {{verdict:'short'|'ok'|'over'|'unreachable', current:number, needed:number|null, difference:number|null,
 *            achievableAmount:number, achievableIncome:number|null}}
 */
export function contributionAnalysis(goal, { allocation = allocationFor(goal), currentValue, costBasis, now = new Date(), simulations = 700 } = {}) {
  const opts = { allocation, currentValue, costBasis, now, simulations };
  const needed = monthlyNeededForSuccess(engineInput(goal, opts), ON_TRACK);
  const current = goal.monthlyContribution;

  let verdict;
  if (needed === null) verdict = 'unreachable';
  else if (current < needed) verdict = 'short';
  else if (needed === 0) verdict = current > 0 ? 'over' : 'ok';
  else verdict = current <= needed * (1 + CONTRIBUTION_TOLERANCE) ? 'ok' : 'over';

  const achievableAmount = maxTargetForSuccess(goal, opts, ON_TRACK);
  let achievableIncome = null;
  if (goal.type === 'income') {
    const { swr } = incomeTarget(goal);
    achievableIncome = (achievableAmount * swr / 100) / 12 + Number(goal.otherIncomeMonthly || 0);
  }
  return {
    verdict, current, needed,
    difference: needed === null ? null : needed - current,
    achievableAmount, achievableIncome,
  };
}
