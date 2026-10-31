// The formulas of class 4, on the side of the runtime: the jobs to compute, their keys,
// the values that go in and come out. Pure: the code runs elsewhere, in a worker of
// Chromium inside Electron (formula-engine.ts), never in Node.
import { createHash } from 'node:crypto';
import type { CollectionData, Field, Value } from './collection.js';
import { Decimal, displayString, plainString } from './math-line.js';

/** The Pyodide of package.json, which the document fixes with its `pyodide` attribute. */
export const PYODIDE_VERSION = '314.0.7';
/** How long one job may run in the worker, the start of Pyodide excluded. */
export const FORMULA_TIME_LIMIT_MS = 5000;
/** No eval, so the code cannot build a JavaScript function; wasm, the worker and our own files only. */
export const FORMULA_CSP = "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'";
/** The modules a formula may import (formula_host.py says the same). */
export const ALLOWED_MODULES = ['bisect', 'calendar', 'collections', 'datetime', 'decimal', 'fractions', 'functools', 'heapq', 'itertools', 'json', 'math', 'operator', 're', 'statistics', 'string', 'textwrap', 'unicodedata'];
/** The functions of the formula builder, in the code. */
export const BUILDER_FUNCTIONS = ['total', 'mean', 'minimum', 'maximum', 'count'];

/** In the code a hyphen of an id or a field is an underscore (decided, 2A): `vendite-mesi` is `vendite_mesi`. */
export const pythonName = (name: string): string => name.replace(/-/g, '_');

/** A value as it crosses to Python and back: a number as its decimal string. */
export type TypedValue =
  | { type: 'missing' }
  | { type: 'number'; value: string }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'date' | 'datetime' | 'time' | 'year' | 'yearmonth'; value: string };

/** A collection given to the code: its fields, and the values of each record. */
export interface TableInput {
  table: { fields: Array<{ name: string; type: string; categories?: string[] }>; rows: TypedValue[][] };
}
export type InputValue = TypedValue | TableInput;

export interface FormulaJob {
  /** The hash of what the job computes: the code, its inputs, the Pyodide. */
  key: string;
  /** A formula's value, a computed field (once per record), or a math line with names. */
  kind: 'value' | 'column' | 'line';
  code: string;
  /** The names the code may use, with their values. */
  inputs: Record<string, InputValue>;
  /** A computed field: the fields of each record, by name in the code, and its type. */
  records?: { names: string[]; rows: TypedValue[][] };
  type?: string;
  /** A formula that sees its own value of the round before (§0.17); limit null is "infinite". */
  recursion?: { name: string; limit: number | null };
}

/** A problem of the code: its code of §11.2, and where in the code, from line 1 and column 0 in UTF-16 units. */
export interface FormulaProblem {
  code: string;
  message: string;
  target?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  /** A computed field: the record, from 0. */
  record?: number;
}

export type FormulaResult =
  | { value: TypedValue; warning?: FormulaProblem }
  | { values: TypedValue[]; error?: FormulaProblem }
  | { error: FormulaProblem };

/** Computes jobs: the worker in Electron, or a stand-in in the tests of the tree. */
export interface FormulaEvaluator {
  evaluate(jobs: FormulaJob[]): Promise<Map<string, FormulaResult>>;
}

/** What a resolution reads and fills: the results known, by key, and the jobs ready whose result is not known. */
export interface FormulaOptions {
  results: ReadonlyMap<string, FormulaResult>;
  /** Without it the formulas are not computed and give no diagnostic: the tree of an operation. */
  pending?: Map<string, FormulaJob>;
}

/** The key of a job: the hash of all it computes from, so the same key is the same result. */
export function jobKey(job: Omit<FormulaJob, 'key'>): string {
  const hash = createHash('sha256');
  hash.update(`pyodide ${PYODIDE_VERSION}\n`);
  hash.update(JSON.stringify([job.kind, job.code, job.type ?? null, job.recursion ?? null, Object.entries(job.inputs).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)), job.records ?? null]));
  return hash.digest('hex');
}

