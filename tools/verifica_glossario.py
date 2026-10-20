#!/usr/bin/env python3
"""Controlla docs/glossario.md contro le sue regole (§1).

Uso: python3 -I tools/verifica_glossario.py docs/glossario.md

Legge le tabelle del §4 (intestazione: Nome | Italiano | Definizione | Stato | Da non usare) e controlla:
- nomi unici nel §4, senza distinzione di maiuscole (N4);
- forma dei nomi: parole minuscole inglesi separate da uno spazio, con il trattino ammesso dentro una parola (N1);
- stato fra i valori del §1.2;
- nessuna riga elenca il proprio nome fra i Da non usare;
- ogni nome fra backtick nella Definizione esiste nel §4 (§1.3, passo 3).
Avvisa, senza errore, dei nomi proposti nel §2 e nel §3 che il §4 non contiene ancora.
Esce con errore se una classe di violazioni non è vuota.
"""
import collections, re, sys

doc = open(sys.argv[1], encoding="utf-8").read().split("\n")

def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]

def ticks(text):
    return re.findall(r"`([^`]+)`", text)

tables, sec, cur = [], "", None
for line in doc:
    if line.startswith("#"):
        sec = line.lstrip("#").strip(); cur = None; continue
    if line.startswith("|"):
        c = cells(line)
        if cur is None:
            cur = {"sec": sec, "head": c, "rows": []}; tables.append(cur)
        elif not all(re.fullmatch(r":?-+:?", x) for x in c):
            cur["rows"].append(c)
    else:
        cur = None

HEAD = ["Nome", "Italiano", "Definizione", "Stato", "Da non usare"]
STATI = {"deciso", "concetto deciso, nome proposto", "proposto", "aperto"}
NAME = re.compile(r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?: [a-z][a-z0-9]*(?:-[a-z0-9]+)*)*")
err = collections.defaultdict(list)

rows = [dict(zip(t["head"], r)) for t in tables if t["head"] == HEAD for r in t["rows"]]
names = collections.Counter()
for r in rows:
    for n in ticks(r["Nome"]):
        names[n.lower()] += 1
        if not NAME.fullmatch(n): err["N1 forma del nome"].append(n)
    if r["Stato"] not in STATI: err["stato fuori elenco"].append("%s (%s)" % (r["Nome"], r["Stato"]))
    avoid = {a.strip().lower() for a in r["Da non usare"].split(",") if a.strip()}
    for n in ticks(r["Nome"]):
        if n.lower() in avoid: err["nome fra i propri Da non usare"].append(n)
for n, c in names.items():
    if c > 1: err["N4 nome doppio nel §4"].append(n)
for r in rows:
    for n in ticks(r["Definizione"]):
        if n.lower() not in names: err["§1.3 nome nella definizione assente dal §4"].append("%s in %s" % (n, r["Nome"]))

warn = []
for t in tables:
    if t["sec"].startswith(("2.", "3.")):
        for r in t["rows"]:
            for n in ticks(r[-1]):
                if NAME.fullmatch(n) and n.lower() not in names: warn.append(n)

print("concetti nel §4: %d righe, %d nomi" % (len(rows), len(names)))
if warn: print("AVVISO nomi del §2 e §3 non ancora nel §4: %d — %s" % (len(set(warn)), ", ".join(sorted(set(warn)))))
for k, v in err.items(): print("VIOLAZIONE %s: %d — %s" % (k, len(v), ", ".join(v[:12])))
print("esito:", "OK" if not err else "ROSSO")
sys.exit(1 if err else 0)
