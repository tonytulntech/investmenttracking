# 📊 Investment Portfolio Tracker - Web App

Una web app interattiva completa per tracciare e analizzare il tuo portafoglio di investimenti, ispirata al tuo Google Sheet.

## 🚀 Caratteristiche Principali

### 📈 Dashboard Completa
- **Metriche in Tempo Reale**: Valore totale portfolio, ROI, P/L, variazione giornaliera
- **Top/Worst Performers**: Migliori e peggiori asset sia giornalieri che complessivi
- **Grafici Dinamici**:
  - Andamento patrimonio nel tempo
  - Asset allocation per classe
  - Performance per asset class
  - Distribuzione geografica

### 💼 Portfolio Management
- **Tabelle Interattive** con ordinamento per colonna
- **Filtri Avanzati**: per asset class, strategia, piattaforma, data
- **Ricerca Dinamica** in tempo reale
- **Aggiornamento Prezzi** con integrazione Yahoo Finance API

### 📊 Sezioni Disponibili

1. **Dashboard**: Overview completo con metriche chiave e grafici
2. **Portfolio**: Tutti gli asset con performance dettagliate
3. **Transazioni**: Storia completa di buy/sell/deposit con filtri
4. **Piattaforme**: Analisi per piattaforma (Fineco, Binance, etc.)
5. **Asset Individuali**: Dettaglio per singolo asset e piattaforma
6. **Strategia**: Allocazione strategica Core vs YOLO
7. **Rebalancing**: Raccomandazioni automatiche con target vs actual
8. **Performance**: Grafici e statistiche di performance avanzate

## 🛠️ Tecnologie Utilizzate

- **Vite 5**: Build tool moderno per sviluppo veloce con HMR
- **HTML5**: Struttura semantica moderna
- **CSS3**: Design professionale con gradiente, animazioni, responsive
- **JavaScript ES Modules**: Architettura modulare e manutenibile
- **Chart.js 4**: Grafici interattivi e professionali
- **Yahoo Finance API**: Prezzi in tempo reale con fallback automatico

## 📦 Installazione e Utilizzo

### ⚡ Setup con Vite + Node.js (RACCOMANDATO)

Questa è una web app moderna con **Vite** per hot-reload istantaneo e performance ottimali.

#### 1. Prerequisiti

