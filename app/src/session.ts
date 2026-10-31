// What the main process does for the window, without Electron: the runtime kept on over
// a document folder, the services of the language server on its tree, the preview of
// serve on the same runtime, saving through the formatter. The IPC calls these.
import { closeSync, openSync, readFileSync, renameSync, unlinkSync, writeSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { readAsset } from 'doc-runtime/dist/src/assets.js';
import { CARD_SIZE, canvasCards, planArchive, planArrange, planCompose, planGather, planPlace, planRecall, readingOrder, type ArrangeBy, type CanvasGroup } from 'doc-runtime/dist/src/canvas.js';
import { besidePlace } from 'doc-runtime/dist/src/canvas-layout.js';
import { planTurnInto, tableAtLine } from 'doc-runtime/dist/src/collection-operations.js';
import { formatText, writeHeader } from 'doc-runtime/dist/src/format.js';
import { readRecords, readSchema } from 'doc-runtime/dist/src/collection.js';
import type { ChartCollection, ChartSource, ChartState } from './chart-model.js';
import type { FormulaSource, PanelCollection } from './formula-model.js';
import { planComputedField, readFormula, writeFormula } from 'doc-runtime/dist/src/formula-operations.js';
import { parseYamlMap, splitFrontMatter, type RawValue } from 'doc-runtime/dist/src/front-matter.js';
import { completions, definitionOf, describe, hoverAt, referenceAt, type Completion, type Position, type Range } from 'doc-runtime/dist/src/language-services.js';
import { CARD_RECORDS, LiveFolder } from 'doc-runtime/dist/src/live.js';
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
  /** A formula: its value with the display of §0.4 (class 4). */
  value?: string;
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
  /** What the diagnostic is about, and its suggestion: the chart panel shows them on the place of the role. */
  target?: string;
  fix?: string;
}

/** The display of the value of a formula in the tree (class 4), if it has one. */
function formulaDisplay(node: TreeNode): string | undefined {
  const element = (node.content ?? []).find((item) => Array.isArray(item) && item[0] === 'formula') as unknown[] | undefined;
  const attributes = element?.[1] as { display?: unknown } | undefined;
  return typeof attributes?.display === 'string' ? attributes.display : undefined;
}

/**
 * The values of the computed fields of a collection, from its table in the tree, by field:
 * the plain value of each record shown (class 4); the grid shows them and never writes them.
 */
function computedValues(node: TreeNode | undefined): Record<string, string[]> {
  const table = (node?.content ?? []).find((item) => Array.isArray(item) && item[0] === 'table') as unknown[] | undefined;
  if (table === undefined) return {};
  const fields = ((table[1] as { fields?: Array<{ name: string; formula?: string }> }).fields ?? []);
  const rows = table.slice(2).filter((row) => Array.isArray(row) && row[0] === 'tableRow').slice(1) as unknown[][];
  const out: Record<string, string[]> = {};
  fields.forEach((field, index) => {
    if (field.formula === undefined) return;
    out[field.name] = rows.map((row) => {
      const cell = row.filter((item) => Array.isArray(item) && item[0] === 'tableCell')[index] as unknown[] | undefined;
      const attributes = cell?.[1];
      const value = attributes !== null && typeof attributes === 'object' && !Array.isArray(attributes) ? (attributes as { value?: unknown }).value : undefined;
      return value === undefined ? '' : String(value);
    });
  });
  return out;
}

