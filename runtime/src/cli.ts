#!/usr/bin/env node
// The command line: `resolve-tree`, that prints the resolved tree as JSON, and
// `export`, that writes the HTML of an article (§11.4).
import { closeSync, existsSync, openSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeSync } from 'node:fs';
import { basename, dirname, join, relative, resolve as resolvePath, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_FONTS } from './base-stylesheet.js';
import { pageAssets, readAsset } from './assets.js';
import { makeDiagnostic, sortDiagnostics } from './diagnostic.js';
import { writeAll, writeJson } from './json-output.js';
import { listDocumentFiles, resolveTree, SPEC_VERSION } from './resolve-tree.js';
import { ELECTRON_VERSION, printPdf } from './print.js';
import { startLanguageServer } from './language-server.js';
import { serve } from './serve.js';
import { formatFolder } from './format.js';
import { unifiedDiff } from './diff.js';
import { diskWorkspace, evaluate, OperationError, planCreate, planExtract, planMove, planRename, write, type Plan, type Workspace } from './operations.js';
import { planArchive, planArrange, planCompose, planGather, planPlace, planRecall } from './canvas.js';
import { planTurnInto } from './collection-operations.js';
import type { ResolvedTree } from './tree.js';
import { baseFontFace, staticExport, staticExportSize, type ExportAsset } from './static-export.js';
import type { JsonML } from './tree.js';

/** Provisional name of the binary, not decided yet: change it here and in package.json. */
export const BINARY_NAME = 'doc-runtime';

/** Exit codes (§11.1): an error in the tree gives a code other than zero. */
const EXIT_OK = 0;
const EXIT_ERRORS = 1;
const EXIT_USAGE = 2;
/** Provisional: an internal error of the runtime, with the message on stderr. */
const EXIT_INTERNAL = 3;

/** The HTML of an export is written up to 256 MiB (§11.1). */
const MAX_EXPORT_BYTES = 256 * 1024 * 1024;

