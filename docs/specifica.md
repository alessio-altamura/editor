# Specifica: nucleo e primo livello

Seconda bozza, 2026-10-20. Non è normativa finché Alessio non la approva. I
nomi seguono il [glossario](glossario.md); i codici dei `diagnostic`, le chiavi
del `resolved tree` e i tipi di contenuto sono identificatori provvisori, non
ancora nomi del prodotto.

## 0. Come leggere questa bozza

**Marcature.**
- Nessuna marcatura: deciso. Il rimando fra parentesi quadre cita le prime
  parole della voce di [contesto.md](contesto.md), per esempio [C: «Ogni
  oggetto è un file»].
- *(proposta)*: viene dalla [bozza dei nodi](bozza-nodi.md), dall'orchestratore
  o da chi ha scritto questa bozza; resta da confermare.
- **APERTO**: un punto che blocca il primo livello, con le opzioni e i loro
  costi, senza una scelta (§0.1-§0.6).

**Sintassi provvisoria.** Gli esempi usano CommonMark con un'intestazione YAML
fra due righe `---`. Un capoverso fatto solo di `![[id]]` è un `embed` di
blocco, come in Obsidian. L'estensione `.md` è un segnaposto. Tutto questo
serve solo a scrivere gli esempi (§0.6).

**Gli esempi sono test** *(proposta)*. Come nella specifica di CommonMark, ogni
esempio è un blocco aperto e chiuso da 32 backtick, con l'etichetta
`example N classe=C stato=S`: C è la `conformance class` (§1), S dice su cosa
poggia la regola provata (`deciso`, `proposta`, oppure l'opzione di un punto
APERTO, come `0.1A`). Dentro:
- una riga `=== file <percorso>` apre un file di testo, che contiene le righe
  fino al marcatore successivo, ciascuna chiusa da LF;
- una riga `=== asset <percorso>` crea un file di zero byte;
- l'ultima sezione, `=== resolved`, è il `resolved tree` atteso (§11.3).

Uno script estrae i blocchi, scrive i file in una cartella vuota, sostituisce
`.md` con l'estensione scelta, esegue il `runtime` e confronta gli alberi come
valori JSON. Ignora `message` e `fix` dei `diagnostic`, che non sono
normativi.

### 0.1 APERTO: i `kind` del primo livello, e dove un file dice il suo `kind`

La bozza propone per il primo livello `concept`, `text`, `image` e l'`article`;
ci sono poi lo `stylesheet` e il `canvas file`. Ogni nodo ha un `kind` [C:
«Attributi e id»]. La domanda è dove si scrive (bozza-nodi.md §6, domanda 2).

