import type { QueryResult } from '../db/run';
import { t } from '../i18n';
import { cx } from '../theme';
import { h } from './dom';

export const MAX_ROWS = 500;
const DATE_OID = 1082;
/** int2/4/8, oid, float4/8, numeric: right-aligned with tabular figures so digits line up (Plan 8b 8.1). */
const NUMERIC_OIDS = new Set([20, 21, 23, 26, 700, 701, 1700]);

/**
 * `type` omitted (e.g. grader samples): a Date at UTC midnight is shown as a plain date. Timestamps are shown in the
 * session's time zone (UTC in PGlite), the way psql prints them, never the machine's: date_trunc('month', d) is
 * "2026-07-01 00:00:00", not "07:00:00" in Vietnam.
 */
export function formatCell(v: unknown, type?: number): string {
  if (v === null || v === undefined) return 'NULL';
  if (v instanceof Date) {
    const midnight = v.getUTCHours() === 0 && v.getUTCMinutes() === 0 && v.getUTCSeconds() === 0;
    return type === DATE_OID || (type === undefined && midnight) ? v.toISOString().slice(0, 10) : v.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** ui-ux-v7 W1: the column type under its name (Postgres' own short names); unknown OIDs show nothing. */
const TYPE_NAMES: Record<number, string> = {
  16: 'bool', 18: 'char', 20: 'bigint', 21: 'smallint', 23: 'int', 25: 'text', 26: 'oid', 114: 'json', 700: 'real', 701: 'float', 1042: 'char',
  1043: 'varchar', 1082: 'date', 1083: 'time', 1114: 'timestamp', 1184: 'timestamptz', 1186: 'interval', 1700: 'numeric', 2950: 'uuid', 3802: 'jsonb',
};
export const typeName = (oid: number | undefined): string => (oid === undefined ? '' : TYPE_NAMES[oid] ?? '');
/** D-U10: one row × one column also shows as a big number above the table (the table stays: grading compares tables). */
export const isSingleValue = (r: QueryResult): boolean => r.rows.length === 1 && r.columns.length === 1;

export interface ResultOpts {
  /** The Result tab (W1): the table fills the panel and is its only scroll area, the caption moves into the status bar, 1×1 gets the number card. */
  fill?: boolean;
  /** Column types under the names (default on). Off where a type would hint at the answer (L25: "Expected result", the diff). */
  types?: boolean;
}

/**
 * Values are shown raw (never translated or locale-formatted). `mark` = row to flag as not matching. `limit`: rows drawn
 * (a lesson example shows 8 and a "+N more rows" line, Plan 8b 8.3; the Result tab keeps MAX_ROWS). `title` replaces the caption.
 * ui-ux-v7 W1: content-wide table, a muted row-number column (the mismatch chip sits there), types under the names, faint stripes,
 * NULL as a small chip.
 */
export function renderResult(r: QueryResult, mark?: unknown[], limit = MAX_ROWS, title?: string, opts: ResultOpts = {}): HTMLElement {
  if (r.columns.length === 0) return h('p', { class: 'muted' }, t('res.noTable'));
  const { fill = false, types = true } = opts;
  const shown = r.rows.slice(0, limit);
  const num = r.columns.map((_, i) => NUMERIC_OIDS.has(r.types[i]));
  const plain = !title && !r.truncated && r.rows.length <= MAX_ROWS; // only "n rows": the Result tab's status bar already says it
  const caption = title ?? (r.truncated
    ? t('res.tooBig', { n: r.rows.length })
    : r.rows.length > MAX_ROWS
      ? t('res.shown', { n: r.rows.length, max: MAX_ROWS })
      : t('res.rows', { n: r.rows.length }));
  const cell = (v: unknown, i: number) =>
    h('td', { class: cx(num[i] && 'text-right tabular-nums') },
      v === null || v === undefined ? h('span', { class: 'rounded px-1 text-caption italic text-muted bg-surface-2' }, 'NULL') : formatCell(v, r.types[i]));
  const body = shown.map((row, n) => {
    const bad = row === mark;
    return h('tr', { class: bad ? 'bg-bad-soft' : 'even:bg-surface-2/60' },
      h('td', { class: cx('text-right text-caption tabular-nums text-muted select-none', bad && 'border-l-[3px] border-l-bad') },
        bad ? h('span', { class: 'mr-1 rounded-(--r-chip) bg-bad px-1.5 font-bold text-on-accent' }, t('res.mismatch')) : null, String(n + 1)),
      ...row.map((v, i) => cell(v, i)));
  });
  const one = fill && isSingleValue(r)
    ? h('div', { class: 'mb-2 inline-flex flex-col self-start rounded-(--r-ctl) bg-surface-2 px-5 py-3', 'aria-hidden': 'true' },
      h('span', { class: 'text-caption text-muted' }, r.columns[0]),
      h('span', { class: 'text-display tabular-nums' }, formatCell(r.rows[0][0], r.types[0])))
    : null;
  return h('div', { class: cx('result', fill && 'flex min-h-0 flex-1 flex-col') },
    r.rows.length === 0 ? h('p', { class: 'muted' }, t('res.empty')) : null,
    one,
    h('div', { class: cx('overflow-auto rounded-(--r-inset) ring-1 ring-line', fill ? 'max-h-[60dvh] min-h-0 flex-1 shell:max-h-none' : 'max-h-[420px]') },
      h('table', { class: 'w-auto' },
        h('caption', { class: fill && plain ? 'sr-only' : '' }, caption),
        h('thead', {}, h('tr', {},
          h('th', { scope: 'col', class: 'sticky top-0 w-px bg-surface-2 text-right text-caption font-normal text-muted' }, h('span', { class: 'sr-only' }, t('res.rowNum')), '#'),
          ...r.columns.map((c, i) => h('th', { scope: 'col', class: cx('sticky top-0 bg-surface-2 align-bottom font-semibold text-ink', num[i] && 'text-right') },
            c, types && typeName(r.types[i]) ? h('span', { class: 'block text-caption font-normal text-muted' }, typeName(r.types[i])) : null)))),
        h('tbody', {}, ...body)),
      limit < MAX_ROWS && r.rows.length > limit ? h('p', { class: 'm-0 px-2 py-1 text-body-sm text-muted' }, t('res.more', { n: r.rows.length - limit })) : null));
}
