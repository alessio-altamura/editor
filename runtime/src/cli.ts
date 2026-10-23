#!/usr/bin/env node
// The command line: `resolve-tree`, that prints the resolved tree as JSON, and
// `export`, that writes the HTML of an article (§11.4).
import { closeSync, existsSync, openSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_FONTS } from './base-stylesheet.js';
import { readAsset } from './assets.js';
import { makeDiagnostic, sortDiagnostics } from './diagnostic.js';
import { writeAll, writeJson } from './json-output.js';
import { listDocumentFiles, resolveTree, SPEC_VERSION } from './resolve-tree.js';
import { CHROMIUM_VERSION, printPdf } from './print.js';
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
  ${BINARY_NAME} resolve-tree <cartella> [--pretty] [--positions]
                                         stampa il resolved tree in JSON su stdout,
                                         compatto; --pretty lo indenta; --positions
                                         aggiunge a ogni elemento la sourcePosition
  ${BINARY_NAME} export <cartella> [--root <id>] [-o <file>] [--allow-errors] [--theme light|dark]
                                         scrive l'HTML di un article su stdout, o nel
                                         file di -o; --root sceglie l'article quando
                                         non è uno solo; senza --theme la pagina ha il
                                         tema chiaro e quello scuro, e segue chi la apre
  ${BINARY_NAME} print <cartella> [--root <id>] [-o <file>] [--allow-errors]
                                         stampa in PDF l'HTML del tema chiaro: A4,
                                         margini di 2 cm, numero di pagina in basso;
                                         serve Chromium ${CHROMIUM_VERSION}
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
  const pretty = args.includes('--pretty');
  const positions = args.includes('--positions');
  const [command, folder, ...rest] = args.filter((arg) => arg !== '--pretty' && arg !== '--positions');
  if (command !== 'resolve-tree' || folder === undefined || rest.length > 0) {
    process.stderr.write(`${BINARY_NAME}: uso: ${BINARY_NAME} resolve-tree <cartella> (vedi --help)\n`);
    return EXIT_USAGE;
  }
  if (!readableFolder(folder)) return EXIT_USAGE;
  const tree = resolveTree(folder, { positions });
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

/** The embeds of images in a content, in reading order. */
function imageEmbeds(content: JsonML[]): Array<Record<string, unknown>> {
  const found: Array<Record<string, unknown>> = [];
  const stack = [...content].reverse();
  while (stack.length > 0) {
    const item = stack.pop()!;
    if (typeof item === 'string') continue;
    const attributes = item[1] !== null && typeof item[1] === 'object' && !Array.isArray(item[1]) ? (item[1] as Record<string, unknown>) : null;
    if (item[0] === 'embed' && attributes?.kind === 'image' && attributes.unresolved !== true) found.push(attributes);
    const children = item.slice(attributes ? 2 : 1) as JsonML[];
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]!);
  }
  return found;
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

  const tree = resolveTree(folder);
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
  const diagnostics = [...(tree.diagnostics ?? [])];
  const listed = listDocumentFiles(folder);
  const assets = new Map<string, ExportAsset>();
  const reported = new Set<string>();
  for (const embed of imageEmbeds(article.content ?? [])) {
    if (typeof embed.asset !== 'string') continue;
    let asset = assets.get(embed.asset);
    if (asset === undefined) {
      asset = readAsset(folder, embed.asset, listed);
      assets.set(embed.asset, asset);
    }
    if (!('fallback' in asset)) continue;
    const image = tree.nodes?.find((node) => node.id === embed.id && node.kind === 'image');
    if (image && !reported.has(image.file)) {
      reported.add(image.file);
      diagnostics.push(makeDiagnostic('asset-unsupported', image.file, String(image.attributes?.asset ?? embed.asset)));
    }
  }
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
