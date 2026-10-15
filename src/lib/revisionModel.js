/**
 * Flusso di revisione e raffreddamento (GUIDED_MODE_SPEC.md §7, §8, §16.2). Funzioni pure: lavorano su
 * array di obiettivi/regole/revisioni e ne restituiscono di nuovi (la persistenza è di goalStore).
 *
 * Principio anti-panico: cambiare strategia mentre il mercato è in calo non è vietato, ma costa 7 giorni
 * di attesa e una riconferma. Le versioni precedenti delle regole non si cancellano mai (`superseded`).
 */
import { GOAL_TYPES, incomeTarget, validateGoalInput } from './goalModel';
import { buildRulesVersion, validateRulesInput, monthName, describeAllocation, normalizeAllocation, ALLOCATION_BUCKETS } from './rulesModel';

export const COOLING_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

export const LIFE_EVENTS = [
  { value: 'none', label: 'Nulla: ho cambiato idea' },
  { value: 'job', label: 'Lavoro o reddito' },
  { value: 'house', label: 'Casa' },
  { value: 'family', label: 'Famiglia' },
  { value: 'inheritance', label: 'Eredità o entrata straordinaria' },
  { value: 'health', label: 'Salute' },
  { value: 'other', label: 'Altro' },
];

export const MIRROR_ANSWERS = [
  { value: 'yes', label: 'Sì, la farei comunque' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Non so' },
];

// Campi dell'obiettivo che attivano il flusso (§7, §16.2) e le loro etichette.
const GOAL_FIELDS = {
  emergency: { targetDate: 'Data', monthsCovered: 'Mesi di spese coperti' },
  house: { targetAmount: 'Importo', targetDate: 'Data' },
  education: { targetAmount: 'Importo', targetDate: 'Data' },
  custom: { targetAmount: 'Importo', targetDate: 'Data' },
  income: { monthlyWithdrawal: 'Prelievo mensile', withdrawalStartDate: 'Inizio dei prelievi', otherIncomeMonthly: 'Altri redditi' },
};
export const editableGoalFields = (type) => Object.keys(GOAL_FIELDS[type] ?? {});

const eur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(Number(n)));
const monthIt = (ym) => `${monthName(Number(ym.slice(5, 7)))} ${ym.slice(0, 4)}`;
const showGoalValue = (field, v) => (field.toLowerCase().includes('date') ? monthIt(v) : field === 'monthsCovered' ? `${v} mesi` : eur(v));

const CRASH_LABEL = { hold: 'aspetto', hold_and_buy: 'aspetto e continuo a versare', rebalance: 'riporto alle percentuali previste' };
const REBALANCE_LABEL = { threshold: 'a soglia', calendar: 'una volta all\'anno', both: 'a soglia e una volta all\'anno' };
const REVIEW_LABEL = { semiannual: 'ogni 6 mesi', annual: 'ogni anno' };

/**
 * Cosa cambia rispetto a oggi.
 * @returns {{structural:boolean, lines:string[], goalFields:string[], ruleFields:string[]}}
 */
