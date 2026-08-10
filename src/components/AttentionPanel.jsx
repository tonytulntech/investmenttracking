import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, TrendingDown, TrendingUp, HelpCircle } from 'lucide-react';
import { getPortfolioAlerts } from '../services/portfolioConfigService';

const MONO = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };
const eur0 = (n) => '€' + Math.abs(Math.round(n)).toLocaleString('it-IT');

/**
 * AttentionPanel — pannello "Da controllare" della Dashboard.
 * Aggrega gli scostamenti dai target dei Ruoli per ogni portafoglio e li
 * mostra in modo compatto e azionabile, con link a Rebalancing.
 *
 * Non calcola nulla di suo: legge dai bucket già configurati in
 * PortfolioManager → Ruoli. Se non ci sono alert, non renderizza nulla.
 */
export default function AttentionPanel({ holdings = [] }) {
  const alerts = getPortfolioAlerts(holdings);
  if (alerts.length === 0) return null;

  const totalOff = alerts.reduce((s, a) => s + a.offBuckets.length, 0);

  return (
    <div
      style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '1rem 1.25rem', marginBottom: '1.5rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.28)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <AlertTriangle size={15} style={{ color: '#FF9F0A' }} />
        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-1)' }}>
          Da controllare
        </span>
        <span style={{ ...MONO, fontSize: '0.72rem', color: 'var(--text-3)' }}>
          {totalOff} scostament{totalOff === 1 ? 'o' : 'i'} · {alerts.length} portafogli{alerts.length === 1 ? 'o' : ''}
        </span>
        <Link to="/rebalancing" style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
          fontSize: '0.72rem', color: 'var(--text-2)', textDecoration: 'none', fontWeight: 500,
        }}>
          Vai a Ribilanciamento <ArrowRight size={11} />
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.map(({ portfolio, offBuckets, unassignedPct }) => (
          <div key={portfolio.id} style={{
            padding: '9px 11px', borderRadius: 10,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: '1rem' }}>{portfolio.emoji}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>{portfolio.name}</span>
              {unassignedPct >= 5 && (
                <span title="Titoli senza ruolo assegnato" style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  ...MONO, fontSize: '0.68rem', color: 'var(--accent)',
                  background: 'var(--accent-weak)', border: '1px solid var(--accent)',
                  padding: '1px 6px', borderRadius: 99,
                }}>
                  <HelpCircle size={10} /> {unassignedPct}% non assegnato
                </span>
              )}
              <Link to="/portfolios" style={{
                marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-3)',
                textDecoration: 'none',
              }}>
                gestisci →
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {offBuckets.slice(0, 4).map(b => {
                const over = b.diff > 0;
                const Arrow = over ? TrendingUp : TrendingDown;
                const dColor = over ? '#FF9F0A' : 'var(--accent)';
                const action = over ? 'alleggerisci' : 'rafforza';
                return (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem' }}>
                    <Arrow size={12} style={{ color: dColor, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-1)', fontWeight: 500, minWidth: 0, flex: '0 0 auto' }}>
                      {b.name}
                    </span>
                    <span style={{ ...MONO, color: 'var(--text-2)' }}>
                      {b.current}% <span style={{ color: 'var(--text-3)' }}>/ {b.target}%</span>
                    </span>
                    <span style={{ ...MONO, color: dColor, fontWeight: 600 }}>
                      {b.diff > 0 ? '+' : ''}{b.diff}%
                    </span>
                    <span style={{ ...MONO, color: 'var(--text-3)', marginLeft: 'auto' }}>
                      {action} ~{eur0(b.diffVal)}
                    </span>
                  </div>
                );
              })}
              {offBuckets.length > 4 && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', paddingTop: 2 }}>
                  + altri {offBuckets.length - 4} ruoli fuori target
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
