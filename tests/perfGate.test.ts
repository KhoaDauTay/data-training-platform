// v24 R0 (L341, schema-perf-v24.md §4): "right but slow is not good enough" for our own answers too. Every Solution that runs
// on a seeded schema (tickets in every variant and step, lanes, drills, quick lessons, interview, Engine labs without setup)
// is EXPLAINed (FORMAT JSON, no ANALYZE: planner cost and node types, never milliseconds) and must stay within the budget of
// src/planCheck.ts GATE and read no big table through a non-sargable filter. Engine labs with setup: perfGateEngine.test.ts.
// Budgets and the allow-list are the two tables below: after a seed or content change, re-run and edit only them.
import { describe, expect, it } from 'vitest';
import { generalNow, loadDomain, loadInterview, loadLanes, loadLessons, loadTicketTemplates } from '../src/content';
import { ensureSchema } from '../src/db/lab';
import { runSandboxed } from '../src/db/run';
import { SCHEMAS, type SchemaId } from '../src/domains';
import { parseEngineLesson, type EngineLesson, type LessonSource } from '../src/engine/content';
import { compareResults } from '../src/grader';
import { checkPlan, nonSargable, overBudget, planLine, slowVerdict, type PerfSpec, type TableFacts } from '../src/planCheck';
import { applyVariant, variantsOf } from '../src/variants';
import { seededDb } from './helpers';
import { factsOf, factsSql, readOf } from './perfFacts';

/**
 * Solutions over budget on purpose, by id without the variant (`ch7-06.s1` = step 1 of every variant). An entry that no longer
 * fails fails the test ("remove from ALLOW"), so the list cannot go stale.
 */
export const ALLOW: Record<string, string> = {
  'ch7-04': 'ch7 teaches correlated subqueries: two lookups into rate_contracts (no index) per quotation, cost ~55k. A JOIN is ~300 but would mark the taught answer slow. Revisit with the S8 index task.',
  'ch7-06.s1': 'same correlated rate_contracts lookup as ch7-04',
  'ch7-06.s2': 'same correlated rate_contracts lookup as ch7-04',
  'ch7-06.s3': 'same correlated rate_contracts lookup as ch7-04',
  'ch8-04': 'ch8 teaches DISTINCT ON: the join keeps every exchange_rates row on or before the bill date, so the late-2026 variants 0-1 cost ~1.3-1.5k (> 1,226) after the R0b ANALYZE; variant 2 (April) is under budget',
  'g-a7-2': 'node a7 teaches JSON unnesting: jsonb_array_elements_text lateral over products is a function scan per row',
  'g-iv-th-2-2': 'EXISTS per customer over orders: R0b indexes orders (customer_id) and (order_date) separately, still over budget without a composite (customer_id, order_date)',
  'g-iv-th-2-3': 'same as g-iv-th-2-2',
};

const files = import.meta.glob<LessonSource>('../content/engine/postgres/L*/*.md', { query: '?fm', import: 'default', eager: true });
const engine: EngineLesson[] = Object.entries(files).map(([p, s]) => parseEngineLesson(s, p));

interface Item { key: string; name: string; schema: SchemaId; sql: string }
async function solutions(): Promise<Item[]> {
  await Promise.all([loadDomain('ecommerce'), loadDomain('finance')]);
  const out: Item[] = [];
  const add = (key: string, name: string, schema: SchemaId, sql: string) => out.push({ key, name, schema, sql });
  for (const [d, schema] of [['logistics', 'game'], ['ecommerce', 'ecom'], ['finance', 'fin']] as const)
    for (const t of loadTicketTemplates(d))
      for (let v = 0; v < Math.max(1, variantsOf(t).length); v++)
        applyVariant(t, v).steps.forEach((s, i) => {
          if (s.lab) return; // an index lab's Solution is the slow query on purpose
          const step = t.steps.length > 1 ? `.s${i + 1}` : '';
          add(`${t.id}${step}`, `${t.id}#${v}${step}`, schema, s.solution);
        });
  for (const t of loadLanes().tasks) t.steps.forEach((s, i) => add(`${t.id}.s${i + 1}`, `${t.id}.s${i + 1}`, 'game', s.solution));
  const g = generalNow()!;
  const drills = new Map([...g.drills, ...g.nodes.flatMap((n) => n.drills)].map((d) => [d.id, d]));
  for (const d of drills.values()) add(d.id, d.id, 'lab', d.solution);
  for (const l of [...loadLessons().values(), ...g.nodes.flatMap((n) => (n.lesson ? [n.lesson] : []))]) {
    add(`${l.id}.example`, `${l.id}.example`, 'lab', l.example);
    add(`${l.id}.try`, `${l.id}.try`, 'lab', l.try.solution);
  }
  const iv = await loadInterview();
  // v47 (L930): case studies (`cs-lg|ec|fn-…`) ride the take-home list but run on their domain's schema
  const CASE: Record<string, SchemaId> = { lg: 'game', ec: 'ecom', fn: 'fin' };
  for (const q of [...iv.sets.flatMap((s) => s.questions), ...iv.takeHomes.flatMap((th) => th.steps)])
    add(q.id, q.id, CASE[/^cs-(lg|ec|fn)-/.exec(q.id)?.[1] ?? ''] ?? 'lab', q.solution);
  for (const l of engine) if (l.lab && !l.lab.setup) l.lab.steps.forEach((s, i) => add(`${l.id}.s${i + 1}`, `${l.id}.s${i + 1}`, 'lab', s.solution));
  return out;
}

