// The operations (§11.9): create, extract, rename and move; those of the canvas are in
// canvas.ts. Each computes a plan, the
// new text of every file it touches; the plan passes through the formatter, the tree
// is recomputed with it, and a plan that brings new errors is refused before writing.
import { idWords } from './id-words.js';
import { copyFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { basename, posix } from 'node:path';
import type { Nodes, RootContent } from 'mdast';
import { isAttributeLine, parseAttributeLine } from './attribute-line.js';
import { unifiedDiff } from './diff.js';
import { formatText, isFormattable, writeAttributeLine, writeHeader } from './format.js';
import { parseYamlMap, splitFrontMatter, type RawValue } from './front-matter.js';
import { parseMarkdown, resolveTree } from './resolve-tree.js';
import { ID_FORM, type Diagnostic, type ResolvedTree } from './tree.js';
import { planCreateOnCanvas, retargetCanvas } from './canvas.js';

/** A problem with the request itself, not with the document: exit 2. */
export class OperationError extends Error {}

/** Where an operation reads: the files of the folder, with the buffers open in an editor over them. */
export interface Workspace {
  folder: string;
  files: () => string[];
  read: (file: string) => string | null;
  /** Texts that hold in place of the files on disk, as for the language server. */
  overlay?: ReadonlyMap<string, string | null>;
}

export interface Plan {
  operation: string;
  /** The new text of each file touched, or null for a file deleted. */
  files: Map<string, string | null>;
  /** Assets copied into the folder: from a path on disk to a path in the folder. */
  copies: Array<{ from: string; to: string }>;
  summary: Record<string, unknown>;
}

const RETIRED = 'retired-ids.yaml';
const COMPOSITIONS = new Set(['chapter', 'article']);

const normalize = (text: string) => text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

interface Block {
  start: number;
  end: number;
  node: RootContent;
  text: string;
}
interface FileObject {
  id?: string;
  /** The attribute line of a multi-object file, with its attributes. */
  line?: { start: number; end: number; entries: Array<[string, RawValue]> };
  blocks: Block[];
  start: number;
  end: number;
}
export interface Shape {
  text: string;
  /** Attributes of the front matter, and whether it has YAML comments. */
  header: Array<[string, RawValue]> | null;
  comments: number;
  headerEnd: number;
  multi: boolean;
  objects: FileObject[];
}

/** The objects of a text file and where they are, as the runtime reads them (§0.18). */
export function shape(file: string, raw: string): Shape {
  const text = normalize(raw);
  const split = splitFrontMatter(text);
  if ('error' in split) throw new OperationError(`${file}: il front matter non si legge`);
  const headerEnd = text.length - split.body.length;
  let header: Array<[string, RawValue]> | null = null;
  let comments = 0;
  if (split.frontMatter !== null) {
    const map = parseYamlMap(split.frontMatter);
    if ('error' in map) throw new OperationError(`${file}: il front matter non si legge`);
    header = map.entries;
    comments = map.comments;
  }
  const lineStart = (offset: number) => split.body.lastIndexOf('\n', offset - 1) + 1;
  const blocks: Block[] = parseMarkdown(split.body).children.map((node) => {
    const start = headerEnd + lineStart(node.position!.start.offset!);
    const end = headerEnd + node.position!.end.offset!;
    return { start, end, node, text: text.slice(start, end) };
  });
  const isLine = (block: Block) => block.node.type === 'paragraph' && isAttributeLine(block.text);
  const value = (entries: Array<[string, RawValue]>, key: string) => {
    const found = entries.find(([k]) => k === key)?.[1];
    return found?.type === 'string' ? found.value : undefined;
  };
  const onlyKind = header !== null && header.length === 1 && header[0]![0] === 'kind' && value(header, 'kind') !== 'document';
  if (!onlyKind || !blocks.some(isLine)) {
    const id = header === null ? undefined : value(header, 'id');
    return { text, header, comments, headerEnd, multi: false, objects: [{ ...(id === undefined ? {} : { id }), blocks, start: 0, end: text.length }] };
  }
  const objects: FileObject[] = [];
  for (const block of blocks) {
    if (isLine(block)) {
      const entries = parseAttributeLine(block.text) ?? [];
      const id = value(entries, 'id');
      objects.push({ ...(id === undefined ? {} : { id }), line: { start: block.start, end: block.end, entries }, blocks: [], start: block.start, end: block.end });
    } else if (objects.length > 0) {
      const object = objects[objects.length - 1]!;
      object.blocks.push(block);
      object.end = block.end;
    }
  }
  return { text, header, comments, headerEnd, multi: true, objects };
}

/** Whether a file of the folder is a multi-object file. */
export function isMultiObject(workspace: Workspace, file: string): boolean {
  const text = workspace.read(file);
  if (text === null) return false;
  try {
    return shape(file, text).multi;
  } catch {
    return false;
  }
}

/** Applies edits to a text, given as offsets; they must not overlap. */
export function splice(text: string, edits: Array<{ start: number; end: number; insert: string }>): string {
  let out = text;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, edit.start) + edit.insert + out.slice(edit.end);
  return out;
}

