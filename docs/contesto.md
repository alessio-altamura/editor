# Contesto

Questo repository nasce per progettare un nuovo standard per scrivere documenti,
fogli di calcolo e presentazioni con un unico strumento. Non è un clone: la
discussione di partenza confrontava WordCraft (clone di Word in Rust, pre-alpha)
ed Euro-Office (fork di ONLYOFFICE), che inseguono entrambi la compatibilità con
OOXML. Qui quella compatibilità non è un requisito.

Il file distingue ciò che Alessio ha deciso da ciò che è stato solo proposto.
Le proposte restano tali finché Alessio non le accetta o le scarta.

## Decisioni di Alessio

- Standard nuovo; la compatibilità con DOCX, XLSX e PPTX non è un requisito.
- Un solo strumento per testo, calcolo e slide.
- Si parte dal motore, non dall'interfaccia.
- Deve essere AI-friendly.
- Doppia scrittura: sorgente come codice ed editor grafico; ognuno genera l'altro.
- Deve essere diffabile con Git. Riferimenti: Notion per il modello a blocchi,
  Obsidian per i file di testo locali; in contrapposizione a Word, LaTeX e Markdown.
- Un documento è un insieme di file sorgente più i suoi asset (all'inizio era
  "un file sorgente"; poi un file per livello; dal 2026-10-20 un file per
  oggetto, vedi sotto). Può stare in una cartella in chiaro oppure in uno zip con
  un'estensione propria; per Alessio le due forme sono equivalenti.
- Il codice nel documento porta un marker se va eseguito e un marker se va
  mostrato.
- Motori per fasi, al posto dei due motori decisi in un primo momento. Si parte
  con un solo motore: l'HTML come nucleo e il PDF come sua esportazione, stampata
  da un motore browser di versione fissata. Più avanti potrà arrivare un secondo
  motore (Typst) per una modalità di scrittura orientata alla stampa. Obiettivo
  finale: vista interattiva HTML con esportazione in PDF; vista di scrittura PDF
  con esportazione in HTML statico. Condizione: modello e impaginazione neutri
  rispetto al motore.
- Il vocabolario dell'impaginazione è un sottoinsieme di CSS definito dalla
  specifica: solo proprietà con un significato fissato e traducibili anche per
  un futuro motore Typst.
- Lo strumento nasce con una riga di comando, in modo che un'AI possa
  configurarlo e usarlo con semplicità. Proprietà confermate: ogni
  operazione dell'editor esiste anche da riga di comando (la CLI è un client
  del runtime come l'app); output leggibile da macchina (JSON) con schema
  stabile, codici di uscita ed errori con codice e suggerimento di
  correzione; comandi non interattivi, con un'opzione per vedere il diff prima
  di applicare; configurazione in file di testo nella cartella, senza stato
  nascosto; la CLI descrive sé stessa e gli schemi dei file; un server MCP che
  espone le stesse operazioni agli agenti AI.
- I nomi del prodotto (oggetti, tipi, file, comandi, variabili, codice) sono in
  inglese. Fin da subito c'è un glossario, [glossario.md](glossario.md), che
  fissa ogni nome per evitare usi incoerenti. I documenti di lavoro restano in
  italiano finché il repository è privato; se diventa pubblico si traduce
  tutto in inglese.
- Le regole dei nomi del §1 di [glossario.md](glossario.md) sono decise, e così
  i nomi `collection` (le liste moderne), `part` (i livelli; in origine i file
  del documento, prima della decisione di un file per oggetto) e
  `composition` (documento, presentazione e altre viste composte).
- Linguaggio di implementazione: TypeScript per la prima versione (runtime,
  LSP, riga di comando ed editor). Rust compilato in WASM solo dove le misure lo
  chiederanno, per esempio per il motore di calcolo o il parser.
- L'HTML esportato è vivo in due sensi: il lettore cambia input e vede
  ricalcolare, e i dati possono aggiornarsi da fonti esterne.
- Chi apre un HTML esportato vede sempre i valori fotografati all'export. Se il
  motore è incluso o raggiungibile, la pagina ricalcola. Il resto (file locali,
  codice pesante, fonti esterne, salvataggio) passa da un servizio, locale o nel
  cloud. La versione cloud è installabile da chiunque sul proprio server.
