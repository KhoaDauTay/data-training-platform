// MongoDB path content (content/engine/mongodb/path/): ids, manifest, dataset loader, and every drill / lesson query
// re-run with mingo (the app's own engine) on the real dataset.
import { describe, expect, it } from 'vitest';
import datasetJson from '../content/engine/mongodb/path/dataset.json?raw';
import drills16 from '../content/engine/mongodb/path/drills-p1-6.yml?raw';
import drills712 from '../content/engine/mongodb/path/drills-p7-12.yml?raw';
import indexYml from '../content/engine/mongodb/path/index.yml?raw';
import lessons16 from '../content/engine/mongodb/path/lessons-p1-6.yml?raw';
import lessons712 from '../content/engine/mongodb/path/lessons-p7-12.yml?raw';
import skills16 from '../content/engine/mongodb/path/skills-p1-6.yml?raw';
import skills712 from '../content/engine/mongodb/path/skills-p7-12.yml?raw';
import { parse as parseYaml } from 'yaml';
import { runMongo, type Dataset } from '../src/engine/mongo/engineMongo';
import { canon, gradeMongo } from '../src/engine/mongo/grade';
import { parseShell } from '../src/engine/mongo/parse';
import { isoDate, pathDataset } from '../src/engine/mongo/pathDataset';
import { followsEsr } from '../src/engine/mongo/path';
import type { MongoDoc, MongoResult } from '../src/engine/mongo/types';

/** Files by name as index.yml lists them (a file the manifest names but this map lacks fails `read`). */
const FILES: Record<string, string> = {
  'index.yml': indexYml,
  'dataset.json': datasetJson,
  'skills-p1-6.yml': skills16,
  'lessons-p1-6.yml': lessons16,
  'drills-p1-6.yml': drills16,
  'skills-p7-12.yml': skills712,
  'lessons-p7-12.yml': lessons712,
  'drills-p7-12.yml': drills712,
};
const read = (f: string) => {
  if (!Object.hasOwn(FILES, f)) throw new Error(`index.yml names an unknown file: ${f}`);
  return FILES[f];
};
/** ENGINE_ID from product-design-db-engine §2.2 (ENG-CORE's src/engine code is not on this branch yet: keep in sync). */
const ENGINE_ID = /^e-(pg|mg|dy|bp)-[a-z0-9-]+$/;

type Bi = { vi: string; en: string };
interface Skill { id: string; part: number }
interface Drill {
  id: string; skill: string; kind: string; solution?: string; starter?: string; ordered?: boolean;
  format?: 'choice'; grade?: 'esr' | 'covered'; query?: string; index?: string; options?: Bi[]; answer?: number;
  wrong?: { query?: string; option?: number }[];
}
interface Lesson {
  id: string; example?: string; mistake?: { query?: string };
  try?: Drill & { task: Bi };
}
interface Manifest { dataset: string; files: { parts: [number, number]; skills: string; lessons: string; drills: string }[]; parts: { n: number; title: Bi }[] }

const manifest = parseYaml(read('index.yml')) as Manifest;
const skills = manifest.files.flatMap((f) => parseYaml(read(f.skills)) as Skill[]);
const lessons = manifest.files.flatMap((f) => parseYaml(read(f.lessons)) as Lesson[]);
const drills = manifest.files.flatMap((f) => parseYaml(read(f.drills)) as Drill[]);
const raw = JSON.parse(read(manifest.dataset)) as Record<string, unknown>;
const ds = pathDataset(raw);
/** Same data, every collection reversed: a result that changes here depends on insertion order (ties, $first…). */
const reversed: Dataset = { collections: Object.fromEntries(Object.entries(ds.collections).map(([k, v]) => [k, [...v].reverse()])), indexes: ds.indexes };

