// The worker of the formulas (class 4): Pyodide with an empty `js` module, and without
// the functions that reach outside, removed once it is loaded. The page and the main
// process serve it with the CSP `default-src 'none'; script-src 'self'
// 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'`: no eval, so the code cannot
// build a JavaScript function either (ricerca/pyodide-misure.md).
import { loadPyodide } from './pyodide/pyodide.mjs';

const OUTSIDE = ['fetch', 'XMLHttpRequest', 'importScripts', 'WebSocket', 'indexedDB', 'caches', 'EventSource'];

try {
  const pyodide = await loadPyodide({ indexURL: new URL('pyodide/', import.meta.url).href, jsglobals: {} });
  const host = await (await fetch(new URL('formula_host.py', import.meta.url))).text();
  for (const name of OUTSIDE) {
    try {
      delete self[name];
    } catch {}
    try {
      self[name] = undefined;
    } catch {}
  }
  // What the code prints goes nowhere.
  pyodide.setStdout({ batched: () => undefined });
  pyodide.setStderr({ batched: () => undefined });
  pyodide.runPython(host);
  const runJob = pyodide.globals.get('run_job');
  const probes = new URL(import.meta.url).searchParams.has('probes');
  self.onmessage = (event) => {
    if (probes && typeof event.data === 'object' && event.data.probe !== undefined) {
      let answer;
      try {
        answer = { value: String(pyodide.runPython(event.data.probe, { globals: pyodide.globals.get('dict')() })) };
      } catch (error) {
        answer = { error: String(error?.message ?? error) };
      }
      self.postMessage(answer);
      return;
    }
    let result;
    try {
      result = JSON.parse(runJob(event.data));
    } catch (error) {
      result = { error: { code: 'formula-error', message: String(error?.message ?? error) } };
    }
    self.postMessage(result);
  };
  self.postMessage({ ready: true });
} catch (error) {
  self.postMessage({ error: String(error?.stack ?? error) });
}