const HELP = `${BINARY_NAME} — runtime del documento, spec-version ${SPEC_VERSION} (bozza)

Uso:
  ${BINARY_NAME} resolve-tree <cartella> [--pretty] [--positions] [--drawings]
                                         stampa il resolved tree in JSON su stdout,
                                         compatto; --pretty lo indenta; --positions
                                         aggiunge a ogni elemento la sourcePosition;
                                         --drawings il disegno SVG di ogni chart
  ${BINARY_NAME} export <cartella> [--root <id>] [-o <file>] [--allow-errors] [--theme light|dark]
                                         scrive l'HTML di un article su stdout, o nel
                                         file di -o; --root sceglie l'article quando
                                         non è uno solo; senza --theme la pagina ha il
                                         tema chiaro e quello scuro, e segue chi la apre
  ${BINARY_NAME} print <cartella> [--root <id>] [-o <file>] [--allow-errors]
                                         stampa in PDF l'HTML del tema chiaro: A4,
                                         margini di 2 cm, numero di pagina in basso;
                                         serve Electron ${ELECTRON_VERSION}, che npm ci installa
  ${BINARY_NAME} serve <cartella> [--port <n>]
                                         tiene acceso il runtime e mostra l'anteprima
                                         nel browser, su 127.0.0.1, aggiornata a ogni
                                         modifica; l'indirizzo, con il codice
                                         d'accesso, va su stdout; si ferma con Ctrl-C
  ${BINARY_NAME} language-server          il language server (LSP) su stdin e stdout, per
                                         gli editor: diagnostic, completamento degli id,
                                         definizione, hover, riferimenti, rename, estrai
  ${BINARY_NAME} format <cartella> [--check] [--diff]
                                         riscrive i file nella forma canonica e stampa
                                         quelli cambiati; --check non scrive ed esce
                                         con 1 se qualcosa cambierebbe; --diff stampa
                                         le differenze senza scrivere
  ${BINARY_NAME} create <kind> --in <id> [--after <id> | --before <id>] [--text "…"] [--id <id>] [--asset <file>]
  ${BINARY_NAME} create <kind> (--at <x>,<y> | --near <id> [--card <nodo>]) [--text "…"] [--id <id>] [--asset <file>]
  ${BINARY_NAME} extract <file della composition>
  ${BINARY_NAME} rename <id> <nuovo-id>
  ${BINARY_NAME} move <id> --to <file>
  ${BINARY_NAME} recall <id> [--at <x>,<y>]
  ${BINARY_NAME} place <id> [--at <x>,<y>] [--size <larghezza>,<altezza>] [--card <nodo>]
  ${BINARY_NAME} archive <id> [--card <nodo>]
  ${BINARY_NAME} gather <id> [--card <nodo>]
  ${BINARY_NAME} arrange --by kind|tag
  ${BINARY_NAME} compose <id>… --title "…" [--id <id>]
  ${BINARY_NAME} create collection --field <nome>:<tipo>… (--in <id> | --at <x>,<y> | --near <id>)
  ${BINARY_NAME} create chart --collection <id> [--template bar|line|point] [--x <campo>] [--y <campo>] [--series <campo>]
                                         [--in <id> | --at <x>,<y> | --near <id>]
  ${BINARY_NAME} turn-into <id> [--line <riga>] [--type <campo>:<tipo>]… [--key <campo> | --no-key]
                                         le operazioni: scrivono i file, passati dal
                                         formatter, solo se non portano errori nuovi;
                                         stampano un riassunto JSON; con --dry-run
                                         non scrivono e mettono le differenze nel
                                         riassunto; --folder dice la cartella del
                                         documento, altrimenti la più vicina con un
                                         document file. create --at, recall, place e
                                         archive scrivono il canvas file (un documento
                                         senza ne riceve uno, foglio.canvas); un oggetto
                                         può avere più schede, e --card dice quale con
                                         l'id del nodo; quando una scheda si mette, si
                                         crea o si ingrandisce, le altre fanno spazio;
                                         gather porta vicino gli oggetti legati, arrange
                                         mette le schede in gruppi per kind o per tag;
                                         compose fa un article con gli oggetti
                                         nell'ordine dato; create collection fa un
                                         descrittore e un TSV con l'intestazione;
                                         turn-into fa di una tabella di un text o di
                                         uno scratch una collection; create chart fa un
                                         grafico di una collection, accanto a lei se
                                         non ha un posto, con i ruoli che mancano
                                         proposti dai tipi dei campi
  ${BINARY_NAME} --help                    questo aiuto
  ${BINARY_NAME} --version                 la spec-version che il runtime implementa

resolve-tree legge tutti i file della cartella, tranne quelli che cominciano con
un punto, e non scrive niente. L'albero esce sempre, con i diagnostic accanto.

Codici di uscita:
  0  nessun errore (gli avvisi sono ammessi)
  1  l'albero ha almeno un diagnostic con severity "error"
  2  uso sbagliato o cartella che non si legge; il messaggio va su stderr
  3  errore interno del runtime, senza albero; il messaggio va su stderr
     (provvisorio)

Con un errore nell'albero export non scrive niente ed esce con 1; con
--allow-errors scrive l'HTML, con i pezzi mancanti segnati, ed esce con 1. Un
HTML oltre 256 MiB non si scrive mai (export-too-large). Su stderr, con 0 e 1,
export scrive un oggetto JSON con "diagnostics".

Output di resolve-tree: un oggetto JSON con le liste "nodes", "associations" e "diagnostics",
ciascuna solo se non è vuota, e "document" (docs/specifica.md, §11.3). Ogni diagnostic ha
severity, code, file e, secondo il codice, target e fix; ogni errore ha un fix.
`;

