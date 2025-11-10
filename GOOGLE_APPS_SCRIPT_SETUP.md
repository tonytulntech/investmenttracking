# Google Apps Script Setup Guide

## Configurazione del Servizio di Prezzi via Google Apps Script

Questo sistema usa il tuo Google Apps Script personalizzato per ottenere i prezzi di Yahoo Finance, evitando problemi di CORS e rate limiting.

---

## ⚙️ Step 1: Aggiorna il tuo Google Apps Script

Apri il tuo Google Apps Script e aggiungi questa funzione `doGet()` per gestire le richieste HTTP:

```javascript
/**
 * HTTP GET handler per Web App
 * Gestisce richieste dal frontend React
 */
function doGet(e) {
  try {
    const ticker = e.parameter.ticker;

    if (!ticker) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Missing ticker parameter'
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }

    // Chiama la tua funzione esistente per ottenere i prezzi
    const priceData = getYahooFinancePrice(ticker);

    // Restituisci i dati in formato JSON
    return ContentService.createTextOutput(JSON.stringify(priceData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## 🚀 Step 2: Pubblica come Web App

1. Nel tuo Google Apps Script, clicca su **"Deploy"** → **"New deployment"**
2. Clicca sull'icona ingranaggio ⚙️ e seleziona **"Web app"**
3. Configura:
   - **Description**: "Yahoo Finance Price API"
   - **Execute as**: Me (il tuo account)
   - **Who has access**: Anyone (anche utenti anonimi)
4. Clicca su **"Deploy"**
5. **Copia l'URL** della Web App (sarà simile a: `https://script.google.com/macros/s/ABC...XYZ/exec`)

---

## 🔗 Step 3: Configura l'URL nell'App React

1. Apri il file: `src/services/googleScriptPriceService.js`
2. Trova questa riga:

```javascript
const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
```

3. Sostituisci `'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'` con l'URL che hai copiato:

```javascript
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/ABC...XYZ/exec';
```

4. Salva il file

---

## ✅ Step 4: Testa la Configurazione

Dopo aver configurato l'URL, riavvia l'app:

```bash
npm run dev
```

Nel browser, apri la console (F12) e controlla i messaggi:
- ✓ `Using Google Apps Script service...` = Configurato correttamente
- ⚠️ `Google Apps Script URL not configured` = URL non ancora impostato

---

## 🔄 Come Funziona il Sistema

```
Frontend React
    ↓
priceService.js (router principale)
    ↓
1️⃣ Controlla cache (30 min)
    ↓
2️⃣ Prova Google Apps Script ← METODO PRIMARIO
    ↓
3️⃣ Fallback: API diretta Yahoo Finance
    ↓
4️⃣ Fallback: Prezzo d'acquisto
```

### Vantaggi del Google Apps Script:

✓ Nessun problema di CORS
✓ Autenticazione cookie/crumb gestita server-side
✓ Nessun rate limiting dal browser
✓ Richieste autenticate e stabili

---

## 📊 Verifica che Funziona

1. Vai su Dashboard
2. Apri la Console (F12)
3. Dovresti vedere:
   ```
   📊 Using Google Apps Script service for multiple prices...
   ✓ Successfully fetched all prices via Google Apps Script
   ```

4. I prezzi dovrebbero aggiornarsi senza errori 429

---

## 🐛 Troubleshooting

### Problema: "Google Apps Script URL not configured"
**Soluzione**: Assicurati di aver impostato l'URL in `googleScriptPriceService.js`

### Problema: "Failed to fetch from Google Apps Script"
**Soluzione**:
- Verifica che la Web App sia pubblicata con accesso "Anyone"
- Controlla che l'URL sia corretto (deve finire con `/exec`)
- Verifica che la funzione `doGet()` sia presente nello script

### Problema: "Missing ticker parameter"
**Soluzione**: Il parametro viene passato automaticamente - controlla che la funzione `doGet(e)` legga correttamente `e.parameter.ticker`

### Problema: Errori 429 continuano
**Soluzione**: L'URL non è configurato correttamente o la Web App non è accessibile. Il sistema sta ancora usando l'API diretta.

---

## 📝 Note Importanti

- **Cache**: I prezzi sono cached per 30 minuti per ridurre le chiamate
- **Rate Limiting**: Lo script introduce delay di 1.5 secondi tra richieste multiple
- **Fallback**: Se Google Apps Script fallisce, il sistema usa automaticamente l'API diretta
- **Sicurezza**: La Web App deve essere pubblicata con accesso "Anyone" per funzionare dal browser

---

## 🎯 Prossimi Passi

Una volta configurato:

1. L'app userà automaticamente il tuo Google Apps Script
2. Nessun errore 429 da Yahoo Finance
3. Prezzi sempre aggiornati e stabili
4. Cache di 30 minuti per ottimizzare le prestazioni

**Buon tracking! 📈**
