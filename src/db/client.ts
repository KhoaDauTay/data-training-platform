import type { ImportedTable, ImportRequest } from './import';
import type { LoadProgress } from './loadProgress';
import { SqlError, type QueryResult, type SqlErrorInfo } from './run';

export type DbStatus = 'loading' | 'ready' | 'failed';
/** `parser`: loads the SQL parser (wasm + lazy chunk) for `steps`, with its own long budget. */
export type RequestKind = 'run' | 'explain' | 'steps' | 'parser';
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
/** A request failed in the worker for a non-Postgres reason (asset download, lazy chunk import). `detail` is the raw message, if any. */
export class WorkerTaskError extends Error {
  name = 'WorkerTaskError';
  constructor(readonly detail?: string) {
    super();
  }
}
/** The worker failed to boot or crashed. `detail` is the raw technical message (not translated). */
export class DbFailedError extends Error {
  name = 'DbFailedError';
  constructor(readonly detail: string) {
    super();
  }
}

export const PARSER_TIMEOUT_MS = 60_000;
/** Worst case in the spike (20 MB, 200k rows, 50 columns) took ~6.5 s in Node; the browser is slower. */
export const IMPORT_TIMEOUT_MS = 30_000;

/** Everything the worker accepts, minus the request id. */
export type WorkerBody =
  | { kind: RequestKind; sql: string }
  | { kind: 'import'; req: ImportRequest; file: Blob }
  | { kind: 'dropImport'; table?: string };

type WorkerMessage =
  | { type: 'ready'; timings: DbTimings }
  | { type: 'initError'; message: string }
  | ({ type: 'progress' } & LoadProgress)
  | { type: 'result'; id: number; result: unknown }
  | { type: 'error'; id: number; error: SqlErrorInfo }
  | { type: 'fault'; id: number; message: string };

interface Job {
  body: WorkerBody;
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
  /** A query ran past its budget; called before the worker restarts (the diagnostics button). */
  onTimeout?: (e: QueryTimeoutError) => void;
  /** PGlite asset download progress while booting (bytes). */
  onProgress?: (p: LoadProgress) => void;
  /** Called when an imported table could not be re-imported after a restart; it is no longer replayed. */
  onImportDropped: (table: string, error: Error) => void = () => {};
  /** Imported tables (with their inferred types), replayed after every restart. */
  private imports = new Map<string, { req: ImportRequest; file: Blob }>();
  private worker!: Worker;
  private status: DbStatus = 'loading';
  private failure?: DbFailedError;
  private queue: Job[] = [];
  private inFlight?: { id: number; job: Job; timer: ReturnType<typeof setTimeout> };
  /** Parser loads: posted beside the query queue, answered by id. */
  private side = new Map<number, { job: Job; timer: ReturnType<typeof setTimeout> }>();
  private waitingSide: Job[] = [];
  private nextId = 1;

  constructor(
    private readonly onStatus: (s: DbStatus, detail?: string) => void,
    private readonly timeoutMs = 5000,
  ) {
    this.start();
  }

  /** One queued entry point for every kind of request. Rejects with SqlError, WorkerTaskError, QueryTimeoutError, DbRestartError or DbFailedError. */
  request<T>(kind: RequestKind, sql: string, timeoutMs = this.timeoutMs): Promise<T> {
    return this.enqueue<T>({ kind, sql }, timeoutMs);
  }