const pythonName = (name: string) => name.replace(/-/g, '_');
/** Where an object of a file starts, for the order of the menu: its attribute line, or the start. */
const fileOffset = (text: string, id: string) => Math.max(0, text.indexOf(`{#${id}`));

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
      const value = node.kind === 'formula' ? formulaDisplay(node) : undefined;
      shelves.set(node.kind, [...(shelves.get(node.kind) ?? []), { id: node.id, title, file: node.file, onCanvas: onCanvas.has(node.id), ...(value !== undefined ? { value } : {}) }]);
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
        ...(d.target !== undefined ? { target: d.target } : {}),
        ...(d.fix !== undefined ? { fix: d.fix } : {}),
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
    const standalone = standaloneTree(this.folder, this.live.overlay, ids, false, CARD_RECORDS);
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

  /** «Crea grafico» from a collection: a chart with the template and the roles proposed from the types, next to it (class 3). */
  createChart(path: string): Done {
    const file = this.safe(path);
    const node = (this.live.tree.nodes ?? []).find((each) => each.file === file && each.kind === 'collection');
    if (node?.id === undefined) return { error: `${file} non è una collection` };
    return this.operate((workspace, tree) => planCreate(workspace, tree, { kind: 'chart', collection: node.id! }));
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

  /** The text or scratch whose table holds a line (from 0) of a file: «Trasforma in collection» can run there. */
  tableAt(path: string, text: string, line: number): string | null {
    return tableAtLine(this.live.tree, this.safe(path), text, line + 1)?.id ?? null;
  }

  /** «Trasforma in collection» on the table at a line (from 0), the file saved first. */
  turnInto(path: string, text: string, line: number): Done {
    const file = this.safe(path);
    this.save(file, text);
    this.live.recompute();
    const table = tableAtLine(this.live.tree, file, this.read(file), line + 1);
    if (table === null) return { error: 'qui non c\'è una tabella di un text o di uno scratch' };
    return this.operate((workspace, tree) => planTurnInto(workspace, tree, table.id, { line: table.line }));
  }

  /**
   * What the chart panel opens on: the state of the chart as written (the buffers hold),
   * and the collections of the document, each with its fields and, for the filter, the
   * distinct values of each field as written, the first 200. Null if the file does not read.
   */
  chartSource(path: string): ChartSource | null {
    const file = this.safe(path);
    const split = splitFrontMatter(this.read(file));
    if ('error' in split || split.frontMatter === null) return null;
    const map = parseYamlMap(split.frontMatter);
    if ('error' in map) return null;
    const raw = (key: string) => map.entries.find(([name]) => name === key)?.[1];
    const string = (key: string) => {
      const value = raw(key);
      return value?.type === 'string' && value.value !== '' ? value.value : undefined;
    };
    if (string('kind') !== 'chart') return null;
    const filterRaw = raw('filter');
    const filter: Record<string, string[]> = {};
    if (filterRaw?.type === 'structure' && filterRaw.value !== null && typeof filterRaw.value === 'object' && !Array.isArray(filterRaw.value)) {
      for (const [name, values] of Object.entries(filterRaw.value as Record<string, unknown>)) {
        const list = typeof values === 'string' ? [values] : Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string') : [];
        if (list.length > 0) filter[name] = list;
      }
    }
    const state: ChartState = {
      template: string('template') ?? 'bar',
      collection: (string('collection') ?? '').replace(/^\[\[(.*)\]\]$/, '$1'),
      ...(string('x') !== undefined ? { x: string('x')! } : {}),
      ...(string('y') !== undefined ? { y: string('y')! } : {}),
      ...(string('series') !== undefined ? { series: string('series')! } : {}),
      filter,
      description: split.body.trim(),
    };
    return { file, state, collections: this.panelCollections() };
  }

  /** The collections of the document, each with its fields and the distinct values of each field as written, the first 200. */
  private panelCollections(): PanelCollection[] {
    const collections: PanelCollection[] = [];
    for (const node of this.live.tree.nodes ?? []) {
      if (node.kind !== 'collection' || node.id === undefined) continue;
      const fields = (Array.isArray(node.attributes?.fields) ? node.attributes.fields : []) as Array<Record<string, unknown>>;
      const named = fields.filter((field) => typeof field.name === 'string').map((field) => ({ name: String(field.name), type: typeof field.type === 'string' ? field.type : 'string', ...(typeof field.title === 'string' ? { title: field.title } : {}), ...(typeof field.formula === 'string' ? { formula: field.formula.replace(/^\[\[(.*)\]\]$/, '$1') } : {}) }));
      const values: Record<string, string[]> = {};
      const data = this.dataFile(node.file);
      if (data !== null) {
        const extension = /\.csv$/i.test(data) ? 'csv' : 'tsv';
        const { schema } = readSchema({ fields, ...(node.attributes?.dialect !== undefined ? { dialect: node.attributes.dialect } : {}) }, extension);
        const records = readRecords(this.read(data), schema).records;
        const header = records.shift()?.cells.map((cell) => cell.text) ?? [];
        for (const field of named) {
          const at = header.indexOf(field.name);
          values[field.name] = at < 0 ? [] : [...new Set(records.map((record) => record.cells[at]?.text ?? '').filter((text) => text !== ''))].slice(0, 200);
        }
      }
      collections.push({ id: node.id, fields: named, values });
    }
    return collections;
  }

  /** The text of a chart file with the state of the panel, the other keys as written, through the formatter. */
  chartText(path: string, state: ChartState): string {
    const file = this.safe(path);
    const split = splitFrontMatter(this.read(file));
    if ('error' in split || split.frontMatter === null) throw new Error(`${file}: il front matter non si legge`);
    const map = parseYamlMap(split.frontMatter);
    if ('error' in map) throw new Error(`${file}: il front matter non si legge`);
    const own = new Set(['template', 'collection', 'x', 'y', 'series', 'filter']);
    const plain = (value: string): RawValue => ({ type: 'string', value, plain: true });
    const entries: Array<[string, RawValue]> = map.entries.filter(([key]) => !own.has(key));
    entries.push(['template', plain(String(state.template))]);
    if (state.collection !== '') entries.push(['collection', { type: 'string', value: `[[${state.collection}]]`, plain: false }]);
    for (const role of ['x', 'y', 'series'] as const) if (typeof state[role] === 'string' && state[role] !== '') entries.push([role, plain(state[role]!)]);
    const filter = Object.fromEntries(Object.entries(state.filter ?? {}).filter(([, values]) => Array.isArray(values) && values.length > 0).map(([name, values]) => [String(name), values.map(String)]));
    if (Object.keys(filter).length > 0) entries.push(['filter', { type: 'structure', value: filter }]);
    const description = String(state.description ?? '').trim();
    return formatText(file, `---\n${writeHeader(entries)}\n---\n${description}${description === '' ? '' : '\n'}`);
  }

  /** The panel changed: its text holds for the tree and the preview, before it is saved. */
  chartEdit(path: string, state: ChartState): string {
    const text = this.chartText(path, state);
    this.edit(path, text);
    return text;
  }

  chartSave(path: string, state: ChartState): string {
    return this.save(path, this.chartText(path, state));
  }

  /**
   * What the formula builder opens on: an object of a formula file (the first if no id),
   * its inputs and its code as written (the buffers hold), the collection whose computed
   * field it is, the collections and the other formulas to drag in, its value or its problems.
   */
  formulaSource(path: string, id?: string): FormulaSource | null {
    const file = this.safe(path);
    const nodes = (this.live.tree.nodes ?? []).filter((node) => node.file === file && node.kind === 'formula' && node.id !== undefined);
    const text = this.read(file);
    const ids = nodes.map((node) => node.id!).sort((a, b) => (fileOffset(text, a) - fileOffset(text, b)));
    const wanted = id ?? ids[0];
    if (wanted === undefined || !ids.includes(wanted)) return null;
    const written = readFormula(file, text, wanted);
    if (written === null) return null;
    const column = (this.live.tree.nodes ?? []).find((node) => node.kind === 'collection' && Array.isArray(node.attributes?.fields)
      && (node.attributes.fields as Array<Record<string, unknown>>).some((field) => field.formula === `[[${wanted}]]`))?.id ?? null;
    const columnFormulas = new Set(this.panelCollections().flatMap((collection) => collection.fields.flatMap((field) => (field.formula ? [field.formula] : []))));
    const formulas = (this.live.tree.nodes ?? [])
      .filter((node) => node.kind === 'formula' && node.id !== undefined && node.id !== wanted && !columnFormulas.has(node.id))
      .map((node) => ({ id: node.id!, ...(formulaDisplay(node) !== undefined ? { display: formulaDisplay(node)! } : {}) }));
    const node = nodes.find((each) => each.id === wanted)!;
    // The problems of this object: by its id, or on its lines in a file with several.
    const source = this.objectSource(wanted);
    const first = source.before.split('\n').length - 1;
    const last = first + source.text.split('\n').length - 1;
    const problems = (this.live.tree.diagnostics ?? [])
      .filter((d) => d.file === file && (d.target === wanted || (d.range !== undefined && d.range.start.line >= first && d.range.start.line <= last)))
      .map((d) => `${d.code}${d.message === undefined ? '' : `: ${d.message}`}${d.fix === undefined ? '' : ` → ${d.fix}`}`);
    const display = formulaDisplay(node);
    return { file, id: wanted, ids, inputs: written.inputs, code: written.code, column, collections: this.panelCollections(), formulas, ...(display !== undefined ? { display } : {}), problems };
  }

  /** The text of a formula file with the inputs and the code of one object from the builder, through the formatter. */
  formulaText(path: string, id: string, inputs: string[], code: string): string {
    const file = this.safe(path);
    return writeFormula(file, this.read(file), id, inputs, code);
  }

  /** The builder changed: its text holds for the tree and the preview, before it is saved. */
  formulaEdit(path: string, id: string, inputs: string[], code: string): string {
    const text = this.formulaText(path, id, inputs, code);
    this.edit(path, text);
    return text;
  }

  formulaSave(path: string, id: string, inputs: string[], code: string): string {
    return this.save(path, this.formulaText(path, id, inputs, code));
  }

  /**
   * A field or a formula dropped in the code of a formula, at an offset of the text of the
   * editor: its name in the code, with the underscore, and in the inputs of the object.
   * Null when the offset is not inside a python block of a formula.
   */
  formulaInsert(path: string, text: string, offset: number, input: string): { text: string; cursor: number } | null {
    const file = this.safe(path);
    if (!/\.formula\.md$/.test(file)) return null;
    let objects;
    try {
      objects = shape(file, text).objects;
    } catch {
      return null;
    }
    for (const object of objects) {
      const block = object.blocks.find((each) => each.node.type === 'code' && (each.node as { lang?: string | null }).lang === 'python' && offset > each.start && offset < each.end);
      if (block === undefined) continue;
      const codeStart = block.start + block.text.indexOf('\n') + 1;
      const code = (block.node as { value: string }).value;
      const at = Math.max(0, Math.min(code.length, offset - codeStart));
      const name = input.split('.').map(pythonName).join('.');
      const id = object.id ?? (this.live.tree.nodes ?? []).find((node) => node.file === file && node.kind === 'formula')?.id;
      if (id === undefined) return null;
      const written = readFormula(file, text, id);
      const inputs = [...new Set([...(written?.inputs ?? []), input])];
      const next = writeFormula(file, text, id, inputs, code.slice(0, at) + name + code.slice(at));
      // The cursor after the name: the same place in the code of the object written again.
      const again = shape(file, next).objects.find((each) => each.id === id) ?? shape(file, next).objects[0]!;
      const block2 = again.blocks.find((each) => each.node.type === 'code' && (each.node as { lang?: string | null }).lang === 'python')!;
      return { text: next, cursor: block2.start + block2.text.indexOf('\n') + 1 + at + name.length };
    }
    return null;
  }

  /** `create formula`: in the formula file of the document, with its inputs and its code. */
  createFormula(request: { id?: string; inputs?: string[]; code?: string }): Done {
    return this.operate((workspace, tree) => planCreate(workspace, tree, { kind: 'formula', ...request }));
  }

  /** «Campo calcolato» in the grid: a formula, empty, and the field of the schema that names it. */
  computedField(path: string, title: string): Done {
    const file = this.safe(path);
    const node = (this.live.tree.nodes ?? []).find((each) => each.file === file && each.kind === 'collection');
    if (node?.id === undefined) return { error: `${file} non è una collection` };
    return this.operate((workspace, tree) => planComputedField(workspace, tree, node.id!, title));
  }

  /** Where Pyodide is: the app shows «Python in avvio» while it starts. */
  python(): string {
    return this.live.formulas.status;
  }

  /** Called when Pyodide starts, is ready or fails. */
  onPython(listener: (status: string) => void): void {
    this.live.formulas.onStatus = listener;
  }

  /** What the grid opens on: the schema as written in the descriptor, the data file and its text (the buffers hold). */
  gridSource(path: string): { descriptor: string; id?: string; data: string; extension: 'tsv' | 'csv'; fields: unknown; primaryKey?: unknown; missingValues?: unknown; dialect?: unknown; text: string; lang: string | undefined; computed: Record<string, string[]> } | null {
    const descriptor = this.safe(path);
    const data = this.dataFile(descriptor);
    const extension = /\.(tsv|csv)$/i.exec(data ?? '')?.[1]?.toLowerCase() as 'tsv' | 'csv' | undefined;
    const split = splitFrontMatter(this.read(descriptor));
    if (data === null || extension === undefined || 'error' in split || split.frontMatter === null) return null;
    const map = parseYamlMap(split.frontMatter);
    if ('error' in map) return null;
    const value = (key: string) => {
      const raw = map.entries.find(([name]) => name === key)?.[1];
      return raw === undefined || raw.type === 'invalid' ? undefined : raw.value;
    };
    const node = (this.live.tree.nodes ?? []).find((each) => each.file === descriptor);
    const lang = typeof node?.attributes?.lang === 'string' ? node.attributes.lang : typeof this.live.tree.document?.attributes?.lang === 'string' ? this.live.tree.document.attributes.lang : undefined;
    return { descriptor, ...(node?.id !== undefined ? { id: node.id } : {}), data, extension, fields: value('fields'), primaryKey: value('primaryKey'), missingValues: value('missingValues'), dialect: value('dialect'), text: this.read(data), lang, computed: computedValues(node) };
  }

  /** The descriptor with these fields, the rest as written; a key on a field that went goes too. */
  private gridDescriptor(descriptor: string, fields: Array<Record<string, unknown>>): string {
    const text = this.read(descriptor);
    const split = splitFrontMatter(text);
    if ('error' in split || split.frontMatter === null) throw new Error(`${descriptor}: il front matter non si legge`);
    const map = parseYamlMap(split.frontMatter);
    if ('error' in map) throw new Error(`${descriptor}: il front matter non si legge`);
    const names = new Set(fields.map((field) => field.name));
    const entries: Array<[string, RawValue]> = [];
    for (const [key, value] of map.entries) {
      if (key === 'fields') entries.push([key, { type: 'structure', value: fields }]);
      else if (key === 'primaryKey') {
        const kept = (value.type === 'list' ? value.value : value.type === 'string' ? [value.value] : []).filter((name) => names.has(name));
        if (kept.length === 1) entries.push([key, { type: 'string', value: kept[0]!, plain: true }]);
        else if (kept.length > 1) entries.push([key, { type: 'list', value: kept }]);
      } else entries.push([key, value]);
    }
    return formatText(descriptor, `---\n${writeHeader(entries)}\n---\n${split.body}`);
  }

  /** The grid not saved: the descriptor and the data hold for the tree and the preview at once, as buffers. */
  gridEdit(path: string, fields: Array<Record<string, unknown>>, data: string): void {
    const descriptor = this.safe(path);
    const dataFile = this.dataFile(descriptor);
    if (dataFile === null) throw new Error(`${descriptor} non ha un file di dati`);
    this.live.overlay.set(descriptor, this.gridDescriptor(descriptor, fields));
    this.live.overlay.set(dataFile, data);
    this.live.schedule();
  }

  /** Saves the grid: the descriptor through the formatter and the data file, together. */
  gridSave(path: string, fields: Array<Record<string, unknown>>, data: string): void {
    const descriptor = this.safe(path);
    const dataFile = this.dataFile(descriptor);
    if (dataFile === null) throw new Error(`${descriptor} non ha un file di dati`);
    const text = this.gridDescriptor(descriptor, fields);
    this.writeAtomically(join(this.folder, dataFile), data);
    this.writeAtomically(join(this.folder, descriptor), text);
    this.live.overlay.delete(descriptor);
    this.live.overlay.delete(dataFile);
    this.live.schedule();
  }

  /** The data file of a collection descriptor, or null. */
  dataFile(path: string): string | null {
    const node = (this.live.tree.nodes ?? []).find((each) => each.file === this.safe(path) && each.kind === 'collection');
    const asset = node?.attributes?.asset;
    if (typeof asset !== 'string') return null;
    return this.file(join(dirname(node!.file), asset).split(sep).join('/'));
  }

  /** The descriptor of the collection whose data file this is; null if none. */
  collectionOf(path: string): string | null {
    const file = this.safe(path);
    return (this.live.tree.nodes ?? []).find((node) => node.kind === 'collection' && this.dataFile(node.file) === file)?.file ?? null;
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
