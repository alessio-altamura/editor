// The front matter (§0.6): YAML read with the failsafe schema, so every scalar is a string.
import { CST, isMap, isScalar, isSeq, Lexer, parseDocument, type Node as YamlNode } from 'yaml';

/** A value as written: a string, a list of strings, or something else (`attribute-invalid`). */
export type RawValue = { type: 'string'; value: string; plain: boolean } | { type: 'list'; value: string[] } | { type: 'invalid' };

export interface YamlMap {
  entries: Array<[string, RawValue]>;
  comments: number;
}

/** Splits a text file into front matter and body. The front matter is null when the file has none. */
export function splitFrontMatter(text: string): { frontMatter: string | null; body: string; bodyLine: number } | { error: string } {
  const lines = text.split('\n');
  if (lines[0] !== '---') return { frontMatter: null, body: text, bodyLine: 1 };
  const end = lines.indexOf('---', 1);
  if (end < 0) return { error: 'front matter senza la riga --- di chiusura' };
  return { frontMatter: lines.slice(1, end).join('\n'), body: lines.slice(end + 1).join('\n'), bodyLine: end + 2 };
}

function rawValue(node: unknown): RawValue {
  if (node === null || node === undefined) return { type: 'string', value: '', plain: true };
  if (isScalar(node)) return { type: 'string', value: String(node.value), plain: node.type === 'PLAIN' };
  if (isSeq(node)) {
    const items: string[] = [];
    for (const item of node.items) {
      if (!isScalar(item)) return { type: 'invalid' };
      items.push(String(item.value));
    }
    return { type: 'list', value: items };
  }
  return { type: 'invalid' };
}

/**
 * Parses a YAML mapping of strings and lists of strings; returns an error message for `syntax`.
 * Repeated keys are kept: the caller reports the second as `attribute-invalid`.
 */
export function parseYamlMap(source: string): YamlMap | { error: string } {
  const document = parseDocument(source, { schema: 'failsafe', uniqueKeys: false });
  if (document.errors.length > 0) return { error: document.errors[0]!.message };
  const comments = Array.from(new Lexer().lex(source)).filter((token) => CST.tokenType(token) === 'comment').length;
  const contents = document.contents as YamlNode | null;
  if (contents === null) return { entries: [], comments };
  if (!isMap(contents)) return { error: 'il front matter non è una mappa' };
  const entries: Array<[string, RawValue]> = [];
  for (const pair of contents.items) {
    if (!isScalar(pair.key)) return { error: 'una chiave non è una stringa' };
    entries.push([String(pair.key.value), rawValue(pair.value)]);
  }
  return { entries, comments };
}
