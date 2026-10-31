// The formulas with Pyodide, in `npm run test:browser` (class 4): the code runs in the
// worker of the Electron of the package, never in Node. The isolation tests of
// ricerca/misure/pyodide/banco/iso-tests.py, the time limit, the checks of the code, and
// the export, whose HTML has the values and no Pyodide. The examples of the spec with
// conf=4 run in the conformance suite, through the cli, with the same Electron.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jobKey, type FormulaJob } from '../src/formula.js';
import { PyodideEngine } from '../src/formula-engine.js';
import { runCli } from './export-suite.js';
import { formulaFolder } from './formula-suite.js';

let failed = 0;
const report = (label: string, problems: string[]) => {
  if (problems.length === 0) console.log(`ok   ${label}`);
  else {
    failed++;
    console.log(`FAIL ${label}\n  ${problems.join('\n  ')}`);
  }
};
const job = (code: string, kind: FormulaJob['kind'] = 'value'): FormulaJob => {
  const body = { kind, code, inputs: {} };
  return { key: jobKey(body), ...body };
};
/** Python that tries something and says whether it got through. */
const attempt = (setup: string, action: string) => `${setup}\ntry:\n    ${action}\n    r = 'riuscito'\nexcept BaseException as e:\n    r = 'bloccato: ' + type(e).__name__\nr`;

const base = mkdtempSync(join(tmpdir(), 'formula-browser-'));
// A server on this machine: the worker must not reach it.
let requests = 0;
const server = createServer((_request, response) => {
  requests++;
  response.end('raggiunto');
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
const secret = join(base, 'segreto.txt');
writeFileSync(secret, 'non deve uscire');

const probes = new PyodideEngine(1500, () => undefined, true);
try {
  {
    const problems: string[] = [];
    const checks: Array<[string, string, (value: string) => boolean]> = [
      ['js is empty', "import js\nnames = ['fetch', 'XMLHttpRequest', 'self', 'globalThis', 'location', 'postMessage', 'importScripts']\nstr([name for name in names if hasattr(js, name)])", (v) => v === '[]'],
      ['run_js blocked', attempt('from pyodide.code import run_js', "run_js('1 + 1')"), (v) => v.startsWith('bloccato')],
      ['Function blocked by the CSP', attempt('import pyodide_js', "pyodide_js.constructor.constructor('return typeof globalThis')()"), (v) => v.startsWith('bloccato')],
      ['no files of the host', attempt('', "open('/etc/hostname').read()"), (v) => v.startsWith('bloccato')],
      ['no file of the test', attempt('', `open(${JSON.stringify(secret)}).read()`), (v) => v.startsWith('bloccato')],
      ['no network: open_url', attempt('from pyodide.http import open_url', `open_url(${JSON.stringify(url)}).read()`), (v) => v.startsWith('bloccato')],
    ];
    for (const [label, code, ok] of checks) {
      const answer = await probes.probe(code);
      if (answer.value === undefined || !ok(answer.value)) problems.push(`${label}: ${JSON.stringify(answer)}`);
    }
    if (requests > 0) problems.push(`the server was reached ${requests} times`);
    // An endless loop: the page stops the worker from outside, and the next one works.
    const started = performance.now();
    const loop = (await probes.probe('while True:\n    pass')) as { error?: unknown };
    const elapsed = performance.now() - started;
    if (JSON.stringify(loop).indexOf('formula-timeout') < 0) problems.push(`loop: ${JSON.stringify(loop)}`);
    if (elapsed > 1500 + 3000) problems.push(`loop stopped after ${Math.round(elapsed)} ms`);
    const after = await probes.probe('str(1 + 1)');
    if (after.value !== '2') problems.push(`after the loop: ${JSON.stringify(after)}`);
    report('isolation: js empty, run_js and Function blocked, no host files, no network, loop stopped', problems);
  }
} finally {
  probes.close();
  server.close();
}

const engine = new PyodideEngine(1500);
try {
  {
    const problems: string[] = [];
    const loop = job('x = 0\nwhile True:\n    x = x + 1\nx');
    const next = job('1 + 1');
    const results = await engine.evaluate([loop, next]);
    const stopped = results.get(loop.key);
    if (!stopped || !('error' in stopped) || stopped.error?.code !== 'formula-timeout') problems.push(`loop: ${JSON.stringify(stopped)}`);
    const value = results.get(next.key);
    if (!value || !('value' in value) || value.value.type !== 'number' || value.value.value !== '2') problems.push(`after: ${JSON.stringify(value)}`);
    report('time limit: the worker is stopped and started again', problems);
  }
  {
    // The checks of the code, before it runs: the ways out are not even names.
    const problems: string[] = [];
    const cases: Array<[string, string, string]> = [
      ['import js\njs', 'formula-import-forbidden', 'js'],
      ['import os\nos.getcwd()', 'formula-import-forbidden', 'os'],
      ["__import__('os')", 'formula-name-undeclared', '__import__'],
      ['().__class__', 'formula-name-undeclared', '__class__'],
      ["open('/etc/hostname').read()", 'formula-name-undeclared', 'open'],
      ['a = 1', 'formula-syntax', ''],
      ['1 / 0', 'formula-error', ''],
      ["'a' + 1", 'formula-type', ''],
    ];
    const jobs = cases.map(([code]) => job(code));
    const results = await engine.evaluate(jobs);
    cases.forEach(([code, want, target], index) => {
      const result = results.get(jobs[index]!.key);
      const error = result && 'error' in result ? result.error : undefined;
      if (error?.code !== want || (target !== '' && error.target !== target) || error.line !== 1) problems.push(`${JSON.stringify(code)}: ${JSON.stringify(result)}`);
    });
    // The decimals of the math lines: 0.1 + 0.2 is 0.3, 3830 / 3 has 34 digits, mean stays decimal.
    const numbers: Array<[string, string]> = [['0.1 + 0.2', '0.3'], ['3830 / 3', '1276.666666666666666666666666666667'], ['mean([1, 2, 2])', '1.666666666666666666666666666666667']];
    const lines = numbers.map(([code]) => job(code, 'line'));
    const values = await engine.evaluate(lines);
    numbers.forEach(([code, want], index) => {
      const result = values.get(lines[index]!.key);
      if (!result || !('value' in result) || result.value.type !== 'number' || result.value.value !== want) problems.push(`${code}: ${JSON.stringify(result)}`);
    });
    report('the code: forbidden imports, undeclared names, errors at their line; decimals', problems);
  }
} finally {
  engine.close();
}

{
  // The export: the values computed, written in the page; no Pyodide in it.
  const problems: string[] = [];
  const folder = formulaFolder(mkdtempSync(join(base, 'e-')));
  const output = join(base, 'formule.html');
  const run = runCli(['export', folder, '-o', output]);
  if (run.status !== 0) problems.push(`exit ${run.status}: ${run.stderr}`);
  else {
    const html = readFileSync(output, 'utf8');
    for (const shown of ['3830', '7660', '281,60']) if (!html.includes(shown)) problems.push(`${shown} missing`);
    if (/pyodide|\.wasm|python_stdlib/i.test(html)) problems.push('the page names Pyodide');
  }
  report('export: the values as a snapshot, no Pyodide in the HTML', problems);
}

rmSync(base, { recursive: true, force: true });
console.log(failed === 0 ? '\nformula browser suite: all pass' : `\nformula browser suite: ${failed} fail`);
process.exitCode = failed === 0 ? 0 : 1;
