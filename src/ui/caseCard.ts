import { casesNow, loadCases, loadTickets } from '../content';
import { activeDomain } from '../domains';
import { getLang, t } from '../i18n';
import { INTERVIEW_KEY, parseInterviewPrefs } from '../interviewPrefs';
import { passedChapters } from '../progress';
import { actions, done } from '../state';
import { readJson } from '../storage';
import { BTN_SECONDARY, CARD, cx } from '../theme';
import { h } from './dom';
import { registerHomeSection } from './homeView';
import { icon } from './icons';
import { startCase } from './modes';

/**
 * v47 D1/D2 (L930–L939): the domain Overview's "Tình huống" section: the open domain's case studies and "Hỏi lại cho rõ" asks
 * (content/cases/cases.yml, lazy chunk `cases`). Each opens once chapter `after`'s review is passed in that domain (a locked
 * row says which), and is played as an interview take-home (startCase): 0 XP, nothing in the Save, never chapter progress.
 * Results and the run in progress live in the device pref cargo-query/interview, so "Continue" reads them from there.
 */
let failed = false;
function casesSection(): HTMLElement | null {
  const all = casesNow();
  if (!all) {
    if (!failed) void loadCases().then(() => actions.rerender(), () => void (failed = true)); // one try per page load, never a loop
    return null;
  }
  const d = activeDomain();
  const mine = all.filter((c) => c.domain === d);
  if (mine.length === 0) return null;
  const lang = getLang();
  const passed = passedChapters(loadTickets(d), done());
  const p = parseInterviewPrefs(readJson<unknown>(INTERVIEW_KEY));
  const btn = (cls: string, label: string, id: string, fresh: boolean): HTMLElement =>
    h('button', { type: 'button', class: cx(cls, 'min-h-11 px-4'), onclick: () => void startCase(id, fresh) }, label);
  return h('section', { 'aria-labelledby': 'cases-title', class: 'flex flex-col gap-3' },
    h('h2', { id: 'cases-title', class: 'm-0 text-title font-bold' }, t('cases.title')),
    h('p', { class: 'm-0 text-body-sm text-muted' }, t('cases.intro')),
    h('ul', { class: 'm-0 flex list-none flex-col gap-3 p-0' }, ...mine.map((c) => {
      const open = passed.has(c.after);
      const live = p.live[c.id];
      const last = p.takeHomes[c.id];
      const going = !!live && live.phase !== 'done';
      return h('li', { class: cx(CARD, 'flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3'), 'data-case': c.id },
        h('div', { class: 'flex min-w-0 flex-1 flex-col gap-1' },
          h('h3', { class: 'm-0 text-body font-bold' }, c.title[lang]),
          h('p', { class: 'm-0 text-body-sm text-muted' }, t(c.kind === 'case' ? 'cases.caseLine' : 'cases.askLine', { n: c.steps.length })),
          last ? h('p', { class: 'm-0 text-body-sm' }, t('cases.last', { day: last.at, k: last.checks.length, m: last.rubric })) : null),
        open
          ? h('div', { class: 'flex shrink-0 flex-wrap gap-2' }, ...(going
            ? [btn(BTN_SECONDARY, t('cases.resume'), c.id, false), btn(BTN_SECONDARY, t('cases.restart'), c.id, true)]
            : [btn(BTN_SECONDARY, t(last ? 'cases.again' : 'cases.start'), c.id, true)])) // one BTN_GO per region: the continue card's
          : h('p', { class: 'm-0 flex shrink-0 items-center gap-1.5 text-body-sm text-muted' }, icon('lock', 'size-4'), t('cases.locked', { n: c.after })));
    })));
}

registerHomeSection({ id: 'cases', order: 32, span: 'full', pages: ['overview'], render: casesSection });
