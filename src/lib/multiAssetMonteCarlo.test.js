import { describe, it, expect } from 'vitest';
import { simulateGoal, portfolioMonthlyModel } from './multiAssetMonteCarlo';

// Mondo deterministico: nessuna volatilità, nessuna tassa, nessun costo.
const flat = (over = {}) => ({
  version: 'test', inflation: 2, inflationVol: 0, taxRate: 0, costDrag: 0,
  assets: { equity: { return: 6, volatility: 0 }, cash: { return: 1, volatility: 0 } },
  correlations: {}, ...over,
});
const base = { initialValue: 10000, months: 120, weights: { equity: 100 }, targetAmount: 1, simulations: 50, assumptions: flat() };

describe('portfolioMonthlyModel', () => {
  const A = {
    inflationVol: 1,
    costDrag: 0.2,
    assets: { equity: { return: 6, volatility: 16 }, bond: { return: 2, volatility: 4 } },
    correlations: { 'equity|bond': 0.5, 'inflation|equity': 0.3, 'inflation|bond': -0.4 },
  };
  it('singolo asset: parametri mensili e correlazione con l\'inflazione', () => {
    const m = portfolioMonthlyModel({ equity: 1 }, A);
    expect(m.mu).toBeCloseTo((6 - 0.2) / 100 / 12, 10);
    expect(m.sigma).toBeCloseTo(0.16 / Math.sqrt(12), 10);
    expect(m.rho).toBeCloseTo(0.3, 10);
  });
  it('due asset: varianza e correlazione calcolate a mano', () => {
    const m = portfolioMonthlyModel({ equity: 50, bond: 50 }, A);
    const variance = 0.25 * 256 + 0.25 * 16 + 2 * 0.25 * 0.5 * 16 * 4; // 64+4+16 = 84
    expect(m.sigma).toBeCloseTo(Math.sqrt(variance) / 100 / Math.sqrt(12), 10);
    const cov = 0.5 * 16 * 1 * 0.3 + 0.5 * 4 * 1 * -0.4;
    expect(m.rho).toBeCloseTo(cov / (Math.sqrt(variance) * 1), 10);
  });
  it('normalizza i pesi, ignora gli sconosciuti, allocazione vuota → null', () => {
    expect(portfolioMonthlyModel({ equity: 2, bond: 2, foo: 99 }, A)).toEqual(portfolioMonthlyModel({ equity: 1, bond: 1 }, A));
    expect(portfolioMonthlyModel({}, A)).toBeNull();
    expect(portfolioMonthlyModel({ foo: 1 }, A)).toBeNull();
  });
  it('la correlazione resta in [-1, 1]', () => {
    const B = { ...A, correlations: { 'inflation|equity': 5 } };
    expect(portfolioMonthlyModel({ equity: 1 }, B).rho).toBe(1);
  });
});

