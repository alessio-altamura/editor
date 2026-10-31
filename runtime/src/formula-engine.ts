// The formulas computed by Electron (class 4): one child process with a hidden page and a
// worker with Pyodide, started once and kept, as the print starts its own. The kept-on
// runtime keeps it while it runs; the cli starts it only for a document with code to
// compute. A worker missing or not answering gives `formula-unavailable` on each job.
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { FORMULA_TIME_LIMIT_MS, type FormulaEvaluator, type FormulaJob, type FormulaResult } from './formula.js';
import { electronPath, ELECTRON_VERSION, INSTALL_HINT } from './print.js';
import { resolveTree, type ResolveOptions } from './resolve-tree.js';
import type { ResolvedTree } from './tree.js';

/** How long Electron and Pyodide may take to start: about 4 s measured, with margin for a slow machine. */
export const START_LIMIT_MS = 60_000;

type Waiting = { resolve: (results: Map<string, FormulaResult>) => void; jobs: FormulaJob[]; timer: NodeJS.Timeout; probe?: (answer: unknown) => void };

export class PyodideEngine implements FormulaEvaluator {
  /** The results known, by key: the same code with the same inputs is not computed again. */
  readonly cache = new Map<string, FormulaResult>();
  private child: ChildProcess | null = null;
  private started: Promise<string | null> | null = null;
  private readonly waiting = new Map<number, Waiting>();
  private nextId = 1;
  /** Where Pyodide is: off, starting (about 3 s), ready, or failed; the app shows «Python in avvio». */
  status: 'off' | 'starting' | 'ready' | 'failed' = 'off';
  /** Called when the status changes. */
  onStatus: (status: PyodideEngine['status']) => void = () => undefined;
  private setStatus(status: PyodideEngine['status']): void {
    if (status === this.status) return;
    this.status = status;
    this.onStatus(status);
  }

  constructor(
    private readonly limitMs = FORMULA_TIME_LIMIT_MS,
    private readonly log: (line: string) => void = () => undefined,
    /** The isolation tests only: the worker also runs Python without the checks (`probe`). */
    private readonly probes = false,
  ) {}

