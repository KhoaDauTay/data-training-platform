// v23 PRED (L256): every Postgres predict with `expect` shows that node in the real plan on PGlite (EXPLAIN (FORMAT JSON),
// no ANALYZE), through the same runner and the same src/engine/predict.ts functions the page uses. A predict without
// `expect` needs a written reason here; the content track (PG-C) adds `expect`s, which this test then checks on its own.
import { describe, expect, it } from 'vitest';
import { parseEngineLesson, type EngineLesson, type LessonSource } from '../src/engine/content';
import { pgScriptRunner } from '../src/engine/pglab/runner';
import { runLabScript } from '../src/engine/pglab/session';
import {
  afterLab, answerNode, capstonePivot, explainSql, FIRST_MAX, hasRealPlan, hasRealRun, matchesExpect, nodesOf, observe, parseEngineFirst, planTree,
  readsCounters, shownSetup, stepName, withFirst,
} from '../src/engine/predict';
import { grade } from '../src/grader';

const files = import.meta.glob<LessonSource>('../content/engine/postgres/L*/*.md', { query: '?fm', import: 'default', eager: true });
const lessons: EngineLesson[] = Object.entries(files).map(([p, s]) => parseEngineLesson(s, p));
const predicts = lessons.filter((l) => l.predict);
const env = { grade, verdict: () => 'wrong' };
const runner = pgScriptRunner(env, { run: runLabScript, reset: () => undefined });
const realPlan = async (l: EngineLesson) => planTree((await runner.run(l.lab ?? { steps: [] }, explainSql(l.predict!.sql))).rows[0]?.[0]);

/** Predicts without `expect`, each with the reason (roadmap v23 exit: "or a reason written in the test").
 * Measured on PGlite 2026-11-20; "PG-C can add" = an `expect` that already holds on the real plan. */
const NO_EXPECT: Record<string, string> = {
  'e-pg-l3-08': 'asks which UPDATE is HOT (pg_stat_user_tables counters), not a plan: "Xem thật" shows the counters (readsCounters), no plan tree',
  'e-pg-l4-01': 'the answer is a total cost (Seq Scan on parcels, cost 398); expect has no cost field, the tree shows it',
  'e-pg-l4-02': 'answer = Seq Scan, 14,000 rows; PG-C can add { node: Seq Scan, table: parcels, rows: 14000 }',
  'e-pg-l4-05': 'the answer is the join order (customers at the first leaf); PG-C can add { node: Index Scan, table: customers }',
  'e-pg-l4-07': 'the answer counts the partitions under the Append (4 + default); expect cannot count children',
  'e-pg-l4-15': 'the answer is the absence of Gather; expect cannot say "absent" (plan: Aggregate → Seq Scan on big)',
  'e-pg-l4-16': 'answer = Bitmap Heap Scan via orders_status_idx; PG-C can add { node: Bitmap Index Scan, index: orders_status_idx }',
  'e-pg-l5-15': 'answer = Bitmap Index Scan on the October (tenant_id, created_at) index; PG-C can add { node: Bitmap Index Scan, index: events_2026_10_tenant_id_created_at_idx }',
};

describe('predict: the real plan on PGlite', () => {
  it('there are Postgres predicts, and every one without expect has a written reason', () => {
    expect(predicts.length).toBeGreaterThanOrEqual(16);
    const missing = predicts.filter((l) => !l.predict!.expect && !NO_EXPECT[l.id]).map((l) => l.id);
    expect(missing).toEqual([]);
  });

  const withExpect = predicts.filter((l) => l.predict!.expect);
  it.each(withExpect.map((l) => [l.id, l] as const))('%s: expect is in the real plan', async (_id, l) => {
    const tree = await realPlan(l);
    const x = l.predict!.expect!;
    const all = nodesOf(tree).map((n) => `${n.node}${n.index ? ` using ${n.index}` : ''}${n.relation ? ` on ${n.relation}` : ''} rows=${n.rows}`);
    expect(matchesExpect(tree, x), `${JSON.stringify(x)} not in ${all.join(' / ')}`).toBeDefined();
    expect(hasRealPlan(l)).toBe(true);
    const obs = observe(tree, l.predict!.sql, x);
    expect(obs.some((o) => o.code === 'differs')).toBe(false);
    expect(answerNode(tree, x)).toBe(matchesExpect(tree, x));
  }, 60_000);

  const planOnly = predicts.filter((l) => !l.predict!.expect && hasRealPlan(l));
  it.each(planOnly.map((l) => [l.id, l] as const))('%s (no expect): the real plan still draws', async (_id, l) => {
    const tree = await realPlan(l);
    expect(tree).toBeDefined();
    expect(observe(tree, l.predict!.sql).length).toBeGreaterThan(0);
    expect(answerNode(tree)).toBeUndefined(); // no `expect`: no node is outlined as the answer
  }, 60_000);

  // blind-pg l3-08 (L296): a counters question gets no plan tree; "Xem thật" runs the query after the lab setup instead.
  it('e-pg-l3-08: "Xem thật" shows the real counters, not a plan', async () => {
    const l = predicts.find((x) => x.id === 'e-pg-l3-08')!;
    expect(readsCounters(l)).toBe(true);
    expect(hasRealPlan(l)).toBe(false);
    expect(hasRealRun(l)).toBe(true);
    const out = await runner.run(l.lab!, l.predict!.sql);
    expect(out.rows.map((r) => r.map(String))).toEqual([['jobs_full', '1', '0'], ['jobs_room', '1', '1']]);
    expect(predicts.filter(readsCounters).map((x) => x.id)).toEqual(['e-pg-l3-08']);
  }, 60_000);
});

