/**
 * V19-A (N8, L162): "SQL in words". Turns the parsed SELECT (libpg-query's tree, already built by the `steps` request) into
 * one part per clause, as codes and parameters only: no translated text (the words are a VI/EN table in
 * src/ui/sqlWordsView.ts, like StepsFailure). Names and literals come from the player's own query, never a Solution.
 * Pure and parser-free: steps.ts hands it the tree, so it rides in the lazy steps chunk.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ast = any;

/** A value as the player wrote it: a column, a literal, a function call, or something described by kind only. */
export type Val = { c: string } | { v: string } | { f: string } | { e: 'sub' | 'list' | 'expr' };
export type Op = 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge' | 'like' | 'ilike' | 'in' | 'between' | 'null';
/** One condition of an AND list. `or` = one of n alternatives; `exists` = a sub-query finds a row; `other` = any other test. */
export type Cond = { op: Op; l: Val; r?: Val; r2?: Val; not?: boolean } | { op: 'or'; n: number } | { op: 'exists'; not?: boolean } | { op: 'other' };
export type JoinKind = 'inner' | 'left' | 'right' | 'full' | 'cross';
export type Agg = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'other';

export type WordPart =
  | { k: 'select'; cols: number; star: boolean; aggs: Agg[] }
  | { k: 'from'; tables: Val[]; joins: { kind: JoinKind; table: Val }[] }
  | { k: 'where'; conds: Cond[] }
  | { k: 'group'; keys: Val[]; sets: boolean }
  | { k: 'having'; conds: Cond[] }
  | { k: 'distinct'; on: number }
  | { k: 'order'; keys: { key: Val; desc: boolean }[] }
  | { k: 'limit'; n?: number; offset?: number };

const AGGS = new Set(['count', 'sum', 'avg', 'min', 'max']);
const OPS: Record<string, Op> = { '=': 'eq', '<>': 'ne', '!=': 'ne', '<': 'lt', '<=': 'le', '>': 'gt', '>=': 'ge' };
const NEGATED: Partial<Record<Op, Op>> = { eq: 'ne', ne: 'eq', lt: 'ge', ge: 'lt', gt: 'le', le: 'gt' };

const name = (fields: Ast[] | undefined): string | undefined =>
  fields?.every((f) => f.String) ? fields.map((f) => f.String.sval as string).join('.') : undefined;

function constText(c: Ast): string | undefined {
  if (c.isnull) return 'NULL';
  if (c.sval) return `'${c.sval.sval ?? ''}'`;
  if (c.ival) return String(c.ival.ival ?? 0);
  if (c.fval) return String(c.fval.fval);
  if (c.boolval) return c.boolval.boolval ? 'TRUE' : 'FALSE';
  return undefined;
}

/** How a value reads: column name, literal (a cast literal keeps its text), function name, or its kind. */
export function valOf(n: Ast): Val {
  if (n?.ColumnRef) {
    const s = name(n.ColumnRef.fields);
    return s ? { c: s } : { c: '*' };
  }
  if (n?.A_Const) {
    const v = constText(n.A_Const);
    return v === undefined ? { e: 'expr' } : { v };
  }
  if (n?.TypeCast?.arg?.A_Const) return valOf(n.TypeCast.arg);
  if (n?.FuncCall) return { f: n.FuncCall.funcname.at(-1).String.sval };
  if (n?.SubLink) return { e: 'sub' };
  if (n?.List || Array.isArray(n)) return { e: 'list' };
  if (n?.RangeVar) {
    const t = [n.RangeVar.schemaname, n.RangeVar.relname].filter(Boolean).join('.');
    const a = n.RangeVar.alias?.aliasname;
    return { c: a && a !== t ? `${t} ${a}` : t }; // "ports p": the alias the conditions use
  }
  if (n?.RangeSubselect) return { e: 'sub' };
  return { e: 'expr' };
}

/** The AND-ed conditions of a WHERE or HAVING, each read on its own. */
export function condsOf(n: Ast): Cond[] {
  if (n?.BoolExpr?.boolop === 'AND_EXPR') return n.BoolExpr.args.flatMap(condsOf);
  return [condOf(n)];
}

function condOf(n: Ast): Cond {
  const b = n?.BoolExpr;
  if (b?.boolop === 'OR_EXPR') return { op: 'or', n: b.args.length };
  if (b?.boolop === 'NOT_EXPR') {
    const inner = condOf(b.args[0]);
    if (inner.op === 'or' || inner.op === 'other') return { op: 'other' };
    return { ...inner, not: !inner.not };
  }
  if (n?.NullTest) return { op: 'null', l: valOf(n.NullTest.arg), not: n.NullTest.nulltesttype === 'IS_NOT_NULL' };
  const s = n?.SubLink;
  if (s?.subLinkType === 'EXISTS_SUBLINK') return { op: 'exists' };
  if (s?.subLinkType === 'ANY_SUBLINK') return { op: 'in', l: valOf(s.testexpr), r: { e: 'sub' } };
  if (s?.subLinkType === 'ALL_SUBLINK' && s.operName?.[0]?.String?.sval === '<>') return { op: 'in', l: valOf(s.testexpr), r: { e: 'sub' }, not: true };
  const a = n?.A_Expr;
  if (!a) return { op: 'other' };
  const sym: string | undefined = a.name?.[0]?.String?.sval;
  if (a.kind === 'AEXPR_OP' && sym && OPS[sym] && a.lexpr) return { op: OPS[sym], l: valOf(a.lexpr), r: valOf(a.rexpr) };
  if (a.kind === 'AEXPR_LIKE' || a.kind === 'AEXPR_ILIKE') {
    return { op: a.kind === 'AEXPR_LIKE' ? 'like' : 'ilike', l: valOf(a.lexpr), r: valOf(a.rexpr), not: sym?.startsWith('!') };
  }
  if (a.kind === 'AEXPR_IN') return { op: 'in', l: valOf(a.lexpr), r: { e: 'list' }, not: sym === '<>' };
  if (a.kind === 'AEXPR_BETWEEN' || a.kind === 'AEXPR_NOT_BETWEEN') {
    const [lo, hi] = a.rexpr?.List?.items ?? [];
    return { op: 'between', l: valOf(a.lexpr), r: valOf(lo), r2: valOf(hi), not: a.kind === 'AEXPR_NOT_BETWEEN' };
  }
  return { op: 'other' };
}

