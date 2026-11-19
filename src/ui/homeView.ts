import { loadTickets } from '../content';
import { activeDomain, DOMAINS, domainText } from '../domains';
import { homeModel, knownSkills, kpisOf, kpiTiles, LEVELS, reliesOn, resumeTarget, type ChapterCard, type HomeModel } from '../home';
import { sqlOnly } from '../onboarding';
import { getLang, t, type Key } from '../i18n';
import { CHAPTERS, chaptersOf, chapterTitle, domainSkills, moduleTitle, nextTicket, rankOf, SKILLS } from '../progress';
import { domainSlot } from '../save';
import { domainArt } from './domainArt';
import { domainLine } from './topbar';
import { derive, ROUTES as LANES } from '../scene';
import { domainHash, isInterviewPage, learnAdvOf, learnModuleOf, learnSkillOf } from '../route';
import { laneInfo, lanePanel, wirePins } from './lanePanel';
import { mascot, MOVES, setLilyStage } from './mascots';
import { gainSince, growing, markGrew, react, settle } from './celebrate';
import { ACC_AT, accAt, dayCount, firstDay, LAST_STAGE, type LilyStage, lilyStage, markStages, reachedOn, readLily, setAcc, toNextStage } from '../lily';
import { localDay } from '../practice';
import { relabelScene, teachScene } from './teachScene';
import { currentRoute } from './router';
import { actions, app, done } from '../state';
import { BTN_GO, BTN_SECONDARY, CARD, CARD_ACTION, chapterColor, cx, DONE_PILL, PILL } from '../theme';
import { roleLine } from '../people';
import { upsert } from '../registry';
import { hashOf } from '../route';
import { textOf, type Ticket } from '../tickets';
import { avatar } from './avatar';
import { advLine } from './brief';
import { icon, skillIcon, type IconName } from './icons';
import { byId, h, nodes } from './dom';
import { artSlot } from '../art/load';
import { fleetOrder, takeNewRoutes } from '../routesSeen';
import { callout } from './routeText';
import { isStory } from '../session';
import { go } from './router';

/** Width on >= lg screens (3-column grid, Overview only); every section is full width below lg and on the other pages. */
export type Span = 'full' | 'wide' | 'narrow';
/** Reading pages drawn in <main id="home"> (v5 §B.4–B.6, v6 §3.3): one per route except play, data and dashboard. */
export type Page = 'home' | 'learn' | 'practice' | 'overview' | 'map';
export interface HomeSection {
  id: string;
  order: number;
  span: Span;
  /** Pages this section appears on. */
  pages: readonly Page[];
  /** null = nothing to show; the section is skipped. */
  render(m: HomeModel): HTMLElement | null;
}
/** A card under "Other modes", registered only by a feature that exists (Plan 1c: Sandbox, Notebook; Plan Import: My data). */
export interface ModeCard {
  id: string;
  order: number;
  icon: IconName;
  /** Whole literal Tailwind classes for the icon tile (background + icon colour, both themes). */
  tint: string;
  title: Key;
  desc: Key;
  open(): void;
  /** v12 audit: why the card cannot open now (the same lock as its sidebar item), or undefined. Shown locked, never a no-op. */
  lock?(): Key | undefined;
}

const SPAN: Record<Span, string> = { full: 'lg:col-span-3', wide: 'lg:col-span-2', narrow: 'lg:col-span-1' };
const sections: HomeSection[] = [];
const modes: ModeCard[] = [];

/** Plan 1c swaps the 'side' card by registering the same id again. */
export const registerHomeSection = (s: HomeSection): void => upsert(sections, s);
export const registerMode = (m: ModeCard): void => upsert(modes, m);

/** Plan 1c: `levelOf` = Leitner box per skill, `onSkill` = practise that skill. */
export const homeHooks: { levelOf?: (skill: string) => number; onSkill?: (skill: string) => void; startLane?: (task: Ticket) => void } = {};

const openInbox = (): void => (byId('inbox-dialog') as HTMLDialogElement).showModal();

/** v6 §3.4 airy list: one bordered card, thin lines between rows. */
export const LIST = cx(CARD, 'm-0 list-none divide-y divide-line overflow-hidden p-0');
/** Small-caps group title in --muted (v6 §3.4). */
export const GROUP_TITLE = 'mt-0 mb-3 text-caption font-bold tracking-wider text-muted uppercase';

/** One row = one thing (v6 §3.4): 40 px lead · bold title · at most one muted line · at most one action. */
/** A row's one action covers the whole row (v12, L86): a click anywhere on it follows the action, not only on the button. */
export const STRETCH = 'after:absolute after:inset-0';
/** Links inside a stretched row's text stay clickable above the cover. */
export const ABOVE = 'relative z-10';

