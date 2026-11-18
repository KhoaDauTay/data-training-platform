import { sqlErrorInfo, type QueryResult, type SqlErrorInfo } from './db/run';

export type GradeResult =
  | { ok: true }
  /** `error` is set when the player's query failed with a Postgres error (position for the editor). */
  | { ok: false; reason: 'error'; message: string; error?: SqlErrorInfo }
  | { ok: false; reason: 'columns'; expected: number; actual: number }
  /**
   * `sample` is the first player row with no match (marked in the Result tab by identity). L84 (lesson Thử ngay and drills
   * only; story feedback reads missing/extra/sample): up to 3 player rows not in the answer, up to 3 answer rows missing,
   * both row counts, and `cols` when the counts are equal (column analysis).
   */
  | { ok: false; reason: 'rows'; missing: number; extra: number; sample?: unknown[]; extraRows: unknown[][]; missingRows: unknown[][]; expectedRows: number; actualRows: number; cols?: ColumnCheck }
  | { ok: false; reason: 'order' };

/**
 * Per column, as a multiset of values (only when both results have as many rows): `mismatched` = 0-based positions whose
 * values differ from the answer's same column; `moved` = a mismatched player column holding exactly the values of another
 * answer column (both ways = two columns swapped). All columns matching while rows differ = values paired wrongly.
 */
export interface ColumnCheck { mismatched: number[]; moved: { from: number; to: number }[] }

export type Runner = (sql: string) => Promise<QueryResult>;

const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

// ponytail: without `precision` every number is compared after rounding to 2 decimals (spec §6). Values that
// straddle a rounding boundary (0.335 vs 0.33499) mismatch; switch to tolerance pairing if players hit it.
// L4 (v12.0 D10-12): a step with `precision: p` grades rounding: a value not already at p decimals never matches.
function roundKey(n: number, p = 2, strict = false): string {
  const s = n.toFixed(p);
  const key = /^-0(\.0*)?$/.test(s) ? s.slice(1) : s;
  return strict && Math.abs(n - Number(s)) > 1e-9 ? `${key}~` : key;
}

const ymd = (y: number, m: number, d: number): string => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * PGlite parses `date` as UTC midnight but `timestamp` (no time zone) as local time, so `date_trunc('month', ts)` and the
 * same month as a `date` are different instants outside UTC. A Date at exactly UTC midnight, or else at exactly local
 * midnight, is keyed by its calendar day; any other instant keeps its ISO text.
 */
function dateKey(v: Date): string {
  if (v.getUTCHours() === 0 && v.getUTCMinutes() === 0 && v.getUTCSeconds() === 0 && v.getUTCMilliseconds() === 0) return ymd(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate());
  if (v.getHours() === 0 && v.getMinutes() === 0 && v.getSeconds() === 0 && v.getMilliseconds() === 0) return ymd(v.getFullYear(), v.getMonth(), v.getDate());
  return v.toISOString();
}

export function cellKey(v: unknown, precision?: number): string {
  const num = (n: number): string => roundKey(n, precision ?? 2, precision !== undefined);
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'number' || typeof v === 'bigint') return num(Number(v));
  if (typeof v === 'string' && NUMERIC_RE.test(v)) return num(Number(v));
  if (v instanceof Date) return dateKey(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const rowKey = (row: unknown[], precision?: number) => row.map((c) => cellKey(c, precision)).join('\u0001');
const DIFF_ROWS = 3;

function columnCheck(expected: QueryResult, actual: QueryResult, precision?: number): ColumnCheck {
  const bag = (rows: unknown[][], i: number) => rows.map((r) => cellKey(r[i], precision)).sort().join('\u0001');
  const e = expected.columns.map((_, i) => bag(expected.rows, i));
  const a = actual.columns.map((_, i) => bag(actual.rows, i));
  const mismatched = a.flatMap((k, i) => (k === e[i] ? [] : [i]));
  const moved = mismatched.flatMap((from) => {
    const to = e.findIndex((k, j) => j !== from && k === a[from]);
    return to < 0 ? [] : [{ from, to }];
  });
  return { mismatched, moved };
}

export function compareResults(expected: QueryResult, actual: QueryResult, ordered: boolean, precision?: number): GradeResult {
  if (expected.columns.length !== actual.columns.length) {
    return { ok: false, reason: 'columns', expected: expected.columns.length, actual: actual.columns.length };
  }
  const eKeys = expected.rows.map((r) => rowKey(r, precision));
  const aKeys = actual.rows.map((r) => rowKey(r, precision));
  const remaining = new Map<string, number>();
  for (const k of eKeys) remaining.set(k, (remaining.get(k) ?? 0) + 1);
  let extra = 0;
  let sample: unknown[] | undefined;
  const extraRows: unknown[][] = [];
  actual.rows.forEach((row, i) => {
    const n = remaining.get(aKeys[i]) ?? 0;
    if (n > 0) remaining.set(aKeys[i], n - 1);
    else {
      extra++;
      sample ??= row;
      if (extraRows.length < DIFF_ROWS) extraRows.push(row);
    }
  });
  let missing = 0;
  for (const n of remaining.values()) missing += n;
  if (missing || extra) {
    const missingRows: unknown[][] = [];
    const left = new Map(remaining);
    expected.rows.forEach((row, i) => {
      const n = left.get(eKeys[i]) ?? 0;
      if (n > 0 && missingRows.length < DIFF_ROWS) {
        left.set(eKeys[i], n - 1);
        missingRows.push(row);
      }
    });
    const same = expected.rows.length === actual.rows.length;
    return {
      ok: false, reason: 'rows', missing, extra, sample, extraRows, missingRows,
      expectedRows: expected.rows.length, actualRows: actual.rows.length, ...(same ? { cols: columnCheck(expected, actual, precision) } : {}),
    };
  }
  if (ordered && eKeys.some((k, i) => k !== aKeys[i])) return { ok: false, reason: 'order' };
  return { ok: true };
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function grade(run: Runner, solutionSql: string, playerSql: string, ordered: boolean, precision?: number): Promise<GradeResult> {
  let actual: QueryResult;
  try {
    actual = await run(playerSql);
  } catch (e) {
    const error = sqlErrorInfo(e);
    return error ? { ok: false, reason: 'error', message: error.message, error } : { ok: false, reason: 'error', message: errorMessage(e) };
  }
  const expected = await run(solutionSql); // throws on a broken Solution: content bug, surfaced to the caller
  return compareResults(expected, actual, ordered, precision);
}