const slug = (skill: string) => skill.replace(/^mg\./, '').replace(/_/g, '-');
const run = (src: string, on: Dataset = ds): MongoResult => runMongo(on, src);
const nonEmpty = (r: MongoResult) => (r.value !== undefined ? !(Array.isArray(r.value) && r.value.length === 0) : r.docs.length > 0);
const resultKey = (r: MongoResult) => canon(r.value !== undefined ? (r.value as never) : (r.docs as never));
const sortedKey = (r: MongoResult) => (r.value !== undefined ? canon(r.value as never) : r.docs.map((d) => canon(d)).sort().join('|'));
/** mingo has no explain: Part 11's explain snippets are illustrative text, never run. */
const runnable = (q?: string) => !!q && /^db\./.test(q.trim()) && !q.includes('.explain(');
/** Drills graded by running the query and comparing documents. */
const runs = (d: Drill) => d.format !== 'choice' && d.grade !== 'esr' && !!d.solution;

describe('MongoDB path: manifest and ids', () => {
  it('index.yml lists parts 1–12 in order, each covered by one file set, with skills in that range', () => {
    expect(manifest.parts.map((p) => p.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const s of skills) expect(manifest.files.filter((f) => s.part >= f.parts[0] && s.part <= f.parts[1])).toHaveLength(1);
    const parts = skills.map((s) => s.part);
    expect([...parts].sort((a, b) => a - b)).toEqual(parts); // listed in part order
  });

  it('drill ids are e-mg-d-<skill slug>-<n>, unique, and accepted by ENGINE_ID', () => {
    const ids = drills.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of drills) {
      expect(d.id, d.id).toMatch(ENGINE_ID);
      expect(d.id, d.id).toMatch(new RegExp(`^e-mg-d-${slug(d.skill)}-[1-9]\\d*$`));
    }
  });

  it('every skill has a lesson and exactly 4 drills (faded, open, trap, review)', () => {
    const ids = skills.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lessons.map((l) => l.id).sort()).toEqual([...ids].sort());
    for (const s of ids) expect(drills.filter((d) => d.skill === s).map((d) => d.kind).sort(), s).toEqual(['faded', 'open', 'review', 'trap']);
  });
});

describe('MongoDB path: dataset loader', () => {
  it('turns _meta.dateFields into Dates at 00:00 UTC, keeps null and missing', () => {
    const t = pathDataset({
      _meta: { dateFields: { o: ['d', 'e', 'f'] } },
      o: [{ _id: 1, d: '2026-05-01', e: null, g: '2026-05-01' }, { _id: 2, d: '2026-05-25T20:35:00Z' }],
    });
    const [a, b] = t.collections.o;
    expect(a.d).toEqual(new Date(Date.UTC(2026, 4, 1)));
    expect(a.e).toBeNull();
    expect(Object.hasOwn(a, 'f')).toBe(false);
    expect(a.g).toBe('2026-05-01'); // not listed: stays a string
    expect((b.d as Date).toISOString()).toBe('2026-05-25T20:35:00.000Z');
    expect(t.indexes.o).toEqual([{ v: 2, key: { _id: 1 }, name: '_id_' }]);
  });

  it('refuses a broken date and a missing _meta', () => {
    expect(() => isoDate('31/10/2026')).toThrow();
    expect(() => pathDataset({ _meta: { dateFields: { o: ['d'] } }, o: [{ d: 5 }] })).toThrow();
    expect(() => pathDataset({ o: [] })).toThrow();
  });

  it('the real dataset: every listed date field is a Date or null, size ≤ 300 KB, holds the fields Parts 7–12 need', () => {
    expect(read(manifest.dataset).length).toBeLessThanOrEqual(300 * 1024);
    for (const [c, fields] of Object.entries(ds.meta.dateFields))
      for (const d of ds.collections[c]) for (const f of fields) if (Object.hasOwn(d, f)) expect(d[f] === null || d[f] instanceof Date, `${c}.${f}`).toBe(true);
    const need: Record<string, string[]> = {
      stores: ['_id', 'name', 'city', 'opened_on'],
      products: ['_id', 'name', 'category', 'price_vnd'],
      customers: ['_id', 'name', 'email', 'city', 'signup_date', 'birth_year'],
      orders: ['_id', 'customer_id', 'store_id', 'order_date', 'channel', 'status', 'shipped_on', 'delivered_on', 'items'],
    };
    for (const [c, fields] of Object.entries(need)) for (const f of fields) expect(ds.collections[c].some((d) => Object.hasOwn(d, f)), `${c}.${f}`).toBe(true);
    for (const o of ds.collections.orders)
      for (const it of o.items as MongoDoc[]) expect(Object.keys(it).sort()).toEqual(['product_id', 'qty', 'unit_price_vnd']);
  });
});

