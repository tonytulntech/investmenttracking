import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, DollarSign, BarChart3, RefreshCw, Target, AlertCircle, ArrowDownCircle, ArrowUpCircle, ShoppingCart, Calendar, Clock, Zap } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { getTransactions, calculatePortfolio } from '../services/localStorageService';
import { fetchMultiplePrices } from '../services/priceService';
import { calculateCashFlow } from '../services/cashFlowService';
import { getPerformanceSummary } from '../services/performanceService';
import { format } from 'date-fns';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalValue: 0,
    totalCost: 0,
    totalPL: 0,
    totalPLPercent: 0,
    dayChange: 0,
    dayChangePercent: 0,
    assetsCount: 0
  });
  const [portfolio, setPortfolio] = useState([]);
  const [fullPortfolio, setFullPortfolio] = useState([]); // Unfiltered portfolio
  const [allocationData, setAllocationData] = useState([]);
  const [subAllocationData, setSubAllocationData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [strategy, setStrategy] = useState(null);
  const [allocationComparison, setAllocationComparison] = useState([]);
  const [cashFlow, setCashFlow] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);

  // Asset class filters (all enabled by default)
  const [filters, setFilters] = useState({
    ETF: true,
    ETC: true,
    ETN: true,
    Azioni: true,
    Obbligazioni: true,
    Crypto: true,
    'Materie Prime': true,
    Monetario: true,
    Immobiliare: true,
    Cash: true
  });

  useEffect(() => {
    loadData();
  }, []);

  // Recalculate stats when filters change
  useEffect(() => {
    if (fullPortfolio.length > 0) {
      applyFilters();
    }
  }, [filters, fullPortfolio]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load strategy
      const savedStrategy = localStorage.getItem('investment_strategy');
      if (savedStrategy) {
        setStrategy(JSON.parse(savedStrategy));
      }
      // Calculate cash flow
      const cf = calculateCashFlow();
      setCashFlow(cf);

      await updatePricesAndCalculate();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePricesAndCalculate = async () => {
    setRefreshing(true);

    // Get portfolio from transactions
    const holdings = calculatePortfolio();

    if (holdings.length === 0) {
      setStats({
        totalValue: 0,
        totalCost: 0,
        totalPL: 0,
        totalPLPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        assetsCount: 0
      });
      setPortfolio([]);
      setAllocationData([]);
      setPerformanceData([]);
      setRefreshing(false);
      return;
    }

    // Fetch current prices (skip cash - price is always 1)
    const nonCashHoldings = holdings.filter(h => !h.isCash);
    const tickers = nonCashHoldings.map(h => h.ticker);
    const categoriesMap = nonCashHoldings.reduce((acc, h) => {
      acc[h.ticker] = h.category;
      return acc;
    }, {});

    const prices = tickers.length > 0 ? await fetchMultiplePrices(tickers, categoriesMap) : {};

    // Calculate updated portfolio with current prices
    const updatedPortfolio = holdings.map(holding => {
      // For Cash: price is always 1, no price change, ROI = 0
      if (holding.isCash) {
        // Use totalCost which contains the actual cash value (can be negative)
        const marketValue = holding.totalCost;
        return {
          ...holding,
          currentPrice: 1,
          marketValue,
          totalCost: marketValue,
          unrealizedPL: 0,
          roi: 0,
          dayChange: 0,
          dayChangePercent: 0
        };
      }

      // For other assets: fetch current price
      const priceData = prices[holding.ticker];
      const currentPrice = priceData?.price || holding.avgPrice;

      const marketValue = currentPrice * holding.quantity;
      const totalCost = holding.avgPrice * holding.quantity;
      const unrealizedPL = marketValue - totalCost;
      const roi = totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0;

      return {
        ...holding,
        currentPrice,
        marketValue,
        totalCost,
        unrealizedPL,
        roi,
        dayChange: priceData?.change || 0,
        dayChangePercent: priceData?.changePercent || 0
      };
    });

    // Save full portfolio (unfiltered)
    setFullPortfolio(updatedPortfolio);

    // Initial calculation with all filters enabled will be done by applyFilters()
  };

  const applyFilters = () => {
    // Filter portfolio based on selected asset classes
    const filteredPortfolio = fullPortfolio.filter(holding => {
      const macroCategory = holding.macroCategory || holding.category;
      // Special handling for CASH virtual holding
      if (holding.ticker === 'CASH') {
        return filters['Cash'] !== false;
      }
      return filters[macroCategory] !== false; // Include if filter is true or undefined
    });

    setPortfolio(filteredPortfolio);

    // Recalculate everything with filtered data
    const totalValue = filteredPortfolio.reduce((sum, p) => sum + p.marketValue, 0);
    const totalCost = filteredPortfolio.reduce((sum, p) => sum + p.totalCost, 0);
    const totalPL = totalValue - totalCost;
    const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
    const dayChange = filteredPortfolio.reduce((sum, p) => sum + (p.dayChange * p.quantity), 0);
    const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

    setStats({
      totalValue,
      totalCost,
      totalPL,
      totalPLPercent,
      dayChange,
      dayChangePercent,
      assetsCount: filteredPortfolio.length
    });

    // Prepare allocation data (by category) from filtered portfolio
    const categoryTotals = filteredPortfolio.reduce((acc, p) => {
      const cat = p.macroCategory || p.category;
      // Use absolute value for display in pie chart (pie charts can't handle negative values)
      const value = p.isCash ? Math.abs(p.marketValue) : p.marketValue;
      acc[cat] = (acc[cat] || 0) + value;
      return acc;
    }, {});

    // Filter out zero values for pie chart display
    const allocation = Object.entries(categoryTotals)
      .filter(([name, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0
      }));

    setAllocationData(allocation);

    // Prepare sub-category allocation data from filtered portfolio
    const transactions = getTransactions();
    const subCategoryTotals = {};

    // Add cash to sub-category if present in filtered portfolio
    const cashHolding = filteredPortfolio.find(p => p.ticker === 'CASH');
    if (cashHolding && cashHolding.microCategory) {
      // Use absolute value for pie chart display (pie charts can't handle negative values)
      subCategoryTotals[cashHolding.microCategory] = Math.abs(cashHolding.marketValue);
    }

    // Add other holdings from transactions
    transactions.forEach(tx => {
      if ((tx.microCategory || tx.subCategory) && tx.type === 'buy') {
        const holding = filteredPortfolio.find(p => p.ticker === tx.ticker && p.ticker !== 'CASH');
        if (holding) {
          const key = tx.microCategory || tx.subCategory;
          subCategoryTotals[key] = (subCategoryTotals[key] || 0) + holding.marketValue;
        }
      }
    });

    // Filter out zero values and sort by value
    const subAllocation = Object.entries(subCategoryTotals)
      .filter(([name, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.value - a.value);

    setSubAllocationData(subAllocation);

    // Prepare performance data (historical simulation) - using filtered portfolio
    const monthlyData = calculateMonthlyPerformance(transactions, filteredPortfolio);
    setPerformanceData(monthlyData);

    // Calculate allocation comparison if strategy exists
    const savedStrategy = localStorage.getItem('investment_strategy');
    if (savedStrategy) {
      const strategyData = JSON.parse(savedStrategy);
      const comparison = calculateAllocationComparison(categoryTotals, totalValue, strategyData.assetAllocation);
      setAllocationComparison(comparison);
    }

    // Calculate performance metrics (CAGR, etc.) based on filtered portfolio
    const allTransactions = getTransactions();
    const perfMetrics = getPerformanceSummary(filteredPortfolio, strategy);
    setPerformanceMetrics(perfMetrics);

    // Stop refreshing spinner
    setRefreshing(false);
  };

  const calculateAllocationComparison = (categoryTotals, totalValue, targetAllocation) => {
    // Create comparison array with all asset classes
    const assetClasses = Object.keys(targetAllocation);

    return assetClasses.map(assetClass => {
      const currentValue = categoryTotals[assetClass] || 0;
      const currentPercentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
      const targetPercentage = targetAllocation[assetClass];
      const difference = currentPercentage - targetPercentage;

      return {
        assetClass,
        current: parseFloat(currentPercentage.toFixed(2)),
        target: parseFloat(targetPercentage),
        difference: parseFloat(difference.toFixed(2)),
        status: Math.abs(difference) < 2 ? 'ok' : Math.abs(difference) < 5 ? 'warning' : 'alert'
      };
    });
  };

  const calculateMonthlyPerformance = (transactions, currentPortfolio) => {
    // Filter transactions to only include tickers in current filtered portfolio
    const portfolioTickers = new Set(currentPortfolio.map(p => p.ticker));
    const filteredTransactions = transactions.filter(tx => portfolioTickers.has(tx.ticker));

    // Group filtered transactions by month
    const months = {};

    filteredTransactions.forEach(tx => {
      const monthKey = format(new Date(tx.date), 'MMM yyyy');
      if (!months[monthKey]) {
        months[monthKey] = { month: monthKey, invested: 0 };
      }
      if (tx.type === 'buy') {
        months[monthKey].invested += tx.quantity * tx.price;
      } else if (tx.type === 'sell') {
        months[monthKey].invested -= tx.quantity * tx.price;
      }
    });

    // Calculate ROI from filtered portfolio
    const totalValue = currentPortfolio.reduce((sum, p) => sum + p.marketValue, 0);
    const totalCost = currentPortfolio.reduce((sum, p) => sum + p.totalCost, 0);
    const roiPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    // Calculate cumulative and current value estimation
    let cumulative = 0;
    return Object.values(months).map((m, index) => {
      cumulative += m.invested;
      // ROI simulation based on filtered portfolio performance
      const currentValue = cumulative * (1 + (roiPercent / 100));
      return {
        month: m.month,
        invested: cumulative,
        value: currentValue
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  const hasData = portfolio.length > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Panoramica del tuo portafoglio</p>
        </div>
        {hasData && (
          <button
            onClick={() => updatePricesAndCalculate()}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Aggiorna Prezzi
          </button>
        )}
      </div>

      {!hasData ? (
        <div className="card text-center py-12">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nessuna transazione trovata
          </h3>
          <p className="text-gray-600 mb-6">
            Inizia aggiungendo la tua prima transazione per vedere le statistiche
          </p>
          <a href="/transactions/new" className="btn-primary inline-flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Aggiungi Transazione
          </a>
        </div>
      ) : (
        <>
          {/* Asset Class Filters */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Filtra Asset Class</h3>
              <button
                onClick={() => {
                  const allEnabled = Object.values(filters).every(v => v);
                  const newFilters = {};
                  Object.keys(filters).forEach(key => {
                    newFilters[key] = !allEnabled;
                  });
                  setFilters(newFilters);
                }}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                {Object.values(filters).every(v => v) ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Object.keys(filters).map(assetClass => (
                <label
                  key={assetClass}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    filters[assetClass]
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={filters[assetClass]}
                    onChange={(e) => setFilters({ ...filters, [assetClass]: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className={`text-sm font-medium ${filters[assetClass] ? 'text-primary-900' : 'text-gray-600'}`}>
                    {assetClass}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Seleziona le asset class da includere nei calcoli e nelle statistiche
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Value */}
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">Valore Totale</span>
                <DollarSign className="w-5 h-5 text-primary-600" />
              </div>
              <div className="stat-value">€{stats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.assetsCount} asset{stats.assetsCount !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Total P/L */}
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">Profitto/Perdita</span>
                {stats.totalPL >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-success-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-danger-600" />
                )}
              </div>
              <div className={`stat-value ${stats.totalPL >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {stats.totalPL >= 0 ? '+' : ''}€{stats.totalPL.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`stat-change ${stats.totalPLPercent >= 0 ? 'positive' : 'negative'}`}>
                {stats.totalPLPercent >= 0 ? '+' : ''}{stats.totalPLPercent.toFixed(2)}%
              </div>
            </div>

            {/* Day Change */}
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">Variazione Oggi</span>
                <BarChart3 className="w-5 h-5 text-primary-600" />
              </div>
              <div className={`stat-value ${stats.dayChange >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {stats.dayChange >= 0 ? '+' : ''}€{stats.dayChange.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`stat-change ${stats.dayChangePercent >= 0 ? 'positive' : 'negative'}`}>
                {stats.dayChangePercent >= 0 ? '+' : ''}{stats.dayChangePercent.toFixed(2)}%
              </div>
            </div>

            {/* Total Invested */}
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">Totale Investito</span>
                <Wallet className="w-5 h-5 text-primary-600" />
              </div>
              <div className="stat-value">€{stats.totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-500 mt-1">
                Costo medio
              </div>
            </div>
          </div>

          {/* Cash Flow Summary */}
          {cashFlow && (
            <div className="card bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-green-600" />
                  Cash Flow & Liquidità
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Liquidità Disponibile</p>
                  </div>
                  <p className={`text-2xl font-bold ${cashFlow.availableCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    €{cashFlow.availableCash.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Cash pronto per investimenti
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <ArrowDownCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Depositi Totali</p>
                  </div>
                  <p className="text-xl font-bold text-blue-600">
                    €{cashFlow.cashDeposits.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Contante depositato
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 text-orange-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Investito in Asset</p>
                  </div>
                  <p className="text-xl font-bold text-orange-600">
                    €{cashFlow.assetPurchases.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Acquisti totali
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <ArrowUpCircle className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Da Vendite</p>
                  </div>
                  <p className="text-xl font-bold text-purple-600">
                    €{cashFlow.assetSales.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Vendite realizzate
                  </p>
                </div>
              </div>

              {cashFlow.availableCash < 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900 text-sm">⚠️ Cash Negativo</p>
                      <p className="text-xs text-red-700 mt-1">
                        Hai speso più di quanto depositato. Considera di aggiungere liquidità o vendere asset.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CAGR & Performance Metrics */}
          {performanceMetrics && performanceMetrics.daysInvesting > 0 && (
            <div className="card bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  Performance & CAGR
                </h3>
                <span className="text-xs text-gray-500">
                  Basato sui filtri attivi
                </span>
              </div>

              {/* Key Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Zap className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">
                      {performanceMetrics.cagrReliable ? 'CAGR' : 'Rendimento'}
                    </p>
                  </div>
                  <p className={`text-3xl font-bold ${performanceMetrics.cagr >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                    {performanceMetrics.cagr >= 0 ? '+' : ''}{performanceMetrics.cagrReliable ? performanceMetrics.cagr.toFixed(2) : performanceMetrics.totalReturnPercent.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {performanceMetrics.cagrReliable ? 'Rendimento annuo composto' : 'Rendimento totale'}
                  </p>
                  {!performanceMetrics.cagrReliable && (
                    <p className="text-xs text-orange-600 mt-1 font-medium">
                      ⚠️ CAGR disponibile dopo 1 anno
                    </p>
                  )}
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Inizio Investimenti</p>
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    {format(new Date(performanceMetrics.startDate), 'dd/MM/yyyy')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Prima transazione
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Clock className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Tempo Investito</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {performanceMetrics.daysInvesting} giorni
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {performanceMetrics.yearsInvesting.toFixed(1)} anni
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Rendimento Totale</p>
                  </div>
                  <p className={`text-2xl font-bold ${performanceMetrics.totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {performanceMetrics.totalReturnPercent >= 0 ? '+' : ''}{performanceMetrics.totalReturnPercent.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {performanceMetrics.totalReturn >= 0 ? '+' : ''}€{performanceMetrics.totalReturn.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Warning for periods < 1 year */}
              {!performanceMetrics.cagrReliable && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900 text-sm">⚠️ CAGR non ancora affidabile</p>
                      <p className="text-xs text-orange-700 mt-1">
                        Hai investito da meno di 1 anno ({performanceMetrics.daysInvesting} giorni).
                        Il CAGR (rendimento annualizzato) sarà più accurato dopo aver completato almeno 1 anno di investimenti.
                        Attualmente mostriamo il rendimento totale: <strong>{performanceMetrics.totalReturnPercent >= 0 ? '+' : ''}{performanceMetrics.totalReturnPercent.toFixed(2)}%</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Goal Projection */}
              {performanceMetrics.goalProjection && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">Proiezione Obiettivo</h4>
                  </div>

                  {performanceMetrics.goalProjection.achieved ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-green-900 font-semibold">
                        🎉 {performanceMetrics.goalProjection.message}
                      </p>
                    </div>
                  ) : performanceMetrics.goalProjection.yearsToGoal ? (
                    <div className="space-y-3">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-purple-900 font-semibold mb-2">
                          📈 {performanceMetrics.goalProjection.message}
                        </p>
                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-purple-700">Tempo Rimanente</p>
                            <p className="text-lg font-bold text-purple-900">
                              {performanceMetrics.goalProjection.yearsToGoal} anni
                            </p>
                            <p className="text-xs text-purple-600">
                              {performanceMetrics.goalProjection.monthsToGoal} mesi
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-purple-700">Anno Obiettivo</p>
                            <p className="text-lg font-bold text-purple-900">
                              {performanceMetrics.goalProjection.yearAtGoal}
                            </p>
                          </div>
                          {performanceMetrics.goalProjection.ageAtGoal && (
                            <div>
                              <p className="text-xs text-purple-700">Età Prevista</p>
                              <p className="text-lg font-bold text-purple-900">
                                {performanceMetrics.goalProjection.ageAtGoal} anni
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 italic">
                        ⚡ Proiezione basata sul {performanceMetrics.cagrReliable ? `CAGR attuale di ${performanceMetrics.cagr.toFixed(2)}%` : `rendimento totale di ${performanceMetrics.totalReturnPercent.toFixed(2)}% (CAGR disponibile dopo 1 anno)`} e contributi mensili di €{strategy?.monthlyInvestment || 0}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-orange-900 text-sm">
                        ⚠️ {performanceMetrics.goalProjection.message}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Allocation Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Allocazione per Categoria
              </h3>
              {cashFlow && cashFlow.availableCash <= 0 && filters['Cash'] && (
                <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <p className="text-xs text-blue-700">
                    ℹ️ Cash {cashFlow.availableCash === 0 ? 'è zero e' : 'negativo è'} escluso dal grafico. Vedi sezione Cash Flow per dettagli.
                  </p>
                </div>
              )}
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Andamento Portafoglio
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip formatter={(value) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} />
                  <Legend />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" name="Valore Attuale" />
                  <Area type="monotone" dataKey="invested" stroke="#10b981" fillOpacity={1} fill="url(#colorInvested)" name="Investito" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sub-Category Allocation */}
          {subAllocationData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Allocazione per Sotto-Categoria
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={subAllocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {subAllocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {subAllocationData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-600">{item.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Allocation Comparison with Target */}
          {strategy && allocationComparison.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary-600" />
                    Confronto Allocazione: Attuale vs Obiettivo
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Obiettivo: {strategy.goalName || 'Non definito'}
                  </p>
                </div>
                <a href="/strategy" className="btn-secondary text-sm">
                  Modifica Strategia
                </a>
              </div>

              {/* Bar Chart Comparison */}
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={allocationComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="assetClass" />
                  <YAxis label={{ value: '%', angle: 0, position: 'top' }} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Bar dataKey="current" fill="#3b82f6" name="Attuale %" />
                  <Bar dataKey="target" fill="#10b981" name="Obiettivo %" />
                </BarChart>
              </ResponsiveContainer>

              {/* Detailed Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Asset Class</th>
                      <th className="text-right">Attuale %</th>
                      <th className="text-right">Obiettivo %</th>
                      <th className="text-right">Scostamento</th>
                      <th className="text-center">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocationComparison.map((item, index) => (
                      <tr key={index}>
                        <td className="font-semibold">{item.assetClass}</td>
                        <td className="text-right">{item.current}%</td>
                        <td className="text-right">{item.target}%</td>
                        <td className={`text-right font-medium ${
                          item.difference > 0 ? 'text-primary-600' : item.difference < 0 ? 'text-orange-600' : 'text-gray-600'
                        }`}>
                          {item.difference > 0 ? '+' : ''}{item.difference}%
                        </td>
                        <td className="text-center">
                          {item.status === 'ok' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700">
                              ✓ OK
                            </span>
                          )}
                          {item.status === 'warning' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              ⚠ Attenzione
                            </span>
                          )}
                          {item.status === 'alert' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger-100 text-danger-700">
                              🔴 Ribilancia
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Alert if rebalancing needed */}
              {allocationComparison.some(item => item.status === 'alert') && (
                <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900">Ribilanciamento Consigliato</p>
                      <p className="text-sm text-orange-700 mt-1">
                        Alcune asset class si sono discostate significativamente dall'obiettivo.
                        Visita la pagina <a href="/rebalancing" className="underline font-medium">Ribilanciamento</a> per
                        vedere i suggerimenti di acquisto/vendita.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top Holdings */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Holdings
            </h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Nome</th>
                    <th>Categoria</th>
                    <th className="text-right">Quantità</th>
                    <th className="text-right">Valore</th>
                    <th className="text-right">P/L</th>
                    <th className="text-right">ROI %</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio
                    .sort((a, b) => b.marketValue - a.marketValue)
                    .slice(0, 10)
                    .map((holding, index) => (
                      <tr key={index}>
                        <td className="font-semibold">{holding.ticker}</td>
                        <td className="text-gray-600">{holding.name}</td>
                        <td>
                          <span className="badge badge-primary">{holding.category}</span>
                        </td>
                        <td className="text-right">{holding.quantity.toFixed(4)}</td>
                        <td className="text-right font-medium">
                          €{holding.marketValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`text-right font-medium ${holding.unrealizedPL >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                          {holding.unrealizedPL >= 0 ? '+' : ''}€{holding.unrealizedPL.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`text-right font-medium ${holding.roi >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                          {holding.roi >= 0 ? '+' : ''}{holding.roi.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
