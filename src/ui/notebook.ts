import { GLOSSARY, matches } from '../glossary';
import { learnedSkills } from '../home';
import { getLang, t } from '../i18n';
import { grantedBy } from '../overview';
import { SKILLS } from '../progress';
import { app, done } from '../state';
import type { Lang } from '../tickets';
import { byId, h, nodes } from './dom';
import { registerMode } from './homeView';

const ITEM = 'border-b border-line py-2';

/** Non-modal (show(), not showModal()): the player keeps typing in the editor while it is open. */
export function toggleNotebook(dialog: HTMLDialogElement): void {
  if (dialog.open) {
    dialog.close();
    return;
  }
  const lang = getLang();
  const other: Lang = lang === 'vi' ? 'en' : 'vi';
  const learned = learnedSkills(app.tickets, done());
  const input = h('input', {
    type: 'search', placeholder: t('nb.filter'), 'aria-label': t('nb.filter'),
    class: 'w-full rounded-lg bg-panel px-2 py-1.5 ring-1 ring-line',
  });
  const list = h('div', {});

  const draw = (): void => {
    const q = input.value;
    const cards = SKILLS.filter((s) => matches(q, s.id, s.label.vi, s.label.en));
    const terms = GLOSSARY.filter((g) => matches(q, g.term, g.vi, g.en, ...g.columns));
    list.replaceChildren(...nodes(
      h('h3', {}, t('nb.cards')),
      ...cards.map((s) =>
        learned.has(s.id)
          ? h('article', { class: ITEM },
              h('h4', { class: 'm-0' }, s.label[lang]),
              h('pre', { class: 'sql my-1' }, s.syntax),
              h('p', { class: 'my-0.5 text-sm' }, h('b', {}, t('nb.when')), ' ', s.when[lang]),
              h('p', { class: 'my-0.5 text-sm' }, h('b', {}, t('nb.trap')), ' ', s.trap[lang]))
          : h('article', { class: ITEM },
              h('h4', { class: 'm-0 text-muted' }, s.label[lang]),
              h('p', { class: 'my-0.5 text-sm text-muted' }, t('nb.unlockAt', { id: grantedBy(app.tickets, s.id)?.id ?? '—' })))),
      h('h3', {}, t('nb.terms')),
      ...terms.map((g) =>
        h('article', { class: ITEM },
          h('h4', { class: 'm-0' }, g.term),
          h('p', { class: 'my-0.5 text-sm' }, g[lang]),
          h('p', { class: 'my-0.5 text-sm text-muted' }, g[other]),
          g.columns.length ? h('p', { class: 'my-0.5 text-sm text-muted' }, t('nb.columns', { list: g.columns.join(', ') })) : null)),
      cards.length + terms.length === 0 ? h('p', { class: 'text-sm text-muted' }, t('nb.empty', { q })) : null,
    ));
  };

  input.addEventListener('input', draw);
  dialog.replaceChildren(
    h('div', { class: 'mb-2 flex items-center justify-between gap-2' },
      h('h2', { id: 'notebook-title', class: 'm-0' }, t('nb.title')),
      h('button', { type: 'button', onclick: () => dialog.close() }, t('app.close'))),
    input,
    list,
  );
  dialog.onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      dialog.close();
    }
  };
  draw();
  dialog.show();
  input.focus();
}

registerMode({
  id: 'notebook', order: 30, icon: '📒', tint: 'bg-fuchsia-100 dark:bg-fuchsia-950',
  title: 'mode.notebook', desc: 'mode.notebookDesc', open: () => toggleNotebook(byId('notebook-dialog') as HTMLDialogElement),
});
