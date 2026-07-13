import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Blur } from '../context/PrivacyContext';
import { TrendingUp, TrendingDown, RefreshCw, AlertTriangle, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getTransactions, calculateRealizedPL, portfolioSnapshot } from '../services/localStorageService';
import MissingPricesAlert from '../components/MissingPricesAlert';
import { buildAllocation } from '../services/classificationService';
import { fetchMultiplePrices } from '../services/priceService';
import { calculateCashFlow } from '../services/cashFlowService';
import { getPerformanceSummary } from '../services/performanceService';
import { getCachedPrices, cachePrices } from '../services/priceCache';
import { getPortfolioConfig, getHiddenPortfolioIds, toggleHiddenPortfolio, clearHiddenPortfolios } from '../services/portfolioConfigService';
import { format } from 'date-fns';

// ── Palette ─────────────────────────────────────────────────────────────────
const GREEN  = '#30D158';
const RED    = '#FF453A';
const BLUE   = '#0A84FF';
const ORANGE = '#FF9F0A';
const PURPLE = '#BF5AF2';

const ALLOC_COLORS = [BLUE, '#5E5CE6', GREEN, ORANGE, RED, PURPLE, '#32ADE6', '#AC8E68'];

function pct(n, decimals = 2) {
  const s = Math.abs(n).toFixed(decimals);
  return (n >= 0 ? '+' : '−') + s + '%';
}
function eur(n, dec = 2) {
  return '€' + Math.abs(n).toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function sign(n) { return n >= 0 ? '+' : '−'; }
function color(n) { return n >= 0 ? GREEN : RED; }

// ── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, main, sub, mainColor, large }) {
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '1.1rem 1.3rem', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: large ? '1.9rem' : '1.45rem', fontWeight: 700, color: mainColor || 'var(--text-1)', lineHeight: 1.1 }}>{main}</span>
      {sub && <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{sub}</span>}
    </div>
  );
}

function PortfolioMiniCard({ portfolio, value, pl, plPct, count, rebalanceNeeded, isHidden, onToggle }) {
  return (
    <div
      onClick={onToggle}
      title={isHidden ? 'Clicca per mostrare' : 'Clicca per nascondere dai calcoli'}
      style={{
        background: isHidden ? 'var(--surface-2)' : 'var(--card-bg)',
        border: `1px solid ${isHidden ? 'var(--border)' : rebalanceNeeded ? ORANGE + '55' : 'var(--border)'}`,
        borderRadius: 14, padding: '1rem 1.2rem', minWidth: 180, flexShrink: 0,
        cursor: 'pointer', opacity: isHidden ? 0.45 : 1,
        transition: 'opacity 0.15s, border-color 0.15s',
        userSelect: 'none',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: '1.1rem' }}>{portfolio.emoji}</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
          {portfolio.name}
        </span>
        {rebalanceNeeded && (
          <AlertTriangle size={13} style={{ color: ORANGE, marginLeft: 'auto', flexShrink: 0 }} />
        )}
      </div>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-1)' }}>
        {eur(value)}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: '0.75rem', color: color(pl), fontWeight: 600 }}>
          {sign(pl)}{eur(pl, 0)}
        </span>
        <span style={{ fontSize: '0.75rem', color: color(plPct) }}>
          {pct(plPct, 1)}
        </span>
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 4 }}>
        {count} titol{count === 1 ? 'o' : 'i'}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

