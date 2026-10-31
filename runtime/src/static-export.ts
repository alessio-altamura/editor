// The reference renderer: one HTML file for an article of the resolved tree, with
// the CSS and the images inside (§11.4). It reads the tree and computes nothing
// but the inheritance of §0.5; the mapping is in the README of the runtime.
import { BASE_FONT_WEIGHTS, BASE_FONTS, BASE_STYLESHEET_RULES, INHERITED_PROPERTIES, NOT_INHERITED_DEFAULTS, PAGE_BACKGROUND, STYLE_PROPERTIES, type GenericFamily, type Theme } from './base-stylesheet.js';
import { CLASS_FORM, ID_FORM, LANG_FORM, type Diagnostic, type JsonML, type ResolvedTree, type TreeNode } from './tree.js';

/** An image read by the cli, or why it is not embedded. */
export type ExportAsset = { mime: string; bytes: Uint8Array } | { fallback: 'format' | 'unreadable' | 'size' };

export interface ExportOptions {
  /** With --allow-errors the page marks the pieces that do not resolve. */
  allowErrors?: boolean;
  /** One theme fixed with --theme; without it the page has both and follows the viewer (§11.4). */
  theme?: Theme;
  /** The files of the base fonts, by name, read by the cli: the page embeds the ones it uses. */
  fonts?: ReadonlyMap<string, Uint8Array>;
  /** The preview of `serve` (§11.6): the same page, with a different frame. */
  preview?: PreviewOptions;
}

/** What changes in the preview: addresses instead of embedded files, the diagnostics on top, the scripts. */
export interface PreviewOptions {
  assetUrl: (path: string) => string;
  fontUrl: (file: string) => string;
  scriptUrls: string[];
  diagnostics: Diagnostic[];
}

/** Base64 in blocks of 3·16384 bytes: each block is a whole number of base64 quads. */
const BASE64_BLOCK = 3 * 16384;
const FLUSH = 1 << 16;

type Style = Record<string, string>;

const RESET_ELEMENTS = [
  'html', 'body', 'article', 'section', 'div', 'figure', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol',
  'li', 'blockquote', 'br', 'hr', 'pre', 'code', 'table', 'caption', 'thead', 'tbody', 'tr', 'th', 'td', 'em', 'strong', 'a', 'span',
];

/** The page background of each theme, and with both themes the choice of the node colors. */
function themeRules(theme: Theme | undefined): string {
  if (theme !== undefined) return `html { background: ${PAGE_BACKGROUND[theme]}; color-scheme: ${theme}; }\n`;
  return (
    `html { background: ${PAGE_BACKGROUND.light}; color-scheme: light dark; }\n` +
    `@media (prefers-color-scheme: dark) { html { background: ${PAGE_BACKGROUND.dark}; } }\n` +
    '* { --color: var(--color-light); }\n' +
    '@media (prefers-color-scheme: dark) { * { --color: var(--color-dark); } }\n'
  );
}

function styleSheet(options: ExportOptions): string {
  return (
    `${RESET_ELEMENTS.join(', ')} { margin: 0; padding: 0; border: 0; font: inherit; color: inherit; text-decoration: none; vertical-align: baseline; }\n` +
    'html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }\n' +
    themeRules(options.theme) +
    '@media screen { body { padding: 18pt; } }\n' +
    'ul { list-style-type: disc; }\n' +
    'ol { list-style-type: decimal; }\n' +
    'pre { white-space: pre-wrap; }\n' +
    'hr { border-top: 0.75pt solid currentColor; }\n' +
    'table { border-collapse: collapse; }\n' +
    'th, td { border: 0.75pt solid currentColor; padding: 2pt 6pt; vertical-align: top; }\n' +
    'img { max-width: 100%; height: auto; vertical-align: top; }\n' +
    '[data-number], [data-math-line], [data-math-line-invalid] { unicode-bidi: isolate; }\n' +
    'caption[data-description] { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }\n' +
    (options.preview !== undefined ? 'tr[data-more-records] td { font-style: italic; }\n' : '') +
    (options.allowErrors === true ? '[data-unresolved] { outline: 0.75pt dashed currentColor; }\n[data-invalid] { outline: 0.75pt dashed currentColor; }\n' : '')
  );
}

// Values: the written forms of §0.5. Anything else in the tree is an internal error.