export function listRow(r: { lead: Node; title: string; sub?: string | Node; action?: Node | null; current?: boolean; id?: string }): HTMLLIElement {
  const act = r.action instanceof HTMLElement && /^(A|BUTTON)$/.test(r.action.tagName) && !r.action.hasAttribute('disabled') && r.action.getAttribute('aria-disabled') !== 'true' ? r.action : null;
  if (act) act.classList.add(...STRETCH.split(' '));
  return h('li', {
    id: r.id ?? false,
    class: cx('flex items-center gap-4 border-l-4 px-5 py-4', act && 'relative cursor-pointer hover:bg-code', r.current ? 'border-l-accent bg-accent-soft' : 'border-l-transparent'),
    'aria-current': r.current ? 'step' : false,
  },
    h('span', { class: 'grid size-10 shrink-0 place-items-center', 'aria-hidden': 'true' }, r.lead),
    h('span', { class: 'min-w-0 flex-1' }, h('b', { class: 'block' }, r.title), r.sub ? h('span', { class: 'block text-body-sm text-muted' }, r.sub) : null),
    r.action ?? null);
}

const OUTLINE_LINK = 'rounded-full px-4 py-2 font-bold whitespace-nowrap text-ink no-underline ring-1 ring-line hover:bg-code';
const percent = (n: number, of: number): number => (of ? Math.round((n / of) * 100) : 0);

/** The ticket is already selected: only switch view (selectTicket would restart a boss at step 1). */
function resume(id: string): void {
  if (app.selectedId === id && isStory()) go('play'); // from Practice/Sandbox, selectTicket() switches back to work
  else actions.selectTicket(id);
}

/** v12.0 U5: Home is across domains: one line to go on (task · domain), no colleague's message (that card is the Overview's). v15 Q2: or the General area's. */
function resumeLine(): HTMLElement | null {
  const r = resumeTarget(app.save.completed, nextTicket(app.tickets, done()), sqlOnly(), SKILLS.map((s) => s.id));
  if (!r) return null;
  const lang = getLang();
  const go = h('span', { class: 'flex items-center gap-2' }, t(r.kind === 'ticket' ? 'home.resume' : 'home.resumeSkill'), icon('arrowRight', 'size-4 transition group-hover:translate-x-0.5'));
  const btn = cx(BTN_GO, 'group px-4 py-2');
  return h('section', { class: cx(CARD, 'flex flex-wrap items-center gap-3 p-4'), 'aria-labelledby': 'resume-title' },
    h('p', { id: 'resume-title', class: 'm-0 min-w-0 flex-1' },
      h('span', { class: 'text-muted' }, t('home.resumeLabel')), ' ',
      h('b', {}, r.kind === 'ticket' ? textOf(r.ticket, lang).title : r.kind === 'skill' ? SKILLS.find((s) => s.id === r.skill)!.label[lang] : t('nav.learn')),
      r.kind === 'learn' ? null : h('span', { class: 'text-muted' }, ` · ${r.kind === 'ticket' ? t(DOMAINS.find((d) => d.id === activeDomain())!.name) : t('nav.learn')}`)),
    r.kind === 'ticket'
      ? h('button', { type: 'button', class: btn, onclick: () => resume(r.ticket.id) }, go)
      : h('a', { href: r.kind === 'skill' ? `${hashOf('learn')}/skill/${r.skill}` : hashOf('learn'), class: cx(btn, 'no-underline') }, go));
}

/** `track`/`fill`: whole class strings (height + colours). */
function progress(value: number, label: string, track: string, fill: string): HTMLElement {
  return h('div', {
    class: cx('overflow-hidden rounded-full', track),
    role: 'progressbar', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(value),
  }, h('div', { class: cx('h-full rounded-full', fill), style: `width:${value}%` }));
}

/** "New message" (home-v3, L18 ★1): the next task as the sender's chat bubble, first paragraph of the business question. */
function continueCard(m: HomeModel): HTMLElement {
  const lang = getLang();
  const label = t('home.progress', { done: m.done, total: m.total });
  const next = m.next;
  const x = next ? textOf(next, lang) : undefined;
  return h('section', { class: cx(CARD, 'flex h-full flex-col gap-4 p-6'), 'aria-labelledby': 'continue-title' },
    h('p', { class: cx('m-0 flex items-center gap-2 text-body-sm font-semibold', chapterColor(m.chapter).text) },
      icon('inbox', 'size-4'), t('home.kicker', { n: m.chapter, title: chapterTitle(m.chapter, lang, chaptersOf()) })), // Overview only (v12.0 U5)
    h('h2', { id: 'continue-title', class: 'm-0 text-xl font-bold' }, x ? x.title : t('inbox.empty')),
    next && x
      ? h('div', { class: 'flex gap-3' },
        avatar(next.from, 'lg'),
        h('div', { class: 'min-w-0 flex-1' },
          h('p', { class: 'm-0 text-[15px]' }, h('b', {}, next.from.name), ' · ', h('span', { class: 'text-muted' }, roleLine(next.from.name, lang) || next.from.dept)),
          h('p', { class: 'mt-1 mb-0 rounded-(--r-card) rounded-tl-sm bg-code px-4 py-3 text-[15px] leading-relaxed' },
            x.body.split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, ' '))))
      : null,
    h('div', { class: 'flex items-center gap-3' },
      progress(percent(m.done, m.total), label, 'h-2.5 flex-1 bg-code', 'bg-accent'),
      h('span', { class: 'text-body-sm tabular-nums text-muted' }, label)),
    h('div', { class: 'flex flex-wrap gap-2' },
      next ? h('button', { type: 'button', class: cx(BTN_GO, 'group flex items-center gap-2 px-4 py-2'), onclick: () => resume(next.id) },
        t('home.resume'), icon('arrowRight', 'size-4 transition group-hover:translate-x-0.5')) : null,
      h('button', { type: 'button', class: 'flex items-center gap-2 px-4 py-2 font-semibold', onclick: openInbox }, icon('inbox', 'size-4'), t('top.inbox'))));
}

