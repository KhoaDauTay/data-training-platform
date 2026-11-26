import type { QueryResult } from '../db/run';
import { t } from '../i18n';
import { cx } from '../theme';
import { h, reducedMotion } from './dom';

export const MAX_ROWS = 500;
const DATE_OID = 1082;
/** int2/4/8, oid, float4/8, numeric: right-aligned with tabular figures so digits line up (Plan 8b 8.1). */
const NUMERIC_OIDS = new Set([20, 21, 23, 26, 700, 701, 1700]);

const TIMESTAMP_OID = 1114;
const p2 = (n: number): string => String(n).padStart(2, '0');
/** psql's text: `YYYY-MM-DD HH:MM:SS[.fff]` (fraction only when non-zero, trailing zeros dropped). */
const stamp = (y: number, mo: number, d: number, h: number, mi: number, s: number, ms: number): string =>
  `${y}-${p2(mo + 1)}-${p2(d)} ${p2(h)}:${p2(mi)}:${p2(s)}${ms ? `.${String(ms).padStart(3, '0').replace(/0+$/, '')}` : ''}`;
/**
 * Values print exactly as Postgres prints them, never shifted by the viewer's time zone (v45 S-00). PGlite parses
 * `timestamp` (1114, no zone) as LOCAL wall-clock time, `date` (1082) as UTC midnight and `timestamptz` (1184) as the real
 * instant; so 1114 is read back with the local getters, 1082 and 1184 with the UTC ones (timestamptz in the session zone,
 * UTC in PGlite, as psql shows it: date_trunc('month', d) is "2026-07-01 00:00:00", not "07:00:00" in Vietnam).
 * `type` omitted (e.g. grader samples): UTC midnight = a date, else the local wall clock (a `timestamp`, the common case).
 */
export function formatCell(v: unknown, type?: number): string {
  if (v === null || v === undefined) return 'NULL';
  if (v instanceof Date) {
    const utcMidnight = v.getUTCHours() === 0 && v.getUTCMinutes() === 0 && v.getUTCSeconds() === 0 && v.getUTCMilliseconds() === 0;
    if (type === DATE_OID || (type === undefined && utcMidnight)) return v.toISOString().slice(0, 10);
    if (type === TIMESTAMP_OID || type === undefined)
      return stamp(v.getFullYear(), v.getMonth(), v.getDate(), v.getHours(), v.getMinutes(), v.getSeconds(), v.getMilliseconds());
    return stamp(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate(), v.getUTCHours(), v.getUTCMinutes(), v.getUTCSeconds(), v.getUTCMilliseconds());
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

/** L153 (v10 A4): results that just came back from a Run/Submit (work.ts), with the time they arrived. */
const arrived = new WeakMap<QueryResult, number>();
/** Marks `r` as just arrived: its table, drawn within the next 800 ms, fades its first rows in once. */
export const markArrived = (r: QueryResult): void => void arrived.set(r, Date.now());
/** A redraw later (tab switch, language) never replays it; a redraw inside the window replays at most 400 ms of fade. */
const ARRIVAL_MS = 800;
/** Opacity only, on the first 10 rows, 25 ms apart, 150 ms each: ≤ 375 ms. None under reduced motion (Element.animate ignores the CSS rule). */
function fadeIn(rows: HTMLElement[]): void {
  if (reducedMotion()) return;
  rows.slice(0, 10).forEach((tr, i) => tr.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 150, delay: i * 25, easing: 'ease-out', fill: 'backwards' }));
}

export interface ResultOpts {
  /** The Result tab (W1): the table fills the panel and is its only scroll area, the caption moves into the status bar, 1×1 gets the number card. */
  fill?: boolean;
  /** Column types under the names (default on). Off where a type would hint at the answer (L25: "Expected result", the diff). */
  types?: boolean;
  /** V22-B (L206): a control in each row's number cell (`whyCell`, src/ui/whyButton.ts); `span` = cells in a row. */
  why?: (row: unknown[], span: number) => Node;
  /** v45 S-05: false = no "0 rows, check WHERE/JOIN" line (a dbt-style test lesson, where 0 rows means the test passes). */
  empty?: false;
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
        bad ? h('span', { class: 'mr-1 rounded-(--r-chip) bg-bad px-1.5 font-bold text-on-accent' }, t('res.mismatch')) : null,
        opts.why?.(row, r.columns.length + 1) ?? null, String(n + 1)),
      ...row.map((v, i) => cell(v, i)));
  });
  const at = arrived.get(r);
  if (at !== undefined && Date.now() - at < ARRIVAL_MS) fadeIn(body);
  const one = fill && isSingleValue(r)
    ? h('div', { class: 'mb-2 inline-flex flex-col self-start rounded-(--r-ctl) bg-surface-2 px-5 py-3', 'aria-hidden': 'true' },
      h('span', { class: 'text-caption text-muted' }, r.columns[0]),
      h('span', { class: 'text-display tabular-nums' }, formatCell(r.rows[0][0], r.types[0])))
    : null;
  return h('div', { class: cx('result', fill && 'flex min-h-0 flex-1 flex-col') },
    r.rows.length === 0 && opts.empty !== false ? h('p', { class: 'muted' }, t('res.empty')) : null,
    one,
    // V20-C: keyboard-scrollable (axe). v21 U9: the frame hugs the table (no empty boxed half); in the Result tab it takes the rows'
    // height and shrinks to the panel (flex 0 1 auto), so it scrolls only when the rows do not fit.
    h('div', { tabindex: '0', class: cx('w-fit max-w-full overflow-auto [scrollbar-gutter:stable] rounded-(--r-inset) ring-1 ring-line', fill ? 'max-h-[60dvh] min-h-0 shell:max-h-none' : 'max-h-[420px]') },
      h('table', { class: 'w-auto' },
        h('caption', { class: fill && plain ? 'sr-only' : '' }, caption),
        h('thead', {}, h('tr', {},
          h('th', { scope: 'col', class: 'sticky top-0 w-px bg-surface-2 text-right text-caption font-normal text-muted' }, h('span', { class: 'sr-only' }, t('res.rowNum')), '#'),
          ...r.columns.map((c, i) => h('th', { scope: 'col', class: cx('sticky top-0 bg-surface-2 align-bottom font-semibold text-ink', num[i] && 'text-right') },
            c, types && typeName(r.types[i]) ? h('span', { class: 'block text-caption font-normal text-muted' }, typeName(r.types[i])) : null)))),
        h('tbody', {}, ...body)),
      limit < MAX_ROWS && r.rows.length > limit ? h('p', { class: 'm-0 px-2 py-1 text-body-sm text-muted' }, t('res.more', { n: r.rows.length - limit })) : null));
}
