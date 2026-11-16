import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DbClient, DbRestartError, IMPORT_TIMEOUT_MS, QueryTimeoutError } from '../src/db/client';
import type { ImportRequest } from '../src/db/import';

type Posted = { id: number; kind: string; sql?: string; req?: ImportRequest; file?: Blob; table?: string };

/** Stand-in for the PGlite worker: records posted requests, the test answers them by hand. */
class FakeWorker {
  static all: FakeWorker[] = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { message: string }) => void) | null = null;
  posted: Posted[] = [];
  terminated = false;
  constructor() {
    FakeWorker.all.push(this);
  }
  postMessage(m: Posted) {
    this.posted.push(m);
  }
  terminate() {
    this.terminated = true;
  }
  ready() {
    this.onmessage?.({ data: { type: 'ready', timings: { bootMs: 1, seedMs: 2 } } });
  }
  answer(i: number, result: unknown) {
    this.onmessage?.({ data: { type: 'result', id: this.posted[i].id, result } });
  }
  fail(i: number, message: string) {
    this.onmessage?.({ data: { type: 'error', id: this.posted[i].id, error: { message, code: '22P04' } } });
  }
}

const last = () => FakeWorker.all[FakeWorker.all.length - 1];
const REQ: ImportRequest = { table: 'orders', columns: ['ref', 'qty'], delimiter: ',' };
const FILE = new Blob(['ref,qty\nA,1\n']);
const TABLE = { table: 'orders', columns: [{ name: 'ref', type: 'text' }, { name: 'qty', type: 'bigint' }], rows: 1 };

beforeEach(() => {
  FakeWorker.all = [];
  vi.useFakeTimers();
  vi.stubGlobal('Worker', FakeWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function withImportedTable() {
  const db = new DbClient(() => {}, 5000);
  const dropped: [string, Error][] = [];
  db.onImportDropped = (t, e) => dropped.push([t, e]);
  last().ready();
  const p = db.importCsv(REQ, FILE);
  last().answer(0, TABLE);
  await expect(p).resolves.toEqual(TABLE);
  return { db, dropped };
}

/** Times out a query on the current worker, so the client restarts and replays. */
async function timeoutQuery(db: DbClient) {
  const q = db.run('SELECT slow()').catch((e: unknown) => e);
  await vi.advanceTimersByTimeAsync(5000);
  expect(await q).toBeInstanceOf(QueryTimeoutError);
}

describe('DbClient import', () => {
  it('gửi kind import kèm Blob, dùng timeout 30s thay vì 5s', async () => {
    const db = new DbClient(() => {}, 5000);
    last().ready();
    const p = db.importCsv(REQ, FILE);
    expect(last().posted[0]).toMatchObject({ kind: 'import', req: REQ, file: FILE });
    await vi.advanceTimersByTimeAsync(IMPORT_TIMEOUT_MS - 1);
    expect(FakeWorker.all).toHaveLength(1);
    last().answer(0, TABLE);
    await expect(p).resolves.toEqual(TABLE);
    expect(db.importedTables()).toEqual(['orders']);
  });

  it('sau restart: nạp lại bảng đã nhập với kiểu đã biết, trước query gửi sau', async () => {
    const { db } = await withImportedTable();
    await timeoutQuery(db);
    const q = db.run('SELECT 1');
    last().ready();
    expect(last().posted.map((p) => p.kind)).toEqual(['import']);
    expect(last().posted[0].req).toEqual({ ...REQ, types: ['text', 'bigint'] });
    last().answer(0, TABLE);
    expect(last().posted.map((p) => p.kind)).toEqual(['import', 'run']);
    last().answer(1, { columns: [], types: [], rows: [] });
    await expect(q).resolves.toBeDefined();
  });

  it('nạp lại quá hạn: bỏ bảng, báo, restart đúng một lần rồi không nạp lại nữa', async () => {
    const { db, dropped } = await withImportedTable();
    await timeoutQuery(db);
    last().ready();
    await vi.advanceTimersByTimeAsync(IMPORT_TIMEOUT_MS);
    expect(dropped.map(([t, e]) => [t, e instanceof QueryTimeoutError])).toEqual([['orders', true]]);
    expect(FakeWorker.all).toHaveLength(3);
    last().ready();
    expect(last().posted).toEqual([]);
    expect(db.importedTables()).toEqual([]);
  });

  it('nạp lại lỗi SQL: bỏ bảng và báo, không restart', async () => {
    const { db, dropped } = await withImportedTable();
    await timeoutQuery(db);
    last().ready();
    last().fail(0, 'missing data for column "qty"');
    await vi.advanceTimersByTimeAsync(0);
    expect(dropped.map(([t, e]) => [t, e.message])).toEqual([['orders', 'missing data for column "qty"']]);
    expect(FakeWorker.all).toHaveLength(2);
  });

  it('nạp lại bị restart khác cắt ngang: vẫn giữ và nạp lại lần sau', async () => {
    const { db, dropped } = await withImportedTable();
    await timeoutQuery(db);
    db.restart(); // trước khi worker mới kịp ready
    await vi.advanceTimersByTimeAsync(0);
    last().ready();
    expect(last().posted.map((p) => p.kind)).toEqual(['import']);
    expect(dropped).toEqual([]);
  });

  it('import lần đầu lỗi thì không được ghi để nạp lại', async () => {
    const db = new DbClient(() => {}, 5000);
    last().ready();
    const p = db.importCsv(REQ, FILE).catch((e: unknown) => e);
    last().fail(0, 'boom');
    expect(await p).toBeInstanceOf(Error);
    expect(db.importedTables()).toEqual([]);
  });

  it('dropImport bỏ bảng khỏi danh sách nạp lại; không tham số = xóa hết', async () => {
    const { db } = await withImportedTable();
    const d = db.dropImport('orders');
    expect(last().posted[1]).toMatchObject({ kind: 'dropImport', table: 'orders' });
    last().answer(1, undefined);
    await d;
    expect(db.importedTables()).toEqual([]);
    const all = db.dropImport();
    expect(last().posted[2]).toMatchObject({ kind: 'dropImport', table: undefined });
    last().answer(2, undefined);
    await all;
  });

  it('import đang chờ khi restart nhận DbRestartError', async () => {
    const db = new DbClient(() => {}, 5000);
    last().ready();
    const slow = db.run('SELECT slow()').catch((e: unknown) => e);
    const imp = db.importCsv(REQ, FILE).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await slow).toBeInstanceOf(QueryTimeoutError);
    expect(await imp).toBeInstanceOf(DbRestartError);
    expect(db.importedTables()).toEqual([]);
  });

  it('tải parser vẫn đi ngoài hàng đợi, gửi { kind: parser, sql: "" } như cũ', async () => {
    const db = new DbClient(() => {}, 5000);
    last().ready();
    void db.importCsv(REQ, FILE);
    const p = db.loadParser();
    expect(last().posted.map((x) => x.kind)).toEqual(['import', 'parser']);
    expect(last().posted[1]).toMatchObject({ kind: 'parser', sql: '' });
    last().answer(1, null);
    await expect(p).resolves.toBeUndefined();
  });
});
