import { canonicalHash, generalNav, hashOf, initialRoute, LEARN_PLAY, parseRoute, ROUTE_KEY, workspaceHash, type Route } from '../route';
import { readJson, writeJson } from '../storage';

let current: Route = 'home';
export const currentRoute = (): Route => current;

let labHash = (): string | undefined => undefined;
let started = false;
/** Navigates through the hash, so Back/Forward work; a no-op when already there. The General workspace is LEARN_PLAY (v15 Q1). */
export function go(r: Route): void {
  if (!started) return; // FIX-1: a drill reopened at boot (main.ts) before the router: the URL already names it
  const lab = labHash();
  const to = r === 'play' && lab ? lab : hashOf(r);
  if (location.hash !== to) location.hash = to;
}

/**
 * Shows the route in the URL (else the remembered one, else home), then follows hashchange.
 * `initial` is true only for the first show on page load (callers skip moving focus then).
 * `lab`: the workspace holds a drill or a review of drills (v15 Q1: its hash is LEARN_PLAY, never a domain's).
 */
export function startRouter(
  show: (r: Route, initial: boolean) => void,
  lab: () => string | undefined,
  general: { open(id: string): void; leave(): void },
): void {
  labHash = lab;
  started = true;
  const apply = (r: Route, initial: boolean) => {
    current = r;
    writeJson(ROUTE_KEY, location.hash.startsWith(LEARN_PLAY) ? 'practice' : r); // never reopen a domain's workspace for General work; a drill's own hash reopens it
    show(r, initial);
  };
  /** An old hash (#/play, #/data/<t>, #/dashboard: bookmarks, shared links) or a workspace alias becomes the new one in place, no extra history entry. */
  const upgrade = (): void => {
    const c = workspaceHash(canonicalHash(location.hash), labHash());
    if (c !== location.hash) history.replaceState(history.state, '', c);
  };
  upgrade();
  const first = initialRoute(location.hash, readJson<unknown>(ROUTE_KEY));
  // No extra history entry for the redirect; a hash that already names the route keeps its tail (#/d/logistics/data/ports).
  if (parseRoute(location.hash) !== first) history.replaceState(history.state, '', hashOf(first));
  apply(first, true);
  window.addEventListener('hashchange', () => {
    // FIX-1 (L147): Back/Forward to another drill or question opens it; to a domain's workspace leaves the General work.
    const nav = generalNav(canonicalHash(location.hash), labHash());
    if (nav === 'leave') general.leave();
    else if (nav) general.open(nav.open);
    upgrade();
    apply(parseRoute(location.hash) ?? 'home', false);
  });
}
