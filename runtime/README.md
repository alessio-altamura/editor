# runtime

Il `runtime` da riga di comando, ridotto all'essenziale: legge la cartella di
un documento e stampa il `resolved tree` in JSON, come dice la bozza di
[specifica](../docs/specifica.md) per il `core` e la classe 1, e ne scrive
l'HTML di un `article` (§11.4). Non fa PDF né `format`.

## Installare

Serve Node 22 o successivo. Le dipendenze di sviluppo vogliono di più:
html-validate chiede Node ^22.22.0 o >=24.8.0.

```
cd runtime
npm ci
npm run build
```

## Lanciare

```
node dist/src/cli.js resolve-tree <cartella>            # JSON compatto
node dist/src/cli.js resolve-tree <cartella> --pretty   # JSON indentato
node dist/src/cli.js export <cartella> [--root <id>] [-o <file>] [--allow-errors]
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
'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none';
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
della risoluzione), eredità dal genitore, `computedStyle` sopra. Un valore
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

**Il disegno fisso**, nel `<style>`, senza valori dal documento, senza
selettori di `class`, `!important` né `all:`: un azzeramento su tutti gli
elementi usati (`margin`, `padding`, `border`, `font: inherit`, `color:
inherit`, `text-decoration: none`, `vertical-align: baseline`) e
`text-size-adjust: 100%`; poi `body { padding: 18pt }` sullo schermo, i segni
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
sicurezza, le immagini e il limite di 256 MiB. Il foglio di partenza lo legge
dal blocco del §0.5 della specifica, non da `src/`.

La suite del browser è fuori da `npm test`:

```
npm run test:browser
```

Apre le pagine valide della suite precedente in Chromium, con
`playwright-core`, e confronta `getComputedStyle` delle dodici proprietà con
i valori ricostruiti, più alcuni valori scritti a mano. Il Chromium è quello
di `PLAYWRIGHT_BROWSERS_PATH`; sul Mac si installa con `npx playwright-core
install chromium`.

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

Dipendenze, con versione fissata: `mdast-util-from-markdown` 2.1.0,
`micromark-extension-gfm-table` 2.1.2 e `mdast-util-gfm-table` 2.0.0 (MIT), per
CommonMark con le tabelle di GFM; `yaml` 2.9.1 (ISC); `decimal.js` 10.6.0
(MIT). Per lo sviluppo `typescript` 5.9.3 (Apache-2.0) e `@types/node`,
`@types/mdast`, `micromark-util-types` (MIT); per i test dell'`export`
`parse5` 8.0.1 (MIT), `html-validate` 11.16.2 (MIT) e `playwright-core`
1.56.1 (Apache-2.0), con dipendenze MIT, ISC, BSD e Apache-2.0. Il parser del CSS è scritto qui: il sottoinsieme è
piccolo.
