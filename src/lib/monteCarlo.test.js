import { describe, it, expect } from 'vitest';
import {
  runMonteCarlo, buildHistogram, buildPathChartData, mulberry32, percentileOf, PERCENTILES,
} from './monteCarlo';

const base = {
  initialInvestment: 10000,
  monthlyContribution: 500,
  years: 10,
  expectedReturn: 7,
  volatility: 15,
  targetAmount: 100000,
  simulations: 200,
  seed: 42,
};

describe('mulberry32', () => {
  it('produce la stessa sequenza a parità di seed', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('resta nell intervallo [0,1)', () => {
    const rand = mulberry32(1);
    for (let i = 0; i < 500; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('percentileOf', () => {
  it('legge dagli estremi senza sforare', () => {
    const sorted = [1, 2, 3, 4, 5];
    expect(percentileOf(sorted, 0)).toBe(1);
    expect(percentileOf(sorted, 100)).toBe(5);
  });

  it('restituisce 0 su array vuoto', () => {
    expect(percentileOf([], 50)).toBe(0);
  });
});

describe('runMonteCarlo', () => {
  it('è deterministico a parità di seed', () => {
    const a = runMonteCarlo(base);
    const b = runMonteCarlo(base);
    expect(a.percentiles).toEqual(b.percentiles);
    expect(a.successProbability).toBe(b.successProbability);
  });

  it('cambia risultato al cambiare del seed', () => {
    const a = runMonteCarlo(base);
    const b = runMonteCarlo({ ...base, seed: 99 });
    expect(a.percentiles.p50).not.toBe(b.percentiles.p50);
  });

  it('a volatilità zero coincide con la capitalizzazione composta', () => {
    const result = runMonteCarlo({
      initialInvestment: 1000, monthlyContribution: 100, years: 2,
      expectedReturn: 6, volatility: 0, simulations: 5, seed: 1,
    });

    const monthlyRate = 6 / 12 / 100;
    let expected = 1000;
    for (let m = 0; m < 24; m++) expected = (expected + 100) * (1 + monthlyRate);

    PERCENTILES.forEach(p => {
      expect(result.percentiles[`p${p}`]).toBeCloseTo(expected, 6);
    });
  });

  it('somma correttamente i contributi totali', () => {
    const result = runMonteCarlo(base);
    expect(result.totalContributions).toBe(10000 + 500 * 120);
  });

  it('restituisce percentili ordinati', () => {
    const { percentiles } = runMonteCarlo(base);
    expect(percentiles.p5).toBeLessThanOrEqual(percentiles.p25);
    expect(percentiles.p25).toBeLessThanOrEqual(percentiles.p50);
    expect(percentiles.p50).toBeLessThanOrEqual(percentiles.p75);
    expect(percentiles.p75).toBeLessThanOrEqual(percentiles.p95);
  });

  it('dà probabilità 100% su un obiettivo irrisorio e 0% su uno irraggiungibile', () => {
    expect(runMonteCarlo({ ...base, targetAmount: 1 }).successProbability).toBe(100);
    expect(runMonteCarlo({ ...base, targetAmount: 1e12 }).successProbability).toBe(0);
  });

  it('restituisce null come probabilità se non c è un obiettivo', () => {
    expect(runMonteCarlo({ ...base, targetAmount: 0 }).successProbability).toBeNull();
  });

  it('produce una fascia per ogni mese, che parte dal capitale iniziale', () => {
    const result = runMonteCarlo(base);
    expect(result.bands).toHaveLength(121);
    expect(result.bands[0].month).toBe(0);
    PERCENTILES.forEach(p => expect(result.bands[0][`p${p}`]).toBe(10000));
  });

  it('salta le fasce con computeBands false', () => {
    const result = runMonteCarlo({ ...base, computeBands: false });
    expect(result.bands).toEqual([]);
    expect(result.percentiles.p50).toBeGreaterThan(0);
  });

  it('limita le traiettorie campione al numero di simulazioni', () => {
    const result = runMonteCarlo({ ...base, simulations: 5, samplePaths: 20 });
    expect(result.samplePaths).toHaveLength(5);
    expect(result.samplePaths[0]).toHaveLength(121);
  });

  it('ricava le ipotesi da un allocazione per bucket', () => {
    const result = runMonteCarlo({
      ...base, expectedReturn: undefined, volatility: undefined,
      allocation: { equity: 60, bondShort: 10, bondMedium: 30, cash: 0, gold: 0 },
    });
    expect(result.assumptions.expectedReturn).toBeGreaterThan(0);
    expect(result.assumptions.volatility).toBeGreaterThan(0);
    expect(result.assumptions.volatility).toBeLessThan(17);
  });

  it('rifiuta una chiamata senza ipotesi', () => {
    expect(() => runMonteCarlo({ years: 5 })).toThrow(/expectedReturn/);
  });
});

describe('buildHistogram', () => {
  it('distribuisce tutti i valori e le frequenze sommano a 100', () => {
    const { finalValues } = runMonteCarlo(base);
    const histogram = buildHistogram(finalValues, 10);
    expect(histogram).toHaveLength(10);
    expect(histogram.reduce((s, b) => s + b.count, 0)).toBe(finalValues.length);
    expect(histogram.reduce((s, b) => s + b.frequency, 0)).toBeCloseTo(100, 6);
  });

  it('gestisce un insieme senza dispersione', () => {
    expect(buildHistogram(Float64Array.from([5, 5, 5]), 10)).toEqual([]);
    expect(buildHistogram(Float64Array.from([]))).toEqual([]);
  });
});

describe('buildPathChartData', () => {
  it('unisce fasce e traiettorie in una riga per mese', () => {
    const result = runMonteCarlo({ ...base, years: 1, samplePaths: 3 });
    const data = buildPathChartData(result);
    expect(data).toHaveLength(13);
    expect(data[0]).toHaveProperty('path0');
    expect(data[0]).toHaveProperty('p50');
    expect(data[12].path2).toBe(result.samplePaths[2][12]);
  });
});
