/**
 * Crypto.jsx — Portfolio Crypto da Binance (v2 — tab-based)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Upload, RefreshCw, TrendingUp, TrendingDown, Coins,
  ArrowUpRight, ArrowDownRight, Gift, Zap, AlertCircle,
  ChevronDown, ChevronUp, Info, Download, Clock, LayoutGrid,
  Table2, History, Bitcoin,
} from 'lucide-react';
import {
  parseBinanceCSV,
  computeHoldings,
  computeEurInvested,
  computePassiveIncome,
  computeBuyStats,
  computeIncomeByYear,
  filterTransactions,
  fetchPrices,
  buildHoldingsRows,
  computePortfolioKPIs,
  COINGECKO_IDS,
} from '../services/binanceCsvService';

// ── Costanti ──────────────────────────────────────────────────────────────────

const STORAGE_KEY    = 'crypto_binance_txs';
const SUMMARY_KEY    = 'crypto_portfolio_summary';

const COIN_COLORS = {
  BTC: '#F7931A', ETH: '#627EEA', BNB: '#F3BA2F', ADA: '#3B4CCA',
  SOL: '#9945FF', DOT: '#E6007A', AVAX: '#E84142', MATIC: '#8247E5',
  SHIB: '#FFA409', GALA: '#005AC9', WBETH: '#8B9DC3', SXT: '#00D4FF',
  USDT: '#26A17B', USDC: '#2775CA', DEFAULT: '#64D2FF',
};

const getCoinColor = (coin) => COIN_COLORS[coin] || COIN_COLORS.DEFAULT;

const FILTER_TABS = [
  { id: 'ALL',      label: 'Tutte',       icon: '📋' },
  { id: 'BUY',      label: 'Acquisti',    icon: '🛒' },
  { id: 'STAKING',  label: 'Staking',     icon: '⚡' },
  { id: 'AIRDROP',  label: 'Airdrops',    icon: '🎁' },
  { id: 'CONVERT',  label: 'Conversioni', icon: '🔄' },
  { id: 'SELL',     label: 'Vendite',     icon: '📤' },
  { id: 'WITHDRAW', label: 'Prelievi',    icon: '↗️' },
];

// ── Utility ───────────────────────────────────────────────────────────────────

const fmt = (n, decimals = 2) =>
  n == null ? '—' : n.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtEur = (n) => n == null ? '—' : '€ ' + fmt(n, 2);

const fmtQty = (n, coin) => {
  if (n == null) return '—';
  const decimals = ['BTC', 'ETH', 'WBETH'].includes(coin) ? 6 : 4;
  return n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
};

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = '#0A84FF', icon: Icon, trend }) {
  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: '16px',
      border: '1px solid var(--border)', padding: '1.25rem 1.5rem',
      display: 'flex', flexDirection: 'column', gap: '0.4rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
        {Icon && (
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `${color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} color={color} />
          </div>
        )}
      </div>
      <div style={{ fontSize: '1.55rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.78rem', color: trend === 'up' ? '#30D158' : trend === 'down' ? '#FF453A' : 'var(--text-3)', fontWeight: 500 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function CoinLogo({ coin, size = 28 }) {
  const color = getCoinColor(coin);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color + '28',
      border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color,
    }}>
      {coin.slice(0, 2)}
    </div>
  );
}

// ── Upload zone ───────────────────────────────────────────────────────────────

function UploadZone({ onFile }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handle = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onFile(e.target.result, file.name);
    reader.readAsText(file);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => inputRef.current.click()}
      style={{
        border: `2px dashed ${dragging ? '#0A84FF' : 'var(--border)'}`,
        borderRadius: '20px', padding: '3.5rem 2rem', textAlign: 'center',
        cursor: 'pointer', transition: 'all 0.2s',
        background: dragging ? 'rgba(10,132,255,0.06)' : 'var(--card-bg)',
        maxWidth: 560, margin: '2rem auto',
      }}
    >
      <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }}
        onChange={e => handle(e.target.files[0])} />
      <div style={{
        width: 60, height: 60, borderRadius: 18, margin: '0 auto 1.25rem',
        background: 'linear-gradient(140deg,#0A84FF22,#30D15822)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Upload size={26} color="#0A84FF" />
      </div>
      <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>
        Carica il CSV Binance
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: '1.25rem' }}>
        Trascina qui il file oppure clicca per selezionarlo
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', background: 'var(--bg)',
        borderRadius: 10, padding: '0.5rem 1.1rem', display: 'inline-block', border: '1px solid var(--border)' }}>
        Binance → Account → Download Transaction History → All (.csv)
      </div>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

const PAGE_TABS = [
  { id: 'overview',  label: 'Panoramica',      icon: LayoutGrid },
  { id: 'holdings',  label: 'Holdings',         icon: Table2 },
  { id: 'income',    label: 'Redditi Passivi',  icon: Zap },
  { id: 'history',   label: 'Storico',          icon: History },
];

function TabBar({ tab, setTab, badge }) {
  return (
    <div style={{
      display: 'flex', gap: '0.3rem',
      background: 'var(--bg)', borderRadius: '14px', padding: '4px',
      border: '1px solid var(--border)', width: 'fit-content',
    }}>
      {PAGE_TABS.map(t => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.45rem 0.95rem', borderRadius: '10px',
            border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: active ? 600 : 500,
            background: active ? 'var(--card-bg)' : 'transparent',
            color: active ? 'var(--text-1)' : 'var(--text-3)',
            boxShadow: active ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
            transition: 'all 0.15s',
          }}>
            <Icon size={14} />
            {t.label}
            {t.id === 'history' && badge > 0 && (
              <span style={{ fontSize: '0.65rem', background: '#0A84FF', color: '#fff',
                borderRadius: 20, padding: '1px 5px', fontWeight: 700, minWidth: 18, textAlign: 'center' }}>
                {badge > 999 ? '1k+' : badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Portfolio donut ───────────────────────────────────────────────────────────

function PortfolioDonut({ holdingsRows }) {
  const data = holdingsRows.filter(r => r.value > 0).slice(0, 8).map(r => ({
    name: r.coin, value: parseFloat(r.value.toFixed(2)), color: getCoinColor(r.coin),
  }));
  const total = data.reduce((s, d) => s + d.value, 0);
  if (data.length === 0) return null;

  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border)', padding: '1.5rem' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-2)' }}>Allocazione</div>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <PieChart width={150} height={150}>
          <Pie data={data} cx={70} cy={70} innerRadius={44} outerRadius={68}
            dataKey="value" strokeWidth={0}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
        </PieChart>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {data.map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem' }}>
              <div style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flexShrink: 0 }} />
              <span style={{ flex: 1, color: 'var(--text-2)', fontWeight: 500 }}>{d.name}</span>
              <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>
                {total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Top holdings mini (per la panoramica) ─────────────────────────────────────

function TopHoldings({ rows }) {
  const top = rows.filter(r => r.value > 0).slice(0, 6);
  if (top.length === 0) return null;

  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Bitcoin size={14} color="#F7931A" />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Principali posizioni</span>
      </div>
      <div>
        {top.map((row, i) => (
          <div key={row.coin} style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto',
            alignItems: 'center', gap: '1rem',
            padding: '0.75rem 1.25rem',
            borderBottom: i < top.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <CoinLogo coin={row.coin} size={26} />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{row.coin}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{fmtQty(row.qty, row.coin)}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{row.hasPrice ? fmtEur(row.value) : '—'}</div>
              {row.change24h != null && (
                <div style={{ fontSize: '0.72rem', color: row.change24h >= 0 ? '#30D158' : '#FF453A' }}>
                  {row.change24h >= 0 ? '+' : ''}{row.change24h.toFixed(2)}%
                </div>
              )}
            </div>
            <div>
              {row.pnlPct != null ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2,
                  fontSize: '0.72rem', fontWeight: 600, borderRadius: 6, padding: '2px 6px',
                  background: row.pnlPct >= 0 ? '#30D15822' : '#FF453A22',
                  color: row.pnlPct >= 0 ? '#30D158' : '#FF453A',
                }}>
                  {row.pnlPct >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {Math.abs(row.pnlPct).toFixed(1)}%
                </span>
              ) : (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>n/d</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Income quick summary (per la panoramica) ──────────────────────────────────

function IncomeSummary({ incomeByYear, onGoToIncome }) {
  if (!incomeByYear || incomeByYear.length === 0) return null;
  const total = incomeByYear.reduce((s, y) => s + y.eurValue, 0);
  const bestYear = incomeByYear.reduce((best, y) => y.eurValue > best.eurValue ? y : best, incomeByYear[0]);

  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border)', padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Zap size={14} color="#FF9F0A" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Redditi passivi</span>
        </div>
        <button onClick={onGoToIncome} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.75rem', color: '#0A84FF', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '0.2rem',
        }}>
          Dettaglio <ArrowUpRight size={12} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: '0.75rem' }}>
        <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Totale</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FF9F0A' }}>{fmtEur(total)}</div>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '0.75rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Miglior anno</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#30D158' }}>{bestYear.year}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{fmtEur(bestYear.eurValue)}</div>
        </div>
        {incomeByYear.slice(-2).map(y => (
          <div key={y.year} style={{ background: 'var(--bg)', borderRadius: 12, padding: '0.75rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>{y.year}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)' }}>{fmtEur(y.eurValue)}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{y.txCount} ops</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Holdings table completa ────────────────────────────────────────────────────

function HoldingsTable({ rows, showDust, onToggleDust }) {
  const filtered  = showDust ? rows : rows.filter(r => (r.value || 0) >= 1);
  const dustCount = rows.length - filtered.length;

  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Coins size={15} color="#0A84FF" />
        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
          Holdings — {filtered.length} coin{filtered.length !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginLeft: 'auto' }}>
          Prezzi live CoinGecko
        </span>
        {dustCount > 0 && (
          <button onClick={onToggleDust} style={{
            padding: '0.25rem 0.65rem', borderRadius: 8, fontSize: '0.72rem',
            border: '1px solid var(--border)', background: showDust ? '#0A84FF22' : 'var(--bg)',
            color: showDust ? '#0A84FF' : 'var(--text-3)', cursor: 'pointer', fontWeight: 500,
          }}>
            {showDust ? `Nascondi dust (${dustCount})` : `Mostra dust (${dustCount})`}
          </button>
        )}
      </div>

      {/* P&L note */}
      <div style={{ padding: '0.55rem 1.25rem', background: 'rgba(10,132,255,0.05)',
        fontSize: '0.72rem', color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
        ℹ️ P&L calcolato solo per le coin acquistate direttamente in EUR. Per staking e airdrops il costo base è €0 (ricevuti gratuitamente).
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg)' }}>
              {['Coin', 'Quantità', 'Prezzo Attuale', 'Valore €', 'P&L €', 'P&L %', 'Var. 24h', 'Staking guadagnato'].map(h => (
                <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600,
                  color: 'var(--text-3)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                  whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={row.coin}
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                <td style={{ padding: '0.8rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CoinLogo coin={row.coin} size={28} />
                    <span style={{ fontWeight: 600 }}>{row.coin}</span>
                  </div>
                </td>

                <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', color: 'var(--text-2)', fontSize: '0.8rem' }}>
                  {fmtQty(row.qty, row.coin)}
                </td>

                <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {row.hasPrice
                    ? fmtEur(row.price)
                    : <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>n/d</span>}
                </td>

                <td style={{ padding: '0.8rem 1rem', fontWeight: 600 }}>
                  {row.hasPrice ? fmtEur(row.value) : '—'}
                </td>

                <td style={{ padding: '0.8rem 1rem', color: row.pnl == null ? 'var(--text-3)' : row.pnl >= 0 ? '#30D158' : '#FF453A', fontWeight: 600, fontSize: '0.8rem' }}>
                  {row.pnl == null ? <span style={{ fontSize: '0.72rem' }}>—</span> : (row.pnl >= 0 ? '+' : '') + fmtEur(row.pnl)}
                </td>

                <td style={{ padding: '0.8rem 1rem' }}>
                  {row.pnlPct == null ? <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>—</span> : (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      fontSize: '0.76rem', fontWeight: 600, borderRadius: 6, padding: '2px 7px',
                      background: row.pnlPct >= 0 ? '#30D15822' : '#FF453A22',
                      color: row.pnlPct >= 0 ? '#30D158' : '#FF453A',
                    }}>
                      {row.pnlPct >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {Math.abs(row.pnlPct).toFixed(1)}%
                    </span>
                  )}
                </td>

                <td style={{ padding: '0.8rem 1rem', fontSize: '0.78rem' }}>
                  {row.change24h != null ? (
                    <span style={{ color: row.change24h >= 0 ? '#30D158' : '#FF453A', fontWeight: 500 }}>
                      {row.change24h >= 0 ? '+' : ''}{row.change24h.toFixed(2)}%
                    </span>
                  ) : '—'}
                </td>

                <td style={{ padding: '0.8rem 1rem', color: '#FF9F0A', fontWeight: 600, fontSize: '0.8rem' }}>
                  {row.passiveEur > 0 ? `+${fmtEur(row.passiveEur)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Income chart ───────────────────────────────────────────────────────────────

function IncomeChart({ incomeByYear }) {
  if (!incomeByYear || incomeByYear.length === 0) return null;

  const data = incomeByYear.map(y => ({
    year: y.year,
    Staking: parseFloat(y.staking.toFixed(2)),
    Airdrops: parseFloat(y.airdrop.toFixed(2)),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Anno per anno */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '0.75rem' }}>
        {incomeByYear.map(y => (
          <div key={y.year} style={{ background: 'var(--card-bg)', borderRadius: 14, padding: '1rem 1.1rem', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{y.year}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#30D158', margin: '0.25rem 0' }}>{fmtEur(y.eurValue)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <span>⚡ {fmtEur(y.staking)}</span>
              <span>🎁 {fmtEur(y.airdrop)}</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{y.txCount} operazioni</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border)', padding: '1.5rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-2)' }}>
          Distribuzione staking vs airdrops
          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 400, marginLeft: '0.5rem' }}>valore ai prezzi attuali</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: 'var(--text-3)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickFormatter={v => `€${v}`} />
            <Tooltip
              formatter={(value, name) => [`€ ${fmt(value)}`, name]}
              contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10 }}
            />
            <Legend />
            <Bar dataKey="Staking"  fill="#FF9F0A" radius={[4,4,0,0]} />
            <Bar dataKey="Airdrops" fill="#BF5AF2" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Transaction history ───────────────────────────────────────────────────────

const CATEGORY_STYLE = {
  BUY:      { bg: '#30D15822', color: '#30D158', label: 'Acquisto' },
  SELL:     { bg: '#FF453A22', color: '#FF453A', label: 'Vendita' },
  STAKING:  { bg: '#FF9F0A22', color: '#FF9F0A', label: 'Staking' },
  AIRDROP:  { bg: '#BF5AF222', color: '#BF5AF2', label: 'Airdrop' },
  CONVERT:  { bg: '#0A84FF22', color: '#0A84FF', label: 'Conversione' },
  WITHDRAW: { bg: '#64D2FF22', color: '#64D2FF', label: 'Prelievo' },
  DEPOSIT:  { bg: '#30D15822', color: '#30D158', label: 'Deposito' },
  FEE:      { bg: '#FF453A11', color: '#FF453A', label: 'Fee' },
  OTHER:    { bg: 'var(--bg)', color: 'var(--text-3)', label: 'Altro' },
};

function TransactionRow({ tx }) {
  const style = CATEGORY_STYLE[tx.category] || CATEGORY_STYLE.OTHER;
  const isPositive = tx.change > 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 90px auto', gap: '0.75rem',
      alignItems: 'center', padding: '0.65rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
      <div style={{ color: 'var(--text-3)', fontSize: '0.7rem' }}>
        {tx.date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })}
        <br />
        <span style={{ opacity: 0.6 }}>{tx.date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div>
        <div style={{ fontWeight: 500, color: 'var(--text-1)', marginBottom: '0.1rem', fontSize: '0.78rem' }}>{tx.operation}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <CoinLogo coin={tx.coin} size={14} />
          <span style={{ color: 'var(--text-3)', fontSize: '0.7rem' }}>{tx.coin}</span>
          {tx.remark && <span style={{ color: 'var(--text-3)', fontSize: '0.68rem', opacity: 0.55 }}>· {tx.remark.slice(0, 28)}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.78rem',
        color: isPositive ? '#30D158' : '#FF453A' }}>
        {isPositive ? '+' : ''}{fmtQty(tx.change, tx.coin)} {tx.coin}
      </div>
      <span style={{ background: style.bg, color: style.color, fontSize: '0.66rem', fontWeight: 600,
        borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>
        {style.label}
      </span>
    </div>
  );
}

function TransactionHistory({ txs }) {
  const [filter, setFilter] = useState('ALL');
  const [page,   setPage]   = useState(0);
  const PAGE = 50;

  const filtered = filterTransactions(txs, filter).slice().reverse();
  const pages    = Math.ceil(filtered.length / PAGE);
  const visible  = filtered.slice(page * PAGE, (page + 1) * PAGE);

  const handleFilter = (f) => { setFilter(f); setPage(0); };

  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Clock size={14} color="#64D2FF" />
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Storico transazioni</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginLeft: 'auto' }}>
            {filtered.length.toLocaleString('it-IT')} transazioni
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {FILTER_TABS.map(t => (
            <button key={t.id} onClick={() => handleFilter(t.id)} style={{
              padding: '0.28rem 0.65rem', borderRadius: 8, fontSize: '0.74rem', fontWeight: 500,
              border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s',
              background: filter === t.id ? '#0A84FF' : 'var(--bg)',
              color: filter === t.id ? '#fff' : 'var(--text-2)',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {visible.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>
            Nessuna transazione per questo filtro
          </div>
        ) : (
          visible.map(tx => <TransactionRow key={tx.id} tx={tx} />)
        )}
      </div>

      {pages > 1 && (
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '0.3rem 0.7rem', cursor: page === 0 ? 'not-allowed' : 'pointer',
              color: page === 0 ? 'var(--text-3)' : 'var(--text-2)', fontWeight: 500, fontSize: '0.78rem' }}>
            ← Prec
          </button>
          <span style={{ color: 'var(--text-3)' }}>
            Pag. {page + 1} di {pages} · {filtered.length} transazioni
          </span>
          <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page === pages - 1}
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '0.3rem 0.7rem', cursor: page === pages - 1 ? 'not-allowed' : 'pointer',
              color: page === pages - 1 ? 'var(--text-3)' : 'var(--text-2)', fontWeight: 500, fontSize: '0.78rem' }}>
            Succ →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Nota fiscale ──────────────────────────────────────────────────────────────

function FiscalNote({ kpis, incomeByYear }) {
  const [open, setOpen] = useState(false);
  const totalStaking = incomeByYear.reduce((s, y) => s + y.staking, 0);
  const totalAirdrop = incomeByYear.reduce((s, y) => s + y.airdrop, 0);

  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid rgba(255,159,10,0.3)', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', padding: '1rem 1.25rem', background: 'none', border: 'none',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', textAlign: 'left',
      }}>
        <AlertCircle size={15} color="#FF9F0A" />
        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Note fiscali — Italia</span>
        <Info size={12} color="var(--text-3)" style={{ marginLeft: 2 }} />
        <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(255,69,58,0.07)', borderRadius: 12, padding: '0.85rem', border: '1px solid rgba(255,69,58,0.2)' }}>
              <div style={{ fontSize: '0.68rem', color: '#FF453A', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Plusvalenze</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: kpis.pnl >= 0 ? '#30D158' : '#FF453A' }}>
                {kpis.pnl >= 0 ? '+' : ''}{fmtEur(kpis.pnl)}
              </div>
              <div style={{ color: 'var(--text-3)', marginTop: '0.25rem' }}>Aliquota: <strong>26%</strong> su plusvalenze nette &gt; €2.000</div>
              <div style={{ color: 'var(--text-3)', marginTop: '0.1rem' }}>Stima imposta: <strong style={{ color: '#FF453A' }}>{fmtEur(Math.max(0, kpis.pnl) * 0.26)}</strong></div>
            </div>
            <div style={{ background: 'rgba(255,159,10,0.07)', borderRadius: 12, padding: '0.85rem', border: '1px solid rgba(255,159,10,0.2)' }}>
              <div style={{ fontSize: '0.68rem', color: '#FF9F0A', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Staking</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FF9F0A' }}>{fmtEur(totalStaking)}</div>
              <div style={{ color: 'var(--text-3)', marginTop: '0.25rem' }}>Redditi diversi (art. 67 TUIR)</div>
              <div style={{ color: 'var(--text-3)', marginTop: '0.1rem' }}>Aliquota marginale IRPEF</div>
            </div>
            <div style={{ background: 'rgba(191,90,242,0.07)', borderRadius: 12, padding: '0.85rem', border: '1px solid rgba(191,90,242,0.2)' }}>
              <div style={{ fontSize: '0.68rem', color: '#BF5AF2', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Airdrops</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#BF5AF2' }}>{fmtEur(totalAirdrop)}</div>
              <div style={{ color: 'var(--text-3)', marginTop: '0.25rem' }}>Redditi diversi al valore di ricezione</div>
              <div style={{ color: 'var(--text-3)', marginTop: '0.1rem', fontSize: '0.72rem' }}>⚠ Conserva prova del valore alla data</div>
            </div>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '0.75rem 1rem', color: 'var(--text-3)', lineHeight: 1.6, fontSize: '0.78rem' }}>
            <strong style={{ color: 'var(--text-2)' }}>⚠️ Disclaimer:</strong> Stime indicative. La normativa sulle criptovalute è complessa (D.Lgs. 209/2023).
            Consulta un commercialista per la dichiarazione dei redditi (Quadro RW + RT).
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pagina principale ─────────────────────────────────────────────────────────

export default function Crypto() {
  const [txs,           setTxs]           = useState(null);
  const [fileName,      setFileName]      = useState('');
  const [prices,        setPrices]        = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [pricesTs,      setPricesTs]      = useState(null);
  const [error,         setError]         = useState(null);
  const [tab,           setTab]           = useState('overview');
  const [showDust,      setShowDust]      = useState(false);

  // ── Carica txs da localStorage al mount ──────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { txsRaw, fileName: fn } = JSON.parse(saved);
        const rehydrated = txsRaw.map(t => ({ ...t, date: new Date(t.date) }));
        setTxs(rehydrated);
        setFileName(fn || '');
      }
    } catch {}
  }, []);

  // ── Fetch prezzi quando txs cambia ───────────────────────────────────────
  useEffect(() => {
    if (!txs) return;
    const holdings = computeHoldings(txs);
    const coins = Object.keys(holdings);
    if (coins.length === 0) return;
    setLoadingPrices(true);
    fetchPrices(coins).then(p => { setPrices(p); setPricesTs(new Date()); setLoadingPrices(false); })
      .catch(() => setLoadingPrices(false));
  }, [txs]);

  // ── Calcoli derivati ──────────────────────────────────────────────────────
  const derived = React.useMemo(() => {
    if (!txs) return null;
    const holdings      = computeHoldings(txs);
    const eurInvested   = computeEurInvested(txs);
    const passiveIncome = computePassiveIncome(txs);
    const buyStats      = computeBuyStats(txs);
    const priceMap      = Object.fromEntries(Object.entries(prices).map(([c, p]) => [c, p.price]));
    const incomeByYear  = computeIncomeByYear(txs, priceMap);
    const holdingsRows  = buildHoldingsRows(holdings, prices, buyStats, passiveIncome);
    const kpis          = computePortfolioKPIs(holdings, prices, eurInvested, passiveIncome);
    return { holdings, eurInvested, passiveIncome, buyStats, incomeByYear, holdingsRows, kpis };
  }, [txs, prices]);

  // ── Salva summary per il Dashboard ───────────────────────────────────────
  useEffect(() => {
    if (!derived || derived.kpis.totalValue === 0) return;
    localStorage.setItem(SUMMARY_KEY, JSON.stringify({
      totalValue:      derived.kpis.totalValue,
      pnl:             derived.kpis.pnl,
      pnlPct:          derived.kpis.pnlPct,
      eurInvested:     derived.kpis.eurInvested,
      totalPassiveEur: derived.kpis.totalPassiveEur,
      numCoins:        derived.holdingsRows.filter(r => (r.value || 0) >= 1).length,
      updatedAt:       new Date().toISOString(),
    }));
  }, [derived]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFile = useCallback((csvText, name) => {
    setError(null);
    try {
      const parsed = parseBinanceCSV(csvText);
      if (parsed.length === 0) {
        setError('Nessuna transazione valida trovata. Esporta da Binance → Account → Download Transaction History → All (.csv).');
        return;
      }
      setTxs(parsed);
      setFileName(name || 'binance.csv');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ txsRaw: parsed, fileName: name }));
      setTab('overview');
    } catch (e) {
      setError('Errore nel parsing del CSV: ' + e.message);
    }
  }, []);

  const handleRefreshPrices = useCallback(() => {
    if (!txs) return;
    const coins = Object.keys(computeHoldings(txs));
    setLoadingPrices(true);
    fetchPrices(coins).then(p => { setPrices(p); setPricesTs(new Date()); setLoadingPrices(false); })
      .catch(() => setLoadingPrices(false));
  }, [txs]);

  const handleReset = useCallback(() => {
    if (!confirm('Rimuovere i dati Binance caricati?')) return;
    setTxs(null); setFileName(''); setPrices({}); setPricesTs(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SUMMARY_KEY);
    setTab('overview');
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.15rem' }}>
            <Bitcoin size={22} color="#F7931A" />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Crypto Portfolio</h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '0.82rem' }}>
            {txs
              ? `${fileName} · ${txs.length.toLocaleString('it-IT')} righe · prezzi: ${pricesTs ? pricesTs.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '…'}`
              : 'Importa il tuo storico Binance per analizzare holdings, staking e P&L'}
          </p>
        </div>

        {txs && (
          <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleRefreshPrices} disabled={loadingPrices}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.8rem',
                borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)',
                cursor: loadingPrices ? 'not-allowed' : 'pointer', fontSize: '0.78rem', color: 'var(--text-2)' }}>
              <RefreshCw size={12} style={{ animation: loadingPrices ? 'spin 1s linear infinite' : 'none' }} />
              {loadingPrices ? 'Caricamento…' : 'Aggiorna prezzi'}
            </button>
            <button onClick={handleReset}
              style={{ padding: '0.45rem 0.8rem', borderRadius: 10, border: '1px solid rgba(255,69,58,0.3)',
                background: 'rgba(255,69,58,0.08)', cursor: 'pointer', fontSize: '0.78rem', color: '#FF453A' }}>
              Rimuovi CSV
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.3)',
          borderRadius: 12, padding: '0.85rem 1rem', color: '#FF453A', fontSize: '0.83rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Upload zone */}
      {!txs && <UploadZone onFile={handleFile} />}

      {/* Dashboard con tabs */}
      {txs && derived && (
        <>
          {/* Tab bar */}
          <TabBar tab={tab} setTab={setTab} badge={txs.length} />

          {/* ── Panoramica ── */}
          {tab === 'overview' && (
            <>
              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '0.85rem' }}>
                <KpiCard
                  label="Valore Attuale"
                  value={loadingPrices ? '…' : fmtEur(derived.kpis.totalValue)}
                  sub={`${derived.holdingsRows.filter(r => (r.value||0) >= 1).length} coin`}
                  icon={Bitcoin}
                  color="#F7931A"
                />
                <KpiCard
                  label="Investito"
                  value={fmtEur(derived.kpis.eurInvested)}
                  sub="Fiat EUR spesi"
                  icon={TrendingUp}
                  color="#64D2FF"
                />
                <KpiCard
                  label="P&L Non Realizzato"
                  value={loadingPrices ? '…' : (derived.kpis.pnl >= 0 ? '+' : '') + fmtEur(derived.kpis.pnl)}
                  sub={(derived.kpis.pnlPct >= 0 ? '+' : '') + derived.kpis.pnlPct.toFixed(1) + '% sul capitale'}
                  icon={derived.kpis.pnl >= 0 ? TrendingUp : TrendingDown}
                  color={derived.kpis.pnl >= 0 ? '#30D158' : '#FF453A'}
                  trend={derived.kpis.pnl >= 0 ? 'up' : 'down'}
                />
                <KpiCard
                  label="Staking + Airdrops"
                  value={loadingPrices ? '…' : fmtEur(derived.kpis.totalPassiveEur)}
                  sub={derived.passiveIncome.total_txs + ' operazioni passive'}
                  icon={Gift}
                  color="#FF9F0A"
                  trend="up"
                />
              </div>

              {/* Top holdings + Donut */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1rem', alignItems: 'start' }}>
                <TopHoldings rows={derived.holdingsRows} />
                <PortfolioDonut holdingsRows={derived.holdingsRows} />
              </div>

              {/* Income quick summary */}
              <IncomeSummary incomeByYear={derived.incomeByYear} onGoToIncome={() => setTab('income')} />
            </>
          )}

          {/* ── Holdings ── */}
          {tab === 'holdings' && (
            <HoldingsTable
              rows={derived.holdingsRows}
              showDust={showDust}
              onToggleDust={() => setShowDust(v => !v)}
            />
          )}

          {/* ── Redditi Passivi ── */}
          {tab === 'income' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Zap size={16} color="#FF9F0A" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Redditi passivi da staking e airdrops</span>
              </div>
              <IncomeChart incomeByYear={derived.incomeByYear} />
            </>
          )}

          {/* ── Storico ── */}
          {tab === 'history' && (
            <>
              <TransactionHistory txs={txs} />
              <FiscalNote kpis={derived.kpis} incomeByYear={derived.incomeByYear} />
            </>
          )}
        </>
      )}
    </div>
  );
}
