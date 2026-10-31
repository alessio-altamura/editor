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

`print` stampa con l'Electron del pacchetto, 44.9.3 (Chromium
152.0.7977.167): lo scarica `npm ci`, con il postinstall `install-electron`.
Non serve installare altro, nemmeno sul Mac.

## Lanciare

```
node dist/src/cli.js resolve-tree <cartella>            # JSON compatto
node dist/src/cli.js resolve-tree <cartella> --pretty   # JSON indentato
node dist/src/cli.js resolve-tree <cartella> --positions   # con la sourcePosition di ogni elemento
node dist/src/cli.js export <cartella> [--root <id>] [-o <file>] [--allow-errors] [--theme light|dark]
node dist/src/cli.js print <cartella> [--root <id>] [-o <file>] [--allow-errors]
node dist/src/cli.js serve <cartella> [--port <n>]
node dist/src/cli.js language-server            # LSP su stdin e stdout, per gli editor
node dist/src/cli.js format <cartella> [--check] [--diff]
node dist/src/cli.js create <kind> --in <id> [--after <id> | --before <id>] [--text "…"] [--id <id>] [--asset <file>]
node dist/src/cli.js extract <file della composition>
node dist/src/cli.js rename <id> <nuovo-id>
node dist/src/cli.js move <id> --to <file>
node dist/src/cli.js create <kind> (--at <x>,<y> | --near <id> [--card <nodo>]) [--text "…"] [--id <id>] [--asset <file>]
node dist/src/cli.js recall <id> [--at <x>,<y>]
node dist/src/cli.js place <id> [--at <x>,<y>] [--size <larghezza>,<altezza>] [--card <nodo>]
node dist/src/cli.js archive <id> [--card <nodo>]
node dist/src/cli.js gather <id> [--card <nodo>]
node dist/src/cli.js arrange --by kind|tag
node dist/src/cli.js create collection --field <nome>:<tipo>… (--in <id> | --at <x>,<y> | --near <id>)
node dist/src/cli.js create chart --collection <id> [--template bar|line|point] [--x <campo>] [--y <campo>] [--series <campo>]
node dist/src/cli.js turn-into <id> [--line <riga>] [--type <campo>:<tipo>]… [--key <campo> | --no-key]
node dist/src/cli.js compose <id>… --title "…" [--id <id>]
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

`print` fa l'HTML di `export --theme light` e lo stampa con l'Electron del
pacchetto, lo stesso motore dell'anteprima e dell'app: `src/print.ts` lo
lancia come processo figlio con `src/print-electron.ts`, che carica la
pagina in una finestra nascosta, aspetta i font e chiama
`webContents.printToPDF`: A4, margini di 2 cm, sfondi stampati,
intestazione vuota e il numero di pagina in basso al centro, con Source
Serif 4. La finestra carica solo la pagina, e nient'altro da fuori. Su Linux
gira con `--ozone-platform=headless`, senza schermo e senza `xvfb-run`.
`--root`, `-o`, `--allow-errors`, il rifiuto con un errore, i limiti e i
codici di uscita sono quelli di `export`; `--theme` non c'è. Senza Electron,
o con una versione diversa da 44.9.3, esce con 2 e dice di lanciare `npm ci`;
`DOC_RUNTIME_ELECTRON` indica un altro eseguibile, per le prove. Due stampe
della stessa cartella sono uguali, tranne le date che Chromium scrive nel
PDF.

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
ogni `article`; `/article/<id>` la `preview`; `/object/<id>` un oggetto da
solo (sotto); `/asset/<percorso>` un file
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
come indirizzi, gli script del `runtime` e niente CSP nel file. Un'immagine
che l'`export` non incorporerebbe (formato sconosciuto, illeggibile, oltre
64 MiB) dà la stessa `figure` di ripiego e `asset-unsupported` nell'elenco:
il server la riconosce dai primi byte a ogni ricalcolo, con una cache per
percorso, inode, data di modifica e grandezza, e serve per indirizzo solo le
immagini riconosciute. Ogni elemento
di nodo porta `data-node`, l'`id` dell'oggetto a cui appartiene (per un
`embed` quello dell'oggetto incluso), e `data-source`,
`file:riga:colonna-riga:colonna`, contate come in LSP: righe da 0, colonne
in unità UTF-16, sul file senza BOM. Per un `embed` è la riga `![[id]]`, per
un titolo la riga `title:`. `resolve-tree --positions` scrive le stesse
posizioni nel JSON, come `sourcePosition` negli attributi di ogni elemento.

Un oggetto da solo (`src/standalone.ts`): per ogni oggetto chiesto un
`article` in memoria, mai scritto, senza titolo e con il foglio di partenza,
lo include da solo con `![[id]]`; una sola risoluzione li calcola tutti, e il
renderer dell'`export` li scrive come gli altri. Un `article` per oggetto, e
non uno per tutti, perché la numerazione conta come nell'oggetto da solo: due
`chapter` sul `canvas` sono «1» tutti e due, e i loro sotto-capitoli «1.1». `/object/<id>` è questa
pagina, con lo stesso script e gli aggiornamenti sul WebSocket; le schede
del `canvas` dell'`app` usano lo stesso HTML, per tutti gli oggetti del
`canvas` in una risoluzione. Un oggetto che non si può includere (un
`concept`, un `article`) non ha pagina.

Tempi misurati qui, Node 22, con le `source position`: il documento
`test/fixtures/export/completo` si ricalcola in 17 ms e la `preview` si
scrive in 5 ms (67 e 12 ms la prima volta); un documento con mille `text`
in 234 ms e 64 ms (576 e 76 ms la prima volta). Dal salvataggio
all'arrivo sul WebSocket passano circa 80 ms per un documento piccolo, 60 di
attesa compresi.

## Il formatter

`format` (`src/format.ts`) riscrive i file nella forma canonica della
specifica (§11.8): codifica, `front matter` (ordine delle chiavi, `tags:
[]`, virgolette solo dove servono), `attribute line`, `---` per le righe di
separazione, una riga vuota fra i blocchi. Non tocca il dentro dei blocchi:
li ricopia com'erano, prendendo i blocchi di primo livello da mdast. Solo i
file sorgente: `*.<kind>.md`, `*.stylesheet.css` e `retired-ids.yaml`, per
gli ultimi due solo la codifica. Prima di scrivere ricalcola l'albero con i
testi nuovi (con l'opzione `overlay` di `resolveTree`) e lo confronta con
quello di prima, come valori JSON: un file che lo cambierebbe resta com'è,
con un messaggio su stderr. Scrive con un file temporaneo e una rinomina.
`--check` esce con 1 se qualcosa cambierebbe, `--diff` stampa le differenze
(`src/diff.ts`); nessuno dei due scrive.

## Le operazioni

`create`, `extract`, `rename` e `move` (`src/operations.ts`, §11.9)
calcolano un piano: il testo nuovo di ogni file toccato, i file da
cancellare, gli asset da copiare. Il piano passa dal formatter, poi il
`runtime` ricalcola l'albero con i testi nuovi (con l'opzione `overlay` di
`resolveTree`, dove `null` toglie un file) e conta gli errori per codice e
`target`: se ce n'è uno in più, non scrive niente, stampa i `diagnostic`
nuovi su stderr ed esce con 1. Altrimenti scrive i file con un file
temporaneo e una rinomina, poi cancella, e stampa su stdout un riassunto
JSON (`operation`, i dati dell'operazione, `written`, `deleted`, `copied`).
Con `--dry-run` non scrive, e il riassunto ha `dryRun: true` e `diff`. La
cartella del documento è quella di `--folder`, o la più vicina con un
`document file`, risalendo dalla cartella corrente o, per `extract`, da
quella del file. Una richiesta impossibile (un `id` che non c'è o già
preso, un file di arrivo di un altro `kind`) esce con 2.

Le operazioni del `canvas` (`src/canvas.ts`, §0.11 e §11.9) scrivono il
`canvas file`, un JSON Canvas 1.0 con il suo descrittore di `kind`
`canvas-file`: `create --at` crea un oggetto con il suo nodo (un `text` nel
file dei testi del `canvas`, `foglio-texts.text.md`), `recall` mette sul
`canvas` una `card` di un oggetto, anche se ne ha già altre, `place` sposta
una `card`, `archive` la toglie con i suoi archi, `compose` fa un `article`
con gli oggetti nell'ordine dato, due `embed` se un oggetto c'è due volte.
Le `card` dello stesso oggetto sono tutte lo stesso oggetto; con più di una,
`place`, `archive`, `gather` e `create --near` vogliono `--card` con l'`id`
del nodo, altrimenti escono con 2.

Mettere ordine (`src/canvas-layout.ts`, la geometria senza file, e
`src/canvas.ts`). Quando una `card` si mette, si crea o cambia misura
(`create --at`, `create --near`, `recall`, `place` con `--at` o `--size`),
i nodi che la coprono si spostano per la strada più corta, a 40 di
distanza, e spingono nella stessa direzione quelli che coprono a loro volta;
un `canvas group` (un nodo `group`) si sposta con i nodi che contiene, e
quando una `card` gli fa spazio dentro si allarga e fa spazio fuori. Il
riassunto elenca in `moved` i nodi spostati. Le stesse posizioni danno lo
stesso risultato. `create --near` mette la `card` nuova a destra o sotto,
dove copre meno. `gather` porta intorno a una `card` gli oggetti legati
(`[[…]]` e `![[…]]` nei due sensi, `association`): la `card` più vicina di
ciascuno, o una nuova. `arrange --by kind|tag` fa un gruppo per `kind` o per
tag, con le `card` in griglia nell'ordine del `navigator`; i gruppi fatti da
un `arrange` precedente, riconosciuti dalla chiave `arrange` nel nodo, si
rifanno, quelli fatti a mano restano. Un oggetto è un nodo `file` con il percorso del suo file, e per un
oggetto di un `multi-object file` `subpath` `"#<id>"`; `rename` e `move`
riscrivono i nodi che nominano l'oggetto. Un documento senza `canvas file`
ne riceve uno alla prima operazione: `foglio.canvas` e
`foglio.canvas-file.md`. Il `.canvas` si scrive con le tabulazioni, come lo
scrive Obsidian, e le chiavi che il `runtime` non conosce restano.
`readingOrder` dà l'ordine di lettura di alcuni nodi, dall'alto in basso e
poi da sinistra a destra, per l'`app`.

Il language server offre le stesse operazioni sui buffer aperti:
`textDocument/rename` su un `[[id]]` o `![[id]]` (o sull'oggetto del file) e
la code action «Estrai in un oggetto» sull'errore `composition-content`.
Restituiscono una WorkspaceEdit, con i file creati, sostituiti per intero o
cancellati, così l'editor la applica e la può annullare.

## Le `collection` (classe 2)

Una `collection` (§12 della specifica) è un `descriptor`
`<id>.collection.md` e un file di dati `.tsv` o `.csv`. Lo `schema` sta
nell'intestazione del `descriptor`, in YAML, con i nomi di Frictionless
(`fields` con `name`, `type`, `title`, `categories`, `decimalChar`,
`groupChar`, `trueValues`, `falseValues`; `primaryKey`; `missingValues`;
`dialect`); il lettore dell'intestazione (`src/front-matter.ts`) ammette
mappe e liste di mappe solo per queste chiavi, e il `formatter` le riscrive
in blocchi.

`src/collection.ts` legge lo `schema` e il file, senza file e senza albero:
un TSV ha un `record` per riga, senza virgolette; un CSV segue RFC 4180. Ogni
valore si legge con il suo tipo (`string`, `number`, `integer`, `boolean`,
`date`, `datetime`, `time`, `year`, `yearmonth`; gli altri tipi di
Frictionless si mostrano come scritti, con un avviso); `columnDisplays`
scrive i numeri di una colonna con i decimali fissi. `src/resolve-tree.ts`
mette i `diagnostic` dei dati sul file di dati, con il range del punto, e fa
del contenuto la descrizione e una `table` con il valore tipizzato e la
stringa di ogni cella; l'`embed` ha un `number` della sequenza delle
`collection`, per i `cross-ref`. I limiti nuovi: 16 MiB e 100 000 `record`.

Nell'HTML la tabella ha la descrizione in un `<caption data-description>`
nascosto, letto dagli screen reader; nel PDF non si vede e non è testo
(un PDF con i tag è da fare). Senza dati la
`collection` è una `figure` con la descrizione, come un'`image` di ripiego.

`src/collection-operations.ts` ha le operazioni: `create collection --field`
(un `descriptor` e un TSV con la sola intestazione) e `turn-into`, da un
`text` che è una tabella (stesso `id`, il `text` sparisce) o da una tabella
di uno `scratch` (un `id` nuovo e un collegamento al posto della tabella),
con tipi e chiave proposti dai valori e il punto decimale nel TSV; nel
language server è l'azione «Trasforma in collection».

## I grafici (classe 3)

Un `chart` (§13 della specifica) è un file `<id>.chart.md`: nell'intestazione
il `template` (`bar`, `line` o `point`), la `collection` come `"[[id]]"`, un
`field` per ogni ruolo (`x`, `y`, `series`) e un `filter` facoltativo per
uguaglianza; nel corpo la descrizione. `src/chart.ts` controlla i ruoli sui
tipi dei `field` (la quantità vuole `number` o `integer`; un `bar` con la
quantità su `x` è orizzontale), propone i ruoli che mancano dai tipi, tiene i
`record` filtrati e traduce tutto in una specifica Vega-Lite. Vega la
disegna in SVG senza canvas e in modo sincrono, con il renderer a stringa
impostato come fa l'export SVG di Vega; lo stesso disegno si fa una volta
sola finché il documento è aperto. I numeri degli assi passano da
`docNumber`, una funzione di formato registrata in Vega, con le regole del
`display` (§0.4).

`src/resolve-tree.ts` mette nel contenuto del `chart` un elemento `chart` con
`template`, ruoli e `values`; con l'opzione `drawings` (sempre per
`export`, `print`, l'anteprima e le schede; `resolve-tree --drawings`)
anche `drawing`, l'SVG nei due temi, fatto nel passo degli stili: il testo
ha il colore dell'`embed`, i segni quello del tipo `chart` dello
`stylesheet`. Grafici e immagini condividono la numerazione delle figure.
`src/static-export.ts` mette l'SVG in una `figure`, con `role="img"` e la
descrizione come nome, i due temi scelti da una regola `@media`; senza
disegno la `figure` ha la descrizione.

`src/chart-operations.ts` ha `create chart`: i ruoli che mancano proposti,
il `template` dai tipi, l'`id` da «y per x», il file accanto alla
`collection` se non ha un posto. `rename`, `move` e il `formatter` valgono
anche per i `chart`.

## Il language server

`language-server` parla LSP su stdin e stdout (`src/language-server.ts`),
con `vscode-languageserver`: la libreria fa l'incorniciatura dei messaggi,
la sincronizzazione dei buffer e i tipi del protocollo, che scritti a mano
sarebbero più codice da tenere. Usa lo stesso nucleo acceso di `serve`
(`src/live.ts`): la cartella del documento è la workspace folder, se ha un
`document file`, altrimenti la cartella più vicina, risalendo dal primo file
aperto, che ne ha uno; i buffer aperti valgono al posto dei file su disco
finché restano aperti, e ogni modifica, nell'editor o su disco, ricalcola
dopo 60 ms. Non scrive file da sé: `rename` e «Estrai in un oggetto» tornano
all'editor come modifiche da applicare.

- I diagnostic per file, con il range: la n-esima occorrenza del `target`,
  dentro `[[…]]` se c'è; senza `target`, o se non si trova, l'intestazione o
  l'inizio del file. `resolve-tree --positions` scrive lo stesso `range` nei
  `diagnostic`; un `diagnostic` della cartella (`.`) non ne ha.
- Il completamento degli `id` dopo `[[` e `![[`, con `kind` e titolo o
  prime parole; dopo `![[` niente `concept`, `scratch`, `article`, `deck`,
  `stylesheet`, `canvas-file`, né il file stesso.
- La definizione di un `[[id]]` o `![[id]]` (l'inizio del file), l'hover
  (`kind` e titolo o primo testo; su una riga di calcolo `display` e
  valore), i riferimenti (chi include o collega l'`id` sotto il cursore, o
  quello del file).

Il client per VS Code sta in [../editors/vscode](../editors/vscode/README.md).

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
e chiavi come `__proto__`, ciascuno con il suo controllo sull'albero; e il
lettore dei dati delle `collection`: virgolette del CSV, una virgoletta non
chiusa, CRLF e BOM, colonne sbagliate e virgolette nel TSV, un file non
UTF-8, colonne mancanti o in più, il limite di 16 MiB.

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

Apre le pagine valide della suite precedente nel Chromium di Electron, il
motore dell'anteprima, dell'app e della stampa, guidato con l'`_electron` di
`playwright-core` (`test/electron-browser.ts`, in headless, senza schermo),
nello schema chiaro e in quello scuro, e confronta
`getComputedStyle` delle dodici proprietà con i valori ricostruiti del tema,
e lo sfondo di `html`, più alcuni valori scritti a mano; controlla anche che i
font di partenza siano caricati e che il testo li usi, e in una `collection`
i numeri allineati a destra con i decimali fissi, le cifre sullo stesso
bordo, l'intestazione in grassetto e il `caption` nascosto. Poi
`test/print-suite.ts` stampa due cartelle, una lunga: `%PDF`, pagine A4,
più pagine per quella lunga, i font di partenza incorporati e nessun altro,
due stampe uguali tranne le date, il numero di pagina (con `pdftotext`, se
c'è), il rifiuto con un errore e il codice 2 senza Electron. Non serve un
browser a parte: basta `npm ci`.

`npm test` lancia anche `test/serve-suite.ts`: avvia `serve` su una cartella
temporanea e controlla il 403 senza codice e con un altro `Host`, l'indice e
la `preview`, l'ascolto solo su 127.0.0.1, il 404 per un file fuori dalla
lista (collegato, nascosto, con `..`), che `data-source` indichi davvero il
testo nel file, e gli aggiornamenti sul WebSocket: una modifica, un errore
che compare nell'elenco e nella pagina e poi sparisce, l'`article` che
sparisce. `npm run test:browser` lancia anche `test/serve-browser-suite.ts`:
nel browser la pagina si aggiorna senza ricaricarsi, e il capoverso che si
legge resta al suo posto anche se il testo sopra cresce.

`test/format-suite.ts`, in `npm test`, formatta ogni esempio della specifica
(in processo, per la velocità) e ogni cartella di `test/fixtures/export` (con
la cli): l'albero resta uguale, un secondo passaggio non cambia niente,
`--check` e `--diff` non scrivono e dicono gli stessi file; più alcuni file
scritti apposta, con l'atteso a mano. `test/operations-suite.ts` prova le operazioni con la cli, prima con
`--dry-run` (non scrive) e poi davvero: `extract` in ordine con gli `id`
dalle prime parole, accenti tolti; `create` dopo e prima di un `embed`, con
il suffisso `-2`, un `image` con la copia dell'asset, un `concept` rifiutato
per `embed-kind` senza scrivere niente, un `id` preso o ritirato rifiutato;
`rename` che aggiorna testo, `embed`, attributi e `associations` ma non il
codice, e scrive `retired-ids.yaml`; `move` nei due sensi con l'albero
uguale tranne `file`, e il file svuotato che si cancella; le operazioni del
`canvas`: il `canvas file` creato alla prima, valido secondo JSON Canvas 1.0
(`id` unici, interi, `subpath` con `#`), un `subpath` che non si risolve,
`recall` e `place` con e senza `--at`, i nodi che seguono `move` e `rename`,
due `card` dello stesso oggetto (`--card` richiesto, `place` e `archive` di
una sola, `compose` con due `embed`), `archive`, e `compose` che dà un `article` senza errori nell'ordine dato e
si rifiuta con un `concept`; mettere ordine, in una cartella sua: fare spazio
con gli spostamenti più corti attesi, senza sovrapposizioni e uguale due
volte, dentro un gruppo che si allarga e con `--size`, `create --near`,
`gather` con legami nei due sensi e `card` già presenti (la più vicina) o
richiamate, `arrange` per `kind` e per tag, rifatto, con il gruppo fatto a
mano che resta, e il JSON Canvas valido con i gruppi; le `collection`, in
una cartella loro: `create collection` (e senza `--field`), `turn-into` da un
`text` (stesso `id`, `embed` e `cross-ref` validi, il punto nel TSV, tipi e
chiave proposti) e da uno `scratch` (niente chiave con un `record` ripetuto,
il collegamento al posto della tabella), il rifiuto di una chiave ripetuta,
`rename` e `move`; alla fine i file sono già canonici. Nella suite del
language server, l'azione «Trasforma in collection» sulla tabella sotto il
cursore. `npm test` lancia infine `test/language-server-suite.ts`, che parla JSON-RPC
su stdio con il server: `initialize`; un errore in un buffer aperto, con il
range giusto, e i diagnostic vuoti quando un `didChange` lo corregge; il
completamento dopo `![[` e `[[`; la definizione, l'hover su un `id` e su una
riga di calcolo, i riferimenti; `shutdown` ed `exit` con codice 0.

Solo il typecheck: `npm run typecheck`.

`npm run measure:records` misura una `collection` di 100 000 `record`: il
ricalcolo della cartella e l'HTML della `preview`, con i 1000 `record` che
la `preview` tiene (§11.6) e con tutti, come l'`export`. Il 2026-10-30, in un
contenitore Linux a 4 core: ricalcolo 0,6-0,9 s e HTML 0,2 s (1,8 MB) con il
taglio; senza, ricalcolo 4,7 s e HTML 19 s (179 MB). Prima di questo passo
il ricalcolo era di 12-13 s.

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
- `src/print.ts` e `src/print-electron.ts`: la stampa in PDF con Electron.
- `src/serve.ts`: il server dell'anteprima, con lo script della pagina.
- `src/live.ts`: il `runtime` acceso su una cartella, per `serve` e il
  language server.
- `src/language-server.ts`: il language server.
- `src/collection.ts`: lo `schema` e la lettura dei dati di una
  `collection`; `src/collection-operations.ts`: `create collection` e
  `turn-into`.
- `src/chart.ts`: i ruoli di un `chart`, la specifica Vega-Lite e il
  disegno; `src/chart-operations.ts`: `create chart`.
- `src/operations.ts`: le operazioni; `src/canvas.ts`: quelle del `canvas`;
  `src/canvas-layout.ts`: gruppi e fare spazio, solo geometria.
- `src/standalone.ts`: un oggetto da solo, per `/object/<id>` e le schede.
- `src/format.ts` e `src/diff.ts`: il formatter e le differenze;
  `src/attribute-line.ts`: la `attribute line` dei `multi-object file`.
- `fonts/`: i font di partenza e le loro licenze.

Dipendenze, con versione fissata: `mdast-util-from-markdown` 2.1.0,
`micromark-extension-gfm-table` 2.1.2 e `mdast-util-gfm-table` 2.0.0 (MIT), per
CommonMark con le tabelle di GFM; `yaml` 2.9.1 (ISC); `decimal.js` 10.6.0
(MIT); `electron` 44.9.3 (MIT) per la stampa; `ws` 8.22.0 e
`morphdom` 2.7.8 (MIT) per l'anteprima; `vscode-languageserver` 10.1.2 e
`vscode-languageserver-textdocument` 1.0.15 (MIT) per il language server;
`vega` 6.4.0 e `vega-lite` 6.5.0 (BSD-3-Clause) per i grafici, solo nel
`runtime`: l'HTML e il PDF hanno solo l'SVG. Per lo sviluppo
`typescript` 5.9.3 (Apache-2.0) e `@types/node`, `@types/mdast`,
`@types/ws`, `micromark-util-types` (MIT); per i test `playwright-core` 1.56.1 (Apache-2.0), che guida Electron, e per quelli dell'`export` `parse5` 8.0.1 (MIT) e
`html-validate` 11.16.2 (MIT), con dipendenze MIT, ISC, BSD e Apache-2.0. Il parser del CSS è scritto qui: il sottoinsieme è
piccolo.
