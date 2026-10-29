// The canvas (§0.11, §11.9): the canvas file is a JSON Canvas 1.0 file, named by a
// descriptor of kind canvas-file. Its file nodes name objects by path from the root of
// the document, with the subpath "#<id>" for an object of a multi-object file. The
// operations recall, place, archive, create --at and compose plan their files here
// and are checked and written as the others.
import { randomBytes } from 'node:crypto';
import { posix } from 'node:path';
import { addObject, idFromWords, isMultiObject, newId, nodeOf, OperationError, takenIds, type CreateRequest, type Plan, type Workspace } from './operations.js';
import type { ResolvedTree } from './tree.js';

/** The size of a new card, in the units of JSON Canvas. */
export const CARD_SIZE = { width: 360, height: 240 };
/** The name of the canvas a document gets at its first canvas operation. */
const DEFAULT_NAME = 'foglio';
/** The space left between cards placed by the runtime. */
const GAP = 40;
/** Kinds that have no card: the document file and the canvas file itself. */
const NO_CARD = new Set(['document', 'canvas-file']);

/** A node of JSON Canvas 1.0: the attributes it defines, and any other kept as it is. */
export interface CanvasNode {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  file?: string;
  subpath?: string;
  [key: string]: unknown;
}
interface CanvasData {
  nodes: CanvasNode[];
  edges: Array<Record<string, unknown>>;
  [key: string]: unknown;
}
export interface Canvas {
  /** The descriptor, and the .canvas it names, by path from the folder. */
  descriptor: string;
  path: string;
  data: CanvasData;
  /** The id of a descriptor still to write: the document had no canvas. */
  newId?: string;
}
/** Where an object is, as a file node names it. */
export interface Reference {
  file: string;
  subpath?: string;
}
/** A card: a file node of the canvas, with the object it names, or null. */
export interface Card {
  node: string;
  id: string | null;
  file: string;
  subpath?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function parseCanvas(path: string, text: string): CanvasData {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new OperationError(`${path}: il JSON Canvas non si legge`);
  }
  const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
  if (!isObject(data)) throw new OperationError(`${path}: il JSON Canvas non è un oggetto`);
  const nodes = data.nodes ?? [];
  const edges = data.edges ?? [];
  if (!Array.isArray(nodes) || !nodes.every(isObject) || !Array.isArray(edges) || !edges.every(isObject)) {
    throw new OperationError(`${path}: nodes ed edges del JSON Canvas devono essere liste di oggetti`);
  }
  return { ...data, nodes: nodes as CanvasNode[], edges };
}

/** The canvas files of the document, read. */
function canvasesOf(workspace: Workspace, tree: ResolvedTree): Canvas[] {
  return (tree.nodes ?? [])
    .filter((node) => node.kind === 'canvas-file' && node.directive !== true)
    .map((node) => {
      const asset = node.attributes?.asset;
      if (typeof asset !== 'string') throw new OperationError(`${node.file} non nomina il suo .canvas con asset`);
      const path = posix.normalize(posix.join(posix.dirname(node.file), asset));
      // A descriptor whose .canvas is not there yet: an empty canvas, written by the operation.
      return { descriptor: node.file, path, data: parseCanvas(path, workspace.read(path) ?? '{}') };
    });
}

/** The canvas of the document; with `create`, a new one when there is none (foglio.canvas and its descriptor). */
export function findCanvas(workspace: Workspace, tree: ResolvedTree, create: boolean): Canvas | null {
  const canvases = canvasesOf(workspace, tree);
  if (canvases.length > 1) throw new OperationError(`il documento ha più di un canvas file: ${canvases.map((c) => c.descriptor).join(', ')}`);
  if (canvases.length === 1) return canvases[0]!;
  if (!create) return null;
  const id = idFromWords(DEFAULT_NAME, takenIds(workspace, tree), DEFAULT_NAME);
  const files = new Set(workspace.files());
  const descriptor = `${id}.canvas-file.md`;
  const path = `${id}.canvas`;
  if (files.has(descriptor) || files.has(path)) throw new OperationError(`${descriptor} o ${path} c'è già: un canvas file va scritto a mano`);
  return { descriptor, path, data: { nodes: [], edges: [] }, newId: id };
}

