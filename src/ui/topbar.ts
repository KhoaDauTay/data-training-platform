import { getLang, t, type Key } from '../i18n';
import { chapterTitle, CHAPTERS, currentChapter, rankOf } from '../progress';
import { upsert } from '../registry';
import { hashOf, type Route } from '../route';
import { actions, app, done } from '../state';
import { cx, getTheme, NAV_LINK, setTheme, THEME_PREFS, TOP_BTN, type ThemePref } from '../theme';
import { byId, h, nodes } from './dom';
import { fillIcons, icon } from './icons';
import { currentRoute } from './router';

const mb = (bytes: number): number => Math.round(bytes / 1e5) / 10;

/** A top-bar link. Plan 1c adds Practice / Sandbox here (and re-registers 'play' to be current only in story mode). */
export interface NavItem {
  id: string;
  order: number;
  label: Key;
  href: string;
  current(route: Route): boolean;
  /** Optional action instead of plain hash navigation (e.g. enter a mode, then go('play')). */
  onclick?: () => void;
}
const NAV: NavItem[] = [];
/** Same id replaces the old entry; kept sorted by order. */
export const registerNav = (item: NavItem): void => upsert(NAV, item);
registerNav({ id: 'home', order: 10, label: 'nav.home', href: hashOf('home'), current: (r) => r === 'home' });
registerNav({ id: 'play', order: 20, label: 'nav.play', href: hashOf('play'), current: (r) => r === 'play' });

function renderNav(): void {
  const route = currentRoute();
  byId('nav').replaceChildren(...NAV.map((n) => {
    const click = n.onclick;
    return h('a', {
      href: n.href,
      class: NAV_LINK,
      'aria-current': n.current(route) ? 'page' : false,
      onclick: click ? (e: Event) => { e.preventDefault(); click(); } : false,
    }, t(n.label));
  }));
}

/** Ready = a green dot (text for screen readers and on hover); loading and failure stay visible on the bar, never in the ⋯ menu. */
function dbStatusView(): Node {
  if (app.dbStatus === 'ready') {
    return h('span', { class: 'flex items-center', title: t('db.ready') },
      h('span', { class: 'size-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-300/40', 'aria-hidden': 'true' }),
      h('span', { class: 'sr-only' }, t('db.ready')));
  }
  if (app.dbStatus === 'failed') return h('button', { type: 'button', class: TOP_BTN, onclick: () => actions.retryDb() }, t('db.retry'));
  const p = app.loadProgress;
  const text = !p ? t('db.loading')
    : p.total && p.total >= p.loaded ? t('db.loadingBytes', { loaded: mb(p.loaded), total: mb(p.total) })
      : t('db.loadingMb', { loaded: mb(p.loaded) });
  return h('span', { class: 'rounded-lg bg-black/25 px-2 py-1 whitespace-nowrap ring-1 ring-white/15' }, text);
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
  const ch = currentChapter(app.tickets, done());
  const total = CHAPTERS.length;
  const title = chapterTitle(ch, lang);
  const chapter = byId('chapter');
  chapter.title = t('top.chapter', { n: ch, total, title });
  chapter.replaceChildren(
    icon('map', 'size-4'),
    h('span', { class: 'font-semibold' }, t('top.chapterShort', { n: ch, total })),
    // Full name in `title`; hidden where the bar is tight (the map strip and Home name the chapter too).
    h('span', { class: 'truncate max-md:hidden md:max-w-[12rem] xl:max-2xl:hidden 2xl:max-w-[16rem]' }, title));
  byId('rank').textContent = rankOf(app.tickets, done()).tier?.[lang] ?? t('career.intern');
  byId('xp').replaceChildren(icon('star', 'size-4'), t('top.xp', { n: app.save.xp }));
  renderSettings();
  byId('db-status').replaceChildren(...nodes(
    dbStatusView(),
    app.problem ? h('button', { type: 'button', class: TOP_BTN, onclick: () => actions.copyDiagnostics() }, t('diag.copy')) : null));
  renderNav();
  renderNotice();
}
