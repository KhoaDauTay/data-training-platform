import { CHAPTER_TABLES, xpFor } from './progress';
import type { Save } from './save';
import type { Ticket } from './tickets';

/** An outcome without skills (a chapter that teaches nothing new, e.g. ch12) is ticked once the whole chapter is done. */
export function outcomeDone(skills: string[], chapter: number, tickets: Ticket[], completed: Set<string>, learned: Set<string>): boolean {
  if (skills.length) return skills.every((s) => learned.has(s));
  const inChapter = tickets.filter((t) => t.chapter === chapter);
  return inChapter.length > 0 && inChapter.every((t) => completed.has(t.id));
}

export interface ChapterSummary { xp: number; hints: number; skills: string[]; newTables: string[] }

/** Recomputed from the save: XP via xpFor (never stored per chapter). */
export function chapterSummary(tickets: Ticket[], save: Save, chapter: number): ChapterSummary {
  const done = tickets.filter((t) => t.chapter === chapter && save.completed.includes(t.id));
  return {
    xp: done.reduce((sum, t) => sum + xpFor(t, save.hintsUsed[t.id] ?? 0), 0),
    hints: done.reduce((sum, t) => sum + (save.hintsUsed[t.id] ?? 0), 0),
    skills: done.flatMap((t) => t.grants),
    newTables: CHAPTER_TABLES[chapter + 1] ?? [],
  };
}

export const grantedBy = (tickets: Ticket[], skill: string): Ticket | undefined => tickets.find((t) => t.grants.includes(skill));

/** Promotion-review step to reopen at (save.bossStep), clamped; 0 for normal or completed tickets. */
export function resumeStep(save: Save, t: Ticket | undefined): number {
  if (!t || save.completed.includes(t.id)) return 0;
  return Math.min(Math.max(save.bossStep[t.id] ?? 0, 0), t.steps.length - 1);
}
