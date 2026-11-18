import { readJson, writeJson, type KV } from './storage';

/**
 * Lily grows with the player (L87). Pure: no DOM. Stage by learned skills (`knownSkills()` of src/home.ts, General = Logistics):
 * 0 puppy (0–2), 1 young pup (3–9: scarf), 2 grown-up (10–24: scarf + star badge), 3 expert (25+ or every skill: + laptop).
 */
export type LilyStage = 0 | 1 | 2 | 3;
export const STAGE_AT = [0, 3, 10, 25] as const;

export function lilyStage(known: number, total: number): LilyStage {
  if (known >= STAGE_AT[3] || (total > 0 && known >= total)) return 3;
  return known >= STAGE_AT[2] ? 2 : known >= STAGE_AT[1] ? 1 : 0;
}

/** Skills still to learn before the next stage; undefined at the last stage. */
export function toNextStage(known: number, total: number): number | undefined {
  const s = lilyStage(known, total);
  if (s === 3) return undefined;
  const need = STAGE_AT[s + 1] - known;
  return total > 0 ? Math.min(need, total - known) : need;
}

/** Device pref (never in the Save): distinct local days (`YYYY-MM-DD`, localDay of src/practice.ts) with a save write. */
export const DAYS_KEY = 'cargo-query/days';
export const DAYS_MAX = 366;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Anything stored is checked: only day strings, no duplicates, sorted, the last DAYS_MAX. Bad data reads as []. */
export function parseDays(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const days = [...new Set(raw.filter((d): d is string => typeof d === 'string' && DAY.test(d)))].sort();
  return days.slice(-DAYS_MAX);
}

export const withDay = (days: string[], day: string): string[] => (days.includes(day) ? days : parseDays([...days, day]));

let marked: string | undefined;
/** Called on every save write (state.ts persist): writes at most once per day per page load. True = a new day was just written (ui-ux-v5 C2). */
export function markDay(day: string, storage?: KV): boolean {
  if (marked === day) return false;
  marked = day;
  const days = parseDays(readJson<unknown>(DAYS_KEY, storage));
  if (days.includes(day)) return false;
  writeJson(DAYS_KEY, withDay(days, day), storage);
  return true;
}

/** "Day N with Lily": 1 on the first day, before anything was saved. */
export const dayCount = (storage?: KV): number => Math.max(1, parseDays(readJson<unknown>(DAYS_KEY, storage)).length);