// v23 CAP (L257): the capstone's "Trước / Sau" through the same runner and helpers as the page, the solution standing in for
// the learner's statement at the pivot step.
describe('capstone plans before and after', () => {
  const caps = lessons.filter((l) => l.kind === 'capstone' && capstonePivot(l.lab));
  it('the capstones with a target query are found', () => {
    expect(caps.map((l) => l.id)).toEqual(expect.arrayContaining(['e-pg-l1-12', 'e-pg-l2-17']));
  });
  it.each(caps.map((l) => [l.id, l] as const))('%s: both plans parse, and the change shows', async (_id, l) => {
    const lab = l.lab!;
    const piv = capstonePivot(lab)!;
    const explainAt = async (x: typeof lab, step: number) => planTree((await runner.run(x, explainSql(piv.query), step)).rows[0]?.[0]);
    const before = await explainAt(lab, piv.before);
    const after = await explainAt(afterLab(lab, piv.gate, lab.steps[piv.gate].solution), piv.after);
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
    expect(nodesOf(after).some((n) => n.index)).toBe(true); // the index the step creates is read
  }, 120_000);
});

describe('predict helpers', () => {
  const json = [{ Plan: { 'Node Type': 'Limit', 'Startup Cost': 0.28, 'Total Cost': 1.5, 'Plan Rows': 5, Plans: [
    { 'Node Type': 'Index Scan', 'Relation Name': 'orders', 'Index Name': 'orders_created_idx', 'Startup Cost': 0.28, 'Total Cost': 80, 'Plan Rows': 2000 },
  ] } }];
  it('planTree reads JSON or text and keeps costs and estimates', () => {
    const t = planTree(JSON.stringify(json))!;
    expect(t.node).toBe('Limit');
    expect(t.children[0]).toMatchObject({ node: 'Index Scan', relation: 'orders', index: 'orders_created_idx', cost: 80, rows: 2000 });
    expect(planTree('not json')).toBeUndefined();
    expect(planTree([])).toBeUndefined();
  });
  it('observe: the reading node, Sort or not under ORDER BY, and a mismatch', () => {
    const t = planTree(json);
    expect(observe(t, 'SELECT 1 FROM orders ORDER BY created_at DESC LIMIT 5', { node: 'Index Scan', table: 'orders' }).map((o) => o.code)).toEqual(['pickIndex', 'noSort']);
    expect(observe(t, 'SELECT 1', { node: 'Seq Scan' }).map((o) => o.code)).toEqual(['differs', 'top']); // no node matches: the sentence names the root, nothing is outlined
  });
  it('shownSetup keeps only CREATE INDEX statements', () => {
    expect(shownSetup("CREATE TABLE t (a int);\n-- note\nCREATE INDEX t_a ON t (a);\nANALYZE t;\nCREATE UNIQUE INDEX u ON t (a)")).toEqual(['CREATE INDEX t_a ON t (a)', 'CREATE UNIQUE INDEX u ON t (a)']);
  });
  it('the first-choice pref: validated on read, one write per lesson, bounded', () => {
    expect(parseEngineFirst({ 'e-pg-l1-10': 2, 'e-mg-l2-03': 0, bad: 1, 'e-pg-l1-11': -1, 'e-pg-l1-12': 1.5, 'e-dy-l1-01': '1' })).toEqual({ 'e-pg-l1-10': 2, 'e-mg-l2-03': 0 });
    expect(parseEngineFirst(null)).toEqual({});
    expect(parseEngineFirst([1])).toEqual({});
    expect(withFirst({}, 'e-pg-l1-10', 1)).toEqual({ 'e-pg-l1-10': 1 });
    expect(withFirst({ 'e-pg-l1-10': 1 }, 'e-pg-l1-10', 2)).toBeUndefined();
    const full = Object.fromEntries(Array.from({ length: FIRST_MAX }, (_, i) => [`e-pg-l1-${String(i % 100).padStart(2, '0')}${i}`, 0]));
    expect(withFirst(parseEngineFirst(full), 'e-pg-l1-10', 0)).toBeDefined(); // the long ids are not lesson ids: dropped on read
  });
  it('capstone pivot: a step with target, else a plan step after a change, else none', () => {
    const cap = (id: string) => lessons.find((l) => l.id === id)!;
    const reg = capstonePivot(cap('e-pg-l1-12').lab)!;
    expect(reg.gate).toBe(cap('e-pg-l1-12').lab!.steps.findIndex((s) => s.target));
    expect(reg.after).toBe(reg.before + 1);
    expect(capstonePivot(cap('e-pg-l3-15').lab)).toBeUndefined();
    expect(stepName('Bước 1, dữ liệu lệch. Đọc các giá trị')).toBe('dữ liệu lệch');
    expect(stepName('Step 2, estimates. Read', 'Estimates')).toBe('Estimates');
  });
});
