import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Coins, TrendingUp, TrendingDown, ArrowRight, Edit3, Check, X, Award } from 'lucide-react';
import {
  getAllDGMetadata, buildDGPosition, portfolioKPIs,
  dividendCalendar, nextDividend, marketValue,
} from '../services/dividendGrowthService';
import { getStockDefaults } from '../data/stockDividendData';
import { getDividendInfo } from '../data/dividendData';

const GOAL_KEY = 'inv_dividend_annual_goal_v1';
const MONO = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };
const GREEN = '#3FB950';
const RED = '#F85149';

const eur0 = (n) => '€' + Math.round(n).toLocaleString('it-IT');
const eur2 = (n) => '€' + n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTH_LABELS = ['G','F','M','A','M','G','L','A','S','O','N','D'];

/**
 * DividendStatsCard — Dashboard: quadro completo dei dividendi ispirato al
 * pattern FreelancerStatsCard, con dati REALI presi dalla logica di Dividendi.jsx:
 *  - Earnings netti annui + delta vs anno scorso
 *  - Sub-stats: numero posizioni · incassi/anno · yield · YoC
 *  - Prossimo dividendo in arrivo (rank/highlight)
 *  - Calendario 12 mesi (barre)
 *  - Goal editabile inline con progress bar
 */
export default function DividendStatsCard({ holdings = [], prices = {} }) {
  const [goal, setGoal] = useState(() => Number(localStorage.getItem(GOAL_KEY)) || 12000);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal);
  useEffect(() => { setDraft(goal); }, [goal]);
  const saveGoal = () => { localStorage.setItem(GOAL_KEY, String(Number(draft) || 0)); setGoal(Number(draft) || 0); setEditing(false); };

  // Costruisci le posizioni dividendi usando la STESSA catena di Dividendi.jsx:
  // metadata utente + STOCK_DB + database ETF a distribuzione.
  const positions = useMemo(() => {
    const allMeta = getAllDGMetadata() || {};
    return (holdings || [])
      .filter(h => !h.isCash && (h.quantity ?? 0) > 0)
      .map(h => {
        const priceObj = prices[h.ticker];
        const currentPrice = priceObj?.price ?? priceObj ?? h.avgPrice ?? 0;
        const meta = allMeta[(h.ticker || '').toUpperCase()] || {};
        const cat = (h.macroCategory || h.category || '').toLowerCase();
        const isEquity = ['azioni', 'reits', 'bdc', 'stock', 'reit'].includes(cat);

        // path azioni
        if (isEquity) {
          const staticData = getStockDefaults(h.ticker);
          const pos = buildDGPosition(h, meta, staticData);
          pos.currentPrice = currentPrice;
          pos.isETF = false;
          return pos;
        }
        // path ETF a distribuzione
        const divInfo = getDividendInfo(h.ticker);
        if (divInfo && (divInfo.yield > 0 || (divInfo.months && divInfo.months.length > 0))) {
          const synthDPS = currentPrice * (divInfo.yield / 100);
          const freq = divInfo.months.length >= 11 ? 'Monthly'
                     : divInfo.months.length >= 5  ? 'SemiAnnual'
                     : divInfo.months.length >= 3  ? 'Quarterly' : 'Annual';
          return {
            id: h.ticker, ticker: h.ticker, name: meta.name || h.name || h.ticker,
            shares: h.quantity ?? 0, avgCostBasis: h.avgPrice ?? 0, currentPrice,
            sector: meta.sector || 'ETF', geography: meta.geography || 'EU', assetType: 'ETF',
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
        // Fallback: azione senza cat esplicita ma con dati dividendo
        const staticData = getStockDefaults(h.ticker);
        const hasDivData = staticData || (meta.dividendPerShare > 0) || (meta.paymentMonths?.length > 0);
        if (hasDivData) {
          const pos = buildDGPosition(h, meta, staticData);
          pos.currentPrice = currentPrice;
          pos.isETF = false;
          return pos;
        }
        return null;
      })
      .filter(Boolean)
      .filter(p => (p.dividendPerShare || 0) > 0);
  }, [holdings, prices]);

  const kpis = useMemo(() => portfolioKPIs(positions, prices), [positions, prices]);
  const currentYear = new Date().getFullYear();
  const calendarThis = useMemo(() => dividendCalendar(positions, currentYear), [positions, currentYear]);
  const calendarPrev = useMemo(() => dividendCalendar(positions, currentYear - 1), [positions, currentYear]);
  const upcoming = useMemo(() => nextDividend(positions), [positions]);

  const annualNet = kpis.annualNet || 0;
  const prevYearNet = (calendarPrev || []).reduce((s, m) => s + (m.net || 0), 0);
  const changeYoy = annualNet - prevYearNet;
  const changePct = prevYearNet > 0 ? (changeYoy / prevYearNet) * 100 : null;

  const monthsPerYear = new Set();
  positions.forEach(p => (p.paymentMonths || []).forEach(m => monthsPerYear.add(m)));
  const incomeEvents = positions.reduce((s, p) => s + (p.paymentMonths?.length || 0), 0);

  const progress = goal > 0 ? Math.min(100, (annualNet / goal) * 100) : 0;

  // Empty state
  if (positions.length === 0) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 14,
        padding: '1.25rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem',
      }}>
        <Coins size={18} style={{ marginBottom: 6, opacity: 0.6 }} />
        <div>Nessun dividendo rilevato ancora.</div>
        <Link to="/dividendi" style={{ color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 500 }}>
          Vai a Dividendi per configurarli →
        </Link>
      </div>
    );
  }

  const maxMonth = Math.max(1, ...calendarThis.map(m => m.net || 0));

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 14,
      overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.28)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* accento hairline */}
      <div style={{ height: 3, background: GREEN }} />

      <div style={{ padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Coins size={16} style={{ color: GREEN }} />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-1)' }}>
              Dividendi
            </span>
          </div>
          <span style={{
            fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-2)',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            padding: '3px 8px', borderRadius: 6,
          }}>Annuo netto</span>
        </div>

        {/* Earnings hero */}
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 4 }}>Reddito netto atteso</div>
          <div style={{ ...MONO, fontSize: '2.2rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            {eur0(annualNet)}
          </div>
          {changePct !== null && (
            <div style={{
              ...MONO, fontSize: '0.8rem', fontWeight: 600, marginTop: 4,
              color: changeYoy >= 0 ? GREEN : RED, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {changeYoy >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {changeYoy >= 0 ? '+' : '−'}{eur0(Math.abs(changeYoy))} · {changeYoy >= 0 ? '+' : '−'}{Math.abs(changePct).toFixed(1)}%
              <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 4 }}>vs anno scorso</span>
            </div>
          )}
        </div>

        {/* Sub-stats grid 2x2 */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
        }}>
          <StatBox
            value={eur0(kpis.monthlyNet)}
            label="/ mese medio"
            sub={`${incomeEvents} incassi/anno`}
          />
          <StatBox
            value={`${(kpis.yieldPct || 0).toFixed(2)}%`}
            label="yield"
            sub={`YoC ${(kpis.yocPct || 0).toFixed(2)}%`}
          />
          <StatBox
            value={positions.length}
            label={positions.length === 1 ? 'posizione' : 'posizioni'}
            sub={`${monthsPerYear.size} mesi/anno con incassi`}
          />
          <StatBox
            value={eur2(kpis.monthlyNet / 30)}
            label="/ giorno"
            sub={`≈ ${eur2(kpis.monthlyNet / 30 / 24)} / ora`}
          />
        </div>

        {/* Prossimo dividendo (rank-style highlight) */}
        {upcoming && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Prossimo dividendo
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {upcoming.ticker} <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: '0.75rem' }}>· {upcoming.month != null ? new Date(currentYear, upcoming.month - 1).toLocaleString('it-IT', { month: 'long' }) : ''}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ ...MONO, fontSize: '1rem', fontWeight: 700, color: GREEN }}>
                {eur2(upcoming.net || 0)}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>netto</div>
            </div>
          </div>
        )}

        {/* Calendario 12 mesi (barre) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-1)' }}>
              Calendario {currentYear}
            </span>
            <span style={{ ...MONO, fontSize: '0.68rem', color: 'var(--text-3)' }}>
              picco {eur0(maxMonth)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
            {calendarThis.map((m, i) => {
              const h = m.net > 0 ? Math.max(4, (m.net / maxMonth) * 100) : 0;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <div
                      title={`${MONTH_LABELS[i]}: ${eur2(m.net || 0)}`}
                      style={{
                        width: '100%', height: `${h}%`,
                        background: h > 0 ? GREEN : 'var(--surface-2)',
                        borderRadius: 3, minHeight: h > 0 ? 3 : 4,
                        transition: 'height 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {MONTH_LABELS.map((l, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.62rem', color: 'var(--text-3)', ...MONO }}>{l}</div>
            ))}
          </div>
        </div>

        {/* Goal progress */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Obiettivo annuo
            </span>
            {editing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>€</span>
                <input
                  type="number" min={0} step={500} value={draft}
                  onChange={e => setDraft(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveGoal(); if (e.key === 'Escape') setEditing(false); }}
                  style={{ width: 90, background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '2px 6px', color: 'var(--text-1)', fontSize: '0.78rem', ...MONO, textAlign: 'right' }}
                />
                <button onClick={saveGoal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: GREEN, padding: 2 }}><Check size={13} /></button>
                <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2 }}><X size={13} /></button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ ...MONO, fontSize: '0.78rem', color: 'var(--text-2)', fontWeight: 600 }}>
                  {eur0(annualNet)} / {eur0(goal)}
                </span>
                <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2 }}>
                  <Edit3 size={11} />
                </button>
              </div>
            )}
          </div>
          <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: GREEN, borderRadius: 99, transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ ...MONO, fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 4, textAlign: 'right' }}>
            {progress.toFixed(1)}%
          </div>
        </div>

        {/* CTA */}
        <Link to="/dividendi" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '8px 12px',
          color: 'var(--text-1)', fontSize: '0.78rem', fontWeight: 600,
          textDecoration: 'none',
        }}>
          Apri pagina Dividendi <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

function StatBox({ value, label, sub }) {
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '9px 11px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
        <span style={{ ...MONO, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-1)' }}>{value}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{label}</span>
      </div>
      {sub && <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
