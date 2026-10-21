# Specifica: `core` e classe 1

Bozza del 2026-10-21. Non è normativa finché Alessio non la approva. I nomi
seguono il [glossario](glossario.md). I tipi di contenuto si fissano sulla
bozza dei nodi, come ammette il glossario (§1.3). *(proposta)* Anche i codici
dei `diagnostic`, le chiavi del `resolved tree` e i loro valori (`error`,
`warning`, `display` e simili) sono identificatori provvisori, non ancora
nomi del prodotto: entrano nel glossario quando si fissano. Alcuni riusano
parole del glossario con un altro senso (`attributes`, `code`).

## 0. Come leggere questa bozza

**Marcature.**
- Nessuna marcatura: deciso. Il rimando fra parentesi quadre cita le prime
  parole della voce di [contesto.md](contesto.md), per esempio [C: «Ogni
  oggetto è un file»].
- *(proposta)*: viene dalla [bozza dei nodi](bozza-nodi.md), dall'orchestratore
  o da chi ha scritto questa bozza; resta da confermare. Il 2026-10-21 Alessio
  ha confermato cinque proposte della bozza: le classi di conformità, gli
  attributi sconosciuti ignorati con un avviso, gli `id reference` nel
  `core`, il nome `retired-ids.yaml` e lo `style` calcolato nel `resolved
  tree` [C: «Sulla bozza di specifica»]. I dettagli intorno restano proposte.
- **APERTO**: un punto che blocca la classe 1, con le opzioni e i loro costi.
  Il 2026-10-21 Alessio ha chiuso tutti quelli della bozza precedente; i §0.1-
  §0.7 riportano le decisioni e le proposte che ne seguono.

**Sintassi.** I file di testo sono Markdown con una sintassi nostra, come fa
Obsidian: CommonMark, `[[id]]`, `![[id]]` e un'intestazione YAML ristretta a
sole stringhe (§0.6). Gli esempi sono scritti in questa sintassi.

**Gli esempi sono test** *(proposta)*. Come nella specifica di CommonMark, ogni
esempio è un blocco aperto e chiuso da 32 backtick, con l'etichetta
`example N conf=C status=S`: C è la `conformance class` (§1); S è la
marcatura più debole fra le regole che l'esempio usa, escluso il formato del
`resolved tree`, che è proposta per tutti: `decided`, `proposal`, oppure
`open-0.N-X` per l'opzione X di un punto APERTO. Dentro:
- una riga `=== file <percorso>` apre un file di testo, che contiene le righe
  fino al marcatore successivo, ciascuna chiusa da LF;
- una riga `=== asset <percorso>` crea un file di zero byte;
- l'ultima sezione, `=== resolved`, è il `resolved tree` atteso (§11.3).

Uno script estrae i blocchi, scrive i file in una cartella vuota, esegue il
`runtime` e confronta gli alberi come valori JSON. Il testo di `message` e
`fix` non è normativo e non si confronta; la presenza del `fix` in ogni
errore sì, perché gli errori hanno codice e suggerimento di correzione [C:
«Lo strumento nasce con una riga di comando»].

### 0.1 Deciso: dove un file dice il suo `kind`

Alessio ha deciso [C: «Sulla bozza di specifica»]:
- per i file di testo, il `kind` va nell'estensione e dentro il file
  (`calo-q3.concept.md`), e il `runtime` controlla che coincidano (esempio
  15);
- immagini, CSV e il `canvas file` hanno un file descrittore, un file di
  testo con gli attributi che nomina il file vero (esempio 7);
- il `core` ha un elenco fisso di estensioni, così un file non cambia natura
  secondo la classe di chi lo legge.

