/**
 * XIRR — rendimento annualizzato considerando il timing dei flussi di cassa.
 * Equivalente alla funzione XIRR di Excel / Google Sheets.
 *
 * A differenza del semplice ROI, tiene conto di QUANDO hai depositato il denaro:
 * depositi recenti pesano meno perché hanno avuto meno tempo per crescere.
 */

/**
 * NPV e sua derivata rispetto al tasso, per date irregolari.
 */
function npv(rate, flows, years) {
  return flows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + rate, years[i]), 0);
}

function dnpv(rate, flows, years) {
  return flows.reduce((sum, cf, i) => {
    if (years[i] === 0) return sum;
    return sum - years[i] * cf / ((1 + rate) * Math.pow(1 + rate, years[i]));
  }, 0);
}

/**
 * Calcola XIRR (tasso annualizzato) dato un array di flussi di cassa e date.
 *
 * @param {number[]} cashFlows — negativi = uscite (depositi), positivi = entrate (prelievi + valore finale)
 * @param {Date[]}   dates     — date corrispondenti (stesso ordine)
 * @returns {number|null}      — tasso es. 0.191 = 19.1%, null se non calcolabile
 */
export function xirr(cashFlows, dates) {
  if (!cashFlows || cashFlows.length < 2 || cashFlows.length !== dates.length) return null;

  // Ordina per data crescente
  const pairs = cashFlows
    .map((cf, i) => ({ cf, date: new Date(dates[i]) }))
    .sort((a, b) => a.date - b.date);

  const t0 = pairs[0].date.getTime();
  const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;
  const years = pairs.map(p => (p.date.getTime() - t0) / MS_PER_YEAR);
  const flows = pairs.map(p => p.cf);

  // Servono flussi sia positivi che negativi per avere una soluzione
  if (!flows.some(f => f < 0) || !flows.some(f => f > 0)) return null;

  // Newton-Raphson con guardrail
  let rate = 0.1;
  for (let i = 0; i < 300; i++) {
    const f = npv(rate, flows, years);
    const df = dnpv(rate, flows, years);
    if (Math.abs(df) < 1e-15) break;
    const next = rate - f / df;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next < -0.999 ? -0.999 : next;
  }

  // Fallback: bisezione se Newton-Raphson non converge
  let lo = -0.999, hi = 100;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid, flows, years) > 0) lo = mid; else hi = mid;
    if (hi - lo < 1e-8) return (lo + hi) / 2;
  }

  return null;
}

/**
 * Calcola il TWRR del portafoglio completo tramite XIRR.
 *
 * Flussi di cassa esterni:
 *   - Depositi     → negativi (l'investitore mette soldi)
 *   - Prelievi     → positivi (l'investitore ritira soldi)
 *   - Valore oggi  → positivo finale (liquidazione virtuale)
 *
 * @param {Array}  transactions        — tutte le transazioni dal localStorageService
 * @param {number} currentTotalValue   — valore attuale del portafoglio completo (incluso cash)
 * @returns {{ rate: number|null, pct: string|null }}
 */
export function calculateXIRR(transactions, currentTotalValue) {
  const cashFlows = [];
  const dates = [];

  transactions.forEach(tx => {
    const isCash = tx.isCash || tx.macroCategory === 'Cash';
    if (!isCash) return;

    const amount = (tx.quantity || 0) * (tx.price || 1);
    if (amount <= 0) return;

    const date = new Date(tx.date);
    if (isNaN(date.getTime())) return;

    if (tx.type === 'buy') {
      cashFlows.push(-amount);   // deposito: flusso uscente dall'investitore
      dates.push(date);
    } else if (tx.type === 'sell') {
      cashFlows.push(+amount);   // prelievo: flusso entrante all'investitore
      dates.push(date);
    }
  });

  if (cashFlows.length === 0 || currentTotalValue <= 0) return { rate: null, pct: null };

  // Valore finale oggi — liquidazione virtuale
  cashFlows.push(currentTotalValue);
  dates.push(new Date());

  const rate = xirr(cashFlows, dates);
  if (rate === null || !isFinite(rate)) return { rate: null, pct: null };

  const pct = (rate * 100).toFixed(2);
  return { rate, pct };
}
