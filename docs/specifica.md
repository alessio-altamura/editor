# Specifica: nucleo e primo livello

Prima bozza, 2026-10-20. Non è normativa finché Alessio non la approva: ogni
requisito qui sotto è deciso solo dove rimanda a una decisione di
[contesto.md](contesto.md). I nomi seguono il [glossario](glossario.md).

## 0. Come leggere questa bozza

**Marcature.** Ogni requisito porta una di tre marcature.
- Nessuna marcatura: deciso. Il rimando è fra parentesi quadre, con le prime
  parole della voce di contesto.md, per esempio [C: «Ogni oggetto è un
  file»]. Dove la decisione sta solo in [bozza-nodi.md](bozza-nodi.md) il
  rimando è [B: §7, idea N], e la voce manca ancora in contesto.md.
- *(proposta)*: viene dalla bozza dei nodi, dall'orchestratore o da chi ha
  scritto questa bozza; resta da confermare.
- **APERTO**: un punto che blocca il primo livello. Ha le opzioni e i loro
  costi, senza una scelta.

**Sintassi provvisoria.** La sintassi dei file di testo è APERTA (§0.3). Gli
esempi usano CommonMark con un'intestazione YAML fra due righe `---`, e per
l'`embed` la forma `![[id]]` di Obsidian. È solo un modo di scrivere gli
esempi: l'esempio 1 è dato in tutte e due le candidate, e l'albero risolto
atteso non cambia con la sintassi. L'estensione `.md` è un segnaposto, come
nella bozza dei nodi.

**Gli esempi sono test** *(proposta)*. Come nella specifica di CommonMark, gli
esempi numerati sono anche il `conformance suite` del livello. Ogni esempio è
un blocco di codice aperto da quattro backtick e dall'etichetta
`example N`. Dentro, ogni file comincia con una riga `>>> ` seguita dal suo
percorso; l'ultima sezione, `>>> resolved`, è il `resolved tree` atteso in
JSON (§11). Uno script estrae i blocchi, scrive i file in una cartella vuota,
esegue il `runtime` e confronta l'albero, ignorando i campi `message` e `fix`
dei `diagnostic`, che non sono normativi.

### 0.1 APERTO: i `kind` del primo livello e il `kind` nel nome del file

La bozza dei nodi propone quattro `kind` per il primo livello: `concept`,
`text`, `image` e la `composition` `article`; questa bozza aggiunge lo
`stylesheet`, che è un file anche lui. Chiede anche se il `kind` vada
nell'estensione del nome (bozza-nodi.md §4 e §6, domanda 2).

- **A. Il `kind` nell'estensione** (`calo-q3.concept.md`, `report.article.md`).
  Si filtra senza l'app (`ls *.concept.md`) e gli altri programmi aprono ciò
  che riconoscono. Costi: il `kind` è scritto due volte e il `runtime` deve
  controllare che coincidano (errore `kind-extension-mismatch`, esempio 15);
  cambiare `kind` con `turn into` vuol dire rinominare il file, e Git vede una
  cancellazione più una creazione; le estensioni doppie sono poco comode in
  alcuni editor e sistemi.
- **B. Il `kind` solo dentro il file**, con un'estensione unica per tutti i
  file di testo. Una fonte sola e nessuna rinomina al cambio di `kind`. Costi:
  per filtrare servono l'app, la `cli` o un `grep`; un altro programma non sa
  cosa contiene il file.
- **C. L'estensione solo dove il formato la impone** (`.css`, `.jpg`, e più
  avanti `.csv`), il `kind` dentro il file per tutto il resto. Costi: due
  regole invece di una.

Lo stesso punto decide se un'immagine ha un file di testo che la descrive
(§7.2) e come uno `stylesheet` dichiara il suo `id` (§9). Gli esempi usano A,
che è la proposta della bozza.

### 0.2 APERTO: gli strati 1 e 2 contro le rotture dei collegamenti

La bozza dei nodi (§3) propone tre strati: meccanico e `fingerprint` nel
sorgente, semantico solo calcolato. Lo strato semantico è di un livello
successivo (appendice A). Per il primo livello restano due scelte.

- **Strato 1, meccanico.** L'`id` dentro il file, la rinomina fatta dal
  `runtime`, l'`id` tolto alle copie, la traccia `replaces`, il controllo dopo
  ogni merge. Questa bozza lo scrive come proposta nei §3, §6 e §11, perché
  senza l'`id` nel file i collegamenti non si risolvono affatto. Le opzioni
  sono sulla traccia:
  - **1a. `replaces` nel successore** (§3.3, esempio 17). Costa un attributo e
    nessun file in più; se poi si cancella anche il successore, la traccia si
    perde e i collegamenti si rompono in modo visibile.
  - **1b. Un file lasciato al posto del vecchio** con «sostituito da», come un
    redirect. La traccia sopravvive al successore. Costa un file per ogni
    fusione, che resta nella cartella e nel `navigator`.
  - **1c. Nessuna traccia.** Ogni fusione rompe i collegamenti al vecchio
    `id`, e il `runtime` li segnala come irrisolti. Costa riscriverli a mano.
- **Strato 2, `fingerprint`.** Ogni `association` confermata ricorda poche
  parole e l'hash del bersaglio:

  ```
  associations:
    - id: calo-q3-sintesi
      fingerprint: ritardi consegne agosto calo
      hash: sha256:9f2c…
  ```

  - **2a. Nel primo livello.** Ritrova un bersaglio perso e segnala i
    collegamenti da rivedere quando il bersaglio cambia. Costi: ogni conferma
    riscrive il file che dichiara il collegamento, e un collegamento
    dichiarato da tutte e due le parti cambia due file; l'hash dipende dalla
    forma canonica del testo, quindi dal `formatter`, e va fissato con lui;
    la scelta delle parole va specificata perché sia deterministica.
  - **2b. Più avanti, con lo strato semantico.** Il primo livello resta più
    semplice e i diff più puliti. Costo: fino ad allora un collegamento che si
    risolve ma non dice più la stessa cosa non si vede.