I costi accettati: `turn into` rinomina il file. Git ritrova una rinomina per
somiglianza del contenuto, con soglia predefinita del 50%
([git diff](https://git-scm.com/docs/git-diff)), e `git log` la segue solo con
`--follow` ([git log](https://git-scm.com/docs/git-log)); un file molto corto,
o un `turn into` che ne riscrive il contenuto, risulta una cancellazione più
una creazione.

*(proposta)* L'elenco del `core`, uguale per tutte le classi:

| Estensione | Natura | `kind` e `id` |
|---|---|---|
| `.<kind>.md` | `source`, testo con intestazione | il `kind` nell'estensione e nell'intestazione; l'`id` nell'intestazione |
| `.stylesheet.css` | `source`, `stylesheet` | nel commento d'intestazione, come fa WordPress con `style.css` ([WordPress](https://developer.wordpress.org/themes/basics/main-stylesheet-style-css/)) |
| `retired-ids.yaml` | `source`, gli `id` ritirati | nome fisso (§0.3) |
| qualunque altra | `asset` | nessuno; diventa un nodo solo con un descrittore |

*(proposta)* Un file con un'estensione fuori dall'elenco è sempre un `asset`,
in ogni classe: una classe successiva non aggiunge estensioni `source`, ma
`kind` nuovi in `.<kind>.md`. Un CSV, un `.schema.json`, un'immagine o un
file `.canvas` sono quindi `asset`, e il loro descrittore è un `.<kind>.md`.
Il costo: una tabella diventa tre o quattro file (CSV, schema, descrittore, e
più avanti il file delle formule). *(proposta)* L'estensione dei file di
testo resta `.md`, perché GitHub e gli editor la riconoscono come Markdown.

La bozza mette nel primo livello `concept`, `text`, `image` e l'`article`;
*(proposta)* il §1 sposta il `concept` nel `core` e aggiunge `chapter`,
`scratch`, `stylesheet` e `canvas file`.

### 0.2 Deciso: un `text` è un blocco solo

Un `text` è un blocco solo: un capoverso, un elenco, una citazione [C: «Sulla
bozza di specifica»]. Ne segue che spostare un capoverso cambia solo la
`composition`, e che un elenco o una citazione sono oggetti a sé.

*(proposte)*
- Un `code block` e una `text table` sono blocchi anche loro, quindi possono
  fare un `text`. Un titolo invece no: i titoli sono `title` dei `chapter`
  (§0.7).
- Un `text` con più di un blocco, o con un titolo, è l'errore `text-blocks`
  (esempio 21). Il `fix` propone di dividerlo in più `text`.
- Lo spazio libero è un `kind` a sé, `scratch`, perché è un posto di lavoro e
  non un'unità di significato (proposta che segue dalla decisione, [C:
  «Sulla bozza di specifica»]): §7.3.

### 0.3 Deciso: identità e collegamenti che si rompono

Alessio ha deciso [C: «Sulla bozza di specifica»]:
- l'`id` è sempre scritto nel file. Lo scrive il `runtime` quando crea
  l'oggetto, e lo aggiunge ai file creati a mano (esempio 16). Una rinomina
  fuori dall'`app` non rompe niente;
- gli `id` ritirati, cancellati o fusi, stanno in un file del documento. Il
  «mai riusato» [C: «Attributi e id»] diventa un errore che il `runtime`
  controlla (esempio 19);
- un `id` si ritira solo con un'operazione dell'`app` o della `cli`, non
  quando un file sparisce, per esempio per un cambio di ramo. Il costo: una
  cancellazione fatta fuori dall'`app` non entra nel file, e per quell'`id` il
  «mai riusato» non scatta;
- la `target quote` arriva più avanti.

Il file degli `id` ritirati si chiama `retired-ids.yaml` [C: «Sulla bozza di specifica»].

*(proposte)*
- **L'`id` di un file creato a mano.** Il `runtime` dà l'errore `id-missing`,
  con un `fix` che propone l'`id`: il nome del file fino al primo punto, se è
  valido e libero, altrimenti uno ricavato dalle prime parole. Quando il
  `runtime` riconcilia, applica il `fix` e scrive l'`id` nel file. Non
  propone mai un `id` vivo o ritirato.
- **Il file.** Sta nella radice. È una mappa
  da ogni `id` ritirato al suo successore, o a `null` per un `id` cancellato,
  una riga per `id`, in ordine alfabetico. Chiavi e valori sono sempre
  stringhe, tranne `null`: in YAML `0123` si legge come un numero, e in
  PyYAML 6.0.3 anche `no`, `yes` e `on` diventano booleani (prova, insieme a
  js-yaml 4.3.2 e yaml 2.9.1, che leggono `0123` come 123):

  ```
  ritardi-agosto: ritardi-estate
  ritardi-luglio: ritardi-estate
  vecchia-intro: null
  ```

- **Chi lo scrive.** Il `runtime`, quando un'operazione cancella o fonde un
  oggetto. Aggiungere a mano la riga di un `id` vivo lo rende `id-reused`.
- **Niente catene.** Quando un successore viene a sua volta ritirato, il
  `runtime` riscrive le righe che puntavano a lui, come Zotero che, quando
  fonde, riscrive le relazioni verso l'elemento che resta
  ([mergeItems.mjs](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/mergeItems.mjs)).
- **Risoluzione.** Un riferimento a un `id` ritirato con successore si
  risolve sul successore, con un avviso e un `fix` che lo riscrive (esempio
  17). Senza successore, è un riferimento non risolto.
- **Dopo un merge.** Possono comparire catene (`a: b` e `b: c`), cicli (`a:
  b` e `b: a`) e successori che non esistono. Codici: `retired-chain`
  (avviso, il `fix` riscrive `a: c`), `retired-cycle` (errore),
  `retired-successor-missing` (errore). Nessuno ha ancora un esempio.
- **Costi.** Il file cresce sempre, e due rami che ritirano `id` vicini
  nell'ordine possono andare in conflitto nel merge: con una riga per `id` il
  conflitto è banale da risolvere.

### 0.4 Deciso: le righe di calcolo

Le righe di calcolo con il risultato in linea sono decise [C: «Lo spazio
libero per appunti»]. Alessio ha deciso [C: «Sulla bozza di specifica»]: il
risultato c'è già nella classe 1, con un'aritmetica minima; nel sorgente il
separatore decimale è il punto e non c'è un separatore delle migliaia;
«1.200» dà un avviso perché è ambiguo; il risultato si mostra secondo la
lingua; l'aritmetica è decimale.

*(proposte)*
- **Come si scrive.** Una riga di calcolo è un codice in linea che comincia
  con `=`: `` `= 1200 + 1350 + 1280` ``. Su GitHub e negli altri programmi si
  legge come codice. Il risultato non si scrive nel sorgente: il `runtime` lo
  mette nel `resolved tree` (esempio 20).
- **Grammatica.** Spazi ammessi fra i simboli; precedenza solita, da sinistra
  a destra a parità.

  ```
  expression = term { ("+" | "-") term }
  term       = factor { ("*" | "/") factor }
  factor     = [ "-" ] ( number | "(" expression ")" )
  number     = digit { digit } [ "." digit { digit } ]
  ```

- **L'ambiguità.** Un numero con un punto seguito da esattamente tre cifre,
  come `1.200`, si legge come decimale (1,2) e dà l'avviso
  `math-line-ambiguous`, con un `fix` che propone `1200` (esempio 22).
- **Precisione e arrotondamento.** Ogni operazione si calcola in decimale con
  34 cifre significative, la precisione del formato decimal128 di IEEE
  754-2008, e si arrotonda al pari (half-even). La somma, la differenza e il
  prodotto di numeri brevi sono quindi esatti: `0.1 + 0.2` dà 0,3.
- **La stringa da mostrare.** Il `runtime` scrive nel `resolved tree` il
  valore, con il punto, e la stringa da mostrare: arrotondata al pari a 10
  decimali al massimo, senza zeri finali, con il separatore decimale e delle
  migliaia del `lang`. Le regole di stampa per ogni `lang` sono fissate dalla
  specifica e non prese dal sistema, perché la stringa sia uguale
  dappertutto; senza `lang` la stringa è il valore. I `renderer` la
  applicano soltanto (§0.5).
- **Errori.** Una riga che non segue la grammatica, o che divide per zero,
  non ha risultato e dà l'avviso `math-line-invalid`.

### 0.5 Deciso: il CSS lo applica il `runtime`

Il CSS lo applica il `runtime`: calcola la cascata e scrive i valori finali
nel `resolved tree`, e chi disegna li applica soltanto [C: «Sulla bozza di
specifica»]. Per partire, un sottoinsieme minimo di solo testo (carattere,
colore, allineamento, margini, interlinea); la pagina si aggiunge dopo. Nella
specifica c'è un foglio di partenza, così titoli ed enfasi si vedono anche
senza uno `stylesheet` [C: «Sulla bozza di specifica»]. Lo `style` calcolato
dal `runtime` sta nel `resolved tree` (stessa voce).

*(proposte)*
- **Il sottoinsieme della classe 1:** `font-family` (le famiglie generiche
  `serif`, `sans-serif`, `monospace` e nomi di font), `font-size`,
  `font-weight`, `font-style`, `color`, `text-align`, i quattro `margin-*` e
  `line-height`. Ereditate, come in CSS: tutte tranne i margini.
- **Il foglio di partenza.** Lo applica il `runtime` prima degli
  `stylesheet` del documento. I selettori sono tipi del `resolved tree`, che
  solo la specifica usa:

  ```
  composition   { font-family: serif; font-size: 11pt; line-height: 1.4; }
  paragraph     { margin-bottom: 6pt; }
  title(1)      { font-size: 18pt; font-weight: 700; margin-top: 18pt; margin-bottom: 9pt; }
  title(2)      { font-size: 14pt; font-weight: 700; margin-top: 12pt; margin-bottom: 6pt; }
  title(3+)     { font-size: 11pt; font-weight: 700; margin-top: 9pt; margin-bottom: 3pt; }
  emphasis      { font-style: italic; }
  strong        { font-weight: 700; }
  inlineCode, code { font-family: monospace; }
  blockquote    { margin-left: 24pt; }
  list          { margin-left: 18pt; margin-bottom: 6pt; }
  ```

  `title(n)` è il titolo di un `chapter` al grado n (§0.7).
- **La forma dei valori.** Ogni nodo del contenuto di una `composition` porta
  negli attributi un oggetto `style`, con le proprietà il cui valore
  calcolato è diverso da quello che il foglio di partenza da solo darebbe a
  quel nodo. Il foglio di partenza è fisso nella specifica, come i valori
  iniziali del CSS: chi disegna lo applica tale e quale e sovrappone lo
  `style`, senza calcolare cascate. L'alternativa è scrivere ogni valore per
  ogni nodo: nessun foglio da conoscere, ma un `resolved tree` molto più
  grande. I valori sono i valori calcolati del CSS, scritti come stringhe:
  per `font-weight` è un numero (CSS Fonts 4, «Computed value: a number»,
  [css-fonts-4](https://drafts.csswg.org/css-fonts-4/#font-weight-prop)),
  quindi `bold` diventa `"700"`; lunghezze assolute in `pt`, colori in
  `#rrggbb` (esempio 8).
- **I selettori degli `stylesheet`.** Finché i tipi di contenuto hanno nomi
  provvisori (§11.3), solo selettori di `class`: un selettore su un tipo
  cambierebbe significato quando i nomi si fissano. I titoli si colpiscono
  con la `class` del loro `chapter`.
- **Il foglio del browser.** Il `renderer` HTML deve neutralizzare il foglio
  di stile predefinito del browser
  ([HTML §15.3](https://html.spec.whatwg.org/multipage/rendering.html#non-replaced-elements)),
  perché la fonte resti il `resolved tree` (inferenza).

### 0.6 Deciso: la sintassi dei file di testo

Markdown con una sintassi nostra, come fa Obsidian: CommonMark, `[[id]]`,
`![[id]]` e un'intestazione YAML ristretta a sole stringhe [C: «Sulla bozza di
specifica»]. Il confronto con le altre strade è nella nota
[ricerca/sintassi-testo.md](ricerca/sintassi-testo.md).

*(proposte)*
- **L'intestazione** sta fra due righe `---` in testa al file. Chiavi e
  valori sono stringhe o liste di stringhe; `null` vale solo in
  `retired-ids.yaml`. Un valore che YAML leggerebbe come numero, booleano o
  data (`0123`, `no`, `2026-10-21`) va fra virgolette, e il `formatter` ce lo
  mette.
- **Il corpo** è CommonMark più le regole del §7.4.
- **`![[id]]`** da solo in un capoverso è un `embed` di blocco; **`[[id]]`**
  e **`[[id|testo]]`** in linea sono un `id reference` (§10).
- **Non funziona dentro Obsidian così com'è:** Obsidian risolve `[[...]]` per
  nome del file o per alias, non per un `id` scritto nel file (nota di
  ricerca).

### 0.7 Deciso: il capitolo

L'opzione D di Alessio: il capitolo è una `composition` che si può
annidare; l'`article` è l'indice dei capitoli, e un `deck` usa gli stessi
capitoli senza ripetere i titoli [C: «Sulla bozza di specifica»]. Riformula le
regole sulle sezioni del modello di prima [C: «Attributi e id»]: un capitolo
si sposta come un'unità, si annida, e può non avere titolo.

*(proposte)*
- **Il nome e il `kind`:** `chapter`. Non section: Alessio l'ha ritirata
  (bozza-nodi.md §5), il glossario la vieta per altri concetti, e in Word una
  sezione è un gruppo di pagine con le sue impostazioni.
- **Il titolo** è l'attributo `title` nell'intestazione. È la forma più
  semplice: il corpo resta fatto solo di `embed`, e un capitolo senza
  `title` è una sezione senza titolo.
- **Il corpo** di un `chapter` contiene solo `embed`, di `object` o di altri
  `chapter`, in ordine di lettura, e righe di separazione (§7.4). Il grado di un titolo viene
  dall'annidamento, non dal file: lo stesso `chapter` è di grado 1
  nell'`article` e di grado 2 se lo si mette dentro un altro capitolo.
- **L'`article` e il `deck`** hanno un `title` e un corpo di soli `embed`,
  di `chapter` o di `object`.
- **Cicli.** Un `chapter` che contiene sé stesso, anche attraverso altri, è
  l'errore `embed-cycle`.
- Le due relazioni di Alessio restano distinte: l'aggregatore di dati della
  bozza (bozza-nodi.md §3) ripete lo stesso `template` su più dati, mentre il
  `chapter` ordina oggetti diversi; Alessio ha paragonato quell'aggregatore
  alla «section per le pagine» (bozza-nodi.md §7, idea 18).

### Nota: il `deck` per ultimo

Il principio dice che gli stessi mattoni *possono* dare documenti o
presentazioni completamente diversi [C: «Principio: l'aspetto incrementale»];
l'ordine dei livelli mette il `deck` per ultimo [C: «Ordine dei livelli»]. Le
due cose non si contraddicono: la classe 1 prepara mattoni, capitoli
compresi, che il `deck` userà senza copiarli. L'appendice B lo mostra.

## 1. Classi di conformità

Si procede per livelli, uno alla volta: contenuto e impaginazione, dati,
grafici, formule, connettori, e infine le presentazioni come `deck` [C: «Si
procede in modo incrementale»; C: «Ordine dei livelli»]. L'aspetto
incrementale è lo spirito di ogni cosa [C: «Principio: l'aspetto
incrementale»].

Le classi di conformità vanno da 0 a 6: la classe 0 è il `core`, le classi
da 1 a 6 sono i sei passi dell'ordine deciso, la 1 contenuto e impaginazione,
la 6 il `deck` [C: «Sulla bozza di specifica»]. Un attributo sconosciuto si ignora con un avviso (stessa
voce).

*(proposte; le prime quattro dell'orchestratore)*
- **Classi e `part`.** Una classe non è un `part`: la 1 unisce più `part`, e
  la 6 aggiunge un `kind` di `composition`. Il `canvas file` è assegnato qui
  alla classe 1.
- **Aggiungere soltanto.** Una classe aggiunge `kind`, attributi, ruoli e
  `template`, e non cambia il significato di un file valido per una classe
  precedente. Può riempire ciò che una classe precedente lascia vuoto: un
  nodo `directive` diventa un nodo del suo `kind`.
- **Completa da sola.** Un'implementazione dichiara la sua classe, ed è
  conforme se passa gli esempi di quella classe e delle precedenti.
- **`static fallback`.** Ogni `kind` oltre il `core` ne ha una, testo
  o immagine (§10).
- **Una `composition` cambia, gli oggetti no.** Fra un documento e una
  presentazione cambia la `composition`: la `composition` punta l'`object` [C:
  «La composition punta l'object»], e lo stesso oggetto sta in più
  `composition` [C: «L'oggetto richiamato sul foglio»].
- **Classe di un documento.** È la più alta fra le classi dei `kind` che usa.
  Il documento dichiara anche la `spec version` (§2).
- **Compatibilità in avanti.** L'attributo sconosciuto ignorato con un avviso
  (deciso, sopra) segue le proprietà sconosciute di CSS 2.1
  ([§4.2](https://www.w3.org/TR/CSS21/syndata.html#parsing-errors)), che però
  non parla di avvisi: così un documento scritto per una versione successiva
  si apre ancora.
- **Contenuto delle classi.** Il `core` comprende il documento (§2),
  l'identità (§3), gli attributi (§4), il `concept` (§5), l'`association`
  (§6), la `directive` e gli `id reference` (§10) e il `runtime` (§11). La
  classe 1 aggiunge `text`, `image`, `scratch`, `chapter`, `article`,
  `stylesheet` e il `canvas file`. La bozza mette il `concept` nel primo
  livello (§0.1).

## 2. Il documento

Un documento è un insieme di file più gli asset, in una cartella in chiaro o
in uno zip con un'estensione propria, e le due forme sono equivalenti [C: «Un
documento è un insieme di file sorgente»]. Il testo è la base di tutto, e
nulla esiste solo nell'interfaccia [C: «Il testo in chiaro è sempre la base»;
C: «L'oggetto richiamato sul foglio»]. Ogni oggetto è un file; orientamento:
i file stanno insieme e i livelli non sono cartelle [C: «Ogni oggetto è un
file»]. La configurazione sta in file di testo nella cartella [C: «Lo
strumento nasce con una riga di comando»].

*(proposte)*
- **`bundle`.** La radice dello zip contiene ciò che conterrebbe la cartella, e
  il `resolved tree` è lo stesso.
- **File letti.** Tutti, anche nelle sottocartelle, tranne quelli che
  cominciano con un punto. Le sottocartelle non hanno significato.
- **`source` e `asset`.** Lo decide l'elenco fisso di estensioni del `core`
  (§0.1): tutto ciò che non vi compare è `asset`. Un `asset` si nomina con un
  percorso relativo al file che lo usa, senza uscire dal documento.
- **Codifica.** UTF-8. Il `formatter` scrive senza BOM, con LF e un a capo
  finale; il `runtime` legge anche CRLF e BOM.
- **Nomi.** Il nome è l'`id` più l'estensione. Il nome non conta per
  l'identità, perché l'`id` è scritto nel file (§0.3). I nomi
  `retired-ids.yaml` e quello del file di configurazione sono riservati.
- **Configurazione del documento.** Il file di configurazione della cartella
  dichiara la `spec version` e il `lang` del documento. Il suo nome e se
  coincida con il `manifest`, che è aperto, restano da decidere. Il `runtime`
  risolve tutte le `composition`, quindi non serve un punto di partenza.
- **`canvas file`.** Il `canvas` salva solo posizioni e riferimenti, partendo
  da JSON Canvas [C: «Il foglio di bozze è un canvas»]. Il file `.canvas` è un
  `asset` con un descrittore di `kind` `canvas` (§0.1, deciso). JSON Canvas
  collega i file per percorso («the path to the file within the system»,
  [spec 1.0](https://jsoncanvas.org/spec/1.0/)): il `runtime` controlla quei
  percorsi e li riscrive alle rinomine. Riferirsi per `id` cambierebbe il
  formato, ed è da decidere.
- Gli URL esterni come `asset` sono una domanda aperta (handoff.md, domanda
  6).

## 3. Identità

L'`id` non è per forza numerico o incrementale, e può essere mnemonico; è
unico nel documento, fatto di minuscole, cifre e trattino, e non si riusa mai
[C: «Attributi e id»]. È sempre scritto nel file; gli `id` ritirati stanno in
un file del documento, e si ritirano solo con un'operazione [C: «Sulla bozza
di specifica»] (§0.3).

*(proposte)*
- La forma è `[a-z0-9]+(-[a-z0-9]+)*`.
- Un `id` vale per tutto il documento, qualunque sia il `kind`.
- `duplicate` crea una copia con un `id` nuovo. Una copia fatta fuori
  dall'`app` con lo stesso `id` è un `id` doppio (esempio 13). Quando un
  oggetto si divide, l'`id` resta a una delle parti, e i collegamenti si
  segnalano da rivedere.
- Il file degli `id` ritirati si chiama `retired-ids.yaml` (deciso, §0.3).

## 4. Attributi

I metadati sono di due gruppi: quelli comuni, che valgono per ogni nodo, e
quelli opzionali, che dipendono dal tipo [C: «Attributi e id»]. Ogni nodo ha
un `kind`; `id` e `tags` valgono per ogni `kind`, `class` e `lang` per i nodi
che si vedono; `lang` si eredita, da cosa è da precisare; `tags` e `class`
sono separati (stessa voce).

| Attributo | Gruppo | Valore *(proposta)* | Note |
|---|---|---|---|
| `id` | comune | §3 | deciso; sempre scritto (§0.3) |
| `kind` | comune | un `kind` della specifica o di un'`extension` | deciso; nell'estensione e nel file (§0.1) |
| `tags` | comune | lista di parole | deciso; *(proposta)* se manca vale la lista vuota |
| `class` | per i nodi che si vedono | lista di nomi in `kebab-case` | deciso |
| `lang` | per i nodi che si vedono | tag di lingua BCP 47 | deciso |
| `title` | `chapter`, `article`, `deck` | stringa | *(proposta)*, §0.7 |
| `origin` | da definire | da definire | *(proposta della bozza)*: scritto da una persona o generato e confermato |
| `associations` | `concept`, `object` | lista di `id` | *(proposta)*, §6 |

*(proposte)*
- **Nodi che si vedono**: `concept`, `text`, `image`, `scratch` (nell'`app`,
  non in una `composition`), `chapter`, `article`. Non lo sono lo
  `stylesheet` e il `canvas file`.
- **`lang` si eredita** dalla configurazione del documento (§2); un nodo può
  dichiarare il suo. L'alternativa, il `lang` della `composition` che lo
  usa, renderebbe italiano un testo inglese inserito in un articolo italiano.
- **Niente date né autore**, proposta della bozza: li ha Git. È
  un'inferenza, e non vale per un `bundle`, che non porta storia.
- **Niente attributo "nascosto"**: ciò che non deve uscire non sta in una
  `composition`.

## 5. Il `concept`

Il `concept` è l'unità di significato: un'idea con i suoi metadati e i
collegamenti agli `object` che la sviluppano, anche di `kind` diversi [C:
«L'unità di significato ha i metadati»]. È un file, con gli attributi e un
corpo: il testo dell'idea, in una o due frasi (definizione del glossario).
Non ha `embed` e non sa in quali `composition` è usato.

```````````````````````````````` example 1 conf=0 status=proposal
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
tags: [vendite, q3]
lang: it
---
Nel terzo trimestre le vendite calano per i ritardi nelle consegne.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "attributes": {"tags": ["vendite", "q3"], "lang": "it"}, "content": [["paragraph", "Nel terzo trimestre le vendite calano per i ritardi nelle consegne."]]}
  ]
}
````````````````````````````````

## 6. Le `association`

I collegamenti fra `concept` e `object` sono bilaterali: si scrivono da una
parte, dall'altra o da entrambe, indifferentemente [C: «I collegamenti fra
concept e object sono bilaterali»]. Restano da decidere: i collegamenti fra
due `object` (orientamento, [C: «Gli sviluppi di un concetto sono file
collegati»]), quelli fra due `concept` (bozza-nodi.md §6, domanda 1) e la
separazione fra associazioni e dipendenze (domanda 3).

*(proposte, dalla bozza §3)*
- L'`association` esiste se almeno uno dei due file la dichiara. Il `runtime`
  calcola l'unione, e il `resolved tree` dice chi la dichiara (esempi 3-5).
- Per toglierla va tolta da tutte e due le parti; lo fa un comando della
  `cli`. Il `formatter` non la sposta da un file all'altro.
- Un'`association` con un bersaglio inesistente è un errore visibile, e non
  compare fra le `associations` del `resolved tree` (esempio 6).
- Un'`association` con una `composition` o uno `stylesheet` è un errore: la
  `composition` usa gli oggetti con l'`embed` (esempio 18).

```````````````````````````````` example 2 conf=1 status=proposal
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
class: [evidenza]
---
Nel terzo trimestre le vendite sono calate del 12%, soprattutto per i
*ritardi* nelle consegne di agosto.
=== resolved
{
  "nodes": [
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "attributes": {"class": ["evidenza"]}, "content": [["paragraph", "Nel terzo trimestre le vendite sono calate del 12%, soprattutto per i ", ["emphasis", "ritardi"], " nelle consegne di agosto."]]}
  ]
}
````````````````````````````````

```````````````````````````````` example 3 conf=1 status=proposal
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
associations: [calo-q3-sintesi]
---
Nel terzo trimestre le vendite calano.
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
---
Le vendite sono calate del 12%.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "content": [["paragraph", "Le vendite sono calate del 12%."]]}
  ],
  "associations": [
    {"ids": ["calo-q3", "calo-q3-sintesi"], "declaredIn": ["calo-q3.concept.md"]}
  ]
}
````````````````````````````````

Dichiarato anche dall'oggetto, il collegamento resta uno:

```````````````````````````````` example 4 conf=1 status=proposal
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
associations: [calo-q3-sintesi]
---
Nel terzo trimestre le vendite calano.
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
associations: [calo-q3]
---
Le vendite sono calate del 12%.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "content": [["paragraph", "Le vendite sono calate del 12%."]]}
  ],
  "associations": [
    {"ids": ["calo-q3", "calo-q3-sintesi"], "declaredIn": ["calo-q3-sintesi.text.md", "calo-q3.concept.md"]}
  ]
}
````````````````````````````````

