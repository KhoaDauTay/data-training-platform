import { homeModel, LEVELS, type ChapterCard, type HomeModel, type SkillCard } from '../home';
import { getLang, t, type Key } from '../i18n';
import { CHAPTERS, chapterTitle, rankOf, SKILLS } from '../progress';
import { derive } from '../scene';
import { actions, app, done } from '../state';
import { BTN_GO, CARD, chapterColor, cx, DONE_PILL, PILL } from '../theme';
import { textOf } from '../tickets';
import { byId, h, nodes } from './dom';
import { harborScene } from './harbor';
import { routeMap } from './routeMap';
import { go } from './router';

/** Width on >= lg screens (3-column grid); every section is full width below lg. */
export type Span = 'full' | 'wide' | 'narrow';
export interface HomeSection {
  id: string;
  order: number;
  span: Span;
  /** null = nothing to show; the section is skipped. */
  render(m: HomeModel): HTMLElement | null;
}
/** A card under "Other modes", registered only by a feature that exists (Plan 1c: Sandbox, Notebook; Plan Import: My data). */
export interface ModeCard {
  id: string;
  order: number;
  icon: string;
  /** Whole literal Tailwind classes for the icon tile, e.g. 'bg-orange-100 dark:bg-orange-950'. */
  tint: string;
  title: Key;
  desc: Key;
  open(): void;
}

const SPAN: Record<Span, string> = { full: 'lg:col-span-3', wide: 'lg:col-span-2', narrow: 'lg:col-span-1' };
const sections: HomeSection[] = [];
const modes: ModeCard[] = [];

/** Same id replaces the old entry (Plan 1c swaps the 'side' card); the list stays sorted by order. */
function upsert<T extends { id: string; order: number }>(list: T[], item: T): void {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list.splice(i, 1);
  list.push(item);
  list.sort((a, b) => a.order - b.order);
}
export const registerHomeSection = (s: HomeSection): void => upsert(sections, s);
export const registerMode = (m: ModeCard): void => upsert(modes, m);

/** Plan 1c: `levelOf` = Leitner box per skill, `onSkill` = practise that skill. */
export const homeHooks: { levelOf?: (skill: string) => number; onSkill?: (skill: string) => void } = {};

const openInbox = (): void => (byId('inbox-dialog') as HTMLDialogElement).showModal();
const percent = (n: number, of: number): number => (of ? Math.round((n / of) * 100) : 0);

/** The ticket is already selected: only switch view (selectTicket would restart a boss at step 1). */
function resume(id: string): void {
  if (app.selectedId === id) go('play');
  else actions.selectTicket(id);
}

/** `track`/`fill`: whole class strings (height + colours). */
function progress(value: number, label: string, track: string, fill: string): HTMLElement {
  return h('div', {
    class: cx('overflow-hidden rounded-full', track),
    role: 'progressbar', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(value),
  }, h('div', { class: cx('h-full rounded-full', fill), style: `width:${value}%` }));
}

function continueCard(m: HomeModel): HTMLElement {
  const lang = getLang();
  const label = t('home.progress', { done: m.done, total: m.total });
  return h('section', { class: cx(CARD, 'flex h-full flex-col gap-4 p-6'), 'aria-labelledby': 'continue-title' },
    h('div', {},
      h('p', { class: cx('m-0 text-sm font-semibold', chapterColor(m.chapter).text) },
        t('home.kicker', { n: m.chapter, title: chapterTitle(m.chapter, lang) })),
      h('h2', { id: 'continue-title', class: 'mt-1 mb-0 text-2xl font-bold' },
        m.next ? t('home.continue', { title: textOf(m.next, lang).title }) : t('inbox.empty')),
      m.next ? h('p', { class: 'mt-1 mb-0 text-muted' }, t('home.from', { name: m.next.from.name, dept: m.next.from.dept })) : null),
    h('div', { class: 'flex items-center gap-3' },
      progress(percent(m.done, m.total), label, 'h-2.5 flex-1 bg-code', 'bg-linear-to-r from-blue-600 to-cyan-500'),
      h('span', { class: 'text-sm tabular-nums text-muted' }, label)),
    h('div', { class: 'flex flex-wrap gap-2' },
      m.next ? h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2'), onclick: () => resume(m.next!.id) }, t('home.resume')) : null,
      h('button', { type: 'button', class: 'px-4 py-2 font-semibold', onclick: openInbox }, t('top.inbox'))));
}