/** Career path (L18 ★3, L19, L30): DA intern + the five ★ titles; the current one is marked, later ones say which review opens them. */
function careerCard(): HTMLElement {
  const lang = getLang();
  const rank = rankOf(app.tickets, done());
  const rows = [{ title: t('career.intern'), at: 0 }, ...chaptersOf().filter((c) => c.tier).map((c) => ({ title: c.career[lang], at: c.chapter }))];
  const reached = (at: number): boolean => at === 0 || rank.passed.includes(at);
  const now = rows.filter((r) => reached(r.at)).pop();
  return h('section', { class: cx(CARD, 'flex h-full flex-col gap-3 p-6'), 'aria-labelledby': 'career-title' },
    h('h2', { id: 'career-title', class: 'm-0 flex items-center gap-2 text-body-sm font-semibold text-muted' }, icon('badge', 'size-4'), t('home.career')),
    rank.career ? h('p', { class: 'm-0 text-lg font-semibold' }, rank.career[lang]) : null,
    h('ol', { class: 'm-0 list-none space-y-2 p-0' }, ...rows.map((r) => h('li', {
      class: cx('flex items-center gap-2 text-[15px]', !reached(r.at) && 'text-muted'),
      'aria-current': r === now ? 'step' : false,
    },
      h('span', { class: cx('size-2.5 shrink-0 rounded-full', reached(r.at) ? 'bg-good' : 'bg-line'), 'aria-hidden': 'true' }),
      r === now ? h('b', { class: 'whitespace-nowrap' }, r.title) : h('span', { class: 'whitespace-nowrap' }, r.title), // never wraps under its dot
      r === now
        ? h('span', { class: cx(PILL, 'ml-auto', DONE_PILL) }, t('home.careerNow'))
        : reached(r.at) ? null : h('span', { class: 'ml-auto text-body-sm' }, t('home.careerAt', { n: r.at }))))));
}

/** Small status badge: the only coloured text on the card (L23). */
function statusPill(c: ChapterCard): HTMLElement | null {
  const n = { done: c.done, total: c.total };
  if (c.status === 'done') return h('span', { class: cx(PILL, DONE_PILL) }, t('home.status.done', n));
  if (c.status === 'current') return h('span', { class: cx(PILL, chapterColor(c.chapter).chip) }, t('home.status.current', n));
  return h('span', { class: cx(PILL, 'bg-code text-muted') }, t(c.status === 'soon' ? 'home.status.soon' : 'home.status.locked', n)); // same words as the sidebar (v10 critic #7)
}

/**
 * v6 §3.4 (F5, L47 #6): one row per chapter, the same shape whatever its content: number/✓/lock · title · one line
 * ("Relies on: Filter rows, Sort +2", or what opens it) · one status pill that links to the chapter's module.
 */
function chapterRow(c: ChapterCard): HTMLLIElement {
  const lang = getLang();
  const closed = c.status === 'locked' || c.status === 'soon';
  // Plan 8a Task 11: each skill links to its page, ✓ once learned anywhere (no General chunk needed); "+k" opens the module.
  const ids = reliesOn(app.tickets, c.chapter);
  const known = knownSkills(app.save, app.tickets, SKILLS.map((s) => s.id));
  const skillLink = (id: string, i: number): (Node | string)[] => [i ? ', ' : '',
    h('a', { href: `${hashOf('learn')}/skill/${id}`, class: cx(ABOVE, known.has(id) ? 'text-good' : 'text-muted') }, SKILLS.find((s) => s.id === id)?.label[lang] ?? id, known.has(id) ? ' ✓' : '')];
  const short = h('span', {}, t('home.reliesOn', { skills: '' }), ...ids.slice(0, 2).flatMap(skillLink),
    ids.length > 2 ? h('a', { href: `${hashOf('learn')}/sql/${c.chapter}`, class: cx(ABOVE, 'inline-block min-h-6 min-w-6 text-center text-muted') }, ` +${ids.length - 2}`) : null);
  // Plan 11 §1.4: the advanced nodes the chapter's tasks apply (Finance only: other domains have no adv:, so no General fetch).
  const adv = closed ? null : advLine([...new Set(app.tickets.filter((x) => x.chapter === c.chapter).flatMap((x) => x.adv ?? []))], ABOVE);
  return listRow({
    lead: closed
      ? icon('lock', 'size-5 text-muted')
      : c.status === 'done'
        ? h('span', { class: 'grid size-10 place-items-center rounded-full bg-good text-on-accent' }, icon('check', 'size-5'))
        : h('span', { class: cx('grid size-10 place-items-center rounded-full text-lg font-bold', chapterColor(c.chapter).chip) }, String(c.chapter)),
    title: `${c.chapter} · ${chapterTitle(c.chapter, lang)}`,
    sub: closed ? (c.status === 'soon' ? t('home.soonHint') : t('home.lockedAfter', { n: c.chapter - 1 })) : adv ? h('span', { class: 'flex flex-wrap gap-x-3' }, short, adv) : short,
    action: closed ? statusPill(c) : h('a', { href: `${hashOf('learn')}/sql/${c.chapter}`, class: 'no-underline', title: t('learn.module', { n: c.chapter, title: moduleTitle(c.chapter, lang) }) }, statusPill(c)),
    current: c.status === 'current',
  });
}

