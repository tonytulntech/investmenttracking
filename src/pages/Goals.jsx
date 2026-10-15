import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Target, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { useGoalData, saveGoals } from '../services/goalStore';
import { coolingStatus, reviewsDue } from '../lib/revisionModel';
import { GOAL_TYPES, STATUS_INFO, evaluatePlan } from '../lib/goalModel';
import { describeRules } from '../lib/rulesModel';

const eur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n));
const monthIt = (ym) => new Date(`${ym}-01T12:00:00`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
const dateIt = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

function Contribution({ goal, goals }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(goal.monthlyContribution));
  const [error, setError] = useState('');
  const save = () => {
    const n = Number(value);
    if (value === '' || !(n >= 0)) { setError('Inserisci un importo (anche 0).'); return; }
    saveGoals(goals.map(g => (g.id === goal.id ? { ...g, monthlyContribution: n, updatedAt: new Date().toISOString() } : g)));
    setEditing(false); setError('');
  };
  if (!editing) {
    return (
      <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
        Versamento mensile: <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{eur(goal.monthlyContribution)}</span>
        <button type="button" className="btn-secondary" style={{ padding: '0.25rem 0.7rem', fontSize: '0.75rem' }} onClick={() => setEditing(true)}>Modifica</button>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label htmlFor={`pac-${goal.id}`} style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Versamento mensile (€)</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input id={`pac-${goal.id}`} className="input" type="number" min={0} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} style={{ maxWidth: 160 }} />
        <button type="button" className="btn-primary" onClick={save}>Salva</button>
        <button type="button" className="btn-secondary" onClick={() => { setEditing(false); setError(''); }}>Annulla</button>
      </div>
      {error && <p role="alert" style={{ fontSize: '0.78rem', color: 'var(--neg)' }}>{error}</p>}
    </div>
  );
}

function GoalCard({ goal, goals, rules, now }) {
  const plan = useMemo(() => evaluatePlan(goal, { now, simulations: 1000 }), [goal, now]);
  const info = STATUS_INFO[plan.evaluation.status];
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-1)' }}>{goal.name}</div>
          {GOAL_TYPES[goal.type]?.label !== goal.name && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{GOAL_TYPES[goal.type]?.label}</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: info.color, fontWeight: 700 }}>{info.label}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem', color: 'var(--text-2)' }}>
            {Math.round(plan.evaluation.successProbability)}% di probabilità
          </div>
        </div>
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{eur(goal.targetAmount)}</span> di oggi, entro {monthIt(goal.targetDate)}
      </div>
      <Contribution goal={goal} goals={goals} />
      {rules && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
            <ScrollText size={14} /> Le tue regole · firmate il {dateIt(rules.signedAt)}
          </div>
          {describeRules(rules).map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}
    </div>
  );
}

export default function Goals() {
  const { goals, rules, revisions, progress } = useGoalData();
  const now = useMemo(() => new Date(), []);
  const pending = revisions.filter(r => r.status === 'pending');
  const ready = pending.filter(r => coolingStatus(r, now).ready);
  const due = reviewsDue({ goals, rules, lastReviewAt: progress.lastReviewAt, now });
  // Un solo avviso in cima, in ordine di priorità (§5.1): modifica pronta da riconfermare → review scaduta → modifica in attesa.
  const alert = ready.length ? 'Una tua modifica è pronta da riconfermare.'
    : due.length ? 'È il momento della review delle tue regole.'
    : pending.length ? 'Hai una modifica in attesa: i 7 giorni non sono ancora passati.' : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 className="page-title" style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={20} /> I miei obiettivi
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginTop: 4 }}>
          Importi in euro di oggi, al netto delle tasse. Stime basate su simulazioni: non sono previsioni né consigli.
        </p>
      </div>
      {alert && (
        <Link to="/regole" className="card" style={{ border: '1px solid var(--warn)', color: 'var(--text-1)', textDecoration: 'none', fontSize: '0.9rem' }}>
          {alert} <span style={{ color: 'var(--accent)' }}>Apri «Le mie regole» →</span>
        </Link>
      )}
      {goals.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--text-2)', marginBottom: '0.75rem' }}>Non hai ancora definito nessun obiettivo.</p>
          <Link to="/guida/inizia" className="btn-primary">Inizia l&apos;esercizio</Link>
        </div>
      ) : (
        goals.map(g => (
          <GoalCard key={g.id} goal={g} goals={goals} now={now}
            rules={rules.filter(r => r.goalId === g.id && r.status === 'active').sort((a, b) => b.version - a.version)[0]} />
        ))
      )}
    </div>
  );
}
