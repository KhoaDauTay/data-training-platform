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

// ponytail: every number is compared after rounding to 2 decimals (spec §6). Values that
// straddle a rounding boundary (0.335 vs 0.33499) mismatch; switch to tolerance pairing if players hit it.
function roundKey(n: number): string {
  const s = n.toFixed(2);
  return s === '-0.00' ? '0.00' : s;
}

export function cellKey(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'number' || typeof v === 'bigint') return roundKey(Number(v));
  if (typeof v === 'string' && NUMERIC_RE.test(v)) return roundKey(Number(v));
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const rowKey = (row: unknown[]) => row.map(cellKey).join('\u0001');
const DIFF_ROWS = 3;

function columnCheck(expected: QueryResult, actual: QueryResult): ColumnCheck {
  const bag = (rows: unknown[][], i: number) => rows.map((r) => cellKey(r[i])).sort().join('\u0001');
  const e = expected.columns.map((_, i) => bag(expected.rows, i));
  const a = actual.columns.map((_, i) => bag(actual.rows, i));
  const mismatched = a.flatMap((k, i) => (k === e[i] ? [] : [i]));
  const moved = mismatched.flatMap((from) => {
    const to = e.findIndex((k, j) => j !== from && k === a[from]);
    return to < 0 ? [] : [{ from, to }];
  });
  return { mismatched, moved };
}

export function compareResults(expected: QueryResult, actual: QueryResult, ordered: boolean): GradeResult {
  if (expected.columns.length !== actual.columns.length) {
    return { ok: false, reason: 'columns', expected: expected.columns.length, actual: actual.columns.length };
  }
  const eKeys = expected.rows.map(rowKey);
  const aKeys = actual.rows.map(rowKey);
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
      expectedRows: expected.rows.length, actualRows: actual.rows.length, ...(same ? { cols: columnCheck(expected, actual) } : {}),
    };
  }
  if (ordered && eKeys.some((k, i) => k !== aKeys[i])) return { ok: false, reason: 'order' };
  return { ok: true };
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function grade(run: Runner, solutionSql: string, playerSql: string, ordered: boolean): Promise<GradeResult> {
  let actual: QueryResult;
  try {
    actual = await run(playerSql);
  } catch (e) {
    const error = sqlErrorInfo(e);
    return error ? { ok: false, reason: 'error', message: error.message, error } : { ok: false, reason: 'error', message: errorMessage(e) };
  }
  const expected = await run(solutionSql); // throws on a broken Solution: content bug, surfaced to the caller
  return compareResults(expected, actual, ordered);
}
