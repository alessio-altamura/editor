# runtime

Il `runtime` da riga di comando, ridotto all'essenziale: legge la cartella di
un documento e stampa il `resolved tree` in JSON, come dice la bozza di
[specifica](../docs/specifica.md) per il `core` e la classe 1. Non fa HTML, PDF
né `format`, e non scrive file.

## Installare

Serve Node 22 o successivo.

```
cd runtime
npm ci
npm run build
```

## Lanciare

```
node dist/src/cli.js resolve-tree <cartella>            # JSON compatto
node dist/src/cli.js resolve-tree <cartella> --pretty   # JSON indentato
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
`tree-limit`; una riga di calcolo con più di 100 parentesi annidate è
`math-line-invalid`.

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

Dipendenze, con versione fissata: `mdast-util-from-markdown` 2.1.0,
`micromark-extension-gfm-table` 2.1.2 e `mdast-util-gfm-table` 2.0.0 (MIT), per
CommonMark con le tabelle di GFM; `yaml` 2.9.1 (ISC); `decimal.js` 10.6.0
(MIT). Per lo sviluppo `typescript` 5.9.3 (Apache-2.0) e `@types/node`,
`@types/mdast`, `micromark-util-types` (MIT). Il parser del CSS è scritto qui: il sottoinsieme è
piccolo.