Dichiarato solo dall'oggetto, è lo stesso collegamento:

```````````````````````````````` example 5 conf=1 status=proposal
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
---
Nel terzo trimestre le vendite calano.
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
associations: [calo-q3]
---
Le vendite sono calate del 12%.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "content": [["paragraph", "Le vendite sono calate del 12%."]]}
  ],
  "associations": [
    {"ids": ["calo-q3", "calo-q3-sintesi"], "declaredIn": ["calo-q3-sintesi.text.md"]}
  ]
}
````````````````````````````````

```````````````````````````````` example 6 conf=0 status=proposal
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
associations: [calo-q3-sintesy]
---
Nel terzo trimestre le vendite calano.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "association-unresolved", "file": "calo-q3.concept.md", "target": "calo-q3-sintesy", "fix": "correggi l'id o togli il collegamento"}
  ]
}
````````````````````````````````

## 7. Gli `object` della classe 1

Ogni `object` è un file con il suo `kind`, e può avere o no un collegamento a
un `concept` [C: «Ogni oggetto è un file»; C: «La composition punta
l'object»].

### 7.1 `text`

Un `text` è un oggetto di prosa, con gli attributi e un corpo fatto di un
blocco solo (§0.2, deciso; esempio 2). Gli attributi del blocco sono quelli
del file.

Il contenuto interno è un inventario *(proposto)*; i tipi non hanno ancora un
nome (§11.3).

| Contenuto | Note |
|---|---|
| capoverso, elenco puntato e numerato, citazione | |
| `code block` | i marker per eseguire e per mostrare sono decisi [C: «Il codice nel documento porta un marker»], i nomi `eval` ed `echo` proposti; nella classe 1 un blocco da eseguire non si esegue (`eval-unsupported`) |
| `text table` | la tabella di GFM ([gfm](https://github.github.com/gfm/)), ammessa nella classe 1 *(proposta)*; non ancora `collection` |
| `math line` | decisa, con il risultato già nella classe 1 (§0.4) |
| enfasi, forte, codice in linea, collegamento a un URL | in linea |
| riferimento in linea | `[[id]]` o `[[id|testo]]`, un `id reference` (§10); se il nodo è numerato è un `cross-ref`, e la `numbering` è da precisare |
| interruzione di riga forzata | contenuto |
| `footnote` | |

Da decidere: l'`embed` dentro un `text`, che il glossario ammette.

### 7.2 `image`

Un `image` è un'immagine fatta fuori dal `runtime`, come una foto. Secondo la
bozza, un'immagine disegnata dal `runtime` è una vista generata e non si salva
come file (bozza-nodi.md §4).

Un'immagine ha un file descrittore (§0.1, deciso). *(proposta)* L'`image` è
quindi un file di testo con gli attributi, l'attributo `asset` e un corpo
con la descrizione, che serve agli screen reader ed è la sua `static
fallback`.

```````````````````````````````` example 7 conf=1 status=proposal
=== file lavagna.image.md
---
id: lavagna
kind: image
asset: lavagna.jpg
---
Foto della lavagna con le vendite mensili del 2026.
=== resolved
{
  "nodes": [
    {"id": "lavagna", "kind": "image", "file": "lavagna.image.md", "attributes": {"asset": "lavagna.jpg"}, "content": [["paragraph", "Foto della lavagna con le vendite mensili del 2026."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "asset-missing", "file": "lavagna.image.md", "target": "lavagna.jpg", "fix": "aggiungi il file o correggi il percorso"}
  ]
}
````````````````````````````````

### 7.3 `scratch` *(proposta)*

Lo spazio libero per appunti e calcoli sta dentro il contenuto, con le righe
di calcolo come in Soulver [C: «Lo spazio libero per appunti»]. Con un blocco
per `text` (§0.2) diventa un `kind` a sé, `scratch`: un posto di lavoro, non
un'unità di significato.
- Un `scratch` contiene quanti blocchi si vuole, titoli Markdown compresi, e
  le `math line` con il loro risultato (§0.4).
- Non si usa in una `composition`: un `embed` di uno `scratch` è
  `embed-kind`. Da lì si ricavano oggetti con `turn into`: un blocco diventa
  un `text`, una `text table` diventa una `collection`.
- Ha gli attributi e le `association`, così un appunto può già collegare un
  `concept`.

### 7.4 Markdown e impaginazione *(proposte)*

Alessio chiede se fra Markdown e `stylesheet` si rischiano sovrapposizioni.
Queste regole le evitano:
- **I segni dicono cosa è una cosa, non come appare.** Enfasi, forte, codice,
  collegamento, elenco, citazione: `**x**` è «forte», non «grassetto».
  L'aspetto viene solo dal foglio di partenza e dagli `stylesheet` (§0.5).
- **Niente HTML grezzo e niente stili in linea.** CommonMark li ammette, la
  nostra sintassi no. Un pezzo di HTML grezzo è l'errore `raw-html`, e nel
  `resolved tree` resta come testo letterale, così si vede e non disegna
  niente (esempio 23).
- **La struttura sta al suo posto.** I titoli sono `title` dei `chapter`
  (§0.7): un titolo Markdown in un `text` è `text-blocks`, in una
  `composition` è `composition-content`; solo uno `scratch` li ammette. Le
  interruzioni di riga forzate sono contenuto.
- **La riga di separazione `---`** è ammessa come linea, come in Obsidian
  ([Basic formatting syntax](https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Basic%20formatting%20syntax.md)),
  e il `formatter` le mette sempre una riga vuota prima e dopo (decisione di
  Alessio del 2026-10-21, con la sintassi Markdown). La riga vuota conta: in
  CommonMark `---` subito sotto una riga di testo fa di quella riga un titolo
  di secondo livello (prova con commonmark.js 0.31.2). Il parser non la
  confonde con l'intestazione, che vale solo in testa al file.
  *(proposte)* Sta nel corpo di un `chapter` o di un `article`, fra due
  `embed` (esempio 24), e in uno `scratch`; in un `text` è un blocco in più,
  quindi `text-blocks`. Nel `resolved tree` è `["thematicBreak"]`; la linea la
  disegna il `renderer` dal tipo, perché spessore e colore non sono nel
  sottoinsieme della classe 1.
- **GitHub e gli altri programmi** mostrano il Markdown con il loro aspetto:
  è un'anteprima, non l'impaginazione del documento.

## 8. Le `composition` della classe 1: `chapter` e `article`

La `composition` punta l'`object` [C: «La composition punta l'object»]. Lo
stesso oggetto può stare in più `composition`, ed è lo stesso oggetto, non
una copia [C: «L'oggetto richiamato sul foglio»]. Le `composition` danno il
`reading order` [C: «La lista a fianco ha sezioni per tipo»]. Il capitolo è
una `composition` che si può annidare, e l'`article` è l'indice dei capitoli
[C: «Sulla bozza di specifica»].

*(proposte)*
- La `composition` usa gli oggetti con l'`embed` per `id`. Quale `concept`
  presenta un oggetto lo si ricava dalle sue `association`.
- Il corpo di `chapter` e `article` contiene solo `embed` e righe di
  separazione `---` (§7.4); qualunque altro blocco, titoli compresi, è
  `composition-content` (esempio 10).
- Un `embed` di un `id` inesistente è un errore, e il `resolved tree` lo mostra
  al suo posto (esempio 9). Un `embed` di un `concept`, di uno `scratch`, di
  un `article` o di un `deck` è `embed-kind` (esempio 11); un `embed` di un
  `chapter` è ammesso.
- L'`article` e il `chapter` nominano il loro `stylesheet` con l'attributo
  `stylesheet`, scritto come `id reference` (§10); un `chapter` senza usa
  quello della `composition` che lo contiene.

```````````````````````````````` example 8 conf=1 status=proposal
=== file report-q3.article.md
---
id: report-q3
kind: article
title: Rapporto del terzo trimestre
stylesheet: "[[report]]"
---
![[cap-vendite]]
=== file cap-vendite.chapter.md
---
id: cap-vendite
kind: chapter
title: Le vendite
---
![[calo-q3-sintesi]]

![[lavagna]]
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
class: [evidenza]
---
Le vendite sono calate del 12%.
=== file lavagna.image.md
---
id: lavagna
kind: image
asset: lavagna.jpg
---
Foto della lavagna con le vendite mensili.
=== asset lavagna.jpg
=== file report.stylesheet.css
/*
kind: stylesheet
id: report
*/
.evidenza { font-weight: bold; }
=== resolved
{
  "nodes": [
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "attributes": {"class": ["evidenza"]}, "content": [["paragraph", "Le vendite sono calate del 12%."]]},
    {"id": "cap-vendite", "kind": "chapter", "file": "cap-vendite.chapter.md", "attributes": {"title": "Le vendite"}, "content": [["embed", {"id": "calo-q3-sintesi", "kind": "text", "class": ["evidenza"]}, ["paragraph", "Le vendite sono calate del 12%."]], ["embed", {"id": "lavagna", "kind": "image", "asset": "lavagna.jpg"}, ["paragraph", "Foto della lavagna con le vendite mensili."]]]},
    {"id": "lavagna", "kind": "image", "file": "lavagna.image.md", "attributes": {"asset": "lavagna.jpg"}, "content": [["paragraph", "Foto della lavagna con le vendite mensili."]]},
    {"id": "report", "kind": "stylesheet", "file": "report.stylesheet.css"},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "attributes": {"title": "Rapporto del terzo trimestre", "stylesheet": "report"}, "content": [["embed", {"id": "cap-vendite", "kind": "chapter", "title": "Le vendite", "depth": 1}, ["embed", {"id": "calo-q3-sintesi", "kind": "text", "class": ["evidenza"], "style": {"font-weight": "700"}}, ["paragraph", "Le vendite sono calate del 12%."]], ["embed", {"id": "lavagna", "kind": "image", "asset": "lavagna.jpg"}, ["paragraph", "Foto della lavagna con le vendite mensili."]]]]}
  ]
}
````````````````````````````````

Nel nodo del `chapter` lo `style` non c'è: dipende dalla `composition` in cui
il capitolo è usato, e lo calcola il nodo dell'`article`.

```````````````````````````````` example 9 conf=1 status=proposal
=== file report-q3.article.md
---
id: report-q3
kind: article
---
![[calo-q3-sintesy]]
=== resolved
{
  "nodes": [
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["embed", {"id": "calo-q3-sintesy", "unresolved": true}]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "embed-unresolved", "file": "report-q3.article.md", "target": "calo-q3-sintesy", "fix": "correggi l'id o togli l'embed"}
  ]
}
````````````````````````````````

```````````````````````````````` example 10 conf=1 status=proposal
=== file cap-vendite.chapter.md
---
id: cap-vendite
kind: chapter
title: Le vendite
---
Qui scrivo due righe di introduzione.
=== resolved
{
  "nodes": [
    {"id": "cap-vendite", "kind": "chapter", "file": "cap-vendite.chapter.md", "attributes": {"title": "Le vendite"}, "content": [["paragraph", "Qui scrivo due righe di introduzione."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "composition-content", "file": "cap-vendite.chapter.md", "fix": "sposta il capoverso in un text e mettine l'embed"}
  ]
}
````````````````````````````````

```````````````````````````````` example 11 conf=1 status=proposal
=== file report-q3.article.md
---
id: report-q3
kind: article
---
![[calo-q3]]
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
---
Nel terzo trimestre le vendite calano.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["embed", {"id": "calo-q3", "unresolved": true}]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "embed-kind", "file": "report-q3.article.md", "target": "calo-q3", "fix": "usa un object che sviluppa calo-q3"}
  ]
}
````````````````````````````````

## 9. Lo `stylesheet`

Il vocabolario dell'impaginazione è un sottoinsieme di CSS definito dalla
specifica, con proprietà traducibili anche per Typst [C: «Il vocabolario
dell'impaginazione»]; modello e impaginazione sono neutri rispetto al motore
[C: «Motori per fasi»]. Le regole le applica il `runtime`, che scrive i valori
nel `resolved tree`, con un sottoinsieme minimo di solo testo e un foglio di
partenza [C: «Sulla bozza di specifica»] (§0.5).

*(proposte)*
- Uno `stylesheet` è un file `.stylesheet.css`, coerente con la decisione del
  §0.1: il `kind` sta nell'estensione e nel commento d'intestazione, che
  porta anche l'`id` in righe `chiave: valore` (esempio 8).
- Le regole si agganciano ai nodi con `class`; gli `id` non sono selettori.
- Lo `stylesheet` non cambia il contenuto né il `reading order`.
- Una proprietà o un selettore fuori dal sottoinsieme si ignora con un
  avviso, come gli attributi sconosciuti (§1): così uno `stylesheet` scritto
  per una `spec version` successiva si apre ancora.

## 10. `directive`: `kind` non noti e riferimenti

La sintassi ha fin dall'inizio una forma generica per i `kind` non noti, che il
`parser` legge e il `formatter` conserva, e ogni oggetto di un'`extension` porta
una `static fallback` (proposte dell'orientamento [C: «Estensibilità:
estensioni e connettori»]).

*(proposte)*
- Un file con un `kind` che l'implementazione non conosce si legge come
  `directive`: attributi e `association` valgono, il resto si conserva, e nel
  `resolved tree` il nodo ha `"directive": true` (esempio 12). Vale fra
  classi: un'implementazione di classe 1 legge così un `chart` della classe 3.
- La `static fallback` di una `directive` è il suo corpo di testo, e un
  `embed` di una `directive` la mostra. Una `static fallback` in immagine, per
  esempio un grafico con i `frozen values`, tocca la domanda aperta sui
  risultati nel pacchetto (handoff.md, domanda 6).
- **`id reference`.** Il `core` ha una forma generica dei riferimenti per `id`
  [C: «Sulla bozza di specifica»]. *(proposta)* La forma:
  `![[id]]` per un blocco, `[[id]]` o `[[id|testo]]` in linea; negli
  attributi, la lista `associations` e un valore che è esattamente
  `"[[id]]"`, fra virgolette come nelle proprietà di Obsidian
  ([Properties](https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Properties.md)).
  Così il `runtime` controlla e riscrive i riferimenti anche dentro una
  `directive`: un `deck` letto da un'implementazione di classe 1 ha comunque
  i suoi `embed` controllati (esempio 12). Nel `resolved tree` un valore
  riferimento appare come l'`id` risolto. Resta un costo: ogni stringa
  scritta `"[[...]]"` diventa un riferimento, e per scriverla come testo
  serve una regola. Il riferimento in linea non ha ancora un esempio.

```````````````````````````````` example 12 conf=0 status=proposal
=== file linea-tempo.timeline.md
---
id: linea-tempo
kind: timeline
associations: [calo-q3]
see: "[[calo-q3]]"
---
Luglio: primi ritardi. Agosto: due fornitori in ritardo di tre settimane.
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
colore: rosso
---
Nel terzo trimestre le vendite calano.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "attributes": {"colore": "rosso"}, "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "linea-tempo", "kind": "timeline", "directive": true, "file": "linea-tempo.timeline.md", "attributes": {"see": "calo-q3"}, "content": [["paragraph", "Luglio: primi ritardi. Agosto: due fornitori in ritardo di tre settimane."]]}
  ],
  "associations": [
    {"ids": ["calo-q3", "linea-tempo"], "declaredIn": ["linea-tempo.timeline.md"]}
  ],
  "diagnostics": [
    {"severity": "warning", "code": "attribute-unknown", "file": "calo-q3.concept.md", "target": "colore"},
    {"severity": "warning", "code": "kind-unknown", "file": "linea-tempo.timeline.md", "target": "timeline"}
  ]
}
````````````````````````````````

