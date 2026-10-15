import { useMemo, useState } from 'react';
import { ScrollText, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { useGoalData, saveAll, recordReview } from '../services/goalStore';
import { describeRules } from '../lib/rulesModel';
import {
  activeRules, pendingRevision, coolingStatus, confirmRevision, cancelRevision, reviewsDue, nextReviewAt, COOLING_DAYS,
} from '../lib/revisionModel';
import RevisionFlow from '../components/guided/RevisionFlow';
import { Choice, Field, Stack, errStyle, hint, label } from '../components/guided/wizardParts';

const dayIt = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
const badge = (color) => ({ fontSize: '0.7rem', fontWeight: 600, color, border: `1px solid ${color}`, borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' });

function PendingCard({ revision, data, now }) {
  const status = coolingStatus(revision, now);
  const [signing, setSigning] = useState(false);
  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  const confirm = () => {
    try {
      const out = confirmRevision({ goals: data.goals, rules: data.rules, revisions: data.revisions, revisionId: revision.id, signedName: name, accepted, now: new Date() });
      saveAll(out);
    } catch (e) { setError(e.message); }
  };
  const cancel = () => saveAll({ goals: data.goals, rules: data.rules, revisions: cancelRevision({ revisions: data.revisions, revisionId: revision.id }) });

  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--warn)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--warn)' }}><Clock size={15} /> Modifica in attesa</div>
      <ul style={{ margin: '0.5rem 0', paddingLeft: '1.1rem', fontSize: '0.85rem', color: 'var(--text-2)' }}>
        {revision.summary.map(l => <li key={l}>{l}</li>)}
      </ul>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
        Hai chiesto di cambiare strategia con il mercato in calo: per {COOLING_DAYS} giorni restano valide le regole attuali.
        {status.ready ? ' Ora puoi riconfermarla o annullarla.' : ` Potrai riconfermarla dal ${dayIt(status.until)} (tra ${status.daysLeft} ${status.daysLeft === 1 ? 'giorno' : 'giorni'}).`}
      </p>
      {signing && (
        <div style={{ marginTop: '0.75rem' }}>
          <Stack gap="0.75rem">
            <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: 4 }} />
              <span style={{ fontSize: '0.88rem', color: 'var(--text-1)' }}>Confermo la modifica e mi impegno a seguire le nuove regole.</span>
            </label>
            <Field id={`confirm-name-${revision.id}`} title="Nome e cognome">
              <input id={`confirm-name-${revision.id}`} className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            {error && <p role="alert" style={errStyle}>{error}</p>}
          </Stack>
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        {status.ready && !signing && <button type="button" className="btn-primary" onClick={() => setSigning(true)}>Riconferma</button>}
        {status.ready && signing && <button type="button" className="btn-primary" onClick={confirm}>Firma e applica</button>}
        <button type="button" className="btn-secondary" onClick={cancel}>Annulla la modifica</button>
      </div>
    </div>
  );
}

function History({ goal, data }) {
  const versions = data.rules.filter(r => r.goalId === goal.id).map(r => ({ kind: 'rules', at: r.signedAt, item: r }));
  const cancelled = data.revisions.filter(r => r.goalId === goal.id && r.status === 'cancelled').map(r => ({ kind: 'cancelled', at: r.cancelledAt, item: r }));
  const events = [...versions, ...cancelled].sort((a, b) => new Date(b.at) - new Date(a.at));
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {events.map(({ kind, at, item }) => (
        <li key={item.id} style={{ borderLeft: '2px solid var(--border)', paddingLeft: '0.75rem' }}>
          {kind === 'rules' ? (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-1)', fontWeight: 600 }}>
                Versione {item.version} · {dayIt(at)}
                {item.status === 'active' && <span style={badge('var(--pos)')}>In vigore</span>}
                {item.status === 'superseded' && <span style={badge('var(--text-3)')}>Sostituita</span>}
                {item.appliedDuringStress && <span style={badge('var(--warn)')}>Durante un calo di mercato</span>}
              </div>
              <div style={hint}>Firmata da {item.signedName}</div>
              {item.changes?.length > 0 && (
                <ul style={{ margin: '0.3rem 0 0', paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                  {item.changes.map(l => <li key={l}>{l}</li>)}
                </ul>
              )}
              {item.changeReason && <div style={{ ...hint, color: 'var(--text-2)' }}>Motivo: {item.changeReason}</div>}
            </>
          ) : (
            <>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 600 }}>Modifica annullata · {dayIt(at)}</div>
              <div style={hint}>{item.summary.join(' · ')}</div>
            </>
          )}
        </li>
      ))}
    </ol>
  );
}

