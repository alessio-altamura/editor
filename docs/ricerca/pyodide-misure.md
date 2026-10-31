# Pyodide: misure prima di fissarlo

Misure del 2026-10-31 per una scelta concreta: Python, eseguito con Pyodide,
è l'unico linguaggio del codice (contesto.md, «Formule e script»). Le prime
misure (peso, decimali e dipendenze con il CPython del sistema) le ha fatte
la sottosessione; quelle che eseguono Pyodide, che a lei erano state negate
dal controllo dei permessi, le ha fatte l'orchestratore con l'ok di Alessio.
Script e risultati grezzi in [misure/pyodide/](misure/pyodide/).

## In sintesi

- **Avvio:** circa 3 secondi per ogni istanza di Pyodide, sia a freddo sia a
  caldo. Un'istanza va quindi accesa una volta e tenuta.
- **Calcolo:** veloce una volta avviato. Una formula valuta in circa 5 µs,
  una somma di 100.000 decimali in 14-28 ms.
- **Decimali:** dentro Pyodide i numeri letti come decimali danno gli stessi
  risultati del `runtime`, in 1000 casi su 1000, in Node, Chromium ed
  Electron.
- **Determinismo:** l'impronta di 5000 risultati, decimali e funzioni binarie
  come seno ed esponenziale, è identica in Node 22, Chromium 141 ed
  Electron 44.
- **Isolamento nel browser:** un worker con una CSP senza eval, il modulo `js`
  vuoto e le funzioni di rete tolte isola il codice. Tutte le prove di uscita
  falliscono, e un ciclo infinito si ferma dall'esterno.
- **Isolamento in Node:** in Node Pyodide non isola. Il codice Python legge e
  scrive file e lancia processi; il divieto di eval non basta, e il modello
  dei permessi di Node impedisce a Pyodide di partire.

## La versione

Pyodide 314.0.7, npm `pyodide@314.0.7`, Python 3.14.2, licenza MPL-2.0,
pubblicata il 2026-09-14, l'ultima stabile al 2026-10-31. Sha256 del
pacchetto `66b7949e5a0cba2250b586d7e368bf12fb482800748d182c4618254b685ffaa0`,
ricontrollato dall'orchestratore.

## Peso

| | byte | gzip | brotli |
|---|---|---|---|
| pacchetto npm | 6.488.647 (compresso), 13.879.282 scompattato | | |
| nucleo per eseguire Python con la libreria standard (5 file) | 13.531.207 | 6.338.588 | 5.464.072 |
| di cui il wasm | 9.598.218 | 3.542.413 | 2.741.061 |
| di cui la libreria standard (zip) | 2.545.637 | 2.501.808 | 2.487.479 |

`decimal` è nel nucleo: `_decimal` è compilato nel wasm, e nessun pacchetto
va caricato a parte.

## Avvio e memoria

Il caldo è una seconda istanza nello stesso processo, subito dopo la prima.

| dove | a freddo | a caldo | memoria |
|---|---|---|---|
| Node 22.22, worker_threads | 3,23 s | 2,79 s | processo da 44 a 229 MB con due istanze |
| Chromium 141, Web Worker | 2,88 s | 2,82 s | |
| Electron 44.9.3 (Chromium 152), Web Worker | 4,05 s | 2,85 s | processo della pagina 271 MB |

In tutti i casi la memoria lineare del wasm di un'istanza è di 30 MiB. Un
container Linux a 4 core.

## Esecuzione

Formula `(a * 1.22 - b) / 3` sui decimali, con il contesto della specifica:

| | Node | Chromium | Electron |
|---|---|---|---|
| 1000 volte, con lettura e trasformazione | 176 ms | 216 ms | 179 ms |
| 1000 volte, già compilata | 4,7 ms | 4,7 ms | 4,3 ms |
| somma di 100.000 decimali | 28 ms | 18 ms | 14 ms |
| 100.000 stringhe da JS a Python, somma e ritorno | 297 ms | 101 ms | 92 ms |

## Decimali dentro Pyodide

Il prototipo della sottosessione trasforma con `ast` i numeri letterali in
`Decimal("…")` e valuta con 34 cifre, arrotondamento al pari, Emax 6144 ed
Emin −6143, con le trappole su operazione non valida, divisione per zero e
overflow. In Pyodide, nei tre posti:

