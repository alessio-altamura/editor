# Contesto

Questo repository nasce per progettare un nuovo standard per scrivere documenti,
fogli di calcolo e presentazioni con un unico strumento. Non è un clone: la
discussione di partenza confrontava WordCraft (clone di Word in Rust, pre-alpha)
ed Euro-Office (fork di ONLYOFFICE), che inseguono entrambi la compatibilità con
OOXML. Qui quella compatibilità non è un requisito.

Il file distingue ciò che Alessio ha deciso da ciò che è stato solo proposto.
Le proposte restano tali finché Alessio non le accetta o le scarta.

## Decisioni di Alessio

- Standard nuovo; la compatibilità con DOCX, XLSX e PPTX non è un requisito.
- Un solo strumento per testo, calcolo e slide.
- Si parte dal motore, non dall'interfaccia.
- Deve essere AI-friendly.
- Doppia scrittura: sorgente come codice ed editor grafico; ognuno genera l'altro.
- Deve essere diffabile con Git. Riferimenti: Notion per il modello a blocchi,
  Obsidian per i file di testo locali; in contrapposizione a Word, LaTeX e Markdown.
- Un documento è un file sorgente più i suoi asset. Può stare in una cartella in
  chiaro oppure in uno zip con un'estensione propria; per Alessio le due forme
  sono equivalenti.
- Il codice nel documento porta un marker se va eseguito e un marker se va
  mostrato.
- Due motori di rendering: uno per l'HTML nel browser, uno per il PDF.
- L'HTML esportato è vivo: ricalcola nel browser.

## Proposte non decise

- Modello semantico a nodi tipizzati con ID stabili. Flusso, griglia e canvas
  (Word, Excel, PowerPoint) come tre viste dello stesso grafo.
- Motore di calcolo reattivo come nucleo: un grafico in una slide è una vista di
  una tabella, non una copia.
- Il sorgente è la fonte di verità. L'editor grafico emette solo operazioni
  esprimibili nel sorgente, stampate da un formatter canonico, con un albero di
  sintassi concreto che preserva i commenti.
- Layout a vincoli invece di coordinate assolute, per non sporcare i diff.
  Posizione assoluta solo come via di fuga.
- ID solo dove un nodo è referenziato (come gli ancoraggi `^id` di Obsidian),
  oppure in un file sidecar.
- Due livelli di diff: testuale subito, via Git; semantico sull'albero più tardi,
  il che richiede ID stabili fin dall'inizio.
- Riusare motori esistenti invece di scrivere l'impaginazione da zero: Typst,
  Taffy, HTML/CSS; Yjs o Automerge per la collaborazione; rowan per l'albero.
- Linguaggio da decidere (per esempio Rust per il nucleo e TypeScript per una
  seconda implementazione).

## Bozza di sintassi

È solo un bersaglio da criticare, non una proposta di sintassi.

```
doc "Rapporto produzione"
  sec
    h  "Risultati Q3"
    p  "Le linee hanno prodotto {@vendite.totale} pezzi."
  data #vendite
    cols  mese, pezzi, scarti
    row   Lug, 1200, 14
    row   Ago, 1350, 9
    row   Set, 1280, 11
    calc  totale = sum(pezzi)
  view #g1
    of    @vendite
    kind  bar
    x     mese
    y     pezzi
slide
  layout  titolo+contenuto
  title   "Sintesi Q3"
  place   @g1  fit
```

Debolezze già note: tipi dei valori impliciti; unità di misura ed espressioni non
definite; layout a vincoli solo accennato; nessuna regola per assegnare gli ID
quando due rami lavorano in parallelo.

## Orientamenti di Alessio (da precisare)

- Tutto open source, e si possono riusare pezzi esistenti. Restano da
  precisare: la licenza dell'implementazione (permissiva o copyleft), che
  decide quali componenti si possono incorporare; la licenza del testo della
  specifica e la concessione sui brevetti; chi governa le modifiche.

- Un file di testo che contiene contenuto, presentazione, slide, grafici,
  codice, tabelle CSV e formattazione. Esportabile in HTML per il browser e
  stampabile in PDF. Gli asset sono ammessi (vedi le decisioni). Restano da
  precisare se documento e slide nello stesso file condividono dati e grafici.

- Formule in sintassi Python, con la possibilità di richiamare codice esterno
  al documento. Restano da precisare: solo la sintassi o anche il runtime
  Python; chi esegue il codice quando il documento lo apre un altro; dove
  stanno i risultati calcolati; come una tabella appare al codice Python;
  come il motore scopre le dipendenze; come il documento dichiara l'ambiente
  e la versione del codice esterno.

## Punti aperti

- Come tenere gli ID senza rumore nei diff e senza collisioni nei merge.
- Collaborazione in tempo reale (CRDT) contro merge Git: due modelli di concorrenza.
- Dati grandi: file colonnari referenziati, non nel sorgente.
- Primo caso d'uso in cui gli strumenti attuali sono chiaramente peggiori.
  Ipotesi da confermare: documentazione tecnica con dati vivi, da tenere in Git.
- Governance e licenza della specifica.

## Ordine di lavoro

Prima del motore e dell'editor servono tre cose piccole:

1. Modello dei nodi: tipi minimi per testo, tabella, vista e slide, e come si
   legano. La prima bozza la scrive Alessio.
2. Sintassi testuale canonica con formatter.
3. Corpus di documenti di esempio con l'output atteso, base dei test di
   conformità.
