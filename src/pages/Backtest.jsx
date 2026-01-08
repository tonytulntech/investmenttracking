import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Calendar, BarChart3, AlertTriangle, Play, Settings, Info, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar } from 'recharts';
import { getTransactions } from '../services/localStorageService';
import { getPACTemplates } from '../services/pacService';
import { fetchMultipleHistoricalPrices, buildMonthlyPriceTable } from '../services/historicalPriceService';
import { getProxyInfo, adjustPricesForTER, ETF_PROXY_MAP } from '../config/etfProxyMap';
import { calculateCAGR, calculateMaxDrawdown, calculateVolatility, calculateSharpeRatio } from '../services/advancedMetricsService';
import { format, parseISO, eachMonthOfInterval, startOfMonth, subYears, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';

// Period options for historical view
const PERIOD_OPTIONS = [
  { value: 'all', label: 'Tutto', years: null },
  { value: '30y', label: '30 anni', years: 30 },
  { value: '20y', label: '20 anni', years: 20 },
  { value: '10y', label: '10 anni', years: 10 },
  { value: '5y', label: '5 anni', years: 5 },
  { value: '3y', label: '3 anni', years: 3 },
  { value: '1y', label: '1 anno', years: 1 }
];

// Benchmark for comparison
const BENCHMARK_TICKER = 'URTH'; // MSCI World proxy

export default function Backtest() {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Historical backtest state
  const [dataMode, setDataMode] = useState('real'); // 'real' or 'extended'
  const [chartMode, setChartMode] = useState('normalized'); // 'normalized' or 'absolute'
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [historicalData, setHistoricalData] = useState([]);
  const [historicalMetrics, setHistoricalMetrics] = useState(null);
  const [portfolioTickers, setPortfolioTickers] = useState([]);
  const [earliestProxyDate, setEarliestProxyDate] = useState(null);
  const [earliestRealDate, setEarliestRealDate] = useState(null);

  // Monte Carlo state
  const [monteCarloParams, setMonteCarloParams] = useState({
    expectedReturn: 7.0,
    volatility: 15.0,
    initialInvestment: 10000,
    monthlyContribution: 500,
    years: 20,
    targetAmount: 500000,
    simulations: 1000
  });
  const [monteCarloResults, setMonteCarloResults] = useState(null);
  const [monteCarloRunning, setMonteCarloRunning] = useState(false);
  const [showSamplePaths, setShowSamplePaths] = useState(true);

  // Load strategy and PAC settings
  useEffect(() => {
    loadStrategyParams();
    loadHistoricalData();
  }, []);

  // Reload historical data when mode or period changes
  useEffect(() => {
    if (portfolioTickers.length > 0) {
      loadHistoricalData();
    }
  }, [dataMode, selectedPeriod]);

  const loadStrategyParams = () => {
    try {
      // Load strategy from localStorage
      const strategySaved = localStorage.getItem('investment_strategy');
      const strategy = strategySaved ? JSON.parse(strategySaved) : null;

      // Load PAC templates from pacService
      const pacTemplates = getPACTemplates();
      const activePac = pacTemplates.find(p => p.isActive);

      if (strategy) {
        setMonteCarloParams(prev => ({
          ...prev,
          expectedReturn: strategy.expectedReturn || prev.expectedReturn,
          volatility: strategy.volatility || prev.volatility
        }));
      }

      if (activePac) {
        setMonteCarloParams(prev => ({
          ...prev,
          monthlyContribution: activePac.totalAmount || prev.monthlyContribution
        }));
      }
    } catch (err) {
      console.error('Error loading strategy params:', err);
    }
  };

  const loadHistoricalData = async () => {
    setLoading(true);
    setError(null);

    try {
      const transactions = getTransactions();
      const assetTransactions = transactions.filter(tx =>
        !tx.isCash && tx.macroCategory !== 'Cash' && tx.ticker
      );

      if (assetTransactions.length === 0) {
        setError('Nessuna transazione trovata. Aggiungi transazioni per vedere il backtest.');
        setLoading(false);
        return;
      }

      // Get unique tickers
      const tickers = [...new Set(assetTransactions.map(tx => tx.ticker))];
      setPortfolioTickers(tickers);

      // Determine date range
      const sortedTx = assetTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
      const firstTxDate = parseISO(sortedTx[0].date);
      const now = new Date();

      // Calculate earliest possible date based on mode
      let startDate;
      let earliestReal = firstTxDate;
      let earliestProxy = null;

      if (dataMode === 'extended') {
        // Find the earliest proxy date available
        let oldestProxyYear = 2100;
        tickers.forEach(ticker => {
          const proxyInfo = getProxyInfo(ticker);
          if (proxyInfo) {
            const inceptionYear = parseInt(proxyInfo.inception.split('-')[0]);
            // Proxy data typically starts earlier than ETF inception
            const proxyStartYear = Math.max(1985, inceptionYear - 30); // Estimate proxy availability
            if (proxyStartYear < oldestProxyYear) {
              oldestProxyYear = proxyStartYear;
            }
          }
        });

        // Use a reasonable start for extended backtest
        earliestProxy = new Date(Math.max(oldestProxyYear, 1990), 0, 1);
        startDate = earliestProxy;
        setEarliestProxyDate(earliestProxy);
      } else {
        startDate = firstTxDate;
      }

      setEarliestRealDate(earliestReal);

      // Apply period filter
      const periodOption = PERIOD_OPTIONS.find(p => p.value === selectedPeriod);
      if (periodOption && periodOption.years) {
        const periodStart = subYears(now, periodOption.years);
        if (periodStart > startDate) {
          startDate = periodStart;
        }
      }

      // Fetch historical prices
      const tickersToFetch = [...tickers];
      const proxyMap = {};

      // Add proxy tickers if in extended mode
      if (dataMode === 'extended') {
        tickers.forEach(ticker => {
          const proxyInfo = getProxyInfo(ticker);
          if (proxyInfo && !tickersToFetch.includes(proxyInfo.proxyTicker)) {
            tickersToFetch.push(proxyInfo.proxyTicker);
            proxyMap[ticker] = proxyInfo;
          }
        });
      }

      // Add benchmark
      if (!tickersToFetch.includes(BENCHMARK_TICKER)) {
        tickersToFetch.push(BENCHMARK_TICKER);
      }

      console.log(`📊 Fetching prices for ${tickersToFetch.length} tickers from ${format(startDate, 'yyyy-MM-dd')}`);

      const historicalPrices = await fetchMultipleHistoricalPrices(
        tickersToFetch,
        format(startDate, 'yyyy-MM-dd'),
        format(now, 'yyyy-MM-dd')
      );

      // Build monthly price tables
      const priceTables = {};
      tickersToFetch.forEach(ticker => {
        priceTables[ticker] = buildMonthlyPriceTable(historicalPrices[ticker] || []);
      });

      // Generate monthly data
      const months = eachMonthOfInterval({ start: startDate, end: now });

      // Calculate portfolio allocation weights from strategy or transactions
      const strategySaved = localStorage.getItem('investment_strategy');
      const strategy = strategySaved ? JSON.parse(strategySaved) : null;
      const allocation = {};

      if (strategy && strategy.microAllocation) {
        // Use strategy allocation
        const totalAllocation = Object.values(strategy.microAllocation).reduce((s, v) => s + v, 0);
        // Map micro categories to tickers (simplified)
        tickers.forEach(ticker => {
          allocation[ticker] = 100 / tickers.length; // Equal weight as fallback
        });
      } else {
        // Equal weight
        tickers.forEach(ticker => {
          allocation[ticker] = 100 / tickers.length;
        });
      }

      // Calculate monthly portfolio value
      const chartData = [];
      let baseValue = null;
      let benchmarkBaseValue = null;

      months.forEach(monthDate => {
        const monthKey = format(monthDate, 'yyyy-MM');
        let portfolioValue = 0;
        let validPrices = 0;
        let usesProxy = false;

        // Get ETF inception dates for reference
        const etfInceptionDate = earliestReal;

        tickers.forEach(ticker => {
          const weight = allocation[ticker] / 100;
          let price = priceTables[ticker]?.[monthKey];

          // If no real price and we're in extended mode, use proxy
          if (!price && dataMode === 'extended' && proxyMap[ticker]) {
            const proxyInfo = proxyMap[ticker];
            const proxyPrice = priceTables[proxyInfo.proxyTicker]?.[monthKey];
            if (proxyPrice) {
              // Adjust for TER (simple daily compounding approximation)
              const monthsSinceStart = chartData.length;
              const terAdjustment = Math.pow(1 - proxyInfo.ter / 100, monthsSinceStart / 12);
              price = proxyPrice * terAdjustment;
              usesProxy = true;
            }
          }

          if (price) {
            portfolioValue += price * weight;
            validPrices++;
          }
        });

        // Get benchmark price
        const benchmarkPrice = priceTables[BENCHMARK_TICKER]?.[monthKey];

        if (validPrices > 0 && portfolioValue > 0) {
          if (baseValue === null) {
            baseValue = portfolioValue;
            benchmarkBaseValue = benchmarkPrice || portfolioValue;
          }

          const normalizedValue = (portfolioValue / baseValue) * 100;
          const benchmarkNormalized = benchmarkPrice
            ? (benchmarkPrice / benchmarkBaseValue) * 100
            : null;

          chartData.push({
            month: format(monthDate, 'MMM yyyy', { locale: it }),
            monthKey,
            date: monthDate,
            portfolio: chartMode === 'normalized' ? normalizedValue : portfolioValue,
            portfolioNormalized: normalizedValue,
            benchmark: benchmarkNormalized,
            usesProxy,
            isBeforeRealData: monthDate < earliestReal
          });
        }
      });

      setHistoricalData(chartData);

      // Calculate metrics
      if (chartData.length > 1) {
        const returns = [];
        for (let i = 1; i < chartData.length; i++) {
          const ret = ((chartData[i].portfolioNormalized - chartData[i - 1].portfolioNormalized) /
            chartData[i - 1].portfolioNormalized) * 100;
          returns.push(ret);
        }

        const totalReturn = chartData[chartData.length - 1].portfolioNormalized - 100;
        const years = chartData.length / 12;
        const cagr = calculateCAGR(100, chartData[chartData.length - 1].portfolioNormalized, years);
        const volatility = calculateVolatility(returns);
        const maxDrawdownResult = calculateMaxDrawdown(chartData.map(d => d.portfolioNormalized));
        const sharpeRatio = calculateSharpeRatio(returns, 2);

        setHistoricalMetrics({
          totalReturn,
          cagr,
          volatility,
          maxDrawdown: maxDrawdownResult.maxDrawdown,
          sharpeRatio,
          years,
          months: chartData.length
        });
      }

      console.log(`✅ Historical data loaded: ${chartData.length} months`);
    } catch (err) {
      console.error('Error loading historical data:', err);
      setError(`Errore nel caricamento dati: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Monte Carlo Simulation
  const runMonteCarloSimulation = () => {
    setMonteCarloRunning(true);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        const {
          expectedReturn,
          volatility,
          initialInvestment,
          monthlyContribution,
          years,
          targetAmount,
          simulations
        } = monteCarloParams;

        const monthlyReturn = expectedReturn / 12 / 100;
        const monthlyVolatility = (volatility / Math.sqrt(12)) / 100;
        const totalMonths = years * 12;

        const results = [];
        const samplePaths = [];
        const numSamplePaths = 20;

        // Run simulations
        for (let sim = 0; sim < simulations; sim++) {
          let value = initialInvestment;
          const path = [value];

          for (let month = 1; month <= totalMonths; month++) {
            // Add monthly contribution
            value += monthlyContribution;

            // Apply random return (geometric brownian motion)
            const randomReturn = monthlyReturn + monthlyVolatility * gaussianRandom();
            value = value * (1 + randomReturn);

            if (sim < numSamplePaths) {
              path.push(value);
            }
          }

          results.push(value);

          if (sim < numSamplePaths) {
            samplePaths.push(path);
          }
        }

        // Sort results for percentile calculation
        results.sort((a, b) => a - b);

        // Calculate percentiles
        const getPercentile = (arr, p) => {
          const index = Math.floor(arr.length * p / 100);
          return arr[index];
        };

        const percentile10 = getPercentile(results, 10);
        const percentile25 = getPercentile(results, 25);
        const percentile50 = getPercentile(results, 50);
        const percentile75 = getPercentile(results, 75);
        const percentile90 = getPercentile(results, 90);

        // Calculate probability of reaching target
        const successCount = results.filter(v => v >= targetAmount).length;
        const successProbability = (successCount / simulations) * 100;

        // Calculate total contributions
        const totalContributions = initialInvestment + (monthlyContribution * totalMonths);

        // Build histogram data
        const minVal = Math.min(...results);
        const maxVal = Math.max(...results);
        const bucketCount = 30;
        const bucketSize = (maxVal - minVal) / bucketCount;
        const histogram = [];

        for (let i = 0; i < bucketCount; i++) {
          const bucketStart = minVal + (i * bucketSize);
          const bucketEnd = bucketStart + bucketSize;
          const count = results.filter(v => v >= bucketStart && v < bucketEnd).length;
          histogram.push({
            range: `€${Math.round(bucketStart / 1000)}k`,
            value: bucketStart + bucketSize / 2,
            count,
            frequency: (count / simulations) * 100
          });
        }

        // Build sample paths data for chart
        const pathsData = [];
        for (let month = 0; month <= totalMonths; month++) {
          const dataPoint = { month };
          samplePaths.forEach((path, idx) => {
            dataPoint[`path${idx}`] = path[month];
          });

          // Add percentile bands
          dataPoint.p10 = percentile10 * (month / totalMonths);
          dataPoint.p50 = percentile50 * (month / totalMonths);
          dataPoint.p90 = percentile90 * (month / totalMonths);

          pathsData.push(dataPoint);
        }

        setMonteCarloResults({
          percentile10,
          percentile25,
          percentile50,
          percentile75,
          percentile90,
          successProbability,
          totalContributions,
          histogram,
          samplePaths: pathsData,
          numPaths: numSamplePaths
        });
      } catch (err) {
        console.error('Monte Carlo error:', err);
      } finally {
        setMonteCarloRunning(false);
      }
    }, 100);
  };

  // Gaussian random number generator (Box-Muller transform)
  const gaussianRandom = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };

  // Custom tooltip for historical chart
  const HistoricalTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-primary-600">
            Portafoglio: {data.portfolioNormalized?.toFixed(2) || 'N/A'}
          </p>
          {data.benchmark && (
            <p className="text-blue-600">
              Benchmark: {data.benchmark.toFixed(2)}
            </p>
          )}
          {data.usesProxy && (
            <p className="text-xs text-orange-600 mt-1">⚠️ Dati proxy (pre-ETF)</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Backtest & Proiezioni</h1>
        </div>
        <p className="text-gray-600">
          Analizza la performance storica del tuo portafoglio (con backtest esteso prima del lancio degli ETF)
          e simula scenari futuri basati sulla tua strategia ideale.
        </p>
      </div>

      {/* Section 1: Historical Backtest */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary-600" />
              Andamento Storico Esteso
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {dataMode === 'extended'
                ? 'Backtest esteso con dati proxy degli indici sottostanti'
                : 'Dati reali degli ETF dal loro lancio'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setDataMode('real')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  dataMode === 'real'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dati Reali ETF
              </button>
              <button
                onClick={() => setDataMode('extended')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  dataMode === 'extended'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Backtest Esteso
              </button>
            </div>

            {/* Period Selector */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              {PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Disclaimer for extended mode */}
        {dataMode === 'extended' && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800">
              <strong>Disclaimer:</strong> Performance pre-lancio ETF basata su indice sottostante al netto costi approssimativi (TER).
              Non rappresenta risultati reali dell'ETF. Le linee tratteggiate indicano dati proxy.
            </p>
          </div>
        )}

        {/* Loading/Error States */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Caricamento dati storici...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3" />
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Historical Chart */}
            {historicalData.length > 0 && (
              <div className="mb-6">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      interval={Math.floor(historicalData.length / 12)}
                    />
                    <YAxis
                      tickFormatter={(v) => chartMode === 'normalized' ? v.toFixed(0) : `€${(v/1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<HistoricalTooltip />} />
                    <Legend />

                    {/* Portfolio line - solid for real, dashed for proxy */}
                    <Line
                      type="monotone"
                      dataKey="portfolioNormalized"
                      stroke="#1f2937"
                      strokeWidth={2}
                      dot={false}
                      name="Il mio Portafoglio"
                      strokeDasharray={dataMode === 'extended' ? "5 5" : "0"}
                    />

                    {/* Benchmark line */}
                    <Line
                      type="monotone"
                      dataKey="benchmark"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="MSCI World"
                      strokeDasharray="3 3"
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Legend note */}
                <div className="flex items-center justify-center gap-6 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-6 h-0.5 bg-gray-900"></span> Linea solida = Dati reali
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-6 h-0.5 bg-gray-900" style={{borderTop: '2px dashed #1f2937'}}></span> Linea tratteggiata = Dati proxy
                  </span>
                </div>
              </div>
            )}

            {/* Historical Metrics */}
            {historicalMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Rendimento Totale</div>
                  <div className={`text-2xl font-bold ${historicalMetrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {historicalMetrics.totalReturn >= 0 ? '+' : ''}{historicalMetrics.totalReturn.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">{historicalMetrics.months} mesi</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">CAGR</div>
                  <div className={`text-2xl font-bold ${historicalMetrics.cagr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {historicalMetrics.cagr >= 0 ? '+' : ''}{historicalMetrics.cagr.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-500">annualizzato</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Volatilità</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {historicalMetrics.volatility.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">annualizzata</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Max Drawdown</div>
                  <div className="text-2xl font-bold text-red-600">
                    -{historicalMetrics.maxDrawdown.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">dal picco</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Sharpe Ratio</div>
                  <div className={`text-2xl font-bold ${
                    historicalMetrics.sharpeRatio > 1 ? 'text-green-600' :
                    historicalMetrics.sharpeRatio > 0 ? 'text-gray-900' :
                    'text-red-600'
                  }`}>
                    {historicalMetrics.sharpeRatio.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">risk-adjusted</div>
                </div>
              </div>
            )}

            {/* Ticker Info */}
            {portfolioTickers.length > 0 && dataMode === 'extended' && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Mapping Proxy Utilizzati
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                  {portfolioTickers.map(ticker => {
                    const proxyInfo = getProxyInfo(ticker);
                    return (
                      <div key={ticker} className="flex justify-between text-blue-800">
                        <span className="font-mono">{ticker}</span>
                        <span>
                          {proxyInfo
                            ? `→ ${proxyInfo.proxyTicker} (TER: ${proxyInfo.ter}%)`
                            : '→ Dati reali'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Section 2: Monte Carlo Simulation */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary-600" />
              Simulazione Monte Carlo
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Proiezione futura basata sulla tua Strategia attuale
            </p>
          </div>

          <button
            onClick={runMonteCarloSimulation}
            disabled={monteCarloRunning}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {monteCarloRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Simulazione in corso...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Esegui Simulazione
              </>
            )}
          </button>
        </div>

        {/* Monte Carlo Parameters */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rendimento Atteso (%/anno)</label>
            <input
              type="number"
              step="0.5"
              value={monteCarloParams.expectedReturn}
              onChange={(e) => setMonteCarloParams(p => ({ ...p, expectedReturn: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Volatilità (%/anno)</label>
            <input
              type="number"
              step="0.5"
              value={monteCarloParams.volatility}
              onChange={(e) => setMonteCarloParams(p => ({ ...p, volatility: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Investimento Iniziale (€)</label>
            <input
              type="number"
              step="1000"
              value={monteCarloParams.initialInvestment}
              onChange={(e) => setMonteCarloParams(p => ({ ...p, initialInvestment: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">PAC Mensile (€)</label>
            <input
              type="number"
              step="50"
              value={monteCarloParams.monthlyContribution}
              onChange={(e) => setMonteCarloParams(p => ({ ...p, monthlyContribution: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Anni Proiezione</label>
            <input
              type="number"
              step="1"
              min="1"
              max="50"
              value={monteCarloParams.years}
              onChange={(e) => setMonteCarloParams(p => ({ ...p, years: parseInt(e.target.value) || 10 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Obiettivo (€)</label>
            <input
              type="number"
              step="10000"
              value={monteCarloParams.targetAmount}
              onChange={(e) => setMonteCarloParams(p => ({ ...p, targetAmount: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">N° Simulazioni</label>
            <select
              value={monteCarloParams.simulations}
              onChange={(e) => setMonteCarloParams(p => ({ ...p, simulations: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value={500}>500</option>
              <option value={1000}>1.000</option>
              <option value={5000}>5.000</option>
              <option value={10000}>10.000</option>
            </select>
          </div>
        </div>

        {/* Monte Carlo Results */}
        {monteCarloResults && (
          <>
            {/* Results Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                <div className="text-xs text-red-600 uppercase mb-1">10° Percentile (Pessimista)</div>
                <div className="text-2xl font-bold text-red-700">
                  €{Math.round(monteCarloResults.percentile10).toLocaleString('it-IT')}
                </div>
              </div>

              <div className="bg-primary-50 rounded-lg p-4 text-center border border-primary-200">
                <div className="text-xs text-primary-600 uppercase mb-1">50° Percentile (Mediano)</div>
                <div className="text-2xl font-bold text-primary-700">
                  €{Math.round(monteCarloResults.percentile50).toLocaleString('it-IT')}
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                <div className="text-xs text-green-600 uppercase mb-1">90° Percentile (Ottimista)</div>
                <div className="text-2xl font-bold text-green-700">
                  €{Math.round(monteCarloResults.percentile90).toLocaleString('it-IT')}
                </div>
              </div>

              <div className={`rounded-lg p-4 text-center border ${
                monteCarloResults.successProbability >= 70 ? 'bg-green-50 border-green-200' :
                monteCarloResults.successProbability >= 40 ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="text-xs text-gray-600 uppercase mb-1">
                  Probabilità Obiettivo (€{(monteCarloParams.targetAmount/1000).toFixed(0)}k)
                </div>
                <div className={`text-2xl font-bold ${
                  monteCarloResults.successProbability >= 70 ? 'text-green-700' :
                  monteCarloResults.successProbability >= 40 ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {monteCarloResults.successProbability.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="flex flex-wrap gap-4 mb-6 text-sm">
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <span className="text-gray-600">Contributi Totali: </span>
                <span className="font-semibold">€{monteCarloResults.totalContributions.toLocaleString('it-IT')}</span>
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <span className="text-gray-600">25° Percentile: </span>
                <span className="font-semibold">€{Math.round(monteCarloResults.percentile25).toLocaleString('it-IT')}</span>
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <span className="text-gray-600">75° Percentile: </span>
                <span className="font-semibold">€{Math.round(monteCarloResults.percentile75).toLocaleString('it-IT')}</span>
              </div>
            </div>

            {/* Sample Paths Toggle */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="showPaths"
                checked={showSamplePaths}
                onChange={(e) => setShowSamplePaths(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="showPaths" className="text-sm text-gray-600">
                Mostra traiettorie campione ({monteCarloResults.numPaths} simulazioni)
              </label>
            </div>

            {/* Distribution Histogram */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Distribuzione Valori Finali</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monteCarloResults.histogram}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                  <YAxis
                    tickFormatter={(v) => `${v.toFixed(1)}%`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value.toFixed(2)}%`, 'Frequenza']}
                  />
                  <Bar
                    dataKey="frequency"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Sample Paths Chart */}
            {showSamplePaths && monteCarloResults.samplePaths && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Traiettorie Campione</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monteCarloResults.samplePaths}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(m) => `Anno ${Math.floor(m/12)}`}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value) => [`€${Math.round(value).toLocaleString('it-IT')}`, '']}
                      labelFormatter={(m) => `Mese ${m} (Anno ${Math.floor(m/12)})`}
                    />
                    {Array.from({ length: monteCarloResults.numPaths }, (_, i) => (
                      <Line
                        key={i}
                        type="monotone"
                        dataKey={`path${i}`}
                        stroke={`hsl(${(i * 18) % 360}, 70%, 50%)`}
                        strokeWidth={1}
                        dot={false}
                        opacity={0.5}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>⚠️ Disclaimer:</strong> Simulazione basata su assunzioni storiche della strategia (rendimento {monteCarloParams.expectedReturn}%, volatilità {monteCarloParams.volatility}%).
                I risultati passati non garantiscono rendimenti futuri. Usa questi dati solo come guida indicativa per la pianificazione.
              </p>
            </div>
          </>
        )}

        {/* Info before running */}
        {!monteCarloResults && (
          <div className="text-center py-12 text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Configura i parametri e clicca "Esegui Simulazione"</p>
            <p className="text-sm mt-2">
              I parametri iniziali sono basati sulla tua Strategia e PAC attivi
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
