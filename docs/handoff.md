# Passaggio di consegne

Stato del progetto al 2026-10-20, per chi riprende il lavoro in una sessione
futura. Le decisioni esatte stanno in [contesto.md](contesto.md); dove questo
file e contesto.md divergono, vale contesto.md.

## Il progetto in breve

Alessio progetta un nuovo standard aperto per documenti, fogli di calcolo e
presentazioni con un solo strumento. Non è un clone di Word o di ONLYOFFICE: la
compatibilità con DOCX, XLSX e PPTX non è un requisito.

Un documento è una cartella (o uno zip) di file di testo più gli asset: un
file per ogni concetto (`concept`) e per ogni oggetto (`object`: testo,
tabella, grafico, immagine), più le composizioni (`article`, `deck`,
`webpage`) che li usano. I livelli (contenuto, dati, grafici, formule,
connettori) si aggiungono uno alla volta; orientamento: sono filtri dell'app,
non cartelle. Il testo è la base; l'editor grafico, la griglia, i connettori e le
pagine sono viste generate dal testo. Il motore è l'HTML; il PDF è la sua
stampa. Si parte dal motore, non dall'interfaccia. Nel repository non c'è
ancora codice.

## Come lavorare con Alessio

- **Tono.** È un ingegnere e vuole un confronto da pari. Scrive messaggi brevi
  in italiano, spesso decisioni secche ("entrambi", "ok", "si la seconda").
- **Le sue bozze.** La prima bozza dei tipi di nodo la scrive lui. Va rivista e
  criticata, non sostituita con una versione finita. Lo stesso vale per le sue
  bozze successive.
- **Le risposte.** Prosa asciutta, poca formattazione. Quando c'è una
  raccomandazione va detta, lasciando a lui la scelta. Poche domande, solo
  quelle che cambiano cosa si fa dopo.
- **Registrare le decisioni.** Ogni sua decisione va subito in
  [contesto.md](contesto.md), separando decisioni, orientamenti da precisare e
  proposte non decise. Poi commit e push.
- **I suoi "ok" e i suoi "fai come suggerisci".** Vanno registrati con
  prudenza: scrivere a quali domande li si è applicati, e chiedergli di
  correggere se serve.
- **La ricerca.** Si fa solo quando serve a una scelta che ha davanti, mirata a
  una domanda alla volta, con verifica dei fatti su fonte primaria. All'inizio
  del progetto un workflow con nove aree di ricerca era partito troppo presto:
  Alessio ha chiesto "sicuri che servano?" e aveva ragione.
- **I crediti.** Quando avvisa che i crediti stanno finendo, mettere tutto al
  sicuro subito: commit, push, passaggio di consegne aggiornato.

## Decisioni prese

**Formato e livelli**
- Un documento è un insieme di file di testo più gli asset, in una cartella in
  chiaro o in uno zip con estensione propria.
- Principio (2026-10-20): l'aspetto incrementale è lo spirito di ogni cosa;
  gli stessi mattoni possono dare documenti o presentazioni completamente
  diversi.
- Si procede in modo incrementale, un livello (`part`) alla volta, in
  quest'ordine:
  1. contenuto e impaginazione;
  2. dati;
  3. grafici;
  4. formule;
  5. connettori;
  6. presentazioni, come `composition` di tipo `deck` (le slide non sono un
     livello a sé).
- La divisione in file riguarda solo il salvataggio: l'editor mostra ogni
  livello dove serve, per esempio le formule accanto alla tabella.
- Il testo in chiaro è la base di tutto. Ogni vista grafica è generata dal
  testo, e ogni modifica grafica diventa una modifica del testo.
- Si riusano componenti open source. Il progetto è generale, non legato a un
  solo caso d'uso, e pensato per essere pubblicato: probabilmente open source,
  non ancora deciso.

**Il modello (2026-10-20, dettagli in [bozza-nodi.md](bozza-nodi.md))**
- Ogni oggetto è un file, anche il capoverso.
- L'unità di significato è il `concept`: un'idea con i suoi metadati e i
  collegamenti ai suoi sviluppi. Gli sviluppi sono `object`, ciascuno del suo
  `kind`. Orientamento: gli sviluppi stanno in file collegati, molti a molti.
- I collegamenti fra `concept` e `object` sono bilaterali: si scrivono da una
  parte, dall'altra o da entrambe.
- La `composition` punta l'`object`, che può avere o no un collegamento a un
  `concept`. Il contesto punta, l'oggetto non sa dove è usato.

**Tabelle**
- Le tabelle sono liste moderne (`collection`): elementi con identità e proprietà tipizzate,
  relazioni fra liste, più viste dello stesso elenco.
