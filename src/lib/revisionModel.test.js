import { describe, it, expect } from 'vitest';
import {
  COOLING_DAYS, diffChanges, decideRevision, submitRevision, confirmRevision, cancelRevision, coolingStatus,
  validateRevisionRequest, reviewsDue, nextReviewAt, activeRules, pendingRevision,
} from './revisionModel';
import { createGoal } from './goalModel';
import { createRulesV1, defaultRulesInput, rulesToInput } from './rulesModel';

const NOW = new Date('2026-10-15T10:00:00Z');
const DAY = 86400000;
const later = (d) => new Date(NOW.getTime() + d * DAY);
const RISK = { maxTolerableLoss: 30, incomeStability: 'stable', experience: 'some' };

const baseGoal = () => createGoal({
  id: 'g1', type: 'house', name: 'Casa', initialCapital: 10000, monthlyContribution: 600,
  taxResidence: { country: 'IT' }, targetAmount: 60000, targetDate: '2034-10',
}, { riskProfile: RISK, monthlyExpenses: 2000, now: NOW });
const incomeGoal = () => createGoal({
  id: 'g2', type: 'income', name: 'Rendita', initialCapital: 20000, monthlyContribution: 800,
  taxResidence: { country: 'IT' }, birthYear: 1985, withdrawalStartDate: '2050-01', monthlyWithdrawal: 3000, otherIncomeMonthly: 500, horizonEndAge: 95,
}, { riskProfile: RISK, monthlyExpenses: 2000, now: NOW });
const signed = () => ({ ...defaultRulesInput(), crashPlan: { choice: 'hold_and_buy', personalNote: 'Non vendo e continuo a versare come previsto.' }, signedName: 'Mario Rossi', accepted: true });
const baseRules = (goalId = 'g1') => createRulesV1({ goalId, input: signed(), now: NOW });

const state = () => ({ goals: [baseGoal()], rules: [baseRules()], revisions: [] });
const calm = { known: true, flag: false, benchmarkDrawdownPct: 2, portfolioDrawdownPct: null };
const crash = { known: true, flag: true, benchmarkDrawdownPct: 22, portfolioDrawdownPct: null };
const unknown = { known: false, flag: false };

const req = (over = {}) => ({
  goalId: 'g1',
  changes: { goal: { targetDate: '2035-10' }, rules: signed() },
  lifeEvent: 'none', lifeNote: '', mirror: 'unsure',
  ...over,
});

describe('diffChanges', () => {
  const goal = baseGoal(), rules = baseRules();
  it('data o importo = strutturale', () => {
    const d = diffChanges({ goal, rules, changes: { goal: { targetDate: '2035-10' }, rules: signed() } });
    expect(d.structural).toBe(true);
    expect(d.goalFields).toEqual(['targetDate']);
    expect(d.lines[0]).toBe('Data: ottobre 2034 → ottobre 2035');
  });
  it('piano in caso di crollo = strutturale', () => {
    const next = signed(); next.crashPlan.choice = 'hold';
    expect(diffChanges({ goal, rules, changes: { rules: next } }).structural).toBe(true);
  });
  it('frase personale, ribilanciamento e frequenza = NON strutturali', () => {
    const next = signed();
    next.crashPlan.personalNote = 'Una frase diversa ma sempre lunga abbastanza.';
    next.rebalance.thresholdPct = 7;
    next.reviewFrequency = 'annual';
    const d = diffChanges({ goal, rules, changes: { rules: next } });
    expect(d.structural).toBe(false);
    expect(d.ruleFields.sort()).toEqual(['personalNote', 'rebalance', 'reviewFrequency']);
  });
  it('valori identici → nessuna modifica', () => {
    expect(diffChanges({ goal, rules, changes: { goal: { targetDate: '2034-10', targetAmount: 60000 }, rules: signed() } }).lines).toEqual([]);
  });
  it('campi non modificabili per quel tipo vengono ignorati', () => {
    expect(diffChanges({ goal, rules, changes: { goal: { monthlyWithdrawal: 9999, initialCapital: 1 } } }).lines).toEqual([]);
  });
  it('soglia irrilevante se il metodo è solo calendario', () => {
    const calRules = createRulesV1({ goalId: 'g1', input: { ...signed(), rebalance: { method: 'calendar', thresholdPct: 5, calendarMonth: 3 } }, now: NOW });
    const next = { ...signed(), rebalance: { method: 'calendar', thresholdPct: 12, calendarMonth: 3 } };
    expect(diffChanges({ goal, rules: calRules, changes: { rules: next } }).ruleFields).toEqual([]);
  });
});

