#!/usr/bin/env node
// The command line: one command, `resolve-tree`, that prints the resolved tree as JSON.
import { existsSync, statSync } from 'node:fs';
import { resolveTree, SPEC_VERSION } from './resolve-tree.js';

/** Provisional name of the binary, not decided yet: change it here and in package.json. */
export const BINARY_NAME = 'doc-runtime';

/** Exit codes (§11.1): an error in the tree gives a code other than zero. */
const EXIT_OK = 0;
const EXIT_ERRORS = 1;
const EXIT_USAGE = 2;

const HELP = `${BINARY_NAME} — runtime del documento, spec-version ${SPEC_VERSION} (bozza)

Uso:
  ${BINARY_NAME} resolve-tree <cartella>   stampa il resolved tree in JSON su stdout
  ${BINARY_NAME} --help                    questo aiuto
  ${BINARY_NAME} --version                 la spec-version che il runtime implementa

resolve-tree legge tutti i file della cartella, tranne quelli che cominciano con
un punto, e non scrive niente. L'albero esce sempre, con i diagnostic accanto.

Codici di uscita:
  0  nessun errore (gli avvisi sono ammessi)
  1  l'albero ha almeno un diagnostic con severity "error"
  2  uso sbagliato o cartella che non si legge; il messaggio va su stderr

Output: un oggetto JSON con "nodes", e se non sono vuoti "associations",
"diagnostics" e "document" (docs/specifica.md, §11.3). Ogni diagnostic ha
severity, code, file e, secondo il codice, target e fix; ogni errore ha un fix.
`;

function main(args: string[]): number {
  if (args.length === 0) {
    process.stderr.write(HELP);
    return EXIT_USAGE;
  }
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(HELP);
    return EXIT_OK;
  }
  if (args[0] === '--version') {
    process.stdout.write(`${SPEC_VERSION}\n`);
    return EXIT_OK;
  }
  const [command, folder, ...rest] = args;
  if (command !== 'resolve-tree' || folder === undefined || rest.length > 0) {
    process.stderr.write(`${BINARY_NAME}: uso: ${BINARY_NAME} resolve-tree <cartella> (vedi --help)\n`);
    return EXIT_USAGE;
  }
  if (!existsSync(folder) || !statSync(folder).isDirectory()) {
    process.stderr.write(`${BINARY_NAME}: ${folder} non è una cartella\n`);
    return EXIT_USAGE;
  }
  const tree = resolveTree(folder);
  process.stdout.write(JSON.stringify(tree, null, 2) + '\n');
  return tree.diagnostics?.some((d) => d.severity === 'error') ? EXIT_ERRORS : EXIT_OK;
}

process.exitCode = main(process.argv.slice(2));
