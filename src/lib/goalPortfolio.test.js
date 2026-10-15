// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  unassignedTransactions, groupByTicker, suggestGoalForTicker, suggestBucket, bucketWeights, driftFromTarget, mergeByTicker,
} from './goalPortfolio';
import { snapshotFromTransactions, assignTransactionsToGoal, getTransactions } from '../services/localStorageService';

const tx = (over) => ({ id: Math.random().toString(36).slice(2), ticker: 'SWDA', name: 'iShares World', type: 'buy', quantity: 1, price: 100, date: '2026-01-10', macroCategory: 'ETF', ...over });
const goals = [{ id: 'g1', status: 'active' }, { id: 'g2', status: 'active' }];

describe('transazioni da assegnare', () => {
  it('senza goalId, o con un obiettivo cancellato, sono da assegnare; cash ed escluse no', () => {
    const list = [tx({ id: 'a' }), tx({ id: 'b', goalId: 'g1' }), tx({ id: 'c', goalId: 'gone' }),
      tx({ id: 'd', isCash: true, ticker: 'CASH' }), tx({ id: 'e', excludeFromStats: true }), tx({ id: 'f', type: 'dividend' })];
    expect(unassignedTransactions(list, goals).map(t => t.id)).toEqual(['a', 'c']);
  });
  it('raggruppa per titolo con conteggio e intervallo di date', () => {
    const g = groupByTicker([tx({ date: '2026-03-01' }), tx({ date: '2026-01-01' }), tx({ ticker: 'AGGH', name: 'Bond' })]);
    expect(g.map(x => x.ticker)).toEqual(['AGGH', 'SWDA']);
    expect(g[1]).toMatchObject({ count: 2, firstDate: '2026-01-01', lastDate: '2026-03-01' });
  });
});

describe('suggerimento di assegnazione (solo da ciò che ha già fatto lo studente)', () => {
  it('vince l\'obiettivo con più transazioni già assegnate di quel titolo', () => {
    const list = [tx({ goalId: 'g2' }), tx({ goalId: 'g2' }), tx({ goalId: 'g1' }), tx({ ticker: 'X', goalId: 'g1' })];
    expect(suggestGoalForTicker('SWDA', list, goals)).toBe('g2');
  });
  it('titolo mai assegnato con più obiettivi: nessun suggerimento', () => expect(suggestGoalForTicker('SWDA', [tx()], goals)).toBeNull());
  it('un solo obiettivo attivo: quello', () => expect(suggestGoalForTicker('SWDA', [], [goals[0]])).toBe('g1'));
  it('ignora assegnazioni a obiettivi che non esistono più', () => expect(suggestGoalForTicker('SWDA', [tx({ goalId: 'gone' })], goals)).toBeNull());
});

describe('suggestBucket', () => {
  it('classi chiare → alta confidenza', () => {
    expect(suggestBucket({ macroCategory: 'ETF', microCategory: 'Azionario Mondiale' })).toEqual({ bucket: 'equity', confidence: 'high' });
    expect(suggestBucket({ macroCategory: 'Azioni', microCategory: 'Technology' }).bucket).toBe('equity');
    expect(suggestBucket({ macroCategory: 'Monetario', microCategory: 'Fondi Monetari' }).bucket).toBe('cash');
    expect(suggestBucket({ macroCategory: 'ETC', microCategory: 'Oro' }).bucket).toBe('gold');
    expect(suggestBucket({ macroCategory: 'ETF', microCategory: 'Obbligazioni Governative Europa 1-3' }).bucket).toBe('bondShort');
  });
  it('obbligazioni senza durata esplicita, crypto, immobiliare: nessun suggerimento (sceglie lo studente)', () => {
    expect(suggestBucket({ macroCategory: 'ETF', microCategory: 'Obbligazioni Aggregate Mondo' })).toBeNull();
    expect(suggestBucket({ macroCategory: 'Crypto' })).toBeNull();
    expect(suggestBucket({ macroCategory: 'Immobiliare' })).toBeNull();
    expect(suggestBucket({})).toBeNull();
    expect(suggestBucket()).toBeNull();
  });
});

