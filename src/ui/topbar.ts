import { getLang, t } from '../i18n';
import { chapterTitle, currentChapter } from '../progress';
import { actions, app, done } from '../state';
import { byId, h, nodes } from './dom';

const mb = (bytes: number): number => Math.round(bytes / 1e5) / 10;

function dbStatusView(): Node | string {
  if (app.dbStatus === 'ready') return t('db.ready');
  if (app.dbStatus === 'failed') return h('button', { type: 'button', onclick: () => actions.retryDb() }, t('db.retry'));
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
    h('button', { type: 'button', class: 'close', 'aria-label': t('app.dismiss'), onclick: () => { app.notice = undefined; renderNotice(); } }, '×')));
}

export function renderTopbar(): void {
  const ch = currentChapter(app.tickets, done());
  byId('chapter').textContent = t('top.chapter', { n: ch, title: chapterTitle(ch, getLang()) });
  byId('xp').textContent = t('top.xp', { n: app.save.xp });
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === getLang()));
  byId('db-status').replaceChildren(dbStatusView());
  renderNotice();
}
