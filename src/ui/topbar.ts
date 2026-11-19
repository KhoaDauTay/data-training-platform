import { loadTickets } from '../content';
import { activeDomain, DOMAIN_ID, DOMAINS, type DomainId } from '../domains';
import { getLang, t, type Key } from '../i18n';
import { chapterTitle, CHAPTERS, chaptersOf, currentChapter, rankOf } from '../progress';
import { upsert } from '../registry';
import { domainHash, hashOf, inDomain, type Route } from '../route';
import { actions, app, done } from '../state';
import { getTheme, NAV_LINK, setTheme, THEME_PREFS, TOP_BTN, type ThemePref } from '../theme';
import { byId, h, loader, nodes, reducedMotion } from './dom';
import { downloading } from '../db/loadProgress';
import { celebrate, gainSince } from './celebrate';
import { fillIcons, icon, NAV_ICON, type IconName } from './icons';
import { currentRoute } from './router';
import { generalWork } from '../session';
import { sqlOnly } from '../onboarding';

const mb = (bytes: number): number => Math.round(bytes / 1e5) / 10;

/**
 * One navigation entry (v5 §B.2, v6 §3): `area` 'top' = level 1 (top bar, mobile bottom bar), 'domain' = the domain's pages
 * (sidebar, drawer). `icon` shows in the rail and the bottom bar.
 */
export interface NavItem {
  id: string;
  order: number;
  area: 'top' | 'domain';
  label: Key;
  icon: IconName;
  href: string;
  current(route: Route): boolean;
  /** Optional action instead of plain hash navigation (e.g. enter a mode, then go('play')). */
  onclick?: () => void;
}
const NAV: NavItem[] = [];
/** Same id replaces the old entry; kept sorted by order. */
export const registerNav = (item: NavItem): void => upsert(NAV, item);
export const navItems = (area: NavItem['area']): NavItem[] => NAV.filter((n) => n.area === area);
registerNav({ id: 'home', area: 'top', order: 10, label: 'nav.home', icon: NAV_ICON.home, href: hashOf('home'), current: (r) => r === 'home' });
registerNav({ id: 'learn', area: 'top', order: 20, label: 'nav.learn', icon: NAV_ICON.learn, href: hashOf('learn'), current: (r) => r === 'learn' });
// Practice (top, order 30), Sandbox (domain, 30, ui/modes.ts) and Data (domain, 50, ui/dataView.ts) register their own.
registerNav({ id: 'overview', area: 'domain', order: 10, label: 'nav.overview', icon: NAV_ICON.overview, get href() { return hashOf('overview'); }, current: (r) => r === 'overview' });
registerNav({ id: 'play', area: 'domain', order: 20, label: 'nav.play', icon: NAV_ICON.play, get href() { return hashOf('play'); }, current: (r) => r === 'play' });
registerNav({ id: 'dashboard', area: 'domain', order: 60, label: 'nav.dashboard', icon: NAV_ICON.dashboard, get href() { return hashOf('dashboard'); }, current: (r) => r === 'dashboard' });
registerNav({ id: 'map', area: 'domain', order: 70, label: 'nav.map', icon: NAV_ICON.map, get href() { return hashOf('map'); }, current: (r) => r === 'map' });

/** Mobile bottom bar (v6 §3.2): 56 px targets; the current one is --accent on --panel (5.5:1) and keeps its label. */
const BOTTOM_LINK = 'flex min-h-14 flex-col items-center justify-center gap-0.5 text-caption font-bold text-muted no-underline aria-[current=page]:text-accent';
const MENU_ITEM = 'flex w-full items-center gap-2 rounded-(--r-ctl) px-3 py-2 text-ink no-underline hover:bg-code';

/**
 * A domain's progress line on the platform Home, the domain menu and the drawer (Plan 9): Logistics = chapter · rank,
 * the other domains = tasks done (counted from the Save by id pattern, DOMAIN_ID, so their content chunks are not needed).
 */
