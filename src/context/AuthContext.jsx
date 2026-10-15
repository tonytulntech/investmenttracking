import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isCloudEnabled } from '../services/supabaseClient';
import { createCloudSync } from '../services/cloudSync';

/**
 * phase:
 *  loading   – controllo della sessione
 *  signedOut – serve il login
 *  syncing   – scarico/riconcilio i dati
 *  conflict  – dati sia locali sia nel cloud: serve la scelta dell'utente
 *  error     – sincronizzazione iniziale fallita
 *  ready     – app utilizzabile
 */
const AuthContext = createContext({
  cloudEnabled: false, googleEnabled: false, phase: 'ready', user: null, profile: null, syncStatus: 'idle', error: null,
  sendLink: async () => {}, verifyCode: async () => {}, signInWithGoogle: async () => {}, signOut: async () => ({ ok: true }),
  resolveConflict: async () => {}, retry: () => {},
});

// Profilo assegnato dall'amministratore (modalità, ruolo). null se non disponibile.
async function loadProfile(userId) {
  try {
    const { data, error } = await supabase.from('user_profiles').select('mode,is_admin').eq('user_id', userId).maybeSingle();
    if (error || !data) return null;
    return { mode: data.mode, isAdmin: data.is_admin === true };
  } catch {
    return null;
  }
}

const SIGNUPS_CLOSED = /signups? not allowed|otp_disabled/i;
// Il pulsante Google compare solo dopo aver attivato il provider in Supabase (VITE_GOOGLE_LOGIN=true).
const GOOGLE_ENABLED = import.meta.env.VITE_GOOGLE_LOGIN === 'true';

export function AuthProvider({ children }) {
  const [phase, setPhase] = useState(isCloudEnabled ? 'loading' : 'ready');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [error, setError] = useState(null);

  const syncRef = useRef(null);
  const conflictRef = useRef(null);
  const userIdRef = useRef(null);
  const sessionUserRef = useRef(null);

  const boot = useCallback(async (sessionUser) => {
    userIdRef.current = sessionUser.id;
    sessionUserRef.current = sessionUser;
    setUser(sessionUser);
    setError(null);
    setPhase('syncing');
    syncRef.current?.stop();
    const sync = createCloudSync({
      client: supabase,
      userId: sessionUser.id,
      onStatus: (s) => setSyncStatus(s),
    });
    syncRef.current = sync;
    try {
      const result = await sync.start();
      if (syncRef.current !== sync) return;
      const loaded = await loadProfile(sessionUser.id);
      if (syncRef.current !== sync) return;
      setProfile(loaded);
      if (result.conflict) {
        conflictRef.current = result;
        setPhase('conflict');
      } else {
        setPhase('ready');
      }
    } catch (err) {
      if (syncRef.current !== sync) return;
      setError(err?.message || 'Sincronizzazione non riuscita');
      setPhase('error');
    }
  }, []);

  const handleSession = useCallback((session) => {
    if (!session?.user) {
      if (userIdRef.current) {
        syncRef.current?.stop();
        syncRef.current = null;
        userIdRef.current = null;
        setUser(null);
        setProfile(null);
      }
      setPhase('signedOut');
      return;
    }
    if (userIdRef.current === session.user.id) return; // refresh del token: nessuna nuova sync
    boot(session.user);
  }, [boot]);

  useEffect(() => {
    if (!isCloudEnabled) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) handleSession(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // fuori dal callback: evita deadlock con le chiamate supabase successive
      setTimeout(() => { if (active) handleSession(session); }, 0);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [handleSession]);

  const sendLink = useCallback(async (email) => {
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    });
    if (!err) return;
    if (err.status === 429) throw new Error('Limite di invii email raggiunto: riprova più tardi (può servire fino a un\'ora) oppure accedi con Google.');
    // Non riveliamo se un indirizzo è autorizzato o no.
    if (SIGNUPS_CLOSED.test(`${err.code ?? ''} ${err.message ?? ''}`)) return;
    throw new Error('Impossibile inviare il link. Riprova tra poco.');
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) throw new Error('Accesso con Google non disponibile. Riprova.');
  }, []);

  const verifyCode = useCallback(async (email, token) => {
    const { error: err } = await supabase.auth.verifyOtp({ email, token: token.trim(), type: 'email' });
    if (err) throw new Error('Codice non valido o scaduto.');
  }, []);

  const resolveConflict = useCallback(async (choice) => {
    const pending = conflictRef.current;
    if (!pending) return;
    setPhase('syncing');
    try {
      await pending.resolve(choice);
      conflictRef.current = null;
      setPhase('ready');
    } catch (err) {
      setError(err?.message || 'Sincronizzazione non riuscita');
      setPhase('error');
    }
  }, []);

  const retry = useCallback(() => {
    const u = sessionUserRef.current;
    if (u) boot(u);
  }, [boot]);

  /** @returns {Promise<{ok:boolean, reason?:string}>} con force=true esce anche se ci sono modifiche non inviate */
  const signOut = useCallback(async ({ force = false } = {}) => {
    const sync = syncRef.current;
    if (sync && !force) {
      try { await sync.flush(); } catch { return { ok: false, reason: 'unsynced' }; }
    }
    sync?.wipeLocal();
    syncRef.current = null;
    userIdRef.current = null;
    sessionUserRef.current = null;
    await supabase.auth.signOut({ scope: 'local' });
    setUser(null);
    setProfile(null);
    setPhase('signedOut');
    return { ok: true };
  }, []);

  return (
    <AuthContext.Provider value={{
      cloudEnabled: isCloudEnabled, googleEnabled: GOOGLE_ENABLED, phase, user, profile, syncStatus, error,
      sendLink, verifyCode, signInWithGoogle, signOut, resolveConflict, retry,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
