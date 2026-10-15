import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Senza variabili d'ambiente l'app resta in modalità locale (nessun account).
export const isCloudEnabled = Boolean(url && anonKey);

export const supabase = isCloudEnabled
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
