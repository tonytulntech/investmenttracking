import { describe, it, expect } from 'vitest';
import { baseAllocation, glidePathAllocation, withGold, bandFor, BUCKETS } from './glidePath';

const sum = (a) => BUCKETS.reduce((s, b) => s + a[b], 0);
const pick = (a) => [a.equity, a.bondShort, a.bondMedium, a.cash];

describe('baseAllocation — tabella §3.1', () => {
  it.each([
    [30, [90, 0, 10, 0]], [20.5, [90, 0, 10, 0]],
    [20, [80, 5, 15, 0]], [17, [80, 5, 15, 0]], [15.01, [80, 5, 15, 0]],
    [15, [70, 10, 20, 0]], [12, [70, 10, 20, 0]],
    [10, [60, 15, 25, 0]], [8, [60, 15, 25, 0]],
    [7, [45, 30, 25, 0]], [6, [45, 30, 25, 0]],
    [5, [30, 50, 20, 0]], [4, [30, 50, 20, 0]],
    [3, [10, 70, 0, 20]], [2, [10, 70, 0, 20]], [1.01, [10, 70, 0, 20]],
    [1, [0, 30, 0, 70]], [0.5, [0, 30, 0, 70]], [0, [0, 30, 0, 70]], [-3, [0, 30, 0, 70]],
  ])('%s anni → %j', (years, expected) => {
    expect(pick(baseAllocation(years))).toEqual(expected);
  });
});

describe('glidePathAllocation — profilo di rischio §3.2', () => {
  it('fondo emergenza: mai azionario, qualunque orizzonte o profilo', () => {
    for (const years of [0.5, 5, 30]) {
      expect(glidePathAllocation({ years, type: 'emergency', riskProfile: { maxTolerableLoss: 40 } }))
        .toEqual({ equity: 0, bondShort: 50, bondMedium: 0, cash: 50, gold: 0 });
    }
  });
  it('perdita tollerata 30% e reddito stabile: nessun aggiustamento', () => {
    expect(glidePathAllocation({ years: 12, riskProfile: { maxTolerableLoss: 30, incomeStability: 'stable' } }))
      .toEqual(baseAllocation(12));
  });
  it('10% → −20 punti di azionario sul bond breve; 20% → −10', () => {
    expect(pick(glidePathAllocation({ years: 12, riskProfile: { maxTolerableLoss: 10 } }))).toEqual([50, 30, 20, 0]);
    expect(pick(glidePathAllocation({ years: 12, riskProfile: { maxTolerableLoss: 20 } }))).toEqual([60, 20, 20, 0]);
  });
  it('40% → +10 di azionario preso dal bond medio', () => {
    expect(pick(glidePathAllocation({ years: 12, riskProfile: { maxTolerableLoss: 40 } }))).toEqual([80, 10, 10, 0]);
  });
  it('+10 senza bond medio sufficiente: prende da bond breve, poi liquidità', () => {
    // 2 anni: [10, 70, 0, 20] → +10 dal bond breve
    expect(pick(glidePathAllocation({ years: 2, riskProfile: { maxTolerableLoss: 40 } }))).toEqual([20, 60, 0, 20]);
    // meno di 1 anno: [0, 30, 0, 70] → +10 dal bond breve (30)
    expect(pick(glidePathAllocation({ years: 0.5, riskProfile: { maxTolerableLoss: 40 } }))).toEqual([10, 20, 0, 70]);
  });
  it('reddito variabile → −10 azionario aggiuntivi', () => {
    expect(pick(glidePathAllocation({ years: 12, riskProfile: { incomeStability: 'variable' } }))).toEqual([60, 20, 20, 0]);
  });
  it('rischio basso + reddito variabile si sommano (−30)', () => {
    expect(pick(glidePathAllocation({ years: 30, riskProfile: { maxTolerableLoss: 10, incomeStability: 'variable' } }))).toEqual([60, 30, 10, 0]);
  });
  it('non porta mai l\'azionario sotto zero', () => {
    const a = glidePathAllocation({ years: 2, riskProfile: { maxTolerableLoss: 10, incomeStability: 'variable' } });
    expect(a.equity).toBe(0);
    expect(sum(a)).toBe(100);
  });
  it('profilo sconosciuto o assente → nessun aggiustamento', () => {
    expect(glidePathAllocation({ years: 12, riskProfile: { maxTolerableLoss: 99 } })).toEqual(baseAllocation(12));
    expect(glidePathAllocation({ years: 12 })).toEqual(baseAllocation(12));
  });
  it('rendita: orizzonte di 60 anni → fascia > 20 anni (criterio di accettazione §19)', () => {
    expect(glidePathAllocation({ years: 60, type: 'income' }).equity).toBe(90);
  });
});

