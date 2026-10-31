const TESTS = "import json\nout = {}\ndef probe(name, fn):\n    try:\n        out[name] = 'riuscito: ' + repr(fn())[:120]\n    except BaseException as e:\n        out[name] = 'bloccato: ' + type(e).__name__ + ': ' + str(e)[:120]\nimport js\nprobe('js_ha_fetch', lambda: hasattr(js, 'fetch'))\nprobe('js_contenuto', lambda: [k for k in dir(js) if not k.startswith('_')][:10])\nprobe('run_js_typeof_fetch', lambda: __import__('pyodide.code', fromlist=['run_js']).run_js('typeof fetch'))\nimport pyodide_js\nprobe('function_constructor', lambda: pyodide_js.constructor.constructor('return typeof globalThis')())\nprobe('file_host', lambda: open('/etc/hostname').read())\nprobe('pyfetch', lambda: __import__('pyodide.http', fromlist=['open_url']).open_url('http://127.0.0.1:8765/bench/page.html').read()[:20])\njson.dumps(out)\n";
import { loadPyodide } from '/pkg/pyodide.mjs';
try {
  const t0 = performance.now();
  const py = await loadPyodide({ indexURL: '/pkg/', jsglobals: {} });
  const load_ms = performance.now() - t0;
  for (const k of ['fetch', 'XMLHttpRequest', 'importScripts', 'WebSocket', 'indexedDB', 'caches', 'EventSource']) { try { delete self[k]; self[k] = undefined; } catch {} }
  const tests = JSON.parse(py.runPython(TESTS));
  postMessage({ tests, load_ms });
  self.onmessage = () => { py.runPython('while True: pass'); };
} catch (e) { postMessage({ error: String(e.stack || e) }); }
