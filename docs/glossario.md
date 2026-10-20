# Glossario

Un nome per ogni concetto, un concetto per ogni nome. I nomi del prodotto
(oggetti, tipi, file, comandi, variabili, codice) sono in inglese; le
definizioni restano in italiano finché il repository è privato.

Regole:
- prima di usare un nome nuovo in un documento, nel codice o in un comando, lo
  si aggiunge qui;
- un nome già usato non si riusa per un concetto diverso;
- se un nome cambia, si cambia qui e in tutti i file nello stesso commit;
- **Stato** dice se il nome è deciso da Alessio o solo proposto;
- **Da non usare** elenca i sinonimi che creerebbero ambiguità.

## Conflitti da risolvere

Nei documenti di lavoro alcune parole italiane sono già state usate con più
significati. La tabella propone un nome inglese distinto per ciascuno.

| Parola usata | Significati diversi | Nomi proposti |
|---|---|---|
| layout | (1) l'impaginazione, cioè lo stile nel sottoinsieme di CSS; (2) una vista composta come documento o presentazione; (3) le posizioni sul foglio e dei connettori | `style`, `layout`, `placement` |
| lista | (1) la tabella pensata come lista moderna; (2) l'elenco puntato nel testo; (3) la lista a fianco del foglio | `collection`, `bullet list`, `navigator` |
| connettore | (1) il collegamento grafico fra oggetti; (2) l'estensione che porta dati da una fonte esterna | `wire`, `source` |
| foglio | (1) il foglio bianco di bozze; (2) in Excel, "sheet" è il foglio di calcolo | `canvas` (non `sheet`) |
| tabella | la griglia come vista e la tabella come dato | `grid` per la vista, `collection` per il dato |

## Documento e file

| Nome | Italiano | Definizione | Stato | Da non usare |
|---|---|---|---|---|
| `document` | documento | Insieme di file di testo, uno per livello, più gli asset; sta in una cartella o in uno zip | deciso il concetto, nome proposto | project, workbook |
| `package` | pacchetto | Il documento compresso in un unico zip con estensione propria; l'estensione è da scegliere | proposto | archive (usato per archiviare) |
| `asset` | asset | File non testuale del documento: immagini, font, dati grandi | proposto | attachment, resource |
| `layer` | livello | Uno dei tipi di file del documento: `content`, `style`, `data`, `formulas`, `wires`, `charts`, `slides` | deciso il concetto, nome proposto | level, tier |
| `schema` | schema | File che dichiara tipi, chiavi e dimensioni di una `collection` | deciso il concetto, nome proposto | header, metadata |
| `manifest` | manifest | File che dice da dove partire; esistenza da decidere | aperto | index |

## Foglio, oggetti e organizzazione

| Nome | Italiano | Definizione | Stato | Da non usare |
|---|---|---|---|---|
| `canvas` | foglio bianco, foglio di bozze | Superficie libera da cui si creano gli oggetti; all'apertura si vede questa | deciso il concetto, nome proposto | sheet, board, page |
| `object` | oggetto | Unità creata sul `canvas`: testo, `collection`, `chart`, immagine, e altri tipi da estensioni | deciso il concetto, nome proposto | element, block, node (riservato al modello) |
| `navigator` | lista a fianco | Pannello che organizza gli oggetti per tipo, con la sezione `inbox` e i `layout` | deciso il concetto, nome proposto | list, sidebar, library |
| `inbox` | da sistemare | Sezione del `navigator` con gli oggetti non ancora classificati | proposto | unsorted, misc |
| `archive` | archiviare | Azione: l'oggetto esce dal `canvas` e resta nel `navigator` | deciso il concetto, nome proposto | store, save |
| `recall` | richiamare | Azione: riportare sul `canvas` un oggetto archiviato; è lo stesso oggetto, non una copia | deciso il concetto, nome proposto | restore, copy |
| `focus` | vedere da solo | Aprire un oggetto da solo nella sua vista naturale | deciso il concetto, nome proposto | open, zoom |
| `duplicate` | duplicare | Azione esplicita che crea una copia indipendente | deciso il concetto, nome proposto | copy |
| `promote` | promuovere | Trasformare un pezzo del `canvas` in un tipo strutturato, per esempio testo in `collection` o in `chart` | deciso il concetto, nome proposto | convert, upgrade |
| `demote` | gesto inverso | Riportare un oggetto strutturato a testo libero; da decidere | aperto | downgrade |
| `suggestion` | suggerimento | Proposta automatica (classificazione, collegamento, promozione) che chi scrive conferma | deciso il concetto, nome proposto | auto-, smart- |
| `calc line` | riga di calcolo | Riga di testo con un calcolo e il risultato in linea | deciso il concetto, nome proposto | formula (riservato) |

