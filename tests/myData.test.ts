import type { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { DbFailedError, DbRestartError } from '../src/db/client';
import { dropImport, importCsv } from '../src/db/import';
import { runSandboxed } from '../src/db/run';
import { MyData, importedCells, type ImportDb } from '../src/import/myData';
import { idbStore, isStoredImport, memoryStore, type StoredImport } from '../src/import/store';
import { freshDb } from './helpers';

const adapter = (pg: PGlite): ImportDb => ({
  run: (sql) => runSandboxed(pg, sql),
  importCsv: (req, file) => importCsv(pg, req, file),
  dropImport: (table) => dropImport(pg, table),
});

const CSV = new Blob(['Mã lô,Số lượng\nA,3\nB,4\n']);
const REC: StoredImport = { table: 'orders', fileName: 'orders.csv', delimiter: ',', columns: ['ref', 'qty'], types: ['text', 'text'], rows: 2, file: new Blob(['ref,qty\nA,1\nB,2\n']) };

async function setup(initial: StoredImport[] = []) {
  const pg = await freshDb();
  const store = memoryStore(initial);
  const changes: string[][] = [];
  const my = new MyData(adapter(pg), store, (ts) => changes.push(ts.map((t) => t.table)));
  return { pg, store, my, changes };
}

const count = async (pg: PGlite, table: string) => (await runSandboxed(pg, `SELECT count(*) FROM ${table}`)).rows[0][0];

/** A DbClient stand-in whose imports always fail with `error`. */
const failingDb = (error: Error): ImportDb => ({
  run: async () => ({ columns: ['table_name'], types: [25], rows: [['ports']] }),
  importCsv: async () => { throw error; },
  dropImport: async () => {},
});

describe('MyData', () => {
  it('add: nạp, lưu file gốc + kiểu cột vào store, báo thay đổi', async () => {
    const { pg, store, my, changes } = await setup();
    const r = await my.add(CSV, 'Lô hàng.csv');
    expect(r).toMatchObject({ ok: true, persisted: true, table: { table: 'lo_hang', rows: 2 } });
    expect(await count(pg, 'lo_hang')).toBe(2);
    expect(store.records.get('lo_hang')).toMatchObject({ fileName: 'Lô hàng.csv', delimiter: ',', columns: ['ma_lo', 'so_luong'], types: ['text', 'bigint'], rows: 2, file: CSV });
    expect(changes).toEqual([['lo_hang']]);
    expect(importedCells(my.tables)).toBe(4);
  });

  it('add: tên trùng bảng game thêm _my; cùng tên file thì thay bảng cũ', async () => {
    const { pg, my } = await setup();
    await my.add(CSV, 'shipments.csv');
    expect(await count(pg, 'shipments_my')).toBe(2);
    await my.add(new Blob(['a\n1\n']), 'shipments.csv');
    expect(my.tables.map((t) => [t.table, t.rows])).toEqual([['shipments_my', 1]]);
  });

  it('v14 T5: tên bảng Finance cũng thêm _my (loans.csv → loans_my), ở mọi domain', async () => {
    const { pg, my } = await setup();
    await my.add(CSV, 'loans.csv');
    expect(await count(pg, 'loans_my')).toBe(2);
  });

  it('add: vượt giới hạn trả problem, lỗi COPY trả error; cả hai không đụng store', async () => {
    const { store, my } = await setup();
    for (const n of ['a', 'b', 'c', 'd', 'e']) await my.add(new Blob(['x\n1\n']), `${n}.csv`);
    expect(await my.add(CSV, 'f.csv')).toEqual({ ok: false, problem: { kind: 'tooManyTables' } });
    const bad = await my.add(new Blob(['a,b\n1\n']), 'a.csv');
    expect(bad).toMatchObject({ ok: false, error: { code: '22P04' } });
    expect([...store.records.keys()]).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('restore: nạp lại với kiểu đã lưu (không suy lại), bỏ bản ghi hỏng và bản ghi trùng bảng game', async () => {
    const broken: StoredImport = { ...REC, table: 'broken', file: new Blob(['ref,qty\nA\n']) };
    const clash: StoredImport = { ...REC, table: 'ports' };
    const { pg, store, my, changes } = await setup([REC, broken, clash]);
    const failed = await my.restore();
    expect(failed.map((f) => f.table)).toEqual(['broken', 'ports']);
    expect([...store.records.keys()]).toEqual(['orders']);
    expect(changes).toEqual([['orders']]);
    expect((await runSandboxed(pg, 'SELECT max(qty) FROM orders')).types).toEqual([25]); // text: types from the store
    expect((await runSandboxed(pg, "SELECT to_regclass('sandbox.ports') IS NULL")).rows).toEqual([[true]]);
  });

  it('restore: DbRestartError và DbFailedError giữ bản ghi để thử lại lần tải trang sau', async () => {
    for (const error of [new DbRestartError(), new DbFailedError('boot failed')]) {
      const store = memoryStore([REC]);
      const my = new MyData(failingDb(error), store, () => {});
      expect((await my.restore()).map((f) => f.error)).toEqual([error]);
      expect(store.records.has('orders')).toBe(true);
    }
  });

  it('add / clear chờ restore xong: không lọt bảng thứ 6, xóa hết không bị lượt nạp lại hồi sinh', async () => {
    const five = ['t1', 't2', 't3', 't4', 't5'].map((table) => ({ ...REC, table }));
    const a = await setup(five);
    const restoring = a.my.restore(); // not awaited, like main.ts
    expect(await a.my.add(CSV, 'f.csv')).toEqual({ ok: false, problem: { kind: 'tooManyTables' } });
    await restoring;
    expect(a.my.tables).toHaveLength(5);
    const b = await setup(five);
    const again = b.my.restore();
    await b.my.clear();
    await again;
    expect(b.my.tables).toEqual([]);
    expect(b.store.records.size).toBe(0);
    expect((await runSandboxed(b.pg, "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'sandbox'")).rows).toEqual([[0]]);
  });

  it('remove / clear / dropped: xóa khỏi DB, store và danh sách', async () => {
    const { pg, store, my } = await setup();
    await my.add(CSV, 'a.csv');
    await my.add(CSV, 'b.csv');
    await my.add(CSV, 'c.csv');
    await my.remove('a');
    expect(await runSandboxed(pg, "SELECT to_regclass('sandbox.a') IS NULL")).toMatchObject({ rows: [[true]] });
    await my.dropped('b');
    expect(my.tables.map((t) => t.table)).toEqual(['c']);
    expect([...store.records.keys()]).toEqual(['c']);
    await my.clear();
    expect(my.tables).toEqual([]);
    expect(store.records.size).toBe(0);
    expect((await runSandboxed(pg, "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'sandbox'")).rows).toEqual([[0]]);
  });
});

describe('store', () => {
  it('isStoredImport chỉ nhận bản ghi hợp lệ (tên định danh, kiểu đã biết, đủ kiểu cho mỗi cột)', () => {
    expect(isStoredImport(REC)).toBe(true);
    expect(isStoredImport({ ...REC, columns: ['ref', 'Bad Name'] })).toBe(false);
    expect(isStoredImport({ ...REC, table: 'x"; DROP' })).toBe(false);
    expect(isStoredImport({ ...REC, types: ['text', 'json'] })).toBe(false);
    expect(isStoredImport({ ...REC, types: ['text'] })).toBe(false);
    expect(isStoredImport({ ...REC, rows: -1 })).toBe(false);
    expect(isStoredImport({ ...REC, file: 'abc' })).toBe(false);
    expect(isStoredImport(null)).toBe(false);
  });

  it('idbStore: không có IndexedDB (Node, chế độ riêng tư bị chặn) thì không ném lỗi', async () => {
    const s = idbStore();
    expect(await s.list()).toEqual([]);
    expect(await s.put(REC)).toBe(false);
    expect(await s.remove('a')).toBe(false);
    expect(await s.clear()).toBe(false);
  });
});

describe('FIX-1 (L147): exports never carry SQL on imported tables, even before restore() ends', () => {
  const MINE: StoredImport = { ...REC, table: 'my_sales' };
  const cards = [
    { id: 'a', title: 'A', kind: 'table', sql: 'SELECT * FROM my_sales' },
    { id: 'b', title: 'B', kind: 'table', sql: 'SELECT * FROM ports' },
  ];
  it('names() lists stored files while their replay is still running, and after a replay that hit a restart', async () => {
    const { dashFile } = await import('../src/me');
    const hanging: ImportDb = { ...failingDb(new Error('unused')), importCsv: () => new Promise(() => {}) };
    const slow = new MyData(hanging, memoryStore([MINE]), () => {});
    void slow.restore(); // never settles: the DB is still booting
    expect(slow.tables).toEqual([]);
    expect(await slow.names()).toEqual(['my_sales']);
    expect(dashFile('logistics', cards as never, await slow.names()).file.cards.map((c) => c.title)).toEqual(['B']);

    for (const error of [new DbRestartError(), new DbFailedError('boot')]) {
      const store = memoryStore([MINE]);
      const my = new MyData(failingDb(error), store, () => {});
      expect(await my.restore()).toHaveLength(1);
      expect(my.tables).toEqual([]); // not replayed…
      expect(store.records.has('my_sales')).toBe(true); // …but kept for the next load
      expect(await my.names()).toEqual(['my_sales']);
    }
  });
});
