export const MODE_STORAGE_KEY = 'inv-mode';
export const DEFAULT_MODE = 'advanced';

// routes: null = tutte le pagine; altrimenti prefissi di percorso consentiti.
export const MODES = {
  guided: {
    label: 'Guidata',
    description: 'Per iniziare: poche pagine, tutto spiegato passo passo.',
    routes: ['/', '/obiettivi', '/regole', '/guida', '/portfolio', '/transactions', '/settings'],
  },
  advanced: {
    label: 'Avanzata',
    description: 'Tutte le pagine di analisi e gestione del portafoglio.',
    routes: null,
  },
  pro: {
    label: 'Pro',
    description: 'Come Avanzata, con gli strumenti per consulenti (in arrivo).',
    routes: null,
  },
};

export const isValidMode = (mode) => Object.prototype.hasOwnProperty.call(MODES, mode);

export function isRouteAllowed(mode, pathname) {
  const allowed = MODES[mode]?.routes;
  if (!allowed) return true;
  return allowed.some(r => (r === '/' ? pathname === '/' : pathname === r || pathname.startsWith(r + '/')));
}

/**
 * Modalità effettiva.
 * - App senza cloud: scelta locale del proprietario.
 * - Con account: la modalità è ASSEGNATA dall'amministratore (profilo su Supabase).
 *   Un cliente non può cambiarla; l'amministratore può provare le altre per sé (`localMode`).
 * - Profilo non disponibile (es. script SQL non ancora eseguito): comportamento storico (Avanzata).
 */
export function resolveMode({ cloudEnabled, profile, localMode }) {
  if (!cloudEnabled) return isValidMode(localMode) ? localMode : DEFAULT_MODE;
  if (!profile) return DEFAULT_MODE;
  if (profile.isAdmin) {
    if (isValidMode(localMode)) return localMode;
    return isValidMode(profile.mode) ? profile.mode : DEFAULT_MODE;
  }
  return isValidMode(profile.mode) ? profile.mode : 'guided';
}

export const canChangeMode = ({ cloudEnabled, profile }) => !cloudEnabled || profile?.isAdmin === true;