describe('decideRevision (tabella §7)', () => {
  const d = (o) => decideRevision({ structural: true, planned: false, stress: calm, lifeEvent: 'none', mirror: 'unsure', ...o });
  it('non strutturale → subito, anche in crollo', () => expect(d({ structural: false, stress: crash }).cooling).toBe(false));
  it('review pianificata → subito, anche in crollo', () => expect(d({ planned: true, stress: crash }).cooling).toBe(false));
  it('nessuno stress → subito', () => expect(d({}).cooling).toBe(false));
  it('stress, nessun evento di vita → 7 giorni', () => expect(d({ stress: crash })).toMatchObject({ cooling: true, reason: 'stress' }));
  it('stress + evento reale ma specchio "no" o "non so" → 7 giorni', () => {
    expect(d({ stress: crash, lifeEvent: 'job', mirror: 'no' }).cooling).toBe(true);
    expect(d({ stress: crash, lifeEvent: 'job', mirror: 'unsure' }).cooling).toBe(true);
  });
  it('stress + evento reale + specchio "sì" → subito, segnato come avvenuto in stress', () => {
    expect(d({ stress: crash, lifeEvent: 'job', mirror: 'yes' })).toMatchObject({ cooling: false, appliedDuringStress: true });
  });
  it('stress + specchio "sì" ma nessun evento → 7 giorni', () => expect(d({ stress: crash, lifeEvent: 'none', mirror: 'yes' }).cooling).toBe(true));
  it('mercato non verificabile → prudenza: 7 giorni', () => expect(d({ stress: unknown })).toMatchObject({ cooling: true, reason: 'stress_unknown' }));
});

