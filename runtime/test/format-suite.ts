// The formatter suite: on every example of the spec and every export fixture, format
// writes the canonical form once, a second format changes nothing, and the resolved
// tree stays the same; --check and --diff write nothing.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { extractExamples, writeExample } from './conformance-suite.js';
import { canonicalJson, formatFolder } from '../src/format.js';
import { listDocumentFiles, resolveTree } from '../src/resolve-tree.js';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '../..');
const cliPath = join(packageRoot, 'dist/src/cli.js');
const run = (...args: string[]) => spawnSync(process.execPath, [cliPath, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });

/** Every file of a folder and its bytes, to see that nothing was written. */
function snapshot(folder: string, prefix = ''): Map<string, string> {
  const files = new Map<string, string>();
  for (const name of readdirSync(join(folder, prefix))) {
    const path = join(prefix, name);
    if (statSync(join(folder, path)).isDirectory()) for (const [k, v] of snapshot(folder, path)) files.set(k, v);
    else files.set(path, readFileSync(join(folder, path), 'latin1'));
  }
  return files;
}

function checkFolder(folder: string): string[] {
  const problems: string[] = [];
  const tree = JSON.parse(run('resolve-tree', folder).stdout) as unknown;
  const before = snapshot(folder);
  const check = run('format', folder, '--check');
  const diff = run('format', folder, '--diff');
  if (!isDeepStrictEqual(snapshot(folder), before)) problems.push('--check or --diff wrote');
  const changing = check.stdout.split('\n').filter(Boolean);
  if (check.status !== (changing.length > 0 ? 1 : 0)) problems.push(`--check exit ${check.status} with ${changing.length} files`);
  if (changing.some((file) => !diff.stdout.includes(`--- a/${file}\n+++ b/${file}\n`))) problems.push('--diff misses a file');
  const first = run('format', folder);
  if (first.status !== 0 || first.stderr !== '') problems.push(`format: ${first.status} ${first.stderr}`);
  if (first.stdout !== check.stdout) problems.push('format and --check disagree on the files');
  const changed = [...snapshot(folder)].filter(([file, bytes]) => before.get(file) !== bytes).map(([file]) => file).sort();
  if (changed.join() !== changing.map((f) => f.split('/').join('/')).sort().join()) problems.push(`written ${changed.join()} vs ${changing.join()}`);
  if (!isDeepStrictEqual(JSON.parse(run('resolve-tree', folder).stdout), tree)) problems.push('the resolved tree changed');
  const again = run('format', folder, '--check');
  if (again.status !== 0 || again.stdout !== '') problems.push(`not idempotent: ${again.stdout.trim()}`);
  return problems;
}

let failed = 0;
const base = mkdtempSync(join(tmpdir(), 'format-'));
try {
  const examples = extractExamples(readFileSync(join(packageRoot, '../docs/specifica.md'), 'utf8'));
  let changedExamples = 0;
  for (const example of examples) {
    const folder = mkdtempSync(join(base, `example-${example.number}-`));
    writeExample(example, folder);
    // In process, for speed: the cli is checked on the fixtures below.
    const problems: string[] = [];
    const read = (file: string) => {
      try {
        return readFileSync(join(folder, file), 'utf8');
      } catch {
        return null;
      }
    };
    const tree = canonicalJson(resolveTree(folder));
    const first = formatFolder(folder, listDocumentFiles(folder).keys(), read);
    if (first.kept.length > 0) problems.push(`kept as written: ${first.kept.join(', ')}`);
    if (first.changes.size > 0) changedExamples++;
    for (const [file, { after }] of first.changes) writeFileSync(join(folder, file), after);
    if (canonicalJson(resolveTree(folder)) !== tree) problems.push('the resolved tree changed');
    const second = formatFolder(folder, listDocumentFiles(folder).keys(), read);
    if (second.changes.size > 0) problems.push(`not idempotent: ${[...second.changes.keys()].join(', ')}`);
    if (problems.length > 0) {
      failed++;
      console.log(`FAIL example ${example.number}\n  ${problems.join('\n  ')}`);
    }
  }
  console.log(`ok   ${examples.length - failed} examples: format is idempotent and keeps the tree (${changedExamples} not canonical before)`);
  const fixtures = join(packageRoot, 'test/fixtures/export');
  for (const name of readdirSync(fixtures)) {
    const folder = join(base, name);
    cpSync(join(fixtures, name), folder, { recursive: true });
    const problems = checkFolder(folder);
    if (problems.length > 0) {
      failed++;
      console.log(`FAIL fixture ${name}\n  ${problems.join('\n  ')}`);
    } else console.log(`ok   fixture ${name}`);
  }
  // The canonical forms the spec asks for, on one file each.
  {
    const problems: string[] = [];
    const folder = join(base, 'forme');
    cpSync(join(fixtures, 'esempio-34'), folder, { recursive: true });
    const write = (file: string, text: string) => writeFileSync(join(folder, file), text);
    write('nota.text.md', '﻿---\r\nkind: text\r\nid: nota\r\nanno: 2026\r\n---\r\nUn testo.\r\n\r\n\r\n');
    write('note.text.md', '---\nkind: text\n---\n{lang=it  .b .a #prima title="x y" tags="q3 vendite"}\n\n\n\nPrimo.\n\n\n{#seconda}\n\nSecondo.');
    write('righe.chapter.md', '---\nid: righe\nkind: chapter\n---\n![[calo-q3-sintesi]]\n***\n![[calo-q3-sintesi]]\n\n___\n\n\n![[calo-q3-sintesi]]');
    run('format', folder);
    const read = (file: string) => readFileSync(join(folder, file), 'utf8');
    const want: Record<string, string> = {
      'nota.text.md': '---\nid: nota\nkind: text\ntags: []\nanno: "2026"\n---\nUn testo.\n',
      'note.text.md': '---\nkind: text\n---\n{#prima .b .a tags="q3 vendite" lang=it title="x y"}\n\nPrimo.\n\n{#seconda}\n\nSecondo.\n',
      'righe.chapter.md': '---\nid: righe\nkind: chapter\ntags: []\n---\n![[calo-q3-sintesi]]\n\n---\n\n![[calo-q3-sintesi]]\n\n---\n\n![[calo-q3-sintesi]]\n',
    };
    for (const [file, text] of Object.entries(want)) if (read(file) !== text) problems.push(`${file}:\n${JSON.stringify(read(file))}\n  expected ${JSON.stringify(text)}`);
    if (problems.length > 0) {
      failed++;
      console.log(`FAIL canonical forms\n  ${problems.join('\n  ')}`);
    } else console.log('ok   canonical forms: header, attribute line, blank lines, thematic breaks, encoding');
  }
} finally {
  rmSync(base, { recursive: true, force: true });
}
console.log(failed === 0 ? '\nformat suite: all pass' : `\nformat suite: ${failed} failed`);
if (failed > 0) process.exitCode = 1;
