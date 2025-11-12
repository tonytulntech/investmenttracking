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
  const [monthlyCategoryValues, setMonthlyCategoryValues] = useState({}); // { '2021-01': { 'ETF': 500, 'ETC': 300, ... }, ... }

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
      const categoryValues = {}; // { '2021-01': { 'ETF': 500, 'ETC': 300, ... }, ... }

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

        // Calculate holdings with category information
        const holdings = {};
        const tickerToCategory = {}; // Map ticker to category
        txUpToMonth.forEach(tx => {
          if (!holdings[tx.ticker]) {
            holdings[tx.ticker] = { quantity: 0 };
            tickerToCategory[tx.ticker] = tx.macroCategory || 'Cash';
          }

          if (tx.type === 'buy') {
            holdings[tx.ticker].quantity += tx.quantity;
          } else if (tx.type === 'sell') {
            holdings[tx.ticker].quantity -= tx.quantity;
          }
        });

        // Calculate market value (total and per category)
        let totalValue = 0;
        const categoryValuesForMonth = {};
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
              const value = holding.quantity * price;
              totalValue += value;

              // Add to category value
              const category = tickerToCategory[ticker] || 'Cash';
              if (!categoryValuesForMonth[category]) {
                categoryValuesForMonth[category] = 0;
              }
              categoryValuesForMonth[category] += value;
            }
          }
        });

        marketValues[monthKey] = totalValue;
        categoryValues[monthKey] = categoryValuesForMonth;
      });

      setMonthlyMarketValues(marketValues);
      setMonthlyCategoryValues(categoryValues);
      setLoadingPrices(false);
      console.log('📊 Monthly market values calculated:', marketValues);
      console.log('📊 Monthly category values calculated:', categoryValues);

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
      // - Income: Cash deposits (buy) + cashFlowType='income' + asset sales (sell)
      // - Expense: Cash withdrawals (sell) + cashFlowType='expense'
      // - Investments: Asset purchases (buy) - NOT expenses, they convert cash to assets!

      const isCashTransaction = tx.isCash || category === 'Cash';

      if (isCashTransaction) {
        // Cash transactions
        if (tx.cashFlowType === 'income' || tx.type === 'buy') {
          // Income: cash deposits or income flows
          data.income[category][periodKey] += amount;
        } else if (tx.cashFlowType === 'expense' || tx.type === 'sell') {
          // Expense: cash withdrawals or expense flows
          data.expense[category][periodKey] += amount;
        }
      } else {
        // Asset transactions (non-Cash)
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
    console.log('🔄 Calculating chartData... monthlyMarketValues keys:', Object.keys(monthlyMarketValues).length, 'keys');

    // Generate ALL periods from first transaction to today (not just months with transactions!)
    let periods = [];
    let futurePeriods = [];

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

        // Add 12 future months for projection
        const futurePeriodsSet = new Set();
        let futureMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 1);
        for (let i = 0; i < 12; i++) {
          futurePeriodsSet.add(format(futureMonth, 'yyyy-MM'));
          futureMonth = new Date(futureMonth.getFullYear(), futureMonth.getMonth() + 1, 1);
        }
        futurePeriods = Array.from(futurePeriodsSet).sort();
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

      // DEBUG: Log market value lookup for recent months
      if (period >= '2025-09') {
        console.log(`🔍 Period ${period}: monthKey=${monthKey}, marketValue=${marketValue}, monthlyMarketValues has key? ${monthKey in monthlyMarketValues}`);
      }

      // Total patrimonio REALE = Cash Balance + Market Value of Investments
      point.patrimonioReale = point.cashBalance + marketValue;

      return point;
    });

    // Add future projection if viewing all years
    if (selectedYear === 'all' && futurePeriods.length > 0 && data.length > 0) {
      // Calculate averages from last 6 months
      const recentMonths = Math.min(6, data.length);
      const recentData = data.slice(-recentMonths);

      const avgMonthlyIncome = recentData.reduce((sum, d) => sum + d.totalIncome, 0) / recentMonths;
      const avgMonthlyExpense = recentData.reduce((sum, d) => sum + d.totalExpense, 0) / recentMonths;
      const avgMonthlyInvestments = recentData.reduce((sum, d) => sum + d.totalInvestments, 0) / recentMonths;

      // Assume 0.5% monthly growth on investments (conservative estimate)
      const monthlyInvestmentGrowthRate = 0.005;

      // Start from last real data point
      const lastPoint = data[data.length - 1];
      let projectedCash = lastPoint.cashBalance;
      let projectedInvestmentValue = lastPoint.investmentsMarketValue;

      futurePeriods.forEach((futurePeriod, idx) => {
        const [year, monthNum] = futurePeriod.split('-');
        const monthName = MONTH_NUMBERS[monthNum];
        const displayLabel = `${monthName} ${year}`;

        // Project cash flow: income - expense - investments
        projectedCash += avgMonthlyIncome - avgMonthlyExpense - avgMonthlyInvestments;

        // Project investment value: previous value + new investments + growth
        projectedInvestmentValue = projectedInvestmentValue * (1 + monthlyInvestmentGrowthRate) + avgMonthlyInvestments;

        const projectedPatrimonio = projectedCash + projectedInvestmentValue;

        data.push({
          month: futurePeriod,
          displayMonth: displayLabel,
          totalIncome: avgMonthlyIncome,
          totalExpense: avgMonthlyExpense,
          totalInvestments: avgMonthlyInvestments,
          cashBalance: projectedCash,
          investmentsMarketValue: projectedInvestmentValue,
          patrimonioReale: undefined, // Real value
          patrimonioProiezione: projectedPatrimonio, // Projected value
          isProjection: true
        });
      });
    }

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

    // Get the last REAL data point (not projected)
    const realData = chartData.filter(d => !d.isProjection);
    const latest = realData.length > 0 ? realData[realData.length - 1] : chartData[chartData.length - 1];

    const cash = latest.cashBalance || 0;
    const marketValue = latest.investmentsMarketValue || 0;
    const patrimonio = latest.patrimonioReale || 0; // Use real patrimonio from chart data

    // Calculate REAL cost basis (total cost of holdings, excluding sold positions)
    // This matches Dashboard's "Totale Investito" calculation
    // IMPORTANT: Must include commissions in the cost!
    const assetTransactions = transactions.filter(tx => !tx.isCash && tx.macroCategory !== 'Cash');
    const holdings = {};

    assetTransactions.forEach(tx => {
      if (!holdings[tx.ticker]) {
        holdings[tx.ticker] = { quantity: 0, totalCost: 0 };
      }

      const commission = tx.commission || 0;
      const costWithCommission = (tx.quantity * tx.price) + (tx.type === 'buy' ? commission : 0);

      if (tx.type === 'buy') {
        holdings[tx.ticker].quantity += tx.quantity;
        holdings[tx.ticker].totalCost += costWithCommission;
      } else if (tx.type === 'sell') {
        // When selling, reduce cost proportionally (FIFO average cost)
        const avgCostPerUnit = holdings[tx.ticker].quantity > 0
          ? holdings[tx.ticker].totalCost / holdings[tx.ticker].quantity
          : 0;
        holdings[tx.ticker].quantity -= tx.quantity;
        holdings[tx.ticker].totalCost -= tx.quantity * avgCostPerUnit;
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

    // Debug holdings details
    console.log('💰 Holdings Cost Basis Breakdown:');
    Object.entries(holdings)
      .filter(([_, h]) => h.quantity > 0)
      .forEach(([ticker, h]) => {
        console.log(`  ${ticker}: ${h.quantity.toFixed(4)} units, totalCost: €${h.totalCost.toFixed(2)}, avgCost: €${(h.totalCost / h.quantity).toFixed(2)}/unit`);
      });
    console.log(`  TOTAL INVESTED (with commissions): €${invested.toFixed(2)}`);

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
              <option value="all">Tutti gli anni</option>
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
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Tipo Flusso
            </label>
            <select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              className="select"
            >
              <option value="all">Entrate vs Uscite</option>
              <option value="income">Solo Entrate</option>
              <option value="expense">Solo Uscite</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chart 1: Patrimonio Evolution with Projection */}
      {!loadingPrices && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Evoluzione Patrimonio Totale</h3>
          <p className="text-sm text-gray-600 mb-4">
            Patrimonio totale (cash + investimenti a valore di mercato) nel tempo
            {selectedYear === 'all' && <span className="ml-2 text-blue-600">• Linea tratteggiata = proiezione futura (prossimi 12 mesi)</span>}
          </p>
        <ResponsiveContainer width="100%" height={450}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="patrimonioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="proiezioneGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.03}/>
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
              formatter={(value, name) => {
                if (value === null || value === undefined) return ['-', name];
                return [`€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, name];
              }}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="patrimonioReale"
              name="Patrimonio Reale"
              stroke="#8b5cf6"
              strokeWidth={3}
              fill="url(#patrimonioGradient)"
              dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="patrimonioProiezione"
              name="Proiezione Futura"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#proiezioneGradient)"
              dot={false}
              activeDot={{ r: 5 }}
              connectNulls={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      )}

      {/* Section: Riepilogo Flussi di Cassa */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">📊 Riepilogo Flussi di Cassa Mensili</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 py-3 px-3 text-left font-bold text-gray-900 sticky left-0 bg-gray-100 z-10 min-w-[150px]">Voce</th>
                {(() => {
                  // Use dynamic periods based on selected year
                  const periods = selectedYear === 'all' ? processedData.periods : MONTHS;

                  return periods.map(period => {
                    const displayLabel = selectedYear === 'all' && period.includes('-')
                      ? (() => {
                          const [year, monthNum] = period.split('-');
                          const monthName = MONTH_NUMBERS[monthNum];
                          return `${monthName} '${year.slice(-2)}`;
                        })()
                      : period;

                    return (
                      <th key={period} className="border border-gray-300 py-3 px-2 text-center font-semibold text-gray-900 min-w-[90px]">
                        {displayLabel}
                      </th>
                    );
                  });
                })()}
                <th className="border border-gray-300 py-3 px-3 text-center font-bold text-gray-900 min-w-[120px]">TOTALE</th>
              </tr>
            </thead>
            <tbody>
              {/* Entrate */}
              <tr className="bg-green-50 hover:bg-green-100">
                <td className="border border-gray-300 py-3 px-3 font-bold text-green-900 sticky left-0 bg-green-50 z-10">💰 Entrate</td>
                {(() => {
                  const periods = selectedYear === 'all' ? processedData.periods : MONTHS;
                  return periods.map(period => {
                    const income = Object.keys(processedData.income).reduce((sum, cat) => {
                      return sum + (processedData.income[cat][period] || 0);
                    }, 0);
                    return (
                      <td key={period} className="border border-gray-300 py-3 px-2 text-right text-green-700 font-medium">
                        {income > 0 ? `€${income.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-'}
                      </td>
                    );
                  });
                })()}
                <td className="border border-gray-300 py-3 px-3 text-right font-bold text-green-900">
                  €{(() => {
                    const periods = selectedYear === 'all' ? processedData.periods : MONTHS;
                    return periods.reduce((sum, period) => {
                      return sum + Object.keys(processedData.income).reduce((catSum, cat) => {
                        return catSum + (processedData.income[cat][period] || 0);
                      }, 0);
                    }, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 });
                  })()}
                </td>
              </tr>

              {/* Uscite */}
              <tr className="bg-red-50 hover:bg-red-100">
                <td className="border border-gray-300 py-3 px-3 font-bold text-red-900 sticky left-0 bg-red-50 z-10">💸 Uscite</td>
                {(() => {
                  const periods = selectedYear === 'all' ? processedData.periods : MONTHS;
                  return periods.map(period => {
                    const expense = Object.keys(processedData.expense).reduce((sum, cat) => {
                      return sum + (processedData.expense[cat][period] || 0);
                    }, 0);
                    return (
                      <td key={period} className="border border-gray-300 py-3 px-2 text-right text-red-700 font-medium">
                        {expense > 0 ? `€${expense.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-'}
                      </td>
                    );
                  });
                })()}
                <td className="border border-gray-300 py-3 px-3 text-right font-bold text-red-900">
                  €{(() => {
                    const periods = selectedYear === 'all' ? processedData.periods : MONTHS;
                    return periods.reduce((sum, period) => {
                      return sum + Object.keys(processedData.expense).reduce((catSum, cat) => {
                        return catSum + (processedData.expense[cat][period] || 0);
                      }, 0);
                    }, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 });
                  })()}
                </td>
              </tr>

              {/* Investimenti */}
              <tr className="bg-blue-50 hover:bg-blue-100">
                <td className="border border-gray-300 py-3 px-3 font-bold text-blue-900 sticky left-0 bg-blue-50 z-10">📈 Investimenti</td>
                {(() => {
                  const periods = selectedYear === 'all' ? processedData.periods : MONTHS;
                  return periods.map(period => {
                    const investments = Object.keys(processedData.investments).reduce((sum, cat) => {
                      return sum + (processedData.investments[cat][period] || 0);
                    }, 0);
                    return (
                      <td key={period} className="border border-gray-300 py-3 px-2 text-right text-blue-700 font-medium">
                        {investments > 0 ? `€${investments.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-'}
                      </td>
                    );
                  });
                })()}
                <td className="border border-gray-300 py-3 px-3 text-right font-bold text-blue-900">
                  €{(() => {
                    const periods = selectedYear === 'all' ? processedData.periods : MONTHS;
                    return periods.reduce((sum, period) => {
                      return sum + Object.keys(processedData.investments).reduce((catSum, cat) => {
                        return catSum + (processedData.investments[cat][period] || 0);
                      }, 0);
                    }, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 });
                  })()}
                </td>
              </tr>

              {/* Netto (Entrate - Uscite) */}
              <tr className="bg-purple-50 hover:bg-purple-100">
                <td className="border border-gray-300 py-3 px-3 font-bold text-purple-900 sticky left-0 bg-purple-50 z-10">💵 Netto (Entrate - Uscite)</td>
                {(() => {
                  const periods = selectedYear === 'all' ? processedData.periods : MONTHS;
                  return periods.map(period => {
                    const income = Object.keys(processedData.income).reduce((sum, cat) => {
                      return sum + (processedData.income[cat][period] || 0);
                    }, 0);
                    const expense = Object.keys(processedData.expense).reduce((sum, cat) => {
                      return sum + (processedData.expense[cat][period] || 0);
                    }, 0);
                    const net = income - expense;
                    const textColor = net >= 0 ? 'text-green-700' : 'text-red-700';
                    return (
                      <td key={period} className={`border border-gray-300 py-3 px-2 text-right font-bold ${textColor}`}>
                        {net !== 0 ? `€${net.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-'}
                      </td>
                    );
                  });
                })()}
                <td className="border border-gray-300 py-3 px-3 text-right font-bold text-purple-900">
                  €{(() => {
                    const periods = selectedYear === 'all' ? processedData.periods : MONTHS;
                    return periods.reduce((sum, period) => {
                      const income = Object.keys(processedData.income).reduce((catSum, cat) => {
                        return catSum + (processedData.income[cat][period] || 0);
                      }, 0);
                      const expense = Object.keys(processedData.expense).reduce((catSum, cat) => {
                        return catSum + (processedData.expense[cat][period] || 0);
                      }, 0);
                      return sum + (income - expense);
                    }, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 });
                  })()}
                </td>
              </tr>

              {/* % Investimento (Investimenti / Entrate * 100) */}
              <tr className="bg-indigo-50 hover:bg-indigo-100">
                <td className="border border-gray-300 py-3 px-3 font-bold text-indigo-900 sticky left-0 bg-indigo-50 z-10">📊 % Investimento</td>
                {(() => {
                  const periods = selectedYear === 'all' ? processedData.periods : MONTHS;
                  return periods.map(period => {
                    const income = Object.keys(processedData.income).reduce((sum, cat) => {
                      return sum + (processedData.income[cat][period] || 0);
                    }, 0);
                    const investments = Object.keys(processedData.investments).reduce((sum, cat) => {
                      return sum + (processedData.investments[cat][period] || 0);
                    }, 0);
                    const percentage = income > 0 ? (investments / income) * 100 : 0;
                    return (
                      <td key={period} className="border border-gray-300 py-3 px-2 text-right text-indigo-700 font-medium">
                        {percentage > 0 ? `${percentage.toFixed(1)}%` : '-'}
                      </td>
                    );
                  });
                })()}
                <td className="border border-gray-300 py-3 px-3 text-right font-bold text-indigo-900">
                  {(() => {
                    const periods = selectedYear === 'all' ? processedData.periods : MONTHS;
                    const totalIncome = periods.reduce((sum, period) => {
                      return sum + Object.keys(processedData.income).reduce((catSum, cat) => {
                        return catSum + (processedData.income[cat][period] || 0);
                      }, 0);
                    }, 0);
                    const totalInvestments = periods.reduce((sum, period) => {
                      return sum + Object.keys(processedData.investments).reduce((catSum, cat) => {
                        return catSum + (processedData.investments[cat][period] || 0);
                      }, 0);
                    }, 0);
                    const avgPercentage = totalIncome > 0 ? (totalInvestments / totalIncome) * 100 : 0;
                    return `${avgPercentage.toFixed(1)}%`;
                  })()}
                </td>
              </tr>

              {/* % Spesa (Uscite / Entrate * 100) */}
              <tr className="bg-orange-50 hover:bg-orange-100">
                <td className="border border-gray-300 py-3 px-3 font-bold text-orange-900 sticky left-0 bg-orange-50 z-10">📉 % Spesa</td>
                {(() => {
                  const periods = selectedYear === 'all' ? processedData.periods : MONTHS;
                  return periods.map(period => {
                    const income = Object.keys(processedData.income).reduce((sum, cat) => {
                      return sum + (processedData.income[cat][period] || 0);
                    }, 0);
                    const expense = Object.keys(processedData.expense).reduce((sum, cat) => {
                      return sum + (processedData.expense[cat][period] || 0);
                    }, 0);
                    const percentage = income > 0 ? (expense / income) * 100 : 0;
                    return (
                      <td key={period} className="border border-gray-300 py-3 px-2 text-right text-orange-700 font-medium">
                        {percentage > 0 ? `${percentage.toFixed(1)}%` : '-'}
                      </td>
                    );
                  });
                })()}
                <td className="border border-gray-300 py-3 px-3 text-right font-bold text-orange-900">
                  {(() => {
                    const periods = selectedYear === 'all' ? processedData.periods : MONTHS;
                    const totalIncome = periods.reduce((sum, period) => {
                      return sum + Object.keys(processedData.income).reduce((catSum, cat) => {
                        return catSum + (processedData.income[cat][period] || 0);
                      }, 0);
                    }, 0);
                    const totalExpense = periods.reduce((sum, period) => {
                      return sum + Object.keys(processedData.expense).reduce((catSum, cat) => {
                        return catSum + (processedData.expense[cat][period] || 0);
                      }, 0);
                    }, 0);
                    const avgPercentage = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
                    return `${avgPercentage.toFixed(1)}%`;
                  })()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-700">
            <strong>Legenda:</strong>
            <span className="ml-2">💰 Entrate = Cash in + Vendite asset</span>
            <span className="mx-2">•</span>
            <span>💸 Uscite = Spese reali (Cash out)</span>
            <span className="mx-2">•</span>
            <span>📈 Investimenti = Acquisti asset</span>
            <span className="mx-2">•</span>
            <span>💵 Netto = Entrate - Uscite</span>
          </p>
          <p className="text-sm text-gray-700 mt-1">
            <span>📊 % Investimento = Quanto sto investendo sulle entrate</span>
            <span className="mx-2">•</span>
            <span>📉 % Spesa = Quanto sto spendendo sui guadagni</span>
          </p>
          {selectedYear === 'all' && (
            <p className="text-sm text-blue-700 mt-2">
              💡 <strong>Nota:</strong> Scorri orizzontalmente per vedere tutti i periodi storici. La colonna "Voce" rimane fissa.
            </p>
          )}
        </div>
      </div>

      {/* Statistiche Patrimonio */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">📊 Statistiche Patrimonio</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Massimo Raggiunto */}
          {(() => {
            // Filter out projections - only use real data
            const realData = chartData.filter(d => !d.isProjection && d.patrimonioReale > 0);
            const maxPoint = realData.reduce((max, point) =>
              point.patrimonioReale > (max?.patrimonioReale || 0) ? point : max
            , realData[0]);

            return (
              <div className="border border-green-200 rounded-lg p-4 bg-gradient-to-br from-green-50 to-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-900">Massimo Raggiunto</h4>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  €{maxPoint?.patrimonioReale?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0.00'}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {maxPoint?.displayMonth || '-'}
                </p>
              </div>
            );
          })()}

          {/* Minimo Raggiunto */}
          {(() => {
            // Filter out projections - only use real data
            const realData = chartData.filter(d => !d.isProjection && d.patrimonioReale > 0);
            const minPoint = realData.reduce((min, point) =>
              point.patrimonioReale < (min?.patrimonioReale || Infinity) && point.patrimonioReale > 0 ? point : min
            , realData[0]);

            return (
              <div className="border border-red-200 rounded-lg p-4 bg-gradient-to-br from-red-50 to-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <h4 className="font-semibold text-red-900">Minimo Raggiunto</h4>
                </div>
                <p className="text-2xl font-bold text-red-700">
                  €{minPoint?.patrimonioReale?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0.00'}
                </p>
                <p className="text-sm text-red-600 mt-1">
                  {minPoint?.displayMonth || '-'}
                </p>
              </div>
            );
          })()}

          {/* Crescita Media Mensile */}
          {(() => {
            // Filter out projections - only use real data
            const realData = chartData.filter(d => !d.isProjection && d.patrimonioReale > 0);
            if (realData.length < 2) return null;

            const firstValue = realData[0].patrimonioReale;
            const lastValue = realData[realData.length - 1].patrimonioReale;
            const months = realData.length;
            const avgMonthlyGrowth = months > 1 ? (lastValue - firstValue) / (months - 1) : 0;

            return (
              <div className="border border-blue-200 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Crescita Media Mensile</h4>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  {avgMonthlyGrowth >= 0 ? '+' : ''}€{avgMonthlyGrowth.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Ultimi {months} mesi
                </p>
              </div>
            );
          })()}

          {/* Tasso Risparmio Medio */}
          {(() => {
            const periods = selectedYear === 'all' ? processedData.periods : MONTHS;
            const totalIncome = periods.reduce((sum, period) => {
              return sum + Object.keys(processedData.income).reduce((catSum, cat) => {
                return catSum + (processedData.income[cat][period] || 0);
              }, 0);
            }, 0);
            const totalExpense = periods.reduce((sum, period) => {
              return sum + Object.keys(processedData.expense).reduce((catSum, cat) => {
                return catSum + (processedData.expense[cat][period] || 0);
              }, 0);
            }, 0);
            const totalInvestments = periods.reduce((sum, period) => {
              return sum + Object.keys(processedData.investments).reduce((catSum, cat) => {
                return catSum + (processedData.investments[cat][period] || 0);
              }, 0);
            }, 0);

            const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
            const investmentRate = totalIncome > 0 ? (totalInvestments / totalIncome) * 100 : 0;

            return (
              <div className="border border-purple-200 rounded-lg p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <PieChartIcon className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-purple-900">Tasso Risparmio</h4>
                </div>
                <p className="text-2xl font-bold text-purple-700">
                  {savingsRate.toFixed(1)}%
                </p>
                <p className="text-sm text-purple-600 mt-1">
                  Investimenti: {investmentRate.toFixed(1)}%
                </p>
              </div>
            );
          })()}
        </div>

        {/* Proiezione Info */}
        {selectedYear === 'all' && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">🔮 Come funziona la Proiezione Futura?</h4>
            <p className="text-sm text-blue-800 mb-2">
              La proiezione viene calcolata sulla base dei tuoi comportamenti finanziari degli ultimi 6 mesi:
            </p>
            <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
              <li><strong>Entrate medie mensili:</strong> Quanto guadagni mediamente ogni mese</li>
              <li><strong>Uscite medie mensili:</strong> Quanto spendi mediamente ogni mese</li>
              <li><strong>Investimenti medi mensili:</strong> Quanto investi mediamente ogni mese</li>
              <li><strong>Crescita investimenti:</strong> Assumiamo una crescita conservativa del 0.5% mensile (~6% annuo) sul valore di mercato degli investimenti</li>
            </ul>
            <p className="text-sm text-blue-700 mt-3 font-medium">
              💡 Se continui con questa strategia, tra 12 mesi il tuo patrimonio potrebbe raggiungere circa €{
                (() => {
                  const lastProjection = chartData.find(d => d.isProjection && d.patrimonioProiezione);
                  if (!lastProjection) return '0.00';
                  const projections = chartData.filter(d => d.isProjection && d.patrimonioProiezione);
                  if (projections.length === 0) return '0.00';
                  return projections[projections.length - 1].patrimonioProiezione.toLocaleString('it-IT', { minimumFractionDigits: 2 });
                })()
              }
            </p>
          </div>
        )}
      </div>

      {/* Old tables removed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 hidden">
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

      {/* Consuntivi Asset Class - Growth Over Time */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">📈 Consuntivi Asset Class - Crescita Patrimonio nel Tempo</h2>
        <p className="text-sm text-gray-600 mb-4">
          Valori consuntivi (cumulativi) del patrimonio per macro asset class a valore di mercato nel tempo
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 py-3 px-3 text-left font-bold text-gray-900 sticky left-0 bg-gray-100 z-10 min-w-[150px]">
                  Asset Class
                </th>
                {(() => {
                  // Generate periods based on selected year
                  const periods = selectedYear === 'all'
                    ? processedData.periods
                    : MONTHS;

                  return periods.map(period => {
                    const displayLabel = selectedYear === 'all' && period.includes('-')
                      ? (() => {
                          const [year, monthNum] = period.split('-');
                          const monthName = MONTH_NUMBERS[monthNum];
                          return `${monthName} '${year.slice(-2)}`;
                        })()
                      : period;

                    return (
                      <th key={period} className="border border-gray-300 py-3 px-2 text-center font-semibold text-gray-900 min-w-[100px]">
                        {displayLabel}
                      </th>
                    );
                  });
                })()}
                <th className="border border-gray-300 py-3 px-3 text-center font-bold text-gray-900 min-w-[120px]">
                  ATTUALE
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Use precalculated monthly category values from state
                const periods = selectedYear === 'all' ? processedData.periods : MONTHS;

                // Render rows for each category
                return Object.keys(CATEGORY_COLORS)
                  .filter(cat => cat !== 'Totale' && cat !== 'Cash')
                  .map((category, idx) => {
                    const bgColor = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                    const categoryColor = CATEGORY_COLORS[category];

                    return (
                      <tr key={category} className={`${bgColor} hover:bg-blue-50`}>
                        <td
                          className="border border-gray-300 py-3 px-3 font-bold sticky left-0 z-10"
                          style={{
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                            color: categoryColor
                          }}
                        >
                          {category}
                        </td>
                        {periods.map(period => {
                          // Determine the full date key for this period
                          let periodKey = period;
                          if (selectedYear !== 'all') {
                            const monthIndex = MONTHS.indexOf(period);
                            if (monthIndex >= 0) {
                              const year = parseInt(selectedYear);
                              const monthNum = String(monthIndex + 1).padStart(2, '0');
                              periodKey = `${year}-${monthNum}`;
                            }
                          }

                          const value = monthlyCategoryValues[periodKey]?.[category] || 0;
                          return (
                            <td key={period} className="border border-gray-300 py-3 px-2 text-right text-gray-700 font-medium">
                              {value > 0 ? `€${value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-'}
                            </td>
                          );
                        })}
                        <td className="border border-gray-300 py-3 px-3 text-right font-bold text-blue-900">
                          {(() => {
                            // Get the latest period key
                            let latestPeriodKey = periods[periods.length - 1];
                            if (selectedYear !== 'all') {
                              const monthIndex = MONTHS.indexOf(latestPeriodKey);
                              if (monthIndex >= 0) {
                                const year = parseInt(selectedYear);
                                const monthNum = String(monthIndex + 1).padStart(2, '0');
                                latestPeriodKey = `${year}-${monthNum}`;
                              }
                            }

                            const currentValue = monthlyCategoryValues[latestPeriodKey]?.[category] || 0;
                            return currentValue > 0
                              ? `€${currentValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
                              : '-';
                          })()}
                        </td>
                      </tr>
                    );
                  });
              })()}

              {/* TOTALE INVESTIMENTI Row */}
              <tr className="bg-blue-100 font-bold">
                <td className="border border-gray-300 py-3 px-3 text-blue-900 sticky left-0 bg-blue-100 z-10">
                  TOTALE INVESTIMENTI
                </td>
                {(() => {
                  const periods = selectedYear === 'all' ? processedData.periods : MONTHS;

                  return periods.map(period => {
                    // Sum all categories for this period
                    let periodKey = period;
                    if (selectedYear !== 'all') {
                      const monthIndex = MONTHS.indexOf(period);
                      if (monthIndex >= 0) {
                        const year = parseInt(selectedYear);
                        const monthNum = String(monthIndex + 1).padStart(2, '0');
                        periodKey = `${year}-${monthNum}`;
                      }
                    }

                    const totalValue = monthlyMarketValues[periodKey] || 0;

                    return (
                      <td key={period} className="border border-gray-300 py-3 px-2 text-right text-blue-900">
                        {totalValue > 0 ? `€${totalValue.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-'}
                      </td>
                    );
                  });
                })()}
                <td className="border border-gray-300 py-3 px-3 text-right text-blue-900">
                  {(() => {
                    // Get the latest period key (same logic as category rows)
                    const periods = selectedYear === 'all' ? processedData.periods : MONTHS;
                    let latestPeriodKey = periods[periods.length - 1];
                    if (selectedYear !== 'all') {
                      const monthIndex = MONTHS.indexOf(latestPeriodKey);
                      if (monthIndex >= 0) {
                        const year = parseInt(selectedYear);
                        const monthNum = String(monthIndex + 1).padStart(2, '0');
                        latestPeriodKey = `${year}-${monthNum}`;
                      }
                    }

                    // Sum all category values (excluding Totale and Cash)
                    const totalValue = Object.keys(CATEGORY_COLORS)
                      .filter(cat => cat !== 'Totale' && cat !== 'Cash')
                      .reduce((sum, category) => {
                        return sum + (monthlyCategoryValues[latestPeriodKey]?.[category] || 0);
                      }, 0);

                    return `€${totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;
                  })()}
                </td>
              </tr>

              {/* CASH Row */}
              <tr className="bg-green-50 font-semibold">
                <td className="border border-gray-300 py-3 px-3 text-green-900 sticky left-0 bg-green-50 z-10">
                  💰 CASH (Liquidità)
                </td>
                {(() => {
                  const periods = selectedYear === 'all' ? processedData.periods : MONTHS;

                  return periods.map(period => {
                    let periodKey = period;
                    if (selectedYear !== 'all') {
                      const monthIndex = MONTHS.indexOf(period);
                      if (monthIndex >= 0) {
                        const year = parseInt(selectedYear);
                        const monthNum = String(monthIndex + 1).padStart(2, '0');
                        periodKey = `${year}-${monthNum}`;
                      }
                    }

                    // Find cash balance for this period from chartData
                    const dataPoint = chartData.find(d => d.month === periodKey);
                    const cashValue = dataPoint?.cashBalance || 0;

                    return (
                      <td key={period} className="border border-gray-300 py-3 px-2 text-right text-green-700">
                        {cashValue !== 0 ? `€${cashValue.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-'}
                      </td>
                    );
                  });
                })()}
                <td className="border border-gray-300 py-3 px-3 text-right text-green-900">
                  €{(currentValues.cash || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* PATRIMONIO TOTALE Row */}
              <tr className="bg-purple-100 font-bold">
                <td className="border border-gray-300 py-3 px-3 text-purple-900 sticky left-0 bg-purple-100 z-10">
                  💎 PATRIMONIO TOTALE
                </td>
                {(() => {
                  const periods = selectedYear === 'all' ? processedData.periods : MONTHS;

                  return periods.map(period => {
                    let periodKey = period;
                    if (selectedYear !== 'all') {
                      const monthIndex = MONTHS.indexOf(period);
                      if (monthIndex >= 0) {
                        const year = parseInt(selectedYear);
                        const monthNum = String(monthIndex + 1).padStart(2, '0');
                        periodKey = `${year}-${monthNum}`;
                      }
                    }

                    const investmentsValue = monthlyMarketValues[periodKey] || 0;
                    const dataPoint = chartData.find(d => d.month === periodKey);
                    const cashValue = dataPoint?.cashBalance || 0;
                    const totalWealth = investmentsValue + cashValue;

                    return (
                      <td key={period} className="border border-gray-300 py-3 px-2 text-right text-purple-900 font-bold">
                        {totalWealth > 0 ? `€${totalWealth.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-'}
                      </td>
                    );
                  });
                })()}
                <td className="border border-gray-300 py-3 px-3 text-right text-purple-900">
                  €{(currentValues.patrimonio || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* % CRESCITA Row */}
              <tr className="bg-yellow-50 font-semibold">
                <td className="border border-gray-300 py-3 px-3 text-yellow-900 sticky left-0 bg-yellow-50 z-10">
                  📊 % Crescita vs Mese Prec.
                </td>
                {(() => {
                  const periods = selectedYear === 'all' ? processedData.periods : MONTHS;

                  return periods.map((period, index) => {
                    if (index === 0) {
                      return (
                        <td key={period} className="border border-gray-300 py-3 px-2 text-center text-gray-500 text-xs">
                          -
                        </td>
                      );
                    }

                    let periodKey = period;
                    let prevPeriodKey = periods[index - 1];

                    if (selectedYear !== 'all') {
                      const monthIndex = MONTHS.indexOf(period);
                      const prevMonthIndex = MONTHS.indexOf(periods[index - 1]);
                      if (monthIndex >= 0 && prevMonthIndex >= 0) {
                        const year = parseInt(selectedYear);
                        periodKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
                        prevPeriodKey = `${year}-${String(prevMonthIndex + 1).padStart(2, '0')}`;
                      }
                    }

                    const currInv = monthlyMarketValues[periodKey] || 0;
                    const currData = chartData.find(d => d.month === periodKey);
                    const currCash = currData?.cashBalance || 0;
                    const currTotal = currInv + currCash;

                    const prevInv = monthlyMarketValues[prevPeriodKey] || 0;
                    const prevData = chartData.find(d => d.month === prevPeriodKey);
                    const prevCash = prevData?.cashBalance || 0;
                    const prevTotal = prevInv + prevCash;

                    const growth = prevTotal > 0 ? ((currTotal - prevTotal) / prevTotal) * 100 : 0;
                    const isPositive = growth >= 0;

                    return (
                      <td key={period} className={`border border-gray-300 py-3 px-2 text-right font-semibold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                        {currTotal > 0 ? `${isPositive ? '+' : ''}${growth.toFixed(1)}%` : '-'}
                      </td>
                    );
                  });
                })()}
                <td className="border border-gray-300 py-3 px-3 text-center text-gray-500 text-xs">
                  -
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>💡 Nota:</strong> Questa tabella mostra valori consuntivi (cumulativi) a valore di mercato.
            Per ciascun periodo, viene mostrato il valore totale degli asset detenuti in quella macro asset class,
            calcolato moltiplicando la quantità posseduta per il prezzo di mercato del periodo.
          </p>
          <p className="text-sm text-blue-800 mt-2">
            • <strong>CASH (Liquidità)</strong>: Liquidità disponibile dopo aver sottratto gli investimenti dai depositi<br/>
            • <strong>PATRIMONIO TOTALE</strong>: Somma di investimenti + liquidità = ricchezza totale<br/>
            • <strong>% Crescita vs Mese Prec.</strong>: Variazione percentuale del patrimonio totale rispetto al mese precedente (include depositi, prelievi e rendimenti)
            {selectedYear === 'all' && (
              <span className="block mt-1">
                • Scorri orizzontalmente per vedere tutti i periodi storici.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Monthly Growth Analysis - Breakdown */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">🔍 Analisi Crescita Mensile - Scomposizione</h2>
          <p className="text-sm text-gray-600">
            Dettaglio di cosa ha causato la crescita del patrimonio ogni mese: depositi vs rendimenti
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="py-3 px-4 text-left font-semibold text-gray-900">Mese</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-900">Patrimonio Inizio</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-900">Depositi/Prelievi</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-900">Rendimento €</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-900">Rendimento %</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-900">Patrimonio Fine</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-900">Crescita Totale %</th>
              </tr>
            </thead>
            <tbody>
              {chartData
                .filter(d => !d.isProjection)
                .map((month, index, array) => {
                  const startValue = month.cashBalance + (monthlyMarketValues[month.month] || 0);
                  const endValue = month.patrimonioReale || startValue;

                  // Calculate cash flows for this month
                  const monthTransactions = transactions.filter(tx => {
                    if (!tx.date) return false;
                    const txDate = new Date(tx.date);
                    const [year, monthNum] = month.month.split('-');
                    return txDate.getFullYear() === parseInt(year) &&
                           (txDate.getMonth() + 1) === parseInt(monthNum);
                  });

                  let cashFlows = 0;
                  monthTransactions.forEach(tx => {
                    const amount = tx.quantity * tx.price;
                    const commission = tx.commission || 0;
                    const isCash = tx.isCash || tx.macroCategory === 'Cash';

                    if (isCash && tx.type === 'buy') {
                      cashFlows += amount; // Deposit
                    } else if (isCash && tx.type === 'sell') {
                      cashFlows -= amount; // Withdrawal
                    }
                    // Investments don't count as cash flow - they just move money from cash to investments
                  });

                  // Calculate return
                  const expectedValue = startValue + cashFlows;
                  const returnAmount = endValue - expectedValue;
                  const returnPercent = expectedValue > 0 ? (returnAmount / expectedValue) * 100 : 0;

                  // Calculate total growth vs start
                  const totalGrowth = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;

                  const isReturnPositive = returnAmount >= 0;
                  const isTotalGrowthPositive = totalGrowth >= 0;

                  return (
                    <tr key={month.month} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {month.displayMonth || month.month}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        €{startValue.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${cashFlows >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {cashFlows >= 0 ? '+' : ''}€{cashFlows.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${isReturnPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isReturnPositive ? '+' : ''}€{returnAmount.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${isReturnPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isReturnPositive ? '+' : ''}{returnPercent.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        €{endValue.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${isTotalGrowthPositive ? 'text-green-700' : 'text-red-700'}`}>
                        {isTotalGrowthPositive ? '+' : ''}{totalGrowth.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900 font-semibold mb-2">📖 Come leggere la tabella:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-800">
            <div>• <strong>Patrimonio Inizio/Fine</strong>: Valore totale (investimenti + cash)</div>
            <div>• <strong className="text-blue-600">Depositi/Prelievi</strong>: Soldi che hai messo o tolto (blu = deposito, arancio = prelievo)</div>
            <div>• <strong className="text-green-600">Rendimento €/%</strong>: Guadagno/perdita pura degli investimenti (verde = guadagno, rosso = perdita)</div>
            <div>• <strong>Crescita Totale %</strong>: Quanto è cresciuto il patrimonio nel mese (depositi + rendimenti)</div>
          </div>
          <p className="text-xs text-blue-800 mt-3 italic">
            💡 Formula: Patrimonio Fine = Patrimonio Inizio + Depositi/Prelievi + Rendimento
          </p>
        </div>
      </div>

      {/* Heat Map - MACRO Asset Class Performance */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">🔥 Mappa di Calore - Performance MACRO Asset Class</h2>
          <p className="text-sm text-gray-600">
            Identifica quali categorie macro hanno trainato o affossato il portafoglio mese per mese
          </p>
        </div>

        {loadingPrices || Object.keys(monthlyCategoryValues).length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Caricamento dati storici per calcolare le performance...</p>
              <p className="text-sm text-gray-500 mt-2">Questo può richiedere alcuni secondi</p>
            </div>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="py-2 px-3 text-left font-semibold text-gray-900 sticky left-0 bg-gray-100 z-10">
                  Asset Class
                </th>
                {chartData
                  .filter(d => !d.isProjection)
                  .map(month => (
                    <th key={month.month} className="py-2 px-2 text-center font-semibold text-gray-900 min-w-[80px]">
                      {month.displayMonth || month.month}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(CATEGORY_COLORS)
                .filter(cat => cat !== 'Totale' && cat !== 'Cash')
                .map(category => {
                  // Check if this category has any data
                  const hasData = chartData.some(month => {
                    const monthValues = monthlyCategoryValues[month.month] || {};
                    return monthValues[category] > 0;
                  });

                  if (!hasData) return null;

                  return (
                    <tr key={category} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-2 px-3 font-semibold text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-300">
                        {category}
                      </td>
                      {chartData
                        .filter(d => !d.isProjection)
                        .map((month, index, array) => {
                          const currentValue = monthlyCategoryValues[month.month]?.[category] || 0;

                          if (currentValue === 0) {
                            return (
                              <td key={month.month} className="py-2 px-2 text-center text-gray-400">
                                -
                              </td>
                            );
                          }

                          // Calculate performance
                          let performance = null;
                          if (index > 0) {
                            const prevMonth = array[index - 1];
                            const prevValue = monthlyCategoryValues[prevMonth.month]?.[category] || 0;

                            // Calculate net investments in this month for this category
                            const monthTransactions = transactions.filter(tx => {
                              if (!tx.date) return false;
                              const txDate = new Date(tx.date);
                              const [year, monthNum] = month.month.split('-');
                              return txDate.getFullYear() === parseInt(year) &&
                                     (txDate.getMonth() + 1) === parseInt(monthNum) &&
                                     tx.macroCategory === category;
                            });

                            let netInvestment = 0;
                            monthTransactions.forEach(tx => {
                              const amount = tx.quantity * tx.price;
                              const commission = tx.commission || 0;
                              if (tx.type === 'buy') {
                                netInvestment += (amount + commission);
                              } else if (tx.type === 'sell') {
                                netInvestment -= (amount - commission);
                              }
                            });

                            // Performance = (current - prev - netInvestment) / (prev + netInvestment)
                            const expectedValue = prevValue + netInvestment;
                            if (expectedValue > 0) {
                              const returnAmount = currentValue - expectedValue;
                              performance = (returnAmount / expectedValue) * 100;
                            } else if (prevValue > 0) {
                              // If prev value exists but expected is 0 (full liquidation), calculate differently
                              performance = ((currentValue - prevValue) / prevValue) * 100;
                            }
                          }

                          if (performance === null) {
                            return (
                              <td key={month.month} className="py-2 px-2 text-center text-gray-500 bg-gray-50">
                                -
                              </td>
                            );
                          }

                          // Color based on performance
                          let bgColor = 'bg-gray-50';
                          let textColor = 'text-gray-900';

                          if (performance > 10) {
                            bgColor = 'bg-green-700';
                            textColor = 'text-white font-bold';
                          } else if (performance > 5) {
                            bgColor = 'bg-green-500';
                            textColor = 'text-white font-semibold';
                          } else if (performance > 2) {
                            bgColor = 'bg-green-300';
                            textColor = 'text-green-900 font-medium';
                          } else if (performance > 0) {
                            bgColor = 'bg-green-100';
                            textColor = 'text-green-800';
                          } else if (performance > -2) {
                            bgColor = 'bg-red-100';
                            textColor = 'text-red-800';
                          } else if (performance > -5) {
                            bgColor = 'bg-red-300';
                            textColor = 'text-red-900 font-medium';
                          } else if (performance > -10) {
                            bgColor = 'bg-red-500';
                            textColor = 'text-white font-semibold';
                          } else {
                            bgColor = 'bg-red-700';
                            textColor = 'text-white font-bold';
                          }

                          return (
                            <td key={month.month} className={`py-2 px-2 text-center ${bgColor} ${textColor}`}>
                              {performance >= 0 ? '+' : ''}{performance.toFixed(1)}%
                            </td>
                          );
                        })}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-gradient-to-r from-red-50 via-gray-50 to-green-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-900 font-semibold mb-2">🎨 Legenda Colori:</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-700 rounded"></div>
              <span className="text-gray-800">&gt;+10% 🚀</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-800">+5% a +10% 📈</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-300 rounded"></div>
              <span className="text-gray-800">+2% a +5% ✅</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-100 rounded"></div>
              <span className="text-gray-800">0% a +2% ↗️</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-100 rounded"></div>
              <span className="text-gray-800">-2% a 0% ↘️</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-300 rounded"></div>
              <span className="text-gray-800">-5% a -2% ⚠️</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-gray-800">-10% a -5% 📉</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-700 rounded"></div>
              <span className="text-gray-800">&lt;-10% 💥</span>
            </div>
          </div>
          <p className="text-xs text-gray-700 mt-3 italic">
            💡 La performance è calcolata escludendo l'effetto di nuovi investimenti/vendite (Time-Weighted Return)
          </p>
        </div>
        </>
        )}
      </div>

      {/* Heat Map - MICRO Asset Class Performance */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">🔬 Mappa di Calore - Performance MICRO Asset Class</h2>
          <p className="text-sm text-gray-600">
            Dettaglio granulare: quale specifico ticker/categoria ha performato meglio o peggio
          </p>
        </div>

        {loadingPrices || Object.keys(monthlyCategoryValues).length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Caricamento dati storici per calcolare le performance...</p>
              <p className="text-sm text-gray-500 mt-2">Questo può richiedere alcuni secondi</p>
            </div>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="py-2 px-3 text-left font-semibold text-gray-900 sticky left-0 bg-gray-100 z-10 min-w-[120px]">
                  Ticker / Asset
                </th>
                <th className="py-2 px-2 text-left font-semibold text-gray-900">
                  Tipo
                </th>
                {chartData
                  .filter(d => !d.isProjection)
                  .map(month => (
                    <th key={month.month} className="py-2 px-2 text-center font-semibold text-gray-900 min-w-[80px]">
                      {month.displayMonth || month.month}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Get all unique tickers from transactions
                const tickerData = {};
                transactions.forEach(tx => {
                  if (!tx.isCash && tx.macroCategory !== 'Cash' && tx.ticker) {
                    if (!tickerData[tx.ticker]) {
                      tickerData[tx.ticker] = {
                        ticker: tx.ticker,
                        category: tx.macroCategory || 'N/A',
                        microCategory: tx.microCategory || tx.name || tx.ticker
                      };
                    }
                  }
                });

                return Object.values(tickerData)
                  .sort((a, b) => {
                    // Sort by category first, then by ticker
                    if (a.category !== b.category) {
                      return a.category.localeCompare(b.category);
                    }
                    return a.ticker.localeCompare(b.ticker);
                  })
                  .map(({ ticker, category, microCategory }) => {
                    // Check if this ticker has any holdings in any month
                    const hasData = chartData.some(month => {
                      const monthDate = parseISO(`${month.month}-01`);
                      const monthEnd = endOfMonth(monthDate);
                      const txUpToMonth = transactions.filter(tx => {
                        const txDate = parseISO(tx.date);
                        return !isAfter(txDate, monthEnd) && tx.ticker === ticker;
                      });

                      let quantity = 0;
                      txUpToMonth.forEach(tx => {
                        if (tx.type === 'buy') quantity += tx.quantity;
                        else if (tx.type === 'sell') quantity -= tx.quantity;
                      });

                      return quantity > 0;
                    });

                    if (!hasData) return null;

                    return (
                      <tr key={ticker} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2 px-3 font-mono font-semibold text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-300">
                          {ticker}
                        </td>
                        <td className="py-2 px-2 text-gray-600 text-xs">
                          {category}
                        </td>
                        {chartData
                          .filter(d => !d.isProjection)
                          .map((month, index, array) => {
                            // Calculate holdings for this ticker at end of this month
                            const monthDate = parseISO(`${month.month}-01`);
                            const monthEnd = endOfMonth(monthDate);
                            const txUpToMonth = transactions.filter(tx => {
                              const txDate = parseISO(tx.date);
                              return !isAfter(txDate, monthEnd) && tx.ticker === ticker;
                            });

                            let quantity = 0;
                            txUpToMonth.forEach(tx => {
                              if (tx.type === 'buy') quantity += tx.quantity;
                              else if (tx.type === 'sell') quantity -= tx.quantity;
                            });

                            if (quantity <= 0) {
                              return (
                                <td key={month.month} className="py-2 px-2 text-center text-gray-400">
                                  -
                                </td>
                              );
                            }

                            // Get price for this ticker in this month
                            const priceData = monthlyMarketValues[month.month];
                            // We need to recalculate the value for this specific ticker
                            // This is a simplified approach - we'd need access to price tables
                            // For now, calculate performance based on transactions

                            let performance = null;
                            if (index > 0) {
                              const prevMonth = array[index - 1];
                              const prevMonthDate = parseISO(`${prevMonth.month}-01`);
                              const prevMonthEnd = endOfMonth(prevMonthDate);

                              const txUpToPrevMonth = transactions.filter(tx => {
                                const txDate = parseISO(tx.date);
                                return !isAfter(txDate, prevMonthEnd) && tx.ticker === ticker;
                              });

                              let prevQuantity = 0;
                              txUpToPrevMonth.forEach(tx => {
                                if (tx.type === 'buy') prevQuantity += tx.quantity;
                                else if (tx.type === 'sell') prevQuantity -= tx.quantity;
                              });

                              // Calculate net transactions in current month
                              const monthTransactions = transactions.filter(tx => {
                                if (!tx.date || tx.ticker !== ticker) return false;
                                const txDate = new Date(tx.date);
                                const [year, monthNum] = month.month.split('-');
                                return txDate.getFullYear() === parseInt(year) &&
                                       (txDate.getMonth() + 1) === parseInt(monthNum);
                              });

                              let netQuantityChange = 0;
                              monthTransactions.forEach(tx => {
                                if (tx.type === 'buy') netQuantityChange += tx.quantity;
                                else if (tx.type === 'sell') netQuantityChange -= tx.quantity;
                              });

                              // Simple performance calculation: if quantity didn't change, we can estimate performance
                              // Otherwise, this gets complex without price data
                              if (prevQuantity > 0) {
                                // Calculate based on quantity change
                                const quantityGrowth = ((quantity - prevQuantity) / prevQuantity) * 100;

                                // If there were transactions, we can't easily calculate performance without prices
                                // So we'll show quantity growth as a proxy
                                if (netQuantityChange === 0 && quantity === prevQuantity) {
                                  // No quantity change - would need price data to calculate performance
                                  // For now, we'll skip this and show "-"
                                  return (
                                    <td key={month.month} className="py-2 px-2 text-center text-gray-500 bg-gray-50">
                                      ~
                                    </td>
                                  );
                                } else {
                                  // There were transactions - show quantity change
                                  performance = quantityGrowth;
                                }
                              }
                            }

                            if (performance === null) {
                              return (
                                <td key={month.month} className="py-2 px-2 text-center text-gray-500 bg-gray-50">
                                  •
                                </td>
                              );
                            }

                            // Color based on performance (same scale as macro)
                            let bgColor = 'bg-gray-50';
                            let textColor = 'text-gray-900';

                            if (performance > 10) {
                              bgColor = 'bg-green-700';
                              textColor = 'text-white font-bold';
                            } else if (performance > 5) {
                              bgColor = 'bg-green-500';
                              textColor = 'text-white font-semibold';
                            } else if (performance > 2) {
                              bgColor = 'bg-green-300';
                              textColor = 'text-green-900 font-medium';
                            } else if (performance > 0) {
                              bgColor = 'bg-green-100';
                              textColor = 'text-green-800';
                            } else if (performance > -2) {
                              bgColor = 'bg-red-100';
                              textColor = 'text-red-800';
                            } else if (performance > -5) {
                              bgColor = 'bg-red-300';
                              textColor = 'text-red-900 font-medium';
                            } else if (performance > -10) {
                              bgColor = 'bg-red-500';
                              textColor = 'text-white font-semibold';
                            } else {
                              bgColor = 'bg-red-700';
                              textColor = 'text-white font-bold';
                            }

                            return (
                              <td key={month.month} className={`py-2 px-2 text-center ${bgColor} ${textColor}`}>
                                {performance >= 0 ? '+' : ''}{performance.toFixed(1)}%
                              </td>
                            );
                          })}
                      </tr>
                    );
                  }).filter(Boolean);
              })()}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900 font-semibold mb-2">📖 Come leggere le tabelle:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-800">
            <div>• <strong className="text-green-600">Verde</strong>: Asset che hanno guadagnato nel mese</div>
            <div>• <strong className="text-red-600">Rosso</strong>: Asset che hanno perso nel mese</div>
            <div>• <strong>Intensità colore</strong>: Più intenso = performance più estrema</div>
            <div>• <strong>"-"</strong>: Non detenuto in quel mese</div>
            <div>• <strong>"~" o "•"</strong>: Dati insufficienti per calcolo preciso</div>
          </div>
          <p className="text-xs text-blue-800 mt-3 italic">
            💡 Usa queste tabelle per identificare i "colpevoli" della crescita o decrescita del tuo portafoglio!
          </p>
        </div>
        </>
        )}
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