export function diffChanges({ goal, rules, changes }) {
  const lines = [];
  const goalFields = [];
  const ruleFields = [];
  const allowed = GOAL_FIELDS[goal.type] ?? {};
  for (const [field, value] of Object.entries(changes.goal ?? {})) {
    if (!(field in allowed)) continue;
    if (String(value) !== String(goal[field])) {
      goalFields.push(field);
      lines.push(`${allowed[field]}: ${showGoalValue(field, goal[field])} → ${showGoalValue(field, value)}`);
    }
  }
  const next = changes.rules;
  if (next) {
    if (next.crashPlan.choice !== rules.crashPlan.choice) {
      ruleFields.push('crashPlan');
      lines.push(`Se il portafoglio crolla: ${CRASH_LABEL[rules.crashPlan.choice]} → ${CRASH_LABEL[next.crashPlan.choice]}`);
    }
    const oldAl = normalizeAllocation(rules.allocation), newAl = normalizeAllocation(next.allocation);
    if (ALLOCATION_BUCKETS.some(b => oldAl[b.key] !== newAl[b.key])) {
      ruleFields.push('allocation');
      lines.push(`Composizione: ${describeAllocation(oldAl) || 'non dichiarata'} → ${describeAllocation(newAl)}`);
    }
    if (next.crashPlan.personalNote.trim() !== rules.crashPlan.personalNote) {
      ruleFields.push('personalNote');
      lines.push('Frase personale modificata');
    }
    const r = rules.rebalance, n = next.rebalance;
    const thresholdChanged = n.method !== 'calendar' && Number(n.thresholdPct) !== Number(r.thresholdPct);
    const monthChanged = n.method !== 'threshold' && Number(n.calendarMonth) !== Number(r.calendarMonth);
    if (n.method !== r.method || thresholdChanged || monthChanged) {
      ruleFields.push('rebalance');
      lines.push(`Controllo delle percentuali: ${REBALANCE_LABEL[r.method]} → ${REBALANCE_LABEL[n.method]}`);
    }
    if (next.reviewFrequency !== rules.reviewFrequency) {
      ruleFields.push('reviewFrequency');
      lines.push(`Revisione delle regole: ${REVIEW_LABEL[rules.reviewFrequency]} → ${REVIEW_LABEL[next.reviewFrequency]}`);
    }
  }
  // Strutturale = obiettivo (data, importo, prelievo), composizione o piano in caso di crollo (§7). Nota, ribilanciamento e frequenza no.
  const structural = goalFields.length > 0 || ruleFields.includes('crashPlan') || ruleFields.includes('allocation');
  return { structural, lines, goalFields, ruleFields };
}

/**
 * Cosa fare con una modifica (§7, passo 5).
 * - non strutturale, o review pianificata → subito
 * - stress assente → subito
 * - stress (o non verificabile) → raffreddamento, salvo evento di vita reale + risposta "Sì" allo specchio
 */
export function decideRevision({ structural, planned = false, stress, lifeEvent, mirror }) {
  if (!structural) return { cooling: false, reason: 'non_structural', appliedDuringStress: false };
  if (planned) return { cooling: false, reason: 'planned_review', appliedDuringStress: false };
  const stressed = !stress?.known || stress.flag;
  if (!stressed) return { cooling: false, reason: 'no_stress', appliedDuringStress: false };
  if (lifeEvent && lifeEvent !== 'none' && mirror === 'yes') return { cooling: false, reason: 'life_event', appliedDuringStress: true };
  return { cooling: true, reason: stress?.known ? 'stress' : 'stress_unknown', appliedDuringStress: false };
}

export const coolingStatus = (revision, now = new Date()) => {
  const until = new Date(revision.coolingUntil).getTime();
  const left = until - now.getTime();
  return { ready: left <= 0, daysLeft: Math.max(0, Math.ceil(left / DAY)), until: revision.coolingUntil };
};

const goalInputFrom = (goal, changes) => ({ ...goal, ...(changes.goal ?? {}) });

function validateGoalChanges(goal, changes, now) {
  const merged = goalInputFrom(goal, changes);
  const { valid, errors } = validateGoalInput(merged, { now, monthlyExpenses: goal.monthlyExpenses });
  return { valid, errors };
}

/** Valida una richiesta di revisione prima di inviarla. */
export function validateRevisionRequest({ goal, rules, changes, lifeEvent, lifeNote, mirror }, { now = new Date(), planned = false } = {}) {
  const e = {};
  const diff = diffChanges({ goal, rules, changes });
  if (diff.lines.length === 0) e.changes = 'Non hai cambiato nulla.';
  if (changes.rules) {
    const r = validateRulesInput(changes.rules);
    Object.assign(e, r.errors);
  } else e.signedName = 'Servono le regole firmate.';
  if (diff.goalFields.length) Object.assign(e, validateGoalChanges(goal, changes, now).errors);
  if (diff.structural && !planned) {
    if (!LIFE_EVENTS.some(x => x.value === lifeEvent)) e.lifeEvent = 'Scegli cosa è cambiato nella tua vita.';
    else if (lifeEvent !== 'none' && String(lifeNote ?? '').trim().length < 10) e.lifeNote = 'Racconta in poche parole cosa è cambiato (almeno 10 caratteri).';
    if (!MIRROR_ANSWERS.some(x => x.value === mirror)) e.mirror = 'Rispondi alla domanda.';
  }
  return { valid: Object.keys(e).length === 0, errors: e, diff };
}