- `0.1 + 0.2` dà 0.3, `3830 / 3` dà 1276.666666666666666666666666666667 e
  `1.200 * 2` dà 2.400;
- `9e6144 * 10` solleva Overflow; `1e-6143 / 1e10` dà 1E-6153, un
  subnormale, perché l'underflow non ha la trappola;
- i 5 esempi delle righe di calcolo della specifica (§0.4) danno lo stesso
  `value`;
- 1000 espressioni generate con seme 20261031 danno, su 1000, lo stesso
  `value` di `evaluateMathLine` del `runtime`.

## Determinismo

Ho calcolato lo sha256 di 5000 risultati: le 1000 espressioni decimali, più
`math.sin`, `math.exp`, `math.log1p` e `math.atan2` su 1000 valori binari,
scritti con `repr`. Lo stesso in Node 22, Chromium 141 ed Electron 44:
`db832ba9d71d10b56ab0cb17b85ac446539ad2636b775cdab84993b49cff763f`. È quello
che la ricerca sul linguaggio aspettava dallo stesso binario wasm.

## Isolamento

**Nel browser** (Chromium 141), in un worker servito con la CSP `default-src
'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self';
worker-src 'self'`. Pyodide è caricato con `jsglobals: {}`, e dopo il
caricamento sono tolti `fetch`, `XMLHttpRequest`, `importScripts`,
`WebSocket`, `indexedDB`, `caches` ed `EventSource`. Pyodide parte anche
senza `unsafe-eval`. Le prove dal codice Python:

| prova | risultato |
|---|---|
| `js.fetch` | non c'è |
| `run_js` | bloccato: il modulo `js` è vuoto |
| costruttore `Function` da un oggetto JS | bloccato dalla CSP (EvalError) |
| file dell'host | non ci sono: il file system è in memoria |
| `open_url` | bloccato: niente `XMLHttpRequest` |
| `while True: pass` | la pagina resta libera e termina il worker dopo 1 s |

Senza la CSP la via del costruttore `Function` raggiunge l'oggetto globale
del worker: la CSP senza eval è il pezzo portante.

**In Node 22**, con Pyodide caricato con `jsglobals: {}`:

| prova | Node normale | con `--disallow-code-generation-from-strings` |
|---|---|---|
| costruttore `Function` | riuscito | bloccato |
| leggere un file dell'host | riuscito (/etc/hostname) | bloccato per questa via |
| scrivere un file dell'host | riuscito (un file in /tmp) | bloccato per questa via |
| lanciare un processo | riuscito | bloccato per questa via |
| `pyodide_js.mountNodeFS` | — | riuscito: monta /etc e legge /etc/hostname |

Togliere `pyodide_js` da `sys.modules` non basta: il codice Python cancella
la voce e lo importa di nuovo. Con il modello dei permessi di Node
(`--permission`) Pyodide non parte, perché usa `process.binding` (ERR_ACCESS_DENIED).
La FAQ di Pyodide non dice niente su isolamento o codice non fidato
([faq](https://pyodide.org/en/stable/usage/faq.html), letta il 2026-10-31).

## Dipendenze senza eseguire

Il prototipo della sottosessione legge con `ast` i nomi usati da un codice
ristretto (espressioni, nomi, operatori, funzioni note). Trova i nomi che
mancano e i cicli, e rifiuta `__import__`, `open`, attributi e comprensioni.
Dentro Pyodide dà gli stessi risultati che con CPython.

## Cosa ne segue

- Un'istanza costa circa 3 s e 200-250 MB. Nell'`app` e in `serve` va
  accesa una volta, in sottofondo, e tenuta; un comando della `cli` che
  calcola codice paga l'avvio una volta. Le istantanee della memoria di
  Pyodide potrebbero accorciarlo: non misurate.
- Il codice va eseguito solo in un worker di Chromium con la CSP senza eval,
  anche quando lo chiede il `runtime` dalla `cli`, cioè con Electron, il
  motore che già stampa i PDF. Node non è un confine.
- L'HTML vivo che ricalcola nel browser ha già il confine giusto, se la sua
  CSP permette il worker e `wasm-unsafe-eval` e niente altro.
- Restano da misurare: l'avvio con un'istantanea della memoria, e la memoria
  di più documenti aperti.
