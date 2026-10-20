# Connettori grafici e usi reali di Excel

Ricerca del 2026-10-20 su due proposte di Alessio:
- eliminare la cella e usare connettori grafici al posto delle formule;
- non rifare Excel, ma servire meglio chi lo usa.

Nel frattempo Alessio ha deciso che il testo è la base e che i connettori sono
una vista con un file proprio. I fatti portanti sono stati ricontrollati su
fonte primaria; dove il controllo ha corretto, qui c'è la versione corretta.

## In sintesi

- Le prove sostengono le decisioni già prese: testo come sorgente, connettori
  come vista generata, layout automatico, posizioni manuali a parte. Lo fanno
  però solo per connettori fra tabelle o passi, non per cablare operazioni e
  condizioni.
- Aritmetica e condizioni vengono meglio in testo, anche per chi lavora a nodi
  tutti i giorni. Gli strumenti maturi mettono un'espressione testuale dentro
  il nodo. Il confine che regge è: formule dentro il blocco, connettori fra
  blocchi.
- Il grafo serve soprattutto a capire un foglio altrui, se è generato e a
  livelli. Come mezzo per scrivere il calcolo non ci sono prove a favore per
  utenti non esperti.
- La maggior parte dei fogli reali è fatta di liste o di poche regole brevi
  ripetute. Il nucleo da servire è piccolo: aritmetica, somme, condizioni,
  ricerca in un'altra tabella, date.
- Togliere gli indirizzi A1 regge. Togliere lo spazio libero è rischioso:
  quando le tabelle sono obbligatorie, la maggioranza degli utenti le rifiuta.
  Servono uno spazio di appunti e calcoli al volo, e un passaggio graduale
  verso la tabella.

## Connettori: cosa dicono le prove

**Il grafo come sorgente rende diff e merge fragili.**
- Blueprint di Unreal e LabVIEW sono binari: il merge si riduce a scegliere fra
  le due versioni. Simulink dal 2012 salva in uno zip binario.
- I formati XML sono testo, ma rumorosi. Alteryx mescola posizioni e logica;
  KNIME scrive campi volatili all'apertura del workflow. Per Grasshopper,
  David Rutten (McNeel) sconsiglia i file .ghx testuali: "merging them will
  almost certainly result in corrupt files".
- Il rumore viene da layout mescolato alla logica, metadati volatili e binari
  incorporati.

**Testo come sorgente, grafo derivato: due precedenti.**
- **Power Query.** In M ogni passo è una variabile con nome e si vede
  l'anteprima dei dati a ogni passo. In Excel desktop la vista è una lista
  lineare di passi; il grafo c'è solo in Power Query Online, con layout
  automatico.
- **Enso.** Il testo è seguito da una coda di metadati: una mappa degli ID e
  le posizioni dei nodi. È il precedente più vicino alla nostra decisione. Il
  suo difetto: gli ID sono legati a posizione e lunghezza nel testo, quindi
  una modifica fatta fuori dall'editor li sposta. Meglio ID stabili legati ai
  nomi, con le posizioni in un file a parte, una riga per nodo, per evitare
  conflitti quando due rami spostano nodi diversi.

