// Integration (L248): the engine area's seams over the real content. Every MongoDB and DynamoDB lab step's Solution passes
// its own check on the real runtime (mingo, dynoxide in Node) through the runners the page uses, writes are graded on the
// state they leave, DynamoDB `expect` counts hold, every `viz:` name resolves to an ENG-VIZ diagram, the lesson index
// query keeps META_KEYS, and the NoSQL path's covered/ESR rules (moved here from tests/mongoPath.test.ts) grade right.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { META_KEYS, parseEngineLesson, type EngineLesson, type LessonSource } from '../src/engine/content';
import { DynamoEngine } from '../src/engine/dynamo/engine';
import { dynamoRunner, labOf, marshal, unmarshal } from '../src/engine/dynamo/runner';
import type { DynamoRequest } from '../src/engine/dynamo/types';
import { loadDataset, runMongo } from '../src/engine/mongo/engineMongo';
import { followsEsr, isCovered } from '../src/engine/mongo/path';
import { mongoRunner } from '../src/engine/mongo/runner';
import { resolveViz } from '../src/engine/viz/engineViz';
import { extensionsOf, replayOf } from '../src/engine/pglab/runner';
import { enginePathOf } from '../src/route';
import sourcesTs from '../src/engineSources.ts?raw';

const files = import.meta.glob<LessonSource>('../content/engine/*/L*/*.md', { query: '?fm', import: 'default', eager: true });
const lessons: EngineLesson[] = Object.entries(files).map(([p, s]) => parseEngineLesson(s, p));
const lang = () => 'en' as const;
const node = (globalThis as unknown as { process: { getBuiltinModule(id: string): unknown } }).process;
const { readFile } = node.getBuiltinModule('fs/promises') as { readFile(p: string): Promise<Uint8Array<ArrayBuffer>> };
const { fileURLToPath } = node.getBuiltinModule('url') as { fileURLToPath(u: string): string };

describe('engine index and routes', () => {
  it('src/engineSources.ts asks for exactly META_KEYS', () => {
    expect(sourcesTs).toContain(`meta=${META_KEYS}'`);
  });
  it('#/engine/mongodb/path[/skill]', () => {
    expect(enginePathOf('#/engine/mongodb/path')).toBe('');
    expect(enginePathOf('#/engine/mongodb/path/lookup-pipeline')).toBe('lookup-pipeline');
    expect(enginePathOf('#/engine/mongodb')).toBeUndefined();
    expect(enginePathOf('#/engine/postgres/path')).toBeUndefined();
  });
});

describe('viz names in content → ENG-VIZ diagrams', () => {
  const short = { postgres: 'pg', mongodb: 'mg', dynamodb: 'dy' } as const;
  /** Known gap: no diagram draws a query's path through the server yet. */
  const GAP = new Set(['pg-query-path']);
  it.each(lessons.filter((l) => l.viz).map((l) => [l.id, l.viz!, l.engine] as const))('%s: %s', (_id, name, engine) => {
    const real = resolveViz(name, short[engine]);
    if (GAP.has(name)) expect(real).toBeUndefined();
    else expect(real, name).toMatch(new RegExp(`^${short[engine]}-`));
  });
});

describe('Postgres runner helpers', () => {
  it('extensions from setup and from the functions the steps call; cube before earthdistance', () => {
    expect(extensionsOf("SELECT * FROM heap_page_items(get_raw_page('t', 0))")).toEqual(['pageinspect']);
    expect(extensionsOf('CREATE EXTENSION IF NOT EXISTS earthdistance; CREATE EXTENSION cube;')).toEqual(['cube', 'earthdistance']);
    expect(extensionsOf("SELECT bt_index_check('i')", 'CREATE EXTENSION plpython3u')).toEqual(['amcheck']);
  });
  it('replay keeps the earlier steps that change something', () => {
    const lab = { steps: ['CREATE INDEX i ON t (a)', 'SELECT 1', 'VACUUM t', 'SELECT 2'].map((solution) => ({ solution })) } as never;
    expect(replayOf(lab, 3)).toEqual(['CREATE INDEX i ON t (a)', 'VACUUM t']);
    expect(replayOf(lab, 0)).toEqual([]);
  });
});

