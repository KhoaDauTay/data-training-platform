import type { QueryResult } from '../db/run';
import { t } from '../i18n';
import { h } from './dom';

export const MAX_ROWS = 500;
const DATE_OID = 1082;

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

/** Values are shown raw (never translated or locale-formatted). `mark` = row to flag as not matching. */
export function renderResult(r: QueryResult, mark?: unknown[]): HTMLElement {
  if (r.columns.length === 0) return h('p', { class: 'muted' }, t('res.noTable'));
  const shown = r.rows.slice(0, MAX_ROWS);
  const caption = r.truncated
    ? t('res.tooBig', { n: r.rows.length })
    : r.rows.length > MAX_ROWS
      ? t('res.shown', { n: r.rows.length, max: MAX_ROWS })
      : t('res.rows', { n: r.rows.length });
  const cell = (row: unknown[], v: unknown, i: number) =>
    h('td', { class: v === null ? 'null' : '' },
      i === 0 && row === mark ? h('span', { class: 'tag' }, t('res.mismatch')) : null,
      formatCell(v, r.types[i]));
  const body = shown.map((row) => h('tr', { class: row === mark ? 'mismatch' : '' }, ...row.map((v, i) => cell(row, v, i))));
  return h('div', { class: 'result' },
    r.rows.length === 0 ? h('p', { class: 'muted' }, t('res.empty')) : null,
    h('div', { class: 'table-wrap' },
      h('table', {},
        h('caption', {}, caption),
        h('thead', {}, h('tr', {}, ...r.columns.map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', {}, ...body))));
}
