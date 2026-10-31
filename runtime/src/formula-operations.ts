// The operations of the formulas (class 4): `create formula`, a new object in the formula
// file of the document; the code and the inputs of an object written again, as the
// formula builder and a drag into the code do; a computed field, a formula and the field
// of the schema that names it.
import { posix } from 'node:path';
import { fieldName } from './collection.js';
import { formatText, writeAttributeLine, writeHeader } from './format.js';
import type { RawValue } from './front-matter.js';
import { idFromWords, nodeOf, OperationError, shape, splice, takenIds, type Plan, type Workspace } from './operations.js';
import { PYODIDE_VERSION } from './formula.js';
import { ID_FORM, type ResolvedTree } from './tree.js';

/** The file of the formulas when the document has none: a multi-object file at its root. */
export const FORMULAS_FILE = 'formule.formula.md';
/** The code of a formula not yet built: no value. The formula builder reads it as empty. */
export const EMPTY_CODE = 'None';

export interface FormulaRequest {
  id?: string;
  inputs?: string[];
  code?: string;
  /** The file to add it to; else the first multi-object formula file, else FORMULAS_FILE. */
  file?: string;
}

const fence = (code: string) => `\`\`\`python\n${code.replace(/\n+$/, '')}\n\`\`\``;
const list = (values: string[]): RawValue => ({ type: 'list', value: values });

/** The file the formulas of the document go in: the one asked, or the first with several, or a new one. */
export function formulasFile(workspace: Workspace, tree: ResolvedTree, asked?: string): string {
  if (asked !== undefined) {
    if (!/\.formula\.md$/.test(asked) || posix.isAbsolute(asked) || posix.normalize(asked).startsWith('..')) throw new OperationError(`${asked} non è un file .formula.md della cartella`);
    return posix.normalize(asked);
  }
  const files = [...new Set((tree.nodes ?? []).filter((node) => node.kind === 'formula').map((node) => node.file))].sort();
  for (const file of files) {
    const text = workspace.read(file);
    try {
      if (text !== null && shape(file, text).multi) return file;
    } catch {
      // A file that does not read is not one to add to.
    }
  }
  return FORMULAS_FILE;
}

