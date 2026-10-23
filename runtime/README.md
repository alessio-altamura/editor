# runtime

Il `runtime` da riga di comando, ridotto all'essenziale: legge la cartella di
un documento e stampa il `resolved tree` in JSON, come dice la bozza di
[specifica](../docs/specifica.md) per il `core` e la classe 1, e ne scrive
l'HTML di un `article` (§11.4) e il suo PDF (§11.5); `serve` lo tiene acceso
con l'anteprima nel browser (§11.6). Non fa `format`.

## Installare

Serve Node 22 o successivo. Le dipendenze di sviluppo vogliono di più:
html-validate chiede Node ^22.22.0 o >=24.8.0.

```
cd runtime
npm ci
npm run build
```

Per `print` serve il Chromium di `playwright-core` 1.56.1, la versione
141.0.7390.37:

```
npx playwright-core install chromium
```

Se l'ambiente ne ha già uno, `PLAYWRIGHT_BROWSERS_PATH` dice dove sta.

## Lanciare

```
node dist/src/cli.js resolve-tree <cartella>            # JSON compatto
node dist/src/cli.js resolve-tree <cartella> --pretty   # JSON indentato
node dist/src/cli.js resolve-tree <cartella> --positions   # con la sourcePosition di ogni elemento
node dist/src/cli.js export <cartella> [--root <id>] [-o <file>] [--allow-errors] [--theme light|dark]
node dist/src/cli.js print <cartella> [--root <id>] [-o <file>] [--allow-errors]
node dist/src/cli.js serve <cartella> [--port <n>]
node dist/src/cli.js --help
```

Il nome del binario, `doc-runtime`, è provvisorio: con `npm link` il comando
diventa `doc-runtime resolve-tree <cartella>`. Per cambiarlo bastano
`BINARY_NAME` in `src/cli.ts` e `bin` in `package.json`.

Codici di uscita: 0 senza errori (gli avvisi sono ammessi), 1 se l'albero ha
almeno un errore, 2 per un uso sbagliato o una cartella che non si legge, 3
per un errore interno del runtime, senza albero (provvisorio).

I collegamenti simbolici non si seguono, così il runtime non legge niente
fuori dalla cartella: come un file che non è UTF-8 o una sottocartella che non
si legge, danno `syntax`.

Limiti di sicurezza (§11.1): oltre 1000 livelli di `embed` o 100000 `embed`
in tutto l'albero l'`embed` si taglia e non si risolve, con l'errore
`tree-limit`, e lo stesso oltre 50 milioni di caratteri di testo nell'albero
(provvisorio, finché la specifica non fissa il limite); il JSON si scrive su
stdout a pezzi. Una riga di calcolo con più di 100 parentesi annidate è
`math-line-invalid`.

Limite noto: un capoverso molto lungo con molte enfasi è lento da leggere,
dentro micromark; non c'è un limite per questo.

## L'`export`

`export` scrive l'HTML di un `article` su stdout, o con `-o` in un file, che si
scrive in un file temporaneo nella stessa cartella e poi si rinomina. Senza
`--root` la cartella deve avere un solo `article`; con zero o più di uno, o
con un `--root` che non è l'`id` di un `article`, esce con 2 e un messaggio
con gli `id`. Con un errore nell'albero non scrive niente ed esce con 1 (il
file di `-o` non si crea né si tocca); con `--allow-errors` scrive l'HTML ed
esce comunque con 1. Gli avvisi non bloccano. Su stderr, con 0 e 1, un
oggetto JSON con `diagnostics`, nella forma e nell'ordine di `resolve-tree`;
con 2 e 3 un messaggio di testo. Un `-o` che non si può scrivere dà 2. Gli
stessi file danno gli stessi byte, qualunque siano percorso, fuso, lingua e
cartella corrente.

