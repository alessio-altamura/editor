# Formule in Python: cosa comporta

Ricerca del 2026-10-10 sull'orientamento di Alessio: formule in sintassi Python,
con la possibilità di richiamare codice esterno al documento. Ogni fatto
portante è stato ricontrollato su fonte primaria da un secondo agente; dove ha
corretto, qui c'è la versione corretta. Python non è un vincolo: questa nota
serve al confronto con le alternative.

## In sintesi

- "Le formule sono Python" vuol dire "si comportano come CPython 3.x", perché
  Python non ha una semantica formale. Una seconda implementazione indipendente
  e un corpus con output atteso diventano difficili.
- Con Python arbitrario il grafo reattivo non si ricava dal testo. Microsoft,
  con Python in Excel, ci ha rinunciato e ricalcola tutto in sequenza. Per
  averlo servono regole (marimo) o tracciamento a runtime (Grist).
- Il codice esterno rompe il diff: i risultati cambiano senza che cambi una
  riga del documento. Serve un pin per hash dentro il documento, risultati
  salvati, o entrambi.
- Un documento con Python eseguibile è un documento con macro. CPython non si
  isola dall'interno del processo, e una denylist dentro Pyodide non è un
  confine: Grist ne ha fatto le spese nel 2026.
- La strada più credibile per risultati identici fra nucleo e browser è lo
  stesso interprete compilato una volta in WASM ed eseguito in entrambi.

## La specifica

