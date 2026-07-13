import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layers, Plus, X, Edit2, Trash2, Target, Check, Search,
  ChevronDown, AlertCircle, RefreshCw, TrendingUp, Wallet,
  Sliders, Info, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { calculatePortfolio } from '../services/localStorageService';
import { fetchMultiplePrices } from '../services/priceService';
import { getCachedPrices } from '../services/priceCache';
import { getCompositionProfile } from '../data/etfComposition';
import {
  MACRO_CATEGORIES,
  PRESET_TARGETS,
  PORTFOLIO_COLORS,
  PORTFOLIO_EMOJIS,
  getPortfolioConfig,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  assignTicker,
  bulkAssign,
  unassignAll,
  assignByMacroCategory,
  calcMacroAllocation,
  calcRebalancing,
  updateGlobalTarget,
} from '../services/portfolioConfigService';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n, dec = 0) =>
  new Intl.NumberFormat('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n ?? 0);

const fmtEur = (n) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0);

// ── Allocation bar: a single horizontal stacked bar ──────────────────────────

function MacroBar({ allocation, height = 8 }) {
  if (!allocation) return <div style={{ height, background: 'var(--surface-2)', borderRadius: 99 }} />;
  return (
    <div style={{ display: 'flex', height, borderRadius: 99, overflow: 'hidden', gap: 1 }}>
      {MACRO_CATEGORIES.map(cat => {
        const pct = allocation[cat.key] ?? 0;
        if (pct < 0.5) return null;
        return (
          <div
            key={cat.key}
            style={{ width: `${pct}%`, background: cat.color, flexShrink: 0 }}
            title={`${cat.label}: ${pct}%`}
          />
        );
      })}
    </div>
  );
}

// ── Allocation vs Target row ─────────────────────────────────────────────────

