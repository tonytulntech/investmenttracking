import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getTransactions } from '../services/localStorageService';
import { format, parseISO, endOfMonth, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';
import { fetchMultipleHistoricalPrices, buildMonthlyPriceTable } from '../services/historicalPriceService';
import { getCachedPrices } from '../services/priceCache';

const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const MONTH_NUMBERS = {
  '01': 'gen', '02': 'feb', '03': 'mar', '04': 'apr',
  '05': 'mag', '06': 'giu', '07': 'lug', '08': 'ago',
  '09': 'set', '10': 'ott', '11': 'nov', '12': 'dic'
};

// Category colors for consistent visualization
const CATEGORY_COLORS = {
  'ETF': '#3b82f6',
  'ETC': '#8b5cf6',
  'ETN': '#10b981',
  'Azioni': '#f59e0b',
  'Obbligazioni': '#ef4444',
  'Crypto': '#ec4899',
  'Materie Prime': '#06b6d4',
  'Monetario': '#84cc16',
  'Immobiliare': '#f97316',
  'Cash': '#6b7280',
  'Totale': '#1f2937'
};

function Patrimonio() {
  const [selectedYear, setSelectedYear] = useState('all'); // 'all' or specific year
  const [selectedView, setSelectedView] = useState('all'); // 'income', 'expense', 'investments', 'all'
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' or specific category
  const [transactions, setTransactions] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [monthlyMarketValues, setMonthlyMarketValues] = useState({}); // { '2021-01': 1000, '2021-02': 1100, ... }

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = () => {
    const data = getTransactions();
    setTransactions(data);
  };

  // Calculate monthly market values for investments
  useEffect(() => {
    if (transactions.length === 0) {
      setLoadingPrices(false);
      return;
    }

    calculateMonthlyMarketValues();
  }, [transactions]);

  const calculateMonthlyMarketValues = async () => {
    setLoadingPrices(true);

    try {
      // Filter only asset transactions (exclude Cash)
      const assetTransactions = transactions.filter(tx => {
        const isCash = tx.isCash || tx.macroCategory === 'Cash';
        return !isCash;
      });

      if (assetTransactions.length === 0) {
        setMonthlyMarketValues({});
        setLoadingPrices(false);
        return;
      }

      // Get date range
      const sortedTx = assetTransactions
        .filter(tx => tx.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const firstDate = parseISO(sortedTx[0].date);
      const lastDate = new Date(); // Include current month

      // Get unique tickers
      const tickers = [...new Set(assetTransactions.map(tx => tx.ticker))];

      // Fetch historical prices
      const historicalPricesMap = await fetchMultipleHistoricalPrices(
        tickers,
        format(firstDate, 'yyyy-MM-dd'),
        format(lastDate, 'yyyy-MM-dd')
      );

      // Build monthly price tables
      const priceTables = {};
      tickers.forEach(ticker => {
        priceTables[ticker] = buildMonthlyPriceTable(historicalPricesMap[ticker] || []);
      });

      // Get current prices from cache for recent months
      const currentPrices = getCachedPrices() || {};

      // Calculate market value for each month
      const marketValues = {};

      // Get all unique year-month periods from transactions
      const periods = new Set();
      assetTransactions.forEach(tx => {
        const txDate = parseISO(tx.date);
        const monthKey = format(txDate, 'yyyy-MM');
        periods.add(monthKey);
      });

      // Also add months from firstDate to today
      let currentMonth = firstDate;
      while (currentMonth <= lastDate) {
        periods.add(format(currentMonth, 'yyyy-MM'));
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      }

      // Calculate holdings and market value for each month
      const sortedPeriods = Array.from(periods).sort();

      sortedPeriods.forEach(monthKey => {
        const monthDate = parseISO(`${monthKey}-01`);
        const monthEnd = endOfMonth(monthDate);

        // Get all transactions up to this month
        const txUpToMonth = assetTransactions.filter(tx => {
          const txDate = parseISO(tx.date);
          return !isAfter(txDate, monthEnd);
        });

        // Calculate holdings
        const holdings = {};
        txUpToMonth.forEach(tx => {
          if (!holdings[tx.ticker]) {
            holdings[tx.ticker] = { quantity: 0 };
          }

          if (tx.type === 'buy') {
            holdings[tx.ticker].quantity += tx.quantity;
          } else if (tx.type === 'sell') {
            holdings[tx.ticker].quantity -= tx.quantity;
          }
        });

        // Calculate market value
        let totalValue = 0;
        Object.entries(holdings).forEach(([ticker, holding]) => {
          if (holding.quantity > 0) {
            const priceTable = priceTables[ticker] || {};
            let price = priceTable[monthKey];

            // Fallback to last known price
            if (!price && Object.keys(priceTable).length > 0) {
              const availableMonths = Object.keys(priceTable).sort().reverse();
              for (const availableMonth of availableMonths) {
                if (availableMonth <= monthKey) {
                  price = priceTable[availableMonth];
                  break;
                }
              }
            }

            // Fallback to current price for recent months
            if (!price && currentPrices[ticker]) {
              price = currentPrices[ticker];
            }

            if (price) {
              totalValue += holding.quantity * price;
            }
          }
        });

        marketValues[monthKey] = totalValue;
      });

      setMonthlyMarketValues(marketValues);
      setLoadingPrices(false);
      console.log('📊 Monthly market values calculated:', marketValues);
    } catch (error) {
      console.error('Error calculating market values:', error);
      setLoadingPrices(false);
    }
  };

  // Get available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set();
    transactions.forEach(tx => {
      if (tx.date) {
        const year = new Date(tx.date).getFullYear();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Get available categories from transactions
  const availableCategories = useMemo(() => {
    const categories = new Set();
    transactions.forEach(tx => {
      const category = tx.macroCategory || tx.category || 'Cash';
      categories.add(category);
    });
    return Array.from(categories).sort();
  }, [transactions]);

  // Process transactions to get income/expense/investments by category and month
  const processedData = useMemo(() => {
    const data = {
      income: {},
      expense: {},
      investments: {},
      periods: new Set() // Track all year-month periods
    };

    // Initialize categories
    Object.keys(CATEGORY_COLORS).forEach(category => {
      if (category !== 'Totale') {
        data.income[category] = {};
        data.expense[category] = {};
        data.investments[category] = {};
      }
    });

    // Process transactions
    transactions.forEach(tx => {
      if (!tx.date) return;

      const txDate = parseISO(tx.date);
      const year = txDate.getFullYear();
      const monthNum = format(txDate, 'MM');
      const month = MONTH_NUMBERS[monthNum];

      // Filter by year (if not 'all')
      if (selectedYear !== 'all' && year !== parseInt(selectedYear)) return;

      const category = tx.macroCategory || tx.category || 'Cash';

      // Filter by category (if not 'all')
      if (selectedCategory !== 'all' && category !== selectedCategory) return;

      const amount = parseFloat(tx.price) * parseFloat(tx.quantity);

      if (isNaN(amount)) return;

      // Create period key (for 'all' view: 'YYYY-MM', for single year: 'month')
      const periodKey = selectedYear === 'all' ? `${year}-${monthNum}` : month;
      data.periods.add(periodKey);

      // Initialize category if not exists
      if (!data.income[category]) {
        data.income[category] = {};
        data.expense[category] = {};
        data.investments[category] = {};
      }

      // Initialize period for this category
      if (!data.income[category][periodKey]) {
        data.income[category][periodKey] = 0;
        data.expense[category][periodKey] = 0;
        data.investments[category][periodKey] = 0;
      }

      // Logic:
      // - Income: Cash with cashFlowType='income' + asset sales (sell)
      // - Expense: Cash with cashFlowType='expense' (real expenses)
      // - Investments: Asset purchases (buy) - NOT expenses, they convert cash to assets!

      if (category === 'Cash' && tx.cashFlowType) {
        // Cash transactions use cashFlowType
        if (tx.cashFlowType === 'income') {
          data.income[category][periodKey] += amount;
        } else if (tx.cashFlowType === 'expense') {
          data.expense[category][periodKey] += amount;
        }
      } else {
        // Asset transactions
        if (tx.type === 'buy') {
          // Investments: buying assets (NOT expenses!)
          data.investments[category][periodKey] += amount;
        } else if (tx.type === 'sell') {
          // Income: selling assets
          data.income[category][periodKey] += amount;
        }
      }
    });

    // Convert periods Set to sorted array
    data.periods = Array.from(data.periods).sort();

    return data;
  }, [transactions, selectedYear, selectedCategory]);

  // Prepare chart data
  const chartData = useMemo(() => {
    // Use periods from processedData (either year-month or just month)
    const periods = selectedYear === 'all' ? processedData.periods : MONTHS;

    let cumulativeIncome = 0;
    let cumulativeExpense = 0;
    let cumulativeInvestments = 0;

    const data = periods.map(period => {
      // Create display label for period
      let displayLabel = period;
      if (selectedYear === 'all' && period.includes('-')) {
        // Format: '2021-01' -> 'gen 2021'
        const [year, monthNum] = period.split('-');
        const monthName = MONTH_NUMBERS[monthNum];
        displayLabel = `${monthName} ${year}`;
      }

      const point = {
        month: period,
        displayMonth: displayLabel
      };

      let totalIncome = 0;
      let totalExpense = 0;
      let totalInvestments = 0;

      Object.keys(processedData.income).forEach(category => {
        const incomeValue = processedData.income[category][period] || 0;
        const expenseValue = processedData.expense[category][period] || 0;
        const investmentValue = processedData.investments[category][period] || 0;

        totalIncome += incomeValue;
        totalExpense += expenseValue;
        totalInvestments += investmentValue;
      });

      point.totalIncome = totalIncome;
      point.totalExpense = totalExpense;
      point.totalInvestments = totalInvestments;
      // Net Patrimonio = Income - Expense (investments don't reduce net worth!)
      point.net = totalIncome - totalExpense;

      // Calculate cumulative values (for "Dall'inizio" view)
      cumulativeIncome += totalIncome;
      cumulativeExpense += totalExpense;
      cumulativeInvestments += totalInvestments;

      point.cumulativeIncome = cumulativeIncome;
      point.cumulativeExpense = cumulativeExpense;
      point.cumulativeInvestments = cumulativeInvestments;

      // Calculate cash balance = Income - Expense - Investments
      // (this is the actual cash remaining, since investments consume cash)
      point.cashBalance = cumulativeIncome - cumulativeExpense - cumulativeInvestments;

      // Get market value of investments for this period
      // For single-year view, we need to construct the full monthKey
      let monthKey = period;
      if (selectedYear !== 'all') {
        // period is just 'gen', 'feb', etc. - need to add year
        const monthIndex = MONTHS.indexOf(period);
        if (monthIndex >= 0) {
          const year = parseInt(selectedYear);
          const monthNum = String(monthIndex + 1).padStart(2, '0');
          monthKey = `${year}-${monthNum}`;
        }
      }

      const marketValue = monthlyMarketValues[monthKey] || 0;
      point.investmentsMarketValue = marketValue;

      // Total patrimonio REALE = Cash Balance + Market Value of Investments
      point.patrimonioReale = point.cashBalance + marketValue;

      return point;
    });

    return data;
  }, [processedData, selectedYear, monthlyMarketValues]);

  // Helper function to get period display label
  const getPeriodDisplay = (period) => {
    if (selectedYear === 'all' && period.includes('-')) {
      const [year, monthNum] = period.split('-');
      const monthName = MONTH_NUMBERS[monthNum];
      return `${monthName} '${year.slice(-2)}`;
    }
    return period;
  };

  // Get periods for tables
  const periods = useMemo(() => {
    return selectedYear === 'all' ? processedData.periods : MONTHS;
  }, [selectedYear, processedData.periods]);

  // Calculate totals for table
  const tableTotals = useMemo(() => {
    const totals = {
      income: {},
      expense: {},
      investments: {},
      net: {}
    };

    periods.forEach(period => {
      totals.income[period] = 0;
      totals.expense[period] = 0;
      totals.investments[period] = 0;
    });

    Object.keys(processedData.income).forEach(category => {
      periods.forEach(period => {
        totals.income[period] += processedData.income[category][period] || 0;
        totals.expense[period] += processedData.expense[category][period] || 0;
        totals.investments[period] += processedData.investments[category][period] || 0;
      });
    });

    periods.forEach(period => {
      // Net Patrimonio = Income - Expense (not including investments!)
      totals.net[period] = totals.income[period] - totals.expense[period];
    });

    return totals;
  }, [processedData, periods]);

  // Calculate current values (latest month)
  const currentValues = useMemo(() => {
    if (chartData.length === 0) {
      return {
        invested: 0,
        cash: 0,
        marketValue: 0,
        patrimonio: 0,
        gain: 0,
        gainPercent: 0
      };
    }

    const latest = chartData[chartData.length - 1];
    const invested = latest.cumulativeInvestments || 0;
    const cash = latest.cashBalance || 0;
    const marketValue = latest.investmentsMarketValue || 0;
    const patrimonio = latest.patrimonioReale || 0;
    const gain = marketValue - invested;
    const gainPercent = invested > 0 ? (gain / invested) * 100 : 0;

    return {
      invested,
      cash,
      marketValue,
      patrimonio,
      gain,
      gainPercent
    };
  }, [chartData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">Patrimonio & Flussi di Cassa</h1>
          <p className="text-gray-600 mt-1">
            Analisi patrimonio totale reale e flussi mensili di entrate/uscite/investimenti
          </p>
        </div>
      </div>

      {/* Current Values Summary */}
      {!loadingPrices && chartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-purple-700">Patrimonio Totale</span>
              <span className="text-2xl font-bold text-purple-900 mt-1">
                €{currentValues.patrimonio.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-blue-700">Investimenti (Mercato)</span>
              <span className="text-2xl font-bold text-blue-900 mt-1">
                €{currentValues.marketValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
              <span className={`text-xs mt-1 ${currentValues.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currentValues.gain >= 0 ? '+' : ''}€{currentValues.gain.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                {' '}({currentValues.gainPercent >= 0 ? '+' : ''}{currentValues.gainPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-green-700">Liquidità Disponibile</span>
              <span className="text-2xl font-bold text-green-900 mt-1">
                €{currentValues.cash.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="card bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700">Totale Investito (Costo)</span>
              <span className="text-2xl font-bold text-gray-900 mt-1">
                €{currentValues.invested.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loadingPrices && (
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <p className="text-blue-800">Caricamento prezzi storici per calcolo patrimonio reale...</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Anno
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="select"
            >
              <option value="all">Dall'inizio</option>
              {availableYears.length === 0 ? (
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
              ) : (
                availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Categoria
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="select"
            >
              <option value="all">Tutte le categorie</option>
              {availableCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Visualizzazione
            </label>
            <select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              className="select"
            >
              <option value="all">Tutto (Entrate, Uscite, Investimenti)</option>
              <option value="income">Solo Entrate</option>
              <option value="expense">Solo Uscite</option>
              <option value="investments">Solo Investimenti</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Andamento Mensile</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="displayMonth"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              angle={selectedYear === 'all' ? -45 : 0}
              textAnchor={selectedYear === 'all' ? 'end' : 'middle'}
              height={selectedYear === 'all' ? 80 : 30}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Legend />

            {/* Total lines (thicker) */}
            {(selectedView === 'income' || selectedView === 'all') && (
              <Line
                type="monotone"
                dataKey="totalIncome"
                name="Totale Entrate"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            )}
            {(selectedView === 'expense' || selectedView === 'all') && (
              <Line
                type="monotone"
                dataKey="totalExpense"
                name="Totale Uscite"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            )}
            {(selectedView === 'investments' || selectedView === 'all') && (
              <Line
                type="monotone"
                dataKey="totalInvestments"
                name="Totale Investimenti"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            )}
            {selectedView === 'all' && (
              <>
                <Line
                  type="monotone"
                  dataKey="cashBalance"
                  name="Liquidità Disponibile"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="investmentsMarketValue"
                  name="Valore Investimenti (Mercato)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="patrimonioReale"
                  name="Patrimonio Totale Reale"
                  stroke="#8b5cf6"
                  strokeWidth={4}
                  dot={{ r: 5 }}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table - Income */}
      {(selectedView === 'income' || selectedView === 'all') && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-success-600" />
            <h3 className="text-lg font-semibold text-gray-900">Entrate</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Categoria</th>
                  {periods.map(period => (
                    <th key={period} className="text-right py-2 px-3 font-medium text-gray-700">
                      {getPeriodDisplay(period)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(processedData.income).sort().map(category => {
                  const hasData = periods.some(p => (processedData.income[category][p] || 0) > 0);
                  if (!hasData) return null;

                  return (
                    <tr key={category} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-900">{category}</td>
                      {periods.map(period => (
                        <td key={period} className="text-right py-2 px-3 text-success-700">
                          {(processedData.income[category][period] || 0) > 0
                            ? `€${processedData.income[category][period].toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
                            : '-'
                          }
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300 font-bold bg-success-50">
                  <td className="py-2 px-3 text-gray-900">Totale Entrate</td>
                  {periods.map(period => (
                    <td key={period} className="text-right py-2 px-3 text-success-700">
                      €{tableTotals.income[period].toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table - Expenses */}
      {(selectedView === 'expense' || selectedView === 'all') && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-danger-600" />
            <h3 className="text-lg font-semibold text-gray-900">Uscite</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Categoria</th>
                  {periods.map(period => (
                    <th key={period} className="text-right py-2 px-3 font-medium text-gray-700">
                      {getPeriodDisplay(period)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(processedData.expense).sort().map(category => {
                  const hasData = periods.some(p => (processedData.expense[category][p] || 0) > 0);
                  if (!hasData) return null;

                  return (
                    <tr key={category} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-900">{category}</td>
                      {periods.map(period => (
                        <td key={period} className="text-right py-2 px-3 text-danger-700">
                          {(processedData.expense[category][period] || 0) > 0
                            ? `€${processedData.expense[category][period].toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
                            : '-'
                          }
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300 font-bold bg-danger-50">
                  <td className="py-2 px-3 text-gray-900">Totale Uscite</td>
                  {periods.map(period => (
                    <td key={period} className="text-right py-2 px-3 text-danger-700">
                      €{tableTotals.expense[period].toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table - Investments */}
      {(selectedView === 'investments' || selectedView === 'all') && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Investimenti</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Categoria</th>
                  {periods.map(period => (
                    <th key={period} className="text-right py-2 px-3 font-medium text-gray-700">
                      {getPeriodDisplay(period)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(processedData.investments).sort().map(category => {
                  const hasData = periods.some(p => (processedData.investments[category][p] || 0) > 0);
                  if (!hasData) return null;

                  return (
                    <tr key={category} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-900">{category}</td>
                      {periods.map(period => (
                        <td key={period} className="text-right py-2 px-3 text-primary-700">
                          {(processedData.investments[category][period] || 0) > 0
                            ? `€${processedData.investments[category][period].toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
                            : '-'
                          }
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300 font-bold bg-primary-50">
                  <td className="py-2 px-3 text-gray-900">Totale Investimenti</td>
                  {periods.map(period => (
                    <td key={period} className="text-right py-2 px-3 text-primary-700">
                      €{tableTotals.investments[period].toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table - Net Result */}
      {selectedView === 'all' && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Risultato Netto</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Periodo</th>
                  {periods.map(period => (
                    <th key={period} className="text-right py-2 px-3 font-medium text-gray-700">
                      {getPeriodDisplay(period)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="font-bold bg-gray-50">
                  <td className="py-2 px-3 text-gray-900">Entrate - Uscite</td>
                  {periods.map(period => {
                    const net = tableTotals.net[period];
                    return (
                      <td
                        key={period}
                        className={`text-right py-2 px-3 ${net >= 0 ? 'text-success-700' : 'text-danger-700'}`}
                      >
                        {net >= 0 ? '+' : ''}€{net.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Patrimonio;
