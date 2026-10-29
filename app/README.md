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
  - Una scheda si trascina per spostarla, e la posizione si salva (`place`);
    se è fra quelle scelte, si spostano tutte.
  - Un clic apre il sorgente nella scheda, in CodeMirror con gli stessi
    servizi dell'editor; per un oggetto di un `multi-object file` solo la sua
    parte, dalla `attribute line` all'ultimo blocco. Con Escape, o con un
    clic fuori, si torna alla vista, e il testo si salva dal `formatter`.
  - Un doppio clic sul vuoto apre una scheda nuova lì: uscendo con qualcosa
    scritto nasce un `text` (`create --at`), con l'`id` dalle prime parole.
  - Un oggetto trascinato dal `navigator` torna sul `canvas` in quel punto
    (`recall`), o ci si sposta se c'è già.
  - Shift-clic o un riquadro tracciato sul vuoto scelgono più schede;
    «Archivia», o Canc, le toglie dal `canvas` (`archive`): gli oggetti
    restano nel `navigator`.
  - Un doppio clic su una scheda apre l'oggetto da solo nella pagina: il suo
    file nell'editor, al suo punto, e solo lui nell'anteprima.
  - «Metti in sequenza» numera le schede scelte nell'ordine di lettura,
    dall'alto in basso e poi da sinistra a destra; nel pannello l'ordine si
    corregge con ↑ e ↓, e con un titolo nasce l'`article` (`compose`), che si
    apre nella pagina.
  - Gli errori di un'operazione si leggono nella barra in alto; un'operazione
    che porterebbe errori non scrive niente.
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

L'editing grafico sopra l'anteprima; sul `canvas` «fai spazio vicino», «metti
in ordine per tipo», le relazioni al posto delle coordinate, gli archi e più
`canvas` per documento; la creazione di oggetti diversi dal `text`
dall'interfaccia (tranne «Estrai in un oggetto»), la rinomina
dall'interfaccia, più file aperti insieme, il pacchetto firmato. Una scheda
nuova non ancora creata non conta come modifica non salvata: chiudendo
l'app, il suo testo si perde.

## Test

```
npm test            # le funzioni dietro l'IPC, senza Electron
npm run test:e2e    # end to end, con l'Electron del pacchetto e playwright-core
```

Su Linux l'end to end gira sulla piattaforma headless di Chromium, senza
schermo e senza `xvfb`; `node dist-test/e2e.js` da solo va bene dopo
`npm run build`, che gli script npm fanno prima. L'end to end apre
l'app su una cartella di prova, sul `canvas`: scrive due testi con un doppio
clic, ne modifica uno nella scheda e lo apre da solo nella pagina con un
doppio clic, sposta l'altro, lo archivia e lo richiama trascinandolo dal
`navigator`, li sceglie con un riquadro, corregge l'ordine proposto e ne fa
un `article`, controllando ogni volta il `canvas file` sul disco. Poi, nella
pagina, scrive nell'editor e aspetta il testo
nell'anteprima, che non deve ricaricarsi, poi fa clic su un titolo e su un
capoverso dell'anteprima e controlla file, riga e colonna del cursore;
controlla anche che cambiando file e chiudendo l'app chieda di salvare, e
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

Dipendenze, con versione esatta: CodeMirror 6 (`@codemirror/state` 6.7.6,
`view` 6.43.14, `language` 6.13.1, `lang-markdown` 6.5.2, `autocomplete`
6.20.3, `lint` 6.9.7, `commands` 6.11.1, `search` 6.7.2, `theme-one-dark`
6.1.3; MIT). Per lo sviluppo `electron` 44.9.3 (MIT), `esbuild` 0.28.2
(MIT), `typescript` 5.9.3 (Apache-2.0), `playwright-core` 1.56.1
(Apache-2.0), `@types/node` (MIT).
