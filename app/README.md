# L'app

L'`app`, in Electron, sul `runtime` acceso, con il `navigator` a fianco e due
viste: il `canvas`, su cui si apre, e la pagina, con il sorgente e
l'anteprima affiancati (decisioni in [../docs/contesto.md](../docs/contesto.md),
«Il guscio dell'app» e «Il canvas»).

## Lanciarla sul Mac

Serve Node 22.

```
cd app
npm ci
npm start
```

`npm start` installa e compila il `runtime` in `../runtime` (lo importa come
pacchetto, `doc-runtime`, non lo copia), compila l'app e apre Electron. La
prima volta chiede la cartella di un documento; poi riapre l'ultima. Un'altra
cartella: File → Apri cartella (Cmd-O). Si può anche dire da riga di comando:
`npx electron . --folder <cartella>`.

## Cosa c'è

- **Il navigator**, a sinistra: gli oggetti in `shelf`, una per `kind`, prima
  `article` e `chapter`, poi gli altri; ognuno con il titolo, o le prime
  parole, e l'`id`, e un punto se è sul `canvas` (senza, è archiviato). La
  ricerca filtra per `id` e titolo. Un clic apre il file nella pagina; dal
  `canvas`, apre l'oggetto da solo. Un oggetto si trascina sul `canvas`.
- **Il canvas**, la vista di apertura (Vista → Foglio, Cmd-1, o il pulsante
  «Foglio»). Ogni nodo del `canvas file` è una scheda che mostra l'oggetto
  come apparirà: lo stesso HTML della `preview`, del renderer dell'`export`
  con il foglio di partenza, in uno shadow root (`runtime/src/standalone.ts`).
  - Si scorre con la rotella o il trackpad, o trascinando con la barra
    spaziatrice premuta; lo zoom con Ctrl o Cmd e la rotella (o il pinch), o
    Cmd-+, Cmd-- e Cmd-0. È un piano DOM con una trasformazione CSS, senza
    librerie.
  - Un oggetto può avere più schede, e ognuna è lo stesso oggetto, non una
    copia: una modifica fatta da una scheda si vede su tutte.
  - Una scheda si trascina per spostarla, e la posizione si salva (`place`,
    con `--card` il nodo di quella scheda); se è fra quelle scelte, si
    spostano tutte.
  - Un clic apre il sorgente nella scheda, in CodeMirror con gli stessi
    servizi dell'editor; per un oggetto di un `multi-object file` solo la sua
    parte, dalla `attribute line` all'ultimo blocco. Con Escape, o con un
    clic fuori, si torna alla vista, e il testo si salva dal `formatter`.
  - Un doppio clic sul vuoto apre una scheda nuova lì: uscendo con qualcosa
    scritto nasce un `text` (`create --at`), con l'`id` dalle prime parole.
  - Un oggetto trascinato dal `navigator` riceve una scheda in quel punto
    (`recall`), anche se ne ha già altre.
  - Un clic sceglie una scheda; shift-clic o un riquadro tracciato sul vuoto
    ne scelgono più d'una. «Archivia», o Canc, toglie dal `canvas` le schede
    scelte e solo quelle (`archive`): un oggetto resta sul `canvas`, e con il
    punto nel `navigator`, finché ne ha una.
  - Un doppio clic su una scheda apre l'oggetto da solo nella pagina: il suo
    file nell'editor, al suo punto, e solo lui nell'anteprima.
  - «Metti in sequenza» numera le schede scelte nell'ordine di lettura (due
    schede dello stesso oggetto danno due `embed`),
    dall'alto in basso e poi da sinistra a destra; nel pannello l'ordine si
    corregge con ↑ e ↓, e con un titolo nasce l'`article` (`compose`), che si
    apre nella pagina.
  - «Trova sul foglio» cerca nell'`id`, nel titolo e nel testo delle schede:
    la vista va sulla prima, dall'alto, al centro, e la segna; Invio, o ↓, va
    alla seguente, Maiusc-Invio, o ↑, alla precedente.
  - Quando una scheda si mette, si crea o si ingrandisce (con l'angolo in
    basso a destra), le altre che la coprono si spostano quanto basta (lo fa
    il `runtime`, uguale per la `cli`); i gruppi si disegnano sotto le
    schede, con l'etichetta.
  - «+» sull'intestazione di una scheda apre un testo nuovo accanto, a destra
    o sotto dove c'è più spazio (`create --near`); «⊕» porta vicino gli
    oggetti legati alla scheda (`gather`).
  - «Metti in ordine per tipo» o «per tag» (`arrange`) mette le schede in un
    gruppo per `kind` o per tag; rifarlo sostituisce quei gruppi e lascia
    quelli fatti a mano.
  - Gli errori di un'operazione si leggono nella barra in alto; un'operazione
    che porterebbe errori non scrive niente.
