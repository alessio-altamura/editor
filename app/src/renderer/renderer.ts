// The window: the navigator, and two views of the same objects. The canvas, which the
// app opens on, has a card for each object placed there (board.ts); the page has the
// source in CodeMirror and the place of the preview, which the main process fills with
// a view of its own. Everything goes through docApp.
import { forceLinting } from '@codemirror/lint';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { mapOffset } from '../offset.js';
import type { DocApp } from '../preload.js';
import { createBoard } from './board.js';
import { editorExtensions, offsetOf, position } from './editor.js';

declare global {
  interface Window {
    docApp: DocApp;
    /** For the end-to-end test: what the editor shows, and the view. */
    docAppState: { file: string | null; line: number; character: number; text: string; view: 'canvas' | 'page' };
  }
}

const api = window.docApp;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let file: string | null = null;
/** The text of the file as it is on disk: what the editor shows differs if it is not saved. */
let saved = '';
let view: EditorView;
let current: 'canvas' | 'page' = 'canvas';
const isDirty = () => file !== null && view.state.doc.toString() !== saved;
const tellDirty = () => api.setDirty(isDirty() ? file : board.dirtyFile());
let pushing: ReturnType<typeof setTimeout> | undefined;

const updateState = () => {
  const head = view.state.selection.main.head;
  window.docAppState = { file, ...position(view.state, head), text: view.state.doc.toString(), view: current };
};

/** Saves through the formatter, and keeps the cursor as close as it can to where it was. */
const save = async () => {
  if (file === null) return;
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

const pageState = (doc: string) =>
  EditorState.create({
    doc,
    extensions: editorExtensions(api, {
      file: () => file,
      around: () => ({ before: '', after: '' }),
      save: () => void save(),
      definition: (from) => void goToDefinition(from),
      diagnosed: (codes) => ($('extract').hidden = !codes.includes('composition-content')),
      gutter: true,
      // A change holds at once for the tree and the preview, before it is saved.
      changed: (update) => {
        updateState();
        if (!update.docChanged || file === null) return;
        tellDirty();
        const target = file;
        clearTimeout(pushing);
        pushing = setTimeout(() => void api.edit(target, update.state.doc.toString()), 50);
      },
    }),
  });

/** Changes not saved in the page: save them, forget them, or stay; false to stay. */
async function settlePage(): Promise<boolean> {
  if (!isDirty()) return true;
  const answer = await api.confirmUnsaved(file!);
  if (answer === 'cancel') return false;
  if (answer === 'save') await save();
  else {
    await api.discard(file!);
    view.setState(pageState(saved));
  }
  tellDirty();
  return true;
}

/** Opens a file in the page, with the cursor at a position, and its article in the preview; or one object alone. */
async function open(target: string, line: number, character: number, alone?: string): Promise<void> {
  if (current !== 'page' && !(await setView('page'))) return;
  if (target !== file) {
    if (!(await settlePage())) return;
    // No buffer is left unsaved here, so what read gives is the file on disk.
    const text = await api.read(target);
    saved = text;
    file = target;
    view.setState(pageState(text));
    $('file').textContent = target;
    if (alone === undefined) await api.showPreview(target);
    void renderNavigator();
  }
  if (alone !== undefined) await api.showObject(alone);
  const offset = offsetOf(view.state, line, character);
  view.dispatch({ selection: EditorSelection.cursor(offset), effects: EditorView.scrollIntoView(offset, { y: 'center' }) });
  view.focus();
  updateState();
  tellDirty();
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
  const shelves = (await api.navigator(($('search') as HTMLInputElement).value)) as Array<{ kind: string; items: Array<{ id: string; title: string; file: string; onCanvas: boolean }> }>;
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
      button.append(item.title || item.id);
      const id = document.createElement('span');
      id.className = 'id';
      id.textContent = item.id;
      button.append(id);
      // On the canvas a click shows the object alone; in the page it opens its file.
      button.addEventListener('click', () => void (current === 'canvas' ? openAlone(item.id) : open(item.file, 0, 0)));
      // Dragged onto the canvas: recalled there, or moved there if it is on it already.
      button.draggable = true;
      button.addEventListener('dragstart', (event) => {
        event.dataTransfer?.setData('application/x-doc-id', item.id);
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

async function start(): Promise<void> {
  document.body.dataset.view = current;
  view = new EditorView({ parent: $('editor'), state: pageState('') });
  updateState();
  new ResizeObserver(placePreview).observe($('preview'));
  addEventListener('resize', placePreview);
  placePreview();
  $('search').addEventListener('input', () => void renderNavigator());
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-show]')) {
    button.addEventListener('click', () => void setView(button.dataset.show as 'canvas' | 'page'));
  }
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
    forceLinting(view);
    if (current === 'canvas') void board.refresh();
  });
  api.onReveal((target, line, character) => void open(target, line, character));
  api.onView((next) => void setView(next));
  api.onSaveAndClose(async () => {
    if (current === 'canvas') await board.finish();
    else await save();
    api.closeNow();
  });
  await renderNavigator();
  await api.showPreview(null);
  await board.refresh();
}

void start();
