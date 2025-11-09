import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, DollarSign, BarChart3, RefreshCw, Target, AlertCircle, ArrowDownCircle, ArrowUpCircle, ShoppingCart, Calendar, Clock, Zap } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { getTransactions, calculatePortfolio } from '../services/localStorageService';
import { fetchMultiplePrices } from '../services/priceService';
import { calculateCashFlow } from '../services/cashFlowService';
import { getPerformanceSummary } from '../services/performanceService';
import { format, startOfYear, subMonths, isAfter, isBefore } from 'date-fns';

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
  const [availableYears, setAvailableYears] = useState([]);

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

  // Date filter (default: all time)
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  // Recalculate stats when filters change or portfolio updates
  useEffect(() => {
    if (fullPortfolio.length > 0) {
      console.log('🔄 Filters changed, recalculating...', {
        dateFilter,
        activeFilters: Object.entries(filters).filter(([k, v]) => v).map(([k]) => k)
      });
      applyFilters();
    }
  }, [filters, dateFilter, fullPortfolio]);

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

      // Calculate available years from transactions
      const transactions = getTransactions();
      const years = new Set();
      transactions.forEach(tx => {
        const year = new Date(tx.date).getFullYear();
        years.add(year);
      });
      setAvailableYears(Array.from(years).sort((a, b) => b - a)); // Descending order

      await updatePricesAndCalculate();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get date range based on filter selection
  const getDateRange = (filter) => {
    const now = new Date();
    let startDate = null;

    switch (filter) {
      case 'ytd':
        startDate = startOfYear(now);
        break;
      case '3m':
        startDate = subMonths(now, 3);
        break;
      case '6m':
        startDate = subMonths(now, 6);
        break;
      case '1y':
        startDate = subMonths(now, 12);
        break;
      case 'all':
        startDate = null; // No filter
        break;
      default:
        // Specific year (e.g., '2023')
        if (!isNaN(filter)) {
          const year = parseInt(filter);
          startDate = new Date(year, 0, 1); // Jan 1st
          const endDate = new Date(year, 11, 31, 23, 59, 59); // Dec 31st
          return { startDate, endDate };
        }
        break;
    }

    return { startDate, endDate: now };
  };

  // Filter transactions by date range
  const filterTransactionsByDate = (transactions) => {
    if (dateFilter === 'all') return transactions;

    const { startDate, endDate } = getDateRange(dateFilter);
    if (!startDate) return transactions;

    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      const afterStart = !startDate || isAfter(txDate, startDate) || txDate.getTime() === startDate.getTime();
      const beforeEnd = !endDate || isBefore(txDate, endDate) || txDate.getTime() === endDate.getTime();
      return afterStart && beforeEnd;
    });
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
    // The useEffect will automatically trigger applyFilters when fullPortfolio changes
    // applyFilters will set refreshing to false when done
    setFullPortfolio(updatedPortfolio);
  };

  const applyFilters = () => {
    console.log('📊 Applying filters...', {
      fullPortfolioLength: fullPortfolio.length,
      dateFilter,
      activeAssetFilters: Object.entries(filters).filter(([k, v]) => v).length
    });

    // Get all transactions and apply date filter first
    const allTransactions = getTransactions();
    console.log('📝 Total transactions:', allTransactions.length);
    console.log('📋 All transactions:', allTransactions);

    const dateFilteredTransactions = filterTransactionsByDate(allTransactions);
    console.log('📅 Date filtered transactions:', dateFilteredTransactions.length);

    // CRITICAL FIX: If date filter is active, recalculate portfolio from filtered transactions
    // This ensures statistics reflect only the selected time period
    let workingPortfolio;

    if (dateFilter !== 'all') {
      console.log('🔄 Recalculating portfolio from date-filtered transactions...');
      // Rebuild portfolio from scratch using only date-filtered transactions
      const holdings = {};

      dateFilteredTransactions.forEach(tx => {
        const { ticker, type, quantity, price, date } = tx;
        const isCash = tx.isCash || (tx.macroCategory === 'Cash');

        // Skip cash - handled separately
        if (isCash) return;

        if (!holdings[ticker]) {
          holdings[ticker] = {
            ticker,
            name: tx.name || ticker,
            macroCategory: tx.macroCategory || tx.category || 'Other',
            microCategory: tx.microCategory || tx.subCategory || null,
            quantity: 0,
            totalCost: 0
          };
        }

        if (type === 'buy') {
          holdings[ticker].quantity += quantity;
          holdings[ticker].totalCost += quantity * price;
        } else if (type === 'sell') {
          holdings[ticker].quantity -= quantity;
          holdings[ticker].totalCost -= quantity * price;
        }
      });

      // Convert to array and match with current prices from fullPortfolio
      workingPortfolio = Object.values(holdings)
        .filter(h => h.quantity > 0)
        .map(h => {
          // Find current price from fullPortfolio
          const fullHolding = fullPortfolio.find(fh => fh.ticker === h.ticker);
          const currentPrice = fullHolding?.currentPrice || (h.totalCost / h.quantity);
          const marketValue = currentPrice * h.quantity;
          const unrealizedPL = marketValue - h.totalCost;
          const roi = h.totalCost > 0 ? (unrealizedPL / h.totalCost) * 100 : 0;

          return {
            ...h,
            currentPrice,
            marketValue,
            unrealizedPL,
            roi,
            avgPrice: h.totalCost / h.quantity,
            dayChange: fullHolding?.dayChange || 0,
            dayChangePercent: fullHolding?.dayChangePercent || 0
          };
        });

      // Add cash from fullPortfolio if it exists
      const cashHolding = fullPortfolio.find(h => h.ticker === 'CASH');
      if (cashHolding) {
        workingPortfolio.push(cashHolding);
      }

      console.log('✅ Portfolio recalculated from filtered transactions:', workingPortfolio.length, 'holdings');
    } else {
      // No date filter - use full portfolio
      workingPortfolio = fullPortfolio;
    }

    // Filter portfolio based on selected asset classes
    const filteredPortfolio = workingPortfolio.filter(holding => {
      const macroCategory = holding.macroCategory || holding.category;
      // Special handling for CASH virtual holding
      if (holding.ticker === 'CASH') {
        return filters['Cash'] !== false;
      }
      return filters[macroCategory] !== false; // Include if filter is true or undefined
    });

    console.log('💼 Working portfolio:', workingPortfolio);
    console.log('🔍 Filtered portfolio:', filteredPortfolio);

    setPortfolio(filteredPortfolio);

    // Recalculate everything with filtered data
    const totalValue = filteredPortfolio.reduce((sum, p) => sum + p.marketValue, 0);
    const totalCost = filteredPortfolio.reduce((sum, p) => sum + p.totalCost, 0);

    console.log('💰 Value breakdown:', filteredPortfolio.map(p => ({
      ticker: p.ticker,
      quantity: p.quantity,
      currentPrice: p.currentPrice,
      marketValue: p.marketValue,
      totalCost: p.totalCost
    })));
    console.log('💵 Total Value:', totalValue, 'Total Cost:', totalCost);
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
    // FIXED: Calculate directly from portfolio, not from transactions (was causing duplicates)
    const subCategoryTotals = {};

    filteredPortfolio.forEach(holding => {
      const subCat = holding.microCategory || holding.subCategory || 'Non categorizzato';
      // Use absolute value for cash in pie chart display
      const value = holding.isCash ? Math.abs(holding.marketValue) : holding.marketValue;
      subCategoryTotals[subCat] = (subCategoryTotals[subCat] || 0) + value;
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

    // Prepare performance data (historical simulation) - using date-filtered transactions
    const monthlyData = calculateMonthlyPerformance(dateFilteredTransactions, filteredPortfolio);
    setPerformanceData(monthlyData);

    // Calculate allocation comparison if strategy exists
    const savedStrategy = localStorage.getItem('investment_strategy');
    if (savedStrategy) {
      const strategyData = JSON.parse(savedStrategy);
      // Use MICRO allocation if available, otherwise fall back to MACRO
      if (strategyData.microAllocation && Object.keys(strategyData.microAllocation).length > 0) {
        const comparison = calculateMicroAllocationComparison(filteredPortfolio, totalValue, strategyData.microAllocation);
        setAllocationComparison(comparison);
      } else if (strategyData.assetAllocation) {
        const comparison = calculateAllocationComparison(categoryTotals, totalValue, strategyData.assetAllocation);
        setAllocationComparison(comparison);
      }
    }

    // Calculate performance metrics (CAGR, etc.) based on filtered portfolio and date-filtered transactions
    // Note: getPerformanceSummary doesn't accept transactions parameter - it recalculates internally
    // This means CAGR will be calculated from full portfolio, but filtered by asset classes
    const perfMetrics = getPerformanceSummary(filteredPortfolio, strategy);
    setPerformanceMetrics(perfMetrics);

    // Stop refreshing spinner
    setRefreshing(false);

    console.log('✅ Filters applied successfully!', {
      filteredPortfolioLength: filteredPortfolio.length,
      totalValue: totalValue.toFixed(2),
      statsCalculated: Object.keys(stats).length > 0
    });
  };

  const calculateMicroAllocationComparison = (portfolio, totalValue, microTargets) => {
    // Exclude cash from comparison
    const investablePortfolio = portfolio.filter(p => !p.isCash);
    const investableValue = investablePortfolio.reduce((sum, p) => sum + (p.marketValue || 0), 0);

    // Calculate current MICRO totals from portfolio
    const microTotals = {};
    investablePortfolio.forEach(holding => {
      const micro = holding.microCategory || holding.subCategory || 'Non categorizzato';
      microTotals[micro] = (microTotals[micro] || 0) + (holding.marketValue || 0);
    });

    // Combine all MICRO categories (both current and target)
    const allMicroCategories = new Set([
      ...Object.keys(microTotals),
      ...Object.keys(microTargets)
    ]);

    return Array.from(allMicroCategories).map(microCategory => {
      const currentValue = microTotals[microCategory] || 0;
      const currentPercentage = investableValue > 0 ? (currentValue / investableValue) * 100 : 0;
      const targetPercentage = microTargets[microCategory] || 0;
      const difference = currentPercentage - targetPercentage;

      return {
        assetClass: microCategory, // Keep same field name for compatibility
        current: parseFloat(currentPercentage.toFixed(2)),
        target: parseFloat(targetPercentage),
        difference: parseFloat(difference.toFixed(2)),
        status: Math.abs(difference) < 2 ? 'ok' : Math.abs(difference) < 5 ? 'warning' : 'alert'
      };
    })
    .filter(d => d.current > 0 || d.target > 0) // Only show categories with value
    .sort((a, b) => b.current - a.current); // Sort by current allocation
  };

  const calculateAllocationComparison = (categoryTotals, totalValue, targetAllocation) => {
    // Create comparison array with all asset classes (MACRO)
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
    // Separate cash deposits from asset purchases for accurate tracking
    // "Versato" = cash deposits (what you put in)
    // "Valore" = current value of assets (what you have now with returns)

    // Filter to only include tickers in current filtered portfolio
    const portfolioTickers = new Set(currentPortfolio.filter(p => !p.isCash).map(p => p.ticker));

    // Get all transactions (cash + assets) for filtered portfolio
    const allTransactions = transactions.filter(tx =>
      tx.isCash || tx.macroCategory === 'Cash' || portfolioTickers.has(tx.ticker)
    );

    // Group by month
    const months = {};

    allTransactions.forEach(tx => {
      const monthKey = format(new Date(tx.date), 'MMM yyyy');
      if (!months[monthKey]) {
        months[monthKey] = {
          month: monthKey,
          cashDeposits: 0,      // Versato (deposits)
          cashWithdrawals: 0,   // Prelevato (withdrawals)
          assetPurchases: 0,    // Acquisti asset
          assetSales: 0         // Vendite asset
        };
      }

      const isCash = tx.isCash || tx.macroCategory === 'Cash';
      const amount = tx.quantity * tx.price;
      const commission = tx.commission || 0;

      if (isCash) {
        // Cash transaction
        if (tx.type === 'buy') {
          months[monthKey].cashDeposits += amount; // Deposito
        } else if (tx.type === 'sell') {
          months[monthKey].cashWithdrawals += amount; // Prelievo
        }
      } else {
        // Asset transaction (only for filtered assets)
        if (tx.type === 'buy') {
          months[monthKey].assetPurchases += (amount + commission); // Acquisto asset
        } else if (tx.type === 'sell') {
          months[monthKey].assetSales += (amount - commission); // Vendita asset
        }
      }
    });

    // Calculate current portfolio value and cost for filtered assets only
    const filteredAssets = currentPortfolio.filter(p => !p.isCash);
    const totalCurrentValue = filteredAssets.reduce((sum, p) => sum + (p.marketValue || 0), 0);
    const totalInvested = filteredAssets.reduce((sum, p) => sum + p.totalCost, 0);

    // Calculate cumulative values month by month
    let cumulativeDeposits = 0;
    let cumulativeWithdrawals = 0;
    let cumulativePurchases = 0;
    let cumulativeSales = 0;

    return Object.values(months).map((m, index, array) => {
      cumulativeDeposits += m.cashDeposits;
      cumulativeWithdrawals += m.cashWithdrawals;
      cumulativePurchases += m.assetPurchases;
      cumulativeSales += m.assetSales;

      // "Versato" = quanto hai messo in totale (deposits - withdrawals)
      const versato = cumulativeDeposits - cumulativeWithdrawals;

      // Calculate value progression based on actual portfolio performance
      // For historical months, estimate based on current ROI
      // For final month, use actual current value
      const isLastMonth = index === array.length - 1;

      let value;
      if (isLastMonth) {
        // Use actual current value
        value = totalCurrentValue;
      } else {
        // Estimate based on invested amount and current ROI
        const investedAtThisPoint = cumulativePurchases - cumulativeSales;
        const roi = totalInvested > 0 ? (totalCurrentValue / totalInvested) : 1;
        value = investedAtThisPoint * roi;
      }

      return {
        month: m.month,
        versato: parseFloat(versato.toFixed(2)),      // Quanto hai versato (linea verde)
        value: parseFloat(value.toFixed(2))            // Valore attuale con rendimento (linea blu)
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
  const hasFullPortfolio = fullPortfolio.length > 0;
  const allFiltersDisabled = Object.values(filters).every(v => v === false);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Panoramica del tuo portafoglio</p>
          <div className="flex items-center gap-2 mt-2">
            <Calendar className="w-4 h-4 text-primary-600" />
            <p className="text-sm text-primary-600 font-medium">
              Oggi: {format(new Date(), 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        {hasFullPortfolio && (
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

      {/* Date Filter Buttons */}
      {hasFullPortfolio && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600" />
              Filtra per Periodo
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Predefined periods */}
            <button
              onClick={() => setDateFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'all'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tutto
            </button>
            <button
              onClick={() => setDateFilter('ytd')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'ytd'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              YTD
            </button>
            <button
              onClick={() => setDateFilter('3m')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === '3m'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              3 Mesi
            </button>
            <button
              onClick={() => setDateFilter('6m')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === '6m'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              6 Mesi
            </button>
            <button
              onClick={() => setDateFilter('1y')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === '1y'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              1 Anno
            </button>

            {/* Separator */}
            {availableYears.length > 0 && (
              <div className="w-px bg-gray-300 mx-2"></div>
            )}

            {/* Year buttons (only show if there are transactions in those years) */}
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setDateFilter(year.toString())}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateFilter === year.toString()
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Seleziona un periodo per filtrare tutte le statistiche e i grafici
          </p>
        </div>
      )}

      {!hasFullPortfolio ? (
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
      ) : allFiltersDisabled ? (
        <div className="card text-center py-12 bg-orange-50 border-2 border-orange-200">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-orange-900 mb-2">
            Nessun Filtro Selezionato
          </h3>
          <p className="text-orange-700 mb-6">
            Seleziona almeno una Asset Class dai filtri sopra per visualizzare la dashboard
          </p>
          <p className="text-sm text-orange-600">
            💡 Suggerimento: Usa il pulsante "Seleziona Tutti" per abilitare tutti i filtri rapidamente
          </p>
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

          {/* Stats Cards - Investimenti */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Riepilogo Investimenti</h3>
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
          </div>

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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Andamento Portafoglio
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Confronto tra importo versato e valore con rendimento
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorVersato" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip formatter={(value) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} />
                  <Legend />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" name="Valore con Rendimento" />
                  <Area type="monotone" dataKey="versato" stroke="#10b981" fillOpacity={1} fill="url(#colorVersato)" name="Importo Versato" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium">VALORE CON RENDIMENTO</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Quanto valgono i tuoi asset filtrati oggi (include guadagni/perdite)
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-600 font-medium">IMPORTO VERSATO</p>
                  <p className="text-sm text-green-700 mt-1">
                    Quanto hai depositato in totale (depositi - prelievi)
                  </p>
                </div>
              </div>
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