La Language Reference di Python dichiara di non essere una specifica formale
salvo sintassi e analisi lessicale, e avverte che chi reimplementasse Python da
quel testo otterrebbe probabilmente un linguaggio diverso
([introduzione](https://docs.python.org/3/reference/introduction.html)).
Il riferimento normativo diventa quindi una versione di CPython più la sua
libreria standard.

La semantica cambia anche tra versioni minori. Dalla 3.12 `sum()` sui float usa
la sommatoria di Neumaier: `sum([0.1]*10)` dà `1.0`, prima dava
`0.9999999999999999`
([What's New 3.12](https://docs.python.org/3/whatsnew/3.12.html)). La 3.13 ha
rimosso 19 moduli della libreria standard
([PEP 594](https://peps.python.org/pep-0594/)). La 3.15.0 è uscita il
2026-10-09. Grist, che ha attraversato il passaggio da Python 2 a 3, documenta
formule da riscrivere per avere gli stessi risultati (`9 / 2`, `round()`)
([Grist, Python](https://support.getgrist.com/python/)).

Il determinismo va imposto dall'host. Gli hash di `str` e `bytes` sono
randomizzati per processo
([data model](https://docs.python.org/3/reference/datamodel.html)); `random`,
`time` e `datetime.now()` non sono deterministici; gli stream del nuovo
`Generator` di NumPy possono cambiare tra release
([NEP 19](https://numpy.org/neps/nep-0019-rng-policy.html)). Il modulo `math` di
CPython è in gran parte un involucro sulla libm della piattaforma, quindi le
funzioni trascendenti possono differire tra glibc, MSVC ed Emscripten (la
documentazione non quantifica quanto).

Per una seconda implementazione in TypeScript, interi e float divergono da
JavaScript in modo sistematico (verificato con CPython 3.13 e Node 22):
`round(2.5)` dà 2 in Python e 3 in JS, `-7 % 3` dà 2 e -1, `7 // -2` dà -4,
gli interi Python sono esatti oltre 2^53 e quelli JS no, `repr(1e16)` è
`'1e+16'` contro `'10000000000000000'`. Riscrivere Python in TS vuol dire
emulare tutto questo. Brython, il progetto più longevo, dichiara compatibilità
parziale.

## Dove si esegue

| Opzione | Fedeltà | Sandbox | Browser | Note |
|---|---|---|---|---|
| CPython nativo via PyO3 | piena | nessuna in-process | no | PyO3 0.29.3, MIT o Apache-2.0, richiede libpython |
| Pyodide | piena, con wheel Emscripten | va costruita fuori | sì, circa 6,3 MB compressi | MPL-2.0, Python 3.14.2, 346 pacchetti |
| CPython su WASI in wasmtime | piena, senza estensioni C | a capability | non verificato | wasip1 Tier 2 dalla 3.13, niente socket |
| Monty (Pydantic) | sottoinsieme | per costruzione | sì, circa 7,1 MB compressi | MIT, 1.1.0 del 2026-10-05, niente pacchetti |
| Starlark (starlark-rust) | dialetto con specifica propria | ermetico | sì, compila in wasm32 | Apache-2.0, deterministico, niente eccezioni né classi |
| RustPython | non misurata | non documentata | demo | MIT, "non del tutto pronto per la produzione" |
| MicroPython WASM | Python 3.4 circa | da costruire | sì, circa 200 KB compressi | MIT, semantica numerica diversa |

Fonti: [PyO3](https://crates.io/api/v1/crates/pyo3),
[Pyodide](https://registry.npmjs.org/pyodide),
[PEP 11](https://peps.python.org/pep-0011/),
[Monty](https://pypi.org/pypi/pydantic-monty/json),
[Starlark spec](https://raw.githubusercontent.com/bazelbuild/starlark/master/spec.md),
[starlark-rust](https://crates.io/api/v1/crates/starlark),
[RustPython](https://crates.io/api/v1/crates/rustpython),
[MicroPython](https://registry.npmjs.org/@micropython/micropython-webassembly-pyscript).

I pesi di Pyodide e Monty sono misurati sui tarball npm. Il tempo di avvio di
Pyodide 314 nel browser non è misurato: la roadmap dice 4-5 secondi con cifre
datate, e i 2700 ms del benchmark Pydantic riguardano Pyodide 0.28 sotto Deno.
Va misurato sul nostro bersaglio.

WebAssembly è deterministico salvo pochi casi documentati: bit dei NaN,
relaxed SIMD, thread, esaurimento delle risorse
([Nondeterminism.md](https://raw.githubusercontent.com/WebAssembly/design/main/Nondeterminism.md)).
Lo stesso modulo, con la libm compilata dentro, dà gli stessi risultati in
wasmtime e nel browser.

## Dipendenze e reattività

- **Python in Excel:** le celle Python si calcolano in ordine di riga, con uno
  spazio di nomi globale condiviso, e a ogni cambiamento si ricalcolano tutte
  in sequenza
  ([get started](https://support.microsoft.com/en-us/excel/python/get-started-with-python-in-excel)).
  I riferimenti alla griglia però sono letterali che al salvataggio diventano
  argomenti della formula: il motore conosce i precedenti senza leggere il
  Python. È documentato in
  [MS-XLSX](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-xlsx/2c5dee00-eff2-4b22-92b6-0738acd4475e)
  §2.1.23 e §2.3.10.
- **marimo:** ricava definizioni e riferimenti di ogni cella leggendo il
  codice, senza eseguirlo. Per riuscirci impone una sola definizione per nome e
  non traccia le mutazioni
  ([reactivity](https://docs.marimo.io/guides/reactivity/)). Il file `.py`
  serializza il grafo nelle firme delle celle.
- **Grist:** traccia le dipendenze a runtime, registrando gli accessi durante
  la valutazione, a grana di colonna più una relazione sulle righe
  ([depend.py](https://raw.githubusercontent.com/gristlabs/grist-core/main/sandbox/grist/depend.py)).
  Il grafo esiste solo dopo una prima esecuzione.
- **knitr:** la ricerca automatica delle variabili globali è dichiarata "may
  not be reliable" ([opzioni](https://yihui.org/knitr/options/)).

Con Python arbitrario si sceglie quindi fra due strade. La prima: riferimenti
sintattici obbligatori, cioè nomi o letterali; il grafo è noto senza eseguire
ed è visibile a diff, AI ed editor. La seconda: tracciamento a runtime; nessun
vincolo, ma il grafo resta invisibile finché non si esegue.

## Risultati e diff

Nessun precedente ha diff dei risultati leggibili a livello di nodo:

- **Jupyter:** gli output stanno nel `.ipynb`, con le immagini in base64. Ogni
  riesecuzione sporca il diff, ed è nato nbdime per gestirlo.
- **Quarto:** salva i risultati in `_freeze`, da committare. Il diff è una
  stringa JSON enorme più PNG, e l'invalidazione guarda solo il sorgente
  ([code execution](https://quarto.org/docs/projects/code-execution.html)).
- **Observable Notebook Kit:** salva i risultati in `.observable/cache`, JSON
  su una riga.
- **marimo:** il `.py` resta pulito, i risultati vanno in
  `__marimo__/session/*.json`, da committare se si vuole l'anteprima su GitHub.
- **Pluto:** nessun output nel file. Ogni cella ha un UUID, il corpo del file
  è in ordine di dipendenza e un piè di pagina registra l'ordine visivo
  ([Basic.jl](https://raw.githubusercontent.com/JuliaPluto/Pluto.jl/main/sample/Basic.jl)).

Lo spazio libero, coerente con "diffabile", è un file di risultati in testo
canonico, con una voce per ID di nodo e come chiave l'hash degli input.

## Codice esterno

- Le cache Python esistenti non mettono nella chiave il codice importato. In
  joblib conta solo il sorgente della funzione decorata. In marimo, "the source
  code of imported modules is not used when computing the cache key"
  ([caching](https://docs.marimo.io/api/caching/)). I risultati vecchi
  passano in silenzio.
- Per i pacchetti di terzi esistono pin maturi: PEP 723 per dichiarare le
  dipendenze inline, `uv lock --script` con sha256 per artefatto, PEP 751
  `pylock.toml` come lock standard. Nessuno di questi copre l'hash del codice
  scritto dall'utente; va gestito dal formato. Con `exclude-newer` conviene un
  timestamp assoluto: con una durata, uv non registra il cutoff calcolato
  (verificato con uv 0.11.32 e 0.13.0).
- Installare è già eseguire. Il build di una sdist esegue codice, e un wheel
  può installare file `.pth` che girano a ogni avvio dell'interprete.
- I modelli per rendere visibile il cambiamento sono due. Pin per contenuto
  dentro il documento: Unison identifica ogni definizione con l'hash del suo
  albero di sintassi, Nix ammette la rete solo se l'output ha un hash
  dichiarato. Oppure risultati committati più una verifica in CI che ricalcola.

## Sicurezza

- **Python in Excel** esegue in container isolati da hypervisor nel cloud
  Microsoft, uno per cartella di lavoro, senza rete e senza accesso al computer
  dell'utente. Solo librerie curate da Anaconda, nessun codice locale. Proprio
  perché isola tutto, per default non mostra avvisi
  ([sicurezza](https://support.microsoft.com/en-us/excel/python/data-security-and-python-in-excel)).
- **CPython** non si isola dall'interno: PEP 578 dice che ogni tentativo
  passato è fallito, e RestrictedPython dichiara di non essere una sandbox.
- **Grist:** CVE-2026-24002 (gennaio 2026, critica, CVSS tra 9.0 e 9.6 secondo
  la fonte). "pyodide on node does not have a useful sandbox barrier": un
  documento malevolo poteva lanciare processi sul server. È stata corretta
  nella 1.7.9 eseguendo Pyodide sotto Deno con permessi ristretti.
- **La ricerca di Cyera presentata a DEF CON 34** (agosto 2026) ha aggirato
  sette prodotti basati su Pyodide che si affidavano a denylist di moduli,
  passando per `ctypes` e gli export di Emscripten
  ([Cyera](https://www.cyera.com/research/sandcastles-not-sandboxes-how-one-architectural-flaw-exposed-seven-products)).
- **Macro VBA:** bloccarle per default nei file da internet ha funzionato, ma
  il criterio di provenienza (Mark of the Web) si aggira con i contenitori, e
  in un flusso Git non esiste. VS Code Workspace Trust e Pluto Safe Preview
  legano la fiducia alla cartella o alla provenienza; si può legarla anche
  all'hash del codice approvato.

## Opzioni emerse

1. CPython completo, con versione e ambiente fissati nel documento (modello
   Python in Excel, ma locale). La fedeltà e l'ecosistema sono massimi; in
   cambio la specifica coincide con CPython e serve un isolamento a livello di
   processo o di WASM.
2. Un sottoinsieme di Python definito dalla specifica (modello Starlark):
   deterministico, dipendenze statiche, seconda implementazione realistica.
   Però non è Python per chi incolla codice da internet.
3. Due livelli: formule in un linguaggio piccolo e puro; codice esterno come
   CPython in sandbox, con pin per hash e risultati salvati. Due semantiche da
   spiegare, e il confine fra i livelli va progettato.
4. Codice esterno come funzioni registrate dall'host (modello Monty e
   Starlark): superficie piccola e dichiarata, ma niente import liberi.

## Lacune

- Avvio reale di Pyodide 314 e di CPython-WASI nel browser: non misurato.
- Compatibilità attuale di RustPython: nessuna misura recente.
- Se Python in Excel ammetta oggi pacchetti arbitrari: le pagine Microsoft non
  ne parlano.
- Contenuto del WASM browser di Monty (22,6 MB non compressi): non analizzato.
