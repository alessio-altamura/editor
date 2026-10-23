# Il client per VS Code

Il client del language server di `doc-runtime` (specifica §11.7): avvia
`doc-runtime language-server` e gli passa i file Markdown e CSS della
cartella del documento. Mostra i diagnostic mentre si scrive, completa gli
`id` dopo `[[` e `![[`, porta alla definizione di un `[[id]]`, ne mostra il
`kind` e il titolo al passaggio del mouse, con il valore delle righe di
calcolo, e trova chi include o collega un oggetto. Non scrive file.

Si attiva in una cartella che contiene un `document file` (`*.document.md`).

## Costruire il pacchetto

Serve Node 22.

```
cd editors/vscode
npm ci
npm run package
```

Esce `doc-runtime-client.vsix`. Si installa con:

```
code --install-extension doc-runtime-client.vsix
```

## Il comando del server

L'impostazione `docRuntime.path` dice come lanciare il server: il comando
`doc-runtime` (il valore predefinito, se è nel PATH, per esempio dopo `npm
link` in `runtime/`), oppure il percorso di `runtime/dist/src/cli.js`, che il
client lancia con `node`.

## Dipendenze

`vscode-languageclient` 10.1.2 (MIT), con dipendenze MIT e ISC, tranne
`minimatch` (Blue Oak Model License 1.0.0, permissiva, simile alla MIT). Per lo
sviluppo `typescript` 5.9.3 (Apache-2.0), `@types/vscode` 1.91.0 e
`@types/node` 22.20.5 (MIT), `@vscode/vsce` 4.0.0 (MIT). `engines.vscode`
è `^1.91.0`, come chiede `vscode-languageclient`.