/** The ids taken: live ones and retired ones (§0.3), and those the plan has made. */
export function takenIds(workspace: Workspace, tree: ResolvedTree): Set<string> {
  const taken = new Set<string>();
  for (const node of tree.nodes ?? []) if (node.id !== undefined) taken.add(node.id);
  const retired = workspace.read(RETIRED);
  if (retired !== null) {
    const map = parseYamlMap(normalize(retired));
    if (!('error' in map)) for (const [key] of map.entries) taken.add(key);
  }
  return taken;
}

/** An id from the first words (§0.3, C: «Sulla bozza di specifica»), see id-words.ts; -2, -3 on a conflict. */
export function idFromWords(text: string, taken: Set<string>, fallback: string): string {
  const base = idWords(text) || fallback;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  taken.add(id);
  return id;
}

const isEmbedBlock = (block: Block) => block.node.type === 'paragraph' && /^!\[\[[^\]\n]*\]\](\{[^}\n]*\})?[ \t]*$/.test(block.text);
const embedId = (block: Block) => /^!\[\[([^\]|\n]*)\]\]/.exec(block.text)?.[1];

/** The multi-object file of the texts of a composition, next to its file. */
export function textsFileOf(compositionFile: string): string {
  const name = posix.basename(compositionFile);
  return posix.join(posix.dirname(compositionFile), `${name.slice(0, name.indexOf('.'))}-texts.text.md`);
}

/** Adds objects to the texts file of a composition, creating it if it is not there. */
export function appendTexts(workspace: Workspace, plan: Plan, file: string, objects: Array<{ id: string; content: string }>): void {
  const current = plan.files.has(file) ? plan.files.get(file)! : workspace.read(file);
  const parts = objects.map(({ id, content }) => `{#${id}}${content === '' ? '' : `\n\n${content}`}`);
  if (current === null) {
    plan.files.set(file, `---\nkind: text\n---\n${parts.join('\n\n')}\n`);
    return;
  }
  const existing = shape(file, current);
  if (!existing.multi && existing.objects[0]!.blocks.length + (existing.header?.length ?? 0) > 1) {
    throw new OperationError(`${file} c'è già e non è un multi-object file`);
  }
  plan.files.set(file, `${normalize(current).replace(/\n*$/, '')}\n\n${parts.join('\n\n')}\n`);
}

export function nodeOf(tree: ResolvedTree, id: string) {
  const nodes = (tree.nodes ?? []).filter((node) => node.id === id);
  if (nodes.length === 0) throw new OperationError(`nessun oggetto con id ${id}`);
  if (nodes.length > 1) throw new OperationError(`l'id ${id} è di più oggetti`);
  return nodes[0]!;
}

function objectIn(workspace: Workspace, file: string, id: string): { shape: Shape; object: FileObject } {
  const text = workspace.read(file);
  if (text === null) throw new OperationError(`${file} non si legge`);
  const fileShape = shape(file, text);
  const object = fileShape.objects.find((o) => o.id === id);
  if (!object) throw new OperationError(`${id} non si trova in ${file}`);
  return { shape: fileShape, object };
}

export interface CreateRequest {
  kind: string;
  /** The composition that gets the embed; or `at`, a place on the canvas. */
  into?: string;
  at?: { x: number; y: number };
  /** Or next to a card of an object, on the canvas: the id, and the node when it has several. */
  near?: { id: string; card?: string };
  after?: string;
  before?: string;
  text?: string;
  id?: string;
  /** For an image: a file on disk, copied next to the composition. */
  asset?: string;
}

