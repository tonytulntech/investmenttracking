/**
 * Cancellazione dei dati dell'utente. Le rimozioni passano da localStorage.removeItem: con l'account attivo
 * la sincronizzazione le replica nel cloud (con un breve ritardo), quindi i dati non "tornano" al prossimo accesso.
 */
import { SYNC_KEYS } from './cloudSyncCore';
import { GOAL_KEYS, notifyGoalsChanged } from './goalStore';

// La modalità è una preferenza dell'amministratore/proprietario, non un dato: non si cancella.
const KEEP = new Set(['inv-mode']);

/** Elimina TUTTI i dati dell'utente (transazioni, impostazioni, obiettivi, regole firmate, storico…). @returns {number} chiavi rimosse */
export function clearAllUserData() {
  let removed = 0;
  for (const key of SYNC_KEYS) {
    if (KEEP.has(key) || localStorage.getItem(key) === null) continue;
    localStorage.removeItem(key);
    removed += 1;
  }
  notifyGoalsChanged();
  return removed;
}

/** Ricomincia l'esercizio Obiettivi: elimina obiettivi, regole, avanzamento, bozza e revisioni. Le transazioni restano (tornano "da assegnare"). */
export function resetGoalExercise() {
  for (const key of [GOAL_KEYS.goals, GOAL_KEYS.rules, GOAL_KEYS.progress, GOAL_KEYS.draft, GOAL_KEYS.revisions]) {
    if (localStorage.getItem(key) !== null) localStorage.removeItem(key);
  }
  notifyGoalsChanged();
}