function main(args: string[]): number | Promise<number> {
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
  if (args[0] === 'export') return exportCommand(args.slice(1), 'export');
  if (args[0] === 'print') return exportCommand(args.slice(1), 'print');
  if (args[0] === 'serve') return serveCommand(args.slice(1));
  if (args[0] === 'format') return formatCommand(args.slice(1));
  if (['create', 'extract', 'rename', 'move', 'recall', 'place', 'archive', 'gather', 'arrange', 'compose', 'turn-into'].includes(args[0]!)) return operationCommand(args[0]!, args.slice(1));
  if (args[0] === 'language-server') {
    // LSP on stdin and stdout; --stdio, which clients add, changes nothing. It ends with the client's exit.
    if (args.slice(1).some((arg) => arg !== '--stdio')) return usage(`uso: ${BINARY_NAME} language-server`);
    startLanguageServer();
    return new Promise<number>(() => undefined);
  }
  const pretty = args.includes('--pretty');
  const positions = args.includes('--positions');
  const drawings = args.includes('--drawings');
  const [command, folder, ...rest] = args.filter((arg) => arg !== '--pretty' && arg !== '--positions' && arg !== '--drawings');
  if (command !== 'resolve-tree' || folder === undefined || rest.length > 0) {
    process.stderr.write(`${BINARY_NAME}: uso: ${BINARY_NAME} resolve-tree <cartella> (vedi --help)\n`);
    return EXIT_USAGE;
  }
  if (!readableFolder(folder)) return EXIT_USAGE;
  const tree = resolveTree(folder, { positions, drawings });
  // In chunks: a large tree never becomes a single string.
  writeJson(1, tree, pretty ? 2 : 0);
  return tree.diagnostics?.some((d) => d.severity === 'error') ? EXIT_ERRORS : EXIT_OK;
}

function readableFolder(folder: string): boolean {
  if (!existsSync(folder) || !statSync(folder).isDirectory()) {
    process.stderr.write(`${BINARY_NAME}: ${folder} non è una cartella\n`);
    return false;
  }
  try {
    readdirSync(folder);
  } catch {
    process.stderr.write(`${BINARY_NAME}: la cartella ${folder} non si legge\n`);
    return false;
  }
  return true;
}

function usage(message: string): number {
  process.stderr.write(`${BINARY_NAME}: ${message}\n`);
  return EXIT_USAGE;
}

/** Reads a file of the folder as text; null when it is not UTF-8 or does not read. */
function readSource(folder: string, file: string): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(join(folder, file)));
  } catch {
    return null;
  }
}

/** `format` (§11.8): writes the canonical form; --check and --diff write nothing. */
function formatCommand(args: string[]): number {
  const syntax = `uso: ${BINARY_NAME} format <cartella> [--check] [--diff]`;
  const check = args.includes('--check');
  const diff = args.includes('--diff');
  const rest = args.filter((arg) => arg !== '--check' && arg !== '--diff');
  if (rest.length !== 1 || rest[0]!.startsWith('-')) return usage(syntax);
  const folder = rest[0]!;
  if (!readableFolder(folder)) return EXIT_USAGE;
  const { changes, kept } = formatFolder(folder, listDocumentFiles(folder).keys(), (file) => readSource(folder, file));
  for (const file of kept) process.stderr.write(`${BINARY_NAME}: ${file} resta com'è: la forma canonica cambierebbe il resolved tree\n`);
  for (const [file, { before, after }] of changes) {
    if (diff) writeAll(1, unifiedDiff(file, before, after));
    else process.stdout.write(`${file}\n`);
  }
  if (check || diff) return check && changes.size > 0 ? EXIT_ERRORS : EXIT_OK;
  for (const [file, { after }] of changes) {
    if (!writeFileAtomically(join(folder, file), [after])) return EXIT_USAGE;
  }
  return EXIT_OK;
}

/** The folder of the document: the nearest one, from `start` up, with a document file. */
function documentFolderFrom(start: string): string | null {
  for (let folder = resolvePath(start); ; folder = dirname(folder)) {
    try {
      if (readdirSync(folder).some((name) => name.endsWith('.document.md'))) return folder;
    } catch {
      // Not readable: go on up.
    }
    if (dirname(folder) === folder) return null;
  }
}

