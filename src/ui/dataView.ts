import { getLang, t } from '../i18n';
import { CHAPTER_TABLES, chapterTitle } from '../progress';
import { dataTableOf, hashOf } from '../route';
import { app, erMeta, unlockedTables } from '../state';
import { chapterColor, cx, THEME_EVENT } from '../theme';
import { erDefinition, erRowCountsSql, type ErMetadata } from '../viz/erd';
import { memoByKey } from '../viz/memo';
import { h, nodes } from './dom';
import { drawErd, erdSvg, keyBadges } from './erdView';
import { errorView } from './feedback';
import { renderResult } from './resultTable';
import { registerNav } from './topbar';

// Order 60 is kept for the dashboard tab (L47 item 7).
registerNav({ id: 'data', order: 50, label: 'nav.data', href: hashOf('data'), current: (r) => r === 'data' });

/** In memory only, never saved (ui-ux-v4 §5). */
const view = { query: '', scope: 'near' as 'near' | 'all' };
/** Bumped by every renderData(): an async result for an older render is dropped. */
let seq = 0;
/** Redraws of the latest render, for the search box and the theme listener (both outlive one render). */
let redrawList = (): void => {};
let redrawDiagram = (): void => {};

const rowCounts = memoByKey((key) => app.run(erRowCountsSql(key.split(','))).then((r) => new Map(r.rows.map(([x, n]) => [String(x), Number(n)]))));
const chapterOf = (table: string): number => Number(Object.entries(CHAPTER_TABLES).find(([, ts]) => ts.includes(table))?.[0] ?? 0);
const tableHash = (table: string): string => `${hashOf('data')}/${table}`;
const go = (table: string): void => void (location.hash = tableHash(table));

// One search box for the page's lifetime: redrawing the page never replaces it mid-typing (Vietnamese IME composition).
const search = h('input', { type: 'search', id: 'data-search', class: 'mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent', autocomplete: 'off' });
search.addEventListener('input', () => {
  view.query = search.value;
  redrawList();
});
document.addEventListener(THEME_EVENT, () => redrawDiagram()); // Mermaid bakes the theme into the SVG

