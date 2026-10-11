# Passaggio di consegne

Stato del progetto al 2026-10-11, per chi riprende il lavoro in una sessione
futura. Si legge in dieci minuti. I dettagli stanno nei file citati; dove
questo file e [contesto.md](contesto.md) divergono, vale contesto.md.

## Il progetto in breve

Alessio progetta un nuovo standard aperto per scrivere documenti, fogli di
calcolo e presentazioni con un solo strumento. Non è un clone di Word o di
ONLYOFFICE: la compatibilità con DOCX, XLSX e PPTX non è un requisito. Il
sorgente è testo diffabile in Git, un editor grafico scrive lo stesso sorgente
e un'AI deve poterlo leggere e modificare. Si parte dal motore, non
dall'interfaccia. Nel repository non c'è ancora codice: solo documenti.

## Come lavorare con Alessio

- **Tono.** È un ingegnere e vuole un confronto da pari. Scrive brevi messaggi
  in italiano, spesso decisioni secche ("entrambi", "ok", "html vivo").
- **Le sue bozze.** La prima bozza dei tipi di nodo la scrive lui. Va rivista e
  criticata, non sostituita con una versione finita. Lo stesso vale per le sue
  bozze future.
- **Risposte.** Prosa asciutta, poca formattazione. Quando c'è una
  raccomandazione va detta, lasciando a lui la scelta. Poche domande: solo
  quelle che cambiano cosa si fa dopo.
- **Registrare le decisioni.** Ogni sua decisione va scritta subito in
  [contesto.md](contesto.md), tenendo separate decisioni, orientamenti da
  precisare e proposte non decise. Poi commit e push.
- **I suoi "ok".** Un "ok" che risponde a più domande va registrato con
  prudenza: scrivere a quali domande lo si è applicato e chiedergli di
  correggere se serve.
- **Ricerca mirata.** Si fa ricerca solo quando serve a una scelta che ha
  davanti. All'inizio di questa sessione era partito un workflow grosso: nove
  aree di ricerca, critica della bozza di sintassi, scenari del corpus. Alessio
  ha chiesto "sicuri che servano?" e aveva ragione: è stato fermato prima che
  producesse qualcosa. Le ricerche successive, mirate a una domanda alla volta,
  sono servite.

## Decisioni prese

L'elenco esatto è in [contesto.md](contesto.md), sezione "Decisioni di
Alessio". In breve:

- **Il formato.** È uno standard nuovo, con un solo strumento per testo,
  calcolo e slide. È AI-friendly, diffabile in Git e a doppia scrittura:
  sorgente ed editor grafico generano l'uno l'altro.
- **Il documento.** È un file sorgente più i suoi asset, in una cartella in
  chiaro oppure in uno zip con estensione propria: le due forme sono
  equivalenti.
- **Il codice.** Nel documento porta un marker se va eseguito e un marker se
  va mostrato.
- **I motori.** Sono due, uno per l'HTML nel browser e uno per il PDF.
- **L'HTML vivo.** L'HTML esportato è vivo in due sensi: il lettore cambia
  input e vede ricalcolare, e i dati possono aggiornarsi da fonti esterne.
- **Cosa vede chi apre l'HTML.** Vede sempre i valori fotografati all'export.
  Se il motore è incluso o raggiungibile, la pagina ricalcola. Il resto passa
  da un servizio, locale o nel cloud: file locali, codice pesante, fonti
  esterne, salvataggio. La versione cloud è installabile da chiunque sul
  proprio server.
- **Il runtime.** Il motore è un runtime separato dall'app e parte quando si
  apre il file. Il runtime possiede il file: applica le modifiche dell'app
  passando dal formatter canonico e riconcilia quelle fatte da altri editor o
  da Git. Parla LSP per il testo; le operazioni sul modello e le anteprime
  useranno un protocollo proprio.
- **L'app.** Mostra il sorgente, la vista di editing grafico e l'anteprima
  HTML o PDF secondo la modalità. L'editing grafico avviene sopra l'anteprima
  HTML, a condizione che esista anche una vista per pagina. Non è stato
  chiarito cosa succede se la vista per pagina non fosse realizzabile.

