# Collegamenti che si rompono e collegamenti semantici

Ricerca del 2026-10-20 sulla domanda di Alessio. I collegamenti per id, cioè
meccanici, si possono rompere: si può aggiungere un collegamento generato in
automatico per semantica? Quanto è semplice?

La ricerca ha quattro angoli:
- come gli altri sistemi tengono e riparano i collegamenti;
- quali strumenti propongono collegamenti per significato;
- quanto costa calcolare la somiglianza in locale, nel runtime TypeScript;
- quanto è buono il collegamento automatico, misurato.

Un verificatore separato ha ricontrollato ogni fatto sulla fonte primaria. Dove
il controllo ha corretto, qui c'è la versione corretta. Le misure locali sono
state fatte durante la ricerca e ripetute per questa nota; gli script sono in
[misure/embedding/](misure/embedding/).

## In sintesi

- **Generare suggerimenti per significato è semplice e costa poco.**
  - Un modello multilingue che copre l'italiano pesa circa 100 MB.
  - Su CPU elabora un capoverso breve in circa 4 ms, e gira sia in Node sia
    nel browser con transformers.js.
  - Diecimila oggetti occupano circa 15 MB di vettori, e una ricerca su tutti
    richiede pochi millisecondi.
- **Non può sostituire il collegamento per id.** I motivi misurati sono tre:
  - non è deterministico: gli stessi testi danno vettori diversi su backend
    diversi, e le soglie cambiano da un modello all'altro;
  - non vede la negazione e i numeri, quindi «le vendite calano» e «le vendite
    crescono» risultano vicine;
  - anche il sistema in produzione meglio documentato sbaglia spesso quando
    propone collegamenti nuovi: Add a link di Wikipedia ha precisione 0,84 e recall
    0,46 sulla Wikipedia italiana.
- **Nessuno degli strumenti esaminati scrive da solo collegamenti semantici
  nei file.** Li mostrano come vista calcolata da un indice separato, e il
  collegamento entra nel file solo con un gesto dell'utente.
