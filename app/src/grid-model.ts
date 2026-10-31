// The model of the grid of a collection, without DOM: the columns of the data file with
// their fields, the records as written in the file, the edits with undo and redo, and the
// texts to write. The file stays the source of truth: a value that is not of its type is
// kept as typed and marked invalid. The view (renderer/grid.ts) draws and edits it.
import { columnDisplays, fieldName, readRecords, readSchema, readValue, SUPPORTED_TYPES, writeRecords, type Field, type Schema } from 'doc-runtime/dist/src/collection.js';
import { langFormat, plainString, readDecimal } from 'doc-runtime/dist/src/math-line.js';

/** What the grid is opened on: the schema as written in the descriptor, the data as text, the language of the document. */
export interface GridSource {
  descriptor: string;
  data: string;
  extension: 'tsv' | 'csv';
  /** The keys of the schema as written: fields (a list of maps), primaryKey, missingValues, dialect. */
  fields: unknown;
  primaryKey?: unknown;
  missingValues?: unknown;
  dialect?: unknown;
  text: string;
  lang: string | undefined;
  /** The id of the collection, for the fields dragged into a formula (class 4). */
  id?: string;
  /** The values of the computed fields, by field, as plain values; never written in the data file. */
  computed?: Record<string, string[]>;
}

/** A column of the file: its name, and its field as written, or null for a column that is not a field. */
export interface Column {
  name: string;
  field: Record<string, unknown> | null;
}

interface Step {
  undo: () => void;
  redo: () => void;
}

/** Keys a field keeps only with some types: dropped when the type changes to another. */
const KEYS_OF_TYPES: Record<string, string[]> = {
  categories: ['string', 'integer'],
  decimalChar: ['number'],
  groupChar: ['number', 'integer'],
  trueValues: ['boolean'],
  falseValues: ['boolean'],
};

export class GridModel {
  columns: Column[];
  records: string[][];
  readonly lang: string | undefined;
  private readonly source: GridSource;
  private schema: Schema;
  private fieldsByColumn: Array<Field | null> = [];
  private readonly displays = new Map<number, string[]>();
  private undoStack: Step[] = [];
  private redoStack: Step[] = [];
  /** How many steps were done when the files were last saved: the grid is dirty when it differs. */
  private savedAt = 0;
  private done = 0;
  /** Called after every change, with the columns whose values changed (all when undefined). */
  onChange: (columns?: number[]) => void = () => undefined;

  constructor(source: GridSource) {
    this.source = source;
    this.lang = source.lang;
    this.schema = readSchema({ fields: source.fields, primaryKey: source.primaryKey, missingValues: source.missingValues, dialect: source.dialect }, source.extension).schema;
    const { records } = readRecords(source.text, this.schema);
    const header = records.shift()?.cells.map((cell) => cell.text) ?? [];
    const written = Array.isArray(source.fields) ? (source.fields as Array<Record<string, unknown>>) : [];
    // The columns of the file in their order, then the fields the file lacks.
    this.columns = header.map((name) => ({ name, field: written.find((field) => field?.name === name) ?? null }));
    for (const field of written) if (typeof field?.name === 'string' && !header.includes(field.name)) this.columns.push({ name: field.name, field });
    this.records = records.map((record) => this.columns.map((_, index) => record.cells[index]?.text ?? ''));
    // The computed fields: their values from the tree, shown and never written.
    this.columns.forEach((column, index) => {
      const values = typeof column.field?.formula === 'string' ? source.computed?.[column.name] : undefined;
      if (values) this.records.forEach((record, row) => (record[index] = values[row] ?? ''));
    });
    this.refreshFields();
  }

  private refreshFields(): void {
    this.schema = readSchema({ fields: this.descriptorFields(), primaryKey: this.source.primaryKey, missingValues: this.source.missingValues, dialect: this.source.dialect }, this.source.extension).schema;
    this.fieldsByColumn = this.columns.map((column) => (column.field === null ? null : this.schema.fields.find((field) => field.name === column.name) ?? null));
    this.displays.clear();
  }

