import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import v5 from './fixtures/save-v5.json?raw';
import sqlYml from '../content/general/sql.yml?raw';
import { generalNow, loadTickets } from '../src/content';
import { knownSkills } from '../src/home';
import { badges, BADGE_ENGINES, DRILL_KINDS, engineLevels, FAST_PART, masteryOf, overdue, perfDrills, skillParts, type BadgeInput } from '../src/mastery';
import { ALL_PARTS, PARTS, SKILLS } from '../src/progress';
import type { Save } from '../src/save';

/** v24 R0 (product-route-v24 §1.7, L323, L330–L334): skill levels and badges, derived from the Save on every draw. */
const save = JSON.parse(v5) as Save;
const ids = SKILLS.map((s) => s.id);
const tickets = () => loadTickets('logistics');
const parts = skillParts(SKILLS);

describe('skill levels (src/mastery.ts)', () => {
  it('drill kinds follow the id suffix in sql.yml (-1 faded, -2 open, -3 trap, -4 review)', () => {
    const drills = parse(sqlYml) as { id: string; skill?: string; kind: string }[];
    for (const d of drills.filter((x) => x.skill)) expect(d.kind, d.id).toBe(DRILL_KINDS[Number(d.id.split('-').pop()) - 1]);
  });

  it('save-v5.json gives the right level per skill (on a day nothing is overdue)', () => {
    const m = masteryOf(save, tickets(), ids, '2026-11-20');
    const known = knownSkills(save, tickets(), ids);
    const used = new Set(tickets().filter((t) => save.completed.includes(t.id)).flatMap((t) => [...t.requires, ...t.grants]));
    for (const id of ids) {
      const s = m.get(id)!;
      expect(s.review, id).toBe(false);
      expect(s.level, id).toBe(known.has(id) ? 2 : used.has(id) ? 1 : 0); // no drill passed, no card ≥ 3 with a trap
    }
    expect(m.get('select')).toMatchObject({ base: 2, level: 2, next: 'trap', card: { box: 3 } });
    expect(m.get('where')).toMatchObject({ base: 2, level: 2 });
    expect(m.get('window_rank')).toMatchObject({ base: 0, level: 0, next: 'drill' });
  });

  it('base ≥ 2 is exactly knownSkills (the ✓ and Lily keep their meaning)', () => {
    const s = { ...save, completed: [...save.completed, 'g-join-1', 'g-join-3', 'g-having-2'] };
    const m = masteryOf(s, tickets(), ids, '2027-06-01');
    const known = knownSkills(s, tickets(), ids);
    expect(ids.filter((id) => m.get(id)!.base >= 2)).toEqual(ids.filter((id) => known.has(id)));
    expect(m.get('having')).toMatchObject({ base: 1, next: 'second' });
  });

  it('a card overdue by more than its box interval lowers the shown level by one and says "needs review"', () => {
    // where: box 2, due 2026-11-19, interval 2 → overdue from 2026-11-22
    expect(masteryOf(save, tickets(), ids, '2026-11-21').get('where')).toMatchObject({ level: 2, review: false });
    expect(masteryOf(save, tickets(), ids, '2026-11-22').get('where')).toMatchObject({ base: 2, level: 1, review: true, next: 'overdue' });
    expect(overdue({ box: 5, due: '2026-01-01' }, '2026-01-17')).toBe(false);
    expect(overdue({ box: 5, due: '2026-01-01' }, '2026-01-18')).toBe(true);
    expect(overdue(undefined, '2099-01-01')).toBe(false);
  });

  it('Solid needs the trap drill and box ≥ 3; Fluent all four drills, box ≥ 4 and the skill’s perf drills', () => {
    const all4 = ['g-select-1', 'g-select-2', 'g-select-3', 'g-select-4'];
    const at = (box: number, extra: string[] = [], perf: string[] = []) =>
      masteryOf({ completed: [...save.completed, ...extra], review: { select: { box, due: '2026-11-25' } } }, tickets(), ids, '2026-11-20', perf).get('select')!;
    expect(at(3, ['g-select-3'])).toMatchObject({ level: 3, next: 'allDrills' });
    expect(at(2, ['g-select-3'])).toMatchObject({ level: 2, next: 'review' });
    expect(at(4, all4)).toMatchObject({ level: 4 });
    expect(at(4, all4, ['g-select-9'])).toMatchObject({ level: 3, next: 'perf' });
    expect(at(4, [...all4, 'g-select-9'], ['g-select-9'])).toMatchObject({ level: 4 });
  });
});

