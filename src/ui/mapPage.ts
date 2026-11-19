import { domainText } from '../domains';
import { t } from '../i18n';
import { derive, ROUTES as LANES } from '../scene';
import { actions, app, done } from '../state';
import { CARD, cx } from '../theme';
import { artSlot } from '../art/load';
import { fleetOrder, takeNewRoutes } from '../routesSeen';
import { domainArt } from './domainArt';
import { byId, h } from './dom';
import { homeHooks, registerHomeSection } from './homeView';
import { icon } from './icons';
import { laneInfo, lanePanel, wirePins } from './lanePanel';

/** The Map page (#/d/<domain>/map): moved out of homeView.ts (V22-A), registered as the 'routes' reading-page section. */
let stopMap: (() => void) | undefined;
/** Lane whose brief is open on the Map page (session only). */
let mapLane: string | undefined;

/** v12.0 U4: a pin or a list row opens that lane's brief beside the map (under it below 1024 px); its name is announced. */
function pickLane(port: string): void {
  mapLane = port;
  actions.rerender();
  byId('announce').textContent = LANES.find((r) => r.port === port)?.name ?? '';
  byId('home').querySelector<HTMLElement>('#lane-title')?.scrollIntoView({ block: 'nearest' });
}

function routesSection(): HTMLElement {
  const words = domainText();
  if (words) {
    return h('section', { class: cx(CARD, 'p-5'), 'aria-labelledby': 'routes-title' },
      h('h2', { id: 'routes-title', class: 'm-0 mb-2 text-title font-bold' }, t(words.mapTitle)), domainArt('map'));
  }
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
  return h('section', { class: cx(CARD, 'p-5'), 'aria-labelledby': 'routes-title' },
    h('div', { class: 'mb-2 flex flex-wrap items-end justify-between gap-2' },
      h('h2', { id: 'routes-title', class: 'm-0 text-title font-bold' }, t('routes.title')),
      h('p', { class: 'm-0 text-body-sm text-muted' }, t('routes.subtitle'))),
    // ui-ux-v6 S2: the map takes the card's full width (labels ≥ 11 px from lg); the lane list and the brief sit below it
    artSlot('aspect-[5/2] rounded-(--r-ctl)', (a) => {
      stopMap?.(); // one fleet per page: the previous drawing's loop ends here
      const p = a.routeMap(harbor);
      wirePins(p, harbor, pickLane);
      stopMap = a.liveMap(p, harbor, takeNewRoutes(harbor.open), fleetOrder());
      return p.svg;
    }),
    h('div', { class: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]' }, h('div', { class: 'min-w-0' }, list), h('div', { class: 'min-w-0 lg:mt-3' }, brief)));
}


registerHomeSection({ id: 'routes', order: 25, span: 'full', pages: ['map'], render: routesSection });
