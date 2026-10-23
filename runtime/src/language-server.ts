// The language server (§11.7): LSP over stdio on the runtime kept on. It reads and
// never writes files: diagnostics, completion of ids, definition, hover, references.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  CompletionItemKind,
  createConnection,
  DiagnosticSeverity,
  MarkupKind,
  StreamMessageReader,
  StreamMessageWriter,
  TextDocuments,
  TextDocumentSyncKind,
  type CompletionItem,
  type Diagnostic as LspDiagnostic,
  type Location,
  type Position,
} from 'vscode-languageserver/node';
import { LiveFolder } from './live.js';
import type { JsonML, ResolvedTree, TreeNode } from './tree.js';

/** The kinds an `![[id]]` cannot include (§8): no point in proposing them there. */
const NOT_EMBEDDABLE = new Set(['concept', 'scratch', 'article', 'deck', 'document', 'stylesheet', 'canvas-file']);
/** An id reference on a line: `[[id]]`, `[[id|text]]` or `![[id]]`. */
const REFERENCE = /(!?)\[\[([^[\]|\n]*)(\|[^[\]\n]*)?\]\]/g;

/** The folder of the document: the nearest one, from `start` up, with a document file. */
function documentFolder(start: string): string | null {
  for (let folder = start; ; folder = dirname(folder)) {
    try {
      if (readdirSync(folder).some((name) => name.endsWith('.document.md'))) return folder;
    } catch {
      // Not readable: go on up.
    }
    if (dirname(folder) === folder) return null;
  }
}

/** The text of the first strings of a content, for details and hovers. */
function firstWords(content: JsonML[] | undefined, words = 24): string {
  const parts: string[] = [];
  const visit = (item: JsonML) => {
    if (typeof item === 'string') parts.push(item);
    else for (const child of item.slice(1)) if (typeof child === 'string' || Array.isArray(child)) visit(child as JsonML);
  };
  (content ?? []).forEach(visit);
  const all = parts.join(' ').split(/\s+/).filter(Boolean);
  return all.slice(0, words).join(' ') + (all.length > words ? ' …' : '');
}

const describe = (node: TreeNode): string => {
  const title = node.attributes?.title;
  return typeof title === 'string' && title !== '' ? title : firstWords(node.content);
};

const within = (range: { start: Position; end: Position }, position: Position) =>
  (range.start.line < position.line || (range.start.line === position.line && range.start.character <= position.character)) &&
  (range.end.line > position.line || (range.end.line === position.line && range.end.character >= position.character));

