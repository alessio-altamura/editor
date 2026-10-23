// What the main process does for the window, without Electron: the runtime kept on over
// a document folder, the services of the language server on its tree, the preview of
// serve on the same runtime, saving through the formatter. The IPC calls these.
import { closeSync, openSync, readFileSync, renameSync, unlinkSync, writeSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { formatText } from 'doc-runtime/dist/src/format.js';
import { completions, definitionOf, describe, hoverAt, referenceAt, type Completion, type Position, type Range } from 'doc-runtime/dist/src/language-services.js';
import { LiveFolder } from 'doc-runtime/dist/src/live.js';
import { diskWorkspace, evaluate, OperationError, planExtract, write, type Workspace } from 'doc-runtime/dist/src/operations.js';
import { serve } from 'doc-runtime/dist/src/serve.js';
import type { JsonML, TreeNode } from 'doc-runtime/dist/src/tree.js';

/** The compositions come first in the navigator, then the other kinds by name. */
const COMPOSITIONS = ['article', 'chapter'];

export interface ShelfItem {
  id: string;
  title: string;
  file: string;
}
export interface Shelf {
  kind: string;
  items: ShelfItem[];
}
export interface EditorDiagnostic {
  range: Range;
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

const normalize = (text: string) => text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

export class Session {
  private constructor(
    readonly folder: string,
    readonly live: LiveFolder,
    private readonly base: string,
    private readonly token: string,
    private readonly stopServe: () => Promise<void>,
  ) {}

  /** Opens a document folder: the runtime on it, and the preview server on the same runtime. */
  static async open(folder: string, log: (line: string) => void = () => undefined): Promise<Session> {
    const live = new LiveFolder(folder, () => undefined, log);
    const { url, close } = await serve({ folder, port: 0, log, live });
    const parsed = new URL(url);
    return new Session(folder, live, `${parsed.protocol}//${parsed.host}`, parsed.searchParams.get('token') ?? '', close);
  }

  /** A path of the folder, as the runtime writes it; null for anything outside. */
  file(path: string): string | null {
    if (typeof path !== 'string' || path === '' || isAbsolute(path)) return null;
    const inside = relative(this.folder, join(this.folder, path));
    if (inside === '' || inside.startsWith('..') || inside.startsWith(sep)) return null;
    return inside.split(sep).join('/');
  }

  private safe(path: string): string {
    const file = this.file(path);
    if (file === null) throw new Error(`fuori dalla cartella: ${path}`);
    return file;
  }

  /** Calls `listener` after each recomputation; returns the function that stops it. */
  onUpdate(listener: () => void): () => void {
    return this.live.listen(listener);
  }

  /** The objects by shelf, one per kind, the compositions first; `query` filters by id and title. */
  navigator(query = ''): Shelf[] {
    const wanted = query.trim().toLowerCase();
    const shelves = new Map<string, ShelfItem[]>();
    for (const node of this.live.tree.nodes ?? []) {
      if (node.id === undefined || node.kind === 'document') continue;
      const title = describe(node);
      if (wanted !== '' && !node.id.toLowerCase().includes(wanted) && !title.toLowerCase().includes(wanted)) continue;
      shelves.set(node.kind, [...(shelves.get(node.kind) ?? []), { id: node.id, title, file: node.file }]);
    }
    const rank = (kind: string) => (COMPOSITIONS.includes(kind) ? COMPOSITIONS.indexOf(kind) : COMPOSITIONS.length);
    return [...shelves].sort(([a], [b]) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0)).map(([kind, items]) => ({ kind, items }));
  }

  /** The text of a file: the buffer not yet saved, else the file on disk. */
  read(path: string): string {
    const file = this.safe(path);
    const open = this.live.overlay.get(file);
    if (typeof open === 'string') return open;
    try {
      return normalize(readFileSync(join(this.folder, file), 'utf8'));
    } catch {
      return '';
    }
  }

  /** A buffer changed: it holds for the tree and the preview at once, before it is saved. */
  edit(path: string, text: string): void {
    this.live.overlay.set(this.safe(path), text);
    this.live.schedule();
  }

  /** Saves through the formatter, with a temporary file and a rename; returns the text written. */
  save(path: string, text: string): string {
    const file = this.safe(path);
    const formatted = formatText(file, text);
    this.writeAtomically(join(this.folder, file), formatted);
    this.live.overlay.delete(file);
    this.live.schedule();
    return formatted;
  }

  /** The diagnostics of a file, with their ranges. */
  diagnostics(path: string): EditorDiagnostic[] {
    const file = this.safe(path);
    return (this.live.tree.diagnostics ?? [])
      .filter((d) => d.file === file && d.range !== undefined)
      .map((d) => ({
        range: d.range!,
        severity: d.severity,
        code: d.code,
        message: `${d.code}${d.target === undefined ? '' : `: ${d.target}`}${d.fix === undefined ? '' : ` → ${d.fix}`}`,
      }));
  }

  complete(path: string, text: string, position: Position): Completion[] {
    const line = text.split('\n')[position.line] ?? '';
    return completions(this.live.tree, this.safe(path), line.slice(0, position.character), line.slice(position.character, position.character + 2), position);
  }

  hover(path: string, text: string, position: Position): { markdown: string; range?: Range } | null {
    return hoverAt(this.live.tree, this.safe(path), text.split('\n')[position.line] ?? '', position);
  }

  /** The file of the object under the cursor, for «vai alla definizione». */
  definition(path: string, text: string, position: Position): string | null {
    const reference = referenceAt(text.split('\n')[position.line] ?? '', position.character);
    return reference === null ? null : (definitionOf(this.live.tree, reference.id)[0] ?? null);
  }

  /** The article to preview for a file: its own, or the first that includes one of its objects, or the first. */
  articleFor(path: string | null): string | null {
    const articles = (this.live.tree.nodes ?? []).filter((node) => node.kind === 'article' && node.directive !== true && node.id !== undefined);
    if (path === null) return articles[0]?.id ?? null;
    const file = this.safe(path);
    const own = articles.find((node) => node.file === file);
    if (own) return own.id!;
    const ids = new Set((this.live.tree.nodes ?? []).filter((node) => node.file === file && node.id !== undefined).map((node) => node.id!));
    const includes = (article: TreeNode) => {
      const stack: JsonML[] = [...(article.content ?? [])];
      while (stack.length > 0) {
        const item = stack.pop()!;
        if (typeof item === 'string') continue;
        const attributes = item[1] !== null && typeof item[1] === 'object' && !Array.isArray(item[1]) ? (item[1] as Record<string, unknown>) : null;
        if (item[0] === 'embed' && typeof attributes?.id === 'string' && ids.has(attributes.id)) return true;
        for (const child of item.slice(attributes ? 2 : 1)) stack.push(child as JsonML);
      }
      return false;
    };
    return (articles.find(includes) ?? articles[0])?.id ?? null;
  }

  /** The address of the preview of an article, as serve gives it, marked for the app. */
  previewUrl(article: string): string {
    return `${this.base}/article/${encodeURIComponent(article)}?token=${encodeURIComponent(this.token)}&app=1`;
  }

  /** Whether an address is one of this preview's: the window lets nothing else load. */
  isPreview(url: string): boolean {
    return url.startsWith(`${this.base}/`);
  }

  /** «Estrai in un oggetto» on a composition file, saved first; the files written, or why not. */
  extract(path: string, text: string): { written: string[]; error?: string } {
    const file = this.safe(path);
    this.save(file, text);
    const workspace: Workspace = diskWorkspace(this.folder, () => [...this.live.listed.keys()]);
    this.live.recompute();
    try {
      const outcome = evaluate(workspace, planExtract(workspace, this.live.tree, file));
      if (outcome.newErrors.length > 0) return { written: [], error: outcome.newErrors.map((d) => d.code).join(', ') };
      write(this.folder, outcome, (target, content) => {
        this.writeAtomically(target, content);
        return true;
      });
      this.live.recompute();
      return { written: [...outcome.files.keys()] };
    } catch (error) {
      if (error instanceof OperationError) return { written: [], error: error.message };
      throw error;
    }
  }

  private writeAtomically(target: string, content: string): void {
    const temporary = join(dirname(target), `.${target.split('/').pop()}.${process.pid}.tmp`);
    const fd = openSync(temporary, 'w', 0o644);
    try {
      const bytes = Buffer.from(content, 'utf8');
      for (let offset = 0; offset < bytes.length; ) offset += writeSync(fd, bytes, offset);
    } finally {
      closeSync(fd);
    }
    try {
      renameSync(temporary, target);
    } catch (error) {
      unlinkSync(temporary);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.stopServe();
    this.live.close();
  }
}
