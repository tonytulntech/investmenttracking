/**
 * Modello degli obiettivi (GUIDED_MODE_SPEC.md §2, §11, §12): tipi, validazione,
 * capitale necessario, valutazione con glide path. Funzioni pure.
 * Importi sempre in € di OGGI; la data è 'YYYY-MM'.
 */
import { evaluateGoal, glideSchedule, monthlyNeededForSuccess, yearsUntilGoal } from '../services/goalService';
import { MARKET_ASSUMPTIONS as MA, resolveTaxRate, safeWithdrawalRateFor } from '../config/marketAssumptions';

export const GOAL_TYPES = {
  emergency: { label: 'Fondo emergenza', family: 'security', priority: 1, hint: 'Se non hai un fondo emergenza, parti da quello.' },
  house: { label: 'Casa', family: 'dated', priority: 2, hint: 'Acquisto o ristrutturazione a una data precisa.' },
  income: { label: 'Vivere di rendita (anche parziale)', family: 'income', priority: 3, hint: 'Accumulare ora per prelevare un importo mensile in futuro.' },
  education: { label: 'Studi dei figli', family: 'dated', priority: 2, hint: 'Una cifra che ti serve quando i figli iniziano gli studi.' },
  custom: { label: 'Altro obiettivo', family: 'dated', priority: 2, hint: 'Qualsiasi spesa importante a una data precisa.' },
};

export const MONTHS_COVERED = [6, 9, 12];

export const LOSS_OPTIONS = [
  { value: 10, label: 'Vendo tutto per non perdere altro' },
  { value: 20, label: 'Vendo una parte' },
  { value: 30, label: 'Aspetto senza fare nulla' },
  { value: 40, label: 'Ne approfitto per comprare' },
];

export const BUCKET_INFO = {
  equity: { label: 'Azionario', text: 'Fa crescere il capitale nel lungo periodo, ma oscilla molto.' },
  bondShort: { label: 'Obbligazioni a breve (1-3 anni)', text: 'Oscillano poco e si trasformano in contanti in fretta.' },
  bondMedium: { label: 'Obbligazioni a medio termine (7-10 anni)', text: 'Rendono un po\' di più della liquidità, con oscillazioni moderate.' },
  cash: { label: 'Liquidità', text: 'Disponibile subito, quasi nessuna oscillazione.' },
  gold: { label: 'Oro', text: 'Diversifica, ma non produce reddito.' },
};

export const STATUS_INFO = {
  on_track: { label: 'In linea', color: 'var(--pos)' },
  watch: { label: 'Da tenere d\'occhio', color: 'var(--warn)' },
  review: { label: 'Fuori strada', color: 'var(--neg)' },
  reached: { label: 'Importo già disponibile', color: 'var(--pos)' },
  expired: { label: 'Scadenza passata', color: 'var(--neg)' },
};

const YM = /^\d{4}-(0[1-9]|1[0-2])$/;
export const currentMonth = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const isFutureMonth = (ym, now) => YM.test(ym) && ym > currentMonth(now);
const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));

/** € di oggi → € nominali alla data (capitalizzazione annua, come nella specifica: 100k a 6 anni al 2,2% ≈ 113.900). */
export const nominalAtDate = (real, years, inflationPct = MA.inflation) => real * Math.pow(1 + inflationPct / 100, years);

export function riskProfileFromAnswers({ lossReaction, incomeStability, experience }) {
  const loss = Number(lossReaction);
  if (!LOSS_OPTIONS.some(o => o.value === loss)) throw new Error('Risposta non valida: reazione alla perdita');
  if (!['stable', 'variable'].includes(incomeStability)) throw new Error('Risposta non valida: stabilità del reddito');
  if (!['none', 'some', 'experienced'].includes(experience)) throw new Error('Risposta non valida: esperienza');
  return { maxTolerableLoss: loss, incomeStability, experience };
}

