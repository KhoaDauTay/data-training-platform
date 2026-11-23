import { ROUTES } from './scene';
import { readJson, writeJson, type KV } from './storage';

/** Device pref (never in Save): lanes this device has already seen open, so a newly opened lane draws itself in once (Plan 8b D8b-5). */
export const ROUTES_SEEN_KEY = 'cargo-query/routes-seen';

/** Port codes of ROUTES only; anything else in storage is dropped. */
export function readSeen(kv?: KV): string[] {
  const v = readJson<unknown>(ROUTES_SEEN_KEY, kv);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && ROUTES.some((r) => r.port === x)) : [];
}
export const writeSeen = (ports: string[], kv?: KV): boolean => writeJson(ROUTES_SEEN_KEY, ports, kv);

/**
 * `draw`: open lanes this device has not seen open yet. The first visit (nothing stored) draws nothing and remembers
 * every open lane, so a returning player never sees the whole map draw itself in.
 */
export function diffSeen(seen: string[], open: Iterable<string>): { draw: string[]; next: string[] } {
  const now = [...open];
  if (!seen.length) return { draw: [], next: now };
  return { draw: now.filter((p) => !seen.includes(p)), next: [...new Set([...seen, ...now])] };
}

/** The lanes to draw in now, recorded as seen. */
export function takeNewRoutes(open: Iterable<string>, kv?: KV): string[] {
  const { draw, next } = diffSeen(readSeen(kv), open);
  writeSeen(next, kv);
  return draw;
}

/** Ports by the chapter that opens them, latest first: the fleet sails the most recently opened lanes (D8b-3). */
export const fleetOrder = (): string[] => ROUTES.toSorted((a, b) => b.opens - a.opens).map((r) => r.port);
