# Specifica: `core` e classe 1

Terza bozza, 2026-10-20. Non è normativa finché Alessio non la approva. I
nomi seguono il [glossario](glossario.md). I tipi di contenuto si fissano sulla
bozza dei nodi, come ammette il glossario (§1.3). *(proposta)* Anche i codici
dei `diagnostic`, le chiavi del `resolved tree` e i loro valori (`error`,
`warning`, `words`, `hash` e simili) sono identificatori provvisori, non ancora
nomi del prodotto: entrano nel glossario quando si fissa la sintassi. Alcuni
riusano parole del glossario con un altro senso (`attributes`, `code`).

## 0. Come leggere questa bozza

**Marcature.**
- Nessuna marcatura: deciso. Il rimando fra parentesi quadre cita le prime
  parole della voce di [contesto.md](contesto.md), per esempio [C: «Ogni
  oggetto è un file»].
- *(proposta)*: viene dalla [bozza dei nodi](bozza-nodi.md), dall'orchestratore
  o da chi ha scritto questa bozza; resta da confermare.
- **APERTO**: un punto che blocca la classe 1, con le opzioni e i loro costi,
  senza una scelta (§0.2, §0.5, §0.6, §0.7). I §0.1, §0.3 e §0.4 erano aperti
  e sono stati decisi.

**Sintassi provvisoria.** Gli esempi usano CommonMark con un'intestazione YAML
fra due righe `---`. Un capoverso fatto solo di `![[id]]` è un `embed` di
blocco, come in Obsidian. L'estensione `.md` è un segnaposto. Tutto questo
serve solo a scrivere gli esempi (§0.6).

**Gli esempi sono test** *(proposta)*. Come nella specifica di CommonMark, ogni
esempio è un blocco aperto e chiuso da 32 backtick, con l'etichetta
`example N conf=C status=S`: C è la `conformance class` (§1); S è la
marcatura più debole fra le regole che l'esempio usa, escluso il formato del
`resolved tree`, che è proposta per tutti: `decided`, `proposal`, oppure
`open-0.N-X` per l'opzione X di un punto APERTO, con più valori separati da
virgola. Dentro:
- una riga `=== file <percorso>` apre un file di testo, che contiene le righe
  fino al marcatore successivo, ciascuna chiusa da LF;
- una riga `=== asset <percorso>` crea un file di zero byte;
- l'ultima sezione, `=== resolved`, è il `resolved tree` atteso (§11.3).

Uno script estrae i blocchi, scrive i file in una cartella vuota, sostituisce
`.md` con l'estensione scelta, esegue il `runtime` e confronta gli alberi come
valori JSON. Ignora `message` e `fix` dei `diagnostic`, che non sono
normativi.

### 0.1 Deciso: dove un file dice il suo `kind`

Alessio ha deciso [C: «Sulla bozza di specifica»]:
- per i file di testo, il `kind` va nell'estensione e dentro il file
  (`calo-q3.concept.md`), e il `runtime` controlla che coincidano (esempio
  15);
- immagini e CSV hanno un file descrittore, un file di testo con gli
  attributi che nomina il file vero (esempio 7);
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
| `.<kind>.md` | `source`, testo con intestazione | il `kind` nell'estensione e nell'intestazione; l'`id` nell'intestazione, o il nome fino al primo punto (§0.3) |
| `.stylesheet.css` | `source`, `stylesheet` | nel commento d'intestazione, come fa WordPress con `style.css` ([WordPress](https://developer.wordpress.org/themes/basics/main-stylesheet-style-css/)) |
| `.canvas` | `source`, `canvas file` | da decidere: una chiave in più nel JSON o un descrittore (§2) |
| `retired-ids.yaml` | `source`, gli `id` ritirati | nome fisso (§0.3) |
| qualunque altra | `asset` | nessuno; diventa un nodo solo con un descrittore |

Un file con un'estensione fuori dall'elenco è sempre un `asset`, in ogni
classe: una classe successiva non aggiunge estensioni `source`, ma `kind`
nuovi in `.<kind>.md`. Un CSV, un `.schema.json` o un'immagine sono `asset`,
e il loro descrittore è un `.<kind>.md`. L'estensione `.md` resta un
segnaposto finché la sintassi non è scelta (§0.6). La bozza mette nel primo
livello `concept`, `text`, `image` e l'`article`; *(proposta)* il §1 sposta il
`concept` nel `core` e aggiunge `stylesheet` e `canvas file`.

### 0.2 APERTO: un `text` è un capoverso o più blocchi?

Ogni oggetto è un file, anche il capoverso [C: «Ogni oggetto è un file»]. Non
è deciso se un `text` possa contenerne più d'uno.
- **Un solo capoverso.** Scrittura: ogni capoverso nuovo è un file nuovo, cosa
  che l'`app` fa da sola ma che a mano, con un programma di testo, è pesante.
  Diff: piccoli e localizzati; spostare un capoverso cambia solo la
  `composition`. Composizioni: lunghe liste di `embed`, e anche un elenco o
  una citazione sono oggetti a sé. Riuso al grado più fine.
