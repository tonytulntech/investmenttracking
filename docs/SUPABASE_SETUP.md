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

**Profili e modalità (obbligatorio prima di dare l'app ai clienti):** nuova query con il contenuto di `supabase/migrations/002_user_profiles.sql` → Run.
- Crea `user_profiles` (modalità `guided`/`advanced`/`pro` + `is_admin`), leggibile dal solo proprietario e **non modificabile dall'app**.
- Ogni nuovo utente parte in **Guidata**; l'admin (`tonypezzella.fa@gmail.com`) viene impostato in **Avanzata** con selettore visibile.
- Per cambiare la modalità di un cliente: Table Editor → `user_profiles` → modifica la colonna `mode`.
- Se lo script non è stato eseguito, l'app mostra tutte le pagine a tutti (comportamento storico) e nessuno vede il selettore.

## 2. Authentication
- **Sign In / Providers → Email**: attivo. **"Allow new users to sign up": OFF** (solo invitati).
- **URL Configuration**: Site URL = URL di produzione; Redirect URLs = `http://localhost:3000` (sviluppo).
- **Utenti**: Authentication → Users → **Invite user** (un'email per cliente).
- **Email templates** (Authentication → Emails → solo **Magic Link**): per permettere anche l'accesso con codice a 6 cifre, aggiungere nel testo `{{ .Token }}` accanto a `{{ .ConfirmationURL }}`. Non serve toccare il template Invite: l'invitato entra col link, poi riceve il Magic Link con il codice.
- **SMTP**: il servizio email predefinito di Supabase ha limiti molto bassi (poche email/ora). Prima di invitare più persone configurare un SMTP proprio (es. Resend) in Project Settings → Authentication → SMTP.

## 2a. Dominio
Dominio di produzione: `https://app.tpbalancellc.com` (CNAME `app` su Hostinger → valore indicato da Vercel; dominio aggiunto in Vercel → Settings → Domains, ambiente Production).
In Supabase → Authentication → URL Configuration: **Site URL** = `https://app.tpbalancellc.com`; tra i **Redirect URLs** aggiungere `https://app.tpbalancellc.com/**` (tenere anche localhost).
Pagine pubbliche per Google e per gli utenti: `/privacy` e `/termini` (testi in `src/pages/Legal.jsx`, dati del titolare in `src/config/legal.js` — **da far rivedere a un legale** e completare con denominazione/sede e regione reale dei dati).

## 2b. Accesso con Google (consigliato: nessuna email, nessun limite)
Il servizio email di default di Supabase consente pochissime email all'ora e non va bene per i clienti. Con Google il cliente non riceve email.
1. **Google Cloud Console** → APIs & Services → Credentials → *Create credentials → OAuth client ID* → tipo *Web application*. In *Authorized redirect URIs* inserire `https://<project-ref>.supabase.co/auth/v1/callback`. Se richiesto, configurare prima la schermata di consenso OAuth (app esterna, nome "Investitore").
   **Schermata di consenso (Branding)**: home `https://app.tpbalancellc.com`, privacy `https://app.tpbalancellc.com/privacy`, termini `https://app.tpbalancellc.com/termini`, dominio autorizzato `tpbalancellc.com`, email di assistenza e di contatto sviluppatore. Non caricare il logo (richiederebbe la verifica). Pubblicare l'app (Pubblico → In produzione).
2. Copiare **Client ID** e **Client secret** in Supabase → Authentication → Sign In / Providers → **Google** → attivare e salvare.
3. In Vercel aggiungere `VITE_GOOGLE_LOGIN` = `true` (Production) e fare Redeploy: compare il pulsante "Continua con Google".
4. **Creare gli utenti a mano, senza email**: Authentication → Users → **Add user → Create new user**, con l'email Google del cliente, password casuale e *Auto Confirm User* attivo. Al primo accesso con Google Supabase collega l'identità all'utente esistente.
Con la registrazione libera disattivata, un account Google non creato prima viene rifiutato con un messaggio chiaro.

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
