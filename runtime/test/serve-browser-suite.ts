// The browser part of serve, in `npm run test:browser`: the preview updates in place,
// without a reload, and the paragraph being read stays where it was.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launchBrowser } from './electron-browser.js';
import { startServe, writeDocument } from './serve-suite.js';

const base = mkdtempSync(join(tmpdir(), 'serve-browser-'));
const folder = join(base, 'doc');
writeDocument(folder, 60);
const server = await startServe(folder);
const browser = await launchBrowser();
const problems: string[] = [];
try {
  const page = await browser.newPage({ width: 800, height: 600 });
  const errors: string[] = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${server.base}/article/report?token=${server.token}`);
  await page.waitForFunction(() => (window as unknown as { previewUpdates?: number }).previewUpdates === 0);
  // Give the WebSocket time to open, then read from the middle of the document.
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => {
    (window as unknown as { marker: string }).marker = 'la stessa pagina';
    const target = document.querySelector('[data-node="t30"]')!;
    target.scrollIntoView();
    window.scrollBy(0, -40);
    return { top: target.getBoundingClientRect().top, scroll: window.scrollY };
  });
  // A paragraph above the reading point grows by many lines; one below changes too.
  writeFileSync(join(folder, 't5.text.md'), '---\nid: t5\nkind: text\n---\n' + 'Un capoverso cresciuto, con molte parole in più. '.repeat(40) + '\n');
  writeFileSync(join(folder, 't40.text.md'), '---\nid: t40\nkind: text\n---\nIl capoverso 40, cambiato.\n');
  await page.waitForFunction(() => document.body.textContent!.includes('cresciuto') && document.body.textContent!.includes('cambiato'), undefined, { timeout: 5000 });
  const after = await page.evaluate(() => ({
    marker: (window as unknown as { marker?: string }).marker,
    updates: (window as unknown as { previewUpdates: number }).previewUpdates,
    top: document.querySelector('[data-node="t30"]')!.getBoundingClientRect().top,
    scroll: window.scrollY,
  }));
  if (after.marker !== 'la stessa pagina') problems.push('the page was reloaded');
  if (after.updates < 1) problems.push('no update applied');
  if (Math.abs(after.top - before.top) > 2) problems.push(`the paragraph read moved from ${before.top} to ${after.top}`);
  if (after.scroll <= before.scroll) problems.push(`the scroll did not follow the text above: ${before.scroll} → ${after.scroll}`);
  if (errors.length > 0) problems.push(`console: ${errors.join(' | ')}`);
} finally {
  await browser.close();
  await server.stop();
  rmSync(base, { recursive: true, force: true });
}
if (problems.length === 0) console.log('ok   the preview updates in place and keeps the reading point\n\nserve browser suite: all pass');
else {
  console.log(`FAIL the preview in the browser\n  ${problems.join('\n  ')}\n\nserve browser suite: 1 failed`);
  process.exitCode = 1;
}
