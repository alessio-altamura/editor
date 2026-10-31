// The chart (class 3): a base template applied to a collection, with a field for each role
// (x, y, series) and a filter by equality. The runtime checks the roles against the types
// of the fields, translates template, roles and filtered records into a Vega-Lite spec,
// and has Vega draw it as SVG: the drawing goes in the resolved tree, the renderers only
// place it. Vega and Vega-Lite stay in the runtime: the HTML and the PDF get only the SVG.
import * as vega from 'vega';
import { compile, type TopLevelSpec } from 'vega-lite';
import type { CollectionData, Field } from './collection.js';
import { textWidth } from './font-metrics.js';
import { Decimal, displayString } from './math-line.js';

/** The base templates of the runtime (§13): bars, lines, points. */
export const CHART_TEMPLATES = ['bar', 'line', 'point'] as const;
export type ChartTemplate = (typeof CHART_TEMPLATES)[number];
/** The most marks a chart draws: past it, `chart-too-many-marks`. */
export const MAX_CHART_MARKS = 2000;
/** The size of the drawing, in px: the width is the width of the text, the height 3/5 of it. */
export const CHART_WIDTH = 600;
export const CHART_HEIGHT = 360;

export type ChartRole = 'x' | 'y' | 'series';
export interface ChartRequest {
  template: string;
  x?: string;
  y?: string;
  series?: string;
  /** field → the values a record keeps, as written. */
  filter: Map<string, string[]>;
}
export interface ChartProblem {
  code: string;
  target?: string;
  fix?: string;
}
export interface ChartPlan {
  template: ChartTemplate;
  x: Field;
  y: Field;
  series?: Field;
  /** A bar chart with the quantity on x and the categories on y. */
  orientation?: 'vertical' | 'horizontal';
  /** The records kept, as written: x, y, and the series if any. */
  values: string[][];
  /** The numbers of the quantity role, in the order of the values. */
  numbers: number[];
}

const QUANTITY_TYPES = new Set(['number', 'integer']);
export const isQuantity = (field: Field | undefined) => field !== undefined && QUANTITY_TYPES.has(field.type);

/**
 * The roles proposed from the types, for the roles not written: x the first field that is
 * not a quantity (else the first field), y the first quantity field that is not x.
 */
export function proposeRoles(fields: readonly Field[], written: { x?: string; y?: string } = {}): { x?: string; y?: string } {
  const x = written.x ?? (fields.find((field) => !isQuantity(field)) ?? fields[0])?.name;
  const y = written.y ?? fields.find((field) => isQuantity(field) && field.name !== x)?.name;
  return { ...(x !== undefined ? { x } : {}), ...(y !== undefined ? { y } : {}) };
}

/**
 * A series for bars or lines whose x repeats: the first field of text or of categories, in
 * the order of the schema, that with x makes every record unique; undefined if x does not
 * repeat or no field does that. `rows` are the values of the records, in the order of the fields.
 */
export function proposeSeries(fields: readonly Field[], x: string, y: string, rows: readonly (readonly string[])[]): string | undefined {
  const at = fields.findIndex((field) => field.name === x);
  if (at < 0) return undefined;
  const unique = (keys: string[]) => new Set(keys).size === keys.length;
  if (unique(rows.map((row) => row[at] ?? ''))) return undefined;
  return fields.find((field, index) => field.name !== x && field.name !== y && (field.type === 'string' || field.type === 'boolean' || field.categories !== undefined)
    && unique(rows.map((row) => `${row[at] ?? ''}\0${row[index] ?? ''}`)))?.name;
}

