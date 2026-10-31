# Vega per disegnare i grafici

Ricerca del 2026-10-31 per una scelta concreta: chi disegna il `chart`, un
motore esistente o un disegno SVG scritto da noi. Fatti verificati il
2026-10-31.

## Licenza e misura

Dal registro npm (`npm view`):

| pacchetto | versione | licenza | dimensione del pacchetto |
|---|---|---|---|
| vega | 6.4.0 | BSD-3-Clause | 3,7 MB |
| vega-lite | 6.5.0 | BSD-3-Clause | 5,9 MB |

Installati insieme con le loro dipendenze occupano 26 MB in `node_modules`.
Restano nel `runtime`: nell'HTML esportato e nel PDF va solo l'SVG.

## Disegno in Node senza canvas

La documentazione di Vega ([usage](https://vega.github.io/vega/usage/)) dice
che sul server la `View` usa il renderer `none`, senza elemento DOM, e che
node-canvas serve «to generate PNG images and accurately measure font metrics
for text mark truncation»; vega non lo richiede per default. Non dice in
modo esplicito che l'SVG funziona senza node-canvas: l'abbiamo provato.

Prova del 2026-10-31, Node 22, vega 6.4.0 e vega-lite 6.5.0, senza il
pacchetto canvas: una specifica Vega-Lite con tre barre, compilata con
`compile` e disegnata con `new View(parse(spec), { renderer: 'none' })
.toSVG()`.

- L'SVG esce (6729 byte) in circa 60 ms.
- Due esecuzioni con lo stesso input danno lo stesso SVG, carattere per
  carattere.
- Limite: senza canvas la larghezza del testo è stimata, quindi il taglio di
  un'etichetta troppo lunga è approssimato.

## Cosa ne segue

Il `template` e i suoi ruoli restano un formato nostro; il `runtime` li
traduce in una specifica Vega-Lite con i dati della `collection`. Vega dà
assi, tacche, legende e impaginazione già fatti, e si può sostituire senza
toccare i file del documento.