## Orientamenti di Alessio, da precisare

- Tutto open source, con riuso di componenti esistenti. Restano da decidere le
  licenze e la governance (domanda 3).
- Un file di testo con contenuto, presentazione, slide, grafici, codice,
  tabelle CSV e formattazione, esportabile in HTML e PDF. Resta da decidere se
  documento e slide condividono dati e grafici (domanda 7).
- Formule: Python era l'ipotesi più semplice, non un vincolo. Vuole capire
  cosa convenga e poter richiamare codice esterno al documento.

## Proposte non decise

Sono tutte in [contesto.md](contesto.md), sezione "Proposte non decise". Le
principali:

- modello a nodi tipizzati con ID stabili, con flusso, griglia e canvas come
  viste dello stesso grafo;
- motore di calcolo reattivo come nucleo;
- sorgente come fonte di verità, con formatter canonico e albero di sintassi
  che preserva i commenti;
- layout a vincoli invece di coordinate assolute;
- ID solo dove un nodo è referenziato, oppure in un file sidecar;
- diff semantico più avanti, che però richiede ID stabili fin dall'inizio;
- riuso di Typst, Taffy, Yjs o Automerge, rowan;
- linguaggio del nucleo da decidere, per esempio Rust con una seconda
  implementazione in TypeScript, compilato anche in WASM;
- un albero risolto come unico punto di calcolo per i due motori e per il
  corpus;
- Typst come motore del PDF, che disegna anche la vista per pagina;
- come primo prodotto, il runtime da riga di comando.

## Ricerca fatta

Ci sono tre note in [ricerca/](ricerca/), con fonti primarie. I fatti portanti
sono stati ricontrollati da un secondo agente, salvo le parti che ogni nota
indica. Gli output grezzi della ricerca non sono nel repository, perché il
container della sessione è effimero.

- [ricerca/formule-python.md](ricerca/formule-python.md): cosa comporta Python
  come linguaggio delle formule.
  - Python non ha una semantica formale.
  - Microsoft, con Python in Excel, ha rinunciato a ricavare le dipendenze dal
    codice Python e ricalcola tutte le celle Python in sequenza.
  - Pyodide su Node non faceva da barriera (Grist, CVE-2026-24002), e Cyera ha
    aggirato sette prodotti che si affidavano a denylist dentro Pyodide.
  - Il codice esterno rende il diff inaffidabile, se non è fissato per hash o
    se i risultati non sono salvati e verificati.
- [ricerca/linguaggio-formule.md](ricerca/linguaggio-formule.md): confronto
  con JavaScript, formule stile Excel (OpenFormula), CEL e SQL con DuckDB.
  - Preso così com'è, ogni candidato va bene a un livello solo. JS può coprirli
    entrambi solo con un sottoinsieme ristretto per le formule.
  - La nota mette alla pari tre opzioni: due livelli (espressioni pure più
    codice completo in sandbox), tre strati (con SQL per tabelle e viste), JS
    ovunque.
  - Qualunque scelta richiede comunque requisiti comuni: sintassi canonica
    indipendente dal locale, riferimenti per nome, orologio, seme e fuso come
    input espliciti, libreria numerica definita, budget di valutazione.
  - Il determinismo fra export e browser viene dallo stesso binario WASM o da
    una libm software, non dal linguaggio. Nemmeno CEL e DuckDB danno gli
    stessi risultati fra motori o fra nativo e wasm su conversione dei numeri
    in testo, ordine delle mappe e funzioni trascendenti.
- [ricerca/vista-per-pagina.md](ricerca/vista-per-pagina.md): come avere una
  vista per pagina coerente con il PDF.
  - Nessun prodotto noto ci riesce con due motori. CKEditor ci prova, senza
    garanzie.
  - La via che regge è far disegnare la vista per pagina a Typst (typst.ts,
    tinymist, Apache-2.0) dallo stesso layout del PDF. I salti coincidono solo
    con la stessa versione di Typst, gli stessi font e gli stessi input, e
    typst.ts e tinymist usano fork di Typst.
  - Scrivere direttamente sulle pagine è stato dimostrato da un prototipo, ma
    è insufficiente come modo principale di scrivere: mancano copia e incolla
    nativi, screen reader, ricerca e undo. Lo stesso prototipo ha poi ripiegato
    su una lente per paragrafo, dichiaratamente diversa dalla pagina; l'esito
    non è documentato.
  - Un blocco reso dal motore HTML in mezzo alle pagine Typst era fallito per
    la giuntura visibile.