/** Età alla data di inizio prelievi e anni di durata della rendita. */
export function incomeHorizon({ birthYear, withdrawalStartDate, horizonEndAge }) {
  const startYear = Number(withdrawalStartDate.slice(0, 4));
  const ageAtStart = startYear - Number(birthYear);
  return { ageAtStart, horizonYears: Number(horizonEndAge) - ageAtStart };
}

/**
 * Capitale necessario per la rendita, in € di oggi:
 * (prelievo − altri redditi) × 12 ÷ tasso di prelievo sostenibile della durata.
 */
export function incomeTarget(goal) {
  const { horizonYears } = incomeHorizon(goal);
  const swr = safeWithdrawalRateFor(horizonYears);
  const annualNet = (Number(goal.monthlyWithdrawal) - Number(goal.otherIncomeMonthly || 0)) * 12;
  return { targetAmount: annualNet / (swr / 100), swr, horizonYears, annualNet };
}

/**
 * Validazione dei campi di un obiettivo in costruzione.
 * @returns {{valid:boolean, errors:Object<string,string>}}
 */
export function validateGoalInput(input, { now = new Date(), monthlyExpenses } = {}) {
  const e = {};
  const type = GOAL_TYPES[input.type];
  if (!type) return { valid: false, errors: { type: 'Tipo di obiettivo non valido' } };

  const name = String(input.name ?? '').trim();
  if (!name) e.name = 'Dai un nome all\'obiettivo.';
  else if (name.length > 60) e.name = 'Massimo 60 caratteri.';

  const capital = num(input.initialCapital), pac = num(input.monthlyContribution);
  if (!(capital >= 0)) e.initialCapital = 'Inserisci il capitale che hai già (anche 0).';
  if (!(pac >= 0)) e.monthlyContribution = 'Inserisci quanto versi al mese (anche 0).';

  const tr = input.taxResidence ?? { country: 'IT' };
  if (!['IT', 'OTHER'].includes(tr.country)) e.taxResidence = 'Scegli il paese di residenza.';
  else if (tr.country === 'OTHER' && !(num(tr.customRate) >= 0 && num(tr.customRate) <= 60)) e.taxResidence = 'Inserisci un\'aliquota tra 0 e 60%.';

  if (input.type === 'emergency') {
    if (!MONTHS_COVERED.includes(Number(input.monthsCovered))) e.monthsCovered = 'Scegli quanti mesi di spese coprire.';
    if (!(num(monthlyExpenses) > 0)) e.monthlyExpenses = 'Servono le tue spese mensili.';
    if (!isFutureMonth(input.targetDate, now)) e.targetDate = 'Scegli una data futura.';
  } else if (input.type === 'income') {
    const by = num(input.birthYear);
    if (!(by >= 1930 && by <= now.getFullYear() - 18)) e.birthYear = 'Anno di nascita non valido.';
    if (!isFutureMonth(input.withdrawalStartDate, now)) e.withdrawalStartDate = 'Scegli una data futura.';
    const w = num(input.monthlyWithdrawal);
    if (!(w > 0)) e.monthlyWithdrawal = 'Inserisci quanto vorresti al mese.';
    const other = num(input.otherIncomeMonthly || 0);
    if (!(other >= 0)) e.otherIncomeMonthly = 'Inserisci 0 se non hai altri redditi.';
    else if (w > 0 && other >= w) e.otherIncomeMonthly = 'Con questi redditi non ti serve capitale: riduci gli altri redditi o aumenta il prelievo.';
    const end = num(input.horizonEndAge ?? 95);
    if (!(end >= 70 && end <= 110)) e.horizonEndAge = 'Scegli un\'età tra 70 e 110.';
    if (!e.birthYear && !e.withdrawalStartDate && !e.horizonEndAge) {
      const { horizonYears } = incomeHorizon({ birthYear: by, withdrawalStartDate: input.withdrawalStartDate, horizonEndAge: end });
      if (horizonYears < 5) e.horizonEndAge = 'La rendita dovrebbe durare almeno 5 anni.';
    }
  } else {
    if (!(num(input.targetAmount) > 0)) e.targetAmount = 'Inserisci l\'importo che ti serve.';
    if (!isFutureMonth(input.targetDate, now)) e.targetDate = 'Scegli una data futura.';
  }
  return { valid: Object.keys(e).length === 0, errors: e };
}

