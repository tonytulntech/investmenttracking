import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Inbox, Upload } from 'lucide-react';
import { useGoalData, saveBucketMap } from '../services/goalStore';
import { getTransactions, assignTransactionsToGoal, snapshotFromTransactions } from '../services/localStorageService';
import { fetchMultiplePrices } from '../services/priceService';
import { BUCKETS } from '../lib/glidePath';
import { BUCKET_INFO } from '../lib/goalModel';
import { activeRules } from '../lib/revisionModel';
import { allocationTotal, normalizeAllocation } from '../lib/rulesModel';
import { progressAmounts } from '../services/goalProgress';
import {
  unassignedTransactions, groupByTicker, suggestGoalForTicker, suggestBucket, bucketWeights, driftFromTarget, mergeByTicker,
} from '../lib/goalPortfolio';
import { hint, Stack } from '../components/guided/wizardParts';

const BUCKET_COLORS = { equity: 'var(--info)', bondShort: 'var(--pos)', bondMedium: 'var(--accent)', cash: 'var(--text-3)', gold: 'var(--warn)' };
const eur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n));
const num = (n, d = 1) => new Intl.NumberFormat('it-IT', { maximumFractionDigits: d }).format(n);
const dateIt = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
const mono = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };

function GoalSelect({ id, value, goals, onChange, allowNone = false, label }) {
  return (
    <select id={id} aria-label={label} className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} style={{ minWidth: 0, maxWidth: '100%' }}>
      <option value="">{allowNone ? 'Da assegnare' : 'Scegli l\'obiettivo…'}</option>
      {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
    </select>
  );
}

