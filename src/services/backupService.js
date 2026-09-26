/**
 * Backup e ripristino completi di localStorage.
 *
 * I valori sono salvati come stringhe grezze, esattamente come stanno in
 * localStorage: il round-trip è garantito anche per chiavi che non contengono
 * JSON (es. 'inv-theme' = "dark"). Il file risulta meno leggibile ma non c'è
 * nessuna riscrittura implicita dei dati — che è quello che serve a un backup.
 */

import { getBackupKeys, isCacheKey, KEY_LABELS } from './storageKeys';

export const BACKUP_FORMAT = 'investment-tracker-backup';
export const BACKUP_VERSION = 1;

/** Costruisce l'oggetto di backup da localStorage. */
export function createBackup(storage = localStorage) {
  const data = {};
  getBackupKeys(storage).forEach(key => {
    const value = storage.getItem(key);
    if (value !== null) data[key] = value;
  });

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: '3.0.0',
    data,
  };
}

export function serializeBackup(backup) {
  return JSON.stringify(backup, null, 2);
}

/**
 * Verifica che un oggetto sia un backup utilizzabile.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBackup(backup) {
  const errors = [];

  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
    return { valid: false, errors: ['Il file non contiene un oggetto di backup.'] };
  }
  if (backup.format !== BACKUP_FORMAT) {
    errors.push('Il file non è un backup di Investment Tracker.');
  }
  if (typeof backup.version !== 'number' || backup.version > BACKUP_VERSION) {
    errors.push(`Versione di backup non supportata (${backup.version}).`);
  }
  if (!backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) {
    errors.push('Il backup non contiene dati.');
  } else {
    const invalid = Object.entries(backup.data).filter(([, v]) => typeof v !== 'string');
    if (invalid.length > 0) {
      errors.push(`${invalid.length} chiavi hanno un formato non valido.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Legge il testo di un file di backup. Non lancia mai. */
export function parseBackup(text) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    return { backup: null, valid: false, errors: ['Il file non è un JSON valido.'] };
  }
  const { valid, errors } = validateBackup(backup);
  return { backup: valid ? backup : null, valid, errors };
}

/**
 * Riepilogo leggibile del contenuto di un backup, per la conferma prima del
 * ripristino. `count` è il numero di elementi se il valore è un array JSON.
 */
export function summarizeBackup(backup) {
  return Object.entries(backup.data)
    .map(([key, value]) => {
      let count = null;
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) count = parsed.length;
        else if (parsed && typeof parsed === 'object') count = Object.keys(parsed).length;
      } catch { /* valore non JSON: nessun conteggio */ }

      return { key, label: KEY_LABELS[key] || key, count, bytes: value.length };
    })
    .sort((a, b) => b.bytes - a.bytes);
}

/**
 * Ripristina un backup.
 *
 * mode 'replace': cancella tutte le chiavi non-cache esistenti, poi scrive il
 *   backup. Lo stato finale è identico a quello del momento del backup.
 * mode 'merge': scrive solo le chiavi assenti. Non fonde il contenuto delle
 *   chiavi già presenti — serve a recuperare dati mancanti, non a unire due
 *   installazioni.
 *
 * @returns {{ restored: string[], skipped: string[], removed: string[] }}
 */
export function restoreBackup(backup, { mode = 'replace' } = {}, storage = localStorage) {
  const { valid, errors } = validateBackup(backup);
  if (!valid) throw new Error(errors.join(' '));

  const removed = [];
  if (mode === 'replace') {
    getBackupKeys(storage).forEach(key => {
      storage.removeItem(key);
      removed.push(key);
    });
  }

  const restored = [];
  const skipped = [];
  Object.entries(backup.data).forEach(([key, value]) => {
    if (isCacheKey(key)) { skipped.push(key); return; }
    if (mode === 'merge' && storage.getItem(key) !== null) { skipped.push(key); return; }
    storage.setItem(key, value);
    restored.push(key);
  });

  return { restored, skipped, removed };
}

/** Nome file suggerito, ordinabile cronologicamente. */
export function backupFilename(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
                `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `investment-tracker-backup_${stamp}.json`;
}
