import React, { useMemo, useState } from 'react';
import { RefreshCcw, TrendingUp, TrendingDown, ArrowRight, Check } from 'lucide-react';
import { getPortfolioConfig, calcBucketDrift } from '../services/portfolioConfigService';

const MONO = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };
const eur0 = (n) => '€' + Math.abs(Math.round(n)).toLocaleString('it-IT');
const eur2 = (n) => '€' + Math.abs(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * RolesRebalancer — suggerimenti concreti "vendi X di A, compra Y di B" per
 * riportare i Ruoli di ciascun portafoglio ai target impostati.
 *
 * Strategia: per ogni portafoglio calcola il drift per bucket. Sovrappesati =
 * candidati a vendita (peso pro-rata sul valore dei titoli del bucket).
 * Sottopesati = candidati ad acquisto (peso pro-rata sul gap dei bucket).
 *
 * Se il portafoglio ha titoli abbastanza per compensare vendendo, propone un
 * SWAP (vendi/compra); altrimenti propone solo acquisti (nuovi soldi).
 */
export default function RolesRebalancer({ holdings = [] }) {
  const [mode, setMode] = useState('swap');   // 'swap' | 'contribute'
  const [contribution, setContribution] = useState(0);
  const config = getPortfolioConfig();

  const perPortfolio = useMemo(() => {
    const out = [];
    for (const port of config.portfolios) {
      const portHoldings = holdings.filter(h => config.assignments[h.holdingKey ?? h.ticker] === port.id);
      if (portHoldings.length === 0) continue;
      const drift = calcBucketDrift(port, portHoldings);
      const threshold = port.rebalanceThreshold ?? 5;

      // Ruoli fuori target
      const overweight  = drift.rows.filter(r => r.target > 0 && r.diff >  threshold);
      const underweight = drift.rows.filter(r => r.target > 0 && r.diff < -threshold);
      if (overweight.length === 0 && underweight.length === 0) continue;

      // Titoli aggregati per bucket
      const holdingsByBucket = {};
      portHoldings.forEach(h => {
        const key = h.holdingKey ?? h.ticker;
        const bId = config.bucketAssignments?.[key];
        if (!bId) return;
        (holdingsByBucket[bId] = holdingsByBucket[bId] || []).push(h);
      });

      // Suggerimenti VENDITA (mode=swap): pro-rata sul valore
      const sells = [];
      if (mode === 'swap') {
        overweight.forEach(r => {
          const excessEur = (r.diff / 100) * drift.total;   // > 0
          const list = holdingsByBucket[r.id] || [];
          const bucketVal = list.reduce((s, h) => s + (h.marketValue || 0), 0) || 1;
          list.forEach(h => {
            const amount = excessEur * ((h.marketValue || 0) / bucketVal);
            if (amount > 1) sells.push({
              ticker: h.ticker, name: h.name, bucketName: r.name,
              amount, price: h.currentPrice ?? h.avgPrice ?? null,
            });
          });
        });
      }

      // Budget disponibile per acquisti
      const totalSells = sells.reduce((s, x) => s + x.amount, 0);
      const buyBudget = mode === 'swap' ? totalSells : (Number(contribution) || 0);

      // Suggerimenti ACQUISTO: pro-rata sul gap dei sottopesati
      const totalGap = underweight.reduce((s, r) => s + Math.abs(r.diff), 0) || 1;
      const buys = [];
      underweight.forEach(r => {
        const share = Math.abs(r.diff) / totalGap;
        const budget = buyBudget * share;
        if (budget < 1) return;
        // Distribuisci nel bucket pro-rata sui titoli esistenti; se vuoto,
        // suggerisci un nuovo acquisto sotto il nome del ruolo
        const list = holdingsByBucket[r.id] || [];
        if (list.length === 0) {
          buys.push({ ticker: null, name: null, bucketName: r.name, amount: budget, price: null });
        } else {
          const bucketVal = list.reduce((s, h) => s + (h.marketValue || 0), 0) || 1;
          list.forEach(h => {
            const amount = budget * ((h.marketValue || 0) / bucketVal);
            if (amount > 1) buys.push({
              ticker: h.ticker, name: h.name, bucketName: r.name,
              amount, price: h.currentPrice ?? h.avgPrice ?? null,
            });
          });
        }
      });

      out.push({ portfolio: port, overweight, underweight, sells, buys, totalSells, totalUnmet: Math.max(0, drift.rows.filter(r => r.diff < 0).reduce((s, r) => s + Math.abs(r.diff), 0) * drift.total / 100 - buyBudget) });
    }
    return out;
  }, [holdings, mode, contribution, config]);

  const totalActions = perPortfolio.reduce((s, p) => s + p.sells.length + p.buys.length, 0);

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '1.1rem 1.25rem',
      boxShadow: '0 1px 2px rgba(0,0,0,0.28)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <RefreshCcw size={15} style={{ color: 'var(--text-2)' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
          Ribilanciamento per Ruoli
        </span>

        {/* Toggle modalità */}
        <div style={{
          display: 'flex', marginLeft: 'auto',
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
        }}>
          <button onClick={() => setMode('swap')} style={{
            padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', border: 'none',
            background: mode === 'swap' ? 'var(--text-1)' : 'transparent',
            color: mode === 'swap' ? 'var(--bg)' : 'var(--text-2)',
          }}>Swap</button>
          <button onClick={() => setMode('contribute')} style={{
            padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', border: 'none',
            background: mode === 'contribute' ? 'var(--text-1)' : 'transparent',
            color: mode === 'contribute' ? 'var(--bg)' : 'var(--text-2)',
          }}>Nuovo versamento</button>
        </div>

        {mode === 'contribute' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>€</span>
            <input
              type="number" min={0} step={50}
              value={contribution} onChange={e => setContribution(e.target.value)}
              placeholder="500"
              style={{
                width: 80, background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 7, padding: '3px 8px', color: 'var(--text-1)',
                fontSize: '0.78rem', textAlign: 'right', ...MONO,
              }}
            />
          </div>
        )}
      </div>

      {perPortfolio.length === 0 && (
        <div style={{
          padding: '1.5rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem',
          background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)',
        }}>
          <Check size={20} style={{ marginBottom: 6, color: 'var(--pos)' }} />
          <div>Tutti i ruoli sono entro soglia — nessuna azione necessaria.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {perPortfolio.map(({ portfolio, sells, buys }) => (
          <div key={portfolio.id} style={{
            padding: '11px 12px', borderRadius: 10,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: '1.05rem' }}>{portfolio.emoji}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>{portfolio.name}</span>
            </div>

            {/* Vendite */}
            {sells.length > 0 && (
              <div style={{ marginBottom: buys.length > 0 ? 10 : 0 }}>
                <div style={{ fontSize: '0.64rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <TrendingDown size={11} color="#FF9F0A" /> Vendi
                </div>
                {sells.map((s, i) => (
                  <Row key={i} action="sell" {...s} />
                ))}
              </div>
            )}

            {/* Acquisti */}
            {buys.length > 0 && (
              <div>
                <div style={{ fontSize: '0.64rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <TrendingUp size={11} color="var(--accent)" /> Compra
                </div>
                {buys.map((b, i) => (
                  <Row key={i} action="buy" {...b} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {perPortfolio.length > 0 && totalActions > 0 && (
        <div style={{ marginTop: 10, fontSize: '0.68rem', color: 'var(--text-3)', textAlign: 'right' }}>
          {mode === 'swap'
            ? 'Suggerimenti calcolati per riportare i ruoli in target senza aggiungere capitale (swap interno al portafoglio).'
            : `Distribuzione di ${eur0(Number(contribution) || 0)} pro-rata sui ruoli sottopesati.`}
        </div>
      )}
    </div>
  );
}

function Row({ action, ticker, name, bucketName, amount, price }) {
  const qty = price && price > 0 ? amount / price : null;
  const color = action === 'sell' ? '#FF9F0A' : 'var(--accent)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '0.76rem', borderBottom: '1px dashed var(--border)' }}>
      <span style={{ ...MONO, color, fontWeight: 700, minWidth: 62, textAlign: 'right' }}>
        {eur0(amount)}
      </span>
      <ArrowRight size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
      <span style={{ fontWeight: 600, color: 'var(--text-1)', minWidth: 0, flex: '0 0 auto' }}>
        {ticker || <em style={{ color: 'var(--text-3)', fontWeight: 400 }}>Nuovo titolo</em>}
      </span>
      <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
        ({bucketName})
      </span>
      {qty != null && (
        <span style={{ ...MONO, marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-2)' }}>
          ~{qty.toFixed(qty >= 10 ? 0 : qty >= 1 ? 2 : 4)} @ {eur2(price)}
        </span>
      )}
    </div>
  );
}
