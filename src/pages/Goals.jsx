import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Target, ScrollText } from 'lucide-react';
import { useGoalData } from '../services/goalStore';
import { GOAL_TYPES, STATUS_INFO, evaluatePlan } from '../lib/goalModel';
import { describeRules } from '../lib/rulesModel';

const eur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n));
const monthIt = (ym) => new Date(`${ym}-01T12:00:00`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
const dateIt = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

function GoalCard({ goal, rules, now }) {
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
  const { goals, rules } = useGoalData();
  const now = useMemo(() => new Date(), []);

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
      {goals.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--text-2)', marginBottom: '0.75rem' }}>Non hai ancora definito nessun obiettivo.</p>
          <Link to="/guida/inizia" className="btn-primary">Inizia l&apos;esercizio</Link>
        </div>
      ) : (
        goals.map(g => (
          <GoalCard key={g.id} goal={g} now={now}
            rules={rules.filter(r => r.goalId === g.id && r.status === 'active').sort((a, b) => b.version - a.version)[0]} />
        ))
      )}
    </div>
  );
}
