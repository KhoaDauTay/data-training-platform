import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DbClient, DbFailedError, DbRestartError, PARSER_TIMEOUT_MS, QueryTimeoutError, WorkerTaskError, type DbStatus } from '../src/db/client';
import { SqlError } from '../src/db/run';

/** Stand-in for the PGlite worker: records posted queries, the test answers them by hand. */
class FakeWorker {
  static all: FakeWorker[] = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { message: string }) => void) | null = null;
  posted: { id: number; kind: string; sql: string }[] = [];
  terminated = false;
  constructor() {
    FakeWorker.all.push(this);
  }
  postMessage(m: { id: number; kind: string; sql: string }) {
    this.posted.push(m);
  }
  terminate() {
    this.terminated = true;
  }
  send(data: unknown) {
    this.onmessage?.({ data });
  }
  ready() {
    this.send({ type: 'ready', timings: { bootMs: 1, seedMs: 2 } });
  }
  answer(i: number, rows: unknown[][] = [[i]]) {
    this.send({ type: 'result', id: this.posted[i].id, result: { columns: ['x'], types: [23], rows } });
  }
}

const last = () => FakeWorker.all[FakeWorker.all.length - 1];

function client(): { db: DbClient; statuses: DbStatus[] } {
  const statuses: DbStatus[] = [];
  const db = new DbClient((s) => statuses.push(s), 5000);
  return { db, statuses };
}

