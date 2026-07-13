/**
 * Dividendi.jsx — Dividendi & Rendita (unificato)
 * 5 tab: Panoramica · Calendario · Posizioni · Proiezioni · Analisi
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
  PieChart, Pie,
} from 'recharts';
import {
  TrendingUp, Coins, Calendar, ChevronLeft, ChevronRight,
  Check, X, Shield, Target, ListChecks, ExternalLink, Settings2,
  RefreshCw, AlertCircle, LayoutGrid, Table2, BarChart3, Info,
  PlusCircle, Trash2, FlaskConical, PieChart as PieChartIcon, ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Blur } from '../context/PrivacyContext';
import { calculatePortfolio } from '../services/localStorageService';
import {
  getAllDGMetadata, saveDGMetadata, buildDGPosition,
  portfolioKPIs, dividendCalendar, nextDividend,
  yocProjection, incomeProjection, riskScore,
  annualGross, marketValue, yieldOnCost, currentYield,
} from '../services/dividendGrowthService';
import {
  getStockDefaults, STOCK_DB,
  MOAT_RATINGS, LYNCH_CATEGORIES, FREQUENCIES, FREQUENCY_MONTHS,
} from '../data/stockDividendData';
import { getDividendInfo, getAllEtfDividendEntries } from '../data/dividendData';
import { getCachedPrices, cachePrices } from '../services/priceCache';
import { fetchMultiplePrices } from '../services/priceService';
import { getPortfolioConfig } from '../services/portfolioConfigService';

// ── Costanti ───────────────────────────────────────────────────────────────────
const MONTHS_IT      = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const MONTHS_IT_FULL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                        'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const SECTOR_COLORS = {
  'Consumer Staples':'#30D158','Consumer Discretionary':'#FF9F0A','Energy':'#FF6B35',
  'Financials':'#0A84FF','Healthcare':'#FF453A','Industrials':'#64D2FF',
  'Real Estate':'#BF5AF2','Retail':'#FFD60A','Technology':'#5AC8FA',
  'Communication':'#34C759','Utilities':'#AEAEB2','Materials':'#AC8E68',
  'ETF':'#64D2FF','Altro':'#8E8E93',
};
const MOAT_STYLE = {
  'Wide':   { bg:'#30D15820', color:'#30D158', label:'Wide ●●●' },
  'Narrow': { bg:'#FF9F0A20', color:'#FF9F0A', label:'Narrow ●●○' },
  'None':   { bg:'#FF453A20', color:'#FF453A', label:'None ●○○' },
};
const FREQ_COLOR  = { Monthly:'#30D158', Quarterly:'#0A84FF', SemiAnnual:'#FF9F0A', Annual:'#BF5AF2' };
const ASSET_COLOR = { Stock:'#0A84FF', REIT:'#30D158', BDC:'#FF9F0A', ETF:'#64D2FF' };
const DEFAULT_TAX = 0.26;

const PAGE_TABS = [
  { id:'overview',     label:'Panoramica',  icon:LayoutGrid    },
  { id:'calendar',     label:'Calendario',  icon:Calendar      },
  { id:'composition',  label:'Composizione',icon:PieChartIcon  },
  { id:'simulator',    label:'Simulatore',  icon:FlaskConical  },
  { id:'positions',    label:'Posizioni',   icon:Table2        },
  { id:'projections',  label:'Proiezioni',  icon:BarChart3     },
  { id:'analysis',     label:'Analisi',     icon:ListChecks    },
];

// ── Utility ────────────────────────────────────────────────────────────────────
const fmt2    = (n) => (n ?? 0).toLocaleString('it-IT', { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtEur  = (n) => '€ ' + fmt2(n ?? 0);
const fmtPct  = (n, d=2) => (n ?? 0).toFixed(d) + '%';
const fmtShort = (v) => {
  if (v >= 1_000_000) return `€${(v/1_000_000).toFixed(1)}M`;
  if (v >= 10_000)    return `€${(v/1_000).toFixed(0)}k`;
  if (v >= 1_000)     return `€${(v/1_000).toFixed(1)}k`;
  return `€${Math.round(v).toLocaleString('it-IT')}`;
};

// ── buildAllPositions ─────────────────────────────────────────────────────────
function buildAllPositions(nonCash, priceMap, allMeta) {
  return nonCash.map(h => {
    const currentPrice = priceMap[h.ticker]?.price ?? h.avgPrice ?? 0;
    const meta = allMeta[h.ticker?.toUpperCase()] || {};

    // ── Azioni/REIT/BDC: path corretto PRIMA del check ETF ────────────────────
    // Se macroCategory è esplicitamente un'azione, va sempre nel path stock
    const cat = (h.macroCategory || h.category || '').toLowerCase();
    const isEquity = ['azioni','reits','bdc','stock','reit'].includes(cat);
    if (isEquity) {
      const staticData = getStockDefaults(h.ticker);
      const pos = buildDGPosition(h, meta, staticData);
      pos.currentPrice = currentPrice;
      pos.isETF = false;
      return pos;
    }

    // ── ETF a distribuzione ───────────────────────────────────────────────────
    const divInfo = getDividendInfo(h.ticker);
    if (divInfo.yield > 0 || divInfo.months.length > 0) {
      const synthDPS = currentPrice * (divInfo.yield / 100);
      const freq = divInfo.months.length >= 11 ? 'Monthly'
                 : divInfo.months.length >= 5  ? 'SemiAnnual'
                 : divInfo.months.length >= 3  ? 'Quarterly' : 'Annual';
      return {
        id: h.ticker, ticker: h.ticker,
        name: meta.name || h.name || h.ticker,
        shares: h.quantity ?? 0,
        avgCostBasis: h.avgPrice ?? 0,
        currentPrice,
        sector: meta.sector || 'ETF', geography: meta.geography || 'EU',
        assetType: 'ETF',
        dividendPerShare:   meta.dividendPerShare   ?? synthDPS,
        dividendFrequency:  meta.dividendFrequency  || freq,
        paymentMonths:      meta.paymentMonths      || divInfo.months,
        dividendGrowthRate: meta.dividendGrowthRate ?? 0,
        moatRating: 'None', lynchCategory: 'SlowGrower',
        consecutiveDividendYears: 0,
        payoutRatio: 0, roe: 0, roic: 0, peRatio: 0, pegRatio: 0,
        targetWeight: 0, entryPrice: 0, notes: meta.notes || '',
        isETF: true, synthYield: divInfo.yield,
      };
    }

    // ── Azioni senza macroCategory esplicita ma con dati dividendo ────────────
    const staticData = getStockDefaults(h.ticker);
    const hasDivData = staticData || (meta.dividendPerShare > 0) || (meta.paymentMonths?.length > 0);
    if (hasDivData) {
      const pos = buildDGPosition(h, meta, staticData);
      pos.currentPrice = currentPrice;
      pos.isETF = false;
      return pos;
    }

    return null;
  }).filter(Boolean);
}

// ── Badge ──────────────────────────────────────────────────────────────────────
function Badge({ label, bg, color, size = 'sm' }) {
  return (
    <span style={{
      background: bg, color, borderRadius: 6,
      padding: size === 'sm' ? '1px 7px' : '3px 10px',
      fontSize: size === 'sm' ? '0.68rem' : '0.75rem',
      fontWeight: 600, whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}
function AssetBadge({ type }) {
  const color = ASSET_COLOR[type] || '#8E8E93';
  return <Badge label={type} bg={color + '22'} color={color} />;
}
function MoatBadge({ rating }) {
  const s = MOAT_STYLE[rating] || MOAT_STYLE.None;
  return <Badge label={s.label} bg={s.bg} color={s.color} />;
}

// ── KpiCard ────────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = '#0A84FF', icon: Icon, trend, accent }) {
  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border)',
      padding: '1.1rem 1.25rem',
      borderTop: accent ? `3px solid ${accent}` : undefined,
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.5rem' }}>
        <span style={{ fontSize:'0.68rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em' }}>
          {label}
        </span>
        {Icon && (
          <div style={{ width:28, height:28, borderRadius:9, background:`${color}22`,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon size={13} color={color} />
          </div>
        )}
      </div>
      <div style={{ fontSize:'1.45rem', fontWeight:700, color:'var(--text-1)', lineHeight:1.1 }}>
        <Blur>{value}</Blur>
      </div>
      {sub && (
        <div style={{ fontSize:'0.75rem', marginTop:'0.3rem',
          color: trend==='up' ? '#30D158' : trend==='down' ? '#FF453A' : 'var(--text-3)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── TabBar ─────────────────────────────────────────────────────────────────────
function TabBar({ tab, setTab }) {
  return (
    <div style={{
      display:'flex', gap:'0.3rem',
      background:'var(--bg)', borderRadius:14, padding:4,
      border:'1px solid var(--border)', width:'fit-content', flexWrap:'wrap',
    }}>
      {PAGE_TABS.map(t => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display:'flex', alignItems:'center', gap:'0.4rem',
            padding:'0.45rem 0.9rem', borderRadius:10,
            border:'none', cursor:'pointer', fontSize:'0.82rem',
            fontWeight: active ? 600 : 500,
            background: active ? 'var(--card-bg)' : 'transparent',
            color: active ? 'var(--text-1)' : 'var(--text-3)',
            boxShadow: active ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
            transition:'all 0.15s',
          }}>
            <Icon size={14} />{t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── NextDividendBanner ─────────────────────────────────────────────────────────
function NextDividendBanner({ positions, taxRate = 0.26 }) {
  const next = nextDividend(positions, taxRate);
  if (!next) return null;
  return (
    <div style={{
      background:'linear-gradient(135deg, rgba(10,132,255,0.08), rgba(48,209,88,0.08))',
      border:'1px solid rgba(10,132,255,0.2)', borderRadius:14,
      padding:'0.85rem 1.25rem',
      display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap',
    }}>
      <div style={{ width:32, height:32, borderRadius:10, background:'#0A84FF22',
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Calendar size={15} color="#0A84FF" />
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'0.72rem', color:'var(--text-3)', fontWeight:600,
          textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'0.1rem' }}>
          Prossimo dividendo
        </div>
        <div style={{ fontSize:'0.9rem', fontWeight:600 }}>
          {next.ticker} · {MONTHS_IT_FULL[next.month - 1]} {next.year}
        </div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:'1.1rem', fontWeight:700, color:'#30D158' }}>
          <Blur>{fmtEur(next.netAmount)} netti</Blur>
        </div>
        <div style={{ fontSize:'0.72rem', color:'var(--text-3)' }}>
          <Blur>{fmtEur(next.grossAmount)} lordi</Blur>
        </div>
      </div>
    </div>
  );
}

// ── RiskScore ──────────────────────────────────────────────────────────────────
function RiskScore({ score }) {
  const color = score >= 75 ? '#30D158' : score >= 50 ? '#FF9F0A' : '#FF453A';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem',
      background:'var(--card-bg)', borderRadius:14, border:'1px solid var(--border)',
      padding:'1rem 1.25rem' }}>
      <div style={{ position:'relative', width:52, height:52 }}>
        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r="22" fill="none" stroke="var(--border)" strokeWidth="4" />
          <circle cx="26" cy="26" r="22" fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${(score/100)*138} 138`} strokeLinecap="round"
            transform="rotate(-90 26 26)" />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
          justifyContent:'center', fontSize:'0.78rem', fontWeight:700, color }}>
          {score}
        </div>
      </div>
      <div>
        <div style={{ fontSize:'0.68rem', color:'var(--text-3)', fontWeight:600,
          textTransform:'uppercase', letterSpacing:'0.07em' }}>Score rischio</div>
        <div style={{ fontSize:'0.9rem', fontWeight:600, color }}>
          {score >= 75 ? 'Buono' : score >= 50 ? 'Attenzione' : 'Critico'}
        </div>
        <div style={{ fontSize:'0.72rem', color:'var(--text-3)' }}>/100</div>
      </div>
    </div>
  );
}

// ── ContribRow (Panoramica breakdown) ─────────────────────────────────────────
function ContribRow({ pos, totalGross, prices }) {
  const gross = annualGross(pos);
  const pct   = totalGross > 0 ? (gross / totalGross) * 100 : 0;
  const yld   = currentYield(pos, prices);
  const color = SECTOR_COLORS[pos.sector] || '#8E8E93';
  return (
    <div style={{ display:'grid', gridTemplateColumns:'90px 1fr 65px 55px 70px',
      alignItems:'center', gap:'0.65rem', padding:'0.55rem 0',
      borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-1)' }}>{pos.ticker}</span>
      <div style={{ background:'var(--bg)', borderRadius:4, height:7, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4, transition:'width 0.4s' }} />
      </div>
      <span style={{ fontSize:'0.72rem', color:'var(--text-3)', textAlign:'right' }}>
        {yld > 0 ? fmtPct(yld) : '—'}
      </span>
      <span style={{ fontSize:'0.72rem', color:'var(--text-3)', textAlign:'right' }}>{pct.toFixed(1)}%</span>
      <span style={{ fontSize:'0.78rem', color:'var(--text-2)', textAlign:'right', fontWeight:600 }}>
        <Blur>{fmtEur(gross)}/a</Blur>
      </span>
    </div>
  );
}

// ── MonthlyBarChart (Panoramica — 24 mesi) ─────────────────────────────────────
function MonthlyBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} barSize={13} margin={{ top:4, right:4, left:0, bottom:4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize:10, fill:'var(--text-3)' }} tickLine={false} axisLine={false} interval={1} />
        <YAxis tick={{ fontSize:10, fill:'var(--text-3)' }} tickFormatter={v => v>0?`€${v}`:''} axisLine={false} tickLine={false} width={42} />
        <Tooltip
          formatter={v => [fmtEur(v), 'Incasso']}
          contentStyle={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:10 }}
        />
        <Bar dataKey="income" radius={[4,4,0,0]}>
          {data.map((d, i) => (
            <Cell key={i}
              fill={d.isCurrent ? '#FF9F0A' : d.isNextYear ? 'rgba(10,132,255,0.7)' : '#30D158'}
              opacity={d.income === 0 ? 0.25 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── CalendarMonthCard (Calendario tab — DG style) ─────────────────────────────
// ── SimulatorSearch ────────────────────────────────────────────────────────────
// Dataset combinato: STOCK_DB (azioni/REIT/BDC) + ETF dividend DB
const ALL_SEARCHABLE = (() => {
  const stocks = Object.entries(STOCK_DB).map(([ticker, d]) => ({
    ticker,
    name: d.name || ticker,
    type: d.assetType || 'Stock',
    sector: d.sector || 'Azioni',
    yieldPct: 0,          // DPS/price — calcolato dopo con prezzo inserito
    dps: d.dividendPerShare || 0,
    frequency: d.dividendFrequency || 'Quarterly',
    months: d.paymentMonths || [],
    growthRate: d.dividendGrowthRate || 3,
    source: 'stock',
  }));
  const etfs = getAllEtfDividendEntries().map(e => ({
    ...e, source: 'etf', dps: 0, growthRate: 0,
  }));
  return [...stocks, ...etfs];
})();

function SimulatorSearch({ portfolioPositions, onSelect }) {
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);

  const results = useMemo(() => {
    if (query.trim().length < 1) return [];
    const q = query.toLowerCase();
    // Prima i titoli già in portafoglio, poi il DB
    const inPortfolio = (portfolioPositions || [])
      .filter(p => p.ticker?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q))
      .map(p => ({ ticker: p.ticker, name: p.name, type: p.isETF ? 'ETF' : (p.sector || 'Stock'), sector: p.sector || '', yieldPct: 0, dps: p.dividendPerShare || 0, frequency: p.dividendFrequency || 'Quarterly', months: p.paymentMonths || [], growthRate: p.dividendGrowthRate || 3, source: 'portfolio', owned: true }));
    const fromDB = ALL_SEARCHABLE
      .filter(e => e.ticker?.toLowerCase().includes(q) || e.name?.toLowerCase().includes(q))
      .filter(e => !inPortfolio.find(p => p.ticker === e.ticker));
    return [...inPortfolio, ...fromDB].slice(0, 12);
  }, [query, portfolioPositions]);

  const typeColor = (t) => ({ REIT:'#BF5AF2', BDC:'#FF9F0A', ETF:'#0A84FF', Stock:'#30D158' })[t] || '#8E8E93';

  return (
    <div style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="🔍 Cerca ticker o nome (es. ARCC, Realty, VHYL…)"
          style={{
            width:'100%', background:'var(--surface-1)', border:'1px solid #0A84FF',
            borderRadius:10, padding:'10px 14px', fontSize:'0.88rem',
            color:'var(--text-1)', outline:'none', boxSizing:'border-box',
          }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }}
            style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-3)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:100,
          background:'var(--surface-1)', border:'1px solid var(--border)', borderRadius:12,
          boxShadow:'0 8px 24px rgba(0,0,0,0.3)', maxHeight:340, overflowY:'auto',
        }}>
          {results.some(r => r.owned) && (
            <div style={{ padding:'6px 12px 4px', fontSize:'0.65rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--border)' }}>
              Nel tuo portafoglio
            </div>
          )}
          {results.filter(r => r.owned).map(r => <SearchRow key={r.ticker} r={r} typeColor={typeColor} onSelect={() => { onSelect(r); setQuery(''); setOpen(false); }} owned />)}

          {results.some(r => !r.owned) && (
            <div style={{ padding:'6px 12px 4px', fontSize:'0.65rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--border)' }}>
              Database ({results.filter(r=>!r.owned).length} risultati)
            </div>
          )}
          {results.filter(r => !r.owned).map(r => <SearchRow key={r.ticker} r={r} typeColor={typeColor} onSelect={() => { onSelect(r); setQuery(''); setOpen(false); }} />)}
        </div>
      )}
      {open && query.length > 1 && results.length === 0 && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:100,
          background:'var(--surface-1)', border:'1px solid var(--border)', borderRadius:12,
          padding:'16px', fontSize:'0.82rem', color:'var(--text-3)', textAlign:'center',
        }}>
          Nessun risultato per "{query}" — inserisci i dati manualmente
        </div>
      )}
    </div>
  );
}

function SearchRow({ r, typeColor, onSelect, owned }) {
  return (
    <div onMouseDown={onSelect} style={{
      display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
      cursor:'pointer', transition:'background 0.1s',
    }}
    onMouseEnter={e => e.currentTarget.style.background='var(--surface-2)'}
    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
      <div style={{ flexShrink:0, width:36, height:36, borderRadius:9, background:`${typeColor(r.type)}22`,
        display:'flex', alignItems:'center', justifyContent:'center', border:`1px solid ${typeColor(r.type)}44` }}>
        <span style={{ fontSize:'0.6rem', fontWeight:800, color:typeColor(r.type) }}>{r.type}</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:'0.85rem', fontWeight:700 }}>{r.ticker}</span>
          {owned && <span style={{ fontSize:'0.6rem', background:'#30D15822', color:'#30D158', padding:'1px 5px', borderRadius:4, fontWeight:600 }}>IN PORTAFOGLIO</span>}
        </div>
        <span style={{ fontSize:'0.72rem', color:'var(--text-3)', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</span>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        {r.yieldPct > 0 && <div style={{ fontSize:'0.78rem', fontWeight:600, color:'#30D158' }}>{r.yieldPct.toFixed(1)}%</div>}
        {r.dps > 0 && <div style={{ fontSize:'0.68rem', color:'var(--text-3)' }}>DPS ${r.dps.toFixed(2)}</div>}
        <div style={{ fontSize:'0.65rem', color:'var(--text-3)' }}>{r.frequency}</div>
      </div>
    </div>
  );
}

function CalendarMonthCard({ monthData, monthIndex, isSelected, onClick }) {
  const hasEvents = monthData.events.length > 0;
  return (
    <div
      onClick={hasEvents ? onClick : undefined}
      style={{
        background: isSelected ? 'var(--surface-2)' : 'var(--card-bg)',
        borderRadius: 14,
        border: `1px solid ${isSelected ? '#0A84FF' : 'var(--border)'}`,
        padding: '0.9rem', minHeight: 100,
        opacity: hasEvents ? 1 : 0.4,
        cursor: hasEvents ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
      }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.6rem' }}>
        <span style={{ fontSize:'0.75rem', fontWeight:600, color: isSelected ? '#0A84FF' : 'var(--text-2)' }}>
          {MONTHS_IT_FULL[monthIndex]}
        </span>
        {hasEvents && (
          <span style={{ fontSize:'0.72rem', fontWeight:700, color:'#30D158' }}>
            <Blur>{fmtEur(monthData.totalGross)}</Blur>
          </span>
        )}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'0.3rem' }}>
        {monthData.events.map((ev, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0,
              background: FREQ_COLOR[ev.freq] || '#8E8E93' }} />
            <span style={{ fontSize:'0.72rem', fontWeight:600 }}>{ev.pos.ticker}</span>
            <span style={{ fontSize:'0.7rem', color:'var(--text-3)', marginLeft:'auto' }}>
              <Blur>{fmtEur(ev.gross)}</Blur>
            </span>
          </div>
        ))}
        {!hasEvents && <span style={{ fontSize:'0.72rem', color:'var(--text-3)' }}>Nessun pagamento</span>}
      </div>
    </div>
  );
}

// ── MonthDetailPanel ───────────────────────────────────────────────────────────
function MonthDetailPanel({ monthData, monthIndex, year, taxRate, totalPortfolioValue, overrideTitle }) {
  const events = monthData.events;
  if (!events.length) return null;

  const totalGross = monthData.totalGross;
  const totalNet   = totalGross * (1 - taxRate);
  const monthName  = MONTHS_IT_FULL[monthIndex];

  // Sorted by gross desc
  const sorted = [...events].sort((a, b) => b.gross - a.gross);

  // Sector breakdown
  const bySector = {};
  events.forEach(ev => {
    const sec = ev.pos.sector || (ev.pos.isETF ? 'ETF' : 'Altro');
    bySector[sec] = (bySector[sec] || 0) + ev.gross;
  });
  const pieData = Object.entries(bySector)
    .sort(([,a],[,b]) => b - a)
    .map(([name, value]) => ({ name, value }));

  // Top 3
  const top3 = sorted.slice(0, 3);

  // Sector color lookup
  const sColor = (name) => SECTOR_COLORS[name] || '#8E8E93';

  return (
    <div style={{ background:'var(--card-bg)', border:'1px solid #0A84FF44', borderRadius:16, padding:'1.5rem', marginTop:8 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div>
          <p style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-1)', margin:0 }}>{overrideTitle || `${monthName} ${year}`}</p>
          <p style={{ fontSize:'0.75rem', color:'var(--text-3)', marginTop:2 }}>Incasso previsto dividendi</p>
        </div>
        <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
          {[
            { label:'Totale Lordo', value: fmtEur(totalGross), color:'#30D158' },
            { label:'Netto Stimato', value: fmtEur(totalNet), color:'#FF9F0A',
              sub: `Tassazione ${(taxRate*100).toFixed(0)}%` },
            { label:'Posizioni', value: events.length, color:'#0A84FF' },
          ].map(k => (
            <div key={k.label} style={{ textAlign:'right' }}>
              <p style={{ fontSize:'0.65rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', margin:0 }}>{k.label}</p>
              <p style={{ fontSize:'1.1rem', fontWeight:700, color:k.color, margin:'2px 0 0' }}><Blur>{k.value}</Blur></p>
              {k.sub && <p style={{ fontSize:'0.65rem', color:'var(--text-3)', margin:0 }}>{k.sub}</p>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:20, alignItems:'start' }}>

        {/* ── Pie settori ── */}
        <div>
          <p style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:12 }}>Ripartizione per settore</p>
          <PieChart width={200} height={160}>
            <Pie data={pieData} cx={95} cy={75} innerRadius={45} outerRadius={72}
              dataKey="value" paddingAngle={2}>
              {pieData.map((entry, i) => (
                <Cell key={i} fill={sColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [fmtEur(v), '']}
              contentStyle={{ background:'var(--surface-1)', border:'1px solid var(--border)', borderRadius:8, fontSize:'0.75rem' }} />
          </PieChart>
          <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:4 }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:'0.72rem' }}>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:8, height:8, borderRadius:2, background:sColor(d.name), flexShrink:0 }} />
                  <span style={{ color:'var(--text-2)' }}>{d.name}</span>
                </span>
                <span style={{ fontWeight:600, color:'var(--text-1)' }}>
                  {totalGross > 0 ? ((d.value/totalGross)*100).toFixed(0) : 0}%
                </span>
              </div>
            ))}
          </div>

          {/* Tax note — usa l'aliquota globale impostata dall'utente */}
          <div style={{ marginTop:16, padding:'10px 12px', background:'var(--surface-2)', borderRadius:10, fontSize:'0.7rem', color:'var(--text-3)', lineHeight:1.6 }}>
            <strong style={{ color:'var(--text-2)', display:'block', marginBottom:4 }}>
              Tassazione applicata: {(taxRate * 100).toFixed(0)}%
            </strong>
            {taxRate === 0 ? (
              <span style={{ display:'block' }}>Nessuna tassa impostata → <strong style={{ color:'#30D158' }}>netto = lordo</strong></span>
            ) : (
              <span style={{ display:'block' }}>
                Lordo {fmtEur(totalGross)} × {(100 - taxRate * 100).toFixed(0)}% = netto stimato
              </span>
            )}
            <span style={{ display:'block', marginTop:6, borderTop:'1px solid var(--border)', paddingTop:6 }}>
              Totale netto: <strong style={{ color: taxRate === 0 ? '#30D158' : '#FF9F0A' }}><Blur>{fmtEur(totalNet)}</Blur></strong>
            </span>
          </div>
        </div>

        {/* ── Tabella + TOP 3 ── */}
        <div>
          {/* Header tabella */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 70px 80px 60px', gap:8,
            padding:'0 0 8px', borderBottom:'1px solid var(--border)', marginBottom:4 }}>
            {['Titolo','Quote','Lordo €','% mese'].map((h,i) => (
              <span key={h} style={{ fontSize:'0.65rem', fontWeight:600, color:'var(--text-3)',
                textTransform:'uppercase', letterSpacing:'0.04em',
                textAlign: i > 0 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>

          {/* Righe */}
          {sorted.map((ev, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 70px 80px 60px', gap:8,
              padding:'7px 0', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', flexShrink:0,
                  background: FREQ_COLOR[ev.freq] || '#8E8E93' }} />
                <div>
                  <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-1)' }}>{ev.pos.ticker}</span>
                  <span style={{ fontSize:'0.68rem', color:'var(--text-3)', marginLeft:5 }}>
                    {ev.pos.isETF ? 'ETF' : (ev.pos.sector || 'Azione')}
                  </span>
                </div>
              </div>
              <span style={{ textAlign:'right', fontSize:'0.78rem', color:'var(--text-2)' }}>
                ×{(ev.pos.shares || 0).toLocaleString('it-IT', { maximumFractionDigits:3 })}
              </span>
              <span style={{ textAlign:'right', fontSize:'0.82rem', fontWeight:600, color: ev.isEstimate ? '#FF9F0A' : '#30D158' }}>
                <Blur>{fmtEur(ev.gross)}</Blur>
                {ev.isEstimate && ev.growthFactor > 1 && (
                  <span style={{ display:'block', fontSize:'0.62rem', color:'#FF9F0A88' }}>
                    ×{ev.growthFactor.toFixed(3)}
                  </span>
                )}
              </span>
              <span style={{ textAlign:'right', fontSize:'0.78rem', color:'var(--text-3)' }}>
                {totalGross > 0 ? ((ev.gross/totalGross)*100).toFixed(1) : 0}%
              </span>
            </div>
          ))}

          {/* TOP 3 */}
          {top3.length > 0 && (
            <div style={{ marginTop:16 }}>
              <p style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:10 }}>
                🏆 Top 3 per incasso
              </p>
              {top3.map((ev, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:'0.75rem', fontWeight:700, color:['#FFD60A','#AEAEB2','#AC8E68'][i], minWidth:16, textAlign:'center' }}>
                    {i+1}
                  </span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:'0.78rem', fontWeight:600 }}>{ev.pos.name || ev.pos.ticker}</span>
                      <span style={{ fontSize:'0.78rem', fontWeight:700, color:'#30D158' }}>
                        <Blur>{fmtEur(ev.gross)}</Blur>
                      </span>
                    </div>
                    <div style={{ height:5, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:3, background:'#30D158',
                        width: `${totalGross > 0 ? (ev.gross/totalGross)*100 : 0}%` }} />
                    </div>
                  </div>
                  <span style={{ fontSize:'0.72rem', color:'var(--text-3)', minWidth:32, textAlign:'right' }}>
                    {totalGross > 0 ? ((ev.gross/totalGross)*100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── YocChart ───────────────────────────────────────────────────────────────────
function YocChart({ projection, targetYoc }) {
  const crossBear = projection.find(d => d.bear >= targetYoc)?.year;
  const crossBase = projection.find(d => d.base >= targetYoc)?.year;
  const crossBull = projection.find(d => d.bull >= targetYoc)?.year;
  return (
    <div style={{ background:'var(--card-bg)', borderRadius:16, border:'1px solid var(--border)', padding:'1.5rem' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.5rem', flexWrap:'wrap', gap:'0.5rem' }}>
        <div>
          <div style={{ fontSize:'0.88rem', fontWeight:600 }}>Yield on Cost nel tempo</div>
          <div style={{ fontSize:'0.72rem', color:'var(--text-3)', marginTop:'0.15rem' }}>
            {crossBase ? `Target ${targetYoc}% raggiunto in scenario Base: ${crossBase}` : `Scenario Base non raggiunge ${targetYoc}%`}
          </div>
        </div>
        <div style={{ display:'flex', gap:'0.75rem', fontSize:'0.72rem', flexWrap:'wrap' }}>
          {[['Bear (−30%)', '#FF453A'], ['Base', '#0A84FF'], ['Bull (+30%)', '#30D158']].map(([l,c]) => (
            <span key={l} style={{ display:'flex', alignItems:'center', gap:'0.3rem' }}>
              <span style={{ width:20, height:2, background:c, display:'inline-block', borderRadius:2 }} />{l}
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={projection} margin={{ top:10, right:10, left:0, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="year" tick={{ fontSize:11, fill:'var(--text-3)' }} />
          <YAxis tick={{ fontSize:10, fill:'var(--text-3)' }} tickFormatter={v=>v+'%'} width={40} />
          <Tooltip formatter={(v,n) => [v.toFixed(2)+'%', n]}
            contentStyle={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:10 }} />
          <ReferenceLine y={targetYoc} stroke="#FF9F0A" strokeDasharray="5 4"
            label={{ value:`Target ${targetYoc}%`, fill:'#FF9F0A', fontSize:11 }} />
          <Line type="monotone" dataKey="bear" stroke="#FF453A" strokeWidth={1.5} dot={false} name="Bear" />
          <Line type="monotone" dataKey="base" stroke="#0A84FF" strokeWidth={2.5} dot={false} name="Base" />
          <Line type="monotone" dataKey="bull" stroke="#30D158" strokeWidth={1.5} dot={false} name="Bull" />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.75rem', marginTop:'1rem' }}>
        {[['Bear', crossBear, '#FF453A'], ['Base', crossBase, '#0A84FF'], ['Bull', crossBull, '#30D158']].map(([n,y,c]) => (
          <div key={n} style={{ background:'var(--bg)', borderRadius:10, padding:'0.65rem 0.85rem', textAlign:'center' }}>
            <div style={{ fontSize:'0.65rem', color:c, fontWeight:700, textTransform:'uppercase', marginBottom:'0.2rem' }}>{n}</div>
            <div style={{ fontSize:'0.95rem', fontWeight:700 }}>{y || '—'}</div>
            <div style={{ fontSize:'0.68rem', color:'var(--text-3)' }}>
              {y ? `raggiunge ${targetYoc}% YoC` : 'fuori orizzonte'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── IncomeProjectionChart ──────────────────────────────────────────────────────
function IncomeProjectionChart({ projection }) {
  return (
    <div style={{ background:'var(--card-bg)', borderRadius:16, border:'1px solid var(--border)', padding:'1.5rem' }}>
      <div style={{ fontSize:'0.88rem', fontWeight:600, marginBottom:'0.3rem' }}>Rendita mensile proiettata</div>
      <div style={{ fontSize:'0.72rem', color:'var(--text-3)', marginBottom:'1.25rem' }}>
        Scenario base · CAGR dividendo per posizione
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={projection} margin={{ top:5, right:10, left:0, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="year" tick={{ fontSize:11, fill:'var(--text-3)' }} />
          <YAxis tick={{ fontSize:10, fill:'var(--text-3)' }} tickFormatter={v=>`€${v}`} width={55} />
          <Tooltip formatter={(v,n) => [fmtEur(v)+'/mese', n]}
            contentStyle={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:10 }} />
          <Legend />
          <Line type="monotone" dataKey="monthlyGross" stroke="#0A84FF" strokeWidth={2} dot={false} name="Lordo/mese" />
          <Line type="monotone" dataKey="monthlyNet"   stroke="#30D158" strokeWidth={2} dot={false} name="Netto/mese" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Buffett-Lynch rules ────────────────────────────────────────────────────────
const RULES_DEF = [
  { id:'payout', name:'Payout Ratio', desc:'Sostenibilità dividendo ≤ 75%',
    check: p => { const v=p.payoutRatio; if(!v) return{status:'na',label:'N/D'}; if(v<=75) return{status:'pass',label:`${v}%`}; if(v<=90) return{status:'warn',label:`${v}%`}; return{status:'fail',label:`${v}%`}; } },
  { id:'history', name:'Storia Div.', desc:'Anni consecutivi ≥ 10',
    check: p => { const v=p.consecutiveDividendYears; if(!v) return{status:'na',label:'N/D'}; if(v>=25) return{status:'pass',label:`${v}a ★`}; if(v>=10) return{status:'pass',label:`${v}a`}; return{status:'fail',label:`${v}a`}; } },
  { id:'cagr', name:'Crescita Div.', desc:'CAGR 5Y ≥ 5%',
    check: p => { const v=p.dividendGrowthRate; if(!v) return{status:'na',label:'N/D'}; if(v>=5) return{status:'pass',label:`+${v}%`}; if(v>=2) return{status:'warn',label:`+${v}%`}; return{status:'fail',label:`+${v}%`}; } },
  { id:'moat', name:'Moat', desc:'Vantaggio competitivo identificabile',
    check: p => { if(p.moatRating==='Wide') return{status:'pass',label:'Wide ●●●'}; if(p.moatRating==='Narrow') return{status:'warn',label:'Narrow ●●○'}; return{status:'fail',label:'None ●○○'}; } },
  { id:'roe', name:'ROE', desc:'Return on Equity ≥ 15%',
    check: p => { const v=p.roe; if(!v) return{status:'na',label:'N/D'}; if(v>=15) return{status:'pass',label:`${v}%`}; if(v>=8) return{status:'warn',label:`${v}%`}; return{status:'fail',label:`${v}%`}; } },
  { id:'roic', name:'ROIC', desc:'Return on Inv. Capital ≥ 10%',
    check: p => { const v=p.roic; if(!v) return{status:'na',label:'N/D'}; if(v>=10) return{status:'pass',label:`${v}%`}; if(v>=6) return{status:'warn',label:`${v}%`}; return{status:'fail',label:`${v}%`}; } },
  { id:'lynch', name:'Lynch', desc:'Stalwart o FastGrower ideale',
    check: p => { const c=p.lynchCategory; if(['Stalwart','FastGrower'].includes(c)) return{status:'pass',label:c}; if(['SlowGrower','AssetPlay'].includes(c)) return{status:'warn',label:c}; return{status:'fail',label:c||'N/D'}; } },
  { id:'yoc', name:'Yield on Cost', desc:'YoC attuale ≥ 3%',
    check: p => { const yoc=p.avgCostBasis>0?(p.dividendPerShare/p.avgCostBasis)*100:0; if(yoc>=5) return{status:'pass',label:`${yoc.toFixed(1)}%`}; if(yoc>=3) return{status:'warn',label:`${yoc.toFixed(1)}%`}; return{status:'fail',label:`${yoc.toFixed(1)}%`}; } },
  { id:'weight', name:'Concentrazione', desc:'Peso portafoglio ≤ 15%',
    check: (p, prices, totalValue) => { const mv=marketValue(p,prices); const w=totalValue>0?(mv/totalValue)*100:0; if(w<=15) return{status:'pass',label:`${w.toFixed(1)}%`}; if(w<=20) return{status:'warn',label:`${w.toFixed(1)}%`}; return{status:'fail',label:`${w.toFixed(1)}%`}; } },
  { id:'ytrap', name:'Yield Trap', desc:'Yield corrente ≤ 7%',
    check: (p, prices) => { const price=prices[p.ticker]?.price; if(!price) return{status:'na',label:'N/D'}; const yld=(p.dividendPerShare/price)*100; if(yld<=6) return{status:'pass',label:`${yld.toFixed(1)}%`}; if(yld<=8) return{status:'warn',label:`${yld.toFixed(1)}%`}; return{status:'fail',label:`${yld.toFixed(1)}%`}; } },
];
const STATUS_STYLE = {
  pass:{ bg:'rgba(48,209,88,0.12)',  color:'#30D158', icon:'✓' },
  warn:{ bg:'rgba(255,159,10,0.12)', color:'#FF9F0A', icon:'⚠' },
  fail:{ bg:'rgba(255,69,58,0.12)',  color:'#FF453A', icon:'✗' },
  na:  { bg:'rgba(142,142,147,0.1)', color:'#8E8E93', icon:'—' },
};
function scorePosRules(pos, prices, totalValue) {
  const rules  = RULES_DEF.map(r => ({ ...r, result: r.check(pos, prices, totalValue) }));
  const passed = rules.filter(r => r.result.status === 'pass').length;
  const warned = rules.filter(r => r.result.status === 'warn').length;
  const failed = rules.filter(r => r.result.status === 'fail').length;
  return { rules, passed, warned, failed };
}

function AnalysisTab({ positions, prices }) {
  const totalValue = useMemo(() => positions.reduce((s,p) => s + marketValue(p,prices), 0), [positions, prices]);
  const scored = useMemo(() =>
    positions.map(pos => ({ pos, ...scorePosRules(pos, prices, totalValue) })).sort((a,b) => b.passed-a.passed),
  [positions, prices, totalValue]);
  const moatCounts = useMemo(() => {
    const c = { Wide:0, Narrow:0, None:0 };
    positions.forEach(p => { const k=p.moatRating||'None'; c[k]=(c[k]||0)+1; });
    return c;
  }, [positions]);
  const lynchCounts = useMemo(() => {
    const c = {};
    positions.forEach(p => { const k=p.lynchCategory||'N/D'; c[k]=(c[k]||0)+1; });
    return Object.entries(c).sort((a,b) => b[1]-a[1]);
  }, [positions]);
  const strong = scored.filter(s => s.passed >= 7).length;
  const avg = scored.length > 0 ? (scored.reduce((s,x) => s+x.passed, 0)/scored.length).toFixed(1) : '—';
  const LYNCH_COLOR = { Stalwart:'#30D158', FastGrower:'#0A84FF', SlowGrower:'#FF9F0A', Cyclical:'#FF6B35', Turnaround:'#BF5AF2', AssetPlay:'#64D2FF' };

  if (positions.length === 0) return (
    <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-3)' }}>
      Nessuna azione con dati fondamentali. Configura le posizioni con ⚙️ nella tab Posizioni.
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:'0.85rem' }}>
        <div style={{ background:'var(--card-bg)', borderRadius:14, border:'1px solid var(--border)', padding:'1.1rem 1.25rem', borderTop:'3px solid #0A84FF' }}>
          <div style={{ fontSize:'0.65rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'0.35rem' }}>Score medio</div>
          <div style={{ fontSize:'2rem', fontWeight:800, color:'#0A84FF', lineHeight:1 }}>{avg}<span style={{ fontSize:'1rem', color:'var(--text-3)' }}>/10</span></div>
          <div style={{ fontSize:'0.73rem', color:'var(--text-3)', marginTop:'0.35rem' }}>{positions.length} azioni analizzate</div>
        </div>
        <div style={{ background:'var(--card-bg)', borderRadius:14, border:'1px solid var(--border)', padding:'1.1rem 1.25rem', borderTop:'3px solid #30D158' }}>
          <div style={{ fontSize:'0.65rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'0.35rem' }}>Posizioni "Forti" (≥ 7/10)</div>
          <div style={{ fontSize:'2rem', fontWeight:800, color:'#30D158', lineHeight:1 }}>{strong}<span style={{ fontSize:'1rem', color:'var(--text-3)' }}>/{positions.length}</span></div>
          <div style={{ fontSize:'0.73rem', color:'var(--text-3)', marginTop:'0.35rem' }}>Passano ≥ 7 criteri su 10</div>
        </div>
        <div style={{ background:'var(--card-bg)', borderRadius:14, border:'1px solid var(--border)', padding:'1.1rem 1.25rem' }}>
          <div style={{ fontSize:'0.65rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'0.65rem' }}>Distribuzione Moat</div>
          {[['Wide','#30D158'],['Narrow','#FF9F0A'],['None','#FF453A']].map(([m,c]) => (
            <div key={m} style={{ marginBottom:'0.45rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:'0.72rem', color:c, fontWeight:600 }}>{m}</span>
                <span style={{ fontSize:'0.72rem', color:'var(--text-3)' }}>{moatCounts[m]}</span>
              </div>
              <div style={{ height:4, background:'var(--bg)', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:2, background:c,
                  width:`${positions.length>0?(moatCounts[m]/positions.length)*100:0}%`, transition:'width 0.4s' }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ background:'var(--card-bg)', borderRadius:14, border:'1px solid var(--border)', padding:'1.1rem 1.25rem' }}>
          <div style={{ fontSize:'0.65rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'0.65rem' }}>Categorie Lynch</div>
          {lynchCounts.map(([cat, cnt]) => (
            <div key={cat} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.3rem' }}>
              <span style={{ fontSize:'0.72rem', color:LYNCH_COLOR[cat]||'var(--text-2)', fontWeight:500 }}>{cat}</span>
              <span style={{ fontSize:'0.68rem', fontWeight:700, background:(LYNCH_COLOR[cat]||'#8E8E93')+'22', color:LYNCH_COLOR[cat]||'var(--text-2)', borderRadius:5, padding:'1px 7px' }}>{cnt}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', gap:'1.25rem', flexWrap:'wrap', alignItems:'center', fontSize:'0.72rem', color:'var(--text-3)' }}>
        <span style={{ fontWeight:600 }}>10 regole Buffett-Lynch:</span>
        {[['pass','✓ Supera'],['warn','⚠ Attenzione'],['fail','✗ Non supera'],['na','— Dato assente']].map(([s,l]) => (
          <span key={s} style={{ color:STATUS_STYLE[s].color }}>{l}</span>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(380px,1fr))', gap:'1rem' }}>
        {scored.map(({ pos, rules, passed, warned, failed }) => {
          const scoreColor = passed>=7?'#30D158':passed>=5?'#FF9F0A':'#FF453A';
          return (
            <div key={pos.id} style={{ background:'var(--card-bg)', borderRadius:16, border:'1px solid var(--border)', borderLeft:`4px solid ${scoreColor}`, overflow:'hidden' }}>
              <div style={{ padding:'0.85rem 1rem', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                  <div>
                    <span style={{ fontWeight:700, fontSize:'0.95rem' }}>{pos.ticker}</span>
                    {pos.name && <span style={{ fontSize:'0.7rem', color:'var(--text-3)', marginLeft:'0.4rem' }}>{pos.name}</span>}
                  </div>
                  <AssetBadge type={pos.assetType} />
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'1.4rem', fontWeight:800, color:scoreColor, lineHeight:1 }}>
                    {passed}<span style={{ fontSize:'0.78rem', color:'var(--text-3)' }}>/10</span>
                  </div>
                  <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end', marginTop:2 }}>
                    {warned>0 && <span style={{ fontSize:'0.63rem', color:'#FF9F0A', fontWeight:600 }}>⚠ {warned}</span>}
                    {failed>0 && <span style={{ fontSize:'0.63rem', color:'#FF453A', fontWeight:600 }}>✗ {failed}</span>}
                  </div>
                </div>
              </div>
              <div style={{ padding:'0.85rem 1rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem' }}>
                {rules.map(r => {
                  const st = STATUS_STYLE[r.result.status];
                  return (
                    <div key={r.id} title={r.desc} style={{ background:st.bg, borderRadius:8, padding:'0.35rem 0.6rem',
                      display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.35rem', cursor:'help' }}>
                      <span style={{ fontSize:'0.67rem', color:'var(--text-2)', fontWeight:500 }}>{r.name}</span>
                      <span style={{ fontSize:'0.67rem', color:st.color, fontWeight:700, whiteSpace:'nowrap' }}>
                        {st.icon} {r.result.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MetadataModal ──────────────────────────────────────────────────────────────
function Field({ label, children, hint }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.3rem' }}>
      <label style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize:'0.68rem', color:'var(--text-3)' }}>{hint}</span>}
    </div>
  );
}
const inputStyle  = { background:'var(--bg)', border:'1px solid var(--border)', borderRadius:9, padding:'0.5rem 0.75rem', fontSize:'0.83rem', color:'var(--text-1)', width:'100%', outline:'none' };
const selectStyle = { ...inputStyle, cursor:'pointer' };

function MetadataModal({ position, onSave, onClose }) {
  const [form,    setForm]    = useState({ ...position });
  const [formTab, setFormTab] = useState('div');
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const handleFreqChange = (freq) => { set('dividendFrequency', freq); set('paymentMonths', FREQUENCY_MONTHS[freq] || []); };
  const valid = parseFloat(form.dividendPerShare) > 0;
  const handleSave = () => {
    if (!valid) return;
    onSave({ ...form,
      dividendPerShare:         parseFloat(form.dividendPerShare)         || 0,
      dividendGrowthRate:       parseFloat(form.dividendGrowthRate)       || 0,
      consecutiveDividendYears: parseInt(form.consecutiveDividendYears)   || 0,
      payoutRatio: parseFloat(form.payoutRatio) || 0,
      roe:         parseFloat(form.roe)         || 0,
      roic:        parseFloat(form.roic)        || 0,
      peRatio:     parseFloat(form.peRatio)     || 0,
      pegRatio:    parseFloat(form.pegRatio)    || 0,
      targetWeight: parseFloat(form.targetWeight) || 0,
      entryPrice:   parseFloat(form.entryPrice)   || 0,
    });
  };
  const FORM_TABS = [{ id:'div', label:'Dividendo' }, { id:'fund', label:'Fondamentali' }, { id:'strat', label:'Strategia' }];
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'var(--card-bg)', borderRadius:20, width:'100%', maxWidth:580, border:'1px solid var(--border)', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'1.1rem 1.5rem', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:'1rem' }}>Configura — {position.ticker}</div>
            <div style={{ fontSize:'0.72rem', color:'var(--text-3)', marginTop:'0.15rem' }}>
              {position.shares} {position.isETF ? 'quote' : 'azioni'} · costo medio {fmtEur(position.avgCostBasis)} · da Transazioni
              {position.isETF && position.synthYield > 0 && (
                <span style={{ marginLeft:8, color:'#64D2FF' }}>· yield ETF: {fmtPct(position.synthYield)}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)' }}><X size={18} /></button>
        </div>
        <div style={{ display:'flex', gap:'0.25rem', padding:'0.75rem 1.5rem', borderBottom:'1px solid var(--border)' }}>
          {FORM_TABS.map(t => (
            <button key={t.id} onClick={() => setFormTab(t.id)} style={{
              padding:'0.3rem 0.8rem', borderRadius:8, border:'none', cursor:'pointer',
              fontSize:'0.78rem', fontWeight: formTab===t.id ? 600 : 400,
              background: formTab===t.id ? '#0A84FF' : 'var(--bg)',
              color: formTab===t.id ? '#fff' : 'var(--text-3)',
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ padding:'1.25rem 1.5rem', overflowY:'auto', flex:1 }}>
          {formTab === 'div' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <Field label="Dividendo/anno per azione (€) *" hint={position.isETF ? 'Calcolato da yield ETF (modificabile)' : 'Importo annuo lordo'}>
                  <input style={inputStyle} type="number" min="0" step="0.0001"
                    value={form.dividendPerShare} onChange={e => set('dividendPerShare', e.target.value)} placeholder="es. 3.17" />
                </Field>
                <Field label="CAGR dividendo 5Y (%)">
                  <input style={inputStyle} type="number" step="0.1"
                    value={form.dividendGrowthRate} onChange={e => set('dividendGrowthRate', e.target.value)} placeholder="es. 5.5" />
                </Field>
              </div>
              <Field label="Frequenza pagamento">
                <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                  {FREQUENCIES.map(f => (
                    <button key={f} onClick={() => handleFreqChange(f)} style={{
                      padding:'0.4rem 0.8rem', borderRadius:9, border:'1px solid var(--border)',
                      cursor:'pointer', fontSize:'0.78rem', fontWeight:500,
                      background: form.dividendFrequency===f ? FREQ_COLOR[f] : 'var(--bg)',
                      color: form.dividendFrequency===f ? '#fff' : 'var(--text-2)',
                      transition:'all 0.15s',
                    }}>{f}</button>
                  ))}
                </div>
              </Field>
              <Field label="Mesi di pagamento" hint="Clicca per selezionare/deselezionare">
                <div style={{ display:'flex', gap:'0.35rem', flexWrap:'wrap' }}>
                  {MONTHS_IT.map((m, i) => {
                    const active = form.paymentMonths?.includes(i+1);
                    return (
                      <button key={i} onClick={() => {
                        const months = form.paymentMonths || [];
                        set('paymentMonths', active ? months.filter(x => x!==i+1) : [...months, i+1].sort((a,b)=>a-b));
                      }} style={{ padding:'0.3rem 0.55rem', borderRadius:7, border:'1px solid var(--border)',
                        cursor:'pointer', fontSize:'0.75rem', fontWeight:500,
                        background: active ? '#0A84FF' : 'var(--bg)', color: active ? '#fff' : 'var(--text-3)',
                      }}>{m}</button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Anni consecutivi di dividendo">
                <input style={inputStyle} type="number" min="0"
                  value={form.consecutiveDividendYears} onChange={e => set('consecutiveDividendYears', e.target.value)} placeholder="es. 30" />
              </Field>
            </div>
          )}
          {formTab === 'fund' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <Field label="Moat">
                  <div style={{ display:'flex', gap:'0.5rem' }}>
                    {MOAT_RATINGS.map(r => { const s=MOAT_STYLE[r]; return (
                      <button key={r} onClick={() => set('moatRating', r)} style={{
                        flex:1, padding:'0.4rem 0.5rem', borderRadius:9,
                        border:`1px solid ${form.moatRating===r ? s.color : 'var(--border)'}`,
                        cursor:'pointer', fontSize:'0.75rem', fontWeight:600,
                        background: form.moatRating===r ? s.bg : 'var(--bg)',
                        color: form.moatRating===r ? s.color : 'var(--text-3)',
                      }}>{r}</button>
                    ); })}
                  </div>
                </Field>
                <Field label="Lynch Category">
                  <select style={selectStyle} value={form.lynchCategory} onChange={e => set('lynchCategory', e.target.value)}>
                    {LYNCH_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.75rem' }}>
                <Field label="Payout Ratio (%)"><input style={inputStyle} type="number" min="0" max="200" step="0.1" value={form.payoutRatio} onChange={e => set('payoutRatio', e.target.value)} placeholder="es. 75" /></Field>
                <Field label="ROE (%)"><input style={inputStyle} type="number" step="0.1" value={form.roe} onChange={e => set('roe', e.target.value)} placeholder="es. 18.5" /></Field>
                <Field label="ROIC (%)"><input style={inputStyle} type="number" step="0.1" value={form.roic} onChange={e => set('roic', e.target.value)} placeholder="es. 12.5" /></Field>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <Field label="P/E Ratio"><input style={inputStyle} type="number" step="0.1" value={form.peRatio} onChange={e => set('peRatio', e.target.value)} placeholder="es. 22.5" /></Field>
                <Field label="PEG Ratio"><input style={inputStyle} type="number" step="0.01" value={form.pegRatio} onChange={e => set('pegRatio', e.target.value)} placeholder="es. 1.2" /></Field>
              </div>
            </div>
          )}
          {formTab === 'strat' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <Field label="Peso target (%)"><input style={inputStyle} type="number" min="0" max="100" step="0.5" value={form.targetWeight} onChange={e => set('targetWeight', e.target.value)} placeholder="es. 8.5" /></Field>
                <Field label="Prezzo target (zona)"><input style={inputStyle} type="number" min="0" step="0.01" value={form.entryPrice} onChange={e => set('entryPrice', e.target.value)} placeholder="es. 50.00" /></Field>
              </div>
              <Field label="Note / Tesi">
                <textarea style={{ ...inputStyle, minHeight:100, resize:'vertical', fontFamily:'inherit' }}
                  value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Tesi di investimento, catalyst, quando vendere…" />
              </Field>
            </div>
          )}
        </div>
        <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:'0.75rem' }}>
          <button onClick={onClose} style={{ padding:'0.55rem 1.1rem', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg)', cursor:'pointer', fontSize:'0.83rem', color:'var(--text-2)' }}>Annulla</button>
          <button onClick={handleSave} style={{ padding:'0.55rem 1.25rem', borderRadius:10, border:'none', background: valid ? '#0A84FF' : '#444', color:'#fff', cursor: valid ? 'pointer' : 'not-allowed', fontSize:'0.83rem', fontWeight:600, display:'flex', alignItems:'center', gap:'0.4rem' }}>
            <Check size={14} /> Salva metadati
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PositionsTable ─────────────────────────────────────────────────────────────
function PositionsTable({ positions, prices, onEdit }) {
  const [sort, setSort] = useState({ key:'ticker', dir:1 });
  const sorted = [...positions].sort((a,b) => {
    const va = sort.key==='gross'  ? annualGross(a)
             : sort.key==='value'  ? marketValue(a,prices)
             : sort.key==='yoc'    ? yieldOnCost(a)
             : a[sort.key] ?? 0;
    const vb = sort.key==='gross'  ? annualGross(b)
             : sort.key==='value'  ? marketValue(b,prices)
             : sort.key==='yoc'    ? yieldOnCost(b)
             : b[sort.key] ?? 0;
    return typeof va==='string' ? va.localeCompare(vb)*sort.dir : (va-vb)*sort.dir;
  });
  const Th = ({ label, k }) => (
    <th onClick={() => setSort(s => ({ key:k, dir:s.key===k ? -s.dir : 1 }))}
      style={{ padding:'0.6rem 0.85rem', textAlign:'left', fontWeight:600,
        color: sort.key===k ? 'var(--text-1)' : 'var(--text-3)',
        fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.06em',
        borderBottom:'1px solid var(--border)', cursor:'pointer', whiteSpace:'nowrap', userSelect:'none' }}>
      {label} {sort.key===k ? (sort.dir===1?'↑':'↓') : ''}
    </th>
  );
  if (positions.length === 0) return (
    <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-3)' }}>Nessuna posizione.</div>
  );
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
        <thead>
          <tr style={{ background:'var(--bg)' }}>
            <Th label="Ticker"     k="ticker" />
            <Th label="Tipo"       k="assetType" />
            <Th label="Moat"       k="moatRating" />
            <Th label="Azioni"     k="shares" />
            <Th label="Costo med." k="avgCostBasis" />
            <Th label="Valore"     k="value" />
            <Th label="Div./anno"  k="gross" />
            <Th label="Yield"      k="dividendPerShare" />
            <Th label="YoC"        k="yoc" />
            <Th label="CAGR div."  k="dividendGrowthRate" />
            <Th label="Payout"     k="payoutRatio" />
            <th style={{ padding:'0.6rem 0.85rem', borderBottom:'1px solid var(--border)' }} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((pos, i) => {
            const price = prices[pos.ticker]?.price;
            const val   = marketValue(pos, prices);
            const gross = annualGross(pos);
            const yld   = price ? (pos.dividendPerShare / price) * 100 : null;
            const yoc   = yieldOnCost(pos);
            return (
              <tr key={pos.id}
                style={{ borderBottom: i<sorted.length-1 ? '1px solid var(--border)' : 'none', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <td style={{ padding:'0.8rem 0.85rem' }}>
                  <div style={{ fontWeight:700 }}>{pos.ticker}</div>
                  <div style={{ fontSize:'0.7rem', color:'var(--text-3)', maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pos.name}</div>
                </td>
                <td style={{ padding:'0.8rem 0.85rem' }}><AssetBadge type={pos.assetType} /></td>
                <td style={{ padding:'0.8rem 0.85rem' }}><MoatBadge rating={pos.moatRating} /></td>
                <td style={{ padding:'0.8rem 0.85rem', fontFamily:'monospace', color:'var(--text-2)' }}>{pos.shares}</td>
                <td style={{ padding:'0.8rem 0.85rem', fontFamily:'monospace' }}><Blur>{fmtEur(pos.avgCostBasis)}</Blur></td>
                <td style={{ padding:'0.8rem 0.85rem', fontWeight:600 }}>
                  {price ? <Blur>{fmtEur(val)}</Blur> : <span style={{ color:'var(--text-3)', fontSize:'0.72rem' }}>n/d</span>}
                </td>
                <td style={{ padding:'0.8rem 0.85rem', color:'#30D158', fontWeight:600 }}>
                  {gross > 0 ? <Blur>{fmtEur(gross)}</Blur> : <span style={{ color:'var(--text-3)' }}>—</span>}
                </td>
                <td style={{ padding:'0.8rem 0.85rem' }}>
                  {yld!=null ? <span style={{ color:yld>6?'#FF9F0A':'var(--text-1)' }}>{fmtPct(yld)}</span> : '—'}
                </td>
                <td style={{ padding:'0.8rem 0.85rem' }}>
                  {yoc > 0 ? <span style={{ color:'#0A84FF', fontWeight:600 }}>{fmtPct(yoc)}</span> : '—'}
                </td>
                <td style={{ padding:'0.8rem 0.85rem' }}>
                  <span style={{ color:(pos.dividendGrowthRate||0)>=5?'#30D158':'var(--text-2)' }}>
                    {pos.dividendGrowthRate ? '+'+pos.dividendGrowthRate+'%' : '—'}
                  </span>
                </td>
                <td style={{ padding:'0.8rem 0.85rem' }}>
                  {pos.payoutRatio ? (
                    <span style={{ color:pos.payoutRatio>100?'#FF453A':pos.payoutRatio>80?'#FF9F0A':'var(--text-2)' }}>
                      {pos.payoutRatio}%
                    </span>
                  ) : '—'}
                </td>
                <td style={{ padding:'0.8rem 0.85rem' }}>
                  <button onClick={() => onEdit(pos)} title="Configura dati dividendo" style={{
                    background:'var(--bg)', border:'1px solid var(--border)', borderRadius:7,
                    padding:'4px 8px', cursor:'pointer', color:'var(--text-2)',
                    display:'flex', alignItems:'center', gap:4,
                  }}>
                    <Settings2 size={12} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Dividendi() {
  const today        = new Date();
  const currentYear  = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const [tab,               setTab]             = useState('overview');
  const [dgPositions,       setDgPositions]     = useState([]);
  const [prices,            setPrices]          = useState({});
  const [loading,           setLoading]         = useState(true);
  const [refreshing,        setRefreshing]      = useState(false);
  const [portfolioConfig,   setPortfolioConfig] = useState(() => getPortfolioConfig());
  const [selectedPortfolio, setSelectedPortfolio] = useState('all');
  const [calYear,           setCalYear]         = useState(currentYear);
  const [selectedMonthIdx,  setSelectedMonthIdx] = useState(null);

  // ── Simulatore ───────────────────────────────────────────────────────────────
  const [simPositions,  setSimPositions]  = useState([]);
  const [simFetchingPrice, setSimFetchingPrice] = useState(false);
  const [selectedSimMonthIdx, setSelectedSimMonthIdx] = useState(null);
  const [simForm, setSimForm] = useState({
    ticker: '', name: '', amount: '', price: '', yieldPct: '', frequency: 'Quarterly',
    months: [3, 6, 9, 12],
  });
  const [showModal,         setShowModal]       = useState(false);
  const [editingPos,        setEditingPos]      = useState(null);
  const [projYears,         setProjYears]       = useState(20);
  const [targetYoc,         setTargetYoc]       = useState(6);
  // taxRate stored as percentage (0–100) in localStorage for clean round-trips
  const [taxRate, setTaxRate] = useState(() => {
    const pct = parseFloat(localStorage.getItem('div_tax_pct'));
    return (isNaN(pct) ? DEFAULT_TAX * 100 : pct) / 100;
  });
  const [taxInput, setTaxInput] = useState(() => {
    const pct = parseFloat(localStorage.getItem('div_tax_pct'));
    return isNaN(pct) ? String(DEFAULT_TAX * 100) : String(pct);
  });

  const handleTaxChange = useCallback((pct) => {
    const n = Math.min(100, Math.max(0, parseFloat(pct) || 0));
    setTaxInput(String(n));
    setTaxRate(n / 100);
    localStorage.setItem('div_tax_pct', n);
  }, []);

  // ── Carica dati ──────────────────────────────────────────────────────────
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      const raw     = calculatePortfolio();
      const nonCash = raw.filter(h => !h.isCash && (h.quantity ?? 0) > 0);

      let priceMap = getCachedPrices() || {};
      const tickers = [...new Set(nonCash.map(h => h.ticker))];
      const missing = tickers.filter(t => !priceMap[t] || forceRefresh);
      if (missing.length > 0) {
        try {
          const fresh = await fetchMultiplePrices(missing);
          priceMap = { ...priceMap, ...fresh };
          cachePrices(priceMap);
        } catch (e) { console.warn('Price fetch error', e); }
      }
      setPrices(priceMap);

      const allMeta = getAllDGMetadata();
      setDgPositions(buildAllPositions(nonCash, priceMap, allMeta));
      setPortfolioConfig(getPortfolioConfig());
    } catch (err) {
      console.error('Dividendi load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => { setRefreshing(true); loadData(true); };

  // ── Filtro portfolio ─────────────────────────────────────────────────────
  const positions = useMemo(() => {
    if (selectedPortfolio === 'all') return dgPositions;
    return dgPositions.filter(p => portfolioConfig.assignments[p.ticker] === selectedPortfolio);
  }, [dgPositions, selectedPortfolio, portfolioConfig.assignments]);

  const distributingPositions = useMemo(() => positions.filter(p => (p.dividendPerShare || 0) > 0), [positions]);
  const stockPositions        = useMemo(() => positions.filter(p => !p.isETF), [positions]);

  // ── Calcoli aggregati ────────────────────────────────────────────────────
  const kpis     = useMemo(() => portfolioKPIs(positions, prices, taxRate), [positions, prices, taxRate]);
  const calData  = useMemo(() => dividendCalendar(distributingPositions, calYear, taxRate), [distributingPositions, calYear, taxRate]);
  const projection = useMemo(() => yocProjection(distributingPositions, projYears), [distributingPositions, projYears]);

  // YoC vs Yield attuale nel tempo: la YoC cresce (dividendi in crescita su costo fisso),
  // lo yield attuale resta piatto (chi compra oggi al prezzo di mercato prende sempre quello).
  const yocVsCurrent = useMemo(() => {
    const yoc = yocProjection(distributingPositions, 15);
    if (!yoc.length) return [];
    return yoc.map(d => ({ year: d.year, yoc: d.base, current: parseFloat(kpis.yieldPct.toFixed(2)) }));
  }, [distributingPositions, kpis.yieldPct]);
  const incomeProj = useMemo(() => incomeProjection(distributingPositions, projYears, 0, taxRate), [distributingPositions, projYears, taxRate]);
  const { score, alerts } = useMemo(() => riskScore(distributingPositions, prices), [distributingPositions, prices]);

  const sortedByGross = useMemo(() =>
    [...distributingPositions].sort((a,b) => annualGross(b) - annualGross(a)),
  [distributingPositions]);

  // ── Dati grafico 24 mesi ─────────────────────────────────────────────────
  const monthlyChartData = useMemo(() => {
    const data = [];
    for (let offset = 0; offset < 24; offset++) {
      const absMonth = (currentMonth - 1) + offset;
      const monthIdx = absMonth % 12;
      const monthNum = monthIdx + 1;
      const year     = currentYear + Math.floor(absMonth / 12);
      const income   = distributingPositions.reduce((s, p) => {
        if ((p.paymentMonths || []).includes(monthNum)) {
          const nPay = (p.paymentMonths || []).length || 1;
          return s + annualGross(p) / nPay;
        }
        return s;
      }, 0);
      data.push({
        label: `${MONTHS_IT[monthIdx]} '${String(year).slice(2)}`,
        income: Math.round(income),
        isCurrent: year === currentYear && monthNum === currentMonth,
        isNextYear: year > currentYear,
      });
    }
    return data;
  }, [distributingPositions, currentMonth, currentYear]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleEdit = useCallback((pos) => { setEditingPos(pos); setShowModal(true); }, []);

  const handleSaveMeta = useCallback((updatedPos) => {
    const { id, ticker, shares, avgCostBasis, currentPrice, isETF, isAccumulating, synthYield, ...meta } = updatedPos;
    saveDGMetadata(ticker, meta);
    setShowModal(false);
    setEditingPos(null);
    loadData();
  }, [loadData]);

  const YEAR_OPTS = [5, 10, 15, 20, 25];

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:'var(--text-3)', gap:10 }}>
        <RefreshCw size={18} style={{ animation:'spin 1s linear infinite' }} /> Caricamento dati dividendi…
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem', maxWidth:1100 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'0.75rem' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.15rem' }}>
            <Coins size={20} color="#30D158" />
            <h1 style={{ fontSize:'1.4rem', fontWeight:700, margin:0 }}>Dividendi &amp; Rendita</h1>
          </div>
          <p style={{ margin:0, color:'var(--text-3)', fontSize:'0.82rem' }}>
            {positions.length > 0
              ? `${distributingPositions.length} distributori · ${fmtEur(kpis.annualGross)} lordi/anno · ${fmtEur(kpis.annualNet)} netti`
              : 'Nessuna posizione con dividendo rilevata'}
          </p>
        </div>
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
          {portfolioConfig.portfolios?.length > 0 && (
            <select value={selectedPortfolio} onChange={e => setSelectedPortfolio(e.target.value)}
              style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:8, padding:'5px 10px', fontSize:'0.8rem', color:'var(--text-1)', cursor:'pointer' }}>
              <option value="all">Tutti i portafogli</option>
              {portfolioConfig.portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button onClick={handleRefresh} disabled={refreshing} style={{
            display:'flex', alignItems:'center', gap:'0.4rem',
            padding:'0.5rem 1rem', borderRadius:10, border:'1px solid var(--border)',
            background:'var(--card-bg)', color:'var(--text-2)', fontSize:'0.83rem', cursor:'pointer',
          }}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Aggiorna
          </button>
          <Link to="/transactions" style={{
            display:'inline-flex', alignItems:'center', gap:'0.4rem',
            padding:'0.5rem 1rem', borderRadius:10, border:'1px solid var(--border)',
            background:'var(--card-bg)', color:'var(--text-2)', fontSize:'0.83rem', textDecoration:'none',
          }}>
            <ExternalLink size={13} /> Transazioni
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {positions.length === 0 && (
        <div style={{ background:'var(--card-bg)', borderRadius:20, border:'2px dashed var(--border)', padding:'3.5rem 2rem', textAlign:'center' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>📊</div>
          <div style={{ fontSize:'1.05rem', fontWeight:600, marginBottom:'0.5rem' }}>Nessun titolo trovato</div>
          <div style={{ fontSize:'0.85rem', color:'var(--text-3)', maxWidth:420, margin:'0 auto 1.5rem' }}>
            Acquista ETF a distribuzione o azioni dividend growth dalla sezione <strong>Transazioni</strong>.
          </div>
          <Link to="/transactions" style={{
            display:'inline-flex', alignItems:'center', gap:'0.5rem',
            padding:'0.65rem 1.5rem', borderRadius:12, border:'none',
            background:'#0A84FF', color:'#fff', textDecoration:'none', fontSize:'0.9rem', fontWeight:600,
          }}>
            <ExternalLink size={15} /> Vai a Transazioni
          </Link>
        </div>
      )}

      {positions.length > 0 && (
        <>
          {/* Tab bar + tassazione */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'0.75rem' }}>
            <TabBar tab={tab} setTab={setTab} />

            {/* Tassazione */}
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
              <span style={{ fontSize:'0.72rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                Tassazione:
              </span>
              {[['0', '0% (es. Malta)'], ['12.5', '12.5%'], ['26', '26% (IT)']].map(([val, label]) => (
                <button key={val} onClick={() => handleTaxChange(val)} style={{
                  padding:'0.3rem 0.7rem', borderRadius:8,
                  border: `1px solid ${taxInput === val ? '#0A84FF' : 'var(--border)'}`,
                  background: taxInput === val ? 'rgba(10,132,255,0.12)' : 'var(--bg)',
                  color: taxInput === val ? '#0A84FF' : 'var(--text-3)',
                  fontSize:'0.75rem', fontWeight: taxInput === val ? 700 : 400,
                  cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s',
                }}>{label}</button>
              ))}
              <div style={{ display:'flex', alignItems:'center', gap:'0.3rem',
                background:'var(--bg)', border:`1px solid ${!['0','12.5','26'].includes(taxInput) ? '#0A84FF' : 'var(--border)'}`,
                borderRadius:8, padding:'0.3rem 0.6rem',
              }}>
                <input
                  type="number" min="0" max="100" step="0.5"
                  value={taxInput}
                  onChange={e => { setTaxInput(e.target.value); }}
                  onBlur={e => handleTaxChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTaxChange(e.target.value)}
                  style={{ width:40, background:'transparent', border:'none', outline:'none',
                    fontSize:'0.75rem', color: !['0','12.5','26'].includes(taxInput) ? '#0A84FF' : 'var(--text-1)',
                    fontWeight: !['0','12.5','26'].includes(taxInput) ? 700 : 400,
                    textAlign:'right' }}
                />
                <span style={{ fontSize:'0.75rem', color:'var(--text-3)' }}>%</span>
              </div>
            </div>
          </div>

          {/* ── PANORAMICA ─────────────────────────────────────────────────── */}
          {tab === 'overview' && (
            <>
              {/* KPI row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'0.85rem' }}>
                <KpiCard label="Valore Portafoglio"
                  value={fmtEur(kpis.totalValue)} sub={`${positions.length} posizioni`}
                  icon={Coins} color="#0A84FF" accent="#0A84FF" />
                <KpiCard label="Dividendi Lordi/Anno"
                  value={fmtEur(kpis.annualGross)} sub="Prima delle tasse"
                  icon={TrendingUp} color="#30D158" accent="#30D158" />
                <KpiCard label="Dividendi Netti/Anno"
                  value={fmtEur(kpis.annualNet)} sub={`Tassazione ${(taxRate*100).toFixed(0)}%`}
                  icon={TrendingUp} color="#30D158" />
                <KpiCard label="Rendita Mensile Netta"
                  value={fmtEur(kpis.monthlyNet)} sub="Media mensile"
                  icon={Calendar} color="#64D2FF" />
                <KpiCard label="Yield Medio"
                  value={fmtPct(kpis.yieldPct)} sub="Sul valore attuale"
                  icon={Target} color={kpis.yieldPct > 7 ? '#FF9F0A' : '#0A84FF'} />
                <KpiCard label="Yield on Cost"
                  value={fmtPct(kpis.yocPct)} sub="Sul prezzo di carico"
                  icon={Shield} color="#BF5AF2" />
              </div>

              {/* Next dividend + Risk */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'1rem', alignItems:'stretch' }}>
                <NextDividendBanner positions={distributingPositions} taxRate={taxRate} />
                <RiskScore score={score} />
              </div>

              {/* Alerts */}
              {alerts.length > 0 && (
                <div style={{ background:'var(--card-bg)', borderRadius:14, border:'1px solid var(--border)', overflow:'hidden' }}>
                  <div style={{ padding:'0.85rem 1.25rem', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <AlertCircle size={14} color="#FF9F0A" />
                    <span style={{ fontSize:'0.85rem', fontWeight:600 }}>Alert ({alerts.length})</span>
                  </div>
                  <div style={{ padding:'0.5rem 0' }}>
                    {alerts.slice(0,5).map((a, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.55rem 1.25rem',
                        borderBottom: i < Math.min(alerts.length,5)-1 ? '1px solid var(--border)' : 'none', fontSize:'0.8rem' }}>
                        <span>{a.severity==='critical'?'🔴':a.severity==='warning'?'🟡':'🔵'}</span>
                        <span style={{ fontWeight:500 }}>{a.ticker!=='—'?`[${a.ticker}] `:''}{a.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 24-month chart */}
              <div style={{ background:'var(--card-bg)', borderRadius:14, border:'1px solid var(--border)', padding:'1.25rem' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem', flexWrap:'wrap', gap:8 }}>
                  <div>
                    <div style={{ fontSize:'0.85rem', fontWeight:600 }}>Proiezione mensile — 24 mesi</div>
                    <div style={{ fontSize:'0.72rem', color:'var(--text-3)', marginTop:2 }}>Importi stimati in base al portafoglio attuale</div>
                  </div>
                  <div style={{ display:'flex', gap:12, fontSize:'0.68rem', color:'var(--text-3)' }}>
                    {[['#FF9F0A','Mese corrente'],['#30D158',currentYear],['rgba(10,132,255,0.7)',currentYear+1]].map(([c,l]) => (
                      <span key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <span style={{ width:10, height:10, background:c, borderRadius:2, display:'inline-block' }} />{l}
                      </span>
                    ))}
                  </div>
                </div>
                <MonthlyBarChart data={monthlyChartData} />
              </div>

              {/* Quarterly summary */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'0.85rem' }}>
                {[['Q1',[1,2,3]],['Q2',[4,5,6]],['Q3',[7,8,9]],['Q4',[10,11,12]]].map(([q, months]) => {
                  const qTotal = calData.filter(m => months.includes(m.month+1 || months.includes(m.month))).reduce((s,m) => s+m.totalGross, 0);
                  // recompute from distributingPositions
                  const qIncome = distributingPositions.reduce((s, p) => {
                    const paying = (p.paymentMonths||[]).filter(m => months.includes(m));
                    const nPay = (p.paymentMonths||[]).length || 1;
                    return s + paying.length * (annualGross(p) / nPay);
                  }, 0);
                  const isPast = currentYear === calYear && months[2] < currentMonth;
                  return (
                    <div key={q} style={{ background:'var(--card-bg)', borderRadius:12, border:'1px solid var(--border)', padding:'1rem', opacity: isPast ? 0.55 : 1 }}>
                      <div style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-3)', marginBottom:4 }}>
                        {q} · {MONTHS_IT[months[0]-1]}–{MONTHS_IT[months[2]-1]}
                      </div>
                      <div style={{ fontSize:'1.15rem', fontWeight:800, color: qIncome > 0 ? '#30D158' : 'var(--text-3)' }}>
                        <Blur>{fmtEur(qIncome)}</Blur>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Yield attuale vs Yield on Cost nel tempo */}
              {yocVsCurrent.length > 1 && (
                <div style={{ background:'var(--card-bg)', borderRadius:14, border:'1px solid var(--border)', padding:'1.25rem' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:14 }}>
                    <div>
                      <div style={{ fontSize:'0.85rem', fontWeight:600 }}>Yield on Cost vs Yield attuale</div>
                      <div style={{ fontSize:'0.72rem', color:'var(--text-3)', marginTop:2 }}>
                        Come cresce il rendimento sul tuo costo grazie all'aumento dei dividendi (scenario base)
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:12, fontSize:'0.7rem' }}>
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <span style={{ width:14, height:3, background:'#30D158', borderRadius:2 }} />
                        <span style={{ color:'var(--text-2)' }}>Yield on Cost</span>
                      </span>
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <span style={{ width:14, height:3, background:'#8E8E93', borderRadius:2, borderTop:'1px dashed #8E8E93' }} />
                        <span style={{ color:'var(--text-2)' }}>Yield attuale (chi compra oggi)</span>
                      </span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={yocVsCurrent} margin={{ top:5, right:10, left:0, bottom:0 }}>
                      <defs>
                        <linearGradient id="yocGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#30D158" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#30D158" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize:11, fill:'var(--text-3)' }} />
                      <YAxis tick={{ fontSize:10, fill:'var(--text-3)' }} tickFormatter={v => v + '%'} width={40} />
                      <Tooltip
                        formatter={(v, n) => [v.toFixed(2) + '%', n === 'yoc' ? 'Yield on Cost' : 'Yield attuale']}
                        contentStyle={{ background:'var(--surface-1)', border:'1px solid var(--border)', borderRadius:10, fontSize:'0.78rem' }} />
                      <Line type="monotone" dataKey="current" stroke="#8E8E93" strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="current" />
                      <Line type="monotone" dataKey="yoc" stroke="#30D158" strokeWidth={2.5} dot={false} name="yoc" />
                    </LineChart>
                  </ResponsiveContainer>
                  <p style={{ fontSize:'0.7rem', color:'var(--text-3)', marginTop:8, lineHeight:1.5 }}>
                    💡 La linea verde sale perché i dividendi crescono mentre il tuo costo resta fisso. Più tieni le azioni, più
                    il rendimento sul capitale investito supera quello di chi entra oggi.
                  </p>
                </div>
              )}

              {/* Contribution breakdown */}
              <div style={{ background:'var(--card-bg)', borderRadius:14, border:'1px solid var(--border)', padding:'1.25rem' }}>
                <div style={{ fontSize:'0.85rem', fontWeight:600, marginBottom:'0.85rem' }}>Contributo per titolo</div>
                <div style={{ display:'grid', gridTemplateColumns:'90px 1fr 65px 55px 70px', gap:'0.65rem', paddingBottom:6, borderBottom:'1px solid var(--border)', marginBottom:2 }}>
                  {['Ticker','','Yield','%','Anno'].map((h,i) => (
                    <span key={i} style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', textAlign: i>=2 ? 'right' : 'left' }}>{h}</span>
                  ))}
                </div>
                {sortedByGross.map(pos => (
                  <ContribRow key={pos.id} pos={pos} totalGross={kpis.annualGross} prices={prices} />
                ))}
              </div>

              {/* Footer note */}
              <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'12px 14px', borderRadius:10, background:'var(--bg)', border:'1px solid var(--border)', fontSize:'0.72rem', color:'var(--text-3)' }}>
                <Info size={13} style={{ flexShrink:0, marginTop:1 }} />
                <span>
                  I rendimenti sono stime basate su dati storici e potrebbero non rispecchiare i pagamenti futuri.
                  ETF accumulanti (VWCE, SWDA…) reinvestono automaticamente — DPS=0 in Posizioni, YoC flat in Proiezioni.
                  Per azioni senza dati usa ⚙️ in Posizioni per configurare DPS e CAGR.
                </span>
              </div>
            </>
          )}

          {/* ── CALENDARIO ─────────────────────────────────────────────────── */}
          {tab === 'calendar' && (
            <>
              {/* Year nav */}
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
                <button onClick={() => { setCalYear(y => y-1); setSelectedMonthIdx(null); }}
                  style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'0.35rem 0.75rem', cursor:'pointer', color:'var(--text-2)', display:'flex', alignItems:'center' }}>
                  <ChevronLeft size={15} />
                </button>
                <span style={{ fontWeight:700, fontSize:'1rem' }}>{calYear}</span>
                {calYear > new Date().getFullYear() && (
                  <span style={{ fontSize:'0.68rem', fontWeight:600, padding:'2px 8px', borderRadius:6,
                    background:'#FF9F0A22', color:'#FF9F0A', border:'1px solid #FF9F0A44' }}>
                    📈 Stima con crescita dividendi
                  </span>
                )}
                <button onClick={() => { setCalYear(y => y+1); setSelectedMonthIdx(null); }}
                  style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'0.35rem 0.75rem', cursor:'pointer', color:'var(--text-2)', display:'flex', alignItems:'center' }}>
                  <ChevronRight size={15} />
                </button>
                <span style={{ fontSize:'0.82rem', color:'var(--text-3)', marginLeft:'auto' }}>
                  Totale anno: <Blur>{fmtEur(calData.reduce((s,m) => s+m.totalGross, 0))} lordi · {fmtEur(calData.reduce((s,m) => s+m.totalNet, 0))} netti</Blur>
                </span>
              </div>
              {calYear > new Date().getFullYear() && (
                <div style={{ fontSize:'0.72rem', color:'var(--text-3)', padding:'8px 12px', borderRadius:8,
                  background:'var(--surface-2)', border:'1px solid var(--border)' }}>
                  ℹ️ I valori futuri sono <strong>stime</strong> calcolate applicando il tasso di crescita dividendi configurato su ciascuna posizione (default: +3%/anno per azioni, +0% per ETF). Puoi modificare il tasso per ogni titolo nella tab Posizioni → ⚙️.
                </div>
              )}

              {/* Frequency legend */}
              <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
                {Object.entries(FREQ_COLOR).map(([f,c]) => (
                  <span key={f} style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.75rem', color:'var(--text-2)' }}>
                    <span style={{ width:10, height:10, borderRadius:'50%', background:c, display:'inline-block' }} />{f}
                  </span>
                ))}
              </div>

              {/* 12-month grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:'0.75rem' }}>
                {calData.map((m, i) => (
                  <CalendarMonthCard
                    key={i} monthData={m} monthIndex={i}
                    isSelected={selectedMonthIdx === i}
                    onClick={() => setSelectedMonthIdx(selectedMonthIdx === i ? null : i)}
                  />
                ))}
              </div>

              {/* Pulsante Totale Anno */}
              {calData.some(m => m.events.length > 0) && (
                <button
                  onClick={() => setSelectedMonthIdx(selectedMonthIdx === 'all' ? null : 'all')}
                  style={{
                    alignSelf: 'flex-start', padding:'8px 18px', borderRadius:20,
                    border: `1px solid ${selectedMonthIdx === 'all' ? '#0A84FF' : 'var(--border)'}`,
                    background: selectedMonthIdx === 'all' ? '#0A84FF22' : 'var(--surface-2)',
                    color: selectedMonthIdx === 'all' ? '#0A84FF' : 'var(--text-2)',
                    fontSize:'0.78rem', fontWeight:600, cursor:'pointer',
                  }}>
                  📊 Totale Anno {calYear}
                </button>
              )}

              {/* Detail panel — mese singolo */}
              {selectedMonthIdx !== null && selectedMonthIdx !== 'all' && calData[selectedMonthIdx]?.events.length > 0 && (
                <MonthDetailPanel
                  monthData={calData[selectedMonthIdx]}
                  monthIndex={selectedMonthIdx}
                  year={calYear}
                  taxRate={taxRate}
                  totalPortfolioValue={kpis.totalValue}
                />
              )}

              {/* Detail panel — totale anno */}
              {selectedMonthIdx === 'all' && (() => {
                // Aggrega tutti i mesi in un unico monthData sintetico
                const allEvents = calData.flatMap(m => m.events);
                const totalGross = calData.reduce((s,m) => s + m.totalGross, 0);
                const totalNet   = calData.reduce((s,m) => s + m.totalNet,   0);
                if (!allEvents.length) return null;
                return (
                  <MonthDetailPanel
                    monthData={{ events: allEvents, totalGross, totalNet }}
                    monthIndex={-1}
                    year={calYear}
                    taxRate={taxRate}
                    totalPortfolioValue={kpis.totalValue}
                    overrideTitle={`Totale Anno ${calYear}`}
                  />
                );
              })()}
            </>
          )}

          {/* ── COMPOSIZIONE ───────────────────────────────────────────────── */}
          {tab === 'composition' && (() => {
            const totalVal = positions.reduce((s,p) => s + (p.currentPrice||0)*(p.shares||0), 0);
            const totalGross = kpis.annualGross;
            const sorted = [...positions].sort((a,b) => {
              const va = (a.currentPrice||0)*(a.shares||0);
              const vb = (b.currentPrice||0)*(b.shares||0);
              return vb - va;
            });
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {/* Header */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                  {[
                    { label:'Posizioni', value: positions.length },
                    { label:'Valore totale', value: fmtEur(totalVal) },
                    { label:'Dividendi lordi/anno', value: fmtEur(totalGross) },
                    { label:'Yield medio', value: fmtPct(kpis.yieldPct) },
                  ].map(k => (
                    <div key={k.label} style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 18px' }}>
                      <p style={{ fontSize:'0.68rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', margin:'0 0 4px' }}>{k.label}</p>
                      <p style={{ fontSize:'1.25rem', fontWeight:700, color:'var(--text-1)', margin:0 }}>{k.value}</p>
                    </div>
                  ))}
                </div>

                {/* Tabella composizione */}
                <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 70px 70px 90px 90px 70px', gap:8,
                    padding:'10px 16px', borderBottom:'1px solid var(--border)',
                    fontSize:'0.65rem', fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.04em' }}>
                    {['Titolo','Valore €','Peso %','Yield %','Div. Lordo/a','Div. Netto/a','% Div Tot'].map((h,i) => (
                      <span key={h} style={{ textAlign: i>0 ? 'right' : 'left' }}>{h}</span>
                    ))}
                  </div>
                  {sorted.map((pos,i) => {
                    const val  = (pos.currentPrice||0)*(pos.shares||0);
                    const weight = totalVal > 0 ? val/totalVal*100 : 0;
                    const gross  = annualGross(pos);
                    const yld    = val > 0 ? gross/val*100 : 0;
                    const net    = gross * (1 - taxRate);
                    const divPct = totalGross > 0 ? gross/totalGross*100 : 0;
                    return (
                      <div key={pos.id} style={{ display:'grid', gridTemplateColumns:'1fr 90px 70px 70px 90px 90px 70px', gap:8,
                        padding:'10px 16px', borderBottom:'1px solid var(--border)', alignItems:'center',
                        background: i%2===0 ? 'transparent' : 'var(--surface-2)04' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background: SECTOR_COLORS[pos.sector]||'#8E8E93', flexShrink:0 }} />
                          <div>
                            <span style={{ fontSize:'0.82rem', fontWeight:600 }}>{pos.ticker}</span>
                            <span style={{ fontSize:'0.68rem', color:'var(--text-3)', marginLeft:6, display:'inline-block', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pos.name}</span>
                          </div>
                        </div>
                        <span style={{ textAlign:'right', fontSize:'0.82rem', fontWeight:500 }}><Blur>{fmtEur(val)}</Blur></span>
                        <div style={{ textAlign:'right' }}>
                          <span style={{ fontSize:'0.78rem', fontWeight:600 }}>{weight.toFixed(1)}%</span>
                          <div style={{ height:3, background:'var(--border)', borderRadius:2, marginTop:3 }}>
                            <div style={{ height:'100%', background:'#0A84FF', borderRadius:2, width:`${Math.min(weight,100)}%` }} />
                          </div>
                        </div>
                        <span style={{ textAlign:'right', fontSize:'0.78rem', color: yld>7?'#FF9F0A':yld>4?'#30D158':'var(--text-2)', fontWeight:600 }}>{yld.toFixed(1)}%</span>
                        <span style={{ textAlign:'right', fontSize:'0.78rem', color:'#30D158', fontWeight:600 }}><Blur>{fmtEur(gross)}</Blur></span>
                        <span style={{ textAlign:'right', fontSize:'0.78rem', color:'#FF9F0A' }}><Blur>{fmtEur(net)}</Blur></span>
                        <div style={{ textAlign:'right' }}>
                          <span style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-1)' }}>{divPct.toFixed(1)}%</span>
                          <div style={{ height:3, background:'var(--border)', borderRadius:2, marginTop:3 }}>
                            <div style={{ height:'100%', background:'#30D158', borderRadius:2, width:`${Math.min(divPct,100)}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 70px 70px 90px 90px 70px', gap:8,
                    padding:'10px 16px', fontSize:'0.78rem', fontWeight:700, background:'var(--surface-2)' }}>
                    <span>TOTALE</span>
                    <span style={{ textAlign:'right' }}><Blur>{fmtEur(totalVal)}</Blur></span>
                    <span style={{ textAlign:'right' }}>100%</span>
                    <span style={{ textAlign:'right', color: kpis.yieldPct>4?'#30D158':'var(--text-2)' }}>{fmtPct(kpis.yieldPct)}</span>
                    <span style={{ textAlign:'right', color:'#30D158' }}><Blur>{fmtEur(totalGross)}</Blur></span>
                    <span style={{ textAlign:'right', color:'#FF9F0A' }}><Blur>{fmtEur(kpis.annualNet)}</Blur></span>
                    <span style={{ textAlign:'right' }}>100%</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── SIMULATORE ─────────────────────────────────────────────────── */}
          {tab === 'simulator' && (() => {
            const totalVal   = positions.reduce((s,p) => s + (p.currentPrice||0)*(p.shares||0), 0);
            const totalGross = kpis.annualGross;

            // Converti simPositions in posizioni per il calendario
            // shares=1 + DPS=importo annuale: dividendCalendar divide per frequenza autonomamente
            const simAsPositions = simPositions.map(s => ({
              id: `sim_${s.ticker}`, ticker: s.ticker, name: s.name,
              shares: 1,
              currentPrice: parseFloat(s.price) || 1,
              avgCostBasis: parseFloat(s.price) || 1,
              dividendPerShare: (parseFloat(s.amount)||0) * ((parseFloat(s.yieldPct)||0) / 100),
              dividendFrequency: s.frequency,
              paymentMonths: s.months,
              sector: 'Simulato', isETF: false, dividendGrowthRate: 3,
            }));

            const simTotalInvested = simPositions.reduce((s,p) => s + (parseFloat(p.amount)||0), 0);
            const simAnnualGross   = simPositions.reduce((s,p) => s + (parseFloat(p.amount)||0) * ((parseFloat(p.yieldPct)||0)/100), 0);
            const newTotalVal      = totalVal + simTotalInvested;
            const newTotalGross    = totalGross + simAnnualGross;
            const newYield         = newTotalVal > 0 ? newTotalGross/newTotalVal*100 : 0;
            const newMonthly       = newTotalGross / 12 * (1 - taxRate);

            // Calendario simulato
            const allForCal = [...distributingPositions, ...simAsPositions];
            const simCalData = dividendCalendar(allForCal, new Date().getFullYear(), taxRate);

            const addSim = () => {
              if (!simForm.ticker || !simForm.amount || !simForm.yieldPct) return;
              setSimPositions(prev => [...prev, {
                id: Date.now(),
                ticker: simForm.ticker.toUpperCase(),
                name: simForm.name || simForm.ticker.toUpperCase(),
                amount: parseFloat(simForm.amount) || 0,
                price: parseFloat(simForm.price) || 1,
                yieldPct: parseFloat(simForm.yieldPct) || 0,
                frequency: simForm.frequency,
                months: simForm.months,
              }]);
              setSimForm({ ticker:'', name:'', amount:'', price:'', yieldPct:'', frequency:'Quarterly', months:[3,6,9,12] });
            };

            const toggleMonth = (m) => {
              setSimForm(f => ({
                ...f,
                months: f.months.includes(m) ? f.months.filter(x=>x!==m) : [...f.months, m].sort((a,b)=>a-b),
              }));
            };

            return (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

                {/* Before/After KPIs */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:12, alignItems:'center' }}>
                  {/* Before */}
                  <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:16, padding:'16px 20px' }}>
                    <p style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:12 }}>Portafoglio Attuale</p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12 }}>
                      {[
                        { l:'Yield lordo', v: fmtPct(kpis.yieldPct), c:'var(--text-1)', sub:'Pre-tasse' },
                        { l:`Yield netto (${(taxRate*100).toFixed(0)}%)`, v: fmtPct(kpis.yieldPct * (1 - taxRate)), c:'#FF9F0A', sub:'Post-tasse' },
                        { l:'Rendita/mese netta', v: fmtEur(kpis.monthlyNet), c:'#30D158', sub:'Media mensile' },
                        { l:'Dividendi/anno lordi', v: fmtEur(totalGross), c:'#0A84FF', sub:'Totale annuo' },
                      ].map(k => (
                        <div key={k.l}>
                          <p style={{ fontSize:'0.65rem', color:'var(--text-3)', margin:'0 0 2px' }}>{k.l}</p>
                          <p style={{ fontSize:'1rem', fontWeight:700, color:k.c, margin:0 }}><Blur>{k.v}</Blur></p>
                          <p style={{ fontSize:'0.65rem', color:'var(--text-3)', margin:'1px 0 0' }}>{k.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <ArrowRight size={20} color="#0A84FF" />
                    {simPositions.length > 0 && (
                      <span style={{ fontSize:'0.65rem', color:'#FF9F0A', fontWeight:600 }}>+{fmtEur(simTotalInvested)}</span>
                    )}
                  </div>

                  {/* After */}
                  <div style={{
                    background: simPositions.length > 0 ? '#0A84FF0A' : 'var(--card-bg)',
                    border: `1px solid ${simPositions.length > 0 ? '#0A84FF44' : 'var(--border)'}`,
                    borderRadius:16, padding:'16px 20px',
                  }}>
                    <p style={{ fontSize:'0.7rem', fontWeight:600, color: simPositions.length>0?'#0A84FF':'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:12 }}>
                      Con gli acquisti simulati
                    </p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12 }}>
                      {[
                        { l:'Yield lordo', v: simPositions.length>0 ? fmtPct(newYield) : '—',
                          c: simPositions.length>0 ? (newYield > kpis.yieldPct ? '#30D158' : '#FF453A') : 'var(--text-3)',
                          sub: simPositions.length>0 ? `${newYield > kpis.yieldPct ? '+' : ''}${(newYield - kpis.yieldPct).toFixed(2)}% vs ora` : 'Pre-tasse' },
                        { l:`Yield netto (${(taxRate*100).toFixed(0)}%)`,
                          v: simPositions.length>0 ? fmtPct(newYield * (1 - taxRate)) : '—',
                          c: simPositions.length>0 ? '#FF9F0A' : 'var(--text-3)',
                          sub: simPositions.length>0 ? `era ${fmtPct(kpis.yieldPct * (1 - taxRate))}` : 'Post-tasse' },
                        { l:'Rendita/mese netta', v: simPositions.length>0 ? fmtEur(newMonthly) : '—', c:'#30D158',
                          sub: simPositions.length>0 ? `+${fmtEur(newMonthly - kpis.monthlyNet)}/mese` : 'Media mensile' },
                        { l:'Dividendi/anno lordi', v: simPositions.length>0 ? fmtEur(newTotalGross) : '—', c:'#0A84FF',
                          sub: simPositions.length>0 ? `+${fmtEur(simAnnualGross)}/anno` : 'Totale annuo' },
                      ].map(k => (
                        <div key={k.l}>
                          <p style={{ fontSize:'0.65rem', color:'var(--text-3)', margin:'0 0 2px' }}>{k.l}</p>
                          <p style={{ fontSize:'1rem', fontWeight:700, color:k.c, margin:0 }}><Blur>{k.v}</Blur></p>
                          <p style={{ fontSize:'0.65rem', color:'var(--text-3)', margin:'1px 0 0' }}>{k.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Form aggiungi posizione — con ricerca */}
                <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:16, padding:'16px 20px' }}>
                  <p style={{ fontWeight:600, fontSize:'0.88rem', color:'var(--text-1)', marginBottom:14 }}>
                    <PlusCircle size={14} style={{ marginRight:6, verticalAlign:'middle' }} />
                    Cerca e aggiungi posizione ipotetica
                  </p>

                  {/* Search bar */}
                  <div style={{ marginBottom:14 }}>
                    <SimulatorSearch
                      portfolioPositions={positions}
                      onSelect={async r => {
                        const defMonths = r.frequency==='Monthly'?[1,2,3,4,5,6,7,8,9,10,11,12]
                                        : r.frequency==='Quarterly'?[3,6,9,12]
                                        : r.frequency==='SemiAnnual'?[6,12]:[12];
                        const months = r.months?.length > 0 ? r.months : defMonths;

                        // Precompila subito con i dati statici
                        setSimForm(ff => ({
                          ...ff,
                          ticker: r.ticker,
                          name: r.name,
                          price: '',
                          yieldPct: r.yieldPct > 0 ? String(r.yieldPct.toFixed(2)) : '',
                          frequency: r.frequency || 'Quarterly',
                          months,
                        }));

                        // Fetch prezzo live → aggiorna prezzo e ricalcola yield se abbiamo DPS
                        setSimFetchingPrice(true);
                        try {
                          const priceResult = await fetchMultiplePrices([r.ticker]);
                          const livePrice = priceResult?.[r.ticker]?.price;
                          if (livePrice > 0) {
                            // Se abbiamo DPS (azioni), ricalcola yield dal prezzo live
                            const liveYield = r.dps > 0
                              ? ((r.dps / livePrice) * 100).toFixed(2)
                              : r.yieldPct > 0 ? String(r.yieldPct.toFixed(2)) : '';
                            setSimForm(ff => ({
                              ...ff,
                              price: String(livePrice.toFixed(4)),
                              yieldPct: liveYield,
                            }));
                          }
                        } catch { /* usa i dati statici già impostati */ }
                        finally { setSimFetchingPrice(false); }
                      }}
                    />
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                    <p style={{ fontSize:'0.68rem', color:'var(--text-3)', margin:0, flex:1 }}>
                      Database: {Object.keys(STOCK_DB).length} azioni (REIT, BDC, Stocks) + ETF a distribuzione. Seleziona per auto-compilare.
                    </p>
                    {simFetchingPrice && (
                      <span style={{ fontSize:'0.68rem', color:'#0A84FF', display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                        <RefreshCw size={11} style={{ animation:'spin 1s linear infinite' }} /> Caricamento prezzo live…
                      </span>
                    )}
                  </div>
                  </div>

                  {/* Campi form */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:10, marginBottom:12 }}>
                    {[
                      { key:'ticker',   placeholder:'Es. O, ARCC, VHYL', label:'Ticker' },
                      { key:'name',     placeholder:'Nome (opzionale)',   label:'Nome' },
                      { key:'amount',   placeholder:'Importo €',          label:'Importo da investire €', type:'number' },
                      { key:'price',    placeholder:'Prezzo €/azione',    label:'Prezzo corrente', type:'number' },
                      { key:'yieldPct', placeholder:'Es. 5.5',            label:'Yield % annuo atteso', type:'number' },
                    ].map(f => (
                      <div key={f.key}>
                        <p style={{ fontSize:'0.65rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', margin:'0 0 4px' }}>{f.label}</p>
                        <input
                          type={f.type||'text'} placeholder={f.placeholder}
                          value={simForm[f.key] || ''}
                          onChange={e => setSimForm(ff => ({ ...ff, [f.key]: e.target.value }))}
                          style={{ width:'100%', background: simForm[f.key] ? 'var(--surface-2)' : 'var(--surface-2)',
                            border:`1px solid ${simForm[f.key]?'#0A84FF55':'var(--border)'}`,
                            borderRadius:8, padding:'7px 10px', fontSize:'0.82rem', color:'var(--text-1)', outline:'none', boxSizing:'border-box' }}
                        />
                      </div>
                    ))}
                    <div>
                      <p style={{ fontSize:'0.65rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', margin:'0 0 4px' }}>Frequenza</p>
                      <select value={simForm.frequency} onChange={e => {
                        const f = e.target.value;
                        const defMonths = f==='Monthly'?[1,2,3,4,5,6,7,8,9,10,11,12]:f==='Quarterly'?[3,6,9,12]:f==='SemiAnnual'?[6,12]:[12];
                        setSimForm(ff => ({ ...ff, frequency:f, months:defMonths }));
                      }} style={{ width:'100%', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 10px', fontSize:'0.82rem', color:'var(--text-1)' }}>
                        <option value="Monthly">Mensile</option>
                        <option value="Quarterly">Trimestrale</option>
                        <option value="SemiAnnual">Semestrale</option>
                        <option value="Annual">Annuale</option>
                      </select>
                    </div>
                  </div>

                  {/* Mesi pagamento */}
                  {simForm.frequency !== 'Monthly' && (
                    <div style={{ marginBottom:12 }}>
                      <p style={{ fontSize:'0.65rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', margin:'0 0 6px' }}>Mesi di pagamento</p>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {MONTHS_IT.map((m,i) => (
                          <button key={i} onClick={() => toggleMonth(i+1)}
                            style={{ padding:'4px 8px', borderRadius:6, fontSize:'0.72rem', fontWeight:600, cursor:'pointer', border:'none',
                              background: simForm.months.includes(i+1) ? '#0A84FF' : 'var(--surface-2)',
                              color: simForm.months.includes(i+1) ? '#fff' : 'var(--text-3)' }}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview prima di aggiungere */}
                  {simForm.ticker && simForm.amount && simForm.yieldPct && (
                    <div style={{ marginBottom:12, padding:'8px 12px', background:'#30D15810', borderRadius:8, border:'1px solid #30D15830', fontSize:'0.78rem', color:'var(--text-2)' }}>
                      📊 Preview: <strong>{simForm.ticker}</strong> — {fmtEur(parseFloat(simForm.amount)||0)} × {simForm.yieldPct}% =&nbsp;
                      <strong style={{ color:'#30D158' }}>{fmtEur((parseFloat(simForm.amount)||0)*(parseFloat(simForm.yieldPct)||0)/100)}/anno</strong>
                      &nbsp;·&nbsp;
                      <strong style={{ color:'#FF9F0A' }}>{fmtEur((parseFloat(simForm.amount)||0)*(parseFloat(simForm.yieldPct)||0)/100/12)}/mese</strong>
                    </div>
                  )}

                  <button onClick={addSim} disabled={!simForm.ticker||!simForm.amount||!simForm.yieldPct}
                    style={{ padding:'8px 20px', background: simForm.ticker&&simForm.amount&&simForm.yieldPct?'#0A84FF':'var(--surface-2)',
                      border:'none', borderRadius:10, color: simForm.ticker&&simForm.amount&&simForm.yieldPct?'#fff':'var(--text-3)',
                      fontSize:'0.82rem', fontWeight:600, cursor: simForm.ticker&&simForm.amount&&simForm.yieldPct?'pointer':'default' }}>
                    + Aggiungi alla simulazione
                  </button>
                </div>

                {/* Lista posizioni simulate */}
                {simPositions.length > 0 && (
                  <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
                    <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontWeight:600, fontSize:'0.85rem' }}>Posizioni simulate ({simPositions.length})</span>
                      <button onClick={() => setSimPositions([])} style={{ fontSize:'0.72rem', color:'#FF453A', background:'none', border:'none', cursor:'pointer' }}>Rimuovi tutte</button>
                    </div>
                    {simPositions.map(p => (
                      <div key={p.id} style={{ display:'grid', gridTemplateColumns:'1fr 80px 70px 70px 70px 36px', gap:8, padding:'10px 16px', borderBottom:'1px solid var(--border)', alignItems:'center', fontSize:'0.82rem' }}>
                        <div>
                          <span style={{ fontWeight:700 }}>{p.ticker}</span>
                          <span style={{ color:'var(--text-3)', marginLeft:8, fontSize:'0.72rem' }}>{p.name}</span>
                        </div>
                        <span style={{ textAlign:'right', color:'var(--text-1)' }}>{fmtEur(p.amount)}</span>
                        <span style={{ textAlign:'right', color:'#30D158', fontWeight:600 }}>{p.yieldPct}%</span>
                        <span style={{ textAlign:'right', color:'#30D158' }}>{fmtEur(p.amount*(p.yieldPct/100))}/a</span>
                        <span style={{ textAlign:'right', color:'#FF9F0A', fontSize:'0.72rem' }}>{p.frequency}</span>
                        <button onClick={() => setSimPositions(prev => prev.filter(x=>x.id!==p.id))}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'#FF453A', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Impatto sul peso del portafoglio ── */}
                {simPositions.length > 0 && (() => {
                  const currentTotal  = positions.reduce((s,p) => s + (p.currentPrice||0)*(p.shares||0), 0);
                  const newTotal      = currentTotal + simTotalInvested;
                  const simAnnualByTicker = {};
                  simPositions.forEach(s => { simAnnualByTicker[s.ticker] = (parseFloat(s.amount)||0) * ((parseFloat(s.yieldPct)||0)/100); });

                  // Mappa ticker → importo simulato aggiuntivo
                  const simByTicker = {};
                  simPositions.forEach(s => {
                    const t = s.ticker.toUpperCase();
                    if (!simByTicker[t]) simByTicker[t] = { amount:0, gross:0, name:s.name };
                    simByTicker[t].amount += parseFloat(s.amount)||0;
                    simByTicker[t].gross  += (parseFloat(s.amount)||0)*((parseFloat(s.yieldPct)||0)/100);
                  });

                  // Yield simulato per ticker (da simPositions)
                  const simYieldByTicker = {};
                  simPositions.forEach(s => {
                    const t = s.ticker.toUpperCase();
                    if (!simYieldByTicker[t]) simYieldByTicker[t] = parseFloat(s.yieldPct)||0;
                  });

                  // Posizioni reali — con eventuale merge dell'aggiunta simulata
                  const coveredTickers = new Set();
                  const realRows = positions
                    .map(p => {
                      const t       = p.ticker.toUpperCase();
                      coveredTickers.add(t);
                      const valReal = (p.currentPrice||0)*(p.shares||0);
                      const simAdd  = simByTicker[t];
                      const valSim  = simAdd ? simAdd.amount : 0;
                      const valNew  = valReal + valSim;
                      const oldW    = currentTotal > 0 ? valReal/currentTotal*100 : 0;
                      const newW    = newTotal     > 0 ? valNew/newTotal*100      : 0;
                      const grossReal  = annualGross(p);
                      const grossSim   = simAdd ? simAdd.gross : 0;
                      const grossNew   = grossReal + grossSim;
                      const newTotalGross = kpis.annualGross + simAnnualGross;
                      const oldDiv  = kpis.annualGross > 0 ? grossReal/kpis.annualGross*100 : 0;
                      const newDiv  = newTotalGross > 0 ? grossNew/newTotalGross*100 : 0;
                      const yieldNow = valReal > 0 ? (grossReal / valReal) * 100 : 0;
                      const yieldNew = valNew  > 0 ? (grossNew  / valNew)  * 100 : 0;
                      return { ticker:p.ticker, name:p.name||p.ticker, valReal, valSim, valNew, oldW, newW, grossReal, grossSim, oldDiv, newDiv, yieldNow, yieldNew, isSim:false, hasAdd: valSim > 0 };
                    })
                    .sort((a,b) => b.valNew - a.valNew);

                  // Posizioni simulate su ticker NON ancora in portafoglio
                  const newSimRows = simPositions
                    .filter(s => !coveredTickers.has(s.ticker.toUpperCase()))
                    .reduce((acc, s) => {
                      const t = s.ticker.toUpperCase();
                      const existing = acc.find(r => r.ticker.toUpperCase() === t);
                      if (existing) {
                        existing.valSim   += parseFloat(s.amount)||0;
                        existing.valNew   += parseFloat(s.amount)||0;
                        existing.grossSim += (parseFloat(s.amount)||0)*((parseFloat(s.yieldPct)||0)/100);
                        existing.yieldNew  = existing.valNew > 0 ? (existing.grossSim / existing.valNew)*100 : 0;
                      } else {
                        const val   = parseFloat(s.amount)||0;
                        const gross = val*((parseFloat(s.yieldPct)||0)/100);
                        const newTotalGross = kpis.annualGross + simAnnualGross;
                        const yieldNew = parseFloat(s.yieldPct)||0;
                        acc.push({ ticker:s.ticker, name:s.name, valReal:0, valSim:val, valNew:val, oldW:0, newW: newTotal>0?val/newTotal*100:0, grossReal:0, grossSim:gross, oldDiv:0, newDiv: newTotalGross>0?gross/newTotalGross*100:0, yieldNow:0, yieldNew, isSim:true, hasAdd:true });
                      }
                      return acc;
                    }, []);

                  const allRows = [...realRows, ...newSimRows];

                  return (
                    <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
                      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                        <div>
                          <p style={{ fontWeight:600, fontSize:'0.88rem', color:'var(--text-1)', margin:0 }}>Impatto sul portafoglio</p>
                          <p style={{ fontSize:'0.72rem', color:'var(--text-3)', margin:'2px 0 0' }}>Come cambia il peso % di ogni posizione con i nuovi acquisti</p>
                        </div>
                        <div style={{ display:'flex', gap:16, fontSize:'0.72rem' }}>
                          <span style={{ color:'var(--text-3)' }}>Valore attuale: <strong style={{ color:'var(--text-1)' }}>{fmtEur(currentTotal)}</strong></span>
                          <span style={{ color:'var(--text-3)' }}>→ Dopo: <strong style={{ color:'#0A84FF' }}>{fmtEur(newTotal)}</strong></span>
                        </div>
                      </div>

                      {/* Header */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 110px 70px 70px 60px 70px 70px', gap:8,
                        padding:'8px 18px', fontSize:'0.62rem', fontWeight:600, color:'var(--text-3)',
                        textTransform:'uppercase', letterSpacing:'0.04em', borderBottom:'1px solid var(--border)' }}>
                        <span>Posizione</span>
                        <span style={{ textAlign:'right' }}>Valore</span>
                        <span style={{ textAlign:'right' }}>Peso ora</span>
                        <span style={{ textAlign:'right' }}>Peso dopo</span>
                        <span style={{ textAlign:'right' }}>Δ Peso</span>
                        <span style={{ textAlign:'right' }}>Yield L/N</span>
                        <span style={{ textAlign:'right' }}>% Div.</span>
                      </div>

                      {allRows.map((r, i) => {
                        const delta = r.newW - r.oldW;
                        return (
                          <div key={r.ticker+i} style={{
                            display:'grid', gridTemplateColumns:'1fr 110px 70px 70px 60px 70px 70px', gap:8,
                            padding:'9px 18px', borderBottom:'1px solid var(--border)', alignItems:'center',
                            background: r.hasAdd ? (r.isSim ? '#FF9F0A06' : '#30D15806') : 'transparent',
                          }}>
                            {/* Nome */}
                            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                              {r.isSim  && <span style={{ fontSize:'0.58rem', background:'#FF9F0A22', color:'#FF9F0A', padding:'1px 5px', borderRadius:4, fontWeight:700, flexShrink:0 }}>NUOVO</span>}
                              {r.hasAdd && !r.isSim && <span style={{ fontSize:'0.58rem', background:'#30D15822', color:'#30D158', padding:'1px 5px', borderRadius:4, fontWeight:700, flexShrink:0 }}>+AGGIUNTA</span>}
                              <div>
                                <span style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--text-1)' }}>{r.ticker}</span>
                                <span style={{ fontSize:'0.68rem', color:'var(--text-3)', marginLeft:6 }}>{r.name !== r.ticker ? r.name.slice(0,20) : ''}</span>
                              </div>
                            </div>

                            {/* Valore: mostra prima/dopo se c'è aggiunta */}
                            <div style={{ textAlign:'right' }}>
                              {r.hasAdd && r.valReal > 0 ? (
                                <>
                                  <span style={{ fontSize:'0.68rem', color:'var(--text-3)', display:'block' }}>{fmtEur(r.valReal)}</span>
                                  <span style={{ fontSize:'0.78rem', fontWeight:600, color:'#30D158' }}>{fmtEur(r.valNew)} <span style={{ fontSize:'0.65rem', color:'#30D158' }}>(+{fmtEur(r.valSim)})</span></span>
                                </>
                              ) : (
                                <span style={{ fontSize:'0.78rem', color:'var(--text-2)' }}>{fmtEur(r.valNew)}</span>
                              )}
                            </div>

                            {/* Peso ora */}
                            <div style={{ textAlign:'right' }}>
                              <span style={{ fontSize:'0.78rem', color: r.isSim ? 'var(--text-3)' : 'var(--text-2)' }}>
                                {r.isSim ? '—' : r.oldW.toFixed(1)+'%'}
                              </span>
                              {!r.isSim && <div style={{ height:3, background:'var(--border)', borderRadius:2, marginTop:2 }}>
                                <div style={{ height:'100%', background:'#0A84FF55', borderRadius:2, width:`${Math.min(r.oldW,100)}%` }} />
                              </div>}
                            </div>

                            {/* Peso dopo */}
                            <div style={{ textAlign:'right' }}>
                              <span style={{ fontSize:'0.78rem', fontWeight:600, color: r.hasAdd ? '#30D158' : '#0A84FF' }}>
                                {r.newW.toFixed(1)}%
                              </span>
                              <div style={{ height:3, background:'var(--border)', borderRadius:2, marginTop:2 }}>
                                <div style={{ height:'100%', background: r.hasAdd?'#30D158':'#0A84FF55', borderRadius:2, width:`${Math.min(r.newW,100)}%` }} />
                              </div>
                            </div>

                            {/* Delta */}
                            <span style={{ textAlign:'right', fontSize:'0.78rem', fontWeight:600,
                              color: r.isSim ? '#FF9F0A' : delta > 0.01 ? '#30D158' : delta < -0.01 ? '#FF453A' : 'var(--text-3)' }}>
                              {r.isSim ? `+${r.newW.toFixed(1)}%` : (delta >= 0 ? '+' : '')+delta.toFixed(1)+'%'}
                            </span>

                            {/* Yield lordo / netto */}
                            <div style={{ textAlign:'right' }}>
                              {r.yieldNew > 0 ? (
                                <>
                                  {r.hasAdd && r.yieldNow > 0 && !r.isSim && (
                                    <span style={{ fontSize:'0.62rem', color:'var(--text-3)', display:'block', textDecoration:'line-through' }}>
                                      {r.yieldNow.toFixed(1)}%
                                    </span>
                                  )}
                                  <span style={{ fontSize:'0.75rem', color:'var(--text-3)', display:'block' }}>
                                    {r.yieldNew.toFixed(1)}%
                                  </span>
                                  <span style={{ fontSize:'0.72rem', fontWeight:600, color:'#FF9F0A' }}>
                                    {(r.yieldNew * (1 - taxRate)).toFixed(1)}% n
                                  </span>
                                </>
                              ) : <span style={{ fontSize:'0.72rem', color:'var(--text-3)' }}>—</span>}
                            </div>

                            {/* % dividendi */}
                            <span style={{ textAlign:'right', fontSize:'0.78rem', color: r.newDiv > 10 ? '#30D158' : 'var(--text-2)', fontWeight: r.newDiv > 10 ? 600 : 400 }}>
                              {r.newDiv.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}

                      {/* Totale — yield medio ponderato */}
                      {(() => {
                        const wtdYield = newTotal > 0
                          ? allRows.reduce((s,r) => s + (r.yieldNew||0) * r.valNew, 0) / newTotal
                          : 0;
                        return (
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 110px 70px 70px 60px 70px 70px', gap:8,
                            padding:'9px 18px', background:'var(--surface-2)', fontSize:'0.78rem', fontWeight:700 }}>
                            <span>TOTALE</span>
                            <span style={{ textAlign:'right' }}>{fmtEur(newTotal)}</span>
                            <span style={{ textAlign:'right', color:'var(--text-3)' }}>100%</span>
                            <span style={{ textAlign:'right', color:'#0A84FF' }}>100%</span>
                            <span />
                            <div style={{ textAlign:'right' }}>
                              <span style={{ fontSize:'0.72rem', color:'var(--text-3)', display:'block' }}>{wtdYield.toFixed(2)}%</span>
                              <span style={{ fontSize:'0.72rem', fontWeight:700, color:'#FF9F0A' }}>{(wtdYield*(1-taxRate)).toFixed(2)}% n</span>
                            </div>
                            <span style={{ textAlign:'right', color:'#30D158' }}>100%</span>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* Calendario simulato — cliccabile */}
                {simPositions.length > 0 && (
                  <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:16, padding:'16px 20px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4, flexWrap:'wrap', gap:8 }}>
                      <p style={{ fontWeight:600, fontSize:'0.88rem', color:'var(--text-1)', margin:0 }}>Calendario con acquisti simulati</p>
                      <span style={{ fontSize:'0.7rem', color:'var(--text-3)' }}>
                        Totale simulato: <strong style={{ color:'#30D158' }}><Blur>{fmtEur(simCalData.reduce((s,m)=>s+m.totalGross,0))}</Blur></strong>/anno
                      </span>
                    </div>
                    <p style={{ fontSize:'0.72rem', color:'var(--text-3)', marginBottom:14 }}>
                      🟠 Contributo aggiuntivo simulato · Clicca un mese per il dettaglio
                    </p>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px,1fr))', gap:8 }}>
                      {simCalData.map((m, i) => {
                        const realGross = calData[i]?.totalGross || 0;
                        const simGross  = m.totalGross - realGross;
                        const hasEvents = m.events.length > 0;
                        const isSelected = selectedSimMonthIdx === i;
                        return (
                          <div
                            key={i}
                            onClick={hasEvents ? () => setSelectedSimMonthIdx(isSelected ? null : i) : undefined}
                            style={{
                              background: isSelected ? 'var(--surface-2)' : 'var(--surface-2)',
                              borderRadius:12,
                              border: `1px solid ${isSelected ? '#FF9F0A' : simGross > 0.01 ? '#FF9F0A44' : 'var(--border)'}`,
                              padding:'10px 12px', opacity: hasEvents ? 1 : 0.4,
                              cursor: hasEvents ? 'pointer' : 'default',
                              transition: 'border-color 0.15s',
                            }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                              <span style={{ fontSize:'0.72rem', fontWeight:600, color: isSelected ? '#FF9F0A' : 'var(--text-2)' }}>{MONTHS_IT_FULL[i]}</span>
                              {hasEvents && <span style={{ fontSize:'0.72rem', fontWeight:700, color:'#30D158' }}><Blur>{fmtEur(m.totalGross)}</Blur></span>}
                            </div>
                            {simGross > 0.01 && (
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.68rem', background:'#FF9F0A18', borderRadius:6, padding:'3px 6px', marginBottom:4 }}>
                                <span style={{ color:'#FF9F0A' }}>+ sim</span>
                                <span style={{ color:'#FF9F0A', fontWeight:600 }}><Blur>+{fmtEur(simGross)}</Blur></span>
                              </div>
                            )}
                            {m.events.slice(0,3).map((ev,j) => (
                              <div key={j} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.68rem', color:'var(--text-3)', marginBottom:2 }}>
                                <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                                  <span style={{ width:5, height:5, borderRadius:'50%', background: ev.pos.sector==='Simulato'?'#FF9F0A':'#0A84FF', flexShrink:0 }} />
                                  {ev.pos.ticker}
                                </span>
                                <span><Blur>{fmtEur(ev.gross)}</Blur></span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>

                    {/* Pannello dettaglio mese simulato */}
                    {selectedSimMonthIdx !== null && simCalData[selectedSimMonthIdx]?.events.length > 0 && (
                      <MonthDetailPanel
                        monthData={simCalData[selectedSimMonthIdx]}
                        monthIndex={selectedSimMonthIdx}
                        year={new Date().getFullYear()}
                        taxRate={taxRate}
                        totalPortfolioValue={kpis.totalValue}
                        overrideTitle={`${MONTHS_IT_FULL[selectedSimMonthIdx]} — Simulazione`}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── POSIZIONI ──────────────────────────────────────────────────── */}
          {tab === 'positions' && (
            <div style={{ background:'var(--card-bg)', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden' }}>
              <div style={{ padding:'1.1rem 1.25rem', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <Table2 size={15} color="#0A84FF" />
                <span style={{ fontSize:'0.88rem', fontWeight:600 }}>
                  {positions.length} posizioni · clicca intestazione per ordinare
                </span>
                <div style={{ marginLeft:'auto' }}>
                  <span style={{ fontSize:'0.72rem', color:'var(--text-3)' }}>
                    Lordo totale: <Blur>{fmtEur(kpis.annualGross)}/anno</Blur>
                  </span>
                </div>
              </div>
              <PositionsTable positions={positions} prices={prices} onEdit={handleEdit} />
              <div style={{ padding:'0.75rem 1.25rem', borderTop:'1px solid var(--border)', fontSize:'0.72rem', color:'var(--text-3)' }}>
                Usa ⚙️ per configurare DPS, CAGR, moat per ciascuna posizione. Per gli ETF il DPS viene calcolato da yield × prezzo corrente.
              </div>
            </div>
          )}

          {/* ── PROIEZIONI ─────────────────────────────────────────────────── */}
          {tab === 'projections' && (
            <>
              {distributingPositions.length === 0 ? (
                <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-3)' }}>
                  Nessuna posizione distribuente. Aggiungi ETF a distribuzione o azioni con DPS configurato.
                </div>
              ) : (
                <>
                  {/* Controls */}
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <span style={{ fontSize:'0.78rem', color:'var(--text-3)', fontWeight:500 }}>Orizzonte:</span>
                      {YEAR_OPTS.map(y => (
                        <button key={y} onClick={() => setProjYears(y)} style={{
                          padding:'0.3rem 0.65rem', borderRadius:8, border:'1px solid var(--border)',
                          cursor:'pointer', fontSize:'0.75rem', fontWeight:500,
                          background: projYears===y ? '#0A84FF' : 'var(--bg)',
                          color: projYears===y ? '#fff' : 'var(--text-2)',
                        }}>{y}a</button>
                      ))}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <span style={{ fontSize:'0.78rem', color:'var(--text-3)', fontWeight:500 }}>Target YoC:</span>
                      {[4,5,6,7,8,10].map(v => (
                        <button key={v} onClick={() => setTargetYoc(v)} style={{
                          padding:'0.3rem 0.65rem', borderRadius:8, border:'1px solid var(--border)',
                          cursor:'pointer', fontSize:'0.75rem', fontWeight:500,
                          background: targetYoc===v ? '#BF5AF2' : 'var(--bg)',
                          color: targetYoc===v ? '#fff' : 'var(--text-2)',
                        }}>{v}%</button>
                      ))}
                    </div>
                    <span style={{ fontSize:'0.72rem', color:'var(--text-3)', marginLeft:'auto' }}>
                      {distributingPositions.length} posizioni distribuenti · {positions.filter(p=>p.isETF&&p.dividendPerShare>0).length} ETF · {stockPositions.filter(p=>p.dividendPerShare>0).length} azioni
                    </span>
                  </div>

                  <YocChart projection={projection} targetYoc={targetYoc} />
                  <IncomeProjectionChart projection={incomeProj} />

                  {/* Milestones */}
                  <div style={{ background:'var(--card-bg)', borderRadius:14, border:'1px solid var(--border)', padding:'1.25rem' }}>
                    <div style={{ fontSize:'0.85rem', fontWeight:600, marginBottom:'1rem' }}>Milestone rendita netta</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:'0.75rem' }}>
                      {[500, 1000, 2000, 3000].map(target => {
                        const found = incomeProj.find(d => d.monthlyNet >= target);
                        return (
                          <div key={target} style={{ background:'var(--bg)', borderRadius:12, padding:'0.85rem 1rem', textAlign:'center' }}>
                            <div style={{ fontSize:'0.68rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', marginBottom:'0.3rem' }}>
                              {fmtEur(target)}/mese netti
                            </div>
                            <div style={{ fontSize:'1.1rem', fontWeight:700, color: found ? '#30D158' : 'var(--text-3)' }}>
                              {found ? found.year : '> '+(currentYear+projYears)}
                            </div>
                            <div style={{ fontSize:'0.68rem', color:'var(--text-3)', marginTop:'0.2rem' }}>
                              {found ? `fra ${found.year - currentYear} anni` : 'fuori orizzonte'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── ANALISI ────────────────────────────────────────────────────── */}
          {tab === 'analysis' && (
            <>
              {stockPositions.length > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0.75rem 1rem', borderRadius:10, background:'rgba(10,132,255,0.06)', border:'1px solid rgba(10,132,255,0.2)', fontSize:'0.78rem', color:'var(--text-3)' }}>
                  <Info size={13} color="#0A84FF" />
                  Analisi Buffett-Lynch su {stockPositions.length} {stockPositions.length===1?'azione':'azioni'} — gli ETF non sono inclusi.
                  {positions.filter(p=>p.isETF).length > 0 && ` (${positions.filter(p=>p.isETF).length} ETF esclusi)`}
                </div>
              )}
              <AnalysisTab positions={stockPositions} prices={prices} />
            </>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && editingPos && (
        <MetadataModal
          position={editingPos}
          onSave={handleSaveMeta}
          onClose={() => { setShowModal(false); setEditingPos(null); }}
        />
      )}
    </div>
  );
}
