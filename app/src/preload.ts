// The preload of the window: a small API over IPC, nothing of Node reaches the page.
import { contextBridge, ipcRenderer } from 'electron';
import type { CanvasGroup } from 'doc-runtime/dist/src/canvas.js';
import type { CardView, Done, ObjectSource } from './session.js';

type Position = { line: number; character: number };
type At = { x: number; y: number };

const api = {
  state: () => ipcRenderer.invoke('doc:state') as Promise<{ folder: string }>,
  navigator: (query: string) => ipcRenderer.invoke('doc:navigator', query),
  read: (file: string) => ipcRenderer.invoke('doc:read', file) as Promise<string>,
  edit: (file: string, text: string) => ipcRenderer.invoke('doc:edit', file, text),
  save: (file: string, text: string) => ipcRenderer.invoke('doc:save', file, text) as Promise<string>,
  diagnostics: (file: string) => ipcRenderer.invoke('doc:diagnostics', file),
  complete: (file: string, text: string, position: Position) => ipcRenderer.invoke('doc:complete', file, text, position),
  hover: (file: string, text: string, position: Position) => ipcRenderer.invoke('doc:hover', file, text, position),
  definition: (file: string, text: string, position: Position) => ipcRenderer.invoke('doc:definition', file, text, position) as Promise<string | null>,
  showPreview: (file: string | null) => ipcRenderer.invoke('doc:preview', file) as Promise<string | null>,
  previewBounds: (bounds: { x: number; y: number; width: number; height: number }) => ipcRenderer.send('doc:preview-bounds', bounds),
  extract: (file: string, text: string) => ipcRenderer.invoke('doc:extract', file, text),
  /** The preview of one object alone. */
  showObject: (id: string) => ipcRenderer.invoke('doc:preview-object', id),
  canvas: () => ipcRenderer.invoke('doc:canvas') as Promise<{ canvas: string | null; cards: CardView[]; groups: CanvasGroup[] }>,
  objectSource: (id: string) => ipcRenderer.invoke('doc:object-source', id) as Promise<ObjectSource>,
  /** The cards in their order of reading, by node. */
  readingOrder: (nodes: string[]) => ipcRenderer.invoke('doc:reading-order', nodes) as Promise<string[]>,
  recall: (id: string, at?: At) => ipcRenderer.invoke('doc:recall', id, at) as Promise<Done>,
  /** `card`: the id of the node, for an object with several cards. */
  place: (id: string, at: At | undefined, card?: string, size?: { width: number; height: number }) => ipcRenderer.invoke('doc:place', id, at, card, size) as Promise<Done>,
  /** Where a new text next to a card goes. */
  besidePlace: (node: string) => ipcRenderer.invoke('doc:beside-place', node) as Promise<At | null>,
  createNear: (id: string, card: string, text: string) => ipcRenderer.invoke('doc:create-near', id, card, text) as Promise<Done>,
  gather: (id: string, card?: string) => ipcRenderer.invoke('doc:gather', id, card) as Promise<Done>,
  arrange: (by: 'kind' | 'tag') => ipcRenderer.invoke('doc:arrange', by) as Promise<Done>,
  archive: (id: string, card?: string) => ipcRenderer.invoke('doc:archive', id, card) as Promise<Done>,
  createText: (at: At, text: string) => ipcRenderer.invoke('doc:create-text', at, text) as Promise<Done>,
  compose: (ids: string[], title: string) => ipcRenderer.invoke('doc:compose', ids, title) as Promise<Done>,
  /** The menu Vista: the canvas or the page. */
  onView: (listener: (view: 'canvas' | 'page') => void) => {
    ipcRenderer.on('doc:view', (_event, view: 'canvas' | 'page') => listener(view));
  },
  openFolder: () => ipcRenderer.invoke('doc:open-folder'),
  /** Whether the file in the editor has changes not saved: the main process asks before closing. */
  setDirty: (file: string | null) => ipcRenderer.send('doc:dirty', file),
  /** Asks whether to save the changes of a file: save, discard or cancel. */
  confirmUnsaved: (file: string) => ipcRenderer.invoke('doc:confirm-unsaved', file) as Promise<'save' | 'discard' | 'cancel'>,
  discard: (file: string) => ipcRenderer.invoke('doc:discard', file),
  /** Closing with changes: the main process asks the page to save, then to close. */
  onSaveAndClose: (listener: () => void) => {
    ipcRenderer.on('doc:save-and-close', () => listener());
  },
  closeNow: () => ipcRenderer.send('doc:close-now'),
  /** After each recomputation of the tree. */
  onUpdate: (listener: () => void) => {
    ipcRenderer.on('doc:updated', () => listener());
  },
  /** A click on the preview: the file and the range where the element is written. */
  onReveal: (listener: (file: string, line: number, character: number) => void) => {
    ipcRenderer.on('doc:reveal', (_event, file: string, line: number, character: number) => listener(file, line, character));
  },
};

contextBridge.exposeInMainWorld('docApp', api);
export type DocApp = typeof api;