- Il motore è un runtime separato dall'app e parte quando si apre il file.
  L'app mostra il sorgente, la vista di editing grafico e l'anteprima HTML o
  PDF secondo la modalità.
- Il runtime possiede il file: applica le modifiche dell'app passando dal
  formatter canonico e riconcilia quelle fatte da altri editor o da Git.
- Il runtime parla LSP per il testo. Le operazioni sul modello e le anteprime
  useranno un protocollo proprio.
- L'editing grafico avviene sopra l'anteprima HTML, a condizione che esista
  anche una vista per pagina.
- Il testo in chiaro è sempre la base di tutto. Ogni rappresentazione grafica
  (connettori, griglia, pagine, slide) è una vista generata dal sorgente
  testuale, e ogni modifica fatta nell'editor grafico diventa una modifica del
  testo.
- Principio: l'aspetto incrementale è lo spirito di ogni cosa. Gli stessi
  mattoni possono dare documenti o presentazioni completamente diversi
  (2026-10-20).
- Si procede in modo incrementale, per livelli (contenuto, impaginazione,
  dati, formule, connettori, grafici, e le composizioni), aggiungendone uno
  alla volta. In origine ogni livello era un file; dal 2026-10-20 ogni oggetto
  è un file (vedi sotto). Le slide non sono un livello a
  sé: una presentazione è una `composition` di tipo `deck`. La divisione in file riguarda solo come
  si salva: l'editor mostra ogni livello dove serve, per esempio le formule
  accanto alla tabella.
- L'unità di significato ha i metadati, il concetto e i suoi sviluppi, anche
  di `kind` diversi. Il contesto non è collegato nell'unità: è il contesto,
  cioè la `composition`, che punta lo sviluppo che gli serve (2026-10-20). I
  nomi sono `concept` per l'unità e `object` per gli sviluppi (2026-10-20); la
  sintesi del modello è in [bozza-nodi.md](bozza-nodi.md).
- I collegamenti fra `concept` e `object` sono bilaterali: si scrivono da una
  parte, dall'altra o da entrambe, indifferentemente (2026-10-20).
- La `composition` punta l'`object`, che può avere o no un collegamento a un
  `concept` (2026-10-20).
- Ogni oggetto è un file, anche il capoverso (2026-10-20). Orientamento: tutti
  gli oggetti stanno insieme, mescolati, e l'app li filtra per livello; i
  livelli non sono cartelle. Precisa la
  decisione precedente di un file per livello: come si organizzano i livelli
  con un file per oggetto è nella bozza, [bozza-nodi.md](bozza-nodi.md).
- Attributi e id (2026-10-20, approvati da Alessio sulle proposte di Claude;
  bozza-nodi.md §7, idee 1-4):
  - i metadati sono di due gruppi: quelli comuni, che valgono per ogni nodo, e
    quelli opzionali, che dipendono dal tipo. Correzione del 2026-10-21: Claude
    aveva letto «metadati comuni e opzionali» come «comuni, quindi
    opzionali», e così è finito nella bozza, in questa voce e nella bozza di
    specifica. Alessio intendeva due gruppi distinti. La scelta 1ii sull'`id`
    (voce «Sulla bozza di specifica») è stata presa con le opzioni scritte
    sulla lettura sbagliata: 1i era descritta in conflitto con questa voce;
  - ogni nodo ha un `kind`;
  - `id` e `tags` valgono per ogni `kind`, `class` e `lang` per i nodi che si
    vedono; `lang` si eredita (dal contenitore, nel modello di allora: da
    cosa, con un file per oggetto, è da precisare);
  - `tags` e `class` sono attributi separati;
  - l'`id` non è per forza numerico o incrementale, anche mnemonico; è unico
    nel documento, fatto di minuscole, cifre e trattino, e non si riusa mai.

  Nello stesso modello di allora Alessio aveva approvato anche le sezioni
  annidate, aperte dal titolo, le sezioni senza titolo e la sezione come unità
  che si sposta. Con un file per oggetto queste regole vanno riformulate: la
  proposta è che capitoli e titoli stiano nelle composizioni
  ([bozza-nodi.md](bozza-nodi.md) §1).