## 11. Il `runtime`

Il `runtime` è un processo separato dall'`app` e possiede i file: applica le
modifiche dell'`app` passando dal `formatter` canonico, e riconcilia quelle
fatte da altri programmi o da Git [C: «Il motore è un runtime separato»; C: «Il
runtime possiede il file»]. Ogni operazione esiste anche nella `cli`, con
JSON a schema stabile ed errori con codice e suggerimento di correzione [C:
«Lo strumento nasce con una riga di comando»]. Nessuna dipendenza nasce in
silenzio [C: «Classificazione, collegamenti e promozioni automatiche»].

### 11.1 La risoluzione *(proposta)*

Il `runtime` prende la cartella o il `bundle` e produce un solo `resolved
tree`, che i `renderer` leggono senza ricalcolare [C: «Un solo punto di
calcolo», proposta]. I passi:

1. elenca i file e separa `source` e `asset` (§2);
2. legge di ogni `source` `kind`, `id`, attributi e corpo;
3. controlla forma e unicità degli `id` e i `kind`;
4. legge `retired-ids.yaml` e costruisce la mappa degli `id`;
5. calcola l'unione delle `association` e ne controlla i bersagli;
6. risolve gli `embed` e i capitoli annidati, gli `asset` e gli `stylesheet`
   nominati;