/** The canvas into the plan: the .canvas with tabs, as Obsidian writes it, and a new descriptor if needed. */
function writeCanvas(plan: Plan, canvas: Canvas): void {
  plan.files.set(canvas.path, `${JSON.stringify(canvas.data, null, '\t')}\n`);
  if (canvas.newId !== undefined) {
    plan.files.set(canvas.descriptor, `---\nid: ${canvas.newId}\nkind: canvas-file\nasset: ${posix.basename(canvas.path)}\n---\n`);
  }
  plan.summary.canvas = canvas.path;
}

/** How a file node names an object: its file, and "#<id>" in a multi-object file. */
export function referenceOf(workspace: Workspace, tree: ResolvedTree, id: string): Reference {
  const node = nodeOf(tree, id);
  return isMultiObject(workspace, node.file) ? { file: node.file, subpath: `#${id}` } : { file: node.file };
}

/** Whether a file node names the object: by its subpath, or by the file alone when the object has a file of its own. */
const names = (entry: CanvasNode, reference: Reference, id: string) =>
  entry.type === 'file' && typeof entry.file === 'string' && posix.normalize(entry.file) === reference.file &&
  (entry.subpath === `#${id}` || (reference.subpath === undefined && (entry.subpath ?? '') === ''));

/** The cards of the canvas, with the object of each, in the order of the file. */
export function canvasCards(workspace: Workspace, tree: ResolvedTree): { canvas: string | null; cards: Card[] } {
  let canvas: Canvas | null;
  try {
    canvas = findCanvas(workspace, tree, false);
  } catch {
    return { canvas: null, cards: [] };
  }
  if (canvas === null) return { canvas: null, cards: [] };
  const cards: Card[] = [];
  for (const entry of canvas.data.nodes) {
    if (entry.type !== 'file' || typeof entry.file !== 'string') continue;
    const file = posix.normalize(entry.file);
    const inFile = (tree.nodes ?? []).filter((node) => node.file === file && node.id !== undefined && node.directive !== true);
    const subpath = typeof entry.subpath === 'string' && entry.subpath !== '' ? entry.subpath : undefined;
    const object = subpath !== undefined ? inFile.find((node) => `#${node.id}` === subpath) : inFile.length === 1 ? inFile[0] : undefined;
    const number = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
    cards.push({
      node: String(entry.id),
      id: object?.id ?? null,
      file,
      ...(subpath !== undefined ? { subpath } : {}),
      x: number(entry.x, 0),
      y: number(entry.y, 0),
      width: number(entry.width, CARD_SIZE.width),
      height: number(entry.height, CARD_SIZE.height),
    });
  }
  return { canvas: canvas.path, cards };
}

/** The order of reading of some cards: from top to bottom, then from left to right (§11.9). */
export function readingOrder<T extends { x: number; y: number; height: number }>(cards: T[]): T[] {
  // A card whose top is within half the height of the first card of a row is in that row.
  const byTop = [...cards].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: T[][] = [];
  for (const card of byTop) {
    const row = rows[rows.length - 1];
    if (row !== undefined && card.y < row[0]!.y + row[0]!.height / 2) row.push(card);
    else rows.push([card]);
  }
  return rows.flatMap((row) => row.sort((a, b) => a.x - b.x));
}

const integer = (value: number, name: string) => {
  if (!Number.isFinite(value)) throw new OperationError(`${name} non è un numero`);
  return Math.round(value);
};

/** A node id of JSON Canvas, 16 hex digits as Obsidian writes them, new in the canvas. */
function nodeId(canvas: Canvas): string {
  const taken = new Set(canvas.data.nodes.map((node) => node.id));
  let id = randomBytes(8).toString('hex');
  while (taken.has(id)) id = randomBytes(8).toString('hex');
  return id;
}

