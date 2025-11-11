import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, PieChart as PieChartIcon } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
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
        const currentMonthKey = format(new Date(), 'yyyy-MM');
        const isCurrentMonth = monthKey === currentMonthKey;

        Object.entries(holdings).forEach(([ticker, holding]) => {
          if (holding.quantity > 0) {
            const priceTable = priceTables[ticker] || {};
            let price = priceTable[monthKey];

            // For current month: prioritize current prices from cache over historical fallback
            if (!price && isCurrentMonth && currentPrices[ticker]) {
              price = currentPrices[ticker].price || currentPrices[ticker];
            }

            // For past months or if current price not available: fallback to last known historical price
            if (!price && Object.keys(priceTable).length > 0) {
              const availableMonths = Object.keys(priceTable).sort().reverse();
              for (const availableMonth of availableMonths) {
                if (availableMonth <= monthKey) {
                  const candidatePrice = priceTable[availableMonth];
                  // Only use this price if it's valid (not undefined/null/0)
                  if (candidatePrice && candidatePrice > 0) {
                    price = candidatePrice;
                    break;
                  }
                }
              }
            }

            // Final fallback to current price if still not found
            if (!price && currentPrices[ticker]) {
              price = currentPrices[ticker].price || currentPrices[ticker];
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

      // Debug: Show last 3 months values
      const sortedKeys = Object.keys(marketValues).sort();
      if (sortedKeys.length > 0) {
        const lastMonths = sortedKeys.slice(-3);
        console.log('💰 Last 3 months market values:');
        lastMonths.forEach(month => {
          console.log(`  ${month}: €${marketValues[month].toFixed(2)}`);
        });

        // Show detailed breakdown for latest month
        const lastMonth = sortedKeys[sortedKeys.length - 1];
        const lastMonthDate = parseISO(`${lastMonth}-01`);
        const lastMonthEnd = endOfMonth(lastMonthDate);
        const txUpToLastMonth = assetTransactions.filter(tx => {
          const txDate = parseISO(tx.date);
          return !isAfter(txDate, lastMonthEnd);
        });

        const finalHoldings = {};
        txUpToLastMonth.forEach(tx => {
          if (!finalHoldings[tx.ticker]) {
            finalHoldings[tx.ticker] = { quantity: 0, value: 0 };
          }
          if (tx.type === 'buy') {
            finalHoldings[tx.ticker].quantity += tx.quantity;
          } else if (tx.type === 'sell') {
            finalHoldings[tx.ticker].quantity -= tx.quantity;
          }
        });

        console.log(`\n📋 Holdings breakdown for ${lastMonth}:`);
        const currentMonthKeyDebug = format(new Date(), 'yyyy-MM');
        const isCurrentMonthDebug = lastMonth === currentMonthKeyDebug;

        Object.entries(finalHoldings).forEach(([ticker, holding]) => {
          if (holding.quantity > 0) {
            const priceTable = priceTables[ticker] || {};
            let price = priceTable[lastMonth];
            let priceSource = 'direct';

            // For current month: prioritize current prices from cache
            if (!price && isCurrentMonthDebug && currentPrices[ticker]) {
              price = currentPrices[ticker].price || currentPrices[ticker];
              priceSource = 'current cache (prioritized for current month)';
            }

            // Use same fallback logic as calculation
            if (!price && Object.keys(priceTable).length > 0) {
              const availableMonths = Object.keys(priceTable).sort().reverse();
              for (const availableMonth of availableMonths) {
                if (availableMonth <= lastMonth) {
                  const candidatePrice = priceTable[availableMonth];
                  if (candidatePrice && candidatePrice > 0) {
                    price = candidatePrice;
                    priceSource = `fallback from ${availableMonth}`;
                    break;
                  }
                }
              }
            }

            // Final fallback to current cached price
            if (!price && currentPrices[ticker]) {
              price = currentPrices[ticker].price || currentPrices[ticker];
              priceSource = 'current cache (final fallback)';
            }

            const value = price ? holding.quantity * price : 0;
            console.log(`  ${ticker}: ${holding.quantity.toFixed(4)} units @ €${price ? price.toFixed(2) : 'N/A'} (${priceSource}) = €${value.toFixed(2)}`);
          }
        });
      }
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
    // Generate ALL periods from first transaction to today (not just months with transactions!)
    let periods = [];
    if (selectedYear === 'all') {
      // Get first and last date
      const sortedTx = transactions
        .filter(tx => tx.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (sortedTx.length > 0) {
        const firstDate = parseISO(sortedTx[0].date);
        const lastDate = new Date(); // Today

        // Generate ALL months from first to last
        const periodsSet = new Set();
        let currentMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);

        while (currentMonth <= lastDate) {
          periodsSet.add(format(currentMonth, 'yyyy-MM'));
          currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        }

        periods = Array.from(periodsSet).sort();
      }
    } else {
      // Use all 12 months for single year view
      periods = MONTHS;
    }

    // Calculate cumulative cash flow using DASHBOARD logic
    let cumulativeCashDeposits = 0;
    let cumulativeCashWithdrawals = 0;
    let cumulativeAssetPurchases = 0;
    let cumulativeAssetSales = 0;

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

      // Get transactions for this period
      const periodStart = selectedYear === 'all' ? parseISO(`${period}-01`) : parseISO(`${selectedYear}-${String(MONTHS.indexOf(period) + 1).padStart(2, '0')}-01`);
      const periodEnd = endOfMonth(periodStart);

      const periodTransactions = transactions.filter(tx => {
        if (!tx.date) return false;
        const txDate = parseISO(tx.date);
        return txDate >= periodStart && txDate <= periodEnd;
      });

      // Calculate flows for this period using DASHBOARD logic
      let cashDeposits = 0, cashWithdrawals = 0, assetPurchases = 0, assetSales = 0;

      periodTransactions.forEach(tx => {
        const amount = tx.quantity * tx.price;
        const commission = tx.commission || 0;
        const isCash = tx.isCash || tx.macroCategory === 'Cash';

        if (isCash) {
          if (tx.type === 'buy') cashDeposits += amount;
          else if (tx.type === 'sell') cashWithdrawals += amount;
        } else {
          if (tx.type === 'buy') assetPurchases += (amount + commission);
          else if (tx.type === 'sell') assetSales += (amount - commission);
        }
      });

      // Update cumulative values
      cumulativeCashDeposits += cashDeposits;
      cumulativeCashWithdrawals += cashWithdrawals;
      cumulativeAssetPurchases += assetPurchases;
      cumulativeAssetSales += assetSales;

      // Store monthly values for bar chart
      point.totalIncome = cashDeposits + assetSales;
      point.totalExpense = cashWithdrawals;
      point.totalInvestments = assetPurchases;

      // Store cumulative values
      point.cumulativeIncome = cumulativeCashDeposits + cumulativeAssetSales;
      point.cumulativeExpense = cumulativeCashWithdrawals;
      point.cumulativeInvestments = cumulativeAssetPurchases;

      // Calculate cash balance using DASHBOARD formula
      point.cashBalance = cumulativeCashDeposits - cumulativeCashWithdrawals - cumulativeAssetPurchases + cumulativeAssetSales;

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
  }, [transactions, selectedYear, monthlyMarketValues]);

  // DEBUG: Log chart data to diagnose missing line
  useEffect(() => {
    if (chartData.length > 0) {
      console.log('🔍 CHART DATA DEBUG:');
      console.log('Total periods:', chartData.length);
      console.log('First 3 periods:', chartData.slice(0, 3).map(d => ({
        month: d.month,
        displayMonth: d.displayMonth,
        cashBalance: d.cashBalance,
        investmentsMarketValue: d.investmentsMarketValue,
        patrimonioReale: d.patrimonioReale
      })));
      console.log('Last 3 periods:', chartData.slice(-3).map(d => ({
        month: d.month,
        displayMonth: d.displayMonth,
        cashBalance: d.cashBalance,
        investmentsMarketValue: d.investmentsMarketValue,
        patrimonioReale: d.patrimonioReale
      })));

      // Check if all patrimonioReale values are 0 or undefined
      const validValues = chartData.filter(d => d.patrimonioReale && d.patrimonioReale > 0);
      console.log(`Valid patrimonio values: ${validValues.length}/${chartData.length}`);

      if (validValues.length === 0) {
        console.error('❌ NO VALID PATRIMONIO VALUES IN CHART DATA!');
      }
    }
  }, [chartData]);

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
        gainPercent: 0,
        cumulativeIncome: 0,
        cumulativeExpense: 0
      };
    }

    const latest = chartData[chartData.length - 1];
    const cash = latest.cashBalance || 0;
    const marketValue = latest.investmentsMarketValue || 0;
    const patrimonio = latest.patrimonioReale || 0;

    // Calculate REAL cost basis (total cost of holdings, excluding sold positions)
    // This matches Dashboard's "Totale Investito" calculation
    const assetTransactions = transactions.filter(tx => !tx.isCash && tx.macroCategory !== 'Cash');
    const holdings = {};

    assetTransactions.forEach(tx => {
      if (!holdings[tx.ticker]) {
        holdings[tx.ticker] = { quantity: 0, totalCost: 0 };
      }
      if (tx.type === 'buy') {
        holdings[tx.ticker].quantity += tx.quantity;
        holdings[tx.ticker].totalCost += tx.quantity * tx.price;
      } else if (tx.type === 'sell') {
        holdings[tx.ticker].quantity -= tx.quantity;
        holdings[tx.ticker].totalCost -= tx.quantity * tx.price;
      }
    });

    // Sum up cost basis for positions still held (quantity > 0)
    const invested = Object.values(holdings)
      .filter(h => h.quantity > 0)
      .reduce((sum, h) => sum + h.totalCost, 0);

    const gain = marketValue - invested;
    const gainPercent = invested > 0 ? (gain / invested) * 100 : 0;
    const cumulativeIncome = latest.cumulativeIncome || 0;
    const cumulativeExpense = latest.cumulativeExpense || 0;

    console.log('📊 Current Values Debug:', {
      cash,
      invested,
      marketValue,
      patrimonio,
      gain,
      gainPercent,
      chartDataLength: chartData.length,
      latestPeriod: latest.month,
      latestDisplayMonth: latest.displayMonth,
      latestCashBalance: latest.cashBalance,
      latestMarketValue: latest.investmentsMarketValue,
      latestPatrimonio: latest.patrimonioReale
    });

    return {
      invested,
      cash,
      marketValue,
      patrimonio,
      gain,
      gainPercent,
      cumulativeIncome,
      cumulativeExpense
    };
  }, [chartData, transactions]);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>
      </div>

      {/* Chart 1: Patrimonio Evolution (Simple Line - GetQuin style) */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Evoluzione Patrimonio Totale</h3>
        <p className="text-sm text-gray-600 mb-4">
          Patrimonio totale (cash + investimenti a valore di mercato) nel tempo
        </p>
        <ResponsiveContainer width="100%" height={450}>
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="patrimonioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
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
              tickFormatter={(value) => `€${(value / 1000).toFixed(1)}k`}
            />
            <Tooltip
              formatter={(value) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="patrimonioReale"
              name="Patrimonio Totale"
              stroke="#8b5cf6"
              strokeWidth={3}
              fill="url(#patrimonioGradient)"
              dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tables: Entrate, Uscite, Investimenti */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabella Entrate */}
        <div className="card">
          <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
            💰 Entrate Mensili
          </h3>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-green-200">
                  <th className="text-left py-2 px-3 font-semibold text-green-800">Periodo</th>
                  <th className="text-right py-2 px-3 font-semibold text-green-800">Importo</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-green-50">
                    <td className="py-2 px-3 text-gray-700">{row.displayMonth}</td>
                    <td className="py-2 px-3 text-right font-medium text-green-700">
                      €{row.totalIncome.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {chartData.length > 0 && (
                  <tr className="bg-green-100 font-bold">
                    <td className="py-3 px-3 text-green-900">TOTALE</td>
                    <td className="py-3 px-3 text-right text-green-900">
                      €{chartData.reduce((sum, row) => sum + row.totalIncome, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabella Uscite */}
        <div className="card">
          <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
            💸 Uscite Mensili
          </h3>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-red-200">
                  <th className="text-left py-2 px-3 font-semibold text-red-800">Periodo</th>
                  <th className="text-right py-2 px-3 font-semibold text-red-800">Importo</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-red-50">
                    <td className="py-2 px-3 text-gray-700">{row.displayMonth}</td>
                    <td className="py-2 px-3 text-right font-medium text-red-700">
                      €{row.totalExpense.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {chartData.length > 0 && (
                  <tr className="bg-red-100 font-bold">
                    <td className="py-3 px-3 text-red-900">TOTALE</td>
                    <td className="py-3 px-3 text-right text-red-900">
                      €{chartData.reduce((sum, row) => sum + row.totalExpense, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabella Investimenti */}
        <div className="card">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
            📈 Investimenti Mensili
          </h3>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-blue-200">
                  <th className="text-left py-2 px-3 font-semibold text-blue-800">Periodo</th>
                  <th className="text-right py-2 px-3 font-semibold text-blue-800">Importo</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50">
                    <td className="py-2 px-3 text-gray-700">{row.displayMonth}</td>
                    <td className="py-2 px-3 text-right font-medium text-blue-700">
                      €{row.totalInvestments.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {chartData.length > 0 && (
                  <tr className="bg-blue-100 font-bold">
                    <td className="py-3 px-3 text-blue-900">TOTALE</td>
                    <td className="py-3 px-3 text-right text-blue-900">
                      €{chartData.reduce((sum, row) => sum + row.totalInvestments, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Consuntivi Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">📋 Riepilogo Consuntivi</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Entrate Totali */}
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-green-900">Entrate Totali</h4>
            </div>
            <p className="text-3xl font-bold text-green-700">
              €{currentValues.cumulativeIncome?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0.00'}
            </p>
            <p className="text-sm text-green-600 mt-1">Dall'inizio</p>
          </div>

          {/* Uscite Totali */}
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <h4 className="font-semibold text-red-900">Uscite Totali</h4>
            </div>
            <p className="text-3xl font-bold text-red-700">
              €{currentValues.cumulativeExpense?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0.00'}
            </p>
            <p className="text-sm text-red-600 mt-1">Dall'inizio</p>
          </div>

          {/* Investimenti Totali */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Investimenti Totali</h4>
            </div>
            <p className="text-3xl font-bold text-blue-700">
              €{currentValues.invested?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0.00'}
            </p>
            <p className="text-sm text-blue-600 mt-1">Costo totale</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Patrimonio;
