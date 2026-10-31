// The formulas in the app, end to end (class 4), with the Electron of the package and
// playwright-core. Without --code Pyodide never runs: the runtime gets an Electron that is
// not there, so the app shows «Python non disponibile» and the values are missing; the
// builder, the drags, «Campo calcolato» and the grid read only are checked. With --code
// (`npm run test:e2e-code`) the formulas are computed by Pyodide: the value in the
// builder, the computed column in the grid, the math line with a name in the preview.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import electronPath from 'electron';
import { _electron as electron, type Page } from 'playwright-core';
import { writeFormulaFixture } from './fixture.js';

const code = process.argv.includes('--code');
const appFolder = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const folder = writeFormulaFixture();
const userData = mkdtempSync(join(tmpdir(), 'doc-app-user-'));
const problems: string[] = [];
const args = [
  ...(process.platform === 'linux' ? ['--ozone-platform=headless'] : []),
  ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []),
  appFolder, '--folder', folder, `--user-data-dir=${userData}`,
];
const env = { ...process.env, NODE_OPTIONS: '', ...(code ? {} : { DOC_RUNTIME_ELECTRON: '/bin/false' }) };
const app = await electron.launch({ executablePath: electronPath as unknown as string, args, env });
const read = (file: string) => readFileSync(join(folder, file), 'utf8');
const waitFor = async (test: () => boolean, ms = 10_000) => {
  for (let end = Date.now() + ms; !test() && Date.now() < end; ) await new Promise((r) => setTimeout(r, 100));
  return test();
};
try {
  let main = app.windows().find((p) => p.url().includes('index.html'));
  while (main === undefined) {
    await app.waitForEvent('window');
    main = app.windows().find((p) => p.url().includes('index.html'));
  }
  const page: Page = main;
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setContentSize(1400, 900));
  // A native dialog cannot be clicked: «salva» for any question.
  await app.evaluate(({ dialog }) => {
    dialog.showMessageBox = (async () => ({ response: 0, checkboxChecked: false })) as typeof dialog.showMessageBox;
  });
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  await page.waitForSelector('#shelves button[data-id="totale-q1"]');

  // Pyodide: «Python in avvio», then ready; without it «Python non disponibile».
  if (code) {
    await page.waitForFunction(() => document.querySelector('#python')?.hasAttribute('hidden'), undefined, { timeout: 60_000 }).catch(() => problems.push('«Python in avvio» stays'));
    await page.waitForFunction(() => document.querySelector('#shelves button[data-id="totale-q1"] .value')?.textContent === '= 1252,76', undefined, { timeout: 60_000 })
      .catch(() => problems.push('the value of the formula in the navigator'));
  } else {
    await page.waitForFunction(() => document.querySelector('#python .python-text')?.textContent === 'Python non disponibile' && !document.querySelector('#python')!.hasAttribute('hidden'), undefined, { timeout: 15_000 })
      .catch(() => problems.push('«Python non disponibile» not shown'));
  }

  // The builder: a formula from the navigator, in the page.
  await page.click('[data-show="page"]').catch(() => undefined);
  await page.click('#shelves button[data-id="totale-q1"]');
  await page.waitForSelector('#formula:not([hidden]) .formula-operation', { timeout: 10_000 }).catch(() => problems.push('the builder did not open'));
  if ((await page.inputValue('#formula .formula-operation')) !== 'total') problems.push('the operation read from the code');
  // The range and the code stay inside the panel, with the preview in the page: they wrap.
  const inside = await page.evaluate(() => {
    // Their column: beside it the list of the fields, which they must not run under.
    const panel = document.querySelector('#formula .formula-main')!.getBoundingClientRect();
    return ['.formula-range-from', '.formula-range-to', '.formula-code'].map((selector) => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return box !== undefined && box.right <= panel.right + 0.5 && box.width > 0 ? '' : `${selector} ${box?.right} > ${panel.right}`;
    }).filter(Boolean);
  });
  if (inside.length > 0) problems.push(`out of the panel: ${inside.join(', ')}`);
  if ((await page.textContent('#formula .formula-code')) !== "total(vendite.range('mese', 'gennaio', 'febbraio').vendite)") problems.push(`the code shown: ${await page.textContent('#formula .formula-code')}`);
  if (code) {
    await page.waitForFunction(() => document.querySelector('#formula .formula-value')?.textContent === '1252,76', undefined, { timeout: 30_000 })
      .catch(async () => problems.push(`the value in the builder: ${await page.textContent('#formula .formula-value')}`));
  } else if (!(await page.textContent('#formula .formula-value'))?.includes('formula-unavailable')) problems.push(`without a worker: ${await page.textContent('#formula .formula-value')}`);
  // Mean instead of sum, the range taken away, saved.
  await page.selectOption('#formula .formula-operation', 'mean');
  await page.selectOption('#formula .formula-range-field', '');
  await page.keyboard.press('Control+s');
  if (!(await waitFor(() => read('calcoli.formula.md').includes('```python\nmean(vendite.vendite)\n```')))) problems.push(`the builder did not save: ${read('calcoli.formula.md')}`);
  if (code) {
    await page.waitForFunction(() => document.querySelector('#formula .formula-value')?.textContent === '626,38', undefined, { timeout: 30_000 })
      .catch(async () => problems.push(`the mean in the builder: ${await page.textContent('#formula .formula-value')}`));
  }
  // A field dragged from the palette into the inputs.
  await page.dragAndDrop('#formula .chart-field[data-field="vendite.pezzi"]', '#formula .formula-inputs');
  if (!(await page.textContent('#formula .formula-chips'))?.includes('vendite.pezzi')) problems.push('the field dragged into the inputs');
  await page.keyboard.press('Control+s');
  if (!(await waitFor(() => read('calcoli.formula.md').includes('vendite.pezzi}')))) problems.push('the input dragged was not saved');

  // Code written by hand: text, with the notice, never rewritten.
  await page.click('#shelves button[data-id="a-mano"]');
  await page.waitForFunction(() => window.docAppState.mode === 'text' && document.querySelector('#page-notice')?.textContent?.includes('Scritto a mano'), undefined, { timeout: 10_000 })
    .catch(() => problems.push('handwritten code did not open as text with the notice'));

  // A field dropped in the code: its name with the underscore, and its input.
  const before = read('calcoli.formula.md');
  const offset = before.indexOf('x * 3') + 'x * 3'.length;
  await page.evaluate((at) => {
    // The drop at the place of the offset: the coordinates of that character in the editor.
    const text = window.docAppState.text;
    const line = text.slice(0, at).split('\n').length - 1;
    const column = at - text.slice(0, at).lastIndexOf('\n') - 1;
    const element = document.querySelectorAll('.cm-content .cm-line')[line]!;
    const node = element.firstChild ?? element;
    const range = document.createRange();
    range.setStart(node, Math.min(column, node.textContent?.length ?? 0));
    const box = range.getBoundingClientRect();
    const transfer = new DataTransfer();
    transfer.setData('application/x-doc-field', 'vendite.pezzi');
    document.querySelector('.cm-content')!.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, clientX: box.left + 1, clientY: box.top + box.height / 2, bubbles: true, cancelable: true }));
  }, offset);
  await page.waitForFunction(() => window.docAppState.text.includes('x * 3vendite.pezzi') && window.docAppState.text.includes('{#a-mano inputs=vendite.pezzi}'), undefined, { timeout: 10_000 })
    .catch(async () => problems.push(`the drop in the code: ${(await page.evaluate(() => window.docAppState.text)).slice(-120)}`));
  await page.keyboard.press('Control+s');

  // A formula from the navigator into a text: a math line with its name.
  await page.click('#shelves button[data-id="sintesi"]');
  await page.waitForFunction(() => window.docAppState.file === 'sintesi.text.md', undefined, { timeout: 10_000 });
  await page.dragAndDrop('#shelves button[data-id="totale-q1"]', '.cm-content .cm-line:last-child');
  await page.waitForFunction(() => /`= totale_q1`.*`= totale_q1`/s.test(window.docAppState.text), undefined, { timeout: 10_000 })
    .catch(async () => problems.push(`the formula dropped in the text: ${await page.evaluate(() => window.docAppState.text)}`));
  await page.keyboard.press('Control+s');
  if (code) {
    // The text alone in the preview: its two math lines with the value of the formula.
    await page.evaluate(() => (window as unknown as { docApp: { showObject: (id: string) => Promise<void> } }).docApp.showObject('sintesi'));
    let preview = app.windows().find((p) => p.url().includes('/object/sintesi'));
    for (let i = 0; i < 50 && preview === undefined; i++) {
      await new Promise((r) => setTimeout(r, 100));
      preview = app.windows().find((p) => p.url().includes('/object/sintesi'));
    }
    if (!(await preview?.waitForFunction(() => [...document.querySelectorAll('[data-math-line]')].filter((element) => element.textContent === '626,38').length === 2, undefined, { timeout: 30_000 }).then(() => true).catch(() => false))) problems.push('the math lines with a name in the preview');
  }

  // The grid: the computed field with its sign, read only; a click opens its formula.
  await page.click('#shelves button[data-id="vendite"]');
  await page.waitForSelector('#grid:not([hidden]) .grid-heading.computed .grid-formula', { timeout: 10_000 }).catch(() => problems.push('no sign on the computed field'));
  if (code) {
    await page.waitForFunction(() => [...document.querySelectorAll('.grid-cell.computed')].map((cell) => cell.textContent).join() === '24,2600,14', undefined, { timeout: 30_000 })
      .catch(async () => problems.push(`the computed column: ${await page.evaluate(() => [...document.querySelectorAll('.grid-cell.computed')].map((cell) => cell.textContent).join())}`));
  }
  const data = read('vendite.tsv');
  await page.click('.grid-cell.computed >> nth=0');
  await page.waitForFunction(() => window.docAppState.file === 'calcoli.formula.md' && window.docAppState.mode === 'formula', undefined, { timeout: 10_000 })
    .catch(() => problems.push('a click on a computed value did not open its formula'));
  if ((await page.inputValue('#formula .formula-object')) !== 'doppio') problems.push('the formula of the column');
  if (read('vendite.tsv') !== data) problems.push('the data file changed');

  // «Campo calcolato»: a formula and its field, then the builder.
  await page.click('#shelves button[data-id="vendite"]');
  await page.waitForSelector('#grid:not([hidden]) .new-title');
  await page.fill('#grid .new-title', 'Con IVA');
  await page.click('#grid button[data-do="computed"]');
  await page.waitForFunction(() => window.docAppState.mode === 'formula', undefined, { timeout: 10_000 }).catch(() => problems.push('«Campo calcolato» did not open the builder'));
  if (!read('vendite.collection.md').includes('formula: "[[con-iva]]"')) problems.push('the field of «Campo calcolato»');
  if ((await page.inputValue('#formula .formula-object')) !== 'con-iva') problems.push('the builder on the new formula');
} finally {
  await app.close();
  rmSync(folder, { recursive: true, force: true });
  rmSync(userData, { recursive: true, force: true });
}
if (problems.length > 0) {
  console.log(`FAIL formulas in the app${code ? ' with Pyodide' : ''}\n  ${problems.join('\n  ')}`);
  process.exitCode = 1;
} else console.log(`ok   formulas in the app${code ? ', computed by Pyodide' : ', without Pyodide'}: builder, drags, handwritten code, grid read only, «Campo calcolato»`);
