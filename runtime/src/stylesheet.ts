// The CSS subset of class 1 (§0.5): a small parser, the values it admits and the cascade.
import { Decimal, inDecimal128Range, plainString, readDecimal, roundHalfEven, type Decimal as DecimalValue } from './math-line.js';
import { NAMED_COLORS } from './named-colors.js';

export const INHERITED_PROPERTIES = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'color',
  'text-align',
  'line-height',
] as const;
export const MARGIN_PROPERTIES = ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'] as const;
const NUMBER_NOTATION = '--number-notation';

/** A specified value, before `em` is resolved. Lengths are already in pt. */
type SpecifiedValue =
  | { type: 'length'; pt: DecimalValue }
  | { type: 'em'; factor: DecimalValue }
  | { type: 'number'; value: DecimalValue }
  | { type: 'keyword'; text: string };

interface Declaration {
  property: string;
  value: SpecifiedValue;
}

interface Selector {
  classes: string[];
  type?: string;
}

interface Rule {
  selectors: Selector[];
  declarations: Declaration[];
}

export interface ParsedStylesheet {
  /** The text of the header comment, or null when the file has none. */
  header: string | null;
  rules: Rule[];
  /** Targets of `stylesheet-unsupported`. */
  unsupported: string[];
}

/** A computed value: the string written in `computedStyle`, and the length or number behind it. */
export interface ComputedValue {
  text: string;
  pt?: DecimalValue;
  number?: DecimalValue;
}
export type ComputedStyle = Map<string, ComputedValue>;

const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);
const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace']);
const OTHER_GENERIC_FAMILIES = new Set([
  'cursive', 'fantasy', 'system-ui', 'math', 'emoji', 'fangsong',
  'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
]);
/** Type selectors a document stylesheet may use, and the content type each one hits. */
const DOCUMENT_TYPE_SELECTORS: Record<string, string> = {
  'hyperlink': 'hyperlink',
  'emphasis': 'emphasis',
  'strong': 'strong',
  'inline-code': 'inlineCode',
  'title-1': 'title-1',
  'title-2': 'title-2',
  'title-3': 'title-3',
};
const CLASS_SELECTOR = /^(?:\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*)+$/;

/** Replaces comments with a space, leaving strings alone. */
function stripComments(css: string): string {
  let out = '';
  let quote = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i]!;
    if (quote) {
      out += c;
      if (c === '\\') out += css[++i] ?? '';
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") {
      quote = c;
      out += c;
    } else if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end < 0 ? css.length : end + 1;
      out += ' ';
    } else {
      out += c;
    }
  }
  return out;
}

/** Splits on a separator outside strings and parentheses. */
function splitOutside(text: string, separator: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote = '';
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quote) {
      if (c === '\\') {
        current += c + (text[++i] ?? '');
        continue;
      }
      if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === separator && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += c;
  }
  parts.push(current);
  return parts;
}

const LENGTH = /^([+-]?(?:\d+\.\d+|\.\d+|\d+)(?:[eE][+-]?\d+)?)(pt|px|mm|cm|in|em)?$/i;

/** Converts to pt with the fixed order of §0.5, then rounds half-even to 4 decimals. */
function toPoints(number: DecimalValue, unit: string): DecimalValue {
  switch (unit) {
    case 'mm': return number.times(72).div(25.4);
    case 'cm': return number.times(72).div(2.54);
    case 'in': return number.times(72);
    case 'px': return number.times(3).div(4);
    default: return number;
  }
}

function parseLength(text: string, allowNegative: boolean, allowNumber: boolean): SpecifiedValue | null {
  const match = LENGTH.exec(text);
  if (!match) return null;
  const number = readDecimal(match[1]!);
  if (number === null) return null;
  if (!allowNegative && number.isNegative() && !number.isZero()) return null;
  const unit = match[2]?.toLowerCase();
  if (unit === undefined) {
    if (allowNumber) return { type: 'number', value: roundHalfEven(number, 4) };
    // A unitless value is a length only when it is zero.
    return number.isZero() ? { type: 'length', pt: new Decimal(0) } : null;
  }
  if (unit === 'em') return { type: 'em', factor: number };
  const pt = toPoints(number, unit);
  return inDecimal128Range(pt) ? { type: 'length', pt: roundHalfEven(pt, 4) } : null;
}

