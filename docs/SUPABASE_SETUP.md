# Account e sincronizzazione (Supabase) — configurazione

L'app funziona in due modi:
- **Senza** variabili `VITE_SUPABASE_*`: modalità locale, nessun account (comportamento storico).
- **Con** le variabili: login via email (solo su invito) + dati sincronizzati nel cloud, isolati per utente.

## Ordine da rispettare
1. **Database** → eseguire lo script SQL (sotto).
2. **Supabase → Authentication** → impostazioni (sotto).
3. **Vercel → Environment Variables** → aggiungere le due chiavi e fare redeploy.

Se si fa il punto 3 prima del punto 1, al login compare "Sincronizzazione non riuscita" (nessun dato viene toccato).

## 1. Database
Supabase → **SQL Editor** → New query → incollare il contenuto di `supabase/migrations/001_user_data.sql` → **Run**.
Crea la tabella `user_data` con Row Level Security: ogni utente legge/scrive solo le proprie righe; l'accesso anonimo è negato.

## 2. Authentication
- **Sign In / Providers → Email**: attivo. **"Allow new users to sign up": OFF** (solo invitati).
- **URL Configuration**: Site URL = URL di produzione; Redirect URLs = `http://localhost:3000` (sviluppo).
- **Utenti**: Authentication → Users → **Invite user** (un'email per cliente).
- **Email templates** (Magic Link **e** Invite): per permettere anche l'accesso con codice a 6 cifre, aggiungere nel testo `{{ .Token }}`, es. «Il tuo codice: {{ .Token }}».
- **SMTP**: il servizio email predefinito di Supabase ha limiti molto bassi (poche email/ora). Prima di invitare più persone configurare un SMTP proprio (es. Resend) in Project Settings → Authentication → SMTP.

## 3. Vercel
Settings → Environment Variables (Production e Preview):
- `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = la chiave **anon/publishable** (Project Settings → API).

**Mai** usare o committare la chiave `service_role`. Poi **Redeploy** (le variabili `VITE_` vengono incorporate in fase di build).
Le preview di Vercel hanno un URL diverso: il link di accesso riporta all'URL di produzione (Site URL), a meno di aggiungere l'URL della preview ai Redirect URLs.

## Come funziona la sincronizzazione
- I servizi scrivono su `localStorage`; solo le chiavi in `SYNC_KEYS` (`cloudSyncCore.js`) vanno nel cloud (dati dell'utente, non cache né tema).
- Le modifiche partono dopo ~1,5 s, in blocco; se la rete manca, riprova da sola.
- Conflitti tra dispositivi: vince la modifica più recente per chiave (orologio del dispositivo).
- **Primo accesso**: browser vuoto → scarica il cloud; browser con dati e cloud vuoto → li carica (migrazione); dati da entrambe le parti → l'utente sceglie quale tenere.
- **Dispositivo condiviso**: i dati di un altro utente non vengono mai caricati né mostrati; all'uscita i dati vengono rimossi dal browser (restano nel cloud).

## Privacy
Chi amministra il progetto Supabase può tecnicamente leggere il database dalla dashboard. Va dichiarato nell'informativa privacy. Per rendere i dati illeggibili anche all'amministratore servirebbe cifratura lato browser (non implementata: complica recupero accesso e funzioni lato server).