const DECIMAL = '(?:0|[1-9][0-9]*)(?:\\.[0-9]*[1-9])?';
const VALUE_FORMS: Record<string, RegExp> = {
  'font-size': new RegExp(`^${DECIMAL}pt$`),
  'font-weight': new RegExp(`^${DECIMAL}$`),
  'font-style': /^(?:normal|italic)$/,
  'color': /^#[0-9a-f]{6}$/,
  'text-align': /^(?:left|right|center|justify)$/,
  'margin-top': new RegExp(`^-?${DECIMAL}pt$`),
  'margin-right': new RegExp(`^-?${DECIMAL}pt$`),
  'margin-bottom': new RegExp(`^-?${DECIMAL}pt$`),
  'margin-left': new RegExp(`^-?${DECIMAL}pt$`),
  'line-height': new RegExp(`^${DECIMAL}(?:pt)?$`),
  'text-decoration-line': /^(?:none|underline)$/,
};
const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace']);

/** CSSOM «serialize a string»: the name between double quotes. */
function cssString(name: string): string {
  let out = '"';
  for (const char of name) {
    const code = char.codePointAt(0)!;
    if (code === 0) out += '�';
    else if ((code >= 0x01 && code <= 0x1f) || code === 0x7f) out += `\\${code.toString(16)} `;
    else if (char === '"' || char === '\\') out += '\\' + char;
    else out += char;
  }
  return out + '"';
}

/** `font-family` as the tree writes it: items separated by «, », generic or "name". */
function fontFamilyCss(value: string): string {
  const items: string[] = [];
  let i = 0;
  for (;;) {
    if (value[i] === '"') {
      const end = value.indexOf('"', i + 1);
      if (end < 0) throw new Error(`font-family out of form: ${value}`);
      const name = value.slice(i + 1, end);
      if (name.includes('\\')) throw new Error(`font-family out of form: ${value}`);
      items.push(cssString(name));
      i = end + 1;
    } else {
      const end = value.indexOf(', ', i);
      const generic = value.slice(i, end < 0 ? value.length : end);
      if (!GENERIC_FAMILIES.has(generic)) throw new Error(`font-family out of form: ${value}`);
      // A generic family is drawn with its base font (§0.5).
      items.push(`${cssString(BASE_FONTS[generic as GenericFamily].family)}, ${generic}`);
      i += generic.length;
    }
    if (i === value.length) return items.join(', ');
    if (!value.startsWith(', ', i)) throw new Error(`font-family out of form: ${value}`);
    i += 2;
  }
}

/** The final values of a node in the two themes; they differ only in the color. */
interface Styles {
  light: Style;
  dark: Style;
}

function checked(property: string, value: string | undefined): string {
  if (value === undefined) throw new Error(`no value for ${property}`);
  if (property === 'font-family') return fontFamilyCss(value);
  if (!VALUE_FORMS[property]!.test(value)) throw new Error(`${property} out of form: ${value}`);
  return value;
}

/** The style attribute: literal colors with one theme, the two colors through --color with both. */
function styleAttribute(styles: Styles, theme: Theme | undefined): string {
  return STYLE_PROPERTIES.map((property) => {
    if (property === 'color' && theme === undefined) {
      return `color: var(--color); --color-light: ${checked(property, styles.light.color)}; --color-dark: ${checked(property, styles.dark.color)}`;
    }
    return `${property}: ${checked(property, styles[theme ?? 'light'][property])}`;
  }).join('; ');
}

/** The base fonts a style uses: one key per generic family and font-style. */
function noteFonts(style: Style, used: Set<string>): void {
  for (const item of (style['font-family'] ?? '').split(', ')) {
    if (GENERIC_FAMILIES.has(item)) used.add(`${item}/${style['font-style'] === 'italic' ? 'italic' : 'normal'}`);
  }
}

function* base64(bytes: Uint8Array, encode: boolean): Generator<string | number> {
  if (!encode) {
    yield 4 * Math.ceil(bytes.length / 3);
    return;
  }
  for (let offset = 0; offset < bytes.length; offset += BASE64_BLOCK) {
    const block = bytes.subarray(offset, Math.min(offset + BASE64_BLOCK, bytes.length));
    yield Buffer.from(block.buffer, block.byteOffset, block.byteLength).toString('base64');
  }
}

