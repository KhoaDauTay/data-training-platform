/**
 * BP-LINT (v24, L273): the ten best-practice rules of product-design-best-practice §5.4, read from libpg-query's raw parse
 * tree (shapes checked in docs/team/best-practice-catalogue.md §10.2). Pure, no text: src/ui/bpTip.ts words them.
 * Q11/Q12 are candidates: the caller keeps them only when the column is a leading index column / a timestamp (`keep`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ast = any;

export const RULES = ['q02', 'q01', 'q06', 'q12', 'q13', 'q15', 'q10', 'q11', 'q22', 'a05'] as const; // priority order (§5.4)
export type Rule = (typeof RULES)[number];
/** One switch (§5.5 #4): drop an id to turn its rule off for everyone. Q22 stays off while content uses GROUP BY 1. */
export const LINT_ON: readonly Rule[] = RULES.filter((r) => r !== 'q22');
/** §5.6: a beginner (fewer than 3 learned skills) hears only these. */
export const BEGINNER: readonly Rule[] = ['q01', 'a05'];

export interface Hit { rule: Rule; column?: string; tables?: string[] }

/**
 * (exercise id, rule) pairs whose own Solution breaks the rule (§5.5 #1): the rule never speaks on that exercise.
 * tests/bpLint.test.ts measures the set on every Solution and requires it to equal this list; each rule ≤ 5 %.
 */
// Empty at L276: every Solution in the repo is clean once Q11/Q12 are filtered by real schema facts.
export const EXEMPT: readonly (readonly [string, Rule])[] = [];

const AGG = new Set(['count', 'sum', 'avg', 'min', 'max', 'bool_and', 'bool_or', 'every', 'array_agg', 'string_agg', 'json_agg', 'jsonb_agg',
  'json_object_agg', 'jsonb_object_agg', 'stddev', 'stddev_pop', 'stddev_samp', 'variance', 'var_pop', 'var_samp', 'percentile_cont',
  'percentile_disc', 'mode', 'corr', 'covar_pop', 'covar_samp', 'regr_slope', 'regr_intercept', 'regr_r2', 'regr_count', 'bit_and', 'bit_or',
  'xmlagg', 'range_agg', 'any_value']);
/** Functions that hide a column from its index (Q11). */
const WRAP = new Set(['date_trunc', 'date_part', 'extract', 'lower', 'upper', 'btrim', 'ltrim', 'rtrim', 'to_char', 'date']);
const NOW = new Set(['now', 'clock_timestamp', 'statement_timestamp', 'transaction_timestamp']);
const SVF = /^SVFOP_(CURRENT_DATE|CURRENT_TIMESTAMP|CURRENT_TIME|LOCALTIMESTAMP|LOCALTIME)/;

const fname = (f: Ast): string => f.funcname?.at(-1)?.String?.sval ?? '';
const col = (c: Ast): string | undefined => c?.fields?.at(-1)?.String?.sval;
const qual = (c: Ast): string | undefined => (c?.fields?.length > 1 ? c.fields.at(-2)?.String?.sval : undefined);

/** Pre-order walk over `{ Type: body }` nodes; `fn` returning false skips that node's children. */
function walk(x: Ast, fn: (type: string, b: Ast) => boolean | void): void {
  if (Array.isArray(x)) {
    for (const y of x) walk(y, fn);
    return;
  }
  if (!x || typeof x !== 'object') return;
  for (const [k, v] of Object.entries(x)) {
    if (/^[A-Z]/.test(k) && v && typeof v === 'object' && !Array.isArray(v)) {
      if (fn(k, v) !== false) walk(v, fn);
    } else walk(v, fn);
  }
}
const has = (x: Ast, test: (type: string, b: Ast) => boolean, skip?: (type: string, b: Ast) => boolean): boolean => {
  let found = false;
  walk(x, (t, b) => {
    if (found || skip?.(t, b)) return false;
    if (test(t, b)) found = true;
    return !found;
  });
  return found;
};
const isAgg = (t: string, b: Ast): boolean => t === 'FuncCall' && !b.over && (AGG.has(fname(b)) || !!b.agg_star || !!b.agg_filter || !!b.agg_within_group);

/** The column a WHERE operand hides behind a function or a cast (Q11). */
function wrapped(e: Ast): Ast | undefined {
  if (e?.TypeCast?.arg?.ColumnRef) return e.TypeCast.arg.ColumnRef;
  const f = e?.FuncCall;
  if (f && !f.over && WRAP.has(fname(f))) return f.args?.find((a: Ast) => a.ColumnRef)?.ColumnRef;
  return undefined;
}

