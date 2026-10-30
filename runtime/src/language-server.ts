// The language server (§11.7): LSP over stdio on the runtime kept on. It reads and
// never writes files: diagnostics, completion of ids, definition, hover, references.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  CodeActionKind,
  CompletionItemKind,
  ResponseError,
  createConnection,
  DiagnosticSeverity,
  MarkupKind,
  StreamMessageReader,
  StreamMessageWriter,
  TextDocuments,
  TextDocumentSyncKind,
  type CompletionItem,
  type WorkspaceEdit,
  type Diagnostic as LspDiagnostic,
  type Location,
  type Position,
} from 'vscode-languageserver/node';
import { LiveFolder } from './live.js';
import { completions, definitionOf, hoverAt, referenceAt as referenceInLine, REFERENCE } from './language-services.js';
import { evaluate, OperationError, planExtract, planRename, type Outcome, type Plan, type Workspace } from './operations.js';
import { planTurnInto, tableAtLine } from './collection-operations.js';
import type { JsonML, ResolvedTree, TreeNode } from './tree.js';

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
    if (open !== undefined && open !== null) return open;
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
    return referenceInLine(text.split('\n')[position.line] ?? '', position.character);
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
        renameProvider: true,
        codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.RefactorRewrite] },
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
    const before = document.getText({ start: { line: position.line, character: 0 }, end: position });
    const after = document.getText({ start: position, end: { line: position.line, character: position.character + 2 } });
    return completions(live.tree, pathOf(textDocument.uri), before, after, position).map((item) => ({
      label: item.label,
      kind: CompletionItemKind.Reference,
      detail: item.detail,
      documentation: item.documentation,
      textEdit: { range: item.range, newText: item.newText },
    }));
  });

  connection.onDefinition(({ textDocument, position }): Location[] => {
    const reference = referenceAt(textDocument.uri, position);
    if (live === null || reference === null) return [];
    const start = { line: 0, character: 0 };
    return definitionOf(live.tree, reference.id).map((file) => ({ uri: uriOf(file), range: { start, end: start } }));
  });

  connection.onHover(({ textDocument, position }) => {
    if (live === null) return null;
    const file = pathOf(textDocument.uri);
    const text = documents.get(textDocument.uri)?.getText() ?? (file === null ? '' : textOf(file));
    const hover = hoverAt(live.tree, file, text.split('\n')[position.line] ?? '', position);
    return hover === null ? null : { contents: { kind: MarkupKind.Markdown, value: hover.markdown }, ...(hover.range ? { range: hover.range } : {}) };
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

  // The operations, on the open buffers: the editor applies the edit and can undo it.
  const workspaceOf = (folder: LiveFolder): Workspace => ({
    folder: folder.folder,
    files: () => [...new Set([...folder.listed.keys(), ...[...folder.overlay].filter(([, text]) => text !== null).map(([file]) => file)])],
    read: (file) => {
      const open = folder.overlay.get(file);
      if (open !== undefined) return open;
      try {
        return readFileSync(join(folder.folder, file), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
      } catch {
        return null;
      }
    },
    overlay: folder.overlay,
  });
  /** An outcome as a WorkspaceEdit: files created, replaced or deleted. */
  const toEdit = (workspace: Workspace, outcome: Outcome): WorkspaceEdit => {
    const documentChanges: NonNullable<WorkspaceEdit['documentChanges']> = [];
    for (const [file, text] of outcome.files) {
      const uri = uriOf(file);
      const current = workspace.read(file);
      if (text === null) {
        documentChanges.push({ kind: 'delete', uri });
        continue;
      }
      if (current === null) documentChanges.push({ kind: 'create', uri, options: { ignoreIfExists: true } });
      const lines = (current ?? '').split('\n');
      const end = { line: lines.length - 1, character: lines[lines.length - 1]!.length };
      documentChanges.push({
        textDocument: { uri, version: documents.get(uri)?.version ?? null },
        edits: [{ range: { start: { line: 0, character: 0 }, end }, newText: text }],
      });
    }
    return { documentChanges };
  };
  /** Runs a plan as the cli would, but returns the edit instead of writing. */
  const asEdit = (make: (workspace: Workspace) => Plan): WorkspaceEdit => {
    if (live === null) throw new ResponseError(-32803, 'nessuna cartella del documento');
    const workspace = workspaceOf(live);
    let plan: Plan;
    try {
      plan = make(workspace);
    } catch (error) {
      if (error instanceof OperationError) throw new ResponseError(-32803, error.message);
      throw error;
    }
    const outcome = evaluate(workspace, plan);
    if (outcome.newErrors.length > 0) {
      throw new ResponseError(-32803, `l'operazione porterebbe errori: ${outcome.newErrors.map((d) => `${d.code} ${d.target ?? ''}`.trim()).join(', ')}`);
    }
    return toEdit(workspace, outcome);
  };

  connection.onRenameRequest(({ textDocument, position, newName }) => {
    // The id under the cursor, else the object of the file.
    const file = pathOf(textDocument.uri);
    const id = referenceAt(textDocument.uri, position)?.id ?? (live?.tree.nodes ?? []).find((node) => node.file === file)?.id;
    if (id === undefined) throw new ResponseError(-32803, 'qui non c\'è un id da rinominare');
    return asEdit((workspace) => planRename(workspace, live!.tree, id, newName));
  });

  connection.onCodeAction(({ textDocument, context, range }) => {
    const file = pathOf(textDocument.uri);
    const wanted = context.diagnostics.filter((d) => d.code === 'composition-content');
    if (live === null || file === null) return [];
    // A table of a text or of a scratch under the cursor: «Trasforma in collection» (class 2).
    const table = tableAtLine(live.tree, file, documents.get(textDocument.uri)?.getText() ?? textOf(file), range.start.line + 1);
    if (table !== null) {
      try {
        return [{ title: 'Trasforma in collection', kind: CodeActionKind.RefactorRewrite, edit: asEdit((workspace) => planTurnInto(workspace, live!.tree, table.id, { line: table.line })) }];
      } catch (error) {
        log(`trasforma in collection: ${error instanceof Error ? error.message : String(error)}`);
        return [];
      }
    }
    if (wanted.length === 0) return [];
    try {
      return [{
        title: 'Estrai in un oggetto',
        kind: CodeActionKind.QuickFix,
        diagnostics: wanted,
        isPreferred: true,
        edit: asEdit((workspace) => planExtract(workspace, live!.tree, file)),
      }];
    } catch (error) {
      log(`estrai in un oggetto: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  });

  connection.onShutdown(() => live?.close());
  documents.listen(connection);
  connection.listen();
}
