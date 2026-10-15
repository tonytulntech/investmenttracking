import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Target, ScrollText, ChevronDown, ChevronUp } from 'lucide-react';
import { useGoalData, saveGoals } from '../services/goalStore';
import { useGoalProgress, progressAmounts } from '../services/goalProgress';
import { GOAL_TYPES, STATUS_INFO, fieldsFromGoal, goalFromFields } from '../lib/goalModel';
import { allocationFor, evaluateFeasibility, contributionAnalysis } from '../lib/feasibility';
import { describeRules, allocationTotal, normalizeAllocation } from '../lib/rulesModel';
import { activeRules, coolingStatus, reviewsDue, editableGoalFields } from '../lib/revisionModel';
import FeasibilitySheet from '../components/guided/FeasibilitySheet';
import { hint, errStyle } from '../components/guided/wizardParts';

const eur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n));
const monthIt = (ym) => new Date(`${ym}-01T12:00:00`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
const dateIt = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
const mono = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };

const declaredOf = (rules) => (rules?.allocation && allocationTotal(rules.allocation) === 100 ? normalizeAllocation(rules.allocation) : null);

const VERDICT_TEXT = {
  short: ['Versi troppo poco', 'var(--warn)'],
  ok: ['Versamento adeguato', 'var(--pos)'],
  over: ['Versi più del necessario', 'var(--info)'],
  unreachable: ['Obiettivo da rivedere', 'var(--neg)'],
};

