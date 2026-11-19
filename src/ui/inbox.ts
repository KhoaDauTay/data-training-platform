import { getLang, t } from '../i18n';
import { roleLine } from '../people';
import { visibleTickets } from '../progress';
import { actions, app, done, unlockedTables } from '../state';
import { cx, DEPT_CHIP, deptColor } from '../theme';
import { textOf, type Ticket } from '../tickets';
import { avatar } from './avatar';
import { byId, h } from './dom';
import { noDomain, setActionButton } from './topbar';

/** One conversation per colleague (L18 ★1): the thread with the newest ticket first, newest ticket first inside it. */
export function renderInbox(): void {
  const d = done();
  const visible = visibleTickets(app.tickets, d);
  const fresh = visible.filter((x) => !d.has(x.id)).length;
  // v15: the open domain's mail is no news to a "SQL only" player or in the General workspace (no red dot there).
  const badge = noDomain() ? 0 : fresh;
  setActionButton(byId('inbox-btn'), t('top.inbox'), badge, t('top.inboxNew', { n: badge }));
  const lang = getLang();
  const threads = new Map<string, Ticket[]>();
  for (const tk of [...visible].reverse()) {
    const list = threads.get(tk.from.name);
    if (list) list.push(tk);
    else threads.set(tk.from.name, [tk]);
  }
  byId('inbox-list').replaceChildren(
    fresh ? '' : h('p', { class: 'muted' }, t('inbox.empty')),
    ...[...threads.values()].map((list) => {
      const from = list[0].from;
      return h('section', { class: 'mb-4' },
        h('h3', { class: 'mt-0 mb-2 flex items-center gap-3' },
          avatar(from, 'md'),
          h('span', { class: 'min-w-0' },
            h('span', { class: 'flex flex-wrap items-center gap-2 font-semibold' }, from.name, h('span', { class: cx(DEPT_CHIP, deptColor(from.dept)) }, from.dept)),
            h('span', { class: 'block text-sm font-normal text-muted' }, roleLine(from.name, lang, unlockedTables())))),
        h('div', { class: 'ml-13 space-y-1.5' }, ...list.map((tk) => {
          const isDone = d.has(tk.id);
          return h('button', {
            type: 'button',
            class: cx(
              'block w-full rounded-2xl rounded-tl-sm border-0 bg-code px-3 py-2 text-left ring-1 ring-transparent hover:bg-code hover:ring-line aria-[current=true]:ring-2 aria-[current=true]:ring-accent',
              isDone && 'text-muted'),
            'aria-current': tk.id === app.selectedId ? 'true' : false,
            onclick: () => actions.selectTicket(tk.id),
          },
            h('span', { class: 'block font-semibold' }, textOf(tk, lang).title),
            h('span', { class: 'block text-sm text-muted' },
              isDone ? `✓ ${t('inbox.done')}` : `${t('brief.chapter', { n: tk.chapter })} · ${'★'.repeat(tk.difficulty)}`));
        })));
    }));
}