const makeId = () => `goal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/** Costruisce l'obiettivo da salvare (dati già validati). */
export function createGoal(input, { riskProfile, monthlyExpenses, now = new Date() }) {
  const type = input.type;
  const base = {
    id: input.id ?? makeId(),
    name: String(input.name).trim(),
    type,
    family: GOAL_TYPES[type].family,
    priority: GOAL_TYPES[type].priority,
    initialCapital: Number(input.initialCapital),
    monthlyContribution: Number(input.monthlyContribution),
    taxResidence: input.taxResidence.country === 'OTHER'
      ? { country: 'OTHER', customRate: Number(input.taxResidence.customRate) }
      : { country: 'IT' },
    riskProfile: { ...riskProfile },
    equityShift: Number(input.equityShift ?? 0),
    status: 'active',
    amountsInRealTerms: true,
    createdAt: input.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
  if (type === 'emergency') {
    return { ...base, monthlyExpenses: Number(monthlyExpenses), monthsCovered: Number(input.monthsCovered),
      targetAmount: Number(monthlyExpenses) * Number(input.monthsCovered), targetDate: input.targetDate };
  }
  if (type === 'income') {
    const income = {
      birthYear: Number(input.birthYear), withdrawalStartDate: input.withdrawalStartDate,
      horizonEndAge: Number(input.horizonEndAge ?? 95), monthlyWithdrawal: Number(input.monthlyWithdrawal),
      otherIncomeMonthly: Number(input.otherIncomeMonthly || 0),
    };
    return { ...base, ...income, targetAmount: incomeTarget(income).targetAmount, targetDate: income.withdrawalStartDate };
  }
  return { ...base, targetAmount: Number(input.targetAmount), targetDate: input.targetDate };
}

/**
 * Valuta un obiettivo seguendo il glide path (con lo spostamento scelto dallo studente).
 * Per la rendita l'orizzonte del glide path è la durata fino a `horizonEndAge`, non la data di inizio (§12.3).
 * Semplificazione v1: la fase "transizione" (riserva negli ultimi 24 mesi) non è ancora simulata.
 */
export function evaluatePlan(goal, { now = new Date(), simulations = 1500, equityShift = goal.equityShift ?? 0 } = {}) {
  const extraYears = goal.type === 'income' ? Math.max(0, incomeHorizon(goal).horizonYears) : 0;
  const allocationAt = glideSchedule({
    type: goal.type === 'emergency' ? 'emergency' : undefined,
    riskProfile: goal.riskProfile, extraYears, equityShift,
  });
  const input = {
    currentValue: goal.initialCapital,
    targetAmount: goal.targetAmount,
    goalDate: goal.targetDate,
    monthlyContribution: goal.monthlyContribution,
    allocationAt,
    taxRate: resolveTaxRate(goal.taxResidence),
    now,
    simulations,
  };
  const evaluation = evaluateGoal(input);
  const years = yearsUntilGoal(goal.targetDate, now);
  return {
    evaluation,
    input,
    years,
    allocationNow: allocationAt(Math.max(1, Math.round(years * 12))),
    nominalTarget: nominalAtDate(goal.targetAmount, Math.max(0, years)),
  };
}

/** Versamento mensile necessario per arrivare alla soglia "in linea" (può richiedere qualche secondo). */
export function monthlyNeeded(plan) {
  return monthlyNeededForSuccess(plan.input, MA.thresholds.onTrack);
}