function parseColor(text: string): SpecifiedValue | null {
  const lower = text.toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(lower)) {
    return { type: 'keyword', text: '#' + Array.from(lower.slice(1), (c) => c + c).join('') };
  }
  if (/^#[0-9a-f]{6}$/.test(lower)) return { type: 'keyword', text: lower };
  const named = NAMED_COLORS.get(lower);
  return named === undefined ? null : { type: 'keyword', text: named };
}

function parseFontFamily(text: string): SpecifiedValue | null {
  const names: string[] = [];
  for (const raw of splitOutside(text, ',')) {
    const item = raw.trim();
    const quoted = /^"(.*)"$|^'(.*)'$/s.exec(item);
    if (quoted) {
      const name = quoted[1] ?? quoted[2] ?? '';
      if (/["\\]/.test(name)) return null;
      names.push(`"${name}"`);
      continue;
    }
    const words = item.split(/\s+/);
    if (item === '' || !words.every((w) => /^-?[a-zA-Z_][a-zA-Z0-9_-]*$/.test(w))) return null;
    const lower = item.toLowerCase();
    if (words.length === 1 && GENERIC_FAMILIES.has(lower)) names.push(lower);
    else if (words.length === 1 && (OTHER_GENERIC_FAMILIES.has(lower) || CSS_WIDE_KEYWORDS.has(lower))) return null;
    else names.push(`"${words.join(' ')}"`);
  }
  return { type: 'keyword', text: names.join(', ') };
}

function keyword(text: string, allowed: string[]): SpecifiedValue | null {
  const lower = text.toLowerCase();
  return allowed.includes(lower) ? { type: 'keyword', text: lower } : null;
}

/** Parses the value of a property of the subset; null means `stylesheet-unsupported`. */
function parseValue(property: string, text: string): SpecifiedValue | null {
  if (CSS_WIDE_KEYWORDS.has(text.toLowerCase())) return null;
  switch (property) {
    case 'font-family': return parseFontFamily(text);
    case 'font-size': return parseLength(text, false, false);
    case 'line-height': return parseLength(text, false, true);
    case 'margin-top':
    case 'margin-right':
    case 'margin-bottom':
    case 'margin-left':
      return parseLength(text, true, false);
    case 'font-weight': {
      const named = { normal: '400', bold: '700' }[text.toLowerCase()];
      if (named !== undefined) return { type: 'number', value: new Decimal(named) };
      if (!/^[+]?(?:\d+\.\d+|\.\d+|\d+)(?:[eE][+-]?\d+)?$/.test(text)) return null;
      const value = readDecimal(text);
      if (value === null || value.lt(1) || value.gt(1000)) return null;
      return { type: 'number', value: roundHalfEven(value, 4) };
    }
    case 'font-style': return keyword(text, ['normal', 'italic']);
    case 'text-align': return keyword(text, ['left', 'right', 'center', 'justify']);
    case 'color': return parseColor(text);
    // A custom property is case-sensitive, so its value is not lowercased.
    case NUMBER_NOTATION: return text === 'standard' || text === 'compact' ? { type: 'keyword', text } : null;
    default: return null;
  }
}

function isSubsetProperty(property: string): boolean {
  return (
    (INHERITED_PROPERTIES as readonly string[]).includes(property) ||
    (MARGIN_PROPERTIES as readonly string[]).includes(property) ||
    property === NUMBER_NOTATION
  );
}

function parseSelector(text: string, base: boolean): Selector | null {
  if (base) return /^[a-zA-Z][a-zA-Z0-9-]*$/.test(text) ? { classes: [], type: text } : null;
  const type = DOCUMENT_TYPE_SELECTORS[text];
  if (type !== undefined) return { classes: [], type };
  // A class outside the form of §3, such as .Nota, could never match: it is unsupported (reading).
  if (CLASS_SELECTOR.test(text)) return { classes: text.slice(1).split('.') };
  return null;
}

function parseDeclarations(block: string, unsupported: string[]): Declaration[] {
  const declarations: Declaration[] = [];
  for (const raw of splitOutside(block, ';')) {
    const text = raw.trim();
    if (text === '') continue;
    const colon = text.indexOf(':');
    if (colon < 0) {
      unsupported.push(text);
      continue;
    }
    const written = text.slice(0, colon).trim();
    const property = written.startsWith('--') ? written : written.toLowerCase();
    const valueText = text.slice(colon + 1).trim();
    if (/!\s*important$/i.test(valueText) || !isSubsetProperty(property)) {
      unsupported.push(written);
      continue;
    }
    const value = parseValue(property, valueText);
    if (value === null) unsupported.push(written);
    else declarations.push({ property, value });
  }
  return declarations;
}

/**
 * Parses a stylesheet. `base` admits any type selector, for the base stylesheet.
 * The parser is forgiving like CSS: an unclosed block runs to the end of the file.
 */
export function parseStylesheet(css: string, base = false): ParsedStylesheet {
  const headerMatch = /^\s*\/\*([\s\S]*?)\*\//.exec(css);
  const header = headerMatch ? headerMatch[1]! : null;
  const text = stripComments(css);
  const rules: Rule[] = [];
  const unsupported: string[] = [];
  let index = 0;
  while (index < text.length) {
    const open = findOutside(text, index, '{;');
    const prelude = text.slice(index, open).trim();
    if (open >= text.length || text[open] === ';') {
      // A statement without a block, such as @import, or stray text.
      if (prelude !== '') unsupported.push(prelude.startsWith('@') ? prelude.split(/[\s;]/)[0]! : prelude);
      index = open + 1;
      continue;
    }
    const close = matchingBrace(text, open);
    const block = text.slice(open + 1, close);
    index = close + 1;
    // At-rules are outside the subset; the target is the at-keyword (reading).
    if (prelude.startsWith('@')) {
      unsupported.push(prelude.split(/\s/)[0]!);
      continue;
    }
    const selectors: Selector[] = [];
    let rejected: string | null = null;
    for (const member of prelude.split(',')) {
      const selector = parseSelector(member.trim(), base);
      if (selector === null) {
        rejected = member.trim();
        break;
      }
      selectors.push(selector);
    }
    // One invalid member drops the whole rule, without checking its declarations.
    if (rejected !== null) {
      unsupported.push(rejected);
      continue;
    }
    rules.push({ selectors, declarations: parseDeclarations(block, unsupported) });
  }
  return { header, rules, unsupported };
}

function findOutside(text: string, from: number, chars: string): number {
  let quote = '';
  for (let i = from; i < text.length; i++) {
    const c = text[i]!;
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (chars.includes(c)) return i;
  }
  return text.length;
}

function matchingBrace(text: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let i = open; i < text.length; i++) {
    const c = text[i]!;
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return text.length;
}

/** The base stylesheet of §0.5, applied before the document's stylesheets. */
export const BASE_STYLESHEET = parseStylesheet(
  `
root          { font-family: serif; font-size: 11pt; line-height: 1.4; color: #000000;
                font-weight: 400; font-style: normal; text-align: left; }
paragraph     { margin-bottom: 6pt; }
title-1       { font-size: 18pt; font-weight: 700; margin-top: 18pt; margin-bottom: 9pt; }
title-2       { font-size: 14pt; font-weight: 700; margin-top: 12pt; margin-bottom: 6pt; }
title-3       { font-size: 11pt; font-weight: 700; margin-top: 9pt; margin-bottom: 3pt; }
emphasis      { font-style: italic; }
strong        { font-weight: 700; }
inlineCode, code { font-family: monospace; }
hyperlink     { color: #1a4f8b; }
blockquote    { margin-left: 24pt; }
list          { margin-left: 18pt; margin-bottom: 6pt; }
`,
  true,
);

/** What a node shows to the cascade: its type for the base stylesheet and its classes. */
export interface StyleTarget {
  type: string;
  classes: string[];
  /** The classes that come from the `embed`: their rules win in a later layer. */
  embedClasses: string[];
}

function lengthValue(pt: DecimalValue): ComputedValue {
  const rounded = roundHalfEven(pt, 4);
  return { text: plainString(rounded) + 'pt', pt: rounded };
}

/**
 * Computes the final values of a node: the rules that hit it, in cascade
 * order, over the values inherited from its parent. Without `document`,
 * only the base stylesheet applies.
 */
export function computeStyle(target: StyleTarget, parent: ComputedStyle, document: ParsedStylesheet | null): ComputedStyle {
  type Ranked = { key: number[]; declaration: Declaration };
  const ranked: Ranked[] = [];
  const sheets: Array<[ParsedStylesheet, number]> = [[BASE_STYLESHEET, 0]];
  if (document) sheets.push([document, 1]);
  for (const [sheet, origin] of sheets) {
    sheet.rules.forEach((rule, ruleIndex) => {
      let best: number[] | null = null;
      for (const selector of rule.selectors) {
        if (selector.type !== undefined && selector.type !== target.type) continue;
        if (!selector.classes.every((c) => target.classes.includes(c))) continue;
        const layer = selector.classes.some((c) => target.embedClasses.includes(c)) ? 1 : 0;
        const key = [origin, layer, selector.classes.length, selector.type === undefined ? 0 : 1, ruleIndex];
        if (best === null || compareKeys(key, best) > 0) best = key;
      }
      if (best === null) return;
      rule.declarations.forEach((declaration, index) => ranked.push({ key: [...best!, index], declaration }));
    });
  }
  ranked.sort((a, b) => compareKeys(a.key, b.key));
  const winners = new Map<string, SpecifiedValue>();
  for (const { declaration } of ranked) winners.set(declaration.property, declaration.value);

  const style: ComputedStyle = new Map();
  for (const property of [...INHERITED_PROPERTIES, NUMBER_NOTATION]) {
    const inherited = parent.get(property);
    if (inherited) style.set(property, inherited);
  }
  for (const property of MARGIN_PROPERTIES) style.set(property, lengthValue(new Decimal(0)));

  // font-size first: `em` in the other properties refers to the node's own font-size.
  const parentFontSize = parent.get('font-size')?.pt ?? new Decimal(0);
  const fontSize = winners.get('font-size');
  if (fontSize) style.set('font-size', resolveValue(fontSize, parentFontSize));
  const ownFontSize = style.get('font-size')?.pt ?? new Decimal(0);
  for (const [property, value] of winners) {
    if (property !== 'font-size') style.set(property, resolveValue(value, ownFontSize));
  }
  return style;
}

function resolveValue(value: SpecifiedValue, emBase: DecimalValue): ComputedValue {
  switch (value.type) {
    case 'length': return lengthValue(value.pt);
    case 'em': return lengthValue(value.factor.times(emBase));
    case 'number': return { text: plainString(value.value), number: value.value };
    case 'keyword': return { text: value.text };
  }
}

function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** The properties whose final value differs from the expected one, for `computedStyle`. */
export function styleDifference(final: ComputedStyle, expected: ComputedStyle): Record<string, string> {
  const difference: Record<string, string> = {};
  for (const property of [...INHERITED_PROPERTIES, ...MARGIN_PROPERTIES]) {
    const value = final.get(property)?.text;
    if (value !== undefined && value !== expected.get(property)?.text) difference[property] = value;
  }
  return difference;
}

export function numberNotation(style: ComputedStyle): 'standard' | 'compact' {
  return style.get(NUMBER_NOTATION)?.text === 'compact' ? 'compact' : 'standard';
}