/** Career path (L18 ★3, L19, L30): DA intern + the five ★ titles; the current one is marked, later ones say which review opens them. */
function careerCard(): HTMLElement {
  const lang = getLang();
  const rank = rankOf(app.tickets, done());
  const rows = [{ title: t('career.intern'), at: 0 }, ...CHAPTERS.filter((c) => c.tier).map((c) => ({ title: c.career[lang], at: c.chapter }))];
  const reached = (at: number): boolean => at === 0 || rank.passed.includes(at);
  const now = rows.filter((r) => reached(r.at)).pop();
  return h('section', { class: cx(CARD, 'flex h-full flex-col gap-3 p-6'), 'aria-labelledby': 'career-title' },
    h('h2', { id: 'career-title', class: 'm-0 text-sm font-semibold text-muted' }, t('home.career')),
    rank.career ? h('p', { class: 'm-0 font-semibold' }, rank.career[lang]) : null,
    h('ol', { class: 'm-0 list-none space-y-2 p-0' }, ...rows.map((r) => h('li', {
      class: cx('flex items-center gap-2 text-[15px]', !reached(r.at) && 'text-muted'),
      'aria-current': r === now ? 'step' : false,
    },
      h('span', { class: cx('size-2.5 shrink-0 rounded-full', reached(r.at) ? 'bg-emerald-600' : 'bg-line'), 'aria-hidden': 'true' }),
      r === now ? h('b', {}, r.title) : r.title,
      r === now
        ? h('span', { class: cx(PILL, 'ml-auto', DONE_PILL) }, t('home.careerNow'))
        : reached(r.at) ? null : h('span', { class: 'ml-auto text-sm' }, t('home.careerAt', { n: r.at }))))));
}

/** Small status badge: the only coloured text on the card (L23). */
function statusPill(c: ChapterCard): HTMLElement | null {
  const n = { done: c.done, total: c.total };
  if (c.status === 'done') return h('span', { class: cx(PILL, DONE_PILL) }, t('home.status.done', n));
  if (c.status === 'current') return h('span', { class: cx(PILL, chapterColor(c.chapter).chip) }, t('home.status.current', n));
  if (c.status === 'soon') return h('span', { class: cx(PILL, 'bg-code text-muted') }, t('home.status.soon'));
  return null;
}

/**
 * L21: centred, larger title; a closed chapter shows a centred padded 🔒, muted text (AA, unlike the mockup's
 * 55% opacity) and, on hover or keyboard focus, what opens it. The hint is always in the DOM (aria-describedby).
 */
