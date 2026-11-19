// V22-B (L206): "Why this row?" (src/viz/why.ts) over every Solution of the three domains and every General drill.
import { parse } from 'libpg-query';
import { describe, expect, it } from 'vitest';
import { loadDomain, loadGeneral, loadTickets } from '../src/content';
import { ensureSchema } from '../src/db/lab';
import { runSandboxed } from '../src/db/run';
import type { DomainId, SchemaId } from '../src/domains';
import { runSteps, type Ast } from '../src/viz/steps';
import { WHY, whyRequest } from '../src/viz/stepText';
import { buildWhy, runWhy, type WhyResult } from '../src/viz/why';
import type { Ticket } from '../src/tickets';
import { whyOpen } from '../src/ui/whyButton';
import { seededDb } from './helpers';

await Promise.all([loadDomain('ecommerce'), loadDomain('finance')]);
const general = await loadGeneral();
const db = await seededDb();
await Promise.all((['ecom', 'fin', 'lab'] as const).map((s) => ensureSchema(db, s)));

/** What the client sends (whyRequest: the row through JSON, timestamps as local wall clock). */
const why = (sql: string, row: unknown[], types: number[], schema?: SchemaId) => runWhy(db, whyRequest(sql, row, types).slice(WHY.length), { schema });

const SCHEMA: Record<DomainId, SchemaId | undefined> = { logistics: undefined, ecommerce: 'ecom', finance: 'fin' };
const cases: { id: string; sql: string; schema?: SchemaId }[] = [
  ...(['logistics', 'ecommerce', 'finance'] as DomainId[]).flatMap((d) => loadTickets(d).flatMap((tk) =>
    tk.steps.filter((s) => !s.lab).map((s, i) => ({ id: `${tk.id}#${i}`, sql: s.solution, schema: SCHEMA[d] })))),
  ...general.drills.map((d) => ({ id: d.id, sql: d.solution, schema: 'lab' as const })),
];
const MAX_ROWS = 40;

describe('why: every Solution with GROUP BY, JOIN or an aggregate', () => {
  it('explains each result row: group counts add up, JOIN rows find their pair, the rest say "not yet"', async () => {
    const tally: Record<string, number> = {};
    const bad: string[] = [];
    for (const c of cases) {
      const tree = (await parse(c.sql)) as { stmts: { stmt: { SelectStmt?: Ast } }[] };
      const sel = tree.stmts[0].stmt.SelectStmt;
      if (!sel || !/\b(group\s+by|join|count|sum|avg|min|max)\b/i.test(c.sql)) continue;
      const res = await runSandboxed(db, c.sql, undefined, { schema: c.schema });
      const rows = res.rows.slice(0, MAX_ROWS);
      if (!rows.length) continue;
      const first = await why(c.sql, rows[0], res.types, c.schema);
      const kind = first.ok ? first.kind : first.reason;
      tally[kind] = (tally[kind] ?? 0) + 1;
      if (!first.ok) {
        if (first.reason === 'noRow' || first.reason === 'error' || first.reason === 'syntax') bad.push(`${c.id}: ${first.reason}`);
        continue;
      }
      const targets = (sel as { targetList: { ResTarget: { val: { FuncCall?: { agg_star?: boolean; agg_filter?: unknown } } } }[] }).targetList;
      const countAt = targets.findIndex((t) => t.ResTarget.val.FuncCall?.agg_star && !t.ResTarget.val.FuncCall.agg_filter);
      let sum = 0;
      for (const row of rows) {
        const r: WhyResult = row === rows[0] ? first : await why(c.sql, row, res.types, c.schema);
        if (!r.ok) { bad.push(`${c.id}: row ${rows.indexOf(row)} ${r.reason}`); break; }
        sum += r.n;
        if (r.kind === 'group' && countAt >= 0 && r.n !== Number(row[countAt])) bad.push(`${c.id}: count ${r.n} ≠ ${String(row[countAt])}`);
        if (r.kind === 'join' && !r.rows[0]?.[0]) bad.push(`${c.id}: no left row`);
      }
      const s = sel as Record<string, unknown>;
      if (first.kind === 'group' && res.rows.length <= MAX_ROWS && !s.limitCount && !s.limitOffset && !s.distinctClause) {
        const steps = await runSteps(db, c.sql, { schema: c.schema });
        if (!steps.ok) throw new Error(c.id);
        const after = steps.steps.filter((x) => ['from', 'join', 'where'].includes(x.key) && !x.skipped).at(-1)!.count!;
        if (s.havingClause ? sum > after : sum !== after) bad.push(`${c.id}: groups hold ${sum} rows, WHERE leaves ${after}`);
      }
    }
    console.log('why coverage', JSON.stringify(tally));
    expect(bad).toEqual([]);
    expect(tally.group).toBeGreaterThan(50);
    expect(tally.join).toBeGreaterThan(10);
  }, 600_000);
});

