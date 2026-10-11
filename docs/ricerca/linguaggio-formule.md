# Linguaggio delle formule: alternative a Python

Ricerca del 2026-10-11. Alessio pensava a Python perché sembrava la cosa più
semplice, ma non è un vincolo: vuole capire cosa convenga. Python è trattato in
[formule-python.md](formule-python.md). Qui ci sono quattro alternative, valutate
sugli stessi criteri: esecuzione identica fra export e browser, peso nel
browser, determinismo, dipendenze ricavabili senza eseguire, specifica formale,
familiarità, sandbox, semantica sulle tabelle, codice esterno, licenze.

I fatti portanti di tutti e quattro i candidati sono stati ricontrollati su
fonte primaria; dove il controllo ha corretto, qui c'è la versione corretta.

## In sintesi

- Ogni candidato ha senso a un livello solo. Formule (celle, colonne calcolate,
  aggregati, condizioni, binding dei grafici) e codice eseguito (trasformazioni
  complesse, librerie, dati esterni) chiedono proprietà opposte.
- Per le formule servono purezza, terminazione, dipendenze statiche e peso
  piccolo nel browser. Lo danno CEL e un linguaggio stile Excel, oppure un
  sottoinsieme di espressioni JS. Nessuno va bene preso così com'è: in tutti i
  casi lo standard deve fissare un proprio profilo.
- Per il codice eseguito JavaScript batte Python su specifica, peso e
  determinismo. Python resta più forte sull'ecosistema per i dati.
- SQL è il candidato naturale per lo strato "tabella → vista": trasformazioni,
  aggregati e query che alimentano i grafici. Non serve per le formule di cella
  né per il codice generale.
- Il determinismo bit per bit fra export e browser non lo dà nessun linguaggio
  da solo. Lo dà lo stesso binario WASM eseguito in entrambi, oppure una libm
  software fornita dall'host. Il JS nativo del browser no: i bit cambiano con
  il motore e con la sua versione.

## Confronto

| | Formule | Codice eseguito | Peso nel browser | Specifica | Dipendenze statiche |
|---|---|---|---|---|---|
| Python | scomodo | sì, ecosistema migliore | ~6 MB (Pyodide) | no, è CPython | solo con regole |
| JavaScript | solo come sottoinsieme | sì | 0 KB nativo, ~250-340 KB QuickJS wasm | ECMA-262 + test262 | solo con regole |
| Stile Excel | sì | no | 0,2-0,5 MB | OpenFormula per il nucleo classico | sì, salvo INDIRECT/OFFSET |
| CEL | sì | no | 21-58 KB JS, 195-440 KB wasm | sì, con corpus ufficiale | sì |
| SQL (DuckDB) | solo tabelle e viste | no | ~5,5 MB più estensioni | no, è un dialetto di prodotto | quasi sempre |

## JavaScript

**Specifica.** ECMA-262 è alla diciassettesima edizione (2026). test262 è il
corpus di conformità, licenza BSD, 53.616 test. I motori principali passano dal
94 al 99% (run test262.fyi del 2026-10-10). QuickJS e QuickJS-ng, i più facili
da incorporare, stanno all'82-84% nelle versioni rilasciate. Il master di
QuickJS ha appena aggiunto Intl e Temporal sperimentali, non ancora in una
release. Il modello di test262 è riusabile per il nostro corpus.

**Cosa resta libero alla specifica.** Sono "implementation-approximated" le
funzioni trascendenti di `Math`, l'operatore `**`, `Date.parse` fuori dal
formato ISO, il fuso di sistema e `localeCompare`. È libero anche l'ordinamento
con un comparatore incoerente. Sono esatti per specifica `+ - * /`,
`Math.sqrt` e `toFixed`. `toString` fissa il numero di cifre, ma l'ultima
cifra è solo raccomandata.

**Misure** (8120 risultati float64 confrontati bit per bit):

| Confronto | Bit diversi su 8120 |
|---|---|
| V8 (Node 22) e JSC (Bun) | 300 |
| V8 e QuickJS in wasm | 320 |
| Node 22 e Node 26 (cambia solo la versione di V8) | 78 |
| Lo stesso binario wasm sotto V8 e sotto JSC | 0 |
| Due build wasm diverse dello stesso motore | 84 |
| Crate Rust libm, nativo e wasm (6000 valori) | 0 |

Le differenze sono di 1-2 ulp. Il V8 attuale usa LLVM libc per quasi tutte le
funzioni e la libm del sistema operativo per `tanh`: i bit nel browser cambiano
con gli aggiornamenti di Chrome. Conta il binario, non solo il motore. Nel wasm
di rquickjs l'unico import dell'host è l'orologio, che fa anche da seme a
`Math.random`.

