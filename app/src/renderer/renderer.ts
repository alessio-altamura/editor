// The window: the navigator, and two views of the same objects. The canvas, which the
// app opens on, has a card for each object placed there (board.ts); the page has the
// source in CodeMirror and the place of the preview, which the main process fills with
// a view of its own. Everything goes through docApp.
import { forceLinting } from '@codemirror/lint';
import { EditorSelection, EditorState, Prec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { mapOffset } from '../offset.js';
import type { DocApp } from '../preload.js';
import { createBoard } from './board.js';
import { createChartPanel } from './chart-panel.js';
import { createFormulaPanel } from './formula-panel.js';
import { createGrid } from './grid.js';
import { editorExtensions, offsetOf, position } from './editor.js';
import { decorate, setIcon } from './icons.js';

declare global {
  interface Window {
    docApp: DocApp;
    /** For the end-to-end test: what the editor shows, and the view. */
    docAppState: { file: string | null; line: number; character: number; text: string; view: 'canvas' | 'page'; mode: 'text' | 'grid' | 'chart' | 'formula' };
  }
}

const api = window.docApp;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let file: string | null = null;
/** The text of the file as it is on disk: what the editor shows differs if it is not saved. */
let saved = '';
let view: EditorView;
let current: 'canvas' | 'page' = 'canvas';
/** A collection opens in its grid; the switch brings the text of the descriptor, as before. */
let mode: 'text' | 'grid' | 'chart' | 'formula' = 'text';
/** The formula open in the builder, in a file with several. */
let formulaId: string | undefined;
const isDirty = () => file !== null && (mode === 'grid' ? grid.isDirty() : mode === 'chart' ? chartPanel.isDirty() : mode === 'formula' ? formulaPanel.isDirty() : view.state.doc.toString() !== saved);
const tellDirty = () => api.setDirty(isDirty() ? file : board.dirtyFile());
let pushing: ReturnType<typeof setTimeout> | undefined;

const updateState = () => {
  const head = view.state.selection.main.head;
  window.docAppState = { file, ...position(view.state, head), text: view.state.doc.toString(), view: current, mode };
};

/** Saves through the formatter, and keeps the cursor as close as it can to where it was. */
const save = async () => {
  if (file === null) return;
  if (mode === 'grid' || mode === 'chart' || mode === 'formula') {
    await (mode === 'grid' ? grid.save() : mode === 'chart' ? chartPanel.save() : formulaPanel.save());
    tellDirty();
    return;
  }
  const before = view.state.doc.toString();
  const after = await api.save(file, before);
  saved = after;
  if (after !== before) {
    const head = mapOffset(before, after, view.state.selection.main.head);
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: after }, selection: EditorSelection.cursor(head) });
  }
  tellDirty();
};

const goToDefinition = async (from: EditorView) => {
  if (file === null) return;
  const target = await api.definition(file, from.state.doc.toString(), position(from.state, from.state.selection.main.head));
  if (target !== null) await open(target, 0, 0);
};

/**
 * A drop in the editor (class 4): a field or a formula in the code of a formula writes its
 * name, with the underscore, and adds it to the inputs; a formula dropped in a text writes
 * a math line with its name.
 */
const dropHandler = Prec.highest(EditorView.domEventHandlers({
  drop(event, target) {
    const field = event.dataTransfer?.getData('application/x-doc-field') ?? '';
    const id = event.dataTransfer?.getData('application/x-doc-id') ?? '';
    const kind = event.dataTransfer?.getData('application/x-doc-kind') ?? '';
    if (file === null || (field === '' && id === '')) return false;
    // The nearest place to the pointer, also past the end of a line.
    const at = target.posAtCoords({ x: event.clientX, y: event.clientY }, false);
    if (/\.formula\.md$/.test(file)) {
      event.preventDefault();
      void dropInFormula(target, at, field || id);
      return true;
    }
    if (id !== '' && kind === 'formula') {
      event.preventDefault();
      const line = `\`= ${id.replace(/-/g, '_')}\``;
      target.dispatch({ changes: { from: at, insert: line }, selection: EditorSelection.cursor(at + line.length) });
      target.focus();
      return true;
    }
    return false;
  },
}));

