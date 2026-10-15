import { describe, it, expect } from 'vitest';
import {
  GOAL_TYPES, incomeHorizon, incomeTarget, validateGoalInput, createGoal, nominalAtDate, currentMonth, fieldsFromGoal, goalFromFields,
} from './goalModel';

const NOW = new Date(2026, 9, 15); // 15 ott 2026
const base = { name: 'Casa', type: 'house', targetAmount: 100000, targetDate: '2032-10', initialCapital: 20000, monthlyContribution: 1200, taxResidence: { country: 'IT' } };

describe('nominalAtDate', () => {
  it('100.000 € di oggi a 6 anni al 2,2% ≈ 113.900 (criterio §19)', () => {
    expect(Math.round(nominalAtDate(100000, 6) / 100) * 100).toBe(113900);
  });
  it('0 anni → invariato', () => expect(nominalAtDate(5000, 0)).toBe(5000));
});

describe('rendita: orizzonte e capitale necessario', () => {
  const income = { birthYear: 1990, withdrawalStartDate: '2031-10', horizonEndAge: 95, monthlyWithdrawal: 3000, otherIncomeMonthly: 1000 };
  it('età all\'inizio e durata', () => {
    expect(incomeHorizon(income)).toEqual({ ageAtStart: 41, horizonYears: 54 });
  });
  it('54 anni → prelievo sostenibile 3,3%; capitale = (3000−1000)×12 ÷ 3,3%', () => {
    const t = incomeTarget(income);
    expect(t.swr).toBe(3.3);
    expect(t.annualNet).toBe(24000);
    expect(t.targetAmount).toBeCloseTo(24000 / 0.033, 6);
  });
  it('durata ≤30 anni → 4%; ≤40 → 3,5%', () => {
    expect(incomeTarget({ ...income, birthYear: 1970, horizonEndAge: 90 }).swr).toBe(4.0);   // 90−60=30
    expect(incomeTarget({ ...income, birthYear: 1970, horizonEndAge: 95 }).swr).toBe(3.5);   // 95−60=35 ... 3,5
    expect(incomeTarget({ ...income, birthYear: 1990, horizonEndAge: 95 }).swr).toBe(3.3);
  });
  it('senza altri redditi serve più capitale', () => {
    expect(incomeTarget({ ...income, otherIncomeMonthly: 0 }).targetAmount).toBeGreaterThan(incomeTarget(income).targetAmount);
  });
});

describe('validateGoalInput', () => {
  const ok = (input, ctx = {}) => validateGoalInput(input, { now: NOW, ...ctx });
  it('obiettivo a data valido', () => expect(ok(base).valid).toBe(true));
  it('nome obbligatorio e limitato', () => {
    expect(ok({ ...base, name: '  ' }).errors.name).toBeTruthy();
    expect(ok({ ...base, name: 'x'.repeat(61) }).errors.name).toBeTruthy();
  });
  it('importo positivo, data futura (anche il mese corrente non va bene)', () => {
    expect(ok({ ...base, targetAmount: 0 }).errors.targetAmount).toBeTruthy();
    expect(ok({ ...base, targetAmount: '' }).errors.targetAmount).toBeTruthy();
    expect(ok({ ...base, targetDate: '2026-10' }).errors.targetDate).toBeTruthy();
    expect(ok({ ...base, targetDate: '2026-11' }).valid).toBe(true);
    expect(ok({ ...base, targetDate: '2026-13' }).errors.targetDate).toBeTruthy();
    expect(ok({ ...base, targetDate: '' }).errors.targetDate).toBeTruthy();
  });
  it('capitale e PAC: 0 va bene, negativo o vuoto no', () => {
    expect(ok({ ...base, initialCapital: 0, monthlyContribution: 0 }).valid).toBe(true);
    expect(ok({ ...base, initialCapital: -1 }).errors.initialCapital).toBeTruthy();
    expect(ok({ ...base, monthlyContribution: '' }).errors.monthlyContribution).toBeTruthy();
  });
  it('residenza: Italia o altro paese con aliquota 0–60', () => {
    expect(ok({ ...base, taxResidence: { country: 'OTHER', customRate: 19 } }).valid).toBe(true);
    expect(ok({ ...base, taxResidence: { country: 'OTHER' } }).errors.taxResidence).toBeTruthy();
    expect(ok({ ...base, taxResidence: { country: 'OTHER', customRate: 80 } }).errors.taxResidence).toBeTruthy();
    expect(ok({ ...base, taxResidence: { country: 'FR' } }).errors.taxResidence).toBeTruthy();
  });
  it('tipo sconosciuto', () => expect(ok({ ...base, type: 'yacht' }).valid).toBe(false));

  it('fondo emergenza: mesi coperti, spese mensili e data', () => {
    const em = { name: 'Emergenza', type: 'emergency', monthsCovered: 6, targetDate: '2027-06', initialCapital: 0, monthlyContribution: 300, taxResidence: { country: 'IT' } };
    expect(ok(em, { monthlyExpenses: 2000 }).valid).toBe(true);
    expect(ok(em, {}).errors.monthlyExpenses).toBeTruthy();
    expect(ok({ ...em, monthsCovered: 7 }, { monthlyExpenses: 2000 }).errors.monthsCovered).toBeTruthy();
  });
  it('rendita: tutti i campi e coerenza', () => {
    const inc = { name: 'Rendita', type: 'income', birthYear: 1990, withdrawalStartDate: '2031-10', horizonEndAge: 95, monthlyWithdrawal: 3000, otherIncomeMonthly: 1000, initialCapital: 100000, monthlyContribution: 5000, taxResidence: { country: 'IT' } };
    expect(ok(inc).valid).toBe(true);
    expect(ok({ ...inc, birthYear: 2015 }).errors.birthYear).toBeTruthy();
    expect(ok({ ...inc, otherIncomeMonthly: 3000 }).errors.otherIncomeMonthly).toMatch(/non ti serve capitale/);
    expect(ok({ ...inc, monthlyWithdrawal: 0 }).errors.monthlyWithdrawal).toBeTruthy();
    expect(ok({ ...inc, horizonEndAge: 45 }).errors.horizonEndAge).toBeTruthy();
    expect(ok({ ...inc, birthYear: 1936, horizonEndAge: 80 }).errors.horizonEndAge).toBeTruthy(); // durata < 5 anni
  });
});

