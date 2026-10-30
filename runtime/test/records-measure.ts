// The measure of a collection of 100 000 records, the limit of a data file: the
// recomputation of the folder and the HTML of the preview, with the records the preview
// keeps (§11.6) and with all of them, as the export. Outside the tests: `npm run measure:records`.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PREVIEW_RECORDS } from '../src/live.js';
import { resolveTree } from '../src/resolve-tree.js';
import { staticExport } from '../src/static-export.js';

const RECORDS = 100_000;
const folder = mkdtempSync(join(tmpdir(), 'doc-records-'));
writeFileSync(join(folder, 'doc.document.md'), '---\nid: doc\nkind: document\ntags: []\nlang: it\nspec-version: "0.1"\n---\n');
writeFileSync(join(folder, 'report.article.md'), '---\nid: report\nkind: article\ntags: []\ntitle: Grande\n---\n![[grande]]\n');
writeFileSync(join(folder, 'grande.collection.md'), '---\nid: grande\nkind: collection\ntags: []\nasset: grande.tsv\nfields:\n  - name: codice\n    type: string\n  - name: importo\n    type: number\n  - name: pezzi\n    type: integer\n  - name: giorno\n    type: date\nprimaryKey: codice\n---\nCentomila record.\n');
const lines = ['codice\timporto\tpezzi\tgiorno'];
for (let i = 0; i < RECORDS; i++) lines.push(`r${String(i).padStart(6, '0')}\t${(i * 1.37).toFixed(2)}\t${i % 1000}\t2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`);
writeFileSync(join(folder, 'grande.tsv'), `${lines.join('\n')}\n`);
const preview = { assetUrl: (path: string) => path, fontUrl: (file: string) => file, scriptUrls: [], diagnostics: [] };

try {
  for (const [label, records] of [[`${PREVIEW_RECORDS} records, as the preview`, PREVIEW_RECORDS], ['all the records, as the export', undefined]] as const) {
    // Three rounds: the first one warms up the engine; the best of the others counts.
    const times: Array<{ resolve: number; html: number; bytes: number }> = [];
    for (let round = 0; round < 3; round++) {
      let start = performance.now();
      const tree = resolveTree(folder, { positions: true, records });
      const resolve = performance.now() - start;
      start = performance.now();
      const html = [...staticExport(tree, 'report', new Map(), { allowErrors: true, preview })].join('');
      times.push({ resolve, html: performance.now() - start, bytes: html.length });
    }
    const best = times.slice(1).sort((a, b) => a.resolve + a.html - (b.resolve + b.html))[0]!;
    console.log(`${RECORDS} records, ${label}: recomputation ${best.resolve.toFixed(0)} ms, HTML ${best.html.toFixed(0)} ms, ${(best.bytes / 1e6).toFixed(1)} MB`);
  }
} finally {
  rmSync(folder, { recursive: true, force: true });
}
