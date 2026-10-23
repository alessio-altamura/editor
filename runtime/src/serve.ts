// `serve` (§11.6): keeps the runtime on over a folder, recomputes the tree at every
// change and shows the preview of each article in the browser, updated in place.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import { pageAssets, readAsset } from './assets.js';
import { BASE_FONTS } from './base-stylesheet.js';
import { LiveFolder } from './live.js';
import type { FileIdentity } from './resolve-tree.js';
import { escapeHtml, staticExport, type ExportAsset } from './static-export.js';
import { sortDiagnostics } from './diagnostic.js';
import type { Diagnostic, JsonML, ResolvedTree, TreeNode } from './tree.js';

/** The rules of the pages, as an HTTP header: scripts, connections, images and fonts only from the server. */
const CSP =
  "default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self'; font-src 'self'; " +
  "style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

/** The script of the page: it opens the WebSocket and applies each new page with morphdom. */
const CLIENT = `(() => {
  'use strict';
  const token = new URLSearchParams(location.search).get('token') || '';
  const article = decodeURIComponent(location.pathname.split('/').pop() || '');
  window.previewUpdates = 0;
  // The element at the top of the window, to keep the reading position across an update.
  // The first node element that starts inside the window; else the last one across its top edge.
  const anchor = () => {
    let across = null;
    for (const element of document.querySelectorAll('article [data-source]')) {
      const box = element.getBoundingClientRect();
      if (box.top >= 0) return element;
      if (box.bottom > 0) across = element;
    }
    return across;
  };
  const gone = (show) => {
    const banner = document.querySelector('[data-gone]');
    if (show && !banner) {
      const notice = document.createElement('p');
      notice.setAttribute('data-gone', '');
      notice.textContent = 'Il file di questo article non c\\u2019è più, o non è più un article.';
      document.body.prepend(notice);
    } else if (!show && banner) banner.remove();
  };
  const apply = (html) => {
    const next = new DOMParser().parseFromString(html, 'text/html');
    const top = anchor();
    const before = top ? top.getBoundingClientRect().top : 0;
    for (const selector of ['style', '[data-diagnostics]', 'article']) {
      const current = document.querySelector(selector);
      const incoming = next.querySelector(selector);
      if (current && incoming) window.morphdom(current, incoming);
    }
    document.title = next.title;
    if (top && top.isConnected) window.scrollBy(0, top.getBoundingClientRect().top - before);
    window.previewUpdates++;
  };
  const connect = () => {
    const socket = new WebSocket('ws://' + location.host + '/ws?token=' + encodeURIComponent(token) + '&article=' + encodeURIComponent(article));
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'gone') return gone(true);
      gone(false);
      apply(message.html);
    };
    socket.onclose = () => setTimeout(connect, 1000);
  };
  connect();
})();
`;

interface State {
  tree: ResolvedTree;
  listed: Map<string, FileIdentity>;
  /** The images of the articles, recognised or not, as the export would embed them. */
  assets: Map<string, ExportAsset>;
  /** The diagnostics of the tree with the asset-unsupported of the images. */
  diagnostics: Diagnostic[];
  /** Milliseconds of the last recomputation. */
  ms: number;
}

export interface ServeOptions {
  folder: string;
  port: number;
  /** Where the line with the address goes, and the times of each recomputation. */
  log: (line: string) => void;
}

const articlesOf = (tree: ResolvedTree): TreeNode[] =>
  (tree.nodes ?? []).filter((node) => node.kind === 'article' && node.directive !== true && node.id !== undefined);

/** The files an article shows: its own and those of every object it embeds. */
function filesOf(tree: ResolvedTree, article: TreeNode): Set<string> {
  const ids = new Set<string>();
  const stack: JsonML[] = [...(article.content ?? [])];
  while (stack.length > 0) {
    const item = stack.pop()!;
    if (typeof item === 'string') continue;
    const attributes = item[1] !== null && typeof item[1] === 'object' && !Array.isArray(item[1]) ? (item[1] as Record<string, unknown>) : null;
    if (item[0] === 'embed' && typeof attributes?.id === 'string') ids.add(attributes.id);
    for (const child of item.slice(attributes ? 2 : 1)) stack.push(child as JsonML);
  }
  const files = new Set([article.file]);
  for (const node of tree.nodes ?? []) if (node.id !== undefined && ids.has(node.id)) files.add(node.file);
  return files;
}