  /**
   * New values of the computed fields, after a recomputation: shown, not an edit, so not
   * undone and not dirty. False when nothing changed.
   */
  setComputed(computed: Record<string, string[]>): boolean {
    let changed = false;
    this.columns.forEach((column, index) => {
      const values = this.formula(index) === null ? undefined : computed[column.name];
      if (values === undefined) return;
      this.records.forEach((record, row) => {
        const value = values[row] ?? '';
        if (record[index] !== value) {
          record[index] = value;
          changed = true;
        }
      });
      this.displays.delete(index);
    });
    return changed;
  }

  /** The formula of a computed field, its id; null for a field of the data file. */
  formula(column: number): string | null {
    const written = this.columns[column]?.field?.formula;
    return typeof written === 'string' ? written.replace(/^\[\[(.*)\]\]$/, '$1') : null;
  }

  /** The field read of a column, or null for a column that is not a field. */
  field(column: number): Field | null {
    return this.fieldsByColumn[column] ?? null;
  }

  /** The heading of a column: its title, or its name. */
  heading(column: number): string {
    const title = this.columns[column]?.field?.title;
    return typeof title === 'string' && title !== '' ? title : this.columns[column]!.name;
  }

  /** The type of a column, as the grid shows it next to the heading. */
  type(column: number): string {
    return this.field(column)?.type ?? '—';
  }

  get dirty(): boolean {
    return this.done !== this.savedAt;
  }

  markSaved(): void {
    this.savedAt = this.done;
  }

  // Values.

  /** A value read: missing, of its type, or invalid (shown as typed, and marked). */
  state(row: number, column: number): 'missing' | 'valid' | 'invalid' {
    const written = this.records[row]?.[column] ?? '';
    const field = this.field(column);
    if (field === null) return written === '' ? 'missing' : 'valid';
    const value = readValue(field, written, this.schema);
    return 'missing' in value ? 'missing' : 'invalid' in value ? 'invalid' : 'valid';
  }

  /** The string to show at rest: for numbers the one of the table, with the decimals of the column; else as written. */
  display(row: number, column: number): string {
    const field = this.field(column);
    const written = this.records[row]?.[column] ?? '';
    if (field === null || (field.type !== 'number' && field.type !== 'integer') || field.asWritten) return written;
    let shown = this.displays.get(column);
    if (shown === undefined) {
      const values = this.records.map((record) => {
        const value = readValue(field, record[column] ?? '', this.schema);
        return 'number' in value ? value.number : undefined;
      });
      shown = columnDisplays(values, this.lang, 2, field.type === 'integer');
      this.displays.set(column, shown);
    }
    return shown[row] || written;
  }

  /** The value while it is edited: a number in the language of the document (1,5 in Italian), else as written. */
  editText(row: number, column: number): string {
    const written = this.records[row]?.[column] ?? '';
    const field = this.field(column);
    if (field === null || (field.type !== 'number' && field.type !== 'integer')) return written;
    const value = readValue(field, written, this.schema);
    if (!('number' in value) || value.number === undefined) return written;
    const decimal = (this.lang === undefined ? undefined : langFormat(this.lang))?.decimal ?? '.';
    return plainString(value.number).replace('.', decimal);
  }

  /**
   * What the file gets for a text typed in a column: a number read in the language of the
   * document (or with the point) and written with the decimal sign of the field, without
   * groups; anything else as typed, a tab or a line end becoming a space. A text that is
   * not of its type is kept as typed.
   */
  fileValue(column: number, typed: string): string {
    const text = typed.replace(/[\t\n\r]/g, ' ');
    const field = this.field(column);
    if (field === null || (field.type !== 'number' && field.type !== 'integer')) return text;
    const format = this.lang === undefined ? undefined : langFormat(this.lang);
    // First as the language writes it (1.250,5 in Italian), then with the point and no groups (1.5).
    const shapes = [
      { pattern: new RegExp(`^[+-]?(\\d{1,3}(${escape(format?.group ?? ',')}\\d{3})+|\\d+)(${escape(format?.decimal ?? '.')}\\d+)?$`), group: format?.group ?? ',', decimal: format?.decimal ?? '.' },
      { pattern: /^[+-]?\d+(\.\d+)?$/, group: '', decimal: '.' },
    ];
    const trimmed = text.trim();
    for (const { pattern, group, decimal } of shapes) {
      if (!pattern.test(trimmed)) continue;
      const plain = (group === '' ? trimmed : trimmed.split(group).join('')).replace(decimal, '.');
      const value = readDecimal(plain);
      if (value === null || (field.type === 'integer' && !value.isInteger())) continue;
      return plainString(value).replace('.', field.decimalChar);
    }
    return text;
  }

