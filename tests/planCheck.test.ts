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

/** Indexes a player might propose that must NOT pass the lab (wrong first column). Another table is refused by the worker. */
const NEAR_MISS = [
  'CREATE INDEX ON container_events (event_time, container_id)',
  'CREATE INDEX ON container_events (event)',
];

describe('planCheck: chấm theo kế hoạch thực thi (chương 11)', () => {
  it('isCreateIndex: đúng một CREATE INDEX, cho phép chú thích, cấm CONCURRENTLY và câu khác', () => {
    expect(isCreateIndex('CREATE INDEX ON t (a)')).toBe(true);
    expect(isCreateIndex('-- my idea\n  create unique index x on t (a, b)')).toBe(true);
    expect(isCreateIndex('CREATE INDEX CONCURRENTLY ON t (a)')).toBe(false);
    expect(isCreateIndex('DROP TABLE shipments')).toBe(false);
    expect(isCreateIndex('/* CREATE INDEX */ DELETE FROM shipments')).toBe(false);
    // Postgres block comments nest: the first */ does not end the comment.
    expect(isCreateIndex('/* /* */ CREATE INDEX */ DROP TABLE claims')).toBe(false);
    expect(isCreateIndex('/* a /* b */ c */ CREATE INDEX ON t (a)')).toBe(true);
    expect(isCreateIndex('/* unclosed CREATE INDEX ON t (a)')).toBe(false);
    // Postgres also ends -- at \r: here it runs DROP TABLE, then a block comment.
    expect(isCreateIndex('--\rDROP TABLE claims /*\nCREATE INDEX ON t (a) -- */')).toBe(false);
    expect(isCreateIndex('CREATE INDEX ON t (a) */')).toBe(false);
    // -- and /* inside a literal are not comments.
    expect(isCreateIndex("CREATE INDEX ON t (a) WHERE b <> '--x' AND c <> '/*'")).toBe(true);
    expect(isCreateIndex('CREATE INDEX "--x" ON t (a)')).toBe(true);
    expect(isCreateIndex("CREATE INDEX ON t (a) WHERE b <> 'it''s; DROP TABLE t'")).toBe(true);
    expect(isCreateIndex("CREATE INDEX ON t (a) WHERE b <> $$;$$")).toBe(true);
    expect(isCreateIndex("CREATE INDEX ON t (a) WHERE b <> 'x")).toBe(false);
    expect(isCreateIndex(String.raw`CREATE INDEX ON t (a) WHERE b <> E'\'' ; DROP TABLE t --'`)).toBe(false); // backslash escapes: refused
    expect(isCreateIndex('CREATE INDEX ON t (a);')).toBe(true);
    expect(isCreateIndex('CREATE INDEX ON t (a); DROP TABLE t')).toBe(false);
    expect(isCreateIndex('CREATE INDEX ON t (a);;')).toBe(false);
    expect(isCreateIndex('create  unique\n index /* c */ concurrently ON t (a)')).toBe(false);
  });

  it('runLab: kiểm lại trong worker: đúng một chỉ mục mới trên bảng của lab, không thì rollback và báo lỗi', async () => {
    const db = await seededDb();
    const q = 'SELECT * FROM container_events WHERE container_id = 7';
    await expect(runLab(db, '/* /* */ CREATE INDEX */ DROP TABLE claims', q, 'container_events')).rejects.toMatchObject({ code: 'LAB01' });
    await expect(runLab(db, '--\rDROP TABLE claims /*\nCREATE INDEX ON container_events (container_id) -- */', q, 'container_events')).rejects.toMatchObject({ code: 'LAB01' });
    await expect(runLab(db, 'CREATE INDEX ON containers (shipment_id)', q, 'container_events')).rejects.toMatchObject({ code: 'LAB02' });
    expect(explainError({ message: 'x', code: 'LAB02' })).toBe('sqlerr.labTable');
    await expect(runLab(db, 'CREATE INDEX CONCURRENTLY ON container_events (container_id)', q, 'container_events')).rejects.toMatchObject({ code: 'LAB01' });
    const r = await runLab(db, "CREATE INDEX lab_lit ON container_events (container_id) WHERE event <> '--; DROP TABLE claims'", q, 'container_events');
    expect(r.after).toBeDefined(); // ran as one partial index; the literal is not a comment and not a second statement
    expect((await db.query(`SELECT count(*)::int AS n FROM pg_indexes WHERE indexname = 'lab_lit'`)).rows).toEqual([{ n: 0 }]);
    expect((await db.query('SELECT count(*)::int AS n FROM claims')).rows[0]).toBeDefined();
  });

  it('runLab: từ chối câu không phải CREATE INDEX và câu ghép; chỉ mục không còn sau khi chạy', async () => {
    const db = await seededDb();
    await expect(runLab(db, 'DROP TABLE shipments', 'SELECT 1', 'shipments')).rejects.toMatchObject({ code: 'LAB01' });
    expect(explainError({ message: 'x', code: 'LAB01' })).toBe('sqlerr.labOnly');
    await expect(runLab(db, 'CREATE INDEX ON shipments (eta); DROP TABLE shipments', 'SELECT 1', 'shipments')).rejects.toThrow();
    const r = await runLab(db, 'CREATE INDEX lab_probe ON container_events (container_id)', 'SELECT * FROM container_events WHERE container_id = 7', 'container_events');
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
      const r = await runLab(await seededDb(), step.lab.ddl, step.solution, step.lab.table);
      expect(checkLab(r.before, r.after, step.lab)).toBeUndefined();
      expect(checkPlan(r.before, step.lab.table)).toMatchObject({ reason: 'seqScan' }); // the lab starts from a whole-table read
    }
  });

  it.each(steps.filter((x) => x.step.lab))('$name: chỉ mục sai cột đầu hoặc sai bảng không đạt', async ({ step }) => {
    for (const ddl of NEAR_MISS) {
      const r = await runLab(await seededDb(), ddl, step.solution, step.lab!.table);
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
