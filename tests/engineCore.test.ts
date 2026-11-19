// ENG-CORE (L220): routes of the Database Engine area and its lesson ids in the Save (no SAVE_VERSION bump).
import { describe, expect, it } from 'vitest';
import v5 from './fixtures/save-v5.json?raw';
import { loadTickets } from '../src/content';
import { knownSkills } from '../src/home';
import { engineHash, engineRouteOf, hashOf, parseRoute } from '../src/route';
import { ENGINE_ID, isWorkId, parseSave, type Known } from '../src/save';
import { SKILLS } from '../src/progress';
import { decodeInfomask, heapView } from '../src/engine/inside';
import { gradable } from '../src/engine/labs';
import type { EngineLesson, LabStep } from '../src/engine/content';

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
    for (const id of ['e-pg-l1-01', 'e-mg-l3-12', 'e-dy-l5-02', 'e-mg-d-lookup-3', 'e-dy-d-gsi-1']) expect([id, isWorkId(new Set(), id)]).toEqual([id, true]);
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

describe('gradable: bước nào tính vào hoàn thành bài', () => {
  const step = (check: LabStep['check']): LabStep => ({ task: { vi: 'a', en: 'a' }, solution: 'x', check, ordered: false, hint: { vi: 'a', en: 'a' } });
  const lesson = (engine: EngineLesson['engine'], setup?: string) => ({ engine, lab: { steps: [], ...(setup ? { setup } : {}) } }) as unknown as EngineLesson;
  it('Postgres: rows/catalog luôn; plan chỉ khi có setup; doc không bao giờ; engine chưa có runner thì không', () => {
    expect(gradable(lesson('postgres'), step('rows'))).toBe(true);
    expect(gradable(lesson('postgres'), step('catalog'))).toBe(true);
    expect(gradable(lesson('postgres'), step('plan'))).toBe(false);
    expect(gradable(lesson('postgres', 'CREATE TABLE t (a int)'), step('plan'))).toBe(true);
    expect(gradable(lesson('postgres'), step('doc'))).toBe(false);
    expect(gradable(lesson('dynamodb'), step('rows'))).toBe(false);
  });
});

describe('Bên trong: pageinspect → line pointer + cờ infomask (thuần)', () => {
  it('decodeInfomask', () => {
    expect(decodeInfomask(0x0100 | 0x0800, 0x4000)).toEqual(['XMIN_COMMITTED', 'XMAX_INVALID', 'HOT_UPDATED']);
    expect(decodeInfomask(0x0300, 0x8000)).toEqual(['XMIN_FROZEN', 'HEAP_ONLY']);
    expect(decodeInfomask()).toEqual([]);
  });
  it('heapView: không phải pageinspect, thiếu cột, đủ cột', () => {
    expect(heapView({ columns: ['a'], rows: [] })).toBeUndefined();
    expect(heapView({ columns: ['lp', 't_xmin'], rows: [] })).toEqual({ missing: ['t_ctid'] });
    const v = heapView({ columns: ['lp', 'lp_flags', 't_xmin', 't_xmax', 't_ctid', 't_infomask', 't_infomask2'],
      rows: [[1, 2, null, null, null, null, null], [2, 1, '740', '0', '(0,2)', 0x0900, 0x8000], [3, 3, null, null, null, null, null]] });
    expect(v).toEqual({ dead: 2, hot: 0, rows: [
      { lp: '1', flag: 'redirect', xmin: '', xmax: '', ctid: '', flags: [] },
      { lp: '2', flag: 'normal', xmin: '740', xmax: '0', ctid: '(0,2)', flags: ['XMIN_COMMITTED', 'XMAX_INVALID', 'HEAP_ONLY'] },
      { lp: '3', flag: 'dead', xmin: '', xmax: '', ctid: '', flags: [] }] });
  });
});
