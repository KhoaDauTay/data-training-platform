import type { AdvNode, Drill, General } from './general';
import type { Skill } from './progress';
import type { Save } from './save';
import type { Ticket } from './tickets';

/**
 * Progress of the General area (Plan 8a Task 6): pure, no DOM. Drill ids live in save.completed (D8a-9); nothing new is saved.
 * Named knownSkills (not learnedSkills): src/home.ts learnedSkills (tickets only) feeds the review queue and stays as it is.
 * Imports no value from a main-bundle module (the lazy General UI uses it, Plan 6 U3): skills come in as arguments.
 */

/** A skill counts as mastered from this Leitner box (v5 §B.8). */
export const MASTERED_BOX = 4;
export const DRILL_XP = 10;
export const CHALLENGE_XP = 20;

/**
 * The skill of a skill drill, read from its id alone (no General chunk needed): `g-conditional-agg-3` → `conditional_agg`.
 * Undefined for a node drill (`g-a1-2`) or anything that is not a known skill.
 */
export function skillOfDrill(id: string, skillIds: readonly string[]): string | undefined {
  const m = /^g-([a-z0-9-]+)-\d+$/.exec(id);
  const skill = m?.[1].replace(/-/g, '_');
  return skill && skillIds.includes(skill) ? skill : undefined;
}

/**
 * "Learned" (D8a-11): a completed ticket grants it, or ≥ 2 of its drills passed, or it has a review card.
 * One definition for the learning path, the "Relies on" line and Home.
 */
export function knownSkills(save: Save, tickets: Ticket[], skillIds: readonly string[]): Set<string> {
  const done = new Set(save.completed);
  const out = new Set<string>();
  for (const t of tickets) if (done.has(t.id)) for (const s of t.grants) out.add(s);
  const drills = new Map<string, number>();
  for (const id of save.completed) {
    const s = skillOfDrill(id, skillIds);
    if (s) drills.set(s, (drills.get(s) ?? 0) + 1);
  }
  for (const [s, n] of drills) if (n >= 2) out.add(s);
  for (const s of Object.keys(save.review)) if (skillIds.includes(s)) out.add(s);
  return out;
}

export interface LearnCtx { save: Save; tickets: Ticket[]; skills: readonly Skill[]; general: General; /** Lessons seen (cargo-query/lessons pref). */ seen: readonly string[] }
const known = (c: LearnCtx): Set<string> => knownSkills(c.save, c.tickets, c.skills.map((s) => s.id));

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