const makeId = () => `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
export const activeRules = (rules, goalId) => rules.filter(r => r.goalId === goalId && r.status === 'active').sort((a, b) => b.version - a.version)[0];
export const pendingRevision = (revisions, goalId) => revisions.find(r => r.goalId === goalId && r.status === 'pending');

/** Obiettivo con le modifiche applicate (solo i campi modificabili del tipo); la rendita ricalcola il capitale necessario. */
export function applyGoalChanges(goal, goalChanges = {}, now = new Date()) {
  let next = { ...goal, updatedAt: now.toISOString() };
  for (const f of editableGoalFields(goal.type)) {
    if (f in goalChanges) next[f] = f === 'targetDate' || f === 'withdrawalStartDate' ? goalChanges[f] : Number(goalChanges[f]);
  }
  if (goal.type === 'income') next = { ...next, targetAmount: incomeTarget(next).targetAmount, targetDate: next.withdrawalStartDate };
  if (goal.type === 'emergency') next = { ...next, targetAmount: Number(next.monthlyExpenses) * Number(next.monthsCovered) };
  return next;
}

/** Applica la modifica: aggiorna l'obiettivo e crea la nuova versione firmata; la precedente diventa `superseded`. */
function applyNow({ goals, rules, revisions, revision, now }) {
  const goal = goals.find(g => g.id === revision.goalId);
  const current = activeRules(rules, revision.goalId);
  if (!goal || !current) throw new Error('Obiettivo o regole non trovati.');
  if (current.version !== revision.baseRulesVersion) throw new Error('Le regole sono cambiate nel frattempo: ripeti la modifica.');

  if (Object.keys(revision.changes.goal ?? {}).length) {
    const v = validateGoalInput(goalInputFrom(goal, revision.changes), { now, monthlyExpenses: goal.monthlyExpenses });
    if (!v.valid) throw new Error('I nuovi dati dell\'obiettivo non sono più validi: ripeti la modifica.');
  }

  const nextGoal = applyGoalChanges(goal, revision.changes.goal, now);

  const nextRules = buildRulesVersion({
    goalId: goal.id,
    input: revision.changes.rules,
    version: current.version + 1,
    now,
    changeReason: revision.lifeEvent === 'none' || !revision.lifeNote ? (revision.reasonLabel ?? null) : revision.lifeNote,
    changes: revision.summary,
    appliedDuringStress: revision.appliedDuringStress,
    marketContext: { portfolioDrawdownPct: revision.stress?.portfolioDrawdownPct ?? 0, benchmarkDrawdown60dPct: revision.stress?.benchmarkDrawdownPct ?? 0 },
  });

  return {
    goals: goals.map(g => (g.id === goal.id ? nextGoal : g)),
    rules: [...rules.map(r => (r.id === current.id ? { ...r, status: 'superseded', supersededAt: now.toISOString() } : r)), nextRules],
    revisions: revisions.map(r => (r.id === revision.id ? { ...r, status: 'applied', appliedAt: now.toISOString(), resultRulesId: nextRules.id } : r)),
  };
}

/**
 * Invia una revisione: la applica subito oppure la mette in raffreddamento (§7).
 * @returns {{goals, rules, revisions, outcome:'applied'|'cooling', decision, revision}}
 */
export function submitRevision({ goals, rules, revisions, request, stress, planned = false, now = new Date() }) {
  const goal = goals.find(g => g.id === request.goalId);
  const current = goal && activeRules(rules, goal.id);
  if (!goal || !current) throw new Error('Obiettivo o regole non trovati.');
  if (pendingRevision(revisions, goal.id)) throw new Error('C\'è già una modifica in attesa per questo obiettivo: confermala o annullala.');

  const { valid, errors, diff } = validateRevisionRequest({ ...request, goal, rules: current }, { now, planned });
  if (!valid) throw new Error(`Richiesta non valida: ${Object.keys(errors).join(', ')}`);

  const decision = decideRevision({ structural: diff.structural, planned, stress, lifeEvent: request.lifeEvent, mirror: request.mirror });
  const reasonLabel = planned ? 'Review pianificata' : diff.structural ? null : 'Modifica non strutturale';
  const revision = {
    id: makeId(),
    goalId: goal.id,
    status: 'pending',
    createdAt: now.toISOString(),
    coolingUntil: decision.cooling ? new Date(now.getTime() + COOLING_DAYS * DAY).toISOString() : null,
    baseRulesVersion: current.version,
    changes: { goal: Object.fromEntries(diff.goalFields.map(f => [f, request.changes.goal[f]])), rules: request.changes.rules },
    summary: diff.lines,
    structural: diff.structural,
    planned,
    lifeEvent: request.lifeEvent ?? null,
    lifeNote: String(request.lifeNote ?? '').trim(),
    mirrorAnswer: request.mirror ?? null,
    stress: stress ? { ...stress } : { known: false, flag: false },
    reason: decision.reason,
    appliedDuringStress: decision.appliedDuringStress,
    reasonLabel,
  };

  if (decision.cooling) {
    return { goals, rules, revisions: [...revisions, revision], outcome: 'cooling', decision, revision };
  }
  const applied = applyNow({ goals, rules, revisions: [...revisions, revision], revision, now });
  return { ...applied, outcome: 'applied', decision, revision: applied.revisions.find(r => r.id === revision.id) };
}

/** Riconferma dopo i 7 giorni: serve di nuovo la firma. */
export function confirmRevision({ goals, rules, revisions, revisionId, signedName, accepted, now = new Date() }) {
  const revision = revisions.find(r => r.id === revisionId);
  if (!revision || revision.status !== 'pending') throw new Error('Modifica non trovata o già chiusa.');
  if (!coolingStatus(revision, now).ready) throw new Error('Il periodo di attesa non è ancora finito.');
  const input = { ...revision.changes.rules, signedName, accepted };
  const check = validateRulesInput(input);
  if (!check.valid) throw new Error('Per riconfermare scrivi il tuo nome e conferma l\'impegno.');
  return applyNow({ goals, rules, revisions, revision: { ...revision, changes: { ...revision.changes, rules: input } }, now });
}

/** Annulla in qualsiasi momento: non cambia nulla. */
export function cancelRevision({ revisions, revisionId, now = new Date() }) {
  const revision = revisions.find(r => r.id === revisionId);
  if (!revision || revision.status !== 'pending') throw new Error('Modifica non trovata o già chiusa.');
  return revisions.map(r => (r.id === revisionId ? { ...r, status: 'cancelled', cancelledAt: now.toISOString() } : r));
}

// ── Review periodica (§8) ──────────────────────────────────────────────────

const MONTHS_BETWEEN = { semiannual: 6, annual: 12 };

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

/** Prossima review di un obiettivo: dall'ultima review (o dalla firma delle regole attive) + frequenza scelta. */
export function nextReviewAt({ rules, lastReviewAt }) {
  const from = [rules.signedAt, lastReviewAt].filter(Boolean).map(d => new Date(d).getTime()).reduce((a, b) => Math.max(a, b));
  return addMonths(new Date(from), MONTHS_BETWEEN[rules.reviewFrequency] ?? 12);
}

/** Obiettivi la cui review è scaduta. */
export function reviewsDue({ goals, rules, lastReviewAt, now = new Date() }) {
  return goals
    .filter(g => g.status === 'active')
    .map(g => ({ goal: g, rules: activeRules(rules, g.id) }))
    .filter(x => x.rules)
    .map(x => ({ ...x, dueAt: nextReviewAt({ rules: x.rules, lastReviewAt }) }))
    .filter(x => x.dueAt.getTime() <= now.getTime());
}

export const goalTypeLabel = (type) => GOAL_TYPES[type]?.label ?? type;