export function startLanguageServer(): void {
  const connection = createConnection(new StreamMessageReader(process.stdin), new StreamMessageWriter(process.stdout));
  const documents = new TextDocuments(TextDocument);
  let live: LiveFolder | null = null;
  let workspace: string | null = null;
  /** The files with diagnostics published last time, to clear them when they have none. */
  let published = new Set<string>();

  const log = (line: string) => connection.console.log(line);
  const pathOf = (uri: string): string | null => {
    if (live === null || !uri.startsWith('file:')) return null;
    const file = relative(live.folder, fileURLToPath(uri));
    return file === '' || file.startsWith('..') || file.startsWith(sep) ? null : file.split(sep).join('/');
  };
  const uriOf = (file: string) => pathToFileURL(join(live!.folder, file)).href;
  /** The text of a file of the folder: the open buffer, else the file on disk. */
  const textOf = (file: string): string => {
    const open = live?.overlay.get(file);
    if (open !== undefined) return open;
    try {
      return readFileSync(join(live!.folder, file), 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    } catch {
      return '';
    }
  };

  const publish = () => {
    if (live === null) return;
    const byFile = new Map<string, LspDiagnostic[]>();
    for (const d of live.tree.diagnostics ?? []) {
      if (d.file === '.' || d.range === undefined) continue;
      const list = byFile.get(d.file) ?? [];
      list.push({
        range: d.range,
        severity: d.severity === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
        code: d.code,
        source: 'doc-runtime',
        message: `${d.code}${d.target === undefined ? '' : `: ${d.target}`}${d.fix === undefined ? '' : ` → ${d.fix}`}`,
      });
      byFile.set(d.file, list);
    }
    for (const file of published) if (!byFile.has(file)) void connection.sendDiagnostics({ uri: uriOf(file), diagnostics: [] });
    for (const [file, diagnostics] of byFile) void connection.sendDiagnostics({ uri: uriOf(file), diagnostics });
    published = new Set(byFile.keys());
  };

  /** Opens the folder of the document once: the workspace folder, or the one of the first file. */
  const ensureLive = (uri?: string) => {
    if (live !== null) return;
    const candidates = [workspace, uri?.startsWith('file:') ? dirname(fileURLToPath(uri)) : null];
    for (const start of candidates) {
      if (start === null) continue;
      const folder = existsSync(start) && readdirSync(start).some((name) => name.endsWith('.document.md')) ? start : start === workspace ? null : documentFolder(start);
      if (folder === null) continue;
      live = new LiveFolder(folder, publish, log);
      for (const document of documents.all()) {
        const file = pathOf(document.uri);
        if (file !== null) live.overlay.set(file, document.getText());
      }
      live.recompute();
      publish();
      return;
    }
  };

  const nodeById = (tree: ResolvedTree, id: string) => (tree.nodes ?? []).filter((node) => node.id === id);
  /** The reference under the cursor: its id and the range of the id. */
  const referenceAt = (uri: string, position: Position): { id: string; embed: boolean } | null => {
    const document = documents.get(uri);
    const file = pathOf(uri);
    const text = document?.getText() ?? (file === null ? '' : textOf(file));
    const line = text.split('\n')[position.line] ?? '';
    for (const match of line.matchAll(REFERENCE)) {
      if (match.index! <= position.character && position.character <= match.index! + match[0].length) {
        return { id: match[2]!.trim(), embed: match[1] === '!' };
      }
    }
    return null;
  };

  connection.onInitialize((params) => {
    const folder = params.workspaceFolders?.[0]?.uri ?? params.rootUri;
    workspace = folder?.startsWith('file:') ? fileURLToPath(folder) : null;
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: { triggerCharacters: ['['] },
        definitionProvider: true,
        hoverProvider: true,
        referencesProvider: true,
      },
      serverInfo: { name: 'doc-runtime' },
    };
  });
  connection.onInitialized(() => ensureLive());

  documents.onDidChangeContent(({ document }) => {
    ensureLive(document.uri);
    const file = pathOf(document.uri);
    if (live === null || file === null) return;
    live.overlay.set(file, document.getText());
    live.schedule();
  });
  documents.onDidClose(({ document }) => {
    const file = pathOf(document.uri);
    if (live === null || file === null) return;
    live.overlay.delete(file);
    live.schedule();
  });

  connection.onCompletion(({ textDocument, position }): CompletionItem[] => {
    const document = documents.get(textDocument.uri);
    if (live === null || document === undefined) return [];
    const line = document.getText({ start: { line: position.line, character: 0 }, end: position });
    const open = /(!?)\[\[([^[\]|\n]*)$/.exec(line);
    if (!open) return [];
    const embed = open[1] === '!';
    const after = document.getText({ start: position, end: { line: position.line, character: position.character + 2 } });
    const range = { start: { line: position.line, character: position.character - open[2]!.length }, end: position };
    const self = pathOf(textDocument.uri);
    const seen = new Set<string>();
    const items: CompletionItem[] = [];
    for (const node of live.tree.nodes ?? []) {
      if (node.id === undefined || seen.has(node.id)) continue;
      // After ![[ only what an embed can include, and not the file itself.
      if (embed && (NOT_EMBEDDABLE.has(node.kind) || node.file === self)) continue;
      seen.add(node.id);
      items.push({
        label: node.id,
        kind: CompletionItemKind.Reference,
        detail: node.kind,
        documentation: describe(node),
        textEdit: { range, newText: after === ']]' ? node.id : `${node.id}]]` },
      });
    }
    return items;
  });

  connection.onDefinition(({ textDocument, position }): Location[] => {
    const reference = referenceAt(textDocument.uri, position);
    if (live === null || reference === null) return [];
    const start = { line: 0, character: 0 };
    return nodeById(live.tree, reference.id).map((node) => ({ uri: uriOf(node.file), range: { start, end: start } }));
  });

  connection.onHover(({ textDocument, position }) => {
    if (live === null) return null;
    const reference = referenceAt(textDocument.uri, position);
    if (reference !== null) {
      const nodes = nodeById(live.tree, reference.id);
      const value = nodes.length === 0
        ? `\`${reference.id}\`: nessun oggetto con questo id`
        : nodes.map((node) => `**${node.kind}** \`${reference.id}\`\n\n${describe(node)}`).join('\n\n---\n\n');
      return { contents: { kind: MarkupKind.Markdown, value } };
    }
    // A math line of this file: its value, as the tree computed it.
    const file = pathOf(textDocument.uri);
    for (const node of live.tree.nodes ?? []) {
      if (node.file !== file) continue;
      const stack: JsonML[] = [...(node.content ?? [])];
      while (stack.length > 0) {
        const item = stack.pop()!;
        if (typeof item === 'string') continue;
        const attributes = item[1] !== null && typeof item[1] === 'object' && !Array.isArray(item[1]) ? (item[1] as Record<string, unknown>) : {};
        const at = attributes.sourcePosition as { range: { start: Position; end: Position } } | undefined;
        if (item[0] === 'mathLine' && at && within(at.range, position)) {
          const value = attributes.invalid === true
            ? `riga di calcolo non valida: \`${String(item[2] ?? item[1])}\``
            : `= **${String(attributes.display)}**\n\nvalore: \`${String(attributes.value)}\``;
          return { contents: { kind: MarkupKind.Markdown, value }, range: at.range };
        }
        for (const child of item.slice(1)) if (typeof child === 'string' || Array.isArray(child)) stack.push(child as JsonML);
      }
    }
    return null;
  });

  connection.onReferences(({ textDocument, position, context }): Location[] => {
    if (live === null) return [];
    // The reference under the cursor, else the object of the file itself.
    const file = pathOf(textDocument.uri);
    const id = referenceAt(textDocument.uri, position)?.id ?? (live.tree.nodes ?? []).find((node) => node.file === file)?.id;
    if (id === undefined) return [];
    const locations: Location[] = [];
    const files = new Set([...live.listed.keys(), ...live.overlay.keys()]);
    for (const other of [...files].filter((f) => f.endsWith('.md')).sort()) {
      textOf(other).split('\n').forEach((line, number) => {
        for (const match of line.matchAll(REFERENCE)) {
          if (match[2]!.trim() !== id) continue;
          const start = match.index! + match[1]!.length + 2;
          locations.push({ uri: uriOf(other), range: { start: { line: number, character: start }, end: { line: number, character: start + match[2]!.length } } });
        }
      });
    }
    if (context.includeDeclaration) {
      const start = { line: 0, character: 0 };
      for (const node of nodeById(live.tree, id)) locations.unshift({ uri: uriOf(node.file), range: { start, end: start } });
    }
    return locations;
  });

  connection.onShutdown(() => live?.close());
  documents.listen(connection);
  connection.listen();
}
