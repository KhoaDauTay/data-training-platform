// v47 S3 (L910–L912): the welcome's goal (device pref cargo-query/goal-intent) → where the welcome lands and what Home suggests.
import { describe, expect, it } from 'vitest';
import { engineLevelOf, resumeTarget } from '../src/home';
import { INTENT_KEY, INTENTS, intentRoute, parseIntent, readIntent, writeIntent } from '../src/onboarding';
import { engineRouteOf, learnModuleOf, parseRoute } from '../src/route';
import type { KV } from '../src/storage';
import type { Ticket } from '../src/tickets';

const mem = (): KV & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

describe('goal intent pref', () => {
  it('reads only the four goals; anything else is "no goal" (the analyst default)', () => {
    for (const x of INTENTS) expect(parseIntent(x)).toBe(x);
    for (const bad of [undefined, null, '', 'Analyst', 'dba', 3, ['sql'], { x: 'sql' }]) expect(parseIntent(bad)).toBeUndefined();
    const kv = mem();
    expect(readIntent(kv)).toBeUndefined();
    writeIntent('engineer', kv);
    expect(kv.data.get(INTENT_KEY)).toBe('"engineer"');
    expect(readIntent(kv)).toBe('engineer');
    kv.setItem(INTENT_KEY, '{broken');
    expect(readIntent(kv)).toBeUndefined();
  });
});

describe('goal → first route', () => {
  it('analyst keeps the domain flow; the others land on a General or Engine page, never a domain', () => {
    expect(intentRoute('analyst')).toBeUndefined();
    expect(intentRoute(undefined)).toBeUndefined();
    expect(intentRoute('sql')).toBe('#/learn');
    expect(parseRoute(intentRoute('sql')!)).toBe('learn');
    expect(learnModuleOf(intentRoute('sql')!)).toBeUndefined(); // the path's overview, where the entry check card is
    expect(parseRoute(intentRoute('internals')!)).toBe('engine');
    expect(engineRouteOf(intentRoute('internals')!)).toEqual({ engine: 'postgres', level: undefined, lesson: undefined }); // L1–L5 = the level chooser
    expect(engineRouteOf(intentRoute('engineer')!)).toEqual({ engine: 'stack', level: undefined, lesson: undefined });
    for (const x of INTENTS) expect(intentRoute(x) ?? '').not.toMatch(/#\/d\//);
  });
});

describe('goal → Home suggestion (resumeTarget)', () => {
  const ids = ['select', 'where'];
  const next = { id: 'ch1-01' } as Ticket;
  it('an Engine lesson id gives its engine and level; Best Practice and path drills do not', () => {
    expect(engineLevelOf('e-pg-l3-04')).toEqual({ engine: 'postgres', level: 3 });
    expect(engineLevelOf('e-st-l1-02')).toEqual({ engine: 'stack', level: 1 });
    expect(engineLevelOf('e-ds-l4-01')).toEqual({ engine: 'design', level: 4 });
    expect(engineLevelOf('e-bp-q02')).toBeUndefined();
    expect(engineLevelOf('e-mg-d-esr-1')).toBeUndefined();
    expect(engineLevelOf('ch1-01')).toBeUndefined();
  });
  it('an Engine goal with nothing in progress suggests its track', () => {
    expect(resumeTarget([], next, true, ids, 'internals')).toEqual({ kind: 'engine', engine: 'postgres' });
    expect(resumeTarget([], next, true, ids, 'engineer')).toEqual({ kind: 'engine', engine: 'stack' });
    expect(resumeTarget([], undefined, false, ids, 'engineer')).toEqual({ kind: 'engine', engine: 'stack' }); // every task done
  });
  it('an Engine goal continues at the level of the last Engine lesson passed', () => {
    expect(resumeTarget(['e-pg-l1-01', 'e-pg-l3-02'], next, true, ids, 'internals')).toEqual({ kind: 'engine', engine: 'postgres', level: 3 });
    expect(resumeTarget(['ch1-01', 'e-st-l2-01'], next, false, ids, 'engineer')).toEqual({ kind: 'engine', engine: 'stack', level: 2 });
    // SQL only, the last thing passed a Best Practice card: still the last lesson's level
    expect(resumeTarget(['e-ds-l4-01', 'e-bp-q02'], next, true, ids, 'engineer')).toEqual({ kind: 'engine', engine: 'design', level: 4 });
  });
  it('something in progress wins: a drill, or a domain task the player went back to', () => {
    expect(resumeTarget(['e-pg-l1-01', 'g-where-2'], next, true, ids, 'internals')).toEqual({ kind: 'skill', skill: 'where' });
    expect(resumeTarget(['e-pg-l1-01', 'ch1-01'], next, false, ids, 'internals')).toEqual({ kind: 'ticket', ticket: next });
  });
  it('analyst, "knows SQL" and no goal keep the v15 Q2 rules (Engine progress ignored)', () => {
    for (const x of ['analyst', 'sql', undefined]) {
      expect(resumeTarget([], next, false, ids, x)).toEqual({ kind: 'ticket', ticket: next });
      expect(resumeTarget(['e-pg-l3-02'], next, true, ids, x)).toEqual({ kind: 'learn' });
    }
  });
});
