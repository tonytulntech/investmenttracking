/**
 * tickerReportService.js
 *
 * Gestisce la segnalazione di titoli il cui prezzo non viene trovato.
 * Oggi (app locale single-user): salva le segnalazioni in localStorage e apre
 * una mail precompilata verso il team.
 *
 * Domani (SaaS multi-utente): la funzione reportTicker() farà una POST a un
 * endpoint API con l'utente autenticato; il backend aggiungerà il titolo al
 * database e invierà una mail di conferma quando risolto. La firma resta la
 * stessa, cambia solo l'implementazione interna → nessuna modifica alle pagine.
 */

const STORAGE_KEY = 'reported_tickers_v1';
const SUPPORT_EMAIL = 'pezzellatony7@gmail.com';

// ── Lettura/scrittura segnalazioni locali ────────────────────────────────────
export function getReportedTickers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveReportedTickers(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * Segnala uno o più titoli mancanti.
 * @param {Array<{ticker, name, isin}>} tickers
 * @param {Object} opts { openMail: boolean }
 * @returns {{ reported: Array, alreadyReported: Array }}
 */
export function reportTickers(tickers, opts = {}) {
  const { openMail = true } = opts;
  const existing = getReportedTickers();
  const existingKeys = new Set(existing.map(t => (t.ticker || '').toUpperCase()));

  const reported = [];
  const alreadyReported = [];

  tickers.forEach(t => {
    const key = (t.ticker || '').toUpperCase();
    if (!key) return;
    if (existingKeys.has(key)) {
      alreadyReported.push(t);
      return;
    }
    const entry = {
      ticker: t.ticker,
      name: t.name || t.ticker,
      isin: t.isin || '',
      macroCategory: t.macroCategory || '',
      reportedAt: new Date().toISOString(),
      status: 'pending', // pending | resolved (aggiornato dal backend in futuro)
    };
    existing.push(entry);
    existingKeys.add(key);
    reported.push(entry);
  });

  saveReportedTickers(existing);

  // ── Invio: oggi mailto, domani POST API ────────────────────────────────────
  // TODO(SaaS): sostituire con
  //   await fetch('/api/ticker-requests', { method:'POST', body: JSON.stringify({ user, tickers: reported }) })
  // Il backend risponderà via email quando il titolo è aggiunto.
  if (openMail && reported.length > 0) {
    const lines = reported.map(t =>
      `- ${t.ticker}${t.isin ? ` (ISIN ${t.isin})` : ''}${t.name && t.name !== t.ticker ? ` — ${t.name}` : ''}`
    ).join('%0A');
    const subject = encodeURIComponent(`Richiesta aggiunta titoli — ${reported.length} ticker`);
    const body =
      `Ciao,%0A%0AI seguenti titoli non hanno un prezzo disponibile nell'app e vorrei fossero aggiunti al database:%0A%0A${lines}%0A%0AGrazie!`;
    window.open(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`, '_blank');
  }

  return { reported, alreadyReported };
}

/**
 * Verifica se un ticker è già stato segnalato.
 */
export function isReported(ticker) {
  const key = (ticker || '').toUpperCase();
  return getReportedTickers().some(t => (t.ticker || '').toUpperCase() === key);
}

/**
 * Rimuove una segnalazione (es. quando il titolo viene finalmente prezzato).
 */
export function clearReportedTicker(ticker) {
  const key = (ticker || '').toUpperCase();
  const list = getReportedTickers().filter(t => (t.ticker || '').toUpperCase() !== key);
  saveReportedTickers(list);
}

export default { getReportedTickers, reportTickers, isReported, clearReportedTicker };
