import { describe, expect, it } from 'vitest';
import { freshDb, seededDb } from './helpers';

const TABLES = ['ports', 'carriers', 'employees', 'customers', 'shipments', 'containers'];
/** Plan 2 (chapters 4–6), appended after TABLES; their blocks come after every older block in seed.sql. */
const PLAN2 = ['shipment_events', 'trucking_orders', 'cfs_receipts', 'hs_codes', 'duties_taxes', 'customs_declarations', 'incoterms'];
/** Plan 3 (chapters 7–9), appended after PLAN2. */
const PLAN3 = ['exchange_rates', 'rate_contracts', 'quotations', 'invoices', 'payments', 'vendor_bills', 'master_bills', 'house_bills'];
/** Plan 4 (chapters 10–12), appended after PLAN3. */
const PLAN4 = ['free_time_terms', 'container_events', 'claims'];
const hashOf = (t: string) => `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS h FROM ${t} x`;

const db = seededDb;
async function one<T>(sql: string): Promise<T> {
  return (await (await db()).query<T>(sql)).rows[0];
}

describe('seed', () => {
  it('tất định: hai lần seed cho cùng dữ liệu', async () => {
    const [a, b] = await Promise.all([freshDb(), freshDb()]);
    for (const t of [...TABLES, ...PLAN2, ...PLAN3, ...PLAN4]) {
      const ha = (await a.query<{ h: string }>(hashOf(t))).rows[0].h;
      const hb = (await b.query<{ h: string }>(hashOf(t))).rows[0].h;
      expect(ha, t).toBe(hb);
    }
  });

  // Appending blocks must never re-roll older tables: ch1–3 hashes taken before Plan 2 (HEAD 646d9e0), Plan 2 hashes before Plan 3 (HEAD fd96e31),
  // Plan 3 hashes before Plan 4 (HEAD 2ddc893). The chapter 11 indexes and ANALYZE change plans, never rows.
  it('bảng cũ giữ nguyên từng byte khi thêm khối seed mới', async () => {
    const before: Record<string, string> = {
      ports: 'ec1c84dddcf5646f1e3b5fc1d57f69f7',
      carriers: '2f8f365a6e8494e6e9d7131f01caa183',
      employees: 'b4d52d87c1e60bea9d7e993a622c5487',
      customers: 'd8c05c7b97d841c1090ec122fdf6093a',
      shipments: '84be2f8c5de722f32edc58ac7f347a46',
      containers: 'd8edef4637ee3684f04f1112b74fb304',
      shipment_events: '84ebea93ebceb917a385efe57a09cab0',
      trucking_orders: '6097a8edda39c70b4f63e7f2bc9d7d03',
      cfs_receipts: '115cc55bc341566156f3ab839427a523',
      hs_codes: '893dcf20280cd8edac2936ef47d05d56',
      duties_taxes: '822e41e4aa914801d2872e4bb98f7ef5',
      customs_declarations: 'a3efef8f8caa18df6203dc5a7f21812c',
      incoterms: 'f25ab8a8b131594e64bbb55b131e0134',
      exchange_rates: '139f40a81f709388c1a50e14231c7601',
      rate_contracts: '8f9893abee3531cc1d18e5a981af0201',
      quotations: 'fe3c52d3047a84aeb9796c9347ec7615',
      invoices: 'e44cc2eb4dc468236fd3249728f1461f',
      payments: '02f630083dfd442e82ab62550e9457c8',
      vendor_bills: 'fc1cae4b377366523d6e3ad01c464712',
      master_bills: '718148ac3166c207d4c6925bf3097411',
      house_bills: '97308ee315ed7ddab557e0ce7302725e',
    };
    for (const t of [...TABLES, ...PLAN2, ...PLAN3]) expect((await one<{ h: string }>(hashOf(t))).h, t).toBe(before[t]);
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

  it('Plan 3: không có ngày sau 2026-10-31; tỷ giá chỉ có vào ngày làm việc', async () => {
    const later = await one<{ n: number }>(`SELECT
      (SELECT count(*) FROM exchange_rates WHERE rate_date > '2026-10-31') + (SELECT count(*) FROM quotations WHERE quote_date > '2026-10-31')
      + (SELECT count(*) FROM invoices WHERE issue_date > '2026-10-31') + (SELECT count(*) FROM payments WHERE pay_date > '2026-10-31')
      + (SELECT count(*) FROM vendor_bills WHERE bill_date > '2026-10-31') + (SELECT count(*) FROM master_bills WHERE issue_date > '2026-10-31')
      + (SELECT count(*) FROM house_bills WHERE issue_date > '2026-10-31') AS n`);
    expect(later.n).toBe(0);
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM exchange_rates
      WHERE extract(isodow FROM rate_date) > 5 OR rate_date IN ('2026-04-27', '2026-04-30', '2026-05-01', '2026-09-01', '2026-09-02')`)).n).toBe(0);
    // ch8-04: every bill has a rate on or before its date
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM vendor_bills b
      WHERE NOT EXISTS (SELECT 1 FROM exchange_rates r WHERE r.currency = b.currency AND r.rate_date <= b.bill_date)`)).n).toBe(0);
  });

  it('móc Plan 3: đúng một hợp đồng cước hiệu lực cho mỗi báo giá; tuyến châu Âu tăng giá từ 15/07/2026 (ch7-04, ch7-06)', async () => {
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM quotations q
      WHERE (SELECT count(*) FROM rate_contracts r WHERE r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type
             AND q.quote_date BETWEEN r.valid_from AND r.valid_to) <> 1`)).n).toBe(0);
    const below = await one<{ q2: number; q3eu: number; q3other: number; oct: number }>(`SELECT
      count(*) FILTER (WHERE q.quote_date < '2026-07-01') AS q2,
      count(*) FILTER (WHERE q.quote_date >= '2026-07-01' AND q.quote_date < '2026-10-01' AND q.pod IN ('NLRTM', 'DEHAM', 'BEANR')) AS q3eu,
      count(*) FILTER (WHERE q.quote_date >= '2026-07-01' AND q.quote_date < '2026-10-01' AND q.pod NOT IN ('NLRTM', 'DEHAM', 'BEANR')) AS q3other,
      count(*) FILTER (WHERE q.quote_date >= '2026-10-01') AS oct
      FROM quotations q JOIN rate_contracts r ON r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type
        AND q.quote_date BETWEEN r.valid_from AND r.valid_to
      WHERE q.sell_usd < r.buy_usd`);
    expect(below.q3eu).toBeGreaterThan(100);
    expect(below.q3other).toBeGreaterThan(0);
    expect(below.q3other).toBeLessThan(below.q3eu / 5);
    expect(below.q2).toBeGreaterThan(0);
    expect(below.oct).toBeGreaterThan(0);
  });

  it('móc Plan 3: báo giá không thành booking, cả cho khách 171-190 đã ngừng gửi hàng (ch7-03)', async () => {
    const r = await one<{ lost: number; churned: number }>(`SELECT count(*) AS lost,
      count(*) FILTER (WHERE customer_id BETWEEN 171 AND 190 AND quote_date >= '2026-07-01' AND quote_date < '2026-10-01') AS churned
      FROM quotations WHERE shipment_id IS NULL`);
    expect(r.lost).toBe(900);
    expect(r.churned).toBeGreaterThan(10);
  });

  it('móc Plan 3: hóa đơn trả nhiều lần, nợ quá hạn ở đủ 4 nhóm tuổi nợ (ch8-01, ch8-03)', async () => {
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM (SELECT invoice_id FROM payments GROUP BY invoice_id HAVING count(*) >= 2) x`)).n)
      .toBeGreaterThan(100);
    const r = await db().then((d) => d.query<{ b: number }>(`WITH paid AS (SELECT invoice_id, SUM(amount_vnd) AS paid FROM payments GROUP BY invoice_id)
      SELECT DISTINCT CASE WHEN DATE '2026-10-31' - i.due_date <= 30 THEN 1 WHEN DATE '2026-10-31' - i.due_date <= 60 THEN 2
                           WHEN DATE '2026-10-31' - i.due_date <= 90 THEN 3 ELSE 4 END AS b
      FROM invoices i LEFT JOIN paid p ON p.invoice_id = i.id
      WHERE i.due_date < '2026-10-31' AND i.amount_vnd - COALESCE(p.paid, 0) > 0 ORDER BY 1`));
    expect(r.rows.map((x) => x.b)).toEqual([1, 2, 3, 4]);
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM invoices i
      JOIN (SELECT invoice_id, SUM(amount_vnd) AS paid FROM payments GROUP BY invoice_id) p ON p.invoice_id = i.id WHERE p.paid > i.amount_vnd`)).n).toBe(0);
  });

  it('móc Plan 3: hóa đơn nhà cung cấp vào ngày nghỉ ở mọi tuần của ch8-04; lô hủy vẫn có hóa đơn (ch8-05)', async () => {
    const r = await db().then((d) => d.query<{ w: string; n: number }>(`SELECT w, count(*) AS n FROM vendor_bills b,
      LATERAL (SELECT CASE WHEN b.bill_date BETWEEN '2026-10-19' AND '2026-10-25' THEN 'oct' WHEN b.bill_date BETWEEN '2026-08-31' AND '2026-09-06' THEN 'sep'
                           WHEN b.bill_date BETWEEN '2026-04-27' AND '2026-05-03' THEN 'apr' END AS w) x
      WHERE w IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exchange_rates r WHERE r.currency = b.currency AND r.rate_date = b.bill_date)
      GROUP BY w ORDER BY w`));
    expect(r.rows.map((x) => x.w)).toEqual(['apr', 'oct', 'sep']);
    for (const x of r.rows) expect(x.n).toBeGreaterThan(20);
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM vendor_bills b JOIN shipments s ON s.id = b.shipment_id
      WHERE s.status = 'CANCELLED' AND b.bill_date >= '2026-10-01'`)).n).toBeGreaterThan(3);
  });

  it('móc Plan 3: lô đã giao chưa xuất hóa đơn, vận đơn chủ lệch trọng lượng, HBL phát hành muộn (ch9)', async () => {
    const months = await db().then((d) => d.query<{ m: string; n: number }>(`SELECT to_char(e.event_date, 'MM') AS m, count(*) AS n
      FROM shipment_events e LEFT JOIN invoices i ON i.shipment_id = e.shipment_id
      WHERE e.event = 'DELIVERED' AND e.event_date >= '2026-08-01' AND i.id IS NULL GROUP BY 1 ORDER BY 1`));
    expect(months.rows.map((x) => x.m)).toEqual(['08', '09', '10']);
    for (const x of months.rows) expect(x.n).toBeGreaterThan(10);
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM master_bills m
      JOIN (SELECT master_bill_id, SUM(gross_weight_kg) AS kg FROM house_bills GROUP BY master_bill_id) h ON h.master_bill_id = m.id
      WHERE m.issue_date >= '2026-07-01' AND m.issue_date < '2026-10-01' AND abs(h.kg - m.gross_weight_kg) > m.gross_weight_kg * 0.01`)).n)
      .toBeGreaterThan(20);
    // ch9-04: in every variant month, rows that exist only in the booking book and only in the documents book
    for (const [from, to] of [['2026-10-01', '2026-11-01'], ['2026-08-01', '2026-09-01'], ['2026-06-01', '2026-07-01']]) {
      const r = await one<{ booked: number; issued: number }>(`SELECT
        (SELECT count(*) FROM shipments s WHERE s.direction = 'EXPORT' AND s.mode = 'SEA' AND s.atd >= '${from}' AND s.atd < '${to}'
           AND NOT EXISTS (SELECT 1 FROM house_bills h WHERE h.shipment_id = s.id AND h.issue_date >= '${from}' AND h.issue_date < '${to}')) AS booked,
        (SELECT count(*) FROM house_bills h JOIN shipments s ON s.id = h.shipment_id
          WHERE h.issue_date >= '${from}' AND h.issue_date < '${to}' AND NOT (s.atd >= '${from}' AND s.atd < '${to}')) AS issued`);
      expect(r.booked, from).toBeGreaterThan(5);
      expect(r.issued, from).toBeGreaterThan(5);
    }
  });

  // The Q3 margin story pays off in ch12 (curriculum §4 ch12): Plan 4 appends to these tables but must not break this.
  it('móc ch12: biên lợi nhuận gộp tuyến châu Âu giảm mạnh nhất từ quý 2 sang quý 3/2026', async () => {
    const r = await db().then((d) => d.query<{ region: string; q2: number; q3: number }>(`WITH rate AS (
        SELECT DISTINCT ON (b.id) b.shipment_id, b.amount * r.vnd_per_unit AS vnd FROM vendor_bills b
        JOIN exchange_rates r ON r.currency = b.currency AND r.rate_date <= b.bill_date ORDER BY b.id, r.rate_date DESC
      ), cost AS (SELECT shipment_id, SUM(vnd) AS cost FROM rate GROUP BY shipment_id),
      rev AS (SELECT shipment_id, SUM(amount_vnd) AS rev FROM invoices GROUP BY shipment_id),
      m AS (SELECT p.region, date_trunc('quarter', s.booking_date) AS q, 100 * (SUM(rev.rev) - SUM(cost.cost)) / SUM(rev.rev) AS margin
        FROM shipments s JOIN rev ON rev.shipment_id = s.id JOIN cost ON cost.shipment_id = s.id
        JOIN ports p ON p.code = CASE WHEN s.direction = 'EXPORT' THEN s.pod ELSE s.pol END
        WHERE s.booking_date >= '2026-04-01' AND s.booking_date < '2026-10-01' GROUP BY 1, 2)
      SELECT region, max(margin) FILTER (WHERE q = '2026-04-01') AS q2, max(margin) FILTER (WHERE q = '2026-07-01') AS q3 FROM m GROUP BY region`));
    const drop = Object.fromEntries(r.rows.map((x) => [x.region, Number(x.q2) - Number(x.q3)]));
    expect(drop.Europe).toBeGreaterThan(8);
    for (const [region, d] of Object.entries(drop)) if (region !== 'Europe') expect(d, region).toBeLessThan(3);
  });

  it('Plan 4: container_events 100k–150k dòng, không trùng thời điểm trong một container, không có gì sau 2026-10-31', async () => {
    // ≥ 100k so the index lab shows a real difference; < 150k because the seed's ANALYZE (statistics target 500) reads every row.
    const n = (await one<{ n: number }>('SELECT count(*)::int AS n FROM container_events')).n;
    expect(n).toBeGreaterThan(100_000);
    expect(n).toBeLessThan(150_000);
    expect((await one<{ n: number }>(`SELECT count(*)::int AS n FROM (SELECT container_id, event_time FROM container_events
      GROUP BY 1, 2 HAVING count(*) > 1) x`)).n).toBe(0); // ROW_NUMBER over event_time never meets a tie (ch10-03)
    expect((await one<{ n: number }>(`SELECT (SELECT count(*) FROM container_events WHERE event_time >= '2026-11-01')
      + (SELECT count(*) FROM claims WHERE claim_date > '2026-10-31') AS n`)).n).toBe(0);
    // every events row has a valid container, and events of one container follow the journey order
    expect((await one<{ n: number }>(`SELECT count(*)::int AS n FROM (SELECT e.container_id, e.event,
      lag(e.event) OVER (PARTITION BY e.container_id ORDER BY e.event_time) AS prev FROM container_events e) x
      WHERE (event, prev) NOT IN (('GATE_IN_FULL', 'GATE_OUT_EMPTY'), ('LOADED', 'GATE_IN_FULL'), ('DISCHARGED', 'LOADED'),
        ('GATE_OUT_FULL', 'DISCHARGED'), ('EMPTY_RETURNED', 'GATE_OUT_FULL')) AND prev IS NOT NULL`)).n).toBe(0);
    expect((await one<{ n: number }>(`SELECT count(*)::int AS n FROM pg_indexes WHERE tablename = 'container_events' AND indexdef ILIKE '%container_id%'`)).n).toBe(0);
  });

  it('móc Plan 4: khách 1 vượt D&D từ quý 3/2026; container kẹt ngày 31/10/2026 (ch10-03, ch10-04, ch12-03)', async () => {
    const over = await db().then((d) => d.query<{ q: string; c1: number; others: number }>(`WITH t AS (SELECT container_id,
        max(event_time) FILTER (WHERE event = 'DISCHARGED') AS dis, max(event_time) FILTER (WHERE event = 'EMPTY_RETURNED') AS ret
        FROM container_events GROUP BY 1),
      o AS (SELECT s.customer_id, to_char(t.ret, 'YYYY-Q') AS q, greatest(0, t.ret::date - t.dis::date - f.free_days) AS over
        FROM t JOIN containers c ON c.id = t.container_id JOIN shipments s ON s.id = c.shipment_id
        JOIN free_time_terms f ON f.customer_id = s.customer_id AND t.dis::date BETWEEN f.valid_from AND f.valid_to
        WHERE s.direction = 'IMPORT' AND t.ret IS NOT NULL)
      SELECT q, (sum(over) FILTER (WHERE customer_id = 1))::int AS c1, (sum(over) FILTER (WHERE customer_id <> 1))::int AS others
      FROM o WHERE q IN ('2026-2', '2026-3') GROUP BY q ORDER BY q`));
    const [q2, q3] = over.rows;
    expect(q2.c1).toBe(0);
    expect(q3.c1).toBeGreaterThan(q3.others); // the jump comes from customer 1 alone
    expect(Math.abs(q3.others - q2.others)).toBeLessThan(q2.others * 0.3);
    const stuck = await one<{ n5: number; n10: number }>(`WITH l AS (SELECT DISTINCT ON (container_id) container_id, event, event_time
        FROM container_events ORDER BY container_id, event_time DESC)
      SELECT count(*) FILTER (WHERE DATE '2026-10-31' - event_time::date > 5)::int AS n5,
             count(*) FILTER (WHERE DATE '2026-10-31' - event_time::date > 10)::int AS n10
      FROM l WHERE event NOT IN ('LOADED', 'EMPTY_RETURNED')`);
    expect(stuck.n5).toBeGreaterThan(stuck.n10);
    expect(stuck.n10).toBeGreaterThan(5);
    // free time: one row per customer and period, rate +20% from 2026-07-01, free days unchanged
    expect((await one<{ n: number }>(`SELECT count(*)::int AS n FROM free_time_terms a JOIN free_time_terms b
      ON b.customer_id = a.customer_id AND b.valid_from = '2026-07-01' WHERE a.valid_to = '2026-06-30'
      AND b.free_days = a.free_days AND b.usd_per_day = round(a.usd_per_day * 1.2, 2)`)).n).toBe(200);
  });

  it('móc Plan 4: Blue Anchor Lines có tỷ lệ claim năm 2026 gấp hơn 2 lần mọi hãng khác (ch12-04, ch12-06)', async () => {
    const r = await db().then((d) => d.query<{ id: number; rate: number }>(`SELECT s.carrier_id AS id,
        (count(c.id) * 100.0 / count(DISTINCT s.id))::float AS rate
      FROM shipments s LEFT JOIN claims c ON c.shipment_id = s.id
      WHERE s.ata >= '2026-01-01' AND s.ata < '2026-10-01' GROUP BY 1`));
    const bal = r.rows.find((x) => x.id === 3)!.rate;
    for (const x of r.rows.filter((x) => x.id !== 3)) expect(bal, String(x.id)).toBeGreaterThan(2 * x.rate);
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
