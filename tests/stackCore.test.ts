// v45 R1 (L740–L759): the Data stack track (engine `stack`): the dbt-style compiler (pure), its runner hook (replayOf compiles
// earlier model steps; an incremental model builds twice), and the wiring (routes, Save ids, XP, badges).
import { describe, expect, it } from 'vitest';
import v5 from './fixtures/save-v5.json?raw';
import { ENGINE_XP, engineXp, lessonIdFor, onPg, type EngineLesson, type Lab } from '../src/engine/content';
import { gradable, honestRow, LAB_RUNNERS } from '../src/engine/labs';
import { pgScriptRunner, replayOf } from '../src/engine/pglab/runner';
import { runLabScript } from '../src/engine/pglab/session';
import { buildModel, compile, compileStep, dagOrder, DbtError, isDbtLab, modelsOf, refsOf, testSql } from '../src/engine/stack/dbt';
import { grade } from '../src/grader';
import { badges, BADGE_ENGINES, levelsOf } from '../src/mastery';
import { engineHash, enginePlayOf, engineRouteOf } from '../src/route';
import { ENGINE_ID, parseSave, type Known } from '../src/save';

const models = { stg_orders: 'staging', fct_orders: 'marts' } as const;
const code = (f: () => unknown): string | undefined => { try { f(); } catch (e) { return (e as DbtError).code; } return undefined; };