/** The id of a new object: the one asked, or one from the first words. */
export function newId(workspace: Workspace, tree: ResolvedTree, request: CreateRequest): string {
  if (!/^[a-z][a-z0-9-]*$/.test(request.kind)) throw new OperationError(`kind non valido: ${request.kind}`);
  const taken = takenIds(workspace, tree);
  if (request.id !== undefined) {
    if (!ID_FORM.test(request.id)) throw new OperationError(`l'id ${request.id} non ha la forma di un id`);
    if (taken.has(request.id)) throw new OperationError(`l'id ${request.id} c'è già, vivo o ritirato`);
    return request.id;
  }
  const text = (request.text ?? '').trim();
  return idFromWords(text || (request.asset ? basename(request.asset).replace(/\.[^.]*$/, '') : ''), taken, request.kind);
}

/** `create`: the object, and its embed in the composition; with `at`, its card on the canvas. */
export function planCreate(workspace: Workspace, tree: ResolvedTree, request: CreateRequest): Plan {
  if (request.at !== undefined || request.near !== undefined) return planCreateOnCanvas(workspace, tree, request);
  if (request.into === undefined) throw new OperationError('create vuole --in <id> o --at <x>,<y>');
  const composition = nodeOf(tree, request.into);
  if (!COMPOSITIONS.has(composition.kind)) throw new OperationError(`${request.into} non è un chapter né un article`);
  const id = newId(workspace, tree, request);
  const plan: Plan = { operation: 'create', files: new Map(), copies: [], summary: { id, kind: request.kind, in: request.into } };
  const { shape: compositionShape, object } = objectIn(workspace, composition.file, request.into);

  // The embed: after or before another embed of the composition, or at its end.
  const embed = `![[${id}]]`;
  let edit: { start: number; end: number; insert: string };
  const anchor = request.after ?? request.before;
  if (anchor !== undefined) {
    const block = object.blocks.find((b) => isEmbedBlock(b) && embedId(b) === anchor);
    if (!block) throw new OperationError(`${request.into} non include ${anchor}`);
    edit = request.after !== undefined ? { start: block.end, end: block.end, insert: `\n\n${embed}` } : { start: block.start, end: block.start, insert: `${embed}\n\n` };
  } else {
    const end = object.blocks.length > 0 ? object.blocks[object.blocks.length - 1]!.end : object.line ? object.line.end : compositionShape.text.length;
    edit = { start: end, end, insert: `\n\n${embed}\n` };
  }
  plan.files.set(composition.file, splice(compositionShape.text, [edit]));
  addObject(workspace, plan, composition.file, request, id);
  return plan;
}

/**
 * The object of a create, next to `beside`, the file of its composition or of the
 * canvas: a text in the texts file, an image copied there with its descriptor, any
 * other kind in a file of its own.
 */
export function addObject(workspace: Workspace, plan: Plan, beside: string, request: CreateRequest, id: string): void {
  const text = (request.text ?? '').trim();
  const folderOf = posix.dirname(beside);
  const at = (name: string) => (folderOf === '.' ? name : `${folderOf}/${name}`);
  if (request.kind === 'text') {
    const file = textsFileOf(beside);
    appendTexts(workspace, plan, file, [{ id, content: text }]);
    plan.summary.file = file;
  } else if (request.kind === 'image') {
    if (request.asset === undefined) throw new OperationError('un image vuole --asset <file>');
    if (!existsSync(request.asset)) throw new OperationError(`${request.asset} non c'è`);
    // The asset next to the composition, with another name if that one is taken.
    const files = new Set(workspace.files());
    const name = basename(request.asset);
    let target = at(name);
    for (let n = 2; files.has(target); n++) target = at(name.replace(/(\.[^.]*)?$/, `-${n}$1`));
    plan.copies.push({ from: request.asset, to: target });
    const descriptor = at(`${id}.image.md`);
    if (workspace.read(descriptor) !== null) throw new OperationError(`${descriptor} c'è già`);
    plan.files.set(descriptor, `---\nid: ${id}\nkind: image\nasset: ${posix.basename(target)}\n---\n${text}\n`);
    plan.summary.file = descriptor;
    plan.summary.asset = target;
  } else {
    const file = at(`${id}.${request.kind}.md`);
    if (workspace.read(file) !== null) throw new OperationError(`${file} c'è già`);
    // A chapter takes the text as its title; the others as their content.
    const title = request.kind === 'chapter' && text !== '' ? `\ntitle: ${JSON.stringify(text)}` : '';
    plan.files.set(file, `---\nid: ${id}\nkind: ${request.kind}${title}\n---\n${request.kind === 'chapter' ? '' : text}\n`);
    plan.summary.file = file;
  }
}

