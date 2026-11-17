import { describe, expect, it } from 'vitest';
import { loadTicketTemplates } from '../src/content';
import { runLab, runSandboxed } from '../src/db/run';
import { compareResults } from '../src/grader';
import { checkLab, checkPlan, isCreateIndex, planLine, planNodes } from '../src/planCheck';
import { explainError } from '../src/ui/sqlErrors';
import { applyVariant, variantsOf } from '../src/variants';
import { freshDb, seededDb } from './helpers';

const explain = async (sql: string) => (await runSandboxed(await seededDb(), `EXPLAIN (FORMAT JSON) ${sql}`)).rows[0][0];

/** Every step with plan:/lab:, in every variant. */
const steps = loadTicketTemplates().flatMap((t) => Array.from({ length: Math.max(1, variantsOf(t).length) }, (_, v) => applyVariant(t, v))
  .flatMap((tv, v) => tv.steps.map((s, i) => ({ name: `${t.id}#${v} step ${i + 1}`, id: t.id, v, i, step: s })))
  .filter((x) => x.step.plan || x.step.lab));

/**
 * The slow way each plan: step replaces (same result, whole-table read), so a plan check can never pass by accident.
 * {{…}} filled per variant from the ticket's own variant values.
 */
const SLOW: Record<string, (vars: Record<string, string>) => string> = {
  'ch11-01#0': ({ cust }) => `SELECT s.ref, s.booking_date, count(c.id) FROM shipments s LEFT JOIN containers c ON c.shipment_id = s.id WHERE s.customer_id + 0 = ${cust} GROUP BY s.id, s.ref, s.booking_date ORDER BY s.booking_date DESC, s.ref`,
  'ch11-02#0': ({ w }) => `SELECT s.ref, c.name, s.booking_date FROM shipments s JOIN customers c ON c.id = s.customer_id WHERE date_trunc('week', s.booking_date) = '${w}' ORDER BY s.booking_date, s.ref`,
  'ch11-03#0': ({ typed }) => `SELECT s.ref, c.name, s.status, s.eta FROM shipments s JOIN customers c ON c.id = s.customer_id WHERE upper(s.ref) = upper('${typed}')`,
  'ch11-05#0': () => `SELECT b.currency, count(*), SUM(b.amount) FROM vendor_bills b JOIN shipments s ON s.id = b.shipment_id WHERE to_char(s.booking_date, 'YYYY-MM') = '2026-09' GROUP BY b.currency ORDER BY b.currency`,
  'ch11-06#0': () => `SELECT p.name, count(*), SUM(s.gross_weight_kg) FROM shipments s JOIN ports p ON p.code = s.pod WHERE to_char(s.booking_date, 'YYYY-MM') = '2026-10' GROUP BY p.name ORDER BY 2 DESC, p.name`,
  'ch11-06#1': () => `SELECT s.ref, s.booking_date, s.status FROM shipments s WHERE s.customer_id::text = '57' AND s.booking_date::text >= '2026-07-01' ORDER BY s.booking_date, s.ref`,
};

/** Indexes a player might propose that must NOT pass the lab (wrong first column, wrong table). */
const NEAR_MISS = [
  'CREATE INDEX ON container_events (event_time, container_id)',
  'CREATE INDEX ON container_events (event)',
  'CREATE INDEX ON containers (shipment_id)',
];

