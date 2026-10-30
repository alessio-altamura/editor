# Il formato dello schema di una collection

Ricerca del 2026-10-30 per una scelta concreta: in che forma si scrive lo
`schema` di una `collection` (tipi, chiave, `dialect`). Il contesto lascia
aperto se partire da CSVW o da Frictionless Table Schema [contesto, «Tipi e
dimensioni»]. Fatti letti sulle fonti primarie il 2026-10-30.

## Frictionless: Table Schema e Table Dialect

Fonte: lo standard Data Package v2, pagine
[Table Schema](https://datapackage.org/standard/table-schema/),
[Table Dialect](https://datapackage.org/standard/table-dialect/) e
[Glossary](https://datapackage.org/standard/glossary/); il repository
[frictionlessdata/datapackage](https://github.com/frictionlessdata/datapackage)
dichiara la licenza Unlicense.

- Tipi dei campi, sedici: `string`, `number`, `integer`, `boolean`,
  `object`, `array`, `list`, `datetime`, `date`, `time`, `year`,
  `yearmonth`, `duration`, `geopoint`, `geojson`, `any`.
- Categorie: «`string` and `integer` field types `MAY` include a
  `categories` property … to restrict the field to a finite set of possible
  values». È il tipo categoria che il glossario chiede.
- Chiavi: `primaryKey`, «a field or set of fields that uniquely identifies
  each row in the table»; `foreignKeys` collega campi di questa o di un'altra
  tabella, cioè la `relation` del glossario.
- Valori mancanti: `missingValues` dice quali valori vanno trattati come
  mancanti.
- Numeri scritti all'italiana: sul campo `number`, `decimalChar` (il
  separatore decimale), `groupChar` (quello delle migliaia) e `bareNumber`
  (`true` per default).
- Dialetto, con i default: `delimiter` `,`; `lineTerminator` `\r\n`;
  `quoteChar` `"`; `doubleQuote` `true`; `escapeChar` e `nullSequence` non
  definiti; `skipInitialSpace` `false`; `header` `true`; `headerRows` `[1]`;
  `headerJoin` `" "`; `commentRows` e `commentChar` non definiti.
- Forma del file: il descrittore pubblicato è JSON; «A descriptor `MAY` be
  serialized using alternative formats like YAML or TOML», ma «`SHOULD NOT`
  be externally published in any other format rather than JSON». Uno schema
  scritto in YAML dentro il documento è quindi ammesso, e un `export` verso
  Frictionless lo converte in JSON.

## CSVW

Fonte: [Metadata Vocabulary for Tabular Data](https://www.w3.org/TR/tabular-metadata/),
W3C Recommendation del 17 dicembre 2015.

- Il formato dei metadati è «a dialect of JSON-LD»; l'oggetto in cima
  «MUST have a `@context` property», con valore `http://www.w3.org/ns/csvw`.
- Lo schema di una tabella ha `columns`, `primaryKey`, `foreignKeys` e
  `rowTitles`; una colonna ha fra l'altro `name`, `titles` (nomi alternativi
  per lingua), `datatype`, `null` e `required`.

## Cosa ne segue per la scelta

- Tutte e due coprono tipi, chiave, relazioni, valori mancanti e dialetto.
- Frictionless è JSON semplice, ammette la scrittura in YAML dentro un
  progetto e ha già le categorie e i separatori dei numeri. CSVW porta con sé
  JSON-LD e il `@context` obbligatorio, che servono a pubblicare dati
  collegati, non a scrivere a mano uno schema.
- Nessuna delle due pagine dichiara le dimensioni di una tabella
  multidimensionale né l'unità di misura di un campo: sono aggiunte nostre,
  da decidere quando servono.
