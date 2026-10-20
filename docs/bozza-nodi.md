# Bozza dei tipi di nodo, primo livello

La bozza è di Alessio. Le sezioni "Alessio" riportano le sue decisioni con
le sue parole o quasi. Le sezioni "Note di Claude" contengono domande e
proposte, che restano tali finché lui non le accetta. I nomi seguono il
[glossario](glossario.md).

Il primo livello copre il contenuto (testo, titoli, immagini, righe di
calcolo), lo spazio libero, la composizione `article` e lo `stylesheet`.

## 1. Attributi comuni a tutti i nodi

### Alessio (2026-10-20)

Prima di tutto i metadati comuni, opzionali:
- un **id**, non per forza numerico o incrementale, anche mnemonico;
- uno o più **tag di contesto**;
- il **tipo**;
- e forse altro.

Poi: gli attributi opzionali dipendono dal tipo.

Decisioni del 2026-10-20, sulle proposte di Claude:
- ogni nodo ha un `kind`; gli attributi globali sono `id` e `tags` su ogni
  `kind`, `class` e `lang` su ogni nodo che si vede; `lang` si eredita dal
  contenitore; gli altri attributi stanno nella scheda di ciascun `kind`;
- `tags` e `class` sono due attributi separati: i primi organizzano, le
  seconde danno l'aspetto.

### Note di Claude

- **Precedente.** È quasi esattamente l'`Attr` di Pandoc e gli attributi di
  Djot: un identificatore, un elenco di classi e coppie chiave-valore, scritti
  come `{#id .classe chiave=valore}`. Si può partire da lì.
- **Il tipo non è opzionale.** Ogni nodo ha un `kind`: è ciò che il nodo è, e
  nel testo lo dice il marcatore. Facoltativi sono gli altri attributi.
- **id.** Mnemonico va benissimo, ed è meglio per il diff e per l'AI
  (`vendite-q3` invece di `n4f2`). Restano da fissare tre cose:
  - unico in tutto il documento;
  - quali caratteri sono ammessi (proposta: minuscole, cifre e trattino, come
    i nomi del glossario);
  - se un id cancellato si può riusare (proposta: no, per non far puntare un
    vecchio riferimento a una cosa nuova).

  Se due rami di Git creano lo stesso id, il `runtime` lo segnala come
  conflitto. Dove l'id serve ma chi scrive non lo dà (un nodo richiamato da
  altrove, un `record`), il `runtime` ne genera uno corto.
- **Tag di contesto e agganci di stile.** Due usi da tenere distinti:
  - i tag dicono a cosa si riferisce un nodo ("cliente-x", "q3", "bozza") e
    servono a organizzare e filtrare nel `navigator`;
  - le `class` dicono come appare, e le usa lo `stylesheet`.

  Se sono la stessa cosa, cambiare un tag per riordinare il lavoro cambia
  l'aspetto del documento. Proposta: due attributi separati, `tags` e
  `class`.
- **Altro che può servire:**
  - `lang`, la lingua del contenuto. Serve alla sillabazione, al controllo
    ortografico e agli screen reader, e diventa l'attributo `lang` nell'HTML.
  - Un'etichetta leggibile, diversa dall'id, per mostrare il nodo nel
    `navigator`. Spesso basta il titolo o la didascalia.
- **Cosa non metterei negli attributi:**
  - **Date e autore.** Li ha già Git, e scriverli nel sorgente sporca il diff
    a ogni modifica.
  - **Un attributo "nascosto".** I casi di fughe di dati da righe e schede
    nascoste lo sconsigliano. Ciò che non deve uscire non sta in una
    `composition`.

### Note di Claude sugli attributi che dipendono dal tipo