/** `NOT a = b` reads as `a <> b`; other negations keep `not`. */
export function plainCond(c: Cond): Cond {
  if ('l' in c && c.not && NEGATED[c.op]) return { ...c, op: NEGATED[c.op]!, not: false };
  return c;
}

/** Aggregates called at the top of each SELECT item (count, sum…), in order, each once. */
function aggsOf(targets: Ast[]): Agg[] {
  const out: Agg[] = [];
  const visit = (n: Ast): void => {
    if (!n || typeof n !== 'object') return;
    if (n.SubLink) return; // a sub-query's aggregates are not this query's
    const f = n.FuncCall;
    if (f) {
      const fn: string = f.funcname.at(-1).String.sval;
      const a: Agg | undefined = AGGS.has(fn) ? (fn as Agg) : f.agg_star || f.agg_distinct || f.agg_filter ? 'other' : undefined;
      if (a && !out.includes(a)) out.push(a);
    }
    Object.values(n).forEach(visit);
  };
  targets.forEach((t) => visit(t.ResTarget?.val));
  return out;
}

const JOIN_KIND: Record<string, JoinKind> = { JOIN_INNER: 'inner', JOIN_LEFT: 'left', JOIN_RIGHT: 'right', JOIN_FULL: 'full' };

/** FROM items in text order: the leftmost table of each item, then every JOIN under it. */
function fromOf(items: Ast[]): WordPart & { k: 'from' } {
  const tables: Val[] = [];
  const joins: { kind: JoinKind; table: Val }[] = [];
  const walk = (n: Ast, top: boolean): void => {
    const j = n?.JoinExpr;
    if (!j) {
      if (top) tables.push(valOf(n));
      else joins.push({ kind: 'cross', table: valOf(n) });
      return;
    }
    walk(j.larg, top);
    const cross = j.jointype === 'JOIN_INNER' && !j.quals && !j.usingClause && !j.isNatural;
    if (j.rarg?.JoinExpr) walk(j.rarg, false); // parenthesised join on the right: its tables read as joined
    else joins.push({ kind: cross ? 'cross' : JOIN_KIND[j.jointype] ?? 'inner', table: valOf(j.rarg) });
  };
  for (const it of items) walk(it, true);
  return { k: 'from', tables, joins };
}

/**
 * One part per clause the SELECT has, in reading order: what it takes, from where, which rows, groups, which groups,
 * no duplicates, in which order, how many. The caller has already refused WITH, UNION and window functions.
 */
export function sqlWords(sel: Ast): WordPart[] {
  const targets: Ast[] = sel.targetList ?? [];
  /** `ORDER BY 2` / `GROUP BY 1` read as the SELECT item they point at (its alias, else the item). */
  const keyOf = (n: Ast): Val => {
    const t = typeof n?.A_Const?.ival?.ival === 'number' ? targets[n.A_Const.ival.ival - 1]?.ResTarget : undefined;
    return t ? (t.name ? { c: t.name } : valOf(t.val)) : valOf(n);
  };
  const parts: WordPart[] = [{
    k: 'select',
    cols: targets.length,
    star: targets.some((t) => t.ResTarget?.val?.ColumnRef?.fields?.at(-1)?.A_Star),
    aggs: aggsOf(targets),
  }];
  if (sel.fromClause) parts.push(fromOf(sel.fromClause));
  if (sel.whereClause) parts.push({ k: 'where', conds: condsOf(sel.whereClause).map(plainCond) });
  if (sel.groupClause) {
    const sets = sel.groupClause.some((g: Ast) => g.GroupingSet);
    const flat = (g: Ast): Ast[] => (g.GroupingSet ? (g.GroupingSet.content ?? []).flatMap(flat) : [g]);
    parts.push({ k: 'group', keys: sel.groupClause.flatMap(flat).map(keyOf), sets });
  }
  if (sel.havingClause) parts.push({ k: 'having', conds: condsOf(sel.havingClause).map(plainCond) });
  if (sel.distinctClause) parts.push({ k: 'distinct', on: sel.distinctClause.filter((d: Ast) => d && Object.keys(d).length).length });
  if (sel.sortClause) {
    parts.push({ k: 'order', keys: sel.sortClause.map((s: Ast) => ({ key: keyOf(s.SortBy?.node), desc: s.SortBy?.sortby_dir === 'SORTBY_DESC' })) });
  }
  if (sel.limitCount || sel.limitOffset) {
    const num = (n: Ast): number | undefined => (n?.A_Const?.ival ? Number(n.A_Const.ival.ival ?? 0) : undefined);
    parts.push({ k: 'limit', n: num(sel.limitCount), offset: num(sel.limitOffset) });
  }
  return parts;
}
