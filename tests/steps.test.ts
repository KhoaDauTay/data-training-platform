import { describe, expect, it } from 'vitest';
import { buildSteps, runSteps, shownSteps } from '../src/viz/steps';
import { seededDb } from './helpers';

const Q = `SELECT ca.name, SUM(ct.teu) AS teu
FROM containers ct
JOIN shipments s ON s.id = ct.shipment_id
JOIN carriers ca ON ca.id = s.carrier_id
WHERE s.etd >= '2026-07-01' AND s.etd < '2026-10-01' AND s.status <> 'CANCELLED'
GROUP BY ca.name
HAVING SUM(ct.teu) > 900
ORDER BY teu DESC
LIMIT 3`;

describe('runSteps', () => {
  it('số dòng thật qua từng bước (đã đối chiếu bằng spike)', async () => {
    const r = await runSteps(await seededDb(), Q);
    if (!r.ok) throw new Error(r.reason);
    expect(r.steps.map((s) => [s.key, s.skipped ? 'skip' : s.count])).toEqual([
      ['from', 25677], ['where', 3167], ['group', 6], ['having', 5], ['select', 5], ['distinct', 'skip'], ['order', 5], ['limit', 3],
    ]);
    expect(r.steps[1].sample!.rows.length).toBe(5);
    expect(r.steps[2].sample!.columns).toContain('row_count');
  });

  it('tab Thứ tự thực thi chỉ vẽ mệnh đề có dùng (không HAVING, không DISTINCT)', async () => {
    const r = await runSteps(await seededDb(), `SELECT b.currency, count(*), SUM(b.amount)
FROM vendor_bills b
JOIN shipments s ON s.id = b.shipment_id
WHERE s.booking_date >= '2026-09-01' AND s.booking_date < '2026-10-01'
GROUP BY b.currency
ORDER BY b.currency`);
    if (!r.ok) throw new Error(r.reason);
    expect(shownSteps(r.steps).map((s) => s.key)).toEqual(['from', 'where', 'group', 'select', 'order']);
  });

  it('vị trí mệnh đề trong SQL gốc', async () => {
    const r = await buildSteps(Q);
    if (!r.ok) throw new Error(r.reason);
    const text = (k: keyof typeof r.ranges) => Q.slice(...r.ranges[k]!).trim();
    expect(text('where')).toMatch(/^WHERE s\.etd/);
    expect(text('from')).toMatch(/^FROM containers ct\s+JOIN shipments/);
    expect(text('group')).toBe('GROUP BY ca.name');
    expect(text('limit')).toBe('LIMIT 3');
  });

  it('chữ FROM trong chuỗi và trong truy vấn con không bị nhầm là mệnh đề', async () => {
    const head = "SELECT (SELECT max(p.name) FROM ports p WHERE p.code = s.pod), 'from' ";
    const r = await buildSteps(`${head}FROM shipments s WHERE status = 'from'`);
    if (!r.ok) throw new Error(r.reason);
    expect(r.ranges.from![0]).toBe(head.length);
  });

  it('GROUP BY số thứ tự và alias được quy về biểu thức', async () => {
    const db = await seededDb();
    for (const q of ['SELECT mode, count(*) FROM shipments GROUP BY 1', 'SELECT mode AS m, count(*) FROM shipments GROUP BY m']) {
      const r = await runSteps(db, q);
      if (!r.ok) throw new Error(r.reason);
      expect(r.steps.find((s) => s.key === 'group')!.count, q).toBe(2);
    }
  });

  it('không có FROM, không có GROUP BY', async () => {
    const r = await runSteps(await seededDb(), 'SELECT count(*) FROM ports');
    if (!r.ok) throw new Error(r.reason);
    expect(r.steps.filter((s) => !s.skipped).map((s) => s.key)).toEqual(['from', 'select']);
    const one = await runSteps(await seededDb(), 'SELECT 1');
    if (!one.ok) throw new Error(one.reason);
    expect(one.steps.filter((s) => !s.skipped).map((s) => s.key)).toEqual(['select']);
  });

  it('trả mã lý do (không phải chữ) thay vì throw', async () => {
    const cases: [string, string][] = [
      ['WITH x AS (SELECT 1) SELECT * FROM x', 'withUnion'],
      ['SELECT 1 UNION SELECT 2', 'withUnion'],
      ['SELECT id, rank() OVER (ORDER BY id) FROM ports', 'window'],
      ['SELEC 1', 'syntax'],
      ["UPDATE ports SET name = 'x'", 'notSelect'],
      ['SELECT 1; SELECT 2', 'multi'],
    ];
    for (const [q, reason] of cases) {
      const r = await buildSteps(q);
      expect(r.ok, q).toBe(false);
      if (!r.ok) expect(r.reason, q).toBe(reason);
    }
  });

  it('chữ "over" trong chuỗi hay tên cột không phải window; OVER trong ORDER BY thì là', async () => {
    expect((await buildSteps("SELECT 'over' AS over FROM ports")).ok).toBe(true);
    const r = await buildSteps('SELECT code FROM ports ORDER BY row_number() OVER (ORDER BY code)');
    expect(r.ok ? 'ok' : r.reason).toBe('window');
  });
});
