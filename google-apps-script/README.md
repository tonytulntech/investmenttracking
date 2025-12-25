# Google Apps Script - Setup Instructions

Questo script Google Apps Script recupera prezzi storici, prezzi attuali e **TER (Total Expense Ratio)** per i tuoi ETF.

## 📋 Setup

### 1. Crea un nuovo Google Spreadsheet
1. Vai su [Google Sheets](https://sheets.google.com)
2. Crea un nuovo foglio
3. Rinominalo "Investment Tracking - API"

### 2. Crea due fogli (sheet)
Crea due fogli nel tuo spreadsheet:
- **HistoricalData** (per i dati storici)
- **Prices** (per i prezzi attuali)

### 3. Apri l'Editor Script
1. Nel foglio, vai su **Estensioni > Apps Script**
2. Elimina tutto il codice di default (`function myFunction() {...}`)
3. Copia **TUTTO** il contenuto di `Code.gs` e incollalo nell'editor
4. Salva (Ctrl+S o File > Salva)
5. Dai un nome al progetto (es: "Investment Tracker API")

### 4. Pubblica come Web App
1. Clicca su **Deploy > Nuova implementazione**
2. Clicca sull'icona ingranaggio ⚙️ vicino a "Seleziona tipo"
3. Seleziona **App web**
4. Configura:
   - **Descrizione**: "Investment Tracking API v1"
   - **Esegui come**: **Me** (il tuo account)
   - **Chi ha accesso**: **Chiunque** (importante!)
5. Clicca **Deploy**
6. Autorizza l'app (potrebbero chiederti di autorizzare l'accesso)
7. **COPIA L'URL** che viene generato (es: `https://script.google.com/macros/s/ABC.../exec`)

### 5. Aggiorna l'URL nel frontend
Prendi l'URL copiato e aggiornalo nel file:
```
src/services/historicalPriceService.js
```

Sostituisci la riga 10 con il tuo nuovo URL:
```javascript
const GOOGLE_APPS_SCRIPT_URL = 'IL_TUO_URL_QUI';
```

## 🧪 Test

### Test manuale nel browser
Prova a visitare questi URL (sostituisci `YOUR_URL` con il tuo URL):

**Test prezzo corrente:**
```
YOUR_URL?ticker=VWCE.DE&current=true
```

**Test TER:**
```
YOUR_URL?ticker=VWCE.DE&ter=true
```

**Test prezzi storici:**
```
YOUR_URL?ticker=VWCE.DE&startDate=2024-01-01&endDate=2024-12-31
```

### Test nello script
Puoi anche testare direttamente nell'editor:
1. Seleziona la funzione `testScript` dal menu a tendina in alto
2. Clicca su **Run** (▶️)
3. Guarda i log in **View > Logs**

## 📊 Come funziona il TER

Lo script cerca di recuperare il TER da 3 fonti (in ordine):

1. **Yahoo Finance** - Scraping della pagina (più affidabile)
2. **JustETF** - Per ETF europei (richiede ISIN - non ancora implementato)
3. **Database Manuale** - Fallback per i tuoi ETF specifici

### Aggiungere TER manualmente

Se il TER non viene trovato automaticamente, puoi aggiungerlo al database manuale nello script:

Cerca la funzione `getTERFromManualDatabase` e aggiungi i tuoi ETF:

```javascript
const terDatabase = {
  'VWCE.DE': 0.22,
  'IL_TUO_TICKER': 0.XX,  // Aggiungi qui
  // ...
};
```

Poi:
1. Salva lo script
2. Vai su **Deploy > Gestisci implementazioni**
3. Clicca sull'icona ✏️ (modifica) della tua implementazione
4. Cambia **Versione** in "Nuova versione"
5. Clicca **Deploy**

## ⚠️ Troubleshooting

### "Access denied" quando testo l'URL
- Assicurati di aver impostato "Chi ha accesso" su **Chiunque**
- Riprova a fare il deploy

### TER non trovato
1. Controlla i log: **View > Logs** nell'editor
2. Aggiungi manualmente al database (vedi sopra)
3. Verifica che il ticker sia scritto correttamente

### Prezzi storici vuoti
- Assicurati che il foglio "HistoricalData" esista
- Google Finance potrebbe non avere dati per quel ticker
- Prova con un ticker diverso (es: AAPL, MSFT)

## 🔄 Aggiornare lo script

Quando modifichi il codice:
1. Salva (Ctrl+S)
2. **Deploy > Gestisci implementazioni**
3. Modifica l'implementazione esistente
4. Cambia versione in "Nuova versione"
5. Deploy

**Non serve cambiare l'URL nel frontend se aggiorni la stessa implementazione!**
