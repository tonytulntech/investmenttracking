// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearAllUserData, resetGoalExercise } from './userData';
import { SYNC_KEYS } from './cloudSyncCore';
import { GOAL_KEYS, getProgress, completeOnboarding } from './goalStore';

beforeEach(() => localStorage.clear());

describe('clearAllUserData', () => {
  it('elimina tutte le chiavi dei dati (anche obiettivi e regole) e tiene modalità e tema', () => {
    for (const k of SYNC_KEYS) localStorage.setItem(k, '"x"');
    localStorage.setItem('inv-theme', 'dark');
    const n = clearAllUserData();
    expect(n).toBe(SYNC_KEYS.length - 1);
    for (const k of SYNC_KEYS) if (k !== 'inv-mode') expect(localStorage.getItem(k)).toBeNull();
    expect(localStorage.getItem('inv-mode')).toBe('"x"');
    expect(localStorage.getItem('inv-theme')).toBe('dark');
  });
  it('dopo la cancellazione l\'esercizio risulta da rifare e le pagine aperte vengono avvisate', () => {
    completeOnboarding({ goals: [], rules: [] });
    expect(getProgress().onboardingCompleted).toBe(true);
    const spy = vi.fn();
    window.addEventListener('inv-goals-changed', spy);
    clearAllUserData();
    expect(getProgress().onboardingCompleted).toBe(false);
    expect(spy).toHaveBeenCalled();
  });
  it('senza dati non fa nulla e non fallisce', () => expect(clearAllUserData()).toBe(0));
});

describe('resetGoalExercise', () => {
  it('azzera obiettivi/regole/avanzamento/bozza/revisioni e lascia transazioni e bucket', () => {
    for (const k of Object.values(GOAL_KEYS)) localStorage.setItem(k, '[]');
    localStorage.setItem('investment_tracker_transactions', '[{"id":"1"}]');
    resetGoalExercise();
    for (const k of [GOAL_KEYS.goals, GOAL_KEYS.rules, GOAL_KEYS.progress, GOAL_KEYS.draft, GOAL_KEYS.revisions]) expect(localStorage.getItem(k)).toBeNull();
    expect(localStorage.getItem(GOAL_KEYS.bucketMap)).not.toBeNull();
    expect(localStorage.getItem('investment_tracker_transactions')).toBe('[{"id":"1"}]');
  });
});
