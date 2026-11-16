import type { LoadProgress } from './loadProgress';
import { SqlError, type QueryResult, type SqlErrorInfo } from './run';
import type { StepsResult } from '../viz/steps';

export type DbStatus = 'loading' | 'ready' | 'failed';
export type RequestKind = 'run' | 'explain' | 'steps';
export interface DbTimings { bootMs: number; seedMs: number }

// Errors carry no user-facing text: the UI translates them by class (instanceof).
export class QueryTimeoutError extends Error {
  name = 'QueryTimeoutError';
  constructor(readonly timeoutMs: number) {
    super();
  }
}
/** The query was waiting or running when the worker was restarted. */
export class DbRestartError extends Error {
  name = 'DbRestartError';
}
/** The worker failed to boot or crashed. `detail` is the raw technical message (not translated). */
export class DbFailedError extends Error {
  name = 'DbFailedError';
  constructor(readonly detail: string) {
    super();
  }
}

type WorkerMessage =
  | { type: 'ready'; timings: DbTimings }
  | { type: 'initError'; message: string }
  | ({ type: 'progress' } & LoadProgress)
  | { type: 'result'; id: number; result: unknown }
  | { type: 'error'; id: number; error: SqlErrorInfo };

interface Job {
  kind: RequestKind;
  sql: string;
  timeoutMs: number;
  resolve: (r: unknown) => void;
  reject: (e: Error) => void;
}

/**
 * Owns the PGlite worker. statement_timeout does not work in PGlite, so a runaway query
 * is stopped by terminating the worker and booting a fresh one (re-seeds, ~3s).
 * Queries are queued here and posted one at a time, so the timeout measures only the query
 * that is actually executing.
 */
export class DbClient {
  timings?: DbTimings;
  /** PGlite asset download progress while booting (bytes). */
  onProgress?: (p: LoadProgress) => void;
  private worker!: Worker;
  private status: DbStatus = 'loading';
  private failure?: DbFailedError;
  private queue: Job[] = [];
  private inFlight?: { id: number; job: Job; timer: ReturnType<typeof setTimeout> };
  private nextId = 1;

  constructor(
    private readonly onStatus: (s: DbStatus, detail?: string) => void,
    private readonly timeoutMs = 5000,
  ) {
    this.start();
  }

  /** One queued entry point for every kind of request. Rejects with SqlError, QueryTimeoutError, DbRestartError or DbFailedError. */
  request<T>(kind: RequestKind, sql: string, timeoutMs = this.timeoutMs): Promise<T> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ kind, sql, timeoutMs, resolve: (r) => resolve(r as T), reject });
      this.pump();
    });
  }

  run(sql: string): Promise<QueryResult> {
    return this.request<QueryResult>('run', sql);
  }

  explain(sql: string): Promise<unknown> {
    return this.request<unknown>('explain', sql);
  }

  /** Several sub-queries per call, so it gets a longer budget. */
  steps(sql: string): Promise<StepsResult> {
    return this.request<StepsResult>('steps', sql, this.timeoutMs * 3);
  }

  /** Kills the worker, rejects every waiting query with DbRestartError, boots a fresh worker. */
  restart(): void {
    performance.mark('db:restart');
    this.worker.terminate();
    this.rejectAll(new DbRestartError());
    this.start();
  }

  private start(): void {
    this.failure = undefined;
    this.setStatus('loading');
    performance.mark('db:spawn');
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    this.worker = w;
    // Ignore anything a terminated worker still delivers.
    w.onmessage = (e: MessageEvent<WorkerMessage>) => {
      if (w === this.worker) this.receive(e.data);
    };
    w.onerror = (e) => {
      if (w === this.worker) this.fail(e.message || 'worker error');
    };
  }

  private receive(m: WorkerMessage): void {
    if (m.type === 'ready') {
      this.timings = m.timings;
      performance.mark('db:ready');
      performance.measure('db:time-to-ready', 'db:spawn', 'db:ready');
      this.setStatus('ready');
      this.pump();
    } else if (m.type === 'initError') {
      this.fail(m.message);
    } else if (m.type === 'progress') {
      this.onProgress?.({ loaded: m.loaded, total: m.total });
    } else {
      const f = this.inFlight;
      if (!f || f.id !== m.id) return;
      clearTimeout(f.timer);
      this.inFlight = undefined;
      if (m.type === 'result') f.job.resolve(m.result);
      else f.job.reject(new SqlError(m.error));
      this.pump();
    }
  }

  /** Posts the next queued query when the worker is ready and idle; its timer starts now. */
  private pump(): void {
    if (this.status !== 'ready' || this.inFlight) return;
    const job = this.queue.shift();
    if (!job) return;
    const id = this.nextId++;
    const timer = setTimeout(() => {
      this.inFlight = undefined;
      job.reject(new QueryTimeoutError(job.timeoutMs));
      this.restart();
    }, job.timeoutMs);
    this.inFlight = { id, job, timer };
    this.worker.postMessage({ id, kind: job.kind, sql: job.sql });
  }

  private fail(detail: string): void {
    this.worker.terminate();
    this.failure = new DbFailedError(detail);
    this.rejectAll(this.failure);
    this.setStatus('failed', detail);
  }

  private rejectAll(e: Error): void {
    if (this.inFlight) {
      clearTimeout(this.inFlight.timer);
      this.inFlight.job.reject(e);
      this.inFlight = undefined;
    }
    for (const job of this.queue.splice(0)) job.reject(e);
  }

  private setStatus(s: DbStatus, detail?: string): void {
    this.status = s;
    this.onStatus(s, detail);
  }
}