### 0.3 APERTO: la sintassi dei file di testo

CommonMark con un'intestazione per gli attributi, oppure Djot. I fatti e i
costi sono nella nota [ricerca/sintassi-testo.md](ricerca/sintassi-testo.md).
La scelta tocca: come si scrivono gli attributi di un file e di un blocco
(§4), l'`embed` (§8), gli inventari del contenuto (§7.1), il `formatter` e
l'albero di sintassi che conserva i commenti.

### 0.4 Punto aperto, non bloccante: il `deck` arriva per ultimo

Il principio dice che gli stessi mattoni danno documenti o presentazioni
completamente diversi [C: «Principio: l'aspetto incrementale»]. L'ordine dei
livelli mette però il `deck` per ultimo [C: «Ordine dei livelli»]: fino ad
allora gli stessi mattoni danno solo `article`. Questa bozza non risolve la
tensione. L'appendice B mostra, senza valore normativo, come un `deck` userà
gli stessi oggetti del primo livello senza copiarli.

## 1. Nucleo e livelli

Si procede per livelli, uno alla volta, nell'ordine deciso: contenuto e
impaginazione, dati, grafici, formule, connettori, e infine le presentazioni
come `deck` [C: «Si procede in modo incrementale»; C: «Ordine dei livelli»].
Il principio è che l'aspetto incrementale è lo spirito di ogni cosa [C:
«Principio: l'aspetto incrementale»].

*(proposte dell'orchestratore)*
- La specifica ha un `core` e dei `conformance level`. Il livello 1 è il
  `core` più contenuto e impaginazione; il livello 2 aggiunge i dati, e così
  via.
- Un livello aggiunge soltanto: `kind`, attributi dei suoi `kind`, ruoli e
  `template`. Non cambia mai il significato di un file valido a un livello
  precedente. Un documento valido al livello N resta valido, con lo stesso
  `resolved tree`, per un'implementazione di livello più alto.
- Ogni livello è completo da solo. Un'implementazione dichiara il livello a
  cui è conforme, e lo è se passa tutti gli esempi di quel livello e di quelli
  precedenti.
- Ogni `kind` oltre il `core` porta una forma statica, testo o immagine
  (§10). Un'implementazione di livello più basso apre comunque il documento e
  mostra quella forma.
- Fra un documento e una presentazione cambia solo la `composition`: gli
  oggetti non si copiano. Questo segue da due decisioni: la `composition`
  punta l'`object` [C: «La composition punta l'object»], e lo stesso oggetto
  può stare in più layout [C: «L'oggetto richiamato sul foglio»].

Il `core` comprende *(proposta)*: il documento e i suoi file (§2), l'identità
(§3), gli attributi comuni (§4), il `concept` (§5), l'`association` (§6), la
forma generica dei `kind` non noti (§10) e il comportamento del `runtime`
(§11). Il livello 1 aggiunge `text`, `image`, `article` e `stylesheet`. Un
documento di soli `concept` è già completo al `core`: è una raccolta di idee
collegate.

## 2. Il documento

Un documento è un insieme di file di testo più gli asset. Sta in una cartella
in chiaro oppure in uno zip con un'estensione propria, e le due forme sono
equivalenti [C: «Un documento è un insieme di file sorgente»]. Il testo è la
base di tutto: ogni vista è generata dal testo, e nulla esiste solo
nell'interfaccia [C: «Il testo in chiaro è sempre la base»; C: «L'oggetto
richiamato sul foglio»]. Ogni oggetto è un file, anche il capoverso [C: «Ogni oggetto è un
file»]. Orientamento della stessa voce: tutti i file stanno insieme e i
livelli non sono cartelle.

*(proposte)*
- **Il `bundle`.** È uno zip la cui radice contiene esattamente ciò che
  conterrebbe la cartella. Il `runtime` lo risolve come la cartella, con lo
  stesso `resolved tree`. L'estensione resta da scegliere.
- **Quali file legge il `runtime`.** Tutti, anche nelle sottocartelle, tranne
  quelli che cominciano con un punto (`.git`, le cache). Le sottocartelle non
  hanno significato: due file con lo stesso `id` in cartelle diverse sono un
  `id` doppio.
- **Codifica.** I file di testo sono in UTF-8. Il `formatter` li scrive senza
  BOM, con fine riga LF e un a capo finale; il `runtime` legge anche CRLF e
  BOM, senza `diagnostic`.
- **Nomi dei file.** Il nome è l'`id` più l'estensione (§0.1). Il nome non
  conta per l'identità: se un file viene rinominato fuori dall'app, l'`id`
  scritto dentro resta, e nessun collegamento si rompe (bozza-nodi.md §3).
- **Asset.** Un asset si nomina con un percorso relativo al file che lo usa,
  senza uscire dal documento. Gli URL esterni come asset sono una domanda
  aperta (handoff.md, domanda 6).
- **Da dove partire.** Contesto.md lascia da precisare quale file indica da
  dove partire [C: «Livelli: restano da precisare»], e il `manifest` è
  aperto nel glossario. Questa bozza non ne ha bisogno: il `runtime` risolve
  tutte le `composition` del documento. Dove scrivere la `spec version` si
  decide con il `manifest`.

## 3. Identità

### 3.1 L'`id`

Regole decise da Alessio (bozza-nodi.md §4 e §7, idee 1, 3 e 4; mancano in
contesto.md):
- l'`id` non è per forza numerico o incrementale, e può essere mnemonico [B:
  §7, idea 1];