/** A place for a card when none is given: below every other, at the left edge of them. */
function freePlace(canvas: Canvas): { x: number; y: number } {
  const nodes = canvas.data.nodes.filter((node) => typeof node.x === 'number' && typeof node.y === 'number');
  if (nodes.length === 0) return { x: 0, y: 0 };
  return {
    x: Math.min(...nodes.map((node) => node.x)),
    y: Math.max(...nodes.map((node) => node.y + (typeof node.height === 'number' ? node.height : 0))) + GAP,
  };
}

function addCard(canvas: Canvas, reference: Reference, at: { x: number; y: number }): CanvasNode {
  const card: CanvasNode = {
    id: nodeId(canvas),
    type: 'file',
    file: reference.file,
    ...(reference.subpath !== undefined ? { subpath: reference.subpath } : {}),
    x: integer(at.x, 'x'),
    y: integer(at.y, 'y'),
    width: CARD_SIZE.width,
    height: CARD_SIZE.height,
  };
  canvas.data.nodes.push(card);
  return card;
}

/**
 * The card of an object that an operation acts on: the one named by `card`, the id of
 * its node, or the only one; with several and none named, the request is wrong.
 */
function cardOf(workspace: Workspace, tree: ResolvedTree, canvas: Canvas | null, id: string, card?: string): number {
  const reference = referenceOf(workspace, tree, id);
  const cards = (canvas?.data.nodes ?? []).flatMap((entry, index) => (names(entry, reference, id) ? [index] : []));
  if (cards.length === 0) throw new OperationError(`${id} non è sul canvas: richiamalo con recall`);
  if (card !== undefined) {
    const index = cards.find((each) => canvas!.data.nodes[each]!.id === card);
    if (index === undefined) throw new OperationError(`${card} non è una scheda di ${id}`);
    return index;
  }
  if (cards.length > 1) throw new OperationError(`${id} ha ${cards.length} schede: di' quale con --card <id del nodo> (${cards.map((each) => canvas!.data.nodes[each]!.id).join(', ')})`);
  return cards[0]!;
}

/**
 * `recall`: a card of an object on the canvas, at a place or below the others. The
 * object may have other cards already: each is the same object, not a copy.
 */
export function planRecall(workspace: Workspace, tree: ResolvedTree, id: string, at?: { x: number; y: number }): Plan {
  const node = nodeOf(tree, id);
  if (NO_CARD.has(node.kind)) throw new OperationError(`${id} è un ${node.kind}: non va sul canvas`);
  const canvas = findCanvas(workspace, tree, true)!;
  const card = addCard(canvas, referenceOf(workspace, tree, id), at ?? freePlace(canvas));
  const plan: Plan = { operation: 'recall', files: new Map(), copies: [], summary: { id, node: card.id, x: card.x, y: card.y } };
  writeCanvas(plan, canvas);
  return plan;
}

/** `place`: a card of an object somewhere else on the canvas. */
export function planPlace(workspace: Workspace, tree: ResolvedTree, id: string, at: { x: number; y: number }, which?: string): Plan {
  nodeOf(tree, id);
  const canvas = findCanvas(workspace, tree, false);
  const card = canvas!.data.nodes[cardOf(workspace, tree, canvas, id, which)]!;
  card.x = integer(at.x, 'x');
  card.y = integer(at.y, 'y');
  const plan: Plan = { operation: 'place', files: new Map(), copies: [], summary: { id, node: card.id, x: card.x, y: card.y } };
  writeCanvas(plan, canvas!);
  return plan;
}

/** `archive`: one card leaves the canvas, with its edges; the object stays, in the navigator, and on the canvas while it has another card. */
export function planArchive(workspace: Workspace, tree: ResolvedTree, id: string, which?: string): Plan {
  nodeOf(tree, id);
  const canvas = findCanvas(workspace, tree, false)!;
  const [card] = canvas.data.nodes.splice(cardOf(workspace, tree, canvas, id, which), 1);
  canvas.data.edges = canvas.data.edges.filter((edge) => edge.fromNode !== card!.id && edge.toNode !== card!.id);
  const plan: Plan = { operation: 'archive', files: new Map(), copies: [], summary: { id, node: card!.id } };
  writeCanvas(plan, canvas);
  return plan;
}