**Aritmetica e condizioni.**
- LabVIEW ha il Formula Node ("you do not have to wire low-level arithmetic
  functions"), Unreal il Math Expression node, Max `[expr]`, Houdini il VEX in
  linea.
- Blender Geometry Nodes non ha un nodo espressione e gli utenti lo chiedono
  da anni; uno sviluppatore ha osservato che il difficile è versionare la
  sintassi dell'espressione.
- Sulle condizioni, in uno studio del 1991 (Green, Petre e Bellamy, 11
  soggetti esperti di LabVIEW o progettisti elettronici) il testo è risultato
  più veloce da interpretare per ogni singolo soggetto.
- Il sondaggio del 1997 su 227 programmatori LabVIEW che preferiscono il loro
  strumento raccoglie opinioni correlate all'esperienza con lo strumento, non
  misure.

**Strumenti di preparazione dati per utenti Excel.** Alteryx, KNIME, Tableau
Prep e Power Query modellano il flusso come passi su tabelle intere, e il
calcolo come espressione dentro un passo. Nessuno cabla gli operatori
aritmetici. Alteryx ha circa 8.300 aziende clienti: una nicchia di successo,
di ordini di grandezza più piccola dei fogli di calcolo.

**Nomi e moduli.**
- Su 2.002 modelli Grasshopper pubblicati (Davis, tesi RMIT) la mediana è di
  23 nodi. Il 97,5% non usa moduli e l'81% non ha parametri con nome; i modelli
  non strutturati non li capiva nessuno.
- La soglia dei 50 elementi viene dai modelli di processo, dove misura errori
  formali del modello, non errori di lettura. Vale al più come avviso
  nell'editor per suggerire di raggruppare.
- Nomi e raggruppamenti devono essere il comportamento predefinito, non
  un'opzione.

**Layout.**
- Nell'industria si stima che il 30% del tempo su Simulink vada in
  aggiustamenti manuali del layout. In un esperimento su diagrammi semplici, il
  layout automatico ha ridotto il tempo di creazione di circa un terzo.
- Il criterio estetico che conta di più è ridurre gli incroci fra i
  collegamenti (Purchase 1997). Il layout automatico deve anche essere
  stabile: spostare poco i nodi a ogni modifica.

**Il grafo per capire.**
- Leggere il foglio di un altro costa: nello studio di Srinivasa Ragavan e
  colleghi (CHI 2021) il 40% del tempo va a cercare informazioni, e 12
  partecipanti su 15 alla fine tornano dall'autore.
- In Robeco, 21 analisti su 27 hanno giudicato utili i diagrammi di flusso
  generati dal foglio, a livelli (foglio, blocco, formula). La vista però deve
  mostrare anche filtri, codice e fonti esterne.

**Valori visibili.** Quasi tutti gli strumenti mostrano i dati a ogni passo o
nodo. È un requisito del motore, non solo dell'interfaccia, perché ha costi di
cache e memoria.

**Doppia scrittura nei fogli.** Calculation View (Microsoft Research, 2018, 22
partecipanti) affianca alla griglia un testo delle formule raggruppate per
intervallo, sincronizzato. Rispetto alla sola griglia, chi aveva il testo ha
scritto il 37% più in fretta e corretto gli errori il 41% più in fretta, con
carico cognitivo minore. Il guadagno maggiore va ai meno esperti. Il risultato
viene dall'aggiungere un testo, non dal togliere la griglia.

## Usi reali di Excel

**Quanti fogli hanno formule.** Circa sei su dieci nel corpus Enron (fogli
aziendali): 9.120 su 15.770. Il 44% in EUSES, raccolto dal web, e circa il 7% in
FUSE, 249.376 fogli pubblici. Nella popolazione generale dominano tabelle e
liste senza calcolo; in azienda le formule sono più della metà. Joel Spolsky,
allora nel team di Excel, racconta che verso il 1993 "most people just used
Excel to make lists".

**Funzioni usate.** Nei fogli Enron con funzioni:
- ne compaiono 134 delle 329 disponibili;
- il 94,7% dei fogli ne usa meno di dieci;
- SUM compare nel 72% dei fogli, IF nel 20%, NOW nel 17%, AVERAGE nel 10%,
  VLOOKUP nell'8,5%.

Il nucleo è piccolo: aritmetica, somme, condizioni, ricerca in un'altra
tabella (che senza celle diventa un riferimento per chiave) e date. La coda
lunga dipende dal dominio, e si può lasciare al codice o a librerie esterne.

**Formule copiate.** Un foglio Enron con formule ne ha in media 2.223, ma solo
100 uniche. Le mediane di Jansen: 14 formule uniche, catena di calcolo di
profondità 1. Il 35% delle formule Enron si limita a riportare un valore
altrove, come `=A1`: non è calcolo, è impaginazione. Nel nostro modello
diventano riferimenti nel livello di impaginazione.

**Nomi.** Solo l'8% dei file Enron con funzioni usa intervalli con nome, e il
67% di quei nomi punta a una sola cella: gli utenti vogliono variabili. Il nome
deve nascere dal gesto stesso di inserire un dato, cioè dall'intestazione o
dall'etichetta, non da un passo in più.

**Grafici, pivot e formule matriciali.**
- I grafici compaiono nell'11% dei fogli Enron, quasi solo a colonne e a linee.
- Le pivot nell'1,5%, quasi sempre per sommare o contare.
- Le formule matriciali nell'1,2%.

Le analisi si riducono a poche operazioni: raggruppa, somma, conta, filtra.

**Condivisione e versioni.**
- Il 6,2% delle email Enron ha un foglio in allegato.
- Nella ricostruzione VEnron, il 16,9% dei gruppi di versioni introduce errori
  nuovi.
- Solo l'11,5% degli utenti nel sondaggio SERP usa i propri fogli da solo.

È un argomento a favore del progetto in generale: diff, versioni e revisione.

**La griglia libera resiste.**
- Chalhoub e Sarkar (CHI 2022):
  - 16 intervistati su 21 vedono la libertà di disposizione come controllo
    ("freedom to put things where my mind wants to put them");
  - lo scenario con tabelle obbligatorie è respinto da 15 partecipanti su 20;
  - la maggioranza vuole sia la griglia libera sia la tabella;
  - le operazioni per colonna (formula nell'intestazione, raggruppa per) sono
    apprezzate.
- Bartram e colleghi ("Untidy data", 2021): chi lavora con i dati annota,
  colora, scrive accanto e tiene varianti affiancate per tutto il
  ragionamento.
- Le intestazioni gerarchiche sono frequenti nei fogli del web, e vanno
  previste come struttura, non come celle unite.

**Kale** (preprint arXiv, agosto 2026, non ancora revisionato) è la prova più
vicina alla decisione "niente coordinate":
- organizza i fogli in tabelle con intestazione, con riferimenti solo a celle
  singole, colonne intere o righe intere, e ID di riga stabili anche dopo
  ordinamenti e inserimenti;
- su 1.726 fogli EUSES, il 58% usa solo riferimenti a celle singole e il 39%
  usa intervalli;
- 60 fogli sono stati convertiti a mano in 18 minuti di media;
- in uno studio con 25 persone, Kale riduce in modo significativo gli errori
  in tre rischi di ristrutturazione su cinque.

Gli intervalli parziali costano una ristrutturazione, e l'ordinamento con ID
stabili può sorprendere chi viene da Excel.

**Strumenti senza celle.**
- Grist, Airtable e Notion convergono su tabelle con nome e una formula per
  colonna. Airtable dichiara oltre 500.000 organizzazioni clienti, ma è stata
  acquisita da Bending Spoons nell'agosto 2026 per 1,285 miliardi di enterprise
  value, contro una valutazione di 11 miliardi nel 2021.
- La versione di Grist ospitata dallo Stato francese ha 20.000 utenti attivi
  al mese.
- Per liste e tracker funzionano, ma affiancano Excel, non lo sostituiscono.

**Modelli finanziari.**
- Causal, con formule per nome, è stata acquisita da Lucanet nel 2024.
- Anaplan è un mercato solido nelle grandi aziende.
- Nel sondaggio FP&A 2024, Excel resta lo strumento principale di
  pianificazione per il 52% delle organizzazioni.

**Calcoli al volo.** Soulver e le Math Notes di Apple (2024) usano testo con
variabili e risultati in linea. È un formato che coincide con il nostro
sorgente e non richiede né celle né connettori. Gli input di Observable sono il
pezzo che serve all'HTML vivo.

**Pulizia dei dati.** Si fa meglio per esempio che per formula: Flash Fill, in
Excel dal 2013, generalizza da coppie input-output. La trasformazione generata
può finire nel sorgente come passo con nome.

**Errori legati agli indirizzi.**
- Il 24% dei fogli Enron con formule contiene almeno un valore d'errore di
  Excel.
- Reinhart-Rogoff fece una media sulle righe 30-44 invece che 30-49. Quell'errore
  pesa 0,3 punti su una differenza di 2,3: il resto viene da scelte di metodo.
- Le ispezioni raccolte da Panko trovano errori nel 94% di 85 fogli.
- I nomi dei geni convertiti in date colpivano il 19,6% degli articoli con
  liste di geni nel 2016, e il 30,9% fra il 2014 e il 2020. Il comitato HGNC ha
  poi rinominato i geni.

## Cosa implica per il progetto

1. Connettori solo fra tabelle, passi e viste. Aritmetica e condizioni restano
   espressioni testuali dentro il blocco. È il confine "per scala" fra il file
   delle formule e quello dei connettori.
2. ID stabili legati ai nomi, non alle posizioni nel testo. Posizioni manuali
   in un file a parte, una riga per nodo. Layout automatico stabile, che
   riduce gli incroci.
3. Nomi generati dal gesto: intestazioni ed etichette. Raggruppamenti e
   livelli come comportamento predefinito.
4. Ogni passo e ogni valore con nome mostra il suo valore, anche se la formula
   sta in un altro file.
5. Uno spazio libero per appunti, calcoli al volo e varianti, con la
   possibilità di promuoverlo a tabella. Altrimenti si ripete l'errore di
   Improv e dello scenario "tabelle obbligatorie".
6. ID di riga stabili e riferimenti a colonne intere: Kale mostra che la
   maggior parte dei fogli reali resta esprimibile.
7. La vista a connettori generata e a livelli è uno strumento di lettura e di
   passaggio di consegne, oltre che di scrittura.

## Lacune

- Nessuno studio controllato misura i connettori come sostituto delle formule
  sui compiti tipici dei fogli.
- Non esiste una misura rappresentativa di quanta parte dell'uso di Excel sia
  fatta di liste, modelli, report, pulizia o calcoli al volo; la telemetria
  Microsoft non è pubblica.
- Il paper di Green e Petre del 1992 non è stato letto in originale.
- Le date di Lotus Improv vengono da fonti secondarie.
