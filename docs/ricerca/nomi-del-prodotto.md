# Nomi del prodotto

Report interno sulla ricerca di un nome, 2026-10-21/22. La decisione è in
[contesto.md](../contesto.md), voce «Nomi del prodotto».

## Esito

**Kamii** (da *kami*, 紙, carta) è il nome provvisorio del progetto. Alessio
non è ancora sicuro che gli piaccia: «lascia solo Kamii per ora, non so ancora
bene se mi piace, tienila solo come nome del progetto». I concetti restano
`object`, `composition` e `canvas`, e il comando del runtime resta per ora
`doc-runtime`.

## Come è andata

1. Serviva un nome per il comando e il pacchetto del runtime, e forse per lo
   standard. Criteri: corto, minuscolo come comando, pronunciabile in italiano
   e in inglese senza significati sgradevoli, non un comando Unix comune, non
   il nome di uno strumento noto per documenti, note o markup.
2. Alessio ha fatto notare che ID-Zero condivide il nome con un anime (*ID-0*,
   2017) e ha chiesto nomi da film, manga o anime giapponesi poco noti. Ha
   proposto *patema* (*Patema Inverted*, Yoshiura, 2013), poi ha aggiunto le
   opere vecchie (*Paprika* gli piace ma è troppo famosa).
3. Nuovo criterio di Alessio: un nome che entri nel lessico, da riusare
   nell'app al posto dell'oggetto o dell'aggregatore, «dammi un xxxx», come è
   successo a «tweet».
4. Alessio ha proposto una famiglia: Kamii per l'app e per il primo canvas,
   kumi (組み, assemblare) per la composizione, tsumi, zumi o seki per il
   mattone. Poi il dubbio: «non so se sono troppo giapponesi però id-zero è
   più internazionale». Decisione: solo Kamii, come nome del progetto.

## Metodo dei controlli

Per ogni nome:
- `npm view <nome>` e `npm view <nome>-cli` (E404 vuol dire libero);
- `command -v <nome>` e, dove possibile, pacchetti Debian, Arch e Homebrew;
- PyPI e crates.io;
- ricerca web di software, formati o aziende omonimi, soprattutto nei campi
  di documenti, note, markup e strumenti per sviluppatori;
- significato in italiano e in inglese;
- per i nomi da opere giapponesi, verifica che l'opera esista e che il nome ci
  compaia.

I controlli li hanno fatti agenti con l'accesso al registro npm e alla
ricerca web, il 2026-10-21. Su npm e sui comandi l'orchestratore ha
ricontrollato i nomi arrivati in fondo, il 2026-10-21 e il 2026-10-22. Non
sono stati controllati i marchi registrati: se il nome diventa pubblico va
fatto prima.

## Il nome scelto e la famiglia proposta

- **kamii.** `kamii` e `kamii-cli` liberi su npm, liberi su PyPI e crates.io,
  nessun comando, nessun software con questo nome. Rischio principale: *Kami*,
  con una i, è un'app neozelandese per annotare e modificare documenti,
  diffusa nelle scuole, nello stesso campo; a voce i due nomi si confondono.
- **kumi** (組み, assemblare; *kumiko*, i reticoli di legno a incastro). Su npm
  `kumi` è un pacchetto fermo dal 2022; per un nome di concetto non contava.
- **tsumi** (積み, impilare). Da sola, in giapponese, si legge quasi sempre
  罪, colpa o reato (*Tsumi to Batsu*, *Delitto e castigo*).
- **zumi** (済み, già fatto): esiste quasi solo come suffisso, legame debole.
- **seki** (積, lo stesso carattere di tsumi, e 石, pietra). Richiama *Tonari
  no Seki-kun* (manga di Takuma Morishige dal 2010, anime 2014), dove Seki
  costruisce mondi sul banco con piccoli pezzi. Su npm `seki` è un pacchetto
  fermo dal 2022.

## Altri candidati

**Parole italiane e latine** (prima ricerca): tesso, minuta, tarsia, terno,
musivo, tavola. Tutte libere su npm e come comando. Rischi: tesso fa rima con
«cesso» e «fesso»; minuta suona come una bozza, e in inglese «a minuta» si
sente come «a minute»; tarsia richiama Ferramonti di Tarsia, il campo di
internamento fascista; terno richiama il terno al lotto; musivo è raro e per
un anglofono suona musicale; tavola è troppo comune.

**Da opere giapponesi**, libere su npm e come comando, con il loro rischio
principale:
- frol, da *They Were Eleven* di Moto Hagio (1975): richiama «frollo», e nella
  storia Frol è un personaggio di sesso non ancora definito;
- hibiol, il tessuto-cronaca di *Maquia* (Okada, 2018): in italiano suona come
  un farmaco;