/** `extract`: every block written in a composition becomes a text, with its embed in its place, in order. */
export function planExtract(workspace: Workspace, tree: ResolvedTree, file: string): Plan {
  const text = workspace.read(file);
  if (text === null) throw new OperationError(`${file} non si legge`);
  const fileShape = shape(file, text);
  const kind = /^.+\.([^.]+)\.md$/.exec(posix.basename(file))?.[1];
  if (kind === undefined || !COMPOSITIONS.has(kind)) throw new OperationError(`${file} non è il file di un chapter o di un article`);
  const taken = takenIds(workspace, tree);
  const plan: Plan = { operation: 'extract', files: new Map(), copies: [], summary: {} };
  const extracted: Array<{ id: string; content: string }> = [];
  const skipped: string[] = [];
  const edits: Array<{ start: number; end: number; insert: string }> = [];
  for (const object of fileShape.objects) {
    for (const block of object.blocks) {
      const type = block.node.type;
      if (isEmbedBlock(block) || type === 'thematicBreak' || type === 'definition' || (type === 'html' && /^<!--[\s\S]*-->$/.test(block.text.trim()))) continue;
      // A heading would be a text of two kinds of block: it stays, for a chapter title.
      if (type === 'heading') {
        skipped.push(block.text);
        continue;
      }
      const id = idFromWords(plainText(block.node), taken, 'text');
      extracted.push({ id, content: block.text });
      edits.push({ start: block.start, end: block.end, insert: `![[${id}]]` });
    }
  }
  plan.summary = { file, texts: textsFileOf(file), extracted: extracted.map((e) => e.id), ...(skipped.length > 0 ? { skipped } : {}) };
  if (extracted.length === 0) return plan;
  plan.files.set(file, splice(fileShape.text, edits));
  appendTexts(workspace, plan, textsFileOf(file), extracted);
  return plan;
}

/** The text of an mdast node, for the id of an extracted block. */
function plainText(node: Nodes): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('children' in node) return (node.children as Nodes[]).map(plainText).join(' ');
  return '';
}

