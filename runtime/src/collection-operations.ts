// The operations of the collection (class 2): `create collection`, a descriptor and a TSV
// with only the header; `turn-into`, a text table turned into a collection, from a text
// (same id, new kind) or from a scratch (a new id, and a link in place of the table).
import { posix } from 'node:path';
import type { Nodes, Table } from 'mdast';
import { retargetCanvas } from './canvas.js';
import { fieldName, readValue, SUPPORTED_TYPES, writeRecords, type Field, type Schema } from './collection.js';
import type { RawValue } from './front-matter.js';
import { writeHeader } from './format.js';
import { langFormat, plainString, readDecimal } from './math-line.js';
import { idFromWords, isMultiObject, nodeOf, objectIn, OperationError, shape, splice, takenIds, type CreateRequest, type Plan, type Shape, type Workspace } from './operations.js';
import type { ResolvedTree } from './tree.js';

const string = (value: string): RawValue => ({ type: 'string', value, plain: true });

/** The descriptor of a collection: id, kind, the asset, the fields, the key; the body is its description. */
function descriptorText(id: string, data: string, fields: Array<{ name: string; type: string; title?: string }>, key: string | undefined, carried: Array<[string, RawValue]>, description: string): string {
  const entries: Array<[string, RawValue]> = [
    ['id', string(id)],
    ['kind', string('collection')],
    ...carried,
    ['asset', string(posix.basename(data))],
    ['fields', { type: 'structure', value: fields.map((field) => ({ name: field.name, type: field.type, ...(field.title !== undefined ? { title: field.title } : {}) })) }],
    ...(key === undefined ? [] : [['primaryKey', string(key)] as [string, RawValue]]),
  ];
  return `---\n${writeHeader(entries)}\n---\n${description}${description === '' ? '' : '\n'}`;
}

/** A TSV: one record per line, values without tabs or line ends (the IANA registration). */
const tsv = (rows: string[][]) => writeRecords(rows, { delimiter: '\t', quoteChar: '"', doubleQuote: true, skipInitialSpace: false, quoting: false });

/** The fields of `--field nome:tipo`, checked. */
function checkFields(fields: Array<{ name: string; type: string }>): void {
  if (fields.length === 0) throw new OperationError('una collection vuole almeno un --field nome:tipo');
  const names = new Set<string>();
  for (const field of fields) {
    if (field.name === '' || /[\t\n]/.test(field.name)) throw new OperationError(`il nome del campo «${field.name}» non va bene`);
    if (names.has(field.name)) throw new OperationError(`il campo ${field.name} è due volte`);
    if (!SUPPORTED_TYPES.has(field.type)) throw new OperationError(`il tipo ${field.type} non è fra: ${[...SUPPORTED_TYPES].join(', ')}`);
    names.add(field.name);
  }
}

/** `create collection`: the descriptor and a TSV with only the header, next to `at`. */
export function collectionFiles(workspace: Workspace, plan: Plan, at: (name: string) => string, id: string, request: CreateRequest): { descriptor: string; data: string } {
  const fields = request.fields ?? [];
  checkFields(fields);
  const descriptor = at(`${id}.collection.md`);
  const data = at(`${id}.tsv`);
  for (const file of [descriptor, data]) if (workspace.read(file) !== null) throw new OperationError(`${file} c'è già`);
  plan.files.set(descriptor, descriptorText(id, data, fields, undefined, [], (request.text ?? '').trim()));
  plan.files.set(data, tsv([fields.map((field) => field.name)]));
  return { descriptor, data };
}

export interface TurnIntoRequest {
  /** The line of the file, from 1, inside the table to turn: needed when a scratch has more than one. */
  line?: number;
  /** Types chosen for some fields, in place of those proposed from the values. */
  types?: Record<string, string>;
  key?: string;
  noKey?: boolean;
}

/** The text of a cell of a GFM table, without its marks. */
function cellText(node: Nodes): string {
  if ('value' in node && typeof node.value === 'string') return node.type === 'inlineCode' ? node.value : node.value;
  if ('children' in node) return (node.children as Nodes[]).map(cellText).join('');
  return '';
}

/**
 * The type proposed for the values of a column, the empty ones left out: integer,
 * number (read with the separators of the language), boolean, date, else string.
 */
function proposeType(values: string[], lang: string | undefined): string {
  const filled = values.filter((value) => value !== '');
  if (filled.length === 0) return 'string';
  const numbers = filled.map((value) => readNumber(value, lang));
  if (numbers.every((number) => number !== null)) return numbers.every((number) => number!.integer) ? 'integer' : 'number';
  const field: Field = { name: '', type: 'boolean', decimalChar: '.', trueValues: ['true', 'True', 'TRUE'], falseValues: ['false', 'False', 'FALSE'], asWritten: false };
  const schema = { missingValues: [''] } as Schema;
  if (filled.every((value) => !('invalid' in readValue(field, value, schema)))) return 'boolean';
  if (filled.every((value) => !('invalid' in readValue({ ...field, type: 'date' }, value, schema)))) return 'date';
  return 'string';
}

