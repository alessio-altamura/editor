// The CSS subset of class 1 (§0.5): a small parser, the values it admits and the cascade.
import { Decimal, inDecimal128Range, plainString, readDecimal, roundHalfEven, type Decimal as DecimalValue } from './math-line.js';
import { NAMED_COLORS } from './named-colors.js';
import { baseStylesheetCss, INHERITED_PROPERTIES, NOT_INHERITED_DEFAULTS, PAGE_BACKGROUND, STYLE_PROPERTIES } from './base-stylesheet.js';

export { INHERITED_PROPERTIES };
const TEXT_DECORATION_LINE = 'text-decoration-line';
const NUMBER_NOTATION = '--number-notation';
const NUMBER_DECIMALS = '--number-decimals';
/** The most decimals of `display` when no `--number-decimals` is given (§0.4). */
export const DEFAULT_DECIMALS = 2;

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
  /** In `@media (prefers-color-scheme: dark)`: the rule holds only in the dark theme (§0.5). */
  dark: boolean;
}

export type Theme = 'light' | 'dark';
/** The one at-rule a stylesheet admits, with free spaces around its parts. */
const DARK_MEDIA = /^@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)$/i;

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
const DOCUMENT_TYPE_SELECTORS: ReadonlyMap<string, string> = new Map([
  ['hyperlink', 'hyperlink'],
  ['emphasis', 'emphasis'],
  ['strong', 'strong'],
  ['inline-code', 'inlineCode'],
  ['title-0', 'title-0'],
  ['title-1', 'title-1'],
  ['title-2', 'title-2'],
  ['title-3', 'title-3'],
  // The marks of a chart: their color, in each theme (class 3).
  ['chart', 'chart'],
]);
const FONT_WEIGHT_KEYWORDS: ReadonlyMap<string, string> = new Map([['normal', '400'], ['bold', '700']]);
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
      const named = FONT_WEIGHT_KEYWORDS.get(text.toLowerCase());
      if (named !== undefined) return { type: 'number', value: new Decimal(named) };
      if (!/^[+]?(?:\d+\.\d+|\.\d+|\d+)(?:[eE][+-]?\d+)?$/.test(text)) return null;
      const value = readDecimal(text);
      if (value === null || value.lt(1) || value.gt(1000)) return null;
      return { type: 'number', value: roundHalfEven(value, 4) };
    }
    case 'font-style': return keyword(text, ['normal', 'italic']);
    case 'text-align': return keyword(text, ['left', 'right', 'center', 'justify']);
    case 'color': return parseColor(text);
    case TEXT_DECORATION_LINE: return keyword(text, ['none', 'underline']);
    // A custom property is case-sensitive, so its value is not lowercased.
    case NUMBER_NOTATION: return text === 'standard' || text === 'compact' ? { type: 'keyword', text } : null;
    case NUMBER_DECIMALS: return /^(?:[0-9]|10)$/.test(text) ? { type: 'keyword', text } : null;
    default: return null;
  }
}

function isSubsetProperty(property: string): boolean {
  return (STYLE_PROPERTIES as readonly string[]).includes(property) || property === NUMBER_NOTATION || property === NUMBER_DECIMALS || property === 'text-decoration';
}

function parseSelector(text: string, base: boolean): Selector | null {
  if (base) return /^[a-zA-Z][a-zA-Z0-9-]*$/.test(text) ? { classes: [], type: text } : null;
  const type = DOCUMENT_TYPE_SELECTORS.get(text);
  if (type !== undefined) return { classes: [], type };
  // A class outside the form of §3, such as .Nota, could never match: it is unsupported (reading).
  if (CLASS_SELECTOR.test(text)) return { classes: text.slice(1).split('.') };
  return null;
}

function parseDeclarations(block: string, unsupported: string[], dark: boolean): Declaration[] {
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
    // `text-decoration` with one word, none or underline, counts as `text-decoration-line` (§0.5).
    const target = property === 'text-decoration' ? TEXT_DECORATION_LINE : property;
    // In the dark block only colors (§0.5).
    if (dark && target !== 'color') {
      unsupported.push(written);
      continue;
    }
    const value = parseValue(target, valueText);
    if (value === null) unsupported.push(written);
    else declarations.push({ property: target, value });
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
  const rules: Rule[] = [];
  const unsupported: string[] = [];
  parseRules(stripComments(css), base, false, rules, unsupported);
  return { header, rules, unsupported };
}