/** The Data page: unlocked tables, their columns, keys and links, sample rows and an ER diagram. */
export function renderData(host: HTMLElement): void {
  const mine = ++seq;
  const live = (): boolean => mine === seq;
  const open = unlockedTables();
  const openSet = new Set(open);
  const asked = dataTableOf(location.hash);
  const sel = asked && openSet.has(asked) ? asked : open[0];
  if (location.hash !== tableHash(sel)) history.replaceState(history.state, '', tableHash(sel)); // no hashchange, no extra entry
  let meta: ErMetadata | undefined;
  let metaError: unknown;
  let rows: Map<string, number> | 'error' | undefined;

  const hadFocus = document.activeElement === search;
  const caret = search.selectionStart;
  const list = h('nav', { class: 'max-lg:max-h-64 max-lg:overflow-auto', 'aria-labelledby': 'data-list-title' });
  const count = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  const detail = h('section', { class: 'min-w-0', 'aria-labelledby': 'data-table-title' });
  const diagram = h('section', { class: 'mt-6 min-w-0' });
  host.replaceChildren(h('div', { class: 'mx-auto max-w-6xl px-4 py-6' },
    h('h1', { id: 'data-title', tabindex: '-1', class: 'm-0 text-2xl font-bold' }, t('data.title')),
    h('p', { class: 'mt-1 text-muted' }, t('data.intro')),
    h('div', { class: 'mt-4 grid gap-5 lg:grid-cols-[18rem_1fr]' },
      h('div', { class: 'min-w-0 lg:sticky lg:top-4 lg:self-start' },
        h('label', { for: 'data-search', class: 'mb-1 block font-semibold' }, t('data.search')),
        search,
        count,
        h('h2', { id: 'data-list-title', class: 'sr-only' }, t('data.title')),
        list),
      h('div', { class: 'min-w-0' }, detail, diagram))));
  search.value = view.query;
  if (hadFocus) {
    search.focus();
    search.setSelectionRange(caret, caret);
  }

  const colsOf = (table: string) => meta?.cols.filter((c) => c.table === table) ?? [];
  const rowText = (table: string): string | undefined => {
    if (!meta) return undefined;
    const n = rows instanceof Map ? rows.get(table) : undefined;
    return t('data.tableMeta', { rows: n ?? '—', cols: colsOf(table).length });
  };
  const q = (): string => view.query.trim().toLowerCase();
  const matchCols = (table: string): string[] => (q() ? colsOf(table).map((c) => c.name).filter((n) => n.includes(q())) : []);

  function drawList(): void {
    const needle = q();
    const hits = open.filter((x) => !needle || x.includes(needle) || matchCols(x).length > 0);
    const locked = Object.values(CHAPTER_TABLES).flat().filter((x) => !openSet.has(x) && (!needle || x.includes(needle)));
    count.textContent = needle ? t('data.matches', { n: hits.length }) : '';
    const groups = Object.entries(CHAPTER_TABLES).map(([c, ts]) => [Number(c), ts.filter((x) => hits.includes(x))] as const).filter(([, ts]) => ts.length);
    list.replaceChildren(...nodes(
      needle && hits.length === 0 ? h('p', { class: 'text-muted' }, t('data.none', { q: view.query.trim() })) : null,
      ...groups.map(([c, ts]) => h('div', { class: 'mt-3' },
        h('h3', { class: 'm-0 text-sm font-semibold text-muted' }, t('nav.chapterOption', { n: c, title: chapterTitle(c, getLang()) })),
        h('ul', { class: 'mt-1 grid list-none gap-1 p-0 md:max-lg:grid-cols-2' }, ...ts.map((x) => {
          const cols = matchCols(x);
          return h('li', {}, h('a', {
            href: tableHash(x),
            class: 'block rounded-lg px-2 py-1 no-underline ring-1 ring-line hover:bg-code aria-[current=page]:bg-accent-soft aria-[current=page]:ring-2 aria-[current=page]:ring-accent',
            'aria-current': x === sel ? 'page' : false,
          }, ...nodes(
            h('code', { class: 'font-semibold' }, x),
            rowText(x) ? h('span', { class: 'block text-xs text-muted' }, rowText(x)) : null,
            cols.length ? h('span', { class: 'block text-xs text-muted' }, `${t('data.matchCols')} `, cols.join(', ')) : null)));
        })))),
      locked.length ? h('details', { class: 'mt-3 text-muted' },
        h('summary', { class: 'cursor-pointer text-sm' }, t('data.lockedGroup', { n: locked.length })),
        h('ul', { class: 'mt-1 list-none space-y-1 p-0 text-sm opacity-75' }, ...locked.map((x) =>
          h('li', {}, h('code', {}, x), ` · ${t('data.lockedAt', { n: chapterOf(x) })}`)))) : null));
    if (meta) drawColumns(); // <mark> follows the search
  }

  const columnsHost = h('div', { class: 'overflow-auto' });
  function drawColumns(): void {
    const needle = q();
    const cell = 'border-b border-line px-2 py-1.5 text-left align-top';
    columnsHost.replaceChildren(h('table', { class: 'w-full border-collapse text-sm max-sm:block' },
      h('thead', { class: 'max-sm:hidden' }, h('tr', {}, ...['#', t('data.col.name'), t('data.col.type'), t('data.col.null'), t('data.col.key')].map((x) => h('th', { class: cell }, x)))),
      h('tbody', { class: 'max-sm:block' }, ...colsOf(sel).map((c, i) => h('tr', { class: 'max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-2 max-sm:border-b max-sm:border-line max-sm:py-1.5' },
        h('td', { class: cx(cell, 'text-muted max-sm:hidden') }, String(i + 1)),
        h('td', { class: cx(cell, 'max-sm:basis-full max-sm:border-0 max-sm:p-0 max-sm:font-semibold') }, h('code', {}, needle && c.name.includes(needle) ? h('mark', {}, c.name) : c.name)),
        h('td', { class: cx(cell, 'max-sm:border-0 max-sm:p-0') }, c.type),
        h('td', { class: cx(cell, 'max-sm:border-0 max-sm:p-0') }, h('code', {}, c.nullable ? 'NULL' : 'NOT NULL')),
        h('td', { class: cx(cell, 'max-sm:border-0 max-sm:p-0') }, h('span', { class: 'flex flex-wrap items-center gap-1' }, ...keyBadges(meta!.cons, sel, c.name, openSet, go))))))));
  }

  function drawDetail(): void {
    const title = h('h2', { id: 'data-table-title', tabindex: '-1', class: 'm-0 font-mono text-xl' }, sel);
    if (metaError !== undefined) {
      detail.replaceChildren(title, errorView(metaError), h('button', { type: 'button', onclick: () => renderData(host) }, t('data.retry')));
      return;
    }
    if (!meta) {
      detail.replaceChildren(title, h('p', { class: 'text-muted' }, t('data.loading')));
      return;
    }
    const refBy = meta.cons.filter((c) => c.kind === 'FOREIGN KEY' && c.refTable === sel && openSet.has(c.table));
    const sample = h('div', { class: 'mt-2' });
    detail.replaceChildren(...nodes(
      title,
      h('p', { class: 'mt-1 text-muted' }, `${rowText(sel)} · ${t('data.openedAt', { n: chapterOf(sel) })}`),
      columnsHost,
      refBy.length ? h('h3', {}, t('data.refBy')) : null,
      refBy.length ? h('ul', { class: 'flex list-none flex-wrap gap-1.5 p-0' }, ...refBy.map((c) =>
        h('li', {}, h('button', { type: 'button', class: 'px-1.5 py-0 font-mono text-sm', onclick: () => go(c.table) }, `${c.table}.${c.column}`)))) : null,
      h('button', {
        type: 'button',
        class: 'mt-3',
        onclick: () => {
          sample.replaceChildren(h('p', { class: 'text-muted' }, t('data.loading')));
          // `sel` is an unlocked table name, itself a plain identifier (dataTableOf / CHAPTER_TABLES).
          app.run(`SELECT * FROM ${sel} LIMIT 5`).then((r) => live() && sample.replaceChildren(renderResult(r)), (e: unknown) => live() && sample.replaceChildren(errorView(e)));
        },
      }, t('data.sample')),
      sample));
    drawColumns();
  }

  function drawDiagram(): void {
    if (!meta) return diagram.replaceChildren();
    const btn = (v: 'near' | 'all', label: string) => h('button', {
      type: 'button', class: 'px-2.5 py-1 text-sm aria-pressed:bg-accent aria-pressed:font-semibold aria-pressed:text-on-accent',
      'aria-pressed': String(view.scope === v),
      onclick: () => {
        view.scope = v;
        drawDiagram();
        diagram.querySelectorAll<HTMLElement>('[aria-pressed]')[v === 'near' ? 0 : 1]?.focus(); // the redraw replaced the button
      },
    }, label);
    const fig = h('div', {}, h('p', { class: 'text-muted' }, t('erd.drawing')));
    diagram.replaceChildren(
      h('h2', { class: 'mt-0 text-lg' }, t('tab.erd')),
      h('div', { class: 'mb-2 flex flex-wrap gap-1', role: 'group', 'aria-label': t('erd.scope') }, btn('near', t('data.scopeNear')), btn('all', t('erd.scopeAll'))),
      fig);
    const m = meta;
    let tables = open;
    let cons = m.cons;
    let detailSet: Set<string> | undefined;
    if (view.scope === 'near') {
      // Only the selected table's own links: neighbour-to-neighbour FKs would clutter the star.
      cons = m.cons.filter((c) => c.kind !== 'FOREIGN KEY' || c.table === sel || c.refTable === sel);
      const near = new Set([sel]);
      for (const c of cons) if (c.kind === 'FOREIGN KEY' && c.refTable && openSet.has(c.table) && openSet.has(c.refTable)) near.add(c.table).add(c.refTable);
      tables = open.filter((x) => near.has(x));
      detailSet = new Set([sel]);
    }
    const def = erDefinition(m.cols, cons, tables, new Set([sel]), chapterColor(chapterOf(sel)).hex, detailSet);
    erdSvg(def).then((svg) => {
      if (!live()) return;
      fig.replaceChildren();
      drawErd(fig, svg);
    }, (e: unknown) => live() && fig.replaceChildren(errorView(e)));
  }

  redrawList = drawList;
  redrawDiagram = () => {
    if (live() && !host.hidden) drawDiagram();
  };
  drawList();
  drawDetail();
  erMeta('public').then((m) => {
    if (!live()) return;
    meta = m;
    drawList();
    drawDetail();
    drawDiagram();
  }, (e: unknown) => {
    if (!live()) return;
    metaError = e;
    drawDetail();
  });
  rowCounts(open.join(',')).then((r) => { rows = r; }, () => { rows = 'error'; }).then(() => {
    if (!live() || !meta) return; // drawn with the metadata otherwise
    drawList();
    detail.querySelector('#data-table-title + p')?.replaceChildren(`${rowText(sel)} · ${t('data.openedAt', { n: chapterOf(sel) })}`);
  });
}
