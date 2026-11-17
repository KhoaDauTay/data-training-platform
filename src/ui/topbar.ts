import { DOMAINS } from '../domains';
import { getLang, t, type Key } from '../i18n';
import { chapterTitle, CHAPTERS, currentChapter, rankOf } from '../progress';
import { upsert } from '../registry';
import { domainHash, hashOf, inDomain, type Route } from '../route';
import { actions, app, done } from '../state';
import { getTheme, NAV_LINK, setTheme, THEME_PREFS, TOP_BTN, type ThemePref } from '../theme';
import { byId, h, nodes } from './dom';
import { fillIcons, icon, type IconName } from './icons';
import { currentRoute } from './router';

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
registerNav({ id: 'home', area: 'top', order: 10, label: 'nav.home', icon: 'home', href: hashOf('home'), current: (r) => r === 'home' });
registerNav({ id: 'learn', area: 'top', order: 20, label: 'nav.learn', icon: 'route', href: hashOf('learn'), current: (r) => r === 'learn' });
// Practice (top, order 30), Sandbox (domain, 30, ui/modes.ts) and Data (domain, 50, ui/dataView.ts) register their own.
registerNav({ id: 'overview', area: 'domain', order: 10, label: 'nav.overview', icon: 'anchor', href: hashOf('overview'), current: (r) => r === 'overview' || r === 'soon' });
registerNav({ id: 'play', area: 'domain', order: 20, label: 'nav.play', icon: 'code', href: hashOf('play'), current: (r) => r === 'play' });
registerNav({ id: 'dashboard', area: 'domain', order: 60, label: 'nav.dashboard', icon: 'chart', href: hashOf('dashboard'), current: (r) => r === 'dashboard' });
registerNav({ id: 'map', area: 'domain', order: 70, label: 'nav.map', icon: 'map', href: hashOf('map'), current: (r) => r === 'map' });

/** Mobile bottom bar (v6 §3.2): 56 px targets; the current one is --accent on --panel (5.5:1) and keeps its label. */
const BOTTOM_LINK = 'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-bold text-muted no-underline aria-[current=page]:text-accent';
const MENU_ITEM = 'flex w-full items-center gap-2 rounded-(--r-ctl) px-3 py-2 text-ink no-underline hover:bg-code';

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
  const live = DOMAINS.find((d) => d.live)!;
  byId('nav').replaceChildren(...top.map((n) => navLink(n, route, NAV_LINK, t(n.label))));
  byId('bottom-nav').replaceChildren(
    ...top.map((n) => navLink(n, route, BOTTOM_LINK, icon(n.icon, 'size-5'), h('span', {}, t(n.label)))),
    h('a', { href: hashOf('overview'), class: BOTTOM_LINK, 'aria-current': inDomain(route) ? 'page' : false },
      icon(live.icon, 'size-5'), h('span', {}, t(live.name))));
}

/** Domain switch (v5 §B.2, D-N3): Logistics with its chapter, then the "Coming soon" pages (no date promised). */
function renderDomainMenu(): void {
  const menu = byId('domain-menu');
  const ch = currentChapter(app.tickets, done());
  byId('domain-label').textContent = t(DOMAINS.find((d) => d.live)!.name);
  menu.replaceChildren(h('div', { class: 'flex flex-col' }, ...DOMAINS.map((d) => h('a', {
    href: d.live ? hashOf('overview') : domainHash(d.id), class: MENU_ITEM, onclick: () => menu.hidePopover?.(),
  },
    icon(d.icon, 'size-4'),
    h('span', { class: 'flex-1 font-bold' }, t(d.name)),
    h('span', { class: 'text-sm text-muted' }, d.live ? t('top.chapterShort', { n: ch, total: CHAPTERS.length }) : t('home.status.soon'))))));
}

/** Ready = a green dot (text for screen readers and on hover); loading and failure stay visible on the bar, never in the ⋯ menu. */
function dbStatusView(): Node {
  if (app.dbStatus === 'ready') {
    return h('span', { class: 'flex items-center', title: t('db.ready') },
      h('span', { class: 'size-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-600/25', 'aria-hidden': 'true' }),
      h('span', { class: 'sr-only' }, t('db.ready')));
  }
  if (app.dbStatus === 'failed') return h('button', { type: 'button', class: TOP_BTN, onclick: () => actions.retryDb() }, t('db.retry'));
  const p = app.loadProgress;
  const text = !p ? t('db.loading')
    : p.total && p.total >= p.loaded ? t('db.loadingBytes', { loaded: mb(p.loaded), total: mb(p.total) })
      : t('db.loadingMb', { loaded: mb(p.loaded) });
  return h('span', { class: 'rounded-full bg-code px-2.5 py-1 whitespace-nowrap' }, text);
}

/**
 * Inbox / Review / Notebook: icon + label (screen-reader only on narrow bars) + a red count badge.
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
  byId('import-btn').addEventListener('click', () => (byId('import-input') as HTMLInputElement).click());
}

function renderNotice(): void {
  const el = byId('notice');
  const n = app.notice;
  el.hidden = !n;
  if (!n) return el.replaceChildren();
  el.replaceChildren(...nodes(
    h('span', {}, t(n.key, n.params)),
    n.reload ? h('button', { type: 'button', onclick: () => location.reload() }, t('app.reload')) : null,
    h('button', { type: 'button', class: 'ml-auto', 'aria-label': t('app.dismiss'), onclick: () => { app.notice = undefined; renderNotice(); } }, '×')));
}

export function renderTopbar(): void {
  const lang = getLang();
  const route = currentRoute();
  const ch = currentChapter(app.tickets, done());
  const total = CHAPTERS.length;
  const title = chapterTitle(ch, lang);
  const chapter = byId('chapter');
  chapter.title = t('top.chapter', { n: ch, total, title });
  chapter.replaceChildren(
    icon('map', 'size-4'),
    h('span', { class: 'font-semibold' }, t('top.chapterShort', { n: ch, total })));
  byId('domain-status').hidden = !inDomain(route); // chapter and rank belong to the domain (v5 §B.2)
  byId('rank').textContent = rankOf(app.tickets, done()).tier?.[lang] ?? t('career.intern');
  byId('xp').replaceChildren(icon('star', 'size-4'), t('top.xp', { n: app.save.xp }));
  renderSettings();
  byId('db-status').replaceChildren(...nodes(
    dbStatusView(),
    app.problem ? h('button', { type: 'button', class: TOP_BTN, onclick: () => actions.copyDiagnostics() }, t('diag.copy')) : null));
  renderNav();
  renderDomainMenu();
  renderNotice();
}
