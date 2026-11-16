/** Hash routes without a framework. Practice and Sandbox (Plan 1c) are modes inside 'play', not routes. */
export const ROUTES = ['home', 'play'] as const;
export type Route = (typeof ROUTES)[number];

/** Last route shown: a device convenience, never part of Save. */
export const ROUTE_KEY = 'cargo-query/route';

const HASH: Record<Route, string> = { home: '#/', play: '#/play' };
export const hashOf = (r: Route): string => HASH[r];
export const isRoute = (v: unknown): v is Route => ROUTES.includes(v as Route);

/** '' (no hash) → undefined, so the remembered route can be used; any unknown path falls back to home. */
export function parseRoute(hash: string): Route | undefined {
  if (hash === '') return undefined;
  const path = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return isRoute(path) ? path : 'home';
}

export function initialRoute(hash: string, saved: unknown): Route {
  return parseRoute(hash) ?? (isRoute(saved) ? saved : 'home');
}
