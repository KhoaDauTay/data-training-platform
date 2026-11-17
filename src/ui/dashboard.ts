import type { QueryResult } from '../db/run';
import { chapterOfId, KPIS, kpiTiles, kpiValue, type Kpi, type KpiTile, type KpiValue } from '../home';
import { getLang, t } from '../i18n';
import { stepKey } from '../save';
import { app, done, persist } from '../state';
import { CARD, cx } from '../theme';
import { textOf, type Ticket } from '../tickets';
import { byId, h } from './dom';
import { icon, isIconName, type IconName } from './icons';

/** #/dashboard (product-design-v3 Part A, L48/L49): player cards first, then the company tiles from content/kpis.yml. */

/** Solution results per step, run once per session and only for open tiles (an open tile = task already solved: nothing leaks). */
const kpiRuns = new Map<string, Promise<QueryResult>>();
function kpiResult(tk: Ticket, step: number): Promise<QueryResult> {
  const key = stepKey(tk.id, step);
  let run = kpiRuns.get(key);
  if (!run) {
    run = app.run(tk.steps[step].solution); // DbClient queues it until the database is ready
    kpiRuns.set(key, run);
    run.catch(() => kpiRuns.delete(key)); // a failed run is retried on the next draw
  }
  return run;
}

const BIG = 'm-0 text-3xl font-bold tabular-nums';
const KIND_ICON: Record<Kpi['kind'], IconName> = { number: 'hash', rowcount: 'list', bar: 'chart' };
const kpiIcon = (k: Kpi): IconName => (k.icon && isIconName(k.icon) ? k.icon : KIND_ICON[k.kind]);
const ICON_BTN = 'grid size-10 shrink-0 place-items-center p-0 sm:size-8';

/** Screen-reader line for moves, hides and unpins (the button that was pressed may be gone after the redraw). */
const announce = (text: string): void => {
  byId('announce').textContent = text;
};

/**
 * L42: the rounded value shows, the exact one is in `title` (hover) and in the screen-reader text.
 * L23: neutral text and bars, numbers in tabular figures; colour stays in small badges.
 */
export function kpiView(v: KpiValue, unit: string): HTMLElement {
  const unitEl = unit ? h('span', { class: 'text-base font-medium text-muted', 'aria-hidden': 'true' }, unit) : null;
  if ('text' in v) {
    return h('p', { class: cx(BIG, 'flex flex-wrap items-baseline gap-x-1.5'), title: unit ? `${v.full} ${unit}` : v.full },
      h('span', { 'aria-hidden': 'true' }, v.text), unitEl,
      h('span', { class: 'sr-only' }, unit ? `${v.full} ${unit}` : v.full));
  }
  const max = Math.max(1, ...v.bars.map((b) => b.value));
  return h('ul', { class: 'm-0 list-none space-y-1.5 p-0' }, ...v.bars.map((b) =>
    h('li', { class: 'grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-2 text-sm', title: `${b.label}: ${b.full}${unit ? ` ${unit}` : ''}` },
      h('span', { class: 'truncate' }, b.label),
      h('span', { class: 'h-2.5 rounded bg-slate-500 dark:bg-slate-400', style: `width:${Math.round((b.value / max) * 100)}%`, 'aria-hidden': 'true' }),
      h('span', { class: 'tabular-nums' }, b.text, unit ? h('span', { class: 'text-muted' }, ` ${unit}`) : null))));
}

function setHidden(id: string, hide: boolean, label: string, redraw: () => void): void {
  const d = app.save.dashboard;
  d.hidden = hide ? [...d.hidden, id] : d.hidden.filter((x) => x !== id);
  persist(true);
  redraw();
  byId('dash-company-title').focus(); // the pressed button is gone after the redraw
  announce(t(hide ? 'dash.hiddenDone' : 'dash.shownDone', { title: label }));
}