- è unico nel documento, fatto di minuscole, cifre e trattino, e non si riusa
  mai [B: §7, idea 4].

*(proposte)*
- La forma è `[a-z0-9]+(-[a-z0-9]+)*`: niente trattini all'inizio, alla fine
  o doppi. Le lettere accentate non sono ammesse; il `runtime`, quando ricava
  un `id` dalle prime parole, le traslittera (`perché` → `perche`).
- L'`id` è scritto dentro il file (bozza-nodi.md §3, strato 1). Alessio ha
  detto però che i metadati comuni sono opzionali [B: §7, idea 1]. Per
  tenere insieme le due cose: se un file non scrive l'`id`, il suo `id` è il
  nome del file fino al primo punto (esempio 16). Quando un'operazione dell'app
  o della `cli` lo collega, il `runtime` scrive l'`id` nel file, come fa Logseq con i
  riferimenti ai blocchi, così da lì in poi una rinomina non rompe niente.
- Un `id` vale per tutto il documento, qualunque sia il `kind`: un `concept` e
  un `object` non possono avere lo stesso `id`.

### 3.2 Copie e divisioni *(proposte, dalla bozza)*

- `duplicate` crea una copia con un `id` nuovo. Una copia fatta fuori
  dall'app, che porta lo stesso `id`, è un `id` doppio (esempio 13).
- Quando un oggetto si divide, l'`id` resta a una delle due parti, e il
  `runtime` segnala da rivedere i collegamenti dell'altra.

### 3.3 La traccia `replaces` *(proposta; il punto è APERTO, §0.2)*

Quando un oggetto viene fuso in un altro o sostituito, il successore scrive
gli `id` che sostituisce nell'attributo `replaces`. Un collegamento o un
`embed` verso un `id` sostituito si risolve sul successore, con un avviso e un
`fix` che riscrive il riferimento (esempio 17). Le catene si seguono, come in
Zotero. Un `id` in `replaces` non può essere l'`id` di un file presente, né
comparire nel `replaces` di due file diversi (errore `replaces-conflict`).

Il `runtime` può far rispettare il «mai riusato» solo per gli `id` scritti in
un `replaces`. Per gli altri servirebbe la storia di Git, che il `runtime` non
legge in questa bozza.

## 4. Attributi comuni

Gli attributi comuni sono opzionali, e gli altri dipendono dal tipo [B: §7,
idee 1 e 2]. Ogni nodo ha un `kind`; `id` e `tags` valgono per ogni `kind`,
`class` e `lang` per i nodi che si vedono; `tags` e `class` sono separati [B:
§7, idea 3].

| Attributo | Su | Valore | Stato |
|---|---|---|---|
| `id` | ogni file | §3.1 | deciso [B: §7, idea 4]; opzionale (§3.1) |
| `kind` | ogni file | un `kind` noto o di un'`extension` | deciso [B: §7, idea 3]; obbligatorio *(proposta)* |
| `tags` | ogni file | lista di parole | deciso [B: §7, idea 3] |
| `lang` | `concept`, `text`, `image`, `article` | tag di lingua BCP 47 *(proposta)* | deciso [B: §7, idea 3] |
| `class` | `text`, `image` | lista di nomi in `kebab-case` *(proposta)* | deciso [B: §7, idea 3] |
| `origin` | `concept`, `object` | `author` o `generated` *(proposta)* | proposto |
| `associations` | `concept`, `object` | lista di `id` (§6) | *(proposta)* |
| `replaces` | `concept`, `object` | lista di `id` (§3.3) | *(proposta)* |

*(proposte)*
- **Il `kind` su ogni file.** La bozza dei nodi lo mette sugli `object`;
  questa bozza lo estende a `concept`, `composition` e `stylesheet`, così il
  `runtime` sa cos'è ogni file anche senza l'estensione (§0.1).
- **`lang` si eredita.** Alessio aveva deciso che `lang` si eredita [B: §7,
  idea 3], dal contenitore; la bozza propone di ereditarlo dal documento, ma
  un file del documento non c'è ancora (§2). Proposta: un oggetto senza
  `lang` prende quello della `composition` che lo usa, nel punto in cui lo
  usa (esempio 11). Fuori da una `composition` il suo `lang` è indefinito.
- **`origin`** vale `generated` quando il contenuto è stato proposto come
  `hint` e confermato [C: «Classificazione, collegamenti e promozioni
  automatiche»]. Assente vuol dire `author`.
- **Niente date né autore**: li ha già Git. **Niente attributo "nascosto"**:
  ciò che non deve uscire non sta in una `composition`.
- **Attributi sconosciuti.** Sono un errore (`attribute-unknown`) per i `kind`
  del `core` e del livello 1, e si conservano senza errore per i `kind` delle
  `extension` (esempio 12).

## 5. Il `concept`

Il `concept` è l'unità di significato: un'idea con i suoi metadati e i
collegamenti agli `object` che la sviluppano, anche di `kind` diversi [C:
«L'unità di significato ha i metadati»]. È un file.

*(proposte)*
- Il file ha gli attributi comuni e un corpo: il testo dell'idea, in una o due
  frasi. Il corpo è testo in linea (enfasi, codice in linea, collegamenti
  ipertestuali), in un solo capoverso; più capoversi danno un avviso
  `concept-long`, perché lo sviluppo va in un `text`.
- Un `concept` non ha `embed` e non sa in quali `composition` è usato: è il
  contesto che punta lo sviluppo [C: «L'unità di significato ha i metadati»].
- Se un `concept` collega altri `concept` è una domanda della bozza
  (bozza-nodi.md §6, domanda 1). Questa bozza non fissa il comportamento, e
  gli esempi non lo usano.

````example 1
>>> calo-q3.concept.md
---
id: calo-q3
kind: concept
tags: [vendite, q3]
lang: it
---
Nel terzo trimestre le vendite calano per i ritardi nelle consegne.
>>> resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "attributes": {"tags": ["vendite", "q3"], "lang": "it"}, "content": [["paragraph", "Nel terzo trimestre le vendite calano per i ritardi nelle consegne."]]}
  ]
}
````