**Motori incorporabili in Rust.**
- rquickjs 0.14 (MIT, QuickJS-NG 0.16.2): gira nativo e in
  wasm32-unknown-unknown. Su wasm va impostata la dimensione massima dello
  stack, altrimenti lo stack overflow non viene rilevato.
- Boa 0.22: Rust puro, ancora "experimental".
- deno_core: sta diventando una facciata su motori intercambiabili, quindi la
  sua API si muove molto.

**Sicurezza.** quickjs-emscripten 0.32.0 è fermo da febbraio 2026, non ha mai
avuto un audit e include QuickJS-NG 0.12.1, colpito da CVE-2026-37630
(esecuzione di codice, CVSS 7.3). Se si prende QuickJS va ricompilato recente.
Figma esegue i plugin in QuickJS su wasm. SES e i Compartment sono allo Stage 1
in TC39, ShadowRealm allo Stage 2.7, e nessun browser lo implementa.

**Prestazioni.** Gli interpreti sono 10-50 volte più lenti del JIT sul calcolo
puro. Gli aggregati su colonne grandi vanno delegati all'host.

**Trappole per chi scrive formule.** `^` è lo XOR, `%` ha il segno del
dividendo, il sort predefinito confronta stringhe, `+` concatena, non c'è un
tipo decimale. Un sottoinsieme JS per le formule va contro le attese di chi
viene da Excel, a meno di ridefinire gli operatori, e a quel punto non è più
JS.

## Formule stile Excel

**Specifica.** OpenFormula è ODF 1.4 Part 4, OASIS Standard del 6 ottobre 2025,
con circa 385 funzioni escluse le LEGACY. L'ultima edizione ISO pubblicata è
ancora la 26300-2:2015 (ODF 1.2); la 26300-4 è in votazione finale dal 9
ottobre 2026. LET, LAMBDA, dynamic arrays, XLOOKUP, FILTER e i riferimenti
strutturati non ci sono. Per queste funzioni nessuno standard aperto definisce
la semantica:
[MS-XLSX](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-xlsx/2c5dee00-eff2-4b22-92b6-0738acd4475e)
ne elenca solo i nomi, e LibreOffice le marca
`COM.MICROSOFT.*` (LAMBDA arriva con la 27.2).

**Numeri.** Excel non segue IEEE 754 in punti documentati da Microsoft, per
esempio niente -0, e l'algoritmo non è pubblico. I motori riusabili non
concordano nemmeno fra loro. `=0.1+0.2=0.3` dà TRUE in IronCalc (tolleranza
f64::EPSILON) e in HyperFormula di default, FALSE in Formualizer.
`EXP(1.234567)` differisce di 1 ulp fra IronCalc nativo e wasm. La
documentazione standard di Rust dichiara non deterministica la precisione delle
funzioni trascendenti.

**Volatili.** NOW, TODAY, RAND*, OFFSET, INDIRECT e INFO/CELL formano un
elenco chiuso. Solo Formualizer espone orologio e seme come input, e solo in
alcune API. Con IronCalc e HyperFormula serve una patch o il controllo
dell'ambiente.

**Motori.**
- IronCalc (pre-1.0): valuta `Vendite[Prezzo]` ma riscrive la formula in
  coordinate assolute, quindi il testo originale si perde.
- Formualizer (MIT o Apache-2.0, 0.11.1): valuta i riferimenti strutturati, ma
  la build wasm non li espone nell'AST e LAMBDA e REGEX non funzionano ancora.
  Il 94% del codice è di un solo autore.
- HyperFormula: GPL-3.0 oppure commerciale con chiave obbligatoria, senza
  riferimenti strutturati.

**Diff.** Con i riferimenti A1, inserire una riga riscrive tutte le formule a
valle (7 su 7 nella prova). I riferimenti per nome reggono.

## CEL

**Che cos'è.** È il linguaggio di espressioni di Google. Non è
Turing-completo: termina sempre e non ha effetti, per costruzione. Kubernetes
lo usa in produzione con input non fidati.

**Specifica.** Ha una specifica in prosa con grammatica e un corpus ufficiale
di 2508 casi con risultato atteso, in 31 file. Il corpus serve a verificare la
conformità di un motore, non a garantire che due motori diano lo stesso
risultato. Le implementazioni sono cinque o più: Go, Java, C++, Rust e due in
JS. Le licenze sono permissive.

**Peso**, misurato in brotli:

| Implementazione | Peso |
|---|---|
| `@marcbachmann/cel-js` | 21 KB |
| `@bufbuild/cel` | 58 KB |
| cel-rust in wasm | 195-440 KB (la versione minima non ha `matches()` né timestamp) |
| cel-go in wasm | 2,9 MB |

**Dipendenze.** Si ricavano dall'AST, ma serve un passaggio proprio. Va tolto
ciò che è legato dalle macro, e va vietato che le funzioni host ricevano
riferimenti come stringhe: `lookup('Sheet2!A1')` non dichiara nulla.

