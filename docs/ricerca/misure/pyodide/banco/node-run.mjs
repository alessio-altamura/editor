// Node 22: the benchmark inside a worker_threads Worker; RSS of the process before and after.
import { Worker } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
const [pkg, benchDir] = process.argv.slice(2);
const rss0 = process.memoryUsage().rss;
const files = Object.fromEntries(['bench.py', 'decimali.py', 'valori-runtime.json'].map((f) => [f, readFileSync(`${benchDir}/${f}`, 'utf8')]));
const w = new Worker(`
  const { parentPort, workerData } = require('node:worker_threads');
  (async () => {
    const { loadPyodide } = await import(workerData.pkg + '/pyodide.mjs');
    const { measure } = await import(workerData.benchDir + '/harness.mjs');
    const r = await measure(loadPyodide, workerData.pkg + '/', workerData.files);
    parentPort.postMessage(r);
  })().catch((e) => parentPort.postMessage({ error: String(e.stack || e) }));
`, { eval: true, workerData: { pkg, benchDir, files } });
const t0 = performance.now();
w.on('message', (r) => {
  r.total_ms = performance.now() - t0;
  r.rss_before_mb = +(rss0 / 1048576).toFixed(1);
  r.rss_after_mb = +(process.memoryUsage().rss / 1048576).toFixed(1);
  console.log(JSON.stringify(r, null, 1));
  w.terminate();
});
