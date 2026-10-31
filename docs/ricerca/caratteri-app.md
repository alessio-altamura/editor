# Caratteri dell'app simili a quelli di Claude

Ricerca del 2026-10-31 per una scelta concreta: Alessio trova molto
leggibili i caratteri dell'app di Claude e ne cerca di simili, aperti, per
l'interfaccia dell'`app` e per il testo scritto dentro gli oggetti
nell'editor. La resa del documento non è in gioco.

## I caratteri di Claude

Nei fogli di stile che claude.ai serve dal suo dominio
([v2](https://assets-proxy.anthropic.com/claude-ai/v2/assets/v1/c6a992d55-CGuUmOei.css),
[v1](https://assets-proxy.anthropic.com/claude-ai/v1/_next/static/css/026d87fb2c6610cf.css),
letti il 2026-10-31):

- `--font-ui: var(--font-anthropic-sans)`, cioè Anthropic Sans per
  l'interfaccia;
- `--font-claude-response: var(--font-anthropic-serif)`, cioè Anthropic Serif
  per il testo delle risposte;
- `--font-mono: var(--font-anthropic-mono)`.

Sono caratteri di Anthropic; non risulta una licenza che ne permetta l'uso
fuori dai suoi prodotti. I file sono stati scaricati solo per il confronto,
nella cartella di lavoro della sessione, e non sono nel repository. È stato
letto il sito, non l'eseguibile dell'app desktop.

## Il metodo

Candidati: 15 sans e 11 serif da [google/fonts](https://github.com/google/fonts),
tutti con licenza SIL Open Font License 1.1 (file OFL.txt di ogni cartella),
più Inter e i Source del `runtime`. Misura in Chromium, carattere per
carattere su a-z, A-Z e 0-9, a 80 px:

- **somiglianza**: intersezione su unione delle sagome (IoU), con ogni
  candidato scalato perché l'altezza della «x» coincida con quella del
  riferimento;
- **larghezze**: scarto medio relativo delle larghezze dei caratteri.

L'altezza della «x» è stata misurata prima a 100 px, con un errore fino
all'1% per l'arrotondamento al pixel, poi a 1000 px per le tavole finali.
Senza normalizzare l'altezza la classifica cambia molto, soprattutto per i
serif: Merriweather, primo senza normalizzare, scende al settimo posto.

## Risultati, alla stessa altezza della «x»

| sans | IoU | scarto larghezze |
|---|---|---|
| DM Sans | 0,674 | 0,117 |
| Instrument Sans | 0,672 | 0,052 |
| Albert Sans | 0,661 | 0,058 |
| Figtree | 0,653 | 0,064 |
| Hanken Grotesk | 0,625 | 0,078 |
| Inter | 0,623 | 0,092 |
| Public Sans | 0,596 | 0,081 |
| Geist | 0,553 | 0,087 |
| IBM Plex Sans | 0,500 | 0,121 |
| Source Sans 3 | 0,477 | 0,134 |

| serif | IoU | scarto larghezze |
|---|---|---|
| Spectral | 0,707 | 0,088 |
| Petrona | 0,625 | 0,070 |
| Crimson Pro | 0,595 | 0,062 |
| Lora | 0,595 | 0,068 |
| Merriweather | 0,577 | 0,102 |
| Newsreader | 0,558 | 0,073 |
| Literata | 0,514 | 0,081 |
| Source Serif 4 | 0,478 | 0,101 |

A occhio Spectral, primo nella misura, è più largo e più chiaro del
riferimento. Alessio ha scelto Figtree e Petrona, osservando che il
riferimento ha più contrasto, lettere un po' più piene e più spaziate.

## Peso e spaziatura

Stessa frase in tutti e due, alla stessa altezza della «x», confrontando
l'inchiostro (somma dell'opacità dei pixel) e la lunghezza della riga con il
riferimento a peso 400:

- Figtree: a 400 ha il 10% di inchiostro in meno; a 475 lo stesso, e la riga
  è lunga uguale (2274 contro 2276 px), quindi nessuna spaziatura;
- Petrona: a 400 ha il 9% di inchiostro in meno; a 470 lo stesso, ma la riga
  è già più lunga del 10% (2419 contro 2207 px): altra spaziatura lo
  allontanerebbe.