async function dropInFormula(target: EditorView, at: number, input: string): Promise<void> {
  if (file === null) return;
  const result = await api.formulaInsert(file, target.state.doc.toString(), at, input);
  if (result === null) {
    $('page-notice').textContent = 'Trascina il campo dentro il blocco python di una formula';
    return;
  }
  target.dispatch({ changes: { from: 0, to: target.state.doc.length, insert: result.text }, selection: EditorSelection.cursor(Math.min(result.cursor, result.text.length)) });
  target.focus();
}

const pageState = (doc: string) =>
  EditorState.create({
    doc,
    extensions: [dropHandler, editorExtensions(api, {
      file: () => file,
      around: () => ({ before: '', after: '' }),
      save: () => void save(),
      definition: (from) => void goToDefinition(from),
      diagnosed: (codes) => ($('extract').hidden = !codes.includes('composition-content')),
      gutter: true,
      data: /\.(tsv|csv)$/i.test(file ?? ''),
      // A change holds at once for the tree and the preview, before it is saved.
      changed: (update) => {
        updateState();
        if (update.selectionSet || update.docChanged) checkTable();
        if (!update.docChanged || file === null) return;
        tellDirty();
        const target = file;
        clearTimeout(pushing);
        pushing = setTimeout(() => void api.edit(target, update.state.doc.toString()), 50);
      },
    })],
  });

/** «Trasforma in collection» shows when the cursor is in a table of a text or of a scratch. */
let tableTimer: ReturnType<typeof setTimeout> | undefined;
function checkTable(): void {
  clearTimeout(tableTimer);
  tableTimer = setTimeout(async () => {
    const button = $('turn-into');
    if (file === null || !/\.(text|scratch)\.md$/.test(file)) {
      button.hidden = true;
      return;
    }
    button.hidden = (await api.tableAt(file, view.state.doc.toString(), position(view.state, view.state.selection.main.head).line)) === null;
  }, 150);
}

/** Changes not saved in the page: save them, forget them, or stay; false to stay. */
async function settlePage(): Promise<boolean> {
  if (!isDirty()) return true;
  const answer = await api.confirmUnsaved(file!);
  if (answer === 'cancel') return false;
  if (answer === 'save') await save();
  else if (mode === 'grid') {
    // The buffers of the grid: the descriptor and its data file.
    const data = await api.dataFile(file!);
    await api.discard(file!);
    if (data !== null) await api.discard(data);
    grid.close();
    await grid.open(file!);
  } else if (mode === 'chart') {
    await api.discard(file!);
    chartPanel.close();
    await chartPanel.open(file!);
  } else if (mode === 'formula') {
    await api.discard(file!);
    formulaPanel.close();
    await formulaPanel.open(file!, formulaId);
  } else {
    await api.discard(file!);
    view.setState(pageState(saved));
  }
  tellDirty();
  return true;
}

/** Opens a file in the page, with the cursor at a position, and its article in the preview; or one object alone. */
async function open(target: string, line: number, character: number, alone?: string, object?: string): Promise<void> {
  if (current !== 'page' && !(await setView('page'))) return;
  // Another formula of the same file: the builder moves to it.
  if (target === file && mode === 'formula' && (object ?? alone) !== undefined && (object ?? alone) !== formulaId) {
    if (!(await settlePage())) return;
    await showFormula(target, object ?? alone);
  }
  if (target !== file) {
    if (!(await settlePage())) return;
    $('page-notice').textContent = '';
    // No buffer is left unsaved here, so what read gives is the file on disk.
    const text = await api.read(target);
    saved = text;
    file = target;
    view.setState(pageState(text));
    showFile(target);
    // A collection: a button opens its data file, and the grid shows it.
    const data = /\.collection\.md$/.test(target) ? await api.dataFile(target) : null;
    $('data').hidden = data === null;
    $('data').dataset.file = data ?? '';
    // A collection opens in its grid, a chart in its panel, a formula in the builder.
    if (/\.formula\.md$/.test(target)) await showFormula(target, object ?? alone);
    else await showMode(data !== null ? ((await grid.open(target)) ? 'grid' : 'text') : /\.chart\.md$/.test(target) && (await chartPanel.open(target)) ? 'chart' : 'text');
    if (alone === undefined) await api.showPreview(target);
    void renderNavigator();
  }
  if (alone !== undefined) await api.showObject(alone);
  if (mode === 'grid') grid.focus();
  else if (mode === 'chart') chartPanel.focus();
  else if (mode === 'formula') formulaPanel.focus();
  else {
    const offset = offsetOf(view.state, line, character);
    view.dispatch({ selection: EditorSelection.cursor(offset), effects: EditorView.scrollIntoView(offset, { y: 'center' }) });
    view.focus();
  }
  updateState();
  tellDirty();
}