- **A. Nell'estensione e dentro il file** (`calo-q3.concept.md`). Si filtra
  senza l'`app` (`ls *.concept.md`), e gli altri programmi aprono ciò che
  riconoscono. Costi: il `kind` è scritto due volte, e il `runtime` controlla
  che coincidano (esempio 15); `turn into` rinomina il file. Git ritrova la
  rinomina per somiglianza del contenuto, con soglia predefinita del 50%
  ([git diff](https://git-scm.com/docs/git-diff)), quindi la storia si segue.
- **B. Solo dentro il file**, con un'estensione unica per i file di testo. Una
  fonte sola. Costi: per filtrare servono l'`app`, la `cli` o un `grep`; un
  altro programma non sa cosa contiene il file.
- **C. Nell'estensione dove il formato la impone** (`.css`, `.jpg`, `.json`),
  dentro il file per il resto. Costo: due regole.

Lo stesso punto decide i nodi che non sono testo con intestazione: immagini,
`stylesheet`, il `canvas file` in JSON, e più avanti CSV e `chart`. Le strade
sono due, e si possono mescolare:
- **un descrittore accanto**, un file di testo con gli attributi che nomina il
  file vero (esempio 7);
- **i metadati nel formato**: il commento d'intestazione del CSS, come fa
  WordPress con `style.css`
  ([WordPress](https://developer.wordpress.org/themes/basics/main-stylesheet-style-css/)),
  una chiave in un JSON, lo `schema` di una `collection`. Non vale per le
  immagini.

Gli esempi usano A e il descrittore per l'`image`.

### 0.2 APERTO: un `text` è un capoverso o più blocchi?

Ogni oggetto è un file, anche il capoverso [C: «Ogni oggetto è un file»]. Non
è deciso se un `text` possa contenerne più d'uno.
- **Un solo capoverso.** Scrittura: ogni capoverso nuovo è un file nuovo, cosa
  che l'`app` fa da sola ma che a mano, con un programma di testo, è pesante.
  Diff: piccoli e localizzati; spostare un capoverso cambia solo la
  `composition`. Composizioni: lunghe liste di `embed`, e anche un elenco o
  una citazione sono oggetti a sé. Riuso al grado più fine.
- **Più blocchi.** Scrittura: naturale, come un file Markdown. Diff: come un
  testo normale; spostare un capoverso fra due oggetti cambia due file.
  Composizioni: pochi `embed`. Il riuso è più grossolano, e serve una regola
  per un titolo dentro un `text`, perché i titoli stanno nella `composition`
  (§8).

Gli esempi hanno sempre un capoverso, e valgono con tutte e due le opzioni.

### 0.3 APERTO: identità e collegamenti che si rompono

La bozza propone tre strati: meccanico e `imprint` nel sorgente, semantico
solo calcolato (bozza-nodi.md §3). Che lo strato semantico venga dopo è una
proposta della bozza (appendice A). Per il primo livello ci sono tre scelte.

**L'`id` nel file.** I metadati comuni sono opzionali, e l'`id` non si riusa
mai [C: «Attributi e id»].
- **1i. Sempre scritto dentro il file**, come chiede lo strato 1. Una
  rinomina fuori dall'`app` non rompe niente. Costo: ogni file porta l'`id`,
  anche se nessuno lo collega.
- **1ii. Opzionale**: se manca, l'`id` è il nome del file fino al primo punto
  (esempio 16), e il `runtime` lo scrive nel file quando un'`operation` lo
  collega. Costo: finché l'`id` non è scritto, una rinomina fuori dall'`app`
  rompe i collegamenti.

**La traccia di fusioni e sostituzioni** (`replaces`).
- **1a. Nel successore**: un attributo con gli `id` sostituiti (esempio 17).
  Costa un attributo. Se il successore viene cancellato, la traccia si perde.
  Il «mai riusato» si controlla solo per gli `id` scritti lì.
- **1b. Un file lasciato al posto del vecchio**, con «sostituito da», come un
  redirect. Sopravvive al successore. Costa un file per fusione, visibile nel
  `navigator`. Il «mai riusato» vale per gli `id` fusi, non per quelli
  cancellati.
- **1c. Nessuna traccia.** I collegamenti al vecchio `id` diventano errori da
  riscrivere a mano. Il «mai riusato» non si controlla senza la storia di
  Git.
- **1d. Un file del documento con gli `id` ritirati**, cancellati o fusi, e
  per i fusi il successore. Il «mai riusato» si controlla per ogni `id` che il
  `runtime` ha visto ritirare. Costi: un file che cresce sempre e che va in
  conflitto nei merge; una cancellazione fatta fuori dall'`app` entra solo
  quando il `runtime` riconcilia.

Un rischio vale per 1ii, 1a e 1c: un `id` ricavato dal nome o dalle prime
parole può coincidere con quello di un oggetto cancellato. Allora i vecchi
collegamenti si risolvono in silenzio sull'oggetto sbagliato. Lo evitano 1d e,
per i soli `id` fusi, 1b.

**L'`imprint`.** Ogni `association` confermata ricorderebbe poche parole e
l'hash del bersaglio.
- **2a. Nel primo livello.** Ritrova un bersaglio perso e segnala i
  collegamenti da rivedere. Cambia tre cose: la lista `associations` diventa
  una lista di mappe, `{id: calo-q3-sintesi, imprint: {words: ritardi
  consegne agosto, hash: sha256:…}}`; il `runtime` ricalcola l'hash del
  bersaglio e lo confronta; un codice nuovo, `association-changed`, segnala il
  bersaglio cambiato. Costi: ogni conferma riscrive il file che dichiara il
  collegamento, due file se è dichiarato da entrambe le parti; l'hash dipende
  dalla forma canonica, quindi dal `formatter`; la scelta delle parole va resa
  deterministica.
- **2b. Più avanti.** Primo livello più semplice e diff più puliti. Costo: fino
  ad allora un collegamento che si risolve ma non dice più la stessa cosa non
  si vede.

Il testo normativo e gli esempi presuppongono 1ii, 1a e 2b, e lo dicono
nell'etichetta dove la regola dipende dalla scelta.

### 0.4 APERTO: il risultato delle righe di calcolo

Le righe di calcolo con il risultato in linea sono decise [C: «Lo spazio
libero per appunti»], e la bozza le mette nel primo livello.
- **Risultato già al livello 1**, con un'aritmetica minima (numeri, quattro
  operazioni, parentesi). Costi: si fissa un pezzo di linguaggio delle
  espressioni prima di scegliere quello delle formule, con il rischio che poi
  non coincidano; anche l'aritmetica minima va resa uguale dappertutto.
- **Risultato dalla classe delle formule.** Nessun linguaggio anticipato.
  Costo: fino ad allora la decisione non è consegnata, e la riga di calcolo
  resta testo.

### 0.5 APERTO: il sottoinsieme di CSS e chi applica le regole

Il sottoinsieme è definito dalla specifica [C: «Il vocabolario
dell'impaginazione»], ma non è ancora scritto, e senza di lui metà del primo
livello non ha requisiti verificabili. C'è anche una scelta di architettura:
- **il `runtime` calcola la cascata** e scrive nel `resolved tree` i valori
  per ogni nodo. È coerente con la proposta che i `renderer` non ricalcolino
  nulla [C: «Un solo punto di calcolo»], e gli esempi possono verificare
  l'impaginazione. Costo: il `runtime` implementa la cascata;
- **il `renderer` applica il CSS**. L'HTML lo fa da sé. Costi: l'aspetto non è
  nel `resolved tree`, e un futuro `renderer` Typst deve implementare la
  cascata a parte.

Finché i tipi di contenuto hanno nomi provvisori (§11.3), un selettore su un
tipo cambierebbe significato quando i nomi si fissano: fino ad allora,
*(proposta)* solo selettori di `class`.

### 0.6 APERTO: la sintassi dei file di testo

CommonMark con un'intestazione, oppure Djot. Fatti e costi sono nella nota
[ricerca/sintassi-testo.md](ricerca/sintassi-testo.md). La scelta tocca gli
attributi del file e dei blocchi (§4), l'`embed` (§8), l'inventario del
contenuto (§7.1), il `formatter` e l'albero di sintassi che conserva i
commenti.

L'esempio 1 in Djot, a titolo illustrativo (non si estrae):

```
{#calo-q3 kind=concept tags="vendite q3" lang=it}
Nel terzo trimestre le vendite calano.
```

Con djot.js 0.3.2 questo dà un altro albero, finché non si scrivono tre
regole: il blocco di attributi davanti al primo blocco vale per il file e
non per il capoverso; un valore con spazi si legge come lista; un file fatto
solo di attributi resta un nodo (djot.js scarta un blocco di attributi senza
blocco dopo). Le prove sono nella nota.

### Nota: il `deck` per ultimo

Il principio dice che gli stessi mattoni *possono* dare documenti o
presentazioni completamente diversi [C: «Principio: l'aspetto incrementale»];
l'ordine dei livelli mette il `deck` per ultimo [C: «Ordine dei livelli»]. Le
due cose non si contraddicono: il primo livello prepara mattoni che il `deck`
userà senza copiarli. L'appendice B lo mostra.

## 1. Classi di conformità

Si procede per livelli, uno alla volta: contenuto e impaginazione, dati,
grafici, formule, connettori, e infine le presentazioni come `deck` [C: «Si
procede in modo incrementale»; C: «Ordine dei livelli»]. L'aspetto
incrementale è lo spirito di ogni cosa [C: «Principio: l'aspetto
incrementale»].

*(proposte; le prime quattro dell'orchestratore)*
- **Classi.** La classe 0 è il `core`. Le classi da 1 a 6 sono i sei passi
  dell'ordine deciso: la 1 contenuto e impaginazione, la 6 il `deck`. Una
  classe non è un `part`: la 1 unisce più `part`, e la 6 aggiunge un `kind` di
  `composition`. Il `canvas file` è assegnato qui alla classe 1.
- **Aggiungere soltanto.** Una classe aggiunge `kind`, attributi, ruoli e
  `template`, e non cambia il significato di un file valido per una classe
  precedente. Può riempire ciò che una classe precedente lascia vuoto: un
  nodo `directive` diventa un nodo del suo `kind`, e una riga di calcolo
  riceve il risultato (§0.4).
- **Completa da sola.** Un'implementazione dichiara la sua classe, ed è
  conforme se passa gli esempi di quella classe e delle precedenti.
- **`static fallback`.** Ogni `kind` oltre il `core` ne ha una, testo
  o immagine (§10).
- **Una `composition` cambia, gli oggetti no.** Fra un documento e una
  presentazione cambia la `composition`: la `composition` punta l'`object` [C:
  «La composition punta l'object»], e lo stesso oggetto sta in più `composition` [C:
  «L'oggetto richiamato sul foglio»].
- **Classe di un documento.** È la più alta fra le classi dei `kind` che usa.
  Il documento dichiara anche la `spec version` (§2).
- **Compatibilità in avanti.** Un attributo sconosciuto si ignora con un
  avviso, come le proprietà sconosciute in CSS 2.1
  ([§4.2](https://www.w3.org/TR/CSS21/syndata.html#parsing-errors)). La bozza
  proponeva un errore per i `kind` del nucleo: così però un documento scritto
  per una versione successiva non si aprirebbe.

Il `core` comprende il documento (§2), l'identità (§3), gli attributi comuni
(§4), il `concept` (§5), l'`association` (§6), la `directive` (§10) e il
`runtime` (§11). La classe 1 aggiunge `text`, `image`, `article`,
`stylesheet` e il `canvas file`.

## 2. Il documento

Un documento è un insieme di file più gli asset, in una cartella in chiaro o
in uno zip con un'estensione propria, e le due forme sono equivalenti [C: «Un
documento è un insieme di file sorgente»]. Il testo è la base di tutto, e
nulla esiste solo nell'interfaccia [C: «Il testo in chiaro è sempre la base»;
C: «L'oggetto richiamato sul foglio»]. Ogni oggetto è un file; orientamento:
i file stanno insieme e i livelli non sono cartelle [C: «Ogni oggetto è un
file»]. La configurazione sta in file di testo nella cartella [C: «Lo
strumento nasce con una riga di comando»].

*(proposte)*
- **`bundle`.** La radice dello zip contiene ciò che conterrebbe la cartella, e
  il `resolved tree` è lo stesso.
- **File letti.** Tutti, anche nelle sottocartelle, tranne quelli che
  cominciano con un punto. Le sottocartelle non hanno significato.
- **`source` e `asset`.** Un file è `source` se la sua estensione è una di
  quelle dei file di testo della specifica (§0.1); tutto il resto è `asset`,
  anche dentro le sottocartelle. Un `asset` si nomina con un percorso relativo
  al file che lo usa, senza uscire dal documento.
- **Codifica.** UTF-8. Il `formatter` scrive senza BOM, con LF e un a capo
  finale; il `runtime` legge anche CRLF e BOM.
- **Nomi.** Il nome è l'`id` più l'estensione. Il nome non conta per
  l'identità quando l'`id` è scritto nel file (§0.3).
- **Configurazione del documento.** Il file di configurazione della cartella
  dichiara la `spec version` e il `lang` del documento. Il suo nome e se
  coincida con il `manifest`, che è aperto, restano da decidere. Il `runtime`
  risolve tutte le `composition`, quindi non serve un punto di partenza.
- **`canvas file`.** Il `canvas` salva solo posizioni e riferimenti, partendo
  da JSON Canvas [C: «Il foglio di bozze è un canvas»]. Il `runtime` controlla
  i suoi riferimenti per `id` come gli `embed` e li riscrive alle rinomine; il
  `canvas file` non entra nel `resolved tree` delle `composition`.
- Gli URL esterni come `asset` sono una domanda aperta (handoff.md, domanda
  6).

## 3. Identità

L'`id` non è per forza numerico o incrementale, e può essere mnemonico; è
unico nel documento, fatto di minuscole, cifre e trattino, e non si riusa mai
[C: «Attributi e id»].

*(proposte)*
- La forma è `[a-z0-9]+(-[a-z0-9]+)*`.
- Un `id` vale per tutto il documento, qualunque sia il `kind`.
- `duplicate` crea una copia con un `id` nuovo. Una copia fatta fuori
  dall'`app` con lo stesso `id` è un `id` doppio (esempio 13). Quando un
  oggetto si divide, l'`id` resta a una delle parti, e i collegamenti si
  segnalano da rivedere.
- L'`id` scritto nel file, la traccia `replaces` e l'`imprint` sono APERTI
  (§0.3).
- Se chi scrive non dà un `id`, il `runtime` ne propone uno dalle prime
  parole; vale il rischio del §0.3.

## 4. Attributi comuni

I metadati comuni sono opzionali e gli altri attributi dipendono dal tipo;
ogni nodo ha un `kind`; `id` e `tags` valgono per ogni `kind`, `class` e
`lang` per i nodi che si vedono; `lang` si eredita, da cosa è da precisare;
`tags` e `class` sono separati [C: «Attributi e id»]. Il `kind` è sempre
determinato, scritto nel file o preso dall'estensione secondo il §0.1: non è
fra i metadati opzionali.

| Attributo | Valore *(proposta)* | Note |
|---|---|---|
| `id` | §3 | deciso; scritto o no, §0.3 |
| `kind` | un `kind` della specifica o di un'`extension` | deciso; dove si scrive, §0.1 |
| `tags` | lista di parole | deciso |
| `class` | lista di nomi in `kebab-case` | deciso per i nodi che si vedono |
| `lang` | tag di lingua BCP 47 | deciso per i nodi che si vedono |
| `origin` | da definire | *(proposta della bozza)*: scritto da una persona o generato e confermato |
| `associations` | lista di `id` | *(proposta)*, §6 |
| `replaces` | lista di `id` | APERTO, §0.3 |

*(proposte)*
- **Nodi che si vedono**: `concept`, `text`, `image`, `article`. Non lo sono lo
  `stylesheet` e il `canvas file`.
- **`lang` si eredita** dalla configurazione del documento (§2); un oggetto
  può dichiarare il suo. L'alternativa, il `lang` della `composition` che lo
  usa, renderebbe italiano un testo inglese inserito in un articolo italiano.
- **Niente date né autore**, proposta della bozza: li ha Git. È
  un'inferenza, e non vale per un `bundle`, che non porta storia.
- **Niente attributo "nascosto"**: ciò che non deve uscire non sta in una
  `composition`.

## 5. Il `concept`

Il `concept` è l'unità di significato: un'idea con i suoi metadati e i
collegamenti agli `object` che la sviluppano, anche di `kind` diversi [C:
«L'unità di significato ha i metadati»]. È un file, con gli attributi comuni e
un corpo: il testo dell'idea, in una o due frasi (definizione del glossario).
Non ha `embed` e non sa in quali `composition` è usato.

```````````````````````````````` example 1 classe=0 stato=deciso
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
tags: [vendite, q3]
lang: it
---
Nel terzo trimestre le vendite calano per i ritardi nelle consegne.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "attributes": {"tags": ["vendite", "q3"], "lang": "it"}, "content": [["paragraph", "Nel terzo trimestre le vendite calano per i ritardi nelle consegne."]]}
  ]
}
````````````````````````````````

## 6. Le `association`

I collegamenti fra `concept` e `object` sono bilaterali: si scrivono da una
parte, dall'altra o da entrambe, indifferentemente [C: «I collegamenti fra
concept e object sono bilaterali»]. Restano da decidere: i collegamenti fra
due `object` (orientamento, [C: «Gli sviluppi di un concetto sono file
collegati»]), quelli fra due `concept` (bozza-nodi.md §6, domanda 1) e la
separazione fra associazioni e dipendenze (domanda 3).

*(proposte, dalla bozza §3; con l'opzione 2b del §0.3)*
- L'`association` esiste se almeno uno dei due file la dichiara. Il `runtime`
  calcola l'unione, e il `resolved tree` dice chi la dichiara (esempi 3-5).
- Per toglierla va tolta da tutte e due le parti; lo fa un comando della
  `cli`. Il `formatter` non la sposta da un file all'altro.
- Un'`association` con un bersaglio inesistente è un errore visibile, e non
  compare fra le `associations` del `resolved tree` (esempio 6).
- Un'`association` con una `composition` o uno `stylesheet` è un errore: la
  `composition` usa gli oggetti con l'`embed` (esempio 18).

```````````````````````````````` example 2 classe=1 stato=proposta
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
class: [evidenza]
---
Nel terzo trimestre le vendite sono calate del 12%, soprattutto per i
*ritardi* nelle consegne di agosto.
=== resolved
{
  "nodes": [
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "attributes": {"class": ["evidenza"]}, "content": [["paragraph", "Nel terzo trimestre le vendite sono calate del 12%, soprattutto per i ", ["emphasis", "ritardi"], " nelle consegne di agosto."]]}
  ]
}
````````````````````````````````

```````````````````````````````` example 3 classe=1 stato=deciso
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
associations: [calo-q3-sintesi]
---
Nel terzo trimestre le vendite calano.
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
---
Le vendite sono calate del 12%.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "content": [["paragraph", "Le vendite sono calate del 12%."]]}
  ],
  "associations": [
    {"ids": ["calo-q3", "calo-q3-sintesi"], "declaredIn": ["calo-q3.concept.md"]}
  ]
}
````````````````````````````````

Dichiarato anche dall'oggetto, il collegamento resta uno:

```````````````````````````````` example 4 classe=1 stato=deciso
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
associations: [calo-q3-sintesi]
---
Nel terzo trimestre le vendite calano.
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
associations: [calo-q3]
---
Le vendite sono calate del 12%.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "content": [["paragraph", "Le vendite sono calate del 12%."]]}
  ],
  "associations": [
    {"ids": ["calo-q3", "calo-q3-sintesi"], "declaredIn": ["calo-q3-sintesi.text.md", "calo-q3.concept.md"]}
  ]
}
````````````````````````````````

