// The conformance suite of §0: extracts the examples of the spec, writes their
// files in an empty folder, runs the runtime and compares the trees as JSON values.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '../..');
const specPath = resolve(process.argv[2] ?? join(packageRoot, '../docs/specifica.md'));
const cliPath = join(packageRoot, 'dist/src/cli.js');
const FENCE = '`'.repeat(32);

export interface Example {
  number: number;
  conformanceClass: string;
  status: string;
  files: Array<{ path: string; content: string | null }>;
  noDocument: boolean;
  resolved: string;
}

export function extractExamples(spec: string): Example[] {
  const examples: Example[] = [];
  const lines = spec.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const open = new RegExp(`^${FENCE} example (\\d+) conf=(\\S+) status=(\\S+)$`).exec(lines[i]!);
    if (!open) continue;
    const example: Example = {
      number: Number(open[1]),
      conformanceClass: open[2]!,
      status: open[3]!,
      files: [],
      noDocument: false,
      resolved: '',
    };
    let section: string[] | null = null;
    const close = () => {
      if (section === null) return;
      const text = section.map((line) => line + '\n').join('');
      const last = example.files[example.files.length - 1];
      if (inResolved) example.resolved = text;
      else if (last) last.content = text;
      section = null;
    };
    let inResolved = false;
    for (i++; i < lines.length && lines[i] !== FENCE; i++) {
      const line = lines[i]!;
      const marker = /^=== (file|asset) (.+)$/.exec(line);
      if (marker) {
        close();
        example.files.push({ path: marker[2]!, content: marker[1] === 'asset' ? null : '' });
        if (marker[1] === 'file') section = [];
      } else if (line === '=== no-document') {
        close();
        example.noDocument = true;
      } else if (line === '=== resolved') {
        close();
        inResolved = true;
        section = [];
      } else if (section !== null) {
        section.push(line);
      } else if (line !== '') {
        throw new Error(`example ${example.number}: line outside a section: ${line}`);
      }
    }
    close();
    examples.push(example);
  }
  return examples;
}

/** Drops `message` and `fix`, which are not normative; checks that every error has a fix. */
function normalize(tree: unknown, problems: string[], label: string): unknown {
  const value = structuredClone(tree) as { diagnostics?: Array<Record<string, unknown>> };
  for (const diagnostic of value.diagnostics ?? []) {
    if (diagnostic.severity === 'error' && (typeof diagnostic.fix !== 'string' || diagnostic.fix === '')) {
      problems.push(`${label}: error ${String(diagnostic.code)} in ${String(diagnostic.file)} without a fix`);
    }
    delete diagnostic.message;
    delete diagnostic.fix;
  }
  return value;
}

/** Writes the files of an example in a folder, with the document file of §0 when it has none. */
export function writeExample(example: Example, folder: string): void {
  for (const file of example.files) {
    mkdirSync(dirname(join(folder, file.path)), { recursive: true });
    writeFileSync(join(folder, file.path), file.content ?? '');
  }
  // §0: without a document file the script creates doc.document.md, unless the example says no-document.
  if (!example.noDocument && !example.files.some((file) => file.path.endsWith('.document.md'))) {
    writeFileSync(join(folder, 'doc.document.md'), '---\nid: doc\nkind: document\ntags: []\nspec-version: "0.1"\n---\n');
  }
}

function runExample(example: Example): string[] {
  const problems: string[] = [];
  const folder = mkdtempSync(join(tmpdir(), `example-${example.number}-`));
  try {
    writeExample(example, folder);
    const run = spawnSync(process.execPath, [cliPath, 'resolve-tree', folder], { encoding: 'utf8' });
    if (run.status !== 0 && run.status !== 1) return [`exit code ${run.status}: ${run.stderr}`];
    const actual: unknown = JSON.parse(run.stdout);
    const expected: unknown = JSON.parse(example.resolved);
    const actualNormal = normalize(actual, problems, 'runtime');
    normalize(expected, problems, 'spec');
    const expectedNormal = normalize(expected, [], 'spec');
    if (!isDeepStrictEqual(actualNormal, expectedNormal)) {
      problems.push(`tree differs\n  expected: ${JSON.stringify(expectedNormal)}\n  actual:   ${JSON.stringify(actualNormal)}`);
    }
    const hasError = (expected as { diagnostics?: Array<{ severity: string }> }).diagnostics?.some((d) => d.severity === 'error') ?? false;
    if (run.status !== (hasError ? 1 : 0)) problems.push(`exit code ${run.status}, expected ${hasError ? 1 : 0}`);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // CONFORMANCE_CLASSES=1,2,3 leaves out the others: class 4 runs the code in Electron with Pyodide.
  const only = process.env.CONFORMANCE_CLASSES?.split(',');
  const examples = extractExamples(readFileSync(specPath, 'utf8')).filter((example) => only === undefined || only.includes(example.conformanceClass));
  let failed = 0;
  for (const example of examples) {
    let problems: string[];
    try {
      problems = runExample(example);
    } catch (error) {
      problems = [String(error)];
    }
    if (problems.length === 0) {
      console.log(`ok   example ${example.number} conf=${example.conformanceClass} status=${example.status}`);
    } else {
      failed++;
      console.log(`FAIL example ${example.number}\n  ${problems.join('\n  ')}`);
    }
  }
  console.log(`\n${examples.length - failed}/${examples.length} examples pass (${specPath})`);
  if (examples.length === 0 || failed > 0) process.exitCode = 1;
}
