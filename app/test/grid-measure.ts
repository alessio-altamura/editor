// The measure of the grid with 100 000 records, the limit of a data file: how long it
// takes to open, to scroll, to edit a cell, and for the preview to follow. Outside the
// tests: `npm run measure:grid`. On Linux it runs on the headless platform.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import electronPath from 'electron';
import { _electron as electron } from 'playwright-core';

const RECORDS = 100_000;
const appFolder = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const folder = mkdtempSync(join(tmpdir(), 'doc-grid-'));
const userData = mkdtempSync(join(tmpdir(), 'doc-grid-user-'));
writeFileSync(join(folder, 'doc.document.md'), '---\nid: doc\nkind: document\ntags: []\nlang: it\nspec-version: "0.1"\n---\n');
// An article without the table: its preview stays light while the grid is measured.
writeFileSync(join(folder, 'report.article.md'), '---\nid: report\nkind: article\ntags: []\ntitle: Grande\n---\n![[nota]]\n');
writeFileSync(join(folder, 'nota.text.md'), '---\nid: nota\nkind: text\ntags: []\n---\nUna nota.\n');
writeFileSync(join(folder, 'grande.collection.md'), '---\nid: grande\nkind: collection\ntags: []\nasset: grande.tsv\nfields:\n  - name: codice\n    type: string\n  - name: importo\n    type: number\n  - name: pezzi\n    type: integer\n  - name: giorno\n    type: date\nprimaryKey: codice\n---\nCentomila record.\n');
const lines = ['codice\timporto\tpezzi\tgiorno'];
for (let i = 0; i < RECORDS; i++) lines.push(`r${String(i).padStart(6, '0')}\t${(i * 1.37).toFixed(2)}\t${i % 1000}\t2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`);
writeFileSync(join(folder, 'grande.tsv'), `${lines.join('\n')}\n`);

const args = [...(process.platform === 'linux' ? ['--ozone-platform=headless'] : []), ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []), appFolder, '--folder', folder, `--user-data-dir=${userData}`];
const launched = Date.now();
const app = await electron.launch({ executablePath: electronPath as unknown as string, args, env: { ...process.env, NODE_OPTIONS: '' }, timeout: 600_000 });
console.log(`launch ${Date.now() - launched} ms`);
app.process().stderr?.on('data', (data: Buffer) => {
  for (const line of String(data).split('\n')) if (line.includes('ricalcolo')) console.log(`  ${line.trim()}`);
});
try {
  let main = app.windows().find((p) => p.url().startsWith('file:'));
  while (main === undefined) {
    await app.waitForEvent('window');
    main = app.windows().find((p) => p.url().startsWith('file:'));
  }
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setContentSize(1400, 900));
  await main.waitForSelector('#shelves button[data-id="grande"]', { timeout: 60_000 });
  await main.click('[data-show="page"]');
  // Opening: from the click in the navigator to the first rows drawn.
  const open = await main.evaluate(async () => {
    const start = performance.now();
    document.querySelector<HTMLButtonElement>('#shelves button[data-id="grande"]')!.click();
    while (!document.querySelector('#grid .grid-cell')) await new Promise((r) => setTimeout(r, 5));
    return { total: performance.now() - start, model: Number(document.getElementById('grid')!.dataset.openedIn) };
  });
  // Scrolling: 120 frames, 3000 px each, from the top to the bottom and back.
  const scrolling = await main.evaluate(async () => {
    const scroll = document.querySelector<HTMLElement>('#grid .grid-scroll')!;
    const frames: number[] = [];
    let last = performance.now();
    for (let i = 0; i < 120; i++) {
      scroll.scrollTop = i < 60 ? i * 50_000 : (120 - i) * 50_000;
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now();
      frames.push(now - last);
      last = now;
    }
    frames.sort((a, b) => a - b);
    return { median: frames[60]!, worst: frames[119]! };
  });
  // Editing a cell in the middle: from Enter to the cell drawn with its new string.
  await main.evaluate(() => {
    document.querySelector<HTMLElement>('#grid .grid-scroll')!.scrollTop = 50_000 * 28;
  });
  await main.waitForSelector('#grid .grid-cell[data-row="50000"][data-column="1"]');
  // Chosen and opened with the events the grid answers to: a click with the mouse would scroll and redraw under it.
  await main.evaluate(() => {
    document.querySelector('#grid .grid-cell[data-row="50000"][data-column="1"]')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    document.querySelector('#grid .grid-table')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  await main.waitForSelector('#grid .grid-editor');
  const edit = await main.evaluate(async () => {
    const input = document.querySelector<HTMLInputElement>('#grid .grid-editor')!;
    input.value = '12345,678';
    const start = performance.now();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    while (document.querySelector('#grid .grid-cell[data-row="50000"][data-column="1"]')?.textContent !== '12.345,68') await new Promise((r) => setTimeout(r, 1));
    return performance.now() - start;
  });
  console.log(`grid, ${RECORDS} records: open ${open.total.toFixed(0)} ms (model and first rows ${open.model} ms); scroll median ${scrolling.median.toFixed(1)} ms per frame, worst ${scrolling.worst.toFixed(1)} ms; edit ${edit.toFixed(0)} ms`);
  // The preview of an article with the whole table: the page of serve, drawn again at each change of the buffer.
  writeFileSync(join(folder, 'report.article.md'), '---\nid: report\nkind: article\ntags: []\ntitle: Grande\n---\n![[nota]]\n\n![[grande]]\n');
  const started = Date.now();
  await main.evaluate(() => (window as unknown as { docApp: { showPreview: (file: string) => Promise<unknown> } }).docApp.showPreview('report.article.md'));
  const preview = await (async () => {
    for (;;) {
      const page = app.windows().find((p) => p.url().includes('/article/report'));
      if (page) return page;
      await new Promise((r) => setTimeout(r, 100));
    }
  })();
  await preview.waitForFunction(() => document.querySelectorAll('[data-node="grande"] tbody tr').length > 0, undefined, { timeout: 600_000, polling: 1000 });
  console.log(`preview of the article with the table: ${Date.now() - started} ms to load`);
} finally {
  await app.close().catch(() => undefined);
  rmSync(folder, { recursive: true, force: true });
  rmSync(userData, { recursive: true, force: true });
}