Dichiarato solo dall'oggetto, è lo stesso collegamento:

```````````````````````````````` example 5 classe=1 stato=deciso
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
---
Nel terzo trimestre le vendite calano.
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
associations: [calo-q3]
---
Le vendite sono calate del 12%.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "content": [["paragraph", "Le vendite sono calate del 12%."]]}
  ],
  "associations": [
    {"ids": ["calo-q3", "calo-q3-sintesi"], "declaredIn": ["calo-q3-sintesi.text.md"]}
  ]
}
````````````````````````````````

```````````````````````````````` example 6 classe=0 stato=proposta
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
associations: [calo-q3-sintesy]
---
Nel terzo trimestre le vendite calano.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "association-unresolved", "file": "calo-q3.concept.md", "target": "calo-q3-sintesy"}
  ]
}
````````````````````````````````

## 7. Gli `object` della classe 1

Ogni `object` è un file con il suo `kind`, e può avere o no un collegamento a
un `concept` [C: «Ogni oggetto è un file»; C: «La composition punta
l'object»].

### 7.1 `text`

Un `text` è un oggetto di prosa, con gli attributi comuni e un corpo
(esempio 2). Se il corpo è un capoverso o più blocchi è APERTO (§0.2). Lo
spazio libero per appunti e calcoli sta dentro il contenuto [C: «Lo spazio
libero per appunti»]: *(proposta)* lo `scratch` è un `text` come gli altri, e
non un `kind` a sé.

Il contenuto interno è un inventario *(proposto)*; i tipi non hanno ancora un
nome (§11.3).

| Contenuto | Note |
|---|---|
| capoverso, elenco puntato e numerato, citazione | |
| `code block` | i marker per eseguire e per mostrare sono decisi [C: «Il codice nel documento porta un marker»], i nomi `eval` ed `echo` proposti; nella classe 1 un blocco da eseguire non si esegue (`eval-unsupported`) |
| `text table` | tabellina non ancora `collection` |
| `math line` | decisa [C: «Lo spazio libero per appunti»]; il risultato è APERTO (§0.4) |
| enfasi, forte, codice in linea, collegamento a un URL | in linea |
| `cross-ref` | riferimento in linea a un oggetto per `id`; la `numbering` è da precisare |
| `footnote` | |

Da decidere: l'`embed` dentro un `text`, che il glossario ammette, e gli
attributi sui singoli blocchi, che dipendono dalla sintassi.

### 7.2 `image`

Un `image` è un'immagine fatta fuori dal `runtime`, come una foto. Secondo la
bozza, un'immagine disegnata dal `runtime` è una vista generata e non si salva
come file (bozza-nodi.md §4).

Un file binario non porta attributi: dove stanno dipende dal §0.1. Con il
descrittore *(proposta)*, l'`image` è un file di testo con gli attributi
comuni, l'attributo `asset` e un corpo con la descrizione, che serve agli
screen reader ed è la sua `static fallback`.

```````````````````````````````` example 7 classe=1 stato=0.1A
=== file lavagna.image.md
---
id: lavagna
kind: image
asset: lavagna.jpg
---
Foto della lavagna con le vendite mensili del 2026.
=== resolved
{
  "nodes": [
    {"id": "lavagna", "kind": "image", "file": "lavagna.image.md", "attributes": {"asset": "lavagna.jpg"}, "content": [["paragraph", "Foto della lavagna con le vendite mensili del 2026."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "asset-missing", "file": "lavagna.image.md", "target": "lavagna.jpg"}
  ]
}
````````````````````````````````

## 8. La `composition` `article`

La `composition` punta l'`object` [C: «La composition punta l'object»]. Lo
stesso oggetto può stare in più `composition`, ed è lo stesso oggetto, non
una copia [C: «L'oggetto richiamato sul foglio»]. Le `composition` danno
l'ordine di lettura [C: «La lista a fianco ha sezioni per tipo»].

*(proposte)*
- La `composition` usa gli oggetti con l'`embed` per `id`. Quale `concept`
  presenta un oggetto lo si ricava dalle sue `association`.
- Capitoli e titoli stanno nella `composition` (bozza-nodi.md §1). È la
  riformulazione, ancora da fare, delle regole sulle sezioni approvate nel
  modello di prima [C: «Attributi e id»]. Il corpo di un `article` contiene
  solo titoli ed `embed`; un capoverso scritto lì è un errore (esempio 10).
  Un titolo apre un capitolo fino al titolo successivo dello stesso grado o
  più alto.
- Questa regola rende impossibili le sezioni senza titolo, approvate nel
  modello di prima. Inoltre i titoli così non hanno `id` per un `cross-ref`,
  né `class` o `lang`, e un `article` e un `deck` sugli stessi oggetti devono
  ripeterli (appendice B).
- Un `embed` di un `id` inesistente è un errore, e il `resolved tree` lo mostra
  al suo posto (esempio 9). Un `embed` di un `concept` o di una `composition`
  è un errore (esempio 11).
- L'`article` nomina il suo `stylesheet` con l'attributo `stylesheet`.

```````````````````````````````` example 8 classe=1 stato=proposta
=== file report-q3.article.md
---
id: report-q3
kind: article
stylesheet: report
---
# Il terzo trimestre

![[calo-q3-sintesi]]

![[lavagna]]
=== file calo-q3-sintesi.text.md
---
id: calo-q3-sintesi
kind: text
class: [evidenza]
---
Le vendite sono calate del 12%.
=== file lavagna.image.md
---
id: lavagna
kind: image
asset: lavagna.jpg
---
Foto della lavagna con le vendite mensili.
=== asset lavagna.jpg
=== file report.css
/* le regole non sono parte dell'esempio */
=== resolved
{
  "nodes": [
    {"id": "calo-q3-sintesi", "kind": "text", "file": "calo-q3-sintesi.text.md", "attributes": {"class": ["evidenza"]}, "content": [["paragraph", "Le vendite sono calate del 12%."]]},
    {"id": "lavagna", "kind": "image", "file": "lavagna.image.md", "attributes": {"asset": "lavagna.jpg"}, "content": [["paragraph", "Foto della lavagna con le vendite mensili."]]},
    {"id": "report", "kind": "stylesheet", "file": "report.css"},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "attributes": {"stylesheet": "report"}, "content": [["heading", {"depth": 1}, "Il terzo trimestre"], ["embed", {"id": "calo-q3-sintesi", "kind": "text", "class": ["evidenza"]}, ["paragraph", "Le vendite sono calate del 12%."]], ["embed", {"id": "lavagna", "kind": "image", "asset": "lavagna.jpg"}, ["paragraph", "Foto della lavagna con le vendite mensili."]]]}
  ]
}
````````````````````````````````

```````````````````````````````` example 9 classe=1 stato=proposta
=== file report-q3.article.md
---
id: report-q3
kind: article
---
![[calo-q3-sintesy]]
=== resolved
{
  "nodes": [
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["embed", {"id": "calo-q3-sintesy", "unresolved": true}]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "embed-unresolved", "file": "report-q3.article.md", "target": "calo-q3-sintesy"}
  ]
}
````````````````````````````````

```````````````````````````````` example 10 classe=1 stato=proposta
=== file report-q3.article.md
---
id: report-q3
kind: article
---
# Il terzo trimestre

Qui scrivo due righe di introduzione.
=== resolved
{
  "nodes": [
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["heading", {"depth": 1}, "Il terzo trimestre"], ["paragraph", "Qui scrivo due righe di introduzione."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "composition-content", "file": "report-q3.article.md", "fix": "sposta il capoverso in un text e mettine l'embed"}
  ]
}
````````````````````````````````

```````````````````````````````` example 11 classe=1 stato=deciso
=== file report-q3.article.md
---
id: report-q3
kind: article
---
![[calo-q3]]
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
---
Nel terzo trimestre le vendite calano.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["embed", {"id": "calo-q3", "unresolved": true}]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "embed-kind", "file": "report-q3.article.md", "target": "calo-q3"}
  ]
}
````````````````````````````````

