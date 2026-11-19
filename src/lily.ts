import { readJson, writeJson, type KV } from './storage';

/**
 * Lily grows with the player (L87, L132 = docs/team/lily-growth.md P1). Pure: no DOM. Stage by learned skills (`knownSkills()` of
 * src/home.ts, General = Logistics): 0 newborn (0), 1 puppy (1–2), 2 young pup (3–9), 3 grown-up (10–17), 4 seasoned (18–24),
 * 5 expert (25+ or every skill). The old thresholds 3/10/25 are kept, so nobody's stage name drops on the update (k = 0 aside).
 */
export type LilyStage = 0 | 1 | 2 | 3 | 4 | 5;
export const STAGE_AT = [0, 1, 3, 10, 18, 25] as const;
export const LAST_STAGE = 5;

export function lilyStage(known: number, total: number): LilyStage {
  if (known >= STAGE_AT[LAST_STAGE] || (total > 0 && known >= total)) return LAST_STAGE;
  let s = 0;
  while (known >= STAGE_AT[s + 1]) s++;
  return s as LilyStage;
}

/** Skills still to learn before the next stage; undefined at the last stage. */
export function toNextStage(known: number, total: number): number | undefined {
  const s = lilyStage(known, total);
  if (s === LAST_STAGE) return undefined;
  const need = STAGE_AT[s + 1] - known;
  return total > 0 ? Math.min(need, total - known) : need;
}

/**
 * Lily's look per stage: one value per CSS variable `--lily-<key>` (style.css repeats this table per stage, tests/mascots.test.ts
 * compares them; the sprite parts read the variables through <use>). size = whole figure around her feet; head = head scale
 * around the neck (60 72); lift = units the body, legs and head rise (longer legs); paw, ears (+ ear-tilt in degrees, outward),
 * tail, chest (body width); spot1..3 = the three tiers of spots; shut = eyes closed (newborn); *-on = accessories.
 */
export const LOOK = [
  { size: 0.8, head: 1, lift: 0, paw: 0.85, ears: 0.75, 'ear-tilt': 0, tail: 0.55, chest: 0.92, spot1: 0, spot2: 0, spot3: 0, shut: 1, 'collar-on': 0, 'scarf-on': 0, 'badge-on': 0, 'harness-on': 0, 'prop-on': 0 },
  { size: 0.84, head: 1, lift: 1, paw: 1, ears: 1.15, 'ear-tilt': 8, tail: 0.75, chest: 0.95, spot1: 0.5, spot2: 0, spot3: 0, shut: 0, 'collar-on': 1, 'scarf-on': 0, 'badge-on': 0, 'harness-on': 0, 'prop-on': 0 },
  { size: 0.92, head: 0.96, lift: 6, paw: 1.2, ears: 1.1, 'ear-tilt': 4, tail: 1, chest: 0.92, spot1: 1, spot2: 0, spot3: 0, shut: 0, 'collar-on': 0, 'scarf-on': 1, 'badge-on': 0, 'harness-on': 0, 'prop-on': 0 },
  { size: 1, head: 0.92, lift: 5, paw: 1, ears: 1, 'ear-tilt': 0, tail: 1.05, chest: 1, spot1: 1, spot2: 1, spot3: 0, shut: 0, 'collar-on': 0, 'scarf-on': 1, 'badge-on': 1, 'harness-on': 0, 'prop-on': 0 },
  { size: 1.05, head: 0.9, lift: 6, paw: 1.05, ears: 0.95, 'ear-tilt': -3, tail: 1.15, chest: 1.06, spot1: 1, spot2: 1, spot3: 1, shut: 0, 'collar-on': 0, 'scarf-on': 1, 'badge-on': 1, 'harness-on': 1, 'prop-on': 0 },
  { size: 1.08, head: 0.9, lift: 6, paw: 1.05, ears: 0.95, 'ear-tilt': -3, tail: 1.15, chest: 1.06, spot1: 1, spot2: 1, spot3: 1, shut: 0, 'collar-on': 0, 'scarf-on': 1, 'badge-on': 1, 'harness-on': 1, 'prop-on': 1 },
] as const satisfies readonly Record<string, number>[];
export type LookVar = keyof (typeof LOOK)[number];

/** A stage from `<html data-lily>` or an instance's `data-stage`; anything else reads as the default look (grown-up, 3). */
export const stageOf = (raw: string | undefined): LilyStage => {
  const n = Number(raw ?? NaN);
  return Number.isInteger(n) && n >= 0 && n <= LAST_STAGE ? n as LilyStage : 3;
};

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