7. calcola le righe di calcolo e lo `style` di ogni nodo.

La risoluzione non si ferma a un errore: l'albero esce sempre, con il
`diagnostic` accanto. Con un errore la `cli` esce con un codice diverso da
zero e l'`export` si rifiuta. Lo stesso controllo gira dopo ogni merge e ogni
modifica esterna: Git non vede che un ramo ha cancellato un oggetto che un
altro collega (bozza-nodi.md §3). Un riferimento a un `id` doppio non si
risolve e non dà un secondo errore.

### 11.2 I `diagnostic` *(proposta)*

Ogni `diagnostic` ha `severity` (`error` o `warning`), `code`, `file`, e
secondo il codice `target` e `message`. Ogni errore ha anche un `fix` [C:
«Lo strumento nasce con una riga di comando»]; un avviso può averlo.

| Codice | Gravità | Quando | `target` | Esempio |
|---|---|---|---|---|
| `syntax` | error | il file non si legge | — | non coperto |
| `id-missing` | error | un file senza `id`; il `fix` propone l'`id`, che il `runtime` scrive quando riconcilia | — | 16 |
| `id-invalid` | error | `id` fuori forma | l'`id` | 14 |
| `id-duplicate` | error | due file, stesso `id`; uno per file | l'`id` | 13 |
| `id-reused` | error | un file vivo con un `id` ritirato | l'`id` | 19 |
| `kind-missing` | error | un file di testo senza `kind` | — | non coperto |
| `kind-file-extension-mismatch` | error | `kind` diverso dalla `file extension` | il `kind` scritto | 15 |
| `kind-unknown` | warning | `kind` non noto: `directive` | il `kind` | 12 |
| `attribute-unknown` | warning | attributo sconosciuto, ignorato | il nome | 12 |
| `attribute-invalid` | error | valore di forma sbagliata | il nome | non coperto |
| `association-unresolved` | error | bersaglio inesistente | l'`id` | 6 |
| `association-kind` | error | con una `composition` o uno `stylesheet` | l'`id` | 18 |
| `association-retired` | warning | bersaglio ritirato, risolto sul successore | l'`id` ritirato | 17 |
| `embed-unresolved` | error | `id` inesistente | l'`id` | 9 |
| `embed-kind` | error | `embed` di un `concept`, di uno `scratch`, di un `article` o di un `deck` | l'`id` | 11 |
| `embed-retired` | warning | `embed` di un `id` ritirato, risolto sul successore | l'`id` ritirato | non coperto |
| `embed-cycle` | error | un `chapter` che contiene sé stesso | l'`id` | non coperto |
| `retired-chain` | warning | in `retired-ids.yaml` un successore a sua volta ritirato | l'`id` | non coperto |
| `retired-cycle` | error | un ciclo fra successori | l'`id` | non coperto |
| `retired-successor-missing` | error | un successore che non esiste | l'`id` | non coperto |
| `text-blocks` | error | un `text` con più di un blocco, o con un titolo | — | 21 |
| `composition-content` | error | nel corpo di una `composition` un blocco che non è un `embed` né una riga di separazione | — | 10 |
| `raw-html` | error | HTML grezzo nel corpo | — | 23 |
| `math-line-invalid` | warning | riga di calcolo fuori grammatica, o divisione per zero | — | non coperto |
| `math-line-ambiguous` | warning | un numero come `1.200` | il numero | 22 |
| `eval-unsupported` | warning | blocco da eseguire nella classe 1 | — | non coperto |
| `asset-missing` | error | `asset` assente | il percorso | 7 |
| `stylesheet-unresolved` | error | `stylesheet` nominato assente | l'`id` | non coperto |
| `stylesheet-unsupported` | warning | proprietà o selettore fuori dal sottoinsieme, ignorato | la proprietà o il selettore | non coperto |
| `reference-unresolved` | error | `id reference` in un attributo senza bersaglio | l'`id` | non coperto |

