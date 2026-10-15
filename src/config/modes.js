export const MODE_STORAGE_KEY = 'inv-mode';
export const DEFAULT_MODE = 'advanced';

// routes: null = tutte le pagine; altrimenti prefissi di percorso consentiti.
export const MODES = {
  guided: {
    label: 'Guidata',
    description: 'Per iniziare: poche pagine, tutto spiegato passo passo.',
    routes: ['/', '/portfolio', '/transactions', '/settings'],
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