/** A number as written in the text, with the separators of the language (else a point): its plain form, with the point. */
function readNumber(written: string, lang: string | undefined): { plain: string; integer: boolean } | null {
  const format = lang === undefined ? undefined : langFormat(lang);
  const decimal = format?.decimal ?? '.';
  const group = format?.group ?? ',';
  const shape = new RegExp(`^[+-]?(\\d{1,3}(${escape(group)}\\d{3})+|\\d+)(${escape(decimal)}\\d+)?$`);
  if (!shape.test(written)) return null;
  const plain = written.split(group).join('').replace(decimal, '.');
  const value = readDecimal(plain);
  return value === null ? null : { plain: plainString(value), integer: !plain.includes('.') };
}
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * `turn-into`: a text table becomes a collection, with the fields and the key proposed
 * from the values. A text keeps its id and changes kind: its descriptor and its TSV take
 * its place, next to its file, and the text goes. A table in a scratch becomes a new
 * collection with an id from the first words of its header, and a link [[id]] takes its
 * place. The TSV is written with the point as decimal separator.
 */
export function planTurnInto(workspace: Workspace, tree: ResolvedTree, id: string, request: TurnIntoRequest = {}): Plan {
  const node = nodeOf(tree, id);
  if (node.kind !== 'text' && node.kind !== 'scratch') throw new OperationError(`${id} è un ${node.kind}: turn-into va da un text o da uno scratch con una tabella`);
  const { shape: fileShape, object } = objectIn(workspace, node.file, id);
  const lineOf = (offset: number) => fileShape.text.slice(0, offset).split('\n').length;
  const tables = object.blocks.filter((block) => block.node.type === 'table');
  let block = tables[0];
  if (node.kind === 'text' && (object.blocks.length !== 1 || tables.length !== 1)) throw new OperationError(`${id} non è una tabella: un text diventa collection quando è una tabella sola`);
  if (request.line !== undefined) block = tables.find((each) => lineOf(each.start) <= request.line! && request.line! <= lineOf(each.end));
  else if (tables.length > 1) throw new OperationError(`${id} ha ${tables.length} tabelle: di' quale con --line <riga>`);
  if (block === undefined) throw new OperationError(request.line === undefined ? `${id} non ha tabelle` : `alla riga ${request.line} di ${node.file} non c'è una tabella`);

  const table = block.node as Table;
  const rows = table.children.map((row) => row.children.map((cell) => cellText(cell).trim()));
  const headings = rows[0]!;
  // The names from the headings, as ids; the headings stay as titles.
  const taken = new Set<string>();
  const named = headings.map((heading, index) => fieldName(heading, index + 1, taken));
  const names = named.map((field) => field.name);
  const records = rows.slice(1).map((row) => names.map((_, index) => row[index] ?? ''));
  // What the table loses: values are values, without Markdown, and a written alignment goes (it warns, and goes on).
  const warnings: Array<{ code: string; target: string; message: string }> = [];
  const formatted = table.children.flatMap((row) => row.children).filter((cell) => cell.children.some((child) => child.type !== 'text')).map((cell) => cellText(cell).trim());
  if (formatted.length > 0) warnings.push({ code: 'turn-into-loss', target: 'formattazione', message: `le celle perdono la formattazione: ${formatted.slice(0, 5).join(', ')}${formatted.length > 5 ? ', …' : ''}` });
  if (table.align?.some((align) => align !== null)) warnings.push({ code: 'turn-into-loss', target: 'allineamento', message: 'l\'allineamento scritto si perde: i numeri vanno a destra da soli' });
  const longer = rows.slice(1).filter((row) => row.length > headings.length).length;
  if (longer > 0) warnings.push({ code: 'turn-into-loss', target: 'celle in più', message: `${longer} righe hanno più celle dell'intestazione: quelle in più si perdono` });
  /** A field named in an option: by its name, or by its heading as written. */
  const fieldOf = (written: string) => {
    const index = names.indexOf(written) >= 0 ? names.indexOf(written) : headings.indexOf(written);
    if (index < 0) throw new OperationError(`la tabella non ha la colonna ${written}`);
    return names[index]!;
  };
  const types = Object.fromEntries(Object.entries(request.types ?? {}).map(([written, type]) => [fieldOf(written), type]));
  const asked = request.key === undefined ? undefined : fieldOf(request.key);
  const lang = typeof node.attributes?.lang === 'string' ? node.attributes.lang : typeof tree.document?.attributes?.lang === 'string' ? tree.document.attributes.lang : undefined;
  const fields = named.map(({ name, title }, index) => {
    const type = types[name] ?? proposeType(records.map((record) => record[index]!), lang);
    if (!SUPPORTED_TYPES.has(type)) throw new OperationError(`il tipo ${type} non è fra: ${[...SUPPORTED_TYPES].join(', ')}`);
    return { name, type, ...(title !== undefined ? { title } : {}) };
  });
  // The key: the one asked, or the first column with values all written and all different.
  const key = request.noKey ? undefined : asked ?? names.find((_, index) => {
    const values = records.map((record) => record[index]!);
    return values.length > 0 && values.every((value) => value !== '') && new Set(values).size === values.length;
  });
  // Numbers with the point: those written with the separators of the language are rewritten.
  const values = records.map((record) => record.map((value, index) => {
    if (fields[index]!.type !== 'number' && fields[index]!.type !== 'integer') return value;
    return readNumber(value, lang)?.plain ?? value;
  }));

  const folder = posix.dirname(node.file);
  const at = (name: string) => (folder === '.' ? name : `${folder}/${name}`);
  const plan: Plan = { operation: 'turn-into', files: new Map(), copies: [], summary: {} };
  let target = id;
  if (node.kind === 'text') {
    // The same id, another kind: the text goes, from its file or from its multi-object file.
    const multi = isMultiObject(workspace, node.file);
    if (!multi || fileShape.objects.length === 1) plan.files.set(node.file, null);
    else {
      const index = fileShape.objects.indexOf(object);
      const end = index + 1 < fileShape.objects.length ? fileShape.objects[index + 1]!.start : fileShape.text.length;
      plan.files.set(node.file, splice(fileShape.text, [{ start: object.start, end, insert: '' }]));
    }
    const carried = (object.line ? object.line.entries : fileShape.header ?? []).filter(([name]) => ['tags', 'lang', 'class', 'associations'].includes(name));
    const descriptor = at(`${id}.collection.md`);
    const data = at(`${id}.tsv`);
    for (const file of [descriptor, data]) if (workspace.read(file) !== null) throw new OperationError(`${file} c'è già`);
    plan.files.set(descriptor, descriptorText(id, data, fields, key, carried, ''));
    plan.files.set(data, tsv([names, ...values]));
    retargetCanvas(workspace, tree, plan, id, { file: node.file, multi }, { file: descriptor, multi: false }, id);
    Object.assign(plan.summary, { id, from: node.file, file: descriptor, data });
  } else {
    // From a scratch: a new collection, and the link to it where the table was.
    target = idFromWords(headings.join(' '), takenIds(workspace, tree), 'collection');
    const descriptor = at(`${target}.collection.md`);
    const data = at(`${target}.tsv`);
    for (const file of [descriptor, data]) if (workspace.read(file) !== null) throw new OperationError(`${file} c'è già`);
    // A link, not an embed: in a scratch ![[id]] alone is embed-inline (§7.3); its text is the names of the columns.
    const label = headings.join(', ').replace(/[[\]|]/g, ' ');
    plan.files.set(node.file, splice(fileShape.text, [{ start: block.start, end: block.end, insert: `[[${target}|${label}]]` }]));
    plan.files.set(descriptor, descriptorText(target, data, fields, key, [], ''));
    plan.files.set(data, tsv([names, ...values]));
    Object.assign(plan.summary, { id: target, from: node.file, file: descriptor, data });
  }
  Object.assign(plan.summary, { fields, ...(key !== undefined ? { primaryKey: key } : {}), ...(warnings.length > 0 ? { warnings } : {}) });
  return plan;
}

/** The text or scratch of a file whose table holds a line (from 1), for the action in the editors; or null. */
export function tableAtLine(tree: ResolvedTree, file: string, text: string, line: number): { id: string; line: number } | null {
  let fileShape: Shape;
  try {
    fileShape = shape(file, text);
  } catch {
    return null;
  }
  const lineOf = (offset: number) => fileShape.text.slice(0, offset).split('\n').length;
  for (const object of fileShape.objects) {
    const node = (tree.nodes ?? []).find((each) => each.id === object.id && each.file === file);
    if (node === undefined || (node.kind !== 'text' && node.kind !== 'scratch')) continue;
    for (const block of object.blocks) {
      if (block.node.type === 'table' && lineOf(block.start) <= line && line <= lineOf(block.end)) return { id: object.id!, line };
    }
  }
  return null;
}
