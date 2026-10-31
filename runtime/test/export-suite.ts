// The export suite, without a browser: runs `export` on the folders of
// test/fixtures/export and checks the page against the resolved tree. The
// expected values are computed here, with the base stylesheet read from §0.5
// of the spec, never imported from src/.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';
import { HtmlValidate } from 'html-validate';
import { parse } from 'parse5';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '../..');
const cliPath = join(packageRoot, 'dist/src/cli.js');
const fixtures = join(packageRoot, 'test/fixtures/export');
const specPath = join(packageRoot, '../docs/specifica.md');

// The tree, as the cli prints it.

type Json = string | [string, ...unknown[]];
interface Diagnostic { severity: string; code: string; file: string; target?: string; fix?: string }
interface TreeNode { id?: string; kind: string; directive?: boolean; file: string; attributes?: Record<string, unknown>; computedStyle?: Record<string, string>; content?: Json[] }
interface Tree { nodes?: TreeNode[]; diagnostics?: Diagnostic[]; document?: { attributes?: Record<string, unknown> } }
interface Item { type: string; attributes: Record<string, unknown>; children: Json[] }

function item(json: Json): Item | string {
  if (typeof json === 'string') return json;
  const [type, second, ...rest] = json;
  if (second !== null && typeof second === 'object' && !Array.isArray(second)) return { type, attributes: second as Record<string, unknown>, children: rest as Json[] };
  return { type, attributes: {}, children: (second === undefined ? [] : [second, ...rest]) as Json[] };
}

// The DOM of parse5, as far as the suite needs it.

interface DomNode { nodeName: string; tagName?: string; attrs?: Array<{ name: string; value: string }>; childNodes?: DomNode[]; value?: string; content?: DomNode }
const elements = (node: DomNode) => (node.childNodes ?? []).filter((child) => child.tagName !== undefined);
const attributesOf = (node: DomNode) => Object.fromEntries((node.attrs ?? []).map((a) => [a.name, a.value]));
function* allElements(node: DomNode): Generator<DomNode> {
  for (const child of node.childNodes ?? []) {
    if (child.tagName !== undefined) yield child;
    yield* allElements(child);
  }
}

// The base stylesheet and the properties, from §0.5 of the spec.

const ORDER = ['font-family', 'font-size', 'font-weight', 'font-style', 'color', 'text-align', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'line-height', 'text-decoration-line'];
const INHERITED = ['font-family', 'font-size', 'font-weight', 'font-style', 'color', 'text-align', 'line-height'];

type Theme = 'light' | 'dark';

/** The rules of the block, with the ones of `@media (prefers-color-scheme: dark)` marked. */
function readBaseStylesheet(): Array<{ types: string[]; declarations: Array<[string, string]>; dark: boolean }> {
  const spec = readFileSync(specPath, 'utf8');
  const start = spec.indexOf('**Il `base stylesheet`.**');
  const open = spec.indexOf('```\n', start) + 4;
  const block = spec.slice(open, spec.indexOf('```', open));
  const media = block.indexOf('@media (prefers-color-scheme: dark)');
  const rules = (text: string, dark: boolean) => [...text.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((match) => ({
    types: match[1]!.split(',').map((t) => t.trim()),
    declarations: match[2]!.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
      const colon = d.indexOf(':');
      return [d.slice(0, colon).trim(), d.slice(colon + 1).trim()] as [string, string];
    }),
    dark,
  }));
  if (media < 0) return rules(block, false);
  return [...rules(block.slice(0, media), false), ...rules(block.slice(block.indexOf('{', media) + 1, block.lastIndexOf('}')), true)];
}
const BASE = readBaseStylesheet();

type Style = Record<string, string>;
/** The values of the two themes: they differ only in the color. */
type Styles = Record<Theme, Style>;
function expectedStyle(type: string, parent: Style, attributes: { computedStyle?: unknown; darkComputedStyle?: unknown }, theme: Theme): Style {
  const style: Style = {};
  for (const p of INHERITED) style[p] = parent[p]!;
  for (const p of ['margin-top', 'margin-right', 'margin-bottom', 'margin-left']) style[p] = '0pt';
  style['text-decoration-line'] = 'none';
  for (const rule of BASE) {
    if (rule.dark && theme === 'light') continue;
    if (rule.types.includes(type)) for (const [p, v] of rule.declarations) style[p] = v;
  }
  for (const [p, v] of Object.entries((attributes.computedStyle ?? {}) as Style)) {
    if (ORDER.includes(p) && !(p === 'color' && theme === 'dark')) style[p] = v;
  }
  if (theme === 'dark') {
    const dark = (attributes.darkComputedStyle ?? {}) as Style;
    if (dark.color !== undefined) style.color = dark.color;
  }
  return style;
}
const expectedStyles2 = (type: string, parent: Styles, attributes: { computedStyle?: unknown; darkComputedStyle?: unknown }): Styles =>
  ({ light: expectedStyle(type, parent.light, attributes, 'light'), dark: expectedStyle(type, parent.dark, attributes, 'dark') });
const ROOT_RULE = expectedStyles2('root', { light: {}, dark: {} }, {});

