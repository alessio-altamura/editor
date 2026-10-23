# L'app

Il primo guscio dell'`app`, in Electron: il sorgente e l'anteprima affiancati,
con il `navigator` a fianco, sul `runtime` acceso (decisione in
[../docs/contesto.md](../docs/contesto.md), «Il guscio dell'app»).

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
  parole, e l'`id`. La ricerca filtra per `id` e titolo. Un clic apre il file.
- **Il sorgente**, al centro: CodeMirror 6 sul file aperto, con i servizi del
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
- **L'anteprima**, a destra: la `preview` dell'`article` del file aperto, o
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
al web si aprono nel browser del sistema.

La versione di Electron è 44.9.3, con Chromium 152.0.7977.167: la stessa del
`runtime`, che la usa per la stampa e per i test nel browser, così anteprima,
app e PDF hanno un solo motore. `npm audit` non segnala avvisi. `npm ci`
scarica Electron (lo script `postinstall`); non serve installare un browser a
parte, nemmeno sul Mac.

## Cosa manca

L'editing grafico, il canvas, la creazione di oggetti dall'interfaccia
(tranne «Estrai in un oggetto»), la rinomina dall'interfaccia, più file
aperti insieme, il pacchetto firmato.

## Test

```
npm test            # le funzioni dietro l'IPC, senza Electron
npm run test:e2e    # end to end, con l'Electron del pacchetto e playwright-core
```

Su Linux l'end to end gira sulla piattaforma headless di Chromium, senza
schermo e senza `xvfb`; `node dist-test/e2e.js` da solo va bene dopo
`npm run build`, che gli script npm fanno prima. L'end to end apre
l'app su una cartella di prova, scrive nell'editor e aspetta il testo
nell'anteprima, che non deve ricaricarsi, poi fa clic su un titolo e su un
capoverso dell'anteprima e controlla file, riga e colonna del cursore;
controlla anche che cambiando file e chiudendo l'app chieda di salvare, e
che il testo finisca sul disco.

## Com'è fatta

- `src/main.ts`: il processo principale, la finestra, la vista
  dell'anteprima, l'IPC.
- `src/session.ts`: quello che il processo principale fa senza Electron:
  il `runtime` acceso (`LiveFolder`), `serve` sullo stesso `runtime`, i
  servizi, il salvataggio con il formatter. I test di unità lo usano
  direttamente.
- `src/preload.ts`: l'API della finestra.
- `src/renderer/`: la pagina, con CodeMirror.
- `src/offset.ts`: dove va il cursore dopo il formatter.

Dipendenze, con versione esatta: CodeMirror 6 (`@codemirror/state` 6.7.6,
`view` 6.43.14, `language` 6.13.1, `lang-markdown` 6.5.2, `autocomplete`
6.20.3, `lint` 6.9.7, `commands` 6.11.1, `search` 6.7.2, `theme-one-dark`
6.1.3; MIT). Per lo sviluppo `electron` 44.9.3 (MIT), `esbuild` 0.28.2
(MIT), `typescript` 5.9.3 (Apache-2.0), `playwright-core` 1.56.1
(Apache-2.0), `@types/node` (MIT).