beforeEach(() => {
  FakeWorker.all = [];
  vi.useFakeTimers();
  vi.stubGlobal('Worker', FakeWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('DbClient', () => {
  it('chỉ gửi một query mỗi lần; timer của query sau bắt đầu khi nó được gửi', async () => {
    const { db } = client();
    const w = last();
    w.ready();
    const a = db.run('A');
    const b = db.run('B');
    expect(w.posted.map((p) => p.sql)).toEqual(['A']);
    await vi.advanceTimersByTimeAsync(4000);
    w.answer(0);
    expect(w.posted.map((p) => p.sql)).toEqual(['A', 'B']);
    await vi.advanceTimersByTimeAsync(4000); // B đã chờ tổng 8s nhưng mới chạy 4s
    w.answer(1);
    await expect(a).resolves.toMatchObject({ rows: [[0]] });
    await expect(b).resolves.toMatchObject({ rows: [[1]] });
    expect(FakeWorker.all).toHaveLength(1);
  });

  it('query chưa ready thì xếp hàng, gửi khi ready', async () => {
    const { db } = client();
    const w = last();
    const a = db.run('A');
    expect(w.posted).toEqual([]);
    w.ready();
    expect(w.posted.map((p) => p.sql)).toEqual(['A']);
    w.answer(0);
    await expect(a).resolves.toBeDefined();
    expect(db.timings).toEqual({ bootMs: 1, seedMs: 2 });
  });

  it('quá hạn: QueryTimeoutError, query đang chờ nhận DbRestartError, worker mới được tạo', async () => {
    const { db, statuses } = client();
    const w = last();
    w.ready();
    const a = db.run('SLOW');
    const b = db.run('NEXT');
    const ea = a.catch((e: unknown) => e);
    const eb = b.catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(5000);
    const errA = await ea;
    expect(errA).toBeInstanceOf(QueryTimeoutError);
    expect((errA as QueryTimeoutError).timeoutMs).toBe(5000);
    expect((errA as Error).message).toBe('');
    expect(await eb).toBeInstanceOf(DbRestartError);
    expect(w.terminated).toBe(true);
    expect(FakeWorker.all).toHaveLength(2);
    expect(statuses).toEqual(['loading', 'ready', 'loading']);
    last().ready();
    const c = db.run('SELECT 42');
    last().answer(0, [[42]]);
    await expect(c).resolves.toMatchObject({ rows: [[42]] });
  });

  it('restart() lúc đang boot reject query đang chờ thay vì treo', async () => {
    const { db } = client();
    const a = db.run('A').catch((e: unknown) => e);
    db.restart();
    expect(await a).toBeInstanceOf(DbRestartError);
    expect(FakeWorker.all[0].terminated).toBe(true);
  });

  it('kết quả từ worker cũ đã terminate bị bỏ qua', async () => {
    const { db } = client();
    const old = last();
    old.ready();
    const a = db.run('A').catch((e: unknown) => e);
    db.restart();
    expect(await a).toBeInstanceOf(DbRestartError);
    old.answer(0); // không được làm hỏng worker mới
    last().ready();
    const b = db.run('B');
    expect(last().posted.map((p) => p.sql)).toEqual(['B']);
    last().answer(0, [[7]]);
    await expect(b).resolves.toMatchObject({ rows: [[7]] });
  });

  it('worker lỗi sau ready: query đang chạy và đang chờ bị reject, run() sau đó reject ngay', async () => {
    const { db, statuses } = client();
    const w = last();
    w.ready();
    const a = db.run('A').catch((e: unknown) => e);
    const b = db.run('B').catch((e: unknown) => e);
    w.onerror?.({ message: 'boom' });
    const errA = await a;
    expect(errA).toBeInstanceOf(DbFailedError);
    expect((errA as DbFailedError).detail).toBe('boom');
    expect(await b).toBe(errA);
    await expect(db.run('C')).rejects.toBeInstanceOf(DbFailedError);
    expect(w.posted.map((p) => p.sql)).toEqual(['A']);
    expect(statuses.at(-1)).toBe('failed');
    await vi.advanceTimersByTimeAsync(10_000); // không còn timer nào khởi động lại worker
    expect(FakeWorker.all).toHaveLength(1);
  });

  it('initError: run() reject ngay; restart() thử lại được', async () => {
    const { db } = client();
    last().send({ type: 'initError', message: 'wasm failed' });
    await expect(db.run('A')).rejects.toBeInstanceOf(DbFailedError);
    db.restart();
    last().ready();
    const b = db.run('B');
    last().answer(0);
    await expect(b).resolves.toBeDefined();
  });

  it('lỗi SQL từ worker thành SqlError giữ nguyên message, position, code, hint', async () => {
    const { db } = client();
    const w = last();
    w.ready();
    const a = db.run('SELECT cde FROM ports').catch((e: unknown) => e);
    w.send({ type: 'error', id: w.posted[0].id, error: { message: 'column "cde" does not exist', position: 8, code: '42703', hint: 'h' } });
    const e = (await a) as SqlError;
    expect(e).toBeInstanceOf(SqlError);
    expect(e).toMatchObject({ message: 'column "cde" does not exist', position: 8, code: '42703', hint: 'h' });
  });

  it('tiến độ tải từ worker đi tới onProgress, không đổi trạng thái', () => {
    const { db, statuses } = client();
    const seen: unknown[] = [];
    db.onProgress = (p) => seen.push(p);
    last().send({ type: 'progress', loaded: 2_100_000, total: 5_400_000 });
    expect(seen).toEqual([{ loaded: 2_100_000, total: 5_400_000 }]);
    expect(statuses).toEqual(['loading']);
  });
  it('tải parser chạy bên cạnh hàng đợi: Run không chờ; steps có hạn 3×', async () => {
    const { db } = client();
    const w = last();
    w.ready();
    const parser = db.loadParser();
    const run = db.run('R');
    expect(w.posted).toEqual([
      { id: 1, kind: 'parser', sql: '' },
      { id: 2, kind: 'run', sql: 'R' },
    ]);
    w.send({ type: 'result', id: 2, result: { rows: [] } });
    await expect(run).resolves.toEqual({ rows: [] });
    await vi.advanceTimersByTimeAsync(PARSER_TIMEOUT_MS - 1000); // tải chậm vẫn chưa bị giết
    expect(w.terminated).toBe(false);
    w.send({ type: 'result', id: 1, result: null });
    await expect(parser).resolves.toBeUndefined();
    const steps = db.steps('S').catch((e: unknown) => e);
    expect(w.posted[2]).toMatchObject({ kind: 'steps', sql: 'S' });
    await vi.advanceTimersByTimeAsync(14_999);
    expect(w.terminated).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await steps).toBeInstanceOf(QueryTimeoutError);
    expect(((await steps) as QueryTimeoutError).timeoutMs).toBe(15_000);
  });

  it('parser gửi trước khi DB sẵn sàng thì chờ ready rồi mới gửi', () => {
    const { db } = client();
    const w = last();
    void db.loadParser();
    expect(w.posted).toEqual([]);
    w.ready();
    expect(w.posted).toEqual([{ id: 1, kind: 'parser', sql: '' }]);
  });

  it('explain và run gửi đúng kind', () => {
    const { db } = client();
    const w = last();
    w.ready();
    void db.explain('E');
    w.send({ type: 'result', id: 1, result: [] });
    void db.run('R');
    expect(w.posted.map((p) => p.kind)).toEqual(['explain', 'run']);
  });

  it('tải parser quá hạn: WorkerTaskError, không phải lỗi query chậm', async () => {
    const { db } = client();
    last().ready();
    const p = db.loadParser().catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(PARSER_TIMEOUT_MS);
    expect(await p).toBeInstanceOf(WorkerTaskError);
    expect(last().terminated).toBe(false); // a slow download never restarts the DB
  });

  it('lỗi không phải Postgres (fault) thành WorkerTaskError, không phải SqlError', async () => {
    const { db } = client();
    const w = last();
    w.ready();
    const a = db.loadParser().catch((e: unknown) => e);
    w.send({ type: 'fault', id: w.posted[0].id, message: 'Failed to fetch' });
    const e = await a;
    expect(e).toBeInstanceOf(WorkerTaskError);
    expect(e).not.toBeInstanceOf(SqlError);
    expect((e as WorkerTaskError).detail).toBe('Failed to fetch');
  });
});