describe('engine levels and badges', () => {
  const tree = { levels: [
    { level: 'L1', modules: [{ lessons: [{ id: 'a' }, { id: 'b' }] }, { lessons: [{ id: 'c' }] }] },
    { level: 'L2', modules: [] },
  ] };
  it('per module, a level is done when every module is', () => {
    expect(engineLevels(tree, new Set(['a', 'c']))).toEqual([
      { level: 'L1', k: 1, n: 2, started: true, done: false }, { level: 'L2', k: 0, n: 0, started: false, done: false }]);
    expect(engineLevels(tree, new Set(['a', 'b', 'c']))[0].done).toBe(true);
  });

  const input = (s: Pick<Save, 'completed' | 'review'>, today: string): BadgeInput => ({
    parts, levels: masteryOf(s, tickets(), ids, today), foundation: ids, perf: [], completed: new Set(s.completed),
    engines: {}, domains: [{ id: 'logistics', done: false }, { id: 'ecommerce', done: false }, { id: 'finance', done: true }],
  });

  it('51 badges: 11 Parts, fast, foundation, 4 engines × 5 levels + the data stack, OLAP, search and telemetry × 3 (v45 L745, v47 L990, L1018, L1034) + Redis × 2 (v47 L956), the NoSQL path, 3 domains', () => {
    const b = badges(input(save, '2026-11-20'));
    expect(parts).toHaveLength(11);
    expect(b).toHaveLength(51);
    expect(b.filter((x) => x.kind === 'engine')).toHaveLength((BADGE_ENGINES.length - 5) * 5 + 3 * 4 + 2);
    expect(b.filter((x) => x.kind === 'engine' && x.engine === 'stack').map((x) => x.id)).toEqual(['stack-L1', 'stack-L2', 'stack-L3']);
    expect(b.filter((x) => x.kind === 'engine' && x.engine === 'redis').map((x) => x.id)).toEqual(['redis-L1', 'redis-L2']);
    expect(b.filter((x) => x.kind === 'engine' && x.engine === 'olap').map((x) => x.id)).toEqual(['olap-L1', 'olap-L2', 'olap-L3']);
    expect(b.filter((x) => x.kind === 'engine' && x.engine === 'telemetry').map((x) => x.id)).toEqual(['telemetry-L1', 'telemetry-L2', 'telemetry-L3']);
    expect(new Set(b.map((x) => x.id)).size).toBe(51);
  });

  it('same Save → same badges; an empty set never earns one (no perf drill, no design engine, no path list)', () => {
    expect(badges(input(save, '2026-11-20'))).toEqual(badges(input(JSON.parse(v5), '2026-11-20')));
    const held = badges(input(save, '2026-11-20')).filter((x) => x.have).map((x) => x.id);
    expect(held).toEqual(['domain-finance']);
  });

  it('a Part badge is lost while a skill needs review and won back by reviewing; foundation keeps the old certificate rule', () => {
    const p1 = parts[0].skills;
    const solid = { completed: p1.flatMap((s) => [1, 2, 3, 4].map((i) => `g-${s.replace(/_/g, '-')}-${i}`)), review: Object.fromEntries(p1.map((s) => [s, { box: 3, due: '2026-11-20' }])) };
    const b = (today: string) => badges(input(solid, today)).find((x) => x.id === `part-${parts[0].n}`)!.have;
    expect(b('2026-11-20')).toBe(true);
    expect(b('2026-11-25')).toBe(false); // box 3 interval 4: overdue after 11-24
    const everything = { completed: ids.flatMap((s) => [`g-${s.replace(/_/g, '-')}-1`, `g-${s.replace(/_/g, '-')}-2`]), review: {} };
    expect(badges(input(everything, '2030-01-01')).find((x) => x.id === 'foundation')!.have).toBe(true);
  });
});

describe('route.yml wiring (v24 integration, L330)', () => {
  it('"Đúng và nhanh" reads the perf drills of route.yml Part 11; Part badges follow route.yml', () => {
    const part = PARTS.find((p) => p.n === FAST_PART)!;
    const fast = perfDrills(generalNow()!.drills, part.skills);
    expect(fast.length).toBeGreaterThan(0);
    for (const id of fast) expect(part.skills.some((s) => id.startsWith(`g-${s.replace(/_/g, '-')}-`))).toBe(true);
    const all = ALL_PARTS.map((p) => ({ n: p.n, skills: p.skills.filter((id) => PARTS.some((q) => q.skills.includes(id))) }));
    const out = badges({ parts: all, levels: masteryOf(save, tickets(), ids, '2026-11-20'), foundation: ids, perf: fast, completed: new Set(save.completed), engines: {}, domains: [] });
    expect(out.filter((b) => b.kind === 'part').map((b) => b.id)).toEqual(ALL_PARTS.map((p) => `part-${p.n}`));
    expect(out.filter((b) => b.kind === 'part')).toHaveLength(11); // ux-route-v24 §6.3: 11 Parts of 37 badges
    for (const p of all.filter((x) => !x.skills.length)) expect(out.find((b) => b.id === `part-${p.n}`)!.have).toBe(false); // L333
    expect(out.find((b) => b.id === 'fast')!.have).toBe(false);
  });
});
