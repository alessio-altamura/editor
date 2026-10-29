// CodeMirror with the services of the language server, over IPC: the same for the page
// and for a card of the canvas. A card shows one object of a file: `before` is the text
// of the file before it, and the services see the whole file.
import { autocompletion, type CompletionContext } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { linter, lintGutter, type Diagnostic } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import type { EditorState, Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, hoverTooltip, keymap, lineNumbers, drawSelection, highlightActiveLine, type ViewUpdate } from '@codemirror/view';
import type { DocApp } from '../preload.js';

type Position = { line: number; character: number };

export interface EditorContext {
  /** The file shown; null when none is open. */
  file: () => string | null;
  /** The text of the file around the part shown: empty for a whole file. */
  around: () => { before: string; after: string };
  save: () => void;
  definition: (view: EditorView) => void;
  /** After every update of the editor. */
  changed: (update: ViewUpdate) => void;
  /** The codes of the diagnostics of the file, each time they come. */
  diagnosed?: (codes: string[]) => void;
  gutter: boolean;
}

export const position = (state: EditorState, offset: number): Position => {
  const line = state.doc.lineAt(offset);
  return { line: line.number - 1, character: offset - line.from };
};
export const offsetOf = (state: EditorState, line: number, character: number): number => {
  const target = state.doc.line(Math.min(Math.max(line + 1, 1), state.doc.lines));
  return Math.min(target.from + character, target.to);
};
const lines = (text: string) => text.split('\n').length - 1;

export function editorExtensions(api: DocApp, context: EditorContext): Extension[] {
  /** The whole file, and where the part shown starts in it. */
  const whole = (state: EditorState) => {
    const { before, after } = context.around();
    return { text: before + state.doc.toString() + after, offset: lines(before) };
  };
  const inFile = (state: EditorState, offset: number, shift: number): Position => {
    const at = position(state, offset);
    return { line: at.line + shift, character: at.character };
  };

  const diagnostics = linter(async (current): Promise<Diagnostic[]> => {
    const file = context.file();
    if (file === null) return [];
    const list = (await api.diagnostics(file)) as Array<{ range: { start: Position; end: Position }; severity: 'error' | 'warning'; message: string; code: string }>;
    context.diagnosed?.(list.map((d) => d.code));
    const shift = whole(current.state).offset;
    const last = current.state.doc.lines - 1;
    return list
      .filter((d) => d.range.end.line >= shift && d.range.start.line - shift <= last)
      .map((d) => {
        const from = offsetOf(current.state, Math.max(d.range.start.line - shift, 0), d.range.start.line < shift ? 0 : d.range.start.character);
        const to = Math.max(from, offsetOf(current.state, d.range.end.line - shift, d.range.end.character));
        return { from, to, severity: d.severity, message: d.message };
      });
  }, { delay: 0 });

  const complete = async (completion: CompletionContext) => {
    const file = context.file();
    if (file === null) return null;
    const before = completion.state.sliceDoc(completion.state.doc.lineAt(completion.pos).from, completion.pos);
    if (!/!?\[\[[^[\]|\n]*$/.test(before)) return null;
    const { text, offset } = whole(completion.state);
    const items = (await api.complete(file, text, inFile(completion.state, completion.pos, offset))) as Array<{ label: string; detail: string; documentation: string; newText: string; range: { start: { character: number } } }>;
    if (items.length === 0) return null;
    const line = completion.state.doc.lineAt(completion.pos);
    return {
      from: line.from + items[0]!.range.start.character,
      options: items.map((item) => ({ label: item.label, detail: item.detail, info: item.documentation, apply: item.newText })),
    };
  };

  const hover = hoverTooltip(async (current, offset) => {
    const file = context.file();
    if (file === null) return null;
    const { text, offset: shift } = whole(current.state);
    const answer = (await api.hover(file, text, inFile(current.state, offset, shift))) as { markdown: string } | null;
    if (answer === null) return null;
    return {
      pos: offset,
      create: () => {
        const dom = document.createElement('div');
        dom.style.padding = '4px 8px';
        dom.style.maxWidth = '420px';
        dom.style.whiteSpace = 'pre-wrap';
        dom.textContent = answer.markdown.replace(/\*\*|`/g, '');
        return { dom };
      },
    };
  });

  return [
    ...(context.gutter ? [lineNumbers()] : []),
    history(),
    drawSelection(),
    highlightActiveLine(),
    bracketMatching(),
    highlightSelectionMatches(),
    markdown(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    EditorView.lineWrapping,
    ...(matchMedia('(prefers-color-scheme: dark)').matches ? [oneDark] : []),
    diagnostics,
    ...(context.gutter ? [lintGutter()] : []),
    autocompletion({ override: [complete], activateOnTyping: true }),
    hover,
    keymap.of([
      { key: 'Mod-s', run: () => (context.save(), true) },
      { key: 'F12', run: (view) => (context.definition(view), true) },
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
    ]),
    EditorView.domEventHandlers({
      mousedown: (event, view) => {
        if (!(event.metaKey || event.ctrlKey)) return false;
        const offset = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (offset === null) return false;
        view.dispatch({ selection: { anchor: offset } });
        context.definition(view);
        return true;
      },
    }),
    EditorView.updateListener.of((update) => context.changed(update)),
  ];
}

/** The position in the whole file of the cursor of an editor that shows a part of it. */
export function filePosition(view: EditorView, before: string): Position {
  const at = position(view.state, view.state.selection.main.head);
  return { line: at.line + lines(before), character: at.character };
}
