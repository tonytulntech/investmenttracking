import { createClient } from '@supabase/supabase-js';
import { OWNER_KEY } from './cloudSync';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Il cloud è SPENTO per default (app locale, nessun account). Si accende solo con VITE_CLOUD=on
// (più le chiavi VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY). Così un progetto Supabase fermo o non raggiunto
// non può mai bloccare l'app.
export const isCloudEnabled = Boolean(url && anonKey) && import.meta.env.VITE_CLOUD === 'on';

// In modalità locale i dati cambiano senza essere tracciati per la sincronizzazione. Se il cloud verrà riacceso,
// il primo accesso deve chiedere esplicitamente cosa tenere (invece di far vincere in silenzio la copia del cloud).
if (!isCloudEnabled) {
  try { localStorage.removeItem(OWNER_KEY); } catch { /* storage non disponibile */ }
}

export const supabase = isCloudEnabled
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