- I connettori grafici sono un file a parte. La loro disposizione è calcolata
  in automatico; le posizioni sistemate a mano si salvano in un altro file di
  layout, solo per i nodi spostati.
- Ogni tabella ha un nome, obbligatorio: senza nome non si può usare. La
  griglia resta come interfaccia per inserire e guardare i dati.
- Le celle non hanno coordinate: nessun indirizzo per posizione, né globale né
  dentro la tabella. Si ragiona per tabella, colonna e righe scelte per
  contenuto.
- Le intestazioni delle colonne portano anche il tipo. Le tabelle possono essere
  multidimensionali, non solo a due dimensioni.
- Tipi, chiavi e dimensioni si dichiarano in uno schema a parte, non nella riga
  di intestazione del CSV.
- Le tabelle sono liste moderne, non array: elementi con identità e proprietà
  tipizzate, relazioni fra liste, più viste dello stesso elenco (tabella,
  board, calendario, grafico).
- Ordine dei livelli: contenuto e impaginazione, poi dati, grafici, formule,
  connettori, e infine le presentazioni come `deck`.
- All'apertura c'è il foglio bianco. I layout (documento, presentazione e
  altri) sono viste create a parte, che usano gli oggetti del foglio.
- Il foglio bianco è un foglio di bozze. Quando un oggetto viene archiviato
  esce dal foglio e va nella lista a fianco. Lo si richiama trascinandolo sul
  foglio, oppure cliccandolo per vederlo da solo.
- L'oggetto richiamato sul foglio è lo stesso oggetto, non una copia;
  duplicare è un'azione esplicita. I layout usano gli oggetti archiviati per
  riferimento, e lo stesso oggetto può stare in più layout. Anche le bozze sono
  salvate nei file: nulla esiste solo nell'interfaccia.
- Il foglio di bozze è un canvas: gli oggetti si mettono dove capita, anche in
  disordine. Gli oggetti stanno nei loro file (in origine: nei file dei loro
  livelli); il file del foglio
  salva solo posizioni e riferimenti, partendo dal formato aperto JSON Canvas
  (MIT, Obsidian).
- La lista a fianco ha sezioni per tipo (testi, liste, grafici, immagini), una
  sezione "da sistemare" per gli oggetti non ancora classificati, e i layout,
  ordinati da chi scrive, che danno l'ordine di lettura. Ogni sezione
  corrispondeva a un livello, cioè a un file; con un file per oggetto le
  sezioni sono filtri per `kind`.
- Classificazione, collegamenti e promozioni automatiche, anche proposte
  dall'AI, sono solo suggerimenti che chi scrive conferma. Nessuna dipendenza
  nasce in silenzio.
- Lo spazio libero per appunti e calcoli al volo sta dentro il contenuto: righe
  di calcolo nel testo con il risultato in linea (come Soulver o le Math Notes
  di Apple). Da ciò che si è scritto nello spazio libero si può poi creare una
  lista vera.
