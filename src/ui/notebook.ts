import { GLOSSARY, matches } from '../glossary';
import { learnedSkills } from '../home';
import { getLang, t } from '../i18n';
import { grantedBy } from '../overview';
import { SKILLS } from '../progress';
import { app, done } from '../state';
import type { Lang } from '../tickets';
import { byId, h, nodes } from './dom';
import { registerMode } from './homeView';
import { skillIcon } from './icons';

const ITEM = 'border-b border-line py-2';

let redraw: (() => void) | undefined;
let opener: HTMLElement | null = null;

const button = (): HTMLElement => byId('notebook-btn');

/**
 * Non-modal (show(), not showModal()): the player keeps typing in the editor while it is open, and Esc on the completion
 * dock still works (stageEsc only yields to modal dialogs). Opened from the top-bar button or Home's mode card.
 */
export function toggleNotebook(dialog: HTMLDialogElement): void {
  if (dialog.open) {
    dialog.close();
    return;
  }
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const input = h('input', { type: 'search', class: 'w-full rounded-lg bg-panel px-2 py-1.5 ring-1 ring-line' });
  const title = h('h2', { id: 'notebook-title', class: 'm-0' });
  const close = h('button', { type: 'button', onclick: () => dialog.close() });
  const list = h('div', {});

  // Built once per opening; redraw() (also from renderNotebook on every rerender) keeps the input, its text and focus.
  redraw = (): void => {
    const lang = getLang();
    const other: Lang = lang === 'vi' ? 'en' : 'vi';
    const learned = learnedSkills(app.tickets, done());
    title.textContent = t('nb.title');
    close.textContent = t('app.close');
    input.placeholder = t('nb.filter');
    input.setAttribute('aria-label', t('nb.filter'));
    const q = input.value;
    const cards = SKILLS.filter((s) => matches(q, s.id, s.label.vi, s.label.en));
    const terms = GLOSSARY.filter((g) => matches(q, g.term, g.vi, g.en, ...g.columns));
    list.replaceChildren(...nodes(
      h('h3', {}, t('nb.cards')),
      ...cards.map((s) =>
        learned.has(s.id)
          ? h('article', { class: ITEM },
              h('h4', { class: 'm-0 flex items-center gap-2' }, skillIcon(s.id), s.label[lang]),
              h('pre', { class: 'sql my-1' }, s.syntax),
              h('p', { class: 'my-0.5 text-sm' }, h('b', {}, t('nb.when')), ' ', s.when[lang]),
              h('p', { class: 'my-0.5 text-sm' }, h('b', {}, t('nb.trap')), ' ', s.trap[lang]))
          : h('article', { class: ITEM },
              h('h4', { class: 'm-0 flex items-center gap-2 text-muted' }, skillIcon(s.id), s.label[lang]),
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

  input.addEventListener('input', () => redraw?.());
  dialog.replaceChildren(h('div', { class: 'mb-2 flex items-center justify-between gap-2' }, title, close), input, list);
  dialog.onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      dialog.close();
    }
  };
  dialog.onclose = () => {
    redraw = undefined;
    button().setAttribute('aria-expanded', 'false');
    // Return focus only if it was inside the notebook (or dropped to <body>), never steal it from the editor.
    const a = document.activeElement;
    if (!a || a === document.body || dialog.contains(a)) (opener?.isConnected && !opener.closest('[hidden]') ? opener : button()).focus();
    opener = null;
  };
  redraw();
  dialog.show();
  button().setAttribute('aria-expanded', 'true');
  input.focus();
}

/** main.ts rerender(): language switch or a newly learned skill while the notebook is open. */
export const renderNotebook = (): void => redraw?.();

registerMode({
  id: 'notebook', order: 30, icon: 'book', tint: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200',
  title: 'mode.notebook', desc: 'mode.notebookDesc', open: () => toggleNotebook(byId('notebook-dialog') as HTMLDialogElement),
});
