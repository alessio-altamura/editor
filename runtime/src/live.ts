// The runtime kept on over a folder, shared by serve and the language server: it reads
// the folder, watches it, and recomputes the tree a moment after the last change.
import { watch, type FSWatcher } from 'node:fs';
import type { FormulaJob } from './formula.js';
import { PyodideEngine } from './formula-engine.js';
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
  /**
   * The formulas (class 4): Electron with Pyodide, started in the background the first
   * time the document has code to compute, and kept until close; its results by key.
   */
  readonly formulas: PyodideEngine;
  private computing = new Set<string>();

  constructor(
    readonly folder: string,
    onUpdate: () => void,
    private readonly log: (line: string) => void,
    formulas?: PyodideEngine,
  ) {
    this.formulas = formulas ?? new PyodideEngine(undefined, log);
    this.listeners.add(onUpdate);
    this.recompute();
    this.watcher = watch(folder, { recursive: true }, () => this.schedule());
  }

  /** Reads the whole folder again, with the source positions; false if it failed. */
  recompute(): boolean {
    const start = performance.now();
    try {
      const pending = new Map<string, FormulaJob>();
      this.tree = resolveTree(this.folder, { positions: true, overlay: this.overlay, records: PREVIEW_RECORDS, drawings: true, formulas: { results: this.formulas.cache, pending } });
      this.listed = listDocumentFiles(this.folder);
      this.compute([...pending.values()]);
    } catch (error) {
      this.log(`errore interno nel ricalcolo: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
    this.ms = performance.now() - start;
    this.log(`ricalcolo: ${this.ms.toFixed(1)} ms, ${this.tree.nodes?.length ?? 0} nodi`);
    return true;
  }

  /**
   * The jobs of a resolution whose result is not known: computed in the background, then
   * the tree again with their values. A job already on its way is not sent twice.
   */
  private compute(jobs: FormulaJob[]): void {
    const fresh = jobs.filter((job) => !this.computing.has(job.key) && !this.formulas.cache.has(job.key));
    if (fresh.length === 0) return;
    for (const job of fresh) this.computing.add(job.key);
    void this.formulas.evaluate(fresh).then((results) => {
      for (const job of fresh) this.computing.delete(job.key);
      // A result not kept (the worker was not there) would ask again forever: kept here for this tree.
      for (const [key, result] of results) if (!this.formulas.cache.has(key)) this.formulas.cache.set(key, result);
      if (this.closed) return;
      if (this.recompute()) for (const listener of this.listeners) listener();
    });
  }
  private closed = false;

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
    this.closed = true;
    clearTimeout(this.timer);
    this.watcher.close();
    this.formulas.close();
  }
}