// ── Da assegnare ────────────────────────────────────────────────────────────
function Inbox_({ groups, goals, allTx, onAssign }) {
  const [choice, setChoice] = useState({});
  return (
    <div className="card" style={{ border: '1px solid var(--warn)' }}>
      <Stack gap="1rem">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text-1)' }}>
          <Inbox size={16} /> Da assegnare · {groups.reduce((n, g) => n + g.count, 0)} operazioni
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
          Queste operazioni non appartengono ancora a nessun obiettivo. Scegli tu a quale obiettivo vanno: lo stesso titolo può stare in più obiettivi.
        </p>
        {groups.map(g => {
          const suggested = suggestGoalForTicker(g.ticker, allTx, goals);
          const value = choice[g.ticker] !== undefined ? choice[g.ticker] : suggested;
          return (
            <div key={g.ticker} className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{g.ticker}</div>
                  <div style={{ ...hint, marginTop: 0, overflowWrap: 'anywhere' }}>{g.name !== g.ticker ? `${g.name} · ` : ''}{g.count} {g.count === 1 ? 'operazione' : 'operazioni'}, {dateIt(g.firstDate)}{g.firstDate !== g.lastDate ? ` – ${dateIt(g.lastDate)}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <GoalSelect id={`assign-${g.ticker}`} label={`Obiettivo per ${g.ticker}`} value={value} goals={goals} onChange={(v) => setChoice(c => ({ ...c, [g.ticker]: v }))} />
                  <button type="button" className="btn-primary" disabled={!value} onClick={() => onAssign(g.txs.map(t => t.id), value)}>Assegna</button>
                </div>
              </div>
              {suggested && choice[g.ticker] === undefined && <div style={hint}>Preselezionato perché hai già assegnato operazioni di questo titolo (o hai un solo obiettivo). Puoi cambiarlo.</div>}
              {g.count > 1 && (
                <details style={{ marginTop: '0.5rem' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-2)' }}>Assegna una per una</summary>
                  <ul style={{ listStyle: 'none', margin: '0.5rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {g.txs.map(t => <TxRow key={t.id} tx={t} goals={goals} value={null} onAssign={onAssign} />)}
                  </ul>
                </details>
              )}
            </div>
          );
        })}
      </Stack>
    </div>
  );
}

function TxRow({ tx, goals, value, onAssign }) {
  return (
    <li style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-2)' }}>
      <span style={mono}>{dateIt(tx.date)} · {tx.type === 'buy' ? 'Acquisto' : 'Vendita'} {num(tx.quantity, 4)} × {num(tx.price, 2)} €</span>
      <GoalSelect id={`tx-${tx.id}`} label={`Obiettivo per l'operazione del ${tx.date}`} value={value} goals={goals} allowNone onChange={(v) => onAssign([tx.id], v)} />
    </li>
  );
}

// ── Barre pesi vs modello ───────────────────────────────────────────────────
function WeightsChart({ weights, target, drift }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {BUCKETS.filter(b => (target?.[b] ?? 0) > 0 || weights[b] > 0).map(b => (
        <li key={b}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{BUCKET_INFO[b].label}</span>
            <span style={{ ...mono, color: 'var(--text-2)' }}>
              {num(weights[b])}%
              {target && <span style={{ color: 'var(--text-3)' }}> · scelta {num(target[b] ?? 0, 0)}%</span>}
              {drift && <span style={{ marginLeft: 8, color: Math.abs(drift[b]) >= 5 ? 'var(--warn)' : 'var(--text-3)' }}>{drift[b] > 0 ? '+' : ''}{num(drift[b])} pt</span>}
            </span>
          </div>
          <div role="img" aria-label={target ? `${BUCKET_INFO[b].label}: ${num(weights[b])}% contro ${num(target[b] ?? 0, 0)}% scelto` : `${BUCKET_INFO[b].label}: ${num(weights[b])}%`}
            style={{ position: 'relative', height: 10, borderRadius: 5, background: 'var(--surface-2)', marginTop: 5 }}>
            <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, weights[b])}%`, background: BUCKET_COLORS[b], borderRadius: 5 }} />
            {target && <div style={{ position: 'absolute', top: -3, bottom: -3, left: `${Math.min(100, target[b] ?? 0)}%`, width: 2, background: 'var(--text-1)', opacity: 0.7 }} />}
          </div>
        </li>
      ))}
      {target && <li style={hint}>La linea chiara indica la composizione che hai scelto nelle tue regole.</li>}
    </ul>
  );
}

// ── Pagina ──────────────────────────────────────────────────────────────────
export default function GoalPortfolio() {
  const { goals, rules, bucketMap } = useGoalData();
  const [txVersion, setTxVersion] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [prices, setPrices] = useState({});
  const [pricesState, setPricesState] = useState('idle');

  const allTx = useMemo(() => getTransactions(), [txVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeGoals = goals.filter(g => g.status === 'active');
  const goal = activeGoals.find(g => g.id === selectedId) ?? activeGoals[0] ?? null;

  const pending = useMemo(() => unassignedTransactions(allTx, goals), [allTx, goals]);
  const groups = useMemo(() => groupByTicker(pending), [pending]);
  const goalTx = useMemo(() => (goal ? allTx.filter(t => t.goalId === goal.id) : []), [allTx, goal]);
  const hasAnyTx = allTx.length > 0;

  const assign = useCallback((ids, goalId) => { assignTransactionsToGoal(ids, goalId); setTxVersion(v => v + 1); }, []);

  // Prezzi dei titoli di questo obiettivo (cache condivisa di 5 minuti; senza prezzo si usa il costo).
  const tickers = useMemo(() => [...new Set(goalTx.filter(t => !t.isCash).map(t => t.ticker))].sort().join(','), [goalTx]);
  useEffect(() => {
    if (!tickers) { setPrices({}); setPricesState('idle'); return undefined; }
    let alive = true;
    setPricesState('loading');
    const categories = Object.fromEntries(goalTx.map(t => [t.ticker, t.macroCategory]));
    fetchMultiplePrices(tickers.split(','), categories)
      .then(p => { if (alive) { setPrices(p ?? {}); setPricesState('done'); } })
      .catch(() => { if (alive) { setPrices({}); setPricesState('failed'); } });
    return () => { alive = false; };
  }, [tickers]); // eslint-disable-line react-hooks/exhaustive-deps

  const snap = useMemo(() => snapshotFromTransactions(goalTx, prices), [goalTx, prices]);
  const holdings = useMemo(() => mergeByTicker(snap.holdings).sort((a, b) => b.marketValue - a.marketValue), [snap]);
  const weights = useMemo(() => bucketWeights(holdings, bucketMap), [holdings, bucketMap]);
  // Composizione scelta dallo studente nelle regole firmate (se c'è): è lui a deciderla, qui si mostra solo lo scostamento.
  const declared = useMemo(() => {
    const r = goal ? activeRules(rules, goal.id) : null;
    return r?.allocation && allocationTotal(r.allocation) === 100 ? normalizeAllocation(r.allocation) : null;
  }, [goal, rules]);
  const drift = useMemo(() => (declared ? driftFromTarget(weights.weights, declared) : null), [weights, declared]);
  const prog = goal ? progressAmounts(goal.targetAmount, snap.totalValue) : null;

  const setBucket = (ticker, bucket) => {
    const next = { ...bucketMap };
    if (bucket) next[ticker] = bucket; else delete next[ticker];
    saveBucketMap(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 className="page-title" style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wallet size={20} /> Il mio portafoglio
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginTop: 4 }}>
          Ogni obiettivo ha il suo portafoglio. Gli investimenti li scegli tu: qui vedi a che punto sei e come sono distribuiti.
        </p>
      </div>

      {activeGoals.length === 0 && (
        <div className="card"><p style={{ color: 'var(--text-2)', marginBottom: '0.75rem' }}>Per assegnare le operazioni serve almeno un obiettivo.</p><Link to="/guida/inizia" className="btn-primary">Inizia l&apos;esercizio</Link></div>
      )}

      {activeGoals.length > 0 && !hasAnyTx && (
        <div className="card">
          <p style={{ color: 'var(--text-2)', marginBottom: '0.75rem' }}>Non hai ancora operazioni. Importa il file CSV della tua piattaforma: poi le assegnerai ai tuoi obiettivi.</p>
          <Link to="/transactions" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Upload size={15} /> Importa le operazioni</Link>
        </div>
      )}

      {activeGoals.length > 0 && groups.length > 0 && <Inbox_ groups={groups} goals={activeGoals} allTx={allTx} onAssign={assign} />}

      {goal && hasAnyTx && (
        <>
          {activeGoals.length > 1 && (
            <div role="tablist" aria-label="Obiettivo" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {activeGoals.map(g => (
                <button key={g.id} type="button" role="tab" aria-selected={g.id === goal.id} onClick={() => setSelectedId(g.id)}
                  className={g.id === goal.id ? 'btn-primary' : 'btn-secondary'}>{g.name}</button>
              ))}
            </div>
          )}

          <div className="card">
            <Stack gap="1.25rem">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
                <div><div style={hint}>Valore oggi</div><div style={{ ...mono, fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-1)' }}>{eur(snap.totalValue)}</div></div>
                <div><div style={hint}>Versato</div><div style={{ ...mono, fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-1)' }}>{eur(snap.totalInvested)}</div></div>
              </div>
              {prog && holdings.length > 0 && (
                <div>
                  <div role="progressbar" aria-valuenow={Math.round(prog.percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Avanzamento verso l'obiettivo"
                    style={{ height: 8, borderRadius: 4, background: 'var(--surface-2)' }}>
                    <div style={{ height: 8, borderRadius: 4, width: `${prog.percent}%`, background: 'var(--accent)' }} />
                  </div>
                  <div style={{ ...hint, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span>Obiettivo {eur(goal.targetAmount)} di oggi · {Math.round(prog.percent)}%</span>
                    <span>{prog.reached ? 'Importo raggiunto' : <>Mancano <span style={mono}>{eur(prog.remaining)}</span></>}</span>
                  </div>
                </div>
              )}
              {pricesState === 'loading' && <p style={hint}>Aggiorno i prezzi…</p>}
              {snap.hasUnpriced && pricesState !== 'loading' && (
                <p style={{ ...hint, color: 'var(--warn)' }}>Prezzo non disponibile per {snap.unpriced.map(u => u.ticker).join(', ')}: per quei titoli il valore è calcolato al costo.</p>
              )}
              {holdings.length === 0 && <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>Nessuna operazione assegnata a «{goal.name}».</p>}
            </Stack>
          </div>

          {holdings.length > 0 && (
            <>
              <div className="card">
                <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.9rem' }}>Posizioni</h2>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  {holdings.map(h => {
                    const sug = suggestBucket(h);
                    const chosen = bucketMap[h.ticker];
                    return (
                      <li key={h.ticker} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingBottom: '0.9rem', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{h.ticker}</div>
                            <div style={{ ...hint, marginTop: 0, overflowWrap: 'anywhere' }}>{h.name !== h.ticker ? h.name : ''}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ ...mono, fontWeight: 600, color: 'var(--text-1)' }}>{eur(h.marketValue)}</div>
                            <div style={{ ...hint, marginTop: 0 }}>{weights.total > 0 ? num((h.marketValue / weights.total) * 100) : 0}% · {num(h.quantity, 4)} quote</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <select aria-label={`Bucket di ${h.ticker}`} className="select" value={chosen ?? ''} onChange={(e) => setBucket(h.ticker, e.target.value)} style={{ minWidth: 0, maxWidth: '100%' }}>
                            <option value="">A quale bucket appartiene?</option>
                            {BUCKETS.map(b => <option key={b} value={b}>{BUCKET_INFO[b].label}</option>)}
                          </select>
                          {!chosen && sug && (
                            <button type="button" className="btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => setBucket(h.ticker, sug.bucket)}>
                              Dalla categoria sembra «{BUCKET_INFO[sug.bucket].label}»: usa
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="card">
                <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.9rem' }}>
                  {declared ? 'Rispetto alla composizione che hai scelto' : 'Come è composto oggi'}
                </h2>
                {weights.unclassified.value > 0 && (
                  <p style={{ ...hint, color: 'var(--warn)', marginTop: 0, marginBottom: '0.9rem' }}>
                    {eur(weights.unclassified.value)} ({weights.unclassified.tickers.join(', ')}) non hanno ancora un bucket: scegline uno sopra per vedere i pesi completi.
                  </p>
                )}
                <WeightsChart weights={weights.weights} target={declared} drift={drift} />
                {!declared && <p style={hint}>Quando firmi le regole e indichi la composizione che hai scelto, qui vedrai quanto te ne discosti. <Link to="/regole" style={{ color: 'var(--accent)' }}>Firma le regole →</Link></p>}
              </div>
            </>
          )}

          {goalTx.length > 0 && (
            <details className="card">
              <summary style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-1)', fontWeight: 600 }}>Operazioni di «{goal.name}» ({goalTx.length})</summary>
              <ul style={{ listStyle: 'none', margin: '0.75rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {goalTx.filter(t => t.type === 'buy' || t.type === 'sell').sort((a, b) => b.date.localeCompare(a.date)).map(t => (
                  <li key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-1)' }}>{t.ticker}</div>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}><TxRow tx={t} goals={activeGoals} value={t.goalId} onAssign={assign} /></ul>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
