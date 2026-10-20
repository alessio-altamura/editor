# Glossario

Il documento unico dei nomi del prodotto: ogni concetto ha qui il suo nome
inglese, la sua definizione e, quando ci sarà il codice, i suoi nomi nel
codice. Un nome nuovo si scrive qui, con le regole del §1, **prima** di usarlo
in un documento, in un comando o nel codice. Le definizioni restano in italiano
finché il repository è privato; se diventa pubblico se ne esporta una versione
inglese.

L'impostazione riprende il glossario di ID-Zero (`id-zero-internal`,
`docs/glossario.md`, regole DEC-431, DEC-432, DEC-435, DEC-438 e DEC-439),
adattata a un prodotto senza notazione matematica: niente simboli né
vocabolario dei pedici. Le regole del §1 sono decise da Alessio
(2026-10-20).

Controllo: `python3 -I tools/verifica_glossario.py docs/glossario.md`. Deve
dire «esito: OK».

## 1. Regole

### 1.1 I nomi

- **N1.** Il nome inglese di un concetto è quello del §4. Nel codice
  l'identificatore ha le stesse parole, nello stile del contesto: TypeScript
  `camelCase` per funzioni, variabili e membri, `PascalCase` per tipi, classi ed
  eventi, `UPPER_SNAKE` per le costanti; comandi della `cli`, nomi di file e
  chiavi di configurazione in `kebab-case`; chiavi JSON in `camelCase`.
- **N2.** Un membro (campo, metodo, opzione) lascia fuori le parole che il nome
  del suo contenitore dice già, e solo quelle: il nome di una `collection` è
  `Collection.name`, non `Collection.collectionName`.
- **N3.** Una funzione, un evento, un tipo o un comando che calcola, annuncia o
  porta un concetto ne contiene il nome intero (`resolveTree`,
  `RecordArchived`), e cambia nome con lui.
- **N1a.** Le parole che dicono il genere (*event*, *list*, *map*) non entrano
  nell'identificatore quando il linguaggio lo dice già.
- **N2a.** N2 non toglie una parola se il nome che resta direbbe un altro
  concetto o resterebbe vuoto.
- **Niente sigle**, con queste eccezioni: (1) i termini degli standard esterni
  (HTML, CSS, PDF, CSV, TSV, JSON, LSP, MCP, CLI, WASM, URL, API, ID); (2) i
  nomi dei prodotti e dei formati citati (Typst, JSON Canvas); (3) le
  abbreviazioni d'uso comune nel codice che il §4 fissa come nome (`id`).
- **N4.** Un concetto ha un nome solo, e un nome indica un concetto solo. Un
  sinonimo che creerebbe ambiguità va nella colonna *Da non usare*; un nome può
  stare fra i *Da non usare* di un'altra riga quando è il nome attivo di un
  concetto diverso, e lì vuol dire "non usarlo per questo".
- **N5.** Nel testo italiano dei documenti i concetti del prodotto si
  chiamano col nome inglese fra backtick; azioni, ruoli e concetti generali
  restano in italiano. Vale per i documenti nuovi; quelli già scritti si
  allineano quando si toccano.
- Nel codice TypeScript `document`, `navigator`, `Object` ed `export` sono già
  globali o parole riservate: i nomi del prodotto vanno sotto un namespace.

### 1.2 Lo stato

- **deciso**: nome e concetto decisi da Alessio.
- **concetto deciso, nome proposto**: il concetto è deciso, il nome no.
- **proposto**: né il concetto né il nome sono decisi.
- **aperto**: il concetto stesso è una domanda aperta.

### 1.3 Come si aggiunge un nome

1. Si controlla che il concetto non abbia già un nome nel §4, anche fra i *Da
   non usare*.
2. Si sceglie il nome con le regole del §1.1 e lo si confronta con il §3: se
   collide con un uso diffuso, si sceglie un'alternativa.
3. Si scrive la riga nel §4, con definizione, stato e sinonimi da non usare;
   ogni nome fra backtick nella definizione deve esistere nel §4.
4. Si esegue il controllo; solo con l'esito OK il nome si usa.

I nomi dei tipi di contenuto (paragrafo, titolo, capitolo, sezione, immagine)
si fissano sulla bozza dei tipi di nodo di Alessio, non prima. La bozza di
sintassi in [contesto.md](contesto.md) usa `view`, `calc` e `layout` in modo
diverso da qui: è un bersaglio da criticare e non va corretta.

