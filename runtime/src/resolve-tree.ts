// The resolution of §11.1: from the folder of a document to its resolved tree.
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import type { Nodes, Paragraph, PhrasingContent, Root, RootContent } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { gfmTable } from 'micromark-extension-gfm-table';
import { wikiReference, wikiReferenceFromMarkdown } from './wiki-reference.js';
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
import { CLASS_FORM, ID_FORM, LANG_FORM, type ResolvedTree } from './tree.js';

export type { ResolvedTree };

/** The `spec version` this runtime implements. */
export const SPEC_VERSION = '0.1';

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
    case 'associations': return ['concept', 'text', 'image', 'scratch', 'canvas-file'].includes(kind);
    case 'stylesheet': return kind === 'article' || kind === 'chapter';
    case 'spec-version': return kind === 'document';
    case 'recursion': return kind === 'chapter';
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
  /** How many YAML comments the front matter has: each is `attribute-invalid`. */
  yamlComments: number;
  source: string;
  markdown?: Root;
  definitions: Map<string, string>;
  stylesheet?: ParsedStylesheet;
  // Filled while the node is checked.
  classes: string[];
  lang?: string;
  title?: string;
  asset?: string;
  /** The path of the asset from the document folder, with `/`, when the file exists (§11.3). */
  assetPath?: string;
  /** How many times a chapter may appear inside itself (§0.17); undefined without `recursion`. */
  recursion?: number;
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
  /** The nodes being expanded, to stop at an `embed-cycle`. */
  expanding: string[];
  /** How many embeds enclose the content being built, for the depth limit. */
  embedDepth: number;
  definitions: Map<string, string>;
  /** True in a composition or a directive, where `![[id]]` is an embed. */
  inComposition: boolean;
}

const utf8 = new TextDecoder('utf-8', { fatal: true });

/**
 * Lists the regular files of the folder, without the names that start with a
 * dot. A symbolic link is not followed and goes in `unreadable`, with the
 * names that are not UTF-8: each gives `syntax` (§2).
 */
function listFiles(
  folder: string,
  prefix = '',
  unreadable: string[] = [],
  identities?: Map<string, FileIdentity>,
): { files: string[]; unreadable: string[] } {
  const files: string[] = [];
  const names: string[] = [];
  let entries: Buffer[];
  try {
    entries = readdirSync(join(folder, prefix), { encoding: 'buffer' });
  } catch (error) {
    // The document folder itself is the cli's to report (exit 2); a subfolder gives syntax.
    if (prefix === '') throw error;
    unreadable.push(prefix);
    return { files, unreadable };
  }
  for (const raw of entries) {
    try {
      names.push(utf8.decode(raw));
    } catch {
      unreadable.push(prefix === '' ? raw.toString('utf8') : `${prefix}/${raw.toString('utf8')}`);
    }
  }
  for (const name of names.sort(compareCodePoints)) {
    if (name.startsWith('.')) continue;
    const path = prefix === '' ? name : `${prefix}/${name}`;
    let stat;
    try {
      stat = lstatSync(join(folder, path), { bigint: true });
    } catch {
      unreadable.push(path);
      continue;
    }
    if (stat.isSymbolicLink()) unreadable.push(path);
    else if (stat.isDirectory()) for (const file of listFiles(folder, path, unreadable, identities).files) files.push(file);
    else if (stat.isFile()) {
      files.push(path);
      identities?.set(path, { dev: stat.dev, ino: stat.ino });
    }
  }
  return { files, unreadable };
}

/** Device and inode of a listed file, so a reader can check it opened the same file. */
export interface FileIdentity {
  dev: bigint;
  ino: bigint;
}

/** The regular files of the document folder, as the resolution lists them (§2), with their identity. */
export function listDocumentFiles(folder: string): Map<string, FileIdentity> {
  const identities = new Map<string, FileIdentity>();
  listFiles(folder, '', [], identities);
  return identities;
}

/** Reads a file as UTF-8, also with BOM and CRLF; null when it does not read. */
function readText(path: string): string | null {
  try {
    return utf8.decode(readFileSync(path)).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  } catch {
    return null;
  }
}

/** Limits of the resolved tree (§11.1), past which embeds are cut with `tree-limit`. */
const MAX_EMBED_DEPTH = 1000;
const MAX_EMBEDS = 100000;
/** Provisional, until the spec fixes it: the characters of text in the whole tree. */
const MAX_TEXT = 50_000_000;

