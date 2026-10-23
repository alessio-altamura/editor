// The functions behind the IPC of the app, without Electron: the Session over a folder,
// and where the cursor goes after the formatter.
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { mapOffset } from '../src/offset.js';
import { Session } from '../src/session.js';
import { writeFixture } from './fixture.js';

let failed = 0;
const check = (label: string, problems: string[]) => {
  if (problems.length === 0) console.log(`ok   ${label}`);
  else {
    failed++;
    console.log(`FAIL ${label}\n  ${problems.join('\n  ')}`);
  }
};
const until = async (test: () => boolean, ms = 3000) => {
  const end = Date.now() + ms;
  while (!test() && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
  return test();
};

// mapOffset: before the change, after it, inside it.
{
  const problems: string[] = [];
  const before = 'id: a\nkind: text\n---\ntesto con il cursore';
  const after = 'id: a\nkind: text\ntags: []\n---\ntesto con il cursore';
  if (mapOffset(before, after, 3) !== 3) problems.push('before the change');
  if (mapOffset(before, after, before.indexOf('cursore')) !== after.indexOf('cursore')) problems.push('after the change');
  if (mapOffset('abc', 'abc', 2) !== 2) problems.push('no change');
  const middle = mapOffset('a\n\n\n\nb', 'a\n\nb', 3);
  if (middle < 1 || middle > 3) problems.push(`inside the change: ${middle}`);
  check('mapOffset keeps the cursor near where it was', problems);
}

const folder = writeFixture();
const session = await Session.open(folder);
try {
  {
    const problems: string[] = [];
    const shelves = session.navigator();
    if (shelves.map((s) => s.kind).join() !== 'article,chapter,concept,text') problems.push(`shelves ${shelves.map((s) => s.kind).join()}`);
    if (shelves[0]?.items[0]?.title !== 'Il rapporto') problems.push('the title of the article');
    if (session.navigator('somma').flatMap((s) => s.items.map((i) => i.id)).join() !== 'nota') problems.push('search by title or first words');
    if (session.navigator('ide').flatMap((s) => s.items.map((i) => i.id)).join() !== 'idea') problems.push('search by id');
    check('navigator: shelves by kind, compositions first, search', problems);
  }
  {
    const problems: string[] = [];
    if (session.file('../fuori.md') !== null || session.file('/etc/passwd') !== null) problems.push('a path outside the folder');
    let thrown = false;
    try {
      session.read('../fuori.md');
    } catch {
      thrown = true;
    }
    if (!thrown) problems.push('read outside the folder');
    check('paths outside the folder are refused', problems);
  }
  {
    const problems: string[] = [];
    if (!session.diagnostics('cap.chapter.md').some((d) => d.code === 'composition-content')) problems.push('composition-content');
    // A buffer not saved holds at once: an error typed in the editor.
    let updates = 0;
    const stop = session.onUpdate(() => updates++);
    session.edit('nota.text.md', '---\nid: nota\nkind: text\ntags: []\n---\nVedi [[manca]].\n');
    await until(() => updates > 0);
    const unresolved = session.diagnostics('nota.text.md').find((d) => d.code === 'reference-unresolved');
    if (!unresolved || unresolved.range.start.line !== 5) problems.push(`the unsaved buffer: ${JSON.stringify(session.diagnostics('nota.text.md'))}`);
    if (readFileSync(join(folder, 'nota.text.md'), 'utf8').includes('manca')) problems.push('edit wrote the file');
    session.edit('nota.text.md', '---\nid: nota\nkind: text\ntags: []\n---\nLa somma fa `= 2 * 21`, vedi [[cap]].\n');
    updates = 0;
    await until(() => updates > 0);
    stop();
    if (session.diagnostics('nota.text.md').length !== 0) problems.push('the error stays');
    check('diagnostics, and an unsaved buffer that holds at once', problems);
  }
  {
    const problems: string[] = [];
    const text = session.read('nota.text.md');
    const items = session.complete('cap.chapter.md', '![[', { line: 0, character: 3 }).map((i) => i.label).sort().join();
    if (items !== 'nota') problems.push(`complete after ![[: ${items}`);
    const hover = session.hover('nota.text.md', text, { line: 5, character: 15 });
    if (!hover?.markdown.includes('42')) problems.push(`hover on the math line: ${JSON.stringify(hover)}`);
    if (session.definition('nota.text.md', text, { line: 5, character: 33 }) !== 'cap.chapter.md') problems.push('definition');
    check('completion, hover, definition', problems);
  }
  {
    const problems: string[] = [];
    if (session.articleFor('nota.text.md') !== 'report' || session.articleFor('idea.concept.md') !== 'report' || session.articleFor(null) !== 'report') problems.push('articleFor');
    const url = session.previewUrl('report');
    const page = await fetch(url);
    const html = await page.text();
    if (page.status !== 200 || !page.headers.get('content-security-policy')?.includes("script-src 'self'") || !html.includes('data-source=')) problems.push(`preview ${page.status}`);
    if ((await fetch(url.replace(/token=[^&]*/, 'token=x'))).status !== 403) problems.push('the preview without its code');
    if (!session.isPreview(url) || session.isPreview('https://example.com/')) problems.push('isPreview');
    check('the preview of the article of a file, from serve on the same runtime', problems);
  }
  {
    const problems: string[] = [];
    const written = session.save('idea.concept.md', '---\nkind: concept\nid: idea\n---\nUn concetto.\n\n\n');
    if (written !== '---\nid: idea\nkind: concept\ntags: []\n---\nUn concetto.\n') problems.push(`save through the formatter: ${JSON.stringify(written)}`);
    if (readFileSync(join(folder, 'idea.concept.md'), 'utf8') !== written) problems.push('not on disk');
    const extracted = session.extract('cap.chapter.md', session.read('cap.chapter.md'));
    if (extracted.error || !extracted.written.includes('cap-texts.text.md')) problems.push(`extract ${JSON.stringify(extracted)}`);
    if (session.diagnostics('cap.chapter.md').length !== 0) problems.push('composition-content stays');
    check('save through the formatter, and «Estrai in un oggetto»', problems);
  }
} finally {
  await session.close();
  rmSync(folder, { recursive: true, force: true });
}
console.log(failed === 0 ? '\napp unit tests: all pass' : `\napp unit tests: ${failed} failed`);
if (failed > 0) process.exitCode = 1;
