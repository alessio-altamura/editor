# Passaggio di consegne

Stato del progetto al 2026-10-30, per chi riprende il lavoro in una sessione
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
stampa. Si parte dal motore, non dall'interfaccia. Il primo codice è il
`runtime` da riga di comando, in `runtime/`, unito nel ramo di lavoro il
2026-10-22.

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

Ci sono nove note in [ricerca/](ricerca/), con fonti primarie e fatti
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
- **[ricerca/nomi-del-prodotto.md](ricerca/nomi-del-prodotto.md).** La
  ricerca del nome, con i controlli su npm, comandi e omonimi: Kamii è il nome
  provvisorio del progetto, non ancora confermato.
- **[ricerca/sintassi-testo.md](ricerca/sintassi-testo.md).** CommonMark con
  un'intestazione contro Djot, per i file di testo. CommonMark non ha né
  attributi né front matter; Djot ha gli attributi ma si dichiara instabile, e
  GitHub non lo riconosce. Non sceglie: dà i costi.
- **[ricerca/schema-dei-dati.md](ricerca/schema-dei-dati.md).** Frictionless
  Table Schema contro CSVW per lo `schema` di una `collection`; ha portato
  alla scelta di Frictionless dentro il descrittore. Letta dall'orchestratore
  sulle fonti primarie, non ricontrollata da un secondo agente.

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
   dell'orchestratore, in venti giri, controllati da revisori
   indipendenti; i 43 esempi sono anche i test, e il runtime li passa.
   Il ventesimo giro ha aggiunto i limiti di sicurezza del resolved tree
   (tree-limit, §11.1). Il diciannovesimo giro ha
   fissato i punti che il runtime aveva dovuto scegliere, e la ricorsione
   decisa da Alessio (§0.17). Le decisioni di
   Alessio sono in contesto.md, voce «Sulla bozza di specifica». Non restano
   punti APERTI: il 2026-10-21 Alessio ha chiuso gli ultimi tre, uno per
   volta (il testo di un collegamento lo scrive chi scrive e il numero entra
   con un segnaposto, `[[lavagna|figura {n}]]`; la `class` del documento si
   scrive accanto all'inclusione, `![[id]]{.nota}`; lo `stylesheet`
   colpisce i titoli per grado, `title-1`…`title-3`). Le conseguenze
   tecniche sono proposte, marcate nella bozza. Resta non deciso il titolo
   diverso per un solo capitolo, che l'orchestratore ha suggerito di
   rimandare. Dal sedicesimo giro le revisioni trovavano solo casi limite:
   i dettagli che restano li faranno emergere gli esempi quando si scriverà
   il `runtime`. Gli script di controllo degli esempi usati
   dall'orchestratore non sono nel repository. I
   rapporti dei revisori non sono nel repository: vanno ripetuti se servono.
   La sottosessione è session_01LJTSfiwiWSRkNwwAHxW4pz, ramo
   claude/spec-draft-level1.
