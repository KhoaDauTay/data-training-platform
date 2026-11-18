import type { AdvNode, Drill, General } from './general';
import type { Skill } from './progress';
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
 * drawn: a skill learned since the baseline stamps and is marked seen there (so the overview does not use it up), and keeps
 * its stamp for `win` ms, so a rerender right after (language switch, seed done) does not cut the animation.
 */
export function stamper(win = 600, now = (): number => performance.now()) {
  let token: object | undefined;
  let seen = new Set<string>();
  const at = new Map<string, number>();
  return {
    base(t: object, known: Iterable<string>): void {
      if (t !== token) { token = t; seen = new Set(known); at.clear(); }
    },
    stamp(id: string, learned: boolean): boolean {
      if (!learned) return false;
      if (!seen.has(id)) { seen.add(id); at.set(id, now()); return true; }
      const t0 = at.get(id);
      return t0 !== undefined && now() - t0 < win;
    },
  };
}
