import { useEffect, useMemo, useState } from 'react';
import { MONTHS_COVERED, STATUS_INFO, goalFromFields } from '../../lib/goalModel';
import { allocationFor, evaluateFeasibility, evaluateScenarios, contributionAnalysis } from '../../lib/feasibility';
import { DEFAULT_SCENARIO } from '../../config/scenarios';
import { hint, errStyle, Field, NumberInput, Stack } from './wizardParts';
import FanChart from './FanChart';

const eur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n));
const pct = (n) => `${Math.round(n)}%`;
const pct1 = (n) => `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(n)}%`;
const roundUp10 = (n) => Math.ceil(n / 10) * 10;
const mono = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };

/**
 * Foglio di fattibilità: modifichi importo, data, rendita o versamento e vedi subito
 * se l'obiettivo è raggiungibile e se stai versando troppo poco, il giusto o più del necessario.
 * L'app non dice come investire: usa ipotesi di rendimento (o la composizione scelta dallo studente).
 *
 * @param {string} type
 * @param {Object} fields          campi del modulo (stringhe)
 * @param {(patch:Object)=>void} onFields
 * @param {number|string} monthlyExpenses
 * @param {string} scenario         id dell'ipotesi scelta ('prudent' | 'medium' | 'dynamic')
 * @param {(id:string)=>void} onScenario
 * @param {Object|null} declared    composizione dichiarata dallo studente (regole firmate)
 * @param {{value:number, invested:number}|null} positions  valore reale degli investimenti collegati (sostituisce il capitale dichiarato)
 * @param {Object} base             obiettivo salvato (mantiene id e date)
 * @param {string[]} [lockedKeys]   campi non modificabili qui
 */
