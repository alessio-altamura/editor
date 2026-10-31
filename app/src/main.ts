// The main process: opens a document folder, keeps the runtime on over it through a
// Session, and answers the window over IPC. The preview is a view of its own, with no
// preload, that loads the preview of serve: the same page and the same CSP header.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, dialog, ipcMain, Menu, screen, shell, WebContentsView } from 'electron';
import type { ChartState } from './chart-model.js';
import { Session } from './session.js';
import { placeWindow, type SavedWindow } from './window-place.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const stateFile = () => join(app.getPath('userData'), 'state.json');

/** The preferences of the app, in userData: the last folder, and where the preview is. */
interface AppState {
  folder?: string;
  preview?: { detached: boolean; window?: SavedWindow };
}
const readState = (): AppState => {
  try {
    return JSON.parse(readFileSync(stateFile(), 'utf8')) as AppState;
  } catch {
    return {};
  }
};
const writeState = (change: Partial<AppState>): void => {
  mkdirSync(app.getPath('userData'), { recursive: true });
  writeFileSync(stateFile(), JSON.stringify({ ...readState(), ...change }));
};

let session: Session | null = null;
/** Resolved once the first folder is open: the window may ask before that. */
let opened: () => void = () => undefined;
const ready = new Promise<void>((resolve) => (opened = resolve));
let window: BrowserWindow | null = null;
let preview: WebContentsView | null = null;
/** The window of the preview when it is apart from the page: one at most. */
let detached: BrowserWindow | null = null;
/** The app is closing: a separate preview closed now stays separate for the next time. */
let quitting = false;
/** The file in the editor with changes not saved, as the page says. */
let dirty: string | null = null;
let closing = false;

/** Asks whether to save the changes of a file. */
async function askToSave(file: string): Promise<'save' | 'discard' | 'cancel'> {
  const { response } = await dialog.showMessageBox(window!, {
    type: 'question',
    buttons: ['Salva', 'Non salvare', 'Annulla'],
    defaultId: 0,
    cancelId: 2,
    message: `Salvare le modifiche a ${file}?`,
    detail: 'Se non le salvi, si perdono.',
  });
  return (['save', 'discard', 'cancel'] as const)[response] ?? 'cancel';
}

/** The folder: --folder on the command line, else the last one opened, else a dialog. */
async function chooseFolder(ask: boolean): Promise<string | null> {
  const index = process.argv.indexOf('--folder');
  if (!ask && index > 0 && process.argv[index + 1]) return process.argv[index + 1]!;
  if (!ask) {
    try {
      const last = readState().folder;
      if (last && existsSync(last)) return last;
    } catch {
      // No last folder.
    }
  }
  const result = await dialog.showOpenDialog({ title: 'Apri la cartella di un documento', properties: ['openDirectory'] });
  return result.canceled ? null : (result.filePaths[0] ?? null);
}

async function openFolder(folder: string): Promise<void> {
  await session?.close();
  session = await Session.open(folder, (line) => process.stderr.write(`doc-app: ${line}\n`));
  session.onUpdate(() => window?.webContents.send('doc:updated'));
  // «Python in avvio» while Pyodide starts, the first time the document has code (class 4).
  session.onPython((status) => window?.webContents.send('doc:python', status));
  writeState({ folder });
  window?.setTitle(`${folder} — doc`);
  window?.webContents.send('doc:updated');
  opened();
}

