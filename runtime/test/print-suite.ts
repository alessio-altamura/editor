// The print suite, in `npm run test:browser`: runs `print` and reads the PDF with
// plain byte searches, without a PDF library. The page number is read with
// pdftotext when the system has it.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepare, runCli, writeChartFolder } from './export-suite.js';

/** ISO A4 in points; Chromium rounds the page to whole CSS pixels, so within 1.5pt. */
const A4 = [595.28, 841.89];
const withoutDates = (pdf: Buffer) => pdf.toString('latin1').replace(/\/(CreationDate|ModDate) *\([^)]*\)/g, '');
const pages = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type *\/Page[^s]/g) ?? []).length;

function pdfText(pdf: Buffer): string | null {
  const run = spawnSync('pdftotext', ['-layout', '-', '-'], { input: pdf });
  return run.status === 0 ? run.stdout.toString('utf8') : null;
}

let failed = 0;
const report = (label: string, problems: string[]) => {
  if (problems.length === 0) console.log(`ok   ${label}`);
  else {
    failed++;
    console.log(`FAIL ${label}\n  ${problems.join('\n  ')}`);
  }
};
const base = mkdtempSync(join(tmpdir(), 'print-'));
try {
  // A valid folder, and a long one: the same document repeated over many pages.
  const short = prepare('esempio-34', mkdtempSync(join(base, 'a-')));
  const long = join(base, 'lungo');
  mkdirSync(long);
  writeFileSync(join(long, 'doc.document.md'), '---\nid: doc\nkind: document\nspec-version: "0.1"\nlang: it\n---\n');
  writeFileSync(join(long, 'riga.text.md'), '---\nid: riga\nkind: text\n---\nUna riga di testo, abbastanza lunga da occupare la pagina, *in corsivo* e `in codice`.\n');
  writeFileSync(join(long, 'lungo.article.md'), '---\nid: lungo\nkind: article\ntitle: Un documento lungo\n---\n' + '![[riga]]\n\n'.repeat(200));

  for (const [label, folder, many] of [['esempio-34', short, false], ['lungo', long, true]] as const) {
    const problems: string[] = [];
    const first = runCli(['print', folder]);
    const output = join(base, `${label}.pdf`);
    const second = runCli(['print', folder, '-o', output]);
    if (first.status !== 0 || second.status !== 0) problems.push(`exit ${first.status} ${second.status}: ${first.stderr}`);
    if (first.stderr !== '{"diagnostics":[]}\n') problems.push(`stderr ${first.stderr}`);
    const pdf = first.stdout;
    const text = pdf.toString('latin1');
    if (!text.startsWith('%PDF-')) problems.push('not a PDF');
    // Every page A4.
    const boxes = [...text.matchAll(/\/MediaBox *\[ *0 +0 +([\d.]+) +([\d.]+) *\]/g)].map((m) => [Number(m[1]), Number(m[2])]);
    if (boxes.length !== pages(pdf) || boxes.some(([w, h]) => Math.abs(w! - A4[0]!) > 1.5 || Math.abs(h! - A4[1]!) > 1.5)) problems.push(`MediaBox ${JSON.stringify(boxes)}`);
    if (many ? pages(pdf) < 3 : pages(pdf) !== 1) problems.push(`${pages(pdf)} pages`);
    // The base fonts, embedded: their names in the font descriptors, and no other font.
    const names = new Set([...text.matchAll(/\/FontName *\/[A-Z]{6}\+([A-Za-z0-9-]+)/g)].map((m) => m[1]!));
    // A variable font is named by its default instance: SourceCodeVF-ExtraLight even at 400.
    const want = many ? ['SourceCodeVF-ExtraLight', 'SourceSerif4Variable-Italic', 'SourceSerif4Variable-Roman'] : ['SourceSerif4Variable-Roman'];
    if ([...names].sort().join() !== want.join()) problems.push(`fonts ${[...names].sort().join()}`);
    // The same folder gives the same PDF, but for the dates Chromium writes.
    if (withoutDates(readFileSync(output)) !== withoutDates(pdf)) problems.push('two prints differ beyond the dates');
    const words = pdfText(pdf);
    if (words === null) console.log(`     ${label}: pdftotext missing, page numbers not read`);
    else {
      // The page number alone on the last line of each page, in the middle.
      const numbers = words.split('\f').filter((page) => page.trim() !== '').map((page) => page.trimEnd().split('\n').at(-1)!.trim());
      if (numbers.join() !== Array.from({ length: pages(pdf) }, (_, i) => String(i + 1)).join()) problems.push(`page numbers ${numbers.join()}`);
    }
    report(`${label}: ${pages(pdf)} pages`, problems);
  }

  // A chart (class 3): printed with the light drawing; its labels are text in the PDF.
  {
    const problems: string[] = [];
    const folder = mkdtempSync(join(base, 'c-'));
    writeChartFolder(folder);
    const run = runCli(['print', folder]);
    if (run.status !== 0 || !run.stdout.toString('latin1').startsWith('%PDF-')) problems.push(`exit ${run.status}: ${run.stderr}`);
    const words = pdfText(run.stdout);
    if (words !== null && (!words.includes('gennaio') || !words.includes('20.000'))) problems.push(`text ${words.slice(0, 200)}`);
    report('a chart printed', problems);
  }

  // Refused with an error, written with --allow-errors; no browser, exit 2.
  {
    const problems: string[] = [];
    const folder = prepare('err-embed', mkdtempSync(join(base, 'e-')));
    const refused = runCli(['print', folder]);
    if (refused.status !== 1 || refused.stdout.length > 0 || !refused.stderr.includes('embed-unresolved')) problems.push(`refused: ${refused.status}`);
    const allowed = runCli(['print', folder, '--allow-errors']);
    if (allowed.status !== 1 || !allowed.stdout.toString('latin1').startsWith('%PDF-')) problems.push(`--allow-errors: ${allowed.status}`);
    if (runCli(['print', folder, '--theme', 'dark']).status !== 2) problems.push('--theme accepted');
    const env = { ...process.env, DOC_RUNTIME_ELECTRON: join(base, 'nessun-electron') };
    const valid = prepare('esempio-34', mkdtempSync(join(base, 'n-')));
    const missing = runCli(['print', valid], { env });
    if (missing.status !== 2 || missing.stdout.length > 0 || !missing.stderr.includes('npm ci')) problems.push(`no browser: ${missing.status} ${missing.stderr}`);
    report('errors and no browser', problems);
  }
} finally {
  rmSync(base, { recursive: true, force: true });
}
console.log(failed === 0 ? '\nprint suite: all pass' : `\nprint suite: ${failed} failed`);
if (failed > 0) process.exitCode = 1;