function chapterCard(c: ChapterCard): HTMLElement {
  const lang = getLang();
  const color = chapterColor(c.chapter);
  const closed = c.status === 'locked' || c.status === 'soon';
  const hintId = `chapter-hint-${c.chapter}`;
  return h('article', {
    class: cx('group space-y-2 rounded-2xl bg-panel p-5 text-center', c.status === 'current' ? cx(color.ring, 'shadow-md') : 'ring-1 ring-line'),
    tabindex: closed ? '0' : false,
    'aria-current': c.status === 'current' ? 'step' : false,
    'aria-describedby': closed ? hintId : false,
  },
    closed
      ? h('div', { class: 'mx-auto grid size-12 place-items-center rounded-full bg-code p-3 text-2xl', role: 'img', 'aria-label': t(c.status === 'soon' ? 'home.status.soon' : 'home.status.locked') }, '🔒')
      : h('div', { class: cx('mx-auto grid size-12 place-items-center rounded-full text-xl font-bold', color.chip), 'aria-hidden': 'true' }, String(c.chapter)),
    h('h3', { class: cx('m-0 text-xl font-bold', closed && 'text-muted') }, `${c.chapter} · ${chapterTitle(c.chapter, lang)}`),
    c.skills.length ? h('p', { class: cx('m-0 text-[15px]', closed && 'text-muted') }, c.skills.map((s) => s.label[lang]).join(' · ')) : null,
    statusPill(c),
    h('p', { class: 'm-0 text-sm text-muted' }, t('home.careerAfter', { career: CHAPTERS.find((x) => x.chapter === c.chapter)?.career[lang] ?? '' })),
    c.status === 'done' && c.boss ? h('p', { class: 'm-0 text-sm text-muted' }, t('home.review', { title: textOf(c.boss, lang).title })) : null,
    closed
      ? h('p', {
        id: hintId,
        class: 'm-0 inline-block rounded-lg bg-ink px-3 py-1 text-sm text-panel opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
      }, t('home.lockedAfter', { n: c.chapter - 1 }))
      : null);
}

