import { describe, it, expect } from 'vitest';
import {
  calculateDeviation, calculateMicroDeviation, calculateSmartPurchases,
  calculatePACCalendar, calculatePICAmounts, checkRebalancingAlerts,
  calculate12MonthWholeUnitCalendar,
} from './rebalanceEngine';

const holdings = [
  { ticker: 'SWDA', macroCategory: 'Azionario',        marketValue: 8000, currentPrice: 80, quantity: 100 },
  { ticker: 'IBGS', macroCategory: 'Obbligazionario',  marketValue: 2000, currentPrice: 100, quantity: 20 },
  { ticker: 'CASH', isCash: true,                      marketValue: 5000, currentPrice: 1, quantity: 5000 },
];

const strategy = {
  assetAllocation: { Azionario: 60, Obbligazionario: 40, Immobiliare: 0 },
  monthlyInvestment: 1000,
};

describe('calculateDeviation', () => {
  it('calcola le percentuali escludendo la liquidità', () => {
    const [equity, bond] = calculateDeviation(holdings, strategy);
    expect(equity.current).toBe(80);   // 8000 / 10000, la cassa non conta
    expect(bond.current).toBe(20);
  });

  it('calcola lo scostamento e l importo da correggere', () => {
    const [equity] = calculateDeviation(holdings, strategy);
    expect(equity.difference).toBe(20);
    expect(equity.amountDifference).toBe(2000);
  });

  it('scarta le classi con target zero', () => {
    const result = calculateDeviation(holdings, strategy);
    expect(result.map(d => d.assetClass)).toEqual(['Azionario', 'Obbligazionario']);
  });

  it('classifica lo stato per fasce', () => {
    const balanced = calculateDeviation(holdings, {
      assetAllocation: { Azionario: 79, Obbligazionario: 21 },
    });
    expect(balanced[0].status).toBe('ok');
    expect(calculateDeviation(holdings, strategy)[0].status).toBe('alert');
  });

  it('non divide per zero su un portafoglio vuoto', () => {
    const result = calculateDeviation([], strategy);
    expect(result[0].current).toBe(0);
    expect(result[0].difference).toBe(-60);
  });
});

describe('calculateSmartPurchases', () => {
  const deviations = [
    { assetClass: 'Azionario',       current: 80, target: 60, difference: 20 },
    { assetClass: 'Obbligazionario', current: 20, target: 40, difference: -20 },
  ];

  it('in modalità frazionabile manda tutto il budget sul sottopeso', () => {
    const result = calculateSmartPurchases(holdings, deviations, 1000, true);
    expect(result).toHaveLength(1);
    expect(result[0].assetClass).toBe('Obbligazionario');
    expect(result[0].amount).toBe(1000);
    expect(result[0].percentageOfBudget).toBe(100);
  });

  it('ripartisce proporzionalmente fra più classi sottopesate', () => {
    const result = calculateSmartPurchases(holdings, [
      { assetClass: 'A', target: 50, difference: -30 },
      { assetClass: 'B', target: 50, difference: -10 },
    ], 1000, true);
    expect(result[0].amount).toBe(750);
    expect(result[1].amount).toBe(250);
  });

  it('ignora scostamenti entro i 2 punti', () => {
    const result = calculateSmartPurchases(holdings, [
      { assetClass: 'A', target: 50, difference: -1.5 },
    ], 1000, true);
    expect(result).toEqual([]);
  });

  it('a quote intere non supera mai il budget', () => {
    const result = calculateSmartPurchases(holdings, deviations, 1000, false);
    expect(result.spent).toBeLessThanOrEqual(1000);
    expect(result.purchases[0].shares).toBe(10); // 1000 / 100 €
    expect(result.remaining).toBe(0);
  });

  it('a quote intere senza sottopesi compra secondo il target', () => {
    const result = calculateSmartPurchases(holdings, [
      { assetClass: 'Azionario', target: 100, current: 100, difference: 0 },
    ], 1000, false);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].shares).toBe(12); // 1000 / 80 €
  });
});

