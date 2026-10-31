// The model of the formula builder (class 4), without DOM: the inputs, the operation
// chosen from the menu and its operands, the range, with undo and redo. It writes the
// code, and reads back only code it would write itself: anything else is written by hand,
// and the builder does not rewrite it.

export const AGGREGATES = ['total', 'mean', 'minimum', 'maximum', 'count'] as const;
export const ARITHMETIC = { add: '+', subtract: '-', multiply: '*', divide: '/' } as const;
export const COMPARISONS = ['>', '<', '>=', '<=', '==', '!='] as const;
export type Aggregate = (typeof AGGREGATES)[number];
export type Operation = 'empty' | Aggregate | keyof typeof ARITHMETIC | 'if';
export type Comparison = (typeof COMPARISONS)[number];

/** The menu of the operations, in Italian; the code keeps the names of §14.2. */
export const OPERATION_NAMES: Record<Operation, string> = {
  empty: '—',
  total: 'Somma',
  mean: 'Media',
  minimum: 'Minimo',
  maximum: 'Massimo',
  count: 'Conteggio',
  add: 'Più',
  subtract: 'Meno',
  multiply: 'Per',
  divide: 'Diviso',
  if: 'Se … allora … altrimenti',
};

/** An operand: an input, by its name as written (a formula, or a field of the record), or a number. */
export type Operand = { input: string } | { number: string };

export interface BuilderState {
  /** The inputs as the attribute writes them: formulas, collections, collection.field. */
  inputs: string[];
  operation: Operation;
  /** An aggregate: the field it reduces, `collection.field`, and the range of the records. */
  source?: string;
  range?: { field: string; from: string; to: string };
  /** The four operations, and the comparison of the condition. */
  left?: Operand;
  right?: Operand;
  compare?: Comparison;
  then?: Operand;
  otherwise?: Operand;
}

/** What the formula is for: a value, or a computed field of a collection, whose fields are the record's. */
export interface BuilderContext {
  column: string | null;
}

/** The code of the empty formula, as `create formula` writes it. */
export const EMPTY_CODE = 'None';

const pythonName = (name: string) => name.replace(/-/g, '_');
const quote = (text: string) => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const NUMBER = /^-?\d+(\.\d+)?$/;
const OPERAND = String.raw`([A-Za-z_][A-Za-z0-9_]*|-?\d+(?:\.\d+)?)`;
const STRING = String.raw`'((?:[^'\\]|\\.)*)'`;
const unquote = (text: string) => text.replace(/\\(.)/g, '$1');

/** The name of an operand in the code: a formula by its id, a field of the record by its name. */
export function operandCode(operand: Operand, context: BuilderContext): string {
  if ('number' in operand) return operand.number;
  const [id, field] = operand.input.split('.') as [string, string | undefined];
  return field !== undefined && id === context.column ? pythonName(field) : field !== undefined ? `${pythonName(id)}.${pythonName(field)}` : pythonName(id);
}

/** The code of a state; null while an operation lacks what it needs. */
export function generate(state: BuilderState, context: BuilderContext): string | null {
  const operand = (value: Operand | undefined) => (value === undefined || ('number' in value && !NUMBER.test(value.number)) ? null : operandCode(value, context));
  switch (state.operation) {
    case 'empty':
      return EMPTY_CODE;
    case 'add':
    case 'subtract':
    case 'multiply':
    case 'divide': {
      const left = operand(state.left);
      const right = operand(state.right);
      return left === null || right === null ? null : `${left} ${ARITHMETIC[state.operation]} ${right}`;
    }
    case 'if': {
      const parts = [operand(state.then), operand(state.left), operand(state.right), operand(state.otherwise)];
      if (parts.some((part) => part === null) || state.compare === undefined) return null;
      return `${parts[0]} if ${parts[1]} ${state.compare} ${parts[2]} else ${parts[3]}`;
    }
    default: {
      if (state.source === undefined || !state.source.includes('.')) return null;
      const [collection, field] = state.source.split('.') as [string, string];
      const range = state.range === undefined ? '' : `.range(${quote(state.range.field)}, ${quote(state.range.from)}, ${quote(state.range.to)})`;
      return `${state.operation}(${pythonName(collection)}${range}.${pythonName(field)})`;
    }
  }
}

