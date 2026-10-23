// The operations suite: create, extract, rename and move through the cli, on a folder
// written here. Each runs first with --dry-run, which must write nothing.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const cliPath = join(resolve(here, '../..'), 'dist/src/cli.js');
const front = (id: string, kind: string, extra = '') => `---\nid: ${id}\nkind: ${kind}\ntags: []\n${extra}---\n`;

type Tree = { nodes?: Array<{ id?: string; kind: string; file: string; content?: unknown[]; attributes?: Record<string, unknown> }>; diagnostics?: Array<{ severity: string; code: string; file: string; target?: string }> };

const folder = mkdtempSync(join(tmpdir(), 'operations-'));
writeFileSync(join(folder, 'doc.document.md'), '---\nid: doc\nkind: document\ntags: []\nspec-version: "0.1"\n---\n');
writeFileSync(join(folder, 'report-q3.article.md'), front('report-q3', 'article', 'title: Il rapporto\n') + '![[cap]]\n');
writeFileSync(join(folder, 'cap.chapter.md'), front('cap', 'chapter', 'title: Le vendite\n') + '![[nota]]\n\nLe vendite sono calate del 12% nel terzo trimestre.\n\nÈ un altro capoverso, con [[nota]].\n');
writeFileSync(join(folder, 'nota.text.md'), front('nota', 'text') + 'Una nota con `[[nota]]` in codice.\n');
writeFileSync(join(folder, 'idea.concept.md'), front('idea', 'concept', 'associations: [nota]\nsee: "[[nota]]"\n') + 'Un concetto.\n');
writeFileSync(join(folder, 'retired-ids.yaml'), 'vecchia: nota\n');

const cli = (...args: string[]) => {
  const run = spawnSync(process.execPath, [cliPath, ...args, '--folder', folder], { encoding: 'utf8', cwd: folder });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr, summary: run.status === 0 ? (JSON.parse(run.stdout) as Record<string, unknown>) : null };
};
const tree = () => JSON.parse(spawnSync(process.execPath, [cliPath, 'resolve-tree', folder], { encoding: 'utf8' }).stdout) as Tree;
const errors = (t: Tree) => (t.diagnostics ?? []).filter((d) => d.severity === 'error');
const snapshot = () => {
  const files = new Map<string, string>();
  const walk = (prefix: string) => {
    for (const name of readdirSync(join(folder, prefix))) {
      const path = prefix === '' ? name : `${prefix}/${name}`;
      if (statSync(join(folder, path)).isDirectory()) walk(path);
      else files.set(path, readFileSync(join(folder, path), 'latin1'));
    }
  };
  walk('');
  return files;
};
const node = (t: Tree, id: string) => t.nodes?.find((n) => n.id === id);
const embeds = (t: Tree, id: string) => (node(t, id)?.content ?? []).filter((c): c is [string, { id: string }] => Array.isArray(c) && c[0] === 'embed').map((c) => c[1].id);
/** The tree without the file of each node and of each diagnostic, for move. */
const withoutFiles = (t: Tree) => ({
  ...t,
  nodes: t.nodes?.map(({ file: _file, ...rest }) => rest),
  diagnostics: t.diagnostics?.map(({ file: _file, ...rest }) => JSON.stringify(rest)).sort(),
});

let failed = 0;
const report = (label: string, problems: string[]) => {
  if (problems.length === 0) console.log(`ok   ${label}`);
  else {
    failed++;
    console.log(`FAIL ${label}\n  ${problems.join('\n  ')}`);
  }
};
/** Runs an operation with --dry-run, then for real; the dry run must write nothing and say the same files. */
const operate = (problems: string[], ...args: string[]) => {
  const before = snapshot();
  const dry = cli(...args, '--dry-run');
  if (!isDeepStrictEqual(snapshot(), before)) problems.push(`${args[0]} --dry-run wrote`);
  if (dry.status !== 0 || typeof dry.summary?.diff !== 'string') problems.push(`${args[0]} --dry-run: ${dry.status} ${dry.stderr}`);
  const real = cli(...args);
  if (real.status !== 0) problems.push(`${args[0]}: ${real.status} ${real.stderr}`);
  if (JSON.stringify(real.summary?.written) !== JSON.stringify(dry.summary?.written)) problems.push(`${args[0]}: the dry run said other files`);
  return real.summary;
};