/** The @font-face rules of the base fonts the page uses, in a fixed order. */
function* fontFaces(used: ReadonlySet<string>, fonts: ReadonlyMap<string, Uint8Array> | undefined, encode: boolean, preview?: PreviewOptions): Generator<string | number> {
  for (const generic of Object.keys(BASE_FONTS) as GenericFamily[]) {
    for (const style of ['normal', 'italic'] as const) {
      if (!used.has(`${generic}/${style}`)) continue;
      const file = BASE_FONTS[generic][style];
      if (preview) {
        yield `@font-face { font-family: ${cssString(BASE_FONTS[generic].family)}; font-style: ${style}; font-weight: ${BASE_FONT_WEIGHTS}; src: url(${cssString(preview.fontUrl(file))}) format("woff2"); }\n`;
        continue;
      }
      const bytes = fonts?.get(file);
      if (bytes === undefined) throw new Error(`the base font ${file} is missing`);
      yield `@font-face { font-family: ${cssString(BASE_FONTS[generic].family)}; font-style: ${style}; font-weight: ${BASE_FONT_WEIGHTS}; src: url(data:font/woff2;base64,`;
      yield* base64(bytes, encode);
      yield ') format("woff2"); }\n';
    }
  }
}

/**
 * Final values (§0.5): inherited from the parent, base rules for the type, then the
 * node's computedStyle; in the dark theme the dark base rules hold too, and the color
 * comes from darkComputedStyle.
 */
function finalStyle(type: string, parent: Style, attributes: { computedStyle?: unknown; darkComputedStyle?: unknown }, theme: Theme): Style {
  const style: Style = {};
  for (const property of INHERITED_PROPERTIES) if (parent[property] !== undefined) style[property] = parent[property];
  Object.assign(style, NOT_INHERITED_DEFAULTS);
  for (const rule of BASE_STYLESHEET_RULES) {
    if (rule.dark && theme === 'light') continue;
    if (rule.types.includes(type)) for (const [property, value] of rule.declarations) style[property] = value;
  }
  const overlay = (computed: unknown, properties: readonly string[]) => {
    if (computed === null || typeof computed !== 'object') return;
    for (const property of properties) {
      const value = (computed as Record<string, unknown>)[property];
      if (typeof value === 'string') style[property] = value;
    }
  };
  overlay(attributes.computedStyle, theme === 'light' ? STYLE_PROPERTIES : STYLE_PROPERTIES.filter((p) => p !== 'color'));
  if (theme === 'dark') overlay(attributes.darkComputedStyle, ['color']);
  return style;
}

function finalStyles(type: string, parent: Styles, attributes: { computedStyle?: unknown; darkComputedStyle?: unknown }): Styles {
  return { light: finalStyle(type, parent.light, attributes, 'light'), dark: finalStyle(type, parent.dark, attributes, 'dark') };
}

// Text: characters HTML does not want become U+FFFD, then the five escapes.

function isNoncharacter(code: number): boolean {
  return (code >= 0xfdd0 && code <= 0xfdef) || (code & 0xfffe) === 0xfffe;
}

export function cleanText(text: string): string {
  let out = '';
  const normalized = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < normalized.length; i++) {
    const unit = normalized.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff && i + 1 < normalized.length) {
      const next = normalized.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        const code = (unit - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
        out += isNoncharacter(code) ? '�' : normalized.slice(i, i + 2);
        i++;
        continue;
      }
    }
    const control = (unit < 0x20 && unit !== 0x09 && unit !== 0x0a) || (unit >= 0x7f && unit <= 0x9f);
    if (control || (unit >= 0xd800 && unit <= 0xdfff) || isNoncharacter(unit)) out += '�';
    else out += normalized[i];
  }
  return out;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

export function escapeHtml(text: string): string {
  return cleanText(text).replace(/[&<>"']/g, (c) => ESCAPES[c]!);
}

// The tree.

interface Element {
  type: string;
  attributes: Record<string, unknown>;
  children: JsonML[];
}

function asElement(item: JsonML): Element | string {
  if (typeof item === 'string') return item;
  const [type, second, ...rest] = item;
  if (second !== null && typeof second === 'object' && !Array.isArray(second)) {
    return { type, attributes: second as Record<string, unknown>, children: rest as JsonML[] };
  }
  return { type, attributes: {}, children: (second === undefined ? [] : [second, ...rest]) as JsonML[] };
}

/** The text of a description, for `alt`: display of a math line, a space for a break and between blocks. */
function plainText(items: JsonML[]): string {
  const parts: string[] = [];
  for (const item of items) {
    const element = asElement(item);
    if (typeof element === 'string') parts.push(element);
    else if (element.type === 'break') parts.push(' ');
    else if (element.type === 'mathLine' && element.attributes.invalid !== true) parts.push(String(element.attributes.display ?? ''));
    else parts.push(plainText(element.children));
  }
  return parts.join(isBlockList(items) ? ' ' : '');
}

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'list', 'listItem', 'blockquote', 'code', 'table', 'tableRow', 'thematicBreak', 'embed', 'title']);
function isBlockList(items: JsonML[]): boolean {
  return items.some((item) => typeof item !== 'string' && BLOCK_TYPES.has(item[0]));
}

