import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, Activity, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { getTransactions } from '../services/localStorageService';
import { fetchMultipleHistoricalPrices, buildMonthlyPriceTable } from '../services/historicalPriceService';
import { getCachedPrices } from '../services/priceCache';
import { calculateAllMetrics } from '../services/advancedMetricsService';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';

function PortfolioPerformance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('ticker'); // 'ticker', 'macro', 'micro'
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'ytd', '2024', '2023', etc.
  const [monthlyData, setMonthlyData] = useState([]);
  const [monthlyReturns, setMonthlyReturns] = useState([]); // Array of {month, return, monthKey}
  const [availableYears, setAvailableYears] = useState([]);
  const [statistics, setStatistics] = useState({
    totalAssets: 0,
    totalValue: 0,
    totalInvested: 0,
    totalReturn: 0,
    totalReturnPercent: 0,
    avgMonthlyReturn: 0,
    bestMonth: null,
    worstMonth: null,
    startDate: null,
    monthsTracked: 0,
    // Advanced metrics
    cagr: 0,
    maxDrawdown: 0,
    recoveryTime: 0,
    sharpeRatio: 0,
    sortinoRatio: 0,
    volatility: 0
  });

  useEffect(() => {
    calculatePerformance();
  }, [dateFilter]); // Recalculate when date filter changes

  const calculatePerformance = async () => {
    setLoading(true);
    setError(null);

    try {
      const transactions = getTransactions();

      // Filter out cash transactions
      const assetTransactions = transactions.filter(tx => {
        const isCash = tx.isCash || tx.macroCategory === 'Cash';
        return !isCash;
      });

      if (assetTransactions.length === 0) {
        setError('Nessuna transazione di asset trovata. Aggiungi transazioni per vedere la performance.');
        setLoading(false);
        return;
      }

      // Get date range
      const sortedTransactions = assetTransactions
        .filter(tx => tx.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const firstDate = parseISO(sortedTransactions[0].date);
      const now = new Date();
      // Use end of current month to ensure we include the full current month
      const lastDate = endOfMonth(now);

      console.log(`📅 Date range: ${format(firstDate, 'yyyy-MM-dd')} to ${format(lastDate, 'yyyy-MM-dd')} (including current month)`);

      // Get all months between first transaction and now (including current month)
      const allMonths = eachMonthOfInterval({ start: firstDate, end: lastDate });

      // Calculate available years for filters
      const years = new Set();
      allMonths.forEach(month => {
        years.add(month.getFullYear());
      });
      setAvailableYears(Array.from(years).sort((a, b) => b - a));

      // Filter months based on dateFilter
      let months = allMonths;
      if (dateFilter !== 'all') {
        if (dateFilter === 'ytd') {
          const yearStart = new Date(now.getFullYear(), 0, 1);
          months = allMonths.filter(m => m >= yearStart);
        } else if (!isNaN(dateFilter)) {
          // Specific year - show FROM START TO END OF SELECTED YEAR (cumulative)
          const year = parseInt(dateFilter);
          const yearEnd = new Date(year, 11, 31, 23, 59, 59); // December 31st of that year
          months = allMonths.filter(m => m <= yearEnd);
          console.log(`📅 Filtering from start to end of ${year} (${months.length} months)`);
        }
      }

      // Get unique tickers
      const tickers = [...new Set(assetTransactions.map(tx => tx.ticker))];

      console.log(`📊 Fetching historical prices for ${tickers.length} tickers from ${format(firstDate, 'yyyy-MM-dd')} to ${format(lastDate, 'yyyy-MM-dd')}...`);

      // Fetch historical prices for all tickers
      const historicalPricesMap = await fetchMultipleHistoricalPrices(
        tickers,
        format(firstDate, 'yyyy-MM-dd'),
        format(lastDate, 'yyyy-MM-dd')
      );

      // Build monthly price tables for quick lookup
      const priceTables = {};
      tickers.forEach(ticker => {
        const table = buildMonthlyPriceTable(historicalPricesMap[ticker] || []);
        priceTables[ticker] = table;

        // DEBUG: Log price table for first ticker to see what we have
        if (ticker === 'ACWIA.MI') {
          console.log(`📊 Price table for ${ticker}: 2021-01=${table['2021-01']}, 2021-02=${table['2021-02']}, 2025-10=${table['2025-10']}, 2025-11=${table['2025-11']}, totalMonths=${Object.keys(table).length}`);
        }
      });

      // Get current prices from cache to use as fallback for recent months
      const currentPrices = getCachedPrices() || {};
      console.log(`💰 Loaded ${Object.keys(currentPrices).length} current prices from cache for fallback`, currentPrices);

      console.log(`✅ Historical prices fetched. Building monthly portfolio values...`);
      console.log(`📅 Processing ${months.length} months:`, months.map(m => format(m, 'yyyy-MM')).join(', '));

      // Calculate portfolio value for each month using REAL historical prices
      const monthlyGrowth = [];

      months.forEach(monthDate => {
        const monthKey = format(monthDate, 'yyyy-MM');
        const monthEnd = endOfMonth(monthDate);

        // Get all transactions up to this month
        const txUpToMonth = assetTransactions.filter(tx => {
          const txDate = parseISO(tx.date);
          return !isAfter(txDate, monthEnd);
        });

        // Calculate holdings at end of month
        const holdings = {};
        let totalInvested = 0;

        txUpToMonth.forEach(tx => {
          if (!holdings[tx.ticker]) {
            holdings[tx.ticker] = {
              quantity: 0,
              totalCost: 0,
              ticker: tx.ticker,
              name: tx.name || tx.ticker,
              macroCategory: tx.macroCategory || tx.category || 'Altro',
              microCategory: tx.microCategory || tx.subCategory || 'N/A'
            };
          }

          const amount = tx.quantity * tx.price;
          const commission = tx.commission || 0;

          if (tx.type === 'buy') {
            holdings[tx.ticker].quantity += tx.quantity;
            holdings[tx.ticker].totalCost += amount + commission;
            totalInvested += amount + commission;
          } else if (tx.type === 'sell') {
            holdings[tx.ticker].quantity -= tx.quantity;
            holdings[tx.ticker].totalCost -= amount;
            totalInvested -= amount - commission;
          }

          // Update categories from most recent transaction
          holdings[tx.ticker].macroCategory = tx.macroCategory || tx.category || holdings[tx.ticker].macroCategory;
          holdings[tx.ticker].microCategory = tx.microCategory || tx.subCategory || holdings[tx.ticker].microCategory;
        });

        // Calculate current value using REAL historical prices
        let totalValue = 0;
        const byTicker = {};
        const byMacro = {};
        const byMicro = {};

        Object.values(holdings).forEach(holding => {
          if (holding.quantity > 0) {
            // Get historical price for this month from price table
            // priceTables is an object with monthKey as keys, e.g., {"2024-01": 100, "2024-02": 102}
            const priceTable = priceTables[holding.ticker] || {};
            const historicalPrice = priceTable[monthKey];

            // NEW: Get last available historical price as better fallback
            let lastKnownPrice = null;
            if (!historicalPrice && Object.keys(priceTable).length > 0) {
              const availableMonths = Object.keys(priceTable).sort().reverse(); // Sort in descending order
              // Find the most recent month that's before or equal to current month
              for (const availableMonth of availableMonths) {
                if (availableMonth <= monthKey) {
                  lastKnownPrice = priceTable[availableMonth];
                  break;
                }
              }
            }

            // Improved fallback logic:
            // 1. Use historical price if available for this exact month
            // 2. Use current price from cache (for very recent months)
            // 3. Use last known historical price (carry forward last available price)
            // 4. Last resort: use average cost
            const currentPrice = currentPrices[holding.ticker]?.price;
            const avgCost = holding.totalCost / holding.quantity;
            const price = historicalPrice || currentPrice || lastKnownPrice || avgCost;
            const value = holding.quantity * price;

            // DEBUG: Enhanced debug logging for problematic months
            if (monthKey === '2021-02' || monthKey === '2025-11') {
              console.log(`🔍 DEBUG ${monthKey} - ${holding.ticker}:`, {
                historicalPrice,
                currentPrice,
                lastKnownPrice,
                avgCost: avgCost.toFixed(2),
                finalPrice: price.toFixed(2),
                fallbackUsed: !historicalPrice ? (currentPrice ? 'currentPrice' : (lastKnownPrice ? 'lastKnownPrice' : 'avgCost')) : 'historicalPrice',
                quantity: holding.quantity,
                value: value.toFixed(2)
              });
            }

            totalValue += value;

            // By Ticker
            byTicker[holding.ticker] = Math.round(value);

            // By MacroCategory
            const macro = holding.macroCategory || 'Altro';
            byMacro[macro] = (byMacro[macro] || 0) + value;

            // By MicroCategory
            const micro = holding.microCategory || 'N/A';
            byMicro[micro] = (byMicro[micro] || 0) + value;
          }
        });

        // Round macro and micro values
        Object.keys(byMacro).forEach(key => {
          byMacro[key] = Math.round(byMacro[key]);
        });
        Object.keys(byMicro).forEach(key => {
          byMicro[key] = Math.round(byMicro[key]);
        });

        monthlyGrowth.push({
          month: format(monthDate, 'MMM yyyy', { locale: it }),
          monthKey,
          date: monthDate,
          byTicker,
          byMacro,
          byMicro,
          total: Math.round(totalValue),
          invested: Math.round(totalInvested)
        });
      });

      setMonthlyData(monthlyGrowth);

      // Calculate statistics
      if (monthlyGrowth.length > 0) {
        const firstMonth = monthlyGrowth[0];
        const lastMonth = monthlyGrowth[monthlyGrowth.length - 1];

        const totalValue = lastMonth.total;
        const totalInvested = lastMonth.invested;
        const totalReturn = totalValue - totalInvested;
        const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

        // Calculate monthly returns (excluding first month)
        const calculatedMonthlyReturns = [];
        for (let i = 1; i < monthlyGrowth.length; i++) {
          const prevMonth = monthlyGrowth[i - 1];
          const currMonth = monthlyGrowth[i];

          // Calculate net cash flow (new investments) for this month
          const netCashFlow = currMonth.invested - prevMonth.invested;

          // Time-Weighted Return: (endValue - expectedValue) / expectedValue
          // expectedValue = startValue + netCashFlow (valore atteso senza rendimento)
          if (prevMonth.total > 0) {
            const expectedValue = prevMonth.total + netCashFlow;
            const monthReturn = currMonth.total - expectedValue;
            const monthReturnPercent = expectedValue > 0 ? (monthReturn / expectedValue) * 100 : 0;

            // DEBUG: Enhanced debug logging for problematic months
            if (currMonth.monthKey === '2021-02' || currMonth.monthKey === '2025-11') {
              console.log(`🔍 RETURN CALC ${currMonth.monthKey}:`, {
                prevTotal: prevMonth.total.toFixed(2),
                currTotal: currMonth.total.toFixed(2),
                netCashFlow: netCashFlow.toFixed(2),
                expectedValue: expectedValue.toFixed(2),
                monthReturn: monthReturn.toFixed(2),
                monthReturnPercent: monthReturnPercent.toFixed(2) + '%',
                formula: `(${currMonth.total.toFixed(2)} - ${expectedValue.toFixed(2)}) / ${expectedValue.toFixed(2)} = ${monthReturnPercent.toFixed(2)}%`
              });
            }

            calculatedMonthlyReturns.push({
              month: currMonth.month,
              monthKey: currMonth.monthKey,
              return: monthReturnPercent,
              value: currMonth.total,
              invested: currMonth.invested,
              netCashFlow
            });
          }
        }

        setMonthlyReturns(calculatedMonthlyReturns);

        const avgMonthlyReturn = calculatedMonthlyReturns.length > 0
          ? calculatedMonthlyReturns.reduce((sum, r) => sum + r.return, 0) / calculatedMonthlyReturns.length
          : 0;

        const bestMonth = calculatedMonthlyReturns.length > 0
          ? calculatedMonthlyReturns.reduce((max, r) => r.return > max.return ? r : max, calculatedMonthlyReturns[0])
          : null;

        const worstMonth = calculatedMonthlyReturns.length > 0
          ? calculatedMonthlyReturns.reduce((min, r) => r.return < min.return ? r : min, calculatedMonthlyReturns[0])
          : null;

        // Count unique assets in final month
        const uniqueTickers = Object.keys(lastMonth.byTicker).length;

        // Calculate advanced metrics using the service
        const advancedMetrics = calculateAllMetrics(calculatedMonthlyReturns, 2, totalInvested); // 2% risk-free rate
        console.log('📊 Advanced metrics:', advancedMetrics);

        setStatistics({
          totalAssets: uniqueTickers,
          totalValue,
          totalInvested,
          totalReturn,
          totalReturnPercent,
          avgMonthlyReturn,
          bestMonth,
          worstMonth,
          startDate: firstDate,
          monthsTracked: monthlyGrowth.length,
          // Advanced metrics
          cagr: advancedMetrics.cagr,
          maxDrawdown: advancedMetrics.maxDrawdown,
          recoveryTime: advancedMetrics.recoveryTime,
          sharpeRatio: advancedMetrics.sharpeRatio,
          sortinoRatio: advancedMetrics.sortinoRatio,
          volatility: advancedMetrics.volatility
        });
      }

      console.log('✅ Performance calculation complete');

    } catch (error) {
      console.error('Error calculating performance:', error);
      setError(`Errore nel calcolo della performance: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get chart data based on current view
  const getChartData = () => {
    return monthlyData.map(month => {
      let data = {
        month: month.month,
        total: month.total
      };

      if (view === 'ticker') {
        return { ...data, ...month.byTicker };
      } else if (view === 'macro') {
        return { ...data, ...month.byMacro };
      } else if (view === 'micro') {
        return { ...data, ...month.byMicro };
      }

      return data;
    });
  };

  // Get all unique keys for the current view
  const getDataKeys = () => {
    if (monthlyData.length === 0) return [];

    const keysSet = new Set();
    monthlyData.forEach(month => {
      let dataSource;
      if (view === 'ticker') {
        dataSource = month.byTicker;
      } else if (view === 'macro') {
        dataSource = month.byMacro;
      } else if (view === 'micro') {
        dataSource = month.byMicro;
      }

      Object.keys(dataSource).forEach(key => keysSet.add(key));
    });

    return Array.from(keysSet).sort();
  };

  // Generate colors for bars
  const getColorForKey = (key, index) => {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#f97316', // orange
      '#6366f1', // indigo
      '#14b8a6', // teal
      '#84cc16', // lime
      '#a855f7', // purple
      '#ef4444', // red
      '#6b7280', // gray
      '#22c55e', // emerald
      '#eab308', // yellow
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento dati storici...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Andamento Portafoglio</h1>
          <p className="text-gray-600 mt-1">Analisi dettagliata della performance e crescita del patrimonio</p>
        </div>

        <div className="card bg-red-50 border-2 border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Errore</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload
            .sort((a, b) => (b.value || 0) - (a.value || 0))
            .map((entry, index) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {formatCurrency(entry.value)}
              </p>
            ))}
          <p className="text-sm font-bold text-gray-900 mt-2 pt-2 border-t">
            Totale: {formatCurrency(total)}
          </p>
        </div>
      );
    }
    return null;
  };

  const chartData = getChartData();
  const dataKeys = getDataKeys();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Andamento Portafoglio</h1>
        <p className="text-gray-600 mt-1">Analisi dettagliata della performance con dati storici reali (esclude cash)</p>
      </div>

      {/* Date Filter */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Periodo</h3>
        <div className="flex flex-wrap gap-2">
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

          {availableYears.length > 0 && (
            <div className="w-px bg-gray-300 mx-2"></div>
          )}

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
      </div>

      {/* View Selector */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setView('ticker')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            view === 'ticker'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Per Ticker
        </button>
        <button
          onClick={() => setView('macro')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            view === 'macro'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Per Macro Categoria
        </button>
        <button
          onClick={() => setView('micro')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            view === 'micro'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Per Micro Categoria
        </button>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Valore Totale</span>
            <DollarSign className="w-5 h-5 text-primary-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(statistics.totalValue)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {statistics.totalAssets} asset • {statistics.monthsTracked} mesi
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Rendimento Totale</span>
            {statistics.totalReturn >= 0 ? (
              <TrendingUp className="w-5 h-5 text-success-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-danger-600" />
            )}
          </div>
          <div className={`text-2xl font-bold ${statistics.totalReturn >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {statistics.totalReturn >= 0 ? '+' : ''}{formatCurrency(statistics.totalReturn)}
          </div>
          <div className={`text-xs mt-1 ${statistics.totalReturnPercent >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {statistics.totalReturnPercent >= 0 ? '+' : ''}{statistics.totalReturnPercent.toFixed(2)}%
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Rendimento Medio Mensile</span>
            <Activity className="w-5 h-5 text-primary-600" />
          </div>
          <div className={`text-2xl font-bold ${statistics.avgMonthlyReturn >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {statistics.avgMonthlyReturn >= 0 ? '+' : ''}{statistics.avgMonthlyReturn.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Media mensile accurata
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Investito</span>
            <BarChart3 className="w-5 h-5 text-primary-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(statistics.totalInvested)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Capitale totale investito
          </div>
        </div>
      </div>

      {/* Best/Worst Month */}
      {(statistics.bestMonth || statistics.worstMonth) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {statistics.bestMonth && (
            <div className="card bg-green-50 border-2 border-green-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">Miglior Mese</p>
                  <p className="text-xs text-green-700">{statistics.bestMonth.month}</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-green-600">
                +{statistics.bestMonth.return.toFixed(2)}%
              </p>
            </div>
          )}

          {statistics.worstMonth && (
            <div className="card bg-red-50 border-2 border-red-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-900">Peggior Mese</p>
                  <p className="text-xs text-red-700">{statistics.worstMonth.month}</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-red-600">
                {statistics.worstMonth.return.toFixed(2)}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Advanced Statistics */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Statistiche Avanzate</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CAGR */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">CAGR</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className={`text-2xl font-bold ${statistics.cagr >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {statistics.cagr >= 0 ? '+' : ''}{statistics.cagr.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Tasso di crescita annuale composto
            </div>
          </div>

          {/* Maximum Drawdown */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Drawdown Massimo</span>
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              -{statistics.maxDrawdown.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Massima perdita dal picco
            </div>
          </div>

          {/* Recovery Time */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Tempo Recupero</span>
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {statistics.recoveryTime > 0 ? `${statistics.recoveryTime} mesi` : 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {statistics.recoveryTime > 0 ? 'Tempo per recuperare dal drawdown' : 'Non ancora recuperato o nessun drawdown'}
            </div>
          </div>

          {/* Sharpe Ratio */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Sharpe Ratio</span>
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            <div className={`text-2xl font-bold ${statistics.sharpeRatio >= 1 ? 'text-success-600' : statistics.sharpeRatio >= 0 ? 'text-gray-900' : 'text-danger-600'}`}>
              {statistics.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Rendimento aggiustato per rischio
            </div>
          </div>

          {/* Sortino Ratio */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Sortino Ratio</span>
              <BarChart3 className="w-5 h-5 text-cyan-600" />
            </div>
            <div className={`text-2xl font-bold ${statistics.sortinoRatio >= 1 ? 'text-success-600' : statistics.sortinoRatio >= 0 ? 'text-gray-900' : 'text-danger-600'}`}>
              {statistics.sortinoRatio === Infinity ? '∞' : statistics.sortinoRatio.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Considera solo downside risk
            </div>
          </div>

          {/* Volatility */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Volatilità</span>
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {statistics.volatility.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Deviazione standard annualizzata
            </div>
          </div>
        </div>

        {/* Info banner about metrics */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>ℹ️ Metriche Avanzate:</strong> CAGR misura il rendimento annuale composto. Sharpe &gt; 1 è buono, &gt; 2 è eccellente.
            Sortino si concentra sul rischio negativo. Volatilità indica quanto variano i rendimenti.
          </p>
        </div>
      </div>

      {/* Explanation Note */}
      {(statistics.bestMonth || statistics.worstMonth) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Nota:</strong> Miglior/Peggior mese si riferisce alla <strong>performance %</strong> di quel mese
            (quanto è cresciuto/diminuito il portafoglio), <strong>escludendo</strong> i nuovi investimenti o prelievi.
          </p>
        </div>
      )}

      {/* Monthly Returns Chart - Red/Green Bars */}
      {monthlyReturns.length > 0 && (
        <div className="card">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Rendimento Mensile (%)</h3>
            <p className="text-sm text-gray-600 mt-1">
              Performance mensile del portafoglio (esclude nuovi investimenti)
            </p>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyReturns}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => `${value.toFixed(2)}%`}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Bar dataKey="return" name="Rendimento %">
                {monthlyReturns.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.return >= 0 ? '#10b981' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Performance Table */}
      {monthlyReturns.length > 0 && (
        <div className="card">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">📊 Dettaglio Crescita Mensile del Patrimonio</h3>
            <p className="text-sm text-gray-600 mt-1">
              Valore totale portafoglio e variazione percentuale mese su mese
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="py-3 px-4 text-left font-semibold text-gray-900">Mese</th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-900">Valore Portafoglio</th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-900">Variazione vs Mese Precedente</th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-900">Rendimento Mensile %</th>
                </tr>
              </thead>
              <tbody>
                {monthlyReturns.map((monthData, index) => {
                  const prevMonthValue = index > 0 ? monthlyReturns[index - 1].value : (monthData.value - monthData.netCashFlow);
                  const valueChange = monthData.value - prevMonthValue;
                  const valueChangePercent = prevMonthValue > 0 ? (valueChange / prevMonthValue) * 100 : 0;
                  const isPositive = valueChange >= 0;
                  const isReturnPositive = monthData.return >= 0;

                  return (
                    <tr key={monthData.month} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {monthData.month}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        €{monthData.value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}€{valueChange.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        <span className="text-xs ml-2">
                          ({isPositive ? '+' : ''}{valueChangePercent.toFixed(2)}%)
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${isReturnPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isReturnPositive ? '+' : ''}{monthData.return.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50 border-t-2 border-blue-300">
                  <td className="py-3 px-4 font-bold text-blue-900">TOTALE</td>
                  <td className="py-3 px-4 text-right font-bold text-blue-900">
                    €{monthlyReturns[monthlyReturns.length - 1].value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-blue-900">
                    {(() => {
                      const firstValue = monthlyReturns[0].value - monthlyReturns[0].netCashFlow;
                      const lastValue = monthlyReturns[monthlyReturns.length - 1].value;
                      const totalChange = lastValue - firstValue;
                      const totalChangePercent = firstValue > 0 ? (totalChange / firstValue) * 100 : 0;
                      const isPositive = totalChange >= 0;
                      return (
                        <>
                          <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                            {isPositive ? '+' : ''}€{totalChange.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                          <span className={`text-xs ml-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            ({isPositive ? '+' : ''}{totalChangePercent.toFixed(2)}%)
                          </span>
                        </>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-blue-900">
                    {(() => {
                      const avgReturn = monthlyReturns.reduce((sum, m) => sum + m.return, 0) / monthlyReturns.length;
                      const isPositive = avgReturn >= 0;
                      return (
                        <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                          Avg: {isPositive ? '+' : ''}{avgReturn.toFixed(2)}%
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>ℹ️ Legenda:</strong>
              <span className="ml-2"><strong>Variazione vs Mese Precedente</strong> = Differenza totale valore portafoglio rispetto al mese prima (include depositi, prelievi e rendimenti).</span>
              <span className="ml-2"><strong>Rendimento Mensile %</strong> = Performance pura escludendo cash flows (Time-Weighted Return).</span>
            </p>
          </div>
        </div>
      )}

      {/* Stacked Bar Chart - Monthly Growth */}
      <div className="card">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Crescita Mensile del Patrimonio
            {view === 'ticker' && ' - Per Ticker'}
            {view === 'macro' && ' - Per Macro Categoria'}
            {view === 'micro' && ' - Per Micro Categoria'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Andamento del valore utilizzando prezzi storici reali (esclude cash)
          </p>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tickFormatter={(value) => `€${value.toLocaleString('it-IT')}`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ maxHeight: '100px', overflowY: 'auto' }}
              iconSize={10}
            />
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                fill={getColorForKey(key, index)}
                name={key}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line Chart - Total Value Over Time */}
      <div className="card">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Valore Totale nel Tempo</h3>
          <p className="text-sm text-gray-600 mt-1">Andamento complessivo del patrimonio con dati storici reali</p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tickFormatter={(value) => `€${value.toLocaleString('it-IT')}`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#000000"
              strokeWidth={3}
              dot={{ fill: '#000000', r: 4 }}
              name="Valore Totale"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Additional Info */}
      <div className="card bg-green-50 border-2 border-green-200">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900">✅ Dati Storici Reali</p>
            <p className="text-sm text-green-700 mt-1">
              Questa pagina utilizza <strong>prezzi storici reali</strong> recuperati da Google Finance tramite Google Apps Script.
              I rendimenti sono calcolati con il <strong>metodo Time-Weighted Return</strong>, che esclude correttamente i flussi di cassa (nuovi acquisti/vendite).
              I dati sono aggiornati fino ad <strong>oggi</strong>. Il cash è escluso da tutti i calcoli di performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PortfolioPerformance;
