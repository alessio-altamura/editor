// The language server suite: talks JSON-RPC over stdio to `doc-runtime language-server`
// on a temporary folder, as an editor would.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cliPath = join(resolve(here, '../..'), 'dist/src/cli.js');
const front = (id: string, kind: string, extra = '') => `---\nid: ${id}\nkind: ${kind}\n${extra}---\n`;

type Message = { id?: number; method?: string; params?: Record<string, unknown>; result?: unknown; error?: unknown };

const folder = mkdtempSync(join(tmpdir(), 'lsp-'));
writeFileSync(join(folder, 'doc.document.md'), '---\nid: doc\nkind: document\nspec-version: "0.1"\nlang: it\n---\n');
writeFileSync(join(folder, 'report.article.md'), front('report', 'article', 'title: Il rapporto\n') + '![[cap]]\n');
const chapter = front('cap', 'chapter', 'title: Le vendite\n') + '![[nota]]\n';
writeFileSync(join(folder, 'cap.chapter.md'), chapter);
const note = front('nota', 'text') + 'La somma fa `= 2 * 21`, come dice [[cap]].\n';
writeFileSync(join(folder, 'nota.text.md'), note);
writeFileSync(join(folder, 'idea.concept.md'), front('idea', 'concept') + 'Un concetto con parecchie parole dentro.\n');
const uri = (file: string) => pathToFileURL(join(folder, file)).href;

const server = spawn(process.execPath, [cliPath, 'language-server', '--stdio'], { stdio: ['pipe', 'pipe', 'inherit'] });
const received: Message[] = [];
let buffer = Buffer.alloc(0);
server.stdout!.on('data', (chunk: Buffer) => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    const end = buffer.indexOf('\r\n\r\n');
    if (end < 0) return;
    const length = Number(/Content-Length: (\d+)/i.exec(buffer.subarray(0, end).toString('ascii'))?.[1]);
    if (buffer.length < end + 4 + length) return;
    received.push(JSON.parse(buffer.subarray(end + 4, end + 4 + length).toString('utf8')) as Message);
    buffer = buffer.subarray(end + 4 + length);
  }
});
const send = (message: Message) => {
  const body = Buffer.from(JSON.stringify({ jsonrpc: '2.0', ...message }), 'utf8');
  server.stdin!.write(`Content-Length: ${body.length}\r\n\r\n`);
  server.stdin!.write(body);
};
const until = async <T>(find: () => T | undefined, ms = 5000): Promise<T | undefined> => {
  const end = Date.now() + ms;
  for (;;) {
    const found = find();
    if (found !== undefined || Date.now() > end) return found;
    await new Promise((r) => setTimeout(r, 20));
  }
};
let nextId = 1;
const call = async (method: string, params: Record<string, unknown>): Promise<unknown> => {
  const id = nextId++;
  send({ id, method, params });
  const answer = await until(() => received.find((m) => m.id === id && m.method === undefined));
  if (answer === undefined) throw new Error(`no answer to ${method}`);
  return answer.result;
};

let failed = 0;
const report = (label: string, problems: string[]) => {
  if (problems.length === 0) console.log(`ok   ${label}`);
  else {
    failed++;
    console.log(`FAIL ${label}\n  ${problems.join('\n  ')}`);
  }
};