describe('planCheck: chấm theo kế hoạch thực thi (chương 11)', () => {
  it('isCreateIndex: đúng một CREATE INDEX, cho phép chú thích, cấm CONCURRENTLY và câu khác', () => {
    expect(isCreateIndex('CREATE INDEX ON t (a)')).toBe(true);
    expect(isCreateIndex('-- my idea\n  create unique index x on t (a, b)')).toBe(true);
    expect(isCreateIndex('CREATE INDEX CONCURRENTLY ON t (a)')).toBe(false);
    expect(isCreateIndex('DROP TABLE shipments')).toBe(false);
    expect(isCreateIndex('/* CREATE INDEX */ DELETE FROM shipments')).toBe(false);
  });

  it('runLab: từ chối câu không phải CREATE INDEX và câu ghép; chỉ mục không còn sau khi chạy', async () => {
    const db = await seededDb();
    await expect(runLab(db, 'DROP TABLE shipments', 'SELECT 1')).rejects.toMatchObject({ code: 'LAB01' });
    expect(explainError({ message: 'x', code: 'LAB01' })).toBe('sqlerr.labOnly');
    await expect(runLab(db, 'CREATE INDEX ON shipments (eta); DROP TABLE shipments', 'SELECT 1')).rejects.toThrow();
    const r = await runLab(db, 'CREATE INDEX lab_probe ON container_events (container_id)', 'SELECT * FROM container_events WHERE container_id = 7');
    expect(planLine(r.before)).toMatch(/^Seq Scan container_events/);
    expect(planLine(r.after)).toMatch(/lab_probe/);
    expect((await db.query(`SELECT count(*)::int AS n FROM pg_indexes WHERE indexname = 'lab_probe'`)).rows).toEqual([{ n: 0 }]);
    expect((await db.query('SELECT count(*)::int AS n FROM shipments')).rows).toEqual([{ n: 20000 }]);
  });

  it('có bước chấm theo kế hoạch', () => {
    expect(steps.length).toBeGreaterThanOrEqual(10);
  });

  it.each(steps)('$name: Solution đạt plan:/lab: ở mọi biến thể', async ({ step }) => {
    if (step.plan) expect(checkPlan(await explain(step.solution), step.plan.index)).toBeUndefined();
    if (step.lab) {
      const r = await runLab(await seededDb(), step.lab.ddl, step.solution);
      expect(checkLab(r.before, r.after, step.lab)).toBeUndefined();
      expect(checkPlan(r.before, step.lab.table)).toMatchObject({ reason: 'seqScan' }); // the lab starts from a whole-table read
    }
  });

  it.each(steps.filter((x) => x.step.lab))('$name: chỉ mục sai cột đầu hoặc sai bảng không đạt', async ({ step }) => {
    for (const ddl of NEAR_MISS) {
      const r = await runLab(await seededDb(), ddl, step.solution);
      expect(checkLab(r.before, r.after, step.lab!), ddl).toBeDefined();
    }
  });

  it.each(steps.filter((x) => x.step.plan && SLOW[`${x.id}#${x.i}`]))('$name: cách viết chậm cho cùng kết quả nhưng không đạt plan:', async ({ id, v, i, step }) => {
    const t = loadTicketTemplates().find((x) => x.id === id)!;
    const slow = SLOW[`${id}#${i}`](variantsOf(t)[v] ?? {});
    const db = await seededDb();
    expect(compareResults(await runSandboxed(db, step.solution), await runSandboxed(db, slow), t.ordered).ok).toBe(true);
    expect(checkPlan(await explain(slow), step.plan!.index)).toMatchObject({ reason: 'seqScan' });
  });

  it('ch11-06 bước 2 ghép hai chỉ mục dựng sẵn bằng BitmapAnd (câu kết luận của cột mốc)', async () => {
    const boss = loadTicketTemplates().find((t) => t.id === 'ch11-06')!;
    const nodes = planNodes(await explain(boss.steps[1].solution));
    expect(nodes.map((n) => n['Node Type'])).toContain('BitmapAnd');
    expect(nodes.map((n) => n['Index Name']).filter(Boolean).sort()).toEqual(['shipments_booking_date_idx', 'shipments_customer_id_idx']);
  });

  it('kế hoạch giống hệt nhau trên hai DB vừa seed (ANALYZE đọc đủ dòng)', async () => {
    const other = await freshDb();
    for (const { step } of steps.filter((x) => x.v === 0)) {
      const a = await explain(step.solution);
      const b = (await runSandboxed(other, `EXPLAIN (FORMAT JSON) ${step.solution}`)).rows[0][0];
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    }
  });
});
