// Node: Pyodide in the main thread (the permission model forbids workers), with an empty js module.
const [pkg] = process.argv.slice(2);
const { loadPyodide } = await import(pkg + '/pyodide.mjs');
const out = {};
try {
  const py = await loadPyodide({ indexURL: pkg + '/', jsglobals: {} });
  Object.assign(out, JSON.parse(await py.runPythonAsync(`
import pyodide_js, json
res = {}
def probe(name, fn):
    try: res[name] = 'riuscito: ' + repr(fn())[:110]
    except BaseException as e: res[name] = 'bloccato: ' + type(e).__name__ + ': ' + str(e)[:110]
F = pyodide_js.constructor.constructor
probe('function_constructor', lambda: F('return typeof process')())
probe('leggi_file_host', lambda: F("return process.getBuiltinModule('fs').readFileSync('/etc/hostname','utf8')")())
probe('scrivi_file_host', lambda: F("process.getBuiltinModule('fs').writeFileSync('/tmp/pyodide-escape.txt','x'); return 'scritto'")())
probe('processo_figlio', lambda: F("return process.getBuiltinModule('child_process').execSync('echo ciao').toString()")())
probe('rete', lambda: F("return typeof fetch")())
json.dumps(res)
`)));
} catch (e) { out.error = String(e.stack || e).slice(0, 300); }
console.log(JSON.stringify(out, null, 1));
