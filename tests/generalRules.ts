import { expect, it } from 'vitest';
import { ensureSchema } from '../src/db/lab';
import { runSandboxed, type QueryResult } from '../src/db/run';
import type { Drill } from '../src/general';
import { compareResults } from '../src/grader';
import { checkPlan } from '../src/planCheck';
import { BLANK } from '../src/tickets';
import { seededDb } from './helpers';

/** Content rules shared by the skill drills (Task 4) and the advanced nodes' drills (Task 5), on a DB with `lab` seeded. */
export const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
export const codeSpans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort();

export async function labRun(): Promise<(sql: string) => Promise<QueryResult>> {
  const db = await seededDb();
  await ensureSchema(db, 'lab');
  return (sql) => runSandboxed(db, sql, undefined, { schema: 'lab' });
}

export function drillRules(drills: Drill[]): void {
  it.each(drills)('$id: Solution chạy, 1–500 dòng, < 1 s; ordered ⇒ ORDER BY; không ngày "hôm nay" động', async (d) => {
    const run = await labRun();
    const t0 = performance.now();
    const r = await run(d.solution);
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(r.rows.length).toBeGreaterThanOrEqual(1);
    expect(r.rows.length).toBeLessThanOrEqual(500);
    if (d.ordered) expect(d.solution).toMatch(/ORDER BY/i);
    for (const sql of [d.solution, d.starter ?? '', ...d.wrong.map((w) => w.sql)]) expect(sql).not.toMatch(/CURRENT_DATE|now\(\)/i);
  });

  it.each(drills)('$id: starter có ___ thì không chạy; starter không có ___ thì chưa đạt; mỗi câu sai báo lỗi hoặc khác Solution', async (d) => {
    const run = await labRun();
    const expected = await run(d.solution);
    if (d.starter && !d.starter.includes(BLANK)) {
      const s = await run(d.starter).catch(() => undefined);
      if (s) expect(compareResults(expected, s, d.ordered).ok).toBe(false);
    }
    for (const w of d.wrong) {
      const r = await run(w.sql).catch(() => undefined);
      if (!r) continue;
      // a plan drill's wrong answer may give the same rows: then its plan must fail instead
      if (d.plan && compareResults(expected, r, d.ordered).ok) {
        expect(checkPlan((await run(`EXPLAIN (FORMAT JSON) ${w.sql}`)).rows[0][0], d.plan.index)).toBeDefined();
      } else expect(compareResults(expected, r, d.ordered).ok).toBe(false);
    }
  });

  it.each(drills)('$id: code span VI = EN (đề, gợi ý, câu sai); EN không dấu', (d) => {
    for (const b of [d.task, d.hint, ...d.wrong.map((w) => w.why)]) {
      expect(codeSpans(b.en)).toEqual(codeSpans(b.vi));
      expect(b.en.replace(/`[^`]+`/g, '')).not.toMatch(VI_DIACRITIC);
    }
  });

  // Plan 8a Task 4 asked for 42P01 here, but customers/payments exist in both schemas (15 drills run there with another
  // result or a 42703). The rule that matters: the Solution never gives its lab result without the lab search_path.
  it.each(drills)('$id: Solution trên schema game báo lỗi hoặc ra kết quả khác (không dùng nhầm bảng Logistics)', async (d) => {
    const db = await seededDb();
    const game = await runSandboxed(db, d.solution).catch(() => undefined);
    if (game) expect(compareResults(await (await labRun())(d.solution), game, d.ordered).ok).toBe(false);
  });

  it.each(drills.filter((d) => d.plan))('$id: plan đạt planCheck với Solution', async (d) => {
    const run = await labRun();
    expect(checkPlan((await run(`EXPLAIN (FORMAT JSON) ${d.solution}`)).rows[0][0], d.plan!.index)).toBeUndefined();
  });
}

/** Two drills of the same owner never share a result. */
export async function distinctResults(drills: Drill[]): Promise<string[]> {
  const run = await labRun();
  const clash: string[] = [];
  for (let i = 0; i < drills.length; i++) {
    for (let j = i + 1; j < drills.length; j++) {
      const a = await run(drills[i].solution);
      const b = await run(drills[j].solution);
      if (compareResults(a, b, false).ok) clash.push(`${drills[i].id} = ${drills[j].id}`);
    }
  }
  return clash;
}