const classAttribute = (value: unknown): string => {
  const classes = Array.isArray(value) ? value.filter((c): c is string => typeof c === 'string' && CLASS_FORM.test(c)) : [];
  return classes.length > 0 ? ` class="${escapeHtml(classes.join(' '))}"` : '';
};
const langAttribute = (value: unknown): string =>
  typeof value === 'string' && LANG_FORM.test(value) ? ` lang="${escapeHtml(value)}"` : '';

/** The HTML ids of the page: the article, then the first resolved embed of each object. */
function pageIds(article: TreeNode): { ids: Set<string>; embeds: Set<unknown> } {
  const ids = new Set<string>();
  const embeds = new Set<unknown>();
  if (article.id !== undefined && ID_FORM.test(article.id)) ids.add(article.id);
  const stack: JsonML[] = [...(article.content ?? [])].reverse();
  while (stack.length > 0) {
    const item = stack.pop()!;
    if (typeof item === 'string') continue;
    const element = asElement(item);
    if (typeof element === 'string') continue;
    if (element.type === 'embed') {
      const { id, unresolved, recursion } = element.attributes;
      if (unresolved === true || recursion === true) continue;
      if (typeof id === 'string' && ID_FORM.test(id) && !ids.has(id)) {
        ids.add(id);
        embeds.add(item);
      }
    }
    for (let i = element.children.length - 1; i >= 0; i--) stack.push(element.children[i]!);
  }
  return { ids, embeds };
}

/** The href of a link with `url`: http, https and mailto through the URL parser, or #id in the page. */
export function safeHref(url: string, ids: Set<string>): string | null {
  if (url.startsWith('#')) return ids.has(url.slice(1)) ? url : null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? parsed.href : null;
}

type Task =
  | { type: 'text'; text: string }
  | { type: 'image'; bytes: Uint8Array }
  | { type: 'node'; item: JsonML; parent: Styles; context: Context };

interface Context {
  /** 1 when the article title is in the page: chapter titles go one level down. */
  shift: number;
  /** The depth of the enclosing chapter, for its title. */
  depth: number;
  number?: string;
  /** Inside a table: th in the first row, td in the others. */
  cell?: 'th' | 'td';
  /** The object whose content this is, for data-node in the preview. */
  node?: string;
  /** The description of a collection, for the caption of its table (class 2). */
  caption?: JsonML[];
}

/** A source position as data-source: file:line:character-line:character, counted as in LSP. */
function sourceAttribute(position: unknown): string {
  const p = position as { file?: unknown; range?: { start?: { line?: unknown; character?: unknown }; end?: { line?: unknown; character?: unknown } } } | undefined;
  const numbers = [p?.range?.start?.line, p?.range?.start?.character, p?.range?.end?.line, p?.range?.end?.character];
  if (typeof p?.file !== 'string' || !numbers.every((n) => Number.isInteger(n))) return '';
  return ` data-source="${escapeHtml(`${p.file}:${numbers[0]}:${numbers[1]}-${numbers[2]}:${numbers[3]}`)}"`;
}

/** The diagnostics of the folder, on top of the preview, outside the article: not a node. */
function diagnosticsList(diagnostics: Diagnostic[]): string {
  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const summary = `${errors} ${errors === 1 ? 'errore' : 'errori'}, ${diagnostics.length - errors} ${diagnostics.length - errors === 1 ? 'avviso' : 'avvisi'}`;
  const items = diagnostics.map((d) =>
    `<li data-severity="${d.severity}"><strong>${d.severity}</strong> <code>${escapeHtml(d.code)}</code> ${escapeHtml(d.file)}` +
    `${d.target === undefined ? '' : ` <code>${escapeHtml(d.target)}</code>`}${d.fix === undefined ? '' : ` → ${escapeHtml(d.fix)}`}</li>`).join('');
  return `<section data-diagnostics><p>${summary}</p>${items === '' ? '' : `<ul>${items}</ul>`}</section>`;
}

