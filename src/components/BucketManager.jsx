import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import {
  getPortfolioConfig, addBucket, updateBucket, deleteBucket,
  assignTickerToBucket, calcBucketDrift,
} from '../services/portfolioConfigService';

const eur0 = (n) => '€' + Math.abs(Math.round(n)).toLocaleString('it-IT');
const MONO = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };

/**
 * BucketManager — gestione dei "Ruoli" (bucket liberi) di un singolo portafoglio.
 * Crea/rinomina/elimina ruoli con target %, assegna i titoli e mostra il drift.
 *
 * Props:
 *  - portfolioId: string
 *  - holdings:    [{ ticker, holdingKey?, name?, marketValue }]  (titoli del portafoglio)
 *  - onChange:    callback opzionale dopo ogni modifica
 */
export default function BucketManager({ portfolioId, holdings = [], onChange }) {
  const [, setTick] = useState(0);
  const [open, setOpen] = useState(false);
  const bump = () => { setTick(t => t + 1); onChange?.(); };

  const cfg = getPortfolioConfig();
  const port = cfg.portfolios.find(p => p.id === portfolioId);
  if (!port) return null;

  const buckets = port.buckets || [];
  const drift = calcBucketDrift(port, holdings);
  const driftById = Object.fromEntries(drift.rows.map(r => [r.id, r]));
  const targetOk = Math.abs(drift.targetSum - 100) < 0.5;

  const bucketColor = (diff, threshold = 3) => {
    if (Math.abs(diff) <= threshold) return 'var(--pos)';
    return diff > 0 ? '#FF9F0A' : 'var(--accent)'; // sovrappeso ambra / sottopeso da comprare
  };

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          color: 'var(--text-2)', fontSize: '0.68rem', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}
      >
        <Layers size={13} />
        Ruoli
        {buckets.length > 0 && (
          <span style={{ ...MONO, color: targetOk ? 'var(--text-3)' : '#FF9F0A', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
            (target {Math.round(drift.targetSum)}%{targetOk ? '' : ' ⚠'})
          </span>
        )}
        {drift.unassignedPct >= 1 && (
          <span style={{ ...MONO, color: 'var(--accent)', textTransform: 'none', letterSpacing: 0 }}>
            · {drift.unassignedPct}% non assegnato
          </span>
        )}
        <span style={{ marginLeft: 'auto' }}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          {/* Bucket list */}
          {buckets.length === 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 8 }}>
              Nessun ruolo. Creane uno (es. "Income", "Growth-Div", "Kings") e assegna i titoli.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {buckets.map(b => {
              const d = driftById[b.id] || { current: 0, diff: 0, diffVal: 0 };
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    defaultValue={b.name}
                    onBlur={e => { if (e.target.value.trim() && e.target.value !== b.name) { updateBucket(portfolioId, b.id, { name: e.target.value }); bump(); } }}
                    style={{
                      flex: 1, minWidth: 0, background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: 7, padding: '4px 8px', color: 'var(--text-1)', fontSize: '0.76rem',
                    }}
                  />
                  {/* target % */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <input
                      type="number" min="0" max="100" defaultValue={b.target}
                      onBlur={e => { const v = Number(e.target.value) || 0; if (v !== b.target) { updateBucket(portfolioId, b.id, { target: v }); bump(); } }}
                      style={{
                        width: 46, textAlign: 'right', background: 'var(--surface-2)', border: '1px solid var(--border)',
                        borderRadius: 7, padding: '4px 6px', color: 'var(--text-1)', fontSize: '0.76rem', ...MONO,
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>%</span>
                  </div>
                  {/* current % + drift */}
                  <span style={{ ...MONO, fontSize: '0.72rem', color: 'var(--text-2)', minWidth: 40, textAlign: 'right' }}>
                    {d.current}%
                  </span>
                  <span style={{ ...MONO, fontSize: '0.72rem', fontWeight: 600, color: bucketColor(d.diff), minWidth: 46, textAlign: 'right' }}
                        title={`${d.diff > 0 ? 'Sovrappeso' : 'Sottopeso'}: ${d.diff > 0 ? 'vendi' : 'compra'} ~${eur0(d.diffVal)}`}>
                    {d.diff > 0 ? '+' : ''}{d.diff}%
                  </span>
                  <button onClick={() => { deleteBucket(portfolioId, b.id); bump(); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-3)', flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => { addBucket(portfolioId, 'Nuovo ruolo', 0); bump(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, background: 'var(--surface-2)',
              border: '1px dashed var(--border-strong)', borderRadius: 7, padding: '5px 10px',
              color: 'var(--text-2)', fontSize: '0.73rem', fontWeight: 500, cursor: 'pointer', marginBottom: 12,
            }}
          >
            <Plus size={13} /> Aggiungi ruolo
          </button>

          {/* Assegnazione titoli → ruolo */}
          {holdings.length > 0 && buckets.length > 0 && (
            <div>
              <div style={{ fontSize: '0.64rem', color: 'var(--text-3)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Assegna titoli
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {holdings.map(h => {
                  const key = h.holdingKey ?? h.ticker;
                  const cur = cfg.bucketAssignments?.[key] ?? '';
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.ticker}
                        <span style={{ ...MONO, color: 'var(--text-3)', fontWeight: 400, marginLeft: 6 }}>{eur0(h.marketValue || 0)}</span>
                      </span>
                      <select
                        value={cur}
                        onChange={e => { assignTickerToBucket(key, e.target.value || null); bump(); }}
                        style={{
                          background: 'var(--surface-2)', border: `1px solid ${cur ? 'var(--border)' : 'var(--accent)'}`,
                          borderRadius: 7, padding: '3px 8px', color: cur ? 'var(--text-1)' : 'var(--accent)',
                          fontSize: '0.73rem', maxWidth: '52%',
                        }}
                      >
                        <option value="">— non assegnato</option>
                        {buckets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
