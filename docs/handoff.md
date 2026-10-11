# Passaggio di consegne

Stato del progetto al 2026-10-11, per chi riprende il lavoro in una sessione
futura. Si legge in dieci minuti. I dettagli stanno nei file citati.

## Il progetto in breve

Alessio progetta un nuovo standard aperto per scrivere documenti, fogli di
calcolo e presentazioni con un solo strumento. Non è un clone di Word o di
OnlyOffice: la compatibilità con DOCX, XLSX e PPTX non è un requisito. Il
sorgente è testo diffabile in Git; un editor grafico scrive lo stesso sorgente;
un'AI deve poterlo leggere e modificare. Si parte dal motore, non
dall'interfaccia. Nel repository non c'è ancora codice: solo documenti.

## Come lavorare con Alessio

- È un ingegnere e vuole un confronto da pari. Scrive brevi messaggi in
  italiano, spesso decisioni secche ("entrambi", "ok", "html vivo").
- La prima bozza dei tipi di nodo la scrive lui. Va rivista e criticata, non
  sostituita con una versione finita. Lo stesso vale per le sue bozze future.
- Prosa asciutta, poca formattazione. Proporre una raccomandazione quando c'è,
  e lasciare a lui la scelta. Porre poche domande, quelle che cambiano cosa si
  fa dopo.
- Ogni sua decisione va scritta subito in [contesto.md](contesto.md),
  tenendo separate le decisioni dalle proposte non decise e dagli orientamenti
  ancora da precisare. Poi commit e push.
- Un suo "ok" a più domande va registrato con prudenza: scrivere a quali
  domande lo si è applicato e chiedergli di correggere se serve.
- Ricerca solo quando serve a una scelta che ha davanti. All'inizio di questa
  sessione era partito un workflow grosso (nove aree di ricerca, critica della
  bozza di sintassi, scenari del corpus). Alessio ha chiesto "sicuri che
  servano?" e aveva ragione: è stato fermato prima che producesse qualcosa.
  Le ricerche successive, mirate a una domanda alla volta, sono servite.

## Decisioni prese

L'elenco completo, con le sfumature, è in [contesto.md](contesto.md).

- **Formato.** Standard nuovo, tutto open source, componenti esistenti
  riusabili. Un documento è un file sorgente di testo più i suoi asset: o una
  cartella in chiaro o uno zip con estensione propria, equivalenti. Contiene
  testo, slide, grafici, codice, tabelle CSV e formattazione. Il codice porta
  un marker se va eseguito e un marker se va mostrato.
- **Output.** Export in HTML e in PDF, con due motori di rendering, uno per
  ciascuno. L'HTML esportato è vivo in due sensi: il lettore cambia input e
  vede ricalcolare, e i dati si aggiornano da fonti esterne. Chi apre l'HTML
  vede sempre i valori fotografati all'export. Ricalcola nella pagina se il
  motore è presente; il resto passa da un servizio, locale o nel cloud. La
  versione cloud la può installare chiunque sul proprio server.
- **Architettura.** Il motore è un runtime separato dall'app e parte quando si
  apre il file. Il runtime possiede il file: applica le modifiche dell'app
  passando da un formatter canonico e riconcilia quelle fatte da altri editor o
  da Git. Parla LSP per il testo; le operazioni sul modello useranno un
  protocollo proprio.
- **Editor.** L'app mostra il sorgente, la vista di editing grafico e
  l'anteprima HTML o PDF. L'editing grafico avviene sopra l'anteprima HTML, a
  condizione che esista anche una vista per pagina.

## Orientamenti e proposte non decise

- **Formule.** Python era l'ipotesi più semplice, non un vincolo: Alessio
  vuole capire cosa convenga. Vuole poter richiamare codice esterno al
  documento.
- **Proposte da sessioni precedenti, mai decise.**
  - modello a nodi tipizzati con ID stabili, e flusso, griglia e canvas come
    viste dello stesso grafo;
  - motore di calcolo reattivo come nucleo;
  - layout a vincoli invece di coordinate assolute;
  - ID solo dove un nodo è referenziato;
  - diff semantico più avanti;
  - nucleo in Rust compilato anche in WASM.

## Ricerca fatta

Tre note in [ricerca/](ricerca/), con fonti primarie e fatti ricontrollati da
un secondo agente. Gli output grezzi della ricerca non sono nel repository: il
container della sessione è effimero.

- [ricerca/formule-python.md](ricerca/formule-python.md): cosa comporta Python
  come linguaggio delle formule.
  - Python non ha una semantica formale.
  - Microsoft ha rinunciato al grafo reattivo per Python in Excel.
  - Una sandbox Pyodide è stata aggirata in Grist (CVE-2026-24002).
  - Il codice esterno rompe il diff se non è fissato per hash.
