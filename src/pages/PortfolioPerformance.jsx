import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, Activity, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { getTransactions } from '../services/localStorageService';
import { fetchMultipleHistoricalPrices, buildMonthlyPriceTable, getPriceForMonth } from '../services/historicalPriceService';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';

function PortfolioPerformance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('ticker'); // 'ticker', 'macro', 'micro'
  const [monthlyData, setMonthlyData] = useState([]);
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
    monthsTracked: 0
  });

  useEffect(() => {
    calculatePerformance();
  }, []);

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
      const lastDate = new Date();

      // Get all months between first transaction and now
      const months = eachMonthOfInterval({ start: firstDate, end: lastDate });

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
        priceTables[ticker] = buildMonthlyPriceTable(historicalPricesMap[ticker] || []);
      });

      console.log(`✅ Historical prices fetched. Building monthly portfolio values...`);

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
            // Get historical price for this month
            const historicalPrice = getPriceForMonth(priceTables[holding.ticker], monthKey);

            // If no historical price found, use average cost as fallback
            const price = historicalPrice || (holding.totalCost / holding.quantity);
            const value = holding.quantity * price;

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
        const monthlyReturns = [];
        for (let i = 1; i < monthlyGrowth.length; i++) {
          const prevMonth = monthlyGrowth[i - 1];
          const currMonth = monthlyGrowth[i];

          // Calculate net cash flow (new investments) for this month
          const netCashFlow = currMonth.invested - prevMonth.invested;

          // Modified Dietz return: (endValue - startValue - netCashFlow) / startValue
          if (prevMonth.total > 0) {
            const monthReturn = currMonth.total - prevMonth.total - netCashFlow;
            const monthReturnPercent = (monthReturn / prevMonth.total) * 100;

            monthlyReturns.push({
              month: currMonth.month,
              return: monthReturnPercent
            });
          }
        }

        const avgMonthlyReturn = monthlyReturns.length > 0
          ? monthlyReturns.reduce((sum, r) => sum + r.return, 0) / monthlyReturns.length
          : 0;

        const bestMonth = monthlyReturns.length > 0
          ? monthlyReturns.reduce((max, r) => r.return > max.return ? r : max, monthlyReturns[0])
          : null;

        const worstMonth = monthlyReturns.length > 0
          ? monthlyReturns.reduce((min, r) => r.return < min.return ? r : min, monthlyReturns[0])
          : null;

        // Count unique assets in final month
        const uniqueTickers = Object.keys(lastMonth.byTicker).length;

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
          monthsTracked: monthlyGrowth.length
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
              Questa pagina utilizza prezzi storici reali recuperati da Google Finance tramite Google Apps Script.
              I rendimenti sono calcolati con il metodo Modified Dietz, che esclude correttamente i flussi di cassa (nuovi acquisti/vendite).
              Il cash è escluso da tutti i calcoli di performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PortfolioPerformance;
