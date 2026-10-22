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
  `core`, il nome `retired-ids.yaml` e lo stile calcolato nel `resolved
  tree` [C: «Sulla bozza di specifica»]. I dettagli intorno restano proposte.
- **APERTO**: un punto che blocca la classe 1, con le opzioni e i loro costi.
  Il 2026-10-21 Alessio ha chiuso quelli della bozza precedente, e i §0.1-
  §0.7 riportano le decisioni e le proposte che ne seguono; lo stesso giorno
  ha deciso anche i §0.8-§0.17. Non restano punti APERTI.

**Sintassi.** I file di testo sono Markdown con una sintassi nostra, come fa
Obsidian: CommonMark, `[[id]]`, `![[id]]` con le `class` scritte accanto,
`{.nota}` (§0.15), e un'intestazione YAML ristretta a sole stringhe (§0.6).
Gli esempi sono scritti in questa sintassi.

**Gli esempi sono test** *(proposta)*. Come nella specifica di CommonMark, ogni
esempio è un blocco aperto e chiuso da 32 backtick, con l'etichetta
`example N conf=C status=S`: C è la `conformance class` (§1); S è la
marcatura più debole fra le regole che l'esempio usa, escluso il formato del
`resolved tree`, che è proposta per tutti: `decided`, `proposal`, oppure
`open-0.N-X` per l'opzione X di un punto APERTO. Dentro:
- una riga `=== file <percorso>` apre un file di testo, che contiene le righe
  fino al marcatore successivo, ciascuna chiusa da LF;
- una riga `=== asset <percorso>` crea un file di zero byte;
- una riga `=== no-document` dice allo script di non creare il `document file`
  (esempio 31);
- l'ultima sezione, `=== resolved`, è il `resolved tree` atteso (§11.3).

*(proposta)* Gli esempi sono in forma non canonica in due punti, per restare
corti: quasi nessun file scrive `tags: []`, che il `formatter` aggiungerebbe
(§0.12), e quasi nessun esempio ha il `document file`. Se manca, lo script
crea `doc.document.md` con `id: doc`, `kind: document`, `tags: []` e
`spec-version: "0.1"`, la versione di questa bozza, così gli esempi non danno
`spec-version-missing`; nel `resolved tree` il `document file` compare nella
chiave `document` solo se ha attributi oltre a `id`, `kind`, `tags` e
`spec-version` (esempio 25).

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
- immagini, CSV e il `canvas file` hanno un `descriptor`, un file di testo con
  gli attributi che nomina il file vero (esempio 7);
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
file `.canvas` sono quindi `asset`, e il loro `descriptor` è un
`.<kind>.md`; *(proposta)* per il `canvas file` il `kind` si scrive
`canvas-file`, in `kebab-case` come i nomi di file (glossario, N1).
Il costo: una tabella diventa tre o quattro file (CSV, schema, descrittore, e
più avanti il file delle formule). *(proposta)* L'estensione dei file di
testo resta `.md`, perché GitHub e gli editor la riconoscono come Markdown.

La bozza mette nel primo livello il contenuto (testo, titoli, immagini, righe
di calcolo), lo spazio libero, l'`article` e lo `stylesheet`
(bozza-nodi.md, in testa); *(proposta)* il §1 sposta il `concept` nel `core` e
aggiunge `chapter` e `canvas file`.

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
  l'oggetto, e lo aggiunge ai file creati a mano (esempio 16);
- gli `id` ritirati, cancellati o fusi, stanno in un file del documento. Il
  «mai riusato» [C: «Attributi e id»] diventa un errore che il `runtime`
  controlla (esempio 19);
- un `id` si ritira solo con un'operazione dell'`app` o della `cli`, non
  quando un file sparisce, per esempio per un cambio di ramo. Il costo: una
  cancellazione fatta fuori dall'`app` non entra nel file, e per quell'`id` il
  «mai riusato» non scatta;
- la `target quote` arriva più avanti.

Il file degli `id` ritirati si chiama `retired-ids.yaml` [C: «Sulla bozza di specifica»].

Ne segue che rinominare un file fuori dall'`app` non rompe i collegamenti per
`id`. Le eccezioni: un `asset`, che si nomina con un percorso relativo (§2);
i percorsi del `canvas file` (§0.11); e il cambio di `kind`, che cambia
l'estensione e quindi chiede di rinominare insieme il `kind` scritto nel file
(esempio 15).

*(proposte)*
- **L'`id` di un file creato a mano.** Finché il `runtime` non lo scrive, il
  file non ha un `id`: è l'errore `id-missing`, e nel `resolved tree` il nodo
  non ha `id` (esempio 16). L'`id` proposto sta solo nel `fix`: il nome del
  file fino al primo punto, se è valido e libero, altrimenti uno ricavato
  dalle prime parole, mai un `id` vivo o ritirato. Quando il `runtime`
  riconcilia, applica il `fix` e scrive l'`id` nel file. Nel frattempo un
  riferimento a quel nome non si risolve.
- **Il file.** Sta nella radice; un `retired-ids.yaml` in una sottocartella
  è un `asset`. Chiavi e successori seguono la forma degli `id` (§3): uno
  fuori forma è `id-invalid`, nel file `retired-ids.yaml`, ma la riga resta
  e catene, cicli e successori si controllano lo stesso. È una mappa
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
  `retired-successor-missing` (errore). Un `id` i cui successori finiscono
  in un ciclo è `retired-cycle`, non `retired-chain`. Nessuno ha ancora un
  esempio.
- **Costi.** Il file cresce sempre, e due rami che ritirano `id` vicini
  nell'ordine possono andare in conflitto nel merge: con una riga per `id` il
  conflitto è banale da risolvere.

### 0.4 Deciso: le righe di calcolo

Le righe di calcolo con il risultato in linea sono decise [C: «Lo spazio
libero per appunti»]. Alessio ha deciso [C: «Sulla bozza di specifica»]: il risultato c'è già nella
classe 1, con un'aritmetica minima e decimale; nel file un numero è fatto
solo di cifre e del punto per i decimali, «unità.decimali», senza separatori
delle migliaia, oppure in notazione scientifica (`1.2e6`); i suffissi di
scala (K, M, T) non stanno mai nel file; «1.200» dà un avviso; i numeri a
schermo seguono la lingua dell'oggetto, altrimenti quella del documento.

Nell'`app` un italiano scrive come è abituato, con la virgola decimale, il
punto delle migliaia e anche «1,2M», e l'`app` salva nel file la forma con il
punto (stessa voce). È un comportamento dell'`app`, non del formato.

