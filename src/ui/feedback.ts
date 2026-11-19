import { DbFailedError, DbRestartError, QueryTimeoutError, WorkerTaskError } from '../db/client';
import { sqlErrorInfo, type QueryResult } from '../db/run';
import { errorMessage, type GradeResult } from '../grader';
import { t, type Key } from '../i18n';
import { DRILL_ID, InvalidSaveError, NewerSaveError } from '../save';
import { h } from './dom';
import { formatCell, renderResult } from './resultTable';
import type { Mascot, Pose } from './mascots';
import { explainError } from './sqlErrors';

/** product-design-v2 #9: the sender's one-line reaction to a wrong answer, by reason (one voice for every department, P11). */
export function voiceKey(r: Exclude<GradeResult, { ok: true }>): Key {
  if (r.reason === 'error') return 'voice.error';
  if (r.reason === 'columns') return 'voice.columns';
  if (r.reason === 'order') return 'voice.order';
  if (r.missing && !r.extra) return 'voice.missing';
  if (r.extra && !r.missing) return 'voice.extra';
  return r.missing === r.extra ? 'voice.values' : 'voice.rowsAndValues';
}

export function gradeMessage(r: Exclude<GradeResult, { ok: true }>): string {
  switch (r.reason) {
    case 'error':
      return r.message;
    case 'columns':
      return t('grade.columns', { expected: r.expected, actual: r.actual });
    case 'order':
      return t('grade.order');
    case 'rows': {
      const parts: string[] = [];
      if (r.missing === r.extra) parts.push(t('grade.wrongValues', { n: r.missing }));
      else {
        if (r.missing) parts.push(t('grade.missing', { n: r.missing }));
        if (r.extra) parts.push(t('grade.extra', { n: r.extra }));
      }
      if (r.sample) parts.push(t('grade.sample', { row: r.sample.map((v) => formatCell(v)).join(' | ') }));
      return parts.join(' ');
    }
  }
}

/**
 * L151 (v10 N3): a wrong story, lane or E-com/Finance submit (not a drill, which has its own diff, nor an interview question or a
 * promotion review, which show no rows) offers, from the step's second wrong submit, up to 3 of the player's OWN rows that are not
 * in the answer. Never the missing rows: those are answer values (L25, L84). undefined = nothing to offer.
 */
export function extraRowsOffer(r: GradeResult, wrongs: number, tk: { id: string; beat: string }): unknown[][] | undefined {
  if (r.ok || r.reason !== 'rows' || !r.extra || !r.extraRows.length || wrongs < 2 || tk.beat === 'boss' || DRILL_ID.test(tk.id)) return undefined;
  return r.extraRows;
}

/** The offer, closed by default: the player's own column names and types (their result, not the Solution's), ≤ 3 rows. */
export function extraRowsView(result: QueryResult, rows: unknown[][], n: number, open: boolean, onToggle: (open: boolean) => void): HTMLElement {
  const d = h('details', { class: 'mt-2 text-body-sm', open, ontoggle: () => onToggle(d.open) },
    h('summary', { class: 'cursor-pointer font-semibold' }, t('work.extraRows')),
    h('div', { class: 'mt-1' }, renderResult({ columns: result.columns, types: result.types, rows }, undefined, 3, t('diff.caption', { shown: rows.length, n }))));
  return d;
}

/** Every error class carries no text of its own; this is the one place that turns them into words. */
export function errorText(e: unknown): string {
  if (e instanceof QueryTimeoutError) return t('err.timeout', { s: e.timeoutMs / 1000 });
  if (e instanceof DbRestartError) return t('err.restart');
  if (e instanceof WorkerTaskError) return e.detail ? `${t('err.task')}\n${e.detail}` : t('err.task');
  if (e instanceof DbFailedError) return `${t('err.dbFailed')}\n${e.detail}`;
  if (e instanceof NewerSaveError) return t('save.newer', { v: e.version });
  if (e instanceof InvalidSaveError) return t('save.invalid');
  return errorMessage(e) || t('err.unknown');
}

