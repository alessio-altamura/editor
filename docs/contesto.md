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
    aritmetica decimale. Precisazione di Alessio, lo stesso giorno: nel file
    solo cifre e il punto per i decimali, «unità.decimali». Nell'app un
    italiano scrive come è abituato (virgola decimale, punto delle migliaia),
    e l'app salva nel file la forma con il punto. Suffissi di scala (K, M, T),
    confermato da Alessio: nel file il numero pieno o la notazione
    scientifica (`1.2e6`); nell'app «1,2M» si scrive e viene tradotto; «1,2 M»
    come modo di mostrare un numero è una scelta di stile, da fuori;
  - conseguenze dell'ottavo giro della bozza (2026-10-21, «ok a tutto»):
    - un `[[id]]` senza testo mostra il titolo dell'oggetto collegato, se ne
      ha uno; altrimenti l'`id`, con un avviso che suggerisce `[[id|testo]]`;
    - gli `stylesheet` possono agganciarsi anche a pochi tipi in linea, con
      nomi fissati ora: collegamento, enfasi, forte, codice;
    - la `class` sta sia sull'oggetto (cos'è, sempre) sia sull'`embed` nella
      composizione (come appare lì); in conflitto vince quella della
      composizione;
    - `tags` è sempre scritto: il `formatter` scrive `tags: []` quando manca;
    - il file `document` è uno e uno solo, e il `runtime` lo crea se manca;
    - i numeri a schermo seguono la lingua dell'oggetto, altrimenti quella
      del documento;
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
    solo per documento; porta la lingua del documento e la versione della
    specifica (così era scritto nel suggerimento approvato); un oggetto dentro un capoverso per ora non è ammesso
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
  - Testo di un collegamento verso un capitolo o un'immagine numerati (§0.14
    della bozza, 2026-10-21, idea di Alessio, poi «si si perfetto»): il
    testo lo scrive chi scrive, dove mette il collegamento,
    `[[cap-vendite|vendite]]`; senza testo vale il titolo, come già deciso.
    Il numero compare solo dove chi scrive lo chiede con un segnaposto nel
    testo, per esempio `[[lavagna|figura {n}]]`, e lo mette il `runtime` con
    il numero calcolato nel documento che include il testo. Cadono le
    opzioni B, C e D della bozza e la E proposta dall'orchestratore (forma
    scelta dallo stylesheet). Restano da proporre il nome del segnaposto e
    cosa si mostra quando il numero non c'è, per esempio nel testo da solo.
  - Dove si scrive la `class` che un documento dà a un oggetto incluso (§0.15
    della bozza, 2026-10-21, «ok C»): accanto all'inclusione, nel corpo,
    `![[calo-q3-sintesi]]{.nota}`, più `class` come `{.nota .grande}`; la
    forma `{.…}`, presa da Pandoc, era nel suggerimento approvato. Quindi la
    sintassi dei file di testo si allarga di questo solo segno, subito dopo
    un `![[id]]`, e l'intestazione resta a sole stringhe e liste. Lo stesso
    oggetto incluso due volte può avere due `class` diverse. Cadono la mappa
    `embed-class` nell'intestazione e le sue regole (chiavi riscritte alle
    fusioni, chiavi inutilizzate o ritirate, mappe in conflitto). Costo
    accettato: il documento non dà una `class` a un oggetto dentro un
    capitolo annidato, ma la dà al capitolo intero.
  - Aspetto dei titoli (§0.16 della bozza, 2026-10-21, «A»): lo
    `stylesheet` di un documento può colpire i titoli dei capitoli, per
    grado, con tre nomi come h1-h3 in HTML: `title-1`, `title-2`, `title-3`
    (il grado 3 e quelli sotto), che usa anche il foglio di partenza; i nomi
    erano nel suggerimento approvato. È il primo tipo di blocco fra quelli
    agganciabili. La regola vale per tutti i titoli di quel grado nel
    documento. Non deciso: un titolo diverso per un solo capitolo (il titolo
    prende le `class` del suo capitolo, `title-1.compatto`); l'orchestratore
    ha suggerito di rimandarlo, perché si aggiunge dopo senza rompere niente.
  - Ricorsione (2026-10-21, Alessio, dopo che il controllo del runtime ha
    trovato un oggetto che include sé stesso): un oggetto può contenere sé
    stesso solo se lo abilita, con un limite, infinito, oppure una regola di
    uscita; vale anche per le formule; se non la abilita, per quell'oggetto la
    ricorsione non si può fare. Si abilita con «un tag in più opzionale».
    Lettura dell'orchestratore, da confermare: è un attributo opzionale con
    un valore nell'intestazione (per esempio `recursion: 3` o `recursion:
    infinite`), non una voce di `tags`, perché porta un valore. Proposte
    dell'orchestratore: per un'inclusione infinita il `resolved tree` segna il
    punto in cui l'oggetto torna e chi disegna sceglie fino a che profondità
    disegnare, come vuole l'impaginazione da fuori (superata il 2026-10-22
    dalla scelta 5 delle scelte visibili dell'HTML: chi disegna non lo
    ripete); per una formula infinita
    il `runtime` tiene comunque un limite di sicurezza, perché il documento
    deve risolversi in un tempo finito; la regola di uscita richiede le
    formule, quindi arriva con loro; in un ciclo fra più oggetti ciascuno deve
    abilitarla.
  - Nomi del prodotto (2026-10-21/22, Alessio). Il criterio cercato: un
    nome che entri nel lessico delle persone e si possa riusare nell'app,
    «dammi un xxxx», al posto dell'oggetto o dell'aggregatore; ispirato a
    opere giapponesi poco note (ID-Zero condivide il nome con l'anime ID-0).
    Alessio aveva proposto una famiglia: Kamii (da *kami*, 紙, carta) per
    l'app e per il primo canvas dove si creano gli oggetti, kumi (組み) per la
    composizione, tsumi, zumi o seki per il mattone. Poi, temendo nomi troppo
    giapponesi («id-zero è più internazionale»), ha deciso: «lascia solo
    Kamii per ora, non so ancora bene se mi piace, tienila solo come nome del
    progetto». Quindi Kamii è il nome provvisorio del progetto; i concetti
    restano `object`, `composition` e `canvas`, e kumi, seki, tsumi e zumi non
    si usano. Il comando del runtime resta per ora `doc-runtime`. Prima erano
    state cercate e scartate altre proposte (frol, tesso, tarsia, patema e
    altre), con i controlli su npm, comandi e omonimi.
    Report: [ricerca/nomi-del-prodotto.md](ricerca/nomi-del-prodotto.md).
    Seconda ricerca (2026-10-23, stesso report). Per la parola dell'`app`
    che indica i mattoni Alessio aveva detto «jot mi piace», poi, nella
    sessione dei nomi, «anche jot forse non mi piace, che cosa c'entra con un
    dataset o con una funzione»: jot non è scelto. Scartati anche brano
    («non lo capisco») e rensei («mi sa del politico italiano Renzi»).
    Orientamento di Alessio: la parola del mattone è corta, non descrive il
    contenuto e prende senso con l'uso, come «tweet»; il nome dell'`app` va
    d'accordo con quello del mattone o del `canvas`, o è lo stesso. Il terzo
    giro della sessione dei nomi ha trovato, solo nella banca dati USPTO, che
    kami e gami sono marchi vivi nel software e che anche KAMII è un marchio
    vivo in classe 9 (custodie di cellulari); marchi UE e italiani non
    controllati. Le proposte di quel giro (orri, keping, lappu, jogak,
    madang, shard) sono nel report, con gli omonimi web non verificati.
    Il nome del prodotto resta Kamii, provvisorio, e la parola del mattone è
    aperta. Esito della giornata nella sessione dei nomi, riferito da quella
    sessione: «per ora nessuno mi convince». Scartati anche orri («orrido»),
    hoseki («non mi piace»), orichalt (contiene «halt») e i composti con jot
    (Jotform è già troppo diffuso). Criteri chiariti: la parola del mattone
    vale per ogni tipo di mattone, testo, dati e funzioni; di ID-Zero ad
    Alessio piace che sia diretto e che abbia un legame con il Giappone e i
    manga che chi non li conosce non vede, ma lo «zero» non va imitato.
    Candidati ancora in piedi, non scelti: musubime, planetes, panfolio,
    fleta; per il mattone seki, musubi, monade. Il 2026-10-25, sempre nella
    sessione dei nomi: «Zakuro non mi dispiace», «teniamolo presente»
    (柘榴, melograno), come nome dell'`app`; orientamento, non decisione.
    Accanto, per il mattone, la sessione propone tsubu (粒, chicco). Nel
    report i controlli; marchi UE e italiani non controllati. Il 2026-10-28
    Alessio propone «zakurogami», poi «o kurogami»: proposte, non scelte.
    Controlli dell'orchestratore, lo stesso giorno: tutti e due liberi su
    npm (anche -cli), PyPI e crates.io, nessun comando; una ricerca web non
    trova software con questi nomi. Marchi non ancora controllati.
    Il 2026-10-29 (Alessio, «zakurogami mi piace ma è lungo», poi «A va
    bene, registralo»): **Zakurogami** è il candidato principale per il nome
    del prodotto. *-gami* si legge sia carta (紙, come in origami) sia
    spirito (神, come in shinigami): «carta di melograno», «spirito del
    melograno»; il melograno è l'attributo di Kishimojin. Per esteso nel
    marchio, nel logo e nel dominio; nell'uso quotidiano «Zakuro»; il
    comando sarà `zakuro`, installato dal pacchetto npm `zakurogami`, come
    Visual Studio Code ha il comando `code`. Prima di renderlo definitivo,
    e di rinominare `doc-runtime`, vanno controllati i marchi. Subito dopo
    Alessio riferisce il parere della moglie: «troppo lungo, giapponese…
    non facile da ricordare». Il candidato resta da confermare.
  - Numerazione dei capitoli che si ripetono per ricorsione (2026-10-22,
    Alessio, «sì va bene 1, 1.1, 1.1.1»): ogni ripetizione con un title prende
    un numero nuovo, come un capitolo annidato.
  - L'HTML esportato (2026-10-22, Alessio, «1A 2A»). Un solo file `.html`
    per `composition`, con il CSS dentro e le immagini incorporate: si manda
    e si apre ovunque, ed è lo stesso file che Chromium stampa in PDF. Una
    cartella con le immagini accanto si aggiunge se servirà, per esempio per
    un sito. Il numero di un capitolo si vede davanti al suo titolo, «1 Le
    vendite», «1.1 Il calo», come in LaTeX, coerente con i `cross-ref` che
    scrivono «capitolo 1». Scartati il numero solo nei `cross-ref`, come in
    Word, e una proprietà per spegnerlo, che si potrà aggiungere dopo.
    Conseguenze di decisioni già prese, notate dall'orchestratore: l'HTML
    legge il `resolved tree` senza ricalcolare; la norma è l'albero, quindi
    l'HTML del `runtime` è un `renderer` di riferimento, non normativo; nella
    classe 1 non ci sono input, quindi l'HTML è statico, con i valori
    fotografati. Non deciso: una didascalia visibile per le immagini, il cui
    numero per ora serve solo ai `cross-ref`.
  - Le scelte visibili dell'HTML (2026-10-22, Alessio, «1B 2 risultato con
    formula come tooltip 3B 4B 5A 6B 7B»), poste dall'orchestratore dopo una
    revisione del mandato del `renderer`:
    1. Con un errore nel documento l'`export` si rifiuta, come proponeva la
       bozza; con un'opzione esplicita l'HTML esce lo stesso, come anteprima,
       con i pezzi mancanti segnati.
    2. Nell'HTML una riga di calcolo mostra il risultato, e la sua
       espressione si vede come tooltip.
    3. L'allineamento delle colonne scritto nella tabella (`|:--|--:|`) conta,
       come su GitHub, e lo calcola il `runtime` nello stile delle celle.
    4. Un blocco di codice senza `eval` si vede sempre; uno con `eval` si vede
       solo se ha anche `echo`. Nella classe 1 `eval` non esegue niente,
       quindi un blocco con `eval` e senza `echo` non compare.
    5. Dove un capitolo con `recursion: infinite` torna dentro sé stesso non
       si disegna niente: il capitolo compare una volta. Il `renderer` non
       può ripeterlo, perché ogni ripetizione prende un numero nuovo, che
       calcola il `runtime`.
    6. Il titolo dell'`article` si vede in cima alla pagina, come nodo del
       `resolved tree` con una regola nel foglio di partenza; prima era solo
       un metadato.
    7. I collegamenti sono sottolineati: la sottolineatura entra nel foglio di
       partenza come proprietà del sottoinsieme, così uno `stylesheet` la può
       togliere. Il motivo: il blu del foglio di partenza ha un contrasto di
       2,54:1 con il testo nero, sotto il 3:1 che le linee guida WCAG
       chiedono quando un collegamento si distingue solo per il colore.
  - Il foglio di partenza dopo il primo HTML (2026-10-22, Alessio, «1A 2A
    3A»), su tre difetti visti nel documento d'esempio esportato:
    1. L'intestazione di una tabella è in grassetto, e la calcola il
       `runtime` come l'allineamento delle colonne.
    2. Un elenco stretto (voci senza riga vuota fra loro, come in CommonMark)
       non ha spazio fra le voci; uno largo sì.
    3. Il risultato di una riga di calcolo si mostra con al massimo due
       decimali; una proprietà dello `stylesheet` cambia il massimo, come
       `--number-notation` cambia la forma. Il valore esatto resta
       nell'albero.
    Il quarto difetto, tabelle, immagini e codice attaccati al blocco sotto,
    l'orchestratore lo ha trattato come tecnico: prendono sotto lo stesso
    spazio di un capoverso.
  - Due temi per l'HTML (2026-10-22, Alessio, «possiamo prevedere comunque
    i due temi per HTML?», poi «1C 2C»), dopo che l'HTML esportato non si
    leggeva in un visore a tema scuro:
    1. Un solo file HTML con il tema chiaro e quello scuro, che segue il tema
       di chi lo apre; un'opzione dell'`export` ne fissa uno. Un pulsante
       nella pagina chiederebbe uno script, che la pagina vieta.
    2. Uno `stylesheet` può dare colori diversi per il tema scuro, con
       `@media (prefers-color-scheme: dark)`; dove non li dà, il colore resta
       quello del tema chiaro, e il `runtime` avvisa quando nel tema scuro un
       colore ha poco contrasto.
    Lettura dell'orchestratore, data insieme alla domanda: nel tema scuro
    cambiano solo i colori (testo, collegamenti, linee, sfondo della pagina),
    non misure e margini; il foglio di partenza ha una variante scura; il PDF
    resta chiaro, perché è carta.
  - L'HTML dell'`export` sarà usato anche come anteprima della
    `composition` nell'`app` (2026-10-22, Alessio, «ma questo export poi sarà
    usato anche come anteprima del composition»). Coerente con le decisioni
    sull'anteprima HTML e sull'editing grafico sopra l'anteprima. Proposte
    dell'orchestratore, non decise: un solo `renderer` con due uscite, il
    file dell'`export` e la `preview`, con la stessa mappatura e gli stessi
    stili, così l'anteprima è quello che si esporta. Nella `preview` cambia
    solo il contorno: gli errori si vedono segnati, come con
    `--allow-errors`; le immagini sono riferimenti invece che incorporate,
    per la velocità; ogni elemento porta l'id del suo nodo e la posizione
    nel sorgente, per l'editing grafico e per tornare al testo; un
    collegamento a un oggetto fuori dalla pagina lo apre nell'`app`; la
    sicurezza la decide l'`app`, non una CSP nel file; il tema è quello
    dell'`app`. Si progetta insieme al `runtime` vivo, che aggiorna l'albero
    a ogni modifica.
  - Il PDF (2026-10-22, Alessio, «ok come raccomandato» sulle tre scelte
    poste dall'orchestratore):
    1. Pagina A4 con margini di 2 cm su tutti i lati, fissi nella stampa,
       finché la pagina non entra nella specifica (con `@page`, insieme alla
       vista per pagina).
    2. Il numero di pagina in basso al centro: «1», «2»…
    3. Il `runtime` porta tre font aperti, con licenza OFL, per `serif`,
       `sans-serif` e `monospace`, e li usa sia nel PDF sia nell'HTML: stesso
       aspetto ovunque, e anteprima uguale alla stampa. Costo accettato: un
       HTML più pesante, da ridurre poi incorporando solo i caratteri usati.
    Fissati dall'orchestratore: il comando `print`, il PDF sempre nel tema
    chiaro, il rifiuto con errori come per l'`export`, un Chromium di
    versione fissata.
  - La strada verso l'app (2026-10-23, Alessio, «tutto perfetto, bene»,
    sulla visione proposta dall'orchestratore). Un solo `runtime` al
    centro, con quattro client che trovano le stesse operazioni: la `cli`,
    l'`app`, gli editor di testo via LSP, gli agenti via MCP. L'`app` in
    HTML e TypeScript, con due involucri: sul desktop e nel browser, con il
    `runtime` su un server; per il desktop l'orchestratore consiglia
    Electron, che porta lo stesso Chromium della stampa, ed è da decidere
    quando si farà il guscio dell'`app`. Dentro l'`app` quattro viste sugli
    stessi oggetti: il sorgente, l'anteprima, l'editing grafico sopra
    l'anteprima, il foglio bianco. Ordine dei passi: `serve` con
    l'anteprima che si aggiorna; LSP; il `runtime` che scrive (operazioni e
    `formatter`); il guscio dell'`app` con sorgente e anteprima; editing
    grafico e foglio bianco; le classi successive intrecciate con questi
    ultimi due. Per il primo passo valgono le due raccomandazioni date con
    la visione, lette come approvate da «tutto perfetto»: `doc-runtime
    serve <cartella>` con l'anteprima nel browser che si aggiorna mentre si
    scrive con un editor qualsiasi; gli errori segnati nella pagina e
    elencati in cima, con file, problema e suggerimento.
  - Il guscio dell'`app` (2026-10-23, Alessio, «1A 2C»): sul desktop
    Electron, che porta Node, il linguaggio del `runtime`, e Chromium,
    così l'anteprima coincide con la stampa; il primo guscio ha sorgente e
    anteprima affiancate, la lista a fianco divisa per tipo, e il clic su un
    punto dell'anteprima porta alla riga giusta del sorgente. Scelte
    tecniche dell'orchestratore: CodeMirror 6 per il testo, il codice in
    `app/`, il tema del sistema, `npm start` per lanciarla; il pacchetto
    firmato viene dopo.
  - Il canvas (2026-10-29). Alessio: «lascia stare per ora, continuiamo con
    l'implementazione», senza rispondere alle tre scelte poste
    dall'orchestratore; l'orchestratore procede con le sue raccomandazioni,
    da confermare: nel primo passo le basi (schede degli oggetti, spostarle,
    zoom e scorrimento, creare un testo con un doppio clic, `archive` e
    `recall`) più «metti in sequenza», che fa di alcune schede un
    `article` in quell'ordine; le posizioni nelle coordinate di JSON Canvas,
    le relazioni dopo, con «fai spazio vicino»; la scheda mostra l'oggetto
    come apparirà, e un clic apre il sorgente nella scheda. L'editing
    grafico sopra l'anteprima viene dopo la vista per pagina, come deciso.
    Dopo il primo canvas (2026-10-29), sulla lettura «un oggetto sta sul
    foglio una volta sola», Alessio: «non serve, perché posso ritrascinarlo
    sul foglio quando voglio». Quindi lo stesso oggetto può avere più
    schede sul foglio, tutte lo stesso oggetto e non copie: trascinarlo di
    nuovo aggiunge una scheda, archiviare toglie solo quella scelta, e
    l'oggetto è sul foglio finché ne resta una. Le altre due letture
    confermate il 2026-10-30 («ok vanno bene»): tutto ciò che non è sul
    foglio conta come archiviato; l'`article` di `compose` va accanto al
    descrittore del canvas. Le raccomandazioni del primo canvas valgono
    quindi come accettate.
    Poi (2026-10-24, Alessio, «ok» sulla strada A): non esiste un Electron
    con il Chromium 141 della stampa, e l'Electron più vicino (39) non è più
    supportato e ha avvisi di sicurezza; quindi un Electron supportato, e la
    stampa la fa Electron stesso invece del Chromium di Playwright. Un
    motore solo, quello di Electron, per anteprima, `app`, PDF e test, e il
    `print browser` è il suo Chromium.
  - Creazione degli oggetti e file (2026-10-23, Alessio, «1A, 2A, 3A, 4D»):
    1. Un capoverso scritto direttamente in una `composition` resta un
       errore, con una correzione automatica, «estrai in un oggetto», che crea
       l'oggetto; si lancia dalla `cli`, dal `language server` e dall'`app`.
    2. L'`id` di un oggetto nuovo si ricava dalle prime parole
       («le-vendite-sono-calate») e si può cambiare.
    3. Un file può contenere più oggetti dello stesso tipo; un file per
       oggetto resta valido, e il `runtime` sposta un oggetto da un file
       all'altro senza cambiarne l'identità. Il file è solo un contenitore,
       senza significato né ordine.
    4. I testi nati scrivendo una pagina vanno in un file solo accanto alla
       `composition` (per esempio `report-q3.texts.md`), le immagini nella
       cartella della `composition`.
    Poi, sulla domanda di Alessio se i metadati di ogni oggetto si vedono su
    GitHub («ok visibili»): si vedono, con una riga breve fra parentesi
    graffe nella famiglia di `![[id]]{.nota}`, non nascosti in un commento
    HTML. La forma (Alessio, «A», sul confronto di due forme rese come su
    GitHub): una riga prima di ogni oggetto, per esempio
    `{#calo-q3-sintesi .evidenza}`, una riga vuota, poi il contenuto; la
    stessa regola per capoversi, elenchi, tabelle e codice. Il file comincia
    con un'intestazione con il solo `kind`, senza `id`. Dentro le graffe `#`
    per l'`id`, `.` per la `class`, `chiave=valore` per gli altri
    attributi; la forma di `tags`, che è una lista, è da fissare.
    Poi, dopo il runtime che scrive (2026-10-23, Alessio, «1B, 2 il primo, 3
    ok»): nella `attribute line` `tags` si scrive solo quando non è vuota,
    un'eccezione a «`tags` è sempre scritto», che resta per i file con un
    oggetto solo; il file dei testi di una `composition` si chiama
    `<nome>-texts.text.md` (per esempio `report-q3-texts.text.md`); l'`id`
    ricavato dalle prime parole perde in fondo articoli e preposizioni
    («il-prossimo-incontro-sara», non «il-prossimo-incontro-sara-a»).

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

- Creazione semplificata degli oggetti (2026-10-23): non solo dal foglio
  bianco, ma anche da una pagina mentre si scrive e da una `slide` mentre si
  fa la presentazione. Da precisare con il `runtime` che scrive e con
  l'`app`. Alessio, poco dopo: il `canvas` serve soprattutto quando non si
  sa ancora cosa si farà e si parte da idee alla rinfusa; per scrivere un
  articolo si può essere ordinati, in una pagina. E forse serve ordinare
  gli oggetti sul `canvas`. Precisato da Alessio: tutte e due le cose,
  riordinarli e metterli in sequenza perché diventino una `composition`.
  «Immagina una lavagna: scrivi le cose, ma su una lavagna grande a un certo
  punto non riesci a trovarle». Servono: fare spazio per mettere il
  prossimo pensiero vicino a quelli con cui ha a che fare, un po' come la
  vista a grafo di Obsidian, ma come idea e non come disegno; dire «metti in
  ordine per tipo»; spostare a mano. Da progettare con l'editing grafico e
  il foglio bianco. Nota dell'orchestratore: riordinare riscrive molte
  posizioni nel file del `canvas`, quindi va ripresa la proposta del layout
  a vincoli invece delle coordinate assolute, per non sporcare i diff.


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

Il 2026-10-21, a bozza di specifica finita, Alessio ha scelto di partire dal
runtime da riga di comando («ok 4», sul quarto dei prossimi passi di
[handoff.md](handoff.md)), ridotto all'essenziale come proposto
dall'orchestratore: legge la cartella del documento e scrive il `resolved
tree`, finché i 35 esempi della bozza passano. In TypeScript, come deciso.
HTML, PDF, formatter e corpus vengono dopo. Così il motore arriva prima del
formatter e del corpus, al contrario dell'ordine qui sopra; i tipi del
modello per testo e capitoli li dà già la bozza, per tabella, vista e slide
il modello resta da fare.
