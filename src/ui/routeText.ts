import { t } from '../i18n';
import { ROUTES, type Harbor } from '../scene';

/** The two status lines (tasks done and ships out; chapters passed and current): in the SVG, and as HTML below lg. */
export function callout(h: Harbor, current: number): [string, string] {
  const trips = Object.values(h.trips).reduce((a, b) => a + b, 0) + h.departures;
  const done = Object.values(h.bays).reduce((a, b) => a + b, 0);
  return [t('harbor.callA', { done, trips }), t('harbor.callB', { passed: h.passed.size, n: current })];
}

/** One line per lane ("Rotterdam: open (3 trips)"): the map's accessible description, and Home's legend below lg. Text only, so it stays in main (Plan 8b). */
export const routeItems = (h: Harbor): string[] => ROUTES.map((r) => {
  const n = h.trips[r.port] ?? 0;
  return t(h.open.has(r.port) ? 'routes.open' : 'routes.locked', { name: r.name }) + (n ? ` (${t('routes.trips', { n })})` : '');
});