## 2. Parole italiane con più significati

| Parola | Significati | Nomi proposti |
|---|---|---|
| layout | impaginazione; documento o presentazione come vista; posizioni sul canvas; schema di una slide; disposizione automatica; layout a vincoli | `stylesheet`, `composition`, `placement`, `slide template`, `auto arrange`, `constraints` |
| lista | tabella come lista moderna; elenco puntato; pannello a fianco del canvas | `collection`, `bullet list`, `navigator` |
| aggregatore | oggetto che ripete lo stesso `template` su più dati, affiancati o con un selettore; calcolo di somme e medie per gruppo | nome inglese da scegliere per il primo; aggregator e aggregate restano al secondo |
| connettore | collegamento grafico; integrazione con un servizio esterno | `wire`, `integration` |
| foglio | foglio di bozze (in inglese "sheet" fa pensare al foglio di calcolo) | `canvas` |
| tabella | griglia come vista; tabella come dato; tabellina scritta nel testo | `grid`, `collection`, `text table` |
| vista | vista di una collection; composizione; rappresentazione generata; modalità; anteprima; grafico | `view` solo per la prima; gli altri hanno nomi propri |
| motore | runtime; rendering; calcolo; browser di stampa | `runtime`, `renderer`, `evaluator`, `print browser` |
| sorgente | il testo dei file, contro la fonte di dati esterna | `source`, `integration` |
| nodo | unità del modello, contro le cose collegate dai wire | `node` solo per il modello |
| documento | la cartella intera, contro la composizione a flusso | `document`, `article` |
| paragrafo, sezione | in italiano la sezione numerata (§3.2), in inglese il capoverso; usati anche per l'unità di significato | il capoverso è un `object` di `kind` `text`; l'unità di significato è il `concept`; capitoli e titoli stanno nella `composition` |
| nucleo | l'HTML come nucleo dei motori; la parte della specifica che ogni implementazione legge | `renderer` HTML per il primo, `core` per il secondo |
| contesto | i tag di contesto; il contesto che usa una versione di un oggetto, cioè la `composition`; il file contesto.md | `tags`, `composition` |
| parte | un file del documento, contro un pezzo del documento | `part` per il file, `object` per il pezzo |
| oggetto | per Alessio anche l'unità con il concetto, i metadati e gli sviluppi, contro il pezzo con un tipo sul canvas | `concept` per l'unità, `object` per il pezzo |
| bozza | gli oggetti non archiviati del canvas; il primo sviluppo di un concetto | `drafts` per gli oggetti del canvas; il primo sviluppo è un `object` come gli altri |
| presentazione, slide | la presentazione, contro la singola slide | `deck` per la presentazione, che è una `composition`; `slide` per la pagina; le slide non sono un `part` a sé |
| elemento | elemento di una collection, contro oggetto o tipo di contenuto | `record` solo per la collection |
| blocco | blocco di codice; blocco alla Notion; blocco libero; passo | `code block`, `object`, `scratch`, `step` |
| livello | file del documento, oggi gruppo di `kind`; passo dell'ordine dei livelli come insieme di requisiti; livelli di diff; strati del linguaggio; profondità del grafo | `part` per il primo, `conformance class` per il secondo |
| tipo | tipo di dato; tipo di oggetto, di nodo, di grafico; tipo di file | `type` per il dato, `kind` per oggetti e nodi, `part` per i file |
| testo | il sorgente; un oggetto di prosa; testo libero | `source`, `text`, `scratch` |
| spazio libero | appunti dentro il contenuto, contro il canvas | `scratch`, `canvas` |
| pagina | pagina stampata; pagina vuota; pagina web; HTML esportato | `page`, `canvas`, `webpage`, `live export` |
| sezione | sezione del navigator, contro sezione del testo | `shelf` per il navigator; nel testo non ci sono sezioni: capitoli e titoli stanno nella `composition` |
| intestazione | nome di colonna; riga di intestazione del CSV; titolo; intestazione di pagina | `field`, `header row`, `heading`, `running header` |
| riferimento | uso di un oggetto; riferimento in un'espressione; riferimento numerato; riferimento fra file | `embed`, `reference`, `cross-ref`, da decidere con il `manifest` |
| collegamento | fra `concept` e `object`; wire; relazione fra collection; collegamento suggerito | `association`, `wire`, `relation`, `hint` |
| albero, grafo | albero di sintassi; modello; albero risolto; dipendenze; vista a connettori | `syntax tree`, `model`, `resolved tree`, `dependency graph`, `wire diagram` |
| risultato | risultato in linea; output del codice; valori fotografati; HTML e PDF prodotti | `inline result`, `results`, `frozen values`, `output` |
| stampa | produzione del PDF, contro stampa canonica del formatter | `print`, `format` |
| schema | schema di una collection, contro schema dei formati JSON | `schema`, `format schema` |
| dimensione | asse di una collection, contro grandezza | `dimension`, `size` |
| misura | valore di una collection; unità di misura; misurazioni da fare | `measure`, `unit`, `benchmark` |
| estensione | pacchetto aggiuntivo, contro estensione del file | `extension`, `file extension` |
| chiave | chiave di una collection, contro chiave di cache | `key`, `cache key` |
| ordine | ordine dei record; di lettura; di esecuzione | `record order`, `reading order`, `execution order` |
| input | controllo del lettore; ingressi di un calcolo; orologio, seme e fuso | `input`, `inputs`, `environment` |