- **Più blocchi.** Scrittura: naturale, come un file Markdown. Diff: come un
  testo normale; spostare un capoverso fra due oggetti cambia due file.
  Composizioni: pochi `embed`. Il riuso è più grossolano, e serve una regola
  per un titolo dentro un `text`, perché i titoli stanno nella `composition`
  (§8).

Lo spazio libero per appunti e calcoli sta dentro il contenuto, con le righe
di calcolo come in Soulver [C: «Lo spazio libero per appunti»]. Con più
blocchi, lo `scratch` può essere un `text` come gli altri. Con un capoverso
per `text` non regge: servirebbe un `kind` a sé.

Gli esempi hanno sempre un capoverso, e valgono con tutte e due le opzioni.

### 0.3 Deciso: identità e collegamenti che si rompono

Alessio ha deciso [C: «Sulla bozza di specifica»]:
- l'`id` resta opzionale: se manca, l'`id` è il nome del file fino al primo
  punto (esempio 16), e il `runtime` lo scrive nel file quando un'operazione
  collega l'oggetto. Finché non è scritto, una rinomina fuori dall'`app`
  rompe i collegamenti;
- gli `id` ritirati, cancellati o fusi, stanno in un file del documento. Il
  «mai riusato» [C: «Attributi e id»] diventa un errore che il `runtime`
  controlla (esempio 19);
- la `target quote` arriva più avanti, con lo strato semantico (appendice A).

*(proposte)*
- **Il file.** Si chiama `retired-ids.yaml` e sta nella radice. È una mappa
  da ogni `id` ritirato al suo successore, o a `null` per un `id` cancellato,
  una riga per `id`, in ordine alfabetico:

  ```
  ritardi-agosto: ritardi-estate
  ritardi-luglio: ritardi-estate
  vecchia-intro: null
  ```

- **Chi lo scrive.** Il `runtime`, quando un'operazione cancella o fonde un
  oggetto. Una cancellazione fatta fuori dall'`app` entra quando il
  `runtime` riconcilia, se conosceva l'`id`. Una riga in più nel file si
  aggiunge a mano senza danni.
- **Niente catene.** Quando un successore viene a sua volta ritirato, il
  `runtime` riscrive le righe che puntavano a lui, come Zotero che, quando
  fonde, riscrive le relazioni verso l'elemento che resta
  ([mergeItems.mjs](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/mergeItems.mjs)).
- **Risoluzione.** Un riferimento a un `id` ritirato con successore si
  risolve sul successore, con un avviso e un `fix` che lo riscrive (esempio
  17). Senza successore, è un riferimento non risolto.
- **Riuso.** Un file vivo con un `id` ritirato è l'errore `id-reused`. Il
  `runtime` non propone mai un `id` ritirato quando lo ricava dalle prime
  parole: così l'`id` nuovo non resuscita i collegamenti di un oggetto
  cancellato.
- **Costi.** Il file cresce sempre, e due rami che ritirano `id` vicini
  nell'ordine possono andare in conflitto nel merge: con una riga per `id` il
  conflitto è banale da risolvere.

### 0.4 Deciso: il risultato delle righe di calcolo

Le righe di calcolo con il risultato in linea sono decise [C: «Lo spazio
libero per appunti»], e il risultato c'è già nella classe 1, con
un'aritmetica minima [C: «Sulla bozza di specifica»].

*(proposte)*
- **Come si scrive.** Nella sintassi provvisoria, una riga di calcolo è un
  codice in linea che comincia con `=`: `` `= 1200 + 1350 + 1280` ``. Su
  GitHub e negli altri programmi si legge come codice. Il risultato non si
  scrive nel sorgente: il `runtime` lo mette nel `resolved tree` (esempio
  20).
- **Grammatica.** Spazi ammessi fra i simboli; precedenza solita, da sinistra
  a destra a parità.

  ```
  expression = term { ("+" | "-") term }
  term       = factor { ("*" | "/") factor }
  factor     = [ "-" ] ( number | "(" expression ")" )
  number     = digit { digit } [ separator digit { digit } ]
  ```

- **Errori.** Una riga che non segue la grammatica, o che divide per zero,
  non ha risultato e dà l'avviso `math-line-invalid`.

Due punti restano aperti, senza bloccare la grammatica:
- **il separatore decimale.** In italiano si scrive «1,5». Le strade: sempre
  il punto; quello del `lang` del nodo; tutti e due, con la virgola solo se
  non è ambigua. Nel `resolved tree` il risultato è una stringa con il punto,
  e come si mostra lo decide il `renderer` con il `lang`;
- **l'arrotondamento,** che deve essere uguale nella `app`, nell'`export` e
  nella pagina HTML. Il determinismo non lo dà il linguaggio da solo, ma lo
  stesso binario o una libreria matematica fissata
  ([ricerca/linguaggio-formule.md](ricerca/linguaggio-formule.md)). Le
  strade: aritmetica decimale con una precisione e una regola di
  arrotondamento fissate, oppure numeri binari a doppia precisione con una
  regola fissata per stampare il risultato. Con la prima `0.1 + 0.2` dà
  `0.3`.