describe('createGoal', () => {
  it('obiettivo a data: campi e valori numerici', () => {
    const g = createGoal({ ...base, initialCapital: '20000', monthlyContribution: '1200' }, { now: NOW });
    expect(g).toMatchObject({ name: 'Casa', type: 'house', family: 'dated', priority: 2, targetAmount: 100000, initialCapital: 20000, monthlyContribution: 1200, status: 'active', amountsInRealTerms: true });
    expect(g.id).toMatch(/^goal_/);
    expect(g.scenario).toBe('medium');
    expect('riskProfile' in g).toBe(false);
    expect(g.taxResidence).toEqual({ country: 'IT' });
  });
  it('fondo emergenza: target = spese × mesi, priorità 1', () => {
    const g = createGoal({ name: 'E', type: 'emergency', monthsCovered: 9, targetDate: '2027-12', initialCapital: 0, monthlyContribution: 200, taxResidence: { country: 'IT' } }, { monthlyExpenses: 2000, now: NOW });
    expect(g.targetAmount).toBe(18000);
    expect(g.priority).toBe(1);
  });
  it('rendita: target dal prelievo sostenibile, data = inizio prelievi', () => {
    const g = createGoal({ name: 'R', type: 'income', birthYear: 1990, withdrawalStartDate: '2031-10', monthlyWithdrawal: 3000, otherIncomeMonthly: 1000, initialCapital: 0, monthlyContribution: 1000, taxResidence: { country: 'IT' } }, { now: NOW });
    expect(g.targetDate).toBe('2031-10');
    expect(g.horizonEndAge).toBe(95);
    expect(g.targetAmount).toBeCloseTo(24000 / 0.033, 6);
  });
  it('altro paese: salva l\'aliquota scelta', () => {
    const g = createGoal({ ...base, taxResidence: { country: 'OTHER', customRate: '19' } }, { now: NOW });
    expect(g.taxResidence).toEqual({ country: 'OTHER', customRate: 19 });
  });
});

describe('tipi e utilità', () => {
  it('ogni tipo ha famiglia, priorità e testo', () => {
    for (const t of Object.values(GOAL_TYPES)) {
      expect(['security', 'dated', 'income']).toContain(t.family);
      expect(t.priority).toBeGreaterThanOrEqual(1);
      expect(t.label.length).toBeGreaterThan(3);
    }
    expect(GOAL_TYPES.emergency.priority).toBe(1);
  });
  it('currentMonth formatta con lo zero', () => expect(currentMonth(NOW)).toBe('2026-10'));
});

describe('fieldsFromGoal / goalFromFields', () => {
  it('andata e ritorno: stesso obiettivo (id e creazione compresi)', () => {
    const g = createGoal({ ...base, scenario: 'dynamic' }, { now: NOW });
    const { goal, errors } = goalFromFields('house', fieldsFromGoal(g), { now: NOW, base: g });
    expect(errors).toEqual({});
    expect(goal).toMatchObject({ id: g.id, createdAt: g.createdAt, targetAmount: 100000, monthlyContribution: 1200, scenario: 'dynamic' });
  });
  it('un campo cambiato si riflette; uno non valido restituisce gli errori', () => {
    const g = createGoal(base, { now: NOW });
    const f = { ...fieldsFromGoal(g), targetAmount: '120000' };
    expect(goalFromFields('house', f, { now: NOW, base: g }).goal.targetAmount).toBe(120000);
    const bad = goalFromFields('house', { ...f, targetDate: '2020-01' }, { now: NOW, base: g });
    expect(bad.goal).toBeNull();
    expect(bad.errors.targetDate).toBeTruthy();
  });
  it('rendita ed emergenza fanno il giro completo', () => {
    const inc = createGoal({ name: 'R', type: 'income', birthYear: 1990, withdrawalStartDate: '2051-10', monthlyWithdrawal: 3000, otherIncomeMonthly: 1000, initialCapital: 0, monthlyContribution: 1000, taxResidence: { country: 'OTHER', customRate: '19' } }, { now: NOW });
    const r = goalFromFields('income', fieldsFromGoal(inc), { now: NOW, base: inc });
    expect(r.goal.targetAmount).toBeCloseTo(inc.targetAmount, 6);
    expect(r.goal.taxResidence).toEqual({ country: 'OTHER', customRate: 19 });
    const em = createGoal({ name: 'E', type: 'emergency', monthsCovered: 9, targetDate: '2028-10', initialCapital: 0, monthlyContribution: 200, taxResidence: { country: 'IT' } }, { monthlyExpenses: 2000, now: NOW });
    expect(goalFromFields('emergency', fieldsFromGoal(em), { now: NOW, base: em, monthlyExpenses: 2000 }).goal.targetAmount).toBe(18000);
  });
});
