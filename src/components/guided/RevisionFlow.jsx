import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { evaluatePlan, STATUS_INFO } from '../../lib/goalModel';
import { rulesToInput } from '../../lib/rulesModel';
import {
  LIFE_EVENTS, MIRROR_ANSWERS, COOLING_DAYS, editableGoalFields, diffChanges, applyGoalChanges,
  validateRevisionRequest, decideRevision, submitRevision,
} from '../../lib/revisionModel';
import { getMarketStress } from '../../services/marketStress';
import { saveAll } from '../../services/goalStore';
import { hint, errStyle, label, Field, NumberInput, Choice, Stack, StepRules } from './wizardParts';

const eur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n));
const dayIt = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

const FIELD_META = {
  targetAmount: { title: 'Importo che ti serve (€ di oggi)', kind: 'number' },
  targetDate: { title: 'Entro quando?', kind: 'month' },
  monthlyWithdrawal: { title: 'Prelievo mensile (€ di oggi)', kind: 'number' },
  withdrawalStartDate: { title: 'Quando inizi a prelevare?', kind: 'month' },
};

const WHY_KEYS = ['lifeEvent', 'lifeNote', 'mirror'];
const only = (errors, keys) => Object.fromEntries(Object.entries(errors).filter(([k]) => keys.includes(k)));
const without = (errors, keys) => Object.fromEntries(Object.entries(errors).filter(([k]) => !keys.includes(k)));

const COOLING_TEXT = 'Stai chiedendo di cambiare strategia mentre il mercato è in calo. Non è vietato: ti chiediamo solo di aspettare 7 giorni e riconfermare. La maggior parte degli errori costosi nasce in questi momenti.';

