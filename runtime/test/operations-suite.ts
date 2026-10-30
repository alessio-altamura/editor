// The operations suite: create, extract, rename, move and those of the canvas through the cli, on a folder
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
    if (JSON.stringify(summary?.extracted) !== '["le-vendite-sono-calate","e-un-altro-capoverso"]') problems.push(`extracted ${JSON.stringify(summary?.extracted)}`);
    if (JSON.stringify(embeds(t, 'cap')) !== '["nota","le-vendite-sono-calate","e-un-altro-capoverso"]') problems.push(`embeds ${JSON.stringify(embeds(t, 'cap'))}`);
    if (node(t, 'le-vendite-sono-calate')?.file !== 'cap-texts.text.md') problems.push('the texts file');
    if (errors(t).length !== 0) problems.push(`errors after: ${JSON.stringify(errors(t))}`);
    report('extract', problems);
  }

  // create: a text after an embed, the same words again (-2), and a concept refused for embed-kind.
  {
    const problems: string[] = [];
    operate(problems, 'create', 'text', '--in', 'cap', '--after', 'nota', '--text', 'I ritardi di agosto pesano.');
    operate(problems, 'create', 'text', '--in', 'cap', '--before', 'nota', '--text', 'I ritardi di agosto pesano.');
    const t = tree();
    if (JSON.stringify(embeds(t, 'cap')) !== '["i-ritardi-di-agosto-pesano-2","nota","i-ritardi-di-agosto-pesano","le-vendite-sono-calate","e-un-altro-capoverso"]') problems.push(`embeds ${JSON.stringify(embeds(t, 'cap'))}`);
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
    operate(problems, 'move', 'e-un-altro-capoverso', '--to', 'e-un-altro-capoverso.text.md');
    const out = tree();
    if (node(out, 'e-un-altro-capoverso')?.file !== 'e-un-altro-capoverso.text.md') problems.push('not moved out');
    if (!isDeepStrictEqual(withoutFiles(out), withoutFiles(before))) problems.push('the tree changed moving out');
    const back = operate(problems, 'move', 'e-un-altro-capoverso', '--to', 'cap-texts.text.md');
    if (JSON.stringify(back?.deleted) !== '["e-un-altro-capoverso.text.md"]') problems.push(`deleted ${JSON.stringify(back?.deleted)}`);
    if (!isDeepStrictEqual(tree(), before)) problems.push('the tree changed moving back');
    // The last text of a multi-object file: the file goes away.
    operate(problems, 'move', 'le-vendite-sono-calate', '--to', 'altri.text.md');
    const last = operate(problems, 'move', 'le-vendite-sono-calate', '--to', 'cap-texts.text.md');
    if (JSON.stringify(last?.deleted) !== '["altri.text.md"]' || existsSync(join(folder, 'altri.text.md'))) problems.push(`emptied file: ${JSON.stringify(last)}`);
    if (cli('move', 'nota-breve', '--to', 'nota.concept.md').status !== 2) problems.push('a move to another kind is accepted');
    report('move', problems);
  }

  // The canvas: create --at, recall, place, archive, compose; the cards follow move and rename.
  {
    const problems: string[] = [];
    type Canvas = { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> };
    const canvas = () => JSON.parse(readFileSync(join(folder, 'foglio.canvas'), 'utf8')) as Canvas;
    /** The rules of JSON Canvas 1.0 for what the runtime writes: nodes and edges, ids, integers, files. */
    const invalid = (c: Canvas): string[] => {
      const out: string[] = [];
      if (!Array.isArray(c.nodes) || !Array.isArray(c.edges)) return ['nodes or edges is not a list'];
      const ids = new Set<unknown>();
      for (const n of c.nodes) {
        if (typeof n.id !== 'string' || ids.has(n.id)) out.push(`node id ${String(n.id)}`);
        ids.add(n.id);
        if (!['text', 'file', 'link', 'group'].includes(String(n.type))) out.push(`node type ${String(n.type)}`);
        for (const key of ['x', 'y', 'width', 'height']) if (!Number.isInteger(n[key])) out.push(`node ${key} ${String(n[key])}`);
        if (n.type === 'file' && typeof n.file !== 'string') out.push('file node without file');
        if (n.subpath !== undefined && !/^#/.test(String(n.subpath))) out.push(`subpath ${String(n.subpath)}`);
      }
      for (const e of c.edges) if (typeof e.id !== 'string' || !ids.has(e.fromNode) || !ids.has(e.toNode)) out.push(`edge ${JSON.stringify(e)}`);
      return out;
    };
    const card = (c: Canvas, file: string) => c.nodes.find((n) => n.file === file || `${String(n.file)}${String(n.subpath ?? '')}` === file);

    const made = operate(problems, 'create', 'text', '--at', '40,-20', '--text', 'Un pensiero sul foglio.');
    const text = String(made?.id);
    if (JSON.stringify(made?.written) !== '["foglio-texts.text.md","foglio.canvas","foglio.canvas-file.md"]') problems.push(`create --at wrote ${JSON.stringify(made?.written)}`);
    if (node(tree(), 'foglio')?.kind !== 'canvas-file') problems.push('the descriptor of the canvas');
    const first = card(canvas(), `foglio-texts.text.md#${text}`);
    if (first?.x !== 40 || first?.y !== -20) problems.push(`the new card ${JSON.stringify(first)}`);
    operate(problems, 'recall', 'nota-breve', '--at', '400,-10');
    operate(problems, 'recall', 'le-vendite-sono-calate');
    const below = card(canvas(), 'cap-texts.text.md#le-vendite-sono-calate');
    if (below?.x !== 40 || below?.y !== 270) problems.push(`recall without --at: ${JSON.stringify(below)}`);
    operate(problems, 'place', 'nota-breve', '--at', '420,0');
    const placed = card(canvas(), 'nota.text.md');
    if (placed?.x !== 420 || placed?.y !== 0 || placed?.subpath !== undefined) problems.push(`place ${JSON.stringify(placed)}`);
    if (cli('place', 'idea', '--at', '0,0').status !== 2) problems.push('place of an object not on the canvas');

    // The cards follow the objects: into a file of their own without subpath, and back.
    operate(problems, 'move', 'le-vendite-sono-calate', '--to', 'le-vendite-sono-calate.text.md');
    if (!card(canvas(), 'le-vendite-sono-calate.text.md') || card(canvas(), 'le-vendite-sono-calate.text.md')?.subpath !== undefined) problems.push('the card did not follow move');
    operate(problems, 'move', 'le-vendite-sono-calate', '--to', 'cap-texts.text.md');
    operate(problems, 'rename', text, 'pensiero');
    if (!card(canvas(), 'foglio-texts.text.md#pensiero')) problems.push(`the card did not follow rename: ${JSON.stringify(canvas().nodes)}`);
    problems.push(...invalid(canvas()));
    if (errors(tree()).length !== 0) problems.push(`errors: ${JSON.stringify(errors(tree()))}`);

    // A subpath that names no object is canvas-path-unresolved.
    const good = readFileSync(join(folder, 'foglio.canvas'), 'utf8');
    writeFileSync(join(folder, 'foglio.canvas'), good.replace('#pensiero', '#nessuno'));
    if (!errors(tree()).some((d) => d.code === 'canvas-path-unresolved' && d.target === 'foglio-texts.text.md#nessuno')) problems.push('an unresolved subpath');
    writeFileSync(join(folder, 'foglio.canvas'), good);

    // A second card of the same object: place and archive want --card; archiving one leaves the other.
    const second = operate(problems, 'recall', 'nota-breve', '--at', '900,0');
    const cardsOf = () => canvas().nodes.filter((n) => n.file === 'nota.text.md');
    if (cardsOf().length !== 2) problems.push(`two cards: ${cardsOf().length}`);
    if (cli('place', 'nota-breve', '--at', '0,0').status !== 2) problems.push('place without --card on two cards');
    if (cli('archive', 'nota-breve').status !== 2) problems.push('archive without --card on two cards');
    if (cli('place', 'nota-breve', '--at', '0,0', '--card', 'nessuna').status !== 2) problems.push('place with a --card of no card');
    operate(problems, 'place', 'nota-breve', '--at', '900,40', '--card', String(second?.node));
    if (cardsOf().find((n) => n.id === second?.node)?.y !== 40) problems.push('place --card moved another card');
    const doubled = operate(problems, 'compose', 'nota-breve', 'nota-breve', '--title', 'Due schede');
    if (JSON.stringify(embeds(tree(), String(doubled?.id))) !== '["nota-breve","nota-breve"]') problems.push(`compose of two cards ${JSON.stringify(embeds(tree(), String(doubled?.id)))}`);
    operate(problems, 'archive', 'nota-breve', '--card', String(second?.node));
    if (cardsOf().length !== 1 || cardsOf()[0]!.id === second?.node) problems.push('archive --card');
    operate(problems, 'archive', 'nota-breve');
    if (card(canvas(), 'nota.text.md') || !node(tree(), 'nota-breve')) problems.push('archive');
    if (cli('archive', 'nota-breve').status !== 2) problems.push('archive of an object not on the canvas');

    const composed = operate(problems, 'compose', 'pensiero', 'nota-breve', 'le-vendite-sono-calate', '--title', 'Il foglio in ordine');
    const article = node(tree(), String(composed?.id));
    if (article?.kind !== 'article' || article.file !== 'il-foglio-in-ordine.article.md') problems.push(`compose ${JSON.stringify(composed)}`);
    if (JSON.stringify(embeds(tree(), String(composed?.id))) !== '["pensiero","nota-breve","le-vendite-sono-calate"]') problems.push(`compose order ${JSON.stringify(embeds(tree(), String(composed?.id)))}`);
    if (article?.attributes?.title !== 'Il foglio in ordine') problems.push('the title of the article');
    const before = snapshot();
    if (cli('compose', 'pensiero', 'idea', '--title', 'Con un concetto').status !== 1 || !isDeepStrictEqual(snapshot(), before)) problems.push('compose with a concept is not refused');
    if (cli('compose', 'pensiero').status !== 2) problems.push('compose without a title');
    if (errors(tree()).length !== 0) problems.push(`errors after: ${JSON.stringify(errors(tree()))}`);
    report('canvas', problems);
  }

  // Order on the canvas: making room, create --near, gather, arrange; in a folder of its own.
  {
    const problems: string[] = [];
    const base = mkdtempSync(join(tmpdir(), 'canvas-order-'));
    const run = (...args: string[]) => {
      const done = spawnSync(process.execPath, [cliPath, ...args, '--folder', base], { encoding: 'utf8' });
      if (done.status !== 0) problems.push(`${args.join(' ')}: ${done.status} ${done.stderr}`);
      return done.status === 0 ? (JSON.parse(done.stdout) as Record<string, unknown>) : {};
    };
    type Node = { id: string; type: string; x: number; y: number; width: number; height: number; file?: string; subpath?: string; label?: string; arrange?: string };
    const read = () => JSON.parse(readFileSync(join(base, 'foglio.canvas'), 'utf8')) as { nodes: Node[]; edges: unknown[] };
    const write = (nodes: Node[]) => writeFileSync(join(base, 'foglio.canvas'), `${JSON.stringify({ nodes, edges: [] }, null, '\t')}\n`);
    const card = (id: string, x: number, y: number, file = `${id}.text.md`): Node => ({ id: `n-${id}`, type: 'file', file, x, y, width: 360, height: 240 });
    const hit = (a: Node, b: Node) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    const holds = (g: Node, n: Node) => n.x >= g.x && n.y >= g.y && n.x + n.width <= g.x + g.width && n.y + n.height <= g.y + g.height;
    /** Overlaps between nodes, but for a node and a group that holds it. */
    const overlapping = (nodes: Node[]) => nodes.flatMap((a, i) => nodes.slice(i + 1).filter((b) => hit(a, b) && !(a.type === 'group' && holds(a, b)) && !(b.type === 'group' && holds(b, a))).map((b) => `${a.id}/${b.id}`));
    const valid = (nodes: Node[]) => nodes.every((n) => typeof n.id === 'string' && ['file', 'group', 'text', 'link'].includes(n.type) && [n.x, n.y, n.width, n.height].every(Number.isInteger) && (n.type !== 'group' || n.label === undefined || typeof n.label === 'string'));
    const text = (id: string, body: string, tags = '[]') => writeFileSync(join(base, `${id}.text.md`), `---\nid: ${id}\nkind: text\ntags: ${tags}\n---\n${body}\n`);
    writeFileSync(join(base, 'doc.document.md'), '---\nid: doc\nkind: document\ntags: []\nspec-version: "0.1"\n---\n');
    writeFileSync(join(base, 'foglio.canvas-file.md'), '---\nid: foglio\nkind: canvas-file\ntags: []\nasset: foglio.canvas\n---\n');
    for (const id of ['a', 'b', 'c', 'd', 'x', 'y']) text(id, `Il testo ${id}.`);

    // Making room: x at 300,0 overlaps a and b; a moves left, b down, by the shortest way; c stays.
    write([card('a', 0, 0), card('b', 400, 0), card('c', 800, 0)]);
    const start = readFileSync(join(base, 'foglio.canvas'), 'utf8');
    const first = spawnSync(process.execPath, [cliPath, 'recall', 'x', '--at', '300,0', '--dry-run', '--folder', base], { encoding: 'utf8' }).stdout;
    const again = spawnSync(process.execPath, [cliPath, 'recall', 'x', '--at', '300,0', '--dry-run', '--folder', base], { encoding: 'utf8' }).stdout;
    if (JSON.stringify(JSON.parse(first).moved) !== JSON.stringify(JSON.parse(again).moved) || readFileSync(join(base, 'foglio.canvas'), 'utf8') !== start) problems.push('making room is not deterministic');
    run('recall', 'x', '--at', '300,0');
    const room = read().nodes;
    const at = (id: string) => room.find((n) => n.id === `n-${id}`)!;
    if (overlapping(room).length > 0) problems.push(`overlaps after recall: ${overlapping(room).join()}`);
    if (at('a').x !== -100 || at('a').y !== 0 || at('b').x !== 400 || at('b').y !== 280 || at('c').x !== 800 || at('c').y !== 0) problems.push(`the shortest moves: ${JSON.stringify(room.map(({ id, x, y }) => [id, x, y]))}`);

    // In a group: the card pushed stays in it, and the group grows; what the group then overlaps moves.
    write([{ id: 'g', type: 'group', x: 0, y: 0, width: 440, height: 320, label: 'a mano' }, card('d', 40, 40), card('c', 520, 0)]);
    run('recall', 'y', '--at', '60,60');
    const grouped = read().nodes;
    const group = grouped.find((n) => n.id === 'g')!;
    const y = grouped.find((n) => n.subpath === undefined && n.file === 'y.text.md')!;
    if (!holds(group, grouped.find((n) => n.id === 'n-d')!) || !holds(group, y)) problems.push(`the group does not hold its cards: ${JSON.stringify(grouped)}`);
    if (overlapping(grouped).length > 0) problems.push(`overlaps in the group: ${overlapping(grouped).join()}`);
    // place --size: an enlarged card makes room too.
    run('place', 'd', '--size', '600,500');
    if (overlapping(read().nodes).length > 0) problems.push(`overlaps after --size: ${overlapping(read().nodes).join()}`);

    // create --near: to the right of a, or below where it is freer; no overlaps.
    write([card('a', 0, 0), card('b', 400, 0)]);
    const near = run('create', 'text', '--near', 'a', '--text', 'Un pensiero vicino.');
    const made = read().nodes.find((n) => n.subpath === `#${String(near.id)}`);
    if (made?.x !== 0 || made.y !== 280) problems.push(`create --near: ${JSON.stringify(made)}`);
    if (overlapping(read().nodes).length > 0) problems.push(`overlaps after create --near: ${overlapping(read().nodes).join()}`);

    // gather: h links to a, b links to h, the chapter k embeds h, the concept m is associated; b has two cards, the nearer comes.
    text('h', 'Il centro, vedi [[a]].');
    text('b', 'Torna a [[h]].');
    writeFileSync(join(base, 'k.chapter.md'), '---\nid: k\nkind: chapter\ntags: []\ntitle: Capitolo\n---\n![[h]]\n');
    writeFileSync(join(base, 'm.concept.md'), '---\nid: m\nkind: concept\ntags: []\nassociations: [h]\n---\nUn concetto.\n');
    write([card('h', 0, 0), card('a', 3000, 3000), { ...card('b', 0, 1200), id: 'n-b-near' }, { ...card('b', 5000, 0), id: 'n-b-far' }, card('c', 400, 0)]);
    const gathered = run('gather', 'h');
    const list = (gathered.gathered ?? []) as Array<{ id: string; node: string; recalled: boolean }>;
    if (JSON.stringify(list.map((g) => g.id)) !== '["a","b","k","m"]') problems.push(`gather ids ${JSON.stringify(list)}`);
    if (list.find((g) => g.id === 'b')?.node !== 'n-b-near' || list.find((g) => g.id === 'k')?.recalled !== true || list.find((g) => g.id === 'a')?.recalled !== false) problems.push(`gather cards ${JSON.stringify(list)}`);
    const after = read().nodes;
    const hub = after.find((n) => n.id === 'n-h')!;
    for (const g of list) {
      const n = after.find((each) => each.id === g.node)!;
      if (Math.abs(n.x - hub.x) > 800 || Math.abs(n.y - hub.y) > 600) problems.push(`${g.id} not near: ${n.x},${n.y}`);
    }
    if (after.find((n) => n.id === 'n-b-far')?.x !== 5000) problems.push('the farther card of b moved');
    if (overlapping(after).length > 0) problems.push(`overlaps after gather: ${overlapping(after).join()}`);

    // arrange by kind: a group per kind, compositions first; again, the same groups replaced; the group by hand stays.
    write([{ id: 'mano', type: 'group', x: 0, y: 0, width: 440, height: 320, label: 'a mano' }, card('d', 40, 40), card('a', 600, 0), card('b', 1000, 0), card('h', 1400, 0), { ...card('k', 0, 600, 'k.chapter.md') }, { ...card('m', 400, 600, 'm.concept.md') }]);
    run('arrange', '--by', 'kind');
    const once = read().nodes;
    const labels = (nodes: Node[]) => nodes.filter((n) => n.arrange === 'kind').map((n) => n.label);
    if (JSON.stringify(labels(once)) !== '["chapter","concept","text"]') problems.push(`arrange by kind ${JSON.stringify(labels(once))}`);
    const textGroup = once.find((n) => n.label === 'text' && n.arrange)!;
    if (!['n-a', 'n-b', 'n-h'].every((id) => holds(textGroup, once.find((n) => n.id === id)!))) problems.push('the texts are not in their group');
    const hand = once.find((n) => n.id === 'mano');
    if (!hand || !holds(hand, once.find((n) => n.id === 'n-d')!)) problems.push('the group by hand changed');
    if (overlapping(once).length > 0 || !valid(once)) problems.push(`arrange by kind: ${overlapping(once).join()} ${valid(once)}`);
    run('arrange', '--by', 'kind');
    if (read().nodes.filter((n) => n.type === 'group').length !== 4) problems.push(`arrange again: ${read().nodes.filter((n) => n.type === 'group').length} groups`);

    // arrange by tag: the first tag in alphabetical order, then «senza tag».
    text('a', 'Il testo a.', '[vendite, alfa]');
    text('b', 'Torna a [[h]].', '[vendite]');
    run('arrange', '--by', 'tag');
    const tagged = read().nodes;
    if (JSON.stringify(tagged.filter((n) => n.arrange === 'tag').map((n) => n.label)) !== '["alfa","vendite","senza tag"]') problems.push(`arrange by tag ${JSON.stringify(tagged.filter((n) => n.type === 'group').map((n) => n.label))}`);
    if (tagged.some((n) => n.arrange === 'kind')) problems.push('the groups by kind were not replaced');
    if (overlapping(tagged).length > 0 || !valid(tagged)) problems.push(`arrange by tag: ${overlapping(tagged).join()}`);
    const tree = JSON.parse(spawnSync(process.execPath, [cliPath, 'resolve-tree', base], { encoding: 'utf8' }).stdout) as Tree;
    if (errors(tree).length !== 0) problems.push(`errors: ${JSON.stringify(errors(tree))}`);
    rmSync(base, { recursive: true, force: true });
    report('order on the canvas: making room, create --near, gather, arrange', problems);
  }

  // Collections (class 2): create, turn-into from a text and from a scratch, the refusal; rename and move; in a folder of their own.
  {
    const problems: string[] = [];
    const base = mkdtempSync(join(tmpdir(), 'collections-'));
    const runIn = (...args: string[]) => spawnSync(process.execPath, [cliPath, ...args, '--folder', base], { encoding: 'utf8' });
    /** With --dry-run first, which writes nothing, then for real. */
    const operateIn = (...args: string[]) => {
      const before = readdirSync(base).map((name) => `${name}:${readFileSync(join(base, name), 'utf8')}`).join();
      const dry = runIn(...args, '--dry-run');
      if (dry.status !== 0 || !JSON.parse(dry.stdout).diff) problems.push(`${args[0]} --dry-run: ${dry.status} ${dry.stderr}`);
      if (readdirSync(base).map((name) => `${name}:${readFileSync(join(base, name), 'utf8')}`).join() !== before) problems.push(`${args[0]} --dry-run wrote`);
      const real = runIn(...args);
      if (real.status !== 0) problems.push(`${args.join(' ')}: ${real.status} ${real.stderr}`);
      return real.status === 0 ? (JSON.parse(real.stdout) as Record<string, unknown>) : {};
    };
    const treeIn = () => JSON.parse(spawnSync(process.execPath, [cliPath, 'resolve-tree', base], { encoding: 'utf8' }).stdout) as Tree;
    writeFileSync(join(base, 'doc.document.md'), '---\nid: doc\nkind: document\ntags: []\nlang: it\nspec-version: "0.1"\n---\n');
    writeFileSync(join(base, 'rapporto.article.md'), front('rapporto', 'article', 'title: Rapporto\n') + '![[prezzi]]\n');
    writeFileSync(join(base, 'prezzi.text.md'), front('prezzi', 'text') + '| Prodotto | Prezzo | Pezzi |\n|---|--:|--:|\n| penna | 1,50 | 1.200 |\n| quaderno | 2,25 | 3 |\n');
    writeFileSync(join(base, 'altro.text.md'), front('altro', 'text') + 'Vedi [[prezzi|la tabella {n}]].\n');
    writeFileSync(join(base, 'appunti.scratch.md'), front('appunti', 'scratch') + 'Prima.\n\n| Città | Abitanti |\n|---|---|\n| Roma | 2.750.000 |\n| Roma | 2.750.000 |\n\nDopo.\n');

    // create: a descriptor and a TSV with only the header; without a field it is a wrong request.
    const made = operateIn('create', 'collection', '--field', 'nome:string', '--field', 'anni:integer', '--in', 'rapporto', '--text', 'Le persone.');
    if (readFileSync(join(base, `${String(made.id)}.tsv`), 'utf8') !== 'nome\tanni\n') problems.push(`create: ${JSON.stringify(made)}`);
    if (runIn('create', 'collection', '--in', 'rapporto').status !== 2) problems.push('create without --field');

    // turn-into from a text: the same id, its embed and its cross-ref still resolve; numbers with the point.
    const turned = operateIn('turn-into', 'prezzi');
    const t = treeIn();
    if (node(t, 'prezzi')?.kind !== 'collection' || existsSync(join(base, 'prezzi.text.md'))) problems.push(`turn-into from a text: ${JSON.stringify(turned)}`);
    if (readFileSync(join(base, 'prezzi.tsv'), 'utf8') !== 'prodotto\tprezzo\tpezzi\npenna\t1.5\t1200\nquaderno\t2.25\t3\n') problems.push(`the TSV: ${readFileSync(join(base, 'prezzi.tsv'), 'utf8')}`);
    if (JSON.stringify(turned.fields) !== '[{"name":"prodotto","type":"string","title":"Prodotto"},{"name":"prezzo","type":"number","title":"Prezzo"},{"name":"pezzi","type":"integer","title":"Pezzi"}]' || turned.primaryKey !== 'prodotto') problems.push(`types and key: ${JSON.stringify(turned)}`);
    if (!JSON.stringify(node(t, 'altro')?.content).includes('la tabella 1') && !JSON.stringify(node(t, 'rapporto')?.content).includes('"number":"')) problems.push('the embed or the cross-ref');
    if (errors(t).length !== 0) problems.push(`errors after turn-into: ${JSON.stringify(errors(t))}`);

    // From a scratch: the same record twice, so no key; a new id from the header, and a link in place of the table.
    const fromScratch = operateIn('turn-into', 'appunti');
    const scratch = readFileSync(join(base, 'appunti.scratch.md'), 'utf8');
    if (fromScratch.id !== 'citta-abitanti' || fromScratch.primaryKey !== undefined || !scratch.includes('Prima.\n\n[[citta-abitanti|Città, Abitanti]]\n\nDopo.')) problems.push(`turn-into from a scratch: ${JSON.stringify(fromScratch)} ${scratch}`);
    // --key on a column with a value twice brings collection-key-duplicate: refused, nothing written.
    writeFileSync(join(base, 'altri.scratch.md'), front('altri', 'scratch') + '| a | b |\n|---|---|\n| x | 1 |\n| x | 2 |\n');
    const before = readdirSync(base).sort().join();
    const refused = runIn('turn-into', 'altri', '--key', 'a');
    if (refused.status !== 1 || !refused.stderr.includes('collection-key-duplicate') || readdirSync(base).sort().join() !== before) problems.push(`refusal: ${refused.status} ${refused.stderr}`);
    if (runIn('turn-into', 'altri', '--type', 'a:number').status !== 1) problems.push('--type a:number on text is not refused');

    // The corrections: names from the headings as ids with -2 and campo-<n>, titles as written; a warning for what is lost;
    // grouping in a column; the suggestions name the type in Italian.
    writeFileSync(join(base, 'perdite.text.md'), front('perdite', 'text') + '| Mese | Vendite in euro | | Mese |\n|---|--:|---|---|\n| **gen** | 21.300 | x | a |\n| feb | 9.875,26 | y | b |\n');
    const lossy = runIn('turn-into', 'perdite');
    const lost = lossy.status === 0 ? (JSON.parse(lossy.stdout) as { fields: unknown; warnings: Array<{ code: string; target: string }> }) : null;
    if (JSON.stringify(lost?.fields) !== '[{"name":"mese","type":"string","title":"Mese"},{"name":"vendite-in-euro","type":"number","title":"Vendite in euro"},{"name":"campo-3","type":"string"},{"name":"mese-2","type":"string","title":"Mese"}]') problems.push(`names and titles: ${lossy.stdout}`);
    if (JSON.stringify(lost?.warnings.map((w) => `${w.code}:${w.target}`)) !== '["turn-into-loss:formattazione","turn-into-loss:allineamento"]' || !lossy.stderr.includes('avviso turn-into-loss')) problems.push(`warnings: ${lossy.stdout} ${lossy.stderr}`);
    const grouped = JSON.stringify(node(treeIn(), 'perdite')?.content);
    if (!grouped.includes('"21.300,00"') || !grouped.includes('"9.875,26"')) problems.push(`grouping in a column: ${grouped}`);
    writeFileSync(join(base, 'perdite.tsv'), 'mese\tvendite-in-euro\tcampo-3\tmese-2\ngen\tventi\tx\ta\n');
    const suggestion = (treeIn().diagnostics ?? []).find((d) => d.code === 'collection-value-invalid') as { fix?: string } | undefined;
    if (suggestion?.fix !== 'scrivi un numero') problems.push(`the suggestion: ${JSON.stringify(suggestion)}`);
    rmSync(join(base, 'perdite.collection.md'));
    rmSync(join(base, 'perdite.tsv'));

    // rename and move, as for an image: the descriptor changes, the data file stays.
    operateIn('rename', 'prezzi', 'listino');
    operateIn('move', 'listino', '--to', 'listino.collection.md');
    const after = treeIn();
    if (node(after, 'listino')?.file !== 'listino.collection.md' || errors(after).length !== 0) problems.push(`rename and move: ${JSON.stringify(node(after, 'listino'))} ${JSON.stringify(errors(after))}`);
    if (runIn('move', 'listino', '--to', 'tabelle.collection.md').status !== 2) problems.push('a collection moved into a multi-object file');
    const check = spawnSync(process.execPath, [cliPath, 'format', base, '--check'], { encoding: 'utf8' });
    if (check.status !== 0) problems.push(`not canonical: ${check.stdout}`);
    rmSync(base, { recursive: true, force: true });
    report('collections: create, turn-into from a text and a scratch, refusal, rename and move', problems);
  }

  // A big table: the preview keeps the first 1000 records, a card 20, each with a last row; the export has them all.
  {
    const problems: string[] = [];
    const base = mkdtempSync(join(tmpdir(), 'doc-records-'));
    writeFileSync(join(base, 'doc.document.md'), '---\nid: doc\nkind: document\ntags: []\nlang: it\nspec-version: "0.1"\n---\n');
    writeFileSync(join(base, 'report.article.md'), front('report', 'article') + '![[righe]]\n');
    writeFileSync(join(base, 'righe.collection.md'), front('righe', 'collection', 'asset: righe.tsv\nfields:\n  - name: n\n    type: integer\n') + 'Righe.\n');
    writeFileSync(join(base, 'righe.tsv'), `n\n${Array.from({ length: 2003 }, (_, i) => i).join('\n')}\n`);
    const { resolveTree } = await import('../src/resolve-tree.js');
    const { staticExport } = await import('../src/static-export.js');
    const { standaloneTree, standalonePage } = await import('../src/standalone.js');
    const { LiveFolder, CARD_RECORDS } = await import('../src/live.js');
    const preview = { assetUrl: (path: string) => path, fontUrl: (file: string) => file, scriptUrls: [], diagnostics: [] };
    const rows = (html: string) => (html.match(/<tr/g) ?? []).length;
    const live = new LiveFolder(base, () => undefined, () => undefined);
    live.close();
    const cut = [...staticExport(live.tree, 'report', new Map(), { allowErrors: true, preview })].join('');
    if (rows(cut) !== 1002 || !cut.includes('<tr data-more-records><td colspan="1">… altri 1003 record</td></tr>')) problems.push(`preview: ${rows(cut)} rows`);
    const card = standalonePage(standaloneTree(base, new Map(), ['righe'], false, CARD_RECORDS), 'righe', preview, () => ({ fallback: 'x' }) as never) ?? '';
    if (rows(card) !== 22 || !card.includes('… altri 1983 record')) problems.push(`card: ${rows(card)} rows`);
    const whole = [...staticExport(resolveTree(base), 'report', new Map(), { allowErrors: true, preview })].join('');
    if (rows(whole) !== 2004 || whole.includes('<tr data-more-records')) problems.push(`export: ${rows(whole)} rows`);
    rmSync(base, { recursive: true, force: true });
    report('a big table: 1000 records in the preview, 20 in a card, all in the export', problems);
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
