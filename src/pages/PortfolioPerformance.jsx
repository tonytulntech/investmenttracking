import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, Activity, AlertCircle, Target, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell, ReferenceLine } from 'recharts';
import { getTransactions } from '../services/localStorageService';
import { fetchMultipleHistoricalPrices, buildMonthlyPriceTable } from '../services/historicalPriceService';
import { getCachedPrices } from '../services/priceCache';
import { calculateAllMetrics, calculateCAGR, calculateMaxDrawdown, calculateSharpeRatio, calculateVolatility, calculateBeta, calculateAlpha, calculateTrackingError, calculateInformationRatio, calculateCalmarRatio, calculateRSquared } from '../services/advancedMetricsService';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';

// Benchmark configuration - organized by currency
const BENCHMARK_TICKERS = {
  EUR: {
    'MSCI World': {
      ticker: 'SWDA.MI',
      color: '#3b82f6',
      description: 'Azionario Globale (MSCI World ETF in EUR)'
    },
    'S&P 500': {
      ticker: 'CSPX.L',  // iShares Core S&P 500 UCITS ETF in EUR
      color: '#10b981',
      description: 'Azionario USA (S&P 500 ETF in EUR)'
    },
    '60/40 Portfolio': {
      ticker: null,
      color: '#8b5cf6',
      description: '60% Azionario + 40% Obbligazionario (EUR)',
      composition: {
        equity: { ticker: 'SWDA.MI', weight: 0.6 },
        bond: { ticker: 'VAGF.MI', weight: 0.4 }
      }
    }
  },
  USD: {
    'MSCI World': {
      ticker: 'URTH',  // iShares MSCI World ETF in USD
      color: '#3b82f6',
      description: 'Azionario Globale (MSCI World in USD)'
    },
    'S&P 500': {
      ticker: '^GSPC',
      color: '#10b981',
      description: 'Azionario USA (S&P 500 Index in USD)'
    },
    '60/40 Portfolio': {
      ticker: null,
      color: '#8b5cf6',
      description: '60% Azionario + 40% Obbligazionario (USD)',
      composition: {
        equity: { ticker: '^GSPC', weight: 0.6 },
        bond: { ticker: 'BND', weight: 0.4 }
      }
    }
  }
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

function PortfolioPerformance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('ticker'); // 'ticker', 'macro', 'micro'
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'ytd', '2024', '2023', etc.
  const [monthlyData, setMonthlyData] = useState([]);
  const [monthlyReturns, setMonthlyReturns] = useState([]); // Array of {month, return, monthKey}
  const [availableYears, setAvailableYears] = useState([]);
  const [transactions, setTransactions] = useState([]); // Store transactions for heat maps
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

  // Benchmark comparison state
  const [benchmarkData, setBenchmarkData] = useState({});
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [normalizedChartData, setNormalizedChartData] = useState([]);
  const [benchmarkCurrency, setBenchmarkCurrency] = useState('EUR'); // EUR or USD

  // Contribution analysis state
  const [contributionData, setContributionData] = useState({
    byTicker: [],
    byMicroCategory: [],
    totalReturnEuro: 0,
    totalReturnPercent: 0
  });
  const [contributionView, setContributionView] = useState('ticker'); // 'ticker' or 'micro'

  // Period analysis state
  const [periodReturns, setPeriodReturns] = useState({
    ytd: null,
    '1y': null,
    '3y': null,
    '5y': null,
    all: null
  });
  const [rollingReturns, setRollingReturns] = useState([]); // 12-month rolling returns

  // Advanced risk metrics state (calculated with benchmark)
  const [riskMetrics, setRiskMetrics] = useState({
    beta: null,
    alpha: null,
    trackingError: null,
    informationRatio: null,
    calmarRatio: null,
    rSquared: null,
    benchmarkUsed: null
  });

  useEffect(() => {
    calculatePerformance();
  }, [dateFilter]); // Recalculate when date filter changes

  const calculatePerformance = async () => {
    setLoading(true);
    setError(null);

    try {
      const allTransactions = getTransactions();
      setTransactions(allTransactions); // Store for heat maps

      // Filter out cash transactions
      const assetTransactions = allTransactions.filter(tx => {
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
            // Use average cost method (same as Dashboard) for consistency
            const avgCostPerUnit = holdings[tx.ticker].quantity > 0
              ? holdings[tx.ticker].totalCost / holdings[tx.ticker].quantity
              : 0;
            const costBasisSold = tx.quantity * avgCostPerUnit;

            holdings[tx.ticker].quantity -= tx.quantity;
            holdings[tx.ticker].totalCost -= costBasisSold;  // Subtract cost basis, not sale price
            totalInvested -= costBasisSold;  // Track actual cost basis removed
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

            // NEW: Get nearest available historical price as better fallback
            let lastKnownPrice = null;
            if (!historicalPrice && Object.keys(priceTable).length > 0) {
              const availableMonths = Object.keys(priceTable).sort();

              // First try: find the most recent month before or equal to current month
              for (let i = availableMonths.length - 1; i >= 0; i--) {
                if (availableMonths[i] <= monthKey) {
                  lastKnownPrice = priceTable[availableMonths[i]];
                  break;
                }
              }

              // If no previous month found, use the earliest available price (carry backward)
              // This handles cases like Jan 2021 when data starts from Feb 2021
              if (!lastKnownPrice && availableMonths.length > 0) {
                lastKnownPrice = priceTable[availableMonths[0]];
              }
            }

            // Improved fallback logic:
            // 1. Use historical price if available for this exact month
            // 2. Use last known historical price (carry forward/backward nearest price)
            // 3. Use current price from cache ONLY for current month
            // 4. Last resort: use average cost
            const currentPrice = currentPrices[holding.ticker]?.price;
            const avgCost = holding.totalCost / holding.quantity;

            // For current month, prefer currentPrice; for old months, prefer lastKnownPrice
            const isCurrentMonth = monthKey === format(new Date(), 'yyyy-MM');
            const price = historicalPrice ||
                          (isCurrentMonth ? (currentPrice || lastKnownPrice) : (lastKnownPrice || currentPrice)) ||
                          avgCost;
            const value = holding.quantity * price;

            // DEBUG: Enhanced debug logging for problematic months
            if (monthKey === '2021-01' || monthKey === '2021-02') {
              let fallbackUsed = 'historicalPrice';
              if (!historicalPrice) {
                if (isCurrentMonth) {
                  fallbackUsed = currentPrice ? 'currentPrice' : (lastKnownPrice ? 'lastKnownPrice' : 'avgCost');
                } else {
                  fallbackUsed = lastKnownPrice ? 'lastKnownPrice' : (currentPrice ? 'currentPrice' : 'avgCost');
                }
              }
              console.log(`🔍 DEBUG ${monthKey} - ${holding.ticker}:`, {
                historicalPrice,
                currentPrice,
                lastKnownPrice,
                avgCost: avgCost.toFixed(2),
                finalPrice: price.toFixed(2),
                isCurrentMonth,
                fallbackUsed,
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

        // ============ CONTRIBUTION ANALYSIS ============
        // Calculate per-ticker and per-MICRO category contributions
        console.log('📊 Calculating contribution analysis...');

        // Build ticker info map from transactions
        const tickerInfoMap = {};
        assetTransactions.forEach(tx => {
          if (!tickerInfoMap[tx.ticker]) {
            tickerInfoMap[tx.ticker] = {
              name: tx.name || tx.ticker,
              microCategory: tx.microCategory || tx.subCategory || 'N/A',
              macroCategory: tx.macroCategory || tx.category || 'Altro'
            };
          }
        });

        // Calculate per-ticker metrics
        const tickerContributions = [];
        const allTickers = new Set();

        // Collect all tickers that appear in any month
        monthlyGrowth.forEach(month => {
          Object.keys(month.byTicker).forEach(ticker => allTickers.add(ticker));
        });

        for (const ticker of allTickers) {
          // Calculate average weight over time
          let totalWeight = 0;
          let weightCount = 0;
          let monthlyTickerReturns = [];

          for (let i = 0; i < monthlyGrowth.length; i++) {
            const month = monthlyGrowth[i];
            const tickerValue = month.byTicker[ticker] || 0;
            const portfolioTotal = month.total || 0;

            if (portfolioTotal > 0 && tickerValue > 0) {
              const weight = (tickerValue / portfolioTotal) * 100;
              totalWeight += weight;
              weightCount++;
            }

            // Calculate monthly return for this ticker (from month 1 onwards)
            if (i > 0) {
              const prevMonth = monthlyGrowth[i - 1];
              const prevTickerValue = prevMonth.byTicker[ticker] || 0;
              const currTickerValue = tickerValue;

              // Get net cash flow for this ticker this month
              const [year, monthNum] = month.monthKey.split('-');
              const tickerTxThisMonth = assetTransactions.filter(tx => {
                if (!tx.date || tx.ticker !== ticker) return false;
                const txDate = new Date(tx.date);
                return txDate.getFullYear() === parseInt(year) &&
                       (txDate.getMonth() + 1) === parseInt(monthNum);
              });

              let netCashFlow = 0;
              tickerTxThisMonth.forEach(tx => {
                const amount = tx.quantity * tx.price;
                const commission = tx.commission || 0;
                if (tx.type === 'buy') {
                  netCashFlow += (amount + commission);
                } else if (tx.type === 'sell') {
                  netCashFlow -= (amount - commission);
                }
              });

              // TWR for this ticker this month
              const expectedValue = prevTickerValue + netCashFlow;
              if (expectedValue > 0) {
                const monthReturn = ((currTickerValue - expectedValue) / expectedValue) * 100;
                monthlyTickerReturns.push({
                  monthKey: month.monthKey,
                  return: monthReturn,
                  weight: portfolioTotal > 0 ? (currTickerValue / portfolioTotal) * 100 : 0
                });
              }
            }
          }

          const avgWeight = weightCount > 0 ? totalWeight / weightCount : 0;

          // Calculate cumulative TWR for this ticker
          let cumulativeTWR = 100;
          monthlyTickerReturns.forEach(m => {
            cumulativeTWR = cumulativeTWR * (1 + m.return / 100);
          });
          const tickerTotalReturn = cumulativeTWR - 100; // percentage

          // Calculate contribution to portfolio return
          // Contribution ≈ Average Weight × Asset Return
          const contributionPercent = (avgWeight / 100) * tickerTotalReturn;

          // Calculate contribution in euros
          // This is an approximation: contribution€ ≈ (contributionPercent / totalReturnPercent) × totalReturn€
          const contributionEuro = totalReturnPercent !== 0
            ? (contributionPercent / totalReturnPercent) * totalReturn
            : 0;

          if (avgWeight > 0.01) { // Only include tickers with meaningful weight
            tickerContributions.push({
              ticker,
              name: tickerInfoMap[ticker]?.name || ticker,
              microCategory: tickerInfoMap[ticker]?.microCategory || 'N/A',
              macroCategory: tickerInfoMap[ticker]?.macroCategory || 'Altro',
              avgWeight,
              assetReturn: tickerTotalReturn,
              contributionEuro,
              contributionPercent
            });
          }
        }

        // Sort by contribution € descending
        tickerContributions.sort((a, b) => b.contributionEuro - a.contributionEuro);

        // Group by MICRO category
        const microCategoryMap = {};
        tickerContributions.forEach(tc => {
          const micro = tc.microCategory || 'N/A';
          if (!microCategoryMap[micro]) {
            microCategoryMap[micro] = {
              microCategory: micro,
              macroCategory: tc.macroCategory,
              tickers: [],
              totalWeight: 0,
              weightedReturn: 0,
              contributionEuro: 0,
              contributionPercent: 0
            };
          }
          microCategoryMap[micro].tickers.push(tc.ticker);
          microCategoryMap[micro].totalWeight += tc.avgWeight;
          microCategoryMap[micro].weightedReturn += tc.avgWeight * tc.assetReturn;
          microCategoryMap[micro].contributionEuro += tc.contributionEuro;
          microCategoryMap[micro].contributionPercent += tc.contributionPercent;
        });

        // Calculate average return for each MICRO category
        const microContributions = Object.values(microCategoryMap).map(mc => ({
          ...mc,
          avgWeight: mc.totalWeight,
          assetReturn: mc.totalWeight > 0 ? mc.weightedReturn / mc.totalWeight : 0
        }));

        // Sort by contribution € descending
        microContributions.sort((a, b) => b.contributionEuro - a.contributionEuro);

        console.log(`📊 Contribution analysis: ${tickerContributions.length} tickers, ${microContributions.length} MICRO categories`);

        setContributionData({
          byTicker: tickerContributions,
          byMicroCategory: microContributions,
          totalReturnEuro: totalReturn,
          totalReturnPercent
        });

        // ============ PERIOD ANALYSIS ============
        // Calculate returns for different time periods (YTD, 1Y, 3Y, 5Y, ALL)
        console.log('📊 Calculating period returns...');

        const now = new Date();
        const currentYear = now.getFullYear();

        // Helper function to calculate return for a specific period
        const calculatePeriodReturn = (startMonthKey) => {
          // Find the starting month index
          const startIdx = monthlyGrowth.findIndex(m => m.monthKey >= startMonthKey);
          if (startIdx === -1 || startIdx >= monthlyGrowth.length - 1) return null;

          // Get relevant monthly returns for this period
          const periodMonthlyReturns = calculatedMonthlyReturns.filter(r => r.monthKey >= startMonthKey);
          if (periodMonthlyReturns.length === 0) return null;

          // Calculate cumulative TWR for the period
          let cumulativeTWR = 100;
          periodMonthlyReturns.forEach(m => {
            cumulativeTWR = cumulativeTWR * (1 + m.return / 100);
          });

          const periodReturn = cumulativeTWR - 100;
          const years = periodMonthlyReturns.length / 12;
          const annualizedReturn = years > 0 ? (Math.pow(cumulativeTWR / 100, 1 / years) - 1) * 100 : periodReturn;

          return {
            return: periodReturn,
            annualized: annualizedReturn,
            months: periodMonthlyReturns.length,
            startDate: periodMonthlyReturns[0]?.month || 'N/A'
          };
        };

        // Calculate period returns
        const periodResults = {};

        // YTD (Year to Date)
        const ytdStartKey = `${currentYear}-01`;
        periodResults.ytd = calculatePeriodReturn(ytdStartKey);

        // 1 Year
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearKey = format(oneYearAgo, 'yyyy-MM');
        periodResults['1y'] = calculatePeriodReturn(oneYearKey);

        // 3 Years
        const threeYearsAgo = new Date(now);
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        const threeYearKey = format(threeYearsAgo, 'yyyy-MM');
        periodResults['3y'] = calculatePeriodReturn(threeYearKey);

        // 5 Years
        const fiveYearsAgo = new Date(now);
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        const fiveYearKey = format(fiveYearsAgo, 'yyyy-MM');
        periodResults['5y'] = calculatePeriodReturn(fiveYearKey);

        // ALL (from beginning)
        if (calculatedMonthlyReturns.length > 0) {
          let allCumulativeTWR = 100;
          calculatedMonthlyReturns.forEach(m => {
            allCumulativeTWR = allCumulativeTWR * (1 + m.return / 100);
          });
          const allReturn = allCumulativeTWR - 100;
          const allYears = calculatedMonthlyReturns.length / 12;
          periodResults.all = {
            return: allReturn,
            annualized: allYears > 0 ? (Math.pow(allCumulativeTWR / 100, 1 / allYears) - 1) * 100 : allReturn,
            months: calculatedMonthlyReturns.length,
            startDate: calculatedMonthlyReturns[0]?.month || 'N/A'
          };
        }

        setPeriodReturns(periodResults);
        console.log('📊 Period returns:', periodResults);

        // ============ ROLLING RETURNS ============
        // Calculate 12-month rolling returns
        console.log('📊 Calculating rolling returns...');

        const rollingData = [];
        if (calculatedMonthlyReturns.length >= 12) {
          for (let i = 11; i < calculatedMonthlyReturns.length; i++) {
            // Get the last 12 months of returns ending at index i
            const last12Months = calculatedMonthlyReturns.slice(i - 11, i + 1);

            // Calculate cumulative TWR for these 12 months
            let rolling12mTWR = 100;
            last12Months.forEach(m => {
              rolling12mTWR = rolling12mTWR * (1 + m.return / 100);
            });

            const rolling12mReturn = rolling12mTWR - 100;

            rollingData.push({
              month: calculatedMonthlyReturns[i].month,
              monthKey: calculatedMonthlyReturns[i].monthKey,
              rolling12m: Math.round(rolling12mReturn * 100) / 100
            });
          }
        }

        setRollingReturns(rollingData);
        console.log(`📊 Rolling returns: ${rollingData.length} data points`);
      }

      console.log('✅ Performance calculation complete');

    } catch (error) {
      console.error('Error calculating performance:', error);
      setError(`Errore nel calcolo della performance: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate benchmark comparison when portfolio data is ready
  const calculateBenchmarks = async (portfolioMonthlyData, portfolioMonthlyReturns, startDate, currency = 'EUR') => {
    if (!portfolioMonthlyData || portfolioMonthlyData.length === 0) return;

    setBenchmarkLoading(true);
    console.log(`📊 Starting benchmark calculation (${currency})...`);

    try {
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDateStr = format(startDate, 'yyyy-MM-dd');

      // Get benchmarks for selected currency
      const BENCHMARKS = BENCHMARK_TICKERS[currency];

      // Get all benchmark tickers we need to fetch
      const tickersToFetch = new Set();
      Object.values(BENCHMARKS).forEach(benchmark => {
        if (benchmark.ticker) {
          tickersToFetch.add(benchmark.ticker);
        }
        if (benchmark.composition) {
          tickersToFetch.add(benchmark.composition.equity.ticker);
          tickersToFetch.add(benchmark.composition.bond.ticker);
        }
      });

      console.log(`📡 Fetching benchmark prices for: ${Array.from(tickersToFetch).join(', ')}`);

      // Fetch historical prices for all benchmarks
      const benchmarkPrices = await fetchMultipleHistoricalPrices(
        Array.from(tickersToFetch),
        startDateStr,
        endDate
      );

      // Build price tables for each benchmark ticker
      const priceTables = {};
      tickersToFetch.forEach(ticker => {
        priceTables[ticker] = buildMonthlyPriceTable(benchmarkPrices[ticker] || []);
      });

      // Get month keys from portfolio data
      const monthKeys = portfolioMonthlyData.map(m => m.monthKey);

      // Calculate metrics for each benchmark
      const benchmarkResults = {};

      for (const [benchmarkName, benchmarkConfig] of Object.entries(BENCHMARKS)) {
        console.log(`📈 Calculating metrics for ${benchmarkName}...`);

        let monthlyValues = [];
        let monthlyReturnsArr = [];

        if (benchmarkConfig.ticker) {
          // Simple benchmark (single ticker)
          const priceTable = priceTables[benchmarkConfig.ticker];

          // Get first available price as base (normalize to 100)
          let basePrice = null;
          for (const monthKey of monthKeys) {
            if (priceTable[monthKey]) {
              basePrice = priceTable[monthKey];
              break;
            }
          }

          if (!basePrice) {
            console.warn(`⚠️ No price data for ${benchmarkName}`);
            continue;
          }

          // Calculate normalized values and returns
          let prevValue = null;
          for (const monthKey of monthKeys) {
            const price = priceTable[monthKey];
            if (price) {
              const normalizedValue = (price / basePrice) * 100;
              monthlyValues.push({ monthKey, value: normalizedValue, price });

              if (prevValue !== null) {
                const returnPct = ((normalizedValue - prevValue) / prevValue) * 100;
                monthlyReturnsArr.push(returnPct);
              }
              prevValue = normalizedValue;
            }
          }
        } else if (benchmarkConfig.composition) {
          // Composite benchmark (e.g., 60/40)
          const equityTable = priceTables[benchmarkConfig.composition.equity.ticker];
          const bondTable = priceTables[benchmarkConfig.composition.bond.ticker];

          // Get first available prices as base
          let equityBasePrice = null;
          let bondBasePrice = null;

          for (const monthKey of monthKeys) {
            if (!equityBasePrice && equityTable[monthKey]) {
              equityBasePrice = equityTable[monthKey];
            }
            if (!bondBasePrice && bondTable[monthKey]) {
              bondBasePrice = bondTable[monthKey];
            }
            if (equityBasePrice && bondBasePrice) break;
          }

          if (!equityBasePrice || !bondBasePrice) {
            console.warn(`⚠️ Missing price data for ${benchmarkName} composite`);
            continue;
          }

          // Calculate composite normalized values
          let prevValue = null;
          for (const monthKey of monthKeys) {
            const equityPrice = equityTable[monthKey];
            const bondPrice = bondTable[monthKey];

            if (equityPrice && bondPrice) {
              const equityNormalized = (equityPrice / equityBasePrice) * 100;
              const bondNormalized = (bondPrice / bondBasePrice) * 100;
              const compositeValue = (equityNormalized * benchmarkConfig.composition.equity.weight) +
                                     (bondNormalized * benchmarkConfig.composition.bond.weight);

              monthlyValues.push({ monthKey, value: compositeValue });

              if (prevValue !== null) {
                const returnPct = ((compositeValue - prevValue) / prevValue) * 100;
                monthlyReturnsArr.push(returnPct);
              }
              prevValue = compositeValue;
            }
          }
        }

        if (monthlyValues.length < 2) {
          console.warn(`⚠️ Insufficient data for ${benchmarkName}`);
          continue;
        }

        // Calculate metrics
        const values = monthlyValues.map(m => m.value);
        const years = monthlyValues.length / 12;

        const totalReturn = ((values[values.length - 1] - 100) / 100) * 100;
        const cagr = calculateCAGR(100, values[values.length - 1], years);
        const drawdownResult = calculateMaxDrawdown(values);
        const volatility = calculateVolatility(monthlyReturnsArr);
        const sharpeRatio = calculateSharpeRatio(monthlyReturnsArr, 2); // 2% risk-free rate

        benchmarkResults[benchmarkName] = {
          ...benchmarkConfig,
          monthlyValues,
          monthlyReturns: monthlyReturnsArr,
          metrics: {
            totalReturn,
            cagr,
            maxDrawdown: drawdownResult.maxDrawdown,
            volatility,
            sharpeRatio
          }
        };

        console.log(`✅ ${benchmarkName}: Return ${totalReturn.toFixed(2)}%, CAGR ${cagr.toFixed(2)}%, Vol ${volatility.toFixed(2)}%`);
      }

      setBenchmarkData(benchmarkResults);

      // Build normalized chart data using CUMULATIVE TWR (Time-Weighted Return)
      // This excludes the effect of cash flows (new investments/withdrawals)
      // So we compare pure returns, not absolute portfolio growth
      const chartData = [];

      // Calculate cumulative TWR for portfolio (compound the monthly returns)
      // Start at 100, then apply each month's TWR return percentage
      let cumulativeTWR = 100;
      const portfolioCumulativeReturns = [100]; // First month = 100

      // portfolioMonthlyReturns contains TWR returns starting from month 2
      // so portfolioCumulativeReturns[0] = 100 (first month)
      // portfolioCumulativeReturns[1] = 100 * (1 + return_month_2/100)
      // etc.
      for (let i = 0; i < portfolioMonthlyReturns.length; i++) {
        const monthReturn = portfolioMonthlyReturns[i].return;
        cumulativeTWR = cumulativeTWR * (1 + monthReturn / 100);
        portfolioCumulativeReturns.push(Math.round(cumulativeTWR * 100) / 100);
      }

      console.log(`📊 Portfolio cumulative TWR: started at 100, ended at ${cumulativeTWR.toFixed(2)}`);
      console.log(`📊 This represents a ${((cumulativeTWR - 100)).toFixed(2)}% total return (excluding new investments)`);

      // Build chart data - use cumulative TWR for portfolio, normalized values for benchmarks
      for (let i = 0; i < portfolioMonthlyData.length; i++) {
        const monthData = portfolioMonthlyData[i];

        // Use cumulative TWR for portfolio (excludes cash flows effect)
        const portfolioValue = portfolioCumulativeReturns[i] !== undefined
          ? portfolioCumulativeReturns[i]
          : 100;

        const dataPoint = {
          month: monthData.month,
          monthKey: monthData.monthKey,
          'Il mio Portafoglio': portfolioValue
        };

        // Add benchmark values (already normalized to 100)
        for (const [name, data] of Object.entries(benchmarkResults)) {
          const benchmarkMonth = data.monthlyValues.find(m => m.monthKey === monthData.monthKey);
          if (benchmarkMonth) {
            dataPoint[name] = Math.round(benchmarkMonth.value * 100) / 100;
          }
        }

        chartData.push(dataPoint);
      }

      // Debug: log first and last values to verify normalization
      if (chartData.length > 0) {
        console.log(`📊 Normalized chart - First month:`, chartData[0]);
        console.log(`📊 Normalized chart - Last month:`, chartData[chartData.length - 1]);
      }

      setNormalizedChartData(chartData);
      console.log('✅ Benchmark calculation complete');

    } catch (error) {
      console.error('Error calculating benchmarks:', error);
    } finally {
      setBenchmarkLoading(false);
    }
  };

  // Trigger benchmark calculation when portfolio data or currency changes
  useEffect(() => {
    if (monthlyData.length > 0 && statistics.startDate) {
      calculateBenchmarks(monthlyData, monthlyReturns, statistics.startDate, benchmarkCurrency);
    }
  }, [monthlyData, statistics.startDate, benchmarkCurrency]);

  // Calculate advanced risk metrics when benchmark data is available
  useEffect(() => {
    if (!benchmarkData || Object.keys(benchmarkData).length === 0 || monthlyReturns.length === 0) {
      return;
    }

    console.log('📊 Calculating advanced risk metrics...');

    // Use MSCI World as the primary benchmark for risk metrics
    const primaryBenchmark = benchmarkData['MSCI World'] || Object.values(benchmarkData)[0];
    if (!primaryBenchmark || !primaryBenchmark.monthlyReturns) {
      console.warn('⚠️ No benchmark returns available for risk metrics');
      return;
    }

    const benchmarkName = benchmarkData['MSCI World'] ? 'MSCI World' : Object.keys(benchmarkData)[0];
    const benchmarkReturns = primaryBenchmark.monthlyReturns;
    const portfolioReturns = monthlyReturns.map(m => m.return);

    // Align returns by month key
    const alignedPortfolioReturns = [];
    const alignedBenchmarkReturns = [];

    // Get benchmark month keys
    const benchmarkMonthlyValues = primaryBenchmark.monthlyValues || [];

    for (let i = 0; i < monthlyReturns.length && i < benchmarkReturns.length; i++) {
      alignedPortfolioReturns.push(portfolioReturns[i]);
      alignedBenchmarkReturns.push(benchmarkReturns[i]);
    }

    if (alignedPortfolioReturns.length < 3) {
      console.warn('⚠️ Not enough aligned data for risk metrics');
      return;
    }

    // Calculate Beta
    const beta = calculateBeta(alignedPortfolioReturns, alignedBenchmarkReturns);

    // Calculate annualized returns for Alpha calculation
    const portfolioCAGR = statistics.cagr || 0;
    const benchmarkCAGR = primaryBenchmark.metrics?.cagr || 0;

    // Calculate Alpha
    const alpha = calculateAlpha(portfolioCAGR, benchmarkCAGR, beta, 2); // 2% risk-free rate

    // Calculate Tracking Error
    const trackingError = calculateTrackingError(alignedPortfolioReturns, alignedBenchmarkReturns);

    // Calculate Information Ratio
    const informationRatio = calculateInformationRatio(portfolioCAGR, benchmarkCAGR, trackingError);

    // Calculate Calmar Ratio
    const calmarRatio = calculateCalmarRatio(portfolioCAGR, statistics.maxDrawdown || 0);

    // Calculate R-Squared
    const rSquared = calculateRSquared(alignedPortfolioReturns, alignedBenchmarkReturns);

    const metrics = {
      beta,
      alpha,
      trackingError,
      informationRatio,
      calmarRatio,
      rSquared,
      benchmarkUsed: benchmarkName
    };

    console.log('📊 Risk metrics calculated:', metrics);
    setRiskMetrics(metrics);

  }, [benchmarkData, monthlyReturns, statistics.cagr, statistics.maxDrawdown]);

  // Transform monthlyData into format needed by heat maps
  const { monthlyCategoryValues, monthlyMicroCategoryValues, monthlyTickerValues } = useMemo(() => {
    const categoryValues = {};
    const microCategoryValues = {};
    const tickerValues = {};

    monthlyData.forEach(month => {
      // Store category values
      categoryValues[month.monthKey] = month.byMacro || {};

      // Store micro category values
      microCategoryValues[month.monthKey] = month.byMicro || {};

      // Store ticker values
      tickerValues[month.monthKey] = month.byTicker || {};
    });

    return { monthlyCategoryValues: categoryValues, monthlyMicroCategoryValues: microCategoryValues, monthlyTickerValues: tickerValues };
  }, [monthlyData]);

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

        {/* Advanced Risk Metrics (relative to benchmark) */}
        {riskMetrics.beta !== null && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-600" />
              Metriche di Rischio Avanzate
              <span className="text-xs font-normal text-gray-500 ml-2">
                (vs {riskMetrics.benchmarkUsed})
              </span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Beta */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Beta</span>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">β</span>
                </div>
                <div className={`text-2xl font-bold ${
                  riskMetrics.beta < 0.8 ? 'text-blue-600' :
                  riskMetrics.beta > 1.2 ? 'text-red-600' :
                  'text-gray-900'
                }`}>
                  {riskMetrics.beta.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {riskMetrics.beta < 0.8 ? 'Difensivo' :
                   riskMetrics.beta > 1.2 ? 'Aggressivo' :
                   'Neutro'}
                </div>
              </div>

              {/* Alpha */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Alpha</span>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">α</span>
                </div>
                <div className={`text-2xl font-bold ${riskMetrics.alpha >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {riskMetrics.alpha >= 0 ? '+' : ''}{riskMetrics.alpha.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {riskMetrics.alpha > 0 ? 'Sovraperformance' : 'Sottoperformance'}
                </div>
              </div>

              {/* R-Squared */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">R²</span>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">R²</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {riskMetrics.rSquared.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {riskMetrics.rSquared > 80 ? 'Alta correlazione' :
                   riskMetrics.rSquared > 50 ? 'Media correlazione' :
                   'Bassa correlazione'}
                </div>
              </div>

              {/* Tracking Error */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Tracking Error</span>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">TE</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {riskMetrics.trackingError.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Deviazione dal benchmark
                </div>
              </div>

              {/* Information Ratio */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Info Ratio</span>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">IR</span>
                </div>
                <div className={`text-2xl font-bold ${
                  riskMetrics.informationRatio > 0.5 ? 'text-green-600' :
                  riskMetrics.informationRatio < -0.5 ? 'text-red-600' :
                  'text-gray-900'
                }`}>
                  {riskMetrics.informationRatio.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {riskMetrics.informationRatio > 0.5 ? 'Buono' :
                   riskMetrics.informationRatio > 1 ? 'Eccellente' :
                   'Nella media'}
                </div>
              </div>

              {/* Calmar Ratio */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Calmar Ratio</span>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">CR</span>
                </div>
                <div className={`text-2xl font-bold ${
                  riskMetrics.calmarRatio > 1 ? 'text-green-600' :
                  riskMetrics.calmarRatio < 0.5 ? 'text-red-600' :
                  'text-gray-900'
                }`}>
                  {riskMetrics.calmarRatio === Infinity ? '∞' : riskMetrics.calmarRatio.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  CAGR / Max Drawdown
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-xs text-purple-700">
                <strong>📊 Guida alle metriche:</strong><br/>
                <strong>Beta</strong>: &lt;1 = meno volatile del mercato, &gt;1 = più volatile |
                <strong> Alpha</strong>: rendimento extra rispetto al CAPM |
                <strong> R²</strong>: % di movimento spiegato dal benchmark |
                <strong> IR</strong>: &gt;0.5 è buono, &gt;1 è eccellente |
                <strong> Calmar</strong>: &gt;1 è buono (rendimento vs rischio drawdown)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Benchmark Comparison Section */}
      <div className="card">
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-primary-600" />
              <h2 className="text-xl font-bold text-gray-900">Confronto con Benchmark</h2>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Valuta Benchmark:</span>
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setBenchmarkCurrency('EUR')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    benchmarkCurrency === 'EUR'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🇪🇺 EUR
                </button>
                <button
                  onClick={() => setBenchmarkCurrency('USD')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    benchmarkCurrency === 'USD'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🇺🇸 USD
                </button>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Come si è comportato il tuo portafoglio rispetto ai principali indici di mercato
            {statistics.startDate && (
              <span className="font-medium"> (dal {format(statistics.startDate, 'MMMM yyyy', { locale: it })} ad oggi)</span>
            )}
          </p>
          {benchmarkCurrency === 'USD' && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                ⚠️ <strong>Nota:</strong> I benchmark in USD includono l'effetto cambio EUR/USD. Un dollaro forte aumenta i rendimenti percepiti in euro.
              </p>
            </div>
          )}
        </div>

        {benchmarkLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600">Caricamento benchmark...</p>
            </div>
          </div>
        ) : Object.keys(benchmarkData).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>Dati benchmark non disponibili</p>
          </div>
        ) : (
          <>
            {/* Comparison Table */}
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="py-3 px-4 text-left font-semibold text-gray-900">Metrica</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-900 bg-primary-50">
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-gray-900"></span>
                        Il mio Portafoglio
                      </span>
                    </th>
                    {Object.entries(benchmarkData).map(([name, data]) => (
                      <th key={name} className="py-3 px-4 text-center font-semibold text-gray-900">
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }}></span>
                          {name} <span className="text-xs text-gray-500">({benchmarkCurrency})</span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Total Return */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">Rendimento Totale</td>
                    <td className={`py-3 px-4 text-center font-bold bg-primary-50 ${statistics.totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {statistics.totalReturnPercent >= 0 ? '+' : ''}{statistics.totalReturnPercent.toFixed(2)}%
                    </td>
                    {Object.entries(benchmarkData).map(([name, data]) => (
                      <td key={name} className={`py-3 px-4 text-center font-semibold ${data.metrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.metrics.totalReturn >= 0 ? '+' : ''}{data.metrics.totalReturn.toFixed(2)}%
                      </td>
                    ))}
                  </tr>

                  {/* CAGR */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      CAGR
                      <span className="text-xs text-gray-500 ml-1">(annualizzato)</span>
                    </td>
                    <td className={`py-3 px-4 text-center font-bold bg-primary-50 ${statistics.cagr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {statistics.cagr >= 0 ? '+' : ''}{statistics.cagr.toFixed(2)}%
                    </td>
                    {Object.entries(benchmarkData).map(([name, data]) => (
                      <td key={name} className={`py-3 px-4 text-center font-semibold ${data.metrics.cagr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.metrics.cagr >= 0 ? '+' : ''}{data.metrics.cagr.toFixed(2)}%
                      </td>
                    ))}
                  </tr>

                  {/* Volatility */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      Volatilità
                      <span className="text-xs text-gray-500 ml-1">(annualizzata)</span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold bg-primary-50 text-gray-900">
                      {statistics.volatility.toFixed(2)}%
                    </td>
                    {Object.entries(benchmarkData).map(([name, data]) => (
                      <td key={name} className="py-3 px-4 text-center font-semibold text-gray-900">
                        {data.metrics.volatility.toFixed(2)}%
                      </td>
                    ))}
                  </tr>

                  {/* Max Drawdown */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">Drawdown Massimo</td>
                    <td className="py-3 px-4 text-center font-bold bg-primary-50 text-red-600">
                      -{statistics.maxDrawdown.toFixed(2)}%
                    </td>
                    {Object.entries(benchmarkData).map(([name, data]) => (
                      <td key={name} className="py-3 px-4 text-center font-semibold text-red-600">
                        -{data.metrics.maxDrawdown.toFixed(2)}%
                      </td>
                    ))}
                  </tr>

                  {/* Sharpe Ratio */}
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">Sharpe Ratio</td>
                    <td className={`py-3 px-4 text-center font-bold bg-primary-50 ${statistics.sharpeRatio >= 1 ? 'text-green-600' : statistics.sharpeRatio >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                      {statistics.sharpeRatio.toFixed(2)}
                    </td>
                    {Object.entries(benchmarkData).map(([name, data]) => (
                      <td key={name} className={`py-3 px-4 text-center font-semibold ${data.metrics.sharpeRatio >= 1 ? 'text-green-600' : data.metrics.sharpeRatio >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        {data.metrics.sharpeRatio.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Performance Difference Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {Object.entries(benchmarkData).map(([name, data]) => {
                const diff = statistics.totalReturnPercent - data.metrics.totalReturn;
                const isOutperforming = diff > 0;
                return (
                  <div key={name} className={`p-4 rounded-lg border-2 ${isOutperforming ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }}></span>
                      <span className="font-medium text-gray-900">vs {name}</span>
                    </div>
                    <div className={`text-2xl font-bold ${isOutperforming ? 'text-green-600' : 'text-red-600'}`}>
                      {isOutperforming ? '+' : ''}{diff.toFixed(2)}%
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {isOutperforming ? 'Stai battendo il benchmark' : 'Il benchmark ha fatto meglio'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Normalized Performance Chart */}
            {normalizedChartData.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Andamento Normalizzato (base 100)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Confronto visivo della crescita partendo dallo stesso valore iniziale
                </p>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={normalizedChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      tickFormatter={(value) => value.toFixed(0)}
                      tick={{ fontSize: 12 }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      formatter={(value, name) => [`${value.toFixed(2)}`, name]}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Il mio Portafoglio"
                      stroke="#1f2937"
                      strokeWidth={3}
                      dot={false}
                      name="Il mio Portafoglio"
                    />
                    {Object.entries(benchmarkData).map(([name, data]) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={data.color}
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="5 5"
                        name={name}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Benchmark Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Informazioni Benchmark</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {Object.entries(benchmarkData).map(([name, data]) => (
                  <div key={name} className="flex items-start gap-2">
                    <span className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: data.color }}></span>
                    <div>
                      <p className="font-medium text-gray-900">{name}</p>
                      <p className="text-gray-600">{data.description}</p>
                      {data.ticker && <p className="text-xs text-gray-500">Ticker: {data.ticker}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Contribution Analysis Section */}
      {contributionData.byTicker.length > 0 && (
        <div className="card">
          <div className="mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
              <div className="flex items-center gap-3">
                <PieChartIcon className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-900">Contribution Analysis</h2>
              </div>

              {/* View Toggle */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setContributionView('ticker')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    contributionView === 'ticker'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Per Ticker
                </button>
                <button
                  onClick={() => setContributionView('micro')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    contributionView === 'micro'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Per Categoria MICRO
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Contributo di ogni asset al rendimento totale del portafoglio
              {statistics.startDate && (
                <span className="font-medium"> (dal {format(statistics.startDate, 'MMMM yyyy', { locale: it })} ad oggi)</span>
              )}
            </p>
          </div>

          {/* Contribution Table - By Ticker */}
          {contributionView === 'ticker' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="py-3 px-4 text-left font-semibold text-gray-900">Ticker</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-900">Categoria</th>
                    <th className="py-3 px-4 text-right font-semibold text-gray-900">Peso Medio %</th>
                    <th className="py-3 px-4 text-right font-semibold text-gray-900">Rendimento Asset %</th>
                    <th className="py-3 px-4 text-right font-semibold text-gray-900">Contributo €</th>
                    <th className="py-3 px-4 text-right font-semibold text-gray-900">Contributo %</th>
                  </tr>
                </thead>
                <tbody>
                  {contributionData.byTicker.map((item, index) => (
                    <tr key={item.ticker} className={`border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-gray-900">{item.ticker}</div>
                        <div className="text-xs text-gray-500">{item.name}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">{item.microCategory}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {item.avgWeight.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${item.assetReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.assetReturn >= 0 ? '+' : ''}{item.assetReturn.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${item.contributionEuro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.contributionEuro >= 0 ? '+' : ''}€{item.contributionEuro.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${item.contributionPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.contributionPercent >= 0 ? '+' : ''}{item.contributionPercent.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-primary-50 border-t-2 border-primary-300">
                    <td colSpan={2} className="py-3 px-4 font-bold text-primary-900">TOTALE</td>
                    <td className="py-3 px-4 text-right font-bold text-primary-900">
                      {contributionData.byTicker.reduce((sum, t) => sum + t.avgWeight, 0).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-primary-900">-</td>
                    <td className={`py-3 px-4 text-right font-bold ${contributionData.totalReturnEuro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {contributionData.totalReturnEuro >= 0 ? '+' : ''}€{contributionData.totalReturnEuro.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${contributionData.totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {contributionData.totalReturnPercent >= 0 ? '+' : ''}{contributionData.totalReturnPercent.toFixed(2)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Contribution Table - By MICRO Category */}
          {contributionView === 'micro' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="py-3 px-4 text-left font-semibold text-gray-900">Categoria MICRO</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-900">Ticker</th>
                    <th className="py-3 px-4 text-right font-semibold text-gray-900">Peso Medio %</th>
                    <th className="py-3 px-4 text-right font-semibold text-gray-900">Rendimento %</th>
                    <th className="py-3 px-4 text-right font-semibold text-gray-900">Contributo €</th>
                    <th className="py-3 px-4 text-right font-semibold text-gray-900">Contributo %</th>
                  </tr>
                </thead>
                <tbody>
                  {contributionData.byMicroCategory.map((item, index) => (
                    <tr key={item.microCategory} className={`border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{item.microCategory}</div>
                        <div className="text-xs text-gray-500">{item.macroCategory}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600 font-mono">
                        {item.tickers.slice(0, 3).join(', ')}{item.tickers.length > 3 ? ` +${item.tickers.length - 3}` : ''}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {item.avgWeight.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${item.assetReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.assetReturn >= 0 ? '+' : ''}{item.assetReturn.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${item.contributionEuro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.contributionEuro >= 0 ? '+' : ''}€{item.contributionEuro.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${item.contributionPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.contributionPercent >= 0 ? '+' : ''}{item.contributionPercent.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-primary-50 border-t-2 border-primary-300">
                    <td colSpan={2} className="py-3 px-4 font-bold text-primary-900">TOTALE</td>
                    <td className="py-3 px-4 text-right font-bold text-primary-900">
                      {contributionData.byMicroCategory.reduce((sum, t) => sum + t.avgWeight, 0).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-primary-900">-</td>
                    <td className={`py-3 px-4 text-right font-bold ${contributionData.totalReturnEuro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {contributionData.totalReturnEuro >= 0 ? '+' : ''}€{contributionData.totalReturnEuro.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${contributionData.totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {contributionData.totalReturnPercent >= 0 ? '+' : ''}{contributionData.totalReturnPercent.toFixed(2)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">📖 Come leggere la tabella</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-800">
              <div><strong>Peso Medio %</strong>: peso medio dell'asset nel portafoglio durante il periodo</div>
              <div><strong>Rendimento Asset %</strong>: rendimento Time-Weighted dell'asset singolo</div>
              <div><strong>Contributo €</strong>: quanto quell'asset ha aggiunto (o tolto) in euro</div>
              <div><strong>Contributo %</strong>: quota del rendimento totale attribuibile a quell'asset</div>
            </div>
            <p className="text-xs text-blue-800 mt-3 italic">
              💡 La somma dei contributi % è uguale al rendimento totale del portafoglio ({contributionData.totalReturnPercent >= 0 ? '+' : ''}{contributionData.totalReturnPercent.toFixed(2)}%)
            </p>
          </div>
        </div>
      )}

      {/* Period Analysis Section */}
      {(periodReturns.ytd || periodReturns['1y'] || periodReturns.all) && (
        <div className="card">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-primary-600" />
              <h2 className="text-xl font-bold text-gray-900">Rendimenti per Periodo</h2>
            </div>
            <p className="text-sm text-gray-600">
              Performance del portafoglio su diversi orizzonti temporali (rendimenti TWR)
            </p>
          </div>

          {/* Period Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {/* YTD */}
            <div className={`p-4 rounded-xl border-2 ${periodReturns.ytd ? (periodReturns.ytd.return >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">YTD</div>
              <div className="text-sm text-gray-600 mb-2">{new Date().getFullYear()}</div>
              {periodReturns.ytd ? (
                <>
                  <div className={`text-2xl font-bold ${periodReturns.ytd.return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {periodReturns.ytd.return >= 0 ? '+' : ''}{periodReturns.ytd.return.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{periodReturns.ytd.months} mesi</div>
                </>
              ) : (
                <div className="text-lg text-gray-400">N/A</div>
              )}
            </div>

            {/* 1 Year */}
            <div className={`p-4 rounded-xl border-2 ${periodReturns['1y'] ? (periodReturns['1y'].return >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">1 Anno</div>
              <div className="text-sm text-gray-600 mb-2">Ultimi 12 mesi</div>
              {periodReturns['1y'] ? (
                <>
                  <div className={`text-2xl font-bold ${periodReturns['1y'].return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {periodReturns['1y'].return >= 0 ? '+' : ''}{periodReturns['1y'].return.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{periodReturns['1y'].months} mesi</div>
                </>
              ) : (
                <div className="text-lg text-gray-400">N/A</div>
              )}
            </div>

            {/* 3 Years */}
            <div className={`p-4 rounded-xl border-2 ${periodReturns['3y'] ? (periodReturns['3y'].return >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">3 Anni</div>
              <div className="text-sm text-gray-600 mb-2">
                {periodReturns['3y'] ? `Ann: ${periodReturns['3y'].annualized >= 0 ? '+' : ''}${periodReturns['3y'].annualized.toFixed(1)}%/y` : 'Ultimi 36 mesi'}
              </div>
              {periodReturns['3y'] ? (
                <>
                  <div className={`text-2xl font-bold ${periodReturns['3y'].return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {periodReturns['3y'].return >= 0 ? '+' : ''}{periodReturns['3y'].return.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{periodReturns['3y'].months} mesi</div>
                </>
              ) : (
                <div className="text-lg text-gray-400">N/A</div>
              )}
            </div>

            {/* 5 Years */}
            <div className={`p-4 rounded-xl border-2 ${periodReturns['5y'] ? (periodReturns['5y'].return >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">5 Anni</div>
              <div className="text-sm text-gray-600 mb-2">
                {periodReturns['5y'] ? `Ann: ${periodReturns['5y'].annualized >= 0 ? '+' : ''}${periodReturns['5y'].annualized.toFixed(1)}%/y` : 'Ultimi 60 mesi'}
              </div>
              {periodReturns['5y'] ? (
                <>
                  <div className={`text-2xl font-bold ${periodReturns['5y'].return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {periodReturns['5y'].return >= 0 ? '+' : ''}{periodReturns['5y'].return.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{periodReturns['5y'].months} mesi</div>
                </>
              ) : (
                <div className="text-lg text-gray-400">N/A</div>
              )}
            </div>

            {/* ALL */}
            <div className={`p-4 rounded-xl border-2 ${periodReturns.all ? (periodReturns.all.return >= 0 ? 'bg-primary-50 border-primary-200' : 'bg-red-50 border-red-200') : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Totale</div>
              <div className="text-sm text-gray-600 mb-2">
                {periodReturns.all ? `Ann: ${periodReturns.all.annualized >= 0 ? '+' : ''}${periodReturns.all.annualized.toFixed(1)}%/y` : 'Dall\'inizio'}
              </div>
              {periodReturns.all ? (
                <>
                  <div className={`text-2xl font-bold ${periodReturns.all.return >= 0 ? 'text-primary-600' : 'text-red-600'}`}>
                    {periodReturns.all.return >= 0 ? '+' : ''}{periodReturns.all.return.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{periodReturns.all.months} mesi</div>
                </>
              ) : (
                <div className="text-lg text-gray-400">N/A</div>
              )}
            </div>
          </div>

          {/* Rolling Returns Chart */}
          {rollingReturns.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Rolling Returns (12 mesi)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Rendimento cumulativo degli ultimi 12 mesi, calcolato per ogni mese
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={rollingReturns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value.toFixed(2)}%`, 'Rolling 12m']}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="5 5" />
                  <Line
                    type="monotone"
                    dataKey="rolling12m"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    name="Rolling 12m Return"
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Rolling Returns Stats */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <div className="text-xs text-gray-500 mb-1">Media</div>
                  <div className={`text-lg font-bold ${(rollingReturns.reduce((s, r) => s + r.rolling12m, 0) / rollingReturns.length) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {((rollingReturns.reduce((s, r) => s + r.rolling12m, 0) / rollingReturns.length) >= 0 ? '+' : '')}
                    {(rollingReturns.reduce((s, r) => s + r.rolling12m, 0) / rollingReturns.length).toFixed(1)}%
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <div className="text-xs text-gray-500 mb-1">Massimo</div>
                  <div className="text-lg font-bold text-green-600">
                    +{Math.max(...rollingReturns.map(r => r.rolling12m)).toFixed(1)}%
                  </div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <div className="text-xs text-gray-500 mb-1">Minimo</div>
                  <div className="text-lg font-bold text-red-600">
                    {Math.min(...rollingReturns.map(r => r.rolling12m)).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">📖 Come leggere i dati</h4>
            <div className="text-xs text-blue-800 space-y-1">
              <p><strong>Rendimento %</strong>: rendimento TWR cumulativo del periodo (esclude effetto versamenti)</p>
              <p><strong>Ann:</strong>: rendimento annualizzato (CAGR) per periodi superiori a 1 anno</p>
              <p><strong>Rolling 12m</strong>: per ogni mese, mostra il rendimento degli ultimi 12 mesi consecutivi</p>
            </div>
          </div>
        </div>
      )}

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

      {/* Heat Map - MACRO Asset Class Performance */}
      {monthlyData.length > 0 && (
        <div className="card">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">🔥 Mappa di Calore - Performance MACRO Asset Class</h2>
            <p className="text-sm text-gray-600">
              Identifica quali categorie macro hanno trainato o affossato il portafoglio mese per mese
            </p>
          </div>

          {loading || Object.keys(monthlyCategoryValues).length === 0 ? (
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
                      {monthlyData.map(month => (
                        <th key={month.monthKey} className="py-2 px-2 text-center font-semibold text-gray-900 min-w-[80px]">
                          {month.month}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(CATEGORY_COLORS)
                      .filter(cat => cat !== 'Totale' && cat !== 'Cash')
                      .map(category => {
                        // Check if this category has any data
                        const hasData = monthlyData.some(month => {
                          const monthValues = monthlyCategoryValues[month.monthKey] || {};
                          return monthValues[category] > 0;
                        });

                        if (!hasData) return null;

                        return (
                          <tr key={category} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-2 px-3 font-semibold text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-300">
                              {category}
                            </td>
                            {monthlyData.map((month, index, array) => {
                              const currentValue = monthlyCategoryValues[month.monthKey]?.[category] || 0;

                              if (currentValue === 0) {
                                return (
                                  <td key={month.monthKey} className="py-2 px-2 text-center text-gray-400">
                                    -
                                  </td>
                                );
                              }

                              // Calculate performance
                              let performance = null;
                              if (index > 0) {
                                const prevMonth = array[index - 1];
                                const prevValue = monthlyCategoryValues[prevMonth.monthKey]?.[category] || 0;

                                // Calculate net investments in this month for this category
                                const [year, monthNum] = month.monthKey.split('-');
                                const monthTransactions = transactions.filter(tx => {
                                  if (!tx.date) return false;
                                  const txDate = new Date(tx.date);
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
                                  <td key={month.monthKey} className="py-2 px-2 text-center text-gray-500 bg-gray-50">
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
                                <td key={month.monthKey} className={`py-2 px-2 text-center ${bgColor} ${textColor}`}>
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
      )}

      {/* Heat Map - MICRO Asset Class Performance */}
      {monthlyData.length > 0 && (
        <div className="card">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">📊 Mappa di Calore - Performance MICRO Asset Class</h2>
            <p className="text-sm text-gray-600">
              Performance dettagliata per micro categoria (Azionario Mondiale, Azionario USA, Obbligazioni Gov, etc.)
            </p>
          </div>

          {loading || Object.keys(monthlyMicroCategoryValues).length === 0 ? (
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
                      <th className="py-2 px-3 text-left font-semibold text-gray-900 sticky left-0 bg-gray-100 z-10 min-w-[150px]">
                        Micro Asset Class
                      </th>
                      {monthlyData.map(month => (
                        <th key={month.monthKey} className="py-2 px-2 text-center font-semibold text-gray-900 min-w-[80px]">
                          {month.month}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Get all unique micro categories
                      const allMicroCategories = new Set();
                      Object.values(monthlyMicroCategoryValues).forEach(monthValues => {
                        Object.keys(monthValues).forEach(microCat => {
                          if (microCat !== 'N/A' && monthValues[microCat] > 0) {
                            allMicroCategories.add(microCat);
                          }
                        });
                      });

                      return Array.from(allMicroCategories)
                        .sort()
                        .map(microCategory => {
                          return (
                            <tr key={microCategory} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="py-2 px-3 font-semibold text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-300">
                                {microCategory}
                              </td>
                              {monthlyData.map((month, index, array) => {
                                const currentValue = monthlyMicroCategoryValues[month.monthKey]?.[microCategory] || 0;

                                if (currentValue === 0) {
                                  return (
                                    <td key={month.monthKey} className="py-2 px-2 text-center text-gray-400">
                                      -
                                    </td>
                                  );
                                }

                                // Calculate performance
                                let performance = null;
                                if (index > 0) {
                                  const prevMonth = array[index - 1];
                                  const prevValue = monthlyMicroCategoryValues[prevMonth.monthKey]?.[microCategory] || 0;

                                  // Calculate net investments in this month for this micro category
                                  const [year, monthNum] = month.monthKey.split('-');
                                  const monthTransactions = transactions.filter(tx => {
                                    if (!tx.date) return false;
                                    const txDate = new Date(tx.date);
                                    const txMicroCat = tx.microCategory || tx.macroCategory || 'N/A';
                                    return txDate.getFullYear() === parseInt(year) &&
                                           (txDate.getMonth() + 1) === parseInt(monthNum) &&
                                           txMicroCat === microCategory;
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
                                    <td key={month.monthKey} className="py-2 px-2 text-center text-gray-500 bg-gray-50">
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
                                  <td key={month.monthKey} className={`py-2 px-2 text-center ${bgColor} ${textColor}`}>
                                    {performance >= 0 ? '+' : ''}{performance.toFixed(1)}%
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        });
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900 font-semibold mb-2">📖 Come leggere la tabella:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-800">
                  <div>• <strong className="text-green-600">Verde</strong>: Micro categorie che hanno guadagnato nel mese</div>
                  <div>• <strong className="text-red-600">Rosso</strong>: Micro categorie che hanno perso nel mese</div>
                  <div>• <strong>Intensità colore</strong>: Più intenso = performance più estrema</div>
                  <div>• <strong>"-"</strong>: Non detenuto in quel mese</div>
                </div>
                <p className="text-xs text-blue-800 mt-3 italic">
                  💡 Es: "Azionario Mondiale" include tutti i tuoi investimenti azionari globali (SWDA, ACWIA, etc.)
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Heat Map - TICKER Performance */}
      {monthlyData.length > 0 && (
        <div className="card">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">🔬 Mappa di Calore - Performance per TICKER</h2>
            <p className="text-sm text-gray-600">
              Dettaglio granulare: quale specifico ticker ha performato meglio o peggio
            </p>
          </div>

          {loading || Object.keys(monthlyTickerValues).length === 0 ? (
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
                      {monthlyData.map(month => (
                        <th key={month.monthKey} className="py-2 px-2 text-center font-semibold text-gray-900 min-w-[80px]">
                          {month.month}
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
                          // Check if this ticker has any data in any month
                          const hasData = monthlyData.some(month => {
                            const monthValues = monthlyTickerValues[month.monthKey] || {};
                            return monthValues[ticker] > 0;
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
                              {monthlyData.map((month, index, array) => {
                                // Get current value for this ticker
                                const currentValue = monthlyTickerValues[month.monthKey]?.[ticker] || 0;

                                if (currentValue === 0) {
                                  return (
                                    <td key={month.monthKey} className="py-2 px-2 text-center text-gray-400">
                                      -
                                    </td>
                                  );
                                }

                                // Calculate performance (Time-Weighted Return)
                                let performance = null;
                                if (index > 0) {
                                  const prevMonth = array[index - 1];
                                  const prevValue = monthlyTickerValues[prevMonth.monthKey]?.[ticker] || 0;

                                  // Calculate net investments in this month for this ticker
                                  const [year, monthNum] = month.monthKey.split('-');
                                  const monthTransactions = transactions.filter(tx => {
                                    if (!tx.date || tx.ticker !== ticker) return false;
                                    const txDate = new Date(tx.date);
                                    return txDate.getFullYear() === parseInt(year) &&
                                           (txDate.getMonth() + 1) === parseInt(monthNum);
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
                                    <td key={month.monthKey} className="py-2 px-2 text-center text-gray-500 bg-gray-50">
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
                                  <td key={month.monthKey} className={`py-2 px-2 text-center ${bgColor} ${textColor}`}>
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
                  <div>• <strong>"•"</strong>: Dati insufficienti per calcolo preciso</div>
                </div>
                <p className="text-xs text-blue-800 mt-3 italic">
                  💡 Usa queste tabelle per identificare i "colpevoli" della crescita o decrescita del tuo portafoglio!
                </p>
              </div>
            </>
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
              Questa pagina utilizza <strong>prezzi storici reali</strong> recuperati da Yahoo Finance.
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
