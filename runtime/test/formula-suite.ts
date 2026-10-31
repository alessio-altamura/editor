// The formulas without Pyodide, in `npm test` (class 4): a document without code never
// starts Electron, and a worker that is not there gives `formula-unavailable` on each
// formula while the rest resolves. Electron is a stand-in script that only leaves a mark.
import { chmodSync, cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
} finally {
  rmSync(base, { recursive: true, force: true });
}
console.log(failed === 0 ? '\nformula suite: all pass' : `\nformula suite: ${failed} fail`);
process.exitCode = failed === 0 ? 0 : 1;
}
