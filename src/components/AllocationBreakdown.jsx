/**
 * AllocationBreakdown — torta di allocazione derivata dal DB di composizione.
 * Filtrabile per singolo portafoglio (Rendita / Crescita / …) o intero patrimonio.
 * Mostra macro (Azioni/Obbligazioni/…) e micro (Az. globale/settoriale/emergenti/…).
 */
import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { X } from 'lucide-react';
import { buildAllocation, buildStyleAllocation, classifyHolding, classifyStyle } from '../services/classificationService';
import { getPortfolioConfig } from '../services/portfolioConfigService';

const fmtEur = (n) => '€' + Math.round(n).toLocaleString('it-IT');

export default function AllocationBreakdown({ holdings = [], title = 'Allocazione patrimonio' }) {
  const [portId, setPortId] = useState('all');
  const [viewMode, setViewMode] = useState('category'); // 'category' | 'style'
  const [drill, setDrill] = useState(null); // { label, color } della fetta cliccata
  const cfg = useMemo(() => getPortfolioConfig(), []);
  const portfolios = cfg.portfolios || [];

  // Filtra gli holdings per portafoglio selezionato
  const filtered = useMemo(() => {
    const nonCash = holdings.filter(h => !h.isCash && (h.marketValue || 0) > 0);
    if (portId === 'all') return nonCash;
    return nonCash.filter(h => {
      const key = h.holdingKey ?? h.ticker;
      return cfg.assignments[key] === portId || cfg.assignments[h.ticker] === portId;
    });
  }, [holdings, portId, cfg.assignments]);

  const alloc = useMemo(() => buildAllocation(filtered), [filtered]);
  const styleAlloc = useMemo(() => buildStyleAllocation(filtered), [filtered]);

  // Dati del donut/legenda in base alla vista scelta
  const segments = viewMode === 'style' ? styleAlloc : alloc.micro;

  // Strumenti dentro la fetta cliccata (drill-down)
  const drillHoldings = useMemo(() => {
    if (!drill) return [];
    const labelOf = (h) => viewMode === 'style' ? classifyStyle(h).label : classifyHolding(h).microLabel;
    const items = filtered.filter(h => labelOf(h) === drill.label);
    const tot = items.reduce((s, h) => s + (h.marketValue || 0), 0);
    return items
      .map(h => ({ ticker: h.ticker, name: h.name || h.ticker, value: h.marketValue || 0, weight: tot > 0 ? (h.marketValue / tot) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [drill, filtered, viewMode]);

  if (!holdings.length) return null;

  const cardStyle = { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' };

  return (
    <div style={cardStyle}>
      {/* Header + filtro portafoglio */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <p style={{ fontWeight: 600, color: 'var(--text-1)', margin: 0, fontSize: '1rem' }}>{title}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
            Derivata dal database di composizione · {fmtEur(alloc.total)}
          </p>
        </div>
        {portfolios.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setPortId('all')}
              style={pillStyle(portId === 'all', '#0A84FF')}>🌍 Tutti</button>
            {portfolios.map(p => (
              <button key={p.id} onClick={() => setPortId(p.id)}
                style={pillStyle(portId === p.id, p.color || '#0A84FF')}>
                {p.emoji} {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Toggle vista: Categoria ↔ Stile/Fattore */}
      <div style={{ display: 'inline-flex', gap: 2, background: 'var(--surface-2)', borderRadius: 10, padding: 3, marginBottom: 18 }}>
        {[['category', '📊 Categoria'], ['style', '🎯 Stile / Fattore']].map(([m, lbl]) => (
          <button key={m} onClick={() => setViewMode(m)}
            style={{ padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
              background: viewMode === m ? 'var(--card-bg)' : 'transparent',
              color: viewMode === m ? 'var(--text-1)' : 'var(--text-3)' }}>
            {lbl}
          </button>
        ))}
      </div>

      {segments.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', textAlign: 'center', padding: '2rem 0' }}>
          Nessuna posizione in questo portafoglio.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'center' }}>
          {/* Donut */}
          <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={segments} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={68} outerRadius={110} paddingAngle={2}
                  onClick={(e) => e && setDrill({ label: e.name, color: e.color })}
                  style={{ cursor: 'pointer' }}>
                  {segments.map((entry) => <Cell key={entry.key} fill={entry.color} style={{ cursor: 'pointer' }} />)}
                </Pie>
                <Tooltip
                  formatter={(v, n) => [`${fmtEur(v)} (${((v / alloc.total) * 100).toFixed(1)}%)`, n]}
                  contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.78rem' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Centro donut: macro dominante */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
              <p style={{ fontSize: '0.62rem', color: 'var(--text-3)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Totale</p>
              <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)', margin: '2px 0 0' }}>{fmtEur(alloc.total)}</p>
            </div>
          </div>

          {/* Legenda dettagliata (cliccabile → drill-down) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {segments.map(item => (
              <div key={item.key}
                onClick={() => setDrill({ label: item.name, color: item.color })}
                style={{ cursor: 'pointer', borderRadius: 6, padding: '2px 4px', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-1)', fontWeight: 500 }}>{item.name}</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{fmtEur(item.value)}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)', minWidth: 44, textAlign: 'right' }}>{item.percentage}%</span>
                  </span>
                </div>
                <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: item.color, width: `${item.percentage}%`, transition: 'width 0.4s' }} />
                </div>
              </div>
            ))}
            <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 4 }}>💡 Clicca una voce per vedere gli strumenti che contiene</p>
          </div>
        </div>
      )}

      {/* Riga macro riassuntiva */}
      {alloc.macro.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          {alloc.macro.map(m => (
            <span key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 6, background: m.color + '14', border: `1px solid ${m.color}33`, borderRadius: 10, padding: '5px 12px', fontSize: '0.78rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
              <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{m.name}</span>
              <span style={{ fontWeight: 700, color: m.color }}>{m.percentage}%</span>
            </span>
          ))}
        </div>
      )}

      {/* Avviso classificazione da confermare */}
      {alloc.undivedPct > 1 && (
        <p style={{ fontSize: '0.7rem', color: '#FF9F0A', marginTop: 12 }}>
          ⚠️ {alloc.undivedPct.toFixed(1)}% del portafoglio ha classificazione da confermare (titoli non ancora nel database).
        </p>
      )}

      {/* ── Popup drill-down: strumenti dentro la fetta ── */}
      {drill && (
        <div onClick={() => setDrill(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 16,
            width: '100%', maxWidth: 460, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: drill.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0, fontSize: '0.95rem' }}>{drill.label}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', margin: '2px 0 0' }}>
                  {drillHoldings.length} {drillHoldings.length === 1 ? 'strumento' : 'strumenti'} · {fmtEur(drillHoldings.reduce((s, h) => s + h.value, 0))}
                </p>
              </div>
              <button onClick={() => setDrill(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            {/* Lista strumenti */}
            <div style={{ overflowY: 'auto', padding: '8px 0' }}>
              {drillHoldings.map(h => (
                <div key={h.ticker} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>{h.ticker}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginLeft: 6, overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name !== h.ticker ? h.name : ''}</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{fmtEur(h.value)}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: drill.color, minWidth: 46, textAlign: 'right' }}>{h.weight.toFixed(1)}%</span>
                </div>
              ))}
              {drill.label === 'Da classificare' && (
                <p style={{ fontSize: '0.72rem', color: '#FF9F0A', padding: '10px 20px', margin: 0 }}>
                  ⚠️ Questi titoli non sono ancora nel database di composizione. Vai in Analisi → "Copertura classificazione" per segnalarli.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function pillStyle(active, color) {
  return {
    padding: '5px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
    cursor: 'pointer', border: 'none', transition: 'background 0.15s',
    background: active ? color : 'var(--surface-2)',
    color: active ? '#fff' : 'var(--text-2)',
  };
}
