// The chart panel (class 3): a chart as a panel instead of text. The icons of the three
// base templates, the menu of the collections, the places of the roles with their field,
// the fields of the collection to drag onto them (or to choose with a click, then a click
// on the place), the filter by values, the description. The places that do not take a
// field go dim while it is dragged, as `chart-role-type` would mark them; the errors of
// the chart show on the place that causes them. The model is chart-model.ts; the main
// process writes the lines of the file, through the formatter.
import { CHART_ROLES, ChartModel, TEMPLATES, type ChartRole } from '../chart-model.js';
import type { DocApp } from '../preload.js';
import { decorate } from './icons.js';

export interface ChartPanelHooks {
  /** The panel changed, or was saved: the page tells the main process whether it has changes not saved. */
  changed: () => void;
}

const TEMPLATE_ICONS: Record<string, [string, string]> = { bar: ['chart-column', 'Barre'], line: ['chart-line', 'Linee'], point: ['chart-scatter', 'Punti'] };
const ROLE_NAMES: Record<ChartRole, string> = { x: 'Asse x', y: 'Asse y', series: 'Serie' };

export function createChartPanel(api: DocApp, root: HTMLElement, hooks: ChartPanelHooks) {
  let model: ChartModel | null = null;
  let file: string | null = null;
  /** The field chosen with a click, waiting for a place: the keyboard way of a drag. */
  let chosen: string | null = null;
  let pushing: ReturnType<typeof setTimeout> | undefined;
  let typing: ReturnType<typeof setTimeout> | undefined;
  let filterField = '';

  root.innerHTML = `
    <div class="chart-bar" role="toolbar" aria-label="Grafico">
      <span class="grid-group" role="radiogroup" aria-label="Template">${TEMPLATES.map((template) => `<button data-template="${template}" data-icon="${TEMPLATE_ICONS[template]![0]}" aria-label="${TEMPLATE_ICONS[template]![1]}" role="radio">${TEMPLATE_ICONS[template]![1]}</button>`).join('')}</span>
      <span class="grid-group"><span class="grid-label">Collection</span><select class="chart-collection" aria-label="Collection del grafico"></select></span>
      <span class="grid-group"><button data-do="undo" data-icon="undo-2" aria-label="Annulla" title="Annulla (Cmd-Z)">↶</button><button data-do="redo" data-icon="redo-2" aria-label="Ripeti" title="Ripeti (Cmd-Maiusc-Z)">↷</button></span>
      <span class="chart-status" role="status"></span>
    </div>
    <div class="chart-body">
      <div class="chart-places">${CHART_ROLES.map((role) => `<div class="chart-place" data-role="${role}" tabindex="0" role="button" aria-label="${ROLE_NAMES[role]}"><span class="chart-role">${ROLE_NAMES[role]}</span><span class="chart-chip"></span><button class="chart-clear" data-icon="x" aria-label="Svuota ${ROLE_NAMES[role]}">×</button><span class="chart-error"></span></div>`).join('')}
        <div class="chart-filter"><span class="chart-role">Filtro</span><select class="chart-filter-field" aria-label="Campo del filtro"></select><div class="chart-values" role="group" aria-label="Valori tenuti"></div></div>
        <label class="chart-description"><span class="chart-role">Descrizione</span><textarea rows="3"></textarea></label>
      </div>
      <div class="chart-fields" role="listbox" aria-label="Campi della collection"></div>
    </div>`;
  decorate(root);
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const places = [...root.querySelectorAll<HTMLElement>('.chart-place')];
  const placeOf = (role: ChartRole) => places.find((place) => place.dataset.role === role)!;

  function draw(): void {
    if (model === null) return;
    const { state } = model;
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-template]')) button.setAttribute('aria-checked', String(button.dataset.template === state.template));
    const select = $<HTMLSelectElement>('.chart-collection');
    select.replaceChildren(...model.collections.map((collection) => new Option(collection.id, collection.id)));
    if (!model.collections.some((each) => each.id === state.collection)) select.append(new Option(state.collection || '—', state.collection));
    select.value = state.collection;
    for (const role of CHART_ROLES) {
      const place = placeOf(role);
      const field = model.field(state[role]);
      const chip = place.querySelector<HTMLElement>('.chart-chip')!;
      chip.replaceChildren();
      if (state[role] !== undefined) {
        const name = document.createElement('span');
        name.textContent = state[role]!;
        const type = document.createElement('span');
        type.className = 'chart-type';
        type.textContent = field?.type ?? '?';
        chip.append(name, type);
      } else chip.textContent = 'trascina qui un campo';
      chip.classList.toggle('empty', state[role] === undefined);
      place.querySelector<HTMLButtonElement>('.chart-clear')!.hidden = state[role] === undefined;
    }
    const fields = $('.chart-fields');
    fields.replaceChildren(...(model.collection?.fields ?? []).map((field) => {
      const item = document.createElement('button');
      item.className = 'chart-field';
      item.draggable = true;
      item.dataset.field = field.name;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(chosen === field.name));
      item.innerHTML = `<span></span><span class="chart-type"></span>`;
      item.firstElementChild!.textContent = typeof field.title === 'string' && field.title !== '' ? `${field.title} (${field.name})` : field.name;
      item.lastElementChild!.textContent = field.type;
      return item;
    }));
    // The filter: a field, and its distinct values to tick.
    const filterSelect = $<HTMLSelectElement>('.chart-filter-field');
    const names = model.collection?.fields.map((field) => field.name) ?? [];
    if (!names.includes(filterField)) filterField = Object.keys(state.filter)[0] ?? '';
    filterSelect.replaceChildren(new Option('—', ''), ...names.map((name) => new Option(`${name}${state.filter[name] ? ` (${state.filter[name]!.length})` : ''}`, name)));
    filterSelect.value = filterField;
    const values = $('.chart-values');
    values.replaceChildren(...(filterField === '' ? [] : (model.collection?.values[filterField] ?? []).map((value) => {
      const label = document.createElement('label');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.value = value;
      box.checked = state.filter[filterField]?.includes(value) ?? false;
      label.append(box, ` ${value}`);
      return label;
    })));
    const description = $<HTMLTextAreaElement>('.chart-description textarea');
    if (document.activeElement !== description) description.value = state.description;
  }

  /** The diagnostics of the chart, on the place that causes them; the others in the status. */
  async function showProblems(): Promise<void> {
    if (file === null) return;
    const target = file;
    const list = (await api.diagnostics(target)) as Array<{ severity: string; code: string; target?: string; fix?: string; message: string }>;
    if (target !== file) return;
    const general: string[] = [];
    for (const place of places) {
      place.querySelector('.chart-error')!.textContent = '';
      place.removeAttribute('aria-invalid');
      place.classList.remove('warning');
    }
    for (const diagnostic of list) {
      const roles = CHART_ROLES.filter((role) => diagnostic.target?.startsWith(`${role}: `) || (diagnostic.code === 'chart-role-missing' && diagnostic.target?.split(', ').includes(role)));
      if (roles.length === 0) {
        general.push(diagnostic.message);
        continue;
      }
      for (const role of roles) {
        const place = placeOf(role);
        // On the place, the suggestion says enough: «scegli per y un field number o integer».
        place.querySelector('.chart-error')!.textContent = diagnostic.fix ?? diagnostic.message;
        if (diagnostic.severity === 'error') place.setAttribute('aria-invalid', 'true');
        else place.classList.add('warning');
      }
    }
    $('.chart-status').textContent = general.join(' · ');
  }

  function changed(): void {
    if (model === null) return;
    draw();
    hooks.changed();
    // The buffer for the tree and the preview, while the chart is made.
    clearTimeout(pushing);
    const target = file!;
    pushing = setTimeout(() => {
      if (model && file === target) void api.chartEdit(target, model.state);
    }, 120);
  }

  const put = (role: ChartRole, name: string) => {
    if (model === null) return;
    if (!model.place(role, name)) $('.chart-status').textContent = `${ROLE_NAMES[role]} non prende ${name}: ${role === 'series' ? 'una serie vuole categorie, non un number' : 'qui va un number o un integer'}`;
    chosen = null;
  };

  // Dragging a field: the places that do not take it go dim and refuse it.
  root.addEventListener('dragstart', (event) => {
    const field = (event.target as HTMLElement).closest<HTMLElement>('.chart-field');
    if (!field || model === null) return;
    event.dataTransfer?.setData('application/x-doc-field', field.dataset.field!);
    event.dataTransfer?.setData('text/plain', field.dataset.field!);
    for (const place of places) place.classList.add(model.accepts(place.dataset.role as ChartRole, field.dataset.field!) ? 'accepts' : 'refuses');
  });
  root.addEventListener('dragend', () => {
    for (const place of places) place.classList.remove('accepts', 'refuses', 'over');
  });
  for (const place of places) {
    place.addEventListener('dragover', (event) => {
      if (place.classList.contains('refuses')) return;
      event.preventDefault();
      place.classList.add('over');
    });
    place.addEventListener('dragleave', () => place.classList.remove('over'));
    place.addEventListener('drop', (event) => {
      event.preventDefault();
      const name = event.dataTransfer?.getData('application/x-doc-field') || event.dataTransfer?.getData('text/plain');
      for (const each of places) each.classList.remove('accepts', 'refuses', 'over');
      if (name) put(place.dataset.role as ChartRole, name);
    });
    // The keyboard way: a field chosen, then the place.
    const choose = () => {
      if (chosen !== null) put(place.dataset.role as ChartRole, chosen);
    };
    place.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('.chart-clear')) return;
      choose();
    });
    place.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        choose();
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && model) model.clear(place.dataset.role as ChartRole);
    });
    place.querySelector('.chart-clear')!.addEventListener('click', () => model?.clear(place.dataset.role as ChartRole));
  }
  root.addEventListener('click', (event) => {
    const field = (event.target as HTMLElement).closest<HTMLElement>('.chart-field');
    if (field) {
      chosen = chosen === field.dataset.field ? null : field.dataset.field!;
      draw();
      $('.chart-status').textContent = chosen === null ? '' : `Scegli il posto per ${chosen}`;
      return;
    }
    const template = (event.target as HTMLElement).closest<HTMLElement>('[data-template]');
    if (template) model?.setTemplate(template.dataset.template!);
    const act = (event.target as HTMLElement).closest<HTMLElement>('[data-do]')?.dataset.do;
    if (act === 'undo') model?.undo();
    if (act === 'redo') model?.redo();
  });
  root.addEventListener('keydown', (event) => {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod || model === null || (event.target as HTMLElement).closest('textarea')) return;
    const key = event.key.toLowerCase();
    if (key === 'z') event.shiftKey ? model.redo() : model.undo();
    else if (key === 'y') model.redo();
    else if (key === 's') void save();
    else return;
    event.preventDefault();
  });
  $<HTMLSelectElement>('.chart-collection').addEventListener('change', (event) => model?.setCollection((event.target as HTMLSelectElement).value));
  $<HTMLSelectElement>('.chart-filter-field').addEventListener('change', (event) => {
    filterField = (event.target as HTMLSelectElement).value;
    draw();
  });
  $('.chart-values').addEventListener('change', () => {
    const checked = [...root.querySelectorAll<HTMLInputElement>('.chart-values input:checked')].map((box) => box.value);
    if (filterField !== '') model?.setFilter(filterField, checked);
  });
  $<HTMLTextAreaElement>('.chart-description textarea').addEventListener('input', (event) => {
    clearTimeout(typing);
    const text = (event.target as HTMLTextAreaElement).value;
    typing = setTimeout(() => model?.setDescription(text), 400);
  });

  async function save(): Promise<void> {
    if (model === null || file === null) return;
    clearTimeout(pushing);
    await api.chartSave(file, model.state);
    model.markSaved();
    hooks.changed();
  }

  return {
    /** Opens the panel of a chart file; false when it does not read as a chart. */
    async open(target: string): Promise<boolean> {
      const source = await api.chartSource(target);
      if (source === null) return false;
      model = new ChartModel(source);
      model.onChange = () => changed();
      file = target;
      chosen = null;
      filterField = Object.keys(source.state.filter)[0] ?? '';
      draw();
      void showProblems();
      return true;
    },
    close(): void {
      clearTimeout(pushing);
      model = null;
      file = null;
    },
    isDirty: () => model?.dirty ?? false,
    save,
    focus: () => root.querySelector<HTMLElement>(`[data-template][aria-checked="true"]`)?.focus(),
    /** After a recomputation: the errors on their places. */
    refresh: () => void showProblems(),
  };
}