describe('dbt-style compiler (pure)', () => {
  it('ref → <layer>.<name>, source → raw_<s>.<t>, refs and sources listed', () => {
    const c = compile("select * from {{ ref('stg_orders') }} o\njoin {{ source(\"shop\", \"customers\") }} c using (customer_id)", { models });
    expect(c.sql).toBe('select * from staging.stg_orders o\njoin raw_shop.customers c using (customer_id)');
    expect(c.refs).toEqual(['stg_orders']);
    expect(c.sources).toEqual([['shop', 'customers']]);
  });
  it('config is removed and read; view, table, incremental builds', () => {
    const self = { name: 'fct_orders', layer: 'marts' as const };
    expect(buildModel("{{ config(materialized='table') }}\nselect 1 as x", { models, self })).toEqual(['CREATE SCHEMA IF NOT EXISTS marts', 'CREATE TABLE marts.fct_orders AS\nselect 1 as x']);
    expect(buildModel('select 1 as x', { models, self })).toEqual(['CREATE SCHEMA IF NOT EXISTS marts', 'CREATE OR REPLACE VIEW marts.fct_orders AS\nselect 1 as x']);
    const inc = "{{ config(materialized='incremental', unique_key='order_id') }}\nselect * from {{ ref('stg_orders') }}\n{% if is_incremental() %}\nwhere loaded_at > (select max(loaded_at) from {{ this }})\n{% endif %}";
    const first = buildModel(inc, { models, self });
    expect(first.at(-1)).toBe('CREATE TABLE marts.fct_orders AS\nselect * from staging.stg_orders');
    const again = buildModel(inc, { models, self, exists: true });
    expect(again).toHaveLength(1);
    expect(again[0]).toContain('where loaded_at > (select max(loaded_at) from marts.fct_orders)');
    expect(again[0]).toMatch(/^WITH s AS[\s\S]*DELETE FROM marts\.fct_orders t USING s WHERE t\.order_id = s\.order_id\)\nINSERT INTO marts\.fct_orders SELECT \* FROM s$/);
    expect(buildModel("{{ config(materialized='incremental') }}\nselect 1 as x", { models, self, exists: true })).toEqual(['INSERT INTO marts.fct_orders\nselect 1 as x']);
  });
  it('anything else is a coded error with line and column (never eval)', () => {
    const e = (() => { try { compile("select 1\nfrom {{ var('x') }}", { models }); } catch (x) { return x as DbtError; } })()!;
    expect([e.code, e.line, e.col, e.position]).toEqual(['jinja-unsupported', 2, 6, 15]);
    expect(e.message).toBe("jinja-unsupported at 2:6: {{ var('x') }}");
    expect(code(() => compile('{% for x in y %}{% endfor %}', { models }))).toBe('jinja-unsupported');
    expect(code(() => compile('{# note #} select 1', { models }))).toBe('jinja-unsupported');
    expect(code(() => compile('select {{ ref("stg_orders") ', { models }))).toBe('jinja-unsupported');
    expect(code(() => compile('{% if is_incremental() %} x', { models }))).toBe('jinja-unsupported');
    expect(code(() => compile("{{ ref('nope') }}", { models }))).toBe('ref-missing');
    expect(code(() => compile("{{ ref('fct_orders') }}", { models, self: { name: 'fct_orders', layer: 'marts' } }))).toBe('ref-cycle');
    expect(code(() => compile('{{ this }}', { models }))).toBe('this-outside-model');
    expect(code(() => compile("{{ config(materialized='ephemeral') }}", { models, self: { name: 'x', layer: 'marts' } }))).toBe('config-invalid');
    expect(code(() => compile("{{ ref('a; drop table x') }}", { models }))).toBe('jinja-unsupported');
  });
  it('DAG: build order by refs; a missing ref and a cycle are coded errors', () => {
    const files = { fct_orders: "select * from {{ ref('int_paid') }}", stg_orders: "select * from {{ source('shop','orders') }}", int_paid: "select * from {{ ref('stg_orders') }}" };
    expect(dagOrder(files)).toEqual(['stg_orders', 'int_paid', 'fct_orders']);
    expect(refsOf(files.fct_orders)).toEqual(['int_paid']);
    expect(code(() => dagOrder({ a: "{{ ref('b') }}" }))).toBe('ref-missing');
    expect(code(() => dagOrder({ a: "{{ ref('b') }}", b: "{{ ref('a') }}" }))).toBe('ref-cycle');
  });
  it('generic tests compile to failing-row queries', () => {
    expect(testSql({ test: 'unique', model: 'stg_orders', column: 'order_id' }, models)).toBe('SELECT order_id, count(*) AS n\nFROM staging.stg_orders\nWHERE order_id IS NOT NULL\nGROUP BY order_id\nHAVING count(*) > 1');
    expect(testSql({ test: 'not_null', model: 'stg_orders', column: 'order_id' }, models)).toBe('SELECT * FROM staging.stg_orders\nWHERE order_id IS NULL');
    expect(testSql({ test: 'accepted_values', model: 'stg_orders', column: 'status', values: ["it's", 'paid'] }, models)).toContain("NOT IN ('it''s', 'paid')");
    expect(testSql({ test: 'relationships', model: 'fct_orders', column: 'customer_id', to: 'stg_orders', field: 'customer_id' }, models)).toContain('LEFT JOIN staging.stg_orders p ON p.customer_id = c.customer_id');
    expect(code(() => testSql({ test: 'unique', model: 'stg_orders', column: 'a b' }, models))).toBe('config-invalid');
  });
  it('setup models, dbt labs, compileStep', () => {
    expect(modelsOf('CREATE VIEW staging.stg_orders AS SELECT 1; create or replace table marts.fct_x as select 1')).toEqual({ stg_orders: 'staging', fct_x: 'marts' });
    expect(isDbtLab([{ solution: "SELECT '{{1,2}}'::int[]" }])).toBe(false);
    expect(isDbtLab([{ solution: "select * from {{ source('shop','orders') }}" }])).toBe(true);
    const steps = [{ solution: 'select 1 as x', model: { name: 'stg_a', layer: 'staging' as const } }, { solution: "select * from {{ ref('stg_a') }}" }];
    expect(compileStep(undefined, steps, 1, steps[1].solution)).toEqual(['select * from staging.stg_a']);
    expect(code(() => compileStep(undefined, steps, 0, "select * from {{ ref('stg_b') }}"))).toBe('ref-missing');
  });
});