/** The family names of a tree value («, », "name") or of a CSS value (strings with escapes). */
function families(value: string, css: boolean): string[] {
  const names: string[] = [];
  let i = 0;
  while (i < value.length) {
    if (value[i] === '"') {
      let name = '';
      for (i++; value[i] !== '"'; i++) {
        if (css && value[i] === '\\') {
          const hex = /^[0-9a-fA-F]{1,6} ?/.exec(value.slice(i + 1));
          if (hex) {
            name += String.fromCodePoint(parseInt(hex[0].trim(), 16));
            i += hex[0].length;
          } else name += value[++i];
        } else name += value[i];
      }
      names.push(`"${name}"`);
      i++;
    } else {
      const end = value.indexOf(',', i);
      names.push(value.slice(i, end < 0 ? value.length : end).trim());
      i = end < 0 ? value.length : end;
    }
    while (value[i] === ',' || value[i] === ' ') i++;
  }
  return names;
}

function parseStyleAttribute(text: string): Array<[string, string]> {
  // Values never contain «; » outside strings in this suite's fixtures.
  return text.split('; ').map((d) => [d.slice(0, d.indexOf(':')), d.slice(d.indexOf(':') + 2)] as [string, string]);
}

// Text: the substitution of the mapping, applied to the expected side.

function cleanText(text: string): string {
  return Array.from(text.replace(/\r\n?/g, '\n'), (char) => {
    const code = char.codePointAt(0)!;
    const bad = (code < 0x20 && code !== 9 && code !== 10) || (code >= 0x7f && code <= 0x9f) || (code >= 0xd800 && code <= 0xdfff) ||
      (code >= 0xfdd0 && code <= 0xfdef) || (code & 0xfffe) === 0xfffe;
    return bad ? '�' : char;
  }).join('');
}