- Sulla bozza di specifica, [specifica.md](specifica.md) (2026-10-20):
  - dove si scrive il `kind` (§0.1): nell'estensione e dentro il file per i
    file di testo; un file descrittore per immagini e CSV; un elenco fisso di
    estensioni nel `core`, così un file non cambia natura secondo la classe di
    chi lo legge;
  - identità (§0.3): l'`id` è sempre scritto nel file (1i, 2026-10-21; prima
    era stata scelta la 1ii, sulle opzioni scritte con la lettura sbagliata
    dei metadati): lo scrive il `runtime` quando crea l'oggetto, e lo
    aggiunge ai file creati a mano. Gli `id` ritirati stanno in un file del
    documento (1d); un `id` si ritira solo con un'operazione dell'`app` o
    della `cli`, non quando un file sparisce per un cambio di ramo
    (2026-10-21). La `target quote` arriva più avanti (2b);
  - righe di calcolo (§0.4): il risultato c'è già nella classe 1, con
    un'aritmetica minima. Requisito di Alessio per dopo: deve essere possibile
    usare una funzione dichiarata in un altro file, con argomenti numerici,
    elementi della stessa lista o anche range. Il range è un intervallo di
    valori di un campo, per esempio da marzo a giugno, oppure tutta la colonna
    (2026-10-20);
  - un `text` è un blocco solo: un capoverso, un elenco, una citazione (§0.2,
    2026-10-20). Proposta che ne segue: lo spazio libero è un `kind` a sé,
    perché è un posto di lavoro e non un'unità di significato;
  - il CSS lo applica il `runtime` (§0.5, 2026-10-20): calcola la cascata e
    scrive i valori finali nel `resolved tree`; chi disegna li applica soltanto.
    Per partire un sottoinsieme minimo di solo testo (carattere, colore,
    allineamento, margini, interlinea); la pagina si aggiunge dopo. Nella
    specifica c'è un foglio di partenza, così titoli ed enfasi si vedono anche
    senza uno `stylesheet` (2026-10-21);
  - numeri delle righe di calcolo (§0.4, 2026-10-21): nel sorgente il punto
    come separatore decimale e nessun separatore delle migliaia; «1.200» dà un
    avviso perché è ambiguo; il risultato si mostra secondo la lingua;
    aritmetica decimale;
  - `kind` e `id` del `canvas file` (§0.1, 2026-10-21): in un descrittore, come
    per le immagini;
  - sintassi dei file di testo (§0.6, 2026-10-21): Markdown con una sintassi
    nostra, come fa Obsidian: CommonMark, `[[id]]`, `![[id]]` e
    un'intestazione YAML ristretta a sole stringhe;
  - la riga di separazione `---` (2026-10-21, scritto da Alessio direttamente
    alla sottosessione della specifica): «ammettila come linea, con le righe
    vuote dal formatter se teniamo md». Quindi `---` è una linea, e il
    `formatter` le mette una riga vuota prima e dopo, perché in CommonMark
    `---` subito sotto una riga di testo la trasforma in un titolo;
  - capitoli (§0.7, 2026-10-21): l'opzione D di Alessio, il capitolo come
    composizione che si può annidare; l'`article` è l'indice dei capitoli, e
    un `deck` usa gli stessi capitoli senza ripetere i titoli.

  - punti aperti §0.8-§0.13 della bozza (2026-10-21, «ok a tutti i tuoi
    suggerimenti»): `tags` è sempre presente ma la lista vuota è ammessa; i
    commenti si scrivono solo come commenti HTML `<!-- -->`, unica eccezione
    al divieto dell'HTML grezzo; il file di configurazione del documento è un
    file come gli altri, con `kind` `document` e tutto nell'intestazione, uno
    solo per documento; un oggetto dentro un capoverso per ora non è ammesso
    (un `text` resta un blocco solo); la numerazione di capitoli e immagini la
    calcola il `runtime` e la scrive nel `resolved tree`; nel `canvas file`
    ogni nodo porta l'`id`, se JSON Canvas ammette una chiave in più e gli
    altri programmi la conservano, altrimenti restano i percorsi. Dubbio di
    Alessio sull'oggetto dentro un capoverso: se si deve spezzare per forza il
    testo, o se esiste un modo in linea. Risposta di Alessio, dopo la
    spiegazione: «va bene così, per ora vietati»;

  Questi ultimi punti Alessio li ha approvati con «ok ai tuoi suggerimenti»,
  riferito ai sei punti aperti della bozza.
  - Confermate anche le proposte nuove della bozza (2026-10-21): le classi di
    conformità da 0 a 6, cioè il `core` e i sei passi dell'ordine deciso; un
    attributo sconosciuto si ignora con un avviso; una forma generica dei
    riferimenti per `id` nel `core`; il file degli `id` ritirati si chiama
    `retired-ids.yaml`; lo `style` calcolato dal `runtime` sta nel `resolved
    tree`.

## Proposte non decise

- Modello semantico a nodi tipizzati con ID stabili. Flusso, griglia e canvas
  (Word, Excel, PowerPoint) come tre viste dello stesso grafo.