## 3. Nomi inglesi che collidono con usi diffusi

Per ciascuno c'è un nome alternativo, già usato nelle tabelle sotto come
proposta principale.

| Nome evitato | Dove ha già un significato | Alternativa proposta |
|---|---|---|
| `layer` | livelli di sovrapposizione in Figma, Photoshop e Keynote; `@layer` in CSS | `part`, come in OOXML e ODF |
| `layout` | schema di slide in PowerPoint; calcolo delle posizioni in CSS e Typst | `composition` |
| `style` | stile con nome in Word | `stylesheet` |
| `focus` | focus di tastiera nel DOM; focus mode degli editor | `isolate`, come in Illustrator |
| `promote`, `demote` | alzare o abbassare il livello dei titoli in Word e Org-mode | `turn into` e `revert`, come in Notion |
| `inbox` | in Gmail archiviare toglie dalla inbox | `unfiled` |
| `package` | pacchetto npm; pacchetto di Typst Universe | `bundle` |
| `source` o `data source` (per i servizi esterni) | il testo sorgente | `integration` |
| `engine` | motore di calcolo in Excel; motori del browser | `renderer` |
| `run`, `show` | run di testo in OOXML; show rule di Typst | `eval` ed `echo`, come in Quarto e knitr, già noti all'AI |
| `snapshot` | output atteso dei test in Jest e Vitest | `frozen values`, verbo `freeze` come in Quarto |
| `suggestion` | modifiche proposte da un collaboratore in Google Docs | `hint` |
| `calc line` | `calc()` in CSS | `math line` |
| `item` | voce di un elenco puntato (`<li>`) | `record` |
| `imprint` | Impressum, le note legali di un sito | `target quote` |

Da qualificare sempre: `canvas` (contro l'elemento HTML canvas), `grid` (contro
`display: grid` del CSS), `runtime` (contro Node, Deno, Bun), `view` (contro le
VIEW di SQL), `measure` e `dimension` (contro i loro usi in Power BI e nel
design), `hint` (contro DiagnosticSeverity.Hint di LSP).

## 4. I concetti del prodotto

Una riga per concetto, per area. Quando ci sarà il codice si aggiungono le
colonne *codice* e *spec*, come in ID-Zero.

### 4.1 Documento e file

| Nome | Italiano | Definizione | Stato | Da non usare |
|---|---|---|---|---|
| `document` | documento | Insieme di file di testo più gli asset, in una cartella o in un `bundle` | concetto deciso, nome proposto | project, workbook |
| `bundle` | pacchetto | Il documento compresso in un unico zip con `file extension` propria, da scegliere | proposto | package, archive |
| `part` | livello | Un livello del documento (contenuto, stile, dati, formule, wire, grafici, composizioni, canvas): un gruppo di `kind`, sviluppato per fasi; orientamento: non è né un file né una cartella, gli oggetti stanno insieme e l'`app` li filtra per livello | deciso | layer, level, tier |
| `source` | sorgente | Il testo dei file del documento, fonte di verità da cui si generano le viste | concetto deciso, nome proposto | code, integration |
| `asset` | asset | File non testuale: immagini, font, dati grandi | proposto | attachment, resource |
| `schema` | schema | File che dichiara tipi, chiavi, dimensioni e `dialect` di una `collection` | concetto deciso, nome proposto | header, metadata |
| `dialect` | dialetto | Separatore, quoting e codifica di un CSV o TSV, dichiarati nello `schema` | proposto | format |
| `manifest` | manifest | File che dice da dove partire; esistenza da decidere | aperto | index |
| `canvas file` | file del canvas | Quali oggetti stanno sul `canvas` e dove; base JSON Canvas | concetto deciso, nome proposto | layout |
| `drafts` | bozze | Oggetti non ancora archiviati, salvati nei file | concetto deciso, nome proposto | temp, scratch |
| `file extension` | estensione del file | Suffisso del nome di file: quello del `bundle`, da scegliere; per i file di testo dice anche il `kind`, per esempio .concept.md (deciso il 2026-10-20) | concetto deciso, nome proposto | extension |
| `header row` | riga di intestazione | Prima riga di un CSV o TSV con i nomi dei `field` | proposto | header |