const ID_FORM = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const LANG_FORM = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{1,8})*$/;
const CLASS_FORM = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const BLOCK_TYPES = new Set(['paragraph', 'heading', 'list', 'listItem', 'blockquote', 'code', 'table', 'tableRow', 'tableCell', 'thematicBreak', 'embed', 'title']);
const BLOCK_TAGS = new Set(['article', 'section', 'div', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'blockquote', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr']);
/** Spaces in pre stay visible through the comparison. */
const keepSpaces = (text: string) => text.replace(/ /g, '·').replace(/\n/g, '⏎').replace(/\t/g, '⇥');
const squeeze = (text: string) => text.replace(/\s+/g, ' ').trim();

/** How the suite expects each image: a media type and the file, or a fallback. */
type ImageExpectation = { mime: string; file: string } | { fallback: string };

interface Page {
  label: string;
  html: string;
  tree: Tree;
  rootId: string;
  images: Record<string, ImageExpectation>;
  folder: string;
  /** --theme; undefined for the page with both themes. */
  theme?: Theme;
}

// Links: each URL of the fixtures and its href, null for none.
const URLS: Record<string, string | null> = {
  'JaVa\tScript:alert(1)': null,
  '//host/x': null,
  '/etc/passwd': null,
  '../x': null,
  'file:///etc/passwd': null,
  'data:text/html,x': null,
  '#inesistente': null,
  'allegato.pdf': null,
  '#cap-a': '#cap-a',
  'https://Example.com/x?q=1': 'https://example.com/x?q=1',
  'mailto:a@b.it': 'mailto:a@b.it',
  'http://x.it': 'http://x.it/',
  'https://example.com': 'https://example.com/',
};

/** Structure, style, text and links: a parallel walk of the tree and the DOM (checks d, e, f). */
function checkStructure(page: Page, body: DomNode, problems: string[], record?: Map<DomNode, Styles>): void {
  const article = page.tree.nodes!.find((n) => n.id === page.rootId && n.kind === 'article')!;
  const ids = new Set<string>();
  const firstEmbeds = new Set<unknown>();
  if (article.id && ID_FORM.test(article.id)) ids.add(article.id);
  const visit = (json: Json) => {
    const it = item(json);
    if (typeof it === 'string') return;
    const { id, unresolved, recursion } = it.attributes;
    if (it.type === 'embed' && unresolved !== true && recursion !== true && typeof id === 'string' && ID_FORM.test(id) && !ids.has(id)) {
      ids.add(id);
      firstEmbeds.add(json);
    }
    it.children.forEach(visit);
  };
  (article.content ?? []).forEach(visit);
  const titleInPage = Array.isArray(article.content?.[0]) && article.content[0][0] === 'title';
  const shift = titleInPage ? 1 : 0;
  let nodeElements = 0;
  let links = 0;

  const fail = (where: string, message: string): void => {
    problems.push(`${page.label}: ${where}: ${message}`);
  };
  const sameAttributes = (where: string, dom: DomNode, expected: Record<string, string>) => {
    const actual = attributesOf(dom);
    delete actual.style;
    if (JSON.stringify(Object.entries(actual).sort()) !== JSON.stringify(Object.entries(expected).sort())) {
      fail(where, `attributes ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    }
  };
  // With both themes the color goes through --color, with the two final colors beside it.
  const order = page.theme === undefined ? ORDER.flatMap((p) => (p === 'color' ? ['color', '--color-light', '--color-dark'] : [p])) : ORDER;
  const checkStyle = (where: string, dom: DomNode, styles: Styles) => {
    nodeElements++;
    record?.set(dom, styles);
    const style: Style = page.theme === undefined
      ? { ...styles.light, 'color': 'var(--color)', '--color-light': styles.light.color!, '--color-dark': styles.dark.color! }
      : styles[page.theme];
    const text = attributesOf(dom).style;
    if (text === undefined) return fail(where, 'no style');
    const declarations = parseStyleAttribute(text);
    if (declarations.map(([p]) => p).join() !== order.join()) return fail(where, `properties ${declarations.map(([p]) => p).join()}`);
    for (const [property, value] of declarations) {
      const same = property === 'font-family'
        ? JSON.stringify(families(value, true)) === JSON.stringify(withBaseFonts(families(style[property]!, false)))
        : value === style[property];
      if (!same) fail(where, `${property}: ${value}, expected ${style[property]}`);
    }
  };
  const imageOf = (attributes: Record<string, unknown>): ImageExpectation =>
    typeof attributes.asset === 'string' ? page.images[String(attributes.id)] ?? { fallback: '?' } : { fallback: 'none' };
  const classes = (value: unknown) => (Array.isArray(value) ? value.filter((c) => CLASS_FORM.test(c)) : []);
  const common = (attributes: Record<string, unknown>, json: Json) => {
    const out: Record<string, string> = {};
    if (firstEmbeds.has(json)) out.id = String(attributes.id);
    if (typeof attributes.lang === 'string' && LANG_FORM.test(attributes.lang)) out.lang = attributes.lang;
    if (classes(attributes.class).length > 0) out.class = classes(attributes.class).join(' ');
    return out;
  };

  /** Whether a tree item has an element, and which one. */
  const hasElement = (it: Item) =>
    !(it.type === 'embed' && it.attributes.recursion === true) && !(it.type === 'code' && it.attributes.eval === true && it.attributes.echo !== true);

  interface Ctx { depth: number; number?: string; cell?: string }

  const treeText = (json: Json, ctx: Ctx): string => {
    const it = item(json);
    if (typeof it === 'string') return cleanText(it);
    if (!hasElement(it)) return '';
    const a = it.attributes;
    let inner: string;
    if (it.type === 'embed' && a.unresolved === true) inner = cleanText(`![[${String(a.id)}]]`);
    else if (it.type === 'embed' && a.kind === 'image' && 'mime' in imageOf(a)) inner = '';
    else if (it.type === 'title') inner = (ctx.depth > 0 && ctx.number ? ctx.number + ' ' : '') + it.children.map((c) => treeText(c, ctx)).join('');
    else if (it.type === 'mathLine') inner = cleanText(a.invalid === true ? String(it.children[0]) : String(a.display));
    else if (it.type === 'break') inner = ' ';
    else if (it.type === 'code') inner = keepSpaces(cleanText(String(it.children[0] ?? '')));
    else {
      const inner2 = it.type === 'embed' && typeof a.depth === 'number' ? { depth: a.depth, number: a.number as string } : ctx;
      inner = it.children.map((c) => treeText(c, inner2)).join('');
    }
    return BLOCK_TYPES.has(it.type) ? ` ${inner} ` : inner;
  };
  const domText = (node: DomNode, pre = false): string => {
    if (node.nodeName === '#text') return pre ? keepSpaces(node.value!) : node.value!;
    if (node.tagName === 'br') return ' ';
    const inner = (node.childNodes ?? []).map((c) => domText(c, pre || node.tagName === 'pre')).join('');
    return BLOCK_TAGS.has(node.tagName ?? '') ? ` ${inner} ` : inner;
  };

  const walk = (json: Json, dom: DomNode, parent: Styles, ctx: Ctx, where: string): void => {
    const it = item(json) as Item;
    const a = it.attributes;
    const type = it.type === 'title' ? `title-${ctx.depth === 0 ? 0 : Math.min(ctx.depth, 3)}`
      : it.type === 'embed' && a.kind === 'image' ? 'image' : it.type;
    const style = expectedStyles2(type, parent, a);
    where = `${where} > ${it.type}${typeof a.id === 'string' ? `#${a.id}` : ''}`;
    let tag: string;
    let expected: Record<string, string> = {};
    let children = it.children;
    let inner = ctx;
    switch (it.type) {
      case 'title': {
        const level = ctx.depth + (ctx.depth === 0 ? 1 : shift);
        tag = `h${Math.min(level, 6)}`;
        if (level > 6) expected['aria-level'] = String(level);
        if (ctx.depth > 0 && ctx.number) {
          const span = elements(dom)[0];
          if (!span || span.tagName !== 'span' || JSON.stringify(attributesOf(span)) !== '{"data-number":""}' || domText(span) !== ctx.number) fail(where, 'no number span');
        }
        children = [];
        break;
      }
      case 'embed':
        if (a.unresolved === true) {
          tag = 'div';
          expected = { 'data-unresolved': '' };
          if (classes(a.class).length > 0) expected.class = classes(a.class).join(' ');
          children = [];
        } else if (a.kind === 'chapter') {
          tag = 'section';
          expected = { 'data-kind': 'chapter', ...common(a, json) };
          if (typeof a.depth === 'number') inner = { depth: a.depth, number: a.number as string };
        } else if (a.kind === 'image') {
          tag = 'figure';
          expected = { 'data-kind': 'image', ...common(a, json) };
          const image = imageOf(a);
          if ('mime' in image) {
            const img = elements(dom)[0];
            const src = `data:${image.mime};base64,${readFileSync(join(page.folder, image.file)).toString('base64')}`;
            const alt = squeeze(it.children.map((c) => treeText(c, ctx)).join(''));
            if (!img || img.tagName !== 'img' || elements(dom).length !== 1) fail(where, 'no img');
            else if (JSON.stringify(attributesOf(img)) !== JSON.stringify({ src, alt })) fail(where, `img ${JSON.stringify(attributesOf(img)).slice(0, 200)}, alt expected ${alt}`);
            children = [];
          } else expected['data-image-fallback'] = image.fallback;
        } else {
          tag = 'div';
          expected = { 'data-kind': String(a.kind), ...common(a, json) };
        }
        break;
      case 'paragraph': tag = 'p'; break;
      case 'heading': tag = `h${Math.min(Number(a.depth), 6)}`; break;
      case 'list':
        tag = a.ordered === true ? 'ol' : 'ul';
        if (typeof a.start === 'number') expected.start = String(a.start);
        break;
      case 'listItem': tag = 'li'; break;
      case 'blockquote': tag = 'blockquote'; break;
      case 'break': tag = 'br'; break;
      case 'thematicBreak': tag = 'hr'; break;
      case 'code': {
        tag = 'pre';
        if (typeof a.lang === 'string') expected['data-lang'] = a.lang;
        if (a.eval === true) expected['data-eval'] = '';
        if (a.echo === true) expected['data-echo'] = '';
        const code = elements(dom);
        if (code.length !== 1 || code[0]!.tagName !== 'code' || code[0]!.attrs!.length !== 0) fail(where, 'no code in pre');
        children = [];
        break;
      }
      case 'table': {
        tag = 'table';
        const sections = elements(dom);
        const rows = it.children;
        const wanted = rows.length > 1 ? ['thead', 'tbody'] : ['thead'];
        if (sections.map((s) => s.tagName).join() !== wanted.join()) fail(where, `sections ${sections.map((s) => s.tagName).join()}`);
        const domRows = [...elements(sections[0]!), ...(sections[1] ? elements(sections[1]) : [])];
        if (domRows.length !== rows.length || elements(sections[0]!).length !== 1) fail(where, 'rows');
        rows.forEach((row, index) => domRows[index] && walk(row, domRows[index], style, { ...ctx, cell: index === 0 ? 'th' : 'td' }, where));
        children = [];
        break;
      }
      case 'tableRow': tag = 'tr'; break;
      case 'tableCell': tag = ctx.cell ?? 'td'; break;
      case 'emphasis': tag = 'em'; break;
      case 'strong': tag = 'strong'; break;
      case 'inlineCode': tag = 'code'; break;
      case 'hyperlink': {
        tag = 'a';
        links++;
        if (a.unresolved === true) expected['data-unresolved'] = '';
        else if (typeof a.ref === 'string') {
          if (ids.has(a.ref)) expected.href = `#${a.ref}`;
        } else {
          if (!(String(a.url) in URLS)) fail(where, `URL ${String(a.url)} not in the table`);
          const href = URLS[String(a.url)];
          if (href) expected.href = href;
        }
        break;
      }
      case 'mathLine':
        tag = 'span';
        if (a.invalid === true) expected['data-math-line-invalid'] = '';
        else expected = { 'data-math-line': '', title: cleanText(String(it.children[0])) };
        children = [];
        break;
      default:
        fail(where, `unknown type ${it.type}`);
        return;
    }
    if (dom.tagName !== tag) return fail(where, `<${dom.tagName}>, expected <${tag}>`);
    sameAttributes(where, dom, expected);
    checkStyle(where, dom, style);
    if (it.type === 'embed') {
      const want = squeeze(treeText(json, ctx));
      const got = squeeze(domText(dom));
      if (want !== got) fail(where, `text\n      dom:  ${got}\n      tree: ${want}`);
    }
    const treeChildren = children.filter((c) => typeof c !== 'string' && hasElement(item(c) as Item));
    const domChildren = it.type === 'title' ? [] : elements(dom);
    if (it.type === 'table' || (it.type === 'embed' && a.kind === 'image' && children.length === 0) || it.type === 'code') return;
    if (treeChildren.length !== domChildren.length) return fail(where, `${domChildren.length} elements, expected ${treeChildren.length}`);
    treeChildren.forEach((child, index) => walk(child, domChildren[index]!, style, inner, where));
  };

  const articleDom = elements(body)[0];
  if (!articleDom || elements(body).length !== 1 || articleDom.tagName !== 'article') return fail('body', 'no single article');
  const articleStyle = expectedStyles2('root', ROOT_RULE, article);
  const articleAttributes: Record<string, string> = { 'data-kind': 'article' };
  if (ids.has(article.id!)) articleAttributes.id = article.id!;
  const lang = article.attributes?.lang;
  if (typeof lang === 'string' && LANG_FORM.test(lang)) articleAttributes.lang = lang;
  if (classes(article.attributes?.class).length > 0) articleAttributes.class = classes(article.attributes?.class).join(' ');
  sameAttributes('article', articleDom, articleAttributes);
  checkStyle('article', articleDom, articleStyle);
  const content = (article.content ?? []).filter((c) => typeof c !== 'string' && hasElement(item(c) as Item));
  if (content.length !== elements(articleDom).length) return fail('article', 'children');
  content.forEach((child, index) => walk(child, elements(articleDom)[index]!, articleStyle, { depth: 0 }, 'article'));
  const whole = (article.content ?? []).map((c) => treeText(c, { depth: 0 })).join('');
  if (squeeze(whole) !== squeeze(domText(articleDom))) fail('article', 'text differs');

  // Style only on node elements; links both ways; every #id points into the page.
  const all = [...allElements(body)];
  const styled = all.filter((e) => attributesOf(e).style !== undefined).length;
  if (styled !== nodeElements) fail('page', `${styled} elements with style, ${nodeElements} node elements`);
  if (all.filter((e) => e.tagName === 'a').length !== links) fail('page', 'links differ');
  const domIds = all.map((e) => attributesOf(e).id).filter((id): id is string => id !== undefined);
  if (new Set(domIds).size !== domIds.length) fail('page', 'duplicate ids');
  for (const e of all) {
    const href = attributesOf(e).href;
    if (href?.startsWith('#') && !domIds.includes(href.slice(1))) fail('page', `href ${href} points nowhere`);
  }
}

const CSP = "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";

/** The base fonts of §0.5 and their files in fonts/, for the generic families. */
const BASE_FONTS: Record<string, { name: string; normal: string; italic: string }> = {
  'serif': { name: 'Source Serif 4', normal: 'SourceSerif4Variable-Roman.ttf.woff2', italic: 'SourceSerif4Variable-Italic.ttf.woff2' },
  'sans-serif': { name: 'Source Sans 3', normal: 'SourceSans3VF-Upright.ttf.woff2', italic: 'SourceSans3VF-Italic.ttf.woff2' },
  'monospace': { name: 'Source Code Pro', normal: 'SourceCodeVF-Upright.ttf.woff2', italic: 'SourceCodeVF-Italic.ttf.woff2' },
};
/** In the style a generic family comes after the name of its base font. */
function withBaseFonts(list: string[]): string[] {
  return list.flatMap((item) => (BASE_FONTS[item] ? [`"${BASE_FONTS[item].name}"`, item] : [item]));
}

/** The @font-face rules of the page must be exactly the base fonts its nodes use, with the bytes of fonts/. */
function checkFontFaces(page: Page, styles: Iterable<Styles>, problems: string[]): void {
  const want = new Set<string>();
  for (const { light } of styles) {
    for (const item of families(light['font-family']!, false)) if (BASE_FONTS[item]) want.add(`${BASE_FONTS[item].name}/${light['font-style']}`);
  }
  const got = new Set<string>();
  for (const match of page.html.matchAll(/@font-face \{ font-family: "([^"]+)"; font-style: (normal|italic); font-weight: 200 900; src: url\(data:font\/woff2;base64,([A-Za-z0-9+/=]*)\) format\("woff2"\); \}/g)) {
    const key = `${match[1]}/${match[2]}`;
    got.add(key);
    const font = Object.values(BASE_FONTS).find((f) => f.name === match[1]);
    const file = font ? join(packageRoot, 'fonts', font[match[2] as 'normal' | 'italic']) : '';
    if (!font || Buffer.from(match[3]!, 'base64').compare(readFileSync(file)) !== 0) problems.push(`${page.label}: @font-face ${key} is not the base font`);
  }
  if ((page.html.match(/@font-face/g) ?? []).length !== got.size) problems.push(`${page.label}: @font-face out of form`);
  if ([...want].sort().join() !== [...got].sort().join()) problems.push(`${page.label}: fonts ${[...got].sort().join()}, expected ${[...want].sort().join()}`);
}
const VALIDATOR = new HtmlValidate({
  root: true,
  extends: ['html-validate:recommended', 'html-validate:document'],
  rules: {
    'no-inline-style': 'off',
    'valid-id': ['error', { relaxed: true }],
    'long-title': 'off',
    'no-trailing-whitespace': 'off',
    'wcag/h30': 'off',
    'heading-level': ['error', { allowMultipleH1: true }],
  },
});

/** Checks c, d, e, f, g and h on a page. */
async function checkPage(page: Page, problems: string[], outside?: Buffer): Promise<void> {
  const report = await VALIDATOR.validateString(page.html);
  for (const result of report.results) for (const m of result.messages) problems.push(`${page.label}: html-validate ${m.ruleId}: ${m.message}`);
  const parseErrors: string[] = [];
  const document = parse(page.html, { onParseError: (error) => parseErrors.push(error.code) }) as unknown as DomNode;
  if (parseErrors.length > 0) problems.push(`${page.label}: parse5 ${parseErrors.join(', ')}`);
  const html = elements(document)[0]!;
  const [head, body] = elements(html);
  // g. Security.
  const headTags = elements(head!).map((e) => e.tagName).join();
  if (headTags !== 'meta,meta,meta,title,style') problems.push(`${page.label}: head ${headTags}`);
  const csp = attributesOf(elements(head!)[1]!);
  if (csp['http-equiv'] !== 'Content-Security-Policy' || csp.content !== CSP) problems.push(`${page.label}: CSP`);
  for (const e of allElements(document)) {
    if (['script', 'iframe', 'object', 'embed', 'base', 'form'].includes(e.tagName!)) problems.push(`${page.label}: <${e.tagName}>`);
    for (const name of Object.keys(attributesOf(e))) if (name.startsWith('on')) problems.push(`${page.label}: attribute ${name}`);
  }
  if (outside && (page.html.includes(outside.toString('latin1')) || page.html.includes(outside.toString('base64')))) {
    problems.push(`${page.label}: bytes of a file outside the folder`);
  }
  if (!page.html.endsWith('</html>\n')) problems.push(`${page.label}: end`);
  if (page.html.includes('&#')) problems.push(`${page.label}: a numeric character reference`);
  const themeRules = page.theme === undefined
    ? ['html { background: #ffffff; color-scheme: light dark; }', '@media (prefers-color-scheme: dark) { html { background: #1e1e1e; } }',
      '* { --color: var(--color-light); }', '@media (prefers-color-scheme: dark) { * { --color: var(--color-dark); } }']
    : [`html { background: ${page.theme === 'light' ? '#ffffff' : '#1e1e1e'}; color-scheme: ${page.theme}; }`];
  for (const rule of themeRules) if (!page.html.includes(`\n${rule}\n`)) problems.push(`${page.label}: no rule ${rule}`);
  if (page.html.includes('!important')) problems.push(`${page.label}: !important`);
  const record = new Map<DomNode, Styles>();
  checkStructure(page, body!, problems, record);
  checkFontFaces(page, record.values(), problems);
}

/**
 * The expected final values of each node element of a page, with its index among
 * all the elements in document order: the browser suite finds them there.
 */
export function expectedStyles(label: string, html: string, folder: string, rootId: string, images: Record<string, ImageExpectation>): Array<{ index: number; tag: string; styles: Styles }> {
  const document = parse(html) as unknown as DomNode;
  const body = elements(elements(document)[0]!)[1]!;
  const record = new Map<DomNode, Styles>();
  const problems: string[] = [];
  checkStructure({ label, html, tree: treeOf(folder), rootId, images, folder }, body, problems, record);
  if (problems.length > 0) throw new Error(problems.join('\n'));
  const order = [...allElements(document)];
  return [...record].map(([dom, styles]) => ({ index: order.indexOf(dom), tag: dom.tagName!, styles }));
}

// Images, real and minimal.

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
/** A 1×1 red PNG; `total` pads it with a tEXt chunk to that many bytes. */
function png(total = 0): Buffer {
  const header = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
  const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(Buffer.from([0, 255, 0, 0]))), pngChunk('IEND', Buffer.alloc(0))];
  const size = parts.reduce((n, p) => n + p.length, 0);
  if (total > size) parts.splice(2, 0, pngChunk('tEXt', Buffer.concat([Buffer.from('Comment\0'), Buffer.alloc(total - size - 12 - 8, 0x61)])));
  return Buffer.concat(parts);
}
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDHooorhPqD/9k=', 'base64');
const GIF = Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
const WEBP = Buffer.from('UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAdQjyLXo/+BiOh/AAA=', 'base64');
const SVG = Buffer.from('﻿<?xml version="1.0" encoding="UTF-8"?>\n<!-- un cerchio -->\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><circle cx="2" cy="2" r="2" fill="red"/></svg>\n', 'utf8');

