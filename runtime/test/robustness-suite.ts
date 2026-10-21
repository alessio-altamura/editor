// Cases the examples of the spec do not cover: crashes, exit codes and rules
// found by review. Each case writes a folder, runs the cli and checks the tree.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cliPath = join(resolve(here, '../..'), 'dist/src/cli.js');

interface Diagnostic {
  severity: string;
  code: string;
  file: string;
  target?: string;
  fix?: string;
}
interface Tree {
  nodes?: Array<Record<string, unknown> & { id?: string; attributes?: Record<string, unknown>; content?: unknown[] }>;
  diagnostics?: Diagnostic[];
  [key: string]: unknown;
}
interface Run {
  status: number | null;
  tree: Tree;
  stdout: string;
}

const DOCUMENT = '---\nid: doc\nkind: document\ntags: []\nspec-version: "0.1"\n---\n';
const front = (id: string, kind: string, extra = '') => `---\nid: ${id}\nkind: ${kind}\n${extra}---\n`;

/** Writes the files (a Buffer is written as is), adds the document file unless `doc` is false, runs the cli. */
function run(files: Record<string, string | Buffer>, options: { doc?: boolean; setup?: (folder: string) => void } = {}): Run {
  const folder = mkdtempSync(join(tmpdir(), 'robustness-'));
  try {
    if (options.doc !== false) writeFileSync(join(folder, 'doc.document.md'), DOCUMENT);
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(folder, path)), { recursive: true });
      writeFileSync(join(folder, path), content);
    }
    options.setup?.(folder);
    const result = spawnSync(process.execPath, [cliPath, 'resolve-tree', folder], { encoding: 'utf8' });
    let tree: Tree = {};
    try {
      tree = JSON.parse(result.stdout) as Tree;
    } catch {
      // Checked by the caller through stdout.
    }
    return { status: result.status, tree, stdout: result.stdout };
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

const has = (tree: Tree, code: string, target?: string, file?: string) =>
  (tree.diagnostics ?? []).some((d) => d.code === code && (target === undefined || d.target === target) && (file === undefined || d.file === file));
const count = (tree: Tree, code: string) => (tree.diagnostics ?? []).filter((d) => d.code === code).length;
const node = (tree: Tree, id: string) => tree.nodes?.find((n) => n.id === id);
const json = (value: unknown) => JSON.stringify(value);

const cases: Array<[string, () => string | null]> = [];
/** A case returns null when it passes, or what went wrong. */
function check(name: string, body: () => string | null): void {
  cases.push([name, body]);
}
function tree(r: Run): string | null {
  if (r.stdout === '' || (r.status !== 0 && r.status !== 1)) return `exit ${r.status}, stdout ${json(r.stdout.slice(0, 80))}`;
  return null;
}

