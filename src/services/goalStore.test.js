// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GOAL_KEYS, getGoals, saveGoals, getRules, saveRules, getProgress, getDraft, saveDraft, clearDraft,
  completeOnboarding, snapshot,
} from './goalStore';
import { SYNC_KEYS } from './cloudSyncCore';

const goal = (over = {}) => ({ id: 'g1', name: 'Casa', type: 'house', targetAmount: 100000, targetDate: '2032-10', ...over });
const NOW = new Date('2026-10-15T10:00:00Z');

beforeEach(() => localStorage.clear());

describe('chiavi', () => {
  it('tutte le chiavi dell\'esercizio sono sincronizzate nel cloud', () => {
    for (const k of Object.values(GOAL_KEYS)) expect(SYNC_KEYS).toContain(k);
  });
});

describe('lettura difensiva', () => {
  it('senza dati: liste vuote, esercizio non completato, nessuna bozza', () => {
    expect(getGoals()).toEqual([]);
    expect(getRules()).toEqual([]);
    expect(getProgress()).toMatchObject({ onboardingCompleted: false, onboardingCompletedAt: null, schemaVersion: 1 });
    expect(getDraft()).toBeNull();
  });
  it('JSON corrotto → valori di default, nessuna eccezione', () => {
    for (const k of Object.values(GOAL_KEYS)) localStorage.setItem(k, '{non json');
    expect(getGoals()).toEqual([]);
    expect(getProgress().onboardingCompleted).toBe(false);
    expect(getDraft()).toBeNull();
  });
  it('tipo sbagliato (non array / non oggetto) → default', () => {
    localStorage.setItem(GOAL_KEYS.goals, '{"a":1}');
    localStorage.setItem(GOAL_KEYS.draft, '[1,2]');
    expect(getGoals()).toEqual([]);
    expect(getDraft()).toBeNull();
  });
  it('scarta gli obiettivi malformati ma tiene quelli validi', () => {
    localStorage.setItem(GOAL_KEYS.goals, JSON.stringify([goal(), { id: 'x' }, null, goal({ id: 'g2', targetAmount: 'tanti' }), goal({ id: 'g3' })]));
    expect(getGoals().map(g => g.id)).toEqual(['g1', 'g3']);
  });
  it('onboardingCompleted vale solo se esattamente true', () => {
    localStorage.setItem(GOAL_KEYS.progress, JSON.stringify({ onboardingCompleted: 'true' }));
    expect(getProgress().onboardingCompleted).toBe(false);
  });
});

describe('scrittura', () => {
  it('salva e rilegge obiettivi e regole', () => {
    saveGoals([goal()]);
    saveRules([{ id: 'r1', goalId: 'g1', version: 1 }]);
    expect(getGoals()).toHaveLength(1);
    expect(getRules()[0].goalId).toBe('g1');
  });
  it('notifica i cambiamenti', () => {
    const cb = vi.fn();
    window.addEventListener('inv-goals-changed', cb);
    saveGoals([goal()]);
    saveDraft({ step: 2 });
    clearDraft();
    expect(cb).toHaveBeenCalledTimes(3);
    window.removeEventListener('inv-goals-changed', cb);
  });
  it('bozza: salva, rilegge, cancella', () => {
    saveDraft({ step: 3, answers: { a: 1 } });
    expect(getDraft()).toEqual({ step: 3, answers: { a: 1 } });
    clearDraft();
    expect(getDraft()).toBeNull();
  });
});

describe('completeOnboarding', () => {
  it('salva obiettivi e regole, segna l\'esercizio completato e cancella la bozza', () => {
    saveDraft({ step: 5 });
    completeOnboarding({ goals: [goal()], rules: [{ id: 'r1', goalId: 'g1', version: 1 }], now: NOW });
    const s = snapshot();
    expect(s.goals).toHaveLength(1);
    expect(s.rules).toHaveLength(1);
    expect(s.progress).toMatchObject({ onboardingCompleted: true, onboardingCompletedAt: NOW.toISOString() });
    expect(s.draft).toBeNull();
  });
});