### 4.2 Canvas, oggetti e organizzazione

| Nome | Italiano | Definizione | Stato | Da non usare |
|---|---|---|---|---|
| `canvas` | foglio bianco, foglio di bozze | Superficie libera da cui si creano gli oggetti; all'apertura si vede questa | concetto deciso, nome proposto | sheet, board, page |
| `object` | oggetto | Pezzo con un `kind`, un file: testo, `collection`, `chart`, immagine, e tipi da estensioni; si crea sul `canvas` o con `develop`, e può sviluppare uno o più `concept` | deciso | element, block, node, variant |
| `kind` | tipo di oggetto | Il tipo di un `object` o di un `node`; ogni nodo ne ha uno (deciso il 2026-10-20) | concetto deciso, nome proposto | type (riservato ai dati) |
| `navigator` | lista a fianco | Pannello che organizza gli oggetti in `shelf`, con `unfiled` e le `composition` | concetto deciso, nome proposto | list, sidebar, library |
| `shelf` | sezione del navigator | Gruppo di oggetti di un `kind` nel `navigator` | proposto | section, folder |
| `unfiled` | da sistemare | Oggetti non ancora classificati | concetto deciso, nome proposto | inbox, misc |
| `archive` | archiviare | L'oggetto esce dal `canvas` e resta nel `navigator` | concetto deciso, nome proposto | store, save |
| `recall` | richiamare | Riportare sul `canvas` un oggetto archiviato; è lo stesso oggetto | concetto deciso, nome proposto | restore, copy |
| `isolate` | vedere da solo | Aprire un oggetto da solo nella sua vista naturale | concetto deciso, nome proposto | focus, zoom |
| `duplicate` | duplicare | Azione esplicita che crea una copia indipendente | concetto deciso, nome proposto | copy |
| `classify` | classificare | Assegnare un oggetto al suo `shelf` | concetto deciso, nome proposto | sort, tag |
| `turn into` | promuovere | Trasformare un pezzo in un tipo strutturato, per esempio testo in `collection` o in `chart` | concetto deciso, nome proposto | promote, convert |
| `revert` | gesto inverso | Riportare un oggetto strutturato a testo libero; da decidere | aperto | demote, downgrade |
| `hint` | suggerimento | Proposta automatica (classificare, collegare, trasformare) che chi scrive conferma | concetto deciso, nome proposto | suggestion, auto- |
| `embed` | uso per riferimento | Inclusione di un oggetto in una `composition` o nel contenuto, senza copia | concetto deciso, nome proposto | copy, insert |
| `scratch` | spazio libero | Appunti e `math line` dentro il contenuto, da cui si trasformano oggetti; proposta: un `kind` a sé con più blocchi, posto di lavoro e non unità di significato, che una `composition` non usa | concetto deciso, nome proposto | free space, notes |
| `math line` | riga di calcolo | Riga con un calcolo e l'`inline result` | concetto deciso, nome proposto | calc line, formula |
| `inline result` | risultato in linea | Valore mostrato accanto a una `math line` | proposto | output |
| `text table` | tabellina | Tabella scritta nel testo, non ancora `collection` | proposto | table |
| `text` | testo | `kind` di `object` fatto di prosa | proposto | paragraph (da fissare con la bozza) |
| `image` | immagine | `kind` di `object` per un'immagine fatta fuori dal `runtime`: un file descrittore con gli attributi, che nomina il suo `asset` | proposto | picture, figure |
| `attributes` | metadati comuni | Attributi comuni, opzionali: `id` e `tags` su ogni `kind`, `class` e `lang` sui nodi che si vedono; ogni nodo ha anche un `kind`; `origin` è da decidere; gli altri attributi dipendono dal `kind`; precedente: gli attributi (Attr) di Pandoc | concetto deciso, nome proposto | metadata, properties |
| `tags` | tag di contesto | Uno o più tag che dicono a cosa si riferisce un `node`, per organizzare e filtrare nel `navigator` | concetto deciso, nome proposto | labels, categories, class |
| `lang` | lingua | Lingua del contenuto di un `node` che si vede, per sillabazione, controllo ortografico e screen reader; si eredita, da cosa è da precisare | concetto deciso, nome proposto | language, locale |
| `concept` | concetto | Unità di significato, un file: un'idea in una o due frasi, i suoi `attributes` e i collegamenti agli `object` che la sviluppano; si scrive prima e se ne fa `develop`, o si ricava dopo con `distill`; può proporlo un LLM come `hint`; i collegamenti con gli `object` si scrivono da una parte, dall'altra o da entrambe | deciso | summary, description, abstract, idea, section |
| `develop` | sviluppare | Operazione: da un `concept` a uno o più `object` nuovi, anche di `kind` diversi, collegati al `concept` | proposto | expand, generate |
| `distill` | ricavare il concetto | Operazione: da un `object` a un `concept` nuovo che lo collega | proposto | summarize, extract |
| `origin` | origine | Attributo che dice se un `concept` o un `object` è scritto da una persona o generato e confermato | proposto | source, author |
| `concept map` | mappa concettuale | Vista generata dei `concept`, degli `object` che li sviluppano e dei loro collegamenti | proposto | knowledge graph, graph |
| `association` | collegamento | Collegamento fra un `concept` e un `object`, scritto da una parte, dall'altra o da entrambe; non porta dati, a differenza del `wire`; se valga anche fra due `object` o fra due `concept`, e il confine con le dipendenze, sono da decidere | concetto deciso, nome proposto | link, relation, reference |
| `retired id` | id ritirato | `id` di un nodo cancellato o fuso in un altro, che non si riusa; sta in un file del documento con l'eventuale successore (deciso il 2026-10-20) | concetto deciso, nome proposto | dead id, tombstone, replaces |
| `target quote` | impronta | Poche parole e l'hash del bersaglio, salvate insieme con un'`association` confermata per ritrovarlo e per vedere che è cambiato; da decidere | aperto | imprint, fingerprint, signature, checksum |
| `id reference` | riferimento per id | Forma generica, fissata nel `core`, con cui un file nomina un altro `node` per `id`: un `embed`, un riferimento in linea, un valore di attributo | proposto | link, pointer |

