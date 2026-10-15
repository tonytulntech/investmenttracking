# CLAUDE.md — Memoria di progetto

> Leggi questo file all'inizio di ogni sessione **invece di ri-scansionare tutto il codebase**.
> Serve a risparmiare token e a non ri-derivare fatti già noti. Tienilo aggiornato quando cambia l'architettura.

## Cos'è
Investment Tracker → **Investitore 1.0**: web app di analisi di portafoglio investimenti. React 18 + Vite 5 + React Router 6 + Recharts + Tailwind. **JavaScript (.jsx), non TypeScript.** In italiano.

## ⚠️ Fatti architetturali critici (verificati nel codice)
- **L'app reale è in `src/pages/`** (attualmente 10 pagine attive: Dashboard, Portfolio, Performance, Transazioni, Analisi, Portafogli, Patrimonio, Dividendi, Ribilanciamento, Impostazioni). Le pagine PAC/Strategia/Backtest/Mercati/Calcolatori/Crypto restano nel repo ma non registrate in App.jsx — riabilitabili al volo. È **local-first**: tutti i dati vivono in `localStorage` del browser via `src/services/localStorageService.js`. **Nessuna autenticazione, nessun cloud, single-user.**
- **Codice morto Firebase RIMOSSO** (Fase 0, ott 2026): `src/config/firebase.js`, `src/context/AuthContext.jsx`, `src/services/firestoreService.js`, `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json` — tutti eliminati. Componenti morti eliminati: `src/components/auth/`, `src/components/dashboard/Dashboard.jsx`, `src/components/portfolio/Portfolio.jsx`, `src/components/upload/CSVUpload.jsx`, `src/components/transactions/`, `AttentionPanel.jsx`, `RolesRollupCard.jsx`, `ui/card.jsx`, `ui/stat.jsx`, `ui/summary-card.jsx`, `src/styles/App.css`.
- **Account (opzionale, via env):** con `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` l'app richiede login email (solo invitati) e sincronizza i dati su Supabase; senza, resta locale. Vedi sezione "Account e cloud sync" e `docs/SUPABASE_SETUP.md`.
- **Il README è disallineato**: descrive un'app Firebase/auth che non è quella che gira.
- Sorgente di verità = **transazioni**; posizioni/performance/cashflow sono *derivate* dalle transazioni.
- **Assignment portfolio = per-ticker** (holdingKey), NON per-transazione. Le transazioni non hanno `portfolioId`. Da migrare in futuro.
- Prezzi: `src/services/priceService.js` → Yahoo Finance via proxy. In prod usa la serverless `api/price.js` (Vercel, cache `s-maxage=300`); fallback CoinGecko per crypto.
- Deploy: **Vercel** (`vercel.json` + `/api`).
- Alias import: `@` → `/src` (vite.config.js). Quindi `@/components/ui` → `src/components/ui`, `@/lib/utils` → `src/lib/utils`.

## 4 sistemi di target allocation (indipendenti, non cross-validati)
1. **Per-portfolio macro** (`targetAllocation` in `portfolioConfigService`) — equity/bond/gold %
2. **Per-portfolio peso patrimonio** (`targetWeightPct`) — quanto pesa un portafoglio sul totale
3. **Per-ticker dividendi** (`targetWeight` in `dividendGrowthService`) — peso target del singolo titolo
4. **Per-bucket/ruolo** (`buckets[].target` in `portfolioConfigService`) — target % del ruolo nel portafoglio

## Fase 0 completata (ott 2026)
- ✅ **Backup JSON completo**: `exportFullBackup()` / `restoreFullBackup()` in `localStorageService.js`. Esporta TUTTE le chiavi localStorage (transazioni, config, dividendi, cache, tema). UI in Settings.
- ✅ **Codice morto rimosso**: intero sottosistema Firebase, 12+ componenti/file orfani.
- ✅ **Storage adapter**: `src/services/storageAdapter.js` — interfaccia async `storage.get/set/remove/keys`. Oggi wrappa localStorage, domani Supabase. I servizi possono migrare incrementalmente.
- ✅ **Monte Carlo estratto**: `src/services/monteCarloService.js` — `runMonteCarlo()` con parametri IT (tasse 26%, inflazione, SWR) + `findFIREAge()`. Pronto per la pagina Simulazioni.

