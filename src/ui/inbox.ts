import { getLang, t } from '../i18n';
import { visibleTickets } from '../progress';
import { actions, app, done } from '../state';
import { cx, DEPT_CHIP, deptColor } from '../theme';
import { textOf } from '../tickets';
import { avatar } from './avatar';
import { byId, h } from './dom';

export function renderInbox(): void {
  const d = done();
  const visible = visibleTickets(app.tickets, d);
  const fresh = visible.filter((x) => !d.has(x.id)).length;
  byId('inbox-btn').textContent = fresh ? t('top.inboxNew', { n: fresh }) : t('top.inbox');
  const lang = getLang();
  byId('inbox-list').replaceChildren(
    fresh ? '' : h('p', { class: 'muted' }, t('inbox.empty')),
    ...[...visible].reverse().map((tk) => {
      const isDone = d.has(tk.id);
      const current = tk.id === app.selectedId;
      return h('button', {
        type: 'button',
        class: cx(
          'mb-1.5 block w-full p-2 text-left aria-[current=true]:border-accent aria-[current=true]:shadow-[inset_3px_0_0_var(--accent)]',
          isDone && 'bg-code'),
        'aria-current': current ? 'true' : false,
        onclick: () => actions.selectTicket(tk.id),
      },
        h('span', { class: 'flex items-center gap-2 text-sm text-muted' },
          avatar(tk.from), h('span', { class: cx(DEPT_CHIP, deptColor(tk.from.dept)) }, tk.from.dept), tk.from.name),
        h('span', { class: 'mt-1 block font-semibold' }, textOf(tk, lang).title),
        h('span', { class: 'block text-sm text-muted' }, isDone ? `✓ ${t('inbox.done')}` : `${t('brief.chapter', { n: tk.chapter })} · ${'★'.repeat(tk.difficulty)}`));
    }));
}
