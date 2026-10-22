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
