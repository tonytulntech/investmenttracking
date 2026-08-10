import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card — superficie solida con bordo hairline (Direzione C).
 * Primitiva base per i widget. Override via `className`.
 */
export function Card({ className, elevated = false, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border transition-colors',
        elevated ? 'p-6' : 'p-5',
        className
      )}
      style={{
        background: elevated ? 'var(--surface-1)' : 'var(--card-bg)',
        borderColor: elevated ? 'var(--border-strong)' : 'var(--border)',
        boxShadow: elevated ? '0 8px 24px rgba(0,0,0,0.35)' : '0 1px 2px rgba(0,0,0,0.28)',
      }}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('mb-3 flex items-center justify-between gap-2', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn('text-[0.8125rem] font-semibold', className)}
      style={{ color: 'var(--text-1)' }}
      {...props}
    />
  );
}

export default Card;
