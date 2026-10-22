// The reference renderer: one HTML file for an article of the resolved tree, with
// the CSS and the images inside (§11.4). It reads the tree and computes nothing
// but the inheritance of §0.5; the mapping is in the README of the runtime.
import { BASE_STYLESHEET_RULES, INHERITED_PROPERTIES, NOT_INHERITED_DEFAULTS, PAGE_BACKGROUND, STYLE_PROPERTIES, type Theme } from './base-stylesheet.js';
import { CLASS_FORM, ID_FORM, LANG_FORM, type JsonML, type ResolvedTree, type TreeNode } from './tree.js';

/** An image read by the cli, or why it is not embedded. */
export type ExportAsset = { mime: string; bytes: Uint8Array } | { fallback: 'format' | 'unreadable' | 'size' };

export interface ExportOptions {
  /** With --allow-errors the page marks the pieces that do not resolve. */
  allowErrors?: boolean;
  /** One theme fixed with --theme; without it the page has both and follows the viewer (§11.4). */
  theme?: Theme;
}

/** Base64 in blocks of 3·16384 bytes: each block is a whole number of base64 quads. */
const BASE64_BLOCK = 3 * 16384;
const FLUSH = 1 << 16;

type Style = Record<string, string>;

const RESET_ELEMENTS = [
  'html', 'body', 'article', 'section', 'div', 'figure', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol',
  'li', 'blockquote', 'br', 'hr', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'em', 'strong', 'a', 'span',
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
    (options.allowErrors === true ? '[data-unresolved] { outline: 0.75pt dashed currentColor; }\n' : '')
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
      items.push(generic);
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
}

/**
 * The pieces of the page, in order. A number stands for the length in bytes of
 * an image in base64, when `encode` is false: the counting pass.
 */
function* pieces(tree: ResolvedTree, rootId: string, assets: ReadonlyMap<string, ExportAsset>, options: ExportOptions, encode: boolean): Generator<string | number> {
  const article = tree.nodes?.find((node) => node.id === rootId && node.kind === 'article' && node.directive !== true);
  if (!article) throw new Error(`no article ${rootId}`);
  const { ids, embeds } = pageIds(article);
  const content = article.content ?? [];
  const first = content[0];
  const titleInPage = Array.isArray(first) && first[0] === 'title';
  const documentLang = tree.document?.attributes?.lang;
  const titleAttribute = article.attributes?.title;
  const pageTitle = typeof titleAttribute === 'string' && titleAttribute !== '' ? titleAttribute : (article.id ?? article.file);

  let buffer =
    '<!DOCTYPE html>\n' +
    `<html lang="${typeof documentLang === 'string' && LANG_FORM.test(documentLang) ? escapeHtml(documentLang) : ''}">` +
    '<head><meta charset="utf-8">' +
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">` +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<title>${escapeHtml(pageTitle)}</title>` +
    `<style>\n${styleSheet(options)}</style></head><body>`;

  const rootRule = finalStyles('root', { light: {}, dark: {} }, {});
  const articleStyle = finalStyles('root', rootRule, article);
  buffer +=
    `<article data-kind="article"${article.id !== undefined && ids.has(article.id) ? ` id="${escapeHtml(article.id)}"` : ''}` +
    `${langAttribute(article.attributes?.lang)}${classAttribute(article.attributes?.class)} style="${escapeHtml(styleAttribute(articleStyle, options.theme))}">`;

  const stack: Task[] = [{ type: 'text', text: '</article></body></html>\n' }];
  const rootContext: Context = { shift: titleInPage ? 1 : 0, depth: 0 };
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
    const styled = ` style="${escapeHtml(styleAttribute(style, options.theme))}"`;
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
          if (asset && 'bytes' in asset) {
            open = `<figure data-kind="image"${common}><img src="data:${asset.mime};base64,`;
            afterOpen = [{ type: 'image', bytes: asset.bytes }, { type: 'text', text: `" alt="${escapeHtml(plainText(children))}">` }];
            children = [];
          } else {
            const fallback = asset ? asset.fallback : 'none';
            open = `<figure data-kind="image" data-image-fallback="${fallback}"${common}>`;
          }
          close = '</figure>';
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
        open = `<table${styled}><thead>`;
        close = children.length > 1 ? '</tbody></table>' : '</thead></table>';
        // The first row is the header: the others go in tbody, with td.
        const rows = children;
        children = [];
        afterOpen = rows.map((row, index) => ({
          type: 'node' as const,
          item: row,
          parent: style,
          context: { ...context, cell: index === 0 ? ('th' as const) : ('td' as const) },
        }));
        if (rows.length > 1) afterOpen.splice(1, 0, { type: 'text', text: '</thead><tbody>' });
        break;
      }
      case 'tableRow': {
        [open, close] = [`<tr${styled}>`, '</tr>'];
        break;
      }
      case 'tableCell': {
        const cell = task.context.cell ?? 'td';
        [open, close] = [`<${cell}${styled}>`, `</${cell}>`];
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
  for (const piece of pieces(tree, rootId, assets, options, true)) yield piece as string;
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
  for (const piece of pieces(tree, rootId, assets, options, false)) size += typeof piece === 'number' ? piece : utf8Length(piece);
  return size;
}
