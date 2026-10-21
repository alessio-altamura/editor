// The resolution of §11.1: from the folder of a document to its resolved tree.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import type { Root, RootContent, PhrasingContent } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { gfmTable } from 'micromark-extension-gfm-table';
import { appendChildren, element, toJsonML, type Child, type Element } from './content.js';
import { compareCodePoints, report, sortDiagnostics, type Diagnostic, type DiagnosticSink } from './diagnostic.js';
import { parseYamlMap, splitFrontMatter, type RawValue } from './front-matter.js';
import { displayString, evaluateMathLine, langFormat, plainString } from './math-line.js';
import {
  computeStyle,
  numberNotation,
  parseStylesheet,
  styleDifference,
  type ComputedStyle,
  type ParsedStylesheet,
} from './stylesheet.js';

/** The `spec version` this runtime implements. */
export const SPEC_VERSION = '0.1';

const ID_FORM = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CLASS_FORM = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const RETIRED_IDS_FILE = 'retired-ids.yaml';

/** The `kind`s of the `core` and of class 1; any other `kind` is read as a `directive`. */
const KNOWN_KINDS = new Set(['concept', 'document', 'text', 'image', 'scratch', 'chapter', 'article', 'stylesheet', 'canvas-file']);
const VISIBLE_KINDS = new Set(['concept', 'text', 'image', 'scratch', 'chapter', 'article']);
const COMPOSITION_KINDS = new Set(['chapter', 'article', 'deck']);
/** §8 lists concept, scratch, article, deck and the document file; stylesheet and canvas file are added (reading). */
const EMBED_FORBIDDEN_KINDS = new Set(['concept', 'scratch', 'article', 'deck', 'document', 'stylesheet', 'canvas-file']);
const ASSOCIATION_FORBIDDEN_KINDS = new Set(['chapter', 'article', 'deck', 'stylesheet', 'document']);

/** Which attributes each `kind` knows besides `id` and `kind` (§4). */
function knowsAttribute(kind: string, key: string): boolean {
  switch (key) {
    case 'tags': return true;
    case 'class': return VISIBLE_KINDS.has(kind);
    case 'lang': return VISIBLE_KINDS.has(kind) || kind === 'document';
    case 'title': return kind === 'chapter' || kind === 'article';
    case 'asset': return kind === 'image' || kind === 'canvas-file';
    case 'stylesheet': return kind === 'article' || kind === 'chapter';
    case 'associations': return ['concept', 'text', 'image', 'scratch'].includes(kind);
    case 'spec-version': return kind === 'document';
    default: return false;
  }
}

interface SourceNode {
  file: string;
  /** The `kind` named by the file extension. */
  extensionKind: string;
  kind: string;
  id?: string;
  directive: boolean;
  /** Attributes as written, without `id` and `kind`; null when the file does not read (`syntax`). */
  attributes: Array<[string, RawValue]> | null;
  hasYamlComment: boolean;
  source: string;
  markdown?: Root;
  stylesheet?: ParsedStylesheet;
  // Filled while the node is checked.
  classes: string[];
  lang?: string;
  title?: string;
  asset?: string;
  items?: CompositionItem[];
}

type CompositionItem = { type: 'embed'; id: string; classes: string[] } | { type: 'block'; node: RootContent };

type Resolution =
  | { status: 'ok'; node: SourceNode; id: string }
  | { status: 'retired'; node: SourceNode; id: string }
  | { status: 'unresolved' }
  | { status: 'duplicate' };

/** Numbering inside a root composition (§0.10). */
interface RootState {
  chapterCounters: number[];
  images: number;
  /** The `number` of the first `embed` of each id, for the `number slot`. */
  firstNumbers: Map<string, string>;
}

interface BuildContext {
  sink: DiagnosticSink;
  /** The file whose source is converted, for diagnostics. */
  file: string;
  source: string;
  /** The effective `lang` of the object, for math lines. */
  lang: string | undefined;
  root: RootState | null;
  /** The depth of the enclosing titled chapters, inside a root composition. */
  depth: number;
  /** The chapters being expanded, to stop at an `embed-cycle`. */
  chapters: string[];
}

export interface ResolvedTree {
  nodes: Array<Record<string, unknown>>;
  associations?: Array<{ ids: [string, string]; declaredIn: string[] }>;
  diagnostics?: Diagnostic[];
  document?: { id?: string; file: string; attributes?: Record<string, unknown> };
}

function listFiles(folder: string, prefix = ''): string[] {
  const files: string[] = [];
  for (const name of readdirSync(join(folder, prefix)).sort(compareCodePoints)) {
    if (name.startsWith('.')) continue;
    const path = prefix === '' ? name : `${prefix}/${name}`;
    if (statSync(join(folder, path)).isDirectory()) files.push(...listFiles(folder, path));
    else files.push(path);
  }
  return files;
}

