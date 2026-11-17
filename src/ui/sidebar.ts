import { loadTickets } from '../content';
import { activeDomain, DOMAINS } from '../domains';
import { homeModel, type ChapterStatus } from '../home';
import { getLang, t, type Key } from '../i18n';
import { CHAPTERS, chaptersOf, chapterTitle, currentChapter, rankOf, SKILLS, visibleTickets } from '../progress';
import { gated, navLock, readTour } from '../onboarding';
import { domainHash, hashOf, inDomain, learnModuleOf, learnSkillOf, type Route } from '../route';
import { isStory, reviewCount } from '../session';
import { actions, app, done } from '../state';
import { readJson, writeJson } from '../storage';
import { cx } from '../theme';
import { textOf } from '../tickets';
import { byId, h, nodes } from './dom';
import { icon } from './icons';
import { domainLine, navItems } from './topbar';

/** Device pref (v6 §3.2): the sidebar on wide reading pages. Never in the Save. */
export const SIDE_KEY = 'cargo-query/sidebar';
export type SidePref = 'open' | 'rail';
/** Anything but 'rail' (missing, junk, unreadable storage) is the default: open. */
export const parseSidePref = (v: unknown): SidePref => (v === 'rail' ? 'rail' : 'open');

/** The current page: a 4 px --accent bar + --accent-soft background, not colour alone (v6 §3.1). */
const SIDE_LINK = 'flex w-full items-center gap-3 rounded-(--r-ctl) border-0 border-l-4 border-transparent bg-transparent px-3 py-2 text-left font-bold text-ink no-underline hover:bg-code aria-[current=page]:border-accent aria-[current=page]:bg-accent-soft aria-disabled:text-muted';
const GROUP = 'side-group mt-4 mb-1 px-3 text-xs font-bold tracking-wider text-muted uppercase';
const STATUS: Record<ChapterStatus, Key> = { done: 'home.status.done', current: 'home.status.current', locked: 'home.status.locked', soon: 'home.status.soon' };
const WIDE = '(min-width: 1024px)';
const XL = '(min-width: 1280px)';
const mq = (q: string): boolean => typeof matchMedia === 'function' && matchMedia(q).matches;

/** The rail's overlay (v6 §3.2: opens over the page, never resizes the splitter frame). In memory only; a new page closes it. */
let overlay = false;
let lastRoute: Route = 'home';
let extra: HTMLElement | undefined;

/**
 * Where the Data page puts its table list (V11): the sidebar from 1024 px, else undefined (the page keeps it). One node for the
 * page's lifetime, so a redraw moves it instead of rebuilding it (the search box keeps focus and IME state).
 */
export function sideExtra(): HTMLElement | undefined {
  return mq(WIDE) ? (extra ??= h('div', { class: 'side-extra mt-2 px-1' })) : undefined;
}

interface Row { key: string; href: string; lead: Node; label: string; sub?: string; current: boolean; lock?: string; onclick?: () => void }

/** One sidebar line. `lock` (v4 D-O3): shown, with a lock and the reason, never followed. */
function row(r: Row): HTMLElement {
  const click = r.onclick;
  return h('a', {
    href: r.href, 'data-side': r.key, class: SIDE_LINK, title: r.lock ?? r.label,
    'aria-current': r.current ? 'page' : false,
    'aria-disabled': r.lock ? 'true' : false,
    onclick: r.lock ? (e: Event) => e.preventDefault() : click ? (e: Event) => { e.preventDefault(); click(); } : false,
  },
    h('span', { class: 'grid size-6 shrink-0 place-items-center', 'aria-hidden': 'true' }, r.lead),
    h('span', { class: 'side-label min-w-0 flex-1' },
      h('span', { class: 'block truncate' }, r.label),
      r.sub || r.lock ? h('span', { class: 'block truncate text-xs font-semibold text-muted' }, r.lock ?? r.sub) : null),
    r.lock ? icon('lock', 'side-label size-3.5 text-muted') : null);
}