- **La semantica rende bene quando deve scegliere fra pochi candidati.** La
  disambiguazione arriva a F 97, la scoperta di collegamenti nuovi a F 74.
  Ritrovare il bersaglio di un collegamento rotto somiglia più alla prima che
  alla seconda (è un'inferenza, non una misura).
- **Quasi tutte le rotture hanno una soluzione meccanica e deterministica:**
  l'id scritto dentro il file, la rinomina fatta dal runtime, l'id tolto alle
  copie, un controllo dopo ogni merge.
- **Il modello che regge è la ridondanza.** Accanto all'id si salva una piccola
  impronta del contenuto collegato, cioè poche parole o una citazione. Il
  collegamento si risolve prima per id e poi per impronta. Se non basta, resta
  visibile come orfano e si chiede all'autore. È lo schema dei robust
  hyperlinks di Phelps e Wilensky, del Web Annotation Data Model del W3C, di
  Hypothesis e di Swimm.
- **Il guasto peggiore è il collegamento che si risolve ma non dice più la
  stessa cosa, non quello rotto.** Negli studi sulle citazioni il contenuto
  cambiato è quasi tre volte più frequente del collegamento rotto. Si rileva
  molto meglio al momento della modifica, con il diff, che dopo.

## Come si rompe un collegamento, e cosa fanno gli altri

### Rinomina e spostamento

- **Git** non registra le rinomine. `git mv` equivale a cancellare e
  aggiungere, e la rinomina si ricava dopo dalla somiglianza del contenuto, con
  soglia predefinita del 50%
  ([libro](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository),
  [git diff](https://git-scm.com/docs/git-diff)). La somiglianza è un conteggio
  di pezzi, cioè righe o blocchi di 64 byte, senza semantica
  ([diffcore-delta.c](https://github.com/git/git/blob/47fdf2208c5b94c8cc01c106b8f7c85efb91c926/diffcore-delta.c#L4-L20)).
  Nei merge la strategia ort la attiva per default
  ([merge-strategies](https://git-scm.com/docs/merge-strategies)).
- **LSP** non ha un evento di rinomina per i file osservati, ma solo Created,
  Changed e Deleted. `workspace/willRenameFiles` parte solo se la rinomina
  avviene dentro il client
  ([LSP 3.18](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#workspace_didChangeWatchedFiles)).
- **Obsidian** aggiorna i collegamenti quando la rinomina passa dall'app
  ([help](https://obsidian.md/help/links)). Nella sua API lo fa solo
  `FileManager.renameFile`, non `Vault.rename`
  ([obsidian.d.ts](https://github.com/obsidianmd/obsidian-api/blob/9abd9605ce081383674aae1ed111c456edde0688/obsidian.d.ts#L4378-L4389)).
  La documentazione non dice cosa succede se si rinomina fuori dall'app.
- **Conseguenza.** Fuori dal runtime una rinomina arriva come cancellazione più
  creazione. Per questo l'identità deve stare dentro il file, come abbiamo
  deciso con l'id scritto nel file.

### L'id scritto nel bersaglio

- **Logseq**, nei grafi a file, scrive l'UUID come proprietà `id` nel blocco
  solo quando qualcuno lo referenzia
  ([editor.cljs](https://github.com/logseq/logseq/blob/0.10.15/src/main/frontend/handler/editor.cljs#L955-L972)).
  - Quando copia un blocco come testo, toglie l'id
    ([common.cljs](https://github.com/logseq/logseq/blob/0.10.15/src/main/frontend/handler/common.cljs#L12-L16)).
  - Se trova un id duplicato, dà al blocco un UUID nuovo
    ([graph-parser](https://github.com/logseq/logseq/blob/0.10.15/deps/graph-parser/src/logseq/graph_parser/block.cljs#L610-L644)).
  - Un riferimento a un blocco che non esiste più appare come avviso «Block ref
    invalid», senza riparazione
    ([block.cljs](https://github.com/logseq/logseq/blob/0.10.15/src/main/frontend/components/block.cljs#L942-L945)).

  Nel 2026 Logseq si è diviso in due prodotti. La versione DB è alla 2.0.2
  beta; i grafi Markdown restano a Logseq OG, che non riceve nuove funzioni
  ([annuncio](https://logseq.io/p/e3YDyX5AYr)).
- **Obsidian** scrive l'identificatore di blocco, `^id`, nel file di
  destinazione. È fatto di lettere latine, cifre e trattini
  ([help](https://obsidian.md/help/links)).
- **Cosa regge.** Un id scritto nel bersaglio sopravvive alla rinomina, allo
  spostamento e alla modifica del testo, ma non alla cancellazione.

### Merge e cancellazioni

- **Git** segnala un conflitto solo quando lo stesso percorso è cancellato da
  una parte e modificato dall'altra
  ([merge-ort.c](https://github.com/git/git/blob/47fdf2208c5b94c8cc01c106b8f7c85efb91c926/merge-ort.c#L4414-L4420)).
  Se un ramo cancella un oggetto e un altro lo collega, non c'è conflitto: il
  controllo dei collegamenti fra file tocca al runtime.
- **Wikipedia.** Quando si sposta una pagina resta un redirect, e i
  collegamenti non vengono riscritti. I doppi redirect li correggono dei bot
  ([Help:Moving a page](https://www.mediawiki.org/wiki/Help:Moving_a_page),
  [Double redirects](https://en.wikipedia.org/wiki/Wikipedia:Double_redirects)).
- **Zotero.** Quando fonde due elementi:
  - riscrive verso quello che resta le relazioni della stessa libreria, e
    registra una relazione `dc:replaces` verso quello fuso
    ([mergeItems.mjs](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/mergeItems.mjs));
  - per i riferimenti che stanno fuori dal database, come le citazioni nei
    documenti, risolve seguendo questa catena
    ([integration.js](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/integration.js)).

  È il precedente più vicino per un collegamento rimasto in un file che il
  runtime non può riscrivere.
- **DITA** usa le chiavi come indirezione: la risorsa si definisce una volta
  nella mappa, e se la chiave manca si usa `@href` come ripiego
  ([DITA 2.0](https://dita-lang.org/2.0/dita/archspec/base/processing-key-references-general)).

### La ridondanza: l'id più un'impronta

- **Phelps e Wilensky (2000), robust hyperlinks.** All'URL si aggiunge una
  firma di cinque termini, scelti nel documento per TF-IDF. Se l'URL non
  funziona, la firma diventa una ricerca e l'utente sceglie fra i risultati.
  - Su 10 URL hanno ritrovato il documento in tutti i casi tranne uno. Gli
    autori stessi definiscono i risultati «impressionistic»
    ([CSD-00-1091](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2000/CSD-00-1091.pdf)).
  - Per le annotazioni salvano un UID, un percorso nell'albero e fino a 25
    caratteri di contesto, e li provano in quest'ordine
    ([D-Lib 2000](https://dlib.org/dlib/july00/wilensky/07wilensky.html)).
- **Web Annotation Data Model** (W3C Recommendation, 2017). Lo stesso bersaglio
  si può descrivere con più selettori. Il TextQuoteSelector salva il testo
  esatto con prefisso e suffisso, mentre la sola posizione è definita «very
  brittle» ([W3C](https://www.w3.org/TR/annotation-model/)).
- **Hypothesis.**
  - Salva 32 caratteri di contesto per lato, cerca prima la citazione esatta e
    poi una approssimata
    ([types.ts](https://github.com/hypothesis/client/blob/a7b7400d0d706d4357ec37c2a3610b25dcca89d5/src/annotator/anchoring/types.ts#L199),
    [match-quote.ts](https://github.com/hypothesis/client/blob/a7b7400d0d706d4357ec37c2a3610b25dcca89d5/src/annotator/anchoring/match-quote.ts#L84-L163)).
  - Se non la trova, sposta l'annotazione fra le «Unanchored» senza
    cancellarla
    ([help](https://web.hypothes.is/help/what-are-unanchored-annotations/)).
  - Il riaggancio approssimato però non ha una soglia minima di qualità e
    avviene senza conferma dell'utente.
- **Swimm**, documentazione legata al codice.
  - Aggiorna da solo gli snippet per i cambi di routine.
  - Quando serve supervisione, il controllo in CI fallisce, e l'autore
    sostituisce o cancella l'elemento superato
    ([docs](https://docs.swimm.io/features/keep-docs-updated-with-auto-sync/),
    [IDE](https://docs.swimm.io/ide-integrations/vs-code/ide-plugins-vscode-keep-docs-up-to-date)).
  - I segnali che usa sono marcatori di riga, token, dimensione del cambio e
    storia Git, senza semantica
    ([blog del 2021](https://swimm.io/blog/how-does-swimm-s-auto-sync-feature-work),
    fonte secondaria).

## Chi propone collegamenti per significato

- **Lessicali.**
  - Le unlinked mentions di Obsidian cercano il nome della nota e i suoi alias;
    collegarne una scrive il link nel file
    ([backlinks](https://obsidian.md/help/plugins/backlinks),
    [aliases](https://obsidian.md/help/aliases)).
  - Logseq fa lo stesso, cercando titolo e alias come sottostringa
    ([reference.cljs](https://github.com/logseq/logseq/blob/master/deps/db/src/logseq/db/common/reference.cljs)).
  - Roam ha le Unlinked References (solo fonte secondaria).
- **Smart Connections**, plugin di Obsidian, versione 4.7.2.
  - Calcola gli embedding in locale per default, con TaylorAI/bge-micro-v2 (384
    dimensioni) e senza chiavi API
    ([impostazioni](https://github.com/brianpetro/obsidian-smart-env/blob/main/default.settings.js),
    [README](https://github.com/brianpetro/obsidian-smart-connections/blob/main/README.md)).
  - I dati stanno in `.smart-env/`, separati dalle note
    ([ajson_sharded_sources.js](https://github.com/brianpetro/obsidian-smart-env/blob/main/src/adapters/data/ajson_sharded_sources.js)).
  - I risultati sono una vista: un collegamento nasce solo trascinando un
    risultato nella nota.
  - Il rifiuto (Hide) si salva nell'indice, non nella nota, e non segue le
    rinomine
    ([hide.js](https://github.com/brianpetro/obsidian-smart-connections/blob/main/src/actions/connections-list-item/hide.js),
    [stato](https://github.com/brianpetro/obsidian-smart-connections/blob/main/src/utils/connections_list_item_state.js)).
  - I vettori dipendono da modello, revisione e pooling, e si ricalcolano
    quando cambia il modello
    ([worker](https://github.com/brianpetro/obsidian-smart-env/blob/main/src/adapters/embedding-model/transformers_v4_worker.js)).
- **DEVONthink 4.4.2.**
  - See Also propone documenti correlati e gruppi dove archiviare.
  - Usa un'AI interna che il manuale dice precedere gli LLM di vent'anni, senza
    dire quale tecnica usi.
  - Il rifiuto è un attributo dell'elemento («Exclude From… See Also»), e la
    conferma è un gesto esplicito
    ([manuale](https://download.devontechnologies.com/download/devonthink/4.4.2/DEVONthink%20Manual.pdf)).
- **In cloud.**
  - Heptabase mostra le carte correlate usando un modello di embedding sui suoi
    server ([newsletter](https://wiki.heptabase.com/newsletters/2025-11-06)).
  - Mem ha il pannello Heads Up, ma non documenta la tecnica
    ([help](https://help.mem.ai/features/heads-up.md)).
  - Notion indicizza le pagine con embedding in un database vettoriale in cloud
    ([sicurezza](https://www.notion.com/help/notion-ai-security-practices)), e
    AI Autofill scrive valori nelle proprietà del database
    ([autofill](https://www.notion.com/help/autofill)).
  - In Reflect un LLM racchiude i nomi propri in doppie parentesi, e l'utente
    sostituisce il testo
    ([blog](https://reflect.app/blog/automatically-add-backlinks-using-ai)).
- **Zotero.** I related items si creano solo a mano e valgono in tutte e due le
  direzioni ([support](https://www.zotero.org/support/related)).
- **In sintesi.** Nessuno scrive da solo collegamenti semantici nei file
  sorgente. Gli unici che scrivono da soli sono Notion AI Autofill e
  un'integrazione di terzi, e lo fanno su proprietà di database in cloud.

## Quanto costa in locale, nel runtime TypeScript

- **transformers.js 4.3.1** (2026-10-06, Apache-2.0) gira in Node con
  onnxruntime-node su CPU, e nel browser con onnxruntime-web via WASM o WebGPU.
  WebGPU è ancora sperimentale in molti browser
  ([npm](https://registry.npmjs.org/@huggingface/transformers),
  [README](https://github.com/huggingface/transformers.js/blob/main/README.md)).
  - Può caricare i modelli da un percorso locale. Per lavorare senza rete nel
    browser vanno serviti in locale anche i binari WASM, che per default
    arrivano da una CDN.
  - Il tipo numerico predefinito è fp32, tranne su WASM dove è q8
    ([transformers.node.mjs](https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.node.mjs)).
    Quindi, per default, la CLI in Node e la pagina nel browser lavorano già in
    modo diverso, e il runtime deve fissare il tipo.
- **Modelli piccoli multilingue con l'italiano**, con le dimensioni dei file
  ONNX per transformers.js:

| modello | licenza | dimensioni del vettore | token | file |
|---|---|---|---|---|
| [multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small) | MIT | 384 | 512 | circa 118 MB in int8 |
| [paraphrase-multilingual-MiniLM-L12-v2](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2) | Apache 2.0 | 384 | 128 | circa 118 MB in int8 |
| [granite-embedding-97m-multilingual-r2](https://huggingface.co/ibm-granite/granite-embedding-97m-multilingual-r2) (IBM, 2026) | Apache 2.0 | 384 | 32.768 | circa 98 MB in int8 |
| [EmbeddingGemma 300m](https://huggingface.co/google/embeddinggemma-300m) | Gemma, accesso condizionato | 768 | 2.048 | circa 309 MB in q8 |
| [EmbeddingGemma 2](https://huggingface.co/google/embeddinggemma-2) (2026; testo, immagini e audio) | Apache 2.0 | 768 | 8.192 | circa 314 MB in q8, solo testo |
| [bge-m3](https://huggingface.co/BAAI/bge-m3) | MIT | 1.024 | 8.192 | circa 568 MB in int8 |

  Per granite il supporto in transformers.js non è stato provato. Le
  dimensioni dei file vengono dalle API di Hugging Face e dalle card ONNX di
  [Xenova](https://huggingface.co/api/models/Xenova/paraphrase-multilingual-MiniLM-L12-v2?blobs=true)
  e [onnx-community](https://huggingface.co/api/models/onnx-community/granite-embedding-97m-multilingual-r2-ONNX?blobs=true).
- **Misura locale** del 2026-10-20: Xeon con 4 vCPU, Node 22.22.0,
  multilingual-e5-small in q8, capoversi di 42 token.
  - Da 3,4 a 4,5 ms per capoverso con 4 thread, circa 7 ms con un thread.
  - Il modello si carica in 1,3-1,5 s, e la memoria occupata va da 555 a 591
    MB.
  - Diecimila capoversi richiedono quindi meno di un minuto.
  - La ricerca esaustiva su 10.000 vettori in JavaScript puro richiede da 5,6
    a 6,7 ms per query, misurata due volte.
  - I vettori occupano 10.000 × 384 × 4 byte, circa 15 MB in float32, e un
    quarto in int8. Non serve un archivio vettoriale.
- **Tabelle.** Secondo TARGET (2025), la forma migliore è la tabella in
  markdown con i nomi di colonna e un centinaio di righe. Con i soli nomi di
  colonna i risultati per domande e verifica di fatti peggiorano molto
  ([arXiv 2505.11545](https://arxiv.org/html/2505.11545v1)).
- **Immagini.**
  - CLIP ViT-B/32 è disponibile in transformers.js, ma la card ne limita l'uso
    all'inglese ([card](https://huggingface.co/openai/clip-vit-base-patch32)).
  - SigLIP 2 è multilingue ([arXiv 2502.14786](https://arxiv.org/abs/2502.14786)).
  - EmbeddingGemma 2 mette testo e immagini nello stesso spazio.
- **Senza modello.**
  - BM25 in JavaScript: Orama 3.1.18 (Apache 2.0) ha uno stemmer italiano
    ([README](https://github.com/oramasearch/orama/blob/main/README.md));
    MiniSearch 7.2.0 (MIT) usa BM25+
    ([sorgente](https://github.com/lucaong/minisearch/blob/master/src/MiniSearch.ts));
    natural 8.1.1 ha uno stemmer italiano e TF-IDF
    ([stemmer](https://cdn.jsdelivr.net/npm/natural@8.1.1/lib/natural/stemmers/index.js)).
  - Ci sono anche modelli statici, come static-similarity-mrl-multilingual-v1:
    secondo la card sono da 100 a 400 volte più veloci di e5-small su CPU, ma
    non sono pensati per il retrieval e raggiungono il 92% di e5-small sulla
    similarità fra frasi
    ([card](https://huggingface.co/sentence-transformers/static-similarity-mrl-multilingual-v1)).

### Determinismo

- **Misura locale**, stesso modello e stessi testi.
  - Sulla stessa macchina e con lo stesso backend, i vettori sono identici bit
    per bit, anche cambiando il numero di thread.
  - Fra CPU nativa e WASM differiscono. In fp32 di pochissimo (scarto massimo
    6,3e-8); in q8 differiscono tutte le 1.920 componenti, con coseno minimo
    0,998.
  - L'ordine dei risultati rispetto alla domanda non è cambiato.
- **Le specifiche lo permettono.**
  - WGSL consente di riassociare e fondere le operazioni in virgola mobile
    ([WGSL](https://www.w3.org/TR/WGSL/)).
  - Le istruzioni relaxed SIMD di WebAssembly non sono deterministiche
    ([WebAssembly](https://github.com/WebAssembly/design/blob/main/Nondeterminism.md)).
  - I test di onnxruntime-web confrontano con una tolleranza: 1e-4 su CPU e
    WASM, 1e-3 su WebGPU
    ([test-runner.ts](https://github.com/microsoft/onnxruntime/blob/main/js/web/test/test-runner.ts)).
  - I modelli int8 danno risultati diversi su macchine con e senza AVX512
    ([onnx/models#526](https://github.com/onnx/models/pull/526)).
  - In JavaScript anche `Math.log` è approssimato dall'implementazione
    ([ECMAScript 2026](https://tc39.es/ecma262/2026/)), quindi anche i
    punteggi di BM25 possono differire fra motori JS.
  - La card di e5 avverte che versioni diverse delle librerie danno differenze
    piccole ma non nulle.
- **Conseguenza.** Vettori e punteggi possono stare solo in una cache derivata,
  con chiave modello, revisione, tipo numerico e backend. Mai nel sorgente, mai
  nel corpus di conformità.

## Quanto è buono, misurato

### Proporre collegamenti nuovi

- **Milne e Witten (CIKM 2008).** Su Wikipedia il loro rilevatore di
  collegamenti ha precisione 74,4 e recall 73,8. Su 50 notizie giudicate da
  persone arriva a 76 e 73
  ([paper](https://complexevents.com/wp-content/uploads/2008/12/cikm08-learningtolinkwithwikipedia.pdf)).
  Anche fra persone l'accordo è basso: il 53% dei collegamenti aggiunti l'ha
  indicato un solo valutatore su cinque.
- **Add a link di Wikimedia**, il sistema in produzione per i nuovi utenti.
  - Sulla Wikipedia italiana ha precisione 0,84 e recall 0,46, con soglia 0,5
    ([round 1](https://meta.wikimedia.org/wiki/Research:Improving_multilingual_support_for_link_recommendation_model_for_add-a-link_task/Results_round-1)).
  - Su quella inglese, con soglia 0,9, ha precisione 0,954 e recall 0,091
    ([Gerlach et al. 2021](https://arxiv.org/abs/2105.15110)).
  - La soglia va scelta lingua per lingua.
  - I segnali più forti del modello sono lessicali: la frequenza e la
    distanza di Levenshtein fra l'àncora e il titolo. L'embedding basato sulla
    navigazione conta molto meno.
- **Come lo usano le persone.**
  - Su 3.073 suggerimenti, i nuovi utenti ne hanno accettati il 67,1% e
    rifiutati il 23,4%.
  - Il 32,3% degli utenti ha accettato tutti i suggerimenti.
  - Su desktop, all'inizio del 2022, il primo motivo di rifiuto (53% dei casi)
    era che quasi tutti sanno già di che cosa si tratta
    ([Add a link](https://www.mediawiki.org/wiki/Growth/Personalized_first_day/Structured_tasks/Add_a_link)).

### Ritrovare un bersaglio

- Scegliere il bersaglio giusto quando si sa già che il collegamento c'è, cioè
  disambiguare, è molto più facile. Si arriva a F 97,1 in Milne e Witten e a
  una precisione fra 0,948 e 0,986 in sei lingue in Gerlach et al.

### Dove gli embedding sbagliano

- **Soglie.** Sullo stesso task (OpusparcusPC, russo) la soglia migliore è
  0,869 con multilingual-e5-small e 0,709 con jina-embeddings-v3
  ([e5](https://huggingface.co/intfloat/multilingual-e5-small/raw/main/README.md),
  [jina](https://huggingface.co/jinaai/jina-embeddings-v3/raw/main/README.md)).
  Le similarità di e5 stanno fra 0,7 e 1: conta l'ordine, non il valore.
- **Negazione.** Su coppie di documenti che differiscono solo per una
  negazione, i bi-encoder fanno peggio del caso. Vanno ragionevolmente solo i
  cross-encoder e i re-ranker LLM
  ([NevIR](https://arxiv.org/abs/2305.07614),
  [riproduzione del 2025](https://arxiv.org/abs/2502.13506v4)).
- **Numeri.** Su 13 modelli, l'accuratezza media nel distinguere testi che
  differiscono per un numero è 0,54, contro lo 0,5 del caso
  ([Numeracy Gap, 2026](https://aclanthology.org/2026.findings-eacl.289/)).
- **Italiano.** In mteb 2.26.14 non c'è un benchmark italiano dedicato
  ([PyPI](https://pypi.org/project/mteb/2.26.14/)), quindi la qualità
  sull'italiano va misurata sul nostro corpus. Sul benchmark multilingue
  multilingual-e5-small ottiene 55,5
  ([MMTEB](https://arxiv.org/html/2502.13595v2)).

### La deriva

- **Klein et al. (PLOS ONE 2014).** Un articolo scientifico su cinque soffre di
  reference rot. Fra gli articoli con riferimenti web sono sette su dieci
  ([Klein](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0115253)).
- **Jones et al. (PLOS ONE 2016).** Fra i riferimenti che si possono
  controllare, il 21,8% è rotto e il 59,7% ha il contenuto cambiato. Chi segue
  un collegamento che funziona crede di trovare ciò che è citato, mentre uno
  rotto dà un errore che non si può fraintendere
  ([Jones](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0167475)).
- **Zittrain, Albert e Lessig (2014).** Fra i link delle sentenze della Corte
  Suprema che rispondevano, solo il 76% portava ancora al materiale citato
  ([paper](https://ia800100.us.archive.org/16/items/permascopingandaddressingtheproblemoflinkandreferencerotinlegaldocuments/SSRN-id2329161.pdf)).
- **Tan, Wagner e Treude (2024).** Il 28,9% dei progetti più popolari di GitHub
  ha documentazione con riferimenti a codice che non esiste più, e quei
  riferimenti restano superati in media per 4,7 anni
  ([arXiv 2212.01479](https://arxiv.org/abs/2212.01479)).
- **Rilevare un commento diventato incoerente.**
  - Al momento della modifica, con il diff, si arriva a F1 87,1; a posteriori
    a 63-65; una regola lessicale (il commento cita token cancellati) arriva a
    74,7 ([Panthaplackel et al. 2021](https://arxiv.org/abs/2010.01625)).
  - Un modello da 110 milioni di parametri con il diff strutturato arriva a
    90,9 ([CARL-CCI, 2026](https://arxiv.org/abs/2512.19883v2)).
  - I dataset sono bilanciati, quindi nella pratica la precisione sarà più
    bassa.

### Quanti suggerimenti si sopportano

- **Google.** I controlli mostrati in code review devono avere meno del 10% di
  falsi positivi effettivi. Il team disattiva un analizzatore che supera la
  soglia finché non viene migliorato
  ([CACM 2018](https://6826.csail.mit.edu/2020/papers/google-analysis-cacm.pdf)).
- **Medicina.** Ogni promemoria in più nella stessa visita riduce del 30% la
  probabilità che venga accettato
  ([Ancker et al. 2017](https://doi.org/10.1186/s12911-017-0430-8)). Gli
  avvisi sui farmaci vengono ignorati nel 49-96% dei casi
  ([van der Sijs et al. 2006](https://pmc.ncbi.nlm.nih.gov/articles/PMC1447540)).

## Cosa ne segue per noi

Questa parte è un'inferenza dai fatti sopra, non un fatto verificato. Le
proposte che ne nascono sono in [bozza-nodi.md](../bozza-nodi.md).

- Il collegamento semantico serve come rete di sicurezza e come suggerimento,
  non come collegamento. Quando l'autore lo conferma, diventa un normale
  collegamento per id.
- Le rotture meccaniche si coprono con meccanismi deterministici, già nel primo
  livello:
  - l'id scritto nel file;
  - la rinomina fatta dal runtime;
  - l'id tolto alle copie;
  - un controllo dopo ogni merge o modifica esterna;
  - una traccia «sostituito da» per gli oggetti fusi o rimpiazzati.
- L'impronta del bersaglio è deterministica, quindi può stare nel sorgente
  accanto all'id. Serve sia a ritrovare un bersaglio perso sia a vedere che il
  contenuto è cambiato.
- L'indice semantico è una cache locale che si può rigenerare, come
  `.smart-env/` di Smart Connections. Si può cominciare dal lessicale (BM25 con
  stemmer italiano), che non scarica niente, e aggiungere gli embedding dopo.
- La deriva si controlla al momento della modifica, con il diff. Un modello di
  embedding non vede che un capoverso dice il contrario del concetto: per
  questo serve un cross-encoder o un LLM, attivato esplicitamente, oppure
  l'autore.
- I suggerimenti devono essere pochi, con precisione intorno al 90%, e non
  devono essere riproposti dopo un rifiuto.
- Da misurare sul nostro corpus italiano: la precisione dei suggerimenti di
  collegamento e del riaggancio, con la soglia scelta per il modello fissato.
