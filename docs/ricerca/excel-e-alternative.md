# Excel: punti di forza, difetti e chi ha provato a migliorarlo

Ricerca del 2026-10-20, nata dalla domanda di Alessio: Excel è davvero il
massimo, quali vantaggi ha e come si può migliorare l'esperienza d'uso? I fatti
portanti sono stati ricontrollati su fonte primaria; dove il controllo ha
corretto, qui c'è la versione corretta. Completa
[connettori-e-usi-excel.md](connettori-e-usi-excel.md), che copre gli usi reali
e i connettori.

## In sintesi

- Excel vince su quattro cose:
  - la griglia come struttura già pronta;
  - i valori sempre visibili e il ricalcolo immediato;
  - la leggibilità a colpo d'occhio, che rende facile collaborare;
  - un nucleo di funzioni piccolo.

  Sono proprietà dell'interfaccia e del modello: il nostro editor deve
  conservarle anche se sotto il cofano tutto sta in file separati.
- I difetti hanno cause di progetto precise:
  - formule nascoste e sovrascrivibili;
  - formule copiate cella per cella;
  - riferimenti per posizione;
  - costanti dentro le formule;
  - tipi indovinati dal testo;
  - tagli silenziosi;
  - contenuto nascosto nel file;
  - niente test né versioni.

  Quasi tutti spariscono con le decisioni già prese: tabelle con nome, niente
  coordinate, tipi in uno schema, testo in Git.
- Chi ha provato a superare Excel imponendo la struttura all'ingresso ha perso
  il grande pubblico (Improv). La struttura offerta come opzione sopravvive, ma
  resta di minoranza (pivot, tabelle di Excel). Gli strumenti a record (Airtable,
  Notion, Grist) hanno successo per liste e tracker, non per i modelli.
- La tecnica da sola non basta. Resolver One, un foglio in Python chiuso nel
  2012: "The vast majority of people are happy with either Microsoft Excel, or
  one of the free alternatives". Il vantaggio va cercato dove Excel non arriva
  per costruzione:
  - sorgente aperto e diffabile;
  - lettura e scrittura da parte dell'AI;
  - un solo documento per testo, calcolo e slide.

## Perché Excel funziona

- **Struttura senza doverla inventare.** Nardi e Miller (INTERACT '90)
  attribuiscono il successo a due cose: un insieme limitato di operazioni di
  alto livello e un formato visivo forte che struttura i dati. "Users do not
  have to invent a structure". Per cominciare bastano due concetti: celle come
  variabili e funzioni come relazioni. È anche un avvertimento: nomi e schemi
  obbligatori chiedono all'utente di inventare struttura fin dall'inizio.
- **Valori visibili e ricalcolo immediato.** "Debugging in Excel means looking
  at values that are continuously displayed in intermediate cells" (Peyton
  Jones, Blackwell e Burnett, 2003). Nardi e Miller (1991, interviste a sei
  utenti e tre specialisti) chiamano "twinkling lights" i valori che si
  aggiornano da soli: sono ciò che motiva gli utenti. Green e Blackwell ne
  fanno l'esempio di "progressive evaluation": il lavoro parziale si verifica
  in ogni momento.
- **Collaborazione.** Quasi tutti i fogli osservati da Nardi e Miller erano
  frutto di lavoro fra utenti, esperti locali e programmatori, perché il
  modello "is readily apprehended by simply viewing it".
- **Dipendenze nascoste, ma comode all'inizio.** Green e Blackwell: "Do not
  rush to eliminate hidden dependencies". Nell'esplorazione i legami a senso
  unico abbassano la fatica; il problema arriva dopo, quando la struttura si
  irrigidisce. Meglio offrire viste calcolate (chi usa questo nome, il grafo)
  che imporre dichiarazioni prima di scrivere.
- **Excel stesso va verso il testo.** LAMBDA è disponibile per tutti dal
  febbraio 2022. L'Advanced Formula Environment (Excel Labs) salva le formule
  con nome in moduli di codice dentro il file, importabili da GitHub gist. È un
  precedente diretto di "formule come file di testo", ma come componente
  aggiuntivo, sincronizzato con il Name Manager.