/** `rename`: the id in its file, every reference in every file, and the old id retired with the new one as successor (§0.3). */
export function planRename(workspace: Workspace, tree: ResolvedTree, from: string, to: string): Plan {
  const node = nodeOf(tree, from);
  if (!ID_FORM.test(to)) throw new OperationError(`l'id ${to} non ha la forma di un id`);
  if (takenIds(workspace, tree).has(to)) throw new OperationError(`l'id ${to} c'è già, vivo o ritirato`);
  const plan: Plan = { operation: 'rename', files: new Map(), copies: [], summary: { from, to } };
  const swap = (entries: Array<[string, RawValue]>, own: boolean): boolean => {
    let changed = false;
    for (const entry of entries) {
      const [key, value] = entry;
      if (value.type === 'string') {
        if ((key === 'id' && own && value.value === from) || value.value === `[[${from}]]`) {
          entry[1] = { ...value, value: key === 'id' ? to : `[[${to}]]` };
          changed = true;
        }
      } else if (value.type === 'list' && key === 'associations' && value.value.includes(from)) {
        entry[1] = { type: 'list', value: value.value.map((item) => (item === from ? to : item)) };
        changed = true;
      }
    }
    return changed;
  };
  for (const file of workspace.files()) {
    if (!/\.md$/.test(file) || !isFormattable(file)) continue;
    const raw = workspace.read(file);
    if (raw === null) continue;
    let fileShape: Shape;
    try {
      fileShape = shape(file, raw);
    } catch {
      continue;
    }
    const edits: Array<{ start: number; end: number; insert: string }> = [];
    // The header: the id of the object, "[[id]]" values, associations.
    if (fileShape.header !== null && !fileShape.multi) {
      const entries = fileShape.header.map(([k, v]) => [k, v] as [string, RawValue]);
      if (swap(entries, file === node.file)) {
        if (fileShape.comments > 0) throw new OperationError(`il front matter di ${file} ha commenti YAML: rinomina ${from} a mano`);
        edits.push({ start: 0, end: fileShape.headerEnd, insert: `---\n${writeHeader(entries)}\n---\n` });
      }
    }
    // Attribute lines, and the references in the text, found by the parser: never inside code.
    for (const object of fileShape.objects) {
      if (object.line) {
        const entries = object.line.entries.map(([k, v]) => [k, v] as [string, RawValue]);
        if (swap(entries, file === node.file)) edits.push({ start: object.line.start, end: object.line.end, insert: writeAttributeLine(entries) });
      }
      for (const block of object.blocks) {
        const visit = (child: Nodes) => {
          if (child.type === ('wikiReference' as string)) {
            const value = (child as unknown as { value: string }).value;
            const id = value.split('|')[0]!;
            if (id === from) {
              // mdast counts from the start of the body.
              const start = fileShape.text.indexOf('[[', fileShape.headerEnd + child.position!.start.offset!) + 2;
              edits.push({ start, end: start + from.length, insert: to });
            }
          }
          if ('children' in child) for (const grandchild of child.children as Nodes[]) visit(grandchild);
        };
        visit(block.node);
      }
    }
    if (edits.length > 0) plan.files.set(file, splice(fileShape.text, edits));
  }
  // The old id retired, with the new one as successor; ids retired towards the old one go to the new one.
  const retired = workspace.read(RETIRED);
  const lines: string[] = [];
  if (retired !== null) {
    const map = parseYamlMap(normalize(retired));
    if ('error' in map || map.comments > 0) throw new OperationError(`${RETIRED} non si legge, o ha commenti: aggiungi ${from}: ${to} a mano`);
    for (const [key, value] of map.entries) {
      const successor = value.type === 'string' ? (value.plain && value.value === 'null' ? 'null' : value.value) : 'null';
      lines.push(`${key}: ${successor === from ? to : successor}`);
    }
  }
  lines.push(`${from}: ${to}`);
  plan.files.set(RETIRED, `${lines.join('\n')}\n`);
  // A card of the object in a multi-object file names it in its subpath.
  const multi = isMultiObject(workspace, node.file);
  retargetCanvas(workspace, tree, plan, from, { file: node.file, multi }, { file: node.file, multi }, to);
  plan.summary.files = [...plan.files.keys()].sort();
  return plan;
}

/** `move`: an object between a file of its own and a multi-object file, keeping its id (§0.18). */
export function planMove(workspace: Workspace, tree: ResolvedTree, id: string, to: string): Plan {
  const node = nodeOf(tree, id);
  const target = posix.normalize(to.split('\\').join('/'));
  if (target.startsWith('../') || posix.isAbsolute(target)) throw new OperationError(`${to} esce dalla cartella`);
  if (target === node.file) throw new OperationError(`${id} sta già in ${target}`);
  const targetKind = /^.+\.([^.]+)\.md$/.exec(posix.basename(target))?.[1];
  if (targetKind !== node.kind) throw new OperationError(`${target} non è un file di ${node.kind}: l'estensione deve essere .${node.kind}.md`);
  const { shape: source, object } = objectIn(workspace, node.file, id);
  if (source.comments > 0) throw new OperationError(`il front matter di ${node.file} ha commenti YAML: sposta ${id} a mano`);
  // The attributes, as entries, without kind, and the content as written.
  const attributes = (object.line ? object.line.entries : (source.header ?? []).filter(([key]) => key !== 'kind')).map(([k, v]) => [k, v] as [string, RawValue]);
  const content = object.blocks.length > 0 ? source.text.slice(object.blocks[0]!.start, object.blocks[object.blocks.length - 1]!.end) : '';
  const plan: Plan = { operation: 'move', files: new Map(), copies: [], summary: { id, from: node.file, to: target } };

  // Out of the source: a file of its own, or one left without objects, goes away.
  if (!source.multi || source.objects.length === 1) plan.files.set(node.file, null);
  else {
    const index = source.objects.indexOf(object);
    const end = index + 1 < source.objects.length ? source.objects[index + 1]!.start : source.text.length;
    plan.files.set(node.file, splice(source.text, [{ start: object.start, end, insert: '' }]));
  }

  // Into the target: a multi-object file, existing or new, or a new file of its own.
  const existing = workspace.read(target);
  const line = () => {
    const entries = attributes.filter(([key, value]) => !(key === 'tags' && value.type === 'list' && value.value.length === 0));
    if (entries.some(([, value]) => value.type === 'list' && value.value.some((item) => /\s/.test(item)))) {
      throw new OperationError(`un attributo di ${id} è una lista con spazi: non sta in una attribute line`);
    }
    return writeAttributeLine(entries);
  };
  const entry = `${line()}${content === '' ? '' : `\n\n${content}`}`;
  if (existing !== null) {
    const targetShape = shape(target, existing);
    if (!targetShape.multi && targetShape.objects[0]?.id !== undefined) throw new OperationError(`${target} è il file di un oggetto, non un multi-object file`);
    plan.files.set(target, `${targetShape.text.replace(/\n*$/, '')}\n\n${entry}\n`);
  } else if (posix.basename(target).startsWith(`${id}.`)) {
    // Named after the object: a file of its own, with the attributes in the front matter.
    const entries: Array<[string, RawValue]> = [...attributes.filter(([key]) => key !== 'id'), ['id', { type: 'string', value: id, plain: true }], ['kind', { type: 'string', value: node.kind, plain: true }]];
    plan.files.set(target, `---\n${writeHeader(entries)}\n---\n${content}\n`);
  } else {
    plan.files.set(target, `---\nkind: ${node.kind}\n---\n${entry}\n`);
  }
  // The card of the object follows it: a file of its own without subpath, a multi-object file with one.
  const ownTarget = existing === null && posix.basename(target).startsWith(`${id}.`);
  retargetCanvas(workspace, tree, plan, id, { file: node.file, multi: source.multi }, { file: target, multi: !ownTarget }, id);
  return plan;
}

