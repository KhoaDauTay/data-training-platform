import { knownSkills } from './home';
import { addDays, INTERVALS, type Card } from './practice';
import type { Drill } from './general';
import type { Save } from './save';
import type { Ticket } from './tickets';

/**
 * v24 R0 (product-route-v24 §1.7, L323, L330–L334): the skill map and badges that replaced the certificates. Pure and in
 * main (the `meView` and `learnui` chunks get it through MeDeps/DrillDeps). Everything is derived from the Save and the
 * content on every draw: no Save field, no clock (callers pass `today`, the machine's local day like Leitner), no text
 * (codes only; the words live in i18n/me.ts and i18n/learn.ts). "Self-measured, not verified".
 */

export type Level = 0 | 1 | 2 | 3 | 4;
/** A skill drill's kind from its id suffix (4 drills per skill, sql.yml: -1 faded, -2 open, -3 trap, -4 review). */
export const DRILL_KINDS = ['faded', 'open', 'trap', 'review'] as const;
export type DrillKind = (typeof DRILL_KINDS)[number];
/** The one thing that raises the level (or brings it back): a code, worded by the page. */
export type Next = 'overdue' | 'drill' | 'second' | 'trap' | 'review' | 'allDrills' | 'perf';

export interface SkillLevel {
  id: string;
  /** The level the evidence reaches; `base ≥ 2` is exactly `knownSkills` (the ✓, Lily and the learning path keep it). */
  base: Level;
  /** What the page shows: `base − 1` while `review` (L331). */
  level: Level;
  /** "Cần ôn": the review card is overdue by more than its box's interval. */
  review: boolean;
  drills: Set<DrillKind>;
  card?: Card;
  next?: Next;
}

const drillId = (skill: string, i: number): string => `g-${skill.replace(/_/g, '-')}-${i + 1}`;

/** Overdue by more than one interval of its box: `today − due > INTERVALS[box − 1]` (real local days, like Leitner). */
export const overdue = (card: Card | undefined, today: string): boolean =>
  !!card && today > addDays(card.due, INTERVALS[Math.min(Math.max(card.box, 1), INTERVALS.length) - 1]);

/**
 * Level 0–4 per skill (§1.7). `tickets`: the content `knownSkills` reads on the same page (the learning path's Logistics,
 * L332); `perf`: drill ids with a performance bar (Part 11, R2; empty until then, so level 4 needs no perf drill yet).
 */
export function masteryOf(save: Pick<Save, 'completed' | 'review'>, tickets: Ticket[], skillIds: readonly string[], today: string, perf: readonly string[] = []): Map<string, SkillLevel> {
  const done = new Set(save.completed);
  const known = knownSkills(save as Save, tickets, skillIds);
  const used = new Set(tickets.filter((t) => done.has(t.id)).flatMap((t) => [...t.requires, ...t.grants]));
  return new Map(skillIds.map((id) => {
    const drills = new Set(DRILL_KINDS.filter((_, i) => done.has(drillId(id, i))));
    const card = save.review[id];
    const box = card?.box ?? 0;
    const prefix = `g-${id.replace(/_/g, '-')}-`;
    const fast = perf.filter((p) => p.startsWith(prefix)).every((p) => done.has(p));
    let base: Level = known.has(id) ? 2 : drills.size || used.has(id) ? 1 : 0;
    if (base === 2 && drills.has('trap') && box >= 3) base = 3;
    if (base === 3 && drills.size === DRILL_KINDS.length && box >= 4 && fast) base = 4;
    const review = base > 0 && overdue(card, today);
    const level = (review ? base - 1 : base) as Level;
    const next: Next | undefined = review ? 'overdue'
      : base === 0 ? 'drill'
        : base === 1 ? 'second'
          : base === 2 ? (drills.has('trap') ? 'review' : 'trap')
            : base === 3 ? (drills.size < DRILL_KINDS.length ? 'allDrills' : box < 4 ? 'review' : 'perf')
              : undefined;
    return [id, { id, base, level, review, drills, ...(card ? { card } : {}), ...(next ? { next } : {}) }];
  }));
}

/**
 * Parts grouped by `skills.yml` `chapter:` (the pre-route source, kept for tests). The skill map and the Part badges read
 * `content/general/route.yml` (`PARTS`, src/progress.ts) since the v24 integration (L330).
 */
export function skillParts(skills: readonly { id: string; chapter: number }[]): { n: number; skills: string[] }[] {
  const by = new Map<number, string[]>();
  for (const s of skills) by.set(s.chapter, [...(by.get(s.chapter) ?? []), s.id]);
  return [...by].sort((a, b) => a[0] - b[0]).map(([n, ids]) => ({ n, skills: ids }));
}