describe('MongoDB path: every query runs on the real dataset (mingo)', () => {
  it.each(drills.filter(runs).map((d) => [d.id, d] as const))('%s', (_id, d) => {
    const sol = run(d.solution!);
    expect(nonEmpty(sol), 'empty result').toBe(true);
    // stable under reversed insertion order (in order when graded in order, as a multiset otherwise)
    const rev = run(d.solution!, reversed);
    if (d.ordered) expect(resultKey(rev)).toBe(resultKey(sol));
    else expect(sortedKey(rev)).toBe(sortedKey(sol));
    if (d.starter) expect(d.starter).toContain('___');
    for (const w of d.wrong ?? []) {
      const g = gradeMongo(sol, run(w.query!), { ordered: d.ordered });
      // a covered drill compares _id too (header of drills-p7-12.yml): the extraId tip is a fail there
      expect(g.ok && !(d.grade === 'covered' && g.tip), `wrong passes: ${w.query}`).toBe(false);
    }
    if (d.grade === 'covered') {
      const proj = (parseShell(d.solution!).method.args[1] ?? {}) as MongoDoc;
      const idx = Object.keys(parseShell(`db.x.createIndex(${d.index})`).method.args[0] as MongoDoc);
      expect(proj._id === 0 || idx.includes('_id'), 'covered needs _id: 0').toBe(true);
      for (const [k, v] of Object.entries(proj)) if (v !== 0) expect(idx, k).toContain(k);
    }
  });

  it('the drills of one skill all give different results', () => {
    for (const s of skills) {
      const keys = drills.filter((d) => d.skill === s.id && runs(d)).map((d) => sortedKey(run(d.solution!)));
      expect(new Set(keys).size, s.id).toBe(keys.length);
    }
  });

  it.each(drills.filter((d) => d.grade === 'esr').map((d) => [d.id, d] as const))('%s follows Equality → Sort → Range', (_id, d) => {
    expect(nonEmpty(run(d.query!)), 'query is empty').toBe(true);
    expect(followsEsr(d.query!, d.solution!)).toBe(true);
    for (const w of d.wrong ?? []) expect(followsEsr(d.query!, w.query!), w.query).toBe(false);
  });

  it.each(drills.filter((d) => d.format === 'choice').map((d) => [d.id, d] as const))('%s is a well-formed choice', (_id, d) => {
    expect(d.options!.length).toBeGreaterThanOrEqual(2);
    expect(d.answer).toBeGreaterThanOrEqual(0);
    expect(d.answer).toBeLessThan(d.options!.length);
    for (const w of d.wrong ?? []) expect(w.option !== d.answer && w.option! < d.options!.length, String(w.option)).toBe(true);
  });

  it.each(lessons.map((l) => [l.id, l] as const))('lesson %s: example, mistake and try run', (_id, l) => {
    const ex = runnable(l.example) ? run(l.example!) : undefined;
    if (ex) expect(nonEmpty(ex), 'example is empty').toBe(true);
    if (ex && runnable(l.mistake?.query)) {
      const m = run(l.mistake!.query!);
      expect(resultKey(m), 'mistake equals example').not.toBe(resultKey(ex));
    }
    const t = l.try;
    if (!t) return;
    if (t.format === 'choice') {
      expect(t.answer).toBeLessThan(t.options!.length);
      return;
    }
    if (t.grade === 'esr') {
      expect(followsEsr(t.query!, t.solution!)).toBe(true);
      return;
    }
    const sol = run(t.solution!);
    expect(nonEmpty(sol), 'try is empty').toBe(true);
    const rev = run(t.solution!, reversed);
    if (t.ordered) expect(resultKey(rev)).toBe(resultKey(sol));
    else expect(sortedKey(rev)).toBe(sortedKey(sol));
    const mine = sortedKey(sol);
    for (const d of drills.filter((x) => x.skill === l.id && runs(x))) expect(sortedKey(run(d.solution!)), `try equals ${d.id}`).not.toBe(mine);
    if (ex) expect(mine, 'try equals example').not.toBe(sortedKey(ex));
  });
});