/** The operations (§11.9): a plan, checked, then written; --dry-run only prints it. */
function operationCommand(command: string, args: string[]): number {
  const syntax: Record<string, string> = {
    create: `${BINARY_NAME} create <kind> (--in <id> [--after <id> | --before <id>] | --at <x>,<y> | --near <id> [--card <nodo>]) [--text "…"] [--id <id>] [--asset <file>]`,
    extract: `${BINARY_NAME} extract <file della composition>`,
    rename: `${BINARY_NAME} rename <id> <nuovo-id>`,
    move: `${BINARY_NAME} move <id> --to <file>`,
    recall: `${BINARY_NAME} recall <id> [--at <x>,<y>]`,
    place: `${BINARY_NAME} place <id> [--at <x>,<y>] [--size <larghezza>,<altezza>] [--card <nodo>]`,
    archive: `${BINARY_NAME} archive <id> [--card <nodo>]`,
    gather: `${BINARY_NAME} gather <id> [--card <nodo>]`,
    arrange: `${BINARY_NAME} arrange --by kind|tag`,
    compose: `${BINARY_NAME} compose <id>… --title "…" [--id <id>]`,
    'turn-into': `${BINARY_NAME} turn-into <id> [--line <riga>] [--type <campo>:<tipo>]… [--key <campo> | --no-key]`,
  };
  const options = new Map<string, string>();
  const positional: string[] = [];
  let dryRun = false;
  let noKey = false;
  /** --field nome:tipo and --type campo:tipo may be repeated. */
  const repeated = new Map<string, string[]>([['--field', []], ['--type', []]]);
  const valued = ['--in', '--after', '--before', '--text', '--id', '--asset', '--to', '--folder', '--at', '--title', '--card', '--near', '--size', '--by', '--line', '--key', '--collection', '--template', '--x', '--y', '--series'];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--no-key') noKey = true;
    else if (repeated.has(arg)) {
      const value = args[++i];
      if (value === undefined || !/^[^:]+:[a-z]+$/.test(value)) return usage(`${arg} vuole <nome>:<tipo>, per esempio mese:string`);
      repeated.get(arg)!.push(value);
    } else if (valued.includes(arg)) {
      const value = args[++i];
      if (value === undefined || options.has(arg)) return usage(`uso: ${syntax[command]} [--dry-run] [--folder <cartella>]`);
      options.set(arg, value);
    } else if (arg.startsWith('--')) return usage(`uso: ${syntax[command]} [--dry-run] [--folder <cartella>]`);
    else positional.push(arg);
  }
  const wanted = { create: 1, extract: 1, rename: 2, move: 1, recall: 1, place: 1, archive: 1, gather: 1, arrange: 0, compose: positional.length, 'turn-into': 1 }[command as 'create'];
  if (positional.length !== wanted || (options.has('--after') && options.has('--before'))) return usage(`uso: ${syntax[command]} [--dry-run] [--folder <cartella>]`);
  // A place on the canvas: two integers, x and y, as JSON Canvas writes them.
  let at: { x: number; y: number } | undefined;
  if (options.has('--at')) {
    const match = /^(-?\d+),(-?\d+)$/.exec(options.get('--at')!);
    if (!match) return usage(`--at vuole <x>,<y>, due interi: ${options.get('--at')}`);
    at = { x: Number(match[1]), y: Number(match[2]) };
  }
  let size: { width: number; height: number } | undefined;
  if (options.has('--size')) {
    const match = /^(\d+),(\d+)$/.exec(options.get('--size')!);
    if (!match || Number(match[1]) === 0 || Number(match[2]) === 0) return usage(`--size vuole <larghezza>,<altezza>, due interi positivi: ${options.get('--size')}`);
    size = { width: Number(match[1]), height: Number(match[2]) };
  }
  // The folder: --folder, else the nearest with a document file, from the file of extract or from here.
  const folder = options.get('--folder') ?? documentFolderFrom(command === 'extract' ? dirname(resolvePath(positional[0]!)) : process.cwd());
  if (folder === null) return usage('non trovo la cartella del documento: dilla con --folder <cartella>');
  if (!readableFolder(folder)) return EXIT_USAGE;
  const workspace: Workspace = diskWorkspace(folder, () => [...listDocumentFiles(folder).keys()]);
  const tree: ResolvedTree = resolveTree(folder, { positions: true });
  let plan: Plan;
  try {
    if (command === 'create') {
      // A chart may have no place: it goes next to its collection (class 3).
      const places = [options.has('--in'), at !== undefined, options.has('--near')].filter(Boolean).length;
      if (places > 1 || (places === 0 && positional[0] !== 'chart')) return usage(`uso: ${syntax.create}`);
      plan = planCreate(workspace, tree, {
        kind: positional[0]!,
        ...(options.has('--in') ? { into: options.get('--in')! } : {}),
        ...(at !== undefined ? { at } : {}),
        ...(options.has('--near') ? { near: { id: options.get('--near')!, ...(options.has('--card') ? { card: options.get('--card')! } : {}) } } : {}),
        ...(repeated.get('--field')!.length > 0 ? { fields: repeated.get('--field')!.map((pair) => ({ name: pair.slice(0, pair.lastIndexOf(':')), type: pair.slice(pair.lastIndexOf(':') + 1) })) } : {}),
        ...(options.has('--after') ? { after: options.get('--after')! } : {}),
        ...(options.has('--before') ? { before: options.get('--before')! } : {}),
        ...(options.has('--text') ? { text: options.get('--text')! } : {}),
        ...(options.has('--id') ? { id: options.get('--id')! } : {}),
        ...(options.has('--asset') ? { asset: options.get('--asset')! } : {}),
        ...Object.fromEntries((['collection', 'template', 'x', 'y', 'series'] as const).filter((key) => options.has(`--${key}`)).map((key) => [key, options.get(`--${key}`)!])),
      });
    } else if (command === 'extract') {
      const file = relative(resolvePath(folder), resolvePath(positional[0]!)).split(sep).join('/');
      plan = planExtract(workspace, tree, file);
    } else if (command === 'rename') plan = planRename(workspace, tree, positional[0]!, positional[1]!);
    else if (command === 'recall') plan = planRecall(workspace, tree, positional[0]!, at);
    else if (command === 'place') {
      if (at === undefined && size === undefined) return usage(`uso: ${syntax.place}`);
      plan = planPlace(workspace, tree, positional[0]!, at, options.get('--card'), size);
    } else if (command === 'gather') plan = planGather(workspace, tree, positional[0]!, options.get('--card'));
    else if (command === 'turn-into') {
      if (noKey && options.has('--key')) return usage(`uso: ${syntax['turn-into']}`);
      const line = options.get('--line');
      if (line !== undefined && !/^[1-9]\d*$/.test(line)) return usage('--line vuole un numero di riga, da 1');
      plan = planTurnInto(workspace, tree, positional[0]!, {
        ...(line !== undefined ? { line: Number(line) } : {}),
        types: Object.fromEntries(repeated.get('--type')!.map((pair) => [pair.slice(0, pair.lastIndexOf(':')), pair.slice(pair.lastIndexOf(':') + 1)])),
        ...(options.has('--key') ? { key: options.get('--key')! } : {}),
        noKey,
      });
    } else if (command === 'arrange') {
      if (!['kind', 'tag'].includes(options.get('--by') ?? '')) return usage(`uso: ${syntax.arrange}`);
      plan = planArrange(workspace, tree, options.get('--by') as 'kind' | 'tag');
    } else if (command === 'archive') plan = planArchive(workspace, tree, positional[0]!, options.get('--card'));
    else if (command === 'compose') {
      if (!options.has('--title') || positional.length === 0) return usage(`uso: ${syntax.compose}`);
      plan = planCompose(workspace, tree, { ids: positional, title: options.get('--title')!, ...(options.has('--id') ? { id: options.get('--id')! } : {}) });
    } else {
      if (!options.has('--to')) return usage(`uso: ${syntax.move}`);
      plan = planMove(workspace, tree, positional[0]!, options.get('--to')!);
    }
  } catch (error) {
    if (error instanceof OperationError) return usage(error.message);
    throw error;
  }
  const outcome = evaluate(workspace, plan);
  if (outcome.newErrors.length > 0) {
    // New errors: nothing is written.
    writeAll(2, JSON.stringify({ diagnostics: outcome.newErrors }) + '\n');
    return EXIT_ERRORS;
  }
  const files = [...outcome.files];
  const summary = {
    operation: plan.operation,
    ...plan.summary,
    written: files.filter(([, text]) => text !== null).map(([file]) => file).sort(),
    deleted: files.filter(([, text]) => text === null).map(([file]) => file).sort(),
    copied: outcome.copies.map((copy) => copy.to),
    ...(dryRun ? { dryRun: true, diff: outcome.diff } : {}),
  };
  if (!dryRun && !write(folder, outcome, (path, text) => writeFileAtomically(path, [text]))) return EXIT_USAGE;
  writeAll(1, JSON.stringify(summary) + '\n');
  // What an operation lost on the way, as turn-into with formatting in the cells: it warns and goes on.
  for (const warning of (plan.summary.warnings as Array<{ code: string; message: string }> | undefined) ?? []) writeAll(2, `avviso ${warning.code}: ${warning.message}\n`);
  return EXIT_OK;
}

