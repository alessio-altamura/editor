# Sintassi dei file di testo: CommonMark o Djot

Ricerca del 2026-10-20 per la scelta APERTA nella
[specifica](../specifica.md), §0.6. Domanda: per i file di testo (`concept`,
`text`, `composition`), CommonMark con un'intestazione per gli attributi,
oppure Djot? La nota non sceglie: dà i fatti e i costi.

I fatti vengono da fonti primarie: specifiche, repository ufficiali, registry
npm, documentazione dei prodotti. Alcuni sono prove eseguite con i pacchetti
installati in locale, e sono segnati come prove: Node 22 con `@djot/djot`
0.3.2, `remark` 15.0.1 (remark-parse 11.0.0, remark-stringify 11.0.0) con
`remark-frontmatter` 5.0.0, `prettier` 3.9.10 (`prettier --parser
markdown`), `commonmark` 0.31.2 e `markdown-it` 15.0.3. Un secondo agente ha
ricontrollato diciassette fatti sulla fonte, e una revisione successiva ne ha
corretti e aggiunti altri; le correzioni sono elencate in fondo. Le inferenze
sono nell'ultima sezione.

## In sintesi

- **Stabilità.** CommonMark è alla 0.31.2 del gennaio 2024, senza una 1.0 ma
  con implementazioni mature. Djot si dichiara non ancora stabile, è alla
  sintassi 0.2 del 2022, e la sua unica implementazione TypeScript non ha
  release su npm dal dicembre 2024, anche se il repository riceve commit. Le
  specifiche e le implementazioni di riferimento sono di John MacFarlane;
  anche le librerie più usate in JavaScript hanno un solo manutentore su npm.
- **Attributi.** Djot li ha nativi, uguali su blocchi e testo in linea. In
  CommonMark non esistono: servono un'estensione (markdown-it-attrs, le
  direttive di remark, gli attributi di Pandoc) e un'intestazione YAML, che
  la spec non definisce.
- **Intestazione.** Il front matter YAML è una convenzione diffusa fuori
  dalla spec (GitHub, Obsidian, Pandoc, remark). Djot non ha front matter: la
  questione è aperta dal 2022.
- **GitHub e gli editor.** GitHub rende i `.md` e mostra il front matter come
  tabella, ma toglie `class` e `id` dall'HTML. Djot non è riconosciuto da
  GitHub. VS Code e JetBrains si basano su CommonMark; per Djot esistono
  estensioni di terzi.
- **Commenti e formatter.** Per CommonMark, prettier conserva commenti HTML,
  front matter, attributi in graffe e `![[id]]`, normalizza il resto ed è
  idempotente nella prova; remark invece riscrive `![[id]]` come
  `!\[\[id]]`. Per Djot, `renderDjot` di djot.js riscrive il sorgente ma
  perde i commenti. Le regole proprie (attributi, `embed`, intestazione)
  vanno comunque aggiunte al `formatter` scelto.

## Stato delle specifiche

