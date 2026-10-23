// The serve suite: starts `serve` on a temporary folder and checks the access code,
// the index and the preview, the updates over the WebSocket, the errors listed and
// marked, the assets outside the list, the address and the source positions.
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, truncateSync, unlinkSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { networkInterfaces, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { WebSocket } from 'ws';

const here = dirname(fileURLToPath(import.meta.url));
const cliPath = join(resolve(here, '../..'), 'dist/src/cli.js');

const front = (id: string, kind: string, extra = '') => `---\nid: ${id}\nkind: ${kind}\n${extra}---\n`;
/** A 1×1 PNG, as bytes. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');

/** Writes a document; `texts` more text objects make it long. */
export function writeDocument(folder: string, texts = 0): void {
  mkdirSync(join(folder, 'foto'), { recursive: true });
  writeFileSync(join(folder, 'doc.document.md'), '---\nid: doc\nkind: document\nspec-version: "0.1"\nlang: it\n---\n');
  writeFileSync(join(folder, 'report.article.md'), front('report', 'article', 'title: Il rapporto\n') + '![[cap]]\n');
  const extra = Array.from({ length: texts }, (_, i) => `\n![[t${i}]]\n`).join('');
  writeFileSync(join(folder, 'cap.chapter.md'), front('cap', 'chapter', 'title: Le vendite\n') + '![[nota]]\n\n![[lavagna]]\n' + extra);
  writeFileSync(join(folder, 'nota.text.md'), front('nota', 'text') + 'Le vendite sono *calate*, vedi [il sito](https://example.com).\n');
  writeFileSync(join(folder, 'lavagna.image.md'), front('lavagna', 'image', 'asset: foto/lavagna.png\n') + 'La lavagna.\n');
  writeFileSync(join(folder, 'foto/lavagna.png'), PNG);
  for (let i = 0; i < texts; i++) {
    writeFileSync(join(folder, `t${i}.text.md`), front(`t${i}`, 'text') + `Il capoverso numero ${i}, con abbastanza parole da andare a capo almeno una volta nella pagina dell'anteprima.\n`);
  }
}

export interface Server {
  url: string;
  base: string;
  token: string;
  process: ChildProcess;
  log: string[];
  stop: () => Promise<number | null>;
}

/** Starts serve and waits for the address on stdout. */
export function startServe(folder: string): Promise<Server> {
  const child = spawn(process.execPath, [cliPath, 'serve', folder], { stdio: ['ignore', 'pipe', 'pipe'] });
  const log: string[] = [];
  child.stderr!.setEncoding('utf8').on('data', (text: string) => log.push(...text.split('\n').filter(Boolean)));
  return new Promise((done, fail) => {
    let out = '';
    child.stdout!.setEncoding('utf8').on('data', (text: string) => {
      out += text;
      if (!out.includes('\n')) return;
      const url = out.split('\n')[0]!;
      const parsed = new URL(url);
      done({
        url,
        base: `${parsed.protocol}//${parsed.host}`,
        token: parsed.searchParams.get('token') ?? '',
        process: child,
        log,
        stop: () => new Promise((stopped) => {
          child.once('exit', (code) => stopped(code));
          child.kill('SIGINT');
        }),
      });
    });
    child.once('exit', (code) => fail(new Error(`serve exited with ${code}: ${log.join(' ')}`)));
    setTimeout(() => fail(new Error('serve did not start')), 10000);
  });
}

function get(url: string, host?: string): Promise<{ status: number; headers: Record<string, unknown>; body: string }> {
  return new Promise((done, fail) => {
    const req = request(url, { headers: host ? { host } : {} }, (response) => {
      let body = '';
      response.setEncoding('latin1').on('data', (chunk: string) => (body += chunk)).on('end', () => done({ status: response.statusCode ?? 0, headers: response.headers, body }));
    });
    req.on('error', fail);
    req.end();
  });
}

const until = async (check: () => boolean, ms = 5000) => {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) return false;
    await new Promise((r) => setTimeout(r, 20));
  }
  return true;
};

