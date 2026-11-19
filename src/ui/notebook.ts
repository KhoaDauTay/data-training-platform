import { activeDomain } from '../domains';
import { GLOSSARY, matches } from '../glossary';
import { knownSkills } from '../home';
import { getLang, t } from '../i18n';
import { unlockNote } from '../overview';
import { SKILLS, type Skill } from '../progress';
import { inDomain } from '../route';
import { generalWork } from '../session';
import { app } from '../state';
import type { Lang } from '../tickets';
import { byId, h, nodes } from './dom';
import { registerMode } from './homeView';
import { skillIcon } from './icons';
import { hasLesson, openLesson } from './lessonCard';
import { currentRoute } from './router';

const ITEM = 'border-b border-line py-2';

let redraw: (() => void) | undefined;
let opener: HTMLElement | null = null;

const button = (): HTMLElement => byId('notebook-btn');

/**
 * v10 N7 (L157): the printable cheat sheet, one A4 of the skills the player has learned (label, syntax, trap from
 * content/skills.yml, whose syntax lines use the neutral lab tables). Hidden on screen, shown only when printing; fixed
 * black on white so a dark theme prints readable without backgrounds. Skills only: no business terms, no domain.
 */
export function cheatSheet(lang: Lang, skills: readonly Skill[], learned: ReadonlySet<string>): HTMLElement {
  const own = skills.filter((s) => learned.has(s.id));
  // Sized so all 38 skills fit one A4 page at the browser's default margins (checked with printToPDF, L157).
  return h('section', { id: 'cheat-sheet', class: 'hidden bg-white font-sans text-[6.5pt] leading-tight text-black print:block', 'aria-hidden': 'true' },
    h('h1', { class: 'm-0 mb-0.5 text-[10pt] font-bold' }, t('cheat.title')),
    h('p', { class: 'm-0 mb-1.5' }, t('cheat.sub', { n: own.length })),
    h('div', { class: 'columns-3 gap-3' }, ...own.map((s) =>
      h('article', { class: 'mb-1 break-inside-avoid border-b border-black/20 pb-0.5' },
        h('h2', { class: 'm-0 text-[7pt] font-bold' }, s.label[lang]),
        h('code', { lang: 'en', class: 'block font-mono text-[6.5pt] break-words whitespace-pre-wrap' }, s.syntax),
        h('p', { class: 'm-0' }, h('b', {}, t('nb.trap')), ' ', s.trap[lang])))));
}

/** Prints the sheet alone: every other body child is hidden for print until `afterprint`, then the sheet is removed. */
function printSheet(learned: ReadonlySet<string>): void {
  document.getElementById('cheat-sheet')?.remove();
  const others = [...document.body.children].filter((e) => !e.classList.contains('print:hidden!'));
  for (const e of others) e.classList.add('print:hidden!');
  const sheet = cheatSheet(getLang(), SKILLS, learned);
  document.body.append(sheet);
  addEventListener('afterprint', () => {
    sheet.remove();
    for (const e of others) e.classList.remove('print:hidden!');
  }, { once: true });
  print();
}

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
  const input = h('input', { type: 'search', class: 'w-full rounded-(--r-inset) bg-panel px-2 py-1.5 ring-1 ring-line' });
  const title = h('h2', { id: 'notebook-title', class: 'm-0' });
  const close = h('button', { type: 'button', onclick: () => dialog.close() });
  const list = h('div', {});
  const printBtn = h('button', { type: 'button', class: 'px-3 py-1 text-body-sm', 'aria-describedby': 'cheat-why' });
  const printWhy = h('p', { id: 'cheat-why', class: 'mt-1 mb-2 text-body-sm text-muted' });

  // Built once per opening; redraw() (also from renderNotebook on every rerender) keeps the input, its text and focus.
  redraw = (): void => {
    const lang = getLang();
    const other: Lang = lang === 'vi' ? 'en' : 'vi';
    const ids = SKILLS.map((s) => s.id);
    const learned = knownSkills(app.save, app.tickets, ids); // v15: drills and review cards count too (a "SQL only" player)
    const route = currentRoute();
    const domain = inDomain(route) && !(route === 'play' && generalWork()); // D-N4: General pages show no business terms
    title.textContent = t('nb.title');
    printBtn.textContent = t('cheat.print');
    printBtn.toggleAttribute('disabled', learned.size === 0); // nothing learned yet: the reason shows under the button
    printBtn.onclick = () => printSheet(learned);
    printWhy.textContent = t(learned.size ? 'cheat.hint' : 'cheat.none');
    close.textContent = t('app.close');
    input.placeholder = t('nb.filter');
    input.setAttribute('aria-label', t('nb.filter'));
    const q = input.value;
    const cards = SKILLS.filter((s) => matches(q, s.id, s.label.vi, s.label.en));
    // A skill's quick lesson can be read before the skill is learned (product-design-v4 §C.3).
    const lesson = (id: string) => hasLesson(id) ? h('button', { type: 'button', class: 'mt-1 px-2 py-0.5 text-body-sm', onclick: () => openLesson(id) }, t('nb.lesson')) : null;
    const own = domain ? GLOSSARY.filter((g) => g.domain === activeDomain()) : [];
    const terms = own.filter((g) => matches(q, g.term, g.vi, g.en, ...g.columns));
    list.replaceChildren(...nodes(
      h('h3', {}, t('nb.cards')),
      ...cards.map((s) =>
        learned.has(s.id)
          ? h('article', { class: ITEM },
              h('h4', { class: 'm-0 flex items-center gap-2' }, skillIcon(s.id), s.label[lang]),
              h('pre', { class: 'sql my-1' }, s.syntax),
              h('p', { class: 'my-0.5 text-body-sm' }, h('b', {}, t('nb.when')), ' ', s.when[lang]),
              h('p', { class: 'my-0.5 text-body-sm' }, h('b', {}, t('nb.trap')), ' ', s.trap[lang]),
              lesson(s.id))
          : h('article', { class: ITEM },
              h('h4', { class: 'm-0 flex items-center gap-2 text-muted' }, skillIcon(s.id), s.label[lang]),
              h('p', { class: 'my-0.5 text-body-sm text-muted' }, unlockNote(app.tickets, s.id, lang, domain)),
              lesson(s.id))),
      own.length ? h('h3', {}, t('nb.terms')) : null,
      ...terms.map((g) =>
        h('article', { class: ITEM },
          h('h4', { class: 'm-0' }, g.term),
          h('p', { class: 'my-0.5 text-body-sm' }, g[lang]),
          h('p', { class: 'my-0.5 text-body-sm text-muted' }, g[other]),
          g.columns.length ? h('p', { class: 'my-0.5 text-body-sm text-muted' }, t('nb.columns', { list: g.columns.join(', ') })) : null)),
      cards.length + terms.length === 0 ? h('p', { class: 'text-body-sm text-muted' }, t('nb.empty', { q })) : null,
    ));
  };

  input.addEventListener('input', () => redraw?.());
  dialog.replaceChildren(h('div', { class: 'mb-2 flex items-center justify-between gap-2' }, title, close), h('div', {}, printBtn, printWhy), input, list);
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
  id: 'notebook', order: 30, icon: 'book', tint: 'bg-accent-soft text-ink',
  title: 'mode.notebook', desc: 'mode.notebookDesc', open: () => toggleNotebook(byId('notebook-dialog') as HTMLDialogElement),
});
