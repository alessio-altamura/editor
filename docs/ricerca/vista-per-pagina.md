# Vista per pagina con due motori

Ricerca del 2026-10-11 sulla condizione posta da Alessio: l'editing grafico
avviene sopra l'anteprima HTML, a patto che esista anche una vista per pagina.
Il PDF lo fa un altro motore, probabilmente Typst. Il problema: se le pagine
dell'editor le decide il browser e quelle del PDF Typst, i salti pagina non
coincidono. Ogni fatto portante è stato ricontrollato su fonte primaria; dove
il controllo ha corretto, qui c'è la versione corretta.

## In sintesi

- Nessun prodotto noto ha una vista per pagina coerente con la stampa usando
  due motori. Google Docs, ONLYOFFICE e Collabora Online usano un solo motore,
  che decide le righe e dipinge anche l'editor. CKEditor è il controesempio
  parziale: stima i salti nel browser e li allinea a mano, senza garanzia.
- Gli stessi font non bastano. Typst e i browser vanno a capo con algoritmi
  diversi (Knuth-Plass sul paragrafo contro riga per riga) e sillabano con
  dizionari diversi. Una sola riga diversa sposta tutti i salti successivi.
- L'anteprima di Typst (tinymist, typst.ts) disegna le pagine già impaginate
  da Typst. Se il runtime compila una volta e da lì produce sia il PDF sia la
  vista per pagina, i salti coincidono per costruzione.
- Scrivere direttamente su quelle pagine si può: è stato dimostrato da un
  prototipo. Ma lo stesso prototipo l'ha giudicato insufficiente come modo
  principale di scrivere, e Typst stesso non lo offre.
- Mettere nella stessa pagina un blocco reso dal motore HTML in mezzo a blocchi
  resi da Typst produce una giuntura visibile. Se il blocco in modifica appare
  diverso, deve esserlo dichiaratamente.

## Cosa fanno gli altri