  /** Starts Electron and Pyodide in the background, once; null when ready, else why not. */
  start(): Promise<string | null> {
    if (this.started) return this.started;
    this.setStatus('starting');
    this.started = new Promise<string | null>((resolve) => {
      const executable = electronPath();
      if (executable === null || !existsSync(executable)) {
        resolve(`non trovo Electron ${ELECTRON_VERSION}; ${INSTALL_HINT}`);
        return;
      }
      const script = fileURLToPath(new URL('./formula-electron.js', import.meta.url));
      const flags = [
        ...(process.platform === 'linux' ? ['--ozone-platform=headless'] : []),
        ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []),
      ];
      const child = spawn(executable, [...flags, script, '--limit', String(this.limitMs), ...(this.probes ? ['--isolation-probes'] : [])], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_OPTIONS: '', ELECTRON_RUN_AS_NODE: '' },
      });
      this.child = child;
      const timer = setTimeout(() => {
        resolve(`Electron e Pyodide non partono in ${START_LIMIT_MS / 1000} s`);
        this.stop();
      }, START_LIMIT_MS);
      let stderr = '';
      child.stderr!.on('data', (chunk: Buffer) => (stderr = (stderr + chunk.toString('utf8')).slice(-4000)));
      createInterface({ input: child.stdout! }).on('line', (line) => {
        let message: { ready?: true | string; electron?: string; id?: number; results?: Record<string, FormulaResult>; error?: string; probe?: unknown };
        try {
          message = JSON.parse(line) as typeof message;
        } catch {
          return;
        }
        if (message.ready !== undefined) {
          clearTimeout(timer);
          if (message.electron !== ELECTRON_VERSION) resolve(`Electron è ${message.electron}, serve ${ELECTRON_VERSION}; ${INSTALL_HINT}`);
          else resolve(message.ready === true ? null : message.ready);
          this.log(message.ready === true ? 'formule: Pyodide pronto' : `formule: ${message.ready}`);
          return;
        }
        const waiting = message.id === undefined ? undefined : this.waiting.get(message.id);
        if (waiting === undefined) return;
        this.waiting.delete(message.id!);
        clearTimeout(waiting.timer);
        if (waiting.probe) return waiting.probe(message.probe ?? { error: message.error });
        waiting.resolve(message.results ? new Map(Object.entries(message.results)) : unavailable(waiting.jobs, message.error ?? 'risposta vuota'));
      });
      child.on('error', () => {
        clearTimeout(timer);
        resolve(`non riesco a lanciare Electron ${ELECTRON_VERSION}; ${INSTALL_HINT}`);
      });
      child.on('exit', () => {
        clearTimeout(timer);
        resolve(`Electron si è fermato: ${stderr.split('\n').filter((l) => l !== '' && !/dbus|Fontconfig|viz_main/.test(l)).slice(-3).join(' ')}`);
        this.child = null;
        this.started = null;
        for (const [id, waiting] of this.waiting) {
          clearTimeout(waiting.timer);
          waiting.resolve(unavailable(waiting.jobs, 'Electron si è fermato'));
          this.waiting.delete(id);
        }
      });
    }).then((problem) => {
      this.setStatus(problem === null ? 'ready' : 'failed');
      return problem;
    });
    return this.started;
  }

  /** The results of the jobs, by key; a job already known is not sent again. */
  async evaluate(jobs: FormulaJob[]): Promise<Map<string, FormulaResult>> {
    const out = new Map<string, FormulaResult>();
    const unknown = jobs.filter((job) => {
      const known = this.cache.get(job.key);
      if (known) out.set(job.key, known);
      return known === undefined;
    });
    if (unknown.length === 0) return out;
    const problem = await this.start();
    const child = this.child;
    const results = problem !== null || child === null
      ? unavailable(unknown, problem ?? 'Electron non risponde')
      : await new Promise<Map<string, FormulaResult>>((resolve) => {
        const id = this.nextId++;
        // Each job may take its limit, and a worker stopped takes a new start.
        const timer = setTimeout(() => {
          this.waiting.delete(id);
          resolve(unavailable(unknown, 'Electron non risponde'));
          this.stop();
        }, START_LIMIT_MS + unknown.length * (this.limitMs + 5000));
        this.waiting.set(id, { resolve, jobs: unknown, timer });
        child.stdin!.write(`${JSON.stringify({ id, jobs: unknown })}\n`);
      });
    for (const [key, result] of results) {
      out.set(key, result);
      // A worker that was not there may be there next time: only real results are kept.
      if (!('error' in result && !('values' in result) && result.error.code === 'formula-unavailable')) this.cache.set(key, result);
    }
    return out;
  }

  /** The isolation tests only: Python run in the worker without the checks; its value as a string, or the error. */
  async probe(code: string): Promise<{ value?: string; error?: string }> {
    const problem = await this.start();
    if (problem !== null || this.child === null) return { error: problem ?? 'Electron non risponde' };
    const child = this.child;
    return new Promise((resolve) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.waiting.delete(id);
        resolve({ error: 'Electron non risponde' });
      }, START_LIMIT_MS + this.limitMs + 5000);
      this.waiting.set(id, { resolve: () => resolve({ error: 'Electron si è fermato' }), jobs: [], timer, probe: (answer) => resolve(answer as { value?: string; error?: string }) });
      child.stdin!.write(`${JSON.stringify({ id, jobs: [], probe: code })}\n`);
    });
  }

  /** Stops Electron; a next evaluation starts it again. */
  stop(): void {
    this.child?.kill();
    this.child = null;
    this.started = null;
    this.setStatus('off');
  }

  close(): void {
    this.stop();
  }
}

function unavailable(jobs: FormulaJob[], message: string): Map<string, FormulaResult> {
  return new Map(jobs.map((job) => [job.key, { error: { code: 'formula-unavailable', message } }]));
}

/**
 * The tree with the formulas computed: resolveTree stays synchronous and reads the
 * results by key; each pass gives the jobs whose inputs are known and whose result is
 * not, which are computed before the next pass. A formula of a formula takes one pass more.
 */
export async function resolveWithFormulas(folder: string, options: ResolveOptions, evaluator: FormulaEvaluator | null): Promise<ResolvedTree> {
  const results = new Map<string, FormulaResult>();
  for (;;) {
    const pending = new Map<string, FormulaJob>();
    const tree = resolveTree(folder, { ...options, formulas: { results, pending } });
    const jobs = [...pending.values()].filter((job) => !results.has(job.key));
    if (jobs.length === 0) return tree;
    const computed = evaluator === null ? unavailable(jobs, 'nessun motore per le formule') : await evaluator.evaluate(jobs);
    for (const job of jobs) results.set(job.key, computed.get(job.key) ?? { error: { code: 'formula-unavailable', message: 'nessun risultato' } });
  }
}