- **Node.js** 18+ ([Scarica qui](https://nodejs.org/))
- **npm** (incluso con Node.js)

Verifica l'installazione:
```bash
node --version  # v18.0.0 o superiore
npm --version   # 9.0.0 o superiore
```

#### 2. Installazione Dipendenze

```bash
# Clona la repository (se non l'hai già fatto)
git clone <your-repo-url>
cd investmenttracking

# Installa le dipendenze
npm install
```

Questo installerà:
- `vite` - Build tool e dev server
- `chart.js` - Libreria per grafici
- `eslint`, `prettier` - Tools per qualità del codice (opzionali)

#### 3. Avvio in Sviluppo

```bash
# Avvia il development server con hot-reload
npm run dev
```

Output atteso:
```
VITE v5.0.11  ready in 234 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
➜  press h to show help
```

L'app si aprirà automaticamente su **http://localhost:3000** 🚀

**Hot Module Replacement (HMR)**: Ogni modifica a CSS/JS si riflette istantaneamente senza reload!

#### 4. Build per Produzione

```bash
# Crea build ottimizzato nella cartella dist/
npm run build
```

Questo genera:
- File minificati e ottimizzati
- Code splitting automatico
- Source maps per debugging
- Output nella cartella `dist/`

Anteprima del build:
```bash
npm run preview
# Apri http://localhost:4173
```

### 🚀 Deploy

#### Opzione 1: Netlify (Più Semplice)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

1. Vai su [Netlify](https://netlify.com) e collega il tuo repo GitHub
2. Imposta:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. Click "Deploy" - Deploy automatico ad ogni push! ✨

#### Opzione 2: Vercel

1. Installa Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Segui le istruzioni
4. Deploy automatico configurato! 🎉

#### Opzione 3: GitHub Pages

```bash
# 1. Build del progetto
npm run build

# 2. Deploy della cartella dist/
npm install -g gh-pages
gh-pages -d dist
```

Il sito sarà disponibile su: `https://<username>.github.io/<repo>/`

## 🔧 Struttura del Progetto

```
investmenttracking/
├── index.html          # HTML principale (root per Vite)
├── package.json        # Dipendenze e scripts
├── vite.config.js      # Configurazione Vite
├── .gitignore          # File ignorati da Git
├── README.md           # Questa documentazione
├── src/                # Codice sorgente
│   ├── main.js         # Entry point dell'app
│   ├── app.js          # Logica principale con import/export
│   └── styles/
│       └── main.css    # Stili globali
└── dist/               # Build di produzione (generato)
```

## 🎨 Scripts Disponibili

```bash
# Sviluppo con hot-reload
npm run dev

# Build per produzione
npm run build

# Anteprima build di produzione
npm run preview

# Lint del codice (opzionale)
npm run lint

# Format del codice (opzionale)
npm run format
```

## 🔧 Configurazione

### Dati Fittizi vs Dati Reali

La web app include **dati fittizi** basati sulla struttura dei tuoi CSV per dimostrare le funzionalità.

Per usare **dati reali**:

1. Apri `src/app.js`
2. Modifica le costanti `SAMPLE_TRANSACTIONS`, `SAMPLE_PORTFOLIO`, etc. con i tuoi dati reali
3. Oppure implementa il caricamento dinamico dai CSV:

```javascript
// Esempio: carica CSV
async function loadCSV(filename) {
    const response = await fetch(filename);
    const text = await response.text();
    return parseCSV(text);
}
```

### Integrazione Yahoo Finance API

La web app tenta di usare Yahoo Finance per prezzi in tempo reale:

- **Successo**: Mostra prezzi aggiornati dal mercato
- **Fallback**: Usa logica di calcolo simulata come nel tuo Google Apps Script

Il fallback simula variazioni del ±2% per dimostrare la funzionalità anche offline.

**Nota CORS**: Per evitare errori CORS in produzione, considera:
- Usa un CORS proxy (già implementato: `allorigins.win`)
- Oppure crea un backend server-side che faccia le chiamate API

## 📱 Funzionalità Dettagliate

### Filtri Interattivi
- **Asset Class**: ETF, Crypto, Cash
- **Strategia**: Core, Play
- **Piattaforma**: Fineco, Binance, Crypto, Nexo, etc.
- **Data**: Range personalizzato per transazioni
- **Ricerca Testuale**: Cerca per ticker, nome, paese

### Calcoli Automatici
- **ROI %**: (Valore Mercato - Costo) / Costo × 100
- **P/L Non Realizzato**: Valore Mercato - Costo Totale
- **P/L Realizzato**: Da vendite completate
- **Variazione Giornaliera**: % e valore assoluto
- **CAGR**: Compound Annual Growth Rate dal primo investimento

### Rebalancing Intelligente
- Confronta **allocazione attuale** vs **target** dalla strategia
- Identifica asset **Underweight**, **Overweight**, **Balanced**
- Calcola **quantità esatta** da comprare/vendere
- Raccomandazioni automatiche di **azione** (Acquista/Vendi/Mantieni)

### Grafici Disponibili
1. **Andamento Patrimonio**: Line chart storico
2. **Asset Allocation**: Doughnut chart per classe
3. **Performance Asset Class**: Bar chart con P/L
4. **Distribuzione Geografica**: Pie chart per paese
5. **Platform Breakdown**: Bar chart orizzontale
6. **Target vs Actual**: Confronto strategia
7. **ROI per Asset**: Bar chart performance
8. **Timeline Transazioni**: Line chart mensile
9. **ROI nel Tempo**: Storico crescita

## 🎨 Design e UX

- **Responsive**: Funziona perfettamente su desktop, tablet, mobile
- **Gradiente Moderno**: Header con gradiente viola/blu
- **Cards**: Sezioni ben organizzate con ombre
- **Animazioni**: Transizioni fluide tra tab e hover effects
- **Colori Semantici**:
  - 🟢 Verde: Valori positivi, profitti
  - 🔴 Rosso: Valori negativi, perdite
  - 🔵 Blu: Informazioni, badge
  - 🟠 Arancione: Warning, underweight

## 🐛 Troubleshooting

### `npm install` fallisce

```bash
# Pulisci cache npm
npm cache clean --force

# Rimuovi node_modules e reinstalla
rm -rf node_modules package-lock.json
npm install
```

### I prezzi non si aggiornano
- Controlla la console del browser per errori API
- Verifica la connessione internet
- Il fallback simulerà variazioni se l'API non risponde

### I grafici non si visualizzano
- Controlla che Chart.js sia stato installato: `npm list chart.js`
- Verifica la console per errori import
- Prova a rifare il build: `npm run build`

### Hot reload non funziona
- Riavvia il dev server: `Ctrl+C` poi `npm run dev`
- Controlla che non ci siano errori sintax nel codice
- Verifica `vite.config.js` sia corretto

### Build fallisce
```bash
# Reinstalla dipendenze
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

## 🚀 Miglioramenti Futuri

Possibili estensioni:

- [ ] Import CSV diretto dall'interfaccia (drag & drop)
- [ ] Export dati in Excel/PDF
- [ ] Notifiche push per variazioni importanti
- [ ] Backend con database per storico completo
- [ ] Autenticazione utente multi-device
- [ ] Integrazione con più API (Binance, CoinGecko, etc.)
- [ ] Machine Learning per previsioni
- [ ] Dark mode con toggle
- [ ] Multi-valuta automatica con conversioni live
- [ ] PWA (Progressive Web App) per uso offline
- [ ] WebSocket per aggiornamenti real-time

## 📝 Licenza

MIT License - Sentiti libero di usare, modificare e distribuire.

## 👨‍💻 Sviluppato con Claude

Questa web app è stata sviluppata con l'assistenza di Claude AI, replicando completamente la struttura e logica del tuo Google Sheet in una moderna applicazione web interattiva con **Vite + ES Modules**.

---

## 🆘 Supporto

Hai problemi?

1. Controlla la sezione [Troubleshooting](#-troubleshooting)
2. Apri una issue su GitHub
3. Controlla che Node.js e npm siano aggiornati

**Buon tracking dei tuoi investimenti! 🚀📈**