## 9. Lo `stylesheet`

Il vocabolario dell'impaginazione è un sottoinsieme di CSS definito dalla
specifica, con proprietà traducibili anche per Typst [C: «Il vocabolario
dell'impaginazione»]; modello e impaginazione sono neutri rispetto al motore
[C: «Motori per fasi»]. Il sottoinsieme e chi applica le regole sono APERTI
(§0.5).

*(proposte)*
- Uno `stylesheet` è un file `.css`. Con l'opzione A o C del §0.1 l'`id` è il
  nome del file fino al primo punto e il `kind` viene dall'estensione; con B
  `id` e `kind` stanno nel commento d'intestazione.
- Le regole si agganciano ai nodi con `class`; gli `id` non sono selettori.
- Lo `stylesheet` non cambia il contenuto né l'ordine di lettura.
- Ciò che sta fuori dal sottoinsieme è un errore, non un'istruzione ignorata:
  il sottoinsieme è chiuso perché deve valere anche per Typst.

## 10. `directive`: `kind` non noti e riferimenti

La sintassi ha fin dall'inizio una forma generica per i `kind` non noti, che il
`parser` legge e il `formatter` conserva, e ogni oggetto di un'`extension` porta
una forma statica (proposte dell'orientamento [C: «Estensibilità: estensioni e
connettori»]).

