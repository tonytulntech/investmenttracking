# CLAUDE.md — Memoria di progetto

> Leggi questo file all'inizio di ogni sessione **invece di ri-scansionare tutto il codebase**.
> Serve a risparmiare token e a non ri-derivare fatti già noti. Tienilo aggiornato quando cambia l'architettura.

## Cos'è
Investment Tracker: web app di analisi di portafoglio investimenti. React 18 + Vite 5 + React Router 6 + Recharts + Tailwind. **JavaScript (.jsx), non TypeScript.** In italiano.

## ⚠️ Fatti architetturali critici (verificati nel codice)
- **L'app reale è in `src/pages/`** (16 pagine, ~23k righe). È **local-first**: tutti i dati vivono in `localStorage` del browser via `src/services/localStorageService.js`. **Nessuna autenticazione, nessun cloud, single-user.**
- **`src/components/` (Login, Signup, vecchia Dashboard, CSVUpload) è CODICE MORTO.** Importa `firebase`, ma `firebase` **non è in `package.json`** → non compilerebbe. Reliquia del README. `App.jsx` non lo importa. Anche `src/styles/App.css` è morto (non importato).
- **Il README è disallineato**: descrive un'app Firebase/auth che non è quella che gira.
- Sorgente di verità = **transazioni**; posizioni/performance/cashflow sono *derivate* dalle transazioni.
- Prezzi: `src/services/priceService.js` → Yahoo Finance via proxy. In prod usa la serverless `api/price.js` (Vercel, cache `s-maxage=300`); fallback CoinGecko per crypto.
- Deploy: **Vercel** (`vercel.json` + `/api`). `firebase.json` presente ma non usato dall'app.
- Alias import: `@` → `/src` (vite.config.js). Quindi `@/components/ui` → `src/components/ui`, `@/lib/utils` → `src/lib/utils`.

## Motore dati (services/ ~9k righe, il valore nascosto)
Risoluzione ISIN→ticker, rilevamento categoria/TER ETF, composizione/holdings ETF, dividend growth, TWRR (`twrrService`), metriche avanzate (Sharpe), import CSV multi-formato (`csvImportService`, `binanceCsvService`), cache prezzi.

## Obiettivi in corso (2026)
1. **Restyle grafico** → design system "Direzione C" (editoriale scuro, no-glass, no-aurora). Vedi `docs/DESIGN_SYSTEM.md`. Approccio: primitive stile shadcn **in JS**, un widget alla volta.
2. **Andare pubblico / multi-utente** → prima astrarre la persistenza in un `dataService`, poi auth + DB per-utente.
3. **Mobile friendly** → tabelle→card, breakpoint reali, PWA.
4. **Ottimizzazione costi a scala** (vedi sotto).

## Motore Ruoli (fatto)
Ogni portafoglio ha bucket-Ruolo liberi (nome + target %) in `portfolioConfigService`:
- `assignTickerToRoleName` assegna un titolo a un ruolo per nome (crea al volo).
- `calcBucketDrift` drift per bucket. `getPortfolioAlerts` aggrega gli scostamenti.
- `getPortfolioWeights` peso reale/target di ogni portafoglio sul patrimonio.
- `getRolesRollup` allocazione per Ruolo aggregata a livello patrimonio.
- Auto-classificazione rule-based in `roleClassificationService` (zero API):
  usa STOCK_DB (REIT/BDC/Kings/Growth-Div), classifyHolding per ETF, crypto BTC/ETH.
- UI: `BucketManager` (dentro card in PortfolioManager) · Dashboard: `AttentionPanel`
  + `RolesRollupCard` · Rebalancing: `RolesRebalancer` (Swap / Nuovo versamento).

## Regole di ottimizzazione costi (importante per lo scaling)
- **Firestore/cloud**: le *letture* sono la voce cara. Salvare snapshot già calcolati (non ricalcolare da tutte le transazioni a ogni load). Scrivere solo i *delta*, con debounce. Local-first resta la cache primaria.
- **Prezzi**: cache **condivisa lato server** in `/api/price` (una fetch serve tutti gli utenti). Non far martellare Yahoo a ogni client. Batch dei simboli, dedup.
- **Dev/token tra sessioni**: aggiornare questo file + `docs/` invece di ri-esplorare. Tenere un progress log conciso.

## Convenzioni codice
- JS/JSX, no TS. Componenti funzionali + hooks.
- Nuove primitive UI in `src/components/ui/` (stile shadcn, in `.jsx`). Helper `cn()` in `src/lib/utils.js`.
- Le pagine usano CSS variables (`--card-bg`, `--border`, `--text-1/2/3`, `--bg`, `--accent`, `--font-mono`) definite in `src/index.css`. **Cambiare i token lì aggiorna tutta l'app.**
- Numeri finanziari: font mono tabellare (`var(--font-mono)`, `font-variant-numeric: tabular-nums`).
- Branch di sviluppo: `claude/app-review-mobile-optimization-pjxtrk`.

## Comandi
- `npm run dev` (porta 3000) · `npm run build` · `npm run lint`
