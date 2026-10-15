/**
 * Regole firmate dello studente (GUIDED_MODE_SPEC.md §2.3, §4 step 5).
 * Le regole sono SUE: le sceglie e le firma lui. Versionate: una nuova versione non cancella la precedente.
 */
export const REBALANCE_METHODS = [
  { value: 'threshold', label: 'Quando un bucket si scosta dalla soglia' },
  { value: 'calendar', label: 'Una volta all\'anno' },
  { value: 'both', label: 'Entrambi' },
];

export const CRASH_CHOICES = [
  { value: 'hold', label: 'Non faccio nulla e aspetto' },
  { value: 'hold_and_buy', label: 'Aspetto e continuo a versare come previsto' },
  { value: 'rebalance', label: 'Riporto il portafoglio alle percentuali previste' },
];

export const REVIEW_FREQUENCIES = [
  { value: 'semiannual', label: 'Ogni 6 mesi' },
  { value: 'annual', label: 'Ogni anno' },
];

export const MIN_NOTE_LENGTH = 20;

const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export const monthName = (m) => MONTHS[m - 1];

export const defaultRulesInput = () => ({
  rebalance: { method: 'threshold', thresholdPct: 5, calendarMonth: 1 },
  crashPlan: { choice: 'hold_and_buy', personalNote: '' },
  reviewFrequency: 'semiannual',
  signedName: '',
  accepted: false,
});

/** @returns {{valid:boolean, errors:Object<string,string>}} */
export function validateRulesInput(input) {
  const e = {};
  const r = input.rebalance ?? {};
  if (!REBALANCE_METHODS.some(m => m.value === r.method)) e.method = 'Scegli quando ribilanciare.';
  const th = Number(r.thresholdPct);
  if (r.method !== 'calendar' && !(th >= 1 && th <= 20)) e.thresholdPct = 'La soglia va da 1 a 20 punti percentuali.';
  const cm = Number(r.calendarMonth);
  if (r.method !== 'threshold' && !(Number.isInteger(cm) && cm >= 1 && cm <= 12)) e.calendarMonth = 'Scegli un mese.';

  const c = input.crashPlan ?? {};
  if (!CRASH_CHOICES.some(x => x.value === c.choice)) e.crashChoice = 'Scegli cosa farai in caso di crollo.';
  if (String(c.personalNote ?? '').trim().length < MIN_NOTE_LENGTH) e.personalNote = `Scrivi con parole tue cosa farai (almeno ${MIN_NOTE_LENGTH} caratteri).`;

  if (!REVIEW_FREQUENCIES.some(x => x.value === input.reviewFrequency)) e.reviewFrequency = 'Scegli ogni quanto rivedere le regole.';
  if (String(input.signedName ?? '').trim().length < 3) e.signedName = 'Scrivi il tuo nome e cognome per firmare.';
  if (input.accepted !== true) e.accepted = 'Conferma l\'impegno per firmare.';
  return { valid: Object.keys(e).length === 0, errors: e };
}

/** Versione 1 delle regole (stato `active`). Lancia se l'input non è valido. */
export function createRulesV1({ goalId, input, now = new Date() }) {
  const { valid, errors } = validateRulesInput(input);
  if (!valid) throw new Error(`Regole non valide: ${Object.keys(errors).join(', ')}`);
  return {
    id: `rules_${goalId}_v1`,
    goalId,
    version: 1,
    rebalance: {
      method: input.rebalance.method,
      thresholdPct: input.rebalance.method === 'calendar' ? null : Number(input.rebalance.thresholdPct),
      calendarMonth: input.rebalance.method === 'threshold' ? null : Number(input.rebalance.calendarMonth),
    },
    crashPlan: { choice: input.crashPlan.choice, personalNote: input.crashPlan.personalNote.trim() },
    reviewFrequency: input.reviewFrequency,
    signedAt: now.toISOString(),
    signedName: input.signedName.trim(),
    changeReason: null,
    marketContext: { portfolioDrawdownPct: 0, benchmarkDrawdown60dPct: 0 },
    status: 'active',
  };
}

/** Testo leggibile delle regole, come un documento. */
export function describeRules(rules) {
  const r = rules.rebalance;
  const parts = [];
  if (r.method !== 'calendar') parts.push(`ribilancio quando un bucket si scosta di oltre ${r.thresholdPct} punti dal suo obiettivo`);
  if (r.method !== 'threshold') parts.push(`ribilancio una volta all'anno, a ${monthName(r.calendarMonth)}`);
  const crash = CRASH_CHOICES.find(c => c.value === rules.crashPlan.choice)?.label.toLowerCase();
  const review = REVIEW_FREQUENCIES.find(f => f.value === rules.reviewFrequency)?.label.toLowerCase();
  return [
    parts.join(' ed ').replace(/^./, c => c.toUpperCase()) + '.',
    `Se il portafoglio scende molto: ${crash}.`,
    `Rivedo queste regole ${review}.`,
  ];
}
