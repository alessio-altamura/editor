# Font e icone dell'app

Solo per l'aspetto dell'`app`: la resa del documento resta quella dei font
del `runtime` (`runtime/fonts/`). Tutto è incorporato e servito dall'`app`,
senza CDN, per la CSP della finestra.

## Inter

Inter 4.1 di Rasmus Andersson, licenza SIL Open Font License 1.1
(`fonts/OFL-Inter.txt`, il `LICENSE.txt` del repository allo stesso tag).
WOFF2 variabili nel peso (100-900) e nella grandezza ottica, tondo e
corsivo. Presi con `git` dal repository ufficiale rsms/inter, tag `v4.1`,
commit e3a3d4c57d5e, cartella `docs/font-files`.

| File | Byte | sha256 |
|---|---|---|
| `InterVariable-Italic.woff2` | 387976 | e564f652916db6c139570fefb9524a77c4d48f30c92928de9db19b6b5c7a262a |
| `InterVariable.woff2` | 352240 | 693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3 |

La direzione «carta» usa per i titoli dell'interfaccia Source Serif 4, già
nel `runtime`.

## Icone Lucide

Le icone di Lucide 1.65.0, licenza ISC (`icons/LICENSE`, dal pacchetto),
prese dal pacchetto npm `lucide-static@1.65.0`
(registry.npmjs.org/lucide-static/-/lucide-static-1.65.0.tgz), cartella
`icons/`: solo quelle che l'`app` usa, senza modifiche. Il renderer le
incorpora nel suo script (`src/renderer/icons.ts`).

| File | sha256 |
|---|---|
| `archive.svg` | f7242055f3e1c90e7c56f48994fc189bf9642b6bff0d38760f14f29abe207a08 |
| `arrow-down.svg` | 1f8adf3fd72b04e8f3dbf75a5e8028f7c074ed6e18cd91ec022fd12596a2f25e |
| `arrow-up.svg` | 130624b17353a284d3902d250ae5e06eeb94a03cb83b3bd7abc44993824f7891 |
| `chevron-down.svg` | 21afe74b7ce0cbfcce3521bbfeeebca21eb8448c87c85954f0c054fda13c3993 |
| `chevron-up.svg` | 3cd3475a93afe2ba93bb376cfd9d9aff3a0036758620b75012649060def8638d |
| `file-code.svg` | ccd16fc79d95cfffc44450e40e180f883da6ca9b56deac15b8a335d2511e83a2 |
| `file-text.svg` | 45f8ab57d5fa01c906cc47bdf7cc420cb4b2258895e8914af3e7d858a3c3ff2a |
| `group.svg` | c736350735792cce815fabb9664a127d2dfd6d495992a1e576b283ac31d98d01 |
| `layout-dashboard.svg` | a142b65b57f7b07befc153e1352ff6b5baad0746b962bb1fd176d9df006ba018 |
| `list-ordered.svg` | e5c7bd4a48b38f520d5acdc63270bb91e6b00243e0a05e2a945e6627eb9f0b76 |
| `list-plus.svg` | b5401d4631b79100b073a969802946f48f587925f426094c70126cfd8d124997 |
| `plus.svg` | 13b0e35b27b768f864a1b5d6128f77b289b3e190a964a4110e48791fb77e83c7 |
| `redo-2.svg` | c8f08b9314f6a7de7d918cbc4b96175c5cf8ed98983581cedfb171a720ff2ab8 |
| `scissors.svg` | d94ac0b5544de02bdc0e0b9310da058941c937eb552acf66c01fda178ebc58fd |
| `table-properties.svg` | 0751c99b1287379b6529cfa3be05a2d5e4b31b688552ffeff92fa1c814bc8d74 |
| `table.svg` | aff672ae047ff2a58a2c60a3c4b38c103e7c6c2e6f60bc6443e1313c4c7daeef |
| `trash-2.svg` | 01f42022d441255477325bcfc5c8839f2ee0ce7f100b7e3df050ae1c70275bfc |
| `undo-2.svg` | 0c448c128c77d8081df56f07161b8d130181aee027de47d00d9d906869155320 |

Per controllare: `sha256sum fonts/*.woff2 icons/*.svg`.
