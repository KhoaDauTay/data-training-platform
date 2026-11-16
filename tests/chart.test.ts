import { describe, expect, it } from 'vitest';
import type { QueryResult } from '../src/db/run';
import { chartSpec } from '../src/viz/chart';
import { runner } from './helpers';

const r = (types: number[], rows: unknown[][]): QueryResult => ({ columns: types.map((_, i) => `c${i}`), types, rows });

describe('chartSpec', () => {
  it('nhãn chữ + số → cột; mọi cột số sau cột đầu đều là chuỗi giá trị', () => {
    expect(chartSpec(r([25, 20, 1700], [['a', 1, '2.5']]))).toEqual({ kind: 'bar', label: 0, values: [1, 2] });
  });
  it('ngày + số → đường', () => {
    expect(chartSpec(r([1082, 20], [[new Date(), 3]]))).toEqual({ kind: 'line', label: 0, values: [1] });
  });
  it('không vẽ khi: 1 cột, cột đầu là số, không có cột số, quá 60 dòng, rỗng', () => {
    expect(chartSpec(r([20], [[1]]))).toBeNull();
    expect(chartSpec(r([20, 20], [[1, 2]]))).toBeNull();
    expect(chartSpec(r([25, 25], [['a', 'b']]))).toBeNull();
    expect(chartSpec(r([25, 20], Array.from({ length: 61 }, () => ['a', 1])))).toBeNull();
    expect(chartSpec(r([25, 20], []))).toBeNull();
  });
  it('OID thật từ PGlite', async () => {
    const run = await runner();
    expect(chartSpec(await run('SELECT ca.name, count(*) FROM shipments s JOIN carriers ca ON ca.id = s.carrier_id GROUP BY ca.name'))?.kind).toBe('bar');
    expect(chartSpec(await run("SELECT date_trunc('month', booking_date)::date, count(*) FROM shipments GROUP BY 1 ORDER BY 1"))?.kind).toBe('line');
    expect(chartSpec(await run('SELECT mode, AVG(gross_weight_kg) FROM shipments GROUP BY mode'))?.kind).toBe('bar');
  });
});
