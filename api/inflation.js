// Proxy cacheato verso Eurostat (IPCA/HICP Italia). Una sola chiamata al giorno serve tutti gli utenti.
const BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
const ANNUAL = `${BASE}/prc_hicp_aind?format=JSON&lang=EN&geo=IT&coicop=CP00&unit=RCH_A_AVG&sinceTimePeriod=1997`;
const MONTHLY = `${BASE}/prc_hicp_manr?format=JSON&lang=EN&geo=IT&coicop=CP00&sinceTimePeriod=2024M01`;

async function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
    if (!r.ok) throw new Error(`Eurostat ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  try {
    const [annualRaw, monthlyRaw] = await Promise.all([getJson(ANNUAL), getJson(MONTHLY)]);
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ annualRaw, monthlyRaw, source: 'Eurostat HICP (IPCA) Italia' });
  } catch (err) {
    res.setHeader('Cache-Control', 's-maxage=300');
    return res.status(502).json({ error: err.message });
  }
}
