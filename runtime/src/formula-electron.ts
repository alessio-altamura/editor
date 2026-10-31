// The main process of the Electron that computes the formulas (class 4). The code runs
// only in a worker of its page, never here nor in Node: the page and the worker are
// served from 127.0.0.1, under a path no one else knows, with the CSP below, and every
// other request is cancelled. `formula-engine` runs it as a child process and speaks to
// it with one JSON line per request on stdin and stdout.
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow } from 'electron';
import { FORMULA_CSP } from './formula.js';


const argument = (name: string) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};
const limit = Number(argument('--limit') ?? '5000');
/**
 * Only the tests start it so: the worker also runs Python without the checks of
 * formula_host.py, to show that the worker alone keeps the code in (the isolation tests).
 */
const probes = process.argv.includes('--isolation-probes');

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const pyodideFolder = dirname(createRequire(import.meta.url).resolve('pyodide/package.json'));
/** The files served, by path under the secret prefix: nothing else answers. */
const FILES = new Map<string, { path: string; type: string }>([
  ['formula-page.html', { path: join(packageRoot, 'web/formula-page.html'), type: 'text/html; charset=utf-8' }],
  ['formula-page.mjs', { path: join(packageRoot, 'web/formula-page.mjs'), type: 'text/javascript' }],
  ['formula-worker.mjs', { path: join(packageRoot, 'web/formula-worker.mjs'), type: 'text/javascript' }],
  ['formula_host.py', { path: join(packageRoot, 'python/formula_host.py'), type: 'text/plain; charset=utf-8' }],
  ['pyodide/pyodide.mjs', { path: join(pyodideFolder, 'pyodide.mjs'), type: 'text/javascript' }],
  ['pyodide/pyodide.asm.mjs', { path: join(pyodideFolder, 'pyodide.asm.mjs'), type: 'text/javascript' }],
  ['pyodide/pyodide.asm.wasm', { path: join(pyodideFolder, 'pyodide.asm.wasm'), type: 'application/wasm' }],
  ['pyodide/python_stdlib.zip', { path: join(pyodideFolder, 'python_stdlib.zip'), type: 'application/zip' }],
  ['pyodide/pyodide-lock.json', { path: join(pyodideFolder, 'pyodide-lock.json'), type: 'application/json' }],
]);

const write = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`);

app.disableHardwareAcceleration();
app.on('window-all-closed', () => undefined);
app.whenReady().then(async () => {
  const prefix = `/${randomBytes(16).toString('hex')}/`;
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const file = path.startsWith(prefix) ? FILES.get(path.slice(prefix.length)) : undefined;
    if (request.method !== 'GET' || file === undefined) {
      response.writeHead(404).end();
      return;
    }
    try {
      const body = readFileSync(file.path);
      response.writeHead(200, { 'content-type': file.type, 'content-security-policy': FORMULA_CSP, 'cache-control': 'no-store' }).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  // Only our own files: any other address is cancelled, from the page and from the worker.
  window.webContents.session.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !details.url.startsWith(origin + prefix) }));
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  await window.loadURL(`${origin}${prefix}formula-page.html?limit=${limit}${probes ? '&probes=1' : ''}`);
  const warmed = (await window.webContents.executeJavaScript('window.warm()')) as string;
  write({ ready: warmed === 'ok' ? true : warmed, electron: process.versions.electron, chrome: process.versions.chrome });
  // One request at a time, in order: the page runs the jobs one by one anyway.
  let queue = Promise.resolve();
  createInterface({ input: process.stdin }).on('line', (line) => {
    queue = queue.then(async () => {
      let request: { id: number; jobs: unknown[]; probe?: string };
      try {
        request = JSON.parse(line) as { id: number; jobs: unknown[]; probe?: string };
      } catch {
        return;
      }
      try {
        if (request.probe !== undefined) {
          if (!probes) throw new Error('le sonde non sono attive');
          write({ id: request.id, probe: await window.webContents.executeJavaScript(`window.probe(${JSON.stringify(request.probe)})`) });
          return;
        }
        const results = await window.webContents.executeJavaScript(`window.evaluateJobs(${JSON.stringify(request.jobs)})`);
        write({ id: request.id, results });
      } catch (error) {
        write({ id: request.id, error: error instanceof Error ? error.message : String(error) });
      }
    });
  }).on('close', () => app.exit(0));
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  app.exit(1);
});
