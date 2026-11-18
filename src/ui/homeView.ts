import { loadTickets } from '../content';
import { activeDomain, DOMAINS, type Domain } from '../domains';
import { homeModel, knownSkills, kpisOf, kpiTiles, learnedSkills, LEVELS, reliesOn, type ChapterCard, type HomeModel } from '../home';
import { getLang, t, type Key } from '../i18n';
import { CHAPTERS, chaptersOf, chapterTitle, domainSkills, moduleTitle, nextTicket, rankOf, SKILLS } from '../progress';
import { domainSlot } from '../save';
import { ecomArt } from './ecomArt';
import { domainLine } from './topbar';
import { derive, ROUTES as LANES } from '../scene';
import { domainHash, learnAdvOf, learnModuleOf, learnSkillOf, soonDomainOf } from '../route';
import { laneInfo, lanePanel, wirePins } from './lanePanel';
import { mascot, setLilyStage } from './mascots';
import { dayCount, lilyStage, toNextStage } from '../lily';
import { relabelScene, teachScene } from './teachScene';
import { currentRoute } from './router';
import { actions, app, done } from '../state';
import { BTN_GO, CARD, CARD_ACTION, chapterColor, cx, DONE_PILL, PILL } from '../theme';
import { roleLine } from '../people';
import { upsert } from '../registry';
import { hashOf } from '../route';
import { textOf, type Ticket } from '../tickets';
import { avatar } from './avatar';
import { icon, skillIcon, type IconName } from './icons';
import { byId, h, nodes } from './dom';
import { artSlot, illustration } from '../art/load';
import { fleetOrder, takeNewRoutes } from '../routesSeen';
import { callout } from './routeText';
import { isStory } from '../session';
import { go } from './router';

/** Width on >= lg screens (3-column grid, Overview only); every section is full width below lg and on the other pages. */
export type Span = 'full' | 'wide' | 'narrow';
/** Reading pages drawn in <main id="home"> (v5 §B.4–B.6, v6 §3.3): one per route except play, data and dashboard. */
export type Page = 'home' | 'learn' | 'practice' | 'overview' | 'map' | 'soon';
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
export const GROUP_TITLE = 'mt-0 mb-3 text-xs font-bold tracking-wider text-muted uppercase';

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
    h('span', { class: 'min-w-0 flex-1' }, h('b', { class: 'block' }, r.title), r.sub ? h('span', { class: 'block text-sm text-muted' }, r.sub) : null),
    r.action ?? null);
}

/** A mascot and its words (v6 §2.1): --sun-ink on --sun ≥ 8:1; the picture is decorative, the words carry the meaning. */
export function bubble(who: Node, text: string): HTMLElement {
  return h('div', { class: 'flex items-end gap-3' }, who,
    h('p', { class: 'm-0 rounded-(--r-card) rounded-bl-sm bg-sun px-4 py-3 font-semibold text-sun-ink' }, text));
}

const soonDomain = (): Domain => DOMAINS.find((d) => d.id === (soonDomainOf(location.hash) ?? 'finance'))!;
const OUTLINE_LINK = 'rounded-full px-4 py-2 font-bold whitespace-nowrap text-ink no-underline ring-1 ring-line hover:bg-code';
const percent = (n: number, of: number): number => (of ? Math.round((n / of) * 100) : 0);

/** The ticket is already selected: only switch view (selectTicket would restart a boss at step 1). */
function resume(id: string): void {
  if (app.selectedId === id && isStory()) go('play'); // from Practice/Sandbox, selectTicket() switches back to work
  else actions.selectTicket(id);
}

