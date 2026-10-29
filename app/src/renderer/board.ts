// The canvas: a card for each object placed on it, drawn by the renderer of the preview
// with the base stylesheet, in a plane moved and scaled with CSS transforms. A card is
// dragged to move it; a click opens its source in the card, a double click opens it
// alone in the page; a double click on the empty plane writes a new text there. Every
// change goes through the operations of the runtime: the canvas file is the state.
import { completionStatus } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { DocApp } from '../preload.js';
import type { CardView, ObjectSource } from '../session.js';
import { editorExtensions, filePosition } from './editor.js';

type At = { x: number; y: number };

export interface BoardHooks {
  openAlone: (id: string) => void;
  openArticle: (file: string) => void;
  /** The changes not saved are different: the page tells the main process. */
  dirty: () => void;
  /** The canvas changed: the navigator shows what is on it. */
  changed: () => void;
}

interface Editing {
  /** The object, or null for a new text not yet created. */
  id: string | null;
  element: HTMLElement;
  view: EditorView;
  source: ObjectSource;
  saved: string;
  at: At;
}

/** How far a pointer moves before a press becomes a drag. */
const DRAG = 4;
/** How long a click waits for a second one: a double click opens the object alone. */
const CLICK_MS = 250;
const NEW_TEXT = { width: 360, height: 240 };