- [ricerca/linguaggio-formule.md](ricerca/linguaggio-formule.md): confronto
  con JavaScript, formule stile Excel (OpenFormula), CEL e SQL con DuckDB.
  - Ogni candidato va bene a un livello solo.
  - Emerge un modello a due livelli: espressioni pure per le formule e codice
    completo in sandbox con risultati salvati. In alternativa a tre strati, con
    SQL per tabelle e viste.
  - Il determinismo fra export e browser viene dallo stesso binario WASM o da
    una libm software, non dal linguaggio.
  - Quando la nota è stata scritta, le parti su CEL e SQL non erano ancora
    verificate.
- [ricerca/vista-per-pagina.md](ricerca/vista-per-pagina.md): come avere una
  vista per pagina coerente con il PDF.
  - Nessun prodotto ci riesce con due motori.
  - La via che regge è far disegnare la vista per pagina a Typst (typst.ts,
    tinymist, Apache-2.0), dallo stesso layout del PDF.
  - Scrivere direttamente su quelle pagine è stato dimostrato, ma è costoso; un
    editor per blocco sopra la pagina è il compromesso già provato.

## Domande aperte rivolte ad Alessio

Sono state poste in sessione e non hanno ancora una risposta.

1. **Vista per pagina.** Tre opzioni:
   - pagine di Typst e scrittura nella vista HTML a flusso;
   - pagine di Typst con una lente per blocco che si apre al clic;
   - righe calcolate da Typst e posizionate nel DOM, con una superficie di
     editing propria.

   Raccomandazione data: partire dalla seconda e tenere la terza come
   obiettivo, se la latenza regge.
2. **Linguaggio delle formule.** Due livelli, tre strati o JS ovunque, alla
   luce di [ricerca/linguaggio-formule.md](ricerca/linguaggio-formule.md).
3. **Licenza del codice.** Permissiva (MIT, Apache-2.0) o copyleft. Ne
   dipendono i componenti incorporabili: Pandoc è GPL, Vivliostyle AGPL,
   Pyodide MPL. Restano da definire anche la licenza del testo della
   specifica, la concessione sui brevetti e chi governa le modifiche.
4. **Pacchetto.**
   - I risultati calcolati e gli export stanno nel pacchetto, e sotto Git si
     committano?
   - Gli URL esterni sono ammessi come asset?
   - Il file principale ha un nome fisso o lo dichiara un manifest?

   Proposte fatte, non confermate: zip deterministico, primo file `mimetype`
   non compresso come in EPUB e ODF, solo percorsi relativi interni.
5. **Codice eseguito.**
   - Un blocco eseguito e una formula sono la stessa cosa per il motore,
     condividendo i nomi?
   - Ordine di esecuzione dall'alto in basso o per dipendenze?
   - Solo Python o anche SQL?

   Proposta fatta: senza marker un blocco si mostra e non si esegue.
6. **Due motori.**
   - Cosa è garantito uguale fra HTML e PDF? Proposta: contenuto, ordine,
     numeri, numerazioni e grafici sì, a capo e salti no.
   - Le indicazioni specifiche di un output sono suggerimenti che l'altro
     ignora, mai contenuto presente in uno solo?
   - Le slide le impagina un solo motore per entrambi gli output, oppure si
     accetta la divergenza segnalando il traboccamento come errore?
7. **Documento e slide.** Nello stesso file condividono dati e grafici per
   riferimento? È il punto che distingue il progetto da Quarto, che già fa
   quasi tutto il resto.

## Prossimi passi

1. Alessio scrive la prima bozza dei tipi di nodo. La revisione deve
   verificare se la bozza risponde alle decisioni prese: albero risolto unico
   per due motori, risultati fotografati, marker del codice, riferimenti fra
   documento e slide, ID per il diff e per le operazioni dell'editor e
   dell'AI.
2. Sintassi testuale canonica con formatter. Una bozza di sintassi esiste in
   [contesto.md](contesto.md), ma è solo un bersaglio da criticare.
3. Corpus di documenti con output atteso. Con due motori, l'output atteso è
   l'albero risolto, non i pixel.
4. Misure da fare prima di fissare l'architettura:
   - latenza di Typst 0.15 per tasto sui documenti reali, con e senza salti
     pagina espliciti;
   - avvio nel browser di Pyodide, QuickJS wasm e DuckDB-WASM sullo stesso
     hardware;
   - quanto coincidono le righe fra Typst e Chromium con gli stessi font.
5. Un primo prodotto concreto possibile, solo proposto: il runtime da riga di
   comando. Prende il file e produce l'albero risolto, l'HTML e il PDF, senza
   app.

## Riferimenti pratici

- Branch di lavoro: `claude/nuovo-standard-docs-ijv7f4`.
- File: [../README.md](../README.md), [contesto.md](contesto.md),
  [ricerca/](ricerca/), questo file.
- Riferimenti citati da Alessio: Notion per il modello a blocchi, Obsidian per
  i file di testo locali. Prodotti di partenza della discussione: WordCraft
  (clone di Word in Rust, pre-alpha) ed Euro-Office (fork di ONLYOFFICE).
