import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Layers } from 'lucide-react';
import { getRolesRollup, getPortfolioAlerts, getPortfolioConfig, calcBucketDrift } from '../services/portfolioConfigService';

const MONO = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };
const eur0 = (n) => '€' + Math.abs(Math.round(n)).toLocaleString('it-IT');

// Palette monocromatica accento + varianti (via classi/opacità) — coerente Direzione C
const PALETTE = [
  '#7C82FF', // accent
  '#5B62E6',
  '#9BA0FF',
  '#3FB950', // pos
  '#FF9F0A', // ambra (sovrappesi visibili)
  '#F85149', // neg
  '#8CB4FF',
  '#6E7EB5',
  '#AC8E68',
  '#32ADE6',
];

const R = 60;
const STROKE = 14;
const C = 2 * Math.PI * R;

/**
 * AllocationDonut — vista principale allocazione + gap ai target.
 * Fonde alert e roll-up in un unico widget interattivo:
 *  - anello per Ruolo (arco pesato)
 *  - centro: totale patrimonio + N ruoli
 *  - legenda con % attuale / target e delta colorato
 *  - hover/tap dim degli altri archi
 */
export default function AllocationDonut({ holdings = [] }) {
  const [hot, setHot] = useState(null);

  // 1) Roll-up patrimonio per Ruolo (attuale)
  const { rows: current, grandTotal, unassignedValue, unassignedPct } = getRolesRollup(holdings);

  // 2) Target per Ruolo (aggregati sui portafogli): trasforma i target dei bucket
  //    in euro assoluti moltiplicando per il valore del portafoglio di appartenenza,
  //    poi somma per nome. Restituisce { [nomeRuolo]: { targetEur, targetPct } }.
  const targetsByRoleName = useMemo(() => {
    const cfg = getPortfolioConfig();
    const map = {};
    for (const port of cfg.portfolios) {
      const portValue = holdings
        .filter(h => cfg.assignments[h.holdingKey ?? h.ticker] === port.id)
        .reduce((s, h) => s + (h.marketValue || 0), 0);
      (port.buckets || []).forEach(b => {
        if (!b.target) return;
        const k = b.name.trim().toLowerCase();
        const targetEur = (b.target / 100) * portValue;
        if (!map[k]) map[k] = { name: b.name, targetEur: 0 };
        map[k].targetEur += targetEur;
      });
    }
    // Aggiungi target % sul patrimonio
    Object.values(map).forEach(m => {
      m.targetPct = grandTotal ? Math.round((m.targetEur / grandTotal) * 1000) / 10 : 0;
    });
    return map;
  }, [holdings, grandTotal]);

  // 3) Merge current + target -> rows unificate ordinate per peso attuale
  const rows = useMemo(() => {
    const byName = {};
    current.forEach(r => {
      const k = r.name.trim().toLowerCase();
      byName[k] = { name: r.name, currentPct: r.pct, value: r.value, targetPct: 0 };
    });
    Object.values(targetsByRoleName).forEach(t => {
      const k = t.name.trim().toLowerCase();
      if (!byName[k]) byName[k] = { name: t.name, currentPct: 0, value: 0, targetPct: t.targetPct };
      else byName[k].targetPct = t.targetPct;
    });
    return Object.values(byName)
      .map((r, i) => ({
        ...r,
        diff: Math.round((r.currentPct - r.targetPct) * 10) / 10,
        color: PALETTE[i % PALETTE.length],
      }))
      .sort((a, b) => (b.currentPct + b.targetPct) - (a.currentPct + a.targetPct));
  }, [current, targetsByRoleName]);

  // 4) Ruoli fuori soglia (per il badge globale)
  const alerts = useMemo(() => getPortfolioAlerts(holdings), [holdings]);
  const totalOff = alerts.reduce((s, a) => s + a.offBuckets.length, 0);

  if (rows.length === 0) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '1.25rem', textAlign: 'center',
        color: 'var(--text-3)', fontSize: '0.82rem',
      }}>
        <Layers size={18} style={{ marginBottom: 6, opacity: 0.6 }} />
        <div>Nessun Ruolo assegnato ancora.</div>
        <Link to="/portfolios" style={{ color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 500 }}>
          Vai a Portafogli per iniziare →
        </Link>
      </div>
    );
  }

  // Archi: calcola offset cumulativo (percentuale attuale)
  let acc = 0;
  const arcs = rows.map(r => {
    const start = acc;
    acc += r.currentPct;
    return { ...r, start };
  });

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '1.2rem 1.3rem',
      boxShadow: '0 1px 2px rgba(0,0,0,0.28)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
          Allocazione per Ruolo
        </span>
        {totalOff > 0 && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            ...MONO, fontSize: '0.68rem', color: '#FF9F0A',
            background: 'rgba(255,159,10,0.10)', border: '1px solid rgba(255,159,10,0.30)',
            padding: '1px 7px', borderRadius: 99, fontWeight: 600,
          }}>
            <AlertTriangle size={10} /> {totalOff} fuori target
          </span>
        )}
        {unassignedPct >= 1 && (
          <span style={{
            ...MONO, fontSize: '0.68rem', color: 'var(--accent)',
            background: 'var(--accent-weak)', padding: '1px 7px', borderRadius: 99,
          }}>
            {unassignedPct}% non assegnato
          </span>
        )}
        <Link to="/rebalancing" style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
          fontSize: '0.72rem', color: 'var(--text-2)', textDecoration: 'none', fontWeight: 500,
        }}>
          Ribilancia <ArrowRight size={11} />
        </Link>
      </div>

      {/* Body: donut + legenda (responsive) */}
      <div className="donut-body" style={{
        display: 'grid', gap: '1.5rem', alignItems: 'center',
        gridTemplateColumns: 'auto 1fr',
      }}>
        {/* Donut */}
        <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
          <svg width={140} height={140} viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle cx={70} cy={70} r={R} fill="none"
              stroke="var(--surface-2)" strokeWidth={STROKE} />
            {/* Arcs */}
            {arcs.map((a, i) => (
              <circle
                key={a.name}
                cx={70} cy={70} r={R} fill="none"
                stroke={a.color} strokeWidth={STROKE}
                strokeDasharray={`${Math.max(0, (a.currentPct / 100) * C - 2)} ${C}`}
                strokeDashoffset={-((a.start / 100) * C)}
                strokeLinecap="butt"
                onMouseEnter={() => setHot(i)}
                onMouseLeave={() => setHot(null)}
                style={{
                  cursor: 'pointer',
                  opacity: hot === null || hot === i ? 1 : 0.22,
                  transition: 'opacity 0.2s ease',
                }}
              />
            ))}
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            {hot != null ? (
              <>
                <span style={{ ...MONO, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-1)' }}>
                  {rows[hot].currentPct}%
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', textAlign: 'center', maxWidth: 100, lineHeight: 1.2, marginTop: 2 }}>
                  {rows[hot].name}
                </span>
              </>
            ) : (
              <>
                <span style={{ ...MONO, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)' }}>
                  {eur0(grandTotal)}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: 2 }}>
                  {rows.length} ruoli
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {rows.slice(0, 6).map((r, i) => {
            const dim = hot !== null && hot !== i;
            const hasTarget = r.targetPct > 0;
            const off = hasTarget && Math.abs(r.diff) > 3;   // soglia visiva
            const diffColor = r.diff > 0 ? '#FF9F0A' : 'var(--accent)';
            return (
              <button
                key={r.name}
                type="button"
                onMouseEnter={() => setHot(i)}
                onMouseLeave={() => setHot(null)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '10px minmax(0,1fr) auto auto',
                  alignItems: 'center', gap: 8,
                  padding: '4px 6px', margin: '0 -6px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderRadius: 6, textAlign: 'left',
                  opacity: dim ? 0.35 : 1,
                  transition: 'opacity 0.2s ease, background 0.15s',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                <span style={{
                  fontSize: '0.78rem', color: 'var(--text-1)', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {r.name}
                </span>
                <span style={{ ...MONO, fontSize: '0.75rem', color: 'var(--text-2)' }}>
                  {r.currentPct}%
                  {hasTarget && <span style={{ color: 'var(--text-3)' }}> / {r.targetPct}%</span>}
                </span>
                {hasTarget && (
                  <span style={{
                    ...MONO, fontSize: '0.72rem', fontWeight: 600,
                    color: off ? diffColor : 'var(--text-3)',
                    minWidth: 46, textAlign: 'right',
                  }}>
                    {r.diff > 0 ? '+' : ''}{r.diff}%
                  </span>
                )}
              </button>
            );
          })}
          {rows.length > 6 && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', paddingLeft: 18, marginTop: 2 }}>
              + altri {rows.length - 6} ruoli
            </div>
          )}
        </div>
      </div>

      {/* CSS per il collasso responsive del layout donut + legend */}
      <style>{`
        @media (max-width: 640px) {
          .donut-body { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