export interface Outcome {
  /** The new text of each file, after the formatter, or null for a file deleted. */
  files: Map<string, string | null>;
  copies: Array<{ from: string; to: string }>;
  /** Errors the plan would bring: with any, nothing is written. */
  newErrors: Diagnostic[];
  diff: string;
  tree: ResolvedTree;
}

/** Every file touched passes through the formatter; then the tree is recomputed and compared. */
export function evaluate(workspace: Workspace, plan: Plan): Outcome {
  const files = new Map<string, string | null>();
  for (const [file, text] of plan.files) files.set(file, text === null ? null : formatText(file, text));
  const overlay = new Map<string, string | null>(workspace.overlay ?? []);
  for (const [file, text] of files) overlay.set(file, text);
  // A copied asset counts as listed: its content does not matter to the tree.
  for (const copy of plan.copies) overlay.set(copy.to, '');
  const before = resolveTree(workspace.folder, workspace.overlay ? { overlay: workspace.overlay } : {});
  const tree = resolveTree(workspace.folder, { overlay });
  const count = (list: Diagnostic[] | undefined) => {
    const counts = new Map<string, number>();
    for (const d of list ?? []) if (d.severity === 'error') counts.set(`${d.code}\0${d.target ?? ''}`, (counts.get(`${d.code}\0${d.target ?? ''}`) ?? 0) + 1);
    return counts;
  };
  const was = count(before.diagnostics);
  const seen = new Map<string, number>();
  const newErrors: Diagnostic[] = [];
  for (const d of tree.diagnostics ?? []) {
    if (d.severity !== 'error') continue;
    const key = `${d.code}\0${d.target ?? ''}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
    if (seen.get(key)! > (was.get(key) ?? 0)) newErrors.push(d);
  }
  const diff = [...files].map(([file, text]) => unifiedDiff(file, workspace.read(file), text)).join('')
    + plan.copies.map((copy) => `copia ${copy.from} → ${copy.to}\n`).join('');
  return { files, copies: plan.copies, newErrors, diff, tree };
}

/** Writes an outcome: copies, then files through a temporary file and a rename, then deletions. */
export function write(folder: string, outcome: Outcome, writeFile: (path: string, text: string) => boolean): boolean {
  for (const copy of outcome.copies) copyFileSync(copy.from, posix.join(folder, copy.to));
  for (const [file, text] of outcome.files) if (text !== null && !writeFile(posix.join(folder, file), text)) return false;
  for (const [file, text] of outcome.files) if (text === null) unlinkSync(posix.join(folder, file));
  return true;
}

/** The workspace of a folder on disk. */
export function diskWorkspace(folder: string, files: () => string[]): Workspace {
  return {
    folder,
    files,
    read: (file) => {
      try {
        return normalize(new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(posix.join(folder, file))));
      } catch {
        return null;
      }
    },
  };
}