/** `create --at`: a new object with its card; a text goes in the texts file of the canvas, next to its descriptor. */
export function planCreateOnCanvas(workspace: Workspace, tree: ResolvedTree, request: CreateRequest): Plan {
  if (request.into !== undefined || request.after !== undefined || request.before !== undefined) throw new OperationError('--at non va con --in, --after o --before');
  if (NO_CARD.has(request.kind)) throw new OperationError(`un ${request.kind} non va sul canvas`);
  const canvas = findCanvas(workspace, tree, true)!;
  const id = newId(workspace, tree, request);
  const plan: Plan = { operation: 'create', files: new Map(), copies: [], summary: { id, kind: request.kind } };
  addObject(workspace, plan, canvas.descriptor, request, id);
  const file = String(plan.summary.file);
  const card = addCard(canvas, request.kind === 'text' ? { file, subpath: `#${id}` } : { file }, request.at!);
  plan.summary.node = card.id;
  plan.summary.x = card.x;
  plan.summary.y = card.y;
  writeCanvas(plan, canvas);
  return plan;
}

export interface ComposeRequest {
  /** The objects, in the order of the article. */
  ids: string[];
  title: string;
  id?: string;
}

/** `compose`: an article with a title and the embeds of the objects, in the order given, next to the canvas file. */
export function planCompose(workspace: Workspace, tree: ResolvedTree, request: ComposeRequest): Plan {
  const title = request.title.trim();
  if (title === '') throw new OperationError('compose vuole un titolo: --title "…"');
  if (request.ids.length === 0) throw new OperationError('compose vuole almeno un oggetto');
  // The same object twice, from two of its cards, is two embeds.
  for (const id of request.ids) nodeOf(tree, id);
  const id = newId(workspace, tree, { kind: 'article', text: title, ...(request.id !== undefined ? { id: request.id } : {}) });
  const canvas = findCanvas(workspace, tree, false);
  const folder = canvas === null ? '.' : posix.dirname(canvas.descriptor);
  const file = folder === '.' ? `${id}.article.md` : `${folder}/${id}.article.md`;
  if (workspace.read(file) !== null) throw new OperationError(`${file} c'è già`);
  const plan: Plan = { operation: 'compose', files: new Map(), copies: [], summary: { id, file, embeds: request.ids } };
  plan.files.set(file, `---\nid: ${id}\nkind: article\ntitle: ${JSON.stringify(title)}\n---\n${request.ids.map((each) => `![[${each}]]`).join('\n\n')}\n`);
  return plan;
}

/**
 * After rename and move: the cards that name the object follow it, with the subpath
 * "#<id>" when it ends up in a multi-object file, without when in a file of its own.
 */
export function retargetCanvas(workspace: Workspace, tree: ResolvedTree, plan: Plan, id: string, from: { file: string; multi: boolean }, to: { file: string; multi: boolean }, newObjectId: string): void {
  let canvases: Canvas[];
  try {
    canvases = canvasesOf(workspace, tree);
  } catch {
    // A canvas that does not read stays as it is: its diagnostics say so.
    return;
  }
  const reference: Reference = from.multi ? { file: from.file, subpath: `#${id}` } : { file: from.file };
  for (const canvas of canvases) {
    let changed = false;
    for (const entry of canvas.data.nodes) {
      if (!names(entry, reference, id)) continue;
      entry.file = to.file;
      if (to.multi) entry.subpath = `#${newObjectId}`;
      else delete entry.subpath;
      changed = true;
    }
    if (changed) plan.files.set(canvas.path, `${JSON.stringify(canvas.data, null, '\t')}\n`);
  }
}
