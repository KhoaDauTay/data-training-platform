import { chapterTablesOf, xpFor } from './progress';
import type { Save } from './save';
import { t } from './i18n';
import { textOf, type Lang, type Ticket } from './tickets';

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
    // L145: a passed review stands for the chapter, so its skills count also when its tasks were skipped.
    skills: (done.some((t) => t.beat === 'boss') ? tickets.filter((t) => t.chapter === chapter) : done).flatMap((t) => t.grants),
    newTables: chapterTablesOf()[chapter + 1] ?? [],
  };
}

export const grantedBy = (tickets: Ticket[], skill: string): Ticket | undefined => tickets.find((t) => t.grants.includes(skill));
/**
 * v15 Q4: the Notebook's line under a skill not learned yet: the title of the open domain's task that teaches it, never its
 * id; the learning path when that domain teaches no such task or the Notebook is open outside a domain (General pages).
 */
export function unlockNote(tickets: Ticket[], skill: string, lang: Lang, inDomain: boolean): string {
  const tk = inDomain ? grantedBy(tickets, skill) : undefined;
  return tk ? t('nb.unlockAt', { title: textOf(tk, lang).title }) : t('nb.unlockPath');
}

/** Promotion-review step to reopen at (save.bossStep), clamped; 0 for normal or completed tickets. */
export function resumeStep(save: Save, t: Ticket | undefined): number {
  if (!t || save.completed.includes(t.id)) return 0;
  return Math.min(Math.max(save.bossStep[t.id] ?? 0, 0), t.steps.length - 1);
}