/** Learning path (v6 §3.3): the 12 SQL modules, one per chapter, with their state. */
function modules(): HTMLElement[] {
  const lang = getLang();
  const m = homeModel(loadTickets('logistics'), done(), CHAPTERS, SKILLS); // General: the learning path follows Logistics (Plan 9)
  const open = learnModuleOf(location.hash) ?? SKILLS.find((s) => s.id === learnSkillOf(location.hash))?.chapter ?? m.chapter;
  return m.chapters.map((c) => row({
    key: `m${c.chapter}`,
    href: `${hashOf('learn')}/sql/${c.chapter}`,
    lead: c.status === 'done' ? icon('check', 'size-5 text-good') : c.status === 'current' ? h('b', {}, String(c.chapter)) : icon('lock', 'size-4 text-muted'),
    label: `${c.chapter} · ${chapterTitle(c.chapter, lang, CHAPTERS)}`,
    sub: t(STATUS[c.status], { done: c.done, total: c.total }),
    current: c.chapter === open,
  }));
}

/** Domain header: name, chapter and rank (v6 §3.1: they moved off the top bar's left). */
function domainHead(): HTMLElement {
  const lang = getLang();
  const live = DOMAINS.find((d) => d.id === activeDomain())!;
  const ch = currentChapter(app.tickets, done());
  return h('div', { class: 'flex items-center gap-3 px-3 py-2' },
    h('span', { class: 'grid size-6 shrink-0 place-items-center', 'aria-hidden': 'true' }, icon(live.icon)),
    h('span', { class: 'side-label min-w-0' },
      h('b', { class: 'block' }, t(live.name)),
      h('span', { class: 'block truncate text-xs font-semibold text-muted' },
        `${t('top.chapterShort', { n: ch, total: chaptersOf().length })} · ${rankOf(app.tickets, done()).tier?.[lang] ?? t('career.intern')}`)));
}

/** Workspace (v6 §3.3): the open chapter's tasks, a second way beside the task bar; hidden in the rail. */
function tasks(): HTMLElement | null {
  const tk = app.tickets.find((x) => x.id === app.selectedId);
  if (!tk) return null;
  const lang = getLang();
  const d = done();
  const reached = new Set(visibleTickets(app.tickets, d).map((x) => x.id));
  const own = app.tickets.filter((x) => x.chapter === tk.chapter);
  return h('div', { class: 'side-extra' },
    h('p', { class: GROUP }, t('nav.chapterOption', { n: tk.chapter, title: chapterTitle(tk.chapter, lang) })),
    ...own.map((x, i) => row({
      key: `t:${x.id}`,
      href: hashOf('play'),
      lead: d.has(x.id) ? icon('check', 'size-4 text-good') : h('b', { class: 'text-sm' }, String(i + 1)),
      label: reached.has(x.id) ? textOf(x, lang).title : t('nav.taskLocked'),
      current: isStory() && x.id === app.selectedId,
      lock: reached.has(x.id) ? undefined : t('side.lockedTask'),
      onclick: () => actions.selectTicket(x.id),
    })));
}

/** Drawer only (v6 §3.2: the domain switch heads the drawer). */
function domainSwitch(): HTMLElement {
  return h('div', {},
    h('p', { class: GROUP }, t('home.domains')),
    ...DOMAINS.map((d) => row({
      key: `d:${d.id}`, href: domainHash(d.id), lead: icon(d.icon), label: t(d.name),
      sub: domainLine(d.id), current: d.id === activeDomain(),
    })));
}

function content(route: Route, drawer: boolean): (Node | string)[] {
  const out: (Node | null | undefined)[] = [drawer ? domainSwitch() : null];
  if (route === 'learn') {
    out.push(h('p', { class: GROUP }, t('side.sqlTrack')), ...modules());
  } else if (route === 'practice') {
    const lang = getLang();
    out.push(row({ key: 'today', href: hashOf('practice'), lead: icon('repeat'), label: t('side.today', { n: reviewCount() }), current: true }),
      h('p', { class: GROUP }, t('side.byModule')),
      ...CHAPTERS.filter((c) => SKILLS.some((s) => s.chapter === c.chapter)).map((c) => row({
        key: `p${c.chapter}`, href: hashOf('practice'), lead: h('b', {}, String(c.chapter)), label: chapterTitle(c.chapter, lang, CHAPTERS), current: false,
        onclick: () => document.getElementById(`skills-ch-${c.chapter}`)?.scrollIntoView({ block: 'start' }),
      })));
  } else if (inDomain(route)) {
    const order = app.tickets.map((x) => x.id);
    const isGated = gated(readTour());
    out.push(domainHead(), ...navItems('domain').map((n) => {
      const lock = navLock(n.id, done(), order, isGated);
      return row({ key: n.id, href: n.href, lead: icon(n.icon), label: t(n.label), current: n.current(route), onclick: n.onclick, lock: lock && t(lock) });
    }));
    if (route === 'play') out.push(tasks());
    if (route === 'data') out.push(sideExtra());
  }
  return nodes(...out);
}

