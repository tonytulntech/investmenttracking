import { describe, it, beforeEach, expect } from 'vitest';
import {
  createBackup, serializeBackup, parseBackup, validateBackup,
  summarizeBackup, restoreBackup, backupFilename, BACKUP_FORMAT,
} from './backupService';
import { STORAGE_KEYS } from './storageKeys';

function seedStorage() {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([{ id: 1 }, { id: 2 }]));
  localStorage.setItem(STORAGE_KEYS.PORTFOLIO_CONFIG, JSON.stringify({ portfolios: [{ id: 'p1' }] }));
  localStorage.setItem(STORAGE_KEYS.THEME, 'dark');            // non-JSON
  localStorage.setItem('price_cache', JSON.stringify({ AAPL: 1 }));       // cache
  localStorage.setItem('hist_v2_SWDA_2024-01-15', '{}');                  // cache dinamica
}

beforeEach(() => localStorage.clear());

describe('createBackup', () => {
  it('include i dati ed esclude le cache', () => {
    seedStorage();
    const backup = createBackup();

    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(Object.keys(backup.data)).toContain(STORAGE_KEYS.TRANSACTIONS);
    expect(Object.keys(backup.data)).toContain(STORAGE_KEYS.THEME);
    expect(Object.keys(backup.data)).not.toContain('price_cache');
  });

  it('esclude anche le cache con nome dinamico', () => {
    seedStorage();
    const keys = Object.keys(createBackup().data);
    expect(keys.some(k => k.startsWith('hist_v2_'))).toBe(false);
  });

  it('include una chiave sconosciuta non ancora registrata', () => {
    localStorage.setItem('goals', JSON.stringify([{ id: 'g1' }]));
    expect(createBackup().data).toHaveProperty('goals');
  });

  it('produce un backup vuoto ma valido se non c è nulla', () => {
    const backup = createBackup();
    expect(backup.data).toEqual({});
    expect(validateBackup(backup).valid).toBe(true);
  });
});

describe('round-trip', () => {
  it('ripristina uno stato identico a quello di partenza', () => {
    seedStorage();
    const snapshot = { ...localStorage };
    const text = serializeBackup(createBackup());

    localStorage.clear();
    const { backup, valid } = parseBackup(text);
    expect(valid).toBe(true);
    restoreBackup(backup);

    expect(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)).toBe(snapshot[STORAGE_KEYS.TRANSACTIONS]);
    expect(localStorage.getItem(STORAGE_KEYS.PORTFOLIO_CONFIG)).toBe(snapshot[STORAGE_KEYS.PORTFOLIO_CONFIG]);
  });

  it('non altera un valore che non è JSON', () => {
    localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    const text = serializeBackup(createBackup());
    localStorage.clear();
    restoreBackup(parseBackup(text).backup);
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe('dark');
  });
});

describe('restoreBackup', () => {
  it('in modalità replace rimuove le chiavi non presenti nel backup', () => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, '[]');
    const backup = createBackup();

    localStorage.setItem(STORAGE_KEYS.STRATEGY, '{"a":1}');
    const { removed } = restoreBackup(backup, { mode: 'replace' });

    expect(removed).toContain(STORAGE_KEYS.STRATEGY);
    expect(localStorage.getItem(STORAGE_KEYS.STRATEGY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)).toBe('[]');
  });

  it('in modalità merge non sovrascrive le chiavi già presenti', () => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, '["vecchio"]');
    const backup = createBackup();

    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, '["nuovo"]');
    const { restored, skipped } = restoreBackup(backup, { mode: 'merge' });

    expect(skipped).toContain(STORAGE_KEYS.TRANSACTIONS);
    expect(restored).not.toContain(STORAGE_KEYS.TRANSACTIONS);
    expect(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)).toBe('["nuovo"]');
  });

  it('non riscrive le cache contenute in un vecchio backup', () => {
    const backup = {
      format: BACKUP_FORMAT, version: 1, createdAt: '', data: { price_cache: '{}' },
    };
    const { restored, skipped } = restoreBackup(backup);
    expect(skipped).toContain('price_cache');
    expect(restored).toEqual([]);
  });

  it('rifiuta un backup non valido senza toccare i dati', () => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, '["intatto"]');
    expect(() => restoreBackup({ format: 'altro', version: 1, data: {} })).toThrow();
    expect(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)).toBe('["intatto"]');
  });
});

describe('validateBackup e parseBackup', () => {
  it('rifiuta JSON malformato', () => {
    const { valid, errors } = parseBackup('{ non json');
    expect(valid).toBe(false);
    expect(errors[0]).toMatch(/JSON/);
  });

  it('rifiuta un file di un altro programma', () => {
    expect(validateBackup({ format: 'qualcos-altro', version: 1, data: {} }).valid).toBe(false);
  });

  it('rifiuta una versione futura', () => {
    expect(validateBackup({ format: BACKUP_FORMAT, version: 99, data: {} }).valid).toBe(false);
  });

  it('rifiuta valori non stringa', () => {
    const result = validateBackup({ format: BACKUP_FORMAT, version: 1, data: { a: 42 } });
    expect(result.valid).toBe(false);
  });
});

describe('summarizeBackup', () => {
  it('conta gli elementi degli array e nomina le chiavi note', () => {
    seedStorage();
    const rows = summarizeBackup(createBackup());
    const transactions = rows.find(r => r.key === STORAGE_KEYS.TRANSACTIONS);

    expect(transactions.count).toBe(2);
    expect(transactions.label).toBe('Transazioni');
    expect(rows.find(r => r.key === STORAGE_KEYS.THEME).count).toBeNull();
  });
});

describe('backupFilename', () => {
  it('genera un nome ordinabile', () => {
    expect(backupFilename(new Date(2026, 0, 5, 9, 3, 7)))
      .toBe('investment-tracker-backup_2026-01-05_090307.json');
  });
});
