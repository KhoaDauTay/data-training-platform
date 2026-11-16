import { describe, expect, it } from 'vitest';
import { importCsv } from '../src/db/import';
import { runExplain, runSandboxed } from '../src/db/run';
import { sanitizeIdent } from '../src/import/csv';
import { chartSpec } from '../src/viz/chart';
import { erDefinition, loadErMetadata } from '../src/viz/erd';
import { flattenPlan } from '../src/viz/plan';
import { runSteps } from '../src/viz/steps';
import { seededDb } from './helpers';

const LINES = ['ref,customer,eta,teu'];
for (let i = 1; i <= 300; i++) LINES.push(`R${i},KH ${i % 7},2026-${String((i % 12) + 1).padStart(2, '0')}-01,${i % 4}`);
const FILE = new Blob([LINES.join('\n') + '\n']);

let loaded: ReturnType<typeof seededDb> | undefined;
/** One seeded DB per file with my_orders imported once (Vitest runs a file's tests in order). */
function db() {
  loaded ??= seededDb().then(async (pg) => {
    await importCsv(pg, { table: 'my_orders', columns: ['ref', 'customer', 'eta', 'teu'], delimiter: ',' }, FILE);
    return pg;
  });
  return loaded;
}

describe('tính năng trực quan trên bảng ở schema sandbox (không ghi tên schema trong SQL)', () => {
  it('EXPLAIN: Seq Scan trên my_orders', async () => {
    const { nodes } = flattenPlan(await runExplain(await db(), 'SELECT customer, sum(teu) FROM my_orders GROUP BY customer'));
    expect(nodes.find((n) => n.type === 'Seq Scan')).toMatchObject({ relation: 'my_orders', rows: 300 });
  });

  it('Biểu đồ: OID của cột suy kiểu (text + numeric → cột, date + bigint → đường)', async () => {
    const pg = await db();
    expect(chartSpec(await runSandboxed(pg, 'SELECT customer, sum(teu) FROM my_orders GROUP BY customer ORDER BY 1'))?.kind).toBe('bar');
    expect(chartSpec(await runSandboxed(pg, 'SELECT eta, count(*) FROM my_orders GROUP BY eta ORDER BY 1'))?.kind).toBe('line');
  });

  it('Thứ tự thực thi: số dòng thật từng bước', async () => {
    const r = await runSteps(await db(), 'SELECT customer, count(*) FROM my_orders WHERE teu > 0 GROUP BY customer ORDER BY customer LIMIT 3');
    if (!r.ok) throw new Error(r.reason);
    expect(r.steps.map((s) => [s.key, s.skipped ? 'skip' : s.count])).toEqual([
      ['from', 300], ['where', 225], ['group', 7], ['having', 'skip'], ['select', 7], ['distinct', 'skip'], ['order', 7], ['limit', 3],
    ]);
  });

  it('ERD: hộp bảng của schema sandbox, không có quan hệ', async () => {
    const pg = await db();
    const { cols, cons } = await loadErMetadata((sql) => runSandboxed(pg, sql), 'sandbox');
    const def = erDefinition(cols, cons, ['my_orders'], new Set(['my_orders']));
    expect(def).toContain('my_orders {');
    expect(def).toContain('bigint teu');
    expect(def).toContain('date eta');
    expect(def).not.toContain('--');
  });

  it('ERD (L36): tên cột hợp lệ với Postgres nhưng là từ khóa Mermaid đi qua mermaidName()', async () => {
    const pg = await db();
    const columns = ['Class', 'style', 'end'].map((h) => sanitizeIdent(h, 'x'));
    expect(columns).toEqual(['class', 'style', 'end_']);
    await importCsv(pg, { table: 'tags', columns, delimiter: ',' }, new Blob(['a,b,c\nx,y,z\n']));
    const { cols, cons } = await loadErMetadata((sql) => runSandboxed(pg, sql), 'sandbox');
    const def = erDefinition(cols, cons, ['tags'], new Set());
    expect(def).toContain('text _class');
    expect(def).toContain('text _style');
    expect(def).toContain('text end_');
    expect(def).not.toMatch(/^\s*style /m); // no highlight requested: no style line at all
  });
});
