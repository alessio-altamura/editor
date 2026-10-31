---
kind: formula
---
{#totale-q3 inputs="vendite-mesi.mese vendite-mesi.euro"}

```python
total(vendite_mesi.range('mese', 'luglio', 'settembre').euro)
```

{#iva inputs="vendite-mesi.euro"}

```python
euro * 0.22
```