function createWindow(): void {
  window = new BrowserWindow({
    width: 1500,
    height: 950,
    webPreferences: { preload: join(here, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  preview = new WebContentsView({ webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  // A floating panel, as the source: rounded corners (its margin comes from the layout).
  preview.setBorderRadius(12);
  window.contentView.addChildView(preview);
  // Nothing opens or navigates elsewhere: links to the web go to the system browser.
  for (const contents of [window.webContents, preview.webContents]) {
    contents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/.test(url) && !session?.isPreview(url)) void shell.openExternal(url);
      return { action: 'deny' };
    });
    contents.on('will-navigate', (event, url) => {
      if (contents === preview?.webContents && session?.isPreview(url)) return;
      event.preventDefault();
      if (/^https?:|^mailto:/.test(url) && !session?.isPreview(url)) void shell.openExternal(url);
    });
  }
  // A click in the preview puts the source position of the element in the fragment.
  preview.webContents.on('did-navigate-in-page', (_event, url) => {
    const hash = new URL(url).hash;
    if (!hash.startsWith('#source=')) return;
    const [source = '', column] = hash.slice('#source='.length).split('&column=');
    const match = /^(.*):(\d+):(\d+)-(\d+):(\d+)$/.exec(decodeURIComponent(source));
    if (match && session?.file(match[1]!) !== null) {
      window?.webContents.send('doc:reveal', match[1], Number(match[2]), Number(match[3]), column === undefined ? undefined : Number(column));
      // From the separate window: the editor of the main one takes the focus.
      if (detached !== null) {
        window?.focus();
        window?.webContents.focus();
      }
    }
  });
  // Closing with changes not saved: ask first.
  window.on('close', (event) => {
    if (closing || dirty === null || session === null) return;
    event.preventDefault();
    const file = dirty;
    void askToSave(file).then((answer) => {
      if (answer === 'cancel') return;
      closing = true;
      if (answer === 'save') window?.webContents.send('doc:save-and-close');
      else {
        session?.discard(file);
        window?.close();
      }
    });
  });
  // Closing the main window closes the app, the separate preview with it.
  window.on('closed', () => {
    quitting = true;
    detached?.close();
  });
  void window.loadFile(join(here, 'renderer/index.html'));
  if (readState().preview?.detached) window.webContents.once('did-finish-load', () => detachPreview());
}

/** Where the separate window is now, for the preferences. */
function rememberDetached(): void {
  if (detached === null || detached.isDestroyed()) return;
  const bounds = detached.getBounds();
  writeState({ preview: { detached: true, window: { bounds, display: screen.getDisplayMatching(bounds).id } } });
}

/** The preview in its own window, where it was the last time; the page gives its place to the editor. */
function detachPreview(): void {
  if (detached !== null || window === null || preview === null) return;
  const displays = screen.getAllDisplays().map((display) => ({ id: display.id, workArea: display.workArea }));
  const primary = screen.getPrimaryDisplay();
  const bounds = placeWindow(readState().preview?.window, displays, { id: primary.id, workArea: primary.workArea });
  detached = new BrowserWindow({
    ...bounds,
    title: 'Anteprima — doc',
    webPreferences: { preload: join(here, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  window.contentView.removeChildView(preview);
  detached.contentView.addChildView(preview);
  preview.setVisible(true);
  // The view under the bar of the window, with the margin and the corners of the frame.
  const layout = () => {
    if (detached === null || detached.isDestroyed()) return;
    const [width = 0, height = 0] = detached.getContentSize();
    preview?.setBounds({ x: 8, y: 60, width: Math.max(0, width - 16), height: Math.max(0, height - 68) });
  };
  layout();
  detached.on('resize', layout);
  let saving: ReturnType<typeof setTimeout> | undefined;
  const later = () => {
    clearTimeout(saving);
    saving = setTimeout(rememberDetached, 300);
  };
  detached.on('move', later);
  detached.on('resize', later);
  detached.on('close', () => {
    clearTimeout(saving);
    rememberDetached();
  });
  // Closed by the user: the preview goes back to the page; closed with the app: it stays apart.
  detached.on('closed', () => {
    detached = null;
    if (!quitting) attachPreview();
  });
  detached.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  detached.webContents.on('will-navigate', (event) => event.preventDefault());
  void detached.loadFile(join(here, 'renderer/detached.html'));
  rememberDetached();
  window.webContents.send('doc:preview-detached', true);
}

/** The preview back in the page. */
function attachPreview(): void {
  if (window === null || preview === null) return;
  const apart = detached;
  detached = null;
  if (apart !== null && !apart.isDestroyed()) {
    apart.contentView.removeChildView(preview);
    apart.removeAllListeners('closed');
    apart.close();
  }
  if (!window.contentView.children.includes(preview)) window.contentView.addChildView(preview);
  const saved = readState().preview?.window;
  writeState({ preview: { detached: false, ...(saved ? { window: saved } : {}) } });
  window.webContents.send('doc:preview-detached', false);
}

/** The state of the chart panel from the page, with its kinds checked. */
function chartState(value: unknown): ChartState {
  const state = (value ?? {}) as Record<string, unknown>;
  const text = (key: string) => (typeof state[key] === 'string' ? (state[key] as string) : undefined);
  const filter = state.filter !== null && typeof state.filter === 'object' && !Array.isArray(state.filter) ? (state.filter as Record<string, unknown>) : {};
  return {
    template: text('template') ?? 'bar',
    collection: text('collection') ?? '',
    ...(text('x') !== undefined ? { x: text('x')! } : {}),
    ...(text('y') !== undefined ? { y: text('y')! } : {}),
    ...(text('series') !== undefined ? { series: text('series')! } : {}),
    filter: Object.fromEntries(Object.entries(filter).map(([name, values]) => [name, Array.isArray(values) ? values.filter((item): item is string => typeof item === 'string') : []])),
    description: text('description') ?? '',
  };
}

/** Every IPC call: the session must be open, and the arguments are checked by it. */
function handle(channel: string, answer: (current: Session, ...args: never[]) => unknown): void {
  ipcMain.handle(channel, async (event, ...args: unknown[]) => {
    if (event.sender !== window?.webContents) throw new Error('richiesta da un\'altra pagina');
    await ready;
    if (session === null) throw new Error('nessuna cartella aperta');
    return (answer as (current: Session, ...rest: unknown[]) => unknown)(session, ...args);
  });
}

handle('doc:state', (current) => ({ folder: current.folder }));
ipcMain.handle('doc:detach-preview', (event) => {
  if (event.sender === window?.webContents) detachPreview();
});
// From the page or from the separate window itself.
ipcMain.handle('doc:attach-preview', (event) => {
  if (event.sender === window?.webContents || (detached !== null && event.sender === detached.webContents)) attachPreview();
});
ipcMain.handle('doc:preview-detached', (event) => event.sender === window?.webContents && detached !== null);
handle('doc:navigator', (current, query: string) => current.navigator(String(query ?? '')));
handle('doc:read', (current, file: string) => current.read(file));
handle('doc:edit', (current, file: string, text: string) => current.edit(file, String(text)));
handle('doc:save', (current, file: string, text: string) => current.save(file, String(text)));
handle('doc:diagnostics', (current, file: string) => current.diagnostics(file));
handle('doc:complete', (current, file: string, text: string, position: { line: number; character: number }) => current.complete(file, String(text), position));
handle('doc:hover', (current, file: string, text: string, position: { line: number; character: number }) => current.hover(file, String(text), position));
handle('doc:definition', (current, file: string, text: string, position: { line: number; character: number }) => current.definition(file, String(text), position));
handle('doc:confirm-unsaved', (_current, file: string) => askToSave(String(file)));
handle('doc:discard', (current, file: string) => current.discard(file));
ipcMain.on('doc:dirty', (event, file: unknown) => {
  if (event.sender === window?.webContents) dirty = typeof file === 'string' && session?.file(file) !== null ? file : null;
});
ipcMain.on('doc:close-now', (event) => {
  if (event.sender !== window?.webContents) return;
  closing = true;
  window?.close();
});
handle('doc:extract', (current, file: string, text: string) => current.extract(file, String(text)));
handle('doc:table-at', (current, file: string, text: string, line: number) => current.tableAt(file, String(text), Number(line)));
handle('doc:turn-into', (current, file: string, text: string, line: number) => current.turnInto(file, String(text), Number(line)));
handle('doc:data-file', (current, file: string) => current.dataFile(file));
handle('doc:collection-of', (current, file: string) => current.collectionOf(file));
handle('doc:chart-source', (current, file: string) => current.chartSource(String(file)));
handle('doc:chart-edit', (current, file: string, state: unknown) => current.chartEdit(String(file), chartState(state)));
handle('doc:chart-save', (current, file: string, state: unknown) => current.chartSave(String(file), chartState(state)));
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
const optional = (value: unknown) => (typeof value === 'string' ? value : undefined);
handle('doc:formula-source', (current, file: string, id: unknown) => current.formulaSource(String(file), optional(id)));
handle('doc:formula-edit', (current, file: string, id: string, inputs: unknown, code: string) => current.formulaEdit(String(file), String(id), strings(inputs), String(code)));
handle('doc:formula-save', (current, file: string, id: string, inputs: unknown, code: string) => current.formulaSave(String(file), String(id), strings(inputs), String(code)));
handle('doc:formula-insert', (current, file: string, text: string, offset: number, input: string) => current.formulaInsert(String(file), String(text), Number(offset), String(input)));
handle('doc:create-formula', (current, request: unknown) => {
  const asked = (request ?? {}) as Record<string, unknown>;
  return current.createFormula({ ...(optional(asked.id) !== undefined ? { id: optional(asked.id)! } : {}), ...(Array.isArray(asked.inputs) ? { inputs: strings(asked.inputs) } : {}), ...(optional(asked.code) !== undefined ? { code: optional(asked.code)! } : {}) });
});
handle('doc:computed-field', (current, file: string, title: string) => current.computedField(String(file), String(title)));
handle('doc:python', (current) => current.python());
handle('doc:grid-source', (current, file: string) => current.gridSource(file));
const fieldsOf = (value: unknown) => (Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []);
handle('doc:grid-edit', (current, file: string, fields: unknown, data: string) => current.gridEdit(file, fieldsOf(fields), String(data)));
handle('doc:grid-save', (current, file: string, fields: unknown, data: string) => current.gridSave(file, fieldsOf(fields), String(data)));
handle('doc:preview', (current, file: string | null) => {
  const article = current.articleFor(file);
  if (article !== null) void preview?.webContents.loadURL(current.previewUrl(article));
  return article;
});
handle('doc:preview-object', (current, id: string) => void preview?.webContents.loadURL(current.objectPreviewUrl(String(id))));
// The canvas: the cards, the source of one object, and the operations.
const at = (value: unknown) => {
  const point = value as { x?: unknown; y?: unknown } | undefined;
  return point === undefined || point === null ? undefined : { x: Number(point.x), y: Number(point.y) };
};
handle('doc:canvas', (current) => current.canvas());
handle('doc:object-source', (current, id: string) => current.objectSource(String(id)));
handle('doc:reading-order', (current, nodes: string[]) => current.readingOrder(Array.isArray(nodes) ? nodes.map(String) : []));
handle('doc:recall', (current, id: string, point: unknown) => current.recall(String(id), at(point)));
const card = (value: unknown) => (typeof value === 'string' ? value : undefined);
const size = (value: unknown) => {
  const box = value as { width?: unknown; height?: unknown } | undefined | null;
  return box === undefined || box === null ? undefined : { width: Number(box.width), height: Number(box.height) };
};
handle('doc:place', (current, id: string, point: unknown, which: unknown, box: unknown) => current.place(String(id), at(point), card(which), size(box)));
handle('doc:beside-place', (current, node: string) => current.besidePlace(String(node)));
handle('doc:create-near', (current, id: string, which: string, text: string) => current.createNear(String(id), String(which), String(text)));
handle('doc:gather', (current, id: string, which: unknown) => current.gather(String(id), card(which)));
handle('doc:arrange', (current, by: unknown) => current.arrange(by === 'tag' ? 'tag' : 'kind'));
handle('doc:archive', (current, id: string, which: unknown) => current.archive(String(id), card(which)));
handle('doc:create-text', (current, point: unknown, text: string) => current.createText(at(point)!, String(text)));
handle('doc:create-chart', (current, file: string) => current.createChart(String(file)));
handle('doc:compose', (current, ids: string[], title: string) => current.compose(Array.isArray(ids) ? ids.map(String) : [], String(title)));
ipcMain.handle('doc:open-folder', async () => {
  const folder = await chooseFolder(true);
  if (folder !== null) await openFolder(folder);
  return folder;
});
ipcMain.on('doc:preview-bounds', (event, bounds: { x: number; y: number; width: number; height: number }) => {
  // A separate preview has its own place.
  if (event.sender !== window?.webContents || detached !== null) return;
  const round = (n: unknown) => Math.max(0, Math.round(Number(n) || 0));
  preview?.setBounds({ x: round(bounds.x), y: round(bounds.y), width: round(bounds.width), height: round(bounds.height) });
  // On the canvas the column of the preview is gone: so is the view.
  preview?.setVisible(round(bounds.width) > 0 && round(bounds.height) > 0);
});

app.whenReady().then(async () => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Apri cartella…', accelerator: 'CmdOrCtrl+O', click: () => void ipcMain.emit('doc:menu-open') },
        { role: process.platform === 'darwin' ? ('close' as const) : ('quit' as const) },
      ],
    },
    { role: 'editMenu' as const },
    {
      label: 'Vista',
      submenu: [
        { label: 'Foglio', accelerator: 'CmdOrCtrl+1', click: () => window?.webContents.send('doc:view', 'canvas') },
        { label: 'Pagina', accelerator: 'CmdOrCtrl+2', click: () => window?.webContents.send('doc:view', 'page') },
        { type: 'separator' as const },
        { role: 'reload' as const },
        { role: 'toggleDevTools' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
  ]));
  ipcMain.on('doc:menu-open', async () => {
    const folder = await chooseFolder(true);
    if (folder !== null) await openFolder(folder);
  });
  createWindow();
  const folder = await chooseFolder(false);
  if (folder === null) return app.quit();
  await openFolder(folder);
});

app.on('before-quit', () => {
  quitting = true;
});

app.on('window-all-closed', () => {
  void session?.close().finally(() => app.quit());
});
