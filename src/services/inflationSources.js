/**
 * Fonti dell'inflazione italiana (IPCA/HICP), provate in ordine finché una risponde.
 * Logica pura (il `fetch` è iniettato): usata da api/inflation.js e testata.
 * Restituisce serie normalizzate: monthly [{period:'YYYY-MM', value}], annual [{period:'YYYY', value}].
 */
import { parseJsonStat, normalizePeriod, parseEcbCsv, annualFromMonthly } from './inflationData.js';

const ECB_URL = 'https://data-api.ecb.europa.eu/service/data/ICP/M.IT.N.000000.4.ANR?format=csvdata&startPeriod=1997-01';
const EUROSTAT = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
// Eurostat ha cambiato la classificazione (COICOP 2018): proviamo più nomi di dimensione.
const EUROSTAT_VARIANTS = ['coicop=CP00', 'coicop18=TOTAL', 'coicop18=CP00'];

async function getText(fetchImpl, url, timeoutMs = 8000) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const res = await fetchImpl(url, { headers: { Accept: '*/*' }, signal: ctrl?.signal });
    const body = await res.text();
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body: body.slice(0, 300) });
    return body;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const describe = (source, err) => ({ source, error: err.message, status: err.status ?? null, body: err.body ?? null });

async function fromEcb(fetchImpl) {
  const monthly = parseEcbCsv(await getText(fetchImpl, ECB_URL));
  return { monthly, annual: annualFromMonthly(monthly), source: 'BCE · IPCA Italia' };
}

async function fromEurostat(fetchImpl, attempts) {
  for (const variant of EUROSTAT_VARIANTS) {
    try {
      const m = await getText(fetchImpl, `${EUROSTAT}/prc_hicp_manr?format=JSON&lang=EN&geo=IT&${variant}&sinceTimePeriod=1997M01`);
      const monthly = parseJsonStat(JSON.parse(m)).map(p => ({ period: normalizePeriod(p.period), value: p.value }));
      return { monthly, annual: annualFromMonthly(monthly), source: 'Eurostat · IPCA Italia' };
    } catch (err) {
      attempts.push(describe(`eurostat ${variant}`, err));
    }
  }
  throw new Error('Eurostat non disponibile');
}

const STALE_AFTER_MONTHS = 4;

/** Mesi interi tra un periodo 'YYYY-MM' e `now`. */
export function monthsSince(period, now = Date.now()) {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(now);
  return d.getUTCFullYear() * 12 + d.getUTCMonth() + 1 - (y * 12 + m);
}

/**
 * @returns {Promise<{monthly, annual, source, attempts, staleMonths:number}>}
 * `staleMonths` = età dell'ultimo dato mensile. Se la BCE è indietro di oltre 4 mesi si prova
 * Eurostat e, se ha mesi più recenti, si accodano. Lancia con `attempts` se tutte le fonti falliscono.
 */
export async function fetchInflationSeries(fetchImpl, now = Date.now()) {
  const attempts = [];
  let result = null;

  try {
    result = await fromEcb(fetchImpl);
    if (result.monthly.length === 0) throw new Error('Serie vuota');
  } catch (err) {
    result = null;
    attempts.push(describe('bce', err));
  }

  if (!result || monthsSince(result.monthly[result.monthly.length - 1].period, now) > STALE_AFTER_MONTHS) {
    try {
      const euro = await fromEurostat(fetchImpl, attempts);
      if (euro.monthly.length === 0) throw new Error('Serie vuota');
      if (!result) {
        result = euro;
      } else {
        const lastEcb = result.monthly[result.monthly.length - 1].period;
        const newer = euro.monthly.filter(p => p.period > lastEcb);
        if (newer.length) {
          const monthly = [...result.monthly, ...newer];
          result = { monthly, annual: annualFromMonthly(monthly), source: `${result.source} + Eurostat (mesi recenti)` };
        }
      }
    } catch (err) {
      if (!result) throw Object.assign(new Error('Nessuna fonte di inflazione disponibile'), { attempts });
    }
  }

  const last = result.monthly[result.monthly.length - 1].period;
  return { ...result, attempts, staleMonths: monthsSince(last, now) };
}
