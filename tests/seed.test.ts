import { describe, expect, it } from 'vitest';
import { freshDb, seededDb } from './helpers';

const TABLES = ['ports', 'carriers', 'employees', 'customers', 'shipments', 'containers'];

async function one<T>(sql: string): Promise<T> {
  const db = await seededDb();
  return (await db.query<T>(sql)).rows[0];
}

describe('seed', () => {
  it('tất định: hai lần seed cho cùng dữ liệu', async () => {
    const [a, b] = await Promise.all([freshDb(), freshDb()]);
    for (const t of TABLES) {
      const q = `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS h FROM ${t} x`;
      const ha = (await a.query<{ h: string }>(q)).rows[0].h;
      const hb = (await b.query<{ h: string }>(q)).rows[0].h;
      expect(ha, t).toBe(hb);
    }
  });

  it('quy mô đúng', async () => {
    expect((await one<{ n: number }>('SELECT count(*) AS n FROM shipments')).n).toBe(20000);
    expect((await one<{ n: number }>('SELECT count(*) AS n FROM customers')).n).toBe(200);
    expect((await one<{ n: number }>('SELECT count(*) AS n FROM containers')).n).toBeGreaterThan(20000);
  });

  it('không có ngày thực tế sau "hôm nay" 2026-10-31', async () => {
    const r = await one<{ n: number }>(`SELECT count(*) AS n FROM shipments WHERE atd > '2026-10-31' OR ata > '2026-10-31' OR booking_date > '2026-10-31'`);
    expect(r.n).toBe(0);
  });

  it('móc câu chuyện: khách 171-190 ngừng book từ 2026-03-01', async () => {
    const after = await one<{ n: number }>(`SELECT count(*) AS n FROM shipments WHERE customer_id BETWEEN 171 AND 190 AND booking_date >= '2026-03-01'`);
    const before = await one<{ n: number }>(`SELECT count(DISTINCT customer_id) AS n FROM shipments WHERE customer_id BETWEEN 171 AND 190 AND booking_date < '2026-03-01'`);
    expect(after.n).toBe(0);
    expect(before.n).toBe(20);
  });

  it('móc câu chuyện: khách 191-200 là bản trùng của 1-10 và có lô hàng', async () => {
    const r = await one<{ n: number }>(`SELECT count(*) AS n FROM customers WHERE id > 190 AND name LIKE '% Co., Ltd'`);
    const s = await one<{ n: number }>(`SELECT count(*) AS n FROM shipments WHERE customer_id > 190`);
    expect(r.n).toBe(10);
    expect(s.n).toBeGreaterThan(0);
  });

  it('móc câu chuyện: có lô AIR ghi FOB; khách 1 lớn nhất', async () => {
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM shipments WHERE mode = 'AIR' AND incoterm = 'FOB'`)).n).toBeGreaterThan(0);
    const top = await one<{ customer_id: number }>(`SELECT customer_id FROM shipments GROUP BY customer_id ORDER BY count(*) DESC LIMIT 1`);
    expect(top.customer_id).toBe(1);
  });
});