describe('perf gate: mọi lời giải trên schema có seed đều nằm trong ngân sách kế hoạch', async () => {
  const db = await seededDb();
  for (const s of ['lab', 'ecom', 'fin'] as const) await ensureSchema(db, s);
  const facts = new Map<SchemaId, TableFacts>();
  for (const id of ['game', 'lab', 'ecom', 'fin'] as const) {
    const [a, b] = factsSql(`n.nspname = '${SCHEMAS[id]}'`);
    facts.set(id, factsOf((await runSandboxed(db, a)).rows, (await runSandboxed(db, b)).rows));
  }
  const items = await solutions();
  const explain = async (sql: string, schema: SchemaId) => (await runSandboxed(db, `EXPLAIN (FORMAT JSON) ${sql}`, undefined, { schema })).rows[0][0];

  it('đủ lời giải (vé, lane, drill, bài nhanh, phỏng vấn, Engine không setup)', () => expect(items.length).toBeGreaterThan(700));

  it('ngân sách và luật sargable; ALLOW không cũ', async () => {
    const fails: string[] = [];
    const failing = new Set<string>();
    for (const it of items) {
      const read = readOf(it.sql);
      if (!read) continue; // a write or a script: nothing to plan
      const json = await explain(read, it.schema);
      const f = facts.get(it.schema)!;
      const over = overBudget(json, f);
      const bad = nonSargable(json, f);
      if (!over && !bad) continue;
      failing.add(it.key);
      if (!ALLOW[it.key]) fails.push(`${it.name}: ${over ? `cost ${over.cost} > budget ${over.budget}` : ''}${bad ? ` non-sargable Seq Scan ${bad}` : ''} · ${planLine(json)}`);
    }
    expect(fails, 'over budget: fix the Solution, or add it to ALLOW with a reason').toEqual([]);
    expect(Object.keys(ALLOW).filter((k) => !failing.has(k)), 'within budget now: remove from ALLOW').toEqual([]);
  }, 300_000);
});

/**
 * `perf:` bars (L340): the Solution reads `perf.table` through an index and passes its own bar; `slow:` gives the same rows and
 * is refused. Drills here; Engine steps with setup in perfGateEngine.test.ts, Engine steps on `lab` here too.
 */
describe('perf gate: mỗi thanh perf: có câu slow: trượt, lời giải qua', async () => {
  const db = await seededDb();
  await ensureSchema(db, 'lab');
  const run = (sql: string) => runSandboxed(db, sql, undefined, { schema: 'lab' });
  const explain = async (sql: string) => (await run(`EXPLAIN (FORMAT JSON) ${sql}`)).rows[0][0];
  const g = generalNow()!;
  const bars: { name: string; solution: string; slow: string; perf: PerfSpec; ordered: boolean }[] = [
    ...[...g.drills, ...g.nodes.flatMap((n) => n.drills)].filter((d) => d.perf).map((d) => ({ name: d.id, solution: d.solution, slow: d.slow!, perf: d.perf!, ordered: d.ordered })),
    ...engine.filter((l) => l.lab && !l.lab.setup).flatMap((l) => l.lab!.steps.map((s, i) => ({ name: `${l.id}.s${i + 1}`, solution: s.solution, slow: s.slow!, perf: s.perf!, ordered: s.ordered })).filter((x) => x.perf)),
  ];

  it('R0: có ít nhất một drill có thanh', () => expect(bars.filter((b) => b.name.startsWith('g-')).length).toBeGreaterThan(0));

  it.each(bars)('$name', async ({ solution, slow, perf, ordered }) => {
    expect(compareResults(await run(solution), await run(slow), ordered).ok, 'slow: phải cho cùng kết quả').toBe(true);
    const want = await explain(solution);
    expect(checkPlan(want, perf.table), 'lời giải phải đọc bảng qua chỉ mục').toBeUndefined();
    expect(slowVerdict(want, want, perf)).toBeUndefined();
    expect(slowVerdict(want, await explain(slow), perf)).toMatchObject({ block: true });
  });

  // v25 R1 (L360, reverted to L324): Parts 2–7 keep `slow:` as lesson material with no `perf:` bar, so nothing blocks; where
  // the weak-pass rule (> 3× and > 1,000) can fire, the slow answer gets the note.
  const NOTE = ['g-exists-3', 'g-distinct-on-1'];
  const lessonSlow = g.drills.filter((d) => d.slow && !d.perf);
  it('v25 R1: drill có slow: mà không perf: (Phần 2–7) đúng như danh sách', () => {
    expect(lessonSlow.map((d) => d.id).sort()).toEqual(['g-coalesce-2', 'g-date-math-4', 'g-distinct-4', 'g-distinct-on-1', 'g-exists-3', 'g-join-4']);
  });
  it.each(lessonSlow)('$id: slow: cùng kết quả, không bao giờ chặn; ghi chú khi luật yếu bắt được', async (d) => {
    expect(compareResults(await run(d.solution), await run(d.slow!), d.ordered).ok).toBe(true);
    const v = slowVerdict(await explain(d.solution), await explain(d.slow!));
    if (NOTE.includes(d.id)) expect(v).toMatchObject({ block: false });
    else expect(v).toBeUndefined();
  });
});
