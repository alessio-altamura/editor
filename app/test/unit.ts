// The functions behind the IPC of the app, without Electron: the Session over a folder,
// and where the cursor goes after the formatter.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GridModel } from '../src/grid-model.js';
import { mapOffset } from '../src/offset.js';
import { Session } from '../src/session.js';
import { placeWindow } from '../src/window-place.js';
import { PRICES, SALES, SALES_TSV, writeFixture } from './fixture.js';

let failed = 0;
const check = (label: string, problems: string[]) => {
  if (problems.length === 0) console.log(`ok   ${label}`);
  else {
    failed++;
    console.log(`FAIL ${label}\n  ${problems.join('\n  ')}`);
  }
};
const until = async (test: () => boolean, ms = 3000) => {
  const end = Date.now() + ms;
  while (!test() && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
  return test();
};

// mapOffset: before the change, after it, inside it.
{
  const problems: string[] = [];
  const before = 'id: a\nkind: text\n---\ntesto con il cursore';
  const after = 'id: a\nkind: text\ntags: []\n---\ntesto con il cursore';
  if (mapOffset(before, after, 3) !== 3) problems.push('before the change');
  if (mapOffset(before, after, before.indexOf('cursore')) !== after.indexOf('cursore')) problems.push('after the change');
  if (mapOffset('abc', 'abc', 2) !== 2) problems.push('no change');
  const middle = mapOffset('a\n\n\n\nb', 'a\n\nb', 3);
  if (middle < 1 || middle > 3) problems.push(`inside the change: ${middle}`);
  check('mapOffset keeps the cursor near where it was', problems);
}

const folder = writeFixture();
const session = await Session.open(folder);
try {
  {
    const problems: string[] = [];
    const shelves = session.navigator();
    if (shelves.map((s) => s.kind).join() !== 'article,chapter,concept,text') problems.push(`shelves ${shelves.map((s) => s.kind).join()}`);
    if (shelves[0]?.items[0]?.title !== 'Il rapporto') problems.push('the title of the article');
    if (session.navigator('somma').flatMap((s) => s.items.map((i) => i.id)).join() !== 'nota') problems.push('search by title or first words');
    if (session.navigator('ide').flatMap((s) => s.items.map((i) => i.id)).join() !== 'idea') problems.push('search by id');
    check('navigator: shelves by kind, compositions first, search', problems);
  }
  {
    const problems: string[] = [];
    if (session.file('../fuori.md') !== null || session.file('/etc/passwd') !== null) problems.push('a path outside the folder');
    let thrown = false;
    try {
      session.read('../fuori.md');
    } catch {
      thrown = true;
    }
    if (!thrown) problems.push('read outside the folder');
    check('paths outside the folder are refused', problems);
  }
  {
    const problems: string[] = [];
    if (!session.diagnostics('cap.chapter.md').some((d) => d.code === 'composition-content')) problems.push('composition-content');
    // A buffer not saved holds at once: an error typed in the editor.
    let updates = 0;
    const stop = session.onUpdate(() => updates++);
    session.edit('nota.text.md', '---\nid: nota\nkind: text\ntags: []\n---\nVedi [[manca]].\n');
    await until(() => updates > 0);
    const unresolved = session.diagnostics('nota.text.md').find((d) => d.code === 'reference-unresolved');
    if (!unresolved || unresolved.range.start.line !== 5) problems.push(`the unsaved buffer: ${JSON.stringify(session.diagnostics('nota.text.md'))}`);
    if (readFileSync(join(folder, 'nota.text.md'), 'utf8').includes('manca')) problems.push('edit wrote the file');
    session.edit('nota.text.md', '---\nid: nota\nkind: text\ntags: []\n---\nLa somma fa `= 2 * 21`, vedi [[cap]].\n');
    updates = 0;
    await until(() => updates > 0);
    stop();
    if (session.diagnostics('nota.text.md').length !== 0) problems.push('the error stays');
    check('diagnostics, and an unsaved buffer that holds at once', problems);
  }
  {
    const problems: string[] = [];
    const text = session.read('nota.text.md');
    const items = session.complete('cap.chapter.md', '![[', { line: 0, character: 3 }).map((i) => i.label).sort().join();
    if (items !== 'nota') problems.push(`complete after ![[: ${items}`);
    const hover = session.hover('nota.text.md', text, { line: 5, character: 15 });
    if (!hover?.markdown.includes('42')) problems.push(`hover on the math line: ${JSON.stringify(hover)}`);
    if (session.definition('nota.text.md', text, { line: 5, character: 33 }) !== 'cap.chapter.md') problems.push('definition');
    check('completion, hover, definition', problems);
  }
  {
    const problems: string[] = [];
    if (session.articleFor('nota.text.md') !== 'report' || session.articleFor('idea.concept.md') !== 'report' || session.articleFor(null) !== 'report') problems.push('articleFor');
    const url = session.previewUrl('report');
    const page = await fetch(url);
    const html = await page.text();
    if (page.status !== 200 || !page.headers.get('content-security-policy')?.includes("script-src 'self'") || !html.includes('data-source=')) problems.push(`preview ${page.status}`);
    if ((await fetch(url.replace(/token=[^&]*/, 'token=x'))).status !== 403) problems.push('the preview without its code');
    if (!session.isPreview(url) || session.isPreview('https://example.com/')) problems.push('isPreview');
    check('the preview of the article of a file, from serve on the same runtime', problems);
  }
  {
    const problems: string[] = [];
    const written = session.save('idea.concept.md', '---\nkind: concept\nid: idea\n---\nUn concetto.\n\n\n');
    if (written !== '---\nid: idea\nkind: concept\ntags: []\n---\nUn concetto.\n') problems.push(`save through the formatter: ${JSON.stringify(written)}`);
    if (readFileSync(join(folder, 'idea.concept.md'), 'utf8') !== written) problems.push('not on disk');
    const extracted = session.extract('cap.chapter.md', session.read('cap.chapter.md'));
    if (extracted.error || !extracted.written.includes('cap-texts.text.md')) problems.push(`extract ${JSON.stringify(extracted)}`);
    if (session.diagnostics('cap.chapter.md').length !== 0) problems.push('composition-content stays');
    check('save through the formatter, and «Estrai in un oggetto»', problems);
  }
  {
    // The canvas: a text created where it was double-clicked, the card drawn as it will appear, moved, archived, recalled, composed.
    const problems: string[] = [];
    if (session.canvas().canvas !== null) problems.push('a canvas before the first operation');
    const made = session.createText({ x: 100, y: 80 }, 'Un pensiero sul foglio.');
    const id = String(made.summary?.id);
    if (made.error || id !== 'un-pensiero-sul-foglio') problems.push(`createText ${JSON.stringify(made)}`);
    session.recall('nota', { x: 600, y: 60 });
    const { canvas, cards } = session.canvas();
    const card = cards.find((c) => c.id === id);
    if (canvas !== 'foglio.canvas' || card?.x !== 100 || card.kind !== 'text') problems.push(`canvas ${JSON.stringify({ canvas, cards: cards.map(({ html: _html, ...rest }) => rest) })}`);
    if (!card?.html?.includes('Un pensiero sul foglio.') || !card.html.includes('data-kind="text"')) problems.push('the card is not drawn by the renderer');
    if (!cards.find((c) => c.id === 'nota')?.html?.includes('data-math-line')) problems.push('the math line of nota');
    const source = session.objectSource(id);
    if (source.file !== 'foglio-texts.text.md' || source.text !== `{#${id}}\n\nUn pensiero sul foglio.` || !source.before.startsWith('---\nkind: text')) problems.push(`objectSource ${JSON.stringify(source)}`);
    if (session.objectSource('nota').before !== '' || session.objectSource('nota').text !== session.read('nota.text.md')) problems.push('objectSource of a file of its own');
    const nodeOf = (object: string) => session.canvas().cards.find((c) => c.id === object)!.node;
    const both = [nodeOf('nota'), nodeOf(id)];
    if (JSON.stringify(session.readingOrder(both)) !== JSON.stringify([nodeOf(id), nodeOf('nota')])) problems.push(`readingOrder ${JSON.stringify(session.readingOrder(both))}`);
    session.place(id, { x: 700, y: 400 });
    if (JSON.stringify(session.readingOrder(both)) !== JSON.stringify(both)) problems.push('readingOrder after place');
    // A second card of nota: the same object, place and archive of one card only.
    const second = String(session.recall('nota', { x: 1200, y: 0 }).summary?.node);
    const notas = () => session.canvas().cards.filter((c) => c.id === 'nota');
    const pair = notas();
    if (pair.length !== 2 || pair[0]!.html !== pair[1]!.html) problems.push(`two cards of nota: ${pair.length}`);
    if (!session.place('nota', { x: 0, y: 0 }).error) problems.push('place without the card, with two');
    session.place('nota', { x: 1200, y: 50 }, second);
    if (notas().find((c) => c.node === second)?.y !== 50) problems.push('place of one card');
    session.archive('nota', second);
    if (notas().length !== 1) problems.push('archive of one card');
    session.archive('nota');
    if (session.canvas().cards.some((c) => c.id === 'nota')) problems.push('archive');
    const shelf = session.navigator().find((s) => s.kind === 'text')?.items ?? [];
    if (shelf.find((i) => i.id === 'nota')?.onCanvas !== false || shelf.find((i) => i.id === id)?.onCanvas !== true) problems.push(`navigator onCanvas ${JSON.stringify(shelf)}`);
    if (!session.archive('nota').error) problems.push('archive twice');
    session.recall('nota', { x: 0, y: 0 });
    const composed = session.compose([id, 'nota'], 'Dal foglio');
    if (composed.error || composed.summary?.file !== 'dal-foglio.article.md') problems.push(`compose ${JSON.stringify(composed)}`);
    if (readFileSync(join(folder, 'dal-foglio.article.md'), 'utf8') !== `---\nid: dal-foglio\nkind: article\ntags: []\ntitle: Dal foglio\n---\n![[${id}]]\n\n![[nota]]\n`) problems.push('the article composed');
    if (!session.compose(['idea'], 'Con un concetto').error) problems.push('compose of a concept');
    const page = await fetch(session.objectPreviewUrl(id));
    if (page.status !== 200 || !(await page.text()).includes('Un pensiero sul foglio.')) problems.push(`the preview of the object alone: ${page.status}`);
    check('the canvas: create, cards, source of an object, place, archive, recall, reading order, compose', problems);
  }
  {
    // Order on the canvas: a text next to a card, gather, arrange by kind with its groups, a card enlarged.
    const problems: string[] = [];
    const nodeOf = (object: string) => session.canvas().cards.find((c) => c.id === object)!.node;
    const nota = nodeOf('nota');
    const beside = session.besidePlace(nota);
    const near = session.createNear('nota', nota, 'Vicino alla nota.');
    const made = session.canvas().cards.find((c) => c.id === near.summary?.id);
    if (near.error || made?.x !== beside?.x || made?.y !== beside?.y) problems.push(`createNear ${JSON.stringify({ near, beside, made: made && [made.x, made.y] })}`);
    // nota links to cap: gather brings a card of cap (recalled) around nota.
    const gathered = session.gather('nota', nota);
    if (gathered.error || !JSON.stringify(gathered.summary?.gathered).includes('"cap"')) problems.push(`gather ${JSON.stringify(gathered)}`);
    if (!session.canvas().cards.some((c) => c.id === 'cap')) problems.push('gather did not recall cap');
    const arranged = session.arrange('kind');
    const groups = session.canvas().groups;
    if (arranged.error || !groups.some((g) => g.label === 'text' && g.arrange === 'kind') || !groups.some((g) => g.label === 'chapter')) problems.push(`arrange ${JSON.stringify({ arranged, groups })}`);
    const enlarged = session.place('nota', undefined, nota, { width: 500, height: 400 });
    const card = session.canvas().cards.find((c) => c.node === nota);
    if (enlarged.error || card?.width !== 500 || card.height !== 400) problems.push(`place with a size ${JSON.stringify(enlarged)}`);
    check('order on the canvas: a text near, gather, arrange, a card enlarged', problems);
  }
  {
    // Each card numbers as its object alone: two chapters, each «1», its sub-chapter «1.1».
    const problems: string[] = [];
    writeFileSync(join(folder, 'altro.chapter.md'), '---\nid: altro\nkind: chapter\ntags: []\ntitle: Un altro capitolo\n---\n![[sotto]]\n');
    writeFileSync(join(folder, 'sotto.chapter.md'), '---\nid: sotto\nkind: chapter\ntags: []\ntitle: Il sotto-capitolo\n---\n');
    session.live.recompute();
    for (const id of ['altro', 'sotto']) session.recall(id);
    if (!session.canvas().cards.some((c) => c.id === 'cap')) session.recall('cap');
    const numbers = (id: string) => [...(session.canvas().cards.find((c) => c.id === id)?.html ?? '').matchAll(/<span data-number>([^<]*)<\/span>/g)].map((m) => m[1]);
    if (JSON.stringify(numbers('cap')) !== '["1"]') problems.push(`cap ${JSON.stringify(numbers('cap'))}`);
    if (JSON.stringify(numbers('altro')) !== '["1","1.1"]') problems.push(`altro ${JSON.stringify(numbers('altro'))}`);
    if (JSON.stringify(numbers('sotto')) !== '["1"]') problems.push(`sotto ${JSON.stringify(numbers('sotto'))}`);
    check('each card numbers as its object alone', problems);
  }
  {
    // Collections: the data file of a descriptor, the card with its table, a diagnostic in the TSV, «Trasforma in collection».
    const problems: string[] = [];
    writeFileSync(join(folder, 'vendite.collection.md'), SALES);
    writeFileSync(join(folder, 'vendite.tsv'), SALES_TSV.replace('marzo\t\t7', 'marzo\tmolte\t7'));
    writeFileSync(join(folder, 'prezzi.text.md'), PRICES);
    session.live.recompute();
    if (session.dataFile('vendite.collection.md') !== 'vendite.tsv') problems.push(`dataFile ${session.dataFile('vendite.collection.md')}`);
    if (!session.navigator().some((shelf) => shelf.kind === 'collection' && shelf.items.some((item) => item.id === 'vendite' && item.title === 'Vendite e pezzi venduti per mese.'))) problems.push(`the label of a collection in the navigator: ${JSON.stringify(session.navigator().find((shelf) => shelf.kind === 'collection'))}`);
    session.recall('vendite');
    const html = session.canvas().cards.find((c) => c.id === 'vendite')?.html ?? '';
    if (!html.includes('<table') || !/text-align: right[^>]*>1250,50</.test(html) || !/<caption data-description><p[^>]*>Vendite e pezzi/.test(html)) problems.push(`the card of the collection: ${html.slice(html.indexOf('<table')).replace(/ style="[^"]*"/g, '').slice(0, 400)}`);
    const wrong = session.diagnostics('vendite.tsv').find((d) => d.code === 'collection-value-invalid');
    if (wrong?.range.start.line !== 3 || wrong.range.start.character !== 6) problems.push(`the diagnostic in the TSV: ${JSON.stringify(session.diagnostics('vendite.tsv'))}`);
    const text = session.read('prezzi.text.md');
    if (session.tableAt('prezzi.text.md', text, 6) !== 'prezzi' || session.tableAt('nota.text.md', session.read('nota.text.md'), 5) !== null) problems.push('tableAt');
    const turned = session.turnInto('prezzi.text.md', text, 6);
    if (turned.error || turned.summary?.file !== 'prezzi.collection.md' || readFileSync(join(folder, 'prezzi.tsv'), 'utf8') !== 'prodotto\tprezzo\npenna\t1.5\nquaderno\t2.25\n') problems.push(`turnInto ${JSON.stringify(turned)}`);
    check('collections: data file, card with the table, diagnostics in the TSV, «Trasforma in collection»', problems);
  }
  {
    // The model of the grid: edit in Italian, paste a block, records and fields added, removed and moved, undo and redo.
    const problems: string[] = [];
    const grid = new GridModel({
      descriptor: 'vendite.collection.md', data: 'vendite.tsv', extension: 'tsv', lang: 'it',
      fields: [{ name: 'mese', type: 'string', title: 'Mese' }, { name: 'vendite', type: 'number' }, { name: 'pezzi', type: 'integer' }, { name: 'stato', type: 'string', categories: ['aperto', 'chiuso'] }],
      primaryKey: 'mese',
      text: 'mese\tvendite\tpezzi\tstato\ngennaio\t1250.5\t12\taperto\nfebbraio\t2.255\t1300\tchiuso\n',
    });
    if (grid.heading(0) !== 'Mese' || grid.type(1) !== 'number' || grid.display(0, 1) !== '1250,50' || grid.editText(0, 1) !== '1250,5') problems.push(`reading: ${grid.heading(0)} ${grid.display(0, 1)} ${grid.editText(0, 1)}`);
    grid.setCell(0, 1, grid.fileValue(1, '1,5'));
    if (grid.records[0]![1] !== '1.5' || grid.display(0, 1) !== '1,50' || !grid.dirty) problems.push(`1,5 in Italian: ${grid.records[0]![1]} ${grid.display(0, 1)}`);
    grid.setCell(1, 2, grid.fileValue(2, 'molti'));
    if (grid.state(1, 2) !== 'invalid' || grid.records[1]![2] !== 'molti') problems.push('a value not of its type is kept and marked');
    grid.setCell(0, 3, 'sospeso');
    if (grid.state(0, 3) !== 'invalid') problems.push('a value outside the categories');
    const pasted = grid.paste(1, 1, '3,25\t7\taperto\n4\t8\tchiuso\n');
    if (pasted.rows !== 2 || grid.records.length !== 3 || grid.records[2]!.join('|') !== '|4|8|chiuso' || grid.records[1]![1] !== '3.25') problems.push(`paste: ${JSON.stringify(grid.records)}`);
    if (grid.copy(1, 1, 2, 2) !== '3,25\t7\n4\t8\n') problems.push(`copy: ${JSON.stringify(grid.copy(1, 1, 2, 2))}`);
    grid.insertRecord(1);
    grid.moveRecord(0, 1);
    if (grid.records[1]![0] !== 'gennaio' || grid.records[0]!.join('') !== '') problems.push(`insert and move: ${JSON.stringify(grid.records)}`);
    grid.removeRecord(0);
    const name = grid.addField('Vendite in euro', 'number');
    grid.setField(0, 'title', 'Il mese');
    grid.setField(3, 'type', 'string');
    if (name !== 'vendite-in-euro' || JSON.stringify(grid.descriptorFields()) !== '[{"name":"mese","type":"string","title":"Il mese"},{"name":"vendite","type":"number"},{"name":"pezzi","type":"integer"},{"name":"stato","type":"string","categories":["aperto","chiuso"]},{"name":"vendite-in-euro","type":"number","title":"Vendite in euro"}]') problems.push(`fields: ${JSON.stringify(grid.descriptorFields())}`);
    grid.removeField(2);
    if (grid.dataText() !== 'mese\tvendite\tstato\tvendite-in-euro\ngennaio\t1.5\tsospeso\t\nfebbraio\t3.25\taperto\t\n\t4\tchiuso\t\n') problems.push(`the TSV: ${JSON.stringify(grid.dataText())}`);
    // Undo everything back to the file as read, then redo one step.
    while (grid.undo()) { /* back to the start */ }
    if (grid.dataText() !== 'mese\tvendite\tpezzi\tstato\ngennaio\t1250.5\t12\taperto\nfebbraio\t2.255\t1300\tchiuso\n' || grid.dirty) problems.push(`undo: ${JSON.stringify(grid.dataText())}`);
    grid.redo();
    if (grid.records[0]![1] !== '1.5') problems.push('redo');
    grid.setCell(0, 0, 'tab\tin un valore');
    if (grid.records[0]![0] !== 'tab\tin un valore' || !grid.dataText().includes('tab in un valore')) problems.push('a tab in a value is written as a space');
    check('the model of the grid: edit, paste, copy, records, fields, undo', problems);
  }
  // The separate window of the preview: where it was, on its screen; else on the primary screen, centred.
  {
    const problems: string[] = [];
    const primary = { id: 1, workArea: { x: 0, y: 25, width: 1440, height: 875 } };
    const second = { id: 2, workArea: { x: 1440, y: 0, width: 1920, height: 1080 } };
    const saved = { bounds: { x: 1600, y: 100, width: 800, height: 900 }, display: 2 };
    if (JSON.stringify(placeWindow(saved, [primary, second], primary)) !== JSON.stringify(saved.bounds)) problems.push('on its screen');
    const gone = placeWindow(saved, [primary], primary);
    if (JSON.stringify(gone) !== JSON.stringify({ x: 320, y: 25, width: 800, height: 875 })) problems.push(`its screen gone: ${JSON.stringify(gone)}`);
    const off = placeWindow({ bounds: { x: 3330, y: 100, width: 800, height: 600 }, display: 2 }, [primary, second], primary);
    if (off.x !== 320 || off.width !== 800) problems.push(`off its screen: ${JSON.stringify(off)}`);
    const first = placeWindow(undefined, [primary], primary);
    if (first.width !== 900 || first.height !== 875 || first.x !== 270) problems.push(`never placed: ${JSON.stringify(first)}`);
    check('the separate preview: on its screen, or on the primary one when its screen is gone', problems);
  }

  // The contrast of the tokens, light and dark: text at least 4.5:1 (WCAG AA).
  {
    const problems: string[] = [];
    const css = readFileSync(new URL('../src/renderer/style.css', import.meta.url), 'utf8');
    const dark = css.indexOf('@media (prefers-color-scheme: dark)');
    const tokens = (selector: string, inDark: boolean): Record<string, string> => {
      const part = inDark ? css.slice(dark) : css.slice(0, dark);
      const body = new RegExp(`${selector.replace(/[[\]"=]/g, (c) => `\\${c}`)}\\s*\\{([^}]*)\\}`).exec(part)?.[1] ?? '';
      return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
    };
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const ratio = (a: string, b: string) => {
      const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
      return (x! + 0.05) / (y! + 0.05);
    };
    const grounds = ['ground', 'panel', 'surface', 'sheet', 'card', 'plane', 'head-bg', 'hover'];
    const pairs = [...grounds.flatMap((g) => [['text', g], ['muted', g]]), ['active-text', 'active'], ['on-accent', 'accent'], ['accent', 'panel'], ['accent', 'sheet'], ['accent', 'surface'], ['danger', 'panel'], ['danger', 'sheet'], ['found', 'sheet']];
    const base = tokens(':root', false);
    let count = 0;
    for (const [name, selector] of [['lavagna', ':root']] as const) {
      const light = { ...base, ...tokens(selector, false) };
      for (const [theme, palette] of [['light', light], ['dark', { ...light, ...tokens(selector, true) }]] as const) {
        for (const [front, back] of pairs) {
          const [f, b] = [palette[front!], palette[back!]];
          if (!f?.startsWith('#') || !b?.startsWith('#')) continue;
          count++;
          if (ratio(f, b) < 4.5) problems.push(`${name} ${theme}: --${front} on --${back} ${ratio(f, b).toFixed(2)}`);
        }
      }
    }
    if (count < 48) problems.push(`only ${count} pairs read`);
    check('the contrast of the tokens, light and dark', problems);
  }
} finally {
  await session.close();
  rmSync(folder, { recursive: true, force: true });
}
console.log(failed === 0 ? '\napp unit tests: all pass' : `\napp unit tests: ${failed} failed`);
if (failed > 0) process.exitCode = 1;