/** Starts the server; the promise gives the address once it listens. */
export function serve(options: ServeOptions): Promise<{ url: string; close: () => Promise<void> }> {
  const { folder } = options;
  const token = randomBytes(18).toString('base64url');
  const fontsFolder = fileURLToPath(new URL('../../fonts/', import.meta.url));
  const morphdom = readFileSync(createRequire(import.meta.url).resolve('morphdom/dist/morphdom-umd.min.js'), 'utf8');
  const fontFiles = new Set<string>(Object.values(BASE_FONTS).flatMap((family) => [family.normal, family.italic]));
  let port = 0;

  // What an image is, by path, read again only when the file changes.
  const probes = new Map<string, { key: string; asset: ExportAsset }>();
  const probe = (path: string, listed: Map<string, FileIdentity>): ExportAsset => {
    const identity = listed.get(path);
    const key = identity ? `${identity.dev}:${identity.ino}:${identity.mtimeNs}:${identity.size}` : '';
    const known = probes.get(path);
    if (known && known.key === key && key !== '') return known.asset;
    const read = readAsset(folder, path, listed);
    // The preview needs only the verdict: the bytes are served by address.
    const asset: ExportAsset = 'fallback' in read ? read : { mime: read.mime, bytes: new Uint8Array(0) };
    probes.set(path, { key, asset });
    return asset;
  };
  // What the pages need from the tree: the images recognised and their diagnostics.
  const derive = (): State => {
    const { tree, listed, ms } = live;
    const assets = new Map<string, ExportAsset>();
    const unsupported = new Map<string, Diagnostic>();
    for (const article of articlesOf(tree)) {
      const page = pageAssets(tree, article, (path) => assets.get(path) ?? probe(path, listed));
      for (const [path, asset] of page.assets) assets.set(path, asset);
      for (const diagnostic of page.diagnostics) unsupported.set(diagnostic.file, diagnostic);
    }
    const diagnostics = sortDiagnostics([...(tree.diagnostics ?? []), ...unsupported.values()]);
    return { tree, listed, assets, diagnostics, ms };
  };
  const live = new LiveFolder(folder, () => update(), options.log);
  let state = derive();

  const withToken = (path: string) => `${path}?token=${encodeURIComponent(token)}`;
  const render = (id: string): string | null => {
    const article = articlesOf(state.tree).find((node) => node.id === id);
    if (!article) return null;
    const preview = {
      assetUrl: (path: string) => withToken(`/asset/${path.split('/').map(encodeURIComponent).join('/')}`),
      fontUrl: (file: string) => withToken(`/font/${encodeURIComponent(file)}`),
      scriptUrls: [withToken('/morphdom.js'), withToken('/client.js')],
      diagnostics: state.diagnostics,
    };
    return [...staticExport(state.tree, id, state.assets, { allowErrors: true, preview })].join('');
  };

  const index = (): string => {
    const all = state.diagnostics;
    const count = (files: Set<string> | null) => {
      const own = files === null ? all : all.filter((d) => files.has(d.file));
      const errors = own.filter((d) => d.severity === 'error').length;
      return `${errors} ${errors === 1 ? 'errore' : 'errori'}, ${own.length - errors} ${own.length - errors === 1 ? 'avviso' : 'avvisi'}`;
    };
    const rows = articlesOf(state.tree).map((article) => {
      const title = typeof article.attributes?.title === 'string' && article.attributes.title !== '' ? article.attributes.title : article.id!;
      return `<li><a href="${escapeHtml(withToken(`/article/${encodeURIComponent(article.id!)}`))}">${escapeHtml(title)}</a> <code>${escapeHtml(article.id!)}</code> — ${count(filesOf(state.tree, article))}</li>`;
    }).join('');
    return '<!DOCTYPE html>\n<html lang=""><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Anteprima</title><style>html { color-scheme: light dark; font-family: sans-serif; } body { margin: 18pt; }</style></head><body>' +
      `<h1>Anteprima di ${escapeHtml(folder)}</h1><p>La cartella: ${count(null)}; ricalcolata in ${state.ms.toFixed(1)} ms.</p>` +
      `${rows === '' ? '<p>Nessun article.</p>' : `<ul>${rows}</ul>`}</body></html>\n`;
  };

  const tokenOk = (url: URL) => {
    const given = Buffer.from(url.searchParams.get('token') ?? '');
    const wanted = Buffer.from(token);
    return given.length === wanted.length && timingSafeEqual(given, wanted);
  };
  // Only the names of this address: another name pointing here (DNS rebinding) is refused.
  const hostOk = (request: IncomingMessage) => [`127.0.0.1:${port}`, `localhost:${port}`].includes(request.headers.host ?? '');

  const send = (response: ServerResponse, status: number, type: string, body: string | Uint8Array) => {
    response.writeHead(status, {
      'Content-Type': type,
      'Content-Security-Policy': CSP,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
    });
    response.end(body);
  };

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (!hostOk(request) || !tokenOk(url)) return send(response, 403, 'text/plain; charset=utf-8', 'vietato: manca il codice d\'accesso\n');
    if (request.method !== 'GET') return send(response, 405, 'text/plain; charset=utf-8', 'solo GET\n');
    let path: string;
    try {
      path = decodeURIComponent(url.pathname);
    } catch {
      return send(response, 400, 'text/plain; charset=utf-8', 'indirizzo non valido\n');
    }
    if (path === '/') return send(response, 200, 'text/html; charset=utf-8', index());
    if (path === '/client.js') return send(response, 200, 'text/javascript; charset=utf-8', CLIENT);
    if (path === '/morphdom.js') return send(response, 200, 'text/javascript; charset=utf-8', morphdom);
    if (path.startsWith('/article/')) {
      const html = render(path.slice('/article/'.length));
      return html === null ? send(response, 404, 'text/plain; charset=utf-8', 'nessun article con questo id\n') : send(response, 200, 'text/html; charset=utf-8', html);
    }
    if (path.startsWith('/font/') && fontFiles.has(path.slice('/font/'.length))) {
      return send(response, 200, 'font/woff2', readFileSync(join(fontsFolder, path.slice('/font/'.length))));
    }
    if (path.startsWith('/asset/')) {
      // Only a file of the runtime's list, read as the export reads it: no links, nothing outside.
      const asset = readAsset(folder, path.slice('/asset/'.length), state.listed);
      if ('bytes' in asset) return send(response, 200, asset.mime, asset.bytes);
    }
    return send(response, 404, 'text/plain; charset=utf-8', 'non trovato\n');
  });

  const sockets = new WebSocketServer({ noServer: true });
  const clients = new Map<WebSocket, { article: string; last: string | null }>();
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname !== '/ws' || !hostOk(request) || !tokenOk(url)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      return;
    }
    sockets.handleUpgrade(request, socket, head, (ws) => {
      clients.set(ws, { article: url.searchParams.get('article') ?? '', last: render(url.searchParams.get('article') ?? '') });
      ws.on('close', () => clients.delete(ws));
    });
  });

  function update(): void {
    state = derive();
    for (const [ws, client] of clients) {
      const html = render(client.article);
      if (html === client.last) continue;
      client.last = html;
      ws.send(JSON.stringify(html === null ? { type: 'gone' } : { type: 'page', html }));
    }
  }

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, '127.0.0.1', () => {
      const address = server.address();
      port = typeof address === 'object' && address !== null ? address.port : options.port;
      const close = () =>
        new Promise<void>((done) => {
          live.close();
          for (const ws of clients.keys()) ws.terminate();
          sockets.close();
          server.close(() => done());
          server.closeAllConnections();
        });
      resolve({ url: `http://127.0.0.1:${port}/?token=${token}`, close });
    });
  });
}
