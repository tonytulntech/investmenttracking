import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import {
  GOAL_TYPES, MONTHS_COVERED, STATUS_INFO, validateGoalInput, incomeTarget, incomeHorizon, goalFromFields,
} from '../lib/goalModel';
import { evaluateFeasibility, allocationFor } from '../lib/feasibility';
import { hint, errStyle, Field, NumberInput, Choice, Stack } from '../components/guided/wizardParts';
import FeasibilitySheet from '../components/guided/FeasibilitySheet';
import { DEFAULT_SCENARIO } from '../config/scenarios';
import { getDraft, saveDraft, completeOnboarding } from '../services/goalStore';

const eur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n));
const pct = (n) => `${Math.round(n)}%`;
const monthIt = (ym) => new Date(`${ym}-01T12:00:00`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
const TYPE_ORDER = ['emergency', 'house', 'education', 'custom', 'income'];

const defaultGoalFields = (type) => ({
  name: type === 'custom' ? '' : GOAL_TYPES[type].label,
  initialCapital: '', monthlyContribution: '',
  taxResidence: { country: 'IT', customRate: '' },
  targetAmount: '', targetDate: '',
  monthsCovered: 6,
  birthYear: '', withdrawalStartDate: '', monthlyWithdrawal: '', otherIncomeMonthly: '0', horizonEndAge: 95,
});

const initialState = (draft) => ({
  stepIndex: 0, monthlyExpenses: '', types: [], goals: {}, scenarios: {},
  ...(draft && typeof draft === 'object' ? draft : {}),
});

const buildSteps = (types) => {
  const ordered = TYPE_ORDER.filter(t => types.includes(t));
  return [
    { id: 'intro' }, { id: 'types' },
    ...ordered.map(t => ({ id: `goal:${t}`, kind: 'goal', type: t })),
    ...ordered.map(t => ({ id: `plan:${t}`, kind: 'plan', type: t })),
    { id: 'done' },
  ];
};

// ── Passi ───────────────────────────────────────────────────────────────────
function StepIntro({ state, set, errors }) {
  return (
    <Stack>
      <p style={{ color: 'var(--text-2)', fontSize: '0.92rem' }}>
        In questo esercizio scegli due o tre obiettivi, controlli se sono raggiungibili e li salvi. Più avanti collegherai i tuoi investimenti
        e l&apos;app ti dirà a che punto sei e quanto manca. Puoi riprendere da dove hai lasciato.
      </p>
      <Field id="expenses" title="Quanto spendi in media al mese? (€)" error={errors.monthlyExpenses}
        help="Serve per calcolare il fondo emergenza e quanto ti servirebbe per vivere di rendita.">
        <NumberInput id="expenses" value={state.monthlyExpenses} onChange={(v) => set({ monthlyExpenses: v })} placeholder="es. 2000" />
      </Field>
    </Stack>
  );
}

function StepTypes({ state, set, errors }) {
  const toggle = (t) => set({ types: state.types.includes(t) ? state.types.filter(x => x !== t) : [...state.types, t] });
  return (
    <Stack>
      <p style={{ color: 'var(--text-2)', fontSize: '0.92rem' }}>Scegli gli obiettivi che vuoi pianificare: di solito bastano due o tre.</p>
      <div role="group" aria-label="Obiettivi" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {TYPE_ORDER.map(t => (
          <Choice key={t} role="checkbox" selected={state.types.includes(t)} onClick={() => toggle(t)}
            title={GOAL_TYPES[t].label} text={GOAL_TYPES[t].hint} />
        ))}
      </div>
      {errors.types && <p role="alert" style={errStyle}>{errors.types}</p>}
    </Stack>
  );
}

function TaxField({ value, onChange, error, idPrefix }) {
  return (
    <div>
      <Field id={`${idPrefix}-tax`} title="Dove sarai residente quando ritirerai il capitale?" error={error}
        help="Serve per stimare le tasse sulle plusvalenze. È una stima indicativa: verifica con un professionista fiscale.">
        <select id={`${idPrefix}-tax`} className="select" value={value.country} onChange={(e) => onChange({ ...value, country: e.target.value })}>
          <option value="IT">Italia (plusvalenze al 26%)</option>
          <option value="OTHER">Altro paese (inserisco io l&apos;aliquota)</option>
        </select>
      </Field>
      {value.country === 'OTHER' && (
        <div style={{ marginTop: '0.75rem' }}>
          <Field id={`${idPrefix}-rate`} title="Aliquota sulle plusvalenze (%)">
            <NumberInput id={`${idPrefix}-rate`} value={value.customRate} onChange={(v) => onChange({ ...value, customRate: v })} placeholder="es. 19" />
          </Field>
        </div>
      )}
    </div>
  );
}

function StepGoal({ type, state, set, errors }) {
  const f = state.goals[type] ?? defaultGoalFields(type);
  const upd = (patch) => set({ goals: { ...state.goals, [type]: { ...f, ...patch } } });
  const e = errors;
  const inc = type === 'income' && f.birthYear && f.withdrawalStartDate && f.monthlyWithdrawal && Number(f.monthlyWithdrawal) > Number(f.otherIncomeMonthly || 0)
    ? (() => { try { return { ...incomeTarget(f), ...incomeHorizon(f) }; } catch { return null; } })() : null;
  return (
    <Stack>
      <p style={{ color: 'var(--text-2)', fontSize: '0.92rem' }}>{GOAL_TYPES[type].hint} Tutti gli importi sono in euro di oggi.</p>
      <Field id="g-name" title="Nome dell'obiettivo" error={e.name}>
        <input id="g-name" className="input" value={f.name} onChange={(ev) => upd({ name: ev.target.value })} maxLength={60} />
      </Field>

      {type === 'emergency' && (
        <>
          <Field id="g-months" title="Quanti mesi di spese vuoi coprire?" error={e.monthsCovered}>
            <select id="g-months" className="select" value={f.monthsCovered} onChange={(ev) => upd({ monthsCovered: Number(ev.target.value) })}>
              {MONTHS_COVERED.map(m => <option key={m} value={m}>{m} mesi</option>)}
            </select>
          </Field>
          <p style={{ ...hint, marginTop: 0 }}>Importo da raggiungere: <strong style={{ color: 'var(--text-1)' }}>{eur(Number(state.monthlyExpenses) * Number(f.monthsCovered))}</strong></p>
          <Field id="g-date" title="Entro quando vuoi completarlo?" error={e.targetDate}>
            <input id="g-date" className="input" type="month" value={f.targetDate} onChange={(ev) => upd({ targetDate: ev.target.value })} />
          </Field>
        </>
      )}

      {(type === 'house' || type === 'education' || type === 'custom') && (
        <>
          <Field id="g-amount" title="Quanto ti serve? (€ di oggi)" error={e.targetAmount}>
            <NumberInput id="g-amount" value={f.targetAmount} onChange={(v) => upd({ targetAmount: v })} placeholder="es. 100000" />
          </Field>
          <Field id="g-date" title="Entro quando?" error={e.targetDate}>
            <input id="g-date" className="input" type="month" value={f.targetDate} onChange={(ev) => upd({ targetDate: ev.target.value })} />
          </Field>
        </>
      )}

      {type === 'income' && (
        <>
          <Field id="g-birth" title="In che anno sei nato?" error={e.birthYear}>
            <NumberInput id="g-birth" value={f.birthYear} onChange={(v) => upd({ birthYear: v })} placeholder="es. 1990" step="1" />
          </Field>
          <Field id="g-start" title="Quando vorresti iniziare a prelevare?" error={e.withdrawalStartDate}>
            <input id="g-start" className="input" type="month" value={f.withdrawalStartDate} onChange={(ev) => upd({ withdrawalStartDate: ev.target.value })} />
          </Field>
          <Field id="g-withdraw" title="Quanto vorresti al mese? (€ di oggi)" error={e.monthlyWithdrawal}>
            <NumberInput id="g-withdraw" value={f.monthlyWithdrawal} onChange={(v) => upd({ monthlyWithdrawal: v })} placeholder="es. 3000" />
          </Field>
          <Field id="g-other" title="Altri redditi al mese in quel periodo (€)" error={e.otherIncomeMonthly}
            help="Per esempio lavoro part-time o pensione. Metti 0 se non ne avrai.">
            <NumberInput id="g-other" value={f.otherIncomeMonthly} onChange={(v) => upd({ otherIncomeMonthly: v })} />
          </Field>
          <Field id="g-end" title="Fino a che età deve durare?" error={e.horizonEndAge}>
            <NumberInput id="g-end" value={f.horizonEndAge} onChange={(v) => upd({ horizonEndAge: v })} step="1" min={70} />
          </Field>
          {inc && (
            <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Capitale necessario all&apos;inizio dei prelievi</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>{eur(inc.targetAmount)}</div>
              <div style={hint}>
                ({eur(inc.annualNet)} l&apos;anno ÷ tasso di prelievo di riferimento del {String(inc.swr).replace('.', ',')}% per una rendita di {inc.horizonYears} anni, in euro di oggi)
              </div>
            </div>
          )}
        </>
      )}

      <Field id="g-capital" title="Quanto hai già messo da parte per questo obiettivo? (€)" error={e.initialCapital}>
        <NumberInput id="g-capital" value={f.initialCapital} onChange={(v) => upd({ initialCapital: v })} placeholder="0" />
      </Field>
      <Field id="g-pac" title="Quanto versi o vuoi versare ogni mese? (€)" error={e.monthlyContribution}>
        <NumberInput id="g-pac" value={f.monthlyContribution} onChange={(v) => upd({ monthlyContribution: v })} placeholder="0" />
      </Field>
      <TaxField idPrefix="g" value={f.taxResidence} error={e.taxResidence} onChange={(v) => upd({ taxResidence: v })} />
    </Stack>
  );
}


function StepPlan({ type, state, set, now }) {
  const f = state.goals[type] ?? defaultGoalFields(type);
  const scenario = state.scenarios[type] ?? DEFAULT_SCENARIO;
  return (
    <Stack gap="1rem">
      <p style={{ color: 'var(--text-2)', fontSize: '0.92rem' }}>
        Prova a cambiare importo, data o versamento: la fattibilità si aggiorna subito. Quando i numeri ti convincono, vai avanti.
      </p>
      <FeasibilitySheet
        type={type} fields={f} monthlyExpenses={state.monthlyExpenses} now={now}
        scenario={scenario}
        onScenario={(id) => set({ scenarios: { ...state.scenarios, [type]: id } })}
        onFields={(patch) => set({ goals: { ...state.goals, [type]: { ...f, ...patch } } })}
      />
    </Stack>
  );
}

function StepDone({ goals, now }) {
  const rows = useMemo(() => goals.map(g => ({ g, ev: evaluateFeasibility(g, { allocation: allocationFor(g), now, simulations: 800 }).evaluation })), [goals, now]);
  return (
    <Stack>
      <p style={{ color: 'var(--text-2)', fontSize: '0.92rem' }}>
        Ecco i tuoi obiettivi. Confermando li salvi: potrai modificarli quando vuoi finché non firmi le regole. Poi importa le tue operazioni e collegale agli obiettivi.
      </p>
      {rows.map(({ g, ev }) => {
        const info = STATUS_INFO[ev.status];
        return (
          <div key={g.id} className="rounded-lg p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <strong style={{ color: 'var(--text-1)' }}>{g.name}</strong>
              <span style={{ color: info.color, fontWeight: 600 }}>{info.label} · {pct(ev.successProbability)}</span>
            </div>
            <div style={hint}>{eur(g.targetAmount)} di oggi, entro {monthIt(g.targetDate)} · versamento {eur(g.monthlyContribution)}/mese</div>
          </div>
        );
      })}
    </Stack>
  );
}

// ── Pagina ──────────────────────────────────────────────────────────────────
const TITLES = { intro: 'Iniziamo', types: 'I tuoi obiettivi', done: 'Riepilogo' };

export default function GoalWizard({ standalone = false }) {
  const navigate = useNavigate();
  const now = useMemo(() => new Date(), []);
  const [state, setState] = useState(() => initialState(getDraft()));
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');

  const set = (patch) => setState(s => ({ ...s, ...patch }));
  useEffect(() => { saveDraft(state); }, [state]);

  const steps = useMemo(() => buildSteps(state.types), [state.types]);
  const index = Math.min(state.stepIndex, steps.length - 1);
  const step = steps[index];

  const goalFor = (type) => {
    const f = state.goals[type] ?? defaultGoalFields(type);
    const { goal } = goalFromFields(type, f, { now, monthlyExpenses: state.monthlyExpenses, scenario: state.scenarios[type] ?? DEFAULT_SCENARIO, base: state.goalIds?.[type] ? { id: state.goalIds[type] } : undefined });
    return goal;
  };
  const orderedTypes = TYPE_ORDER.filter(t => state.types.includes(t));

  const validateStep = () => {
    if (step.id === 'intro') return Number(state.monthlyExpenses) > 0 ? {} : { monthlyExpenses: 'Inserisci le tue spese mensili.' };
    if (step.id === 'types') return state.types.length ? {} : { types: 'Scegli almeno un obiettivo.' };
    if (step.kind === 'goal') {
      const f = state.goals[step.type] ?? defaultGoalFields(step.type);
      return validateGoalInput({ ...f, type: step.type }, { now, monthlyExpenses: state.monthlyExpenses }).errors;
    }
    if (step.kind === 'plan') return goalFor(step.type) ? {} : { plan: 'Correggi i dati dell\'obiettivo per continuare.' };
    return {};
  };

  const next = () => {
    const e = validateStep();
    setErrors(e);
    if (Object.keys(e).length) return;
    set({ stepIndex: Math.min(index + 1, steps.length - 1) });
    window.scrollTo?.({ top: 0 });
  };
  const back = () => { setErrors({}); set({ stepIndex: Math.max(index - 1, 0) }); window.scrollTo?.({ top: 0 }); };

  const finish = () => {
    try {
      const goals = orderedTypes.map(t => goalFor(t));
      if (goals.some(g => g === null)) throw new Error('Alcuni dati non sono completi: torna indietro e controlla gli obiettivi.');
      completeOnboarding({ goals, rules: [], now });
      navigate('/obiettivi', { replace: true });
    } catch (err) {
      setSaveError(err.message);
    }
  };

  let body;
  if (step.id === 'intro') body = <StepIntro state={state} set={set} errors={errors} />;
  else if (step.id === 'types') body = <StepTypes state={state} set={set} errors={errors} />;
  else if (step.kind === 'goal') body = <StepGoal type={step.type} state={state} set={set} errors={errors} />;
  else if (step.kind === 'plan') body = <StepPlan type={step.type} state={state} set={set} now={now} />;
  else body = <StepDone goals={orderedTypes.map(goalFor).filter(Boolean)} now={now} />;

  const title = step.kind === 'goal' ? `Obiettivo: ${GOAL_TYPES[step.type].label}`
    : step.kind === 'plan' ? `Fattibilità · ${GOAL_TYPES[step.type].label}` : TITLES[step.id];

  return (
    <div style={{ minHeight: standalone ? '100vh' : undefined, background: standalone ? 'var(--bg)' : undefined, padding: standalone ? '1.25rem 1rem 3rem' : 0 }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {standalone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--text-1)', fontWeight: 700 }}>
            <TrendingUp size={18} /> Investitore
          </div>
        )}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.35rem' }} aria-live="polite">Passo {index + 1} di {steps.length}</div>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-2)', marginBottom: '1.25rem' }}>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--accent)', width: `${((index + 1) / steps.length) * 100}%`, transition: 'width 0.2s' }} />
        </div>
        <h1 className="page-title" style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: '1rem' }}>{title}</h1>

        <div className="card">{body}</div>

        {errors.plan && <p role="alert" style={{ ...errStyle, marginTop: '1rem' }}>{errors.plan}</p>}
        {saveError && <p role="alert" style={{ ...errStyle, marginTop: '1rem' }}>{saveError}</p>}
        <div className={`flow-actions${standalone ? '' : ' above-nav'}`}>
          <button type="button" className="btn-secondary" onClick={back} disabled={index === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={16} /> Indietro
          </button>
          {step.id === 'done'
            ? <button type="button" className="btn-primary" onClick={finish} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Check size={16} /> Salva i miei obiettivi</button>
            : <button type="button" className="btn-primary" onClick={next} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Avanti <ArrowRight size={16} /></button>}
        </div>
      </div>
    </div>
  );
}