- Motore di calcolo reattivo come nucleo: un grafico in una slide è una vista di
  una tabella, non una copia.
- L'editor grafico emette solo operazioni esprimibili nel sorgente, stampate da
  un formatter canonico, con un albero di sintassi concreto che preserva i
  commenti. (Che il sorgente sia la fonte di verità ora è deciso.)
- Layout a vincoli invece di coordinate assolute, per non sporcare i diff.
  Posizione assoluta solo come via di fuga.
- ID solo dove un nodo è referenziato (come gli ancoraggi `^id` di Obsidian),
  oppure in un file sidecar.
- Due livelli di diff: testuale subito, via Git; semantico sull'albero più tardi,
  il che richiede ID stabili fin dall'inizio.
- Riusare motori esistenti invece di scrivere l'impaginazione da zero: Typst,
  Taffy, HTML/CSS; Yjs o Automerge per la collaborazione; rowan per l'albero.
- Funzioni matematiche fornite dal motore con una libreria fissata, così il
  calcolo dà gli stessi risultati nell'export, nella pagina HTML e nel servizio.
- Un solo punto di calcolo. Il runtime produce un albero risolto: formule e
  blocchi calcolati, riferimenti e numerazioni risolti. I due motori di
  rendering lo leggono senza ricalcolare nulla. Il corpus verifica
  quell'albero, non i pixel.
- Quando arriverà il motore Typst, la sua vista per pagina sarà disegnata da
  Typst dallo stesso layout del PDF (vedi
  [ricerca/vista-per-pagina.md](ricerca/vista-per-pagina.md)).
- Creazione di una lista dallo spazio libero: l'editor (o l'AI) propone nomi
  presi da intestazioni ed etichette, tipi riconosciuti dai valori e una
  chiave; chi scrive conferma o corregge; il runtime crea il file dei dati e lo
  schema, e al posto del blocco libero lascia nel contenuto un riferimento alla
  lista, così il diff mostra lo spostamento.
- Come primo prodotto, il runtime con la sua riga di comando: prende la
  cartella del documento e produce l'albero risolto, l'HTML e il PDF, senza
  app.
- Collegamenti robusti in tre strati. Meccanico, nel sorgente: id nel file,
  rinomina dal runtime, id tolto alle copie, traccia «sostituito da», controllo
  dopo ogni merge. Impronta, nel sorgente: poche parole e l'hash del bersaglio
  per ritrovarlo e per vedere che è cambiato. Semantico, solo calcolato in una
  cache locale: propone candidati e collegamenti nuovi come `hint`, mai salvati
  da soli. Dettagli in [bozza-nodi.md](bozza-nodi.md), fatti in
  [ricerca/collegamenti-semantici.md](ricerca/collegamenti-semantici.md).

## Bozza di sintassi

È solo un bersaglio da criticare, non una proposta di sintassi.

```
doc "Rapporto produzione"
  sec
    h  "Risultati Q3"
    p  "Le linee hanno prodotto {@vendite.totale} pezzi."
  data #vendite
    cols  mese, pezzi, scarti
    row   Lug, 1200, 14
    row   Ago, 1350, 9
    row   Set, 1280, 11
    calc  totale = sum(pezzi)
  view #g1
    of    @vendite
    kind  bar
    x     mese
    y     pezzi
slide
  layout  titolo+contenuto
  title   "Sintesi Q3"
  place   @g1  fit
```

Debolezze già note: tipi dei valori impliciti; unità di misura ed espressioni non
definite; layout a vincoli solo accennato; nessuna regola per assegnare gli ID
quando due rami lavorano in parallelo.

## Orientamenti di Alessio (da precisare)