/** `create formula`: an object with its id, its inputs and its code, in the formula file. */
export function planCreateFormula(workspace: Workspace, tree: ResolvedTree, request: FormulaRequest): Plan {
  const taken = takenIds(workspace, tree);
  let id: string;
  if (request.id !== undefined) {
    if (!ID_FORM.test(request.id)) throw new OperationError(`l'id ${request.id} non ha la forma di un id`);
    if (taken.has(request.id)) throw new OperationError(`l'id ${request.id} c'è già, vivo o ritirato`);
    id = request.id;
  } else id = idFromWords('', taken, 'formula');
  const inputs = request.inputs ?? [];
  for (const input of inputs) if (!/^[a-z0-9]+(-[a-z0-9]+)*(\.[^\s"]+)?$/.test(input)) throw new OperationError(`l'ingresso ${input} non è un id né collection.field`);
  const code = (request.code ?? EMPTY_CODE).trim() || EMPTY_CODE;
  const file = formulasFile(workspace, tree, request.file);
  const plan: Plan = { operation: 'create', files: new Map(), copies: [], summary: { id, kind: 'formula', file } };
  addFormula(workspace, plan, file, id, inputs, code);
  pinPyodide(workspace, plan);
  return plan;
}

/**
 * The document file fixes the Pyodide of the code (§14.5): a document that gets a formula
 * and does not say it gets `pyodide` in the same plan, so it has no `pyodide-missing`.
 */
function pinPyodide(workspace: Workspace, plan: Plan): void {
  const documents = workspace.files().filter((file) => /\.document\.md$/.test(file));
  if (documents.length !== 1) return;
  const file = documents[0]!;
  const text = plan.files.get(file) ?? workspace.read(file);
  if (text === null) return;
  const fileShape = shape(file, text);
  if (fileShape.header === null || fileShape.header.some(([key]) => key === 'pyodide')) return;
  const entries: Array<[string, RawValue]> = [...fileShape.header, ['pyodide', { type: 'string', value: PYODIDE_VERSION, plain: false }]];
  plan.files.set(file, formatText(file, `---\n${writeHeader(entries)}\n---\n${fileShape.text.slice(fileShape.headerEnd)}`));
}

function addFormula(workspace: Workspace, plan: Plan, file: string, id: string, inputs: string[], code: string): void {
  const line = writeAttributeLine([['id', { type: 'string', value: id, plain: true }], ...(inputs.length > 0 ? [['inputs', list(inputs)] as [string, RawValue]] : [])]);
  const object = `${line}\n\n${fence(code)}`;
  const current = plan.files.has(file) ? plan.files.get(file)! : workspace.read(file);
  if (current === null) {
    plan.files.set(file, `---\nkind: formula\n---\n${object}\n`);
    return;
  }
  if (!shape(file, current).multi) throw new OperationError(`${file} c'è già e non è un multi-object file di formule`);
  plan.files.set(file, `${current.replace(/\n*$/, '')}\n\n${object}\n`);
}

/**
 * The text of a formula file with the inputs and the code of one object written again,
 * the rest as it is: the attribute line, or the front matter, and its first python
 * block, added if there is none. Through the formatter.
 */
export function writeFormula(file: string, text: string, id: string, inputs: string[], code: string): string {
  const fileShape = shape(file, text);
  const object = fileShape.objects.find((each) => each.id === id) ?? (fileShape.multi ? undefined : fileShape.objects[0]);
  if (object === undefined) throw new OperationError(`${id} non si trova in ${file}`);
  const edits: Array<{ start: number; end: number; insert: string }> = [];
  const withInputs = (entries: Array<[string, RawValue]>) => {
    const out = entries.filter(([key]) => key !== 'inputs');
    if (inputs.length > 0) out.push(['inputs', list(inputs)]);
    return out;
  };
  if (object.line) edits.push({ start: object.line.start, end: object.line.end, insert: writeAttributeLine(withInputs(object.line.entries)) });
  else edits.push({ start: 0, end: fileShape.headerEnd, insert: `---\n${writeHeader(withInputs(fileShape.header ?? []))}\n---\n` });
  const block = object.blocks.find((each) => each.node.type === 'code' && (each.node as { lang?: string | null }).lang === 'python');
  if (block) edits.push({ start: block.start, end: block.end, insert: fence(code) });
  else {
    const end = object.blocks.length > 0 ? object.blocks[object.blocks.length - 1]!.end : object.line ? object.line.end : text.length;
    edits.push({ start: end, end, insert: `\n\n${fence(code)}` });
  }
  return formatText(file, splice(fileShape.text, edits));
}

/** The inputs and the code of an object of a formula file, as written; null if it is not there. */
export function readFormula(file: string, text: string, id: string): { inputs: string[]; code: string | null } | null {
  let fileShape;
  try {
    fileShape = shape(file, text);
  } catch {
    return null;
  }
  const object = fileShape.objects.find((each) => each.id === id) ?? (fileShape.multi ? undefined : fileShape.objects[0]);
  if (object === undefined) return null;
  const raw = (object.line ? object.line.entries : fileShape.header ?? []).find(([key]) => key === 'inputs')?.[1];
  const inputs = raw?.type === 'list' ? raw.value : [];
  const block = object.blocks.find((each) => each.node.type === 'code' && (each.node as { lang?: string | null }).lang === 'python');
  return { inputs, code: block ? (block.node as { value: string }).value : null };
}

/**
 * A computed field: a formula, empty, and a field of the schema of the collection that
 * names it, with its name made from the title. The builder fills the formula after.
 */
export function planComputedField(workspace: Workspace, tree: ResolvedTree, collection: string, title: string, type = 'number'): Plan {
  const node = nodeOf(tree, collection);
  if (node.kind !== 'collection') throw new OperationError(`${collection} non è una collection`);
  const text = workspace.read(node.file);
  if (text === null) throw new OperationError(`${node.file} non si legge`);
  const descriptor = shape(node.file, text);
  const fieldsRaw = descriptor.header?.find(([key]) => key === 'fields')?.[1];
  const fields = fieldsRaw?.type === 'structure' && Array.isArray(fieldsRaw.value) ? (fieldsRaw.value as Array<Record<string, unknown>>) : [];
  const { name, title: written } = fieldName(title, fields.length + 1, new Set(fields.map((field) => String(field.name))));
  const taken = takenIds(workspace, tree);
  const id = idFromWords(name, taken, 'formula');
  const field = { name, type, ...(written !== undefined ? { title: written } : {}), formula: `[[${id}]]` };
  const entries = (descriptor.header ?? []).map(([key, value]) => (key === 'fields' ? [key, { type: 'structure', value: [...fields, field] }] : [key, value]) as [string, RawValue]);
  const plan: Plan = { operation: 'create', files: new Map(), copies: [], summary: { id, kind: 'formula', field: name, collection } };
  plan.files.set(node.file, formatText(node.file, `---\n${writeHeader(entries)}\n---\n${text.slice(descriptor.headerEnd)}`));
  const file = formulasFile(workspace, tree);
  plan.summary.file = file;
  addFormula(workspace, plan, file, id, [], EMPTY_CODE);
  pinPyodide(workspace, plan);
  return plan;
}
