import type { PGlite } from '@electric-sql/pglite';
import { runSandboxed, type RunOpts } from '../db/run';
import { chainOf, groupKeys, probeOf, selectOf, type Ast } from './steps';
import type { StepsFailure } from './stepText';

/**
 * V22-B (L206): "Why this row?" for one row of the player's own result (never a Solution, L25). Worker side, reached through
 * a `steps` request (`WHY` prefix, src/viz/stepText.ts), from the same libpg-query parse as the Execution order tab.
 * - grouped (GROUP BY or an aggregate): the source rows of that group, found by the row's own plain columns (`IS NOT
 *   DISTINCT FROM $n`, values bound, never spliced), with the group keys and each aggregate's argument;
 * - a JOIN without aggregates: the joined rows (`row_to_json` per table) that give exactly this row.
 * Codes and values only, no translated text (src/ui/whyView.ts words them).
 */
export type WhyFailure = StepsFailure | 'sub' | 'star' | 'key' | 'rollup' | 'plain' | 'noRow' | 'error';
export type WhyResult =
  | { ok: false; reason: WhyFailure }
  /** `cols[i]` is a key (`agg[i]` false) or the argument of an aggregate (label = the aggregate); `rows`: the first WHY_ROWS. */
  | { ok: true; kind: 'group'; n: number; cols: string[]; agg: boolean[]; rows: unknown[][] }
  /** `tables`: alias or name per table; `on[k]`: "a.x = b.y" of the k-th JOIN when steps.ts can probe it; `rows[i][j]`: table j's row, null = no match. */
  | { ok: true; kind: 'join'; n: number; tables: string[]; on: (string | null)[]; rows: (Record<string, unknown> | null)[][] };

export const WHY_ROWS = 5;
const AGGS = new Set(['count', 'sum', 'avg', 'min', 'max', 'string_agg', 'array_agg', 'bool_and', 'bool_or', 'every', 'stddev', 'stddev_samp',
  'stddev_pop', 'variance', 'var_samp', 'var_pop', 'json_agg', 'jsonb_agg', 'percentile_cont', 'percentile_disc', 'mode', 'corr']);

const isAgg = (f: Ast): boolean =>
  !f.over && (f.agg_star || f.agg_distinct || f.agg_filter || f.agg_within_group || AGGS.has(f.funcname?.at(-1)?.String?.sval));
/** Every aggregate call in `node` (not looking inside one). */
function aggsIn(node: Ast, out: Ast[] = []): Ast[] {
  if (!node || typeof node !== 'object') return out;
  if (node.FuncCall && isAgg(node.FuncCall)) out.push(node.FuncCall);
  else Object.values(node).forEach((v) => aggsIn(v, out));
  return out;
}
const has = (node: Ast, keys: string[]): boolean =>
  !!node && typeof node === 'object' && Object.entries(node).some(([k, v]) => keys.includes(k) || has(v, keys));
/** Same expression, wherever it was written. */
const same = (a: Ast, b: Ast): boolean => JSON.stringify(a, (k, v) => (k === 'location' ? undefined : v)) === JSON.stringify(b, (k, v) => (k === 'location' ? undefined : v));

/** The SQL texts and bound values of one explanation. */
export interface WhyPlan {
  kind: 'group' | 'join'; count: string; rows: string; params: unknown[]; cols: string[]; agg: boolean[]; tables: string[]; on: (string | null)[];
}