- Estensibilità: estensioni e connettori distribuiti da un marketplace, per
  ampliare i tipi di oggetti e i template dei layout, coerente con l'approccio
  incrementale. Proposte da confermare: la specifica definisce il meccanismo
  di estensione, non le estensioni; la sintassi ha fin dall'inizio una forma
  generica per i tipi di oggetto non noti, che il parser legge e il formatter
  conserva anche senza l'estensione (come le direttive di MyST); ogni oggetto
  di un'estensione porta nel documento una forma statica, così il documento si
  apre anche dove l'estensione manca; le versioni delle estensioni sono
  fissate nel documento con un hash; si procede per gradi: prima template di
  layout senza codice, poi tipi dichiarativi, poi tipi con codice in sandbox,
  poi connettori a fonti esterne con permessi dichiarati; il registro è aperto
  e replicabile, come crates.io o Typst Universe. I connettori del
  marketplace sono integrazioni con servizi esterni: fonti di dati, ma anche
  posta, calendari, video come YouTube e media in generale.

- Lo spazio libero come punto d'ingresso dello strumento: si parte da una
  pagina vuota e si scrive, poi ogni pezzo si promuove all'elemento che serve
  (paragrafo, capitolo, immagine, lista, grafico, e più avanti slide). Un
  grafico è una vista di una lista: promuovere una tabellina a grafico crea con
  un solo gesto la lista (dati e schema) e il grafico che la usa. Restano
  da precisare: capitoli impliciti dai titoli o annidamento esplicito; come il
  testo segna il tipo dopo la promozione; quali promozioni sono possibili da
  quale tipo; il gesto inverso. Sono domande per la bozza dei tipi di nodo.

- Dati in CSV oppure TSV, con il dialetto dichiarato nello schema.
- Formule e connettori in file separati, divisi per tipo, fin dall'inizio.
- Identità degli elementi di una lista: chiave naturale se dichiarata,
  altrimenti una colonna di ID corti. Da decidere se l'ID c'è sempre o solo
  quando un elemento viene referenziato.

- Tipi e dimensioni: restano da precisare il formato dello schema (si può
  partire da CSVW o da Frictionless Table Schema); come si salva una tabella
  multidimensionale
  (proposta: in forma lunga, una riga per combinazione, con le dimensioni
  dichiarate nello schema e le viste a griglia come pivot); se le dimensioni
  sono oggetti con nome condivisi fra tabelle.

- Tabelle come fonti di dati: la tabella intera viaggia sui connettori come un
  cavo; una tabella può contenere riferimenti a formule in un file a parte, e
  così via. Restano da precisare: se ogni tabella deve dichiarare una chiave
  per raggiungere una singola riga; riferimenti a livello di colonna o di
  singola cella; come si segnalano i cicli fra file.

- Non rifare Excel: soddisfare le esigenze di chi lo usa in modo più moderno,
  più semplice e più potente. Idee: eliminare il concetto di cella, usare
  connettori grafici al posto delle formule. I connettori sono una vista del
  sorgente testuale e hanno un file proprio (vedi le decisioni). Resta da
  precisare il confine fra il file delle formule e quello dei connettori; la
  ricerca indica la scala: espressioni dentro il blocco, connettori fra tabelle
  e passi (vedi
  [ricerca/connettori-e-usi-excel.md](ricerca/connettori-e-usi-excel.md)).

- Livelli: restano da precisare come si referenziano i file fra loro e quale
  file indica da dove partire.

- Si riusano pezzi esistenti open source. Il progetto è pensato per essere
  pubblicato in futuro, probabilmente come open source (Alessio, 2026-10-20:
  "credo avrebbe senso"), ma non è deciso. Restano da precisare: la licenza
  dell'implementazione (permissiva o copyleft), che decide quali componenti si
  possono incorporare; la licenza del testo della specifica e la concessione
  sui brevetti; chi governa le modifiche. Proposta: finché non si decide,
  preferire componenti con licenza permissiva, così restano aperte tutte e due
  le strade.

- Un documento contiene contenuto, presentazione, slide, grafici, codice,
  tabelle CSV e formattazione, esportabile in HTML e stampabile in PDF. Con la
  decisione dei livelli questi elementi stanno in file diversi, più gli asset.
  Resta da confermare che documento e slide condividano dati e grafici per
  riferimento, cosa che i file separati rendono naturale.