/** The route Part whose performance-bar drills earn "Đúng và nhanh" (L324: Part 11, Indexes and performance). */
export const FAST_PART = 11;
/** Drill ids with a `perf:` bar, optionally only those on `skills` (a Part's skills from route.yml). */
export const perfDrills = (drills: readonly Pick<Drill, 'id' | 'skill' | 'perf'>[], skills?: readonly string[]): string[] =>
  drills.filter((x) => x.perf && (!skills || (x.skill !== undefined && skills.includes(x.skill)))).map((x) => x.id);

// ---------- Database Engine: per module, never decays (no review schedule) ----------

export interface EngineLevel { level: string; k: number; n: number; started: boolean; done: boolean }
/** Per level: modules whose every lesson is in `completed` (the engine pages' rule) out of the level's modules. */
export function engineLevels(tree: { levels: readonly { level: string; modules: readonly { lessons: readonly { id: string }[] }[] }[] }, done: ReadonlySet<string>): EngineLevel[] {
  return tree.levels.map((lv) => {
    const k = lv.modules.filter((m) => m.lessons.every((l) => done.has(l.id))).length;
    const n = lv.modules.length;
    return { level: lv.level, k, n, started: lv.modules.some((m) => m.lessons.some((l) => done.has(l.id))), done: n > 0 && k === n };
  });
}

// ---------- badges: readable conditions, recomputed on every draw, lost and won back (L333) ----------

/** Fixed order; an engine with no content yet (design, L322) keeps its five badges, never held. */
export const BADGE_ENGINES = ['postgres', 'mongodb', 'dynamodb', 'redis', 'design', 'stack', 'olap', 'graph'] as const; // v47 (L1085): + graph
export const ENGINE_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
/** v45 (L745): the levels an engine has badges for; the data stack has three, Redis R1 two (v47 L956): no badge nobody can hold. */
export const levelsOf = (e: string): readonly string[] => (e === 'stack' || e === 'olap' ? ENGINE_LEVELS.slice(0, 3) : e === 'redis' || e === 'graph' ? ENGINE_LEVELS.slice(0, 2) : ENGINE_LEVELS);

export type Badge =
  | { kind: 'part'; id: string; have: boolean; n: number }
  | { kind: 'fast' | 'foundation' | 'path'; id: string; have: boolean }
  | { kind: 'engine'; id: string; have: boolean; engine: string; level: string }
  | { kind: 'domain'; id: string; have: boolean; domain: string };

export interface BadgeInput {
  parts: { n: number; skills: string[] }[];
  levels: Map<string, SkillLevel>;
  /** The foundation skills (`skills.yml`, the old General certificate's 38). */
  foundation: readonly string[];
  perf: readonly string[];
  completed: ReadonlySet<string>;
  /** Per engine, its levels (engineLevels); a missing engine holds none. */
  engines: Partial<Record<string, EngineLevel[]>>;
  /** Every NoSQL path drill id; undefined = not known (no path drill passed, the chunk is not loaded). */
  path?: readonly string[];
  /** Per domain: its final promotion review passed (the old domain certificate). */
  domains: { id: string; done: boolean }[];
}

/** An empty set never earns a badge (`[].every` is true). */
const all = <T>(xs: readonly T[], ok: (x: T) => boolean): boolean => xs.length > 0 && xs.every(ok);

export function badges(x: BadgeInput): Badge[] {
  const lv = (id: string): SkillLevel | undefined => x.levels.get(id);
  return [
    ...x.parts.map((p): Badge => ({ kind: 'part', id: `part-${p.n}`, n: p.n, have: all(p.skills, (s) => (lv(s)?.level ?? 0) >= 3 && !lv(s)?.review) })),
    { kind: 'fast', id: 'fast', have: all(x.perf, (p) => x.completed.has(p)) },
    // L333: the old certificate's condition, on the evidence level (an overdue card does not take it away)
    { kind: 'foundation', id: 'foundation', have: all(x.foundation, (s) => (lv(s)?.base ?? 0) >= 2) },
    ...BADGE_ENGINES.flatMap((e) => levelsOf(e).map((l): Badge =>
      ({ kind: 'engine', id: `${e}-${l}`, engine: e, level: l, have: !!x.engines[e]?.find((y) => y.level === l)?.done }))),
    { kind: 'path', id: 'path', have: all(x.path ?? [], (p) => x.completed.has(p)) },
    ...x.domains.map((dm): Badge => ({ kind: 'domain', id: `domain-${dm.id}`, domain: dm.id, have: dm.done })),
  ];
}
