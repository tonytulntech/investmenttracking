import React from 'react';
import { cn } from '@/lib/utils';

/**
 * SummaryCard — primitiva riusabile (Direzione C).
 * Ispirata al pattern InsuranceSummaryCard ma senza gradiente pieno colorato:
 * l'accento è dato da una BARRA HAIRLINE in alto (colore configurabile) e da
 * un'icona in cerchio pulito, coerente con l'estetica del resto dell'app.
 *
 * Props:
 *  - title, subtitle: intestazione
 *  - icon: React node (icona lucide)
 *  - accent: colore accento della barra top (default: var(--accent))
 *  - value: valore principale (grande, mono)
 *  - target: valore target opzionale (mostrato come "/ target")
 *  - progress: 0-100 per la barra di progresso
 *  - progressLabel: label opzionale accanto alla %
 *  - stats: array di { label, value, target? } per la lista breakdown
 *  - footer: nodo opzionale sotto la barra progresso (es. "Expiry: …")
 *  - cta: { label, onClick, href } per il bottone in fondo
 */
const MONO = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };

export function SummaryCard({
  title, subtitle,
  icon,
  accent = 'var(--accent)',
  value, target,
  progress = null,
  progressLabel,
  stats = [],
  footer,
  cta,
  className,
}) {
  return (
    <div
      className={cn(className)}
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.28)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Barra accento hairline in alto */}
      <div style={{ height: 3, background: accent }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px 10px',
        borderBottom: '1px solid var(--border)',
      }}>
        {icon && (
          <div style={{
            width: 34, height: 34, borderRadius: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            color: accent, flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {title}
          </div>
          {subtitle && (
            <div style={{
              fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {/* Value + target */}
        {value != null && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              ...MONO, fontSize: '1.5rem', fontWeight: 700, color: accent, lineHeight: 1.05,
            }}>
              {value}
            </span>
            {target && (
              <span style={{ ...MONO, fontSize: '0.85rem', color: 'var(--text-3)' }}>
                / {target}
              </span>
            )}
          </div>
        )}

        {/* Progress */}
        {progress != null && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {progressLabel || 'Progress'}
              </span>
              <span style={{ ...MONO, fontSize: '0.72rem', color: 'var(--text-1)', fontWeight: 600 }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div style={{
              height: 6, background: 'var(--surface-2)',
              borderRadius: 99, overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                height: '100%', background: accent, borderRadius: 99,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* Stats breakdown */}
        {stats.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {stats.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-3)' }}>{s.label}</span>
                <span style={{ ...MONO, color: 'var(--text-1)', fontWeight: 600 }}>
                  {s.value}
                  {s.target && <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> / {s.target}</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {footer && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{footer}</div>
        )}
      </div>

      {/* CTA footer */}
      {cta && (
        <div style={{ padding: '0 16px 14px' }}>
          {cta.href ? (
            <a href={cta.href} className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem', padding: '8px 12px' }}>
              {cta.label}
            </a>
          ) : (
            <button onClick={cta.onClick} className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem', padding: '8px 12px' }}>
              {cta.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default SummaryCard;