describe('runner hook: replayOf compiles earlier model steps; incremental builds twice', () => {
  const setup = `CREATE SCHEMA raw_shop;
CREATE TABLE raw_shop.orders (order_id int, amount int, _fivetran_synced timestamptz);
INSERT INTO raw_shop.orders VALUES (1, 10, '2026-10-30 01:00+00'), (2, 20, '2026-10-30 02:00+00')`;
  const model = { name: 'fct_orders', layer: 'marts' as const, materialized: 'incremental' as const };
  const inc = `{{ config(materialized='incremental', unique_key='order_id') }}
select order_id, amount, _fivetran_synced
from {{ source('shop', 'orders') }}
{% if is_incremental() %}
where _fivetran_synced > (select max(_fivetran_synced) from {{ this }})
{% endif %}`;
  const after = 'SELECT order_id, amount FROM marts.fct_orders ORDER BY order_id';
  const lab: Lab = {
    setup,
    steps: [
      { task: { vi: 'a', en: 'a' }, hint: { vi: 'a', en: 'a' }, check: 'rows', ordered: true, solution: inc, model, after },
      { task: { vi: 'b', en: 'b' }, hint: { vi: 'b', en: 'b' }, check: 'rows', ordered: true, solution: "INSERT INTO raw_shop.orders VALUES (2, 25, '2026-10-31 01:00+00'), (3, 30, '2026-10-31 02:00+00')", after: 'SELECT count(*) FROM raw_shop.orders' },
      { task: { vi: 'c', en: 'c' }, hint: { vi: 'c', en: 'c' }, check: 'rows', ordered: true, solution: inc, model, after },
    ],
  };
  const runner = pgScriptRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 300) }, { run: runLabScript, reset: () => undefined });
  it('replayOf: the compiled first build, then the plain insert', () => {
    const r = replayOf(lab, 2);
    expect(r[0]).toBe('CREATE SCHEMA IF NOT EXISTS marts');
    expect(r[1]).toMatch(/^CREATE TABLE marts\.fct_orders AS/);
    expect(r[2]).toMatch(/^INSERT INTO raw_shop\.orders/);
  });
  it('step 3 takes the is_incremental() branch: order 2 is replaced, order 3 added', async () => {
    expect(await runner.run(lab, inc, 2)).toMatchObject({ rows: [[1, 10], [2, 25], [3, 30]] });
    expect(await runner.check(lab, lab.steps[2], inc)).toMatchObject({ ok: true });
    // without unique_key the second build appends: order 2 twice, so the check fails
    expect(await runner.check(lab, lab.steps[2], inc.replace(", unique_key='order_id'", ''))).toMatchObject({ ok: false });
    expect(await runner.check(lab, lab.steps[2], 'SELECT 1')).toMatchObject({ ok: false });
    // the step declares incremental: a config() saying table is refused (a full rebuild would also give the right rows)
    expect(code(() => buildModel("{{ config(materialized='table') }}\nselect 1", { models, self: model }))).toBe('config-invalid');
    expect(await runner.check(lab, lab.steps[2], inc.replace("materialized='incremental', unique_key='order_id'", "materialized='table'"))).toMatchObject({ ok: false });
  }, 60_000);
  it('a compile error reaches the player as a coded error', async () => {
    await expect(runner.run(lab, "select * from {{ ref('nope') }}", 0)).rejects.toMatchObject({ code: 'ref-missing' });
  }, 60_000);

  // v45 stack-eye fixes (S-01–S-04), on the same lab and a two-step staging lab
  const vi = pgScriptRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 300), lang: () => 'vi' }, { run: runLabScript, reset: () => undefined });
  const stg: Lab = {
    setup,
    steps: [
      { task: { vi: 'a', en: 'a' }, hint: { vi: 'a', en: 'a' }, check: 'rows', ordered: true, solution: "select order_id, amount from {{ source('shop', 'orders') }}", model: { name: 'stg_orders', layer: 'staging' }, after: 'SELECT order_id, amount FROM staging.stg_orders ORDER BY order_id' },
      { task: { vi: 'b', en: 'b' }, hint: { vi: 'b', en: 'b' }, check: 'rows', ordered: false, solution: "select sum(amount) as total from {{ ref('stg_orders') }}" },
    ],
  };
  it('S-01: hard-coded names and a missing incremental filter are refused, with the reason', async () => {
    expect(await vi.check(stg, stg.steps[0], 'select order_id, amount from raw_shop.orders')).toMatchObject({ ok: false, reason: 'wrong', message: expect.stringContaining("source('shop', 'orders')") });
    expect(await vi.check(stg, stg.steps[1], 'select sum(amount) as total from staging.stg_orders')).toMatchObject({ ok: false, message: expect.stringContaining("ref('stg_orders')") });
    const noFilter = inc.replace(/\{% if is_incremental\(\) %\}[\s\S]*\{% endif %\}/, '');
    expect(await vi.check(lab, lab.steps[0], noFilter)).toMatchObject({ ok: false, message: expect.stringContaining('is_incremental') });
    expect(await vi.check(lab, lab.steps[2], noFilter)).toMatchObject({ ok: false });
    expect(await vi.check(stg, stg.steps[1], stg.steps[1].solution)).toMatchObject({ ok: true });
  }, 60_000);
  it('S-04: a source() typo is source-missing, explained in VI with line and column', async () => {
    await expect(vi.run(stg, "select * from {{ source('shopp', 'orders') }}", 0)).rejects.toMatchObject({ code: 'source-missing', message: expect.stringMatching(/^dòng 1, cột 15: Không có nguồn "shopp\.orders"\. Các nguồn của lab: shop\.orders\.$/) });
    await expect(vi.run(stg, "select {{ var('x') }}", 0)).rejects.toMatchObject({ code: 'jinja-unsupported', message: expect.stringContaining('BoonData chỉ hiểu') });
  }, 60_000);
  it('S-03: a model missing a column names the check and the model\'s own columns', async () => {
    await expect(vi.run(stg, "select order_id from {{ source('shop', 'orders') }}", 0)).rejects.toMatchObject({ code: '42703', message: expect.stringMatching(/staging\.stg_orders.*có các cột: order_id\..*SELECT order_id, amount FROM staging\.stg_orders/) });
  }, 60_000);
  it('S-02: Run on a sync step (a write with after:) shows the read-back rows', async () => {
    expect(await vi.run(lab, lab.steps[1].solution, 1)).toMatchObject({ rows: [[4]] });
  }, 60_000);
});