function readText(path: string): string {
  return readFileSync(path, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

function parseMarkdown(text: string): Root {
  return fromMarkdown(text, { extensions: [gfmTable()], mdastExtensions: [gfmTableFromMarkdown()] });
}

function toCamelCase(key: string): string {
  return key.replace(/-([a-zA-Z])/g, (_, letter: string) => letter.toUpperCase());
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const isComment = (node: RootContent): boolean =>
  node.type === 'html' && /^(\s*<!--[\s\S]*?-->)+\s*$/.test(node.value);

export function resolveTree(folder: string): ResolvedTree {
  const diagnostics: Diagnostic[] = [];
  const files = listFiles(folder);
  const fileSet = new Set(files);
  const nodes: SourceNode[] = [];
  let retiredFileText: string | null = null;

  // Steps 1 and 2: list the files, separate source and asset, read each source.
  for (const file of files) {
    const base = posix.basename(file);
    if (file === RETIRED_IDS_FILE) {
      retiredFileText = readText(join(folder, file));
      continue;
    }
    if (base.endsWith('.stylesheet.css')) {
      nodes.push(readStylesheetNode(file, readText(join(folder, file)), diagnostics));
      continue;
    }
    const match = /^.+\.([^.]+)\.md$/.exec(base);
    if (match) nodes.push(readTextNode(file, match[1]!, readText(join(folder, file)), diagnostics));
  }

  const idIndex = new Map<string, SourceNode[]>();
  for (const node of nodes) {
    if (node.id === undefined) continue;
    idIndex.set(node.id, [...(idIndex.get(node.id) ?? []), node]);
  }

  // Step 4: the retired ids, and the map from every id to its node.
  const retired = readRetiredIds(retiredFileText, idIndex, diagnostics);

  function finalSuccessor(id: string): string | null {
    const seen = new Set<string>();
    let current: string | null = id;
    while (current !== null && retired.has(current) && !idIndex.has(current)) {
      if (seen.has(current)) return null;
      seen.add(current);
      current = retired.get(current) ?? null;
    }
    return current;
  }

  function resolveId(written: string): Resolution {
    const live = idIndex.get(written);
    if (live && live.length > 1) return { status: 'duplicate' };
    if (live) return { status: 'ok', node: live[0]!, id: written };
    if (!retired.has(written)) return { status: 'unresolved' };
    const successor = finalSuccessor(written);
    const target = successor === null ? undefined : idIndex.get(successor);
    if (target && target.length > 1) return { status: 'duplicate' };
    if (target) return { status: 'retired', node: target[0]!, id: successor! };
    return { status: 'unresolved' };
  }

  function proposeId(base: string): string {
    const free = (id: string) => ID_FORM.test(id) && !idIndex.has(id) && !retired.has(id);
    if (free(base)) return base;
    for (let n = 2; ; n++) if (free(`${base}-${n}`)) return `${base}-${n}`;
  }

  // The document file (§0.8).
  const documentNodes = nodes.filter((node) => node.kind === 'document');
  const documentNode = documentNodes.length === 1 ? documentNodes[0] : undefined;
  if (documentNodes.length === 0) {
    report(diagnostics, 'document-missing', '.', undefined, `crea ${proposeId('document')}.document.md`);
  }
  for (const node of documentNodes.length > 1 ? documentNodes : []) {
    report(diagnostics, 'document-duplicate', node.file, node.id, 'tieni un solo document file');
  }
  const documentLang = (() => {
    const lang = documentNode?.attributes?.find(([key]) => key === 'lang')?.[1];
    return lang?.type === 'string' ? lang.value : undefined;
  })();

  const pairs = new Map<string, { ids: [string, string]; declaredIn: string[] }>();
  const reportedOnce = new Set<string>();
  const reportOnce = (sink: DiagnosticSink, code: string, file: string, target?: string, fix?: string) => {
    if (sink === null || reportedOnce.has(`${code}\0${file}`)) return;
    reportedOnce.add(`${code}\0${file}`);
    report(sink, code, file, target, fix);
  };

  // Step 3: form and uniqueness of the ids, and the kinds.
  function checkIdentity(node: SourceNode): void {
    const base = posix.basename(node.file);
    if (node.id === undefined) {
      const fromName = base.slice(0, base.indexOf('.'));
      const words = slugify(node.source.trim().split(/\s+/).slice(0, 4).join(' '));
      const proposal = ID_FORM.test(fromName) && !idIndex.has(fromName) && !retired.has(fromName) ? fromName : proposeId(words || 'object');
      report(diagnostics, 'id-missing', node.file, undefined, `id: ${proposal}`);
    } else if (!ID_FORM.test(node.id)) {
      report(diagnostics, 'id-invalid', node.file, node.id, proposeId(slugify(node.id) || 'object'));
    } else if ((idIndex.get(node.id)?.length ?? 0) > 1) {
      report(diagnostics, 'id-duplicate', node.file, node.id, 'dai un id nuovo a una delle copie');
    } else if (retired.has(node.id)) {
      report(diagnostics, 'id-reused', node.file, node.id, 'scegli un id nuovo');
    }
    if (node.kind !== node.extensionKind) {
      const stem = base.slice(0, base.lastIndexOf(`.${node.extensionKind}.`));
      const extension = node.kind === 'stylesheet' ? 'stylesheet.css' : `${node.kind}.md`;
      report(diagnostics, 'kind-file-extension-mismatch', node.file, node.kind, `rinomina in ${stem}.${extension}`);
    }
    if (node.directive) report(diagnostics, 'kind-unknown', node.file, node.kind);
  }

  /** Resolves an attribute value written exactly "[[id]]" (§10). */
  function resolveAttributeReference(node: SourceNode, written: string): { id: string; resolution: Resolution } {
    const resolution = resolveId(written);
    if (resolution.status === 'unresolved') {
      report(diagnostics, 'reference-unresolved', node.file, written, "correggi l'id del riferimento");
    } else if (resolution.status === 'retired') {
      report(diagnostics, 'reference-retired', node.file, written, `[[${resolution.id}]]`);
    }
    return { id: 'id' in resolution ? resolution.id : written, resolution };
  }

  function genericValue(node: SourceNode, key: string, raw: RawValue): unknown {
    if (raw.type === 'list') return raw.value;
    if (raw.type === 'invalid') {
      report(diagnostics, 'attribute-invalid', node.file, key, `scrivi ${key} come stringa o lista di stringhe`);
      return undefined;
    }
    const reference = /^\[\[([^[\]|]*)\]\]$/.exec(raw.value);
    return reference ? resolveAttributeReference(node, reference[1]!).id : raw.value;
  }

  /** Checks the attributes of a node and returns them as the tree writes them. */
  function checkAttributes(node: SourceNode): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (node.hasYamlComment) {
      report(diagnostics, 'attribute-invalid', node.file, undefined, 'togli il commento YAML e usa <!-- -->');
    }
    const seen = new Set<string>();
    for (const [key, raw] of node.attributes ?? []) {
      const name = toCamelCase(key);
      if (seen.has(name)) {
        report(diagnostics, 'attribute-invalid', node.file, key, `togli ${key}: ripete un'altra chiave`);
        continue;
      }
      seen.add(name);
      if (key === 'associations' && !node.directive && knowsAttribute(node.kind, key)) {
        checkAssociations(node, raw);
        continue;
      }
      if (node.directive) {
        if (key === 'associations') checkAssociations(node, raw);
        else out[name] = genericValue(node, key, raw);
        continue;
      }
      if (!knowsAttribute(node.kind, key)) {
        report(diagnostics, 'attribute-unknown', node.file, key);
        out[name] = genericValue(node, key, raw);
        continue;
      }
      const invalid = (fix: string) => {
        report(diagnostics, 'attribute-invalid', node.file, key, fix);
        out[name] = raw.type === 'invalid' ? undefined : raw.value;
      };
      switch (key) {
        case 'tags':
        case 'class':
          if (raw.type !== 'list') {
            invalid(`scrivi ${key} come lista, per esempio [${key === 'tags' ? 'vendite' : 'nota'}]`);
          } else if (key === 'class' && !raw.value.every((c) => CLASS_FORM.test(c))) {
            invalid('usa minuscole, cifre e trattini, cominciando con una lettera');
            node.classes = raw.value.filter((c) => CLASS_FORM.test(c));
          } else {
            if (raw.value.length > 0) out[name] = raw.value;
            if (key === 'class') node.classes = [...new Set(raw.value)];
          }
          break;
        case 'stylesheet': {
          const reference = raw.type === 'string' ? /^\[\[([^[\]|]*)\]\]$/.exec(raw.value) : null;
          if (!reference) {
            invalid('scrivi lo stylesheet come "[[id]]"');
            break;
          }
          const { id, resolution } = resolveAttributeReference(node, reference[1]!);
          out[name] = id;
          if ('node' in resolution && resolution.node.kind !== 'stylesheet') {
            report(diagnostics, 'stylesheet-kind', node.file, id, 'nomina uno stylesheet');
          }
          if (node.kind === 'chapter') {
            report(diagnostics, 'stylesheet-ignored', node.file, id, "dai lo stylesheet all'article");
          }
          break;
        }
        default: {
          if (raw.type !== 'string') {
            invalid(`scrivi ${key} come stringa`);
            break;
          }
          if (key === 'lang' && !/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{1,8})*$/.test(raw.value)) {
            invalid('usa un tag BCP 47, per esempio it');
            break;
          }
          out[name] = raw.value;
          if (key === 'lang') node.lang = raw.value;
          if (key === 'title') node.title = raw.value;
          if (key === 'asset') node.asset = raw.value;
        }
      }
    }
    for (const key of Object.keys(out)) if (out[key] === undefined) delete out[key];
    return out;
  }

  // Step 5: the union of the associations.
  function checkAssociations(node: SourceNode, raw: RawValue): void {
    if (raw.type !== 'list') {
      report(diagnostics, 'attribute-invalid', node.file, 'associations', 'scrivi associations come lista di id');
      return;
    }
    for (const written of raw.value) {
      const resolution = resolveId(written);
      if (resolution.status === 'duplicate') continue;
      if (resolution.status === 'unresolved') {
        report(diagnostics, 'association-unresolved', node.file, written, "correggi l'id o togli il collegamento");
        continue;
      }
      if (resolution.status === 'retired') {
        report(diagnostics, 'association-retired', node.file, written, resolution.id);
      }
      if (ASSOCIATION_FORBIDDEN_KINDS.has(resolution.node.kind)) {
        report(diagnostics, 'association-kind', node.file, resolution.id, `togli ${resolution.id} da associations`);
        continue;
      }
      if (node.id === undefined || node.id === resolution.id) continue;
      const ids = [node.id, resolution.id].sort(compareCodePoints) as [string, string];
      const key = ids.join('\0');
      const pair = pairs.get(key) ?? { ids, declaredIn: [] };
      if (!pair.declaredIn.includes(node.file)) pair.declaredIn.push(node.file);
      pairs.set(key, pair);
    }
  }

  function checkAsset(node: SourceNode): void {
    if (node.asset === undefined) return;
    const path = posix.normalize(posix.join(posix.dirname(node.file), node.asset));
    // A path that leaves the document counts as missing (reading).
    if (path.startsWith('../') || posix.isAbsolute(node.asset) || !fileSet.has(path)) {
      report(diagnostics, 'asset-missing', node.file, node.asset, 'aggiungi il file o correggi il percorso');
      return;
    }
    if (node.kind !== 'canvas-file') return;
    // JSON Canvas names files by their path within the system: here, the document root (§0.11).
    let canvas: unknown;
    try {
      canvas = JSON.parse(readText(join(folder, path)));
    } catch {
      report(diagnostics, 'syntax', node.file, undefined, `correggi il JSON di ${node.asset}`);
      return;
    }
    const canvasNodes = (canvas as { nodes?: unknown }).nodes;
    for (const entry of Array.isArray(canvasNodes) ? canvasNodes : []) {
      const file = (entry as { type?: unknown; file?: unknown }).file;
      if ((entry as { type?: unknown }).type === 'file' && typeof file === 'string' && !fileSet.has(file)) {
        report(diagnostics, 'canvas-path-unresolved', node.file, file, 'correggi il percorso o togli il nodo dal canvas');
      }
    }
  }

  /** Splits the body of a composition (or directive) into embeds and other blocks; reports bad class signs. */
  function compositionItems(node: SourceNode): CompositionItem[] {
    const items: CompositionItem[] = [];
    for (const child of node.markdown?.children ?? []) {
      if (isComment(child)) continue;
      const embed = child.type === 'paragraph' ? standaloneEmbed(node, child) : null;
      items.push(embed ?? { type: 'block', node: child });
    }
    return items;
  }

  /** An `embed` is `![[id]]` alone in a paragraph, with the class sign of §0.15 if any. */
  function standaloneEmbed(node: SourceNode, paragraph: RootContent): CompositionItem | null {
    const text = node.source.slice(paragraph.position!.start.offset, paragraph.position!.end.offset);
    const match = /^!\[\[([^\]\n]*)\]\](.*)$/.exec(text);
    if (!match) return null;
    const id = match[1]!;
    const rest = match[2]!;
    if (rest === '') return { type: 'embed', id, classes: [] };
    if (!/^\s*\{/.test(rest)) return null;
    const sign = /^\{(\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?: \.[a-z][a-z0-9]*(?:-[a-z0-9]+)*)*)\}$/.exec(rest);
    if (sign) return { type: 'embed', id, classes: [...new Set(sign[1]!.split(' ').map((c) => c.slice(1)))] };
    const target = rest.slice(rest.indexOf('{')).trim();
    const words = (target.match(/[A-Za-z][A-Za-z0-9-]*/g) ?? []).map((w) => '.' + w.toLowerCase());
    report(diagnostics, 'embed-class-invalid', node.file, target, `![[${id}]]{${words.join(' ') || '.nota'}}`);
    return { type: 'embed', id, classes: [] };
  }

  // Building content: the node's own body, or a node again inside a root composition.

  function buildBlocks(children: RootContent[], context: BuildContext): Child[] {
    const out: Child[] = [];
    for (const child of children) out.push(...buildBlock(child, context));
    return out;
  }

  function buildBlock(node: RootContent, context: BuildContext): Child[] {
    switch (node.type) {
      case 'paragraph': return [element('paragraph', {}, buildInlines(node.children, context))];
      case 'heading': return [element('heading', { depth: node.depth }, buildInlines(node.children, context))];
      case 'thematicBreak': return [element('thematicBreak')];
      case 'blockquote': return [element('blockquote', {}, buildBlocks(node.children, context))];
      case 'list': {
        // mdast attributes of a list, not fixed by the spec (§11.3): ordered, and start when not 1.
        const attributes: Record<string, unknown> = {};
        if (node.ordered) attributes.ordered = true;
        if (node.ordered && node.start != null && node.start !== 1) attributes.start = node.start;
        return [element('list', attributes, node.children.map((item) => element('listItem', {}, buildBlocks(item.children, context))))];
      }
      case 'code': {
        // The eval marker has no syntax yet (§7.1): read as the word `eval` in the info string.
        const info = `${node.lang ?? ''} ${node.meta ?? ''}`.split(/\s+/);
        if (info.includes('eval')) report(context.sink, 'eval-unsupported', context.file);
        return [element('code', node.lang ? { lang: node.lang } : {}, [node.value])];
      }
      case 'html':
        if (isComment(node)) return [];
        reportOnce(context.sink, 'raw-html', context.file, undefined, 'usa **forte** e una class');
        return [element('paragraph', {}, [node.value])];
      case 'table':
        // No names yet for a text table (§11.3): the mdast ones.
        return [element('table', {}, node.children.map((row) =>
          element('tableRow', {}, row.children.map((cell) => element('tableCell', {}, buildInlines(cell.children, context))))))];
      case 'definition': return [];
      default: return [element('paragraph', {}, [sourceOf(node, context)])];
    }
  }

  function sourceOf(node: RootContent, context: BuildContext): string {
    return node.position ? context.source.slice(node.position.start.offset, node.position.end.offset) : '';
  }

  function buildInlines(children: PhrasingContent[], context: BuildContext): Child[] {
    const out: Child[] = [];
    for (const child of children) appendChildren(out, buildInline(child, context));
    return out;
  }

  function buildInline(node: PhrasingContent, context: BuildContext): Child[] {
    switch (node.type) {
      case 'text': return buildText(node.value.replace(/\n/g, ' '), context);
      case 'emphasis':
      case 'strong':
        return [element(node.type, {}, buildInlines(node.children, context))];
      case 'inlineCode': {
        const value = node.value.replace(/\n/g, ' ');
        return [value.startsWith('= ') ? buildMathLine(value.slice(2), context) : element('inlineCode', {}, [value])];
      }
      case 'link': return [element('hyperlink', { url: node.url }, buildInlines(node.children, context))];
      case 'break': return [element('break')];
      case 'html':
        if (/^<!--[\s\S]*-->$/.test(node.value)) return [];
        reportOnce(context.sink, 'raw-html', context.file, undefined, 'usa **forte** e una class');
        return [node.value];
      default:
        // Images, references and other mdast nodes outside the inventory of §7.1 stay as literal text.
        return [sourceOf(node as RootContent, context)];
    }
  }

  function buildMathLine(expression: string, context: BuildContext): Element {
    const result = evaluateMathLine(expression);
    for (const number of result.ambiguous) {
      report(context.sink, 'math-line-ambiguous', context.file, number, number.replace('.', ''));
    }
    if (result.value === undefined) {
      report(context.sink, 'math-line-invalid', context.file, expression);
      return element('mathLine', { invalid: true }, [expression]);
    }
    if (context.lang !== undefined && langFormat(context.lang) === undefined) {
      reportOnce(context.sink, 'lang-unsupported', context.file, context.lang);
    }
    const line = element('mathLine', {
      value: plainString(result.value),
      display: displayString(result.value, context.lang, 'standard'),
    }, [expression]);
    line.meta = { value: result.value, lang: context.lang };
    return line;
  }

  /** Finds `[[id]]`, `[[id|text]]` and `![[id]]` in a text string. */
  function buildText(text: string, context: BuildContext): Child[] {
    const out: Child[] = [];
    let last = 0;
    for (const match of text.matchAll(/(!?)\[\[([^[\]]*)\]\]/g)) {
      appendChildren(out, [text.slice(last, match.index)]);
      last = match.index + match[0].length;
      const [id = '', label] = match[2]!.split(/\|(.*)/s);
      if (match[1] === '!') {
        report(context.sink, 'embed-inline', context.file, id, `metti ![[${id}]] in un capoverso da solo`);
        appendChildren(out, [match[0]]);
      } else {
        out.push(buildReference(id, label, context));
      }
    }
    appendChildren(out, [text.slice(last)]);
    return out;
  }

  /** An inline `id reference` (§10), with its number slot (§0.14). */
  function buildReference(written: string, label: string | undefined, context: BuildContext): Element {
    const resolution = resolveId(written);
    const removeSlot = (text: string) => text.replaceAll('{n}', '').replace(/^ +| +$/g, '').replace(/ {2,}/g, ' ');
    if (!('node' in resolution)) {
      if (resolution.status === 'unresolved') {
        report(context.sink, 'reference-unresolved', context.file, written, "correggi l'id del collegamento");
      }
      const shown = label === undefined ? '' : removeSlot(label);
      return element('hyperlink', { ref: written, unresolved: true }, [shown || written]);
    }
    const target = resolution.node;
    if (resolution.status === 'retired') {
      const fix = label === undefined ? `[[${resolution.id}]]` : `[[${resolution.id}|${label}]]`;
      report(context.sink, 'reference-retired', context.file, written, fix);
    }
    let shown = label ?? '';
    if (label?.includes('{n}')) {
      if (target.kind !== 'chapter' && target.kind !== 'image') {
        report(context.sink, 'number-slot-kind', context.file, resolution.id);
      }
      const number = context.root?.firstNumbers.get(resolution.id);
      shown = number === undefined ? removeSlot(label) : label.replaceAll('{n}', number);
    }
    if (shown === '') {
      if (target.title !== undefined) shown = target.title;
      else {
        shown = resolution.id;
        if (label === undefined) report(context.sink, 'reference-text-missing', context.file, resolution.id, `[[${resolution.id}|testo]]`);
      }
    }
    return element('hyperlink', { ref: resolution.id }, [shown]);
  }

  function effectiveLang(node: SourceNode): string | undefined {
    return node.lang ?? documentLang;
  }

  /** The content of a node's body, in `context`. */
  function buildContent(node: SourceNode, context: BuildContext): Child[] {
    if (node.items) return buildItems(node, node.items, context);
    return buildBlocks(node.markdown?.children ?? [], context);
  }

  function buildItems(node: SourceNode, items: CompositionItem[], context: BuildContext): Child[] {
    const out: Child[] = [];
    for (const item of items) {
      if (item.type === 'embed') {
        out.push(buildEmbed(item.id, item.classes, context));
        continue;
      }
      if (isComment(item.node)) continue;
      if (item.node.type !== 'thematicBreak' && !node.directive) {
        report(context.sink, 'composition-content', node.file, undefined, "sposta il blocco in un text e mettine l'embed");
      }
      out.push(...buildBlock(item.node, context));
    }
    return out;
  }

  /** An `embed` in a composition: the embedded node resolved in place (§11.3). */
  function buildEmbed(written: string, embedClasses: string[], context: BuildContext): Element {
    const unresolved = (id: string) => {
      const attributes: Record<string, unknown> = { id, unresolved: true };
      if (embedClasses.length > 0) attributes.class = embedClasses;
      return element('embed', attributes);
    };
    const resolution = resolveId(written);
    if (resolution.status === 'duplicate') return unresolved(written);
    if (resolution.status === 'unresolved') {
      report(context.sink, 'embed-unresolved', context.file, written, "correggi l'id o togli l'embed");
      return unresolved(written);
    }
    if (resolution.status === 'retired') report(context.sink, 'embed-retired', context.file, written, resolution.id);
    const target = resolution.node;
    if (EMBED_FORBIDDEN_KINDS.has(target.kind)) {
      const fix = target.kind === 'concept' ? `usa un object che sviluppa ${resolution.id}` : "togli l'embed";
      report(context.sink, 'embed-kind', context.file, resolution.id, fix);
      return unresolved(resolution.id);
    }
    // A chapter already being expanded closes an embed-cycle, reported on the chapter itself.
    if (context.chapters.includes(resolution.id)) return unresolved(resolution.id);

    const attributes: Record<string, unknown> = { id: resolution.id, kind: target.kind };
    const lang = effectiveLang(target);
    if (lang !== undefined) attributes.lang = lang;
    // A class both on the object and on the embed counts as the embed's, in its position there.
    const classes = [...target.classes.filter((c) => !embedClasses.includes(c)), ...embedClasses];
    if (classes.length > 0) attributes.class = classes;
    if (target.asset !== undefined) attributes.asset = target.asset;
    const embed = element('embed', attributes);
    embed.meta = { classes, embedClasses };
    const inner: BuildContext = {
      sink: null,
      file: target.file,
      source: target.source,
      lang,
      root: context.root,
      depth: context.depth,
      chapters: context.chapters,
    };
    if (target.kind === 'chapter') {
      inner.chapters = [...context.chapters, resolution.id];
      if (context.root && target.title !== undefined) {
        const depth = context.depth + 1;
        const counters = context.root.chapterCounters.slice(0, depth);
        counters[depth - 1] = (counters[depth - 1] ?? 0) + 1;
        context.root.chapterCounters = counters;
        attributes.depth = depth;
        attributes.number = counters.join('.');
        const title = element('title', {}, [target.title]);
        title.meta = { depth };
        embed.children.push(title);
        inner.depth = depth;
      }
    } else if (target.kind === 'image' && context.root) {
      attributes.number = String(++context.root.images);
    }
    if (context.root && typeof attributes.number === 'string' && !context.root.firstNumbers.has(resolution.id)) {
      context.root.firstNumbers.set(resolution.id, attributes.number);
    }
    embed.children.push(...buildContent(target, inner));
    return embed;
  }

  function chapterCycles(): Set<string> {
    const inCycle = new Set<string>();
    const embedsOf = (node: SourceNode): SourceNode[] =>
      (node.items ?? []).flatMap((item) => {
        if (item.type !== 'embed') return [];
        const resolution = resolveId(item.id);
        return 'node' in resolution && resolution.node.kind === 'chapter' ? [resolution.node] : [];
      });
    for (const start of nodes.filter((node) => node.kind === 'chapter')) {
      const stack = [...embedsOf(start)];
      const seen = new Set<SourceNode>();
      while (stack.length > 0) {
        const next = stack.pop()!;
        if (next === start) {
          inCycle.add(start.file);
          break;
        }
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(...embedsOf(next));
      }
    }
    return inCycle;
  }

  // The node-level pass: checks and the node's own content.
  const attributesOf = new Map<SourceNode, Record<string, unknown>>();
  let documentOutput: ResolvedTree['document'];
  for (const node of nodes) {
    // A file that does not read has only its `syntax` error.
    if (node.attributes === null) continue;
    checkIdentity(node);
    attributesOf.set(node, checkAttributes(node));
  }
  const outputs: Array<Record<string, unknown>> = [];
  for (const node of nodes) {
    if (node.attributes === null || node.kind !== 'stylesheet') continue;
    for (const target of node.stylesheet?.unsupported ?? []) report(diagnostics, 'stylesheet-unsupported', node.file, target);
  }
  // Step 6: embeds, nested chapters, assets.
  for (const node of nodes) {
    // Only compositions and directives have embeds; `![[id]]` alone in a text is `embed-inline` (reading).
    if (node.markdown && (COMPOSITION_KINDS.has(node.kind) || node.directive)) node.items = compositionItems(node);
    checkAsset(node);
  }
  const cycles = chapterCycles();

  for (const node of nodes) {
    if (node.kind === 'document') {
      checkDocument(node, node === documentNode);
      continue;
    }
    const output: Record<string, unknown> = {};
    if (node.id !== undefined) output.id = node.id;
    output.kind = node.kind;
    if (node.directive) output.directive = true;
    output.file = node.file;
    const attributes = attributesOf.get(node) ?? {};
    if (Object.keys(attributes).length > 0) output.attributes = attributes;
    if (cycles.has(node.file)) report(diagnostics, 'embed-cycle', node.file, node.id, "togli l'embed che chiude il ciclo");
    if (node.markdown) {
      const context: BuildContext = {
        sink: diagnostics,
        file: node.file,
        source: node.source,
        lang: effectiveLang(node),
        root: null,
        depth: 0,
        chapters: node.kind === 'chapter' && node.id !== undefined ? [node.id] : [],
      };
      if (node.kind === 'text') checkTextBlocks(node);
      let content = buildContent(node, context);
      // In class 1 a deck is a directive, so the only root composition is the article (reading).
      if (node.kind === 'article') content = buildRoot(node, output);
      if (content.length > 0) output.content = content.map(toJsonML);
    }
    outputs.push(output);
  }

  function checkTextBlocks(node: SourceNode): void {
    const blocks = (node.markdown?.children ?? []).filter((child) => !isComment(child) && child.type !== 'definition');
    if (blocks.length > 1 || blocks.some((child) => child.type === 'heading')) {
      report(diagnostics, 'text-blocks', node.file, undefined, `dividi in ${Math.max(blocks.length, 2)} text`);
    }
  }

  function checkDocument(node: SourceNode, isTheDocument: boolean): void {
    if ((node.markdown?.children ?? []).some((child) => !isComment(child))) {
      report(diagnostics, 'document-content', node.file, undefined, 'svuota il corpo del document file');
    }
    if (!(node.attributes ?? []).some(([key]) => key === 'spec-version')) {
      report(diagnostics, 'spec-version-missing', node.file, undefined, `spec-version: "${SPEC_VERSION}"`);
    }
    if (!isTheDocument) return;
    const attributes = attributesOf.get(node) ?? {};
    const extra = Object.keys(attributes).some((key) => !['tags', 'specVersion'].includes(key));
    if (extra) documentOutput = node.id === undefined ? { file: node.file, attributes } : { id: node.id, file: node.file, attributes };
  }

  /** The content of a root composition, with numbering and computed style (step 7). */
  function buildRoot(node: SourceNode, output: Record<string, unknown>): Child[] {
    const contextFor = (root: RootState): BuildContext => ({
      sink: null,
      file: node.file,
      source: node.source,
      lang: effectiveLang(node),
      root,
      depth: 0,
      chapters: [],
    });
    // A first pass finds the number of every embed, so a number slot can point forward.
    const first: RootState = { chapterCounters: [], images: 0, firstNumbers: new Map() };
    buildContent(node, contextFor(first));
    const content = buildContent(node, contextFor({ chapterCounters: [], images: 0, firstNumbers: first.firstNumbers }));

    const stylesheetId = attributesOf.get(node)?.stylesheet;
    const resolution = typeof stylesheetId === 'string' ? resolveId(stylesheetId) : null;
    const sheet = resolution && 'node' in resolution && resolution.node.kind === 'stylesheet' ? resolution.node.stylesheet ?? null : null;
    const rootRule = computeStyle({ type: 'root', classes: [], embedClasses: [] }, new Map(), null);
    const rootFinal = computeStyle({ type: 'root', classes: node.classes, embedClasses: [] }, rootRule, sheet);
    const difference = styleDifference(rootFinal, rootRule);
    if (Object.keys(difference).length > 0) output.computedStyle = difference;
    applyStyles(content, rootFinal, sheet);
    return content;
  }

  function applyStyles(children: Child[], parent: ComputedStyle, sheet: ParsedStylesheet | null): void {
    for (const child of children) {
      if (typeof child === 'string') continue;
      const type = child.type === 'title' ? `title-${Math.min(child.meta?.depth ?? 1, 3)}` : child.type;
      const expected = computeStyle({ type, classes: [], embedClasses: [] }, parent, null);
      const final = computeStyle({ type, classes: child.meta?.classes ?? [], embedClasses: child.meta?.embedClasses ?? [] }, parent, sheet);
      const difference = styleDifference(final, expected);
      if (Object.keys(difference).length > 0) child.attributes.computedStyle = difference;
      if (child.type === 'mathLine' && child.meta?.value && numberNotation(final) === 'compact') {
        child.attributes.display = displayString(child.meta.value, child.meta.lang, 'compact');
      }
      applyStyles(child.children, final, sheet);
    }
  }

  return finish();

  function finish(): ResolvedTree {
    const result: ResolvedTree = {
      nodes: outputs.sort(
        (a, b) => compareCodePoints(String(a.id ?? ''), String(b.id ?? '')) || compareCodePoints(String(a.file), String(b.file)),
      ),
    };
    const associations = [...pairs.values()]
      .map((pair) => ({ ids: pair.ids, declaredIn: pair.declaredIn.sort(compareCodePoints) }))
      .sort((a, b) => compareCodePoints(a.ids[0], b.ids[0]) || compareCodePoints(a.ids[1], b.ids[1]));
    if (associations.length > 0) result.associations = associations;
    if (diagnostics.length > 0) result.diagnostics = sortDiagnostics(diagnostics);
    if (documentOutput) result.document = documentOutput;
    return result;
  }
}

