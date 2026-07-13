import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Calculator, TrendingDown, Info, Flame, TrendingUp, Coins, AlertTriangle,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtEur(v) {
  if (Math.abs(v) >= 1_000_000)
    return `€${(v / 1_000_000).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  return `€${Math.round(v).toLocaleString('it-IT')}`;
}
function fmtEurFull(v) {
  return `€${Math.round(v).toLocaleString('it-IT')}`;
}
function halvingYears(rate) {
  if (rate <= 0) return Infinity;
  return Math.log(2) / Math.log(1 + rate / 100);
}

// Shared input style
const inputStyle = {
  flex: 1,
  background: 'var(--surface-2, rgba(255,255,255,0.06))',
  border: '1px solid var(--border, rgba(255,255,255,0.1))',
  borderRadius: 8,
  padding: '7px 10px',
  fontSize: '1rem',
  fontWeight: 700,
  color: 'var(--text-1)',
  outline: 'none',
  width: '100%',
};
const labelStyle = {
  fontSize: '0.72rem',
  fontWeight: 600,
  color: 'var(--analysis-dim)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  display: 'block',
  marginBottom: 7,
};

// ─────────────────────────────────────────────────────────────────────────────
// CALCOLATORE 1 — INFLAZIONE
// ─────────────────────────────────────────────────────────────────────────────

const INFLATION_PRESETS = [
  { key: 'bce',   flag: '🇪🇺', label: 'Target BCE',      rate: 2.0, note: 'Obiettivo ufficiale della Banca Centrale Europea' },
  { key: 'ita',   flag: '🇮🇹', label: 'Media italiana',  rate: 2.4, note: 'Media storica inflazione italiana 2000–2024 (ISTAT)' },
  { key: 'alta',  flag: '📈',  label: 'Scenario alto',   rate: 3.5, note: 'Media periodo post-COVID (2021–2023)' },
  { key: 'stagf', flag: '🔥',  label: 'Stagflazione',    rate: 6.0, note: "Scenario estremo (es. crisi anni '70–'80)" },
];

function InflazioneTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const nominal = payload.find(p => p.dataKey === 'nominal')?.value ?? 0;
  const real    = payload.find(p => p.dataKey === 'real')?.value ?? 0;
  const erosion = nominal > 0 ? ((nominal - real) / nominal * 100) : 0;
  return (
    <div style={{
      background: 'var(--surface-1, #1c1c1e)', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10, padding: '10px 14px', fontSize: '0.78rem', minWidth: 190,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-1)' }}>Anno {label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
        <span style={{ color: '#0A84FF' }}>Valore nominale</span>
        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{fmtEurFull(nominal)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
        <span style={{ color: '#FF9F0A' }}>Potere d'acquisto</span>
        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{fmtEurFull(real)}</span>
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 6, paddingTop: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: '#FF453A' }}>Erosione inflazione</span>
          <span style={{ fontWeight: 700, color: '#FF453A' }}>-{erosion.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

function InflazioneCalc() {
  const [capitalInit, setCapitalInit] = useState(10000);
  const [monthly,     setMonthly]     = useState(300);
  const [years,       setYears]       = useState(25);
  const [presetKey,   setPresetKey]   = useState('ita');
  const [customRate,  setCustomRate]  = useState(2.5);

  const inflationRate = useMemo(() => {
    if (presetKey === 'custom') return customRate;
    return INFLATION_PRESETS.find(p => p.key === presetKey)?.rate ?? 2.4;
  }, [presetKey, customRate]);

  const chartData = useMemo(() => {
    const data = [];
    for (let y = 0; y <= years; y++) {
      const nominal = capitalInit + monthly * 12 * y;
      const real    = nominal / Math.pow(1 + inflationRate / 100, y);
      data.push({ year: y, nominal: Math.round(nominal), real: Math.round(real) });
    }
    return data;
  }, [capitalInit, monthly, years, inflationRate]);

  const last       = chartData[chartData.length - 1];
  const totalPaid  = capitalInit + monthly * 12 * years;
  const nominalEnd = last.nominal;
  const realEnd    = last.real;
  const erosionPct = ((nominalEnd - realEnd) / nominalEnd * 100);
  const halvYears  = halvingYears(inflationRate);
  const cpiTotal   = (Math.pow(1 + inflationRate / 100, years) - 1) * 100;
  const thousand_future = 1000 / Math.pow(1 + inflationRate / 100, years);

  const erosionRows = useMemo(() => {
    return [5, 10, 15, 20, 25, 30].filter(y => y <= years).map(y => {
      const nom = capitalInit + monthly * 12 * y;
      const rl  = nom / Math.pow(1 + inflationRate / 100, y);
      return { year: y, nominal: nom, real: rl, pct: ((nom - rl) / nom * 100) };
    });
  }, [capitalInit, monthly, years, inflationRate]);

  const presetActive = INFLATION_PRESETS.find(p => p.key === presetKey);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg, #FF9F0A 0%, #FF453A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={18} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Calcolatore Inflazione</h2>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--analysis-dim)', margin: 0, maxWidth: 640 }}>
          Scopri come l'inflazione erode il potere d'acquisto dei tuoi risparmi nel tempo. Il grafico mostra
          la differenza tra denaro nominale accumulato e valore reale futuro.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div className="card" style={{ padding: '14px 16px' }}>
            <label style={labelStyle}>Capitale iniziale</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.1rem', color: 'var(--analysis-dim)' }}>€</span>
              <input type="number" min={0} step={1000} value={capitalInit}
                onChange={e => setCapitalInit(Math.max(0, Number(e.target.value)))} style={inputStyle} />
            </div>
            <input type="range" min={0} max={500000} step={5000} value={capitalInit}
              onChange={e => setCapitalInit(Number(e.target.value))}
              style={{ width: '100%', marginTop: 8, accentColor: '#0A84FF' }} />
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <label style={labelStyle}>Risparmio mensile</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.1rem', color: 'var(--analysis-dim)' }}>€</span>
              <input type="number" min={0} step={50} value={monthly}
                onChange={e => setMonthly(Math.max(0, Number(e.target.value)))} style={inputStyle} />
              <span style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', flexShrink: 0 }}>/mese</span>
            </div>
            <input type="range" min={0} max={5000} step={50} value={monthly}
              onChange={e => setMonthly(Number(e.target.value))}
              style={{ width: '100%', marginTop: 8, accentColor: '#0A84FF' }} />
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Periodo</label>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>{years} anni</span>
            </div>
            <input type="range" min={1} max={40} step={1} value={years}
              onChange={e => setYears(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#BF5AF2' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--analysis-faint)', marginTop: 4 }}>
              <span>1 anno</span><span>40 anni</span>
            </div>
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <label style={labelStyle}>Tasso d'inflazione</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {INFLATION_PRESETS.map(p => (
                <button key={p.key} onClick={() => setPresetKey(p.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 11px', borderRadius: 9, border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: presetKey === p.key ? 'rgba(255,159,10,0.12)' : 'var(--surface-2, rgba(255,255,255,0.04))',
                  outline: presetKey === p.key ? '1.5px solid rgba(255,159,10,0.5)' : '1px solid var(--border, rgba(255,255,255,0.08))',
                }}>
                  <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>{p.flag}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.77rem', fontWeight: presetKey === p.key ? 700 : 500, color: 'var(--text-1)' }}>{p.label}</div>
                    <div style={{ fontSize: '0.63rem', color: 'var(--analysis-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.note}</div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, flexShrink: 0, color: presetKey === p.key ? '#FF9F0A' : 'var(--analysis-dim)' }}>{p.rate}%</span>
                </button>
              ))}
              <button onClick={() => setPresetKey('custom')} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 11px', borderRadius: 9, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: presetKey === 'custom' ? 'rgba(255,159,10,0.12)' : 'var(--surface-2, rgba(255,255,255,0.04))',
                outline: presetKey === 'custom' ? '1.5px solid rgba(255,159,10,0.5)' : '1px solid var(--border, rgba(255,255,255,0.08))',
              }}>
                <span style={{ fontSize: '0.95rem' }}>✏️</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.77rem', fontWeight: presetKey === 'custom' ? 700 : 500, color: 'var(--text-1)' }}>Personalizzata</div>
                  <div style={{ fontSize: '0.63rem', color: 'var(--analysis-dim)' }}>Imposta un valore personalizzato</div>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, flexShrink: 0, color: presetKey === 'custom' ? '#FF9F0A' : 'var(--analysis-dim)' }}>{customRate}%</span>
              </button>
              {presetKey === 'custom' && (
                <div style={{ padding: '8px 2px 2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--analysis-dim)', marginBottom: 5 }}>
                    <span>0.5%</span>
                    <span style={{ fontWeight: 700, color: '#FF9F0A', fontSize: '0.85rem' }}>{customRate}% / anno</span>
                    <span>15%</span>
                  </div>
                  <input type="range" min={0.5} max={15} step={0.1} value={customRate}
                    onChange={e => setCustomRate(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#FF9F0A' }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Hai versato in totale', value: fmtEur(totalPaid),     sub: `Capitale + contributi ${years}a`,      color: 'var(--text-1)' },
              { label: 'Valore nominale',        value: fmtEur(nominalEnd),    sub: 'Quello che hai fisicamente',            color: '#0A84FF' },
              { label: "Potere d'acquisto reale",value: fmtEur(realEnd),       sub: `In €${new Date().getFullYear()} equiv`, color: '#FF9F0A' },
              { label: 'Erosione totale',        value: `-${erosionPct.toFixed(1)}%`, sub: `${fmtEur(nominalEnd - realEnd)} "spariti"`, color: '#FF453A' },
            ].map(c => (
              <div key={c.label} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: '0.63rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: '0.63rem', color: 'var(--analysis-dim)', marginTop: 4 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="card" style={{ padding: '16px 18px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Proiezione su {years} anni — inflazione {inflationRate}%/anno</div>
                {presetKey !== 'custom' && presetActive && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--analysis-dim)', marginTop: 2 }}>{presetActive.note}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: '0.68rem', alignItems: 'center' }}>
                <span><span style={{ display: 'inline-block', width: 10, height: 3, background: '#0A84FF', borderRadius: 2, marginRight: 4 }} />Valore nominale</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 3, background: '#FF9F0A', borderRadius: 2, marginRight: 4 }} />Potere d'acquisto reale</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gInflNominal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#0A84FF" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="gInflReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF9F0A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#FF9F0A" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--analysis-dim)' }}
                  tickFormatter={y => y === 0 ? 'Oggi' : `${y}a`} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--analysis-dim)' }}
                  tickFormatter={v => fmtEur(v)} tickLine={false} axisLine={false} width={72} />
                <Tooltip content={<InflazioneTooltip />} />
                {halvYears <= years && (
                  <ReferenceLine x={Math.round(halvYears)} stroke="#FF453A" strokeDasharray="4 3"
                    label={{ value: "½ potere d'acquisto", position: 'insideTopLeft', fontSize: 10, fill: '#FF453A' }} />
                )}
                <Area type="monotone" dataKey="nominal" stroke="#0A84FF" strokeWidth={2} fill="url(#gInflNominal)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="real" stroke="#FF9F0A" strokeWidth={2.5} fill="url(#gInflReal)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Dimezzamento del potere d'acquisto
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#FF453A', lineHeight: 1 }}>
                  {halvYears < 100 ? halvYears.toFixed(0) : '∞'}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--analysis-dim)', marginBottom: 4 }}>anni</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--analysis-dim)', margin: '0 0 12px', lineHeight: 1.5 }}>
                Con un'inflazione del <strong>{inflationRate}%</strong> annuo, il potere d'acquisto si dimezza ogni{' '}
                <strong>{halvYears < 100 ? `${halvYears.toFixed(0)} anni` : '∞'}</strong>.
              </p>
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--analysis-dim)', marginBottom: 4 }}>€1.000 di oggi, tra <strong>{years} anni</strong> varranno:</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FF453A' }}>{fmtEurFull(thousand_future)}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--analysis-faint)', marginTop: 2 }}>in potere d'acquisto odierno</div>
              </div>
              <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', marginBottom: 3 }}>Inflazione cumulata in {years} anni</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FF9F0A' }}>+{cpiTotal.toFixed(1)}%</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--analysis-faint)' }}>i prezzi aumentano mediamente del {cpiTotal.toFixed(0)}%</div>
              </div>
            </div>
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--analysis-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Valore reale nel tempo
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 52px', fontSize: '0.6rem', fontWeight: 600, color: 'var(--analysis-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 4 }}>
                <span>Anno</span>
                <span style={{ textAlign: 'right' }}>Nominale</span>
                <span style={{ textAlign: 'right' }}>Reale</span>
                <span style={{ textAlign: 'right' }}>–%</span>
              </div>
              {erosionRows.map((row, i) => {
                const intensity = Math.min(row.pct / 60, 1);
                const red = Math.round(255 * intensity);
                return (
                  <div key={row.year} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 52px', fontSize: '0.73rem', padding: '5px 0', borderBottom: i < erosionRows.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--analysis-dim)' }}>+{row.year}a</span>
                    <span style={{ textAlign: 'right', color: '#0A84FF' }}>{fmtEur(row.nominal)}</span>
                    <span style={{ textAlign: 'right', fontWeight: 600, color: '#FF9F0A' }}>{fmtEur(row.real)}</span>
                    <span style={{ textAlign: 'right', fontWeight: 700, color: `rgba(255,${255 - red},${255 - red})` }}>-{row.pct.toFixed(0)}%</span>
                  </div>
                );
              })}
              <div style={{ marginTop: 12, padding: '7px 9px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '0.65rem', color: 'var(--analysis-dim)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <Info size={11} style={{ flexShrink: 0, marginTop: 1, color: '#0A84FF' }} />
                Calcolo con denaro tenuto liquido, senza rendimento da investimento.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCOLATORE 2 — PAC / INTERESSE COMPOSTO
// ─────────────────────────────────────────────────────────────────────────────

function FeeTooltip({ active, payload, label, withdrawalRate = 4, targetRendita = 1000, scenarios = [] }) {
  if (!active || !payload?.length) return null;
  const invested = payload.find(p => p.dataKey === 'invested')?.value ?? 0;
  const neededCap = targetRendita * 12 / (withdrawalRate / 100);
  return (
    <div style={{ background: 'var(--surface-1,#1c1c1e)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', fontSize: '0.78rem', minWidth: 240 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-1)' }}>Anno {label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 5, paddingBottom: 5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ color: 'var(--analysis-dim)' }}>Versato</span>
        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{fmtEurFull(invested)}</span>
      </div>
      {scenarios.map(s => {
        const v = payload.find(p => p.dataKey === s.key)?.value ?? 0;
        const rendita = Math.round(v * withdrawalRate / 100 / 12);
        const reached = v >= neededCap;
        return (
          <div key={s.key} style={{ marginBottom: 5, paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span>
              <span style={{ fontWeight: 700, color: s.color }}>{fmtEurFull(v)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 1 }}>
              <span style={{ color: 'var(--analysis-dim)', fontSize: '0.7rem' }}>Rendita {withdrawalRate}%</span>
              <span style={{ fontWeight: 600, color: reached ? '#30D158' : 'var(--analysis-dim)', fontSize: '0.72rem' }}>
                {reached ? '✓ ' : ''}{fmtEurFull(rendita)}/mese
              </span>
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', marginTop: 2 }}>
        Obiettivo: {fmtEurFull(targetRendita)}/mese
      </div>
    </div>
  );
}

const PAC_PRESETS = [
  { key: 'conservative', emoji: '🛡️', label: 'Conservativo',    rate: 4.0,  note: 'Obbligazioni / portafoglio difensivo' },
  { key: 'moderate',     emoji: '⚖️', label: 'Moderato',        rate: 6.0,  note: 'Portafoglio bilanciato 60/40' },
  { key: 'equity',       emoji: '🌍', label: 'Azionario globale',rate: 8.0,  note: 'MSCI World — media storica nominale' },
  { key: 'growth',       emoji: '🚀', label: 'Crescita',        rate: 10.0, note: 'S&P 500 — media storica nominale' },
];

function PACTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const invested  = payload.find(p => p.dataKey === 'invested')?.value ?? 0;
  const nominal   = payload.find(p => p.dataKey === 'nominal')?.value ?? 0;
  const real      = payload.find(p => p.dataKey === 'real')?.value ?? 0;
  const idleReal  = payload.find(p => p.dataKey === 'idleReal')?.value ?? 0;
  const gain      = nominal - invested;
  const gainPct   = invested > 0 ? (gain / invested * 100) : 0;
  const advantage = real - idleReal;
  return (
    <div style={{
      background: 'var(--surface-1, #1c1c1e)', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10, padding: '10px 14px', fontSize: '0.78rem', minWidth: 230,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-1)' }}>Anno {label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
        <span style={{ color: 'var(--analysis-dim)' }}>Capitale versato</span>
        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{fmtEurFull(invested)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
        <span style={{ color: '#30D158' }}>Valore portafoglio</span>
        <span style={{ fontWeight: 600, color: '#30D158' }}>{fmtEurFull(nominal)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
        <span style={{ color: '#0A84FF' }}>Valore reale (investito)</span>
        <span style={{ fontWeight: 600, color: '#0A84FF' }}>{fmtEurFull(real)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
        <span style={{ color: '#FF453A' }}>Liquidità ferma (reale)</span>
        <span style={{ fontWeight: 600, color: '#FF453A' }}>{fmtEurFull(idleReal)}</span>
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 6, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: '#30D158' }}>Guadagno netto</span>
          <span style={{ fontWeight: 700, color: '#30D158' }}>+{fmtEurFull(gain)} (+{gainPct.toFixed(1)}%)</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: '#0A84FF' }}>Vantaggio vs liquidità</span>
          <span style={{ fontWeight: 700, color: '#0A84FF' }}>+{fmtEurFull(advantage)}</span>
        </div>
      </div>
    </div>
  );
}

function PACCalc() {
  const [capitalInit,    setCapitalInit]    = useState(10000);
  const [monthly,        setMonthly]        = useState(300);
  const [years,          setYears]          = useState(25);
  const [presetKey,      setPresetKey]      = useState('equity');
  const [customReturn,   setCustomReturn]   = useState(7.0);
  const [inflationRate,  setInflationRate]  = useState(2.4);
  const [withdrawalRate, setWithdrawalRate] = useState(4.0);

  const annualReturn = useMemo(() => {
    if (presetKey === 'custom') return customReturn;
    return PAC_PRESETS.find(p => p.key === presetKey)?.rate ?? 8.0;
  }, [presetKey, customReturn]);

  // Chart data — per year, compound monthly
  const chartData = useMemo(() => {
    const r = annualReturn / 100 / 12; // monthly rate
    const data = [];
    for (let y = 0; y <= years; y++) {
      const n = y * 12;
      const invested = capitalInit + monthly * n;
      let nominal;
      if (r === 0) {
        nominal = invested;
      } else {
        nominal = capitalInit * Math.pow(1 + r, n)
                + monthly * (Math.pow(1 + r, n) - 1) / r;
      }
      const real     = nominal / Math.pow(1 + inflationRate / 100, y);
      const idleReal = invested / Math.pow(1 + inflationRate / 100, y); // capitale fermo, eroso dall'inflazione
      data.push({ year: y, invested: Math.round(invested), nominal: Math.round(nominal), real: Math.round(real), idleReal: Math.round(idleReal) });
    }
    return data;
  }, [capitalInit, monthly, years, annualReturn, inflationRate]);

  const last           = chartData[chartData.length - 1];
  const totalInvested  = last.invested;
  const finalNominal   = last.nominal;
  const finalReal      = last.real;
  const finalIdleReal  = last.idleReal; // capitale fermo alla fine del periodo
  const totalGain      = finalNominal - totalInvested;
  const gainPct        = totalInvested > 0 ? (totalGain / totalInvested * 100) : 0;
  const multiplier     = totalInvested > 0 ? finalNominal / totalInvested : 1;
  const investVsIdle   = finalReal - finalIdleReal; // vantaggio reale dell'investimento vs liquidità
  const idleLoss       = totalInvested - finalIdleReal; // quanti € "bruciati" dalla liquidità ferma

  // Rendita
  const annualRendita       = finalNominal * withdrawalRate / 100;
  const monthlyRendita      = annualRendita / 12;
  const annualRenditaReal   = finalReal * withdrawalRate / 100;
  const monthlyRenditaReal  = annualRenditaReal / 12;

  // Milestone rows every 5 years
  const milestoneRows = useMemo(() => {
    return [5, 10, 15, 20, 25, 30].filter(y => y <= years).map(y => chartData[y]);
  }, [chartData, years]);

  const [targetRendita, setTargetRendita] = useState(1000);
  const [bankGrossReturn, setBankGrossReturn] = useState(4);

  // Scenari bidirenzionali: ETF (8% lordo − 0.20%) vs Banca con rendimento base diverso + 3 livelli di commissioni
  const SCENARIOS = useMemo(() => [
    {
      key: 'etf',
      label: `ETF (${annualReturn}% − 0.20% = ${(annualReturn - 0.20).toFixed(2)}% netto)`,
      netReturn: Math.max(0, annualReturn - 0.20),
      color: '#30D158',
      fee: 0.20,
    },
    {
      key: 'bank1',
      label: `Banca 1% (${bankGrossReturn}% − 1% = ${Math.max(0, bankGrossReturn - 1)}% netto)`,
      netReturn: Math.max(0, bankGrossReturn - 1),
      color: '#0A84FF',
      fee: 1,
    },
    {
      key: 'bank2',
      label: `Banca 2% (${bankGrossReturn}% − 2% = ${Math.max(0, bankGrossReturn - 2)}% netto)`,
      netReturn: Math.max(0, bankGrossReturn - 2),
      color: '#FF9F0A',
      fee: 2,
    },
    {
      key: 'bank3',
      label: `Banca 3% (${bankGrossReturn}% − 3% = ${Math.max(0, bankGrossReturn - 3)}% netto)`,
      netReturn: Math.max(0, bankGrossReturn - 3),
      color: '#FF453A',
      fee: 3,
    },
  ], [annualReturn, bankGrossReturn]);

  const neededCapital = useMemo(() =>
    targetRendita * 12 / (withdrawalRate / 100),
    [targetRendita, withdrawalRate]
  );

  const yearsToTarget = useMemo(() => {
    return SCENARIOS.map(s => {
      const r = s.netReturn / 100 / 12;
      for (let y = 1; y <= 70; y++) {
        const n = y * 12;
        const val = r === 0
          ? capitalInit + monthly * n
          : capitalInit * Math.pow(1 + r, n) + monthly * (Math.pow(1 + r, n) - 1) / r;
        if (val >= neededCapital) return y;
      }
      return null;
    });
  }, [SCENARIOS, capitalInit, monthly, neededCapital]);

  const feeData = useMemo(() => {
    return Array.from({ length: years + 1 }, (_, y) => {
      const n = y * 12;
      const invested = capitalInit + monthly * n;
      const row = { year: y, invested: Math.round(invested) };
      SCENARIOS.forEach(s => {
        const r = s.netReturn / 100 / 12;
        row[s.key] = r === 0
          ? Math.round(invested)
          : Math.round(capitalInit * Math.pow(1 + r, n) + monthly * (Math.pow(1 + r, n) - 1) / r);
      });
      return row;
    });
  }, [SCENARIOS, capitalInit, monthly, years]);

  const lastFee       = feeData[feeData.length - 1];
  const etfFinal      = lastFee.etf;
  const costScenarios = SCENARIOS.map(s => ({
    ...s,
    finalValue: lastFee[s.key],
    cost:       etfFinal - lastFee[s.key],
    costYears:  monthly > 0 ? ((etfFinal - lastFee[s.key]) / (monthly * 12)).toFixed(1) : '0',
  }));

  const presetActive = PAC_PRESETS.find(p => p.key === presetKey);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg, #30D158 0%, #0A84FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={18} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Calcolatore PAC — Interesse Composto</h2>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--analysis-dim)', margin: 0, maxWidth: 640 }}>
          Simula la crescita del tuo capitale con versamenti mensili e interesse composto.
          Calcola il valore reale dopo inflazione e la rendita sostenibile al termine del percorso.
        </p>
      </div>

      {/* ── HERO: ETF vs Polizza ─────────────────────────────────────────────── */}
      {(() => {
        const etfS   = costScenarios[0];
        const worstS = costScenarios[costScenarios.length - 1]; // bank3 (costo 3%)
        const etfYrs   = yearsToTarget[0];
        const worstYrs = yearsToTarget[yearsToTarget.length - 1];
        const deltaYrs = etfYrs != null && worstYrs != null ? worstYrs - etfYrs : null;
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 28 }}>
            {/* LEFT — bad */}
            <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg, rgba(255,69,58,0.10) 0%, rgba(255,159,10,0.06) 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#FF453A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>🏦 Banca / Polizza ({bankGrossReturn}% lordo − 3% commissioni)</div>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#FF453A', lineHeight: 1 }}>
                {worstYrs != null ? worstYrs : '—'}
                <span style={{ fontSize: '1.1rem', fontWeight: 600, marginLeft: 6 }}>anni</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--analysis-dim)', marginTop: 8, lineHeight: 1.5 }}>
                per raggiungere <strong style={{ color: 'var(--text-1)' }}>{fmtEurFull(targetRendita)}/mese</strong> di rendita
              </div>
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', marginBottom: 4 }}>Capitale finale dopo {years} anni</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FF453A', lineHeight: 1 }}>{fmtEur(worstS.finalValue)}</div>
                <div style={{ fontSize: '0.63rem', color: 'var(--analysis-dim)', marginTop: 3 }}>vs {fmtEur(etfS.finalValue)} con ETF</div>
              </div>
            </div>
            {/* RIGHT — good */}
            <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg, rgba(48,209,88,0.08) 0%, rgba(10,132,255,0.05) 100%)' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#30D158', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>📈 ETF ({annualReturn}% lordo − 0.20% TER = {(annualReturn - 0.20).toFixed(2)}% netto)</div>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#30D158', lineHeight: 1 }}>
                {etfYrs != null ? etfYrs : '—'}
                <span style={{ fontSize: '1.1rem', fontWeight: 600, marginLeft: 6 }}>anni</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--analysis-dim)', marginTop: 8, lineHeight: 1.5 }}>
                per raggiungere <strong style={{ color: 'var(--text-1)' }}>{fmtEurFull(targetRendita)}/mese</strong> di rendita
              </div>
              {deltaYrs != null && (
                <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(48,209,88,0.10)', border: '1px solid rgba(48,209,88,0.3)' }}>
                  <div style={{ fontSize: '0.65rem', color: '#30D158', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>✓ Vantaggio ETF</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#30D158', lineHeight: 1 }}>{deltaYrs} anni prima</div>
                  <div style={{ fontSize: '0.63rem', color: 'var(--analysis-dim)', marginTop: 3 }}>e {fmtEur(etfS.finalValue - worstS.finalValue)} in più nel portafoglio</div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>

        {/* LEFT — Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Capitale iniziale */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <label style={labelStyle}>Capitale iniziale</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.1rem', color: 'var(--analysis-dim)' }}>€</span>
              <input type="number" min={0} step={1000} value={capitalInit}
                onChange={e => setCapitalInit(Math.max(0, Number(e.target.value)))} style={inputStyle} />
            </div>
            <input type="range" min={0} max={500000} step={1000} value={capitalInit}
              onChange={e => setCapitalInit(Number(e.target.value))}
              style={{ width: '100%', marginTop: 8, accentColor: '#30D158' }} />
          </div>

          {/* Versamento mensile */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <label style={labelStyle}>Versamento mensile PAC</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.1rem', color: 'var(--analysis-dim)' }}>€</span>
              <input type="number" min={0} step={50} value={monthly}
                onChange={e => setMonthly(Math.max(0, Number(e.target.value)))} style={inputStyle} />
              <span style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', flexShrink: 0 }}>/mese</span>
            </div>
            <input type="range" min={0} max={5000} step={50} value={monthly}
              onChange={e => setMonthly(Number(e.target.value))}
              style={{ width: '100%', marginTop: 8, accentColor: '#30D158' }} />
          </div>

          {/* Periodo */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Orizzonte temporale</label>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>{years} anni</span>
            </div>
            <input type="range" min={1} max={40} step={1} value={years}
              onChange={e => setYears(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#BF5AF2' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--analysis-faint)', marginTop: 4 }}>
              <span>1 anno</span><span>40 anni</span>
            </div>
          </div>

          {/* Rendimento annuo */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <label style={labelStyle}>Rendimento annuo atteso</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {PAC_PRESETS.map(p => (
                <button key={p.key} onClick={() => setPresetKey(p.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 11px', borderRadius: 9, border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: presetKey === p.key ? 'rgba(48,209,88,0.12)' : 'var(--surface-2, rgba(255,255,255,0.04))',
                  outline: presetKey === p.key ? '1.5px solid rgba(48,209,88,0.5)' : '1px solid var(--border, rgba(255,255,255,0.08))',
                }}>
                  <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{p.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.77rem', fontWeight: presetKey === p.key ? 700 : 500, color: 'var(--text-1)' }}>{p.label}</div>
                    <div style={{ fontSize: '0.63rem', color: 'var(--analysis-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.note}</div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, flexShrink: 0, color: presetKey === p.key ? '#30D158' : 'var(--analysis-dim)' }}>{p.rate}%</span>
                </button>
              ))}
              <button onClick={() => setPresetKey('custom')} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 11px', borderRadius: 9, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: presetKey === 'custom' ? 'rgba(48,209,88,0.12)' : 'var(--surface-2, rgba(255,255,255,0.04))',
                outline: presetKey === 'custom' ? '1.5px solid rgba(48,209,88,0.5)' : '1px solid var(--border, rgba(255,255,255,0.08))',
              }}>
                <span style={{ fontSize: '0.9rem' }}>✏️</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.77rem', fontWeight: presetKey === 'custom' ? 700 : 500, color: 'var(--text-1)' }}>Personalizzato</div>
                  <div style={{ fontSize: '0.63rem', color: 'var(--analysis-dim)' }}>Imposta un rendimento personalizzato</div>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, flexShrink: 0, color: presetKey === 'custom' ? '#30D158' : 'var(--analysis-dim)' }}>{customReturn}%</span>
              </button>
              {presetKey === 'custom' && (
                <div style={{ padding: '8px 2px 2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--analysis-dim)', marginBottom: 5 }}>
                    <span>0%</span>
                    <span style={{ fontWeight: 700, color: '#30D158', fontSize: '0.85rem' }}>{customReturn}% / anno</span>
                    <span>20%</span>
                  </div>
                  <input type="range" min={0} max={20} step={0.5} value={customReturn}
                    onChange={e => setCustomReturn(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#30D158' }} />
                </div>
              )}
            </div>
          </div>

          {/* Rendimento lordo banca / polizza */}
          <div className="card" style={{ padding: '14px 16px', outline: '1.5px solid rgba(255,69,58,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>🏦 Rendimento lordo banca / polizza</label>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FF453A' }}>{bankGrossReturn}% lordo</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', marginBottom: 8 }}>
              I costi (1%, 2%, 3%) vengono sottratti da questo rendimento base
            </div>
            <input type="range" min={1} max={8} step={0.5} value={bankGrossReturn}
              onChange={e => setBankGrossReturn(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#FF453A' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--analysis-faint)', marginTop: 4 }}>
              <span>1%</span><span style={{ color: '#FF9F0A' }}>4% tipico</span><span>8%</span>
            </div>
          </div>

          {/* Inflazione */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Inflazione attesa</label>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FF9F0A' }}>{inflationRate}%</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', marginBottom: 8 }}>
              Per calcolare il valore reale (potere d'acquisto odierno)
            </div>
            <input type="range" min={0} max={10} step={0.1} value={inflationRate}
              onChange={e => setInflationRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#FF9F0A' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--analysis-faint)', marginTop: 4 }}>
              <span>0%</span><span style={{ color: '#FF9F0A' }}>BCE 2%</span><span>10%</span>
            </div>
          </div>

          {/* Tasso di prelievo */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Tasso di prelievo (rendita)</label>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#BF5AF2' }}>{withdrawalRate}%</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', marginBottom: 8 }}>
              % del capitale prelevato ogni anno (Safe Withdrawal Rate)
            </div>
            <input type="range" min={1} max={8} step={0.5} value={withdrawalRate}
              onChange={e => setWithdrawalRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#BF5AF2' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--analysis-faint)', marginTop: 4 }}>
              <span>1% (prudente)</span><span style={{ color: '#BF5AF2' }}>4% (Trinity)</span><span>8%</span>
            </div>
          </div>

          {/* Obiettivo rendita mensile */}
          <div className="card" style={{ padding: '14px 16px', outline: '1.5px solid rgba(48,209,88,0.35)' }}>
            <label style={labelStyle}>🎯 Obiettivo rendita mensile</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.1rem', color: 'var(--analysis-dim)' }}>€</span>
              <input type="number" min={100} step={100} value={targetRendita}
                onChange={e => setTargetRendita(Math.max(100, Number(e.target.value)))} style={inputStyle} />
              <span style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', flexShrink: 0 }}>/mese</span>
            </div>
            <input type="range" min={100} max={10000} step={100} value={targetRendita}
              onChange={e => setTargetRendita(Number(e.target.value))}
              style={{ width: '100%', marginTop: 8, accentColor: '#30D158' }} />
            <div style={{ fontSize: '0.63rem', color: 'var(--analysis-dim)', marginTop: 6 }}>
              Capitale necessario: <strong style={{ color: 'var(--text-1)' }}>{fmtEur(neededCapital)}</strong> (regola {withdrawalRate}%)
            </div>
          </div>
        </div>

        {/* RIGHT — Charts + Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Fee comparison chart — top */}
          <div className="card" style={{ padding: '16px 18px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                ETF {annualReturn}% vs Banca {bankGrossReturn}% — capitale accumulato con diversi costi annui
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: '0.68rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {SCENARIOS.map(s => (
                  <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ display: 'inline-block', width: 14, height: 3, background: s.color, borderRadius: 2 }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={feeData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  {SCENARIOS.map(s => (
                    <linearGradient key={s.key} id={`gFeeTop_${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--analysis-dim)' }}
                  tickFormatter={y => y === 0 ? 'Oggi' : `${y}a`} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--analysis-dim)' }}
                  tickFormatter={v => fmtEur(v)} tickLine={false} axisLine={false} width={72} />
                <Tooltip content={<FeeTooltip withdrawalRate={withdrawalRate} targetRendita={targetRendita} scenarios={SCENARIOS} />} />
                <Area type="monotone" dataKey="invested" stroke="rgba(150,150,160,0.5)" strokeWidth={1}
                  strokeDasharray="5 3" fill="none" dot={false} />
                {[...SCENARIOS].reverse().map(s => (
                  <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color}
                    strokeWidth={s.key === 'etf' ? 2.5 : 1.8}
                    fill={`url(#gFeeTop_${s.key})`} dot={false} activeDot={{ r: 4 }} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Anni per raggiungere l'obiettivo */}
          <div className="card" style={{ padding: '16px 18px', background: 'linear-gradient(135deg, rgba(48,209,88,0.06) 0%, rgba(10,132,255,0.04) 100%)', outline: '1.5px solid rgba(48,209,88,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: '1.1rem' }}>🎯</span>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                  Anni per raggiungere <span style={{ color: '#30D158' }}>{fmtEurFull(targetRendita)}/mese</span> di rendita
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', marginTop: 1 }}>
                  Capitale necessario: {fmtEur(neededCapital)} — regola {withdrawalRate}%/anno
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {SCENARIOS.map((s, i) => {
                const yrs = yearsToTarget[i];
                const etfYrs = yearsToTarget[0];
                const delta = yrs != null && etfYrs != null && s.key !== 'etf' ? yrs - etfYrs : null;
                const capitalAfterYears = costScenarios[i]?.finalValue ?? 0;
                const etfCapital = costScenarios[0]?.finalValue ?? 0;
                const capitalDelta = s.key !== 'etf' ? etfCapital - capitalAfterYears : null;
                return (
                  <div key={s.key} style={{ padding: '16px 18px', borderRadius: 12, background: s.key === 'etf' ? 'rgba(48,209,88,0.08)' : 'rgba(255,69,58,0.06)', border: `1.5px solid ${s.color}30`, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{s.label}</div>

                    {/* Capitale dopo years anni */}
                    <div style={{ marginBottom: 12, padding: '8px 10px', borderRadius: 9, background: s.key === 'etf' ? 'rgba(48,209,88,0.10)' : 'rgba(255,255,255,0.04)', border: `1px solid ${s.color}20` }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--analysis-dim)', marginBottom: 3 }}>Capitale dopo {years} anni</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{fmtEur(capitalAfterYears)}</div>
                      {capitalDelta != null && capitalDelta > 0 && (
                        <div style={{ fontSize: '0.62rem', color: '#FF453A', marginTop: 3 }}>−{fmtEur(capitalDelta)} vs ETF</div>
                      )}
                    </div>

                    {/* Anni per rendita */}
                    {yrs != null ? (
                      <>
                        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{yrs}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', marginTop: 3 }}>anni per {fmtEurFull(targetRendita)}/mese</div>
                        {delta != null && (
                          <div style={{ marginTop: 8, padding: '5px 8px', borderRadius: 7, background: 'rgba(255,69,58,0.10)', border: '1px solid rgba(255,69,58,0.25)', fontSize: '0.7rem', fontWeight: 700, color: '#FF453A' }}>
                            +{delta} anni in più rispetto all'ETF
                          </div>
                        )}
                        {s.key === 'etf' && (
                          <div style={{ marginTop: 8, padding: '5px 8px', borderRadius: 7, background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.3)', fontSize: '0.7rem', fontWeight: 700, color: '#30D158' }}>
                            ✓ Il percorso più rapido
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '2rem', color: '#FF453A', lineHeight: 1, marginTop: 6 }}>∞</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--analysis-dim)', marginTop: 3 }}>non raggiungibile in 70 anni</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {yearsToTarget[0] != null && yearsToTarget[yearsToTarget.length - 1] != null && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 9, background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)', fontSize: '0.72rem', color: 'var(--text-1)', lineHeight: 1.6 }}>
                🚀 <strong style={{ color: '#30D158' }}>Con gli ETF raggiungi {fmtEurFull(targetRendita)}/mese {yearsToTarget[yearsToTarget.length - 1] - yearsToTarget[0]} anni prima</strong> rispetto a un prodotto bancario con 3% di commissioni — grazie a {annualReturn}% di rendimento e soli 0.20% di costi.
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCOLATORE 3 — SIMULATORE RENDITA (wizard step-by-step)
// ─────────────────────────────────────────────────────────────────────────────

// Math helpers
function calcFV(annualRate, capitalInit, pmt, months) {
  const r = annualRate / 100 / 12;
  if (r === 0) return capitalInit + pmt * months;
  return capitalInit * Math.pow(1 + r, months)
       + pmt * (Math.pow(1 + r, months) - 1) / r;
}
function calcPMT(annualRate, capitalInit, targetFV, months) {
  const r = annualRate / 100 / 12;
  if (months <= 0) return 0;
  const factor = Math.pow(1 + r, months);
  if (r === 0) return Math.max(0, (targetFV - capitalInit) / months);
  const residual = targetFV - capitalInit * factor;
  return Math.max(0, residual * r / (factor - 1));
}
function monthlyRendita(capital, withdrawalPct) {
  return capital * (withdrawalPct / 100) / 12;
}

function RenditaTooltip({ active, payload, label, targetCap }) {
  if (!active || !payload?.length) return null;
  const etf    = payload.find(p => p.dataKey === 'etf')?.value ?? 0;
  const banche = payload.find(p => p.dataKey === 'banche')?.value ?? 0;
  const quo    = payload.find(p => p.dataKey === 'quo')?.value ?? 0;
  return (
    <div style={{
      background: 'var(--surface-1,#1c1c1e)', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10, padding: '10px 14px', fontSize: '0.78rem', minWidth: 220,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-1)' }}>Anno {label}</div>
      {[
        { label: '📈 ETF autonomo', value: etf,    color: '#30D158' },
        { label: '🏦 Banche',       value: banche, color: '#0A84FF' },
        { label: '😴 Status quo',   value: quo,    color: '#8E8E93' },
      ].map(r => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
          <span style={{ color: r.color }}>{r.label}</span>
          <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{fmtEur(r.value)}</span>
        </div>
      ))}
      {targetCap > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 6, paddingTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ color: '#FF9F0A' }}>Obiettivo</span>
            <span style={{ fontWeight: 700, color: '#FF9F0A' }}>{fmtEur(targetCap)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Wizard step shell ─────────────────────────────────────────────────────────
const STEP_META = [
  { emoji: '💰', color: '#BF5AF2', question: 'Qual è la rendita mensile che vorresti raggiungere?' },
  { emoji: '⏰', color: '#FF9F0A', question: 'In quanti anni vuoi arrivarci?' },
  { emoji: '🏦', color: '#0A84FF', question: 'Hai già del capitale da investire?' },
  { emoji: '📅', color: '#30D158', question: 'Riesci a mettere da parte qualcosa ogni mese?' },
];

function Pill({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: 30, border: 'none', cursor: 'pointer',
      fontSize: '0.88rem', fontWeight: active ? 700 : 500,
      background: active ? color : 'var(--surface-2)',
      color: active ? '#fff' : 'var(--text-2)',
      outline: active ? 'none' : '1px solid var(--border)',
      transition: 'all 0.15s',
      boxShadow: active ? `0 2px 12px ${color}55` : 'none',
    }}>{label}</button>
  );
}

function RenditaCalc() {
  // ── Wizard state ─────────────────────────────────────────────────────────
  const [step,           setStep]           = useState(0);   // 0-3 = wizard, 4 = results
  const [visible,        setVisible]        = useState(true);

  // ── Inputs — sempre tutti e 4 raccolti dal wizard ────────────────────────
  const [targetRendita,  setTargetRendita]  = useState(1000);  // €/mese
  const [years,          setYears]          = useState(20);
  const [hasCapital,     setHasCapital]     = useState('no');
  const [capitalInit,    setCapitalInit]    = useState(0);
  const [monthlyInput,   setMonthlyInput]   = useState(300);   // sempre presente, può essere 0
  const [withdrawalRate, setWithdrawalRate] = useState(4);
  const [rateBanche,     setRateBanche]     = useState(3);     // netto dopo costi gestione 2-3%
  const [rateETF,        setRateETF]        = useState(8);
  const [inflation,      setInflation]      = useState(2);     // per erosione potere d'acquisto
  const [showAdvanced,   setShowAdvanced]   = useState(false);
  const [showChart,      setShowChart]      = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────
  const targetCapitale = (targetRendita * 12) / (withdrawalRate / 100);
  const months  = years * 12;
  const capInit = hasCapital === 'yes' ? capitalInit : 0;

  // FV con gli stessi input in tutti e 3 gli scenari
  const fvETF    = useMemo(() => calcFV(rateETF,   capInit, monthlyInput, months), [rateETF,   capInit, monthlyInput, months]);
  const fvBanche = useMemo(() => calcFV(rateBanche, capInit, monthlyInput, months), [rateBanche, capInit, monthlyInput, months]);
  // Status quo = 0%: accumulo nominale senza crescita + erosione inflazione
  const fvNominale = capInit + monthlyInput * months;
  const inflFactor = Math.pow(1 + inflation / 100, years);
  const fvQuo      = fvNominale / inflFactor;   // valore reale in euro di oggi

  // PMT necessaria per arrivare all'obiettivo (ETF)
  const pmtETF    = useMemo(() => calcPMT(rateETF,    capInit, targetCapitale, months), [rateETF,    capInit, targetCapitale, months]);
  const pmtBanche = useMemo(() => calcPMT(rateBanche, capInit, targetCapitale, months), [rateBanche, capInit, targetCapitale, months]);

  // ── Wizard navigation ─────────────────────────────────────────────────────
  const goTo = (nextStep) => {
    setVisible(false);
    setTimeout(() => { setStep(nextStep); setVisible(true); }, 180);
  };
  const goNext = () => goTo(step + 1);
  const goBack = () => goTo(step - 1);
  const restart = () => { setStep(0); setVisible(true); };

  // ── Chart data ────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const data = [];
    for (let y = 0; y <= years; y++) {
      const m = y * 12;
      const nominal = capInit + monthlyInput * m;
      const iF = Math.pow(1 + inflation / 100, y);
      data.push({
        year: y,
        etf:    Math.round(calcFV(rateETF,    capInit, monthlyInput, m)),
        banche: Math.round(calcFV(rateBanche, capInit, monthlyInput, m)),
        quo:    Math.round(nominal / iF),
      });
    }
    return data;
  }, [years, rateETF, rateBanche, inflation, capInit, monthlyInput]);

  // ── Delay table (ETF) ─────────────────────────────────────────────────────
  const delayRows = useMemo(() => [0, 1, 2, 3].map(delay => {
    const yLeft = Math.max(1, years - delay);
    const mLeft = yLeft * 12;
    const etf    = calcPMT(rateETF,    capInit, targetCapitale, mLeft);
    const banche = calcPMT(rateBanche, capInit, targetCapitale, mLeft);
    return { delay, etf, banche, etfExtra: etf - pmtETF, bancheExtra: banche - pmtBanche };
  }), [years, rateETF, rateBanche, capInit, targetCapitale, pmtETF, pmtBanche]);

  // ── Step meta ─────────────────────────────────────────────────────────────
  const stepColor = ['#BF5AF2', '#FF9F0A', '#0A84FF', '#30D158'][Math.min(step, 3)];

  // ── ScenarioCard — stessi input, rendimenti diversi ─────────────────────
  // fvVal  = capitale accumulato in N anni (calcolato fuori)
  // pmtNeeded = solo per ETF, rata per centrare l'obiettivo
  // rateLabel = stringa descrittiva del tasso
  const ScenarioCard = ({ emoji, label, rateLabel, fvVal, pmtNeeded, color, best, note }) => {
    const rendita = monthlyRendita(fvVal, withdrawalRate);
    const gap     = rendita - targetRendita;          // >0 = supera, <0 = manca
    const onTrack = gap >= 0;
    return (
      <div style={{
        flex: 1, minWidth: 200, borderRadius: 16, padding: '18px 16px',
        background: best ? `linear-gradient(135deg, ${color}18, ${color}06)` : 'var(--surface-2)',
        border: `1.5px solid ${best ? color : 'var(--border)'}`,
        display: 'flex', flexDirection: 'column', gap: 0,
        position: 'relative', overflow: 'hidden',
      }}>
        {best && (
          <div style={{
            position: 'absolute', top: 0, right: 0,
            background: color, color: '#fff', fontSize: '0.6rem', fontWeight: 800,
            padding: '3px 10px', borderBottomLeftRadius: 10, letterSpacing: '0.06em',
          }}>MIGLIORE</div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: '1.4rem' }}>{emoji}</span>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: '0.67rem', color: 'var(--text-3)' }}>{rateLabel}</div>
          </div>
        </div>

        {/* Capitale accumulato */}
        <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: 2 }}>
          Capitale accumulato in {years} anni
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color, lineHeight: 1, marginBottom: 10 }}>
          {fmtEur(fvVal)}
        </div>

        {/* Rendita e gap */}
        <div style={{
          padding: '10px 12px', borderRadius: 10,
          background: onTrack ? `${color}14` : 'rgba(255,159,10,0.08)',
          border: `1px solid ${onTrack ? color + '30' : 'rgba(255,159,10,0.25)'}`,
          marginBottom: pmtNeeded ? 10 : 0,
        }}>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: 3 }}>
            Rendita mensile ({withdrawalRate}% SWR)
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: onTrack ? color : '#FF9F0A', lineHeight: 1 }}>
            {fmtEur(rendita)}/mese
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, marginTop: 5,
            color: onTrack ? '#30D158' : '#FF453A' }}>
            {onTrack
              ? `✓ +${fmtEur(gap)}/mese sopra obiettivo`
              : `✗ mancano ${fmtEur(Math.abs(gap))}/mese`}
          </div>
        </div>

        {/* Solo ETF: rata necessaria per centrare l'obiettivo */}
        {pmtNeeded != null && (
          <div style={{
            padding: '8px 12px', borderRadius: 10,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: 2 }}>
              Per centrare esattamente {fmtEur(targetRendita)}/mese
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color }}>
              {pmtNeeded > 100000 ? 'Orizzonte troppo breve' : `${fmtEur(pmtNeeded)}/mese`}
            </div>
            {pmtNeeded <= 100000 && (
              <div style={{ fontSize: '0.65rem', color: monthlyInput >= pmtNeeded ? '#30D158' : '#FF9F0A', fontWeight: 600, marginTop: 3 }}>
                {monthlyInput >= pmtNeeded
                  ? `✓ Stai già versando abbastanza`
                  : `Stai versando ${fmtEur(pmtNeeded - monthlyInput)}/mese in meno`}
              </div>
            )}
          </div>
        )}

        {/* Note (es. inflazione) */}
        {note && (
          <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: 8 }}>{note}</div>
        )}
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER — wizard steps 0-3, results step 4
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── WIZARD (steps 0-3) ──────────────────────────────────────────────── */}
      {step < 4 && (
        <div style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
          maxWidth: 540, margin: '0 auto',
        }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 36 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                height: 6, borderRadius: 3,
                width: i === step ? 28 : 8,
                background: i <= step ? stepColor : 'var(--border)',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>

          {/* Step 0 — Rendita target */}
          {step === 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>💰</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px', lineHeight: 1.2 }}>
                Qual è la rendita mensile<br/>che vorresti raggiungere?
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', margin: '0 0 32px' }}>
                La cifra netta che vorresti avere ogni mese senza lavorare
              </p>

              {/* Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
                {[500, 1000, 1500, 2000, 3000, 5000].map(v => (
                  <Pill key={v} label={`€${v.toLocaleString('it')}/mese`} active={targetRendita === v}
                    color="#BF5AF2" onClick={() => setTargetRendita(v)} />
                ))}
              </div>

              {/* Custom input */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: '1.2rem', color: 'var(--text-3)' }}>€</span>
                  <input type="number" min={100} step={100} value={targetRendita}
                    onChange={e => setTargetRendita(Math.max(100, Number(e.target.value)))}
                    style={{ ...inputStyle, width: 120, textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>/mese</span>
                </div>
                <input type="range" min={100} max={10000} step={100} value={targetRendita}
                  onChange={e => setTargetRendita(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#BF5AF2' }} />
              </div>

              {/* Capital callout */}
              <div style={{
                padding: '12px 16px', borderRadius: 12,
                background: 'rgba(191,90,242,0.08)', border: '1px solid rgba(191,90,242,0.2)',
                fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: 32,
              }}>
                Servirà un capitale di circa{' '}
                <strong style={{ color: '#BF5AF2', fontSize: '1rem' }}>{fmtEurFull(targetCapitale)}</strong>
                <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}> (regola del 4%)</span>
              </div>

              <button onClick={goNext} style={{
                padding: '14px 40px', borderRadius: 50, border: 'none', cursor: 'pointer',
                background: '#BF5AF2', color: '#fff', fontSize: '0.95rem', fontWeight: 700,
                boxShadow: '0 4px 20px rgba(191,90,242,0.45)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}>Avanti →</button>
            </div>
          )}

          {/* Step 1 — Anni */}
          {step === 1 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>⏰</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px', lineHeight: 1.2 }}>
                In quanti anni vuoi<br/>raggiungere questo obiettivo?
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', margin: '0 0 32px' }}>
                Il tuo orizzonte temporale di investimento
              </p>

              {/* Big year display */}
              <div style={{
                fontSize: '5rem', fontWeight: 900, color: '#FF9F0A', lineHeight: 1,
                marginBottom: 8,
                textShadow: '0 0 40px rgba(255,159,10,0.4)',
              }}>{years}</div>
              <div style={{ fontSize: '1rem', color: 'var(--text-3)', marginBottom: 28 }}>
                {years === 1 ? 'anno' : 'anni'}
              </div>

              {/* Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
                {[10, 15, 20, 25, 30, 40].map(v => (
                  <Pill key={v} label={`${v} anni`} active={years === v}
                    color="#FF9F0A" onClick={() => setYears(v)} />
                ))}
              </div>

              <input type="range" min={1} max={40} step={1} value={years}
                onChange={e => setYears(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#FF9F0A', marginBottom: 32 }} />

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={goBack} style={{
                  padding: '14px 28px', borderRadius: 50, border: '1px solid var(--border)',
                  cursor: 'pointer', background: 'transparent', color: 'var(--text-2)',
                  fontSize: '0.9rem', fontWeight: 600,
                }}>← Indietro</button>
                <button onClick={goNext} style={{
                  padding: '14px 40px', borderRadius: 50, border: 'none', cursor: 'pointer',
                  background: '#FF9F0A', color: '#fff', fontSize: '0.95rem', fontWeight: 700,
                  boxShadow: '0 4px 20px rgba(255,159,10,0.45)',
                }}>Avanti →</button>
              </div>
            </div>
          )}

          {/* Step 2 — Capitale iniziale */}
          {step === 2 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>🏦</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px', lineHeight: 1.2 }}>
                Hai già del capitale<br/>da investire?
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', margin: '0 0 32px' }}>
                Un capitale iniziale riduce significativamente la rata mensile necessaria
              </p>

              {/* Radio choice */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 28 }}>
                {[
                  { key: 'no',  label: '🚀 Parto da zero' },
                  { key: 'yes', label: '💼 Ho già...' },
                ].map(o => (
                  <button key={o.key} onClick={() => setHasCapital(o.key)} style={{
                    padding: '14px 28px', borderRadius: 50, border: 'none', cursor: 'pointer',
                    fontSize: '0.9rem', fontWeight: hasCapital === o.key ? 700 : 500,
                    background: hasCapital === o.key ? '#0A84FF' : 'var(--surface-2)',
                    color: hasCapital === o.key ? '#fff' : 'var(--text-2)',
                    outline: hasCapital === o.key ? 'none' : '1px solid var(--border)',
                    boxShadow: hasCapital === o.key ? '0 4px 20px rgba(10,132,255,0.4)' : 'none',
                    transition: 'all 0.2s',
                  }}>{o.label}</button>
                ))}
              </div>

              {hasCapital === 'yes' && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: '1.2rem', color: 'var(--text-3)' }}>€</span>
                    <input type="number" min={0} step={1000} value={capitalInit}
                      onChange={e => setCapitalInit(Math.max(0, Number(e.target.value)))}
                      style={{ ...inputStyle, width: 140, textAlign: 'center', fontSize: '1.2rem', fontWeight: 700 }} />
                  </div>
                  <input type="range" min={0} max={500000} step={1000} value={capitalInit}
                    onChange={e => setCapitalInit(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#0A84FF' }} />
                  <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-3)' }}>
                    Con {fmtEurFull(capitalInit)} di partenza già investiti
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
                <button onClick={goBack} style={{
                  padding: '14px 28px', borderRadius: 50, border: '1px solid var(--border)',
                  cursor: 'pointer', background: 'transparent', color: 'var(--text-2)',
                  fontSize: '0.9rem', fontWeight: 600,
                }}>← Indietro</button>
                <button onClick={goNext} style={{
                  padding: '14px 40px', borderRadius: 50, border: 'none', cursor: 'pointer',
                  background: '#0A84FF', color: '#fff', fontSize: '0.95rem', fontWeight: 700,
                  boxShadow: '0 4px 20px rgba(10,132,255,0.45)',
                }}>Avanti →</button>
              </div>
            </div>
          )}

          {/* Step 3 — Versamento mensile */}
          {step === 3 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>📅</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px', lineHeight: 1.2 }}>
                Quanto puoi mettere<br/>da parte ogni mese?
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', margin: '0 0 28px' }}>
                Con questi soldi confronteremo i 3 scenari. Puoi inserire anche €0 se non sai ancora.
              </p>

              {/* Big amount display */}
              <div style={{
                fontSize: '4rem', fontWeight: 900, color: '#30D158', lineHeight: 1,
                marginBottom: 6, textShadow: '0 0 40px rgba(48,209,88,0.35)',
              }}>
                {monthlyInput === 0 ? '—' : `€${monthlyInput.toLocaleString('it')}`}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 24 }}>
                {monthlyInput === 0 ? 'nessun versamento mensile' : 'al mese'}
              </div>

              {/* Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {[0, 100, 200, 300, 500, 800, 1000, 1500].map(v => (
                  <Pill key={v} label={v === 0 ? '€0 / Non verso' : `€${v}`}
                    active={monthlyInput === v} color="#30D158" onClick={() => setMonthlyInput(v)} />
                ))}
              </div>

              <input type="range" min={0} max={5000} step={50} value={monthlyInput}
                onChange={e => setMonthlyInput(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#30D158', marginBottom: 28 }} />

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={goBack} style={{
                  padding: '14px 28px', borderRadius: 50, border: '1px solid var(--border)',
                  cursor: 'pointer', background: 'transparent', color: 'var(--text-2)',
                  fontSize: '0.9rem', fontWeight: 600,
                }}>← Indietro</button>
                <button onClick={goNext} style={{
                  padding: '14px 40px', borderRadius: 50, border: 'none', cursor: 'pointer',
                  background: '#30D158', color: '#fff', fontSize: '0.95rem', fontWeight: 700,
                  boxShadow: '0 4px 20px rgba(48,209,88,0.45)',
                }}>Scopri i risultati 🎯</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS (step 4) ────────────────────────────────────────────────── */}
      {step === 4 && (
        <div style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
        }}>
          {/* Summary bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            padding: '12px 16px', borderRadius: 12,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            marginBottom: 24, fontSize: '0.78rem', color: 'var(--text-2)',
          }}>
            <span style={{ fontWeight: 700 }}>🎯 {fmtEur(targetRendita)}/mese</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>⏰ {years} anni</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>🏦 {hasCapital === 'yes' ? fmtEurFull(capitalInit) : 'da zero'}</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>📅 {monthlyInput > 0 ? `${fmtEur(monthlyInput)}/mese` : 'nessun versamento'}</span>
            <button onClick={restart} style={{
              marginLeft: 'auto', padding: '5px 14px', borderRadius: 20, border: 'none',
              cursor: 'pointer', background: 'var(--surface-3)', color: 'var(--text-2)',
              fontSize: '0.75rem', fontWeight: 600,
            }}>← Ricomincia</button>
          </div>

          {/* Headline */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 6 }}>
              Per raggiungere {fmtEur(targetRendita)}/mese in {years} anni ti serve un capitale di
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#BF5AF2', lineHeight: 1 }}>
              {fmtEurFull(targetCapitale)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>
              calcolato con la regola del {withdrawalRate}% (Safe Withdrawal Rate)
            </div>
          </div>

          {/* 3 scenario cards — stessi input, rendimenti diversi */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <ScenarioCard
              emoji="😴" label="Status quo" best={false} color="#8E8E93"
              rateLabel={`0% reale — inflazione ${inflation}% erode i risparmi`}
              fvVal={fvQuo}
              note={`Capitale nominale accumulato: ${fmtEur(fvNominale)} → valore reale: ${fmtEur(fvQuo)}`}
            />
            <ScenarioCard
              emoji="🏦" label="Banche / fondi" best={false} color="#0A84FF"
              rateLabel={`${rateBanche}% netto (dopo commissioni gestione 2-3%)`}
              fvVal={fvBanche}
            />
            <ScenarioCard
              emoji="📈" label="ETF in autonomia" best={true} color="#30D158"
              rateLabel={`${rateETF}% medio storico mercato globale`}
              fvVal={fvETF}
              pmtNeeded={pmtETF}
            />
          </div>

          {/* Insight callout — vantaggio ETF */}
          <div style={{
            padding: '16px 20px', borderRadius: 14,
            background: 'rgba(48,209,88,0.07)', border: '1px solid rgba(48,209,88,0.25)',
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14, marginBottom: 20,
          }}>
            <div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>ETF vs Banche — capitale in più</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#30D158' }}>{fmtEur(fvETF - fvBanche)}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>di capitale accumulato in più</div>
            </div>
            <div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Rendita extra mensile</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#30D158' }}>+{fmtEur(monthlyRendita(fvETF - fvBanche, withdrawalRate))}/mese</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>in più rispetto alle banche</div>
            </div>
            <div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>ETF vs Status quo — capitale extra</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#BF5AF2' }}>{fmtEur(fvETF - fvQuo)}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>vs lasciare i soldi fermi</div>
            </div>
          </div>

          {/* Costo dell'attesa */}
          <div className="card" style={{ padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 4 }}>⏰ Costo dell'attesa</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--analysis-dim)', marginBottom: 14 }}>
              Ogni anno che aspetti aumenta la rata mensile necessaria per raggiungere lo stesso obiettivo.
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr 1fr',
              fontSize: '0.62rem', fontWeight: 700, color: 'var(--analysis-faint)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              borderBottom: '1.5px solid var(--border)', paddingBottom: 7, marginBottom: 4,
            }}>
              <span>Ritardo</span>
              <span style={{ textAlign: 'right', color: '#30D158' }}>ETF rata</span>
              <span style={{ textAlign: 'right', color: '#30D158' }}>ETF extra</span>
              <span style={{ textAlign: 'right', color: '#0A84FF' }}>Banche rata</span>
              <span style={{ textAlign: 'right', color: '#0A84FF' }}>Banche extra</span>
            </div>
            {delayRows.map((row, i) => (
              <div key={row.delay} style={{
                display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr 1fr',
                padding: '7px 0', borderBottom: i < delayRows.length - 1 ? '1px solid var(--border)' : 'none',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: row.delay === 0 ? 700 : 400, color: row.delay === 0 ? '#30D158' : 'var(--text-2)' }}>
                  {row.delay === 0 ? '▶ Ora' : `+${row.delay} ${row.delay === 1 ? 'anno' : 'anni'}`}
                </span>
                <span style={{ textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, color: '#30D158' }}>{fmtEur(row.etf)}/m</span>
                <span style={{ textAlign: 'right', fontSize: '0.75rem', color: row.etfExtra > 0 ? '#FF453A' : 'var(--text-3)' }}>
                  {row.etfExtra > 0 ? `+${fmtEur(row.etfExtra)}/m` : '—'}
                </span>
                <span style={{ textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, color: '#0A84FF' }}>{fmtEur(row.banche)}/m</span>
                <span style={{ textAlign: 'right', fontSize: '0.75rem', color: row.bancheExtra > 0 ? '#FF453A' : 'var(--text-3)' }}>
                  {row.bancheExtra > 0 ? `+${fmtEur(row.bancheExtra)}/m` : '—'}
                </span>
              </div>
            ))}
          </div>

          {/* Toggle: Chart */}
          <div className="card" style={{ padding: '14px 18px', marginBottom: 12 }}>
            <button onClick={() => setShowChart(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: 'var(--text-1)', fontSize: '0.85rem', fontWeight: 700,
            }}>
              <span>📊 Grafico traiettorie</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                {showChart ? '▲ Nascondi' : '▼ Mostra'}
              </span>
            </button>
            {showChart && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 14, marginBottom: 12, fontSize: '0.68rem' }}>
                  {[
                    { color: '#30D158', label: `ETF ${rateETF}%` },
                    { color: '#0A84FF', label: `Banche ${rateBanche}%` },
                    { color: '#8E8E93', label: `Status quo (inflaz. ${inflation}%)` },
                  ].map(l => (
                    <span key={l.label}>
                      <span style={{ display: 'inline-block', width: 10, height: 3, background: l.color, borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />
                      {l.label}
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRETF2"    x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#30D158" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#30D158" stopOpacity={0.03} />
                      </linearGradient>
                      <linearGradient id="gRBanche2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.20} />
                        <stop offset="100%" stopColor="#0A84FF" stopOpacity={0.03} />
                      </linearGradient>
                      <linearGradient id="gRQuo2"    x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8E8E93" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#8E8E93" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--analysis-dim)' }}
                      tickFormatter={y => y === 0 ? 'Oggi' : `${y}a`} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--analysis-dim)' }}
                      tickFormatter={v => fmtEur(v)} tickLine={false} axisLine={false} width={72} />
                    <Tooltip content={<RenditaTooltip targetCap={targetCapitale} />} />
                    <ReferenceLine y={targetCapitale} stroke="#FF9F0A" strokeDasharray="5 4" strokeWidth={1.5}
                      label={{ value: `Obiettivo ${fmtEur(targetCapitale)}`, position: 'insideTopRight', fontSize: 10, fill: '#FF9F0A' }} />
                    <Area type="monotone" dataKey="quo"    stroke="#8E8E93" strokeWidth={1.5} fill="url(#gRQuo2)"    dot={false} activeDot={{ r: 3 }} />
                    <Area type="monotone" dataKey="banche" stroke="#0A84FF" strokeWidth={2}   fill="url(#gRBanche2)" dot={false} activeDot={{ r: 4 }} />
                    <Area type="monotone" dataKey="etf"    stroke="#30D158" strokeWidth={2.5} fill="url(#gRETF2)"    dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Toggle: Advanced rates */}
          <div className="card" style={{ padding: '14px 18px' }}>
            <button onClick={() => setShowAdvanced(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: 'var(--text-1)', fontSize: '0.85rem', fontWeight: 700,
            }}>
              <span>⚙️ Modifica rendimenti e SWR</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                {showAdvanced ? '▲ Nascondi' : '▼ Mostra'}
              </span>
            </button>
            {showAdvanced && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: '📈 ETF autonomo',          value: rateETF,        set: setRateETF,        color: '#30D158', min: 1,   max: 20, step: 0.5 },
                  { label: '🏦 Banche / fondi (netto)', value: rateBanche,     set: setRateBanche,     color: '#0A84FF', min: 0.5, max: 10, step: 0.5 },
                  { label: '📉 Inflazione (status quo)', value: inflation,     set: setInflation,      color: '#8E8E93', min: 0,   max: 6,  step: 0.5 },
                  { label: '💧 Tasso prelievo (SWR)',    value: withdrawalRate, set: setWithdrawalRate, color: '#FF9F0A', min: 2,   max: 6,  step: 0.5 },
                ].map(r => (
                  <div key={r.label} style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{r.label}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: r.color }}>{r.value}%</span>
                    </div>
                    <input type="range" min={r.min} max={r.max} step={r.step} value={r.value}
                      onChange={e => r.set(Number(e.target.value))}
                      style={{ width: '100%', accentColor: r.color }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Calculator registry
// ─────────────────────────────────────────────────────────────────────────────
const CALCULATORS = [
  {
    key:       'inflazione',
    icon:      '🔥',
    label:     'Inflazione',
    desc:      "Erosione del potere d'acquisto nel tempo",
    color:     'linear-gradient(135deg, #FF9F0A, #FF453A)',
    shadowColor: 'rgba(255,159,10,0.30)',
    component: InflazioneCalc,
  },
  {
    key:       'pac',
    icon:      '📈',
    label:     'PAC & Interesse Composto',
    desc:      'Simula crescita, inflazione e rendita finale',
    color:     'linear-gradient(135deg, #30D158, #0A84FF)',
    shadowColor: 'rgba(48,209,88,0.28)',
    component: PACCalc,
  },
  {
    key:       'rendita',
    icon:      '🎯',
    label:     'Simulatore Rendita',
    desc:      'ETF vs banche vs status quo — costo dell\'attesa',
    color:     'linear-gradient(135deg, #BF5AF2, #FF9F0A)',
    shadowColor: 'rgba(191,90,242,0.30)',
    component: RenditaCalc,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────────────────────────────────────
export default function Calcolatori() {
  const [active, setActive] = useState('inflazione');
  const ActiveCalc = CALCULATORS.find(c => c.key === active)?.component ?? null;

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Calculator size={20} style={{ color: '#0A84FF' }} />
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>Calcolatori</h1>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--analysis-dim)', margin: 0 }}>
          Strumenti di simulazione per capire meglio il tuo denaro nel tempo.
        </p>
      </div>

      {/* Calculator selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        {CALCULATORS.map(c => {
          const isActive = active === c.key;
          return (
            <button key={c.key} onClick={() => setActive(c.key)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 18px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: isActive ? c.color : 'var(--surface-2, rgba(255,255,255,0.06))',
              outline: isActive ? 'none' : '1px solid var(--border, rgba(255,255,255,0.1))',
              boxShadow: isActive ? `0 4px 20px ${c.shadowColor}` : 'none',
              transform: isActive ? 'translateY(-1px)' : 'none',
              transition: 'all 0.18s',
            }}>
              <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>{c.icon}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isActive ? '#fff' : 'var(--text-1)', lineHeight: 1.2 }}>
                  {c.label}
                </div>
                <div style={{ fontSize: '0.68rem', color: isActive ? 'rgba(255,255,255,0.75)' : 'var(--analysis-dim)', marginTop: 2 }}>
                  {c.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border, rgba(255,255,255,0.08))', marginBottom: 28 }} />

      {/* Active calculator */}
      {ActiveCalc && <ActiveCalc />}
    </div>
  );
}