export function domainLine(id: DomainId): string {
  if (id !== 'logistics') return t('domain.homeLine', { n: app.save.completed.filter((x) => DOMAIN_ID[id].test(x)).length });
  const tickets = loadTickets('logistics');
  const rank = rankOf(tickets, done(), CHAPTERS).tier?.[getLang()] ?? t('career.intern');
  return `${t('top.chapterShort', { n: currentChapter(tickets, done()), total: CHAPTERS.length })} · ${rank}`;
}

/** v15: nothing in the top bar names a domain for a "SQL only" player (§5) or in the General workspace (#/learn/play, Q1). */
export const noDomain = (): boolean => sqlOnly() || (currentRoute() === 'play' && generalWork());

/** A nav link (top bar, bottom bar, sidebar); an item with `onclick` does its own navigation. */
export function navLink(n: NavItem, route: Route, cls: string, ...body: (Node | string)[]): HTMLAnchorElement {
  const click = n.onclick;
  return h('a', {
    href: n.href, class: cls, 'data-nav': n.id,
    'aria-current': n.current(route) ? 'page' : false,
    onclick: click ? (e: Event) => { e.preventDefault(); click(); } : false,
  }, ...body);
}

function renderNav(): void {
  const route = currentRoute();
  const top = navItems('top');
  const live = DOMAINS.find((d) => d.id === activeDomain())!;
  const none = noDomain(); // v15: the item names no domain
  byId('nav').replaceChildren(...top.map((n) => navLink(n, route, NAV_LINK, t(n.label))));
  byId('bottom-nav').replaceChildren(
    ...top.map((n) => navLink(n, route, BOTTOM_LINK, icon(n.icon, 'size-5'), h('span', {}, t(n.label)))),
    h('a', { href: hashOf('overview'), class: BOTTOM_LINK, 'aria-current': inDomain(route) && !(route === 'play' && generalWork()) ? 'page' : false },
      icon(none ? 'database' : live.icon, 'size-5'), h('span', {}, t(none ? 'home.domains' : live.name))));
}

/** Domain switch (v5 §B.2): every domain with its progress line (Logistics: chapter · rank; the others: tasks done). */
function renderDomainMenu(): void {
  const menu = byId('domain-menu');
  const shown = DOMAINS.find((d) => d.id === activeDomain())!;
  const none = noDomain(); // v15: the chip names no domain, the menu still lists all
  byId('domain-label').textContent = t(none ? 'home.domains' : shown.name);
  byId('domain-icon').replaceChildren(icon(none ? 'database' : shown.icon, 'size-4')); // U2: the chip shows the open domain's icon, not a fixed anchor
  menu.replaceChildren(h('div', { class: 'flex flex-col' }, ...DOMAINS.map((d) => h('a', {
    href: domainHash(d.id), class: MENU_ITEM, onclick: () => menu.hidePopover?.(), 'aria-current': !none && d.id === activeDomain() ? 'true' : false,
  },
    icon(d.icon, 'size-4'),
    h('span', { class: 'flex-1 font-bold' }, t(d.name)),
    h('span', { class: 'text-body-sm text-muted' }, domainLine(d.id))))));
}

/** Ready = a green dot (text for screen readers and on hover); loading and failure stay visible on the bar, never in the ⋯ menu. */
function dbStatusView(): Node {
  if (app.dbStatus === 'ready') {
    return h('span', { class: 'flex items-center', title: t('db.ready') },
      h('span', { class: 'size-2.5 rounded-full bg-good ring-2 ring-good/25', 'aria-hidden': 'true' }),
      h('span', { class: 'sr-only' }, t('db.ready')));
  }
  if (app.dbStatus === 'failed') return h('button', { type: 'button', class: TOP_BTN, onclick: () => actions.retryDb() }, t('db.retry'));
  const p = app.loadProgress;
  const known = !!p?.total && p.total >= p.loaded;
  const downloaded = !p || (known && p.loaded >= p.total!); // 15.6/15.6 MB: the download is over, the database is starting
  const text = downloaded ? t('db.loading')
    : known ? t('db.loadingBytes', { loaded: mb(p.loaded), total: mb(p.total!) })
      : t('db.loadingMb', { loaded: mb(p.loaded) });
  // A dot and a short figure (full words on hover and for screen readers): an inline sentence wrapped the bar (v10 UX #4/#5).
  const short = downloaded ? '' : known ? `${Math.round((p.loaded / p.total!) * 100)}%` : `${mb(p.loaded)} MB`;
  return h('span', { class: 'flex items-center gap-1.5 text-caption whitespace-nowrap text-muted', title: text },
    h('span', { class: 'size-2.5 animate-pulse rounded-full bg-warn', 'aria-hidden': 'true' }),
    short ? h('span', { 'aria-hidden': 'true' }, short) : null,
    h('span', { class: 'sr-only' }, text));
}