function readTextNode(file: string, extensionKind: string, text: string, diagnostics: Diagnostic[]): SourceNode {
  const node: SourceNode = {
    file,
    extensionKind,
    kind: extensionKind,
    directive: false,
    attributes: [],
    hasYamlComment: false,
    source: text,
    classes: [],
  };
  const split = splitFrontMatter(text);
  if ('error' in split) {
    report(diagnostics, 'syntax', file, undefined, `chiudi il front matter con una riga ---`);
    node.attributes = null;
    return node;
  }
  if (split.frontMatter !== null) {
    const map = parseYamlMap(split.frontMatter);
    if ('error' in map) {
      report(diagnostics, 'syntax', file, undefined, `correggi il front matter: ${map.error}`);
      node.attributes = null;
      return node;
    }
    node.hasYamlComment = map.hasComment;
    readIdentity(node, map.entries, diagnostics);
  } else {
    readIdentity(node, [], diagnostics);
  }
  // The body keeps its offsets in the file: the front matter lines are blanked, not cut.
  const bodyStart = text.length - split.body.length;
  node.source = text.slice(0, bodyStart).replace(/[^\n]/g, ' ') + split.body;
  node.markdown = parseMarkdown(node.source);
  return node;
}

function readStylesheetNode(file: string, text: string, diagnostics: Diagnostic[]): SourceNode {
  const stylesheet = parseStylesheet(text);
  const node: SourceNode = {
    file,
    extensionKind: 'stylesheet',
    kind: 'stylesheet',
    directive: false,
    attributes: [],
    hasYamlComment: false,
    source: text,
    stylesheet,
    classes: [],
  };
  if (stylesheet.header === null) {
    readIdentity(node, [], diagnostics);
    return node;
  }
  const map = parseYamlMap(stylesheet.header);
  if ('error' in map) {
    report(diagnostics, 'syntax', file, undefined, `correggi il commento d'intestazione: ${map.error}`);
    node.attributes = null;
    return node;
  }
  node.hasYamlComment = map.hasComment;
  readIdentity(node, map.entries, diagnostics);
  return node;
}