**Tempo e dati esterni.** Non ci sono `now()`, `random` né locale: tempo e
dati esterni entrano solo come binding dell'host. cel-go ha funzioni host
asincrone con limite di concorrenza; marc le ha senza limiti. Con funzioni del
genere una formula può fare I/O, quindi i limiti li deve mettere lo standard.

**Divergenze tra motori**, da un test differenziale su 56 espressioni:
- `string(double)` dà tre risultati diversi, e `string(1e21)` dà `1e+21` in
  Go e in JS e `1000000000000000000000` in Rust. Il testo dei numeri lo deve
  produrre l'host, non `string()` né `format()`.
- L'overflow di `-9223372036854775808 / -1` è un errore ovunque tranne in
  marc. `1 == 1.0` è rifiutato da cel-go e vale true in Rust.
- L'ordine di iterazione delle mappe non è definito dalla specifica. È casuale
  in Rust e in Go nativi, e solo le due librerie JS conservano l'ordine di
  inserimento. Qualunque output che itera una mappa va ordinato
  esplicitamente.
- Fuso dell'host e ordinamento UTF-16 differiscono nelle librerie JS.

**Limiti.** Mancano funzioni utente, cicli e aggregati come `sum`. Ogni
funzione di dominio va specificata come funzione host e implementata due volte.
Tutto l'ecosistema è pre-1.0, e metà della specifica riguarda protobuf, che a
noi non serve: andrebbe ritagliato un profilo per documenti.

## SQL con DuckDB

**Dipendenze.** È dichiarativo, e le dipendenze fra tabelle si ricavano dal
testo nella maggior parte delle query: 25 su 30 con sqlparser-rs.

**Determinismo fra nativo e browser.** Lo stesso motore C++ gira nativo e nel
browser, con risultati identici su aritmetica, aggregati single-thread, cast,
date e regex (misurato su 1.5.6). Nessuna funzione trascendente è identica:
sin, cos, tan, log10, cbrt e anche ln differiscono di 1-3 ulp su una parte
degli argomenti. `sqrt` è identica.

**Sandbox nel browser.** È configurabile e bloccabile. Con l'accesso esterno
disattivato, letture da URL e file di sistema falliscono, e i tentativi di
riattivarlo vengono rifiutati. L'ordine di avvio è preciso:
1. `LOAD` delle estensioni;
2. `SET` delle impostazioni, fuso compreso;
3. `allowed_paths` per gli asset del documento, senza cui anche un file
   registrato con `registerFileBuffer` viene rifiutato;
4. disattivazione dell'accesso esterno e blocco della configurazione.

Va provato in un browser vero. La CSP della pagina deve includere
`'wasm-unsafe-eval'`.

**Peso.** Circa 5,5 MB più le estensioni, scaricate a runtime se non le
ospitiamo noi; l'avvio è nell'ordine del secondo.

**Specifica.** Il dialetto ("DuckSQL") è di un prodotto senza specifica
formale. Ha una grammatica PEG nel codice, che diventa il parser predefinito
nella 2.0, ma non definisce la semantica, e la 2.0 introduce cambi
incompatibili. Senza `ORDER BY` su una chiave totale l'ordine delle righe non è
deterministico, e gli aggregati floating point in multithread cambiano a ogni
esecuzione.

**Se lo si adotta.** O si rimanda a una versione fissata di DuckDB con la sua
suite di test, oppure si scrive un sottoinsieme SQL proprio, con grammatica,
tipi e semantica. Evidence, passata da DuckDB a ClickHouse, mostra il rischio
di legarsi a un dialetto.

## Opzioni che emergono

1. **Due livelli.** Formule in un linguaggio di espressioni puro (CEL, stile
   Excel o sottoinsieme JS, con un profilo nostro). Codice eseguito in JS dentro
   un motore wasm a versione fissata, oppure in Python, con i risultati salvati
   come asset che le formule leggono.
2. **Tre strati.** Espressioni per celle e testo, SQL per tabelle e viste,
   codice generico opzionale.
3. **JS a entrambi i livelli.** Un solo parser e un solo strumento per le
   dipendenze, con un sottoinsieme ristretto per le formule. Va però contro le
   attese di chi viene da Excel.

Qualunque scelta richiede che lo standard fissi in ogni caso:
- una sintassi canonica indipendente dal locale;
- i riferimenti per nome come forma principale;
- orologio, seme e fuso come input espliciti;
- una libreria numerica con algoritmo definito;
- un budget di valutazione.

## Da misurare

- Avvio reale nel browser di QuickJS wasm, DuckDB-WASM e Pyodide sullo stesso
  hardware.
- Un prototipo del profilo scelto con il corpus eseguito sia nativo sia in
  wasm.
