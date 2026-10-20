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

## Domande aperte per Alessio

1. **id:** unico nel documento, solo minuscole, cifre e trattino, mai
   riusato dopo una cancellazione?
2. **Sezioni senza titolo:** ammesse, per esempio per raggruppare capoversi
   con una `class` comune?
3. **La sezione come oggetto `text`:** è l'unità che si sposta sul `canvas`,
   si archivia e si mette in una `composition`?
4. **L'inventario dei `kind`:** quali tipi di blocco e in linea servono al
   primo livello.
