# Istruzioni per le sessioni

Prima di tutto leggi [docs/handoff.md](docs/handoff.md): stato del progetto,
decisioni, domande aperte e prossimi passi.

- Si lavora in italiano, con prosa asciutta e poca formattazione. I nomi del
  prodotto (oggetti, tipi, file, comandi, codice) sono in inglese.
- Prima di usare un nome nuovo, controlla e aggiorna
  [docs/glossario.md](docs/glossario.md) con le regole del suo §1: un nome per
  concetto, un concetto per nome. Dopo ogni modifica,
  `python3 -I tools/verifica_glossario.py docs/glossario.md` deve dire «esito:
  OK».
- Messaggi di commit in inglese.
- La bozza dei tipi di nodo, [docs/bozza-nodi.md](docs/bozza-nodi.md), è di
  Alessio: Claude la scrive con lui, tenendo separate le sue decisioni dalle
  note e proposte di Claude, e non la sostituisce con una versione propria.
  Vale anche per le sue bozze successive.
- Ogni decisione di Alessio va in [docs/contesto.md](docs/contesto.md), tenendo
  separate decisioni, orientamenti da precisare e proposte non decise. Poi
  commit e push.
- Ricerca solo quando serve a una scelta concreta. Le note vanno in
  [docs/ricerca/](docs/ricerca/), con fonti primarie e fatti verificati.
- Aggiorna [docs/handoff.md](docs/handoff.md) a fine sessione.
