import { describe, it, expect } from 'vitest';
import {
  portfolioAssumptions, correlation, EXPECTED_RETURN, VOLATILITY, ASSUMPTIONS_META,
} from './marketAssumptions';
import { bucketsToMacro, normalizeAllocation, BUCKET_KEYS, BUCKET_TO_MACRO } from './buckets';

describe('correlation', () => {
  it('è simmetrica e vale 1 sulla diagonale', () => {
    expect(correlation('equity', 'equity')).toBe(1);
    expect(correlation('equity', 'bondMedium')).toBe(correlation('bondMedium', 'equity'));
  });

  it('è definita per ogni coppia di bucket', () => {
    BUCKET_KEYS.forEach(a => BUCKET_KEYS.forEach(b => {
      expect(() => correlation(a, b)).not.toThrow();
    }));
  });

  it('segnala una coppia sconosciuta', () => {
    expect(() => correlation('equity', 'inesistente')).toThrow(/Correlazione/);
  });
});

describe('portfolioAssumptions', () => {
  it('su un solo bucket restituisce i suoi parametri', () => {
    const result = portfolioAssumptions({ equity: 100 });
    expect(result.expectedReturn).toBeCloseTo(EXPECTED_RETURN.equity, 2);
    expect(result.volatility).toBeCloseTo(VOLATILITY.equity, 2);
  });

  it('interpola linearmente il rendimento atteso', () => {
    const result = portfolioAssumptions({ equity: 50, cash: 50 });
    expect(result.expectedReturn)
      .toBeCloseTo((EXPECTED_RETURN.equity + EXPECTED_RETURN.cash) / 2, 2);
  });

  it('la diversificazione riduce la volatilità sotto la media pesata', () => {
    const { volatility } = portfolioAssumptions({ equity: 50, bondMedium: 50 });
    expect(volatility).toBeLessThan((VOLATILITY.equity + VOLATILITY.bondMedium) / 2);
  });

  it('non dipende dalla scala dei pesi', () => {
    expect(portfolioAssumptions({ equity: 60, cash: 40 }))
      .toEqual(portfolioAssumptions({ equity: 6, cash: 4 }));
  });

  it('gestisce un allocazione vuota', () => {
    expect(portfolioAssumptions({})).toEqual({ expectedReturn: 0, volatility: 0 });
  });

  it('i valori sono ancora placeholder da validare', () => {
    expect(ASSUMPTIONS_META.validated).toBe(false);
  });
});

describe('bucketsToMacro', () => {
  it('somma i due bucket obbligazionari in un unica macro-categoria', () => {
    const macro = bucketsToMacro({ equity: 60, bondShort: 15, bondMedium: 25 });
    expect(macro.bond).toBe(40);
    expect(macro.equity).toBe(60);
  });

  it('mappa l oro su commodity', () => {
    expect(bucketsToMacro({ gold: 10 }).commodity).toBe(10);
    expect(BUCKET_TO_MACRO.gold).toBe('commodity');
  });

  it('conserva il totale', () => {
    const allocation = { equity: 70, bondShort: 10, bondMedium: 10, cash: 5, gold: 5 };
    const macro = bucketsToMacro(allocation);
    expect(Object.values(macro).reduce((s, v) => s + v, 0)).toBe(100);
  });

  it('tratta i bucket mancanti come zero', () => {
    expect(bucketsToMacro({}).equity).toBe(0);
    expect(bucketsToMacro(null).bond).toBe(0);
  });
});

describe('normalizeAllocation', () => {
  it('riporta a 100 un allocazione sbilanciata', () => {
    const result = normalizeAllocation({ equity: 60, cash: 60 });
    expect(BUCKET_KEYS.reduce((s, k) => s + result[k], 0)).toBeCloseTo(100, 6);
  });

  it('assorbe l arrotondamento sul bucket maggiore', () => {
    const result = normalizeAllocation({ equity: 1, bondShort: 1, bondMedium: 1 });
    expect(BUCKET_KEYS.reduce((s, k) => s + result[k], 0)).toBeCloseTo(100, 6);
  });

  it('azzera i pesi negativi', () => {
    expect(normalizeAllocation({ equity: 100, cash: -20 }).cash).toBe(0);
  });

  it('su input vuoto restituisce tutti zeri', () => {
    const result = normalizeAllocation({});
    expect(BUCKET_KEYS.every(k => result[k] === 0)).toBe(true);
  });
});