function ReviewCard({ due, onChange }) {
  const [answers, setAnswers] = useState({ life: '', pac: '', rules: '' });
  const [error, setError] = useState('');
  const ask = [
    ['life', 'È cambiato qualcosa nella tua vita?', [['no', 'No, è tutto come prima'], ['yes', 'Sì']]],
    ['pac', 'Il versamento mensile è ancora sostenibile?', [['yes', 'Sì'], ['no', 'No']]],
    ['rules', 'Le tue regole sono ancora quelle giuste?', [['yes', 'Sì'], ['no', 'No, vorrei cambiarle']]],
  ];
  const unchanged = answers.life === 'no' && answers.pac === 'yes' && answers.rules === 'yes';

  const submit = () => {
    if (!answers.life || !answers.pac || !answers.rules) { setError('Rispondi a tutte e tre le domande.'); return; }
    setError('');
    if (unchanged) { recordReview(); return; }
    onChange({ planned: true, goalId: due[0].goal.id });
  };

  return (
    <div className="card" style={{ border: '1px solid var(--accent)' }}>
      <Stack gap="1rem">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text-1)' }}><ShieldCheck size={16} /> È il momento della review</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
          Tre domande per controllare che regole e obiettivi vadano ancora bene
          {due.length === 1 ? ` (${due[0].goal.name})` : ` (${due.map(d => d.goal.name).join(', ')})`}.
        </p>
        {ask.map(([key, q, options]) => (
          <div key={key}>
            <p style={{ ...label, fontSize: '0.92rem' }}>{q}</p>
            <div role="radiogroup" aria-label={q} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {options.map(([v, t]) => <Choice key={v} selected={answers[key] === v} onClick={() => setAnswers(a => ({ ...a, [key]: v }))} title={t} />)}
            </div>
          </div>
        ))}
        {error && <p role="alert" style={errStyle}>{error}</p>}
        <button type="button" className="btn-primary" onClick={submit} style={{ alignSelf: 'flex-start' }}>
          {unchanged ? 'Tutto invariato: concludi la review' : 'Continua'}
        </button>
        {answers.pac === 'no' && <p style={hint}>Il versamento mensile si cambia da «I miei obiettivi».</p>}
      </Stack>
    </div>
  );
}

export default function Rules() {
  const data = useGoalData();
  const now = useMemo(() => new Date(), []);
  const [editing, setEditing] = useState(null); // { goalId, planned }

  const due = reviewsDue({ goals: data.goals, rules: data.rules, lastReviewAt: data.progress.lastReviewAt, now });
  const editingGoal = editing && data.goals.find(g => g.id === editing.goalId);
  const editingRules = editingGoal && activeRules(data.rules, editingGoal.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 className="page-title" style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ScrollText size={20} /> Le mie regole
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginTop: 4 }}>
          Sono le regole che hai scelto e firmato. Puoi cambiarle, ma le modifiche importanti hanno un passaggio in più: servono a proteggerti dalle decisioni prese di fretta.
        </p>
      </div>

      {editingGoal && editingRules ? (
        <RevisionFlow
          key={editingGoal.id}
          goal={editingGoal} rules={editingRules} data={data} planned={editing.planned}
          onApplied={() => { if (editing.planned) recordReview(); }}
          onClose={() => setEditing(null)}
        />
      ) : (
        <>
          {due.length > 0 && !data.revisions.some(r => r.status === 'pending') && (
            <ReviewCard due={due} onChange={setEditing} />
          )}
          {data.goals.length === 0 && <div className="card"><p style={{ color: 'var(--text-2)' }}>Non hai ancora regole firmate: completa l&apos;esercizio Obiettivi.</p></div>}
          {data.goals.map(goal => {
            const rules = activeRules(data.rules, goal.id);
            const pending = pendingRevision(data.revisions, goal.id);
            return (
              <div key={goal.id} className="card">
                <Stack gap="1rem">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'baseline' }}>
                    <strong style={{ color: 'var(--text-1)' }}>{goal.name}</strong>
                    {rules && <span style={hint}>Versione {rules.version} · firmata il {dayIt(rules.signedAt)} da {rules.signedName}</span>}
                  </div>
                  {rules && (
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {describeRules(rules).map((l, i) => <div key={i}>{l}</div>)}
                      <div style={{ ...hint }}>Frase tua: «{rules.crashPlan.personalNote}»</div>
                      <div style={hint}>Prossima review: {dayIt(nextReviewAt({ rules, lastReviewAt: data.progress.lastReviewAt }))}</div>
                    </div>
                  )}
                  {pending && <PendingCard revision={pending} data={data} now={now} />}
                  {rules && !pending && (
                    <button type="button" className="btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setEditing({ goalId: goal.id, planned: false })}>
                      Modifica
                    </button>
                  )}
                  {pending && <p style={{ ...hint, display: 'flex', gap: 6, alignItems: 'center' }}><AlertTriangle size={13} /> Finché la modifica è in attesa non puoi chiederne un&apos;altra.</p>}
                  <details>
                    <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-2)' }}>Storico delle versioni</summary>
                    <div style={{ marginTop: '0.75rem' }}><History goal={goal} data={data} /></div>
                  </details>
                </Stack>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
