// The formula builder (class 4): a formula as a panel instead of text, as the chart panel.
// The inputs, where fields and formulas are dragged (from the list of the panel, the
// heading of the grid, the navigator), or added with a click; the menu of the operations;
// the field of an aggregate and its range; the operands; the code it writes, read only;
// the value, with the display of §0.4, or the problems. The model is formula-model.ts;
// the main process writes the code and the inputs, through the formatter. Code written by
// hand that the builder does not read opens as text: it is never rewritten.
import { AGGREGATES, COMPARISONS, FormulaModel, OPERATION_NAMES, parse, type Aggregate, type FormulaSource, type Operand, type Operation } from '../formula-model.js';
import type { DocApp } from '../preload.js';
import { decorate } from './icons.js';

export interface FormulaPanelHooks {
  /** The panel changed, or was saved: the page tells the main process whether it has changes not saved. */
  changed: () => void;
}

const OPERATIONS = Object.keys(OPERATION_NAMES) as Operation[];
const isAggregate = (operation: Operation) => AGGREGATES.includes(operation as Aggregate);
const escape = (text: string) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function createFormulaPanel(api: DocApp, root: HTMLElement, hooks: FormulaPanelHooks) {
  let model: FormulaModel | null = null;
  let source: FormulaSource | null = null;
  let file: string | null = null;
  let pushing: ReturnType<typeof setTimeout> | undefined;

  root.innerHTML = `
    <div class="chart-bar" role="toolbar" aria-label="Formula">
      <span class="grid-group"><span class="grid-label">Formula</span><select class="formula-object" aria-label="Formula del file"></select></span>
      <span class="grid-group"><button data-do="undo" data-icon="undo-2" aria-label="Annulla" title="Annulla (Cmd-Z)">↶</button><button data-do="redo" data-icon="redo-2" aria-label="Ripeti" title="Ripeti (Cmd-Maiusc-Z)">↷</button></span>
      <span class="chart-status formula-status" role="status"></span>
    </div>
    <div class="chart-body">
      <div class="chart-places formula-main">
        <div class="chart-place formula-inputs" tabindex="0" role="group" aria-label="Ingressi"><span class="chart-role">Ingressi</span><span class="formula-chips"></span></div>
        <label class="chart-place"><span class="chart-role">Operazione</span><select class="formula-operation" aria-label="Operazione">${OPERATIONS.map((operation) => `<option value="${operation}">${escape(OPERATION_NAMES[operation])}</option>`).join('')}</select></label>
        <div class="formula-args"></div>
        <div class="chart-place"><span class="chart-role">Codice</span><pre class="formula-code" aria-label="Codice generato" tabindex="0"></pre></div>
        <div class="chart-place"><span class="chart-role">Valore</span><output class="formula-value" aria-live="polite"></output></div>
      </div>
      <div class="chart-fields formula-palette" role="listbox" aria-label="Campi e formule da usare"></div>
    </div>`;
  decorate(root);
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;

  /** The operands a place may take: the formulas and, in a computed field, the fields of the record. */
  function scalarInputs(): string[] {
    if (model === null) return [];
    const column = model.context.column;
    return model.inputs.filter((input) => {
      const [id, field] = input.split('.');
      return field === undefined ? (source?.formulas.some((formula) => formula.id === id) ?? false) : id === column;
    });
  }

  function operandControl(place: 'left' | 'right' | 'then' | 'otherwise', label: string): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'formula-operand';
    const select = document.createElement('select');
    select.setAttribute('aria-label', label);
    select.dataset.place = place;
    const operand = model!.state[place];
    select.append(new Option('—', ''), ...scalarInputs().map((input) => new Option(input, `input:${input}`)), new Option('un numero', 'number'));
    select.value = operand === undefined ? '' : 'input' in operand ? `input:${operand.input}` : 'number';
    const number = document.createElement('input');
    number.className = 'formula-number';
    number.inputMode = 'decimal';
    number.setAttribute('aria-label', `${label}, numero`);
    number.dataset.place = place;
    number.hidden = select.value !== 'number';
    if (operand !== undefined && 'number' in operand) number.value = operand.number;
    wrap.append(select, number);
    return wrap;
  }

  function args(): HTMLElement[] {
    const state = model!.state;
    const row = (label: string, ...children: HTMLElement[]) => {
      const place = document.createElement('div');
      place.className = 'chart-place';
      const role = document.createElement('span');
      role.className = 'chart-role';
      role.textContent = label;
      place.append(role, ...children);
      return place;
    };
    if (isAggregate(state.operation)) {
      const field = document.createElement('select');
      field.className = 'formula-source';
      field.setAttribute('aria-label', 'Campo');
      const options = (source?.collections ?? []).flatMap((collection) => collection.fields.map((each) => `${collection.id}.${each.name}`));
      field.append(new Option('—', ''), ...options.map((option) => new Option(option, option)));
      field.value = state.source ?? '';
      const out = [row('Campo', field)];
      if (state.source !== undefined) {
        const collection = source?.collections.find((each) => each.id === state.source!.split('.')[0]);
        const rangeField = document.createElement('select');
        rangeField.className = 'formula-range-field';
        rangeField.setAttribute('aria-label', 'Range: campo');
        rangeField.append(new Option('tutti i record', ''), ...(collection?.fields ?? []).filter((each) => each.formula === undefined).map((each) => new Option(each.name, each.name)));
        rangeField.value = state.range?.field ?? '';
        const parts: HTMLElement[] = [rangeField];
        if (state.range) {
          for (const end of ['from', 'to'] as const) {
            const select = document.createElement('select');
            select.className = `formula-range-${end}`;
            select.setAttribute('aria-label', end === 'from' ? 'Range: da' : 'Range: a');
            const values = collection?.values[state.range.field] ?? [];
            select.append(...[...new Set([...values, state.range[end]])].map((value) => new Option(value, value)));
            select.value = state.range[end];
            const word = document.createElement('span');
            word.className = 'grid-label';
            word.textContent = end === 'from' ? 'da' : 'a';
            parts.push(word, select);
          }
        }
        out.push(row('Range', ...parts));
      }
      return out;
    }
    if (state.operation === 'if') {
      const compare = document.createElement('select');
      compare.className = 'formula-compare';
      compare.setAttribute('aria-label', 'Confronto');
      compare.append(...COMPARISONS.map((each) => new Option(each, each)));
      compare.value = state.compare ?? '>';
      return [row('Se', operandControl('left', 'Se, a sinistra'), compare, operandControl('right', 'Se, a destra')), row('Allora', operandControl('then', 'Allora')), row('Altrimenti', operandControl('otherwise', 'Altrimenti'))];
    }
    if (state.operation === 'empty') return [];
    return [row('Primo', operandControl('left', 'Primo operando')), row('Secondo', operandControl('right', 'Secondo operando'))];
  }

  function draw(): void {
    if (model === null || source === null) return;
    const objects = $<HTMLSelectElement>('.formula-object');
    objects.replaceChildren(...source.ids.map((id) => new Option(id, id)));
    objects.value = source.id;
    objects.closest('.grid-group')!.toggleAttribute('hidden', source.ids.length < 2);
    const chips = $('.formula-chips');
    chips.replaceChildren(...(model.inputs.length === 0 ? [Object.assign(document.createElement('span'), { className: 'chart-chip empty', textContent: 'trascina qui un campo o una formula' })] : model.inputs.map((input) => {
      const chip = document.createElement('span');
      chip.className = 'chart-chip';
      chip.textContent = input;
      const remove = document.createElement('button');
      remove.className = 'chart-clear';
      remove.dataset.remove = input;
      remove.setAttribute('aria-label', `Togli ${input}`);
      remove.dataset.icon = 'x';
      remove.textContent = '×';
      chip.append(remove);
      return chip;
    })));
    $<HTMLSelectElement>('.formula-operation').value = model.state.operation;
    $('.formula-args').replaceChildren(...args());
    $('.formula-code').textContent = model.code ?? '…';
    // The palette: the fields of each collection, the collections, the other formulas.
    const item = (kind: 'field' | 'id', value: string, label: string, detail: string) => {
      const button = document.createElement('button');
      button.className = 'chart-field';
      button.draggable = true;
      button.dataset[kind] = value;
      button.setAttribute('role', 'option');
      button.innerHTML = '<span></span><span class="chart-type"></span>';
      button.firstElementChild!.textContent = label;
      button.lastElementChild!.textContent = detail;
      return button;
    };
    $('.formula-palette').replaceChildren(
      ...source.collections.flatMap((collection) => [item('id', collection.id, collection.id, 'collection'), ...collection.fields.map((field) => item('field', `${collection.id}.${field.name}`, `${collection.id}.${field.name}`, field.formula ? 'ƒ' : field.type))]),
      ...source.formulas.map((formula) => item('id', formula.id, formula.id, formula.display ?? 'formula')),
    );
    decorate(root);
    showValue();
  }

  function showValue(): void {
    if (source === null) return;
    const output = $('.formula-value');
    const dirty = model?.dirty ?? false;
    output.classList.toggle('error', source.problems.length > 0);
    output.textContent = source.problems.length > 0 ? source.problems.join(' · ') : source.display ?? (source.column !== null ? `colonna di ${source.column}` : dirty ? 'si calcola…' : 'nessun valore');
  }

  function changed(): void {
    if (model === null) return;
    draw();
    hooks.changed();
    clearTimeout(pushing);
    const target = file!;
    const id = source!.id;
    pushing = setTimeout(() => {
      if (model && file === target && model.code !== null) void api.formulaEdit(target, id, model.inputs, model.code);
    }, 150);
  }

  const operandOf = (place: string): Operand | undefined => {
    const select = root.querySelector<HTMLSelectElement>(`select[data-place="${place}"]`)!;
    if (select.value === '') return undefined;
    if (select.value.startsWith('input:')) return { input: select.value.slice(6) };
    return { number: root.querySelector<HTMLInputElement>(`input[data-place="${place}"]`)!.value.trim().replace(',', '.') };
  };

  root.addEventListener('change', (event) => {
    const target = event.target as HTMLElement;
    if (model === null) return;
    if (target.matches('.formula-object')) void open(file!, (target as HTMLSelectElement).value);
    else if (target.matches('.formula-operation')) model.setOperation((target as HTMLSelectElement).value as Operation);
    else if (target.matches('.formula-source')) {
      const value = (target as HTMLSelectElement).value;
      if (value !== '') model.setSource(value);
    } else if (target.matches('.formula-range-field')) {
      const field = (target as HTMLSelectElement).value;
      const collection = source?.collections.find((each) => each.id === model!.state.source?.split('.')[0]);
      const values = collection?.values[field] ?? [];
      model.setRange(field === '' ? undefined : { field, from: values[0] ?? '', to: values[values.length - 1] ?? '' });
    } else if (target.matches('.formula-range-from, .formula-range-to') && model.state.range) {
      const end = target.matches('.formula-range-from') ? 'from' : 'to';
      model.setRange({ ...model.state.range, [end]: (target as HTMLSelectElement).value });
    } else if (target.matches('.formula-compare')) model.setCompare((target as HTMLSelectElement).value as (typeof COMPARISONS)[number]);
    else if (target.matches('select[data-place]')) {
      const place = target.dataset.place as 'left' | 'right' | 'then' | 'otherwise';
      const number = root.querySelector<HTMLInputElement>(`input[data-place="${place}"]`)!;
      number.hidden = (target as HTMLSelectElement).value !== 'number';
      if ((target as HTMLSelectElement).value === 'number') {
        number.focus();
        if (number.value.trim() === '') return;
      }
      model.setOperand(place, operandOf(place));
    } else if (target.matches('input[data-place]')) model.setOperand(target.dataset.place as 'left', operandOf(target.dataset.place!));
  });

  // Fields and formulas into the inputs: dragged, or with a click in the palette.
  const dropped = (data: DataTransfer | null) => data?.getData('application/x-doc-field') || data?.getData('application/x-doc-id') || '';
  const inputs = $('.formula-inputs');
  inputs.addEventListener('dragover', (event) => {
    event.preventDefault();
    inputs.classList.add('over');
  });
  inputs.addEventListener('dragleave', () => inputs.classList.remove('over'));
  inputs.addEventListener('drop', (event) => {
    event.preventDefault();
    inputs.classList.remove('over');
    const value = dropped(event.dataTransfer);
    if (value && model) model.addInput(value);
  });
  root.addEventListener('dragstart', (event) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>('.chart-field');
    if (!item) return;
    if (item.dataset.field) event.dataTransfer?.setData('application/x-doc-field', item.dataset.field);
    if (item.dataset.id) event.dataTransfer?.setData('application/x-doc-id', item.dataset.id);
    event.dataTransfer?.setData('text/plain', item.dataset.field ?? item.dataset.id ?? '');
  });
  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const item = target.closest<HTMLElement>('.chart-field');
    if (item && model) model.addInput(item.dataset.field ?? item.dataset.id!);
    const remove = target.closest<HTMLElement>('[data-remove]');
    if (remove && model) model.removeInput(remove.dataset.remove!);
    const act = target.closest<HTMLElement>('[data-do]')?.dataset.do;
    if (act === 'undo') model?.undo();
    if (act === 'redo') model?.redo();
  });
  root.addEventListener('keydown', (event) => {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod || model === null || (event.target as HTMLElement).closest('input')) return;
    const key = event.key.toLowerCase();
    if (key === 'z') event.shiftKey ? model.redo() : model.undo();
    else if (key === 'y') model.redo();
    else if (key === 's') void save();
    else return;
    event.preventDefault();
  });

  async function save(): Promise<void> {
    if (model === null || file === null || source === null || model.code === null) return;
    clearTimeout(pushing);
    await api.formulaSave(file, source.id, model.inputs, model.code);
    model.markSaved();
    hooks.changed();
  }

  /**
   * Opens the builder on an object of a formula file: 'builder' when it reads the code,
   * 'handwritten' for code it does not understand, null when the file has no formula.
   */
  async function open(target: string, id?: string): Promise<'builder' | 'handwritten' | null> {
    const next = await api.formulaSource(target, id);
    if (next === null) return null;
    const context = { column: next.column };
    const state = next.code === null ? null : parse(next.code, next.inputs, context);
    if (state === null) return 'handwritten';
    if (model?.dirty && file === target) await save();
    source = next;
    file = target;
    model = new FormulaModel(state, context);
    model.onChange = () => changed();
    draw();
    return 'builder';
  }

  return {
    open,
    close(): void {
      clearTimeout(pushing);
      model = null;
      source = null;
      file = null;
    },
    isDirty: () => model?.dirty ?? false,
    save,
    focus: () => $<HTMLSelectElement>('.formula-operation').focus(),
    /** After a recomputation: the value, or the problems. */
    async refresh(): Promise<void> {
      if (file === null || source === null) return;
      const next = await api.formulaSource(file, source.id);
      if (next === null || source === null || next.id !== source.id) return;
      source = { ...source, problems: next.problems, formulas: next.formulas, collections: next.collections, ...(next.display !== undefined ? { display: next.display } : {}) };
      if (next.display === undefined) delete source.display;
      showValue();
    },
  };
}