### 4.3 Composizioni e stile

| Nome | Italiano | Definizione | Stato | Da non usare |
|---|---|---|---|---|
| `composition` | vista layout | Composizione ordinata di oggetti per `embed`: `article`, `deck`, `webpage` | deciso | layout, view, template |
| `article` | documento | `composition` a flusso, per lettura e stampa | proposto | document |
| `deck` | presentazione | `composition` fatta di `slide` | concetto deciso, nome proposto | presentation, slides |
| `webpage` | pagina web | `composition` pubblicata come pagina HTML | proposto | page, site |
| `slide` | slide | Pagina a dimensione fissa di un `deck` | proposto | page, frame |
| `reading order` | ordine di lettura | Ordine degli oggetti in una `composition`, deciso da chi scrive | concetto deciso, nome proposto | sequence |
| `stylesheet` | impaginazione | Regole nel sottoinsieme di CSS della specifica | concetto deciso, nome proposto | layout, style, theme |
| `class` | aggancio | Nome su un `node` che si vede, a cui si agganciano le regole dello `stylesheet` | concetto deciso, nome proposto | tag, style |
| `template` | template | Forma riutilizzabile senza contenuto: `composition` o `stylesheet`; orientamento di Alessio: anche il modo di vedere una `collection`, che un `chart` applica a dati diversi; distribuibile come `extension` | proposto | theme, preset |
| `slide template` | schema di slide | Disposizione predefinita di una `slide`, come titolo e contenuto | proposto | layout, master |
| `placement` | posizioni | Posizioni sistemate a mano nel `wire diagram`; file a parte | concetto deciso, nome proposto | layout |
| `auto arrange` | disposizione automatica | Disposizione automatica e stabile del `wire diagram` | concetto deciso, nome proposto | layout |
| `page` | pagina | Pagina del PDF o della `paged preview` | proposto | sheet |
| `running header` | intestazione di pagina | Testo ripetuto in cima alle pagine | proposto | header |
| `footnote` | nota | Nota a piè di pagina | proposto | note |
| `numbering` | numerazione | Numeri di figure, tabelle e capitoli calcolati dal `runtime` | proposto | counter |
| `cross-ref` | riferimento numerato | Riferimento a un `node` numerato | proposto | link |
| `size` | dimensione | Larghezza e altezza di una `page` o di una `slide` | proposto | dimension |
| `constraints` | layout a vincoli | Regole di allineamento e distribuzione al posto delle coordinate assolute; proposta non decisa | proposto | layout |

