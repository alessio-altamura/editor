// The collection of class 2: the schema written in its descriptor with the names of
// Frictionless Table Schema and Table Dialect, the reading of its TSV or CSV file, the
// typed values and the strings to show. Pure: no files, no tree.
import { Decimal, langFormat, localize, plainString, readDecimal, roundHalfEven, type Decimal as DecimalValue } from './math-line.js';

/** The types read and checked in this step; the other types of Frictionless are shown as written. */
export const SUPPORTED_TYPES = new Set(['string', 'number', 'integer', 'boolean', 'date', 'datetime', 'time', 'year', 'yearmonth']);
const FRICTIONLESS_TYPES = new Set([...SUPPORTED_TYPES, 'object', 'array', 'list', 'duration', 'geopoint', 'geojson', 'any']);
/** The keys of a field read in this step. */
const FIELD_KEYS = new Set(['name', 'type', 'title', 'description', 'format', 'categories', 'decimalChar', 'groupChar', 'trueValues', 'falseValues']);
/** The keys of the dialect read in this step; lineTerminator is read but any line end is accepted. */
const DIALECT_KEYS = new Set(['delimiter', 'quoteChar', 'doubleQuote', 'skipInitialSpace', 'header', 'lineTerminator']);

/** New limits of a data file (§11.1): past them the collection has no table, only its description. */
export const MAX_DATA_BYTES = 16 * 1024 * 1024;
export const MAX_RECORDS = 100_000;

export interface Field {
  name: string;
  type: string;
  title?: string;
  categories?: string[];
  decimalChar: string;
  groupChar?: string;
  trueValues: string[];
  falseValues: string[];
  /** A type of Frictionless not read in this step, or a format other than default: shown as written. */
  asWritten: boolean;
}

export interface Schema {
  fields: Field[];
  primaryKey: string[];
  missingValues: string[];
  dialect: { delimiter: string; quoteChar: string; doubleQuote: boolean; skipInitialSpace: boolean; quoting: boolean };
}

/** A problem found, with its code; `start` and `end` are offsets in the data file when it has a place there. */
export interface Problem {
  code: string;
  target?: string;
  fix: string | undefined;
  start?: number;
  end?: number;
}

const isMap = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const strings = (value: unknown): string[] | null => (Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : typeof value === 'string' ? [value] : null);

/**
 * The schema from the attributes of the descriptor, as YAML gives them with the failsafe
 * schema: every scalar a string. `extension` is that of the data file, for the default
 * delimiter: a tab for .tsv, a comma for .csv.
 */
