import type { Drill } from './general';
import type { Ticket } from './tickets';
import { variantsOf } from './variants';

export interface Card { box: number; due: string }
export type Review = Record<string, Card>;
/** Practice totals (display only): `solved` = passed, `weak` = correct but after a wrong submit or 2+ hints (not a Leitner pass). */
export interface PracticeStats { solved: number; weak: number }
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

/** The card was moved (or seeded) today: its due date is exactly one interval after today. */
export const movedToday = (card: Card | undefined, today: string): boolean =>
  !!card && card.due === addDays(today, INTERVALS[card.box - 1]);

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

/** Skills a ticket practises: the ones it needs plus the ones it teaches (ch1-03 covers all four ch1 skills). */
const covers = (t: Ticket): string[] => [...t.requires, ...t.grants];
const practicePool = (templates: Ticket[], completed: Set<string>): Ticket[] =>
  templates.filter((t) => completed.has(t.id) && t.beat !== 'boss');

export function pickForSkill(skill: string, templates: Ticket[], completed: Set<string>, rnd: () => number): PracticeItem | undefined {
  const pool = practicePool(templates, completed).filter((t) => covers(t).includes(skill));
  const withVariants = pool.filter((t) => variantsOf(t).length >= 2);
  const from = withVariants.length ? withVariants : pool;
  if (from.length === 0) return undefined;
  const t = from[Math.floor(rnd() * from.length)];
  return { ticketId: t.id, variant: variantFor(t, rnd), skills: [skill] };
}

/**
 * Today's review (L37): one item per ticket, carrying every still-uncovered due skill it practises, so a session never
 * repeats a (ticket, variant). Ticket choice depends only on the data and `today` (most uncovered due skills, then has variants,
 * ties rotating by day); `rnd` only picks the variant, so `.length` is the "Review: N" count whatever `rnd` is.
 */
export function reviewQueue(
  review: Review, learned: Iterable<string>, templates: Ticket[], completed: Set<string>, today: string, rnd: () => number,
  drills?: ReadonlyMap<string, readonly Drill[]>, seen: ReadonlySet<string> = new Set(),
): PracticeItem[] {
  if (drills) {
    // Plan 8a Task 8: one drill per due skill, so the count is min(due, QUEUE_MAX) without loading the General chunk.
    const out: PracticeItem[] = [];
    for (const skill of dueSkills(review, learned, today)) {
      if (out.length >= QUEUE_MAX) break;
      const d = pickDrill(skill, drills, seen, rnd);
      const item = d ? { ticketId: d.id, variant: 0, skills: [skill] } : pickForSkill(skill, templates, completed, rnd);
      if (item && !out.some((i) => i.ticketId === item.ticketId)) out.push(item);
    }
    return out;
  }
  const pool = practicePool(templates, completed);
  const open = new Set(dueSkills(review, learned, today));
  const dayNumber = Math.round(Date.parse(today) / 864e5); // days since epoch: consecutive days always differ by 1
  const out: PracticeItem[] = [];
  for (const skill of open) { // a Set skips entries deleted before they are reached: covered skills never start an item
    if (out.length >= QUEUE_MAX) break;
    const score = (t: Ticket): number => covers(t).filter((s) => open.has(s)).length * 2 + (variantsOf(t).length >= 2 ? 1 : 0);
    const cands = pool.filter((t) => covers(t).includes(skill) && !out.some((i) => i.ticketId === t.id));
    if (cands.length === 0) continue;
    const top = Math.max(...cands.map(score));
    const ties = cands.filter((t) => score(t) === top);
    const best = ties[dayNumber % ties.length]; // ties rotate by day, so the same skill is not always the same task
    const skills = covers(best).filter((s) => open.has(s));
    for (const s of skills) open.delete(s);
    out.push({ ticketId: best.id, variant: variantFor(best, rnd), skills });
  }
  return out;
}

const KIND_ORDER = ['open', 'trap', 'faded'] as const;
/** A drill of `skill` for a review: not reviewed yet this session (`seen`), open first, then trap, then faded; all seen → any. */
export function pickDrill(skill: string, drills: ReadonlyMap<string, readonly Drill[]>, seen: ReadonlySet<string>, rnd: () => number): Drill | undefined {
  const all = drills.get(skill) ?? [];
  const fresh = all.filter((d) => !seen.has(d.id));
  const pool = fresh.length ? fresh : all;
  for (const k of KIND_ORDER) {
    const c = pool.filter((d) => d.kind === k);
    if (c.length) return c[Math.floor(rnd() * c.length)];
  }
  return pool[0];
}

export const WARMUP_SIZE = 3;

/**
 * Chapter warm-up (curriculum §5.2): when chapter `chapter` ≥ 2 starts, up to WARMUP_SIZE items on skills of earlier
 * chapters: lowest Leitner box first, then earliest due, then id. One item per skill, never the same ticket twice.
 * Leitner runs on the calendar, so a player who clears three chapters in one sitting still gets a recall step at each start.
 */
export function warmupQueue(
  review: Review, learned: Iterable<string>, templates: Ticket[], completed: Set<string>, chapter: number, today: string, rnd: () => number,
): PracticeItem[] {
  const chapterOf = new Map(templates.flatMap((t) => t.grants.map((s) => [s, t.chapter] as const)));
  const card = (s: string): Card => cardOf(review, s, today);
  const skills = [...learned]
    .filter((s) => (chapterOf.get(s) ?? chapter) < chapter)
    .sort((a, b) => card(a).box - card(b).box || card(a).due.localeCompare(card(b).due) || a.localeCompare(b));
  const pool = practicePool(templates, completed);
  const out: PracticeItem[] = [];
  for (const skill of skills) {
    if (out.length >= WARMUP_SIZE) break;
    const cands = pool.filter((t) => covers(t).includes(skill) && !out.some((i) => i.ticketId === t.id));
    const withVariants = cands.filter((t) => variantsOf(t).length >= 2);
    const from = withVariants.length ? withVariants : cands;
    if (from.length === 0) continue;
    const t = from[Math.floor(rnd() * from.length)];
    out.push({ ticketId: t.id, variant: variantFor(t, rnd), skills: [skill] });
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
      weak: state.practice.weak + (success ? 0 : 1),
    },
  };
}
