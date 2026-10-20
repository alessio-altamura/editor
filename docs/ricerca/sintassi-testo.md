# Sintassi dei file di testo: quattro strade

Ricerca del 2026-10-20 per la scelta APERTA nella
[specifica](../specifica.md), §0.6. Domanda: quale sintassi per i file di
testo (`concept`, `text`, `composition`)? Le strade sono quattro: CommonMark
con un'intestazione per gli attributi; Djot; Markdown con una sintassi nostra,
come fa Obsidian; un formato del tutto nostro. Le ultime due le ha chieste
Alessio, che non conosce le prime due (contesto.md, orientamento «Sintassi dei
file di testo»). Le prime sezioni riguardano CommonMark e Djot; la sezione
«Le quattro strade» le mette a confronto tutte. La nota non sceglie: dà i
fatti e i costi.

Contesto.md, fra le decisioni: «Deve essere diffabile con Git. Riferimenti:
Notion per il modello a blocchi, Obsidian per i file di testo locali; in
contrapposizione a Word, LaTeX e Markdown.» La nota la cita senza
interpretarla.

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

## Le quattro strade

Lo stesso piccolo documento in quattro sintassi (ogni file comincia con una
riga `=== nome`, che non fa parte del file): un `concept`; un `text` con
un'enfasi, un collegamento in linea a un altro nodo e una `class`; un
`article` con un titolo e due `embed`. Le scelte comuni a tutte e quattro:
- la `class` sta negli attributi del file e vale per il blocco intero,
  perché un `text` è un blocco solo (specifica §0.2, deciso);
- collegamenti ed `embed` puntano per `id`. Il costo: l'`id` non si rompe con
  `turn into` né con una rinomina, ma su GitHub non è cliccabile. Per
  percorso (`calo-q3.concept.md`) il collegamento è cliccabile su GitHub, ma
  si rompe con `turn into`, che cambia l'estensione.

Le forme delle strade 3 e 4 sono abbozzi scritti per il confronto, non
proposte.

**1. CommonMark con un'intestazione YAML.** CommonMark non ha collegamenti per
`id` né `embed`: qui il collegamento è un'ancora `#id` e l'`embed` usa la
sintassi delle immagini, che CommonMark legge come un'immagine.

```
=== calo-q3.concept.md
---
id: calo-q3
kind: concept
tags: [vendite, q3]
---
Nel terzo trimestre le vendite calano per i ritardi nelle consegne.

=== calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
class: [evidenza]
---
Le vendite sono calate del 12%, soprattutto per i *ritardi* di agosto
(vedi [il calo](#calo-q3)).

=== report-q3.article.md
---
id: report-q3
kind: article
---
# Il terzo trimestre

![](calo-q3-sintesi)

![](lavagna)
```

**2. Djot.** Gli attributi sono nativi, e gli attributi del file stanno in
un blocco in testa. Djot non ha collegamenti per `id` fra file diversi: per
djot.js 0.3.2 `[il calo](#calo-q3)` diventa `href="#calo-q3"`, un'ancora
nella stessa pagina (prova). Anche qui l'`embed` usa la sintassi delle
immagini.

```
=== calo-q3.concept.dj
{#calo-q3 kind=concept tags="vendite q3"}

Nel terzo trimestre le vendite calano per i ritardi nelle consegne.

=== calo-q3-sintesi.text.dj
{#calo-q3-sintesi kind=text .evidenza}

Le vendite sono calate del 12%, soprattutto per i _ritardi_ di agosto
(vedi [il calo](#calo-q3)).

=== report-q3.article.dj
{#report-q3 kind=article}

# Il terzo trimestre

![](calo-q3-sintesi)

![](lavagna)
```

