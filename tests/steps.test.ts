import { describe, expect, it } from 'vitest';
import { loadDomain, loadTickets } from '../src/content';
import { ensureSchema } from '../src/db/lab';
import type { SchemaId } from '../src/domains';
import { buildSteps, runSteps } from '../src/viz/steps';
import { shownSteps } from '../src/viz/stepText';
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
      ['from', 25677], ['join', 25677], ['join', 25677], ['where', 3167], ['group', 6], ['having', 5], ['select', 5], ['distinct', 'skip'], ['order', 5], ['limit', 3],
    ]);
    expect(r.steps[3].sample!.rows.length).toBe(5);
    expect(r.steps[4].sample!.columns).toContain('row_count');
  });

  it('tab Thứ tự thực thi chỉ vẽ mệnh đề có dùng (không HAVING, không DISTINCT)', async () => {
    const r = await runSteps(await seededDb(), `SELECT b.currency, count(*), SUM(b.amount)
FROM vendor_bills b
JOIN shipments s ON s.id = b.shipment_id
WHERE s.booking_date >= '2026-09-01' AND s.booking_date < '2026-10-01'
GROUP BY b.currency
ORDER BY b.currency`);
    if (!r.ok) throw new Error(r.reason);
    expect(shownSteps(r.steps).map((s) => s.key)).toEqual(['from', 'join', 'where', 'group', 'select', 'order']);
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

// v10 Track A (L155): FROM and each JOIN are their own steps; JOIN steps carry key pairs, GROUP BY carries real group sizes.
describe('runSteps: JOIN và GROUP BY cho phim (v10 N1/N2)', () => {
  const lab = async () => {
    const db = await seededDb();
    await ensureSchema(db, 'lab');
    return db;
  };

  it('mỗi JOIN một bước, nhãn và vị trí lấy từ SQL của người chơi', async () => {
    const r = await runSteps(await seededDb(), Q);
    if (!r.ok) throw new Error(r.reason);
    const at = (s: { range?: [number, number] }) => Q.slice(...s.range!);
    const [from, j1, j2] = r.steps;
    expect([from.label, j1.label, j2.label]).toEqual(['FROM', 'JOIN', 'JOIN']);
    expect(at(from)).toBe('FROM containers ct');
    expect(at(j1)).toBe('JOIN shipments s ON s.id = ct.shipment_id');
    expect(at(j2)).toBe('JOIN carriers ca ON ca.id = s.carrier_id');
    expect(j1.match).toMatchObject({ kind: 'inner', left: 'ct.shipment_id', right: 's.id' });
    for (const p of j1.match!.pairs.filter((x) => x.r !== null)) expect(p.l).toBe(p.r);
  });

  it('LEFT JOIN có ít nhất một hàng không cặp (∅); INNER JOIN đánh dấu hàng bị loại, cùng dữ liệu', async () => {
    const db = await lab();
    const left = await runSteps(db, 'SELECT o.id, c.name FROM orders o LEFT OUTER JOIN customers c ON c.id = o.customer_id', { schema: 'lab' });
    if (!left.ok) throw new Error(left.reason);
    const lj = left.steps.find((s) => s.key === 'join')!;
    expect(lj.label).toBe('LEFT OUTER JOIN');
    expect(lj.match!.kind).toBe('left');
    expect(lj.match!.pairs.some((p) => p.r === null)).toBe(true);
    expect(lj.match!.pairs.length).toBeLessThanOrEqual(8);
    const inner = await runSteps(db, 'SELECT o.id FROM orders o JOIN customers c ON o.customer_id = c.id', { schema: 'lab' });
    if (!inner.ok) throw new Error(inner.reason);
    const ij = inner.steps.find((s) => s.key === 'join')!;
    expect(ij.match).toMatchObject({ kind: 'inner', left: 'o.customer_id', right: 'c.id' });
    expect(ij.count).toBeLessThan(left.steps.find((s) => s.key === 'join')!.count!);
  });

  it('USING, NATURAL, RIGHT JOIN, dấu phẩy: vẫn tách bước hoặc giữ một bước, không có hình ghép, không lỗi', async () => {
    const db = await lab();
    for (const q of [
      'SELECT * FROM orders JOIN stores USING (id)',
      'SELECT * FROM orders o RIGHT JOIN customers c ON c.id = o.customer_id',
      'SELECT * FROM orders o, customers c WHERE c.id = o.customer_id',
      'SELECT * FROM (orders o JOIN customers c ON c.id = o.customer_id) JOIN stores s ON s.id = o.store_id',
      'SELECT * FROM orders o JOIN customers c ON c.id = o.customer_id AND c.city IS NOT NULL',
    ]) {
      const r = await runSteps(db, q, { schema: 'lab' });
      if (!r.ok) throw new Error(`${q}: ${r.reason}`);
      expect(r.steps.every((s) => s.error === undefined && !s.match), q).toBe(true);
    }
    const comma = await runSteps(db, 'SELECT * FROM orders o, customers c WHERE c.id = o.customer_id', { schema: 'lab' });
    if (!comma.ok) throw new Error(comma.reason);
    expect(comma.steps.filter((s) => !s.skipped).map((s) => s.key)).toEqual(['from', 'where', 'select']);
  });

  it('GROUP BY: tối đa 3 nhóm, số dòng mỗi nhóm là số thật', async () => {
    const db = await lab();
    const r = await runSteps(db, 'SELECT channel, status, count(*) FROM orders GROUP BY channel, status', { schema: 'lab' });
    if (!r.ok) throw new Error(r.reason);
    const g = r.steps.find((s) => s.key === 'group')!.groups!;
    expect(g.length).toBe(3);
    for (const { key, n } of g) {
      const [channel, status] = key.split(' · ');
      const real = await runSteps(db, `SELECT id FROM orders WHERE channel = '${channel}' AND status = '${status}'`, { schema: 'lab' });
      if (!real.ok) throw new Error(real.reason);
      expect(real.steps.find((s) => s.key === 'where')!.count, key).toBe(n);
    }
  });

  it('mọi Solution có JOIN của ba domain: không ném lỗi, không bước lỗi', async () => {
    await Promise.all([loadDomain('ecommerce'), loadDomain('finance')]);
    const db = await seededDb();
    await ensureSchema(db, 'ecom');
    await ensureSchema(db, 'fin');
    const domains: [Parameters<typeof loadTickets>[0], SchemaId][] = [['logistics', 'game'], ['ecommerce', 'ecom'], ['finance', 'fin']];
    let slowest = 0;
    let joins = 0;
    for (const [d, schema] of domains) {
      for (const tk of loadTickets(d)) {
        for (const step of tk.steps) {
          if (!/\bJOIN\b/i.test(step.solution)) continue;
          const t0 = performance.now();
          const r = await runSteps(db, step.solution, { schema });
          slowest = Math.max(slowest, performance.now() - t0);
          if (!r.ok) continue; // WITH/UNION/window: the tab says so, as before
          joins += r.steps.filter((s) => s.key === 'join').length;
          for (const s of r.steps) expect(s.error, `${tk.id} ${s.key}`).toBeUndefined();
        }
      }
    }
    expect(joins).toBeGreaterThan(20);
    console.info(`steps: slowest JOIN Solution ${slowest.toFixed(0)} ms (Node)`);
  }, 300_000);
});
