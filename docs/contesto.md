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
- Un documento è un file sorgente più i suoi asset. Può stare in una cartella in
  chiaro oppure in uno zip con un'estensione propria; per Alessio le due forme
  sono equivalenti.
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
- Si procede in modo incrementale, per livelli: un file di testo per ciascun
  livello (contenuto, impaginazione, dati, formule, connettori, grafici,
  slide), aggiungendone uno alla volta. La divisione in file riguarda solo come
  si salva: l'editor mostra ogni livello dove serve, per esempio le formule
  accanto alla tabella.
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
  connettori, slide.

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
- Come primo prodotto, il runtime da riga di comando: prende il file e produce
  l'albero risolto, l'HTML e il PDF, senza app.

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

- Spazio libero per appunti e calcoli al volo. Proposta: dentro il contenuto,
  come righe di calcolo nel testo con risultato in linea (come Soulver o le
  Math Notes di Apple), con un gesto per promuovere una tabellina a lista vera.
  Da confermare.
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

- Tutto open source, e si possono riusare pezzi esistenti. Restano da
  precisare: la licenza dell'implementazione (permissiva o copyleft), che
  decide quali componenti si possono incorporare; la licenza del testo della
  specifica e la concessione sui brevetti; chi governa le modifiche.

- Un documento contiene contenuto, presentazione, slide, grafici, codice,
  tabelle CSV e formattazione, esportabile in HTML e stampabile in PDF. Con la
  decisione dei livelli questi elementi stanno in file diversi, più gli asset.
  Resta da confermare che documento e slide condividano dati e grafici per
  riferimento, cosa che i file separati rendono naturale.

- Formule: Python era l'ipotesi più semplice, non un vincolo. Da capire quale
  linguaggio convenga, con la possibilità di richiamare codice esterno al
  documento.

## Punti aperti

- Come tenere gli ID senza rumore nei diff e senza collisioni nei merge.
- Collaborazione in tempo reale (CRDT) contro merge Git: due modelli di concorrenza.
- Dati grandi: file colonnari referenziati, non nel sorgente.
- Primo caso d'uso in cui gli strumenti attuali sono chiaramente peggiori.
  Ipotesi da confermare: documentazione tecnica con dati vivi, da tenere in Git.
- Governance e licenza della specifica.

## Ordine di lavoro

Prima del motore e dell'editor servono tre cose piccole:

1. Modello dei nodi: tipi minimi per testo, tabella, vista e slide, e come si
   legano. La prima bozza la scrive Alessio.
2. Sintassi testuale canonica con formatter.
3. Corpus di documenti di esempio con l'output atteso, base dei test di
   conformità.