- tanyu, la scrivana di *Mushishi*: a voce, in inglese, è quasi «thank you»;
- noein (*Noein*, 2005): pronuncia incerta;
- wataru (*A Wind Named Amnesia*, 1990): nome di persona comune;
- shijin (*A Poet's Life*, Kawamoto 1974): vicino a «Shijing», un motore di
  editing di documenti;
- ihatov (*Spring and Chaos*, 1996): pronuncia incerta, «I hate» in inglese;
- isako, nagiko, tomona, chiyoko: suonano come persone, non come cose.

**Scartati per il significato**: patema (in italiano vuol dire ansia,
affanno); mikako (in italiano suona volgare); omoide (in italiano «-oide»
suona medico, e la parola è nel titolo Ghibli *Omoide Poro Poro*); fezzan
(regione libica legata alla conquista coloniale italiana).

**Scartati perché già usati** nello stesso campo o su npm: texo (un OCR per
LaTeX), tsumiki (una CLI npm per Claude Code e un linguaggio di markup su
PyPI), lemma (un'app di note e un linguaggio di regole), tomo, incipit,
holon, tamago (TamaGo, un toolchain Go), malta, unico, hakken, nemu, ideon,
garland, kuro, goyo (goyo.vim), tsumugi, phos, akashi, lain.

## Valutazione come nome del mattone

Ventuno candidati verificati sono stati valutati da tre punti di vista: uso
in italiano (peso doppio), uso in inglese, legame con il progetto e rischio di
collisione. In testa frol e tesso (14 su 20), poi tarsia (13), minuta (12),
tavola, hibiol e reki (11). Kamii, kumi e seki sono arrivati dopo questa
valutazione e non ci sono entrati.

## Punti aperti

- Se Kamii resta il nome del progetto.
- Il controllo dei marchi registrati, prima di un uso pubblico.
- Il nome del comando: oggi `doc-runtime`, si cambia in un punto solo
  (`runtime/src/cli.ts` e `bin` in `runtime/package.json`).

## Fonti

- ID-0: <https://en.wikipedia.org/wiki/ID-0>
- Patema Inverted: <https://en.wikipedia.org/wiki/Patema_Inverted>
- Kami, app per documenti: <https://www.smartcompany.com.au/startupsmart/news-analysis/kiwi-edtech-kami-1-4-million-investment/>
- Kumiko (shoji): <https://en.wikipedia.org/wiki/Shoji>
- My Neighbor Seki: <https://en.wikipedia.org/wiki/My_Neighbor_Seki>
- They Were Eleven: <https://en.wikipedia.org/wiki/They_Were_Eleven>
- Maquia: <https://en.wikipedia.org/wiki/Maquia:_When_the_Promised_Flower_Blooms>
- Mushishi, episodi: <https://en.wikipedia.org/wiki/List_of_Mushishi_episodes>
- Texo (OCR per LaTeX): <https://github.com/alephpi/Texo>
- Tsumiki di Classmethod: <https://classmethod.jp/english/news/20250729-tsumiki>
- Lemma, app di note: <https://www.cvfosammmm.org/lemma/>
- TamaGo: <https://github.com/usbarmory/tamago>
- goyo.vim: <https://github.com/junegunn/goyo.vim>
- Shijing: <https://github.com/cfsghost/Shijing>

## Seconda ricerca (2026-10-23)

Due domande di Alessio: un nome del prodotto al posto di Kamii, che sia meno
giapponese e più internazionale, e la parola dell'app per i mattoni, al posto
di «oggetto», da usare come «tweet»: sostantivo, se possibile verbo, al
singolare e al plurale, in italiano e in inglese. Nel glossario il concetto
resta `object`; la parola dell'app è un nome di interfaccia. I criteri sono
quelli della prima ricerca, più lo spagnolo, il francese e il tedesco per i
significati, e i marchi registrati per i nomi arrivati in fondo. I nomi già
scartati nella prima ricerca non sono stati riproposti.

### Come sono stati fatti i controlli

Il 2026-10-23, dall'orchestratore, senza agenti:
- `npm view <nome>` e `npm view <nome>-cli`; `command -v <nome>`;
- PyPI (`https://pypi.org/pypi/<nome>/json`, 404 vuol dire libero) e
  crates.io (`https://crates.io/api/v1/crates/<nome>`, idem);
- una ricerca web per nome, mirata a software per documenti, note e scrittura;
- i significati da Wiktionary (voce in inglese, sezioni per lingua). Dove
  scrivo «nessuna voce in spagnolo, francese o tedesco» vuol dire che
  Wiktionary non ne ha: è un indizio, non una prova che la parola non esista;
- i marchi sulla banca dati USPTO (la ricerca di tmsearch.uspto.gov,
  interrogata direttamente), corrispondenza esatta del nome, con stato e
  classi. **Non sono riuscito a controllare i marchi europei e italiani**:
  TMview (tmdn.org) risponde alla pagina ma non alla ricerca (503 o timeout
  attraverso il proxy), e eSearch dell'EUIPO non risponde. Va fatto prima di
  un uso pubblico, a mano, su TMview, che copre anche l'UIBM.

Per la parola del mattone npm e i marchi contano poco, perché non è un
comando né un marchio; contano il suono, il verbo e le collisioni nel campo.

### Nomi del prodotto, in ordine

1. **brano.** Italiano: pezzo, frammento; passo di un testo o di una musica;
   canzone. Il legame con il prodotto: un documento fatto di pezzi, e il
   testo semplice come base. Controlli: `brano` e `brano-cli` liberi su npm,
   liberi su PyPI e crates.io, nessun comando; la ricerca web non trova
   software per documenti con questo nome. USPTO: sei marchi BRANO, nessuno
   nelle classi 9 o 42 (filtri per aspirapolvere della BRANOfilter, classe
   16; serrature della ceca Brano a.s., cancellati; elettrodomestici, classe
   11). Lingue: in polacco è una forma impersonale di *brać* («fu preso»), in
   serbo-croato e sloveno forme di *brana* (diga, erpice); nessuna voce in
   spagnolo, francese o tedesco; nessun significato sgradevole trovato. In
   inglese si legge «BRAH-no», due sillabe facili. Rischi: in italiano oggi
   «brano» si sente soprattutto come canzone, quindi richiama la musica; il
   nome è italiano, non neutro come id-zero, ma si pronuncia ovunque.
2. **plico.** Italiano: involto di carte, pacco di documenti; dal latino
   *plicare*, piegare (in italiano antico *plica* era anche la piega del
   documento dove si metteva il sigillo). Il legame: un pacco di fogli, e le
   pagine ordinate. Controlli: `plico` e `plico-cli` liberi su npm, libero su
   crates.io, nessun comando; **preso su PyPI** (controllo di strumenti di
   laboratorio). La ricerca web trova un prodotto «plico» elencato da OMR
   Reviews nella categoria *Intelligent Document Processing*, senza
   descrizione né sito: non sono riuscito a capire cosa sia, ma è nel campo
   dei documenti. USPTO: dieci marchi PLICO; vivi solo uno per materiali
   refrattari (classi 17 e 19, con la 42 cancellata) e uno, di una persona
   coreana, per penne, pennarelli e album da disegno (classe 16, cancelleria:
   vicino al campo, fuori dalle classi 9 e 42). Lingue: nessuna voce in
   spagnolo, francese o tedesco. Rischi: il prodotto OMR non identificato e
   il marchio per cancelleria; in inglese la pronuncia oscilla tra «PLEE-ko»
   e «PLY-ko».
3. **kalamo.** Dal greco *kálamos*, canna, e poi penna di canna; in greco
   moderno, formale, anche l'arte dello scrittore. È il più internazionale
   dei cinque: non è una parola italiana né inglese, e la k lo rende neutro.
   Controlli: libero su npm (`kalamo` e `kalamo-cli`), PyPI e crates.io,
   nessun comando; nessun marchio KALAMO all'USPTO; la ricerca web non trova
   software con questo nome. Rischi: a voce è vicino a Calaméo, piattaforma
   francese che trasforma documenti in pubblicazioni digitali, nello stesso
   campo; tre sillabe, e il legame con il prodotto (la penna) va spiegato.
4. **teca.** Italiano: piccola custodia, reliquiario; è la radice di
   biblioteca e pinacoteca. Corto e facile.
   Controlli: **preso su npm** (un framework di front-end fermo dal 2019, una
   sola versione), su PyPI e su crates.io; `teca-cli` libero; nessun comando.
   USPTO: molti TECA, vivi in classi mediche, di raffreddamento, finanziarie
   e altre, nessuno vivo in 9 o 42. Lingue: in spagnolo, portoghese e
   catalano è il tek (il legno), in biologia la teca; in catalano
   colloquiale vuol dire cibo; in nahuatl classico è un verbo che ha anche un
   senso sessuale, lingua che non riguarda il pubblico del prodotto. Rischio
   principale: i nomi tecnici sono presi, quindi servirebbe uno scope
   (`@teca/...`).

Non metto un quinto nome: gli altri controllati sono caduti per motivi
precisi, elencati sotto.

### Parole per il mattone, in ordine

1. **jot.** Inglese: un appunto breve scritto in fretta; come verbo, annotare
   in fretta (*jot down*); e la lettera più piccola, la iota. È già
   sostantivo e verbo in inglese, come «tweet»: «a jot», «jots», «jot this
   idea». In italiano entra come prestito: «un jot», «i jot», «jottare»,
   «jotta questa idea», come «twittare» e «postare»; si pronuncia «giot».
   In tedesco *Jot* è il nome della lettera J. Si adatta al canvas delle
   idee alla rinfusa più che alle pagine ordinate. Rischi: diverse app di
   note si chiamano Jot sull'App Store, una con un canvas infinito; è una
   parola comune, nessuno la possiede, ma non distingue. `jot` su npm è un
   plugin JWT per hapi, irrilevante per una parola d'interfaccia.
2. **tassello.** Italiano: tessera di un mosaico, ma anche zeppa e tassello
   di legno; il verbo esiste, *tassellare*; e c'è il modo di dire «aggiungere
   un tassello». È la parola italiana più vicina a «mattone che si combina»,
   e fa famiglia con brano o plico. Rischi: in inglese non vuol dire nulla e
   tre sillabe con la doppia sono scomode; il verbo *tassellare* oggi si sente
   tecnico (edilizia, tassellatura). Su npm `tassello` è nato il
   2026-10-19: una dashboard web per robot ROS 2 fatta di pannelli di widget,
   un'idea vicina, che conviene sapere.
3. **blip.** Inglese: il punto luminoso sul radar, un breve suono; come
   verbo, fare un bip. In Google Wave «blip» era il nome di ogni singolo
   messaggio o documento della conversazione: un precedente nello stesso
   campo, oggi spento. In italiano «un blip», «blippare». Rischi: in inglese
   vuol dire anche un intoppo breve e trascurabile («just a blip»), e il
   ricordo di Google Wave, che è fallito.
4. **brano**, se il prodotto non si chiama così. In italiano è naturale per
   un pezzo di testo, «crea un brano», «i brani», ma non ha un verbo, e in
   inglese non dice nulla.
5. **scheda.** Italiano: scheda, cartoncino da schedario, e in informatica la
   linguetta (*tab*); il verbo *schedare* esiste. Naturalissima in italiano
   («crea una scheda»), ma in inglese è illeggibile («skeda») e *schedare*
   ha un sapore poliziesco.

### Raccomandazione

Per il prodotto **brano**: è l'unico libero su tutti i registri e senza
marchi nelle classi 9 e 42 negli Stati Uniti, è corto, si pronuncia uguale
in italiano e in inglese, e dice ciò che il prodotto fa, documenti fatti di
pezzi. Il suo limite è che è italiano e richiama la musica; se Alessio vuole
un nome davvero neutro, l'alternativa è **kalamo**, libero quanto brano, con
il rischio Calaméo da pesare. Plico è il terzo, frenato da PyPI e dal
prodotto OMR non identificato.

Per il mattone **jot**: è l'unico che è già, in inglese, sostantivo e verbo
per esattamente questa cosa, un appunto veloce, e che in italiano si piega
come «tweet»; «un brano fatto di jot» tiene insieme le due parole senza
forzarle in una famiglia. Se Alessio preferisce una parola italiana,
**tassello**, che però non funziona in inglese.

Prima di un uso pubblico restano da fare i marchi europei e italiani su
TMview.

### Scartati

- **trama** (ordito, intreccio; la trama di un racconto): libero su npm, ma
  preso su PyPI e crates.io, e all'USPTO è vivo un marchio TRAMA della
  slovacca TramaTM s.r.o. anche in classe 42, per sviluppo di software; in
  inglese è vicino a *trauma* e *drama*.
- **ploma** (catalano: piuma, penna): libero su npm, PyPI e crates.io, ma
  all'USPTO è vivo un marchio PLOMA in classi 9 e 42 per app per cellulari.
- **rigo** (il rigo musicale; una riga): preso su npm, PyPI, e all'USPTO
  molti RIGO, uno abbandonato in classe 42 per software; significato debole.
- **tela** (canvas, in italiano e spagnolo): `tela` e `tela-cli` presi su
  npm, presi PyPI e crates.io.
- **ordo**, **pila**, **ilo**, **lipi**, **sheaf**, **tilo**, **tessel**:
  presi su npm.
- **lato**: Lato è un carattere di Google Fonts molto diffuso, e `lato-cli`
  su npm è un agente di programmazione.
- **opla** (oplà): `opla` preso su npm (pacchetto del 2017); significato
  lontano dal prodotto.
- **bozza**, **sfoglia**, **spunto**: liberi ovunque, ma bozza dice «non
  finito», sfoglia richiama la pasta, e spunto come verbo (*spuntare*) vuol
  dire anche segnare come fatto o tagliare le punte.
- **talea** (ramo da trapiantare, la crescita): preso su PyPI, significato
  troppo oscuro.
- **cera**, **dado**, **mote**, **nib**, **brik**: presi su npm o con
  significati sbagliati; «brik» in italiano è il cartone del latte.
- Scartati per il significato senza controlli tecnici: **fiche** (in
  italiano è anche il plurale di una parola volgare), **tessa** (rima con una
  parola volgare dialettale, come tesso con cesso), **orto** (volgare nello
  spagnolo del Río de la Plata), **seme** (anche sperma, in italiano),
  **slip** (in italiano è la mutanda), **pip** (il gestore di pacchetti di
  Python), **pluma** (Pluma è l'editor di testo di MATE), **stilo** (Stylo è
  un editor di testi accademici), **jotta** (Jottacloud, archiviazione
  online), **rasa**, **tabula**, **strato**, **gemma**, **lumo** (nomi di
  software o servizi noti: Rasa, Tabula, Strato, Gemma, Lumo). Questi ultimi
  motivi vengono da conoscenza generale e non sono stati verificati alla
  fonte in questa ricerca.

### Fonti della seconda ricerca

- Banca dati marchi USPTO: <https://tmsearch.uspto.gov/>
- TMview: <https://www.tmdn.org/tmview/>
- Wiktionary: <https://en.wiktionary.org/wiki/brano>,
  <https://en.wiktionary.org/wiki/plico>,
  <https://en.wiktionary.org/wiki/plica>,
  <https://en.wiktionary.org/wiki/%CE%BA%CE%AC%CE%BB%CE%B1%CE%BC%CE%BF%CF%82>,
  <https://en.wiktionary.org/wiki/teca>,
  <https://en.wiktionary.org/wiki/trama>,
  <https://en.wiktionary.org/wiki/ploma>,
  <https://en.wiktionary.org/wiki/jot>,
  <https://en.wiktionary.org/wiki/tassello>,
  <https://en.wiktionary.org/wiki/blip>,
  <https://en.wiktionary.org/wiki/scheda>,
  <https://en.wiktionary.org/wiki/spunto>
- plico su OMR Reviews: <https://omr.com/en/reviews/product/plico/alternatives>
- Calaméo: <https://www.calameo.com/>
- App Jot sull'App Store: <https://apps.apple.com/ng/app/jot-fast-notes/id1536814240>
- Lato su Google Fonts: <https://fonts.google.com/specimen/Lato>
- Pacchetti: <https://www.npmjs.com/package/tassello>,
  <https://www.npmjs.com/package/teca>, <https://pypi.org/project/plico/>,
  <https://pypi.org/project/trama/>

### Nomi con jot (2026-10-23)

Alessio ha scelto jot come parola dell'app per i mattoni e ha scartato brano
(«non lo capisco»). Domanda: «jot per l'app? o qualcosa di composto con
jot», nel rapporto che c'è fra Twitter e tweet, cioè il posto dove si fanno i
jot. Controlli come sopra, lo stesso giorno: npm e `-cli`, comando, PyPI,
crates.io, USPTO (corrispondenza esatta, solo marchi vivi, scritti attaccati
e staccati, «JOTKIT» e «JOT KIT»), una ricerca web per i migliori. Marchi UE e
italiani non controllati, per lo stesso motivo di prima.

**Jot da solo come nome del prodotto: sconsigliato.** Su npm `jot` è preso
(plugin JWT per hapi), come su PyPI e crates.io; `jot-cli` è libero e non c'è
un comando. Ma all'USPTO, nei primi cinquanta risultati, ci sono tredici marchi JOT
vivi, e otto sono nelle classi 9 o 42: tre di First American Financial per software online,
uno dei quali per la notarizzazione elettronica e la gestione di documenti
(classi 9, 42 e 45); Kent Displays per tavolette di scrittura elettroniche
(classe 9; una tavoletta Boogie Board si chiama Jot 8.5); ArtemX per app
di comunicazione (9, 35, 38, 42); e altri per software assicurativo, per
vendite e per giochi scaricabili. Nel campo ci sono poi
molte app di note chiamate Jot (Jot di Espresso per note e annotazioni su
Mac e Windows, Jot - Fast Notes su iOS con un canvas infinito, Jot su
Capterra per note e collaborazione). È la parola giusta per il mattone
proprio perché è comune, e per lo stesso motivo non può essere un nome
distintivo.

**Candidati esaminati** (quindici): jotter, jotboard, jotbook, jotspace,
jotfield, jotkit, jotly, jotto, jotpad, jotdesk, jottery, jotwise, jotland,
jotsy, jotbox.

**I migliori, in ordine:**

1. **jotkit.** Il kit dei jot: un insieme di mattoni con cui si fanno
   documenti, fogli e presentazioni diversi, «stessi mattoni». Due sillabe,
   «jot» e «kit» si leggono uguali in italiano e in inglese («giòt-kit»).
   Controlli: `jotkit` e `jotkit-cli` liberi su npm, liberi PyPI e
   crates.io, nessun comando; nessun marchio vivo JOTKIT o JOT KIT
   all'USPTO; la ricerca web non trova un software con questo nome. Rischi:
   «kit» fa pensare a uno strumento per sviluppatori (SDK, toolkit) più che a
   un'app per tutti; e il campo è affollato di nomi in jot, soprattutto
   Jotform, il diffuso costruttore di moduli online, che a voce è vicino.
2. **jotfield.** Il campo dei jot: richiama il canvas dove le idee stanno
   alla rinfusa. Controlli: tutto libero (npm, `-cli`, PyPI, crates.io,
   comando), nessun marchio USPTO, nessun omonimo trovato. Rischi: per un
   italiano «field» si pronuncia male e la grafia è lunga; in inglese «field»
   è anche il campo di un modulo, che rimanda di nuovo a Jotform.
3. **jotdesk.** La scrivania dei jot. Tutto libero, nessun marchio USPTO
   JOTDESK o JOT DESK, nessun omonimo trovato. Rischi: «-desk» è il suffisso
   dei software di assistenza clienti (Zendesk, Freshdesk) e suona da
   ufficio.
4. **jotland.** La terra dei jot, il posto dove si fanno, come chiede la
   domanda. Tutto libero su npm, PyPI, crates.io, nessun comando, nessun
   marchio USPTO JOTLAND o JOT LAND. Rischi: suona come un luogo o un parco
   giochi più che come uno strumento, e a voce è vicino a Jutland e Gotland.
   Non l'ho cercato sul web.

Non metto un quinto: gli altri cadono per i motivi sotto.

**Scartati:**
- **jotter**: in inglese è il quaderno per appunti o di esercizi, «uno che
  annota»; il significato è perfetto, ma `jotter` è preso su npm (un'app
  per note da terminale, del 2015), su PyPI e crates.io; all'USPTO JOTTER è
  un marchio vivo della Parker per penne, la Parker Jotter; e JotterPad è un
  editor di testo Markdown e Fountain, nello stesso campo.
- **jotboard**: libero su npm, PyPI e crates.io, ma Jotboard esiste già come
  lavagna collaborativa, alternativa a Google Jamboard, con un corso su
  Udemy: è il nostro canvas.
- **jotspace**: libero, ma ricorda JotSpot, il wiki comprato da Google nel
  2006 e diventato Google Sites; all'USPTO nessun marchio JOTSPACE vivo.
- **jotbook**: `jotbook` su npm è nato nel 2026, una memoria di progetto in
  Markdown per Claude Code.
- **jotto**: `jotto` preso su npm; Jotto è un gioco di parole.
- **jotly**, **jotsy**: presi su npm, e jotly anche su PyPI.
- **jotpad**, **jotbox**: presi su PyPI, e «-pad» è già in JotterPad.
- **jottery**: libero, ma si sente «lottery».
- **jotwise**: libero, ma è un avverbio e non dice un posto.
- **rensei** (proposto da Alessio; 錬成, allenare, perfezionare, e nella
  fantasy la sintesi alchemica; 連星, stella doppia): `rensei` preso su npm
  (rendering 3D per agenti, 2026), liberi `rensei-cli`, PyPI, crates.io e il
  comando, nessun marchio USPTO nelle classi 9 o 42. Scartato da Alessio:
  «mi sa del politico italiano Renzi», ed è di nuovo giapponese.

**Raccomandazione.** Nessuno dei composti è forte come jot, e il campo è
affollato (Jotform, JotterPad, JotSpot, molte app Jot). Se Alessio vuole un
nome con jot, **jotkit**: corto, libero ovunque si è potuto guardare, e dice
l'idea dei mattoni ricombinabili; jotfield se preferisce l'immagine del
canvas. Jot da solo no, per i marchi vivi nelle classi 9 e 42. Resta
possibile un nome del prodotto senza jot, con jot solo per i mattoni, come
Instagram e post: il rapporto Twitter e tweet non è necessario perché jot
entri nel lessico.

Fonti: banca dati USPTO <https://tmsearch.uspto.gov/>; Wiktionary
<https://en.wiktionary.org/wiki/jotter>; Jotform
<https://en.wikipedia.org/wiki/Jotform>; JotterPad
<https://blog.jotterpad.app/jotterpad-reinvent-your-writing-process>;
JotSpot <https://www.networkworld.com/article/811632/data-center-google-takes-aim-at-microsoft-sharepoint-ibm-lotus-notes.html>;
Jotboard <https://www.udemy.com/course/learning-jotboard-from-scratch/>;
Jot di Espresso <https://eu.espres.so/jot>; Jot su Capterra
<https://www.capterra.ca/software/1110180/Jot>; Boogie Board Jot
<https://techcrunch.com/2015/08/20/the-jot-8-5-is-a-better-and-brighter-boogie-board/>;
pacchetti <https://www.npmjs.com/package/jotter>,
<https://www.npmjs.com/package/jotbook>.

### Terzo giro: parole senza significato per chi le usa (2026-10-23)

Alessio scarta anche jot: «che cosa c'entra con un dataset o con una
funzione». La parola del mattone deve valere per ogni tipo di mattone, non
solo per il testo. Si sceglie la seconda strada: una parola corta che non
descrive il contenuto e prende senso con l'uso, come «tweet», che era solo il
verso di un uccellino. Il nome dell'app, per Alessio, deve accordarsi con
quello del mattone o del canvas, o essere lo stesso. Da esplorare: kami,
gami e i loro composti, altre lingue e culture, la cultura cyberpunk, il
coreano.

Controlli come sopra: npm e `-cli`, comando, PyPI, crates.io, marchi USPTO,
significati da Wiktionary (e Wikipedia per hanji e simstim), una ricerca
web per orri, keping, lappu e shard. Marchi UE e italiani non controllati.

**Kami e gami: bloccati.**
- **gami** (in giapponese è la forma di *kami* nei composti, come in
  *origami*). `gami` libero su npm e crates.io, preso su PyPI. Ma all'USPTO è
  vivo GÄMI di Gami Technologies, depositato il 2025-09-22 nelle classi 9 e
  42 per «software per caricare, archiviare, organizzare, modificare e
  condividere file, media e documenti»: è la Gami App per iPad. In più, in
  inglese «gami» si sente vicino a *gamey* (che sa di selvaggina, e anche
  osé), e in greco *gam-* è la radice del verbo volgare *γαμάω*.
- **kami**: preso su npm, PyPI e crates.io; all'USPTO KAMI è vivo in classe
  42 e in 9 e 42 per Kami Limited, la società neozelandese dell'app per
  documenti già citata.
- **kamii**: libero su npm, PyPI e crates.io, ma all'USPTO c'è un marchio
  KAMII vivo in classe 9 (custodie per calcolatrici e cellulari). Vale anche
  per il nome provvisorio del progetto.
- I composti **gamii**, **gamio**, **gamiko**, **gamibox**, **kamibox** sono
  liberi su tutti i registri e all'USPTO, ma starebbero accanto a GÄMI e a
  Kami: li sconsiglio.

**Candidati da altre lingue, in ordine:**

1. **orri** (basco): foglia; foglio di carta; pagina. È l'equivalente di
   *kami*, carta, in una lingua europea poco conosciuta. Funziona come nome
   dell'app e del mattone insieme: «Orri», «crea un orri», «gli orri»; in
   inglese «an orri», «orris». Controlli: `orri` e `orri-cli` liberi su npm,
   liberi PyPI e crates.io, nessun comando; all'USPTO solo JAFFA ORRI, per
   agrumi (classe 31). Altri significati: in catalano, antico o dialettale,
   un granaio e la capanna di pietra dei Pirenei per mungere le pecore; in
   faroese e norreno il fagiano di monte; in italiano una forma rara di
   *orrare*. La ricerca web non trova app o software chiamati Orri. Rischi: in italiano richiama «orrore» e «orrido»; il verbo
   («orrare questa idea») non viene naturale.
2. **keping** (indonesiano): scheggia, pezzo, frammento, foglio, fetta; anche
   moneta, e il classificatore delle cose sottili e piatte (in malese solo il
   classificatore). Un pezzo qualunque, quindi va bene per testo, dati o
   funzioni. Controlli: tutto libero (npm, `-cli`, PyPI, crates.io, comando),
   nessun marchio USPTO, nessun software omonimo trovato sul web. Rischi: in inglese si sente «keeping», che può
   essere un gioco di parole o una confusione; come nome dell'app è debole,
   meglio per il mattone.
3. **lappu** (finlandese): pezzetto di carta o di stoffa; etichetta;
   foglietto. Tutto libero, nessun marchio USPTO, nessun software omonimo
   trovato sul web (escono solo app della LAPP Group, cavi). Rischi: è vicino a
   *Lapp*, che in inglese indica i Sami ed è datato e a volte offensivo; in
   italiano *lappare* vuol dire leccare, come fanno i gatti.
4. **jogak** e **madang** (coreano). 조각, *jogak*: pezzo, frammento,
   scheggia, e anche scultura; 마당, *madang*: cortile, piazza, ed
   «occasione in cui succede qualcosa», un buon nome per il canvas. «Crea un
   jogak nel madang». Controlli: `jogak` libero ovunque, nessun marchio
   USPTO; `madang` preso su npm (una base Next.js del 2024), libero
   `madang-cli`, PyPI e crates.io, nessun marchio USPTO nelle classi 9 o 42.
   Rischi: in italiano e in inglese si leggono male («giogak»); *hanji*, la
   carta coreana, parallelo di *kami*, ha `hanji` preso su npm (2026).
   Anche 칸, *kan*, la casella o lo scompartimento, sarebbe bello per una
   cella, ma `kan` è preso su npm, PyPI e crates.io.
5. **shard** (cultura cyberpunk). In *Cyberpunk 2077* gli shard sono
   oggetti che si leggono, divisi in categorie come tecnologia, note e
   letteratura, e alcuni contengono codici o posizioni: pezzi di contenuto
   di tipo diverso, come i nostri mattoni (guida di Prima Games). In inglese
   vuol dire coccio, scheggia; nei giochi online è un'istanza di un mondo.
   Come mattone: «crea uno shard», «gli shard», «shardare». Rischi: `shard`
   preso su npm, PyPI e crates.io; nei database *sharding* vuol dire
   partizionare i dati, proprio il campo dei dataset, quindi confonde.
   Il resto del filone cyberpunk: **holo** preso su npm, PyPI e crates.io,
   con marchi vivi in 9 e 42; **cyberdeck** preso su npm e crates.io, con
   un marchio vivo in classe 9; **simstim** (nella trilogia dello Sprawl di
   Gibson, i film sensoriali virtuali) libero ovunque e senza marchi USPTO,
   ma descrive tutt'altro e si pronuncia male in italiano.

**Raccomandazione.** **Orri** come nome dell'app e del mattone insieme, sul
modello di *kami*: carta, foglio, pagina, in una lingua europea, libero su
tutti i registri controllati, senza marchi USPTO nelle classi 9 e 42 e
senza omonimi trovati sul web. Il rischio da pesare a voce è «orrore». Se non
convince, **keping** per il mattone. Prima di un uso pubblico restano i marchi
europei e italiani.

**Da Steins;Gate** (proposta di Alessio, a giro quasi chiuso):
- **stein**: in norvegese (bokmål) pietra, roccia, e in muratura anche
  mattone; in tedesco *Stein* è la pietra; in inglese *stein* è il boccale
  da birra. Come parola del mattone tiene: «crea uno stein», «gli stein»,
  ed è neutra rispetto al contenuto. Ma `stein` è preso su npm e PyPI, e
  all'USPTO ci sono marchi vivi con STEIN nelle classi 9 e 42 (STEIN LINK,
  KONNEK STEIN). **steins**, come nome dell'app, è libero su npm, PyPI e
  crates.io, ma ha un marchio vivo in classe 9 (strumenti industriali) e
  richiama subito il titolo della serie, che è di altri.
- **upa**: nella serie è la mascotte di *RaiNet Kakeru*, il franchise dentro
  la storia, venduta nei distributori di capsule e amata da Mayuri. Corta e
  facile: «crea un upa», «gli upa». Altri significati: in finlandese
  dialettale feccia, sedimento; in varie lingue delle Filippine gallina; in
  hiligaynon la pula del riso e il cibo masticato per un bambino. `upa`
  preso su npm e crates.io, libero PyPI; all'USPTO UPA è vivo in classe 42
  (Routehappy, software per le compagnie aeree). Suona da giocattolo.
- **D-mail** (i messaggi mandati nel passato) e **labmem** (membro del
  laboratorio) dicono una mail e una persona, non un mattone; `dmail` è
  preso su npm e PyPI, `labmem` è libero ovunque e senza marchi USPTO.

**Da Arcane** (la serie di Riot Games ambientata fra Piltover e Zaun):
- i nomi propri della serie sono di Riot: **ekko** ha un marchio USPTO vivo
  di Riot Games in classe 9, e altri marchi EKKO vivi nelle classi 9 e 42;
  **piltover** e **zaun** non hanno marchi USPTO e piltover è libero sui
  registri (`zaun` è preso su npm), ma sono luoghi di un franchise altrui e
  un nome così si legge come un prodotto per fan.
- **hex** e **rune** sono parole comuni ma prese su npm, PyPI e crates.io,
  e RUNE ha marchi vivi in 9 e 42 (Rune Technologies, Jagex); **hexcore** ha
  marchi vivi in 9 e 42.
- **arcano** (italiano, galiziano, portoghese: arcano, mistero) sarebbe
  naturale in italiano, «un arcano», «gli arcani», e non ha marchi USPTO
  nelle classi 9 e 42; ma `arcano` è preso su npm (gestione di segreti,
  2026), `arcana` dappertutto, e il significato, mistero, va contro un
  prodotto che vuole essere chiaro e leggibile.
Da Arcane non esce un candidato.

**Da Akira** (Otomo): **akira** è preso su npm e PyPI e ha marchi vivi in
classe 42 (fra cui un software di chatbot); **esper** (i bambini con poteri
della storia) è preso su npm, PyPI e crates.io, con marchi vivi in 9 e 42;
**capsule**, che sarebbe un contenitore neutro per qualunque mattone, è
preso dappertutto e ha molti marchi vivi in 9 e 42 (Capsule CRM e altri).
**kaneda** e **tetsuo** non hanno marchi USPTO in 9 e 42 e tetsuo è libero
sui registri, ma sono nomi di persona giapponesi e personaggi di un'opera
famosa; **neotokyo** è libero, ma è un luogo, e di nuovo giapponese. Da
Akira non esce un candidato.

**Da Ghost in the Shell** (Shirow, Oshii): **ghost** è Ghost, la
piattaforma open source per pubblicare blog, nello stesso campo, con un
marchio vivo in classe 42 della Ghost Foundation; **shell** è la shell Unix;
**tachikoma** è preso su npm, PyPI e crates.io, ed è un nome dell'opera;
**cyberbrain** è libero su npm ma preso su PyPI e crates.io, e dice un
cervello, non un mattone. **koma** (駒) in giapponese è il pezzo dello
shogi, e anche chi è manovrato da altri, una pedina, un burattino, un bel
legame con il *Puppet Master*; ma in danese e in azero vuol dire coma, in
faroese è gergo per l'orgasmo, ed è preso su npm e PyPI. Nessun candidato.

**Dal mondo dei giochi e di Dungeons & Dragons:**
- **cantrip**: in inglese un incantesimo, un piccolo trucco magico; nei
  giochi di ruolo l'incantesimo minore, che si lancia senza preparazione. Il
  più interessante del gruppo per la seconda strada: non dice il contenuto,
  dice un piccolo gesto che fa qualcosa, e per testo, dati o funzioni vale
  lo stesso. «Crea un cantrip», «i cantrip». Controlli: preso su npm (una API
  REST da un file JSON, 2015), su PyPI e crates.io; nessun marchio USPTO
  vivo nelle classi 9 e 42. Rischi: parola da appassionati, poco nota in
  italiano; il verbo non viene.
- **meeple**: la pedina a forma di omino dei giochi da tavolo. Libero su
  PyPI e crates.io, preso su npm (una libreria per Roll20), nessun marchio
  USPTO vivo in 9 e 42. Ma è una persona, non un mattone.
- **sigil**: sigillo, segno magico, e in programmazione il simbolo davanti a
  un nome di variabile; ma Sigil è l'editor open source di e-book EPUB, nello
  stesso campo, e SIGIL ha marchi vivi in 9 e 42.
- **chit** (in inglese anche biglietto, e le pedine di cartone dei
  wargame): marchi vivi in classe 42 e preso su npm; gli altri significati
  inglesi sono una ragazzina sfacciata e un germoglio.
- **trinket**, **grimoire**, **relic**, **mimic**: presi su npm, PyPI e
  crates.io; TRINKET è anche un microcontrollore con marchio vivo in classe 9.
Nessun candidato pieno; cantrip è da tenere come idea, ma non è libero.

**Orri scartato da Alessio**: «no per l'italiano orrido».

**Altre parole per foglio e pagina**, scelte per il suono in italiano:
- **fleta** (albanese): forma determinata di *fletë*, «il foglio», e anche
  plurale indeterminato, «fogli»; *fletë* vuol dire foglio, pagina, foglia, e
  anche ala, pinna, battente di una porta. Libero su npm (anche `-cli`),
  PyPI, crates.io e come comando; all'USPTO due risultati, nessuno vivo in 9
  o 42. In italiano e in inglese si legge «flèta», senza intoppi. Rischi: in
  latino *flēta* è una forma di *flētus*, pianto; in albanese è una forma
  flessa, non la parola di dizionario. Ricerca web non fatta.
- **sivu** (finlandese): pagina, lato, faccia. `sivu` preso su npm (una
  libreria di paginazione), liberi `sivu-cli`, PyPI e crates.io, nessun
  comando, nessun marchio USPTO. Rischi: in inglese si legge «see-voo», come
  il francese *s'il vous*; in serbo-croato è una forma di *siv*, grigio.
- **dalen**: marchi vivi in 9 e in 42 (Dalen Inc., Jiangsu Dalen); in
  olandese vuol dire scendere, calare. Scartato.
- **lapa**: in cebuano anche fare a pezzi, mutilare; preso su npm e PyPI.
  Scartato.
- **mindset** (proposta di Alessio): preso su npm, PyPI e crates.io, molti
  marchi vivi nelle classi 9 e 42 (Mindset Care, Magicave e altri). Scartato.

**seki** (riproposto da Alessio, ora anche come nome dell'app). In
giapponese *seki* si scrive con molti caratteri: 石, pietra; 積, accumulo, e
in matematica il prodotto; 席, posto a sedere; 籍, registro; 関, barriera;
堰, chiusa; 隻, il classificatore delle navi; e 咳, tosse. Nel go è la
situazione di stallo in cui nessuno dei due giocatori guadagna a giocare
in un punto. In turco vuol dire posto a sedere. Il legame con *Tonari no
Seki-kun* è nella prima ricerca. Funziona come app e mattone insieme:
«Seki», «crea un seki», «i seki». Controlli: `seki` preso su npm (un
middleware per il web semantico, fermo dal 2022), su PyPI (strumenti di
sicurezza) e su crates.io (una CLI per i log di accesso); `seki-cli`
libero, nessun comando. USPTO: diciotto risultati, nessun marchio SEKI vivo
nelle classi 9 o 42; i marchi vivi sono di coltelleria e utensili
giapponesi (Seki Magoroku e altri), di un ristorante e di macchine per
diamanti. La ricerca web non trova app o software per documenti o note con
questo nome. Rischi: è di nuovo un nome giapponese, il dubbio che Alessio
aveva su Kamii; i tre nomi tecnici sono presi, quindi servirebbe uno scope
(`@seki/...`); fra i significati ci sono la tosse e lo stallo.

Fonti del terzo giro: USPTO <https://tmsearch.uspto.gov/>; Wiktionary
<https://en.wiktionary.org/wiki/orri>, <https://en.wiktionary.org/wiki/keping>,
<https://en.wiktionary.org/wiki/lappu>, <https://en.wiktionary.org/wiki/Lapp>,
<https://en.wiktionary.org/wiki/gami>, <https://en.wiktionary.org/wiki/gamey>,
<https://en.wiktionary.org/wiki/%CE%B3%CE%B1%CE%BC%CE%AC%CF%89>,
<https://en.wiktionary.org/wiki/%EC%A1%B0%EA%B0%81>,
<https://en.wiktionary.org/wiki/%EB%A7%88%EB%8B%B9>,
<https://en.wiktionary.org/wiki/%EC%B9%B8>, <https://en.wiktionary.org/wiki/shard>;
Gami App <https://apps.apple.com/co/app/gami-app/id6698846527?l=en-GB>;
Hanji <https://en.wikipedia.org/wiki/Hanji>; Sprawl
<https://en.wikipedia.org/wiki/Sprawl_trilogy>; shard in Cyberpunk 2077
<https://primagames.com/tips/how-to-read-shards-in-cyberpunk-2077>;
Steins;Gate <https://en.wikipedia.org/wiki/Steins;Gate_(video_game)>, Upa e
D-Mail sul wiki della serie <https://steins-gate.fandom.com/wiki/Upa>,
<https://steins-gate.fandom.com/wiki/D-Mail>; Wiktionary
<https://en.wiktionary.org/wiki/stein>, <https://en.wiktionary.org/wiki/upa>;
Arcane <https://en.wikipedia.org/wiki/Arcane_(TV_series)>;
<https://en.wiktionary.org/wiki/arcano>; Akira
<https://en.wikipedia.org/wiki/Akira_(manga)>; Ghost
<https://en.wikipedia.org/wiki/Ghost_(blogging_platform)>;
<https://en.wiktionary.org/wiki/koma>, <https://en.wiktionary.org/wiki/%E9%A7%92>;
<https://en.wiktionary.org/wiki/cantrip>, <https://en.wiktionary.org/wiki/meeple>,
<https://en.wiktionary.org/wiki/sigil>, <https://en.wiktionary.org/wiki/chit>;
Sigil <https://en.wikipedia.org/wiki/Sigil_(application)>;
<https://en.wiktionary.org/wiki/flet%C3%AB>, <https://en.wiktionary.org/wiki/fleta>,
<https://en.wiktionary.org/wiki/sivu>, <https://en.wiktionary.org/wiki/dalen>,
<https://en.wiktionary.org/wiki/lapa>; <https://en.wiktionary.org/wiki/seki>,
<https://en.wiktionary.org/wiki/%E3%81%9B%E3%81%8D>.
