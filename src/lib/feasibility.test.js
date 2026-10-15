import { describe, it, expect } from 'vitest';
import { allocationFor, evaluateFeasibility, evaluateScenarios, contributionAnalysis, CONTRIBUTION_TOLERANCE } from './feasibility';
import { createGoal } from './goalModel';
import { SCENARIOS, EMERGENCY_MIX } from '../config/scenarios';
import { portfolioStats } from '../services/goalService';

const NOW = new Date(2026, 9, 15);
const goal = (over = {}) => createGoal({
  name: 'Casa', type: 'house', targetAmount: 60000, targetDate: '2034-10', initialCapital: 10000, monthlyContribution: 600,
  taxResidence: { country: 'IT' }, ...over,
}, { monthlyExpenses: 2000, now: NOW });

describe('ipotesi di rendimento', () => {
  it('prudente < medio < dinamico per rendimento atteso e per oscillazione', () => {
    const s = SCENARIOS.map(x => portfolioStats(x.mix));
    expect(s[0].expectedReturn).toBeLessThan(s[1].expectedReturn);
    expect(s[1].expectedReturn).toBeLessThan(s[2].expectedReturn);
    expect(s[0].volatility).toBeLessThan(s[1].volatility);
    expect(s[1].volatility).toBeLessThan(s[2].volatility);
  });
  it('allocationFor: ipotesi scelta; "declared" usa la composizione dichiarata solo se esiste', () => {
    const g = goal();
    expect(allocationFor(g)).toEqual(SCENARIOS[1].mix);
    expect(allocationFor(g, { scenarioId: 'dynamic' })).toEqual(SCENARIOS[2].mix);
    expect(allocationFor(g, { scenarioId: 'declared', declared: { equity: 70, cash: 30 } })).toEqual({ equity: 70, cash: 30 });
    expect(allocationFor(g, { scenarioId: 'declared' })).toEqual(SCENARIOS[1].mix);
    expect(allocationFor({ ...g, scenario: 'prudent' })).toEqual(SCENARIOS[0].mix);
  });
  it('il fondo emergenza assume sempre liquidità', () => {
    const e = goal({ type: 'emergency', monthsCovered: 6, targetDate: '2028-10', targetAmount: undefined });
    expect(allocationFor(e, { scenarioId: 'dynamic' })).toEqual(EMERGENCY_MIX);
    const rows = evaluateScenarios(e, { now: NOW });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('cash');
  });
});

describe('evaluateScenarios', () => {
  it('tre righe con probabilità, rendimento e oscillazione; più la dichiarata se c\'è', () => {
    const rows = evaluateScenarios(goal(), { now: NOW });
    expect(rows.map(r => r.id)).toEqual(['prudent', 'medium', 'dynamic']);
    for (const r of rows) {
      expect(r.probability).toBeGreaterThanOrEqual(0);
      expect(r.probability).toBeLessThanOrEqual(100);
      expect(r.volatility).toBeGreaterThan(0);
      expect(r.expectedRealReturn).toBeLessThan(r.expectedReturn);
    }
    const withDeclared = evaluateScenarios(goal(), { now: NOW, declared: { equity: 60, bondMedium: 40 } });
    expect(withDeclared.map(r => r.id)).toEqual(['prudent', 'medium', 'dynamic', 'declared']);
  });
  it('è ripetibile (seme fisso)', () => {
    expect(evaluateScenarios(goal(), { now: NOW })).toEqual(evaluateScenarios(goal(), { now: NOW }));
  });
});

describe('evaluateFeasibility', () => {
  it('più versamento → probabilità non inferiore; target più alto → non superiore', () => {
    const base = evaluateFeasibility(goal(), { now: NOW }).evaluation.successProbability;
    expect(evaluateFeasibility(goal({ monthlyContribution: 900 }), { now: NOW }).evaluation.successProbability).toBeGreaterThanOrEqual(base);
    expect(evaluateFeasibility(goal({ targetAmount: 90000 }), { now: NOW }).evaluation.successProbability).toBeLessThanOrEqual(base);
  });
  it('il capitale attuale (valore reale degli investimenti) sostituisce quello dichiarato', () => {
    const declared = evaluateFeasibility(goal(), { now: NOW }).evaluation.successProbability;
    const richer = evaluateFeasibility(goal(), { now: NOW, currentValue: 40000, costBasis: 35000 }).evaluation.successProbability;
    expect(richer).toBeGreaterThan(declared);
  });
});

