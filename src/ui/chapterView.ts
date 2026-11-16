import { learnedSkills } from '../home';
import { getLang, t } from '../i18n';
import { chapterSummary, outcomeDone } from '../overview';
import { CHAPTERS, chapterTitle, SKILLS } from '../progress';
import { app, done } from '../state';
import { chapterColor, cx, PILL } from '../theme';
import type { Ticket } from '../tickets';
import { h } from './dom';

export const skillLabel = (id: string): string => SKILLS.find((s) => s.id === id)?.label[getLang()] ?? id;

/** "After this chapter you can…" (chapters.yml outcomes), ticked from the skills learned so far. */
function outcomeList(chapter: number): HTMLElement | null {
  const c = CHAPTERS.find((x) => x.chapter === chapter);
  if (!c?.outcomes.length) return null;
  const d = done();
  const learned = learnedSkills(app.tickets, d);
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
  return h('section', { class: 'my-3 rounded-xl bg-panel p-3 ring-1 ring-line', 'aria-labelledby': 'goal-title' },
    h('h3', { id: 'goal-title', class: 'mt-0' }, t('goal.title', { n: chapter, title: chapterTitle(chapter, getLang()) })),
    h('p', { class: 'my-1 text-sm text-muted' }, t('goal.intro')),
    list);
}

/** "Teaches: … · Needs: …" from grants/requires; colour only on the small chips (L23). */
export function skillChips(tk: Ticket): HTMLElement | null {
  if (tk.grants.length === 0 && tk.requires.length === 0) return null;
  const list = (ids: string[]) => ids.map(skillLabel).join(', ');
  return h('p', { class: 'my-2 flex flex-wrap gap-1.5' },
    tk.grants.length ? h('span', { class: cx(PILL, chapterColor(tk.chapter).chip) }, t('chip.teaches', { list: list(tk.grants) })) : null,
    tk.requires.length ? h('span', { class: cx(PILL, 'bg-code text-ink') }, t('chip.needs', { list: list(tk.requires) })) : null);
}

/** Under the promotion review's Recap (P2). The promotion animation already celebrated: no effect here. */
export function wrapUp(chapter: number, onQuick?: () => void): HTMLElement {
  const lang = getLang();
  const s = chapterSummary(app.tickets, app.save, chapter);
  const last = !app.tickets.some((tk) => tk.chapter > chapter);
  const career = CHAPTERS.find((c) => c.chapter === chapter)?.career[lang];
  return h('section', { class: 'my-3 rounded-xl bg-panel p-4 ring-1 ring-line', 'aria-labelledby': 'wrapup-title' },
    h('h3', { id: 'wrapup-title', class: 'mt-0' }, t('sum.title', { n: chapter, title: chapterTitle(chapter, lang) })),
    career ? h('p', { class: 'font-semibold' }, t('sum.career', { career })) : null,
    outcomeList(chapter),
    s.skills.length ? h('p', {}, t('sum.skills', { list: s.skills.map(skillLabel).join(', ') })) : null,
    h('p', {}, t('sum.stats', { xp: s.xp, hints: s.hints })),
    !last && s.newTables.length ? h('p', {}, t('sum.tables', { list: s.newTables.join(', ') })) : null,
    last ? h('p', {}, t('sum.last')) : null,
    onQuick ? h('div', { class: 'actions' }, h('button', { type: 'button', onclick: onQuick }, t('sum.quick'))) : null);
}