/** Takes `id` and `kind` out of the attributes. */
function readIdentity(node: SourceNode, entries: Array<[string, RawValue]>, diagnostics: Diagnostic[]): void {
  const attributes: Array<[string, RawValue]> = [];
  let kindSeen = false;
  for (const [key, value] of entries) {
    if (key === 'id' || key === 'kind') {
      if (value.type !== 'string') {
        report(diagnostics, 'attribute-invalid', node.file, key, `scrivi ${key} come stringa`);
        continue;
      }
      if (key === 'id') node.id = value.value;
      else {
        node.kind = value.value;
        kindSeen = true;
      }
      continue;
    }
    attributes.push([key, value]);
  }
  node.attributes = attributes;
  // Without a kind in the file, the node takes the kind of the file extension (reading).
  if (!kindSeen) report(diagnostics, 'kind-missing', node.file, undefined, `kind: ${node.extensionKind}`);
  node.directive = !KNOWN_KINDS.has(node.kind);
}

function readRetiredIds(text: string | null, idIndex: Map<string, SourceNode[]>, diagnostics: Diagnostic[]): Map<string, string | null> {
  const retired = new Map<string, string | null>();
  if (text === null) return retired;
  const map = parseYamlMap(text);
  if ('error' in map) {
    report(diagnostics, 'syntax', RETIRED_IDS_FILE, undefined, `correggi ${RETIRED_IDS_FILE}: ${map.error}`);
    return retired;
  }
  for (const [key, value] of map.entries) {
    if (value.type !== 'string') {
      report(diagnostics, 'syntax', RETIRED_IDS_FILE, undefined, `scrivi ${key}: <successore> oppure ${key}: null`);
      continue;
    }
    // Only a plain null means «deleted»; a quoted "null" is an id.
    retired.set(key, value.plain && value.value === 'null' ? null : value.value);
  }
  for (const [id, successor] of retired) {
    if (successor === null) continue;
    if (retired.has(successor) && !idIndex.has(successor)) {
      const seen = new Set([id]);
      let current: string | null = successor;
      while (current !== null && retired.has(current) && !idIndex.has(current) && !seen.has(current)) {
        seen.add(current);
        current = retired.get(current) ?? null;
      }
      // An id whose successors run into a cycle is reported as part of it (reading).
      if (current !== null && seen.has(current)) {
        report(diagnostics, 'retired-cycle', RETIRED_IDS_FILE, id, 'togli una riga del ciclo');
      } else {
        report(diagnostics, 'retired-chain', RETIRED_IDS_FILE, id, `${id}: ${current ?? 'null'}`);
      }
    } else if (!idIndex.has(successor)) {
      report(diagnostics, 'retired-successor-missing', RETIRED_IDS_FILE, id, `${id}: null`);
    }
  }
  return retired;
}