/** Deeper nesting than this is `syntax`: the tree is built by recursion (reading). */
const MAX_NESTING = 100;

function nestingDepth(root: Nodes): number {
  let deepest = 0;
  const stack: Array<[Nodes, number]> = [[root, 0]];
  while (stack.length > 0) {
    const [node, depth] = stack.pop()!;
    deepest = Math.max(deepest, depth);
    if ('children' in node) for (const child of node.children) stack.push([child, depth + 1]);
  }
  return deepest;
}

/** Removes the number slot, then trims and collapses the spaces U+0020 (§0.14). */
function removeSlot(text: string): string {
  return text.replaceAll('{n}', '').replace(/^ +| +$/g, '').replace(/ {2,}/g, ' ');
}

function parseMarkdown(text: string): Root {
  return fromMarkdown(text, {
    extensions: [gfmTable(), wikiReference()],
    mdastExtensions: [gfmTableFromMarkdown(), wikiReferenceFromMarkdown()],
  });
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
  const { files, unreadable } = listFiles(folder);
  for (const file of unreadable) report(diagnostics, 'syntax', file, undefined, 'rendilo un file o una cartella leggibile, con un nome in UTF-8 e senza link simbolici');
  const fileSet = new Set(files);
  const nodes: SourceNode[] = [];
  let retiredFileText: string | null = null;
  for (const file of files) {
    const base = posix.basename(file);
    const match = /^.+\.([^.]+)\.md$/.exec(base);
    const isStylesheet = base.endsWith('.stylesheet.css');
    if (file !== RETIRED_IDS_FILE && !isStylesheet && !match) continue;
    const text = readText(join(folder, file));
    if (text === null) {
      report(diagnostics, 'syntax', file, undefined, 'salva il file in UTF-8');
      if (file !== RETIRED_IDS_FILE) nodes.push(unreadableNode(file, isStylesheet ? 'stylesheet' : match![1]!));
      continue;
    }
    if (file === RETIRED_IDS_FILE) retiredFileText = text;
    else if (isStylesheet) nodes.push(readStylesheetNode(file, text, diagnostics));
    else nodes.push(readTextNode(file, match![1]!, text, diagnostics));
  }

  const idIndex = new Map<string, SourceNode[]>();
  for (const node of nodes) {
    if (node.id === undefined) continue;
    idIndex.set(node.id, [...(idIndex.get(node.id) ?? []), node]);
  }

  // Step 4: the retired ids, and the map from every id to its node.
  const retired = readRetiredIds(retiredFileText, diagnostics);
  const retiredFinals = finalSuccessors(retired, idIndex);
  checkRetiredIds(retired, retiredFinals, idIndex, diagnostics);

  function finalSuccessor(id: string): string | null {
    if (!retired.has(id) || idIndex.has(id)) return id;
    const final = retiredFinals.get(id);
    return final === undefined || final.cycle ? null : final.id;
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
  let embedCount = 0;
  let textSize = 0;
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
    } else {
      // Every code that applies, one per occurrence (§11.2).
      if (!ID_FORM.test(node.id)) report(diagnostics, 'id-invalid', node.file, node.id, proposeId(slugify(node.id) || 'object'));
      if ((idIndex.get(node.id)?.length ?? 0) > 1) report(diagnostics, 'id-duplicate', node.file, node.id, 'dai un id nuovo a una delle copie');
      if (retired.has(node.id)) report(diagnostics, 'id-reused', node.file, node.id, 'scegli un id nuovo');
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
    // Keys come from the file: no prototype, so `__proto__` is a key like the others.
    const out: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (let i = 0; i < node.yamlComments; i++) {
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
      if (key === 'associations') {
        // The same rule on both sides: a kind that admits no association gives association-kind.
        if (ASSOCIATION_FORBIDDEN_KINDS.has(node.kind)) {
          for (const written of raw.type === 'list' ? raw.value : [key]) {
            report(diagnostics, 'association-kind', node.file, written, `togli associations da ${node.kind}`);
          }
        } else if (node.directive || knowsAttribute(node.kind, key)) {
          checkAssociations(node, raw);
        } else {
          report(diagnostics, 'attribute-unknown', node.file, key);
        }
        continue;
      }
      if (node.directive) {
        // The attributes of a directive hold (§10): its title and lang are used too.
        const value = genericValue(node, key, raw);
        if (key === 'tags' && Array.isArray(value) && value.length === 0) continue;
        out[name] = value;
        if (typeof value === 'string' && key === 'title' && value !== '') node.title = value;
        if (typeof value === 'string' && key === 'lang' && LANG_FORM.test(value)) node.lang = value;
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
          // A value written exactly "[[id]]" is an id reference here too (§10).
          const value = genericValue(node, key, raw) as string;
          if (key === 'lang' && !LANG_FORM.test(value)) {
            invalid('usa un tag BCP 47, per esempio it');
            break;
          }
          if (key === 'recursion') {
            if (!/^[1-9][0-9]*$/.test(value) && value !== 'infinite') {
              invalid('scrivi recursion come intero positivo fra virgolette, o "infinite"');
              break;
            }
            node.recursion = value === 'infinite' ? Infinity : Number(value);
          }
          out[name] = value;
          if (key === 'lang') node.lang = value;
          // An empty title counts as absent (§0.7): no number, no text for [[id]].
          if (key === 'title' && value !== '') node.title = value;
          if (key === 'asset') node.asset = value;
        }
      }
    }
    for (const key of Object.keys(out)) if (out[key] === undefined) delete out[key];
    return { ...out };
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
    node.assetPath = path;
    if (node.kind !== 'canvas-file') return;
    // JSON Canvas names files by their path within the system: here, the document root (§0.11).
    const invalid = () => report(diagnostics, 'syntax', node.file, undefined, `correggi il JSON Canvas di ${node.asset}`);
    let canvas: unknown;
    try {
      canvas = JSON.parse(readText(join(folder, path)) ?? '');
    } catch {
      return invalid();
    }
    const isObject = (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null && !Array.isArray(value);
    if (!isObject(canvas)) return invalid();
    const canvasNodes = canvas.nodes ?? [];
    if (!Array.isArray(canvasNodes) || !canvasNodes.every(isObject)) return invalid();
    for (const entry of canvasNodes) {
      if (entry.type === 'file' && typeof entry.file === 'string' && !fileSet.has(posix.normalize(entry.file))) {
        report(diagnostics, 'canvas-path-unresolved', node.file, entry.file, 'correggi il percorso o togli il nodo dal canvas');
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

  /**
   * A paragraph that starts with `![[id]]` (§0.6, §0.15). It is an embed only when the
   * paragraph is that one line, with nothing after the `![[id]]` but a class sign and HTML
   * comments, which disappear (§0.13). The sign is read on the line as written, so a
   * `{` that does not follow the grammar is `invalid` even where CommonMark sees emphasis
   * or code in it, and even when the paragraph goes on and is not an embed.
   */
  function embedLine(paragraph: Paragraph, source: string): { id: string; classes: string[]; invalid?: string; embed: boolean; text: string } | null {
    const first = paragraph.children[0];
    if (first?.type !== 'wikiReference' || !first.embed) return null;
    const id = first.value;
    const after = source.slice(first.position!.end.offset, paragraph.position!.end.offset);
    const lineEnd = after.indexOf('\n');
    const more = lineEnd >= 0;
    const line = (more ? after.slice(0, lineEnd) : after).replace(/<!--[\s\S]*?-->/g, '').trimEnd();
    // As written, without the comments, for an embed that stays text.
    const text = source.slice(paragraph.position!.start.offset, paragraph.position!.end.offset).replace(/<!--[\s\S]*?-->/g, '').trimEnd();
    if (line.trim() === '') return { id, classes: [], embed: !more, text };
    if (!/^\s*\{/.test(line)) return null;
    const sign = /^\{(\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?: \.[a-z][a-z0-9]*(?:-[a-z0-9]+)*)*)\}$/.exec(line);
    const classes = sign ? [...new Set(sign[1]!.split(' ').map((c) => c.slice(1)))] : [];
    const invalid = sign ? undefined : line.slice(line.indexOf('{')).trim();
    return { id, classes: more ? [] : classes, embed: !more, text, ...(invalid === undefined ? {} : { invalid }) };
  }

  /** An `embed` is `![[id]]` alone in a paragraph, with the class sign of §0.15 if any. */
  function standaloneEmbed(node: SourceNode, paragraph: Paragraph): CompositionItem | null {
    const line = embedLine(paragraph, node.source);
    if (!line) return null;
    if (line.invalid !== undefined) {
      const words = (line.invalid.match(/[A-Za-z][A-Za-z0-9-]*/g) ?? []).map((w) => '.' + w.toLowerCase());
      report(diagnostics, 'embed-class-invalid', node.file, line.invalid, `![[${line.id}]]{${words.join(' ') || '.nota'}}`);
    }
    return line.embed ? { type: 'embed', id: line.id, classes: line.classes } : null;
  }

  // Building content: the node's own body, or a node again inside a root composition.

  function buildBlocks(children: RootContent[], context: BuildContext): Child[] {
    const out: Child[] = [];
    for (const child of children) for (const block of buildBlock(child, context)) out.push(block);
    return out;
  }

  function buildBlock(node: RootContent, context: BuildContext): Child[] {
    switch (node.type) {
      case 'paragraph': {
        // Compositions and directives take their embeds out before this; elsewhere one stays text (§0.6).
        // In a composition the paragraph is nested in another block, already composition-content.
        const embed = embedLine(node, context.source);
        if (embed?.embed) {
          if (!context.inComposition) {
            report(context.sink, 'embed-outside-composition', context.file, embed.id, `sposta ![[${embed.id}]] in una composition`);
          }
          return [element('paragraph', {}, [embed.text])];
        }
        return [element('paragraph', {}, buildInlines(node.children, context))];
      }
      case 'heading': return [element('heading', { depth: node.depth }, buildInlines(node.children, context))];
      case 'thematicBreak': return [element('thematicBreak')];
      case 'blockquote': return [element('blockquote', {}, buildBlocks(node.children, context))];
      case 'list': {
        const attributes: Record<string, unknown> = {};
        if (node.ordered) attributes.ordered = true;
        if (node.ordered && node.start != null && node.start !== 1) attributes.start = node.start;
        return [element('list', attributes, node.children.map((item) => element('listItem', {}, buildBlocks(item.children, context))))];
      }
      case 'code': {
        // The markers are words of the info string after the first, the language (§7.1).
        const markers = (node.meta ?? '').split(/\s+/);
        const attributes: Record<string, unknown> = {};
        if (node.lang) attributes.lang = node.lang;
        if (markers.includes('eval')) {
          attributes.eval = true;
          report(context.sink, 'eval-unsupported', context.file);
        }
        if (markers.includes('echo')) attributes.echo = true;
        return [element('code', attributes, [node.value])];
      }
      case 'html':
        if (isComment(node)) return [];
        reportOnce(context.sink, 'raw-html', context.file, undefined, 'usa **forte** e una class');
        return [element('paragraph', {}, [node.value])];
      case 'table':
        const align = node.align?.some((a) => a) ? { align: node.align.map((a) => a ?? null) } : {};
        return [element('table', align, node.children.map((row) =>
          element('tableRow', {}, row.children.map((cell, column) => {
            const tableCell = element('tableCell', {}, buildInlines(cell.children, context));
            // The column alignment acts as a text-align declaration on the cell (§0.5).
            const textAlign = node.align?.[column];
            if (textAlign) tableCell.meta = { textAlign };
            return tableCell;
          }))))];
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
      case 'text': return [node.value.replace(/\n/g, ' ')];
      case 'wikiReference': {
        if (node.embed) {
          report(context.sink, 'embed-inline', context.file, node.value, `metti ![[${node.value}]] in un capoverso da solo`);
          return [`![[${node.value}]]`];
        }
        const bar = node.value.indexOf('|');
        return [bar < 0 ? buildReference(node.value, undefined, context) : buildReference(node.value.slice(0, bar), node.value.slice(bar + 1), context)];
      }
      case 'emphasis':
      case 'strong':
        return [element(node.type, {}, buildInlines(node.children, context))];
      case 'inlineCode': {
        const value = node.value.replace(/\n/g, ' ');
        return [value.startsWith('= ') ? buildMathLine(value.slice(2), context) : element('inlineCode', {}, [value])];
      }
      case 'link': return [element('hyperlink', { url: node.url }, buildInlines(node.children, context))];
      case 'image':
      case 'imageReference': {
        // Outside the inventory of §7.1: an error, and the text as written.
        const url = node.type === 'image' ? node.url : context.definitions.get(node.identifier) ?? node.identifier;
        report(context.sink, 'markdown-image', context.file, url, `un image con asset ${url}, incluso con ![[id]]`);
        return [sourceOf(node, context)];
      }
      case 'linkReference': {
        const url = context.definitions.get(node.identifier);
        if (url !== undefined) return [element('hyperlink', { url }, buildInlines(node.children, context))];
        return [sourceOf(node, context)];
      }
      case 'break': return [element('break')];
      case 'html':
        if (/^<!--[\s\S]*-->$/.test(node.value)) return [];
        reportOnce(context.sink, 'raw-html', context.file, undefined, 'usa **forte** e una class');
        return [node.value];
      default:
        // Other mdast nodes outside the inventory of §7.1 stay as literal text.
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

  /** An inline `id reference` (§10), with its number slot (§0.14). */
  function buildReference(written: string, label: string | undefined, context: BuildContext): Element {
    const resolution = resolveId(written);
    if (!('node' in resolution)) {
      if (resolution.status === 'unresolved') {
        report(context.sink, 'reference-unresolved', context.file, written, "correggi l'id del collegamento");
      }
      const shown = label === undefined ? '' : label.includes('{n}') ? removeSlot(label) : label;
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
      if (context.root) {
        // The number may come later in reading order: the slot is filled once the root is built.
        const link = element('hyperlink', { ref: resolution.id }, ['']);
        link.meta = { numberSlot: { label, id: resolution.id, fallback: target.title ?? resolution.id } };
        return link;
      }
      shown = removeSlot(label);
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
    const content = node.items ? buildItems(node, node.items, context) : buildBlocks(node.markdown?.children ?? [], context);
    // Text inside nested embeds was counted when they were built.
    const stack: Child[] = [...content];
    while (stack.length > 0) {
      const child = stack.pop()!;
      if (typeof child === 'string') textSize += child.length;
      else if (child.type !== 'embed') for (const grandchild of child.children) stack.push(grandchild);
    }
    return content;
  }

  function buildItems(node: SourceNode, items: CompositionItem[], context: BuildContext): Child[] {
    const out: Child[] = [];
    for (const item of items) {
      if (item.type === 'embed') {
        const embed = buildEmbed(item.id, item.classes, context);
        if (embed) out.push(embed);
        continue;
      }
      // A definition [s]: url is not a block (§0.6).
      if (isComment(item.node) || item.node.type === 'definition') continue;
      if (item.node.type !== 'thematicBreak' && !node.directive) {
        report(context.sink, 'composition-content', node.file, undefined, "sposta il blocco in un text e mettine l'embed");
      }
      for (const block of buildBlock(item.node, context)) out.push(block);
    }
    return out;
  }

  /** An `embed` in a composition: the embedded node resolved in place (§11.3). */
  function buildEmbed(written: string, embedClasses: string[], context: BuildContext): Element | null {
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
    // A node already being expanded closes a cycle (§0.17): within the recursion limit it
    // is expanded again, past it the embed is left out, and without recursion it does not resolve.
    const appearances = context.expanding.filter((id) => id === resolution.id).length;
    if (appearances > 0) {
      if (target.recursion === undefined) return unresolved(resolution.id);
      if (appearances > target.recursion) return null;
    }
    // Safety limits of §11.1, after the rule of §0.17: the embed is cut and does not resolve,
    // with one tree-limit per file whose target is the first embed cut there.
    if (context.embedDepth >= MAX_EMBED_DEPTH || embedCount >= MAX_EMBEDS || textSize >= MAX_TEXT) {
      const key = `tree-limit\0${context.file}`;
      if (!reportedOnce.has(key)) {
        reportedOnce.add(key);
        const fix = `resta sotto ${MAX_EMBED_DEPTH} livelli di embed, ${MAX_EMBEDS} embed e ${MAX_TEXT} caratteri di testo`;
        report(diagnostics, 'tree-limit', context.file, written, fix);
      }
      return unresolved(written);
    }
    embedCount++;

    const attributes: Record<string, unknown> = { id: resolution.id, kind: target.kind };
    const lang = effectiveLang(target);
    if (lang !== undefined) attributes.lang = lang;
    // A class both on the object and on the embed counts as the embed's, in its position there.
    const classes = [...target.classes.filter((c) => !embedClasses.includes(c)), ...embedClasses];
    if (classes.length > 0) attributes.class = classes;
    // The path from the document folder; without it, `asset-missing` (§11.3).
    if (target.kind === 'image' && target.assetPath !== undefined) attributes.asset = target.assetPath;
    const embed = element('embed', attributes);
    embed.meta = { classes, embedClasses };
    // With infinite recursion the embed marks where the chapter comes back, without children.
    if (appearances > 0 && target.recursion === Infinity) {
      attributes.recursion = true;
      return embed;
    }
    const inner: BuildContext = {
      sink: null,
      file: target.file,
      source: target.source,
      lang,
      root: context.root,
      depth: context.depth,
      expanding: [...context.expanding, resolution.id],
      embedDepth: context.embedDepth + 1,
      definitions: target.definitions,
      inComposition: target.items !== undefined,
    };
    if (target.kind === 'chapter') {
      if (context.root && target.title !== undefined) {
        const depth = context.depth + 1;
        const counters = context.root.chapterCounters.slice(0, depth);
        counters[depth - 1] = (counters[depth - 1] ?? 0) + 1;
        context.root.chapterCounters = counters;
        attributes.depth = depth;
        attributes.number = counters.join('.');
        const title = element('title', {}, [target.title]);
        textSize += target.title.length;
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
    for (const child of buildContent(target, inner)) embed.children.push(child);
    return embed;
  }

  /** The files of the nodes that contain themselves through embeds of any kind (`embed-cycle`). */
  function embedCycles(): Set<string> {
    const inCycle = new Set<string>();
    const embedsOf = (node: SourceNode): SourceNode[] =>
      (node.items ?? []).flatMap((item) => {
        if (item.type !== 'embed') return [];
        const resolution = resolveId(item.id);
        return 'node' in resolution && !EMBED_FORBIDDEN_KINDS.has(resolution.node.kind) ? [resolution.node] : [];
      });
    for (const start of nodes.filter((node) => node.items)) {
      const stack = [...embedsOf(start)];
      const seen = new Set<SourceNode>();
      while (stack.length > 0) {
        const next = stack.pop()!;
        if (next === start) {
          // Each chapter of the cycle that does not enable recursion (§0.17).
          if (start.recursion === undefined) inCycle.add(start.file);
          break;
        }
        if (seen.has(next)) continue;
        seen.add(next);
        for (const embedded of embedsOf(next)) stack.push(embedded);
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
  const cycles = embedCycles();

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
        expanding: node.id === undefined ? [] : [node.id],
        embedDepth: 0,
        definitions: node.definitions,
        inComposition: node.items !== undefined,
      };
      if (node.kind === 'text') checkTextBlocks(node);
      // In class 1 a deck is a directive, so the only root composition is the article (reading).
      const content = node.kind === 'article' ? buildRoot(node, output) : buildContent(node, context);
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
    if (node.attributes === null) return;
    if ((node.markdown?.children ?? []).some((child) => !isComment(child))) {
      report(diagnostics, 'document-content', node.file, undefined, 'svuota il corpo del document file');
    }
    for (const child of node.markdown?.children ?? []) {
      const embed = child.type === 'paragraph' ? embedLine(child, node.source) : null;
      if (embed?.embed) report(diagnostics, 'embed-outside-composition', node.file, embed.id, `sposta ![[${embed.id}]] in una composition`);
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
      sink: diagnostics,
      file: node.file,
      source: node.source,
      lang: effectiveLang(node),
      root,
      depth: 0,
      expanding: node.id === undefined ? [] : [node.id],
      embedDepth: 0,
      definitions: node.definitions,
      inComposition: true,
    });
    const root: RootState = { chapterCounters: [], images: 0, firstNumbers: new Map() };
    const content = buildContent(node, contextFor(root));
    // The title of the article is the first child of its content, of type title-0 (§0.7).
    if (node.title !== undefined) {
      const title = element('title', {}, [node.title]);
      title.meta = { depth: 0 };
      textSize += node.title.length;
      content.unshift(title);
    }

    const stylesheetId = attributesOf.get(node)?.stylesheet;
    const resolution = typeof stylesheetId === 'string' ? resolveId(stylesheetId) : null;
    const sheetNode = resolution && 'node' in resolution && resolution.node.kind === 'stylesheet' ? resolution.node : null;
    const sheet = sheetNode?.stylesheet ?? null;
    // An em length out of decimal128 shows only once the cascade runs.
    const outOfRange = (property: string) => {
      const key = `stylesheet-unsupported\0${sheetNode!.file}\0${property}`;
      if (reportedOnce.has(key)) return;
      reportedOnce.add(key);
      report(diagnostics, 'stylesheet-unsupported', sheetNode!.file, property);
    };
    const rootRule = computeStyle({ type: 'root', classes: [], embedClasses: [] }, new Map(), null);
    const rootFinal = computeStyle({ type: 'root', classes: node.classes, embedClasses: [] }, rootRule, sheet, outOfRange);
    const difference = styleDifference(rootFinal, rootRule);
    if (Object.keys(difference).length > 0) output.computedStyle = difference;
    applyStyles(content, rootFinal, sheet, outOfRange, root.firstNumbers);
    return content;
  }

  /** The computed style pass over a root composition; it also fills the number slots. */
  function applyStyles(
    children: Child[],
    parent: ComputedStyle,
    sheet: ParsedStylesheet | null,
    outOfRange: (property: string) => void,
    firstNumbers: Map<string, string>,
  ): void {
    for (const child of children) {
      if (typeof child === 'string') continue;
      const slot = child.meta?.numberSlot;
      if (slot) {
        const number = firstNumbers.get(slot.id);
        child.children = [(number === undefined ? removeSlot(slot.label) : slot.label.replaceAll('{n}', number)) || slot.fallback];
      }
      const type = child.type === 'title' ? `title-${Math.min(child.meta?.depth ?? 1, 3)}` : child.type;
      const expected = computeStyle({ type, classes: [], embedClasses: [] }, parent, null);
      const final = computeStyle({ type, classes: child.meta?.classes ?? [], embedClasses: child.meta?.embedClasses ?? [] }, parent, sheet, outOfRange);
      if (child.meta?.textAlign) final.set('text-align', { text: child.meta.textAlign });
      const difference = styleDifference(final, expected);
      // The embed where a chapter comes back has no computed style (§0.17).
      if (Object.keys(difference).length > 0 && child.attributes.recursion !== true) child.attributes.computedStyle = difference;
      if (child.type === 'mathLine' && child.meta?.value && numberNotation(final) === 'compact') {
        child.attributes.display = displayString(child.meta.value, child.meta.lang, 'compact');
      }
      applyStyles(child.children, final, sheet, outOfRange, firstNumbers);
    }
  }

  return finish();

  function finish(): ResolvedTree {
    const result: ResolvedTree = {};
    outputs.sort((a, b) => compareCodePoints(String(a.id ?? ''), String(b.id ?? '')) || compareCodePoints(String(a.file), String(b.file)));
    if (outputs.length > 0) result.nodes = outputs as unknown as NonNullable<ResolvedTree['nodes']>;
    const associations = [...pairs.values()]
      .map((pair) => ({ ids: pair.ids, declaredIn: pair.declaredIn.sort(compareCodePoints) }))
      .sort((a, b) => compareCodePoints(a.ids[0], b.ids[0]) || compareCodePoints(a.ids[1], b.ids[1]));
    if (associations.length > 0) result.associations = associations;
    if (diagnostics.length > 0) result.diagnostics = sortDiagnostics(diagnostics);
    if (documentOutput) result.document = documentOutput;
    return result;
  }
}

/** A source that does not read: it has only its `syntax` error. */
function unreadableNode(file: string, extensionKind: string): SourceNode {
  return { file, extensionKind, kind: extensionKind, directive: false, attributes: null, yamlComments: 0, source: '', classes: [], definitions: new Map() };
}

function readTextNode(file: string, extensionKind: string, text: string, diagnostics: Diagnostic[]): SourceNode {
  const node: SourceNode = {
    file,
    extensionKind,
    kind: extensionKind,
    directive: false,
    attributes: [],
    yamlComments: 0,
    definitions: new Map(),
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
    node.yamlComments = map.comments;
    readIdentity(node, map.entries, diagnostics);
  } else {
    readIdentity(node, [], diagnostics);
  }
  // The body keeps its offsets in the file: the front matter lines are blanked, not cut.
  const bodyStart = text.length - split.body.length;
  node.source = text.slice(0, bodyStart).replace(/[^\n]/g, ' ') + split.body;
  const markdown = parseMarkdown(node.source);
  if (nestingDepth(markdown) > MAX_NESTING) {
    report(diagnostics, 'syntax', file, undefined, `annida meno di ${MAX_NESTING} livelli`);
    return node;
  }
  node.markdown = markdown;
  visitDefinitions(markdown, node.definitions);
  return node;
}

/** Link reference definitions, for the links written [text][label] (§7.1). */
function visitDefinitions(root: Root, definitions: Map<string, string>): void {
  // In reading order, so the first definition of a label wins, as in CommonMark.
  const stack: Nodes[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.type === 'definition' && !definitions.has(node.identifier)) definitions.set(node.identifier, node.url);
    if ('children' in node) for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]!);
  }
}

function readStylesheetNode(file: string, text: string, diagnostics: Diagnostic[]): SourceNode {
  const stylesheet = parseStylesheet(text);
  const node: SourceNode = {
    file,
    extensionKind: 'stylesheet',
    kind: 'stylesheet',
    directive: false,
    attributes: [],
    yamlComments: 0,
    definitions: new Map(),
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
  node.yamlComments = map.comments;
  readIdentity(node, map.entries, diagnostics);
  return node;
}

/** Takes `id` and `kind` out of the attributes. */
function readIdentity(node: SourceNode, entries: Array<[string, RawValue]>, diagnostics: Diagnostic[]): void {
  const attributes: Array<[string, RawValue]> = [];
  let kindSeen = false;
  let idSeen = false;
  for (const [key, value] of entries) {
    if (key === 'id' || key === 'kind') {
      if (key === 'id' ? idSeen : kindSeen) {
        report(diagnostics, 'attribute-invalid', node.file, key, `togli ${key}: ripete un'altra chiave`);
        continue;
      }
      if (key === 'id') idSeen = true;
      else kindSeen = true;
      if (value.type !== 'string') {
        report(diagnostics, 'attribute-invalid', node.file, key, `scrivi ${key} come stringa`);
        continue;
      }
      if (key === 'id') node.id = value.value;
      else node.kind = value.value;
      continue;
    }
    attributes.push([key, value]);
  }
  node.attributes = attributes;
  // Without a kind in the file, the node takes the kind of the file extension (reading).
  if (!kindSeen) report(diagnostics, 'kind-missing', node.file, undefined, `kind: ${node.extensionKind}`);
  node.directive = !KNOWN_KINDS.has(node.kind);
}

function readRetiredIds(text: string | null, diagnostics: Diagnostic[]): Map<string, string | null> {
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
    const successor = value.plain && value.value === 'null' ? null : value.value;
    // Keys and successors have the form of ids (§0.3).
    for (const id of [key, successor]) {
      if (id !== null && !ID_FORM.test(id)) report(diagnostics, 'id-invalid', RETIRED_IDS_FILE, id, slugify(id) || 'togli la riga');
    }
    retired.set(key, successor);
  }
  return retired;
}

type RetiredFinal = { id: string | null; cycle: boolean };

/**
 * The final successor of every retired id, following chains. Each id is walked
 * once and its result kept, so a long chain is linear, not quadratic.
 */
function finalSuccessors(retired: Map<string, string | null>, idIndex: Map<string, SourceNode[]>): Map<string, RetiredFinal> {
  const finals = new Map<string, RetiredFinal>();
  for (const start of retired.keys()) {
    const path: string[] = [];
    const onPath = new Set<string>();
    let current: string | null = start;
    let result: RetiredFinal;
    for (;;) {
      if (current === null || !retired.has(current) || idIndex.has(current)) {
        result = { id: current, cycle: false };
        break;
      }
      const known = finals.get(current);
      if (known) {
        result = known;
        break;
      }
      // An id whose successors run into a cycle is reported as part of it (§0.3).
      if (onPath.has(current)) {
        result = { id: null, cycle: true };
        break;
      }
      path.push(current);
      onPath.add(current);
      current = retired.get(current) ?? null;
    }
    for (const id of path) finals.set(id, result);
  }
  return finals;
}

function checkRetiredIds(
  retired: Map<string, string | null>,
  finals: Map<string, RetiredFinal>,
  idIndex: Map<string, SourceNode[]>,
  diagnostics: Diagnostic[],
): void {
  for (const [id, successor] of retired) {
    if (successor === null) continue;
    const final = finals.get(id)!;
    if (final.cycle) report(diagnostics, 'retired-cycle', RETIRED_IDS_FILE, id, 'togli una riga del ciclo');
    else if (retired.has(successor) && !idIndex.has(successor)) {
      report(diagnostics, 'retired-chain', RETIRED_IDS_FILE, id, `${id}: ${final.id ?? 'null'}`);
    } else if (!idIndex.has(successor)) {
      report(diagnostics, 'retired-successor-missing', RETIRED_IDS_FILE, id, `${id}: null`);
    }
  }
}
