// The preload of the window: a small API over IPC, nothing of Node reaches the page.
import { contextBridge, ipcRenderer } from 'electron';

type Position = { line: number; character: number };

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