## Difetti e cause

- **Formule nascoste e sovrascrivibili.** Nella griglia si vede il valore, e
  una costante scritta sopra una formula ha lo stesso aspetto. Nel formato
  XLSX le formule copiate sono già salvate come "shared formula": una cella
  con una formula propria sovrascrive in silenzio. Le colonne calcolate delle
  tabelle di Excel hanno una formula sola, con eccezioni per cella segnalate da
  un triangolo verde.
- **Formule copiate.** Nel corpus Enron le formule uniche sono il 4,5%: in
  media 100 su 2.223 per foglio. Una formula per colonna ridurrebbe il sorgente
  di circa venti volte.
- **Riferimenti per posizione.** Il 24% dei fogli Enron con formule contiene un
  valore d'errore, e `#REF!` compare in 931 fogli. Reinhart e Rogoff fecero una
  media sulle righe 30-44 invece che 30-49, escludendo cinque paesi. L'errore
  del foglio, insieme a un errore di trascrizione, pesa però circa 0,4 punti
  sui 2,3 di differenza: il resto viene da scelte di metodo.
- **Errori negli audit.**
  - Panko riporta errori nel 94% di 85 fogli ispezionati in sei studi, e un
    tasso medio per cella del 3,9% in 14 esperimenti di laboratorio.
  - L'audit di Powell, Baker e Lawson (2009) copre 50 fogli e 270.722 formule.
    Trova errori in 47 fogli su 50, e risultati sbagliati nell'86% dei fogli,
    con un tasso per cella fra lo 0,87% e l'1,79%.
  - Gli errori più frequenti sono le costanti scritte dentro le formule (37,7%
    delle istanze) e gli errori di riferimento (32,9%).
- **Tipi indovinati dal testo.**
  - Con le impostazioni predefinite, Excel trasforma SEPT2 e MARCH1 in date.
    Gli articoli con liste di geni colpiti erano il 19,6% in un campione del
    2016 e il 30,9% fra il 2014 e il 2020 in un campione più ampio: le due
    cifre non sono confrontabili.
  - Nel 2020 il comitato HGNC ha rinominato i geni, per esempio in SEPTIN1 e
    MARCHF1.
  - Microsoft ha poi aggiunto quattro opzioni per disattivare le conversioni,
    ma "JAN 1" può ancora diventare una data, e Power Query non segue quelle
    impostazioni. Le regole sui tipi devono valere uguali su ogni via
    d'ingresso: digitazione, import, fonti esterne.
- **Tagli silenziosi.** Public Health England, ottobre 2020: 15.841 casi
  positivi non sono entrati nei dati, perché alcuni file superavano la
  dimensione massima. La causa è contesa:
  - la BBC parlò del vecchio formato XLS;
  - Dido Harding scrisse al Parlamento che non era colpa del formato, ma della
    preparazione dei dati.

  Il difetto di progetto resta il taglio senza errore.
- **Contenuto nascosto.** La raccolta di casi di EuSpRIG elenca fughe di dati
  da righe nascoste, schede e cache delle pivot: Proud Boys 2023, Cambridge
  University Hospitals 2023, la polizia nordirlandese 2023 con 10.799 persone e
  una multa di 750.000 sterline. Il caso Barclays-Lehman 2008 viene dalla
  stampa. Nel nostro formato il rischio si sposta sull'HTML esportato: va
  deciso se include solo ciò che le viste mostrano.
- **Niente test.** Le formule di controllo, del tipo
  `IF(A1<16,"OK","margin cannot be over 16")`, compaiono nel 9% circa dei
  fogli Enron ed EUSES. WYSIWYT (Burnett e Rothermel) mostra che un segnale
  visivo di "quanto è testato" funziona anche con utenti senza formazione.
- **Niente versioni.** Il 9,6% delle email Enron allega o cita un foglio. Alla
  banca Robeco i fogli vivono in media più di cinque anni, ciascuno è usato da
  13 persone e solo un terzo ha documentazione. Lo strumento di confronto di
  Microsoft esiste solo nelle licenze professionali.
