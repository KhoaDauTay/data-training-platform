import type { ScriptResult, ScriptRunner, LabScript } from './script';

/** Default hard limit of one lab once the runtime is up (fresh database ~0.5–1 s + steps). */
export const LAB_TIMEOUT_MS = 20_000;
/** First boot: initdb of the template (~3 s in Node) plus the PGlite download when it is not cached yet. Hang detection. */
export const LAB_BOOT_TIMEOUT_MS = 120_000;

// Errors carry no user-facing text; the UI translates them by class, like src/db/client.ts (whose classes are not
// imported: a value import from main would split main, Plan 6 U3).
export class LabTimeoutError extends Error {
  name = 'LabTimeoutError';
  constructor(readonly timeoutMs: number) {
    super();
  }
}
/** The lab was waiting or running when reset() was called. */
export class LabResetError extends Error {
  name = 'LabResetError';
}
/** The lab worker failed to boot or crashed, or the script could not start (unknown extension). Raw message in `detail`. */
export class LabFailedError extends Error {
  name = 'LabFailedError';
  constructor(readonly detail: string) {
    super();
  }
}

/** Extensions whose first run in a worker is slow (download + template build, session.ts PREINSTALLED). */
const HEAVY: readonly string[] = ['postgis'];

type Msg =
  | { type: 'ready' }
  | { type: 'initError'; message: string }
  | { type: 'result'; id: number; result: ScriptResult }
  | { type: 'fault'; id: number; message: string };

/**
 * ENG-PGLAB (L230): runs engine labs in their own worker (src/engine/pglab/pglabWorker.ts), one at a time. PGlite has no
 * statement_timeout, so a lab past its limit terminates the worker and a fresh one boots at once (like DbClient).
 */
export class PgLabClient implements ScriptRunner {
  private worker?: Worker;
  private booted?: Promise<void>;
  private settleBoot?: (e?: Error) => void;
  private pending?: { id: number; resolve: (r: ScriptResult) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout>; ext?: readonly string[] };
  private chain: Promise<unknown> = Promise.resolve();
  private nextId = 1;
  /** v43 (L726): heavy extensions this worker has run once (its PostGIS template is built); a new worker starts empty. */
  private warm = new Set<string>();

  /** Rejects with LabTimeoutError, LabResetError or LabFailedError. A Postgres error is a step result, not a rejection. */
  run(script: LabScript): Promise<ScriptResult> {
    const p = this.chain.then(() => this.exec(script));
    this.chain = p.catch(() => undefined);
    return p;
  }

  /** Drops the worker (and the lab in progress). The next run boots a fresh one. */
  reset(): void {
    this.kill(new LabResetError());
  }

  private async exec(script: LabScript): Promise<ScriptResult> {
    await this.spawn();
    const w = this.worker;
    if (!w) throw new LabResetError(); // reset() between the boot and this lab
    // v43 (L726): the first PostGIS lab of a worker downloads ~20 MB and builds its template (~9 s in Node): boot limit, not 20 s
    const cold = (script.extensions ?? []).some((x) => HEAVY.includes(x) && !this.warm.has(x));
    const ms = script.timeoutMs ?? (cold ? LAB_BOOT_TIMEOUT_MS : LAB_TIMEOUT_MS);
    return new Promise<ScriptResult>((resolve, reject) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.kill(new LabTimeoutError(ms));
        void this.spawn().catch(() => undefined); // fresh runtime ready for the next lab
      }, ms);
      this.pending = { id, resolve, reject, timer, ext: script.extensions };
      w.postMessage({ id, script });
    });
  }

  private spawn(): Promise<void> {
    if (this.booted) return this.booted;
    const w = new Worker(new URL('./pglabWorker.ts', import.meta.url), { type: 'module' });
    this.worker = w;
    let timer: ReturnType<typeof setTimeout>;
    this.booted = new Promise<void>((resolve, reject) => {
      this.settleBoot = (e) => {
        clearTimeout(timer);
        this.settleBoot = undefined;
        if (e) reject(e);
        else resolve();
      };
      timer = setTimeout(() => this.kill(new LabFailedError('boot timeout')), LAB_BOOT_TIMEOUT_MS);
    });
    w.onmessage = (e: MessageEvent<Msg>) => {
      const m = e.data;
      if (m.type === 'ready') return this.settleBoot?.();
      if (m.type === 'initError') return this.kill(new LabFailedError(m.message));
      const p = this.pending;
      if (!p || p.id !== m.id) return;
      clearTimeout(p.timer);
      this.pending = undefined;
      if (m.type === 'result') {
        for (const x of HEAVY) if ((p.ext ?? []).includes(x)) this.warm.add(x); // a result = its template is built
        p.resolve(m.result);
      }
      else p.reject(new LabFailedError(m.message));
    };
    w.onerror = (e: ErrorEvent) => this.kill(new LabFailedError(e.message || 'worker error'));
    return this.booted;
  }

  private kill(e: Error): void {
    this.worker?.terminate();
    this.worker = undefined;
    this.warm.clear();
    const boot = this.booted;
    this.booted = undefined;
    if (this.settleBoot) {
      this.settleBoot(e);
      boot?.catch(() => undefined);
    }
    const p = this.pending;
    this.pending = undefined;
    if (p) {
      clearTimeout(p.timer);
      p.reject(e);
    }
  }
}