/** The inputs the code uses: the field reduced and the field of the range, the operands that are inputs. */
export function usedInputs(state: BuilderState, context: BuilderContext): string[] {
  const out: string[] = [];
  if (AGGREGATES.includes(state.operation as Aggregate) && state.source !== undefined) {
    const collection = state.source.split('.')[0]!;
    // In a computed field, collection.field of its own collection is the record's: the whole collection is the input.
    if (collection === context.column) out.push(collection);
    else {
      out.push(state.source);
      if (state.range) out.push(`${collection}.${state.range.field}`);
    }
  }
  for (const operand of [state.left, state.right, state.then, state.otherwise]) if (operand && 'input' in operand) out.push(operand.input);
  return [...new Set(out)];
}

/**
 * The state of a code the builder wrote, with its inputs; null for code written by hand,
 * which the builder does not understand: then the object opens as text.
 */
export function parse(code: string, inputs: string[], context: BuilderContext): BuilderState | null {
  const text = code.trim();
  const byName = (name: string): Operand | null => {
    if (NUMBER.test(name)) return { number: name };
    const input = inputs.find((each) => {
      const [id, field] = each.split('.') as [string, string | undefined];
      return field === undefined ? pythonName(id) === name : id === context.column && pythonName(field) === name;
    });
    return input === undefined ? null : { input };
  };
  let state: BuilderState | null = null;
  let match: RegExpExecArray | null;
  if (text === EMPTY_CODE) state = { inputs, operation: 'empty' };
  else if ((match = new RegExp(String.raw`^(${AGGREGATES.join('|')})\(([A-Za-z_][A-Za-z0-9_]*)(?:\.range\(${STRING}, ${STRING}, ${STRING}\))?\.([A-Za-z_][A-Za-z0-9_]*)\)$`).exec(text))) {
    const [, operation, collection, rangeField, from, to, field] = match;
    const source = inputs.map((each) => each.split('.')[0]!).find((id) => pythonName(id) === collection);
    if (source !== undefined) {
      const name = inputs.find((each) => each.startsWith(`${source}.`) && pythonName(each.slice(source.length + 1)) === field)?.slice(source.length + 1) ?? field!.replace(/_/g, '-');
      state = { inputs, operation: operation as Aggregate, source: `${source}.${name}`, ...(rangeField !== undefined ? { range: { field: unquote(rangeField), from: unquote(from!), to: unquote(to!) } } : {}) };
    }
  } else if ((match = new RegExp(String.raw`^${OPERAND} ([-+*/]) ${OPERAND}$`).exec(text))) {
    const left = byName(match[1]!);
    const right = byName(match[3]!);
    const operation = (Object.keys(ARITHMETIC) as Array<keyof typeof ARITHMETIC>).find((key) => ARITHMETIC[key] === match![2]);
    if (left && right && operation) state = { inputs, operation, left, right };
  } else if ((match = new RegExp(String.raw`^${OPERAND} if ${OPERAND} (>=|<=|==|!=|>|<) ${OPERAND} else ${OPERAND}$`).exec(text))) {
    const [then, left, right, otherwise] = [match[1]!, match[2]!, match[4]!, match[5]!].map(byName);
    if (then && left && right && otherwise) state = { inputs, operation: 'if', then, left, compare: match[3] as Comparison, right, otherwise };
  }
  // Only what it would write again the same: so nothing written by hand is rewritten.
  return state !== null && generate(state, context) === text ? state : null;
}

export class FormulaModel {
  state: BuilderState;
  private undoStack: BuilderState[] = [];
  private redoStack: BuilderState[] = [];
  private savedAt: string;
  onChange: () => void = () => undefined;

  constructor(state: BuilderState, readonly context: BuilderContext) {
    this.state = structuredClone(state);
    this.savedAt = this.key();
  }

  private key(): string {
    return JSON.stringify([this.code ?? '', this.inputs]);
  }

  /** The code to write: the last one complete, or the empty formula. */
  get code(): string | null {
    return generate(this.state, this.context);
  }