  private enqueue<T>(body: WorkerBody, timeoutMs: number): Promise<T> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ body, timeoutMs, resolve: (r) => resolve(r as T), reject });
      this.pump();
    });
  }

  /** CSV → sandbox.<req.table>, through the query queue (never between a player's BEGIN and ROLLBACK). Only a successful import is replayed. */
  async importCsv(req: ImportRequest, file: Blob): Promise<ImportedTable> {
    const t = await this.enqueue<ImportedTable>({ kind: 'import', req, file }, IMPORT_TIMEOUT_MS);
    this.imports.set(req.table, { req: { ...req, types: t.columns.map((c) => c.type) }, file });
    return t;
  }

  /** Drops one imported table, or every imported table when `table` is omitted. Forgotten for replay before it is sent. */
  dropImport(table?: string): Promise<void> {
    if (table === undefined) this.imports.clear();
    else this.imports.delete(table);
    return this.enqueue<void>({ kind: 'dropImport', table }, this.timeoutMs);
  }

  importedTables(): string[] {
    return [...this.imports.keys()];
  }

  /**
   * Queued right after start(), so replays run before anything sent later. A replay that fails
   * or times out is forgotten and reported (no restart loop); one cut short by another restart
   * stays registered and that restart replays it.
   */
  private replayImports(): void {
    for (const [table, { req, file }] of this.imports) {
      this.enqueue<ImportedTable>({ kind: 'import', req, file }, IMPORT_TIMEOUT_MS).catch((e: Error) => {
        // Restart or failed boot is not the file's fault: keep it for the next replay (plan item 12).
        if (e instanceof DbRestartError || e instanceof DbFailedError) return;
        this.imports.delete(table);
        this.onImportDropped(table, e);
      });
    }
  }

  run(sql: string): Promise<QueryResult> {
    return this.request<QueryResult>('run', sql);
  }

  explain(sql: string): Promise<unknown> {
    return this.request<unknown>('explain', sql);
  }

  /** Several sub-queries per call, so it gets a longer budget. Call loadParser() first so the download is not counted here. */
  steps<T>(sql: string): Promise<T> {
    return this.request<T>('steps', sql, this.timeoutMs * 3);
  }

  /**
   * Downloads the parser (~1.7 MB wasm) under its own long budget. Not cached here: a restarted worker
   * needs it again, and the worker itself answers at once when the parser is already loaded.
   */
  loadParser(): Promise<void> {
    // Bypasses the query queue (Run/Submit never wait for the download) and never restarts the worker.
    if (this.failure) return Promise.reject(this.failure);
    return new Promise<void>((resolve, reject) => {
      const job: Job = { body: { kind: 'parser', sql: '' }, timeoutMs: PARSER_TIMEOUT_MS, resolve: () => resolve(), reject };
      if (this.status === 'ready') this.postSide(job);
      else this.waitingSide.push(job);
    });
  }

  private postSide(job: Job): void {
    const id = this.nextId++;
    const timer = setTimeout(() => {
      this.side.delete(id);
      job.reject(new WorkerTaskError());
    }, job.timeoutMs);
    this.side.set(id, { job, timer });
    this.worker.postMessage({ id, ...job.body });
  }

  /** Kills the worker, rejects every waiting query with DbRestartError, boots a fresh worker and replays imported tables. */
  restart(): void {
    performance.mark('db:restart');
    this.worker.terminate();
    this.rejectAll(new DbRestartError());
    this.start();
    this.replayImports();
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
      for (const job of this.waitingSide.splice(0)) this.postSide(job);
      this.pump();
    } else if (m.type === 'initError') {
      this.fail(m.message);
    } else if (m.type === 'progress') {
      this.onProgress?.({ loaded: m.loaded, total: m.total });
    } else if (this.side.has(m.id)) {
      const { job, timer } = this.side.get(m.id)!;
      clearTimeout(timer);
      this.side.delete(m.id);
      if (m.type === 'result') job.resolve(m.result);
      else job.reject(new WorkerTaskError(m.type === 'fault' ? m.message : undefined));
    } else {
      const f = this.inFlight;
      if (!f || f.id !== m.id) return;
      clearTimeout(f.timer);
      this.inFlight = undefined;
      if (m.type === 'result') f.job.resolve(m.result);
      else if (m.type === 'error') f.job.reject(new SqlError(m.error));
      else f.job.reject(new WorkerTaskError(m.message));
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
      // Forget a timed-out import before restart() replays the others, or it would loop.
      // Only the registered entry: a timed-out *replacement* keeps the old file replayable.
      const b = job.body;
      if (b.kind === 'import' && this.imports.get(b.req.table)?.file === b.file) this.imports.delete(b.req.table);
      job.reject(new QueryTimeoutError(job.timeoutMs));
      this.onTimeout?.(new QueryTimeoutError(job.timeoutMs));
      this.restart();
    }, job.timeoutMs);
    this.inFlight = { id, job, timer };
    this.worker.postMessage({ id, ...job.body });
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
    for (const { job, timer } of this.side.values()) {
      clearTimeout(timer);
      job.reject(e);
    }
    this.side.clear();
    for (const job of this.waitingSide.splice(0)) job.reject(e);
  }

  private setStatus(s: DbStatus, detail?: string): void {
    this.status = s;
    this.onStatus(s, detail);
  }
}
