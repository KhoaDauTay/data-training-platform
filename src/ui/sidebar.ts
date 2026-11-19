import { loadTickets } from '../content';
import { activeDomain, DOMAINS } from '../domains';
import { knownSkills } from '../home';
import { getLang, t, type Key } from '../i18n';
import { earlyOffer } from './chapterView';
import { CHAPTERS, chaptersOf, chapterTitle, currentChapter, moduleTitle, rankOf, SKILLS, visibleTickets } from '../progress';
import { gated, navLock, readTour, sqlOnly } from '../onboarding';
import { domainHash, hashOf, inDomain, learnModuleOf, learnSkillOf, type Route } from '../route';
import { generalWork, isStory, reviewCount } from '../session';
import { actions, app, done } from '../state';
import { readJson, writeJson } from '../storage';
import { cx } from '../theme';
import { textOf } from '../tickets';
import { byId, h, nodes } from './dom';
import { icon, NAV_ICON } from './icons';
import { domainLine, navItems } from './topbar';

/** Device pref (v6 §3.2): the sidebar on wide reading pages. Never in the Save. */
export const SIDE_KEY = 'cargo-query/sidebar';
export type SidePref = 'open' | 'rail';
/** v12 (L85): the rail is the default; only a saved 'open' keeps the wide sidebar (names show on hover in the rail). */
export const parseSidePref = (v: unknown): SidePref => (v === 'open' ? 'open' : 'rail');

/** The current page: a 4 px --accent bar + --accent-soft background, not colour alone (v6 §3.1). */
const SIDE_LINK = 'flex max-lg:min-h-11 w-full items-center gap-3 rounded-(--r-ctl) border-0 border-l-4 border-transparent bg-transparent px-3 py-2 text-left font-bold text-ink no-underline hover:bg-code aria-[current=page]:border-accent aria-[current=page]:bg-accent-soft aria-disabled:text-muted';
const GROUP = 'side-group mt-4 mb-1 px-3 text-caption font-bold tracking-wider text-muted uppercase';
const WIDE = '(min-width: 1024px)';
const XL = '(min-width: 1280px)';
const mq = (q: string): boolean => typeof matchMedia === 'function' && matchMedia(q).matches;

/** The rail expanded in place (user 2026-11-20: it pushes the page right, no scrim; was v6 §3.2's overlay). In memory only; a new page closes it. */
let overlay = false;
let lastRoute: Route = 'home';
let extra: HTMLElement | undefined;
/** v12.0 U7: the current row the sidebar last scrolled to; a redraw scrolls only when the current page changed. */
let scrolledTo = '';

/** The sidebar shows labels and lists: ≥ 1280 px with the 'open' pref, never on the workspace (v12.0 U6; rail is the default, L85). */
const sideWide = (): boolean => mq(XL) && parseSidePref(readJson<unknown>(SIDE_KEY)) === 'open' && lastRoute !== 'play';

/**
 * Where the Data page puts its table list (V11): the sidebar when it is wide, else undefined (the page shows a <select>,
 * U6). One node for the page's lifetime, so a redraw moves it instead of rebuilding it (search keeps focus and IME state).
 */
export function sideExtra(): HTMLElement | undefined {
  return sideWide() ? (extra ??= h('div', { class: 'side-extra mt-2 px-1' })) : undefined;
}

export interface Row { key: string; href: string; lead: Node; label: string; sub?: string; current: boolean; lock?: string; onclick?: () => void }

/** One sidebar line. `lock` (v4 D-O3): shown, with a lock and the reason, never followed. */
function row(r: Row): HTMLElement {
  const click = r.onclick;
  return h('a', {
    href: r.href, 'data-side': r.key, class: SIDE_LINK, 'data-tip': [r.label, r.lock ?? r.sub].filter(Boolean).join(' · '),
    'aria-current': r.current ? 'page' : false,
    'aria-disabled': r.lock ? 'true' : false,
    onclick: r.lock ? (e: Event) => e.preventDefault() : click ? (e: Event) => { e.preventDefault(); click(); } : false,
  },
    // v12 audit: in the rail the label and the trailing lock are hidden, so a locked row also gets a lock badge on its icon.
    h('span', { class: cx('relative grid size-6 shrink-0 place-items-center', r.lock && 'text-muted'), 'aria-hidden': 'true' }, r.lead,
      r.lock ? h('span', { class: 'absolute -right-1.5 -bottom-1 grid size-3.5 place-items-center rounded-full bg-panel ring-1 ring-line' }, icon('lock', 'size-2.5')) : null),
    h('span', { class: 'side-label min-w-0 flex-1' },
      h('span', { class: 'block line-clamp-2' }, r.label), // v12.0 U7: wraps to two lines; the rail's tip shows the full name
      r.sub || r.lock ? h('span', { class: 'block truncate text-caption font-semibold text-muted' }, r.lock ?? r.sub) : null),
    r.lock ? icon('lock', 'side-label size-3.5 text-muted') : null);
}

/**
 * Learning path (v6 §3.3): the SQL modules. v12 (L82): General is never gated by a domain's chapters: every module is open; the
 * mark says how many of its skills are learned (all: ✓, some: the number in bold, none: the number).
 */
