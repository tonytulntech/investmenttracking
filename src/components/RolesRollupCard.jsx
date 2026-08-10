import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { getRolesRollup } from '../services/portfolioConfigService';

const MONO = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };
const eur0 = (n) => '€' + Math.abs(Math.round(n)).toLocaleString('it-IT');

/**
 * RolesRollupCard — allocazione per Ruolo aggregata a livello patrimonio.
 * Somma i valori dei bucket con stesso nome fra tutti i portafogli.
 * Non renderizza se non ci sono ruoli assegnati.
 */
export default function RolesRollupCard({ holdings = [] }) {
  const [expanded, setExpanded] = useState(false);
  const { rows, unassignedPct } = getRolesRollup(holdings);
  if (rows.length === 0) return null;

  const visible = expanded ? rows : rows.slice(0, 6);

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '1.1rem 1.25rem',
      boxShadow: '0 1px 2px rgba(0,0,0,0.28)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Layers size={14} style={{ color: 'var(--text-2)' }} />
        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-1)' }}>
          Allocazione per Ruolo
        </span>
        <span style={{ ...MONO, fontSize: '0.68rem', color: 'var(--text-3)' }}>
          {rows.length} ruoli
        </span>
        {unassignedPct >= 1 && (
          <span title="Titoli senza ruolo assegnato" style={{
            ...MONO, fontSize: '0.68rem', color: 'var(--accent)',
            background: 'var(--accent-weak)', padding: '1px 6px', borderRadius: 99,
          }}>
            {unassignedPct}% non assegnato
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map(r => (
          <div key={r.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-2)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                {r.name}
              </span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ ...MONO, fontSize: '0.72rem', color: 'var(--text-3)' }}>{eur0(r.value)}</span>
                <span style={{ ...MONO, fontSize: '0.76rem', color: 'var(--text-1)', fontWeight: 600 }}>{r.pct}%</span>
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, r.pct)}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>

      {rows.length > 6 && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, marginTop: 10,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-3)', fontSize: '0.72rem', fontWeight: 500,
            padding: 0,
          }}
        >
          {expanded
            ? <>Mostra meno <ChevronUp size={12} /></>
            : <>Mostra tutti ({rows.length}) <ChevronDown size={12} /></>}
        </button>
      )}
    </div>
  );
}
