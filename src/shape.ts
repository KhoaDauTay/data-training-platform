import type { QueryResult } from './db/run';

/** What the shape card shows per column. int and numeric are both 'number' so the card never hints at AVG. */
export type Kind = 'text' | 'number' | 'date' | 'bool';

const NUMBER = new Set([20, 21, 23, 26, 700, 701, 790, 1700]); // int8 int2 int4 oid float4 float8 money numeric
const DATE = new Set([1082, 1083, 1114, 1184, 1266]); // date time timestamp timestamptz timetz

export function kindOf(oid: number): Kind {
  if (oid === 16) return 'bool';
  if (NUMBER.has(oid)) return 'number';
  if (DATE.has(oid)) return 'date';
  return 'text';
}

/** Never carries column names or values: the Solution's names would give the answer away. */
export interface Shape { kinds: Kind[]; rows: number }

export const shapeOf = (r: QueryResult): Shape => ({ kinds: r.types.map(kindOf), rows: r.rows.length });

export function compareShape(expected: Shape, actual: Shape): { columns: boolean; kinds: boolean; rows: boolean } {
  const columns = expected.kinds.length === actual.kinds.length;
  return { columns, kinds: columns && expected.kinds.every((k, i) => k === actual.kinds[i]), rows: expected.rows === actual.rows };
}
