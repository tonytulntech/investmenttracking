import { describe, it, expect } from 'vitest';
import { defaultRulesInput, validateRulesInput, createRulesV1, describeRules, MIN_NOTE_LENGTH } from './rulesModel';

const NOW = new Date('2026-10-15T10:00:00Z');
const valid = () => ({
  ...defaultRulesInput(),
  allocation: { equity: 50, bondShort: 10, bondMedium: 30, cash: 5, gold: 5 },
  crashPlan: { choice: 'hold_and_buy', personalNote: 'Non guardo il portafoglio e continuo a versare come previsto.' },
  signedName: 'Mario Rossi', accepted: true,
});

describe('validateRulesInput', () => {
  it('input completo → valido', () => expect(validateRulesInput(valid()).valid).toBe(true));
  it('i default da soli NON bastano: servono nota, nome e conferma', () => {
    const r = validateRulesInput(defaultRulesInput());
    expect(r.valid).toBe(false);
    expect(Object.keys(r.errors).sort()).toEqual(['accepted', 'allocation', 'personalNote', 'signedName']);
  });
  it('la nota deve avere almeno 20 caratteri (spazi esclusi ai bordi)', () => {
    const v = valid();
    v.crashPlan.personalNote = '  ' + 'a'.repeat(MIN_NOTE_LENGTH - 1) + '  ';
    expect(validateRulesInput(v).errors.personalNote).toBeTruthy();
    v.crashPlan.personalNote = 'a'.repeat(MIN_NOTE_LENGTH);
    expect(validateRulesInput(v).errors.personalNote).toBeUndefined();
  });
  it('la firma richiede nome di almeno 3 caratteri e conferma esplicita (true)', () => {
    expect(validateRulesInput({ ...valid(), signedName: ' ab ' }).errors.signedName).toBeTruthy();
    expect(validateRulesInput({ ...valid(), accepted: 'true' }).errors.accepted).toBeTruthy();
    expect(validateRulesInput({ ...valid(), accepted: false }).errors.accepted).toBeTruthy();
  });
  it('soglia 1–20 solo se il metodo la usa; mese 1–12 solo se il metodo lo usa', () => {
    const v = valid();
    expect(validateRulesInput({ ...v, rebalance: { ...v.rebalance, thresholdPct: 0 } }).errors.thresholdPct).toBeTruthy();
    expect(validateRulesInput({ ...v, rebalance: { ...v.rebalance, thresholdPct: 21 } }).errors.thresholdPct).toBeTruthy();
    expect(validateRulesInput({ ...v, rebalance: { method: 'calendar', thresholdPct: 0, calendarMonth: 3 } }).valid).toBe(true);
    expect(validateRulesInput({ ...v, rebalance: { method: 'threshold', thresholdPct: 5, calendarMonth: 99 } }).valid).toBe(true);
    expect(validateRulesInput({ ...v, rebalance: { method: 'calendar', thresholdPct: 5, calendarMonth: 13 } }).errors.calendarMonth).toBeTruthy();
  });
  it('scelte fuori elenco rifiutate', () => {
    const v = valid();
    expect(validateRulesInput({ ...v, rebalance: { ...v.rebalance, method: 'boh' } }).errors.method).toBeTruthy();
    expect(validateRulesInput({ ...v, crashPlan: { ...v.crashPlan, choice: 'vendo' } }).errors.crashChoice).toBeTruthy();
    expect(validateRulesInput({ ...v, reviewFrequency: 'mensile' }).errors.reviewFrequency).toBeTruthy();
  });
});

