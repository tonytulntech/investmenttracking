# Modalità Guidata — Specifica v1

> Stato: **bozza da approvare**. Le decisioni sono già prese (con motivazione); le questioni davvero aperte sono in fondo.

## 1. Principio
Chi usa la modalità Guidata non deve capire la finanza: deve sapere **se è in linea con i suoi obiettivi e cosa fare (di solito: niente)**. Ogni schermata ha un solo compito e una sola risposta. Il linguaggio è semplice, i numeri sono spiegati, i dati complessi stanno un tap più in là.

Tre modalità, stessi dati:
| Modalità | Per chi | Cosa vede |
|---|---|---|
| Guidata | Studenti del corso, principianti | 5 pagine guidate + Transazioni |
| Avanzata | Investitore autonomo | Tutte le pagine attuali |
| Pro | Consulenti / premium | Avanzata + multi-cliente, report (fase successiva) |

## 2. Decisioni di modello
**D1 — Un obiettivo = un portafoglio esistente + campi obiettivo.** Non si crea una nuova entità. Il portafoglio ha già `goalAmount` e `goalYear` (`portfolioConfigService`); si aggiungono `goalType`, `monthlyContribution`, `riskProfile`. *Perché:* riuso di ruoli, drift, alert e ribilanciamento già funzionanti; nessuna migrazione dati.
**Limite noto:** l'assegnazione è per-ticker, quindi un ticker può servire un solo obiettivo. Soluzione completa = `portfolioId` per transazione (già in "In sospeso"); fuori scopo v1.

**D2 — Probabilità di successo = Monte Carlo esistente** (`runMonteCarlo` con `targetAmount`), in **termini reali** (al netto dell'inflazione) e **dopo tasse** (26%). Mai un singolo numero: sempre "probabilità" + intervallo (p10–p90).

**D3 — Ipotesi di mercato prudenti, centralizzate** in `src/config/marketAssumptions.js` (rendimento, volatilità, correlazioni per bucket: azionario, obbligazionario, oro, liquidità). Una sola fonte, versionata, con data e fonte dichiarate. Non vengono mai modificate silenziosamente.

**D4 — Glide path a tabella, modificabile solo in Pro.** Quota azionaria target in funzione degli anni mancanti:
| Anni all'obiettivo | Azionario |
|---|---|
| ≥ 15 | 80–90% |
| 10–15 | 70–80% |
| 5–10 | 50–60% |
| 3–5 | 30–40% |
| < 3 | 10–20% |
L'azionario scende col tempo, il resto va in obbligazionario/liquidità. Il target alimenta il `targetAllocation` del portafoglio.

**D5 — Soglie del semaforo** (probabilità di successo): ≥ 80% *In linea*, 60–79% *Da attenzionare*, < 60% *Da rivedere*. Con la causa e la leva (più versamento, più tempo, obiettivo più basso).

## 3. Le 5 pagine
1. **Obiettivi** — elenco obiettivi con semaforo, probabilità di successo, importo atteso vs target. Creazione guidata in 4 passi (cosa, quanto, quando, quanto puoi versare). Mostra cosa serve per arrivare all'80%.
2. **Portafoglio** — per l'obiettivo selezionato: composizione attuale vs glide path, in parole semplici ("Hai il 72% in azioni, a questo punto ne servirebbe il 60%").
3. **Regole firmate** — regole personali (es. "non vendo se il mercato scende", "ribilancio una volta l'anno", "verso X € al mese") confermate con una firma esplicita e datata. Sono la base dell'anti-panico.
4. **Progresso** — percorso reale vs percorso atteso (fan chart del Monte Carlo con la linea reale sopra). Risponde a "sono in anticipo o in ritardo?".
5. **Devo fare qualcosa?** — una sola risposta: *Niente da fare* / *Versa € X* / *Ribilancia (ecco come)* / *Rivedi l'obiettivo*. Calcolata da drift, versamento mancante e semaforo.

## 4. Anti-panico
- Se il portafoglio è in calo **> 15% dal massimo** e l'utente prova a cambiare strategia, obiettivo o regole firmate, parte un **raffreddamento di 7 giorni**: la modifica viene registrata come "in attesa" e confermabile solo dopo.
- Prima della conferma si mostra la regola firmata e quante volte, storicamente, un calo simile è rientrato (dato dal Monte Carlo, non promesso).
- Versamenti e ribilanciamenti previsti dalle regole **non** sono bloccati.

## 5. Tutela e conformità (importante)
- Strumento **educativo e di analisi**, non consulenza in materia di investimenti. Disclaimer visibile in Obiettivi e in "Devo fare qualcosa?".
- Le probabilità sono stime da ipotesi dichiarate, non previsioni. Sempre mostrati gli intervalli e le ipotesi.
- Prima di aprire al pubblico o di vendere la modalità Pro a consulenti serve un parere legale sul perimetro MiFID/consulenza (non sono un legale: va verificato con un professionista).

## 6. Piano di costruzione (ogni passo è rilasciabile)
1. `marketAssumptions.js` + `goalService.js` (funzioni pure: glide path, probabilità, semaforo, azione consigliata) con test.
2. Pagina **Obiettivi** + creazione guidata.
3. Pagina **Devo fare qualcosa?** (il valore più alto per l'utente).
4. **Regole firmate** + **anti-panico**.
5. **Progresso** e **Portafoglio**.
6. Onboarding che propone la modalità; Guidata passa dal menu provvisorio al menu delle pagine guidate.
7. Pro: da definire dopo il parere legale e il feedback dei consulenti.

## 7. Questioni aperte (con default proposto)
- **Valuta/tasse:** solo investitore fiscalmente italiano, aliquota 26% — *default sì*.
- **Obiettivo "libertà finanziaria":** usa prelievo sostenibile (SWR 3,25%) — *default sì*, parametri in `marketAssumptions`.
- **Lingua dei numeri:** sempre in euro di oggi (reali) — *default sì*.
- **Chi controlla le ipotesi di mercato:** tu come autore del corso — *da confermare*.
