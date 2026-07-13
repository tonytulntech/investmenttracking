import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Globe, DollarSign, BarChart2, TrendingUp, AlertCircle,
  RefreshCw, ChevronDown, ChevronUp, Info, Layers, Zap, List,
  Target, CheckCircle2, ChevronRight, Receipt, TrendingDown,
  Wallet, PiggyBank, ExternalLink, GitMerge, Activity, X, History,
} from 'lucide-react';
import { fetchMultipleHistoricalPrices, buildMonthlyPriceTable } from '../services/historicalPriceService';
import { calculatePortfolio, getTransactions } from '../services/localStorageService';
import { getCachedPrices } from '../services/priceCache';
import { fetchMultiplePrices } from '../services/priceService';
import { classifyHolding } from '../services/classificationService';
import { reportTickers } from '../services/tickerReportService';
import {
  aggregatePortfolioComposition,
  aggregateTopHoldings,
  getCompositionProfile,
  getSubCategory,
  MICRO_SUB_CATEGORIES,
  ACWI_REFERENCE,
  MSCI_WORLD_SECTORS_REFERENCE,
  getTerForTicker,
} from '../data/etfComposition';
import { Blur } from '../context/PrivacyContext';
import {
  getPortfolioConfig,
  MACRO_CATEGORIES,
  calcMacroAllocation,
  calcRebalancing,
} from '../services/portfolioConfigService';
import {
  initRemoteDB,
  getMissingTickers,
  getRemoteProfile,
  getRemoteTer,
  getDBCacheInfo,
  forceRefreshRemoteDB,
  setTickerAlias,
  getTickerAliases,
} from '../services/etfDatabaseService';
import {
  resolveUnknownTicker,
  EXCHANGE_METADATA,
} from '../services/tickerResolutionService';

// ── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = [
  '#0A84FF', '#30D158', '#FF9F0A', '#FF453A', '#BF5AF2',
  '#32ADE6', '#FFD60A', '#FF6961', '#4CD964', '#5AC8FA',
  '#0A84FFaa', '#30D158aa', '#FF9F0Aaa',
];

// ── Factor definitions ───────────────────────────────────────────────────────
const FACTOR_DEFS = [
  { key: 'value',    label: 'Value',    desc: 'Titoli a basso P/E e P/B' },
  { key: 'growth',   label: 'Growth',   desc: 'Alta crescita di utili/ricavi' },
  { key: 'momentum', label: 'Momentum', desc: 'Performance recente elevata' },
  { key: 'quality',  label: 'Quality',  desc: 'Alta redditività, basso debito' },
  { key: 'size',     label: 'Size',     desc: 'Small cap (+) vs Large cap (–)' },
  { key: 'lowVol',   label: 'Low Vol',  desc: 'Bassa volatilità storica' },
  { key: 'yield',    label: 'Yield',    desc: 'Alto dividendo' },
];

// ── Components ───────────────────────────────────────────────────────────────

function DonutChart({ data, nameKey, valueKey }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data} dataKey={valueKey} nameKey={nameKey}
            cx="50%" cy="50%" innerRadius={64} outerRadius={100}
            paddingAngle={1.5} startAngle={90} endAngle={-270}
            isAnimationActive={false}
          >
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip
            formatter={v => [`${Number(v).toFixed(1)}%`]}
            contentStyle={{
              background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-brd)',
              borderRadius: 10, fontSize: 12, color: 'var(--tooltip-color)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ItemList({ items, labelKey, pctKey, initialShow = 8, onRowClick, activeKey }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initialShow);
  const max = items[0]?.[pctKey] ?? 100;
  return (
    <div>
      {visible.map((item, i) => {
        const isActive = activeKey != null && (item[labelKey] === activeKey || item.code === activeKey || item.name === activeKey || item.country === activeKey);
        return (
        <div key={i} style={{ marginBottom: 8, borderRadius: 8, cursor: onRowClick ? 'pointer' : 'default',
          background: isActive ? 'rgba(10,132,255,0.10)' : 'transparent',
          border: isActive ? '1px solid rgba(10,132,255,0.28)' : '1px solid transparent',
          padding: isActive ? '6px 8px' : '0', transition: 'all 0.15s',
        }}
          onClick={() => onRowClick?.(item)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{item[labelKey]}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: PALETTE[i % PALETTE.length] }}>
              {Number(item[pctKey]).toFixed(1)}%
            </span>
            {onRowClick && <ChevronRight size={12} style={{ color: 'var(--analysis-dim)', opacity: isActive ? 1 : 0.4 }} />}
            </div>
          </div>
          <div style={{ height: 4, background: 'var(--analysis-subtle-brd)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.min((item[pctKey] / max) * 100, 100)}%`,
              background: PALETTE[i % PALETTE.length], borderRadius: 2, transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
        );
      })}
      {items.length > initialShow && (
        <button onClick={() => setExpanded(v => !v)} style={{
          width: '100%', marginTop: 8, padding: '7px 12px', borderRadius: 8,
          background: 'var(--analysis-dim-bg)', border: '1px solid var(--analysis-dim-brd)',
          color: 'var(--analysis-dim)', fontSize: '0.78rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          {expanded ? <><ChevronUp size={13} /> Mostra meno</> : <><ChevronDown size={13} /> Mostra tutti ({items.length})</>}
        </button>
      )}
    </div>
  );
}

function DrillDownPanel({ data, label, totalPct, totalValue, onClose }) {
  const maxContrib = data[0]?.contributionPct || 1;
  const sliceEur = (totalPct / 100) * totalValue;
  return (
    <div style={{
      marginTop: 20, padding: '16px 18px', borderRadius: 14,
      background: 'rgba(10,132,255,0.06)', border: '1px solid rgba(10,132,255,0.22)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--analysis-dim)', marginBottom: 3 }}>
            Chi contribuisce a
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)' }}>
            {label}
            <span style={{ marginLeft: 10, fontSize: '0.85rem', fontWeight: 600, color: '#0A84FF' }}>
              {totalPct.toFixed(1)}% del portafoglio
            </span>
            <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--analysis-dim)' }}>
              ≈ €{sliceEur.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--analysis-dim)', padding: 4, borderRadius: 6,
        }}>
          <X size={15} />
        </button>
      </div>

      {(label === 'Altri' || label === 'Altri minori') && (
        <div style={{ marginBottom: 14, padding: '9px 12px', borderRadius: 8, background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.22)', fontSize: '0.75rem', color: '#FF9F0A', lineHeight: 1.5 }}>
          <strong>Cos'è "Altri"?</strong> Ogni ETF pubblica solo i top 10–15 paesi e aggrega il resto in un unico bucket.
          Di seguito vedi <em>quali tuoi ETF</em> contribuiscono a questa quota residuale, ma non i singoli paesi sottostanti.
          Per avere più dettaglio, aggiorna il profilo ETF con la lista completa dei paesi.
        </div>
      )}
      {data.length === 0 ? (
        <div style={{ fontSize: '0.8rem', color: 'var(--analysis-dim)', padding: '8px 0' }}>
          Nessun titolo mappato contribuisce a questa voce.
        </div>
      ) : (
        <>
          {data.map((row, i) => {
            const pctOfSlice = totalPct > 0 ? (row.contributionPct / totalPct) * 100 : 0;
            return (
              <div key={row.ticker} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-1)' }}>{row.ticker}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--analysis-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)' }}>{pctOfSlice.toFixed(0)}% del segmento</span>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: PALETTE[i % PALETTE.length] }}>
                      {row.contributionPct.toFixed(2)}%
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--analysis-faint)', minWidth: 64, textAlign: 'right' }}>
                      €{row.eur.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
                <div style={{ height: 3, background: 'var(--analysis-subtle-brd)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min((row.contributionPct / maxContrib) * 100, 100)}%`,
                    background: PALETTE[i % PALETTE.length], borderRadius: 2,
                  }} />
                </div>
              </div>
            );
          })}
          <div style={{
            marginTop: 8, padding: '8px 12px', borderRadius: 8,
            background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)',
            fontSize: '0.72rem', color: 'var(--analysis-dim)',
            display: 'flex', gap: 16, flexWrap: 'wrap',
          }}>
            <span>{data.length} posizion{data.length === 1 ? 'e contribuisce' : 'i contribuiscono'}</span>
            <span>·</span>
            <span>Totale mappato: {data.reduce((s, r) => s + r.contributionPct, 0).toFixed(1)}% del portafoglio</span>
          </div>
        </>
      )}
    </div>
  );
}

function CoverageBar({ pct, label }) {
  const color = pct >= 80 ? '#30D158' : pct >= 50 ? '#FF9F0A' : '#FF453A';
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 5 }}>
        <span style={{ color: 'var(--analysis-dim)' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--analysis-subtle-brd)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
      fontSize: '0.8125rem', fontWeight: active ? 600 : 400,
      background: active ? 'rgba(10,132,255,0.18)' : 'transparent',
      border: active ? '1px solid rgba(10,132,255,0.30)' : '1px solid transparent',
      color: active ? 'var(--analysis-tab-active)' : 'var(--analysis-tab-color)',
      transition: 'all 0.15s ease',
    }}>
      <Icon size={14} style={{ color: active ? '#0A84FF' : 'inherit' }} />
      {label}
    </button>
  );
}

// ── ETF Detail Modal ─────────────────────────────────────────────────────────

const ASSET_TYPE_LABELS = {
  equity: { label: 'Azionario', color: '#0A84FF' },
  bond: { label: 'Obbligazionario', color: '#30D158' },
  commodity: { label: 'Commodity', color: '#FF9F0A' },
  crypto: { label: 'Crypto', color: '#BF5AF2' },
  'money-market': { label: 'Monetario', color: '#64D2FF' },
  'real-estate': { label: 'Real Estate', color: '#32ADE6' },
  'multi-asset': { label: 'Multi-Asset', color: '#FFD60A' },
};

function HBar({ label, pct, color = '#0A84FF', maxPct = 100 }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{label}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-1)', flexShrink: 0 }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--analysis-subtle-brd)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min((pct / maxPct) * 100, 100)}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

function FactorMiniBar({ label, value }) {
  // value in [-2, +2], center = 0
  const pct = ((value + 2) / 4) * 100; // map to 0–100%
  const color = value > 0.15 ? '#30D158' : value < -0.15 ? '#FF453A' : 'var(--analysis-dim)';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 36px', alignItems: 'center', gap: 8, marginBottom: 5 }}>
      <span style={{ fontSize: '0.71rem', color: 'var(--analysis-dim)', textAlign: 'right' }}>{label}</span>
      <div style={{ position: 'relative', height: 6, background: 'var(--analysis-subtle-brd)', borderRadius: 3 }}>
        {/* center line */}
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: 'var(--analysis-faint)' }} />
        {/* marker */}
        <div style={{
          position: 'absolute', top: '50%', left: `${pct}%`,
          transform: 'translate(-50%, -50%)',
          width: 8, height: 8, borderRadius: '50%', background: color,
          boxShadow: `0 0 4px ${color}88`,
        }} />
      </div>
      <span style={{ fontSize: '0.71rem', fontWeight: 700, color, textAlign: 'right' }}>
        {value > 0 ? '+' : ''}{value.toFixed(1)}
      </span>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ETFDetailModal({ ticker, name, onClose }) {
  const profile = getRemoteProfile(ticker);
  const ter = getRemoteTer(ticker);
  const typeInfo = ASSET_TYPE_LABELS[profile?.assetType] ?? { label: profile?.assetType ?? '—', color: '#888' };

  const FACTOR_NAMES = { value:'Value', growth:'Growth', momentum:'Momentum', quality:'Quality', size:'Size', lowVol:'Low Vol', yield:'Yield' };

  // Close on Escape key
  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <div style={{
        position: 'relative', width: 400, maxWidth: '92vw', height: '100vh',
        background: 'var(--card)', borderLeft: '1px solid var(--analysis-subtle-brd)',
        overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0,
        animation: 'slideInRight 0.22s ease',
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(30px); opacity:0 } to { transform: translateX(0); opacity:1 } }`}</style>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--analysis-subtle-brd)', position: 'sticky', top: 0, background: 'var(--card)', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || ticker}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--analysis-dim)', marginTop: 2, fontFamily: 'monospace', letterSpacing: '0.02em' }}>{ticker}</div>
            </div>
            <button onClick={onClose} style={{ background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)', borderRadius: 8, cursor: 'pointer', padding: '6px 8px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <X size={16} color="var(--analysis-dim)" />
            </button>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: `${typeInfo.color}22`, color: typeInfo.color, border: `1px solid ${typeInfo.color}44` }}>
              {typeInfo.label}
            </span>
            {ter != null && (
              <span style={{
                fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                background: ter === 0 ? 'rgba(48,209,88,0.15)' : ter <= 0.20 ? 'rgba(48,209,88,0.12)' : ter <= 0.40 ? 'rgba(255,159,10,0.12)' : 'rgba(255,69,58,0.12)',
                color: ter === 0 ? '#30D158' : ter <= 0.20 ? '#30D158' : ter <= 0.40 ? '#FF9F0A' : '#FF453A',
                border: `1px solid ${ter === 0 ? '#30D15844' : ter <= 0.20 ? '#30D15844' : ter <= 0.40 ? '#FF9F0A44' : '#FF453A44'}`,
              }}>
                {ter === 0 ? 'Stock · TER 0%' : `TER ${ter.toFixed(2)}%`}
              </span>
            )}
            {profile?.numHoldings && (
              <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: 'var(--analysis-subtle-bg)', color: 'var(--analysis-dim)', border: '1px solid var(--analysis-subtle-brd)' }}>
                {profile.numHoldings.toLocaleString()} holdings
              </span>
            )}
            {profile?._isDirectStock && (
              <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: 'rgba(191,90,242,0.12)', color: '#BF5AF2', border: '1px solid rgba(191,90,242,0.3)' }}>
                Azione singola
              </span>
            )}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 22, flex: 1 }}>

          {!profile && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--analysis-dim)' }}>
              <AlertCircle size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
              <div style={{ fontSize: '0.82rem' }}>Nessun profilo disponibile per questo ticker.</div>
              <div style={{ fontSize: '0.72rem', marginTop: 4 }}>Puoi aggiungerlo al database remoto.</div>
            </div>
          )}

          {/* Market type */}
          {profile?.marketType?.length > 0 && (
            <DetailSection title="Tipo di mercato">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profile.marketType.map(m => (
                  <span key={m.type} style={{ fontSize: '0.72rem', padding: '3px 9px', borderRadius: 20, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)', color: 'var(--text-1)' }}>
                    {m.type} — <strong>{m.pct}%</strong>
                  </span>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Geography */}
          {profile?.geography?.length > 0 && (
            <DetailSection title="Geografie">
              {profile.geography.slice(0, 10).map((g, i) => (
                <HBar key={g.country ?? i} label={g.country} pct={g.pct} color={PALETTE[i % PALETTE.length]} maxPct={Math.max(...profile.geography.map(x => x.pct))} />
              ))}
            </DetailSection>
          )}

          {/* Sectors */}
          {profile?.sectors?.length > 0 && (
            <DetailSection title="Settori">
              {profile.sectors.map((s, i) => (
                <HBar key={s.name} label={s.name} pct={s.pct} color={PALETTE[(i + 3) % PALETTE.length]} maxPct={Math.max(...profile.sectors.map(x => x.pct))} />
              ))}
            </DetailSection>
          )}

          {/* Factors */}
          {profile?.factors && Object.keys(profile.factors).length > 0 && (
            <DetailSection title="Fattori (scala –2 → +2)">
              {Object.entries(profile.factors).map(([k, v]) => (
                <FactorMiniBar key={k} label={FACTOR_NAMES[k] ?? k} value={v} />
              ))}
              <div style={{ fontSize: '0.65rem', color: 'var(--analysis-faint)', marginTop: 6 }}>
                Positivo = tilt sul fattore · Negativo = esposizione contraria
              </div>
            </DetailSection>
          )}

          {/* Top Holdings */}
          {profile?.topHoldings?.length > 0 && (
            <DetailSection title="Top Holdings">
              {profile.topHoldings.map((h, i) => (
                <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: `${PALETTE[i % PALETTE.length]}22`, border: `1px solid ${PALETTE[i % PALETTE.length]}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: PALETTE[i % PALETTE.length] }}>{i + 1}</span>
                  </div>
                  <span style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--analysis-dim)', flexShrink: 0 }}>{h.pct.toFixed(1)}%</span>
                </div>
              ))}
            </DetailSection>
          )}

          {/* Bond Info */}
          {profile?.bondInfo && (
            <DetailSection title="Caratteristiche obbligazionarie">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Duration', value: profile.bondInfo.duration != null ? `${profile.bondInfo.duration} anni` : '—' },
                  { label: 'YTM', value: profile.bondInfo.ytm != null ? `${profile.bondInfo.ytm.toFixed(1)}%` : '—' },
                  { label: 'Rating', value: profile.bondInfo.creditRating ?? '—' },
                  { label: 'Tipo', value: profile.bondInfo.type ?? '—' },
                ].map(item => (
                  <div key={item.label} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--analysis-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Currencies */}
          {profile?.currencies?.length > 0 && (
            <DetailSection title="Valute">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profile.currencies.map(c => (
                  <span key={c.code} style={{ fontSize: '0.72rem', padding: '3px 9px', borderRadius: 20, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)', color: 'var(--text-1)', fontFamily: 'monospace' }}>
                    {c.code} {c.pct < 100 ? `${c.pct}%` : ''}
                  </span>
                ))}
              </div>
            </DetailSection>
          )}

          {/* No data placeholder */}
          {profile && !profile.geography?.length && !profile.sectors?.length && !profile.factors && !profile.bondInfo && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--analysis-dim)', fontSize: '0.8rem' }}>
              Dati di composizione non disponibili per questo strumento.
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--analysis-subtle-brd)', fontSize: '0.64rem', color: 'var(--analysis-faint)' }}>
          Fonte: database ETF locale + Gist remoto · Aggiornato maggio 2026
        </div>
      </div>
    </div>
  );
}

// ── Ticker Resolution Wizard ──────────────────────────────────────────────────
/**
 * Modal wizard per abbinare ticker sconosciuti a un ETF equivalente nel database.
 * Mostra i ticker uno alla volta con suggerimenti per exchange variant o strategia simile.
 * Quando l'utente accetta, salva un alias in localStorage (originale → noto).
 */
