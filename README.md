# Investitore 1.0

Web app di analisi portafoglio investimenti. **Local-first**: tutti i dati in `localStorage`, nessuna autenticazione, nessun cloud (per ora). In italiano.

## Stack

- **React 18** + **Vite 5** + **React Router 6**
- **Recharts** per grafici
- **Tailwind CSS 3** + design system custom ("Direzione C")
- **JavaScript** (.jsx, non TypeScript)
- Deploy: **Vercel** (`vercel.json` + API serverless)

## Avvio rapido

```bash
npm install
npm run dev      # http://localhost:3000
```

### Comandi

| Comando           | Descrizione                    |
| ----------------- | ------------------------------ |
| `npm run dev`     | Dev server (porta 3000)        |
| `npm run build`   | Build di produzione            |
| `npm run preview` | Anteprima build                |
| `npm run lint`    | ESLint su `src/`               |

## Architettura

### Pagine attive (`src/pages/`)

| Pagina              | Descrizione                                  |
| ------------------- | -------------------------------------------- |
| Dashboard           | Riepilogo portafoglio, P&L, allocation       |
| Portfolio            | Posizioni dettagliate                        |
| PortfolioPerformance | TWRR, benchmark, grafici performance         |
| Transactions         | Lista transazioni + form inserimento         |
| PortfolioAnalysis    | Analisi avanzata (Sharpe, drawdown, rolling)  |
| PortfolioManager     | Gestione multi-portafoglio + ruoli/bucket    |
| Patrimonio           | Visione patrimonio complessivo               |
| Dividendi            | Tracking dividendi + dividend growth         |
| Rebalancing          | Ribilanciamento target vs attuale            |
| Settings             | Impostazioni, backup/restore, cache          |

Pagine dormant (nel repo ma non registrate in `App.jsx`): Backtest, Mercati, Strategia, Calcolatori, Crypto, PAC.

### Services (`src/services/`, ~9k righe)

Il motore dati dell'app:

- **localStorageService** — CRUD transazioni, backup JSON completo, migrazione ticker
- **priceService** — prezzi via Yahoo Finance (proxy serverless) + CoinGecko fallback
- **twrrService** — calcolo TWRR (Time-Weighted Rate of Return)
- **portfolioConfigService** — configurazione multi-portafoglio, ruoli/bucket, target allocation
- **dividendGrowthService** — tracking crescita dividendi, yield, target weight
- **categoryDetectionService** — rilevamento automatico categoria ETF/asset
- **csvImportService** — import CSV multi-formato (Directa, Degiro, IBKR, etc.)
- **monteCarloService** — simulazione stocastica con parametri IT (tasse 26%, inflazione, FIRE)
- **storageAdapter** — interfaccia async per persistenza (oggi localStorage, domani Supabase)
- **roleClassificationService** — classificazione automatica rule-based dei ruoli

### API serverless (`api/`)

- `api/price.js` — proxy Yahoo Finance con cache (`s-maxage=300`)

### Alias import

`@` → `/src` (configurato in `vite.config.js`).

```jsx
import { cn } from '@/lib/utils';
import { storage } from '@/services/storageAdapter';
```

## Dati

Sorgente di verità = **transazioni**. Posizioni, performance e cashflow sono derivati.

L'assegnazione portafoglio è **per-ticker** (`holdingKey = ticker::broker`), non per-transazione.

### Backup

- **JSON completo**: Settings → "Backup Completo (JSON)" — esporta tutte le chiavi localStorage
- **CSV**: Settings → "Esporta CSV" — solo transazioni
- **Ripristino**: Settings → "Ripristina Backup" — importa file JSON

## Design system

Theme token-based in `src/index.css`. Variabili principali:

```
--bg, --card-bg, --surface-1
--text-1, --text-2, --text-3
--border, --border-strong
--accent (#7C82FF)
--font-mono (JetBrains Mono)
```

Dark mode di default. Toggle in sidebar.

## Licenza

MIT