/**
 * Inbox / Review / Notebook: icon + label (screen-reader only on narrow bars) + a count badge (red for unread mail, sun for reviews due).
 * Only the label and badge spans change, so the icon is never wiped. `aria` names the count ("Inbox, 1 new message").
 */
export function setActionButton(btn: HTMLElement, label: string, count: number, aria: string): void {
  const text = btn.querySelector<HTMLElement>('[data-label]');
  const badge = btn.querySelector<HTMLElement>('[data-badge]');
  if (text) text.textContent = label;
  if (badge) {
    badge.hidden = count === 0;
    badge.textContent = count > 99 ? '99+' : String(count);
  }
  if (count > 0) btn.setAttribute('aria-label', aria);
  else btn.removeAttribute('aria-label');
}

const THEME_LABEL: Record<ThemePref, Key> = { light: 'theme.light', system: 'theme.system', dark: 'theme.dark' };

function renderSettings(): void {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === getLang()));
  const pref = getTheme();
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-theme-pref]')) {
    b.setAttribute('aria-pressed', String(b.dataset.themePref === pref));
    b.title = t(THEME_LABEL[b.dataset.themePref as ThemePref]);
  }
}

/** Once at startup, before applyStatic(): icon slots in index.html, theme switch, Import button (the file input is hidden). */
export function initTopbar(): void {
  fillIcons(document.querySelector('header.topbar')!);
  fillIcons(byId('more-menu'));
  fillIcons(byId('domain-menu'));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-theme-pref]')) {
    const pref = b.dataset.themePref as ThemePref;
    if (!THEME_PREFS.includes(pref)) continue;
    b.addEventListener('click', () => {
      setTheme(pref); // only <html data-theme> and the prefs change: nothing here touches the editor
      renderSettings();
    });
  }
  // v12.0 U1: the ⋯ menu's phone copies press the real bar buttons (same dialogs, counts and aria-expanded).
  for (const p of document.querySelectorAll<HTMLButtonElement>('[data-proxy]')) p.addEventListener('click', () => byId(p.dataset.proxy!).click());
  byId('import-btn').addEventListener('click', () => (byId('import-input') as HTMLInputElement).click());
}

/** v12.0 U1: the ⋯ copies show what the bar buttons show (Review hidden at 0; the count is in the bar button's aria-label). */
export function syncMenuCopies(): void {
  for (const p of document.querySelectorAll<HTMLElement>('[data-proxy]')) {
    const src = byId(p.dataset.proxy!);
    p.hidden = src.hidden;
    const label = p.querySelector<HTMLElement>('[data-label]');
    if (label) label.textContent = src.getAttribute('aria-label') ?? src.querySelector('[data-label]')?.textContent ?? '';
  }
}