- Ogni tabella ha un nome obbligatorio. Le celle non hanno coordinate.
- Le colonne hanno un tipo. Le tabelle possono essere multidimensionali.
- Tipi, chiavi e dimensioni stanno in uno schema separato dal CSV.
- La griglia resta come interfaccia per inserire e guardare i dati.
- Lo spazio libero per appunti e calcoli al volo sta dentro il contenuto: righe
  di calcolo con il risultato in linea. Da lì si può poi creare una lista vera
  (il meccanismo proposto è in [contesto.md](contesto.md)).

**Connettori**
- Hanno un file proprio. Il layout è automatico; le posizioni sistemate a mano
  vanno in un file di layout a parte, solo per i nodi spostati.

**Codice**
- Il codice nel documento ha un marker se va eseguito e un marker se va
  mostrato.

**Motori e output**
- Motori per fasi:
  - si parte con un solo motore, l'HTML;
  - il PDF è la stampa dello stesso HTML, fatta da un motore browser di
    versione fissata;
  - più avanti potrà arrivare Typst, per una modalità di scrittura orientata
    alla stampa.
- Obiettivo finale: una vista interattiva HTML che esporta in PDF, e una vista
  di scrittura PDF che esporta in HTML statico. Condizione: modello e
  impaginazione neutri rispetto al motore.
- L'impaginazione usa un sottoinsieme di CSS definito dalla specifica: solo
  proprietà con un significato fissato e traducibili anche per Typst.
- L'HTML esportato è vivo: il lettore cambia gli input e vede ricalcolare, e i
  dati possono aggiornarsi da fonti esterne. Chi lo apre vede sempre i valori
  fotografati all'export. Se il motore c'è, la pagina ricalcola; il resto passa
  da un servizio locale o nel cloud, che chiunque può installare sul proprio
  server.

**Runtime ed editor**
- Il motore è un runtime separato dall'app. Parte quando si apre il file e
  possiede i file.
- Parla LSP per il testo, e un protocollo proprio per le operazioni sul modello
  e per le anteprime.
- L'app mostra il sorgente, la vista di editing grafico e le anteprime.
  L'editing grafico avviene sopra l'anteprima HTML, con una vista per pagina.

**Foglio bianco e layout**
- All'apertura c'è un foglio bianco di bozze: si creano oggetti (testi,
  tabelle, grafici, immagini) anche in disordine, e una lista a fianco li
  organizza.
- Un oggetto archiviato esce dal foglio e va nella lista. Lo si richiama
  trascinandolo sul foglio, o cliccandolo per vederlo da solo; è lo stesso
  oggetto, non una copia.
- I layout (documento, presentazione e altri) sono viste create a parte, che
  usano gli oggetti archiviati per riferimento; lo stesso oggetto può stare in
  più layout.
- Lo spazio libero ammette righe di calcolo con il risultato in linea. Da lì si
  può creare una lista vera.
- Anche le bozze sono salvate nei file.
- Il file del foglio salva solo posizioni e riferimenti, partendo da JSON
  Canvas. La lista a fianco ha sezioni per tipo, una sezione "da sistemare" e i
  layout ordinati.
- Classificazione, collegamenti e promozioni automatiche sono solo
  suggerimenti da confermare.

**Implementazione**
- Regole dei nomi del §1 del glossario decise, e decisi i nomi `collection`,
  `part` e `composition`. I connettori del marketplace sono `integration`:
  servizi esterni come fonti di dati, posta, calendari, video e media.
- La riga di comando ha le proprietà confermate in [contesto.md](contesto.md).
- Nomi del prodotto in inglese, fissati nel glossario
  [glossario.md](glossario.md), impostato sul modello di quello di ID-Zero:
  regole dei nomi nel §1, parole con più significati, nomi che collidono con
  usi diffusi, concetti del prodotto. Lo controlla
  `tools/verifica_glossario.py`. Documenti di lavoro in italiano finché il
  repository è privato; messaggi di commit in inglese.
- Nasce con una riga di comando, così un'AI può configurarlo e usarlo. Le
  proposte su come deve essere fatta sono in [contesto.md](contesto.md).
- TypeScript per la prima versione: runtime, LSP, riga di comando, editor.
- Rust compilato in WASM solo dove le misure lo chiederanno.

## Orientamenti e proposte da tenere presenti

Gli elenchi completi sono in [contesto.md](contesto.md).

**Orientamenti da precisare**
- dati in CSV oppure TSV, con il dialetto dichiarato nello schema;
- formule e connettori in file separati;
- un ID per ogni elemento delle liste;
- tabelle multidimensionali salvate in forma lunga e mostrate come pivot;
- formule: Python non è un vincolo, il linguaggio è da scegliere.