/** `serve`: on until Ctrl-C; the address with its access code goes on stdout, the times on stderr. */
function serveCommand(args: string[]): number | Promise<number> {
  const syntax = `uso: ${BINARY_NAME} serve <cartella> [--port <n>]`;
  let folder: string | undefined;
  let port = 0;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--port') {
      const value = args[++i] ?? '';
      if (!/^[0-9]{1,5}$/.test(value) || Number(value) > 65535) return usage(`--port vuole un numero da 0 a 65535 (vedi --help)`);
      port = Number(value);
    } else if (arg.startsWith('-') || folder !== undefined) return usage(syntax);
    else folder = arg;
  }
  if (folder === undefined) return usage(syntax);
  if (!readableFolder(folder)) return EXIT_USAGE;
  return new Promise<number>((resolve) => {
    serve({ folder: folder!, port, log: (line) => process.stderr.write(`${BINARY_NAME}: ${line}\n`) }).then(
      ({ url, close }) => {
        process.stdout.write(`${url}\n`);
        const stop = () => void close().then(() => resolve(EXIT_OK));
        process.once('SIGINT', stop);
        process.once('SIGTERM', stop);
      },
      (error: NodeJS.ErrnoException) => resolve(usage(`non posso ascoltare sulla porta ${port}: ${error.code ?? error.message}`)),
    );
  });
}