export function readSchema(attributes: { fields?: unknown; primaryKey?: unknown; missingValues?: unknown; dialect?: unknown }, extension: 'tsv' | 'csv'): { schema: Schema; problems: Problem[] } {
  const problems: Problem[] = [];
  const invalid = (target: string, fix: string) => problems.push({ code: 'collection-schema-invalid', target, fix });
  const unsupported = (target: string, fix: string) => problems.push({ code: 'collection-schema-unsupported', target, fix });
  const fields: Field[] = [];
  if (!Array.isArray(attributes.fields) || attributes.fields.length === 0) invalid('fields', 'scrivi fields, una lista di campi con name e type');
  for (const written of Array.isArray(attributes.fields) ? attributes.fields : []) {
    if (!isMap(written) || typeof written.name !== 'string' || written.name === '') {
      invalid('fields', 'ogni campo vuole name');
      continue;
    }
    const name = written.name;
    if (fields.some((field) => field.name === name)) {
      invalid(name, `togli il secondo campo ${name}`);
      continue;
    }
    const type = typeof written.type === 'string' ? written.type : 'string';
    const field: Field = { name, type, decimalChar: '.', trueValues: ['true', 'True', 'TRUE', '1'], falseValues: ['false', 'False', 'FALSE', '0'], asWritten: false };
    if (!FRICTIONLESS_TYPES.has(type)) {
      invalid(type, `usa uno dei tipi: ${[...SUPPORTED_TYPES].join(', ')}`);
      field.asWritten = true;
    } else if (!SUPPORTED_TYPES.has(type)) {
      unsupported(type, 'per ora i valori si mostrano come scritti');
      field.asWritten = true;
    }
    for (const [key, value] of Object.entries(written)) {
      if (!FIELD_KEYS.has(key)) {
        unsupported(key, `togli ${key}: per ora non si legge`);
        continue;
      }
      if (key === 'name' || key === 'type' || key === 'description') continue;
      if (key === 'title') {
        if (typeof value === 'string') field.title = value;
        else invalid(name, 'scrivi title come stringa');
      } else if (key === 'format') {
        if (value !== 'default') {
          unsupported(String(value), 'per ora solo format: default; i valori si mostrano come scritti');
          field.asWritten = true;
        }
      } else if (key === 'categories') {
        const list = Array.isArray(value) ? value.map((item) => (isMap(item) ? item.value : item)) : null;
        if (type !== 'string' && type !== 'integer') invalid(name, `togli categories: vale per string e integer, non per ${type}`);
        else if (list === null || !list.every((item) => typeof item === 'string')) invalid(name, 'scrivi categories come lista di valori');
        else field.categories = list as string[];
      } else if (key === 'decimalChar' || key === 'groupChar') {
        if (typeof value !== 'string' || [...value].length !== 1) invalid(name, `scrivi ${key} come un carattere`);
        else if (key === 'decimalChar' && type !== 'number') invalid(name, 'togli decimalChar: vale per number');
        else if (key === 'groupChar' && type !== 'number' && type !== 'integer') invalid(name, 'togli groupChar: vale per number e integer');
        else if (key === 'decimalChar') field.decimalChar = value;
        else field.groupChar = value;
      } else {
        const list = strings(value);
        if (type !== 'boolean') invalid(name, `togli ${key}: vale per boolean`);
        else if (list === null) invalid(name, `scrivi ${key} come lista`);
        else if (key === 'trueValues') field.trueValues = list;
        else field.falseValues = list;
      }
    }
    fields.push(field);
  }
  let primaryKey: string[] = [];
  if (attributes.primaryKey !== undefined) {
    const list = strings(attributes.primaryKey);
    if (list === null || list.length === 0) invalid('primaryKey', 'scrivi primaryKey come nome di un campo o lista di nomi');
    else {
      for (const name of list) if (!fields.some((field) => field.name === name)) invalid(name, `primaryKey nomina ${name}, che non è fra i fields`);
      primaryKey = list.filter((name) => fields.some((field) => field.name === name));
    }
  }
  let missingValues = [''];
  if (attributes.missingValues !== undefined) {
    const list = strings(attributes.missingValues);
    if (list === null || typeof attributes.missingValues === 'string') invalid('missingValues', 'scrivi missingValues come lista, per esempio [""]');
    else missingValues = list;
  }
  const dialect = { delimiter: extension === 'tsv' ? '\t' : ',', quoteChar: '"', doubleQuote: true, skipInitialSpace: false, quoting: extension === 'csv' };
  if (attributes.dialect !== undefined) {
    if (!isMap(attributes.dialect)) invalid('dialect', 'scrivi dialect come mappa, per esempio delimiter: ";"');
    for (const [key, value] of Object.entries(isMap(attributes.dialect) ? attributes.dialect : {})) {
      if (!DIALECT_KEYS.has(key)) {
        unsupported(key, `togli ${key}: per ora non si legge`);
        continue;
      }
      const flag = value === 'true' ? true : value === 'false' ? false : null;
      if (key === 'delimiter' || key === 'quoteChar') {
        if (typeof value !== 'string' || [...value].length !== 1 || value === '\n' || value === '\r') invalid(key, `scrivi ${key} come un carattere`);
        else if (key === 'delimiter') dialect.delimiter = value;
        else dialect.quoteChar = value;
      } else if (key === 'doubleQuote' || key === 'skipInitialSpace' || key === 'header') {
        if (flag === null) invalid(key, `scrivi ${key} come "true" o "false"`);
        else if (key === 'header' && !flag) unsupported(key, 'per ora la prima riga sono i nomi dei campi');
        else if (key === 'doubleQuote') dialect.doubleQuote = flag;
        else if (key === 'skipInitialSpace') dialect.skipInitialSpace = flag;
      }
    }
  }
  return { schema: { fields, primaryKey, missingValues, dialect }, problems };
}

/** A value of a record, where it is written in the data file. */
export interface RawCell {
  text: string;
  start: number;
  end: number;
}
export interface RawRecord {
  cells: RawCell[];
  start: number;
  end: number;
}

/**
 * The records of a data file, the header first. A TSV has one record per line, without
 * quotes or escapes (the IANA registration of the format); a CSV follows RFC 4180, with
 * the quote doubled inside quotes. Empty lines are skipped. The text is read without BOM
 * and with LF, as the runtime reads every file.
 */
