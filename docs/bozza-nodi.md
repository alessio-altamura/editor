# Bozza dei tipi di nodo, primo livello

La bozza è di Alessio. Il 2026-10-20 ha chiesto di raccogliere le sue idee in
qualcosa di sensato, e questa versione le ordina in un modello. Le sue idee,
con le sue parole o quasi e nell'ordine in cui sono arrivate, sono al §7. Nel
resto ciò che è suo non porta segni, e le proposte di Claude sono segnate
*(proposta)*. La versione precedente, con le note di Claude una per una, è
nella storia di Git (commit 779ca49). I nomi seguono il
[glossario](glossario.md) e, salvo dove è detto, sono ancora proposte.

Il primo livello copre il contenuto (testo, titoli, immagini, righe di
calcolo), lo spazio libero, la composizione `article` e lo `stylesheet`.

## 1. Il modello

Ci sono tre cose, ciascuna nei suoi file.

**Il concetto.** È l'unità di significato: un'idea in una o due frasi, con i
suoi metadati e i collegamenti ai suoi sviluppi. È il primo raccoglitore di
idee: lo si può scrivere prima e poi svilupparlo, oppure ricavarlo dopo da
qualcosa di già scritto. Nome: `concept` (deciso il 2026-10-20).

**Gli sviluppi.** Ogni sviluppo è un file a sé, del tipo adatto al contenuto:
un testo, una tabella, un grafico, un'immagine (orientamento di Alessio:
"forse preferisco file linkati"). Nome: `object`, con il suo `kind` (deciso il
2026-10-20). Lo stesso
concetto si sviluppa in più oggetti, anche di tipi diversi, e lo stesso
oggetto può servire a più concetti. Gli oggetti si collegano anche fra loro: un
grafico alla tabella da cui nasce, un'immagine alla tabella che rappresenta.

**I contesti.** Sono le composizioni: `article`, `deck`, `webpage`. Il concetto
non sa in quali contesti è usato: è il contesto che punta lo sviluppo che gli
serve. La composizione punta l'oggetto, che può avere o no un collegamento a
un concetto (deciso il 2026-10-20).

*(proposta)* La struttura di lettura (capitoli, titoli, ordine) sta nelle
composizioni, non nei concetti né negli oggetti. Concetti e oggetti formano un
insieme piatto, e ogni composizione ci costruisce sopra il suo albero. È il
modello di DITA, con argomenti piatti e mappe gerarchiche.

Tutti i file stanno insieme, mescolati, e l'app li filtra per livello e per
tipo: i livelli non sono cartelle. Sul `canvas` si buttano giù concetti e
oggetti anche in disordine, e poi si classificano e si collegano.

Si arriva a un documento per tre strade:
- **dall'idea:** scrivi il concetto e ne fai `develop` in uno o più oggetti;
- **dal testo:** scrivi un oggetto e ne ricavi il concetto con `distill`;
- **dalla mappa:** dai concetti di tutti gli oggetti si ricava una
  `concept map`, e da lì un documento abbozzato, da armonizzare.

Un LLM può proporre concetti, sviluppi e abbozzi, ma sempre come `hint` che chi
scrive conferma o corregge.

## 2. L'esempio di Alessio, in file

Un concetto scritto come capoverso e rappresentato da una tabella e dal grafico
della tabella; un secondo concetto associato alla stessa tabella e a
un'immagine che la rappresenta. Con il `kind` nell'estensione del nome di file
*(proposta, §4)*:

```
calo-q3.concept.md          concetto: nel terzo trimestre le vendite calano
                            per i ritardi nelle consegne; collega
                            calo-q3-sintesi, vendite-2026, vendite-mensili
calo-q3-sintesi.md          text: il capoverso che lo sviluppa
vendite-2026.csv            collection: la tabella
vendite-2026.schema.json    lo schema della tabella
vendite-mensili.chart.json  chart: prende i dati da vendite-2026
lavagna-vendite.jpg         image: una foto della lavagna, rappresenta
                            vendite-2026
margini-q3.concept.md       secondo concetto: collega vendite-2026 e
                            lavagna-vendite
report-q3.article.md        composition: usa calo-q3-sintesi e
                            vendite-mensili
riunione-q3.deck.md         composition: usa lavagna-vendite
```

L'estensione del testo dipende dalla sintassi, che non è ancora decisa: `.md`
è un segnaposto.

## 3. I collegamenti

I collegamenti fra concetti e oggetti sono bilaterali: si possono scrivere da
una parte, dall'altra o da entrambe, indifferentemente (deciso il 2026-10-20;
la proposta di Claude era farli scrivere solo al file che dipende).