/** v12.0 U5: Home is across domains: one line to go on (task · domain), no colleague's message (that card is the Overview's). */
function resumeLine(): HTMLElement | null {
  const next = nextTicket(app.tickets, done());
  if (!next) return null;
  const domain = t(DOMAINS.find((d) => d.id === activeDomain())!.name);
  return h('section', { class: cx(CARD, 'flex flex-wrap items-center gap-3 p-4'), 'aria-labelledby': 'resume-title' },
    h('p', { id: 'resume-title', class: 'm-0 min-w-0 flex-1' },
      h('span', { class: 'text-muted' }, t('home.resumeLabel')), ' ', h('b', {}, textOf(next, getLang()).title), h('span', { class: 'text-muted' }, ` · ${domain}`)),
    h('button', { type: 'button', class: cx(BTN_GO, 'group flex items-center gap-2 px-4 py-2'), onclick: () => resume(next.id) },
      t('home.resume'), icon('arrowRight', 'size-4 transition group-hover:translate-x-0.5')));
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
    h('p', { class: cx('m-0 flex items-center gap-2 text-sm font-semibold', chapterColor(m.chapter).text) },
      icon('inbox', 'size-4'), t('home.kicker', { n: m.chapter, title: chapterTitle(m.chapter, lang, chaptersOf()) })), // Overview only (v12.0 U5)
    h('h2', { id: 'continue-title', class: 'm-0 text-xl font-bold' }, x ? x.title : t('inbox.empty')),
    next && x
      ? h('div', { class: 'flex gap-3' },
        avatar(next.from, 'lg'),
        h('div', { class: 'min-w-0 flex-1' },
          h('p', { class: 'm-0 text-[15px]' }, h('b', {}, next.from.name), ' · ', h('span', { class: 'text-muted' }, roleLine(next.from.name, lang) || next.from.dept)),
          h('p', { class: 'mt-1 mb-0 rounded-2xl rounded-tl-sm bg-code px-4 py-3 text-[15px] leading-relaxed' },
            x.body.split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, ' '))))
      : null,
    h('div', { class: 'flex items-center gap-3' },
      progress(percent(m.done, m.total), label, 'h-2.5 flex-1 bg-code', 'bg-accent'),
      h('span', { class: 'text-sm tabular-nums text-muted' }, label)),
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
    h('h2', { id: 'career-title', class: 'm-0 flex items-center gap-2 text-sm font-semibold text-muted' }, icon('badge', 'size-4'), t('home.career')),
    rank.career ? h('p', { class: 'm-0 text-lg font-semibold' }, rank.career[lang]) : null,
    h('ol', { class: 'm-0 list-none space-y-2 p-0' }, ...rows.map((r) => h('li', {
      class: cx('flex items-center gap-2 text-[15px]', !reached(r.at) && 'text-muted'),
      'aria-current': r === now ? 'step' : false,
    },
      h('span', { class: cx('size-2.5 shrink-0 rounded-full', reached(r.at) ? 'bg-emerald-600' : 'bg-line'), 'aria-hidden': 'true' }),
      r === now ? h('b', { class: 'whitespace-nowrap' }, r.title) : h('span', { class: 'whitespace-nowrap' }, r.title), // never wraps under its dot
      r === now
        ? h('span', { class: cx(PILL, 'ml-auto', DONE_PILL) }, t('home.careerNow'))
        : reached(r.at) ? null : h('span', { class: 'ml-auto text-sm' }, t('home.careerAt', { n: r.at }))))));
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
  return listRow({
    lead: closed
      ? icon('lock', 'size-5 text-muted')
      : c.status === 'done'
        ? h('span', { class: 'grid size-10 place-items-center rounded-full bg-emerald-700 text-white' }, icon('check', 'size-5'))
        : h('span', { class: cx('grid size-10 place-items-center rounded-full text-lg font-bold', chapterColor(c.chapter).chip) }, String(c.chapter)),
    title: `${c.chapter} · ${chapterTitle(c.chapter, lang)}`,
    sub: closed ? (c.status === 'soon' ? t('home.soonHint') : t('home.lockedAfter', { n: c.chapter - 1 })) : short,
    action: closed ? statusPill(c) : h('a', { href: `${hashOf('learn')}/sql/${c.chapter}`, class: 'no-underline', title: t('learn.module', { n: c.chapter, title: moduleTitle(c.chapter, lang) }) }, statusPill(c)),
    current: c.status === 'current',
  });
}

function chaptersSection(m: HomeModel): HTMLElement {
  return h('section', { 'aria-labelledby': 'chapters-title' },
    h('div', { class: 'mb-3 flex flex-wrap items-end justify-between gap-2' },
      h('h2', { id: 'chapters-title', class: 'm-0 text-lg font-bold' }, t('home.chapters', { n: m.chapters.length })),
      h('p', { class: 'm-0 text-sm text-muted' }, t('home.chaptersIntro'))),
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
    h('p', { class: 'm-0 text-sm text-muted' }, t('home.skillsHint')));
}