Lo stesso file in Djot, che non ha un'intestazione: gli attributi stanno in
un blocco di attributi davanti al primo capoverso (vedi la nota di ricerca).
Questa forma è solo un'ipotesi per il confronto:

```
{#calo-q3 kind=concept tags="vendite q3" lang=it}
Nel terzo trimestre le vendite calano per i ritardi nelle consegne.
```

Con tutte e due le sintassi l'albero risolto atteso è lo stesso.

## 6. Le `association`

I collegamenti fra `concept` e `object` sono bilaterali: si scrivono da una
parte, dall'altra o da entrambe, indifferentemente [C: «I collegamenti fra
concept e object sono bilaterali»]. Sono molti a molti, e ci sono anche fra
sviluppi (orientamento) [C: «Gli sviluppi di un concetto sono file
collegati»].

*(proposte, dalla bozza §3)*
- L'`association` esiste se almeno uno dei due file la dichiara. Il `runtime`
  calcola l'unione, e il `resolved tree` dice quali file la dichiarano
  (esempi 3, 4 e 5).
- Per toglierla va tolta da tutte e due le parti. Lo fa un comando della
  `cli`; se a mano resta da una parte, l'`association` resta.
- Il `formatter` non sposta le `association` da un file all'altro.
- L'`association` lega `concept` e `object`, o due `object`. Una
  `composition` o uno `stylesheet` in una lista `associations`, o come file
  che la dichiara, è un errore `association-kind`: la `composition` usa gli
  oggetti con l'`embed`, che è una dipendenza.
- Un'`association` verso un `id` che non esiste è un errore visibile, mai un
  salto silenzioso (esempio 6).
- L'`association` non ha verso né tipo. I collegamenti semantici e i loro
  `hint` sono di un livello successivo (appendice A).

````example 2
>>> calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
class: [evidenza]
---
Nel terzo trimestre le vendite sono calate del 12%, soprattutto per i
*ritardi* nelle consegne di agosto.
>>> resolved
{
  "nodes": [
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "attributes": {"class": ["evidenza"]}, "content": [["paragraph", "Nel terzo trimestre le vendite sono calate del 12%, soprattutto per i ", ["emphasis", "ritardi"], " nelle consegne di agosto."]]}
  ]
}
````

````example 3
>>> calo-q3.concept.md
---
id: calo-q3
kind: concept
associations: [calo-q3-sintesi]
---
Nel terzo trimestre le vendite calano.
>>> calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
---
Le vendite sono calate del 12%.
>>> resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "content": [["paragraph", "Le vendite sono calate del 12%."]]}
  ],
  "associations": [
    {"ids": ["calo-q3", "calo-q3-sintesi"], "declaredIn": ["calo-q3.concept.md"]}
  ]
}
````

Lo stesso collegamento dichiarato anche dall'oggetto resta uno solo:

````example 4
>>> calo-q3.concept.md
---
id: calo-q3
kind: concept
associations: [calo-q3-sintesi]
---
Nel terzo trimestre le vendite calano.
>>> calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
associations: [calo-q3]
---
Le vendite sono calate del 12%.
>>> resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "content": [["paragraph", "Le vendite sono calate del 12%."]]}
  ],
  "associations": [
    {"ids": ["calo-q3", "calo-q3-sintesi"], "declaredIn": ["calo-q3-sintesi.text.md", "calo-q3.concept.md"]}
  ]
}
````

Dichiarato solo dall'oggetto, è lo stesso collegamento:

````example 5
>>> calo-q3.concept.md
---
id: calo-q3
kind: concept
---
Nel terzo trimestre le vendite calano.
>>> calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
associations: [calo-q3]
---
Le vendite sono calate del 12%.
>>> resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "content": [["paragraph", "Le vendite sono calate del 12%."]]}
  ],
  "associations": [
    {"ids": ["calo-q3", "calo-q3-sintesi"], "declaredIn": ["calo-q3-sintesi.text.md"]}
  ]
}
````

````example 6
>>> calo-q3.concept.md
---
id: calo-q3
kind: concept
associations: [calo-q3-sintesy]
---
Nel terzo trimestre le vendite calano.
>>> resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "association-unresolved", "file": "calo-q3.concept.md", "target": "calo-q3-sintesy"}
  ]
}
````

## 7. Gli `object` del livello 1

