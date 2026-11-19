import type { History } from './history';
import { TOUR_STEPS, type TourPref } from './onboarding';
import { addDays, INTERVALS, localDay, type Review } from './practice';
import { readJson, writeJson, type KV } from './storage';

/**
 * V22-C (L208): coming back with a reason, never a streak. Pure: the week, its count, the welcome-back gap and today's session
 * plan. The goal is a device pref (never the Save); "this week" is derived each time, nothing is stored. A missed week leaves no trace.
 */
export const GOAL_KEY = 'cargo-query/goal';
export const PER_WEEK = [3, 5, 10] as const;
export type PerWeek = (typeof PER_WEEK)[number];
/** perWeek undefined = no goal (the default). weekday 0 = Sunday (Date.getDay). */
export interface Goal { perWeek?: PerWeek; remindAt?: string; weekday?: number }

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Never throws: a bad field is dropped, anything else reads as "no goal". */
export function parseGoal(raw: unknown): Goal {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const g = raw as Record<string, unknown>;
  const out: Goal = {};
  if (PER_WEEK.includes(g.perWeek as PerWeek)) out.perWeek = g.perWeek as PerWeek;
  if (typeof g.remindAt === 'string' && HHMM.test(g.remindAt)) out.remindAt = g.remindAt;
  if (typeof g.weekday === 'number' && Number.isInteger(g.weekday) && g.weekday >= 0 && g.weekday <= 6) out.weekday = g.weekday;
  return out;
}
export const readGoal = (storage?: KV): Goal => parseGoal(readJson<unknown>(GOAL_KEY, storage));
export const writeGoal = (g: Goal, storage?: KV): boolean => writeJson(GOAL_KEY, parseGoal(g), storage);

/** Monday of the week holding `day` (YYYY-MM-DD, the machine's local calendar), across month and year ends. */
export function weekStart(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return addDays(day, -((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7));
}

/**
 * Tasks and reviews done this week (Monday..today), derived: the Save has no dates. A task counts when it is completed and its
 * oldest kept history entry (cargo-query/history) is this week, i.e. it was first opened this week; a review counts when its
 * Leitner card was raised this week (box >= 2, raised on due minus its interval). Drills count through their skill's card only.
 * ponytail: errs low (a task first opened last week and passed this week is not counted); a dated log would be a Save change.
 */
export function weekCount(p: { completed: readonly string[]; lanes: readonly string[]; history: History; review: Review; today: string }): { tasks: number; reviews: number } {
  const from = weekStart(p.today);
  const inWeek = (day: string): boolean => day >= from && day <= p.today;
  const tasks = [...p.completed.filter((id) => !id.startsWith('g-')), ...p.lanes].filter((id) => {
    const at = p.history[id]?.map((e) => e.at);
    return !!at?.length && inWeek(localDay(new Date(Math.min(...at))));
  }).length;
  const reviews = Object.values(p.review).filter((c) => c.box >= 2 && c.box <= INTERVALS.length && inWeek(addDays(c.due, -INTERVALS[c.box - 1]))).length;
  return { tasks, reviews };
}

export const AWAY_DAYS = 7;
/** Days since the last learning day before today (cargo-query/days, sorted) when that is >= AWAY_DAYS, else undefined. */
export function awayDays(days: readonly string[], today: string): number | undefined {
  const last = days.filter((d) => d < today).at(-1);
  if (!last) return undefined;
  const gap = Math.round((Date.parse(`${today}T00:00Z`) - Date.parse(`${last}T00:00Z`)) / 86_400_000);
  return gap >= AWAY_DAYS ? gap : undefined;
}

/** The session card waits for the tour: a new player's Home has one call to action (review-v21 ONB), the tour's next task. */
export const showsSession = (completed: number, tour: TourPref | undefined, coachSkipped: boolean): boolean =>
  completed > 0 && (coachSkipped || !tour || tour.knows || tour.step >= TOUR_STEPS);

export type SessionItem =
  | { kind: 'warmup' | 'review'; n: number; min: number }
  | { kind: 'next'; min: number }
  | { kind: 'skill'; skill: string; min: number };
export const NEXT_MIN = 10;
export const DRILL_MIN = 3;
/** ~1.5 min per short review item (3 items ≈ 5 min), at least 2. */
const reviewMin = (n: number): number => Math.max(2, Math.round(n * 1.5));

/** Today's session, in order: warm-up, due reviews, the next task, else the weakest learned skill. Only things that already exist. */
export function sessionPlan(p: { warmup: number; due: number; next: boolean; weakest?: string }): SessionItem[] {
  const out: SessionItem[] = [];
  if (p.warmup) out.push({ kind: 'warmup', n: p.warmup, min: reviewMin(p.warmup) });
  if (p.due) out.push({ kind: 'review', n: p.due, min: reviewMin(p.due) });
  if (p.next) out.push({ kind: 'next', min: NEXT_MIN });
  if (!p.due && p.weakest) out.push({ kind: 'skill', skill: p.weakest, min: DRILL_MIN });
  return out;
}
