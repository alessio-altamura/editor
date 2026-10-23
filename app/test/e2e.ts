// End to end, with the Electron of playwright-core: the app opens on a test folder,
// a line typed in the editor reaches the preview, and a click on the preview brings
// the editor to the line where the element is written; changes not saved are asked
// about before changing file and before closing. On Linux it runs on the headless
// platform, without a screen.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import electronPath from 'electron';
import { _electron as electron, type Page } from 'playwright-core';
import { writeFixture } from './fixture.js';

const appFolder = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const folder = writeFixture();
const userData = mkdtempSync(join(tmpdir(), 'doc-app-user-'));
const problems: string[] = [];
// As root, as in a container, Chromium wants --no-sandbox.
const args = [
  ...(process.platform === 'linux' ? ['--ozone-platform=headless'] : []),
  ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []),
  appFolder, '--folder', folder, `--user-data-dir=${userData}`,
];
// Electron does not accept some Node options of the parent (for example --use-openssl-ca).
const app = await electron.launch({ executablePath: electronPath as unknown as string, args, env: { ...process.env, NODE_OPTIONS: '' } });
/** The native dialog cannot be clicked: the main process gets a fixed answer, and counts the questions. */
const answerDialogs = (response: number) =>
  app.evaluate(({ dialog }, answer) => {
    const counted = globalThis as unknown as { asked: number };
    counted.asked = 0;
    dialog.showMessageBox = (async () => {
      counted.asked++;
      return { response: answer, checkboxChecked: false };
    }) as typeof dialog.showMessageBox;
  }, response);
const asked = () => app.evaluate(() => (globalThis as unknown as { asked: number }).asked);
try {
  // The window of the app, not the view of the preview, which can come first.
  let main = app.windows().find((p) => p.url().startsWith('file:'));
  while (main === undefined) {
    await app.waitForEvent('window');
    main = app.windows().find((p) => p.url().startsWith('file:'));
  }
  // On the headless platform the window starts at 1×1: it takes its size once created.
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setContentSize(1400, 900));
  main.on('console', (message) => message.type() === 'error' && problems.push(`console: ${message.text()}`));
  main.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  await main.waitForSelector('#shelves button[data-id="nota"]');
  // The preview is a view of its own: find its page among those of the app.
  const preview = async (): Promise<Page> => {
    for (let i = 0; i < 100; i++) {
      const page = app.windows().find((p) => p.url().includes('/article/'));
      if (page) return page;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`no preview among ${app.windows().map((p) => p.url()).join(', ')}`);
  };
  await main.click('#shelves button[data-id="nota"]');
  await main.waitForFunction(() => window.docAppState?.file === 'nota.text.md');
  const page = await preview();
  await page.waitForSelector('[data-node="nota"] p');
  const reloads: string[] = [];
  page.on('load', () => reloads.push(page.url()));

  // Typing in the editor: the preview changes without being saved.
  await main.click('.cm-content');
  await main.keyboard.press('Control+End');
  await main.keyboard.type(' Scritto adesso.');
  await page.waitForFunction(() => document.querySelector('[data-node="nota"]')?.textContent?.includes('Scritto adesso.'), undefined, { timeout: 5000 })
    .catch(() => problems.push('the preview did not change while typing'));
  if (reloads.length > 0) problems.push('the preview reloaded');

  // A click on the chapter title in the preview: the editor opens cap.chapter.md at its title line,
  // after asking about the changes of nota.text.md; the answer is «Salva».
  await answerDialogs(0);
  await page.click('h2');
  await main.waitForFunction(() => window.docAppState?.file === 'cap.chapter.md', undefined, { timeout: 5000 })
    .catch(() => problems.push('the click did not open the file'));
  const state = await main.evaluate(() => window.docAppState);
  if (state.file !== 'cap.chapter.md' || state.line !== 4 || state.character !== 0) problems.push(`the cursor ${JSON.stringify({ ...state, text: undefined })}`);
  if ((await asked()) !== 1) problems.push(`asked ${await asked()} times before changing file`);
  if (!readFileSync(join(folder, 'nota.text.md'), 'utf8').includes('Scritto adesso.')) problems.push('the changes were not saved before changing file');
  // And a click on a paragraph of the text, back to its line.
  await page.click('[data-node="nota"] p');
  await main.waitForFunction(() => window.docAppState?.file === 'nota.text.md' && window.docAppState.line === 5, undefined, { timeout: 5000 })
    .catch(async () => problems.push(`the click on the paragraph: ${JSON.stringify(await main.evaluate(() => ({ ...window.docAppState, text: undefined })))}`));
  // Closing with a change not saved: asked once, and saved.
  await main.click('.cm-content');
  await main.keyboard.press('Control+End');
  await main.keyboard.type(' Prima di chiudere.');
  await answerDialogs(0);
  const closed = app.waitForEvent('close');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().startsWith('file:'))?.close());
  await closed;
  if (!readFileSync(join(folder, 'nota.text.md'), 'utf8').includes('Prima di chiudere.')) problems.push('the changes were not saved before closing');
} catch (error) {
  problems.push(String(error).split('\n')[0]!);
  // What the window shows, to see why.
  for (const page of app.windows()) {
    const seen = await page.evaluate(() => ({ api: typeof (window as unknown as { docApp?: unknown }).docApp, visibility: document.visibilityState, size: [innerWidth, innerHeight], nota: document.querySelector('[data-node="nota"] p')?.getBoundingClientRect().toJSON() ?? null })).catch((e: unknown) => String(e));
    problems.push(`${page.url()}: ${JSON.stringify(seen)}`);
  }
} finally {
  await app.close().catch(() => undefined);
  rmSync(folder, { recursive: true, force: true });
  rmSync(userData, { recursive: true, force: true });
}
if (problems.length === 0) console.log('ok   typing reaches the preview, a click on the preview brings the editor to the line\n\napp end-to-end: all pass');
else {
  console.log(`FAIL the app end to end\n  ${problems.join('\n  ')}\n\napp end-to-end: 1 failed`);
  process.exitCode = 1;
}
