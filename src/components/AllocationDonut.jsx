import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Layers, X, PieChart } from 'lucide-react';
import { getPortfolioAlerts, getPortfolioConfig } from '../services/portfolioConfigService';

const MONO = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };
const eur0 = (n) => '€' + Math.abs(Math.round(n)).toLocaleString('it-IT');

// Palette coerente Direzione C
const PALETTE = [
  '#7C82FF', '#5B62E6', '#9BA0FF', '#3FB950', '#FF9F0A',
  '#F85149', '#8CB4FF', '#6E7EB5', '#AC8E68', '#32ADE6',
];

const R = 60;
const STROKE = 14;
const C = 2 * Math.PI * R;

/**
 * AllocationDonut — vista principale allocazione + gap ai target, per Ruolo.
 * - Selettore portafogli in alto (Tutti / singoli)
 * - Anello Ruoli interattivo (hover dim)
 * - Legenda con % attuale / target e delta gap
 * - Click su un ruolo → pannello con titoli e loro peso interno
 *
 * Nota matematica: il target di un ruolo aggregato usa il *peso target* del
 * portafoglio se impostato (Portfolio.targetWeightPct), altrimenti il peso reale.
 * Questo evita che target di portafogli attualmente sovrappesati vengano gonfiati.
 */
export default function AllocationDonut({ holdings = [], macroAllocation = [], subAllocation = [] }) {
  const [hot, setHot] = useState(null);          // ruolo hoverato
  const [selectedRole, setSelectedRole] = useState(null); // ruolo cliccato (drilldown)
  const [dim, setDim] = useState('role');        // 'role' | 'macro'
  const cfg = getPortfolioConfig();
  const portfolios = cfg.portfolios || [];

  // Selettore portafoglio: 'all' | portfolioId (attivo solo in vista "role")
  const [scope, setScope] = useState('all');

  // Filtro holdings in base allo scope
  const scopedHoldings = useMemo(() => {
    if (scope === 'all') return holdings;
    return holdings.filter(h => cfg.assignments[h.holdingKey ?? h.ticker] === scope);
  }, [holdings, scope, cfg.assignments]);

  const scopeTotal = scopedHoldings.reduce((s, h) => s + (h.marketValue || 0), 0);
  const grandTotalAll = holdings.reduce((s, h) => s + (h.marketValue || 0), 0);

  // Costruisci rows: aggrega valori per Ruolo, aggrega target usando i pesi target
  const rows = useMemo(() => {
    // Mappa bucket per portafoglio → nome
    const roleMap = new Map();      // nomeLower → { name, value, targetEur }
    let unassignedValue = 0;

    // Valori attuali (scoped)
    scopedHoldings.forEach(h => {
      const key = h.holdingKey ?? h.ticker;
      const pid = cfg.assignments[key];
      const bid = cfg.bucketAssignments?.[key];
      const port = pid ? portfolios.find(p => p.id === pid) : null;
      const bucket = port && bid ? (port.buckets || []).find(b => b.id === bid) : null;
      if (!bucket) { unassignedValue += (h.marketValue || 0); return; }
      const k = bucket.name.trim().toLowerCase();
      const cur = roleMap.get(k) || { name: bucket.name, value: 0, targetEur: 0 };
      cur.value += (h.marketValue || 0);
      roleMap.set(k, cur);
    });

    // Target aggregati (sempre lo scope corretto: se scope=all, uso weight target di
    // tutti i portafogli; se scope=portafoglio, uso solo quel portafoglio a peso 100%)
    const referenceTotal = scope === 'all' ? grandTotalAll : scopeTotal;
    const portsToConsider = scope === 'all' ? portfolios : portfolios.filter(p => p.id === scope);

    portsToConsider.forEach(port => {
      // Peso effettivo del portafoglio come frazione di referenceTotal:
      // - se scope = portafoglio singolo → 1 (siamo dentro quel portafoglio)
      // - se scope = all → targetWeightPct/100 se impostato, sennò peso reale
      let portFraction;
      if (scope !== 'all') {
        portFraction = 1;
      } else if (port.targetWeightPct != null) {
        portFraction = port.targetWeightPct / 100;
      } else {
        const pv = holdings
          .filter(h => cfg.assignments[h.holdingKey ?? h.ticker] === port.id)
          .reduce((s, h) => s + (h.marketValue || 0), 0);
        portFraction = referenceTotal ? pv / referenceTotal : 0;
      }
      (port.buckets || []).forEach(b => {
        if (!b.target) return;
        const targetEur = (b.target / 100) * portFraction * referenceTotal;
        const k = b.name.trim().toLowerCase();
        const cur = roleMap.get(k) || { name: b.name, value: 0, targetEur: 0 };
        cur.targetEur += targetEur;
        roleMap.set(k, cur);
      });
    });

    const arr = Array.from(roleMap.values()).map((r, i) => {
      const currentPct = referenceTotal ? Math.round((r.value / referenceTotal) * 1000) / 10 : 0;
      const targetPct = referenceTotal ? Math.round((r.targetEur / referenceTotal) * 1000) / 10 : 0;
      const diff = Math.round((currentPct - targetPct) * 10) / 10;
      return { ...r, currentPct, targetPct, diff, color: PALETTE[i % PALETTE.length] };
    })
    .sort((a, b) => (b.currentPct + b.targetPct) - (a.currentPct + a.targetPct))
    .map((r, i) => ({ ...r, color: PALETTE[i % PALETTE.length] }));

    return { arr, unassignedValue, referenceTotal };
  }, [scopedHoldings, holdings, scope, portfolios, cfg, grandTotalAll, scopeTotal]);

  const { arr: allRoles, unassignedValue, referenceTotal } = rows;
  const unassignedPct = referenceTotal ? Math.round((unassignedValue / referenceTotal) * 1000) / 10 : 0;

  // Alert scoped
  const alerts = useMemo(() => {
    const all = getPortfolioAlerts(holdings);
    return scope === 'all' ? all : all.filter(a => a.portfolio.id === scope);
  }, [holdings, scope]);
  const totalOff = alerts.reduce((s, a) => s + a.offBuckets.length, 0);

  // Titoli del ruolo selezionato (drilldown)
  const roleHoldings = useMemo(() => {
    if (!selectedRole) return [];
    const target = selectedRole.name.trim().toLowerCase();
    return scopedHoldings.filter(h => {
      const key = h.holdingKey ?? h.ticker;
      const pid = cfg.assignments[key];
      const bid = cfg.bucketAssignments?.[key];
      const port = pid ? portfolios.find(p => p.id === pid) : null;
      const bucket = port && bid ? (port.buckets || []).find(b => b.id === bid) : null;
      return bucket && bucket.name.trim().toLowerCase() === target;
    })
    .sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0));
  }, [selectedRole, scopedHoldings, cfg, portfolios]);

  if (portfolios.length === 0) return null;

  // Empty state
  if (allRoles.length === 0 && scopeTotal === 0) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '1.25rem', textAlign: 'center',
        color: 'var(--text-3)', fontSize: '0.82rem',
      }}>
        <Layers size={18} style={{ marginBottom: 6, opacity: 0.6 }} />
        <div>Nessun titolo per la vista selezionata.</div>
      </div>
    );
  }

  // Archi: offset cumulativo
  let acc = 0;
  const arcs = allRoles.map(r => {
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
      {/* Header con toggle vista Ruolo / Macro */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
          Allocazione {dim === 'role' ? 'per Ruolo' : 'Macro Asset Class'}
        </span>

        {/* Toggle Ruolo / Macro */}
        <div style={{
          display: 'flex',
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
        }}>
          <button onClick={() => { setDim('role'); setSelectedRole(null); }} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', border: 'none', cursor: 'pointer',
            fontSize: '0.7rem', fontWeight: 600,
            background: dim === 'role' ? 'var(--text-1)' : 'transparent',
            color: dim === 'role' ? 'var(--bg)' : 'var(--text-2)',
          }}>
            <Layers size={11} /> Ruolo
          </button>
          <button onClick={() => { setDim('macro'); setSelectedRole(null); }} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', border: 'none', cursor: 'pointer',
            fontSize: '0.7rem', fontWeight: 600,
            background: dim === 'macro' ? 'var(--text-1)' : 'transparent',
            color: dim === 'macro' ? 'var(--bg)' : 'var(--text-2)',
          }}>
            <PieChart size={11} /> Asset Class
          </button>
        </div>

        {dim === 'role' && totalOff > 0 && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            ...MONO, fontSize: '0.68rem', color: '#FF9F0A',
            background: 'rgba(255,159,10,0.10)', border: '1px solid rgba(255,159,10,0.30)',
            padding: '1px 7px', borderRadius: 99, fontWeight: 600,
          }}>
            <AlertTriangle size={10} /> {totalOff} fuori target
          </span>
        )}
        {dim === 'role' && unassignedPct >= 1 && (
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

      {/* Vista MACRO ASSET CLASS */}
      {dim === 'macro' && (
        <MacroClassView macro={macroAllocation} sub={subAllocation} total={holdings.reduce((s, h) => s + (h.marketValue || 0), 0)} />
      )}

      {/* Selettore Portafogli (pill) — solo in vista Ruolo */}
      {dim === 'role' && (
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <PillButton active={scope === 'all'} onClick={() => { setScope('all'); setSelectedRole(null); }}>
          Tutti
        </PillButton>
        {portfolios.map(p => (
          <PillButton key={p.id} active={scope === p.id} onClick={() => { setScope(p.id); setSelectedRole(null); }}>
            <span style={{ marginRight: 4 }}>{p.emoji}</span>{p.name}
          </PillButton>
        ))}
      </div>
      )}

      {dim === 'role' && (<>
      {/* Body: donut + legenda */}
      <div className="donut-body" style={{
        display: 'grid', gap: '1.5rem', alignItems: 'center',
        gridTemplateColumns: 'auto 1fr',
      }}>
        {/* Donut */}
        <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
          <svg width={140} height={140} viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={70} cy={70} r={R} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE} />
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
                onClick={() => setSelectedRole(a)}
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
                  {allRoles[hot].currentPct}%
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', textAlign: 'center', maxWidth: 100, lineHeight: 1.2, marginTop: 2 }}>
                  {allRoles[hot].name}
                </span>
              </>
            ) : (
              <>
                <span style={{ ...MONO, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)' }}>
                  {eur0(referenceTotal)}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: 2 }}>
                  {allRoles.length} ruoli
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {allRoles.slice(0, 6).map((r, i) => {
            const dim = hot !== null && hot !== i;
            const hasTarget = r.targetPct > 0;
            const off = hasTarget && Math.abs(r.diff) > 3;
            const diffColor = r.diff > 0 ? '#FF9F0A' : 'var(--accent)';
            const isSelected = selectedRole?.name === r.name;
            return (
              <button
                key={r.name}
                type="button"
                onMouseEnter={() => setHot(i)}
                onMouseLeave={() => setHot(null)}
                onClick={() => setSelectedRole(isSelected ? null : r)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '10px minmax(0,1fr) auto auto',
                  alignItems: 'center', gap: 8,
                  padding: '5px 6px', margin: '0 -6px',
                  background: isSelected ? 'var(--surface-2)' : 'none',
                  border: 'none', cursor: 'pointer',
                  borderRadius: 6, textAlign: 'left',
                  opacity: dim ? 0.35 : 1,
                  transition: 'opacity 0.2s ease, background 0.15s',
                  minHeight: 32,
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
                {hasTarget ? (
                  <span style={{
                    ...MONO, fontSize: '0.72rem', fontWeight: 600,
                    color: off ? diffColor : 'var(--text-3)',
                    minWidth: 46, textAlign: 'right',
                  }}>
                    {r.diff > 0 ? '+' : ''}{r.diff}%
                  </span>
                ) : (<span style={{ minWidth: 46 }} />)}
              </button>
            );
          })}
          {allRoles.length > 6 && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', paddingLeft: 18, marginTop: 2 }}>
              + altri {allRoles.length - 6} ruoli · clicca un ruolo per il dettaglio
            </div>
          )}
        </div>
      </div>

      {/* Drilldown: titoli del ruolo cliccato */}
      {selectedRole && (
        <div style={{
          marginTop: 14, padding: '12px 14px',
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: selectedRole.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}>{selectedRole.name}</span>
            <span style={{ ...MONO, fontSize: '0.72rem', color: 'var(--text-2)' }}>
              {selectedRole.currentPct}%
              {selectedRole.targetPct > 0 && (
                <span style={{ color: 'var(--text-3)' }}> / target {selectedRole.targetPct}%</span>
              )}
              <span style={{ marginLeft: 6, color: 'var(--text-3)' }}>· {eur0(selectedRole.value)}</span>
            </span>
            {selectedRole.targetPct > 0 && Math.abs(selectedRole.diff) > 3 && (
              <span style={{
                ...MONO, fontSize: '0.7rem', fontWeight: 600,
                color: selectedRole.diff > 0 ? '#FF9F0A' : 'var(--accent)',
                padding: '1px 7px', borderRadius: 99,
                background: selectedRole.diff > 0 ? 'rgba(255,159,10,0.12)' : 'var(--accent-weak)',
              }}>
                {selectedRole.diff > 0 ? '+' : ''}{selectedRole.diff}%
              </span>
            )}
            <button onClick={() => setSelectedRole(null)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
              <X size={14} />
            </button>
          </div>

          {roleHoldings.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
              Nessun titolo attualmente in questo ruolo (target impostato ma nessuna assegnazione).
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {roleHoldings.map(h => {
                const key = h.holdingKey ?? h.ticker;
                const weightInRole = selectedRole.value > 0
                  ? Math.round((h.marketValue / selectedRole.value) * 1000) / 10
                  : 0;
                const weightInScope = referenceTotal
                  ? Math.round((h.marketValue / referenceTotal) * 1000) / 10
                  : 0;
                return (
                  <div key={key} style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,1fr) auto auto auto',
                    gap: 10, alignItems: 'center',
                    padding: '5px 0', borderBottom: '1px dashed var(--border)',
                    fontSize: '0.75rem',
                  }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.ticker}
                      {h.name && h.name !== h.ticker && (
                        <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 6 }}>· {h.name}</span>
                      )}
                    </span>
                    <span style={{ ...MONO, color: 'var(--text-2)' }}>{eur0(h.marketValue || 0)}</span>
                    <span title="peso dentro il ruolo" style={{ ...MONO, color: 'var(--text-1)', fontWeight: 600, minWidth: 48, textAlign: 'right' }}>
                      {weightInRole}%
                    </span>
                    <span title="peso sull'intero scope selezionato" style={{ ...MONO, color: 'var(--text-3)', minWidth: 46, textAlign: 'right' }}>
                      {weightInScope}%
                    </span>
                  </div>
                );
              })}
              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: 6, textAlign: 'right' }}>
                colonne: valore · peso nel ruolo · peso sullo scope
              </div>
            </div>
          )}
        </div>
      )}
      </>)}

      <style>{`
        @media (max-width: 640px) {
          .donut-body { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ── MacroClassView ──────────────────────────────────────────────────────────
// Vista Macro Asset Class: barra stacked grande + card con % + euro,
// e opzionale lista sotto-categorie.
function MacroClassView({ macro = [], sub = [], total = 0 }) {
  const items = macro.filter(m => (m.percentage || 0) > 0);
  const subs  = sub.filter(m => (m.percentage || 0) > 0).slice(0, 12);
  if (items.length === 0) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem' }}>
        Nessuna macro allocazione disponibile.
      </div>
    );
  }
  return (
    <div>
      {/* Stacked bar grande */}
      <div style={{
        display: 'flex', height: 30, borderRadius: 8, overflow: 'hidden',
        border: '1px solid var(--border)', marginBottom: 14,
      }}>
        {items.map((m, i) => (
          <div key={i} title={`${m.name}: ${m.percentage}%`}
            style={{ flex: m.percentage, background: m.color, minWidth: 2 }}
          />
        ))}
      </div>

      {/* Card per macro-classe */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8,
        marginBottom: subs.length > 0 ? 16 : 0,
      }}>
        {items.map((m, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', background: 'var(--surface-2)',
            border: '1px solid var(--border)', borderRadius: 8,
          }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: m.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.name}
              </div>
              <div style={{ ...MONO, fontSize: '0.66rem', color: 'var(--text-3)' }}>
                {eur0((total || 0) * (m.percentage / 100))}
              </div>
            </div>
            <span style={{ ...MONO, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-1)' }}>
              {m.percentage}%
            </span>
          </div>
        ))}
      </div>

      {/* Sotto-categorie */}
      {subs.length > 0 && (
        <div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Sotto-categorie
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {subs.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </span>
                <span style={{ ...MONO, fontSize: '0.72rem', color: 'var(--text-1)', fontWeight: 600, minWidth: 46, textAlign: 'right' }}>
                  {s.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PillButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '5px 11px', borderRadius: 99, cursor: 'pointer',
        border: `1px solid ${active ? 'var(--text-1)' : 'var(--border)'}`,
        background: active ? 'var(--text-1)' : 'transparent',
        color: active ? 'var(--bg)' : 'var(--text-2)',
        fontSize: '0.74rem', fontWeight: active ? 600 : 500,
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </button>
  );
}
