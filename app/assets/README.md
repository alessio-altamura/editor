# Font e icone dell'app

Solo per l'aspetto dell'`app`: la resa del documento resta quella dei font
del `runtime` (`runtime/fonts/`). Tutto è incorporato e servito dall'`app`,
senza CDN, per la CSP della finestra.

## Figtree e Petrona

Figtree per l'interfaccia, Petrona per il testo scritto negli oggetti
nell'editor (`docs/ricerca/caratteri-app.md`). Tutti e due con licenza SIL
Open Font License 1.1 (`fonts/OFL-Figtree.txt`, `fonts/OFL-Petrona.txt`,
gli `OFL.txt` delle loro cartelle). Presi con `git` da google/fonts,
commit 6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec, cartelle `ofl/figtree` e
`ofl/petrona`, e convertiti in WOFF2 con fontTools senza altre modifiche:
variabili nel peso (Figtree 300-900, Petrona 100-900).

| Originale | Byte | sha256 |
|---|---|---|
| `ofl/figtree/Figtree[wght].ttf` | 62712 | 26ad3db9b31ff7dde67a91ff515d022d2f495cd506590699cf264f0bfe6fb714 |
| `ofl/petrona/Petrona[wght].ttf` | 218572 | 0ede77fbf726541cf93ece7b721a7b069f004cb413ab205f74963560015ab075 |
| `ofl/petrona/Petrona-Italic[wght].ttf` | 230176 | f4ad599093d29a668e2f945e027b47baee8476647d92bc8c23a89b0f86c08078 |

| File | Byte | sha256 |
|---|---|---|
| `Figtree-wght.woff2` | 27644 | 857d19c9aa38187b1d8806b62f26d54118a9e9536e215b42ce93f0a0eee4f2f3 |
| `Petrona-wght.woff2` | 86332 | 2e672a7dee027d0efb3a2150f925876b64cbf3eed4236cc98d086fe3a3fa18d3 |
| `Petrona-Italic-wght.woff2` | 94572 | 2e28d94bdb101456b3df81e5dbf6930a5d4525a31b2272a1a27be5e00eee1b40 |

## Icone Lucide

Le icone di Lucide 1.65.0, licenza ISC (`icons/LICENSE`, dal pacchetto),
prese dal pacchetto npm `lucide-static@1.65.0`
(registry.npmjs.org/lucide-static/-/lucide-static-1.65.0.tgz), cartella
`icons/`: solo quelle che l'`app` usa, senza modifiche. Il renderer le
incorpora nel suo script (`src/renderer/icons.ts`).

| File | sha256 |
|---|---|
| `app-window.svg` | f4f2d016719ec3a094120e5a3a8deb28c5a3564bdf2226c764277086f4c262b8 |
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
| `panel-right.svg` | 4b2ac54ff674e8774c24f8e076f257634d496fbbc0a28484834316c02e65c68d |
| `plus.svg` | 13b0e35b27b768f864a1b5d6128f77b289b3e190a964a4110e48791fb77e83c7 |
| `redo-2.svg` | c8f08b9314f6a7de7d918cbc4b96175c5cf8ed98983581cedfb171a720ff2ab8 |
| `scissors.svg` | d94ac0b5544de02bdc0e0b9310da058941c937eb552acf66c01fda178ebc58fd |
| `table-properties.svg` | 0751c99b1287379b6529cfa3be05a2d5e4b31b688552ffeff92fa1c814bc8d74 |
| `table.svg` | aff672ae047ff2a58a2c60a3c4b38c103e7c6c2e6f60bc6443e1313c4c7daeef |
| `trash-2.svg` | 01f42022d441255477325bcfc5c8839f2ee0ce7f100b7e3df050ae1c70275bfc |
| `undo-2.svg` | 0c448c128c77d8081df56f07161b8d130181aee027de47d00d9d906869155320 |

Per controllare: `sha256sum fonts/*.woff2 icons/*.svg`.