/** The files of the base fonts, next to the package (fonts/). */
function readBaseFonts(): Map<string, Uint8Array> {
  const folder = fileURLToPath(new URL('../../fonts/', import.meta.url));
  const fonts = new Map<string, Uint8Array>();
  for (const family of Object.values(BASE_FONTS)) {
    for (const file of [family.normal, family.italic]) fonts.set(file, readFileSync(join(folder, file)));
  }
  return fonts;
}

/** `export` writes the HTML; `print` prints the HTML of the light theme to PDF (§11.4, §11.5). */
function exportCommand(args: string[], command: 'export' | 'print'): number | Promise<number> {
  const syntax = command === 'export'
    ? `uso: ${BINARY_NAME} export <cartella> [--root <id>] [-o <file>] [--allow-errors] [--theme light|dark]`
    : `uso: ${BINARY_NAME} print <cartella> [--root <id>] [-o <file>] [--allow-errors]`;
  let folder: string | undefined;
  let rootId: string | undefined;
  let output: string | undefined;
  let allowErrors = false;
  let theme: 'light' | 'dark' | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--allow-errors') allowErrors = true;
    else if (arg === '--root' || arg === '-o' || (arg === '--theme' && command === 'export')) {
      const value = args[++i];
      if (value === undefined) return usage(`${arg} vuole un valore (vedi --help)`);
      if (arg === '--root') rootId = value;
      else if (arg === '-o') output = value;
      else if (value === 'light' || value === 'dark') theme = value;
      else return usage(`--theme vuole light o dark, non ${value}`);
    } else if (arg.startsWith('-') || folder !== undefined) return usage(syntax);
    else folder = arg;
  }
  if (folder === undefined) return usage(syntax);
  if (!readableFolder(folder)) return EXIT_USAGE;

  const tree = resolveTree(folder, { drawings: true });
  const articles = (tree.nodes ?? []).filter((node) => node.kind === 'article' && node.directive !== true);
  const names = articles.map((node) => node.id ?? node.file).join(', ') || 'nessuno';
  const chosen = rootId === undefined ? articles : articles.filter((node) => node.id === rootId);
  if (chosen.length !== 1) {
    if (rootId === undefined) return usage(`la cartella ha ${articles.length} article (${names}): scegline uno con --root <id>`);
    return usage(`${rootId} non è l'id di un solo article; gli article sono: ${names}`);
  }
  const article = chosen[0]!;
  if (article.id === undefined) return usage(`l'article ${article.file} non ha un id`);

  // Every image of the page, read once per path.
  const listed = listDocumentFiles(folder);
  const page = pageAssets(tree, article, (path) => readAsset(folder, path, listed));
  const assets = page.assets;
  const diagnostics = [...(tree.diagnostics ?? []), ...page.diagnostics];
  const hasErrors = diagnostics.some((d) => d.severity === 'error');
  const finish = (code: number) => {
    writeAll(2, JSON.stringify({ diagnostics: sortDiagnostics(diagnostics) }) + '\n');
    return code;
  };
  if (hasErrors && !allowErrors) return finish(EXIT_ERRORS);

  const fonts = readBaseFonts();
  // The PDF is always in the light theme (§11.5).
  if (command === 'print') theme = 'light';
  const options = theme === undefined ? { allowErrors, fonts } : { allowErrors, theme, fonts };
  if (staticExportSize(tree, article.id, assets, options) > MAX_EXPORT_BYTES) {
    diagnostics.push(makeDiagnostic('export-too-large', article.file, undefined, 'riduci le immagini o le loro inclusioni'));
    return finish(EXIT_ERRORS);
  }
  if (command === 'print') {
    const html = [...staticExport(tree, article.id, assets, options)].join('');
    return printPdf(html, baseFontFace('serif', 'normal', fonts)).then((result) => {
      if ('browserError' in result) return usage(result.browserError);
      if (output === undefined) writeAll(1, result.pdf);
      else if (!writeFileAtomically(output, [result.pdf])) return EXIT_USAGE;
      return finish(hasErrors ? EXIT_ERRORS : EXIT_OK);
    });
  }
  if (output === undefined) {
    for (const piece of staticExport(tree, article.id, assets, options)) writeAll(1, piece);
  } else if (!writeFileAtomically(output, staticExport(tree, article.id, assets, options))) {
    return EXIT_USAGE;
  }
  return finish(hasErrors ? EXIT_ERRORS : EXIT_OK);
}

