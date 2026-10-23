// The formatter (§11.8): the canonical form of the files, and nothing else. It never
// changes the resolved tree: a file whose new form would change it stays as it is.
import { posix } from 'node:path';
import { parseDocument } from 'yaml';
import { parseAttributeLine, writeValue } from './attribute-line.js';
import { parseYamlMap, splitFrontMatter, type RawValue } from './front-matter.js';
import { parseMarkdown, resolveTree } from './resolve-tree.js';

/** The order of the attributes in a header and in an attribute line: the table of §4, then the others as written. */
const KEY_ORDER = ['id', 'kind', 'tags', 'class', 'lang', 'title', 'spec-version', 'asset', 'recursion', 'stylesheet', 'origin', 'associations'];

/** In an attribute line the class comes right after the id (§0.18). */
const LINE_ORDER = ['id', 'class', ...KEY_ORDER.filter((key) => key !== 'id' && key !== 'class')];

const ordered = (entries: Array<[string, RawValue]>, order = KEY_ORDER) =>
  [...entries].sort((a, b) => {
    const x = order.indexOf(a[0]);
    const y = order.indexOf(b[0]);
    return (x < 0 ? order.length : x) - (y < 0 ? order.length : y);
  });

/** A YAML value: plain when YAML reads it back as the same string (§0.6), else between double quotes. */
function yamlString(value: string): string {
  // Control characters only between quotes, with their escapes: the runtime reads CR as LF.
  if (/[\u0000-\u001f\u007f-\u009f]/.test(value)) return JSON.stringify(value);
  try {
    const document = parseDocument(`k: ${value}`, { schema: 'core' });
    const read = document.toJS() as { k?: unknown } | null;
    if (document.errors.length === 0 && read?.k === value && value !== '') return value;
  } catch {
    // Not plain.
  }
  return JSON.stringify(value);
}

function yamlList(items: string[]): string {
  const plain = `[${items.join(', ')}]`;
  try {
    const document = parseDocument(`k: ${plain}`, { schema: 'core' });
    const read = document.toJS() as { k?: unknown } | null;
    if (document.errors.length === 0 && JSON.stringify(read?.k) === JSON.stringify(items)) return plain;
  } catch {
    // Not plain.
  }
  return `[${items.map((item) => JSON.stringify(item)).join(', ')}]`;
}

/** The canonical front matter, or null to leave it as written (comments, repeated keys, values out of form). */
function canonicalHeader(frontMatter: string, multiObject: boolean): string | null {
  const map = parseYamlMap(frontMatter);
  if ('error' in map || map.comments > 0) return null;
  const keys = map.entries.map(([key]) => key);
  if (new Set(keys).size !== keys.length || map.entries.some(([, value]) => value.type === 'invalid')) return null;
  const entries = [...map.entries];
  // tags is always written (§0.12), but not in the header of a multi-object file, which has only kind (§0.18).
  if (!multiObject && !keys.includes('tags')) entries.push(['tags', { type: 'list', value: [] }]);
  return writeHeader(entries);
}

/** The lines of a front matter for these attributes, in canonical order. */
export function writeHeader(entries: Array<[string, RawValue]>): string {
  return ordered(entries)
    .map(([key, value]) => `${key}: ${value.type === 'list' ? yamlList(value.value) : yamlString((value as { value: string }).value)}`)
    .join('\n');
}