/** The teaching note for a Postgres error, in the UI language; Boon says it beside a failed Run (L59, v10 UX #8). */
export function errorNote(e: unknown, sql?: string): string | undefined {
  const info = sqlErrorInfo(e);
  const note = info && explainError(info, sql);
  return note ? t(note) : undefined;
}

/**
 * ui-ux-v7 W1: the line of `sql` that holds Postgres' 1-based character `pos`, and a caret line under it. The caret's indent copies
 * the tabs before it and drops combining marks (a decomposed Vietnamese letter is one column), so `^` sits under the right character.
 */
export function caretAt(sql: string, pos: number): { line: string; caret: string; col: number } | undefined {
  if (!(pos >= 1) || pos > sql.length + 1) return undefined;
  const before = sql.slice(0, pos - 1);
  const start = before.lastIndexOf('\n') + 1;
  const end = sql.indexOf('\n', start);
  const line = (end < 0 ? sql.slice(start) : sql.slice(start, end)).replace(/\r$/, '');
  const prefix = before.slice(start).replace(/[̀-ͯ]/g, '');
  return { line, caret: `${prefix.replace(/[^\t]/g, ' ')}^`, col: [...prefix].length + 1 };
}

/**
 * Postgres' message unchanged (a real skill to read) after its SQLSTATE chip, the SQL line with a caret at `position` (when the
 * SQL is known), then its HINT, then a teaching note in the UI language. `withNote: false` in the Result tab: Boon already explains it under the buttons.
 */
export function errorView(e: unknown, withNote = true, sql?: string): HTMLElement {
  const info = sqlErrorInfo(e);
  if (!info) return h('pre', { class: 'error' }, errorText(e));
  const note = withNote && explainError(info, sql);
  const at = sql && info.position ? caretAt(sql, info.position) : undefined;
  return h('div', { class: 'space-y-1' },
    h('p', { class: 'm-0 flex flex-wrap items-baseline gap-2' },
      h('span', { lang: 'en', class: 'rounded-(--r-chip) bg-panel px-2 text-caption font-bold tabular-nums text-bad ring-1 ring-bad/40' }, info.code),
      h('span', { lang: 'en', class: 'error font-mono text-body-sm' }, info.message)),
    at ? h('pre', { lang: 'en', class: 'm-0 overflow-x-auto font-mono text-body-sm text-ink' }, at.line, '\n',
      h('span', { class: 'font-bold text-bad', 'aria-hidden': 'true' }, at.caret), h('span', { class: 'sr-only' }, ` ${t('err.at', { n: at.col })}`)) : null,
    info.hint ? h('p', { class: 'muted m-0' }, `HINT: ${info.hint}`) : null,
    note ? h('p', { class: 'm-0 border-l-4 border-accent pl-2' }, t(note)) : null);
}

/**
 * v6 §2.4 with the L57 roles (V7): Boon explains a Postgres error that has a teaching note (thinking), or a timeout / DB restart
 * (oops). Anything else gets no mascot. Lily's cheer on a correct answer is passed by work.ts itself.
 */
export function mascotOf(error: unknown, sql?: string): [Mascot, Pose] | undefined {
  if (error instanceof QueryTimeoutError || error instanceof DbRestartError) return ['boon', 'oops'];
  const info = sqlErrorInfo(error);
  return info && explainError(info, sql) ? ['boon', 'think'] : undefined;
}

/** 1-based line of Postgres' 1-based character position `pos` in `text`. */
export const lineAt = (text: string, pos: number): number => text.slice(0, Math.max(0, pos - 1)).split('\n').length;

/** v12.0 A1: what a Run did, in one sentence: rows and columns, or the editor line of the error (`offset` = selection start). */
export function runSummary(r: { result?: QueryResult; error?: unknown; offset: number }, doc: string): string {
  if (r.result) return t('a11y.ran', { rows: r.result.rows.length, cols: r.result.columns.length });
  const pos = sqlErrorInfo(r.error)?.position;
  return pos ? t('a11y.runErrorLine', { line: lineAt(doc, r.offset + pos) }) : t('a11y.runError');
}