/** Writes to a temporary file in the same folder, then renames it; false, with a message, when it cannot. */
function writeFileAtomically(path: string, pieces: Iterable<string | Uint8Array>): boolean {
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.tmp`);
  let fd: number;
  try {
    fd = openSync(temporary, 'wx', 0o644);
  } catch (error) {
    usage(`non posso scrivere ${path}: ${(error as Error).message}`);
    return false;
  }
  try {
    for (const piece of pieces) {
      const buffer = typeof piece === 'string' ? Buffer.from(piece, 'utf8') : piece;
      for (let offset = 0; offset < buffer.length; ) offset += writeSync(fd, buffer, offset);
    }
    closeSync(fd);
    renameSync(temporary, path);
    return true;
  } catch (error) {
    try {
      closeSync(fd);
    } catch {
      // Already closed.
    }
    try {
      unlinkSync(temporary);
    } catch {
      // Nothing to remove.
    }
    usage(`non posso scrivere ${path}: ${(error as Error).message}`);
    return false;
  }
}

const internal = (error: unknown) => {
  process.stderr.write(`${BINARY_NAME}: errore interno: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = EXIT_INTERNAL;
};
try {
  const code = main(process.argv.slice(2));
  if (typeof code === 'number') process.exitCode = code;
  else code.then((value) => (process.exitCode = value), internal);
} catch (error) {
  internal(error);
}