*(proposte)*
- Un file con un `kind` che l'implementazione non conosce si legge come
  `directive`: attributi comuni e `association` valgono, il resto si conserva,
  e nel `resolved tree` il nodo ha `"directive": true` (esempio 12). Vale fra
  classi: un'implementazione di classe 1 legge così un `chart` della classe 3.
- La `static fallback` di una `directive` è il suo corpo di testo, e un
  `embed` di una `directive` la mostra. Una `static fallback` in immagine, per
  esempio un grafico con i `frozen values`, tocca la domanda aperta sui
  risultati nel pacchetto (handoff.md, domanda 6).
- **Riferimenti in forma generica.** Il `core` fissa come si scrive un
  riferimento per `id`: `![[id]]` per un blocco, `[[id]]` in linea, nella
  sintassi provvisoria; negli attributi, le liste `associations` e
  `replaces` e i valori scritti `@id`. Così il `runtime` controlla e riscrive
  i riferimenti anche dentro una `directive`: un `deck` letto da
  un'implementazione di classe 1 ha comunque i suoi `embed` controllati.

```````````````````````````````` example 12 classe=0 stato=proposta
=== file linea-tempo.timeline.md
---
id: linea-tempo
kind: timeline
associations: [calo-q3]
---
Luglio: primi ritardi. Agosto: due fornitori in ritardo di tre settimane.
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
colore: rosso
---
Nel terzo trimestre le vendite calano.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "attributes": {"colore": "rosso"}, "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "linea-tempo", "kind": "timeline", "directive": true, "file": "linea-tempo.timeline.md", "content": [["paragraph", "Luglio: primi ritardi. Agosto: due fornitori in ritardo di tre settimane."]]}
  ],
  "associations": [
    {"ids": ["calo-q3", "linea-tempo"], "declaredIn": ["linea-tempo.timeline.md"]}
  ],
  "diagnostics": [
    {"severity": "warning", "code": "attribute-unknown", "file": "calo-q3.concept.md", "target": "colore"},
    {"severity": "warning", "code": "kind-unknown", "file": "linea-tempo.timeline.md", "target": "timeline"}
  ]
}
````````````````````````````````

