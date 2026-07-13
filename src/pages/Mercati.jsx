/**
 * Mercati.jsx — Panoramica mercati globali con focus europeo
 * Heatmap live (Yahoo Finance) · aggiornamento automatico ogni 60s
 */
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Globe } from 'lucide-react';
import { fetchRawQuote } from '../services/priceService';

// ── Configurazione indici ─────────────────────────────────────────────────────
const INDICES = {
  'Europa': [
    { id: 'eurostoxx50', ticker: '^SX5E',     name: 'EURO STOXX 50',  desc: 'Eurozona large-cap',   size: 'xl' },
    { id: 'dax',         ticker: '^GDAXI',    name: 'DAX 40',         desc: 'Germania',              size: 'lg' },
    { id: 'cac40',       ticker: '^FCHI',     name: 'CAC 40',         desc: 'Francia',               size: 'lg' },
    { id: 'ftse100',     ticker: '^FTSE',     name: 'FTSE 100',       desc: 'UK',                    size: 'lg' },
    { id: 'ftsemib',     ticker: 'FTSEMIB.MI',name: 'FTSE MIB',       desc: 'Italia',                size: 'md' },
    { id: 'ibex35',      ticker: '^IBEX',     name: 'IBEX 35',        desc: 'Spagna',                size: 'md' },
    { id: 'aex',         ticker: '^AEX',      name: 'AEX',            desc: 'Olanda',                size: 'sm' },
    { id: 'smi',         ticker: '^SSMI',     name: 'SMI',            desc: 'Svizzera',              size: 'sm' },
    { id: 'omxs30',      ticker: '^OMX',      name: 'OMX Stockholm',  desc: 'Svezia',                size: 'sm' },
    { id: 'stoxx600',    ticker: '^STOXX',    name: 'STOXX 600',      desc: 'Europa allargata',      size: 'md' },
  ],
  'Americhe': [
    { id: 'sp500',       ticker: '^GSPC',     name: 'S&P 500',        desc: 'USA large-cap',         size: 'lg' },
    { id: 'nasdaq',      ticker: '^IXIC',     name: 'NASDAQ',         desc: 'USA tech',              size: 'lg' },
    { id: 'dow',         ticker: '^DJI',      name: 'Dow Jones',      desc: 'USA blue chip',         size: 'md' },
    { id: 'russell2000', ticker: '^RUT',      name: 'Russell 2000',   desc: 'USA small-cap',         size: 'sm' },
    { id: 'tsx',         ticker: '^GSPTSE',   name: 'TSX',            desc: 'Canada',                size: 'sm' },
  ],
  'Asia-Pacifico': [
    { id: 'nikkei',      ticker: '^N225',     name: 'Nikkei 225',     desc: 'Giappone',              size: 'lg' },
    { id: 'hangseng',    ticker: '^HSI',      name: 'Hang Seng',      desc: 'Hong Kong',             size: 'md' },
    { id: 'asx200',      ticker: '^AXJO',     name: 'ASX 200',        desc: 'Australia',             size: 'md' },
    { id: 'kospi',       ticker: '^KS11',     name: 'KOSPI',          desc: 'Corea del Sud',         size: 'sm' },
    { id: 'sensex',      ticker: '^BSESN',    name: 'Sensex',         desc: 'India',                 size: 'sm' },
  ],
  'Obbligazioni': [
    { id: 'us10y',       ticker: '^TNX',      name: 'US Treasury 10Y',desc: 'Rendimento %',          size: 'md', isYield: true },
    { id: 'de10y',       ticker: '^IRDE10YT=RR', name: 'Bund 10Y',   desc: 'Germania',              size: 'md', isYield: true },
    { id: 'it10y',       ticker: '^IRITU10YT=RR',name: 'BTP 10Y',    desc: 'Italia',                size: 'sm', isYield: true },
  ],
  'Materie Prime': [
    { id: 'gold',        ticker: 'GC=F',      name: 'Oro',            desc: '$/oz',                  size: 'lg' },
    { id: 'oil',         ticker: 'CL=F',      name: 'Petrolio WTI',   desc: '$/barile',              size: 'md' },
    { id: 'silver',      ticker: 'SI=F',      name: 'Argento',        desc: '$/oz',                  size: 'sm' },
    { id: 'natgas',      ticker: 'NG=F',      name: 'Gas Naturale',   desc: '$/MMBTU',               size: 'sm' },
    { id: 'copper',      ticker: 'HG=F',      name: 'Rame',           desc: '$/lb',                  size: 'sm' },
  ],
};

// ── Utilità colori ────────────────────────────────────────────────────────────
function heatColor(pct) {
  if (pct === null || pct === undefined) return { bg: '#1C1C1E', text: '#8E8E93' };
  if (pct <= -2)   return { bg: '#7D1E1E', text: '#FF6B6B' };
  if (pct <= -1)   return { bg: '#5C1A1A', text: '#FF453A' };
  if (pct <= -0.3) return { bg: '#3D1515', text: '#FF6B6B' };
  if (pct < 0.3)   return { bg: '#1C1C1E', text: '#8E8E93' };
  if (pct < 1)     return { bg: '#0D2E1A', text: '#30D158' };
  if (pct < 2)     return { bg: '#0A3D1F', text: '#30D158' };
  return              { bg: '#0D4A22', text: '#32D74B' };
}

const SIZE_STYLE = {
  xl: { minHeight: 100, fontSize: '1.2rem', nameFontSize: '0.9rem' },
  lg: { minHeight: 80,  fontSize: '1rem',   nameFontSize: '0.82rem' },
  md: { minHeight: 68,  fontSize: '0.88rem',nameFontSize: '0.75rem' },
  sm: { minHeight: 56,  fontSize: '0.78rem',nameFontSize: '0.68rem' },
};

