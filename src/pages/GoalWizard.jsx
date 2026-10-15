import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import {
  GOAL_TYPES, MONTHS_COVERED, LOSS_OPTIONS, BUCKET_INFO, STATUS_INFO,
  validateGoalInput, createGoal, riskProfileFromAnswers, incomeTarget, incomeHorizon, evaluatePlan, monthlyNeeded,
} from '../lib/goalModel';
import { defaultRulesInput, validateRulesInput, createRulesV1 } from '../lib/rulesModel';
import { label, hint, errStyle, Field, NumberInput, Choice, Stack, StepRules } from '../components/guided/wizardParts';
import { BUCKETS } from '../lib/glidePath';
import { getDraft, saveDraft, completeOnboarding } from '../services/goalStore';
import { MARKET_ASSUMPTIONS } from '../config/marketAssumptions';

const eur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n));
const pct = (n) => `${Math.round(n)}%`;
const BUCKET_COLORS = { equity: 'var(--info)', bondShort: 'var(--pos)', bondMedium: 'var(--accent)', cash: 'var(--text-3)', gold: 'var(--warn)' };
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
  stepIndex: 0, monthlyExpenses: '', types: [], goals: {}, risk: { lossReaction: '', incomeStability: '', experience: '' },
  shifts: {}, rules: {},
  ...(draft && typeof draft === 'object' ? draft : {}),
});

const buildSteps = (types) => {
  const ordered = TYPE_ORDER.filter(t => types.includes(t));
  return [
    { id: 'intro' }, { id: 'types' },
    ...ordered.map(t => ({ id: `goal:${t}`, kind: 'goal', type: t })),
    { id: 'risk' },
    ...ordered.map(t => ({ id: `plan:${t}`, kind: 'plan', type: t })),
    ...ordered.map(t => ({ id: `rules:${t}`, kind: 'rules', type: t })),
    { id: 'done' },
  ];
};