const BARE = /^[^\s"{}=]+$/;

/** The canonical attribute line: #id, the classes as written, the other attributes in the order of §4. */
function canonicalAttributeLine(line: string): string {
  const entries = parseAttributeLine(line);
  if (entries === null) return line;
  const keys = entries.map(([key]) => key);
  if (new Set(keys).size !== keys.length) return line;
  return writeAttributeLine(entries);
}

/** The attribute line for these attributes, in canonical form (§0.18). */
export function writeAttributeLine(entries: Array<[string, RawValue]>): string {
  const parts: string[] = [];
  for (const [key, value] of ordered(entries, LINE_ORDER)) {
    const items = value.type === 'list' ? value.value : null;
    const text = items === null ? (value as { value: string }).value : items.join(' ');
    if (key === 'id' && BARE.test(text)) parts.push(`#${text}`);
    else if (key === 'class' && items !== null && items.length > 0 && items.every((item) => BARE.test(item))) parts.push(...items.map((item) => `.${item}`));
    else parts.push(`${key}=${writeValue(text)}`);
  }
  return `{${parts.join(' ')}}`;
}

/** Whether a path is a source the formatter writes: a text file with a kind, a stylesheet, the retired ids. */
export function isFormattable(file: string): boolean {
  const base = posix.basename(file);
  return /^.+\.[^.]+\.md$/.test(base) || base.endsWith('.stylesheet.css') || file === 'retired-ids.yaml';
}

/** The canonical form of one file's text. */
export function formatText(file: string, raw: string): string {
  // UTF-8 without BOM, LF, a line feed at the end (§2).
  const text = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const ending = (body: string) => body.replace(/\n*$/, '\n');
  if (!/\.md$/.test(file)) return text === '' ? '' : ending(text);
  const split = splitFrontMatter(text);
  if ('error' in split) return ending(text);
  const markdown = parseMarkdown(split.body);
  const lineStart = (offset: number) => split.body.lastIndexOf('\n', offset - 1) + 1;
  const slices = markdown.children.map((child) => ({ child, text: split.body.slice(lineStart(child.position!.start.offset!), child.position!.end.offset!) }));
  const attributeLine = (s: { child: { type: string }; text: string }) => s.child.type === 'paragraph' && /^\{[^\n]*\}$/.test(s.text);
  let multiObject = false;
  if (split.frontMatter !== null) {
    const map = parseYamlMap(split.frontMatter);
    multiObject = !('error' in map) && map.entries.length === 1 && map.entries[0]![0] === 'kind' && map.entries[0]![1].type === 'string' &&
      (map.entries[0]![1] as { value: string }).value !== 'document' && slices.some(attributeLine);
  }
  const blocks = slices.map((s) => {
    // Every thematic break is written ---, with a blank line before and after (§7.4).
    if (s.child.type === 'thematicBreak') return '---';
    if (multiObject && attributeLine(s)) return canonicalAttributeLine(s.text);
    return s.text;
  });
  const header = split.frontMatter === null ? null : (canonicalHeader(split.frontMatter, multiObject) ?? split.frontMatter);
  const head = header === null ? '' : `---\n${header === '' ? '' : `${header}\n`}---\n`;
  // One blank line between the blocks, as the formatter writes them.
  return blocks.length === 0 ? head : `${head}${blocks.join('\n\n')}\n`;
}

/** JSON with the keys of every object sorted, to compare two values. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item !== null && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : item);
}

export interface FormatResult {
  /** Files whose text changes, with the old and the new text. */
  changes: Map<string, { before: string; after: string }>;
  /** Files left as they are, because their new form would change the resolved tree. */
  kept: string[];
}

/**
 * Formats the files of a folder in memory: `read` gives the text of a file, or null.
 * A file whose new form would change the resolved tree is left as it is.
 */
export function formatFolder(folder: string, files: Iterable<string>, read: (file: string) => string | null): FormatResult {
  const changes = new Map<string, { before: string; after: string }>();
  for (const file of files) {
    if (!isFormattable(file)) continue;
    const before = read(file);
    if (before === null) continue;
    const after = formatText(file, before);
    if (after !== before) changes.set(file, { before, after });
  }
  const kept: string[] = [];
  if (changes.size === 0) return { changes, kept };
  // Trees compare as JSON values: the order of the keys of an object does not count (§11.3).
  const tree = canonicalJson(resolveTree(folder));
  const treeWith = (files: string[]) => canonicalJson(resolveTree(folder, { overlay: new Map(files.map((f) => [f, changes.get(f)!.after])) }));
  if (treeWith([...changes.keys()]) !== tree) {
    // Find the files that change it, one at a time, and keep them as written.
    for (const file of [...changes.keys()]) {
      if (treeWith([file]) !== tree) {
        changes.delete(file);
        kept.push(file);
      }
    }
  }
  return { changes, kept };
}
