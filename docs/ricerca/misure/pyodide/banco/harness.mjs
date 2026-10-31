// Shared by the Node worker and the browser worker. loadPyodide and the files are passed in.
export async function measure(loadPyodide, indexURL, files) {
  const r = {};
  let t = performance.now();
  const py = await loadPyodide({ indexURL });
  r.cold_ms = performance.now() - t;
  t = performance.now();
  const py2 = await loadPyodide({ indexURL });
  r.warm_ms = performance.now() - t;
  r.wasm_memory_bytes = py._module.HEAP8.length;
  r.python = py.runPython('import sys; sys.version');
  py.FS.mkdirTree('/work');
  for (const [name, text] of Object.entries(files)) py.FS.writeFile('/work/' + name, text);
  py.runPython("import sys; sys.path.insert(0, '/work'); import bench");
  t = performance.now(); py.runPython("import decimal"); r.import_decimal_ms = performance.now() - t;
  r.decimal = JSON.parse(py.runPython('import json; json.dumps(bench.decimal_checks())'));
  r.timings = JSON.parse(py.runPython('json.dumps(bench.timings())'));
  const strings = Array.from({ length: 100000 }, (_, i) => `${i}.${String(i % 100).padStart(2, '0')}`);
  t = performance.now();
  py.globals.set('strings_js', strings);
  const back = JSON.parse(py.runPython('json.dumps(bench.sum_strings(strings_js.to_py()))'));
  r.transfer_100000 = { roundtrip_ms: performance.now() - t, ...back };
  r.fingerprint = JSON.parse(py.runPython('json.dumps(bench.fingerprint())'));
  r.wasm_memory_after_bytes = py._module.HEAP8.length;
  return r;
}