Ogni `object` è un file con il suo `kind` [C: «Ogni oggetto è un file»; C:
«L'unità di significato ha i metadati»]. Un `object` può avere o no un
collegamento a un `concept` [C: «La composition punta l'object»]. I `kind`
del livello 1 sono APERTI (§0.1); la bozza propone `text` e `image`.

### 7.1 `text`

Un `text` è un oggetto di prosa: il file ha gli attributi comuni e un corpo
(esempio 2). Il corpo può contenere più blocchi; il capoverso singolo è il
caso tipico [C: «Ogni oggetto è un file»].

Il contenuto interno è un inventario *(proposto, non deciso)*. I nomi dei
tipi di contenuto si fissano sulla bozza di Alessio (glossario §1.3); qui
sono descritti in italiano, e nel `resolved tree` usano provvisoriamente i
nomi dell'albero mdast (§11.3).

| Contenuto | Note |
|---|---|
| capoverso | il blocco di base |
| elenco puntato e numerato | |
| citazione | |
| `code block` | i marker `eval` ed `echo` sono decisi [C: «Il codice nel documento porta un marker»]; al livello 1 un blocco con `eval` non si esegue e dà l'avviso `eval-unsupported` |
| `text table` | tabellina scritta nel testo, non ancora `collection`; base del `turn into` |
| `math line` | riga di calcolo con l'`inline result` [C: «Lo spazio libero per appunti»]; la sintassi e il linguaggio delle espressioni sono da scegliere, e senza il livello delle formule il risultato non si calcola |
| enfasi, forte, codice in linea | testo in linea |
| collegamento ipertestuale | verso un URL; non è un'`association` |
| `cross-ref` | riferimento in linea a un altro oggetto per `id`; la `numbering` è da precisare |
| `footnote` | |
| titolo | nella proposta della bozza i titoli stanno nella `composition`; un titolo in un `text` dà l'avviso `heading-in-text` |

Restano fuori dall'inventario, da decidere: l'`embed` dentro un `text`, che
il glossario ammette, e gli attributi sui singoli blocchi, che dipendono dalla
sintassi (§0.3).

### 7.2 `image` *(proposta)*

Un `image` è un'immagine fatta fuori dal `runtime`, come una foto o un
disegno. Un'immagine disegnata dal `runtime` da una tabella è una vista
generata e non si salva come oggetto (bozza-nodi.md §4).

Un file binario non può portare attributi. Proposta: l'`image` è un file di
testo con gli attributi comuni, l'attributo `asset` con il percorso del file
dell'immagine, e un corpo con la sua descrizione. La descrizione serve per gli
screen reader ed è anche la forma statica dell'oggetto (§10). Se l'asset
manca, è un errore `asset-missing` (esempio 7). L'alternativa, un'immagine
senza file di testo, con l'`id` preso dal nome e le `association` scritte
solo dall'altra parte, è parte del punto APERTO del §0.1.

````example 7
>>> lavagna.image.md
---
id: lavagna
kind: image
asset: lavagna.jpg
---
Foto della lavagna con le vendite mensili del 2026.
>>> resolved
{
  "nodes": [
    {"id": "lavagna", "kind": "image", "file": "lavagna.image.md", "attributes": {"asset": "lavagna.jpg"}, "content": [["paragraph", "Foto della lavagna con le vendite mensili del 2026."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "asset-missing", "file": "lavagna.image.md", "target": "lavagna.jpg"}
  ]
}
````

## 8. La `composition` `article`

La `composition` punta l'`object` [C: «La composition punta l'object»]. Lo
stesso oggetto può stare in più `composition`, ed è lo stesso oggetto, non
una copia [C: «L'oggetto richiamato sul foglio»]. Le `composition` danno
l'ordine di lettura [C: «La lista a fianco ha sezioni per tipo»].

*(proposte, dalla bozza)*
- La `composition` usa gli oggetti con l'`embed` per `id`. Quale `concept`
  presenta un oggetto lo si ricava dalle sue `association`, se ne ha.
- La struttura di lettura (capitoli, titoli, ordine) sta nella `composition`,
  non nei `concept` né negli oggetti, come nelle mappe di DITA. Il corpo di un
  `article` contiene solo titoli e `embed`; un capoverso scritto
  direttamente nella `composition` è un errore `composition-content`
  (esempio 10), perché ogni capoverso è un oggetto.
- I capitoli sono impliciti dai titoli, come in CommonMark: un titolo apre un
  capitolo che arriva fino al titolo successivo dello stesso grado o di grado
  più alto. L'alternativa, l'annidamento esplicito, è fra le cose da
  precisare in contesto.md [C: «Lo spazio libero come punto d'ingresso»].
- L'`embed` di un `id` che non esiste è un errore `embed-unresolved`, e il
  `resolved tree` lo mostra al suo posto (esempio 9). L'`embed` di un
  `concept` o di un'altra `composition` è un errore `embed-kind`.
- L'`article` nomina il suo `stylesheet` con l'attributo `stylesheet`.

````example 8
>>> report-q3.article.md
---
id: report-q3
kind: article
lang: it
stylesheet: report
---
# Il terzo trimestre

![[calo-q3-sintesi]]
>>> calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
class: [evidenza]
---
Le vendite sono calate del 12%.
>>> report.css
.evidenza { font-weight: bold; }
>>> resolved
{
  "nodes": [
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "attributes": {"class": ["evidenza"]}, "content": [["paragraph", "Le vendite sono calate del 12%."]]},
    {"id": "report", "kind": "stylesheet", "file": "report.css"},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "attributes": {"lang": "it", "stylesheet": "report"}, "content": [["heading", {"depth": 1}, "Il terzo trimestre"], ["embed", {"id": "calo-q3-sintesi", "kind": "text", "lang": "it", "class": ["evidenza"]}, ["paragraph", "Le vendite sono calate del 12%."]]]}
  ]
}
````

````example 9
>>> report-q3.article.md
---
id: report-q3
kind: article
---
# Il terzo trimestre

![[calo-q3-sintesy]]
>>> resolved
{
  "nodes": [
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["heading", {"depth": 1}, "Il terzo trimestre"], ["embed", {"id": "calo-q3-sintesy", "unresolved": true}]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "embed-unresolved", "file": "report-q3.article.md", "target": "calo-q3-sintesy"}
  ]
}
````

````example 10
>>> report-q3.article.md
---
id: report-q3
kind: article
---
# Il terzo trimestre

Qui scrivo due righe di introduzione.
>>> resolved
{
  "nodes": [
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["heading", {"depth": 1}, "Il terzo trimestre"], ["paragraph", "Qui scrivo due righe di introduzione."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "composition-content", "file": "report-q3.article.md", "fix": "turn into: sposta il capoverso in un text e mettine l'embed"}
  ]
}
````

Il `lang` di un oggetto che non lo dichiara viene dalla `composition` che lo
usa, nel punto in cui lo usa *(proposta, §4)*:

````example 11
>>> report-en.article.md
---
id: report-en
kind: article
lang: en
---
![[intro]]
![[citazione]]
>>> intro.text.md
---
id: intro
kind: text
---
Sales fell in the third quarter.
>>> citazione.text.md
---
id: citazione
kind: text
lang: it
---
«Le consegne di agosto sono arrivate tardi.»
>>> resolved
{
  "nodes": [
    {"id": "citazione", "kind": "text", "file": "citazione.text.md", "attributes": {"lang": "it"}, "content": [["paragraph", "«Le consegne di agosto sono arrivate tardi.»"]]},
    {"id": "intro", "kind": "text", "file": "intro.text.md", "content": [["paragraph", "Sales fell in the third quarter."]]},
    {"id": "report-en", "kind": "article", "file": "report-en.article.md", "attributes": {"lang": "en"}, "content": [["embed", {"id": "intro", "kind": "text", "lang": "en"}, ["paragraph", "Sales fell in the third quarter."]], ["embed", {"id": "citazione", "kind": "text", "lang": "it"}, ["paragraph", "«Le consegne di agosto sono arrivate tardi.»"]]]}
  ]
}
````

## 9. Lo `stylesheet`

Il vocabolario dell'impaginazione è un sottoinsieme di CSS definito dalla
specifica: solo proprietà con un significato fissato e traducibili anche per
un futuro motore Typst [C: «Il vocabolario dell'impaginazione»]. Modello e
impaginazione restano neutri rispetto al motore [C: «Motori per fasi»].

Questa bozza fissa solo la cornice *(proposte)*:
- Uno `stylesheet` è un file `.css`. Il CSS non ha un posto per gli
  attributi, quindi l'`id` è il nome del file fino al primo punto e il `kind`
  viene dall'estensione (§0.1).
- Le regole si agganciano ai nodi con `class`, e con i tipi di nodo del
  `resolved tree` (§11.3). Gli `id` non sono selettori: una regola che vale per
  un solo oggetto si scrive con una `class`.
- Lo `stylesheet` non cambia il contenuto né l'ordine di lettura: niente
  `content`, niente `display: none`.
- Una proprietà o un selettore fuori dal sottoinsieme è un errore
  `stylesheet-unsupported`, non un'istruzione ignorata.
- Il sottoinsieme stesso, cioè quali proprietà e selettori, resta da
  definire. Non blocca la cornice.

Il `resolved tree` dice quale `stylesheet` usa una `composition` e quali
`class` porta ogni nodo (esempio 8); applicare le regole è compito del
`renderer`.

## 10. `kind` non noti e forma statica

La sintassi ha fin dall'inizio una forma generica per i `kind` non noti, che
il parser legge e il `formatter` conserva anche senza l'`extension`, e ogni
oggetto di un'`extension` porta nel documento una forma statica (proposte
dell'orientamento sull'estensibilità [C: «Estensibilità: estensioni e
connettori»]).

*(proposte)*
- Un file con un `kind` che l'implementazione non conosce è un nodo opaco: il
  `runtime` ne legge gli attributi comuni e le `association`, conserva tutto
  il resto e lo marca `"known": false` nel `resolved tree`, con l'avviso
  `kind-unknown` (esempio 12).
- La forma statica è il corpo di testo del file, oppure un asset immagine
  nominato dall'attributo `static-fallback`. Un `embed` di un nodo opaco mostra la
  forma statica. Per un `chart`, per esempio, sarà l'immagine con i valori
  fotografati all'export [C: «Chi apre un HTML esportato»].
- Vale anche fra livelli: un'implementazione di livello 1 tratta un `chart`
  del livello 3 come un nodo opaco, e il documento si apre comunque.

````example 12
>>> vendite-mensili.chart.md
---
id: vendite-mensili
kind: chart
template: barre-mensili
static-fallback: vendite-mensili.png
---
Vendite mensili del 2026: luglio 1200, agosto 1350, settembre 1280.
>>> vendite-mensili.png
(file binario)
>>> calo-q3.concept.md
---
id: calo-q3
kind: concept
colore: rosso
---
Nel terzo trimestre le vendite calano.
>>> resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "attributes": {"colore": "rosso"}, "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "vendite-mensili", "kind": "chart", "known": false, "file": "vendite-mensili.chart.md", "attributes": {"template": "barre-mensili", "staticFallback": "vendite-mensili.png"}, "content": [["paragraph", "Vendite mensili del 2026: luglio 1200, agosto 1350, settembre 1280."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "attribute-unknown", "file": "calo-q3.concept.md", "target": "colore"},
    {"severity": "warning", "code": "kind-unknown", "file": "vendite-mensili.chart.md", "target": "chart"}
  ]
}
````