describe('pesi e scostamenti', () => {
  const holdings = [{ ticker: 'A', marketValue: 600 }, { ticker: 'B', marketValue: 300 }, { ticker: 'C', marketValue: 100 }];
  it('pesi per bucket, titoli senza bucket separati ma nel totale', () => {
    const r = bucketWeights(holdings, { A: 'equity', B: 'bondMedium' });
    expect(r.total).toBe(1000);
    expect(r.weights).toMatchObject({ equity: 60, bondMedium: 30, bondShort: 0 });
    expect(r.unclassified).toEqual({ value: 100, tickers: ['C'] });
  });
  it('bucket non valido = non classificato; portafoglio vuoto = tutti zero', () => {
    expect(bucketWeights(holdings, { A: 'crypto' }).unclassified.tickers).toEqual(['A', 'B', 'C']);
    const e = bucketWeights([], {});
    expect(e.total).toBe(0);
    expect(Object.values(e.weights).every(w => w === 0)).toBe(true);
  });
  it('scostamento in punti dal modello', () => {
    const d = driftFromTarget({ equity: 62, bondShort: 0, bondMedium: 28, cash: 10, gold: 0 }, { equity: 60, bondShort: 5, bondMedium: 30, cash: 5, gold: 0 });
    expect(d).toEqual({ equity: 2, bondShort: -5, bondMedium: -2, cash: 5, gold: 0 });
  });
  it('mergeByTicker unisce lo stesso titolo su più broker', () => {
    const m = mergeByTicker([
      { ticker: 'A', quantity: 2, totalCost: 200, marketValue: 220, unrealizedPL: 20, avgPrice: 100 },
      { ticker: 'A', quantity: 3, totalCost: 330, marketValue: 330, unrealizedPL: 0, avgPrice: 110 },
    ]);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ quantity: 5, totalCost: 530, marketValue: 550, unrealizedPL: 20 });
    expect(m[0].avgPrice).toBeCloseTo(106);
  });
});

describe('quote per obiettivo (stesso ETF in due obiettivi)', () => {
  beforeEach(() => localStorage.clear());
  it('le quote si attribuiscono all\'obiettivo e non si mescolano', () => {
    const all = [
      tx({ id: '1', goalId: 'g1', quantity: 10, price: 100 }),
      tx({ id: '2', goalId: 'g2', quantity: 5, price: 120 }),
      tx({ id: '3', goalId: 'g1', type: 'sell', quantity: 4, price: 110 }),
    ];
    const s1 = snapshotFromTransactions(all.filter(t => t.goalId === 'g1'), { SWDA: { price: 130 } });
    const s2 = snapshotFromTransactions(all.filter(t => t.goalId === 'g2'), { SWDA: { price: 130 } });
    expect(s1.holdings[0].quantity).toBe(6);
    expect(s1.holdings[0].marketValue).toBe(780);
    expect(s2.holdings[0].quantity).toBe(5);
    expect(s2.holdings[0].marketValue).toBe(650);
  });
  it('assignTransactionsToGoal: una scrittura, idempotente, riassegnabile e annullabile', () => {
    localStorage.setItem('investment_tracker_transactions', JSON.stringify([tx({ id: '1' }), tx({ id: '2' }), tx({ id: '3', goalId: 'g1' })]));
    expect(assignTransactionsToGoal(['1', '2'], 'g1')).toBe(2);
    expect(assignTransactionsToGoal(['1', '2', '3'], 'g1')).toBe(0);
    expect(getTransactions().every(t => t.goalId === 'g1')).toBe(true);
    expect(assignTransactionsToGoal(['1'], 'g2')).toBe(1);
    expect(getTransactions().find(t => t.id === '1').goalId).toBe('g2');
    expect(assignTransactionsToGoal(['1'], null)).toBe(1);
    expect('goalId' in getTransactions().find(t => t.id === '1')).toBe(false);
    expect(assignTransactionsToGoal(['nope'], 'g1')).toBe(0);
  });
  it('non perde nessun altro campo della transazione', () => {
    const original = tx({ id: '1', commission: 1.5, isin: 'IE00B4L5Y983', broker: 'Directa' });
    localStorage.setItem('investment_tracker_transactions', JSON.stringify([original]));
    assignTransactionsToGoal(['1'], 'g1');
    const saved = getTransactions()[0];
    expect(saved).toMatchObject({ commission: 1.5, isin: 'IE00B4L5Y983', broker: 'Directa', quantity: 1, goalId: 'g1' });
  });
});
