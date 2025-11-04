# 📊 Investment Portfolio Tracker - Full-Stack Web App

Una web app full-stack completa per tracciare e analizzare il tuo portafoglio di investimenti con autenticazione, database cloud e prezzi in tempo reale.

## 🚀 Caratteristiche Principali

### 🔐 Autenticazione Utente
- **Firebase Authentication**: Login e registrazione sicuri
- **Gestione Sessioni**: Dati personali isolati per ogni utente
- **Password Reset**: Recupero password integrato

### 📈 Dashboard Dinamica
- **Metriche in Tempo Reale**: Valore totale portfolio, ROI, P/L, variazione giornaliera
- **Grafici Interattivi con Recharts**:
  - Asset allocation per classe
  - Top 10 performance (ROI)
  - Distribuzione geografica
- **Top Holdings**: Visualizzazione immediata dei tuoi asset principali

### 💼 Portfolio Management
- **Tabelle Interattive** con ordinamento per colonna
- **Filtri Avanzati**: per asset class, piattaforma, ricerca testuale
- **Aggiornamento Prezzi**: Integrazione Yahoo Finance (stock/ETF) + CoinGecko (crypto)
- **Calcoli Automatici**: ROI, P/L, variazione giornaliera

### 📝 Gestione Transazioni
- **Storico Completo**: Tutte le transazioni con filtri
- **Inserimento Manuale**: Form completo per aggiungere transazioni
- **Import CSV**: Carica transazioni in blocco da file CSV
- **Eliminazione**: Rimuovi transazioni errate

### ☁️ Cloud Database
- **Firebase Firestore**: Database NoSQL real-time
- **Persistenza Dati**: I tuoi dati sono sempre sincronizzati
- **Sicurezza**: Regole Firestore per proteggere i dati per utente

## 🛠️ Stack Tecnologico

### Frontend
- **React 18**: Libreria UI moderna con hooks
- **Vite 5**: Build tool velocissimo con HMR
- **React Router**: Navigazione client-side
- **Recharts**: Grafici interattivi e responsive
- **Lucide React**: Icone moderne
- **PapaParse**: Parser CSV per import dati
- **Axios**: Client HTTP per API calls
- **date-fns**: Manipolazione date

### Backend & Database
- **Firebase Authentication**: Gestione utenti
- **Firebase Firestore**: Database NoSQL cloud
- **Firebase Hosting**: Deploy automatico

### API Esterne
- **Yahoo Finance API**: Prezzi real-time stock/ETF
- **CoinGecko API**: Prezzi crypto con 24h change

## 📦 Setup del Progetto

### Prerequisiti