describe('wiring: routes, Save ids, XP, badges', () => {
  const known: Known = { ticketIds: new Set(['ch1-01']), laneIds: new Set(), skills: new Set(['select']) };
  it('routes #/engine/stack[/L<n>[/<id>]] and #/engine/play/e-st-…', () => {
    expect(engineRouteOf('#/engine/stack')).toEqual({ engine: 'stack', level: undefined, lesson: undefined });
    expect(engineRouteOf('#/engine/stack/l2/e-st-l2-01')).toEqual({ engine: 'stack', level: 'L2', lesson: 'e-st-l2-01' });
    expect(enginePlayOf('#/engine/play/e-st-l1-02')).toBe('#/engine/stack/L1/e-st-l1-02');
    expect(engineHash('stack', 'L2', 'e-st-l2-01')).toBe('#/engine/stack/L2/e-st-l2-01');
    expect(engineRouteOf('#/engine/stacks').engine).toBeUndefined();
  });
  it('e-st-… ids survive read → write → read, no Save bump', () => {
    const raw = JSON.stringify({ ...JSON.parse(v5), completed: ['ch1-01', 'e-st-l1-01', 'e-st-l2-03'] });
    const s = parseSave(raw, known);
    expect(s.completed).toEqual(['ch1-01', 'e-st-l1-01', 'e-st-l2-03']);
    expect(s.version).toBe(JSON.parse(v5).version);
    expect(ENGINE_ID.test('e-sx-l1-01')).toBe(false);
    expect(lessonIdFor('stack', 'L2', '04')).toBe('e-st-l2-04');
  });
  it('labs run on the Postgres runtime (onPg), normal XP', () => {
    const l = { engine: 'stack', runtime: 'browser', kind: 'lab', viz: undefined, lab: { setup: 'SELECT 1', steps: [] } } as unknown as EngineLesson;
    expect(onPg('stack')).toBe(true);
    expect(LAB_RUNNERS.stack).toBe(LAB_RUNNERS.postgres);
    expect(honestRow(l)).toBe('pg');
    expect(gradable(l, { check: 'rows' } as never)).toBe(true);
    expect(engineXp(l, false)).toBe(ENGINE_XP.lab);
    expect(engineXp(l, true)).toBe(0);
  });
  it('badges: stack L1–L3 only, held when every module of the level is done', () => {
    expect(BADGE_ENGINES).toContain('stack');
    expect(levelsOf('stack')).toEqual(['L1', 'L2', 'L3']);
    const tree = { levels: [{ level: 'L1', k: 1, n: 1, started: true, done: true }] };
    const b = badges({ parts: [], levels: new Map(), foundation: [], perf: [], completed: new Set(), engines: { stack: tree.levels }, domains: [] });
    expect(b.filter((x) => x.kind === 'engine' && x.engine === 'stack').map((x) => [x.id, x.have])).toEqual([['stack-L1', true], ['stack-L2', false], ['stack-L3', false]]);
  });
});