/** ui-ux-v3 §c: icon + label, then the big value with its unit, then the source line. Company tiles can only be hidden (L49). */
function kpiTile(tile: KpiTile, redraw: () => void): HTMLElement {
  const lang = getLang();
  const { kpi, ticket } = tile;
  const open = tile.open && !!ticket;
  const unit = kpi.unit?.[lang] ?? '';
  const value = h('div', { class: 'min-h-9' });
  if (open) {
    value.append(h('p', { class: cx(BIG, 'text-muted') }, '…'));
    kpiResult(ticket, kpi.step).then(
      (r) => value.replaceChildren(kpiView(kpiValue(kpi, r, lang), unit)),
      () => value.replaceChildren(h('p', { class: cx(BIG, 'text-muted') }, '—')));
  } else {
    value.append(h('p', { class: cx(BIG, 'text-muted') }, ticket ? '—' : '???'));
  }
  const foot = open ? t('home.kpiFrom', { title: textOf(ticket, lang).title })
    : ticket ? t('home.kpiLocked', { n: ticket.chapter, title: textOf(ticket, lang).title, name: ticket.from.name })
      : t('home.kpiLater', { n: chapterOfId(kpi.ticket) });
  const label = kpi.label[lang];
  return h('article', { class: cx(CARD, 'flex flex-col gap-3 p-4') },
    h('div', { class: 'flex items-start gap-3' },
      h('span', { class: cx('grid size-9 shrink-0 place-items-center rounded-lg', open ? 'bg-code text-ink' : 'bg-code text-muted') }, icon(kpiIcon(kpi))),
      h('h3', { class: 'm-0 flex-1 self-center text-sm leading-snug font-medium' }, label),
      h('button', { type: 'button', class: ICON_BTN, title: t('dash.hide', { title: label }), 'aria-label': t('dash.hide', { title: label }), onclick: () => setHidden(kpi.id, true, label, redraw) },
        icon('eyeOff', 'size-4'))),
    value,
    h('p', { class: 'mt-auto mb-0 flex items-start gap-1.5 text-sm text-muted' }, icon(open ? 'link' : 'lock', 'mt-0.5 size-4'), h('span', {}, foot)));
}

function companySection(redraw: () => void): HTMLElement {
  const lang = getLang();
  const tiles = kpiTiles(KPIS, app.tickets, done());
  const hidden = new Set(app.save.dashboard.hidden);
  const shown = tiles.filter((x) => !hidden.has(x.kpi.id));
  const gone = tiles.filter((x) => hidden.has(x.kpi.id));
  return h('section', { 'aria-labelledby': 'dash-company-title' },
    h('div', { class: 'flex flex-wrap items-baseline gap-x-3' },
      h('h2', { id: 'dash-company-title', tabindex: '-1', class: 'm-0 text-lg font-bold' }, t('dash.company')),
      h('span', { class: 'text-sm text-muted' }, t('dash.companyOpen', { n: tiles.filter((x) => x.open).length, total: tiles.length }))),
    h('p', { class: 'mt-1 mb-3 text-[15px] text-muted' }, t('dash.companyIntro')),
    h('div', { class: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4' }, ...shown.map((x) => kpiTile(x, redraw))),
    gone.length
      ? h('details', { class: 'mt-3' },
        h('summary', { class: 'cursor-pointer text-sm text-muted' }, t('dash.hidden', { n: gone.length })),
        h('ul', { class: 'mt-2 list-none space-y-1 p-0' }, ...gone.map((x) => h('li', {},
          h('button', { type: 'button', class: 'flex items-center gap-2 px-2 py-1 text-sm', onclick: () => setHidden(x.kpi.id, false, x.kpi.label[lang], redraw) },
            icon('eye', 'size-4'), t('dash.show', { title: x.kpi.label[lang] }))))))
      : null);
}

/** Redrawn by main.ts (route shown, language switch, progress); main.ts focuses the title after a route change. */
export function renderDashboard(host: HTMLElement): void {
  const redraw = (): void => renderDashboard(host);
  host.replaceChildren(h('div', { class: 'mx-auto max-w-6xl space-y-6 px-4 py-6' },
    h('header', {},
      h('h1', { id: 'dashboard-title', tabindex: '-1', class: 'm-0 text-2xl font-bold' }, t('dash.title')),
      h('p', { class: 'mt-1 mb-0 max-w-3xl text-[15px] text-muted' }, t('dash.intro'))),
    companySection(redraw)));
}