```````````````````````````````` example 13 conf=0 status=proposal
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
---
Nel terzo trimestre le vendite calano.
=== file copia/calo-q3.concept.md
---
id: calo-q3
kind: concept
---
Nel terzo trimestre le vendite calano molto.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "calo-q3", "kind": "concept", "file": "copia/calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano molto."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "id-duplicate", "file": "calo-q3.concept.md", "target": "calo-q3", "fix": "dai un id nuovo a una delle copie"},
    {"severity": "error", "code": "id-duplicate", "file": "copia/calo-q3.concept.md", "target": "calo-q3", "fix": "dai un id nuovo a una delle copie"}
  ]
}
````````````````````````````````

```````````````````````````````` example 14 conf=0 status=decided
=== file calo-q3.concept.md
---
id: Calo_Q3
kind: concept
---
Nel terzo trimestre le vendite calano.
=== resolved
{
  "nodes": [
    {"id": "Calo_Q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "id-invalid", "file": "calo-q3.concept.md", "target": "Calo_Q3", "fix": "calo-q3"}
  ]
}
````````````````````````````````

Se `kind` ed estensione non coincidono, vince il `kind` scritto nel file:

```````````````````````````````` example 15 conf=0 status=proposal
=== file calo-q3.text.md
---
id: calo-q3
kind: concept
---
Nel terzo trimestre le vendite calano.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.text.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "kind-file-extension-mismatch", "file": "calo-q3.text.md", "target": "concept", "fix": "rinomina in calo-q3.concept.md"}
  ]
}
````````````````````````````````