### 0.5 APERTO: il sottoinsieme di CSS e chi applica le regole

Il sottoinsieme è definito dalla specifica [C: «Il vocabolario
dell'impaginazione»], ma non è ancora scritto, e senza di lui metà della
classe 1 non ha requisiti verificabili. C'è anche una scelta di architettura:
- **il `runtime` calcola la cascata** e scrive nel `resolved tree` i valori
  per ogni nodo. È coerente con la proposta che i `renderer` non ricalcolino
  nulla [C: «Un solo punto di calcolo»], e gli esempi possono verificare
  l'impaginazione. Costo: il `runtime` implementa la cascata;
- **il `renderer` applica il CSS**. L'HTML lo fa da sé. Costi: l'aspetto non è
  nel `resolved tree`, e un futuro `renderer` Typst deve implementare la
  cascata a parte.

Finché i tipi di contenuto hanno nomi provvisori (§11.3), un selettore su un
tipo cambierebbe significato quando i nomi si fissano: fino ad allora,
*(proposta)* solo selettori di `class`. Ne segue che nessuna regola colpisce i
titoli di una `composition`, che non hanno `class` (§0.7).

### 0.6 APERTO: la sintassi dei file di testo

Alessio ha chiesto di valutare quattro strade [C: «Sintassi dei file di
testo»]: CommonMark con un'intestazione; Djot; Markdown con una sintassi
nostra, come fa Obsidian; un formato nostro. La nota
[ricerca/sintassi-testo.md](ricerca/sintassi-testo.md) scrive lo stesso
documento in tutte e quattro e le confronta con gli stessi criteri. La scelta
tocca gli
attributi del file e dei blocchi (§4), l'`embed` (§8), l'inventario del
contenuto (§7.1), il `formatter` e il `syntax tree` che conserva i
commenti.

L'esempio 1 in Djot, a titolo illustrativo (non si estrae):

```
{#calo-q3 kind=concept tags="vendite q3" lang=it}
Nel terzo trimestre le vendite calano.
```

Con djot.js 0.3.2 questo dà un altro albero, finché non si scrivono tre
regole: il blocco di attributi davanti al primo blocco vale per il file e
non per il capoverso; un valore con spazi si legge come lista; un file fatto
solo di attributi resta un nodo (djot.js scarta un blocco di attributi senza
blocco dopo). Le prove sono nella nota. La sintassi provvisoria degli
esempi, con `![[id]]` e `"[[id]]"`, è già vicina alla terza strada: non è una
scelta.

### 0.7 APERTO: capitoli e titoli nella `composition`

Capitoli e titoli stanno nella `composition` *(proposta della bozza, §1)*. È la
riformulazione, ancora da fare, delle regole sulle sezioni approvate nel
modello di prima: sezioni annidate e aperte dal titolo, sezioni senza titolo,
la sezione come unità che si sposta [C: «Attributi e id»]. Contesto.md lascia
da precisare fra capitoli impliciti dai titoli e annidamento esplicito [C: «Lo
spazio libero come punto d'ingresso»].
- **A. Capitoli impliciti dai titoli.** Un titolo apre un capitolo fino al
  titolo successivo dello stesso grado o più alto. Scrittura semplice, come
  in Markdown. Costi: una sezione senza titolo non si può scrivere; spostare
  un capitolo vuol dire spostare un intervallo di righe.
- **B. Annidamento esplicito.** Un capitolo è un blocco che contiene il suo
  titolo e i suoi `embed`. Si sposta come un'unità e può portare `id`,
  `class` e `lang`. Costi: più sintassi, e un rientro o dei
  marcatori in più nel diff.
- **C. Annidamento esplicito con il titolo facoltativo.** Come sopra, e conserva
  le sezioni senza titolo approvate. Costo: un blocco senza titolo si legge
  male nel sorgente.
- **D. Il capitolo come aggregatore di testi**, proposta di Alessio: «forse
  dovrebbe essere un aggregatore di testi, come un indice dettagliato?» [C:
  «Capitoli e titoli»]. Il capitolo è un oggetto, o una `composition` che si
  può annidare, che raccoglie i testi in ordine e ha titolo, `id`, `class` e
  `lang`; l'`article` è l'indice che elenca i capitoli; un `deck` usa gli
  stessi capitoli senza ripetere i titoli. Costi: più file; spostare un testo
  da un capitolo a un altro cambia due file. Un capitolo può non avere titolo,
  e così conserva le sezioni senza titolo. Due relazioni, da tenere distinte:
  l'aggregatore di dati della bozza (bozza-nodi.md §3) ripete lo stesso
  `template` su più dati, mentre questo ordina oggetti diversi; Alessio ha
  paragonato quell'aggregatore alla «section per le pagine» (bozza-nodi.md
  §7, idea 18). Il nome resta da
  scegliere. Se fosse section, sarebbe nel suo senso comune, un contenitore
  con titolo; oggi il glossario vieta section per il `concept` e per lo
  `shelf`.

Con l'opzione A i titoli non hanno `id` per un `cross-ref`, né `class` o
`lang`, e un `article` e un `deck` sugli stessi oggetti devono ripeterli
(appendice B); con D no. Gli esempi usano A.

### Nota: il `deck` per ultimo

Il principio dice che gli stessi mattoni *possono* dare documenti o
presentazioni completamente diversi [C: «Principio: l'aspetto incrementale»];
l'ordine dei livelli mette il `deck` per ultimo [C: «Ordine dei livelli»]. Le
due cose non si contraddicono: la classe 1 prepara mattoni che il `deck`
userà senza copiarli. L'appendice B lo mostra.

## 1. Classi di conformità

Si procede per livelli, uno alla volta: contenuto e impaginazione, dati,
grafici, formule, connettori, e infine le presentazioni come `deck` [C: «Si
procede in modo incrementale»; C: «Ordine dei livelli»]. L'aspetto
incrementale è lo spirito di ogni cosa [C: «Principio: l'aspetto
incrementale»].

*(proposte; le prime quattro dell'orchestratore)*
- **Classi.** La classe 0 è il `core`. Le classi da 1 a 6 sono i sei passi
  dell'ordine deciso: la 1 contenuto e impaginazione, la 6 il `deck`. Una
  classe non è un `part`: la 1 unisce più `part`, e la 6 aggiunge un `kind` di
  `composition`. Il `canvas file` è assegnato qui alla classe 1.
- **Aggiungere soltanto.** Una classe aggiunge `kind`, attributi, ruoli e
  `template`, e non cambia il significato di un file valido per una classe
  precedente. Può riempire ciò che una classe precedente lascia vuoto: un
  nodo `directive` diventa un nodo del suo `kind`, e una riga di calcolo
  riceve il risultato (§0.4).
- **Completa da sola.** Un'implementazione dichiara la sua classe, ed è
  conforme se passa gli esempi di quella classe e delle precedenti.
- **`static fallback`.** Ogni `kind` oltre il `core` ne ha una, testo
  o immagine (§10).
- **Una `composition` cambia, gli oggetti no.** Fra un documento e una
  presentazione cambia la `composition`: la `composition` punta l'`object` [C:
  «La composition punta l'object»], e lo stesso oggetto sta in più `composition` [C:
  «L'oggetto richiamato sul foglio»].
- **Classe di un documento.** È la più alta fra le classi dei `kind` che usa.
  Il documento dichiara anche la `spec version` (§2).
- **Compatibilità in avanti.** Un attributo sconosciuto si ignora con un
  avviso, come le proprietà sconosciute in CSS 2.1
  ([§4.2](https://www.w3.org/TR/CSS21/syndata.html#parsing-errors)). La bozza
  proponeva un errore per i `kind` del `core`: così però un documento scritto
  per una versione successiva non si aprirebbe. Il precedente copre
  l'ignorare; l'avviso è una proposta nostra, perché CSS 2.1 non ne parla.
- **Contenuto delle classi.** Il `core` comprende il documento (§2),
  l'identità (§3), gli attributi comuni (§4), il `concept` (§5),
  l'`association` (§6), la `directive` e gli `id reference` (§10) e il
  `runtime` (§11). La classe 1 aggiunge `text`, `image`, `article`,
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
  (§0.1): tutto ciò che non vi compare è `asset`, anche dentro le
  sottocartelle. Un `asset` si nomina con un percorso relativo
  al file che lo usa, senza uscire dal documento.
- **Codifica.** UTF-8. Il `formatter` scrive senza BOM, con LF e un a capo
  finale; il `runtime` legge anche CRLF e BOM.
- **Nomi.** Il nome è l'`id` più l'estensione. Il nome non conta per
  l'identità quando l'`id` è scritto nel file (§0.3). I nomi `retired-ids.yaml`
  e quello del file di configurazione sono riservati.
- **Configurazione del documento.** Il file di configurazione della cartella
  dichiara la `spec version` e il `lang` del documento. Il suo nome e se
  coincida con il `manifest`, che è aperto, restano da decidere. Il `runtime`
  risolve tutte le `composition`, quindi non serve un punto di partenza.
- **`canvas file`.** Il `canvas` salva solo posizioni e riferimenti, partendo
  da JSON Canvas [C: «Il foglio di bozze è un canvas»]. Il `runtime` controlla
  i suoi riferimenti come gli `embed` e li riscrive alle rinomine; il `canvas
  file` non entra nel `resolved tree`. JSON Canvas collega i file per
  percorso («the path to the file within the system»,
  [spec 1.0](https://jsoncanvas.org/spec/1.0/)): riferirsi per `id`
  cambierebbe il formato o aggiungerebbe una chiave, da decidere.
- Gli URL esterni come `asset` sono una domanda aperta (handoff.md, domanda
  6).

## 3. Identità

L'`id` non è per forza numerico o incrementale, e può essere mnemonico; è
unico nel documento, fatto di minuscole, cifre e trattino, e non si riusa mai
[C: «Attributi e id»].

*(proposte)*
- La forma è `[a-z0-9]+(-[a-z0-9]+)*`.
- Un `id` vale per tutto il documento, qualunque sia il `kind`.
- `duplicate` crea una copia con un `id` nuovo. Una copia fatta fuori
  dall'`app` con lo stesso `id` è un `id` doppio (esempio 13). Quando un
  oggetto si divide, l'`id` resta a una delle parti, e i collegamenti si
  segnalano da rivedere.
- L'`id` è opzionale, e gli `id` ritirati stanno in `retired-ids.yaml`
  (§0.3, deciso).
- Se chi scrive non dà un `id`, il `runtime` ne propone uno dalle prime
  parole, mai un `id` ritirato.

## 4. Attributi comuni

I metadati comuni sono opzionali e gli altri attributi dipendono dal tipo;
ogni nodo ha un `kind`; `id` e `tags` valgono per ogni `kind`, `class` e
`lang` per i nodi che si vedono; `lang` si eredita, da cosa è da precisare;
`tags` e `class` sono separati [C: «Attributi e id»]. Il `kind` è sempre
determinato, scritto nel file e nell'estensione (§0.1): non è fra i
metadati opzionali.

| Attributo | Valore *(proposta)* | Note |
|---|---|---|
| `id` | §3 | deciso, opzionale (§0.3) |
| `kind` | un `kind` della specifica o di un'`extension` | deciso, anche dove si scrive (§0.1) |
| `tags` | lista di parole | deciso |
| `class` | lista di nomi in `kebab-case` | deciso per i nodi che si vedono |
| `lang` | tag di lingua BCP 47 | deciso per i nodi che si vedono |
| `origin` | da definire | *(proposta della bozza)*: scritto da una persona o generato e confermato |
| `associations` | lista di `id` | *(proposta)*, §6 |

*(proposte)*
- **Nodi che si vedono**: `concept`, `text`, `image`, `article`. Non lo sono lo
  `stylesheet` e il `canvas file`.
- **`lang` si eredita** dalla configurazione del documento (§2); un oggetto
  può dichiarare il suo. L'alternativa, il `lang` della `composition` che lo
  usa, renderebbe italiano un testo inglese inserito in un articolo italiano.
- **Niente date né autore**, proposta della bozza: li ha Git. È
  un'inferenza, e non vale per un `bundle`, che non porta storia.
- **Niente attributo "nascosto"**: ciò che non deve uscire non sta in una
  `composition`.

## 5. Il `concept`

Il `concept` è l'unità di significato: un'idea con i suoi metadati e i
collegamenti agli `object` che la sviluppano, anche di `kind` diversi [C:
«L'unità di significato ha i metadati»]. È un file, con gli attributi comuni e
un corpo: il testo dell'idea, in una o due frasi (definizione del glossario).
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

*(proposte, dalla bozza §3; la `target quote` arriva dopo, §0.3)*
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
    {"severity": "error", "code": "association-unresolved", "file": "calo-q3.concept.md", "target": "calo-q3-sintesy"}
  ]
}
````````````````````````````````

## 7. Gli `object` della classe 1

Ogni `object` è un file con il suo `kind`, e può avere o no un collegamento a
un `concept` [C: «Ogni oggetto è un file»; C: «La composition punta
l'object»].

### 7.1 `text`

Un `text` è un oggetto di prosa, con gli attributi comuni e un corpo
(esempio 2). Se il corpo è un capoverso o più blocchi, e quindi dove sta lo
`scratch`, è APERTO (§0.2).

Il contenuto interno è un inventario *(proposto)*; i tipi non hanno ancora un
nome (§11.3).

| Contenuto | Note |
|---|---|
| capoverso, elenco puntato e numerato, citazione | |
| `code block` | i marker per eseguire e per mostrare sono decisi [C: «Il codice nel documento porta un marker»], i nomi `eval` ed `echo` proposti; nella classe 1 un blocco da eseguire non si esegue (`eval-unsupported`) |
| `text table` | tabellina non ancora `collection` |
| `math line` | decisa, con il risultato già nella classe 1 (§0.4) |
| enfasi, forte, codice in linea, collegamento a un URL | in linea |
| riferimento in linea | a un altro nodo, con un `id reference` in linea (§10); se il nodo è numerato è un `cross-ref`, e la `numbering` è da precisare |
| `footnote` | |

Da decidere: l'`embed` dentro un `text`, che il glossario ammette, e gli
attributi sui singoli blocchi, che dipendono dalla sintassi.

### 7.2 `image`

Un `image` è un'immagine fatta fuori dal `runtime`, come una foto. Secondo la
bozza, un'immagine disegnata dal `runtime` è una vista generata e non si salva
come file (bozza-nodi.md §4).

Un'immagine ha un file descrittore (§0.1, deciso). *(proposta)* L'`image` è
quindi un file di testo con gli attributi
comuni, l'attributo `asset` e un corpo con la descrizione, che serve agli
screen reader ed è la sua `static fallback`.

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
    {"severity": "error", "code": "asset-missing", "file": "lavagna.image.md", "target": "lavagna.jpg"}
  ]
}
````````````````````````````````

## 8. La `composition` `article`

La `composition` punta l'`object` [C: «La composition punta l'object»]. Lo
stesso oggetto può stare in più `composition`, ed è lo stesso oggetto, non
una copia [C: «L'oggetto richiamato sul foglio»]. Le `composition` danno
il `reading order` [C: «La lista a fianco ha sezioni per tipo»].

*(proposte)*
- La `composition` usa gli oggetti con l'`embed` per `id`. Quale `concept`
  presenta un oggetto lo si ricava dalle sue `association`.
- Capitoli e titoli stanno nella `composition`, e come si scrivono è APERTO
  (§0.7). Il corpo di un `article` contiene solo titoli ed `embed`; un
  capoverso scritto lì è un errore (esempio 10).
- Un `embed` di un `id` inesistente è un errore, e il `resolved tree` lo mostra
  al suo posto (esempio 9). Un `embed` di un `concept` o di una `composition`
  è un errore (esempio 11).
- L'`article` nomina il suo `stylesheet` con l'attributo `stylesheet`, scritto
  come `id reference` (§10).

```````````````````````````````` example 8 conf=1 status=open-0.7-A
=== file report-q3.article.md
---
id: report-q3
kind: article
stylesheet: "[[report]]"
---
# Il terzo trimestre

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
=== resolved
{
  "nodes": [
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "attributes": {"class": ["evidenza"]}, "content": [["paragraph", "Le vendite sono calate del 12%."]]},
    {"id": "lavagna", "kind": "image", "file": "lavagna.image.md", "attributes": {"asset": "lavagna.jpg"}, "content": [["paragraph", "Foto della lavagna con le vendite mensili."]]},
    {"id": "report", "kind": "stylesheet", "file": "report.stylesheet.css"},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "attributes": {"stylesheet": "report"}, "content": [["heading", {"depth": 1}, "Il terzo trimestre"], ["embed", {"id": "calo-q3-sintesi", "kind": "text", "class": ["evidenza"]}, ["paragraph", "Le vendite sono calate del 12%."]], ["embed", {"id": "lavagna", "kind": "image", "asset": "lavagna.jpg"}, ["paragraph", "Foto della lavagna con le vendite mensili."]]]}
  ]
}
````````````````````````````````

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
    {"severity": "error", "code": "embed-unresolved", "file": "report-q3.article.md", "target": "calo-q3-sintesy"}
  ]
}
````````````````````````````````

```````````````````````````````` example 10 conf=1 status=open-0.7-A
=== file report-q3.article.md
---
id: report-q3
kind: article
---
# Il terzo trimestre

Qui scrivo due righe di introduzione.
=== resolved
{
  "nodes": [
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["heading", {"depth": 1}, "Il terzo trimestre"], ["paragraph", "Qui scrivo due righe di introduzione."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "composition-content", "file": "report-q3.article.md", "fix": "sposta il capoverso in un text e mettine l'embed"}
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
    {"severity": "error", "code": "embed-kind", "file": "report-q3.article.md", "target": "calo-q3"}
  ]
}
````````````````````````````````

## 9. Lo `stylesheet`

Il vocabolario dell'impaginazione è un sottoinsieme di CSS definito dalla
specifica, con proprietà traducibili anche per Typst [C: «Il vocabolario
dell'impaginazione»]; modello e impaginazione sono neutri rispetto al motore
[C: «Motori per fasi»]. Il sottoinsieme e chi applica le regole sono APERTI
(§0.5).

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
  `directive`: attributi comuni e `association` valgono, il resto si conserva,
  e nel `resolved tree` il nodo ha `"directive": true` (esempio 12). Vale fra
  classi: un'implementazione di classe 1 legge così un `chart` della classe 3.
- La `static fallback` di una `directive` è il suo corpo di testo, e un
  `embed` di una `directive` la mostra. Una `static fallback` in immagine, per
  esempio un grafico con i `frozen values`, tocca la domanda aperta sui
  risultati nel pacchetto (handoff.md, domanda 6).
- **`id reference`.** Il `core` fissa come si scrive un riferimento per `id`.
  Nella sintassi provvisoria: `![[id]]` per un blocco, `[[id]]` in linea;
  negli attributi, la lista `associations` e un valore che è esattamente
  `"[[id]]"`, fra
  virgolette come nelle proprietà di Obsidian
  ([Properties](https://github.com/obsidianmd/obsidian-help/blob/master/en/Editing%20and%20formatting/Properties.md)).
  Così il `runtime` controlla e riscrive i riferimenti anche dentro una
  `directive`: un `deck` letto da un'implementazione di classe 1 ha comunque
  i suoi `embed` controllati (esempio 12). Nel `resolved tree` un valore
  riferimento appare come l'`id` risolto.
- La forma `@id` della prima stesura non va: in YAML un valore non può
  cominciare con `@` senza virgolette (prova con PyYAML 6.0.3). Anche con
  `"[[id]]"` resta un costo: ogni stringa scritta così diventa un
  riferimento, e per scriverla come testo serve una regola. Il riferimento in
  linea `[[id]]` non ha ancora un esempio.

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
6. risolve gli `embed`, gli `asset` e gli `stylesheet` nominati, e calcola
   le righe di calcolo.

La risoluzione non si ferma a un errore: l'albero esce sempre, con il
`diagnostic` accanto. Con un errore la `cli` esce con un codice diverso da
zero e l'`export` si rifiuta. Lo stesso controllo gira dopo ogni merge e ogni
modifica esterna: Git non vede che un ramo ha cancellato un oggetto che un
altro collega (bozza-nodi.md §3). Un riferimento a un `id` doppio non si
risolve e non dà un secondo errore.

### 11.2 I `diagnostic` *(proposta)*

Ogni `diagnostic` ha `severity` (`error` o `warning`), `code`, `file`, e
secondo il codice `target`, `message` e `fix`.

| Codice | Gravità | Quando | `target` | Esempio |
|---|---|---|---|---|
| `syntax` | error | il file non si legge | — | non coperto |
| `id-invalid` | error | `id` fuori forma | l'`id` | 14 |
| `id-duplicate` | error | due file, stesso `id`; uno per file | l'`id` | 13 |
| `kind-missing` | error | `kind` non determinato | — | non coperto |
| `kind-file-extension-mismatch` | error | `kind` diverso dalla `file extension` | il `kind` scritto | 15 |
| `kind-unknown` | warning | `kind` non noto: `directive` | il `kind` | 12 |
| `attribute-unknown` | warning | attributo sconosciuto, ignorato | il nome | 12 |
| `attribute-invalid` | error | valore di forma sbagliata | il nome | non coperto |
| `association-unresolved` | error | bersaglio inesistente | l'`id` | 6 |
| `association-kind` | error | con una `composition` o uno `stylesheet` | l'`id` | 18 |
| `association-retired` | warning | bersaglio ritirato, risolto sul successore | l'`id` ritirato | 17 |
| `embed-unresolved` | error | `id` inesistente | l'`id` | 9 |
| `embed-kind` | error | `embed` di un `concept` o di una `composition` | l'`id` | 11 |
| `embed-retired` | warning | `embed` di un `id` ritirato, risolto sul successore | l'`id` ritirato | non coperto |
| `id-reused` | error | un file vivo con un `id` ritirato | l'`id` | 19 |
| `composition-content` | error | nella `composition` un blocco che non è titolo né `embed` | — | 10 |
| `math-line-invalid` | warning | riga di calcolo fuori grammatica, o divisione per zero | — | non coperto |
| `eval-unsupported` | warning | blocco da eseguire nella classe 1 | — | non coperto |
| `asset-missing` | error | `asset` assente | il percorso | 7 |
| `stylesheet-unresolved` | error | `stylesheet` nominato assente | l'`id` | non coperto |
| `stylesheet-unsupported` | warning | proprietà o selettore fuori dal sottoinsieme, ignorato (§0.5) | la proprietà o il selettore | non coperto |
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
    {"severity": "error", "code": "id-duplicate", "file": "calo-q3.concept.md", "target": "calo-q3"},
    {"severity": "error", "code": "id-duplicate", "file": "copia/calo-q3.concept.md", "target": "calo-q3"}
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

```````````````````````````````` example 16 conf=1 status=decided
=== file ritardi-agosto.text.md
---
kind: text
---
Ad agosto due fornitori hanno consegnato con tre settimane di ritardo.
=== resolved
{
  "nodes": [
    {"id": "ritardi-agosto", "kind": "text", "file": "ritardi-agosto.text.md", "content": [["paragraph", "Ad agosto due fornitori hanno consegnato con tre settimane di ritardo."]]}
  ]
}
````````````````````````````````

Un collegamento a un oggetto fuso in un altro si risolve sul successore:

```````````````````````````````` example 17 conf=0 status=proposal
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
associations: [ritardi-luglio]
---
Nel terzo trimestre le vendite calano.
=== file ritardi-estate.concept.md
---
id: ritardi-estate
kind: concept
---
A luglio e ad agosto i fornitori hanno consegnato in ritardo.
=== file retired-ids.yaml
ritardi-agosto: ritardi-estate
ritardi-luglio: ritardi-estate
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "ritardi-estate", "kind": "concept", "file": "ritardi-estate.concept.md", "content": [["paragraph", "A luglio e ad agosto i fornitori hanno consegnato in ritardo."]]}
  ],
  "associations": [
    {"ids": ["calo-q3", "ritardi-estate"], "declaredIn": ["calo-q3.concept.md"]}
  ],
  "diagnostics": [
    {"severity": "warning", "code": "association-retired", "file": "calo-q3.concept.md", "target": "ritardi-luglio", "fix": "ritardi-estate"}
  ]
}
````````````````````````````````

```````````````````````````````` example 18 conf=1 status=open-0.7-A
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
---
# Il terzo trimestre
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["heading", {"depth": 1}, "Il terzo trimestre"]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "association-kind", "file": "calo-q3.concept.md", "target": "report-q3"}
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
    {"severity": "error", "code": "id-reused", "file": "vecchia-intro.concept.md", "target": "vecchia-intro"}
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
    {"id": "totale-q3", "kind": "text", "file": "totale-q3.text.md", "content": [["paragraph", "Pezzi prodotti nel trimestre: ", ["mathLine", {"result": "3830"}, "1200 + 1350 + 1280"], "."]]}
  ]
}
````````````````````````````````

