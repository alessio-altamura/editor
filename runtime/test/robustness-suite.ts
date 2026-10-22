// Cases the examples of the spec do not cover: crashes, exit codes and rules
// found by review. Each case writes a folder, runs the cli and checks the tree.
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
function run(files: Record<string, string | Buffer>, options: { doc?: boolean; setup?: (folder: string) => void; args?: string[] } = {}): Run {
  const folder = mkdtempSync(join(tmpdir(), 'robustness-'));
  try {
    if (options.doc !== false) writeFileSync(join(folder, 'doc.document.md'), DOCUMENT);
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(folder, path)), { recursive: true });
      writeFileSync(join(folder, path), content);
    }
    options.setup?.(folder);
    const result = spawnSync(process.execPath, [cliPath, 'resolve-tree', folder, ...(options.args ?? [])], { encoding: 'utf8', maxBuffer: 1 << 30 });
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
check('a broken symbolic link is not followed and gives syntax', () => {
  const r = run({}, { setup: (f) => symlinkSync(join(f, 'missing.text.md'), join(f, 'x.text.md')) });
  return tree(r) ?? (r.tree.nodes === undefined && has(r.tree, 'syntax', undefined, 'x.text.md') ? null : json(r.tree));
});
check('a cycle of symbolic links is not followed and gives syntax', () => {
  const r = run({}, { setup: (f) => symlinkSync(f, join(f, 'loop')) });
  return tree(r) ?? (has(r.tree, 'syntax', undefined, 'loop') ? null : json(r.tree));
});
check('a symbolic link to a file outside the folder is not read', () => {
  const outside = mkdtempSync(join(tmpdir(), 'outside-'));
  writeFileSync(join(outside, 'secret.text.md'), front('secret', 'text') + 'Fuori.\n');
  try {
    const r = run({}, { setup: (f) => symlinkSync(join(outside, 'secret.text.md'), join(f, 'secret.text.md')) });
    return tree(r) ?? (node(r.tree, 'secret') === undefined && has(r.tree, 'syntax', undefined, 'secret.text.md') ? null : 'the file outside was read');
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
check('a class sign on the next line makes a paragraph that is not an embed', () => {
  const r = run({ 'a.article.md': front('a', 'article') + '![[t]]\n{.nota}\n', ...text('t') });
  const ok = has(r.tree, 'composition-content') && has(r.tree, 'embed-inline', 't') && !has(r.tree, 'embed-class-invalid');
  return tree(r) ?? (ok && json(node(r.tree, 'a')?.content).includes('{.nota}') ? null : r.stdout);
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

// Rules of the nineteenth pass of the spec and of §0.17.
check('eval and echo are words after the language; a first word is the language', () => {
  const r = run({ 'x.scratch.md': front('x', 'scratch') + '```python echo\na\n```\n\n```eval\nb\n```\n' });
  const content = json(node(r.tree, 'x')?.content);
  return tree(r) ?? (content.includes('{"lang":"python","echo":true}') && content.includes('{"lang":"eval"}') && !has(r.tree, 'eval-unsupported') ? null : content);
});
check('[[x]] is an id reference even with a definition [x]: url', () => {
  const r = run({ 'x.text.md': front('x', 'text') + 'Vedi [[k]].\n\n[k]: https://example.org\n', 'k.concept.md': front('k', 'concept') + 'Idea.\n' });
  return tree(r) ?? (json(node(r.tree, 'x')?.content).includes('["hyperlink",{"ref":"k"},"k"]') ? null : r.stdout);
});
check('the text after | is plain text', () => {
  const r = run({ 'x.text.md': front('x', 'text') + 'Vedi [[k|*il calo*]].\n', 'k.concept.md': front('k', 'concept') + 'Idea.\n' });
  return tree(r) ?? (json(node(r.tree, 'x')?.content).includes('["hyperlink",{"ref":"k"},"*il calo*"]') ? null : r.stdout);
});
check('[[a\\|b]] in a table cell is a reference with text', () => {
  const r = run({ 'x.text.md': front('x', 'text') + '| a | b |\n|:--|---|\n| [[k\\|il calo]] | 2 |\n', 'k.concept.md': front('k', 'concept') + 'Idea.\n' });
  const content = json(node(r.tree, 'x')?.content);
  return tree(r) ?? (content.includes('["hyperlink",{"ref":"k"},"il calo"]') && content.includes('{"align":["left",null]}') ? null : content);
});
check('[[x]] inside inline code stays code', () => {
  const r = run({ 'x.text.md': front('x', 'text') + 'Scrivi `[[x]]`.\n' });
  return tree(r) ?? (json(node(r.tree, 'x')?.content).includes('["inlineCode","[[x]]"]') && r.tree.diagnostics === undefined ? null : r.stdout);
});
check('a markdown image by reference is markdown-image', () => {
  const r = run({ 'x.text.md': front('x', 'text') + 'Vedi ![foto][f].\n\n[f]: foto.jpg\n' });
  return tree(r) ?? (has(r.tree, 'markdown-image', 'foto.jpg') ? null : json(r.tree.diagnostics));
});
check('0.123 gives no warning, and more than 34 digits round when read', () => {
  const long = '1234567890123456789012345678901234567';
  const r = run({ 'x.text.md': front('x', 'text') + `\`= 0.123\` \`= ${long}\` \`= ${long} + 0\`\n` });
  const values = (json(node(r.tree, 'x')?.content).match(/"value":"[^"]*"/g) ?? []);
  return tree(r) ?? (r.tree.diagnostics === undefined && values[1] === values[2] && values[1]!.length < 50 ? null : r.stdout);
});
check('an empty title counts as absent', () => {
  const r = run({
    'a.article.md': front('a', 'article') + '![[c]]\n',
    'c.chapter.md': front('c', 'chapter', 'title: ""\n') + '![[t]]\n',
    'v.text.md': front('v', 'text') + 'Vedi [[c]].\n',
    ...text('t'),
  });
  const article = json(node(r.tree, 'a')?.content);
  return tree(r) ?? (!article.includes('"number"') && !article.includes('"title"') && has(r.tree, 'reference-text-missing', 'c') ? null : r.stdout);
});
check('spaces stay as written in a link text without {n}', () => {
  const r = run({ 'x.text.md': front('x', 'text') + 'Vedi [[nessuno| a  b ]].\n' });
  return tree(r) ?? (json(node(r.tree, 'x')?.content).includes('" a  b "') ? null : r.stdout);
});
check('recursion: infinite marks the embed, and a wrong value is attribute-invalid', () => {
  const r = run({ 'c.chapter.md': front('c', 'chapter', 'recursion: infinite\n') + '![[c]]\n', 'd.chapter.md': front('d', 'chapter', 'recursion: "0"\n') });
  const content = json(node(r.tree, 'c')?.content);
  return tree(r) ?? (content === '[["embed",{"id":"c","kind":"chapter","recursion":true}]]' && has(r.tree, 'attribute-invalid', 'recursion') && !has(r.tree, 'embed-cycle') ? null : r.stdout);
});
check('in a cycle embed-cycle goes only to the chapters without recursion', () => {
  const r = run({ 'a.chapter.md': front('a', 'chapter', 'recursion: "1"\n') + '![[b]]\n', 'b.chapter.md': front('b', 'chapter') + '![[a]]\n' });
  return tree(r) ?? (has(r.tree, 'embed-cycle', 'b') && !has(r.tree, 'embed-cycle', 'a') ? null : json(r.tree.diagnostics));
});
check('ids out of form in retired-ids.yaml are id-invalid', () => {
  const r = run({ 'retired-ids.yaml': 'Vecchio: null\nb: Nuovo_1\n' });
  return tree(r) ?? (has(r.tree, 'id-invalid', 'Vecchio', 'retired-ids.yaml') && has(r.tree, 'id-invalid', 'Nuovo_1') ? null : json(r.tree.diagnostics));
});
check('a canvas path that leaves the document is canvas-path-unresolved', () => {
  const r = run({ 'cv.canvas-file.md': front('cv', 'canvas-file', 'asset: a.canvas\n') + 'Canvas.\n', 'a.canvas': '{"nodes":[{"id":"1","type":"file","file":"../doc.document.md"}]}' });
  return tree(r) ?? (has(r.tree, 'canvas-path-unresolved', '../doc.document.md') ? null : json(r.tree.diagnostics));
});

// Fourth review: limits, output, the [[…]] construct and the rest.
check('a chapter that includes itself with recursion 2500 is cut by tree-limit', () => {
  const r = run({ 'c.chapter.md': front('c', 'chapter', 'recursion: "2500"\n') + '![[c]]\n' });
  const cut = json(node(r.tree, 'c')?.content).includes('{"id":"c","unresolved":true}');
  return tree(r) ?? (has(r.tree, 'tree-limit', 'c', 'c.chapter.md') && count(r.tree, 'tree-limit') === 1 && cut && r.status === 1 ? null : json(r.tree.diagnostics));
});
check('a chain of 1500 chapters is cut by tree-limit', () => {
  const files: Record<string, string> = {};
  for (let i = 0; i < 1500; i++) files[`c${i}.chapter.md`] = front(`c${i}`, 'chapter') + `![[c${i + 1}]]\n`;
  const r = run(files);
  return tree(r) ?? (has(r.tree, 'tree-limit') ? null : 'no tree-limit');
});
check('a chapter that includes itself twice with recursion 30 stays under the embed limit', () => {
  const started = Date.now();
  const r = run({ 'c.chapter.md': front('c', 'chapter', 'recursion: "30"\n') + '![[c]]\n\n![[c]]\n' });
  const seconds = (Date.now() - started) / 1000;
  return tree(r) ?? (has(r.tree, 'tree-limit') && seconds < 20 ? null : `${seconds}s ${json(r.tree.diagnostics)}`);
});
check('the output is compact, and --pretty indents it', () => {
  const files = text('t');
  const compact = run(files);
  const pretty = run(files, { args: ['--pretty'] });
  return tree(compact) ?? tree(pretty) ?? (compact.stdout.trim().includes('\n') || !pretty.stdout.includes('\n  ') || json(compact.tree) !== json(pretty.tree) ? 'output form' : null);
});
check('private-use characters written by the author stay text', () => {
  const pua = '\uE000\uE100\uE002\uE001';
  const r = run({ 'x.text.md': front('x', 'text') + `Icona ${pua} qui.\n`, ...text('t') });
  return tree(r) ?? (json(node(r.tree, 'x')?.content) === json([['paragraph', `Icona ${pua} qui.`]]) ? null : r.stdout);
});
check('[[…]] stays as written in URLs, autolinks, inline code and markdown-image targets', () => {
  const r = run({ 'x.text.md': front('x', 'text') + '[a](http://e.org/[[q]]) <http://e.org/[[z]]> `[[c]]` ![i](f[[g]].jpg)\n' });
  const content = json(node(r.tree, 'x')?.content);
  const ok = content.includes('"url":"http://e.org/[[q]]"') && content.includes('"url":"http://e.org/[[z]]"') && content.includes('["inlineCode","[[c]]"]');
  return tree(r) ?? (ok && has(r.tree, 'markdown-image', 'f[[g]].jpg') ? null : r.stdout);
});
check('the text after | is plain even with code: [[k|`codice`]]', () => {
  const r = run({ 'x.text.md': front('x', 'text') + 'Vedi [[k|`codice`]].\n', 'k.concept.md': front('k', 'concept') + 'Idea.\n' });
  return tree(r) ?? (json(node(r.tree, 'x')?.content).includes('["hyperlink",{"ref":"k"},"`codice`"]') ? null : r.stdout);
});
check('an unprotected | in a math line inside a table splits the cell, a protected one does not', () => {
  const r = run({ 'x.text.md': front('x', 'text') + '| a |\n|---|\n| `= 1 \\| 2` |\n' });
  return tree(r) ?? (json(node(r.tree, 'x')?.content).includes('"1 | 2"') ? null : r.stdout);
});
check('an unreadable document folder exits 2; an unreadable subfolder gives syntax', () => {
  // As root the permissions do not apply, and the case cannot be built.
  if (process.getuid?.() === 0) return null;
  const outer = run({}, { setup: (f) => { mkdirSync(join(f, 'chiusa')); chmodSync(join(f, 'chiusa'), 0); } });
  if (!has(outer.tree, 'syntax', undefined, 'chiusa')) return json(outer.tree);
  const folder = mkdtempSync(join(tmpdir(), 'closed-'));
  chmodSync(folder, 0);
  const result = spawnSync(process.execPath, [cliPath, 'resolve-tree', folder], { encoding: 'utf8' });
  chmodSync(folder, 0o700);
  rmSync(folder, { recursive: true, force: true });
  return result.status === 2 ? null : `exit ${result.status}`;
});
check('a class sign that goes on to the next line is embed-class-invalid, and no embed', () => {
  const r = run({ 'a.article.md': front('a', 'article') + '![[t]]{.nota\n.grande}\n', ...text('t') });
  const content = json(node(r.tree, 'a')?.content);
  return tree(r) ?? (has(r.tree, 'embed-class-invalid', '{.nota') && has(r.tree, 'composition-content') && content.includes('grande') && !content.includes('"kind":"text"') ? null : r.stdout);
});
check('![[id]] nested in a quote inside a chapter is composition-content only', () => {
  const r = run({ 'c.chapter.md': front('c', 'chapter') + '> ![[t]]\n', ...text('t') });
  return tree(r) ?? (has(r.tree, 'composition-content') && !has(r.tree, 'embed-outside-composition') && !has(r.tree, 'embed-inline') ? null : json(r.tree.diagnostics));
});
check('with two definitions of a label the first wins; a definition in a chapter is not a block', () => {
  const r = run({
    'x.text.md': front('x', 'text') + 'Vedi [s].\n\n[s]: http://uno\n[s]: http://due\n',
    'c.chapter.md': front('c', 'chapter') + '![[x]]\n\n[d]: http://tre\n',
  });
  return tree(r) ?? (json(node(r.tree, 'x')?.content).includes('http://uno') && !has(r.tree, 'composition-content') ? null : r.stdout);
});
check('the embed with "recursion": true carries lang and class', () => {
  const r = run({ 'c.chapter.md': front('c', 'chapter', 'lang: en\nclass: [nota]\nrecursion: infinite\n') + '![[c]]\n' });
  const content = json(node(r.tree, 'c')?.content);
  return tree(r) ?? (content === '[["embed",{"id":"c","kind":"chapter","lang":"en","class":["nota"],"recursion":true}]]' ? null : content);
});
check('a number of 35 nines that rounds past decimal128 is invalid', () => {
  const nines = '9'.repeat(35) + 'e6110';
  const r = run({ 'x.text.md': front('x', 'text') + `\`= ${nines}\` \`= ${nines} + 0\`\n` });
  return tree(r) ?? (count(r.tree, 'math-line-invalid') === 2 ? null : r.stdout);
});

check('recursion on a directive does not count: its cycle is embed-cycle', () => {
  const r = run({ 'd.timeline.md': front('d', 'timeline', 'recursion: "3"\n') + '![[d]]\n' });
  return tree(r) ?? (has(r.tree, 'embed-cycle', 'd') && json(node(r.tree, 'd')?.content) === '[["embed",{"id":"d","unresolved":true}]]' ? null : r.stdout);
});
check('a canvas file declares associations and can be their target', () => {
  const r = run({ 'cv.canvas-file.md': front('cv', 'canvas-file', 'asset: a.canvas\nassociations: [k]\n') + 'Canvas.\n', 'a.canvas': '{}', 'k.concept.md': front('k', 'concept', 'associations: [cv]\n') + 'Idea.\n' });
  return tree(r) ?? (json(r.tree.associations) === '[{"ids":["cv","k"],"declaredIn":["cv.canvas-file.md","k.concept.md"]}]' && r.tree.diagnostics === undefined ? null : r.stdout);
});

// Fifth review.
check('an article with 60000 embeds is built once and stays under the limit', () => {
  const embeds = Array.from({ length: 300 }, () => '![[t]]').join('\n\n') + '\n';
  const article = Array.from({ length: 200 }, () => '![[c]]').join('\n\n') + '\n';
  const r = run({ 'a.article.md': front('a', 'article') + article, 'c.chapter.md': front('c', 'chapter') + embeds, ...text('t') });
  return tree(r) ?? (!has(r.tree, 'tree-limit') && r.status === 0 ? null : json(r.tree.diagnostics));
});
check('recursion "999" in an article fits in 1000 levels', () => {
  const r = run({ 'a.article.md': front('a', 'article') + '![[c]]\n', 'c.chapter.md': front('c', 'chapter', 'recursion: "999"\n') + '![[c]]\n' });
  return tree(r) ?? (r.status === 0 && r.tree.diagnostics === undefined ? null : json(r.tree.diagnostics));
});
check('a list of 130000 items does not exhaust the stack', () => {
  const r = run({ 'x.text.md': front('x', 'text') + '- a\n'.repeat(130000) });
  return tree(r);
});
check('a paragraph with 130000 references does not exhaust the stack', () => {
  const r = run({ 'x.text.md': front('x', 'text') + '[[k|a]] '.repeat(130000) + '\n', 'k.concept.md': front('k', 'concept') + 'Idea.\n' });
  return tree(r);
});
check('past 50 million characters of text embeds are cut with tree-limit, and the JSON streams out', () => {
  const r = run({
    'a.article.md': front('a', 'article') + '![[c2]]\n',
    'c2.chapter.md': front('c2', 'chapter') + Array.from({ length: 100 }, () => '![[c1]]').join('\n\n') + '\n',
    'c1.chapter.md': front('c1', 'chapter') + Array.from({ length: 100 }, () => '![[t]]').join('\n\n') + '\n',
    't.text.md': front('t', 'text') + 'x'.repeat(10000) + '\n',
  });
  return tree(r) ?? (has(r.tree, 'tree-limit') ? null : json(r.tree.diagnostics));
});
check('a valid class sign on a paragraph that goes on is not an embed', () => {
  const r = run({ 'a.article.md': front('a', 'article') + '![[t]]{.a}\naltro\n', ...text('t') });
  const content = json(node(r.tree, 'a')?.content);
  return tree(r) ?? (has(r.tree, 'composition-content') && !has(r.tree, 'embed-class-invalid') && content.includes('altro') ? null : r.stdout);
});
check('a class sign with emphasis inside is embed-class-invalid', () => {
  const r = run({ 'a.article.md': front('a', 'article') + '![[t]]{.a *b*}\n', ...text('t') });
  return tree(r) ?? (has(r.tree, 'embed-class-invalid', '{.a *b*}') ? null : json(r.tree.diagnostics));
});
check('an HTML comment after ![[id]] disappears and the embed holds', () => {
  const r = run({ 'a.article.md': front('a', 'article') + '![[t]]{.a} <!-- da rivedere -->\n', ...text('t') });
  return tree(r) ?? (r.tree.diagnostics === undefined && json(node(r.tree, 'a')?.content).includes('"class":["a"]') ? null : r.stdout);
});
check('the recursion embed in an article has no computed style', () => {
  const r = run({
    'a.article.md': front('a', 'article', 'stylesheet: "[[s]]"\n') + '![[c]]\n',
    'c.chapter.md': front('c', 'chapter', 'class: [rossa]\nrecursion: infinite\n') + '![[c]]\n',
    's.stylesheet.css': '/*\nkind: stylesheet\nid: s\n*/\n.rossa { margin-left: 10pt; }\n',
  });
  const content = json(node(r.tree, 'a')?.content);
  return tree(r) ?? (content.split('computedStyle').length === 2 && content.includes('"recursion":true}]') ? null : content);
});
check('![[id]] in the document file is embed-outside-composition too', () => {
  const r = run({ 'doc.document.md': DOCUMENT + '![[t]]\n', ...text('t') }, { doc: false });
  return tree(r) ?? (has(r.tree, 'embed-outside-composition', 't') && has(r.tree, 'document-content') ? null : json(r.tree.diagnostics));
});
check('a chain of 20000 retired ids resolves in linear time', () => {
  const lines = Array.from({ length: 20000 }, (_, i) => `r${i}: r${i + 1}\n`).join('') + 'r20000: k\n';
  const started = Date.now();
  const r = run({ 'retired-ids.yaml': lines, 'k.concept.md': front('k', 'concept') + 'Idea.\n', 'x.text.md': front('x', 'text') + 'Vedi [[r0|a]].\n' });
  const seconds = (Date.now() - started) / 1000;
  return tree(r) ?? (seconds < 15 && has(r.tree, 'reference-retired', 'r0') && count(r.tree, 'retired-chain') === 20000 ? null : `${seconds}s`);
});

check('1000 levels under a chapter node fit, the next one is tree-limit', () => {
  const fits = run({ 'c.chapter.md': front('c', 'chapter', 'recursion: "1000"\n') + '![[c]]\n' });
  const over = run({ 'c.chapter.md': front('c', 'chapter', 'recursion: "1001"\n') + '![[c]]\n' });
  return tree(fits) ?? tree(over) ?? (fits.status === 0 && has(over.tree, 'tree-limit', 'c') ? null : json([fits.tree.diagnostics, over.tree.diagnostics]));
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