/** Bottom button: collapse/expand on wide reading pages (saved), else the rail's overlay (not saved, v6 §3.2). */
function toggle(route: Route): HTMLElement {
  const forcedRail = route === 'play' || !mq(XL);
  const expanded = forcedRail ? overlay : parseSidePref(readJson<unknown>(SIDE_KEY)) === 'open';
  const label = t(expanded ? 'side.collapse' : 'side.expand');
  return h('button', {
    type: 'button', 'data-side': 'toggle', class: cx(SIDE_LINK, 'mt-auto'), 'aria-expanded': String(expanded), title: label,
    onclick: () => {
      if (forcedRail) overlay = !overlay;
      else writeJson(SIDE_KEY, expanded ? 'rail' : 'open');
      renderSidebar(route);
    },
  }, h('span', { class: 'grid size-6 shrink-0 place-items-center', 'aria-hidden': 'true' }, icon('panelLeft')), h('span', { class: 'side-label' }, label));
}

/** Redrawn by rerender() and on every route change (cheap; focus inside is put back by data-side). */
export function renderSidebar(route: Route): void {
  if (route !== lastRoute) overlay = false;
  lastRoute = route;
  document.body.dataset.route = route; // CSS: no sidebar on Home, rail on the workspace
  document.body.dataset.side = parseSidePref(readJson<unknown>(SIDE_KEY));
  const drawer = byId('side-drawer') as HTMLDialogElement;
  const side = byId('side');
  const host = drawer.open ? drawer : side;
  const focused = host.contains(document.activeElement) ? document.activeElement?.getAttribute('data-side') : null;
  if (drawer.open) {
    drawer.replaceChildren(h('div', { class: 'flex min-h-full flex-col gap-1 p-3' },
      h('div', { class: 'mb-2 flex items-center justify-between' },
        h('h2', { id: 'side-drawer-title', class: 'm-0 text-lg' }, t('side.title')),
        h('form', { method: 'dialog' }, h('button', { class: 'grid size-11 place-items-center p-0', 'aria-label': t('app.close') }, icon('x')))),
      ...content(route, true)));
  } else {
    side.toggleAttribute('data-overlay', overlay);
    side.replaceChildren(h('div', { class: 'side-panel' }, ...content(route, false), toggle(route)));
  }
  if (focused) host.querySelector<HTMLElement>(`[data-side="${CSS.escape(focused)}"]`)?.focus();
}

/** Once at startup: ☰ and the drawer (a modal <dialog>: focus trap, Esc, focus back to ☰), media changes, Esc for the overlay. */
export function initSidebar(): void {
  const btn = byId('side-btn');
  const drawer = byId('side-drawer') as HTMLDialogElement;
  btn.addEventListener('click', () => {
    drawer.showModal(); // open first: renderSidebar() fills whichever host is open
    renderSidebar(lastRoute);
    btn.setAttribute('aria-expanded', 'true');
    drawer.querySelector<HTMLElement>('a:not([aria-disabled]), button')?.focus();
  });
  drawer.addEventListener('close', () => {
    btn.setAttribute('aria-expanded', 'false');
    renderSidebar(lastRoute);
  });
  // The backdrop (the dialog box itself has no padding) and any followed link close it.
  drawer.addEventListener('click', (e) => {
    const el = e.target as Element;
    if (el === drawer || el.closest('a[href]:not([aria-disabled])')) drawer.close();
  });
  matchMedia(WIDE).addEventListener('change', () => {
    if (drawer.open) drawer.close();
    actions.rerender(); // the Data page's list moves between page and sidebar (V11)
  });
  matchMedia(XL).addEventListener('change', () => renderSidebar(lastRoute));
  // Registered before the tour's Esc (Task 7): an open overlay takes Esc first.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !overlay || e.defaultPrevented) return;
    e.preventDefault();
    overlay = false;
    renderSidebar(lastRoute);
    byId('side').querySelector<HTMLElement>('[data-side="toggle"]')?.focus();
  });
  // A click on the scrim (#side's ::after, so the target is #side itself) or anywhere outside the panel closes the overlay (v10 UX #12).
  document.addEventListener('pointerdown', (e) => {
    const side = byId('side');
    if (!overlay || (e.target instanceof Node && side.contains(e.target) && e.target !== side)) return;
    overlay = false;
    renderSidebar(lastRoute);
  });
}