describe('calculatePICAmounts', () => {
  it('quantifica quanto manca a ogni classe sottopesata', () => {
    const result = calculatePICAmounts([
      { assetClass: 'Obbligazionario', current: 20, target: 40, difference: -20 },
    ], holdings);
    expect(result[0].amountNeeded).toBe(2000);
    expect(result[0].currentValue).toBe(2000);
    expect(result[0].targetValue).toBe(4000);
  });

  it('ordina dal fabbisogno maggiore', () => {
    const result = calculatePICAmounts([
      { assetClass: 'A', current: 10, target: 20, difference: -10 },
      { assetClass: 'B', current: 10, target: 40, difference: -30 },
    ], holdings);
    expect(result[0].assetClass).toBe('B');
  });
});

describe('calculatePACCalendar', () => {
  const now = new Date(2026, 0, 15);

  it('restituisce sei mesi', () => {
    const calendar = calculatePACCalendar([
      { assetClass: 'Obbligazionario', target: 40, difference: -20 },
    ], strategy, now);
    expect(calendar).toHaveLength(6);
    expect(calendar[0].total).toBe(1000);
  });

  it('senza PAC non produce calendario', () => {
    expect(calculatePACCalendar([], { monthlyInvestment: 0 }, now)).toEqual([]);
  });

  it('se è tutto in equilibrio versa secondo i target', () => {
    const calendar = calculatePACCalendar([
      { assetClass: 'Azionario', target: 60, difference: 0 },
      { assetClass: 'Obbligazionario', target: 40, difference: 0 },
    ], strategy, now);
    expect(calendar[0].purchases.map(p => p.amount)).toEqual([600, 400]);
  });
});

describe('checkRebalancingAlerts', () => {
  const big = [{ assetClass: 'Azionario', difference: 20 }];
  const small = [{ assetClass: 'Azionario', difference: 1 }];
  const now = new Date(2026, 0, 1);

  it('segnala scostamenti da 5 punti in su', () => {
    expect(checkRebalancingAlerts(big, null, now)[0].type).toBe('deviation');
    expect(checkRebalancingAlerts(small, null, now)).toEqual([]);
  });

  it('segnala il ribilanciamento annuale dopo 12 mesi', () => {
    const alerts = checkRebalancingAlerts(small, new Date(2024, 0, 1).toISOString(), now);
    expect(alerts.some(a => a.title.includes('Annuale'))).toBe(true);
  });

  it('segnala quello semestrale solo se ci sono scostamenti', () => {
    const lastYear = new Date(2025, 5, 1).toISOString();
    expect(checkRebalancingAlerts(big, lastYear, now).some(a => a.type === 'time')).toBe(true);
    expect(checkRebalancingAlerts(small, lastYear, now).some(a => a.type === 'time')).toBe(false);
  });

  it('non segnala nulla su un ribilanciamento recente e allineato', () => {
    expect(checkRebalancingAlerts(small, new Date(2025, 11, 1).toISOString(), now)).toEqual([]);
  });
});

describe('calculateMicroDeviation', () => {
  it('marca come fuori strategia ciò che non ha target', () => {
    const result = calculateMicroDeviation(holdings, { microAllocation: {} });
    expect(result.every(d => d.isOutOfStrategy)).toBe(true);
  });

  it('esclude la liquidità dal totale', () => {
    const result = calculateMicroDeviation(holdings, { microAllocation: {} });
    expect(result.reduce((s, d) => s + d.current, 0)).toBeCloseTo(100, 1);
  });
});

describe('calculate12MonthWholeUnitCalendar', () => {
  it('accumula il resto non speso sul mese successivo', () => {
    const calendar = calculate12MonthWholeUnitCalendar(
      [{ ticker: 'TEST1', microCategory: 'Azionario Mondo', currentPrice: 80, quantity: 1 }],
      { microAllocation: { 'Azionario Mondo': 100 } },
      100,
      new Date(2026, 0, 1),
    );
    expect(calendar).toHaveLength(12);
    expect(calendar[0].purchases[0].units).toBe(1);
    expect(calendar[0].remainder).toBe(20);
    expect(calendar[1].budget).toBe(120);
  });

  it('non produce calendario senza budget', () => {
    expect(calculate12MonthWholeUnitCalendar([], { microAllocation: {} }, 0)).toEqual([]);
  });
});
