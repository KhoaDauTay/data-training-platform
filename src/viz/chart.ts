import type { QueryResult } from '../db/run';

/** int2, int4, int8, float4, float8, numeric */
const NUMERIC = new Set([21, 23, 20, 700, 701, 1700]);
/** date, timestamp, timestamptz */
const TEMPORAL = new Set([1082, 1114, 1184]);
export const MAX_POINTS = 60;

export type ChartSpec = { kind: 'bar' | 'line'; label: number; values: number[] };

export function chartSpec(r: QueryResult): ChartSpec | null {
  if (r.rows.length === 0 || r.rows.length > MAX_POINTS || r.columns.length < 2) return null;
  const values = r.types.map((t, i) => (i > 0 && NUMERIC.has(t) ? i : -1)).filter((i) => i > 0);
  if (values.length === 0) return null;
  if (TEMPORAL.has(r.types[0])) return { kind: 'line', label: 0, values };
  if (NUMERIC.has(r.types[0])) return null;
  return { kind: 'bar', label: 0, values };
}

/** Value axis for bars and lines: always contains 0 (the baseline), so 0–1 ratios and negatives scale as they are. Only an all-zero series needs a guard. */
export function valueRange(values: number[]): [number, number] {
  const finite = values.filter(Number.isFinite); // 'NaN'::numeric and 'Infinity'::float8 are valid Postgres values
  const lo = Math.min(0, ...finite);
  const hi = Math.max(0, ...finite);
  return lo === hi ? [lo, lo + 1] : [lo, hi];
}
