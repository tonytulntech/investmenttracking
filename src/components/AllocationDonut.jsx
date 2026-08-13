import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Layers, X, PieChart, Sparkles } from 'lucide-react';
import { getPortfolioAlerts, getPortfolioConfig, MACRO_CATEGORIES } from '../services/portfolioConfigService';
import { buildAllocation, buildStyleAllocation, classifyHolding, classifyStyle, VEHICLE_LABELS } from '../services/classificationService';

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
  const [hot, setHot] = useState(null);          // slice hoverato
  const [selectedRole, setSelectedRole] = useState(null); // slice cliccato (drilldown)
  const [dim, setDim] = useState('role');        // 'role' | 'macro' | 'factor'
  const [expanded, setExpanded] = useState(false); // mostra tutte le voci nella legenda
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

  const { arr: allRoles, unassignedValue, referenceTotal: refTotalRole } = rows;
  const unassignedPct = refTotalRole ? Math.round((unassignedValue / refTotalRole) * 1000) / 10 : 0;

  // Righe per la vista MACRO ASSET CLASS: calcola l'allocazione sugli holdings
  // SCOPED e la porta nella stessa shape di allRoles per riuso del donut.
  // Target macro:
  //  - scope = 'all'          → usa config.globalTarget (impostabile in Portafogli)
  //  - scope = singolo port.  → usa port.targetAllocation se presente
  const macroRows = useMemo(() => {
    const alloc = buildAllocation(scopedHoldings);
    const targetSource = scope === 'all'
      ? (cfg.globalTarget || null)
      : (portfolios.find(p => p.id === scope)?.targetAllocation || null);

    // Lookup: label italiana ("Azionario") -> key config ("equity")
    const labelToKey = Object.fromEntries(MACRO_CATEGORIES.map(c => [c.label.toLowerCase(), c.key]));

    return (alloc.macro || [])
      .filter(m => (m.percentage || 0) > 0)
      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
      .map((m, i) => {
        const key = labelToKey[(m.name || '').trim().toLowerCase()];
        const targetPct = targetSource && key != null ? Number(targetSource[key] || 0) : 0;
        const diff = Math.round((m.percentage - targetPct) * 10) / 10;
        return {
          name: m.name,
          value: m.value,
          currentPct: m.percentage,
          targetPct,
          diff,
          color: PALETTE[i % PALETTE.length],
          macroKey: (m.name || '').trim().toLowerCase(),
        };
      });
  }, [scopedHoldings, scope, cfg.globalTarget, portfolios]);

  const macroHasTarget = macroRows.some(r => r.targetPct > 0);

  // Righe vista FATTORE / STILE (buildStyleAllocation → Momentum, Quality,
  // Value, Small Cap, High Dividend, Oro/Materie prime/REIT/Bond/Crypto...).
  // Nessun target per il fattore (per ora): stessa PALETTE del donut.
  const factorRows = useMemo(() => {
    const arr = buildStyleAllocation(scopedHoldings);
    return (arr || [])
      .filter(r => (r.percentage || 0) > 0)
      .map((r, i) => ({
        name: r.name,
        value: r.value,
        currentPct: r.percentage,
        targetPct: 0,
        diff: 0,
        color: PALETTE[i % PALETTE.length],
        factorKey: (r.name || '').trim().toLowerCase(),
      }));
  }, [scopedHoldings]);

  // Righe attive in base alla dimensione selezionata + totale di riferimento
  const activeRows = dim === 'role' ? allRoles : dim === 'macro' ? macroRows : factorRows;
  const referenceTotal = dim === 'role' ? refTotalRole : scopeTotal;

  // Alert scoped
  const alerts = useMemo(() => {
    const all = getPortfolioAlerts(holdings);
    return scope === 'all' ? all : all.filter(a => a.portfolio.id === scope);
  }, [holdings, scope]);
  const totalOff = alerts.reduce((s, a) => s + a.offBuckets.length, 0);

  // Titoli della slice selezionata (drilldown) — funziona per Ruolo e Macro
  const roleHoldings = useMemo(() => {
    if (!selectedRole) return [];
    const target = selectedRole.name.trim().toLowerCase();
    if (dim === 'macro') {
      // Per macro: usa l'asset class DEDOTTA da classifyHolding (macroLabel),
      // non h.macroCategory che contiene il VEICOLO ("ETF"/"Azioni").
      return scopedHoldings.filter(h => {
        const c = classifyHolding(h);
        return (c.macroLabel || '').trim().toLowerCase() === target;
      }).sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0));
    }
    if (dim === 'factor') {
      // Per fattore/stile: match sulla label di classifyStyle
      return scopedHoldings.filter(h => {
        const s = classifyStyle(h);
        return (s.label || '').trim().toLowerCase() === target;
      }).sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0));
    }
    // Ruolo: filtra per bucket assegnato dentro lo scope
    return scopedHoldings.filter(h => {
      const key = h.holdingKey ?? h.ticker;
      const pid = cfg.assignments[key];
      const bid = cfg.bucketAssignments?.[key];
      const port = pid ? portfolios.find(p => p.id === pid) : null;
      const bucket = port && bid ? (port.buckets || []).find(b => b.id === bid) : null;
      return bucket && bucket.name.trim().toLowerCase() === target;
    })
    .sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0));
  }, [selectedRole, scopedHoldings, cfg, portfolios, dim]);

  if (portfolios.length === 0) return null;

  // Empty state
  if (activeRows.length === 0 && scopeTotal === 0) {
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
  const arcs = activeRows.map(r => {
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
          Allocazione {dim === 'role' ? 'per Ruolo' : dim === 'macro' ? 'Macro Asset Class' : 'per Fattore/Stile'}
        </span>

        {/* Toggle Ruolo / Macro */}
        <div style={{
          display: 'flex',
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
        }}>
          <button onClick={() => { setDim('role'); setSelectedRole(null); setExpanded(false); }} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', border: 'none', cursor: 'pointer',
            fontSize: '0.7rem', fontWeight: 600,
            background: dim === 'role' ? 'var(--text-1)' : 'transparent',
            color: dim === 'role' ? 'var(--bg)' : 'var(--text-2)',
          }}>
            <Layers size={11} /> Ruolo
          </button>
          <button onClick={() => { setDim('macro'); setSelectedRole(null); setExpanded(false); }} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', border: 'none', cursor: 'pointer',
            fontSize: '0.7rem', fontWeight: 600,
            background: dim === 'macro' ? 'var(--text-1)' : 'transparent',
            color: dim === 'macro' ? 'var(--bg)' : 'var(--text-2)',
          }}>
            <PieChart size={11} /> Asset Class
          </button>
          <button onClick={() => { setDim('factor'); setSelectedRole(null); setExpanded(false); }} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', border: 'none', cursor: 'pointer',
            fontSize: '0.7rem', fontWeight: 600,
            background: dim === 'factor' ? 'var(--text-1)' : 'transparent',
            color: dim === 'factor' ? 'var(--bg)' : 'var(--text-2)',
          }}>
            <Sparkles size={11} /> Fattore
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
        {dim === 'macro' && !macroHasTarget && (
          <Link to="/portfolios" style={{
            fontSize: '0.68rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600,
            background: 'var(--accent-weak)', padding: '1px 7px', borderRadius: 99,
          }}
          title={scope === 'all'
            ? 'Imposta il target macro globale (Azionario/Obbligazionario/…) in Portafogli'
            : 'Imposta il target macro di questo portafoglio in Portafogli'}
          >
            + imposta target macro
          </Link>
        )}
        <Link to="/rebalancing" style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
          fontSize: '0.72rem', color: 'var(--text-2)', textDecoration: 'none', fontWeight: 500,
        }}>
          Ribilancia <ArrowRight size={11} />
        </Link>
      </div>

      {/* Selettore Portafogli (pill) — attivo in entrambe le viste */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <PillButton active={scope === 'all'} onClick={() => { setScope('all'); setSelectedRole(null); setExpanded(false); }}>
          Tutti
        </PillButton>
        {portfolios.map(p => (
          <PillButton key={p.id} active={scope === p.id} onClick={() => { setScope(p.id); setSelectedRole(null); setExpanded(false); }}>
            <span style={{ marginRight: 4 }}>{p.emoji}</span>{p.name}
          </PillButton>
        ))}
      </div>

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
                  {activeRows[hot].currentPct}%
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', textAlign: 'center', maxWidth: 100, lineHeight: 1.2, marginTop: 2 }}>
                  {activeRows[hot].name}
                </span>
              </>
            ) : (
              <>
                <span style={{ ...MONO, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)' }}>
                  {eur0(referenceTotal)}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: 2 }}>
                  {activeRows.length} {dim === 'role' ? 'ruoli' : dim === 'macro' ? 'classi' : 'fattori'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {(expanded ? activeRows : activeRows.slice(0, 6)).map((r, i) => {
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
          {activeRows.length > 6 && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 0 0 18px', fontSize: '0.68rem',
                color: 'var(--accent)', fontWeight: 600, textAlign: 'left',
              }}
            >
              {expanded ? 'Mostra meno' : `+ altri ${activeRows.length - 6} ${dim === 'role' ? 'ruoli' : dim === 'macro' ? 'classi' : 'fattori'}`}
            </button>
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

          {/* Breakdown per Veicolo (solo in vista Macro) */}
          {dim === 'macro' && roleHoldings.length > 0 && (() => {
            const byVehicle = {};
            let tot = 0;
            roleHoldings.forEach(h => {
              const c = classifyHolding(h);
              const v = c.vehicle || 'other';
              const val = h.marketValue || 0;
              byVehicle[v] = (byVehicle[v] || 0) + val;
              tot += val;
            });
            const rows = Object.entries(byVehicle)
              .map(([v, val]) => ({ vehicle: v, value: val, pct: tot ? +(val / tot * 100).toFixed(1) : 0 }))
              .sort((a, b) => b.value - a.value);
            return (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10,
                paddingBottom: 10, borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4, alignSelf: 'center' }}>
                  Composizione per veicolo:
                </span>
                {rows.map(r => (
                  <span key={r.vehicle} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '2px 8px', borderRadius: 99,
                    background: 'var(--card-bg)', border: '1px solid var(--border)',
                    fontSize: '0.7rem', color: 'var(--text-1)',
                  }}>
                    <strong style={{ fontWeight: 600 }}>{VEHICLE_LABELS[r.vehicle] || r.vehicle}</strong>
                    <span style={{ ...MONO, color: 'var(--text-2)' }}>{r.pct}%</span>
                    <span style={{ ...MONO, color: 'var(--text-3)', fontSize: '0.65rem' }}>{eur0(r.value)}</span>
                  </span>
                ))}
              </div>
            );
          })()}

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

      <style>{`
        @media (max-width: 640px) {
          .donut-body { grid-template-columns: 1fr !important; }
        }
      `}</style>
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
