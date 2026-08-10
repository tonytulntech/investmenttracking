import React, { useState, useRef, useEffect } from 'react';
import { Layers, ChevronDown, Check } from 'lucide-react';
import { useSelectedPortfolio, ALL_PORTFOLIOS } from '../context/PortfolioContext';

export default function PortfolioSelector() {
  const { selectedPortfolioId, setSelectedPortfolioId, portfolios } = useSelectedPortfolio();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const current = selectedPortfolioId === ALL_PORTFOLIOS
    ? { emoji: '🗂', name: 'Tutti i portafogli', color: '#8E8E93' }
    : portfolios.find(p => p.id === selectedPortfolioId) || { emoji: '❓', name: 'Sconosciuto', color: '#8E8E93' };

  const options = [
    { id: ALL_PORTFOLIOS, emoji: '🗂', name: 'Tutti i portafogli', color: '#8E8E93' },
    ...portfolios,
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Filtra per portafoglio"
        style={{
          display: 'flex', alignItems: 'center', gap: '0.55rem',
          width: '100%', padding: '0.45rem 0.75rem', borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--surface-2)', cursor: 'pointer',
          color: 'var(--text-1)', fontSize: '0.8125rem', fontWeight: 600,
          transition: 'all 0.2s',
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: 99, background: current.color, flexShrink: 0,
        }} />
        <span style={{ fontSize: '0.95rem' }}>{current.emoji}</span>
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current.name}
        </span>
        <ChevronDown size={14} style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          zIndex: 100, maxHeight: 320, overflowY: 'auto',
        }}>
          {options.map(opt => {
            const active = opt.id === selectedPortfolioId;
            return (
              <button
                key={opt.id}
                onClick={() => { setSelectedPortfolioId(opt.id); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 10px', borderRadius: 8, border: 'none',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  color: 'var(--text-1)', cursor: 'pointer',
                  fontSize: '0.8125rem', textAlign: 'left',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 99, background: opt.color, flexShrink: 0 }} />
                <span style={{ fontSize: '1rem' }}>{opt.emoji}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: active ? 700 : 500 }}>
                  {opt.name}
                </span>
                {active && <Check size={14} color="#30D158" />}
              </button>
            );
          })}
          {portfolios.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'var(--text-3)' }}>
              Nessun portafoglio configurato
            </div>
          )}
        </div>
      )}
    </div>
  );
}