export function createBoard(api: DocApp, hooks: BoardHooks) {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const viewport = $('viewport');
  const plane = $('plane');
  const band = $('band');
  let pan = { x: 40, y: 40 };
  let zoom = 1;
  let cards: CardView[] = [];
  const elements = new Map<string, HTMLElement>();
  const selected = new Set<string>();
  let editing: Editing | null = null;
  let sequence: string[] | null = null;
  let space = false;
  let clickTimer: ReturnType<typeof setTimeout> | undefined;
  /** The last click, to tell a double click: on a card, or on the empty plane (null). */
  let lastClick: { id: string | null; time: number } | null = null;
  const second = (id: string | null) => {
    const now = Date.now();
    const double = lastClick !== null && lastClick.id === id && now - lastClick.time < CLICK_MS;
    lastClick = double ? null : { id, time: now };
    return double;
  };
  let pushing: ReturnType<typeof setTimeout> | undefined;
  const fonts = new Set<string>();

  const transform = () => {
    plane.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
    $('zoom').textContent = `${Math.round(zoom * 100)}%`;
  };
  const toPlane = (clientX: number, clientY: number): At => {
    const box = viewport.getBoundingClientRect();
    return { x: (clientX - box.left - pan.x) / zoom, y: (clientY - box.top - pan.y) / zoom };
  };
  const zoomAt = (factor: number, clientX: number, clientY: number) => {
    const next = Math.min(4, Math.max(0.1, zoom * factor));
    const point = toPlane(clientX, clientY);
    const box = viewport.getBoundingClientRect();
    zoom = next;
    pan = { x: clientX - box.left - point.x * zoom, y: clientY - box.top - point.y * zoom };
    transform();
  };
  const cardOf = (id: string) => cards.find((card) => card.id === id);
  /** A message in the bar of the canvas, instead of a dialog that stops the page. */
  const notice = (text: string) => {
    $('notice').textContent = text;
  };

  /** The object as it will appear: the page of the preview, with its fonts in the document and the rest in a shadow root. */
  const draw = (element: HTMLElement, card: CardView) => {
    const body = element.querySelector<HTMLElement>('.card-body')!;
    const key = card.html ?? `-${card.title}`;
    if (body.dataset.key === key) return;
    body.dataset.key = key;
    const shadow = body.shadowRoot ?? body.attachShadow({ mode: 'open' });
    if (card.html === null) {
      shadow.innerHTML = '<style>:host { display: block; padding: 12px; font-style: italic; }</style>';
      shadow.append(card.id === null ? `${card.title}: nessun oggetto` : card.title);
      return;
    }
    const page = new DOMParser().parseFromString(card.html, 'text/html');
    let css = page.querySelector('style')?.textContent ?? '';
    // A font face holds only in the document, not in a shadow root.
    for (const face of css.match(/@font-face\s*\{[^}]*\}/g) ?? []) {
      if (!fonts.has(face)) {
        fonts.add(face);
        $('card-fonts').append(face);
      }
      css = css.replace(face, '');
    }
    shadow.innerHTML = `<style>${css}\n:host { display: block; padding: 12px; }</style>`;
    const article = page.querySelector('article');
    if (article) shadow.append(document.importNode(article, true));
  };

  const place = (element: HTMLElement, card: { x: number; y: number; width: number; height: number }) => {
    element.style.left = `${card.x}px`;
    element.style.top = `${card.y}px`;
    element.style.width = `${card.width}px`;
    element.style.height = `${card.height}px`;
  };

  const newCard = (key: string, kind: string, id: string): HTMLElement => {
    const element = document.createElement('div');
    element.className = 'card';
    element.dataset.node = key;
    const head = document.createElement('div');
    head.className = 'card-head';
    const kindLabel = document.createElement('span');
    kindLabel.className = 'kind';
    kindLabel.textContent = kind;
    const idLabel = document.createElement('span');
    idLabel.className = 'id';
    idLabel.textContent = id;
    head.append(kindLabel, idLabel);
    const body = document.createElement('div');
    body.className = 'card-body';
    const order = document.createElement('span');
    order.className = 'card-order';
    order.hidden = true;
    element.append(head, body, order);
    plane.append(element);
    return element;
  };

  /** The marks of the cards: chosen, and their number in the sequence. */
  const mark = () => {
    for (const [node, element] of elements) {
      const id = cards.find((card) => card.node === node)?.id ?? null;
      element.classList.toggle('selected', id !== null && selected.has(id));
      const position = id === null || sequence === null ? -1 : sequence.indexOf(id);
      const order = element.querySelector<HTMLElement>('.card-order')!;
      order.textContent = position < 0 ? '' : String(position + 1);
      order.hidden = position < 0;
    }
    ($('archive') as HTMLButtonElement).disabled = selected.size === 0;
    ($('sequence-start') as HTMLButtonElement).disabled = selected.size === 0;
  };

  async function refresh(): Promise<void> {
    const state = await api.canvas();
    cards = state.cards;
    const seen = new Set<string>();
    for (const card of cards) {
      seen.add(card.node);
      let element = elements.get(card.node);
      if (!element) {
        element = newCard(card.node, card.kind ?? '?', card.id ?? card.file);
        elements.set(card.node, element);
      }
      element.dataset.id = card.id ?? '';
      if (editing?.element === element) continue;
      place(element, card);
      draw(element, card);
    }
    for (const [node, element] of elements) {
      if (seen.has(node) || editing?.element === element) continue;
      element.remove();
      elements.delete(node);
    }
    for (const id of [...selected]) if (!cardOf(id)) selected.delete(id);
    if (sequence !== null) sequence = sequence.filter((id) => cardOf(id));
    $('empty').hidden = cards.length > 0 || editing !== null;
    mark();
    renderSequence();
  }

  // Editing a card: the source of the object in CodeMirror, with the services of the page.
  const pushEdit = (state: EditorState) => {
    if (editing === null || editing.id === null) return;
    const { file, before, after } = editing.source;
    clearTimeout(pushing);
    pushing = setTimeout(() => void api.edit(file, before + state.doc.toString() + after), 50);
  };

  function openEditor(element: HTMLElement, id: string | null, source: ObjectSource, at: At): void {
    element.classList.add('editing');
    const parent = document.createElement('div');
    parent.className = 'card-editor';
    element.append(parent);
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: source.text,
        extensions: editorExtensions(api, {
          file: () => (editing?.id === null ? null : editing?.source.file ?? null),
          around: () => ({ before: editing?.source.before ?? '', after: editing?.source.after ?? '' }),
          save: () => void saveEditing(),
          definition: (from) => void definition(from),
          gutter: false,
          changed: (update) => {
            if (!update.docChanged) return;
            hooks.dirty();
            pushEdit(update.state);
          },
        }),
      }),
    });
    // Escape leaves the card, unless the list of the completion is open.
    parent.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || completionStatus(view.state) === 'active') return;
      event.preventDefault();
      void finish();
    }, true);
    editing = { id, element, view, source, saved: source.text, at };
    view.focus();
    hooks.dirty();
  }

  async function definition(from: EditorView): Promise<void> {
    if (editing === null || editing.id === null) return;
    const { file, before, after } = editing.source;
    const target = await api.definition(file, before + from.state.doc.toString() + after, filePosition(from, before));
    if (target === null) return;
    const card = cards.find((c) => c.file === target && c.id !== null);
    if (card) hooks.openAlone(card.id!);
    else hooks.openArticle(target);
  }

  async function edit(id: string): Promise<void> {
    if (!(await finish())) return;
    const card = cardOf(id);
    const element = card && elements.get(card.node);
    if (!card || !element) return;
    openEditor(element, id, await api.objectSource(id), { x: card.x, y: card.y });
  }

  /** Saves the object through the formatter; the editor takes the text written. */
  async function saveEditing(): Promise<void> {
    if (editing === null || editing.id === null) return;
    const current = editing;
    const { file, before, after } = current.source;
    await api.save(file, before + current.view.state.doc.toString() + after);
    current.source = await api.objectSource(current.id!);
    current.saved = current.source.text;
    if (current.view.state.doc.toString() !== current.saved) current.view.dispatch({ changes: { from: 0, to: current.view.state.doc.length, insert: current.saved } });
    hooks.dirty();
  }

  /** Back to the view of the card: the changes saved, or the new text created; false if that failed. */
  let finishing: Promise<boolean> | null = null;
  function finish(): Promise<boolean> {
    finishing ??= leave().finally(() => (finishing = null));
    return finishing;
  }
  async function leave(): Promise<boolean> {
    if (editing === null) return true;
    const current = editing;
    const text = current.view.state.doc.toString();
    clearTimeout(pushing);
    if (current.id === null) {
      if (text.trim() !== '') {
        const done = await api.createText(current.at, text.trim());
        if (done.error) {
          notice(`Il testo non si può creare: ${done.error}`);
          current.view.focus();
          return false;
        }
        hooks.changed();
      }
      current.element.remove();
    } else if (text !== current.saved) {
      await saveEditing();
    }
    current.view.destroy();
    current.element.querySelector('.card-editor')?.remove();
    current.element.classList.remove('editing');
    editing = null;
    hooks.dirty();
    await refresh();
    return true;
  }

  /** A new text where the plane was double-clicked: created when its editor is left with something written. */
  async function newText(at: At): Promise<void> {
    if (!(await finish())) return;
    const element = newCard(`new-${Date.now()}`, 'text', 'nuovo testo');
    element.classList.add('new');
    place(element, { ...at, ...NEW_TEXT });
    $('empty').hidden = true;
    openEditor(element, null, { file: '', before: '', text: '', after: '' }, at);
  }

  async function archive(): Promise<void> {
    if (!(await finish())) return;
    for (const id of [...selected]) {
      const done = await api.archive(id);
      if (done.error) notice(`${id} non si può archiviare: ${done.error}`);
    }
    selected.clear();
    hooks.changed();
    await refresh();
  }

  // «Metti in sequenza»: the order proposed, from top to bottom then from left to right, corrected by hand, then compose.
  function renderSequence(): void {
    const panel = $('sequence');
    panel.hidden = sequence === null;
    if (sequence === null) return;
    const list = $('order');
    list.replaceChildren();
    sequence.forEach((id, index) => {
      const item = document.createElement('li');
      item.dataset.id = id;
      const label = document.createElement('span');
      label.textContent = cardOf(id)?.title || id;
      const up = document.createElement('button');
      up.textContent = '↑';
      up.title = 'Prima';
      up.disabled = index === 0;
      up.addEventListener('click', () => move(index, -1));
      const down = document.createElement('button');
      down.textContent = '↓';
      down.title = 'Dopo';
      down.disabled = index === sequence!.length - 1;
      down.addEventListener('click', () => move(index, 1));
      item.append(label, up, down);
      list.append(item);
    });
  }
  const move = (index: number, by: number) => {
    if (sequence === null) return;
    const [id] = sequence.splice(index, 1);
    sequence.splice(index + by, 0, id!);
    mark();
    renderSequence();
  };
  async function startSequence(): Promise<void> {
    if (!(await finish()) || selected.size === 0) return;
    sequence = await api.readingOrder([...selected]);
    mark();
    renderSequence();
    $('compose-title').focus();
  }
  async function compose(): Promise<void> {
    if (sequence === null) return;
    const input = $('compose-title') as HTMLInputElement;
    if (input.value.trim() === '') {
      input.focus();
      return;
    }
    const done = await api.compose(sequence, input.value);
    if (done.error) {
      notice(`L'article non si può creare: ${done.error}`);
      return;
    }
    sequence = null;
    selected.clear();
    input.value = '';
    mark();
    renderSequence();
    hooks.changed();
    hooks.openArticle(String(done.summary?.file));
  }

  // The gestures on the plane.
  let gesture:
    | { type: 'pan'; x: number; y: number; pan: At }
    | { type: 'band'; from: At; x: number; y: number; additive: boolean }
    | { type: 'card'; id: string; x: number; y: number; moved: boolean; shift: boolean; origins: Map<string, At> }
    | null = null;

  viewport.addEventListener('pointerdown', (event) => {
    const target = event.target as HTMLElement;
    // The panel of the sequence is over the plane, not part of it.
    if (target.closest('#sequence')) return;
    notice('');
    const element = target.closest<HTMLElement>('.card');
    if (element?.classList.contains('editing')) return;
    if (editing !== null) void finish();
    if (event.button === 1 || (event.button === 0 && space)) {
      gesture = { type: 'pan', x: event.clientX, y: event.clientY, pan: { ...pan } };
    } else if (event.button !== 0) {
      return;
    } else if (element && element.dataset.id) {
      const id = element.dataset.id;
      const moving = selected.has(id) ? [...selected] : [id];
      const origins = new Map(moving.flatMap((each) => {
        const card = cardOf(each);
        return card ? [[each, { x: card.x, y: card.y }] as [string, At]] : [];
      }));
      gesture = { type: 'card', id, x: event.clientX, y: event.clientY, moved: false, shift: event.shiftKey, origins };
    } else if (!element) {
      gesture = { type: 'band', from: toPlane(event.clientX, event.clientY), x: event.clientX, y: event.clientY, additive: event.shiftKey };
      if (!event.shiftKey) selected.clear();
      mark();
    } else return;
    viewport.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  viewport.addEventListener('pointermove', (event) => {
    if (gesture === null) return;
    if (gesture.type === 'pan') {
      pan = { x: gesture.pan.x + event.clientX - gesture.x, y: gesture.pan.y + event.clientY - gesture.y };
      transform();
    } else if (gesture.type === 'card') {
      const dx = (event.clientX - gesture.x) / zoom;
      const dy = (event.clientY - gesture.y) / zoom;
      if (!gesture.moved && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < DRAG) return;
      gesture.moved = true;
      for (const [id, origin] of gesture.origins) {
        const element = elements.get(cardOf(id)!.node)!;
        element.style.left = `${origin.x + dx}px`;
        element.style.top = `${origin.y + dy}px`;
        element.classList.add('dragging');
      }
    } else {
      const to = toPlane(event.clientX, event.clientY);
      const left = Math.min(gesture.from.x, to.x);
      const top = Math.min(gesture.from.y, to.y);
      band.hidden = false;
      Object.assign(band.style, { left: `${left}px`, top: `${top}px`, width: `${Math.abs(to.x - gesture.from.x)}px`, height: `${Math.abs(to.y - gesture.from.y)}px` });
    }
  });

  viewport.addEventListener('pointerup', (event) => {
    const done = gesture;
    gesture = null;
    if (done === null) return;
    if (done.type === 'card') {
      if (done.moved) {
        const dx = (event.clientX - done.x) / zoom;
        const dy = (event.clientY - done.y) / zoom;
        void (async () => {
          for (const [id, origin] of done.origins) {
            const result = await api.place(id, { x: Math.round(origin.x + dx), y: Math.round(origin.y + dy) });
            if (result.error) notice(`${id} non si può spostare: ${result.error}`);
          }
          for (const element of elements.values()) element.classList.remove('dragging');
          await refresh();
        })();
      } else if (done.shift) {
        if (selected.has(done.id)) selected.delete(done.id);
        else selected.add(done.id);
        mark();
      } else if (second(done.id)) {
        // A double click: the object alone, in the page.
        clearTimeout(clickTimer);
        selected.clear();
        mark();
        hooks.openAlone(done.id);
      } else {
        // A click opens the source in the card, unless a second click makes it a double click.
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          selected.clear();
          selected.add(done.id);
          mark();
          void edit(done.id);
        }, CLICK_MS);
      }
    } else if (done.type === 'band') {
      band.hidden = true;
      const to = toPlane(event.clientX, event.clientY);
      const box = { left: Math.min(done.from.x, to.x), top: Math.min(done.from.y, to.y), right: Math.max(done.from.x, to.x), bottom: Math.max(done.from.y, to.y) };
      if (box.right - box.left < DRAG / zoom && box.bottom - box.top < DRAG / zoom) {
        // A double click on the empty plane: a new text there.
        if (second(null)) void newText(done.from);
        return;
      }
      for (const card of cards) {
        if (card.id === null) continue;
        if (card.x < box.right && card.x + card.width > box.left && card.y < box.bottom && card.y + card.height > box.top) selected.add(card.id);
      }
      mark();
    }
  });

  viewport.addEventListener('wheel', (event) => {
    if ((event.target as HTMLElement).closest('.card.editing')) return;
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) zoomAt(Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY);
    else {
      pan = { x: pan.x - event.deltaX, y: pan.y - event.deltaY };
      transform();
    }
  }, { passive: false });

  // From the navigator: an object dropped on the plane is recalled there, or moved there.
  viewport.addEventListener('dragover', (event) => {
    if (event.dataTransfer?.types.includes('application/x-doc-id')) event.preventDefault();
  });
  viewport.addEventListener('drop', async (event) => {
    const id = event.dataTransfer?.getData('application/x-doc-id');
    if (!id) return;
    event.preventDefault();
    if (!(await finish())) return;
    const at = toPlane(event.clientX, event.clientY);
    const point = { x: Math.round(at.x), y: Math.round(at.y) };
    const done = cardOf(id) ? await api.place(id, point) : await api.recall(id, point);
    if (done.error) notice(`${id} non va sul foglio: ${done.error}`);
    hooks.changed();
    await refresh();
  });

  const onBoard = () => document.body.dataset.view === 'canvas';
  const typing = (event: KeyboardEvent) => editing !== null || (event.target as HTMLElement).closest('input, textarea, .cm-editor') !== null;
  addEventListener('keydown', (event) => {
    if (!onBoard()) return;
    if (event.key === ' ' && !typing(event)) space = true;
    if (typing(event)) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selected.size > 0) void archive();
    } else if (event.key === 'Escape') {
      sequence = null;
      selected.clear();
      mark();
      renderSequence();
    } else if ((event.metaKey || event.ctrlKey) && (event.key === '=' || event.key === '+' || event.key === '-' || event.key === '0')) {
      event.preventDefault();
      const box = viewport.getBoundingClientRect();
      if (event.key === '0') {
        zoom = 1;
        transform();
      } else zoomAt(event.key === '-' ? 1 / 1.2 : 1.2, box.left + box.width / 2, box.top + box.height / 2);
    }
  });
  addEventListener('keyup', (event) => {
    if (event.key === ' ') space = false;
  });

  $('archive').addEventListener('click', () => void archive());
  $('sequence-start').addEventListener('click', () => void startSequence());
  $('compose').addEventListener('click', () => void compose());
  $('compose-title').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') void compose();
  });
  $('sequence-cancel').addEventListener('click', () => {
    sequence = null;
    mark();
    renderSequence();
  });
  transform();
  mark();

  return {
    refresh,
    finish,
    /** The file of the card being edited, if it has changes not saved. */
    dirtyFile: (): string | null =>
      editing !== null && editing.id !== null && editing.view.state.doc.toString() !== editing.saved ? editing.source.file : null,
  };
}
