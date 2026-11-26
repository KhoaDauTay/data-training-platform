import type { DbClient } from '../db/client';
import type { SchemaId } from '../domains';
import { getLang, t } from '../i18n';
import { INTERVIEW_ID, ticketOfKey, type Save } from '../save';
import type { Ticket } from '../tickets';
import { whyRequest } from '../viz/stepText';
import { h, loader } from './dom';
import { formatCell } from './resultTable';

/**
 * V22-B (L206): the "Vì sao?" button of each result row (main bundle, a few hundred bytes); the explanation is the lazy
 * chunk `whyView`. Only for SQL that groups, joins or aggregates (a text check; the worker says "not yet" for the rest).
 */
type WhyDb = Pick<DbClient, 'loadParser' | 'steps'>;
let db: WhyDb | undefined;
export const initWhy = (d: WhyDb): void => void (db = d);

const EXPLAINS = /\b(group\s+by|join|count|sum|avg|min|max)\b/i;

/**
 * D-V22-6: no button in the interview room, on an index lab step, or on a promotion-review step not yet passed (`key` is
 * the run's own stepKey, which may be an earlier step than the open one).
 */
export function whyOpen(key: string, tickets: Ticket[], save: Pick<Save, 'completed' | 'bossStep'>): boolean {
  const id = ticketOfKey(key);
  if (INTERVIEW_ID.test(id) || id.startsWith('cs-')) return false; // v47: a domain case is graded like a take-home
  const tk = tickets.find((x) => x.id === id);
  const step = Number(key.split('#')[1] ?? 0);
  if (!tk) return true;
  if (tk.steps[step]?.lab) return false;
  return tk.beat !== 'boss' || save.completed.includes(id) || (save.bossStep[id] ?? 0) > step;
}

type View = typeof import('./whyView');
let view: Promise<View> | undefined;
const loadView = (): Promise<View> => (view ??= import('./whyView').then((m) => {
  m.init({ h, loader, formatCell, getLang });
  return m;
}, (e: unknown) => {
  view = undefined; // a failed download retries on the next click
  throw e;
}));

/** The `why` option of renderResult for a result of `sql`, or undefined when there is nothing to explain. */
export function whyCell(sql: string, schema: SchemaId | undefined, types: number[]): ((row: unknown[], span: number) => Node) | undefined {
  if (!db || !EXPLAINS.test(sql)) return undefined;
  const d = db;
  return (row, span) => h('button', {
    type: 'button', 'aria-expanded': 'false',
    class: 'mr-1 min-h-6 rounded-(--r-chip) px-1.5 text-caption font-semibold text-ink ring-1 ring-line hover:bg-accent-soft',
    onclick: (e: Event) => {
      const btn = e.currentTarget as HTMLButtonElement;
      loadView().then((m) => m.toggle(btn, span, () => d.loadParser().then(() => d.steps(whyRequest(sql, row, types), schema ? { schema } : {}))),
        () => btn.after(h('span', { class: 'bad text-caption', role: 'status' }, t('why.failed'))));
    },
  }, t('why.btn'));
}