describe('createRulesV1', () => {
  it('crea la versione 1 attiva, firmata, con data e senza motivo di modifica', () => {
    const r = createRulesV1({ goalId: 'g1', input: valid(), now: NOW });
    expect(r).toMatchObject({ goalId: 'g1', version: 1, status: 'active', changeReason: null, signedName: 'Mario Rossi', signedAt: NOW.toISOString() });
    expect(r.id).toBe('rules_g1_v1');
    expect(r.rebalance).toEqual({ method: 'threshold', thresholdPct: 5, calendarMonth: null });
    expect(r.marketContext).toEqual({ portfolioDrawdownPct: 0, benchmarkDrawdown60dPct: 0 });
  });
  it('metodo "calendar": niente soglia; "both": entrambi', () => {
    const v = valid();
    expect(createRulesV1({ goalId: 'g', input: { ...v, rebalance: { method: 'calendar', thresholdPct: 5, calendarMonth: 3 } }, now: NOW }).rebalance)
      .toEqual({ method: 'calendar', thresholdPct: null, calendarMonth: 3 });
    expect(createRulesV1({ goalId: 'g', input: { ...v, rebalance: { method: 'both', thresholdPct: '7', calendarMonth: '1' } }, now: NOW }).rebalance)
      .toEqual({ method: 'both', thresholdPct: 7, calendarMonth: 1 });
  });
  it('rifiuta input non valido, non crea regole a metà', () => {
    expect(() => createRulesV1({ goalId: 'g', input: defaultRulesInput(), now: NOW })).toThrow(/Regole non valide/);
  });
  it('ritaglia gli spazi di nome e nota', () => {
    const v = valid();
    v.signedName = '  Mario Rossi  ';
    v.crashPlan.personalNote = '   ' + v.crashPlan.personalNote + '   ';
    const r = createRulesV1({ goalId: 'g', input: v, now: NOW });
    expect(r.signedName).toBe('Mario Rossi');
    expect(r.crashPlan.personalNote).toBe(v.crashPlan.personalNote.trim());
  });
});

describe('describeRules', () => {
  it('descrive le regole come un documento leggibile', () => {
    const rules = createRulesV1({ goalId: 'g', input: valid(), now: NOW });
    const text = describeRules(rules).join(' ');
    expect(text).toMatch(/oltre 5 punti/);
    expect(text).toMatch(/continuo a versare/i);
    expect(text).toMatch(/ogni 6 mesi/);
  });
  it('metodo "both": cita soglia e mese', () => {
    const rules = createRulesV1({ goalId: 'g', input: { ...valid(), rebalance: { method: 'both', thresholdPct: 4, calendarMonth: 1 } }, now: NOW });
    expect(describeRules(rules)[1]).toMatch(/4 punti.*gennaio/);
  });
});

describe('composizione dichiarata dallo studente', () => {
  const withAl = (al) => ({ ...valid(), allocation: al });
  it('deve fare 100 e ogni voce 0–100', () => {
    expect(validateRulesInput(withAl({ equity: 60, bondShort: 0, bondMedium: 40, cash: 0, gold: 0 })).valid).toBe(true);
    expect(validateRulesInput(withAl({ equity: 60, bondMedium: 30 })).errors.allocation).toMatch(/fare 100.*90/);
    expect(validateRulesInput(withAl({ equity: 120, bondMedium: -20 })).errors.allocation).toMatch(/0 a 100/);
    expect(validateRulesInput(withAl({ equity: 'abc', bondMedium: 100 })).errors.allocation).toBeTruthy();
  });
  it('campi vuoti valgono 0 e la versione salva numeri', () => {
    const r = createRulesV1({ goalId: 'g', input: withAl({ equity: '70', bondShort: '', bondMedium: '30', cash: '', gold: '' }), now: NOW });
    expect(r.allocation).toEqual({ equity: 70, bondShort: 0, bondMedium: 30, cash: 0, gold: 0 });
  });
  it('descrive la composizione scelta come documento', () => {
    const r = createRulesV1({ goalId: 'g', input: withAl({ equity: 70, bondMedium: 30 }), now: NOW });
    expect(describeRules(r)[0]).toBe('Composizione scelta: azionario 70%, obbligazioni a medio termine 30%.');
  });
});
