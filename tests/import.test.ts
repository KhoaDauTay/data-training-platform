import { describe, expect, it } from 'vitest';
import { dropImport, importCsv, inferTypes } from '../src/db/import';
import { runSandboxed } from '../src/db/run';
import { freshDb } from './helpers';

const csv = (...lines: string[]) => new Blob([lines.join('\n') + '\n'], { type: 'text/csv' });
const COLS = ['ref', 'qty', 'amount', 'phone', 'eta', 'booked_at', 'paid', 'note'];
const ORDERS = csv(
  'ref,qty,amount,phone,eta,booked_at,paid,note',
  'A-1,3,12.50,0901234567,2026-11-01,2026-10-01 08:30,true,"có dấu phẩy, trong ô"',
  'A-2,,7,0912000000,2026-11-02,2026-10-02T09:00:00,FALSE,',
  'A-3,-4,0,0987654321,,2026-10-03 10:15:30.5,,x',
);

describe('importCsv', () => {
  it('nạp vào sandbox, suy kiểu, ô rỗng thành NULL, số có 0 đầu giữ text', async () => {
    const db = await freshDb();
    const t = await importCsv(db, { table: 'orders_csv', columns: COLS, delimiter: ',' }, ORDERS);
    expect(t.rows).toBe(3);
    expect(t.columns.map((c) => c.type)).toEqual(['text', 'bigint', 'numeric', 'text', 'date', 'timestamp', 'boolean', 'text']);
    const r = await runSandboxed(db, 'SELECT sum(qty), sum(amount), count(eta), count(paid), max(phone) FROM orders_csv');
    expect(r.rows).toEqual([['-1', '19.50', 2, 2, '0987654321']]);
    expect(r.types).toEqual([1700, 1700, 20, 20, 25]);
  });

  it('chỉ nhận số viết chuẩn: 1e5, NaN, 0x1F, 1_000, 007, ngày sai giữ text; số > 18 chữ số thành numeric', async () => {
    const db = await freshDb();
    const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    await importCsv(db, { table: 'nums', columns: cols, delimiter: ';', types: cols.map(() => 'text') },
      csv('a;b;c;d;e;f;g', '1e5;NaN;0x1F;1_000;007;99999999999999999999;2026-02-30', '1;1;1;1;1;1;2026-02-28'));
    expect(await inferTypes(db, 'nums', cols)).toEqual(['text', 'text', 'text', 'text', 'text', 'numeric', 'text']);
  });

  it('dùng kiểu được truyền vào (nạp lại) thay vì suy kiểu', async () => {
    const db = await freshDb();
    const t = await importCsv(db, { table: 'orders_csv', columns: COLS, delimiter: ',', types: COLS.map(() => 'text') }, ORDERS);
    expect(t.columns.every((c) => c.type === 'text')).toBe(true);
  });

  it('COPY lỗi thì không để lại gì, bảng cũ cùng tên còn nguyên', async () => {
    const db = await freshDb();
    await importCsv(db, { table: 'orders_csv', columns: COLS, delimiter: ',' }, ORDERS);
    await expect(importCsv(db, { table: 'orders_csv', columns: ['a', 'b'], delimiter: ',' }, csv('a,b', '1')))
      .rejects.toMatchObject({ code: '22P04' });
    expect((await runSandboxed(db, 'SELECT count(*) FROM orders_csv')).rows).toEqual([[3]]);
  });

  it('từ chối định danh chưa sanitize và kiểu lạ trước khi ghép vào SQL', async () => {
    const db = await freshDb();
    await expect(importCsv(db, { table: 'x"; DROP TABLE ports; --', columns: ['a'], delimiter: ',' }, csv('a', '1')))
      .rejects.toThrow('invalid identifier');
    await expect(importCsv(db, { table: 'ok', columns: ['Bad Name'], delimiter: ',' }, csv('a', '1')))
      .rejects.toThrow('invalid identifier');
    const evil = ['text; DROP TABLE ports'] as unknown as ('text')[];
    await expect(importCsv(db, { table: 'ok', columns: ['a'], delimiter: ',', types: evil }, csv('a', '1')))
      .rejects.toThrow('invalid column types');
    expect((await runSandboxed(db, 'SELECT count(*) > 0 FROM ports')).rows).toEqual([[true]]);
  });

  it('bảng game thắng khi trùng tên; dropImport xóa một bảng hoặc cả schema, public không đổi', async () => {
    const db = await freshDb();
    await importCsv(db, { table: 'ports', columns: ['a'], delimiter: ',' }, csv('a', '1'));
    expect((await runSandboxed(db, 'SELECT count(*) > 1 FROM ports')).rows).toEqual([[true]]);
    await importCsv(db, { table: 'b', columns: ['a'], delimiter: ',' }, csv('a', '1'));
    await dropImport(db, 'ports');
    expect((await runSandboxed(db, 'SELECT count(*) FROM sandbox.b')).rows).toEqual([[1]]);
    await dropImport(db);
    const left = await runSandboxed(db, "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'sandbox'");
    expect(left.rows).toEqual([[0]]);
    expect((await runSandboxed(db, 'SHOW search_path')).rows).toEqual([['public, sandbox']]);
    expect((await runSandboxed(db, 'SELECT count(*) FROM shipments')).rows).toEqual([[20000]]);
  });

  it('query của người chơi trên bảng nạp vẫn bị ROLLBACK, kể cả đổi search_path', async () => {
    const db = await freshDb();
    await importCsv(db, { table: 'orders_csv', columns: COLS, delimiter: ',' }, ORDERS);
    await runSandboxed(db, 'DELETE FROM orders_csv');
    await runSandboxed(db, "SELECT set_config('search_path', 'sandbox', false)");
    expect((await runSandboxed(db, 'SELECT count(*) FROM orders_csv')).rows).toEqual([[3]]);
    expect((await runSandboxed(db, 'SHOW search_path')).rows).toEqual([['public, sandbox']]);
  });
});