function chaptersSection(m: HomeModel): HTMLElement {
  return h('section', { 'aria-labelledby': 'chapters-title' },
    h('div', { class: 'mb-3 flex flex-wrap items-end justify-between gap-2' },
      h('h2', { id: 'chapters-title', class: 'm-0 text-lg font-bold' }, t('home.chapters', { n: m.chapters.length })),
      h('p', { class: 'm-0 text-body-sm text-muted' }, t('home.chaptersIntro'))),
    h('ul', { class: LIST }, ...m.chapters.map(chapterRow)));
}

/** Practise SQL (v6 §3.3–3.4): skills grouped by module, one row each, one action ("Practise") once learned. */
function skillsSection(m: HomeModel): HTMLElement {
  const lang = getLang();
  const onSkill = homeHooks.onSkill;
  const groups = CHAPTERS.map((c) => [c.chapter, m.skills.filter((s) => s.skill.chapter === c.chapter)] as const).filter(([, list]) => list.length > 0);
  // v11 B6: a skill learned through its General drills (the Learning path's rule) says so, not just "Chapter N".
  const known = knownSkills(app.save, loadTickets('logistics'), SKILLS.map((x) => x.id)); // same source as learnView's ctx()
  return h('section', { class: 'space-y-10', 'aria-labelledby': 'skills-title' },
    h('h2', { id: 'skills-title', class: 'sr-only' }, t('home.skills')),
    ...groups.map(([n, list]) => h('div', { id: `skills-ch-${n}`, class: 'scroll-mt-4' },
      h('h3', { class: GROUP_TITLE }, t('learn.module', { n, title: moduleTitle(n, lang) })),
      h('ul', { class: LIST }, ...list.map((s) => listRow({
        // v12 (L82): one tint for every module, no chapter colour or "Chapter N": General never points at a domain.
        lead: h('span', { class: 'grid size-10 place-items-center rounded-full bg-accent-soft text-accent' }, skillIcon(s.skill.id)),
        title: s.skill.label[lang],
        sub: s.state === 'learned' ? t('home.level', { n: s.level, max: LEVELS }) : t(known.has(s.skill.id) ? 'home.skillDrilled' : 'home.skillOpen'),
        // Not under review yet: the row opens the skill's page (lesson + drills), never a row with no way forward (L93).
        action: onSkill && s.state === 'learned' ? h('button', { type: 'button', class: 'rounded-full px-4 whitespace-nowrap', onclick: () => onSkill(s.skill.id) }, t('prac.skillGo'))
          : h('a', { href: `${hashOf('learn')}/skill/${s.skill.id}`, class: OUTLINE_LINK }, t('prac.skillLearn')),
      }))))),
    h('p', { class: 'm-0 text-body-sm text-muted' }, t('home.skillsHint')));
}

