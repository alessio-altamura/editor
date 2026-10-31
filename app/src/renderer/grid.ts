// The grid of a collection: the records of its data file as a table to edit, without
// coordinates (no column letters, no row numbers); the heading shows the title, or the
// name, and the type. Only the visible rows are drawn, so it stays fluid up to the limit
// of 100 000 records. The keys are those of a spreadsheet; the model (grid-model.ts)
// keeps the values as written in the file, with undo and redo.
import { TYPE_WORDS } from 'doc-runtime/dist/src/collection.js';
import { GridModel } from '../grid-model.js';
import { decorate } from './icons.js';
import type { DocApp } from '../preload.js';

const ROW = 28;
/** Rows drawn above and below the visible ones. */
const MARGIN = 8;
const TYPES = ['string', 'number', 'integer', 'boolean', 'date', 'datetime', 'time', 'year', 'yearmonth'];

export interface GridHooks {
  /** The grid changed, or was saved: the page tells the main process whether it has changes not saved. */
  changed: () => void;
}

type Cell = { row: number; column: number };

export function createGrid(api: DocApp, root: HTMLElement, hooks: GridHooks) {
  let model: GridModel | null = null;
  let file: string | null = null;
  let active: Cell = { row: 0, column: 0 };
  let anchor: Cell = { row: 0, column: 0 };
  let editing: { cell: Cell; input: HTMLInputElement | HTMLSelectElement } | null = null;
  let pushing: ReturnType<typeof setTimeout> | undefined;
  let painting = 0;

  root.replaceChildren();
  root.innerHTML = `
    <div class="grid-bar" role="toolbar" aria-label="Record e campi">
      <span class="grid-group"><span class="grid-label">Record</span><button data-do="append" data-icon="plus" aria-label="Aggiungi in fondo">+ in fondo</button><button data-do="insert" data-icon="list-plus" aria-label="Aggiungi dopo quello scelto">+ dopo</button><button data-do="remove" data-icon="trash-2" aria-label="Togli il record scelto">− togli</button><button data-do="up" data-icon="arrow-up" aria-label="Sposta su">↑</button><button data-do="down" data-icon="arrow-down" aria-label="Sposta giù">↓</button></span>
      <span class="grid-group"><span class="grid-label">Campo</span><input class="field-title" aria-label="Titolo del campo scelto"><select class="field-type" aria-label="Tipo del campo scelto">${TYPES.map((type) => `<option>${type}</option>`).join('')}</select><button data-do="remove-field" data-icon="trash-2" aria-label="Togli il campo scelto">− togli</button></span>
      <span class="grid-group"><span class="grid-label">Nuovo campo</span><input class="new-title" placeholder="Titolo" aria-label="Titolo del campo nuovo"><select class="new-type" aria-label="Tipo del campo nuovo">${TYPES.map((type) => `<option>${type}</option>`).join('')}</select><button data-do="add-field" data-icon="plus" aria-label="Aggiungi il campo">+ campo</button></span>
      <span class="grid-group"><button data-do="undo" data-icon="undo-2" aria-label="Annulla" title="Annulla (Cmd-Z)">↶</button><button data-do="redo" data-icon="redo-2" aria-label="Ripeti" title="Ripeti (Cmd-Maiusc-Z)">↷</button></span>
      <span class="grid-status" role="status"></span>
    </div>
    <div class="grid-scroll"><div class="grid-table" role="grid" tabindex="0" aria-multiselectable="true"><div class="grid-head" role="row" aria-rowindex="1"></div><div class="grid-space"></div></div></div>`;
  decorate(root);
  const scroll = root.querySelector<HTMLElement>('.grid-scroll')!;
  const table = root.querySelector<HTMLElement>('.grid-table')!;
  const head = root.querySelector<HTMLElement>('.grid-head')!;
  const space = root.querySelector<HTMLElement>('.grid-space')!;
  const status = root.querySelector<HTMLElement>('.grid-status')!;
  const fieldTitle = root.querySelector<HTMLInputElement>('.field-title')!;
  const fieldType = root.querySelector<HTMLSelectElement>('.field-type')!;

  const columns = () => model?.columns.length ?? 0;
  const rows = () => model?.records.length ?? 0;
  const selection = () => ({
    top: Math.min(active.row, anchor.row),
    bottom: Math.max(active.row, anchor.row),
    left: Math.min(active.column, anchor.column),
    right: Math.max(active.column, anchor.column),
  });
  const template = () => model!.columns.map((_, column) => (model!.type(column) === 'boolean' ? '90px' : '160px')).join(' ');

  function drawHead(): void {
    head.replaceChildren();
    head.style.gridTemplateColumns = template();
    model!.columns.forEach((_, column) => {
      const cell = document.createElement('div');
      cell.setAttribute('role', 'columnheader');
      cell.setAttribute('aria-colindex', String(column + 1));
      cell.className = 'grid-heading';
      const title = document.createElement('span');
      title.textContent = model!.heading(column);
      const type = document.createElement('span');
      type.className = 'grid-type';
      type.textContent = model!.type(column);
      cell.append(title, type);
      cell.addEventListener('mousedown', () => {
        active = { row: active.row, column };
        anchor = { row: 0, column };
        active = { row: Math.max(rows() - 1, 0), column };
        paint();
      });
      head.append(cell);
    });
    table.setAttribute('aria-colcount', String(columns()));
  }

  /** Draws the visible rows; the others are only the height of the space. */
  function paint(): void {
    if (model === null) return;
    const start = performance.now();
    table.setAttribute('aria-rowcount', String(rows() + 1));
    space.style.height = `${rows() * ROW}px`;
    space.style.width = `${model.columns.length * 160}px`;
    const first = Math.max(0, Math.floor(scroll.scrollTop / ROW) - MARGIN);
    // Never more rows than the window holds, whatever the height the layout gives.
    const last = Math.min(rows() - 1, Math.ceil((scroll.scrollTop + Math.min(scroll.clientHeight, innerHeight)) / ROW) + MARGIN);
    const { top, bottom, left, right } = selection();
    const fragment = document.createDocumentFragment();
    for (let row = first; row <= last; row++) {
      const line = document.createElement('div');
      line.className = 'grid-row';
      line.setAttribute('role', 'row');
      line.setAttribute('aria-rowindex', String(row + 2));
      line.style.top = `${row * ROW}px`;
      line.style.gridTemplateColumns = template();
      for (let column = 0; column < model.columns.length; column++) {
        const cell = document.createElement('div');
        cell.id = `grid-cell-${row}-${column}`;
        cell.className = 'grid-cell';
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-colindex', String(column + 1));
        cell.dataset.row = String(row);
        cell.dataset.column = String(column);
        const field = model.field(column);
        const state = model.state(row, column);
        if (field && (field.type === 'number' || field.type === 'integer')) cell.classList.add('numeric');
        if (state === 'invalid') {
          // A value not of its type: kept as typed, marked, and said to screen readers.
          cell.setAttribute('aria-invalid', 'true');
          cell.title = field?.categories ? `Non è fra le categorie: usa uno di ${field.categories.join(', ')}` : `Non è ${TYPE_WORDS[field?.type ?? ''] ?? 'del suo tipo'}`;
        }
        if (field?.type === 'boolean' && state !== 'invalid') {
          const box = document.createElement('input');
          box.type = 'checkbox';
          box.tabIndex = -1;
          box.checked = state === 'valid' && field.trueValues.includes(model.records[row]![column]!);
          box.setAttribute('aria-label', model.heading(column));
          box.addEventListener('mousedown', (event) => event.stopPropagation());
          box.addEventListener('change', () => {
            active = anchor = { row, column };
            toggle();
          });
          cell.append(box);
        } else cell.textContent = model.display(row, column);
        const selected = row >= top && row <= bottom && column >= left && column <= right;
        cell.setAttribute('aria-selected', String(selected));
        if (selected) cell.classList.add('selected');
        if (row === active.row && column === active.column) cell.classList.add('active');
        line.append(cell);
      }
      fragment.append(line);
    }
    space.replaceChildren(fragment);
    if (editing) space.append(editing.input);
    if (rows() > 0) table.setAttribute('aria-activedescendant', `grid-cell-${active.row}-${active.column}`);
    else table.removeAttribute('aria-activedescendant');
    painting = performance.now() - start;
    status.textContent = `${rows()} record`;
    const field = model.columns[active.column]?.field;
    fieldTitle.disabled = fieldType.disabled = !field;
    if (document.activeElement !== fieldTitle) fieldTitle.value = typeof field?.title === 'string' ? field.title : model.columns[active.column]?.name ?? '';
    fieldType.value = model.type(active.column);
  }

  /** The active cell inside the view, scrolling as little as possible. */
  function reveal(): void {
    const top = active.row * ROW;
    const headHeight = head.offsetHeight;
    if (top < scroll.scrollTop) scroll.scrollTop = top;
    else if (top + ROW > scroll.scrollTop + scroll.clientHeight - headHeight) scroll.scrollTop = top + ROW - scroll.clientHeight + headHeight;
    const left = active.column * 160;
    if (left < scroll.scrollLeft) scroll.scrollLeft = left;
    else if (left + 160 > scroll.scrollLeft + scroll.clientWidth) scroll.scrollLeft = left + 160 - scroll.clientWidth;
  }

  function move(row: number, column: number, extend = false): void {
    if (model === null) return;
    active = { row: Math.max(0, Math.min(rows() - 1, row)), column: Math.max(0, Math.min(columns() - 1, column)) };
    if (!extend) anchor = { ...active };
    reveal();
    paint();
  }

  // Editing a cell: the value in the language of the document; Enter or Tab writes it, Esc leaves it.
  function edit(initial?: string): void {
    if (model === null || rows() === 0 || editing) return;
    const field = model.field(active.column);
    if (field?.type === 'boolean') return toggle();
    const cell = { ...active };
    let input: HTMLInputElement | HTMLSelectElement;
    if (field?.categories) {
      // A field with categories: a menu with them.
      const select = document.createElement('select');
      const current = model.records[cell.row]![cell.column]!;
      for (const value of ['', ...field.categories, ...(current !== '' && !field.categories.includes(current) ? [current] : [])]) {
        const option = document.createElement('option');
        option.value = option.textContent = value;
        select.append(option);
      }
      select.value = current;
      select.addEventListener('change', () => commit(0, 1));
      input = select;
    } else {
      const text = document.createElement('input');
      text.value = initial ?? model.editText(cell.row, cell.column);
      input = text;
    }
    input.className = 'grid-editor';
    input.setAttribute('aria-label', `${model.heading(cell.column)}, record ${cell.row + 1}`);
    input.style.top = `${cell.row * ROW}px`;
    input.style.left = `${cell.column * 160}px`;
    input.addEventListener('keydown', (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === 'Enter') commit((event as KeyboardEvent).shiftKey ? -1 : 1, 0);
      else if (key === 'Tab') commit(0, (event as KeyboardEvent).shiftKey ? -1 : 1);
      else if (key === 'Escape') cancel();
      else return;
      event.preventDefault();
      event.stopPropagation();
    });
    input.addEventListener('blur', () => {
      if (editing?.input === input) commit(0, 0, false);
    });
    editing = { cell, input };
    space.append(input);
    input.focus();
    if (input instanceof HTMLInputElement && initial === undefined) input.select();
  }

  function commit(down: number, right: number, focus = true): void {
    if (!editing || model === null) return;
    const { cell, input } = editing;
    editing = null;
    input.remove();
    const value = input instanceof HTMLSelectElement ? input.value : model.fileValue(cell.column, input.value);
    if (value !== model.records[cell.row]![cell.column]) model.setCell(cell.row, cell.column, value);
    if (focus) {
      table.focus();
      move(cell.row + down, cell.column + right);
    }
  }

  function cancel(): void {
    if (!editing) return;
    editing.input.remove();
    editing = null;
    table.focus();
    paint();
  }

  /** A boolean: the first of trueValues or of falseValues. */
  function toggle(): void {
    const field = model?.field(active.column);
    if (!model || !field || field.type !== 'boolean') return;
    const now = model.records[active.row]![active.column]!;
    model.setCell(active.row, active.column, field.trueValues.includes(now) ? field.falseValues[0]! : field.trueValues[0]!);
  }

  table.addEventListener('keydown', (event) => {
    if (model === null || editing) return;
    const mod = event.metaKey || event.ctrlKey;
    const page = Math.max(1, Math.floor(scroll.clientHeight / ROW) - 1);
    const { key, shiftKey } = event;
    if (mod && key.toLowerCase() === 'z') shiftKey ? model.redo() : model.undo();
    else if (mod && key.toLowerCase() === 'y') model.redo();
    else if (mod && key.toLowerCase() === 's') void save();
    else if (key === 'ArrowUp') move(active.row - 1, active.column, shiftKey);
    else if (key === 'ArrowDown') move(active.row + 1, active.column, shiftKey);
    else if (key === 'ArrowLeft') move(active.row, active.column - 1, shiftKey);
    else if (key === 'ArrowRight') move(active.row, active.column + 1, shiftKey);
    else if (key === 'PageUp') move(active.row - page, active.column, shiftKey);
    else if (key === 'PageDown') move(active.row + page, active.column, shiftKey);
    else if (key === 'Home') move(mod ? 0 : active.row, 0, shiftKey);
    else if (key === 'End') move(mod ? rows() - 1 : active.row, columns() - 1, shiftKey);
    else if (key === 'Tab') move(active.row, active.column + (shiftKey ? -1 : 1));
    else if (key === 'Enter' || key === 'F2') edit();
    else if (key === ' ' && model.field(active.column)?.type === 'boolean') toggle();
    else if (key === 'Escape') move(active.row, active.column);
    else if (key === 'Delete' || key === 'Backspace') {
      const { top, bottom, left, right } = selection();
      model.clear(top, left, bottom, right);
    } else if (key.length === 1 && !mod && !event.altKey) edit(key);
    else return;
    event.preventDefault();
  });

  table.addEventListener('mousedown', (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('.grid-cell');
    if (!cell || model === null) return;
    if (editing) commit(0, 0, false);
    move(Number(cell.dataset.row), Number(cell.dataset.column), event.shiftKey);
    table.focus();
    event.preventDefault();
  });
  table.addEventListener('dblclick', (event) => {
    if ((event.target as HTMLElement).closest('.grid-cell')) edit();
  });

  // Copy and paste as a spreadsheet: text with tabs and lines.
  table.addEventListener('copy', (event) => {
    if (model === null || editing) return;
    const { top, bottom, left, right } = selection();
    event.clipboardData?.setData('text/plain', model.copy(top, left, bottom, right));
    event.preventDefault();
  });
  table.addEventListener('paste', (event) => {
    if (model === null || editing) return;
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (text === '') return;
    event.preventDefault();
    const { rows: height, columns: width } = model.paste(active.row, active.column, text);
    anchor = { ...active };
    active = { row: active.row + height - 1, column: Math.min(columns() - 1, active.column + width - 1) };
    paint();
  });

  scroll.addEventListener('scroll', () => requestAnimationFrame(paint));
  new ResizeObserver(() => paint()).observe(scroll);

  // The bar: records and fields.
  const act = (what: string) => {
    if (model === null) return;
    if (editing) commit(0, 0, false);
    switch (what) {
      case 'append': model.insertRecord(rows()); move(rows() - 1, active.column); break;
      case 'insert': model.insertRecord(Math.min(active.row + 1, rows())); move(active.row + 1, active.column); break;
      case 'remove': if (rows() > 0) { model.removeRecord(active.row); move(Math.min(active.row, rows() - 1), active.column); } break;
      case 'up': if (model.moveRecord(active.row, -1)) move(active.row - 1, active.column); break;
      case 'down': if (model.moveRecord(active.row, 1)) move(active.row + 1, active.column); break;
      case 'remove-field': if (model.columns[active.column]?.field) { model.removeField(active.column); move(active.row, Math.min(active.column, columns() - 1)); } break;
      case 'add-field': {
        const title = root.querySelector<HTMLInputElement>('.new-title')!;
        if (title.value.trim() === '') { title.focus(); return; }
        model.addField(title.value, root.querySelector<HTMLSelectElement>('.new-type')!.value);
        title.value = '';
        move(active.row, columns() - 1);
        break;
      }
      case 'undo': model.undo(); break;
      case 'redo': model.redo(); break;
    }
    table.focus();
  };
  root.querySelector('.grid-bar')!.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-do]');
    if (button) act(button.dataset.do!);
  });
  root.querySelector('.new-title')!.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key === 'Enter') act('add-field');
  });
  const setField = (key: 'title' | 'type', value: string) => {
    if (!model?.columns[active.column]?.field) return;
    const current = key === 'title' ? model.heading(active.column) : model.type(active.column);
    if (value !== current) model.setField(active.column, key, value);
  };
  fieldTitle.addEventListener('change', () => setField('title', fieldTitle.value));
  fieldType.addEventListener('change', () => setField('type', fieldType.value));

  function changed(): void {
    if (model === null) return;
    drawHead();
    paint();
    hooks.changed();
    // The buffer for the tree and the preview, a moment after the last change.
    clearTimeout(pushing);
    const target = file!;
    pushing = setTimeout(() => {
      if (model && file === target) void api.gridEdit(target, model.descriptorFields(), model.dataText());
    }, 200);
  }

  async function save(): Promise<void> {
    if (model === null || file === null) return;
    clearTimeout(pushing);
    await api.gridSave(file, model.descriptorFields(), model.dataText());
    model.markSaved();
    hooks.changed();
  }

  return {
    /** Opens the grid of a collection descriptor; false when it has no data to show as a grid. */
    async open(target: string): Promise<boolean> {
      const source = await api.gridSource(target);
      if (source === null) return false;
      const started = performance.now();
      model = new GridModel(source);
      model.onChange = () => changed();
      file = target;
      editing = null;
      active = anchor = { row: 0, column: 0 };
      table.setAttribute('aria-label', `Griglia di ${target}`);
      scroll.scrollTop = 0;
      drawHead();
      paint();
      root.dataset.openedIn = String(Math.round(performance.now() - started));
      return true;
    },
    close(): void {
      clearTimeout(pushing);
      model = null;
      file = null;
      editing = null;
      head.replaceChildren();
      space.replaceChildren();
    },
    /**
     * A record or a heading clicked in the preview: the line of the data file (0 the header)
     * and the column of the table, which follows the fields of the descriptor. A record is
     * chosen at the cell of its field; the heading chooses the whole column, as a click on
     * the heading of the grid does. False if the grid has no such field.
     */
    reveal(line: number, column: number): boolean {
      if (model === null) return false;
      const name = (model.descriptorFields()[column] as { name?: unknown } | undefined)?.name;
      const at = model.columns.findIndex((each) => each.name === name);
      if (at < 0) return false;
      // One record a line: the data file as the grid writes it, and as a TSV is.
      if (line <= 0) {
        anchor = { row: 0, column: at };
        active = { row: Math.max(rows() - 1, 0), column: at };
        scroll.scrollTop = 0;
        paint();
      } else move(line - 1, at);
      table.focus();
      return true;
    },
    isDirty: () => model?.dirty ?? false,
    save,
    focus: () => table.focus(),
    /** For the measures: how long the last paint took, in ms. */
    lastPaint: () => painting,
  };
}
