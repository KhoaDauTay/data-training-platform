import type { PGlite } from '@electric-sql/pglite';
import { parse, scan } from 'libpg-query';
import { deparse } from 'pgsql-deparser';
import { runSandboxed, type QueryResult, type RunOpts } from '../db/run';
import { ensureParser } from './parser';

// Labels and help live in a parser-free module so the UI bundle never pulls in libpg-query.
export { STEP_LABELS, type StepKey, type StepsFailure } from './stepText';
export type { GroupSample, JoinMatch } from './stepText';
import type { GroupSample, JoinMatch, StepKey, StepsFailure } from './stepText';

/**
 * One clause. `label` and `range` (its span in the player's SQL) are set on FROM and JOIN steps, since several JOIN
 * steps share one key; the view falls back to STEP_LABELS and `ranges`. `match` (JOIN) and `groups` (GROUP BY) feed the
 * v10 animations (L155); a failed sample query leaves them out and never touches `count` or `error`.
 */
export interface StepRun {
  key: StepKey; skipped: boolean; count?: number; sample?: QueryResult; sql?: string; error?: string;
  label?: string; range?: [number, number]; match?: JoinMatch; groups?: GroupSample[];
}
type Ranges = Partial<Record<StepKey, [number, number]>>;
type Failure = { ok: false; reason: StepsFailure; detail?: string };
export type StepsResult = { ok: true; steps: StepRun[]; ranges: Ranges } | Failure;
/** The two key queries of one JOIN (matched pairs, left rows without a partner), both on a LEFT JOIN copy of it. */
type Probe = { kind: JoinMatch['kind']; left: string; right: string; matched: string; unmatched: string };
type BuiltStep = { key: StepKey; sql: string | null; label?: string; range?: [number, number]; probe?: Probe };
type Built = { ok: true; steps: BuiltStep[]; ranges: Ranges } | Failure;

// libpg-query's AST is a large tagged union; these helpers only touch a few well-known fields.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ast = any;

const STAR = [{ ResTarget: { val: { ColumnRef: { fields: [{ A_Star: {} }] } } } }];
// Language-neutral alias: results are cached across a VI/EN switch.
const COUNT = { ResTarget: { name: 'row_count', val: { FuncCall: { funcname: [{ String: { sval: 'count' } }], agg_star: true } } } };

// ponytail: an unqualified GROUP BY name that matches both an input column and a SELECT alias
// resolves to the column in Postgres, but to the alias here. Rare in tickets; fix if a player hits it.
function groupKeys(sel: Ast): Ast[] {
  const targets: Ast[] = sel.targetList ?? [];
  return (sel.groupClause ?? []).map((g: Ast) => {
    const ordinal = g.A_Const?.ival?.ival;
    if (typeof ordinal === 'number') return targets[ordinal - 1]?.ResTarget?.val ?? g;
    const fields = g.ColumnRef?.fields;
    if (fields?.length === 1 && fields[0].String) {
      const t = targets.find((x) => x.ResTarget?.name === fields[0].String.sval);
      if (t) return t.ResTarget.val;
    }
    return g;
  });
}

/** A window function is a FuncCall with an `over` clause anywhere in the subtree (not the word "over" in a string). */
function hasWindow(node: Ast): boolean {
  if (!node || typeof node !== 'object') return false;
  if (node.FuncCall?.over) return true;
  return Object.values(node).some(hasWindow);
}

const CLAUSE: Record<string, StepKey> = {
  SELECT: 'select', FROM: 'from', WHERE: 'where', GROUP: 'group', HAVING: 'having', ORDER: 'order', LIMIT: 'limit', OFFSET: 'limit',
};

/** Top-level clause spans in the player's own text, using Postgres' scanner (strings and parentheses are safe). */
export async function clauseRanges(sql: string): Promise<Ranges> {
  const { tokens } = (await scan(sql)) as { tokens: { text: string; start: number; end: number; keywordName: string }[] };
  let depth = 0;
  const starts: { key: StepKey; start: number }[] = [];
  const ranges: Ranges = {};
  for (const t of tokens) {
    if (t.text === '(') depth++;
    else if (t.text === ')') depth--;
    else if (depth === 0 && t.keywordName === 'RESERVED_KEYWORD') {
      const word = t.text.toUpperCase();
      const key = CLAUSE[word];
      if (key && !(key === 'limit' && starts.at(-1)?.key === 'limit')) starts.push({ key, start: t.start });
      if (word === 'DISTINCT' && starts.at(-1)?.key === 'select') ranges.distinct = [t.start, t.end];
    }
  }
  starts.forEach((s, i) => {
    ranges[s.key] = [s.start, i + 1 < starts.length ? starts[i + 1].start : sql.trimEnd().replace(/;$/, '').length];
  });
  return ranges;
}

/** v10 N1: the FROM item as base table + JOINs in text order, when it is one left-deep chain (no parenthesised or aliased join). */
function chainOf(from: Ast[] | undefined): Ast[] | undefined {
  if (from?.length !== 1 || !from[0].JoinExpr) return undefined;
  const levels: Ast[] = [];
  for (let n = from[0]; n; n = n.JoinExpr?.larg) {
    levels.unshift(n);
    if (!n.JoinExpr) break;
    if (n.JoinExpr.alias || n.JoinExpr.rarg?.JoinExpr) return undefined;
  }
  return levels; // levels[0] = the base table, levels[k + 1] = everything up to the k-th JOIN
}

