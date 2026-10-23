# I font di partenza

I tre font che il `runtime` porta per le famiglie generiche (specifica §0.5,
`base fonts` nel glossario): Source Serif 4 per `serif`, Source Sans 3 per
`sans-serif`, Source Code Pro per `monospace`, di Adobe, con licenza SIL Open
Font License 1.1 (i testi accanto: `OFL-*.md`). Sono WOFF2 variabili nel peso,
da 200 a 900 (Source Serif 4 anche nella grandezza ottica, `opsz` da 8 a 60),
un file per il tondo e uno per il corsivo. Coprono l'italiano.

Presi dai tag di rilascio dei repository ufficiali su GitHub, con `git`
(le pagine delle release non erano raggiungibili da qui): gli stessi file
pubblicati nelle release, nella cartella WOFF2 del tag.

| File | Repository, tag e commit | Byte | sha256 |
|---|---|---|---|
| `SourceSerif4Variable-Roman.ttf.woff2` | adobe-fonts/source-serif `4.005R`, 2823e993c53f | 429100 | 940a76eda1388de39d38c8e7a79bf6ea058a387faee0a9f33c8d25c6ba05e1be |
| `SourceSerif4Variable-Italic.ttf.woff2` | adobe-fonts/source-serif `4.005R`, 2823e993c53f | 346688 | 9d28b5749a1ad096a295cb607c521bd1af4cd9979b6f37332daf70143149fb44 |
| `SourceSans3VF-Upright.ttf.woff2` | adobe-fonts/source-sans `3.052R`, ed1808970eb3 | 170188 | 5f16566f7a40d39b339ad26be151fa5a1ab1f0c2574c7a2e619765584a1acbd8 |
| `SourceSans3VF-Italic.ttf.woff2` | adobe-fonts/source-sans `3.052R`, ed1808970eb3 | 137996 | b4959abc0569392f87c6c6ac612f90e3fe0104d283724189b7d8b6f61af347d3 |
| `SourceCodeVF-Upright.ttf.woff2` | adobe-fonts/source-code-pro `2.042R-u/1.062R-i/1.026R-vf`, d3f1a5962cde | 90124 | d95dc751b4d82141259f5c00c9838addaadd3b4eac30dd7db4a0da4921d77792 |
| `SourceCodeVF-Italic.ttf.woff2` | adobe-fonts/source-code-pro `2.042R-u/1.062R-i/1.026R-vf`, d3f1a5962cde | 75316 | 720e47a2e54568db2908bfbb32894c1c298fd948cc8942426987c2d29f7ebd9e |

Le licenze sono il `LICENSE.md` di ciascun repository allo stesso tag:
`OFL-SourceSerif4.md`, `OFL-SourceSans3.md`, `OFL-SourceCodePro.md`. Il nome
«Source» è un Reserved Font Name: un font modificato, per esempio ridotto ai
soli caratteri usati, non può chiamarsi così.

Per controllare: `sha256sum *.woff2`.