/** Foglio di fattibilità di un obiettivo già salvato: prova i cambiamenti, poi salva (o passa dalla revisione se le regole sono firmate). */
function GoalSheet({ goal, rules, progress, goals, now, onClose }) {
  const navigate = useNavigate();
  const [fields, setFields] = useState(() => fieldsFromGoal(goal));
  const [scenario, setScenario] = useState(goal.scenario);
  const [error, setError] = useState('');
  const declared = declaredOf(rules);

  const built = useMemo(() => goalFromFields(goal.type, fields, { monthlyExpenses: goal.monthlyExpenses, now, scenario, base: goal }), [fields, goal, now, scenario]);
  const dirty = JSON.stringify(fields) !== JSON.stringify(fieldsFromGoal(goal)) || scenario !== goal.scenario;

  const save = () => {
    if (!built.goal) { setError('Correggi i dati prima di salvare.'); return; }
    const structural = editableGoalFields(goal.type).filter(f => String(built.goal[f]) !== String(goal[f]));
    if (rules && structural.length) {
      // Con le regole firmate, i cambiamenti importanti passano dalla revisione (può esserci l'attesa di 7 giorni).
      const direct = goals.map(g => (g.id === goal.id
        ? { ...g, initialCapital: built.goal.initialCapital, monthlyContribution: built.goal.monthlyContribution, scenario: built.goal.scenario, updatedAt: now.toISOString() }
        : g));
      saveGoals(direct);
      navigate('/regole', { state: { revise: { goalId: goal.id, goalChanges: Object.fromEntries(structural.map(f => [f, built.goal[f]])) } } });
      return;
    }
    saveGoals(goals.map(g => (g.id === goal.id ? { ...built.goal, updatedAt: now.toISOString() } : g)));
    setError('');
    onClose();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
      <FeasibilitySheet
        type={goal.type} fields={fields} onFields={(p) => setFields(f => ({ ...f, ...p }))}
        monthlyExpenses={goal.monthlyExpenses} scenario={scenario} onScenario={setScenario}
        declared={declared} positions={progress} base={goal} now={now}
      />
      {rules && <p style={hint}>Hai firmato le regole: se cambi importo, data o rendita ti accompagno nella revisione, con la tua firma.</p>}
      {error && <p role="alert" style={errStyle}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn-primary" disabled={!dirty} onClick={save}>{rules ? 'Continua' : 'Salva le modifiche'}</button>
        <button type="button" className="btn-secondary" onClick={onClose}>{dirty ? 'Annulla' : 'Chiudi'}</button>
      </div>
    </div>
  );
}

function GoalCard({ goal, goals, rules, progress, progressReady, now }) {
  const [open, setOpen] = useState(false);
  const declared = declaredOf(rules);
  const positions = progress?.hasPositions ? progress : null;
  const allocation = useMemo(() => allocationFor(goal, { scenarioId: declared ? 'declared' : undefined, declared }), [goal, declared]);
  const ev = useMemo(
    () => evaluateFeasibility(goal, { allocation, currentValue: positions?.value, costBasis: positions?.invested, now, simulations: 1000 }),
    [goal, allocation, positions?.value, positions?.invested, now],
  );
  const info = STATUS_INFO[ev.evaluation.status];

  const [analysis, setAnalysis] = useState(null);
  useEffect(() => {
    if (!progressReady) return undefined;
    setAnalysis(null);
    const t = setTimeout(() => {
      try { setAnalysis(contributionAnalysis(goal, { allocation, currentValue: positions?.value, costBasis: positions?.invested, now })); } catch { setAnalysis(null); }
    }, 400);
    return () => clearTimeout(t);
  }, [goal, allocation, positions?.value, positions?.invested, now, progressReady]);

  const value = positions ? positions.value : goal.initialCapital;
  const prog = progressAmounts(goal.targetAmount, value);
  const verdict = analysis ? VERDICT_TEXT[analysis.verdict] : null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} data-testid={`goal-${goal.id}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-1)' }}>{goal.name}</div>
          {GOAL_TYPES[goal.type]?.label !== goal.name && <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{GOAL_TYPES[goal.type]?.label}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: info.color, fontWeight: 700 }}>{info.label}</div>
          <div style={{ ...mono, fontSize: '0.85rem', color: 'var(--text-2)' }}>{Math.round(ev.evaluation.successProbability)}% di probabilità</div>
        </div>
      </div>

      <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
        <span style={mono}>{eur(goal.targetAmount)}</span> di oggi, entro {monthIt(goal.targetDate)}
      </div>

      <div>
        <div role="progressbar" aria-valuenow={Math.round(prog.percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Avanzamento verso l'obiettivo"
          style={{ height: 8, borderRadius: 4, background: 'var(--surface-2)' }}>
          <div style={{ height: 8, borderRadius: 4, width: `${prog.percent}%`, background: 'var(--accent)', transition: 'width 0.3s' }} />
        </div>
        <div style={{ ...hint, display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span>
            {positions ? <>Investito oggi <span style={mono}>{eur(value)}</span> ({Math.round(prog.percent)}%)</> : <>Capitale dichiarato <span style={mono}>{eur(value)}</span> ({Math.round(prog.percent)}%)</>}
          </span>
          <span>{prog.reached ? 'Importo raggiunto' : <>Mancano <span style={mono}>{eur(prog.remaining)}</span></>}</span>
        </div>
        {!positions && <div style={hint}>Nessun investimento collegato: <Link to="/mio-portafoglio" style={{ color: 'var(--accent)' }}>collega le tue operazioni</Link> per vedere i progressi reali.</div>}
        {positions?.unpriced?.length > 0 && <div style={{ ...hint, color: 'var(--warn)' }}>Prezzo non disponibile per {positions.unpriced.join(', ')}: valore calcolato al costo.</div>}
      </div>

      <div style={{ fontSize: '0.85rem', minHeight: '1.3em' }} aria-live="polite">
        {verdict && analysis && (
          <span data-testid="card-verdict" data-verdict={analysis.verdict}>
            <strong style={{ color: verdict[1] }}>{verdict[0]}</strong>
            <span style={{ color: 'var(--text-2)' }}>
              {' · '}{eur(analysis.current)}/mese
              {analysis.verdict === 'short' && <> (servirebbero circa {eur(analysis.needed)})</>}
              {analysis.verdict === 'over' && <> (ne basterebbero circa {eur(analysis.needed)})</>}
            </span>
          </span>
        )}
      </div>

      <button type="button" className="btn-secondary" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Fattibilità e modifiche
      </button>
      {open && <GoalSheet goal={goal} rules={rules} progress={positions} goals={goals} now={now} onClose={() => setOpen(false)} />}

      {rules ? (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
            <ScrollText size={14} /> Le tue regole · firmate il {dateIt(rules.signedAt)}
          </div>
          {describeRules(rules).map((line, i) => <div key={i}>{line}</div>)}
        </div>
      ) : (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-2)' }}>
          Quando sei pronto, firma le tue regole per questo obiettivo. <Link to="/regole" style={{ color: 'var(--accent)' }}>Firma le regole →</Link>
        </div>
      )}
    </div>
  );
}

export default function Goals() {
  const { goals, rules, revisions, progress } = useGoalData();
  const now = useMemo(() => new Date(), []);
  const active = useMemo(() => goals.filter(g => g.status === 'active'), [goals]);
  const prog = useGoalProgress(active);

  const pending = revisions.filter(r => r.status === 'pending');
  const ready = pending.filter(r => coolingStatus(r, now).ready);
  const due = reviewsDue({ goals, rules, lastReviewAt: progress.lastReviewAt, now });
  const unsigned = active.filter(g => !activeRules(rules, g.id));
  // Un solo avviso in cima, in ordine di priorità: modifica pronta da riconfermare → review scaduta → modifica in attesa.
  const alert = ready.length ? 'Una tua modifica è pronta da riconfermare.'
    : due.length ? 'È il momento della review delle tue regole.'
    : pending.length ? 'Hai una modifica in attesa: i 7 giorni non sono ancora passati.' : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 className="page-title" style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={20} /> I miei obiettivi
        </h1>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: 6, fontSize: '0.85rem' }}>
          <Link to="/mio-portafoglio" style={{ color: 'var(--accent)' }}>Il mio portafoglio</Link>
          <Link to="/regole" style={{ color: 'var(--accent)' }}>Le mie regole</Link>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginTop: 8 }}>
          Importi in euro di oggi, al netto delle tasse. Sono stime di fattibilità basate su simulazioni: non sono previsioni né consigli.
        </p>
      </div>
      {alert && (
        <Link to="/regole" className="card" style={{ border: '1px solid var(--warn)', color: 'var(--text-1)', textDecoration: 'none', fontSize: '0.9rem' }}>
          {alert} <span style={{ color: 'var(--accent)' }}>Apri «Le mie regole» →</span>
        </Link>
      )}
      {!alert && unsigned.length > 0 && active.length > 0 && (
        <Link to="/regole" className="card" style={{ color: 'var(--text-1)', textDecoration: 'none', fontSize: '0.9rem' }}>
          Puoi modificare gli obiettivi liberamente finché non firmi le regole. <span style={{ color: 'var(--accent)' }}>Firma le regole →</span>
        </Link>
      )}
      {goals.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--text-2)', marginBottom: '0.75rem' }}>Non hai ancora definito nessun obiettivo.</p>
          <Link to="/guida/inizia" className="btn-primary">Inizia l&apos;esercizio</Link>
        </div>
      ) : (
        active.map(g => (
          <GoalCard key={g.id} goal={g} goals={goals} now={now}
            rules={activeRules(rules, g.id)} progress={prog.byGoal[g.id]} progressReady={prog.status === 'done'} />
        ))
      )}
    </div>
  );
}
