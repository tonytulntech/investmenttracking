import React, { useState, useMemo, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { getPACTemplates } from '../services/pacService';
import { getAvgMonthlyInvested } from '../services/cashFlowService';

const MONO = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };

// Colori scenari coerenti Direzione C
const S_OPT  = '#3FB950';   // ottimista (verde)
const S_BASE = '#7C82FF';   // base (accento)
const S_LOW  = '#FF9F0A';   // prudente (ambra)
const GREY   = 'var(--text-3)';

const eur0 = (n) => '€' + Math.round(n).toLocaleString('it-IT');
const eurK = (n) => Math.abs(n) >= 1000 ? `€${Math.round(n / 1000)}k` : `€${Math.round(n)}`;

const HORIZONS = [
  { label: '5A',  years: 5 },
  { label: '10A', years: 10 },
  { label: '20A', years: 20 },
];

const SCENARIOS = [
  { key: 'opt',  label: 'Ottimista', rate: 0.09, color: S_OPT },
  { key: 'base', label: 'Base',      rate: 0.06, color: S_BASE },
  { key: 'low',  label: 'Prudente',  rate: 0.03, color: S_LOW },
];

const BOOSTS = [0, 100, 250, 500];

/**
 * ProjectionFanChart — sostituisce il grafico "Andamento vs Versato".
 * Mostra la storia (valore + versato grigio) e 3 scenari proiettati che si
 * espandono dal "now" all'orizzonte scelto, sovrapposti al versato proiettato
 * (cumulativo dei PAC attivi + boost).
 *
 * Props:
 *  - history: [{ month, value, versato }] — dai dati performanceData della Dashboard
 */
