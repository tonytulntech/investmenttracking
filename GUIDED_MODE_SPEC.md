# Investment Tracker — Specifica "Modalità Guidata" (Goal-Based)

> Documento di riferimento per Claude Code. Va messo nella root della repo.
> Regola generale: **non riscrivere le 15 pagine esistenti**. Si aggiunge un livello (obiettivi + regole + modalità) sopra a quello che c'è già, riusando i servizi esistenti (prezzi, Monte Carlo, ribilanciamento, multi-portafoglio).

---

## 0. Principi

1. **Obiettivo prima del portafoglio.** Lo studente crea obiettivi; ogni obiettivo ha un portafoglio dedicato (1:1).
2. **Una pagina = una domanda = un'azione.**
3. **Struttura guidata, mai gabbia.** Tutto è modificabile, ma le modifiche strutturali passano da un processo con frizione intenzionale.
4. **Niente metriche da professionisti in modalità Guidata.** No Sharpe, alpha, beta. Solo: "sto andando verso il mio obiettivo?".
5. **Retrocompatibilità.** I dati esistenti in localStorage non si perdono. Migrazione esplicita e versionata.

---

## 1. Modalità dell'app

| Modalità | Chi | Pagine visibili |
|---|---|---|
| `guided` | Studenti Investitore 1.0 (default per nuovi utenti) | 5 pagine guidate + Calcolatori + Settings |
| `advanced` | Chi ha completato l'onboarding | Tutte le 15 pagine attuali + le 5 guidate |
| `pro` | Tony / clienti premium | Tutto + area "Pro" (placeholder per moduli futuri: regime macro, trend following) |

