import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, Activity, AlertCircle, Target, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell, ReferenceLine, AreaChart, Area } from 'recharts';
import { getTransactions, portfolioSnapshot } from '../services/localStorageService';
import { getPortfolioConfig } from '../services/portfolioConfigService';
import { fetchMultipleHistoricalPrices, buildMonthlyPriceTable, clearHistoricalPriceCache } from '../services/historicalPriceService';
import { fetchMultiplePrices, getNativeConversionFactor } from '../services/priceService';
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

// Heatmap cell color helper
function getHeatmapStyle(perf) {
  if (perf > 10) return { bg: '#166534', text: '#fff', fw: 700 };
  if (perf > 5)  return { bg: '#16a34a', text: '#fff', fw: 600 };
  if (perf > 2)  return { bg: '#4ade80', text: '#15532d', fw: 500 };
  if (perf > 0)  return { bg: '#bbf7d0', text: '#14532d', fw: 400 };
  if (perf > -2) return { bg: '#fee2e2', text: '#991b1b', fw: 400 };
  if (perf > -5) return { bg: '#fca5a5', text: '#991b1b', fw: 500 };
  if (perf > -10)return { bg: '#dc2626', text: '#fff', fw: 600 };
  return          { bg: '#7f1d1d', text: '#fff', fw: 700 };
}

// ── Computed-data cache (localStorage) ───────────────────────────────────────
// Caches the fully-built allMonthlyData so repeat visits are instant.
// Key: hash of asset transactions. TTL: 2 hours (matches current-month price TTL).

const PERF_CACHE_KEY = 'perf_computed_v2';
const PERF_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

function hashTxs(txs) {
  const str = txs
    .slice()
    .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')))
    .map(t => `${t.id}|${t.date}|${t.ticker}|${t.quantity}|${t.price}|${t.type}`)
    .join(',');
  let h = 5381;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) + h) + str.charCodeAt(i); h = h & h; }
  return h.toString(36);
}

function loadPerfCache(hash) {
  try {
    const raw = localStorage.getItem(PERF_CACHE_KEY);
    if (!raw) return null;
    const { hash: h, ts, data, startDateISO } = JSON.parse(raw);
    if (h !== hash) return null;
    if (Date.now() - ts > PERF_CACHE_TTL) return null;
    // Rehydrate date objects
    const rehydrated = data.map(m => ({ ...m, date: new Date(m.date) }));
    return { allMonthlyData: rehydrated, firstDate: new Date(startDateISO) };
  } catch { return null; }
}

function savePerfCache(hash, allMonthlyData, firstDate) {
  try {
    localStorage.setItem(PERF_CACHE_KEY, JSON.stringify({
      hash, ts: Date.now(), data: allMonthlyData,
      startDateISO: firstDate.toISOString()
    }));
  } catch (e) { console.warn('⚠️ Could not save performance cache:', e.message); }
}

export function clearPerfCache() {
  localStorage.removeItem(PERF_CACHE_KEY);
}

