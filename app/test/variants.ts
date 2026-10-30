// The three visual directions while one is chosen (DOC_APP_VARIANT, temporary): each opens
// without errors in the console, with its tokens, Inter and the icons. With
// VARIANT_SCREENSHOTS=<folder> it also saves, light and dark, the canvas with some cards
// and their groups, the page with a text, and the grid of a collection: the images to
// choose on, outside the repository. `npm run test:variants`.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import electronPath from 'electron';
import { _electron as electron } from 'playwright-core';
import { writeFixture } from './fixture.js';

const appFolder = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const shots = process.env.VARIANT_SCREENSHOTS;
let failed = 0;

for (const variant of ['lavagna', 'documento', 'studio']) {
  const problems: string[] = [];
  const folder = writeFixture({ collection: true });
  const userData = mkdtempSync(join(tmpdir(), 'doc-app-user-'));
  const args = [...(process.platform === 'linux' ? ['--ozone-platform=headless'] : []), ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []), appFolder, '--folder', folder, `--user-data-dir=${userData}`];
  const app = await electron.launch({ executablePath: electronPath as unknown as string, args, env: { ...process.env, NODE_OPTIONS: '', DOC_APP_VARIANT: variant } });
  try {
    let main = app.windows().find((p) => p.url().startsWith('file:'));
    while (main === undefined) {
      await app.waitForEvent('window');
      main = app.windows().find((p) => p.url().startsWith('file:'));
    }
    main.on('console', (message) => message.type() === 'error' && problems.push(`console: ${message.text()}`));
    main.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setContentSize(1440, 900));
    await main.waitForSelector('#shelves button[data-id="nota"]');
    const seen = await main.evaluate(async () => {
      await document.fonts.ready;
      return {
        variant: document.documentElement.dataset.variant,
        inter: document.fonts.check('13px "Inter App"'),
        icons: document.querySelectorAll('button[data-icon] svg').length,
        unlabelled: [...document.querySelectorAll('button[data-icon]')].filter((button) => !button.getAttribute('aria-label')).length,
      };
    });
    if (seen.variant !== variant || !seen.inter || seen.icons < 5 || seen.unlabelled > 0) problems.push(`the direction: ${JSON.stringify(seen)}`);
    if (shots) {
      // Some cards, arranged by kind into groups.
      for (const id of ['nota', 'cap', 'idea', 'vendite', 'prezzi', 'report']) await main.evaluate((each) => window.docApp.recall(each), id);
      await main.waitForFunction(() => document.querySelectorAll('.card').length >= 6, undefined, { timeout: 10_000 });
      await main.click('#arrange-kind');
      await main.waitForSelector('.group', { timeout: 10_000 });
      for (const theme of ['light', 'dark'] as const) {
        await app.evaluate(({ nativeTheme }, chosen) => { nativeTheme.themeSource = chosen; }, theme);
        await main.emulateMedia({ colorScheme: theme });
        await main.click('[data-show="canvas"]').catch(() => undefined);
        await main.waitForTimeout(800);
        await main.screenshot({ path: join(shots, `${variant}-${theme}-canvas.png`) });
        await main.click('[data-show="page"]');
        await main.click('#shelves button[data-id="nota"]');
        await main.waitForTimeout(1200);
        await main.screenshot({ path: join(shots, `${variant}-${theme}-page.png`) });
        await main.click('#shelves button[data-id="vendite"]');
        await main.waitForSelector('#grid .grid-cell');
        await main.waitForTimeout(1200);
        await main.screenshot({ path: join(shots, `${variant}-${theme}-grid.png`) });
      }
    }
  } catch (error) {
    problems.push(String(error).split('\n').slice(0, 6).join(' / '));
  } finally {
    await app.close().catch(() => undefined);
    rmSync(folder, { recursive: true, force: true });
    rmSync(userData, { recursive: true, force: true });
  }
  if (problems.length === 0) console.log(`ok   the direction ${variant} opens, with its tokens, Inter and the icons`);
  else {
    failed++;
    console.log(`FAIL the direction ${variant}\n  ${problems.join('\n  ')}`);
  }
}
console.log(failed === 0 ? '\napp directions: all pass' : `\napp directions: ${failed} failed`);
if (failed > 0) process.exitCode = 1;