## Ultima discussione

A fine sessione Alessio ha detto che la direzione gli sembra troppo complicata
e ha proposto di procedere per livelli, un file di testo per ciascuno:
contenuto, impaginazione, dati, formule, grafici, slide. La risposta data: la
direzione regge, la complessità viene dal volere tutto nella prima versione, e
la sua idea è un buon modo di tagliare. Precedenti: HTML con CSS, LaTeX con
BibTeX e CSL, Hugo con `content/`, `layouts/` e `data/`. Si comincia da
contenuto più impaginazione, che danno subito HTML e PDF. L'idea è registrata
come orientamento in [contesto.md](contesto.md); si attende la sua risposta.

Alessio ha poi precisato che la divisione in file sta sotto il cofano: l'editor
presenta ogni livello dove serve, per esempio le formule accanto ai dati. Ha
chiesto anche se Excel sia davvero il massimo, quali vantaggi abbia e come
migliorarne l'esperienza. È stata avviata una ricerca mirata su questo: punti
di forza e difetti documentati di Excel, e chi ha tentato di migliorarlo (in
particolare Lotus Improv, che separava già dati, formule e viste).

Infine Alessio ha proposto di eliminare il concetto di cella e di usare
connettori grafici al posto delle formule: l'obiettivo non è rifare Excel ma
soddisfare le esigenze di chi lo usa. Avviata una seconda ricerca mirata sulla
programmazione visuale a nodi e sugli usi reali di Excel.

Alla domanda se i connettori siano il sorgente o una vista, Alessio ha
risposto: "il testo in chiaro è sempre la base di tutto". È registrato come
decisione in [contesto.md](contesto.md).

Poi ha deciso: layout automatico dei connettori, posizioni manuali in un file
di layout a parte; i connettori hanno un file proprio; si procede in modo
incrementale, un livello alla volta. Aperto: il confine fra formule e
connettori, e l'ordine dei livelli.

Ultima proposta di Alessio: il nome della tabella è obbligatorio, un valore si
raggiunge con nome più indice di riga e colonna, la tabella viaggia sui
connettori come un cavo, e può contenere riferimenti a formule in altri file.
Risposta data: d'accordo sui nomi e sul cavo tipizzato (il tipo del cavo è lo
schema della tabella); proposto di indicizzare le righe per chiave e non per
posizione, e di mettere i riferimenti alle formule a livello di colonna.

## Domande aperte rivolte ad Alessio

Sono state poste in sessione e non hanno ancora risposta. A queste si
aggiungono i "Punti aperti" di [contesto.md](contesto.md): ID e merge, CRDT
contro Git, dati grandi in file colonnari, primo caso d'uso, governance.

1. **Vista per pagina.** La nota elenca cinque opzioni; le tre proposte ad
   Alessio sono:
   - pagine di Typst e scrittura nella vista HTML a flusso, che soddisfa la
     sua condizione solo a metà, perché sulle pagine non si scrive;
   - pagine di Typst con una lente per blocco che si apre al clic;
   - righe calcolate da Typst e posizionate nel DOM, con una superficie di
     editing propria.

   Le due escluse (solo i salti da Typst, vista approssimata) non garantiscono
   le stesse righe del PDF. Raccomandazione data: partire dalla seconda e
   tenere la terza come obiettivo, se la latenza regge.
2. **Linguaggio delle formule.** Due livelli, tre strati o JS ovunque, alla
   luce di [ricerca/linguaggio-formule.md](ricerca/linguaggio-formule.md).
