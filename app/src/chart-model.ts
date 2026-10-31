// The model of the chart panel (class 3), without DOM: the template, the collection, the
// field of each role, the filter and the description, with undo and redo. It accepts a
// field on a role with the rules of `chart-role-type`, so a place refuses a drop that the
// runtime would mark; the main process writes the state as the lines of the chart file.

export type ChartRole = 'x' | 'y' | 'series';
export const CHART_ROLES: readonly ChartRole[] = ['x', 'y', 'series'];
export const TEMPLATES = ['bar', 'line', 'point'] as const;

/** What the panel shows of a chart, and what the main process writes back. */
export interface ChartState {
  template: string;
  collection: string;
  x?: string;
  y?: string;
  series?: string;
  /** field → the values a record keeps, as written. */
  filter: Record<string, string[]>;
  description: string;
}

export interface ChartField {
  name: string;
  type: string;
  title?: string;
}

/** A collection of the document, for the menu: its fields, and the distinct values of each, for the filter. */
export interface ChartCollection {
  id: string;
  fields: ChartField[];
  values: Record<string, string[]>;
}

export interface ChartSource {
  file: string;
  state: ChartState;
  collections: ChartCollection[];
}

const isQuantity = (field: ChartField | undefined) => field !== undefined && (field.type === 'number' || field.type === 'integer');

export class ChartModel {
  state: ChartState;
  readonly collections: ChartCollection[];
  private undoStack: ChartState[] = [];
  private redoStack: ChartState[] = [];
  private savedAt: string;
  /** Called after every change. */
  onChange: () => void = () => undefined;

  constructor(source: ChartSource) {
    this.state = structuredClone(source.state);
    this.collections = source.collections;
    this.savedAt = JSON.stringify(this.state);
  }

  get collection(): ChartCollection | undefined {
    return this.collections.find((each) => each.id === this.state.collection);
  }

  field(name: string | undefined): ChartField | undefined {
    return name === undefined ? undefined : this.collection?.fields.find((field) => field.name === name);
  }

  get dirty(): boolean {
    return JSON.stringify(this.state) !== this.savedAt;
  }

  markSaved(state?: ChartState): void {
    if (state) this.state = structuredClone(state);
    this.savedAt = JSON.stringify(this.state);
  }

  /**
   * Whether a field may go on a role, as `chart-role-type` would have it: the quantity
   * (y, or x of a bar lying down) wants a number or an integer; a series, not a number.
   * A bar takes a field that is not a quantity on y only when x is, or may still be, the quantity.
   */
  accepts(role: ChartRole, name: string): boolean {
    const field = this.field(name);
    if (field === undefined) return false;
    if (role === 'series') return field.type !== 'number';
    if (role === 'x') return true;
    if (this.state.template !== 'bar') return isQuantity(field);
    const x = this.field(this.state.x);
    return isQuantity(field) || x === undefined || isQuantity(x);
  }

  private change(edit: (state: ChartState) => void): void {
    const before = structuredClone(this.state);
    edit(this.state);
    if (JSON.stringify(before) === JSON.stringify(this.state)) return;
    this.undoStack.push(before);
    this.redoStack = [];
    this.onChange();
  }

  /** A field put on a role; false, and nothing changes, if the role does not take it. */
  place(role: ChartRole, name: string): boolean {
    if (!this.accepts(role, name)) return false;
    this.change((state) => {
      // A field has one role: taken from the other, if it was there.
      for (const other of CHART_ROLES) if (other !== role && state[other] === name) delete state[other];
      state[role] = name;
    });
    return true;
  }

  clear(role: ChartRole): void {
    this.change((state) => delete state[role]);
  }

  setTemplate(template: string): void {
    this.change((state) => (state.template = template));
  }

  /** Another collection: the roles and the filter of the old one go. */
  setCollection(id: string): void {
    this.change((state) => {
      state.collection = id;
      for (const role of CHART_ROLES) delete state[role];
      state.filter = {};
    });
  }

  /** The values a field keeps; none takes the field out of the filter. */
  setFilter(name: string, values: string[]): void {
    this.change((state) => {
      if (values.length === 0) delete state.filter[name];
      else state.filter[name] = [...values];
    });
  }

  setDescription(text: string): void {
    this.change((state) => (state.description = text));
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
