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
  'ch6-06.s2': 'JOIN ON customer_id IN (a.id, b.id) cannot hash and customers was never ANALYZEd: under budget once S1 (ANALYZE the 14 Logistics tables, branch v24-labdata) merges; remove then',
  'ch6-06.s3': 'same as ch6-06.s2',
  'g-a7-2': 'node a7 teaches JSON unnesting: jsonb_array_elements_text lateral over products is a function scan per row',
  'g-iv-th-2-2': 'EXISTS per customer over orders; under budget once lab has orders (customer_id, order_date) (R0b)',
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
  for (const q of [...iv.sets.flatMap((s) => s.questions), ...iv.takeHomes.flatMap((th) => th.steps)]) add(q.id, q.id, 'lab', q.solution);
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
});