- **Google Docs:** dal 2010 non usa il browser per il testo modificabile: ha
  una superficie di editing e un motore di layout propri in JavaScript. Dal
  maggio 2021 migra gradualmente al disegno su canvas. Le righe le decide il
  suo motore, non il CSS
  ([2010](https://drive.googleblog.com/2010/05/whats-different-about-new-google-docs.html),
  [2021](https://workspaceupdates.googleblog.com/2021/05/Google-Docs-Canvas-Based-Rendering-Update.html)).
- **ONLYOFFICE:** dipinge ogni pixel su canvas. Lato server il PDF esce dallo
  stesso codice di layout, eseguito in V8 (dedotto dal sorgente di
  doctrenderer).
- **Collabora Online:** mostra riquadri di pagina disegnati dal nucleo di
  LibreOffice, lo stesso che esporta il PDF.
- **CKEditor 5 Pagination:** è a licenza commerciale e funziona di default solo
  su Blink. Il PDF lo fa un servizio separato, e la documentazione avverte che
  basta una minima differenza di margini o font per spostare i salti
  ([pagination](https://ckeditor.com/docs/ckeditor5/latest/features/pagination/pagination.html)).
- **Tiptap Pages:** è a pagamento e in beta. Le alternative open source sono
  piccole e misurano comunque nel browser.
- **Paged.js:** MIT, ultima versione stabile 0.4.3 del 2023, riscrittura in
  corso. Rifà tutto il documento a ogni modifica
  ([npm](https://registry.npmjs.org/pagedjs)).
- **Vivliostyle:** molto attivo, ma AGPL-3.0. Anteprima e PDF coincidono perché
  il PDF lo stampa Chrome.
- **Word per il web:** la vista a pagine separate è diventata predefinita solo
  nel 2023 (fonte secondaria).

## Perché gli stessi font non bastano

Typst 0.15.1 usa righe ottimizzate sul paragrafo per il testo giustificato, la
sillabazione hypher, e un modello verticale con bordi a cap-height e baseline,
interlinea di 0.65em ([par](https://typst.app/docs/reference/model/par/),
[text](https://typst.app/docs/reference/text/text/)). Chromium va a capo riga
per riga, e `text-wrap: pretty` ritocca solo le ultime righe.
Su vedove e orfane i due sistemi sono più vicini di quanto sembri: entrambi
applicano in pratica una regola a due righe. Il modello verticale si può
emulare in CSS (`text-box: trim-both cap alphabetic`, interlinea calcolata);
gli a capo no. Anche Prince, che è un motore CSS, non garantisce gli stessi a
capo dei browser ([forum Prince](https://www.princexml.com/forum/topic/4381?post=21953)).

## Il browser sa impaginare a schermo?

Solo in parte. La frammentazione di Chromium (LayoutNG) è completa dalla
versione 108, ma i contenitori sono le colonne e le pagine di stampa. I margin
box `@page` valgono solo in stampa. Chrome 145 (gennaio 2026) aggiunge
`column-height` e `column-wrap`, che a schermo producono una pila di
"pagine" con la frammentazione nativa. Restano esclusi intestazioni, numeri di
pagina e pagine di dimensioni diverse, e gli altri browser non sono
verificati. In ogni caso i salti li decide Blink, non Typst
([RenderingNG](https://developer.chrome.com/docs/chromium/renderingng-fragmentation)).

L'export HTML di Typst non aiuta: è sperimentale e lascia il layout al
browser. Non esiste un HTML Typst diviso nelle stesse pagine del PDF
([reference html](https://typst.app/docs/reference/html/)).

## Pagine disegnate da Typst

- **Lo stesso layout.** PDF, PNG e SVG di Typst partono tutti dal documento già
  impaginato, e l'anteprima di tinymist manda al browser le differenze di quel
  documento ([Typst 0.15](https://typst.app/blog/2026/typst-0.15/)). La
  coincidenza vale solo se anteprima ed export usano la stessa versione di
  Typst, gli stessi font e gli stessi input. tinymist e typst.ts dipendono da
  fork di Typst: il runtime deve compilare una sola volta e servire entrambi.
- **Pezzi riusabili.** typst.ts (Apache-2.0) disegna nel browser in SVG,
  canvas o DOM, con aggiornamenti incrementali e una modalità per le slide. La
  versione stabile su npm è ferma a Typst 0.14.2; la rc più recente, del 29
  giugno, usa la 0.15.0. tinymist (Apache-2.0, 0.15.8) è già un runtime con
  LSP più anteprima, con navigazione nei due versi tra sorgente e pagina.
- **Dalla pagina al sorgente.** typst-ide risolve un clic sulla pagina fino al
  singolo carattere, ma solo per il testo di markup; per contenuto generato da
  codice restituisce l'inizio del nodo. Il verso opposto, dal sorgente alla
  pagina, arriva solo al nodo. Il cursore disegnato al carattere va scritto da
  noi ([jump.rs](https://raw.githubusercontent.com/typst/typst/main/crates/typst-ide/src/jump.rs)).
- **Testi generati.** Numeri di figura, contatori e voci d'indice non hanno uno
  span: vanno resi di sola lettura o rimandati al nodo che li genera. Se il
  runtime genera sorgente Typst dal nostro albero, serve anche una mappa fra il
  sorgente generato e i nodi.
- **Latenza.** L'unica misura trovata viene da un prototipo, flatflax: circa
  60 ms per un carattere su 14 pagine, circa 0,5 s su 100 pagine. Il documento
  di prova però era testo continuo senza salti pagina espliciti, e Typst
  memoizza il layout per tratti di documento separati dai salti espliciti.
  Slide e capitoli che iniziano su pagina nuova dovrebbero costare meno, ma non
  è misurato. Va misurato sui nostri documenti, compreso il disegno nel
  browser, che nello stesso prototipo era il vero collo di bottiglia.

## Scrivere sulla pagina di Typst

- **Il prototipo flatflax** ([doc](https://raw.githubusercontent.com/flatflax/typst-editor/main/doc/phase3-single-view.md))
  ha ottenuto cursore, selezione e digitazione direttamente sull'SVG di Typst:
  un secondo SVG sovrapposto per il cursore, una textarea nascosta per l'input,
  ricompilazione con 150 ms di debounce. È GPL-3.0 ed è un prototipo di una
  persona: utile come riferimento di design, non come codice da riusare.
- **Lo stesso progetto poi ci ha rinunciato** come modo principale di
  scrivere. Sulla pagina disegnata mancano copia e incolla nativi, screen
  reader, ricerca nella pagina e undo, e ogni movimento del cursore richiede un
  giro verso Rust. Ha scelto una "lente": il paragrafo a fuoco diventa testo
  modificabile nativo, gli altri restano pagine Typst, e si ricompila quando si
  esce dal paragrafo.
- **Il tentativo precedente era fallito.** Rendere il blocco attivo con
  ProseMirror e CSS in mezzo ai vicini resi da Typst lasciava una giuntura
  proprio dove l'utente guarda: "different layout engines give materially the
  same content different line breaks, spacing, and font metrics".
- **Tylina**, che è proprietario, dichiara cursore, selezione e input sul
  risultato impaginato, con editor in loco per i contenuti complessi e una
  modalità slide. Dimostra che la pila si può costruire con typst.ts e
  tinymist, ma non è riusabile.
- **typst.app**, l'editor ufficiale, non lo fa: si scrive nel sorgente, e la
  pagina serve a navigare con clic e salto.

## Opzioni

1. **Pagine di Typst, editing altrove.** La vista per pagina è disegnata da
   Typst e un clic salta al punto giusto della vista HTML a flusso, dove si
   scrive. Ci sono tutti i pezzi, Apache-2.0, e le pagine sono identiche al
   PDF. La condizione "editing sopra l'anteprima con vista per pagina" è
   soddisfatta solo a metà: sulle pagine non si scrive.
2. **Pagine di Typst con lente per blocco.** Il blocco a fuoco si apre in un
   editor nativo, dichiaratamente diverso, e si ricompila all'uscita. Nessuna
   differenza di paginazione con il PDF, input senza latenza, IME e undo
   nativi. Il blocco in modifica però non è WYSIWYG finché è aperto.
3. **Righe di Typst nel DOM.** Typst calcola righe e pagine; l'HTML posiziona
   ogni riga senza andare a capo da sé, adattando la larghezza come fa il
   livello di testo di pdf.js. Righe e pagine coincidono con il PDF e il testo
   resta nel DOM (accessibile, selezionabile, ricercabile). Però serve una
   superficie di editing propria, come Google Docs, e ogni tasto passa da
   Typst.
4. **Solo i salti da Typst.** Typst dice dove comincia ogni pagina e l'HTML
   forza il salto lì. Il contenuto per pagina coincide, le righe interne no, e
   una pagina HTML può traboccare.
5. **Vista per pagina approssimata.** Il browser impagina da sé (multicol,
   Paged.js) e si dichiara che la pagina vera è quella del PDF. È la più
   semplice, ma non dà garanzie.

Rivedere la decisione dei due motori, facendo fare il PDF al browser, darebbe
coerenza con pezzi già pronti, ma con tipografia peggiore e licenze più
strette (Vivliostyle è AGPL).

## Da misurare prima di scegliere

- Latenza di Typst 0.15 per tasto sui nostri documenti, con e senza salti
  espliciti, insieme al tempo di disegno nel browser.
- Quanto coincidono le righe tra Typst e Chromium con gli stessi font: un
  banco che confronti le righe dei frame Typst con i rettangoli del DOM.
- Accessibilità di una vista per pagina su canvas o SVG.