try {
  const init = (await call('initialize', { processId: null, rootUri: pathToFileURL(folder).href, capabilities: {}, workspaceFolders: [{ uri: pathToFileURL(folder).href, name: 'doc' }] })) as { capabilities: Record<string, unknown> };
  send({ method: 'initialized', params: {} });
  report('initialize', ['completionProvider', 'definitionProvider', 'hoverProvider', 'referencesProvider'].filter((c) => !init.capabilities[c]).map((c) => `no ${c}`));

  // An error in an open buffer, with its range; then fixed.
  {
    const problems: string[] = [];
    let mark = received.length;
    const broken = front('cap', 'chapter', 'title: Le vendite\n') + '![[nota]]\n\n![[manca]]\n';
    send({ method: 'textDocument/didOpen', params: { textDocument: { uri: uri('cap.chapter.md'), languageId: 'markdown', version: 1, text: broken } } });
    const errors = await until(() => received.slice(mark).map((m) => m.method === 'textDocument/publishDiagnostics' && m.params?.uri === uri('cap.chapter.md') ? m.params.diagnostics as Array<{ code: string; range: unknown }> : undefined)
      .find((list) => list?.some((d) => d.code === 'embed-unresolved')));
    const unresolved = errors?.find((d) => d.code === 'embed-unresolved');
    if (!unresolved) problems.push(`no embed-unresolved: ${JSON.stringify(errors)}`);
    else if (JSON.stringify(unresolved.range) !== JSON.stringify({ start: { line: 7, character: 3 }, end: { line: 7, character: 8 } })) problems.push(`range ${JSON.stringify(unresolved.range)}`);
    mark = received.length;
    send({ method: 'textDocument/didChange', params: { textDocument: { uri: uri('cap.chapter.md'), version: 2 }, contentChanges: [{ text: chapter }] } });
    const after = await until(() => received.slice(mark).find((m) => m.method === 'textDocument/publishDiagnostics' && m.params?.uri === uri('cap.chapter.md'))?.params?.diagnostics as unknown[] | undefined);
    if (after === undefined || after.length !== 0) problems.push(`after the fix: ${JSON.stringify(after)}`);
    report('diagnostics of an open buffer, with the range, cleared when fixed', problems);
  }

  // Completion after ![[ and after [[.
  {
    const problems: string[] = [];
    const withEmbed = chapter + '\n![[';
    send({ method: 'textDocument/didChange', params: { textDocument: { uri: uri('cap.chapter.md'), version: 3 }, contentChanges: [{ text: withEmbed }] } });
    const lines = withEmbed.split('\n');
    const embedItems = (await call('textDocument/completion', { textDocument: { uri: uri('cap.chapter.md') }, position: { line: lines.length - 1, character: 3 } })) as Array<{ label: string; detail: string; documentation: string }>;
    const embedLabels = embedItems.map((i) => i.label).sort().join();
    if (embedLabels !== 'nota') problems.push(`after ![[: ${embedLabels}`);
    send({ method: 'textDocument/didOpen', params: { textDocument: { uri: uri('nota.text.md'), languageId: 'markdown', version: 1, text: note + 'Vedi [[' } } });
    const linkItems = (await call('textDocument/completion', { textDocument: { uri: uri('nota.text.md') }, position: { line: 5, character: 7 } })) as Array<{ label: string; detail: string; documentation: string }>;
    const linkLabels = linkItems.map((i) => i.label).sort().join();
    if (linkLabels !== 'cap,idea,nota,report') problems.push(`after [[: ${linkLabels}`);
    const idea = linkItems.find((i) => i.label === 'idea');
    if (idea?.detail !== 'concept' || !idea.documentation.startsWith('Un concetto')) problems.push(`detail of idea: ${JSON.stringify(idea)}`);
    if (linkItems.find((i) => i.label === 'report')?.documentation !== 'Il rapporto') problems.push('the title of report');
    send({ method: 'textDocument/didChange', params: { textDocument: { uri: uri('nota.text.md'), version: 2 }, contentChanges: [{ text: note }] } });
    report('completion of ids after ![[ and [[', problems);
  }

  // Definition, hover, references.
  {
    const problems: string[] = [];
    const onCap = { textDocument: { uri: uri('nota.text.md') }, position: { line: 4, character: 41 } };
    const definition = (await call('textDocument/definition', onCap)) as Array<{ uri: string; range: unknown }>;
    if (definition.length !== 1 || definition[0]!.uri !== uri('cap.chapter.md') || JSON.stringify(definition[0]!.range) !== '{"start":{"line":0,"character":0},"end":{"line":0,"character":0}}') problems.push(`definition ${JSON.stringify(definition)}`);
    const hoverCap = (await call('textDocument/hover', onCap)) as { contents: { value: string } } | null;
    if (!hoverCap?.contents.value.includes('chapter') || !hoverCap.contents.value.includes('Le vendite')) problems.push(`hover on [[cap]]: ${JSON.stringify(hoverCap)}`);
    const hoverMath = (await call('textDocument/hover', { textDocument: { uri: uri('nota.text.md') }, position: { line: 4, character: 16 } })) as { contents: { value: string } } | null;
    if (!hoverMath?.contents.value.includes('42')) problems.push(`hover on the math line: ${JSON.stringify(hoverMath)}`);
    const references = (await call('textDocument/references', { ...onCap, context: { includeDeclaration: false } })) as Array<{ uri: string; range: { start: { line: number; character: number } } }>;
    const where = references.map((r) => `${r.uri.split('/').pop()}:${r.range.start.line}:${r.range.start.character}`).sort().join();
    if (where !== 'nota.text.md:4:36,report.article.md:5:3') problems.push(`references ${where}`);
    report('definition, hover (id and math line), references', problems);
  }

  // Rename and «Estrai in un oggetto» as WorkspaceEdits, computed by the operations.
  {
    const problems: string[] = [];
    type Change = { kind?: string; uri?: string; textDocument?: { uri: string }; edits?: Array<{ newText: string }> };
    const name = (u: string | undefined) => u?.split('/').pop();
    const rename = (await call('textDocument/rename', { textDocument: { uri: uri('nota.text.md') }, position: { line: 4, character: 38 }, newName: 'capitolo' })) as { documentChanges: Change[] };
    const edited = rename.documentChanges.filter((c) => c.textDocument).map((c) => name(c.textDocument!.uri)).sort().join();
    if (edited !== 'cap.chapter.md,nota.text.md,report.article.md,retired-ids.yaml') problems.push(`rename edits ${edited}`);
    if (!rename.documentChanges.some((c) => c.kind === 'create' && name(c.uri) === 'retired-ids.yaml')) problems.push('rename does not create retired-ids.yaml');
    const textOf = (file: string) => rename.documentChanges.find((c) => name(c.textDocument?.uri) === file)?.edits?.[0]?.newText ?? '';
    if (!textOf('report.article.md').includes('![[capitolo]]') || !textOf('nota.text.md').includes('[[capitolo]]') || !textOf('cap.chapter.md').includes('id: capitolo') || textOf('retired-ids.yaml') !== 'cap: capitolo\n') problems.push('rename texts');
    // A paragraph written in the chapter: composition-content, and its quick fix.
    const mark = received.length;
    send({ method: 'textDocument/didChange', params: { textDocument: { uri: uri('cap.chapter.md'), version: 4 }, contentChanges: [{ text: chapter + '\nUn capoverso scritto qui.\n' }] } });
    const diagnostics = await until(() => received.slice(mark).map((m) => m.method === 'textDocument/publishDiagnostics' && m.params?.uri === uri('cap.chapter.md') ? m.params.diagnostics as Array<{ code: string }> : undefined)
      .find((list) => list?.some((d) => d.code === 'composition-content')));
    const actions = (await call('textDocument/codeAction', { textDocument: { uri: uri('cap.chapter.md') }, range: { start: { line: 7, character: 0 }, end: { line: 7, character: 5 } }, context: { diagnostics: diagnostics?.filter((d) => d.code === 'composition-content') ?? [] } })) as Array<{ title: string; edit: { documentChanges: Change[] } }>;
    const action = actions.find((a) => a.title === 'Estrai in un oggetto');
    if (!action) problems.push(`no quick fix: ${JSON.stringify(actions)}`);
    else {
      const created = action.edit.documentChanges.find((c) => c.kind === 'create');
      const texts = action.edit.documentChanges.find((c) => name(c.textDocument?.uri) === 'cap-texts.text.md')?.edits?.[0]?.newText;
      const chapterText = action.edit.documentChanges.find((c) => name(c.textDocument?.uri) === 'cap.chapter.md')?.edits?.[0]?.newText;
      if (name(created?.uri) !== 'cap-texts.text.md' || texts !== '---\nkind: text\n---\n{#un-capoverso-scritto-qui}\n\nUn capoverso scritto qui.\n' || !chapterText?.endsWith('![[nota]]\n\n![[un-capoverso-scritto-qui]]\n')) {
        problems.push(`quick fix ${JSON.stringify(action.edit)}`);
      }
    }
    report('rename and «Estrai in un oggetto» as WorkspaceEdits', problems);
  }

  await call('shutdown', {});
  send({ method: 'exit' });
  const code = await new Promise<number | null>((done) => server.once('exit', done));
  if (code !== 0) report('exit', [`exit code ${code}`]);
} catch (error) {
  failed++;
  console.log(`FAIL ${String(error)}`);
  server.kill();
} finally {
  rmSync(folder, { recursive: true, force: true });
}
console.log(failed === 0 ? '\nlanguage server suite: all pass' : `\nlanguage server suite: ${failed} failed`);
if (failed > 0) process.exitCode = 1;