- **CommonMark.** Versione 0.31.2 del 2024-01-28, di John MacFarlane, con
  licenza CC-BY-SA 4.0; non esiste una 1.0
  ([spec](https://spec.commonmark.org/),
  [spec.txt](https://github.com/commonmark/commonmark-spec)). Il repository
  riceve ancora commit, l'ultimo il 2026-10-10, ma senza nuove versioni (prova:
  git log). Fra le decisioni di contesto.md, Markdown compare fra i
  riferimenti da cui il progetto si distingue: «in contrapposizione a Word,
  LaTeX e Markdown».
- **GFM.** La spec di GitHub è la 0.29-gfm del 2019-04-06, costruita sopra
  CommonMark ([gfm](https://github.github.com/gfm/)).
- **Djot.** La pagina ufficiale dice «Djot isn't completely stable yet, minor
  future changes to the syntax are expected», e «The official JavaScript
  implementation is complete and ready for use» ([djot.net](https://djot.net/)).
  Il changelog della sintassi ha la 0.1 (2022-07-30), la 0.2 (2022-12-05) e
  una sezione non rilasciata
  ([changelog](https://github.com/jgm/djot/blob/main/changelog.md)). Licenza
  MIT, copyright John MacFarlane; il README dice che «current development is
  focused on djot.js» ([jgm/djot](https://github.com/jgm/djot)).

## Implementazioni in TypeScript e JavaScript

Versioni e date dal registry npm (`registry.npmjs.org/<nome>`).

| Pacchetto | Ultima versione | Licenza | Note |
|---|---|---|---|
| `commonmark` (commonmark.js) | 0.31.2, 2024-09-19 | BSD-2-Clause | implementazione di riferimento; commit fino al 2026-10 |
| `markdown-it` | 15.0.3, 2026-10-16 | MIT | usato da VS Code; la 15.0.0 è del 2026-07 |
| `micromark`, `mdast-util-from-markdown`, `mdast-util-to-markdown` | 4.0.3, 2.1.0, 2.2.0, tutti 2026 | MIT | ecosistema unified |
| `remark-frontmatter` | 5.0.0, 2023-09-18 | MIT | front matter come nodo `yaml` |
| `remark-directive` | 4.0.0, 2025-02-27 | MIT | direttive generiche |
| `markdown-it-attrs` | 5.0.1, 2026-07-27 | MIT | attributi in stile Pandoc |
| `@djot/djot` (djot.js) | 0.3.2, 2024-12-19 | MIT | scritto in TypeScript; commit fino al 2026-10 (fra cui «Fix autolink parsing», 2026-10-09), nessuna release su npm dopo la 0.3.2 |

Manutentori su npm (prova: `npm view <nome> maintainers`): uno solo per
`micromark`, `markdown-it`, `markdown-it-attrs`, `commonmark` e `@djot/djot`,
e per questi ultimi due è lo stesso account; più di dieci per `prettier`.

Il README di Djot elenca sette implementazioni (JavaScript, Lua, Prolog, PHP,
Rust, Go, Haskell); in JavaScript o TypeScript c'è solo djot.js
([implementations](https://github.com/jgm/djot#implementations)).

## Attributi

- **Djot** li ha nativi ([syntax.md](https://github.com/jgm/djot/blob/main/doc/syntax.md)):
  - in linea, fra graffe, e «must *immediately follow* the inline element»:
    `.foo` è una classe, `#foo` un identificatore, `key="value"` una coppia;
    le virgolette si possono omettere per i valori semplici;
  - sui blocchi, «on the line immediately before the block»;
  - un div si apre con `:::` seguito al più da un nome di classe, e gli altri
    attributi vanno sulla riga prima; uno span è testo fra quadre seguito da
    attributi, `[read the manual]{.big .red}`;
  - i valori degli attributi sono stringhe: per le liste (`tags`,
    `associations`, `replaces`) serve una convenzione, per esempio valori
    separati da spazi. Nella prova `tags="vendite q3"` arriva nell'AST come la
    stringa `"vendite q3"`.
- **CommonMark** non ha una sintassi per gli attributi: nella spec la parola
  compare per l'HTML grezzo, per l'`alt` delle immagini e per la classe che
  la prima parola dell'info string di un blocco di codice dà di solito
  nell'HTML
  ([spec.txt](https://github.com/commonmark/commonmark-spec)). Le estensioni:
  - markdown-it-attrs: `{.class #identifier attr=value}` in fondo al blocco o
    subito dopo l'elemento in linea
    ([README](https://github.com/arve0/markdown-it-attrs));
  - la proposta «generic directives» del 2014, mai entrata nella spec:
    `:name[testo]{k=v}`, `::name[...]{...}`, `:::name ... :::`
    ([talk.commonmark.org](https://talk.commonmark.org/t/generic-directives-plugins-syntax/444));
    remark-directive la implementa
    ([README](https://github.com/remarkjs/remark-directive));
  - Pandoc: `header_attributes`, `attributes` (per qualunque elemento, con il
    lettore commonmark), `bracketed_spans` e `fenced_divs`
    ([MANUAL](https://github.com/jgm/pandoc/blob/main/MANUAL.txt));
  - MyST, «a superset of CommonMark», con direttive in recinti di due punti
    (`:::{name}`) o di backtick, e ruoli in linea ([sintassi](https://mystmd.org/guide/syntax-overview)).

## Intestazione (front matter)

- La spec CommonMark non nomina né front matter né metadati. Sul forum di
  CommonMark, il 2016-09-22, un partecipante sposta la discussione fra le
  estensioni «since front matter is not amongst the planned features for
  1.0», e il giorno dopo MacFarlane scrive «Front matter is not going to be
  part of the spec.»
  ([forum](https://talk.commonmark.org/t/front-matter-best-practice/2235)).
- Pandoc definisce il blocco YAML: «delimited by a line of three hyphens
  (`---`) at the top and a line of three hyphens (`---`) or three dots
  (`...`) at the bottom»
  ([MANUAL](https://github.com/jgm/pandoc/blob/main/MANUAL.txt)).
- Obsidian: «Properties are stored in YAML format at the top of the file»
  ([help](https://obsidian.md/help/properties)).
- remark-frontmatter e markdown-it-front-matter (0.2.4, MIT) lo leggono; con
  remark diventa un nodo `yaml` con la sua posizione (prova).
- Djot non ha front matter. La issue
  [jgm/djot#35](https://github.com/jgm/djot/issues/35), «Metadata», è aperta
  dal 2022-07-31. MacFarlane vi chiede: «Should there be a built-in format for
  metadata, or should that be considered distinct from the markup syntax?».
  Le proposte principali: un blocco `+++` (uvtc, 2022-08-05), un blocco di
  attributi in testa seguito da una riga vuota (matklad, 2022-11-03), il
  blocco grezzo (pranabekka, 2026-04-01). Il 2026-04-02 MacFarlane risponde
  che con il blocco grezzo «there are goals this would not allow one to
  achieve». Nessuna proposta è adottata.

## GitHub e gli editor

- **GitHub.** github/markup rende i `.md` con commonmarker (il primo di una
  lista di librerie di ripiego), e Djot non è fra
  i formati. La sanitizzazione toglie fra l'altro gli attributi `class` e
  `id` dall'HTML ([github/markup](https://github.com/github/markup)). Il front
  matter YAML appare come tabella orizzontale
  ([blog, 2013](https://github.blog/news-insights/product-news/viewing-yaml-metadata-in-your-documents/)).
  In github/linguist non c'è una voce Djot né l'estensione `.dj`
  ([languages.yml](https://github.com/github/linguist/blob/main/lib/linguist/languages.yml)).
- **Estensioni dei file.** Djot indica `.djot` o `.dj`, senza un tipo MIME
  ufficiale, e si può usare `text/x-djot` ([jgm/djot](https://github.com/jgm/djot)).
- **VS Code.** «VS Code targets the CommonMark Markdown specification using
  the markdown-it library»
  ([docs](https://code.visualstudio.com/docs/languages/markdown)).
- **JetBrains.** Il plugin Markdown, incluso e attivo, si basa sulla spec
  CommonMark ([help](https://www.jetbrains.com/help/idea/markdown.html)).
- **Djot negli editor.** Il README di Djot elenca estensioni per VS Code e
  JetBrains, file per Vim ed Emacs, evidenziazione in Helix e Zed e una
  grammatica tree-sitter. Le estensioni non sono state verificate una per una.

## Commenti, formatter e albero di sintassi

- **Commenti.** CommonMark ha come commenti solo i commenti HTML, cioè HTML
  grezzo ([spec.txt](https://github.com/commonmark/commonmark-spec)). Per uso
  si scrive anche `[//]: # (testo)`, che è una definizione di riferimento mai
  usata: nella prova remark la legge come nodo `definition`, e prettier la
  riscrive `[//]: # "testo"`. In Djot:
  «Material between two `%` characters in an attribute will be ignored and
  treated as a comment», e un commento a sé si scrive `{% ... %}`
  ([syntax.md](https://github.com/jgm/djot/blob/main/doc/syntax.md)).
- **Posizioni nel sorgente.** mdast dà a ogni nodo una `position` con riga,
  colonna e offset (prova). djot.js ha l'opzione `sourcePositions`, che mette
  inizio e fine nell'AST ([README](https://github.com/jgm/djot.js)).
  commonmark.js dà `sourcepos` solo ai blocchi; markdown-it solo l'intervallo
  di righe dei blocchi (prove).
- **Riscrittura.** djot.js ha `renderDjot`, che riscrive Djot
  ([README](https://github.com/jgm/djot.js)); remark ha remark-stringify;
  prettier formatta il Markdown (3.9.10, MIT).
- **Prove sul giro lettura e riscrittura.**
  - djot.js: i commenti `{% ... %}` spariscono dall'AST e dall'output, anche
    dentro gli attributi (`{#id % c %}` diventa `{#id}`); un div `::: warning`
    diventa `{.warning}` sulla riga prima di `:::`; `k=v` diventa `k="v"`; un
    blocco di attributi senza un blocco dopo sparisce; un titolo viene avvolto
    in un nodo `section`.
  - remark con frontmatter: il commento HTML resta come nodo `html` e il
    front matter resta; `![[id]]` diventa `!\[\[id]]`; un a capo morbido
    resta `\n` dentro il testo.
  - prettier: conserva commenti HTML, front matter, `{.c #i}` in un titolo e
    `![[id]]`; cambia `*uno*` in `_uno_`; una seconda passata non cambia nulla.

## Correzioni del secondo controllo

Il secondo agente ha confermato i diciassette fatti che gli erano stati dati,
con due correzioni e alcune precisazioni. La revisione dell'orchestratore ha
poi trovato errori e omissioni, ricontrollati con le prove sopra; dove non è
stato possibile, è detto. Tutto è già applicato sopra:
- la frase sul front matter nel forum di CommonMark non è una decisione della
  spec ma il motivo di uno spostamento fra le estensioni; la posizione di
  MacFarlane è nel messaggio successivo;
- markdown-it ha avuto più release nel 2026, non una sola;
- github/markup usa commonmarker come prima scelta, con altre librerie di
  ripiego;
- le prove su djot.js sono state ripetute: anche un commento dentro gli
  attributi sparisce (`{#id % c %}` diventa `{#id}`), e dove c'era un
  commento in linea restano due spazi;
- prettier conserva i commenti ed è idempotente: era sbagliato dire che
  nessuna strada ha un formatter che li conservi;
- djot.js riceve commit fino al 2026-10; ferme sono solo le release su npm;
- la dipendenza da una persona vale anche per CommonMark in JavaScript;
- nel forum di CommonMark chi sposta la discussione non è un moderatore;
- la issue jgm/djot#35 contiene più proposte, e non c'è una strada
  suggerita; autori e date delle proposte li ha verificati sulla pagina la
  seconda revisione, perché da qui la pagina non era raggiungibile;
- commonmark.js dà le posizioni solo ai blocchi; nella spec «attribute»
  compare anche per i blocchi di codice; MyST accetta tutti e due i recinti;
  per Djot si può usare `text/x-djot`; c'è la forma di commento `[//]: #`;
- mancava il riferimento di contesto.md a Markdown.

## Cosa ne segue per noi

Questa sezione è un'inferenza dai fatti sopra, non un fatto verificato.

- **Costi di CommonMark con intestazione.**
  - Gli attributi vengono da tre fonti diverse: YAML per il file, un'estensione
    per i blocchi e il testo in linea, un'altra per l'`embed`. Ognuna va
    fissata nella specifica, e chi la legge altrove (GitHub, VS Code) ne vede
    solo una parte: le direttive e gli attributi restano testo letterale, e
    `class` sparisce.
  - YAML porta con sé le sue ambiguità (tipi impliciti, più modi di scrivere
    la stessa lista), che il `formatter` deve ridurre a una forma.
  - In cambio i file si leggono bene ovunque, l'intestazione appare come
    tabella su GitHub, le librerie sono mature, e prettier offre già una base
    per il `formatter`.
  - Contesto.md nomina Markdown fra i riferimenti da cui il progetto si
    distingue; come pesi nella scelta lo dice Alessio.
- **Costi di Djot.**
  - La sintassi non è stabile e l'unica implementazione TypeScript non ha
    release da quasi due anni. Probabilmente andrebbe fissata una versione, o
    mantenuto un fork.
  - Le liste negli attributi chiedono una convenzione, e il `formatter` va
    costruito su `renderDjot`, che perde i commenti.
  - Manca l'intestazione: gli attributi del file andrebbero sul primo blocco,
    come nell'esempio 1 della specifica, o in un'intestazione propria.
  - Su GitHub e negli editor senza estensione il file appare come testo
    semplice.
  - In cambio gli attributi hanno una sola forma, uguale su blocchi e testo
    in linea; per il file serve comunque una regola in più (§0.6 della
    specifica).
- **In tutti e due i casi** il `formatter` canonico deve normalizzare, che è
  il suo compito, e conoscere le regole proprie del formato. Con CommonMark
  si parte da prettier, che conserva i commenti; con Djot da `renderDjot`,
  che va esteso per conservarli.
- Si può anche separare la scelta: un'intestazione per gli attributi del file,
  con l'una o l'altra sintassi per il corpo. Per Djot è una delle proposte
  della discussione sui metadati.