/** The drawing of a chart takes the width of the text; with both themes, the one of the system shows (class 3). */
function chartRules(options: ExportOptions): string {
  return 'figure[data-kind="chart"] svg { display: block; width: 100%; height: auto; }\n' +
    (options.theme !== undefined ? '' : '[data-chart-theme="dark"] { display: none; }\n@media (prefers-color-scheme: dark) { [data-chart-theme="light"] { display: none; } [data-chart-theme="dark"] { display: block; } }\n');
}

/** The fixed drawing of the diagnostics list, in the preview only. */
const PREVIEW_RULES =
  '[data-diagnostics] { font-family: "Source Sans 3", sans-serif; font-size: 10pt; line-height: 1.4; margin-bottom: 18pt; padding: 6pt 9pt; border: 0.75pt solid #c9ccd1; border-radius: 4pt; color: #1f2328; background: #f6f7f9; }\n' +
  '[data-diagnostics] [data-severity="error"] strong { color: #b42318; }\n' +
  '[data-diagnostics] [data-severity="warning"] strong { color: #8a4b00; }\n' +
  // The frame of the preview, not the document: its own colors in the two themes, readable on the dark page.
  '@media (prefers-color-scheme: dark) { [data-diagnostics] { color: #e6e6ea; background: #232327; border-color: #3f3f46; } [data-diagnostics] [data-severity="error"] strong { color: #ff8a80; } [data-diagnostics] [data-severity="warning"] strong { color: #f0b060; } }\n' +
  '[data-diagnostics] ul { margin-left: 18pt; }\n' +
  '[data-diagnostics] code { font-family: "Source Code Pro", monospace; }\n' +
  '[data-gone] { font-family: "Source Sans 3", sans-serif; font-weight: 700; margin-bottom: 12pt; }\n';

/**
 * The pieces of the page, in order. A number stands for the length in bytes of
 * an image in base64, when `encode` is false: the counting pass.
 */
/**
 * The page in two passes over the body: the first, without output, finds the base
 * fonts the nodes use, so that the head embeds only those (§11.4).
 */
function* page(tree: ResolvedTree, rootId: string, assets: ReadonlyMap<string, ExportAsset>, options: ExportOptions, encode: boolean): Generator<string | number> {
  const used = new Set<string>();
  for (const _ of pieces(tree, rootId, assets, options, false, used, null)) {
    // Only the fonts are wanted here.
  }
  yield* pieces(tree, rootId, assets, options, encode, new Set(), used);
}