## 11. Il `runtime`

Il `runtime` è un processo separato dall'`app` e possiede i file: applica le
modifiche dell'`app` passando dal `formatter` canonico, e riconcilia quelle
fatte da altri programmi o da Git [C: «Il motore è un runtime separato»; C: «Il
runtime possiede il file»]. Ogni operazione esiste anche nella `cli`, con
JSON a schema stabile ed errori con codice e suggerimento di correzione [C:
«Lo strumento nasce con una riga di comando»]. Nessuna dipendenza nasce in
silenzio [C: «Classificazione, collegamenti e promozioni automatiche»].

### 11.1 La risoluzione *(proposta)*

Il `runtime` prende la cartella o il `bundle` e produce un solo `resolved
tree`, che i `renderer` leggono senza ricalcolare [C: «Un solo punto di
calcolo», proposta]. I passi:

1. elenca i file e separa `source` e `asset` (§2);
2. legge di ogni `source` `kind`, `id`, attributi e corpo;
3. controlla forma e unicità degli `id` e i `kind`;
4. risolve le `replaces` (opzione 1a) e costruisce la mappa degli `id`;
5. calcola l'unione delle `association` e ne controlla i bersagli;
6. risolve gli `embed`, gli `asset` e gli `stylesheet` nominati.

La risoluzione non si ferma a un errore: l'albero esce sempre, con il
`diagnostic` accanto. Con un errore la `cli` esce con un codice diverso da
zero e l'`export` si rifiuta. Lo stesso controllo gira dopo ogni merge e ogni
modifica esterna: Git non vede che un ramo ha cancellato un oggetto che un
altro collega (bozza-nodi.md §3). Un riferimento a un `id` doppio non si
risolve e non dà un secondo errore.

