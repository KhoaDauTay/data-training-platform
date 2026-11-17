import type { Key } from './i18n';
import { localStore, readJson, writeJson, type KV } from './storage';

/** Device pref (v4 §B.4, D-F1): the highest tour step passed and the welcome screen's "I already know SQL". Never in Save or Export. */
export const TOUR_KEY = 'cargo-query/tour';
export interface TourPref { step: number; knows: boolean }
export const TOUR_STEPS = 8;

/** Stored data is user-editable: a non-object is "no pref"; a bad step reads as 0, anything but `true` as "does not know SQL". */
export function parseTour(v: unknown): TourPref | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  const step = typeof o.step === 'number' && Number.isInteger(o.step) ? Math.min(TOUR_STEPS, Math.max(0, o.step)) : 0;
  return { step, knows: o.knows === true };
}
export const readTour = (storage: KV | undefined = localStore()): TourPref | undefined => parseTour(readJson<unknown>(TOUR_KEY, storage));

/** The welcome screen's choice: a beginner starts at step 0; "I know SQL" skips the tour and the progressive disclosure (V9). */
export const startTour = (knows: boolean, storage?: KV): boolean => writeJson(TOUR_KEY, { step: knows ? TOUR_STEPS : 0, knows }, storage);

/** Steps only move forward. No pref (an old player) = nothing to record. A failed write only shows a step again later. */
export function ackTour(step: number, storage?: KV): void {
  const now = readTour(storage);
  if (now && step > now.step) writeJson(TOUR_KEY, { ...now, step: Math.min(TOUR_STEPS, step) }, storage);
}

/** Welcome screen (v4 §B.2 layer 1): new players only; never an old save (v4 §F.2) or someone who skipped the old coach marks. */
export const welcomeNeeded = (completed: number, tour: TourPref | undefined, coachSkipped: boolean): boolean =>
  completed === 0 && tour === undefined && !coachSkipped;

/** Progressive disclosure (v4 §B.2 layer 3) only for players who started on the welcome screen as beginners (V9). */
export const gated = (tour: TourPref | undefined): boolean => tour !== undefined && !tour.knows;

/** What the player has done on ticket 1; the tour step is derived from it (v4: "the tour jumps to the matching step"). */
export interface TourFacts {
  onFirst: boolean;
  /** "Skip the tour" or Esc: cargo-query/coach-done. */
  skipped: boolean;
  tour?: TourPref;
  ran: boolean;
  exampleRan: boolean;
  columnsSeen: boolean;
  /** The last run has as many columns as the Expected result card. */
  shapeOk: boolean;
  solved: boolean;
}
export type TourSlot = 'brief' | 'work' | 'panel' | 'lesson' | 'recap';
/** Where each step's mark sits: inside its region, never floating over the editor or the results (v4 §B.2, v6 §1.4). */
export const TOUR_SLOT: Record<number, TourSlot> = { 1: 'brief', 2: 'work', 3: 'panel', 4: 'lesson', 5: 'panel', 6: 'work', 7: 'work', 8: 'recap' };

/** v4 §B.2 layer 2. Steps 1, 3 and 8 wait for a button; the others for what the player does. */
export function tourStep(f: TourFacts): number | undefined {
  const tour = f.tour;
  if (!f.onFirst || f.skipped || !tour || tour.knows || tour.step >= TOUR_STEPS) return undefined;
  if (f.solved) return 8;
  const passed = [true, false, f.ran, false, f.exampleRan, f.columnsSeen, f.shapeOk, f.solved];
  for (let n = 1; n <= 7; n++) if (tour.step < n && !passed[n]) return n;
  return 7;
}

/** What Esc sees when the tour might take it (coach.ts initTour). */
export interface EscScene {
  /** A tour mark is on screen: in the visible workspace and laid out (not in a hidden view). */
  markVisible: boolean;
  /** Something else closes on this Esc: a modal, the completion dock, a popover, the notebook, or CodeMirror (focus in the editor). */
  owned: boolean;
}
/** Esc skips the tour only when the player can see Boon's mark and nothing else is closing on that key (code review v10 #1). */
export const tourEscSkips = (s: EscScene): boolean => s.markVisible && !s.owned;

/** v4 D-O3 with V9: day-one items show a lock and why, never hidden. `order` = story ticket ids. */
export function navLock(id: string, completed: ReadonlySet<string>, order: readonly string[], isGated: boolean): Key | undefined {
  if (!isGated) return undefined;
  if ((id === 'sandbox' || id === 'data') && !completed.has(order[0])) return 'lock.afterTask1';
  if (id === 'dashboard' && !completed.has(order[1])) return 'lock.afterTask2';
  return undefined;
}

/** v4 D-O4: a tab with `from` appears once that ticket is reached (done, or the next one to do). */
export const tabOpen = (from: string | undefined, reached: ReadonlySet<string>, isGated: boolean): boolean =>
  !isGated || !from || reached.has(from);