function modesSection(): HTMLElement | null {
  if (modes.length === 0) return null;
  return h('section', { 'aria-labelledby': 'modes-title' },
    h('h2', { id: 'modes-title', class: 'mb-3 text-lg font-bold' }, t('home.modes')),
    h('div', { class: 'grid gap-3 sm:grid-cols-3' }, ...modes.map((md) => {
      const why = md.lock?.();
      if (why) {
        return h('div', { class: cx(CARD, 'flex items-start gap-3 rounded-(--r-ctl) p-4'), 'aria-disabled': 'true' },
          h('span', { class: 'grid size-10 shrink-0 place-items-center rounded-(--r-inset) bg-code text-muted', 'aria-hidden': 'true' }, icon(md.icon)),
          h('span', { class: 'min-w-0 flex-1' }, h('b', { class: 'block text-muted' }, t(md.title)),
            h('span', { class: 'flex items-center gap-1.5 text-body-sm text-muted' }, icon('lock', 'size-3.5 shrink-0'), t(why))));
      }
      return h('button', {
        type: 'button',
        class: cx(CARD_ACTION, 'group flex items-start gap-3 rounded-(--r-ctl) border-0 p-4 text-left'),
        onclick: () => md.open(),
      },
        h('span', { class: cx('grid size-10 shrink-0 place-items-center rounded-(--r-inset)', md.tint), 'aria-hidden': 'true' }, icon(md.icon)),
        h('span', { class: 'min-w-0 flex-1' }, h('b', { class: 'block' }, t(md.title)), h('span', { class: 'text-body-sm text-muted' }, t(md.desc))),
        icon('arrowRight', 'mt-0.5 size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent'));
    })));
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
/** Below lg the SVG labels hide (L34), so the title and status lines show as HTML under the picture. */
let stopScene: (() => void) | undefined;
function harborSection(m: HomeModel): HTMLElement {
  const words = domainText();
  if (words) { // Plan 9 D9-13: the domain's own scene, never the harbour
    return h('section', { class: cx(CARD, 'overflow-hidden'), 'aria-labelledby': 'harbor-title' },
      h('h2', { id: 'harbor-title', class: 'm-0 px-4 pt-3 text-lg font-bold' }, t(words.sceneTitle)), domainArt('scene'));
  }
  const harbor = derive(app.tickets, done());
  const fresh = freshChapters();
  return h('section', { class: cx(CARD, 'overflow-hidden'), 'aria-labelledby': 'harbor-title' },
    h('h2', { id: 'harbor-title', class: 'sr-only' }, t('harbor.title')),
    artSlot('aspect-[1100/400]', (a) => {
      stopScene?.();
      const p = a.harborScene(harbor, { ambient: true, current: m.chapter, fresh });
      const stops = [a.parallax(p.svg), a.harborLife(p)];
      stopScene = () => stops.forEach((f) => f());
      return p.svg;
    }),
    h('div', { class: 'px-4 py-3 text-body-sm lg:hidden', 'aria-hidden': 'true' },
      h('p', { class: 'm-0 font-bold' }, t('harbor.title')),
      ...callout(harbor, m.chapter).map((line) => h('p', { class: 'm-0 text-muted' }, line))));
}

let stopMap: (() => void) | undefined;
/** Lane whose brief is open on the Map page (session only). */
let mapLane: string | undefined;

/** v12.0 U4: a pin or a list row opens that lane's brief beside the map (under it below 1024 px); its name is announced. */
function pickLane(port: string): void {
  mapLane = port;
  actions.rerender();
  byId('announce').textContent = LANES.find((r) => r.port === port)?.name ?? '';
  byId('home').querySelector<HTMLElement>('#lane-title')?.scrollIntoView({ block: 'nearest' });
}

function routesSection(): HTMLElement {
  const words = domainText();
  if (words) {
    return h('section', { class: cx(CARD, 'p-5'), 'aria-labelledby': 'routes-title' },
      h('h2', { id: 'routes-title', class: 'm-0 mb-2 text-lg font-bold' }, t(words.mapTitle)), domainArt('map'));
  }
  const harbor = derive(app.tickets, done());
  const list = h('ul', { class: 'mt-3 mb-0 grid list-none gap-1.5 p-0 text-body-sm sm:grid-cols-2' }, ...LANES.map((r) =>
    h('li', {}, h('button', {
      type: 'button', id: `lane-btn-${r.port}`, 'aria-current': r.port === mapLane ? 'true' : false,
      class: cx('flex w-full items-center gap-2 px-3 py-1.5 text-left max-lg:min-h-11', r.port === mapLane && 'ring-2 ring-accent', !harbor.open.has(r.port) && 'text-muted'),
      onclick: () => pickLane(r.port),
    }, icon(harbor.open.has(r.port) ? 'route' : 'lock', 'size-4'), h('b', {}, r.name), h('span', { class: 'ml-auto text-muted' }, laneInfo(r, harbor))))));
  const brief = mapLane
    ? h('div', { class: 'min-w-0 rounded-(--r-ctl) p-4 ring-1 ring-line' }, lanePanel(mapLane, harbor, (task) => homeHooks.startLane?.(task)))
    : h('p', { class: 'm-0 self-start rounded-(--r-ctl) bg-code p-4 text-body-sm text-muted' }, t('lane.pick'));
  return h('section', { class: cx(CARD, 'p-5'), 'aria-labelledby': 'routes-title' },
    h('div', { class: 'mb-2 flex flex-wrap items-end justify-between gap-2' },
      h('h2', { id: 'routes-title', class: 'm-0 text-lg font-bold' }, t('routes.title')),
      h('p', { class: 'm-0 text-body-sm text-muted' }, t('routes.subtitle'))),
    // ui-ux-v6 S2: the map takes the card's full width (labels ≥ 11 px from lg); the lane list and the brief sit below it
    artSlot('aspect-[5/2] rounded-(--r-ctl)', (a) => {
      stopMap?.(); // one fleet per page: the previous drawing's loop ends here
      const p = a.routeMap(harbor);
      wirePins(p, harbor, pickLane);
      stopMap = a.liveMap(p, harbor, takeNewRoutes(harbor.open), fleetOrder());
      return p.svg;
    }),
    h('div', { class: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]' }, h('div', { class: 'min-w-0' }, list), h('div', { class: 'min-w-0 lg:mt-3' }, brief)));
}

/** L48 D-A1: the company tiles moved to #/dashboard (src/ui/dashboard.ts); Home keeps a one-line teaser that links there. */
function kpiSection(): HTMLElement {
  const tiles = kpiTiles(kpisOf(), app.tickets, done());
  return h('a', { href: hashOf('dashboard'), class: cx(CARD_ACTION, 'group flex items-center gap-3 p-4 text-ink no-underline') },
    h('span', { class: 'grid size-9 shrink-0 place-items-center rounded-(--r-inset) bg-code', 'aria-hidden': 'true' }, icon('chart')),
    h('span', { class: 'min-w-0 flex-1' }, h('b', {}, t('dash.title')), ' · ',
      t('dash.teaser', { open: tiles.filter((x) => x.open).length, total: tiles.length, cards: domainSlot(app.save, activeDomain()).dashboard.cards.length })),
    icon('arrowRight', 'size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent'));
}

const STAGE_NAME = ['lily.stage0', 'lily.stage1', 'lily.stage2', 'lily.stage3', 'lily.stage4', 'lily.stage5'] as const;
/** L87: Lily's growth, from learned skills (General = Logistics, like the learning path), so a domain switch never changes her. */
function lilyNow(): { stage: LilyStage; known: number; next?: number } {
  const ids = SKILLS.map((x) => x.id);
  const known = knownSkills(app.save, loadTickets('logistics'), ids).size;
  return { stage: lilyStage(known, ids.length), known, next: toNextStage(known, ids.length) };
}
let lilyMark: { save: object; n: number } | undefined;
let grewPill = false;
/**
 * rerender(): every Lily drawn by mascot() and the teaching scene show the current stage and colour. ui-ux-v5 A1: a rise since the
 * last call (same save object: the first call and an import only set the mark) starts the 4 s grow window, the Home pill, the album
 * day of every stage crossed (L134) and one sentence appended to #announce after the event's own sentence (a lane or drill writes it
 * after its rerender()).
 */
export function syncLily(): void {
  const { stage } = lilyNow();
  const rose = gainSince(lilyMark, app.save, stage) > 0;
  grewPill = rose || (grewPill && lilyMark?.save === app.save);
  if (rose) {
    markGrew(lilyMark!.n); // L132: the ceremony plays from the stage she had, however many she jumped
    markStages(lilyMark!.n, stage, localDay(new Date()));
  }
  lilyMark = { save: app.save, n: stage };
  setLilyStage(stage, accAt(readLily(), stage));
  if (!rose) return;
  queueMicrotask(() => {
    byId('announce').append(` ${t('lily.grew', { stage: t(STAGE_NAME[stage]) })}`);
    // L132: Home on screen: the hello Lily plays it once (drawn by this rerender; attached at the event, never while drawing)
    if (!byId('home').hidden) react(document.querySelector('#home [data-lily-hello]'), true);
  });
}
/** main.ts showRoute(): the "Just grew" pill stays until the player first leaves Home. */
export const leftHello = (): void => { grewPill = false; };

const PET = 'shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:row-span-2';
/**
 * L134 P2 "Pet Lily": she cheers (the cheer pose for one reaction, MOVES.cheer.ms); no reward, no counter. Clicks while she is still
 * cheering do nothing; a click during the grow ceremony skips it to her new look instead. No transform on the button (L93).
 */
function petButton(): HTMLButtonElement {
  const idle = mascot('lily', 'idle', 'size-24'); // L132 P-L5: 96 px, so six stages read apart
  let busy = false;
  const btn = h('button', { type: 'button', class: PET, 'aria-label': t('lily.pet'), 'data-lily-hello': '', onclick: () => {
    const now = btn.querySelector<SVGSVGElement>('svg[data-mascot]');
    if (now && growing(now)) return settle(now);
    if (busy) return;
    busy = true;
    const cheer = mascot('lily', 'cheer', 'size-24');
    idle.replaceWith(cheer);
    react(cheer, false);
    setTimeout(() => { cheer.replaceWith(idle); busy = false; }, MOVES.cheer.ms);
  } }, idle);
  return btn;
}

/** Platform Home (v5 §B.5): Lily (the player, at her growth stage, L87) and the tagline (v5 §A.3). */
function helloSection(): HTMLElement {
  const { stage, known, next } = lilyNow();
  // ui-ux-v5 C2: the day number is its own <span>, flipped once on the first draw after a new day was written.
  const [pre, post] = t('lily.line', { stage: t(STAGE_NAME[stage]), n: '' }).split('');
  const flip = app.dayFlip;
  app.dayFlip = false;
  return h('section', { class: 'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2' }, petButton(), // phones: the card takes its own row
    h('div', { class: 'min-w-0' }, h('p', { class: 'm-0 text-2xl font-extrabold' }, t('app.name')), h('p', { class: 'm-0 text-muted' }, t('home.tagline')),
      h('p', { class: 'mt-2 mb-0 text-body-sm font-semibold' }, pre, h('span', { class: flip && 'cq-flip' }, String(dayCount())), post,
        grewPill ? h('span', { class: 'ml-2 rounded-full bg-sun px-2 py-0.5 text-caption font-bold text-sun-ink' }, t('lily.grewPill')) : null)),
    lilyCard(stage, known, next));
}

/**
 * L132 "Your Lily": how far to the next stage (one labelled <progress>, L134: one line, the newborn's sentence at stage 0) and that
 * stage as a silhouette (a Lily of her own data-stage, decorative: its name is the caption). Nothing to feed, nothing that drops:
 * only what she becomes next. Below: the growth album and the colour picker (L134 P2/P3).
 */
function lilyCard(stage: LilyStage, known: number, next: number | undefined): HTMLElement {
  const up = next === undefined || stage === LAST_STAGE ? undefined : (stage + 1) as LilyStage;
  const goal = known + (next ?? 0);
  const line = up === undefined ? t('lily.max') : stage === 0 ? t('lily.newborn') : t('lily.growBar', { k: known, next: goal });
  return h('div', { class: 'col-span-2 max-w-md rounded-(--r-ctl) bg-panel p-3 ring-1 ring-line sm:col-span-1' },
    h('div', { class: 'flex items-center gap-3' },
      h('div', { class: 'min-w-0 flex-1' },
        h('p', { class: 'm-0 text-body-sm font-bold' }, t('lily.card')),
        up === undefined ? null : h('progress', { class: 'lily-bar mt-2 h-2 w-full', max: String(goal), value: String(known), 'aria-labelledby': 'lily-grow' }),
        h('p', { id: 'lily-grow', class: 'm-0 text-body-sm text-muted' }, line)),
      up === undefined ? null : h('div', { class: 'flex w-20 shrink-0 flex-col items-center gap-1 text-center text-caption text-muted' },
        mascot('lily', 'idle', 'size-10 lily-shadow-fig', undefined, up), t('lily.nextShadow', { stage: t(STAGE_NAME[up]) }))),
    lilyAlbum(stage));
}

let albumOpen = false; // Home redraws on every rerender(): the <details> keeps its state across them
/** L134 P2: the six stages with the day each was reached (device pref; "earlier" when unknown), the rest as silhouettes. */
function lilyAlbum(stage: LilyStage): HTMLElement {
  const pref = readLily();
  const first = firstDay() ?? localDay(new Date()); // nothing saved yet: today is day 1 (dayCount)
  const fmt = (d: string) => new Date(`${d}T00:00`).toLocaleDateString(getLang() === 'vi' ? 'vi-VN' : 'en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' });
  const shots = STAGE_NAME.map((name, n) => {
    const on = reachedOn(pref, n, stage, first);
    return h('li', { class: 'flex flex-col items-center gap-0.5 text-center' },
      mascot('lily', 'idle', on === undefined ? 'size-12 lily-shadow-fig' : 'size-12', undefined, n),
      h('span', { class: 'text-caption font-semibold' }, t(name)),
      h('span', { class: 'text-caption text-muted' }, on === undefined ? t('lily.albumSoon') : on === null ? t('lily.albumOld') : t('lily.albumAt', { date: fmt(on) })));
  });
  const box = h('details', { class: 'mt-2', open: albumOpen, ontoggle: () => { albumOpen = box.open; } },
    h('summary', { class: 'cursor-pointer text-body-sm font-semibold text-accent' }, t('lily.album')),
    h('ol', { class: 'm-0 mt-2 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-6' }, ...shots),
    stage >= ACC_AT[0] ? accPicker(stage, accAt(pref, stage)) : null);
  return box;
}

/** L134 P3: the default look (collar, scarf, harness), then --lily-acc1..6 (style.css); whole literal classes (tests/theme.test.ts). */
const SWATCH = ['bg-[conic-gradient(var(--lily-collar)_0_33%,var(--lily-scarf)_0_67%,var(--lily-harness)_0)]', 'bg-(--lily-acc1)', 'bg-(--lily-acc2)', 'bg-(--lily-acc3)', 'bg-(--lily-acc4)', 'bg-(--lily-acc5)', 'bg-(--lily-acc6)'] as const;
const ACC_NAME = ['lily.acc0', 'lily.acc1', 'lily.acc2', 'lily.acc3', 'lily.acc4', 'lily.acc5', 'lily.acc6'] as const;
/**
 * L134 P3: one colour for her collar, scarf and harness (native radios; 0 = the default look). A colour her stage has not unlocked
 * shows a lock and the stage that opens it, never a silent no-op. Looks only, changed any time; a device pref like the album days.
 */
function accPicker(stage: LilyStage, acc: number | undefined): HTMLElement {
  const dot = 'grid size-7 place-items-center rounded-full ring-1 ring-line';
  return h('fieldset', { class: 'm-0 mt-3 border-0 p-0' },
    h('legend', { class: 'p-0 text-body-sm font-semibold' }, t('lily.accColor')),
    h('div', { class: 'mt-1 flex flex-wrap gap-2' }, ...ACC_NAME.map((name, n) => {
      const at = n ? ACC_AT[n - 1] : 0;
      if (at > stage) {
        const why = t('lily.accLocked', { name: t(name), stage: t(STAGE_NAME[at]) });
        return h('span', { class: cx(dot, SWATCH[n], 'text-white'), title: why }, icon('lock', 'size-3.5'), h('span', { class: 'sr-only' }, why));
      }
      return h('label', { class: 'cursor-pointer', title: t(name) },
        h('input', { type: 'radio', name: 'lily-acc', class: 'peer sr-only', checked: (acc ?? 0) === n, onchange: () => {
          setAcc(n || undefined);
          setLilyStage(stage, n || undefined);
        } }),
        h('span', { class: cx(dot, SWATCH[n], 'peer-checked:ring-3 peer-checked:ring-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent') }),
        h('span', { class: 'sr-only' }, t(name)));
    })));
}

/** L87: the learning path's overview opens with Boon teaching Lily; kept across redraws (its loops and highlight stay). */
let learnScene: HTMLElement | undefined;
function teachSection(): HTMLElement | null {
  const hash = location.hash;
  if (learnModuleOf(hash) !== undefined || learnSkillOf(hash) || learnAdvOf(hash) || isInterviewPage(hash)) return null;
  if (!learnScene?.isConnected) learnScene = teachScene('lg'); // reused while shown; a page left and re-entered gets a fresh observer
  relabelScene(learnScene);
  return learnScene;
}

/** Platform Home (v5 §B.5 #3): every domain with its progress line and a way in. */
function domainsSection(): HTMLElement {
  return h('section', { 'aria-labelledby': 'domains-title' },
    h('h2', { id: 'domains-title', class: GROUP_TITLE }, t('home.domains')),
    h('ul', { class: LIST }, ...DOMAINS.map((d) => listRow({
      lead: icon(d.icon, 'size-6'),
      title: t(d.name),
      sub: domainLine(d.id),
      action: h('a', { href: domainHash(d.id), class: cx(BTN_SECONDARY, 'px-4 py-2 whitespace-nowrap no-underline') }, t('home.enter')),
    }))));
}

/** Platform Home (v5 §B.5 #4): one line, the full list is on the learning path. */
function skillsTeaser(m: HomeModel): HTMLElement {
  return h('a', { href: hashOf('learn'), class: cx(CARD_ACTION, 'group flex items-center gap-3 p-4 text-ink no-underline') },
    h('span', { class: 'grid size-9 shrink-0 place-items-center rounded-full bg-code', 'aria-hidden': 'true' }, icon('route')),
    h('span', { class: 'min-w-0 flex-1 font-semibold' }, t('home.skillsTeaser', { n: m.learned, total: m.skills.length })),
    icon('arrowRight', 'size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent'));
}

registerHomeSection({ id: 'teach', order: 5, span: 'full', pages: ['learn'], render: teachSection });
registerHomeSection({ id: 'hello', order: 1, span: 'full', pages: ['home'], render: helloSection });
registerHomeSection({ id: 'harbor', order: 5, span: 'full', pages: ['overview'], render: harborSection });
registerHomeSection({ id: 'continue', order: 10, span: 'wide', pages: ['overview'], render: continueCard });
registerHomeSection({ id: 'resume', order: 10, span: 'full', pages: ['home'], render: resumeLine });
registerHomeSection({ id: 'career', order: 20, span: 'narrow', pages: ['overview'], render: careerCard });
registerHomeSection({ id: 'routes', order: 25, span: 'full', pages: ['map'], render: routesSection });
registerHomeSection({ id: 'domains', order: 28, span: 'full', pages: ['home'], render: domainsSection });
registerHomeSection({ id: 'chapters', order: 30, span: 'full', pages: ['overview'], render: chaptersSection });
registerHomeSection({ id: 'kpi', order: 35, span: 'full', pages: ['overview'], render: kpiSection });
registerHomeSection({ id: 'skills', order: 40, span: 'full', pages: ['practice'], render: skillsSection });
registerHomeSection({ id: 'skillsTeaser', order: 45, span: 'full', pages: ['home'], render: skillsTeaser });
registerHomeSection({ id: 'modes', order: 50, span: 'full', pages: ['overview'], render: modesSection });

const PAGE_TITLE: Record<Page, Key> = {
  home: 'nav.home', learn: 'nav.learn', practice: 'nav.practice', overview: 'nav.overview', map: 'nav.map',
};
const pageOf = (r: string): Page => (r === 'learn' || r === 'practice' || r === 'overview' || r === 'map' ? r : 'home');

/** Redrawn by rerender() (language switch, progress). Pure DOM from homeModel(); keeps no state of its own. */
export function renderHome(host: HTMLElement): void {
  const page = pageOf(currentRoute());
  // General pages (Home, learning path, Practise SQL) follow Logistics; domain pages the open domain (Plan 9 D9-12).
  const general = page === 'home' || page === 'learn' || page === 'practice';
  const m = general || activeDomain() === 'logistics'
    ? homeModel(general ? loadTickets('logistics') : app.tickets, done(), CHAPTERS, SKILLS, homeHooks.levelOf)
    : homeModel(app.tickets, done(), chaptersOf(), domainSkills(app.tickets), homeHooks.levelOf);
  const grid = page === 'overview'; // the harbour page keeps its 3-column grid; the others are one 880 px column (v6 §3.3)
  const enter = host.dataset.enter !== undefined; // ui-ux-v5 C1: set by showRoute(), used by this draw only
  delete host.dataset.enter;
  host.replaceChildren(
    h('h1', {
      id: 'home-title', tabindex: '-1',
      class: page === 'home' || page === 'overview' ? 'sr-only' : 'mx-auto mt-6 mb-0 max-w-(--w-read) px-4 text-heading',
    }, t(PAGE_TITLE[page])),
    h('div', { class: cx(grid ? 'mx-auto grid max-w-(--w-wide) gap-5 px-4 py-6 lg:grid-cols-3' : 'mx-auto grid max-w-(--w-read) gap-8 px-4 py-6', enter && 'cq-enter') },
      ...nodes(...sections.filter((s) => s.pages.includes(page)).map((s) => {
        const el = s.render(m);
        return el && h('div', { class: cx('min-w-0', grid && SPAN[s.span]) }, el);
      }))));
}