/** The file open in the page, as a path: its kind › its id; the name of the file in the tooltip. */
function showFile(target: string): void {
  const [, id, kind] = /^(?:.*\/)?([^/]+?)\.([a-z-]+)\.md$/.exec(target) ?? [null, target.split('/').pop() ?? target, 'dati'];
  const path = document.createElement('span');
  path.className = 'file-path';
  const kindPart = document.createElement('span');
  kindPart.textContent = kind!;
  const idPart = document.createElement('span');
  idPart.textContent = id!;
  path.append(kindPart, idPart);
  $('file').replaceChildren(path);
  $('file').title = target;
}

/** The grid of a collection at a line of its data file and a column of its table; false if it cannot open. */
async function revealInGrid(descriptor: string, line: number, column: number): Promise<boolean> {
  if (file !== descriptor) await open(descriptor, 0, 0);
  else if (current !== 'page' && !(await setView('page'))) return true;
  if (file !== descriptor) return true;
  if (mode === 'text') {
    if (!(await settlePage())) return true;
    await showMode((await grid.open(descriptor)) ? 'grid' : 'text');
  }
  return mode === 'grid' && grid.reveal(line, column);
}

/**
 * A formula in the builder; code written by hand that the builder does not read stays
 * text, with a notice: it is never rewritten (class 4).
 */
async function showFormula(target: string, id?: string): Promise<void> {
  const opened = await formulaPanel.open(target, id);
  formulaId = id;
  if (opened === 'builder') {
    $('page-notice').textContent = '';
    await showMode('formula');
    return;
  }
  // The text as it is on disk now: the builder may have written it.
  saved = await api.read(target);
  view.setState(pageState(saved));
  await showMode('text');
  if (opened === 'handwritten') $('page-notice').textContent = 'Scritto a mano: il costruttore non riscrive questo codice';
}

/** The grid or the text of a collection; the switch shows only for a collection with its data. */
async function showMode(next: 'text' | 'grid' | 'chart' | 'formula'): Promise<void> {
  mode = next;
  if (next !== 'grid') grid.close();
  if (next !== 'chart') chartPanel.close();
  if (next !== 'formula') formulaPanel.close();
  const chart = /\.chart\.md$/.test(file ?? '');
  const formula = /\.formula\.md$/.test(file ?? '');
  $('editor').hidden = next !== 'text';
  $('grid').hidden = next !== 'grid';
  $('chart').hidden = next !== 'chart';
  $('formula').hidden = next !== 'formula';
  $('mode').hidden = !$('data').dataset.file && !chart && !formula;
  $('mode').title = next !== 'text' ? 'Il file come testo' : chart ? 'Il grafico in un pannello' : formula ? 'La formula nel costruttore' : 'I dati in una griglia';
  setIcon($('mode'), next !== 'text' ? 'file-code' : chart ? 'chart-column' : formula ? 'sigma' : 'table', next !== 'text' ? 'Testo' : chart ? 'Pannello' : formula ? 'Costruttore' : 'Griglia');
  updateState();
}

/** A formula by its id: its file, in the builder. */
async function openFormula(id: string): Promise<void> {
  const source = await api.objectSource(id);
  await open(source.file, source.before.split('\n').length - 1, 0, undefined, id);
}