### 4.4 Dati e calcolo

| Nome | Italiano | Definizione | Stato | Da non usare |
|---|---|---|---|---|
| `collection` | tabella, lista moderna | Insieme con nome di `record` con identità e `field` tipizzati; può avere più `dimension` | deciso | list, table, array, sheet |
| `record` | elemento | Un elemento di una `collection` | concetto deciso, nome proposto | item, row, element |
| `field` | proprietà, colonna | Proprietà con nome e `type` di un `record` | concetto deciso, nome proposto | column, attribute, property |
| `type` | tipo | Tipo di un `field`: numero, testo, data, categoria e altri | concetto deciso, nome proposto | kind |
| `unit` | unità di misura | Unità facoltativa di un `field` numerico | proposto | measure |
| `field value` | valore | Valore di un `field` in un `record`, senza coordinate | concetto deciso, nome proposto | cell |
| `key` | chiave | `field`, o combinazione di `field`, che identifica un `record` | proposto | index |
| `id` | ID | Identificativo stabile di ogni `node`, per ogni `kind`: unico, di minuscole, cifre e trattino, mai riusato; per un `record` vale se manca una `key` | concetto deciso, nome proposto | uuid, ref |
| `relation` | relazione | `field` che collega `record` di due `collection` | concetto deciso, nome proposto | link, lookup |
| `dimension` | dimensione | `field` che fa da asse di una `collection` multidimensionale | concetto deciso, nome proposto | axis, category |
| `measure` | misura | `field` con i valori di una `collection` multidimensionale | proposto | value, metric |
| `long form` | forma lunga | Salvataggio con una riga per combinazione di `dimension` | proposto | tidy, flat |
| `record order` | ordine dei record | Ordine dei `record` salvato come dato, non come indirizzo | proposto | index, position |
| `view` | vista | Modo di mostrare una `collection`: `grid`, `board`, `calendar` | concetto deciso, nome proposto | layout, composition |
| `grid` | griglia | `view` a righe e colonne per inserire e guardare i dati | concetto deciso, nome proposto | sheet, table, spreadsheet |
| `pivot` | pivot | `grid` di una `collection` multidimensionale con le `dimension` su righe e colonne | proposto | cross table |
| `chart` | grafico | Oggetto che mostra graficamente una `collection`; il suo contenuto è una vista dei dati; orientamento: applica un `template` a una `collection`, con il campo per ogni ruolo | concetto deciso, nome proposto | graph, plot, view |
| `formula` | formula | Espressione con nome che calcola un `field` o un valore | concetto deciso, nome proposto | function, rule, calc |
| `computed field` | colonna calcolata | `field` i cui valori vengono da una `formula` | concetto deciso, nome proposto | calculated column |
| `override` | eccezione | Valore scritto a mano al posto del risultato di una `formula` di colonna, segnalato; ammissione da decidere | aperto | exception |
| `expression` | espressione | Calcolo senza nome dentro una `formula`, uno `step` o una `math line` | proposto | formula |
| `step` | passo | Trasformazione con nome da `collection` a `collection` | proposto | node, block |
| `wire` | connettore, cavo | Collegamento fra oggetti e `step`; file proprio | concetto deciso, nome proposto | connector, link, edge |
| `wire diagram` | vista a connettori | Vista generata dei `wire` | concetto deciso, nome proposto | graph, flow |
| `wire group` | raggruppamento | Gruppo con nome di elementi del `wire diagram`, apribile come livello | proposto | cluster, module |
| `dependency graph` | grafo delle dipendenze | Chi usa cosa fra `formula`, `collection` e codice, ricavato senza eseguire | proposto | graph |
| `check` | controllo | `node` che afferma una condizione, eseguito dal `runtime` | proposto | test, assert |
| `integration` | connettore del marketplace | `extension` che collega un servizio esterno: fonti di dati (database, API, file remoti), posta, calendari, video e media; con `permission` dichiarati e `static fallback` | concetto deciso, nome proposto | data source, source, connector, feed |
| `board` | board | `view` di una `collection` a colonne di schede | concetto deciso, nome proposto | kanban |
| `calendar` | calendario | `view` di una `collection` sulle date | concetto deciso, nome proposto | agenda |
| `reference` | riferimento | Nome di un concetto usato dentro un'`expression` | proposto | link, pointer |
| `inputs` | ingressi | Ciò da cui dipende un calcolo: valori, codice, `environment` | proposto | input (riservato al lettore) |
| `cache key` | chiave di cache | Hash degli `inputs` che identifica dei `results` salvati | proposto | key |

