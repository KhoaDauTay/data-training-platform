import { knownSkills } from '../home';
import { getLang, t } from '../i18n';
import { chapterSummary, outcomeDone } from '../overview';
import { chaptersOf, chapterTitle, nextTicket, SKILLS } from '../progress';
import { actions, app, done } from '../state';
import { BTN_GO, chapterColor, cx, PILL } from '../theme';
import type { Ticket } from '../tickets';
import { h } from './dom';
import { skillIcon } from './icons';
import { hasLesson, openLesson } from './lessonCard';
import { mascot } from './mascots';

export const skillLabel = (id: string): string => SKILLS.find((s) => s.id === id)?.label[getLang()] ?? id;

/** "After this chapter you can…" (chapters.yml outcomes), ticked from the skills learned so far. */
function outcomeList(chapter: number): HTMLElement | null {
  const c = chaptersOf().find((x) => x.chapter === chapter);
  if (!c?.outcomes.length) return null;
  const d = done();
  const learned = knownSkills(app.save, app.tickets, SKILLS.map((s) => s.id)); // learned anywhere counts (Plan 8a D8a-11)
  const lang = getLang();
  return h('ul', { class: 'my-1 list-none space-y-1 p-0' }, ...c.outcomes.map((o) => {
    const ok = outcomeDone(o.skills, chapter, app.tickets, d, learned);
    return h('li', { class: 'flex gap-2' }, h('span', { class: ok ? 'good' : 'text-muted', 'aria-hidden': 'true' }, ok ? '✓' : '○'), o[lang]);
  }));
}

/** "Chapter goals" card on the chapter's teach ticket. */
export function goalCard(chapter: number): HTMLElement | null {
  const list = outcomeList(chapter);
  if (!list) return null;
  // One closed line: the request and the task come first in the brief (v10 UX #3); the goals are a click away.
  return h('details', { class: 'my-3 rounded-(--r-ctl) bg-panel p-3 ring-1 ring-line' },
    h('summary', { id: 'goal-title', class: 'cursor-pointer font-semibold' }, t('goal.title', { n: chapter, title: chapterTitle(chapter, getLang()) })),
    h('p', { class: 'my-1 text-body-sm text-muted' }, t('goal.intro')),
    list);
}

/** "New skill: … · Uses: …" from grants/requires; colour only on the small chips (L23). */
export function skillChips(tk: Ticket): HTMLElement | null {
  if (tk.grants.length === 0 && tk.requires.length === 0) return null;
  // One chip per skill with its icon (ui-ux-v3 §e), after a plain label. A skill with a quick lesson is a button that opens it (§C.3).
  const chipOf = (id: string, chip: string) => hasLesson(id)
    ? h('button', { type: 'button', class: cx(PILL, chip, 'border-0'), 'aria-haspopup': 'dialog', title: t('chip.lessonAria', { skill: skillLabel(id) }), onclick: () => openLesson(id) },
      skillIcon(id, 'size-4'), skillLabel(id))
    : h('span', { class: cx(PILL, chip) }, skillIcon(id, 'size-4'), skillLabel(id));
  const row = (label: string, ids: string[], chip: string) => h('span', { class: 'flex flex-wrap items-center gap-1.5' },
    h('span', { class: 'text-body-sm font-semibold text-muted' }, label),
    ...ids.map((id) => chipOf(id, chip)));
  return h('p', { class: 'my-2 flex flex-wrap items-center gap-x-4 gap-y-1.5' },
    tk.grants.length ? row(t('chip.teachesLabel'), tk.grants, chapterColor(tk.chapter).chip) : null,
    tk.requires.length ? row(t('chip.needsLabel'), tk.requires, 'bg-code text-ink') : null);
}

/** Under the promotion review's Recap (P2). The promotion animation already celebrated: no effect here. */
export function wrapUp(chapter: number, onQuick?: () => void): HTMLElement {
  const lang = getLang();
  const s = chapterSummary(app.tickets, app.save, chapter);
  const last = !app.tickets.some((tk) => tk.chapter > chapter);
  const career = chaptersOf().find((c) => c.chapter === chapter)?.career[lang];
  const next = last ? undefined : nextTicket(app.tickets, done());
  // v6 §2.4: Lily and Boon cheer a new chapter; one primary way on (the Recap above has none for a promotion review, v10 UX #9).
  return h('section', { class: 'wrapup my-3 scroll-mt-4 rounded-(--r-ctl) bg-panel p-4 ring-1 ring-line', 'aria-labelledby': 'wrapup-title' },
    h('div', { class: 'flex items-center gap-3' },
      mascot('lily', 'cheer', 'size-16'), mascot('boon', 'cheer', 'size-16'),
      h('h3', { id: 'wrapup-title', tabindex: '-1', class: 'm-0 text-lg font-bold' }, t('sum.title', { n: chapter, title: chapterTitle(chapter, lang) }))),
    career ? h('p', { class: 'mt-3 rounded-(--r-inset) bg-sun px-3 py-2 font-semibold text-sun-ink' }, t('sum.career', { career })) : null,
    outcomeList(chapter),
    s.skills.length ? h('p', {}, t('sum.skills', { list: s.skills.map(skillLabel).join(', ') })) : null,
    h('p', {}, t('sum.stats', { xp: s.xp, hints: s.hints })),
    !last && s.newTables.length ? h('p', {}, t('sum.tables', { list: s.newTables.join(', ') })) : null,
    last ? h('p', {}, t('sum.last')) : null,
    h('div', { class: 'actions' },
      next ? h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2'), onclick: () => actions.selectTicket(next.id) }, t('sum.nextChapter', { n: next.chapter })) : null,
      onQuick ? h('button', { type: 'button', onclick: onQuick }, t('sum.quick')) : null));
}
