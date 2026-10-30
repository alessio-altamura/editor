// The canvas: a card for each object placed on it, drawn by the renderer of the preview
// with the base stylesheet, in a plane moved and scaled with CSS transforms. A card is
// dragged to move it; a click opens its source in the card, a double click opens it
// alone in the page; a double click on the empty plane writes a new text there. Every
// change goes through the operations of the runtime: the canvas file is the state.
import { completionStatus } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { DocApp } from '../preload.js';
import type { CanvasGroup } from 'doc-runtime/dist/src/canvas.js';
import type { CardView, ObjectSource } from '../session.js';
import { editorExtensions, filePosition } from './editor.js';
import { setIcon } from './icons.js';

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
  /** For a new text made with «+»: the card it is next to. */
  near?: string;
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
  const groupElements = new Map<string, HTMLElement>();
  /** The text of each card, for the search: id, title and what it shows. */
  const texts = new Map<string, string>();
  /** The search: the cards found, and the one shown. */
  let found: string[] = [];
  let current = 0;
  /** The cards chosen, by the id of their node: an object may have several cards. */
  const selected = new Set<string>();
  let editing: Editing | null = null;
  /** The order of «Metti in sequenza», by node. */
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
  const cardOf = (node: string) => cards.find((card) => card.node === node);
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
      texts.set(card.node, `${card.id ?? ''} ${card.title}`.toLowerCase());
      shadow.innerHTML = '<style>:host { display: block; padding: 12px; font-style: italic; }</style>';
      shadow.append(card.id === null ? `${card.title}: nessun oggetto` : card.title);
      return;
    }
    const page = new DOMParser().parseFromString(card.html, 'text/html');
    texts.set(card.node, `${card.id ?? ''} ${card.title} ${page.querySelector('article')?.textContent ?? ''}`.toLowerCase());
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
    // The commands of a card: a new thought next to it, and the objects tied to it.
    const plus = document.createElement('button');
    plus.className = 'card-plus';
    plus.title = 'Nuovo pensiero vicino';
    setIcon(plus, 'plus', 'Nuovo pensiero vicino');
    plus.addEventListener('click', () => void newText(null, key));
    const gather = document.createElement('button');
    gather.className = 'card-gather';
    gather.title = 'Raccogli vicino gli oggetti legati';
    setIcon(gather, 'group', 'Raccogli vicino gli oggetti legati');
    gather.addEventListener('click', () => void gatherAround(key));
    head.append(kindLabel, idLabel, gather, plus);
    const body = document.createElement('div');
    body.className = 'card-body';
    const order = document.createElement('span');
    order.className = 'card-order';
    order.hidden = true;
    const resize = document.createElement('span');
    resize.className = 'card-resize';
    resize.title = 'Ingrandisci';
    element.append(head, body, order, resize);
    plane.append(element);
    return element;
  };

  /** The marks of the cards: chosen, and their number in the sequence. */
  const mark = () => {
    for (const [node, element] of elements) {
      element.classList.toggle('selected', selected.has(node));
      const position = sequence === null ? -1 : sequence.indexOf(node);
      const order = element.querySelector<HTMLElement>('.card-order')!;
      order.textContent = position < 0 ? '' : String(position + 1);
      order.hidden = position < 0;
    }
    ($('archive') as HTMLButtonElement).disabled = selected.size === 0;
    ($('sequence-start') as HTMLButtonElement).disabled = selected.size === 0;
  };

  /** The groups of the canvas, under the cards: a frame with its label. */
  const drawGroups = (groups: CanvasGroup[]) => {
    const seen = new Set<string>();
    for (const group of groups) {
      seen.add(group.node);
      let element = groupElements.get(group.node);
      if (!element) {
        element = document.createElement('div');
        element.className = 'group';
        element.dataset.node = group.node;
        const label = document.createElement('span');
        label.className = 'group-label';
        element.append(label);
        plane.prepend(element);
        groupElements.set(group.node, element);
      }
      element.querySelector('.group-label')!.textContent = group.label;
      element.dataset.label = group.label;
      element.classList.toggle('arranged', group.arrange !== undefined);
      place(element, group);
    }
    for (const [node, element] of groupElements) {
      if (seen.has(node)) continue;
      element.remove();
      groupElements.delete(node);
    }
  };

  async function refresh(): Promise<void> {
    const state = await api.canvas();
    cards = state.cards;
    drawGroups(state.groups);
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
    for (const node of [...selected]) if (!cardOf(node)) selected.delete(node);
    if (sequence !== null) sequence = sequence.filter((node) => cardOf(node));
    $('empty').hidden = cards.length > 0 || editing !== null;
    mark();
    renderSequence();
    if (($('find') as HTMLInputElement).value !== '') search(false);
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

  async function edit(node: string): Promise<void> {
    if (!(await finish())) return;
    const card = cardOf(node);
    const element = elements.get(node);
    if (!card || card.id === null || !element) return;
    openEditor(element, card.id, await api.objectSource(card.id), { x: card.x, y: card.y });
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
      const near = current.near === undefined ? undefined : cardOf(current.near);
      if (text.trim() !== '') {
        const done = near?.id ? await api.createNear(near.id, near.node, text.trim()) : await api.createText(current.at, text.trim());
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

  /**
   * A new text where the plane was double-clicked, or next to a card with «+» (to the
   * right or below, where there is more room): created when its editor is left with
   * something written, and the others make room.
   */
  async function newText(point: At | null, near?: string): Promise<void> {
    if (!(await finish())) return;
    const at = point ?? (near === undefined ? null : await api.besidePlace(near));
    if (at === null) return;
    const element = newCard(`new-${Date.now()}`, 'text', 'nuovo testo');
    element.classList.add('new');
    place(element, { ...at, ...NEW_TEXT });
    $('empty').hidden = true;
    openEditor(element, null, { file: '', before: '', text: '', after: '' }, at);
    if (near !== undefined && editing !== null) editing.near = near;
  }

  /** «Raccogli»: the objects tied to a card come around it. */
  async function gatherAround(node: string): Promise<void> {
    const id = cardOf(node)?.id;
    if (!id || !(await finish())) return;
    const done = await api.gather(id, node);
    if (done.error) notice(`${id}: ${done.error}`);
    else if (((done.summary?.gathered as unknown[]) ?? []).length === 0) notice(`${id} non ha oggetti legati`);
    hooks.changed();
    await refresh();
  }

  /** «Metti in ordine»: a group for each kind or tag. */
  async function arrange(by: 'kind' | 'tag'): Promise<void> {
    if (!(await finish())) return;
    const done = await api.arrange(by);
    if (done.error) notice(done.error);
    await refresh();
  }

  /** The search: the cards whose id, title or text has the words, from the top; the view goes to one and marks it. */
  function search(move: boolean): void {
    const query = ($('find') as HTMLInputElement).value.trim().toLowerCase();
    const previous = found[current];
    found = query === '' ? [] : [...cards].sort((a, b) => a.y - b.y || a.x - b.x).filter((card) => (texts.get(card.node) ?? '').includes(query)).map((card) => card.node);
    current = Math.max(0, previous === undefined ? 0 : found.indexOf(previous));
    show(move);
  }
  function show(move: boolean): void {
    for (const [node, element] of elements) {
      element.classList.toggle('found', found.includes(node));
      element.classList.toggle('found-current', found[current] === node);
    }
    $('find-count').textContent = ($('find') as HTMLInputElement).value.trim() === '' ? '' : found.length === 0 ? 'nessuna' : `${current + 1}/${found.length}`;
    const card = found.length > 0 ? cardOf(found[current]!) : undefined;
    if (!move || !card) return;
    // The card in the middle of the view, at the zoom of now.
    const box = viewport.getBoundingClientRect();
    pan = { x: box.width / 2 - (card.x + card.width / 2) * zoom, y: box.height / 2 - (card.y + card.height / 2) * zoom };
    transform();
  }
  const step = (by: number) => {
    if (found.length === 0) return;
    current = (current + by + found.length) % found.length;
    show(true);
  };

  async function archive(): Promise<void> {
    if (!(await finish())) return;
    // Only the cards chosen: the object stays on the canvas while it has another.
    for (const node of [...selected]) {
      const id = cardOf(node)?.id;
      if (!id) continue;
      const done = await api.archive(id, node);
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
    sequence.forEach((node, index) => {
      const item = document.createElement('li');
      item.dataset.node = node;
      item.dataset.id = cardOf(node)?.id ?? '';
      const label = document.createElement('span');
      label.textContent = cardOf(node)?.title || node;
      const up = document.createElement('button');
      setIcon(up, 'arrow-up', 'Prima');
      up.disabled = index === 0;
      up.addEventListener('click', () => move(index, -1));
      const down = document.createElement('button');
      setIcon(down, 'arrow-down', 'Dopo');
      down.disabled = index === sequence!.length - 1;
      down.addEventListener('click', () => move(index, 1));
      item.append(label, up, down);
      list.append(item);
    });
  }
  const move = (index: number, by: number) => {
    if (sequence === null) return;
    const [node] = sequence.splice(index, 1);
    sequence.splice(index + by, 0, node!);
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
    // Two cards of the same object are two embeds.
    const done = await api.compose(sequence.flatMap((node) => cardOf(node)?.id ?? []), input.value);
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
    | { type: 'card'; node: string; x: number; y: number; moved: boolean; shift: boolean; origins: Map<string, At> }
    | { type: 'resize'; node: string; x: number; y: number; width: number; height: number }
    | null = null;

  viewport.addEventListener('pointerdown', (event) => {
    const target = event.target as HTMLElement;
    // The panel of the sequence is over the plane, not part of it.
    if (target.closest('#sequence')) return;
    notice('');
    const element = target.closest<HTMLElement>('.card');
    if (element?.classList.contains('editing')) return;
    // The buttons of a card answer to their click.
    if (target.closest('.card-plus, .card-gather')) return;
    if (editing !== null) void finish();
    if (event.button === 1 || (event.button === 0 && space)) {
      gesture = { type: 'pan', x: event.clientX, y: event.clientY, pan: { ...pan } };
    } else if (event.button !== 0) {
      return;
    } else if (element && element.dataset.id && element.dataset.node && target.closest('.card-resize')) {
      const card = cardOf(element.dataset.node);
      if (!card) return;
      gesture = { type: 'resize', node: card.node, x: event.clientX, y: event.clientY, width: card.width, height: card.height };
    } else if (element && element.dataset.id && element.dataset.node) {
      const node = element.dataset.node;
      const moving = selected.has(node) ? [...selected] : [node];
      const origins = new Map(moving.flatMap((each) => {
        const card = cardOf(each);
        return card ? [[each, { x: card.x, y: card.y }] as [string, At]] : [];
      }));
      gesture = { type: 'card', node, x: event.clientX, y: event.clientY, moved: false, shift: event.shiftKey, origins };
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
    } else if (gesture.type === 'resize') {
      const element = elements.get(gesture.node)!;
      element.style.width = `${Math.max(120, gesture.width + (event.clientX - gesture.x) / zoom)}px`;
      element.style.height = `${Math.max(80, gesture.height + (event.clientY - gesture.y) / zoom)}px`;
    } else if (gesture.type === 'card') {
      const dx = (event.clientX - gesture.x) / zoom;
      const dy = (event.clientY - gesture.y) / zoom;
      if (!gesture.moved && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < DRAG) return;
      gesture.moved = true;
      for (const [node, origin] of gesture.origins) {
        const element = elements.get(node)!;
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
    if (done.type === 'resize') {
      // A card enlarged: the others make room.
      const size = {
        width: Math.round(Math.max(120, done.width + (event.clientX - done.x) / zoom)),
        height: Math.round(Math.max(80, done.height + (event.clientY - done.y) / zoom)),
      };
      const id = cardOf(done.node)?.id;
      if (id && (size.width !== done.width || size.height !== done.height)) {
        void api.place(id, undefined, done.node, size).then(async (result) => {
          if (result.error) notice(`${id}: ${result.error}`);
          await refresh();
        });
      }
    } else if (done.type === 'card') {
      if (done.moved) {
        const dx = (event.clientX - done.x) / zoom;
        const dy = (event.clientY - done.y) / zoom;
        void (async () => {
          for (const [node, origin] of done.origins) {
            const id = cardOf(node)?.id;
            if (!id) continue;
            const result = await api.place(id, { x: Math.round(origin.x + dx), y: Math.round(origin.y + dy) }, node);
            if (result.error) notice(`${id} non si può spostare: ${result.error}`);
          }
          for (const element of elements.values()) element.classList.remove('dragging');
          await refresh();
        })();
      } else if (done.shift) {
        if (selected.has(done.node)) selected.delete(done.node);
        else selected.add(done.node);
        mark();
      } else if (second(done.node)) {
        // A double click: the object alone, in the page.
        clearTimeout(clickTimer);
        selected.clear();
        mark();
        const id = cardOf(done.node)?.id;
        if (id) hooks.openAlone(id);
      } else {
        // A click opens the source in the card, unless a second click makes it a double click.
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          selected.clear();
          selected.add(done.node);
          mark();
          void edit(done.node);
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
        if (card.x < box.right && card.x + card.width > box.left && card.y < box.bottom && card.y + card.height > box.top) selected.add(card.node);
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

  // From the navigator: an object dropped on the plane gets a card there, even if it has others.
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
    const done = await api.recall(id, point);
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
  $('arrange-kind').addEventListener('click', () => void arrange('kind'));
  $('arrange-tag').addEventListener('click', () => void arrange('tag'));
  $('find').addEventListener('input', () => search(true));
  $('find').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') step(event.shiftKey ? -1 : 1);
    if (event.key === 'Escape') {
      ($('find') as HTMLInputElement).value = '';
      search(false);
    }
  });
  $('find-next').addEventListener('click', () => step(1));
  $('find-previous').addEventListener('click', () => step(-1));
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