// ── Monthly data builder (pure function — no side effects) ────────────────────
function buildMonthlyGrowthData(assetTransactions, priceTables, allMonths, currentPrices) {
  const monthlyGrowth = [];

  allMonths.forEach(monthDate => {
    const monthKey = format(monthDate, 'yyyy-MM');
    const monthEnd = endOfMonth(monthDate);

    const txUpToMonth = assetTransactions.filter(tx => {
      const txDate = parseISO(tx.date);
      return !isAfter(txDate, monthEnd);
    });

    const holdings = {};
    let totalInvested = 0;

    txUpToMonth.forEach(tx => {
      if (!holdings[tx.ticker]) {
        holdings[tx.ticker] = {
          quantity: 0, totalCost: 0, ticker: tx.ticker,
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
        const avgCostPerUnit = holdings[tx.ticker].quantity > 0
          ? holdings[tx.ticker].totalCost / holdings[tx.ticker].quantity : 0;
        const costBasisSold = tx.quantity * avgCostPerUnit;
        holdings[tx.ticker].quantity -= tx.quantity;
        holdings[tx.ticker].totalCost -= costBasisSold;
        totalInvested -= costBasisSold;
      }

      holdings[tx.ticker].macroCategory = tx.macroCategory || tx.category || holdings[tx.ticker].macroCategory;
      holdings[tx.ticker].microCategory = tx.microCategory || tx.subCategory || holdings[tx.ticker].microCategory;
    });

    let totalValue = 0;
    const byTicker = {};
    const byMacro = {};
    const byMicro = {};

    Object.values(holdings).forEach(holding => {
      if (holding.quantity > 0) {
        const priceTable = priceTables[holding.ticker] || {};
        const historicalPrice = priceTable[monthKey];

        let lastKnownPrice = null;
        if (!historicalPrice && Object.keys(priceTable).length > 0) {
          const availableMonths = Object.keys(priceTable).sort();
          for (let i = availableMonths.length - 1; i >= 0; i--) {
            if (availableMonths[i] <= monthKey) { lastKnownPrice = priceTable[availableMonths[i]]; break; }
          }
          if (!lastKnownPrice && availableMonths.length > 0) lastKnownPrice = priceTable[availableMonths[0]];
        }

        const currentPrice = currentPrices[holding.ticker]?.price;
        const avgCost = holding.totalCost / holding.quantity;
        const isCurrentMonth = monthKey === format(new Date(), 'yyyy-MM');
        const price = historicalPrice ||
                      (isCurrentMonth ? (currentPrice || lastKnownPrice) : (lastKnownPrice || currentPrice)) ||
                      avgCost;
        const value = holding.quantity * price;

        totalValue += value;
        byTicker[holding.ticker] = Math.round(value);
        const macro = holding.macroCategory || 'Altro';
        byMacro[macro] = (byMacro[macro] || 0) + value;
        const micro = holding.microCategory || 'N/A';
        byMicro[micro] = (byMicro[micro] || 0) + value;
      }
    });

    Object.keys(byMacro).forEach(key => { byMacro[key] = Math.round(byMacro[key]); });
    Object.keys(byMicro).forEach(key => { byMicro[key] = Math.round(byMicro[key]); });

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

  return monthlyGrowth;
}

function TickerSparkLine({ data, width = 200, height = 55 }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: '0.72rem' }}>
        Nessun dato storico
      </div>
    );
  }
  const prices = data.map(d => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = width - 4;
  const H = height - 8;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * W + 2;
    const y = H - ((p - min) / range) * H + 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? '#30D158' : '#FF453A';
  const [lx, ly] = pts[pts.length - 1].split(',');
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sparkGrad_${data.length}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={`2,${height - 2} ${pts.join(' ')} ${(W + 2).toFixed(1)},${height - 2}`} fill={`url(#sparkGrad_${data.length})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="3" fill={color} />
    </svg>
  );
}

function PortfolioPerformance() {
  // Prevent React 18 StrictMode double-invocation in dev (two concurrent fetches)
  const fetchingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // subtle background-refresh indicator
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

  // ── Full dataset — fetched ONCE, filter changes only slice in memory ──────
  const [allMonthlyData, setAllMonthlyData] = useState([]);
  const [assetTxs, setAssetTxs] = useState([]);
  const [fullStartDate, setFullStartDate] = useState(null);

  // ── Portfolio filter ────────────────────────────────────────────────────────
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(null);
  const [portfolioConfig, setPortfolioConfig] = useState({ portfolios: [], assignments: {} });

  // Refs for fast in-memory portfolio filter rebuild (no re-fetch)
  const priceTablesRef = useRef({});
  const allMonthsRef = useRef([]);
  const currentPricesRef = useRef({});

  // Portfolio-filtered dataset — must be declared BEFORE the useEffects that reference it
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activeData = useMemo(() => {
    if (!allMonthlyData.length) return { data: [], txs: [], startDate: null };
    if (!selectedPortfolioId) return { data: allMonthlyData, txs: assetTxs, startDate: fullStartDate };

    const cfg = getPortfolioConfig();
    const portfolioTickers = new Set(
      Object.entries(cfg.assignments)
        .filter(([, portId]) => portId === selectedPortfolioId)
        .map(([key]) => key.includes('::') ? key.split('::')[0] : key)
    );

    const filteredTxs = assetTxs.filter(tx => portfolioTickers.has(tx.ticker));
    if (!filteredTxs.length) return { data: [], txs: [], startDate: null };

    const data = Object.keys(priceTablesRef.current).length > 0 && allMonthsRef.current.length > 0
      ? buildMonthlyGrowthData(filteredTxs, priceTablesRef.current, allMonthsRef.current, currentPricesRef.current)
      : allMonthlyData.map(month => {
          const filteredByTicker = {};
          let total = 0;
          portfolioTickers.forEach(t => {
            if (month.byTicker[t]) { filteredByTicker[t] = month.byTicker[t]; total += month.byTicker[t]; }
          });
          const byMacro = {}, byMicro = {};
          portfolioTickers.forEach(t => {
            if (!filteredByTicker[t]) return;
            const tx = filteredTxs.find(x => x.ticker === t);
            if (tx) {
              const mac = tx.macroCategory || tx.category || 'Altro';
              const mic = tx.microCategory || tx.subCategory || 'N/A';
              byMacro[mac] = (byMacro[mac] || 0) + filteredByTicker[t];
              byMicro[mic] = (byMicro[mic] || 0) + filteredByTicker[t];
            }
          });
          return { ...month, byTicker: filteredByTicker, byMacro, byMicro, total: Math.round(total) };
        });

    const sortedTxs = [...filteredTxs].sort((a, b) => new Date(a.date) - new Date(b.date));
    const startDate = sortedTxs.length > 0 ? parseISO(sortedTxs[0].date) : fullStartDate;
    return { data, txs: filteredTxs, startDate };
  }, [selectedPortfolioId, allMonthlyData, assetTxs, fullStartDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // UI tab state
  const [heatmapTab, setHeatmapTab] = useState('macro');
  const [heatmapValueMode, setHeatmapValueMode] = useState('percent'); // 'percent' | 'euro'
  const [heatmapSort, setHeatmapSort] = useState({ monthKey: null, dir: 'desc' }); // click su header mese
  const [excludedMonths, setExcludedMonths] = useState(new Set()); // mesi esclusi dalle statistiche
  const [analysisTab, setAnalysisTab] = useState('contribution');
  const [tickerTooltip, setTickerTooltip] = useState(null); // popup ticker
  const [tooltipShowNative, setTooltipShowNative] = useState(false);
  const [tooltipPeriod, setTooltipPeriod] = useState('9M');
  const [tooltipChartData, setTooltipChartData] = useState([]);
  const [tooltipLoading, setTooltipLoading] = useState(false);
  const tooltipHideTimer = useRef(null);
  const tooltipPriceCache = useRef({}); // { 'TICKER::PERIOD': sparkData[] }

  // Load data once on mount (or on manual refresh)
  useEffect(() => {
    calculatePerformance();
    setPortfolioConfig(getPortfolioConfig());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When date filter OR portfolio filter changes → recompute stats instantly (no network)
  useEffect(() => {
    if (!activeData.data.length) return;
    recomputeFromFilter(activeData.data, dateFilter, activeData.txs, activeData.startDate || fullStartDate);
  }, [dateFilter, activeData, excludedMonths]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Load full historical data ONCE. Never re-triggered by filter changes.
   * Stale-While-Revalidate at the computed-data level:
   *   - Cache hit  → render immediately (no spinner), refresh silently in background.
   *   - Cache miss → show spinner, fetch, render, save cache.
   */
  const calculatePerformance = async (forceRefresh = false) => {
    // Prevent React 18 StrictMode from running two concurrent fetches on mount
    if (fetchingRef.current && !forceRefresh) {
      console.log('⏸️ Calculation already in progress, skipping duplicate call');
      return;
    }
    fetchingRef.current = true;
    setError(null);

    try {
      const allTransactions = getTransactions();
      setTransactions(allTransactions);

      // Filter out cash transactions and any manually excluded from stats
      const assetTransactions = allTransactions.filter(tx => {
        const isCash = tx.isCash || tx.macroCategory === 'Cash';
        return !isCash && !tx.excludeFromStats;
      });

      if (assetTransactions.length === 0) {
        setLoading(false);
        setError('Nessuna transazione di asset trovata. Aggiungi transazioni per vedere la performance.');
        return;
      }

      const sortedTransactions = assetTransactions
        .filter(tx => tx.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const firstDate = parseISO(sortedTransactions[0].date);
      const now = new Date();
      const lastDate = endOfMonth(now);

      console.log(`📅 Date range: ${format(firstDate, 'yyyy-MM-dd')} to ${format(lastDate, 'yyyy-MM-dd')}`);

      const allMonths = eachMonthOfInterval({ start: firstDate, end: lastDate });

      // Available years for the filter buttons
      const years = new Set();
      allMonths.forEach(month => years.add(month.getFullYear()));
      setAvailableYears(Array.from(years).sort((a, b) => b - a));

      const tickers = [...new Set(assetTransactions.map(tx => tx.ticker))];

      // ── Computed-data cache (SWR pattern) ──────────────────────────────────
      const txHash = hashTxs(assetTransactions);
      const cachedResult = !forceRefresh ? loadPerfCache(txHash) : null;

      if (cachedResult) {
        // Cache hit: render immediately without any spinner
        console.log('⚡ Computed cache hit — rendering instantly, refreshing in background');
        setAssetTxs(assetTransactions);
        setFullStartDate(firstDate);
        setAllMonthlyData(cachedResult.allMonthlyData);
        recomputeFromFilter(cachedResult.allMonthlyData, dateFilter, assetTransactions, firstDate);
        setLoading(false);
        setIsRefreshing(true);
      } else {
        // Cache miss: show spinner while we fetch
        setLoading(true);
      }

      // ── Fetch historical prices (always — keeps per-ticker cache warm) ──────
      console.log(`📊 Fetching historical prices for ${tickers.length} tickers...`);

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

      // Fetch live prices (uses 5-min cache internally, fetches fresh if expired)
      // This ensures the current month always has real prices, not stale May prices
      const currentPrices = await fetchMultiplePrices(tickers) || {};
      // Store in refs so portfolio filter can rebuild without re-fetching
      priceTablesRef.current = priceTables;
      allMonthsRef.current = allMonths;
      currentPricesRef.current = currentPrices;
      console.log(`💰 ${Object.keys(currentPrices).length} current prices fetched`);
      console.log(`📅 Building full dataset: ${allMonths.length} months`);

      // Build monthly portfolio values for ALL months using the extracted helper
      const monthlyGrowth = buildMonthlyGrowthData(assetTransactions, priceTables, allMonths, currentPrices);

      // Persist computed result so next visit is instant
      savePerfCache(txHash, monthlyGrowth, firstDate);

      // Store full dataset and update UI
      setAssetTxs(assetTransactions);
      setFullStartDate(firstDate);
      setAllMonthlyData(monthlyGrowth);
      recomputeFromFilter(monthlyGrowth, dateFilter, assetTransactions, firstDate);

      console.log('✅ Full dataset loaded');

    } catch (error) {
      console.error('Error loading performance data:', error);
      setError(`Errore nel calcolo della performance: ${error.message}`);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Pure in-memory computation — no network, no spinner.
   * Called on initial load (from calculatePerformance) and on every filter change (from useEffect).
   * @param {Array} data - allMonthlyData (full dataset)
   * @param {string} filter - current dateFilter value
   * @param {Array} txs - asset transactions array
   * @param {Date} startDate - first transaction date
   */
  const recomputeFromFilter = (data, filter, txs, startDate) => {
    if (!data || data.length === 0) return;

    // ── Slice the full dataset based on the selected filter ──────────────────
    const now = new Date();
    let filteredData;
    if (filter === 'all') {
      filteredData = data;
    } else if (filter === 'ytd') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      filteredData = data.filter(m => m.date >= yearStart);
    } else if (!isNaN(filter)) {
      const year = parseInt(filter);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59);
      filteredData = data.filter(m => m.date <= yearEnd);
    } else {
      filteredData = data;
    }

    setMonthlyData(filteredData);
    if (filteredData.length === 0) return;

    const lastMonth = filteredData[filteredData.length - 1];
    const snap = portfolioSnapshot(currentPricesRef.current || {});
    const isPortfolioFiltered = !!selectedPortfolioId;

    let totalValue, totalInvested;
    if (isPortfolioFiltered) {
      // Usa snap.holdings filtrati per holdingKey — stessa fonte di verità di Dashboard portfolioCards.
      // Evita il disallineamento prezzi tra buildMonthlyGrowthData (monthly price table) e prezzi live.
      const cfg = getPortfolioConfig();
      const portfolioHoldingKeys = new Set(
        Object.entries(cfg.assignments)
          .filter(([, portId]) => portId === selectedPortfolioId)
          .map(([key]) => key)
      );
      const filteredHoldings = snap.holdings.filter(h => portfolioHoldingKeys.has(h.holdingKey ?? h.ticker));
      totalValue    = filteredHoldings.reduce((s, h) => s + (h.marketValue || 0), 0);
      totalInvested = filteredHoldings.reduce((s, h) => s + (h.totalCost   || 0), 0);
      // Fallback a lastMonth se snap è vuoto (prezzi non ancora caricati)
      if (totalValue === 0 && lastMonth.total > 0) { totalValue = lastMonth.total; totalInvested = lastMonth.invested; }
    } else {
      totalValue    = snap.totalValue    > 0 ? snap.totalValue    : lastMonth.total;
      totalInvested = snap.totalInvested > 0 ? snap.totalInvested : lastMonth.invested;
    }
    const totalReturn    = totalValue - totalInvested;
    const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    // ── Monthly returns (Time-Weighted Return) ───────────────────────────────
    const currentMonthKey = format(new Date(), 'yyyy-MM');
    const calculatedMonthlyReturns = [];

    for (let i = 1; i < filteredData.length; i++) {
      const prevMonth = filteredData[i - 1];
      const currMonth = filteredData[i];
      const netCashFlow = currMonth.invested - prevMonth.invested;
      if (prevMonth.total > 0) {
        const expectedValue = prevMonth.total + netCashFlow;
        const monthReturnPercent = expectedValue > 0
          ? ((currMonth.total - expectedValue) / expectedValue) * 100 : 0;
        calculatedMonthlyReturns.push({
          month: currMonth.month,
          monthKey: currMonth.monthKey,
          return: monthReturnPercent,
          value: currMonth.total,
          invested: currMonth.invested,
          netCashFlow,
          isCurrentMonth: currMonth.monthKey === currentMonthKey,
        });
      }
    }
    setMonthlyReturns(calculatedMonthlyReturns);

    // Filtra i mesi esclusi PRIMA di calcolare le statistiche aggregate.
    // (monthlyReturns nel state resta pieno: il grafico e la heatmap continuano a mostrare i mesi esclusi, solo sbarrati)
    const statsReturns = calculatedMonthlyReturns.filter(m => !excludedMonths.has(m.monthKey));

    const avgMonthlyReturn = statsReturns.length > 0
      ? statsReturns.reduce((sum, r) => sum + r.return, 0) / statsReturns.length : 0;
    const bestMonth = statsReturns.length > 0
      ? statsReturns.reduce((max, r) => r.return > max.return ? r : max, statsReturns[0]) : null;
    const worstMonth = statsReturns.length > 0
      ? statsReturns.reduce((min, r) => r.return < min.return ? r : min, statsReturns[0]) : null;

    const uniqueTickers = Object.keys(lastMonth.byTicker).length;
    const advancedMetrics = calculateAllMetrics(statsReturns, 2, totalInvested);

    // Adjusted return — portfolio value at the end of the last NON-EXCLUDED month
    // "Se escludo luglio, quanto valeva il portafoglio a fine giugno?"
    let adjCompoundReturn = null;
    let adjCagr = null;
    let adjMonth = null;
    if (excludedMonths.size > 0) {
      const lastIncluded = [...filteredData].reverse().find(m => !excludedMonths.has(m.monthKey));
      if (lastIncluded && lastIncluded.invested > 0) {
        adjCompoundReturn = ((lastIncluded.total - lastIncluded.invested) / lastIncluded.invested) * 100;
        adjMonth = lastIncluded.monthKey;
      }
      // CAGR adj: use compound of statsReturns for consistency with other metrics
      const adjYears = statsReturns.length / 12;
      if (adjYears > 0 && statsReturns.length > 0) {
        const twrAdj = statsReturns.reduce((prod, m) => prod * (1 + m.return / 100), 1) - 1;
        adjCagr = (Math.pow(1 + twrAdj, 1 / adjYears) - 1) * 100;
      }
    }

    setStatistics({
      totalAssets: uniqueTickers,
      totalValue,
      totalInvested,
      totalReturn,
      totalReturnPercent,
      avgMonthlyReturn,
      bestMonth,
      worstMonth,
      startDate,
      monthsTracked: filteredData.length,
      cagr: advancedMetrics.cagr,
      maxDrawdown: advancedMetrics.maxDrawdown,
      recoveryTime: advancedMetrics.recoveryTime,
      sharpeRatio: advancedMetrics.sharpeRatio,
      sortinoRatio: advancedMetrics.sortinoRatio,
      volatility: advancedMetrics.volatility,
      adjCompoundReturn,
      adjCagr,
      adjMonth,
      excludedCount: excludedMonths.size,
    });

    // ── Contribution analysis ────────────────────────────────────────────────
    const tickerInfoMap = {};
    txs.forEach(tx => {
      if (!tickerInfoMap[tx.ticker]) {
        tickerInfoMap[tx.ticker] = {
          name: tx.name || tx.ticker,
          microCategory: tx.microCategory || tx.subCategory || 'N/A',
          macroCategory: tx.macroCategory || tx.category || 'Altro'
        };
      }
    });

    const allTickersSet = new Set();
    filteredData.forEach(month => Object.keys(month.byTicker).forEach(t => allTickersSet.add(t)));

    const tickerContributions = [];
    for (const ticker of allTickersSet) {
      let totalWeight = 0, weightCount = 0;
      const monthlyTickerReturns = [];

      for (let i = 0; i < filteredData.length; i++) {
        const month = filteredData[i];
        const tickerValue = month.byTicker[ticker] || 0;
        const portfolioTotal = month.total || 0;

        if (portfolioTotal > 0 && tickerValue > 0) {
          totalWeight += (tickerValue / portfolioTotal) * 100;
          weightCount++;
        }

        if (i > 0) {
          const prevMonth = filteredData[i - 1];
          const prevTickerValue = prevMonth.byTicker[ticker] || 0;
          const [year, monthNum] = month.monthKey.split('-');
          const tickerTxThisMonth = txs.filter(tx => {
            if (!tx.date || tx.ticker !== ticker) return false;
            const txDate = new Date(tx.date);
            return txDate.getFullYear() === parseInt(year) &&
                   (txDate.getMonth() + 1) === parseInt(monthNum);
          });

          let netCashFlow = 0;
          tickerTxThisMonth.forEach(tx => {
            const amount = tx.quantity * tx.price;
            const commission = tx.commission || 0;
            if (tx.type === 'buy') netCashFlow += (amount + commission);
            else if (tx.type === 'sell') netCashFlow -= (amount - commission);
          });

          const positionFullyClosed = tickerValue === 0 && prevTickerValue > 0 && netCashFlow < 0;
          if (positionFullyClosed) {
            const sellProceeds = -netCashFlow;
            const sellReturn = ((sellProceeds - prevTickerValue) / prevTickerValue) * 100;
            monthlyTickerReturns.push({ monthKey: month.monthKey, return: sellReturn, weight: portfolioTotal > 0 ? (prevTickerValue / portfolioTotal) * 100 : 0 });
          } else {
            const expectedValue = prevTickerValue + netCashFlow;
            if (expectedValue > 0) {
              const monthReturn = ((tickerValue - expectedValue) / expectedValue) * 100;
              monthlyTickerReturns.push({ monthKey: month.monthKey, return: monthReturn, weight: portfolioTotal > 0 ? (tickerValue / portfolioTotal) * 100 : 0 });
            }
          }
        }
      }

      const avgWeight = weightCount > 0 ? totalWeight / weightCount : 0;
      let cumulativeTWR = 100;
      monthlyTickerReturns.forEach(m => { cumulativeTWR *= (1 + m.return / 100); });
      const tickerTotalReturn = cumulativeTWR - 100;
      const contributionPercent = (avgWeight / 100) * tickerTotalReturn;
      const contributionEuro = totalReturnPercent !== 0 ? (contributionPercent / totalReturnPercent) * totalReturn : 0;

      if (avgWeight > 0.01) {
        tickerContributions.push({
          ticker,
          name: tickerInfoMap[ticker]?.name || ticker,
          microCategory: tickerInfoMap[ticker]?.microCategory || 'N/A',
          macroCategory: tickerInfoMap[ticker]?.macroCategory || 'Altro',
          avgWeight, assetReturn: tickerTotalReturn, contributionEuro, contributionPercent
        });
      }
    }

    tickerContributions.sort((a, b) => b.contributionEuro - a.contributionEuro);

    const microCategoryMap = {};
    tickerContributions.forEach(tc => {
      const micro = tc.microCategory || 'N/A';
      if (!microCategoryMap[micro]) {
        microCategoryMap[micro] = { microCategory: micro, macroCategory: tc.macroCategory, tickers: [], totalWeight: 0, weightedReturn: 0, contributionEuro: 0, contributionPercent: 0 };
      }
      microCategoryMap[micro].tickers.push(tc.ticker);
      microCategoryMap[micro].totalWeight += tc.avgWeight;
      microCategoryMap[micro].weightedReturn += tc.avgWeight * tc.assetReturn;
      microCategoryMap[micro].contributionEuro += tc.contributionEuro;
      microCategoryMap[micro].contributionPercent += tc.contributionPercent;
    });

    const microContributions = Object.values(microCategoryMap).map(mc => ({
      ...mc, avgWeight: mc.totalWeight,
      assetReturn: mc.totalWeight > 0 ? mc.weightedReturn / mc.totalWeight : 0
    }));
    microContributions.sort((a, b) => b.contributionEuro - a.contributionEuro);

    setContributionData({ byTicker: tickerContributions, byMicroCategory: microContributions, totalReturnEuro: totalReturn, totalReturnPercent });

    // ── Period returns ───────────────────────────────────────────────────────
    const currentYear = now.getFullYear();
    const calculatePeriodReturn = (startMonthKey) => {
      const startIdx = filteredData.findIndex(m => m.monthKey >= startMonthKey);
      if (startIdx === -1 || startIdx >= filteredData.length - 1) return null;
      const periodMonthlyReturns = calculatedMonthlyReturns.filter(r => r.monthKey >= startMonthKey);
      if (periodMonthlyReturns.length === 0) return null;
      let cumulativeTWR = 100;
      periodMonthlyReturns.forEach(m => { cumulativeTWR *= (1 + m.return / 100); });
      const periodReturn = cumulativeTWR - 100;
      const yrs = periodMonthlyReturns.length / 12;
      return { return: periodReturn, annualized: yrs > 0 ? (Math.pow(cumulativeTWR / 100, 1 / yrs) - 1) * 100 : periodReturn, months: periodMonthlyReturns.length, startDate: periodMonthlyReturns[0]?.month || 'N/A' };
    };

    const periodResults = {};
    periodResults.ytd = calculatePeriodReturn(`${currentYear}-01`);
    const oneYearAgo = new Date(now); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    periodResults['1y'] = calculatePeriodReturn(format(oneYearAgo, 'yyyy-MM'));
    const threeYearsAgo = new Date(now); threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    periodResults['3y'] = calculatePeriodReturn(format(threeYearsAgo, 'yyyy-MM'));
    const fiveYearsAgo = new Date(now); fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    periodResults['5y'] = calculatePeriodReturn(format(fiveYearsAgo, 'yyyy-MM'));

    if (calculatedMonthlyReturns.length > 0) {
      let allTWR = 100;
      calculatedMonthlyReturns.forEach(m => { allTWR *= (1 + m.return / 100); });
      const allReturn = allTWR - 100;
      const allYrs = calculatedMonthlyReturns.length / 12;
      periodResults.all = { return: allReturn, annualized: allYrs > 0 ? (Math.pow(allTWR / 100, 1 / allYrs) - 1) * 100 : allReturn, months: calculatedMonthlyReturns.length, startDate: calculatedMonthlyReturns[0]?.month || 'N/A' };
    }
    setPeriodReturns(periodResults);

    // ── Rolling 12-month returns ─────────────────────────────────────────────
    const rollingData = [];
    if (calculatedMonthlyReturns.length >= 12) {
      for (let i = 11; i < calculatedMonthlyReturns.length; i++) {
        const last12 = calculatedMonthlyReturns.slice(i - 11, i + 1);
        let rolling12mTWR = 100;
        last12.forEach(m => { rolling12mTWR *= (1 + m.return / 100); });
        rollingData.push({ month: calculatedMonthlyReturns[i].month, monthKey: calculatedMonthlyReturns[i].monthKey, rolling12m: Math.round((rolling12mTWR - 100) * 100) / 100 });
      }
    }
    setRollingReturns(rollingData);
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

  // Recalculate benchmarks when active dataset or currency changes.
  // activeData changes on initial load AND on portfolio filter changes.
  useEffect(() => {
    if (!activeData.data.length || !activeData.startDate) return;
    const fullReturns = [];
    for (let i = 1; i < activeData.data.length; i++) {
      const prev = activeData.data[i - 1];
      const curr = activeData.data[i];
      const netCashFlow = curr.invested - prev.invested;
      if (prev.total > 0) {
        const expectedValue = prev.total + netCashFlow;
        const monthReturnPct = expectedValue > 0 ? ((curr.total - expectedValue) / expectedValue) * 100 : 0;
        fullReturns.push({ monthKey: curr.monthKey, return: monthReturnPct });
      }
    }
    if (fullReturns.length > 0) {
      calculateBenchmarks(activeData.data, fullReturns, activeData.startDate, benchmarkCurrency);
    }
  }, [activeData, benchmarkCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Tooltip: carica prezzi storici per il ticker/periodo selezionato
  useEffect(() => {
    if (!tickerTooltip) { setTooltipChartData([]); return; }
    let cancelled = false;
    const { ticker } = tickerTooltip;
    const cacheKey = `${ticker}::${tooltipPeriod}`;

    if (tooltipPriceCache.current[cacheKey]) {
      setTooltipChartData(tooltipPriceCache.current[cacheKey]);
      return;
    }

    const now = new Date();
    const toDateStr = format(now, 'yyyy-MM-dd');
    let fromDate = new Date(now);
    if (tooltipPeriod === '9M')       { fromDate.setMonth(fromDate.getMonth() - 9); }
    else if (tooltipPeriod === 'YTD') { fromDate = new Date(now.getFullYear(), 0, 1); }
    else if (tooltipPeriod === '3Y')  { fromDate.setFullYear(fromDate.getFullYear() - 3); }
    else if (tooltipPeriod === '5Y')  { fromDate.setFullYear(fromDate.getFullYear() - 5); }
    else if (tooltipPeriod === '10Y') { fromDate.setFullYear(fromDate.getFullYear() - 10); }
    const fromDateStr = format(fromDate, 'yyyy-MM-dd');
    const fromMonthKey = fromDateStr.substring(0, 7);

    // Per periodi brevi prova prima i dati già in memoria
    const shortPeriod = tooltipPeriod === '9M' || tooltipPeriod === 'YTD';
    const existingEntries = shortPeriod
      ? Object.entries(priceTablesRef.current[ticker] || {})
          .filter(([k]) => k >= fromMonthKey)
          .sort(([a], [b]) => a.localeCompare(b))
      : [];

    if (shortPeriod && existingEntries.length > 0) {
      const sparkData = existingEntries.map(([monthKey, price]) => ({ monthKey, price }));
      tooltipPriceCache.current[cacheKey] = sparkData;
      setTooltipChartData(sparkData);
      return;
    }

    setTooltipChartData([]);
    setTooltipLoading(true);
    fetchMultipleHistoricalPrices([ticker], fromDateStr, toDateStr)
      .then(result => {
        if (cancelled) return;
        const monthlyTable = buildMonthlyPriceTable(result[ticker] || []);
        const sparkData = Object.entries(monthlyTable)
          .filter(([k]) => k >= fromMonthKey)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([monthKey, price]) => ({ monthKey, price }));
        tooltipPriceCache.current[cacheKey] = sparkData;
        setTooltipChartData(sparkData);
      })
      .catch(() => { if (!cancelled) { tooltipPriceCache.current[cacheKey] = []; setTooltipChartData([]); } })
      .finally(() => { if (!cancelled) setTooltipLoading(false); });
    return () => { cancelled = true; };
  }, [tickerTooltip?.ticker, tooltipPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Massimi storici: picco patrimonio (€) e picco rendimento TWR (%).
  // Serve per storytelling ("sei arrivato a X, ora sei a Y") e per contestualizzare il drawdown corrente.
  const peakStats = useMemo(() => {
    // Patrimonio €: da monthlyData (già filtrato per portafoglio selezionato)
    let peakValue = 0, peakValueMonthKey = null, peakValueMonth = null;
    monthlyData.forEach(m => {
      if ((m.total || 0) > peakValue) {
        peakValue = m.total;
        peakValueMonthKey = m.monthKey;
        peakValueMonth = m.month;
      }
    });
    const currentValue = statistics.totalValue || 0;
    const valueGapAbs = currentValue - peakValue;
    const valueGapPct = peakValue > 0 ? (valueGapAbs / peakValue) * 100 : 0;

    // Rendimento % sul capitale investito (money-weighted like): (patrimonio - versato) / versato
    let peakReturnPct = -Infinity, peakReturnMonthKey = null, peakReturnMonth = null;
    monthlyData.forEach(m => {
      const inv = m.invested || 0;
      if (inv <= 0) return;
      const r = ((m.total || 0) - inv) / inv * 100;
      if (r > peakReturnPct) { peakReturnPct = r; peakReturnMonthKey = m.monthKey; peakReturnMonth = m.month; }
    });
    if (peakReturnPct === -Infinity) peakReturnPct = 0;
    const currentReturnPct = statistics.totalReturnPercent || 0;
    const returnGap = currentReturnPct - peakReturnPct;

    // TWR% cumulativo: compound dei rendimenti mensili, base 100
    let cum = 100, peakCum = 100, peakTwrMonthKey = null, peakTwrMonth = null;
    monthlyReturns.forEach(m => {
      cum *= (1 + (m.return || 0) / 100);
      if (cum > peakCum) {
        peakCum = cum;
        peakTwrMonthKey = m.monthKey;
        peakTwrMonth = m.month;
      }
    });
    const peakTwrPct = peakCum - 100;
    const currentTwrPct = cum - 100;
    const twrGap = currentTwrPct - peakTwrPct; // sempre ≤ 0

    return {
      peakValue, peakValueMonth, peakValueMonthKey,
      currentValue, valueGapAbs, valueGapPct, isAtValuePeak: peakValueMonthKey && monthlyData[monthlyData.length - 1]?.monthKey === peakValueMonthKey,
      peakTwrPct, peakTwrMonth, peakTwrMonthKey,
      currentTwrPct, twrGap, isAtTwrPeak: peakTwrMonthKey && monthlyReturns[monthlyReturns.length - 1]?.monthKey === peakTwrMonthKey,
      peakReturnPct, peakReturnMonth, peakReturnMonthKey,
      currentReturnPct, returnGap, isAtReturnPeak: peakReturnMonthKey && monthlyData[monthlyData.length - 1]?.monthKey === peakReturnMonthKey,
    };
  }, [monthlyData, monthlyReturns, statistics.totalValue, statistics.totalReturnPercent]);

  // Nome completo / categoria per ogni ticker — usato dal tooltip hover nella heatmap
  const tickerNameMap = useMemo(() => {
    const map = {};
    transactions.forEach(tx => {
      if (!tx.ticker || tx.isCash || tx.macroCategory === 'Cash') return;
      if (!map[tx.ticker]) {
        map[tx.ticker] = {
          name: tx.name || tx.ticker,
          macroCategory: tx.macroCategory || tx.category || 'Altro',
          microCategory: tx.microCategory || tx.subCategory || 'N/A',
        };
      }
    });
    return map;
  }, [transactions]);

  // Absolute-euro chart: portfolio = actual values, benchmarks = same deposit schedule simulation
  const absoluteChartData = useMemo(() => {
    if (!allMonthlyData.length) return [];

    const result = allMonthlyData.map(month => ({
      month: month.month,
      monthKey: month.monthKey,
      'Il mio Portafoglio': Math.round(month.total)
    }));

    Object.entries(benchmarkData).forEach(([name, data]) => {
      if (!data.monthlyValues || !data.monthlyValues.length) return;
      const benchMap = {};
      data.monthlyValues.forEach(m => { benchMap[m.monthKey] = m.value; });

      let benchVal = allMonthlyData[0].total;
      result[0][name] = Math.round(benchVal);

      for (let i = 1; i < allMonthlyData.length; i++) {
        const month = allMonthlyData[i];
        const prevMonth = allMonthlyData[i - 1];
        const netCashFlow = (month.invested || 0) - (prevMonth.invested || 0);
        const prevNorm = benchMap[prevMonth.monthKey];
        const currNorm = benchMap[month.monthKey];
        const benchReturn = (prevNorm && currNorm && prevNorm > 0)
          ? (currNorm - prevNorm) / prevNorm
          : 0;
        benchVal = benchVal * (1 + benchReturn) + netCashFlow;
        result[i][name] = Math.round(Math.max(0, benchVal));
      }
    });

    return result;
  }, [allMonthlyData, benchmarkData]);

  // Drawdown chart: % below running peak for portfolio + each benchmark (TWR-based)
  const drawdownChartData = useMemo(() => {
    if (!normalizedChartData.length) return [];

    // Collect all line keys from every data point (benchmarks may be absent in month 0)
    const allLines = new Set();
    normalizedChartData.forEach(point => {
      Object.keys(point).forEach(k => {
        if (k !== 'month' && k !== 'monthKey' && typeof point[k] === 'number') allLines.add(k);
      });
    });
    const lines = Array.from(allLines);
    const peaks = {};
    lines.forEach(l => { peaks[l] = -Infinity; });

    return normalizedChartData.map(point => {
      const result = { month: point.month, monthKey: point.monthKey };
      lines.forEach(line => {
        if (typeof point[line] === 'number') {
          if (point[line] > peaks[line]) peaks[line] = point[line];
          result[line] = peaks[line] > 0
            ? parseFloat(((point[line] - peaks[line]) / peaks[line] * 100).toFixed(2))
            : 0;
        }
      });
      return result;
    });
  }, [normalizedChartData]);

  // Real TWR: cumulative product dei rendimenti mensili, escludendo mesi flaggati dall'utente
  const twrPercent = useMemo(() => {
    if (!monthlyReturns.length) return 0;
    const returns = monthlyReturns.filter(m => !excludedMonths.has(m.monthKey));
    if (!returns.length) return 0;
    return (returns.reduce((acc, m) => acc * (1 + m.return / 100), 1) - 1) * 100;
  }, [monthlyReturns, excludedMonths]);


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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 384 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid #0A84FF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--text-2)' }}>Caricamento dati storici...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Performance</h1>
        <div style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.4)', borderRadius: 12, padding: 16, display: 'flex', gap: 12 }}>
          <AlertCircle size={18} style={{ color: '#FF453A', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontWeight: 600, color: '#FF453A', margin: 0 }}>Errore</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginTop: 4 }}>{error}</p>
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
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, maxHeight: 384, overflowY: 'auto' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>{label}</p>
          {payload
            .sort((a, b) => (b.value || 0) - (a.value || 0))
            .map((entry, index) => (
              <p key={index} style={{ fontSize: '0.82rem', color: entry.color, margin: '2px 0' }}>
                {entry.name}: {formatCurrency(entry.value)}
              </p>
            ))}
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── 1. HEADER + PERIOD SELECTOR ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Performance</h1>
            <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', margin: '4px 0 0' }}>
              Rendimenti TWR · esclude cash flows · {statistics.totalAssets} asset · {statistics.monthsTracked} mesi
              {isRefreshing && <span style={{ marginLeft: 8, color: '#FF9F0A' }}>· Aggiornamento prezzi…</span>}
            </p>
          </div>
          <button
            onClick={() => { clearHistoricalPriceCache(); clearPerfCache(); calculatePerformance(true); }}
            disabled={loading || isRefreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 10, color: 'var(--text-2)', fontSize: '0.82rem', fontWeight: 500,
              cursor: 'pointer', opacity: (loading || isRefreshing) ? 0.6 : 1
            }}
          >
            <Activity size={14} />
            {loading ? 'Caricamento...' : isRefreshing ? 'Aggiornamento...' : 'Aggiorna prezzi'}
          </button>
        </div>

        {/* Period pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['all', 'Tutto'], ['ytd', 'YTD'], ...availableYears.map(y => [y.toString(), y.toString()])].map(([val, label]) => {
            const isActive = dateFilter === val;
            return (
              <button
                key={val}
                onClick={() => setDateFilter(val)}
                style={{
                  padding: '6px 18px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 500,
                  background: isActive ? '#0A84FF' : 'var(--surface-2)',
                  color: isActive ? '#fff' : 'var(--text-2)',
                  border: isActive ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Portfolio filter pills — shown only if at least one portfolio exists */}
        {portfolioConfig.portfolios.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button
              onClick={() => setSelectedPortfolioId(null)}
              style={{
                padding: '5px 16px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 500,
                background: !selectedPortfolioId ? 'var(--text-1)' : 'var(--surface-2)',
                color: !selectedPortfolioId ? 'var(--card-bg)' : 'var(--text-2)',
                border: !selectedPortfolioId ? 'none' : '1px solid var(--border)',
                cursor: 'pointer'
              }}
            >
              🌍 Tutti i portafogli
            </button>
            {portfolioConfig.portfolios.map(portfolio => {
              const isActive = selectedPortfolioId === portfolio.id;
              return (
                <button
                  key={portfolio.id}
                  onClick={() => setSelectedPortfolioId(portfolio.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 16px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 500,
                    background: isActive ? portfolio.color : 'var(--surface-2)',
                    color: isActive ? '#fff' : 'var(--text-2)',
                    border: isActive ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer'
                  }}
                >
                  <span>{portfolio.emoji}</span>
                  <span>{portfolio.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 2. SUMMARY ROW (valori assoluti) ── */}
      {statistics.totalValue > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            {
              label: 'Capitale Investito',
              value: `€${Math.round(statistics.totalInvested).toLocaleString('it-IT')}`,
              color: 'var(--text-1)',
              sub: 'Versamenti totali'
            },
            {
              label: 'Valore Attuale',
              value: `€${Math.round(statistics.totalValue).toLocaleString('it-IT')}`,
              color: '#0A84FF',
              sub: 'Portafoglio ai prezzi correnti'
            },
            {
              label: statistics.totalReturn >= 0 ? 'Guadagno' : 'Perdita',
              value: `${statistics.totalReturn >= 0 ? '+' : ''}€${Math.round(statistics.totalReturn).toLocaleString('it-IT')}`,
              color: statistics.totalReturn >= 0 ? '#30D158' : '#FF453A',
              sub: `${statistics.totalReturnPercent >= 0 ? '+' : ''}${statistics.totalReturnPercent.toFixed(2)}% sul capitale`
            },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--card-bg)', borderRadius: 16, padding: '16px 20px' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</p>
              <p style={{ fontSize: '1.6rem', fontWeight: 700, color: item.color, margin: 0 }}>{item.value}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>{item.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── 3. KPI STRIP (metriche %) ── */}
      {(() => {
        const excl = statistics.excludedCount > 0;
        const adjBadge = excl ? ` · adj. ${statistics.excludedCount} mes${statistics.excludedCount === 1 ? 'e' : 'i'}` : '';
        const kpis = [
          { label: 'Rendimento', value: `${statistics.totalReturnPercent >= 0 ? '+' : ''}${statistics.totalReturnPercent.toFixed(2)}%`, color: statistics.totalReturnPercent >= 0 ? '#30D158' : '#FF453A', sub: 'Sul capitale investito' },
          { label: 'TWR', value: `${twrPercent >= 0 ? '+' : ''}${twrPercent.toFixed(2)}%`, color: twrPercent >= 0 ? '#30D158' : '#FF453A', sub: `${statistics.monthsTracked} mesi · esclusi versamenti` },
          { label: 'CAGR', value: `${statistics.cagr >= 0 ? '+' : ''}${statistics.cagr.toFixed(2)}%`, color: statistics.cagr >= 0 ? '#30D158' : '#FF453A', sub: `Annualizzato${adjBadge}` },
          { label: 'Volatilità', value: `${statistics.volatility.toFixed(2)}%`, color: 'var(--text-1)', sub: `Ann. mensile${adjBadge}` },
          { label: 'Sharpe Ratio', value: statistics.sharpeRatio.toFixed(2), color: statistics.sharpeRatio >= 1 ? '#30D158' : statistics.sharpeRatio >= 0 ? 'var(--text-1)' : '#FF453A', sub: `${statistics.sharpeRatio >= 1 ? 'Buono (>1)' : 'Nella media'}${adjBadge}` },
          { label: 'Max Drawdown', value: `-${statistics.maxDrawdown.toFixed(2)}%`, color: '#FF453A', sub: `Dal picco${adjBadge}` },
        ];
        return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${excl ? 7 : 6}, 1fr)`, gap: 12 }}>
            {kpis.map(kpi => (
              <div key={kpi.label} style={{ background: 'var(--card-bg)', borderRadius: 16, padding: '16px 20px' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpi.label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: kpi.color, margin: 0 }}>{kpi.value}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>{kpi.sub}</p>
              </div>
            ))}
            {excl && statistics.adjCompoundReturn != null && (() => {
              const adjLabelMonth = statistics.adjMonth
                ? new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(
                    new Date(Number(statistics.adjMonth.split('-')[0]), Number(statistics.adjMonth.split('-')[1]) - 1, 1))
                : '';
              return (
                <div style={{ background: 'rgba(10,132,255,0.10)', border: '1px solid rgba(10,132,255,0.28)', borderRadius: 16, padding: '16px 20px' }}>
                  <p style={{ fontSize: '0.72rem', color: '#0A84FF', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                    Rend. a {adjLabelMonth || 'ultimo mese incluso'}
                  </p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: statistics.adjCompoundReturn >= 0 ? '#30D158' : '#FF453A', margin: 0 }}>
                    {statistics.adjCompoundReturn >= 0 ? '+' : ''}{statistics.adjCompoundReturn.toFixed(2)}%
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#0A84FF', marginTop: 4 }}>
                    Senza {statistics.excludedCount} mes{statistics.excludedCount === 1 ? 'e' : 'i'}
                  </p>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* ── 3.5 BANNER ESCLUSIONE MESI ── */}
      {statistics.excludedCount > 0 && statistics.adjCompoundReturn != null && (
        <div style={{ background: 'rgba(10,132,255,0.06)', border: '1px solid rgba(10,132,255,0.22)', borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.8rem', color: '#0A84FF', fontWeight: 600 }}>
            Scenario · {statistics.excludedCount} {statistics.excludedCount === 1 ? 'mese escluso' : 'mesi esclusi'} dalle statistiche
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', flex: 1 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
              Rendimento a fine {statistics.adjMonth
                ? new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' })
                    .format(new Date(Number(statistics.adjMonth.split('-')[0]), Number(statistics.adjMonth.split('-')[1]) - 1, 1))
                : 'ultimo mese incluso'}{' '}
              <strong style={{ color: statistics.adjCompoundReturn >= 0 ? '#30D158' : '#FF453A' }}>
                {statistics.adjCompoundReturn >= 0 ? '+' : ''}{statistics.adjCompoundReturn.toFixed(2)}%
              </strong>
              <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>
                (vs {statistics.totalReturnPercent >= 0 ? '+' : ''}{statistics.totalReturnPercent.toFixed(2)}% oggi)
              </span>
            </span>
            {statistics.adjCagr != null && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                CAGR adj.{' '}
                <strong style={{ color: statistics.adjCagr >= 0 ? '#30D158' : '#FF453A' }}>
                  {statistics.adjCagr >= 0 ? '+' : ''}{statistics.adjCagr.toFixed(2)}%
                </strong>
                <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>
                  (vs {statistics.cagr >= 0 ? '+' : ''}{statistics.cagr.toFixed(2)}%)
                </span>
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
            Ctrl+clic sulla heatmap per aggiungere/togliere mesi
          </span>
        </div>
      )}

      {/* ── 3.5 MASSIMI STORICI ── */}
      {(peakStats.peakValue > 0 || peakStats.peakTwrPct > 0 || peakStats.peakReturnPct !== 0) && (
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: '1rem' }}>🏔</span>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Massimi storici</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>· Picchi raggiunti e distanza attuale</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {/* Picco Patrimonio € */}
            <div style={{
              background: 'var(--surface-2)', borderRadius: 12, padding: '14px 18px',
              borderLeft: `3px solid ${peakStats.isAtValuePeak ? '#30D158' : '#FF9F0A'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Patrimonio massimo
                </p>
                {peakStats.isAtValuePeak && (
                  <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#0B2E14', background: '#30D158', padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ATH · Sei qui
                  </span>
                )}
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
                €{Math.round(peakStats.peakValue).toLocaleString('it-IT')}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', margin: '3px 0 8px' }}>
                Raggiunto {peakStats.peakValueMonth || '—'}
              </p>
              {!peakStats.isAtValuePeak && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Attuale:</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-1)' }}>
                    €{Math.round(peakStats.currentValue).toLocaleString('it-IT')}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FF453A', marginLeft: 'auto' }}>
                    {peakStats.valueGapPct.toFixed(2)}% (−€{Math.round(-peakStats.valueGapAbs).toLocaleString('it-IT')})
                  </span>
                </div>
              )}
            </div>

            {/* Picco Rendimento % sul capitale (money-weighted like) */}
            <div style={{
              background: 'var(--surface-2)', borderRadius: 12, padding: '14px 18px',
              borderLeft: `3px solid ${peakStats.isAtReturnPeak ? '#30D158' : '#FF9F0A'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Rendimento massimo
                </p>
                {peakStats.isAtReturnPeak && (
                  <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#0B2E14', background: '#30D158', padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ATH · Sei qui
                  </span>
                )}
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: peakStats.peakReturnPct >= 0 ? '#30D158' : '#FF453A', margin: 0 }}>
                {peakStats.peakReturnPct >= 0 ? '+' : ''}{peakStats.peakReturnPct.toFixed(2)}%
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', margin: '3px 0 8px' }}>
                Raggiunto {peakStats.peakReturnMonth || '—'} · sul capitale
              </p>
              {!peakStats.isAtReturnPeak && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Attuale:</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: peakStats.currentReturnPct >= 0 ? '#30D158' : '#FF453A' }}>
                    {peakStats.currentReturnPct >= 0 ? '+' : ''}{peakStats.currentReturnPct.toFixed(2)}%
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FF453A', marginLeft: 'auto' }}>
                    {peakStats.returnGap.toFixed(2)}pp dal picco
                  </span>
                </div>
              )}
            </div>

            {/* Picco Rendimento TWR% */}
            <div style={{
              background: 'var(--surface-2)', borderRadius: 12, padding: '14px 18px',
              borderLeft: `3px solid ${peakStats.isAtTwrPeak ? '#30D158' : '#FF9F0A'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Rendimento TWR massimo
                </p>
                {peakStats.isAtTwrPeak && (
                  <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#0B2E14', background: '#30D158', padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ATH · Sei qui
                  </span>
                )}
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: peakStats.peakTwrPct >= 0 ? '#30D158' : '#FF453A', margin: 0 }}>
                {peakStats.peakTwrPct >= 0 ? '+' : ''}{peakStats.peakTwrPct.toFixed(2)}%
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', margin: '3px 0 8px' }}>
                Raggiunto {peakStats.peakTwrMonth || '—'}
              </p>
              {!peakStats.isAtTwrPeak && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Attuale:</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: peakStats.currentTwrPct >= 0 ? '#30D158' : '#FF453A' }}>
                    {peakStats.currentTwrPct >= 0 ? '+' : ''}{peakStats.currentTwrPct.toFixed(2)}%
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FF453A', marginLeft: 'auto' }}>
                    {peakStats.twrGap.toFixed(2)}pp dal picco
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. BENCHMARK CHART + SIDEBAR ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>

        {/* Benchmark normalized chart card */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h2 style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '1rem', margin: 0 }}>Confronto Benchmark (€)</h2>
            <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', padding: 3, borderRadius: 8 }}>
              {['EUR', 'USD'].map(c => (
                <button
                  key={c}
                  onClick={() => setBenchmarkCurrency(c)}
                  style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 500,
                    background: benchmarkCurrency === c ? 'var(--card-bg)' : 'transparent',
                    color: benchmarkCurrency === c ? 'var(--text-1)' : 'var(--text-3)',
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  {c === 'EUR' ? '🇪🇺 EUR' : '🇺🇸 USD'}
                </button>
              ))}
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', margin: '0 0 16px' }}>
            {statistics.startDate && `Dal ${format(statistics.startDate, 'MMMM yyyy', { locale: it })} ad oggi`}
          </p>

          {benchmarkLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div style={{ width: 36, height: 36, border: '3px solid #0A84FF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
          ) : absoluteChartData.length > 0 ? (
            <>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-3)', margin: '-8px 0 16px', fontStyle: 'italic' }}>
                Simulazione: lo stesso portafoglio versato nei benchmark mese per mese
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={absoluteChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} angle={-30} textAnchor="end" height={60} />
                  <YAxis
                    tickFormatter={(v) => v >= 1000 ? `€${(v/1000).toFixed(0)}k` : `€${v}`}
                    tick={{ fontSize: 11, fill: 'var(--text-3)' }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    formatter={(value, name) => [`€${value.toLocaleString('it-IT')}`, name]}
                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Il mio Portafoglio" stroke="var(--text-1)" strokeWidth={3} dot={false} />
                  {Object.entries(benchmarkData).map(([name, data]) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={data.color} strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              {/* Compact metrics table */}
              {Object.keys(benchmarkData).length > 0 && (
                <div style={{ marginTop: 20, overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-3)', fontWeight: 600, fontSize: '0.72rem', borderBottom: '1px solid var(--border)' }}>Metrica</th>
                        <th style={{ textAlign: 'center', padding: '6px 10px', color: 'var(--text-3)', fontWeight: 600, fontSize: '0.72rem', borderBottom: '1px solid var(--border)' }}>Portafoglio</th>
                        {Object.entries(benchmarkData).map(([name, data]) => (
                          <th key={name} style={{ textAlign: 'center', padding: '6px 10px', fontSize: '0.72rem', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: data.color, display: 'inline-block', flexShrink: 0 }}></span>
                              <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>{name}</span>
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Rendimento', myVal: `${statistics.totalReturnPercent >= 0 ? '+' : ''}${statistics.totalReturnPercent.toFixed(2)}%`, myColor: statistics.totalReturnPercent >= 0 ? '#30D158' : '#FF453A', getVal: (d) => `${d.metrics.totalReturn >= 0 ? '+' : ''}${d.metrics.totalReturn.toFixed(2)}%`, getColor: (d) => d.metrics.totalReturn >= 0 ? '#30D158' : '#FF453A' },
                        { label: 'CAGR', myVal: `${statistics.cagr >= 0 ? '+' : ''}${statistics.cagr.toFixed(2)}%`, myColor: statistics.cagr >= 0 ? '#30D158' : '#FF453A', getVal: (d) => `${d.metrics.cagr >= 0 ? '+' : ''}${d.metrics.cagr.toFixed(2)}%`, getColor: (d) => d.metrics.cagr >= 0 ? '#30D158' : '#FF453A' },
                        { label: 'Volatilità', myVal: `${statistics.volatility.toFixed(2)}%`, myColor: 'var(--text-1)', getVal: (d) => `${d.metrics.volatility.toFixed(2)}%`, getColor: () => 'var(--text-1)' },
                        { label: 'Max DD', myVal: `-${statistics.maxDrawdown.toFixed(2)}%`, myColor: '#FF453A', getVal: (d) => `-${d.metrics.maxDrawdown.toFixed(2)}%`, getColor: () => '#FF453A' },
                        { label: 'Sharpe', myVal: statistics.sharpeRatio.toFixed(2), myColor: statistics.sharpeRatio >= 1 ? '#30D158' : 'var(--text-1)', getVal: (d) => d.metrics.sharpeRatio.toFixed(2), getColor: (d) => d.metrics.sharpeRatio >= 1 ? '#30D158' : 'var(--text-1)' },
                      ].map(row => (
                        <tr key={row.label} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px 10px', color: 'var(--text-3)', fontSize: '0.78rem' }}>{row.label}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: row.myColor, fontSize: '0.82rem' }}>{row.myVal}</td>
                          {Object.entries(benchmarkData).map(([name, data]) => (
                            <td key={name} style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, color: row.getColor(data), fontSize: '0.82rem' }}>{row.getVal(data)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <p>Dati benchmark non disponibili</p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Period returns */}
          <div style={{ background: 'var(--card-bg)', borderRadius: 16, padding: '16px 20px' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--text-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Rendimenti Periodo</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'YTD', data: periodReturns.ytd },
                { label: '1 Anno', data: periodReturns['1y'] },
                { label: '3 Anni', data: periodReturns['3y'] },
                { label: '5 Anni', data: periodReturns['5y'] },
                { label: 'Totale', data: periodReturns.all, isTotal: true },
              ].map(({ label, data, isTotal }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 12px', borderRadius: 10,
                  background: isTotal ? 'rgba(10,132,255,0.08)' : 'var(--surface-2)'
                }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', fontWeight: isTotal ? 600 : 400 }}>{label}</span>
                  {data ? (
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: data.return >= 0 ? '#30D158' : '#FF453A' }}>
                      {data.return >= 0 ? '+' : ''}{data.return.toFixed(1)}%
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>N/A</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Best / Worst month */}
          {(statistics.bestMonth || statistics.worstMonth) && (
            <div style={{ background: 'var(--card-bg)', borderRadius: 16, padding: '16px 20px' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--text-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Mese Estremo</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {statistics.bestMonth && (
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(48,209,88,0.1)', border: '1px solid rgba(48,209,88,0.25)' }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', margin: '0 0 3px' }}>Miglior mese · {statistics.bestMonth.month}</p>
                    <p style={{ fontWeight: 700, color: '#30D158', fontSize: '1.2rem', margin: 0 }}>+{statistics.bestMonth.return.toFixed(2)}%</p>
                  </div>
                )}
                {statistics.worstMonth && (
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.25)' }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', margin: '0 0 3px' }}>Peggior mese · {statistics.worstMonth.month}</p>
                    <p style={{ fontWeight: 700, color: '#FF453A', fontSize: '1.2rem', margin: 0 }}>{statistics.worstMonth.return.toFixed(2)}%</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Altri indicatori */}
          <div style={{ background: 'var(--card-bg)', borderRadius: 16, padding: '16px 20px' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--text-2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Altri Indicatori</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Sortino Ratio', value: statistics.sortinoRatio === Infinity ? '∞' : statistics.sortinoRatio.toFixed(2), color: statistics.sortinoRatio >= 1 ? '#30D158' : 'var(--text-1)' },
                { label: 'Recovery Time', value: statistics.recoveryTime > 0 ? `${statistics.recoveryTime} mesi` : 'N/A', color: 'var(--text-1)' },
                { label: 'Avg Mensile', value: `${statistics.avgMonthlyReturn >= 0 ? '+' : ''}${statistics.avgMonthlyReturn.toFixed(2)}%`, color: statistics.avgMonthlyReturn >= 0 ? '#30D158' : '#FF453A' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{item.label}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── 5. MONTHLY RETURNS BAR CHART ── */}
      {monthlyReturns.length > 0 && (
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <h3 style={{ fontWeight: 600, color: 'var(--text-1)', margin: '0 0 4px' }}>Rendimento Mensile (%)</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', margin: '0 0 16px' }}>Performance mensile TWR · esclude nuovi investimenti</p>
            </div>
            {monthlyReturns.some(m => m.isCurrentMonth) && (
              <span style={{ fontSize: '0.72rem', color: '#FF9F0A', fontWeight: 500, padding: '3px 10px', borderRadius: 8, background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.25)' }}>
                📅 Mese in corso
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyReturns}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tick={({ x, y, payload, index }) => {
                  const entry = monthlyReturns[index];
                  return (
                    <text x={x} y={y + 4} textAnchor="end" fontSize={11} fill={entry?.isCurrentMonth ? '#FF9F0A' : 'var(--text-3)'} transform={`rotate(-45, ${x}, ${y + 4})`}>
                      {payload.value}{entry?.isCurrentMonth ? ' ⬡' : ''}
                    </text>
                  );
                }}
                height={80}
              />
              <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <Tooltip
                formatter={(value, name, props) => {
                  const isPartial = props.payload?.isCurrentMonth;
                  return [`${value.toFixed(2)}%${isPartial ? ' (in corso)' : ''}`, 'Rendimento'];
                }}
                labelStyle={{ fontWeight: 'bold', color: 'var(--text-1)' }}
                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
              />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Bar dataKey="return" name="Rendimento %">
                {monthlyReturns.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isCurrentMonth ? '#FF9F0A' : entry.return >= 0 ? '#30D158' : '#FF453A'}
                    opacity={entry.isCurrentMonth ? 0.55 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── 5. DRAWDOWN CHART ── */}
      {drawdownChartData.length > 0 && (
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, padding: '20px 24px' }}>
          <h3 style={{ fontWeight: 600, color: 'var(--text-1)', margin: '0 0 4px' }}>Cadute di Valore (Drawdown)</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', margin: '0 0 20px' }}>
            Distanza dal massimo storico — portafoglio vs benchmark
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={drawdownChartData}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF453A" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#FF453A" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} angle={-45} textAnchor="end" height={80} />
              <YAxis
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                tick={{ fontSize: 11, fill: 'var(--text-3)' }}
                domain={[
                  (dataMin) => Math.floor(dataMin * 1.1),
                  0
                ]}
              />
              <Tooltip
                formatter={(value, name) => [`${value.toFixed(2)}%`, name]}
                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
              />
              <Legend />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Area
                type="monotone"
                dataKey="Il mio Portafoglio"
                stroke="#FF453A"
                strokeWidth={2}
                fill="url(#ddGrad)"
                dot={false}
              />
              {Object.entries(benchmarkData).map(([name, data]) => (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={data.color}
                  strokeWidth={1.5}
                  fill="none"
                  strokeDasharray="5 5"
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>

          {/* Drawdown summary table */}
          {Object.keys(benchmarkData).length > 0 && (() => {
            const series = ['Il mio Portafoglio', ...Object.keys(benchmarkData)];
            const colors = { 'Il mio Portafoglio': '#FF453A', ...Object.fromEntries(Object.entries(benchmarkData).map(([n, d]) => [n, d.color])) };
            return (
              <div style={{ marginTop: 20, overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-3)', fontWeight: 600, fontSize: '0.72rem', borderBottom: '1px solid var(--border)' }}>Serie</th>
                      <th style={{ textAlign: 'center', padding: '6px 10px', color: 'var(--text-3)', fontWeight: 600, fontSize: '0.72rem', borderBottom: '1px solid var(--border)' }}>Max Drawdown</th>
                      <th style={{ textAlign: 'center', padding: '6px 10px', color: 'var(--text-3)', fontWeight: 600, fontSize: '0.72rem', borderBottom: '1px solid var(--border)' }}>DD Attuale</th>
                      <th style={{ textAlign: 'center', padding: '6px 10px', color: 'var(--text-3)', fontWeight: 600, fontSize: '0.72rem', borderBottom: '1px solid var(--border)' }}>DD Medio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.map(name => {
                      const vals = drawdownChartData.map(d => d[name]).filter(v => v !== undefined);
                      if (!vals.length) return null;
                      const maxDD = Math.min(...vals);
                      const currentDD = vals[vals.length - 1];
                      const avgDD = vals.filter(v => v < 0).reduce((s, v, _, a) => s + v / a.length, 0);
                      return (
                        <tr key={name} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '6px 10px', fontSize: '0.82rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[name], flexShrink: 0, display: 'inline-block' }}></span>
                              <span style={{ color: 'var(--text-2)', fontWeight: name === 'Il mio Portafoglio' ? 700 : 400 }}>{name}</span>
                            </span>
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#FF453A', fontSize: '0.82rem' }}>{maxDD.toFixed(2)}%</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, color: currentDD < -1 ? '#FF453A' : '#30D158', fontSize: '0.82rem' }}>{currentDD.toFixed(2)}%</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--text-2)', fontSize: '0.82rem' }}>{avgDD ? avgDD.toFixed(2) + '%' : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── 6. HEATMAPS (TABBED) ── */}
      {monthlyData.length > 0 && (() => {
        // Calcolo unificato perf%/€ per una serie di valori mensili (chiavi = monthKey → valore),
        // considerando il netCashFlow del mese per la specifica dimensione (macro/micro/ticker).
        const calcMonthPerf = (values, index, txFilter) => {
          if (index === 0) return null;
          const monthKey = monthlyData[index].monthKey;
          const prevKey = monthlyData[index - 1].monthKey;
          const currentValue = values[monthKey] || 0;
          const prevValue = values[prevKey] || 0;
          if (currentValue === 0) return null;
          const [year, monthNum] = monthKey.split('-');
          let netInvestment = 0;
          transactions.forEach(tx => {
            if (!tx.date) return;
            const txDate = new Date(tx.date);
            if (txDate.getFullYear() !== parseInt(year) || txDate.getMonth() + 1 !== parseInt(monthNum)) return;
            if (!txFilter(tx)) return;
            const amount = tx.quantity * tx.price;
            const commission = tx.commission || 0;
            if (tx.type === 'buy') netInvestment += amount + commission;
            else if (tx.type === 'sell') netInvestment -= amount - commission;
          });
          const expectedValue = prevValue + netInvestment;
          const base = expectedValue > 0 ? expectedValue : (prevValue > 0 ? prevValue : null);
          if (base === null) return null;
          const gainEur = currentValue - base;
          const perfPct = (gainEur / base) * 100;
          return { perfPct, gainEur };
        };
        const fmtCell = (r) => {
          if (r === null) return '-';
          if (heatmapValueMode === 'percent') return `${r.perfPct >= 0 ? '+' : ''}${r.perfPct.toFixed(1)}%`;
          const abs = Math.abs(r.gainEur);
          const compact = abs >= 1000 ? `€${(r.gainEur / 1000).toFixed(1)}k` : `€${Math.round(r.gainEur)}`;
          return `${r.gainEur >= 0 ? '+' : '−'}${compact.replace('-', '')}`;
        };
        const sortRows = (rows, getValuesFn, txFilterFn) => {
          if (!heatmapSort.monthKey) return rows;
          const idx = monthlyData.findIndex(m => m.monthKey === heatmapSort.monthKey);
          if (idx <= 0) return rows;
          const scored = rows.map(r => {
            const perf = calcMonthPerf(getValuesFn(r), idx, tx => txFilterFn(r, tx));
            const key = heatmapValueMode === 'percent' ? perf?.perfPct : perf?.gainEur;
            return { row: r, key: key ?? null };
          });
          scored.sort((a, b) => {
            if (a.key === null && b.key === null) return 0;
            if (a.key === null) return 1;
            if (b.key === null) return -1;
            return heatmapSort.dir === 'desc' ? b.key - a.key : a.key - b.key;
          });
          return scored.map(s => s.row);
        };
        const onMonthClick = (e, monthKey) => {
          if (e.shiftKey) {
            setExcludedMonths(prev => {
              const next = new Set(prev);
              if (next.has(monthKey)) next.delete(monthKey); else next.add(monthKey);
              return next;
            });
            return;
          }
          setHeatmapSort(prev => {
            if (prev.monthKey !== monthKey) return { monthKey, dir: 'desc' };
            if (prev.dir === 'desc') return { monthKey, dir: 'asc' };
            return { monthKey: null, dir: 'desc' };
          });
        };
        const headerCellStyle = (monthKey) => {
          const isExcluded = excludedMonths.has(monthKey);
          return {
            textAlign: 'center', padding: '6px 6px',
            color: isExcluded ? 'var(--text-3)' : (heatmapSort.monthKey === monthKey ? '#0A84FF' : 'var(--text-3)'),
            fontWeight: heatmapSort.monthKey === monthKey ? 700 : 500,
            minWidth: 68, cursor: 'pointer', userSelect: 'none',
            textDecoration: isExcluded ? 'line-through' : 'none',
            opacity: isExcluded ? 0.5 : 1,
          };
        };
        const sortIndicator = (monthKey) => heatmapSort.monthKey === monthKey ? (heatmapSort.dir === 'desc' ? ' ▼' : ' ▲') : '';

        return (
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '1.05rem', margin: 0 }}>Mappa di Calore</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', margin: '3px 0 0' }}>
                {heatmapValueMode === 'percent' ? 'Performance mensile · TWR' : 'Guadagno mensile in € · al netto dei versamenti'}
                {' '}<span style={{ color: 'var(--text-3)', fontSize: '0.7rem' }}>· Click mese: ordina · Shift+click: escludi dalle statistiche</span>
                {heatmapSort.monthKey && (
                  <> · Ordinato per <span style={{ color: '#0A84FF', fontWeight: 600 }}>{monthlyData.find(m => m.monthKey === heatmapSort.monthKey)?.month}</span> {heatmapSort.dir === 'desc' ? '↓' : '↑'} <button onClick={() => setHeatmapSort({ monthKey: null, dir: 'desc' })} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', padding: 0, marginLeft: 4 }}>reset</button></>
                )}
              </p>
              {excludedMonths.size > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600 }}>
                    Escludo {excludedMonths.size} {excludedMonths.size === 1 ? 'mese' : 'mesi'} dalle statistiche:
                  </span>
                  {[...excludedMonths].sort().map(mk => {
                    const label = monthlyData.find(m => m.monthKey === mk)?.month || mk;
                    return (
                      <span key={mk} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FF9F0A22', border: '1px solid #FF9F0A55', borderRadius: 12, padding: '2px 4px 2px 8px', fontSize: '0.7rem', color: 'var(--text-1)' }}>
                        {label}
                        <button
                          onClick={() => setExcludedMonths(prev => { const n = new Set(prev); n.delete(mk); return n; })}
                          style={{ background: 'transparent', border: 'none', color: '#FF9F0A', cursor: 'pointer', padding: 0, fontSize: '0.9rem', lineHeight: 1, marginLeft: 2 }}
                          title="Reinserisci mese"
                        >×</button>
                      </span>
                    );
                  })}
                  <button
                    onClick={() => setExcludedMonths(new Set())}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '0.7rem', textDecoration: 'underline', padding: 0 }}
                  >azzera</button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Toggle % / € */}
              <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', padding: 3, borderRadius: 8 }}>
                {[['percent', '%'], ['euro', '€']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setHeatmapValueMode(val)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600,
                      background: heatmapValueMode === val ? 'var(--card-bg)' : 'transparent',
                      color: heatmapValueMode === val ? 'var(--text-1)' : 'var(--text-3)',
                      border: 'none', cursor: 'pointer',
                    }}
                  >{label}</button>
                ))}
              </div>
              {/* Tab MACRO/MICRO/TICKER */}
              <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', padding: 4, borderRadius: 10 }}>
                {[['macro', 'MACRO'], ['micro', 'MICRO'], ['ticker', 'TICKER']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setHeatmapTab(val)}
                    style={{
                      padding: '6px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 500,
                      background: heatmapTab === val ? 'var(--card-bg)' : 'transparent',
                      color: heatmapTab === val ? 'var(--text-1)' : 'var(--text-3)',
                      border: 'none', cursor: 'pointer'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color legend */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { bg: '#166534', label: '>+10%' },
              { bg: '#16a34a', label: '+5/+10%' },
              { bg: '#4ade80', label: '+2/+5%' },
              { bg: '#bbf7d0', label: '0/+2%' },
              { bg: '#fee2e2', label: '-2/0%' },
              { bg: '#fca5a5', label: '-5/-2%' },
              { bg: '#dc2626', label: '-10/-5%' },
              { bg: '#7f1d1d', label: '<-10%' },
            ].map(c => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: c.bg, flexShrink: 0 }}></div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{c.label}</span>
              </div>
            ))}
          </div>

          {/* MACRO heatmap */}
          {heatmapTab === 'macro' && (() => {
            const macroRows = Object.keys(CATEGORY_COLORS)
              .filter(cat => cat !== 'Totale' && cat !== 'Cash')
              .filter(cat => monthlyData.some(m => (monthlyCategoryValues[m.monthKey] || {})[cat] > 0));
            const sortedMacro = sortRows(
              macroRows,
              (cat) => Object.fromEntries(monthlyData.map(m => [m.monthKey, monthlyCategoryValues[m.monthKey]?.[cat] || 0])),
              (cat, tx) => tx.macroCategory === cat
            );
            return (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-3)', fontWeight: 600, position: 'sticky', left: 0, background: 'var(--card-bg)', minWidth: 120, zIndex: 10 }}>Asset Class</th>
                    {monthlyData.map(month => (
                      <th key={month.monthKey} onClick={(e) => onMonthClick(e, month.monthKey)} style={headerCellStyle(month.monthKey)} title="Click: ordina · Shift+click: escludi mese dalle statistiche">
                        {month.month}{sortIndicator(month.monthKey)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedMacro.map(category => {
                    const values = Object.fromEntries(monthlyData.map(m => [m.monthKey, monthlyCategoryValues[m.monthKey]?.[category] || 0]));
                    return (
                      <tr key={category}>
                        <td style={{ padding: '5px 12px', fontWeight: 600, color: 'var(--text-2)', position: 'sticky', left: 0, background: 'var(--card-bg)', borderRight: '1px solid var(--border)', zIndex: 10 }}>{category}</td>
                        {monthlyData.map((month, index) => {
                          const currentValue = values[month.monthKey] || 0;
                          if (currentValue === 0) return <td key={month.monthKey} style={{ padding: '5px 6px', textAlign: 'center', color: 'var(--text-3)' }}>-</td>;
                          const r = calcMonthPerf(values, index, (tx) => tx.macroCategory === category);
                          if (r === null) return <td key={month.monthKey} style={{ padding: '5px 6px', textAlign: 'center', color: 'var(--text-3)' }}>-</td>;
                          const s = getHeatmapStyle(r.perfPct);
                          return <td key={month.monthKey} style={{ padding: '5px 6px', textAlign: 'center', background: s.bg, color: s.text, fontWeight: s.fw }}>{fmtCell(r)}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            );
          })()}

          {/* MICRO heatmap */}
          {heatmapTab === 'micro' && (() => {
            const allMicro = new Set();
            Object.values(monthlyMicroCategoryValues).forEach(mv => {
              Object.keys(mv).forEach(mc => { if (mc !== 'N/A' && mv[mc] > 0) allMicro.add(mc); });
            });
            const microRows = Array.from(allMicro).sort();
            const sortedMicro = sortRows(
              microRows,
              (mc) => Object.fromEntries(monthlyData.map(m => [m.monthKey, monthlyMicroCategoryValues[m.monthKey]?.[mc] || 0])),
              (mc, tx) => (tx.microCategory || tx.macroCategory || 'N/A') === mc
            );
            return (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-3)', fontWeight: 600, position: 'sticky', left: 0, background: 'var(--card-bg)', minWidth: 160, zIndex: 10 }}>Micro Categoria</th>
                    {monthlyData.map(month => (
                      <th key={month.monthKey} onClick={(e) => onMonthClick(e, month.monthKey)} style={headerCellStyle(month.monthKey)} title="Click: ordina · Shift+click: escludi mese dalle statistiche">
                        {month.month}{sortIndicator(month.monthKey)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedMicro.map(microCategory => {
                    const values = Object.fromEntries(monthlyData.map(m => [m.monthKey, monthlyMicroCategoryValues[m.monthKey]?.[microCategory] || 0]));
                    return (
                      <tr key={microCategory}>
                        <td style={{ padding: '5px 12px', fontWeight: 600, color: 'var(--text-2)', position: 'sticky', left: 0, background: 'var(--card-bg)', borderRight: '1px solid var(--border)', zIndex: 10 }}>{microCategory}</td>
                        {monthlyData.map((month, index) => {
                          const currentValue = values[month.monthKey] || 0;
                          if (currentValue === 0) return <td key={month.monthKey} style={{ padding: '5px 6px', textAlign: 'center', color: 'var(--text-3)' }}>-</td>;
                          const r = calcMonthPerf(values, index, (tx) => (tx.microCategory || tx.macroCategory || 'N/A') === microCategory);
                          if (r === null) return <td key={month.monthKey} style={{ padding: '5px 6px', textAlign: 'center', color: 'var(--text-3)' }}>-</td>;
                          const s = getHeatmapStyle(r.perfPct);
                          return <td key={month.monthKey} style={{ padding: '5px 6px', textAlign: 'center', background: s.bg, color: s.text, fontWeight: s.fw }}>{fmtCell(r)}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            );
          })()}

          {/* TICKER heatmap */}
          {heatmapTab === 'ticker' && (() => {
            const tickerData = {};
            transactions.forEach(tx => {
              if (!tx.isCash && tx.macroCategory !== 'Cash' && tx.ticker) {
                if (!tickerData[tx.ticker]) tickerData[tx.ticker] = { ticker: tx.ticker, category: tx.macroCategory || 'N/A' };
              }
            });
            const tickerRows = Object.values(tickerData)
              .filter(({ ticker }) => monthlyData.some(m => (monthlyTickerValues[m.monthKey] || {})[ticker] > 0))
              .sort((a, b) => a.category !== b.category ? a.category.localeCompare(b.category) : a.ticker.localeCompare(b.ticker));
            const sortedTickers = sortRows(
              tickerRows,
              ({ ticker }) => Object.fromEntries(monthlyData.map(m => [m.monthKey, monthlyTickerValues[m.monthKey]?.[ticker] || 0])),
              ({ ticker }, tx) => tx.ticker === ticker
            );
            return (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-3)', fontWeight: 600, position: 'sticky', left: 0, background: 'var(--card-bg)', minWidth: 130, zIndex: 10 }}>Ticker</th>
                    {monthlyData.map(month => (
                      <th key={month.monthKey} onClick={(e) => onMonthClick(e, month.monthKey)} style={headerCellStyle(month.monthKey)} title="Click: ordina · Shift+click: escludi mese dalle statistiche">
                        {month.month}{sortIndicator(month.monthKey)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedTickers.map(({ ticker, category }) => {
                    const values = Object.fromEntries(monthlyData.map(m => [m.monthKey, monthlyTickerValues[m.monthKey]?.[ticker] || 0]));
                    return (
                      <tr key={ticker}>
                        <td
                          style={{ padding: '5px 12px', position: 'sticky', left: 0, background: 'var(--card-bg)', borderRight: '1px solid var(--border)', zIndex: 10, cursor: 'default' }}
                          onMouseEnter={(e) => {
                            if (tooltipHideTimer.current) clearTimeout(tooltipHideTimer.current);
                            const rect = e.currentTarget.getBoundingClientRect();
                            const info = tickerNameMap[ticker] || {};
                            setTickerTooltip({
                              ticker,
                              name: info.name || ticker,
                              macroCategory: info.macroCategory || category,
                              microCategory: info.microCategory || '',
                              currentPrice: currentPricesRef.current[ticker]?.price,
                              anchorRight: rect.right,
                              anchorTop: rect.top,
                            });
                          }}
                          onMouseLeave={() => {
                            tooltipHideTimer.current = setTimeout(() => setTickerTooltip(null), 250);
                          }}
                        >
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-1)' }}>{ticker}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginLeft: 5 }}>{category}</span>
                        </td>
                        {monthlyData.map((month, index) => {
                          const currentValue = values[month.monthKey] || 0;
                          if (currentValue === 0) return <td key={month.monthKey} style={{ padding: '5px 6px', textAlign: 'center', color: 'var(--text-3)' }}>-</td>;
                          const r = calcMonthPerf(values, index, (tx) => tx.ticker === ticker);
                          if (r === null) return <td key={month.monthKey} style={{ padding: '5px 6px', textAlign: 'center', color: 'var(--text-3)' }}>•</td>;
                          const s = getHeatmapStyle(r.perfPct);
                          return <td key={month.monthKey} style={{ padding: '5px 6px', textAlign: 'center', background: s.bg, color: s.text, fontWeight: s.fw }}>{fmtCell(r)}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            );
          })()}
        </div>
        );
      })()}

      {/* ── 6. ANALYSIS TABS ── */}
      <div style={{ background: 'var(--card-bg)', borderRadius: 16, padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
          {[
            ['contribution', 'Contribuzione'],
            ['monthly', 'Dettaglio Mensile'],
            ['rolling', 'Rolling 12m'],
            ['stacked', 'Crescita Patrimonio'],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setAnalysisTab(val)}
              style={{
                padding: '8px 20px', fontSize: '0.85rem', fontWeight: 500, border: 'none', background: 'none',
                color: analysisTab === val ? '#0A84FF' : 'var(--text-3)',
                borderBottom: analysisTab === val ? '2px solid #0A84FF' : '2px solid transparent',
                marginBottom: -1, cursor: 'pointer'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* TAB: Contribuzione */}
        {analysisTab === 'contribution' && contributionData.byTicker.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 3, marginBottom: 16, background: 'var(--surface-2)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
              {[['ticker', 'Per Ticker'], ['micro', 'Per Micro Categoria']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setContributionView(val)}
                  style={{
                    padding: '6px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 500,
                    background: contributionView === val ? 'var(--card-bg)' : 'transparent',
                    color: contributionView === val ? 'var(--text-1)' : 'var(--text-3)',
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Asset', 'Categoria', 'Peso Medio', 'Rendimento', 'Contributo €', 'Contributo %'].map((h, i) => (
                      <th key={h} style={{ padding: '8px 12px', color: 'var(--text-3)', fontWeight: 600, fontSize: '0.72rem', textAlign: i >= 2 ? 'right' : 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(contributionView === 'ticker' ? contributionData.byTicker : contributionData.byMicroCategory).map(item => {
                    const key = contributionView === 'ticker' ? item.ticker : item.microCategory;
                    return (
                      <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', color: 'var(--text-1)', fontWeight: 600 }}>
                          {contributionView === 'ticker' ? (
                            <><div style={{ fontFamily: 'monospace' }}>{item.ticker}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{item.name}</div></>
                          ) : (
                            <><div>{item.microCategory}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{item.macroCategory}</div></>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-3)', fontSize: '0.75rem' }}>
                          {contributionView === 'ticker' ? item.microCategory : (item.tickers.slice(0, 3).join(', ') + (item.tickers.length > 3 ? ` +${item.tickers.length - 3}` : ''))}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-1)' }}>{item.avgWeight.toFixed(1)}%</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: item.assetReturn >= 0 ? '#30D158' : '#FF453A' }}>{item.assetReturn >= 0 ? '+' : ''}{item.assetReturn.toFixed(1)}%</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: item.contributionEuro >= 0 ? '#30D158' : '#FF453A' }}>{item.contributionEuro >= 0 ? '+' : ''}€{item.contributionEuro.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: item.contributionPercent >= 0 ? '#30D158' : '#FF453A' }}>{item.contributionPercent >= 0 ? '+' : ''}{item.contributionPercent.toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', background: 'rgba(10,132,255,0.06)' }}>
                    <td colSpan={2} style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-1)' }}>TOTALE</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-1)' }}>
                      {(contributionView === 'ticker' ? contributionData.byTicker : contributionData.byMicroCategory).reduce((s, t) => s + t.avgWeight, 0).toFixed(0)}%
                    </td>
                    <td style={{ padding: '8px 12px' }}></td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: contributionData.totalReturnEuro >= 0 ? '#30D158' : '#FF453A' }}>
                      {contributionData.totalReturnEuro >= 0 ? '+' : ''}€{contributionData.totalReturnEuro.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: contributionData.totalReturnPercent >= 0 ? '#30D158' : '#FF453A' }}>
                      {contributionData.totalReturnPercent >= 0 ? '+' : ''}{contributionData.totalReturnPercent.toFixed(2)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
        {analysisTab === 'contribution' && contributionData.byTicker.length === 0 && (
          <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '32px 0' }}>Nessun dato di contribuzione disponibile</p>
        )}

        {/* TAB: Dettaglio Mensile — without "Variazione vs Mese Precedente" column */}
        {analysisTab === 'monthly' && monthlyReturns.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Mese', 'Valore Portafoglio', 'Cash Flow Netto', 'Rendimento Mensile TWR'].map((h, i) => (
                    <th key={h} style={{ padding: '8px 12px', color: 'var(--text-3)', fontWeight: 600, fontSize: '0.72rem', textAlign: i === 0 ? 'left' : 'right', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyReturns.map(monthData => (
                  <tr key={monthData.month} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--text-1)' }}>{monthData.month}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-1)' }}>€{monthData.value.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: monthData.netCashFlow > 0 ? '#30D158' : monthData.netCashFlow < 0 ? '#FF453A' : 'var(--text-3)' }}>
                      {monthData.netCashFlow !== undefined && monthData.netCashFlow !== 0 ? `${monthData.netCashFlow > 0 ? '+' : ''}€${(monthData.netCashFlow || 0).toLocaleString('it-IT', { maximumFractionDigits: 0 })}` : '-'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: monthData.return >= 0 ? '#30D158' : '#FF453A' }}>
                      {monthData.return >= 0 ? '+' : ''}{monthData.return.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', background: 'rgba(10,132,255,0.06)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-1)' }}>TOTALE</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-1)' }}>€{monthlyReturns[monthlyReturns.length - 1].value.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-3)' }}>-</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                    {(() => {
                      const avg = monthlyReturns.reduce((s, m) => s + m.return, 0) / monthlyReturns.length;
                      return <span style={{ color: avg >= 0 ? '#30D158' : '#FF453A' }}>Avg: {avg >= 0 ? '+' : ''}{avg.toFixed(2)}%</span>;
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* TAB: Rolling Returns */}
        {analysisTab === 'rolling' && rollingReturns.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={rollingReturns}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} angle={-45} textAnchor="end" height={70} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                <Tooltip
                  formatter={(v) => [`${v.toFixed(2)}%`, 'Rolling 12m']}
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                />
                <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="rolling12m" stroke="#BF5AF2" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
              {[
                { label: 'Media', calc: () => rollingReturns.reduce((s, r) => s + r.rolling12m, 0) / rollingReturns.length, fmt: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, color: v => v >= 0 ? '#30D158' : '#FF453A' },
                { label: 'Massimo', calc: () => Math.max(...rollingReturns.map(r => r.rolling12m)), fmt: v => `+${v.toFixed(1)}%`, color: () => '#30D158' },
                { label: 'Minimo', calc: () => Math.min(...rollingReturns.map(r => r.rolling12m)), fmt: v => `${v.toFixed(1)}%`, color: () => '#FF453A' },
              ].map(stat => {
                const val = stat.calc();
                return (
                  <div key={stat.label} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', margin: '0 0 4px' }}>{stat.label}</p>
                    <p style={{ fontWeight: 700, fontSize: '1.1rem', color: stat.color(val), margin: 0 }}>{stat.fmt(val)}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {analysisTab === 'rolling' && rollingReturns.length === 0 && (
          <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '32px 0' }}>Dati insufficienti (serve almeno 1 anno di storia)</p>
        )}

        {/* TAB: Crescita Patrimonio (stacked bar) */}
        {analysisTab === 'stacked' && (
          <>
            <div style={{ display: 'flex', gap: 3, marginBottom: 16, background: 'var(--surface-2)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
              {[['ticker', 'Ticker'], ['macro', 'Macro'], ['micro', 'Micro']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setView(val)}
                  style={{
                    padding: '6px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 500,
                    background: view === val ? 'var(--card-bg)' : 'transparent',
                    color: view === val ? 'var(--text-1)' : 'var(--text-3)',
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} angle={-45} textAnchor="end" height={80} />
                <YAxis tickFormatter={(v) => `€${v.toLocaleString('it-IT')}`} tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ maxHeight: 80, overflowY: 'auto' }} iconSize={10} />
                {dataKeys.map((key, index) => (
                  <Bar key={key} dataKey={key} stackId="a" fill={getColorForKey(key, index)} name={key} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* ── TICKER TOOLTIP OVERLAY ── */}
      {tickerTooltip && (() => {
        const TT_W = 268;
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
        let left = tickerTooltip.anchorRight + 12;
        if (left + TT_W > vw - 12) left = tickerTooltip.anchorRight - TT_W - 12;
        let top = tickerTooltip.anchorTop - 8;
        const TT_H_EST = 320;
        if (top + TT_H_EST > vh - 12) top = vh - TT_H_EST - 12;
        if (top < 8) top = 8;

        const cur = tickerTooltip.currentPrice;

        // Borsa e valuta nativa dal dato live
        const priceData = currentPricesRef.current[tickerTooltip.ticker] || {};
        const origCcy = priceData.originalCurrency || null;
        const nativeConv = getNativeConversionFactor(origCcy);
        const canToggle = nativeConv.isForeign; // true solo se valuta != EUR

        // Fattore di display: 1 = EUR, nativeConv.factor = valuta originale
        const dispFactor = (tooltipShowNative && canToggle) ? nativeConv.factor : 1;
        const dispSymbol = (tooltipShowNative && canToggle) ? nativeConv.symbol : '€';
        const dispIsEur = dispSymbol === '€';

        // Formattazione adattata alla valuta (€ davanti, $ davanti, p dietro)
        const fmtP = (v) => {
          const n = (v * dispFactor).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          if (dispSymbol === 'p') return `${n}p`;
          return `${dispSymbol}${n}`;
        };
        const fmtPraw = (v) => fmtP(v / dispFactor); // v already in display units

        // Dati sparkline convertiti nella valuta di display
        const displayChartData = (tooltipShowNative && canToggle)
          ? tooltipChartData.map(d => ({ ...d, price: d.price * nativeConv.factor }))
          : tooltipChartData;

        const EXCHANGE_MAP = {
          '.MI': 'Borsa Italiana', '.L': 'London SE', '.DE': 'Xetra (DE)',
          '.AS': 'Euronext AMS', '.PA': 'Euronext PAR', '.F': 'Frankfurt',
          '.SW': 'SIX Swiss', '.BR': 'Euronext BRU', '.VI': 'Vienna SE',
          '.LS': 'Euronext LIS', '.MC': 'Bolsa Madrid',
        };
        const exchangeName = (() => {
          const t = tickerTooltip.ticker;
          for (const [sfx, label] of Object.entries(EXCHANGE_MAP)) {
            if (t.toUpperCase().endsWith(sfx.toUpperCase())) return label;
          }
          return 'US Markets (NYSE/NASDAQ)';
        })();
        const ccyLabel = !origCcy || origCcy === 'EUR'
          ? 'EUR'
          : origCcy === 'GBp' || origCcy === 'GBX'
            ? 'GBp → EUR'
            : `${origCcy} → EUR`;

        const allPrices = displayChartData.map(d => d.price);
        const histMin = allPrices.length ? Math.min(...allPrices) : null;
        const histMax = allPrices.length ? Math.max(...allPrices) : null;
        // distanza del prezzo corrente (convertito) da min/max storici
        const curDisp = cur != null ? cur * dispFactor : null;
        const fromMin = (histMin != null && curDisp != null && histMin > 0) ? ((curDisp - histMin) / histMin) * 100 : null;
        const fromMax = (histMax != null && curDisp != null && histMax > 0) ? ((curDisp - histMax) / histMax) * 100 : null;

        const perfPct = displayChartData.length >= 2 && displayChartData[0].price > 0
          ? ((displayChartData[displayChartData.length - 1].price - displayChartData[0].price) / displayChartData[0].price) * 100
          : null;

        const expectedMonths = { '9M': 9, 'YTD': new Date().getMonth() + 1, '3Y': 36, '5Y': 60, '10Y': 120 }[tooltipPeriod] || 9;
        const insuffData = !tooltipLoading && tooltipChartData.length > 0 && tooltipChartData.length < expectedMonths * 0.75;
        const noData = !tooltipLoading && tooltipChartData.length === 0;
        const oldestKey = tooltipChartData[0]?.monthKey;

        const PERIODS = [
          { key: '9M', label: '9M' },
          { key: 'YTD', label: 'YTD' },
          { key: '3Y', label: '3A' },
          { key: '5Y', label: '5A' },
          { key: '10Y', label: '10A' },
        ];

        return (
          <div
            onMouseEnter={() => { if (tooltipHideTimer.current) clearTimeout(tooltipHideTimer.current); }}
            onMouseLeave={() => setTickerTooltip(null)}
            style={{
              position: 'fixed', left, top, width: TT_W, zIndex: 9999,
              background: 'var(--card-bg)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '14px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
              pointerEvents: 'auto',
            }}
          >
            {/* Header: ticker + prezzo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-1)', fontSize: '0.95rem', letterSpacing: '0.03em' }}>
                {tickerTooltip.ticker}
              </span>
              {cur != null && (
                <span style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '0.88rem' }}>
                  {fmtP(cur)}
                </span>
              )}
            </div>
            {/* Borsa + valuta + toggle EUR↔nativa */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 7px', borderRadius: 4, border: '1px solid var(--border)' }}>
                {exchangeName}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                  background: origCcy && origCcy !== 'EUR' ? 'rgba(255,159,10,0.12)' : 'rgba(48,209,88,0.1)',
                  color: origCcy && origCcy !== 'EUR' ? '#FF9F0A' : '#30D158',
                  border: `1px solid ${origCcy && origCcy !== 'EUR' ? 'rgba(255,159,10,0.3)' : 'rgba(48,209,88,0.25)'}`,
                }}>
                  {ccyLabel}
                </span>
                {canToggle && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setTooltipShowNative(p => !p); }}
                    title={tooltipShowNative ? 'Mostra in EUR' : `Mostra in ${origCcy}`}
                    style={{
                      fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: tooltipShowNative ? '#0A84FF' : 'var(--surface-2)',
                      color: tooltipShowNative ? '#fff' : 'var(--text-3)',
                      border: `1px solid ${tooltipShowNative ? '#0A84FF' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {tooltipShowNative ? `${nativeConv.symbol}` : '€'} ⇄ {tooltipShowNative ? '€' : `${nativeConv.symbol}`}
                  </button>
                )}
              </div>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-2)', margin: '0 0 2px', lineHeight: 1.35, fontWeight: 500 }}>
              {tickerTooltip.name}
            </p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', margin: '0 0 10px' }}>
              {tickerTooltip.macroCategory}
              {tickerTooltip.microCategory && tickerTooltip.microCategory !== 'N/A'
                ? ` · ${tickerTooltip.microCategory}` : ''}
            </p>

            {/* Selettori periodo */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={(e) => { e.stopPropagation(); setTooltipPeriod(p.key); }}
                  style={{
                    flex: 1, padding: '4px 0', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600,
                    background: tooltipPeriod === p.key ? '#0A84FF' : 'var(--surface-2)',
                    color: tooltipPeriod === p.key ? '#fff' : 'var(--text-3)',
                    border: tooltipPeriod === p.key ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Chart area */}
            {tooltipLoading ? (
              <div style={{ height: 62, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 16, border: '2px solid #0A84FF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Caricamento…</span>
              </div>
            ) : noData ? (
              <div style={{ height: 62, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Nessun dato per questo periodo</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', opacity: 0.7 }}>Prova un periodo più breve</span>
              </div>
            ) : (
              <>
                <TickerSparkLine data={displayChartData} width={TT_W - 32} height={62} />
                {/* Avviso dati parziali */}
                {insuffData && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, padding: '4px 8px', borderRadius: 6, background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.3)' }}>
                    <span style={{ fontSize: '0.65rem', color: '#FF9F0A' }}>
                      Dati dal {oldestKey} · solo {tooltipChartData.length} mesi disponibili
                    </span>
                  </div>
                )}
                {/* Performance periodo */}
                {perfPct != null && (
                  <p style={{ fontSize: '0.67rem', color: 'var(--text-3)', margin: '6px 0 0', textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: perfPct >= 0 ? '#30D158' : '#FF453A' }}>
                      {perfPct >= 0 ? '+' : ''}{perfPct.toFixed(1)}%
                    </span>
                    {' '}periodo selezionato ({tooltipChartData.length} mesi)
                  </p>
                )}
              </>
            )}

            {/* Min / Max */}
            {(histMin != null || histMax != null) && !noData && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {histMin != null && (
                  <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '6px 10px' }}>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Min periodo</p>
                    <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{fmtPraw(histMin)}</p>
                    {fromMin != null && (
                      <p style={{ fontSize: '0.62rem', fontWeight: 600, color: '#30D158', margin: '2px 0 0' }}>
                        +{fromMin.toFixed(1)}% sopra
                      </p>
                    )}
                  </div>
                )}
                {histMax != null && (
                  <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '6px 10px' }}>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-3)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Max periodo</p>
                    <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{fmtPraw(histMax)}</p>
                    {fromMax != null && (
                      <p style={{ fontSize: '0.62rem', fontWeight: 600, color: fromMax >= -0.1 ? '#30D158' : '#FF453A', margin: '2px 0 0' }}>
                        {fromMax >= -0.1 ? 'ATH ✓' : `${fromMax.toFixed(1)}% dal max`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export default PortfolioPerformance;