/** The rules of a text, in order; inside the dark block `dark` is true and no at-rule holds. */
function parseRules(text: string, base: boolean, dark: boolean, rules: Rule[], unsupported: string[]): void {
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
    // Other at-rules are outside the subset; the target is the at-keyword (reading).
    if (prelude.startsWith('@')) {
      if (!dark && DARK_MEDIA.test(prelude)) parseRules(block, base, true, rules, unsupported);
      else unsupported.push(prelude.split(/\s/)[0]!);
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
    rules.push({ selectors, declarations: parseDeclarations(block, unsupported, dark), dark });
  }
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
export const BASE_STYLESHEET = parseStylesheet(baseStylesheetCss(), true);

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
export function computeStyle(
  target: StyleTarget,
  parent: ComputedStyle,
  document: ParsedStylesheet | null,
  onOutOfRange?: (property: string) => void,
  theme: Theme = 'light',
): ComputedStyle {
  type Ranked = { key: number[]; declaration: Declaration };
  const ranked: Ranked[] = [];
  const sheets: Array<[ParsedStylesheet, number]> = [[BASE_STYLESHEET, 0]];
  if (document) sheets.push([document, 1]);
  for (const [sheet, origin] of sheets) {
    sheet.rules.forEach((rule, ruleIndex) => {
      // The light theme ignores the dark blocks; the dark one takes them in their place (§0.5).
      if (rule.dark && theme === 'light') return;
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
  // Highest first: for each property the first declaration whose value resolves wins.
  ranked.sort((a, b) => compareKeys(b.key, a.key));
  const candidates = new Map<string, SpecifiedValue[]>();
  for (const { declaration } of ranked) {
    candidates.set(declaration.property, [...(candidates.get(declaration.property) ?? []), declaration.value]);
  }

  const style: ComputedStyle = new Map();
  for (const property of [...INHERITED_PROPERTIES, NUMBER_NOTATION, NUMBER_DECIMALS]) {
    const inherited = parent.get(property);
    if (inherited) style.set(property, inherited);
  }
  for (const [property, value] of Object.entries(NOT_INHERITED_DEFAULTS)) {
    style.set(property, property === TEXT_DECORATION_LINE ? { text: value } : lengthValue(new Decimal(0)));
  }

  const settle = (property: string, emBase: DecimalValue) => {
    for (const value of candidates.get(property) ?? []) {
      const resolved = resolveValue(value, emBase);
      if (resolved) {
        style.set(property, resolved);
        return;
      }
      // An em length out of decimal128 is ignored, like an absolute one (§0.5).
      onOutOfRange?.(property);
    }
  };
  // font-size first: `em` in the other properties refers to the node's own font-size.
  settle('font-size', parent.get('font-size')?.pt ?? new Decimal(0));
  const ownFontSize = style.get('font-size')?.pt ?? new Decimal(0);
  for (const property of candidates.keys()) if (property !== 'font-size') settle(property, ownFontSize);
  return style;
}

function resolveValue(value: SpecifiedValue, emBase: DecimalValue): ComputedValue | null {
  switch (value.type) {
    case 'length': return lengthValue(value.pt);
    case 'em': {
      const pt = value.factor.times(emBase);
      return inDecimal128Range(pt) ? lengthValue(pt) : null;
    }
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
  for (const property of STYLE_PROPERTIES) {
    const value = final.get(property)?.text;
    if (value !== undefined && value !== expected.get(property)?.text) difference[property] = value;
  }
  return difference;
}

/** A declaration the runtime adds to a node itself, like the column alignment (§0.5). */
export function directValue(property: string, text: string): ComputedValue {
  const value = parseValue(property, text);
  if (value === null) throw new Error(`not a value of ${property}: ${text}`);
  return resolveValue(value, new Decimal(0))!;
}

/** The contrast ratio of a #rrggbb color with the dark page background, as WCAG 2.2 computes it. */
export function contrastOnDark(color: string, background: string = PAGE_BACKGROUND.dark): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [dark, light] = [luminance(color), luminance(background)].sort((a, b) => a - b) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

export function numberDecimals(style: ComputedStyle): number {
  const text = style.get(NUMBER_DECIMALS)?.text;
  return text === undefined ? DEFAULT_DECIMALS : Number(text);
}

export function numberNotation(style: ComputedStyle): 'standard' | 'compact' {
  return style.get(NUMBER_NOTATION)?.text === 'compact' ? 'compact' : 'standard';
}
