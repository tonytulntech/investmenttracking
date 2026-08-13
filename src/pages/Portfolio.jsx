import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, ArrowUpDown, Wallet } from 'lucide-react';
import { Blur } from '../context/PrivacyContext';
import { calculatePortfolio, getTransactions, portfolioSnapshot } from '../services/localStorageService';
import { fetchMultiplePrices } from '../services/priceService';
import { getCachedPrices, cachePrices, clearPriceCache } from '../services/priceCache';
import { calculateAnnualTERCost, getTERBadgeColor } from '../services/terDetectionService';
import { getDividendInfo } from '../data/dividendData';
import { getStockDefaults } from '../data/stockDividendData';
import AllocationDonut from '../components/AllocationDonut';
import { classifyHolding } from '../services/classificationService';
import { isCrypto } from '../services/coinGecko';
import { calculateXIRR } from '../services/twrrService';

function Portfolio() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [priceCache, setPriceCache] = useState(() => {
    // Initialize price cache from localStorage using priceCache service
    const cached = getCachedPrices();
    return cached || {};
  }); // Cache of current prices by ticker
  const [filteredPortfolio, setFilteredPortfolio] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('marketValue');
  const [sortOrder, setSortOrder] = useState('desc');
  const [twrr, setTwrr] = useState(null);
  const [realizedPL, setRealizedPL] = useState(0);

  // Get TER from the most recent transaction for a ticker (instead of cache)
  const getTERFromTransactions = (ticker) => {
    const transactions = getTransactions();

    // Filter transactions for this ticker and sort by date (most recent first)
    const tickerTransactions = transactions
      .filter(tx => tx.ticker === ticker)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (tickerTransactions.length === 0) {
      return null;
    }

    // Get TER from most recent transaction
    const mostRecent = tickerTransactions[0];

    console.log(`🔍 TER lookup for ${ticker}:`, {
      transactionDate: mostRecent.date,
      ter: mostRecent.ter,
      terType: typeof mostRecent.ter,
      allFields: Object.keys(mostRecent)
    });

    // Only return TER if it's explicitly set (not null/undefined)
    // Convert to number if it's a string
    if (mostRecent.ter !== null && mostRecent.ter !== undefined && mostRecent.ter !== '') {
      const terValue = typeof mostRecent.ter === 'string' ? parseFloat(mostRecent.ter) : mostRecent.ter;
      const finalTER = !isNaN(terValue) ? terValue : null;
      console.log(`✅ TER found for ${ticker}: ${finalTER}%`);
      return finalTER;
    }

    console.log(`❌ No TER found for ${ticker}`);
    return null;
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [portfolio, searchTerm, filterCategory, sortBy, sortOrder]);

  const loadPortfolio = async () => {
    try {
      setLoading(true);

      // If we have cached prices, use them immediately to show data faster
      const holdings = calculatePortfolio();
      setRealizedPL(calculatePortfolio._lastRealizedPL || 0);
      if (holdings.length > 0 && Object.keys(priceCache).length > 0) {
        console.log('⚡ Using cached prices for instant display');
        const quickPortfolio = calculatePortfolioWithPrices(holdings, priceCache);
        setPortfolio(quickPortfolio);
        setLoading(false);
      }

      // Then fetch fresh prices in the background
      await updatePrices();
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePortfolioWithPrices = (holdings, prices) => {
    // Calculate portfolio with given prices (from cache or fresh fetch)
    return holdings.map(holding => {
      // For Cash: price is always 1, no price change, ROI = 0, no TER
      if (holding.isCash) {
        const marketValue = holding.totalCost;
        return {
          ...holding,
          currentPrice: 1,
          marketValue,
          totalCost: marketValue,
          unrealizedPL: 0,
          roi: 0,
          dayChange: 0,
          dayChangePercent: 0,
          ter: null,
          annualTERCost: 0
        };
      }

      // For other assets: use provided price data
      const priceData = prices[holding.ticker];
      const currentPrice = priceData?.price || holding.avgPrice;

      const marketValue = currentPrice * holding.quantity;
      const totalCost = holding.avgPrice * holding.quantity;
      const unrealizedPL = marketValue - totalCost;
      const roi = totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0;

      // Get TER from transactions (cryptocurrencies don't have TER)
      const isCryptoAsset = isCrypto(holding.ticker) || holding.category === 'Crypto';
      const ter = isCryptoAsset ? null : getTERFromTransactions(holding.ticker);
      const annualTERCost = ter ? calculateAnnualTERCost(marketValue, ter) : 0;

      // Dividend yield: ETF → DB yield%, azioni → DPS/price*100
      const etfDiv   = getDividendInfo(holding.ticker);
      const stockDiv = getStockDefaults(holding.ticker);
      let dividendYield = null;
      if (etfDiv?.yield > 0) {
        dividendYield = etfDiv.yield;
      } else if (stockDiv?.dividendPerShare > 0 && currentPrice > 0) {
        dividendYield = (stockDiv.dividendPerShare / currentPrice) * 100;
      }
      const annualDividend = dividendYield != null ? (marketValue * dividendYield / 100) : null;

      return {
        ...holding,
        currentPrice,
        marketValue,
        totalCost,
        unrealizedPL,
        roi,
        dayChange: priceData?.change || 0,
        dayChangePercent: priceData?.changePercent || 0,
        ter,
        annualTERCost,
        dividendYield,
        annualDividend
      };
    });
  };

  const updatePrices = async (forceFlush = false) => {
    if (forceFlush) clearPriceCache();
    setRefreshing(true);

    // Usa portfolioSnapshot per calcolo unificato (commissioni, excludeFromStats)
    const snap = portfolioSnapshot({});
    if (snap.holdings.length === 0) {
      setPortfolio([]);
      setRealizedPL(0);
      setRefreshing(false);
      return;
    }

    const tickers = [...new Set(snap.holdings.map(h => h.ticker))];
    const categoriesMap = snap.holdings.reduce((acc, h) => { acc[h.ticker] = h.macroCategory; return acc; }, {});
    const prices = tickers.length > 0 ? await fetchMultiplePrices(tickers, categoriesMap) : {};

    // Aggiorna cache prezzi condivisa
    const newPriceCache = { ...priceCache, ...prices };
    setPriceCache(newPriceCache);
    cachePrices(newPriceCache);

    // Ricalcola snapshot con prezzi aggiornati
    const freshSnap = portfolioSnapshot(newPriceCache);
    setRealizedPL(freshSnap.realizedPL);

    // Aggiungi TER e yield per la visualizzazione tabella
    const updatedPortfolio = freshSnap.holdings.map(h => {
      const isCryptoAsset = isCrypto(h.ticker) || h.macroCategory === 'Crypto';
      const ter = isCryptoAsset ? null : getTERFromTransactions(h.ticker);
      const annualTERCost = ter ? calculateAnnualTERCost(h.marketValue, ter) : 0;
      const etfDiv   = getDividendInfo(h.ticker);
      const stockDiv = getStockDefaults(h.ticker);
      let dividendYield = null;
      if (etfDiv?.yield > 0) dividendYield = etfDiv.yield;
      else if (stockDiv?.dividendPerShare > 0 && h.currentPrice > 0)
        dividendYield = (stockDiv.dividendPerShare / h.currentPrice) * 100;
      const annualDividend = dividendYield != null ? h.marketValue * dividendYield / 100 : null;
      return { ...h, ter, annualTERCost, dividendYield, annualDividend };
    });

    setPortfolio(updatedPortfolio);

    // Calcola TWRR usando tutti i depositi/prelievi e il valore totale attuale (incluso cash)
    const totalValueInclCash = updatedPortfolio.reduce((sum, h) => sum + (h.marketValue || 0), 0);
    const allTx = getTransactions();
    const twrrResult = calculateXIRR(allTx, totalValueInclCash);
    setTwrr(twrrResult);

    setRefreshing(false);

    // TER auto-fetching removed - TER now comes from cache only (manually entered by user)
  };

  const applyFiltersAndSort = () => {
    let filtered = [...portfolio];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(h =>
        h.ticker.toLowerCase().includes(term) ||
        h.name.toLowerCase().includes(term) ||
        h.isin.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(h => h.category === filterCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredPortfolio(filtered);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const categories = ['all', ...new Set(portfolio.map(h => h.category))];

  // Summary statistics EXCLUDING cash
  const portfolioWithoutCash = filteredPortfolio.filter(h => !h.isCash && h.macroCategory !== 'Cash');

  const summary = {
    totalValue: portfolioWithoutCash.reduce((sum, h) => sum + h.marketValue, 0),
    totalCost: portfolioWithoutCash.reduce((sum, h) => sum + h.totalCost, 0),
    totalPL: portfolioWithoutCash.reduce((sum, h) => sum + h.unrealizedPL, 0),
    totalAnnualTERCost: portfolioWithoutCash.reduce((sum, h) => sum + (h.annualTERCost || 0), 0)
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1rem 3rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 320, flexDirection: 'column', gap: 12,
        }}>
          <RefreshCw size={36} style={{ color: 'var(--text-3)', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Caricamento portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1rem 3rem' }}>

      {/* Header allineato a Dashboard (page-title + refresh-btn con label mobile-hidden) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.75rem', paddingTop: '0.5rem', gap: 12,
      }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            Portfolio
          </h1>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
            {portfolio.length} {portfolio.length === 1 ? 'asset' : 'asset'} in totale
          </span>
        </div>
        {portfolio.length > 0 && (
          <button
            onClick={() => updatePrices(true)}
            disabled={refreshing}
            aria-label="Aggiorna prezzi"
            className="refresh-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: 'var(--surface-2)', color: 'var(--text-1)',
              border: '1px solid var(--border)',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              opacity: refreshing ? 0.6 : 1, flexShrink: 0,
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span className="refresh-label">{refreshing ? 'Aggiornamento…' : 'Aggiorna prezzi'}</span>
          </button>
        )}
      </div>

      {portfolio.length === 0 ? (
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '3rem 1.5rem', textAlign: 'center',
        }}>
          <Wallet size={44} style={{ color: 'var(--text-3)', margin: '0 auto 12px', display: 'block' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 6px' }}>
            Nessun asset nel portfolio
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', margin: '0 0 20px' }}>
            Aggiungi una transazione per iniziare a tracciare i tuoi investimenti
          </p>
          <a href="/transactions/new" className="btn-primary" style={{ display: 'inline-flex' }}>
            Aggiungi Transazione
          </a>
        </div>
      ) : (
        <>
          {/* Allocazione — stesso donut unificato della Dashboard
              (Ruolo / Asset Class / Fattore, scoping per portafoglio, drilldown) */}
          <div style={{ marginBottom: '1rem' }}>
            <AllocationDonut holdings={portfolio} />
          </div>

          {/* Filters */}
          <div className="card">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca ticker, nome o ISIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>

              {/* Category Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="select pl-10 min-w-[200px]"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'Tutte le categorie' : cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Portfolio Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('ticker')} className="cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center gap-1">
                        Ticker
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('name')} className="cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center gap-1">
                        Nome
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('category')} className="cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center gap-1">
                        Categoria
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('subCategory')} className="cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center gap-1">
                        Sotto-Categoria
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('quantity')} className="text-right cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-1">
                        Quantità
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('avgPrice')} className="text-right cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-1">
                        Prezzo Medio
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('currentPrice')} className="text-right cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-1">
                        Prezzo Attuale
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('marketValue')} className="text-right cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-1">
                        Valore
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('unrealizedPL')} className="text-right cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-1">
                        P/L
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('roi')} className="text-right cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-1">
                        ROI %
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('dividendYield')} className="text-right cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-1">
                        Yield %
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('annualDividend')} className="text-right cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-1">
                        Div./anno
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('ter')} className="text-right cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-1">
                        TER %
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('annualTERCost')} className="text-right cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center justify-end gap-1">
                        Costo TER/anno
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPortfolio.map((holding, index) => {
                    const cls = classifyHolding(holding);
                    return (
                    <tr key={index}>
                      <td className="font-semibold"><Blur>{holding.ticker}</Blur></td>
                      <td className="text-gray-600 max-w-xs truncate"><Blur>{holding.name}</Blur></td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cls.macroColor + '1e', color: cls.macroColor, borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: cls.macroColor }} />
                          {cls.macroLabel}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text-2, #374151)', background: cls.color + '18', borderRadius: 6, padding: '2px 8px' }}>
                          {cls.microLabel}
                          {!cls.derived && <span title="Classificazione da confermare" style={{ color: '#FF9F0A' }}>⚠</span>}
                        </span>
                      </td>
                      <td className="text-right">{holding.quantity.toFixed(4)}</td>
                      <td className="text-right">
                        €{holding.avgPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-right">
                        €{holding.currentPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-right font-medium">
                        €{holding.marketValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`text-right font-medium ${holding.unrealizedPL >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {holding.unrealizedPL >= 0 ? '+' : ''}€{holding.unrealizedPL.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`text-right font-medium ${holding.roi >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {holding.roi >= 0 ? '+' : ''}{holding.roi.toFixed(2)}%
                      </td>
                      <td className="text-right">
                        {holding.dividendYield != null ? (
                          <span style={{
                            fontWeight: 600,
                            color: holding.dividendYield >= 7 ? '#FF9F0A'
                                 : holding.dividendYield >= 4 ? '#30D158'
                                 : holding.dividendYield >= 1 ? '#0A84FF'
                                 : 'var(--text-3)'
                          }}>
                            {holding.dividendYield.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        {holding.annualDividend != null && holding.annualDividend > 0 ? (
                          <Blur><span style={{ color:'#30D158', fontWeight:500 }}>
                            €{holding.annualDividend.toLocaleString('it-IT', { minimumFractionDigits:2, maximumFractionDigits:2 })}
                          </span></Blur>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        {holding.ter ? (
                          <span className={`badge ${getTERBadgeColor(holding.ter)}`}>
                            {holding.ter.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">N/A</span>
                        )}
                      </td>
                      <td className="text-right text-orange-700">
                        {holding.annualTERCost > 0 ? (
                          `€${holding.annualTERCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredPortfolio.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Nessun risultato trovato
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="card bg-gray-50">
            <div className="mb-3">
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1 inline-block">
                ℹ️ Statistiche calcolate <strong>escludendo il Cash</strong>
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Valore Totale</p>
                <p className="text-2xl font-bold text-gray-900">
                  €{summary.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Investito</p>
                <p className="text-2xl font-bold text-gray-900">
                  €{summary.totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">P/L Non Realizzato</p>
                <p className={`text-2xl font-bold ${summary.totalPL >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                  {summary.totalPL >= 0 ? '+' : ''}€{summary.totalPL.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {summary.totalCost > 0 && (
                  <p className={`text-sm font-medium mt-1 ${summary.totalPL >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                    ROI {summary.totalPL >= 0 ? '+' : ''}{((summary.totalPL / summary.totalCost) * 100).toFixed(2)}%
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">P/L Realizzato</p>
                <p className={`text-2xl font-bold ${realizedPL >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                  {realizedPL >= 0 ? '+' : ''}€{realizedPL.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Da posizioni chiuse
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">TWRR Annualizzato</p>
                {twrr?.rate !== null && twrr?.rate !== undefined ? (
                  <>
                    <p className={`text-2xl font-bold ${twrr.rate >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                      {twrr.rate >= 0 ? '+' : ''}{twrr.pct}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Considera timing depositi
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-gray-400">—</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Costo TER Annuale</p>
                <p className="text-2xl font-bold text-orange-700">
                  €{summary.totalAnnualTERCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Commissioni di gestione ETF
                </p>
              </div>
            </div>
            {/* P/L Totale (Realizzato + Non Realizzato) */}
            {(summary.totalPL !== 0 || realizedPL !== 0) && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-6">
                <div>
                  <span className="text-sm text-gray-600">P/L Totale (realizz. + non realizz.): </span>
                  <span className={`text-lg font-bold ${(summary.totalPL + realizedPL) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                    {(summary.totalPL + realizedPL) >= 0 ? '+' : ''}€{(summary.totalPL + realizedPL).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {summary.totalCost > 0 && (
                  <div>
                    <span className="text-sm text-gray-600">ROI Totale: </span>
                    <span className={`text-lg font-bold ${(summary.totalPL + realizedPL) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                      {(summary.totalPL + realizedPL) >= 0 ? '+' : ''}{(((summary.totalPL + realizedPL) / summary.totalCost) * 100).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Portfolio;
