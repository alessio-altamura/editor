// What the main process does for the window, without Electron: the runtime kept on over
// a document folder, the services of the language server on its tree, the preview of
// serve on the same runtime, saving through the formatter. The IPC calls these.
import { closeSync, openSync, readFileSync, renameSync, unlinkSync, writeSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { readAsset } from 'doc-runtime/dist/src/assets.js';
import { CARD_SIZE, canvasCards, planArchive, planArrange, planCompose, planGather, planPlace, planRecall, readingOrder, type ArrangeBy, type CanvasGroup } from 'doc-runtime/dist/src/canvas.js';
import { besidePlace } from 'doc-runtime/dist/src/canvas-layout.js';
import { formatText } from 'doc-runtime/dist/src/format.js';
import { completions, definitionOf, describe, hoverAt, referenceAt, type Completion, type Position, type Range } from 'doc-runtime/dist/src/language-services.js';
import { LiveFolder } from 'doc-runtime/dist/src/live.js';
import { diskWorkspace, evaluate, OperationError, planCreate, planExtract, shape, write, type Plan, type Workspace } from 'doc-runtime/dist/src/operations.js';
import { listDocumentFiles, resolveTree } from 'doc-runtime/dist/src/resolve-tree.js';
import { serve } from 'doc-runtime/dist/src/serve.js';
import { standalonePage, standaloneTree } from 'doc-runtime/dist/src/standalone.js';
import type { JsonML, TreeNode } from 'doc-runtime/dist/src/tree.js';

/** The compositions come first in the navigator, then the other kinds by name. */
const COMPOSITIONS = ['article', 'chapter'];

export interface ShelfItem {
  id: string;
  title: string;
  file: string;
  /** Whether the object has a card on the canvas; otherwise it is archived. */
  onCanvas: boolean;
}
/** A card of the canvas, with the object as it will appear: the HTML of the preview, or null. */
export interface CardView {
  node: string;
  id: string | null;
  kind: string | null;
  title: string;
  file: string;
  x: number;
  y: number;
  width: number;
  height: number;
  html: string | null;
}
/** The text of one object in its file, and what comes before and after it. */
export interface ObjectSource {
  file: string;
  before: string;
  text: string;
  after: string;
}
/** What a canvas operation did, or why it did nothing. */
export interface Done {
  summary?: Record<string, unknown>;
  error?: string;
}
type At = { x: number; y: number };
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
    const onCanvas = new Set(canvasCards(this.workspace(), this.live.tree).cards.map((card) => card.id));
    for (const node of this.live.tree.nodes ?? []) {
      // The document file and the canvas file are not objects to place.
      if (node.id === undefined || node.kind === 'document' || node.kind === 'canvas-file') continue;
      const title = describe(node);
      if (wanted !== '' && !node.id.toLowerCase().includes(wanted) && !title.toLowerCase().includes(wanted)) continue;
      shelves.set(node.kind, [...(shelves.get(node.kind) ?? []), { id: node.id, title, file: node.file, onCanvas: onCanvas.has(node.id) }]);
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

  /** Forgets a buffer not saved: the file on disk holds again. */
  discard(path: string): void {
    this.live.overlay.delete(this.safe(path));
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

  /** The address of the preview of one object alone. */
  objectPreviewUrl(id: string): string {
    return `${this.base}/object/${encodeURIComponent(id)}?token=${encodeURIComponent(this.token)}&app=1`;
  }

  /** The folder as the operations read it: the buffers open in the editor hold. */
  private workspace(): Workspace {
    return { ...diskWorkspace(this.folder, () => [...this.live.listed.keys()]), overlay: this.live.overlay };
  }

  /** The cards of the canvas, each with its object drawn by the renderer of the preview, with the base stylesheet. */
  canvas(): { canvas: string | null; cards: CardView[]; groups: CanvasGroup[] } {
    const { canvas, cards, groups } = canvasCards(this.workspace(), this.live.tree);
    const ids = cards.flatMap((card) => (card.id === null ? [] : [card.id]));
    const standalone = standaloneTree(this.folder, this.live.overlay, ids, false);
    const url = (path: string) => `${this.base}${path}?token=${encodeURIComponent(this.token)}`;
    const preview = {
      assetUrl: (path: string) => url(`/asset/${path.split('/').map(encodeURIComponent).join('/')}`),
      fontUrl: (file: string) => url(`/font/${encodeURIComponent(file)}`),
      scriptUrls: [],
      diagnostics: [],
    };
    const listed = this.live.listed;
    return {
      canvas,
      groups,
      cards: cards.map((card) => {
        const node = card.id === null ? undefined : (this.live.tree.nodes ?? []).find((n) => n.id === card.id);
        return {
          node: card.node,
          id: card.id,
          kind: node?.kind ?? null,
          title: node ? describe(node) : `${card.file}${card.subpath ?? ''}`,
          file: card.file,
          x: card.x,
          y: card.y,
          width: card.width,
          height: card.height,
          html: card.id === null ? null : standalonePage(standalone, card.id, preview, (path) => readAsset(this.folder, path, listed)),
        };
      }),
    };
  }

  /** The text of an object: in a multi-object file from its attribute line to its last block, otherwise the whole file. */
  objectSource(id: string): ObjectSource {
    const node = (this.live.tree.nodes ?? []).find((n) => n.id === id);
    if (node === undefined) throw new Error(`nessun oggetto con id ${id}`);
    const file = this.safe(node.file);
    const text = this.read(file);
    const fileShape = shape(file, text);
    const object = fileShape.multi ? fileShape.objects.find((o) => o.id === id) : undefined;
    if (object === undefined) return { file, before: '', text, after: '' };
    return { file, before: text.slice(0, object.start), text: text.slice(object.start, object.end), after: text.slice(object.end) };
  }

  /** Some cards, by node, in their order of reading: from top to bottom, then from left to right. */
  readingOrder(nodes: string[]): string[] {
    const cards = canvasCards(this.workspace(), this.live.tree).cards.filter((card) => nodes.includes(card.node));
    return readingOrder(cards).map((card) => card.node);
  }

  recall(id: string, at?: At): Done {
    return this.operate((workspace, tree) => planRecall(workspace, tree, id, at));
  }

  /** `card` is the id of the node, needed when the object has several cards; a size enlarges or shrinks it. */
  place(id: string, at: At | undefined, card?: string, size?: { width: number; height: number }): Done {
    return this.operate((workspace, tree) => planPlace(workspace, tree, id, at, card, size));
  }

  /** Where a new text next to a card goes: to the right or below, where there is more room. */
  besidePlace(node: string): At | null {
    const boxes = canvasCards(this.workspace(), this.live.tree);
    const all = [...boxes.cards.map((c) => ({ id: c.node, x: c.x, y: c.y, width: c.width, height: c.height, group: false })), ...boxes.groups.map((g) => ({ id: g.node, x: g.x, y: g.y, width: g.width, height: g.height, group: true }))];
    const target = all.find((box) => box.id === node);
    return target === undefined ? null : besidePlace(target, CARD_SIZE, all);
  }

  /** A new text next to a card of an object. */
  createNear(id: string, card: string, text: string): Done {
    return this.operate((workspace, tree) => planCreate(workspace, tree, { kind: 'text', near: { id, card }, text }));
  }

  gather(id: string, card?: string): Done {
    return this.operate((workspace, tree) => planGather(workspace, tree, id, card));
  }

  arrange(by: ArrangeBy): Done {
    return this.operate((workspace, tree) => planArrange(workspace, tree, by));
  }

  archive(id: string, card?: string): Done {
    return this.operate((workspace, tree) => planArchive(workspace, tree, id, card));
  }

  /** A new text with its card, where the canvas was double-clicked. */
  createText(at: At, text: string): Done {
    return this.operate((workspace, tree) => planCreate(workspace, tree, { kind: 'text', at, text }));
  }

  compose(ids: string[], title: string): Done {
    return this.operate((workspace, tree) => planCompose(workspace, tree, { ids, title }));
  }

  /** An operation on the files on disk, as the cli runs it: refused if it brings new errors. */
  private operate(make: (workspace: Workspace, tree: ReturnType<typeof resolveTree>) => Plan): Done {
    const workspace = diskWorkspace(this.folder, () => [...listDocumentFiles(this.folder).keys()]);
    let plan: Plan;
    try {
      plan = make(workspace, resolveTree(this.folder));
    } catch (error) {
      if (error instanceof OperationError) return { error: error.message };
      throw error;
    }
    const outcome = evaluate(workspace, plan);
    if (outcome.newErrors.length > 0) return { error: outcome.newErrors.map((d) => `${d.code}${d.target === undefined ? '' : ` ${d.target}`}`).join(', ') };
    write(this.folder, outcome, (target, content) => {
      this.writeAtomically(target, content);
      return true;
    });
    for (const file of outcome.files.keys()) this.live.overlay.delete(file);
    this.live.recompute();
    return { summary: plan.summary };
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
