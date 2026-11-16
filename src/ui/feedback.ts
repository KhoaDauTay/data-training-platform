import { DbFailedError, DbRestartError, QueryTimeoutError } from '../db/client';
import { sqlErrorInfo } from '../db/run';
import { errorMessage, type GradeResult } from '../grader';
import { t } from '../i18n';
import { InvalidSaveError, NewerSaveError } from '../save';
import { h } from './dom';
import { formatCell } from './resultTable';
import { explainError } from './sqlErrors';

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

/** Every error class carries no text of its own; this is the one place that turns them into words. */
export function errorText(e: unknown): string {
  if (e instanceof QueryTimeoutError) return t('err.timeout', { s: e.timeoutMs / 1000 });
  if (e instanceof DbRestartError) return t('err.restart');
  if (e instanceof DbFailedError) return `${t('err.dbFailed')}\n${e.detail}`;
  if (e instanceof NewerSaveError) return t('save.newer', { v: e.version });
  if (e instanceof InvalidSaveError) return t('save.invalid');
  return errorMessage(e) || t('err.unknown');
}

/** Postgres' message unchanged (a real skill to read), then its HINT, then a teaching note in the UI language. */
export function errorView(e: unknown): HTMLElement {
  const info = sqlErrorInfo(e);
  if (!info) return h('pre', { class: 'error' }, errorText(e));
  const note = explainError(info);
  return h('div', { class: 'sql-error' },
    h('pre', { class: 'error' }, info.message),
    info.hint ? h('p', { class: 'muted' }, `HINT: ${info.hint}`) : null,
    note ? h('p', { class: 'explain' }, t(note)) : null);
}