const JOIN_WORDS = new Set(['JOIN', 'LEFT', 'RIGHT', 'FULL', 'INNER', 'OUTER', 'CROSS', 'NATURAL']);
/** Where each top-level JOIN of the FROM clause starts (its first join word) and how the player wrote it ("LEFT JOIN"). */
async function joinStarts(sql: string, [from, to]: [number, number]): Promise<{ start: number; label: string }[]> {
  const { tokens } = (await scan(sql)) as { tokens: { text: string; start: number }[] };
  const out: { start: number; label: string }[] = [];
  let depth = 0;
  let open: { start: number; words: string[] } | undefined;
  for (const t of tokens) {
    if (t.start < from || t.start >= to) continue;
    const word = t.text.toUpperCase();
    if (t.text === '(') depth++;
    else if (t.text === ')') depth--;
    if (depth !== 0 || !JOIN_WORDS.has(word)) {
      open = undefined;
      continue;
    }
    open ??= { start: t.start, words: [] };
    open.words.push(word);
    if (word === 'JOIN') {
      out.push({ start: open.start, label: open.words.join(' ') });
      open = undefined;
    }
  }
  return out;
}

const refName = (n: Ast): string[] | undefined => {
  const f: Ast[] | undefined = n?.ColumnRef?.fields;
  return f?.every((x) => x.String) ? f.map((x) => x.String.sval as string) : undefined;
};
/**
 * v10 N2: `ON a.x = b.y` (one equality of two qualified columns, one of them on the joined table) on an INNER or LEFT
 * JOIN of a plain table. Anything else (USING, NATURAL, RIGHT/FULL, a sub-query, expressions) gets counts only.
 */
async function probeOf(level: Ast, wrap: (o: Ast) => Promise<string>): Promise<Probe | undefined> {
  const j = level.JoinExpr;
  const kind = j.jointype === 'JOIN_INNER' ? 'inner' : j.jointype === 'JOIN_LEFT' ? 'left' : undefined;
  const q = j.quals?.A_Expr;
  const right = j.rarg?.RangeVar;
  if (!kind || j.isNatural || j.usingClause || !right || q?.kind !== 'AEXPR_OP' || q.name?.[0]?.String?.sval !== '=') return undefined;
  const name: string = right.alias?.aliasname ?? right.relname;
  const sides = [q.lexpr, q.rexpr].map((e: Ast) => ({ e, f: refName(e) }));
  if (sides.some((x) => !x.f || x.f.length < 2)) return undefined;
  const onRight = sides.filter((x) => x.f!.at(-2) === name);
  if (onRight.length !== 1) return undefined;
  const r = onRight[0];
  const l = sides.find((x) => x !== r)!;
  const inner = await wrap({
    targetList: [{ ResTarget: { name: 'l', val: l.e } }, { ResTarget: { name: 'r', val: r.e } }],
    fromClause: [{ JoinExpr: { ...j, jointype: 'JOIN_LEFT' } }],
  });
  const pick = (cond: string, n: number) => `SELECT l::text, r::text FROM (${inner}) AS t WHERE r IS ${cond} LIMIT ${n}`;
  return { kind, left: l.f!.join('.'), right: r.f!.join('.'), matched: pick('NOT NULL', 6), unmatched: pick('NULL', 2) };
}