### 11.3 Il `resolved tree` *(proposta)*

È un valore JSON con tre liste; una lista vuota si omette.

- **`nodes`**: un elemento per `source`, tranne il `canvas file` e
  `retired-ids.yaml`, ordinati per `id` e poi per `file`.
  Ogni nodo ha `id`, `kind`, `file` (percorso con `/`), `attributes` (quelli
  dichiarati, con le chiavi come nel file, tranne `id`, `kind` e
  `associations`; si omette se vuoto), `content` (il corpo; si omette se il
  `kind` non ne ha) e `"directive": true` per i `kind` non noti.
- **`associations`**: una per coppia risolta, con `ids` (i due `id` in ordine)
  e `declaredIn` (i file che la dichiarano, in ordine); ordinate per `ids`.
- **`diagnostics`**: ordinati per `file`, `code` e `target`.

Gli ordini sono per punti di codice Unicode. Due alberi si confrontano come
valori JSON: l'ordine delle chiavi di un oggetto non conta, quello degli array
sì.

Il contenuto segue la forma di JsonML: un blocco o un pezzo in linea è un
array con il tipo, un oggetto di attributi facoltativo e i figli; il testo è
una stringa. Un a capo morbido diventa uno spazio, e stringhe vicine si
uniscono. I nomi dei tipi sono presi da mdast (`paragraph`, `heading`,
`emphasis`, `strong`, `list`, `listItem`, `blockquote`, `code`,
`inlineCode`, `link`, `break`), più `mathLine` per una riga di calcolo, con
il `result`; non sono normativi finché la sintassi e la
bozza non fissano i nomi (glossario §1.3): alcuni collidono con il glossario,
per esempio paragraph è fra i *Da non usare* di `text`. Mancano ancora i tipi
per `text table`, `cross-ref` e la definizione di una
`footnote`.

