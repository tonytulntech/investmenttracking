# Investment Tracker — Specifica "Modalità Guidata" (Goal-Based) — v2

> Documento di riferimento per Claude Code. **Le "Decisioni v2" qui sotto hanno la precedenza sul testo della specifica originale** (sezioni 0–20, più sotto) dove c'è conflitto.

## Decisioni v2 (ott 2026)

1. **Tono neutro, niente raccomandazioni personalizzate.** L'app è uno strumento educativo e di monitoraggio: lo studente fa ciò che spiega il corso. Riscritte rispetto al testo originale:
   - §3.5 (lista ETF curata): lo studente **sceglie** gli ETF; la lista del corso è solo materiale didattico di riferimento, non un'assegnazione automatica.
   - §5.5, §13, §14.2: niente "questo mese investi X € su ETF A" né tagli/aumenti del prelievo "suggeriti". Si mostra lo **scostamento rispetto alle regole firmate dallo studente** e, come semplice aritmetica, "per rientrare con i versamenti servirebbero X € sul bucket Y". La pagina si chiama **"Stato rispetto alle tue regole"**.
   - Il portafoglio "proposto" (§4 step 4) è presentato come **"modello del corso"** che lo studente adotta o modifica consapevolmente.
   - Tutto questo va comunque **fatto rivedere da un legale** prima di aprire ai clienti (confine con la consulenza in materia di investimenti, MiFID II).
2. **Modalità assegnata solo dall'amministratore** (Tony, `tonypezzella.fa@gmail.com`). I clienti **non hanno selettore**. Tabella `user_profiles` con RLS (lettura del proprio profilo; scrittura solo admin). Chi non è admin parte in **Guidata** con l'**esercizio Obiettivi** come prima e unica schermata finché non lo completa. L'admin vede il selettore per sé; la modalità di un cliente la imposta da Supabase → Table Editor (una pagina admin in-app richiederebbe un servizio lato server con service_role: rimandata). Questo **non** dà all'admin accesso ai dati finanziari dei clienti, che restano isolati. Sostituisce §1 "Regole" per i passaggi di modalità.
3. **Dati: Supabase.** Il "nessun backend" del §9 è superato: i dati stanno in localStorage e sono sincronizzati su Supabase (`cloudSync`). **Ogni nuova chiave dati va aggiunta a `SYNC_KEYS`** (`src/services/cloudSyncCore.js`). Nessun accesso dell'admin ai dati dei clienti.
4. **Prerequisito del §16:** `portfolioId` **per transazione** (oggi l'assegnazione è per ticker). Da fare prima di CSV→obiettivi e dei trasferimenti tra obiettivi.
5. **Ingresso dati:** solo import **CSV** dalle piattaforme. **Nessun dato di esempio finto.**
6. **Valori di partenza** = quelli del §11.1 (già applicati in `src/config/marketAssumptions.js`, v2); soglie semaforo **75/50** (§5.1). Le correlazioni per i bucket breve/medio sono stime iniziali da validare. Il glide path in `goalService.js` (versione v1 con soli 3 bucket) va sostituito da `src/lib/glidePath.js` secondo il §3 (bucket e aggiustamento per rischio).
7. **Inflazione reale.** Il dato ufficiale italiano (IPCA/HICP, Eurostat) è disponibile via `/api/inflation` (cache 24h) e `src/services/inflationData.js`. Si usa per **mostrare** l'inflazione attuale e per **calibrare** (media/volatilità sugli ultimi 20 anni), ma l'ipotesi del simulatore resta quella di `marketAssumptions` (2,2% / 1,2%): l'inflazione degli ultimi 12 mesi non è una previsione a 10–20 anni. **Da verificare sul sito in produzione** (il formato Eurostat non è stato verificabile dall'ambiente di sviluppo); se il dato manca, l'app usa i valori di partenza.
8. **Residenza fiscale al ritiro.** Per ogni obiettivo: `taxResidence: { country: 'IT' | 'OTHER', customRate?: number }`. Italia → 26% (titoli di Stato white list 12,5%). Altro paese → **aliquota inserita dall'utente** (0–60%); aliquote di altri paesi non sono precaricate perché cambiano e dipendono dalla situazione personale. `resolveTaxRate()` in `marketAssumptions.js`; `evaluateGoal({ taxRate })`. Limite dichiarato: si modellano solo imposte sulle plusvalenze al ritiro (non patrimoniali, progressività, franchigie). Avviso in UI: stima indicativa, verificare con un professionista fiscale.
9. **Piano di costruzione (fette rilasciabili):**
   1. Fondamenta: modello dati, assunzioni per bucket, Monte Carlo multi-bucket in euro reali con inflazione casuale, `glidePath.js` secondo §3, semaforo, `user_profiles` + modalità assegnata dall'admin, test.
   2. **Esercizio Obiettivi** (wizard §4 step 1–5, senza CSV: i calcoli partono dal capitale inserito).
   3. CSV → assegnazione transazioni agli obiettivi (`portfolioId` per transazione), "Il mio portafoglio", "Il mio progresso".
   4. Regole firmate, revisioni e raffreddamento (§7), review periodica (§8).
   5. "Stato rispetto alle tue regole", decumulo, trasferimenti, "E se…?".