describe('MongoDB labs: every Solution passes its own check', () => {
  const r = mongoRunner({ lang }, { exec: async (src: string, ds: string) => runMongo(await loadDataset(ds), src) });
  const labs = lessons.filter((l) => l.engine === 'mongodb' && l.lab && l.runtime !== 'docs');
  it.each(labs.map((l) => [l.id, l] as const))('%s', async (_id, l) => {
    await r.prepare(l.lab!);
    for (const [i, s] of l.lab!.steps.entries()) {
      expect(await r.check(l.lab!, s, s.solution), `step ${i + 1}`).toMatchObject({ ok: true });
      await r.run(l.lab!, s.solution);
    }
  });
  it('a write is graded on the collection after it; covered drills grade _id', async () => {
    const lab = { setup: JSON.stringify({ collections: { c: [{ _id: 1, a: 1, at: { $date: '2026-01-01T00:00:00Z' } }] } }), steps: [] };
    const step = { solution: 'db.c.updateOne({ _id: 1 }, { $set: { a: 2 } })', check: 'doc' as const, ordered: false } as never;
    expect(await r.check(lab, step, 'db.c.updateMany({}, { $set: { a: 2 } })')).toMatchObject({ ok: true });
    expect(await r.check(lab, step, 'db.c.updateOne({ _id: 1 }, { $set: { a: 3 } })')).toMatchObject({ ok: false, reason: 'wrong' });
    expect((await r.exec(lab, 'db.c.find({ at: { $gte: ISODate("2025-12-31") } })')).docs).toHaveLength(1);
    const cov = { solution: "db.products.find({ category: 'Drinks' }, { _id: 0, price_vnd: 1 })", check: 'doc' as const, ordered: false } as never;
    const wrong = "db.products.find({ category: 'Drinks' }, { price_vnd: 1 })";
    expect(await r.check({ setup: 'path', steps: [] }, cov, wrong)).toMatchObject({ ok: true, tip: 'extraId' });
    expect(await r.check({ setup: 'path', steps: [] }, cov, wrong, { strictId: true })).toMatchObject({ ok: false });
    expect(isCovered("db.products.find({ category: 'Drinks' }, { _id: 0, price_vnd: 1 })", '{ category: 1, price_vnd: 1 }')).toBe(true);
    expect(isCovered(wrong, '{ category: 1, price_vnd: 1 }')).toBe(false);
    expect(followsEsr("db.c.find({ a: 1, b: { $gt: 2 } }).sort({ c: 1 })", 'db.c.createIndex({ a: 1, c: 1, b: 1 })')).toBe(true);
    expect(followsEsr("db.c.find({ a: 1, b: { $gt: 2 } }).sort({ c: 1 })", 'db.c.createIndex({ a: 1, b: 1, c: 1 })')).toBe(false);
  });
});

describe('DynamoDB labs: every Solution passes its own check (dynoxide in Node)', () => {
  let eng: DynamoEngine;
  beforeAll(async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    (globalThis as Record<string, unknown>).self ??= globalThis;
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!url.startsWith('file:')) return realFetch(input, init);
      return new Response(await readFile(fileURLToPath(url)), { headers: { 'content-type': 'application/wasm' } });
    };
    eng = await DynamoEngine.open(() => import('@dynoxide/wasm-engine/worker'));
  }, 60_000);
  const client = {
    request: async (req: DynamoRequest, o: { dataset: string; after?: DynamoRequest }) => {
      await eng.setup(o.dataset, labOf(o.dataset));
      return eng.run(req, o.after);
    },
  };
  it('marshal and unmarshal plain JSON', () => {
    const v = { s: 'x', n: 2.5, b: true, z: null, l: [1, 'a'], m: { k: [] } };
    expect(marshal(v)).toEqual({ M: { s: { S: 'x' }, n: { N: '2.5' }, b: { BOOL: true }, z: { NULL: true }, l: { L: [{ N: '1' }, { S: 'a' }] }, m: { M: { k: { L: [] } } } } });
    expect(unmarshal(marshal(v))).toEqual(v);
  });
  const labs = lessons.filter((l) => l.engine === 'dynamodb' && l.lab && l.runtime !== 'docs');
  it.each(labs.map((l) => [l.id, l] as const))('%s', async (_id, l) => {
    const r = dynamoRunner({ lang }, client as never);
    await r.prepare(l.lab!);
    for (const [i, s] of l.lab!.steps.entries()) {
      expect(await r.check(l.lab!, s, s.solution), `step ${i + 1}`).toMatchObject({ ok: true });
      const out = await r.run(l.lab!, s.solution);
      expect(out.meta?.count, `step ${i + 1} count`).toBeTypeOf('number');
    }
  }, 60_000);
  it('a Scan where the step expects a Query fails on ScannedCount (L1/09)', async () => {
    const l = lessons.find((x) => x.id === 'e-dy-l1-09')!;
    const r = dynamoRunner({ lang }, client as never);
    const [q] = l.lab!.steps;
    const req = JSON.parse(q.solution) as { input: Record<string, unknown> };
    const scan = JSON.stringify({ op: 'Scan', input: { TableName: req.input.TableName, FilterExpression: req.input.KeyConditionExpression, ExpressionAttributeValues: req.input.ExpressionAttributeValues, ExpressionAttributeNames: req.input.ExpressionAttributeNames } });
    const v = await r.check(l.lab!, q, scan);
    expect(v.ok).toBe(false);
  }, 60_000);
});