export async function buildSteps(sql: string): Promise<Built> {
  await ensureParser();
  let tree: Ast;
  try {
    tree = await parse(sql);
  } catch (e) {
    return { ok: false, reason: 'syntax', detail: e instanceof Error ? e.message : String(e) };
  }
  if (tree.stmts?.length !== 1) return { ok: false, reason: 'multi' };
  const sel: Ast = tree.stmts[0].stmt?.SelectStmt;
  if (!sel) return { ok: false, reason: 'notSelect' };
  if (sel.withClause || (sel.op && sel.op !== 'SETOP_NONE')) return { ok: false, reason: 'withUnion' };
  if (hasWindow([sel.targetList, sel.sortClause])) return { ok: false, reason: 'window' };

  const wrap = async (o: Ast): Promise<string> => String(await
    deparse({ version: tree.version, stmts: [{ stmt: { SelectStmt: { limitOption: 'LIMIT_OPTION_DEFAULT', op: 'SETOP_NONE', ...o } } }] }));
  const base = { fromClause: sel.fromClause, whereClause: sel.whereClause };
  // Group by the resolved expressions too: the sub-query has no SELECT alias or ordinal to refer to.
  const keys = groupKeys(sel);
  // ROLLUP/CUBE/GROUPING SETS (Finance F5) select the columns inside them; a grouping set is not an expression.
  const flat = (k: Ast): Ast[] => (k.GroupingSet ? (k.GroupingSet.content ?? []).flatMap(flat) : [k]);
  const groupTargets = [...keys.flatMap(flat).map((val) => ({ ResTarget: { val } })), COUNT];
  const noTail = { limitCount: undefined, limitOffset: undefined };
  const plan: [StepKey, boolean, Ast][] = [
    ['from', !!sel.fromClause, { targetList: STAR, fromClause: sel.fromClause }],
    ['where', !!sel.fromClause && !!sel.whereClause, { targetList: STAR, ...base }],
    ['group', !!sel.groupClause, { targetList: groupTargets, ...base, groupClause: keys }],
    ['having', !!sel.havingClause, { targetList: groupTargets, ...base, groupClause: keys, havingClause: sel.havingClause }],
    ['select', true, { ...sel, distinctClause: undefined, sortClause: undefined, ...noTail }],
    ['distinct', !!sel.distinctClause, { ...sel, sortClause: undefined, ...noTail }],
    ['order', !!sel.sortClause, { ...sel, ...noTail }],
    ['limit', !!(sel.limitCount || sel.limitOffset), sel],
  ];
  const ranges = await clauseRanges(sql);
  const steps: BuiltStep[] = [];
  for (const [key, present, o] of plan) {
    if (key === 'from' && !sel.fromClause) continue; // SELECT 1: no FROM/WHERE steps at all
    if (key === 'where' && !sel.fromClause) continue;
    if (key === 'from') steps.push(...(await fromSteps(sql, sel.fromClause, ranges.from, wrap)));
    else steps.push({ key, sql: present ? await wrap(o) : null });
  }
  return { ok: true, steps, ranges };
}

/**
 * v10 N1: FROM, then one step per JOIN (rows after each join), when the FROM is one left-deep chain whose JOIN words the
 * scanner finds in the same number. Otherwise today's single "FROM + JOIN" step.
 */
async function fromSteps(sql: string, from: Ast[], range: [number, number] | undefined, wrap: (o: Ast) => Promise<string>): Promise<BuiltStep[]> {
  const all = await wrap({ targetList: STAR, fromClause: from });
  const levels = chainOf(from);
  const starts = levels && range ? await joinStarts(sql, range) : [];
  if (!levels || !range || starts.length !== levels.length - 1) {
    return [{ key: 'from', sql: all, label: from.length === 1 && !from[0].JoinExpr ? 'FROM' : undefined }];
  }
  const end = (i: number) => (i < starts.length ? starts[i].start : range[1]);
  const span = (a: number, b: number): [number, number] => [a, a + sql.slice(a, b).trimEnd().length];
  const out: BuiltStep[] = [{ key: 'from', sql: await wrap({ targetList: STAR, fromClause: [levels[0]] }), label: 'FROM', range: span(range[0], end(0)) }];
  for (let k = 0; k < starts.length; k++) {
    out.push({
      key: 'join', label: starts[k].label, range: span(starts[k].start, end(k + 1)),
      sql: k === starts.length - 1 ? all : await wrap({ targetList: STAR, fromClause: [levels[k + 1]] }),
      probe: await probeOf(levels[k + 1], wrap),
    });
  }
  return out;
}

/** Display text of a sample value: dates as ISO days, NULL as NULL (keys are compared by eye, not graded). */
const cell = (v: unknown): string => (v === null ? 'NULL' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v));

export async function runSteps(db: PGlite, sql: string, opts: RunOpts = {}): Promise<StepsResult> {
  const built = await buildSteps(sql);
  if (!built.ok) return built;
  const steps: StepRun[] = [];
  for (const s of built.steps) {
    if (!s.sql) {
      steps.push({ key: s.key, skipped: true });
      continue;
    }
    try {
      const count = await runSandboxed(db, `SELECT count(*) FROM (${s.sql}) AS t`, undefined, opts);
      const sample = await runSandboxed(db, `SELECT * FROM (${s.sql}) AS t LIMIT 5`, undefined, opts);
      const run: StepRun = { key: s.key, skipped: false, count: Number(count.rows[0][0]), sample, sql: s.sql, label: s.label, range: s.range };
      if (s.key === 'group') {
        run.groups = sample.rows.slice(0, 3).map((r) => ({ key: r.slice(0, -1).map(cell).join(' · '), n: Number(r.at(-1)) }));
      }
      if (s.probe) run.match = await matchOf(db, s.probe, opts);
      steps.push(run);
    } catch (e) {
      steps.push({ key: s.key, skipped: false, sql: s.sql, label: s.label, range: s.range, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { ok: true, steps, ranges: built.ranges };
}

/** v10 N2: up to 6 matched pairs and 2 left rows without a partner. A failed probe only drops the picture. */
async function matchOf(db: PGlite, p: Probe, opts: RunOpts): Promise<JoinMatch | undefined> {
  try {
    const rows = [...(await runSandboxed(db, p.matched, undefined, opts)).rows, ...(await runSandboxed(db, p.unmatched, undefined, opts)).rows];
    return { kind: p.kind, left: p.left, right: p.right, pairs: rows.map((r) => ({ l: cell(r[0]), r: r[1] === null ? null : cell(r[1]) })) };
  } catch {
    return undefined;
  }
}
