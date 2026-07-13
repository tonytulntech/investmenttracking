import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { getTransactions, portfolioSnapshot } from '../services/localStorageService';
import { calculateCashFlow } from '../services/cashFlowService';
import { classifyHolding } from '../services/classificationService';
import { fetchMultipleHistoricalPrices, buildMonthlyPriceTable } from '../services/historicalPriceService';
import { fetchMultiplePrices, getNativeConversionFactor } from '../services/priceService';
import { format, parseISO, endOfMonth, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';

// ── Palette ──────────────────────────────────────────────────────────────────
const ASSET_COLORS = {
  'ETF':           '#0A84FF',
  'ETC':           '#BF5AF2',
  'ETN':           '#32ADE6',
  'Azioni':        '#FF9F0A',
  'Obbligazioni':  '#FF453A',
  'Crypto':        '#AC8E68',
  'Materie Prime': '#30D158',
  'Monetario':     '#5E5CE6',
  'Immobiliare':   '#FF6B6B',
  'Altro':         '#636366',
};
const ASSET_ORDER = ['ETF','Azioni','Obbligazioni','ETC','ETN','Crypto','Materie Prime','Monetario','Immobiliare','Altro'];
function assetColor(cat) { return ASSET_COLORS[cat] || '#636366'; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function eur(n, dec = 0) {
  return '€' + Math.abs(n).toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function sign(n) { return n >= 0 ? '+' : '−'; }
function clr(n)  { return n >= 0 ? '#30D158' : '#FF453A'; }
function fmtMonth(key) {
  const [y, m] = key.split('-');
  return format(parseISO(`${key}-01`), 'MMM yy', { locale: it });
}

// ── Sparkline per tooltip ticker ──────────────────────────────────────────────
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

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function DistribTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', minWidth: 180 }}>
      <p style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 8, fontSize: '0.82rem' }}>{label}</p>
      {payload.slice().reverse().map(p => p.value > 0 && (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: '0.78rem', marginBottom: 3 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-2)' }}>{p.dataKey}</span>
          </span>
          <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{eur(p.value)}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
        <span style={{ color: 'var(--text-3)' }}>Totale</span>
        <span style={{ fontWeight: 700, color: '#0A84FF' }}>{eur(total)}</span>
      </div>
    </div>
  );
}

function EvolTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', minWidth: 200 }}>
      <p style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 8, fontSize: '0.82rem' }}>{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: '0.78rem', marginBottom: 4 }}>
          <span style={{ color: p.stroke, fontWeight: 600 }}>{p.name}</span>
          <span style={{ color: 'var(--text-1)', fontWeight: 700 }}>{eur(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Patrimonio() {
  const [transactions, setTransactions]               = useState([]);
  const [loadingPrices, setLoadingPrices]             = useState(true);
  const [monthlyMarketValues, setMonthlyMarketValues] = useState({});
  const [monthlyCategoryValues, setMonthlyCategoryValues] = useState({});
  const [monthlyTickerValues, setMonthlyTickerValues] = useState({});
  const [selectedYear, setSelectedYear]               = useState('all');
  const [activeMonthKey, setActiveMonthKey]           = useState(null);
  const [peakMode, setPeakMode]                       = useState('value'); // 'value' | 'performance'
  const currentPricesRef = useRef({});
  const priceTablesRef = useRef({});

  // Ticker tooltip state
  const [tickerTooltip, setTickerTooltip] = useState(null);
  const [tooltipShowNative, setTooltipShowNative] = useState(false);
  const [tooltipPeriod, setTooltipPeriod] = useState('9M');
  const [tooltipChartData, setTooltipChartData] = useState([]);
  const [tooltipLoading, setTooltipLoading] = useState(false);
  const tooltipHideTimer = useRef(null);
  const tooltipPriceCache = useRef({});

  useEffect(() => {
    const data = getTransactions();
    setTransactions(data);
  }, []);

  // ── Fetch historical prices + compute monthly values ────────────────────────
  useEffect(() => {
    if (!transactions.length) { setLoadingPrices(false); return; }
    computeMonthlyValues();
  }, [transactions]);

  const computeMonthlyValues = async () => {
    setLoadingPrices(true);
    try {
      const assetTxs = transactions.filter(tx => !tx.isCash && tx.macroCategory !== 'Cash');
      if (!assetTxs.length) { setLoadingPrices(false); return; }

      const sorted = assetTxs.filter(tx => tx.date).sort((a, b) => new Date(a.date) - new Date(b.date));
      const firstDate = parseISO(sorted[0].date);
      const lastDate  = new Date();
      const tickers   = [...new Set(assetTxs.map(tx => tx.ticker))];

      const [historicalPricesMap, currentPrices] = await Promise.all([
        fetchMultipleHistoricalPrices(tickers, format(firstDate, 'yyyy-MM-dd'), format(lastDate, 'yyyy-MM-dd')),
        fetchMultiplePrices(tickers).catch(() => ({})),
      ]);

      currentPricesRef.current = currentPrices; // salva per portfolioSnapshot nei KPI

      const priceTables = {};
      tickers.forEach(t => { priceTables[t] = buildMonthlyPriceTable(historicalPricesMap[t] || []); });
      priceTablesRef.current = priceTables;

      // Generate all months
      const periods = new Set();
      let cur = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
      while (cur <= lastDate) { periods.add(format(cur, 'yyyy-MM')); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }
      const sortedPeriods = Array.from(periods).sort();
      const currentMonthKey = format(new Date(), 'yyyy-MM');

      const marketValues = {};
      const categoryVals = {};
      const tickerVals = {};

      sortedPeriods.forEach(monthKey => {
        const monthEnd = endOfMonth(parseISO(`${monthKey}-01`));
        const holdings = {};
        const tickerCat = {};
        const tickerName = {};

        assetTxs.filter(tx => !isAfter(parseISO(tx.date), monthEnd)).forEach(tx => {
          if (!holdings[tx.ticker]) { holdings[tx.ticker] = 0; tickerCat[tx.ticker] = tx.macroCategory || 'Altro'; tickerName[tx.ticker] = tx.name || tx.ticker; }
          holdings[tx.ticker] += tx.type === 'buy' ? tx.quantity : -tx.quantity;
        });

        let total = 0;
        const catMap = {};
        const tickerMap = {};

        Object.entries(holdings).forEach(([ticker, qty]) => {
          if (qty <= 0.00001) return;
          const pt = priceTables[ticker] || {};
          let price = pt[monthKey];

          if (!price && monthKey === currentMonthKey) price = currentPrices[ticker]?.price;
          if (!price) {
            const keys = Object.keys(pt).sort().reverse();
            for (const k of keys) { if (k <= monthKey && pt[k] > 0) { price = pt[k]; break; } }
          }
          if (!price && currentPrices[ticker]) price = currentPrices[ticker]?.price;
          if (!price) return;

          const val = qty * price;
          total += val;
          const cat = tickerCat[ticker] || 'Altro';
          catMap[cat] = (catMap[cat] || 0) + val;
          tickerMap[ticker] = { ticker, name: tickerName[ticker], cat, qty, price, value: val };
        });

        marketValues[monthKey] = total;
        categoryVals[monthKey] = catMap;
        tickerVals[monthKey] = tickerMap;
      });

      setMonthlyMarketValues(marketValues);
      setMonthlyCategoryValues(categoryVals);
      setMonthlyTickerValues(tickerVals);
    } finally {
      setLoadingPrices(false);
    }
  };

  // ── Monthly flows (deposits + net investments per asset class) ──────────────
  // "investito" = acquisti lordi − vendite: mostra il NUOVO capitale allocato
  const monthlyFlows = useMemo(() => {
    if (!transactions.length) return [];
    const map = {};

    transactions.forEach(tx => {
      if (!tx.date) return;
      const key = tx.date.slice(0, 7); // yyyy-MM
      if (!map[key]) map[key] = {
        monthKey: key,
        deposits: 0,
        invested: {},   // netto per categoria: buy - sell
        grossBuy: {},   // solo buy (per dettaglio acquisti)
        grossSell: {},  // solo sell (per trasparenza)
        purchases: [],  // lista buy individuali
        sales: [],      // lista sell individuali
      };

      const amount = (tx.quantity || 0) * (tx.price || 0);
      const isCash = tx.isCash || tx.macroCategory === 'Cash';
      const cat = tx.macroCategory || 'Altro';

      if (isCash && tx.type === 'buy') {
        map[key].deposits += amount;
      } else if (!isCash) {
        if (tx.type === 'buy') {
          const net = amount + (tx.commission || 0);
          map[key].invested[cat]  = (map[key].invested[cat]  || 0) + net;
          map[key].grossBuy[cat]  = (map[key].grossBuy[cat]  || 0) + net;
          map[key].purchases.push({ ticker: tx.ticker, name: tx.name || tx.ticker, amount: net, cat });
        } else if (tx.type === 'sell') {
          const net = amount - (tx.commission || 0);
          // sottraiamo i proventi dalla categoria venduta
          map[key].invested[cat]  = (map[key].invested[cat]  || 0) - net;
          map[key].grossSell[cat] = (map[key].grossSell[cat] || 0) + net;
          map[key].sales.push({ ticker: tx.ticker, name: tx.name || tx.ticker, amount: net, cat });
        }
      }
    });

    return Object.values(map)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .filter(m => selectedYear === 'all' || m.monthKey.startsWith(selectedYear));
  }, [transactions, selectedYear]);

  // ── Chart data: patrimonio evolution ───────────────────────────────────────
  const evolData = useMemo(() => {
    let cumDeposits = 0;
    return monthlyFlows.map(m => {
      cumDeposits += m.deposits;
      const patrimonio = monthlyMarketValues[m.monthKey] ?? null;
      return { month: fmtMonth(m.monthKey), monthKey: m.monthKey, patrimonio, versato: Math.round(cumDeposits) };
    }).filter(d => d.patrimonio != null || monthlyFlows.length < 3);
  }, [monthlyFlows, monthlyMarketValues]);

  // ── Chart data: distribution by asset class ────────────────────────────────
  const distribData = useMemo(() => {
    return monthlyFlows
      .filter(m => Object.keys(m.invested).length > 0)
      .map(m => {
        const point = { month: fmtMonth(m.monthKey), monthKey: m.monthKey };
        ASSET_ORDER.forEach(cat => { if (m.invested[cat]) point[cat] = Math.round(m.invested[cat]); });
        return point;
      });
  }, [monthlyFlows]);

  // All asset classes that appear in the data
  const activeCategories = useMemo(() => {
    const cats = new Set();
    monthlyFlows.forEach(m => Object.keys(m.invested).forEach(c => cats.add(c)));
    return ASSET_ORDER.filter(c => cats.has(c));
  }, [monthlyFlows]);

  // ── Ticker name/category map (for tooltip) ───────────────────────────────
  const tickerNameMap = useMemo(() => {
    const map = {};
    transactions.forEach(tx => {
      if (!tx.ticker) return;
      if (!map[tx.ticker]) map[tx.ticker] = { name: tx.name || tx.ticker, macroCategory: tx.macroCategory || '', microCategory: tx.microCategory || '' };
    });
    return map;
  }, [transactions]);

  // ── Tooltip: carica prezzi storici per sparkline ──────────────────────────
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

  // ── Global KPIs — usa fonti unificate ─────────────────────────────────────
  const kpis = useMemo(() => {
    // portfolioSnapshot per valori allineati a Dashboard/Portfolio
    const snap     = portfolioSnapshot(currentPricesRef.current || {});
    // calculateCashFlow per liquidità precisa (considera anche vendite e prelievi)
    const cashFlow = calculateCashFlow();

    const patrimonio    = snap.totalValue;
    const totalInvested = snap.totalInvested;          // costo delle posizioni aperte
    const rendimento    = snap.totalPL;                // unrealized + realized
    const rendimentoPct = totalInvested > 0 ? (rendimento / totalInvested) * 100 : 0;
    const totalDeposits = monthlyFlows.reduce((s, m) => s + m.deposits, 0); // per grafici
    const cash          = cashFlow?.availableCash ?? 0; // liquidità reale

    // Media mensile versata: totale depositi cash / mesi. Allineata a "Capitale Versato" (= media × mesi).
    // Traccia il ritmo di risparmio, non l'allocazione effettiva in asset.
    const totalBuys = totalDeposits;
    // Span in mesi calcolato per GIORNI dal primo acquisto asset a oggi (stessa logica della Dashboard),
    // così "Su X mesi" combacia con "X mesi investito" della Dashboard.
    let monthsSpan = 0;
    const firstAssetBuy = transactions
      .filter(tx => tx.date && tx.type === 'buy' && !tx.isCash && tx.macroCategory !== 'Cash')
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    if (firstAssetBuy) {
      const days = (new Date() - new Date(firstAssetBuy.date)) / (1000 * 60 * 60 * 24);
      const years = days / 365.25;
      monthsSpan = years < 1 ? Math.max(1, Math.round(years * 12)) : Math.max(1, Math.round(years * 12));
    }
    const avgMonthlyInvested = monthsSpan > 0 ? totalBuys / monthsSpan : 0;
    const monthsWithDeposits = monthlyFlows.filter(m => (m.deposits || 0) > 0).length;

    return { totalDeposits, totalInvested, patrimonio, rendimento, rendimentoPct, cash, avgMonthlyInvested, monthsSpan, monthsWithDeposits };
  }, [monthlyFlows, monthlyMarketValues]);

  // ── Qty posseduta a inizio di ogni mese, per ticker ─────────────────────────
  // Se <= 0 e nel mese c'è un buy → il titolo è "nuovo" in portafoglio quel mese
  // (comprende debutti veri e rientri dopo vendita totale).
  const monthEntryQtyByTicker = useMemo(() => {
    const result = {}; // key `${monthKey}::${ticker}` -> qty a inizio mese
    const running = {};
    const sorted = [...transactions]
      .filter(tx => tx.date && !tx.isCash && tx.macroCategory !== 'Cash')
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.forEach(tx => {
      const mk = tx.date.slice(0, 7);
      const key = `${mk}::${tx.ticker}`;
      if (!(key in result)) result[key] = running[tx.ticker] || 0;
      running[tx.ticker] = (running[tx.ticker] || 0) + (tx.type === 'buy' ? tx.quantity : -tx.quantity);
    });
    return result;
  }, [transactions]);

  const isNewInMonth = (monthKey, ticker) =>
    (monthEntryQtyByTicker[`${monthKey}::${ticker}`] ?? 0) <= 0.00001;

  // ── Selected month detail ──────────────────────────────────────────────────
  const selectedFlows = useMemo(() => {
    if (!activeMonthKey) {
      // Default: most recent month with purchases
      const last = [...monthlyFlows].reverse().find(m => m.purchases.length > 0);
      return last || null;
    }
    return monthlyFlows.find(m => m.monthKey === activeMonthKey) || null;
  }, [monthlyFlows, activeMonthKey]);

  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(tx => tx.date?.slice(0, 4)).filter(Boolean));
    return ['all', ...Array.from(years).sort().reverse()];
  }, [transactions]);

  const cardStyle = { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' };
  const labelStyle = { fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Diario Finanziario</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', margin: '4px 0 0' }}>Dove va il tuo capitale ogni mese</p>
        </div>
        {/* Year filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {availableYears.map(y => (
            <button key={y} onClick={() => { setSelectedYear(y); setActiveMonthKey(null); }}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                background: selectedYear === y ? '#0A84FF' : 'var(--surface-2)',
                color: selectedYear === y ? '#fff' : 'var(--text-2)',
                transition: 'background 0.15s',
              }}>{y === 'all' ? 'Tutto' : y}</button>
          ))}
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { label: 'Patrimonio Attuale', value: eur(kpis.patrimonio), color: '#0A84FF', sub: 'Valore di mercato' },
          { label: 'Capitale Versato', value: eur(kpis.totalDeposits), color: 'var(--text-1)', sub: 'Depositi totali' },
          { label: 'Media Mensile Versata', value: eur(kpis.avgMonthlyInvested), color: '#30D158', sub: `Su ${kpis.monthsSpan} ${kpis.monthsSpan === 1 ? 'mese' : 'mesi'} · versato in ${kpis.monthsWithDeposits}` },
          { label: 'Rendimento', value: `${sign(kpis.rendimento)}${eur(kpis.rendimento)}`, color: clr(kpis.rendimento), sub: `${sign(kpis.rendimentoPct)}${kpis.rendimentoPct.toFixed(2)}% sul capitale` },
          { label: 'Cash Disponibile', value: eur(kpis.cash), color: kpis.cash >= 0 ? 'var(--text-1)' : '#FF453A', sub: 'Depositi non investiti' },
        ].map(k => (
          <div key={k.label} style={cardStyle}>
            <p style={labelStyle}>{k.label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: k.color, margin: '6px 0 4px' }}>{k.value}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Evoluzione Patrimonio ── */}
      {!loadingPrices && evolData.length > 1 && (() => {
        const peakPoint = evolData.reduce(
          (max, d) => (d.patrimonio ?? -Infinity) > (max?.patrimonio ?? -Infinity) ? d : max,
          null
        );
        return (
        <div style={cardStyle}>
          <p style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>Evoluzione Patrimonio</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 20 }}>
            Patrimonio a valore di mercato <span style={{ color: '#0A84FF' }}>●</span> vs Capitale versato <span style={{ color: '#FF9F0A' }}>●</span>
            {peakPoint && (
              <> · Massimo <span style={{ color: '#30D158', fontWeight: 700 }}>{eur(peakPoint.patrimonio)}</span> a {peakPoint.month}</>
            )}
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={evolData} margin={{ top: 30, right: 24, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0A84FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradVers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF9F0A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#FF9F0A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-3)" style={{ fontSize: 11 }} tick={{ fill: 'var(--text-3)' }} />
              <YAxis stroke="var(--text-3)" style={{ fontSize: 11 }} tick={{ fill: 'var(--text-3)' }}
                tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} width={54} />
              <Tooltip content={<EvolTooltip />} />
              <Area type="monotone" dataKey="versato" name="Capitale versato" stroke="#FF9F0A" strokeWidth={2} fill="url(#gradVers)" dot={false} />
              <Area
                type="monotone"
                dataKey="patrimonio"
                name="Patrimonio"
                stroke="#0A84FF"
                strokeWidth={2.5}
                fill="url(#gradPat)"
                connectNulls
                dot={(props) => {
                  const { cx, cy, payload, index } = props;
                  if (!peakPoint || payload?.monthKey !== peakPoint.monthKey || cx == null || cy == null) {
                    return <g key={`dot-${index}`} />;
                  }
                  return (
                    <g key={`peak-${index}`}>
                      <circle cx={cx} cy={cy} r={9} fill="#30D158" fillOpacity={0.2} />
                      <circle cx={cx} cy={cy} r={5} fill="#30D158" stroke="var(--card-bg)" strokeWidth={2} />
                      <text x={cx} y={cy - 14} textAnchor="middle" fontSize={10} fontWeight={800} fill="#30D158" style={{ letterSpacing: '0.05em' }}>
                        MAX {eur(peakPoint.patrimonio)}
                      </text>
                    </g>
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        );
      })()}

      {/* ── Composizione al picco patrimonio ── */}
      {!loadingPrices && (() => {
        // Versato cumulato per monthKey (per calcolare la performance % ad ogni mese)
        const cumDeposits = {};
        let running = 0;
        [...monthlyFlows].sort((a, b) => a.monthKey.localeCompare(b.monthKey)).forEach(m => {
          running += m.deposits || 0;
          cumDeposits[m.monthKey] = running;
        });

        // Picco Patrimonio (€)
        let peakValueKey = null, peakValueAmt = -Infinity;
        Object.entries(monthlyMarketValues).forEach(([k, v]) => {
          if (v > peakValueAmt) { peakValueAmt = v; peakValueKey = k; }
        });

        // Picco Performance (%): (patrimonio - versato) / versato, sui mesi con versato > 0
        let peakPerfKey = null, peakPerfPct = -Infinity;
        Object.entries(monthlyMarketValues).forEach(([k, v]) => {
          const inv = cumDeposits[k] || 0;
          if (inv <= 0) return;
          const pct = ((v - inv) / inv) * 100;
          if (pct > peakPerfPct) { peakPerfPct = pct; peakPerfKey = k; }
        });

        const peakKey = peakMode === 'value' ? peakValueKey : peakPerfKey;
        const peakVal = monthlyMarketValues[peakKey] || 0;
        if (!peakKey || peakVal <= 0) return null;
        const tickers = Object.values(monthlyTickerValues[peakKey] || {});
        if (!tickers.length) return null;

        const cats = monthlyCategoryValues[peakKey] || {};
        const sortedCats = Object.entries(cats).sort(([, a], [, b]) => b - a);
        const topTickers = [...tickers].sort((a, b) => b.value - a.value).slice(0, 6);
        const peakLabel = format(parseISO(`${peakKey}-01`), 'MMMM yyyy', { locale: it });
        const currentMonthKey = format(new Date(), 'yyyy-MM');
        const isCurrentMonth = peakKey === currentMonthKey;
        const investedAtPeak = cumDeposits[peakKey] || 0;
        const perfAtPeak = investedAtPeak > 0 ? ((peakVal - investedAtPeak) / investedAtPeak) * 100 : 0;

        // Distanza attuale dai picchi
        const currentValueNow = kpis.patrimonio || 0;
        const currentInvestedNow = kpis.totalDeposits || 0;
        const currentPerfNow = currentInvestedNow > 0 ? ((currentValueNow - currentInvestedNow) / currentInvestedNow) * 100 : 0;
        const valueGapAbs = currentValueNow - peakValueAmt;
        const valueGapPct = peakValueAmt > 0 ? (valueGapAbs / peakValueAmt) * 100 : 0;
        const perfGapPP = currentPerfNow - peakPerfPct; // in punti percentuali
        const isAtValuePeak = peakValueKey === currentMonthKey;
        const isAtPerfPeak = peakPerfKey === currentMonthKey;

        return (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-1)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  🏔 Come hai raggiunto il picco
                  {isCurrentMonth && (
                    <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#0B2E14', background: '#30D158', padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Sei qui
                    </span>
                  )}
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', margin: '3px 0 0', maxWidth: 460 }}>
                  {peakMode === 'value'
                    ? 'Picco in valore assoluto — include l\'effetto dei versamenti. Cresce quasi sempre col mese corrente.'
                    : 'Picco di performance netta sul capitale versato — esclude l\'effetto dei versamenti. Il vero massimo del portafoglio.'}
                </p>
              </div>
              {/* Toggle */}
              <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', padding: 3, borderRadius: 8 }}>
                {[
                  { id: 'value', label: 'Patrimonio €' },
                  { id: 'performance', label: 'Performance %' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setPeakMode(t.id)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                      background: peakMode === t.id ? 'var(--card-bg)' : 'transparent',
                      color: peakMode === t.id ? 'var(--text-1)' : 'var(--text-3)',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Riga metriche picco */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10 }}>
              <div>
                <p style={labelStyle}>Mese del picco</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', margin: '2px 0 0' }}>{peakLabel}</p>
              </div>
              <div>
                <p style={labelStyle}>Patrimonio</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: peakMode === 'value' ? '#30D158' : 'var(--text-1)', margin: '2px 0 0' }}>{eur(peakVal)}</p>
              </div>
              <div>
                <p style={labelStyle}>Performance netta</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: peakMode === 'performance' ? '#30D158' : (perfAtPeak >= 0 ? 'var(--text-1)' : '#FF453A'), margin: '2px 0 0' }}>
                  {perfAtPeak >= 0 ? '+' : ''}{perfAtPeak.toFixed(2)}%
                </p>
                <p style={{ fontSize: '0.62rem', color: 'var(--text-3)', margin: '2px 0 0' }}>su {eur(investedAtPeak)} versati</p>
              </div>
            </div>

            {/* Distanza attuale dal picco */}
            {(peakMode === 'value' ? !isAtValuePeak : !isAtPerfPeak) && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                marginBottom: 18, padding: '10px 14px',
                background: '#FF453A14', border: '1px solid #FF453A33', borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.85rem' }}>📉</span>
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-2)', margin: 0, fontWeight: 600 }}>
                      {peakMode === 'value' ? 'Distanza dal picco patrimonio' : 'Distanza dal picco performance'}
                    </p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', margin: '2px 0 0' }}>
                      {peakMode === 'value'
                        ? `Ora: ${eur(currentValueNow)}`
                        : `Ora: ${currentPerfNow >= 0 ? '+' : ''}${currentPerfNow.toFixed(2)}% netto`}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {peakMode === 'value' ? (
                    <>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FF453A', margin: 0 }}>
                        {valueGapPct.toFixed(2)}%
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', margin: '2px 0 0' }}>
                        −{eur(Math.abs(valueGapAbs))} dal massimo
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FF453A', margin: 0 }}>
                        {perfGapPP.toFixed(2)} pp
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', margin: '2px 0 0' }}>
                        dal picco di +{peakPerfPct.toFixed(2)}%
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Barra stacked macro categorie */}
            <div style={{ height: 12, borderRadius: 6, overflow: 'hidden', display: 'flex', marginBottom: 8, background: 'var(--border)' }}>
              {sortedCats.map(([cat, v]) => {
                const pct = (v / peakVal) * 100;
                return <div key={cat} title={`${cat}: ${eur(v)} (${pct.toFixed(1)}%)`} style={{ width: `${pct}%`, background: assetColor(cat) }} />;
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              {sortedCats.map(([cat, v]) => (
                <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-2)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: assetColor(cat) }} />
                  {cat} <span style={{ color: 'var(--text-3)' }}>· {eur(v)} ({((v / peakVal) * 100).toFixed(0)}%)</span>
                </span>
              ))}
            </div>

            {/* Top titoli contributori */}
            <p style={{ ...labelStyle, marginBottom: 8 }}>Titoli che hanno formato il picco · Top {topTickers.length}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 70px', gap: 8, padding: '0 4px 6px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
              {['Strumento', 'Quantità', 'Valore', '% picco'].map(h => (
                <span key={h} style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: h === 'Strumento' ? 'left' : 'right' }}>{h}</span>
              ))}
            </div>
            {topTickers.map((t, i) => {
              const cls = classifyHolding({ ticker: t.ticker, macroCategory: t.cat });
              const pct = (t.value / peakVal) * 100;
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 70px', gap: 8, padding: '8px 4px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cls.color, flexShrink: 0 }} />
                    <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span
                        style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)', cursor: 'default' }}
                        onMouseEnter={(e) => {
                          if (tooltipHideTimer.current) clearTimeout(tooltipHideTimer.current);
                          const rect = e.currentTarget.getBoundingClientRect();
                          const info = tickerNameMap[t.ticker] || {};
                          setTickerTooltip({ ticker: t.ticker, name: info.name || t.ticker, macroCategory: info.macroCategory || t.cat, microCategory: info.microCategory || '', currentPrice: currentPricesRef.current[t.ticker]?.price, anchorRight: rect.right, anchorTop: rect.top });
                        }}
                        onMouseLeave={() => { tooltipHideTimer.current = setTimeout(() => setTickerTooltip(null), 250); }}
                      >{t.ticker}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{cls.microLabel}</span>
                    </div>
                  </div>
                  <span style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-2)' }}>{t.qty.toLocaleString('it-IT', { maximumFractionDigits: 4 })}</span>
                  <span style={{ textAlign: 'right', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>{eur(t.value)}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#30D158' }}>{pct.toFixed(1)}%</span>
                    <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 2 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: cls.color, width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {tickers.length > topTickers.length && (
              <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 8 }}>
                + altri {tickers.length - topTickers.length} titoli per {eur(peakVal - topTickers.reduce((s, t) => s + t.value, 0))}
              </p>
            )}
          </div>
        );
      })()}

      {/* ── Dove è andata la liquidità ── */}
      {distribData.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>Dove è andata la liquidità</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Nuovo capitale investito ogni mese per asset class</p>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {activeCategories.map(cat => (
                <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-2)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: assetColor(cat), flexShrink: 0 }} />
                  {cat}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={distribData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
              onClick={e => e?.activePayload && setActiveMonthKey(e.activePayload[0]?.payload?.monthKey)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--text-3)" style={{ fontSize: 11 }} tick={{ fill: 'var(--text-3)' }} />
              <YAxis stroke="var(--text-3)" style={{ fontSize: 11 }} tick={{ fill: 'var(--text-3)' }}
                tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} width={54} />
              <Tooltip content={<DistribTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              {activeCategories.map(cat => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={assetColor(cat)} radius={cat === activeCategories[activeCategories.length - 1] ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 8, textAlign: 'center' }}>
            Clicca su una barra per vedere il dettaglio acquisti del mese
          </p>
        </div>
      )}

      {/* ── Dettaglio mese — con navigazione calendario ── */}
      {monthlyFlows.length > 0 && (() => {
        // Mesi con almeno un acquisto
        const monthsWithData = monthlyFlows.filter(m => m.purchases.length > 0 || m.deposits > 0);
        if (!monthsWithData.length) return null;

        const currentIdx = activeMonthKey
          ? monthsWithData.findIndex(m => m.monthKey === activeMonthKey)
          : monthsWithData.length - 1;
        const safeIdx = currentIdx === -1 ? monthsWithData.length - 1 : currentIdx;
        const flows = monthsWithData[safeIdx];
        if (!flows) return null;

        const goTo = (idx) => setActiveMonthKey(monthsWithData[idx]?.monthKey || null);
        const totalMonth = Object.values(flows.invested).reduce((a, b) => a + b, 0);
        // Totale acquisti lordi del mese (per calcolare le % sugli strumenti)
        const grossBuyTotal = flows.purchases.reduce((s, p) => s + p.amount, 0);

        // Nuovi ingressi del mese: dedup per ticker (un ticker comprato più volte conta 1)
        const newTickersSet = new Set(
          flows.purchases.filter(p => isNewInMonth(flows.monthKey, p.ticker)).map(p => p.ticker)
        );
        const newInvestedTotal = flows.purchases
          .filter(p => newTickersSet.has(p.ticker))
          .reduce((s, p) => s + p.amount, 0);

        // Raggruppa acquisti per MICRO-categoria derivata (globale/settoriale/emergenti…)
        const byCat = {};
        flows.purchases.forEach(p => {
          const cls = classifyHolding({ ticker: p.ticker, macroCategory: p.cat });
          const label = cls.microLabel;
          if (!byCat[label]) byCat[label] = { count: 0, total: 0, color: cls.color };
          byCat[label].count++;
          byCat[label].total += p.amount;
        });

        return (
          <div style={cardStyle}>
            {/* Navigazione mese */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => safeIdx > 0 && goTo(safeIdx - 1)}
                  disabled={safeIdx === 0}
                  style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: safeIdx === 0 ? 'default' : 'pointer', opacity: safeIdx === 0 ? 0.4 : 1, fontSize: '0.9rem' }}>
                  ‹
                </button>
                <div style={{ textAlign: 'center', minWidth: 140 }}>
                  <p style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '1rem', margin: 0 }}>
                    {format(parseISO(`${flows.monthKey}-01`), 'MMMM yyyy', { locale: it })}
                  </p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', margin: '2px 0 0' }}>
                    {safeIdx + 1} / {monthsWithData.length} mesi
                  </p>
                </div>
                <button
                  onClick={() => safeIdx < monthsWithData.length - 1 && goTo(safeIdx + 1)}
                  disabled={safeIdx === monthsWithData.length - 1}
                  style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)', cursor: safeIdx === monthsWithData.length - 1 ? 'default' : 'pointer', opacity: safeIdx === monthsWithData.length - 1 ? 0.4 : 1, fontSize: '0.9rem' }}>
                  ›
                </button>
              </div>

              {/* KPI mese */}
              <div style={{ display: 'flex', gap: 16 }}>
                {flows.deposits > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={labelStyle}>Versato</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#30D158', margin: 0 }}>{eur(flows.deposits)}</p>
                  </div>
                )}
                {totalMonth > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={labelStyle}>Investito (netto)</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0A84FF', margin: 0 }}>{eur(totalMonth)}</p>
                  </div>
                )}
                {flows.sales?.length > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={labelStyle}>Venduto</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FF453A', margin: 0 }}>
                      {eur(Object.values(flows.grossSell || {}).reduce((a, b) => a + b, 0))}
                    </p>
                  </div>
                )}
                {newTickersSet.size > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={labelStyle}>Nuovi ingressi</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#30D158', margin: 0, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#30D158', boxShadow: '0 0 8px #30D158' }} />
                      {newTickersSet.size} {newTickersSet.size === 1 ? 'titolo' : 'titoli'}
                    </p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', margin: '2px 0 0' }}>{eur(newInvestedTotal)} investiti</p>
                  </div>
                )}
              </div>
            </div>

            {/* Breakdown per MICRO-categoria derivata */}
            {Object.keys(byCat).length > 0 && (
              <>
                <p style={{ ...labelStyle, marginBottom: 10 }}>Dove è andato il capitale (per categoria)</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 20 }}>
                  {Object.entries(byCat)
                    .sort(([, a], [, b]) => b.total - a.total)
                    .map(([cat, { count, total, color }]) => {
                      const pct = totalMonth > 0 ? (total / totalMonth) * 100 : 0;
                      const isNeg = total < 0;
                      const c = isNeg ? '#FF453A' : (color || '#0A84FF');
                      return (
                        <div key={cat} style={{
                          background: c + '14', border: `1px solid ${c}44`,
                          borderRadius: 12, padding: '12px 14px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-1)' }}>{cat}</span>
                            <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-3)' }}>{count} op.</span>
                          </div>
                          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 2, background: c, width: `${Math.min(Math.abs(pct), 100)}%`, transition: 'width 0.4s' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: c }}>
                              {isNeg ? '−' : ''}{eur(Math.abs(total))}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)' }}>
                              {Math.abs(pct).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            {/* Dettaglio strumenti acquistati nel mese */}
            {flows.purchases.length > 0 && (
              <>
                <p style={{ ...labelStyle, marginBottom: 8 }}>In cosa hai investito — {flows.purchases.length} {flows.purchases.length === 1 ? 'strumento' : 'strumenti'}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px', gap: 8, padding: '0 4px 6px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                  {['Strumento', 'Importo', '% mese'].map(h => (
                    <span key={h} style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: h === 'Strumento' ? 'left' : 'right' }}>{h}</span>
                  ))}
                </div>
                {[...flows.purchases]
                  .sort((a, b) => {
                    const na = newTickersSet.has(a.ticker) ? 1 : 0;
                    const nb = newTickersSet.has(b.ticker) ? 1 : 0;
                    if (na !== nb) return nb - na; // nuovi prima
                    return b.amount - a.amount;
                  })
                  .map((p, i) => {
                    const cls = classifyHolding({ ticker: p.ticker, macroCategory: p.cat });
                    const pct = grossBuyTotal > 0 ? (p.amount / grossBuyTotal) * 100 : 0;
                    const isNew = newTickersSet.has(p.ticker);
                    return (
                      <div key={i} style={{
                        display: 'grid', gridTemplateColumns: '1fr 90px 70px', gap: 8,
                        padding: '8px 4px 8px 10px', borderBottom: '1px solid var(--border)', alignItems: 'center',
                        borderLeft: isNew ? '3px solid #30D158' : '3px solid transparent',
                        background: isNew ? 'linear-gradient(90deg, #30D15818 0%, transparent 40%)' : 'transparent',
                        marginLeft: isNew ? -3 : 0,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cls.color, flexShrink: 0 }} />
                          <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span
                              style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)', cursor: 'default' }}
                              onMouseEnter={(e) => {
                                if (tooltipHideTimer.current) clearTimeout(tooltipHideTimer.current);
                                const rect = e.currentTarget.getBoundingClientRect();
                                const info = tickerNameMap[p.ticker] || {};
                                setTickerTooltip({ ticker: p.ticker, name: info.name || p.name || p.ticker, macroCategory: info.macroCategory || p.cat, microCategory: info.microCategory || '', currentPrice: currentPricesRef.current[p.ticker]?.price, anchorRight: rect.right, anchorTop: rect.top });
                              }}
                              onMouseLeave={() => { tooltipHideTimer.current = setTimeout(() => setTickerTooltip(null), 250); }}
                            >{p.ticker}</span>
                            {isNew && (
                              <span style={{
                                fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.06em',
                                color: '#0B2E14', background: '#30D158', padding: '2px 6px',
                                borderRadius: 4, textTransform: 'uppercase',
                                boxShadow: '0 0 8px rgba(48,209,88,0.5)',
                              }}>NUOVO</span>
                            )}
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{cls.microLabel}</span>
                          </div>
                        </div>
                        <span style={{ textAlign: 'right', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>{eur(p.amount)}</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0A84FF' }}>{pct.toFixed(1)}%</span>
                          <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 2 }}>
                            <div style={{ height: '100%', borderRadius: 2, background: cls.color, width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {/* Riga liquidità caricata */}
                {flows.deposits > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: '10px 12px', background: '#30D15810', border: '1px solid #30D15833', borderRadius: 10 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      💵 Liquidità caricata questo mese
                    </span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#30D158' }}>{eur(flows.deposits)}</span>
                  </div>
                )}
                {/* Quota liquidità non investita */}
                {flows.deposits > grossBuyTotal + 1 && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 8 }}>
                    Di {eur(flows.deposits)} versati hai investito {eur(grossBuyTotal)} ({((grossBuyTotal / flows.deposits) * 100).toFixed(0)}%),
                    restano {eur(flows.deposits - grossBuyTotal)} in liquidità.
                  </p>
                )}
              </>
            )}

            {/* Selettore rapido mesi recenti */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', alignSelf: 'center', marginRight: 4 }}>Vai a:</span>
              {monthsWithData.slice(-8).map((m, i) => (
                <button
                  key={m.monthKey}
                  onClick={() => setActiveMonthKey(m.monthKey)}
                  style={{
                    padding: '3px 9px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600,
                    cursor: 'pointer', border: 'none',
                    background: m.monthKey === flows.monthKey ? '#0A84FF' : 'var(--surface-2)',
                    color: m.monthKey === flows.monthKey ? '#fff' : 'var(--text-3)',
                  }}>
                  {format(parseISO(`${m.monthKey}-01`), 'MMM yy', { locale: it })}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Riepilogo annuale ── */}
      {monthlyFlows.length > 0 && (
        <div style={cardStyle}>
          <p style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 }}>Riepilogo per Anno</p>
          <div style={{ overflowX: 'auto' }}>
            {(() => {
              // Group by year
              const byYear = {};
              monthlyFlows.forEach(m => {
                const y = m.monthKey.slice(0, 4);
                if (!byYear[y]) byYear[y] = { deposits: 0, invested: {}, months: 0 };
                byYear[y].deposits += m.deposits;
                byYear[y].months += 1;
                Object.entries(m.invested).forEach(([cat, v]) => {
                  byYear[y].invested[cat] = (byYear[y].invested[cat] || 0) + v;
                });
              });
              return Object.entries(byYear).sort(([a], [b]) => b.localeCompare(a)).map(([year, d]) => {
                const totalInv = Object.values(d.invested).reduce((s, v) => s + v, 0);
                return (
                  <div key={year} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', minWidth: 48 }}>{year}</span>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                      <div>
                        <p style={labelStyle}>Versato</p>
                        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#30D158' }}>{eur(d.deposits)}</p>
                      </div>
                      <div>
                        <p style={labelStyle}>Investito</p>
                        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0A84FF' }}>{eur(totalInv)}</p>
                      </div>
                    </div>
                    {/* Mini bar per categoria */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 200 }}>
                      {Object.entries(d.invested).sort(([, a], [, b]) => b - a).map(([cat, v]) => (
                        <span key={cat} style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: assetColor(cat) + '18', border: `1px solid ${assetColor(cat)}33`,
                          borderRadius: 8, padding: '3px 8px', fontSize: '0.72rem',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: assetColor(cat) }} />
                          <span style={{ color: 'var(--text-2)' }}>{cat}</span>
                          <span style={{ fontWeight: 700, color: assetColor(cat) }}>{eur(v)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* ── Tabella comparativa mensile ── */}
      {!loadingPrices && monthlyFlows.length > 0 && (() => {
        const allCats = activeCategories;
        const rows = monthlyFlows.slice().reverse(); // dal più recente
        const totalInvestedAll = monthlyFlows.reduce((s, m) => s + Object.values(m.invested).reduce((a, b) => a + b, 0), 0);

        return (
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Analisi Flussi Mensili</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
                Flussi netti per asset class (acquisti − vendite). <span style={{ color: '#FF453A' }}>Rosso</span> = disinvestimento netto nel mese.
              </p>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-3)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--surface-2)', zIndex: 1 }}>Mese</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#30D158', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Versato</th>
                    {allCats.map(cat => (
                      <th key={cat} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: assetColor(cat), fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: assetColor(cat), flexShrink: 0 }} />
                          {cat}
                        </span>
                      </th>
                    ))}
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#0A84FF', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Tot. Investito</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-3)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Patrimonio</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m, idx) => {
                    const totInv = Object.values(m.invested).reduce((s, v) => s + v, 0);
                    const patrimValue = monthlyMarketValues[m.monthKey] || 0;
                    const isCurrentMonth = m.monthKey === format(new Date(), 'yyyy-MM');
                    return (
                      <tr key={m.monthKey} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'var(--surface-2)04' }}>
                        <td style={{ padding: '9px 16px', fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: idx % 2 === 0 ? 'var(--card-bg)' : 'var(--surface-2)', zIndex: 1 }}>
                          {format(parseISO(`${m.monthKey}-01`), 'MMM yyyy', { locale: it })}
                          {isCurrentMonth && <span style={{ marginLeft: 6, fontSize: '0.6rem', color: '#FF9F0A', fontWeight: 700 }}>●</span>}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: m.deposits > 0 ? '#30D158' : 'var(--text-3)', fontWeight: m.deposits > 0 ? 600 : 400 }}>
                          {m.deposits > 0 ? eur(m.deposits) : '—'}
                        </td>
                        {allCats.map(cat => {
                          const net = m.invested[cat] || 0;
                          return (
                            <td key={cat} style={{ padding: '9px 12px', textAlign: 'right' }}>
                              {net > 0.01 ? (
                                <span style={{ color: assetColor(cat), fontWeight: 500 }}>{eur(net)}</span>
                              ) : net < -0.01 ? (
                                // vendita netta: mostra in rosso con segno −
                                <span style={{ color: '#FF453A', fontWeight: 500, fontSize: '0.72rem' }}>−{eur(-net)}</span>
                              ) : <span style={{ color: 'var(--text-3)', opacity: 0.4 }}>—</span>}
                            </td>
                          );
                        })}
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: totInv > 0 ? '#0A84FF' : 'var(--text-3)' }}>
                          {totInv > 0 ? eur(totInv) : '—'}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-1)' }}>
                          {patrimValue > 0 ? eur(patrimValue) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface-2)', fontWeight: 700 }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text-1)', fontSize: '0.75rem', position: 'sticky', left: 0, background: 'var(--surface-2)' }}>TOTALE</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#30D158' }}>
                      {eur(monthlyFlows.reduce((s, m) => s + m.deposits, 0))}
                    </td>
                    {allCats.map(cat => {
                      const tot = monthlyFlows.reduce((s, m) => s + (m.invested[cat] || 0), 0);
                      return (
                        <td key={cat} style={{ padding: '10px 12px', textAlign: 'right', color: assetColor(cat) }}>
                          {tot > 0 ? eur(tot) : '—'}
                        </td>
                      );
                    })}
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0A84FF' }}>{eur(totalInvestedAll)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-1)' }}>
                      {eur(kpis.patrimonio)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })()}

      {loadingPrices && (
        <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem', fontSize: '0.85rem' }}>
          Caricamento prezzi storici…
        </div>
      )}

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
        const priceData = currentPricesRef.current[tickerTooltip.ticker] || {};
        const origCcy = priceData.originalCurrency || null;
        const nativeConv = getNativeConversionFactor(origCcy);
        const canToggle = nativeConv.isForeign;
        const dispFactor = (tooltipShowNative && canToggle) ? nativeConv.factor : 1;
        const dispSymbol = (tooltipShowNative && canToggle) ? nativeConv.symbol : '€';

        const fmtP = (v) => {
          const n = (v * dispFactor).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          if (dispSymbol === 'p') return `${n}p`;
          return `${dispSymbol}${n}`;
        };
        const fmtPraw = (v) => fmtP(v / dispFactor);

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
                {insuffData && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, padding: '4px 8px', borderRadius: 6, background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.3)' }}>
                    <span style={{ fontSize: '0.65rem', color: '#FF9F0A' }}>
                      Dati dal {oldestKey} · solo {tooltipChartData.length} mesi disponibili
                    </span>
                  </div>
                )}
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
