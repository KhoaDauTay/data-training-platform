import { getLang, t, type Key } from '../i18n';
import { chapterTitle, CHAPTERS, currentChapter, rankOf } from '../progress';
import { hashOf, type Route } from '../route';
import { actions, app, done } from '../state';
import { NAV_LINK, TOP_BTN } from '../theme';
import { byId, h, nodes } from './dom';
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
export function registerNav(item: NavItem): void {
  const i = NAV.findIndex((x) => x.id === item.id);
  if (i >= 0) NAV.splice(i, 1);
  NAV.push(item);
  NAV.sort((a, b) => a.order - b.order);
}
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

function dbStatusView(): Node | string {
  if (app.dbStatus === 'ready') return t('db.ready');
  if (app.dbStatus === 'failed') return h('button', { type: 'button', class: TOP_BTN, onclick: () => actions.retryDb() }, t('db.retry'));
  const p = app.loadProgress;
  if (!p) return t('db.loading');
  return p.total && p.total >= p.loaded
    ? t('db.loadingBytes', { loaded: mb(p.loaded), total: mb(p.total) })
    : t('db.loadingMb', { loaded: mb(p.loaded) });
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
  const ch = currentChapter(app.tickets, done());
  byId('chapter').textContent = t('top.chapter', { n: ch, total: CHAPTERS.length, title: chapterTitle(ch, getLang()) });
  byId('rank').textContent = rankOf(app.tickets, done()).tier?.[getLang()] ?? t('career.intern');
  byId('xp').textContent = t('top.xp', { n: app.save.xp });
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === getLang()));
  byId('db-status').replaceChildren(dbStatusView());
  renderNav();
  renderNotice();
}