interface DomNode { nodeName: string; tagName?: string; attrs?: Array<{ name: string; value: string }>; childNodes?: DomNode[]; value?: string }
function* all(node: DomNode): Generator<DomNode> {
  for (const child of node.childNodes ?? []) {
    if (child.tagName !== undefined) yield child;
    yield* all(child);
  }
}
const attr = (node: DomNode, name: string) => node.attrs?.find((a) => a.name === name)?.value;
const text = (node: DomNode): string => (node.nodeName === '#text' ? node.value! : (node.childNodes ?? []).map(text).join(''));

/** The text of a file between two LSP positions (lines from 0, characters in UTF-16 units). */
function slice(folder: string, source: string): string {
  const match = /^(.*):(\d+):(\d+)-(\d+):(\d+)$/.exec(source)!;
  const lines = readFileSync(join(folder, match[1]!), 'utf8').split('\n');
  const [sl, sc, el, ec] = match.slice(2).map(Number) as [number, number, number, number];
  if (sl === el) return lines[sl]!.slice(sc, ec);
  return [lines[sl]!.slice(sc), ...lines.slice(sl + 1, el), lines[el]!.slice(0, ec)].join('\n');
}

async function main(): Promise<void> {
  let failed = 0;
  const report = (label: string, problems: string[]) => {
    if (problems.length === 0) console.log(`ok   ${label}`);
    else {
      failed++;
      console.log(`FAIL ${label}\n  ${problems.join('\n  ')}`);
    }
  };
  const base = mkdtempSync(join(tmpdir(), 'serve-'));
  const folder = join(base, 'doc');
  writeDocument(folder);
  writeFileSync(join(base, 'fuori.png'), PNG);
  symlinkSync(join(base, 'fuori.png'), join(folder, 'foto/collegata.png'));
  writeFileSync(join(folder, '.nascosta.png'), PNG);
  // Two images the export would not embed: an unknown format and one past 64 MiB (sparse).
  writeFileSync(join(folder, 'finta.image.md'), front('finta', 'image', 'asset: foto/finta.png\n') + 'Non è una foto.\n');
  writeFileSync(join(folder, 'foto/finta.png'), 'solo testo\n');
  writeFileSync(join(folder, 'grande.image.md'), front('grande', 'image', 'asset: foto/grande.png\n') + 'Troppo grande.\n');
  writeFileSync(join(folder, 'foto/grande.png'), PNG);
  truncateSync(join(folder, 'foto/grande.png'), 64 * 1024 * 1024 + 1);
  writeFileSync(join(folder, 'cap.chapter.md'), front('cap', 'chapter', 'title: Le vendite\n') + '![[nota]]\n\n![[lavagna]]\n\n![[finta]]\n\n![[grande]]\n');
  const server = await startServe(folder);
  try {
    // The access code, the address, the index and the preview.
    {
      const problems: string[] = [];
      if (new URL(server.url).hostname !== '127.0.0.1' || server.token.length < 20) problems.push(`address ${server.url}`);
      for (const path of ['/', '/article/report', `/article/report?token=x${server.token}`, '/client.js', '/font/SourceSerif4Variable-Roman.ttf.woff2']) {
        const response = await get(server.base + path);
        if (response.status !== 403) problems.push(`${path} without the code: ${response.status}`);
      }
      const rebinding = await get(server.url, 'example.com');
      if (rebinding.status !== 403) problems.push(`another Host: ${rebinding.status}`);
      const ws = new WebSocket(`${server.base.replace('http', 'ws')}/ws?article=report`);
      const refused = await new Promise<number>((done) => {
        ws.on('unexpected-response', (_request, response) => done(response.statusCode ?? 0));
        ws.on('open', () => done(101));
        ws.on('error', () => done(-1));
      });
      if (refused !== 403) problems.push(`WebSocket without the code: ${refused}`);
      const index = await get(server.url);
      if (index.status !== 200 || !index.body.includes('Il rapporto') || !index.body.includes('<code>report</code>') || !index.body.includes('0 errori, 2 avvisi')) problems.push('index');
      const page = await get(`${server.base}/article/report?token=${server.token}`);
      const csp = String(page.headers['content-security-policy'] ?? '');
      if (page.status !== 200 || !csp.includes("script-src 'self'") || !csp.includes("connect-src 'self'") || page.body.includes('http-equiv')) problems.push(`preview headers ${page.status} ${csp}`);
      if (!page.body.includes('<section data-diagnostics>') || !page.body.includes('data-node="nota"') || !page.body.includes('/asset/foto/lavagna.png?token=')) problems.push('preview body');
      // Other interfaces of this machine do not answer.
      const others = Object.values(networkInterfaces()).flat().filter((i) => i && !i.internal).map((i) => i!.address);
      for (const address of ['::1', ...others]) {
        const host = address.includes(':') ? `[${address}]` : address;
        const answer = await get(`http://${host}:${new URL(server.url).port}/?token=${server.token}`).then((r) => `HTTP ${r.status}`, (e: NodeJS.ErrnoException) => e.code);
        if (answer?.startsWith('HTTP')) problems.push(`${address} answers: ${answer}`);
      }
      report('access code, address, index and preview', problems);
    }

    // Assets: only the files of the runtime's list.
    {
      const problems: string[] = [];
      const ok = await get(`${server.base}/asset/foto/lavagna.png?token=${server.token}`);
      if (ok.status !== 200 || ok.headers['content-type'] !== 'image/png' || Buffer.from(ok.body, 'latin1').compare(PNG) !== 0) problems.push(`listed asset: ${ok.status}`);
      for (const path of ['foto/collegata.png', '.nascosta.png', '../fuori.png', 'foto/%2e%2e/%2e%2e/fuori.png', 'doc.document.md', `${base}/fuori.png`, 'manca.png']) {
        const response = await get(`${server.base}/asset/${path}?token=${server.token}`);
        if (response.status !== 404) problems.push(`${path}: ${response.status}`);
      }
      // As in the export: the same fallback figures, and asset-unsupported in the list.
      const page = await get(`${server.base}/article/report?token=${server.token}`);
      for (const [id, fallback, description] of [['finta', 'format', 'Non è una foto.'], ['grande', 'size', 'Troppo grande.']]) {
        const figure = new RegExp(`<figure data-kind="image" data-image-fallback="${fallback}" id="${id}"[^>]*><p[^>]*>${description}</p></figure>`);
        if (!figure.test(Buffer.from(page.body, 'latin1').toString('utf8'))) problems.push(`no fallback figure for ${id}`);
      }
      for (const target of ['foto/finta.png', 'foto/grande.png']) {
        if (!page.body.includes(`<code>asset-unsupported</code> ${target === 'foto/finta.png' ? 'finta' : 'grande'}.image.md <code>${target}</code>`)) problems.push(`no asset-unsupported for ${target}`);
        const served = await get(`${server.base}/asset/${target}?token=${server.token}`);
        if (served.status !== 404) problems.push(`${target} served: ${served.status}`);
      }
      report('assets outside the list give 404; images not embedded fall back as in the export', problems);
    }

    // data-source points at the text that wrote each node.
    {
      const problems: string[] = [];
      const page = await get(`${server.base}/article/report?token=${server.token}`);
      const document = parse(Buffer.from(page.body, 'latin1').toString('utf8')) as unknown as DomNode;
      let checked = 0;
      for (const element of all(document)) {
        const source = attr(element, 'data-source');
        if (source === undefined) continue;
        const written = slice(folder, source);
        const kind = attr(element, 'data-kind');
        const want =
          element.tagName === 'h1' || element.tagName === 'h2' ? /^title: / :
          kind !== undefined ? /^!\[\[[a-z0-9-]+\]\]$/ :
          element.tagName === 'a' ? /^\[il sito\]\(https:\/\/example\.com\)$/ :
          element.tagName === 'em' ? /^\*calate\*$/ :
          element.tagName === 'p' ? new RegExp(`^${text(element).slice(0, 12).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) : null;
        if (want && !want.test(written)) problems.push(`<${element.tagName}> ${source}: ${JSON.stringify(written)}`);
        if (want) checked++;
      }
      if (checked < 6) problems.push(`only ${checked} elements checked`);
      report(`data-source points at the source (${checked} elements)`, problems);
    }

    // The WebSocket: a change, an error that comes and goes, the article that disappears.
    {
      const problems: string[] = [];
      const ws = new WebSocket(`${server.base.replace('http', 'ws')}/ws?token=${server.token}&article=report`);
      const messages: Array<{ type: string; html?: string }> = [];
      ws.on('message', (data) => messages.push(JSON.parse(String(data)) as { type: string; html?: string }));
      await new Promise((r) => ws.once('open', r));
      const next = async (label: string, check: (m: { type: string; html?: string }) => boolean) => {
        const start = Date.now();
        const seen = messages.length;
        if (!(await until(() => messages.slice(seen).some(check)))) problems.push(`${label}: no update`);
        else console.log(`     ${label}: ${Date.now() - start} ms`);
      };
      let wait = next('change', (m) => m.html?.includes('crollate') ?? false);
      writeFileSync(join(folder, 'nota.text.md'), front('nota', 'text') + 'Le vendite sono *crollate*, vedi [il sito](https://example.com).\n');
      await wait;
      wait = next('error', (m) => (m.html?.includes('embed-unresolved') && m.html.includes('<div data-unresolved')) ?? false);
      writeFileSync(join(folder, 'cap.chapter.md'), front('cap', 'chapter', 'title: Le vendite\n') + '![[nota]]\n\n![[manca]]\n');
      await wait;
      const index = await get(server.url);
      if (!index.body.includes('1 errore')) problems.push('the index does not count the error');
      wait = next('error fixed', (m) => (m.html !== undefined && !m.html.includes('embed-unresolved') && !m.html.includes('<div data-unresolved')));
      writeFileSync(join(folder, 'cap.chapter.md'), front('cap', 'chapter', 'title: Le vendite\n') + '![[nota]]\n\n![[lavagna]]\n');
      await wait;
      wait = next('article gone', (m) => m.type === 'gone');
      unlinkSync(join(folder, 'report.article.md'));
      await wait;
      ws.close();
      report('updates over the WebSocket', problems);
    }
  } finally {
    const code = await server.stop();
    if (code !== 0) {
      failed++;
      console.log(`FAIL serve stopped with ${code}`);
    }
    rmSync(base, { recursive: true, force: true });
  }

  // Times: the recomputation of this document and of one with a thousand texts.
  {
    const long = join(mkdtempSync(join(tmpdir(), 'serve-')), 'lungo');
    writeDocument(long, 1000);
    const started = await startServe(long);
    const first = started.log.find((line) => line.includes('ricalcolo'));
    writeFileSync(join(long, 't500.text.md'), front('t500', 'text') + 'Cambiato.\n');
    await until(() => started.log.filter((line) => line.includes('ricalcolo')).length >= 2);
    console.log(`     1000 text: ${first?.replace('doc-runtime: ', '')}; dopo una modifica: ${started.log.filter((l) => l.includes('ricalcolo')).at(-1)?.replace('doc-runtime: ', '')}`);
    await started.stop();
    rmSync(dirname(long), { recursive: true, force: true });
  }
  console.log(failed === 0 ? '\nserve suite: all pass' : `\nserve suite: ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