*(proposte)* Cosa ne segue:
- **Il collegamento esiste se almeno uno dei due file lo dichiara.** Il
  `runtime` calcola l'unione e il `navigator` mostra tutte e due le
  direzioni: da un concetto i suoi oggetti, da una tabella i concetti che la
  usano.
- **Per toglierlo va tolto da tutte e due le parti.** Lo fa un comando del
  `runtime`; a mano, se resta da una parte, il collegamento resta.
- **Scriverlo nella tabella condivisa ha un prezzo,** e lo sceglie chi scrive:
  il file della tabella cambia, e chi lavora sui dati può andare in conflitto
  con chi lavora sui concetti. Il formatter non sposta i collegamenti da una
  parte all'altra.
- **Associazioni e dipendenze.** Il bilaterale vale per le associazioni:
  concetto e oggetto, l'immagine che rappresenta una tabella. Le dipendenze
  restano nel file che dipende, perché senza non si può risolvere: il grafico
  scrive da quale tabella prende i dati, la composizione scrive cosa usa
  (questo era già deciso: il contesto punta, l'oggetto non lo sa).

## 4. Proposte che ne seguono *(proposte)*

- **Attributi.** Ogni file ha `id`, `tags`, `lang` e `origin`. Gli oggetti
  hanno anche il `kind`, obbligatorio, e la `class`. Gli altri attributi
  dipendono dal `kind`. Le decisioni già prese restano:
  - l'id è unico, fatto di minuscole, cifre e trattino, e non si riusa mai;
  - `tags` e `class` sono attributi separati.

  Una sola cambia forma: `lang` si ereditava dal contenitore, ma con i file
  piatti si eredita dal documento.
- **Il `kind` nell'estensione del nome di file.** Per esempio `.concept.md`,
  `.csv` con il suo `.schema.json`, `.chart.json` e `.article.md`. Con tutti i
  file in una cartella è il modo di filtrarli anche senza l'app
  (`ls *.concept.md`). In più gli altri programmi aprono ciò che riconoscono,
  per esempio un CSV in qualunque foglio di calcolo. Il `kind` resta scritto
  anche dentro il file, che è la fonte di verità, e il `runtime` controlla che
  i due coincidano.
- **Collegamenti da rivedere.** Ogni collegamento ricorda l'hash dei due file
  al momento della conferma. Se uno dei due cambia, il collegamento si segnala
  da rivedere:
  - se cambia il concetto, i suoi sviluppi potrebbero non esprimerlo più;
  - se cambia la tabella, il grafico si ricalcola da solo, ma il capoverso che
    ne parla e la foto della lavagna potrebbero essere superati.

  Nessuno sviluppo si riscrive da solo: un LLM può proporre la correzione come
  `hint`.
- **Un'immagine generata non è un oggetto.** Se l'immagine è la tabella
  disegnata dal `runtime`, è una vista generata, come il grafico, e non si
  salva come file. È un oggetto solo un'immagine fatta fuori, come una foto o
  un disegno, con il suo collegamento alla tabella.
- **Niente varianti con nome.** Prima le varianti stavano dentro l'oggetto, si
  sceglievano per nome e una di loro era la predefinita. Con i file collegati
  non servono più: due versioni di una frase per due contesti sono due oggetti
  `text` collegati allo stesso concetto, e ogni composizione punta per id
  quella che le serve. Spariscono il nome della variante, la variante
  predefinita e il ripiego su di essa.
- **La composizione punta gli oggetti con `embed` per id.** Quale concetto sta
  presentando lo si ricava dai collegamenti dell'oggetto, se ne ha.
- **Un oggetto senza concetto va bene.** L'app può proporre di ricavarlo con
  `distill`.
- **Vista piatta.** Un comando della `cli` stampa una composizione intera come
  un testo unico, nell'ordine di lettura e in sola lettura. Serve a chi legge e
  all'AI.
- **Nomi di file leggibili.** Se chi scrive non dà un id, il `runtime` lo
  ricava dalle prime parole.
- **Rimaste dalle note precedenti:**
  - niente date e autore negli attributi, perché li ha già Git;
  - niente attributo "nascosto": ciò che non deve uscire non sta in una
    composizione;
  - un attributo sconosciuto è un errore per i `kind` del nucleo, e si
    conserva per quelli delle `extension`;
  - l'LLM si attiva esplicitamente, il fornitore è configurabile ed è
    possibile usare un modello locale.

## 5. Cosa cambia rispetto a prima

- **I file.** Era deciso "un file per livello"; ora c'è un file per ogni
  concetto e per ogni oggetto, e i livelli diventano filtri dell'app
  (orientamento di Alessio).
- **La gerarchia.** Prima era decisa per il contenuto: sezioni annidate e
  aperte dal titolo, sezioni senza titolo ammesse, la sezione come oggetto
  `text`. Ora sta nelle composizioni (proposta). La sezione come contenitore
  non c'è più.
- **Il concetto.** Era un attributo dell'oggetto; ora è un file a sé che
  collega i suoi sviluppi. La struttura è di Alessio, i nomi sono proposte.
- **I nomi section e paragraph** sono ritirati. Erano proposte di Claude,
  e Alessio ha detto di non badare alla parola section.
- **Le varianti** dentro l'oggetto lasciano il posto a oggetti collegati.

## 6. Domande per Alessio

Le prime tre domande del 2026-10-20 (i nomi, chi scrive i collegamenti, cosa
punta la composizione) hanno avuto risposta: vedi i §1 e §3.

1. **Concetti che collegano altri concetti?** Per esempio un'idea generale con
   le sue idee di dettaglio. Sarebbe la base della `concept map` e
   dell'abbozzo di composizione.
2. **Il `kind` nell'estensione del nome di file, e i `kind` del primo
   livello.** Per ora sarebbero il concetto, il testo, l'immagine e la
   composizione `article`; `collection` e `chart` arrivano con i livelli dei
   dati e dei grafici.
3. **Associazioni e dipendenze:** il bilaterale vale per le associazioni,
   mentre le dipendenze (il grafico dalla tabella, la composizione
   dall'oggetto) restano nel file che dipende?

## 7. Le idee di Alessio, in ordine (2026-10-20)

1. Prima di tutto i metadati comuni, opzionali: un id, non per forza numerico o
   incrementale, anche mnemonico; uno o più tag di contesto; il tipo; e forse
   altro. Il paragrafo potrebbe essere già un contenitore, con dentro i
   capoversi, le tabelle, le immagini e così via.
2. Gli attributi opzionali dipendono dal tipo.
3. Sì alle proposte di Claude:
   - ogni nodo ha un `kind`;
   - `id` e `tags` su ogni `kind`, `class` e `lang` sui nodi che si vedono, e
     `lang` si eredita;
   - `tags` e `class` sono separati;
   - le sezioni si annidano e si aprono con il titolo.
4. Sì anche a queste:
   - l'id è unico, fatto di minuscole, cifre e trattino, e mai riusato;
   - le sezioni senza titolo sono ammesse;
   - la sezione è l'unità che si sposta, si archivia e si compone.
5. Scrivendo un capoverso sarebbe bello avere in automatico qualcosa di
   concettuale, di semantico, che descriva l'oggetto. Per ora è un metadato
   predefinito; più avanti potrebbe assegnarlo un LLM. Dalle descrizioni si
   ricava una mappa semantica di tutti gli oggetti, e da lì un documento
   abbozzato, da armonizzare. Un oggetto avrebbe anche versioni diverse di sé,
   a seconda del contesto.
6. Oppure si potrebbe partire dal concetto, che poi si sviluppa nel contesto.
7. Il concetto come primo raccoglitore di idee, che poi diventano un tipo o più
   tipi.
8. Ogni oggetto è un file, anche il capoverso.
9. Il capoverso ha i metadati predefiniti, con il concetto. Il concetto lo
   posso sviluppare come bozza, come frase del contesto 1, frase del contesto
   2, grafico del contesto 3. Il contesto non è collegato nell'oggetto: è il
   contesto che punta il tipo desiderato.
10. I livelli sono cartelle, ma forse nemmeno: lascerei tutto mescolato, e lo
    filtra la nostra app.
11. Sto sparando idee: aiutami a raccoglierle in qualcosa di sensato. Non
    badare alla parola section: l'ho usata mentre pensavo ad altro.
12. Quindi un oggetto con dentro il concetto, i metadati e lo sviluppo, anche
    con tipi diversi. Lo sviluppo potrebbe stare in file collegati o tutto in
    un unico file. Forse preferisco file collegati, per cambiare il tipo a
    seconda del contenuto. Immagina un concetto scritto come capoverso e
    rappresentato da una tabella e dal grafico associato; magari anche più
    concetti associati alla stessa tabella, o a un'immagine che rappresenta la
    tabella.
13. Sì ai nomi `concept` e `object`. E se i collegamenti li facessimo
    bilaterali? Posso esserci da un lato, dall'altro o da entrambi,
    indifferentemente. Con i bilaterali, sulla composizione, sarebbe
    indifferente se manca il collegamento bilaterale; o meglio: dovrebbe
    puntare l'oggetto, che può avere o no un collegamento al concetto.
14. Il problema del collegamento meccanico, e non semantico, è che si può
    rompere: sarebbe da aggiungere un collegamento generato in automatico per
    semantica. Non so quanto sia semplice.
