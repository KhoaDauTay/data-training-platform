// Integration (L248): the engine area's seams over the real content. Every MongoDB and DynamoDB lab step's Solution passes
// its own check on the real runtime (mingo, dynoxide in Node) through the runners the page uses, writes are graded on the
// state they leave, DynamoDB `expect` counts hold, every `viz:` name resolves to an ENG-VIZ diagram, the lesson index
// query keeps META_KEYS, and the NoSQL path's covered/ESR rules (moved here from tests/mongoPath.test.ts) grade right.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { META_KEYS, parseEngineLesson, type EngineLesson, type LessonSource } from '../src/engine/content';
import { DynamoEngine } from '../src/engine/dynamo/engine';
import { dynamoRunner, labOf, marshal, unmarshal } from '../src/engine/dynamo/runner';
import { rcuOne, rcuSum } from '../src/engine/dynamo/cost';
import type { DynamoRequest } from '../src/engine/dynamo/types';
import { loadDataset, runMongo } from '../src/engine/mongo/engineMongo';
import { followsEsr, isCovered } from '../src/engine/mongo/path';
import { followsRule, mongoRunner } from '../src/engine/mongo/runner';
import { gradeMongo } from '../src/engine/mongo/grade';
import { hasRealRun, mongoRows } from '../src/engine/predict';
import { resolveViz } from '../src/engine/viz/engineViz';
import { extensionsOf, replayOf } from '../src/engine/pglab/runner';
import { enginePathOf } from '../src/route';
import sourcesTs from '../src/engineSources.ts?raw';