export default function RevisionFlow({ goal, rules, data, planned = false, onClose, onApplied }) {
  const now = useMemo(() => new Date(), []);
  const [step, setStep] = useState(0);
  const [goalChanges, setGoalChanges] = useState(() => Object.fromEntries(editableGoalFields(goal.type).map(f => [f, goal[f]])));
  const [rulesInput, setRulesInput] = useState(() => rulesToInput(rules));
  const [lifeEvent, setLifeEvent] = useState('');
  const [lifeNote, setLifeNote] = useState('');
  const [mirror, setMirror] = useState('');
  const [errors, setErrors] = useState({});
  const [stress, setStress] = useState({ state: 'idle', value: null });
  const [result, setResult] = useState(null);
  const [saveError, setSaveError] = useState('');

  const changes = useMemo(() => ({ goal: goalChanges, rules: rulesInput }), [goalChanges, rulesInput]);
  const diff = useMemo(() => diffChanges({ goal, rules, changes }), [goal, rules, changes]);
  const needsWhy = diff.structural && !planned;
  const request = { goalId: goal.id, changes, lifeEvent, lifeNote, mirror };
  const check = () => validateRevisionRequest({ ...request, goal, rules }, { now, planned }).errors;

  // Il mercato si controlla solo quando serve (anteprima di una modifica strutturale non pianificata).
  useEffect(() => {
    if (step !== 2 || !needsWhy) return undefined;
    let alive = true;
    setStress({ state: 'loading', value: null });
    getMarketStress().then(v => { if (alive) setStress({ state: 'done', value: v }); });
    return () => { alive = false; };
  }, [step, needsWhy]);

  const stressValue = stress.state === 'done' ? stress.value : null;
  const decision = step === 2 && (!needsWhy || stressValue)
    ? decideRevision({ structural: diff.structural, planned, stress: stressValue, lifeEvent, mirror })
    : null;

  const impact = useMemo(() => {
    if (step !== 2 || !diff.goalFields.length) return null;
    try {
      return {
        before: evaluatePlan(goal, { now, simulations: 1000 }),
        after: evaluatePlan(applyGoalChanges(goal, goalChanges, now), { now, simulations: 1000 }),
      };
    } catch { return null; }
  }, [step, diff.goalFields.length, goal, goalChanges, now]);

  const next = () => {
    const all = check();
    if (step === 0) {
      const e = without(all, WHY_KEYS);
      setErrors(e);
      if (Object.keys(e).length) return;
      setStep(needsWhy ? 1 : 2);
    } else if (step === 1) {
      const e = only(all, WHY_KEYS);
      setErrors(e);
      if (Object.keys(e).length) return;
      setStep(2);
    }
    window.scrollTo?.({ top: 0 });
  };
  const back = () => { setErrors({}); setStep(step === 2 && !needsWhy ? 0 : step - 1); };

  const send = () => {
    try {
      const out = submitRevision({
        goals: data.goals, rules: data.rules, revisions: data.revisions, request,
        stress: stressValue ?? { known: false, flag: false }, planned, now,
      });
      saveAll({ goals: out.goals, rules: out.rules, revisions: out.revisions });
      setResult(out);
      onApplied?.(out);
    } catch (err) {
      setSaveError(err.message);
    }
  };

  const setGoalField = (f, v) => setGoalChanges(c => ({ ...c, [f]: v }));
  const title = `Modifica · ${goal.name}`;

  if (result) {
    const cooling = result.outcome === 'cooling';
    return (
      <div className="card">
        <Stack>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)' }}>{cooling ? 'Modifica in attesa' : 'Modifica applicata'}</h2>
          {cooling ? (
            <>
              <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>{COOLING_TEXT}</p>
              <p style={{ color: 'var(--text-1)', fontSize: '0.9rem' }}>
                Potrai riconfermarla da <strong>{dayIt(result.revision.coolingUntil)}</strong>. Fino ad allora restano valide le regole attuali. Puoi annullarla quando vuoi.
              </p>
            </>
          ) : (
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
              Le nuove regole (versione {result.rules.filter(r => r.goalId === goal.id).length}) sono firmate e in vigore. La versione precedente resta nello storico.
            </p>
          )}
          <button type="button" className="btn-primary" onClick={onClose} style={{ alignSelf: 'flex-start' }}>Chiudi</button>
        </Stack>
      </div>
    );
  }

  return (
    <div className="card">
      <Stack gap="1.25rem">
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
            {planned ? 'Review pianificata' : 'Revisione'} · passo {Math.min(step + 1, needsWhy ? 3 : 2)} di {needsWhy ? 3 : 2}
          </div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)' }}>{title}</h2>
        </div>

        {step === 0 && (
          <Stack gap="1.5rem">
            <Stack>
              <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>Cambia solo ciò che ti serve. Gli importi sono in euro di oggi.</p>
              {editableGoalFields(goal.type).map(f => (
                <Field key={f} id={`rev-${f}`} title={FIELD_META[f].title} error={errors[f]}>
                  {FIELD_META[f].kind === 'month'
                    ? <input id={`rev-${f}`} className="input" type="month" value={goalChanges[f]} onChange={(e) => setGoalField(f, e.target.value)} />
                    : <NumberInput id={`rev-${f}`} value={goalChanges[f]} onChange={(v) => setGoalField(f, v)} />}
                </Field>
              ))}
            </Stack>
            <StepRules goal={goal} rules={rulesInput} setRules={setRulesInput} errors={errors} />
            {errors.changes && <p role="alert" style={errStyle}>{errors.changes}</p>}
          </Stack>
        )}

        {step === 1 && (
          <Stack gap="1.25rem">
            <div>
              <p style={{ ...label, fontSize: '0.92rem' }}>Cosa è cambiato nella tua vita?</p>
              <div role="radiogroup" aria-label="Cosa è cambiato" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {LIFE_EVENTS.map(o => <Choice key={o.value} selected={lifeEvent === o.value} onClick={() => setLifeEvent(o.value)} title={o.label} />)}
              </div>
              {errors.lifeEvent && <p role="alert" style={errStyle}>{errors.lifeEvent}</p>}
            </div>
            <Field id="rev-note" title={lifeEvent === 'none' || !lifeEvent ? 'Vuoi aggiungere una nota? (facoltativo)' : 'Racconta in poche parole'} error={errors.lifeNote}>
              <textarea id="rev-note" className="input" rows={3} value={lifeNote} onChange={(e) => setLifeNote(e.target.value)} />
            </Field>
            <div>
              <p style={{ ...label, fontSize: '0.92rem' }}>Se i mercati fossero ai massimi, faresti comunque questa modifica?</p>
              <div role="radiogroup" aria-label="Domanda specchio" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {MIRROR_ANSWERS.map(o => <Choice key={o.value} selected={mirror === o.value} onClick={() => setMirror(o.value)} title={o.label} />)}
              </div>
              {errors.mirror && <p role="alert" style={errStyle}>{errors.mirror}</p>}
            </div>
          </Stack>
        )}

        {step === 2 && (
          <Stack gap="1.25rem">
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.5rem' }}>Cosa cambia</h3>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-2)', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {diff.lines.map(l => <li key={l}>{l}</li>)}
              </ul>
            </div>

            {impact && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.6rem' }}>
                {[['Prima', impact.before], ['Dopo', impact.after]].map(([t, p]) => (
                  <div key={t} className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{t}</div>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: STATUS_INFO[p.evaluation.status].color }}>
                      {Math.round(p.evaluation.successProbability)}%
                    </div>
                    <div style={hint}>{STATUS_INFO[p.evaluation.status].label} · {eur(p.input.targetAmount)}</div>
                  </div>
                ))}
              </div>
            )}

            {needsWhy && (
              <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Il mercato oggi</div>
                {stress.state === 'loading' && <p style={{ ...hint, marginTop: 4 }}>Controllo in corso…</p>}
                {stressValue && stressValue.known && (
                  <p style={{ color: 'var(--text-1)', fontSize: '0.9rem', marginTop: 4 }}>
                    L&apos;indice azionario mondiale è sceso del <strong>{String(stressValue.benchmarkDrawdownPct).replace('.', ',')}%</strong> dal massimo degli ultimi 60 giorni
                    {stressValue.asOf ? ` (dato al ${dayIt(stressValue.asOf)})` : ''}.
                  </p>
                )}
                {stressValue && !stressValue.known && (
                  <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginTop: 4 }}>
                    Non riusciamo a verificare l&apos;andamento del mercato in questo momento: per prudenza trattiamo la modifica come se il mercato fosse in calo.
                  </p>
                )}
              </div>
            )}

            {decision && (
              <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)', border: `1px solid ${decision.cooling ? 'var(--warn)' : 'var(--border)'}` }}>
                {decision.cooling ? (
                  <>
                    <strong style={{ color: 'var(--warn)' }}>Attesa di {COOLING_DAYS} giorni</strong>
                    <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginTop: 6 }}>{COOLING_TEXT}</p>
                  </>
                ) : (
                  <>
                    <strong style={{ color: 'var(--text-1)' }}>Si applica subito</strong>
                    <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginTop: 6 }}>
                      {decision.appliedDuringStress
                        ? 'Il mercato è in calo, ma la causa è un cambiamento reale nella tua vita: la modifica verrà segnata come tale nello storico.'
                        : 'Verrà creata una nuova versione firmata delle regole. La precedente resta nello storico.'}
                    </p>
                  </>
                )}
              </div>
            )}
            {saveError && <p role="alert" style={errStyle}>{saveError}</p>}
          </Stack>
        )}

        <div className="flow-actions above-nav">
          <button type="button" className="btn-secondary" onClick={step === 0 ? onClose : back} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={16} /> {step === 0 ? 'Annulla' : 'Indietro'}
          </button>
          {step < 2
            ? <button type="button" className="btn-primary" onClick={next} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Avanti <ArrowRight size={16} /></button>
            : <button type="button" className="btn-primary" onClick={send} disabled={!decision}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Check size={16} /> {decision?.cooling ? `Avvia l'attesa di ${COOLING_DAYS} giorni` : 'Applica la modifica'}
              </button>}
        </div>
      </Stack>
    </div>
  );
}