1. **Node.js 18+** ([Download](https://nodejs.org/))
2. **Account Firebase** ([Console Firebase](https://console.firebase.google.com/))

Verifica installazione Node.js:
```bash
node --version  # v18.0.0 o superiore
npm --version   # 9.0.0 o superiore
```

### 1️⃣ Clona e Installa

```bash
# Clona la repository
git clone <your-repo-url>
cd investmenttracking

# Installa le dipendenze
npm install
```

### 2️⃣ Configura Firebase

#### A. Crea Progetto Firebase

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Click su "Aggiungi progetto" o "Create project"
3. Dai un nome al progetto (es. "investment-tracker")
4. Abilita Google Analytics (opzionale)
5. Click "Crea progetto"

#### B. Abilita Authentication

1. Nel menu laterale, vai su **Authentication**
2. Click "Get started"
3. Abilita **Email/Password**:
   - Click su "Email/Password"
   - Toggle su "Enable"
   - Save

#### C. Crea Database Firestore

1. Nel menu laterale, vai su **Firestore Database**
2. Click "Create database"
3. Scegli **Production mode** (useremo le nostre regole)
4. Scegli la location più vicina (es. `europe-west1`)
5. Click "Enable"

#### D. Ottieni le Credenziali Firebase

1. Nel menu laterale, vai su **Project Settings** (icona ingranaggio)
2. Scroll fino a "Your apps"
3. Click sull'icona **Web** (`</>`) per aggiungere una web app
4. Dai un nome (es. "Investment Tracker Web")
5. **NON** spuntare "Also set up Firebase Hosting" (lo faremo dopo)
6. Click "Register app"
7. **Copia le credenziali** che appaiono (firebaseConfig)

#### E. Configura le Credenziali nel Progetto

Apri `src/config/firebase.js` e sostituisci i valori placeholder con le tue credenziali:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",                          // Sostituisci
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",   // Sostituisci
  projectId: "YOUR_PROJECT_ID",                    // Sostituisci
  storageBucket: "YOUR_PROJECT_ID.appspot.com",    // Sostituisci
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",   // Sostituisci
  appId: "YOUR_APP_ID"                             // Sostituisci
};
```

#### F. Configura Firestore Security Rules

Le regole di sicurezza sono già definite in `firestore.rules`. Caricale su Firebase:

```bash
# Installa Firebase CLI se non l'hai già fatto
npm install -g firebase-tools

# Login a Firebase
firebase login

# Inizializza Firebase nel progetto (solo la prima volta)
firebase init

# Seleziona:
# - Firestore
# - Hosting
# Usa i file esistenti (firestore.rules, firestore.indexes.json, firebase.json)

# Deploy delle regole Firestore
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

**Nota**: Le regole garantiscono che ogni utente possa accedere solo ai propri dati.

### 3️⃣ Avvia in Locale

```bash
# Avvia il dev server
npm run dev
```

L'app sarà disponibile su **http://localhost:3000** 🚀

**Features del dev mode:**
- Hot Module Replacement (HMR) - modifiche istantanee
- Source maps per debugging
- Console logs per troubleshooting

### 4️⃣ Test dell'Applicazione

1. Apri http://localhost:3000
2. **Registrati**: Crea un nuovo account
3. **Login**: Accedi con le credenziali
4. **Carica Dati CSV** o **Aggiungi Transazioni Manualmente**
5. **Visualizza Dashboard**: Vedi metriche e grafici
6. **Esplora Portfolio**: Filtra e ordina i tuoi asset

## 📤 Deploy in Produzione

### Opzione 1: Firebase Hosting (Raccomandato)

Firebase Hosting è perfetto per questa app React + Firebase:

```bash
# 1. Build del progetto
npm run build

# 2. Login a Firebase (se non l'hai già fatto)
firebase login

# 3. Inizializza Firebase Hosting (solo prima volta)
firebase init hosting
# - Public directory: dist
# - Single-page app: Yes
# - Automatic builds: No

# 4. Deploy!
firebase deploy --only hosting
```

Il tuo sito sarà live su: `https://YOUR_PROJECT_ID.web.app` ✨

**Deploy automatico con GitHub Actions (opzionale):**

```yaml
# .github/workflows/firebase-deploy.yml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: YOUR_PROJECT_ID
```

### Opzione 2: Netlify

```bash
# 1. Build
npm run build

# 2. Deploy con Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Opzione 3: Vercel

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel --prod
```

## 🗂️ Struttura del Progetto

```
investmenttracking/
├── public/                         # Assets statici
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── Login.jsx           # Componente login
│   │   │   └── Signup.jsx          # Componente registrazione
│   │   ├── dashboard/
│   │   │   └── Dashboard.jsx       # Dashboard con metriche e grafici
│   │   ├── portfolio/
│   │   │   └── Portfolio.jsx       # Tabella portfolio con filtri
│   │   ├── transactions/
│   │   │   ├── TransactionsList.jsx # Storico transazioni
│   │   │   └── ManualEntry.jsx     # Form inserimento manuale
│   │   └── upload/
│   │       └── CSVUpload.jsx       # Upload CSV con PapaParse
│   ├── context/
│   │   └── AuthContext.jsx         # Context per autenticazione
│   ├── services/
│   │   ├── firestoreService.js     # CRUD operations Firestore
│   │   ├── yahooFinance.js         # API Yahoo Finance
│   │   └── coinGecko.js            # API CoinGecko crypto
│   ├── config/
│   │   └── firebase.js             # Configurazione Firebase
│   ├── styles/
│   │   └── App.css                 # Stili globali
│   ├── App.jsx                     # Componente principale con routing
│   └── main.jsx                    # Entry point React
├── firebase.json                   # Config Firebase Hosting
├── firestore.rules                 # Regole sicurezza Firestore
├── firestore.indexes.json          # Indici Firestore
├── .firebaserc                     # Config progetto Firebase
├── vite.config.js                  # Configurazione Vite
├── package.json                    # Dipendenze e scripts
└── README.md                       # Questa documentazione
```

## 🎨 Scripts Disponibili

```bash
# Sviluppo con hot-reload
npm run dev

# Build per produzione
npm run build

# Anteprima build locale
npm run preview

# Lint codice
npm run lint

# Format codice
npm run format

# Deploy Firebase (build + hosting)
npm run firebase:deploy
```

## 📊 Formato CSV per Import

Per importare transazioni da CSV, usa questo formato:

```csv
Date,Type,Ticker,Name,Asset Class,Platform,Quantity,Price,Notes
2025-01-15,buy,VWCE.DE,Vanguard FTSE All-World,ETF,Fineco,10.5,98.50,First purchase
2025-01-20,buy,BTC,Bitcoin,Crypto,Binance,0.005,40000.00,Long term
2025-02-01,sell,VWCE.DE,Vanguard FTSE All-World,ETF,Fineco,2.0,100.00,Partial sale
```

**Colonne obbligatorie:**
- `Date` (YYYY-MM-DD)
- `Type` (buy, sell, deposit, withdrawal)
- `Ticker` (es. VWCE.DE, BTC)
- `Asset Class` (ETF, Stock, Crypto, Bond, Cash)
- `Platform` (Fineco, Binance, BBVA, etc.)
- `Quantity` (numero decimale)
- `Price` (prezzo in EUR)

Scarica il template dall'interfaccia "Carica Dati".

## 🔧 Configurazione Avanzata

### Modifica Intervallo Aggiornamento Prezzi

Di default i prezzi vengono aggiornati manualmente. Per un refresh automatico:

```javascript
// In Dashboard.jsx, aggiungi useEffect con interval
useEffect(() => {
  const interval = setInterval(() => {
    handleRefresh();
  }, 60000); // Aggiorna ogni 60 secondi

  return () => clearInterval(interval);
}, []);
```

### Aggiungi Nuove Piattaforme

Modifica `ManualEntry.jsx`:

```javascript
<option value="NewPlatform">New Platform</option>
```

### Personalizza Asset Classes

Modifica `ManualEntry.jsx`:

```javascript
<option value="NewAssetClass">New Asset Class</option>
```

## 🐛 Troubleshooting

### Errore: "Firebase app not initialized"

**Causa**: Credenziali Firebase non configurate

**Soluzione**:
1. Controlla `src/config/firebase.js`
2. Verifica di aver sostituito tutti i placeholder con le tue credenziali

### Errore: "Missing or insufficient permissions"

**Causa**: Regole Firestore non caricate o non corrette

**Soluzione**:
```bash
firebase deploy --only firestore:rules
```

### Prezzi non si aggiornano

**Causa 1**: CORS issues con Yahoo Finance

**Soluzione**: L'app usa già un CORS proxy (`allorigins.win`). Se non funziona, considera un proxy alternativo.

**Causa 2**: API rate limiting

**Soluzione**: Riduci la frequenza di refresh o implementa caching locale.

### Import CSV fallisce

**Causa**: Formato CSV non corretto

**Soluzione**:
1. Verifica che il file sia effettivamente un CSV
2. Controlla che le colonne obbligatorie siano presenti
3. Usa il template fornito dall'app

### Build fallisce

```bash
# Pulisci cache e reinstalla
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

## 📝 Roadmap & Miglioramenti Futuri

- [ ] Dark mode con toggle
- [ ] Export portfolio in PDF/Excel
- [ ] Notifiche push per alert prezzi
- [ ] Grafici avanzati (candlestick, line chart storico)
- [ ] Multi-valuta con conversione automatica
- [ ] Integrazione Binance API diretta
- [ ] Mobile app (React Native)
- [ ] Machine Learning per previsioni
- [ ] Social features (condivisione portfolio anonimo)
- [ ] Backup automatico su Google Drive

## 🔐 Sicurezza

- **Authentication**: Firebase Auth con email/password
- **Authorization**: Firestore rules per isolamento dati utente
- **HTTPS**: Forzato in produzione
- **API Keys**: Lato client (safe per Firebase config pubblica)
- **Input Validation**: Validazione form e sanitizzazione dati

**Nota**: Le API keys di Firebase sono sicure lato client perché protette dalle security rules di Firestore.

## 📄 Licenza

MIT License - Sentiti libero di usare, modificare e distribuire.

## 👨‍💻 Sviluppato con Claude

Questa web app è stata sviluppata interamente con l'assistenza di **Claude AI (Anthropic)**, trasformando una semplice web app statica in un'applicazione full-stack moderna con:
- React + Vite per il frontend
- Firebase per backend e autenticazione
- Integrazione API real-time per prezzi
- Design responsive e professionale

## 🆘 Supporto

### Problemi Comuni

1. **Non riesco a registrarmi**
   - Verifica che Firebase Authentication sia abilitato
   - Controlla la console browser per errori

2. **I dati non si salvano**
   - Verifica che Firestore sia inizializzato
   - Controlla le security rules

3. **L'app non si builda**
   - Verifica versione Node.js (18+)
   - Prova `rm -rf node_modules && npm install`

### Contatti

- **Issues GitHub**: Apri una issue per bug o feature requests
- **Email**: [tua-email@example.com]

---

**Buon tracking dei tuoi investimenti! 🚀📈💰**