function modules(): HTMLElement[] {
  const lang = getLang();
  const known = knownSkills(app.save, loadTickets('logistics'), SKILLS.map((s) => s.id));
  const first = CHAPTERS.find((c) => SKILLS.some((s) => s.chapter === c.chapter && !known.has(s.id)))?.chapter ?? 1;
  const open = learnModuleOf(location.hash) ?? SKILLS.find((s) => s.id === learnSkillOf(location.hash))?.chapter ?? first;
  return CHAPTERS.filter((c) => SKILLS.some((s) => s.chapter === c.chapter)).map((c) => {
    const ids = SKILLS.filter((s) => s.chapter === c.chapter).map((s) => s.id);
    const k = ids.filter((id) => known.has(id)).length;
    return row({
      key: `m${c.chapter}`,
      href: `${hashOf('learn')}/sql/${c.chapter}`,
      lead: k === ids.length ? icon('check', 'size-5 text-good') : h('b', { class: k ? '' : 'text-muted' }, String(c.chapter)),
      label: `${c.chapter} · ${moduleTitle(c.chapter, lang)}`,
      sub: t('side.moduleSkills', { k, m: ids.length }),
      current: c.chapter === open,
    });
  });
}

/** Domain header: name, chapter and rank (v6 §3.1: they moved off the top bar's left). */
function domainHead(): HTMLElement {
  const lang = getLang();
  const live = DOMAINS.find((d) => d.id === activeDomain())!;
  const ch = currentChapter(app.tickets, done());
  const line = `${t('top.chapterShort', { n: ch, total: chaptersOf().length })} · ${rankOf(app.tickets, done()).tier?.[lang] ?? t('career.intern')}`;
  return h('div', { class: 'flex items-center gap-3 px-3 py-2' },
    h('span', { class: 'grid size-6 shrink-0 place-items-center', 'aria-hidden': 'true' }, icon(live.icon)),
    h('span', { class: 'side-label min-w-0' },
      h('b', { class: 'block' }, t(live.name)),
      h('span', { class: 'block truncate text-caption font-semibold text-muted', title: line }, line)));
}

/** Workspace (v6 §3.3): the open chapter's tasks, a second way beside the task bar; hidden in the rail. */
function tasks(): HTMLElement | null {
  const tk = app.tickets.find((x) => x.id === app.selectedId);
  if (!tk) return null;
  const lang = getLang();
  const d = done();
  const reached = new Set(visibleTickets(app.tickets, d).map((x) => x.id));
  const early = earlyOffer(); // L145: the review offered early opens like the task bar's button
  if (early) reached.add(early.id);
  const own = app.tickets.filter((x) => x.chapter === tk.chapter);
  return h('div', { class: 'side-extra' },
    h('p', { class: GROUP }, t('nav.chapterOption', { n: tk.chapter, title: chapterTitle(tk.chapter, lang) })),
    ...own.map((x, i) => row({
      key: `t:${x.id}`,
      href: hashOf('play'),
      lead: d.has(x.id) ? icon('check', 'size-4 text-good') : h('b', { class: 'text-body-sm' }, String(i + 1)),
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
      sub: domainLine(d.id), current: !sqlOnly() && d.id === activeDomain(),
    })));
}

/** ENG-CORE (L220): a reading page outside the domains fills its own sidebar rows (the Database Engine area: levels, modules). */
export type SideFill = (ui: { row: (r: Row) => HTMLElement; group: (text: string) => HTMLElement }) => (Node | null)[];
const pageSide: Partial<Record<Route, SideFill>> = {};
export const registerSide = (route: Route, fill: SideFill): void => void (pageSide[route] = fill);