describe('why: edges', () => {
  const Q = `SELECT c.name, count(*) AS n, sum(s.teu) AS teu FROM shipments s JOIN customers c ON c.id = s.customer_id
    WHERE s.booking_date >= '2026-07-01' GROUP BY c.name ORDER BY n DESC LIMIT 3`;
  it('a group lists its source rows and the terms of each aggregate; values are bound, not spliced', async () => {
    const res = await runSandboxed(db, Q.replace(', sum(s.teu) AS teu', ''));
    const plan = await buildWhy(Q, [res.rows[0][0], 1, 1]);
    if (!('kind' in plan)) throw new Error(plan.reason);
    expect(plan.count).toContain('$1');
    expect(plan.count).not.toContain(String(res.rows[0][0]));
  });
  it('a NULL key and a date key find their group (IS NOT DISTINCT FROM, ISO text)', async () => {
    const q = `SELECT date_trunc('month', booking_date) AS m, NULLIF(status, status) AS x, count(*) FROM shipments GROUP BY 1, 2 ORDER BY 1`;
    const res = await runSandboxed(db, q);
    const r = await why(q, res.rows[0], res.types);
    expect(r.ok && r.n).toBe(Number(res.rows[0][2]));
  });
  it('a LEFT JOIN row without a partner shows an empty right side', async () => {
    const q = `SELECT s.id, d.id AS did FROM shipments s LEFT JOIN customs_declarations d ON d.shipment_id = s.id WHERE d.id IS NULL`;
    const res = await runSandboxed(db, q);
    expect(res.rows.length).toBeGreaterThan(0);
    const r = await why(q, res.rows[0], res.types);
    if (!r.ok || r.kind !== 'join') throw new Error(JSON.stringify(r));
    expect(r.n).toBe(1);
    expect(r.rows[0][0]).toMatchObject({ id: res.rows[0][0] });
    expect(r.rows[0][1]).toBeNull();
    expect(r.on).toEqual(['s.id = d.shipment_id']); // steps.ts' probe: left key, then the joined table's key
  });
  it('WITH, UNION, window and sub-queries are "not yet", never an error', async () => {
    for (const [q, reason] of [
      ['WITH x AS (SELECT 1 AS a) SELECT count(*) FROM x', 'withUnion'],
      ['SELECT id, rank() OVER (ORDER BY id) FROM customers', 'window'],
      ['SELECT count(*) FROM customers WHERE id IN (SELECT customer_id FROM shipments)', 'sub'],
      ['SELECT count(*) FROM (SELECT 1) t', 'sub'],
    ] as const) expect(await why(q, [1], [23])).toEqual({ ok: false, reason });
  });
  it('travels through the steps request (WHY prefix)', async () => {
    const r = (await runSteps(db, whyRequest('SELECT count(*) FROM customers', [0], [20]))) as unknown as WhyResult;
    expect(r.ok && r.kind).toBe('group');
  });
});

describe('whyOpen (D-V22-6)', () => {
  const boss = { id: 'ch1-09', beat: 'boss', steps: [{}, {}, { lab: {} }] } as unknown as Ticket;
  const none = { completed: [] as string[], bossStep: {} as Record<string, number> };
  it('hides the button on a promotion-review step not yet passed, on index labs and in the interview room', () => {
    expect(whyOpen('ch1-09#0', [boss], none)).toBe(false);
    expect(whyOpen('ch1-09#0', [boss], { ...none, bossStep: { 'ch1-09': 1 } })).toBe(true); // step 0 passed, the run is still step 0's
    expect(whyOpen('ch1-09#1', [boss], { ...none, bossStep: { 'ch1-09': 1 } })).toBe(false);
    expect(whyOpen('ch1-09#2', [boss], { completed: ['ch1-09'], bossStep: {} })).toBe(false); // lab
    expect(whyOpen('ch1-09#1', [boss], { completed: ['ch1-09'], bossStep: {} })).toBe(true);
    expect(whyOpen('g-iv-th-1#0', [], none)).toBe(false);
    expect(whyOpen('', [], none)).toBe(true); // Sandbox
    expect(whyOpen('g-where-1#0', [], none)).toBe(true); // drill
  });
});