const files = import.meta.glob<LessonSource>('../content/engine/*/{L*,ext}/*.md', { query: '?fm', import: 'default', eager: true });
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
  const short = { postgres: 'pg', mongodb: 'mg', dynamodb: 'dy', redis: 'rd', design: 'pg', stack: 'pg', olap: 'pg', search: 'pg', graph: 'pg' } as const;
  it.each(lessons.filter((l) => l.viz).map((l) => [l.id, l.viz!, l.engine] as const))('%s: %s', (_id, name, engine) => {
    const real = resolveViz(name, short[engine]);
    expect(real, name).toMatch(new RegExp(`^${short[engine]}-`));
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
  const r = mongoRunner({ lang }, { exec: async (src: string, ds: string, stages?: boolean) => runMongo(await loadDataset(ds), src, { stages }) });
  const labs = lessons.filter((l) => l.engine === 'mongodb' && l.lab && l.runtime !== 'docs');
  it.each(labs.map((l) => [l.id, l] as const))('%s', async (_id, l) => {
    await r.prepare(l.lab!);
    for (const [i, s] of l.lab!.steps.entries()) {
      expect(await r.check(l.lab!, s, s.solution), `step ${i + 1}`).toMatchObject({ ok: true });
      if (!s.error) await r.run(l.lab!, s.solution); // a "mong lỗi" step's Solution is the command MongoDB refuses
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

  // v25 (route R5): a step with a rule bar refuses its `slow:` answer, which gives the same documents (match-first) or is a
  // valid createIndex in the wrong order (esr), so the bar, not the result, is what stops it.
  it('thanh quy tắc: `slow:` trượt, lời giải qua; match-first cho cùng tài liệu', async () => {
    const barred = labs.flatMap((l) => l.lab!.steps.filter((s) => s.rule).map((s) => [l, s] as const));
    expect(barred.length).toBeGreaterThanOrEqual(6);
    for (const [l, s] of barred) {
      expect([l.id, followsRule(s, s.solution), followsRule(s, s.slow!)]).toEqual([l.id, true, false]);
      const v = await r.check(l.lab!, s, s.slow!);
      expect([l.id, v.ok]).toEqual([l.id, false]);
      expect([l.id, (v as { message?: string }).message]).toEqual([l.id, expect.stringContaining('not measured on a real MongoDB')]);
      if (s.rule === 'match-first') expect([l.id, gradeMongo(await r.exec(l.lab!, s.solution), await r.exec(l.lab!, s.slow!), { ordered: s.ordered }).ok]).toEqual([l.id, true]);
    }
  });

  // v29 R6 (product-route-v24 §4 R6 exit): every MongoDB capstone L3–L5 has ≥ 1 rule-bar step whose `slow:` fails.
  it('R6: mỗi capstone MongoDB L3–L5 có bước thanh quy tắc mà `slow:` trượt', async () => {
    const caps = labs.filter((l) => l.kind === 'capstone' && l.level >= 'L3');
    expect(caps.map((l) => l.id).sort()).toEqual(['e-mg-l3-18', 'e-mg-l4-14', 'e-mg-l5-10']);
    for (const l of caps) {
      const bars = l.lab!.steps.filter((s) => s.rule && s.slow);
      expect([l.id, bars.length > 0]).toEqual([l.id, true]);
      for (const s of bars) {
        expect([l.id, await r.check(l.lab!, s, s.solution)]).toEqual([l.id, expect.objectContaining({ ok: true })]);
        expect([l.id, await r.check(l.lab!, s, s.slow!)]).toEqual([l.id, expect.objectContaining({ ok: false })]);
      }
    }
  });

  // v30 R6 L1–L2: the L2 capstone has a match-first bar whose `slow:` fails. The L1 capstone (find, projection, CRUD) has
  // none on purpose: the three rules (match-first, esr, covered) need an aggregate or an index, which L1 does not teach yet.
  it('R6 L1–L2: capstone MongoDB L2 có bước thanh quy tắc mà `slow:` trượt; L1 không có dạng chậm tự nhiên', async () => {
    const caps = labs.filter((l) => l.kind === 'capstone' && l.level <= 'L2');
    expect(caps.map((l) => l.id).sort()).toEqual(['e-mg-l1-11', 'e-mg-l2-15']);
    expect(caps.find((l) => l.id === 'e-mg-l1-11')!.lab!.steps.some((s) => s.rule)).toBe(false);
    const l2 = caps.find((l) => l.id === 'e-mg-l2-15')!;
    const bars = l2.lab!.steps.filter((s) => s.rule && s.slow);
    expect(bars.length).toBeGreaterThan(0);
    for (const s of bars) {
      expect(await r.check(l2.lab!, s, s.solution)).toMatchObject({ ok: true });
      expect(await r.check(l2.lab!, s, s.slow!)).toMatchObject({ ok: false });
    }
  });

  it('"mong lỗi": bước có `error` chỉ đạt khi MongoDB từ chối đúng mã đó', async () => {
    const steps = labs.flatMap((l) => l.lab!.steps.filter((s) => s.error).map((s) => [l, s] as const));
    expect(steps.length).toBeGreaterThan(0);
    for (const [l, s] of steps) {
      await expect(r.exec(l.lab!, s.solution)).rejects.toMatchObject({ code: s.error });
      expect(await r.check(l.lab!, s, 'db.orders.countDocuments()')).toMatchObject({ ok: false, reason: 'wrong' });
      expect(await r.check(l.lab!, s, 'db.orders.insertOne({ a: ')).toMatchObject({ ok: false });
    }
  });

  it('"Xem thật" của predict MongoDB: câu được hỏi chạy trên dữ liệu của lab; Pipeline từng bước có số tài liệu mỗi stage', async () => {
    const ps = lessons.filter((l) => l.engine === 'mongodb' && l.predict && mongoRows(l));
    expect(ps.length).toBeGreaterThanOrEqual(4);
    for (const l of ps) {
      expect(hasRealRun(l)).toBe(true);
      const out = await r.run(l.lab!, l.predict!.sql);
      expect([l.id, out.columns.length > 0 || out.rows.length === 0]).toEqual([l.id, true]);
    }
    const l = lessons.find((x) => x.id === 'e-mg-l3-18')!;
    const out = await r.run(l.lab!, l.lab!.steps[3].solution);
    expect(out.meta?.pipeline?.map((x) => [x.stage, x.n])).toEqual([['$match', 7], ['$lookup', 7], ['$unwind', 7], ['$group', 2], ['$sort', 2]]);
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
    expect(marshal(marshal(v))).toEqual(marshal(v)); // idempotent
    expect(marshal({ SS: ['a', 'b'] })).toEqual({ SS: ['a', 'b'] });
  });
  it('setup items plain or already typed seed the same table', async () => {
    const table = { TableName: 'Tbl', KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }], AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }], BillingMode: 'PAY_PER_REQUEST' };
    const plain = JSON.stringify({ tables: [table], items: { Tbl: [{ id: 'a', n: 2, tags: ['x'] }] } });
    const typed = JSON.stringify({ tables: [table], items: { Tbl: [{ id: { S: 'a' }, n: { N: '2' }, tags: { L: [{ S: 'x' }] }, fmt: { SS: ['p', 'e'] } }] } });
    expect(labOf(typed).items!.Tbl[0]).toEqual({ id: { S: 'a' }, n: { N: '2' }, tags: { L: [{ S: 'x' }] }, fmt: { SS: ['p', 'e'] } });
    const r = dynamoRunner({ lang }, client as never);
    const scan = '{"op": "Scan", "input": {"TableName": "Tbl"}}';
    for (const setup of [plain, typed]) {
      const out = await r.run({ setup, steps: [] }, scan);
      expect(out.rows).toHaveLength(1);
      expect(out.meta?.count).toBe(1);
    }
  }, 60_000);
  const labs = lessons.filter((l) => l.engine === 'dynamodb' && l.lab && l.runtime !== 'docs');
  it.each(labs.map((l) => [l.id, l] as const))('%s', async (_id, l) => {
    const r = dynamoRunner({ lang }, client as never);
    await r.prepare(l.lab!);
    for (const [i, s] of l.lab!.steps.entries()) {
      expect(await r.check(l.lab!, s, s.solution), `step ${i + 1}`).toMatchObject({ ok: true });
      if (s.error) { // v26 "mong lỗi": the Solution is refused with that exception, and a request that runs is not a pass
        await expect(r.run(l.lab!, s.solution)).rejects.toMatchObject({ type: s.error });
        expect(await r.check(l.lab!, s, l.lab!.steps[0].solution)).toMatchObject({ ok: false });
        continue;
      }
      const out = await r.run(l.lab!, s.solution);
      expect(out.meta?.count, `step ${i + 1} count`).toBeTypeOf('number');
    }
  }, 60_000);
  // v26 route R5 (L381): a `perf:` step blocks the Scan answer. Its `slow:` gives the same items (it passes with the bar and
  // `expect` stripped), and the bar alone refuses it, with the measured counts in the sentence.
  const bars = labs.flatMap((l) => l.lab!.steps.flatMap((s, i) => (s.perf ? [[`${l.id}.s${i + 1}`, l, i] as const] : [])));
  it('R5: thanh chi phí trên mọi bước có câu Scan thay thế (sàn của route)', () => {
    expect(bars.length).toBeGreaterThanOrEqual(45);
    for (const id of ['e-dy-l1-08', 'e-dy-l1-09', 'e-dy-l2-02', 'e-dy-l3-04', 'e-dy-l3-05', 'e-dy-l3-06', 'e-dy-l1-11', 'e-dy-l3-11', 'e-dy-l4-14', 'e-dy-l5-07'])
      expect([id, bars.some(([, l]) => l.id === id)]).toEqual([id, true]);
  });
  it.each(bars)('%s: lời giải qua, slow: trượt vì thanh chi phí', async (_n, l, i) => {
    const r = dynamoRunner({ lang }, client as never);
    const s = l.lab!.steps[i];
    expect(s.slow).toBeTruthy();
    expect(await r.check(l.lab!, { ...s, perf: undefined, expect: undefined }, s.slow!)).toMatchObject({ ok: true });
    const v = await r.check(l.lab!, s, s.slow!);
    expect(v).toMatchObject({ ok: false, reason: 'wrong', why: 'slow' });
    expect(v.ok ? '' : v.message).toMatch(/ScannedCount|RCU|Scan/);
  }, 60_000);
  // v29 R6: every DynamoDB capstone L3–L5 has ≥ 1 cost-bar step whose `slow:` fails on the bar.
  it('R6: mỗi capstone DynamoDB L3–L5 có bước thanh chi phí mà `slow:` trượt', async () => {
    const caps = labs.filter((l) => l.kind === 'capstone' && l.level >= 'L3');
    expect(caps.map((l) => l.id).sort()).toEqual(['e-dy-l3-11', 'e-dy-l4-14', 'e-dy-l5-07']);
    const r = dynamoRunner({ lang }, client as never);
    for (const l of caps) {
      const bars = l.lab!.steps.filter((s) => s.perf && s.slow);
      expect([l.id, bars.length > 0]).toEqual([l.id, true]);
      for (const s of bars) expect([l.id, await r.check(l.lab!, s, s.slow!)]).toEqual([l.id, expect.objectContaining({ ok: false, why: 'slow' })]);
    }
  }, 120_000);
  // v30 R6 L1–L2: both DynamoDB capstones L1–L2 have a cost-bar step whose `slow:` (a filtered Scan) fails on the bar.
  it('R6 L1–L2: mỗi capstone DynamoDB L1–L2 có bước thanh chi phí mà `slow:` trượt', async () => {
    const caps = labs.filter((l) => l.kind === 'capstone' && l.level <= 'L2');
    expect(caps.map((l) => l.id).sort()).toEqual(['e-dy-l1-11', 'e-dy-l2-12']);
    const r = dynamoRunner({ lang }, client as never);
    for (const l of caps) {
      const bars = l.lab!.steps.filter((s) => s.perf && s.slow);
      expect([l.id, bars.length > 0]).toEqual([l.id, true]);
      for (const s of bars) {
        expect([l.id, await r.check(l.lab!, s, s.solution)]).toEqual([l.id, expect.objectContaining({ ok: true })]);
        expect([l.id, await r.check(l.lab!, s, s.slow!)]).toEqual([l.id, expect.objectContaining({ ok: false, why: 'slow' })]);
      }
    }
  }, 120_000);
  it('thanh không phạt đọc nhất quán mạnh; ReturnConsumedCapacity NONE không né được thanh', async () => {
    const r = dynamoRunner({ lang }, client as never);
    let strong = 0;
    for (const [n, l, i] of bars) {
      const s = l.lab!.steps[i];
      if (s.solution.trim().startsWith('{')) {
        const j = JSON.parse(s.solution) as { op: string; input: Record<string, unknown> };
        if (!j.input.IndexName) { // a GSI read cannot be strongly consistent
          expect([n, await r.check(l.lab!, s, JSON.stringify({ ...j, input: { ...j.input, ConsistentRead: true } }))]).toEqual([n, expect.objectContaining({ ok: true })]);
          strong++;
        }
      }
      if (s.slow!.trim().startsWith('{')) {
        const j = JSON.parse(s.slow!) as { op: string; input: Record<string, unknown> };
        expect([n, await r.check(l.lab!, s, JSON.stringify({ ...j, input: { ...j.input, ReturnConsumedCapacity: 'NONE' } }))]).toEqual([n, expect.objectContaining({ ok: false, why: 'slow' })]);
      }
    }
    expect(strong).toBeGreaterThan(20);
  }, 120_000);
  it('ghi bị từ chối: lỗi giữ tên exception, kèm ước tính có nhãn (không phải số đo)', async () => {
    const l = lessons.find((x) => x.id === 'e-dy-l4-15')!;
    const r = dynamoRunner({ lang }, client as never);
    const put = JSON.stringify({ op: 'PutItem', input: { TableName: 'Wallets', Item: { pk: { S: 'WALLET#w1' }, sk: { S: 'BALANCE' }, amount: { N: '0' } }, ConditionExpression: 'attribute_not_exists(pk)' } });
    await expect(r.run(l.lab!, put)).rejects.toMatchObject({ type: 'ConditionalCheckFailedException', message: expect.stringMatching(/about 1 WCU \(estimated by the rule.*does not report this number/) });
    await expect(r.run(l.lab!, l.lab!.steps[2].solution)).rejects.toMatchObject({ type: 'TransactionCanceledException', message: expect.stringMatching(/2 statements at least 4 WCU \(estimated by the rule\)/) });
  }, 60_000);
  it('bảng chi phí: số theo luật bằng số đo trên mọi lời giải đọc mà bảng tính lại', async () => {
    const r = dynamoRunner({ lang }, client as never);
    let n = 0;
    for (const l of labs) for (const s of l.lab!.steps) {
      if (s.error) continue;
      const out = await r.run(l.lab!, s.solution);
      const m = out.meta?.dynamo;
      if (!m || m.write || !m.capacity || !m.bytes.length || m.bytes.length !== out.meta?.count || (m.scanned ?? 0) > m.bytes.length) continue;
      const rule = ['GetItem', 'BatchGetItem', 'TransactGetItems'].includes(m.op) ? m.bytes.reduce((a, b) => a + rcuOne(b, m.mode), 0) : rcuSum(m.bytes, m.mode);
      expect([l.id, m.op, rule]).toEqual([l.id, m.op, m.capacity.total]);
      n++;
    }
    expect(n).toBeGreaterThan(30);
  }, 120_000);
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
