# CLAUDE.md — Memoria di progetto

> Leggi questo file all'inizio di ogni sessione **invece di ri-scansionare tutto il codebase**.
> Serve a risparmiare token e a non ri-derivare fatti già noti. Tienilo aggiornato quando cambia l'architettura.

## Cos'è
Investment Tracker → **Investitore 1.0**: web app di analisi di portafoglio investimenti. React 18 + Vite 5 + React Router 6 + Recharts + Tailwind. **JavaScript (.jsx), non TypeScript.** In italiano.

## ⚠️ Fatti architetturali critici (verificati nel codice)
- **L'app reale è in `src/pages/`** (attualmente 10 pagine attive: Dashboard, Portfolio, Performance, Transazioni, Analisi, Portafogli, Patrimonio, Dividendi, Ribilanciamento, Impostazioni). Le pagine PAC/Strategia/Backtest/Mercati/Calcolatori/Crypto restano nel repo ma non registrate in App.jsx — riabilitabili al volo. È **local-first**: tutti i dati vivono in `localStorage` del browser via `src/services/localStorageService.js`. **Nessuna autenticazione, nessun cloud, single-user.**
- **Codice morto Firebase RIMOSSO** (Fase 0, ott 2026): `src/config/firebase.js`, `src/context/AuthContext.jsx`, `src/services/firestoreService.js`, `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json` — tutti eliminati. Componenti morti eliminati: `src/components/auth/`, `src/components/dashboard/Dashboard.jsx`, `src/components/portfolio/Portfolio.jsx`, `src/components/upload/CSVUpload.jsx`, `src/components/transactions/`, `AttentionPanel.jsx`, `RolesRollupCard.jsx`, `ui/card.jsx`, `ui/stat.jsx`, `ui/summary-card.jsx`, `src/styles/App.css`.
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
- `npm run dev` (porta 3000) · `npm run build` · `npm run lint`

## In sospeso
- `marketAssumptions.js` — rendimento/volatilità/correlazioni per bucket (serve Backtesto)
- `GUIDED_MODE_SPEC.md` — specifica completa modalità guidata
- Migrazione servizi esistenti a `storageAdapter` (incrementale)
- `portfolioId` per transazione (cambiamento modello dati)
