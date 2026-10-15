/**
 * Dati reali sull'inflazione italiana (IPCA/HICP, Eurostat), via /api/inflation.
 * Servono a MOSTRARE il dato attuale e a CALIBRARE l'ipotesi di lungo periodo;
 * l'ipotesi usata nelle simulazioni resta quella di marketAssumptions.js
 * (l'inflazione degli ultimi 12 mesi non è una previsione a 10-20 anni).
 */
const CACHE_KEY = 'inflation_it_v1'; // cache rigenerabile: NON in SYNC_KEYS
const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Legge un dataset JSON-stat 2.0 con una sola serie nel tempo.
 * @returns {{period:string, value:number}[]} ordinato per periodo, senza valori mancanti
 */
export function parseJsonStat(json) {
  const ids = json?.id, sizes = json?.size, dims = json?.dimension;
  if (!Array.isArray(ids) || !Array.isArray(sizes) || !dims?.time?.category) {
    throw new Error('Formato dati inatteso');
  }
  const timeAt = ids.indexOf('time');
  if (timeAt < 0) throw new Error('Dimensione temporale assente');
  if (sizes.some((s, i) => i !== timeAt && s !== 1)) throw new Error('Serie ambigua: più di una combinazione di filtri');

  const index = dims.time.category.index;
  const entries = Array.isArray(index) ? index.map((label, i) => [label, i]) : Object.entries(index);
  const stride = sizes.slice(timeAt + 1).reduce((a, b) => a * b, 1);
  const values = json.value ?? {};

  return entries
    .map(([period, pos]) => {
      const raw = values[pos * stride] ?? values[String(pos * stride)];
      return { period, value: typeof raw === 'number' ? raw : null };
    })
    .filter(p => p.value !== null)
    .sort((a, b) => a.period.localeCompare(b.period));
}

/** '2025M09' → '2025-09' (i periodi annuali restano 'YYYY'). */
export function normalizePeriod(p) {
  const m = /^(\d{4})M(\d{2})$/.exec(p);
  return m ? `${m[1]}-${m[2]}` : p;
}

function splitCsvLine(line) {
  const out = [];
  let cur = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false; } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** CSV dell'API dati BCE (format=csvdata) → [{period:'YYYY-MM', value}] ordinato. */
export function parseEcbCsv(text) {
  const lines = String(text ?? '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV vuoto');
  const header = splitCsvLine(lines[0]);
  const t = header.indexOf('TIME_PERIOD'), v = header.indexOf('OBS_VALUE');
  if (t < 0 || v < 0) throw new Error('Colonne attese assenti nel CSV');
  return lines.slice(1)
    .map(l => { const c = splitCsvLine(l); return { period: c[t], value: c[v] === '' ? NaN : Number(c[v]) }; })
    .filter(p => /^\d{4}-\d{2}$/.test(p.period) && Number.isFinite(p.value))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/** Media annua del tasso mensile (anni completi, 12 mesi) → [{period:'YYYY', value}]. */
export function annualFromMonthly(monthly) {
  const byYear = new Map();
  for (const { period, value } of monthly) {
    const y = period.slice(0, 4);
    (byYear.get(y) ?? byYear.set(y, []).get(y)).push(value);
  }
  return [...byYear.entries()]
    .filter(([, vals]) => vals.length === 12)
    .map(([period, vals]) => ({ period, value: vals.reduce((a, b) => a + b, 0) / 12 }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const stdev = (xs) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
};

/**
 * @param {{annual:{period:string,value:number}[], monthly:{period:string,value:number}[]}} data serie normalizzate
 * @param {number} [years=20] ampiezza della finestra storica
 * @returns {{latest:{period:string,value:number}|null, history:{from:string,to:string,years:number,mean:number,vol:number}|null}}
 */
export function summarizeInflation({ annual = [], monthly = [], source, staleMonths } = {}, years = 20) {
  const latest = monthly.length ? monthly[monthly.length - 1] : null;
  const a = annual.slice(-years);
  let history = null;
  if (a.length >= 5) {
    const vals = a.map(p => p.value);
    history = { from: a[0].period, to: a[a.length - 1].period, years: a.length, mean: mean(vals), vol: stdev(vals) };
  }
  return { latest, history, ...(source ? { source } : {}), ...(staleMonths != null ? { staleMonths } : {}) };
}

/**
 * Inflazione italiana: cache 24h, poi /api/inflation. Non lancia mai:
 * se il dato non c'è, `status: 'unavailable'` e l'app usa le ipotesi di partenza.
 * @returns {Promise<{status:'live'|'cached'|'unavailable', latest, history, fetchedAt:number|null}>}
 */
export async function getItalianInflation({
  fetchImpl = (typeof fetch === 'function' ? fetch : null),
  storage = (typeof localStorage !== 'undefined' ? localStorage : null),
  now = Date.now(),
  url = '/api/inflation',
} = {}) {
  const unavailable = { status: 'unavailable', latest: null, history: null, fetchedAt: null };
  try {
    const cached = JSON.parse(storage?.getItem(CACHE_KEY) ?? 'null');
    if (cached && now - cached.fetchedAt < TTL_MS) return { ...cached, status: 'cached' };
  } catch { /* cache illeggibile: si ignora */ }

  if (!fetchImpl) return unavailable;
  try {
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const summary = summarizeInflation(await res.json());
    if (!summary.latest && !summary.history) throw new Error('Nessun dato utilizzabile');
    const out = { ...summary, fetchedAt: now };
    try { storage?.setItem(CACHE_KEY, JSON.stringify(out)); } catch { /* quota piena: pazienza */ }
    return { ...out, status: 'live' };
  } catch {
    return unavailable;
  }
}
