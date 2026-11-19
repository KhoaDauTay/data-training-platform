import { canonicalHash, hashOf, initialRoute, LEARN_PLAY, parseRoute, ROUTE_KEY, workspaceHash, type Route } from '../route';
import { readJson, writeJson } from '../storage';

let current: Route = 'home';
export const currentRoute = (): Route => current;

let isLab = (): boolean => false;
/** Navigates through the hash, so Back/Forward work; a no-op when already there. The General workspace is LEARN_PLAY (v15 Q1). */
export function go(r: Route): void {
  const to = r === 'play' && isLab() ? LEARN_PLAY : hashOf(r);
  if (location.hash !== to) location.hash = to;
}

/**
 * Shows the route in the URL (else the remembered one, else home), then follows hashchange.
 * `initial` is true only for the first show on page load (callers skip moving focus then).
 * `lab`: the workspace holds a drill or a review of drills (v15 Q1: its hash is LEARN_PLAY, never a domain's).
 */
export function startRouter(show: (r: Route, initial: boolean) => void, lab: () => boolean): void {
  isLab = lab;
  const apply = (r: Route, initial: boolean) => {
    current = r;
    writeJson(ROUTE_KEY, location.hash === LEARN_PLAY ? 'practice' : r); // a reload drops the drill: never reopen a domain's workspace for it
    show(r, initial);
  };
  /** An old hash (#/play, #/data/<t>, #/dashboard: bookmarks, shared links) or a workspace alias becomes the new one in place, no extra history entry. */
  const upgrade = (): void => {
    const c = workspaceHash(canonicalHash(location.hash), isLab());
    if (c !== location.hash) history.replaceState(history.state, '', c);
  };
  upgrade();
  const first = initialRoute(location.hash, readJson<unknown>(ROUTE_KEY));
  // No extra history entry for the redirect; a hash that already names the route keeps its tail (#/d/logistics/data/ports).
  if (parseRoute(location.hash) !== first) history.replaceState(history.state, '', hashOf(first));
  apply(first, true);
  window.addEventListener('hashchange', () => {
    upgrade();
    apply(parseRoute(location.hash) ?? 'home', false);
  });
}