describe('simulateGoal — caso deterministico, formule chiuse', () => {
  it('senza tasse né versamenti: valore reale = V0·(1+r/12)^m / (1+π/12)^m', () => {
    const r = simulateGoal(base);
    const expected = 10000 * Math.pow(1 + 0.06 / 12, 120) / Math.pow(1 + 0.02 / 12, 120);
    expect(r.percentiles.p50).toBeCloseTo(expected, 4);
    expect(r.percentiles.p5).toBeCloseTo(expected, 4);
    expect(r.percentiles.p95).toBeCloseTo(expected, 4);
  });
  it('versamenti nominali costanti, rendimento e inflazione nulli: V0 + c·m', () => {
    const A = flat({ inflation: 0, assets: { equity: { return: 0, volatility: 0 } } });
    const r = simulateGoal({ ...base, assumptions: A, monthlyContribution: 100 });
    expect(r.percentiles.p50).toBeCloseTo(10000 + 100 * 120, 6);
  });
  it('tasse solo sul gain: V − t·(V − base di costo)', () => {
    const A = flat({ inflation: 0, assets: { equity: { return: 12, volatility: 0 } } });
    const r = simulateGoal({ ...base, assumptions: A, months: 60, taxRate: 26 });
    const gross = 10000 * Math.pow(1.01, 60);
    expect(r.percentiles.p50).toBeCloseTo(gross - 0.26 * (gross - 10000), 4);
  });
  it('nessuna tassa se non c\'è plusvalenza', () => {
    const A = flat({ inflation: 0, assets: { equity: { return: -12, volatility: 0 } } });
    const r = simulateGoal({ ...base, assumptions: A, months: 24, taxRate: 26 });
    expect(r.percentiles.p50).toBeCloseTo(10000 * Math.pow(1 - 0.01, 24), 4);
  });
  it('base di costo iniziale più bassa → più tasse', () => {
    const A = flat({ inflation: 0 });
    const a = simulateGoal({ ...base, assumptions: A, taxRate: 26, initialCostBasis: 10000 });
    const b = simulateGoal({ ...base, assumptions: A, taxRate: 26, initialCostBasis: 4000 });
    expect(b.percentiles.p50).toBeLessThan(a.percentiles.p50);
  });
  it('costi (TER) riducono il rendimento', () => {
    const r = simulateGoal({ ...base, assumptions: flat({ costDrag: 1, inflation: 0 }) });
    expect(r.percentiles.p50).toBeCloseTo(10000 * Math.pow(1 + 0.05 / 12, 120), 4);
  });
  it('versamento indicizzato all\'inflazione vale più di uno costante', () => {
    const fixed = simulateGoal({ ...base, monthlyContribution: 200 });
    const indexed = simulateGoal({ ...base, monthlyContribution: 200, indexContribution: true });
    expect(indexed.percentiles.p50).toBeGreaterThan(fixed.percentiles.p50);
  });
  it('il fan chart parte dal capitale iniziale e ha un punto per anno', () => {
    const r = simulateGoal(base);
    expect(r.fan).toHaveLength(11);
    expect(r.fan[0].p50).toBe(10000);
    expect(r.fan[10].p50).toBeCloseTo(r.percentiles.p50, 4); // senza tasse coincidono
    for (let i = 1; i < r.fan.length; i++) expect(r.fan[i].p50).toBeGreaterThan(r.fan[i - 1].p50);
  });
});

describe('simulateGoal — obiettivo e probabilità', () => {
  const real = 10000 * Math.pow(1 + 0.06 / 12, 120) / Math.pow(1 + 0.02 / 12, 120);
  it('target sotto/sopra il valore reale atteso → 100% / 0%', () => {
    expect(simulateGoal({ ...base, targetAmount: real - 1 }).successProbability).toBe(100);
    expect(simulateGoal({ ...base, targetAmount: real + 1 }).successProbability).toBe(0);
  });
  it('target indicizzato (reale) vs nominale fisso: il nominale è molto più facile', () => {
    const nominalValue = 10000 * Math.pow(1 + 0.06 / 12, 120);
    // un target di 15.000 € "di oggi" è più duro di 15.000 € nominali fissi
    const indexed = simulateGoal({ ...base, targetAmount: 15000, indexTarget: true });
    const fixed = simulateGoal({ ...base, targetAmount: 15000, indexTarget: false });
    expect(nominalValue).toBeGreaterThan(15000);
    expect(fixed.successProbability).toBe(100);
    expect(indexed.successProbability).toBe(real >= 15000 ? 100 : 0);
  });
  it('è deterministico a parità di seme e diverso con un altro seme', () => {
    const A = { ...flat(), assets: { equity: { return: 6, volatility: 15 } }, inflationVol: 1 };
    const a = simulateGoal({ ...base, assumptions: A, simulations: 300, targetAmount: 15000 });
    const b = simulateGoal({ ...base, assumptions: A, simulations: 300, targetAmount: 15000 });
    const c = simulateGoal({ ...base, assumptions: A, simulations: 300, targetAmount: 15000, seed: 7 });
    expect(a).toEqual(b);
    expect(c.percentiles.p50).not.toBe(a.percentiles.p50);
  });
  it('più volatilità → fascia p5–p95 più ampia', () => {
    const mk = (vol) => simulateGoal({ ...base, simulations: 1000, assumptions: { ...flat(), assets: { equity: { return: 6, volatility: vol } } } });
    const lo = mk(5), hi = mk(20);
    expect(hi.percentiles.p95 - hi.percentiles.p5).toBeGreaterThan(lo.percentiles.p95 - lo.percentiles.p5);
  });
  it('più versamento → probabilità non inferiore', () => {
    const A = { ...flat(), assets: { equity: { return: 6, volatility: 15 } } };
    const p = (c) => simulateGoal({ ...base, assumptions: A, simulations: 1000, monthlyContribution: c, targetAmount: 40000 }).successProbability;
    expect(p(300)).toBeGreaterThan(p(100));
  });
  it('percentili ordinati', () => {
    const A = { ...flat(), assets: { equity: { return: 6, volatility: 15 } }, inflationVol: 1 };
    const { percentiles: q } = simulateGoal({ ...base, assumptions: A, simulations: 500 });
    expect(q.p5).toBeLessThan(q.p10); expect(q.p10).toBeLessThan(q.p25); expect(q.p25).toBeLessThan(q.p50);
    expect(q.p50).toBeLessThan(q.p75); expect(q.p75).toBeLessThan(q.p90); expect(q.p90).toBeLessThan(q.p95);
  });
});

