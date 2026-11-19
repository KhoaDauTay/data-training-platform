import type { QueryResult } from '../db/run';

/**
 * ENG-CORE (engine-ux-spec, coordinator decision 3): the lab's "Bên trong" view of a Postgres pageinspect result
 * (`heap_page_items(get_raw_page(…))`). Pure: rows in, decoded rows out; the page draws the table.
 * Needs `lp` and `t_ctid`; `lp_flags`, `t_xmin`, `t_xmax`, `t_infomask`, `t_infomask2` are used when present.
 */
export const HEAP_NEEDS = ['lp', 't_ctid'] as const;
const HEAP_COLS = ['lp', 'lp_flags', 't_xmin', 't_xmax', 't_ctid', 't_infomask', 't_infomask2'];
const LP_FLAGS = ['unused', 'normal', 'redirect', 'dead'];
const INFOMASK: [number, string][] = [
  [0x0001, 'HASNULL'], [0x0002, 'HASVARWIDTH'], [0x0004, 'HASEXTERNAL'], [0x0010, 'XMAX_KEYSHR_LOCK'], [0x0020, 'COMBOCID'],
  [0x0040, 'XMAX_EXCL_LOCK'], [0x0080, 'XMAX_LOCK_ONLY'], [0x0100, 'XMIN_COMMITTED'], [0x0200, 'XMIN_INVALID'],
  [0x0400, 'XMAX_COMMITTED'], [0x0800, 'XMAX_INVALID'], [0x1000, 'XMAX_IS_MULTI'], [0x2000, 'UPDATED'],
];
const INFOMASK2: [number, string][] = [[0x2000, 'KEYS_UPDATED'], [0x4000, 'HOT_UPDATED'], [0x8000, 'HEAP_ONLY']];

/** t_infomask / t_infomask2 bits by name (src/include/access/htup_details.h); XMIN_FROZEN = both XMIN bits. */
export function decodeInfomask(mask?: number, mask2?: number): string[] {
  const out: string[] = [];
  if (mask !== undefined) {
    if ((mask & 0x0300) === 0x0300) out.push('XMIN_FROZEN');
    for (const [bit, name] of INFOMASK) if (mask & bit && !((mask & 0x0300) === 0x0300 && (bit === 0x0100 || bit === 0x0200))) out.push(name);
  }
  if (mask2 !== undefined) for (const [bit, name] of INFOMASK2) if (mask2 & bit) out.push(name);
  return out;
}

export interface HeapRow { lp: string; flag: string; xmin: string; xmax: string; ctid: string; flags: string[] }
/** undefined: not a pageinspect result (no heap column). `missing`: heap columns but not enough to draw the page. */
export function heapView(r: Pick<QueryResult, 'columns' | 'rows'>): { missing: string[] } | { rows: HeapRow[]; dead: number; hot: number } | undefined {
  const at = (c: string): number => r.columns.indexOf(c);
  if (!HEAP_COLS.some((c) => at(c) !== -1)) return undefined;
  const missing = HEAP_NEEDS.filter((c) => at(c) === -1);
  if (missing.length) return { missing: [...missing] };
  const cell = (row: unknown[], c: string): string => (at(c) === -1 || row[at(c)] === null || row[at(c)] === undefined ? '' : String(row[at(c)]));
  const num = (row: unknown[], c: string): number | undefined => (cell(row, c) === '' ? undefined : Number(cell(row, c)));
  const rows = r.rows.map((row) => {
    const f = num(row, 'lp_flags');
    return { lp: cell(row, 'lp'), flag: f === undefined ? '' : LP_FLAGS[f] ?? String(f), xmin: cell(row, 't_xmin'), xmax: cell(row, 't_xmax'),
      ctid: cell(row, 't_ctid'), flags: decodeInfomask(num(row, 't_infomask'), num(row, 't_infomask2')) };
  });
  return { rows, dead: rows.filter((x) => x.flag === 'dead' || x.flag === 'redirect').length, hot: rows.filter((x) => x.flags.includes('HOT_UPDATED')).length };
}