### 11.2 I `diagnostic` *(proposta)*

Ogni `diagnostic` ha `severity` (`error` o `warning`), `code`, `file`, e
secondo il codice `target`, `message` e `fix`.

| Codice | Gravità | Quando | `target` | Esempio |
|---|---|---|---|---|
| `syntax` | error | il file non si legge | — | non coperto |
| `id-invalid` | error | `id` fuori forma | l'`id` | 14 |
| `id-duplicate` | error | due file, stesso `id`; uno per file | l'`id` | 13 |
| `kind-missing` | error | `kind` non determinato | — | non coperto |
| `kind-file-extension-mismatch` | error | `kind` diverso dalla `file extension` (0.1A) | il `kind` scritto | 15 |
| `kind-unknown` | warning | `kind` non noto: `directive` | il `kind` | 12 |
| `attribute-unknown` | warning | attributo sconosciuto, ignorato | il nome | 12 |
| `attribute-invalid` | error | valore di forma sbagliata | il nome | non coperto |
| `association-unresolved` | error | bersaglio inesistente | l'`id` | 6 |
| `association-kind` | error | con una `composition` o uno `stylesheet` | l'`id` | 18 |
| `association-replaced` | warning | bersaglio trovato tramite `replaces` (1a) | il vecchio `id` | 17 |
| `embed-unresolved` | error | `id` inesistente | l'`id` | 9 |
| `embed-kind` | error | `embed` di un `concept` o di una `composition` | l'`id` | 11 |
| `embed-replaced` | warning | `embed` risolto tramite `replaces` (1a) | il vecchio `id` | non coperto |
| `replaces-conflict` | error | `id` sostituito ancora presente, o sostituito due volte (1a) | l'`id` | non coperto |
| `composition-content` | error | nella `composition` un blocco che non è titolo né `embed` | — | 10 |
| `eval-unsupported` | warning | blocco da eseguire nella classe 1 | — | non coperto |
| `asset-missing` | error | `asset` assente | il percorso | 7 |
| `stylesheet-unresolved` | error | `stylesheet` nominato assente | l'`id` | non coperto |
| `stylesheet-unsupported` | error | proprietà o selettore fuori dal sottoinsieme (§0.5) | la proprietà o il selettore | non coperto |

```````````````````````````````` example 13 classe=0 stato=deciso
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
---
Nel terzo trimestre le vendite calano.
=== file copia/calo-q3.concept.md
---
id: calo-q3
kind: concept
---
Nel terzo trimestre le vendite calano molto.
=== resolved
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
````````````````````````````````

```````````````````````````````` example 14 classe=0 stato=deciso
=== file calo-q3.concept.md
---
id: Calo_Q3
kind: concept
---
Nel terzo trimestre le vendite calano.
=== resolved
{
  "nodes": [
    {"id": "Calo_Q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "id-invalid", "file": "calo-q3.concept.md", "target": "Calo_Q3", "fix": "calo-q3"}
  ]
}
````````````````````````````````

Con l'opzione A del §0.1 vince il `kind` scritto nel file:

```````````````````````````````` example 15 classe=0 stato=0.1A
=== file calo-q3.text.md
---
id: calo-q3
kind: concept
---
Nel terzo trimestre le vendite calano.
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.text.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "kind-file-extension-mismatch", "file": "calo-q3.text.md", "target": "concept", "fix": "rinomina in calo-q3.concept.md"}
  ]
}
````````````````````````````````

```````````````````````````````` example 16 classe=1 stato=0.3-1ii
=== file ritardi-agosto.text.md
---
kind: text
---
Ad agosto due fornitori hanno consegnato con tre settimane di ritardo.
=== resolved
{
  "nodes": [
    {"id": "ritardi-agosto", "kind": "text", "file": "ritardi-agosto.text.md", "content": [["paragraph", "Ad agosto due fornitori hanno consegnato con tre settimane di ritardo."]]}
  ]
}
````````````````````````````````

Con l'opzione 1a, chi prende il posto di un oggetto scrive `replaces`, e un
collegamento al vecchio `id` si risolve sul successore con un avviso. Se un
successore viene a sua volta sostituito, il nuovo eredita la sua lista, così
non ci sono catene: Zotero, quando fonde, riscrive le relazioni verso
l'elemento che resta ([mergeItems.mjs](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/mergeItems.mjs)).