export default function FeasibilitySheet({
  type, fields, onFields, monthlyExpenses, scenario, onScenario, declared = null, positions = null, base, now: nowProp,
}) {
  const now = useMemo(() => nowProp ?? new Date(), [nowProp]);
  // Con una composizione dichiarata il calcolo parte da quella; le altre ipotesi servono solo al confronto.
  const [picked, setPicked] = useState('declared');
  const active = declared ? picked : (scenario ?? DEFAULT_SCENARIO);
  const choose = (id) => { if (declared) setPicked(id); else onScenario?.(id); };

  const built = useMemo(
    () => goalFromFields(type, fields, { monthlyExpenses, now, scenario: declared ? base?.scenario : active, base }),
    [type, fields, monthlyExpenses, now, active, declared, base],
  );
  const goal = built.goal;
  const currentValue = positions ? positions.value : undefined;
  const costBasis = positions ? positions.invested : undefined;
  const allocation = goal ? allocationFor(goal, { scenarioId: active, declared }) : null;

  const rows = useMemo(() => (goal ? evaluateScenarios(goal, { declared, currentValue, costBasis, now, simulations: 600 }) : []), [goal, declared, currentValue, costBasis, now]);
  const result = useMemo(() => (goal ? evaluateFeasibility(goal, { allocation, currentValue, costBasis, now, simulations: 1500 }) : null), [goal, allocation, currentValue, costBasis, now]);

  // L'analisi del versamento richiede qualche decimo di secondo: parte dopo una breve pausa dalle modifiche.
  const [analysis, setAnalysis] = useState({ state: 'idle', value: null });
  useEffect(() => {
    if (!goal) { setAnalysis({ state: 'idle', value: null }); return undefined; }
    setAnalysis(a => ({ state: 'loading', value: a.value }));
    const t = setTimeout(() => {
      try { setAnalysis({ state: 'done', value: contributionAnalysis(goal, { allocation, currentValue, costBasis, now }) }); }
      catch { setAnalysis({ state: 'failed', value: null }); }
    }, 350);
    return () => clearTimeout(t);
  }, [goal, allocation, currentValue, costBasis, now]);

  const set = (k) => (v) => onFields({ [k]: v });
  const e = built.errors;
  const capitalLocked = !!positions;
  const isIncome = type === 'income';

  const info = result ? STATUS_INFO[result.evaluation.status] : null;
  const a = analysis.state === 'done' ? analysis.value : null;
  const stale = analysis.state === 'loading';

  return (
    <Stack gap="1.25rem">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem' }}>
        {type === 'emergency' ? (
          <Field id="fs-months" title="Mesi di spese da coprire" error={e.monthsCovered}>
            <select id="fs-months" className="select" value={fields.monthsCovered} onChange={(ev) => set('monthsCovered')(Number(ev.target.value))}>
              {MONTHS_COVERED.map(m => <option key={m} value={m}>{m} mesi</option>)}
            </select>
          </Field>
        ) : isIncome ? (
          <>
            <Field id="fs-withdraw" title="Rendita mensile (€ di oggi)" error={e.monthlyWithdrawal}><NumberInput id="fs-withdraw" value={fields.monthlyWithdrawal} onChange={set('monthlyWithdrawal')} /></Field>
            <Field id="fs-start" title="Inizio dei prelievi" error={e.withdrawalStartDate}>
              <input id="fs-start" className="input" type="month" value={fields.withdrawalStartDate} onChange={(ev) => set('withdrawalStartDate')(ev.target.value)} />
            </Field>
            <Field id="fs-other" title="Altri redditi al mese (€)" error={e.otherIncomeMonthly}><NumberInput id="fs-other" value={fields.otherIncomeMonthly} onChange={set('otherIncomeMonthly')} /></Field>
          </>
        ) : (
          <Field id="fs-amount" title="Importo (€ di oggi)" error={e.targetAmount}><NumberInput id="fs-amount" value={fields.targetAmount} onChange={set('targetAmount')} /></Field>
        )}
        {!isIncome && (
          <Field id="fs-date" title="Entro quando" error={e.targetDate}>
            <input id="fs-date" className="input" type="month" value={fields.targetDate} onChange={(ev) => set('targetDate')(ev.target.value)} />
          </Field>
        )}
        <Field id="fs-pac" title="Versamento mensile (€)" error={e.monthlyContribution}><NumberInput id="fs-pac" value={fields.monthlyContribution} onChange={set('monthlyContribution')} /></Field>
        <Field id="fs-capital" title={capitalLocked ? 'Capitale (dai tuoi investimenti)' : 'Già messo da parte (€)'} error={e.initialCapital}
          help={capitalLocked ? 'Uso il valore degli investimenti collegati a questo obiettivo.' : undefined}>
          {capitalLocked
            ? <input id="fs-capital" className="input" value={eur(positions.value)} readOnly aria-readonly="true" />
            : <NumberInput id="fs-capital" value={fields.initialCapital} onChange={set('initialCapital')} />}
        </Field>
      </div>

      {!goal && (
        <p role="alert" style={errStyle}>Completa i dati per vedere la fattibilità: {Object.values(e).slice(0, 2).join(' ')}</p>
      )}

      {goal && result && (
        <>
          <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)', border: `1px solid ${info.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: info.color }}>{info.label}</span>
              <span style={{ ...mono, fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-1)' }} aria-label="Probabilità di raggiungere l'obiettivo">
                {pct(result.evaluation.successProbability)}
              </span>
            </div>
            <div style={hint}>
              probabilità di avere almeno {eur(goal.targetAmount)} di oggi{isIncome ? ' all\'inizio dei prelievi' : ''}, dopo inflazione e tasse
            </div>
            <div style={{ ...hint, marginTop: '0.2rem' }}>{eur(goal.targetAmount)} di oggi ≈ {eur(result.nominalTarget)} nel {goal.targetDate.slice(0, 4)}</div>
          </div>

          {type !== 'emergency' ? (
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.5rem' }}>E se i mercati andassero così?</h3>
              <div role="radiogroup" aria-label="Ipotesi di rendimento" style={{ display: 'grid', gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`, gap: '0.5rem' }}>
                {rows.map(r => {
                  const on = active === r.id;
                  return (
                    <button key={r.id} type="button" role="radio" aria-checked={on} onClick={() => choose(r.id)}
                      style={{ textAlign: 'left', padding: '0.65rem', borderRadius: 10, cursor: 'pointer', minHeight: 0,
                        background: on ? 'var(--accent-weak)' : 'var(--surface-2)', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}` }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', fontWeight: 600 }}>{r.label}</div>
                      <div style={{ ...mono, fontSize: '1.15rem', fontWeight: 700, color: STATUS_INFO[r.status].color }}>{pct(r.probability)}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>rendimento reale ~{pct1(r.expectedRealReturn)}</div>
                    </button>
                  );
                })}
              </div>
              <p style={hint}>
                Sono ipotesi sull&apos;andamento dei mercati, non indicazioni su come investire.
                {declared ? ' «La tua composizione» è quella che hai scelto nelle regole.' : ' Quando sceglierai la tua composizione, il calcolo userà quella.'}
              </p>
            </div>
          ) : (
            <p style={hint}>Il fondo emergenza deve essere sempre disponibile: il calcolo assume liquidità.</p>
          )}

          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.6rem' }}>Il tuo versamento</h3>
            {!a && <p style={hint}>Calcolo in corso…</p>}
            {a && (
              <div style={{ opacity: stale ? 0.5 : 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }} aria-live="polite">
                {a.verdict === 'short' && (
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-1)' }} data-testid="contribution-verdict" data-verdict="short">
                    Stai versando <strong>{eur(a.current)}</strong> al mese: <strong style={{ color: 'var(--warn)' }}>troppo poco</strong>. Per arrivare al 75% servirebbero circa <strong>{eur(a.needed)}</strong> al mese ({eur(a.difference)} in più).
                  </p>
                )}
                {a.verdict === 'ok' && (
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-1)' }} data-testid="contribution-verdict" data-verdict="ok">
                    Il tuo versamento di <strong>{eur(a.current)}</strong> al mese è <strong style={{ color: 'var(--pos)' }}>adeguato</strong>{a.needed > 0 ? <>: il minimo per essere in linea è circa {eur(a.needed)}.</> : <>: il capitale che hai basta già.</>}
                  </p>
                )}
                {a.verdict === 'over' && (
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-1)' }} data-testid="contribution-verdict" data-verdict="over">
                    Stai versando <strong>{eur(a.current)}</strong> al mese: <strong style={{ color: 'var(--info)' }}>più del necessario</strong>. Per arrivare al 75% basterebbero circa <strong>{eur(a.needed)}</strong> al mese ({eur(-a.difference)} in meno).
                  </p>
                )}
                {a.verdict === 'unreachable' && (
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-1)' }} data-testid="contribution-verdict" data-verdict="unreachable">
                    Con questi numeri l&apos;obiettivo non è raggiungibile in modo realistico: cambia importo o data.
                  </p>
                )}
                <p style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
                  {isIncome
                    ? <>Con {eur(a.current)} al mese, la rendita raggiungibile (con probabilità 75%) è di circa <strong style={mono}>{eur(a.achievableIncome)}</strong> al mese.</>
                    : <>Con {eur(a.current)} al mese, la cifra raggiungibile (con probabilità 75%) è di circa <strong style={mono}>{eur(a.achievableAmount)}</strong>.</>}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {a.needed !== null && a.needed > 0 && a.verdict !== 'ok' && (
                    <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => onFields({ monthlyContribution: String(roundUp10(a.needed)) })}>
                      Imposta il versamento a {eur(roundUp10(a.needed))}
                    </button>
                  )}
                  {a.achievableAmount > 0 && type !== 'emergency' && (a.verdict === 'short' || a.verdict === 'unreachable') && (
                    isIncome
                      ? <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => onFields({ monthlyWithdrawal: String(Math.floor(a.achievableIncome / 10) * 10) })}>Imposta la rendita a {eur(Math.floor(a.achievableIncome / 10) * 10)}</button>
                      : <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => onFields({ targetAmount: String(a.achievableAmount) })}>Imposta l&apos;importo a {eur(a.achievableAmount)}</button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.6rem' }}>Cosa potresti ritrovare (€ di oggi)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.6rem', marginBottom: '0.6rem' }}>
              {[['Scenario peggiore', result.evaluation.percentiles.p5, 'var(--neg)'], ['Mediano', result.evaluation.percentiles.p50, 'var(--info)'], ['Scenario migliore', result.evaluation.percentiles.p95, 'var(--pos)']].map(([t, v, c]) => (
                <div key={t} className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{t}</div>
                  <div style={{ ...mono, fontWeight: 700, color: c }}>{eur(v)}</div>
                </div>
              ))}
            </div>
            <FanChart fan={result.evaluation.fan} target={goal.targetAmount} />
            <p style={hint}>Linea tratteggiata: il tuo obiettivo. Peggiore = 5° percentile, migliore = 95°.</p>
          </div>
          <p style={hint}>Simulazione basata su ipotesi dichiarate (rendimenti, inflazione, tasse). È una stima di fattibilità, non una previsione né una raccomandazione.</p>
        </>
      )}
    </Stack>
  );
}