export function readRecords(text: string, schema: Schema): { records: RawRecord[]; problems: Problem[] } {
  const { delimiter, quoteChar, doubleQuote, skipInitialSpace, quoting } = schema.dialect;
  const records: RawRecord[] = [];
  const problems: Problem[] = [];
  let at = 0;
  while (at < text.length) {
    if (text[at] === '\n') {
      at++;
      continue;
    }
    const record: RawRecord = { cells: [], start: at, end: at };
    let broken = false;
    for (;;) {
      if (skipInitialSpace) while (text[at] === ' ') at++;
      const start = at;
      let value = '';
      if (quoting && text[at] === quoteChar) {
        // A quoted value: up to the closing quote, a doubled quote being one quote.
        at++;
        let closed = false;
        while (at < text.length) {
          if (text[at] === quoteChar) {
            if (doubleQuote && text[at + 1] === quoteChar) {
              value += quoteChar;
              at += 2;
              continue;
            }
            at++;
            closed = true;
            break;
          }
          value += text[at];
          at++;
        }
        if (!closed || (at < text.length && text[at] !== delimiter && text[at] !== '\n')) {
          broken = true;
          // The rest of the line is not read.
          while (at < text.length && text[at] !== '\n') at++;
        }
      } else {
        while (at < text.length && text[at] !== delimiter && text[at] !== '\n') {
          if (quoting && text[at] === quoteChar) broken = true;
          value += text[at];
          at++;
        }
      }
      record.cells.push({ text: value, start, end: at });
      if (at < text.length && text[at] === delimiter && !broken) {
        at++;
        continue;
      }
      break;
    }
    record.end = at;
    if (broken) {
      problems.push({ code: 'collection-record-invalid', target: text.slice(record.start, Math.min(record.end, record.start + 60)), fix: `chiudi le virgolette, raddoppiando ${quoteChar} dentro un valore`, start: record.start, end: record.end });
    } else records.push(record);
    if (records.length > MAX_RECORDS + 1) break;
  }
  return { records, problems };
}

/** A value read: missing, of its type, or not of its type and shown as written. */
export type Value = { missing: true } | { value: string | boolean; number?: DecimalValue } | { invalid: true };

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(\.\d+)?$/;
const OFFSET = /^(Z|[+-]([01]\d|2[0-3]):[0-5]\d)?$/;
const validDate = (year: number, month: number, day: number) =>
  month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();

/** A value of a field, as Frictionless reads it with the default format. */
export function readValue(field: Field, written: string, schema: Schema): Value {
  if (schema.missingValues.includes(written)) return { missing: true };
  if (field.asWritten) return { value: written };
  switch (field.type) {
    case 'string':
      return field.categories && !field.categories.includes(written) ? { invalid: true } : { value: written };
    case 'integer': {
      const plain = field.groupChar === undefined ? written : written.split(field.groupChar).join('');
      if (!/^[+-]?\d+$/.test(plain)) return { invalid: true };
      const value = BigInt(plain).toString();
      if (field.categories && !field.categories.some((category) => /^[+-]?\d+$/.test(category) && BigInt(category).toString() === value)) return { invalid: true };
      return { value, number: new Decimal(value) };
    }
    case 'number': {
      let plain = field.groupChar === undefined ? written : written.split(field.groupChar).join('');
      if (field.decimalChar !== '.') {
        if (plain.includes('.')) return { invalid: true };
        plain = plain.split(field.decimalChar).join('.');
      }
      if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(plain)) return { invalid: true };
      const number = readDecimal(plain);
      return number === null ? { invalid: true } : { value: plainString(number), number };
    }
    case 'boolean':
      if (field.trueValues.includes(written)) return { value: true };
      if (field.falseValues.includes(written)) return { value: false };
      return { invalid: true };
    case 'date': {
      const match = DATE.exec(written);
      return match && validDate(Number(match[1]), Number(match[2]), Number(match[3])) ? { value: written } : { invalid: true };
    }
    case 'datetime': {
      const [date = '', rest = ''] = written.split('T');
      const match = DATE.exec(date);
      const time = /^([^Z+-]*)(.*)$/.exec(rest)!;
      return match && validDate(Number(match[1]), Number(match[2]), Number(match[3])) && TIME.test(time[1]!) && OFFSET.test(time[2]!) ? { value: written } : { invalid: true };
    }
    case 'time':
      return TIME.test(written) ? { value: written } : { invalid: true };
    case 'year':
      return /^\d{4}$/.test(written) ? { value: written } : { invalid: true };
    case 'yearmonth': {
      const match = /^(\d{4})-(\d{2})$/.exec(written);
      return match && Number(match[2]) >= 1 && Number(match[2]) <= 12 ? { value: written } : { invalid: true };
    }
    default:
      return { value: written };
  }
}

/**
 * The strings of a column of numbers: half-even to `decimals` places, as the math lines,
 * then all with the decimals of the value that shows the most, zeros kept, so the digits
 * line up (1,50 over 2,25). An integer column has none.
 */
export function columnDisplays(values: Array<DecimalValue | undefined>, lang: string | undefined, decimals: number, integer: boolean): string[] {
  const format = lang === undefined ? undefined : langFormat(lang);
  const rounded = values.map((value) => (value === undefined ? undefined : integer ? value : roundHalfEven(value, decimals)));
  const places = integer ? 0 : Math.max(0, ...rounded.map((value) => (value === undefined ? 0 : (plainString(value).split('.')[1] ?? '').length)));
  return rounded.map((value) => (value === undefined ? '' : localize(value.isZero() ? (0).toFixed(places) : value.toFixed(places), format)));
}

/** The string to show of a value that is not a number: as written; a boolean as written too. */
export const writtenDisplay = (written: string): string => written;
