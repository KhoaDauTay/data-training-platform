import type { QueryResult } from './run';

export type DbStatus = 'loading' | 'ready' | 'failed';
export class QueryTimeoutError extends Error {}

type WorkerMessage =
  | { type: 'ready' }
  | { type: 'initError'; message: string }
  | { type: 'result'; id: number; result: QueryResult }
  | { type: 'error'; id: number; message: string };

interface Pending {
  resolve: (r: QueryResult) => void;
  reject: (e: Error) => void;
}

/**
 * Owns the PGlite worker. statement_timeout does not work in PGlite, so a runaway query
 * is stopped by terminating the worker and booting a fresh one (re-seeds, ~3s).
 */
export class DbClient {
  private worker!: Worker;
  private ready!: Promise<void>;
  private pending = new Map<number, Pending>();
  private nextId = 1;

  constructor(
    private readonly onStatus: (s: DbStatus, message?: string) => void,
    private readonly timeoutMs = 5000,
  ) {
    this.start();
  }

  private start(): void {
    this.onStatus('loading');
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    this.ready = new Promise<void>((resolve, reject) => {
      this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        const m = e.data;
        if (m.type === 'ready') {
          this.onStatus('ready');
          resolve();
        } else if (m.type === 'initError') {
          this.onStatus('failed', m.message);
          reject(new Error(m.message));
        } else {
          const p = this.pending.get(m.id);
          if (!p) return;
          this.pending.delete(m.id);
          if (m.type === 'result') p.resolve(m.result);
          else p.reject(new Error(m.message));
        }
      };
      this.worker.onerror = (e) => {
        this.onStatus('failed', e.message);
        reject(new Error(e.message || 'Worker lỗi'));
      };
    });
    this.ready.catch(() => {}); // surfaced through run() and onStatus
  }

  async run(sql: string): Promise<QueryResult> {
    await this.ready;
    const id = this.nextId++;
    return new Promise<QueryResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.restart();
        reject(new QueryTimeoutError(`Query chạy quá ${this.timeoutMs / 1000} giây nên đã bị dừng. Database đang được nạp lại.`));
      }, this.timeoutMs);
      this.pending.set(id, {
        resolve: (r) => { clearTimeout(timer); resolve(r); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      this.worker.postMessage({ id, sql });
    });
  }

  restart(): void {
    this.worker.terminate();
    for (const p of this.pending.values()) p.reject(new Error('Database đang khởi động lại.'));
    this.pending.clear();
    this.start();
  }
}
