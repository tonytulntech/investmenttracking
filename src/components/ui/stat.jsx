import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './card';

/**
 * Stat — KPI card (Direzione C).
 * Numeri in mono tabellare; delta colorato con semantica P/L (--pos/--neg).
 *
 * Props:
 *  - label:  etichetta in alto (uppercase, faint)
 *  - value:  valore principale (stringa già formattata)
 *  - delta:  sottotitolo/variazione opzionale (stringa)
 *  - tone:   'pos' | 'neg' | 'neutral' | 'accent' — colore del value
 *  - large:  valore più grande (hero)
 */
export function Stat({ label, value, delta, tone = 'neutral', large = false, className, ...props }) {
  const valueColor = {
    pos: 'var(--pos)',
    neg: 'var(--neg)',
    accent: 'var(--accent)',
    neutral: 'var(--text-1)',
  }[tone];

  return (
    <Card className={cn('flex flex-col gap-1.5', className)} {...props}>
      <span
        className="text-[0.6875rem] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-3)' }}
      >
        {label}
      </span>
      <span
        className={cn('leading-none font-semibold tabnum', large ? 'text-3xl' : 'text-2xl')}
        style={{ color: valueColor, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </span>
      {delta != null && (
        <span
          className="text-[0.8125rem] tabnum"
          style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}
        >
          {delta}
        </span>
      )}
    </Card>
  );
}

export default Stat;
