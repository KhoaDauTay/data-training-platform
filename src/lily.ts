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
 * tail, chest (body width); spot1..3 = the three tiers of spots; shut = eyes closed (newborn); eye = eye scale (puppies 1.1);
 * perk = posture: units the chest and head rise above the legs (seasoned chest out; L134); *-on = accessories. lift < 0 = the
 * newborn sits flat. The muzzle needs no column: it lengthens as the head shrinks (sprite, calc on --lily-head).
 */
export const LOOK = [
  { size: 0.83, head: 1, lift: -3, paw: 0.85, ears: 0.75, 'ear-tilt': 0, tail: 0.55, chest: 0.92, spot1: 0, spot2: 0, spot3: 0, shut: 1, eye: 1.1, perk: 0, 'collar-on': 0, 'scarf-on': 0, 'badge-on': 0, 'harness-on': 0, 'prop-on': 0 },
  { size: 0.84, head: 1, lift: 1, paw: 1, ears: 1.15, 'ear-tilt': 8, tail: 0.75, chest: 0.95, spot1: 0.5, spot2: 0, spot3: 0, shut: 0, eye: 1.1, perk: 0, 'collar-on': 1, 'scarf-on': 0, 'badge-on': 0, 'harness-on': 0, 'prop-on': 0 },
  { size: 0.92, head: 0.96, lift: 8, paw: 1.25, ears: 1.1, 'ear-tilt': 4, tail: 0.9, chest: 0.86, spot1: 1, spot2: 0, spot3: 0, shut: 0, eye: 1.1, perk: 0, 'collar-on': 0, 'scarf-on': 1, 'badge-on': 0, 'harness-on': 0, 'prop-on': 0 },
  { size: 1, head: 0.92, lift: 5, paw: 1, ears: 1, 'ear-tilt': 0, tail: 1.05, chest: 1, spot1: 1, spot2: 1, spot3: 0, shut: 0, eye: 1, perk: 0, 'collar-on': 0, 'scarf-on': 1, 'badge-on': 1, 'harness-on': 0, 'prop-on': 0 },
  { size: 1.05, head: 0.88, lift: 6, paw: 1.05, ears: 0.95, 'ear-tilt': -3, tail: 1.15, chest: 1.1, spot1: 1, spot2: 1, spot3: 1, shut: 0, eye: 1, perk: 2, 'collar-on': 0, 'scarf-on': 1, 'badge-on': 1, 'harness-on': 1, 'prop-on': 0 },
  { size: 1.08, head: 0.88, lift: 6, paw: 1.05, ears: 0.95, 'ear-tilt': -3, tail: 1.2, chest: 1.12, spot1: 1, spot2: 1, spot3: 1, shut: 0, eye: 1, perk: 3, 'collar-on': 0, 'scarf-on': 1, 'badge-on': 1, 'harness-on': 1, 'prop-on': 1 },
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
/** The first day with Lily (the newborn's album date), if any day was written. */
export const firstDay = (storage?: KV): string | undefined => parseDays(readJson<unknown>(DAYS_KEY, storage))[0];

/**
 * L134 (P-L3): device pref (never in the Save, so Export/Import does not carry it): the local day each stage 1–5 was first reached
 * (growth album) and the accessory colour (1..ACC_AT.length, the --lily-acc<n> tokens of style.css; none = the default look).
 * A stage reached before the album existed, on another device or through an import has no day and reads as "earlier".
 */
export const LILY_KEY = 'cargo-query/lily';
/** The stage that unlocks each accessory colour (collar from stage 1, then one more per stage). */
export const ACC_AT = [1, 1, 2, 3, 4, 5] as const;
export type LilyPref = { at: Record<number, string>; acc?: number };

/** Anything stored is checked: day strings under keys 1–5, acc an integer in the palette. Bad parts are dropped, never thrown. */
export function parseLilyPref(raw: unknown): LilyPref {
  const obj = (x: unknown): Record<string, unknown> => (x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : {});
  const o = obj(raw);
  const src = obj(o.at);
  const at: Record<number, string> = {};
  for (let s = 1; s <= LAST_STAGE; s++) {
    const d = src[s];
    if (typeof d === 'string' && DAY.test(d)) at[s] = d;
  }
  const acc = o.acc;
  return typeof acc === 'number' && Number.isInteger(acc) && acc >= 1 && acc <= ACC_AT.length ? { at, acc } : { at };
}

export const readLily = (storage?: KV): LilyPref => parseLilyPref(readJson<unknown>(LILY_KEY, storage));
/** One read-modify-write, so writing a day never drops the colour and the other way round. */
const updateLily = (f: (p: LilyPref) => LilyPref, storage?: KV): void => {
  writeJson(LILY_KEY, f(readLily(storage)), storage);
};

/** syncLily saw her stage rise from `from` to `to`: every stage crossed gets `day`, unless it already has one (the first time counts). */
export const markStages = (from: number, to: number, day: string, storage?: KV): void =>
  updateLily((p) => {
    for (let s = Math.max(1, from + 1); s <= to; s++) p.at[s] ??= day;
    return p;
  }, storage);

export const setAcc = (acc: number | undefined, storage?: KV): void =>
  updateLily(({ at }) => (acc === undefined ? { at } : { at, acc }), storage);

/** The colour she wears at `stage`: a stored colour that stage has not unlocked (a lower save imported) reads as the default. */
export const accAt = (pref: LilyPref, stage: number): number | undefined =>
  pref.acc !== undefined && ACC_AT[pref.acc - 1] <= stage ? pref.acc : undefined;

/** The album date of `stage` while she is at `now`: undefined = not reached yet; null = reached, day unknown ("earlier"). */
export function reachedOn(pref: LilyPref, stage: number, now: number, first?: string): string | null | undefined {
  if (stage > now) return undefined;
  return (stage === 0 ? first : pref.at[stage]) ?? null;
}
