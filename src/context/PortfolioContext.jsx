import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getPortfolioConfig } from '../services/portfolioConfigService';

const KEY = 'inv_selected_portfolio_v1';
export const ALL_PORTFOLIOS = 'all';

const PortfolioContext = createContext({
  selectedPortfolioId: ALL_PORTFOLIOS,
  setSelectedPortfolioId: () => {},
  portfolios: [],
  refreshPortfolios: () => {},
  filterHoldings: (h) => h,
  filterTickers: (t) => t,
});

export function PortfolioProvider({ children }) {
  const [selectedPortfolioId, setSelectedPortfolioIdState] = useState(
    () => localStorage.getItem(KEY) || ALL_PORTFOLIOS,
  );
  const [portfolios, setPortfolios] = useState(() => getPortfolioConfig().portfolios || []);
  const [assignments, setAssignments] = useState(() => getPortfolioConfig().assignments || {});

  const refreshPortfolios = useCallback(() => {
    const cfg = getPortfolioConfig();
    setPortfolios(cfg.portfolios || []);
    setAssignments(cfg.assignments || {});
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || e.key.startsWith('inv_portfolio_config')) refreshPortfolios();
    };
    window.addEventListener('storage', onStorage);
    const iv = setInterval(refreshPortfolios, 3000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(iv); };
  }, [refreshPortfolios]);

  const setSelectedPortfolioId = useCallback((id) => {
    const val = id || ALL_PORTFOLIOS;
    localStorage.setItem(KEY, val);
    setSelectedPortfolioIdState(val);
  }, []);

  const filterHoldings = useCallback((holdings) => {
    if (!holdings || selectedPortfolioId === ALL_PORTFOLIOS) return holdings;
    return holdings.filter(h => assignments[h.holdingKey ?? h.ticker] === selectedPortfolioId);
  }, [selectedPortfolioId, assignments]);

  const filterTickers = useCallback((tickers) => {
    if (!tickers || selectedPortfolioId === ALL_PORTFOLIOS) return tickers;
    return tickers.filter(t => assignments[t] === selectedPortfolioId);
  }, [selectedPortfolioId, assignments]);

  return (
    <PortfolioContext.Provider value={{
      selectedPortfolioId, setSelectedPortfolioId,
      portfolios, refreshPortfolios,
      assignments,
      filterHoldings, filterTickers,
    }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function useSelectedPortfolio() {
  return useContext(PortfolioContext);
}