function Dashboard() {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const fetchingRef = useRef(false);

  const [priceCache, setPriceCache] = useState(() => getCachedPrices() || {});
  const [portfolio, setPortfolio]   = useState([]);
  const [stats, setStats]           = useState({ totalValue: 0, totalCost: 0, totalPL: 0, totalPLPercent: 0, dayChange: 0, dayChangePercent: 0, assetsCount: 0 });
  const [unpriced, setUnpriced]     = useState([]);
  const [allocationData, setAllocationData]       = useState([]);
  const [subAllocationData, setSubAllocationData] = useState([]);
  const [performanceData, setPerformanceData]     = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [cashFlow, setCashFlow]     = useState(null);
  const [portfolioConfig, setPortfolioConfig] = useState(() => getPortfolioConfig());

  const [chartPeriod, setChartPeriod] = useState('all');
  const [hiddenPortfolioIds, setHiddenPortfolioIds] = useState(() => getHiddenPortfolioIds());
  const [plData, setPlData]           = useState({ total: 0, ytdTotal: 0, positions: [], operations: [] });
  const [plExpanded, setPlExpanded]   = useState(false);

  // ── Data loading ─────────────────────────────────────────────────────────

  useEffect(() => {
    loadData();
    const interval = setInterval(() => fetchLatestPrices(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const data = calculateDashboardData(hiddenPortfolioIds);
    setPortfolio(data.portfolio);
    setStats(data.stats);
    setAllocationData(data.allocation);
    setSubAllocationData(data.subAllocation);
    setPerformanceData(data.performanceData);
    setPerformanceMetrics(data.performanceMetrics);
    setUnpriced(data.unpriced || []);
    setRefreshing(false);
  }, [priceCache, hiddenPortfolioIds, portfolioConfig]);

  const loadData = async () => {
    try {
      setLoading(true);
      setCashFlow(calculateCashFlow());
      setPortfolioConfig(getPortfolioConfig());
      setPlData(calculateRealizedPL());
      await fetchLatestPrices();
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchLatestPrices = async (force = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setRefreshing(true);
    try {
      const transactions = getTransactions().filter(tx => !tx.excludeFromStats);
      const uniqueTickers = new Set();
      const categoriesMap = {};
      transactions.forEach(tx => {
        if (!tx.isCash && tx.macroCategory !== 'Cash' && tx.ticker) {
          uniqueTickers.add(tx.ticker);
          if (!categoriesMap[tx.ticker]) categoriesMap[tx.ticker] = tx.macroCategory || tx.category;
        }
      });
      const tickers = Array.from(uniqueTickers);
      if (!tickers.length) return;
      const prices = await fetchMultiplePrices(tickers, categoriesMap, force);
      const newCache = { ...priceCache, ...prices };
      setPriceCache(newCache);
      cachePrices(newCache);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
      fetchingRef.current = false;
    }
  };

  // ── Calculation ───────────────────────────────────────────────────────────

  const calculateDashboardData = (hiddenIds = []) => {
    const cfg = getPortfolioConfig();

    // ── Unica fonte di verità: portfolioSnapshot ────────────────────────────
    const snap = portfolioSnapshot(priceCache);
    if (!snap.holdings.length) return emptyState();

    // Filtra portafogli nascosti
    const investedAssets = hiddenIds.length
      ? snap.holdings.filter(h => {
          const assigned = cfg.assignments[h.holdingKey ?? h.ticker];
          return !assigned || !hiddenIds.includes(assigned);
        })
      : snap.holdings;

    const totalValue       = investedAssets.reduce((s, h) => s + h.marketValue, 0);
    const totalCost        = investedAssets.reduce((s, h) => s + h.totalCost, 0);
    const totalPL          = totalValue - totalCost + snap.realizedPL;
    const totalPLPercent   = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
    const dayChange        = investedAssets.reduce((s, h) => s + (h.dayChange || 0), 0);
    const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

    // Allocation derivata dal DB di composizione (fonte di verità unica)
    // macro = Azioni/Obbligazioni/…  ·  micro = Az. globale/settoriale/emergenti/…
    const alloc = buildAllocation(investedAssets);
    const allocation    = alloc.macro;   // [{ name, value, percentage, color }]
    const subAllocation = alloc.micro;   // [{ name, value, percentage, color }]

    const allTransactions = getTransactions().filter(tx => !tx.excludeFromStats);
    const performanceData = calculateMonthlyPerformance(allTransactions, snap.holdings);
    const performanceMetrics = getPerformanceSummary(investedAssets, null);

    return {
      portfolio: snap.holdings.sort((a, b) => b.marketValue - a.marketValue),
      stats: { totalValue, totalCost, totalPL, totalPLPercent, dayChange, dayChangePercent, assetsCount: investedAssets.length },
      allocation,
      subAllocation,
      performanceData,
      performanceMetrics,
      unpriced: snap.unpriced || [],
    };
  };

  const emptyState = () => ({
    portfolio: [], stats: { totalValue: 0, totalCost: 0, totalPL: 0, totalPLPercent: 0, dayChange: 0, dayChangePercent: 0, assetsCount: 0 },
    allocation: [], subAllocation: [], performanceData: [], performanceMetrics: null, unpriced: [],
  });

  const calculateMonthlyPerformance = (transactions, currentPortfolio) => {
    const portfolioTickers = new Set(currentPortfolio.map(p => p.ticker));
    const txs = transactions.filter(tx => tx.isCash || tx.macroCategory === 'Cash' || portfolioTickers.has(tx.ticker));
    const months = {};
    txs.forEach(tx => {
      const key = format(new Date(tx.date), 'MMM yyyy');
      if (!months[key]) months[key] = { month: key, cashDeposits: 0, cashWithdrawals: 0, assetPurchases: 0, assetSales: 0 };
      const isCash = tx.isCash || tx.macroCategory === 'Cash';
      const amount = tx.quantity * tx.price;
      const commission = tx.commission || 0;
      if (isCash) {
        if (tx.type === 'buy')  months[key].cashDeposits    += amount;
        else                    months[key].cashWithdrawals  += amount;
      } else {
        if (tx.type === 'buy')  months[key].assetPurchases  += amount + commission;
        else                    months[key].assetSales       += amount - commission;
      }
    });

    const totalCurrentValue = currentPortfolio.reduce((s, p) => s + (p.marketValue || 0), 0);
    const totalInvested     = currentPortfolio.reduce((s, p) => s + p.totalCost, 0);
    let cumDep = 0, cumWith = 0, cumBuy = 0, cumSell = 0;

    return Object.values(months)
      .sort((a, b) => new Date(a.month) - new Date(b.month))
      .map((m, i, arr) => {
        cumDep += m.cashDeposits; cumWith += m.cashWithdrawals;
        cumBuy += m.assetPurchases; cumSell += m.assetSales;
        const versato = cumDep - cumWith;
        const isLast  = i === arr.length - 1;
        const value   = isLast ? totalCurrentValue : (cumBuy - cumSell) * (totalInvested > 0 ? totalCurrentValue / totalInvested : 1);
        return { month: m.month, versato: +versato.toFixed(2), value: +value.toFixed(2) };
      });
  };

  // ── Derived: portfolio cards ──────────────────────────────────────────────

  function handleTogglePortfolio(id) {
    const next = toggleHiddenPortfolio(id);
    setHiddenPortfolioIds(next);
  }

  function handleShowAll() {
    clearHiddenPortfolios();
    setHiddenPortfolioIds([]);
  }

  const portfolioCards = useMemo(() => {
    if (!portfolioConfig.portfolios.length || !portfolio.length) return [];
    return portfolioConfig.portfolios.map(p => {
      const holdings = portfolio.filter(h => !h.isCash && portfolioConfig.assignments[h.holdingKey ?? h.ticker] === p.id);
      const value = holdings.reduce((s, h) => s + (h.marketValue ?? 0), 0);
      const cost  = holdings.reduce((s, h) => s + (h.totalCost  ?? 0), 0);
      const pl    = value - cost;
      const plPct = cost > 0 ? (pl / cost) * 100 : 0;

      let rebalanceNeeded = false;
      if (p.targetAllocation && value > 0) {
        const catTotals = {};
        holdings.forEach(h => { catTotals[h.macroCategory] = (catTotals[h.macroCategory] || 0) + h.marketValue; });
        const threshold = p.rebalanceThreshold ?? 5;
        rebalanceNeeded = Object.entries(p.targetAllocation).some(([cat, target]) => {
          const current = ((catTotals[cat] || 0) / value) * 100;
          return Math.abs(current - target) > threshold;
        });
      }
      return { id: p.id, portfolio: p, value, pl, plPct, count: holdings.length, rebalanceNeeded };
    }).filter(pc => pc.count > 0);
  }, [portfolio, portfolioConfig]);

  // ── Derived: chart with period filter ────────────────────────────────────

  const filteredChartData = useMemo(() => {
    if (chartPeriod === 'all' || !performanceData.length) return performanceData;
    const now = new Date();
    let cutoff;
    if      (chartPeriod === '1m')  cutoff = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    else if (chartPeriod === '3m')  cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    else if (chartPeriod === '6m')  cutoff = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    else if (chartPeriod === 'ytd') cutoff = new Date(now.getFullYear(), 0, 1);
    else if (chartPeriod === '1a')  cutoff = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    return performanceData.filter(d => new Date(d.month + ' 01') >= cutoff);
  }, [performanceData, chartPeriod]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <RefreshCw size={28} style={{ color: BLUE, animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const hasData = portfolio.length > 0;
  const totalWithCash = stats.totalValue + Math.max(0, cashFlow?.availableCash || 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1rem 3rem' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', paddingTop: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Dashboard</h1>
          {lastUpdate && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
              Aggiornato {format(lastUpdate, 'HH:mm')}
            </span>
          )}
        </div>
        <button
          onClick={() => { setRefreshing(true); fetchLatestPrices(true); }}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10,
            background: BLUE + '22', color: BLUE,
            border: `1px solid ${BLUE}44`,
            fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Aggiornamento...' : 'Aggiorna prezzi'}
        </button>
      </div>

      {!hasData ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-bg)', borderRadius: 20, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-2)', marginBottom: 16 }}>Nessuna transazione. Inizia caricando un CSV.</p>
          <a href="/transactions" style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}>→ Vai alle Transazioni</a>
        </div>
      ) : (
        <>
          {/* ── Alert titoli senza prezzo ── */}
          <MissingPricesAlert unpriced={unpriced} />

          {/* ── KPI Hero ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <KpiCard
              label="Portafoglio totale"
              main={eur(stats.totalValue)}
              sub={`${stats.assetsCount} asset`}
              large
            />
            <KpiCard
              label="P&L totale"
              main={<span style={{ color: color(stats.totalPL) }}>{sign(stats.totalPL)}{eur(stats.totalPL)}</span>}
              sub={<span style={{ color: color(stats.totalPLPercent) }}>{pct(stats.totalPLPercent)}</span>}
              mainColor={color(stats.totalPL)}
            />
            <KpiCard
              label="Variazione oggi"
              main={<span style={{ color: color(stats.dayChange) }}>{sign(stats.dayChange)}{eur(stats.dayChange)}</span>}
              sub={<span style={{ color: color(stats.dayChangePercent) }}>{pct(stats.dayChangePercent)}</span>}
              mainColor={color(stats.dayChange)}
            />
            <KpiCard
              label={performanceMetrics?.cagrReliable ? 'CAGR' : 'Rendimento totale'}
              main={performanceMetrics
                ? <span style={{ color: color(performanceMetrics.cagrReliable ? performanceMetrics.cagr : performanceMetrics.totalReturnPercent) }}>
                    {pct(performanceMetrics.cagrReliable ? performanceMetrics.cagr : performanceMetrics.totalReturnPercent)}
                  </span>
                : '—'
              }
              sub={performanceMetrics
                ? (() => {
                    const y = performanceMetrics.yearsInvesting;
                    if (y == null) return '—';
                    if (y < 1) {
                      const months = Math.round(y * 12);
                      return `${months} ${months === 1 ? 'mese' : 'mesi'} investito`;
                    }
                    return `${y.toFixed(1)} anni investito`;
                  })()
                : null
              }
            />
          </div>

          {/* ── P&L Realizzato ── */}
          {plData.operations.length > 0 && (
            <div
              onClick={() => setPlExpanded(v => !v)}
              style={{
                background: 'var(--card-bg)', border: '1px solid var(--border)',
                borderRadius: 16, marginBottom: '1.5rem',
                cursor: 'pointer', overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}
            >
              {/* Header sempre visibile */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>
                      P&L Realizzato (totale)
                    </span>
                    <span style={{ fontSize: '1.35rem', fontWeight: 700, color: color(plData.total) }}>
                      {sign(plData.total)}{eur(plData.total)}
                    </span>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>
                      YTD {new Date().getFullYear()}
                    </span>
                    <span style={{ fontSize: '1.35rem', fontWeight: 700, color: color(plData.ytdTotal) }}>
                      {sign(plData.ytdTotal)}{eur(plData.ytdTotal)}
                    </span>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>
                      Operazioni chiuse
                    </span>
                    <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-1)' }}>
                      {plData.operations.length}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', fontSize: '0.78rem' }}>
                  <span>{plExpanded ? 'Chiudi' : 'Dettaglio operazioni'}</span>
                  {plExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Dettaglio espanso */}
              {plExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '0 1.3rem 1.2rem' }}>
                  {/* Header tabella */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 90px 100px',
                    gap: 8, padding: '0.75rem 0 0.5rem',
                    fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <span>Asset</span>
                    <span style={{ textAlign: 'right' }}>Data</span>
                    <span style={{ textAlign: 'right' }}>Quantità</span>
                    <span style={{ textAlign: 'right' }}>Prezzo vendita</span>
                    <span style={{ textAlign: 'right' }}>P. medio carico</span>
                    <span style={{ textAlign: 'right' }}>P&L</span>
                  </div>

                  {/* Righe operazioni */}
                  {plData.operations.map(op => (
                    <div
                      key={op.id}
                      onClick={e => e.stopPropagation()}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 90px 100px',
                        gap: 8, padding: '0.6rem 0',
                        borderBottom: '1px solid var(--border)',
                        fontSize: '0.82rem', alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{op.ticker}</span>
                        <span style={{ color: 'var(--text-3)', fontSize: '0.72rem', marginLeft: 6 }}>{op.name !== op.ticker ? op.name : ''}</span>
                      </div>
                      <span style={{ textAlign: 'right', color: 'var(--text-2)' }}>
                        {new Date(op.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </span>
                      <span style={{ textAlign: 'right', color: 'var(--text-2)' }}>{op.quantity.toLocaleString('it-IT', { maximumFractionDigits: 4 })}</span>
                      <span style={{ textAlign: 'right', color: 'var(--text-2)' }}>€{op.sellPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                      <span style={{ textAlign: 'right', color: 'var(--text-2)' }}>€{op.avgCostAtSale.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, color: color(op.realizedPL) }}>
                          {sign(op.realizedPL)}{eur(op.realizedPL)}
                        </span>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: color(op.pctReturn) }}>
                          {pct(op.pctReturn)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Totale */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 90px 100px',
                    gap: 8, padding: '0.75rem 0 0',
                    fontSize: '0.82rem', fontWeight: 700,
                  }}>
                    <span style={{ color: 'var(--text-3)', fontSize: '0.72rem', fontWeight: 600 }}>TOTALE</span>
                    <span /><span /><span /><span />
                    <span style={{ textAlign: 'right', color: color(plData.total) }}>
                      {sign(plData.total)}{eur(plData.total)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Cash alert (solo se negativo) ── */}
          {cashFlow && cashFlow.availableCash < -1 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: RED + '12', border: `1px solid ${RED}33`,
              borderRadius: 12, padding: '0.7rem 1rem', marginBottom: '1.5rem',
              fontSize: '0.8rem', color: RED,
            }}>
              <AlertTriangle size={15} />
              <span>
                <strong>Cash negativo {eur(cashFlow.availableCash)}</strong> — hai investito più di quanto depositato.
              </span>
            </div>
          )}

          {/* ── Portfolio Cards ── */}
          {portfolioCards.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    I tuoi portafogli
                  </span>
                  {hiddenPortfolioIds.length > 0 && (
                    <button
                      onClick={handleShowAll}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '2px 9px', borderRadius: 6,
                        background: ORANGE + '22', color: ORANGE,
                        border: `1px solid ${ORANGE}44`,
                        fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {hiddenPortfolioIds.length} nascost{hiddenPortfolioIds.length === 1 ? 'o' : 'i'} · Mostra tutti
                    </button>
                  )}
                </div>
                <a href="/portfolio-manager" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: BLUE, textDecoration: 'none', fontWeight: 500 }}>
                  Gestisci <ArrowRight size={12} />
                </a>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: 4 }}>
                {portfolioCards.map(pc => (
                  <PortfolioMiniCard
                    key={pc.id}
                    {...pc}
                    isHidden={hiddenPortfolioIds.includes(pc.id)}
                    onToggle={() => handleTogglePortfolio(pc.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Chart + Allocation ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

            {/* Chart */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)' }}>Andamento portafoglio</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['1m','3m','6m','ytd','1a','all'].map(p => (
                    <button
                      key={p}
                      onClick={() => setChartPeriod(p)}
                      style={{
                        padding: '3px 9px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                        background: chartPeriod === p ? BLUE : 'transparent',
                        color: chartPeriod === p ? '#fff' : 'var(--text-3)',
                        border: chartPeriod === p ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={filteredChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={BLUE}  stopOpacity={0.25} />
                      <stop offset="95%" stopColor={BLUE}  stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gVer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={GREEN} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v, name) => [eur(v), name === 'value' ? 'Valore' : 'Versato']}
                  />
                  <Area type="monotone" dataKey="value"   stroke={BLUE}  strokeWidth={2} fill="url(#gVal)" name="value" />
                  <Area type="monotone" dataKey="versato" stroke={GREEN} strokeWidth={2} fill="url(#gVer)" name="versato" />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-3)' }}>
                  <div style={{ width: 10, height: 2, background: BLUE, borderRadius: 1 }} />
                  Valore portafoglio
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-3)' }}>
                  <div style={{ width: 10, height: 2, background: GREEN, borderRadius: 1 }} />
                  Importo versato
                </div>
              </div>
            </div>

            {/* Allocation */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 0 }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: '1rem', display: 'block' }}>Allocazione</span>

              {/* Macro allocation */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {allocationData.map((item, i) => (
                  <div key={item.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', fontWeight: 500 }}>{item.name}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-1)', fontWeight: 600 }}>{item.percentage}%</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3 }}>
                      <div style={{ width: item.percentage + '%', height: '100%', background: item.color || ALLOC_COLORS[i % ALLOC_COLORS.length], borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Sub-allocation top 5 */}
              {subAllocationData.length > 0 && (
                <>
                  <div style={{ height: 1, background: 'var(--border)', margin: '1rem 0 0.8rem' }} />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem', display: 'block' }}>
                    Sotto-categorie
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {subAllocationData.slice(0, 6).map((item, i) => (
                      <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', maxWidth: '72%' }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color || ALLOC_COLORS[i % ALLOC_COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontSize: '0.73rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                        </span>
                        <span style={{ fontSize: '0.73rem', color: 'var(--text-1)', fontWeight: 600 }}>{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Top Holdings ── */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)' }}>Top Holdings</span>
              <a href="/portfolio" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: BLUE, textDecoration: 'none', fontWeight: 500 }}>
                Tutti <ArrowRight size={12} />
              </a>
            </div>

            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px 70px 60px', gap: 8, padding: '0 0 6px', borderBottom: '1px solid var(--border)', marginBottom: 2 }}>
              {['Titolo', 'Valore', 'P&L €', 'ROI', '1d%'].map(h => (
                <span key={h} style={{ fontSize: '0.67rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: h !== 'Titolo' ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>

            {portfolio.filter(h => !h.isCash).slice(0, 8).map(h => (
              <div key={h.holdingKey ?? h.ticker} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px 70px 60px', gap: 8, padding: '9px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}><Blur>{h.ticker}</Blur></div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                    <Blur>{h.name}</Blur>
                    {h.broker && <span style={{ marginLeft: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 3, padding: '0 4px', fontSize: '0.62rem' }}>{h.broker}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>
                  <Blur>{eur(h.marketValue, 0)}</Blur>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.82rem', fontWeight: 600, color: color(h.unrealizedPL) }}>
                  <Blur>{sign(h.unrealizedPL)}{eur(h.unrealizedPL, 0)}</Blur>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.78rem', fontWeight: 600, color: color(h.roi) }}>
                  {pct(h.roi, 1)}
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: color(h.dayChangePercent) }}>
                  {pct(h.dayChangePercent, 2)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