const COMPLETO_IMAGES: Record<string, ImageExpectation> = {
  'img-png': { mime: 'image/png', file: 'immagini/foto/a.png' },
  'img-jpeg': { mime: 'image/jpeg', file: 'immagini/foto/b.jpg' },
  'img-gif': { mime: 'image/gif', file: 'immagini/foto/c.gif' },
  'img-webp': { mime: 'image/webp', file: 'immagini/foto/d.webp' },
  'img-svg': { mime: 'image/svg+xml', file: 'immagini/foto/e.svg' },
  'img-formato': { fallback: 'format' },
  'img-grande': { fallback: 'size' },
};

/** A copy of a fixture in a new temporary folder, with the generated images; exported for the browser suite. */
export function prepare(name: string, base = mkdtempSync(join(tmpdir(), 'export-'))): string {
  const folder = join(base, name);
  cpSync(join(fixtures, name), folder, { recursive: true });
  if (name === 'completo') {
    const photos = join(folder, 'immagini/foto');
    writeFileSync(join(photos, 'a.png'), png());
    writeFileSync(join(photos, 'b.jpg'), JPEG);
    writeFileSync(join(photos, 'c.gif'), GIF);
    writeFileSync(join(photos, 'd.webp'), WEBP);
    writeFileSync(join(photos, 'e.svg'), SVG);
    // Sparse: one byte past 64 MiB, never read.
    writeFileSync(join(photos, 'grande.png'), png());
    truncateSync(join(photos, 'grande.png'), 64 * 1024 * 1024 + 1);
  }
  return folder;
}

