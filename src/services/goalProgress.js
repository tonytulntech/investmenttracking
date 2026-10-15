/**
 * Avanzamento degli obiettivi dagli investimenti collegati (transazioni con `goalId`).
 * Il valore è in € di oggi ai prezzi correnti; senza prezzo si usa il costo e lo si dichiara.
 */
import { useEffect, useMemo, useState } from 'react';
import { getTransactions, snapshotFromTransactions } from './localStorageService';
import { fetchMultiplePrices } from './priceService';

/** Quanto è stato raggiunto e quanto manca (€ di oggi). */
export function progressAmounts(targetAmount, value) {
  const done = Math.max(0, value);
  return {
    percent: targetAmount > 0 ? Math.min(100, (done / targetAmount) * 100) : 0,
    remaining: Math.max(0, targetAmount - done),
    reached: done >= targetAmount,
  };
}

/** Valori per obiettivo a partire da un elenco di transazioni e dai prezzi (pura, testabile). */
export function valuesByGoal(transactions, prices, goalIds) {
  const out = {};
  for (const id of goalIds) {
    const txs = transactions.filter(t => t.goalId === id);
    const snap = snapshotFromTransactions(txs, prices);
    out[id] = {
      hasPositions: snap.holdings.length > 0,
      value: snap.totalValue, invested: snap.totalInvested,
      unpriced: snap.unpriced.map(u => u.ticker),
    };
  }
  return out;
}

export function useGoalProgress(goals) {
  const ids = useMemo(() => goals.map(g => g.id), [goals]);
  const key = ids.join(',');
  const [state, setState] = useState({ status: 'loading', byGoal: {} });

  useEffect(() => {
    let alive = true;
    const txs = getTransactions().filter(t => t.goalId && ids.includes(t.goalId) && !t.isCash);
    const tickers = [...new Set(txs.map(t => t.ticker))];
    if (tickers.length === 0) { setState({ status: 'done', byGoal: valuesByGoal([], {}, ids) }); return undefined; }
    setState(s => ({ ...s, status: 'loading' }));
    const categories = Object.fromEntries(txs.map(t => [t.ticker, t.macroCategory]));
    fetchMultiplePrices(tickers, categories)
      .catch(() => ({}))
      .then(prices => { if (alive) setState({ status: 'done', byGoal: valuesByGoal(getTransactions(), prices ?? {}, ids) }); });
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