/** Every rule that fires anywhere in the tree (WITH, UNION, subqueries and windows included), deduplicated by rule+column. */
export function bpLint(tree: Ast): Hit[] {
  const hits: Hit[] = [];
  const alias = new Map<string, string>();
  walk(tree, (t, b) => {
    if (t === 'RangeVar') alias.set(b.alias?.aliasname ?? b.relname, b.relname);
  });
  const all = [...new Set(alias.values())];
  const add = (rule: Rule, c?: Ast): void => {
    const column = c && col(c);
    const q = c && qual(c);
    const tables = q && alias.has(q) ? [alias.get(q)!] : all;
    if (!hits.some((x) => x.rule === rule && x.column === column)) hits.push(c ? { rule, column, tables } : { rule });
  };
  const inSubLink = new Set<Ast>();
  walk(tree, (t, b) => {
    if (t === 'SubLink' && b.subselect?.SelectStmt) inSubLink.add(b.subselect.SelectStmt);
    if (t === 'A_Expr') {
      const op = b.name?.[0]?.String?.sval;
      if (b.kind === 'AEXPR_OP' && ['=', '<>', '!='].includes(op) && (b.lexpr?.A_Const?.isnull || b.rexpr?.A_Const?.isnull)) add('q01');
      if (b.kind === 'AEXPR_OP' && op === '/' && fname(b.lexpr?.FuncCall ?? {}) === 'count' && fname(b.rexpr?.FuncCall ?? {}) === 'count') add('q13');
    }
    if (t === 'BoolExpr' && b.boolop === 'NOT_EXPR') {
      const s = b.args?.[0]?.SubLink;
      if (s?.subLinkType === 'ANY_SUBLINK' && s.subselect && !has(s.subselect, (u, n) => u === 'NullTest' && n.nulltesttype === 'IS_NOT_NULL')) add('q02');
    }
    if ((t === 'SQLValueFunction' && SVF.test(b.op)) || (t === 'FuncCall' && NOW.has(fname(b)))) add('a05');
    if (t === 'SelectStmt') select(b, inSubLink.has(b), add);
    return true;
  });
  return hits;
}

function select(s: Ast, subLink: boolean, add: (rule: Rule, c?: Ast) => void): void {
  // Q10: LIMIT without ORDER BY (not EXISTS (… LIMIT 1), not LIMIT 0/ALL, not a FROM-less SELECT).
  const lim = s.limitCount?.A_Const;
  if (s.limitCount && !s.sortClause && !subLink && s.fromClause && !(lim && (lim.isnull || !lim.ival?.ival))) add('q10');
  // Q15: HAVING with no aggregate, GROUPING() or function we cannot place (a user aggregate would be unknown: say nothing).
  if (s.havingClause && !has(s.havingClause, (t) => t === 'FuncCall' || t === 'GroupingFunc', (t) => t === 'SubLink')) add('q15');
  // Q22: GROUP BY / ORDER BY a column position.
  if ([...(s.groupClause ?? []), ...(s.sortClause ?? []).map((x: Ast) => x.SortBy?.node)].some((n: Ast) => n?.A_Const?.ival !== undefined)) add('q22');
  const where = s.whereClause;
  if (!where) return;
  // Q06: a column of a LEFT JOIN's right side in WHERE, outside IS NULL tests, subqueries, COALESCE, IS DISTINCT FROM and ORs holding IS NULL.
  const right = new Set<string>();
  walk(s.fromClause, (t, b) => {
    if (t === 'RangeSubselect') return false;
    if (t === 'JoinExpr' && b.jointype === 'JOIN_LEFT') {
      const r = b.rarg?.RangeVar ?? b.rarg?.RangeSubselect;
      const name = r?.alias?.aliasname ?? r?.relname;
      if (name) right.add(name);
    }
    return true;
  });
  if (right.size) {
    walk(where, (t, b) => {
      if (t === 'NullTest' || t === 'SubLink' || t === 'CoalesceExpr') return false;
      if (t === 'A_Expr' && /DISTINCT/.test(b.kind)) return false;
      if (t === 'BoolExpr' && b.boolop === 'OR_EXPR' && has(b, (u) => u === 'NullTest')) return false;
      if (t === 'ColumnRef' && right.has(qual(b) ?? '')) add('q06');
      return true;
    });
  }
  // Q11 (function or cast around a column) and Q12 (BETWEEN on a bare column) in this SELECT's own WHERE.
  walk(where, (t, b) => {
    if (t === 'SubLink') return false;
    if (t !== 'A_Expr') return true;
    if (/^AEXPR_(OP|BETWEEN|IN|LIKE|ILIKE)/.test(b.kind)) for (const e of [b.lexpr, b.rexpr]) {
      const c = wrapped(e);
      if (c) add('q11', c);
    }
    if (/^AEXPR_BETWEEN/.test(b.kind) && b.lexpr?.ColumnRef) add('q12', b.lexpr.ColumnRef);
    return true;
  });
}

/** One row of the schema facts the caller reads once per schema: [table, column, is timestamp, leads an index]. */
export type ColFact = [string, string, boolean, boolean];
export const FACTS_SQL = `SELECT c.relname, a.attname, format_type(a.atttypid, a.atttypmod) LIKE 'timestamp%',
  EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.oid AND i.indkey[0] = a.attnum)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_attribute a ON a.attrelid = c.oid
  WHERE n.nspname = ANY (current_schemas(false)) AND c.relkind IN ('r', 'p', 'm') AND a.attnum > 0 AND NOT a.attisdropped`;

/** Q11 needs a real index led by the column (no index = nothing to lose); Q12 a timestamp column. Other rules always stay. */
export function keep(h: Hit, facts: readonly ColFact[]): boolean {
  if (h.rule !== 'q11' && h.rule !== 'q12') return true;
  return facts.some(([t, c, ts, lead]) => c === h.column && !!h.tables?.includes(t) && (h.rule === 'q11' ? lead : ts));
}
