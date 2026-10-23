// The window: the navigator, the source in CodeMirror, and the place of the preview,
// which the main process fills with a view of its own. Everything goes through docApp.
import { autocompletion, type CompletionContext } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { forceLinting, linter, lintGutter, type Diagnostic } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { EditorSelection, EditorState, type Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, hoverTooltip, keymap, lineNumbers, drawSelection, highlightActiveLine } from '@codemirror/view';
import { mapOffset } from '../offset.js';
import type { DocApp } from '../preload.js';

declare global {
  interface Window {
    docApp: DocApp;
    /** For the end-to-end test: what the editor shows. */
    docAppState: { file: string | null; line: number; character: number; text: string };
  }
}

const api = window.docApp;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let file: string | null = null;
/** The text of the file as it is on disk: what the editor shows differs if it is not saved. */
let saved = '';
let view: EditorView;
const isDirty = () => file !== null && view.state.doc.toString() !== saved;
const tellDirty = () => api.setDirty(isDirty() ? file : null);
let pushing: ReturnType<typeof setTimeout> | undefined;

const position = (state: EditorState, offset: number) => {
  const line = state.doc.lineAt(offset);
  return { line: line.number - 1, character: offset - line.from };
};
const offsetOf = (state: EditorState, line: number, character: number) => {
  const target = state.doc.line(Math.min(Math.max(line + 1, 1), state.doc.lines));
  return Math.min(target.from + character, target.to);
};
const updateState = () => {
  const head = view.state.selection.main.head;
  window.docAppState = { file, ...position(view.state, head), text: view.state.doc.toString() };
};

// The services of the language server, over IPC.
const diagnostics = linter(async (current): Promise<Diagnostic[]> => {
  if (file === null) return [];
  const list = (await api.diagnostics(file)) as Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; severity: 'error' | 'warning'; message: string; code: string }>;
  $('extract').hidden = !list.some((d) => d.code === 'composition-content');
  return list.map((d) => {
    const from = offsetOf(current.state, d.range.start.line, d.range.start.character);
    const to = Math.max(from, offsetOf(current.state, d.range.end.line, d.range.end.character));
    return { from, to, severity: d.severity, message: d.message };
  });
}, { delay: 0 });