function chaptersSection(m: HomeModel): HTMLElement {
  return h('section', { 'aria-labelledby': 'chapters-title' },
    h('div', { class: 'mb-3 flex flex-wrap items-end justify-between gap-2' },
      h('h2', { id: 'chapters-title', class: 'm-0 text-lg font-bold' }, t('home.chapters', { n: m.chapters.length })),
      h('p', { class: 'm-0 text-sm text-muted' }, t('home.chaptersIntro'))),
    h('div', { class: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4' }, ...m.chapters.map(chapterCard)));
}

function skillCard(s: SkillCard): HTMLElement {
  const lang = getLang();
  const color = chapterColor(s.skill.chapter);
  const locked = s.state === 'locked';
  const body = nodes(
    h('span', { class: 'flex items-center gap-2' },
      h('span', { class: cx('grid size-8 shrink-0 place-items-center rounded-lg font-bold', locked ? 'bg-panel text-muted' : color.chip), 'aria-hidden': 'true' },
        s.skill.id.charAt(0).toUpperCase()),
      h('b', {}, s.skill.label[lang])),
    h('span', { class: 'mt-2 block text-sm text-muted' },
      locked ? `🔒 ${t('brief.chapter', { n: s.skill.chapter })}` : t(s.state === 'learned' ? 'home.skillLearned' : 'home.skillOpen')),
    locked
      ? null
      : h('span', { class: 'mt-2 flex gap-0.5', role: 'img', 'aria-label': t('home.level', { n: s.level, max: LEVELS }) },
        ...Array.from({ length: LEVELS }, (_, i) => h('i', { class: cx('h-1.5 flex-1 rounded', i < s.level ? color.bar : 'bg-code') }))));
  const box = cx('block w-full rounded-xl p-4 text-left ring-1 ring-line', locked ? 'bg-code text-muted' : 'bg-panel');
  const onSkill = homeHooks.onSkill;
  return onSkill && s.state === 'learned'
    ? h('button', { type: 'button', class: cx(box, 'border-0 hover:bg-panel hover:ring-2 hover:ring-accent'), onclick: () => onSkill(s.skill.id) }, ...body)
    : h('div', { class: box }, ...body);
}

function skillsSection(m: HomeModel): HTMLElement {
  return h('section', { 'aria-labelledby': 'skills-title' },
    h('h2', { id: 'skills-title', class: 'mb-3 text-lg font-bold' }, t('home.skills')),
    h('div', { class: 'grid gap-3 sm:grid-cols-3 lg:grid-cols-4' }, ...m.skills.map(skillCard)),
    h('p', { class: 'mt-2 mb-0 text-sm text-muted' }, t('home.skillsHint')));
}

function modesSection(): HTMLElement | null {
  if (modes.length === 0) return null;
  return h('section', { 'aria-labelledby': 'modes-title' },
    h('h2', { id: 'modes-title', class: 'mb-3 text-lg font-bold' }, t('home.modes')),
    h('div', { class: 'grid gap-3 sm:grid-cols-3' }, ...modes.map((md) =>
      h('button', {
        type: 'button',
        class: 'flex items-start gap-3 rounded-xl border-0 bg-panel p-4 text-left ring-1 ring-line hover:bg-panel hover:ring-2 hover:ring-accent',
        onclick: () => md.open(),
      },
        h('span', { class: cx('grid size-10 shrink-0 place-items-center rounded-lg text-xl', md.tint), 'aria-hidden': 'true' }, md.icon),
        h('span', {}, h('b', { class: 'block' }, t(md.title)), h('span', { class: 'text-sm text-muted' }, t(md.desc)))))));
}

/** Completed ids when the player last left Home (session memory only, completion-animations §4). */
let seenAtLeave: Set<string> | undefined;
/** main.ts calls this whenever another route is shown. */
export function leftHome(): void {
  seenAtLeave = done();
}
/** Chapters with a task finished since the last visit: their newest container gets a bright edge and "New". */
function freshChapters(): Set<number> {
  const seen = seenAtLeave;
  const d = done();
  return new Set(seen ? app.tickets.filter((x) => d.has(x.id) && !seen.has(x.id)).map((x) => x.chapter) : []);
}

/** Tien Sa (L26): the yard holds one container per completed ticket, coloured by chapter. Home never replays animations. */
function harborSection(m: HomeModel): HTMLElement {
  const scene = harborScene(derive(app.tickets, done()), { ambient: true, current: m.chapter, fresh: freshChapters() });
  return h('section', { class: cx(CARD, 'overflow-hidden'), 'aria-labelledby': 'harbor-title' },
    h('h2', { id: 'harbor-title', class: 'sr-only' }, t('harbor.title')),
    scene.svg);
}

function routesSection(): HTMLElement {
  return h('section', { class: cx(CARD, 'p-5'), 'aria-labelledby': 'routes-title' },
    h('div', { class: 'mb-2 flex flex-wrap items-end justify-between gap-2' },
      h('h2', { id: 'routes-title', class: 'm-0 text-lg font-bold' }, t('routes.title')),
      h('p', { class: 'm-0 text-sm text-muted' }, t('routes.subtitle'))),
    routeMap(derive(app.tickets, done())).svg);
}

registerHomeSection({ id: 'continue', order: 10, span: 'wide', render: continueCard });
registerHomeSection({ id: 'career', order: 20, span: 'narrow', render: careerCard });
registerHomeSection({ id: 'chapters', order: 30, span: 'full', render: chaptersSection });
registerHomeSection({ id: 'skills', order: 40, span: 'full', render: skillsSection });
registerHomeSection({ id: 'modes', order: 50, span: 'full', render: modesSection });
registerHomeSection({ id: 'harbor', order: 5, span: 'full', render: harborSection });
registerHomeSection({ id: 'routes', order: 25, span: 'full', render: routesSection });

/** Redrawn by rerender() (language switch, progress). Pure DOM from homeModel(); keeps no state of its own. */
export function renderHome(host: HTMLElement): void {
  const m = homeModel(app.tickets, done(), CHAPTERS, SKILLS, homeHooks.levelOf);
  host.replaceChildren(
    h('h1', { id: 'home-title', tabindex: '-1', class: 'sr-only' }, t('nav.home')),
    h('div', { class: 'mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-3' },
      ...nodes(...sections.map((s) => {
        const el = s.render(m);
        return el && h('div', { class: cx('min-w-0', SPAN[s.span]) }, el);
      }))));
}