## 11. Il `runtime`

Il `runtime` è un processo separato dall'app, possiede i file e applica ogni
modifica passando dal `formatter` canonico; riconcilia le modifiche fatte da
altri editor o da Git [C: «Il motore è un runtime separato»; C: «Il runtime
possiede il file»]. Ogni operazione dell'editor esiste anche nella `cli`,
con output JSON a schema stabile ed errori con codice e suggerimento di
correzione [C: «Lo strumento nasce con una riga di comando»]. Nessuna
dipendenza nasce in silenzio [C: «Classificazione, collegamenti e promozioni
automatiche»].

### 11.1 La risoluzione *(proposta)*

Il `runtime` prende la cartella o il `bundle` e produce un solo `resolved
tree`, che i `renderer` leggono senza ricalcolare nulla (proposta di
contesto.md [C: «Un solo punto di calcolo»]). I passi:

1. elenca i file (§2) e legge di ognuno `kind`, `id`, attributi e corpo;
2. controlla `id` e `kind`: forma, doppioni, estensione, attributi;
3. risolve le `replaces` e costruisce la mappa da ogni `id` al suo nodo;
4. calcola l'unione delle `association` e controlla i bersagli;
5. risolve gli `embed` di ogni `composition`, con il `lang` ereditato;
6. controlla gli asset e gli `stylesheet` nominati.