describe('submitRevision', () => {
  it('modifica non strutturale: subito, nuova versione firmata, la v1 diventa superseded', () => {
    const next = signed(); next.reviewFrequency = 'annual';
    const r = submitRevision({ ...state(), request: req({ changes: { rules: next } }), stress: crash, now: NOW });
    expect(r.outcome).toBe('applied');
    expect(r.rules.map(x => [x.version, x.status])).toEqual([[1, 'superseded'], [2, 'active']]);
    expect(activeRules(r.rules, 'g1').reviewFrequency).toBe('annual');
    expect(r.rules[0].reviewFrequency).toBe('semiannual'); // la vecchia versione non è toccata
    expect(activeRules(r.rules, 'g1').changeReason).toBe('Modifica non strutturale');
  });
  it('strutturale senza stress: obiettivo aggiornato subito', () => {
    const r = submitRevision({ ...state(), request: req({ lifeEvent: 'house', lifeNote: 'Compriamo un anno dopo del previsto.' }), stress: calm, now: NOW });
    expect(r.outcome).toBe('applied');
    expect(r.goals[0].targetDate).toBe('2035-10');
    expect(r.goals[0].targetAmount).toBe(60000);
    const v2 = activeRules(r.rules, 'g1');
    expect(v2).toMatchObject({ version: 2, changeReason: 'Compriamo un anno dopo del previsto.', appliedDuringStress: false });
    expect(v2.changes).toEqual(['Data: ottobre 2034 → ottobre 2035']);
  });
  it('strutturale in crollo senza evento: raffreddamento, NIENTE cambia finché non riconfermi', () => {
    const s = state();
    const r = submitRevision({ ...s, request: req(), stress: crash, now: NOW });
    expect(r.outcome).toBe('cooling');
    expect(r.goals).toBe(s.goals);
    expect(r.rules).toBe(s.rules);
    expect(r.revision.status).toBe('pending');
    expect(new Date(r.revision.coolingUntil).getTime() - NOW.getTime()).toBe(COOLING_DAYS * DAY);
    expect(pendingRevision(r.revisions, 'g1')).toBeTruthy();
  });
  it('in crollo con evento reale e specchio "sì": applicata e marcata nello storico', () => {
    const r = submitRevision({ ...state(), request: req({ lifeEvent: 'job', lifeNote: 'Ho perso il lavoro a settembre.', mirror: 'yes' }), stress: crash, now: NOW });
    expect(r.outcome).toBe('applied');
    const v2 = activeRules(r.rules, 'g1');
    expect(v2.appliedDuringStress).toBe(true);
    expect(v2.marketContext.benchmarkDrawdown60dPct).toBe(22);
  });
  it('una sola modifica in attesa per obiettivo', () => {
    const a = submitRevision({ ...state(), request: req(), stress: crash, now: NOW });
    expect(() => submitRevision({ goals: a.goals, rules: a.rules, revisions: a.revisions, request: req(), stress: crash, now: NOW })).toThrow(/già una modifica/);
  });
  it('review pianificata: nessun raffreddamento e nessuna domanda sull\'evento', () => {
    const r = submitRevision({ ...state(), request: req({ lifeEvent: undefined, mirror: undefined }), stress: crash, planned: true, now: NOW });
    expect(r.outcome).toBe('applied');
    expect(activeRules(r.rules, 'g1').changeReason).toBe('Review pianificata');
  });
  it('rendita: il capitale necessario viene ricalcolato', () => {
    const goal = incomeGoal();
    const before = goal.targetAmount;
    const r = submitRevision({
      goals: [goal], rules: [baseRules('g2')], revisions: [],
      request: { goalId: 'g2', changes: { goal: { monthlyWithdrawal: 3500 }, rules: signed() }, lifeEvent: 'family', lifeNote: 'Nasce un figlio, servono più soldi.', mirror: 'yes' },
      stress: calm, now: NOW,
    });
    expect(r.goals[0].monthlyWithdrawal).toBe(3500);
    expect(r.goals[0].targetAmount).toBeGreaterThan(before);
  });
  it('non applica dati non validi (data nel passato, firma mancante, nessuna modifica)', () => {
    const run = (request) => () => submitRevision({ ...state(), request, stress: calm, now: NOW });
    expect(run(req({ changes: { goal: { targetDate: '2020-01' }, rules: signed() }, lifeEvent: 'house', lifeNote: 'Cambio di programma importante.', mirror: 'yes' }))).toThrow(/non valida/);
    expect(run(req({ changes: { goal: { targetDate: '2035-10' }, rules: { ...signed(), accepted: false } }, lifeEvent: 'house', lifeNote: 'Cambio di programma importante.', mirror: 'yes' }))).toThrow(/non valida/);
    expect(run(req({ changes: { goal: {}, rules: signed() } }))).toThrow(/non valida/);
  });
});

describe('validateRevisionRequest', () => {
  const goal = baseGoal(), rules = baseRules();
  it('strutturale: servono evento, motivo e risposta allo specchio', () => {
    const r = validateRevisionRequest({ goal, rules, changes: { goal: { targetDate: '2035-10' }, rules: signed() }, lifeEvent: undefined, mirror: undefined }, { now: NOW });
    expect(Object.keys(r.errors).sort()).toEqual(['lifeEvent', 'mirror']);
    const r2 = validateRevisionRequest({ goal, rules, changes: { goal: { targetDate: '2035-10' }, rules: signed() }, lifeEvent: 'job', lifeNote: 'corto', mirror: 'no' }, { now: NOW });
    expect(Object.keys(r2.errors)).toEqual(['lifeNote']);
  });
  it('non strutturale: niente domande sull\'evento', () => {
    const next = signed(); next.reviewFrequency = 'annual';
    expect(validateRevisionRequest({ goal, rules, changes: { rules: next } }, { now: NOW }).valid).toBe(true);
  });
});

