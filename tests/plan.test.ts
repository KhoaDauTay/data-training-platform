import { describe, expect, it } from 'vitest';
import { runExplain } from '../src/db/run';
import { en } from '../src/i18n/en';
import { vi } from '../src/i18n/vi';
import { flattenPlan, isHeavyScan, NODE_HELP, nodeHelpKey } from '../src/viz/plan';
import { seededDb } from './helpers';

const TEU_BY_CARRIER = `SELECT ca.name, SUM(ct.teu) FROM containers ct
  JOIN shipments s ON s.id = ct.shipment_id JOIN carriers ca ON ca.id = s.carrier_id
  WHERE s.etd >= '2026-07-01' AND s.etd < '2026-10-01' AND s.status <> 'CANCELLED' GROUP BY ca.name`;

describe('flattenPlan với EXPLAIN thật', () => {
  it('cây plan có node gốc, Seq Scan containers đọc 25.677 dòng', async () => {
    const db = await seededDb();
    const { nodes, executionMs } = flattenPlan(await runExplain(db, TEU_BY_CARRIER));
    expect(nodes[0].depth).toBe(0);
    expect(nodes[0].parent).toBeNull();
    expect(nodes[0].label).toMatch(/Aggregate/);
    const scan = nodes.find((n) => n.type === 'Seq Scan' && n.relation === 'containers')!;
    expect(scan.rows).toBe(25677);
    expect(isHeavyScan(scan)).toBe(true);
    expect(executionMs).toBeGreaterThan(0);
    expect(nodes.every((n) => n.parent === null || n.parent < n.id)).toBe(true);
  });

  it('EXPLAIN ANALYZE của DML bị rollback', async () => {
    const db = await seededDb();
    await runExplain(db, "UPDATE ports SET name = 'x'");
    expect((await db.query<{ n: number }>("SELECT count(*) AS n FROM ports WHERE name = 'x'")).rows[0].n).toBe(0);
  });

  it('lỗi EXPLAIN là SqlError có SQLSTATE nhưng không có position (bị lệch bởi tiền tố EXPLAIN)', async () => {
    const db = await seededDb();
    await expect(runExplain(db, 'SELECT nope FROM ports')).rejects.toMatchObject({ name: 'SqlError', code: '42703', position: undefined });
  });
});

describe('nhãn và chi tiết node (không chứa chữ đã dịch)', () => {
  it('Aggregate theo strategy, join type, alias, rows × loops, dòng bị lọc', () => {
    const { nodes } = flattenPlan([{
      'Execution Time': 1.5,
      Plan: {
        'Node Type': 'Aggregate', Strategy: 'Hashed', 'Actual Rows': 3, 'Actual Loops': 1, 'Plan Rows': 4, 'Actual Total Time': 1.2, 'Group Key': ['a.x'],
        Plans: [{
          'Node Type': 'Nested Loop', 'Join Type': 'Left', 'Actual Rows': 10, 'Actual Loops': 1, 'Plan Rows': 9, 'Actual Total Time': 1,
          Plans: [
            { 'Node Type': 'Seq Scan', 'Relation Name': 'shipments', Alias: 's', 'Actual Rows': 5, 'Actual Loops': 1, 'Rows Removed by Filter': 20000, Filter: "(status = 'X')", 'Plan Rows': 5, 'Actual Total Time': 0.5 },
            { 'Node Type': 'Index Scan', 'Relation Name': 'customers', Alias: 'customers', 'Index Name': 'customers_pkey', 'Actual Rows': 1, 'Actual Loops': 5, 'Plan Rows': 1, 'Actual Total Time': 0.01 },
          ],
        }],
      },
    }]);
    expect(nodes.map((n) => n.label)).toEqual(['HashAggregate', 'Nested Loop (Left)', 'Seq Scan shipments s', 'Index Scan customers']);
    expect(nodes.map((n) => n.depth)).toEqual([0, 1, 2, 2]);
    expect(nodes[3].rows).toBe(5);
    expect(nodes[2].scanned).toBe(20005);
    expect(isHeavyScan(nodes[2])).toBe(true);
    expect(nodes[2].detail).toContainEqual({ kind: 'filter', text: "(status = 'X')", removed: 20000 });
    expect(nodes[3].detail).toContainEqual({ kind: 'index', text: 'customers_pkey' });
    expect(nodes[0].detail).toContainEqual({ kind: 'groupKey', text: 'a.x' });
  });
});

describe('chú giải node (chữ nằm trong i18n)', () => {
  it('mỗi loại node trỏ tới một key có chữ VI và EN; node lạ dùng câu mặc định', () => {
    expect(nodeHelpKey('Hash Join')).toBe('node.hashJoin');
    expect(vi['node.hashJoin']).toMatch(/băm/);
    expect(en['node.hashJoin']).toMatch(/hash table/);
    expect(nodeHelpKey('Something New')).toBe('node.fallback');
    for (const key of Object.values(NODE_HELP)) expect(vi[key], key).toBeTruthy();
  });
});