function modesSection(): HTMLElement | null {
  if (modes.length === 0) return null;
  return h('section', { 'aria-labelledby': 'modes-title' },
    h('h2', { id: 'modes-title', class: 'mb-3 text-lg font-bold' }, t('home.modes')),
    h('div', { class: 'grid gap-3 sm:grid-cols-3' }, ...modes.map((md) => {
      const why = md.lock?.();
      if (why) {
        return h('div', { class: cx(CARD, 'flex items-start gap-3 rounded-xl p-4'), 'aria-disabled': 'true' },
          h('span', { class: 'grid size-10 shrink-0 place-items-center rounded-lg bg-code text-muted', 'aria-hidden': 'true' }, icon(md.icon)),
          h('span', { class: 'min-w-0 flex-1' }, h('b', { class: 'block text-muted' }, t(md.title)),
            h('span', { class: 'flex items-center gap-1.5 text-sm text-muted' }, icon('lock', 'size-3.5 shrink-0'), t(why))));
      }
      return h('button', {
        type: 'button',
        class: cx(CARD_ACTION, 'group flex items-start gap-3 rounded-xl border-0 p-4 text-left'),
        onclick: () => md.open(),
      },
        h('span', { class: cx('grid size-10 shrink-0 place-items-center rounded-lg', md.tint), 'aria-hidden': 'true' }, icon(md.icon)),
        h('span', { class: 'min-w-0 flex-1' }, h('b', { class: 'block' }, t(md.title)), h('span', { class: 'text-sm text-muted' }, t(md.desc))),
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
  if (activeDomain() !== 'logistics') { // Plan 9 D9-13: the Lantern Market scene, never the harbour
    return h('section', { class: cx(CARD, 'overflow-hidden'), 'aria-labelledby': 'harbor-title' },
      h('h2', { id: 'harbor-title', class: 'm-0 px-4 pt-3 text-lg font-bold' }, t('ecom.scene.title')), ecomArt('scene'));
  }
  const harbor = derive(app.tickets, done());
  const fresh = freshChapters();
  return h('section', { class: cx(CARD, 'overflow-hidden'), 'aria-labelledby': 'harbor-title' },
    h('h2', { id: 'harbor-title', class: 'sr-only' }, t('harbor.title')),
    artSlot('aspect-[1100/400]', (a) => {
      stopScene?.();
      const { svg } = a.harborScene(harbor, { ambient: true, current: m.chapter, fresh });
      stopScene = a.parallax(svg);
      return svg;
    }),
    h('div', { class: 'px-4 py-3 text-sm lg:hidden', 'aria-hidden': 'true' },
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
  if (activeDomain() !== 'logistics') {
    return h('section', { class: cx(CARD, 'p-5'), 'aria-labelledby': 'routes-title' },
      h('h2', { id: 'routes-title', class: 'm-0 mb-2 text-lg font-bold' }, t('ecom.map.title')), ecomArt('map'));
  }
  const harbor = derive(app.tickets, done());
  const list = h('ul', { class: 'mt-3 mb-0 grid list-none gap-1.5 p-0 text-sm sm:grid-cols-2' }, ...LANES.map((r) =>
    h('li', {}, h('button', {
      type: 'button', id: `lane-btn-${r.port}`, 'aria-current': r.port === mapLane ? 'true' : false,
      class: cx('flex w-full items-center gap-2 px-3 py-1.5 text-left max-lg:min-h-11', r.port === mapLane && 'ring-2 ring-accent', !harbor.open.has(r.port) && 'text-muted'),
      onclick: () => pickLane(r.port),
    }, icon(harbor.open.has(r.port) ? 'route' : 'lock', 'size-4'), h('b', {}, r.name), h('span', { class: 'ml-auto text-muted' }, laneInfo(r, harbor))))));
  const brief = mapLane
    ? h('div', { class: 'min-w-0 rounded-xl p-4 ring-1 ring-line' }, lanePanel(mapLane, harbor, (task) => homeHooks.startLane?.(task)))
    : h('p', { class: 'm-0 self-start rounded-xl bg-code p-4 text-sm text-muted' }, t('lane.pick'));
  return h('section', { class: cx(CARD, 'p-5'), 'aria-labelledby': 'routes-title' },
    h('div', { class: 'mb-2 flex flex-wrap items-end justify-between gap-2' },
      h('h2', { id: 'routes-title', class: 'm-0 text-lg font-bold' }, t('routes.title')),
      h('p', { class: 'm-0 text-sm text-muted' }, t('routes.subtitle'))),
    h('div', { class: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]' },
      h('div', { class: 'min-w-0' },
        artSlot('aspect-[980/260] rounded-xl', (a) => {
          stopMap?.(); // one fleet per page: the previous drawing's loop ends here
          const p = a.routeMap(harbor);
          wirePins(p, harbor, pickLane);
          stopMap = a.liveMap(p, harbor, takeNewRoutes(harbor.open), fleetOrder());
          return p.svg;
        }),
        list),
      brief));
}

/** L48 D-A1: the company tiles moved to #/dashboard (src/ui/dashboard.ts); Home keeps a one-line teaser that links there. */
function kpiSection(): HTMLElement {
  const tiles = kpiTiles(kpisOf(), app.tickets, done());
  return h('a', { href: hashOf('dashboard'), class: cx(CARD_ACTION, 'group flex items-center gap-3 p-4 text-ink no-underline') },
    h('span', { class: 'grid size-9 shrink-0 place-items-center rounded-lg bg-code', 'aria-hidden': 'true' }, icon('chart')),
    h('span', { class: 'min-w-0 flex-1' }, h('b', {}, t('dash.title')), ' · ',
      t('dash.teaser', { open: tiles.filter((x) => x.open).length, total: tiles.length, cards: domainSlot(app.save, activeDomain()).dashboard.cards.length })),
    icon('arrowRight', 'size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent'));
}

const STAGE_NAME = ['lily.stage0', 'lily.stage1', 'lily.stage2', 'lily.stage3'] as const;
/** L87: Lily's growth, from learned skills (General = Logistics, like the learning path), so a domain switch never changes her. */
function lilyNow(): { stage: 0 | 1 | 2 | 3; next?: number } {
  const ids = SKILLS.map((x) => x.id);
  const known = knownSkills(app.save, loadTickets('logistics'), ids).size;
  return { stage: lilyStage(known, ids.length), next: toNextStage(known, ids.length) };
}
/** rerender(): every Lily drawn by mascot() and the teaching scene show the current stage. */
export const syncLily = (): void => setLilyStage(lilyNow().stage);

/** Platform Home (v5 §B.5): Lily (the player, at her growth stage, L87) and the tagline (v5 §A.3). */
function helloSection(): HTMLElement {
  const { stage, next } = lilyNow();
  return h('section', { class: 'flex items-center gap-4' }, mascot('lily', 'idle', 'size-20'),
    h('div', { class: 'min-w-0' }, h('p', { class: 'm-0 text-2xl font-extrabold' }, t('app.name')), h('p', { class: 'm-0 text-muted' }, t('home.tagline')),
      h('p', { class: 'mt-2 mb-0 text-sm font-semibold' }, t('lily.line', { stage: t(STAGE_NAME[stage]), n: dayCount() })),
      h('p', { class: 'm-0 text-sm text-muted' }, next === undefined ? t('lily.max') : t('lily.next', { n: next }))));
}

/** L87: the learning path's overview opens with Boon teaching Lily; kept across redraws (its loops and highlight stay). */
let learnScene: HTMLElement | undefined;
function teachSection(): HTMLElement | null {
  const hash = location.hash;
  if (learnModuleOf(hash) !== undefined || learnSkillOf(hash) || learnAdvOf(hash)) return null;
  if (!learnScene?.isConnected) learnScene = teachScene('lg'); // reused while shown; a page left and re-entered gets a fresh observer
  relabelScene(learnScene);
  return learnScene;
}

/** Platform Home (v5 §B.5 #3): Logistics with its chapter and rank, then the domains that are coming (D-N3). */
function domainsSection(): HTMLElement {
  return h('section', { 'aria-labelledby': 'domains-title' },
    h('h2', { id: 'domains-title', class: GROUP_TITLE }, t('home.domains')),
    h('ul', { class: LIST }, ...DOMAINS.map((d) => listRow({
      lead: icon(d.icon, 'size-6'),
      title: t(d.name),
      sub: domainLine(d.id),
      action: h('a', { href: domainHash(d.id), class: d.live ? cx(BTN_GO, 'px-4 py-2 whitespace-nowrap no-underline') : OUTLINE_LINK },
        t(d.live ? 'home.enter' : 'home.peek')),
    }))));
}

/** Platform Home (v5 §B.5 #4): one line, the full list is on the learning path. */
function skillsTeaser(m: HomeModel): HTMLElement {
  return h('a', { href: hashOf('learn'), class: cx(CARD_ACTION, 'group flex items-center gap-3 p-4 text-ink no-underline') },
    h('span', { class: 'grid size-9 shrink-0 place-items-center rounded-full bg-code', 'aria-hidden': 'true' }, icon('route')),
    h('span', { class: 'min-w-0 flex-1 font-semibold' }, t('home.skillsTeaser', { n: m.learned, total: m.skills.length })),
    icon('arrowRight', 'size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent'));
}

/** "Coming soon" page of a domain (v5 §B.6): what it is, which skills carry over, two ways out. No form, no date. */
function soonSection(): HTMLElement {
  const lang = getLang();
  const learned = learnedSkills(app.tickets, done());
  const have = SKILLS.filter((s) => learned.has(s.id));
  return h('section', { class: 'space-y-5' },
    soonDomain().id === 'finance' ? illustration('aspect-[480/200] max-w-md', (il) => il.financeSoon()) : null, // Plan 8b (v6 §5.1)
    bubble(mascot('boon', 'idle', 'size-20'), t(soonDomain().desc)),
    h('h2', { class: GROUP_TITLE }, t('soon.skills')),
    have.length ? h('p', { class: 'm-0' }, have.map((s) => s.label[lang]).join(' · ')) : h('p', { class: 'm-0 text-muted' }, t('soon.none')),
    h('div', { class: 'flex flex-wrap gap-3' },
      h('a', { href: hashOf('practice'), class: cx(BTN_GO, 'px-4 py-2 no-underline') }, t('soon.practice')),
      h('a', { href: hashOf('overview'), class: OUTLINE_LINK }, t('soon.back'))));
}

registerHomeSection({ id: 'teach', order: 5, span: 'full', pages: ['learn'], render: teachSection });
registerHomeSection({ id: 'hello', order: 1, span: 'full', pages: ['home'], render: helloSection });
registerHomeSection({ id: 'harbor', order: 5, span: 'full', pages: ['overview'], render: harborSection });
registerHomeSection({ id: 'continue', order: 10, span: 'wide', pages: ['overview'], render: continueCard });
registerHomeSection({ id: 'resume', order: 10, span: 'full', pages: ['home'], render: resumeLine });
registerHomeSection({ id: 'soon', order: 10, span: 'full', pages: ['soon'], render: soonSection });
registerHomeSection({ id: 'career', order: 20, span: 'narrow', pages: ['overview'], render: careerCard });
registerHomeSection({ id: 'routes', order: 25, span: 'full', pages: ['map'], render: routesSection });
registerHomeSection({ id: 'domains', order: 28, span: 'full', pages: ['home'], render: domainsSection });
registerHomeSection({ id: 'chapters', order: 30, span: 'full', pages: ['overview'], render: chaptersSection });
registerHomeSection({ id: 'kpi', order: 35, span: 'full', pages: ['overview'], render: kpiSection });
registerHomeSection({ id: 'skills', order: 40, span: 'full', pages: ['practice'], render: skillsSection });
registerHomeSection({ id: 'skillsTeaser', order: 45, span: 'full', pages: ['home'], render: skillsTeaser });
registerHomeSection({ id: 'modes', order: 50, span: 'full', pages: ['overview'], render: modesSection });

const PAGE_TITLE: Record<Exclude<Page, 'soon'>, Key> = {
  home: 'nav.home', learn: 'nav.learn', practice: 'nav.practice', overview: 'nav.overview', map: 'nav.map',
};
const pageOf = (r: string): Page => (r === 'learn' || r === 'practice' || r === 'overview' || r === 'map' || r === 'soon' ? r : 'home');

/** Redrawn by rerender() (language switch, progress). Pure DOM from homeModel(); keeps no state of its own. */
export function renderHome(host: HTMLElement): void {
  const page = pageOf(currentRoute());
  // General pages (Home, learning path, Practise SQL) follow Logistics; domain pages the open domain (Plan 9 D9-12).
  const general = page === 'home' || page === 'learn' || page === 'practice';
  const m = general || activeDomain() === 'logistics'
    ? homeModel(general ? loadTickets('logistics') : app.tickets, done(), CHAPTERS, SKILLS, homeHooks.levelOf)
    : homeModel(app.tickets, done(), chaptersOf(), domainSkills(app.tickets), homeHooks.levelOf);
  const grid = page === 'overview'; // the harbour page keeps its 3-column grid; the others are one 880 px column (v6 §3.3)
  host.replaceChildren(
    h('h1', {
      id: 'home-title', tabindex: '-1',
      class: page === 'home' || page === 'overview' ? 'sr-only' : 'mx-auto mt-6 mb-0 max-w-[880px] px-4 text-2xl font-extrabold',
    }, page === 'soon' ? t('soon.title', { name: t(soonDomain().name) }) : t(PAGE_TITLE[page])),
    h('div', { class: grid ? 'mx-auto grid max-w-[1120px] gap-5 px-4 py-6 lg:grid-cols-3' : 'mx-auto grid max-w-[880px] gap-8 px-4 py-6' },
      ...nodes(...sections.filter((s) => s.pages.includes(page)).map((s) => {
        const el = s.render(m);
        return el && h('div', { class: cx('min-w-0', grid && SPAN[s.span]) }, el);
      }))));
}