async function fetchQuote(ticker) {
  const q = await fetchRawQuote(ticker);
  if (!q) return null;
  return {
    price: q.price,
    changePct: q.changePercent,
    change: q.change,
    currency: q.currency,
  };
}

// ── Tile singolo ─────────────────────────────────────────────────────────────
function IndexTile({ item, quote, loading }) {
  const pct  = quote?.changePct ?? null;
  const { bg, text } = heatColor(pct);
  const { minHeight, fontSize, nameFontSize } = SIZE_STYLE[item.size] || SIZE_STYLE.sm;
  const price = quote?.price;
  const isYield = item.isYield;

  return (
    <div style={{
      background: bg,
      borderRadius: 12,
      padding: '10px 12px',
      minHeight,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      border: '1px solid rgba(255,255,255,0.06)',
      transition: 'transform 0.15s',
      cursor: 'default',
    }}
    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div>
        <p style={{ fontSize: nameFontSize, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>{item.name}</p>
        <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>{item.desc}</p>
      </div>
      <div>
        {loading ? (
          <div style={{ height: 20, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }} />
        ) : pct !== null ? (
          <>
            <p style={{ fontSize, fontWeight: 800, color: text, margin: 0, lineHeight: 1 }}>
              {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
            </p>
            {price != null && (
              <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
                {isYield ? price.toFixed(3) + '%' : price.toLocaleString('it-IT', { maximumFractionDigits: 2 })}
              </p>
            )}
          </>
        ) : (
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>—</p>
        )}
      </div>
    </div>
  );
}

// ── Componente principale ─────────────────────────────────────────────────────
export default function Mercati() {
  const [quotes, setQuotes]         = useState({});
  const [loading, setLoading]       = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeSection, setActiveSection] = useState('all');

  const allTickers = Object.values(INDICES).flat();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    // Fetch a batch da 4 per non saturare il proxy CORS (free tier rate-limited)
    const BATCH = 4;
    for (let i = 0; i < allTickers.length; i += BATCH) {
      const slice = allTickers.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        slice.map(item => fetchQuote(item.ticker).then(q => ({ id: item.id, q })))
      );
      // Aggiornamento progressivo: ogni batch popola subito i suoi tile
      setQuotes(prev => {
        const next = { ...prev };
        results.forEach(r => { if (r.status === 'fulfilled' && r.value.q) next[r.value.id] = r.value.q; });
        return next;
      });
    }
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const sections = activeSection === 'all' ? Object.keys(INDICES) : [activeSection];

  // Calcola variazione media per sezione
  const sectionAvg = (name) => {
    const items = INDICES[name];
    const vals = items.map(i => quotes[i.id]?.changePct).filter(v => v != null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Globe size={22} color="#0A84FF" />
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Mercati</h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', margin: '2px 0 0' }}>
              {lastUpdate ? `Aggiornato: ${lastUpdate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : 'Caricamento…'}
              {' · '}Prezzi con ritardo 15 min
            </p>
          </div>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'var(--surface-2)', color: 'var(--text-2)',
            fontSize: '0.78rem', fontWeight: 600, cursor: loading ? 'default' : 'pointer',
          }}>
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Aggiorna
        </button>
      </div>

      {/* ── Filtri sezione ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {['all', ...Object.keys(INDICES)].map(s => {
          const avg = s !== 'all' ? sectionAvg(s) : null;
          const { text } = avg != null ? heatColor(avg) : { text: 'var(--text-2)' };
          return (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'background 0.15s',
                background: activeSection === s ? '#0A84FF' : 'var(--surface-2)',
                color: activeSection === s ? '#fff' : avg != null ? text : 'var(--text-2)',
              }}>
              {s === 'all' ? '🌍 Tutto' : s}
              {avg != null && s !== 'all' && (
                <span style={{ marginLeft: 5, fontSize: '0.65rem' }}>
                  {avg >= 0 ? '+' : ''}{avg.toFixed(1)}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Sezioni heatmap ── */}
      {sections.map(sectionName => {
        const items = INDICES[sectionName];
        return (
          <div key={sectionName} style={{ marginBottom: 28 }}>
            {/* Header sezione */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <h2 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                {sectionName}
              </h2>
              {(() => {
                const avg = sectionAvg(sectionName);
                if (avg == null) return null;
                const { text } = heatColor(avg);
                return (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: text }}>
                    {avg >= 0 ? '+' : ''}{avg.toFixed(2)}% media
                  </span>
                );
              })()}
            </div>

            {/* Griglia tile */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 8,
            }}>
              {items.map(item => (
                <IndexTile
                  key={item.id}
                  item={item}
                  quote={quotes[item.id]}
                  loading={loading && !quotes[item.id]}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* ── Legenda ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8, padding: '12px', background: 'var(--surface-2)', borderRadius: 12 }}>
        {[
          { label: '< −2%',       bg: '#7D1E1E', text: '#FF6B6B' },
          { label: '−2% / −0.3%', bg: '#3D1515', text: '#FF453A' },
          { label: '≈ 0',         bg: '#1C1C1E', text: '#8E8E93' },
          { label: '+0.3% / +2%', bg: '#0A3D1F', text: '#30D158' },
          { label: '> +2%',       bg: '#0D4A22', text: '#32D74B' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: '1px solid rgba(255,255,255,0.1)' }} />
            <span style={{ color: 'var(--text-3)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
