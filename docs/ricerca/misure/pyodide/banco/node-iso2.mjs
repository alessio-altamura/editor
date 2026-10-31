const [pkg] = process.argv.slice(2);
const { loadPyodide } = await import(pkg + '/pyodide.mjs');
const py = await loadPyodide({ indexURL: pkg + '/', jsglobals: {} });
const variants = {
  normale: '',
  senza_pyodide_js: "import sys\nsys.modules['pyodide_js'] = None\n",
};
for (const [name, prelude] of Object.entries(variants)) {
  const res = await py.runPythonAsync(prelude + `
import json
res = {}
def probe(n, fn):
    try: res[n] = 'riuscito: ' + repr(fn())[:100]
    except BaseException as e: res[n] = 'bloccato: ' + type(e).__name__ + ': ' + str(e)[:100]
def mount():
    import pyodide_js
    pyodide_js.mountNodeFS('/host' + str(len(res)), '/etc')
    return open('/host' + str(len(res)) + '/hostname').read()
probe('mountNodeFS', mount)
def via_api():
    import pyodide
    return [a for a in dir(pyodide) if not a.startswith('__')][:12]
probe('modulo_pyodide', via_api)
def via_ffi():
    from pyodide.ffi import JsProxy
    import _pyodide_core
    return [a for a in dir(_pyodide_core) if 'js' in a.lower()][:8]
probe('core', via_ffi)
json.dumps(res)
`);
  console.log(name, JSON.parse(res));
}