/** One object alone in the page: its file in the editor, at the object, and only the object in the preview. */
async function openAlone(id: string): Promise<void> {
  const source = await api.objectSource(id);
  await open(source.file, source.before.split('\n').length - 1, 0, id);
}

/** The canvas or the page; false if the change was cancelled. */
async function setView(next: 'canvas' | 'page'): Promise<boolean> {
  if (next === current) return true;
  if (next === 'canvas' && !(await settlePage())) return false;
  if (next === 'page' && !(await board.finish())) return false;
  current = next;
  document.body.dataset.view = next;
  if (next === 'canvas') await board.refresh();
  placePreview();
  updateState();
  return true;
}

let navigatorKey = '';
async function renderNavigator(): Promise<void> {
  const shelves = (await api.navigator(($('search') as HTMLInputElement).value)) as Array<{ kind: string; items: Array<{ id: string; title: string; file: string; onCanvas: boolean; value?: string }> }>;
  // Drawn again only when it changed: a drag from the navigator must not lose its button.
  const key = JSON.stringify([shelves, current, file]);
  if (key === navigatorKey) return;
  navigatorKey = key;
  const root = $('shelves');
  root.replaceChildren();
  for (const shelf of shelves) {
    const section = document.createElement('section');
    section.className = 'shelf';
    const heading = document.createElement('h2');
    heading.textContent = shelf.kind;
    section.append(heading);
    for (const item of shelf.items) {
      const button = document.createElement('button');
      button.dataset.id = item.id;
      button.dataset.onCanvas = String(item.onCanvas);
      button.title = item.onCanvas ? 'Sul foglio' : 'Archiviato';
      button.setAttribute('aria-current', String(current === 'page' && item.file === file));
      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = item.title || item.id;
      button.append(title);
      const id = document.createElement('span');
      id.className = 'id';
      id.textContent = item.id;
      button.append(id);
      // A formula shows its value next to its name (class 4).
      if (item.value !== undefined) {
        const value = document.createElement('span');
        value.className = 'value';
        value.textContent = `= ${item.value}`;
        button.append(value);
      }
      // On the canvas a click shows the object alone; in the page it opens its file.
      button.addEventListener('click', () => void (current === 'canvas' ? openAlone(item.id) : shelf.kind === 'formula' ? openFormula(item.id) : open(item.file, 0, 0)));
      // Dragged onto the canvas: recalled there, or moved there if it is on it already.
      button.draggable = true;
      button.addEventListener('dragstart', (event) => {
        event.dataTransfer?.setData('application/x-doc-id', item.id);
        event.dataTransfer?.setData('application/x-doc-kind', shelf.kind);
        event.dataTransfer?.setData('text/plain', item.id);
      });
      section.append(button);
    }
    root.append(section);
  }
}

/** The preview fills its column: the main process places its view there, or hides it on the canvas. */
function placePreview(): void {
  const box = $('preview').getBoundingClientRect();
  api.previewBounds({ x: box.left, y: box.top, width: box.width, height: box.height });
}

const board = createBoard(api, {
  openAlone: (id) => void openAlone(id),
  openArticle: (target) => void open(target, 0, 0),
  dirty: () => tellDirty(),
  changed: () => void renderNavigator(),
});

const chartPanel = createChartPanel(api, $('chart'), { changed: () => tellDirty() });
const formulaPanel = createFormulaPanel(api, $('formula'), { changed: () => tellDirty() });

const grid = createGrid(api, $('grid'), {
  changed: () => tellDirty(),
  // The chart reads the collection on disk: the grid is saved first.
  chart: async (descriptor) => {
    if (grid.isDirty()) await save();
    const done = await api.createChart(descriptor);
    if (done.error) {
      alert(`Non si può creare il grafico: ${done.error}`);
      return;
    }
    await open(String(done.summary?.file), 0, 0);
  },
  formula: (id) => void openFormula(id),
  // «Campo calcolato»: the grid saved first, then the formula and its field, then the builder.
  computed: async (descriptor, title) => {
    if (grid.isDirty()) await save();
    const done = await api.computedField(descriptor, title);
    if (done.error) {
      alert(`Non si può creare il campo calcolato: ${done.error}`);
      return;
    }
    await openFormula(String(done.summary?.id));
  },
});

