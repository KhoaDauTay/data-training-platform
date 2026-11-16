import type { Ticket } from './tickets';
import { variantsOf } from './variants';

export interface Card { box: number; due: string }
export type Review = Record<string, Card>;
export interface PracticeStats { solved: number; failed: number }
export interface PracticeItem { ticketId: string; variant: number; skills: string[] }

/** Days until the next review, indexed by box - 1 (boxes 1..5). */
export const INTERVALS = [1, 2, 4, 8, 16] as const;
export const MAX_BOX = INTERVALS.length;
export const QUEUE_MAX = 5;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Real calendar day on the player's machine. Never the in-game 2026-10-31, never used in SQL. */
export const localDay = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** A learned skill without a card (save migrated from v1) counts as box 1, due today. */
export const cardOf = (review: Review, skill: string, today: string): Card => review[skill] ?? { box: 1, due: today };

export function nextCard(card: Card | undefined, success: boolean, today: string): Card {
  const box = success ? Math.min((card?.box ?? 1) + 1, MAX_BOX) : 1;
  return { box, due: addDays(today, INTERVALS[box - 1]) };
}

/** Called after a correct submit: passed only with no wrong submit and at most one hint. */
export const isSuccess = (wrongSubmits: number, hints: number): boolean => wrongSubmits === 0 && hints <= 1;

export function seedReview(review: Review, skills: string[], today: string): Review {
  const out = { ...review };
  for (const s of skills) out[s] ??= { box: 1, due: addDays(today, INTERVALS[0]) };
  return out;
}

export function dueSkills(review: Review, learned: Iterable<string>, today: string): string[] {
  const due = (s: string): string => cardOf(review, s, today).due;
  return [...learned].filter((s) => due(s) <= today).sort((a, b) => due(a).localeCompare(due(b)) || a.localeCompare(b));
}

export function variantFor(t: Ticket, rnd: () => number): number {
  const n = variantsOf(t).length;
  return n >= 2 ? 1 + Math.floor(rnd() * (n - 1)) : 0;
}

export function pickForSkill(skill: string, templates: Ticket[], completed: Set<string>, rnd: () => number): PracticeItem | undefined {
  const pool = templates.filter(
    (t) => completed.has(t.id) && t.beat !== 'boss' && (t.grants.includes(skill) || t.requires.includes(skill)),
  );
  const withVariants = pool.filter((t) => variantsOf(t).length >= 2);
  const from = withVariants.length ? withVariants : pool;
  if (from.length === 0) return undefined;
  const t = from[Math.floor(rnd() * from.length)];
  return { ticketId: t.id, variant: variantFor(t, rnd), skills: [skill] };
}

export function todayQueue(
  review: Review, learned: Iterable<string>, templates: Ticket[], completed: Set<string>, today: string, rnd: () => number,
): PracticeItem[] {
  const out: PracticeItem[] = [];
  for (const skill of dueSkills(review, learned, today)) {
    if (out.length >= QUEUE_MAX) break;
    const item = pickForSkill(skill, templates, completed, rnd);
    if (item) out.push(item);
  }
  return out;
}

/** "Practise this task again": the skills it teaches, or (a rest ticket teaches none) the skills it needs. */
export const retryItem = (t: Ticket, rnd: () => number): PracticeItem =>
  ({ ticketId: t.id, variant: variantFor(t, rnd), skills: [...(t.grants.length ? t.grants : t.requires)] });

export function applyResult(
  state: { review: Review; practice: PracticeStats }, skills: string[], success: boolean, today: string,
): { review: Review; practice: PracticeStats } {
  const review = { ...state.review };
  for (const s of skills) review[s] = nextCard(state.review[s], success, today);
  return {
    review,
    practice: {
      solved: state.practice.solved + (success ? 1 : 0),
      failed: state.practice.failed + (success ? 0 : 1),
    },
  };
}
