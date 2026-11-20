// ENG-DYNAMO: main-thread side of the DynamoDB lab. Lazy: nothing imports it from main yet (ENG-CORE wires it), and its
// worker fetches the engine only on the first run. Errors carry no user-facing text (the UI translates by class).
import { parseRequest } from './request';
import {
  DynamoError, DynamoInputError, LabFailedError, LabTimeoutError, type DynamoErrorInfo, type DynamoLab, type DynamoRequest,
  type DynamoResult, type DynamoWorkerBody, type DynamoWorkerReply, type DynamoWorkerRequest, type LabRunner,
} from './types';

/** One request on a small lab (Query/Scan of ≤ 2k items measured at ≤ 240 ms, spike §3.2). */
export const RUN_TIMEOUT_MS = 5_000;
/** Loading a lab: ≤ 2k items at ~1 ms each, plus slow machines (10k took up to 15.7 s in the spike). */
export const SETUP_TIMEOUT_MS = 30_000;
/** First request of a worker: the engine download (~1.2 MB gz) and wasm compile come on top. */
export const BOOT_TIMEOUT_MS = 60_000;

const toError = (e: DynamoErrorInfo): Error =>
  e.kind === 'dynamo' ? new DynamoError(e.type, e.message)
  : e.kind === 'input' ? new DynamoInputError(e.code, e.detail, e.line, e.column)
  : new LabFailedError(e.message);

/**
 * Runs DynamoDB labs one request at a time in their own worker. A request past its limit terminates the worker and the
 * next one boots a fresh one (and re-loads its lab), like DbClient. Writes never leak into the next run: the worker
 * re-seeds the lab after any write.
 */
export class DynamoClient implements LabRunner<DynamoResult> {
  readonly engine = 'dynamo';
  private worker?: Worker;
  private booted = false;
  private loaded?: string;
  private disposed = false;
  private pending?: { id: number; resolve: (r: DynamoWorkerReply & { ok: true }) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };
  private chain: Promise<unknown> = Promise.resolve();
  private nextId = 1;

  constructor(
    /** The lab data of a dataset name (from content; may be fetched lazily). */
    private readonly labOf: (dataset: string) => DynamoLab | Promise<DynamoLab>,
    private readonly spawn: () => Worker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
  ) {}

  /**
   * Parses the editor text (JSON request or PartiQL) and runs it on the pristine lab. `after` runs right after it (a read
   * that shows what a write did). Rejects with DynamoInputError, DynamoError, LabTimeoutError or LabFailedError.
   */
  run(src: string, opts: { dataset: string; after?: DynamoRequest }): Promise<DynamoResult> {
    let req: DynamoRequest;
    try {
      req = parseRequest(src);
    } catch (e) {
      return Promise.reject(e);
    }
    return this.request(req, opts);
  }

  /** Same as run() for a request already parsed (a lab's solution). */
  request(req: DynamoRequest, opts: { dataset: string; after?: DynamoRequest }): Promise<DynamoResult> {
    const p = this.chain.then(() => this.exec(req, opts));
    this.chain = p.catch(() => undefined);
    return p;
  }

  /** Drops the worker and the request in progress; the next run boots a fresh one. */
  restart(): void {
    this.kill(new LabFailedError('restarted'));
  }

  dispose(): void {
    this.disposed = true;
    this.kill(new LabFailedError('disposed'));
  }

  private async exec(req: DynamoRequest, { dataset, after }: { dataset: string; after?: DynamoRequest }): Promise<DynamoResult> {
    if (this.loaded !== dataset) {
      const lab = await this.labOf(dataset);
      await this.post({ kind: 'setup', dataset, lab }, this.booted ? SETUP_TIMEOUT_MS : BOOT_TIMEOUT_MS);
      this.loaded = dataset;
    }
    return (await this.post({ kind: 'run', req, after }, this.booted ? RUN_TIMEOUT_MS : BOOT_TIMEOUT_MS)).result!;
  }

  private post(body: DynamoWorkerBody, timeoutMs: number): Promise<DynamoWorkerReply & { ok: true }> {
    if (this.disposed) return Promise.reject(new LabFailedError('disposed'));
    const w = (this.worker ??= this.start());
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timer = setTimeout(() => this.kill(new LabTimeoutError(timeoutMs)), timeoutMs);
      this.pending = { id, resolve, reject, timer };
      w.postMessage({ ...body, id } satisfies DynamoWorkerRequest);
    });
  }

  private start(): Worker {
    const w = this.spawn();
    w.addEventListener('message', ({ data }: MessageEvent<DynamoWorkerReply>) => {
      const p = this.pending;
      if (!p || p.id !== data.id) return;
      clearTimeout(p.timer);
      this.pending = undefined;
      if (data.ok) {
        this.booted = true;
        p.resolve(data);
        return;
      }
      if (data.error.kind === 'failed') this.kill(); // the engine or the lab broke: start clean next time
      p.reject(toError(data.error));
    });
    w.addEventListener('error', (e) => this.kill(new LabFailedError(e.message || 'worker error')));
    return w;
  }

  private kill(reason?: Error): void {
    this.worker?.terminate();
    this.worker = undefined;
    this.booted = false;
    this.loaded = undefined;
    const p = this.pending;
    this.pending = undefined;
    if (p) {
      clearTimeout(p.timer);
      p.reject(reason ?? new LabFailedError('restarted'));
    }
  }
}
