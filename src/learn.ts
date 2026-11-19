import type { AdvNode, Drill, General } from './general';
import type { Skill } from './progress';
import type { PracticeItem } from './practice';
import type { Save } from './save';
import type { Ticket } from './tickets';

/**
 * Progress of the General area (Plan 8a Task 6): pure, no DOM. Drill ids live in save.completed (D8a-9); nothing new is saved.
 * Imports no value from a main-bundle module (the lazy General UI uses it, Plan 6 U3): skills come in as arguments.
 */

/** A skill counts as mastered from this Leitner box (v5 §B.8). */
export const MASTERED_BOX = 4;
export const DRILL_XP = 10;
export const CHALLENGE_XP = 20;

/** `known` = knownSkills() of src/home.ts (main bundle; this module stays lazy-only, so the caller computes it). */
export interface LearnCtx { save: Save; tickets: Ticket[]; skills: readonly Skill[]; general: General; /** Lessons seen (cargo-query/lessons pref). */ seen: readonly string[]; known: ReadonlySet<string> }
const known = (c: LearnCtx): ReadonlySet<string> => c.known;

export const drillState = (save: Save, id: string): 'todo' | 'done' => (save.completed.includes(id) ? 'done' : 'todo');

export interface SkillState { lesson: boolean; drills: number; total: number; learned: boolean; mastered: boolean }
export function skillState(c: LearnCtx, skill: string): SkillState {
  const drills = c.general.bySkill.get(skill) ?? [];
  return {
    lesson: c.seen.includes(skill),
    drills: drills.filter((d) => drillState(c.save, d.id) === 'done').length,
    total: drills.length,
    learned: known(c).has(skill),
    mastered: (c.save.review[skill]?.box ?? 0) >= MASTERED_BOX,
  };
}

/** Module n = the skills of chapter n. Done when every one is learned. */
export function moduleState(c: LearnCtx, n: number): { skills: string[]; learned: number; done: boolean } {
  const skills = c.skills.filter((s) => s.chapter === n).map((s) => s.id);
  const k = known(c);
  const learned = skills.filter((s) => k.has(s)).length;
  return { skills, learned, done: skills.length > 0 && learned === skills.length };
}

/** done: every drill and the challenge passed (an `external` node is never done); open: every need learned or done. */
export function nodeState(c: LearnCtx, node: AdvNode): { done: boolean; open: boolean; drills: number; total: number } {
  const k = known(c);
  const byId = new Map(c.general.nodes.map((n) => [n.id, n]));
  const nodeDone = (n: AdvNode): boolean => n.status !== 'external' && n.drills.every((d) => drillState(c.save, d.id) === 'done');
  const drills = node.drills.filter((d) => drillState(c.save, d.id) === 'done').length;
  return {
    done: nodeDone(node),
    open: node.needs.every((x) => k.has(x) || (byId.has(x) && nodeDone(byId.get(x)!))),
    drills,
    total: node.drills.length,
  };
}

/** Logistics chapters whose tickets require or grant `skill`, ascending. */
export function appliesIn(tickets: Ticket[], skill: string): number[] {
  return [...new Set(tickets.filter((t) => t.requires.includes(skill) || t.grants.includes(skill)).map((t) => t.chapter))].sort((a, b) => a - b);
}

/** What chapter n relies on: requires ∪ grants of its tickets, plus an optional `uses:` list (v5 §B.9; none set yet). */
export function dependsOn(tickets: Ticket[], n: number, uses: readonly string[] = []): string[] {
  return [...new Set([...tickets.filter((t) => t.chapter === n).flatMap((t) => [...t.requires, ...t.grants]), ...uses])];
}

/** D8a-10: +10 the first time a drill passes (+20 for a challenge), 0 after. */
export const drillXp = (d: Drill, firstPass: boolean): number => (firstPass ? (d.kind === 'challenge' ? CHALLENGE_XP : DRILL_XP) : 0);

/**
 * ui-ux-v5 B1: which skill icons get the one-shot stamp. `base(token, known)` runs on every learning-page draw: the first
 * draw (or a new save object, i.e. an import) only sets the baseline. `stamp(id, learned)` runs where a skill's block is
 * drawn: a skill learned since the baseline stamps once and is marked seen there (so the overview does not use it up);
 * any later redraw (language switch, seed done) draws it without the stamp.
 */
export function stamper() {
  let token: object | undefined;
  let seen = new Set<string>();
  return {
    base(t: object, known: Iterable<string>): void {
      if (t !== token) { token = t; seen = new Set(known); }
    },
    stamp(id: string, learned: boolean): boolean {
      if (!learned || seen.has(id)) return false;
      seen.add(id);
      return true;
    },
    /** v6 S4: like stamp() without using it up (a page entry draws twice); spend() once the animation really starts. */
    fresh: (id: string, learned: boolean): boolean => learned && !seen.has(id),
    spend(id: string): void { seen.add(id); },
  };
}

/**
 * v17 I4 (L145): the General entry check. One `open` drill per module (Phần n = the skills of chapter n) not learned yet:
 * the drill of the module's last skill (skills.yml order) that has one. Passing it (the practice rule `isSuccess`) seeds a
 * review card for every skill of the module, so they count as learned (D8a-11) and come back in the review; a weak pass
 * or a skipped item writes nothing. 0 XP, nothing in `completed`.
 */
export function placementItems(skills: readonly Skill[], general: General, known: ReadonlySet<string>): PracticeItem[] {
  const modules = [...new Set(skills.map((s) => s.chapter))].sort((a, b) => a - b);
  return modules.flatMap((n) => {
    const own = skills.filter((s) => s.chapter === n).map((s) => s.id);
    if (own.every((s) => known.has(s))) return [];
    const drill = [...own].reverse().map((s) => general.bySkill.get(s)?.find((d) => d.kind === 'open')).find((d) => d);
    return drill ? [{ ticketId: drill.id, variant: 0, skills: own }] : [];
  });
}
