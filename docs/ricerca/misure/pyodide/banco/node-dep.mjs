import { readFileSync } from 'node:fs';
const [pkg, dir] = process.argv.slice(2);
const { loadPyodide } = await import(pkg + '/pyodide.mjs');
const py = await loadPyodide({ indexURL: pkg + '/' });
py.FS.mkdirTree('/work'); py.FS.writeFile('/work/dipendenze.py', readFileSync(dir + '/dipendenze.py', 'utf8'));
let out = ''; py.setStdout({ batched: (s) => { out += s + '\n'; } });
py.runPython("import sys, runpy; sys.argv=['dipendenze.py']; runpy.run_path('/work/dipendenze.py', run_name='__main__')");
process.stdout.write(out);
