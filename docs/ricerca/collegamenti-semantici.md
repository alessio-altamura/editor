# Collegamenti che si rompono e collegamenti semantici

Ricerca del 2026-10-20 sulla domanda di Alessio. I collegamenti per id, cioè
meccanici, si possono rompere: si può aggiungere un collegamento generato in
automatico per semantica? Quanto è semplice?

La ricerca ha quattro angoli:
- come gli altri sistemi tengono e riparano i collegamenti;
- quali strumenti propongono collegamenti per significato;
- quanto costa calcolare la somiglianza in locale, nel runtime TypeScript;
- quanto è buono il collegamento automatico, misurato.

Un verificatore separato ha ricontrollato ogni fatto sulla fonte citata. Dove
ha corretto, qui c'è la versione corretta, e le fonti secondarie sono segnate
come tali. Poi un secondo controllo ha confrontato questa nota con i fatti
verificati. Le misure locali sono state rifatte per questa nota con gli script
in [misure/embedding/](misure/embedding/). Le inferenze sono dichiarate, e
quelle di progetto stanno nell'ultima sezione.

## In sintesi

- **Generare suggerimenti per significato è semplice e costa poco.**
  - I modelli multilingue piccoli che coprono l'italiano pesano da 100 a 120
    MB.
  - Quello misurato, multilingual-e5-small, elabora un capoverso breve in circa
    4 ms su CPU, e gira sia in Node sia nel browser con transformers.js.
  - Diecimila oggetti occupano circa 15 MB di vettori, e una ricerca su tutti
    richiede pochi millisecondi.
- **Non può sostituire il collegamento per id.** I motivi sono tre.
  - Non è deterministico: gli stessi testi danno vettori diversi su backend
    diversi, e le soglie dichiarate cambiano da un modello all'altro.
  - Non distingue bene antonimi, negazioni e numeri. Nella nostra misura, per
    multilingual-e5-small la frase «Nel terzo trimestre le vendite calano per i
    ritardi nelle consegne» è più vicina alla stessa frase con «crescono»
    (0,983), con «non calano» (0,974) o con «calano del 3%» (0,985) che a una
    vera parafrasi (0,928).
  - Nel proporre collegamenti nuovi l'errore è frequente anche per Add a link
    di Wikipedia, il sistema in produzione esaminato: sulla Wikipedia italiana
    ha precisione 0,84 e recall 0,46.
- **Nessuno strumento esaminato scrive collegamenti semantici nei file di
  testo dell'utente.** Quelli che lo documentano mostrano i suggerimenti a
  parte, e il collegamento entra nella nota solo con un gesto dell'utente.
  Notion AI Autofill scrive da solo, ma nelle proprietà di un database in
  cloud.