La risoluzione non si ferma a un errore: l'albero esce sempre, con il nodo
sbagliato al suo posto e il `diagnostic` accanto. Gli errori fanno uscire la
`cli` con un codice diverso da zero, e l'export si rifiuta. Lo stesso
controllo gira dopo ogni merge e ogni modifica esterna: Git non vede che un
ramo ha cancellato un oggetto che un altro ramo collega (bozza-nodi.md §3).

Un riferimento a un `id` doppio non si risolve, e non dà un secondo errore:
basta l'`id-duplicate`.

### 11.2 I `diagnostic` *(proposta)*

Ogni `diagnostic` ha `severity` (`error` o `warning`), `code`, `file`, e se
serve `target` (l'`id`, l'attributo o il percorso in causa), `message` e
`fix`. I codici sono stabili; il testo di `message` e `fix` no. I codici sono
provvisori, e si fisseranno nel glossario con la sintassi.

| Codice | Gravità | Quando | Esempio |
|---|---|---|---|
| `syntax` | error | il file non si legge con la sintassi del suo `kind` | |
| `id-invalid` | error | l'`id` non ha la forma del §3.1 | 14 |
| `id-duplicate` | error | due file con lo stesso `id`, uno per file | 13 |
| `kind-missing` | error | un file di testo senza `kind` | |
| `kind-extension-mismatch` | error | `kind` ed estensione diversi (se passa l'opzione A del §0.1) | 15 |
| `kind-unknown` | warning | `kind` non noto: nodo opaco | 12 |
| `attribute-unknown` | error | attributo sconosciuto su un `kind` noto | 12 |
| `attribute-invalid` | error | valore di un attributo della forma sbagliata | |
| `association-unresolved` | error | bersaglio di un'`association` inesistente | 6 |
| `association-kind` | error | `association` con una `composition` o uno `stylesheet` | |
| `association-replaced` | warning | bersaglio trovato tramite `replaces` | 17 |
| `embed-unresolved` | error | `embed` di un `id` inesistente | 9 |
| `embed-kind` | error | `embed` di un `concept` o di una `composition` | |
| `embed-replaced` | warning | `embed` risolto tramite `replaces` | |
| `replaces-conflict` | error | un `id` sostituito ancora presente o sostituito due volte | |
| `composition-content` | error | nella `composition` un blocco che non è un titolo né un `embed` | 10 |
| `heading-in-text` | warning | un titolo in un `text` | |
| `concept-long` | warning | più di un capoverso in un `concept` | |
| `eval-unsupported` | warning | `code block` con `eval` al livello 1 | |
| `asset-missing` | error | asset nominato e assente | 7 |
| `stylesheet-unresolved` | error | `stylesheet` nominato e assente | |
| `stylesheet-unsupported` | error | proprietà o selettore fuori dal sottoinsieme | |

````example 13
>>> calo-q3.concept.md
---
id: calo-q3
kind: concept
---
Nel terzo trimestre le vendite calano.
>>> copia/calo-q3.concept.md
---
id: calo-q3
kind: concept
---
Nel terzo trimestre le vendite calano molto.
>>> resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "calo-q3", "kind": "concept", "file": "copia/calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano molto."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "id-duplicate", "file": "calo-q3.concept.md", "target": "calo-q3"},
    {"severity": "error", "code": "id-duplicate", "file": "copia/calo-q3.concept.md", "target": "calo-q3"}
  ]
}
````

````example 14
>>> calo-q3.concept.md
---
id: Calo_Q3
kind: concept
---
Nel terzo trimestre le vendite calano.
>>> resolved
{
  "nodes": [
    {"id": "Calo_Q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "id-invalid", "file": "calo-q3.concept.md", "target": "Calo_Q3", "fix": "calo-q3"}
  ]
}
````

Se passa l'opzione A del §0.1, il `kind` scritto nel file vince e
l'estensione è un errore:

````example 15
>>> calo-q3.text.md
---
id: calo-q3
kind: concept
---
Nel terzo trimestre le vendite calano.
>>> resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.text.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "kind-extension-mismatch", "file": "calo-q3.text.md", "target": "concept", "fix": "rinomina in calo-q3.concept.md"}
  ]
}
````

Un file senza `id` prende il nome del file fino al primo punto *(proposta,
§3.1)*:

````example 16
>>> ritardi-agosto.text.md
---
kind: text
---
Ad agosto due fornitori hanno consegnato con tre settimane di ritardo.
>>> resolved
{
  "nodes": [
    {"id": "ritardi-agosto", "kind": "text", "file": "ritardi-agosto.text.md", "content": [["paragraph", "Ad agosto due fornitori hanno consegnato con tre settimane di ritardo."]]}
  ]
}
````

Un collegamento a un oggetto fuso in un altro si risolve sul successore *(la
traccia è APERTA, §0.2)*:

````example 17
>>> calo-q3.concept.md
---
id: calo-q3
kind: concept
associations: [ritardi-luglio]
---
Nel terzo trimestre le vendite calano.
>>> ritardi-estate.text.md
---
id: ritardi-estate
kind: text
replaces: [ritardi-luglio, ritardi-agosto]
---
A luglio e ad agosto i fornitori hanno consegnato in ritardo.
>>> resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "ritardi-estate", "kind": "text", "file": "ritardi-estate.text.md", "attributes": {"replaces": ["ritardi-luglio", "ritardi-agosto"]}, "content": [["paragraph", "A luglio e ad agosto i fornitori hanno consegnato in ritardo."]]}
  ],
  "associations": [
    {"ids": ["calo-q3", "ritardi-estate"], "declaredIn": ["calo-q3.concept.md"]}
  ],
  "diagnostics": [
    {"severity": "warning", "code": "association-replaced", "file": "calo-q3.concept.md", "target": "ritardi-luglio", "fix": "ritardi-estate"}
  ]
}
````

### 11.3 Il `resolved tree` *(proposta)*

È un JSON, con chiavi in `camelCase` come vuole il glossario (N1). Ha tre
liste, e una lista vuota si omette.

- **`nodes`**: un elemento per file di testo, ordinati per `id` e poi per
  percorso. Ogni nodo ha `id`, `kind`, `file` (il percorso con `/`),
  `attributes` (quelli dichiarati, tranne `id`, `kind` e `associations`; si
  omette se vuoto, con le chiavi in `camelCase`: `static-fallback` diventa
  `staticFallback`), `content` (il corpo come albero; si omette se il `kind`
  non ha corpo) e `"known": false` per i nodi opachi. Gli asset non sono
  nodi.
- **`associations`**: un elemento per coppia, con `ids` (i due `id`, in
  ordine) e `declaredIn` (i file che la dichiarano, in ordine). Un
  collegamento risolto tramite `replaces` usa l'`id` del successore.
- **`diagnostics`**: ordinati per `file` e poi per `code`.

Ogni ordine è per punti di codice Unicode, così l'albero è deterministico e
si confronta byte per byte dopo una stampa canonica del JSON.

Il contenuto è un albero alla maniera di JsonML: un blocco o un pezzo in
linea è un array con il tipo, un oggetto di attributi facoltativo e i figli;
il testo semplice è una stringa. I tipi sono provvisoriamente quelli di
mdast (`paragraph`, `heading`, `emphasis`, `strong`, `list`, `listItem`,
`blockquote`, `code`, `inlineCode`, `link`, `footnoteReference`), finché la
bozza dei nodi non fissa i nomi (glossario §1.3), più `embed`.

Nel contenuto di una `composition` ogni `embed` porta, negli attributi,
l'`id`, il `kind`, il `lang` effettivo e la `class` dell'oggetto, e come figli
il suo contenuto già risolto. Un `embed` che non si risolve ha
`"unresolved": true` e nessun figlio. Così un `renderer` legge la
`composition` senza cercare altri nodi.

## Appendice A. Livelli successivi (non normativa)

Ciascuno è descritto nella bozza dei nodi o in contesto.md. Qui solo dove si
aggancia al nucleo.

- **Dati e `collection`** (livello 2). Un `kind` nuovo, con un CSV o TSV e il
  suo `schema` [C: «Tipi, chiavi e dimensioni si dichiarano»]. Si aggancia
  come `object`: ha `id`, `association` ed `embed` come gli altri, e i suoi
  `record` avranno un'identità propria dentro la `collection`. La forma
  statica è la tabella stessa.
- **Grafici, `template` e aggregatore** (livello 3). Il `chart` è un `object`
  che applica un `template` a una `collection` (bozza-nodi.md §3). Introduce
  le dipendenze scritte da chi dipende, accanto alle `association`
  (bozza-nodi.md §6, domanda 3). La forma statica è l'immagine con i valori
  fotografati (§10).
- **Formule** (livello 4). Un file a parte per tipo [C: «Formule e connettori
  in file separati»]. Danno valore alle `math line` del livello 1, che fino
  ad allora restano senza risultato.
- **Connettori** (livello 5). Un file proprio per i `wire`, e uno per le
  posizioni sistemate a mano [C: «I connettori grafici sono un file a
  parte»]. Puntano gli `object` per `id`.
- **`deck`** (livello 6). Una `composition` come l'`article`, fatta di
  `slide`, con gli stessi `embed` [C: «Si procede in modo incrementale»].
  Vedi l'appendice B.
- **Collegamenti semantici.** Lo strato 3 della bozza (bozza-nodi.md §3): un
  indice locale, mai nel sorgente, che propone `hint`. Un `hint` confermato
  diventa un'`association` normale, quindi il nucleo non cambia.
- **`canvas` e `navigator`.** Il file del `canvas` salva solo posizioni e
  riferimenti per `id` [C: «Il foglio di bozze è un canvas»]; non cambia il
  `resolved tree` delle `composition`.

## Appendice B. Gli stessi oggetti in un `deck` (non normativa)

Gli oggetti degli esempi 8 e 7 usati da una presentazione. Nessun oggetto
cambia e nessuno si copia: cambia solo la `composition`. La sintassi delle
`slide` qui sotto è inventata per l'esempio, e non è una proposta.

```
>>> riunione-q3.deck.md
---
id: riunione-q3
kind: deck
lang: it
stylesheet: riunione
---
# Il terzo trimestre

![[calo-q3-sintesi]]

# La lavagna

![[lavagna]]
```

Qui ogni titolo di primo grado aprirebbe una `slide`. L'`article` dell'esempio
8 e questo `deck` puntano lo stesso `calo-q3-sintesi`: una correzione del
capoverso arriva a tutti e due. Il `concept` `calo-q3` non sa né dell'uno né
dell'altro. Lo `stylesheet` `riunione` può dare alla stessa `class`
`evidenza` un aspetto diverso da quello del `report`.
