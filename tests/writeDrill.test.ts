import { describe, expect, it } from 'vitest';
import { generalNow } from '../src/content';
import { ensureSchema } from '../src/db/lab';
import { runSandboxed, sqlErrorInfo } from '../src/db/run';
import { compareResults, grade } from '../src/grader';
import { checkPlan, slowVerdict } from '../src/planCheck';
import { partOf } from '../src/progress';
import { seededDb } from './helpers';

/**
 * v26 R2 (product-route-v24 §3.4, §4 R2; L390–L392): Part 9 write drills are graded write-then-read. The player's statement
 * and then the drill's `check:` run in one BEGIN … ROLLBACK (runSandboxed with `check`); the Solution the same way. Nothing
 * persists, a statement that ends the transaction is refused, and 50 write drills in one session leave every `perf:` bar and
 * every `plan:` drill as they were (writes never touch a table with a bar).
 */
const g = generalNow()!;
const writes = g.drills.filter((d) => d.check);
/** Every table a `plan:`/`perf:` drill grades: a write there would leave dead tuples that move plan costs. */
const barTables = new Set([...g.drills, ...g.nodes.flatMap((n) => n.drills)].flatMap((d) => [d.plan?.index, d.perf?.table]).filter(Boolean));
const target = (sql: string): string | undefined =>
  /^\s*(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|MERGE\s+INTO|CREATE\s+TABLE)\s+([a-z_][a-z0-9_]*)/i.exec(sql)?.[1].toLowerCase();

async function lab() {
  const db = await seededDb();
  await ensureSchema(db, 'lab');
  return { db, run: (sql: string, check?: string) => runSandboxed(db, sql, undefined, { schema: 'lab', check }) };
}

describe('drill ghi (Phần 9): nội dung', () => {
  it('12 drill ghi, đúng ba kỹ năng của Phần 9, 4 drill mỗi kỹ năng; chỉ Phần 9 có check:', () => {
    expect(writes).toHaveLength(12);
    expect([...new Set(writes.map((d) => d.skill))].sort()).toEqual(['insert_select', 'update_join', 'upsert']);
    for (const d of writes) expect([d.id, partOf(d.skill!)]).toEqual([d.id, 9]);
    for (const s of ['insert_select', 'update_join', 'upsert']) expect(g.bySkill.get(s)!.every((d) => d.check)).toBe(true);
  });

  it('mỗi drill ghi ghi lên đúng một bảng không có thanh hiệu năng; check: là một câu đọc, không đọc id tự sinh', () => {
    for (const d of writes) {
      const t = target(d.solution);
      expect([d.id, t !== undefined && !barTables.has(t)]).toEqual([d.id, true]);
      for (const w of d.wrong) expect([w.sql, target(w.sql)]).toEqual([w.sql, t]);
      expect(d.check).toMatch(/^SELECT\b/);
      expect(d.check).not.toMatch(/;/);
    }
    expect([...barTables].sort()).toEqual(['app_events', 'orders']);
  });

  it.each(writes)('$id: lời giải đổi đúng thứ check: đọc (check trên dữ liệu gốc khác hoặc lỗi), câu sai trượt, lời giải tự qua', async (d) => {
    const { run } = await lab();
    const before = await run(d.check!).catch(() => undefined);
    const after = await run(d.solution, d.check);
    if (before) expect(compareResults(after, before, d.ordered).ok).toBe(false);
    expect(await grade((s) => run(s, d.check), d.solution, d.solution, d.ordered)).toEqual({ ok: true });
    for (const w of d.wrong) expect((await grade((s) => run(s, d.check), d.solution, w.sql, d.ordered)).ok).toBe(false);
    // a read instead of the write leaves the table as it was: never a pass
    expect((await grade((s) => run(s, d.check), d.solution, d.check!, d.ordered)).ok).toBe(false);
  });
});

describe('drill ghi: không gì thoát khỏi ROLLBACK', () => {
  const count = async (run: (s: string) => Promise<{ rows: unknown[][] }>) => (await run('SELECT count(*)::int FROM products')).rows[0][0];

  it('câu ghi + check: trả dòng của check; bảng không đổi sau đó', async () => {
    const { run } = await lab();
    const n = await count(run);
    const r = await run("INSERT INTO products (name, category, price_vnd) VALUES ('Probe', 'Drinks', 1000)", 'SELECT count(*)::int FROM products');
    expect(r.rows[0][0]).toBe(Number(n) + 1);
    expect(await count(run)).toBe(n);
  });

  it.each(['COMMIT', 'END', 'ROLLBACK', 'ABORT', '/* x */ commit'])('%s làm câu ghi: WRT01, không check, không đổi gì', async (sql) => {
    const { run } = await lab();
    const n = await count(run);
    const e = await run(sql, 'SELECT count(*)::int FROM products').catch((x: unknown) => x);
    expect(sqlErrorInfo(e)?.code).toBe('WRT01');
    expect(await count(run)).toBe(n);
  });

  it('hai câu trong một lần gửi, DO … COMMIT, câu ghi lỗi: bị từ chối, bảng không đổi', async () => {
    const { run } = await lab();
    const n = await count(run);
    for (const sql of [
      "INSERT INTO products (name, category, price_vnd) VALUES ('Probe', 'Drinks', 1000); COMMIT",
      "DO $$ BEGIN INSERT INTO products (name, category, price_vnd) VALUES ('Probe', 'Drinks', 1000); COMMIT; END $$",
      "INSERT INTO products (name, category, price_vnd) VALUES ('Probe', 'Drinks', -5)",
    ]) {
      const e = await run(sql, 'SELECT count(*)::int FROM products').catch((x: unknown) => x);
      expect([sql, sqlErrorInfo(e)?.code]).toEqual([sql, expect.stringMatching(/^[0-9A-Z]{5}$/)]);
    }
    expect(await count(run)).toBe(n);
  });
});

describe('một phiên: 50 drill ghi liên tiếp, rồi mọi thanh perf: và plan: vẫn qua (exit R2)', () => {
  it('50 lượt chấm ghi (lời giải qua, câu sai trượt mỗi lượt), rồi perf + plan', async () => {
    const { run } = await lab();
    const explain = async (sql: string) => (await run(`EXPLAIN (FORMAT JSON) ${sql}`)).rows[0][0];
    for (let i = 0; i < 50; i++) {
      const d = writes[i % writes.length];
      expect([i, d.id, (await grade((s) => run(s, d.check), d.solution, d.solution, d.ordered)).ok]).toEqual([i, d.id, true]);
      for (const w of d.wrong) expect([i, w.sql, (await grade((s) => run(s, d.check), d.solution, w.sql, d.ordered)).ok]).toEqual([i, w.sql, false]);
    }
    const all = [...g.drills, ...g.nodes.flatMap((n) => n.drills)];
    const bars = all.filter((d) => d.perf);
    expect(bars.length).toBeGreaterThanOrEqual(12);
    for (const d of bars) {
      const want = await explain(d.solution);
      expect([d.id, checkPlan(want, d.perf!.table)]).toEqual([d.id, undefined]);
      expect([d.id, slowVerdict(want, await explain(d.slow!), d.perf)?.block]).toEqual([d.id, true]);
      expect([d.id, compareResults(await run(d.solution), await run(d.slow!), d.ordered).ok]).toEqual([d.id, true]);
    }
    for (const d of all.filter((x) => x.plan)) expect([d.id, checkPlan(await explain(d.solution), d.plan!.index)]).toEqual([d.id, undefined]);
  }, 120_000);
});