### 4.5 Codice, runtime e output

| Nome | Italiano | Definizione | Stato | Da non usare |
|---|---|---|---|---|
| `code block` | blocco di codice | Codice nel documento, con i marker `eval` ed `echo` | concetto deciso, nome proposto | cell, snippet |
| `eval` | da eseguire | Marker: il blocco viene eseguito | concetto deciso, nome proposto | run, exec |
| `echo` | da mostrare | Marker: il blocco viene mostrato | concetto deciso, nome proposto | show, display |
| `results` | risultati salvati | Output dei `code block`, una voce per `node` con chiave l'hash degli `inputs` | proposto | output, cache |
| `import` | codice esterno | Riferimento a codice fuori dal documento, fissato con hash | proposto | include, require |
| `lock` | versioni fissate | Elenco nel documento di `extension` e codice esterno con versione e hash | proposto | pin file |
| `runtime` | runtime | Processo separato che possiede i file, calcola e produce gli output | concetto deciso, nome proposto | engine, server, daemon |
| `evaluator` | motore di calcolo | Parte che valuta `formula` e dipendenze, nel `runtime` e nell'HTML esportato | proposto | engine, calc |
| `renderer` | motore di rendering | Componente che disegna un output: HTML ora, Typst più avanti | concetto deciso, nome proposto | engine, backend |
| `print browser` | browser di stampa | Browser di versione fissata che produce il PDF dall'HTML | concetto deciso, nome proposto | engine |
| `mode` | modalità | Scelta fra vista interattiva HTML e vista di scrittura per la stampa | concetto deciso, nome proposto | view |
| `model` | modello | Albero di `node` tipizzati con ID stabili, ricavato dal `source` | proposto | AST, graph |
| `node` | nodo | Unità tipizzata del `model` | proposto | element, block |
| `syntax tree` | albero di sintassi | Albero del `parser` che conserva i commenti | proposto | AST, CST |
| `parser` | parser | Legge il `source` e produce il `syntax tree` | proposto | reader |
| `formatter` | formatter | Stampa canonica del `source` (verbo `format`) | proposto | prettifier, linter |
| `resolved tree` | albero risolto | `model` con calcoli, riferimenti e `numbering` già risolti, letto dai `renderer` | proposto | AST |
| `frozen values` | valori fotografati | Valori calcolati all'`export` e salvati, visibili senza eseguire (verbo `freeze`) | concetto deciso, nome proposto | snapshot, cache |
| `static fallback` | forma statica | Forma di un oggetto interattivo o di un'`extension` dove non può essere eseguito | proposto | placeholder |
| `export` | esportare | Produrre HTML o PDF dal documento | concetto deciso, nome proposto | render, publish |
| `live export` | HTML vivo | HTML esportato che ricalcola nel browser | concetto deciso, nome proposto | live page |
| `static export` | HTML statico | HTML esportato senza ricalcolo | concetto deciso, nome proposto | snapshot |
| `print` | stampa | Produzione del PDF dall'HTML con il `print browser` | concetto deciso, nome proposto | export pdf |
| `input` | input del lettore | Controllo dell'HTML esportato con cui il lettore cambia un valore | concetto deciso, nome proposto | widget, control |
| `environment` | ambiente | Orologio, seme e fuso passati come `inputs` espliciti | proposto | context |
| `service` | servizio | Processo locale o in cloud che dà all'HTML file locali, codice pesante, fonti esterne e salvataggio | concetto deciso, nome proposto | server, backend |
| `reader`, `author` | lettore, chi scrive | Chi apre il documento esportato; chi lo scrive | proposto | user |
| `execution order` | ordine di esecuzione | Ordine in cui il `runtime` esegue i `code block`; da decidere | aperto | order |
| `output` | output | HTML o PDF prodotto da un `export` | proposto | result, render |
| `format` | formattare | Verbo del `formatter`: riscrivere il `source` nella forma canonica | proposto | print, prettify |
| `freeze` | fotografare | Verbo di `frozen values`: salvare i valori all'`export` | concetto deciso, nome proposto | snapshot |
| `diagnostic` | errore o avviso | Errore o avviso del `runtime` con un codice stabile, il file e, se c'è, un `fix` | proposto | problem, issue, lint |
| `fix` | suggerimento di correzione | Correzione proposta da un `diagnostic`; diversa dall'`hint`, che propone contenuto o collegamenti | proposto | hint, suggestion, quick fix |