## Layout e stile

| Nome | Italiano | Definizione | Stato | Da non usare |
|---|---|---|---|---|
| `layout` | vista layout | Composizione ordinata di oggetti per riferimento: documento, presentazione, pagina web | deciso il concetto, nome proposto | view (riservato), template |
| `style` | impaginazione | Regole di presentazione nel sottoinsieme di CSS della specifica | deciso il concetto, nome proposto | layout, theme |
| `template` | template | `layout` o `style` riutilizzabile, distribuibile come estensione | proposto | theme, preset |
| `placement` | posizioni | Posizioni sul `canvas` e dei nodi dei `wire` sistemate a mano; file a parte, base JSON Canvas | deciso il concetto, nome proposto | layout |
| `slide` | slide | Pagina a dimensione fissa di un `layout` di presentazione | proposto | page, frame |

## Dati e calcolo

| Nome | Italiano | Definizione | Stato | Da non usare |
|---|---|---|---|---|
| `collection` | tabella, lista moderna | Insieme con nome di elementi con identità e proprietà tipizzate; può avere più dimensioni | deciso il concetto, nome proposto | list, table, array, sheet |
| `item` | elemento | Un elemento di una `collection` | deciso il concetto, nome proposto | row, record |
| `field` | proprietà, colonna | Proprietà con nome e tipo di un `item` | deciso il concetto, nome proposto | column, attribute, property |
| `key` | chiave | `field` (o combinazione di `field`) che identifica un `item` | proposto | index |
| `id` | ID | Identificativo stabile di un `item` o di un oggetto, quando manca una chiave naturale | proposto | uuid, ref |
| `dimension` | dimensione | `field` che fa da asse di una `collection` multidimensionale | deciso il concetto, nome proposto | axis, category |
| `measure` | misura | `field` con i valori di una `collection` multidimensionale | proposto | value, metric |
| `view` | vista | Modo di mostrare una `collection`: `grid`, `board`, `calendar` | deciso il concetto, nome proposto | layout |
| `grid` | griglia | `view` a righe e colonne per inserire e guardare i dati | deciso il concetto, nome proposto | sheet, table, spreadsheet |
| `chart` | grafico | Vista grafica di una `collection`, oggetto a sé | deciso il concetto, nome proposto | graph, plot |
| `formula` | formula | Espressione con nome che calcola un `field` o un valore | deciso il concetto, nome proposto | function, rule |
| `wire` | connettore, cavo | Collegamento fra oggetti nella vista a connettori; file proprio | deciso il concetto, nome proposto | connector, link, edge |
| `source` | connettore dati | Fonte di dati esterna (database, API, file remoto), con permessi dichiarati | proposto | connector, feed |

## Codice e motore

| Nome | Italiano | Definizione | Stato | Da non usare |
|---|---|---|---|---|
| `code block` | blocco di codice | Codice nel documento, con i marker `run` e `show` | deciso il concetto, nome proposto | cell, snippet |
| `run` | da eseguire | Marker: il blocco viene eseguito | deciso il concetto, nome proposto | exec, eval |
| `show` | da mostrare | Marker: il blocco viene mostrato | deciso il concetto, nome proposto | echo, display |
| `runtime` | runtime, motore | Processo separato che possiede i file, calcola e produce gli output | deciso il concetto, nome proposto | engine, server, daemon |
| `engine` | motore di rendering | Componente che disegna un output: HTML ora, Typst più avanti | deciso il concetto, nome proposto | renderer, backend |
| `resolved tree` | albero risolto | Modello con calcoli, riferimenti e numerazioni già risolti, letto dagli `engine` | proposto | AST, model |
| `snapshot` | valori fotografati | Valori calcolati all'export e salvati, visibili senza eseguire nulla | deciso il concetto, nome proposto | cache, frozen |
| `static fallback` | forma statica | Forma che un oggetto interattivo o di un'estensione assume dove non può essere eseguito | proposto | placeholder |
| `export` | esportare | Produrre HTML o PDF dal documento | deciso il concetto, nome proposto | render, publish |
| `cli` | riga di comando | Client del `runtime` da terminale, pensato anche per l'AI | deciso il concetto, nome proposto | shell, tool |
| `mcp server` | server MCP | Espone le operazioni della `cli` agli agenti AI | proposto | plugin, bot |
| `formatter` | formatter | Stampa canonica del testo sorgente | proposto | prettifier, linter |

## Estensioni

| Nome | Italiano | Definizione | Stato | Da non usare |
|---|---|---|---|---|
| `extension` | estensione | Pacchetto che aggiunge tipi di oggetto, `template` o `source` | proposto | plugin, addon, module |
| `registry` | marketplace | Registro aperto e replicabile delle estensioni | proposto | store, marketplace |