**Proposte non decise**
- un albero risolto come unico punto di calcolo, letto dai motori e verificato
  dal corpus;
- funzioni matematiche fornite dal motore con una libreria fissata;
- formatter canonico;
- ID solo dove servono;
- il runtime da riga di comando come primo prodotto.

## Ricerca fatta

Ci sono sette note in [ricerca/](ricerca/), con fonti primarie e fatti
ricontrollati da un secondo agente, salvo le parti che ogni nota indica.

- **[ricerca/formule-python.md](ricerca/formule-python.md).** Python non ha
  una semantica formale. Microsoft, con Python in Excel, ha rinunciato a
  ricavare le dipendenze dal codice. Il caso Grist mostra che una sandbox
  Pyodide non basta.
- **[ricerca/linguaggio-formule.md](ricerca/linguaggio-formule.md).** Il
  confronto fra JavaScript, formule stile Excel, CEL e SQL dice che ogni
  candidato va bene a un livello solo. Il determinismo viene dallo stesso
  binario WASM o da una libm fissata, non dal linguaggio.
- **[ricerca/vista-per-pagina.md](ricerca/vista-per-pagina.md).** Nessun
  prodotto noto ha una vista per pagina coerente con la stampa usando due
  motori. Questo ha portato alla decisione di partire con un solo motore.
- **[ricerca/connettori-e-usi-excel.md](ricerca/connettori-e-usi-excel.md).**
  - Connettori fra tabelle e passi sì, cablare aritmetica e condizioni no.
  - Il nucleo di funzioni usate è piccolo, e le formule sono quasi tutte copie.
  - Togliere le coordinate regge; togliere lo spazio libero no.
- **[ricerca/excel-e-alternative.md](ricerca/excel-e-alternative.md).**
  - Excel vince per la griglia come struttura pronta, i valori visibili e la
    leggibilità.
  - I suoi difetti hanno cause di progetto che le nostre decisioni affrontano.
  - Lotus Improv separava già dati, formule e viste, e ha perso perché era
    debole nel fare tabelle.
- **[ricerca/collegamenti-semantici.md](ricerca/collegamenti-semantici.md).**
  - Generare collegamenti per significato in locale è semplice: un modello da
    circa 100 MB, pochi millisecondi per capoverso.
  - Non sostituisce l'id: non è deterministico, non vede negazioni e numeri,
    e sbaglia spesso nel proporre collegamenti nuovi.
  - Quasi tutte le rotture si coprono con meccanismi deterministici più
    un'impronta del bersaglio; la semantica serve a proporre candidati.
  - Gli script delle misure locali sono in
    [ricerca/misure/embedding/](ricerca/misure/embedding/).
- **[ricerca/sintassi-testo.md](ricerca/sintassi-testo.md).** CommonMark con
  un'intestazione contro Djot, per i file di testo. CommonMark non ha né
  attributi né front matter; Djot ha gli attributi ma si dichiara instabile, e
  GitHub non lo riconosce. Non sceglie: dà i costi.

## Ultima discussione

Il 2026-10-20 Alessio ha lanciato molte idee sul modello del primo livello, e
ha chiesto di raccoglierle "in qualcosa di sensato". La sintesi è in
[bozza-nodi.md](bozza-nodi.md), con le sue idee in ordine al §7.

- Ha scelto i nomi `concept` e `object`. Gli sviluppi di un concetto sono file
  collegati, così ognuno ha il suo tipo: un concetto scritto come capoverso e
  rappresentato da una tabella e dal suo grafico, e più concetti sulla stessa
  tabella.
- Ha deciso i collegamenti bilaterali e la composizione che punta l'oggetto.
- Poi ha notato che i collegamenti per id si possono rompere, e ha proposto un
  collegamento generato per semantica. La ricerca dice che è semplice da
  generare ma non può sostituire l'id. La proposta, in tre strati (meccanico,
  impronta, semantico calcolato), è nel §3 della bozza e aspetta la sua
  risposta.

## Domande aperte

1. **Confine fra formule e connettori.** La ricerca sostiene la divisione per
   scala: espressioni dentro il blocco, connettori fra tabelle e passi.
2. **Formula per colonna.** Con eccezioni per cella segnalate, come le tabelle
   di Excel, o senza eccezioni, come Grist?
3. **Calcoli fra righe.** Totali progressivi e riga precedente richiedono un
   ordine esplicito. L'ordine delle righe va salvato come dato, anche se non è
   un indirizzo.
4. **Linguaggio delle formule.** Con TypeScript come linguaggio di
   implementazione, l'opzione di un sottoinsieme di espressioni JavaScript
   diventa più comoda, ma non è decisa.