### 4.6 App, CLI e protocolli

| Nome | Italiano | Definizione | Stato | Da non usare |
|---|---|---|---|---|
| `app` | app, editor | Client grafico del `runtime`: `source`, editing e `preview` | concetto deciso, nome proposto | editor, client |
| `preview` | anteprima | Resa del documento aggiornata dentro l'`app` | concetto deciso, nome proposto | view |
| `paged preview` | vista per pagina | `preview` divisa nelle `page` della stampa | concetto deciso, nome proposto | page view |
| `round-trip` | doppia scrittura | `source` ed editing grafico si generano a vicenda senza perdite | concetto deciso, nome proposto | sync |
| `operation` | operazione | Modifica atomica del `model` esprimibile nel `source`, la stessa da `app`, `cli` e `mcp server` | concetto deciso, nome proposto | command, action |
| `reconcile` | riconciliare | Integrare nel `model` le modifiche fatte fuori dall'`app` | concetto deciso, nome proposto | merge, sync |
| `semantic diff` | diff semantico | Confronto fra versioni a livello di `node` | proposto | smart diff |
| `cli` | riga di comando | Client del `runtime` da terminale, pensato anche per l'AI | concetto deciso, nome proposto | shell, tool |
| `language server` | server LSP | Parte del `runtime` che parla LSP | concetto deciso, nome proposto | lsp |
| `runtime protocol` | protocollo proprio | Protocollo fra `runtime` e client per `operation` e `preview` | concetto deciso, nome proposto | api |
| `mcp server` | server MCP | Espone le `operation` agli agenti AI | proposto | plugin, bot |
| `format schema` | schema dei formati | Schema JSON dei file e dell'output della `cli` | proposto | schema |

### 4.7 Specifica, estensioni, conformità

| Nome | Italiano | Definizione | Stato | Da non usare |
|---|---|---|---|---|
| `spec` | specifica | Il testo normativo dello standard | proposto | standard, docs |
| `spec version` | versione della semantica | Versione della specifica scritta in ogni documento | proposto | format version |
| `core` | nucleo | Ciò che ogni implementazione conforme sa leggere: `document`, `id`, `attributes`, `concept`, `association`, `directive`, `diagnostic` e `resolved tree` | proposto | base, kernel |
| `conformance class` | classe di conformità | Insieme di requisiti che un'implementazione dichiara di soddisfare: la classe 0 è il `core`, e ogni classe successiva corrisponde a un passo dell'ordine deciso dei livelli; aggiunge `kind` e attributi senza cambiare il significato di ciò che c'era | proposto | conformance level, profile, tier, level |
| `profile` | profilo | Sottoinsieme del linguaggio delle formule fissato dalla `spec` | proposto | dialect |
| `budget` | budget | Limite di tempo e memoria per una valutazione | proposto | quota, limit |
| `conformance suite` | corpus di conformità | Documenti d'esempio con il `resolved tree` atteso | proposto | tests, corpus |
| `extension` | estensione | Pacchetto che aggiunge `kind`, `template` o `integration` | concetto deciso, nome proposto | plugin, addon, package |
| `directive` | forma generica | Sintassi generica per `kind` non noti, e il `node` letto in quella forma: il `parser` lo legge e il `formatter` lo conserva anche senza l'`extension` | proposto | macro, tag |
| `sandbox` | sandbox | Ambiente isolato per il codice delle `extension` | proposto | container |
| `permission` | permesso | Accesso a rete e file dichiarato da `integration` ed `extension` | proposto | capability, grant |
| `registry` | marketplace, registro | Registro aperto e replicabile delle `extension` | proposto | store |
