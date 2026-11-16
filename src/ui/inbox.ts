import { getLang, t } from '../i18n';
import { visibleTickets } from '../progress';
import { actions, app, done } from '../state';
import { textOf } from '../tickets';
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
        class: `mail${current ? ' active' : ''}${isDone ? ' done' : ''}`,
        'aria-current': current ? 'true' : false,
        onclick: () => actions.selectTicket(tk.id),
      },
        h('span', { class: 'from' }, `${tk.from.name} · ${tk.from.dept}`),
        h('span', { class: 'subject' }, textOf(tk, lang).title),
        h('span', { class: 'meta' }, isDone ? `✓ ${t('inbox.done')}` : `${t('brief.chapter', { n: tk.chapter })} · ${'★'.repeat(tk.difficulty)}`));
    }));
}
