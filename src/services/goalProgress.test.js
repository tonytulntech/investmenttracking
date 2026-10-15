import { describe, it, expect } from 'vitest';
import { progressAmounts, valuesByGoal } from './goalProgress';

describe('progressAmounts', () => {
  it('percentuale e quanto manca', () => {
    expect(progressAmounts(60000, 15000)).toEqual({ percent: 25, remaining: 45000, reached: false });
  });
  it('oltre l\'obiettivo: 100% e nulla manca', () => {
    expect(progressAmounts(60000, 70000)).toEqual({ percent: 100, remaining: 0, reached: true });
  });
  it('valore negativo o obiettivo 0 non producono numeri strani', () => {
    expect(progressAmounts(1000, -5)).toMatchObject({ percent: 0, remaining: 1000 });
    expect(progressAmounts(0, 0).percent).toBe(0);
  });
});

describe('valuesByGoal', () => {
  const tx = (id, goalId, qty, price, over = {}) => ({ id, ticker: 'SWDA', name: 'World', type: 'buy', quantity: qty, price, date: '2026-01-01', macroCategory: 'ETF', goalId, ...over });
  it('separa le quote per obiettivo e valorizza ai prezzi correnti', () => {
    const r = valuesByGoal([tx('1', 'g1', 10, 100), tx('2', 'g2', 5, 100), tx('3', undefined, 99, 1)], { SWDA: { price: 120 } }, ['g1', 'g2', 'g3']);
    expect(r.g1).toMatchObject({ hasPositions: true, value: 1200, invested: 1000 });
    expect(r.g2).toMatchObject({ hasPositions: true, value: 600, invested: 500 });
    expect(r.g3).toMatchObject({ hasPositions: false, value: 0 });
  });
  it('senza prezzo usa il costo e lo dichiara', () => {
    const r = valuesByGoal([tx('1', 'g1', 10, 100)], {}, ['g1']);
    expect(r.g1.value).toBe(1000);
    expect(r.g1.unpriced).toEqual(['SWDA']);
  });
});