function* pieces(
  tree: ResolvedTree,
  rootId: string,
  assets: ReadonlyMap<string, ExportAsset>,
  options: ExportOptions,
  encode: boolean,
  used: Set<string>,
  headFonts: ReadonlySet<string> | null,
): Generator<string | number> {
  const article = tree.nodes?.find((node) => node.id === rootId && node.kind === 'article' && node.directive !== true);
  if (!article) throw new Error(`no article ${rootId}`);
  const { ids, embeds } = pageIds(article);
  const content = article.content ?? [];
  const first = content[0];
  const titleInPage = Array.isArray(first) && first[0] === 'title';
  const documentLang = tree.document?.attributes?.lang;
  const titleAttribute = article.attributes?.title;
  const pageTitle = typeof titleAttribute === 'string' && titleAttribute !== '' ? titleAttribute : (article.id ?? article.file);

  const preview = options.preview;
  const head =
    '<!DOCTYPE html>\n' +
    `<html lang="${typeof documentLang === 'string' && LANG_FORM.test(documentLang) ? escapeHtml(documentLang) : ''}">` +
    '<head><meta charset="utf-8">' +
    // The preview has no CSP in the file: the server sends it as a header (§11.6).
    (preview ? '' : `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">`) +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<title>${escapeHtml(pageTitle)}</title>` +
    (preview ? preview.scriptUrls.map((url) => `<script src="${escapeHtml(url)}" defer></script>`).join('') : '') +
    `<style>\n${styleSheet(options)}${JSON.stringify(content).includes('["chart",') ? chartRules(options) : ''}${preview ? PREVIEW_RULES : ''}`;
  if (headFonts !== null) {
    yield head;
    yield* fontFaces(headFonts, options.fonts, encode, preview);
  }
  let buffer = '</style></head><body>';
  if (preview) {
    buffer += diagnosticsList(preview.diagnostics);
    // The list is drawn with the sans-serif and monospace base fonts.
    used.add('sans-serif/normal').add('monospace/normal');
  }

  const rootRule = finalStyles('root', { light: {}, dark: {} }, {});
  const articleStyle = finalStyles('root', rootRule, article);
  noteFonts(articleStyle.light, used);
  buffer +=
    `<article data-kind="article"${article.id !== undefined && ids.has(article.id) ? ` id="${escapeHtml(article.id)}"` : ''}` +
    (preview && article.id !== undefined ? ` data-node="${escapeHtml(article.id)}"` : '') +
    `${langAttribute(article.attributes?.lang)}${classAttribute(article.attributes?.class)} style="${escapeHtml(styleAttribute(articleStyle, options.theme))}">`;

  const stack: Task[] = [{ type: 'text', text: '</article></body></html>\n' }];
  const rootContext: Context = { shift: titleInPage ? 1 : 0, depth: 0, ...(article.id !== undefined ? { node: article.id } : {}) };
  for (let i = content.length - 1; i >= 0; i--) stack.push({ type: 'node', item: content[i]!, parent: articleStyle, context: rootContext });

  while (stack.length > 0) {
    if (buffer.length >= FLUSH) {
      yield buffer;
      buffer = '';
    }
    const task = stack.pop()!;
    if (task.type === 'text') {
      buffer += task.text;
      continue;
    }
    if (task.type === 'image') {
      if (buffer !== '') yield buffer;
      buffer = '';
      if (!encode) {
        yield 4 * Math.ceil(task.bytes.length / 3);
        continue;
      }
      for (let offset = 0; offset < task.bytes.length; offset += BASE64_BLOCK) {
        const block = task.bytes.subarray(offset, Math.min(offset + BASE64_BLOCK, task.bytes.length));
        yield Buffer.from(block.buffer, block.byteOffset, block.byteLength).toString('base64');
      }
      continue;
    }
    const element = asElement(task.item);
    if (typeof element === 'string') {
      buffer += escapeHtml(element);
      continue;
    }
    const { attributes } = element;
    // Nodes without an element: where a chapter comes back, and code to run without echo.
    if (element.type === 'embed' && attributes.recursion === true) continue;
    if (element.type === 'code' && attributes.eval === true && attributes.echo !== true) continue;

    const type =
      element.type === 'title' ? `title-${task.context.depth === 0 ? 0 : Math.min(task.context.depth, 3)}`
        : element.type === 'embed' && attributes.kind === 'image' ? 'image' : element.type;
    const style = finalStyles(type, task.parent, attributes);
    noteFonts(style.light, used);
    // In the preview each node element says which object it belongs to and where it is written.
    const node = element.type === 'embed' ? String(attributes.id) : task.context.node;
    const marks = preview ? `${node === undefined ? '' : ` data-node="${escapeHtml(node)}"`}${sourceAttribute(attributes.sourcePosition)}` : '';
    const styled = `${marks} style="${escapeHtml(styleAttribute(style, options.theme))}"`;
    let context = task.context;
    let open: string;
    let close: string;
    let children = element.children;
    let afterOpen: Task[] = [];

    switch (element.type) {
      case 'title': {
        if (task.context.depth === 0) {
          open = `<h1${styled}>`;
          close = '</h1>';
          break;
        }
        const level = task.context.depth + task.context.shift;
        open = `<h${Math.min(level, 6)}${level > 6 ? ` aria-level="${level}"` : ''}${styled}>`;
        close = `</h${Math.min(level, 6)}>`;
        if (task.context.number !== undefined) open += `<span data-number>${escapeHtml(task.context.number)}</span> `;
        break;
      }
      case 'embed': {
        if (attributes.unresolved === true) {
          open = `<div data-unresolved${classAttribute(attributes.class)}${styled}>`;
          close = '</div>';
          children = [`![[${String(attributes.id)}]]`];
          break;
        }
        const kind = String(attributes.kind);
        context = { ...context, node: String(attributes.id) };
        const common =
          `${embeds.has(task.item) ? ` id="${escapeHtml(String(attributes.id))}"` : ''}` +
          `${langAttribute(attributes.lang)}${classAttribute(attributes.class)}${styled}`;
        if (kind === 'chapter') {
          open = `<section data-kind="chapter"${common}>`;
          close = '</section>';
          if (typeof attributes.depth === 'number') {
            context = { ...context, depth: attributes.depth };
            if (typeof attributes.number === 'string') context.number = attributes.number;
            else delete context.number;
          }
        } else if (kind === 'image') {
          const asset = typeof attributes.asset === 'string' ? assets.get(attributes.asset) : undefined;
          if (preview && typeof attributes.asset === 'string' && asset !== undefined && !('fallback' in asset)) {
            // In the preview a recognised image is an address the runtime serves.
            open = `<figure data-kind="image"${common}><img src="${escapeHtml(preview.assetUrl(attributes.asset))}" alt="${escapeHtml(plainText(children))}">`;
            children = [];
          } else if (asset && 'bytes' in asset) {
            open = `<figure data-kind="image"${common}><img src="data:${asset.mime};base64,`;
            afterOpen = [{ type: 'image', bytes: asset.bytes }, { type: 'text', text: `" alt="${escapeHtml(plainText(children))}">` }];
            children = [];
          } else {
            const fallback = asset ? asset.fallback : 'none';
            open = `<figure data-kind="image" data-image-fallback="${fallback}"${common}>`;
          }
          close = '</figure>';
        } else if (kind === 'chart') {
          // The drawing of the runtime, without script: in the two themes, or in the one asked;
          // the description is its name for screen readers, and the static fallback without it (class 3).
          const chart = children.find((child) => Array.isArray(child) && child[0] === 'chart');
          const drawing = Array.isArray(chart) && chart[1] !== null && typeof chart[1] === 'object' ? (chart[1] as { drawing?: { light: string; dark: string } }).drawing : undefined;
          const description = children.filter((child) => child !== chart);
          if (drawing !== undefined) {
            const svg = (theme: Theme) => drawing[theme].replace('<svg ', `<svg role="img" aria-label="${escapeHtml(plainText(description))}" `);
            open = `<figure data-kind="chart"${common}>` + (options.theme !== undefined ? svg(options.theme) : `<div data-chart-theme="light">${svg('light')}</div><div data-chart-theme="dark">${svg('dark')}</div>`);
            children = [];
          } else {
            open = `<figure data-kind="chart" data-chart-fallback${common}>`;
            children = description;
          }
          close = '</figure>';
        } else if (kind === 'collection') {
          // The table, with the description in its caption for screen readers; without data, the description as fallback.
          const table = children.find((child) => Array.isArray(child) && child[0] === 'table');
          if (table !== undefined) {
            open = `<div data-kind="collection"${common}>`;
            context = { ...context, caption: children.filter((child) => child !== table) };
            children = [table];
          } else {
            open = `<figure data-kind="collection" data-collection-fallback${common}>`;
          }
          close = table !== undefined ? '</div>' : '</figure>';
        } else {
          open = `<div data-kind="${escapeHtml(kind)}"${common}>`;
          close = '</div>';
        }
        break;
      }
      case 'paragraph': [open, close] = [`<p${styled}>`, '</p>']; break;
      case 'heading': {
        const level = Math.min(Math.max(Number(attributes.depth) || 1, 1), 6);
        [open, close] = [`<h${level}${styled}>`, `</h${level}>`];
        break;
      }
      case 'list':
        if (attributes.ordered === true) {
          const start = typeof attributes.start === 'number' ? ` start="${attributes.start}"` : '';
          [open, close] = [`<ol${start}${styled}>`, '</ol>'];
        } else [open, close] = [`<ul${styled}>`, '</ul>'];
        break;
      case 'listItem': [open, close] = [`<li${styled}>`, '</li>']; break;
      case 'blockquote': [open, close] = [`<blockquote${styled}>`, '</blockquote>']; break;
      case 'break': [open, close] = [`<br${styled}>`, '']; break;
      case 'thematicBreak': [open, close] = [`<hr${styled}>`, '']; break;
      case 'code': {
        const lang = typeof attributes.lang === 'string' ? ` data-lang="${escapeHtml(attributes.lang)}"` : '';
        const marks = `${attributes.eval === true ? ' data-eval' : ''}${attributes.echo === true ? ' data-echo' : ''}`;
        [open, close] = [`<pre${lang}${marks}${styled}><code>`, '</code></pre>'];
        break;
      }
      case 'table': {
        open = `<table${styled}>`;
        close = children.length > 1 ? '</tbody></table>' : '</thead></table>';
        // The first row is the header: the others go in tbody, with td.
        const rows = children;
        children = [];
        const { caption, ...inner } = context;
        afterOpen = rows.map((row, index) => ({
          type: 'node' as const,
          item: row,
          parent: style,
          context: { ...inner, cell: index === 0 ? ('th' as const) : ('td' as const) },
        }));
        if (rows.length > 1) afterOpen.splice(1, 0, { type: 'text', text: '</thead><tbody>' });
        // A table cut short (the preview, a card): a last row says how many records are left (§12.4).
        if (typeof attributes.moreRecords === 'number' && rows.length > 1) {
          const width = Array.isArray(rows[0]) ? rows[0].length - (rows[0][1] !== null && typeof rows[0][1] === 'object' && !Array.isArray(rows[0][1]) ? 2 : 1) : 1;
          afterOpen.push({ type: 'text', text: `<tr data-more-records><td colspan="${width}">${escapeHtml(String(attributes.moreLabel ?? ''))}</td></tr>` });
        }
        // The description of a collection: a caption, which screen readers read with the table and the PDF keeps; hidden on screen and paper.
        afterOpen.unshift(
          ...(caption && caption.length > 0
            ? [{ type: 'text' as const, text: '<caption data-description>' }, ...caption.map((item) => ({ type: 'node' as const, item, parent: style, context: inner })), { type: 'text' as const, text: '</caption>' }]
            : []),
          { type: 'text', text: '<thead>' },
        );
        break;
      }
      case 'tableRow': {
        [open, close] = [`<tr${styled}>`, '</tr>'];
        break;
      }
      case 'tableCell': {
        const cell = task.context.cell ?? 'td';
        // A value of a collection that is not of its type is shown as written, and marked (class 2).
        [open, close] = [`<${cell}${attributes.invalid === true ? ' data-invalid' : ''}${styled}>`, `</${cell}>`];
        break;
      }
      case 'emphasis': [open, close] = [`<em${styled}>`, '</em>']; break;
      case 'strong': [open, close] = [`<strong${styled}>`, '</strong>']; break;
      case 'inlineCode': [open, close] = [`<code${styled}>`, '</code>']; break;
      case 'hyperlink': {
        let href = '';
        let marker = '';
        if (attributes.unresolved === true) marker = ' data-unresolved';
        else if (typeof attributes.ref === 'string') href = ids.has(attributes.ref) ? ` href="#${escapeHtml(attributes.ref)}"` : '';
        else if (typeof attributes.url === 'string') {
          const safe = safeHref(attributes.url, ids);
          if (safe !== null) href = ` href="${escapeHtml(safe)}"`;
        }
        [open, close] = [`<a${href}${marker}${styled}>`, '</a>'];
        break;
      }
      case 'mathLine': {
        const expression = plainText(children);
        if (attributes.invalid === true) {
          [open, close] = [`<span data-math-line-invalid${styled}>`, '</span>'];
        } else {
          [open, close] = [`<span data-math-line title="${escapeHtml(expression)}"${styled}>`, '</span>'];
          children = [String(attributes.display ?? '')];
        }
        break;
      }
      default:
        throw new Error(`no HTML for the type ${element.type}`);
    }
    buffer += open;
    stack.push({ type: 'text', text: close });
    for (let i = children.length - 1; i >= 0; i--) stack.push({ type: 'node', item: children[i]!, parent: style, context });
    for (let i = afterOpen.length - 1; i >= 0; i--) stack.push(afterOpen[i]!);
  }
  if (buffer !== '') yield buffer;
}

/** The page as pieces of text, to write one after the other. */
export function* staticExport(tree: ResolvedTree, rootId: string, assets: ReadonlyMap<string, ExportAsset>, options: ExportOptions = {}): Generator<string> {
  for (const piece of page(tree, rootId, assets, options, true)) yield piece as string;
}

function utf8Length(text: string): number {
  let length = 0;
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit < 0x80) length += 1;
    else if (unit < 0x800) length += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff) {
      length += 4;
      i++;
    } else length += 3;
  }
  return length;
}

/** The length in bytes of the page, without encoding the images. */
export function staticExportSize(tree: ResolvedTree, rootId: string, assets: ReadonlyMap<string, ExportAsset>, options: ExportOptions = {}): number {
  let size = 0;
  for (const piece of page(tree, rootId, assets, options, false)) size += typeof piece === 'number' ? piece : utf8Length(piece);
  return size;
}

/** The @font-face of one base font, as the page writes it: for the page number of the print. */
export function baseFontFace(generic: GenericFamily, style: 'normal' | 'italic', fonts: ReadonlyMap<string, Uint8Array>): string {
  return [...fontFaces(new Set([`${generic}/${style}`]), fonts, true)].join('');
}
