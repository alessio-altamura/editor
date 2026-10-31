// The attribute line of a multi-object file (§0.18): `{#id .class key=value}`,
// read into the same entries as a front matter, and written back in canonical form.
import type { RawValue } from './front-matter.js';

/** Keys whose value is a list: written between quotes, items separated by spaces. */
export const LIST_KEYS = new Set(['tags', 'class', 'associations', 'inputs']);

/** A paragraph that is only `{…}` on one line is an attribute line. */
export function isAttributeLine(text: string): boolean {
  return /^\{[^\n]*\}$/.test(text);
}

const KEY = /^[A-Za-z][A-Za-z0-9_-]*/;
const BARE = /^[^\s"{}=]+/;

/**
 * Reads an attribute line into entries, as a front matter gives them; `id` and
 * `class` come first only if written first. Null when it is out of form.
 */
export function parseAttributeLine(line: string): Array<[string, RawValue]> | null {
  if (!isAttributeLine(line)) return null;
  const text = line.slice(1, -1);
  const entries: Array<[string, RawValue]> = [];
  const classes: string[] = [];
  let classEntry: [string, RawValue] | null = null;
  let i = 0;
  while (i < text.length) {
    if (text[i] === ' ') {
      i++;
      continue;
    }
    if (text[i] === '#' || text[i] === '.') {
      const word = BARE.exec(text.slice(i + 1))?.[0];
      if (word === undefined) return null;
      if (text[i] === '#') entries.push(['id', { type: 'string', value: word, plain: true }]);
      else {
        classes.push(word);
        if (classEntry === null) entries.push((classEntry = ['class', { type: 'list', value: classes }]));
      }
      i += 1 + word.length;
    } else {
      const key = KEY.exec(text.slice(i))?.[0];
      if (key === undefined || text[i + key.length] !== '=') return null;
      i += key.length + 1;
      let value = '';
      let quoted = false;
      if (text[i] === '"') {
        quoted = true;
        for (i++; ; i++) {
          if (i >= text.length) return null;
          if (text[i] === '\\') {
            if (text[i + 1] !== '"' && text[i + 1] !== '\\') return null;
            value += text[++i];
          } else if (text[i] === '"') {
            i++;
            break;
          } else value += text[i];
        }
      } else {
        const bare = BARE.exec(text.slice(i))?.[0];
        if (bare === undefined) return null;
        value = bare;
        i += bare.length;
      }
      if (i < text.length && text[i] !== ' ') return null;
      entries.push([key, LIST_KEYS.has(key) ? { type: 'list', value: value.split(' ').filter(Boolean) } : { type: 'string', value, plain: !quoted }]);
    }
  }
  return entries;
}

/** A value as the canonical line writes it: bare if it can be, else between quotes. */
export function writeValue(value: string): string {
  return value !== '' && BARE.exec(value)?.[0] === value ? value : `"${value.replace(/[\\"]/g, (c) => `\\${c}`)}"`;
}