/** A value of a record as the code sees it; a value not of its type is missing. */
export function typedValue(field: Field, value: Value): TypedValue {
  if ('missing' in value || 'invalid' in value) return { type: 'missing' };
  if (typeof value.value === 'boolean') return { type: 'boolean', value: value.value };
  if (field.asWritten) return { type: 'string', value: value.value };
  switch (field.type) {
    case 'number':
    case 'integer':
      return { type: 'number', value: value.value };
    case 'date':
    case 'datetime':
    case 'time':
    case 'year':
    case 'yearmonth':
      return { type: field.type, value: value.value };
    default:
      return { type: 'string', value: value.value };
  }
}

/** A collection for the code, with all its fields or only those named. */
export function tableInput(data: CollectionData, only?: ReadonlySet<string>): TableInput {
  const indexes = data.fields.map((field, index) => [field, index] as const).filter(([field]) => only === undefined || only.has(field.name));
  return {
    table: {
      fields: indexes.map(([field]) => ({ name: field.name, type: field.type, ...(field.categories ? { categories: field.categories } : {}) })),
      rows: data.records.map((record) => indexes.map(([field, index]) => typedValue(field, record.values[index]!))),
    },
  };
}

/** A value from the code as a value of a record of a computed field. */
export function recordValue(value: TypedValue): { value: Value; written: string } {
  switch (value.type) {
    case 'missing':
      return { value: { missing: true }, written: '' };
    case 'number': {
      const number = new Decimal(value.value);
      return { value: { value: plainString(number), number }, written: plainString(number) };
    }
    case 'boolean':
      return { value: { value: value.value }, written: String(value.value) };
    default:
      return { value: { value: value.value }, written: value.value };
  }
}

/** The `value` and `display` of a result in the tree: a number as a math line (§0.4), the rest as written. */
export function shownValue(value: TypedValue, lang: string | undefined): { value?: string | boolean; display?: string } {
  if (value.type === 'missing') return {};
  if (value.type === 'number') {
    const number = new Decimal(value.value);
    return { value: plainString(number), display: displayString(number, lang, 'standard') };
  }
  if (value.type === 'boolean') return { value: value.value, display: String(value.value) };
  return { value: value.value, display: value.value };
}

/**
 * The names of a math line that may name a formula or a collection: the identifiers not
 * after a point and not in a string. The worker checks the code with `ast`; this only
 * finds what to give it.
 */
export function lineNames(expression: string): string[] {
  const code = expression.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, '""');
  const names = new Set<string>();
  for (const match of code.matchAll(/(?<![.\w])([A-Za-z_][A-Za-z0-9_]*)/g)) names.add(match[1]!);
  return [...names];
}

/** True when a math line is not one of class 1 and has a name: Python, computed in the worker. */
export function isCodeLine(expression: string): boolean {
  return /[A-Za-z_]/.test(expression.replace(/\d[\d.]*[eE][+-]?\d+/g, ''));
}

/** The codes of §11.2 of class 4 that come from the worker, and their fix. */
export function problemFix(problem: FormulaProblem, inputs: 'formula' | 'line'): string {
  switch (problem.code) {
    case 'formula-syntax':
      return `correggi il codice: ${problem.message}`;
    case 'formula-name-undeclared':
      return problem.target === undefined
        ? 'usa solo gli ingressi dichiarati'
        : inputs === 'formula'
          ? `aggiungi ${problem.target.replace(/_/g, '-')} a inputs`
          : `scrivi l'id di una formula o di una collection, con _ al posto di -`;
    case 'formula-import-forbidden':
      return `usa un modulo fra: ${ALLOWED_MODULES.join(', ')}`;
    case 'formula-type':
      return `controlla i tipi: ${problem.message}`;
    case 'formula-timeout':
      return `fai un calcolo che stia sotto ${FORMULA_TIME_LIMIT_MS / 1000} s`;
    case 'formula-unavailable':
      return 'installa Electron con npm ci nella cartella runtime';
    case 'formula-recursion-limit':
      return 'dai a recursion un limite, per esempio "10"';
    default:
      return `correggi il calcolo: ${problem.message}`;
  }
}
