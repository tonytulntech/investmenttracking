/**
 * Salvataggio di obiettivi, regole, avanzamento dell'esercizio e bozza del wizard.
 * Tutto in localStorage (sincronizzato nel cloud: vedi SYNC_KEYS). Lettura difensiva:
 * un dato corrotto non deve bloccare l'app.
 */
import { useEffect, useState } from 'react';

export const GOAL_KEYS = {
  goals: 'inv_goals_v1',
  rules: 'inv_goal_rules_v1',
  progress: 'inv_student_progress_v1',
  draft: 'inv_goal_wizard_draft_v1',
  revisions: 'inv_goal_revisions_v1',
  bucketMap: 'inv_goal_bucket_map_v1',
};

const EVENT = 'inv-goals-changed';
const SCHEMA_VERSION = 1;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(EVENT));
}

const isGoal = (g) => g && typeof g.id === 'string' && typeof g.name === 'string' && typeof g.type === 'string'
  && Number.isFinite(g.targetAmount) && typeof g.targetDate === 'string';
const isRules = (r) => r && typeof r.id === 'string' && typeof r.goalId === 'string' && Number.isInteger(r.version);

export const getGoals = () => {
  const v = read(GOAL_KEYS.goals, []);
  return Array.isArray(v) ? v.filter(isGoal) : [];
};
export const saveGoals = (goals) => write(GOAL_KEYS.goals, goals);

export const getRules = () => {
  const v = read(GOAL_KEYS.rules, []);
  return Array.isArray(v) ? v.filter(isRules) : [];
};
export const saveRules = (rules) => write(GOAL_KEYS.rules, rules);

/** Bucket scelto dallo studente per ogni titolo: { ticker: 'equity' | 'bondShort' | ... } */
export const getBucketMap = () => {
  const v = read(GOAL_KEYS.bucketMap, {});
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
};
export const saveBucketMap = (map) => write(GOAL_KEYS.bucketMap, map);

const isRevision = (r) => r && typeof r.id === 'string' && typeof r.goalId === 'string' && typeof r.status === 'string';
export const getRevisions = () => {
  const v = read(GOAL_KEYS.revisions, []);
  return Array.isArray(v) ? v.filter(isRevision) : [];
};
export const saveRevisions = (revisions) => write(GOAL_KEYS.revisions, revisions);

/** Salva insieme obiettivi, regole e revisioni (una modifica toccano più liste: si scrivono di fila e poi si notifica una volta). */
export function saveAll({ goals, rules, revisions }) {
  localStorage.setItem(GOAL_KEYS.goals, JSON.stringify(goals));
  localStorage.setItem(GOAL_KEYS.rules, JSON.stringify(rules));
  localStorage.setItem(GOAL_KEYS.revisions, JSON.stringify(revisions));
  window.dispatchEvent(new Event(EVENT));
}

/** Registra che lo studente ha fatto la review periodica senza modifiche. */
export function recordReview(now = new Date()) {
  const p = getProgress();
  write(GOAL_KEYS.progress, { ...p, lastReviewAt: now.toISOString() });
}

export const getProgress = () => {
  const v = read(GOAL_KEYS.progress, null);
  return {
    onboardingCompleted: v?.onboardingCompleted === true,
    onboardingCompletedAt: v?.onboardingCompletedAt ?? null,
    lastReviewAt: v?.lastReviewAt ?? null,
    schemaVersion: SCHEMA_VERSION,
  };
};

export const getDraft = () => {
  const v = read(GOAL_KEYS.draft, null);
  return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
};
export const saveDraft = (draft) => write(GOAL_KEYS.draft, draft);
export const clearDraft = () => {
  localStorage.removeItem(GOAL_KEYS.draft);
  window.dispatchEvent(new Event(EVENT));
};

/** Salva obiettivi e regole e chiude l'esercizio in un colpo solo (la bozza viene eliminata). */
export function completeOnboarding({ goals, rules, now = new Date() }) {
  localStorage.setItem(GOAL_KEYS.goals, JSON.stringify(goals));
  localStorage.setItem(GOAL_KEYS.rules, JSON.stringify(rules));
  localStorage.setItem(GOAL_KEYS.progress, JSON.stringify({
    onboardingCompleted: true, onboardingCompletedAt: now.toISOString(), lastReviewAt: null, schemaVersion: SCHEMA_VERSION,
  }));
  localStorage.removeItem(GOAL_KEYS.draft);
  window.dispatchEvent(new Event(EVENT));
}

export const snapshot = () => ({ goals: getGoals(), rules: getRules(), revisions: getRevisions(), bucketMap: getBucketMap(), progress: getProgress(), draft: getDraft() });

/** Hook: dati sempre aggiornati (stessa scheda e altre schede). */
export function useGoalData() {
  const [data, setData] = useState(snapshot);
  useEffect(() => {
    const refresh = () => setData(snapshot());
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return data;
}
