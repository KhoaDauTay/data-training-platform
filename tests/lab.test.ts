import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { ensureSchema } from '../src/db/lab';
import { runExplain, runSandboxed } from '../src/db/run';
import { seededDb } from './helpers';

const count = async (db: PGlite, t: string) => Number((await runSandboxed(db, `SELECT count(*) FROM ${t}`, undefined, { schema: 'lab' })).rows[0][0]);

describe('schema lab', () => {
  it('seed lười, nhanh, đúng số dòng và các móc nội dung', async () => {
    const db = await seededDb();
    const t0 = performance.now();
    await ensureSchema(db, 'lab');
    const ms = performance.now() - t0;
    // Alone: 202 ms on the build machine (scratch 190–250 ms). The full parallel suite measured 1.2 s, so the bound is loose.
    // v24 R0b (events_big, 25k rows): ×1.33 the v23 seed on the same machine (mean of 5 alone), budget ×1.5.
    expect(ms).toBeLessThan(2500);
    await ensureSchema(db, 'lab'); // lần hai: không làm gì
    expect(await count(db, 'customers')).toBe(300);
    expect(await count(db, 'stores')).toBe(5);
    expect(await count(db, 'products')).toBe(30);
    expect(await count(db, 'staff')).toBe(20);
    expect(await count(db, 'store_targets')).toBe(57);
    // móc: cửa hàng 4 mở 2025-09-01, không đơn trước đó
    expect(await count(db, "orders WHERE store_id = 4 AND order_date < '2025-09-01'")).toBe(0);
    // móc: 8 đơn sỉ ngày 2026-09-09 ở cửa hàng 3; thanh toán mồ côi 99901..99908
    expect(await count(db, "orders WHERE store_id = 3 AND order_date = '2026-09-09' AND customer_id IS NULL")).toBeGreaterThanOrEqual(8);
    expect(await count(db, 'payments p WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = p.order_id)')).toBe(8);
    // móc: mọi khách đều có ít nhất một đơn (drill anti-join dựa vào khoảng thời gian, không "chưa từng mua")
    expect(await count(db, 'customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)')).toBe(0);
    // v24 R0b: events_big stays under ANALYZE's 30,000-row sample (deterministic statistics), 'refund' is selective,
    // no event before its customer's signup, and kind has no index (a Part 11 drill adds it)
    expect(await count(db, 'events_big')).toBe(25000);
    expect(await count(db, "events_big WHERE kind = 'refund'")).toBe(257);
    expect(await count(db, 'events_big e JOIN customers c ON c.id = e.customer_id WHERE e.ts < c.signup_date')).toBe(0);
    expect((await db.query("SELECT 1 FROM pg_indexes WHERE schemaname = 'lab' AND tablename = 'events_big' AND indexdef LIKE '%(kind%'")).rows).toHaveLength(0);
  });

  it('v24 R0b: id là identity đã setval (INSERT không cần id), CHECK chặn giá trị lạ', async () => {
    const db = await seededDb();
    await ensureSchema(db, 'lab');
    const one = async (sql: string) => (await runSandboxed(db, sql, undefined, { schema: 'lab' })).rows[0];
    // runSandboxed rolls the row back; the sequence still moves (sequences are not transactional), so each table once
    expect(await one("INSERT INTO orders (customer_id, store_id, order_date, channel, status) VALUES (1, 1, '2026-10-31', 'STORE', 'PAID') RETURNING id = (SELECT max(id) + 1 FROM orders)")).toEqual([true]);
    expect(await one("INSERT INTO payments (order_id, amount_vnd, paid_at) VALUES (1, 1000, '2026-10-31 09:00') RETURNING id = (SELECT max(id) + 1 FROM payments)")).toEqual([true]);
    expect(await one("INSERT INTO events_big (customer_id, store_id, kind, ts) VALUES (1, 1, 'view', '2026-10-31 09:00') RETURNING id = 25001")).toEqual([true]);
    await expect(runSandboxed(db, "UPDATE orders SET status = 'paid' WHERE id = 1", undefined, { schema: 'lab' })).rejects.toMatchObject({ code: '23514' });
    await expect(runSandboxed(db, "INSERT INTO events_big (customer_id, store_id, kind, ts) VALUES (1, 1, 'paid', '2026-10-31 09:00')", undefined, { schema: 'lab' })).rejects.toMatchObject({ code: '23514' });
    const n = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema = 'lab' AND is_identity = 'YES'");
    expect(n.rows[0].n).toBe(10);
  });

  it('md5 mỗi bảng lab cố định (đổi seed = đổi nội dung drill)', async () => {
    const db = await seededDb();
    await ensureSchema(db, 'lab');
    const tables = (await db.query<{ t: string }>("SELECT tablename AS t FROM pg_tables WHERE schemaname = 'lab' ORDER BY 1")).rows.map((r) => r.t);
    const md5: Record<string, string> = {};
    for (const t of tables) md5[t] = (await db.query<{ m: string }>(`SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS m FROM lab.${t} x`)).rows[0].m;
    expect(md5).toMatchInlineSnapshot(`
      {
        "app_events": "d2bb27858847cde9f6010deece694ea5",
        "assignments": "9accc0fbcc63f3d2c2fb89d5e2e4b85d",
        "customers": "ec3cb5015d0b87bcc699733a4e17cc92",
        "dim_customer": "2b61ff8a6b0d9425afd1074ad2b2ed60",
        "dim_date": "dfbf6e5c562c5f287093c07f5b6f2dec",
        "dim_product": "00037ae4a59db0226ee7f179f74de81f",
        "events_big": "86b4c8d6ab23816b5c7d8b2e79d23e31",
        "experiments": "f4c7a114c84abb6d8f00dd73debc8649",
        "fact_sales": "33510f2c77b460c9bc181982c2324639",
        "order_items": "4fd8f411bfd982fe2af92855a978fded",
        "orders": "c98ca24ed7fd0c20a0c0fead7a316fea",
        "payments": "85d5b7504ac6e3986de29702a6b414cf",
        "products": "19893977fe10d570b74845155c4e2830",
        "raw_signups": "1e2f5093e937e16df4007233b60a0695",
        "staff": "8aa39ac4109f58186e41203f5eee788d",
        "store_targets": "13149cd407903b6e4cf337ebd3ba9a00",
        "stores": "9b7d92e215b4f1f97975d674e9baf130",
      }
    `);
  });

  it('search_path theo request: lab không thấy bảng game, game không thấy lab, rollback trả lại', async () => {
    const db = await seededDb();
    await ensureSchema(db, 'lab');
    await expect(runSandboxed(db, 'SELECT count(*) FROM shipments', undefined, { schema: 'lab' })).rejects.toThrow(/does not exist/);
    await expect(runSandboxed(db, 'SELECT count(*) FROM order_items')).rejects.toThrow(/does not exist/);
    expect((await runSandboxed(db, 'SELECT count(*) FROM shipments')).rows.length).toBe(1);
    // EXPLAIN carries the schema too
    await expect(runExplain(db, 'SELECT * FROM order_items', { schema: 'lab' })).resolves.toBeDefined();
    await expect(runExplain(db, 'SELECT * FROM order_items')).rejects.toThrow(/does not exist/);
  });

  it('seed lỗi giữa chừng: không để schema dở, đường dẫn phiên trở lại game', async () => {
    const db = new PGlite();
    const { initDb } = await import('../src/db/init');
    await initDb(db);
    await expect(ensureSchema(db, 'lab', 'CREATE TABLE ok (a int); SELECT broken_fn();')).rejects.toThrow();
    expect((await db.query("SELECT 1 FROM pg_namespace WHERE nspname = 'lab'")).rows).toHaveLength(0);
    expect((await runSandboxed(db, 'SELECT count(*) FROM shipments')).rows.length).toBe(1);
    await ensureSchema(db, 'lab'); // a later try still works
    expect(await count(db, 'stores')).toBe(5);
  });
});
