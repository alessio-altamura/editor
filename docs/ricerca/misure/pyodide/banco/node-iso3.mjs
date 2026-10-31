const [pkg] = process.argv.slice(2);
const { loadPyodide } = await import(pkg + '/pyodide.mjs');
const py = await loadPyodide({ indexURL: pkg + '/', jsglobals: {} });
py.runPython("import sys\nsys.modules['pyodide_js'] = None");
console.log(py.runPython(`
import sys
try:
    del sys.modules['pyodide_js']
    import pyodide_js
    pyodide_js.mountNodeFS('/h', '/etc')
    r = 'aggirato: ' + open('/h/hostname').read().strip()
except BaseException as e:
    r = 'bloccato: ' + type(e).__name__
r
`));