function content(route: Route, drawer: boolean): (Node | string)[] {
  const out: (Node | null | undefined)[] = [drawer ? domainSwitch() : null];
  if (route === 'learn' || (route === 'play' && generalWork())) { // v15 Q1: the General workspace shows the SQL track, never a domain's pages
    out.push(h('p', { class: GROUP }, t('side.sqlTrack')), ...modules());
  } else if (route === 'practice') {
    const lang = getLang();
    out.push(row({ key: 'today', href: hashOf('practice'), lead: icon(NAV_ICON.practice), label: t('side.today', { n: reviewCount() }), current: true }),
      h('p', { class: GROUP }, t('side.byModule')),
      ...CHAPTERS.filter((c) => SKILLS.some((s) => s.chapter === c.chapter)).map((c) => row({
        key: `p${c.chapter}`, href: hashOf('practice'), lead: h('b', {}, String(c.chapter)), label: moduleTitle(c.chapter, lang), current: false,
        onclick: () => document.getElementById(`skills-ch-${c.chapter}`)?.scrollIntoView({ block: 'start' }),
      })));
  } else if (pageSide[route]) {
    out.push(...pageSide[route]({ row, group: (text) => h('p', { class: GROUP }, text) }));
  } else if (inDomain(route)) {
    const order = app.tickets.map((x) => x.id);
    const isGated = gated(readTour());
    // The drawer's domain switch already shows this domain (current, chapter · rank): a rule, not a second "Logistics" (L93).
    out.push(drawer ? h('hr', { class: 'my-2 border-0 border-t border-line' }) : domainHead(),
      ...navItems('domain').map((n) => {
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
    type: 'button', 'data-side': 'toggle', class: cx(SIDE_LINK, 'mb-2'), 'aria-expanded': String(expanded), 'data-tip': label,
    onclick: () => {
      if (forcedRail) overlay = !overlay;
      else writeJson(SIDE_KEY, expanded ? 'rail' : 'open');
      if (route === 'data') actions.rerender(); else renderSidebar(route); // the Data list moves between page and sidebar (U6)
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
        h('h2', { id: 'side-drawer-title', class: 'm-0 text-title' }, t('side.title')),
        h('form', { method: 'dialog' }, h('button', { class: 'grid size-11 place-items-center p-0', 'aria-label': t('app.close') }, icon('x')))),
      ...content(route, true)));
  } else {
    side.toggleAttribute('data-overlay', overlay);
    side.replaceChildren(h('div', { class: 'side-panel' }, toggle(route), ...content(route, false))); // v12 (L85): expand/collapse at the top left
  }
  if (focused) host.querySelector<HTMLElement>(`[data-side="${CSS.escape(focused)}"]`)?.focus();
  const cur = host.querySelector<HTMLElement>('[aria-current="page"][data-side]');
  const key = `${route}:${cur?.dataset.side ?? ''}`;
  if (cur && key !== scrolledTo) {
    scrolledTo = key;
    cur.scrollIntoView({ block: 'nearest' }); // once per page: a long module list keeps the open module in view
  }
}

/**
 * v12 (L85): in the 64 px rail the names are hidden; hovering or focusing an item shows its name (and lock reason) in a tip
 * beside it. A fixed element on <body>, because the rail's panel scrolls and would clip anything positioned inside it.
 */
function initRailTips(): void {
  const tip = h('div', { id: 'side-tip', role: 'tooltip', hidden: true,
    class: 'pointer-events-none fixed z-50 max-w-64 rounded-(--r-ctl) bg-panel px-3 py-1.5 text-body-sm font-bold text-ink shadow-(--shadow-2) ring-1 ring-line' });
  document.body.append(tip);
  const side = byId('side');
  const show = (e: Event): void => {
    const el = (e.target as Element | null)?.closest<HTMLElement>('[data-tip]');
    const panel = side.querySelector<HTMLElement>('.side-panel');
    if (!el || !panel || panel.clientWidth > 120 || side.hasAttribute('data-overlay')) return; // labels are visible: no tip
    const r = el.getBoundingClientRect();
    tip.textContent = el.dataset.tip ?? '';
    tip.hidden = false;
    tip.style.left = `${r.right + 8}px`;
    tip.style.top = `${r.top + r.height / 2 - tip.offsetHeight / 2}px`;
  };
  const hide = (): void => { tip.hidden = true; };
  // L93: after a click or a navigation the tip stays away until the pointer really moves. The redraw puts a new item under a
  // resting pointer, and the browser's own pointerover for it would bring the tip straight back.
  let quiet: { x: number; y: number } | undefined;
  let at = { x: -1, y: -1 }; // last pointer position over the sidebar
  const silence = (): void => {
    hide();
    quiet = at;
  };
  side.addEventListener('pointerover', (e) => { if (!quiet) show(e); });
  side.addEventListener('pointermove', (e) => {
    at = { x: e.clientX, y: e.clientY };
    if (!quiet || (Math.abs(at.x - quiet.x) < 3 && Math.abs(at.y - quiet.y) < 3)) return;
    quiet = undefined;
    show(e);
  });
  // Keyboard focus only: a clicked link keeps focus, and the redraw after navigation gives it back.
  side.addEventListener('focusin', (e) => { if ((e.target as Element).matches(':focus-visible')) show(e); });
  side.addEventListener('pointerleave', () => { hide(); quiet = undefined; });
  side.addEventListener('focusout', hide);
  side.addEventListener('scroll', hide, true);
  side.addEventListener('click', silence);
  window.addEventListener('hashchange', () => silence());
}

/** Once at startup: ☰ and the drawer (a modal <dialog>: focus trap, Esc, focus back to ☰), media changes, Esc for the overlay. */
export function initSidebar(): void {
  initRailTips();
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
  // Any followed link closes it; the backdrop is initLightDismiss() (L140).
  drawer.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a[href]:not([aria-disabled])')) drawer.close();
  });
  matchMedia(WIDE).addEventListener('change', () => {
    if (drawer.open) drawer.close();
    actions.rerender(); // the Data page's list moves between page and sidebar (V11)
  });
  matchMedia(XL).addEventListener('change', () => (lastRoute === 'data' ? actions.rerender() : renderSidebar(lastRoute)));
  // Registered before the tour's Esc (Task 7): an open overlay takes Esc first.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !overlay || e.defaultPrevented) return;
    e.preventDefault();
    overlay = false;
    renderSidebar(lastRoute);
    byId('side').querySelector<HTMLElement>('[data-side="toggle"]')?.focus();
  });
}
