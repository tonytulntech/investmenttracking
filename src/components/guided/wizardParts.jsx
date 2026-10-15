import { REBALANCE_METHODS, CRASH_CHOICES, REVIEW_FREQUENCIES, MIN_NOTE_LENGTH, monthName, ALLOCATION_BUCKETS, allocationTotal } from '../../lib/rulesModel';

// ── Componenti di base ──────────────────────────────────────────────────────
export const label = { display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: '0.4rem' };
export const hint = { fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.35rem' };
export const errStyle = { fontSize: '0.78rem', color: 'var(--neg)', marginTop: '0.35rem' };

export function Field({ id, title, error, help, children }) {
  return (
    <div>
      <label htmlFor={id} style={label}>{title}</label>
      {children}
      {help && !error && <p style={hint}>{help}</p>}
      {error && <p role="alert" style={errStyle}>{error}</p>}
    </div>
  );
}

export function NumberInput({ id, value, onChange, placeholder, step = 'any', min = 0 }) {
  return (
    <input id={id} className="input" type="number" inputMode="decimal" min={min} step={step}
      value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  );
}

export function Choice({ selected, onClick, title, text, role = 'radio' }) {
  return (
    <button type="button" role={role} aria-checked={selected} onClick={onClick}
      className="text-left rounded-lg p-4 transition-colors"
      style={{
        width: '100%', cursor: 'pointer',
        background: selected ? 'var(--accent-weak)' : 'var(--surface-2)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
      }}>
      <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{title}</div>
      {text && <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 3 }}>{text}</div>}
    </button>
  );
}

export const Stack = ({ children, gap = '1rem' }) => <div style={{ display: 'flex', flexDirection: 'column', gap }}>{children}</div>;

export function StepRules({ goal, rules, setRules, errors }) {
  const r = rules;
  const upd = (patch) => setRules({ ...r, ...patch });
  const noteLen = r.crashPlan.personalNote.trim().length;
  return (
    <Stack gap="1.5rem">
      <p style={{ color: 'var(--text-2)', fontSize: '0.92rem' }}>
        Le regole sono <strong>tue</strong>: le scegli e le firmi. Servono a ricordarti, nei momenti difficili, cosa avevi deciso a mente fredda.
      </p>

      <div>
        <p style={{ ...label, fontSize: '0.92rem' }}>Come dividi il capitale di questo obiettivo?</p>
        <p style={{ ...hint, marginTop: 0, marginBottom: '0.75rem' }}>
          La scegli tu, come spiegato nel corso: l&apos;app non la suggerisce. La usa per stimare la fattibilità e per mostrarti quanto ti discosti da ciò che hai scelto.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
          {ALLOCATION_BUCKETS.map(b => (
            <Field key={b.key} id={`r-al-${b.key}`} title={`${b.label} (%)`}>
              <NumberInput id={`r-al-${b.key}`} value={r.allocation?.[b.key] ?? ''} step="1" min={0}
                onChange={(v) => upd({ allocation: { ...r.allocation, [b.key]: v } })} />
            </Field>
          ))}
        </div>
        <p style={{ ...hint, color: Math.abs(allocationTotal(r.allocation) - 100) < 0.001 ? 'var(--pos)' : 'var(--text-3)' }}>Totale: {Math.round(allocationTotal(r.allocation) * 10) / 10}%</p>
        {errors.allocation && <p role="alert" style={errStyle}>{errors.allocation}</p>}
      </div>

      <div>
        <p style={{ ...label, fontSize: '0.92rem' }}>Quando controlli se le percentuali sono ancora quelle previste?</p>
        <div role="radiogroup" aria-label="Metodo di ribilanciamento" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {REBALANCE_METHODS.map(m => (
            <Choice key={m.value} selected={r.rebalance.method === m.value} onClick={() => upd({ rebalance: { ...r.rebalance, method: m.value } })} title={m.label} />
          ))}
        </div>
        {errors.method && <p role="alert" style={errStyle}>{errors.method}</p>}
        {r.rebalance.method !== 'calendar' && (
          <div style={{ marginTop: '0.75rem' }}>
            <Field id="r-th" title="Soglia di scostamento (punti percentuali)" error={errors.thresholdPct}>
              <NumberInput id="r-th" value={r.rebalance.thresholdPct} onChange={(v) => upd({ rebalance: { ...r.rebalance, thresholdPct: v } })} step="1" min={1} />
            </Field>
          </div>
        )}
        {r.rebalance.method !== 'threshold' && (
          <div style={{ marginTop: '0.75rem' }}>
            <Field id="r-month" title="In quale mese?" error={errors.calendarMonth}>
              <select id="r-month" className="select" value={r.rebalance.calendarMonth} onChange={(e) => upd({ rebalance: { ...r.rebalance, calendarMonth: Number(e.target.value) } })}>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{monthName(i + 1)}</option>)}
              </select>
            </Field>
          </div>
        )}
      </div>

      <div>
        <p style={{ ...label, fontSize: '0.92rem' }}>Se il portafoglio scende del 30%, cosa farai?</p>
        <div role="radiogroup" aria-label="Piano in caso di crollo" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {CRASH_CHOICES.map(c => (
            <Choice key={c.value} selected={r.crashPlan.choice === c.value} onClick={() => upd({ crashPlan: { ...r.crashPlan, choice: c.value } })} title={c.label} />
          ))}
        </div>
        {errors.crashChoice && <p role="alert" style={errStyle}>{errors.crashChoice}</p>}
        <div style={{ marginTop: '0.75rem' }}>
          <Field id="r-note" title="Scrivilo con parole tue" error={errors.personalNote}
            help={`${noteLen}/${MIN_NOTE_LENGTH} caratteri minimi. Quando rileggerai questa frase, tra un crollo e l'altro, ti aiuterà.`}>
            <textarea id="r-note" className="input" rows={3} value={r.crashPlan.personalNote}
              onChange={(e) => upd({ crashPlan: { ...r.crashPlan, personalNote: e.target.value } })} />
          </Field>
        </div>
      </div>

      <div>
        <p style={{ ...label, fontSize: '0.92rem' }}>Ogni quanto rivedi queste regole?</p>
        <div role="radiogroup" aria-label="Frequenza di revisione" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {REVIEW_FREQUENCIES.map(f => (
            <Choice key={f.value} selected={r.reviewFrequency === f.value} onClick={() => upd({ reviewFrequency: f.value })} title={f.label} />
          ))}
        </div>
        {errors.reviewFrequency && <p role="alert" style={errStyle}>{errors.reviewFrequency}</p>}
      </div>

      <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.6rem' }}>Firma · {goal.name}</h3>
        <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '0.75rem' }}>
          <input type="checkbox" checked={r.accepted === true} onChange={(e) => upd({ accepted: e.target.checked })} style={{ marginTop: 4 }} />
          <span style={{ fontSize: '0.88rem', color: 'var(--text-1)' }}>Mi impegno a seguire queste regole.</span>
        </label>
        {errors.accepted && <p role="alert" style={{ ...errStyle, marginBottom: '0.6rem' }}>{errors.accepted}</p>}
        <Field id="r-sign" title="Scrivi nome e cognome" error={errors.signedName}>
          <input id="r-sign" className="input" value={r.signedName} autoComplete="name" onChange={(e) => upd({ signedName: e.target.value })} />
        </Field>
      </div>
    </Stack>
  );
}