interface Run { status: number | null; stdout: Buffer; stderr: string }
export function runCli(args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): Run {
  const result = spawnSync(process.execPath, [cliPath, ...args], { maxBuffer: 1 << 30, cwd: options.cwd, env: options.env ?? process.env });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr.toString('utf8') };
}
const treeOf = (folder: string) => JSON.parse(runCli(['resolve-tree', folder]).stdout.toString('utf8')) as Tree;
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const sorted = (list: Diagnostic[]) => [...list].sort((a, b) => compare(a.file, b.file) || compare(a.code, b.code) || compare(a.target ?? '', b.target ?? ''));

/** The valid pages of the suite, for the browser suite too: folder, root and images. */
export const VALID_PAGES: Array<{ fixture: string; root: string; images: Record<string, ImageExpectation> }> = [
  { fixture: 'completo', root: 'report', images: COMPLETO_IMAGES },
  { fixture: 'completo', root: 'altro', images: {} },
  { fixture: 'esempio-34', root: 'report-q3', images: {} },
];

const ERROR_CASES: Array<{ fixture: string; codes: string[]; setup?: (folder: string) => Buffer }> = [
  {
    fixture: 'err-asset-fuori',
    codes: ['asset-missing'],
    setup: (folder) => {
      const secret = Buffer.from('SEGRETO-fuori-dalla-cartella-0123456789');
      writeFileSync(join(folder, '../segreto.png'), Buffer.concat([png().subarray(0, 8), secret]));
      return secret;
    },
  },
  {
    fixture: 'err-asset-link',
    codes: ['asset-missing', 'syntax'],
    setup: (folder) => {
      const secret = Buffer.from('SEGRETO-dal-collegamento-9876543210');
      writeFileSync(join(folder, '../collegato.png'), Buffer.concat([png().subarray(0, 8), secret]));
      symlinkSync(join(folder, '../collegato.png'), join(folder, 'link.png'));
      return secret;
    },
  },
  { fixture: 'err-id', codes: ['id-invalid'] },
  { fixture: 'err-link', codes: ['reference-unresolved'] },
  { fixture: 'err-embed', codes: ['embed-unresolved'] },
];