  /** The value written for an empty cell: "" if it is a missing value, else the first missing value. */
  private get empty(): string {
    return this.schema.missingValues.includes('') ? '' : this.schema.missingValues[0] ?? '';
  }

  // Edits, each with its undo.

  private apply(step: Step, columns?: number[]): void {
    step.redo();
    this.undoStack.push(step);
    this.redoStack = [];
    this.done++;
    this.changed(columns);
  }

  private changed(columns?: number[]): void {
    if (columns === undefined) this.displays.clear();
    else for (const column of columns) this.displays.delete(column);
    this.onChange(columns);
  }

  undo(): boolean {
    const step = this.undoStack.pop();
    if (!step) return false;
    step.undo();
    this.redoStack.push(step);
    this.done--;
    this.refreshFields();
    this.changed();
    return true;
  }

  redo(): boolean {
    const step = this.redoStack.pop();
    if (!step) return false;
    step.redo();
    this.undoStack.push(step);
    this.done++;
    this.refreshFields();
    this.changed();
    return true;
  }

  /** Writes values from a cell, a block of rows of values in file form; records missing at the end are added. */
  setBlock(row: number, column: number, block: string[][]): void {
    const before = this.records.length;
    const old: Array<[number, number, string]> = [];
    const next: Array<[number, number, string]> = [];
    block.forEach((values, r) => values.forEach((value, c) => {
      // A computed field is read only: its values come from its formula.
      if (column + c >= this.columns.length || this.formula(column + c) !== null) return;
      next.push([row + r, column + c, value]);
    }));
    const columns = [...new Set(next.map(([, c]) => c))];
    this.apply({
      redo: () => {
        while (this.records.length < row + block.length) this.records.push(this.columns.map(() => this.empty));
        old.length = 0;
        for (const [r, c, value] of next) {
          old.push([r, c, this.records[r]![c]!]);
          this.records[r]![c] = value;
        }
      },
      undo: () => {
        for (const [r, c, value] of old) this.records[r]![c] = value;
        this.records.length = before;
      },
    }, columns);
  }

  setCell(row: number, column: number, value: string): void {
    this.setBlock(row, column, [[value]]);
  }

  /** Text pasted from a spreadsheet: rows on lines, values separated by tabs, each read as if typed in its column. */
  paste(row: number, column: number, text: string): { rows: number; columns: number } {
    const lines = text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
    const block = lines.map((line) => line.split('\t').map((value, c) => this.fileValue(column + c, value)));
    this.setBlock(row, column, block);
    return { rows: block.length, columns: Math.max(...block.map((values) => values.length)) };
  }

  /** A rectangle as a spreadsheet takes it: values as edited (in the language of the document), tabs and lines. */
  copy(top: number, left: number, bottom: number, right: number): string {
    const lines: string[] = [];
    for (let r = top; r <= bottom; r++) {
      const values: string[] = [];
      for (let c = left; c <= right; c++) values.push(this.editText(r, c));
      lines.push(values.join('\t'));
    }
    return `${lines.join('\n')}\n`;
  }

  /** Empties a rectangle of cells. */
  clear(top: number, left: number, bottom: number, right: number): void {
    const block: string[][] = [];
    for (let r = top; r <= bottom; r++) block.push(Array.from({ length: right - left + 1 }, () => this.empty));
    this.setBlock(top, left, block);
  }

  /** A new empty record at a place: at the end, or after the one chosen. */
  insertRecord(at: number): void {
    this.apply({
      redo: () => this.records.splice(at, 0, this.columns.map(() => this.empty)),
      undo: () => this.records.splice(at, 1),
    });
  }

  removeRecord(row: number): void {
    let removed: string[] = [];
    this.apply({
      redo: () => {
        removed = this.records.splice(row, 1)[0]!;
      },
      undo: () => this.records.splice(row, 0, removed),
    });
  }