describe('confirmRevision / cancelRevision', () => {
  const cooled = () => submitRevision({ ...state(), request: req(), stress: crash, now: NOW });
  it('prima dei 7 giorni non si può confermare', () => {
    const c = cooled();
    expect(() => confirmRevision({ goals: c.goals, rules: c.rules, revisions: c.revisions, revisionId: c.revision.id, signedName: 'Mario Rossi', accepted: true, now: later(6) })).toThrow(/attesa/);
    expect(coolingStatus(c.revision, later(6))).toMatchObject({ ready: false, daysLeft: 1 });
  });
  it('dopo i 7 giorni, con nuova firma, si applica', () => {
    const c = cooled();
    expect(coolingStatus(c.revision, later(7)).ready).toBe(true);
    const r = confirmRevision({ goals: c.goals, rules: c.rules, revisions: c.revisions, revisionId: c.revision.id, signedName: 'Mario Rossi', accepted: true, now: later(8) });
    expect(r.goals[0].targetDate).toBe('2035-10');
    expect(activeRules(r.rules, 'g1').version).toBe(2);
    expect(r.revisions[0].status).toBe('applied');
  });
  it('senza firma non si applica', () => {
    const c = cooled();
    expect(() => confirmRevision({ goals: c.goals, rules: c.rules, revisions: c.revisions, revisionId: c.revision.id, signedName: '', accepted: false, now: later(8) })).toThrow(/firma|nome/i);
  });
  it('annullabile in qualsiasi momento, nulla cambia', () => {
    const c = cooled();
    const revs = cancelRevision({ revisions: c.revisions, revisionId: c.revision.id, now: later(2) });
    expect(revs[0].status).toBe('cancelled');
    expect(pendingRevision(revs, 'g1')).toBeUndefined();
    expect(() => confirmRevision({ goals: c.goals, rules: c.rules, revisions: revs, revisionId: c.revision.id, signedName: 'Mario Rossi', accepted: true, now: later(8) })).toThrow(/già chiusa/);
  });
  it('se le regole sono cambiate nel frattempo la modifica in attesa non si applica', () => {
    const c = cooled();
    const next = signed(); next.reviewFrequency = 'annual';
    const other = submitRevision({ goals: c.goals, rules: c.rules, revisions: [], request: req({ changes: { rules: next } }), stress: calm, now: later(3) });
    expect(() => confirmRevision({ goals: other.goals, rules: other.rules, revisions: c.revisions, revisionId: c.revision.id, signedName: 'Mario Rossi', accepted: true, now: later(8) })).toThrow(/cambiate nel frattempo/);
  });
  it('un obiettivo con scadenza passata non blocca una riconferma che non tocca l\'obiettivo', () => {
    const goal = { ...baseGoal(), targetDate: '2026-01' };
    const next = signed(); next.crashPlan.choice = 'hold';
    const a = submitRevision({ goals: [goal], rules: [baseRules()], revisions: [], request: req({ changes: { rules: next } }), stress: crash, now: NOW });
    expect(a.outcome).toBe('cooling');
    const r = confirmRevision({ goals: a.goals, rules: a.rules, revisions: a.revisions, revisionId: a.revision.id, signedName: 'Mario Rossi', accepted: true, now: later(8) });
    expect(activeRules(r.rules, 'g1').crashPlan.choice).toBe('hold');
  });
});

describe('review periodica', () => {
  it('scade a 6 o 12 mesi dalla firma o dall\'ultima review', () => {
    const rules = baseRules();
    expect(nextReviewAt({ rules, lastReviewAt: null }).toISOString().slice(0, 10)).toBe('2027-04-15');
    expect(nextReviewAt({ rules: { ...rules, reviewFrequency: 'annual' }, lastReviewAt: null }).toISOString().slice(0, 10)).toBe('2027-10-15');
    expect(nextReviewAt({ rules, lastReviewAt: '2027-01-10T00:00:00Z' }).toISOString().slice(0, 10)).toBe('2027-07-10');
  });
  it('reviewsDue elenca solo gli obiettivi attivi scaduti', () => {
    const s = state();
    expect(reviewsDue({ goals: s.goals, rules: s.rules, lastReviewAt: null, now: later(100) })).toEqual([]);
    expect(reviewsDue({ goals: s.goals, rules: s.rules, lastReviewAt: null, now: later(200) })).toHaveLength(1);
    expect(reviewsDue({ goals: [{ ...s.goals[0], status: 'archived' }], rules: s.rules, lastReviewAt: null, now: later(200) })).toEqual([]);
    expect(reviewsDue({ goals: s.goals, rules: s.rules, lastReviewAt: later(150).toISOString(), now: later(200) })).toEqual([]);
  });
});

describe('rulesToInput', () => {
  it('riparte dalle regole attive e richiede di nuovo la firma', () => {
    const i = rulesToInput(baseRules());
    expect(i.signedName).toBe('');
    expect(i.accepted).toBe(false);
    expect(i.crashPlan.choice).toBe('hold_and_buy');
    expect(i.rebalance.thresholdPct).toBe(5);
  });
});