- **Le `collection`** (classe 2) hanno uno `shelf` nel `navigator`;
  l'anteprima e le schede mostrano la loro tabella, come la scrive il
  `runtime`. Il pulsante «Dati», sul `descriptor`, apre il file di dati, che si
  modifica come testo: senza Markdown, con le tabulazioni visibili, e Tab
  scrive una tabulazione; i `diagnostic` dei dati stanno al loro punto del
  file. Un clic su una riga della tabella nell'anteprima apre il file di dati
  a quella riga. Con il cursore in una tabella di un `text` o di uno
  `scratch` compare «Trasforma in collection» (`turn-into`); se la tabellina
  perde qualcosa (formattazione, allineamento) l'avviso compare nella barra.
  Una tabella grande si taglia: l'anteprima mostra i primi 1000 `record`,
  una scheda del `canvas` i primi 20, con un'ultima riga «… altri N
  record»; l'`export` e la stampa hanno la tabella intera (§11.6).
- **La `grid`**: aprendo una `collection` l'editor mostra i suoi dati in una
  griglia; «Testo» porta al `descriptor` come testo, «Griglia» torna. Niente
  coordinate: l'intestazione mostra il `title`, o il `name`, e il tipo.
  - A riposo una cella mostra la stringa della tabella (decimali fissi e
    gruppi in colonna); in modifica il valore nella lingua del documento,
    «1,5» in italiano, e il file riceve «1.5». Un valore che non è del suo
    tipo si tiene com'è scritto e si segna (sottolineato, `aria-invalid`, con
    il suggerimento nel titolo). Un campo con `categories` ha un menu, un
    `boolean` una casella. Tabulazioni e fine riga in un valore diventano
    spazi già mentre si scrive, perché il TSV non le ammette.
  - Tastiera come in un foglio di calcolo: frecce (con Maiusc allargano la
    scelta), Tab, Invio o F2 per scrivere, Invio per confermare e scendere, Esc
    per annullare la modifica, Canc per svuotare la scelta, Pag su e giù,
    Home e Fine; Cmd-Z e Cmd-Maiusc-Z annullano e ripetono in tutta la
    griglia; Cmd-S salva.
  - Copia e incolla: una scelta rettangolare si copia come testo con
    tabulazioni e righe; un blocco copiato da un foglio di calcolo si incolla
    dalla cella scelta e aggiunge i `record` che mancano.
  - La barra: `record` in fondo o dopo quello scelto, togliere, spostare su e
    giù (l'ordine è quello del file); il campo scelto, con `title` e tipo da
    cambiare e da togliere; un campo nuovo, con il `name` ricavato dal titolo
    come in `turn-into`. Il `name` non cambia dalla griglia.
  - Il salvataggio segue l'editor: il buffer vale subito per l'albero e
    l'anteprima, e cambiando file o chiudendo l'app chiede di salvare. Si
    scrivono insieme il TSV, nella forma di `turn-into`, e il `descriptor`,
    dal `formatter` (§12.6 della specifica).
  - Si disegnano solo le righe visibili: la griglia resta fluida fino al
    limite di 100 000 `record` (`npm run measure:grid`, sotto).
  - Accessibilità: `role="grid"`, righe e celle con `aria-rowindex` e
    `aria-colindex`, la cella attiva con `aria-activedescendant`, le celle
    scelte con `aria-selected`, quelle sbagliate con `aria-invalid`.
  - Fuori da questo passo: ordinamento e filtri (sono viste), formule, pivot;
    e la griglia dentro una scheda del `canvas`, dove un clic apre ancora il
    sorgente.
- **La pagina** (Vista → Pagina, Cmd-2, o il pulsante «Pagina»):
- **Il sorgente**, a sinistra nella pagina: CodeMirror 6 sul file aperto, con i servizi del
  language server, chiamati nel processo principale con le stesse funzioni
  (`runtime/src/language-services.ts`):
  - i diagnostic come sottolineature, con il range del `runtime`;
  - il completamento degli `id` dopo `[[` e `![[`;
  - l'hover, anche con il valore di una riga di calcolo;
  - vai alla definizione con F12 o Cmd-clic.
  Il testo non salvato vale subito per l'albero e l'anteprima, come i buffer
  aperti del language server. Cmd-S salva passando dal `formatter`; se il
  formatter cambia il testo, l'editor lo prende e tiene il cursore il più
  vicino possibile a dov'era. Sull'errore `composition-content` compare il
  pulsante «Estrai in un oggetto», che usa l'operazione del `runtime`.
  Cambiando file o chiudendo con modifiche non salvate, l'app chiede se
  salvare, non salvare o annullare.
- **L'anteprima**, a destra nella pagina: la `preview` dell'`article` del file aperto, o
  del primo che lo include, con gli errori elencati in cima, che si
  aggiorna mentre si scrive senza ricaricarsi. È la pagina di `serve`, sullo
  stesso `runtime` acceso, in una vista sua senza preload: stessa CSP
  nell'intestazione, stesso codice d'accesso. Un clic su un elemento apre
  nell'editor il file del suo `data-source` e porta il cursore all'inizio
  del range.
- Il tema è quello del sistema, chiaro o scuro.
- **L'aspetto**, solo dell'`app` (la resa del documento resta quella del suo
  stylesheet): tre direzioni visive da scegliere, diverse nella disposizione
  e nella forma, ciascuna con i suoi token CSS chiari e scuri in
  `src/renderer/style.css`, con le stesse funzioni:
  - «lavagna», il default: il `canvas` occupa tutta la finestra, la barra
    del foglio è una pillola fluttuante in basso al centro, il `navigator`
    un pannello fluttuante a sinistra (il piano parte alla sua destra); le
    schede mostrano l'intestazione solo al passaggio del mouse o se scelte;
    nella pagina il sorgente e la griglia sono un pannello fluttuante, e
    l'anteprima ha margine e angoli arrotondati;
  - «documento»: barra laterale stretta e chiara, senza bordi, un'icona per
    tipo accanto alle voci, sezioni in minuscolo, barre trasparenti; nella
    pagina l'editor e la griglia sono un foglio centrato su un fondo grigio;
    il `canvas` ha una griglia a linee;
  - «studio»: fondo tinto, superfici arrotondate separate da 8 px; la barra
    mostra il file come percorso (tipo › id), le voci del `navigator` sono
    più alte con quella attiva a pillola, le intestazioni delle schede
    sottili; l'anteprima ha margine e angoli arrotondati.
  La variabile d'ambiente temporanea `DOC_APP_VARIANT=lavagna|documento|studio`
  sceglie la direzione; scelta una, le altre due si tolgono. I pulsanti
  comuni hanno un'icona di Lucide, con tooltip e `aria-label`; il testo dei
  token rispetta il contrasto WCAG AA (almeno 4,5:1) in tutte e sei le
  tavolozze, controllato dai test di unità. Font e icone sono in `assets/`,
  con versione e sha256 (`assets/README.md`), incorporati senza CDN.

## Sicurezza

La finestra ha `contextIsolation`, la `sandbox` e niente `nodeIntegration`;
il preload espone un'API piccola, `window.docApp`, e il processo principale
controlla che ogni percorso stia nella cartella del documento. L'anteprima
sta in una vista separata, senza preload, e carica solo gli indirizzi della
`preview`; nessuna pagina apre finestre o naviga altrove, e i collegamenti
al web si aprono nel browser del sistema. Le schede del `canvas` stanno
nella finestra: il loro HTML, scritto dal renderer dell'`export`, che
esegue l'escape del testo, entra in uno shadow root senza script, e la CSP
della finestra ammette immagini e font solo da 127.0.0.1, gli indirizzi
della `preview`.

La versione di Electron è 44.9.3, con Chromium 152.0.7977.167: la stessa del
`runtime`, che la usa per la stampa e per i test nel browser, così anteprima,
app e PDF hanno un solo motore. `npm audit` non segnala avvisi. `npm ci`
scarica Electron (lo script `postinstall`); non serve installare un browser a
parte, nemmeno sul Mac.

## Cosa manca

L'editing grafico sopra l'anteprima; sul `canvas` l'ordine per data, gli
archi, spostare e modificare i gruppi a mano e più `canvas` per documento; la creazione di oggetti diversi dal `text`
dall'interfaccia (tranne «Estrai in un oggetto»), la rinomina
dall'interfaccia, più file aperti insieme, il pacchetto firmato. Una scheda
nuova non ancora creata non conta come modifica non salvata: chiudendo
l'app, il suo testo si perde.

## Test

```
npm test            # le funzioni dietro l'IPC, senza Electron
npm run test:e2e    # end to end, con l'Electron del pacchetto e playwright-core
npm run test:variants  # le tre direzioni visive si aprono senza errori
```

`npm run test:variants` apre l'`app` con ciascuna direzione e controlla
che non ci siano errori nella console, che ci siano i token, Inter e le
icone con la loro etichetta. Con `VARIANT_SCREENSHOTS=<cartella>` salva
anche, in chiaro e in scuro, le immagini del `canvas`, della pagina e della
griglia (la finestra, senza la vista dell'anteprima).

`npm run measure:grid` apre una `collection` di 100 000 `record` e stampa
i tempi di apertura, di scorrimento, della modifica di una cella e
dell'anteprima che la segue. Misura del 2026-10-30, in un contenitore
Linux a 4 core: apertura 430-570 ms, scorrimento 16,7 ms per frame (il
peggiore 19-30 ms), modifica 170-210 ms; l'anteprima di un articolo con la
tabella, che ne mostra i primi 1000 `record`, arriva in 1,6-1,7 s, con
ricalcoli di 0,4-0,7 s (prima del taglio: 61-80 s, con ricalcoli di 7-9 s).

Su Linux l'end to end gira sulla piattaforma headless di Chromium, senza
schermo e senza `xvfb`; `node dist-test/e2e.js` da solo va bene dopo
`npm run build`, che gli script npm fanno prima. L'end to end apre
l'app su una cartella di prova, sul `canvas`: scrive due testi con un doppio
clic, ne modifica uno nella scheda e lo apre da solo nella pagina con un
doppio clic, sposta l'altro, lo archivia e lo richiama trascinandolo dal
`navigator`; trascina di nuovo l'altro per avere una sua seconda scheda, ci
scrive e controlla che la modifica si veda sull'altra, e la archivia
lasciando l'altra; poi li sceglie con un riquadro, corregge l'ordine proposto e ne fa
un `article`, controllando ogni volta il `canvas file` sul disco. Tornata sul
foglio, cerca una scheda e controlla che sia al centro della vista, scrive un
testo con «+» accanto a una scheda, raccoglie l'`article` vicino al testo che
include e mette in ordine per tipo, controllando che nessuna scheda ne copra
un'altra, e che la scheda di una `collection` mostri la tabella con i numeri
a destra e i decimali fissi. Poi, nella
pagina, scrive nell'editor e aspetta il testo
nell'anteprima, che non deve ricaricarsi, poi fa clic su un titolo e su un
capoverso dell'anteprima e controlla file, riga e colonna del cursore; fa
clic su una riga della tabella di una `collection` e controlla che si apra il
TSV a quella riga, e fa «Trasforma in collection» su un `text` che è una
tabella; nella griglia scrive «1,5» in un campo `number` e trova 1.5 nel TSV
salvato con l'anteprima che segue, incolla un blocco di 2 `record` e 3 valori
che ne aggiunge uno, aggiunge un campo e controlla che un valore sbagliato
sia segnato; controlla anche che cambiando file e chiudendo l'app chieda di salvare, e
che il testo finisca sul disco. Con `E2E_SCREENSHOT=<file.png>` un end to
end che fallisce salva anche l'immagine della finestra.

## Com'è fatta

- `src/main.ts`: il processo principale, la finestra, la vista
  dell'anteprima, l'IPC.
- `src/session.ts`: quello che il processo principale fa senza Electron:
  il `runtime` acceso (`LiveFolder`), `serve` sullo stesso `runtime`, i
  servizi, il salvataggio con il formatter, le schede e le operazioni del
  `canvas`. I test di unità lo usano direttamente.
- `src/preload.ts`: l'API della finestra.
- `src/renderer/renderer.ts`: la finestra, le due viste e la pagina;
  `src/renderer/board.ts`: il `canvas`; `src/renderer/editor.ts`: CodeMirror
  con i servizi, per la pagina e per le schede.
- `src/offset.ts`: dove va il cursore dopo il formatter.
- `src/grid-model.ts`: il modello della griglia, senza DOM (valori, incolla,
  `record` e campi, annulla); `src/renderer/grid.ts`: la sua vista.
- `src/renderer/style.css`: i token delle tre direzioni e le regole;
  `src/renderer/icons.ts`: le icone, dai file di `assets/icons`.

Dipendenze, con versione esatta: CodeMirror 6 (`@codemirror/state` 6.7.6,
`view` 6.43.14, `language` 6.13.1, `lang-markdown` 6.5.2, `autocomplete`
6.20.3, `lint` 6.9.7, `commands` 6.11.1, `search` 6.7.2, `theme-one-dark`
6.1.3; MIT). Per lo sviluppo `electron` 44.9.3 (MIT), `esbuild` 0.28.2
(MIT), `typescript` 5.9.3 (Apache-2.0), `playwright-core` 1.56.1
(Apache-2.0), `@types/node` (MIT). Incorporati: Inter 4.1 (OFL 1.1) e le
icone di Lucide 1.65.0 (ISC), in `assets/`.