La pagina è un file solo: `<!DOCTYPE html>`, `<html lang>` con la lingua del
documento, nel `<head>` `charset`, una Content Security Policy (`default-src
'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none';
form-action 'none'`), `viewport`, `<title>` (il `title` dell'`article`,
altrimenti l'`id`) e un `<style>` fisso; nel `<body>` l'`article`.

**Le immagini.** Le legge la cli, una volta per percorso, solo se il percorso
è fra i file che il `runtime` ha elencato (niente link simbolici, `..` o
percorsi assoluti): apertura con `O_NOFOLLOW`, `fstat` di un file regolare con
lo stesso dispositivo e inode dell'elenco, al più 64 MiB, in memoria. Il
formato si riconosce dai primi byte, mai dall'estensione: PNG, JPEG, GIF,
WebP, e SVG se, tolto il BOM, è UTF-8 valido e, saltati spazi, `<?xml …?>`,
commenti, istruzioni di elaborazione e un `<!DOCTYPE svg …>` senza parentesi
quadre, il primo tag è `svg` con `xmlns="http://www.w3.org/2000/svg"`. L'SVG
va solo in `<img>`, dove non esegue script. Un'immagine che non si incorpora
dà l'avviso `asset-unsupported` e nella pagina la sua descrizione.

**I valori.** Ogni elemento di un nodo porta in `style` le dodici proprietà
del sottoinsieme, nell'ordine del §0.5, con i valori finali: regole del
foglio di partenza per il tipo (`src/base-stylesheet.ts`, la stessa fonte
della risoluzione), eredità dal genitore, `computedStyle` sopra; nel tema
scuro valgono anche le regole scure del foglio di partenza, e il colore viene
da `darkComputedStyle` invece che da `computedStyle`. Un valore
fuori dalla forma del §0.5 è un errore interno (3). `font-family` si riscrive
con le stringhe CSS. Nel testo e negli altri attributi i caratteri di
controllo (tranne tab e a capo), U+0000, i surrogati isolati e i noncaratteri
diventano U+FFFD, CR diventa LF, poi `& < > " '` diventano `&amp; &lt; &gt;
&quot; &apos;`. `id` solo nella forma del §3, sull'`article` e sul primo
`embed` risolto di ogni oggetto; `class` solo con i nomi validi; `lang` solo
nella forma di un tag di lingua.

**La mappatura**, del `renderer` di riferimento e non normativa:

| Nel `resolved tree` | Nell'HTML |
|---|---|
| `article` | `<article data-kind="article" id lang class>` |
| `title` dell'`article` | `<h1>` |
| `embed` di `text` | `<div data-kind="text" id lang class>` |
| `embed` di `chapter` | `<section data-kind="chapter" id lang class>` |
| `title` di un `chapter` | `<h{min(depth+s, 6)}>` con `<span data-number>` e uno spazio davanti al testo; s = 1 se l'`article` ha il titolo, `aria-level` oltre 6 |
| `embed` con `"recursion": true` | niente |
| `embed` di `image` | `<figure data-kind="image" id lang class>` con `<img src="data:…" alt>`; se non si incorpora, `data-image-fallback="none\|format\|unreadable\|size"` e la descrizione come contenuto |
| `embed` con `unresolved` | `<div data-unresolved class>![[id]]</div>` |
| `embed` di una `directive` | `<div data-kind="{kind}" id lang class>` con la sua `static fallback` |
| `paragraph`, `heading`, `blockquote` | `<p>`, `<h{min(depth, 6)}>`, `<blockquote>` |
| `list`, `listItem` | `<ul>` o `<ol start>`, `<li>` |
| `break`, `thematicBreak` | `<br>`, `<hr>` |
| `code` | `<pre data-lang data-eval data-echo><code>`; con `eval` senza `echo` niente |
| `table`, `tableRow`, `tableCell` | `<table>`, la prima riga in `<thead>` con `<th>`, le altre in `<tbody>` con `<td>`; niente `align` |
| `emphasis`, `strong`, `inlineCode` | `<em>`, `<strong>`, `<code>` |
| `hyperlink` con `ref` | `<a href="#id">` se l'`id` è nella pagina, altrimenti `<a>`; non risolto `<a data-unresolved>` |
| `hyperlink` con `url` | `href` solo se `new URL(url)` riesce con `http:`, `https:` o `mailto:` (si scrive `.href`), o per `#id` nella pagina |
| `mathLine` | `<span data-math-line title="espressione">display</span>`; invalida `<span data-math-line-invalid>` |

L'alt di un'immagine è il testo della descrizione: `display` di una riga di
calcolo valida, l'espressione di una invalida, uno spazio per un a capo e fra
i blocchi.

**I temi.** Senza `--theme` la pagina ha il tema chiaro e quello scuro e
segue quello di chi la apre: al posto del colore letterale ogni elemento di
un nodo porta `color: var(--color); --color-light: …; --color-dark: …`, con
i colori finali dei due temi, e il `<style>` sceglie `--color` con `@media
(prefers-color-scheme: dark)`. `html` ha `color-scheme: light dark` e lo
sfondo `#ffffff`, `#1e1e1e` nel tema scuro. Con `--theme light` o `--theme
dark` i colori sono letterali, quelli del tema, con il suo sfondo e il suo
`color-scheme`; un altro valore è un uso sbagliato (2). Le altre undici
proprietà non cambiano con il tema.

**Il disegno fisso**, nel `<style>`, senza valori dal documento, senza
selettori di `class`, `!important` né `all:`: un azzeramento su tutti gli
elementi usati (`margin`, `padding`, `border`, `font: inherit`, `color:
inherit`, `text-decoration: none`, `vertical-align: baseline`) e
`text-size-adjust: 100%`; lo sfondo e `--color` dei temi, sopra; poi `body { padding: 18pt }` sullo schermo, i segni
degli elenchi (`disc`, `decimal`), `pre-wrap` per `pre`, la linea di `hr`, i
bordi di tabelle e celle, `max-width: 100%` per le immagini e `unicode-bidi:
isolate` per numeri e righe di calcolo. Con `--allow-errors` si aggiunge un
bordo tratteggiato a `[data-unresolved]`.

**Limiti.** Un'immagine si incorpora fino a 64 MiB; l'HTML intero fino a 256
MiB, controllato prima di scrivere il primo byte con un passaggio che conta e
uno che scrive (`export-too-large`, codice 1 anche con `--allow-errors`).
Limiti noti di Chromium, non controllati: non annida oltre 512 elementi, quindi
capitoli molto annidati si vedono appiattiti; valori oltre i suoi limiti,
come `font-size` oltre 7500pt o lunghezze oltre 2^25 px, si tagliano.

**I font di partenza.** `serif`, `sans-serif` e `monospace` si disegnano con
i tre font di `fonts/`, Source Serif 4, Source Sans 3 e Source Code Pro (OFL
1.1; versioni, sha256 e licenze in [fonts/README.md](fonts/README.md)). Nello
`style` una famiglia generica diventa `"Source Serif 4", serif`, e così via;
un nome scritto dall'autore resta com'è. La pagina incorpora come
`@font-face`, con `data:font/woff2`, solo le famiglie e gli stili (tondo o
corsivo) che qualche nodo usa: un primo passaggio sul corpo li trova, senza
scrivere niente. I font contano nei 256 MiB. Pesano da 75 a 429 KB l'uno,
1,25 MB tutti e sei. Sono variabili nel peso da 200 a 900: un peso fuori da
lì si disegna con l'estremo. Non hanno U+FFFD, il carattere che prende il
posto dei controlli: quello lo disegna un font del sistema.

## La stampa

`print` fa l'HTML di `export --theme light` e lo stampa con Chromium, in
`src/print.ts`: A4, margini di 2 cm, sfondi stampati, intestazione vuota e
il numero di pagina in basso al centro, con Source Serif 4. `--root`, `-o`,
`--allow-errors`, il rifiuto con un errore, i limiti e i codici di uscita
sono quelli di `export`; `--theme` non c'è. Senza Chromium, o con una
versione diversa da 141.0.7390.37, esce con 2 e dice come installarlo. Due
stampe della stessa cartella sono uguali, tranne le date che Chromium scrive
nel PDF.

Chromium scrive i font variabili come font Type 3: incorporati, ridotti ai
caratteri usati e con il testo che si copia, ma senza le istruzioni di
hinting di un TrueType.

## L'anteprima

`serve` tiene acceso il `runtime` su una cartella (`src/serve.ts`). Ascolta
solo su 127.0.0.1, su una porta libera o su quella di `--port`, e stampa su
stdout l'indirizzo con un codice d'accesso casuale, `?token=…`: ogni
richiesta HTTP e WebSocket lo deve portare, e un'intestazione `Host` che non
sia `127.0.0.1` o `localhost` con quella porta è rifiutata, contro il DNS
rebinding; altrimenti 403. Si ferma con Ctrl-C. Su stderr scrive il tempo di
ogni ricalcolo.

Guarda la cartella con `fs.watch` ricorsivo; dopo l'ultima modifica di una
raffica aspetta 60 ms e ricalcola tutta la cartella, con le `source
position`. A ogni pagina aperta manda sul WebSocket il nuovo HTML, se è
cambiato; lo script della pagina lo applica con morphdom, che cambia solo gli
elementi diversi, e poi riporta al suo posto il primo elemento di nodo che
comincia nella finestra: la pagina non si ricarica e il punto che si legge
non salta. Se l'`article` non c'è più, la pagina lo dice in cima, e lo toglie
quando torna.

Gli indirizzi: `/` l'indice, con titolo, `id` ed errori e avvisi dei file di
ogni `article`; `/article/<id>` la `preview`; `/asset/<percorso>` un file
della lista del `runtime`, letto come lo legge l'`export` (niente link
simbolici, niente `..`, il formato dai primi byte), altrimenti 404;
`/font/<file>` i font di partenza; `/client.js` e `/morphdom.js` gli script.
Le pagine hanno nell'intestazione HTTP la Content Security Policy
`default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self';
font-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action
'none'; frame-ancestors 'none'`, e `Referrer-Policy: no-referrer`, perché il
codice sta negli indirizzi.