## Modalità (Guidata / Avanzata / Pro) — fondamenta fatte
- `src/config/modes.js`: definizione modalità + `isRouteAllowed(mode, path)`. `routes: null` = tutte le pagine.
- `src/context/ModeContext.jsx`: `useMode()` → `{ mode, setMode, canAccess }`. Chiave localStorage `inv-mode`, default `advanced`.
- `App.jsx`: `AppShell` filtra sidebar, bottom-nav e `<Routes>` per modalità (rotta vietata → redirect a `/`). In Guidata la bottom-nav usa Transazioni al posto di Ribilancia.
- Selettore in Impostazioni. Guidata oggi = Dashboard, Portfolio, Transazioni, Impostazioni (**provvisorio**, finché non esistono le pagine guidate). Pro = Avanzata (nessuna feature ancora).
- **Fetta 1 (motore) fatta:** `src/lib/glidePath.js` (tabella §3 a 5 bucket + rischio + oro, `withGold`), `src/lib/multiAssetMonteCarlo.js` (`simulateGoal`: euro reali, inflazione casuale correlata, glide path nel tempo via `weightsAt`, tasse sul gain, fan chart annuale), `goalService.evaluateGoal` ora usa questo motore (`allocationAt: glideSchedule({type, riskProfile, extraYears, goldPct})`, `indexContribution`, `indexTarget`, `taxRate`). 157 test. Modalità assegnata dall'admin: `supabase/migrations/002_user_profiles.sql` + `resolveMode()` in `modes.js` + profilo caricato in `AuthContext` (`profile`); clienti senza selettore; senza profilo → Avanzata. **Da fare: eseguire 002 in Supabase.** Prossima fetta: esercizio Obiettivi (wizard) + gate "prima schermata" per i non-admin.
- **Fetta 2 (esercizio Obiettivi) fatta:** wizard `src/pages/GoalWizard.jsx` (intro → tipi → un passo per obiettivo → profilo di rischio → modello/probabilità/fan chart/slider azionario ±10 → regole firmate → riepilogo), pagina `src/pages/Goals.jsx` (`/obiettivi`), rotta `/guida/inizia`. Logica pura e testata: `src/lib/goalModel.js` (tipi, validazione, `evaluatePlan`, rendita con SWR), `src/lib/rulesModel.js` (regole versionate `createRulesV1`), `src/services/goalStore.js` (storage + `useGoalData`; chiavi `inv_goals_v1`, `inv_goal_rules_v1`, `inv_student_progress_v1`, `inv_goal_wizard_draft_v1`, tutte in `SYNC_KEYS`). **Gate** `OnboardingGate` in `App.jsx`: cliente (non admin) con cloud + profilo + modalità Guidata e `!onboardingCompleted` vede SOLO il wizard (`standalone`); admin e app locale mai bloccati. Bozza salvata a ogni modifica (si può riprendere). Guidata ora = `/`, `/obiettivi`, `/guida`, `/portfolio`, `/transactions`, `/settings`. Semplificazione v1: la fase "transizione" (riserva ultimi 24 mesi) della rendita non è ancora simulata. Prossime fette: CSV → assegnazione ai goal (serve `portfolioId` per transazione), "Il mio portafoglio/progresso", revisione regole + cooling-off (§7), "Stato rispetto alle tue regole", "E se…?", pagina "Come calcoliamo".
- **Obiettivi (storico, logica v1):** `src/config/marketAssumptions.js` (ipotesi di mercato, glide path, soglie semaforo — unica fonte, da validare con l'autore) e `src/services/goalService.js` (`evaluateGoal`, `monthlyNeededForSuccess`, `recommendAction`, `glidePathAllocation`), 51 test. Importi in € reali dopo tasse; Monte Carlo con seme fisso (`createSeededRandom`) → risultati ripetibili. `status: 'reached'` = importo già disponibile, ma la probabilità resta quella reale di conservarlo.
- Spec in `GUIDED_MODE_SPEC.md` (**v2**: in testa le "Decisioni v2", che prevalgono sul testo originale; piano a fette). Modalità assegnata solo dall'admin (`tonypezzella.fa@gmail.com`) via tabella `user_profiles` (da creare); clienti senza selettore, partono in Guidata con l'esercizio Obiettivi. Inflazione reale IT: `api/inflation.js` + `src/services/inflationData.js` (Eurostat IPCA, formato da verificare in produzione). Residenza fiscale: `resolveTaxRate()` + `evaluateGoal({ taxRate })`. Da fare: pagine guidate, feature Pro, onboarding che propone la modalità.

## Account e cloud sync (Supabase)
- `src/services/supabaseClient.js` (`isCloudEnabled`), `src/context/AuthContext.jsx` (`useAuth`: phase, user, syncStatus, sendLink, verifyCode, signOut), `src/components/AuthGate.jsx` (login / sync / conflitto / errore), `src/pages/Login.jsx`. `App` = `AuthProvider > AuthGate > Privacy > Mode > AppShell`: i provider che leggono localStorage montano **dopo** la sync.
- `src/services/cloudSyncCore.js` (puro, testato): `SYNC_KEYS` (solo dati utente; NO cache, tema, privacy) + `planInitialSync`/`resolveConflict`. `src/services/cloudSync.js`: intercetta `localStorage.setItem/removeItem` sulle SYNC_KEYS e fa upsert con debounce 1,5s verso `public.user_data`. **Nuova chiave utente da sincronizzare → aggiungerla a `SYNC_KEYS`.**
- DB: `supabase/migrations/001_user_data.sql` (RLS per utente). Nessun accesso consulente ai dati dei clienti (scelta di prodotto).
- Principio: mai perdere dati in silenzio. Errori di rete → conservare e riprovare; dispositivo condiviso → mai mescolare utenti; conflitto → scelta esplicita.
- Dominio produzione: `https://app.tpbalancellc.com` (Vercel + CNAME su Hostinger). Pagine pubbliche `/privacy` e `/termini` (`src/pages/Legal.jsx`, dati in `src/config/legal.js`), servite **prima** dell'AuthGate (`PUBLIC_PAGES` in `App.jsx`). Testi = bozza da far rivedere a un legale.
- Login Google opzionale: pulsante solo con `VITE_GOOGLE_LOGIN=true`; utenti creati a mano in Supabase (registrazione libera OFF).
- Posizionamento: strumento educativo/di monitoraggio, linguaggio neutro (nessun "ribilancia/versa X"): mostrare lo stato rispetto alle regole del cliente, non raccomandazioni.

## UI: note da QA mobile (ott 2026)
- Griglie inline `repeat(3|4|6, 1fr)` diventano adattive sotto 768px via regola in `index.css` (attributo `style*=`). Per nuove griglie usare `repeat(auto-fit, minmax(…, 1fr))`.
- Ponte "legacy Tailwind pastello → token" solo in dark in fondo a `index.css`.
- Modali: z-index ≥ 60 per stare sopra la bottom-nav (z 50).
- Regola globale mobile `button { min-height: 44px }`: elementi piccoli (toggle) vanno esclusi con `minHeight` inline.

## Motore dati (services/ ~9k righe, il valore nascosto)
Risoluzione ISIN→ticker, rilevamento categoria/TER ETF, composizione/holdings ETF, dividend growth, TWRR (`twrrService`), metriche avanzate (Sharpe), import CSV multi-formato (`csvImportService`), cache prezzi, Monte Carlo, storage adapter.

## Obiettivi in corso (2026)
1. **3 modalità**: Guidata (studenti corso), Avanzata (tutte le pagine), Pro (premium/consulenti).
2. **Goal-based investing**: un portafoglio per ogni obiettivo, glide path automatico.
3. **5 pagine guidate**: Obiettivi (probabilità successo), Portafoglio, Regole firmate, Progresso, "Devo fare qualcosa?"
4. **Anti-panico**: cooling 7gg se cambi strategia durante calo >15%.
5. **Andare pubblico**: Supabase Auth + DB + Price Cron + dataService.
6. **Restyle grafico** → design system "Direzione C". Vedi `docs/DESIGN_SYSTEM.md`.
7. **Mobile friendly** → tabelle→card, breakpoint reali, PWA.
8. **Backtesto**: collegato via link/MCP, non reimplementato.

## Motore Ruoli (fatto)
Ogni portafoglio ha bucket-Ruolo liberi (nome + target %) in `portfolioConfigService`:
- `assignTickerToRoleName` assegna un titolo a un ruolo per nome (crea al volo).
- `calcBucketDrift` drift per bucket. `getPortfolioAlerts` aggrega gli scostamenti.
- `getPortfolioWeights` peso reale/target di ogni portafoglio sul patrimonio.
- `getRolesRollup` allocazione per Ruolo aggregata a livello patrimonio.
- Auto-classificazione rule-based in `roleClassificationService` (zero API).
- UI: `BucketManager` (dentro card in PortfolioManager) · Rebalancing: `RolesRebalancer`.

## Regole di ottimizzazione costi (importante per lo scaling)
- **Supabase**: letture per GB, non per documento. Salvare snapshot già calcolati.
- **Prezzi**: cache **condivisa lato server** in `/api/price` (una fetch serve tutti gli utenti). Batch dei simboli, dedup.
- **Dev/token tra sessioni**: aggiornare questo file + `docs/` invece di ri-esplorare.

## Convenzioni codice
- JS/JSX, no TS. Componenti funzionali + hooks.
- Nuove primitive UI in `src/components/ui/` (stile shadcn, in `.jsx`). Helper `cn()` in `src/lib/utils.js`.
- Le pagine usano CSS variables (`--card-bg`, `--border`, `--text-1/2/3`, `--bg`, `--accent`, `--font-mono`) definite in `src/index.css`. **Cambiare i token lì aggiorna tutta l'app.**
- Numeri finanziari: font mono tabellare (`var(--font-mono)`, `font-variant-numeric: tabular-nums`).
- Storage: nuovi servizi devono usare `storageAdapter.js` (`storage.get/set/remove/keys`).
- Branch di sviluppo: `claude/app-review-mobile-optimization-pjxtrk`.

## Comandi
- `npm run dev` (porta 3000) · `npm run build` · `npm run lint` · `npm test` (vitest)

## In sospeso
- Migrazione servizi esistenti a `storageAdapter` (incrementale)
- `portfolioId` per transazione (cambiamento modello dati)