```````````````````````````````` example 17 classe=1 stato=0.3-1a
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
associations: [ritardi-luglio]
---
Nel terzo trimestre le vendite calano.
=== file ritardi-estate.text.md
---
id: ritardi-estate
kind: text
replaces: [ritardi-luglio, ritardi-agosto]
---
A luglio e ad agosto i fornitori hanno consegnato in ritardo.
=== resolved
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
````````````````````````````````

```````````````````````````````` example 18 classe=1 stato=proposta
=== file calo-q3.concept.md
---
id: calo-q3
kind: concept
associations: [report-q3]
---
Nel terzo trimestre le vendite calano.
=== file report-q3.article.md
---
id: report-q3
kind: article
---
# Il terzo trimestre
=== resolved
{
  "nodes": [
    {"id": "calo-q3", "kind": "concept", "file": "calo-q3.concept.md", "content": [["paragraph", "Nel terzo trimestre le vendite calano."]]},
    {"id": "report-q3", "kind": "article", "file": "report-q3.article.md", "content": [["heading", {"depth": 1}, "Il terzo trimestre"]]}
  ],
  "diagnostics": [
    {"severity": "error", "code": "association-kind", "file": "calo-q3.concept.md", "target": "report-q3"}
  ]
}
````````````````````````````````

### 11.3 Il `resolved tree` *(proposta)*

È un valore JSON con tre liste; una lista vuota si omette.

- **`nodes`**: un elemento per `source`, ordinati per `id` e poi per `file`.
  Ogni nodo ha `id`, `kind`, `file` (percorso con `/`), `attributes` (quelli
  dichiarati, con le chiavi come nel file, tranne `id`, `kind` e
  `associations`; si omette se vuoto), `content` (il corpo; si omette se il
  `kind` non ne ha) e `"directive": true` per i `kind` non noti.
- **`associations`**: una per coppia risolta, con `ids` (i due `id` in ordine)
  e `declaredIn` (i file che la dichiarano, in ordine); ordinate per `ids`.
- **`diagnostics`**: ordinati per `file`, `code` e `target`.

Gli ordini sono per punti di codice Unicode. Due alberi si confrontano come
valori JSON: l'ordine delle chiavi di un oggetto non conta, quello degli array
sì.

Il contenuto segue la forma di JsonML: un blocco o un pezzo in linea è un
array con il tipo, un oggetto di attributi facoltativo e i figli; il testo è
una stringa. Un a capo morbido diventa uno spazio, e stringhe vicine si
uniscono. I nomi dei tipi sono presi da mdast (`paragraph`, `heading`,
`emphasis`, `strong`, `list`, `listItem`, `blockquote`, `code`,
`inlineCode`, `link`, `break`) e non sono normativi finché la sintassi e la
bozza non fissano i nomi (glossario §1.3): alcuni collidono con il glossario,
per esempio paragraph è fra i *Da non usare* di `text`. Mancano ancora i tipi
per `text table`, `math line`, `cross-ref` e la definizione di una
`footnote`.

Nel contenuto di una `composition` un `embed` porta negli attributi `id`,
`kind`, e se ci sono `lang`, `class` e `asset` dell'oggetto, e come figli il
suo contenuto risolto. Un `embed` che non si risolve ha `"unresolved": true`
e nessun figlio. Così un `renderer` legge la `composition` senza cercare altri
nodi.

## Appendice A. Livelli successivi (non normativa)

Dove si aggancerà ciascuno al nucleo.

- **Dati e `collection`** (classe 2). Un CSV o TSV con il suo `schema`
  separato [C: «Tipi, chiavi e dimensioni si dichiarano»]; i metadati del
  `core` passano dal §0.1. È un `object`, con `association` ed `embed`.
- **Grafici** (classe 3). *(proposta della bozza)* Il `chart` applica un
  `template` a una `collection`, e un aggregatore lo ripete su più dati
  (bozza-nodi.md §3). Porta le dipendenze accanto alle `association`
  (domanda 3).
- **Formule** (classe 4). Orientamento: file separati per tipo [C: «Formule e
  connettori in file separati»]. Danno il risultato alle `math line`, se non
  lo ha già dato la classe 1 (§0.4).
- **Connettori** (classe 5). Un file proprio, e un file per le posizioni
  sistemate a mano [C: «I connettori grafici sono un file a parte»].
  *(proposta)* Puntano gli `object` per `id`, nella forma generica del §10.
- **`deck`** (classe 6). Una `composition` fatta di `slide`, con gli stessi
  `embed` [C: «Si procede in modo incrementale»]. Appendice B.
- **Collegamenti semantici.** *(proposta della bozza)* Un indice locale, mai
  nel sorgente, che propone `hint`; un `hint` confermato diventa
  un'`association`, quindi il nucleo non cambia.

## Appendice B. Gli stessi oggetti in un `deck` (non normativa)

Gli oggetti dell'esempio 8 in una presentazione. Nessun oggetto cambia né si
copia: cambia la `composition`. La sintassi delle `slide` è inventata per
l'esempio.

```
---
id: riunione-q3
kind: deck
stylesheet: riunione
---
# Il terzo trimestre

![[calo-q3-sintesi]]

# La lavagna

![[lavagna]]
```

Qui ogni titolo di primo grado aprirebbe una `slide`. L'`article`
`report-q3` e questo `deck` puntano lo stesso `calo-q3-sintesi`: una
correzione del capoverso arriva a tutti e due, e il `concept` `calo-q3` non sa
né dell'uno né dell'altro. Lo `stylesheet` `riunione` può dare alla `class`
`evidenza` un aspetto diverso da `report`. Il titolo «Il terzo trimestre» è
invece scritto due volte (§8).
