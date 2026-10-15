/**
 * Ipotesi di mercato per le simulazioni (modalità Guidata / Obiettivi).
 *
 * UNICA fonte di verità. Rendimenti NOMINALI in euro, annui, LORDI di costi
 * e tasse (costi e tasse si applicano a parte). Sono ipotesi PRUDENZIALI di
 * lungo periodo, non previsioni. Da rivedere periodicamente: aggiornare
 * `version` e `asOf` a ogni modifica.
 */
export const MARKET_ASSUMPTIONS = {
  version: 1,
  asOf: '2026-10',
  source: 'Ipotesi prudenziali dell\'autore del corso — da validare e aggiornare.',

  inflation: 2.0,     // % annua
  taxRate: 26,        // % capital gain, investitore fiscalmente italiano
  costDrag: 0.2,      // % annua: TER medio stimato, sottratto dal rendimento

  // return/volatility in % annua
  assets: {
    equity:     { label: 'Azionario',       return: 6.0, volatility: 15 },
    bond:       { label: 'Obbligazionario', return: 2.5, volatility: 5 },
    gold:       { label: 'Oro',             return: 3.0, volatility: 15 },
    commodity:  { label: 'Materie prime',   return: 3.0, volatility: 18 },
    realEstate: { label: 'Immobiliare',     return: 5.0, volatility: 17 },
    crypto:     { label: 'Crypto',          return: 8.0, volatility: 60 },
    cash:       { label: 'Liquidità',       return: 2.0, volatility: 0.5 },
  },

  // Correlazioni (simmetriche); la diagonale è 1 e le coppie mancanti valgono 0.
  correlations: {
    'equity|bond': 0.2,       'equity|gold': 0.05,      'equity|commodity': 0.5,
    'equity|realEstate': 0.75, 'equity|crypto': 0.35,
    'bond|gold': 0.25,        'bond|realEstate': 0.35,  'bond|cash': 0.1,
    'bond|crypto': 0.05,
    'gold|commodity': 0.35,   'gold|realEstate': 0.1,   'gold|crypto': 0.15,
    'commodity|realEstate': 0.3, 'commodity|crypto': 0.2,
    'realEstate|crypto': 0.3,
  },

  // Quota azionaria target per anni mancanti all'obiettivo (D4 della spec).
  glidePath: [
    { minYears: 15, equity: { min: 80, max: 90 } },
    { minYears: 10, equity: { min: 70, max: 80 } },
    { minYears: 5,  equity: { min: 50, max: 60 } },
    { minYears: 3,  equity: { min: 30, max: 40 } },
    { minYears: 0,  equity: { min: 10, max: 20 } },
  ],

  // Soglie del semaforo sulla probabilità di successo (%) (D5 della spec).
  thresholds: { onTrack: 80, watch: 60 },
};

export function getCorrelation(a, b) {
  if (a === b) return 1;
  const c = MARKET_ASSUMPTIONS.correlations;
  return c[`${a}|${b}`] ?? c[`${b}|${a}`] ?? 0;
}