async function start(): Promise<void> {
  document.body.dataset.view = current;
  decorate(document);
  view = new EditorView({ parent: $('editor'), state: pageState('') });
  updateState();
  new ResizeObserver(placePreview).observe($('preview'));
  addEventListener('resize', placePreview);
  placePreview();
  $('search').addEventListener('input', () => void renderNavigator());
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-show]')) {
    button.addEventListener('click', () => void setView(button.dataset.show as 'canvas' | 'page'));
  }
  $('turn-into').addEventListener('click', async () => {
    if (file === null) return;
    const done = await api.turnInto(file, view.state.doc.toString(), position(view.state, view.state.selection.main.head).line);
    if (done.error) {
      alert(`Non si può trasformare: ${done.error}`);
      return;
    }
    // The text has gone, or the scratch has a link now: open the new collection.
    saved = view.state.doc.toString();
    file = null;
    await open(String(done.summary?.file), 0, 0);
    // What the table lost on the way: a notice, not a dialog that stops the page.
    const warnings = (done.summary?.warnings as Array<{ message: string }> | undefined) ?? [];
    $('page-notice').textContent = warnings.map((warning) => `Avviso: ${warning.message}`).join(' · ');
  });
  // The preview in a window of its own: the page gives its column to the editor.
  const showDetached = (detached: boolean) => {
    document.body.classList.toggle('preview-detached', detached);
    placePreview();
  };
  $('detach').addEventListener('click', () => void api.detachPreview());
  api.onPreviewDetached(showDetached);
  showDetached(await api.previewDetached());
  $('mode').addEventListener('click', async () => {
    if (file === null || !(await settlePage())) return;
    const target = file;
    if (mode !== 'text') {
      // The text of the file, as it is now on disk.
      saved = await api.read(target);
      view.setState(pageState(saved));
      await showMode('text');
    } else if (/\.chart\.md$/.test(target)) await showMode((await chartPanel.open(target)) ? 'chart' : 'text');
    else if (/\.formula\.md$/.test(target)) await showFormula(target, formulaId);
    else await showMode((await grid.open(target)) ? 'grid' : 'text');
  });
  $('data').addEventListener('click', () => {
    if ($('data').dataset.file) void open($('data').dataset.file!, 0, 0);
  });
  $('extract').addEventListener('click', async () => {
    if (file === null) return;
    const result = (await api.extract(file, view.state.doc.toString())) as { written: string[]; error?: string };
    if (result.error) alert(`Non si può estrarre: ${result.error}`);
    const target = file;
    file = null;
    await open(target, 0, 0);
  });
  api.onUpdate(() => {
    void renderNavigator();
    if (mode === 'chart') chartPanel.refresh();
    if (mode === 'formula') void formulaPanel.refresh();
    if (mode === 'grid') void grid.refreshComputed();
    forceLinting(view);
    if (current === 'canvas') void board.refresh();
  });
  // A record of a collection clicked in the preview: its grid, at the cell; the data file as text if the grid cannot open.
  api.onReveal(async (target, line, character, column) => {
    if (column !== undefined && /\.(tsv|csv)$/i.test(target)) {
      const descriptor = await api.collectionOf(target);
      if (descriptor !== null && (await revealInGrid(descriptor, line, column))) return;
    }
    await open(target, line, character);
  });
  api.onView((next) => void setView(next));
  api.onSaveAndClose(async () => {
    if (current === 'canvas') await board.finish();
    else await save();
    api.closeNow();
  });
  // «Python in avvio» while Pyodide starts, the first time; «Python non disponibile» if it does not.
  const showPython = (status: string) => {
    $('python').hidden = status !== 'starting' && status !== 'failed';
    $('python').classList.toggle('failed', status === 'failed');
    $('python').querySelector('.python-text')!.textContent = status === 'failed' ? 'Python non disponibile' : 'Python in avvio';
  };
  api.onPython(showPython);
  showPython(await api.python());
  await renderNavigator();
  await api.showPreview(null);
  await board.refresh();
}

void start();
