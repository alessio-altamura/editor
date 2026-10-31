// End to end, with the Electron of the package and playwright-core: the app opens on
// a test folder, on the canvas; two texts are written with a double click, one is moved,
// archived and recalled from the navigator; the other gets a second card, which shows a
// change made from it on the first and is archived alone; the two are composed into an article.
// Back on the canvas: a search brings the view to a card, «+» writes a text next to a card,
// «Raccogli» brings the article near, «Metti in ordine per tipo» makes the groups, a collection
// shows its table on a card. In the page, a click on a record of the table opens the TSV at its
// line, and «Trasforma in collection» turns a text table into a collection. The grid of a
// collection: a number in Italian saved with the point, a block pasted, a field added, a wrong value marked.
// Then, in the page, a line typed in the editor reaches the preview, and a click on the
// preview brings the editor to the line where the element is written; changes not saved
// are asked about before changing file and before closing. On Linux it runs on the
// headless platform, without a screen.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import electronPath from 'electron';
import { _electron as electron, type Page } from 'playwright-core';
import { writeFixture } from './fixture.js';

const appFolder = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const folder = writeFixture({ collection: true });
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
  let main = app.windows().find((p) => p.url().includes('index.html'));
  while (main === undefined) {
    await app.waitForEvent('window');
    main = app.windows().find((p) => p.url().includes('index.html'));
  }
  // On the headless platform the window starts at 1×1: it takes its size once created.
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setContentSize(1400, 900));
  main.on('console', (message) => message.type() === 'error' && problems.push(`console: ${message.text()}`));
  main.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  await main.waitForSelector('#shelves button[data-id="nota"]');
  // The look of the app: Figtree loaded, the icons of the buttons each with its label.
  const look = await main.evaluate(async () => {
    await document.fonts.ready;
    return { figtree: document.fonts.check('475 13px "Figtree App"'), icons: document.querySelectorAll('button[data-icon] svg').length, unlabelled: document.querySelectorAll('button[data-icon]:not([aria-label])').length };
  });
  if (!look.figtree || look.icons < 5 || look.unlabelled > 0) problems.push(`the look: ${JSON.stringify(look)}`);

  // The canvas, at the opening: empty, the document has no canvas file yet.
  const box = (await main.locator('#viewport').boundingBox())!;
  const at = (x: number, y: number) => ({ x: box.x + x, y: box.y + y });
  const canvasFile = () => JSON.parse(readFileSync(join(folder, 'foglio.canvas'), 'utf8')) as { nodes: Array<{ file: string; subpath?: string; x: number; y: number }> };
  const nodeOf = (id: string) => canvasFile().nodes.find((n) => n.subpath === `#${id}`);
  if ((await main.evaluate(() => document.body.dataset.view)) !== 'canvas') problems.push('the app does not open on the canvas');
  const write = async (x: number, y: number, text: string, id: string) => {
    await main.mouse.dblclick(at(x, y).x, at(x, y).y);
    await main.waitForSelector('.card.editing .cm-content');
    await main.keyboard.type(text);
    await main.keyboard.press('Escape');
    await main.waitForSelector(`.card[data-id="${id}"]:not(.editing)`, { timeout: 5000 });
  };
  // With the plane moved by 40, 40 at 100%: a double click at 100, 60 of the viewport is 60, 20 of the canvas.
  await write(100, 60, 'Primo pensiero sul foglio.', 'primo-pensiero-sul-foglio');
  await write(100, 400, 'Secondo pensiero.', 'secondo-pensiero');
  const drawn = await main.evaluate(() => document.querySelector('.card[data-id="primo-pensiero-sul-foglio"] .card-body')?.shadowRoot?.textContent ?? '');
  if (!drawn.includes('Primo pensiero sul foglio.')) problems.push(`the card is not drawn: ${drawn}`);
  if (nodeOf('primo-pensiero-sul-foglio')?.x !== 60 || nodeOf('primo-pensiero-sul-foglio')?.y !== 20) problems.push(`the first card ${JSON.stringify(nodeOf('primo-pensiero-sul-foglio'))}`);

  // A click opens the source in the card; leaving it saves through the formatter.
  await main.click('.card[data-id="secondo-pensiero"] .card-body');
  await main.waitForSelector('.card[data-id="secondo-pensiero"].editing .cm-content');
  await main.keyboard.press('Control+End');
  await main.keyboard.type(' Aggiunto.');
  await main.keyboard.press('Escape');
  await main.waitForSelector('.card[data-id="secondo-pensiero"]:not(.editing)');
  if (!readFileSync(join(folder, 'foglio-texts.text.md'), 'utf8').includes('Secondo pensiero. Aggiunto.')) problems.push('the card did not save its source');
  // A double click opens the object alone in the page; then back to the canvas.
  await main.dblclick('.card[data-id="secondo-pensiero"] .card-body');
  await main.waitForFunction(() => window.docAppState?.view === 'page' && window.docAppState.file === 'foglio-texts.text.md', undefined, { timeout: 5000 })
    .catch(() => problems.push('the double click did not open the page'));
  for (let i = 0; i < 50 && !app.windows().some((p) => p.url().includes('/object/secondo-pensiero')); i++) await new Promise((r) => setTimeout(r, 100));
  if (!app.windows().some((p) => p.url().includes('/object/secondo-pensiero'))) problems.push('the preview of the object alone');
  await main.click('[data-show="canvas"]');
  await main.waitForSelector('#board .card[data-id="secondo-pensiero"]', { state: 'visible' });

  // Dragged by its head: 500 to the right.
  await main.mouse.move(at(150, 70).x, at(150, 70).y);
  await main.mouse.down();
  await main.mouse.move(at(400, 70).x, at(400, 70).y, { steps: 5 });
  await main.mouse.move(at(650, 70).x, at(650, 70).y, { steps: 5 });
  await main.mouse.up();
  await main.waitForFunction(() => (document.querySelector('.card[data-id="primo-pensiero-sul-foglio"]') as HTMLElement | null)?.style.left === '560px');
  await new Promise((r) => setTimeout(r, 300));
  if (nodeOf('primo-pensiero-sul-foglio')?.x !== 560) problems.push(`moved: ${JSON.stringify(nodeOf('primo-pensiero-sul-foglio'))}`);

  // Chosen with shift-click, archived: off the canvas, still in the navigator.
  await main.click('.card[data-id="primo-pensiero-sul-foglio"] .card-head', { modifiers: ['Shift'] });
  await main.click('#archive');
  await main.waitForSelector('.card[data-id="primo-pensiero-sul-foglio"]', { state: 'detached', timeout: 5000 });
  await main.waitForSelector('#shelves button[data-id="primo-pensiero-sul-foglio"][data-on-canvas="false"]', { timeout: 5000 });
  if (nodeOf('primo-pensiero-sul-foglio')) problems.push('archived but still in the canvas file');

  // Recalled by dragging it from the navigator onto the canvas: 700, 50 of the viewport is 660, 10.
  await main.dragAndDrop('#shelves button[data-id="primo-pensiero-sul-foglio"]', '#viewport', { targetPosition: { x: 700, y: 50 } });
  await main.waitForSelector('.card[data-id="primo-pensiero-sul-foglio"]', { timeout: 5000 });
  if (nodeOf('primo-pensiero-sul-foglio')?.x !== 660 || nodeOf('primo-pensiero-sul-foglio')?.y !== 10) problems.push(`recalled at ${JSON.stringify(nodeOf('primo-pensiero-sul-foglio'))}`);

  // Dragged again from the navigator: a second card of the same object, not a move of the first.
  const cardsOf = (id: string) => main.evaluate((object) => [...document.querySelectorAll<HTMLElement>(`.card[data-id="${object}"]`)].map((c) => c.dataset.node!), id);
  const [first] = await cardsOf('secondo-pensiero');
  await main.dragAndDrop('#shelves button[data-id="secondo-pensiero"]', '#viewport', { targetPosition: { x: 700, y: 400 } });
  await main.waitForFunction(() => document.querySelectorAll('.card[data-id="secondo-pensiero"]').length === 2, undefined, { timeout: 5000 });
  const other = (await cardsOf('secondo-pensiero')).find((node) => node !== first)!;
  if (canvasFile().nodes.filter((n) => n.subpath === '#secondo-pensiero').length !== 2) problems.push('two cards in the canvas file');
  // A change from one card shows on the other: the same object.
  await main.click(`.card[data-node="${other}"] .card-body`);
  await main.waitForSelector(`.card[data-node="${other}"].editing .cm-content`);
  await main.keyboard.press('Control+End');
  await main.keyboard.type(' Ovunque.');
  await main.keyboard.press('Escape');
  await main.waitForSelector(`.card[data-node="${other}"]:not(.editing)`);
  await main.waitForFunction((node) => document.querySelector(`.card[data-node="${node}"] .card-body`)?.shadowRoot?.textContent?.includes('Ovunque.'), first, { timeout: 5000 })
    .catch(() => problems.push('the change did not show on the other card'));
  // Archiving one card leaves the other, and the object stays on the canvas.
  // The card clicked to edit it is the one chosen.
  if ((await main.evaluate(() => [...document.querySelectorAll<HTMLElement>('.card.selected')].map((c) => c.dataset.node).join())) !== other) problems.push('the card edited is not the one chosen');
  await main.click('#archive');
  await main.waitForSelector(`.card[data-node="${other}"]`, { state: 'detached', timeout: 5000 });
  if ((await cardsOf('secondo-pensiero')).join() !== first) problems.push('archive took the other card too');
  if ((await main.getAttribute('#shelves button[data-id="secondo-pensiero"]', 'data-on-canvas')) !== 'true') problems.push('the object left the canvas with one card still on it');

  // Both chosen with a band; the order proposed is from the top: the first, then the second; corrected, then composed.
  await main.mouse.move(at(20, 15).x, at(20, 15).y);
  await main.mouse.down();
  await main.mouse.move(at(600, 400).x, at(600, 400).y, { steps: 5 });
  await main.mouse.move(at(1100, 700).x, at(1100, 700).y, { steps: 5 });
  await main.mouse.up();
  await main.click('#sequence-start');
  await main.waitForSelector('#order li');
  const proposed = await main.evaluate(() => [...document.querySelectorAll<HTMLElement>('#order li')].map((li) => li.dataset.id));
  if (JSON.stringify(proposed) !== '["primo-pensiero-sul-foglio","secondo-pensiero"]') problems.push(`the order proposed ${JSON.stringify(proposed)}`);
  const badge = await main.evaluate(() => document.querySelector('.card[data-id="secondo-pensiero"] .card-order')?.textContent);
  if (badge !== '2') problems.push(`the number on the card ${badge}`);
  await main.click('#order li:first-child button[title="Dopo"]');
  await main.fill('#compose-title', 'Dal foglio');
  await main.click('#compose');
  await main.waitForFunction(() => window.docAppState?.view === 'page' && window.docAppState.file === 'dal-foglio.article.md', undefined, { timeout: 5000 })
    .catch(async () => problems.push(`compose did not open the article: ${JSON.stringify(await main.evaluate(() => ({ ...window.docAppState, text: undefined })))}`));
  const article = readFileSync(join(folder, 'dal-foglio.article.md'), 'utf8');
  if (!article.endsWith('---\n![[secondo-pensiero]]\n\n![[primo-pensiero-sul-foglio]]\n') || !article.includes('title: Dal foglio')) problems.push(`the article ${JSON.stringify(article)}`);

  // Back on the canvas: the search brings the view to a card and marks it.
  await main.click('[data-show="canvas"]');
  await main.waitForSelector('#board .card[data-id="secondo-pensiero"]', { state: 'visible' });
  type Node = { id: string; type: string; x: number; y: number; width: number; height: number; label?: string; arrange?: string; subpath?: string; file?: string };
  const nodes = () => (canvasFile() as unknown as { nodes: Node[] }).nodes;
  const hit = (a: Node, b: Node) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  const holds = (g: Node, n: Node) => n.x >= g.x && n.y >= g.y && n.x + n.width <= g.x + g.width && n.y + n.height <= g.y + g.height;
  const overlapping = () => nodes().flatMap((a, i, all) => all.slice(i + 1).filter((b) => hit(a, b) && !(a.type === 'group' && holds(a, b)) && !(b.type === 'group' && holds(b, a))).map((b) => `${a.id}/${b.id}`));
  await main.fill('#find', 'ovunque');
  await main.waitForSelector('.card.found-current[data-id="secondo-pensiero"]', { timeout: 5000 });
  const centered = await main.evaluate(() => {
    const card = document.querySelector('.card.found-current')!.getBoundingClientRect();
    const view = document.getElementById('viewport')!.getBoundingClientRect();
    return [card.left + card.width / 2 - (view.left + view.width / 2), card.top + card.height / 2 - (view.top + view.height / 2)];
  });
  if (centered.some((d) => Math.abs(d) > 2)) problems.push(`the card found is not in the middle: ${centered.join()}`);
  if ((await main.textContent('#find-count')) !== '1/1') problems.push(`the count of the search: ${await main.textContent('#find-count')}`);
  await main.fill('#find', '');

  // «+» on a card: a new text next to it, and no card overlaps another.
  await main.click('.card[data-id="secondo-pensiero"] .card-plus');
  await main.waitForSelector('.card.editing .cm-content');
  await main.keyboard.type('Accanto al secondo.');
  await main.keyboard.press('Escape');
  await main.waitForSelector('.card[data-id="accanto-al-secondo"]', { timeout: 5000 });
  const second = nodes().find((n) => n.subpath === '#secondo-pensiero')!;
  const beside = nodes().find((n) => n.subpath === '#accanto-al-secondo');
  if (!beside || !((beside.x === second.x + second.width + 40 && beside.y === second.y) || (beside.x === second.x && beside.y === second.y + second.height + 40))) problems.push(`«+» not next to the card: ${JSON.stringify(beside)}`);
  if (overlapping().length > 0) problems.push(`overlaps after «+»: ${overlapping().join()}`);

  // «Raccogli» on the first text: the article that embeds it comes with a card of its own.
  await main.fill('#find', 'primo pensiero');
  await main.waitForSelector('.card.found-current[data-id="primo-pensiero-sul-foglio"]');
  await main.click('.card[data-id="primo-pensiero-sul-foglio"] .card-gather');
  await main.waitForSelector('.card[data-id="dal-foglio"]', { timeout: 5000 });
  const hub = nodes().find((n) => n.subpath === '#primo-pensiero-sul-foglio')!;
  const tied = nodes().find((n) => n.file === 'dal-foglio.article.md')!;
  if (Math.abs(tied.x - hub.x) > 800 || Math.abs(tied.y - hub.y) > 600) problems.push(`gather: not near ${JSON.stringify([hub, tied])}`);
  if (overlapping().length > 0) problems.push(`overlaps after gather: ${overlapping().join()}`);

  // «Metti in ordine per tipo»: a group for each kind, drawn on the canvas.
  await main.click('#arrange-kind');
  await main.waitForSelector('.group.arranged[data-label="text"]', { timeout: 5000 });
  const labels = nodes().filter((n) => n.arrange === 'kind').map((n) => n.label);
  if (JSON.stringify(labels) !== '["article","text"]') problems.push(`arrange by kind: ${JSON.stringify(labels)}`);
  if (overlapping().length > 0) problems.push(`overlaps after arrange: ${overlapping().join()}`);

  // A collection on the canvas: its card shows the table, numbers on the right with fixed decimals.
  await main.dragAndDrop('#shelves button[data-id="vendite"]', '#viewport', { targetPosition: { x: 300, y: 300 } });
  await main.waitForSelector('.card[data-id="vendite"]', { timeout: 5000 });
  const table = await main.evaluate(() => [...(document.querySelector('.card[data-id="vendite"] .card-body')?.shadowRoot?.querySelectorAll('tbody td') ?? [])].map((td) => `${td.textContent}|${getComputedStyle(td).textAlign}`));
  if (JSON.stringify(table.slice(0, 6)) !== '["gennaio|left","1250,50|right","12|right","febbraio|left","2,26|right","1300|right"]') problems.push(`the card of the collection: ${JSON.stringify(table)}`);
  await main.click('[data-show="page"]');
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
  // The text of a text file is written in Petrona, loaded because it is used.
  const prose = await main.evaluate(async () => {
    await document.fonts.ready;
    const content = document.querySelector('#editor .cm-editor.cm-prose .cm-content');
    return { prose: content !== null && getComputedStyle(content).fontFamily.includes('Petrona App'), loaded: document.fonts.check('470 16.55px "Petrona App"') };
  });
  if (!prose.prose || !prose.loaded) problems.push(`the font of the text: ${JSON.stringify(prose)}`);

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
  // The grid of a collection: «1,5» in a number field becomes 1.5 in the TSV, the preview follows; a block pasted, a field added, a wrong value marked.
  await main.click('#shelves button[data-id="vendite"]');
  await main.waitForSelector('#grid .grid-cell[data-row="0"][data-column="1"]', { timeout: 5000 });
  if ((await main.evaluate(() => window.docAppState.mode)) !== 'grid') problems.push('a collection does not open in the grid');
  await main.click('#grid .grid-cell[data-row="0"][data-column="1"]');
  await main.keyboard.press('Enter');
  await main.waitForSelector('#grid .grid-editor');
  await main.keyboard.press('Control+A');
  await main.keyboard.type('1,5');
  await main.keyboard.press('Enter');
  const shown = await main.textContent('#grid .grid-cell[data-row="0"][data-column="1"]');
  if (shown !== '1,50') problems.push(`the cell shows ${shown}`);
  await page.waitForFunction(() => [...document.querySelectorAll('[data-node="vendite"] td')].some((td) => td.textContent === '1,50'), undefined, { timeout: 5000 })
    .catch(() => problems.push('the preview did not follow the grid'));
  // A block of 2 records and 3 values from a spreadsheet, from the third record: the fourth is added.
  await app.evaluate(({ clipboard }) => clipboard.writeText('aprile\t3,25\t9\nmaggio\t4\t10\n'));
  await main.click('#grid .grid-cell[data-row="2"][data-column="0"]');
  await main.keyboard.press('Control+V');
  await main.waitForSelector('#grid .grid-cell[data-row="3"][data-column="0"]', { timeout: 5000 })
    .catch(() => problems.push('the paste did not add a record'));
  // A field added, and a value that is not an integer, kept and marked.
  await main.fill('#grid .new-title', 'Note del mese');
  await main.click('#grid button[data-do="add-field"]');
  await main.waitForFunction(() => [...document.querySelectorAll('#grid .grid-heading')].some((cell) => cell.textContent?.startsWith('Note del mese')), undefined, { timeout: 5000 })
    .catch(() => problems.push('the field was not added'));
  await main.click('#grid .grid-cell[data-row="1"][data-column="2"]');
  await main.keyboard.type('molti');
  await main.keyboard.press('Enter');
  if ((await main.getAttribute('#grid .grid-cell[data-row="1"][data-column="2"]', 'aria-invalid')) !== 'true') problems.push('the wrong value is not marked');
  await main.keyboard.press('Control+S');
  await main.waitForFunction(() => !document.title.includes('*'), undefined, { timeout: 500 }).catch(() => undefined);
  await new Promise((r) => setTimeout(r, 500));
  const tsv = readFileSync(join(folder, 'vendite.tsv'), 'utf8');
  if (tsv !== 'mese\tvendite\tpezzi\tnote-del-mese\ngennaio\t1.5\t12\t\nfebbraio\t2.255\tmolti\t\naprile\t3.25\t9\t\nmaggio\t4\t10\t\n') problems.push(`the TSV saved: ${JSON.stringify(tsv)}`);
  if (!readFileSync(join(folder, 'vendite.collection.md'), 'utf8').includes('  - name: note-del-mese\n    type: string\n    title: Note del mese\n')) problems.push(`the descriptor: ${readFileSync(join(folder, 'vendite.collection.md'), 'utf8')}`);
  // The table of the collection in the preview: a click on a record opens the TSV at its line.
  await page.click('[data-node="vendite"] tbody tr:nth-child(2) td');
  await main.waitForFunction(() => window.docAppState?.file === 'vendite.tsv' && window.docAppState.line === 2, undefined, { timeout: 5000 })
    .catch(async () => problems.push(`the click on a record: ${JSON.stringify(await main.evaluate(() => ({ ...window.docAppState, text: undefined })))}`));
  // «Trasforma in collection» from the editor, with the cursor in the table of a text.
  await main.click('#shelves button[data-id="prezzi"]');
  await main.waitForFunction(() => window.docAppState?.file === 'prezzi.text.md');
  await main.click('.cm-content .cm-line >> nth=7');
  await main.waitForSelector('#turn-into:not([hidden])', { timeout: 5000 });
  await main.click('#turn-into');
  await main.waitForFunction(() => window.docAppState?.file === 'prezzi.collection.md', undefined, { timeout: 5000 })
    .catch(() => problems.push('«Trasforma in collection» did not open the collection'));
  if (existsSync(join(folder, 'prezzi.text.md')) || !existsSync(join(folder, 'prezzi.tsv'))) problems.push('the files of «Trasforma in collection»');
  await main.click('#shelves button[data-id="nota"]');
  await main.waitForFunction(() => window.docAppState?.file === 'nota.text.md');

  // The preview in a window of its own: the page gives its column to the editor; a change
  // reaches it, a click on it brings the editor of the main window to the line; closing it
  // brings it back to the page.
  const separate = () => app.windows().find((p) => p.url().includes('detached.html'));
  await main.click('#detach');
  for (let i = 0; i < 100 && separate() === undefined; i++) await new Promise((r) => setTimeout(r, 50));
  if (separate() === undefined) problems.push('no separate window of the preview');
  if (!(await main.evaluate(() => document.body.classList.contains('preview-detached') && getComputedStyle(document.getElementById('preview')!).display === 'none'))) problems.push('the page kept the column of the preview');
  const apart = await preview();
  await main.click('.cm-content');
  await main.keyboard.press('Control+End');
  await main.keyboard.type(' Nella finestra.');
  await apart.waitForFunction(() => document.querySelector('[data-node="nota"]')?.textContent?.includes('Nella finestra.'), undefined, { timeout: 5000 })
    .catch(() => problems.push('the separate preview did not follow the change'));
  await answerDialogs(0);
  await apart.click('h2');
  await main.waitForFunction(() => window.docAppState?.file === 'cap.chapter.md' && window.docAppState.line === 4, undefined, { timeout: 5000 })
    .catch(async () => problems.push(`the click on the separate preview: ${JSON.stringify(await main.evaluate(() => ({ ...window.docAppState, text: undefined })))}`));
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('detached.html'))?.close());
  await main.waitForFunction(() => !document.body.classList.contains('preview-detached'), undefined, { timeout: 5000 })
    .catch(() => problems.push('closing the separate window did not bring the preview back'));
  // Apart again: so it is at the next opening of the app.
  await main.click('#detach');
  for (let i = 0; i < 100 && separate() === undefined; i++) await new Promise((r) => setTimeout(r, 50));
  await main.click('#shelves button[data-id="nota"]');
  await main.waitForFunction(() => window.docAppState?.file === 'nota.text.md');
  // Closing with a change not saved: asked once, and saved.
  await main.click('.cm-content');
  await main.keyboard.press('Control+End');
  await main.keyboard.type(' Prima di chiudere.');
  await answerDialogs(0);
  const closed = app.waitForEvent('close');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('index.html'))?.close());
  await closed;
  if (!readFileSync(join(folder, 'nota.text.md'), 'utf8').includes('Prima di chiudere.')) problems.push('the changes were not saved before closing');
  // Opened again: the preview is where it was, in its own window.
  const again = await electron.launch({ executablePath: electronPath as unknown as string, args, env: { ...process.env, NODE_OPTIONS: '' } });
  try {
    let window = again.windows().find((p) => p.url().includes('index.html'));
    while (window === undefined) {
      await again.waitForEvent('window');
      window = again.windows().find((p) => p.url().includes('index.html'));
    }
    await window.waitForFunction(() => document.body.classList.contains('preview-detached'), undefined, { timeout: 10_000 })
      .catch(() => problems.push('the separate preview was not remembered'));
    if (!again.windows().some((p) => p.url().includes('detached.html'))) problems.push('no separate window at the opening');
  } finally {
    await again.close().catch(() => undefined);
  }
} catch (error) {
  problems.push(String(error).split('\n').slice(0, 8).join(' / '));
  // What the window shows, to see why.
  if (process.env.E2E_SCREENSHOT) {
    const main = app.windows().find((p) => p.url().includes('index.html'));
    await main?.screenshot({ path: process.env.E2E_SCREENSHOT }).catch(() => undefined);
    problems.push(`canvas file: ${(() => { try { return readFileSync(join(folder, 'foglio.canvas'), 'utf8').replace(/\s+/g, ' '); } catch (e) { return String(e); } })()}`);
    problems.push(`notice: ${await main?.evaluate(() => document.getElementById('notice')?.textContent).catch(String)}`);
    problems.push(`cards: ${JSON.stringify(await main?.evaluate(() => [...document.querySelectorAll<HTMLElement>('.card')].map((c) => `${c.dataset.id}|${c.className}`)).catch(String))}`);
  }
  for (const page of app.windows()) {
    const seen = await page.evaluate(() => ({ api: typeof (window as unknown as { docApp?: unknown }).docApp, visibility: document.visibilityState, size: [innerWidth, innerHeight], nota: document.querySelector('[data-node="nota"] p')?.getBoundingClientRect().toJSON() ?? null })).catch((e: unknown) => String(e));
    problems.push(`${page.url()}: ${JSON.stringify(seen)}`);
  }
} finally {
  await app.close().catch(() => undefined);
  rmSync(folder, { recursive: true, force: true });
  rmSync(userData, { recursive: true, force: true });
}
if (problems.length === 0) console.log('ok   the canvas: write, move, archive, recall, two cards of one object, compose, search, «+», gather, arrange, a collection; the page: typing reaches the preview, a click on it brings the editor to the line\n\napp end-to-end: all pass');
else {
  console.log(`FAIL the app end to end\n  ${problems.join('\n  ')}\n\napp end-to-end: 1 failed`);
  process.exitCode = 1;
}
