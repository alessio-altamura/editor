// The services of the language server as plain functions over the resolved tree, so the
// language server and the app give the same answers: completion, hover, definition.
import type { JsonML, ResolvedTree, TreeNode } from './tree.js';

export interface Position {
  line: number;
  character: number;
}
export interface Range {
  start: Position;
  end: Position;
}

/** The kinds an `![[id]]` cannot include (§8): no point in proposing them there. */
export const NOT_EMBEDDABLE = new Set(['concept', 'scratch', 'article', 'deck', 'document', 'stylesheet', 'canvas-file']);
/** An id reference on a line: `[[id]]`, `[[id|text]]` or `![[id]]`. */
export const REFERENCE = /(!?)\[\[([^[\]|\n]*)(\|[^[\]\n]*)?\]\]/g;

/** The text of the first strings of a content, for details and hovers. */
/** Blocks are separated by a space; the pieces of a line join as they are written. */
const BLOCKS = new Set(['paragraph', 'heading', 'list', 'listItem', 'blockquote', 'code', 'table', 'tableRow', 'tableCell', 'thematicBreak', 'embed', 'title']);

export function firstWords(content: JsonML[] | undefined, words = 24): string {
  let text = '';
  const visit = (item: JsonML) => {
    if (typeof item === 'string') {
      text += item;
      return;
    }
    const block = BLOCKS.has(item[0]);
    if (block) text += ' ';
    for (const child of item.slice(1)) if (typeof child === 'string' || Array.isArray(child)) visit(child as JsonML);
    if (block) text += ' ';
  };
  (content ?? []).forEach(visit);
  const all = text.split(/\s+/).filter(Boolean);
  return all.slice(0, words).join(' ') + (all.length > words ? ' …' : '');
}

/** The title of a node, or its first words. */
export const describe = (node: TreeNode): string => {
  const title = node.attributes?.title;
  if (typeof title === 'string' && title !== '') return title;
  // A collection: its description, not the text of its table; without one, its id (class 2).
  if (node.kind === 'collection') return firstWords((node.content ?? []).filter((item) => !(Array.isArray(item) && item[0] === 'table'))) || (node.id ?? '');
  return firstWords(node.content);
};

const within = (range: Range, position: Position) =>
  (range.start.line < position.line || (range.start.line === position.line && range.start.character <= position.character)) &&
  (range.end.line > position.line || (range.end.line === position.line && range.end.character >= position.character));

/** The reference under a character of a line, with its id. */
export function referenceAt(line: string, character: number): { id: string; embed: boolean } | null {
  for (const match of line.matchAll(REFERENCE)) {
    if (match.index! <= character && character <= match.index! + match[0].length) return { id: match[2]!.trim(), embed: match[1] === '!' };
  }
  return null;
}

export interface Completion {
  label: string;
  detail: string;
  documentation: string;
  range: Range;
  newText: string;
}

/**
 * The ids to propose after `[[` or `![[`: `before` is the line up to the cursor,
 * `after` the two characters that follow it. After `![[` only what an embed can
 * include, and not the file itself.
 */
export function completions(tree: ResolvedTree, file: string | null, before: string, after: string, position: Position): Completion[] {
  const open = /(!?)\[\[([^[\]|\n]*)$/.exec(before);
  if (!open) return [];
  const embed = open[1] === '!';
  const range = { start: { line: position.line, character: position.character - open[2]!.length }, end: position };
  const seen = new Set<string>();
  const items: Completion[] = [];
  for (const node of tree.nodes ?? []) {
    if (node.id === undefined || seen.has(node.id)) continue;
    if (embed && (NOT_EMBEDDABLE.has(node.kind) || node.file === file)) continue;
    seen.add(node.id);
    items.push({ label: node.id, detail: node.kind, documentation: describe(node), range, newText: after === ']]' ? node.id : `${node.id}]]` });
  }
  return items;
}

/** The files of the objects with an id: where a definition goes. */
export function definitionOf(tree: ResolvedTree, id: string): string[] {
  return (tree.nodes ?? []).filter((node) => node.id === id).map((node) => node.file);
}

/** The hover at a position: kind and title of a reference, or the value of a math line, in Markdown. */
export function hoverAt(tree: ResolvedTree, file: string | null, line: string, position: Position): { markdown: string; range?: Range } | null {
  const reference = referenceAt(line, position.character);
  if (reference !== null) {
    const nodes = (tree.nodes ?? []).filter((node) => node.id === reference.id);
    const markdown = nodes.length === 0
      ? `\`${reference.id}\`: nessun oggetto con questo id`
      : nodes.map((node) => `**${node.kind}** \`${reference.id}\`\n\n${describe(node)}`).join('\n\n---\n\n');
    return { markdown };
  }
  // A math line of this file: its value, as the tree computed it.
  for (const node of tree.nodes ?? []) {
    if (node.file !== file) continue;
    const stack: JsonML[] = [...(node.content ?? [])];
    while (stack.length > 0) {
      const item = stack.pop()!;
      if (typeof item === 'string') continue;
      const attributes = item[1] !== null && typeof item[1] === 'object' && !Array.isArray(item[1]) ? (item[1] as Record<string, unknown>) : {};
      const at = attributes.sourcePosition as { range: Range } | undefined;
      if (item[0] === 'mathLine' && at && within(at.range, position)) {
        const markdown = attributes.invalid === true
          ? `riga di calcolo non valida: \`${String(item[2] ?? item[1])}\``
          : `= **${String(attributes.display)}**\n\nvalore: \`${String(attributes.value)}\``;
        return { markdown, range: at.range };
      }
      for (const child of item.slice(1)) if (typeof child === 'string' || Array.isArray(child)) stack.push(child as JsonML);
    }
  }
  return null;
}
