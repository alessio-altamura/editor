import { loadPyodide } from '/pkg/pyodide.mjs';
import { measure } from '/bench/harness.mjs';
const files = {};
for (const f of ['bench.py', 'decimali.py', 'valori-runtime.json']) files[f] = await (await fetch('/bench/' + f)).text();
try { postMessage(await measure(loadPyodide, '/pkg/', files)); } catch (e) { postMessage({ error: String(e.stack || e) }); }
