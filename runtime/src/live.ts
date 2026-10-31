// The runtime kept on over a folder, shared by serve and the language server: it reads
// the folder, watches it, and recomputes the tree a moment after the last change.
import { watch, type FSWatcher } from 'node:fs';
import { listDocumentFiles, resolveTree, type FileIdentity } from './resolve-tree.js';
import type { ResolvedTree } from './tree.js';

/** Saves come in bursts: the recomputation waits this long after the last change. */
export const SETTLE_MS = 60;
/** The records of a collection the preview shows (§11.6), and a card of the canvas. */
export const PREVIEW_RECORDS = 1000;
export const CARD_RECORDS = 20;

export class LiveFolder {
  /** Texts that hold in place of the files on disk: the buffers open in an editor. */
  readonly overlay = new Map<string, string | null>();
  tree: ResolvedTree = {};
  listed = new Map<string, FileIdentity>();
  /** Milliseconds of the last recomputation. */
  ms = 0;
  private timer: NodeJS.Timeout | undefined;
  private readonly watcher: FSWatcher;
  /** Who wants to know of each recomputation: serve, the language server, the app. */
  private readonly listeners = new Set<() => void>();

  constructor(
    readonly folder: string,
    onUpdate: () => void,
    private readonly log: (line: string) => void,
  ) {
    this.listeners.add(onUpdate);
    this.recompute();
    this.watcher = watch(folder, { recursive: true }, () => this.schedule());
  }

  /** Reads the whole folder again, with the source positions; false if it failed. */
  recompute(): boolean {
    const start = performance.now();
    try {
      this.tree = resolveTree(this.folder, { positions: true, overlay: this.overlay, records: PREVIEW_RECORDS, drawings: true });
      this.listed = listDocumentFiles(this.folder);
    } catch (error) {
      this.log(`errore interno nel ricalcolo: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
    this.ms = performance.now() - start;
    this.log(`ricalcolo: ${this.ms.toFixed(1)} ms, ${this.tree.nodes?.length ?? 0} nodi`);
    return true;
  }

  /** A change: recompute once the burst is over, then tell the owner. */
  schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.recompute()) for (const listener of this.listeners) listener();
    }, SETTLE_MS);
  }

  /** Adds a listener; the returned function removes it. */
  listen(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close(): void {
    clearTimeout(this.timer);
    this.watcher.close();
  }
}