5. **Licenza del codice.** Permissiva o copyleft. Restano da definire anche la
   licenza della specifica, la concessione sui brevetti e la governance.
6. **Pacchetto.** Tre domande aperte:
   - i risultati e gli export stanno nel pacchetto?
   - Gli URL esterni sono ammessi come asset?
   - Serve un manifest per sapere da dove partire?
7. **Codice eseguito.** Tre domande aperte:
   - blocchi e formule condividono i nomi?
   - L'ordine di esecuzione va per dipendenze o dall'alto in basso?
   - Quali linguaggi servono?
8. **Vista per pagina.** Con l'HTML come motore, la vista per pagina è HTML
   impaginato (Paged.js o la frammentazione di Chromium). Coincide con il PDF
   se la stampa la fa lo stesso Chromium con gli stessi font. Le tre opzioni
   con Typst valgono per la fase successiva.
9. **I punti aperti di [contesto.md](contesto.md).** ID e merge, CRDT contro
    Git, documenti campione per il corpus, governance.

## Prossimi passi

0. **La bozza di specifica**, [specifica.md](specifica.md), del `core` e della
   classe 1 (2026-10-20/21). L'ha scritta una sottosessione su mandato
   dell'orchestratore, in dodici giri, controllati da revisori indipendenti;
   i 32 esempi sono anche i test. Le decisioni di Alessio sono in contesto.md,
   voce «Sulla bozza di specifica». Restano tre punti APERTI, §0.14-§0.16, in
   attesa di Alessio: il testo di un `[[id]]` verso un nodo numerato, la
   forma di `embed-class`, l'aspetto dei titoli. Le preferenze
   dell'orchestratore, già dette ad Alessio: numero più `title` dove la
   `composition` numera; la mappa a un livello di sole stringhe; i titoli
   fra i tipi agganciabili, con nomi per grado (`title-1`…), perché senza
   combinatori un solo `title` colpirebbe tutti i titoli allo stesso modo.
   Il controllo del dodicesimo giro (ad0445a) ha trovato un blocco negli
   esempi: il `document file` creato dallo script non ha `spec-version`, e
   con la regola nuova ogni esempio darebbe `spec-version-missing`. Le
   correzioni sono andate nel tredicesimo giro, con queste altre: il segno
   meno nella tabella delle lingue, i valori ammessi per ogni proprietà, lo
   stile della radice in una chiave del suo nodo, i casi di
   `embed-class-retired`, e per il §0.14 il costo di capitoli e immagini che
   mostrerebbero tutti e due «1». I
   rapporti dei revisori non sono nel repository: vanno ripetuti se servono.
   La sottosessione è session_01LJTSfiwiWSRkNwwAHxW4pz, ramo
   claude/spec-draft-level1.
1. **La bozza dei tipi di nodo** del primo livello è iniziata in
   [bozza-nodi.md](bozza-nodi.md): è di Alessio, scritta insieme. Il
   2026-10-20 è diventata una sintesi del modello: il `concept` come unità di
   significato, gli `object` come sviluppi in file collegati (molti a molti),
   le `composition` che puntano ciò che serve, tutti i file insieme filtrati
   dall'app. Ha cinque domande aperte. La revisione deve controllare tre cose:
   - che il modello sia neutro rispetto al motore;
   - che l'impaginazione stia nel sottoinsieme di CSS;
   - che ci siano agganci per l'impaginazione (nomi o classi), forme statiche
     per gli elementi interattivi e ID per diff e riferimenti.
2. **Sintassi canonica e formatter** per quel livello.
3. **Corpus di conformità** con output atteso, verificato sull'albero risolto,
   e su fogli e documenti reali, non costruiti.
4. **Un primo prodotto possibile**, solo proposto: il runtime da riga di comando
   in TypeScript. Prende la cartella del documento e produce l'albero risolto,
   l'HTML e il PDF, stampato con Playwright e un Chromium fissato.
5. **Misure da fare:**
   - qualità e limiti della paginazione HTML nel browser (note, intestazioni,
     numeri di pagina);
   - coerenza fra la vista per pagina e la stampa;
   - avvio nel browser dei motori di calcolo candidati.

## Riferimenti pratici

- Branch di lavoro: `claude/nuovo-standard-docs-ijv7f4`.
- File: [../README.md](../README.md), [../CLAUDE.md](../CLAUDE.md),
  [contesto.md](contesto.md), [ricerca/](ricerca/).
- La discussione è partita da WordCraft (clone di Word in Rust, pre-alpha) ed
  Euro-Office (fork di ONLYOFFICE). I riferimenti citati da Alessio sono Notion
  per il modello a blocchi e Obsidian per i file di testo locali.
