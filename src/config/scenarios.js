/**
 * Ipotesi di rendimento per stimare la fattibilità di un obiettivo.
 *
 * NON sono consigli né modelli di portafoglio: l'app non dice come investire (lo spiega il corso).
 * Servono solo a rispondere a "se i mercati andassero così, ci arrivo?". Ogni ipotesi è un insieme di
 * rendimento e oscillazione attesi, calcolato dalle ipotesi di mercato dichiarate in marketAssumptions.js;
 * la miscela di asset qui sotto è solo il modo con cui si ottengono quei due numeri nel simulatore
 * e NON viene mai mostrata all'utente.
 * Quando lo studente dichiara la propria composizione (regole firmate) la fattibilità usa quella.
 */
export const SCENARIOS = [
  { id: 'prudent', label: 'Prudente', mix: { equity: 20, bondShort: 30, bondMedium: 30, cash: 20 } },
  { id: 'medium',  label: 'Medio',    mix: { equity: 50, bondShort: 10, bondMedium: 30, cash: 5, gold: 5 } },
  { id: 'dynamic', label: 'Dinamico', mix: { equity: 80, bondMedium: 15, gold: 5 } },
];

export const DEFAULT_SCENARIO = 'medium';

/** Il fondo emergenza deve essere disponibile: il calcolo assume liquidità, qualunque ipotesi sia scelta. */
export const EMERGENCY_MIX = { cash: 100 };

export const scenarioById = (id) => SCENARIOS.find(s => s.id === id) ?? SCENARIOS.find(s => s.id === DEFAULT_SCENARIO);