*(proposte)*
- **Come si scrive.** Una riga di calcolo si scrive fra backtick, come un
  codice in linea, e comincia con `=` e uno spazio: `` `= 1200 + 1350 + 1280` ``,
  anche dentro una frase. La regola vale per il contenuto del codice in
  linea come lo dà CommonMark, dopo la sua normalizzazione: un a capo
  diventa uno spazio, e se il contenuto comincia e finisce con uno spazio se
  ne toglie uno per parte ([Code spans](https://spec.commonmark.org/0.31.2/#code-spans)).
  Su GitHub e negli altri programmi si legge come codice. Lo spazio serve a lasciare codice una formula di foglio di calcolo
  come `` `=SOMMA(A1:A3)` ``: in CommonMark dentro un codice in linea non c'è
  una via di fuga (verificato con commonmark.js 0.31.2). Il costo: «`=1+1`»
  senza spazio è codice, non una riga di calcolo, e chi lo scrive per sbaglio
  non vede un risultato. Il risultato non si scrive nel sorgente: il
  `runtime` lo mette nel `resolved tree` (esempio 20). Una riga senza
  risultato è `["mathLine", {"invalid": true}, "1 / 0"]`.
- **Come si vede.** Nell'HTML esportato una riga di calcolo mostra il suo
  `display`, e l'espressione si vede come tooltip [C: «Sulla bozza di specifica»].
  *(proposta)* Una riga senza risultato mostra l'espressione com'è
  nell'albero, senza tooltip.
- **Grammatica.** Spazi ammessi fra i simboli; precedenza solita, da sinistra
  a destra a parità.

  ```
  expression = term { ("+" | "-") term }
  term       = factor { ("*" | "/") factor }
  factor     = [ "-" ] ( number | "(" expression ")" )
  number     = digit { digit } [ "." digit { digit } ] [ exponent ]
  exponent   = ( "e" | "E" ) [ "+" | "-" ] digit { digit }
  ```

- **L'esponente.** *(proposte)* Il limite sta sul valore, non sull'esponente
  scritto. L'esponente aggiustato è l'esponente più il numero di cifre del
  coefficiente meno uno (Cowlishaw, [General Decimal Arithmetic](http://speleotrove.com/decimal/damodel.html));
  decimal128 ha Emax 6144 ed Emin −6143 (la panoramica, non normativa, in
  [dbover](http://speleotrove.com/decimal/dbover.html)). Una riga è
  `math-line-invalid` quando un numero non nullo, letto esatto, o un
  risultato non nullo ha l'esponente aggiustato fuori da [−6143, 6144]:
  `99e6144` va fuori, `0.001e6146`, che vale 1e6143, no; `0e7000` è zero.
  Leggere esatto e senza subnormali è una scelta della bozza: in decimal128
  l'overflow si controlla dopo l'arrotondamento a 34 cifre, e i subnormali
  sono rappresentabili. Il `formatter` non normalizza
  `1E6` né `1.20`: li lascia come sono. Per «1,2M» l'`app` scrive il numero
  pieno, `1200000`.
- **L'ambiguità.** *(proposta)* L'avviso vale solo senza esponente: chi scrive
  in notazione scientifica non usa separatori delle migliaia, quindi
  `1.200e3` è 1,2 × 10³, cioè 1200, e il `fix` «1200» lo cambierebbe in
  1200e3. Un
  numero senza esponente, con la parte intera diversa da zero e un punto
  seguito da esattamente tre cifre, come `1.200`, si legge come decimale (1,2) e dà l'avviso
  `math-line-ambiguous`, con un `fix` che propone `1200` (esempio 22). `0.123`
  non dà l'avviso: con lo zero davanti non può essere 123.
- **Precisione e arrotondamento.** Ogni numero letto e ogni operazione si
  calcolano in decimale con 34 cifre significative, la precisione del formato decimal128 di IEEE
  754-2019, e si arrotonda al pari (half-even). La somma, la differenza e il
  prodotto di numeri brevi sono quindi esatti: `0.1 + 0.2` dà 0,3. Un numero
  con più di 34 cifre si arrotonda già quando si legge, così `= x` e
  `= x + 0` danno lo stesso `value`; «letto esatto» vale solo per il
  controllo dell'intervallo, sopra.
- **Il valore** si scrive nel `resolved tree` con il punto, senza zeri finali
  dopo il punto e senza esponente: in decimale `1.200 * 2` dà 2.400, che si
  scrive `2.4` (prova con il modulo decimal di Python), e `1.2e6` si scrive
  `1200000`. Uno zero col segno meno si scrive senza segno: `-0` e `0 * -1`
  hanno `value` e `display` «0», e `= -1e-11`, che nel `display` arrotonda a
  zero, mostra «0», con o senza lingua.
- **La stringa da mostrare.** Il `runtime` scrive accanto al valore la
  stringa da mostrare: arrotondata al pari a 10 decimali al massimo, senza
  zeri finali, con i separatori della lingua dell'oggetto, altrimenti di
  quella del documento (§0.8, esempio 25); senza lingua la stringa è il
  valore arrotondato allo stesso modo, con il punto e senza separatore
  delle migliaia. I `renderer` la applicano soltanto (§0.5). Le regole di stampa sono
  fissate dalla specifica e non prese dal sistema, perché la stringa sia
  uguale dappertutto. Per `it` e `en`, da CLDR 48 (cldr-json 48.2.3,
  [numbers.json](https://github.com/unicode-org/cldr-json/tree/main/cldr-json/cldr-numbers-full/main)):

  | `lang` | Decimale | Migliaia | Meno | Raggruppa da |
  |---|---|---|---|---|
  | `it` | `,` | `.` | `-` (U+002D) | 5 cifre (`minimumGroupingDigits` 2): 1200, 12.000 |
  | `en` | `.` | `,` | `-` (U+002D) | 4 cifre (`minimumGroupingDigits` 1): 1,200 |

- **Le forme brevi** («1,2 Mln», «1.2M») sono una scelta di stile, da fuori
  [C: «Sulla bozza di specifica»]. *(proposte)* Si dichiarano nello `stylesheet` con la proprietà
  personalizzata `--number-notation`, `standard` se non è data, oppure
  `compact`. Il nome `standard` viene da ECMA-402, che chiama così la forma
  piena accanto a `scientific`, `engineering` e `compact`; prima la bozza
  diceva `plain`. Il valore iniziale CSS di una proprietà personalizzata è il
  «guaranteed-invalid value», non `standard`: è la bozza a leggere come
  `standard` lo stato «non data». È CSS valido, perché una proprietà personalizzata è «any
  property whose name starts with two dashes», ed è ereditata
  ([CSS Custom Properties](https://www.w3.org/TR/css-variables-1/)). Così si
  può dare per `class`, per esempio solo in un capitolo o in un `deck`. È
  l'unica proprietà personalizzata del sottoinsieme, e lo allarga oltre il
  minimo deciso (carattere, colore, allineamento, margini, interlinea).
  Le soglie valgono sul valore assoluto: -1500 dà «-1,5K». Senza lingua,
  `compact` dà la stringa senza lingua. Il `runtime` la consuma per scrivere `display` e non la mette nel
  `computed style`. Con `compact` il `display` divide il valore per mille, un
  milione, un miliardo o mille miliardi, lo arrotonda al pari a un decimale,
  toglie lo zero finale e usa la forma breve di CLDR 48: in `it` «0K», «0
  Mln», «0 Mld», «0 Bln», in `en` «0K», «0M», «0B», «0T». Lo spazio in «0
  Mln» è il non-breaking space U+00A0, come in CLDR. Sotto mille resta la
  forma piena. Il divisore si sceglie sul valore già arrotondato: 999950 dà
  «1 Mln» e «1M», non «1000K». Arrotondare sempre a un decimale è una scelta
  che differisce dalle librerie: in `en`, `Intl.NumberFormat` con `notation:
  "compact"` ([ECMA-402 §16.1.1](https://tc39.es/ecma402/#sec-intl.numberformat))
  dà «123K» per 123456, la bozza «123.5K»; in `it` Node 22 (ICU 77.1, CLDR 47)
  non abbrevia sotto il milione e dà «123.456» (prova). «0K» per `it`
  è nuovo in CLDR 48: in CLDR 47 il modello era «0», quindi una libreria su
  CLDR 47 non coincide (prova su cldr-json 47.0.0 e 48.2.3).
- **Dove sta il `display` compatto.** Nel contenuto dell'`embed` dentro la
  `composition` radice, perché dipende dallo `stylesheet` di quella
  `composition`; il nodo del `text` resta con la forma piena. Lo stesso
  `text` può quindi avere `display` diversi in `composition` diverse, come il
  numero di un `cross-ref`.
- **Le lingue.** *(proposta)* La specifica ha una tabella delle lingue che
  supporta, oggi `it` ed `en`. Un tag con regione cerca prima la riga
  esatta, perché CLDR ha regole proprie per alcune regioni, poi la lingua
  senza regione. Con la tabella di oggi `it-CH` ricade su `it` e mostra la
  virgola, mentre CLDR 48 gli dà il punto decimale e l'apostrofo U+0027 per
  le migliaia (in CLDR 47 era U+2019): è un ripiego voluto, per ora. Una
  lingua fuori tabella mostra la stringa senza lingua, con l'avviso
  `lang-unsupported`, una volta per file e solo se il file ha righe di
  calcolo da mostrare.
- **Errori.** Una riga che non segue la grammatica, che divide per zero o che
  esce dall'intervallo di decimal128 non ha risultato e dà l'avviso
  `math-line-invalid`.

### 0.5 Deciso: il CSS lo applica il `runtime`

Il CSS lo applica il `runtime`: calcola la cascata e scrive i valori finali
nel `resolved tree`, e chi disegna li applica soltanto [C: «Sulla bozza di
specifica»]. Per partire, un sottoinsieme minimo di solo testo (carattere,
colore, allineamento, margini, interlinea); la pagina si aggiunge dopo. Nella
specifica c'è un foglio di partenza, così titoli ed enfasi si vedono anche
senza uno `stylesheet` [C: «Sulla bozza di specifica»]. Lo stile calcolato
dal `runtime` sta nel `resolved tree` (stessa voce); il nome `computed style`
è una proposta, perché style è fra i nomi evitati dal glossario e collide con
l'attributo HTML.

*(proposte)*
- **Il sottoinsieme della classe 1:** `font-family` (le famiglie generiche
  `serif`, `sans-serif`, `monospace` e nomi di font), `font-size`,
  `font-weight`, `font-style`, `color`, `text-align`, i quattro `margin-*`,
  `line-height` e `text-decoration-line` [C: «Sulla bozza di specifica»], più la proprietà
  personalizzata `--number-notation` (sotto). Ereditate, come in CSS: tutte
  tranne i margini e `text-decoration-line`.
- **I valori ammessi**, quelli che il `runtime` sa calcolare senza sapere
  come si disegna:
  - lunghezze assolute (`pt`, `px`, `mm`, `cm`, `in`), `em` e lo zero senza
    unità (`margin-bottom: 0`), convertite in `pt` (1in = 72pt = 96px,
    [css-values-4](https://www.w3.org/TR/css-values-4/#absolute-lengths));
    non `ex`, `ch`, `vw`, `vh` né le percentuali; `font-size` e
    `line-height` negativi no, come in CSS;
  - colori `#rgb`, `#rrggbb` e i nomi di CSS Color 4
    ([named colors](https://www.w3.org/TR/css-color-4/#named-colors)),
    senza `transparent`;
  - `font-family` come lista di nomi e delle sole famiglie generiche
    `serif`, `sans-serif` e `monospace`, con ripiego; le altre famiglie
    generiche di CSS Fonts 4 (`cursive`, `fantasy`, `system-ui`, `math`,
    `ui-serif` e simili) e un nome che contiene `"` o `\` sono fuori;
  - `font-weight` come numero da 1 a 1000, come in CSS Fonts 4
    ([css-fonts-4](https://drafts.csswg.org/css-fonts-4/#font-weight-prop)),
    `normal` (400) e `bold` (700); `font-style` `normal` e `italic`;
    `text-align` `left`, `right`, `center`, `justify`;
  - `line-height` come numero o lunghezza;
  - *(proposta)* `text-decoration-line` `none` o `underline`. Si può
    scrivere anche `text-decoration` con una sola di queste due parole, che
    vale come `text-decoration-line`; nel `computedStyle` la chiave è sempre
    `text-decoration-line`. Come in CSS la proprietà non si eredita, ma la
    sottolineatura di un nodo si disegna anche sul testo dei suoi discendenti
    nel flusso, in linea e a blocchi, che pure hanno `none` come valore
    calcolato e non la possono togliere
    ([css-text-decor-3 §2](https://www.w3.org/TR/css-text-decor-3/#line-decoration):
    «Inherited: no (but see prose, above)»). Esempio 44.

  Il resto è `stylesheet-unsupported`, con `target` il nome della
  proprietà; anche un valore fuori da decimal128 (§0.4), come
  `margin-left: 1e6144in`, o una lunghezza in `em` che, calcolata, ne esce,
  fa ignorare la dichiarazione. Restano fuori `line-height: normal`, che dipende dal font, le
  parole chiave di `font-size` (`small`, `larger` e simili) e le parole
  chiave CSS-wide (`inherit`, `initial`, `unset`): con il significato di CSS
  darebbero valori che il `runtime` non sa calcolare, come il colore
  iniziale `CanvasText`.
- **`em`** si risolve come in CSS: in `font-size` sul `font-size` del
  genitore, nelle altre proprietà su quello del nodo
  ([css-values-4](https://www.w3.org/TR/css-values-4/#font-relative-lengths)).
  Il genitore della radice, per `em` e per l'eredità, è la regola `root` del
  foglio di partenza: `font-size: 1.2em` sull'`article` dà `13.2pt`.
- **Calcolo e forma scritta.** Ogni valore si calcola con l'aritmetica
  delle righe di calcolo (§0.4), con un ordine fisso per le conversioni:
  × 72 / 25.4 per `mm`, × 72 / 2.54 per `cm`, × 72 per `in`, × 3 / 4 per
  `px`, × il `font-size` per `em`. Poi si arrotonda subito al pari a 4
  decimali, e il valore arrotondato è il valore calcolato: si eredita, è la
  base di `em` ed è quello che si confronta per decidere cosa entra nel
  `computedStyle`. Così confronto e stringa scritta coincidono. Nel
  `computedStyle` le lunghezze sono in `pt` senza zeri finali e senza
  esponente, come il `value` delle righe di calcolo (`11pt`,
  `2.8346pt` per `1mm`); `line-height` è un numero senza zeri finali o una
  lunghezza in `pt`, e `0` è il numero «0», come in CSS, dove uno 0 che può
  essere numero o lunghezza «must parse as a `<number>`»
  ([css-values-4 §6](https://www.w3.org/TR/css-values-4/#lengths));
  `font-weight` è un numero senza zeri finali; i colori sono `#rrggbb` in
  minuscolo; `font-family` è una lista separata da «, », con le famiglie
  generiche in minuscolo senza virgolette e ogni altro nome fra virgolette
  doppie, così `"serif"` resta distinto da `serif`. Uno zero col segno meno
  si scrive senza segno: «0pt».
- **`--number-notation`** ammette solo `standard` e `compact`. Un altro
  valore, comprese le parole chiave CSS-wide, `scientific` ed
  `engineering`, fa ignorare la dichiarazione, con `stylesheet-unsupported`.
  È una scelta diversa da CSS, dove una proprietà personalizzata accetta
  qualsiasi valore.
- **Il `base stylesheet`.** Lo applica il `runtime` prima degli
  `stylesheet` del documento. È scritto con la sintassi di CSS: a
  sinistra c'è un tipo del contenuto del `resolved tree` (§11.3), `root` per
  il nodo della `composition`, `title-0` per il titolo dell'`article`
  (§0.7, *proposta*), oppure `title-1`, `title-2` e `title-3` per il
  titolo di un `chapter` di grado 1, 2, e 3 o più, gli stessi nomi che usa
  uno `stylesheet` (§0.16):

  ```
  root          { font-family: serif; font-size: 11pt; line-height: 1.4; color: #000000;
                  font-weight: 400; font-style: normal; text-align: left; }
  paragraph     { margin-bottom: 6pt; }
  title-0       { font-size: 22pt; font-weight: 700; margin-bottom: 12pt; }
  title-1       { font-size: 18pt; font-weight: 700; margin-top: 18pt; margin-bottom: 9pt; }
  title-2       { font-size: 14pt; font-weight: 700; margin-top: 12pt; margin-bottom: 6pt; }
  title-3       { font-size: 11pt; font-weight: 700; margin-top: 9pt; margin-bottom: 3pt; }
  emphasis      { font-style: italic; }
  strong        { font-weight: 700; }
  inlineCode, code { font-family: monospace; }
  hyperlink     { color: #1a4f8b; text-decoration-line: underline; }
  blockquote    { margin-left: 24pt; }
  list          { margin-left: 18pt; margin-bottom: 6pt; }
  ```

  `thematicBreak` non ha regole: la linea la disegna il `renderer` (§7.4,
  §11.4).
  La regola `root` dà tutte le proprietà ereditate del sottoinsieme; un
  margine senza regola vale `0pt`, e `text-decoration-line` vale `none`.
  La sottolineatura dei collegamenti è decisa [C: «Sulla bozza di specifica»]: il blu da solo ha
  un contrasto di 2,54:1 con il testo nero, sotto il 3:1 della tecnica
  [G183](https://www.w3.org/WAI/WCAG22/Techniques/general/G183), con cui WCAG
  2.2 ammette un collegamento distinto solo dal colore (criterio 1.4.1).
- **L'allineamento delle colonne.** L'allineamento scritto nella riga di
  separazione di una tabella (`|:--|--:|`) conta, come su GitHub, e lo
  calcola il `runtime` nello stile delle celle [C: «Sulla bozza di specifica»]. *(proposta)* Vale
  come una dichiarazione `text-align` sulle celle di quella colonna, con il
  valore di `align`: batte l'eredità, e nella classe 1 nessuno `stylesheet`
  colpisce le celle. Quindi il valore finale di una `tableCell` di una
  colonna con `align` è `align`, e va nel suo `computedStyle` quando
  differisce da quello che la cella avrebbe dal foglio di partenza e dal
  genitore; i figli in linea della cella lo ereditano, e una colonna con
  `align` `null` eredita come ogni nodo. L'attributo `align` della `table`
  resta com'è (esempio 45).
- **La forma dei valori.** Ogni nodo del contenuto della `composition` radice,
  cioè l'`article` o il `deck`, porta negli attributi un oggetto
  `computedStyle` con le proprietà il cui valore finale differisce da quello
  che il nodo avrebbe applicando le regole dirette del foglio di partenza per
  il suo tipo ed ereditando i valori finali del genitore. Chi disegna fa solo
  questo: applica le regole del foglio di partenza per tipo, eredita dal
  genitore e sovrappone il `computedStyle`, senza calcolare cascate. Così un
  capoverso dentro un `embed` in grassetto non porta niente, perché eredita
  700; uno `strong` che torna nero sotto un `embed` blu porta il suo colore
  (esempio 29). Il nodo della `composition`
  radice, in `nodes`, porta accanto ad `attributes` una chiave
  `computedStyle` con i valori che differiscono dalla regola `root` del
  foglio di partenza; i suoi figli si confrontano con i valori finali della
  radice, come ogni altro nodo (esempio 32). Nel nodo di un
  `chapter` non c'è `computedStyle`, come non c'è `number`. L'alternativa è scrivere ogni valore per
  ogni nodo: nessun foglio da conoscere, ma un `resolved tree` molto più
  grande. I valori sono i valori calcolati del CSS, scritti come stringhe
  nella forma detta sopra: per `font-weight` il valore calcolato è un numero
  (CSS Fonts 4, «Computed value: a number»), quindi `bold` diventa `"700"`
  (esempio 8).
- **I selettori degli `stylesheet`.** Gli `stylesheet` si agganciano alla
  `class` e a quattro tipi in linea con nomi fissati ora: collegamento,
  enfasi, forte, codice [C: «Sulla bozza di specifica»]. *(proposta)* I nomi, normativi: `hyperlink`,
  `emphasis`, `strong`, `inline-code` (nel `resolved tree` `inlineCode`).
  I titoli dei capitoli si colpiscono per grado con `title-1`, `title-2` e
  `title-3` (deciso [C: «Sulla bozza di specifica»], §0.16), il titolo
  dell'`article` con `title-0` (*proposta*, §0.7). Per gli altri tipi, che hanno nomi provvisori (§11.3),
  niente selettori.
- **Il sottoinsieme dei selettori.** *(proposta)* Selettori di `class`
  semplici e composti (`.a.b`), i quattro tipi in linea e i quattro gradi dei
  titoli, da soli e senza combinatori: `.nota strong` e `title-1.compatto`
  non sono ammessi. Le liste con la virgola
  (`.nota, .evidenza`) sono ammesse; se un membro è fuori dal sottoinsieme
  cade tutta la regola, come in Selectors 4 («If just one of these selectors
  were invalid, the entire selector list would be invalid»,
  [selectors-4](https://www.w3.org/TR/selectors-4/#grouping)). Il resto è
  `stylesheet-unsupported`. Per una regola che cade c'è un solo avviso, con
  `target` il primo membro fuori dal sottoinsieme, come è scritto e senza
  spazi ai bordi, e le sue dichiarazioni
  non si controllano. Anche `!important` è fuori dal sottoinsieme: la
  dichiarazione intera si ignora, con `stylesheet-unsupported` e la
  proprietà come `target`, perché in CSS Cascade 5 per le dichiarazioni
  important vince lo strato che viene prima, e la decisione «vince la
  `composition`» cadrebbe.
- **La `class` sull'`embed`.** La `class` sta sia sull'oggetto (cos'è,
  sempre) sia sull'`embed` nella `composition` (come appare lì), e in
  conflitto vince quella della `composition` [C: «Sulla bozza di specifica»].
  Si scrive accanto all'`embed`, `![[calo-q3-sintesi]]{.nota}` (§0.15).
  *(proposte)* Nell'`embed` le `class` dell'oggetto vengono prima di quelle
  dell'`embed`. Nella cascata le dichiarazioni che colpiscono un nodo grazie a una `class`
  dell'`embed` stanno in uno strato che viene dopo quello delle altre, e
  vincono qualunque sia la specificità: così `.evidenza.urgente` sull'oggetto
  non batte `.nota` sull'`embed` (esempio 27). Un selettore misto come
  `.evidenza.nota` sta nello strato dell'`embed` se almeno una delle sue
  `class` viene dall'`embed`; una `class` che sta sia sull'oggetto sia
  nell'`embed` conta come dell'`embed`, e nella lista `class` dell'`embed`
  compare una volta sola, nella posizione che ha fra quelle dell'`embed`. È analogo ai cascade layers di CSS
  Cascade 5, dove gli strati vengono prima della specificità fra i criteri
  della cascata ([css-cascade-5 §6.1](https://www.w3.org/TR/css-cascade-5/#cascade-sort));
  in CSS però lo strato appartiene alla regola (§6.4.1), qui a come la
  regola colpisce il nodo.
- **I selettori e i nomi.** Negli `stylesheet` il selettore è `inline-code`,
  in `kebab-case` come i selettori CSS; nel `resolved tree` e nel foglio di
  partenza il tipo è `inlineCode`, in `camelCase` come le chiavi JSON
  (glossario, N1). `inline-code` non colpisce le righe di calcolo, che nel
  `resolved tree` sono `mathLine`.
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
- **Il `front matter`** sta fra due righe `---` in testa al file. Chiavi e
  valori sono stringhe; le liste di stringhe (`tags`, `class`,
  `associations`) sono una proposta che estende la decisione «sole
  stringhe». `null` vale solo in `retired-ids.yaml`. Un valore che YAML leggerebbe come numero, booleano o
  data (`0123`, `no`, `2026-10-21`) va fra virgolette, e il `formatter` ce lo
  mette. Un `front matter` senza la riga di chiusura, o con YAML non valido,
  dà solo `syntax`: il nodo esce con `kind`, preso dall'estensione, e `file`,
  e nient'altro.
- **Il corpo** è CommonMark, più le tabelle di GFM
  ([gfm](https://github.github.com/gfm/)), più le regole del §7.4. In una
  cella di tabella il `|` di `[[id|testo]]` va scritto `\|`, come chiede la
  spec GFM («Include a pipe in a cell's content by escaping it»). Le note a
  piè di pagina non hanno una sintassi né in CommonMark né in GFM 0.29: le
  rimandiamo, perché la definizione di una nota sarebbe un blocco in più in
  un `text` (§0.2).
- **`![[id]]`** da solo in un capoverso, con o senza le `class` accanto
  (§0.15), è un `embed` di blocco; **`[[id]]`**
  e **`[[id|testo]]`** in linea sono un `id reference` (§10).
- **`[[…]]` prima di CommonMark.** Fuori dal codice in linea, dai blocchi di
  codice e dall'HTML grezzo, `[[…]]` si riconosce prima delle altre regole
  in linea, e non attraversa un a capo: `[[x]]` resta un `id
  reference` anche se il file definisce `[x]: url`. Il testo dopo `|` è
  testo semplice, senza enfasi né codice: `[[calo-q3|*il calo*]]` mostra
  «*il calo*».
- **`![[id]]` fuori da una `composition`.** In un `text`, uno `scratch`, un
  `concept`, un `image`, un `canvas-file` o il `document file`, dove si
  somma a `document-content`, un `![[id]]` da solo in un capoverso è l'errore
  `embed-outside-composition`, con `target` l'`id` e un `fix` che suggerisce
  di spostarlo in una `composition`; nel `resolved tree` resta testo, come è
  scritto (esempio 39). Una `directive` invece può avere `embed` (§10).
- **Collegamenti per riferimento.** `[t][s]` con `[s]: url` è un
  `hyperlink` con `url`, come un collegamento in linea. La definizione `[s]:
  url` non è un blocco: non conta per `text-blocks` né, nel corpo di una
  `composition`, per `composition-content`, e non entra nel `resolved
  tree`. Con due definizioni della stessa etichetta vale la prima, come in
  CommonMark.
- **Non funziona dentro Obsidian così com'è:** Obsidian risolve `[[...]]` per
  nome della nota, cioè del file, e anche un collegamento a un alias lo
  scrive con il nome: «Obsidian uses the `[[Artificial Intelligence|AI]]` link
  format»
  ([Aliases](https://github.com/obsidianmd/obsidian-help/blob/master/en/Linking%20notes%20and%20files/Aliases.md)).
  Un `id` scritto nel file non lo usa.

### 0.7 Deciso: il capitolo

L'opzione D di Alessio: il capitolo è una `composition` che si può
annidare; l'`article` è l'indice dei capitoli, e un `deck` usa gli stessi
capitoli senza ripetere i titoli [C: «Sulla bozza di specifica»]. Riformula le
regole sulle sezioni del modello di prima [C: «Attributi e id»]: un capitolo
si sposta come un'unità, si annida, e può non avere titolo.

*(proposte)*
- **Il nome e il `kind`:** `chapter`. Non section: era una proposta di Claude,
  e Alessio ha detto di non badare alla parola (bozza-nodi.md §5); il
  glossario la vieta per altri concetti; in Word una sezione è un gruppo di
  pagine con le sue impostazioni. Il glossario segnala che in DocBook e in
  LaTeX un chapter non si annida.
- **Il titolo** è l'attributo `title` nell'intestazione. È la forma più
  semplice: il corpo resta fatto solo di `embed`, e un capitolo senza
  `title` è una sezione senza titolo. *(proposta)* Un `title` vuoto
  (`title: ""`) vale come assente per la numerazione, il titolo e il testo
  di un `[[id]]`, ma resta negli `attributes` come è scritto (esempio 42).
- **Il corpo** di un `chapter` contiene solo `embed`, di `object` o di altri
  `chapter`, in ordine di lettura, e righe di separazione (§7.4). Il grado di un titolo viene
  dall'annidamento, non dal file: lo stesso `chapter` è di grado 1
  nell'`article` e di grado 2 se lo si mette dentro un altro capitolo con
  `title`. Un capitolo senza `title` non aumenta il grado e non ha `depth` né
  `number` (§0.10, esempio 30). Nel nodo di un `chapter`, gli `embed` dei
  `chapter` annidati non hanno `depth` né `number`: li hanno solo nella
  `composition` radice.
- **L'`article` e il `deck`** possono avere un `title`, che è il nome del
  documento e il testo dei riferimenti. Il `title` dell'`article` si vede in
  cima alla pagina, come nodo del `resolved tree` con una regola nel foglio
  di partenza [C: «Sulla bozza di specifica»]. *(proposta)* È il primo figlio del contenuto
  dell'`article`, `["title", "Rapporto del terzo trimestre"]`, con il suo
  `computedStyle` come ogni nodo, e lo colpisce la regola `title-0`, il
  grado 0 del documento intero (§0.5, esempio 46); un `title` vuoto non dà
  il nodo. Il
  `title` del `deck` si vedrà con le `slide` (classe 6). Hanno un corpo di
  soli `embed`, di `chapter` o di `object`.
- **Cicli.** Un `chapter` che contiene sé stesso, anche attraverso altri, è
  l'errore `embed-cycle`, se non abilita la ricorsione (§0.17).
- Le due relazioni di Alessio restano distinte: l'aggregatore di dati della
  bozza (bozza-nodi.md §3) ripete lo stesso `template` su più dati, mentre il
  `chapter` ordina oggetti diversi; Alessio ha paragonato quell'aggregatore
  alla «section per le pagine» (bozza-nodi.md §7, idea 18).

### 0.8 Deciso: il file del documento

Il file di configurazione del documento è un file come gli altri, con `kind`
`document` e tutto nell'intestazione [C: «Sulla bozza di specifica»]: porta la
lingua del documento e la versione della specifica. È uno e uno solo, e il
`runtime` lo crea se manca (stessa voce). Restano proposte i nomi delle
chiavi.

*(proposte)*
- Si chiama `<id>.document.md`, per esempio `rapporto-q3.document.md`, e il
  suo `front matter` porta `id`, `kind`, `tags`, `lang` e `spec-version`. Il
  corpo è vuoto; un corpo non vuoto è `document-content`.
- Senza `spec-version`, il `runtime` legge il documento con la sua versione e
  dà l'avviso `spec-version-missing`, con un `fix` che la scrive. Il file che
  il `runtime` crea ha `id` `document`, o `document-2`, `document-3` e così
  via se l'`id` è già usato o ritirato, e si chiama `<id>.document.md`; porta
  `id`, `kind`, `tags: []` e la `spec-version` del `runtime`, senza `lang`.
- Due file `document` nello stesso documento sono l'errore
  `document-duplicate`, uno per file. Se manca, è l'avviso `document-missing`,
  con un `fix` che lo crea; il `runtime` lo crea quando riconcilia.
- Nel glossario sono due righe: `document` per la cartella intera e
  `document file` per il file. Il parallelo con `canvas` e `canvas file` non
  regge del tutto: lì il `kind` del descrittore è `canvas-file`, qui il `kind`
  è `document`, come ha deciso Alessio, ed è lo stesso nome del concetto della
  cartella.
- Il `document file` non è un nodo che si vede: il suo `lang` è la lingua
  predefinita del documento, non l'attributo `lang` di un nodo.
- Sta nel `core`: serve a tutte le classi. Non si collega e non si usa:
  un'`association` con lui è `association-kind`, un `embed` è `embed-kind`.

### 0.9 Deciso: nessun oggetto dentro un capoverso, per ora

Un oggetto dentro un capoverso per ora non è ammesso, e un `text` resta un
blocco solo [C: «Sulla bozza di specifica»]. *(proposta)* Un `![[id]]` in mezzo a un capoverso è l'errore
`embed-inline`.

*Nota non normativa, per Alessio, che chiede se si debba per forza spezzare il
testo* (stessa voce). In linea ci sono già il collegamento `[[id]]` e la riga
di calcolo `` `= …` ``. *(proposta)* I valori presi da una tabella
arriveranno in linea con la classe delle formule. Un oggetto piccolo in
linea, come un'icona o un grafico minuscolo, si può aggiungere in una classe
successiva senza rompere niente: oggi è un errore, domani diventa ammesso, e
nessun documento valido cambia significato. *(proposta)* Per un oggetto
grande è l'`app` a spezzare il testo da sola, in due `text` con l'`embed` in
mezzo; se il `text` è usato in più `composition`, l'`app` aggiorna l'`embed`
in tutte, oppure chiede a chi scrive.

### 0.10 Deciso: la numerazione

La numerazione di capitoli e immagini la calcola il `runtime` e la scrive nel
`resolved tree` [C: «Sulla bozza di specifica»]. Il numero di un capitolo si
vede davanti al suo titolo, «1 Le vendite», «1.1 Il calo» [C: «Sulla bozza
di specifica»]. Il numero di un'immagine, per ora, serve solo
ai `cross-ref`: la descrizione dell'`image` è il testo per gli screen reader,
non una didascalia (§7.2).

*(proposte)*
- Nel contenuto di una `composition`, l'`embed` di un `chapter` e quello di un
  `image` portano l'attributo `number`, una stringa.
- I capitoli si numerano per grado, `1`, `1.1`, `1.2`, `2`; le immagini di
  seguito in tutta la `composition`, `1`, `2`, `3`, nell'ordine di lettura
  (esempio 8).
- Il `number` si calcola nella `composition` radice, cioè l'`article` o il
  `deck`, e compare solo nel suo albero; il nodo di un `chapter` non lo porta.
- Un capitolo senza `title` non prende un numero e non conta nella
  sequenza, e non aumenta il grado: un capitolo con `title` dentro di lui
  prende il numero e il grado che avrebbe al suo posto, per esempio `1` e
  non `1.1`.
- Un `cross-ref` mostra il numero con il `number slot` nel suo testo
  (§0.14), e si risolve nel contesto della `composition` radice che si sta
  risolvendo; nel nodo del `text` resta senza numero.

### 0.11 Deciso: i riferimenti nel `canvas file`

Ogni nodo del `canvas` porta l'`id` in una chiave in più, se JSON Canvas
ammette una chiave in più e gli altri programmi la conservano; altrimenti
restano i percorsi [C: «Sulla bozza di specifica»].

La condizione non si può verificare. La specifica JSON Canvas 1.0
(2024-03-11) elenca gli attributi di nodi e archi e non dice nulla delle
proprietà che non definisce
([spec 1.0](https://jsoncanvas.org/spec/1.0/); lo stesso testo in
[jsoncanvas](https://github.com/obsidianmd/jsoncanvas/blob/main/spec/1.0.md)).
Il readme dice soltanto che il formato è nato per dare «longevity,
readability, interoperability, and extensibility»
([readme](https://github.com/obsidianmd/jsoncanvas/blob/main/readme.md)).
Se Obsidian conservi una chiave sconosciuta quando riscrive un `.canvas` non
si può verificare su una fonte primaria: la sua guida non ne parla, e l'app
non è open source. Alessio può provarlo a mano: un `.canvas` con una chiave
in più, aperto e risalvato in Obsidian. Che per il momento restino i percorsi
(§2) è la lettura della condizione di Alessio fatta dall'orchestratore.
*(proposte)* Se un giorno la verifica reggesse, la chiave si chiamerebbe
`targetId`, perché `id` è già l'identificativo dei nodi di JSON Canvas. Un
percorso del `canvas file` che non si risolve è l'errore
`canvas-path-unresolved`.

### 0.12 Deciso: `tags`

`tags` è sempre presente, ma la lista vuota è ammessa [C: «Sulla bozza di specifica»]; è sempre scritto,
e il `formatter` scrive `tags: []` quando manca (stessa voce). *(proposta)*
Il `runtime`, se manca, lo legge come lista vuota senza avviso, perché lo
corregge il `formatter`. Nel `resolved tree` una lista `tags` vuota si
omette.

### 0.13 Deciso: i commenti

I commenti si scrivono solo come commenti HTML `<!-- -->`, unica eccezione al
divieto dell'HTML grezzo [C: «Sulla bozza di specifica»].

*(proposte)* Un commento non è un blocco: non conta per `text-blocks` e non
entra nel `resolved tree`; il `formatter` lo conserva dov'è (esempio 26).
- Un commento che apre una riga sta su righe proprie. `<!-- nota --> testo`
  per CommonMark è un blocco HTML di tipo 2 con tutta la riga, quindi è
  `raw-html`.
- Dentro un capoverso, non all'inizio della riga, un commento è ammesso: sparisce
  e il testo intorno resta com'è.
- Nel `front matter` i commenti YAML `#` non sono ammessi (`attribute-invalid`),
  perché la sola forma di commento è quella HTML. In uno `stylesheet` valgono
  i commenti CSS `/* */`, come il commento d'intestazione (§0.1).

### 0.14 Deciso: il testo di un collegamento verso un nodo numerato

Il testo di un collegamento lo scrive chi scrive, dove mette il collegamento:
`[[cap-vendite|vendite]]`; senza testo vale il `title`, come già deciso. Il
numero compare solo dove chi scrive lo chiede con un segnaposto nel testo,
`[[lavagna|figura {n}]]`, e lo mette il `runtime` con il numero calcolato
nel documento che include il testo [C: «Sulla bozza di specifica»], cioè
nella `composition` radice, `article` o `deck` (§0.10).

*(proposte)*
- **La forma** è `{n}`, il `number slot`, e vale solo nel testo di un
  `[[id|testo]]`; altrove `{n}` è testo. Ogni `{n}` del testo si sostituisce.
  Nella classe 1 non c'è una via di fuga per un «{n}» letterale nel testo di
  un collegamento: nessun caso noto la chiede.
- **Dove c'è il numero.** Nel contenuto della `composition` radice il
  `hyperlink` porta il testo con il numero, lo stesso `number` dell'`embed`
  del nodo collegato (§0.10, esempio 33). Se il nodo collegato è incluso
  più volte nella radice, `{n}` prende il `number` del primo `embed` in
  ordine di lettura.
- **Dove non c'è**, cioè nel nodo del `text`, nel nodo di un `chapter`, in
  una `composition` che non include il nodo collegato, verso un capitolo
  senza `title` o in un riferimento che non si risolve, il segnaposto si
  toglie; poi, e solo in questo caso, il testo del collegamento perde gli
  spazi U+0020 ai bordi, e ogni sequenza di spazi dentro diventa uno. Un
  testo senza `{n}` resta come è scritto. `figura {n}` mostra «figura». Se il testo resta vuoto vale come un collegamento senza
  testo, senza avviso.
- **L'avviso.** Un `{n}` verso un nodo di un `kind` che non si numera mai,
  né `chapter` né `image`, dà l'avviso `number-slot-kind`, con `target`
  l'`id`.
- Un `[[id]]` senza testo verso un'immagine, che non ha `title`, mostra
  l'`id` e dà `reference-text-missing` (§7.4).

### 0.15 Deciso: la `class` accanto all'`embed`

La `class` che una `composition` dà a un oggetto si scrive accanto
all'inclusione, nel corpo: `![[calo-q3-sintesi]]{.nota}`, più `class` come
`{.nota .grande}`; la forma viene da Pandoc. La sintassi dei file di testo si
allarga di questo solo segno, e il `front matter` resta a sole stringhe e
liste. Lo stesso oggetto incluso due volte può avere due `class` diverse.
Cade la mappa `embed-class` nel `front matter`, con le sue regole. Costo
accettato: il documento non dà una `class` a un oggetto dentro un capitolo
annidato, ma la dà al capitolo intero [C: «Sulla bozza di specifica»].

*(proposte)*
- **La grammatica.** Il segno sta subito dopo `![[id]]`, senza spazi e sulla
  stessa riga, e la riga finisce lì:

  ```
  embed      = "![[" id "]]" [ class-list ]
  class-list = "{" class-ref { " " class-ref } "}"
  class-ref  = "." class-name
  ```

  `class-name` ha la forma dei nomi dell'attributo `class` (§3), e fra due
  `class` c'è uno spazio. Pandoc, nell'estensione `link_attributes`, ammette
  anche `#id` e `chiave=valore`
  ([Pandoc](https://pandoc.org/MANUAL.html#extension-link_attributes)); qui
  ci sono solo le `class`.
- **Dove vale.** Il segno fa parte della forma generica del §10: si
  riconosce dopo ogni `![[id]]` di blocco, in ogni file, anche in una
  `directive`. Dopo qualcosa che non è un `![[id]]`, `{.nota}` è testo,
  senza avviso.
- **Un segno mal formato.** Una riga che comincia con `![[id]]` e continua
  con un `{`, anche dopo spazi, ma non segue la grammatica
  (`![[id]] {.nota}`, `![[id]]{nota}`, `{.Nota}`, un `{` senza `}`) è l'errore
  `embed-class-invalid`, con `target` la riga dal primo `{` alla fine, senza
  spazi ai bordi, e un `fix` che la riscrive; l'`embed` vale senza `class`
  (esempio 35).
- **Class ripetute e riferimenti non risolti.** Una `class` ripetuta nel
  segno (`{.grande .grande}`) compare una volta sola. Un `embed` che non si
  risolve porta comunque le `class` del segno, accanto a `id` e
  `unresolved`.
- **Due inclusioni** dello stesso oggetto hanno ciascuna le sue `class`
  (esempio 27).
- **Costo:** per CommonMark `{.nota}` è testo dopo l'inclusione (prova con
  commonmark.js 0.31.2), e la guida di Obsidian non ha una sintassi di
  attributi, quindi GitHub e, per inferenza, Obsidian lo mostrano come testo
  accanto all'inclusione.

### 0.16 Deciso: l'aspetto dei titoli

Uno `stylesheet` colpisce i titoli dei capitoli per grado, con tre nomi come
h1-h3 in HTML: `title-1`, `title-2` e `title-3`, quest'ultimo per il grado 3
e quelli sotto; li usa anche il foglio di partenza. È il primo tipo di blocco
fra quelli agganciabili, e la regola vale per tutti i titoli di quel grado
nel documento [C: «Sulla bozza di specifica»]. Un titolo diverso per un solo
capitolo non è deciso (stessa voce).

*(proposte)*
- Il titolo dell'`article` si colpisce con `title-0`, il grado 0 (§0.7).
- I quattro selettori, da `title-0` a `title-3`, stanno da soli, come i
  tipi in linea: niente `title-1.compatto` né combinatori (§0.5).
- Nel `resolved tree` il titolo è il nodo `["title", …]`, primo figlio
  dell'`embed` del `chapter` nella `composition` radice (§11.3), e porta il
  `computedStyle` con la regola generale del §0.5: il suo tipo è `title-1`,
  `title-2` o `title-3` (esempio 34).
- Estensione possibile, senza regole ora: un titolo diverso per un solo
  capitolo, per esempio con le `class` del suo `chapter`
  (`title-1.compatto`). Si aggiunge dopo senza rompere niente, perché oggi
  quel selettore è `stylesheet-unsupported`.

### 0.17 Deciso: la ricorsione

Un oggetto può contenere sé stesso solo se lo abilita, con un limite,
infinito oppure una regola di uscita; vale anche per le formule. Se non la
abilita, per quell'oggetto la ricorsione non si può fare. Si abilita con «un
tag in più opzionale» [C: «Sulla bozza di specifica»]. Un `chapter` che si
ripete prende a ogni ripetizione con un `title` un numero nuovo, come un
capitolo annidato: `1`, `1.1`, `1.1.1` (stessa voce, esempio 43).

*(proposte; la prima è una lettura dell'orchestratore da confermare)*
- **L'attributo.** È l'attributo opzionale `recursion`, non una voce di
  `tags`, perché porta un valore: un intero positivo o `infinite`, scritto
  come stringa (`recursion: "2"`, §0.6). Un altro valore è
  `attribute-invalid`. Nella classe 1 vale per il `chapter`, l'unico oggetto
  che contiene altri oggetti.
- **Senza l'attributo** un ciclo resta `embed-cycle` (§8). In un ciclo fra
  più `chapter` ciascuno deve abilitarla: `embed-cycle` va nel file di ogni
  `chapter` del ciclo che non la abilita, e di ogni `directive` del ciclo,
  che non ha modo di abilitarla.
- **Con un limite n** il `chapter` compare dentro sé stesso fino a n volte
  lungo il cammino; l'`embed` che sarebbe il successivo non entra nel
  `resolved tree` (esempio 40). In un ciclo fra più `chapter` ciascuno conta
  le sue volte con il suo limite.
- **Con `infinite`** il `resolved tree` segna il punto in cui il `chapter`
  torna: l'`embed` ha `"recursion": true` e nessun figlio, con `lang` e
  `class` come ogni `embed` ma senza `depth`, `number` né `computedStyle`.
  Chi disegna non lo ripete: in quel punto non disegna niente, e il
  capitolo compare una volta [C: «Sulla bozza di specifica»]. Ripeterlo vorrebbe dire
  ricalcolare numeri e stili, che calcola solo il `runtime`.
- **La regola di uscita** richiede le formule e arriva con loro (classe 4).
  Per una formula `infinite` il `runtime` terrà comunque un limite di
  sicurezza, perché il documento deve risolversi in un tempo finito.

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
la 6 il `deck` [C: «Sulla bozza di specifica»]. Un attributo sconosciuto si
ignora con un avviso (stessa voce). *(proposta)* «Si ignora» vuol dire che
non cambia la risoluzione né l'aspetto; il `formatter` lo conserva, e il
`resolved tree` lo riporta fra gli `attributes` (esempio 12).

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
  Il documento dichiara anche la `spec version`, nel `document file` (§0.8,
  deciso).
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
- **File che non si leggono.** Un link simbolico non si segue, e un file
  che non si legge, come un link simbolico o un file che non è UTF-8, dà
  `syntax`; la risoluzione continua.
- **File letti.** Tutti, anche nelle sottocartelle, tranne quelli che
  cominciano con un punto. Le sottocartelle non hanno significato.
- **`source` e `asset`.** Lo decide l'elenco fisso di estensioni del `core`
  (§0.1): tutto ciò che non vi compare è `asset`. Un `asset` si nomina con un
  percorso relativo al file che lo usa, senza uscire dal documento: un
  percorso che ne esce è `asset-missing`.
- **Codifica.** UTF-8. Il `formatter` scrive senza BOM, con LF e un a capo
  finale; il `runtime` legge anche CRLF e BOM.
- **Nomi.** Il nome è l'`id` più l'estensione. Il nome non conta per
  l'identità, perché l'`id` è scritto nel file (§0.3). Il nome
  `retired-ids.yaml` è riservato.
- **Configurazione del documento.** Il file di configurazione della cartella
  dichiara la `spec version` e il `lang` del documento: è il file `document`
  (§0.8, deciso). Il `runtime`
  risolve tutte le `composition`, quindi non serve un punto di partenza.
- **`canvas file`.** Il `canvas` salva solo posizioni e riferimenti, partendo
  da JSON Canvas [C: «Il foglio di bozze è un canvas»]. Il file `.canvas` è un
  `asset` con un `descriptor` (§0.1, deciso), di `kind` `canvas-file`
  *(proposta)*. JSON Canvas
  collega i file per percorso («the path to the file within the system»,
  [spec 1.0](https://jsoncanvas.org/spec/1.0/)): il `runtime` controlla quei
  percorsi e li riscrive alle rinomine. Per ora restano i percorsi (§0.11).
  *(proposte)* Il descrittore nomina il `.canvas` con l'attributo `asset`,
  come un `image`. I percorsi dentro il `.canvas` si cercano dalla radice
  del documento, non dal file; uno che non c'è o che esce dal documento è
  `canvas-path-unresolved`.
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
- La forma dei nomi di `class` è `[a-z][a-z0-9]*(-[a-z0-9]+)*`: comincia con
  una lettera, così ogni `class` si può colpire con un selettore CSS
  (`.2col` non è un selettore valido).
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
| `class` | per i nodi che si vedono | lista di nomi in `kebab-case` (§3) | deciso |
| `lang` | per i nodi che si vedono | tag di lingua BCP 47 | deciso |
| `title` | `chapter`, `article`, `deck` | stringa | *(proposta)*, §0.7; in `article` e `deck` è il nome del documento e il testo dei riferimenti, e quello dell'`article` si vede in cima alla pagina (deciso) |
| `spec-version` | `document file` | stringa | §0.8; *(proposta)* la chiave |
| `asset` | `image`, `canvas file` | percorso del file | *(proposta)*, §7.2, §2 |
| `recursion` | `chapter`; più avanti le formule | un intero positivo o `infinite` | deciso che è opzionale (§0.17); *(proposta)* il nome e i valori |
| `stylesheet` | `article`, `deck` | `id reference` | *(proposta)*, §8; su un `chapter` dà `stylesheet-ignored` |
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
Non sa in quali `composition` è usato [C: «L'unità di significato ha i
metadati»]; *(proposta)* non ha `embed`.

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
  `composition` usa gli oggetti con l'`embed` (esempio 18). Il descrittore
  di un `canvas file` invece può dichiarare `associations` ed esserne il
  bersaglio.

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
blocco solo (§0.2, deciso; esempio 2). *(proposta)* Gli attributi del blocco
sono quelli del file.

Il contenuto interno è un inventario *(proposto)*; i tipi non hanno ancora un
nome (§11.3).

| Contenuto | Note |
|---|---|
| capoverso, elenco puntato e numerato, citazione | |
| `code block` | i marker per eseguire e per mostrare sono decisi [C: «Il codice nel documento porta un marker»], i nomi `eval` ed `echo` proposti, scritti come parole dell'info string dopo la prima, che è la lingua (`python eval`); nella classe 1 un blocco da eseguire non si esegue (`eval-unsupported`, esempio 36). Un blocco senza `eval` si vede sempre, uno con `eval` solo se ha anche `echo` [C: «Sulla bozza di specifica»]: nella classe 1 un blocco con `eval` e senza `echo` non compare |
| `text table` | la tabella di GFM ([gfm](https://github.github.com/gfm/)), ammessa nella classe 1 *(proposta)*; non ancora `collection` |
| `math line` | decisa, con il risultato già nella classe 1 (§0.4) |
| enfasi, forte, codice in linea, collegamento a un URL | in linea; anche il collegamento per riferimento (§0.6) |
| riferimento in linea | `[[id]]` o `[[id\|testo]]`, un `id reference` (§10); con il `number slot` `{n}` nel testo verso un nodo numerato è un `cross-ref` (§0.14) |
| interruzione di riga forzata | contenuto |
| `footnote` | senza sintassi, rimandata (§0.6) |

Un oggetto dentro un capoverso per ora non è ammesso (§0.9, deciso).

*(proposta)* Un'immagine Markdown, `![alt](url)` o `![alt][rif]`, è fuori
dall'inventario: è l'errore `markdown-image`, con `target` l'URL, per la
forma con riferimento quello della definizione, e un `fix` che suggerisce un
oggetto `image` incluso con `![[id]]` in una `composition`. Nel `resolved
tree` resta testo, come è scritto (esempio 37).

### 7.2 `image`

*(proposta della bozza)* Un `image` è un'immagine fatta fuori dal `runtime`,
come una foto; un'immagine disegnata dal `runtime` è una vista generata e non
si salva come file (bozza-nodi.md §4).

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
- Un `scratch` contiene quanti blocchi si vuole, `heading` compresi, e
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
- **Niente HTML grezzo e niente stili in linea**, salvo i commenti `<!-- -->`
  (§0.13, deciso). CommonMark li ammette, la nostra sintassi no. Un pezzo di HTML grezzo è l'errore `raw-html`, e nel
  `resolved tree` resta come testo letterale, così si vede e non disegna
  niente (esempio 23).
- **La struttura sta al suo posto.** I titoli sono `title` dei `chapter`
  (§0.7): un `heading` in un `text` è `text-blocks`, in una
  `composition` è `composition-content`; solo uno `scratch` li ammette. Le
  interruzioni di riga forzate sono contenuto.
- **La riga di separazione `---`** è ammessa come linea, come in Obsidian
  ([Basic formatting syntax](https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Basic%20formatting%20syntax.md)),
  e il `formatter` le mette sempre una riga vuota prima e dopo [C: «Sulla bozza di specifica»]. La riga vuota conta: in
  CommonMark `---` subito sotto una riga di testo fa di quella riga un titolo
  di secondo livello (prova con commonmark.js 0.31.2). Il parser non la
  confonde con l'intestazione, che vale solo in testa al file.
  *(proposte)* Anche `***` e `___` sono righe di separazione in CommonMark: il
  `formatter` le riscrive `---`. Un testo seguito subito da `---` resta un
  titolo setext: in un `text` è `text-blocks`, in una `composition` è
  `composition-content`. Sta nel corpo di un `chapter` o di un `article`, fra due
  `embed` (esempio 24), e in uno `scratch`; in un `text` è un blocco in più,
  quindi `text-blocks`. Nel `resolved tree` è `["thematicBreak"]`; la linea la
  disegna il `renderer` dal tipo, perché spessore e colore non sono nel
  sottoinsieme della classe 1. Allo stesso modo, fuori dal sottoinsieme, il
  `renderer` di riferimento disegna i segni degli elenchi, i bordi delle
  tabelle e il margine della pagina, in modo non normativo (§11.4).
- **GitHub e gli altri programmi** mostrano il Markdown con il loro aspetto:
  è un'anteprima, non l'impaginazione del documento.

**Orientamento di Alessio** [C: «L'impaginazione finale viene sempre da
fuori»]: l'impaginazione finale viene sempre da fuori, non da dentro il testo,
forse anche per i collegamenti e le formule scritti dentro il testo. Il testo
dice cosa è una cosa; come appare lo decidono il `runtime`, gli `stylesheet` e
la configurazione del documento. Non è una decisione. Come la toccano le
regole di questa bozza, punto per punto:
- **Il testo di un `[[id]]`** (deciso [C: «Sulla bozza di specifica»]): senza
  testo mostra il `title` dell'oggetto collegato, se ne ha uno; altrimenti
  l'`id`, con un avviso che suggerisce `[[id|testo]]`. *(proposta)* L'avviso
  è `reference-text-missing` (esempio 28). Il numero di un nodo numerato
  si chiede con il `number slot`, `[[lavagna|figura {n}]]` (deciso, §0.14).
- **L'aspetto di un `[[id]]`** *(proposta)*: è un `hyperlink`, e uno
  `stylesheet` lo può colpire; il `base stylesheet` gli dà un colore e la
  sottolineatura (§0.5). Che i tipi in linea siano agganciabili e che il
  collegamento sia sottolineato è deciso; i nomi e il colore no.
- **Il risultato di una riga di calcolo**: è deciso che il numero si mostra
  nella lingua dell'oggetto, altrimenti del documento (§0.4), cioè da fuori;
  che la stringa la scriva il `runtime` e che nel sorgente resti solo
  l'espressione sono proposte del §0.4.
- **Nessun aspetto in linea dentro un `text`** (lettura di questa bozza,
  coerente con le decisioni): niente attributi in linea e niente HTML;
  enfasi, forte, codice e collegamenti si colpiscono per tipo da uno
  `stylesheet` (§0.5).
- **La `class`** (deciso): sta sull'oggetto e sull'`embed`, e vince quella
  della `composition` (§0.5); si scrive accanto all'`embed` (§0.15).

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
  al suo posto (esempio 9). *(proposta)* Un `embed` include un `text`, un
  `image`, un `chapter` o una `directive` di un `kind` che la specifica non
  nomina; ogni altro `kind` è `embed-kind` (esempio 11): `concept`,
  `scratch`, `article`, `deck`, `stylesheet`, `canvas-file` e il `document
  file`, perché non si vedono o sono `composition` radice.
- *(proposta)* **I cicli.** Un `chapter` che contiene sé stesso senza
  `recursion` (§0.17) dà `embed-cycle` nel file di ogni `chapter` del ciclo
  che non la abilita, con `target` il suo
  `id`. Risolvendo, l'`embed` di un `chapter` che è già fra i suoi antenati
  diventa `{"id": …, "unresolved": true}`, senza figli (esempio 38).
- *(proposta)* Nella classe 1 lo `stylesheet` si dà solo alla `composition`
  radice, `article` o `deck`, con l'attributo `stylesheet` scritto come `id
  reference` (§10): la radice decide come appare un capitolo. Il riferimento segue sempre la
  forma generica del §10: un `id` che non esiste è `reference-unresolved`,
  uno ritirato `reference-retired`; un `id` che esiste ma non è uno
  `stylesheet` è l'errore `stylesheet-kind`, come `association-kind` ed
  `embed-kind`. Un `chapter` con l'attributo `stylesheet` dà in più l'avviso
  `stylesheet-ignored`, con `target` l'`id` nominato, o il successore se è
  ritirato, come per `reference-text-missing`. L'alternativa, uno
  `stylesheet` per capitolo che si somma a quello della radice, servirebbe a
  riusare un capitolo con il suo aspetto in più documenti, ma chiede un
  ordine fra i due fogli.

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
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "attributes": {"title": "Rapporto del terzo trimestre", "stylesheet": "report"}, "content": [["title", "Rapporto del terzo trimestre"], ["embed", {"id": "cap-vendite", "kind": "chapter", "depth": 1, "number": "1"}, ["title", "Le vendite"], ["embed", {"id": "calo-q3-sintesi", "kind": "text", "class": ["evidenza"], "computedStyle": {"font-weight": "700"}}, ["paragraph", "Le vendite sono calate del 12%."]], ["embed", {"id": "lavagna", "kind": "image", "asset": "lavagna.jpg", "number": "1"}, ["paragraph", "Foto della lavagna con le vendite mensili."]]]]}
  ]
}
````````````````````````````````

Nel nodo del `chapter` il `computed style`, il `depth` e il `number` non ci sono: dipende dalla `composition` in cui
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
  porta anche l'`id` in righe `chiave: valore` (esempio 8). Uno `stylesheet`
  senza commento d'intestazione dà `kind-missing` e `id-missing`.
- Le regole si agganciano ai nodi con `class`; gli `id` non sono selettori.
- Lo `stylesheet` non cambia il contenuto né il `reading order`.
- Una dichiarazione o un selettore fuori dal sottoinsieme (una proprietà
  sconosciuta, un valore non ammesso, `!important`) si ignora con un avviso,
  come gli attributi sconosciuti (§1): così uno `stylesheet` scritto per una
  `spec version` successiva si apre ancora. Una at-rule (`@media`, `@import`
  e simili) si ignora intera, con `stylesheet-unsupported` e `target` la
  parola chiave con la chiocciola; una dichiarazione senza «:» ha come
  `target` il suo testo, senza spazi ai bordi.

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
- **`kind` della specifica letti come `directive`.** *(proposta)* Gli
  elenchi di `embed-kind` e `association-kind` nominano `kind` della
  specifica e valgono in ogni classe, anche quando l'implementazione legge
  quel `kind` come `directive`. In una classe 1 un `deck` dà `kind-unknown`
  sul suo file, e un `embed` o un'`association` con lui danno anche
  `embed-kind` o `association-kind`: così la classe 6 non cambia il giudizio
  su un file valido.
- **`id reference`.** Il `core` ha una forma generica dei riferimenti per `id`
  [C: «Sulla bozza di specifica»]. *(proposta)* La forma:
  `![[id]]` per un blocco, con le `class` accanto (`{.nota}`, §0.15),
  `[[id]]` o `[[id|testo]]` in linea; negli
  attributi, la lista `associations` e un valore che è esattamente
  `"[[id]]"`, fra virgolette come nelle proprietà di Obsidian
  ([Properties](https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Properties.md)).
  Così il `runtime` controlla e riscrive i riferimenti anche dentro una
  `directive`: un `deck` letto da un'implementazione di classe 1 ha comunque
  i suoi `embed` controllati (esempio 12). Nel `resolved tree` un valore
  riferimento appare come l'`id` risolto. Resta un costo: ogni stringa
  scritta `"[[...]]"` diventa un riferimento, e per scriverla come testo
  serve una regola. Un riferimento in linea si vede nell'esempio 28.
- **Un `[[id]]` in linea che non si risolve** è l'errore
  `reference-unresolved`, come negli attributi, e nel `resolved tree` resta
  un `hyperlink` con `ref` e `"unresolved": true`, e come testo quello scritto
  o l'`id`. Verso un `id` ritirato con successore si risolve sul successore,
  con l'avviso `reference-retired` e un `fix` che lo riscrive; il testo
  mostrato e il `target` di `reference-text-missing` sono quelli del
  successore. `reference-retired` vale anche per un valore di attributo
  `"[[id]]"`.

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
2. legge il `document file`, poi di ogni `source` `kind`, `id`, attributi e
   corpo;
3. controlla forma e unicità degli `id` e i `kind`;
4. legge `retired-ids.yaml` e costruisce la mappa degli `id`;
5. calcola l'unione delle `association` e ne controlla i bersagli;
6. risolve gli `embed` e i capitoli annidati, gli `asset` e gli `stylesheet`
   nominati;
7. calcola le righe di calcolo, e per ogni `composition` radice la
   `numbering` e il `computed style` del suo nodo e dei nodi del suo
   contenuto.

*(proposta)* **Limiti di sicurezza**, perché il documento si risolva in un
tempo finito, con tre limiti del `resolved tree`:
- 1000 livelli di `embed` uno dentro l'altro, contati sotto il nodo che li
  contiene, che non conta;
- 100000 `embed` in tutto;
- 50 milioni di caratteri nelle stringhe di testo del contenuto, perché ogni
  `embed` porta il suo contenuto risolto e un documento valido di 25 KB può
  dare un albero di 800 milioni di caratteri.

Oltre un limite, l'`embed` e quelli che seguono si tagliano: ciascuno diventa
`{"id": …, "unresolved": true}`, senza figli, con l'errore `tree-limit`, e
l'albero esce comunque. Un `recursion` con un limite alto e due `embed` di sé
stesso ne avrebbe altrimenti 2^(n+1)-1. Il limite di `recursion` (§0.17) si
applica prima: un `embed` che per `recursion` non entra nell'albero non è mai
`tree-limit`. Un annidamento Markdown oltre 100 livelli è
`syntax`, e una riga di calcolo con più di 100 parentesi è
`math-line-invalid`.

La risoluzione non si ferma a un errore: l'albero esce sempre, con il
`diagnostic` accanto. Con un errore la `cli` esce con un codice diverso da
zero e l'`export` si rifiuta; con un'opzione esplicita l'HTML esce lo
stesso, con i pezzi mancanti segnati [C: «Sulla bozza di specifica»].
*(proposta)* L'opzione è `--allow-errors`, e il codice di uscita resta 1.
*(proposta)* L'`export` (§11.4) ha due limiti suoi: un'immagine si
incorpora fino a 64 MiB, altrimenti resta fuori con `asset-unsupported`, e
l'HTML intero non supera 256 MiB, altrimenti non si scrive, nemmeno con
`--allow-errors` (`export-too-large`).
I codici di uscita: 0 senza
errori (gli avvisi sono ammessi), 1 se l'albero ha almeno un errore, 2 per
un uso sbagliato o una cartella che non si legge, 3 per un errore interno
del `runtime`, con il messaggio su stderr e senza albero. Lo stesso controllo gira dopo ogni merge e ogni
modifica esterna: Git non vede che un ramo ha cancellato un oggetto che un
altro collega (bozza-nodi.md §3). Un riferimento a un `id` doppio non si
risolve e non dà un secondo errore.

### 11.2 I `diagnostic` *(proposta)*

*(proposta)* Un codice dà un `diagnostic` per ogni occorrenza, con il suo
`target` (per esempio `reference-retired` o `math-line-invalid` ripetuti
nello stesso file); quelli segnati «uno per file» ne danno uno solo.

Ogni `diagnostic` ha `severity` (`error` o `warning`), `code`, `file`, e
secondo il codice `target` e `message`. Ogni errore ha anche un `fix` [C:
«Lo strumento nasce con una riga di comando»]; un avviso può averlo. *(proposta)* Per un `diagnostic` che riguarda
tutta la cartella, come `document-missing`, `file` è `.`. Per un `id`
ritirato con successore il `target` di `association-kind`, `embed-kind`,
`stylesheet-kind`, `stylesheet-ignored` e `number-slot-kind` è il successore; senza successore
il riferimento non si risolve (§0.3) e il `target` è l'`id` scritto.

| Codice | Gravità | Quando | `target` | Esempio |
|---|---|---|---|---|
| `syntax` | error | il file non si legge: un link simbolico, un file che non è UTF-8, un `front matter` senza chiusura o con YAML non valido | — | non coperto |
| `id-missing` | error | un file senza `id`; il `fix` propone l'`id`, che il `runtime` scrive quando riconcilia | — | 16 |
| `id-invalid` | error | `id` fuori forma | l'`id` | 14 |
| `id-duplicate` | error | due file, stesso `id`; uno per file | l'`id` | 13 |
| `id-reused` | error | un file vivo con un `id` ritirato | l'`id` | 19 |
| `kind-missing` | error | un file di testo senza `kind`; il nodo prende il `kind` dell'estensione | — | non coperto |
| `kind-file-extension-mismatch` | error | `kind` diverso dalla `file extension` | il `kind` scritto | 15 |
| `kind-unknown` | warning | `kind` non noto: `directive` | il `kind` | 12 |
| `attribute-unknown` | warning | attributo sconosciuto, ignorato | il nome | 12 |
| `attribute-invalid` | error | valore di forma sbagliata, due chiavi con la stessa forma in `camelCase` (`target` la seconda), un commento YAML nel `front matter` | il nome; — per un commento YAML | non coperto |
| `association-unresolved` | error | bersaglio inesistente | l'`id` | 6 |
| `association-kind` | error | con una `composition`, uno `stylesheet` o il `document file` | l'`id` | 18 |
| `association-retired` | warning | bersaglio ritirato, risolto sul successore | l'`id` ritirato | 17 |
| `embed-unresolved` | error | `id` inesistente | l'`id` | 9 |
| `embed-kind` | error | `embed` di un `concept`, di uno `scratch`, di un `article`, di un `deck`, di uno `stylesheet`, di un `canvas-file` o del `document file` | l'`id` | 11 |
| `embed-retired` | warning | `embed` di un `id` ritirato, risolto sul successore | l'`id` ritirato | non coperto |
| `embed-cycle` | error | un `chapter` che contiene sé stesso senza `recursion`; uno per `chapter` del ciclo che non la abilita e per `directive` del ciclo | l'`id` del `chapter` | 38 |
| `embed-outside-composition` | error | un `![[id]]` da solo in un capoverso di un file che non è una `composition` né una `directive` | l'`id` | 39 |
| `markdown-image` | error | un'immagine Markdown, `![alt](url)` o `![alt][rif]` | l'URL | 37, 41 |
| `tree-limit` | error | un `embed` oltre uno dei tre limiti del `resolved tree` (livelli, numero, caratteri; §11.1); uno per file | l'`id` del primo `embed` tagliato | non coperto |
| `retired-chain` | warning | in `retired-ids.yaml` un successore a sua volta ritirato | l'`id` | non coperto |
| `retired-cycle` | error | un ciclo fra successori | l'`id` | non coperto |
| `retired-successor-missing` | error | un successore che non esiste | l'`id` | non coperto |
| `text-blocks` | error | un `text` con più di un blocco, o con un titolo | — | 21 |
| `composition-content` | error | nel corpo di una `composition` un blocco che non è un `embed` né una riga di separazione | — | 10 |
| `raw-html` | error | HTML grezzo nel corpo, che non sia un commento; uno per file | — | 23 |
| `embed-inline` | error | un `![[id]]` dentro un capoverso | l'`id` | non coperto |
| `document-missing` | warning | nessun `document file`; il `fix` lo crea | — | 31 |
| `reference-retired` | warning | `[[id]]` verso un `id` ritirato, risolto sul successore | l'`id` ritirato | non coperto |
| `embed-class-invalid` | error | le `class` accanto a un `![[id]]` fuori dalla grammatica del §0.15 | la riga dal primo `{` alla fine, senza spazi ai bordi | 35 |
| `number-slot-kind` | warning | un `{n}` nel testo di un collegamento verso un nodo che non si numera mai | l'`id` | non coperto |
| `stylesheet-ignored` | warning | un `chapter` con l'attributo `stylesheet` | l'`id` dello `stylesheet` nominato, o il successore | non coperto |
| `stylesheet-kind` | error | l'attributo `stylesheet` nomina un `id` che non è uno `stylesheet` | l'`id` | non coperto |
| `spec-version-missing` | warning | un `document file` senza `spec-version` | — | non coperto |
| `lang-unsupported` | warning | una lingua fuori dalla tabella, una volta per file con righe di calcolo | il `lang` | non coperto |
| `reference-text-missing` | warning | `[[id]]` senza testo verso un oggetto senza `title` | l'`id` | 28 |
| `canvas-path-unresolved` | error | un percorso del `canvas file` senza file | il percorso | non coperto |
| `document-duplicate` | error | due file `document`; uno per file | l'`id` | non coperto |
| `document-content` | error | un corpo non vuoto in un file `document` | — | non coperto |
| `math-line-invalid` | warning | riga di calcolo fuori grammatica, divisione per zero, o valore fuori da decimal128 | l'espressione come la dà CommonMark, senza «= » iniziale | non coperto |
| `math-line-ambiguous` | warning | un numero come `1.200` | il numero | 22 |
| `eval-unsupported` | warning | blocco da eseguire nella classe 1 | — | non coperto |
| `asset-missing` | error | `asset` assente | il percorso | 7 |
| `stylesheet-unsupported` | warning | dichiarazione, selettore o at-rule fuori dal sottoinsieme, ignorati: proprietà, valore, `!important` | il nome della proprietà; per un selettore, il primo membro fuori dal sottoinsieme, come è scritto e senza spazi ai bordi; per una at-rule, la parola chiave; per una dichiarazione senza «:», il suo testo | non coperto |
| `reference-unresolved` | error | `id reference` senza bersaglio, in un attributo o in linea | l'`id` | non coperto |
| `asset-unsupported` | warning | solo nell'`export` (§11.4): un'immagine della pagina che non si incorpora, perché il formato non è riconosciuto, il file non si legge o supera 64 MiB; `file` è il descrittore dell'`image`; uno per descrittore | l'`asset` com'è scritto | non coperto |
| `export-too-large` | error | solo nell'`export`: l'HTML supererebbe 256 MiB, e non si scrive, anche con `--allow-errors`; `file` è quello dell'`article` radice; il `fix` suggerisce di ridurre le immagini o le loro inclusioni | — | non coperto |

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

```````````````````````````````` example 14 conf=0 status=proposal
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

Un file creato a mano senza `id` non ha un `id` finché il `runtime` non lo
scrive (§0.3); l'`id` proposto sta solo nel `fix`:

```````````````````````````````` example 16 conf=1 status=proposal
=== file ritardi-agosto.text.md
---
kind: text
---
Ad agosto due fornitori hanno consegnato con tre settimane di ritardo.
=== resolved
{
  "nodes": [
    {"kind": "text", "file": "ritardi-agosto.text.md", "content": [["paragraph", "Ad agosto due fornitori hanno consegnato con tre settimane di ritardo."]]}
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
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "attributes": {"title": "Rapporto del terzo trimestre"}, "content": [["title", "Rapporto del terzo trimestre"]]}
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

Senza `lang` nell'oggetto, la lingua del documento decide come si mostra il risultato (§0.4,
§0.8):

```````````````````````````````` example 25 conf=1 status=proposal
=== file rapporto-q3.document.md
---
id: rapporto-q3
kind: document
lang: it
spec-version: "0.1"
---
=== file costo.text.md
---
id: costo
kind: text
---
Due lotti: `= 1.5 + 0.9`.
=== resolved
{
  "nodes": [
    {"id": "costo", "kind": "text", "file": "costo.text.md", "content": [["paragraph", "Due lotti: ", ["mathLine", {"value": "2.4", "display": "2,4"}, "1.5 + 0.9"], "."]]}
  ],
  "document": {"id": "rapporto-q3", "file": "rapporto-q3.document.md", "attributes": {"lang": "it", "specVersion": "0.1"}}
}
````````````````````````````````

Un commento non è un blocco e non entra nel `resolved tree` (§0.13):

```````````````````````````````` example 26 conf=1 status=proposal
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
---
<!-- da ricontrollare con i dati di settembre -->
Le vendite sono calate del 12%.
=== resolved
{
  "nodes": [
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "content": [["paragraph", "Le vendite sono calate del 12%."]]}
  ]
}
````````````````````````````````

La `class` sull'`embed` vince su quella dell'oggetto, e due inclusioni dello
stesso oggetto hanno `class` diverse (§0.5, §0.15):

```````````````````````````````` example 27 conf=1 status=proposal
=== file report-q3.article.md
---
id: report-q3
kind: article
stylesheet: "[[report]]"
---
![[calo-q3-sintesi]]{.nota}

![[calo-q3-sintesi]]
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
class: [evidenza, urgente]
---
Le vendite sono calate del 12%.
=== file report.stylesheet.css
/*
kind: stylesheet
id: report
*/
.nota { color: #0000aa; }
.evidenza.urgente { color: #aa0000; }
=== resolved
{
  "nodes": [
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "attributes": {"class": ["evidenza", "urgente"]}, "content": [["paragraph", "Le vendite sono calate del 12%."]]},
    {"id": "report", "kind": "stylesheet", "file": "report.stylesheet.css"},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "attributes": {"stylesheet": "report"}, "content": [["embed", {"id": "calo-q3-sintesi", "kind": "text", "class": ["evidenza", "urgente", "nota"], "computedStyle": {"color": "#0000aa"}}, ["paragraph", "Le vendite sono calate del 12%."]], ["embed", {"id": "calo-q3-sintesi", "kind": "text", "class": ["evidenza", "urgente"], "computedStyle": {"color": "#aa0000"}}, ["paragraph", "Le vendite sono calate del 12%."]]]}
  ]
}
````````````````````````````````

Nell'esempio `.evidenza.urgente` è più specifica e viene dopo nello
`stylesheet`, ma nella prima inclusione vince `.nota`, perché è una `class`
dell'`embed`, nello strato che viene dopo; la seconda, senza `class`
accanto, resta rossa.

Un `[[id]]` senza testo mostra il `title`, altrimenti l'`id` con un avviso
(§7.4):

```````````````````````````````` example 28 conf=1 status=proposal
=== file vedi.text.md
---
id: vedi
kind: text
---
Vedi [[cap-vendite]] e [[calo-q3]].
=== file cap-vendite.chapter.md
---
id: cap-vendite
kind: chapter
title: Le vendite
---
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
    {"id": "cap-vendite", "kind": "chapter", "file": "cap-vendite.chapter.md", "attributes": {"title": "Le vendite"}},
    {"id": "vedi", "kind": "text", "file": "vedi.text.md", "content": [["paragraph", "Vedi ", ["hyperlink", {"ref": "cap-vendite"}, "Le vendite"], " e ", ["hyperlink", {"ref": "calo-q3"}, "calo-q3"], "."]]}
  ],
  "diagnostics": [
    {"severity": "warning", "code": "reference-text-missing", "file": "vedi.text.md", "target": "calo-q3", "fix": "[[calo-q3|testo]]"}
  ]
}
````````````````````````````````

Uno `strong` che torna nero sotto un `embed` blu porta il suo colore (§0.5):

```````````````````````````````` example 29 conf=1 status=proposal
=== file report-q3.article.md
---
id: report-q3
kind: article
stylesheet: "[[report]]"
---
![[calo-q3-sintesi]]
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
class: [nota]
---
Le vendite sono **calate**.
=== file report.stylesheet.css
/*
kind: stylesheet
id: report
*/
.nota { color: #0000aa; }
strong { color: #000000; }
=== resolved
{
  "nodes": [
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "attributes": {"class": ["nota"]}, "content": [["paragraph", "Le vendite sono ", ["strong", "calate"], "."]]},
    {"id": "report", "kind": "stylesheet", "file": "report.stylesheet.css"},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "attributes": {"stylesheet": "report"}, "content": [["embed", {"id": "calo-q3-sintesi", "kind": "text", "class": ["nota"], "computedStyle": {"color": "#0000aa"}}, ["paragraph", "Le vendite sono ", ["strong", {"computedStyle": {"color": "#000000"}}, "calate"], "."]]]}
  ]
}
````````````````````````````````

Un capitolo senza `title` non conta e non aumenta il grado (§0.10):

```````````````````````````````` example 30 conf=1 status=proposal
=== file report-q3.article.md
---
id: report-q3
kind: article
---
![[cap-senza]]
=== file cap-senza.chapter.md
---
id: cap-senza
kind: chapter
---
![[cap-cause]]
=== file cap-cause.chapter.md
---
id: cap-cause
kind: chapter
title: Le cause
---
![[ritardi-agosto]]
=== file ritardi-agosto.text.md
---
id: ritardi-agosto
kind: text
---
Ad agosto due fornitori hanno consegnato in ritardo.
=== resolved
{
  "nodes": [
    {"id": "cap-cause", "kind": "chapter", "file": "cap-cause.chapter.md", "attributes": {"title": "Le cause"}, "content": [["embed", {"id": "ritardi-agosto", "kind": "text"}, ["paragraph", "Ad agosto due fornitori hanno consegnato in ritardo."]]]},
    {"id": "cap-senza", "kind": "chapter", "file": "cap-senza.chapter.md", "content": [["embed", {"id": "cap-cause", "kind": "chapter"}, ["embed", {"id": "ritardi-agosto", "kind": "text"}, ["paragraph", "Ad agosto due fornitori hanno consegnato in ritardo."]]]]},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["embed", {"id": "cap-senza", "kind": "chapter"}, ["embed", {"id": "cap-cause", "kind": "chapter", "depth": 1, "number": "1"}, ["title", "Le cause"], ["embed", {"id": "ritardi-agosto", "kind": "text"}, ["paragraph", "Ad agosto due fornitori hanno consegnato in ritardo."]]]]]},
    {"id": "ritardi-agosto", "kind": "text", "file": "ritardi-agosto.text.md", "content": [["paragraph", "Ad agosto due fornitori hanno consegnato in ritardo."]]}
  ]
}
````````````````````````````````

Senza `document file` il `runtime` dà un avviso e lo crea (§0.8):

```````````````````````````````` example 31 conf=0 status=proposal
=== no-document
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
---
Nel terzo trimestre le vendite calano.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]}
  ],
  "diagnostics": [
    {"severity": "warning", "code": "document-missing", "file": ".", "fix": "crea document.document.md"}
  ]
}
````````````````````````````````

Una `class` sull'`article` va nel `computedStyle` del suo nodo; il figlio
eredita il colore e non il margine (§0.5):

```````````````````````````````` example 32 conf=1 status=proposal
=== file report-q3.article.md
---
id: report-q3
kind: article
class: [scuro]
stylesheet: "[[report]]"
---
![[calo-q3-sintesi]]
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
---
Le vendite sono calate del 12%.
=== file report.stylesheet.css
/*
kind: stylesheet
id: report
*/
.scuro { color: #333333; margin-left: 12pt; }
=== resolved
{
  "nodes": [
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "content": [["paragraph", "Le vendite sono calate del 12%."]]},
    {"id": "report", "kind": "stylesheet", "file": "report.stylesheet.css"},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "attributes": {"class": ["scuro"], "stylesheet": "report"}, "computedStyle": {"color": "#333333", "margin-left": "12pt"}, "content": [["embed", {"id": "calo-q3-sintesi", "kind": "text"}, ["paragraph", "Le vendite sono calate del 12%."]]]}
  ]
}
````````````````````````````````

Il `number slot` prende il numero nella `composition` radice e si toglie
altrove (§0.14):

```````````````````````````````` example 33 conf=1 status=proposal
=== file report-q3.article.md
---
id: report-q3
kind: article
---
![[cap-vendite]]
=== file cap-vendite.chapter.md
---
id: cap-vendite
kind: chapter
title: Le vendite
---
![[lavagna]]

![[vedi]]
=== file lavagna.image.md
---
id: lavagna
kind: image
asset: lavagna.jpg
---
Foto della lavagna.
=== asset lavagna.jpg
=== file vedi.text.md
---
id: vedi
kind: text
---
Come mostra la [[lavagna|figura {n}]], nel [[cap-vendite|capitolo {n}]] le vendite calano.
=== resolved
{
  "nodes": [
    {"id": "cap-vendite", "kind": "chapter", "file": "cap-vendite.chapter.md", "attributes": {"title": "Le vendite"}, "content": [["embed", {"id": "lavagna", "kind": "image", "asset": "lavagna.jpg"}, ["paragraph", "Foto della lavagna."]], ["embed", {"id": "vedi", "kind": "text"}, ["paragraph", "Come mostra la ", ["hyperlink", {"ref": "lavagna"}, "figura"], ", nel ", ["hyperlink", {"ref": "cap-vendite"}, "capitolo"], " le vendite calano."]]]},
    {"id": "lavagna", "kind": "image", "file": "lavagna.image.md", "attributes": {"asset": "lavagna.jpg"}, "content": [["paragraph", "Foto della lavagna."]]},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["embed", {"id": "cap-vendite", "kind": "chapter", "depth": 1, "number": "1"}, ["title", "Le vendite"], ["embed", {"id": "lavagna", "kind": "image", "asset": "lavagna.jpg", "number": "1"}, ["paragraph", "Foto della lavagna."]], ["embed", {"id": "vedi", "kind": "text"}, ["paragraph", "Come mostra la ", ["hyperlink", {"ref": "lavagna"}, "figura 1"], ", nel ", ["hyperlink", {"ref": "cap-vendite"}, "capitolo 1"], " le vendite calano."]]]]},
    {"id": "vedi", "kind": "text", "file": "vedi.text.md", "content": [["paragraph", "Come mostra la ", ["hyperlink", {"ref": "lavagna"}, "figura"], ", nel ", ["hyperlink", {"ref": "cap-vendite"}, "capitolo"], " le vendite calano."]]}
  ]
}
````````````````````````````````

Uno `stylesheet` colpisce i titoli per grado (§0.16):

```````````````````````````````` example 34 conf=1 status=proposal
=== file report-q3.article.md
---
id: report-q3
kind: article
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
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
---
Le vendite sono calate del 12%.
=== file report.stylesheet.css
/*
kind: stylesheet
id: report
*/
title-1 { font-size: 24pt; }
=== resolved
{
  "nodes": [
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "content": [["paragraph", "Le vendite sono calate del 12%."]]},
    {"id": "cap-vendite", "kind": "chapter", "file": "cap-vendite.chapter.md", "attributes": {"title": "Le vendite"}, "content": [["embed", {"id": "calo-q3-sintesi", "kind": "text"}, ["paragraph", "Le vendite sono calate del 12%."]]]},
    {"id": "report", "kind": "stylesheet", "file": "report.stylesheet.css"},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "attributes": {"stylesheet": "report"}, "content": [["embed", {"id": "cap-vendite", "kind": "chapter", "depth": 1, "number": "1"}, ["title", {"computedStyle": {"font-size": "24pt"}}, "Le vendite"], ["embed", {"id": "calo-q3-sintesi", "kind": "text"}, ["paragraph", "Le vendite sono calate del 12%."]]]]}
  ]
}
````````````````````````````````

Un segno mal formato dà un errore, e l'`embed` vale senza `class` (§0.15):

```````````````````````````````` example 35 conf=1 status=proposal
=== file report-q3.article.md
---
id: report-q3
kind: article
---
![[calo-q3-sintesi]] {.nota}
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
---
Le vendite sono calate del 12%.
=== resolved
{
  "nodes": [
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "content": [["paragraph", "Le vendite sono calate del 12%."]]},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["embed", {"id": "calo-q3-sintesi", "kind": "text"}, ["paragraph", "Le vendite sono calate del 12%."]]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "embed-class-invalid", "file": "report-q3.article.md", "target": "{.nota}", "fix": "![[calo-q3-sintesi]]{.nota}"}
  ]
}
````````````````````````````````

Un blocco da eseguire porta il marcatore e non si esegue (§7.1):

```````````````````````````````` example 36 conf=1 status=proposal
=== file prova.text.md
---
id: prova
kind: text
---
```python eval
print(1 + 1)
```
=== resolved
{
  "nodes": [
    {"id": "prova", "kind": "text", "file": "prova.text.md", "content": [["code", {"lang": "python", "eval": true}, "print(1 + 1)"]]}
  ],
  "diagnostics": [
    {"severity": "warning", "code": "eval-unsupported", "file": "prova.text.md"}
  ]
}
````````````````````````````````

Un'immagine Markdown resta testo, con un errore (§7.1):

```````````````````````````````` example 37 conf=1 status=proposal
=== file vedi.text.md
---
id: vedi
kind: text
---
Vedi ![la lavagna](lavagna.jpg).
=== resolved
{
  "nodes": [
    {"id": "vedi", "kind": "text", "file": "vedi.text.md", "content": [["paragraph", "Vedi ![la lavagna](lavagna.jpg)."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "markdown-image", "file": "vedi.text.md", "target": "lavagna.jpg", "fix": "un image con asset lavagna.jpg, incluso con ![[id]]"}
  ]
}
````````````````````````````````

Due capitoli che si contengono a vicenda (§8):

```````````````````````````````` example 38 conf=1 status=proposal
=== file cap-a.chapter.md
---
id: cap-a
kind: chapter
---
![[cap-b]]
=== file cap-b.chapter.md
---
id: cap-b
kind: chapter
---
![[cap-a]]
=== resolved
{
  "nodes": [
    {"id": "cap-a", "kind": "chapter", "file": "cap-a.chapter.md", "content": [["embed", {"id": "cap-b", "kind": "chapter"}, ["embed", {"id": "cap-a", "unresolved": true}]]]},
    {"id": "cap-b", "kind": "chapter", "file": "cap-b.chapter.md", "content": [["embed", {"id": "cap-a", "kind": "chapter"}, ["embed", {"id": "cap-b", "unresolved": true}]]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "embed-cycle", "file": "cap-a.chapter.md", "target": "cap-a", "fix": "togli l'embed che chiude il ciclo"},
    {"severity": "error", "code": "embed-cycle", "file": "cap-b.chapter.md", "target": "cap-b", "fix": "togli l'embed che chiude il ciclo"}
  ]
}
````````````````````````````````

Un `![[id]]` in un `text` non include niente (§0.6):

```````````````````````````````` example 39 conf=1 status=proposal
=== file vedi.text.md
---
id: vedi
kind: text
---
![[lavagna]]
=== resolved
{
  "nodes": [
    {"id": "vedi", "kind": "text", "file": "vedi.text.md", "content": [["paragraph", "![[lavagna]]"]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "embed-outside-composition", "file": "vedi.text.md", "target": "lavagna", "fix": "sposta ![[lavagna]] in una composition"}
  ]
}
````````````````````````````````

Un capitolo che si contiene due volte (§0.17):

```````````````````````````````` example 40 conf=1 status=proposal
=== file cap-a.chapter.md
---
id: cap-a
kind: chapter
recursion: "2"
---
![[nota]]

![[cap-a]]
=== file nota.text.md
---
id: nota
kind: text
---
Una nota.
=== resolved
{
  "nodes": [
    {"id": "cap-a", "kind": "chapter", "file": "cap-a.chapter.md", "attributes": {"recursion": "2"}, "content": [["embed", {"id": "nota", "kind": "text"}, ["paragraph", "Una nota."]], ["embed", {"id": "cap-a", "kind": "chapter"}, ["embed", {"id": "nota", "kind": "text"}, ["paragraph", "Una nota."]], ["embed", {"id": "cap-a", "kind": "chapter"}, ["embed", {"id": "nota", "kind": "text"}, ["paragraph", "Una nota."]]]]]},
    {"id": "nota", "kind": "text", "file": "nota.text.md", "content": [["paragraph", "Una nota."]]}
  ]
}
````````````````````````````````

Un'immagine Markdown per riferimento ha come `target` l'URL della definizione
(§7.1):

```````````````````````````````` example 41 conf=1 status=proposal
=== file vedi.text.md
---
id: vedi
kind: text
---
Vedi ![la lavagna][l].

[l]: lavagna.jpg
=== resolved
{
  "nodes": [
    {"id": "vedi", "kind": "text", "file": "vedi.text.md", "content": [["paragraph", "Vedi ![la lavagna][l]."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "markdown-image", "file": "vedi.text.md", "target": "lavagna.jpg", "fix": "un image con asset lavagna.jpg, incluso con ![[id]]"}
  ]
}
````````````````````````````````

Un `title` vuoto vale come assente, ma resta negli attributi (§0.7):

```````````````````````````````` example 42 conf=1 status=proposal
=== file report-q3.article.md
---
id: report-q3
kind: article
---
![[cap-vuoto]]
=== file cap-vuoto.chapter.md
---
id: cap-vuoto
kind: chapter
title: ""
---
![[nota]]
=== file nota.text.md
---
id: nota
kind: text
---
Una nota.
=== resolved
{
  "nodes": [
    {"id": "cap-vuoto", "kind": "chapter", "file": "cap-vuoto.chapter.md", "attributes": {"title": ""}, "content": [["embed", {"id": "nota", "kind": "text"}, ["paragraph", "Una nota."]]]},
    {"id": "nota", "kind": "text", "file": "nota.text.md", "content": [["paragraph", "Una nota."]]},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["embed", {"id": "cap-vuoto", "kind": "chapter"}, ["embed", {"id": "nota", "kind": "text"}, ["paragraph", "Una nota."]]]]}
  ]
}
````````````````````````````````

Un capitolo che si ripete prende i numeri di un capitolo annidato (§0.17):

```````````````````````````````` example 43 conf=1 status=proposal
=== file report-q3.article.md
---
id: report-q3
kind: article
---
![[cap-a]]
=== file cap-a.chapter.md
---
id: cap-a
kind: chapter
title: Le vendite
recursion: "2"
---
![[nota]]

![[cap-a]]
=== file nota.text.md
---
id: nota
kind: text
---
Una nota.
=== resolved
{
  "nodes": [
    {"id": "cap-a", "kind": "chapter", "file": "cap-a.chapter.md", "attributes": {"title": "Le vendite", "recursion": "2"}, "content": [["embed", {"id": "nota", "kind": "text"}, ["paragraph", "Una nota."]], ["embed", {"id": "cap-a", "kind": "chapter"}, ["embed", {"id": "nota", "kind": "text"}, ["paragraph", "Una nota."]], ["embed", {"id": "cap-a", "kind": "chapter"}, ["embed", {"id": "nota", "kind": "text"}, ["paragraph", "Una nota."]]]]]},
    {"id": "nota", "kind": "text", "file": "nota.text.md", "content": [["paragraph", "Una nota."]]},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["embed", {"id": "cap-a", "kind": "chapter", "depth": 1, "number": "1"}, ["title", "Le vendite"], ["embed", {"id": "nota", "kind": "text"}, ["paragraph", "Una nota."]], ["embed", {"id": "cap-a", "kind": "chapter", "depth": 2, "number": "1.1"}, ["title", "Le vendite"], ["embed", {"id": "nota", "kind": "text"}, ["paragraph", "Una nota."]], ["embed", {"id": "cap-a", "kind": "chapter", "depth": 3, "number": "1.1.1"}, ["title", "Le vendite"], ["embed", {"id": "nota", "kind": "text"}, ["paragraph", "Una nota."]]]]]]}
  ]
}
````````````````````````````````

### 11.3 Il `resolved tree` *(proposta)*

È un valore JSON con tre liste, e la chiave `document` con il `document file`
se ha attributi oltre a `id`, `kind`, `tags` e `spec-version`; una lista
vuota si omette. La
chiave `document` ha `id`, `file` e `attributes`, come un nodo ma senza
`kind`. Con `document-duplicate` la chiave non c'è: nessuno dei due file vale,
e il documento resta senza lingua e senza `spec version` finché non se ne
toglie uno.

- **`nodes`**: un elemento per `source`, tranne `retired-ids.yaml` e il
  `document file`, ordinati
  per `id` e poi per `file`; un nodo senza `id` (esempio 16) non ha la chiave
  `id` e conta come `id` vuoto. Ogni nodo ha `id`, `kind`, `file` (percorso con
  `/`), `attributes` (quelli dichiarati tranne `id`, `kind` e
  `associations`; si omette se vuoto), `content` (il corpo, preceduto dal nodo del titolo nell'`article` con
  `title`, §0.7; si omette se il `kind` non ne ha o è vuoto) e `"directive": true` per i `kind`
  non noti. Il nodo della `composition` radice ha anche `computedStyle`, se
  non è vuoto (§0.5).
- **Le chiavi** degli `attributes` sono in `camelCase`, come vuole il
  glossario per il JSON: `spec-version` diventa `specVersion`. Un trattino seguito da una lettera diventa la lettera
  maiuscola; un trattino seguito da una cifra resta (`voce-2`); una chiave
  senza trattini resta com'è. Se due chiavi danno la stessa forma, come
  `foo-bar` e `fooBar`, è `attribute-invalid` sulla seconda, e vale la
  prima. Fuori dagli `attributes`, restano come sono i nomi delle proprietà
  CSS usati come chiavi di `computedStyle`.
- **`associations`**: una per coppia risolta, con `ids` (i due `id` in ordine)
  e `declaredIn` (i file che la dichiarano, in ordine); ordinate per `ids`.
- **`diagnostics`**: ordinati per `file`, `code` e `target`.

Gli ordini sono per punti di codice Unicode. Due alberi si confrontano come
valori JSON: l'ordine delle chiavi di un oggetto non conta, quello degli array
sì, e non conta come si stampa, compatto o indentato.

Il contenuto segue la forma di JsonML, con valori estesi: JsonML ammette
come valori degli attributi solo stringhe, numeri, `true`, `false` e `null`
([syntax](http://www.jsonml.org/syntax/)), qui ci sono anche liste (`class`)
e oggetti (`computedStyle`). Un blocco o un pezzo in linea è un
array con il tipo, un oggetto di attributi facoltativo e i figli; il testo è
una stringa. Un a capo morbido diventa uno spazio, e stringhe vicine si
uniscono; l'HTML grezzo diventa testo, tranne i commenti, che non entrano. I
tipi in linea `hyperlink` (con `ref` per un `id reference` o `url`),
`emphasis`, `strong` e `inlineCode` sono normativi (§0.5). Gli altri nomi
sono presi da mdast (`paragraph`, `heading`, `list`, `listItem`,
`blockquote`, `code`, `table`, `tableRow`, `tableCell`, `break`,
`thematicBreak`), con gli attributi di mdast: `depth` per `heading`;
`"ordered": true` per un elenco numerato, con `start` se è diverso da 1;
`lang` per `code`, e `"eval": true` o `"echo": true` per i suoi marcatori;
per `table`, se una colonna è allineata, `align`, una lista con `left`,
`right`, `center` o `null` per colonna; la prima `tableRow` è
l'intestazione. Più `embed`, `title` e `mathLine`, con `value` e
`display`, oppure `invalid`; non sono normativi finché la bozza non fissa i nomi (glossario
§1.3): alcuni collidono con il glossario, per esempio paragraph è fra i *Da
non usare* di `text`. Manca ancora la definizione di una
`footnote`; un `cross-ref` è un `hyperlink` con il
numero già nel testo (§0.14).

Nel contenuto di una `composition` un `embed` porta negli attributi `id`,
`kind`, il `lang` effettivo (quello dell'oggetto o, se manca, quello del
documento), e se ci sono la `class` (quelle dell'oggetto, poi quelle
dell'`embed`), l'`asset` dell'oggetto, il grado (`depth`) di un `chapter`, il
`number` di capitoli e immagini (§0.10) e il `computed style` (§0.5); come
figli, il suo contenuto risolto. *(proposta)* Il titolo di un `chapter` è il
primo figlio del suo `embed` nella `composition` radice, `["title", "Le
vendite"]`, così le regole `title-1`, `title-2`, `title-3` e i valori che
eredita dal `chapter` hanno dove stare; porta `computedStyle` come gli altri
nodi (§0.16, esempio 34). Nel nodo del `chapter` il titolo
resta solo nell'attributo `title`, e `content` è il corpo. Allo stesso modo il
titolo dell'`article` è il primo figlio del suo contenuto (§0.7). Un `embed` che non si risolve ha `"unresolved":
true`, le `class` del segno se ci sono, e nessun figlio. Così un `renderer` legge la `composition` senza
cercare altri nodi. *(proposta)* Per un `image` l'`asset` dell'`embed` è il
percorso del file dalla cartella del documento, con le barre `/`, perché il
percorso scritto nel descrittore vale dalla cartella del descrittore (§2) e
l'`embed` da solo non direbbe dove sta il file; con `asset-missing`
l'`embed` non porta `asset`, e chi disegna mostra la descrizione, che è la
`static fallback` (§7.2, esempio 47). Nel nodo dell'`image` l'`asset` resta com'è
scritto.

Gli esempi 44-47 mostrano le ultime proposte di questa sezione e del §0.5.
Il collegamento è sottolineato dal foglio di partenza, e uno `stylesheet` lo
toglie (esempio 44):

```````````````````````````````` example 44 conf=1 status=proposal
=== file uno.article.md
---
id: uno
kind: article
---
![[nota-sito]]
=== file due.article.md
---
id: due
kind: article
stylesheet: "[[sobrio]]"
---
![[nota-sito]]
=== file nota-sito.text.md
---
id: nota-sito
kind: text
---
Vedi [il sito](https://example.com).
=== file sobrio.stylesheet.css
/*
kind: stylesheet
id: sobrio
*/
hyperlink { text-decoration: none; }
=== resolved
{
  "nodes": [
    {"id": "due", "kind": "article", "file": "due.article.md", "attributes": {"stylesheet": "sobrio"}, "content": [["embed", {"id": "nota-sito", "kind": "text"}, ["paragraph", "Vedi ", ["hyperlink", {"url": "https://example.com", "computedStyle": {"text-decoration-line": "none"}}, "il sito"], "."]]]},
    {"id": "nota-sito", "kind": "text", "file": "nota-sito.text.md", "content": [["paragraph", "Vedi ", ["hyperlink", {"url": "https://example.com"}, "il sito"], "."]]},
    {"id": "sobrio", "kind": "stylesheet", "file": "sobrio.stylesheet.css"},
    {"id": "uno", "kind": "article", "file": "uno.article.md", "content": [["embed", {"id": "nota-sito", "kind": "text"}, ["paragraph", "Vedi ", ["hyperlink", {"url": "https://example.com"}, "il sito"], "."]]]}
  ]
}
````````````````````````````````

L'allineamento delle colonne batte quello che la cella erediterebbe; la
colonna senza allineamento eredita il centro dell'`embed` (esempio 45):

```````````````````````````````` example 45 conf=1 status=proposal
=== file report-q3.article.md
---
id: report-q3
kind: article
stylesheet: "[[report]]"
---
![[vendite]]{.centro}
=== file vendite.text.md
---
id: vendite
kind: text
---
| Mese | Vendite | Nota |
|:--|--:|---|
| luglio | 120 | calo |
=== file report.stylesheet.css
/*
kind: stylesheet
id: report
*/
.centro { text-align: center; }
=== resolved
{
  "nodes": [
    {"id": "report", "kind": "stylesheet", "file": "report.stylesheet.css"},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "attributes": {"stylesheet": "report"}, "content": [["embed", {"id": "vendite", "kind": "text", "class": ["centro"], "computedStyle": {"text-align": "center"}}, ["table", {"align": ["left", "right", null]}, ["tableRow", ["tableCell", {"computedStyle": {"text-align": "left"}}, "Mese"], ["tableCell", {"computedStyle": {"text-align": "right"}}, "Vendite"], ["tableCell", "Nota"]], ["tableRow", ["tableCell", {"computedStyle": {"text-align": "left"}}, "luglio"], ["tableCell", {"computedStyle": {"text-align": "right"}}, "120"], ["tableCell", "calo"]]]]]},
    {"id": "vendite", "kind": "text", "file": "vendite.text.md", "content": [["table", {"align": ["left", "right", null]}, ["tableRow", ["tableCell", "Mese"], ["tableCell", "Vendite"], ["tableCell", "Nota"]], ["tableRow", ["tableCell", "luglio"], ["tableCell", "120"], ["tableCell", "calo"]]]]}
  ]
}
````````````````````````````````

Il titolo dell'`article` è il primo figlio del suo contenuto, e `title-0` lo
colpisce; `1em` vale sul suo `font-size` (esempio 46):

```````````````````````````````` example 46 conf=1 status=proposal
=== file report-q3.article.md
---
id: report-q3
kind: article
title: Rapporto del terzo trimestre
stylesheet: "[[report]]"
---
![[nota]]
=== file nota.text.md
---
id: nota
kind: text
---
Una nota.
=== file report.stylesheet.css
/*
kind: stylesheet
id: report
*/
title-0 { font-size: 26pt; color: #333333; margin-bottom: 1em; }
=== resolved
{
  "nodes": [
    {"id": "nota", "kind": "text", "file": "nota.text.md", "content": [["paragraph", "Una nota."]]},
    {"id": "report", "kind": "stylesheet", "file": "report.stylesheet.css"},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "attributes": {"title": "Rapporto del terzo trimestre", "stylesheet": "report"}, "content": [["title", {"computedStyle": {"font-size": "26pt", "color": "#333333", "margin-bottom": "26pt"}}, "Rapporto del terzo trimestre"], ["embed", {"id": "nota", "kind": "text"}, ["paragraph", "Una nota."]]]}
  ]
}
````````````````````````````````

L'`asset` dell'`embed` è il percorso dalla cartella del documento; con
`asset-missing` l'`embed` non lo porta (esempio 47):

```````````````````````````````` example 47 conf=1 status=proposal
=== file report-q3.article.md
---
id: report-q3
kind: article
---
![[lavagna]]

![[rotta]]
=== file immagini/lavagna.image.md
---
id: lavagna
kind: image
asset: foto/lavagna.png
---
La lavagna.
=== asset immagini/foto/lavagna.png
=== file rotta.image.md
---
id: rotta
kind: image
asset: manca.png
---
Un'immagine che manca.
=== resolved
{
  "nodes": [
    {"id": "lavagna", "kind": "image", "file": "immagini/lavagna.image.md", "attributes": {"asset": "foto/lavagna.png"}, "content": [["paragraph", "La lavagna."]]},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["embed", {"id": "lavagna", "kind": "image", "asset": "immagini/foto/lavagna.png", "number": "1"}, ["paragraph", "La lavagna."]], ["embed", {"id": "rotta", "kind": "image", "number": "2"}, ["paragraph", "Un'immagine che manca."]]]},
    {"id": "rotta", "kind": "image", "file": "rotta.image.md", "attributes": {"asset": "manca.png"}, "content": [["paragraph", "Un'immagine che manca."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "asset-missing", "file": "rotta.image.md", "target": "manca.png", "fix": "aggiungi il file o correggi il percorso"}
  ]
}
````````````````````````````````

### 11.4 L'`export` *(proposta)*

Il comando `doc-runtime export <cartella> [--root <id>] [-o <file>]
[--allow-errors]` scrive l'HTML di un `article`: un solo file, con il CSS e
le immagini dentro, che si manda e si apre ovunque [C: «Sulla bozza di specifica»].
`--root` sceglie l'`article` per `id`; senza, la cartella deve averne uno
solo. L'HTML va su stdout, o nel file di `-o`, che si scrive per intero o
non si tocca. Con un errore nell'albero l'`export` si rifiuta, e con
`--allow-errors` scrive lo stesso l'HTML, con i pezzi mancanti segnati (§11.1).
Un'immagine si riconosce dai primi byte, fra PNG, JPEG, GIF, WebP e SVG, mai
dall'estensione, e si incorpora fino a 64 MiB; un'altra resta fuori, con la
sua descrizione al posto e l'avviso `asset-unsupported`. L'HTML intero non
supera 256 MiB (`export-too-large`). Gli stessi file danno gli stessi byte.

La pagina non carica niente da fuori: una Content Security Policy ammette
solo le immagini `data:` e lo stile in linea, e nessuno script. Un
collegamento a un URL ha `href` solo per `http:`, `https:` e `mailto:`, o
per `#id` di un oggetto nella pagina; un percorso relativo, come
`allegato.pdf`, resta testo senza `href`, perché il file HTML viaggia da
solo.

Ogni elemento che rappresenta un nodo porta nell'attributo `style` le
dodici proprietà del sottoinsieme con i valori finali, ricavati dal
`resolved tree` come dice il §0.5, senza cascate. La mappatura dai tipi agli
elementi HTML è del `renderer` di riferimento, non è normativa, e sta nel
README del `runtime`. Non normativo è anche quello che il `renderer` disegna
da sé, fuori dal sottoinsieme: i segni degli elenchi, i bordi delle tabelle,
la linea di `thematicBreak` e il margine della pagina sullo schermo (§7.4).

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
  non hanno coordinate [C: «Le celle non hanno coordinate»]. Nota: con la
  virgola decimale nell'`app`, in italiano la virgola non può separare gli
  argomenti di una funzione mentre si scrive; nel file vale il punto, quindi
  lì la virgola come separatore degli argomenti resta possibile.
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