La `preview` è l'HTML dell'`export` in modalità anteprima: due temi, gli
errori segnati come con `--allow-errors`, in cima un `<section
data-diagnostics>` con tutti i `diagnostic` della cartella, immagini e font
come indirizzi, gli script del `runtime` e niente CSP nel file. Ogni elemento
di nodo porta `data-node`, l'`id` dell'oggetto a cui appartiene (per un
`embed` quello dell'oggetto incluso), e `data-source`,
`file:riga:colonna-riga:colonna`, contate come in LSP: righe da 0, colonne
in unità UTF-16, sul file senza BOM. Per un `embed` è la riga `![[id]]`, per
un titolo la riga `title:`. `resolve-tree --positions` scrive le stesse
posizioni nel JSON, come `sourcePosition` negli attributi di ogni elemento.

Tempi misurati qui, Node 22, con le `source position`: il documento
`test/fixtures/export/completo` si ricalcola in 17 ms e la `preview` si
scrive in 5 ms (67 e 12 ms la prima volta); un documento con mille `text`
in 234 ms e 64 ms (576 e 76 ms la prima volta). Dal salvataggio
all'arrivo sul WebSocket passano circa 80 ms per un documento piccolo, 60 di
attesa compresi.

`[[…]]` e `![[…]]` li riconosce un'estensione micromark scritta qui,
`src/wiki-reference.ts`, prima degli altri costrutti in linea (§0.6).

## Test

```
npm test
```

Compila e lancia `test/conformance-suite.ts`, che legge gli esempi da
`docs/specifica.md` a ogni giro, come dice il §0: scrive i file di ogni
esempio in una cartella vuota, aggiunge `doc.document.md` quando l'esempio non
ha un `document file` e non dice `=== no-document`, esegue il comando e
confronta gli alberi come valori JSON, senza `message` e `fix` ma controllando
che ogni errore abbia un `fix`. Controlla anche il codice di uscita. Si può
passare un'altra copia della specifica: `node dist/test/conformance-suite.js
<file.md>`.

Poi lancia `test/robustness-suite.ts`: casi che gli esempi non coprono, come
cicli di `embed`, collegamenti simbolici, file non UTF-8, annidamenti profondi
e chiavi come `__proto__`, ciascuno con il suo controllo sull'albero.

Infine lancia `test/export-suite.ts`, senza browser, sulle cartelle di
`test/fixtures/export/`, con le immagini generate dal test: codici di uscita,
`--root`, `-o`, determinismo (due esecuzioni e una copia altrove, con un altro
fuso e un'altra lingua), html-validate e parse5, un cammino parallelo fra
albero e DOM con tag, attributi, `style` e testo, i collegamenti, la
sicurezza, le immagini e il limite di 256 MiB; le pagine valide nelle tre
forme, con tutti e due i temi, `--theme light` e `--theme dark`. Il foglio
di partenza lo legge dal blocco del §0.5 della specifica, non da `src/`.

La suite del browser è fuori da `npm test`:

```
npm run test:browser
```

Apre le pagine valide della suite precedente in Chromium, con
`playwright-core`, nello schema chiaro e in quello scuro, e confronta
`getComputedStyle` delle dodici proprietà con i valori ricostruiti del tema,
e lo sfondo di `html`, più alcuni valori scritti a mano; controlla anche che i
font di partenza siano caricati e che il testo li usi. Poi
`test/print-suite.ts` stampa due cartelle, una lunga: `%PDF`, pagine A4,
più pagine per quella lunga, i font di partenza incorporati e nessun altro,
due stampe uguali tranne le date, il numero di pagina (con `pdftotext`, se
c'è), il rifiuto con un errore e il codice 2 senza browser. Il Chromium è
quello di `PLAYWRIGHT_BROWSERS_PATH`; sul Mac si installa con `npx
playwright-core install chromium`.

`npm test` lancia anche `test/serve-suite.ts`: avvia `serve` su una cartella
temporanea e controlla il 403 senza codice e con un altro `Host`, l'indice e
la `preview`, l'ascolto solo su 127.0.0.1, il 404 per un file fuori dalla
lista (collegato, nascosto, con `..`), che `data-source` indichi davvero il
testo nel file, e gli aggiornamenti sul WebSocket: una modifica, un errore
che compare nell'elenco e nella pagina e poi sparisce, l'`article` che
sparisce. `npm run test:browser` lancia anche `test/serve-browser-suite.ts`:
nel browser la pagina si aggiorna senza ricaricarsi, e il capoverso che si
legge resta al suo posto anche se il testo sopra cresce.

Solo il typecheck: `npm run typecheck`.

## Com'è fatto

- `src/cli.ts`: la riga di comando.
- `src/resolve-tree.ts`: i passi del §11.1, dalla lista dei file all'albero.
- `src/front-matter.ts`: il `front matter`, letto con lo schema failsafe di
  YAML, così ogni valore è una stringa (§0.6).
- `src/math-line.ts`: le righe di calcolo, in decimale a 34 cifre (§0.4).
- `src/stylesheet.ts`: il sottoinsieme di CSS, il `base stylesheet` e la
  cascata (§0.5); `src/named-colors.ts` ha i nomi dei colori di CSS Color 4.
- `src/content.ts`: gli elementi JsonML del contenuto (§11.3).
- `src/wiki-reference.ts`: il costrutto micromark di `[[…]]` e `![[…]]`.
- `src/json-output.ts`: il JSON scritto a pezzi, compatto o indentato.
- `src/tree.ts`: i tipi del `resolved tree` e le forme di `id`, `class` e
  `lang`, solo tipi e dati.
- `src/base-stylesheet.ts`: il foglio di partenza come dato, unica fonte per
  la risoluzione e per l'`export`.
- `src/static-export.ts`: `staticExport(tree, rootId, assets)`, un generatore
  dei pezzi dell'HTML; importa solo i due moduli precedenti.
- `src/assets.ts`: la lettura delle immagini e il riconoscimento del formato.
- `src/print.ts`: la stampa in PDF con Chromium.
- `src/serve.ts`: il server dell'anteprima, con lo script della pagina.
- `fonts/`: i font di partenza e le loro licenze.

Dipendenze, con versione fissata: `mdast-util-from-markdown` 2.1.0,
`micromark-extension-gfm-table` 2.1.2 e `mdast-util-gfm-table` 2.0.0 (MIT), per
CommonMark con le tabelle di GFM; `yaml` 2.9.1 (ISC); `decimal.js` 10.6.0
(MIT); `playwright-core` 1.56.1 (Apache-2.0) per la stampa; `ws` 8.22.0 e
`morphdom` 2.7.8 (MIT) per l'anteprima. Per lo sviluppo
`typescript` 5.9.3 (Apache-2.0) e `@types/node`, `@types/mdast`,
`@types/ws`, `micromark-util-types` (MIT); per i test dell'`export` `parse5` 8.0.1 (MIT) e
`html-validate` 11.16.2 (MIT), con dipendenze MIT, ISC, BSD e Apache-2.0. Il parser del CSS è scritto qui: il sottoinsieme è
piccolo.