Nella prova con djot.js 0.3.2 il blocco di attributi va sul blocco che segue
anche con una riga vuota in mezzo: nel `text` gli attributi finiscono sul
capoverso, ed è il risultato voluto, perché un `text` è un blocco solo;
nell'`article` finiscono sulla sezione del titolo. Per il `concept` e
l'`article` serve quindi una regola per gli attributi del file. Quella della
specifica (§0.6) è la proposta di matklad nella issue #35, il 2022-11-03: gli
attributi valgono per il documento «if the doc starts with attributes and they
are followed by a blank line». MacFarlane risponde con un limite e non la
adotta. `renderDjot` toglie la riga vuota fra gli attributi e il primo blocco
(prova), quindi il `formatter` deve conservarla.

**3. Markdown con una sintassi nostra, come Obsidian.** Intestazione YAML,
`[[id]]` e `![[id]]` alla maniera di Obsidian, ma con regole scritte da noi.
Obsidian ha già una `class` a livello di file, la proprietà predefinita
`cssclasses`
([Properties](https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Properties.md));
qui si usa `class`, come nel resto della specifica.

```
=== calo-q3.concept.md
---
id: calo-q3
kind: concept
tags: [vendite, q3]
---
Nel terzo trimestre le vendite calano per i ritardi nelle consegne.

=== calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
class: [evidenza]
---
Le vendite sono calate del 12%, soprattutto per i *ritardi* di agosto
(vedi [[calo-q3|il calo]]).

=== report-q3.article.md
---
id: report-q3
kind: article
---
# Il terzo trimestre

![[calo-q3-sintesi]]

![[lavagna]]
```

