// A local server for the browser measures: /pkg from the Pyodide package, /bench from the bench folder.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const [pkg, bench, port] = process.argv.slice(2);
const types = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json', '.zip': 'application/zip', '.html': 'text/html', '.py': 'text/plain' };
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const [, root, ...rest] = url.pathname.split('/');
  const base = root === 'pkg' ? pkg : root === 'bench' ? bench : null;
  if (!base) { res.writeHead(404); return res.end(); }
  const file = normalize(join(base, ...rest));
  try {
    const body = await readFile(file);
    const headers = { 'content-type': types[extname(file)] || 'application/octet-stream' };
    // The isolation page and its worker get a strict policy: only our own origin, wasm allowed, no eval.
    if (url.searchParams.has('csp') || rest.join('/').startsWith('iso')) headers['content-security-policy'] = "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'";
    res.writeHead(200, headers); res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(Number(port), '127.0.0.1', () => console.log('listening', port));
