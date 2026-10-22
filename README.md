# editor

Progetto di un nuovo standard per documenti, fogli di calcolo e presentazioni:
un solo modello, sorgente testuale diffabile con Git, editor grafico che genera
lo stesso sorgente, pensato anche per essere letto e modificato da un'AI.

Il nome provvisorio del progetto è Kamii. C'è la bozza dei tipi di nodo,
scritta con Alessio, una bozza di specifica del `core` e della classe 1, i cui
esempi sono anche i test, e un primo runtime da riga di comando in TypeScript
che legge la cartella di un documento e scrive il `resolved tree`, o lo esporta
in un solo file HTML: passa tutti gli esempi della specifica.

- [docs/handoff.md](docs/handoff.md): passaggio di consegne per le sessioni
  future: stato, decisioni, domande aperte, prossimi passi.
- [docs/glossario.md](docs/glossario.md): i nomi del prodotto, in inglese, con
  la loro definizione.
- [docs/contesto.md](docs/contesto.md): decisioni prese, proposte non decise,
  bozza di sintassi, punti aperti.
- [docs/bozza-nodi.md](docs/bozza-nodi.md): il modello del primo livello, con
  le idee di Alessio in ordine.
- [docs/specifica.md](docs/specifica.md): prima bozza di specifica, con esempi
  che sono anche test.
- [docs/ricerca/](docs/ricerca/): note di ricerca con fonti primarie, una per
  tema.
- [runtime/](runtime/): il runtime da riga di comando, con il test di
  conformità che legge gli esempi della specifica ([runtime/README.md](runtime/README.md)).
