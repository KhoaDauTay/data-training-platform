import { sqlErrorInfo, type QueryResult, type SqlErrorInfo } from './db/run';

export type GradeResult =
  | { ok: true }
  /** `error` is set when the player's query failed with a Postgres error (position for the editor). */
  | { ok: false; reason: 'error'; message: string; error?: SqlErrorInfo }
  | { ok: false; reason: 'columns'; expected: number; actual: number }
  | { ok: false; reason: 'rows'; missing: number; extra: number; sample?: unknown[] }
  | { ok: false; reason: 'order' };

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
  actual.rows.forEach((row, i) => {
    const n = remaining.get(aKeys[i]) ?? 0;
    if (n > 0) remaining.set(aKeys[i], n - 1);
    else {
      extra++;
      sample ??= row;
    }
  });
  let missing = 0;
  for (const n of remaining.values()) missing += n;
  if (missing || extra) return { ok: false, reason: 'rows', missing, extra, sample };
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
