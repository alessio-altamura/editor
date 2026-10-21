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
insieme piatto, e ogni composizione ci costruisce sopra il suo albero.
Somiglia alle mappe di DITA, che danno gerarchia e ordine agli argomenti; in
DITA però ogni argomento ha il suo titolo, mentre qui i titoli starebbero
nelle composizioni (correzione della revisione del 2026-10-20).

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
barre-mensili.template.json template: barre, x un mese, y un numero
vendite-mensili.chart.json  chart: applica barre-mensili a vendite-2026
                            (proposta del §3, il grafico come template)
lavagna-vendite.jpg         image: una foto della lavagna, rappresenta
                            vendite-2026
margini-q3.concept.md       secondo concetto: collega vendite-2026 e
                            lavagna-vendite
report-q3.article.md        composition: usa calo-q3-sintesi e
                            vendite-mensili
riunione-q3.deck.md         composition: usa lavagna-vendite
```

L'estensione del testo dipende dalla sintassi, che non è ancora decisa: `.md`
è un segnaposto. Una nota della revisione del 2026-10-20: un `.csv` non ha
posto per l'`id` e gli altri attributi che il §4 dà a ogni file. Un'immagine
sì, ma nei metadati binari (i chunk di testo del PNG, i commenti del JPEG):
il file va riscritto, il diff non li mostra e alcuni programmi li tolgono.
Serve quindi un file di testo che li descriva, o un'altra regola; la bozza di
specifica lo tratta nel suo punto aperto sui `kind` del primo livello.

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

### Il grafico come template

Alessio (2026-10-20): il grafico potrebbe essere un template? Un modo di vedere
una tabella, che si applica a dati diversi in un oggetto.

*(note e proposte di Claude)*
- **Si incastra con ciò che è già deciso.** Una tabella ha più viste dello
  stesso elenco, fra cui il grafico. Nel glossario il `template` è già una
  forma riutilizzabile senza contenuto, finora per composizioni e
  `stylesheet`. Il grafico diventa due cose:
  - **il template**, che dice come si vede una tabella: il tipo di grafico, i
    ruoli (asse x, asse y, serie) e il tipo di dato che ogni ruolo accetta. Non
    nomina nessuna tabella;
  - **l'oggetto `chart`**, che applica un template a una `collection`: dice
    quale campo va in ogni ruolo, con un eventuale filtro (per esempio solo il
    2026). È questo che un concetto collega e che una composizione usa.
- **Precedenti.**
  - ggplot2 separa i dati dalla descrizione del grafico e permette di
    sostituire i dati di un grafico già fatto: prima con l'operatore `%+%`,
    deprecato dalla versione 4.0.0 in favore di `+`
    ([gg-add](https://ggplot2.tidyverse.org/reference/gg-add.html)).
  - In Vega-Lite una specifica può dichiarare i dati solo con un nome e
    riceverli dopo: «Provide a placeholder name and bind data at runtime»
    ([data](https://vega.github.io/vega-lite/docs/data.html)).
  - Excel salva un grafico come template `.crtx` e lo applica a dati nuovi o a
    un grafico esistente. Il template porta con sé i suoi colori, che
    prevalgono su quelli del tema del documento
    ([supporto](https://support.microsoft.com/en-us/office/save-a-custom-chart-as-a-template-259a5f9d-a9ec-4b3f-94b6-9f5e55187f2a)).
- **I ruoli hanno un tipo, e lo schema permette di controllarlo.** I tipi dei
  campi stanno già nello schema della tabella (deciso). Il `runtime` può quindi
  verificare l'applicazione: un campo di testo sull'asse y è un errore, non un
  grafico sbagliato. Se chi scrive non dice quale campo va dove, il `runtime`
  propone un abbinamento dai tipi, come `hint`.
- **L'aspetto resta nello `stylesheet`.** Il template dice che grafico è, non i
  colori e i caratteri. Così lo stesso template appare coerente nell'articolo
  e nella presentazione. È la differenza da Excel, dove il template porta
  colori propri che scavalcano il tema.
- **Risponde alla domanda sulle dipendenze, per i grafici.** Il template non
  dipende da niente. L'oggetto `chart` dipende dal template e dalla tabella, e
  scrive tutti e due i collegamenti.
- **Si può estendere a tutte le viste.** Anche la griglia, la board e il
  calendario sono modi di vedere una tabella: template con i loro ruoli (per la
  board il campo per cui raggruppare, per il calendario il campo data). Sarebbe
  un solo meccanismo per tutte le viste.
- **Più dati nello stesso oggetto.** Alessio (2026-10-20): affiancati,
  selezionabili o altro, dipende dal template. Per esempio le vendite nel mese,
  in cui si scorrono i mesi, o le vendite di diversi tipi di prodotto
  nell'anno.

  *(note e proposte di Claude)*
  - **È il template a decidere cosa fare di una dimensione in più.** Oltre agli
    assi, un template può avere tre ruoli per una dimensione della tabella:
    - **serie:** i valori stanno nello stesso grafico, per esempio una linea
      per ogni tipo di prodotto lungo l'anno;
    - **affiancati:** un grafico per ogni valore, uno accanto all'altro, per
      esempio un grafico per regione;
    - **selettore:** si vede un valore alla volta e chi legge lo cambia, per
      esempio scorrendo i mesi.

    Le tabelle multidimensionali sono già decise, con le dimensioni dichiarate
    nello schema. Il `runtime` sa quindi quali campi sono dimensioni e può
    controllare che vadano in questi ruoli.
  - **Precedenti.**
    - Vega-Lite affianca con facet e repeat
      ([repeat](https://vega.github.io/vega-lite/docs/repeat.html)), e lega un
      parametro a un elemento di input, come uno slider o un menu, per
      sceglierne il valore
      ([bind](https://vega.github.io/vega-lite/docs/bind.html)).
    - ggplot2 affianca con i facet
      ([facet_wrap](https://ggplot2.tidyverse.org/reference/facet_wrap.html)).
    - Tableau ha il Pages shelf. Divide una vista in pagine, una per ogni
      valore di una dimensione, e chi la guarda le scorre con un menu, con i
      pulsanti avanti e indietro, con uno slider o in riproduzione automatica
      ([help](https://help.tableau.com/current/pro/desktop/en-us/buildmanual_shelves.htm)).
  - **Il selettore è HTML vivo, già deciso.** Nella pagina HTML chi legge
    cambia il valore e il grafico si ridisegna. L'oggetto `chart` può indicare
    il valore mostrato all'inizio. Quello che sceglie chi legge non si scrive
    nel sorgente.
  - **Resta da decidere la forma stampata.** Il PDF non si scorre. Due
    possibilità: stampare il valore mostrato al momento dell'export, come i
    valori fotografati già decisi, oppure stampare tutti i valori affiancati.
    Proposta: lo dichiara il template, con l'export fotografato come
    predefinito.

  Alessio (2026-10-20), seguito: un template potrebbe fare anche da
  aggregatore; oppure un nuovo oggetto aggregatore che usa lo stesso template
  potrebbe essere più nello spirito.

  *(note e proposte di Claude)*
  - **L'oggetto aggregatore è più nello spirito, sono d'accordo.** Ogni pezzo
    fa una cosa sola:
    - il template dice come si vede un insieme di dati;
    - l'oggetto `chart` lo applica a una tabella;
    - l'aggregatore ripete lo stesso template su più dati e dice come
      mostrarli: affiancati o con un selettore.

    Vega-Lite fa così: facet è un operatore di composizione a parte, che
    contiene la specifica della vista da ripetere («A specification of the
    view that gets faceted»,
    [facet](https://vega.github.io/vega-lite/docs/facet.html),
    [composizione](https://vega.github.io/vega-lite/docs/composition.html)).
  - **La serie resta nel template.** Più linee nello stesso grafico, per
    esempio una per tipo di prodotto, sono un grafico solo: è un ruolo del
    template, non un'aggregazione. All'aggregatore vanno gli affiancati e il
    selettore.
  - **Cosa scrive l'aggregatore:** il template, i dati e come mostrarli. I
    dati possono essere:
    - una tabella e la dimensione che la divide, per esempio le vendite divise
      per mese;
    - più tabelle con la stessa forma, per esempio le vendite del 2025 e del
      2026. Questo un template da solo non lo saprebbe fare.

    Il `runtime` controlla ogni pezzo contro i ruoli tipizzati del template,
    come per l'oggetto `chart`. Il valore iniziale del selettore e la forma
    stampata passano all'aggregatore.
  - **Non è una composizione.** Una composizione ordina oggetti diversi per la
    lettura. L'aggregatore ripete lo stesso template su dati diversi, ed è un
    oggetto: un concetto lo può collegare e una composizione lo può usare.
    Grafici diversi uno accanto all'altro, come in un cruscotto, restano
    compito della composizione.
  - **Il nome.** Nel linguaggio dei dati "aggregare" vuol dire anche calcolare
    somme e medie per gruppo, come le funzioni di aggregazione di SQL, e
    funzioni così ci saranno anche nelle formule. Un nome inglese come
    aggregator verrebbe letto in quel senso, anche da un'AI. Il nome resta da
    scegliere.

  Alessio (2026-10-20), seguito: potrebbe essere come la section per le
  pagine, un aggregatore di dati.

  *(note di Claude)*
  - **L'analogia regge.** In Word una sezione raccoglie delle pagine e applica
    loro le sue impostazioni (orientamento, margini, intestazioni).
    L'aggregatore raccoglie dei dati e applica loro il suo template e il suo
    modo di mostrarli.
  - **La differenza che conta.** Una sezione contiene cose diverse, in ordine
    di lettura. L'aggregatore contiene dati della stessa forma, tutti visti con
    lo stesso template, ed è per questo che il `runtime` può controllarli.
  - **Dove sta.** Nella proposta del §1 le sezioni, cioè capitoli e titoli,
    stanno nelle composizioni. L'aggregatore invece resta un oggetto, perché un
    concetto lo deve poter collegare. L'analogia vale quindi per quello che fa,
    non per dove sta.
- **I template si possono distribuire,** come le altre `extension`: un
  catalogo di grafici pronti, coerente con l'orientamento sul marketplace.

### Collegamenti che si rompono

Alessio (2026-10-20): il collegamento meccanico, e non semantico, si può
rompere; sarebbe da aggiungere un collegamento generato in automatico per
semantica.

*(proposte di Claude, dalla ricerca in
[ricerca/collegamenti-semantici.md](ricerca/collegamenti-semantici.md))*

Generare collegamenti per significato è semplice: un modello locale da circa
100 MB, pochi millisecondi per capoverso, in Node e nel browser. Però non può
prendere il posto del collegamento per id, per tre motivi:
- non dà gli stessi numeri su backend e macchine diversi;
- non distingue bene antonimi, negazioni e numeri: nella nostra misura «le
  vendite calano» è più vicina a «le vendite crescono» che a una vera
  parafrasi;
- nel proporre collegamenti nuovi sbaglia spesso: Add a link di Wikipedia ha
  precisione 0,84 sulla Wikipedia italiana, quindi circa un suggerimento su
  sei non coincide con i collegamenti messi dalle persone.

Proposta: tre strati, dal più semplice.

1. **Meccanico, nel sorgente.** Copre le rotture più comuni senza semantica.
   - L'id è scritto dentro il file, quindi rinominare il file non rompe niente.
   - Cambiare un id, o rinominare dall'app, passa dal `runtime`, che riscrive i
     collegamenti.
   - Una copia perde l'id e ne riceve uno nuovo.
   - Quando un oggetto si divide, l'id resta a una delle due parti e i suoi
     collegamenti si segnalano da rivedere.
   - Quando un oggetto viene fuso in un altro o sostituito, resta una traccia
     «sostituito da», e i collegamenti al vecchio id si risolvono sul nuovo,
     come in Zotero. L'id vecchio non si riusa, come già deciso.
   - Dopo ogni merge e ogni modifica esterna, il `runtime` controlla tutti i
     collegamenti. Uno che non si risolve è un errore visibile, mai un salto
     silenzioso. Git questo controllo non lo fa: se un ramo cancella un oggetto
     e un altro lo collega, non c'è conflitto.
2. **L'impronta, nel sorgente.** Ogni collegamento confermato ricorda, oltre
   all'id, poche parole del bersaglio e il suo hash. Per un concetto basta la
   sua frase; per un oggetto, per esempio, i termini più caratteristici. Se il
   collegamento è scritto da tutte e due le parti, ciascuna ricorda l'impronta
   dell'altra. L'impronta è deterministica, quindi può stare nel testo, e serve
   a due cose:
   - se l'id non si risolve, il `runtime` cerca il bersaglio per impronta e
     propone i candidati;
   - se l'hash non coincide più, il collegamento si segnala da rivedere (vedi
     il §4).

   Qualcosa di simile fanno Phelps e Wilensky, con cinque parole accanto
   all'URL, e il W3C e Hypothesis, con una citazione accanto alla posizione.
3. **Il semantico, calcolato e mai salvato nel sorgente.** È un indice locale,
   una cache che si butta e si rigenera, con i vettori di concetti e oggetti.
   Fa tre cose, sempre come `hint`:
   - propone i candidati per un collegamento rotto: è il caso facile, una
     scelta fra pochi;
   - propone collegamenti nuovi fra concetti e oggetti: è il caso difficile,
     quindi pochi suggerimenti, soglia alta, e un suggerimento rifiutato non
     torna;
   - quando un oggetto cambia, confronta la modifica con i concetti collegati e
     segnala quelli che forse non esprime più. Gli embedding non vedono
     negazioni e numeri, quindi questo lo fanno bene solo un LLM, attivato
     esplicitamente, o l'autore.

   Un suggerimento confermato diventa un collegamento normale, per id e con la
   sua impronta.

**L'ordine.** Gli strati 1 e 2 vanno nel primo livello, perché sono semplici e
deterministici. Lo strato 3 arriva con gli `hint` dell'LLM e la `concept map`:
prima lessicale (BM25 con stemmer italiano, senza scaricare modelli), poi con
un modello di embedding fissato.

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
- **Collegamenti da rivedere.** Ogni collegamento ricorda l'impronta e l'hash
  del bersaglio al momento della conferma (§3). Se il bersaglio cambia, il
  collegamento si segnala da rivedere:
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
4. **I tre strati contro i collegamenti che si rompono:** meccanico e impronta
   nel sorgente, semantico solo calcolato e proposto?
5. **I rifiuti dei suggerimenti:** in un file del documento, condiviso con chi
   ci lavora, o solo nella cache locale? Propongo il file del documento: i
   promemoria ripetuti vengono accettati sempre meno (Ancker et al., nella
   ricerca), e la cache si perde quando si rigenera.
6. **Il grafico come template:** il template dice come si vede una tabella, con
   ruoli tipizzati e senza dati; l'oggetto `chart` lo applica a una
   `collection`, con il campo per ogni ruolo. Ti torna? Sui dati in più hai
   risposto, e poi hai proposto un oggetto aggregatore (§3). Proposta: la
   serie resta un ruolo del template, gli affiancati e il selettore vanno
   all'aggregatore.
7. **Tutte le viste come template:** griglia, board e calendario funzionano
   allo stesso modo del grafico?
8. **L'aggregatore con selettore nel PDF:** si stampa il valore mostrato
   all'export, oppure tutti i valori affiancati? Propongo che lo dichiari
   l'aggregatore, con l'export fotografato come predefinito.
9. **Il nome dell'aggregatore,** evitando aggregator, che nei dati vuol dire
   somme e medie per gruppo.

## 7. Le idee di Alessio, in ordine (2026-10-20)

1. Prima di tutto i metadati, comuni e opzionali. Comuni: un id, non per forza
   numerico o incrementale, anche mnemonico; uno o più tag di contesto; il
   tipo; e forse altro. (Correzione del 2026-10-21: i due gruppi erano stati
   letti come «comuni, quindi opzionali».) Il paragrafo potrebbe essere già un contenitore, con dentro i
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
15. Il grafico potrebbe essere un template? Un modo di vedere una tabella, che
    si applica a dati diversi in un oggetto.
16. Affiancato o selezionabile o non so: dipende dal template. Per esempio le
    vendite nel mese, in cui si scorrono i mesi, o le vendite di diversi tipi
    di prodotto nell'anno.
17. Un template potrebbe fare anche da aggregatore; oppure un nuovo oggetto
    aggregatore che usa lo stesso template potrebbe essere più nello spirito.
18. Potrebbe essere come la section per le pagine, un aggregatore di dati.
19. Lo spirito di ogni cosa deve essere l'aspetto incrementale: gli stessi
    mattoni possono dare documenti o presentazioni completamente diversi.
20. Sulla bozza di specifica: 1 ok. 2 sono indeciso: sarebbe un'eccezione, e
    come faresti con più metadati? 3 ok. 4 ok, anche se deve essere possibile
    usare una funzione dichiarata in un altro file, con argomenti sia numerici
    sia elementi della stessa lista, o anche range. 5 aiuto per decidere. 6 non
    li conosco: valutiamoli tutti e due, o un formato nostro, o anche Markdown
    con una sintassi nostra, tipo Obsidian. 7 forse dovrebbe essere un
    aggregatore di testi, come un indice dettagliato?
21. 2 ok, un blocco per text. 5 il runtime. 4 un intervallo di valori di un
    campo, o tutta la colonna.
22. Ma perché abbiamo eliminato gli id? No, il fraintendimento era un altro:
    era una divisione fra metadati comuni e metadati opzionali, che dipendono
    dal tipo.
23. 1i; per gli altri punti ok ai tuoi suggerimenti. Unica cosa: in Markdown
    come trattiamo la sua impaginazione? Non rischiamo di avere
    sovrapposizioni?
24. Ok, confermo anche le proposte nuove.
25. (Scritto alla sottosessione della specifica, sulla riga `---` che la bozza
    vietava.) Ammettila come linea, con le righe vuote dal formatter se teniamo
    md.
26. Ok a tutti i tuoi suggerimenti. Unico dubbio: se voglio mettere un oggetto
    in mezzo a un testo, devo spezzare per forza il testo? O esiste un modo in
    linea di inserirlo?
27. Ok, va bene così: per ora vietati. E forse ancora di più: anche nel caso
    di un collegamento dentro al testo o di una formula, l'impaginazione finale
    viene sempre da fuori e non da dentro.
28. Per la scrittura sui file, diretta o tradotta dall'app, io farei: solo
    numero più un separatore per i decimali, che sia «.» o «,». Valuterei se
    aggiungere, non so come si chiamano, K M T (per esempio 1K è 1000), oltre
    alla notazione scientifica.
29. Hai ragione, facciamo solo «.» per i decimali. Attenzione: un italiano che
    scrive nell'app scrive come è abituato, ma il file salvato conterrà
    unità.decimali.