- Gli sviluppi di un concetto sono file collegati, non tutti in un unico file,
  così ognuno ha il tipo adatto al contenuto (Alessio, 2026-10-20: "forse
  preferisco file linkati"). Il suo esempio: un concetto scritto come
  capoverso e rappresentato da una tabella e dal grafico associato; più
  concetti associati alla stessa tabella, o a un'immagine che la rappresenta.
  I collegamenti sono quindi molti a molti, e anche fra sviluppi.

- I collegamenti per id, cioè meccanici, si possono rompere: Alessio propone di
  aggiungere un collegamento generato in automatico per semantica, e chiede
  quanto sia semplice (2026-10-20). Analisi e proposte in
  [bozza-nodi.md](bozza-nodi.md).

- Il grafico come template: un modo di vedere una tabella, che si applica a
  dati diversi in un oggetto (Alessio, 2026-10-20, in forma di domanda).
  Proposta di Claude: il template dice tipo di grafico e ruoli tipizzati senza
  dati, l'oggetto `chart` lo applica a una `collection` con il campo per ogni
  ruolo; lo stesso meccanismo può valere per tutte le viste. Dettagli in
  [bozza-nodi.md](bozza-nodi.md).
  Più dati nello stesso grafico: affiancati, selezionabili o altro, lo decide
  il template; per esempio le vendite nel mese scorrendo i mesi, o le vendite
  di diversi tipi di prodotto nell'anno (Alessio, 2026-10-20). Poi: un nuovo
  oggetto aggregatore che usa lo stesso template potrebbe essere più nello
  spirito che un template che fa da aggregatore (Alessio, 2026-10-20). Da
  precisare: cosa resta al template (proposta: la serie) e cosa va
  all'aggregatore (affiancati, selettore), la forma stampata di un selettore,
  il nome. Alessio lo paragona alla sezione per le pagine: un aggregatore di
  dati (2026-10-20).

- Sintassi dei file di testo (specifica §0.6): Alessio non conosce CommonMark e
  Djot, e chiede di valutarli insieme a due altre strade: un formato nostro,
  oppure Markdown con una sintassi nostra, come fa Obsidian (2026-10-20).

- L'impaginazione finale viene sempre da fuori, non da dentro il testo, forse
  anche per i collegamenti e le formule scritti dentro il testo (Alessio,
  2026-10-21). Il testo dice cosa è una cosa; come appare lo decidono il
  `runtime`, gli `stylesheet` e la configurazione del documento.

- Capitoli e titoli (specifica §0.7): forse il capitolo dovrebbe essere un
  aggregatore di testi, come un indice dettagliato (Alessio, 2026-10-20).

- Formule: Python era l'ipotesi più semplice, non un vincolo. Da capire quale
  linguaggio convenga, con la possibilità di richiamare codice esterno al
  documento.

## Punti aperti

- Come tenere gli ID senza rumore nei diff e senza collisioni nei merge.
- Collaborazione in tempo reale (CRDT) contro merge Git: due modelli di concorrenza.
- Dati grandi: file colonnari referenziati, non nel sorgente.
- Il progetto è generale, non legato a un solo caso d'uso (Alessio,
  2026-10-20). Per il corpus servono comunque documenti campione reali che
  coprano gli usi:
  - un testo lungo con capitoli;
  - liste e tracker;
  - modelli e budget;
  - report con tabelle e grafici;
  - una presentazione a slide;
  - un foglio di calcolo interattivo, in cui chi legge cambia gli input e vede
    ricalcolare, non solo la presentazione statica dei dati;
  - appunti con calcoli al volo.
  Alessio non ha documenti propri da usare: il corpus si crea man mano, un
  livello alla volta. Proposta: due tipi di documenti, cioè casi minimi
  scritti apposta per una sola regola, e documenti pubblici reali (articoli
  di Wikipedia, rapporti pubblici, fogli dei corpora EUSES e FUSE) ricreati
  nel nostro formato, con licenze che permettano di pubblicarli.
- Governance e licenza della specifica.

## Ordine di lavoro

Prima del motore e dell'editor servono tre cose piccole:

1. Modello dei nodi: tipi minimi per testo, tabella, vista e slide, e come si
   legano. La prima bozza la scrive Alessio.
2. Sintassi testuale canonica con formatter.
3. Corpus di documenti di esempio con l'output atteso, base dei test di
   conformità.
