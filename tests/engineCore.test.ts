// ENG-CORE (L220): routes of the Database Engine area and its lesson ids in the Save (no SAVE_VERSION bump).
import { describe, expect, it } from 'vitest';
import v5 from './fixtures/save-v5.json?raw';
import { loadTickets } from '../src/content';
import { knownSkills } from '../src/home';
import { engineHash, engineRouteOf, hashOf, parseRoute } from '../src/route';
import { ENGINE_ID, isWorkId, parseSave, type Known } from '../src/save';
import { SKILLS } from '../src/progress';

const known: Known = { ticketIds: new Set(['ch1-01']), laneIds: new Set(), skills: new Set(['select']) };

describe('route #/engine (kept forever)', () => {
  it('parseRoute / hashOf', () => {
    for (const h of ['#/engine', '#/engine/postgres', '#/engine/mongodb/L2/e-mg-l2-01', '#/engine/nope']) expect(parseRoute(h)).toBe('engine');
    expect(hashOf('engine')).toBe('#/engine');
  });

  it('engineRouteOf: engine, level, lesson; anything else is dropped', () => {
    expect(engineRouteOf('#/engine')).toEqual({});
    expect(engineRouteOf('#/engine/postgres')).toEqual({ engine: 'postgres', level: undefined, lesson: undefined });
    expect(engineRouteOf('#/engine/postgres/l1/e-pg-l1-01')).toEqual({ engine: 'postgres', level: 'L1', lesson: 'e-pg-l1-01' });
    expect(engineRouteOf('#/engine/dynamodb/L5/e-dy-l5-12')).toEqual({ engine: 'dynamodb', level: 'L5', lesson: 'e-dy-l5-12' });
    expect(engineRouteOf('#/engine/postgresx')).toEqual({ engine: undefined, level: undefined, lesson: undefined });
    expect(engineRouteOf('#/engine/postgres/L9/e-pg-l9-01').lesson).toBeUndefined();
    expect(engineRouteOf('#/engine/postgres/L1/<script>').lesson).toBeUndefined();
    expect(engineRouteOf('#/learn')).toEqual({});
    expect(engineHash('postgres', 'L1', 'e-pg-l1-01')).toBe('#/engine/postgres/L1/e-pg-l1-01');
    expect(engineRouteOf(engineHash('postgres', 'L1', 'e-pg-l1-01')).lesson).toBe('e-pg-l1-01');
  });
});

describe('id e-… trong Save', () => {
  it('ENGINE_ID / isWorkId', () => {
    for (const id of ['e-pg-l1-01', 'e-mg-l3-12', 'e-dy-l5-02']) expect([id, isWorkId(new Set(), id)]).toEqual([id, true]);
    for (const id of ['e-my-l1-01', 'e-pg', 'ecom-ch1-01x', 'E-PG-L1-01']) expect([id, ENGINE_ID.test(id)]).toEqual([id, false]);
  });

  it('completed giữ id e- qua đọc → ghi → đọc; id sai mẫu bị bỏ', () => {
    const raw = JSON.stringify({ ...JSON.parse(v5), completed: ['ch1-01', 'e-pg-l1-01', 'e-mg-l2-03', 'e-xx-l1-01'] });
    const s = parseSave(raw, known);
    expect(s.completed).toEqual(['ch1-01', 'e-pg-l1-01', 'e-mg-l2-03']);
    expect(parseSave(JSON.stringify(s), known)).toEqual(s);
  });

  it('không đổi kỹ năng đã học (Lily, lộ trình)', () => {
    const s = parseSave(v5, known);
    const ids = SKILLS.map((x) => x.id);
    const before = knownSkills(s, loadTickets('logistics'), ids);
    const after = knownSkills({ ...s, completed: [...s.completed, 'e-pg-l1-01', 'e-pg-l1-02', 'e-pg-l1-03'] }, loadTickets('logistics'), ids);
    expect(after).toEqual(before);
  });
});

describe('chunk lười engineView không import giá trị từ module main (Plan 6 U3)', () => {
  const files = import.meta.glob<string>(['../src/ui/engineView.ts', '../src/engine/*.ts', '../src/i18n/engine.ts'], { query: '?raw', import: 'default', eager: true });
  it.each(Object.keys(files))('%s', (f) => {
    const values = [...files[f].matchAll(/^import (?!type )[^;]*? from '([^']+)';/gm)].map((m) => m[1]);
    for (const v of values) expect([f, v]).toEqual([f, expect.stringMatching(/^(\.\.\/engine\/\w+|\.\.\/i18n\/engine|\.\/(content|labs|vizRegistry))$/)]);
  });
});