Un file creato a mano senza `id` riceve l'`id` dal `runtime`, con un `fix`
(§0.3); nel `resolved tree` il nodo ha già l'`id` proposto:

```````````````````````````````` example 16 conf=1 status=proposal
=== file ritardi-agosto.text.md
---
kind: text
---
Ad agosto due fornitori hanno consegnato con tre settimane di ritardo.
=== resolved
{
  "nodes": [
    {"id": "ritardi-agosto", "kind": "text", "file": "ritardi-agosto.text.md", "content": [["paragraph", "Ad agosto due fornitori hanno consegnato con tre settimane di ritardo."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "id-missing", "file": "ritardi-agosto.text.md", "fix": "id: ritardi-agosto"}
  ]
}
````````````````````````````````

Un collegamento a un oggetto fuso in un altro si risolve sul successore:

```````````````````````````````` example 17 conf=1 status=proposal
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
associations: [ritardi-luglio]
---
Nel terzo trimestre le vendite calano.
=== file ritardi-estate.text.md
---
id: ritardi-estate
kind: text
---
A luglio e ad agosto i fornitori hanno consegnato in ritardo.
=== file retired-ids.yaml
ritardi-agosto: ritardi-estate
ritardi-luglio: ritardi-estate
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "ritardi-estate", "kind": "text", "file": "ritardi-estate.text.md", "content": [["paragraph", "A luglio e ad agosto i fornitori hanno consegnato in ritardo."]]}
  ],
  "associations": [
    {"ids": ["calo-q3", "ritardi-estate"], "declaredIn": ["calo-q3.concept.md"]}
  ],
  "diagnostics": [
    {"severity": "warning", "code": "association-retired", "file": "calo-q3.concept.md", "target": "ritardi-luglio", "fix": "ritardi-estate"}
  ]
}
````````````````````````````````

```````````````````````````````` example 18 conf=1 status=proposal
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
associations: [report-q3]
---
Nel terzo trimestre le vendite calano.
=== file report-q3.article.md
---
id: report-q3
kind: article
title: Rapporto del terzo trimestre
---
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "attributes": {"title": "Rapporto del terzo trimestre"}}
  ],
  "diagnostics": [
    {"severity": "error", "code": "association-kind", "file": "calo-q3.concept.md", "target": "report-q3", "fix": "togli report-q3 da associations"}
  ]
}
````````````````````````````````

Un `id` ritirato non si riusa:

```````````````````````````````` example 19 conf=0 status=proposal
=== file vecchia-intro.concept.md
---
id: vecchia-intro
kind: concept
---
Una nuova idea con un vecchio nome.
=== file retired-ids.yaml
vecchia-intro: null
=== resolved
{
  "nodes": [
    {"id": "vecchia-intro", "kind": "concept", "file": "vecchia-intro.concept.md", "content": [["paragraph", "Una nuova idea con un vecchio nome."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "id-reused", "file": "vecchia-intro.concept.md", "target": "vecchia-intro", "fix": "scegli un id nuovo"}
  ]
}
````````````````````````````````

Una riga di calcolo riceve il risultato nel `resolved tree` (§0.4):

```````````````````````````````` example 20 conf=1 status=proposal
=== file totale-q3.text.md
---
id: totale-q3
kind: text
---
Pezzi prodotti nel trimestre: `= 1200 + 1350 + 1280`.
=== resolved
{
  "nodes": [
    {"id": "totale-q3", "kind": "text", "file": "totale-q3.text.md", "content": [["paragraph", "Pezzi prodotti nel trimestre: ", ["mathLine", {"value": "3830", "display": "3830"}, "1200 + 1350 + 1280"], "."]]}
  ]
}
````````````````````````````````

Un `text` è un blocco solo:

```````````````````````````````` example 21 conf=1 status=proposal
=== file appunti-q3.text.md
---
id: appunti-q3
kind: text
---
Le vendite sono calate.

Le consegne sono arrivate tardi.
=== resolved
{
  "nodes": [
    {"id": "appunti-q3", "kind": "text", "file": "appunti-q3.text.md", "content": [["paragraph", "Le vendite sono calate."], ["paragraph", "Le consegne sono arrivate tardi."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "text-blocks", "file": "appunti-q3.text.md", "fix": "dividi in due text"}
  ]
}
````````````````````````````````

Un punto seguito da tre cifre è ambiguo, e si legge come decimale (§0.4):

```````````````````````````````` example 22 conf=1 status=proposal
=== file costo.text.md
---
id: costo
kind: text
---
Due lotti: `= 1.200 * 2`.
=== resolved
{
  "nodes": [
    {"id": "costo", "kind": "text", "file": "costo.text.md", "content": [["paragraph", "Due lotti: ", ["mathLine", {"value": "2.4", "display": "2.4"}, "1.200 * 2"], "."]]}
  ],
  "diagnostics": [
    {"severity": "warning", "code": "math-line-ambiguous", "file": "costo.text.md", "target": "1.200", "fix": "1200"}
  ]
}
````````````````````````````````

L'HTML grezzo resta testo letterale (§7.4):

```````````````````````````````` example 23 conf=1 status=proposal
=== file grassetto.text.md
---
id: grassetto
kind: text
---
Le vendite sono <b>calate</b>.
=== resolved
{
  "nodes": [
    {"id": "grassetto", "kind": "text", "file": "grassetto.text.md", "content": [["paragraph", "Le vendite sono <b>calate</b>."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "raw-html", "file": "grassetto.text.md", "fix": "usa **forte** e una class"}
  ]
}
````````````````````````````````

Una riga di separazione fra due `embed` (§7.4):

```````````````````````````````` example 24 conf=1 status=proposal
=== file cap-vendite.chapter.md
---
id: cap-vendite
kind: chapter
title: Le vendite
---
![[calo-q3-sintesi]]

---

![[ritardi-agosto]]
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
---
Le vendite sono calate del 12%.
=== file ritardi-agosto.text.md
---
id: ritardi-agosto
kind: text
---
Ad agosto due fornitori hanno consegnato in ritardo.
=== resolved
{
  "nodes": [
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "content": [["paragraph", "Le vendite sono calate del 12%."]]},
    {"id": "cap-vendite", "kind": "chapter", "file": "cap-vendite.chapter.md", "attributes": {"title": "Le vendite"}, "content": [["embed", {"id": "calo-q3-sintesi", "kind": "text"}, ["paragraph", "Le vendite sono calate del 12%."]], ["thematicBreak"], ["embed", {"id": "ritardi-agosto", "kind": "text"}, ["paragraph", "Ad agosto due fornitori hanno consegnato in ritardo."]]]},
    {"id": "ritardi-agosto", "kind": "text", "file": "ritardi-agosto.text.md", "content": [["paragraph", "Ad agosto due fornitori hanno consegnato in ritardo."]]}
  ]
}
````````````````````````````````

### 11.3 Il `resolved tree` *(proposta)*

È un valore JSON con tre liste; una lista vuota si omette.

- **`nodes`**: un elemento per `source`, tranne `retired-ids.yaml`, ordinati
  per `id` e poi per `file`. Ogni nodo ha `id`, `kind`, `file` (percorso con
  `/`), `attributes` (quelli dichiarati, con le chiavi come nel file, tranne
  `id`, `kind` e `associations`; si omette se vuoto), `content` (il corpo; si
  omette se il `kind` non ne ha o è vuoto) e `"directive": true` per i `kind`
  non noti.
- **`associations`**: una per coppia risolta, con `ids` (i due `id` in ordine)
  e `declaredIn` (i file che la dichiarano, in ordine); ordinate per `ids`.
- **`diagnostics`**: ordinati per `file`, `code` e `target`.

Gli ordini sono per punti di codice Unicode. Due alberi si confrontano come
valori JSON: l'ordine delle chiavi di un oggetto non conta, quello degli array
sì.

Il contenuto segue la forma di JsonML: un blocco o un pezzo in linea è un
array con il tipo, un oggetto di attributi facoltativo e i figli; il testo è
una stringa. Un a capo morbido diventa uno spazio, e stringhe vicine si
uniscono; l'HTML grezzo diventa testo. I nomi dei tipi sono presi da mdast
(`paragraph`, `emphasis`, `strong`, `list`, `listItem`, `blockquote`,
`code`, `inlineCode`, `link`, `break`, `thematicBreak`), più `embed` e
`mathLine`, con
`value` e `display`; non sono normativi finché la bozza non fissa i nomi
(glossario §1.3): alcuni collidono con il glossario, per esempio paragraph è
fra i *Da non usare* di `text`. Mancano ancora i tipi per `text table`,
`cross-ref` e la definizione di una `footnote`.

Nel contenuto di una `composition` un `embed` porta negli attributi `id`,
`kind`, il `lang` effettivo (quello dell'oggetto o, se manca, quello del
documento), e se ci sono `class` e `asset` dell'oggetto, il `title` e il
grado (`depth`) di un `chapter`, e lo `style` calcolato (§0.5); come figli,
il suo contenuto risolto. Un `embed` che non si risolve ha `"unresolved":
true` e nessun figlio. Così un `renderer` legge la `composition` senza
cercare altri nodi.

## Appendice A. Classi successive (non normativa)

Dove si aggancerà ciascuna al `core`.

- **Dati e `collection`** (classe 2). Un CSV o TSV, che è un orientamento [C:
  «Dati in CSV oppure TSV»], con il suo `schema` separato [C: «Tipi, chiavi e
  dimensioni si dichiarano»]; il CSV ha un descrittore (§0.1). È un
  `object`, con `association` ed `embed`.
- **Grafici** (classe 3). *(proposta della bozza)* Il `chart` applica un
  `template` a una `collection`, e un aggregatore lo ripete su più dati
  (bozza-nodi.md §3). Porta le dipendenze accanto alle `association`
  (domanda 3).
- **Formule** (classe 4). Orientamento: file separati per tipo [C: «Formule e
  connettori in file separati»]. *(proposta)* Estendono l'aritmetica delle
  `math line` (§0.4); il linguaggio delle formule è aperto, e c'è il rischio
  che non coincida con quell'aritmetica. Requisito di Alessio [C: «Sulla
  bozza di specifica»]: deve essere possibile usare una funzione dichiarata
  in un altro file, con argomenti numerici, elementi della stessa lista o
  anche range. Un range è un intervallo di valori di un campo, per esempio da
  marzo a giugno, oppure tutta la colonna; non un indirizzo, perché le celle
  non hanno coordinate [C: «Le celle non hanno coordinate»].
- **Connettori** (classe 5). Un file proprio, e un file per le posizioni
  sistemate a mano [C: «I connettori grafici sono un file a parte»].
  *(proposta)* Puntano gli `object` per `id`, nella forma generica del §10.
- **`deck`** (classe 6). Una `composition` fatta di `slide`, con gli stessi
  `embed` e gli stessi `chapter` [C: «Sulla bozza di specifica»]. Appendice
  B.
- **Collegamenti semantici.** *(proposta della bozza)* Un indice locale, mai
  nel sorgente, che propone `hint`; un `hint` confermato diventa
  un'`association`, quindi il `core` non cambia.

## Appendice B. Gli stessi capitoli in un `deck` (non normativa)

Il capitolo dell'esempio 8 in una presentazione. Nessun oggetto cambia né si
copia, e il titolo «Le vendite» non si ripete: cambia solo la `composition`.
Come un `deck` divide un capitolo in `slide` è inventato per l'esempio.

```
---
id: riunione-q3
kind: deck
title: Riunione del terzo trimestre
stylesheet: "[[riunione]]"
---
![[cap-vendite]]
```

Qui ogni `chapter` aprirebbe una `slide` con il suo `title`, e ogni `embed`
del capitolo ne riempirebbe una parte. L'`article` `report-q3` e questo
`deck` usano lo stesso `cap-vendite`: una correzione del capoverso o del
titolo arriva a tutti e due, e il `concept` `calo-q3` non sa né dell'uno né
dell'altro. Lo `stylesheet` `riunione` può dare alla `class` `evidenza` un
aspetto diverso da `report`.
