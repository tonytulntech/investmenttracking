/**
 * MissingPricesAlert — banner che avvisa quando uno o più titoli non hanno
 * prezzo live (fallback a costo di carico → statistiche potenzialmente alterate).
 * Permette di segnalare i titoli mancanti al team con un click.
 */
import React, { useState } from 'react';
import { AlertTriangle, Send, Check } from 'lucide-react';
import { reportTickers, getReportedTickers } from '../services/tickerReportService';

const ORANGE = '#FF9F0A';

export default function MissingPricesAlert({ unpriced = [] }) {
  const [sent, setSent] = useState(false);
  const [reportedKeys, setReportedKeys] = useState(
    () => new Set(getReportedTickers().map(t => (t.ticker || '').toUpperCase()))
  );

  if (!unpriced.length) return null;

  const allAlreadyReported = unpriced.every(t => reportedKeys.has((t.ticker || '').toUpperCase()));

  const handleReport = () => {
    const { reported } = reportTickers(unpriced, { openMail: true });
    setReportedKeys(prev => {
      const next = new Set(prev);
      unpriced.forEach(t => next.add((t.ticker || '').toUpperCase()));
      return next;
    });
    setSent(true);
  };

  return (
    <div style={{
      background: `${ORANGE}12`, border: `1px solid ${ORANGE}44`,
      borderRadius: 14, padding: '14px 18px', marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <AlertTriangle size={18} color={ORANGE} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            {unpriced.length} {unpriced.length === 1 ? 'titolo senza prezzo aggiornato' : 'titoli senza prezzo aggiornato'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', margin: '4px 0 0', lineHeight: 1.5 }}>
            Per questi titoli l'app non trova il prezzo di mercato e usa il <strong>costo di carico</strong> come stima.
            Le statistiche (ROI, rendimento) potrebbero essere <strong>leggermente alterate</strong> finché il titolo non viene aggiunto.
          </p>

          {/* Lista ticker */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {unpriced.map(t => {
              const isRep = reportedKeys.has((t.ticker || '').toUpperCase());
              return (
                <span key={t.ticker} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: isRep ? '#30D15818' : 'var(--surface-2)',
                  border: `1px solid ${isRep ? '#30D15844' : 'var(--border)'}`,
                  borderRadius: 8, padding: '4px 10px', fontSize: '0.75rem',
                }}>
                  <strong style={{ color: 'var(--text-1)' }}>{t.ticker}</strong>
                  {t.name && t.name !== t.ticker && (
                    <span style={{ color: 'var(--text-3)' }}>{t.name.slice(0, 24)}</span>
                  )}
                  {isRep && <Check size={12} color="#30D158" />}
                </span>
              );
            })}
          </div>
        </div>

        {/* Azione segnala */}
        <button
          onClick={handleReport}
          disabled={allAlreadyReported && sent}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            padding: '8px 14px', borderRadius: 10, border: 'none',
            background: (allAlreadyReported || sent) ? 'var(--surface-2)' : ORANGE,
            color: (allAlreadyReported || sent) ? 'var(--text-3)' : '#1a1a1a',
            fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
          }}>
          {sent || allAlreadyReported ? <Check size={14} /> : <Send size={14} />}
          {sent || allAlreadyReported ? 'Segnalato' : 'Segnala al team'}
        </button>
      </div>

      {(sent || allAlreadyReported) && (
        <p style={{ fontSize: '0.72rem', color: '#30D158', margin: '10px 0 0', paddingLeft: 30 }}>
          ✓ Richiesta registrata. Riceverai una notifica quando il titolo sarà aggiunto — poi ricarica il CSV per aggiornare i valori.
        </p>
      )}
    </div>
  );
}
