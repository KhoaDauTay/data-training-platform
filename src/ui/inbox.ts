import { getLang, t } from '../i18n';
import { roleLine } from '../people';
import { isOptional, passedChapters, visibleTickets } from '../progress';
import { actions, app, done, unlockedTables } from '../state';
import { cx, DEPT_CHIP, deptColor } from '../theme';
import { textOf, type Ticket } from '../tickets';
import { avatar } from './avatar';
import { readJson, writeJson } from '../storage';
import { byId, h } from './dom';
import { noDomain, setActionButton } from './topbar';

/**
 * L313: task ids the player has seen in the Inbox (device pref, any domain, never the Save). The badge counts open tasks not
 * seen yet, so opening and closing the Inbox clears it; a newly opened task raises it again.
 */
export const INBOX_SEEN_KEY = 'cargo-query/inbox-seen';
const readSeen = (): string[] => {
  const v = readJson<unknown>(INBOX_SEEN_KEY);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length <= 60).slice(-600) : [];
};
export const unseenCount = (fresh: readonly string[], seen: readonly string[]): number => fresh.filter((id) => !seen.includes(id)).length;
let freshIds: string[] = [];
/** The Inbox dialog closed: everything it listed as new has been seen. */
export function markInboxSeen(): void {
  const seen = readSeen();
  writeJson(INBOX_SEEN_KEY, [...seen, ...freshIds.filter((id) => !seen.includes(id))].slice(-600));
}

/** One conversation per colleague (L18 ★1): the thread with the newest ticket first, newest ticket first inside it. */
export function renderInbox(): void {
  const d = done();
  const visible = visibleTickets(app.tickets, d);
  const passed = passedChapters(app.tickets, d);
  const fresh = visible.filter((x) => !d.has(x.id) && !isOptional(x, d, passed)).length; // L145: optional tasks are no news
  // v15: the open domain's mail is no news to a "SQL only" player or in the General workspace (no red dot there).
  freshIds = visible.filter((x) => !d.has(x.id) && !isOptional(x, d, passed)).map((x) => x.id);
  const badge = noDomain() ? 0 : unseenCount(freshIds, readSeen());
  setActionButton(byId('inbox-btn'), t('top.inbox'), badge, t('top.inboxNew', { n: badge }));
  const lang = getLang();
  const threads = new Map<string, Ticket[]>();
  for (const tk of visible.toReversed()) {
    const list = threads.get(tk.from.name);
    if (list) list.push(tk);
    else threads.set(tk.from.name, [tk]);
  }
  // U20 (v21): the dialog's first focus goes to the open task (else the newest), never to the scrolling list (a ring around it all).
  const first = visible.some((x) => x.id === app.selectedId) ? app.selectedId : threads.values().next().value?.[0]?.id;
  byId('inbox-list').replaceChildren(
    fresh ? '' : h('p', { class: 'muted' }, t('inbox.empty')),
    ...[...threads.values()].map((list) => {
      const from = list[0].from;
      return h('section', { class: 'mb-4' },
        h('h3', { class: 'mt-0 mb-2 flex items-center gap-3' },
          avatar(from, 'md'),
          h('span', { class: 'min-w-0' },
            h('span', { class: 'flex flex-wrap items-center gap-2 font-semibold' }, from.name, h('span', { class: cx(DEPT_CHIP, deptColor(from.dept)) }, from.dept)),
            h('span', { class: 'block text-body-sm font-normal text-muted' }, roleLine(from.name, lang, unlockedTables())))),
        h('div', { class: 'ml-13 space-y-1.5' }, ...list.map((tk) => {
          const isDone = d.has(tk.id);
          return h('button', {
            type: 'button',
            class: cx(
              'block w-full rounded-(--r-card) rounded-tl-sm border-0 bg-code px-3 py-2 text-left ring-1 ring-transparent hover:bg-code hover:ring-line aria-[current=true]:ring-2 aria-[current=true]:ring-accent',
              isDone && 'text-muted'),
            'aria-current': tk.id === app.selectedId ? 'true' : false,
            autofocus: tk.id === first,
            onclick: () => actions.selectTicket(tk.id),
          },
            h('span', { class: 'block font-semibold' }, textOf(tk, lang).title),
            h('span', { class: 'block text-body-sm text-muted' },
              isDone ? `✓ ${t('inbox.done')}` : `${t('brief.chapter', { n: tk.chapter })} · ${'★'.repeat(tk.difficulty)}`));
        })));
    }));
}
