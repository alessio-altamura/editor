// The operations of the chart (class 3): `create chart`, a file `<id>.chart.md` with the
// template, the collection and a field for each role; the roles not given are proposed
// from the types of the fields, as the runtime proposes them for a chart without them.
import { posix } from 'node:path';
import { CHART_TEMPLATES, isQuantity, proposeRoles } from './chart.js';
import type { Field } from './collection.js';
import type { RawValue } from './front-matter.js';
import { writeHeader } from './format.js';
import { newId, nodeOf, OperationError, type CreateRequest, type Plan, type Workspace } from './operations.js';
import type { ResolvedTree } from './tree.js';

const string = (value: string): RawValue => ({ type: 'string', value, plain: true });
const DATE_TYPES = new Set(['date', 'datetime', 'year', 'yearmonth']);

/** What a chart is made of: its collection, its template, its roles, all known before its file is written. */
export interface ChartChoice {
  collection: string;
  /** The file of the collection: a chart with no other place goes next to it. */
  file: string;
  template: string;
  x: string;
  y: string;
  series?: string;
  /** The titles of x and y, for the id from the words. */
  words: string;
}

/**
 * The template and the roles of a new chart: those asked, the others proposed from the
 * types. The template: point when x is a quantity, line when it is a date, else bar.
 */
export function chooseChart(tree: ResolvedTree, request: CreateRequest): ChartChoice {
  if (request.collection === undefined) throw new OperationError('create chart vuole --collection <id>');
  const node = nodeOf(tree, request.collection);
  if (node.kind !== 'collection') throw new OperationError(`${request.collection} non è una collection`);
  const fields = (Array.isArray(node.attributes?.fields) ? node.attributes.fields : []) as Array<{ name?: unknown; type?: unknown; title?: unknown }>;
  const known = fields.filter((field) => typeof field.name === 'string').map((field) => ({ name: String(field.name), type: typeof field.type === 'string' ? field.type : 'string', ...(typeof field.title === 'string' ? { title: field.title } : {}) })) as Field[];
  for (const [role, name] of [['x', request.x], ['y', request.y], ['series', request.series]] as const) {
    if (name !== undefined && !known.some((field) => field.name === name)) throw new OperationError(`${request.collection} non ha il field ${name} (--${role})`);
  }
  const roles = proposeRoles(known, { ...(request.x !== undefined ? { x: request.x } : {}), ...(request.y !== undefined ? { y: request.y } : {}) });
  if (roles.x === undefined || roles.y === undefined) throw new OperationError(`${request.collection} non ha un field number o integer per y: dillo con --x e --y`);
  const x = known.find((field) => field.name === roles.x)!;
  const y = known.find((field) => field.name === roles.y)!;
  const template = request.template ?? (isQuantity(x) && isQuantity(y) ? 'point' : DATE_TYPES.has(x.type) ? 'line' : 'bar');
  if (!(CHART_TEMPLATES as readonly string[]).includes(template)) throw new OperationError(`il template ${template} non è fra: ${CHART_TEMPLATES.join(', ')}`);
  const title = (field: Field) => (typeof field.title === 'string' && field.title !== '' ? field.title : field.name);
  return { collection: node.id!, file: node.file, template, x: x.name, y: y.name, ...(request.series !== undefined ? { series: request.series } : {}), words: `${title(y)} per ${title(x)}` };
}

/** The file of a chart, next to `at`: the header with the template, the collection, the roles; the body is its description. */
export function chartFile(workspace: Workspace, plan: Plan, at: (name: string) => string, id: string, choice: ChartChoice, text: string): string {
  const file = at(`${id}.chart.md`);
  if (workspace.read(file) !== null) throw new OperationError(`${file} c'è già`);
  const entries: Array<[string, RawValue]> = [
    ['id', string(id)],
    ['kind', string('chart')],
    ['template', string(choice.template)],
    ['collection', { type: 'string', value: `[[${choice.collection}]]`, plain: false }],
    ['x', string(choice.x)],
    ['y', string(choice.y)],
    ...(choice.series !== undefined ? [['series', string(choice.series)] as [string, RawValue]] : []),
  ];
  plan.files.set(file, `---\n${writeHeader(entries)}\n---\n${text}${text === '' ? '' : '\n'}`);
  plan.summary.file = file;
  plan.summary.template = choice.template;
  plan.summary.x = choice.x;
  plan.summary.y = choice.y;
  if (choice.series !== undefined) plan.summary.series = choice.series;
  return file;
}

/** `create chart` with no place: the file next to its collection, and nothing else. */
export function planCreateChart(workspace: Workspace, tree: ResolvedTree, request: CreateRequest): Plan {
  const choice = chooseChart(tree, request);
  const id = newId(workspace, tree, { ...request, chartChoice: choice });
  const plan: Plan = { operation: 'create', files: new Map(), copies: [], summary: { id, kind: 'chart' } };
  const folder = posix.dirname(choice.file);
  chartFile(workspace, plan, (name) => (folder === '.' ? name : `${folder}/${name}`), id, choice, (request.text ?? '').trim());
  return plan;
}
