// MongoLabClient: owns the Mongo lab worker, like DbClient owns PGlite's. One run at a time from a queue, so the time
// limit measures only the running command; a run past it terminates the worker and starts a fresh one (boot ~100 ms,
// the data is reloaded from its chunk), and the queue goes on.
//
// It implements ENG-CORE's LabRunner (prepare/run/check); `exec` is the raw run (MongoResult with ack, value, kind).
// Register it in ENG-CORE's LAB_RUNNERS as: mongodb: async () => new (await import('./mongo/client')).MongoLabClient(),
import { gradeMongo } from './grade';
import {
  LabFailedError,
  LabTimeoutError,
  MongoRunError,
  MongoSyntaxError,
  type LabLike,
  type LabOutput,
  type LabRunner,
  type LabStepLike,
  type LabVerdict,
  type MongoDoc,
  type MongoReply,
  type MongoResult,
} from './types';

export const MONGO_TIMEOUT_MS = 5000;
export const DEFAULT_DATASET = 'shop';
const datasetOf = (lab: LabLike) => lab.setup?.trim() || DEFAULT_DATASET;

interface Job {
  src: string;
  dataset: string;
  resolve: (r: MongoResult) => void;
  reject: (e: Error) => void;
}

/**
 * Documents → a table for the Result view: one column per top-level field in first-seen order, a missing field is
 * `undefined` (the view shows it empty, unlike null), nested values stay objects. count → `count`, distinct → `value`.
 */
export function docsToTable(r: MongoResult): LabOutput {
  const base = { types: [], ms: r.ms, ...(r.truncated ? { truncated: true as const } : {}) };
  if (typeof r.value === 'number') return { ...base, columns: ['count'], rows: [[r.value]] };
  if (Array.isArray(r.value)) return { ...base, columns: ['value'], rows: r.value.map((v) => [v]) };
  const columns = [...new Set(r.docs.flatMap((d) => Object.keys(d)))];
  return { ...base, columns, rows: r.docs.map((d: MongoDoc) => columns.map((c) => d[c])) };
}

export class MongoLabClient implements LabRunner {
  /** Called before the worker restarts after a timeout. */
  onTimeout?: (e: LabTimeoutError) => void;
  private worker!: Worker;
  private ready = false;
  private failure?: LabFailedError;
  private queue: Job[] = [];
  private inFlight?: { id: number; job: Job; timer: ReturnType<typeof setTimeout> };
  private nextId = 1;

  constructor(
    private readonly timeoutMs = MONGO_TIMEOUT_MS,
    private readonly makeWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
  ) {
    this.start();
  }

  /** Loads the lab's dataset once (an unknown `setup` rejects with MongoRunError 'unknown_dataset'). */
  async prepare(lab: LabLike): Promise<void> {
    await this.exec('db.x.countDocuments()', datasetOf(lab));
  }

  async run(lab: LabLike, code: string): Promise<LabOutput> {
    return docsToTable(await this.exec(code, datasetOf(lab)));
  }

  /** `check: 'doc'` only. The Solution runs first; a player error is `reason: 'error'` with the raw message. */
  async check(lab: LabLike, step: LabStepLike, code: string): Promise<LabVerdict> {
    if (step.check !== 'doc') return { ok: false, reason: 'unsupported' };
    const expected = await this.exec(step.solution, datasetOf(lab));
    let actual: MongoResult;
    try {
      actual = await this.exec(code, datasetOf(lab));
    } catch (e) {
      if (e instanceof MongoSyntaxError || e instanceof MongoRunError) return { ok: false, reason: 'error', message: e.message };
      throw e;
    }
    const g = gradeMongo(expected, actual, { ordered: step.ordered });
    return g.ok ? (g.tip ? { ok: true, tip: g.tip } : { ok: true }) : { ok: false, reason: 'wrong', grade: g };
  }

  /** The raw run. Rejects with MongoSyntaxError, MongoRunError, LabTimeoutError or LabFailedError. */
  exec(src: string, dataset: string = DEFAULT_DATASET): Promise<MongoResult> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      this.queue.push({ src, dataset, resolve, reject });
      this.pump();
    });
  }

  dispose(): void {
    this.failure = new LabFailedError('disposed');
    this.worker.terminate();
    this.dropAll(this.failure);
  }

  private start(): void {
    this.ready = false;
    let w: Worker;
    try {
      w = this.makeWorker();
    } catch (e) {
      this.failure = new LabFailedError(String((e as Error)?.message ?? e));
      this.dropAll(this.failure);
      return;
    }
    this.worker = w;
    w.onmessage = (e: MessageEvent<MongoReply>) => this.onMessage(w, e.data);
    w.onerror = (e: ErrorEvent) => {
      e.preventDefault?.();
      if (w !== this.worker) return;
      this.failure = new LabFailedError(e.message || 'worker error');
      w.terminate();
      this.dropAll(this.failure);
    };
  }

  private onMessage(w: Worker, m: MongoReply): void {
    if (w !== this.worker) return; // a terminated worker's late reply
    if (m.type === 'ready') {
      this.ready = true;
      this.pump();
      return;
    }
    const f = this.inFlight;
    if (!f || f.id !== m.id) return;
    clearTimeout(f.timer);
    this.inFlight = undefined;
    if (m.type === 'result') f.job.resolve(m.result);
    else {
      const x = m.error;
      f.job.reject(x.type === 'syntax' ? new MongoSyntaxError(x.code, x.message, x.position, x.line, x.column) : new MongoRunError(x.code, x.message));
    }
    this.pump();
  }

  private pump(): void {
    if (!this.ready || this.inFlight || this.failure) return;
    const job = this.queue.shift();
    if (!job) return;
    const id = this.nextId++;
    const timer = setTimeout(() => this.timeout(id), this.timeoutMs);
    this.inFlight = { id, job, timer };
    this.worker.postMessage({ id, src: job.src, dataset: job.dataset });
  }

  private timeout(id: number): void {
    const f = this.inFlight;
    if (!f || f.id !== id) return;
    this.inFlight = undefined;
    const err = new LabTimeoutError(this.timeoutMs);
    this.onTimeout?.(err);
    f.job.reject(err);
    this.worker.terminate();
    this.start(); // queued runs wait for the fresh worker's ready
  }

  private dropAll(e: Error): void {
    if (this.inFlight) {
      clearTimeout(this.inFlight.timer);
      this.inFlight.job.reject(e);
      this.inFlight = undefined;
    }
    for (const j of this.queue.splice(0)) j.reject(e);
  }
}

