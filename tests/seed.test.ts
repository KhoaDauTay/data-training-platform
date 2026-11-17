import { describe, expect, it } from 'vitest';
import { freshDb, seededDb } from './helpers';

const TABLES = ['ports', 'carriers', 'employees', 'customers', 'shipments', 'containers'];
/** Plan 2 (chapters 4–6), appended after TABLES; their blocks come after every older block in seed.sql. */
const PLAN2 = ['shipment_events', 'trucking_orders', 'cfs_receipts', 'hs_codes', 'duties_taxes', 'customs_declarations', 'incoterms'];
const hashOf = (t: string) => `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS h FROM ${t} x`;

const db = seededDb;
async function one<T>(sql: string): Promise<T> {
  return (await (await db()).query<T>(sql)).rows[0];
}

describe('seed', () => {
  it('tất định: hai lần seed cho cùng dữ liệu', async () => {
    const [a, b] = await Promise.all([freshDb(), freshDb()]);
    for (const t of [...TABLES, ...PLAN2]) {
      const ha = (await a.query<{ h: string }>(hashOf(t))).rows[0].h;
      const hb = (await b.query<{ h: string }>(hashOf(t))).rows[0].h;
      expect(ha, t).toBe(hb);
    }
  });

  // Appending blocks must never re-roll older tables: these hashes were taken before Plan 2 (HEAD 646d9e0) and after it.
  it('bảng cũ giữ nguyên từng byte khi thêm khối seed mới', async () => {
    const before: Record<string, string> = {
      ports: 'ec1c84dddcf5646f1e3b5fc1d57f69f7',
      carriers: '2f8f365a6e8494e6e9d7131f01caa183',
      employees: 'b4d52d87c1e60bea9d7e993a622c5487',
      customers: 'd8c05c7b97d841c1090ec122fdf6093a',
      shipments: '84be2f8c5de722f32edc58ac7f347a46',
      containers: 'd8edef4637ee3684f04f1112b74fb304',
    };
    for (const t of TABLES) expect((await one<{ h: string }>(hashOf(t))).h, t).toBe(before[t]);
  });

  it('quy mô đúng', async () => {
    expect((await one<{ n: number }>('SELECT count(*) AS n FROM shipments')).n).toBe(20000);
    expect((await one<{ n: number }>('SELECT count(*) AS n FROM customers')).n).toBe(200);
    expect((await one<{ n: number }>('SELECT count(*) AS n FROM containers')).n).toBeGreaterThan(20000);
  });

  it('không có ngày thực tế sau "hôm nay" 2026-10-31', async () => {
    const r = await one<{ n: number }>(`SELECT count(*) AS n FROM shipments WHERE atd > '2026-10-31' OR ata > '2026-10-31' OR booking_date > '2026-10-31'`);
    expect(r.n).toBe(0);
    const later = await one<{ n: number }>(`SELECT
      (SELECT count(*) FROM shipment_events WHERE event_date > '2026-10-31') + (SELECT count(*) FROM trucking_orders WHERE order_date > '2026-10-31')
      + (SELECT count(*) FROM cfs_receipts WHERE received_date > '2026-10-31')
      + (SELECT count(*) FROM customs_declarations WHERE submitted_date > '2026-10-31' OR cleared_date > '2026-10-31') AS n`);
    expect(later.n).toBe(0);
  });

  it('Plan 2: quy mô và khớp với lô hàng', async () => {
    expect((await one<{ n: number }>('SELECT count(*) AS n FROM shipment_events')).n).toBeGreaterThan(9000);
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM shipment_events e JOIN shipments s ON s.id = e.shipment_id
      WHERE (e.event = 'DEPARTED' AND e.event_date <> s.atd) OR (e.event = 'ARRIVED' AND e.event_date <> s.ata)
         OR (e.event = 'DELIVERED' AND (s.status <> 'DELIVERED' OR e.event_date < s.ata))`)).n).toBe(0);
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM customs_declarations WHERE cleared_date < submitted_date`)).n).toBe(0);
    expect((await one<{ n: number }>('SELECT count(*) AS n FROM incoterms')).n).toBe(11);
  });

  it('móc Plan 2: lô nhập đường biển đã cập hơn 3 ngày chưa có lệnh xe (ch4-03)', async () => {
    const r = await one<{ n: number }>(`SELECT count(*) AS n FROM shipments s LEFT JOIN trucking_orders t ON t.shipment_id = s.id
      WHERE s.direction = 'IMPORT' AND s.mode = 'SEA' AND DATE '2026-10-31' - s.ata > 3 AND t.id IS NULL`);
    expect(r.n).toBeGreaterThanOrEqual(5);
  });

  it('móc Plan 2: kho CFS có phiếu mọi ngày 26–31/10/2026, mô tả hàng viết hoa thường lẫn lộn (ch4-05, ch6-02)', async () => {
    expect((await one<{ n: number }>(`SELECT count(DISTINCT received_date) AS n FROM cfs_receipts WHERE received_date BETWEEN '2026-10-26' AND '2026-10-31'`)).n).toBe(6);
    const c = await one<{ i: number; l: number }>(`SELECT count(*) FILTER (WHERE cargo_desc ILIKE '%frozen%') AS i,
      count(*) FILTER (WHERE cargo_desc LIKE '%frozen%') AS l FROM cfs_receipts`);
    expect(c.i).toBeGreaterThan(c.l);
    expect(c.l).toBeGreaterThan(0);
  });

  it('móc Plan 2: 3 mã HS chưa có thuế suất (ch5-03)', async () => {
    const r = await db().then((d) => d.query<{ code: string }>(`SELECT h.code FROM hs_codes h LEFT JOIN duties_taxes t ON t.hs_code = h.code WHERE t.hs_code IS NULL ORDER BY 1`));
    expect(r.rows.map((x) => x.code)).toEqual(['100640', '392690', '851712']);
  });

  it('móc Plan 2: tờ khai hủy rồi khai lại, có chuỗi sửa 2 cấp, chỉ ở tờ khai xuất (ch5-04, ch5-06)', async () => {
    const r = await one<{ one: number; two: number; imports: number; replacedCleared: number }>(`SELECT
      count(*) FILTER (WHERE a2.id IS NULL) AS one, count(*) FILTER (WHERE a2.id IS NOT NULL) AS two,
      count(*) FILTER (WHERE s.direction = 'IMPORT') AS imports, count(*) FILTER (WHERE o.cleared_date IS NOT NULL) AS "replacedCleared"
      FROM customs_declarations o
      JOIN customs_declarations a1 ON a1.amended_from_id = o.id
      LEFT JOIN customs_declarations a2 ON a2.amended_from_id = a1.id
      JOIN shipments s ON s.id = o.shipment_id
      WHERE o.amended_from_id IS NULL`);
    expect(r.one).toBeGreaterThan(50);
    expect(r.two).toBeGreaterThan(20);
    expect(r.imports).toBe(0);
    expect(r.replacedCleared).toBe(0);
  });

  it('móc Plan 2: lô nhập cập cảng hơn 5 ngày, tờ khai chưa thông quan (ch5-05)', async () => {
    const r = await one<{ n: number }>(`SELECT count(*) AS n FROM shipments s JOIN customs_declarations d ON d.shipment_id = s.id
      WHERE s.direction = 'IMPORT' AND DATE '2026-10-31' - s.ata > 5 AND d.cleared_date IS NULL`);
    expect(r.n).toBeGreaterThanOrEqual(5);
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