La cartella non funzionerebbe dentro Obsidian così com'è: Obsidian risolve
`[[...]]` per nome della nota, cioè del file, o per i suoi alias, non per un
`id` scritto nel file
([Internal links](https://github.com/obsidianmd/obsidian-help/blob/master/en/Linking%20notes%20and%20files/Internal%20links.md),
[Aliases](https://github.com/obsidianmd/obsidian-help/blob/master/en/Linking%20notes%20and%20files/Aliases.md)).
Qui `[[calo-q3]]` funzionerebbe solo se il file si chiamasse `calo-q3.md`.

**4. Un formato nostro**, dalla «bozza di sintassi» di contesto.md aggiornata a
un file per oggetto: una parola chiave per riga, rientri per l'annidamento,
`#id` per dichiarare e `@id` per riferire.

```
=== calo-q3.concept
concept #calo-q3
  tags  vendite, q3
  idea  "Nel terzo trimestre le vendite calano per i ritardi nelle consegne."

=== calo-q3-sintesi.text
text #calo-q3-sintesi
  class  evidenza
  p      "Le vendite sono calate del 12%, soprattutto per i {_ritardi_}
         di agosto (vedi {@calo-q3 il calo})."

=== report-q3.article
article #report-q3
  h      "Il terzo trimestre"
  embed  @calo-q3-sintesi
  embed  @lavagna
```

### Fatti sulla strada Obsidian

- **Le estensioni di Obsidian.** La pagina ufficiale dichiara di supportare
  «CommonMark, GitHub Flavored Markdown, and LaTeX», ed elenca `[[Link]]`,
  `![[Link]]`, `![[Link#^id]]`, `^id`, le note `[^id]`, i commenti
  `%%Text%%`, `~~Text~~`, `==Text==`, i blocchi di codice, le liste di cose
  da fare, i callout `> [!note]` e le tabelle. Avverte: «Some of these, such
  as internal links, comments, and highlights, are specific to Obsidian.
  Other Markdown apps may show them as plain text»
  ([Obsidian Flavored Markdown](https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Obsidian%20Flavored%20Markdown.md)).
  Le proprietà sono YAML, e un collegamento in una proprietà va fra
  virgolette, `link: "[[Episode IV]]"` (Properties).
- **Identificatori di blocco.** Un `^id` si mette in fondo alla riga di un
  capoverso, o su una riga a sé, con una riga vuota prima e dopo, per elenchi,
  citazioni, callout e tabelle; «Block identifiers can only consist of Latin
  letters, numbers, and dashes» (Internal links).
- **GitHub.** La spec GFM ha cinque estensioni (tabelle, liste di cose da
  fare, barrato, autolink, HTML vietato), e nessuna è un wikilink
  ([gfm](https://github.github.com/gfm/)). Nella documentazione di GitHub
  `[[...]]` compare nella pagina dei wiki, come sintassi MediaWiki per i link
  ([docs](https://docs.github.com/en/communities/documenting-your-project-with-wikis/editing-wiki-content)).
- **Parser in JavaScript** (registry npm, ottobre 2026): `remark-wiki-link`
  2.0.1 (MIT, pubblicato la prima volta nel 2017) legge solo i wikilink;
  `remark-obsidian` 1.15.0 (GPL-3.0, dal 2022); `@silicajs/remark-obsidian`
  0.1.0 (MIT, maggio 2026) produce nodi per wikilink, `embed`, callout,
  evidenziazione, commenti, `^id` e tag (prova con remark-parse 11).
- **Formatter.** prettier 3.9.10 conserva il `text` e l'`article` della
  strada 3, compresi `[[...]]`, `![[...]]` e un commento `%% … %%`, cambia
  `*ritardi*` in `_ritardi_`, e una seconda passata non cambia nulla (prova).
- **L'app.** La licenza dice «We own and reserve rights to our content,
  including text, images, and code in the app»
  ([license](https://obsidian.md/license)); la pagina per gli sviluppatori
  elenca come progetti open source MIT JSON Canvas, Importer, Web Clipper e
  altri, ma non l'app
  ([Developers](https://github.com/obsidianmd/obsidian-help/blob/master/en/Contributing%20to%20Obsidian/Developers.md)).
  Che l'app non sia open source è un'inferenza. Con una sintassi nostra la
  strada 3 non dipende dall'app.

### Diffusione

Download npm della settimana dal 2026-10-12 al 2026-10-18
(`api.npmjs.org/downloads/point/last-week/<nome>`): `marked` 51,2 milioni,
`micromark` 38,6 milioni, `remark-parse` 33,9 milioni, `markdown-it` 16,6
milioni, `commonmark` 562 mila, `remark-wiki-link` 14.798, `@djot/djot`
1.270. Per la strada 4 non c'è un pacchetto. I download contano le
installazioni, anche come dipendenze indirette, non quanto si scrive in un
formato, e la tabella non li usa come misura della familiarità. Per la
familiarità di un modello AI con una sintassi non è stata trovata una fonte
verificabile.

### Confronto

Le celle riassumono i fatti delle sezioni precedenti della nota, con le loro
fonti; quelle segnate *(inf.)* sono inferenze.

| Criterio | 1. CommonMark + YAML | 2. Djot | 3. Markdown con sintassi nostra | 4. Formato nostro |
|---|---|---|---|---|
| Leggibilità a mano *(inf., per tutte)* | prosa con pochi segni; intestazione YAML | prosa con pochi segni; attributi in graffe | come la 1, con `[[...]]` al posto di link e immagini | parole chiave per riga, prosa fra virgolette |
| Resa su GitHub | intestazione come tabella; nell'esempio l'ancora `#calo-q3` non porta a niente e l'`embed` è un'immagine rotta | `.dj` non riconosciuto: testo semplice | intestazione come tabella; `[[...]]` e `![[...]]` restano testo *(inf., la spec GFM non li prevede)* | testo semplice *(inf.)* |
| Resa negli editor | VS Code e JetBrains basati su CommonMark | estensioni di terzi, non verificate | come la 1; Obsidian apre i file ma non risolve gli `id` | serve un'estensione per ogni editor *(inf.)* |
| Attributi su file, blocchi, testo | file con YAML, e con un blocco per `text` basta; testo in linea solo con estensioni | nativi su blocchi e testo; il file chiede la regola di matklad | come la 1 | tutti, come li definiamo noi |
| Ambiguità | YAML: `0123`, `no`, `yes`, `on` non si leggono come stringhe (specifica §0.3) | i valori sono stringhe: le liste chiedono una convenzione | YAML, come la 1 | da evitare nella grammatica *(inf.)* |
| Commenti | commenti HTML, e `[//]: #` | `{% ... %}`, persi da djot.js | commenti HTML; `%% … %%` se li adottiamo | da definire |
| Parser e formatter in TypeScript | maturi (micromark, markdown-it, remark); prettier conserva commenti e intestazione, idempotente | djot.js, nessuna release dal 2024-12; `renderDjot` perde i commenti e la riga vuota della regola | i parser della 1 più plugin per wikilink (dal 2017) o nostri; prettier conserva la strada 3, idempotente | nessuno |
| Costo di scrivere parser e formatter *(inf.)* | regole nostre come plugin | adattare o mantenere djot.js | plugin per `[[...]]` e `![[...]]`, con regole scritte da noi | tutto, con una grammatica piccola e nostra |
| Stabilità e dipendenza da terzi | spec 0.31.2 del 2024; librerie con un solo manutentore npm | spec dichiarata instabile; un solo autore | come la 1, più i plugin che si scelgono | nessuna dipendenza; tutta la manutenzione è nostra |
| Familiarità per un'AI | nessuna fonte | nessuna fonte | nessuna fonte | nessuna fonte |

Djot, dal suo README: «It derives most of its features from commonmark, but
it fixes a few things that make commonmark's syntax complex and difficult to
parse efficiently» ([jgm/djot](https://github.com/jgm/djot)). Il rapporto di
ciascuna strada con la decisione di contesto.md citata in testa lo valuta
Alessio.

## Correzioni del secondo controllo

Il confronto delle quattro strade è stato ricontrollato da un altro agente:
nessun fatto da correggere, alcune precisazioni applicate (i blocchi di codice
fra le estensioni di Obsidian, la riga vuota intorno a `^id`, la fonte
sull'elenco dei progetti open source, la sintassi MediaWiki dei wiki di GitHub,
l'avviso di Obsidian riportato senza rafforzarlo). Una revisione successiva
ha reso il confronto più equo: la strada 3 è una sintassi nostra e non quella
di Obsidian, la `class` sta nell'intestazione come vuole il §0.2, i
collegamenti sono per `id` in tutte, gli stessi criteri valgono per tutte, e
la proposta di matklad è confermata sulla pagina della issue.

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

- **CommonMark con un'intestazione.** Librerie mature e prettier come base del
  `formatter`; l'intestazione appare su GitHub. Costi: collegamenti per `id`
  ed `embed` vanno inventati sopra CommonMark, e su GitHub si vedono rotti;
  YAML ha le sue ambiguità, che il `formatter` e una regola sulle stringhe
  devono togliere.
- **Djot.** Attributi nativi e una sintassi pensata per essere facile da
  leggere per un parser. Costi: la sintassi non è stabile, l'unica
  implementazione TypeScript non ha release da quasi due anni, gli attributi
  del file chiedono la regola di matklad, `renderDjot` perde commenti e riga
  vuota, e GitHub mostra il testo semplice.
- **Markdown con una sintassi nostra.** Gli stessi strumenti della prima
  strada, con `[[...]]` e `![[...]]` che sono già noti a chi usa Obsidian; le
  regole le scriviamo noi. Costi: plugin da scrivere o da scegliere, e la
  cartella non funziona in Obsidian finché Obsidian collega per nome del
  file.
- **Un formato nostro.** Nessuna dipendenza e una grammatica fatta per il
  modello. Costi: parser, `formatter`, commenti e supporto negli editor sono
  tutti da fare, e nessuno strumento esistente mostra il file.
- **In tutti i casi** il `formatter` canonico deve normalizzare, che è il suo
  compito, e conoscere le regole proprie del formato.
