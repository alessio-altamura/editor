const results = {};
const w = new Worker('/bench/iso-worker.mjs', { type: 'module' });
w.onerror = (e) => { results.worker_error = e.message; };
w.onmessage = (e) => {
  if (e.data.tests) { results.tests = e.data.tests; results.load_ms = e.data.load_ms;
    // The infinite loop: the page stays free and stops the worker from outside.
    const t0 = performance.now(); w.postMessage('loop');
    setTimeout(() => { w.terminate(); results.loop_terminated_after_ms = Math.round(performance.now() - t0); results.page_responsive = true; window.result = results; }, 1000);
  } else if (e.data.error) { results.error = e.data.error; window.result = results; }
};