- **Compatibilità.** Con i dynamic array (2018) Microsoft ha introdotto
  l'operatore `@` per le vecchie formule, e nelle versioni precedenti alcune
  formule compaiono come `_xlfn.SINGLE()` con errore. Lezione per noi: una
  versione della semantica nel file fin dall'inizio.

## Chi ha provato a migliorarlo

- **Lotus Improv**:
  - Uscì per NeXTSTEP nel 1991 e per Windows nel 1993. Separava dati, viste e
    formule scritte per nome (`PROFIT=PRICE-COST`).
  - Lo sviluppo si fermò nell'agosto 1994, e Lotus lo chiuse nell'aprile 1996
    "due to low sales": i clienti, incerti fra 1-2-3 e Improv, restavano con
    1-2-3.
  - Joel Spolsky, allora nel team di Excel, racconta che verso il 1993 quasi
    tutti i clienti visitati usavano Excel "because it was a convenient way to
    create a table". Improv invece "was great at calculations, but terrible at
    creating tables". È un aneddoto, ma va nella stessa direzione dei dati dei
    corpus.
  - Una curiosità utile: una cella coperta da due regole veniva segnalata come
    conflitto.
- **Pivot table**: l'idea di Improv sopravvissuta come opzione, da Excel 5, ma
  compare solo nell'1,5% dei fogli Enron.
- **Quantrix Modeler**: erede del modello di Improv con dimensioni come tempo,
  prodotto e regione. Vive in una nicchia professionale costosa, ed è passato
  da IDBS a Danaher.
- **Apple Numbers** (2007): tabelle multiple su una tela libera, riferimenti
  alle intestazioni come `SUM(Revenue)`. Le pivot sono arrivate solo nel 2021.
- **Tabelle di Excel** (2007): riferimenti strutturati, una formula per
  colonna con eccezioni per cella segnalate, rinomine propagate. Non ci sono
  misure pubbliche di quanto si usino; i nomi nelle formule compaiono
  nell'1,4% dei fogli EUSES analizzati.
- **Grist**:
  - Fondato nel 2014; il nucleo è grist-core, sotto Apache-2.0. "A single
    formula applies to a whole column".
  - Le colonne dati sono distinte da quelle formula, che non si modificano a
    mano. Un valore incompatibile con il tipo viene accettato ma evidenziato.
  - Le formule non indirizzano le righe per numero: "la riga precedente" si
    chiede in modo esplicito con `PREVIOUS(rec, group_by, order_by)`. Le righe
    hanno comunque un ordine memorizzato (manualSort): anche senza riferimenti
    per posizione, qualcuno deve definire l'ordine.
- **Airtable**: una formula per campo, e "formulas cannot reference values
  present in the cell or cells of other records". Ciò che attraversa i record
  passa da collegamenti espliciti: lookup e rollup. L'acquisizione da parte di
  Bending Spoons si è chiusa il 4 settembre 2026.
- **Notion**: un database è una collezione di pagine, ed è a sua volta una
  pagina. Le formule attraversano le relazioni (`Tasks.length()`). Il limite è
  di 250.000 righe per database, una scala da documento più che da database.
- **Coda**: tabelle con nome e formule anche nel testo del documento. È
  l'analogo più vicino a "documento con tabelle e formule nel testo". Grammarly
  l'ha acquisito nel 2024, e oggi si chiama Superhuman Docs.