describe('contributionAnalysis', () => {
  const analysis = (over) => contributionAnalysis(goal(over), { now: NOW });

  it('versamento basso → "short" con la differenza fino al minimo per essere in linea', () => {
    const a = analysis({ monthlyContribution: 100 });
    expect(a.verdict).toBe('short');
    expect(a.needed).toBeGreaterThan(100);
    expect(a.difference).toBe(a.needed - 100);
  });
  it('il versamento "necessario" porta davvero alla soglia 75% (e uno più basso no)', () => {
    const a = analysis({ monthlyContribution: 100 });
    const at = (m) => evaluateFeasibility(goal({ monthlyContribution: m }), { now: NOW, simulations: 1000 }).evaluation.successProbability;
    expect(at(a.needed)).toBeGreaterThanOrEqual(75);
    expect(at(a.needed - 40)).toBeLessThan(75);
  });
  it('versamento vicino al minimo → "ok"', () => {
    const needed = analysis({ monthlyContribution: 100 }).needed;
    expect(analysis({ monthlyContribution: Math.ceil(needed * 1.1) }).verdict).toBe('ok');
  });
  it('versamento molto sopra il necessario → "over"', () => {
    const needed = analysis({ monthlyContribution: 100 }).needed;
    const a = analysis({ monthlyContribution: Math.ceil(needed * (1 + CONTRIBUTION_TOLERANCE) * 2) });
    expect(a.verdict).toBe('over');
    expect(a.needed).toBe(needed);
    expect(a.difference).toBeLessThan(0);
  });
  it('capitale già sufficiente e versamento 0 → "ok"; con versamento > 0 → "over" e minimo 0', () => {
    expect(analysis({ initialCapital: 90000, monthlyContribution: 0 })).toMatchObject({ verdict: 'ok', needed: 0 });
    expect(analysis({ initialCapital: 90000, monthlyContribution: 300 })).toMatchObject({ verdict: 'over', needed: 0 });
  });
  it('obiettivo fuori scala: il versamento necessario è enorme rispetto a quello attuale (nessun numero nascosto)', () => {
    const a = contributionAnalysis(goal({ targetAmount: 5000000, targetDate: '2028-10', monthlyContribution: 100 }), { now: NOW });
    expect(a.verdict).toBe('short');
    expect(a.needed).toBeGreaterThan(100000);
    expect(a.achievableAmount).toBeLessThan(100000);
  });
  it('importo raggiungibile: con quel valore la probabilità è ≥ 75%, poco più in alto no', () => {
    const a = analysis({});
    const prob = (t) => evaluateFeasibility(goal({ targetAmount: t }), { now: NOW, simulations: 1000 }).evaluation.successProbability;
    expect(a.achievableAmount % 100).toBe(0);
    expect(prob(a.achievableAmount)).toBeGreaterThanOrEqual(74);
    expect(prob(a.achievableAmount * 1.25)).toBeLessThan(75);
  });
  it('rendita: converte l\'importo raggiungibile in prelievo mensile sostenibile', () => {
    const g = createGoal({ name: 'R', type: 'income', birthYear: 1985, withdrawalStartDate: '2050-01', monthlyWithdrawal: 3000, otherIncomeMonthly: 500, initialCapital: 20000, monthlyContribution: 800, taxResidence: { country: 'IT' } }, { now: NOW });
    const a = contributionAnalysis(g, { now: NOW });
    expect(a.achievableIncome).toBeGreaterThan(500);
    // più capitale raggiungibile → più rendita
    const g2 = { ...g, monthlyContribution: 1600 };
    expect(contributionAnalysis(g2, { now: NOW }).achievableIncome).toBeGreaterThan(a.achievableIncome);
  });
  it('è ripetibile', () => {
    expect(analysis({})).toEqual(analysis({}));
  });
});

describe('coerenza tra versamento necessario e importo raggiungibile', () => {
  it('con l\'importo raggiungibile il versamento attuale è sufficiente (nessun "troppo poco" per un soffio)', () => {
    const g = goal({ monthlyContribution: 700 });
    const a = contributionAnalysis(g, { now: NOW });
    const g2 = goal({ monthlyContribution: 700, targetAmount: a.achievableAmount });
    const b = contributionAnalysis(g2, { now: NOW });
    expect(b.verdict).not.toBe('short');
    expect(b.needed).toBeLessThanOrEqual(700);
  });
});
