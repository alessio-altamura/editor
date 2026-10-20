# Sintassi dei file di testo: CommonMark o Djot

Ricerca del 2026-10-20 per la scelta APERTA nella
[specifica](../specifica.md), §0.3. Domanda: per i file di testo (`concept`,
`text`, `composition`), CommonMark con un'intestazione per gli attributi,
oppure Djot? La nota non sceglie: dà i fatti e i costi.

I fatti vengono da fonti primarie: specifiche, repository ufficiali, registry
npm, documentazione dei prodotti. Alcuni sono prove eseguite con i pacchetti
installati in locale, e sono segnati come prove. Un secondo agente ha
ricontrollato i fatti portanti sulla fonte; dove ha corretto, qui c'è la
versione corretta, e le correzioni sono elencate in fondo. Le inferenze sono
nell'ultima sezione.

## In sintesi

- **Stabilità.** CommonMark è alla 0.31.2 del gennaio 2024, senza una 1.0 ma
  con implementazioni mature. Djot si dichiara non ancora stabile, è alla
  sintassi 0.2 del 2022, e la sua unica implementazione TypeScript non ha
  release dal dicembre 2024. Le mantiene la stessa persona, John MacFarlane.
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
- **Commenti e formatter.** Nessuna delle due strade ha oggi un formatter che
  conservi i commenti e la forma del sorgente: il giro con remark conserva i
  commenti HTML ma normalizza la sintassi, djot.js perde i commenti. Il
  formatter canonico va scritto in ogni caso.

## Stato delle specifiche

- **CommonMark.** Versione 0.31.2 del 2024-01-28, di John MacFarlane, con
  licenza CC-BY-SA 4.0; non esiste una 1.0
  ([spec](https://spec.commonmark.org/),
  [spec.txt](https://github.com/commonmark/commonmark-spec)). Il repository
  riceve ancora commit, l'ultimo il 2026-10-10, ma senza nuove versioni (prova:
  git log).
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
| `@djot/djot` (djot.js) | 0.3.2, 2024-12-19 | MIT | scritto in TypeScript; commit fino al 2026-10, nessuna release dopo la 0.3.2 |

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
    attributi, `[read the manual]{.big .red}`.
- **CommonMark** non ha una sintassi per gli attributi: nella spec la parola
  compare solo per l'HTML grezzo e per le immagini
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
  - MyST, «a superset of CommonMark», con direttive `:::{name}` e ruoli in
    linea ([sintassi](https://mystmd.org/guide/syntax-overview)).

## Intestazione (front matter)

- La spec CommonMark non nomina né front matter né metadati. Sul forum di
  CommonMark, il 2016-09-22, un moderatore sposta la discussione fra le
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
  metadata, or should that be considered distinct from the markup syntax?», e
  suggerisce che per uno strumento esterno basti un blocco grezzo.

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
  ufficiale ([jgm/djot](https://github.com/jgm/djot)).
- **VS Code.** «VS Code targets the CommonMark Markdown specification using
  the markdown-it library»
  ([docs](https://code.visualstudio.com/docs/languages/markdown)).
- **JetBrains.** Il plugin Markdown, incluso e attivo, si basa sulla spec
  CommonMark ([help](https://www.jetbrains.com/help/idea/markdown.html)).
- **Djot negli editor.** Il README di Djot elenca estensioni per VS Code e
  JetBrains, file per Vim ed Emacs, evidenziazione in Helix e Zed e una
  grammatica tree-sitter. Le estensioni non sono state verificate una per una.

## Commenti, formatter e albero di sintassi

- **Commenti.** In CommonMark sono solo commenti HTML, cioè HTML grezzo
  ([spec.txt](https://github.com/commonmark/commonmark-spec)). In Djot:
  «Material between two `%` characters in an attribute will be ignored and
  treated as a comment», e un commento a sé si scrive `{% ... %}`
  ([syntax.md](https://github.com/jgm/djot/blob/main/doc/syntax.md)).
- **Posizioni nel sorgente.** mdast dà a ogni nodo una `position` con riga,
  colonna e offset (prova). djot.js ha l'opzione `sourcePositions`, che mette
  inizio e fine nell'AST ([README](https://github.com/jgm/djot.js)).
  commonmark.js dà `sourcepos`; markdown-it solo l'intervallo di righe dei
  blocchi (prove).
- **Riscrittura.** djot.js ha `renderDjot`, che riscrive Djot
  ([README](https://github.com/jgm/djot.js)); remark ha remark-stringify;
  prettier formatta il Markdown (3.9.10, MIT).
- **Prove sul giro lettura e riscrittura.**
  - djot.js: i commenti `{% ... %}` spariscono dall'AST e dall'output; un div
    `::: warning` diventa `{.warning}` sulla riga prima di `:::`.
  - remark con frontmatter e directive: il commento HTML resta come nodo
    `html` e il front matter resta, ma `k=v` diventa `k="v"`.
  - prettier: conserva commenti HTML, front matter e direttive, e cambia `*`
    in `-` negli elenchi.

## Correzioni del secondo controllo

Il secondo agente ha confermato tutti i fatti portanti, con due correzioni
e alcune precisazioni, già applicate sopra:
- la frase sul front matter nel forum di CommonMark non è una decisione della
  spec ma il motivo di uno spostamento fra le estensioni; la posizione di
  MacFarlane è nel messaggio successivo;
- markdown-it ha avuto più release nel 2026, non una sola;
- github/markup usa commonmarker come prima scelta, con altre librerie di
  ripiego;
- le prove su djot.js sono state ripetute: anche un commento dentro gli
  attributi sparisce (`{#id % c %}` diventa `{#id}`), e dove c'era un
  commento in linea restano due spazi.

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
    tabella su GitHub, e le librerie sono mature e mantenute.
- **Costi di Djot.**
  - La sintassi non è stabile, l'unica implementazione TypeScript è ferma da
    quasi due anni, e il progetto dipende da una persona. Probabilmente
    andrebbe fissata una versione e mantenuto un fork.
  - Manca l'intestazione: gli attributi del file andrebbero sul primo blocco,
    come nell'esempio 1 della specifica, o in un'intestazione propria.
  - Su GitHub e negli editor senza estensione il file appare come testo
    semplice.
  - In cambio gli attributi sono uno solo e uniforme, su file, blocchi e
    testo in linea.
- **In tutti e due i casi** l'albero di sintassi concreto che conserva i
  commenti e il `formatter` canonico vanno scritti o adattati: nessuna
  libreria esaminata riscrive il sorgente senza normalizzarlo o perdere i
  commenti. La differenza è da quale parser si parte.
- Si può anche separare la scelta: un'intestazione per gli attributi del file
  con l'una o l'altra sintassi per il corpo. Con Djot è la strada suggerita
  nella discussione sui metadati.