  /** The inputs to write: those dragged in, and those the code uses. */
  get inputs(): string[] {
    return [...new Set([...this.state.inputs, ...usedInputs(this.state, this.context)])];
  }

  get dirty(): boolean {
    return this.key() !== this.savedAt;
  }

  markSaved(): void {
    this.savedAt = this.key();
  }

  private change(edit: (state: BuilderState) => void): void {
    const before = structuredClone(this.state);
    edit(this.state);
    this.state.inputs = this.inputs;
    if (JSON.stringify(before) === JSON.stringify(this.state)) return;
    this.undoStack.push(before);
    this.redoStack = [];
    this.onChange();
  }

  /** An input dragged in: a formula, a collection, or collection.field. */
  addInput(input: string): void {
    this.change((state) => {
      if (!state.inputs.includes(input)) state.inputs.push(input);
    });
  }

  /** An input taken out, with what uses it. */
  removeInput(input: string): void {
    this.change((state) => {
      state.inputs = state.inputs.filter((each) => each !== input);
      const uses = (operand?: Operand) => operand !== undefined && 'input' in operand && operand.input === input;
      for (const key of ['left', 'right', 'then', 'otherwise'] as const) if (uses(state[key])) delete state[key];
      if (state.source === input || (state.source !== undefined && input === state.source.split('.')[0])) {
        delete state.source;
        delete state.range;
      }
      if (state.range && `${state.source?.split('.')[0]}.${state.range.field}` === input) delete state.range;
    });
    // What the code still uses stays an input.
  }

  setOperation(operation: Operation): void {
    this.change((state) => {
      const wasAggregate = AGGREGATES.includes(state.operation as Aggregate);
      state.operation = operation;
      if (!AGGREGATES.includes(operation as Aggregate)) {
        delete state.source;
        delete state.range;
      } else if (!wasAggregate) {
        for (const key of ['left', 'right', 'then', 'otherwise', 'compare'] as const) delete state[key];
      }
      if (operation !== 'if') for (const key of ['then', 'otherwise', 'compare'] as const) delete state[key];
    });
  }

  /** The field an aggregate reduces, `collection.field`; another collection drops the range. */
  setSource(source: string): void {
    this.change((state) => {
      if (state.range && state.source?.split('.')[0] !== source.split('.')[0]) delete state.range;
      state.source = source;
    });
  }

  setRange(range: { field: string; from: string; to: string } | undefined): void {
    this.change((state) => {
      if (range === undefined) delete state.range;
      else state.range = { ...range };
    });
  }

  setOperand(place: 'left' | 'right' | 'then' | 'otherwise', operand: Operand | undefined): void {
    this.change((state) => {
      if (operand === undefined) delete state[place];
      else state[place] = { ...operand };
    });
  }

  setCompare(compare: Comparison): void {
    this.change((state) => (state.compare = compare));
  }

  undo(): boolean {
    const before = this.undoStack.pop();
    if (!before) return false;
    this.redoStack.push(this.state);
    this.state = before;
    this.onChange();
    return true;
  }

  redo(): boolean {
    const after = this.redoStack.pop();
    if (!after) return false;
    this.undoStack.push(this.state);
    this.state = after;
    this.onChange();
    return true;
  }
}

/** A field of a collection, for the lists of the panel. */
export interface PanelCollection {
  id: string;
  fields: Array<{ name: string; type: string; title?: string; formula?: string }>;
  /** The distinct values of each field, as written, the first 200: for the range. */
  values: Record<string, string[]>;
}

/** What the builder opens on, from the main process. */
export interface FormulaSource {
  file: string;
  id: string;
  /** The formulas of the file, for the menu when it has several. */
  ids: string[];
  inputs: string[];
  /** The code as written; null when the object has no python block. */
  code: string | null;
  /** The collection whose computed field the formula is, or null for a value. */
  column: string | null;
  collections: PanelCollection[];
  /** The other formulas with a value, which may be inputs. */
  formulas: Array<{ id: string; display?: string }>;
  /** The value with the display of §0.4, or the problems of the object. */
  display?: string;
  problems: string[];
}