- **Due strati, come in HTML.** HTML ha attributi globali, validi su ogni
  elemento (`id`, `class`, `lang`), e attributi propri di ciascun elemento
  (`alt` e `src` per un'immagine). Qui sarebbe lo stesso:
  - pochi attributi validi per ogni `kind`;
  - gli altri elencati nella scheda di ciascun `kind`, ognuno con il suo tipo
    e il suo valore predefinito.
- **Quali sono globali.** Proposta: `id` e `tags` su ogni `kind`; `class` e
  `lang` su ogni nodo che si vede. `lang` si eredita dal contenitore, come in
  HTML, così basta scriverlo una volta per il documento.
- **Attributi sconosciuti.** Per i `kind` del nucleo, un attributo non
  previsto è un errore: protegge dai refusi, per esempio `tagz`. Per i `kind`
  delle `extension` si conserva anche se non lo si capisce, come vale per la
  `directive`.

## 2. Il paragrafo come contenitore

### Alessio (2026-10-20)

Il paragrafo potrebbe essere già un contenitore, con dentro i capoversi, le
tabelle, le immagini e così via.

Decisioni del 2026-10-20, sulle proposte di Claude:
- il contenitore si chiama `section`, il capoverso `paragraph`;
- le sezioni si possono annidare;
- nel testo una sezione si apre con il suo titolo e si chiude al titolo
  successivo dello stesso livello o di livello superiore; il modello resta ad
  albero.

### Note di Claude

- **Il nome.** In italiano "paragrafo" è anche la sezione numerata (il §3.2),
  ed è il senso di Alessio. In inglese "paragraph" è il capoverso. Per non
  confonderli:
  - il contenitore è una `section`;
  - il capoverso è un `paragraph`.
- **Le sezioni dentro le sezioni.** Un capitolo con sottosezioni sì o no?
- **Contenitore esplicito o implicito.** Una sezione può essere un
  contenitore esplicito nel modello, ma nel testo può aprirsi semplicemente
  con il suo titolo e chiudersi al titolo successivo dello stesso livello.
  Pandoc fa così. Il modello resta ad albero, e promuovere un capoverso a
  titolo cambia una sola riga nel diff invece di spostare tutto il testo
  dentro un nuovo contenitore.
- **Sezioni senza titolo.** Una sezione può non avere un titolo, per esempio
  un gruppo di capoversi con una `class` comune?
- **La sezione come oggetto.** Un oggetto `text` sul `canvas` potrebbe essere
  proprio una sezione, e una `composition` di tipo `article` un elenco
  ordinato di sezioni. Così l'unità che si sposta, si archivia e si compone è
  la stessa.

## 3. Descrizione semantica e varianti

### Alessio (2026-10-20)

Sì alle tre domande: id unico nel documento, fatto di minuscole, cifre e
trattino, mai riusato dopo una cancellazione; sezioni senza titolo ammesse; la
sezione è l'oggetto `text`, cioè l'unità che si sposta sul `canvas`, si
archivia e si mette in una `composition`.

Poi un'idea nuova. Scrivendo un capoverso sarebbe bello avere in automatico
qualcosa di concettuale, di semantico, che descriva l'oggetto. Per ora è un
metadato predefinito; più avanti potrebbe assegnarlo un LLM via API. Da queste
descrizioni si ricava una mappa semantica e concettuale dell'intero insieme di
oggetti, da cui mettere insieme un documento abbozzato, da armonizzare poi. Così
un oggetto avrebbe anche versioni diverse di sé, a seconda del contesto.

### Note di Claude

- **Un nome da sistemare.** Nel glossario `part` è un file del documento.
  Qui il senso è "un pezzo del documento", cioè un `object`, per esempio una
  `section`: le versioni diverse sono dell'oggetto, non del file.
- **Precedenti.**
  - Per la mappa: Obsidian, Tana e Heptabase ricavano grafi di concetti dalle
    note.
  - Per le versioni diverse dello stesso pezzo: la documentazione tecnica le
    usa da anni con il testo condizionale e il riuso dei contenuti, per
    esempio DITA e FrameMaker. Un pezzo ha varianti per pubblico, lunghezza o
    lingua, e ogni pubblicazione sceglie la sua.
- **Come si incastra con il modello.** Molto bene:
  - la descrizione è un attributo, `summary`, più un elenco di concetti;
  - la mappa è una vista generata, la `concept map`;
  - una `variant` è una versione con nome di un oggetto (per esempio "breve",
    "tecnica", "inglese");
  - una `composition` sceglie quale `variant` usare quando fa `embed` di un
    oggetto, così il report usa la versione lunga e il `deck` quella breve
    dello stesso oggetto.
- **Il testo resta la base, quindi tre cautele.**
  - **Dove si salva.** Le descrizioni generate cambiano ogni volta che si
    rigenerano. Se stanno nel file del contenuto, sporcano il diff. Proposta:
    un `part` a sé per le descrizioni, con, per ogni voce, l'hash del
    contenuto descritto e il modello che l'ha generata. Si rigenera solo
    quando il contenuto cambia; prima di allora la descrizione si segnala come
    scaduta.
  - **Sono suggerimenti.** Vale la regola già decisa: descrizione,
    classificazione e abbozzo del documento generati dall'LLM sono `hint` che
    chi scrive conferma o corregge. Un abbozzo è una `composition` proposta,
    non scritta al posto suo.
  - **Le varianti invecchiano.** Se cambia un fatto nella versione lunga,
    quella breve diventa sbagliata. Proposta: ogni `variant` ricorda l'hash
    dell'oggetto da cui deriva, e quando l'oggetto cambia si segnala come
    scaduta. I numeri restano coerenti da soli se sono `reference` ai dati e
    non testo scritto a mano.
- **Privacy.** Mandare i documenti a un LLM esterno è un'uscita di dati.
  Proposta: va attivato esplicitamente; il fornitore è configurabile; è
  possibile usare un modello locale. È un'`integration` come le altre, con i
  suoi `permission`.
- **Dove sta nel percorso incrementale.** Proposta:
  - primo livello: l'attributo `summary`, scritto a mano o vuoto;
  - più avanti: la generazione automatica e la `concept map`;
  - poi: le `variant` e l'abbozzo di documento.

### Alessio (2026-10-20), seguito

Oppure si potrebbe partire anche dal concetto, che poi si sviluppa nel
contesto.

### Note di Claude sul partire dal concetto

- **Due direzioni, lo stesso modello.**
  - Dal testo al concetto: scrivi il capoverso e il concetto si ricava.
  - Dal concetto al testo: scrivi l'idea in una o due frasi, e da lì si
    sviluppa il testo per ciascun contesto, cioè le `variant`.

  È il modo di lavorare degli outliner (Workflowy, OmniOutliner) e dei CMS a
  contenuti strutturati, che scrivono il contenuto una volta e lo rendono per
  canali diversi.
- **Un nome solo per tutte e due.** `summary` va bene solo per la prima
  direzione: un riassunto viene dopo il testo. Proposta: `concept`, il nucleo
  semantico di un oggetto, che si può scrivere prima o ricavare dopo. Con
  `concept map` il nome resta coerente.
- **Due operazioni.** `develop`, dal `concept` a una `variant` di testo per un
  contesto; `distill`, dal testo al `concept`. Possono farle chi scrive o un
  LLM come `hint`.
- **Sapere chi ha scritto cosa.** Proposta: un attributo `origin` su
  `concept` e `variant`, che dice se è scritto da una persona o generato e
  confermato. Serve alla fiducia nel documento, e prima di pubblicare dice
  quali parti ha scritto un'AI.
- **Niente testo che cambia da solo.** Una `variant` sviluppata da un LLM si
  salva come testo e non si rigenera a ogni apertura. Si rigenera solo con un
  comando esplicito, e se il `concept` cambia si segnala come scaduta.
- **Con lo spazio libero.** Sul `canvas` si possono buttare giù solo concetti,
  come un elenco di idee, e svilupparli dopo.

## Domande aperte per Alessio

1. **Il nome `concept`** al posto di `summary`, visto che si può partire da
   tutte e due le parti?
2. **`origin`:** un attributo che dice se un `concept` o una `variant` è
   scritto da una persona o generato?
3. **Un `part` a sé per i `concept`,** fuori dal file del contenuto?
4. **Varianti:** versioni con nome di un oggetto, scelte dalla `composition`,
   segnalate come scadute quando l'oggetto cambia?
5. **LLM:** attivazione esplicita, fornitore configurabile, possibilità di un
   modello locale?
6. **Ordine:** `concept` a mano nel primo livello, generazione e mappa dopo,
   varianti e abbozzi dopo ancora?
7. **L'inventario dei `kind`:** quali tipi di blocco e in linea servono al
   primo livello.
