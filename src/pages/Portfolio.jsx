import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, ArrowUpDown, Wallet } from 'lucide-react';
import { calculatePortfolio } from '../services/localStorageService';
import { fetchMultiplePrices } from '../services/priceService';
import { getTER, calculateAnnualTERCost, getTERBadgeColor } from '../services/terDetectionService';

function Portfolio() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [filteredPortfolio, setFilteredPortfolio] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('marketValue');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadPortfolio();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [portfolio, searchTerm, filterCategory, sortBy, sortOrder]);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      await updatePrices();
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePrices = async () => {
    setRefreshing(true);

    const holdings = calculatePortfolio();

    if (holdings.length === 0) {
      setPortfolio([]);
      setRefreshing(false);
      return;
    }

    const tickers = holdings.map(h => h.ticker);
    const categoriesMap = holdings.reduce((acc, h) => {
      acc[h.ticker] = h.category;
      return acc;
    }, {});

    const prices = await fetchMultiplePrices(tickers, categoriesMap);

    const updatedPortfolio = holdings.map(holding => {
      const priceData = prices[holding.ticker];
      const currentPrice = priceData?.price || holding.avgPrice;

      const marketValue = currentPrice * holding.quantity;
      const totalCost = holding.avgPrice * holding.quantity;
      const unrealizedPL = marketValue - totalCost;
      const roi = totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0;

      // Get TER information
      const ter = getTER(holding.ticker);
      const annualTERCost = ter ? calculateAnnualTERCost(marketValue, ter) : 0;

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
        annualTERCost
      };
    });

    setPortfolio(updatedPortfolio);
    setRefreshing(false);
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

  const summary = {
    totalValue: filteredPortfolio.reduce((sum, h) => sum + h.marketValue, 0),
    totalCost: filteredPortfolio.reduce((sum, h) => sum + h.totalCost, 0),
    totalPL: filteredPortfolio.reduce((sum, h) => sum + h.unrealizedPL, 0),
    totalAnnualTERCost: filteredPortfolio.reduce((sum, h) => sum + (h.annualTERCost || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Caricamento portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-gray-600 mt-1">Tutti i tuoi investimenti</p>
        </div>
        {portfolio.length > 0 && (
          <button
            onClick={updatePrices}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
        )}
      </div>

      {portfolio.length === 0 ? (
        <div className="card text-center py-12">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nessun asset nel portfolio
          </h3>
          <p className="text-gray-600 mb-6">
            Aggiungi una transazione per iniziare a tracciare i tuoi investimenti
          </p>
          <a href="/transactions/new" className="btn-primary inline-block">
            Aggiungi Transazione
          </a>
        </div>
      ) : (
        <>
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
                  {filteredPortfolio.map((holding, index) => (
                    <tr key={index}>
                      <td className="font-semibold">{holding.ticker}</td>
                      <td className="text-gray-600 max-w-xs truncate">{holding.name}</td>
                      <td>
                        <span className="badge badge-primary">{holding.category}</span>
                      </td>
                      <td>
                        {holding.subCategory ? (
                          <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                            {holding.subCategory}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Non rilevata</span>
                        )}
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
                  ))}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <p className="text-sm text-gray-600 mb-1">P/L Totale</p>
                <p className={`text-2xl font-bold ${summary.totalPL >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                  {summary.totalPL >= 0 ? '+' : ''}€{summary.totalPL.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
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
          </div>
        </>
      )}
    </div>
  );
}

export default Portfolio;
