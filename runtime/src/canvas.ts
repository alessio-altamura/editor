// The canvas (§0.11, §11.9): the canvas file is a JSON Canvas 1.0 file, named by a
// descriptor of kind canvas-file. Its file nodes name objects by path from the root of
// the document, with the subpath "#<id>" for an object of a multi-object file. The
// operations recall, place, archive, create --at and compose plan their files here
// and are checked and written as the others.
import { randomBytes } from 'node:crypto';
import { posix } from 'node:path';
import { addObject, idFromWords, isMultiObject, newId, nodeOf, OperationError, takenIds, type CreateRequest, type Plan, type Workspace } from './operations.js';
import type { JsonML, ResolvedTree } from './tree.js';
import { aroundPlaces, besidePlace, GAP as LAYOUT_GAP, makeRoom, parents, type Box } from './canvas-layout.js';

/** The size of a new card, in the units of JSON Canvas. */
export const CARD_SIZE = { width: 360, height: 240 };
/** The name of the canvas a document gets at its first canvas operation. */
const DEFAULT_NAME = 'foglio';
/** The space left between cards placed by the runtime. */
const GAP = LAYOUT_GAP;
/** The margin of a group made by arrange around its grid. */
const GROUP_PADDING = 40;
/** The compositions come first, as in the navigator; then the other kinds by name. */
const COMPOSITIONS = ['article', 'chapter'];
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
/** A canvas group: a group node, with its label, and the arrange that made it if one did. */
export interface CanvasGroup {
  node: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  arrange?: string;
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
export function canvasCards(workspace: Workspace, tree: ResolvedTree): { canvas: string | null; cards: Card[]; groups: CanvasGroup[] } {
  let canvas: Canvas | null;
  try {
    canvas = findCanvas(workspace, tree, false);
  } catch {
    return { canvas: null, cards: [], groups: [] };
  }
  if (canvas === null) return { canvas: null, cards: [], groups: [] };
  const cards: Card[] = [];
  const groups: CanvasGroup[] = boxesOf(canvas).filter((box) => box.group).map((box) => {
    const node = canvas!.data.nodes.find((entry) => String(entry.id) === box.id)!;
    return { node: box.id, label: typeof node.label === 'string' ? node.label : '', x: box.x, y: box.y, width: box.width, height: box.height, ...(typeof node.arrange === 'string' ? { arrange: node.arrange } : {}) };
  });
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
  return { canvas: canvas.path, cards, groups };
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

/** The nodes of the canvas as rectangles: those with a place and a size. */
function boxesOf(canvas: Canvas): Box[] {
  return canvas.data.nodes
    .filter((node) => [node.x, node.y, node.width, node.height].every((value) => typeof value === 'number' && Number.isFinite(value)))
    .map((node) => ({ id: String(node.id), x: node.x, y: node.y, width: node.width, height: node.height, group: node.type === 'group' }));
}

/** Makes room around some nodes (§11.9): the others that overlap them move, and groups grow; the summary lists them. */
function makeRoomFor(plan: Plan, canvas: Canvas, anchors: string[], known?: ReadonlyMap<string, string | null>): void {
  const changed = makeRoom(boxesOf(canvas), anchors, known);
  const moved: Array<Record<string, unknown>> = [];
  for (const node of canvas.data.nodes) {
    const box = changed.get(String(node.id));
    if (!box) continue;
    Object.assign(node, { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) });
    moved.push({ node: node.id, x: node.x, y: node.y, ...(node.type === 'group' ? { width: node.width, height: node.height } : {}) });
  }
  if (moved.length > 0) plan.summary.moved = moved;
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
  makeRoomFor(plan, canvas, [card.id]);
  writeCanvas(plan, canvas);
  return plan;
}

/** `place`: a card of an object somewhere else on the canvas, or with another size; the others make room. */
export function planPlace(workspace: Workspace, tree: ResolvedTree, id: string, at: { x: number; y: number } | undefined, which?: string, size?: { width: number; height: number }): Plan {
  nodeOf(tree, id);
  if (at === undefined && size === undefined) throw new OperationError('place vuole --at <x>,<y> o --size <larghezza>,<altezza>');
  const canvas = findCanvas(workspace, tree, false);
  const card = canvas!.data.nodes[cardOf(workspace, tree, canvas, id, which)]!;
  if (at !== undefined) {
    card.x = integer(at.x, 'x');
    card.y = integer(at.y, 'y');
  }
  if (size !== undefined) {
    if (!(size.width > 0 && size.height > 0)) throw new OperationError('--size vuole due interi positivi');
    card.width = integer(size.width, 'larghezza');
    card.height = integer(size.height, 'altezza');
  }
  const plan: Plan = { operation: 'place', files: new Map(), copies: [], summary: { id, node: card.id, x: card.x, y: card.y, width: card.width, height: card.height } };
  makeRoomFor(plan, canvas!, [card.id]);
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

/**
 * `create --at` and `create --near`: a new object with its card, at a place or next to
 * a card, to the right or below; a text goes in the texts file of the canvas, next to
 * its descriptor. The others make room.
 */
export function planCreateOnCanvas(workspace: Workspace, tree: ResolvedTree, request: CreateRequest): Plan {
  if (request.into !== undefined || request.after !== undefined || request.before !== undefined) throw new OperationError('--at e --near non vanno con --in, --after o --before');
  if ((request.at === undefined) === (request.near === undefined)) throw new OperationError('create vuole --at o --near, non tutti e due');
  if (NO_CARD.has(request.kind)) throw new OperationError(`un ${request.kind} non va sul canvas`);
  const canvas = findCanvas(workspace, tree, true)!;
  let at = request.at;
  if (request.near !== undefined) {
    nodeOf(tree, request.near.id);
    const target = canvas.data.nodes[cardOf(workspace, tree, canvas, request.near.id, request.near.card)]!;
    at = besidePlace(boxesOf(canvas).find((box) => box.id === target.id)!, CARD_SIZE, boxesOf(canvas));
  }
  const id = newId(workspace, tree, request);
  const plan: Plan = { operation: 'create', files: new Map(), copies: [], summary: { id, kind: request.kind } };
  addObject(workspace, plan, canvas.descriptor, request, id);
  const file = String(plan.summary.file);
  const card = addCard(canvas, request.kind === 'text' ? { file, subpath: `#${id}` } : { file }, at!);
  plan.summary.node = card.id;
  plan.summary.x = card.x;
  plan.summary.y = card.y;
  makeRoomFor(plan, canvas, [card.id]);
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

/**
 * The objects tied to one: the links [[…]] and the embeds ![[…]] written in it and
 * those written in others towards it, and its associations. Only what each object
 * writes itself: not what the objects it embeds write.
 */
export function relatedIds(tree: ResolvedTree, id: string): string[] {
  const own = (content: JsonML[] | undefined): Set<string> => {
    const found = new Set<string>();
    const stack: JsonML[] = [...(content ?? [])];
    while (stack.length > 0) {
      const item = stack.pop()!;
      if (typeof item === 'string') continue;
      const attributes = item[1] !== null && typeof item[1] === 'object' && !Array.isArray(item[1]) ? (item[1] as Record<string, unknown>) : null;
      if (item[0] === 'embed' && typeof attributes?.id === 'string') {
        // What the object embedded writes is its own.
        found.add(attributes.id);
        continue;
      }
      if (item[0] === 'hyperlink' && typeof attributes?.ref === 'string') found.add(attributes.ref);
      for (const child of item.slice(attributes ? 2 : 1)) stack.push(child as JsonML);
    }
    return found;
  };
  const related = new Set<string>();
  for (const node of tree.nodes ?? []) {
    if (node.id === undefined || node.directive === true) continue;
    const ties = own(node.content);
    if (node.id === id) for (const other of ties) related.add(other);
    else if (ties.has(id)) related.add(node.id);
  }
  for (const association of tree.associations ?? []) {
    const [a, b] = association.ids;
    if (a === id) related.add(b);
    if (b === id) related.add(a);
  }
  related.delete(id);
  const live = new Set((tree.nodes ?? []).filter((node) => node.id !== undefined && node.directive !== true && !NO_CARD.has(node.kind)).map((node) => node.id!));
  return [...related].filter((each) => live.has(each)).sort();
}

/**
 * `gather`: the objects tied to a card come around it, nearest first. An object with
 * cards on the canvas brings the nearest of them; one without gets a new card (recall).
 * The others make room.
 */
export function planGather(workspace: Workspace, tree: ResolvedTree, id: string, which?: string): Plan {
  nodeOf(tree, id);
  const canvas = findCanvas(workspace, tree, false);
  const target = canvas!.data.nodes[cardOf(workspace, tree, canvas, id, which)]!;
  const related = relatedIds(tree, id);
  const places = aroundPlaces({ id: target.id, x: target.x, y: target.y, width: target.width, height: target.height, group: false }, CARD_SIZE, related.length);
  const center = (node: CanvasNode) => ({ x: node.x + node.width / 2, y: node.y + node.height / 2 });
  const from = center(target);
  const gathered: Array<Record<string, unknown>> = [];
  related.forEach((other, index) => {
    const reference = referenceOf(workspace, tree, other);
    const cards = canvas!.data.nodes.filter((entry) => entry !== target && names(entry, reference, other));
    const at = places[index]!;
    if (cards.length === 0) {
      const card = addCard(canvas!, reference, at);
      gathered.push({ id: other, node: card.id, recalled: true });
      return;
    }
    const distance = (node: CanvasNode) => Math.hypot(center(node).x - from.x, center(node).y - from.y);
    const nearest = [...cards].sort((a, b) => distance(a) - distance(b) || (a.id < b.id ? -1 : 1))[0]!;
    nearest.x = at.x;
    nearest.y = at.y;
    gathered.push({ id: other, node: nearest.id, recalled: false });
  });
  const plan: Plan = { operation: 'gather', files: new Map(), copies: [], summary: { id, node: target.id, gathered } };
  makeRoomFor(plan, canvas!, [target.id, ...gathered.map((each) => String(each.node))]);
  writeCanvas(plan, canvas!);
  return plan;
}

/** What arrange groups by: the kind, or the first tag in alphabetical order. */
export type ArrangeBy = 'kind' | 'tag';
/** The label of the group of the objects without tags. */
const NO_TAG = 'senza tag';

/**
 * `arrange`: the cards in a group for each kind or tag, in a grid in the order of the
 * navigator, the groups side by side. The groups made by an arrange before (with the key
 * arrange) are replaced; the groups made by hand, and the cards in them, stay, and make
 * room.
 */
export function planArrange(workspace: Workspace, tree: ResolvedTree, by: ArrangeBy): Plan {
  if (by !== 'kind' && by !== 'tag') throw new OperationError(`arrange vuole --by kind o --by tag, non ${String(by)}`);
  const canvas = findCanvas(workspace, tree, false);
  if (canvas === null) throw new OperationError('il documento non ha un canvas');
  canvas.data.nodes = canvas.data.nodes.filter((node) => !(node.type === 'group' && typeof node.arrange === 'string'));
  const parent = parents(boxesOf(canvas));
  const { cards } = canvasCards(workspace, tree);
  const index = new Map((tree.nodes ?? []).map((node, position) => [node, position]));
  const objects = new Map((tree.nodes ?? []).filter((node) => node.id !== undefined).map((node) => [node.id!, node]));
  // The cards that are not in a group made by hand, with their object, in the order of the navigator.
  const free = cards
    .map((card, position) => ({ card, position, object: card.id === null ? undefined : objects.get(card.id) }))
    .filter((each) => each.object !== undefined && !parent.has(each.card.node))
    .sort((a, b) => index.get(a.object!)! - index.get(b.object!)! || a.position - b.position);
  const keyOf = (object: NonNullable<(typeof free)[number]['object']>) => {
    if (by === 'kind') return object.kind;
    const tags = Array.isArray(object.attributes?.tags) ? (object.attributes.tags as unknown[]).filter((tag): tag is string => typeof tag === 'string').sort() : [];
    return tags[0] ?? NO_TAG;
  };
  const groups = new Map<string, typeof free>();
  for (const each of free) groups.set(keyOf(each.object!), [...(groups.get(keyOf(each.object!)) ?? []), each]);
  const rank = (key: string) => (by === 'kind' ? (COMPOSITIONS.includes(key) ? COMPOSITIONS.indexOf(key) : COMPOSITIONS.length) : key === NO_TAG ? 1 : 0);
  const keys = [...groups.keys()].sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0));
  // Where the cards were: the grid starts at the top left of them.
  const nodes = new Map(canvas.data.nodes.map((node) => [String(node.id), node]));
  const moving = free.map((each) => nodes.get(each.card.node)!);
  let x = moving.length > 0 ? Math.min(...moving.map((node) => node.x)) : 0;
  const y = moving.length > 0 ? Math.min(...moving.map((node) => node.y)) : 0;
  const made: string[] = [];
  const summary: Array<Record<string, unknown>> = [];
  // The groups are known: a new group may cover a card of a group made by hand.
  const known = new Map<string, string | null>(canvas.data.nodes.map((node) => [String(node.id), parent.get(String(node.id)) ?? null]));
  for (const key of keys) {
    const members = groups.get(key)!.map((each) => nodes.get(each.card.node)!);
    const columns = Math.ceil(Math.sqrt(members.length));
    const rows = Math.ceil(members.length / columns);
    const cellWidth = Math.max(...members.map((node) => node.width));
    const cellHeight = Math.max(...members.map((node) => node.height));
    members.forEach((node, position) => {
      node.x = x + GROUP_PADDING + (position % columns) * (cellWidth + GAP);
      node.y = y + GROUP_PADDING + Math.floor(position / columns) * (cellHeight + GAP);
    });
    const width = 2 * GROUP_PADDING + columns * cellWidth + (columns - 1) * GAP;
    const height = 2 * GROUP_PADDING + rows * cellHeight + (rows - 1) * GAP;
    const group: CanvasNode = { id: nodeId(canvas), type: 'group', x, y, width, height, label: key, arrange: by };
    canvas.data.nodes.push(group);
    made.push(group.id);
    known.set(group.id, null);
    for (const node of members) known.set(String(node.id), group.id);
    summary.push({ label: key, node: group.id, cards: members.map((node) => node.id) });
    x += width + 2 * GAP;
  }
  const plan: Plan = { operation: 'arrange', files: new Map(), copies: [], summary: { by, groups: summary } };
  makeRoomFor(plan, canvas, [...made, ...moving.map((node) => String(node.id))], known);
  writeCanvas(plan, canvas);
  return plan;
}