export default function ProjectionFanChart({
  history = [],
  currentTotalValue,   // override coerente coi KPI della Dashboard (stats.totalValue)
  currentGained,       // override P&L coerente coi KPI (stats.totalPL)
}) {
  const svgRef = useRef(null);
  const [horizonYears, setHorizonYears] = useState(10);
  const [boost, setBoost] = useState(0);
  const [hoverX, setHoverX] = useState(null);

  // Media mensile investita dal foglio Patrimonio (totalDeposits / monthsSpan).
  // Fallback ai PAC attivi se la media da cashflow è zero (utente senza storia).
  const { avgMonthlyInvested, monthsSpan } = useMemo(() => {
    try { return getAvgMonthlyInvested(); }
    catch { return { avgMonthlyInvested: 0, monthsSpan: 0 }; }
  }, []);
  const pacMonthly = useMemo(() => {
    try {
      const templates = getPACTemplates() || [];
      return templates.filter(t => t.isActive !== false).reduce((s, t) => s + (Number(t.totalAmount) || 0), 0);
    } catch { return 0; }
  }, []);
  const baseMonthly = avgMonthlyInvested > 0 ? avgMonthlyInvested : pacMonthly;
  const contributionSource = avgMonthlyInvested > 0 ? 'patrimonio' : (pacMonthly > 0 ? 'pac' : 'none');
  const monthlyContribution = baseMonthly + boost;

  // Ultimo valore e versato dalla storia
  const last = history.length > 0 ? history[history.length - 1] : null;
  const currentValue = last?.value ?? 0;
  const currentVersato = last?.versato ?? 0;

  // Proiezione mese per mese
  const projections = useMemo(() => {
    if (!last) return [];
    const months = horizonYears * 12;
    const out = { opt: [], base: [], low: [], versato: [] };
    const startDate = new Date(last.month + ' 01');

    SCENARIOS.forEach(s => {
      const rMonthly = Math.pow(1 + s.rate, 1 / 12) - 1;
      let v = currentValue;
      const arr = [{ i: 0, value: v }];
      for (let i = 1; i <= months; i++) {
        v = v * (1 + rMonthly) + monthlyContribution;
        arr.push({ i, value: v });
      }
      out[s.key] = arr;
    });

    // Versato proiettato: crescita lineare
    let vers = currentVersato;
    out.versato = [{ i: 0, value: vers }];
    for (let i = 1; i <= months; i++) {
      vers += monthlyContribution;
      out.versato.push({ i, value: vers });
    }

    // Etichette date proiezione
    out.dates = Array.from({ length: months + 1 }, (_, i) => {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i);
      return d;
    });

    return out;
  }, [last, horizonYears, monthlyContribution, currentValue, currentVersato]);

  // Geometria
  const W = 640, H = 240;
  const PAD = { l: 40, r: 72, t: 12, b: 26 };

  const geo = useMemo(() => {
    if (!last) return null;
    const histLen = history.length;
    const projLen = (projections.opt || []).length;
    const totalLen = histLen + Math.max(0, projLen - 1);
    if (totalLen === 0) return null;

    // Storia occupa 40% dello spazio orizzontale
    const chartW = W - PAD.l - PAD.r;
    const histW = chartW * 0.40;
    const projW = chartW * 0.60;
    const xHist = (i) => PAD.l + (histLen > 1 ? (i / (histLen - 1)) * histW : 0);
    const xProj = (i) => PAD.l + histW + (projLen > 1 ? (i / (projLen - 1)) * projW : 0);
    const nowX = PAD.l + histW;

    // Y range: min tra tutti i valori (versato storia, valore storia, tutti gli scenari)
    let maxV = 0, minV = Infinity;
    history.forEach(h => {
      maxV = Math.max(maxV, h.value || 0, h.versato || 0);
      minV = Math.min(minV, h.value || 0, h.versato || 0);
    });
    ['opt', 'base', 'low', 'versato'].forEach(k => {
      (projections[k] || []).forEach(p => {
        maxV = Math.max(maxV, p.value);
        minV = Math.min(minV, p.value);
      });
    });
    // Padding sopra/sotto
    const range = maxV - minV;
    const yMax = maxV + range * 0.08;
    const yMin = Math.max(0, minV - range * 0.05);

    const y = (v) => PAD.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD.t - PAD.b);

    // Line builders
    const buildLine = (points, xFn) =>
      points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFn(i).toFixed(1)},${y(p.value ?? p).toFixed(1)}`).join(' ');

    return {
      chartW, histW, projW, xHist, xProj, nowX, y, yMax, yMin,
      histLen, projLen,
      pathHistValue:   buildLine(history.map(h => h.value),   xHist),
      pathHistVersato: buildLine(history.map(h => h.versato), xHist),
      pathOpt:         buildLine(projections.opt,  xProj),
      pathBase:        buildLine(projections.base, xProj),
      pathLow:         buildLine(projections.low,  xProj),
      pathProjVersato: buildLine(projections.versato, xProj),
      // Band (area tra ottimista e prudente) come poligono chiuso
      bandPath: (() => {
        if (!projections.opt?.length) return '';
        const up = projections.opt.map((p, i) => `${xProj(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' L');
        const down = projections.low.slice().reverse().map((p, i) => {
          const origI = projections.low.length - 1 - i;
          return `${xProj(origI).toFixed(1)},${y(p.value).toFixed(1)}`;
        }).join(' L');
        return `M${up} L${down} Z`;
      })(),
    };
  }, [history, projections, last]);

  // Valori finali degli scenari (per etichette a destra)
  const finalVals = useMemo(() => {
    if (!projections.opt?.length) return null;
    const lastIdx = projections.opt.length - 1;
    return {
      opt: projections.opt[lastIdx].value,
      base: projections.base[lastIdx].value,
      low: projections.low[lastIdx].value,
      versato: projections.versato[lastIdx].value,
    };
  }, [projections]);

  // Hover overlay: trova il valore al mouse-x
  const overlay = useMemo(() => {
    if (hoverX == null || !geo || !last) return null;
    const inHist = hoverX < geo.nowX;
    if (inHist) {
      const i = Math.round(((hoverX - PAD.l) / geo.histW) * (geo.histLen - 1));
      const idx = Math.max(0, Math.min(geo.histLen - 1, i));
      const h = history[idx];
      return {
        x: geo.xHist(idx), y: geo.y(h.value),
        title: h.month,
        rows: [
          { label: 'Valore',  value: h.value,   color: 'var(--text-1)' },
          { label: 'Versato', value: h.versato, color: GREY },
        ],
      };
    }
    const i = Math.round(((hoverX - geo.nowX) / geo.projW) * (geo.projLen - 1));
    const idx = Math.max(0, Math.min(geo.projLen - 1, i));
    const d = projections.dates[idx];
    return {
      x: geo.xProj(idx), y: geo.y(projections.base[idx].value),
      title: d ? `${d.toLocaleString('it-IT', { month: 'short', year: 'numeric' })}` : '',
      rows: [
        { label: 'Ottimista', value: projections.opt[idx].value,     color: S_OPT },
        { label: 'Base',      value: projections.base[idx].value,    color: S_BASE },
        { label: 'Prudente',  value: projections.low[idx].value,     color: S_LOW },
        { label: 'Versato',   value: projections.versato[idx].value, color: GREY },
      ],
    };
  }, [hoverX, geo, history, projections, last]);

  if (!last || !geo) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '1.5rem', textAlign: 'center',
        color: 'var(--text-3)', fontSize: '0.82rem',
      }}>
        Servono almeno alcuni mesi di storia per proiettare gli scenari.
      </div>
    );
  }

  const yTicks = [geo.yMin, (geo.yMin + geo.yMax) / 2, geo.yMax];

  const onMove = (e) => {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    setHoverX(Math.max(PAD.l, Math.min(W - PAD.r, px)));
  };

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '1.1rem 1.2rem',
      boxShadow: '0 1px 2px rgba(0,0,0,0.28)',
    }}>
      {/* Header con Versato + Guadagnato + selettore orizzonte.
         Usa i valori canonici della Dashboard se passati come prop,
         altrimenti fallback a value − versato dalla storia. */}
      {(() => {
        const effectiveValue = currentTotalValue != null ? currentTotalValue : currentValue;
        const gained = currentGained != null ? currentGained : (effectiveValue - currentVersato);
        const invested = effectiveValue - gained;
        const gainedPct = invested > 0 ? (gained / invested) * 100 : 0;
        const gColor = gained >= 0 ? S_OPT : '#F85149';
        return (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 14, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Investito</div>
              <div style={{ ...MONO, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.1 }}>{eur0(invested)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Guadagnato</div>
              <div style={{ ...MONO, fontSize: '1.1rem', fontWeight: 700, color: gColor, lineHeight: 1.1 }}>
                {gained >= 0 ? '+' : '−'}{eur0(gained)}
                <span style={{ fontSize: '0.72rem', fontWeight: 500, marginLeft: 6 }}>
                  {gained >= 0 ? '+' : '−'}{Math.abs(gainedPct).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Horizon selector */}
            <div style={{
              marginLeft: 'auto', display: 'flex',
              background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
            }}>
              {HORIZONS.map(h => (
                <button key={h.label} onClick={() => setHorizonYears(h.years)} style={{
                  padding: '5px 10px', border: 'none', cursor: 'pointer',
                  fontSize: '0.72rem', fontWeight: 600, ...MONO,
                  background: horizonYears === h.years ? 'var(--text-1)' : 'transparent',
                  color: horizonYears === h.years ? 'var(--bg)' : 'var(--text-2)',
                }}>{h.label}</button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Contributo mensile + boost */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '8px 10px', marginBottom: 12,
        background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10,
      }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Media mensile investita
        </span>
        <span style={{ ...MONO, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
          {eur0(monthlyContribution)}/mese
        </span>
        {contributionSource === 'patrimonio' && (
          <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
            (da Patrimonio: {eur0(baseMonthly)} su {monthsSpan} mesi{boost > 0 ? ` · +boost ${eur0(boost)}` : ''})
          </span>
        )}
        {contributionSource === 'pac' && (
          <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
            (PAC: {eur0(pacMonthly)}{boost > 0 ? ` + boost ${eur0(boost)}` : ''})
          </span>
        )}
        {contributionSource === 'none' && (
          <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
            (nessuna storia di depositi — usa i boost per simulare)
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {BOOSTS.map(b => (
            <button key={b} onClick={() => setBoost(b)}
              title={b === 0 ? 'Usa media attuale' : `Aggiungi ${eur0(b)}/mese`}
              style={{
                padding: '3px 9px', borderRadius: 99, cursor: 'pointer',
                border: `1px solid ${boost === b ? 'var(--accent)' : 'var(--border)'}`,
                background: boost === b ? 'var(--accent-weak)' : 'transparent',
                color: boost === b ? 'var(--accent)' : 'var(--text-2)',
                fontSize: '0.68rem', fontWeight: 600, ...MONO,
              }}
            >{b === 0 ? 'attuale' : `+${b}`}</button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ position: 'relative', width: '100%' }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%"
          className="projection-svg"
          preserveAspectRatio="none"
          style={{ display: 'block', cursor: 'crosshair', height: 280, width: '100%' }}
          onPointerMove={onMove} onPointerLeave={() => setHoverX(null)}>
          {/* Gridlines Y */}
          {yTicks.map((v, i) => (
            <g key={i}>
              <line x1={PAD.l} y1={geo.y(v)} x2={W - PAD.r} y2={geo.y(v)}
                stroke="var(--border)" strokeDasharray="2 5" />
              <text x={PAD.l - 6} y={geo.y(v) + 3} textAnchor="end" fontSize="9" fill="var(--text-3)" style={MONO}>
                {eurK(v)}
              </text>
            </g>
          ))}

          {/* Area band (ottimista→prudente) sottile e discreta */}
          <path d={geo.bandPath} fill={S_BASE} opacity={0.06} />

          {/* Versato storico (grigio sottile) */}
          <path d={geo.pathHistVersato} fill="none" stroke="var(--text-3)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" strokeDasharray="3 3" opacity={0.7} />
          {/* Valore storico (accento) */}
          <path d={geo.pathHistValue} fill="none" stroke="var(--text-1)" strokeWidth={1.8} vectorEffect="non-scaling-stroke" />

          {/* Now marker */}
          <line x1={geo.nowX} y1={PAD.t} x2={geo.nowX} y2={H - PAD.b}
            stroke="var(--text-3)" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="3 3" opacity={0.5} />
          <text x={geo.nowX} y={PAD.t - 2} textAnchor="middle" fontSize="9" fill="var(--text-3)">Now</text>

          {/* Versato proiettato (grigio molto sottile) */}
          <path d={geo.pathProjVersato} fill="none" stroke="var(--text-3)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" strokeDasharray="3 3" opacity={0.55} />

          {/* Proiezioni: 3 scenari */}
          <path d={geo.pathLow}  fill="none" stroke={S_LOW}  strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeDasharray="4 3" opacity={0.85} />
          <path d={geo.pathBase} fill="none" stroke={S_BASE} strokeWidth={2.1} vectorEffect="non-scaling-stroke" />
          <path d={geo.pathOpt}  fill="none" stroke={S_OPT}  strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeDasharray="4 3" opacity={0.85} />

          {/* Punto "now" (valore corrente) */}
          <circle cx={geo.nowX} cy={geo.y(currentValue)} r={3.2} fill="var(--text-1)" />

          {/* End labels */}
          {finalVals && [
            { y: geo.y(finalVals.opt),     label: SCENARIOS[0].label, value: finalVals.opt,  color: S_OPT },
            { y: geo.y(finalVals.base),    label: SCENARIOS[1].label, value: finalVals.base, color: S_BASE },
            { y: geo.y(finalVals.low),     label: SCENARIOS[2].label, value: finalVals.low,  color: S_LOW },
            { y: geo.y(finalVals.versato), label: 'Versato',          value: finalVals.versato, color: GREY },
          ].map((e, i) => (
            <g key={i}>
              <circle cx={W - PAD.r} cy={e.y} r={2.5} fill={e.color} />
              <text x={W - PAD.r + 6} y={e.y - 3} fontSize="8.5" fill="var(--text-3)">{e.label}</text>
              <text x={W - PAD.r + 6} y={e.y + 7} fontSize="10" fontWeight="600" fill={e.color} style={MONO}>{eurK(e.value)}</text>
            </g>
          ))}

          {/* Hover crosshair */}
          {overlay && (
            <g pointerEvents="none">
              <line x1={overlay.x} y1={PAD.t} x2={overlay.x} y2={H - PAD.b}
                stroke="var(--text-2)" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.5} />
            </g>
          )}
        </svg>

        {/* Overlay tooltip */}
        {overlay && (
          <div
            style={{
              position: 'absolute',
              top: 4,
              left: overlay.x > W * 0.6 ? undefined : `${(overlay.x / W) * 100}%`,
              right: overlay.x > W * 0.6 ? `${(1 - overlay.x / W) * 100 + 2}%` : undefined,
              transform: overlay.x > W * 0.6 ? 'translateX(0)' : 'translateX(8px)',
              background: 'var(--surface-1)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8, padding: '6px 9px',
              pointerEvents: 'none', minWidth: 130,
              boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              {overlay.title}
            </div>
            {overlay.rows.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.7rem' }}>
                <span style={{ color: r.color }}>{r.label}</span>
                <span style={{ ...MONO, color: r.color, fontWeight: 600 }}>{eur0(r.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legenda scenari compatta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10, fontSize: '0.7rem' }}>
        {SCENARIOS.map(s => (
          <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)' }}>
            <span style={{ width: 12, height: 2, background: s.color, borderRadius: 1 }} />
            {s.label} <span style={MONO}>({(s.rate * 100).toFixed(0)}%/anno)</span>
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)' }}>
          <span style={{ width: 12, height: 2, background: 'var(--text-3)', borderRadius: 1, borderTop: '1px dashed transparent' }} />
          Versato (cumulativo)
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: '0.66rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={10} /> stime, non consulenza
        </span>
      </div>
    </div>
  );
}