function TickerResolutionWizard({ missingTickers, holdingsWithValues, onClose, onAliasSet }) {
  const resolutions = React.useMemo(() =>
    missingTickers.map(ticker => {
      const holding = holdingsWithValues.find(h => h.ticker === ticker);
      return resolveUnknownTicker(ticker, holding?.name || '');
    }), [missingTickers] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [step, setStep] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);

  const current = resolutions[step];
  if (!current) { onClose(); return null; }

  const isLast = step === resolutions.length - 1;

  const advance = () => {
    if (isLast) onClose();
    else { setStep(s => s + 1); setSelectedIdx(null); }
  };

  const handleAccept = () => {
    if (selectedIdx !== null) {
      const sug = current.suggestions[selectedIdx];
      setTickerAlias(current.originalTicker, sug.ticker);
      onAliasSet?.();
    }
    advance();
  };

  const origCurrency = current.originalExchangeInfo?.currency;

  // ESC key
  React.useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', width: 540, maxWidth: '94vw', maxHeight: '88vh',
        background: 'var(--card)', borderRadius: 16, border: '1px solid var(--analysis-subtle-brd)',
        overflowY: 'auto', padding: '24px 28px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        animation: 'fadeInScale 0.2s ease',
      }}>
        <style>{`@keyframes fadeInScale { from { transform: scale(0.96) translateY(10px); opacity:0 } to { transform: scale(1) translateY(0); opacity:1 } }`}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
              Strumento {step + 1} di {resolutions.length}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>{current.originalTicker}</span>
              {current.originalExchangeInfo && (
                <span style={{ fontSize: '0.8rem', color: 'var(--analysis-dim)' }}>
                  {current.originalExchangeInfo.flag} {current.originalExchangeInfo.name}
                </span>
              )}
            </div>
            {current.originalName && (
              <div style={{ fontSize: '0.77rem', color: 'var(--analysis-dim)', marginTop: 3 }}>{current.originalName}</div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--analysis-dim)', lineHeight: 1 }}>
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--analysis-subtle-brd)', borderRadius: 2, marginBottom: 18, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${((step + 1) / resolutions.length) * 100}%`,
            background: '#0A84FF', borderRadius: 2, transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Sub-heading */}
        <div style={{ fontSize: '0.77rem', color: 'var(--analysis-dim)', marginBottom: 12 }}>
          {current.hasSuggestions
            ? current.suggestions[0]?.matchType === 'exchange_variant'
              ? `✅ Stesso ETF trovato su ${current.suggestions.filter(s => s.matchType === 'exchange_variant').length > 1 ? 'più borse' : "un'altra borsa"}. Seleziona quale usare per le analisi.`
              : `🔍 Ticker non trovato su altre borse. Trovati ${current.suggestions.length} ETF con strategia analoga.`
            : '❓ Nessun ETF equivalente trovato nel database.'}
        </div>

        {/* Suggestions */}
        {current.hasSuggestions ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {current.suggestions.map((s, idx) => {
              const isDiffCurrency = origCurrency && s.exchangeInfo?.currency && s.exchangeInfo.currency !== origCurrency;
              const isEUR = s.exchangeInfo?.currency === 'EUR';
              const sel = selectedIdx === idx;
              return (
                <div
                  key={s.ticker}
                  onClick={() => setSelectedIdx(idx)}
                  style={{
                    padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${sel ? '#0A84FF' : 'var(--analysis-subtle-brd)'}`,
                    background: sel ? 'rgba(10,132,255,0.06)' : 'var(--analysis-subtle-bg)',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {/* Radio */}
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                      border: `2px solid ${sel ? '#0A84FF' : 'var(--analysis-subtle-brd)'}`,
                      background: sel ? '#0A84FF' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {sel && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'white' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{s.ticker}</span>
                        {s.exchangeInfo && (
                          <span style={{ fontSize: '0.76rem', color: 'var(--analysis-dim)' }}>
                            {s.exchangeInfo.flag} {s.exchangeInfo.name}
                          </span>
                        )}
                        {s.exchangeInfo?.currency && (
                          <span style={{
                            fontSize: '0.67rem', fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                            background: isEUR ? 'rgba(48,209,88,0.12)' : 'rgba(255,159,10,0.12)',
                            color: isEUR ? '#30D158' : '#FF9F0A',
                          }}>
                            {s.exchangeInfo.currency}
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                          background: s.matchType === 'exchange_variant' ? 'rgba(10,132,255,0.10)' : 'rgba(191,90,242,0.10)',
                          color: s.matchType === 'exchange_variant' ? '#0A84FF' : '#BF5AF2',
                        }}>
                          {s.matchType === 'exchange_variant' ? 'stesso ETF' : 'strategia simile'}
                        </span>
                      </div>
                      {isDiffCurrency && (
                        <div style={{ fontSize: '0.72rem', color: '#FF9F0A', marginTop: 3 }}>
                          ⚠ Valuta {s.exchangeInfo.currency} (originale: {origCurrency}). La strategia è identica, ma il prezzo di riferimento è in {s.exchangeInfo.currency}.
                        </div>
                      )}
                      {s.profile?.assetType && (
                        <div style={{ fontSize: '0.71rem', color: 'var(--analysis-faint)', marginTop: 2 }}>
                          {ASSET_TYPE_LABELS[s.profile.assetType]?.label ?? s.profile.assetType}
                          {s.profile.numHoldings ? ` · ${s.profile.numHoldings.toLocaleString()} titoli` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            padding: 14, borderRadius: 10, marginBottom: 18,
            background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)',
            fontSize: '0.8rem', color: 'var(--analysis-dim)',
          }}>
            Nessun ETF equivalente trovato. Puoi comunque saltare: i dati di composizione per questo strumento non saranno disponibili.
          </div>
        )}

        {/* Alias info note */}
        {selectedIdx !== null && (
          <div style={{
            fontSize: '0.72rem', color: 'var(--analysis-dim)', marginBottom: 16,
            padding: '8px 12px', borderRadius: 8,
            background: 'rgba(10,132,255,0.05)', border: '1px solid rgba(10,132,255,0.15)',
          }}>
            ℹ Il portfolio mantiene il ticker <strong>{current.originalTicker}</strong>. Le analisi di composizione useranno <strong>{current.suggestions[selectedIdx]?.ticker}</strong> come riferimento.
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={onClose}
            style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'none', color: 'var(--analysis-faint)', fontSize: '0.77rem', cursor: 'pointer' }}
          >
            Salta tutti
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={advance}
              style={{
                padding: '7px 16px', borderRadius: 8,
                border: '1px solid var(--analysis-subtle-brd)',
                background: 'transparent', color: 'var(--analysis-dim)', fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              {isLast ? 'Chiudi' : 'Salta →'}
            </button>
            <button
              onClick={handleAccept}
              disabled={selectedIdx === null}
              style={{
                padding: '7px 18px', borderRadius: 8, border: 'none',
                background: selectedIdx !== null ? '#0A84FF' : 'var(--analysis-subtle-brd)',
                color: selectedIdx !== null ? 'white' : 'var(--analysis-dim)',
                fontSize: '0.8rem', fontWeight: 600, cursor: selectedIdx !== null ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
            >
              Accetta{!isLast ? ' →' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cost drag / opportunity cost projection ───────────────────────────────────

/** Rendimento annuo lordo assunto (media storica MSCI World, nominale) */
const BENCHMARK_RETURN_PCT = 7;

/**
 * Proietta la crescita del portafoglio su N anni in 3 scenari di costo e mostra
 * il grafico AreaChart + KPI cards + callout del costo opportunità.
 */
function CostDragSection({ startValue, weightedTerPct }) {
  const [horizon, setHorizon] = useState(20);

  const scenarios = [
    { key: 'no_cost', label: 'Senza costi (potenziale)',                  color: '#30D158', ter: 0         },
    { key: 'yours',   label: `Il tuo portafoglio (TER ${weightedTerPct.toFixed(2)}%)`, color: '#0A84FF', ter: weightedTerPct },
    { key: 'active',  label: 'Fondo attivo medio (TER 1.80%)',             color: '#FF9F0A', ter: 1.80      },
  ];

  const chartData = React.useMemo(() =>
    Array.from({ length: horizon + 1 }, (_, y) => {
      const point = { year: y };
      for (const s of scenarios) {
        const net = (BENCHMARK_RETURN_PCT - s.ter) / 100;
        point[s.key] = Math.round(startValue * Math.pow(1 + net, y));
      }
      return point;
    }), [horizon, startValue, weightedTerPct] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const finalYear = chartData[chartData.length - 1];
  const opportunityCost  = finalYear.no_cost - finalYear.yours;
  const opportunityCostPct = finalYear.no_cost > 0 ? (opportunityCost / finalYear.no_cost) * 100 : 0;

  const fmtVal = v => {
    if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(2).replace('.', ',')}M`;
    if (v >= 1_000)     return `€${Math.round(v / 1_000)}k`;
    return `€${Math.round(v)}`;
  };

  const horizonBtns = [10, 15, 20, 25, 30];

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Costo opportunità nel tempo
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {horizonBtns.map(h => (
            <button key={h} onClick={() => setHorizon(h)} style={{
              padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
              border: horizon === h ? '1px solid #0A84FF' : '1px solid var(--analysis-subtle-brd)',
              background: horizon === h ? 'rgba(10,132,255,0.15)' : 'transparent',
              color: horizon === h ? '#0A84FF' : 'var(--analysis-dim)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {h}a
            </button>
          ))}
        </div>
      </div>

      {/* Area chart */}
      <ResponsiveContainer width="100%" height={210}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 8 }}>
          <defs>
            {scenarios.map(s => (
              <linearGradient key={s.key} id={`cdf_${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={s.color} stopOpacity={0.22} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--analysis-subtle-brd)" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: 'var(--analysis-faint)' }}
            tickFormatter={v => v === 0 ? 'Oggi' : `${v}a`}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--analysis-faint)' }}
            tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1_000)}k`}
            width={48} axisLine={false} tickLine={false}
          />
          <Tooltip
            formatter={(value, key) => [
              `€${Math.round(value).toLocaleString('it-IT')}`,
              scenarios.find(s => s.key === key)?.label ?? key,
            ]}
            labelFormatter={v => v === 0 ? 'Oggi' : `Anno ${v}`}
            contentStyle={{
              background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-brd)',
              borderRadius: 10, fontSize: 11, color: 'var(--tooltip-color)',
            }}
          />
          {/* Render in reverse order so no_cost stays on top visually */}
          {[...scenarios].reverse().map(s => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={s.key === 'no_cost' ? 2 : 1.5}
              fill={`url(#cdf_${s.key})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {/* KPI cards for final year */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
        {scenarios.map((s, idx) => {
          const val = finalYear[s.key];
          const gap = val - finalYear.no_cost; // negative for costs > 0
          const gapPct = finalYear.no_cost > 0 ? (Math.abs(gap) / finalYear.no_cost) * 100 : 0;
          return (
            <div key={s.key} style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--analysis-subtle-bg)',
              border: `1px solid ${s.color}30`,
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: s.color, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {idx === 0 ? '✨ Potenziale' : idx === 1 ? '📊 Il tuo portafoglio' : '🏦 Fondo attivo'}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)' }}>
                {fmtVal(val)}
              </div>
              {s.key !== 'no_cost' && (
                <div style={{ fontSize: '0.68rem', color: '#FF453A', marginTop: 2 }}>
                  −{fmtVal(Math.abs(gap))} ({gapPct.toFixed(1)}%)
                </div>
              )}
              {s.key === 'no_cost' && (
                <div style={{ fontSize: '0.68rem', color: 'var(--analysis-dim)', marginTop: 2 }}>
                  +{BENCHMARK_RETURN_PCT}%/anno assunto
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Callout */}
      <div style={{
        marginTop: 10, padding: '9px 14px', borderRadius: 10,
        background: opportunityCostPct > 12 ? 'rgba(255,69,58,0.06)' : 'rgba(255,159,10,0.06)',
        border: `1px solid ${opportunityCostPct > 12 ? '#FF453A33' : '#FF9F0A33'}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <TrendingDown size={13} color={opportunityCostPct > 12 ? '#FF453A' : '#FF9F0A'} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.77rem', color: 'var(--text-1)' }}>
          In <strong>{horizon} anni</strong>, il TER {weightedTerPct.toFixed(2)}% erode
          <strong style={{ color: opportunityCostPct > 12 ? '#FF453A' : '#FF9F0A' }}> {fmtVal(opportunityCost)} </strong>
          ({opportunityCostPct.toFixed(1)}% del patrimonio potenziale — il costo "invisibile" dell'attesa).
        </span>
      </div>

      {/* Assumption footnote */}
      <div style={{ marginTop: 6, fontSize: '0.63rem', color: 'var(--analysis-faint)', textAlign: 'right' }}>
        * Rendimento lordo assunto: {BENCHMARK_RETURN_PCT}%/anno (media storica MSCI World). Solo a scopo illustrativo, non è una previsione.
      </div>
    </div>
  );
}

// ── Holding Row ───────────────────────────────────────────────────────────────
function HoldingRow({ h, rank, onSelect }) {
  return (
    <div
      onClick={() => onSelect?.({ ticker: h.ticker, name: h.name })}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 10, marginBottom: 4,
        background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { if (onSelect) { e.currentTarget.style.borderColor = '#0A84FF66'; e.currentTarget.style.background = 'rgba(10,132,255,0.06)'; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--analysis-subtle-brd)'; e.currentTarget.style.background = 'var(--analysis-subtle-bg)'; }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: `${PALETTE[rank % PALETTE.length]}22`,
        border: `1px solid ${PALETTE[rank % PALETTE.length]}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.7rem', fontWeight: 700, color: PALETTE[rank % PALETTE.length],
      }}>
        {rank + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Blur>{h.name}</Blur>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', marginTop: 1 }}>
          <Blur>{h.ticker}</Blur>
          {' · '}{h.macroCategory}
          {!h.hasProfile && (
            <span style={{ marginLeft: 8, color: '#FF9F0A', fontSize: '0.68rem', fontWeight: 600 }}>⚠ dati N/D</span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{h.weight.toFixed(1)}%</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)' }}>
          <Blur>€{h.marketValue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</Blur>
        </div>
      </div>
      <div style={{ width: 80, flexShrink: 0 }}>
        <div style={{ height: 4, background: 'var(--analysis-subtle-brd)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(h.weight, 100)}%`, background: PALETTE[rank % PALETTE.length], borderRadius: 2 }} />
        </div>
      </div>
      {onSelect && <ChevronRight size={14} color="var(--analysis-faint)" style={{ flexShrink: 0 }} />}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: '1rem 1.25rem' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--analysis-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: color || 'inherit' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Factor exposure bar (% of portfolio) ─────────────────────────────────────
// Shows what % of the portfolio has positive / negative / neutral factor tilt
function FactorBar({ factorDef, stats }) {
  const { positive, negative, neutral, noData } = stats;
  const noInfo = neutral + noData;
  // dominant direction for label
  const net = positive - negative;
  const dominated = Math.abs(net) < 5 ? 'neutro' : net > 0 ? 'tilt positivo' : 'tilt negativo';
  const domColor = Math.abs(net) < 5 ? 'var(--analysis-dim)' : net > 0 ? '#0A84FF' : '#FF9F0A';

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{factorDef.label}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--analysis-dim)', marginLeft: 8 }}>{factorDef.desc}</span>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: domColor }}>
          {Math.abs(net) >= 5 ? (positive > negative ? positive.toFixed(0) : negative.toFixed(0)) + '% ' : ''}{dominated}
        </span>
      </div>

      {/* Stacked bar: positive | negative | neutral/no data */}
      <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', gap: 1 }}>
        {positive > 0.5 && (
          <div style={{ width: `${positive}%`, background: '#0A84FF', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.5s' }}>
            {positive >= 12 && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>{positive.toFixed(0)}%</span>}
          </div>
        )}
        {negative > 0.5 && (
          <div style={{ width: `${negative}%`, background: '#FF9F0A', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.5s' }}>
            {negative >= 12 && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>{negative.toFixed(0)}%</span>}
          </div>
        )}
        {noInfo > 0.5 && (
          <div style={{ width: `${noInfo}%`, background: 'var(--analysis-subtle-brd)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.5s' }}>
            {noInfo >= 15 && <span style={{ fontSize: '0.62rem', color: 'var(--analysis-dim)' }}>{noInfo.toFixed(0)}%</span>}
          </div>
        )}
      </div>

      {/* Legend row */}
      <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
        {positive > 0.5 && (
          <span style={{ fontSize: '0.68rem', color: '#0A84FF', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#0A84FF', flexShrink: 0 }} />
            {positive.toFixed(1)}% tilt +
          </span>
        )}
        {negative > 0.5 && (
          <span style={{ fontSize: '0.68rem', color: '#FF9F0A', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#FF9F0A', flexShrink: 0 }} />
            {negative.toFixed(1)}% tilt –
          </span>
        )}
        {neutral > 0.5 && (
          <span style={{ fontSize: '0.68rem', color: 'var(--analysis-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--analysis-subtle-brd)', flexShrink: 0 }} />
            {neutral.toFixed(1)}% neutro
          </span>
        )}
        {noData > 0.5 && (
          <span style={{ fontSize: '0.68rem', color: 'var(--analysis-faint)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--analysis-subtle-brd)', flexShrink: 0, opacity: 0.5 }} />
            {noData.toFixed(1)}% no dati
          </span>
        )}
      </div>
    </div>
  );
}

// ── Micro-allocation breakdown (second-level within each macro cat) ────────────
function MicroBreakdown({ holdingsWithValues }) {
  // Group holdings by sub-category and compute weights
  const totalValue = holdingsWithValues.reduce((s, h) => s + h.marketValue, 0);
  if (totalValue === 0) return null;

  const subMap = {};
  holdingsWithValues.forEach(h => {
    const sub = getSubCategory(h.ticker);
    const w = (h.marketValue / totalValue) * 100;
    subMap[sub] = (subMap[sub] || 0) + w;
  });

  // Group by macro
  const macroGroups = {};
  Object.entries(subMap).forEach(([sub, pct]) => {
    const def = MICRO_SUB_CATEGORIES[sub] ?? { label: sub, color: '#636366', macro: 'altro' };
    const macro = def.macro ?? 'altro';
    if (!macroGroups[macro]) macroGroups[macro] = [];
    macroGroups[macro].push({ sub, label: def.label, color: def.color, pct: Math.round(pct * 10) / 10 });
  });

  const MACRO_LABELS = { equity: 'Azionario', bond: 'Obbligazionario', commodity: 'Materie prime', realEstate: 'Immobiliare', crypto: 'Crypto', cash: 'Liquidità', multi_asset: 'Multi-asset', altro: 'Altro' };
  const MACRO_COLORS = { equity: '#0A84FF', bond: '#30D158', commodity: '#FF9F0A', realEstate: '#BF5AF2', crypto: '#FF453A', cash: '#32ADE6', multi_asset: '#AC8E68', altro: '#636366' };

  return (
    <div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--analysis-dim)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Breakdown micro-allocazione
      </div>
      {Object.entries(macroGroups)
        .sort((a, b) => b[1].reduce((s, x) => s + x.pct, 0) - a[1].reduce((s, x) => s + x.pct, 0))
        .map(([macro, subs]) => {
          const macroTotal = subs.reduce((s, x) => s + x.pct, 0);
          return (
            <div key={macro} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: MACRO_COLORS[macro] ?? '#999' }}>
                  {MACRO_LABELS[macro] ?? macro}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{macroTotal.toFixed(1)}%</span>
              </div>
              {/* Stacked bar */}
              <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', gap: 1, marginBottom: 6 }}>
                {subs.sort((a, b) => b.pct - a.pct).map(s => (
                  <div key={s.sub} style={{ width: `${(s.pct / macroTotal) * 100}%`, background: s.color, flexShrink: 0 }}
                    title={`${s.label}: ${s.pct.toFixed(1)}%`} />
                ))}
              </div>
              {/* Labels */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                {subs.sort((a, b) => b.pct - a.pct).map(s => (
                  <div key={s.sub} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--analysis-dim)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                    {s.label} <strong style={{ color: 'var(--analysis-text)' }}>{s.pct.toFixed(1)}%</strong>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      <div style={{ fontSize: '0.7rem', color: 'var(--analysis-faint)', marginTop: 4 }}>
        Sub-categorie derivate automaticamente dai profili ETF (tipo mercato, fattori, geografica).
      </div>
    </div>
  );
}

// ── Market type stacked bar ───────────────────────────────────────────────────
function MarketTypeBar({ marketType }) {
  const developed = marketType.find(m => m.type === 'Mercati sviluppati')?.pct ?? 0;
  const emerging   = marketType.find(m => m.type === 'Mercati emergenti')?.pct ?? 0;
  return (
    <div>
      <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{
          width: `${developed}%`, background: '#0A84FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.72rem', fontWeight: 700, color: '#fff', transition: 'width 0.5s ease',
        }}>
          {developed > 10 ? `${developed.toFixed(0)}%` : ''}
        </div>
        <div style={{
          width: `${emerging}%`, background: '#FF9F0A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.72rem', fontWeight: 700, color: '#fff', transition: 'width 0.5s ease',
        }}>
          {emerging > 10 ? `${emerging.toFixed(0)}%` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        {[['Mercati sviluppati', developed, '#0A84FF'], ['Mercati emergenti', emerging, '#FF9F0A']].map(([l, v, c]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
            <span style={{ fontSize: '0.78rem' }}>{l}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: c }}>{v.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Gap analysis row (area vs benchmark) ─────────────────────────────────────
function GapRow({ name, portfolio, reference }) {
  const diff = portfolio - reference;
  const color = diff > 1 ? '#30D158' : diff < -1 ? '#FF453A' : 'var(--analysis-dim)';
  const maxBar = Math.max(portfolio, reference, 1);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{name}</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#0A84FF', fontWeight: 600 }}>Port. {portfolio.toFixed(1)}%</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--analysis-dim)' }}>vs {reference.toFixed(0)}%</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color, minWidth: 52, textAlign: 'right' }}>
            {Math.abs(diff) > 1 ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}pp` : '≈ ok'}
          </span>
        </div>
      </div>
      <div style={{ height: 6, background: 'var(--analysis-subtle-brd)', borderRadius: 3, overflow: 'hidden', marginBottom: 2 }}>
        <div style={{ height: '100%', width: `${(portfolio / maxBar) * 100}%`, background: '#0A84FF', borderRadius: 3 }} />
      </div>
      <div style={{ height: 3, background: 'var(--analysis-subtle-brd)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(reference / maxBar) * 100}%`, background: 'var(--analysis-dim)', opacity: 0.4, borderRadius: 3 }} />
      </div>
    </div>
  );
}

// ── Sector delta row (vs MSCI World benchmark) ───────────────────────────────
function SectorDeltaRow({ name, portfolio, reference, index }) {
  const diff = portfolio - (reference ?? 0);
  const isOver  = diff >  1.5;
  const isUnder = diff < -1.5;
  const diffColor = isOver ? '#30D158' : isUnder ? '#FF453A' : 'var(--analysis-dim)';
  const maxBar = Math.max(portfolio, reference ?? 0, 1);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: PALETTE[index % PALETTE.length], flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{name}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: PALETTE[index % PALETTE.length] }}>{portfolio.toFixed(1)}%</span>
          {reference != null && (
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: diffColor, minWidth: 44, textAlign: 'right' }}>
              {Math.abs(diff) >= 1.5 ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}pp` : ''}
            </span>
          )}
        </div>
      </div>
      {/* Portfolio bar */}
      <div style={{ height: 5, background: 'var(--analysis-subtle-brd)', borderRadius: 3, overflow: 'hidden', marginBottom: 2 }}>
        <div style={{ height: '100%', width: `${(portfolio / maxBar) * 100}%`, background: PALETTE[index % PALETTE.length], borderRadius: 3 }} />
      </div>
      {/* Benchmark bar */}
      {reference != null && (
        <div style={{ height: 3, background: 'var(--analysis-subtle-brd)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(reference / maxBar) * 100}%`, background: 'var(--analysis-dim)', opacity: 0.35, borderRadius: 3 }} />
        </div>
      )}
    </div>
  );
}

// ── Bond info card ────────────────────────────────────────────────────────────
function BondInfoCard({ ticker, name, weight, bondInfo }) {
  if (!bondInfo) return null;
  const dur = bondInfo.duration;
  const durLabel = dur < 0.05 ? `${(dur * 365).toFixed(0)}g`
                 : dur < 1   ? `${(dur * 12).toFixed(1)}m`
                 : `${dur.toFixed(1)} anni`;
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10, marginBottom: 8,
      background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', marginTop: 2 }}>
            {ticker} · {bondInfo.type} · peso {weight.toFixed(1)}%
          </div>
        </div>
        <div style={{
          fontSize: '0.72rem', padding: '3px 8px', borderRadius: 6,
          background: 'rgba(10,132,255,0.12)', color: '#0A84FF',
          fontWeight: 700, alignSelf: 'flex-start',
        }}>
          {bondInfo.creditRating}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Duration</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{durLabel}</div>
        </div>
        {bondInfo.ytm != null && (
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>YTM</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#30D158' }}>{bondInfo.ytm.toFixed(1)}%</div>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Bond Portfolio Summary Panel ──────────────────────────────────────────────
function BondSummaryPanel({ bondHoldings, totalPortfolioValue }) {
  if (!bondHoldings || bondHoldings.length === 0) return null;

  // Totale % portafoglio in bond
  const bondPct = bondHoldings.reduce((s, b) => s + b.weight, 0);

  // Calcoli ponderati (peso relativo nel sottoinsieme bond)
  let wAvgDuration = null;
  let wAvgYtm = null;
  let totalBondWeight = 0;
  let totalDurWeight = 0;
  let totalYtmWeight = 0;

  bondHoldings.forEach(b => {
    totalBondWeight += b.weight;
    if (b.bondInfo?.duration != null) {
      wAvgDuration = (wAvgDuration || 0) + b.bondInfo.duration * b.weight;
      totalDurWeight += b.weight;
    }
    if (b.bondInfo?.ytm != null) {
      wAvgYtm = (wAvgYtm || 0) + b.bondInfo.ytm * b.weight;
      totalYtmWeight += b.weight;
    }
  });

  if (wAvgDuration != null && totalDurWeight > 0) wAvgDuration = wAvgDuration / totalDurWeight;
  if (wAvgYtm != null && totalYtmWeight > 0) wAvgYtm = wAvgYtm / totalYtmWeight;

  // Contributo di duration al portafoglio totale
  const portDurContrib = wAvgDuration != null ? (bondPct / 100) * wAvgDuration : null;

  // Duration buckets (basati su peso del portafoglio, non % bond)
  const buckets = [
    { label: '0–2 anni', min: 0,   max: 2,   color: '#30D158' },
    { label: '2–5 anni', min: 2,   max: 5,   color: '#0A84FF' },
    { label: '5–10 anni', min: 5,  max: 10,  color: '#FF9F0A' },
    { label: '10+ anni',  min: 10, max: Infinity, color: '#FF453A' },
  ];
  const bucketData = buckets.map(bk => {
    const pct = bondHoldings
      .filter(b => b.bondInfo?.duration != null && b.bondInfo.duration >= bk.min && b.bondInfo.duration < bk.max)
      .reduce((s, b) => s + b.weight, 0);
    return { ...bk, pct };
  });
  const maxBucketPct = Math.max(...bucketData.map(b => b.pct), 0.1);

  // Credit quality
  const creditColors = {
    'AAA': '#30D158', 'AA+': '#30D158', 'AA': '#30D158', 'AA-': '#4CD964',
    'A+': '#0A84FF', 'A': '#0A84FF', 'A-': '#32ADE6',
    'BBB+': '#FF9F0A', 'BBB': '#FF9F0A', 'BBB-': '#FFD60A',
    'BB': '#FF6961', 'HY': '#FF453A',
  };
  const creditBuckets = {};
  bondHoldings.forEach(b => {
    if (!b.bondInfo?.creditRating) return;
    const key = b.bondInfo.creditRating;
    creditBuckets[key] = (creditBuckets[key] || 0) + b.weight;
  });
  const creditData = Object.entries(creditBuckets)
    .map(([rating, pct]) => ({ rating, pct, color: creditColors[rating] || '#BF5AF2' }))
    .sort((a, b) => b.pct - a.pct);

  const kpiStyle = {
    padding: '12px 14px', borderRadius: 10,
    background: 'var(--analysis-subtle-bg)',
    border: '1px solid var(--analysis-subtle-brd)',
  };

  return (
    <div style={{
      padding: '16px', borderRadius: 12, marginBottom: 16,
      background: 'rgba(10,132,255,0.06)',
      border: '1px solid rgba(10,132,255,0.2)',
    }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0A84FF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
        📊 Analisi Bond — Riepilogo portafoglio
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        <div style={kpiStyle}>
          <div style={{ fontSize: '0.62rem', color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>% portafoglio bond</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0A84FF' }}>{bondPct.toFixed(1)}%</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: '0.62rem', color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Duration media pond.</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-1)' }}>
            {wAvgDuration != null ? `${wAvgDuration.toFixed(1)} anni` : '—'}
          </div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: '0.62rem', color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>YTM medio pond.</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#30D158' }}>
            {wAvgYtm != null ? `${wAvgYtm.toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>

      {/* Contributo duration al portafoglio */}
      {portDurContrib != null && (
        <div style={{ ...kpiStyle, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)' }}>Contributo duration al portafoglio totale</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--analysis-faint)', marginTop: 2 }}>
              (% bond × duration media = {bondPct.toFixed(1)}% × {wAvgDuration?.toFixed(1)} anni)
            </div>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#FF9F0A', flexShrink: 0, marginLeft: 12 }}>
            {portDurContrib.toFixed(2)} anni
          </div>
        </div>
      )}

      {/* Duration buckets */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Distribuzione per scadenza (% del portafoglio)
        </div>
        {bucketData.filter(b => b.pct > 0).map(b => (
          <div key={b.label} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)' }}>{b.label}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: b.color }}>{b.pct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--analysis-subtle-brd)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(b.pct / maxBucketPct) * 100}%`, background: b.color, borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Credit quality */}
      {creditData.length > 0 && (
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Qualità creditizia (% del portafoglio)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {creditData.map(c => (
              <div key={c.rating} style={{
                padding: '4px 10px', borderRadius: 20,
                background: `${c.color}22`, border: `1px solid ${c.color}55`,
                fontSize: '0.72rem', fontWeight: 700, color: c.color,
              }}>
                {c.rating} · {c.pct.toFixed(1)}%
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ── Overlap Analysis ──────────────────────────────────────────────────────────

/** Normalize a stock name for fuzzy matching between ETF holding lists */
const normalizeName = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Given two ETF topHoldings arrays, compute the pairwise overlap.
 * Returns overlap as % of each ETF's measured weight and a symmetric score.
 */
function computeOverlap(holdingsA, holdingsB) {
  if (!holdingsA?.length || !holdingsB?.length) return null;

  const mapA = {};
  let sumA = 0;
  holdingsA.forEach(h => { mapA[normalizeName(h.name)] = h.pct; sumA += h.pct; });

  let overlapSum = 0;
  let sumB = 0;
  holdingsB.forEach(h => {
    const key = normalizeName(h.name);
    if (mapA[key] != null) overlapSum += Math.min(mapA[key], h.pct);
    sumB += h.pct;
  });

  return {
    overlapSum,                                                          // raw % points of shared exposure
    pctOfA: sumA > 0 ? (overlapSum / sumA) * 100 : 0,                  // % of A's measured weight
    pctOfB: sumB > 0 ? (overlapSum / sumB) * 100 : 0,                  // % of B's measured weight
    symmetric: (sumA + sumB) > 0 ? (2 * overlapSum / (sumA + sumB)) * 100 : 0,
    sumA, sumB,
  };
}

/**
 * Build the full overlap matrix for all equity ETFs with topHoldings.
 * Returns { etfs: [{ticker, name, topHoldings}], matrix: {[key]: overlap} }
 */
function buildOverlapMatrix(holdingsWithValues) {
  // Only equity ETFs that have topHoldings in the local profile
  const etfs = holdingsWithValues
    .filter(h => !h.isCash && h.marketValue > 0)
    .map(h => {
      const profile = getCompositionProfile(h.ticker);
      if (!profile || profile._isDirectStock) return null;
      if (!profile.topHoldings?.length) return null;
      if (profile.assetType === 'bond' || profile.assetType === 'commodity' ||
          profile.assetType === 'money-market' || profile.assetType === 'crypto') return null;
      return { ticker: h.ticker, name: h.name || h.ticker, weight: h.weight, topHoldings: profile.topHoldings };
    })
    .filter(Boolean);

  const matrix = {};
  for (let i = 0; i < etfs.length; i++) {
    for (let j = 0; j < etfs.length; j++) {
      if (i === j) { matrix[`${i}-${j}`] = null; continue; }
      matrix[`${i}-${j}`] = computeOverlap(etfs[i].topHoldings, etfs[j].topHoldings);
    }
  }

  // Top duplicated stocks across all ETFs (appear in 2+ ETFs)
  const stockAppearances = {}; // name → [{ticker, pct}]
  etfs.forEach(e => {
    e.topHoldings.forEach(h => {
      const key = normalizeName(h.name);
      if (!stockAppearances[key]) stockAppearances[key] = { display: h.name, sources: [] };
      stockAppearances[key].sources.push({ ticker: e.ticker, pct: h.pct, weight: e.weight });
    });
  });
  const duplicated = Object.values(stockAppearances)
    .filter(s => s.sources.length >= 2)
    .map(s => ({
      name: s.display,
      etfCount: s.sources.length,
      // Portfolio-weighted exposure: sum of (holding_pct/100 × etf_weight) for each occurrence
      portfolioPct: s.sources.reduce((sum, src) => sum + (src.pct / 100) * src.weight, 0),
      sources: s.sources,
    }))
    .sort((a, b) => b.portfolioPct - a.portfolioPct)
    .slice(0, 20);

  return { etfs, matrix, duplicated };
}

/** Heatmap color: 0% = green, 50% = yellow, 100% = red */
function overlapColor(pct) {
  if (pct == null) return 'transparent';
  if (pct < 15)  return 'rgba(48,209,88,0.15)';
  if (pct < 30)  return 'rgba(48,209,88,0.30)';
  if (pct < 50)  return 'rgba(255,214,10,0.30)';
  if (pct < 70)  return 'rgba(255,159,10,0.35)';
  return 'rgba(255,69,58,0.35)';
}
function overlapTextColor(pct) {
  if (pct == null) return 'var(--analysis-dim)';
  if (pct < 30)  return '#30D158';
  if (pct < 50)  return '#FFD60A';
  if (pct < 70)  return '#FF9F0A';
  return '#FF453A';
}

function OverlapTab({ holdingsWithValues }) {
  const { etfs, matrix, duplicated } = useMemo(
    () => buildOverlapMatrix(holdingsWithValues),
    [holdingsWithValues]
  );
  const [showAll, setShowAll] = useState(false);

  if (etfs.length < 2) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--analysis-dim)', padding: '3rem', fontSize: '0.85rem' }}>
        Servono almeno 2 ETF azionari con dati di composizione per l'analisi di sovrapposizione.
      </div>
    );
  }

  // High-overlap pairs (symmetric > 40%)
  const highOverlapPairs = [];
  for (let i = 0; i < etfs.length; i++) {
    for (let j = i + 1; j < etfs.length; j++) {
      const ov = matrix[`${i}-${j}`];
      if (ov && ov.symmetric > 30) {
        highOverlapPairs.push({ a: etfs[i], b: etfs[j], overlap: ov });
      }
    }
  }
  highOverlapPairs.sort((a, b) => b.overlap.symmetric - a.overlap.symmetric);

  // Total portfolio "double exposure" = portfolio-pct of stocks appearing in 2+ ETFs
  const totalDuplicatedPct = duplicated.reduce((s, d) => s + d.portfolioPct, 0);

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>ETF analizzati</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-1)' }}>{etfs.length}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--analysis-faint)', marginTop: 2 }}>con dati holdings</div>
        </div>
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Titoli duplicati</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FF9F0A' }}>{duplicated.length}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--analysis-faint)', marginTop: 2 }}>in 2+ ETF del portafoglio</div>
        </div>
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Esposizione doppia stim.</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FF453A' }}>{totalDuplicatedPct.toFixed(1)}%</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--analysis-faint)', marginTop: 2 }}>del portafoglio (top holdings)</div>
        </div>
      </div>

      {/* High-overlap alerts */}
      {highOverlapPairs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {highOverlapPairs.slice(0, 3).map(({ a, b, overlap }, i) => (
            <div key={i} style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 8,
              background: overlap.symmetric > 60 ? 'rgba(255,69,58,0.08)' : 'rgba(255,159,10,0.08)',
              border: `1px solid ${overlap.symmetric > 60 ? 'rgba(255,69,58,0.3)' : 'rgba(255,159,10,0.3)'}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <AlertCircle size={14} color={overlap.symmetric > 60 ? '#FF453A' : '#FF9F0A'} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{a.ticker}</span>
                <span style={{ color: 'var(--analysis-dim)', fontSize: '0.8rem' }}> e </span>
                <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{b.ticker}</span>
                <span style={{ color: 'var(--analysis-dim)', fontSize: '0.8rem' }}>
                  {' '}si sovrappongono al <strong style={{ color: overlapTextColor(overlap.symmetric) }}>{overlap.symmetric.toFixed(0)}%</strong> — considera di semplificare
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap matrix */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Matrice di sovrapposizione (% del peso misurato condiviso)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '0.72rem', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--analysis-dim)', fontWeight: 600, whiteSpace: 'nowrap' }}></th>
                {etfs.map(e => (
                  <th key={e.ticker} style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--analysis-dim)', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 64 }}>
                    {e.ticker.split('.')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {etfs.map((rowEtf, i) => (
                <tr key={rowEtf.ticker}>
                  <td style={{ padding: '5px 8px', fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--text-1)' }}>
                    {rowEtf.ticker.split('.')[0]}
                    <span style={{ fontWeight: 400, color: 'var(--analysis-dim)', marginLeft: 4, fontSize: '0.65rem' }}>{rowEtf.weight.toFixed(1)}%</span>
                  </td>
                  {etfs.map((colEtf, j) => {
                    if (i === j) return (
                      <td key={j} style={{ padding: '5px 8px', textAlign: 'center', background: 'var(--analysis-subtle-bg)', borderRadius: 4, color: 'var(--analysis-dim)' }}>—</td>
                    );
                    const ov = matrix[`${i}-${j}`];
                    const sym = ov?.symmetric ?? 0;
                    return (
                      <td key={j} style={{
                        padding: '5px 8px', textAlign: 'center', borderRadius: 4,
                        background: overlapColor(sym),
                        color: overlapTextColor(sym),
                        fontWeight: 700, cursor: 'default',
                      }}
                        title={ov ? `${rowEtf.ticker} copre ${ov.pctOfA.toFixed(0)}% da ${colEtf.ticker}; ${colEtf.ticker} copre ${ov.pctOfB.toFixed(0)}% da ${rowEtf.ticker}` : ''}
                      >
                        {ov ? `${sym.toFixed(0)}%` : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8, fontSize: '0.65rem', color: 'var(--analysis-faint)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span>🟢 &lt;30% bassa</span>
          <span>🟡 30–50% media</span>
          <span>🟠 50–70% alta</span>
          <span>🔴 &gt;70% molto alta</span>
          <span style={{ marginLeft: 'auto' }}>Basato su top holdings nel database · hover per dettaglio direzionale</span>
        </div>
      </div>

      {/* Top duplicated stocks */}
      {duplicated.length > 0 && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Titoli più sovrapposti nel portafoglio
          </div>
          {(showAll ? duplicated : duplicated.slice(0, 10)).map((d, i) => (
            <div key={d.name} style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
              padding: '8px 12px', borderRadius: 9,
              background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(10,132,255,0.12)', fontSize: '0.6rem', fontWeight: 700, color: '#0A84FF', flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--analysis-dim)', marginTop: 1 }}>
                  {d.sources.map(s => s.ticker.split('.')[0]).join(' · ')}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FF9F0A' }}>{d.portfolioPct.toFixed(2)}%</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)' }}>{d.etfCount} ETF</div>
              </div>
            </div>
          ))}
          {duplicated.length > 10 && (
            <button onClick={() => setShowAll(v => !v)} style={{
              width: '100%', marginTop: 6, padding: '7px 12px', borderRadius: 9,
              background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)',
              color: 'var(--analysis-dim)', fontSize: '0.78rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {showAll ? <><ChevronUp size={13} /> Comprimi</> : <><ChevronDown size={13} /> Tutti {duplicated.length} titoli sovrapposti</>}
            </button>
          )}
          <div style={{ marginTop: 10, fontSize: '0.65rem', color: 'var(--analysis-faint)', textAlign: 'center' }}>
            Esposizione di portafoglio = holding_pct × peso ETF. Basato sui top holdings disponibili nel database.
          </div>
        </div>
      )}
    </div>
  );
}


// ── Correlation Matrix ────────────────────────────────────────────────────────

/**
 * Base correlation lookup by asset-type pair.
 * Equity-equity is refined further with geographic + factor data.
 */
const ASSET_TYPE_BASE_CORR = {
  'equity|equity':          0.65, // refined per geography
  'equity|bond':            0.02,
  'equity|commodity':       0.08, // default; overridden per _commodityType in estimateCorrelation
  'equity|crypto':          0.25,
  'equity|money-market':    0.00,
  'equity|real-estate':     0.55,
  'equity|multi-asset':     0.60,
  'bond|bond':              0.80, // refined per duration
  'bond|commodity':         0.05,
  'bond|crypto':            0.00,
  'bond|money-market':      0.82,
  'bond|real-estate':       0.10,
  'bond|multi-asset':       0.35,
  'commodity|commodity':    0.50,
  'commodity|crypto':       0.15,
  'commodity|money-market': 0.00,
  'commodity|real-estate':  0.10,
  'commodity|multi-asset':  0.20,
  'crypto|crypto':          0.80,
  'crypto|money-market':    0.00,
  'crypto|real-estate':     0.15,
  'crypto|multi-asset':     0.30,
  'money-market|money-market': 0.95,
  'money-market|real-estate':  0.02,
  'money-market|multi-asset':  0.15,
  'real-estate|real-estate':   0.85,
  'real-estate|multi-asset':   0.45,
  'multi-asset|multi-asset':   0.65,
};

function pairCorrBase(typeA, typeB) {
  return ASSET_TYPE_BASE_CORR[`${typeA}|${typeB}`]
      ?? ASSET_TYPE_BASE_CORR[`${typeB}|${typeA}`]
      ?? 0.40;
}

function holdingAssetType(ticker, profile) {
  if (profile?._isDirectStock) return 'equity';
  return profile?.assetType ?? 'equity';
}

/**
 * Bhattacharyya overlap coefficient on geography vectors.
 * Returns 0 (no overlap) → 1 (identical weights).
 */
function geoOverlapScore(pA, pB) {
  const gA = Array.isArray(pA?.geography) ? pA.geography : [];
  const gB = Array.isArray(pB?.geography) ? pB.geography : [];
  if (!gA.length || !gB.length) return null;
  const mapA = {};
  gA.forEach(g => { mapA[g.country ?? g.region ?? ''] = (g.pct ?? 0) / 100; });
  let overlap = 0;
  gB.forEach(g => {
    const key = g.country ?? g.region ?? '';
    overlap += Math.min(mapA[key] ?? 0, (g.pct ?? 0) / 100);
  });
  return Math.min(overlap, 1);
}

/**
 * Cosine similarity between factor exposure vectors.
 * Returns null if either profile has no factor data.
 */
function factorSimilarityScore(pA, pB) {
  const fA = pA?.factors; const fB = pB?.factors;
  if (!fA || !fB) return null;
  const keys = [...new Set([...Object.keys(fA), ...Object.keys(fB)])];
  let dot = 0, nA = 0, nB = 0;
  keys.forEach(k => {
    const a = fA[k] ?? 0, b = fB[k] ?? 0;
    dot += a * b; nA += a * a; nB += b * b;
  });
  const denom = Math.sqrt(nA) * Math.sqrt(nB);
  return denom > 0 ? dot / denom : 0;
}

/** Estimate pairwise correlation from profiles — no historical data needed. */
function estimateCorrelation(holdingA, holdingB) {
  if (holdingA.ticker === holdingB.ticker) return 1.0;
  const pA = getRemoteProfile(holdingA.ticker);
  const pB = getRemoteProfile(holdingB.ticker);
  const typeA = holdingAssetType(holdingA.ticker, pA);
  const typeB = holdingAssetType(holdingB.ticker, pB);
  let r = pairCorrBase(typeA, typeB);

  // ── Equity vs Equity ────────────────────────────────────────────────────────
  if (typeA === 'equity' && typeB === 'equity') {
    const isStockA = !!pA?._isDirectStock;
    const isStockB = !!pB?._isDirectStock;

    if (!isStockA && !isStockB) {
      // ETF vs ETF: piena formula geografica
      const geo = geoOverlapScore(pA, pB);
      if (geo !== null) r = 0.65 + 0.32 * geo; // max 0.97 per geo identica
      const fSim = factorSimilarityScore(pA, pB);
      if (fSim !== null) r += fSim * 0.05;
    } else {
      // Almeno una singola azione — la correlazione è guidata da settore/fattori,
      // non dalla geo al 100%. Cap esplicito per evitare 0.99 irrealistici.
      const fSim = factorSimilarityScore(pA, pB) ?? 0.25;
      const geo  = geoOverlapScore(pA, pB);
      if (isStockA && isStockB) {
        // Stock vs Stock: settore-driven, cap 0.82
        r = 0.50 + fSim * 0.30 + (geo ?? 0) * 0.05;
        r = Math.min(r, 0.82);
      } else {
        // Stock vs ETF: geo conta ma in misura ridotta, cap 0.87
        r = 0.55 + fSim * 0.10 + (geo ?? 0.7) * 0.20;
        r = Math.min(r, 0.87);
      }
    }
  }

  // ── Equity vs Commodity ─────────────────────────────────────────────────────
  if ((typeA === 'equity' && typeB === 'commodity') ||
      (typeA === 'commodity' && typeB === 'equity')) {
    const commProfile = typeA === 'commodity' ? pA : pB;
    const ct = commProfile?._commodityType;
    // Rileva metalli preziosi anche dal profilo remoto (senza _commodityType)
    // controllando topHoldings o nome della prima holding
    const topH = (commProfile?.topHoldings?.[0]?.name ?? '').toLowerCase();
    const isPrecious = ct === 'precious_metal'
      || topH.includes('oro') || topH.includes('gold') || topH.includes('xau')
      || topH.includes('silver') || topH.includes('argento');
    if (isPrecious)         r = -0.02; // oro/argento: leggermente negativo con equity
    else if (ct === 'broad') r = 0.18; // commodity basket (se _commodityType disponibile)
    else                     r = 0.18; // default: trattalo come broad commodity
  }

  // ── Bond vs Bond ────────────────────────────────────────────────────────────
  if (typeA === 'bond' && typeB === 'bond') {
    const durA = pA?.bondInfo?.duration;
    const durB = pB?.bondInfo?.duration;
    if (durA != null && durB != null) {
      const durRatio = Math.min(durA, durB) / Math.max(durA, durB, 0.01);
      r = 0.55 + 0.35 * durRatio; // 0.55 (short vs long) → 0.90 (stessa duration)
    }
  }

  return Math.max(-0.99, Math.min(0.99, r));
}

// Heatmap colours ─────────────────────────────────────────────────────────────
function corrBg(r) {
  if (r >= 0.90) return 'rgba(255,69,58,0.28)';
  if (r >= 0.75) return 'rgba(255,159,10,0.28)';
  if (r >= 0.50) return 'rgba(255,214,10,0.22)';
  if (r >= 0.20) return 'rgba(48,209,88,0.14)';
  if (r >= 0.00) return 'rgba(48,209,88,0.07)';
  if (r >= -0.20) return 'rgba(10,132,255,0.14)';
  return 'rgba(10,132,255,0.28)';
}
function corrText(r) {
  if (r >= 0.90) return '#FF453A';
  if (r >= 0.75) return '#FF9F0A';
  if (r >= 0.50) return '#FFD60A';
  if (r >= 0.20) return '#30D158';
  if (r >= 0.00) return '#4CD964';
  if (r >= -0.20) return '#5AC8FA';
  return '#0A84FF';
}
function corrLabel(r) {
  if (r >= 0.92) return 'Quasi identici';
  if (r >= 0.80) return 'Molto alta';
  if (r >= 0.65) return 'Alta';
  if (r >= 0.40) return 'Moderata';
  if (r >= 0.20) return 'Bassa';
  if (r >= -0.05) return 'Trascurabile';
  if (r >= -0.30) return 'Negativa';
  return 'Molto negativa';
}

function buildCorrelationMatrix(holdingsWithValues) {
  const assets = holdingsWithValues
    .filter(h => !h.isCash && h.marketValue > 0)
    .map(h => ({ ticker: h.ticker, name: h.name || h.ticker, weight: h.weight }));

  // NxN matrix
  const matrix = assets.map((a, i) =>
    assets.map((b, j) => i === j ? 1.0 : estimateCorrelation(a, b))
  );

  // Weighted average pairwise correlation (diversification measure)
  let num = 0, den = 0;
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      const wij = (assets[i].weight / 100) * (assets[j].weight / 100);
      num += wij * matrix[i][j];
      den += wij;
    }
  }
  const avgCorr = den > 0 ? num / den : 0;
  const divScore = Math.max(0, Math.min(100, (1 - avgCorr) * 100));

  // Sorted pair list for "most redundant / best diversifier" panels
  const pairs = [];
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      pairs.push({ a: assets[i], b: assets[j], r: matrix[i][j] });
    }
  }
  pairs.sort((x, y) => y.r - x.r);

  return { assets, matrix, pairs, avgCorr, divScore };
}

function CorrelationTab({ holdingsWithValues }) {
  const { assets, matrix, pairs, divScore } = useMemo(
    () => buildCorrelationMatrix(holdingsWithValues),
    [holdingsWithValues]
  );

  if (assets.length < 2) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--analysis-dim)', padding: '3rem', fontSize: '0.85rem' }}>
        Servono almeno 2 asset per costruire la matrice di correlazione.
      </div>
    );
  }

  const highCorrPairs = pairs.filter(p => p.r >= 0.85);
  const divColor = divScore >= 65 ? '#30D158' : divScore >= 40 ? '#FF9F0A' : '#FF453A';
  const divDesc  = divScore >= 65 ? 'Buona diversificazione' : divScore >= 40 ? 'Discreta diversificazione' : 'Bassa diversificazione';

  return (
    <div>
      {/* ── KPI strip ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Asset analizzati</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-1)' }}>{assets.length}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--analysis-faint)', marginTop: 2 }}>{pairs.length} coppie calcolate</div>
        </div>
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Corr. elevate (≥ 0.85)</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: highCorrPairs.length > 0 ? '#FF9F0A' : '#30D158' }}>{highCorrPairs.length}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--analysis-faint)', marginTop: 2 }}>
            {highCorrPairs.length === 0 ? 'nessuna ridondanza evidente' : `${highCorrPairs.length === 1 ? 'coppia ridondante' : 'coppie ridondanti'}`}
          </div>
        </div>
        <div style={{ padding: '14px 16px', borderRadius: 12, background: `${divColor}15`, border: `1px solid ${divColor}44` }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Score diversificazione</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: divColor }}>{divScore.toFixed(0)}</div>
            <div style={{ fontSize: '0.75rem', color: divColor }}>/100</div>
          </div>
          <div style={{ fontSize: '0.68rem', color: divColor, marginTop: 2, fontWeight: 600 }}>{divDesc}</div>
        </div>
      </div>

      {/* ── High-correlation alerts ─────────────────────────────────── */}
      {highCorrPairs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {highCorrPairs.slice(0, 3).map(({ a, b, r }, i) => (
            <div key={i} style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 8,
              background: r >= 0.92 ? 'rgba(255,69,58,0.08)' : 'rgba(255,159,10,0.08)',
              border: `1px solid ${r >= 0.92 ? 'rgba(255,69,58,0.3)' : 'rgba(255,159,10,0.3)'}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <AlertCircle size={14} color={r >= 0.92 ? '#FF453A' : '#FF9F0A'} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: '0.8rem' }}>
                <strong>{a.ticker.split('.')[0]}</strong>
                <span style={{ color: 'var(--analysis-dim)' }}> e </span>
                <strong>{b.ticker.split('.')[0]}</strong>
                <span style={{ color: 'var(--analysis-dim)' }}>
                  {' '}— correlazione stimata{' '}
                  <strong style={{ color: corrText(r) }}>r = {r.toFixed(2)}</strong>
                  {' '}({corrLabel(r)}) · comportamento molto simile nel tempo
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── NxN Heatmap ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Matrice di correlazione stimata
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 3, fontSize: '0.72rem', minWidth: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--analysis-dim)', fontWeight: 600, whiteSpace: 'nowrap' }}></th>
                {assets.map((a, j) => (
                  <th key={j} style={{ padding: '4px 8px', textAlign: 'center', color: 'var(--analysis-dim)', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 60 }}>
                    {a.ticker.split('.')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.map((rowA, i) => (
                <tr key={i}>
                  <td style={{ padding: '5px 8px', fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--text-1)', fontSize: '0.72rem' }}>
                    {rowA.ticker.split('.')[0]}
                    <span style={{ fontWeight: 400, color: 'var(--analysis-dim)', marginLeft: 4, fontSize: '0.62rem' }}>{rowA.weight.toFixed(0)}%</span>
                  </td>
                  {assets.map((colA, j) => {
                    if (i === j) return (
                      <td key={j} style={{
                        padding: '6px 8px', textAlign: 'center', borderRadius: 6,
                        background: 'var(--analysis-subtle-bg)', color: 'var(--analysis-dim)',
                        fontWeight: 700,
                      }}>1.00</td>
                    );
                    const r = matrix[i][j];
                    return (
                      <td key={j}
                        title={`${rowA.ticker.split('.')[0]} × ${colA.ticker.split('.')[0]}: r = ${r.toFixed(2)} — ${corrLabel(r)}`}
                        style={{
                          padding: '6px 8px', textAlign: 'center', borderRadius: 6,
                          background: corrBg(r), color: corrText(r),
                          fontWeight: 700, cursor: 'default',
                        }}
                      >
                        {r.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ marginTop: 8, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.65rem', color: 'var(--analysis-faint)', alignItems: 'center' }}>
          {[
            ['#FF453A', '≥0.90 quasi identici'],
            ['#FF9F0A', '0.75–0.90 alta'],
            ['#FFD60A', '0.50–0.75 moderata'],
            ['#30D158', '<0.50 bassa'],
            ['#0A84FF', 'negativa (diversificante)'],
          ].map(([c, l]) => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 }} />
              {l}
            </span>
          ))}
          <span style={{ marginLeft: 'auto' }}>Hover per interpretazione</span>
        </div>
      </div>

      {/* ── Pair analysis panels ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Most redundant */}
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#FF9F0A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            ▲ Più ridondanti
          </div>
          {pairs.slice(0, Math.min(5, pairs.length)).map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, fontSize: '0.75rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.a.ticker.split('.')[0]} × {p.b.ticker.split('.')[0]}
              </div>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700,
                padding: '2px 8px', borderRadius: 20,
                background: corrBg(p.r), color: corrText(p.r),
                flexShrink: 0,
              }}>r = {p.r.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Best diversifiers */}
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#30D158', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            ▼ Migliori diversificatori
          </div>
          {[...pairs].reverse().slice(0, Math.min(5, pairs.length)).map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, fontSize: '0.75rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.a.ticker.split('.')[0]} × {p.b.ticker.split('.')[0]}
              </div>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700,
                padding: '2px 8px', borderRadius: 20,
                background: corrBg(p.r), color: corrText(p.r),
                flexShrink: 0,
              }}>r = {p.r.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Methodology note ────────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px', borderRadius: 10,
        background: 'rgba(10,132,255,0.06)', border: '1px solid rgba(10,132,255,0.20)',
        fontSize: '0.72rem', color: 'var(--analysis-dim)',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <Info size={13} style={{ flexShrink: 0, color: '#0A84FF', marginTop: 1 }} />
        <div>
          <strong style={{ color: 'var(--text-1)' }}>Nota metodologica:</strong>
          {' '}Correlazioni stimate da profili ETF (tipo asset, composizione geografica ponderata, fattori) — non da rendimenti storici.
          Per la coppia azionaria globale + azionaria regionale si usa la sovrapposizione geografica (es. SWDA vs VUAA: entrambi ~65% USA → alta correlazione stimata).
          Per correlazioni calibrate servirebbero serie storiche mensili di ≥3 anni.
          Usa questo pannello come indicatore qualitativo, non per ottimizzazione quantitativa.
        </div>
      </div>
    </div>
  );
}


/**
 * Build a merged top-holdings list combining static profile data and live Yahoo data.
 * For each ETF, uses the richer data source (more entries = better).
 */
/**
 * Build the merged underlying-holdings list.
 *
 * Logic per holding:
 *  • profile._isDirectStock  → individual stock, include with full weight
 *  • no profile + not an ETF product → unknown asset, include as-is (safe fallback)
 *  • ETF/ETC/ETN with live or static topHoldings → distribute weight among underlying stocks
 *  • ETF/ETC/ETN with NO topHoldings (no composition data) → skip; track as "uncovered"
 *
 * Returns { items: [{name, pct}], uncoveredPct: number, uncoveredNames: string[] }
 */
function buildMergedHoldings(holdingsWithValues, liveData) {
  const totalValue = holdingsWithValues.filter(h => !h.isCash).reduce((s, h) => s + h.marketValue, 0);
  if (totalValue === 0) return { items: [], uncoveredPct: 0, uncoveredNames: [] };

  const stockMap = {};
  const uncoveredNames = [];
  let uncoveredValue = 0;

  const ETF_CATEGORIES = new Set(['ETF', 'ETC', 'ETN', 'Monetario', 'Immobiliare']);

  holdingsWithValues.filter(h => !h.isCash && h.marketValue > 0).forEach(h => {
    const w = h.marketValue / totalValue;
    const profile = getCompositionProfile(h.ticker);
    const staticList = profile?.topHoldings ?? [];
    const liveList   = liveData?.[h.ticker] ?? [];

    // ── Case 1: confirmed individual stock ───────────────────────────────────
    if (profile?._isDirectStock) {
      const name = h.name || h.ticker;
      stockMap[name] = (stockMap[name] || 0) + w * 100;
      return;
    }

    // ── Case 2: no profile at all ────────────────────────────────────────────
    if (!profile) {
      const isEtfProduct = ETF_CATEGORIES.has(h.category) || ETF_CATEGORIES.has(h.macroCategory);
      if (isEtfProduct) {
        // ETF/ETC without any data — mark as uncovered, DON'T show as stock
        uncoveredNames.push(h.name || h.ticker);
        uncoveredValue += h.marketValue;
      } else {
        // Unknown category — treat as direct holding (stock/commodity/etc.)
        const name = h.name || h.ticker;
        stockMap[name] = (stockMap[name] || 0) + w * 100;
      }
      return;
    }

    // ── Case 3: profile exists — check for topHoldings ───────────────────────
    const source = liveList.length > staticList.length ? liveList : staticList;

    if (source.length === 0) {
      // Bond, commodity, money-market, multi-asset ETFs have a full profile
      // (geographic, bondInfo, etc.) but no equity top-holdings by design.
      // Don't count them as "uncovered" — they just don't contribute stocks.
      const nonEquityTypes = new Set(['bond', 'commodity', 'money-market', 'real-estate', 'crypto', 'multi-asset']);
      if (nonEquityTypes.has(profile?.assetType)) {
        return; // silently skip — analytics come from bond/geo sections instead
      }
      // Equity ETF with profile but no holdings list → genuinely uncovered
      uncoveredNames.push(h.name || h.ticker);
      uncoveredValue += h.marketValue;
      return;
    }

    // ── Case 4: distribute weight among underlying stocks ────────────────────
    source.forEach(holding => {
      const pctFrac = holding.pct / 100;
      stockMap[holding.name] = (stockMap[holding.name] || 0) + pctFrac * w * 100;
    });
  });

  const items = Object.entries(stockMap)
    .map(([name, pct]) => ({ name, pct: Math.round(pct * 100) / 100 }))
    .sort((a, b) => b.pct - a.pct);

  const uncoveredPct = totalValue > 0 ? Math.round(uncoveredValue / totalValue * 1000) / 10 : 0;

  return { items, uncoveredPct, uncoveredNames };
}

// ── Obiettivo tab: rebalancing row ───────────────────────────────────────────
function RebalRow({ cat, current, target, threshold, totalValue }) {
  const diff = (current ?? 0) - (target ?? 0);
  const ok = Math.abs(diff) <= threshold;
  const diffVal = (diff / 100) * totalValue;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{ fontSize: '1rem' }}>{cat.emoji}</span>
        <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600 }}>{cat.label}</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: cat.color }}>{(current ?? 0).toFixed(1)}%</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--analysis-dim)' }}>→</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--analysis-dim)' }}>{(target ?? 0).toFixed(0)}%</span>
        <span style={{
          fontSize: '0.78rem', fontWeight: 700, minWidth: 52, textAlign: 'right',
          color: ok ? 'var(--analysis-dim)' : diff > 0 ? '#ff9f0a' : '#30d158',
        }}>
          {ok ? '✓ ok' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}pp`}
        </span>
      </div>
      {/* Two bars: portfolio (colored) + target (ghost) */}
      <div style={{ position: 'relative', height: 8, background: 'var(--analysis-subtle-brd)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(current ?? 0, 100)}%`, background: cat.color, opacity: 0.9, borderRadius: 4, transition: 'width 0.4s' }} />
        {/* Target marker line */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(target ?? 0, 100)}%`, width: 2, background: 'var(--analysis-dim)', opacity: 0.6, transform: 'translateX(-1px)' }} />
      </div>
      {!ok && (
        <div style={{ fontSize: '0.72rem', color: diff > 0 ? '#ff9f0a' : '#30d158', marginTop: 4 }}>
          {diff > 0
            ? `Sovrappesato di ${diff.toFixed(1)}pp (≈${Math.abs(diffVal).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })})`
            : `Sottopesato di ${Math.abs(diff).toFixed(1)}pp (≈${Math.abs(diffVal).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })})`}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PortfolioAnalysis() {
  const [tab, setTab] = useState('geo');
  const [selectedETF, setSelectedETF] = useState(null); // { ticker, name } — scheda dettaglio
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allHoldingsWithValues, setAllHoldingsWithValues] = useState([]); // unfiltered
  const [composition, setComposition] = useState(null);
  const [topHoldings, setTopHoldings] = useState([]);
  const [bondHoldings, setBondHoldings] = useState([]);
  const [etfFactorProfiles, setEtfFactorProfiles] = useState([]);
  const [missingEtfs, setMissingEtfs] = useState([]); // ticker senza profilo
  const [missingDismissed, setMissingDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('etf_missing_dismissed') || '[]'); } catch { return []; }
  });
  const [resolutionWizardOpen, setResolutionWizardOpen] = useState(false);
  const [remoteDBStatus, setRemoteDBStatus] = useState(null); // { version, fresh, error }
  const [showAllHoldings, setShowAllHoldings] = useState(false);
  const [portfolioConfig, setPortfolioConfig] = useState(() => getPortfolioConfig());
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('all'); // 'all' | portfolioId
  const [obiettivoSubTab, setObiettivoSubTab] = useState('alloc'); // 'alloc' | 'micro'
  const [drillDown, setDrillDown] = useState(null); // { dimension:'geo'|'valuta'|'settore', key, label, totalPct }
  const [rawTransactions, setRawTransactions] = useState([]);
  const [evoMonthA, setEvoMonthA] = useState(null);
  const [evoMonthB, setEvoMonthB] = useState(null);
  const [evoCompA, setEvoCompA] = useState(null);
  const [evoCompB, setEvoCompB] = useState(null);
  const [evoLoading, setEvoLoading] = useState(false);
  const [evoSubTab, setEvoSubTab] = useState('geo');
  const [evoDrillDown, setEvoDrillDown] = useState(null); // { key, label }
  const evoPriceCache = useRef({});
  const tabUserSet = useRef(false);

  // ── Filtered holdings based on portfolio selector ────────────────────────
  const holdingsWithValues = useMemo(() => {
    if (selectedPortfolioId === 'all') return allHoldingsWithValues;
    return allHoldingsWithValues.filter(h => portfolioConfig.assignments[h.holdingKey ?? h.ticker] === selectedPortfolioId);
  }, [allHoldingsWithValues, selectedPortfolioId, portfolioConfig.assignments]);

  // ── Drill-down: per-ticker breakdown for a selected geo/currency/sector ────
  const drillDownData = useMemo(() => {
    if (!drillDown || !holdingsWithValues.length) return [];
    const { dimension, key } = drillDown;
    const nonCash = holdingsWithValues.filter(h => !h.isCash && h.marketValue > 0);
    const totalValue = nonCash.reduce((s, h) => s + h.marketValue, 0);
    if (totalValue === 0) return [];

    const rows = [];
    nonCash.forEach(h => {
      const profile = getCompositionProfile(h.ticker);
      if (!profile) return;
      const w = h.marketValue / totalValue;

      let fraction = 0;
      if (dimension === 'geo' && profile.geography?.length) {
        const entry = profile.geography.find(g => (g.country || g.name) === key);
        if (entry) fraction = entry.pct / 100;
      } else if (dimension === 'valuta' && profile.currencies?.length) {
        const entry = profile.currencies.find(c => c.code === key);
        if (entry) fraction = entry.pct / 100;
      } else if (dimension === 'settore' && profile.sectors?.length) {
        const entry = profile.sectors.find(s => s.name === key);
        if (entry) fraction = entry.pct / 100;
      }

      if (fraction <= 0) return;
      rows.push({
        ticker: h.ticker,
        name: h.name || h.ticker,
        contributionPct: fraction * w * 100,
        eur: fraction * h.marketValue,
      });
    });

    return rows.sort((a, b) => b.contributionPct - a.contributionPct);
  }, [drillDown, holdingsWithValues]);

  // Clear drill-downs when tab changes
  useEffect(() => { setDrillDown(null); setEvoDrillDown(null); }, [tab]);
  useEffect(() => { setEvoDrillDown(null); }, [evoSubTab, evoMonthA, evoMonthB]);

  // Per-ticker breakdown for the selected evo row (both months A and B)
  const evoDrillDownData = useMemo(() => {
    if (!evoDrillDown) return [];
    const { key, dimension } = evoDrillDown;

    function tickerContribs(evoComp) {
      if (!evoComp?.holdings?.length) return {};
      const totalValue = evoComp.holdings.reduce((s, h) => s + h.marketValue, 0);
      if (!totalValue) return {};
      const out = {};
      evoComp.holdings.forEach(h => {
        const profile = getCompositionProfile(h.ticker);
        if (!profile) return;
        const w = h.marketValue / totalValue;
        let fraction = 0;
        if (dimension === 'geo' && profile.geography?.length) {
          const e = profile.geography.find(g => (g.country || g.name) === key);
          if (e) fraction = e.pct / 100;
        } else if (dimension === 'valuta' && profile.currencies?.length) {
          const e = profile.currencies.find(c => `${c.name} (${c.code})` === key || c.code === key);
          if (e) fraction = e.pct / 100;
        } else if (dimension === 'settore' && profile.sectors?.length) {
          const e = profile.sectors.find(s => s.name === key);
          if (e) fraction = e.pct / 100;
        }
        if (fraction > 0) {
          out[h.ticker] = { name: h.name || h.ticker, contribPct: fraction * w * 100, eur: fraction * h.marketValue };
        }
      });
      return out;
    }

    const mapA = tickerContribs(evoCompA);
    const mapB = tickerContribs(evoCompB);
    const allTickers = [...new Set([...Object.keys(mapA), ...Object.keys(mapB)])];

    return allTickers
      .map(ticker => ({
        ticker,
        name: (mapA[ticker] || mapB[ticker])?.name || ticker,
        contribA: mapA[ticker]?.contribPct ?? null,
        contribB: mapB[ticker]?.contribPct ?? null,
        eurA: mapA[ticker]?.eur ?? null,
        eurB: mapB[ticker]?.eur ?? null,
        delta: (mapB[ticker]?.contribPct ?? 0) - (mapA[ticker]?.contribPct ?? 0),
      }))
      .sort((a, b) => (b.contribB ?? b.contribA ?? 0) - (a.contribA ?? a.contribB ?? 0));
  }, [evoDrillDown, evoCompA, evoCompB]);

  // ── Evoluzione composizione ───────────────────────────────────────────────
  const availableMonths = useMemo(() => {
    const months = new Set();
    rawTransactions
      .filter(tx => !tx.isCash && tx.date)
      .forEach(tx => months.add(tx.date.substring(0, 7)));
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    return [...months].sort();
  }, [rawTransactions]);

  // Set default months when data loads
  useEffect(() => {
    if (!availableMonths.length || evoMonthB) return;
    const last = availableMonths[availableMonths.length - 1];
    const prev = availableMonths[availableMonths.length - 2] ?? last;
    setEvoMonthB(last);
    setEvoMonthA(prev);
  }, [availableMonths]); // eslint-disable-line

  function getHoldingsAtMonth(transactions, monthKey) {
    const cutoff = monthKey + '-31';
    const quantities = {};
    const meta = {};
    transactions
      .filter(tx => !tx.isCash && tx.date && tx.date <= cutoff)
      .forEach(tx => {
        const t = (tx.ticker || '').toUpperCase();
        if (!t || t === 'CASH') return;
        if (!quantities[t]) {
          quantities[t] = 0;
          meta[t] = { name: tx.name || t, macroCategory: tx.macroCategory || 'Azioni', microCategory: tx.microCategory || '' };
        }
        if (tx.type === 'buy') quantities[t] += (tx.quantity || 0);
        else if (tx.type === 'sell') quantities[t] -= (tx.quantity || 0);
      });
    return Object.entries(quantities)
      .filter(([, q]) => q > 0.0001)
      .map(([ticker, quantity]) => ({ ticker, quantity, isCash: false, ...meta[ticker] }));
  }

  // Fetch composition for a given month
  async function fetchCompAtMonth(monthKey) {
    if (!monthKey) return null;
    const holdings = getHoldingsAtMonth(rawTransactions, monthKey);
    if (!holdings.length) return null;

    // For current month use live prices already in state
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isCurrentMonth = monthKey === curMonth;

    const priceMap = {};
    if (isCurrentMonth) {
      holdingsWithValues.forEach(h => {
        if (h.currentPrice) priceMap[h.ticker.toUpperCase()] = h.currentPrice;
      });
    } else {
      const needFetch = holdings.filter(h => !evoPriceCache.current[`${h.ticker}::${monthKey}`]);
      if (needFetch.length > 0) {
        const [y, m] = monthKey.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        const from = `${monthKey}-01`;
        const to = `${monthKey}-${String(lastDay).padStart(2, '0')}`;
        try {
          const result = await fetchMultipleHistoricalPrices(needFetch.map(h => h.ticker), from, to);
          needFetch.forEach(h => {
            const monthly = buildMonthlyPriceTable(result[h.ticker] || []);
            const price = monthly[monthKey];
            if (price) evoPriceCache.current[`${h.ticker}::${monthKey}`] = price;
          });
        } catch (e) { console.warn('Evo price fetch', e); }
      }
      holdings.forEach(h => {
        const p = evoPriceCache.current[`${h.ticker}::${monthKey}`];
        if (p) priceMap[h.ticker] = p;
      });
    }

    const withValues = holdings
      .filter(h => priceMap[h.ticker])
      .map(h => ({ ...h, marketValue: h.quantity * priceMap[h.ticker] }));
    if (!withValues.length) return null;
    return {
      comp: aggregatePortfolioComposition(withValues),
      tickers: new Set(holdings.map(h => h.ticker)),
      holdings: withValues,
    };
  }

  useEffect(() => {
    if (!evoMonthA || !evoMonthB || !rawTransactions.length) return;
    let cancelled = false;
    setEvoLoading(true);
    Promise.all([fetchCompAtMonth(evoMonthA), fetchCompAtMonth(evoMonthB)])
      .then(([a, b]) => {
        if (cancelled) return;
        setEvoCompA(a);
        setEvoCompB(b);
      })
      .catch(console.warn)
      .finally(() => { if (!cancelled) setEvoLoading(false); });
    return () => { cancelled = true; };
  }, [evoMonthA, evoMonthB, rawTransactions]); // eslint-disable-line

  // ── Copertura classificazione: derivata (da DB) vs da confermare ─────────
  const classCoverage = useMemo(() => {
    const total = holdingsWithValues.reduce((s, h) => s + h.marketValue, 0);
    if (total === 0) return { derivedPct: 0, toConfirm: [], derivedValue: 0, toConfirmValue: 0 };
    let derivedValue = 0;
    const toConfirmMap = {};
    holdingsWithValues.forEach(h => {
      const c = classifyHolding(h);
      if (c.derived) derivedValue += h.marketValue;
      else {
        const k = (h.ticker || '').toUpperCase();
        if (!toConfirmMap[k]) toConfirmMap[k] = { ticker: h.ticker, name: h.name || h.ticker, isin: h.isin || '', value: 0, weight: 0 };
        toConfirmMap[k].value += h.marketValue;
      }
    });
    const toConfirm = Object.values(toConfirmMap)
      .map(t => ({ ...t, weight: (t.value / total) * 100 }))
      .sort((a, b) => b.value - a.value);
    return {
      derivedPct: (derivedValue / total) * 100,
      derivedValue,
      toConfirmValue: total - derivedValue,
      toConfirm,
    };
  }, [holdingsWithValues]);

  const [classReported, setClassReported] = useState(false);

  // ── Obiettivo: compute macro allocation vs target ────────────────────────
  const obiettivo = useMemo(() => {
    if (holdingsWithValues.length === 0) return null;
    const getProfile = (ticker) => getCompositionProfile(ticker);
    const totalValue = holdingsWithValues.reduce((s, h) => s + h.marketValue, 0);
    const current = calcMacroAllocation(holdingsWithValues, getProfile);
    if (!current) return null;

    // Determine target: selected portfolio's target OR global target
    let target = null;
    let threshold = 5;
    let targetLabel = null;
    if (selectedPortfolioId !== 'all') {
      const port = portfolioConfig.portfolios.find(p => p.id === selectedPortfolioId);
      if (port?.targetAllocation) {
        target = port.targetAllocation;
        threshold = port.rebalanceThreshold ?? 5;
        targetLabel = `Target di "${port.name}"`;
      }
    }
    if (!target && portfolioConfig.globalTarget) {
      target = portfolioConfig.globalTarget;
      threshold = portfolioConfig.globalThreshold ?? 5;
      targetLabel = 'Target globale';
    }

    return { current, target, threshold, targetLabel, totalValue };
  }, [holdingsWithValues, selectedPortfolioId, portfolioConfig]);

  // ── Per-factor % exposure stats ──────────────────────────────────────────
  // For each factor: what % of portfolio has positive tilt, negative, neutral, no data
  const factorStats = useMemo(() => {
    if (!holdingsWithValues.length) return null;
    const result = {};
    FACTOR_DEFS.forEach(f => {
      let pos = 0, neg = 0, neutral = 0, noData = 0;
      holdingsWithValues.forEach(h => {
        const profile = getCompositionProfile(h.ticker);
        const w = h.weight ?? 0;
        if (!profile?.factors) {
          noData += w;
        } else {
          const score = profile.factors[f.key] ?? 0;
          if (score >= 0.3)  pos     += w;
          else if (score <= -0.3) neg += w;
          else neutral += w;
        }
      });
      result[f.key] = {
        positive: Math.round(pos * 10) / 10,
        negative: Math.round(neg * 10) / 10,
        neutral:  Math.round(neutral * 10) / 10,
        noData:   Math.round(noData * 10) / 10,
      };
    });
    return result;
  }, [holdingsWithValues]);

  const loadData = async (forceRefresh = false) => {
    try {
      const holdings = calculatePortfolio();
      const nonCash = holdings.filter(h => !h.isCash);

      let prices = getCachedPrices() || {};
      const missingTickers = nonCash.map(h => h.ticker).filter(t => !prices[t] || forceRefresh);
      if (missingTickers.length > 0) {
        try { const fresh = await fetchMultiplePrices(missingTickers); prices = { ...prices, ...fresh }; }
        catch (e) { console.warn('Price fetch error', e); }
      }

      const enriched = holdings
        .filter(h => !h.isCash)
        .map(h => {
          const currentPrice = prices[h.ticker]?.price ?? h.avgPrice;
          const marketValue = h.quantity * currentPrice;
          return { ...h, currentPrice, marketValue };
        })
        .filter(h => h.marketValue > 0);

      const totalValue = enriched.reduce((s, h) => s + h.marketValue, 0);

      const withWeight = enriched
        .map(h => ({
          ...h,
          weight: totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0,
          hasProfile: !!getCompositionProfile(h.ticker),
        }))
        .sort((a, b) => b.marketValue - a.marketValue);

      setAllHoldingsWithValues(withWeight);
      setRawTransactions(getTransactions());
      setPortfolioConfig(getPortfolioConfig());
      // composition/topHoldings/etfFactorProfiles/bondHoldings recomputed by
      // the holdingsWithValues effect below (handles both filter changes and refreshes)
    } catch (err) {
      console.error('PortfolioAnalysis load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Init remote ETF DB in background — non blocca il caricamento
    initRemoteDB().then(status => setRemoteDBStatus(status)).catch(() => {});
    loadData();
  }, []);

  // Recompute composition / topHoldings / etfFactorProfiles / bondHoldings
  // whenever the filtered holdings change (portfolio selector or price refresh)
  useEffect(() => {
    if (holdingsWithValues.length === 0) return;
    setComposition(aggregatePortfolioComposition(holdingsWithValues));
    setTopHoldings(aggregateTopHoldings(holdingsWithValues));
    setEtfFactorProfiles(
      holdingsWithValues
        .map(h => {
          const profile = getCompositionProfile(h.ticker);
          if (!profile?.factors) return null;
          return { ticker: h.ticker, name: h.name, weight: h.weight, factors: profile.factors };
        })
        .filter(Boolean)
    );
    setBondHoldings(
      holdingsWithValues
        .map(h => {
          const profile = getCompositionProfile(h.ticker);
          if (!profile?.bondInfo) return null;
          return { ticker: h.ticker, name: h.name, weight: h.weight, bondInfo: profile.bondInfo };
        })
        .filter(Boolean)
    );

    // Detect ETF tickers senza profilo di composizione
    const nonCashTickers = holdingsWithValues
      .filter(h => !h.isCash)
      .map(h => h.ticker);
    const missing = getMissingTickers(nonCashTickers,
      holdingsWithValues.map(h => ({ ticker: h.ticker, isCash: h.isCash }))
    );
    setMissingEtfs(missing);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdingsWithValues]);

  const handleRefresh = () => { setRefreshing(true); loadData(true); };

  // After an alias is accepted, re-evaluate which tickers are still missing
  const refreshMissingEtfs = React.useCallback(() => {
    const nonCash = holdingsWithValues.filter(h => !h.isCash);
    const tickers = nonCash.map(h => h.ticker);
    const meta = holdingsWithValues.map(h => ({ ticker: h.ticker, isCash: h.isCash }));
    setMissingEtfs(getMissingTickers(tickers, meta));
  }, [holdingsWithValues]);

  // ── Holdings dal database statico (top 10 per ETF, ponderato per valore) ────
  const mergedTopHoldings = useMemo(
    () => buildMergedHoldings(holdingsWithValues, null),
    [holdingsWithValues]
  );

  // ── Cost analysis ─────────────────────────────────────────────────────────
  const costAnalysis = useMemo(() => {
    if (holdingsWithValues.length === 0) return null;

    const nonCash = holdingsWithValues.filter(h => !h.isCash && h.marketValue > 0);
    const totalValue = nonCash.reduce((s, h) => s + h.marketValue, 0);
    if (totalValue === 0) return null;

    // Per-position TER rows
    const rows = nonCash.map(h => {
      const ter = getTerForTicker(h.ticker); // null = unknown, 0 = stock
      const annualCost = ter != null ? (h.marketValue * ter) / 100 : null;
      return {
        ticker: h.ticker,
        name: h.name || h.ticker,
        marketValue: h.marketValue,
        weight: (h.marketValue / totalValue) * 100,
        ter,            // % per anno  (null = sconosciuto)
        annualCost,     // € per anno  (null = sconosciuto)
      };
    }).sort((a, b) => b.marketValue - a.marketValue);

    // Weighted average TER (only over covered positions)
    const coveredValue = rows.filter(r => r.ter != null).reduce((s, r) => s + r.marketValue, 0);
    const uncoveredPct = totalValue > 0 ? ((totalValue - coveredValue) / totalValue) * 100 : 0;
    const weightedTer  = coveredValue > 0
      ? rows.filter(r => r.ter != null).reduce((s, r) => s + r.ter * r.marketValue, 0) / coveredValue
      : 0;
    const totalTerCost = rows.reduce((s, r) => s + (r.annualCost ?? 0), 0);

    // Broker commissions from real transactions
    const allTx = getTransactions().filter(t => t.ticker !== 'CASH' && (t.type === 'buy' || t.type === 'sell'));
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const brokerByYear = {};
    allTx.forEach(t => {
      const commission = parseFloat(t.commission) || 0;
      if (commission === 0) return;
      const year = new Date(t.date).getFullYear();
      brokerByYear[year] = (brokerByYear[year] || 0) + commission;
    });

    // Last 12 months rolling broker cost
    const brokerLast12m = allTx
      .filter(t => new Date(t.date) >= oneYearAgo)
      .reduce((s, t) => s + (parseFloat(t.commission) || 0), 0);

    // Current year broker cost
    const currentYear = now.getFullYear();
    const brokerCurrentYear = brokerByYear[currentYear] ?? 0;

    // Annualised broker cost estimate (based on last 12m)
    const brokerAnnualEstimate = brokerLast12m;

    // Grand total annual estimate
    const grandTotal = totalTerCost + brokerAnnualEstimate;
    const grandTotalPct = totalValue > 0 ? (grandTotal / totalValue) * 100 : 0;

    return {
      rows,
      totalValue,
      weightedTer,
      totalTerCost,
      uncoveredPct,
      brokerByYear,
      brokerLast12m,
      brokerCurrentYear,
      brokerAnnualEstimate,
      grandTotal,
      grandTotalPct,
      hasCommissions: allTx.some(t => (parseFloat(t.commission) || 0) > 0),
    };
  }, [holdingsWithValues]);

  // ── Tabs ─────────────────────────────────────────────────────────────────
  const hasObiettivo = obiettivo?.target != null;
  const tabs = [
    composition?.geography?.length  ? { key: 'geo',        label: 'Geografica', icon: Globe }      : null,
    composition?.currencies?.length ? { key: 'valuta',     label: 'Valuta',     icon: DollarSign }  : null,
    composition?.sectors?.length    ? { key: 'settore',    label: 'Settori',    icon: BarChart2 }   : null,
    composition?.marketType?.length ? { key: 'mercati',    label: 'Mercati',    icon: Layers }      : null,
    (composition?.factors && (composition.factorCoveragePct ?? 0) > 5)
                                    ? { key: 'fattori',    label: 'Fattori',    icon: Zap }         : null,
    holdingsWithValues.length > 0   ? { key: 'underlying',      label: 'Holdings',       icon: List }      : null,
    holdingsWithValues.length > 1   ? { key: 'sovrapposizioni', label: 'Sovrapposizioni', icon: GitMerge }  : null,
    holdingsWithValues.length > 1   ? { key: 'correlazione',    label: 'Correlazione',    icon: Activity }   : null,
    { key: 'posizioni', label: 'Posizioni', icon: TrendingUp },
    holdingsWithValues.length > 0   ? { key: 'costi',      label: 'Costi',      icon: Receipt }     : null,
    { key: 'obiettivo', label: 'Obiettivo', icon: Target },
    availableMonths.length > 1 ? { key: 'evoluzione', label: 'Evoluzione', icon: History } : null,
  ].filter(Boolean);

  useEffect(() => {
    if (!composition) return;
    if (!tabUserSet.current) {
      const preferred = tabs.find(t => t.key === 'geo') ?? tabs[0];
      if (preferred) setTab(preferred.key);
    } else if (!tabs.find(t => t.key === tab)) {
      setTab(tabs[0]?.key ?? 'posizioni');
    }
  }, [composition]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── KPI ──────────────────────────────────────────────────────────────────
  const totalValue  = holdingsWithValues.reduce((s, h) => s + h.marketValue, 0);
  const topCountry  = composition?.geography?.[0];
  const topCurrency = composition?.currencies?.[0];
  const top3Pct     = (composition?.geography ?? []).slice(0, 3).reduce((s, g) => s + g.pct, 0);

  // ── Sector gap rows vs MSCI World ────────────────────────────────────────
  const buildSectorGapRows = () => {
    if (!composition?.sectors?.length) return [];
    const refMap = {};
    MSCI_WORLD_SECTORS_REFERENCE.forEach(r => { refMap[r.name] = r.pct; });
    const allNames = new Set([
      ...composition.sectors.map(s => s.name),
      ...MSCI_WORLD_SECTORS_REFERENCE.map(r => r.name),
    ]);
    const portMap = {};
    composition.sectors.forEach(s => { portMap[s.name] = s.pct; });
    return [...allNames]
      .map(name => ({ name, portfolio: portMap[name] ?? 0, reference: refMap[name] ?? null }))
      .filter(r => r.portfolio > 0.3 || (r.reference ?? 0) > 0.3)
      .sort((a, b) => b.portfolio - a.portfolio);
  };

  // ── Area gap rows vs ACWI ────────────────────────────────────────────────
  const buildAreaGapRows = () => {
    if (!composition?.area?.length) return [];
    const refMap = {};
    ACWI_REFERENCE.area.forEach(r => { refMap[r.name] = r.pct; });
    const allNames = new Set([
      ...composition.area.map(a => a.name),
      ...ACWI_REFERENCE.area.map(r => r.name),
    ]);
    const portMap = {};
    composition.area.forEach(a => { portMap[a.name] = a.pct; });
    return [...allNames]
      .map(name => ({ name, portfolio: portMap[name] ?? 0, reference: refMap[name] ?? 0 }))
      .filter(r => r.portfolio > 0.5 || r.reference > 0.5)
      .sort((a, b) => b.portfolio - a.portfolio);
  };

  // ── Non-EUR exposure ─────────────────────────────────────────────────────
  const nonEurPct = (composition?.currencies ?? [])
    .filter(c => c.code !== 'EUR')
    .reduce((s, c) => s + c.pct, 0);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!loading && allHoldingsWithValues.length === 0) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }}>Analisi Portafoglio</h1>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <BarChart2 size={48} style={{ color: 'var(--analysis-dim)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--analysis-dim)' }}>Nessun asset in portafoglio</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }} className="animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 }}>Analisi Portafoglio</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--analysis-dim)' }}>
            Composizione geografica, mercati, settori, fattori e holdings sottostanti
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Portfolio selector */}
          {portfolioConfig.portfolios.length > 0 && (
            <select
              value={selectedPortfolioId}
              onChange={e => {
                setSelectedPortfolioId(e.target.value);
                tabUserSet.current = false; // Reset tab on filter change
              }}
              style={{
                padding: '7px 28px 7px 12px',
                borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text-1)',
                fontSize: '0.825rem', cursor: 'pointer', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
              }}
            >
              <option value="all">🗂 Tutti i titoli</option>
              {portfolioConfig.portfolios.map(p => (
                <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
              ))}
            </select>
          )}
          <button onClick={handleRefresh} disabled={loading || refreshing} className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : undefined }} />
            {refreshing ? 'Aggiornamento...' : 'Aggiorna prezzi'}
          </button>
        </div>
      </div>
      {/* Active portfolio label */}
      {selectedPortfolioId !== 'all' && (() => {
        const p = portfolioConfig.portfolios.find(x => x.id === selectedPortfolioId);
        return p ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
            padding: '8px 14px', borderRadius: 10,
            background: `${p.color}18`, border: `1px solid ${p.color}44`,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 99, background: p.color }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: p.color }}>
              {p.emoji} {p.name}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--analysis-dim)' }}>
              — analisi filtrata su questo sotto-portafoglio
            </span>
            <button
              onClick={() => setSelectedPortfolioId('all')}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--analysis-dim)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronRight size={12} /> Vedi tutto
            </button>
          </div>
        ) : null;
      })()}

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.25rem' }}>
          {[...Array(4)].map((_, i) => <div key={i} className="card" style={{ height: 80, opacity: 0.4 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: '1.25rem' }}>
          <StatCard
            label="Valore analizzato"
            value={<Blur>{`€${totalValue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`}</Blur>}
            sub={`${holdingsWithValues.length} posizioni`}
          />
          <StatCard
            label="Copertura dati"
            value={`${composition?.coveragePct?.toFixed(0) ?? 0}%`}
            sub="del portafoglio mappato"
            color={(composition?.coveragePct ?? 0) >= 80 ? '#30D158' : (composition?.coveragePct ?? 0) >= 50 ? '#FF9F0A' : '#FF453A'}
          />
          <StatCard
            label="Paese principale"
            value={topCountry?.country ?? '—'}
            sub={topCountry ? `${topCountry.pct.toFixed(1)}% · top 3 = ${top3Pct.toFixed(0)}%` : undefined}
            color={top3Pct > 85 ? '#FF9F0A' : undefined}
          />
          <StatCard
            label="Esposizione non-EUR"
            value={`${nonEurPct.toFixed(0)}%`}
            sub={`${(100 - nonEurPct).toFixed(0)}% in Euro`}
            color={nonEurPct > 70 ? '#FF9F0A' : undefined}
          />
        </div>
      )}

      {/* ── Copertura classificazione (derivata vs da confermare) ────────── */}
      {!loading && holdingsWithValues.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', padding: '1.1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-1)' }}>Copertura classificazione</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: classCoverage.derivedPct >= 95 ? '#30D158' : classCoverage.derivedPct >= 80 ? '#FF9F0A' : '#FF453A' }}>
              {classCoverage.derivedPct.toFixed(0)}% classificato automaticamente
            </div>
          </div>
          {/* Barra */}
          <div style={{ height: 8, borderRadius: 4, background: 'var(--analysis-subtle-brd, var(--surface-2))', overflow: 'hidden', display: 'flex' }}>
            <div style={{ height: '100%', width: `${classCoverage.derivedPct}%`, background: '#30D158' }} />
            <div style={{ height: '100%', width: `${100 - classCoverage.derivedPct}%`, background: '#FF9F0A' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.72rem', color: 'var(--analysis-dim, var(--text-3))' }}>
            <span><span style={{ color: '#30D158', fontWeight: 700 }}>●</span> Derivata dal database</span>
            {classCoverage.toConfirm.length > 0 && (
              <span><span style={{ color: '#FF9F0A', fontWeight: 700 }}>●</span> Da confermare ({classCoverage.toConfirm.length})</span>
            )}
          </div>

          {/* Lista da confermare + segnala */}
          {classCoverage.toConfirm.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--analysis-dim, var(--text-2))', marginBottom: 8, lineHeight: 1.5 }}>
                Questi titoli non sono ancora nel database di composizione: la loro classe è dedotta dal dato salvato e potrebbe non essere precisa. Segnalali per farli aggiungere.
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {classCoverage.toConfirm.map(t => (
                  <span key={t.ticker} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 9px', fontSize: '0.72rem' }}>
                    <strong style={{ color: 'var(--text-1)' }}><Blur>{t.ticker}</Blur></strong>
                    <span style={{ color: 'var(--text-3)' }}>{t.weight.toFixed(1)}%</span>
                  </span>
                ))}
              </div>
              <button
                onClick={() => { reportTickers(classCoverage.toConfirm, { openMail: true }); setClassReported(true); }}
                disabled={classReported}
                style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: classReported ? 'var(--surface-2)' : '#FF9F0A', color: classReported ? 'var(--text-3)' : '#1a1a1a', fontSize: '0.75rem', fontWeight: 700, cursor: classReported ? 'default' : 'pointer' }}>
                {classReported ? '✓ Segnalati al team' : '✉ Segnala per aggiungerli al database'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Coverage banner ──────────────────────────────────────────────── */}
      {!loading && composition?.uncovered?.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.22)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Info size={16} style={{ color: '#FF9F0A', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FF9F0A', marginBottom: 4 }}>
                {composition.uncovered.length} asset senza dati di composizione
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--analysis-dim)', lineHeight: 1.5 }}>
                {composition.uncovered.map(u => (
                  <span key={u.ticker} style={{ marginRight: 10 }}><strong><Blur>{u.ticker}</Blur></strong> ({u.weight.toFixed(1)}%)</span>
                ))}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                <CoverageBar pct={composition.coveragePct} label="Copertura geo/valuta" />
                {composition.sectorCoveragePct < composition.coveragePct && (
                  <CoverageBar pct={composition.sectorCoveragePct} label="Settoriale" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main card ────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1.5rem' }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {loading
            ? [...Array(5)].map((_, i) => <div key={i} style={{ width: 100, height: 34, borderRadius: 10, background: 'var(--analysis-dim-bg)' }} />)
            : tabs.map(t => (
                <TabBtn key={t.key} active={tab === t.key} icon={t.icon} label={t.label}
                  onClick={() => { tabUserSet.current = true; setTab(t.key); }} />
              ))
          }
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div style={{ height: 240, background: 'var(--analysis-subtle-bg)', borderRadius: 12 }} />
            <div style={{ height: 240, background: 'var(--analysis-subtle-bg)', borderRadius: 12 }} />
          </div>
        ) : (
          <>
            {/* ── GEOGRAFICA ──────────────────────────────────────── */}
            {tab === 'geo' && composition?.geography?.length > 0 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <DonutChart data={composition.geography} nameKey="country" valueKey="pct" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <ItemList
                      items={composition.geography} labelKey="country" pctKey="pct"
                      activeKey={drillDown?.key}
                      onRowClick={(item) => {
                        const key = item.country || item.name;
                        if (drillDown?.key === key) { setDrillDown(null); return; }
                        setDrillDown({ dimension: 'geo', key, label: key, totalPct: item.pct });
                      }}
                    />
                  </div>
                </div>
                {drillDown?.dimension === 'geo' && (
                  <DrillDownPanel
                    data={drillDownData} label={drillDown.label} totalPct={drillDown.totalPct}
                    totalValue={holdingsWithValues.filter(h => !h.isCash).reduce((s,h) => s+h.marketValue, 0)}
                    onClose={() => setDrillDown(null)}
                  />
                )}
                {top3Pct > 85 && (
                  <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.22)', fontSize: '0.75rem', color: '#FF9F0A' }}>
                    <AlertCircle size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                    <strong>Concentrazione geografica elevata</strong> — i primi 3 paesi pesano il {top3Pct.toFixed(0)}% del portafoglio.
                    Considera di diversificare verso Europa, Giappone o Mercati Emergenti.
                  </div>
                )}
              </div>
            )}

            {/* ── VALUTA ──────────────────────────────────────────── */}
            {tab === 'valuta' && composition?.currencies?.length > 0 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <DonutChart
                      data={composition.currencies.map(c => ({ ...c, label: `${c.code} – ${c.name}` }))}
                      nameKey="code" valueKey="pct"
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <ItemList
                      items={composition.currencies.map(c => ({ ...c, label: `${c.name} (${c.code})` }))}
                      labelKey="label" pctKey="pct"
                      activeKey={drillDown?.key}
                      onRowClick={(item) => {
                        const key = item.code;
                        if (drillDown?.key === key) { setDrillDown(null); return; }
                        setDrillDown({ dimension: 'valuta', key, label: `${item.name} (${item.code})`, totalPct: item.pct });
                      }}
                    />
                  </div>
                </div>
                {drillDown?.dimension === 'valuta' && (
                  <DrillDownPanel
                    data={drillDownData} label={drillDown.label} totalPct={drillDown.totalPct}
                    totalValue={holdingsWithValues.filter(h => !h.isCash).reduce((s,h) => s+h.marketValue, 0)}
                    onClose={() => setDrillDown(null)}
                  />
                )}
                {/* EUR vs non-EUR summary */}
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'In Euro (EUR)', pct: 100 - nonEurPct, color: '#0A84FF', note: 'Nessun rischio cambio' },
                    { label: 'Non in Euro', pct: nonEurPct, color: '#FF9F0A', note: 'Esposto a variazioni valutarie' },
                  ].map(item => (
                    <div key={item.label} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: item.color }}>{item.pct.toFixed(0)}%</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--analysis-faint)', marginTop: 2 }}>{item.note}</div>
                    </div>
                  ))}
                </div>
                {nonEurPct > 60 && (
                  <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.22)', fontSize: '0.75rem', color: '#FF9F0A' }}>
                    <AlertCircle size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                    Il {nonEurPct.toFixed(0)}% del portafoglio è denominato in valute non-EUR.
                    Considera ETF con copertura valutaria (hedged) se vuoi ridurre il rischio di cambio.
                  </div>
                )}
              </div>
            )}

            {/* ── SETTORI ─────────────────────────────────────────── */}
            {tab === 'settore' && composition?.sectors?.length > 0 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
                  {/* Donut chart */}
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <DonutChart data={composition.sectors} nameKey="name" valueKey="pct" />
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--analysis-dim)', justifyContent: 'center' }}>
                      <div style={{ width: 16, height: 4, background: 'var(--analysis-dim)', opacity: 0.4, borderRadius: 2 }} />
                      Barra grigia = MSCI World benchmark
                    </div>
                  </div>
                  {/* Sector rows with benchmark delta — clickable */}
                  <div style={{ minWidth: 0 }}>
                    {(() => {
                      const rows = buildSectorGapRows();
                      return rows.map((r, i) => {
                        const isActive = drillDown?.key === r.name;
                        return (
                          <div key={r.name}
                            onClick={() => {
                              if (isActive) { setDrillDown(null); return; }
                              const sector = composition.sectors.find(s => s.name === r.name);
                              setDrillDown({ dimension: 'settore', key: r.name, label: r.name, totalPct: sector?.pct ?? r.portfolio });
                            }}
                            style={{
                              cursor: 'pointer', borderRadius: 8, padding: '4px 6px', marginBottom: 2,
                              background: isActive ? 'rgba(10,132,255,0.10)' : 'transparent',
                              border: isActive ? '1px solid rgba(10,132,255,0.28)' : '1px solid transparent',
                              transition: 'all 0.15s',
                            }}
                          >
                            <SectorDeltaRow name={r.name} portfolio={r.portfolio} reference={r.reference} index={i} />
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                {drillDown?.dimension === 'settore' && (
                  <DrillDownPanel
                    data={drillDownData} label={drillDown.label} totalPct={drillDown.totalPct}
                    totalValue={holdingsWithValues.filter(h => !h.isCash).reduce((s,h) => s+h.marketValue, 0)}
                    onClose={() => setDrillDown(null)}
                  />
                )}
                {/* Legend + note */}
                <div style={{ marginTop: 14, display: 'flex', gap: 16, flexWrap: 'wrap', padding: '10px 14px', borderRadius: 10, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)', fontSize: '0.72rem', color: 'var(--analysis-dim)' }}>
                  <span>Benchmark: MSCI World settori (aprile 2026)</span>
                  <span style={{ color: '#30D158' }}>● Verde = sovrappeso vs benchmark</span>
                  <span style={{ color: '#FF453A' }}>● Rosso = sottopeso vs benchmark</span>
                  {composition.sectorCoveragePct < 95 && (
                    <span style={{ marginLeft: 'auto' }}>
                      <AlertCircle size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                      Settori calcolati sul {composition.sectorCoveragePct.toFixed(0)}% del portafoglio
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ── MERCATI ─────────────────────────────────────────── */}
            {tab === 'mercati' && (
              <div>
                {composition?.marketType?.length > 0 && (
                  <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: 20, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--analysis-dim)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Mercati sviluppati vs emergenti
                    </div>
                    <MarketTypeBar marketType={composition.marketType} />
                    {(composition.marketTypeCoveragePct ?? 100) < 95 && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', marginTop: 8 }}>
                        <AlertCircle size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                        Calcolato sul {composition.marketTypeCoveragePct?.toFixed(0)}% (escluse commodities e crypto).
                      </div>
                    )}
                  </div>
                )}
                {composition?.area?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--analysis-dim)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Aree geografiche
                      </div>
                      <DonutChart data={composition.area} nameKey="name" valueKey="pct" />
                      <div style={{ marginTop: 12 }}>
                        <ItemList items={composition.area} labelKey="name" pctKey="pct" initialShow={10} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--analysis-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Gap vs ACWI globale
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--analysis-faint)', marginBottom: 14 }}>
                        Barra blu = portafoglio · grigia = MSCI ACWI benchmark
                      </div>
                      {buildAreaGapRows().map(r => (
                        <GapRow key={r.name} name={r.name} portfolio={r.portfolio} reference={r.reference} />
                      ))}
                      {/* Missing/underweight */}
                      {(() => {
                        const portMap = {};
                        composition.area.forEach(a => { portMap[a.name] = a.pct; });
                        const missing = ACWI_REFERENCE.area.filter(r => (portMap[r.name] ?? 0) < r.pct - 2 && r.pct >= 3);
                        if (!missing.length) return null;
                        return (
                          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.20)' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FF453A', marginBottom: 6 }}>Aree geografiche sottopesate</div>
                            {missing.map(r => (
                              <div key={r.name} style={{ fontSize: '0.75rem', color: 'var(--analysis-dim)', marginBottom: 3 }}>
                                <strong>{r.name}</strong>: ACWI {r.pct.toFixed(0)}% · portafoglio {(portMap[r.name] ?? 0).toFixed(1)}% · gap –{(r.pct - (portMap[r.name] ?? 0)).toFixed(1)}pp
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── EVOLUZIONE COMPOSIZIONE ─────────────────────────── */}
            {tab === 'evoluzione' && (() => {
              const fmtMonth = (mk) => {
                if (!mk) return '—';
                const [y, m] = mk.split('-');
                return new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' })
                  .format(new Date(Number(y), Number(m) - 1, 1));
              };

              // Build delta rows for a given dimension
              const buildDeltaRows = (dimKey) => {
                const getItems = (comp) => {
                  if (!comp?.comp) return [];
                  if (dimKey === 'geo') return (comp.comp.geography || []).map(g => ({ key: g.country || g.name, pct: g.pct }));
                  if (dimKey === 'valuta') return (comp.comp.currencies || []).map(c => ({ key: `${c.name} (${c.code})`, pct: c.pct }));
                  if (dimKey === 'settore') return (comp.comp.sectors || []).map(s => ({ key: s.name, pct: s.pct }));
                  return [];
                };
                const rowsA = getItems(evoCompA);
                const rowsB = getItems(evoCompB);
                const mapA = Object.fromEntries(rowsA.map(r => [r.key, r.pct]));
                const mapB = Object.fromEntries(rowsB.map(r => [r.key, r.pct]));
                const allKeys = [...new Set([...rowsA.map(r => r.key), ...rowsB.map(r => r.key)])];
                return allKeys
                  .map(key => ({ key, pctA: mapA[key] ?? null, pctB: mapB[key] ?? null, delta: (mapB[key] ?? 0) - (mapA[key] ?? 0) }))
                  .sort((a, b) => (b.pctB ?? b.pctA ?? 0) - (a.pctA ?? a.pctB ?? 0));
              };

              // Positions diff
              const tickersA = evoCompA?.tickers ?? new Set();
              const tickersB = evoCompB?.tickers ?? new Set();
              const added = [...tickersB].filter(t => !tickersA.has(t));
              const removed = [...tickersA].filter(t => !tickersB.has(t));

              const subTabs = [
                { key: 'geo', label: 'Geografica' },
                { key: 'valuta', label: 'Valuta' },
                { key: 'settore', label: 'Settori' },
              ];

              const deltaRows = buildDeltaRows(evoSubTab);

              return (
                <div>
                  {/* Month selectors */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--analysis-dim)', fontWeight: 600 }}>Confronta</span>
                    <select value={evoMonthA || ''} onChange={e => setEvoMonthA(e.target.value)} style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--analysis-subtle-brd)',
                      background: 'var(--analysis-subtle-bg)', color: 'var(--text-1)', fontSize: '0.82rem', cursor: 'pointer',
                    }}>
                      {availableMonths.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
                    </select>
                    <span style={{ color: 'var(--analysis-dim)', fontSize: '0.85rem' }}>→</span>
                    <select value={evoMonthB || ''} onChange={e => setEvoMonthB(e.target.value)} style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(10,132,255,0.35)',
                      background: 'rgba(10,132,255,0.07)', color: 'var(--text-1)', fontSize: '0.82rem', cursor: 'pointer',
                    }}>
                      {availableMonths.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
                    </select>
                    {evoLoading && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--analysis-dim)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Caricamento in corso…
                      </span>
                    )}
                  </div>

                  {/* Positions summary banner */}
                  {(added.length > 0 || removed.length > 0) && (
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                      {added.length > 0 && (
                        <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(48,209,88,0.10)', border: '1px solid rgba(48,209,88,0.25)', fontSize: '0.78rem', color: '#30D158' }}>
                          <strong>✦ Nuove posizioni:</strong> {added.join(', ')}
                        </div>
                      )}
                      {removed.length > 0 && (
                        <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,69,58,0.10)', border: '1px solid rgba(255,69,58,0.25)', fontSize: '0.78rem', color: '#FF453A' }}>
                          <strong>✕ Uscite:</strong> {removed.join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dimension sub-tabs */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                    {subTabs.map(st => (
                      <button key={st.key} onClick={() => setEvoSubTab(st.key)} style={{
                        padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: evoSubTab === st.key ? 600 : 400,
                        background: evoSubTab === st.key ? 'rgba(10,132,255,0.18)' : 'transparent',
                        border: evoSubTab === st.key ? '1px solid rgba(10,132,255,0.30)' : '1px solid var(--analysis-subtle-brd)',
                        color: evoSubTab === st.key ? '#0A84FF' : 'var(--analysis-dim)',
                      }}>{st.label}</button>
                    ))}
                  </div>

                  {/* Comparison table */}
                  {evoLoading ? (
                    <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--analysis-dim)', fontSize: '0.82rem' }}>
                      Caricamento in corso…
                    </div>
                  ) : !evoCompA && !evoCompB ? (
                    <div style={{ color: 'var(--analysis-dim)', fontSize: '0.82rem' }}>Nessun dato disponibile per i mesi selezionati.</div>
                  ) : (
                    <>
                    <div style={{ border: '1px solid var(--analysis-subtle-brd)', borderRadius: 12, overflow: 'hidden' }}>
                      {/* Header */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px 24px',
                        padding: '10px 16px', background: 'var(--analysis-subtle-bg)',
                        borderBottom: '1px solid var(--analysis-subtle-brd)',
                        fontSize: '0.72rem', fontWeight: 700, color: 'var(--analysis-dim)',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        <span>Voce</span>
                        <span style={{ textAlign: 'right' }}>{fmtMonth(evoMonthA)?.split(' ')[0].substring(0, 3)}</span>
                        <span style={{ textAlign: 'right' }}>{fmtMonth(evoMonthB)?.split(' ')[0].substring(0, 3)}</span>
                        <span style={{ textAlign: 'right' }}>Δ</span>
                        <span />
                      </div>
                      {/* Rows */}
                      {deltaRows.map((row, i) => {
                        const isNew = row.pctA === null;
                        const isGone = row.pctB === null;
                        const absDelta = Math.abs(row.delta);
                        const deltaColor = isNew ? '#30D158' : isGone ? '#FF453A' : absDelta < 0.3 ? 'var(--analysis-dim)' : row.delta > 0 ? '#30D158' : '#FF453A';
                        const deltaLabel = isNew ? '✦ nuovo' : isGone ? '✕ uscito' : row.delta > 0 ? `+${row.delta.toFixed(1)}pp` : `${row.delta.toFixed(1)}pp`;
                        const isActive = evoDrillDown?.key === row.key;
                        return (
                          <div key={row.key}
                            onClick={() => {
                              if (isActive) { setEvoDrillDown(null); return; }
                              setEvoDrillDown({ key: row.key, label: row.key, dimension: evoSubTab });
                            }}
                            style={{
                              display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px 24px',
                              padding: '9px 16px',
                              cursor: 'pointer',
                              background: isActive ? 'rgba(10,132,255,0.09)' : i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                              borderBottom: i < deltaRows.length - 1 ? '1px solid var(--analysis-subtle-brd)' : 'none',
                              borderLeft: isActive ? '3px solid #0A84FF' : '3px solid transparent',
                              alignItems: 'center',
                              opacity: isGone ? 0.5 : 1,
                              transition: 'background 0.12s',
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                              <span style={{ fontSize: '0.8125rem', fontWeight: isNew || isActive ? 600 : 400 }}>{row.key}</span>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--analysis-dim)' }}>
                              {row.pctA != null ? `${row.pctA.toFixed(1)}%` : '—'}
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>
                              {row.pctB != null ? `${row.pctB.toFixed(1)}%` : '—'}
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '0.78rem', fontWeight: 700, color: deltaColor }}>
                              {deltaLabel}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <ChevronRight size={13} style={{ color: 'var(--analysis-dim)', opacity: isActive ? 1 : 0.35, transform: isActive ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Drill-down panel */}
                    {evoDrillDown && evoDrillDownData.length > 0 && (() => {
                      const maxContrib = Math.max(...evoDrillDownData.map(r => Math.max(r.contribA ?? 0, r.contribB ?? 0)));
                      const fmtA = fmtMonth(evoMonthA)?.split(' ')[0] ?? '';
                      const fmtB = fmtMonth(evoMonthB)?.split(' ')[0] ?? '';
                      return (
                        <div style={{ marginTop: 14, padding: '16px 18px', borderRadius: 12, background: 'rgba(10,132,255,0.06)', border: '1px solid rgba(10,132,255,0.22)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Chi pesa in: </span>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0A84FF' }}>{evoDrillDown.label}</span>
                            </div>
                            <button onClick={() => setEvoDrillDown(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--analysis-dim)', padding: 4 }}>
                              <X size={14} />
                            </button>
                          </div>
                          {/* Sub-header */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 70px', padding: '4px 0 8px', borderBottom: '1px solid var(--analysis-subtle-brd)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <span>Titolo</span>
                            <span style={{ textAlign: 'right' }}>{fmtA}</span>
                            <span style={{ textAlign: 'right' }}>{fmtB}</span>
                            <span style={{ textAlign: 'right' }}>Δ</span>
                          </div>
                          {evoDrillDownData.map((row, i) => {
                            const dColor = row.contribA === null ? '#30D158' : row.contribB === null ? '#FF453A' : Math.abs(row.delta) < 0.05 ? 'var(--analysis-dim)' : row.delta > 0 ? '#30D158' : '#FF453A';
                            const dLabel = row.contribA === null ? '✦ nuovo' : row.contribB === null ? '✕ uscito' : row.delta > 0 ? `+${row.delta.toFixed(2)}pp` : `${row.delta.toFixed(2)}pp`;
                            return (
                              <div key={row.ticker} style={{ paddingTop: 10 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 70px', alignItems: 'center', marginBottom: 5 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                                    <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{row.ticker}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                                  </div>
                                  <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--analysis-dim)' }}>
                                    {row.contribA != null ? `${row.contribA.toFixed(2)}%` : '—'}
                                  </div>
                                  <div style={{ textAlign: 'right', fontSize: '0.78rem', fontWeight: 600 }}>
                                    {row.contribB != null ? `${row.contribB.toFixed(2)}%` : '—'}
                                  </div>
                                  <div style={{ textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: dColor }}>{dLabel}</div>
                                </div>
                                <div style={{ height: 3, background: 'var(--analysis-subtle-brd)', borderRadius: 2, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${maxContrib > 0 ? Math.min(((row.contribB ?? row.contribA ?? 0) / maxContrib) * 100, 100) : 0}%`, background: PALETTE[i % PALETTE.length], borderRadius: 2 }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    </>
                  )}
                </div>
              );
            })()}

            {/* ── FATTORI ─────────────────────────────────────────── */}
            {tab === 'fattori' && factorStats && (
              <div>
                {/* Intro note */}
                <div style={{ fontSize: '0.78rem', color: 'var(--analysis-dim)', marginBottom: 18, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#0A84FF', flexShrink: 0 }} />
                    % portafoglio con tilt positivo
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#FF9F0A', flexShrink: 0 }} />
                    % portafoglio con tilt negativo
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--analysis-subtle-brd)', flexShrink: 0 }} />
                    neutro / dati non disponibili
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--analysis-faint)' }}>
                    Copertura: {composition?.factorCoveragePct?.toFixed(0) ?? 0}% del portafoglio
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
                  {/* LEFT: factor bars */}
                  <div>
                    {FACTOR_DEFS.map(f => (
                      <FactorBar key={f.key} factorDef={f} stats={factorStats[f.key]} />
                    ))}
                  </div>

                  {/* RIGHT: per-ETF/stock breakdown */}
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--analysis-dim)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Tilt per asset in portafoglio
                    </div>
                    {etfFactorProfiles.length > 0 ? etfFactorProfiles.map(etf => {
                      // Compact card: just the strongest positive/negative factor chips per ETF
                      const sigFactors = FACTOR_DEFS
                        .map(f => ({ ...f, v: etf.factors[f.key] ?? 0 }))
                        .filter(f => Math.abs(f.v) >= 0.3)
                        .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
                        .slice(0, 4);
                      return (
                        <div key={etf.ticker} style={{
                          padding: '9px 12px', borderRadius: 10, marginBottom: 7,
                          background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: sigFactors.length > 0 ? 6 : 0 }}>
                            <div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{etf.name || etf.ticker}</span>
                              {etf.name && <span style={{ fontSize: '0.7rem', color: 'var(--analysis-dim)', marginLeft: 6 }}>{etf.ticker}</span>}
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{etf.weight.toFixed(1)}%</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {sigFactors.length > 0 ? sigFactors.map(f => {
                              const isPos = f.v >= 0;
                              const a = Math.abs(f.v);
                              const intensity = a >= 1.0 ? '●●' : a >= 0.5 ? '●' : '◐';
                              return (
                                <span key={f.key} style={{
                                  fontSize: '0.68rem', fontWeight: 700,
                                  padding: '2px 8px', borderRadius: 20,
                                  background: isPos ? 'rgba(10,132,255,0.12)' : 'rgba(255,159,10,0.12)',
                                  color: isPos ? '#0A84FF' : '#FF9F0A',
                                  border: `1px solid ${isPos ? '#0A84FF' : '#FF9F0A'}33`,
                                }}>
                                  {intensity} {f.label} {isPos ? '+' : ''}{f.v.toFixed(1)}
                                </span>
                              );
                            }) : (
                              <span style={{ fontSize: '0.68rem', color: 'var(--analysis-faint)' }}>Neutro</span>
                            )}
                          </div>
                        </div>
                      );
                    }) : (
                      <div style={{ fontSize: '0.82rem', color: 'var(--analysis-dim)', padding: '1.5rem 0' }}>
                        Nessun asset con dati fattoriali.
                      </div>
                    )}

                    {/* Legenda soglia */}
                    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)', fontSize: '0.68rem', color: 'var(--analysis-dim)' }}>
                      Soglia tilt: ◐ 0.3–0.5 · ● 0.5–1.0 · ●● ≥ 1.0 · Positivo = <span style={{ color: '#0A84FF' }}>blu</span> · Negativo = <span style={{ color: '#FF9F0A' }}>arancio</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── HOLDINGS (titoli sottostanti) ────────────────────── */}
            {tab === 'underlying' && (() => {
              const { items: holdingItems, uncoveredPct, uncoveredNames } = mergedTopHoldings;
              const visible = showAllHoldings ? holdingItems : holdingItems.slice(0, 20);
              const maxPct  = holdingItems[0]?.pct ?? 1;
              return (
              <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--analysis-dim)' }}>
                    {holdingItems.length > 0 ? (
                      <>
                        <strong style={{ color: 'var(--text-1)' }}>{holdingItems.length}</strong> titoli sottostanti
                        {' '}· ponderati per valore di portafoglio
                        {uncoveredPct > 0 && (
                          <span style={{ color: '#FF9F0A', marginLeft: 6 }}>
                            · {uncoveredPct.toFixed(0)}% del portafoglio senza dati
                          </span>
                        )}
                      </>
                    ) : (
                      <span>Nessun dato disponibile per gli ETF in portafoglio</span>
                    )}
                  </div>
                </div>

                {/* Uncovered banner */}
                {uncoveredPct > 0 && uncoveredNames.length > 0 && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 8, marginBottom: 14,
                    background: 'rgba(255,159,10,0.07)', border: '1px solid rgba(255,159,10,0.25)',
                    fontSize: '0.72rem', color: 'var(--analysis-dim)',
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    <Info size={13} style={{ flexShrink: 0, color: '#FF9F0A', marginTop: 1 }} />
                    <div>
                      <strong style={{ color: 'var(--text-1)' }}>{uncoveredPct.toFixed(0)}% del portafoglio</strong>
                      {' '}(<Blur tag="span">{uncoveredNames.slice(0, 3).join(', ')}{uncoveredNames.length > 3 ? ` +${uncoveredNames.length - 3}` : ''}</Blur>)
                      {' '}non ha dati di composizione nel database. Le posizioni dirette in azioni non vengono distribuite.
                    </div>
                  </div>
                )}

                {/* Holdings grid */}
                {holdingItems.length > 0 ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                      {visible.map((h, i) => (
                        <div key={h.name} style={{ marginBottom: 9 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                              <div style={{
                                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                                background: `${PALETTE[i % PALETTE.length]}22`,
                                border: `1px solid ${PALETTE[i % PALETTE.length]}44`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.62rem', fontWeight: 700, color: PALETTE[i % PALETTE.length],
                              }}>
                                {i + 1}
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <Blur>{h.name}</Blur>
                              </span>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: PALETTE[i % PALETTE.length], flexShrink: 0, marginLeft: 6 }}>
                              {h.pct.toFixed(2)}%
                            </span>
                          </div>
                          <div style={{ height: 4, background: 'var(--analysis-subtle-brd)', borderRadius: 2, overflow: 'hidden', marginLeft: 29 }}>
                            <div style={{ height: '100%', width: `${(h.pct / maxPct) * 100}%`, background: PALETTE[i % PALETTE.length], borderRadius: 2 }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Show more / less */}
                    {holdingItems.length > 20 && (
                      <button
                        onClick={() => setShowAllHoldings(v => !v)}
                        style={{
                          width: '100%', marginTop: 10, padding: '8px 12px', borderRadius: 9,
                          background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)',
                          color: 'var(--analysis-dim)', fontSize: '0.78rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        {showAllHoldings
                          ? <><ChevronUp size={13} /> Comprimi</>
                          : <><ChevronDown size={13} /> Mostra tutti {holdingItems.length} titoli</>}
                      </button>
                    )}

                    {/* Footer note */}
                    <div style={{ marginTop: 12, fontSize: '0.68rem', color: 'var(--analysis-faint)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span>
                        {remoteDBStatus?.version
                          ? `DB ${remoteDBStatus.version} · Aggiornato da remoto`
                          : 'Database locale · Top 10 titoli per ETF · Ponderati per quota nel portafoglio · Aggiornato maggio 2026'}
                      </span>
                      <button
                        onClick={async () => {
                          const status = await forceRefreshRemoteDB();
                          setRemoteDBStatus(status);
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 6,
                          background: 'transparent', border: '1px solid var(--analysis-subtle-brd)',
                          color: 'var(--analysis-faint)', fontSize: '0.65rem', cursor: 'pointer',
                        }}
                        title="Forza aggiornamento del database remoto ETF"
                      >
                        <RefreshCw size={9} /> Aggiorna DB
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--analysis-dim)', padding: '2rem', fontSize: '0.85rem' }}>
                    Nessun dato sui titoli sottostanti disponibile per gli ETF in portafoglio.
                  </div>
                )}

                {/* Missing ETFs banner — smart resolution */}
                {(() => {
                  const toNotify = missingEtfs.filter(t => !missingDismissed.includes(t));
                  if (toNotify.length === 0) return null;
                  // Check how many have suggestions available (to set button label)
                  const aliasMap = getTickerAliases();
                  const resolvable = toNotify.filter(t => !aliasMap[t.toUpperCase()]);
                  return (
                    <div style={{
                      marginTop: 20, padding: '14px 16px', borderRadius: 12,
                      background: 'rgba(255,159,10,0.07)', border: '1px solid rgba(255,159,10,0.30)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <AlertCircle size={16} color="#FF9F0A" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#FF9F0A', marginBottom: 3 }}>
                            {toNotify.length} {toNotify.length === 1 ? 'strumento non riconosciuto' : 'strumenti non riconosciuti'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', marginBottom: 10 }}>
                            {toNotify.join(', ')} — holdings e analisi settoriali potrebbero essere incomplete.
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            {/* Primary: smart resolution wizard */}
                            {resolvable.length > 0 && (
                              <button
                                onClick={() => setResolutionWizardOpen(true)}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  padding: '5px 13px', borderRadius: 8,
                                  background: 'rgba(255,159,10,0.18)', border: '1px solid rgba(255,159,10,0.45)',
                                  color: '#FF9F0A', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                }}
                              >
                                <Zap size={11} /> Trova equivalenti →
                              </button>
                            )}
                            {/* Secondary: email request */}
                            <a
                              href={`mailto:pezzellatony7@gmail.com?subject=Richiesta%20composizione%20ETF&body=Ciao,%0A%0AFarei%20una%20richiesta%20per%20aggiungere%20i%20seguenti%20ETF%20al%20database:%0A%0A${toNotify.map(t => `- ${t}`).join('%0A')}%0A%0AGrazie!`}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '5px 12px', borderRadius: 8,
                                background: 'transparent', border: '1px solid var(--analysis-subtle-brd)',
                                color: 'var(--analysis-dim)', fontSize: '0.72rem',
                                textDecoration: 'none', cursor: 'pointer',
                              }}
                            >
                              <ExternalLink size={11} /> Richiedi aggiornamento
                            </a>
                            <button
                              onClick={() => {
                                const updated = [...missingDismissed, ...toNotify];
                                setMissingDismissed(updated);
                                try { localStorage.setItem('etf_missing_dismissed', JSON.stringify(updated)); } catch {}
                              }}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '5px 12px', borderRadius: 8,
                                background: 'transparent', border: '1px solid var(--analysis-subtle-brd)',
                                color: 'var(--analysis-dim)', fontSize: '0.72rem', cursor: 'pointer',
                              }}
                            >
                              Ignora
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Bond analytics */}
                {bondHoldings.length > 0 && (
                  <div style={{ marginTop: 24, borderTop: '1px solid var(--analysis-subtle-brd)', paddingTop: 16 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--analysis-dim)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Obbligazioni in portafoglio — duration e rendimento atteso
                    </div>
                    <BondSummaryPanel bondHoldings={bondHoldings} totalPortfolioValue={totalValue} />
                    {bondHoldings.map(b => (
                      <BondInfoCard key={b.ticker} ticker={b.ticker} name={b.name} weight={b.weight} bondInfo={b.bondInfo} />
                    ))}
                  </div>
                )}
              </div>
              );
            })()}

            {/* ── SOVRAPPOSIZIONI ──────────────────────────────────── */}
            {tab === 'sovrapposizioni' && (
              <OverlapTab holdingsWithValues={holdingsWithValues} />
            )}

            {/* ── CORRELAZIONE ─────────────────────────────────────── */}
            {tab === 'correlazione' && (
              <CorrelationTab holdingsWithValues={holdingsWithValues} />
            )}

            {/* ── POSIZIONI ────────────────────────────────────────── */}
            {tab === 'posizioni' && (
              <div>
                {holdingsWithValues.map((h, i) => (
                  <HoldingRow
                    key={h.ticker} h={h} rank={i}
                    onSelect={h.isCash ? undefined : setSelectedETF}
                  />
                ))}
              </div>
            )}

            {/* ── COSTI ────────────────────────────────────────────── */}
            {tab === 'costi' && (() => {
              const ca = costAnalysis;
              if (!ca) return <div style={{ textAlign: 'center', color: 'var(--analysis-dim)', padding: '2rem' }}>Nessun dato disponibile.</div>;

              const fmt = (v) => v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const fmtPct = (v) => v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
              const sortedYears = Object.keys(ca.brokerByYear).map(Number).sort((a, b) => b - a);

              return (
                <div>
                  {/* ── KPI strip ─────────────────────────────────── */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                    {/* TER card */}
                    <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <PiggyBank size={13} color="#0A84FF" />
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TER annuo</span>
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
                        €{fmt(ca.totalTerCost)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', marginTop: 4 }}>
                        TER medio ponderato: <strong style={{ color: 'var(--text-1)' }}>{fmtPct(ca.weightedTer)}%</strong>
                      </div>
                    </div>

                    {/* Broker card */}
                    <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Wallet size={13} color="#FF9F0A" />
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Broker (ultimi 12m)</span>
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
                        {ca.hasCommissions ? `€${fmt(ca.brokerLast12m)}` : <span style={{ fontSize: '0.85rem', color: 'var(--analysis-dim)' }}>Nessuna comm. registrata</span>}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', marginTop: 4 }}>
                        {ca.hasCommissions
                          ? <>Anno corrente: <strong style={{ color: 'var(--text-1)' }}>€{fmt(ca.brokerCurrentYear)}</strong></>
                          : 'Aggiungi commissioni alle transazioni'
                        }
                      </div>
                    </div>

                    {/* Grand total card */}
                    <div style={{
                      padding: '14px 16px', borderRadius: 12,
                      background: 'rgba(10,132,255,0.07)', border: '1px solid rgba(10,132,255,0.20)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <TrendingDown size={13} color="#BF5AF2" />
                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Totale stimato/anno</span>
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0A84FF', lineHeight: 1 }}>
                        €{fmt(ca.grandTotal)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', marginTop: 4 }}>
                        Sul patrimonio: <strong style={{ color: '#0A84FF' }}>{fmtPct(ca.grandTotalPct)}%</strong>/anno
                      </div>
                    </div>
                  </div>

                  {/* ── TER per ETF ───────────────────────────────── */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                      Costi di gestione (TER) per posizione
                    </div>

                    {/* Header */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 90px 70px 80px',
                      gap: 8, padding: '5px 10px',
                      fontSize: '0.65rem', fontWeight: 600, color: 'var(--analysis-faint)',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      <span>Strumento</span>
                      <span style={{ textAlign: 'right' }}>Valore</span>
                      <span style={{ textAlign: 'right' }}>TER %</span>
                      <span style={{ textAlign: 'right' }}>Costo/anno</span>
                    </div>

                    {ca.rows.map((r, i) => (
                      <div
                        key={r.ticker}
                        onClick={() => setSelectedETF({ ticker: r.ticker, name: r.name })}
                        style={{
                          display: 'grid', gridTemplateColumns: '1fr 90px 70px 80px',
                          gap: 8, padding: '8px 10px',
                          borderRadius: 8,
                          background: i % 2 === 0 ? 'transparent' : 'var(--analysis-subtle-bg)',
                          alignItems: 'center',
                          cursor: 'pointer', transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,132,255,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'var(--analysis-subtle-bg)'; }}
                      >
                        {/* Name + ticker — blurred in privacy mode, numbers stay visible */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <Blur>{r.name}</Blur>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--analysis-dim)', marginTop: 1 }}>
                            <Blur>{r.ticker}</Blur>
                            {r.ter === 0 && <span style={{ marginLeft: 6, color: '#30D158', fontSize: '0.62rem' }}>azione singola</span>}
                          </div>
                        </div>

                        {/* Value — visible (user explicitly wants numbers shown) */}
                        <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--analysis-dim)' }}>
                          €{r.marketValue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                        </div>

                        {/* TER % */}
                        <div style={{ textAlign: 'right' }}>
                          {r.ter == null ? (
                            <span style={{ fontSize: '0.7rem', color: 'var(--analysis-faint)' }}>—</span>
                          ) : r.ter === 0 ? (
                            <span style={{ fontSize: '0.78rem', color: '#30D158', fontWeight: 600 }}>0.00%</span>
                          ) : (
                            <span style={{
                              fontSize: '0.78rem', fontWeight: 600,
                              color: r.ter > 0.40 ? '#FF453A' : r.ter > 0.25 ? '#FF9F0A' : '#30D158',
                            }}>
                              {fmtPct(r.ter)}%
                            </span>
                          )}
                        </div>

                        {/* Annual cost */}
                        <div style={{ textAlign: 'right', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-1)' }}>
                          {r.annualCost == null
                            ? <span style={{ color: 'var(--analysis-faint)', fontWeight: 400 }}>—</span>
                            : r.annualCost === 0
                            ? <span style={{ color: '#30D158' }}>€0.00</span>
                            : `€${fmt(r.annualCost)}`
                          }
                        </div>
                      </div>
                    ))}

                    {/* Totale TER */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 90px 70px 80px',
                      gap: 8, padding: '10px 10px 6px',
                      borderTop: '1px solid var(--analysis-subtle-brd)', marginTop: 4,
                      alignItems: 'center',
                    }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-1)' }}>
                        Totale TER
                        {ca.uncoveredPct > 0 && (
                          <span style={{ fontSize: '0.65rem', color: '#FF9F0A', marginLeft: 6, fontWeight: 400 }}>
                            ({ca.uncoveredPct.toFixed(0)}% portafoglio senza TER mappato)
                          </span>
                        )}
                      </div>
                      <div />
                      <div style={{ textAlign: 'right', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-1)' }}>
                        {fmtPct(ca.weightedTer)}%
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: '#0A84FF' }}>
                        €{fmt(ca.totalTerCost)}
                      </div>
                    </div>

                    {/* Note fonte */}
                    <div style={{
                      marginTop: 10, padding: '8px 12px', borderRadius: 8,
                      background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)',
                      fontSize: '0.68rem', color: 'var(--analysis-dim)',
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}>
                      <Info size={12} style={{ flexShrink: 0, color: '#0A84FF', marginTop: 1 }} />
                      <div>
                        Fonte: database interno — siti provider ETF (iShares, Vanguard, SPDR, Amundi) e KIID ufficiali.
                        I TER sono aggiornati a maggio 2026. Verifica annualmente sul sito del provider o su JustETF.
                        I valori a colori: verde ≤0.25% · arancio 0.25–0.40% · rosso &gt;0.40%.
                      </div>
                    </div>
                  </div>

                  {/* ── Costo opportunità nel tempo ───────────────── */}
                  {ca.weightedTer > 0 && (
                    <CostDragSection
                      startValue={ca.totalValue}
                      weightedTerPct={ca.weightedTer}
                    />
                  )}

                  {/* ── Commissioni broker ────────────────────────── */}
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                      Commissioni broker — storico reale
                    </div>

                    {ca.hasCommissions ? (
                      <>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                          {sortedYears.slice(0, 5).map(y => (
                            <div key={y} style={{
                              flex: '1 1 120px', padding: '12px 14px', borderRadius: 10,
                              background: y === new Date().getFullYear()
                                ? 'rgba(255,159,10,0.08)' : 'var(--analysis-subtle-bg)',
                              border: `1px solid ${y === new Date().getFullYear() ? '#FF9F0A44' : 'var(--analysis-subtle-brd)'}`,
                            }}>
                              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                                {y}{y === new Date().getFullYear() ? ' (in corso)' : ''}
                              </div>
                              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-1)' }}>
                                €{fmt(ca.brokerByYear[y])}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{
                          padding: '8px 12px', borderRadius: 8,
                          background: 'var(--analysis-subtle-bg)', border: '1px solid var(--analysis-subtle-brd)',
                          fontSize: '0.68rem', color: 'var(--analysis-dim)',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <Info size={12} style={{ flexShrink: 0, color: '#FF9F0A' }} />
                          Le commissioni sono quelle inserite manualmente nelle transazioni.
                          Per risultati accurati assicurati di compilare il campo "Commissioni" in ogni operazione.
                        </div>
                      </>
                    ) : (
                      <div style={{
                        padding: '16px', borderRadius: 10,
                        background: 'rgba(255,159,10,0.06)', border: '1px solid #FF9F0A33',
                        fontSize: '0.8rem', color: 'var(--analysis-dim)',
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                      }}>
                        <AlertCircle size={16} style={{ flexShrink: 0, color: '#FF9F0A', marginTop: 1 }} />
                        <div>
                          <strong style={{ color: 'var(--text-1)', display: 'block', marginBottom: 4 }}>
                            Nessuna commissione registrata
                          </strong>
                          Per tracciare i costi del broker, inserisci le commissioni pagate nel campo apposito
                          durante l'aggiunta/modifica di ogni transazione.
                          Il costo tipico in Italia: €2–3 per operazione su Fineco/Directa,
                          €1–2 su DEGIRO, €0.50–1 su IBKR.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Confronto costi benchmark ─────────────────── */}
                  {ca.grandTotalPct > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                        Confronto con benchmark di costo
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                          { label: 'Il tuo portafoglio', pct: ca.grandTotalPct, highlight: true },
                          { label: 'ETF globale singolo (es. VWCE)', pct: 0.22, note: 'TER puro, no broker' },
                          { label: 'Fondo attivo medio Italia', pct: 1.80, note: 'TER + performance fee' },
                          { label: 'Piano pensione HNWI (banca)', pct: 2.50, note: 'gestione patrimoniale' },
                        ].map(b => {
                          const maxPct = 2.50;
                          const barW = Math.min((b.pct / maxPct) * 100, 100);
                          const color = b.highlight ? '#0A84FF' : b.pct < 0.30 ? '#30D158' : b.pct < 0.80 ? '#FF9F0A' : '#FF453A';
                          return (
                            <div key={b.label}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: b.highlight ? 700 : 400, color: b.highlight ? 'var(--text-1)' : 'var(--analysis-dim)' }}>
                                  {b.label}
                                  {b.note && <span style={{ fontSize: '0.65rem', color: 'var(--analysis-faint)', marginLeft: 6 }}>{b.note}</span>}
                                </span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color }}>{fmtPct(b.pct)}%</span>
                              </div>
                              <div style={{ height: 6, background: 'var(--analysis-subtle-brd)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${barW}%`, background: color, borderRadius: 3, transition: 'width 0.6s' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── OBIETTIVO ────────────────────────────────────────── */}
            {tab === 'obiettivo' && (
              <div>
                {/* Sub-tabs: Allocazione macro | Micro-allocazione */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                  {[
                    { key: 'alloc', label: 'Allocazione macro' },
                    { key: 'micro', label: 'Micro-allocazione' },
                  ].map(st => (
                    <button key={st.key} onClick={() => setObiettivoSubTab(st.key)} style={{
                      padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: obiettivoSubTab === st.key ? 700 : 400,
                      background: obiettivoSubTab === st.key ? 'rgba(10,132,255,0.15)' : 'var(--analysis-subtle-bg)',
                      color: obiettivoSubTab === st.key ? '#0A84FF' : 'var(--analysis-dim)',
                    }}>
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* ── Micro-allocazione sub-tab ── */}
                {obiettivoSubTab === 'micro' && (
                  <MicroBreakdown holdingsWithValues={holdingsWithValues} />
                )}

                {/* ── Macro allocation sub-tab ── */}
                {obiettivoSubTab === 'alloc' && (obiettivo?.target ? (
                  <>
                    {/* Target label + threshold */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                      <Target size={16} color="#0A84FF" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{obiettivo.targetLabel}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--analysis-dim)' }}>
                        · soglia alert ±{obiettivo.threshold}%
                      </span>
                    </div>

                    {/* Summary macro bar */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--analysis-dim)', marginBottom: 6 }}>
                        <span>Allocazione attuale</span>
                        <span>Valore totale: {obiettivo.totalValue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
                      </div>
                      <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', gap: 1 }}>
                        {MACRO_CATEGORIES.map(cat => {
                          const pct = obiettivo.current[cat.key] ?? 0;
                          if (pct < 0.5) return null;
                          return (
                            <div key={cat.key} style={{ width: `${pct}%`, background: cat.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.4s' }}
                              title={`${cat.label}: ${pct.toFixed(1)}%`}
                            >
                              {pct >= 8 && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#fff' }}>{pct.toFixed(0)}%</span>}
                            </div>
                          );
                        })}
                      </div>
                      {/* Target bar */}
                      <div style={{ display: 'flex', height: 6, borderRadius: 4, overflow: 'hidden', gap: 1, marginTop: 4, opacity: 0.45 }}>
                        {MACRO_CATEGORIES.map(cat => {
                          const pct = obiettivo.target[cat.key] ?? 0;
                          if (pct < 0.5) return null;
                          return <div key={cat.key} style={{ width: `${pct}%`, background: cat.color, flexShrink: 0 }} />;
                        })}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--analysis-dim)', marginTop: 3 }}>Barra sottile = target</div>
                    </div>

                    {/* Per-category rows */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
                      {MACRO_CATEGORIES.filter(cat => {
                        const t = obiettivo.target[cat.key] ?? 0;
                        const c = obiettivo.current[cat.key] ?? 0;
                        return t > 0 || c > 0;
                      }).map(cat => (
                        <RebalRow
                          key={cat.key}
                          cat={cat}
                          current={obiettivo.current[cat.key]}
                          target={obiettivo.target[cat.key]}
                          threshold={obiettivo.threshold}
                          totalValue={obiettivo.totalValue}
                        />
                      ))}
                    </div>

                    {/* Rebalancing actions */}
                    {(() => {
                      const { actions, nextContribAdvice } = calcRebalancing(
                        obiettivo.current, obiettivo.target, obiettivo.totalValue
                      );
                      const alerts = actions.filter(a => Math.abs(a.diff) > obiettivo.threshold && a.target > 0);
                      if (alerts.length === 0) return (
                        <div style={{
                          marginTop: 20, padding: '14px 16px', borderRadius: 12,
                          background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.25)',
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          <CheckCircle2 size={18} color="#30d158" />
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#30d158' }}>Portafoglio allineato all'obiettivo!</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--analysis-dim)' }}>
                              Tutte le categorie rientrano nella soglia di tolleranza di ±{obiettivo.threshold}%.
                            </div>
                          </div>
                        </div>
                      );
                      return (
                        <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 12, background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.25)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <AlertCircle size={16} color="#ff9f0a" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ff9f0a' }}>
                              {alerts.length} {alerts.length === 1 ? 'categoria fuori target' : 'categorie fuori target'}
                            </span>
                          </div>
                          {alerts.map(a => (
                            <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.8rem' }}>
                              <span style={{ fontSize: '1rem' }}>{a.emoji}</span>
                              <span style={{ flex: 1 }}>{a.label}</span>
                              <span style={{ fontWeight: 700, color: a.diff > 0 ? '#ff9f0a' : '#30d158' }}>
                                {a.diff > 0
                                  ? `Vendi ${Math.abs(a.diffVal).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}`
                                  : `Compra ${Math.abs(a.diffVal).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Link to portfolio manager */}
                    <div style={{ marginTop: 16, fontSize: '0.75rem', color: 'var(--analysis-dim)' }}>
                      Gestisci i target di allocazione in{' '}
                      <a href="/portfolios" style={{ color: '#0A84FF', textDecoration: 'none', fontWeight: 600 }}>Portafogli →</a>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                    <Target size={40} style={{ color: 'var(--analysis-dim)', margin: '0 auto 16px' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>Nessun obiettivo impostato</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--analysis-dim)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
                      {selectedPortfolioId !== 'all'
                        ? `Il sotto-portafoglio selezionato non ha un target di allocazione. Impostalo in Portafogli.`
                        : `Imposta un target globale o assegna un target ai tuoi sotto-portafogli per monitorare il rispetto della strategia.`}
                    </div>
                    <a href="/portfolios" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '9px 18px', borderRadius: 10, border: 'none',
                      background: '#0A84FF', color: '#fff',
                      fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
                    }}>
                      <Target size={15} /> Vai a Portafogli
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Fallback */}
            {!['posizioni', 'underlying', 'fattori', 'mercati', 'obiettivo', 'sovrapposizioni', 'correlazione', 'costi'].includes(tab) && !composition?.geography?.length && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--analysis-dim)' }}>
                Dati non disponibili per la visualizzazione selezionata.
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      {!loading && (
        <div style={{ fontSize: '0.72rem', color: 'var(--analysis-faint)', padding: '0 4px' }}>
          Dati aggiornati maggio 2026 · Settori vs MSCI World benchmark · Fattori scala –2/+2 · Gap vs MSCI ACWI/FTSE All-World
        </div>
      )}

      {/* ── ETF Detail Modal ────────────────────────────────────────────── */}
      {selectedETF && (
        <ETFDetailModal
          ticker={selectedETF.ticker}
          name={selectedETF.name}
          onClose={() => setSelectedETF(null)}
        />
      )}

      {/* ── Ticker Resolution Wizard ─────────────────────────────────────── */}
      {resolutionWizardOpen && missingEtfs.filter(t => !missingDismissed.includes(t)).length > 0 && (
        <TickerResolutionWizard
          missingTickers={missingEtfs.filter(t => !missingDismissed.includes(t))}
          holdingsWithValues={holdingsWithValues}
          onClose={() => setResolutionWizardOpen(false)}
          onAliasSet={refreshMissingEtfs}
        />
      )}
    </div>
  );
}