try {
  const start = tree();
  const startErrors = errors(start).map((d) => d.code).sort().join();
  if (startErrors !== 'composition-content,composition-content') console.log(`note: start errors ${startErrors}`);

  // extract: the two paragraphs of the chapter become texts, in order, with ids from their first words.
  {
    const problems: string[] = [];
    const summary = operate(problems, 'extract', join(folder, 'cap.chapter.md'));
    const t = tree();
    if (JSON.stringify(summary?.extracted) !== '["le-vendite-sono-calate-del","e-un-altro-capoverso-con"]') problems.push(`extracted ${JSON.stringify(summary?.extracted)}`);
    if (JSON.stringify(embeds(t, 'cap')) !== '["nota","le-vendite-sono-calate-del","e-un-altro-capoverso-con"]') problems.push(`embeds ${JSON.stringify(embeds(t, 'cap'))}`);
    if (node(t, 'le-vendite-sono-calate-del')?.file !== 'cap-texts.text.md') problems.push('the texts file');
    if (errors(t).length !== 0) problems.push(`errors after: ${JSON.stringify(errors(t))}`);
    report('extract', problems);
  }

  // create: a text after an embed, the same words again (-2), and a concept refused for embed-kind.
  {
    const problems: string[] = [];
    operate(problems, 'create', 'text', '--in', 'cap', '--after', 'nota', '--text', 'I ritardi di agosto pesano.');
    operate(problems, 'create', 'text', '--in', 'cap', '--before', 'nota', '--text', 'I ritardi di agosto pesano.');
    const t = tree();
    if (JSON.stringify(embeds(t, 'cap')) !== '["i-ritardi-di-agosto-pesano-2","nota","i-ritardi-di-agosto-pesano","le-vendite-sono-calate-del","e-un-altro-capoverso-con"]') problems.push(`embeds ${JSON.stringify(embeds(t, 'cap'))}`);
    const before = snapshot();
    const refused = cli('create', 'concept', '--in', 'cap', '--text', 'Un concetto incluso');
    if (refused.status !== 1 || !refused.stderr.includes('embed-kind') || !isDeepStrictEqual(snapshot(), before)) problems.push(`concept: ${refused.status} ${refused.stderr}`);
    if (cli('create', 'text', '--in', 'cap', '--id', 'nota').status !== 2) problems.push('an id taken is accepted');
    if (cli('create', 'text', '--in', 'cap', '--id', 'vecchia').status !== 2) problems.push('a retired id is accepted');
    const image = join(folder, '..', 'foto.png');
    writeFileSync(image, Buffer.from('89504e470d0a1a0a', 'hex'));
    const made = operate(problems, 'create', 'image', '--in', 'cap', '--asset', image, '--text', 'La lavagna di luglio.');
    const descriptor = node(tree(), 'la-lavagna-di-luglio');
    if (made?.asset !== 'foto.png' || !existsSync(join(folder, 'foto.png')) || descriptor?.attributes?.asset !== 'foto.png') problems.push(`image ${JSON.stringify(made)}`);
    if (errors(tree()).length !== 0) problems.push(`errors after: ${JSON.stringify(errors(tree()))}`);
    report('create', problems);
  }

  // rename: every reference, in text, embeds and attributes, but not in code; the old id retired.
  {
    const problems: string[] = [];
    operate(problems, 'rename', 'nota', 'nota-breve');
    const t = tree();
    const all = [...snapshot()].filter(([file]) => file.endsWith('.md')).map(([, text]) => Buffer.from(text, 'latin1').toString('utf8')).join('\n');
    if (/\[\[nota\]\]|\[nota\]|id: nota\n/.test(all.replace('`[[nota]]`', ''))) problems.push('a reference left behind');
    if (!all.includes('`[[nota]]`')) problems.push('the code span changed');
    if (readFileSync(join(folder, 'retired-ids.yaml'), 'utf8') !== 'vecchia: nota-breve\nnota: nota-breve\n') problems.push(`retired-ids.yaml: ${readFileSync(join(folder, 'retired-ids.yaml'), 'utf8')}`);
    if (JSON.stringify(t.nodes?.find((n) => n.id === 'idea')?.attributes) !== '{"see":"nota-breve"}') problems.push(`idea ${JSON.stringify(node(t, 'idea'))}`);
    if (!JSON.stringify(t).includes('"declaredIn":["idea.concept.md"]')) problems.push('the association');
    if (errors(t).length !== 0 || (t.diagnostics ?? []).some((d) => d.code.startsWith('retired'))) problems.push(`diagnostics after: ${JSON.stringify(t.diagnostics)}`);
    report('rename', problems);
  }

  // move: out of the multi-object file into a file of its own, and back; the tree stays, but for file.
  {
    const problems: string[] = [];
    const before = tree();
    operate(problems, 'move', 'e-un-altro-capoverso-con', '--to', 'e-un-altro-capoverso-con.text.md');
    const out = tree();
    if (node(out, 'e-un-altro-capoverso-con')?.file !== 'e-un-altro-capoverso-con.text.md') problems.push('not moved out');
    if (!isDeepStrictEqual(withoutFiles(out), withoutFiles(before))) problems.push('the tree changed moving out');
    const back = operate(problems, 'move', 'e-un-altro-capoverso-con', '--to', 'cap-texts.text.md');
    if (JSON.stringify(back?.deleted) !== '["e-un-altro-capoverso-con.text.md"]') problems.push(`deleted ${JSON.stringify(back?.deleted)}`);
    if (!isDeepStrictEqual(tree(), before)) problems.push('the tree changed moving back');
    // The last text of a multi-object file: the file goes away.
    operate(problems, 'move', 'le-vendite-sono-calate-del', '--to', 'altri.text.md');
    const last = operate(problems, 'move', 'le-vendite-sono-calate-del', '--to', 'cap-texts.text.md');
    if (JSON.stringify(last?.deleted) !== '["altri.text.md"]' || existsSync(join(folder, 'altri.text.md'))) problems.push(`emptied file: ${JSON.stringify(last)}`);
    if (cli('move', 'nota-breve', '--to', 'nota.concept.md').status !== 2) problems.push('a move to another kind is accepted');
    report('move', problems);
  }

  // Every file written is canonical.
  {
    const check = spawnSync(process.execPath, [cliPath, 'format', folder, '--check'], { encoding: 'utf8' });
    report('the files written are canonical', check.status === 0 ? [] : [`format --check: ${check.stdout}`]);
  }
} finally {
  rmSync(folder, { recursive: true, force: true });
  rmSync(join(folder, '..', 'foto.png'), { force: true });
}
console.log(failed === 0 ? '\noperations suite: all pass' : `\noperations suite: ${failed} failed`);
if (failed > 0) process.exitCode = 1;