describe('proprietà generali', () => {
  const profiles = [
    {}, { maxTolerableLoss: 10 }, { maxTolerableLoss: 20 }, { maxTolerableLoss: 30 }, { maxTolerableLoss: 40 },
    { incomeStability: 'variable' }, { maxTolerableLoss: 10, incomeStability: 'variable' },
    { maxTolerableLoss: 40, incomeStability: 'variable' },
  ];
  it('somma sempre 100, nessuna quota negativa, nessuna non intera', () => {
    for (const rp of profiles) {
      for (let y = 40; y >= -1; y -= 0.25) {
        const a = glidePathAllocation({ years: y, riskProfile: rp });
        expect(sum(a)).toBe(100);
        for (const b of BUCKETS) {
          expect(a[b]).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(a[b])).toBe(true);
        }
      }
    }
  });
  it('l\'azionario non aumenta al ridursi dell\'orizzonte, per ogni profilo', () => {
    for (const rp of profiles) {
      let prev = Infinity;
      for (let y = 40; y >= 0; y -= 0.25) {
        const e = glidePathAllocation({ years: y, riskProfile: rp }).equity;
        expect(e).toBeLessThanOrEqual(prev);
        prev = e;
      }
    }
  });
  it('più prudente è il profilo, meno azionario a parità di orizzonte', () => {
    for (const y of [3, 6, 9, 12, 18, 25]) {
      const eq = [10, 20, 30, 40].map(l => glidePathAllocation({ years: y, riskProfile: { maxTolerableLoss: l } }).equity);
      for (let i = 1; i < eq.length; i++) expect(eq[i]).toBeGreaterThanOrEqual(eq[i - 1]);
    }
  });
});

describe('withGold', () => {
  it('0 → invariato, oro a 0', () => {
    const a = baseAllocation(12);
    expect(withGold(a, 0)).toEqual({ ...a, gold: 0 });
  });
  it('somma 100 per ogni quota tra 0 e 10 e ogni fascia', () => {
    for (const y of [30, 18, 12, 8, 6, 4, 2, 0.5]) {
      for (let g = 0; g <= 10; g++) {
        const a = withGold(baseAllocation(y), g);
        expect(sum(a)).toBe(100);
        expect(a.gold).toBe(g);
        for (const b of BUCKETS) expect(a[b]).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it('limita al 10% e ignora valori negativi', () => {
    expect(withGold(baseAllocation(12), 25).gold).toBe(10);
    expect(withGold(baseAllocation(12), -4).gold).toBe(0);
  });
  it('toglie l\'oro in proporzione dagli altri bucket', () => {
    const a = withGold(baseAllocation(12), 10); // [70,10,20,0] → 10 punti
    expect(a.equity).toBeLessThan(70);
    expect(a.equity).toBeGreaterThan(60);
    expect(a.cash).toBe(0);
  });
});

describe('bandFor', () => {
  it('cambia solo attraversando una soglia', () => {
    expect(bandFor(21)).toBe(0);
    expect(bandFor(20)).toBe(1);
    expect(bandFor(19.9)).toBe(1);
    expect(bandFor(5.01)).toBe(bandFor(5.5));
    expect(bandFor(5)).not.toBe(bandFor(5.01));
  });
});