---

## Specifica originale

Regola generale: non riscrivere le pagine esistenti. Si aggiunge un livello (obiettivi + regole + modalità) sopra a quello che c'è già, riusando i servizi esistenti (prezzi, Monte Carlo, ribilanciamento, multi-portafoglio).

### 0. Principi
- Obiettivo prima del portafoglio. Lo studente crea obiettivi; ogni obiettivo ha un portafoglio dedicato (1:1).
- Una pagina = una domanda = un'azione.
- Struttura guidata, mai gabbia. Tutto è modificabile, ma le modifiche strutturali passano da un processo con frizione intenzionale.
- Niente metriche da professionisti in modalità Guidata. No Sharpe, alpha, beta. Solo: "sto andando verso il mio obiettivo?".
- Retrocompatibilità. I dati esistenti in localStorage non si perdono. Migrazione esplicita e versionata.

### 1. Modalità dell'app
| Modalità | Chi | Pagine visibili |
|---|---|---|
| guided | Studenti Investitore 1.0 (default per nuovi utenti) | 5 pagine guidate + Calcolatori + Settings |
| advanced | Chi ha completato l'onboarding | Tutte le pagine attuali + le 5 guidate |
| pro | Tony / clienti premium | Tutto + area "Pro" (placeholder per moduli futuri: regime macro, trend following) |

Regole (⚠ per i passaggi di modalità vale la Decisione v2 n. 2):
- Utente nuovo → guided e onboarding obbligatorio al primo avvio.
- Utente esistente con dati già presenti → advanced di default (non gli si nasconde nulla), con banner "Prova la modalità guidata".
- Passaggio guided → advanced: possibile solo con onboarding completato. Conferma: "In modalità avanzata vedrai molte più metriche. Non servono per investire bene: servono per analizzare."
- pro: non esposto agli studenti.
- Il cambio modalità non cancella né modifica dati.

### 2. Modello dati (localStorage)
Chiavi nuove, con prefisso coerente con quelle esistenti. **Aggiungerle a `SYNC_KEYS`.**

**2.1 appMode** `{ mode: 'guided' | 'advanced' | 'pro', changedAt: ISODate }` (⚠ v2: la modalità autoritativa è in `user_profiles` su Supabase.)