describe('simulateGoal — statistica', () => {
  it('la media del valore nominale simulato coincide con la teoria (entro 3 errori standard)', () => {
    const A = { ...flat({ inflation: 0 }), assets: { equity: { return: 7, volatility: 15 } } };
    const n = 4000;
    const r = simulateGoal({ ...base, assumptions: A, simulations: n, months: 120 });
    // media aritmetica mensile: E[V_T] = V0·(1+μ)^m
    const theory = 10000 * Math.pow(1 + 0.07 / 12, 120);
    const mean = r.fan[10].p50; // mediana ≈ media·exp(−σ²T/2): confrontiamo con la mediana teorica
    const sigmaM = 0.15 / Math.sqrt(12);
    const medianTheory = 10000 * Math.exp(120 * (Math.log(1 + 0.07 / 12) - sigmaM ** 2 / 2));
    expect(mean / medianTheory).toBeGreaterThan(0.97);
    expect(mean / medianTheory).toBeLessThan(1.03);
    expect(theory).toBeGreaterThan(mean); // la mediana sta sotto la media (rendimenti log-normali)
  });
  it('una correlazione positiva con l\'inflazione riduce la dispersione reale', () => {
    const mk = (rho) => simulateGoal({
      ...base, simulations: 2000,
      assumptions: { ...flat(), inflationVol: 2, assets: { equity: { return: 6, volatility: 15 } }, correlations: { 'inflation|equity': rho } },
    });
    const spread = (r) => r.percentiles.p95 - r.percentiles.p5;
    expect(spread(mk(0.9))).toBeLessThan(spread(mk(-0.9)));
  });
});

describe('simulateGoal — glide path nel tempo', () => {
  const A = flat({ inflation: 0, assets: { equity: { return: 12, volatility: 0 }, cash: { return: 0, volatility: 0 } } });
  it('allocazione che passa da azioni a liquidità: risultato fra tutto-azioni e tutto-liquidità', () => {
    const glide = simulateGoal({ ...base, assumptions: A, months: 120, weightsAt: (left) => (left > 60 ? { equity: 100 } : { cash: 100 }) });
    const allEq = simulateGoal({ ...base, assumptions: A, months: 120, weights: { equity: 100 } });
    const allCash = simulateGoal({ ...base, assumptions: A, months: 120, weights: { cash: 100 } });
    expect(glide.percentiles.p50).toBeLessThan(allEq.percentiles.p50);
    expect(glide.percentiles.p50).toBeGreaterThan(allCash.percentiles.p50);
    expect(glide.percentiles.p50).toBeCloseTo(10000 * Math.pow(1.01, 60), 4); // 60 mesi in azioni, poi fermo
  });
  it('weightsAt riceve i mesi rimanenti: months … 1', () => {
    const seen = [];
    simulateGoal({ ...base, months: 6, simulations: 2, weightsAt: (left) => { seen.push(left); return { equity: 1 }; } });
    expect(seen).toEqual([6, 5, 4, 3, 2, 1]);
  });
});

describe('simulateGoal — errori', () => {
  it('allocazione vuota o sconosciuta → errore esplicito', () => {
    expect(() => simulateGoal({ ...base, weights: {} })).toThrow(/Allocazione/);
    expect(() => simulateGoal({ ...base, weights: { foo: 1 } })).toThrow(/Allocazione/);
  });
});
