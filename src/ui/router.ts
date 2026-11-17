import { hashOf, initialRoute, parseRoute, ROUTE_KEY, type Route } from '../route';
import { readJson, writeJson } from '../storage';

let current: Route = 'home';
export const currentRoute = (): Route => current;

/** Navigates through the hash, so Back/Forward work; a no-op when already there. */
export function go(r: Route): void {
  if (location.hash !== hashOf(r)) location.hash = hashOf(r);
}

/**
 * Shows the route in the URL (else the remembered one, else home), then follows hashchange.
 * `initial` is true only for the first show on page load (callers skip moving focus then).
 */
export function startRouter(show: (r: Route, initial: boolean) => void): void {
  const apply = (r: Route, initial: boolean) => {
    current = r;
    writeJson(ROUTE_KEY, r);
    show(r, initial);
  };
  const first = initialRoute(location.hash, readJson<unknown>(ROUTE_KEY));
  // No extra history entry for the redirect; a hash that already names the route keeps its tail (#/data/ports).
  if (parseRoute(location.hash) !== first) history.replaceState(history.state, '', hashOf(first));
  apply(first, true);
  window.addEventListener('hashchange', () => apply(parseRoute(location.hash) ?? 'home', false));
}
