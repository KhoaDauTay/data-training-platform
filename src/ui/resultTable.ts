import type { QueryResult } from '../db/run';
import { t } from '../i18n';
import { cx } from '../theme';
import { h } from './dom';

export const MAX_ROWS = 500;
const DATE_OID = 1082;
/** int2/4/8, oid, float4/8, numeric: right-aligned with tabular figures so digits line up (Plan 8b 8.1). */
const NUMERIC_OIDS = new Set([20, 21, 23, 26, 700, 701, 1700]);

/** `type` omitted (e.g. grader samples): a Date at UTC midnight is shown as a plain date. */
export function formatCell(v: unknown, type?: number): string {
  if (v === null || v === undefined) return 'NULL';
  if (v instanceof Date) {
    const midnight = v.getUTCHours() === 0 && v.getUTCMinutes() === 0 && v.getUTCSeconds() === 0;
    return type === DATE_OID || (type === undefined && midnight) ? v.toISOString().slice(0, 10) : v.toLocaleString('sv-SE');
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/**
 * Values are shown raw (never translated or locale-formatted). `mark` = row to flag as not matching. `limit`: rows drawn
 * (a lesson example shows 8 and a "+N more rows" line, Plan 8b 8.3; the Result tab keeps MAX_ROWS). `title` replaces the caption.
 */
export function renderResult(r: QueryResult, mark?: unknown[], limit = MAX_ROWS, title?: string): HTMLElement {
  if (r.columns.length === 0) return h('p', { class: 'muted' }, t('res.noTable'));
  const shown = r.rows.slice(0, limit);
  const num = r.columns.map((_, i) => NUMERIC_OIDS.has(r.types[i]));
  const caption = title ?? (r.truncated
    ? t('res.tooBig', { n: r.rows.length })
    : r.rows.length > MAX_ROWS
      ? t('res.shown', { n: r.rows.length, max: MAX_ROWS })
      : t('res.rows', { n: r.rows.length }));
  const cell = (row: unknown[], v: unknown, i: number) =>
    h('td', { class: cx(v === null && 'italic text-muted', num[i] && 'text-right tabular-nums') },
      i === 0 && row === mark ? h('span', { class: 'tag' }, t('res.mismatch')) : null,
      formatCell(v, r.types[i]));
  const body = shown.map((row) => h('tr', { class: row === mark ? 'bg-accent-soft' : '' }, ...row.map((v, i) => cell(row, v, i))));
  return h('div', { class: 'result' },
    r.rows.length === 0 ? h('p', { class: 'muted' }, t('res.empty')) : null,
    h('div', { class: 'max-h-[420px] overflow-auto rounded-xl ring-1 ring-line' },
      h('table', {},
        h('caption', {}, caption),
        h('thead', {}, h('tr', {}, ...r.columns.map((c, i) => h('th', { scope: 'col', class: cx('sticky top-0 bg-canvas font-semibold text-muted', num[i] && 'text-right') }, c)))),
        h('tbody', {}, ...body)),
      limit < MAX_ROWS && r.rows.length > limit ? h('p', { class: 'm-0 px-2 py-1 text-sm text-muted' }, t('res.more', { n: r.rows.length - limit })) : null));
}