function AllocRow({ cat, current, target, threshold }) {
  const diff = (current ?? 0) - (target ?? 0);
  const ok = Math.abs(diff) <= threshold;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem' }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
      <span style={{ flex: 1, color: 'var(--text-2)' }}>{cat.label}</span>
      <span style={{ width: 36, textAlign: 'right', color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
        {fmt(current ?? 0)}%
      </span>
      <span style={{ width: 36, textAlign: 'right', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
        {fmt(target ?? 0)}%
      </span>
      <span style={{
        width: 42, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
        color: ok ? 'var(--text-3)' : diff > 0 ? '#ff9f0a' : '#30d158',
        fontWeight: ok ? 400 : 600,
      }}>
        {diff > 0 ? '+' : ''}{fmt(diff)}%
      </span>
      <span style={{ width: 16, textAlign: 'center' }}>
        {target > 0 && (ok
          ? <CheckCircle2 size={12} color="#30d158" />
          : <AlertCircle size={12} color={diff > 0 ? '#ff9f0a' : '#30d158'} />
        )}
      </span>
    </div>
  );
}

// ── Portfolio card ────────────────────────────────────────────────────────────

function PortfolioCard({ portfolio, holdings, prices, config, onEdit, onDelete }) {
  const getProfile = useCallback((ticker) => getCompositionProfile(ticker), []);

  const portfolioHoldings = useMemo(() => {
    return holdings.filter(h => config.assignments[h.holdingKey ?? h.ticker] === portfolio.id);
  }, [holdings, config.assignments, portfolio.id]);

  const totalValue = portfolioHoldings.reduce((s, h) => s + (h.marketValue ?? 0), 0);
  const numTickers = portfolioHoldings.length;

  const currentAlloc = useMemo(() => {
    if (portfolioHoldings.length === 0) return null;
    return calcMacroAllocation(portfolioHoldings, getProfile);
  }, [portfolioHoldings, getProfile]);

  const hasTarget = portfolio.targetAllocation != null;
  const rebalInfo = useMemo(() => {
    if (!hasTarget || !currentAlloc) return null;
    return calcRebalancing(currentAlloc, portfolio.targetAllocation, totalValue);
  }, [hasTarget, currentAlloc, portfolio.targetAllocation, totalValue]);

  const alertCount = rebalInfo?.actions?.filter(a => {
    const threshold = portfolio.rebalanceThreshold ?? 5;
    return Math.abs(a.diff) > threshold && a.target > 0;
  }).length ?? 0;

  return (
    <div style={{
      background: 'var(--card-bg)',
      borderRadius: 16,
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Header strip */}
      <div style={{ height: 4, background: portfolio.color }} />

      <div style={{ padding: '1rem 1.1rem' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{portfolio.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--text-1)' }}>
                {portfolio.name}
              </h3>
              {alertCount > 0 && (
                <span style={{
                  background: '#ff9f0a22', color: '#ff9f0a',
                  border: '1px solid #ff9f0a44',
                  borderRadius: 99, fontSize: '0.65rem', fontWeight: 700,
                  padding: '1px 7px',
                }}>
                  {alertCount} alert
                </span>
              )}
            </div>
            {portfolio.description && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: '2px 0 0', lineHeight: 1.3 }}>
                {portfolio.description}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => onEdit(portfolio)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-3)' }}
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => onDelete(portfolio.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-3)' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 2 }}>Valore</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>{fmtEur(totalValue)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 2 }}>ETF/Titoli</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>{numTickers}</div>
          </div>
          {hasTarget && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 2 }}>Soglia alert</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
                ±{portfolio.rebalanceThreshold ?? 5}%
              </div>
            </div>
          )}
        </div>

        {/* Allocation bar */}
        {currentAlloc ? (
          <>
            <MacroBar allocation={currentAlloc} height={6} />
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {MACRO_CATEGORIES.filter(c => (currentAlloc[c.key] ?? 0) >= 1).map(cat => (
                <span key={cat.key} style={{ fontSize: '0.65rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 1, background: cat.color, flexShrink: 0 }} />
                  {cat.label} {fmt(currentAlloc[cat.key])}%
                </span>
              ))}
            </div>
          </>
        ) : (
          <div style={{
            height: 6, background: 'var(--surface-2)', borderRadius: 99,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} />
        )}

        {/* Target comparison */}
        {hasTarget && currentAlloc && rebalInfo && (
          <div style={{
            marginTop: 12, paddingTop: 12,
            borderTop: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: 2 }}>
              <span>Categoria</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ width: 36, textAlign: 'right' }}>Attuale</span>
                <span style={{ width: 36, textAlign: 'right' }}>Target</span>
                <span style={{ width: 42, textAlign: 'right' }}>Delta</span>
                <span style={{ width: 16 }} />
              </div>
            </div>
            {MACRO_CATEGORIES.filter(cat => {
              const t = portfolio.targetAllocation[cat.key] ?? 0;
              const c = currentAlloc[cat.key] ?? 0;
              return t > 0 || c > 0;
            }).map(cat => (
              <AllocRow
                key={cat.key}
                cat={cat}
                current={currentAlloc[cat.key]}
                target={portfolio.targetAllocation[cat.key]}
                threshold={portfolio.rebalanceThreshold ?? 5}
              />
            ))}
          </div>
        )}

        {!hasTarget && (
          <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
            Nessun target di allocazione impostato
          </div>
        )}

        {numTickers === 0 && (
          <div style={{
            marginTop: 10, padding: '8px 10px',
            background: 'var(--surface-2)', borderRadius: 8,
            fontSize: '0.72rem', color: 'var(--text-3)',
          }}>
            Nessun ticker assegnato a questo portafoglio
          </div>
        )}
      </div>
    </div>
  );
}

// ── Global target card ────────────────────────────────────────────────────────

function GlobalCard({ config, allHoldings, onEdit }) {
  const getProfile = useCallback((ticker) => getCompositionProfile(ticker), []);

  const totalValue = allHoldings.reduce((s, h) => s + (h.marketValue ?? 0), 0);
  const currentAlloc = useMemo(() => {
    if (allHoldings.length === 0) return null;
    return calcMacroAllocation(allHoldings, getProfile);
  }, [allHoldings, getProfile]);

  const hasTarget = config.globalTarget != null;
  const rebalInfo = useMemo(() => {
    if (!hasTarget || !currentAlloc) return null;
    return calcRebalancing(currentAlloc, config.globalTarget, totalValue);
  }, [hasTarget, currentAlloc, config.globalTarget, totalValue]);

  return (
    <div style={{
      background: 'var(--card-bg)',
      borderRadius: 16,
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      <div style={{ height: 4, background: 'linear-gradient(90deg, #0A84FF, #30D158)' }} />
      <div style={{ padding: '1rem 1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} color="#0A84FF" />
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Target Globale</h3>
          </div>
          <button
            onClick={onEdit}
            style={{
              background: 'var(--surface-2)', border: 'none', cursor: 'pointer',
              borderRadius: 8, padding: '4px 10px', fontSize: '0.75rem',
              color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Edit2 size={12} /> Modifica
          </button>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 2 }}>Portafoglio totale</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>{fmtEur(totalValue)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 2 }}>Soglia alert</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
              ±{config.globalThreshold ?? 5}%
            </div>
          </div>
        </div>

        {currentAlloc && <MacroBar allocation={currentAlloc} height={8} />}

        {hasTarget && currentAlloc && rebalInfo && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 8 }}>
              Allocazione attuale vs target globale
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.65rem', color: 'var(--text-3)', gap: 8 }}>
                <span style={{ width: 36, textAlign: 'right' }}>Attuale</span>
                <span style={{ width: 36, textAlign: 'right' }}>Target</span>
                <span style={{ width: 42, textAlign: 'right' }}>Delta</span>
                <span style={{ width: 16 }} />
              </div>
              {MACRO_CATEGORIES.filter(cat => {
                const t = config.globalTarget[cat.key] ?? 0;
                const c = currentAlloc[cat.key] ?? 0;
                return t > 0 || c > 0;
              }).map(cat => (
                <AllocRow
                  key={cat.key}
                  cat={cat}
                  current={currentAlloc[cat.key]}
                  target={config.globalTarget[cat.key]}
                  threshold={config.globalThreshold ?? 5}
                />
              ))}
            </div>

            {/* Next contribution advice */}
            {rebalInfo.nextContribAdvice?.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 6 }}>
                  Consiglio prossimo versamento
                </div>
                {rebalInfo.nextContribAdvice.map(a => (
                  <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', marginBottom: 3 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: a.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'var(--text-2)' }}>{a.label}</span>
                    <span style={{ fontWeight: 600, color: '#30d158' }}>+{fmtEur(a.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!hasTarget && (
          <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
            Nessun target globale impostato — clicca Modifica per impostarlo
          </div>
        )}
      </div>
    </div>
  );
}

// ── Allocation sliders (used in modal) ───────────────────────────────────────

function AllocationSliders({ target, onChange }) {
  const total = MACRO_CATEGORIES.reduce((s, c) => s + (target[c.key] ?? 0), 0);
  const remaining = 100 - total;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Preset buttons */}
      <div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 6 }}>Template rapidi</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRESET_TARGETS.map(p => (
            <button
              key={p.name}
              onClick={() => onChange({ ...p.target })}
              style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '4px 10px', fontSize: '0.72rem',
                cursor: 'pointer', color: 'var(--text-2)',
              }}
            >
              {p.icon} {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Totale */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          flex: 1, height: 4, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden',
        }}>
          <div style={{ height: '100%', width: `${Math.min(total, 100)}%`, background: total === 100 ? '#30d158' : total > 100 ? '#ff453a' : '#ff9f0a', transition: 'width 0.2s' }} />
        </div>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: total === 100 ? '#30d158' : total > 100 ? '#ff453a' : '#ff9f0a', minWidth: 40, textAlign: 'right' }}>
          {total}%
        </span>
      </div>
      {total !== 100 && (
        <div style={{ fontSize: '0.72rem', color: total > 100 ? '#ff453a' : '#ff9f0a' }}>
          {total > 100 ? `Supera il 100% di ${total - 100}%` : `Mancano ${remaining}% al 100%`}
        </div>
      )}

      {/* Sliders */}
      {MACRO_CATEGORIES.map(cat => (
        <div key={cat.key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '1rem' }}>{cat.emoji}</span> {cat.label}
            </label>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: cat.color }}>{target[cat.key] ?? 0}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={target[cat.key] ?? 0}
            onChange={e => onChange({ ...target, [cat.key]: parseInt(e.target.value) })}
            style={{ width: '100%', accentColor: cat.color }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Portfolio Create/Edit Modal ────────────────────────────────────────────────

const EMPTY_TARGET = { equity: 0, bond: 0, commodity: 0, realEstate: 0, crypto: 0, cash: 0 };

function PortfolioModal({ editing, onSave, onClose }) {
  const [name, setName] = useState(editing?.name ?? '');
  const [emoji, setEmoji] = useState(editing?.emoji ?? '📈');
  const [color, setColor] = useState(editing?.color ?? PORTFOLIO_COLORS[0]);
  const [description, setDescription] = useState(editing?.description ?? '');
  const [hasTarget, setHasTarget] = useState(editing ? editing.targetAllocation != null : false);
  const [target, setTarget] = useState(editing?.targetAllocation ?? { ...EMPTY_TARGET });
  const [threshold, setThreshold] = useState(editing?.rebalanceThreshold ?? 5);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const total = MACRO_CATEGORIES.reduce((s, c) => s + (target[c.key] ?? 0), 0);
  const canSave = name.trim().length > 0 && (!hasTarget || total === 100);

  function handleSave() {
    onSave({
      name: name.trim(),
      emoji,
      color,
      description: description.trim(),
      targetAllocation: hasTarget ? target : null,
      rebalanceThreshold: threshold,
    });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--card-bg)', borderRadius: 20,
        border: '1px solid var(--border)',
        width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.1rem 1.2rem', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1,
        }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            {editing ? 'Modifica portafoglio' : 'Nuovo portafoglio'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.2rem' }}>
          {/* Emoji + Name row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setEmojiOpen(o => !o)}
                style={{
                  width: 48, height: 48, borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--surface-2)',
                  fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1,
                }}
              >
                {emoji}
              </button>
              {emojiOpen && (
                <div style={{
                  position: 'absolute', top: 52, left: 0, zIndex: 10,
                  background: 'var(--card-bg)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4,
                }}>
                  {PORTFOLIO_EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => { setEmoji(e); setEmojiOpen(false); }}
                      style={{
                        background: emoji === e ? 'var(--surface-2)' : 'none',
                        border: 'none', cursor: 'pointer', borderRadius: 8,
                        padding: '4px 6px', fontSize: '1.2rem',
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Nome portafoglio *"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--surface-2)',
                  color: 'var(--text-1)', fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <input
              type="text"
              placeholder="Descrizione (opzionale)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--surface-2)',
                color: 'var(--text-1)', fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Color picker */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 6 }}>Colore</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PORTFOLIO_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: 8, background: c,
                    border: color === c ? '2px solid var(--text-1)' : '2px solid transparent',
                    cursor: 'pointer', boxSizing: 'border-box',
                    boxShadow: color === c ? '0 0 0 2px var(--card-bg), 0 0 0 4px ' + c : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Target allocation toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: 10,
            background: 'var(--surface-2)', marginBottom: hasTarget ? 14 : 4,
          }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Target di allocazione</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                Definisci la % target per ogni macro-categoria
              </div>
            </div>
            <button
              onClick={() => setHasTarget(h => !h)}
              style={{
                width: 40, height: 22, borderRadius: 99,
                background: hasTarget ? '#30d158' : 'var(--surface-3, #3a3a3c)',
                border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: hasTarget ? 20 : 2,
                width: 18, height: 18, borderRadius: 99, background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </button>
          </div>

          {hasTarget && (
            <AllocationSliders target={target} onChange={setTarget} />
          )}

          {/* Threshold */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                Soglia alert ribilanciamento
              </label>
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>±{threshold}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={threshold}
              onChange={e => setThreshold(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#0A84FF' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-3)' }}>
              <span>1% (preciso)</span>
              <span>20% (ampio)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.2rem', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          position: 'sticky', bottom: 0, background: 'var(--card-bg)',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.875rem',
            }}
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '8px 20px', borderRadius: 10, border: 'none',
              background: canSave ? '#0A84FF' : 'var(--surface-2)',
              color: canSave ? '#fff' : 'var(--text-3)',
              cursor: canSave ? 'pointer' : 'default',
              fontSize: '0.875rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Check size={15} /> Salva
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Global target modal ───────────────────────────────────────────────────────

function GlobalModal({ config, onSave, onClose }) {
  const [target, setTarget] = useState(config.globalTarget ?? { ...EMPTY_TARGET });
  const [threshold, setThreshold] = useState(config.globalThreshold ?? 5);

  const total = MACRO_CATEGORIES.reduce((s, c) => s + (target[c.key] ?? 0), 0);
  const canSave = total === 100;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--card-bg)', borderRadius: 20,
        border: '1px solid var(--border)',
        width: '100%', maxWidth: 480,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.1rem 1.2rem', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} color="#0A84FF" />
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Target Globale</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.2rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 0, marginBottom: 16 }}>
            Definisci l'allocazione target per l'intero portafoglio, indipendentemente dai sotto-portafogli.
          </p>
          <AllocationSliders target={target} onChange={setTarget} />

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Soglia alert</label>
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>±{threshold}%</span>
            </div>
            <input
              type="range" min={1} max={20} step={1} value={threshold}
              onChange={e => setThreshold(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#0A84FF' }}
            />
          </div>
        </div>

        <div style={{
          padding: '1rem 1.2rem', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          position: 'sticky', bottom: 0, background: 'var(--card-bg)',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.875rem',
            }}
          >
            Annulla
          </button>
          <button
            onClick={() => onSave(target, threshold)}
            disabled={!canSave}
            style={{
              padding: '8px 20px', borderRadius: 10, border: 'none',
              background: canSave ? '#0A84FF' : 'var(--surface-2)',
              color: canSave ? '#fff' : 'var(--text-3)',
              cursor: canSave ? 'pointer' : 'default',
              fontSize: '0.875rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Check size={15} /> Salva
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assignment tab ────────────────────────────────────────────────────────────

function AssignmentRow({ holding, portfolios, assignments, onAssign }) {
  const key = holding.holdingKey ?? holding.ticker;
  const assigned = assignments[key];
  const portfolio = portfolios.find(p => p.id === assigned);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Color dot */}
      <div style={{
        width: 10, height: 10, borderRadius: 99, flexShrink: 0,
        background: portfolio?.color ?? 'var(--surface-2)',
        border: portfolio ? 'none' : '1px solid var(--text-3)',
      }} />

      {/* Name + ticker + broker badge */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {holding.name || holding.ticker}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
          {holding.ticker}
          {holding.broker && (
            <span style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '0 5px', fontSize: '0.65rem',
              color: 'var(--text-2)', fontWeight: 500,
            }}>
              {holding.broker}
            </span>
          )}
        </div>
      </div>

      {/* Value */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
        <div style={{ fontSize: '0.825rem', fontWeight: 600 }}>{fmtEur(holding.marketValue ?? 0)}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
          {holding.quantity != null ? `×${fmt(holding.quantity, 3)}` : ''}
        </div>
      </div>

      {/* Portfolio dropdown */}
      <div style={{ flexShrink: 0, position: 'relative' }}>
        <select
          value={assigned ?? ''}
          onChange={e => onAssign(key, e.target.value || null)}
          style={{
            padding: '6px 28px 6px 10px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            color: 'var(--text-1)',
            fontSize: '0.78rem',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            minWidth: 140,
          }}
        >
          <option value="">— Non assegnato —</option>
          {portfolios.map(p => (
            <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PortfolioManager() {
  const [tab, setTab] = useState('portfolios'); // 'portfolios' | 'assign'
  const [config, setConfig] = useState(() => getPortfolioConfig());
  const [rawHoldings, setRawHoldings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [editingPortfolio, setEditingPortfolio] = useState(null); // null | portfolio obj | 'new'
  const [globalModalOpen, setGlobalModalOpen] = useState(false);

  // Assignment tab state
  const [search, setSearch] = useState('');
  const [filterPort, setFilterPort] = useState('all'); // 'all' | 'unassigned' | portfolioId

  // Load holdings with prices
  useEffect(() => {
    loadHoldings();
  }, []);

  async function loadHoldings() {
    setLoading(true);
    try {
      const holdings = calculatePortfolio().filter(h => !h.isCash);
      const cached = getCachedPrices() || {};

      // Use cached prices for immediate display
      if (Object.keys(cached).length > 0) {
        setRawHoldings(applyPrices(holdings, cached));
        setLoading(false);
      }

      // Fetch fresh prices
      const tickers = holdings.map(h => h.ticker);
      if (tickers.length > 0) {
        const cats = Object.fromEntries(holdings.map(h => [h.ticker, h.macroCategory || h.category]));
        const prices = await fetchMultiplePrices(tickers, cats);
        setRawHoldings(applyPrices(holdings, prices));
      }
    } catch (e) {
      console.error('Error loading holdings:', e);
    } finally {
      setLoading(false);
    }
  }

  function applyPrices(holdings, prices) {
    return holdings.map(h => {
      const p = prices[h.ticker];
      const price = p?.price ?? p ?? h.avgPrice ?? 0;
      return { ...h, currentPrice: price, marketValue: price * (h.quantity ?? 0) };
    });
  }

  function refreshConfig() {
    setConfig(getPortfolioConfig());
  }

  // ── Portfolio CRUD handlers ───────────────────────────────────────────────

  function handleSavePortfolio(data) {
    if (editingPortfolio === 'new') {
      createPortfolio(data);
    } else {
      updatePortfolio(editingPortfolio.id, data);
    }
    refreshConfig();
    setEditingPortfolio(null);
  }

  function handleDeletePortfolio(id) {
    if (confirm('Eliminare questo portafoglio? I ticker assegnati torneranno "non assegnati".')) {
      deletePortfolio(id);
      refreshConfig();
    }
  }

  function handleSaveGlobal(target, threshold) {
    updateGlobalTarget(target, threshold);
    refreshConfig();
    setGlobalModalOpen(false);
  }

  function handleAssign(ticker, portfolioId) {
    assignTicker(ticker, portfolioId);
    refreshConfig();
  }

  function handleUnassignAll() {
    if (!confirm('Rimuovere tutte le assegnazioni? Tutti i ticker torneranno "non assegnati".')) return;
    unassignAll();
    refreshConfig();
  }

  function handleAssignByClass(macroCategory, portfolioId) {
    assignByMacroCategory(macroCategory, portfolioId, rawHoldings);
    refreshConfig();
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const unassignedCount = rawHoldings.filter(h => !config.assignments[h.holdingKey ?? h.ticker]).length;

  // Distinct macro categories present in holdings (for asset-class bulk assign)
  const macroCategoryGroups = useMemo(() => {
    const map = {};
    rawHoldings.forEach(h => {
      const cat = h.macroCategory || h.category || 'Altro';
      if (!map[cat]) map[cat] = { cat, count: 0, value: 0 };
      map[cat].count++;
      map[cat].value += h.marketValue ?? 0;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [rawHoldings]);

  const filteredHoldings = useMemo(() => {
    return rawHoldings
      .filter(h => {
        const matchSearch = !search || h.ticker.toLowerCase().includes(search.toLowerCase()) || (h.name || '').toLowerCase().includes(search.toLowerCase());
        const hk = h.holdingKey ?? h.ticker;
        const matchPort = filterPort === 'all' || (filterPort === 'unassigned' ? !config.assignments[hk] : config.assignments[hk] === filterPort);
        return matchSearch && matchPort;
      })
      .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0));
  }, [rawHoldings, search, filterPort, config.assignments]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={22} color="#0A84FF" /> Portafogli
          </h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-3)' }}>
            Organizza i tuoi ticker in sotto-portafogli e monitora il rispetto degli obiettivi di allocazione.
          </p>
        </div>
        <button
          onClick={() => setEditingPortfolio('new')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: '#0A84FF', color: '#fff',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={15} /> Nuovo portafoglio
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[
          { key: 'portfolios', label: 'I miei portafogli', icon: <Wallet size={14} /> },
          { key: 'assign', label: 'Assegna ticker', icon: <Sliders size={14} />, badge: unassignedCount > 0 ? unassignedCount : null },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 14px', borderRadius: '10px 10px 0 0', border: 'none',
              background: tab === t.key ? 'var(--card-bg)' : 'none',
              borderBottom: tab === t.key ? '2px solid #0A84FF' : '2px solid transparent',
              color: tab === t.key ? '#0A84FF' : 'var(--text-3)',
              fontWeight: tab === t.key ? 700 : 400,
              fontSize: '0.8375rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: -1,
            }}
          >
            {t.icon} {t.label}
            {t.badge != null && (
              <span style={{
                background: '#ff453a', color: '#fff',
                borderRadius: 99, fontSize: '0.65rem', fontWeight: 700,
                padding: '1px 6px', marginLeft: 2,
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Portafogli ──────────────────────────────────────────── */}
      {tab === 'portfolios' && (
        <div>
          {/* Unassigned warning */}
          {unassignedCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 12, marginBottom: 20,
              background: '#ff9f0a18', border: '1px solid #ff9f0a44',
            }}>
              <AlertCircle size={16} color="#ff9f0a" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.825rem', color: '#ff9f0a', fontWeight: 600 }}>
                  {unassignedCount} {unassignedCount === 1 ? 'ticker non assegnato' : 'ticker non assegnati'}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginLeft: 6 }}>
                  — non verranno inclusi in nessun sotto-portafoglio
                </span>
              </div>
              <button
                onClick={() => setTab('assign')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 8, border: 'none',
                  background: '#ff9f0a', color: '#fff',
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Assegna <ArrowRight size={12} />
              </button>
            </div>
          )}

          {/* Global card */}
          <GlobalCard
            config={config}
            allHoldings={rawHoldings}
            onEdit={() => setGlobalModalOpen(true)}
          />

          {/* Portfolio grid */}
          {config.portfolios.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 16, marginTop: 20,
            }}>
              {config.portfolios.map(p => (
                <PortfolioCard
                  key={p.id}
                  portfolio={p}
                  holdings={rawHoldings}
                  prices={{}}
                  config={config}
                  onEdit={setEditingPortfolio}
                  onDelete={handleDeletePortfolio}
                />
              ))}
            </div>
          ) : (
            <div style={{
              marginTop: 20, padding: '2.5rem', textAlign: 'center',
              background: 'var(--card-bg)', borderRadius: 16,
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📁</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>Nessun portafoglio creato</h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-3)', marginBottom: 16, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
                Crea il tuo primo sotto-portafoglio per organizzare i tuoi ticker e monitorare il rispetto della strategia di investimento.
              </p>
              <button
                onClick={() => setEditingPortfolio('new')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: '#0A84FF', color: '#fff',
                  fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                <Plus size={15} /> Crea portafoglio
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Assegnazioni ────────────────────────────────────────── */}
      {tab === 'assign' && (
        <div>

          {/* ── Assegna per asset class ─────────────────────────────── */}
          {config.portfolios.length > 0 && macroCategoryGroups.length > 0 && (
            <div style={{
              background: 'var(--card-bg)', borderRadius: 16,
              border: '1px solid var(--border)', marginBottom: 16, overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderBottom: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Assegna per asset class
                </span>
                <button
                  onClick={handleUnassignAll}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 8,
                    border: '1px solid #ff453a44', background: '#ff453a18',
                    color: '#ff453a', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Unifica tutto
                </button>
              </div>
              {macroCategoryGroups.map(({ cat, count }) => (
                <div key={cat} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 14px', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ flex: 1, fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-1)' }}>
                    {cat}
                    <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 400 }}>
                      ({count} ticker)
                    </span>
                  </span>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {config.portfolios.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleAssignByClass(cat, p.id)}
                        style={{
                          padding: '4px 10px', borderRadius: 8,
                          background: p.color + '22', color: p.color,
                          border: `1px solid ${p.color}44`,
                          fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {p.emoji} {p.name}
                      </button>
                    ))}
                    <button
                      onClick={() => handleAssignByClass(cat, null)}
                      style={{
                        padding: '4px 10px', borderRadius: 8,
                        background: 'transparent', color: 'var(--text-3)',
                        border: '1px solid var(--border)',
                        fontSize: '0.72rem', cursor: 'pointer',
                      }}
                    >
                      — Rimuovi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input
                type="text"
                placeholder="Cerca ticker o nome..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px 8px 32px',
                  borderRadius: 10, border: '1px solid var(--border)',
                  background: 'var(--surface-2)', color: 'var(--text-1)',
                  fontSize: '0.825rem', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Filter by portfolio */}
            <select
              value={filterPort}
              onChange={e => setFilterPort(e.target.value)}
              style={{
                padding: '8px 28px 8px 12px',
                borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text-1)',
                fontSize: '0.825rem', cursor: 'pointer', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
              }}
            >
              <option value="all">Tutti i ticker</option>
              <option value="unassigned">Non assegnati ({unassignedCount})</option>
              {config.portfolios.map(p => (
                <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
              ))}
            </select>

            {/* Refresh */}
            <button
              onClick={loadHoldings}
              style={{
                padding: '8px 12px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--surface-2)',
                cursor: 'pointer', color: 'var(--text-2)',
              }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Bulk assign bar — shows only if there are unassigned and portfolios exist */}
          {unassignedCount > 0 && config.portfolios.length > 0 && filterPort === 'unassigned' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 12, marginBottom: 12,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', flex: 1 }}>
                Assegna tutti i non assegnati a:
              </span>
              {config.portfolios.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    const unassignedTickers = rawHoldings.filter(h => !config.assignments[h.holdingKey ?? h.ticker]).map(h => h.holdingKey ?? h.ticker);
                    bulkAssign(unassignedTickers, p.id);
                    refreshConfig();
                  }}
                  style={{
                    padding: '5px 12px', borderRadius: 8,
                    background: p.color + '22', color: p.color,
                    border: `1px solid ${p.color}44`,
                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Holdings table */}
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
              <div>Caricamento prezzi...</div>
            </div>
          ) : filteredHoldings.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.875rem' }}>
              Nessun ticker trovato
            </div>
          ) : (
            <div style={{
              background: 'var(--card-bg)', borderRadius: 16,
              border: '1px solid var(--border)', overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 14px',
                background: 'var(--surface-2)',
                borderBottom: '1px solid var(--border)',
                fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase',
              }}>
                <div style={{ width: 10, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>Titolo</div>
                <div style={{ minWidth: 80, textAlign: 'right' }}>Valore</div>
                <div style={{ minWidth: 140, textAlign: 'center' }}>Portafoglio</div>
              </div>

              {filteredHoldings.map(h => (
                <AssignmentRow
                  key={h.holdingKey ?? h.ticker}
                  holding={h}
                  portfolios={config.portfolios}
                  assignments={config.assignments}
                  onAssign={handleAssign}
                />
              ))}

              {/* Summary footer */}
              <div style={{
                padding: '10px 14px', borderTop: '1px solid var(--border)',
                background: 'var(--surface-2)',
                display: 'flex', justifyContent: 'space-between',
                fontSize: '0.75rem', color: 'var(--text-3)',
              }}>
                <span>{filteredHoldings.length} titoli visualizzati</span>
                <span>
                  {fmtEur(filteredHoldings.reduce((s, h) => s + (h.marketValue ?? 0), 0))} totale
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {editingPortfolio != null && (
        <PortfolioModal
          editing={editingPortfolio === 'new' ? null : editingPortfolio}
          onSave={handleSavePortfolio}
          onClose={() => setEditingPortfolio(null)}
        />
      )}

      {globalModalOpen && (
        <GlobalModal
          config={config}
          onSave={handleSaveGlobal}
          onClose={() => setGlobalModalOpen(false)}
        />
      )}

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