/** The roles and the records of a chart, checked against the collection; problems if it cannot be drawn. */
export function planChart(request: ChartRequest, data: CollectionData): { plan: ChartPlan } | { problems: ChartProblem[] } {
  const problems: ChartProblem[] = [];
  if (!(CHART_TEMPLATES as readonly string[]).includes(request.template)) {
    return { problems: [{ code: 'chart-template-unknown', target: request.template, fix: `usa uno di: ${CHART_TEMPLATES.join(', ')}` }] };
  }
  const template = request.template as ChartTemplate;
  const fieldOf = (role: string, name: string | undefined): Field | undefined => {
    if (name === undefined) return undefined;
    const field = data.fields.find((each) => each.name === name);
    if (field === undefined) problems.push({ code: 'chart-field-unknown', target: `${role}: ${name}`, fix: `usa uno dei field: ${data.fields.map((each) => each.name).join(', ')}` });
    return field;
  };
  const x = fieldOf('x', request.x);
  const y = fieldOf('y', request.y);
  const series = fieldOf('series', request.series);
  for (const name of request.filter.keys()) fieldOf('filter', name);
  if (x === undefined || y === undefined || problems.length > 0) return { problems };
  // A bar with the quantity on x and the categories on y lies down, as in Vega-Lite.
  const horizontal = template === 'bar' && isQuantity(x) && !isQuantity(y);
  const quantity: ChartRole = horizontal ? 'x' : 'y';
  const quantityField = horizontal ? x : y;
  if (!isQuantity(quantityField)) {
    problems.push({ code: 'chart-role-type', target: `${quantity}: ${quantityField.name}`, fix: `scegli per ${quantity} un field number o integer` });
  }
  if (series?.type === 'number') {
    problems.push({ code: 'chart-role-type', target: `series: ${series.name}`, fix: 'scegli per series un field di categorie: string, integer, boolean o una data' });
  }
  if (problems.length > 0) return { problems };
  const index = (field: Field) => data.fields.indexOf(field);
  const keep = [...request.filter].map(([name, values]) => ({ at: data.fields.findIndex((field) => field.name === name), values }));
  const values: string[][] = [];
  const numbers: number[] = [];
  const seen = new Map<string, number>();
  for (const record of data.records) {
    if (!keep.every(({ at, values: allowed }) => allowed.includes(record.written[at] ?? ''))) continue;
    const roles = [x, y, ...(series ? [series] : [])];
    // A record without a value in a role is not drawn.
    if (roles.some((field) => !('value' in record.values[index(field)]!))) continue;
    const row = roles.map((field) => record.written[index(field)]!);
    const value = record.values[index(quantityField)]!;
    numbers.push('number' in value && value.number !== undefined ? value.number.toNumber() : Number(row[horizontal ? 0 : 1]));
    values.push(row);
    // Bars and lines: one value of the quantity for each category (and series).
    if (template !== 'point') {
      const category = horizontal ? row[1]! : row[0]!;
      const key = `${category}\0${series ? row[2] : ''}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
      if (seen.get(key) === 2) {
        problems.push({ code: 'chart-x-repeated', target: `${horizontal ? 'y' : 'x'}: ${category}`, fix: series ? 'aggiungi un filter: la stessa categoria e la stessa serie hanno più record' : 'aggiungi una series o un filter: la stessa categoria ha più record' });
      }
    }
  }
  if (values.length > MAX_CHART_MARKS) problems.push({ code: 'chart-too-many-marks', target: String(values.length), fix: `resta sotto ${MAX_CHART_MARKS} segni, con un filter` });
  if (problems.length > 0) return { problems };
  return { plan: { template, x, y, ...(series ? { series } : {}), ...(template === 'bar' ? { orientation: horizontal ? 'horizontal' : 'vertical' } : {}), values, numbers } };
}

/** What the drawing takes from the computed styles: the font, the colors of the text and of the marks. */
export interface ChartLook {
  /** Family names, without quotes, as Vega writes them in the SVG. */
  font: string;
  /** The size of the text of the chart, in px of the drawing. */
  fontSize: number;
  text: string;
  /** The color of the marks, and of the first series. */
  mark: string;
  theme: 'light' | 'dark';
  lang?: string;
}

/** The colors of the series after the first, in each theme (Okabe and Ito, readable with color blindness). */
const SERIES_COLORS = {
  light: ['#e69f00', '#009e73', '#cc79a7', '#56b4e9', '#d55e00', '#0072b2'],
  dark: ['#f0b840', '#33c29a', '#e39cc6', '#7cc8f0', '#ff8a3d', '#4da3ff'],
};

// Numbers on the axes as the display of §0.4: separators of the language, groups as in CLDR.
vega.expressionFunction('docNumber', (value: unknown, lang: unknown) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return displayString(new Decimal(number.toPrecision(12)), typeof lang === 'string' && lang !== '' ? lang : undefined, 'standard', 10);
});

// Text measured with the base fonts, not estimated: Vega knows the true width of a label
// (its check of the overlaps, the room of the axes); another font is estimated as before.
// The typings of vega do not list textMetrics, which vega-scenegraph exports and Vega reads.
const metrics = (vega as unknown as { textMetrics: { estimateWidth: (item: unknown, text: unknown) => number; width: (item: unknown, text: unknown) => number } }).textMetrics;
const estimate = metrics.estimateWidth;
metrics.width = (item: unknown, text: unknown) => {
  const { font, fontSize, fontStyle } = item as { font?: string; fontSize?: number; fontStyle?: string };
  return textWidth(String(text ?? ''), font ?? 'serif', fontSize ?? 11, fontStyle === 'italic') ?? estimate(item, text);
};

/**
 * The labels of a category axis turn by -45° when the widest does not fit in its band:
 * the band is the width of the drawing less the room of the other axis and of the legend.
 */
function turnLabels(labels: string[], look: ChartLook, size: number, legend: string[]): boolean {
  const width = (text: string) => textWidth(text, look.font, size) ?? text.length * size * 0.6;
  const legendRoom = legend.length > 0 ? Math.max(...legend.map(width)) + 40 : 0;
  const band = (CHART_WIDTH - 90 - legendRoom) / Math.max(1, labels.length);
  return Math.max(0, ...labels.map(width)) + 6 > band;
}

/** The Vega-Lite spec of a plan, with its look. */
export function chartSpec(plan: ChartPlan, look: ChartLook): TopLevelSpec {
  const horizontal = plan.orientation === 'horizontal';
  const rows = plan.values.map((row, i) => ({ x: horizontal ? plan.numbers[i] : row[0], y: horizontal ? row[1] : plan.numbers[i], ...(plan.series ? { s: row[2] } : {}) }));
  const quantityAxis = { formatType: 'docNumber', format: look.lang ?? '' };
  const xQuantity = horizontal || (plan.template !== 'bar' && isQuantity(plan.x));
  const title = (field: Field) => (typeof field.title === 'string' && field.title !== '' ? field.title : field.name);
  const label = Math.round(look.fontSize * 0.85 * 100) / 100;
  const distinct = (at: number) => [...new Set(plan.values.map((row) => row[at]!))];
  const turned = !xQuantity && turnLabels(distinct(0), look, label, plan.series ? distinct(2) : []);
  const encoding: Record<string, unknown> = {
    x: xQuantity
      ? { field: 'x', type: 'quantitative', title: title(plan.x), axis: quantityAxis }
      : { field: 'x', type: plan.template === 'point' ? 'nominal' : 'ordinal', sort: null, title: title(plan.x), axis: { labelAngle: turned ? -45 : 0, labelOverlap: false } },
    y: horizontal
      ? { field: 'y', type: 'ordinal', sort: null, title: title(plan.y) }
      : { field: 'y', type: 'quantitative', title: title(plan.y), axis: quantityAxis },
  };
  if (plan.series) {
    encoding.color = { field: 's', type: 'nominal', sort: null, title: title(plan.series), scale: { range: [look.mark, ...SERIES_COLORS[look.theme]] } };
    // Bars of different series side by side, not stacked: each bar is a value of the collection.
    if (plan.template === 'bar') encoding[horizontal ? 'yOffset' : 'xOffset'] = { field: 's', sort: null };
  }
  return {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    autosize: { type: 'fit', contains: 'padding' },
    background: null as unknown as string,
    data: { values: rows },
    mark: { type: plan.template, color: look.mark, ...(plan.template === 'line' ? { point: true } : {}), ...(plan.template === 'point' ? { filled: true } : {}) },
    encoding,
    config: {
      customFormatTypes: true,
      aria: false,
      font: look.font,
      view: { stroke: null },
      axis: { labelColor: look.text, titleColor: look.text, domainColor: look.text, tickColor: look.text, gridColor: look.text, gridOpacity: 0.15, labelFontSize: label, titleFontSize: label, titleFontWeight: 'normal', labelFont: look.font, titleFont: look.font },
      legend: { labelColor: look.text, titleColor: look.text, labelFontSize: label, titleFontSize: label, titleFontWeight: 'normal', labelFont: look.font, titleFont: look.font },
    },
  } as TopLevelSpec;
}

/** Drawings already made, by spec: the same chart is drawn once while the document is open. */
const drawn = new Map<string, string>();

/**
 * The SVG of a plan, drawn by Vega without a canvas and synchronously: the dataflow is run
 * and the string renderer is set up as Vega's own headless SVG export does.
 */
export function drawChart(plan: ChartPlan, look: ChartLook): string {
  const spec = chartSpec(plan, look);
  const key = JSON.stringify(spec);
  const known = drawn.get(key);
  if (known !== undefined) return known;
  const view = new vega.View(vega.parse(compile(spec).spec), { renderer: 'none' });
  view.run();
  const padding = view.padding() as { top: number; bottom: number; left: number; right: number };
  const inner = view as unknown as { _viewWidth: number; _viewHeight: number; _origin: [number, number] };
  // The string renderer of vega-scenegraph, which the typings of vega do not list.
  const Renderer = (vega as unknown as { SVGStringRenderer: new () => { initialize: (...args: unknown[]) => void; render: (scene: unknown) => void; svg: () => string } }).SVGStringRenderer;
  const renderer = new Renderer();
  renderer.initialize(null, Math.max(0, inner._viewWidth + padding.left + padding.right), Math.max(0, inner._viewHeight + padding.top + padding.bottom), [padding.left + inner._origin[0], padding.top + inner._origin[1]], 1);
  renderer.render((view.scenegraph() as unknown as { root: unknown }).root);
  const svg = renderer.svg();
  view.finalize();
  if (drawn.size > 200) drawn.clear();
  drawn.set(key, svg);
  return svg;
}

/** The data of a collection, for a chart: undefined when the collection did not read. */
export type ChartData = CollectionData | undefined;