3. **Licenza del codice.** Permissiva (MIT, Apache-2.0) o copyleft. Ne
   dipendono i componenti incorporabili: Pandoc è GPL, Vivliostyle AGPL-3.0,
   Pyodide MPL-2.0, HyperFormula GPL-3.0 o commerciale. Restano da definire
   anche la licenza del testo della specifica, la concessione sui brevetti e
   chi governa le modifiche.
4. **Pacchetto.** Restano aperte tre domande:
   - i risultati calcolati e gli export stanno nel pacchetto, e sotto Git si
     committano?
   - Gli URL esterni sono ammessi come asset?
   - Il file principale ha un nome fisso o lo dichiara un manifest?

   Proposte fatte, non confermate: zip deterministico; primo file `mimetype`
   non compresso, come in EPUB e ODF; percorsi degli asset solo relativi e
   interni al pacchetto. Le fonti dati vive sono un'altra cosa e restano
   ammesse.
5. **Codice eseguito.** Restano aperte tre domande:
   - un blocco eseguito e una formula sono la stessa cosa per il motore, e
     condividono i nomi?
   - L'ordine di esecuzione va dall'alto in basso o per dipendenze?
   - Quali linguaggi servono per il codice eseguito (Python, JS, SQL), in
     coerenza con la domanda 2?

   Proposta fatta: l'esecuzione richiede sempre il marker esplicito. Resta da
   chiarire il comportamento di un blocco senza marker di visualizzazione.
6. **Due motori.** Restano aperte tre domande:
   - cosa è garantito uguale fra HTML e PDF? Proposta: contenuto, ordine,
     numeri, numerazioni e grafici sì, a capo e salti pagina no.
   - Le indicazioni specifiche di un output sono suggerimenti che l'altro
     ignora, mai contenuto presente in uno solo?
   - Le slide le impagina un solo motore per entrambi gli output, oppure si
     accetta la divergenza segnalando il traboccamento come errore?
7. **Documento e slide.** Nello stesso file condividono dati e grafici per
   riferimento? È il punto che distingue il progetto da Quarto, che già fa
   quasi tutto il resto.

## Prossimi passi

1. **La bozza dei tipi di nodo.** La scrive Alessio. La revisione deve
   verificare che la bozza rispetti le decisioni prese: valori fotografati,
   marker del codice, runtime che possiede il file. Deve anche vedere come
   tratta le questioni ancora aperte o solo proposte: albero risolto,
   riferimenti fra documento e slide, ID per il diff e per le operazioni
   dell'editor e dell'AI. Le debolezze già note della bozza di sintassi sono in
   [contesto.md](contesto.md).
2. **La sintassi.** Serve una sintassi testuale canonica con formatter. La
   bozza in [contesto.md](contesto.md) è solo un bersaglio da criticare.
3. **Il corpus.** Documenti con output atteso. Se si adotta l'albero risolto,
   l'output atteso è quell'albero, non i pixel.
4. **Le misure.** Servono prima di scegliere fra le opzioni della vista per
   pagina e del linguaggio delle formule:
   - latenza di Typst 0.15 per tasto sui documenti reali, con e senza salti
     pagina espliciti, insieme al tempo di disegno nel browser, che nel
     prototipo era il vero collo di bottiglia;
   - avvio nel browser di Pyodide, QuickJS wasm e DuckDB-WASM sullo stesso
     hardware;
   - quanto coincidono le righe fra Typst e Chromium con gli stessi font;
   - accessibilità di una vista per pagina su canvas o SVG;
   - un prototipo del profilo di formule scelto, con il corpus eseguito sia
     nativo sia in wasm;
   - le lacune elencate in fondo a ogni nota di ricerca.

## Riferimenti pratici

- Branch di lavoro: `claude/nuovo-standard-docs-ijv7f4`.
- File: [../README.md](../README.md), [../CLAUDE.md](../CLAUDE.md),
  [contesto.md](contesto.md), [ricerca/](ricerca/), questo file.
- Riferimenti citati da Alessio: Notion per il modello a blocchi, Obsidian per
  i file di testo locali. La discussione era partita da WordCraft (clone di
  Word in Rust, pre-alpha) ed Euro-Office (fork di ONLYOFFICE).
