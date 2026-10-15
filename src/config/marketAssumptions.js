/**
 * Ipotesi di mercato per le simulazioni (modalità Guidata / Obiettivi).
 *
 * UNICA fonte di verità. Rendimenti NOMINALI in euro, annui, LORDI di costi
 * e tasse (costi e tasse si applicano a parte). Sono ipotesi PRUDENZIALI di
 * lungo periodo, non previsioni. Da rivedere periodicamente: aggiornare
 * `version` e `asOf` a ogni modifica.
 */
export const MARKET_ASSUMPTIONS = {
  version: 2,
  asOf: '2026-10',
  source: 'Valori di partenza dalla specifica del corso (v2) — da validare e aggiornare dall\'autore.',

  inflation: 2.2,     // % annua attesa nel lungo periodo (ipotesi, non l'ultimo dato osservato)
  inflationVol: 1.2,  // % deviazione standard annua (per il modello con inflazione casuale)
  taxRate: 26,        // % predefinita: plusvalenze, residente fiscale in Italia
  costDrag: 0.2,      // % annua: TER medio stimato, sottratto dal rendimento

  // return/volatility in % annua
  assets: {
    equity:     { label: 'Azionario',       return: 6.5, volatility: 15.5 },
    bond:       { label: 'Obbligazionario', return: 3.0, volatility: 6 },       // generico (categoria macro dei portafogli)
    bondShort:  { label: 'Obblig. breve',   return: 2.5, volatility: 2 },
    bondMedium: { label: 'Obblig. medio',   return: 3.0, volatility: 6 },
    gold:       { label: 'Oro',             return: 3.5, volatility: 15 },
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
    // bucket obbligazionari breve/medio (stime iniziali, da validare)
    'equity|bondShort': 0.1,  'equity|bondMedium': 0.2,  'bondShort|bondMedium': 0.6,
    'bondShort|cash': 0.3,    'bondMedium|cash': 0.1,
    'bondShort|gold': 0.15,   'bondMedium|gold': 0.25,
    // correlazione con l'inflazione (stime iniziali, da validare con i dati del Backtesto)
    'inflation|equity': 0.0,    'inflation|bond': -0.2,       'inflation|bondShort': -0.1,
    'inflation|bondMedium': -0.2, 'inflation|cash': 0.3,      'inflation|gold': 0.2,
    'inflation|commodity': 0.4, 'inflation|realEstate': 0.2,  'inflation|crypto': 0.0,
  },

  // Soglie del semaforo sulla probabilità di successo (%) (D5 della spec).
  thresholds: { onTrack: 75, watch: 50 },

  // Aliquota sulle plusvalenze al momento del ritiro, per residenza fiscale.
  // `rate: null` = la inserisce l'utente. Aliquote di altri paesi NON precaricate:
  // cambiano e dipendono dalla situazione personale; aggiungerle qui solo se verificate.
  taxProfiles: [
    { code: 'IT',    label: 'Italia',      rate: 26,   govBondsRate: 12.5, note: 'Plusvalenze su ETF e azioni 26%; titoli di Stato white list 12,5%.' },
    { code: 'OTHER', label: 'Altro paese', rate: null, govBondsRate: null, note: 'Inserisci tu l\'aliquota che ti riguarda.' },
  ],
};

/**
 * Aliquota (%) da applicare alle plusvalenze al ritiro.
 * @param {{country?:string, customRate?:number}} residence
 * @returns {number} percentuale tra 0 e 60 (default: Italia)
 */
export function resolveTaxRate(residence = {}) {
  const profile = MARKET_ASSUMPTIONS.taxProfiles.find(p => p.code === residence.country);
  const raw = profile?.rate ?? residence.customRate;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return MARKET_ASSUMPTIONS.taxRate;
  return Math.min(60, Math.max(0, raw));
}

export function getCorrelation(a, b) {
  if (a === b) return 1;
  const c = MARKET_ASSUMPTIONS.correlations;
  return c[`${a}|${b}`] ?? c[`${b}|${a}`] ?? 0;
}
