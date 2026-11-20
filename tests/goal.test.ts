import { describe, expect, it } from 'vitest';
import { awayDays, parseGoal, readGoal, sessionPlan, weekCount, weekStart, writeGoal, GOAL_KEY } from '../src/goal';
import type { KV } from '../src/storage';

const mem = (init: Record<string, string> = {}): KV => {
  const data = new Map(Object.entries(init));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};
const at = (day: string, hh = 9): number => new Date(`${day}T${String(hh).padStart(2, '0')}:00`).getTime(); // the machine's local time

describe('weekStart (Monday, local calendar)', () => {
  it('Monday..Sunday share one start', () => {
    for (const d of ['2026-11-16', '2026-11-18', '2026-11-22']) expect(weekStart(d)).toBe('2026-11-16');
    expect(weekStart('2026-11-23')).toBe('2026-11-23');
  });
  it('crosses the year end', () => {
    expect(weekStart('2027-01-01')).toBe('2026-12-28'); // a Friday
    expect(weekStart('2027-01-03')).toBe('2026-12-28'); // Sunday
    expect(weekStart('2027-01-04')).toBe('2027-01-04');
  });
});

describe('weekCount (derived, never stored)', () => {
  const base = { completed: [] as string[], lanes: [] as string[], history: {}, review: {}, today: '2026-11-20' };
  it('counts tasks first opened this week and cards raised this week', () => {
    const n = weekCount({
      ...base,
      completed: ['ch1-01', 'ch1-02', 'ch1-03', 'g-select-1'],
      history: {
        'ch1-01': [{ sql: 'b', at: at('2026-11-18'), ok: true }, { sql: 'a', at: at('2026-11-16', 0), ok: true }], // Monday 00:00: in
        'ch1-02': [{ sql: 'b', at: at('2026-11-17'), ok: true }, { sql: 'a', at: at('2026-11-15', 23), ok: true }], // first opened Sunday: out
        'g-select-1': [{ sql: 'a', at: at('2026-11-18'), ok: true }], // drills count through their card only
      },
      review: {
        select: { box: 2, due: '2026-11-20' }, // raised 11-19: in
        where: { box: 3, due: '2026-11-19' }, // raised 11-15: out
        group_by: { box: 1, due: '2026-11-21' }, // seeded by a task (box 1): not a review
      },
    });
    expect(n).toEqual({ tasks: 1, reviews: 1 });
  });
  it('a new week starts from 0, across the year end', () => {
    const history = { 'ch1-01': [{ sql: 'a', at: at('2026-12-27'), ok: true }] };
    expect(weekCount({ ...base, completed: ['ch1-01'], history, today: '2026-12-27' })).toEqual({ tasks: 1, reviews: 0 });
    expect(weekCount({ ...base, completed: ['ch1-01'], history, today: '2026-12-28' })).toEqual({ tasks: 0, reviews: 0 });
  });
  it('lane tasks count; a broken card box is ignored', () => {
    expect(weekCount({ ...base, lanes: ['lane-x'], history: { 'lane-x': [{ sql: 'a', at: at('2026-11-20'), ok: true }] },
      review: { x: { box: 9, due: '2026-11-20' } } })).toEqual({ tasks: 1, reviews: 0 });
  });
});

describe('awayDays', () => {
  it('>= 7 days since the last day before today', () => {
    expect(awayDays(['2026-10-01', '2026-11-05'], '2026-11-20')).toBe(15);
    expect(awayDays(['2026-11-05', '2026-11-20'], '2026-11-20')).toBe(15); // today already written by a save: still away
    expect(awayDays(['2026-11-14'], '2026-11-20')).toBeUndefined();
    expect(awayDays(['2026-11-13'], '2026-11-20')).toBe(7);
    expect(awayDays([], '2026-11-20')).toBeUndefined();
    expect(awayDays(['2026-12-25'], '2027-01-02')).toBe(8);
  });
});

describe('goal pref', () => {
  it('off by default; broken prefs read as no goal, never throw', () => {
    expect(readGoal(mem())).toEqual({});
    expect(readGoal(mem({ [GOAL_KEY]: '{oops' }))).toEqual({});
    for (const raw of [null, 7, 'x', [], { perWeek: 4 }, { perWeek: '5' }, { remindAt: '25:00' }, { remindAt: '7:00' }, { weekday: 7 }, { weekday: 1.5 }]) {
      expect(parseGoal(raw)).toEqual({});
    }
  });
  it('keeps valid fields only', () => {
    expect(parseGoal({ perWeek: 5, remindAt: '19:30', weekday: 0, extra: 1 })).toEqual({ perWeek: 5, remindAt: '19:30', weekday: 0 });
    const s = mem();
    writeGoal({ perWeek: 10, weekday: 6 }, s);
    expect(readGoal(s)).toEqual({ perWeek: 10, weekday: 6 });
    writeGoal({}, s);
    expect(readGoal(s)).toEqual({});
  });
});

describe('sessionPlan', () => {
  it('orders warm-up, reviews, next task; minutes from the item counts', () => {
    expect(sessionPlan({ warmup: 3, due: 2, next: true, weakest: 'where' })).toEqual([
      { kind: 'warmup', n: 3, min: 5 }, { kind: 'review', n: 2, min: 3 }, { kind: 'next', min: 10 },
    ]);
  });
  it('the weakest skill only when nothing is due; goal off adds nothing', () => {
    expect(sessionPlan({ warmup: 0, due: 0, next: true, weakest: 'where' })).toEqual([{ kind: 'next', min: 10 }, { kind: 'skill', skill: 'where', min: 3 }]);
    expect(sessionPlan({ warmup: 0, due: 0, next: false })).toEqual([]);
  });
});
