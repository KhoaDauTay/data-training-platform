import { DbFailedError, DbRestartError, QueryTimeoutError, WorkerTaskError } from '../db/client';
import { sqlErrorInfo } from '../db/run';
import { errorMessage, type GradeResult } from '../grader';
import { t, type Key } from '../i18n';
import { InvalidSaveError, NewerSaveError } from '../save';
import { h } from './dom';
import { formatCell } from './resultTable';
import type { Mascot, Pose } from './mascots';
import { explainError } from './sqlErrors';

/** product-design-v2 #9: the sender's one-line reaction to a wrong answer, by reason (one voice for every department, P11). */
export function voiceKey(r: Exclude<GradeResult, { ok: true }>): Key {
  if (r.reason === 'error') return 'voice.error';
  if (r.reason === 'columns') return 'voice.columns';
  if (r.reason === 'order') return 'voice.order';
  if (r.missing && !r.extra) return 'voice.missing';
  if (r.extra && !r.missing) return 'voice.extra';
  return 'voice.values';
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
export function errorNote(e: unknown): string | undefined {
  const info = sqlErrorInfo(e);
  const note = info && explainError(info);
  return note ? t(note) : undefined;
}

/**
 * Postgres' message unchanged (a real skill to read), then its HINT, then a teaching note in the UI language.
 * `withNote: false` in the Result tab: Boon already explains it under the buttons.
 */
export function errorView(e: unknown, withNote = true): HTMLElement {
  const info = sqlErrorInfo(e);
  if (!info) return h('pre', { class: 'error' }, errorText(e));
  const note = withNote && explainError(info);
  return h('div', { class: 'space-y-1' },
    h('pre', { class: 'error' }, info.message),
    info.hint ? h('p', { class: 'muted' }, `HINT: ${info.hint}`) : null,
    note ? h('p', { class: 'border-l-4 border-accent pl-2' }, t(note)) : null);
}

/**
 * v6 §2.4 with the L57 roles (V7): Boon explains a Postgres error that has a teaching note (thinking), or a timeout / DB restart
 * (oops). Anything else gets no mascot. Lily's cheer on a correct answer is passed by work.ts itself.
 */
export function mascotOf(error: unknown): [Mascot, Pose] | undefined {
  if (error instanceof QueryTimeoutError || error instanceof DbRestartError) return ['boon', 'oops'];
  const info = sqlErrorInfo(error);
  return info && explainError(info) ? ['boon', 'think'] : undefined;
}
