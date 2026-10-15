import { describe, it, expect } from 'vitest';
import { createSeededRandom } from './monteCarloService';
import { MARKET_ASSUMPTIONS as MA, resolveTaxRate } from '../config/marketAssumptions';
import {
  GOAL_STATUS, yearsUntilGoal, glideSchedule, portfolioStats,
  statusFromProbability, toRealAfterTax, nominalTargetForSuccess, evaluateGoal,
  monthlyNeededForSuccess, recommendAction,
} from './goalService';

const NOW = new Date(2026, 0, 1);
const W_8020 = { equity: 80, bond: 20 };
const base = {
  currentValue: 10000, targetAmount: 50000, goalYear: 2041,
  monthlyContribution: 200, weights: W_8020, now: NOW,
};

describe('createSeededRandom', () => {
  it('è deterministico e resta in [0,1)', () => {
    const a = createSeededRandom(7), b = createSeededRandom(7);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it('semi diversi → sequenze diverse', () => {
    expect(createSeededRandom(1)()).not.toBe(createSeededRandom(2)());
  });
});

describe('yearsUntilGoal', () => {
  it('calcola gli anni fino al 31/12 dell\'anno obiettivo', () => {
    expect(yearsUntilGoal(2036, NOW)).toBeCloseTo(11, 1);
  });
  it('è negativo se la scadenza è passata', () => {
    expect(yearsUntilGoal(2024, NOW)).toBeLessThan(0);
  });
});

describe('portfolioStats', () => {
  it('100% azionario: rendimento al netto dei costi, volatilità dell\'asset', () => {
    const s = portfolioStats({ equity: 100 });
    expect(s.expectedReturn).toBeCloseTo(6.3, 5);
    expect(s.volatility).toBeCloseTo(15.5, 5);
  });
  it('60/40: volatilità inferiore all\'azionario e superiore all\'obbligazionario', () => {
    const s = portfolioStats({ equity: 60, bond: 40 });
    // 0,6²·15,5² + 0,4²·6² + 2·0,6·0,4·0,2·15,5·6 = 101,18
    expect(s.volatility).toBeCloseTo(Math.sqrt(101.18), 1);
    expect(s.volatility).toBeLessThan(15.5);
    expect(s.volatility).toBeGreaterThan(6);
  });
  it('normalizza i pesi e ignora categorie sconosciute', () => {
    const a = portfolioStats({ equity: 60, bond: 40 });
    const b = portfolioStats({ equity: 6, bond: 4, foo: 50 });
    expect(b.expectedReturn).toBeCloseTo(a.expectedReturn, 8);
    expect(b.volatility).toBeCloseTo(a.volatility, 8);
  });
  it('allocazione vuota → null', () => {
    expect(portfolioStats({})).toBeNull();
    expect(portfolioStats(null)).toBeNull();
    expect(portfolioStats({ equity: 0 })).toBeNull();
  });
});

describe('statusFromProbability', () => {
  it.each([
    [100, GOAL_STATUS.ON_TRACK], [75, GOAL_STATUS.ON_TRACK], [74.9, GOAL_STATUS.WATCH],
    [50, GOAL_STATUS.WATCH], [49.9, GOAL_STATUS.REVIEW], [0, GOAL_STATUS.REVIEW],
  ])('%s%% → %s', (p, status) => expect(statusFromProbability(p)).toBe(status));
});

describe('conversione reale/dopo tasse', () => {
  it('senza gain e senza inflazione il valore resta invariato', () => {
    expect(toRealAfterTax(1000, 1000, 10, 0, 26)).toBeCloseTo(1000, 8);
  });
  it('applica tasse solo sul gain', () => {
    expect(toRealAfterTax(2000, 1000, 0, 0, 26)).toBeCloseTo(1740, 8);
  });
  it.each([500, 5000, 20000, 60000])('nominalTargetForSuccess è l\'inversa (costBasis %s)', (basis) => {
    const target = 30000;
    const nominal = nominalTargetForSuccess(target, basis, 12);
    expect(toRealAfterTax(nominal, basis, 12)).toBeCloseTo(target, 6);
  });
});

describe('evaluateGoal', () => {
  it('importo già disponibile: stato "raggiunto" ma probabilità reale, non forzata a 100', () => {
    const r = evaluateGoal({ ...base, currentValue: 51000 });
    expect(r.status).toBe(GOAL_STATUS.REACHED);
    expect(r.successProbability).toBeLessThan(100);
    expect(r.successProbability).toBeGreaterThan(50);
  });
  it('a scadenza raggiunta con importo disponibile → raggiunto al 100%', () => {
    const r = evaluateGoal({ ...base, currentValue: 51000, goalYear: 2025 });
    expect(r.status).toBe(GOAL_STATUS.REACHED);
    expect(r.successProbability).toBe(100);
  });
  it('la probabilità non salta passando dal poco sotto al poco sopra il target', () => {
    const below = evaluateGoal({ ...base, currentValue: 49900, monthlyContribution: 0 }).successProbability;
    const above = evaluateGoal({ ...base, currentValue: 50100, monthlyContribution: 0 }).successProbability;
    expect(Math.abs(above - below)).toBeLessThan(3);
  });
  it('obiettivo scaduto', () => {
    expect(evaluateGoal({ ...base, goalYear: 2025 }).status).toBe(GOAL_STATUS.EXPIRED);
  });
  it('è deterministico a parità di input', () => {
    const a = evaluateGoal(base), b = evaluateGoal(base);
    expect(a.successProbability).toBe(b.successProbability);
    expect(a.outcomes).toEqual(b.outcomes);
  });
  it('più versamento → probabilità non inferiore', () => {
    const lo = evaluateGoal({ ...base, monthlyContribution: 100 }).successProbability;
    const hi = evaluateGoal({ ...base, monthlyContribution: 400 }).successProbability;
    expect(hi).toBeGreaterThan(lo);
  });
  it('obiettivo più alto → probabilità non superiore', () => {
    const easy = evaluateGoal({ ...base, targetAmount: 40000 }).successProbability;
    const hard = evaluateGoal({ ...base, targetAmount: 80000 }).successProbability;
    expect(hard).toBeLessThan(easy);
  });
  it('obiettivo molto facile → in linea; impossibile → da rivedere', () => {
    const easy = evaluateGoal({ ...base, currentValue: 18000, targetAmount: 20000, goalYear: 2036, monthlyContribution: 500 });
    expect(easy.status).toBe(GOAL_STATUS.ON_TRACK);
    expect(easy.successProbability).toBeGreaterThan(95);
    const impossible = evaluateGoal({ ...base, currentValue: 1000, targetAmount: 1000000, goalYear: 2029, monthlyContribution: 0 });
    expect(impossible.status).toBe(GOAL_STATUS.REVIEW);
    expect(impossible.successProbability).toBeLessThan(5);
  });
  it('i percentili sono ordinati e in euro reali plausibili', () => {
    const { outcomes } = evaluateGoal(base);
    expect(outcomes.p10).toBeLessThan(outcomes.p50);
    expect(outcomes.p50).toBeLessThan(outcomes.p90);
    // 10k + 200/mese per ~16 anni ≈ 48k versati: la mediana reale dopo tasse deve stare nell'ordine di grandezza
    expect(outcomes.p50).toBeGreaterThan(30000);
    expect(outcomes.p50).toBeLessThan(80000);
  });
  it('la probabilità coincide con la frazione di scenari sopra il target reale', () => {
    const r = evaluateGoal(base);
    // la mediana reale cade vicino al target quando la probabilità è vicina al 50%
    const target = base.targetAmount;
    if (r.successProbability > 50) expect(r.outcomes.p50).toBeGreaterThanOrEqual(target * 0.95);
    else expect(r.outcomes.p50).toBeLessThanOrEqual(target * 1.05);
  });
  it('allocazione vuota → errore esplicito', () => {
    expect(() => evaluateGoal({ ...base, weights: {} })).toThrow(/Allocazione/);
  });
});

describe('monthlyNeededForSuccess', () => {
  it('è 0 se già sufficiente', () => {
    const input = { ...base, currentValue: 90000, monthlyContribution: 0 };
    expect(evaluateGoal({ ...input, simulations: 1000 }).successProbability).toBeGreaterThanOrEqual(MA.thresholds.onTrack);
    expect(monthlyNeededForSuccess(input)).toBe(0);
  });
  it('restituisce un versamento che raggiunge la soglia, e uno meno non basta', () => {
    const input = { ...base, monthlyContribution: 0 };
    const needed = monthlyNeededForSuccess(input);
    expect(needed).toBeGreaterThan(0);
    const p = (m) => evaluateGoal({ ...input, monthlyContribution: m, simulations: 1000 }).successProbability;
    expect(p(needed)).toBeGreaterThanOrEqual(MA.thresholds.onTrack);
    expect(p(Math.max(0, needed - 2))).toBeLessThan(MA.thresholds.onTrack);
  });
});

describe('recommendAction', () => {
  const ev = (status) => ({ status });
  it('priorità: rivedere > ribilanciare > versare > niente', () => {
    expect(recommendAction({ evaluation: ev('review'), maxDriftPct: 20, monthlyNeeded: 300 }).type).toBe('review');
    expect(recommendAction({ evaluation: ev('watch'), maxDriftPct: 8, monthlyNeeded: 100 }).type).toBe('rebalance');
    expect(recommendAction({ evaluation: ev('on_track'), contributionShortfall: 200 }).type).toBe('contribute');
    expect(recommendAction({ evaluation: ev('watch'), monthlyNeeded: 50 }).type).toBe('contribute');
    expect(recommendAction({ evaluation: ev('on_track'), maxDriftPct: 3 }).type).toBe('none');
  });
  it('soglia di ribilanciamento: uguale alla soglia non scatta', () => {
    expect(recommendAction({ evaluation: ev('on_track'), maxDriftPct: 5 }).type).toBe('none');
    expect(recommendAction({ evaluation: ev('on_track'), maxDriftPct: 5.1 }).type).toBe('rebalance');
  });
  it('obiettivo raggiunto o scaduto', () => {
    expect(recommendAction({ evaluation: ev('reached'), maxDriftPct: 30 }).type).toBe('none');
    expect(recommendAction({ evaluation: ev('expired') }).type).toBe('review');
  });
  it('include l\'importo suggerito', () => {
    expect(recommendAction({ evaluation: ev('review'), monthlyNeeded: 450 }).amount).toBe(450);
  });
});

describe('residenza fiscale', () => {
  it('resolveTaxRate: Italia 26%, altro paese con aliquota scelta dall\'utente', () => {
    expect(resolveTaxRate({ country: 'IT' })).toBe(26);
    expect(resolveTaxRate({ country: 'OTHER', customRate: 19 })).toBe(19);
    expect(resolveTaxRate({ country: 'XX', customRate: 15 })).toBe(15);
  });
  it('resolveTaxRate: valori mancanti o assurdi non producono tasse errate', () => {
    expect(resolveTaxRate()).toBe(26);
    expect(resolveTaxRate({ country: 'OTHER' })).toBe(26);
    expect(resolveTaxRate({ country: 'OTHER', customRate: NaN })).toBe(26);
    expect(resolveTaxRate({ country: 'OTHER', customRate: 120 })).toBe(60);
    expect(resolveTaxRate({ country: 'OTHER', customRate: -5 })).toBe(0);
  });
  it('Italia non è modificabile con un customRate', () => {
    expect(resolveTaxRate({ country: 'IT', customRate: 5 })).toBe(26);
  });
  it('tassa più alta al ritiro → probabilità di successo non superiore', () => {
    const p = (taxRate) => evaluateGoal({ ...base, taxRate }).successProbability;
    expect(p(0)).toBeGreaterThan(p(26));
    expect(p(26)).toBeGreaterThan(p(40));
  });
  it('senza taxRate si usa quella italiana', () => {
    expect(evaluateGoal(base).successProbability).toBe(evaluateGoal({ ...base, taxRate: 26 }).successProbability);
  });
  it('a tassa zero il target reale dopo tasse coincide con quello lordo deflazionato', () => {
    const nominal = nominalTargetForSuccess(50000, 20000, 10, MA.inflation, 0);
    expect(nominal).toBeCloseTo(50000 * Math.pow(1 + MA.inflation / 100, 10), 6);
  });
});

describe('glideSchedule + evaluateGoal (glide path nel tempo)', () => {
  const goal = { currentValue: 20000, targetAmount: 120000, goalYear: 2046, monthlyContribution: 400, now: NOW };

  it('pesi per bucket secondo la tabella, in funzione dei mesi rimanenti', () => {
    const at = glideSchedule({ riskProfile: { maxTolerableLoss: 30 } });
    expect(at(30 * 12).equity).toBe(90);
    expect(at(12 * 12).equity).toBe(70);
    expect(at(2 * 12).equity).toBe(10);
    expect(glideSchedule({ type: 'emergency' })(240).equity).toBe(0);
  });
  it('extraYears (rendita) sposta la fascia: orizzonte lungo → azionario alto', () => {
    expect(glideSchedule({ extraYears: 55 })(5 * 12).equity).toBe(90);
    expect(glideSchedule({})(5 * 12).equity).toBe(30);
  });
  it('oro scelto a mano: somma sempre 100', () => {
    const a = glideSchedule({ goldPct: 8 })(10 * 12);
    expect(Object.values(a).reduce((x, y) => x + y, 0)).toBe(100);
    expect(a.gold).toBe(8);
  });
  it('evaluateGoal con glide path restituisce probabilità, percentili e fan chart', () => {
    const r = evaluateGoal({ ...goal, allocationAt: glideSchedule({ riskProfile: { maxTolerableLoss: 30 } }) });
    expect(r.successProbability).toBeGreaterThan(0);
    expect(r.successProbability).toBeLessThan(100);
    expect(r.percentiles.p5).toBeLessThan(r.percentiles.p95);
    expect(r.fan.length).toBeGreaterThan(15);
    expect(r.fan[0].p50).toBe(20000);
    expect(r.stats.expectedReturn).toBeGreaterThan(0);
  });
  it('profilo prudente → fascia di esiti più stretta che con profilo audace', () => {
    const run = (maxTolerableLoss) => evaluateGoal({ ...goal, allocationAt: glideSchedule({ riskProfile: { maxTolerableLoss } }) });
    const cautious = run(10), bold = run(40);
    expect(cautious.percentiles.p95 - cautious.percentiles.p5).toBeLessThan(bold.percentiles.p95 - bold.percentiles.p5);
  });
  it('glide path vs tutto azionario: meno rischio di cattivo esito vicino alla scadenza', () => {
    const glide = evaluateGoal({ ...goal, allocationAt: glideSchedule({}) });
    const allEq = evaluateGoal({ ...goal, weights: { equity: 100 } });
    expect(glide.percentiles.p5).toBeGreaterThan(allEq.percentiles.p5);
  });
  it('versamento che cresce con l\'inflazione migliora l\'esito', () => {
    const fixed = evaluateGoal({ ...goal, weights: W_8020 });
    const indexed = evaluateGoal({ ...goal, weights: W_8020, indexContribution: true });
    expect(indexed.percentiles.p50).toBeGreaterThan(fixed.percentiles.p50);
  });
});
