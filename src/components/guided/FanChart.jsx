import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

const eur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n));

/** Fascia degli esiti possibili (5°–95° percentile) e mediana, in € di oggi. */
export default function FanChart({ fan, target }) {
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