- **La semantica rende bene quando deve scegliere fra pochi candidati.** La
  disambiguazione arriva a F 97, la scoperta di collegamenti nuovi a F 74.
  Ritrovare il bersaglio di un collegamento rotto somiglia più alla prima che
  alla seconda (è un'inferenza, non una misura).
- **Le rotture dovute a rinomine, copie e fusioni hanno soluzioni meccaniche e
  deterministiche, già in uso altrove:** la rinomina fatta dallo strumento, che
  riscrive i collegamenti; l'id tolto alle copie; la traccia lasciata da una
  fusione.
- **Altri sistemi affiancano all'indirizzo una traccia del contenuto.** Phelps
  e Wilensky salvano con l'URL una firma di cinque parole; il W3C e Hypothesis
  salvano con la posizione una citazione e il suo contesto. Quando l'indirizzo
  non basta, si cerca per contenuto. Se non si trova, Hypothesis mostra
  l'annotazione come non agganciata. Swimm, che segue gli snippet con
  marcatori, token e storia Git, fa fallire il controllo e chiede all'autore.
- **Un collegamento che si risolve ma non dice più la stessa cosa è più
  frequente di uno rotto, e più insidioso.** In uno studio sui riferimenti
  scientifici (Jones et al.) il contenuto cambiato è quasi tre volte più
  frequente del collegamento rotto. Chi segue un collegamento che funziona
  crede di trovare ciò che è citato. Per i commenti nel codice, l'incoerenza si
  rileva molto meglio al momento della modifica, con il diff, che dopo.

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
  Changed e Deleted
  ([didChangeWatchedFiles](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#workspace_didChangeWatchedFiles)).
  `workspace/willRenameFiles` parte solo se la rinomina avviene dentro il
  client
  ([willRenameFiles](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#workspace_willRenameFiles)).
- **Obsidian** aggiorna i collegamenti quando la rinomina passa dall'app
  ([help](https://obsidian.md/help/links)). Nella sua API lo fa solo
  `FileManager.renameFile`, non `Vault.rename`
  ([obsidian.d.ts](https://github.com/obsidianmd/obsidian-api/blob/9abd9605ce081383674aae1ed111c456edde0688/obsidian.d.ts#L4378-L4389)).
  La documentazione non dice cosa succede se si rinomina fuori dall'app.
- **Da qui ricaviamo** (inferenza): fuori dallo strumento una rinomina arriva
  come cancellazione più creazione. Per questo abbiamo scelto un id scritto
  dentro il file.

### L'id scritto nel bersaglio

- **Logseq**, nei grafi a file (0.10.15):
  - quando si copia un riferimento a un blocco, scrive l'UUID come proprietà
    `id` nel blocco di destinazione, se non c'è già
    ([editor.cljs](https://github.com/logseq/logseq/blob/0.10.15/src/main/frontend/handler/editor.cljs#L955-L972));
  - quando copia un blocco come testo, toglie l'id
    ([common.cljs](https://github.com/logseq/logseq/blob/0.10.15/src/main/frontend/handler/common.cljs#L12-L16));
  - se trova un id duplicato, dà al blocco un UUID nuovo
    ([graph-parser](https://github.com/logseq/logseq/blob/0.10.15/deps/graph-parser/src/logseq/graph_parser/block.cljs#L610-L644));
  - mostra un riferimento a un blocco che non esiste più come avviso «Block
    ref invalid», senza riparazione
    ([block.cljs](https://github.com/logseq/logseq/blob/0.10.15/src/main/frontend/components/block.cljs#L942-L945)).

  Nel 2026 Logseq si è diviso in due prodotti
  ([annuncio](https://logseq.io/p/e3YDyX5AYr)). La versione DB è alla 2.0.2
  beta ([release](https://github.com/logseq/logseq/releases)); i grafi
  Markdown restano a Logseq OG, che non riceve nuove funzioni.
- **Obsidian** scrive l'identificatore di blocco, `^id`, nel file di
  destinazione. È fatto di lettere latine, cifre e trattini
  ([help](https://obsidian.md/help/links)).
- **Cosa protegge** (inferenza dal funzionamento): un id scritto nel bersaglio
  non dipende né dal nome del file né dal testo, ma non protegge dalla
  cancellazione.

### Merge e cancellazioni

- **Git.** Il conflitto modify/delete scatta solo quando lo stesso percorso è
  cancellato da una parte e modificato dall'altra. I riferimenti fra file
  diversi Git non li controlla
  ([merge-ort.c](https://github.com/git/git/blob/47fdf2208c5b94c8cc01c106b8f7c85efb91c926/merge-ort.c#L4414-L4420)).
  Se un ramo cancella un oggetto e un altro lo collega, non c'è conflitto.
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

  È il precedente più vicino per un collegamento rimasto in un file che lo
  strumento non può riscrivere.
- **DITA** usa le chiavi come indirezione: la risorsa si definisce una volta
  nella mappa invece che in ogni topic
  ([chiavi](https://dita-lang.org/2.0/dita/archspec/base/using-keys-for-addressing)).
  Se la chiave non è definita si usa `@href` come ripiego
  ([elaborazione](https://dita-lang.org/2.0/dita/archspec/base/processing-key-references-general)).

### L'indirizzo più una traccia del contenuto

- **Phelps e Wilensky (2000), robust hyperlinks.** All'URL si aggiunge una
  firma di cinque termini, scelti nel documento per TF-IDF. Se l'URL non
  funziona, la firma diventa una ricerca e l'utente sceglie fra i risultati.
  - Su 10 URL di pagine mai spostate hanno ritrovato il documento in tutti i
    casi tranne uno. Gli autori stessi definiscono i risultati «impressionistic»
    ([CSD-00-1091](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2000/CSD-00-1091.pdf)).
  - Per le annotazioni salvano un UID, un percorso nell'albero e fino a 25
    caratteri di contesto, e li provano in quest'ordine
    ([D-Lib 2000](https://dlib.org/dlib/july00/wilensky/07wilensky.html)).
- **Web Annotation Data Model** (W3C Recommendation, 2017). Lo stesso bersaglio
  si può descrivere con più selettori, e chi legge ne sceglie uno. Il
  TextQuoteSelector salva il testo esatto con prefisso e suffisso, mentre la
  sola posizione è definita «very brittle»
  ([W3C](https://www.w3.org/TR/annotation-model/)).
- **Hypothesis.**
  - Salva 32 caratteri di contesto per lato, cerca prima la citazione esatta e
    poi una approssimata
    ([types.ts](https://github.com/hypothesis/client/blob/a7b7400d0d706d4357ec37c2a3610b25dcca89d5/src/annotator/anchoring/types.ts#L199),
    [match-quote.ts](https://github.com/hypothesis/client/blob/a7b7400d0d706d4357ec37c2a3610b25dcca89d5/src/annotator/anchoring/match-quote.ts#L84-L163)).
  - Se non la trova, sposta l'annotazione fra le «Unanchored» senza
    cancellarla
    ([help](https://web.hypothes.is/help/what-are-unanchored-annotations/)).
  - Il riaggancio approssimato però non ha una soglia minima di qualità, e
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
  - Le unlinked mentions di Obsidian cercano il nome della nota e i suoi alias.
    Collegarne una scrive il link nel file
    ([backlinks](https://obsidian.md/help/plugins/backlinks),
    [aliases](https://obsidian.md/help/aliases)).
  - Logseq, nella versione DB, cerca titolo e alias come sottostringa, con una
    query calcolata al momento
    ([reference.cljs](https://github.com/logseq/logseq/blob/master/deps/db/src/logseq/db/common/reference.cljs)).
  - Roam ha le Unlinked References (solo fonte secondaria).
- **Smart Connections**, plugin di Obsidian, versione 4.7.2.
  - Calcola gli embedding in locale per default, con TaylorAI/bge-micro-v2 (384
    dimensioni), senza chiavi API
    ([impostazioni](https://github.com/brianpetro/obsidian-smart-env/blob/main/default.settings.js),
    [README](https://github.com/brianpetro/obsidian-smart-connections/blob/main/README.md)).
  - I dati stanno in `.smart-env/`, separati dalle note
    ([ajson_sharded_sources.js](https://github.com/brianpetro/obsidian-smart-env/blob/main/src/adapters/data/ajson_sharded_sources.js)).
  - I risultati sono una vista. Un collegamento nella nota nasce solo
    trascinandovi un risultato, oppure copiando i risultati come elenco di link.
  - Il rifiuto (Hide) si salva nell'indice, non nella nota
    ([hide.js](https://github.com/brianpetro/obsidian-smart-connections/blob/main/src/actions/connections-list-item/hide.js)).
    Secondo una lettura del codice, non un test, non segue le rinomine
    ([stato](https://github.com/brianpetro/obsidian-smart-connections/blob/main/src/utils/connections_list_item_state.js)).
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
  - Heptabase mostra le carte correlate con un modello di embedding sui suoi
    server. La fonte non dice se si creano collegamenti
    ([newsletter](https://wiki.heptabase.com/newsletters/2025-11-06)).
  - Mem ha il pannello Heads Up, ma non documenta la tecnica
    ([help](https://help.mem.ai/features/heads-up.md)).
  - Notion indicizza le pagine con embedding in un database vettoriale in cloud
    ([sicurezza](https://www.notion.com/help/notion-ai-security-practices)).
    AI Autofill scrive da solo valori nelle proprietà del database, e la pagina
    non dice se scrive anche relazioni
    ([autofill](https://www.notion.com/help/autofill)). Un'integrazione di
    terzi dichiara di compilare le relazioni: è una descrizione commerciale
    ([AI Auto Relation](https://www.notion.com/integrations/ai-auto-relation),
    fonte secondaria).
  - In Reflect un prompt fa trovare all'LLM i nomi propri e li racchiude in
    doppie parentesi
    ([newsletter](https://reflectnotes.beehiiv.com/p/automatically-add-backlinks-notes));
    l'utente sostituisce il testo, e così i link finiscono nella nota
    ([blog](https://reflect.app/blog/automatically-add-backlinks-using-ai)).
- **Zotero.** I related items si creano solo a mano e valgono in tutte e due le
  direzioni ([support](https://www.zotero.org/support/related)).

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
    Quindi, per default, la CLI in Node e la pagina nel browser lavorano in
    modo diverso.
- **Modelli piccoli multilingue con l'italiano**, con le dimensioni dei file
  ONNX per transformers.js:

| modello | licenza | dimensioni del vettore | token | file |
|---|---|---|---|---|
| [multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small) | MIT | 384 | 512 | circa 118 MB quantizzato |
| [paraphrase-multilingual-MiniLM-L12-v2](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2) | Apache 2.0 | 384 | 128 | circa 118 MB quantizzato |
| [granite-embedding-97m-multilingual-r2](https://huggingface.co/ibm-granite/granite-embedding-97m-multilingual-r2) (IBM, 2026) | Apache 2.0 | 384 | 32.768 | circa 98 MB in int8 |
| [EmbeddingGemma 300m](https://huggingface.co/google/embeddinggemma-300m) | Gemma, accesso condizionato | 768 | 2.048 | circa 309 MB in q8 |
| [EmbeddingGemma 2](https://huggingface.co/google/embeddinggemma-2) (2026; testo, immagini e audio) | Apache 2.0 | 768 | 8.192 | circa 314 MB in q8, solo testo |
| [bge-m3](https://huggingface.co/BAAI/bge-m3) | MIT | 1.024 | 8.192 | circa 568 MB in int8 |

  Per granite il supporto in transformers.js non è stato provato. Fonti delle
  dimensioni dei file:
  [e5](https://huggingface.co/intfloat/multilingual-e5-small),
  [MiniLM](https://huggingface.co/api/models/Xenova/paraphrase-multilingual-MiniLM-L12-v2?blobs=true),
  [granite](https://huggingface.co/api/models/onnx-community/granite-embedding-97m-multilingual-r2-ONNX?blobs=true),
  [EmbeddingGemma 300m](https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX),
  [EmbeddingGemma 2](https://huggingface.co/onnx-community/embeddinggemma-2-ONNX),
  [bge-m3](https://huggingface.co/api/models/Xenova/bge-m3?blobs=true).
- **Misura locale** del 2026-10-20, ripetuta più volte: Xeon con 4 vCPU, Node
  22.22.0, multilingual-e5-small in q8, capoversi di 42 token
  ([speed.mjs](misure/embedding/speed.mjs),
  [scansione.mjs](misure/embedding/scansione.mjs)).
  - Da 3,4 a 4,5 ms per capoverso con 4 thread; da 6,9 a 7,7 ms con un
    thread.
  - Il modello si carica in 1,3-1,5 s, e la memoria occupata va da 555 a 595
    MB.
  - Diecimila capoversi richiedono quindi meno di un minuto.
  - La ricerca esaustiva su 10.000 vettori in JavaScript puro richiede fra 4 e
    8 ms per query, in quattro misure.
  - I vettori occupano 10.000 × 384 × 4 byte, circa 15 MB in float32, e un
    quarto in int8 ([Sentence-Transformers](https://sbert.net/examples/sentence_transformer/applications/embedding-quantization/README.html)).
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
  - Ci sono anche modelli statici, come static-similarity-mrl-multilingual-v1.
    Secondo la card sono da 100 a 400 volte più veloci di e5-small su CPU, ma
    non sono pensati per il retrieval e raggiungono il 92% di e5-small sulla
    similarità fra frasi
    ([card](https://huggingface.co/sentence-transformers/static-similarity-mrl-multilingual-v1)).

### Determinismo

- **Misura locale**, stesso modello e cinque frasi
  ([direct.mjs](misure/embedding/direct.mjs)).
  - Con onnxruntime-node, sulla stessa macchina, i vettori sono identici bit
    per bit, anche cambiando il numero di thread. Con WASM non è verificato
    che i thread chiesti fossero davvero usati.
  - Fra CPU nativa e WASM i vettori differiscono. In fp32 differiscono 1.756
    componenti su 1.920, di pochissimo (scarto massimo 6,3e-8). In q8
    differiscono tutte, con coseno minimo 0,998.
  - Su questo campione (cinque frasi, una domanda) l'ordine dei risultati non è
    cambiato.
- **Le specifiche lo permettono.**
  - WGSL consente di riassociare e fondere le operazioni in virgola mobile
    ([WGSL](https://www.w3.org/TR/WGSL/)).
  - Le istruzioni relaxed SIMD di WebAssembly non sono deterministiche
    ([WebAssembly](https://github.com/WebAssembly/design/blob/main/Nondeterminism.md)).
  - I test di onnxruntime-web confrontano con una tolleranza: 1e-4 su CPU e
    WASM, 1e-3 su WebGPU
    ([test-runner.ts](https://github.com/microsoft/onnxruntime/blob/main/js/web/test/test-runner.ts)).
  - In ONNX Runtime l'opzione per il calcolo deterministico è spenta per
    default e riguarda solo i kernel GPU
    ([onnxruntime_c_api.h](https://github.com/microsoft/onnxruntime/blob/main/include/onnxruntime/core/session/onnxruntime_c_api.h)).
  - In JavaScript `Math.log` è approssimato dall'implementazione
    ([ECMAScript 2026](https://tc39.es/ecma262/2026/)). Ne segue (inferenza)
    che anche i punteggi di BM25 possono differire fra motori JS.
- **Altre osservazioni.**
  - Nel 2022 i manutentori di ONNX Model Zoo hanno osservato che i modelli
    int8 su ONNX Runtime danno output diversi su macchine con e senza AVX512
    ([onnx/models#526](https://github.com/onnx/models/pull/526)).
  - La card di e5 avverte che versioni diverse di transformers e pytorch danno
    prestazioni di poco diverse. Parla di risultati, non di bit
    ([card](https://huggingface.co/intfloat/multilingual-e5-small)).

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
  - I segnali più forti del modello sono lessicali: la frequenza e la distanza
    di Levenshtein fra l'àncora e il titolo. L'embedding basato sulla
    navigazione conta molto meno.
- **Come lo usano le persone**
  ([Add a link](https://www.mediawiki.org/wiki/Growth/Personalized_first_day/Structured_tasks/Add_a_link)).
  - Su 3.073 suggerimenti, i nuovi utenti ne hanno accettati il 67,1% e
    rifiutati il 23,4%.
  - Fra gli utenti con almeno una sessione, il 32,3% (31 su 96) ha accettato
    tutti i suggerimenti. Con cinque sessioni o più, nessuno su sei.
  - Su desktop, all'inizio del 2022, il primo motivo di rifiuto (53% dei casi)
    era che quasi tutti sanno già di che cosa si tratta.
  - Wikimedia stima che gli utenti vedano un'accuratezza intorno al 75%.

### Ritrovare un bersaglio

- Scegliere il bersaglio giusto quando si sa già che il collegamento c'è, cioè
  disambiguare, è molto più facile. Si arriva a F 97,1 in Milne e Witten e a
  una precisione fra 0,948 e 0,986 in sei lingue in Gerlach et al.

### Dove gli embedding sbagliano

- **Soglie.** Sullo stesso task (OpusparcusPC, russo), le card dichiarano come
  soglia migliore 0,869 per multilingual-e5-small e 0,709 per
  jina-embeddings-v3
  ([e5](https://huggingface.co/intfloat/multilingual-e5-small/raw/main/README.md),
  [jina](https://huggingface.co/jinaai/jina-embeddings-v3/raw/main/README.md)).
  Le similarità di e5 stanno fra 0,7 e 1: conta l'ordine, non il valore.
- **La nostra misura** ([coppie.mjs](misure/embedding/coppie.mjs)), con
  multilingual-e5-small in q8. Frase di partenza: «Nel terzo trimestre le
  vendite calano per i ritardi nelle consegne». Similarità coseno con:
  - la stessa frase con «crescono»: 0,983;
  - con «non calano»: 0,974;
  - con «calano del 3%»: 0,985, e con «calano del 30%»: 0,987;
  - una vera parafrasi («Tra luglio e settembre il fatturato scende perché le
    consegne arrivano in ritardo»): 0,928;
  - una frase sullo stesso tema («Le vendite del terzo trimestre sono riportate
    nella tabella per regione»): 0,926;
  - una frase estranea, su un gatto: 0,820.

  Per questo modello, quindi, la frase che dice il contrario è più vicina della
  parafrasi. Sono sette coppie, non un benchmark.
- **Negazione.** Su coppie di documenti che differiscono solo per una
  negazione, i bi-encoder fanno peggio del caso. Vanno ragionevolmente solo i
  cross-encoder e i re-ranker LLM
  ([NevIR](https://arxiv.org/abs/2305.07614),
  [riproduzione del 2025](https://arxiv.org/abs/2502.13506v4)).
- **Antonimi.** Nessuno dei 13 encoder di frase provati da ALIGN-SIM soddisfa
  tutti e cinque i criteri di allineamento semantico, fra cui la sostituzione
  con un antonimo
  ([ALIGN-SIM, 2024](https://aclanthology.org/2024.findings-emnlp.436/)).
- **Numeri.** Su 13 modelli, l'accuratezza media nel distinguere testi che
  differiscono per un numero è 0,54, contro lo 0,5 del caso
  ([Numeracy Gap, 2026](https://aclanthology.org/2026.findings-eacl.289/)).
- **Italiano.** In mteb 2.26.14 non c'è un benchmark italiano dedicato
  ([PyPI](https://pypi.org/project/mteb/2.26.14/)). Sul benchmark multilingue,
  multilingual-e5-small ottiene 55,5
  ([MMTEB](https://arxiv.org/html/2502.13595v2)).

### La deriva

- **Klein et al. (PLOS ONE 2014).** Stimano che, negli anni di pubblicazione
  più recenti, un articolo scientifico su cinque soffra di reference rot. Fra
  gli articoli con riferimenti web sono sette su dieci
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
  ha documentazione con riferimenti a codice che non esiste più. Quei
  riferimenti restano superati in media per 4,7 anni
  ([arXiv 2212.01479](https://arxiv.org/abs/2212.01479)).
- **Rilevare un commento diventato incoerente** con il codice
  ([Panthaplackel et al. 2021](https://arxiv.org/abs/2010.01625)).
  - Sul campione di test ripulito: al momento della modifica, con il diff, F1
    87,1; a posteriori, 63-65; una regola lessicale (il commento cita token
    cancellati), 74,7.
  - Sul test completo: 79,6-80,9 al momento della modifica, 66,3-67,2 a
    posteriori, 68,0 la regola lessicale.
  - Sullo stesso test completo, un modello da 110 milioni di parametri con il
    diff strutturato arriva a 90,9
    ([CARL-CCI, 2026](https://arxiv.org/abs/2512.19883v2)).
  - I dataset sono bilanciati; la precisione con la frequenza reale degli
    errori non è pubblicata.

### Quanti suggerimenti si sopportano

- **Google.** I controlli mostrati in code review devono avere meno del 10% di
  falsi positivi effettivi. Il team di Tricorder conta i clic «Not useful»
  rispetto ai «Please fix», e se il rapporto supera il 10% disattiva
  l'analizzatore finché non viene migliorato. È una decisione del team
  ([CACM 2018](https://6826.csail.mit.edu/2020/papers/google-analysis-cacm.pdf)).
- **Medicina.** Ogni promemoria in più nella stessa visita riduce del 30% la
  probabilità che venga accettato
  ([Ancker et al. 2017](https://doi.org/10.1186/s12911-017-0430-8)). Gli
  avvisi sui farmaci vengono ignorati nel 49-96% dei casi
  ([van der Sijs et al. 2006](https://pmc.ncbi.nlm.nih.gov/articles/PMC1447540)).

## Cosa ne segue per noi

Questa sezione è un'inferenza dai fatti sopra, non un fatto verificato. Le
proposte che ne nascono sono in [bozza-nodi.md](../bozza-nodi.md).

- Il collegamento semantico serve come rete di sicurezza e come suggerimento,
  non come collegamento. Quando l'autore lo conferma, diventa un normale
  collegamento per id.
- Vettori e punteggi possono stare solo in una cache derivata, con chiave
  modello, revisione, tipo numerico e backend. Mai nel sorgente, mai nel
  corpus di conformità. Con diecimila oggetti basta una scansione completa,
  senza un archivio vettoriale.
- Le rotture meccaniche si coprono con meccanismi deterministici, già nel primo
  livello:
  - l'id scritto nel file;
  - la rinomina fatta dal runtime;
  - l'id tolto alle copie;
  - un controllo dopo ogni merge o modifica esterna;
  - una traccia «sostituito da» per gli oggetti fusi o rimpiazzati.
- Un'impronta del bersaglio è deterministica, quindi può stare nel sorgente
  accanto all'id. Serve sia a ritrovare un bersaglio perso sia a vedere che il
  contenuto è cambiato. Si risolve prima per id, poi per impronta; se non
  basta, il collegamento resta visibile come orfano e si chiede all'autore.
- L'indice semantico è una cache locale che si può rigenerare, come
  `.smart-env/` di Smart Connections. Si può cominciare dal lessicale (BM25 con
  stemmer italiano), che non scarica niente, e aggiungere gli embedding dopo.
- La deriva va controllata al momento della modifica, con il diff. Un modello
  di embedding non vede che un capoverso dice il contrario del concetto: per
  questo servono un cross-encoder o un LLM attivato esplicitamente, oppure
  l'autore.
- I suggerimenti devono essere pochi, con una precisione intorno al 90%, e un
  suggerimento rifiutato non va riproposto.
- La qualità sull'italiano va misurata sul nostro corpus: la precisione dei
  suggerimenti di collegamento e del riaggancio, con la soglia scelta per il
  modello fissato.