export async function buildWhy(sql: string, row: unknown[]): Promise<WhyPlan | { ok: false; reason: WhyFailure }> {
  const parsed = await selectOf(sql);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const { sel, wrap } = parsed;
  if (has(sel, ['SubLink', 'RangeSubselect'])) return { ok: false, reason: 'sub' };
  if (!sel.fromClause) return { ok: false, reason: 'plain' };
  const targets: Ast[] = (sel.targetList ?? []).map((t: Ast) => t.ResTarget.val);
  if (targets.some((v) => v.ColumnRef?.fields?.some((f: Ast) => f.A_Star))) return { ok: false, reason: 'star' };
  const label = async (e: Ast): Promise<string> => (await wrap({ targetList: [{ ResTarget: { val: e } }] })).replace(/^SELECT\s+/, '');

  // The row's plain columns pin it down: value i of the row is target i's value.
  const plain = targets.flatMap((v, i) => (aggsIn(v).length === 0 && has(v, ['ColumnRef']) ? [i] : []));
  const params = plain.map((i) => row[i]);
  const conds = plain.map((i, n) => ({ A_Expr: { kind: 'AEXPR_NOT_DISTINCT', name: [{ String: { sval: '=' } }], lexpr: targets[i], rexpr: { ParamRef: { number: n + 1 } } } }));
  const all = [sel.whereClause, ...conds].filter(Boolean);
  const where = all.length > 1 ? { BoolExpr: { boolop: 'AND_EXPR', args: all } } : all[0];
  const q = (targetList: Ast[], limit?: number) => wrap({
    targetList, fromClause: sel.fromClause, whereClause: where,
    ...(limit ? { limitCount: { A_Const: { ival: { ival: limit } } }, limitOption: 'LIMIT_OPTION_COUNT' } : {}),
  });
  const count = { ResTarget: { val: { FuncCall: { funcname: [{ String: { sval: 'count' } }], agg_star: true } } } };
  const res = (val: Ast) => ({ ResTarget: { val } });

  const aggs = targets.flatMap((v) => aggsIn(v));
  if (sel.groupClause || aggs.length || has(sel.havingClause, ['FuncCall'])) {
    const keys = groupKeys(sel);
    if (keys.some((k) => k.GroupingSet)) return { ok: false, reason: 'rollup' };
    if (!keys.every((k) => plain.some((i) => same(targets[i], k)))) return { ok: false, reason: 'key' }; // a key not shown: the row cannot name its group
    // One column per aggregate with one plain argument: its terms (count(*), DISTINCT and FILTER have none to add up).
    const terms = aggs.filter((f) => f.args?.length === 1 && !f.agg_distinct && !f.agg_filter && !f.agg_within_group && !f.agg_star);
    const cols = [...await Promise.all(plain.map((i) => sel.targetList[i].ResTarget.name ?? label(targets[i]))), ...await Promise.all(terms.map((f) => label({ FuncCall: f })))];
    return {
      kind: 'group', count: await q([count]), rows: await q([...plain.map((i) => res(targets[i])), ...terms.map((f) => res(f.args[0]))], WHY_ROWS),
      params, cols, agg: cols.map((_, i) => i >= plain.length), tables: [], on: [],
    };
  }

  const tables: string[] = [];
  const walk = (n: Ast): void => {
    if (n.RangeVar) tables.push(n.RangeVar.alias?.aliasname ?? n.RangeVar.relname);
    if (n.JoinExpr) [n.JoinExpr.larg, n.JoinExpr.rarg].forEach(walk);
  };
  sel.fromClause.forEach(walk);
  if (tables.length < 2) return { ok: false, reason: 'plain' };
  const levels = chainOf(sel.fromClause) ?? [];
  const on = await Promise.all(levels.slice(1).map(async (l) => {
    const p = await probeOf(l, wrap);
    return p ? `${p.left} = ${p.right}` : null;
  }));
  const json = tables.map((t) => res({ FuncCall: { funcname: [{ String: { sval: 'row_to_json' } }], args: [{ ColumnRef: { fields: [{ String: { sval: t } }] } }] } }));
  return { kind: 'join', count: await q([count]), rows: await q(json, WHY_ROWS), params, cols: [], agg: [], tables, on };
}

/** `payload` = JSON `{ sql, row }` (dates arrive as ISO text, which Postgres reads back for date and timestamp keys). */
export async function runWhy(db: PGlite, payload: string, opts: RunOpts): Promise<WhyResult> {
  const { sql, row } = JSON.parse(payload) as { sql: string; row: unknown[] };
  const plan = await buildWhy(sql, row);
  if (!('kind' in plan)) return plan;
  try {
    const o = { ...opts, params: plan.params };
    const n = Number((await runSandboxed(db, plan.count, undefined, o)).rows[0][0]);
    if (!n) return { ok: false, reason: 'noRow' };
    const rows = (await runSandboxed(db, plan.rows, undefined, o)).rows;
    return plan.kind === 'group'
      ? { ok: true, kind: 'group', n, cols: plan.cols, agg: plan.agg, rows }
      : { ok: true, kind: 'join', n, tables: plan.tables, on: plan.on, rows: rows as (Record<string, unknown> | null)[][] };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
