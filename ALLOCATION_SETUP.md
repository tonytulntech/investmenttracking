# Portfolio Allocation Feature - Setup Guide

## Overview

L'app ora recupera automaticamente i dati di allocazione (paese, settore, continente, tipo di mercato, valuta) per ogni asset che aggiungi.

## Come Funziona

### 1. Aggiunta Automatica dei Dati

Quando inserisci una nuova transazione:
1. Digita il **ticker** dell'asset (es. VWCE.DE, AAPL, BTC)
2. Seleziona la **categoria** (ETF, Stock, Crypto)
3. L'app recupera automaticamente:
   - 🌍 **Paesi**: Esposizione geografica per paese
   - 🌎 **Continenti**: Distribuzione per continente
   - 📊 **Tipo di Mercato**: Developed, Emerging, Frontier
   - 💰 **Valuta**: Valuta di denominazione
   - 🏭 **Settori**: Breakdown settoriale (Technology, Healthcare, ecc.)

### 2. Visualizzazione nella Dashboard

Nella Dashboard troverai una nuova sezione **"Diversificazione Portfolio"** con:
- **Selettore di visualizzazione**: Scegli tra Paese, Continente, Tipo di Mercato, Valuta, Settore
- **Grafico a barre**: Mostra la % di allocazione del tuo portfolio in base alla vista selezionata

## API Setup

### Financial Modeling Prep (FMP)

L'app utilizza l'API di Financial Modeling Prep per i dati di allocazione ETF.

#### Ottieni la tua API Key GRATUITA:

1. Vai su: https://site.financialmodelingprep.com/register
2. Registrati gratuitamente (non serve carta di credito)
3. Nella dashboard, copia la tua **API Key**
4. Piano gratuito: **250 richieste/giorno** (più che sufficiente per uso personale)

#### Configura l'API Key:

Apri il file `src/services/allocationService.js` e sostituisci:

```javascript
const FMP_API_KEY = 'demo'; // Sostituisci con la tua API key
```

Con:

```javascript
const FMP_API_KEY = 'TUA_API_KEY_QUI';
```

## Fonti Dati

### ETF
- **Settori**: Financial Modeling Prep API
- **Paesi**: Financial Modeling Prep API
- Mapping automatico a continenti e market types

### Stock/Azioni
- **Settore/Industry**: Yahoo Finance API
- **Paese**: Yahoo Finance API
- Mapping automatico a continente e market type

### Crypto
- **Info di base**: CoinGecko API
- Settore: "Cryptocurrency"
- Paese: "Global"

## Esempio di Utilizzo

1. **Aggiungi una transazione ETF**:
   - Ticker: `VWCE.DE`
   - Categoria: ETF
   - L'app recupera automaticamente l'allocazione geografica e settoriale

2. **Visualizza nella Dashboard**:
   - Vai alla Dashboard
   - Scorri fino a "Diversificazione Portfolio"
   - Clicca su "🌍 Paese" per vedere la distribuzione per paese
   - Clicca su "🏭 Settore" per vedere la distribuzione settoriale

## Limitazioni e Note

- **Demo API Key**: Con la chiave 'demo' di default, potresti avere limitazioni di rate
- **Dati non disponibili**: Alcuni asset potrebbero non avere dati di allocazione (verrà mostrato un avviso)
- **Cache**: I dati vengono salvati con la transazione, non è necessario recuperarli ogni volta
- **Crypto**: Le criptovalute non hanno allocazione geografica/settoriale tradizionale

## Troubleshooting

### "Nessun dato di allocazione disponibile"

**Causa**: L'asset non è nel database FMP o la categoria è errata

**Soluzioni**:
1. Verifica che il ticker sia corretto
2. Assicurati che la categoria sia corretta (ETF vs Stock)
3. Alcuni asset potrebbero non avere dati disponibili

### Errore 429 (Too Many Requests)

**Causa**: Hai superato il limite di 250 richieste/giorno del piano gratuito

**Soluzioni**:
1. Aspetta 24 ore per il reset
2. Passa al piano premium di FMP (se necessario)
3. I dati già salvati rimangono disponibili

### L'allocazione non si aggiorna

**Causa**: I dati vengono salvati una volta con la transazione

**Soluzione**: Modifica la transazione per forzare un nuovo fetch dei dati

## Contributi e Feedback

Se trovi problemi o hai suggerimenti:
1. Verifica la console del browser per errori (F12 > Console)
2. Controlla che l'API key sia configurata correttamente
3. Segnala eventuali bug con screenshot e ticker utilizzato

---

**Buon tracking!** 📊📈