// A. Crashes and exit codes.
check('a directive that embeds itself gives embed-cycle', () => {
  const r = run({ 'd.timeline.md': front('d', 'timeline') + '![[d]]\n' });
  return tree(r) ?? (has(r.tree, 'embed-cycle', 'd') && r.status === 1 ? null : json(r.tree.diagnostics));
});
check('two directives that embed each other give embed-cycle on both', () => {
  const r = run({ 'a.timeline.md': front('a', 'timeline') + '![[b]]\n', 'b.timeline.md': front('b', 'timeline') + '![[a]]\n' });
  return tree(r) ?? (has(r.tree, 'embed-cycle', 'a') && has(r.tree, 'embed-cycle', 'b') ? null : json(r.tree.diagnostics));
});
check('a chapter that contains itself through a directive gives embed-cycle', () => {
  const r = run({ 'c.chapter.md': front('c', 'chapter') + '![[d]]\n', 'd.timeline.md': front('d', 'timeline') + '![[c]]\n' });
  return tree(r) ?? (has(r.tree, 'embed-cycle', 'c') ? null : json(r.tree.diagnostics));
});
check('a broken symbolic link is not followed', () => {
  const r = run({}, { setup: (f) => symlinkSync(join(f, 'missing.text.md'), join(f, 'x.text.md')) });
  return tree(r) ?? (r.tree.nodes === undefined ? null : json(r.tree));
});
check('a cycle of symbolic links is not followed', () => {
  const r = run({}, { setup: (f) => symlinkSync(f, join(f, 'loop')) });
  return tree(r);
});
check('a symbolic link to a file outside the folder is not read', () => {
  const outside = mkdtempSync(join(tmpdir(), 'outside-'));
  writeFileSync(join(outside, 'secret.text.md'), front('secret', 'text') + 'Fuori.\n');
  try {
    const r = run({}, { setup: (f) => symlinkSync(join(outside, 'secret.text.md'), join(f, 'secret.text.md')) });
    return tree(r) ?? (node(r.tree, 'secret') === undefined ? null : 'the file outside was read');
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});
check('a file name that is not UTF-8 gives syntax', () => {
  const r = run({}, { setup: (f) => writeFileSync(Buffer.concat([Buffer.from(f + '/x'), Buffer.from([0xff]), Buffer.from('.text.md')]), 'x') });
  return tree(r) ?? (has(r.tree, 'syntax') ? null : json(r.tree));
});
check('a file that is not UTF-8 gives syntax and nothing else', () => {
  const r = run({ 'x.text.md': Buffer.concat([Buffer.from(front('x', 'text')), Buffer.from([0xc3, 0x28, 0x0a])]) });
  return tree(r) ?? (has(r.tree, 'syntax', undefined, 'x.text.md') && r.tree.diagnostics!.length === 1 ? null : json(r.tree));
});
check('3000 nested block quotes give syntax', () => {
  const r = run({ 'x.text.md': front('x', 'text') + '>'.repeat(3000) + ' ciao\n' });
  return tree(r) ?? (has(r.tree, 'syntax', undefined, 'x.text.md') ? null : json(r.tree.diagnostics));
});
check('5000 parentheses in a math line make it invalid', () => {
  const r = run({ 'x.text.md': front('x', 'text') + '`= ' + '('.repeat(5000) + '1' + ')'.repeat(5000) + '`\n' });
  return tree(r) ?? (has(r.tree, 'math-line-invalid') ? null : json(r.tree.diagnostics));
});
check('keys of Object.prototype in a stylesheet are unsupported, not crashes', () => {
  const css = '/*\nkind: stylesheet\nid: s\n*/\n.a { font-weight: constructor; font-weight: __proto__; }\nconstructor { color: red; }\ntoString { color: red; }\n__proto__ { color: red; }\n';
  const r = run({ 's.stylesheet.css': css });
  return tree(r) ?? (count(r.tree, 'stylesheet-unsupported') === 5 ? null : json(r.tree.diagnostics));
});
check('an attribute named __proto__ stays in attributes', () => {
  const r = run({ 'k.concept.md': front('k', 'concept', '__proto__: x\nconstructor: y\n') + 'Idea.\n' });
  const attributes = node(r.tree, 'k')?.attributes;
  return tree(r) ?? (json(attributes) === json(JSON.parse('{"__proto__":"x","constructor":"y"}')) ? null : r.stdout);
});
check('a lang named like a prototype key does not crash', () => {
  const r = run({ 'x.text.md': front('x', 'text', 'lang: constructor\n') + '`= 1 + 1`\n' });
  return tree(r);
});
check('a canvas that is JSON but not JSON Canvas gives syntax', () => {
  const descriptor = front('cv', 'canvas-file', 'asset: a.canvas\n') + 'Canvas.\n';
  for (const canvas of ['null', '{"nodes":[null]}', '{"nodes":3}', '[]']) {
    const r = run({ 'cv.canvas-file.md': descriptor, 'a.canvas': canvas });
    const problem = tree(r) ?? (has(r.tree, 'syntax', undefined, 'cv.canvas-file.md') ? null : `${canvas}: ${json(r.tree.diagnostics)}`);
    if (problem) return problem;
  }
  return null;
});

// B. Rules the spec determines.
const text = (id: string) => ({ [`${id}.text.md`]: front(id, 'text') + 'Testo.\n' });
check('a trailing space or tab after ![[id]] keeps the embed', () => {
  const r = run({ 'a.article.md': front('a', 'article') + '![[t]] \t\n', ...text('t') });
  return tree(r) ?? (r.tree.diagnostics === undefined ? null : json(r.tree.diagnostics));
});
check('a trailing space after a correct class sign keeps the class', () => {
  const r = run({ 'a.article.md': front('a', 'article') + '![[t]]{.nota} \n', ...text('t') });
  const content = json(node(r.tree, 'a')?.content);
  return tree(r) ?? (r.tree.diagnostics === undefined && content.includes('"class":["nota"]') ? null : r.stdout);
});
check('a class sign on the next line is embed-class-invalid', () => {
  const r = run({ 'a.article.md': front('a', 'article') + '![[t]]\n{.nota}\n', ...text('t') });
  return tree(r) ?? (has(r.tree, 'embed-class-invalid', '{.nota}') ? null : json(r.tree.diagnostics));
});
check('a repeated key gives attribute-invalid on the second, and the first holds', () => {
  const r = run({ 'c.chapter.md': front('c', 'chapter', 'title: Uno\ntitle: Due\n') });
  const title = node(r.tree, 'c')?.attributes?.title;
  return tree(r) ?? (has(r.tree, 'attribute-invalid', 'title') && title === 'Uno' && !has(r.tree, 'syntax') ? null : r.stdout);
});
check('a repeated id keeps the first', () => {
  const r = run({ 'k.concept.md': '---\nid: k\nid: j\nkind: concept\n---\nIdea.\n' });
  return tree(r) ?? (node(r.tree, 'k') && has(r.tree, 'attribute-invalid', 'id') ? null : r.stdout);
});
check('links by reference are hyperlinks with url', () => {
  const r = run({ 'x.text.md': front('x', 'text') + 'Vedi [il sito][s] e [s].\n\n[s]: https://example.org\n' });
  const content = json(node(r.tree, 'x')?.content);
  const link = '["hyperlink",{"url":"https://example.org"},';
  return tree(r) ?? (content.split(link).length === 3 ? null : content);
});
check('associations declared by a kind that admits none give association-kind', () => {
  const r = run({
    'a.article.md': front('a', 'article', 'associations: [k]\n'),
    'c.chapter.md': front('c', 'chapter', 'associations: [k]\n'),
    's.stylesheet.css': '/*\nkind: stylesheet\nid: s\nassociations: [k]\n*/\n',
    'k.concept.md': front('k', 'concept') + 'Idea.\n',
  });
  const leaked = (r.tree.nodes ?? []).some((n) => n.attributes && 'associations' in n.attributes);
  return tree(r) ?? (count(r.tree, 'association-kind') === 3 && !leaked && r.tree.associations === undefined ? null : r.stdout);
});
check('associations in the document file give association-kind', () => {
  const r = run({ 'doc.document.md': DOCUMENT.replace('tags: []\n', 'tags: []\nassociations: [k]\n'), 'k.concept.md': front('k', 'concept') + 'Idea.\n' }, { doc: false });
  return tree(r) ?? (has(r.tree, 'association-kind', undefined, 'doc.document.md') ? null : json(r.tree.diagnostics));
});
check('a string attribute written "[[id]]" is an id reference', () => {
  const r = run({ 'c.chapter.md': front('c', 'chapter', 'title: "[[k]]"\n'), 'k.concept.md': front('k', 'concept') + 'Idea.\n', 'i.image.md': front('i', 'image', 'asset: "[[nessuno]]"\n') + 'Foto.\n' });
  return tree(r) ?? (node(r.tree, 'c')?.attributes?.title === 'k' && has(r.tree, 'reference-unresolved', 'nessuno') ? null : r.stdout);
});
check('a directive gives its title to [[id]], its lang to math lines, and drops tags: []', () => {
  const r = run({
    'd.timeline.md': front('d', 'timeline', 'title: La linea\nlang: en\ntags: []\n') + 'Totale `= 1000 + 234.5`.\n',
    'x.text.md': front('x', 'text') + 'Vedi [[d]].\n',
  });
  const d = json(node(r.tree, 'd'));
  const x = json(node(r.tree, 'x')?.content);
  return tree(r) ?? (x.includes('"La linea"') && d.includes('"display":"1,234.5"') && !d.includes('tags') && !has(r.tree, 'reference-text-missing') ? null : r.stdout);
});
check('a folder with only the document file gives {}', () => {
  const r = run({});
  return tree(r) ?? (r.stdout.trim() === '{}' ? null : r.stdout);
});
check('a document file with an unclosed front matter gives only syntax', () => {
  const r = run({ 'doc.document.md': '---\nid: doc\nkind: document\n' }, { doc: false });
  return tree(r) ?? (r.tree.diagnostics?.length === 1 && has(r.tree, 'syntax') ? null : json(r.tree.diagnostics));
});
check('an id out of form and duplicate gives both codes', () => {
  const r = run({ 'a.concept.md': front('A_1', 'concept') + 'Uno.\n', 'b.concept.md': front('A_1', 'concept') + 'Due.\n' });
  return tree(r) ?? (count(r.tree, 'id-invalid') === 2 && count(r.tree, 'id-duplicate') === 2 ? null : json(r.tree.diagnostics));
});
check('an id duplicate and retired gives both codes', () => {
  const r = run({ 'a.concept.md': front('v', 'concept') + 'Uno.\n', 'b.concept.md': front('v', 'concept') + 'Due.\n', 'retired-ids.yaml': 'v: null\n' });
  return tree(r) ?? (count(r.tree, 'id-reused') === 2 && count(r.tree, 'id-duplicate') === 2 ? null : json(r.tree.diagnostics));
});
check('each YAML comment in the front matter gives attribute-invalid', () => {
  const r = run({ 'k.concept.md': '---\n# uno\nid: k\nkind: concept # due\n---\nIdea.\n' });
  return tree(r) ?? (count(r.tree, 'attribute-invalid') === 2 ? null : json(r.tree.diagnostics));
});
check('an em length out of decimal128 is stylesheet-unsupported', () => {
  const r = run({
    'a.article.md': front('a', 'article', 'class: [g]\nstylesheet: "[[s]]"\n') + '![[t]]\n',
    's.stylesheet.css': '/*\nkind: stylesheet\nid: s\n*/\n.g { font-size: 1e6144em; margin-left: 2em; }\n',
    ...text('t'),
  });
  const style = json(node(r.tree, 'a')?.computedStyle);
  return tree(r) ?? (has(r.tree, 'stylesheet-unsupported', 'font-size') && style === '{"margin-left":"22pt"}' ? null : r.stdout);
});

let failed = 0;
for (const [name, body] of cases) {
  let problem: string | null;
  try {
    problem = body();
  } catch (error) {
    problem = String(error);
  }
  if (problem === null) console.log(`ok   ${name}`);
  else {
    failed++;
    console.log(`FAIL ${name}\n  ${problem}`);
  }
}
console.log(`\n${cases.length - failed}/${cases.length} robustness cases pass`);
if (failed > 0) process.exitCode = 1;