// ── Passi ───────────────────────────────────────────────────────────────────
function StepIntro({ state, set, errors }) {
  return (
    <Stack>
      <p style={{ color: 'var(--text-2)', fontSize: '0.92rem' }}>
        In questo esercizio definisci i tuoi obiettivi, vedi come si comporta il modello del corso nel tempo e scrivi le tue regole.
        Ci vogliono pochi minuti e puoi riprendere da dove hai lasciato.
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
      <p style={{ color: 'var(--text-2)', fontSize: '0.92rem' }}>Scegli gli obiettivi che vuoi pianificare. Puoi sceglierne più di uno.</p>
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

function StepRisk({ state, set, errors }) {
  const r = state.risk;
  const upd = (patch) => set({ risk: { ...r, ...patch } });
  return (
    <Stack gap="1.5rem">
      <div>
        <p style={{ ...label, fontSize: '0.92rem' }}>Hai 10.000 € investiti. Dopo un anno ne vedi 7.000. Cosa fai?</p>
        <div role="radiogroup" aria-label="Reazione a una perdita" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {LOSS_OPTIONS.map(o => (
            <Choice key={o.value} selected={Number(r.lossReaction) === o.value} onClick={() => upd({ lossReaction: o.value })} title={o.label} />
          ))}
        </div>
        {errors.lossReaction && <p role="alert" style={errStyle}>{errors.lossReaction}</p>}
      </div>
      <div>
        <p style={{ ...label, fontSize: '0.92rem' }}>Il tuo reddito è stabile o varia molto?</p>
        <div role="radiogroup" aria-label="Stabilità del reddito" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Choice selected={r.incomeStability === 'stable'} onClick={() => upd({ incomeStability: 'stable' })} title="È stabile" />
          <Choice selected={r.incomeStability === 'variable'} onClick={() => upd({ incomeStability: 'variable' })} title="Varia molto" />
        </div>
        {errors.incomeStability && <p role="alert" style={errStyle}>{errors.incomeStability}</p>}
      </div>
      <div>
        <p style={{ ...label, fontSize: '0.92rem' }}>Hai mai investito?</p>
        <div role="radiogroup" aria-label="Esperienza" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Choice selected={r.experience === 'none'} onClick={() => upd({ experience: 'none' })} title="No, è la prima volta" />
          <Choice selected={r.experience === 'some'} onClick={() => upd({ experience: 'some' })} title="Qualche volta" />
          <Choice selected={r.experience === 'experienced'} onClick={() => upd({ experience: 'experienced' })} title="Sì, da tempo" />
        </div>
        {errors.experience && <p role="alert" style={errStyle}>{errors.experience}</p>}
      </div>
    </Stack>
  );
}

function AllocationBar({ allocation }) {
  return (
    <div>
      <div role="img" aria-label="Composizione del modello" style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: 'var(--surface-2)' }}>
        {BUCKETS.filter(b => allocation[b] > 0).map(b => (
          <div key={b} style={{ width: `${allocation[b]}%`, background: BUCKET_COLORS[b] }} title={`${BUCKET_INFO[b].label} ${allocation[b]}%`} />
        ))}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0.8rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {BUCKETS.filter(b => allocation[b] > 0).map(b => (
          <li key={b} style={{ display: 'flex', gap: '0.6rem', alignItems: 'baseline' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: BUCKET_COLORS[b], flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-1)' }}>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{allocation[b]}%</strong> {BUCKET_INFO[b].label}
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-3)' }}>{BUCKET_INFO[b].text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FanChart({ fan, target }) {
  const data = fan.map(p => ({ anno: p.year, peggiore: Math.round(p.p5), mediano: Math.round(p.p50), migliore: Math.round(p.p95) }));
  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="anno" tick={{ fill: 'var(--text-3)', fontSize: 11 }} tickFormatter={(v) => `${v}a`} />
          <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} width={48} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
          <Tooltip formatter={(v) => eur(v)} labelFormatter={(v) => `Tra ${v} anni`}
            contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <ReferenceLine y={target} stroke="var(--warn)" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="migliore" stroke="var(--pos)" dot={false} strokeWidth={1.5} />
          <Line type="monotone" dataKey="mediano" stroke="var(--info)" dot={false} strokeWidth={2.5} />
          <Line type="monotone" dataKey="peggiore" stroke="var(--neg)" dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function StepPlan({ type, goal, now, shift, setShift }) {
  const deferred = useDeferredValue(shift);
  const plan = useMemo(() => evaluatePlan(goal, { now, simulations: 1500, equityShift: deferred }), [goal, now, deferred]);
  const [needed, setNeeded] = useState({ state: 'idle', value: null });
  useEffect(() => { setNeeded({ state: 'idle', value: null }); }, [goal, deferred]);

  const ev = plan.evaluation;
  const info = STATUS_INFO[ev.status];
  const targetYear = goal.targetDate.slice(0, 4);
  const calc = () => {
    setNeeded({ state: 'loading', value: null });
    setTimeout(() => setNeeded({ state: 'done', value: monthlyNeeded({ ...plan, input: { ...plan.input, simulations: 800 } }) }), 30);
  };

  return (
    <Stack gap="1.25rem">
      <p style={{ color: 'var(--text-2)', fontSize: '0.92rem' }}>
        Questo è il <strong>modello del corso</strong> per un orizzonte di {Math.round(plan.years * 10) / 10} anni e il tuo profilo. Puoi adottarlo
        così com&apos;è oppure spostare l&apos;azionario di qualche punto. Nel tempo il modello diventa più prudente.
      </p>
      <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)', border: `1px solid ${info.color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: info.color }}>{info.label}</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }} aria-label="Probabilità di raggiungere l'obiettivo">
            {pct(ev.successProbability)}
          </span>
        </div>
        <div style={hint}>probabilità di avere almeno {eur(goal.targetAmount)} di oggi{type === 'income' ? ' all\'inizio dei prelievi' : ''}, dopo inflazione e tasse</div>
        <div style={{ ...hint, marginTop: '0.2rem' }}>
          {eur(goal.targetAmount)} di oggi ≈ {eur(plan.nominalTarget)} nel {targetYear}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.6rem' }}>Cosa potresti ritrovare (€ di oggi)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.6rem', marginBottom: '0.6rem' }}>
          {[['Scenario peggiore', ev.percentiles.p5, 'var(--neg)'], ['Mediano', ev.percentiles.p50, 'var(--info)'], ['Scenario migliore', ev.percentiles.p95, 'var(--pos)']].map(([t, v, c]) => (
            <div key={t} className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{t}</div>
              <div style={{ fontWeight: 700, color: c, fontFamily: 'var(--font-mono)' }}>{eur(v)}</div>
            </div>
          ))}
        </div>
        <FanChart fan={ev.fan} target={goal.targetAmount} />
        <p style={hint}>Linea tratteggiata: il tuo obiettivo. Lo scenario peggiore è il 5° percentile, il migliore il 95°.</p>
      </div>

      <div>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.6rem' }}>Com&apos;è composto oggi</h3>
        <AllocationBar allocation={plan.allocationNow} />
      </div>

      {type !== 'emergency' && (
        <div>
          <label htmlFor="shift" style={label}>Sposta l&apos;azionario: {shift > 0 ? '+' : ''}{shift} punti</label>
          <input id="shift" type="range" min={-10} max={10} step={5} value={shift} onChange={(e) => setShift(Number(e.target.value))} style={{ width: '100%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', ...hint }}><span>Più prudente</span><span>Come il modello</span><span>Più audace</span></div>
        </div>
      )}

      {ev.status !== 'on_track' && ev.status !== 'reached' && (
        <div>
          {needed.state === 'idle' && <button type="button" className="btn-secondary" onClick={calc}>Calcola cosa servirebbe per arrivare al {MARKET_ASSUMPTIONS.thresholds.onTrack}%</button>}
          {needed.state === 'loading' && <p style={hint}>Calcolo in corso…</p>}
          {needed.state === 'done' && (
            <p style={{ fontSize: '0.88rem', color: 'var(--text-2)' }}>
              {needed.value == null
                ? 'Con questi numeri non si arriva alla soglia in modo realistico: cambiano soprattutto importo e data.'
                : <>Con circa <strong style={{ color: 'var(--text-1)' }}>{eur(needed.value)}</strong> al mese (oggi {eur(goal.monthlyContribution)}) la probabilità arriverebbe al {MARKET_ASSUMPTIONS.thresholds.onTrack}%.</>}
            </p>
          )}
        </div>
      )}
      <p style={hint}>Simulazione basata su ipotesi dichiarate (rendimenti, inflazione, tasse). Non è una previsione né una raccomandazione.</p>
    </Stack>
  );
}

function StepDone({ goals, now }) {
  const rows = useMemo(() => goals.map(g => ({ g, plan: evaluatePlan(g, { now, simulations: 800 }) })), [goals, now]);
  return (
    <Stack>
      <p style={{ color: 'var(--text-2)', fontSize: '0.92rem' }}>Ecco il riepilogo. Confermando salvi obiettivi e regole firmate: potrai riguardarli quando vuoi.</p>
      {rows.map(({ g, plan }) => {
        const info = STATUS_INFO[plan.evaluation.status];
        return (
          <div key={g.id} className="rounded-lg p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <strong style={{ color: 'var(--text-1)' }}>{g.name}</strong>
              <span style={{ color: info.color, fontWeight: 600 }}>{info.label} · {pct(plan.evaluation.successProbability)}</span>
            </div>
            <div style={hint}>{eur(g.targetAmount)} di oggi, entro {new Date(`${g.targetDate}-01T12:00:00`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</div>
          </div>
        );
      })}
    </Stack>
  );
}

// ── Pagina ──────────────────────────────────────────────────────────────────
const TITLES = {
  intro: 'Iniziamo', types: 'I tuoi obiettivi', risk: 'Come reagisci ai cali', done: 'Riepilogo',
};

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

  const riskProfile = useMemo(() => {
    try { return riskProfileFromAnswers(state.risk); } catch { return null; }
  }, [state.risk]);

  const goalFor = (type) => {
    const f = state.goals[type] ?? defaultGoalFields(type);
    const input = { ...f, type, equityShift: state.shifts[type] ?? 0 };
    if (!riskProfile || !validateGoalInput(input, { now, monthlyExpenses: state.monthlyExpenses }).valid) return null;
    return createGoal(input, { riskProfile, monthlyExpenses: state.monthlyExpenses, now });
  };
  const rulesFor = (type) => state.rules[type] ?? defaultRulesInput();
  const orderedTypes = TYPE_ORDER.filter(t => state.types.includes(t));

  const validateStep = () => {
    if (step.id === 'intro') return Number(state.monthlyExpenses) > 0 ? {} : { monthlyExpenses: 'Inserisci le tue spese mensili.' };
    if (step.id === 'types') return state.types.length ? {} : { types: 'Scegli almeno un obiettivo.' };
    if (step.kind === 'goal') {
      const f = state.goals[step.type] ?? defaultGoalFields(step.type);
      return validateGoalInput({ ...f, type: step.type }, { now, monthlyExpenses: state.monthlyExpenses }).errors;
    }
    if (step.id === 'risk') {
      const e = {};
      if (!LOSS_OPTIONS.some(o => o.value === Number(state.risk.lossReaction))) e.lossReaction = 'Scegli una risposta.';
      if (!['stable', 'variable'].includes(state.risk.incomeStability)) e.incomeStability = 'Scegli una risposta.';
      if (!['none', 'some', 'experienced'].includes(state.risk.experience)) e.experience = 'Scegli una risposta.';
      return e;
    }
    if (step.kind === 'rules') return validateRulesInput(rulesFor(step.type)).errors;
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
      const rules = goals.map((g, i) => createRulesV1({ goalId: g.id, input: rulesFor(orderedTypes[i]), now }));
      completeOnboarding({ goals, rules, now });
      navigate('/obiettivi', { replace: true });
    } catch (err) {
      setSaveError(err.message);
    }
  };

  let body;
  if (step.id === 'intro') body = <StepIntro state={state} set={set} errors={errors} />;
  else if (step.id === 'types') body = <StepTypes state={state} set={set} errors={errors} />;
  else if (step.kind === 'goal') body = <StepGoal type={step.type} state={state} set={set} errors={errors} />;
  else if (step.id === 'risk') body = <StepRisk state={state} set={set} errors={errors} />;
  else if (step.kind === 'plan') {
    const g = goalFor(step.type);
    body = g
      ? <StepPlan type={step.type} goal={g} now={now} shift={state.shifts[step.type] ?? 0} setShift={(v) => set({ shifts: { ...state.shifts, [step.type]: v } })} />
      : <p role="alert" style={errStyle}>Mancano dei dati: torna indietro e completa l&apos;obiettivo.</p>;
  } else if (step.kind === 'rules') {
    const g = goalFor(step.type);
    body = g ? <StepRules goal={g} rules={rulesFor(step.type)} setRules={(v) => set({ rules: { ...state.rules, [step.type]: v } })} errors={errors} /> : null;
  } else body = <StepDone goals={orderedTypes.map(goalFor).filter(Boolean)} now={now} />;

  const title = step.kind === 'goal' ? `Obiettivo: ${GOAL_TYPES[step.type].label}`
    : step.kind === 'plan' ? `Il modello · ${GOAL_TYPES[step.type].label}`
    : step.kind === 'rules' ? `Le tue regole · ${GOAL_TYPES[step.type].label}` : TITLES[step.id];

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

        {saveError && <p role="alert" style={{ ...errStyle, marginTop: '1rem' }}>{saveError}</p>}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button type="button" className="btn-secondary" onClick={back} disabled={index === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={16} /> Indietro
          </button>
          {step.id === 'done'
            ? <button type="button" className="btn-primary" onClick={finish} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Check size={16} /> Concludi l&apos;esercizio</button>
            : <button type="button" className="btn-primary" onClick={next} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Avanti <ArrowRight size={16} /></button>}
        </div>
      </div>
    </div>
  );
}