**2.2 goals**
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
    // v2: taxResidence: { country: 'IT' | 'OTHER', customRate?: number }
  }
]
```

**2.3 goalRules** (versionate — non si sovrascrivono mai)
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

**2.4 goalRevisions** (richieste di modifica strutturale)
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

**2.5 studentProgress** `{ onboardingCompleted: boolean, onboardingCompletedAt: ISODate, lastReviewAt: ISODate, schemaVersion: number }`

**2.6 Migrazione.** Introdurre `schemaVersion`. Alla prima apertura con la nuova versione:
- I portafogli esistenti non collegati a un obiettivo restano intatti e vengono etichettati "Portafoglio libero".
- In modalità guidata compare una card: "Hai N portafogli senza obiettivo. Vuoi collegarli?" → mini-flusso che crea l'obiettivo e lo collega al portafoglio esistente.
- Aggiornare Export/Import backup in Settings per includere tutte le chiavi nuove.
- Nessuna cancellazione automatica di dati esistenti.

### 3. Motore di allocazione (glide path)
File dedicato `src/lib/glidePath.js`. Funzione pura, testabile.

**3.1 Allocazione base per anni all'obiettivo**
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

**3.2 Aggiustamento per profilo di rischio**
- `maxTolerableLoss` 10% → azionario −20 punti (spostati su bond breve); 20% → −10; 30% → 0; 40% → +10 (max 100, preso dal bond medio).
- `incomeStability: 'variable'` → azionario −10 aggiuntivi.
- Clamp finale: azionario tra 0 e 100, somma sempre 100.

**3.3 Split interno all'azionario.** Default: 88% mondo sviluppato + 12% emergenti (oppure 100% ETF all-world se lo studente sceglie la versione a 1 ETF). Oro: 0 di default; fino a 10% solo manualmente, con tooltip che spiega il perché (diversificatore, nessun rendimento intrinseco).

**3.4 Glide path nel tempo.** Il target si ricalcola quando l'obiettivo cambia fascia. Non si applica in automatico: genera una notifica "Il tuo obiettivo si avvicina: il portafoglio target è cambiato. Vuoi aggiornare le regole?" → flusso di revisione (§7) senza raffreddamento (cambio pianificato).

**3.5 Lista ETF** (⚠ v2: materiale didattico di riferimento; lo studente sceglie). File `src/config/curatedEtfs.js`. Verificare ISIN e ticker contro i dati dell'app prima dell'uso.
| Bucket | ETF | ISIN | Ticker Yahoo (indicativo) |
|---|---|---|---|
| Azionario sviluppati | iShares Core MSCI World | IE00B4L5Y983 | SWDA.MI |
| Azionario emergenti | iShares Core MSCI EM IMI | IE00BKM4GZ66 | EIMI.MI |
| Azionario all-world (alternativa 1 ETF) | Vanguard FTSE All-World Acc | IE00BK5BQT80 | VWCE.MI |
| Bond breve | iShares Euro Govt Bond 1-3yr | IE00B14X4Q57 | IBGS.MI |
| Bond medio | iShares Euro Govt Bond 7-10yr | IE00B1FZS806 | IBGM.MI |
| Liquidità | Xtrackers II EUR Overnight Rate Swap | LU0290358497 | XEON.MI |
| Oro (opzionale) | Invesco Physical Gold | JE00B588CD74 | SGLD.MI |

La lista è modificabile solo da codice/config (da Tony), non dallo studente in modalità guidata.

### 4. Onboarding wizard (modalità guidata)
Percorso `/guida/inizia`. Stato salvato a ogni step, così se chiude l'app riprende da dove era.

- **Step 1 — Quanti obiettivi hai?** Card multi-select: Fondo emergenza, Casa, Pensione, Indipendenza finanziaria, Studi figli, Altro. Suggerimento fisso: "Se non hai un fondo emergenza, parti da quello."
- **Step 2 — Per ogni obiettivo:** nome, importo target (€), data target, capitale iniziale, PAC mensile dedicato. (v2: + dove sarai residente quando ritiri il capitale.) Validazione: se il PAC totale è molto alto rispetto al capitale, nessun blocco, solo riepilogo.
- **Step 3 — Profilo di rischio** (una volta, valido per tutti gli obiettivi, modificabile per singolo obiettivo). Tre domande concrete: "Hai 10.000 € investiti. Dopo un anno ne vedi 7.000. Cosa fai?" → `maxTolerableLoss`; "Il tuo reddito è stabile o varia molto?" → `incomeStability`; "Hai mai investito?" → `experience` (solo per il tono dei testi).
- **Step 4 — Portafoglio** (per obiettivo): allocazione calcolata dal glide path con donut + spiegazione in una riga per bucket; mostra gli ETF scelti; risultato Monte Carlo: probabilità di raggiungere l'obiettivo + scenario peggiore (5° percentile) / mediano / migliore (95°) in €. Slider ±10 punti sull'azionario, probabilità ricalcolata live. Crea il portafoglio nel sistema multi-portafoglio e lo collega all'obiettivo.
- **Step 5 — Le mie regole** (per obiettivo): ribilanciamento (soglia 5% default / annuale a gennaio / entrambi); piano crollo: tre opzioni + campo di testo obbligatorio "Scrivi con parole tue cosa farai se il portafoglio scende del 30%"; review semestrale (default) / annuale; firma: checkbox "Mi impegno a seguire queste regole" + nome digitato → crea `goalRules` versione 1.

Fine → `onboardingCompleted = true` → atterra sulla Dashboard guidata.

### 5. Le 5 pagine della modalità guidata
Navigazione ridotta a queste 5 voci (+ Calcolatori + Settings).

**5.1 I miei obiettivi (home).** Una card per obiettivo: nome, importo target, data; barra di progresso (valore attuale / valore atteso a oggi secondo la proiezione mediana); semaforo sulla probabilità Monte Carlo: ≥ 75% verde "In linea", 50–75% giallo "Da tenere d'occhio", < 50% rosso "Fuori strada". Se giallo/rosso: una sola azione suggerita — "Per tornare al 75% servono X €/mese in più" oppure "sposta la data di N mesi" (ricerca binaria sul PAC con il Monte Carlo). Un solo alert globale in cima, in ordine di priorità: revisione in raffreddamento pronta da confermare; ribilanciamento necessario; review periodica scaduta; cambio fascia glide path. Da evitare: rendimento %, P/L giornaliero, grafici intraday.

**5.2 Il mio portafoglio** (per obiettivo): selettore obiettivo; pesi attuali vs target per bucket (barre affiancate); lista posizioni semplice (nome ETF, valore, peso); link "Vedi dettaglio completo" solo se modalità ≠ guided.

**5.3 Le mie regole:** regole attive come un documento; data firma e versione; storico versioni (timeline: data, cosa è cambiato, motivo, se era in condizioni di stress); pulsante "Modifica" → flusso di revisione (§7).

**5.4 Il mio progresso:** proiezione Monte Carlo (fascia 5°-95° + mediana) vs valore reale nel tempo; totale versato vs valore attuale. Niente benchmark, niente heatmap.

**5.5 Stato rispetto alle tue regole** (⚠ v2, prima "Devo fare qualcosa?"). Riusa la logica del Ribilanciamento, output binario: No → "Tutto in regola. Prossimo controllo: [data]."; Sì → quale regola è scattata e di quanto, con l'aritmetica "per rientrare con i nuovi versamenti servirebbero X € sul bucket Y". Priorità al rientro tramite nuovi versamenti (niente vendite = niente eventi fiscali); le vendite si menzionano solo come conseguenza aritmetica quando la deviazione supera il doppio della soglia e i versamenti non bastano a rientrare in 12 mesi, con nota sull'impatto fiscale. Nessuna indicazione su singoli prodotti.

### 6. Multi-obiettivo: regole di coerenza
- Ogni obiettivo ha il suo portafoglio. Uno stesso ETF può stare in più portafogli (es. SWDA in "Casa" e in "Pensione"): le quote vanno attribuite al portafoglio, non condivise. (Richiede `portfolioId` per transazione.)
- Import CSV: le nuove transazioni non assegnate finiscono in "Da assegnare" e lo studente sceglie a quale obiettivo appartengono (suggerimento automatico basato sul bucket dell'ETF e sul PAC previsto).
- Vista aggregata "Tutto il patrimonio" disponibile ma secondaria.
- Obiettivo raggiunto → `completed`, messaggio celebrativo, proposta: "Vuoi spostare questo capitale in liquidità / su un altro obiettivo?".
- Fondo emergenza: se esiste e non è completo, sugli altri obiettivi compare "Prima completa il fondo emergenza".

### 7. Flusso di revisione (cambio orizzonte / obiettivo / allocazione)
Si attiva quando lo studente modifica un campo strutturale: `targetDate`, `targetAmount`, `type`, `allocationTarget`, `riskProfile`, `crashPlan`. Non si attiva per: nome, PAC mensile, nota personale, aggiunta di un nuovo obiettivo.

1. **Cosa è cambiato nella tua vita?** → scelta tra `lifeEvent` + testo libero.
2. **Rilevamento stress di mercato (automatico):** `stressFlag = true` se il drawdown del portafoglio dal massimo degli ultimi 90 giorni ≥ 15% oppure il benchmark MSCI World è sceso ≥ 15% negli ultimi 60 giorni.
3. **Domanda specchio (sempre):** "Se i mercati fossero ai massimi, faresti comunque questa modifica?" Sì / No / Non so.
4. **Anteprima impatto:** prima/dopo di allocazione target e probabilità di raggiungere l'obiettivo.
5. **Applicazione:** `stressFlag = false` → si applica subito, nuova versione di `goalRules` firmata. `stressFlag = true` e `lifeEvent = 'none'` oppure risposta specchio ≠ "Sì" → raffreddamento di 7 giorni (revisione `pending`, alert in home, dopo 7 giorni va riconfermata; annullabile in qualsiasi momento). `stressFlag = true` con evento di vita reale e risposta "Sì" → si applica subito, marcata nello storico.

Ogni versione precedente passa a `superseded`, mai cancellata.

Testo durante il raffreddamento: "Stai chiedendo di cambiare strategia mentre il mercato è in calo. Non è vietato: ti chiediamo solo di aspettare 7 giorni e riconfermare. La maggior parte degli errori costosi nasce in questi momenti."

### 8. Review periodica
In base a `reviewFrequency`, alla scadenza compare "È il momento della tua review". Mini-flusso di 3 domande: è cambiato qualcosa nella tua vita? Il PAC è ancora sostenibile? Le regole sono ancora valide? Tutto invariato → aggiorna `lastReviewAt`. Se qualcosa cambia → flusso di revisione (§7) senza raffreddamento (review pianificata).

### 9. Vincoli tecnici
- Riusare: servizio prezzi, Monte Carlo, logica Ribilanciamento, sistema multi-portafoglio, componenti grafici.
- Logica di dominio (glide path, stress detection, probabilità obiettivo, suggerimento PAC) in funzioni pure separate dalla UI, con test unitari.
- Testi UI in italiano, tono diretto, frasi brevi. Mobile-first per le 5 pagine guidate.
- (⚠ v2: dati in localStorage + sync Supabase, non solo localStorage.)
- Monte Carlo per le card obiettivo con cache (ricalcola solo se cambiano input o prezzi da più di 24h).

### 10. Criteri di accettazione
- Un utente nuovo completa l'onboarding con 2 obiettivi in meno di 5 minuti.
- Un utente esistente aggiorna l'app e non perde nessun dato; i portafogli esistenti compaiono come "Portafoglio libero".
- In modalità guidata sono visibili solo le 5 pagine + Calcolatori + Settings.
- Modificare la data target durante un drawdown simulato del 20% attiva il raffreddamento di 7 giorni.
- Lo storico regole mostra tutte le versioni con motivo e flag stress.
- "Stato rispetto alle tue regole" non menziona vendite se il rientro è possibile con i versamenti.
- Export/import backup include obiettivi, regole, revisioni e modalità.
- Test unitari su `glidePath`, `stressDetection`, `goalProbability`, `requiredContribution`.

---

## PARTE 2 — Bucket, rendita, inflazione, tasse e modifiche
Estende le sezioni 1–10. Dove c'è conflitto, vale questa parte (salvo le Decisioni v2). Caso di riferimento per i test: 100k iniziali, PAC 10–15k/mese, casa da 100k tra 5–6 anni, rendita parziale da 5 anni, investimento continuato a 10–20 anni.

### 11. Principio: tutto in euro di oggi
Lo studente ragiona in potere d'acquisto, non in euro futuri. "Casa da 100k tra 6 anni" = una casa che oggi costa 100k.
- Ogni importo inserito (target, spese mensili, PAC) è in euro reali di oggi.
- L'app converte in nominale alla data dell'obiettivo con l'inflazione di `marketAssumptions.inflation`.
- In UI si mostrano sempre entrambi i valori: "100.000 € di oggi ≈ 116.000 € nel 2032".
- Monte Carlo e probabilità in termini reali (rendimenti reali = nominali − inflazione simulata): 75% significa "75% di avere il potere d'acquisto che volevi".

**11.1 marketAssumptions.js** (estensione; valori di partenza, già applicati):
```js
export const MARKET_ASSUMPTIONS = {
  version: '2026-10',
  inflation: { mean: 0.022, vol: 0.012 },           // TODO Tony: confermare
  buckets: {                                        // rendimenti NOMINALI attesi, prudenziali
    equity:     { mean: 0.065, vol: 0.155 },        // TODO Tony
    bondShort:  { mean: 0.025, vol: 0.020 },
    bondMedium: { mean: 0.030, vol: 0.060 },
    cash:       { mean: 0.020, vol: 0.005 },
    gold:       { mean: 0.035, vol: 0.150 },
  },
  correlations: { /* matrice 6x6 inclusa inflazione — TODO dai dati Backtesto */ },
  tax: { capitalGains: 0.26, govBondsWhitelist: 0.125 },
  safeWithdrawalRate: { horizon30: 0.04, horizon40: 0.035, horizon50: 0.033 },
};
```
Mostrare in app, nella pagina "Come calcoliamo", tutte le ipotesi con la data di aggiornamento.

**11.2 Opzioni inflazione per obiettivo:** `indexTarget: true` (default) → il target cresce con l'inflazione; `indexContribution: true|false` → il PAC cresce ogni gennaio (default false, suggerito come opzione); `indexWithdrawal: true` (default per la rendita).

### 12. Tipi di obiettivo e bucket
**12.1 Tre famiglie**
| Famiglia | Tipi | Logica |
|---|---|---|
| Sicurezza | emergency | Importo = N mesi di spese. Nessun azionario. Priorità massima. |
| Spesa a data | house, education, car, custom | Importo fisso a una data. Glide path §3. A scadenza si usa il capitale. |
| Rendita | income (nuovo) | Accumulo fino a una data, poi prelievi per decenni. Glide path NON sulla data di inizio prelievo. |

`retirement` e `independence` diventano entrambi `income` con parametri diversi.

**12.2 Campi aggiuntivi su goals**
```js
{
  // comuni
  priority: number,                 // 1 = più alta; default: emergency 1, spesa a data 2, income 3
  amountsInRealTerms: true,
  indexTarget: boolean,
  indexContribution: boolean,
  flexibility: 'fixed' | 'flexible',

  // solo emergency
  monthlyExpenses: number,          // € di oggi
  monthsCovered: 6 | 9 | 12,

  // solo income
  withdrawalStartDate: ISODate,
  horizonEndAge: number,            // default 95
  birthYear: number,
  monthlyWithdrawal: number,        // € di oggi desiderati
  partialIncome: boolean,
  otherIncomeMonthly: number,
  reserveYears: 2 | 3,
  phase: 'accumulation' | 'transition' | 'decumulation'
}
```

**12.3 Allocazione dell'obiettivo income.** Glide path su anni a `horizonEndAge`, non su anni a `withdrawalStartDate` (rendita che inizia tra 5 anni e dura 45 → orizzonte 45). Fasi:
- `accumulation` (oltre 2 anni dall'inizio prelievi): allocazione §3 con orizzonte lungo + aggiustamento rischio. Tipicamente 80–90% azionario.
- `transition` (ultimi 2 anni): i nuovi versamenti riempiono prima la riserva = `reserveYears` × 12 × prelievo netto mensile, investita 70% bondShort + 30% cash. L'azionario esistente non si vende.
- `decumulation`: il prelievo esce dalla riserva. Ricarica: §14.
Allocazione target in decumulo = riserva (bondShort+cash) + resto 70–80% azionario / 20–30% bondMedium.

### 13. Distribuzione del PAC tra obiettivi (waterfall)
(⚠ v2: output come **calcolo mostrato**, non come istruzione di acquisto su prodotti.) Funzione pura `src/lib/allocateContribution.js`:
`allocateContribution({ goals, monthlyTotal, today, assumptions }) → [{ goalId, amount, reason }]`
1. Ordina gli obiettivi attivi per `priority`.
2. Sicurezza: se il fondo non è pieno, riceve tutto il PAC fino al riempimento (max 50% del PAC, configurabile).
3. Spese a data: PAC necessario per arrivare al target con probabilità ≥ 75% (`requiredContribution`). Se la somma supera il PAC disponibile, si riduce in ordine inverso di priorità e si segnala "Obiettivo X sottofinanziato".
4. Rendita / crescita: riceve tutto il resto.
Se lo studente ha impostato PAC manuali per obiettivo, si rispettano e l'algoritmo mostra solo il confronto. Ricalcolo ogni mese e a ogni modifica di un obiettivo.

### 14. Decumulo: regole di prelievo
Funzione pura `src/lib/withdrawalPlan.js`.

**14.1 Prelievo iniziale.** Prelievo lordo annuo = (`monthlyWithdrawal` − `otherIncomeMonthly`) × 12, indicizzato. Tasso di prelievo = prelievo / capitale all'inizio, confrontato con `safeWithdrawalRate` per l'orizzonte: ≤ soglia verde; fino a +1 punto giallo; oltre rosso (⚠ v2: si mostra "con questi numeri il tasso di prelievo è X% contro una soglia di riferimento Y%", senza prescrivere cosa fare).

**14.2 Guardrail (Guyton-Klinger semplificato).** Ogni gennaio: se il tasso corrente supera quello iniziale del 20% → si segnala che la regola di taglio del 10% è scattata; se scende sotto del 20% → regola di aumento del 10%; altrimenti solo adeguamento all'inflazione. (⚠ v2: applicati solo se lo studente li ha adottati nelle sue regole; lo studente conferma.)

**14.3 Ricarica della riserva.** Il prelievo mensile esce sempre dalla riserva. La riserva si ricarica vendendo azionario solo se l'azionario è sopra il suo target o se l'ultimo anno è stato positivo. Dopo un anno negativo non si vende azionario: si consuma la riserva. Se la riserva scende sotto 1 anno → alert giallo.

**14.4 Tasse sui prelievi.** Le vendite usano il costo medio di carico (metodo italiano): tasse = max(0, (prezzo − PMC) × quote) × aliquota. ETF obbligazionari: aliquota pesata = 12,5% × quota titoli di Stato white list + 26% × resto (dato da `etfComposition`, fallback 26%). Minusvalenze ETF non compensabili con plusvalenze ETF: mostrare un avviso, non tentare compensazioni. (⚠ v2: l'aliquota dipende dalla residenza fiscale dell'obiettivo.) In UI: "Per avere 2.500 € netti vendi 2.640 € lordi (tasse stimate 140 €)".

### 15. Raggiungimento dell'obiettivo
**15.1 Spesa a data.** 12 mesi prima: alert "Mancano 12 mesi: il portafoglio deve essere quasi tutto in sicuro" (verifica azionario ≤ 10%). Alla data: stato `ready`, tre azioni: Usa il capitale (registra un prelievo, `completed`); Rimanda (flusso di revisione con nuova data; nessun raffreddamento se non c'è stress); Non serve più (trasferimento ad altro obiettivo, §16). Sopra il target: si propone di trasferire l'eccedenza all'obiettivo con priorità successiva. Sotto: si mostra il gap reale e le opzioni (rimandare, ridurre, integrare da un altro obiettivo).

**15.2 Rendita.** Passaggio di `phase` a `transition` a −24 mesi e a `decumulation` alla data, con conferma dello studente. In decumulo la card mostra prelievo mensile netto, anni di riserva rimasti, probabilità che il capitale duri fino a `horizonEndAge`.

**15.3 Fondo emergenza.** Pieno → il PAC smette di andarci e si redistribuisce (§13). Se viene usato (prelievo registrato) → torna priorità 1 finché non si ricostituisce.

### 16. Modifiche agli obiettivi e trasferimenti
**16.1 Trasferimento tra obiettivi senza tasse.** Gli obiettivi condividono gli stessi ETF: spostare capitale da "Casa" a "Rendita" quando entrambi contengono lo stesso ETF non richiede vendite, si riassegnano le quote (lotti) da un `portfolioId` all'altro (i portafogli sono etichette sulle stesse posizioni nello stesso conto). `transferBetweenGoals({ fromGoalId, toGoalId, amount, mode })`:
- `mode: 'reassign'` (default): sposta quote di ETF già presenti nell'obiettivo di destinazione, nessun evento fiscale. Registra `type: 'internal_transfer'` con `fromPortfolioId`, `toPortfolioId`, quote, PMC invariato.
- `mode: 'sell_buy'`: solo se la destinazione non contiene quell'ETF e lo studente sceglie di convertire. Mostra stima tasse prima di confermare.
Le transazioni `internal_transfer` sono escluse dai calcoli di versato/prelevato del patrimonio totale e dal TWR complessivo.

**16.2 Cosa è strutturale e cosa no**
| Modifica | Tipo | Flusso |
|---|---|---|
| Cambio PAC totale | non strutturale | ricalcolo waterfall, nessuna firma |
| Cambio nome, nota | non strutturale | diretto |
| Cambio data o importo obiettivo | strutturale | §7 |
| Cambio `withdrawalStartDate` o `monthlyWithdrawal` | strutturale | §7 |
| Cambio priorità | strutturale | §7 senza raffreddamento |
| Cancellazione obiettivo | strutturale | §7 + trasferimento obbligatorio del capitale (16.1) |
| Trasferimento tra obiettivi | strutturale | §7; con stress di mercato, raffreddamento 7 giorni |
| Nuovo obiettivo | non strutturale | onboarding ridotto, ricalcolo waterfall |

**16.3 Simulatore "E se…?".** Pagina leggera dove lo studente cambia un parametro senza salvarlo e vede l'impatto su tutti gli obiettivi ("E se riduco il PAC a 6.000 €?", "E se compro casa un anno prima?", "E se inizio la rendita a 7 anni invece di 5?", "E se l'inflazione fosse al 4%?"). Output: tabella prima/dopo con probabilità per obiettivo. Pulsante "Applica" → flusso di revisione.

**16.4 Cambi di vita guidati.** Nel flusso di revisione (§7, passo 1) alcuni `lifeEvent` propongono modifiche preimpostate: `job` (reddito giù) → "E se…?" sul PAC; `house` → obiettivo casa con data anticipata o completamento; `inheritance` → chiede l'importo e mostra lo split con il waterfall; `family` → propone nuovo obiettivo education.

### 17. Pagine guidate: modifiche
- I miei obiettivi: card raggruppate per famiglia (Sicurezza / Spese / Rendita), target in € di oggi e nominale; card rendita con fase e tasso di prelievo.
- Stato rispetto alle tue regole: in cima lo split mensile del PAC (§13) come calcolo, sotto il dettaglio per bucket. In decumulo: prelievo mensile netto e anni di riserva.
- Il mio progresso: grafico in € reali di default, toggle "mostra in € nominali".
- Nuova voce: "E se…?" (§16.3), visibile in tutte le modalità.

### 18. Onboarding: modifiche
- Step 1 aggiunge "Vivere di rendita (anche parziale)".
- Per `income`: quando vuoi iniziare a prelevare, quanto vorresti al mese in € di oggi, altri redditi in quel periodo, anno di nascita.
- Se seleziona sia "Pensione" sia "Indipendenza", l'app propone di unirli in un solo obiettivo `income`: "Sono lo stesso portafoglio in due momenti diversi".
- Prima domanda nuova, obbligatoria: spese mensili attuali (serve per fondo emergenza, prelievo sostenibile e test di realismo).

### 19. Test unitari aggiuntivi
- `allocateContribution`: caso di riferimento → emergenza riempita per prima, casa riceve il PAC necessario, resto a rendita.
- `withdrawalPlan`: guardrail in su e in giù; riserva consumata dopo un anno negativo senza vendita di azionario.
- `inflation`: 100k reali a 6 anni con 2,2% → ~113.900 nominali.
- `transferBetweenGoals`: `reassign` non genera tasse e non altera il PMC; `sell_buy` calcola le tasse con PMC.
- `glidePath` per income: inizio prelievi a 5 anni, `horizonEndAge` 95, età 35 → orizzonte 60 anni → allocazione da fascia > 20.
- Tasse: ETF obbligazionario con 100% white list → aliquota 12,5%.

### 20. Criteri di accettazione aggiuntivi
- Tutti gli importi inseriti sono in € di oggi e mostrati anche in nominale.
- Il caso di riferimento produce lo split PAC atteso e una probabilità per ogni obiettivo.
- La rendita a 5 anni NON scende sotto il 70% azionario prima della fase `transition`.
- La riserva si costruisce nei 24 mesi prima dell'inizio prelievo usando solo i versamenti.
- Cancellare l'obiettivo casa trasferisce le quote alla rendita senza eventi fiscali.
- "E se…?" non salva nulla finché non si preme "Applica".
- Alla data di un obiettivo a scadenza compaiono le tre azioni Usa / Rimanda / Non serve più.