let noticeSig: unknown[] = [];
function renderNotice(): void {
  const el = byId('notice');
  const n = app.notice;
  el.hidden = !n;
  if (!n) {
    noticeSig = [];
    return el.replaceChildren();
  }
  // ui-ux-v5 A4: the domain's loading line gets the loader, and a bar only while the asset download has a known size left.
  const wait = n.key === 'domain.loading';
  const p = app.loadProgress;
  const bar = wait && downloading(p);
  // #notice is role=status: a download progress tick (renderTopbar) must not rebuild the same line, or it is read again each time.
  const sig = [n, getLang(), bar]; // a new notice object (even the same text again) is drawn and read anew
  const shown = el.querySelector('progress');
  if (sig.every((x, i) => x === noticeSig[i])) {
    if (shown && bar) shown.value = p!.loaded;
    return;
  }
  noticeSig = sig;
  el.classList.toggle('max-sm:flex-wrap', bar);
  el.replaceChildren(...nodes(
    wait && loader(),
    h('span', {}, t(n.key, n.params)),
    bar && h('progress', { class: 'h-1.5 w-40 accent-accent max-sm:order-last max-sm:w-full', 'aria-hidden': 'true', max: String(p!.total), value: String(p!.loaded) }),
    n.reload ? h('button', { type: 'button', onclick: () => (n.apply ? n.apply() : location.reload()) }, t('app.reload')) : null,
    h('button', { type: 'button', class: 'ml-auto', 'aria-label': t('app.dismiss'), onclick: () => { app.notice = undefined; renderNotice(); } }, '×')));
}

let xpMark: { save: object; n: number } | undefined;
let xpRun = 0;

/** ui-ux-v5 A3: the pill pops and a "+N" chip rises when XP grew since the last draw (any source); it starts under the pill so it never leaves the viewport. */
function drawXp(): void {
  const pill = byId('xp');
  const gain = gainSince(xpMark, app.save, app.save.xp);
  xpMark = { save: app.save, n: app.save.xp };
  const label = document.createTextNode(t('top.xp', { n: app.save.xp }));
  pill.replaceChildren(icon('star', 'size-4'), label); // a later redraw drops a running chip early (accepted, A3)
  const run = ++xpRun; // a later redraw stops the count below (its text is final already)
  if (!gain || reducedMotion()) return; // reduced motion: no animationend would ever remove the chip
  // v6 E1: the number counts up from the old total in 600 ms (ease-out), plain rAF in main (no GSAP).
  const to = app.save.xp, t0 = performance.now();
  const tick = (now: number): void => {
    if (run !== xpRun) return;
    const k = Math.min(1, (now - t0) / 600);
    label.data = t('top.xp', { n: Math.round(to - gain * (1 - k) ** 3) });
    if (k < 1) requestAnimationFrame(tick);
  };
  tick(t0);
  celebrate(pill);
  // aria-hidden: the feedback line already says "+N XP" (work.correctXp).
  const chip = h('span', { 'aria-hidden': 'true', class: 'cq-rise absolute top-full right-0 mt-1 whitespace-nowrap rounded-full bg-sun px-1.5 text-caption font-bold text-sun-ink shadow-sm' }, `+${gain}`);
  chip.addEventListener('animationend', () => chip.remove(), { once: true });
  pill.append(chip);
}

export function renderTopbar(): void {
  const lang = getLang();
  const route = currentRoute();
  const ch = currentChapter(app.tickets, done());
  const total = chaptersOf().length;
  const title = chapterTitle(ch, lang);
  const chapter = byId('chapter');
  chapter.title = t('top.chapter', { n: ch, total, title });
  chapter.replaceChildren(
    icon('map', 'size-4'),
    h('span', { class: 'font-semibold' }, t('top.chapterShort', { n: ch, total })));
  // Chapter and rank belong to the domain (v5 §B.2); the General workspace (#/learn/play) is not in it (L82, L93, v15 Q1).
  const domainChrome = inDomain(route) && !(route === 'play' && generalWork());
  byId('domain-status').hidden = !domainChrome;
  byId('domain-chapter').textContent = domainChrome ? t('top.chapterTiny', { n: ch }) : ''; // U1: "Ch.4" in the chip on phones
  const rank = byId('rank');
  rank.textContent = rank.title = rankOf(app.tickets, done()).tier?.[lang] ?? t('career.intern'); // title: F1 truncates it on a tight bar
  drawXp();
  renderSettings();
  byId('db-status').replaceChildren(...nodes(
    dbStatusView(),
    app.problem ? h('button', { type: 'button', class: TOP_BTN, onclick: () => actions.copyDiagnostics() }, t('diag.copy')) : null));
  renderNav();
  renderDomainMenu();
  renderNotice();
}