async function main(): Promise<void> {
  let failed = 0;
  const report = (label: string, problems: string[]) => {
    if (problems.length === 0) console.log(`ok   ${label}`);
    else {
      failed++;
      console.log(`FAIL ${label}\n  ${problems.slice(0, 30).join('\n  ')}`);
    }
  };
  const temporary: string[] = [];
  const fresh = (name: string) => {
    const base = mkdtempSync(join(tmpdir(), 'export-'));
    temporary.push(base);
    return prepare(name, base);
  };
  try {
    // a. Exit codes and --root.
    {
      const problems: string[] = [];
      const folder = fresh('completo');
      const none = runCli(['export', folder]);
      if (none.status !== 2 || none.stdout.length > 0 || !none.stderr.includes('report') || !none.stderr.includes('altro')) problems.push(`two articles without --root: ${none.status} ${none.stderr}`);
      for (const root of ['fuori', 'manca']) {
        const run = runCli(['export', folder, '--root', root]);
        if (run.status !== 2 || run.stdout.length > 0) problems.push(`--root ${root}: ${run.status}`);
      }
      if (runCli(['export', join(folder, 'non-c-e')]).status !== 2) problems.push('missing folder');
      if (runCli(['export', folder, '--root']).status !== 2) problems.push('--root without a value');
      for (const theme of ['blu', 'Dark', '']) {
        if (runCli(['export', folder, '--root', 'report', '--theme', theme]).status !== 2) problems.push(`--theme ${theme}`);
      }
      const unwritable = runCli(['export', folder, '--root', 'report', '-o', join(folder, 'non-c-e/x.html')]);
      if (unwritable.status !== 2 || unwritable.stderr.startsWith('{')) problems.push(`-o that cannot be written: ${unwritable.status}`);
      report('a. exit codes and --root', problems);
    }

    // The valid pages: a, b, c-h.
    for (const page of VALID_PAGES) {
      const problems: string[] = [];
      const label = `${page.fixture} --root ${page.root}`;
      const folder = fresh(page.fixture);
      const run = runCli(['export', folder, '--root', page.root]);
      const tree = treeOf(folder);
      if (run.status !== 0) problems.push(`exit ${run.status}: ${run.stderr}`);
      // stderr: the diagnostics of resolve-tree, plus asset-unsupported, in the same order.
      const extra = Object.entries(page.images).filter(([, image]) => 'fallback' in image).map(([id]) => {
        const node = tree.nodes!.find((n) => n.id === id)!;
        return { severity: 'warning', code: 'asset-unsupported', file: node.file, target: String(node.attributes!.asset) };
      });
      const want = sorted([...(tree.diagnostics ?? []), ...extra]);
      if (run.stderr !== JSON.stringify({ diagnostics: want }) + '\n') problems.push(`stderr ${run.stderr}`);
      const output = join(folder, '..', 'pagina.html');
      runCli(['export', folder, '--root', page.root, '-o', output]);
      if (!existsSync(output) || !readFileSync(output).equals(run.stdout)) problems.push('-o differs from stdout');
      // b. Determinism: again, and from a copy elsewhere, with another zone, language and folder.
      if (!runCli(['export', folder, '--root', page.root]).stdout.equals(run.stdout)) problems.push('second run differs');
      const elsewhere = fresh(page.fixture);
      const env = { ...process.env, TZ: 'Pacific/Kiritimati', LANG: 'de_DE.UTF-8', LC_ALL: 'de_DE.UTF-8' };
      if (!runCli(['export', elsewhere, '--root', page.root], { cwd: dirname(elsewhere), env }).stdout.equals(run.stdout)) problems.push('copy elsewhere differs');
      await checkPage({ label, html: run.stdout.toString('utf8'), tree, rootId: page.root, images: page.images, folder }, problems);
      // The two pages with one theme.
      for (const theme of ['light', 'dark'] as const) {
        const fixed = runCli(['export', folder, '--root', page.root, '--theme', theme]);
        if (fixed.status !== 0 || fixed.stderr !== run.stderr) problems.push(`--theme ${theme}: ${fixed.status}`);
        await checkPage({ label: `${label} --theme ${theme}`, html: fixed.stdout.toString('utf8'), tree, rootId: page.root, images: page.images, folder, theme }, problems);
      }
      report(`${label}: a-h, three themes`, problems);
    }

    // The error cases: refused without the option, written with it.
    for (const errorCase of ERROR_CASES) {
      const problems: string[] = [];
      const folder = fresh(errorCase.fixture);
      const outside = errorCase.setup?.(folder);
      const tree = treeOf(folder);
      const codes = (tree.diagnostics ?? []).filter((d) => d.severity === 'error').map((d) => d.code).sort();
      if (codes.join() !== errorCase.codes.join()) problems.push(`errors ${codes.join()}`);
      const output = join(folder, '..', 'esistente.html');
      writeFileSync(output, 'prima');
      for (const args of [[], ['-o', output]]) {
        const refused = runCli(['export', folder, ...args]);
        if (refused.status !== 1 || refused.stdout.length > 0) problems.push(`refused ${args.join(' ')}: ${refused.status}`);
        if (refused.stderr !== JSON.stringify({ diagnostics: sorted(tree.diagnostics ?? []) }) + '\n') problems.push(`stderr ${refused.stderr}`);
      }
      if (readFileSync(output, 'utf8') !== 'prima') problems.push('-o touched');
      const allowed = runCli(['export', folder, '--allow-errors']);
      if (allowed.status !== 1 || allowed.stdout.length === 0) problems.push(`--allow-errors: ${allowed.status}`);
      runCli(['export', folder, '--allow-errors', '-o', output]);
      if (!readFileSync(output).equals(allowed.stdout)) problems.push('-o differs with --allow-errors');
      const html = allowed.stdout.toString('utf8');
      if (!html.includes('[data-unresolved] { outline: 0.75pt dashed currentColor; }')) problems.push('no rule for data-unresolved');
      await checkPage({ label: errorCase.fixture, html, tree, rootId: 'report', images: {}, folder }, problems, outside);
      report(`${errorCase.fixture}: refused, then --allow-errors`, problems);
    }

    // i. The limit: a 4 KiB PNG embedded 99 999 times.
    {
      const problems: string[] = [];
      const base = mkdtempSync(join(tmpdir(), 'export-'));
      temporary.push(base);
      const folder = join(base, 'grande');
      mkdirSync(folder);
      writeFileSync(join(folder, 'doc.document.md'), '---\nid: doc\nkind: document\nspec-version: "0.1"\n---\n');
      writeFileSync(join(folder, 'p.png'), png(4096));
      writeFileSync(join(folder, 'p.image.md'), '---\nid: p\nkind: image\nasset: p.png\n---\nUn punto.\n');
      writeFileSync(join(folder, 'report.article.md'), '---\nid: report\nkind: article\n---\n' + '![[p]]\n\n'.repeat(99999));
      const output = join(base, 'grande.html');
      for (const args of [['--allow-errors'], ['-o', output]]) {
        const run = runCli(['export', folder, ...args]);
        const diagnostics = (JSON.parse(run.stderr || '{}') as { diagnostics?: Diagnostic[] }).diagnostics ?? [];
        const tooLarge = diagnostics.find((d) => d.code === 'export-too-large');
        if (run.status !== 1 || run.stdout.length > 0 || !tooLarge || tooLarge.file !== 'report.article.md' || tooLarge.target !== undefined || !tooLarge.fix) {
          problems.push(`${args.join(' ')}: ${run.status} ${run.stderr.slice(0, 300)}`);
        }
      }
      if (existsSync(output)) problems.push('-o written');
      report('i. export-too-large', problems);
    }

    // A chart (class 3): the drawing as SVG without script, in the two themes, named by its description; one theme with --theme.
    {
      const problems: string[] = [];
      const base = mkdtempSync(join(tmpdir(), 'export-'));
      temporary.push(base);
      writeChartFolder(base);
      const run = runCli(['export', base]);
      const html = run.stdout.toString('utf8');
      if (run.status !== 0) problems.push(`exit ${run.status}: ${run.stderr}`);
      const svgs = html.match(/<svg role="img" aria-label="Le vendite per mese, gennaio in testa\." /g) ?? [];
      if (svgs.length !== 2 || !html.includes('<div data-chart-theme="light"><svg') || !html.includes('<div data-chart-theme="dark"><svg')) problems.push(`the two drawings: ${svgs.length}`);
      if (/<script/i.test(html)) problems.push('a script in the page');
      for (const result of (await VALIDATOR.validateString(html)).results) for (const m of result.messages) problems.push(`html-validate ${m.ruleId}: ${m.message}`);
      const dark = runCli(['export', base, '--theme', 'dark']).stdout.toString('utf8');
      if ((dark.match(/<svg role="img"/g) ?? []).length !== 1 || dark.includes('data-chart-theme') || !dark.includes('fill="#8ab4f8"')) problems.push('--theme dark: not one dark drawing');
      report('a chart: SVG in the two themes, no script, one theme with --theme', problems);
    }
  } finally {
    for (const base of temporary) rmSync(base, { recursive: true, force: true });
  }
  console.log(failed === 0 ? '\nexport suite: all pass' : `\nexport suite: ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();

/** A folder with a chart (class 3): a collection of sales by month, and an article that embeds its bar chart. */
export function writeChartFolder(folder: string): void {
  writeFileSync(join(folder, 'doc.document.md'), '---\nid: doc\nkind: document\ntags: []\nspec-version: "0.1"\nlang: it\n---\n');
  writeFileSync(join(folder, 'vendite.collection.md'), '---\nid: vendite\nkind: collection\ntags: []\nasset: vendite.tsv\nfields:\n  - name: mese\n    type: string\n  - name: importo\n    type: number\n---\nVendite per mese.\n');
  writeFileSync(join(folder, 'vendite.tsv'), 'mese\timporto\ngennaio\t21300\nfebbraio\t9875.26\nmarzo\t12000\n');
  writeFileSync(join(folder, 'mensili.chart.md'), '---\nid: mensili\nkind: chart\ntags: []\ntemplate: bar\ncollection: "[[vendite]]"\nx: mese\ny: importo\n---\nLe vendite per mese, gennaio in testa.\n');
  writeFileSync(join(folder, 'report.article.md'), '---\nid: report\nkind: article\ntags: []\ntitle: Rapporto\n---\n![[mensili]]\n');
}
