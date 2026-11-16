import type { PGlite } from '@electric-sql/pglite';
import { parse, scan } from 'libpg-query';
import { deparse } from 'pgsql-deparser';
import { runSandboxed, type QueryResult } from '../db/run';
import type { Lang } from '../i18n';
import { ensureParser } from './parser';

export type StepKey = 'from' | 'where' | 'group' | 'having' | 'select' | 'distinct' | 'order' | 'limit';
export type StepsFailure = 'syntax' | 'multi' | 'notSelect' | 'withUnion' | 'window';

const SQL_LABELS: Record<StepKey, string> = {
  from: 'FROM + JOIN', where: 'WHERE', group: 'GROUP BY', having: 'HAVING',
  select: 'SELECT', distinct: 'DISTINCT', order: 'ORDER BY', limit: 'LIMIT',
};

/** Clause names are SQL keywords, the same in both languages. */
export const STEP_LABELS: Record<Lang, Record<StepKey, string>> = { vi: SQL_LABELS, en: SQL_LABELS };

export const STEP_HELP: Record<Lang, Record<StepKey, string>> = {
  vi: {
    from: 'Lấy dữ liệu từ các bảng và ghép chúng theo điều kiện JOIN. Đây là bước chạy đầu tiên.',
    where: 'Giữ lại từng dòng thỏa điều kiện. Chạy trước khi gom nhóm nên chưa dùng được hàm gộp hay alias của SELECT.',
    group: 'Gom các dòng có cùng giá trị khóa thành một nhóm (cột row_count = số dòng trong nhóm).',
    having: 'Lọc các nhóm theo kết quả hàm gộp, ví dụ SUM(...) > 900.',
    select: 'Tính các cột đầu ra và đặt alias. Viết đầu tiên nhưng chạy sau GROUP BY / HAVING.',
    distinct: 'Bỏ các dòng trùng nhau trong kết quả.',
    order: 'Sắp xếp kết quả. Chạy sau SELECT nên dùng được alias.',
    limit: 'Chỉ giữ số dòng đầu tiên theo LIMIT / OFFSET. Chạy cuối cùng.',
  },
  en: {
    from: 'Reads the tables and joins them on the JOIN conditions. This step runs first.',
    where: 'Keeps each row that matches the condition. It runs before grouping, so aggregates and SELECT aliases are not available yet.',
    group: 'Collects rows with the same key values into one group (column row_count = rows in the group).',
    having: 'Filters groups on an aggregate result, for example SUM(...) > 900.',
    select: 'Computes the output columns and their aliases. Written first, but runs after GROUP BY / HAVING.',
    distinct: 'Removes duplicate rows from the result.',
    order: 'Sorts the result. It runs after SELECT, so aliases work here.',
    limit: 'Keeps only the first rows per LIMIT / OFFSET. Runs last.',
  },
};

export interface StepRun { key: StepKey; skipped: boolean; count?: number; sample?: QueryResult; sql?: string; error?: string }
type Ranges = Partial<Record<StepKey, [number, number]>>;
type Failure = { ok: false; reason: StepsFailure; detail?: string };
export type StepsResult = { ok: true; steps: StepRun[]; ranges: Ranges } | Failure;
type Built = { ok: true; steps: { key: StepKey; sql: string | null }[]; ranges: Ranges } | Failure;

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
  if (JSON.stringify(sel.targetList ?? []).includes('"over"')) return { ok: false, reason: 'window' };

  const wrap = async (o: Ast) =>
    deparse({ version: tree.version, stmts: [{ stmt: { SelectStmt: { limitOption: 'LIMIT_OPTION_DEFAULT', op: 'SETOP_NONE', ...o } } }] });
  const base = { fromClause: sel.fromClause, whereClause: sel.whereClause };
  // Group by the resolved expressions too: the sub-query has no SELECT alias or ordinal to refer to.
  const keys = groupKeys(sel);
  const groupTargets = [...keys.map((val) => ({ ResTarget: { val } })), COUNT];
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
  const steps: { key: StepKey; sql: string | null }[] = [];
  for (const [key, present, o] of plan) {
    if (key === 'from' && !sel.fromClause) continue; // SELECT 1: no FROM/WHERE steps at all
    if (key === 'where' && !sel.fromClause) continue;
    steps.push({ key, sql: present ? String(await wrap(o)) : null });
  }
  return { ok: true, steps, ranges: await clauseRanges(sql) };
}

export async function runSteps(db: PGlite, sql: string): Promise<StepsResult> {
  const built = await buildSteps(sql);
  if (!built.ok) return built;
  const steps: StepRun[] = [];
  for (const s of built.steps) {
    if (!s.sql) {
      steps.push({ key: s.key, skipped: true });
      continue;
    }
    try {
      const count = await runSandboxed(db, `SELECT count(*) FROM (${s.sql}) AS t`);
      const sample = await runSandboxed(db, `SELECT * FROM (${s.sql}) AS t LIMIT 5`);
      steps.push({ key: s.key, skipped: false, count: Number(count.rows[0][0]), sample, sql: s.sql });
    } catch (e) {
      steps.push({ key: s.key, skipped: false, sql: s.sql, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { ok: true, steps, ranges: built.ranges };
}
