import { activeDomain, domainSchemaId, type DomainId } from '../domains';
import { getLang, t } from '../i18n';
import { derive, ROUTES as LANES } from '../scene';
import { actions, app, done, unlockedTables } from '../state';
import { CARD, cx } from '../theme';
import { loadArt, loadedArt } from '../art/load';
import { fleetOrder, takeNewRoutes } from '../routesSeen';
import { artState, loadDomainArt } from './domainArt';
import { announce, byId, h, loader, reducedMotion } from './dom';
import { errorView } from './feedback';
import { homeHooks, registerHomeSection } from './homeView';
import { icon } from './icons';
import { laneInfo, lanePanel, wirePins } from './lanePanel';
import type { PageState } from './mapTeach';
import type { MapParts } from '../art/logistics';
import { s } from './svg';

/** The Map page (#/d/<domain>/map), moved out of homeView.ts (V22-A); since V22-A a "result map" (map-research.md option A). */
let stopMap: (() => void) | undefined;
/** Lane whose brief is open on the Map page (session only). */
let mapLane: string | undefined;
/** V22-A: picked point, SQL and last result per domain (session only, never saved; rerender() redraws the section whole). */
const pageState: Record<DomainId, PageState> = { logistics: {}, ecommerce: {}, finance: {} };

let mapTeach: Promise<typeof import('./mapTeach')> | undefined;
/** The lazy `mapTeach` chunk (budget `mapteach`), shared with the workspace's Map tab (ui/vizTabs.ts); a failed load is retried next time. */
export function loadMapTeach(): Promise<typeof import('./mapTeach')> {
  mapTeach ??= import('./mapTeach').then((m) => {
    m.init({
      h, s, getLang, reducedMotion, announce, errorView: (e) => errorView(e), loadArt, loadDomainArt, artState,
      harbor: () => derive(app.tickets, done()), unlocked: unlockedTables,
      run: (sql, d) => app.run(sql, { schema: domainSchemaId(d) }), rerender: () => actions.rerender(),
    });
    return m;
  }).catch((e: unknown) => {
    mapTeach = undefined;
    throw e;
  });
  return mapTeach;
}

/** v12.0 U4: a pin or a list row opens that lane's brief beside the map (under it below 1024 px); its name is announced. V22-A: it also picks the question. */
function pickLane(port: string): void {
  mapLane = port;
  pageState.logistics.place = port;
  actions.rerender();
  byId('announce').textContent = LANES.find((r) => r.port === port)?.name ?? '';
  byId('home').querySelector<HTMLElement>('#lane-title')?.scrollIntoView({ block: 'nearest' });
}

/** Tien Sa's lanes (the reward of L26/L49, unchanged): the list and the picked lane's brief, under the result map. */
function lanes(): HTMLElement {
  const harbor = derive(app.tickets, done());
  const list = h('ul', { class: 'mt-3 mb-0 grid list-none gap-1.5 p-0 text-body-sm sm:grid-cols-2' }, ...LANES.map((r) =>
    h('li', {}, h('button', {
      type: 'button', id: `lane-btn-${r.port}`, 'aria-current': r.port === mapLane ? 'true' : false,
      class: cx('flex w-full items-center gap-2 px-3 py-1.5 text-left max-lg:min-h-11', r.port === mapLane && 'ring-2 ring-accent', !harbor.open.has(r.port) && 'text-muted'),
      onclick: () => pickLane(r.port),
    }, icon(harbor.open.has(r.port) ? 'route' : 'lock', 'size-4'), h('b', {}, r.name), h('span', { class: 'ml-auto text-muted' }, laneInfo(r, harbor))))));
  const brief = mapLane
    ? h('div', { class: 'min-w-0 rounded-(--r-ctl) p-4 ring-1 ring-line' }, lanePanel(mapLane, harbor, (task) => homeHooks.startLane?.(task)))
    : h('p', { class: 'm-0 self-start rounded-(--r-ctl) bg-code p-4 text-body-sm text-muted' }, t('lane.pick'));
  return h('div', { class: 'mt-6' },
    h('div', { class: 'mb-2 flex flex-wrap items-end justify-between gap-2' },
      h('h3', { class: 'm-0 text-title font-bold' }, t('routes.title')),
      h('p', { class: 'm-0 text-body-sm text-muted' }, t('routes.subtitle'))),
    h('div', { class: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]' }, h('div', { class: 'min-w-0' }, list), h('div', { class: 'min-w-0 lg:mt-3' }, brief)));
}

function routesSection(): HTMLElement {
  const d = activeDomain();
  const harbor = derive(app.tickets, done());
  const slot = h('p', { class: 'muted flex items-center gap-2' }, loader(), t('map.loading'));
  // Logistics: the result map is the route map, its pins still open lane briefs and its fleet still sails (one fleet per page)
  const wire = d === 'logistics' ? (p: MapParts) => {
    stopMap?.();
    wirePins(p, harbor, pickLane);
    stopMap = loadedArt()?.liveMap(p, harbor, takeNewRoutes(harbor.open), fleetOrder()); // loaded: the chunk drew this map with it
  } : undefined;
  const points = d === 'logistics' ? LANES.map((r) => ({ id: r.port, name: r.name })) : undefined;
  void loadMapTeach().then((m) => m.page(d, pageState[d], points, wire)).then((el) => {
    if (slot.isConnected) slot.replaceWith(el);
  }, (e: unknown) => {
    if (slot.isConnected) slot.replaceWith(errorView(e));
  });
  return h('section', { class: cx(CARD, 'p-5'), 'aria-labelledby': 'routes-title' }, slot, d === 'logistics' ? lanes() : null);
}

registerHomeSection({ id: 'routes', order: 25, span: 'full', pages: ['map'], render: routesSection });
