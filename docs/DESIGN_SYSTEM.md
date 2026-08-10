# Design System — "Direzione C" (editoriale scuro)

Obiettivo: togliere il look "generato dall'AI" (aurora blu→verde, glassmorphism ovunque, colori Apple copiati) e dare un'identità sobria e professionale, stile terminale finanziario moderno (Linear / Vercel / Koyfin).

## Principi
1. **Fondo neutro, non blu.** Niente gradienti glow/aurora. Superfici solide.
2. **Vetro solo dove serve** (max 1 elemento). Le card sono solide con bordo hairline.
3. **Un solo accento** freddo, non iOS-blue. Colore usato **solo dove ha significato**.
4. **Verde/rosso = solo P/L** (semantica), mai decorativo.
5. **Numeri = protagonisti**: font mono tabellare, incolonnati.
6. **Gerarchia e densità**, non tutto è una card fluttuante.

## Token (definiti in `src/index.css`)

### Dark (default)
| Token | Valore | Uso |
|---|---|---|
| `--bg` | `#09090B` | sfondo pagina (neutro) |
| `--card-bg` | `#141416` | superficie card (solida) |
| `--surface-1` | `#18181B` | modali/overlay |
| `--surface-2` | `#0F0F11` | superfici incassate |
| `--border` | `rgba(255,255,255,0.07)` | bordo hairline |
| `--border-strong` | `rgba(255,255,255,0.12)` | bordo evidenziato/hover |
| `--text-1` | `#FAFAFA` | testo primario |
| `--text-2` | `rgba(250,250,250,0.62)` | testo secondario |
| `--text-3` | `rgba(250,250,250,0.40)` | testo faint/label |
| `--accent` | `#7C82FF` | accento (periwinkle indigo) |
| `--accent-weak` | `rgba(124,130,255,0.12)` | bg accento tenue |
| `--pos` | `#3FB950` | P/L positivo |
| `--neg` | `#F85149` | P/L negativo |

### Light
`--bg #FAFAFA` · `--card-bg #FFFFFF` · `--surface-2 #F4F4F5` · `--border rgba(0,0,0,0.08)` · `--text-1 #18181B` · `--text-2 rgba(24,24,27,0.62)` · `--text-3 rgba(24,24,27,0.42)` · accento invariato.

## Tipografia
- **UI/display**: `Inter` (fallback system).
- **Numeri**: `JetBrains Mono` + `font-variant-numeric: tabular-nums` (var `--font-mono`).
- Caricati via Google Fonts in `index.html` (self-host in futuro per perf/offline).

## Primitive (`src/components/ui/`, in .jsx, stile shadcn)
Costruire incrementalmente: `Card`, `Stat` (KPI), `Button`, `Badge`, `Table`. Helper `cn()` in `src/lib/utils.js`.

## Accento — come cambiarlo
È in un solo posto (`--accent` / `--accent-weak` in `index.css`). Proposte alternative se il periwinkle non convince: teal `#2DD4BF`, amber `#F5A524`, violet `#8B5CF6`. Provarne uno = cambiare 2 righe.

## Da fare (roadmap restyle)
- [x] Token globali Direzione C + font (Fase 0)
- [x] `lib/utils.cn` + cartella `components/ui`
- [ ] Primitiva `Card` + `Stat` e conversione widget vetrina (Dashboard KPI)
- [ ] Conversione widget per widget (Portfolio, Transazioni, Performance, Dividendi…)
- [ ] Detune/rimozione glass residuo e colori Apple hardcoded nei chart
