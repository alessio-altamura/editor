---
id: vendite-mesi
kind: collection
asset: vendite-mesi.tsv
fields:
  - name: mese
    type: string
    categories: [gennaio, febbraio, marzo, aprile, maggio, giugno, luglio, agosto, settembre]
  - name: euro
    type: number
  - name: iva
    type: number
    formula: "[[iva]]"
---
Le vendite del 2026, mese per mese.
