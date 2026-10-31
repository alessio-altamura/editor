// The page of the formula process (class 4): it keeps one worker with Pyodide and gives
// it the jobs one at a time. A job that passes the time limit stops the worker, which
// is started again for the next one; the page itself never runs Python.
const LIMIT_MS = Number(new URLSearchParams(location.search).get('limit') ?? '5000');
const START_MS = Number(new URLSearchParams(location.search).get('start') ?? '60000');
/** The isolation tests only: the worker also runs Python without the checks. */
const PROBES = new URLSearchParams(location.search).has('probes');

let worker = null;
let ready = null;

function start() {
  worker = new Worker(new URL(`formula-worker.mjs${PROBES ? '?probes=1' : ''}`, import.meta.url), { type: 'module' });
  ready = new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ error: `Pyodide non parte in ${START_MS / 1000} s` }), START_MS);
    worker.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data.ready ? { ok: true } : { error: event.data.error ?? 'il worker non parte' });
    };
    worker.onerror = (event) => {
      clearTimeout(timer);
      resolve({ error: event.message || 'il worker non parte' });
    };
  });
  return ready;
}

function stop() {
  worker?.terminate();
  worker = null;
  ready = null;
}

/** One job in the worker, or a timeout that stops it. */
function runOne(job) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      stop();
      resolve({ error: { code: 'formula-timeout', message: `il calcolo supera ${LIMIT_MS / 1000} s` } });
    }, LIMIT_MS);
    worker.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data);
    };
    worker.onerror = (event) => {
      clearTimeout(timer);
      stop();
      resolve({ error: { code: 'formula-unavailable', message: event.message || 'il worker si è fermato' } });
    };
    worker.postMessage(job.probe === undefined ? JSON.stringify(job) : job);
  });
}

/** Called by the main process: the results of the jobs, by key. */
window.evaluateJobs = async (jobs) => {
  const results = {};
  for (const job of jobs) {
    const started = await (ready ?? start());
    if (started.error) {
      stop();
      results[job.key] = { error: { code: 'formula-unavailable', message: started.error } };
      continue;
    }
    results[job.key] = await runOne(job);
  }
  return results;
};

if (PROBES) {
  /** Python run as it is, in a fresh namespace; the page stops it after the limit, as a job. */
  window.probe = async (code) => {
    const started = await (ready ?? start());
    if (started.error) return { error: started.error };
    const answer = await runOne({ probe: code });
    return answer;
  };
}

/** Called once by the main process, to start Pyodide before the first job. */
window.warm = async () => (await (ready ?? start())).error ?? 'ok';