const complete = async (context: CompletionContext) => {
  if (file === null) return null;
  const before = context.state.sliceDoc(context.state.doc.lineAt(context.pos).from, context.pos);
  if (!/!?\[\[[^[\]|\n]*$/.test(before)) return null;
  const items = (await api.complete(file, context.state.doc.toString(), position(context.state, context.pos))) as Array<{ label: string; detail: string; documentation: string; newText: string; range: { start: { character: number } } }>;
  if (items.length === 0) return null;
  const line = context.state.doc.lineAt(context.pos);
  return {
    from: line.from + items[0]!.range.start.character,
    options: items.map((item) => ({ label: item.label, detail: item.detail, info: item.documentation, apply: item.newText })),
  };
};

const hover = hoverTooltip(async (current, offset) => {
  if (file === null) return null;
  const answer = (await api.hover(file, current.state.doc.toString(), position(current.state, offset))) as { markdown: string } | null;
  if (answer === null) return null;
  return {
    pos: offset,
    create: () => {
      const dom = document.createElement('div');
      dom.style.padding = '4px 8px';
      dom.style.maxWidth = '420px';
      dom.style.whiteSpace = 'pre-wrap';
      dom.textContent = answer.markdown.replace(/\*\*|`/g, '');
      return { dom };
    },
  };
});

/** Saves through the formatter, and keeps the cursor as close as it can to where it was. */
const save = async () => {
  if (file === null) return true;
  const before = view.state.doc.toString();
  const after = await api.save(file, before);
  saved = after;
  if (after !== before) {
    const head = mapOffset(before, after, view.state.selection.main.head);
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: after }, selection: EditorSelection.cursor(head) });
  }
  tellDirty();
  return true;
};

const goToDefinition = async () => {
  if (file === null) return true;
  const target = await api.definition(file, view.state.doc.toString(), position(view.state, view.state.selection.main.head));
  if (target !== null) await open(target, 0, 0);
  return true;
};

function extensions(): Extension[] {
  return [
    lineNumbers(),
    history(),
    drawSelection(),
    highlightActiveLine(),
    bracketMatching(),
    highlightSelectionMatches(),
    markdown(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    EditorView.lineWrapping,
    ...(matchMedia('(prefers-color-scheme: dark)').matches ? [oneDark] : []),
    diagnostics,
    lintGutter(),
    autocompletion({ override: [complete], activateOnTyping: true }),
    hover,
    keymap.of([
      { key: 'Mod-s', run: () => (void save(), true) },
      { key: 'F12', run: () => (void goToDefinition(), true) },
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
    ]),
    EditorView.domEventHandlers({
      mousedown: (event) => {
        if (!(event.metaKey || event.ctrlKey)) return false;
        const offset = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (offset === null) return false;
        view.dispatch({ selection: EditorSelection.cursor(offset) });
        void goToDefinition();
        return true;
      },
    }),
    // A change holds at once for the tree and the preview, before it is saved.
    EditorView.updateListener.of((update) => {
      updateState();
      if (!update.docChanged || file === null) return;
      tellDirty();
      const current = file;
      clearTimeout(pushing);
      pushing = setTimeout(() => void api.edit(current, update.state.doc.toString()), 50);
    }),
  ];
}

/** Opens a file in the editor, with the cursor at a position, and its article in the preview. */
async function open(target: string, line: number, character: number): Promise<void> {
  if (target !== file) {
    // Changes not saved: save them, forget them, or stay.
    if (isDirty()) {
      const answer = await api.confirmUnsaved(file!);
      if (answer === 'cancel') return;
      if (answer === 'save') await save();
      else await api.discard(file!);
    }
    // No buffer is left unsaved here, so what read gives is the file on disk.
    const text = await api.read(target);
    saved = text;
    file = target;
    view.setState(EditorState.create({ doc: text, extensions: extensions() }));
    $('file').textContent = target;
    await api.showPreview(target);
    void renderNavigator();
  }
  const offset = offsetOf(view.state, line, character);
  view.dispatch({ selection: EditorSelection.cursor(offset), effects: EditorView.scrollIntoView(offset, { y: 'center' }) });
  view.focus();
  updateState();
  tellDirty();
}

async function renderNavigator(): Promise<void> {
  const shelves = (await api.navigator(($('search') as HTMLInputElement).value)) as Array<{ kind: string; items: Array<{ id: string; title: string; file: string }> }>;
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
      button.setAttribute('aria-current', String(item.file === file));
      button.append(item.title || item.id);
      const id = document.createElement('span');
      id.className = 'id';
      id.textContent = item.id;
      button.append(id);
      button.addEventListener('click', () => void open(item.file, 0, 0));
      section.append(button);
    }
    root.append(section);
  }
}

/** The preview fills its column: the main process places its view there. */
function placePreview(): void {
  const box = $('preview').getBoundingClientRect();
  api.previewBounds({ x: box.left, y: box.top, width: box.width, height: box.height });
}

async function start(): Promise<void> {
  view = new EditorView({ parent: $('editor'), state: EditorState.create({ doc: '', extensions: extensions() }) });
  updateState();
  new ResizeObserver(placePreview).observe($('preview'));
  addEventListener('resize', placePreview);
  placePreview();
  $('search').addEventListener('input', () => void renderNavigator());
  $('extract').addEventListener('click', async () => {
    if (file === null) return;
    const result = (await api.extract(file, view.state.doc.toString())) as { written: string[]; error?: string };
    if (result.error) alert(`Non si può estrarre: ${result.error}`);
    const current = file;
    file = null;
    await open(current, 0, 0);
  });
  api.onUpdate(() => {
    void renderNavigator();
    forceLinting(view);
  });
  api.onReveal((target, line, character) => void open(target, line, character));
  api.onSaveAndClose(async () => {
    await save();
    api.closeNow();
  });
  await renderNavigator();
  await api.showPreview(null);
}

void start();