  /** Moves a record up (-1) or down (1): the order of the records is their order in the file. */
  moveRecord(row: number, by: -1 | 1): boolean {
    const to = row + by;
    if (to < 0 || to >= this.records.length) return false;
    const swap = () => {
      const record = this.records[row]!;
      this.records[row] = this.records[to]!;
      this.records[to] = record;
    };
    this.apply({ redo: swap, undo: swap });
    return true;
  }

  /** A new field from its title, its name made from it as in turn-into, with a type; at the end, or at a place. */
  addField(title: string, type: string, at = this.columns.length): string {
    if (!SUPPORTED_TYPES.has(type)) throw new Error(`tipo sconosciuto: ${type}`);
    const taken = new Set(this.columns.map((column) => column.name));
    const { name, title: written } = fieldName(title, at + 1, taken);
    const column: Column = { name, field: { name, type, ...(written !== undefined ? { title: written } : {}) } };
    this.apply({
      redo: () => {
        this.columns.splice(at, 0, column);
        for (const record of this.records) record.splice(at, 0, this.empty);
        this.refreshFields();
      },
      undo: () => {
        this.columns.splice(at, 1);
        for (const record of this.records) record.splice(at, 1);
        this.refreshFields();
      },
    });
    return name;
  }

  /** Removes a field and its column, with its values. */
  removeField(column: number): void {
    let removed: Column | null = null;
    let values: string[] = [];
    this.apply({
      redo: () => {
        removed = this.columns.splice(column, 1)[0]!;
        values = this.records.map((record) => record.splice(column, 1)[0]!);
        this.refreshFields();
      },
      undo: () => {
        this.columns.splice(column, 0, removed!);
        this.records.forEach((record, r) => record.splice(column, 0, values[r]!));
        this.refreshFields();
      },
    });
  }

  /** Changes the title, or the type, of a field; never its name, which references will use. */
  setField(column: number, key: 'title' | 'type', value: string): void {
    const target = this.columns[column];
    if (!target || target.field === null) throw new Error('questa colonna non è un campo');
    if (key === 'type' && !SUPPORTED_TYPES.has(value)) throw new Error(`tipo sconosciuto: ${value}`);
    const before = { ...target.field };
    const after: Record<string, unknown> = { ...target.field };
    if (key === 'title') {
      if (value.trim() === '' || value.trim() === target.name) delete after.title;
      else after.title = value.trim();
    } else {
      after.type = value;
      // Keys that the new type does not admit would make the schema invalid.
      for (const [name, types] of Object.entries(KEYS_OF_TYPES)) if (!types.includes(value)) delete after[name];
    }
    this.apply({
      redo: () => {
        target.field = after;
        this.refreshFields();
      },
      undo: () => {
        target.field = before;
        this.refreshFields();
      },
    }, [column]);
  }

  // What is written.

  /** The fields of the schema, as the descriptor writes them: the columns that are fields, in their order. */
  descriptorFields(): Array<Record<string, unknown>> {
    return this.columns.flatMap((column) => (column.field === null ? [] : [column.field]));
  }

  /** The data file: the names, then the records, in the form of the runtime (§12). */
  /**
   * The record written at a line of the data file (from 0, the header 0): the record whose
   * text starts on that line or before it, read from the text the preview shows, the file
   * as opened or, after a change, as the grid writes it; -1 for the header. A value with a
   * line end inside quotes, in a CSV, makes a record longer than a line.
   */
  recordAtLine(line: number): number {
    const text = this.done === 0 && this.undoStack.length === 0 && this.redoStack.length === 0 ? this.source.text : this.dataText();
    const starts = readRecords(text, this.schema).records.map((record) => text.slice(0, record.start).split('\n').length - 1);
    let found = -1;
    // The first is the header.
    for (let i = 1; i < starts.length; i++) if (starts[i]! <= line) found = i - 1;
    return found;
  }

  dataText(): string {
    // A computed field is never in the data file: its column would be an override (class 4).
    const kept = this.columns.map((_, index) => index).filter((index) => this.formula(index) === null);
    return writeRecords([kept.map((index) => this.columns[index]!.name), ...this.records.map((record) => kept.map((index) => record[index]!))], this.schema.dialect);
  }
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
