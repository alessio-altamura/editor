// The formulas without Pyodide, in `npm test` (class 4): a document without code never
// starts Electron, and a worker that is not there gives `formula-unavailable` on each
// formula while the rest resolves. Electron is a stand-in script that only leaves a mark.
import { chmodSync, cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { planComputedField, readFormula, writeFormula } from '../src/formula-operations.js';
import { diskWorkspace } from '../src/operations.js';
import { listDocumentFiles, resolveTree } from '../src/resolve-tree.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepare, runCli } from './export-suite.js';

/** The document of the formula tests, out of fixtures/export: the suites there would compute it. */
export function formulaFolder(base: string): string {
  const folder = join(base, 'formule');
  cpSync(fileURLToPath(new URL('../../test/fixtures/formule', import.meta.url)), folder, { recursive: true });
  return folder;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
let failed = 0;
const report = (label: string, problems: string[]) => {
  if (problems.length === 0) console.log(`ok   ${label}`);
  else {
    failed++;
    console.log(`FAIL ${label}\n  ${problems.join('\n  ')}`);
  }
};
type Tree = { nodes?: Array<{ id?: string; content?: unknown[] }>; diagnostics?: Array<{ code: string; target?: string; severity: string }> };

const base = mkdtempSync(join(tmpdir(), 'formula-'));
try {
  // An Electron that only says it was started, and stops.
  const mark = join(base, 'started');
  const fake = join(base, 'electron.sh');
  writeFileSync(fake, `#!/bin/sh\ntouch '${mark}'\nexit 1\n`);
  chmodSync(fake, 0o755);
  const env = { ...process.env, DOC_RUNTIME_ELECTRON: fake };

  {
    const problems: string[] = [];
    const folder = prepare('esempio-34', mkdtempSync(join(base, 'a-')));
    for (const args of [['resolve-tree', folder], ['export', folder, '-o', join(base, 'a.html')]]) {
      const run = runCli(args, { env });
      if (run.status !== 0) problems.push(`${args[0]}: exit ${run.status} ${run.stderr}`);
    }
    if (existsSync(mark)) problems.push('Electron started for a document without code');
    report('a document without formulas does not start Electron', problems);
  }

  {
    const problems: string[] = [];
    const folder = formulaFolder(mkdtempSync(join(base, 'b-')));
    const run = runCli(['resolve-tree', folder], { env });
    const tree = JSON.parse(run.stdout.toString('utf8')) as Tree;
    if (!existsSync(mark)) problems.push('Electron not started for a document with formulas');
    if (run.status !== 1) problems.push(`exit ${run.status}`);
    const unavailable = (tree.diagnostics ?? []).filter((d) => d.code === 'formula-unavailable').map((d) => d.target).sort();
    if (unavailable.join() !== 'totale-q3,vendite-mesi.iva') problems.push(`formula-unavailable on ${unavailable.join()}`);
    const others = (tree.diagnostics ?? []).filter((d) => d.code !== 'formula-unavailable');
    if (others.length > 0) problems.push(`other diagnostics ${JSON.stringify(others)}`);
    // The rest resolves: the article, the table with its records, the math lines without value.
    const text = JSON.stringify(tree.nodes?.find((node) => node.id === 'sintesi')?.content);
    if (!text.includes('["mathLine",{"invalid":true},"totale_q3"]')) problems.push(`sintesi ${text}`);
    const table = JSON.stringify(tree.nodes?.find((node) => node.id === 'vendite-mesi')?.content);
    if (!table.includes('"1200"') || !table.includes('"formula":"iva"')) problems.push(`table ${table.slice(0, 300)}`);
    report('without a worker: formula-unavailable, no value, the rest resolves', problems);
  }

  {
    // create formula: in the formula file of the document, or a new one; refused without a valid id.
    const problems: string[] = [];
    const folder = formulaFolder(mkdtempSync(join(base, 'c-')));
    const dry = runCli(['create', 'formula', '--id', 'media-q3', '--inputs', 'vendite-mesi.euro', '--code', 'mean(vendite_mesi.euro)', '--folder', folder, '--dry-run'], { env });
    const summary = JSON.parse(dry.stdout.toString('utf8')) as { file?: string; diff?: string };
    if (dry.status !== 0 || summary.file !== 'calcoli.formula.md' || !summary.diff?.includes('+{#media-q3 inputs=vendite-mesi.euro}')) problems.push(`dry run ${dry.status} ${dry.stdout} ${dry.stderr}`);
    if (readFileSync(join(folder, 'calcoli.formula.md'), 'utf8').includes('media-q3')) problems.push('the dry run wrote');
    const run = runCli(['create', 'formula', '--id', 'media-q3', '--inputs', 'vendite-mesi.euro', '--code', 'mean(vendite_mesi.euro)', '--folder', folder], { env });
    if (run.status !== 0 || !readFileSync(join(folder, 'calcoli.formula.md'), 'utf8').endsWith('{#media-q3 inputs=vendite-mesi.euro}\n\n```python\nmean(vendite_mesi.euro)\n```\n')) problems.push(`create ${run.status} ${run.stderr}`);
    if (runCli(['create', 'formula', '--id', 'media-q3', '--folder', folder], { env }).status === 0) problems.push('an id taken');
    const plain = prepare('esempio-34', mkdtempSync(join(base, 'd-')));
    const fresh = runCli(['create', 'formula', '--folder', plain], { env });
    if (fresh.status !== 0 || readFileSync(join(plain, 'formule.formula.md'), 'utf8') !== '---\nkind: formula\n---\n{#formula}\n\n```python\nNone\n```\n') problems.push(`a new formula file: ${fresh.stderr}`);
    // The first formula of a document without pyodide: the document file gets it, in the same plan.
    if (!readFileSync(join(plain, 'doc.document.md'), 'utf8').includes('\npyodide: 314.0.7\n')) problems.push(`pyodide not added: ${readFileSync(join(plain, 'doc.document.md'), 'utf8')}`);
    if (JSON.stringify(JSON.parse(run.stdout.toString('utf8')).written) !== '["calcoli.formula.md"]') problems.push(`a document with pyodide was written again: ${run.stdout}`);
    if (existsSync(mark)) rmSync(mark);
    // A computed field: the formula and the field of the schema that names it.
    const workspace = diskWorkspace(folder, () => [...listDocumentFiles(folder).keys()]);
    const plan = planComputedField(workspace, resolveTree(folder), 'vendite-mesi', 'Con IVA');
    const descriptor = plan.files.get('vendite-mesi.collection.md') ?? '';
    if (!descriptor.includes('  - name: con-iva\n    type: number\n    title: Con IVA\n    formula: "[[con-iva]]"') || !plan.files.get('calcoli.formula.md')?.includes('{#con-iva}\n\n```python\nNone\n```')) problems.push(`computed field\n${descriptor}`);
    // The code and the inputs of one object written again, the others as they are.
    const text = readFileSync(join(folder, 'calcoli.formula.md'), 'utf8');
    const written = writeFormula('calcoli.formula.md', text, 'iva', ['vendite-mesi.euro', 'aliquota'], 'euro * aliquota');
    if (!written.includes('{#iva inputs="vendite-mesi.euro aliquota"}\n\n```python\neuro * aliquota\n```') || !written.includes('mean(vendite_mesi.euro)') || readFormula('calcoli.formula.md', written, 'iva')?.code !== 'euro * aliquota') problems.push(`write\n${written}`);
    report('create formula, a computed field, the code of one object written again', problems);
  }
} finally {
  rmSync(base, { recursive: true, force: true });
}
console.log(failed === 0 ? '\nformula suite: all pass' : `\nformula suite: ${failed} fail`);
process.exitCode = failed === 0 ? 0 : 1;
}