- **Causal**: variabili al posto delle celle, con formule leggibili come
  "Profit = Revenue – Costs". È partito dalle startup, perché banche e
  consulenze erano troppo legate a Excel ("there's nothing you can't do in
  there"). Lucanet l'ha acquisito nel 2024.
- **Quadratic**: celle di codice Python, SQL e JavaScript accanto alle formule.
  Da marzo 2026 è closed source: resta un riferimento di design, non codice da
  riusare.
- **Mesh**: il precedente più vicino al nostro modello.
  - È un foglio che è la vista di un sorgente testuale gestito in Git.
  - Ogni azione sulla griglia passa per parse, modifica dell'albero, nuova
    stampa del testo e nuova esecuzione.
  - Posizione e formato stanno in metadati separati dalla definizione.
  - Fra le cose ancora da fare elenca un formatter migliore, "to make it easy
    to review changes via text comparison".
- **Ink & Switch Potluck ed Embark**: arricchire gradualmente il testo con dati
  e formule. Il testo informe rendeva difficili i dati strutturati, ed Embark è
  passato a un outline strutturato.
- **Observable**: dai notebook in un formato proprietario a Framework (2024),
  con file Markdown e JavaScript in Git. Tom MacWright, che ci ha lavorato, sul
  dialetto JavaScript di Observable: "don't mess with language standards".
- **Unità di misura.**
  - Errori di dimensione compaiono in molti fogli: nel 42,5% di un campione di
    40, ma con falsi positivi e su un campione ambiguo, quindi non è un tasso
    generale.
  - Annotare le unità costa in media 102 celle per cartella Enron, ma la
    mediana è di 16. Il costo si concentra in poche cartelle grandi, quindi
    un'annotazione facoltativa costerebbe poco nel documento tipico.
  - Un'inferenza automatica conviene solo se sbaglia meno degli errori che
    previene (Williams et al., 2020).
- **Il tempo come dimensione.** Petricek e Boďa (OOPSLA 2026): in Excel, se
  metti il tempo sulle righe, "you have lost a dimension of your spreadsheet".
  Il loro Timeline aggiunge il tempo come terza dimensione. Va nella direzione
  delle tabelle multidimensionali già decise.
- **Nomi.** I nomi non sono una sicurezza gratuita. In un esperimento con
  studenti del 2009, chi aveva i nomi ha corretto il 44% degli errori di
  formula, contro il 63% del gruppo senza nomi. In uno studio randomizzato del
  2010 la differenza è più piccola e non significativa. Gli studi riguardano
  principianti che correggono fogli altrui.

## Cosa implica per il progetto

1. **La cornice della griglia.** L'editor deve restituirla: dati in tabella con
   i risultati al loro posto, anche se formule e dati stanno in file diversi.
2. **I valori visibili.** Ogni nome intermedio mostra il suo valore. Il
   ricalcolo resta incrementale e immediato anche fra file.
3. **Formula per colonna.** Da decidere se con eccezioni per cella segnalate,
   come le tabelle di Excel, o senza eccezioni, come Grist.
4. **Calcoli fra righe.** Totali progressivi e riga precedente richiedono un
   ordine esplicito, come `order_by`. L'ordine delle righe è un dato da
   salvare, anche se non è un indirizzo.
5. **Relazioni fra liste.** Sono collegamenti espliciti, come in Airtable e
   Notion.
6. **Tipi.** Si riconoscono e poi si fissano, con le stesse regole su ogni via
   d'ingresso. Le unità sono facoltative.
7. **Test.** Test e asserzioni come nodi del formato, eseguiti dal runtime e
   visibili nel diff.
8. **Nessun taglio silenzioso.** Ogni perdita di dati in import o export è un
   errore esplicito.
9. **Export.** L'HTML esportato include solo ciò che le viste dichiarano.
10. **Versione della semantica.** Va scritta nel file fin dall'inizio.
11. **Niente dialetti.** Non inventare un dialetto di un linguaggio esistente.
    Il formatter canonico è il collo di bottiglia per diff leggibili.
12. **Lavoro vero.** Provare i prototipi su fogli reali, non su esempi
    costruiti: Ink & Switch ammette di non aver usato Potluck "very much in
    serious contexts".

## Lacune

- Nessun dato di vendita verificabile su Lotus Improv; le date vengono da fonti
  d'epoca citate da terzi.
- Nessuna misura pubblica dell'uso delle tabelle di Excel.
- Il libro di Liebowitz e Margolis sul passaggio da Lotus 1-2-3 a Excel è una
  fonte di parte, e non è stato letto.