Regole:
- Utente nuovo → `guided` e onboarding obbligatorio al primo avvio.
- Utente esistente con dati già presenti → `advanced` di default (non gli si nasconde nulla), con banner "Prova la modalità guidata".
- Passaggio `guided → advanced`: possibile solo con onboarding completato. Mostra una conferma: "In modalità avanzata vedrai molte più metriche. Non servono per investire bene: servono per analizzare."
- `pro`: attivabile da Settings con toggle nascosto (es. 5 tap sulla versione dell'app) oppure flag in config. Non esposto agli studenti.
- Il cambio modalità non cancella né modifica dati.

---

## 2. Modello dati (localStorage)

Chiavi nuove, tutte con prefisso coerente con quelle esistenti (adattare al naming già usato nel progetto).

### 2.1 `appMode`
```js
{ mode: 'guided' | 'advanced' | 'pro', changedAt: ISODate }
```

### 2.2 `goals`
```js
[
  {
    id: string,
    name: string,                 // "Casa", "Pensione", ...
    type: 'emergency' | 'house' | 'retirement' | 'independence' | 'education' | 'custom',
    targetAmount: number,         // € in valore nominale
    targetDate: ISODate,
    initialCapital: number,
    monthlyContribution: number,
    riskProfile: {
      maxTolerableLoss: 10 | 20 | 30 | 40,   // % che accetta senza vendere
      incomeStability: 'stable' | 'variable',
      experience: 'none' | 'some' | 'experienced'
    },
    allocationTarget: { equity: number, bondShort: number, bondMedium: number, cash: number, gold: number }, // somma 100
    etfSelection: [{ isin, ticker, bucket: 'equity'|'bondShort'|'bondMedium'|'cash'|'gold', weightInBucket }],
    portfolioId: string,          // collegamento al portafoglio già esistente nel sistema multi-portafoglio
    status: 'active' | 'paused' | 'completed' | 'archived',
    createdAt: ISODate,
    updatedAt: ISODate
  }
]
```

### 2.3 `goalRules` (versionate — non si sovrascrivono mai)
```js
[
  {
    id: string,
    goalId: string,
    version: number,              // 1, 2, 3...
    rebalance: {
      method: 'threshold' | 'calendar' | 'both',
      thresholdPct: 5,            // deviazione assoluta in punti % da un bucket target
      calendarMonth: 1            // mese del ribilanciamento annuale
    },
    crashPlan: {
      choice: 'hold' | 'hold_and_buy' | 'rebalance',   // cosa faccio se il portafoglio scende del 20-30%
      personalNote: string        // lo studente lo scrive con parole sue
    },
    reviewFrequency: 'semiannual' | 'annual',
    signedAt: ISODate,            // "firma" = conferma esplicita con checkbox + nome digitato
    signedName: string,
    changeReason: string | null,  // null per la versione 1
    marketContext: {              // snapshot al momento della firma
      portfolioDrawdownPct: number,
      benchmarkDrawdown60dPct: number
    },
    status: 'active' | 'superseded' | 'pending'   // pending = in periodo di raffreddamento
  }
]
```

### 2.4 `goalRevisions` (richieste di modifica strutturale)
```js
[
  {
    id, goalId,
    requestedAt: ISODate,
    effectiveAt: ISODate,         // = requestedAt oppure +7 giorni se c'è raffreddamento
    changes: { field: { from, to } },
    lifeEvent: 'job' | 'family' | 'house' | 'inheritance' | 'health' | 'other' | 'none',
    reasonText: string,
    stressFlag: boolean,          // true se richiesta fatta in condizioni di stress di mercato
    status: 'pending' | 'applied' | 'cancelled'
  }
]
```

### 2.5 `studentProgress`
```js
{ onboardingCompleted: boolean, onboardingCompletedAt: ISODate, lastReviewAt: ISODate, schemaVersion: number }
```

### 2.6 Migrazione
- Introdurre `schemaVersion`. Alla prima apertura con la nuova versione:
  - I portafogli esistenti **non collegati** a un obiettivo restano intatti e vengono etichettati "Portafoglio libero".
  - In modalità guidata compare una card: "Hai N portafogli senza obiettivo. Vuoi collegarli?" → mini-flusso che crea l'obiettivo e lo collega al portafoglio esistente.
- Aggiornare **Export backup** e **Import backup** in Settings per includere tutte le chiavi nuove.
- Nessuna cancellazione automatica di dati esistenti.

---

## 3. Motore di allocazione (glide path)

File dedicato, es. `src/lib/glidePath.js` (adattare al percorso del progetto). Funzione pura, testabile.

### 3.1 Allocazione base per anni all'obiettivo

| Anni all'obiettivo | Azionario | Bond breve (1-3) | Bond medio (7-10) | Liquidità |
|---|---|---|---|---|
| > 20 | 90 | 0 | 10 | 0 |
| 15–20 | 80 | 5 | 15 | 0 |
| 10–15 | 70 | 10 | 20 | 0 |
| 7–10 | 60 | 15 | 25 | 0 |
| 5–7 | 45 | 30 | 25 | 0 |
| 3–5 | 30 | 50 | 20 | 0 |
| 1–3 | 10 | 70 | 0 | 20 |
| < 1 | 0 | 30 | 0 | 70 |

Tipo `emergency`: sempre 0 azionario, 50 liquidità / 50 bond breve, indipendentemente dagli anni.

### 3.2 Aggiustamento per profilo di rischio
- `maxTolerableLoss` 10% → azionario −20 punti (spostati su bond breve)
- 20% → −10
- 30% → 0
- 40% → +10 (max 100, preso dal bond medio)
- `incomeStability: 'variable'` → azionario −10 aggiuntivi
- Clamp finale: azionario tra 0 e 100, somma sempre 100.

### 3.3 Split interno all'azionario
- Default: 88% mondo sviluppato + 12% emergenti (oppure 100% ETF all-world se lo studente sceglie la versione a 1 ETF).
- Oro: **0 di default**. Lo studente può aggiungerlo fino a 10% solo manualmente, con tooltip che spiega il perché (diversificatore, nessun rendimento intrinseco).

### 3.4 Glide path nel tempo
- Il target si ricalcola automaticamente quando l'obiettivo **cambia fascia** (es. passa da 7-10 anni a 5-7).
- Non si applica in automatico: genera una notifica "Il tuo obiettivo si avvicina: il portafoglio target è cambiato. Vuoi aggiornare le regole?" → passa dal flusso di revisione (sezione 7) ma **senza** raffreddamento (è un cambio pianificato, non emotivo).

### 3.5 Lista ETF curata
File di configurazione, es. `src/config/curatedEtfs.js`. **Verificare ISIN e ticker contro i dati già presenti nell'app** prima di usarli.

| Bucket | ETF | ISIN | Ticker Yahoo (indicativo) |
|---|---|---|---|
| Azionario sviluppati | iShares Core MSCI World | IE00B4L5Y983 | SWDA.MI |
| Azionario emergenti | iShares Core MSCI EM IMI | IE00BKM4GZ66 | EIMI.MI |
| Azionario all-world (alternativa 1 ETF) | Vanguard FTSE All-World Acc | IE00BK5BQT80 | VWCE.MI |
| Bond breve | iShares Euro Govt Bond 1-3yr | IE00B14X4Q57 | IBGS.MI |
| Bond medio | iShares Euro Govt Bond 7-10yr | IE00B1FZS806 | IBGM.MI |
| Liquidità | Xtrackers II EUR Overnight Rate Swap | LU0290358497 | XEON.MI |
| Oro (opzionale) | Invesco Physical Gold | JE00B588CD74 | SGLD.MI |

La lista è modificabile solo da codice/config (da Tony), non dallo studente in modalità guidata. In modalità avanzata lo studente può usare qualsiasi strumento.

---

## 4. Onboarding wizard (modalità guidata)

Percorso: `/guida/inizia` (adattare al router esistente). Stato salvato a ogni step, così se chiude l'app riprende da dove era.

**Step 1 — Quanti obiettivi hai?**
Card selezionabili (multi-select): Fondo emergenza, Casa, Pensione, Indipendenza finanziaria, Studi figli, Altro.
Suggerimento fisso: "Se non hai un fondo emergenza, parti da quello."

**Step 2 — Per ogni obiettivo** (un sotto-step per obiettivo)
- Nome
- Importo target (€)
- Data target
- Capitale iniziale
- PAC mensile dedicato
- Validazione: se PAC totale di tutti gli obiettivi è molto alto rispetto al capitale, nessun blocco, solo riepilogo.

**Step 3 — Profilo di rischio** (una volta sola, vale per tutti gli obiettivi, modificabile per singolo obiettivo)
Tre domande, linguaggio concreto:
1. "Hai 10.000 € investiti. Dopo un anno ne vedi 7.000. Cosa fai?" → mappa su `maxTolerableLoss`
2. "Il tuo reddito è stabile o varia molto?" → `incomeStability`
3. "Hai mai investito?" → `experience` (usato solo per il tono dei testi, non per l'allocazione)

**Step 4 — Portafoglio proposto** (per ogni obiettivo)
- Mostra l'allocazione calcolata dal glide path con donut + spiegazione in una riga per ogni bucket.
- Mostra gli ETF della lista curata già assegnati.
- Mostra il risultato del Monte Carlo esistente: probabilità di raggiungere l'obiettivo + scenario peggiore (5° percentile) / mediano / migliore (95° percentile) in €.
- Lo studente può spostare l'azionario di ±10 punti con uno slider; la probabilità si ricalcola live.
- Crea automaticamente il portafoglio nel sistema multi-portafoglio esistente e lo collega all'obiettivo.

**Step 5 — Le mie regole** (per ogni obiettivo)
- Ribilanciamento: soglia 5% (default) / annuale a gennaio / entrambi
- Piano crollo: tre opzioni + campo di testo obbligatorio "Scrivi con parole tue cosa farai se il portafoglio scende del 30%"
- Review: semestrale (default) / annuale
- Firma: checkbox "Mi impegno a seguire queste regole" + nome digitato → crea `goalRules` versione 1

Fine → `onboardingCompleted = true` → atterra sulla Dashboard guidata.

---

## 5. Le 5 pagine della modalità guidata

Navigazione ridotta a queste 5 voci (+ Calcolatori + Settings).

### 5.1 I miei obiettivi (home)
Una card per obiettivo:
- Nome, importo target, data
- Barra di progresso: valore attuale / valore atteso a oggi secondo la proiezione mediana
- Semaforo basato sulla probabilità Monte Carlo di raggiungere l'obiettivo:
  - ≥ 75% → verde "In linea"
  - 50–75% → giallo "Da tenere d'occhio"
  - < 50% → rosso "Fuori strada"
- Se giallo/rosso: una sola azione suggerita — "Per tornare al 75% servono X €/mese in più" oppure "sposta la data di N mesi". Calcolo per ricerca binaria sul PAC usando il Monte Carlo esistente.
- **Un solo alert globale** in cima, massimo uno alla volta, in ordine di priorità:
  1. Revisione in raffreddamento pronta da confermare
  2. Ribilanciamento necessario
  3. Review periodica scaduta
  4. Cambio fascia glide path

Da evitare in questa pagina: rendimento %, P/L giornaliero, grafici intraday.

### 5.2 Il mio portafoglio (per obiettivo)
- Selettore obiettivo in alto
- Pesi attuali vs target per bucket (barre affiancate)
- Lista posizioni semplice: nome ETF, valore, peso
- Link "Vedi dettaglio completo" visibile solo se modalità ≠ guided

### 5.3 Le mie regole
- Regole attive dell'obiettivo selezionato, leggibili come un documento
- Data firma e versione
- Storico versioni (timeline): data, cosa è cambiato, motivo, se era in condizioni di stress
- Pulsante "Modifica" → avvia il flusso di revisione (sezione 7)

### 5.4 Il mio progresso
- Grafico: proiezione Monte Carlo (fascia 5°-95° percentile + mediana) vs valore reale nel tempo
- Totale versato vs valore attuale
- Niente benchmark, niente heatmap

### 5.5 Devo fare qualcosa?
Riusa la logica della pagina Ribilanciamento esistente, ma output binario:
- **No** → "Tutto in regola. Prossimo controllo: [data]."
- **Sì** → istruzioni precise: "Questo mese investi il PAC così: X € su ETF A, Y € su ETF B." Priorità al ribilanciamento tramite nuovi versamenti (niente vendite = niente eventi fiscali). Suggerire vendite solo se la deviazione supera il doppio della soglia e i versamenti non bastano a rientrare in 12 mesi, con nota sull'impatto fiscale (26%).

---

## 6. Multi-obiettivo: regole di coerenza

- Ogni obiettivo ha il suo portafoglio. Uno stesso ETF può stare in più portafogli (es. SWDA in "Casa" e in "Pensione"): le quote vanno attribuite al portafoglio, non condivise.
- Import CSV: dopo l'import, le nuove transazioni non assegnate finiscono in "Da assegnare" e lo studente sceglie a quale obiettivo appartengono (con suggerimento automatico basato sul bucket dell'ETF e sul PAC previsto).
- Vista aggregata "Tutto il patrimonio" disponibile ma secondaria.
- Obiettivo raggiunto → stato `completed`, messaggio celebrativo, proposta: "Vuoi spostare questo capitale in liquidità / su un altro obiettivo?".
- Fondo emergenza: se esiste e non è completo, mostra sugli altri obiettivi una nota "Prima completa il fondo emergenza".

---

## 7. Flusso di revisione (cambio orizzonte / obiettivo / allocazione)

Si attiva quando lo studente modifica un campo **strutturale**: `targetDate`, `targetAmount`, `type`, `allocationTarget`, `riskProfile`, `crashPlan`.
**Non** si attiva per: nome, PAC mensile, nota personale, aggiunta di un nuovo obiettivo.

Passi:
1. **Cosa è cambiato nella tua vita?** → scelta tra `lifeEvent` + testo libero.
2. **Rilevamento stress di mercato** (automatico):
   `stressFlag = true` se il drawdown del portafoglio dal massimo degli ultimi 90 giorni ≥ 15% **oppure** il benchmark MSCI World (già presente in Performance) è sceso ≥ 15% negli ultimi 60 giorni.
3. **Domanda specchio** (sempre): "Se i mercati fossero ai massimi, faresti comunque questa modifica?" Sì / No / Non so.
4. **Anteprima impatto**: prima/dopo di allocazione target e probabilità di raggiungere l'obiettivo.
5. **Applicazione:**
   - `stressFlag = false` → si applica subito, nuova versione di `goalRules` firmata.
   - `stressFlag = true` **e** `lifeEvent = 'none'` **oppure** risposta specchio ≠ "Sì" → **raffreddamento di 7 giorni**: revisione in stato `pending`, alert in home, dopo 7 giorni lo studente deve riconfermare. Può annullare in qualsiasi momento.
   - `stressFlag = true` con evento di vita reale e risposta "Sì" → si applica subito ma viene marcata nello storico.
6. Ogni versione precedente passa a `superseded`, mai cancellata.

Testo da mostrare durante il raffreddamento (esempio):
"Stai chiedendo di cambiare strategia mentre il mercato è in calo. Non è vietato: ti chiediamo solo di aspettare 7 giorni e riconfermare. La maggior parte degli errori costosi nasce in questi momenti."

---

## 8. Review periodica

- In base a `reviewFrequency`, alla scadenza compare l'alert "È il momento della tua review".
- Mini-flusso di 3 domande: è cambiato qualcosa nella tua vita? Il PAC è ancora sostenibile? Le regole sono ancora valide?
- Se tutto invariato → aggiorna `lastReviewAt`, fine. Se qualcosa cambia → flusso di revisione (sezione 7) senza raffreddamento, perché è una review pianificata.

---

## 9. Vincoli tecnici

- Riusare: servizio prezzi, Monte Carlo del Backtest, logica Ribilanciamento, sistema multi-portafoglio, componenti grafici già presenti.
- Logica di dominio (glide path, stress detection, probabilità obiettivo, suggerimento PAC) in funzioni pure separate dalla UI, con test unitari.
- Tutti i testi UI in italiano, tono diretto, frasi brevi.
- Mobile-first per le 5 pagine guidate.
- Nessun backend: tutto resta in localStorage.
- Monte Carlo per le card obiettivo: calcolo con cache (ricalcola solo se cambiano input o prezzi da più di 24h) per non rallentare la home.

---

## 10. Criteri di accettazione

- [ ] Un utente nuovo completa l'onboarding con 2 obiettivi in meno di 5 minuti.
- [ ] Un utente esistente aggiorna l'app e non perde nessun dato; i portafogli esistenti compaiono come "Portafoglio libero".
- [ ] In modalità guidata sono visibili solo le 5 pagine + Calcolatori + Settings.
- [ ] Modificare la data target durante un drawdown simulato del 20% attiva il raffreddamento di 7 giorni.
- [ ] Lo storico regole mostra tutte le versioni con motivo e flag stress.
- [ ] "Devo fare qualcosa?" non suggerisce vendite se il ribilanciamento è possibile con i versamenti.
- [ ] Export/import backup include obiettivi, regole, revisioni e modalità.
- [ ] Test unitari su glidePath, stressDetection, goalProbability, requiredContribution.