0b. **Il runtime da riga di comando**, in [runtime/](../runtime/), ridotto al
   `resolved tree` (scelta di Alessio del 2026-10-21, in contesto.md,
   «Ordine di lavoro»). Lo ha scritto in TypeScript una sottosessione,
   session_01JKaTQnokvANPi9qrYbW1p9, sul ramo claude/runtime-level1, in
   cinque giri, ciascuno controllato da revisori indipendenti con prove,
   fuzz e un confronto con un'implementazione separata in Python. Passa i 43
   esempi della specifica, letti da specifica.md, e 71 casi di robustezza
   (`cd runtime && npm ci && npm test`). Il comando è `doc-runtime
   resolve-tree <cartella>`, con un nome provvisorio. Restano da guardare:
   - un errore di class su più righe (`![[id]]{.nota` a capo `.grande}`) dà
     tre diagnostic (embed-class-invalid, composition-content,
     embed-inline); forse ne basta uno;
   - ogni nodo di un capitolo ripete nel `resolved tree` il contenuto che
     include, quindi una catena lunga di capitoli esaurisce presto il limite
     di 100000 embed; il formato dell'albero potrebbe evitare le copie;
   - micromark è lento su un capoverso molto lungo con molte enfasi (limite
     noto, nel README del runtime).
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
4. **Il runtime da riga di comando**, scelto come primo prodotto il
   2026-10-21: la parte del `resolved tree` c'è (punto 0b). Restano l'HTML e
   il PDF, stampato con Playwright e un Chromium fissato.
   - HTML: le scelte di Alessio del 2026-10-22 sono in contesto.md («L'HTML
     esportato», «Le scelte visibili dell'HTML») e nella specifica. Il
     comando `export` (`doc-runtime export <cartella>`) c'è: l'ha scritto
     una sottosessione (session_01ToMUkc2ntsAgupUkrNCYxV) con un mandato
     snello, unito il 2026-10-22; 47 esempi, robustezza, suite dell'export e
     suite nel browser (`npm run test:browser`) verdi. Il README del runtime
     ha la mappatura e il disegno fisso; la specifica §11.4. Punti minori
     rimasti: un nome di font con caratteri di controllo C1 diventa U+FFFD;
     il ripiego `unreadable` delle immagini non ha un test (qui si gira come
     root); i limiti di Chromium (512 annidamenti, valori enormi) sono solo
     dichiarati.
   - I quattro difetti del foglio di partenza visti nel prototipo sono
     corretti (2026-10-22, contesto.md «Il foglio di partenza dopo il primo
     HTML»): spazio sotto tabelle, codice, immagini e righe di separazione;
     intestazione della tabella in grassetto; elenchi stretti senza spazio
     fra le voci; `display` a 2 decimali, con `--number-decimals` (esempio
     48).
   - I due temi dell'HTML ci sono (2026-10-22, contesto.md «Due temi per
     l'HTML»): un file che segue il tema di chi lo apre, `--theme light|dark`
     per fissarne uno, `@media (prefers-color-scheme: dark)` negli
     `stylesheet` per i colori scuri, `darkComputedStyle` nell'albero e
     l'avviso `dark-contrast-low`. 49 esempi passano.
   - L'HTML dell'`export` sarà anche l'anteprima della `composition`
     nell'`app` (contesto.md, stessa data): proposte dell'orchestratore da
     progettare con il `runtime` vivo.
   - Il PDF c'è (2026-10-23, contesto.md «Il PDF»): `doc-runtime print`, A4,
     margini di 2 cm, numero di pagina in basso al centro, tema chiaro,
     Chromium 141 fissato (playwright-core 1.56.1, dipendenza di
     produzione). I font di partenza (Source Serif 4, Source Sans 3, Source
     Code Pro, OFL, in `runtime/fonts/` con versioni e sha256) sono
     incorporati nel PDF e nell'HTML; l'HTML del documento d'esempio pesa
     ora circa 1,4 MB. Con questo il primo prodotto (albero, HTML, PDF senza
     app) è completo. Da sapere: il peso dei font va da 200 a 900; Chromium
     li mette nel PDF come Type 3, senza hinting; U+FFFD non è nei tre font e
     lo disegna un font del sistema; «Source» è un Reserved Font Name
     dell'OFL, quindi ridurre i font ai caratteri usati li rinomina, da
     decidere quando si farà.
   - `serve` c'è (2026-10-23, contesto.md «La strada verso l'app»):
     `doc-runtime serve <cartella>` tiene acceso il `runtime` su 127.0.0.1
     con un codice d'accesso, guarda i file e aggiorna l'anteprima nel
     browser senza ricaricarla; errori segnati e elencati in cima; immagini
     e font come indirizzi; `data-node` e `data-source` (la `source
     position`) su ogni elemento; specifica §11.6. Tempi: documento
     d'esempio 17 ms di ricalcolo, mille text circa 300 ms; dal
     salvataggio all'anteprima circa 80 ms. Un'immagine che non si incorpora
     ha nell'anteprima lo stesso ripiego dell'`export`.
   - Il `language server` c'è (2026-10-23): `doc-runtime language-server`
     su stdio, con diagnostic al punto giusto, completamento degli id dopo
     `[[` e `![[`, definizione, hover (con il valore delle righe di calcolo)
     e riferimenti; i buffer aperti contano prima di salvarli. Il client per
     VS Code è in `editors/vscode` (`npm run package` produce il .vsix); non
     è stato provato in VS Code vero. Nucleo acceso comune a `serve` in
     `runtime/src/live.ts`: il nome «live» può confondersi con il `live
     export`, da rivedere. vscode-languageclient porta minimatch con
     licenza Blue Oak 1.0.0, permissiva. Solo lettura: rinomina ed
     «estrai in un oggetto» aspettano le scelte sulla creazione degli
     oggetti. Il `runtime` che scrive c'è (2026-10-23, contesto.md «Creazione degli
     oggetti e file»): i `multi-object file` con la `attribute line`
     (§0.18), `doc-runtime format` (§11.8) e le operazioni `create`,
     `extract`, `rename`, `move` con `--dry-run` (§11.9); nel `language
     server` rinomina ed «Estrai in un oggetto». Aperti: `tags` nelle
     `attribute line` (la sottosessione non lo scrive se è vuoto, contro
     «tags è sempre scritto»: domanda ad Alessio); il nome del file dei
     testi (oggi `<nome>-texts.text.md`); l'id dalle prime parole può
     finire con una parola corta («il-prossimo-incontro-sara-a»).
     Il guscio dell'`app` c'è (2026-10-23, contesto.md «Il guscio
     dell'app»): `app/`, Electron, navigator per shelf con ricerca, editor
     CodeMirror 6 con i servizi del `language server`, anteprima che si
     aggiorna dal buffer non salvato, clic sull'anteprima che porta alla
     riga del sorgente, salvataggio dal `formatter`, «Estrai in un oggetto».
     Si lancia con `cd app && npm ci && npm start`; test di unità e un
     end-to-end (qui con `xvfb-run -a npm run test:e2e`). Un motore solo
     (2026-10-24): Electron 44.9.3 (Chromium 152, Node 24) per l'`app`, per
     la stampa (`print` lancia Electron, headless su Linux) e per i test;
     npm audit senza vulnerabilità. La 44.9.3 ha meno di due settimane, ma
     corregge un avviso grave della 44.7.0. L'`app` chiede di salvare
     quando si cambia file o si chiude. Mancano: più file aperti, la
     rinomina dall'interfaccia, il pacchetto firmato.
   - Il canvas c'è (2026-10-29, contesto.md «Il canvas», con le
     raccomandazioni dell'orchestratore da confermare): l'`app` si apre sul
     foglio (`foglio.canvas` in JSON Canvas, con descrittore); le `card`
     mostrano l'oggetto e un clic apre il sorgente; doppio clic crea un
     testo (in `foglio-texts.text.md`); trascinare, archiviare, richiamare
     dal navigator; «Metti in sequenza» fa un `article` con `compose`. Nel
     runtime `create --at`, `place`, `archive`, `recall`, `compose`. Lo
     stesso oggetto può avere più schede (deciso; `place` e `archive` con
     `--card`). Da confermare con Alessio: tutto ciò che non è sul foglio
     conta come archiviato;
     l'`article` di `compose` va accanto al descrittore del canvas. Una
     scheda di un `image` punta al descrittore, non all'immagine: in
     Obsidian si vedrebbe il descrittore. Mettere ordine c'è (2026-10-30,
     contesto.md «Mettere ordine sul canvas»): trova sul foglio, fare spazio
     senza sovrapposizioni e deterministico, `create --near`, `gather`,
     `arrange --by kind|tag` con i gruppi di JSON Canvas (chiave in più
     `arrange` nei gruppi creati da lui), `place --size`. Ogni scheda è resa da
     sola, con la numerazione che l'oggetto avrebbe da solo.
   - I dati e le `collection`, la classe 2 (2026-10-30, contesto.md «Dati e
     `collection`»): `schema` di Frictionless in YAML nel descrittore
     `<id>.collection.md`, file di dati TSV creati dal `runtime` (CSV letti),
     chiave facoltativa, ID dei `record` solo quando servono, forma lunga
     con `dimension` e `pivot` rimandati ai grafici, numeri a decimali fissi
     in colonna. Il primo passo c'è (unito il 2026-10-30, fa72cc1; la
     sottosessione session_01ToMUkc2ntsAgupUkrNCYxV): specifica §12 con
     gli esempi 52-55 (conf=2), lettura di TSV e CSV con i `diagnostic`
     collection-* nel file di dati, la tabella nell'albero (table, tableRow,
     tableCell, ogni cella con `value` e la stringa da mostrare), nell'HTML,
     nel PDF, nell'anteprima e nelle schede; `create collection --field`,
     `turn-into` da un text o da uno scratch, anche come azione
     nell'editor; nell'`app` uno shelf, il pulsante «Dati» che apre il TSV
     con le tabulazioni visibili, e il clic su una riga dell'anteprima che
     porta alla riga del TSV. La descrizione sta in un caption nascosto,
     per gli screen reader. Limiti: 16 MiB e 100 000 record per file.
     Una collection non entra in un multi-object file. Visto nella
     verifica, da decidere o sistemare:
     - `turn-into` perde in silenzio la formattazione nelle celle
       («**rinvio**» diventa «rinvio») e l'allineamento scritto nella
       tabellina; si vede solo nel diff di `--dry-run`;
     - i `name` dei campi sono le intestazioni come scritte («Mese»), senza
       un `title` a parte;
     - in `it` le migliaia si raggruppano da cinque cifre (CLDR), quindi
       nella stessa colonna «9875,26» sta sotto «21.300,00»;
     - la descrizione non arriva nel PDF: servirebbe un PDF con i tag;
     - nel TSV le colonne non si allineano quando un valore è lungo: lo
       risolverà la `grid`;
     - nel navigator l'etichetta di una collection unisce descrizione e
       testo della tabella;
     - un suggerimento dice «scrivi un valore number», con il nome inglese
       del tipo.
     Le prime tre sono decise (contesto.md, stessa voce, «Poi, dopo la
     verifica del primo passo»): avviso e si procede; `name` ricavato come
     l'`id` e `title` uguale all'intestazione; in colonna il separatore
     delle migliaia o in tutti i valori o in nessuno. Fatte, con i due
     difetti minori, e c'è la `grid` modificabile (unita il 2026-10-30;
     specifica §12.6 «Scrivere i dati», README dell'app): si apre con la
     collection, interruttore «Testo»/«Griglia», virgola decimale che nel
     file diventa punto, valori sbagliati tenuti e segnati, menu delle
     categorie, casella per i boolean, tastiera da foglio di calcolo, copia
     e incolla di blocchi TSV, record e campi da aggiungere, togliere e
     spostare, annulla e ripeti, salvataggio con il flusso dell'editor.
     Il comportamento è una proposta dell'orchestratore, da confermare con
     Alessio. Scelte della sottosessione: tabulazione e a capo in un valore
     diventano spazio; cambiando tipo cadono le chiavi che il tipo nuovo non
     ha; togliere un campo lo toglie da primaryKey. Rimandata la grid dentro
     le schede del canvas. Misura con 100 000 record (`npm run
     measure:grid` in app/, ripetuta dall'orchestratore): apertura 1,6 s,
     scorrimento 18 ms per frame (peggiore 32), modifica 0,3 s. Aperto:
     l'anteprima di un `article` che include una tabella di 100 000 record
     arriva in 80 s, con ricalcoli di 8-9 s; proposta della sottosessione:
     nell'anteprima solo le prime righe, la tabella intera in `export` e
     `print`. Decisa così da Alessio (contesto.md, «Dati e `collection`»,
     «Poi, dopo la `grid`»), che ha confermato anche la `grid` com'è e ha
     chiesto di svecchiare l'aspetto dell'`app` («sembra un'app anni 80»).
     Fatti e uniti (2026-10-30): il limite di righe (1000 nell'anteprima, 20
     in una scheda, «… altri N record»; `export` e `print` intere; §11.6 e
     §12.4) e il ricalcolo più veloce (la cascata degli stili calcolata una
     volta per forma di nodo). Misure dell'orchestratore con 100 000
     record: ricalcolo dell'anteprima 0,6-1,4 s (`npm run measure:records`
     in runtime/, `npm run measure:grid` in app/), anteprima dell'articolo
     2,3 s (prima 80 s). Resta: l'`export` di 100 000 record pesa 179 MB e
     richiede circa 30 s, per lo stile inline su ogni cella; ridurlo vuol
     dire classi al posto dello stile inline, un cambio del §11.4.
     L'aspetto dell'`app` è deciso e fatto (2026-10-30, contesto.md,
     orientamento sull'aspetto dell'`app`): dopo tre direzioni di soli
     colori («sembrano solo colori leggermente diversi») e tre diverse nella
     disposizione, Alessio ha scelto studio con le evidenziazioni di
     lavagna. Fondo tinto; navigator, barre, canvas, editor, grid e
     anteprima come superfici fisse e arrotondate separate da 8 px; il file
     come percorso «tipo › id»; canvas uniforme; evidenziazioni e casella di
     ricerca a rettangoli con angoli di 6 px. Inter 4.1 (OFL) e icone Lucide
     1.65.0 (ISC) in app/assets/; il contrasto dei token è un test di unità
     (tutte le coppie almeno 4,5:1). Nessuna variante resta nel codice. Il
     riquadro degli errori dell'anteprima ora si legge anche in scuro. Nelle
     immagini in headless il tema scuro arriva solo con emulateMedia, e
     l'anteprima, vista separata, va composta a parte.
     I caratteri dell'`app` (2026-10-31, contesto.md, «I caratteri
     dell'`app`»; misure in ricerca/caratteri-app.md): interfaccia in
     Figtree a peso 475 (pesi forti 575, 675, 775), testo dell'editor per i
     file .<kind>.md in Petrona a 470 e 16,55 px, tutti e due con
     spaziatura +0,01 em; dati e stylesheet in monospazio; Inter tolto.
     Font da google/fonts (commit 6c1dbe27), woff2 con sha256 e OFL in
     app/assets/. L'anteprima si stacca in una finestra sua (contesto.md,
     «L'anteprima in una finestra separata»): pulsante «Stacca», «Riporta»
     o chiusura per rimetterla nella pagina, segue le modifiche non
     salvate, il clic porta l'editor alla riga, resta visibile sul canvas;
     posizione e schermo in userData/state.json, con il ritorno sullo
     schermo principale se quello salvato manca (placeWindow, soglia di
     120 × 80 px scelta dalla sottosessione). Non verificato dall'e2e: il
     fuoco dato alla finestra principale dopo il clic. Visto: con
     l'anteprima staccata le righe dell'editor diventano molto lunghe.
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