Nel contenuto di una `composition` un `embed` porta negli attributi `id`,
`kind`, il `lang` effettivo (quello dell'oggetto o, se manca, quello del
documento), e se ci sono `class` e `asset` dell'oggetto, e come figli il
suo contenuto risolto. Un `embed` che non si risolve ha `"unresolved": true`
e nessun figlio. Così un `renderer` legge la `composition` senza cercare altri
nodi.

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
  connettori in file separati»]. Estendono l'aritmetica delle `math line`
  (§0.4). Requisito di Alessio [C: «Sulla bozza di specifica»]: deve essere
  possibile usare una funzione dichiarata in un altro file, con argomenti
  numerici, elementi della stessa lista o anche range. Cosa sia un range è da
  precisare, perché le celle non hanno coordinate [C: «Le celle non hanno
  coordinate»]: può essere un intervallo di valori, oppure righe scelte per
  contenuto.
- **Connettori** (classe 5). Un file proprio, e un file per le posizioni
  sistemate a mano [C: «I connettori grafici sono un file a parte»].
  *(proposta)* Puntano gli `object` per `id`, nella forma generica del §10.
- **`deck`** (classe 6). Una `composition` fatta di `slide`, con gli stessi
  `embed` [C: «Si procede in modo incrementale»]. Appendice B.
- **Collegamenti semantici.** *(proposta della bozza)* Un indice locale, mai
  nel sorgente, che propone `hint`; un `hint` confermato diventa
  un'`association`, quindi il `core` non cambia.

## Appendice B. Gli stessi oggetti in un `deck` (non normativa)

Gli oggetti dell'esempio 8 in una presentazione. Nessun oggetto cambia né si
copia: cambia la `composition`. La sintassi delle `slide` è inventata per
l'esempio.

```
---
id: riunione-q3
kind: deck
stylesheet: "[[riunione]]"
---
# Il terzo trimestre

![[calo-q3-sintesi]]

# La lavagna

![[lavagna]]
```

Qui ogni titolo di primo grado aprirebbe una `slide`. L'`article`
`report-q3` e questo `deck` puntano lo stesso `calo-q3-sintesi`: una
correzione del capoverso arriva a tutti e due, e il `concept` `calo-q3` non sa
né dell'uno né dell'altro. Lo `stylesheet` `riunione` può dare alla `class`
`evidenza` un aspetto diverso da `report`. Il titolo «Il terzo trimestre» è
invece scritto due volte (§8).
