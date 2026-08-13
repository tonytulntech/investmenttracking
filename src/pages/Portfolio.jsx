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

const MONO = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };

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

          {/* Filters (Direzione C) */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '0.9rem 1rem', marginBottom: '1rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.28)',
            display: 'flex', gap: 10, flexWrap: 'wrap',
          }}>
            <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 200 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input
                type="text"
                placeholder="Cerca ticker, nome o ISIN…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text-1)', fontSize: '0.82rem',
                }}
              />
            </div>
            <div style={{ position: 'relative', flex: '0 0 220px' }}>
              <Filter size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text-1)', fontSize: '0.82rem', cursor: 'pointer',
                }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'Tutte le categorie' : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Portfolio Table (Direzione C, mono tabellare, colonne opzionali su mobile) */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0,0,0,0.28)',
            marginBottom: '1rem',
          }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontFamily: 'inherit', fontSize: '0.82rem',
              }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                    {[
                      { key: 'ticker',        label: 'Ticker',       align: 'left'  },
                      { key: 'name',          label: 'Nome',         align: 'left',  cls: 'pf-hide-md' },
                      { key: 'category',      label: 'Categoria',    align: 'left'  },
                      { key: 'subCategory',   label: 'Sotto-cat.',   align: 'left',  cls: 'pf-hide-lg' },
                      { key: 'quantity',      label: 'Qty',          align: 'right', cls: 'pf-hide-sm' },
                      { key: 'avgPrice',      label: 'P. Medio',     align: 'right', cls: 'pf-hide-md' },
                      { key: 'currentPrice',  label: 'P. Attuale',   align: 'right', cls: 'pf-hide-md' },
                      { key: 'marketValue',   label: 'Valore',       align: 'right' },
                      { key: 'unrealizedPL',  label: 'P/L',          align: 'right' },
                      { key: 'roi',           label: 'ROI',          align: 'right' },
                      { key: 'dividendYield', label: 'Yield',        align: 'right', cls: 'pf-hide-sm' },
                      { key: 'annualDividend',label: 'Div./anno',    align: 'right', cls: 'pf-hide-lg' },
                      { key: 'ter',           label: 'TER',          align: 'right', cls: 'pf-hide-md' },
                      { key: 'annualTERCost', label: 'TER €/anno',   align: 'right', cls: 'pf-hide-lg' },
                    ].map(col => (
                      <th key={col.key} className={col.cls}
                        onClick={() => handleSort(col.key)}
                        style={{
                          padding: '10px 12px', textAlign: col.align,
                          fontSize: '0.64rem', fontWeight: 700,
                          color: 'var(--text-3)', textTransform: 'uppercase',
                          letterSpacing: '0.06em', cursor: 'pointer',
                          whiteSpace: 'nowrap', userSelect: 'none',
                        }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          {col.label}<ArrowUpDown size={10} style={{ opacity: 0.5 }} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPortfolio.map((holding, index) => {
                    const cls = classifyHolding(holding);
                    const plColor = holding.unrealizedPL >= 0 ? 'var(--pos)' : 'var(--neg)';
                    const roiColor = holding.roi >= 0 ? 'var(--pos)' : 'var(--neg)';
                    const yield_ = holding.dividendYield;
                    return (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-1)' }}>
                        <Blur>{holding.ticker}</Blur>
                      </td>
                      <td className="pf-hide-md" style={{ padding: '10px 12px', color: 'var(--text-3)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Blur>{holding.name}</Blur>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cls.macroColor + '1e', color: cls.macroColor, borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: cls.macroColor }} />
                          {cls.macroLabel}
                        </span>
                      </td>
                      <td className="pf-hide-lg" style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'var(--text-2)', background: cls.color + '18', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                          {cls.microLabel}
                          {!cls.derived && <span title="Classificazione da confermare" style={{ color: '#FF9F0A' }}>⚠</span>}
                        </span>
                      </td>
                      <td className="pf-hide-sm" style={{ padding: '10px 12px', textAlign: 'right', ...MONO }}>
                        {holding.quantity.toFixed(4)}
                      </td>
                      <td className="pf-hide-md" style={{ padding: '10px 12px', textAlign: 'right', ...MONO, color: 'var(--text-2)' }}>
                        €{holding.avgPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="pf-hide-md" style={{ padding: '10px 12px', textAlign: 'right', ...MONO, color: 'var(--text-2)' }}>
                        €{holding.currentPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, ...MONO, color: 'var(--text-1)' }}>
                        <Blur>€{holding.marketValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Blur>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, ...MONO, color: plColor }}>
                        <Blur>{holding.unrealizedPL >= 0 ? '+' : ''}€{holding.unrealizedPL.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Blur>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, ...MONO, color: roiColor }}>
                        {holding.roi >= 0 ? '+' : ''}{holding.roi.toFixed(2)}%
                      </td>
                      <td className="pf-hide-sm" style={{ padding: '10px 12px', textAlign: 'right', ...MONO }}>
                        {yield_ != null ? (
                          <span style={{
                            fontWeight: 600,
                            color: yield_ >= 7 ? '#FF9F0A'
                                 : yield_ >= 4 ? 'var(--pos)'
                                 : yield_ >= 1 ? 'var(--accent)'
                                 : 'var(--text-3)'
                          }}>{yield_.toFixed(2)}%</span>
                        ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                      </td>
                      <td className="pf-hide-lg" style={{ padding: '10px 12px', textAlign: 'right', ...MONO }}>
                        {holding.annualDividend > 0 ? (
                          <Blur><span style={{ color: 'var(--pos)', fontWeight: 500 }}>
                            €{holding.annualDividend.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span></Blur>
                        ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                      </td>
                      <td className="pf-hide-md" style={{ padding: '10px 12px', textAlign: 'right', ...MONO }}>
                        {holding.ter ? (
                          <span className={`badge ${getTERBadgeColor(holding.ter)}`}>{holding.ter.toFixed(2)}%</span>
                        ) : <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>N/A</span>}
                      </td>
                      <td className="pf-hide-lg" style={{ padding: '10px 12px', textAlign: 'right', ...MONO, color: '#FF9F0A' }}>
                        {holding.annualTERCost > 0
                          ? `€${holding.annualTERCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : <span style={{ color: 'var(--text-3)' }}>—</span>}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredPortfolio.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)', fontSize: '0.85rem' }}>
                  Nessun risultato trovato
                </div>
              )}
            </div>
          </div>

          {/* Summary (Direzione C, responsive) */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '1.1rem 1.25rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.28)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
                Statistiche
              </span>
              <span style={{
                fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-3)',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                padding: '2px 7px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Escluso Cash</span>
            </div>

            {/* Grid KPI: 6 col desktop -> 3 col tablet -> 2 col mobile */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 10,
            }}>
              <SummaryKpi label="Valore totale" value={`€${summary.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              <SummaryKpi label="Investito" value={`€${summary.totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              <SummaryKpi
                label="P/L non realizzato"
                value={`${summary.totalPL >= 0 ? '+' : ''}€${summary.totalPL.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                color={summary.totalPL >= 0 ? 'var(--pos)' : 'var(--neg)'}
                sub={summary.totalCost > 0 ? `ROI ${summary.totalPL >= 0 ? '+' : ''}${((summary.totalPL / summary.totalCost) * 100).toFixed(2)}%` : null}
              />
              <SummaryKpi
                label="P/L realizzato"
                value={`${realizedPL >= 0 ? '+' : ''}€${realizedPL.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                color={realizedPL >= 0 ? 'var(--pos)' : 'var(--neg)'}
                sub="Da posizioni chiuse"
              />
              <SummaryKpi
                label="TWRR annualizzato"
                value={twrr?.rate != null ? `${twrr.rate >= 0 ? '+' : ''}${twrr.pct}%` : '—'}
                color={twrr?.rate != null ? (twrr.rate >= 0 ? 'var(--pos)' : 'var(--neg)') : 'var(--text-3)'}
                sub="Timing dei depositi"
              />
              <SummaryKpi
                label="TER annuale"
                value={`€${summary.totalAnnualTERCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                color="#FF9F0A"
                sub="Costo gestione ETF"
              />
            </div>

            {/* P/L Totale (Realizzato + Non Realizzato) */}
            {(summary.totalPL !== 0 || realizedPL !== 0) && (
              <div style={{
                marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>P/L totale (realizzato + non):</span>
                  <span style={{
                    ...MONO, fontSize: '1.05rem', fontWeight: 700,
                    color: (summary.totalPL + realizedPL) >= 0 ? 'var(--pos)' : 'var(--neg)',
                  }}>
                    {(summary.totalPL + realizedPL) >= 0 ? '+' : ''}€{(summary.totalPL + realizedPL).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {summary.totalCost > 0 && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>ROI totale:</span>
                    <span style={{
                      ...MONO, fontSize: '1.05rem', fontWeight: 700,
                      color: (summary.totalPL + realizedPL) >= 0 ? 'var(--pos)' : 'var(--neg)',
                    }}>
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

function SummaryKpi({ label, value, sub, color = 'var(--text-1)' }) {
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ ...MONO, fontSize: '1.1rem', fontWeight: 700, color, lineHeight: 1.1 }}>{value}</span>
      {sub && <span style={{ fontSize: '0.66rem', color: 'var(--text-3)' }}>{sub}</span>}
    </div>
  );
}

export default Portfolio;
