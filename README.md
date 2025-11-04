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

- **HTML5**: Struttura semantica moderna
- **CSS3**: Design professionale con gradiente, animazioni, responsive
- **JavaScript (Vanilla)**: Logica completa senza dipendenze pesanti
- **Chart.js**: Grafici interattivi e professionali
- **Yahoo Finance API**: Prezzi in tempo reale con fallback automatico

## 📦 Installazione e Utilizzo

### Metodo 1: Apertura Diretta (Consigliato per Test Locali)

1. Clona o scarica la repository
2. Apri il file `index.html` nel tuo browser

```bash
# Da terminale
open index.html  # Mac
start index.html  # Windows
xdg-open index.html  # Linux
```

### Metodo 2: Server Locale (Consigliato per API)

Per utilizzare l'integrazione con Yahoo Finance API senza problemi CORS:

```bash
# Con Python 3
python -m http.server 8000

# Con Node.js (installare http-server globalmente)
npx http-server -p 8000

# Poi apri nel browser
http://localhost:8000
```

### Metodo 3: Deploy su GitHub Pages

1. Vai su Settings > Pages nella tua repository
2. Seleziona il branch `claude/investment-tracker-webapp-011CUmwaoGfNQxsQ2EpEPwC4`
3. Salva e attendi il deploy
4. La web app sarà disponibile all'URL fornito da GitHub Pages

## 🔧 Configurazione

### Dati Fittizi vs Dati Reali

La web app include **dati fittizi** basati sulla struttura dei tuoi CSV per dimostrare le funzionalità.

Per usare **dati reali**:

1. Apri `app.js`
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

## 🔐 Privacy e Sicurezza

- **100% Client-Side**: Tutti i dati rimangono nel tuo browser
- **Nessun Server**: Nessun invio dati a server esterni (tranne API Yahoo Finance per prezzi)
- **Offline-Ready**: La maggior parte delle funzionalità funziona offline
- **Open Source**: Puoi ispezionare tutto il codice

## 📊 Struttura Dati

La web app replica la struttura dei tuoi CSV:

- **Transaction.csv**: Storico transazioni (buy/sell/deposit)
- **Portfolio.csv**: Asset correnti con performance
- **Platforms.csv**: Breakdown per piattaforma
- **Strategy.csv**: Target allocazione strategica
- **Rebalancing.csv**: Raccomandazioni automatiche

## 🐛 Troubleshooting

### I prezzi non si aggiornano
- Controlla la console del browser per errori API
- Verifica la connessione internet
- Usa un CORS proxy o server locale

### I grafici non si visualizzano
- Controlla che Chart.js sia caricato correttamente
- Apri la console del browser per errori JavaScript
- Verifica che i dati siano presenti in `state.portfolio`

### Le tabelle sono vuote
- Verifica che `app.js` sia caricato
- Controlla i dati in `SAMPLE_TRANSACTIONS` e `SAMPLE_PORTFOLIO`
- Apri la console per vedere eventuali errori

## 🚀 Miglioramenti Futuri

Possibili estensioni:

- [ ] Import CSV diretto dall'interfaccia
- [ ] Export dati in Excel/PDF
- [ ] Notifiche push per variazioni importanti
- [ ] Backend con database per storico completo
- [ ] Autenticazione utente multi-device
- [ ] Integrazione con più API (Binance, CoinGecko, etc.)
- [ ] Machine Learning per previsioni
- [ ] Dark mode
- [ ] Multi-valuta automatica

## 📝 Licenza

MIT License - Sentiti libero di usare, modificare e distribuire.

## 👨‍💻 Sviluppato con Claude

Questa web app è stata sviluppata con l'assistenza di Claude AI, replicando completamente la struttura e logica del tuo Google Sheet in una moderna applicazione web interattiva.

---

**Buon tracking dei tuoi investimenti! 🚀📈**
