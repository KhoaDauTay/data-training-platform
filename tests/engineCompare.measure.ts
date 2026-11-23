// v28 E-CMP: measures every `run` fact of the compare page (src/engine/compare.ts) on the three real runtimes in Node:
// PGlite (the engine lab's session), mingo (runMongo) and dynoxide (DynamoEngine). tests/engineCompare.test.ts asserts the
// page's values equal what this returns, so no number on #/engine/compare comes from anywhere but a run here or a docs page.
import { vi } from 'vitest';
import { DynamoEngine } from '../src/engine/dynamo/engine';
import { readCost } from '../src/engine/dynamo/grade';
import type { DynamoLab, DynamoRequest } from '../src/engine/dynamo/types';
import { datasetOf, runMongo } from '../src/engine/mongo/engineMongo';
import { runLabScript } from '../src/engine/pglab/session';
import { CMP_ORDERS, CMP_STATUSES } from '../src/engine/compare';

type NodeProcess = { getBuiltinModule(m: string): unknown };
const node = (globalThis as unknown as { process: NodeProcess }).process;
const { readFile } = node.getBuiltinModule('fs/promises') as { readFile(p: string): Promise<Uint8Array<ArrayBuffer>> };
const { fileURLToPath } = node.getBuiltinModule('url') as { fileURLToPath(u: string): string };

/** The sample shop the page names: CMP_ORDERS orders, status by position, totals in steps of 100,000. */
const orders = Array.from({ length: CMP_ORDERS }, (_, i) => ({
  id: `O${String(i + 1).padStart(3, '0')}`, status: CMP_STATUSES[i % CMP_STATUSES.length],
  created: `2026-10-${String(1 + (i % 30)).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00:00Z`, total: ((i * 37) % 100 + 1) * 100_000,
}));
/** A9's four orders: one source sent its total as text. */
const MIXED: (number | string)[] = [6_000_000, '6500000', 7_000_000, 4_000_000];

const q = (op: DynamoRequest['op'], input: Record<string, unknown>): DynamoRequest => ({ op, input });
const S = (s: string) => ({ S: s });
const N = (n: number) => ({ N: String(n) });
const LAB: DynamoLab = {
  tables: [{
    TableName: 'Shop', BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [{ AttributeName: 'PK', AttributeType: 'S' }, { AttributeName: 'SK', AttributeType: 'S' }, { AttributeName: 'status', AttributeType: 'S' },
      { AttributeName: 'created', AttributeType: 'S' }, { AttributeName: 'channel', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'PK', KeyType: 'HASH' }, { AttributeName: 'SK', KeyType: 'RANGE' }],
    GlobalSecondaryIndexes: [
      { IndexName: 'byStatus', KeySchema: [{ AttributeName: 'status', KeyType: 'HASH' }, { AttributeName: 'created', KeyType: 'RANGE' }], Projection: { ProjectionType: 'ALL' } },
      { IndexName: 'byChannel', KeySchema: [{ AttributeName: 'channel', KeyType: 'HASH' }], Projection: { ProjectionType: 'KEYS_ONLY' } },
    ],
  }],
  items: {
    Shop: [
      ...orders.map((o) => ({ PK: S(`ORDER#${o.id}`), SK: S('ORDER'), status: S(o.status), created: S(o.created), total: N(o.total) })),
      ...MIXED.map((t, i) => ({ PK: S(`MIX#${i}`), SK: S('ORDER'), total: typeof t === 'number' ? N(t) : S(t) })),
      { PK: S('PROD#P1'), SK: S('STOCK'), stock: N(5) }, { PK: S('PROD#P2'), SK: S('STOCK'), stock: N(1) },
    ],
  },
};

async function dynamo(): Promise<DynamoEngine> {
  vi.spyOn(console, 'warn').mockImplementation(() => {}); // sqlite3 reports its OPFS VFS as unavailable (in memory here)
  const g = globalThis as Record<string, unknown>;
  g.self ??= globalThis;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.startsWith('file:')) return realFetch(input, init);
    return new Response(await readFile(fileURLToPath(url)), { headers: { 'content-type': 'application/wasm' } });
  };
  const eng = await DynamoEngine.open(() => import('@dynoxide/wasm-engine/worker'));
  await eng.setup('cmp', LAB);
  return eng;
}
/** The engine's error type (`ValidationException`, …), or 'ok'. */
const errName = async (p: Promise<unknown>): Promise<string> => p.then(() => 'ok', (e: unknown) => (e as { type?: string }).type ?? String(e));

/** Every measured fact: id → its values in page order. */
export async function measure(): Promise<Record<string, (string | number)[]>> {
  const out: Record<string, (string | number)[]> = {};
  out.shop = [CMP_ORDERS];
  out.stock = [5, 1, 2];
  const paid = orders.filter((o) => o.status === 'PAID').length;

  // ---- PostgreSQL (PGlite, a fresh lab database per script)
  const pgSetup = [
    'CREATE TABLE products (id text PRIMARY KEY, stock int NOT NULL CHECK (stock >= 0))',
    "INSERT INTO products VALUES ('P1', 5), ('P2', 1)",
    'CREATE TABLE orders (id text PRIMARY KEY, status text NOT NULL, created timestamptz NOT NULL, total numeric NOT NULL)',
    `INSERT INTO orders VALUES ${orders.map((o) => `('${o.id}', '${o.status}', '${o.created}', ${o.total})`).join(', ')}`,
    'ANALYZE orders',
  ].join(';\n');
  const tx = await runLabScript({ setup: pgSetup, steps: ['BEGIN', "UPDATE products SET stock = stock - 2 WHERE id = 'P1'",
    { sql: "UPDATE products SET stock = stock - 2 WHERE id = 'P2'", expectError: '23514' }, 'ROLLBACK', "SELECT stock FROM products ORDER BY id"] });
  out.pgTx = [tx.steps[2].error?.code ?? '', ...tx.steps[4].rows.map((r) => Number(r[0]))];
  const top = "SELECT id FROM orders WHERE status = 'PAID' ORDER BY created DESC, id DESC LIMIT 5";
  const pl = await runLabScript({ setup: pgSetup, steps: [`EXPLAIN (COSTS OFF) ${top}`, 'CREATE INDEX orders_status_created ON orders (status, created DESC, id DESC)', `EXPLAIN (COSTS OFF) ${top}`] });
  const scanOf = (rows: unknown[][]) => rows.map((r) => String(r[0]).trim()).find((l) => /Scan/.test(l))?.replace(/^->\s*/, '').replace(/ on .*| using .*/, '') ?? '';
  out.pgIndex = [scanOf(pl.steps[0].rows), scanOf(pl.steps[2].rows)];
  const add = await runLabScript({ setup: pgSetup, steps: ["SELECT pg_relation_filenode('orders')::text", "ALTER TABLE orders ADD COLUMN channel text NOT NULL DEFAULT 'store'",
    "SELECT pg_relation_filenode('orders')::text", "SELECT count(*) FROM orders WHERE channel = 'store'"] });
  out.pgAddColumn = [add.steps[0].rows[0][0] === add.steps[2].rows[0][0] ? 'same' : 'rewritten', Number(add.steps[3].rows[0][0])];
  const txt = await runLabScript({ setup: 'CREATE TABLE mixed (total numeric NOT NULL)', steps: [
    { sql: "INSERT INTO mixed VALUES ('6,500,000')", expectError: '22P02' },
    `INSERT INTO mixed VALUES ${MIXED.map((t) => (typeof t === 'number' ? `(${t})` : `('${t}')`)).join(', ')}`,
    'SELECT count(*) FROM mixed WHERE total > 5000000'] });
  if (txt.failedStep !== undefined || txt.setupError) throw new Error(JSON.stringify(txt).slice(0, 600));
  out.pgText = [txt.steps[0].error?.code ?? '', '6,500,000', String(MIXED[1]), MIXED.length, 5_000_000, Number(txt.steps[2].rows[0][0])];

  // ---- MongoDB (mingo through runMongo: one command per run, each on a fresh copy)
  const shop = datasetOf({ products: [{ _id: 'P1', stock: 5 }, { _id: 'P2', stock: 1 }], mixed: MIXED.map((total, i) => ({ _id: i + 1, total })),
    orders: orders.map((o) => ({ _id: o.id, status: o.status, created: { $date: o.created }, total: o.total })) });
  const first = runMongo(shop, 'db.products.updateOne({ _id: "P1", stock: { $gte: 2 } }, { $inc: { stock: -2 } })');
  const after1 = datasetOf({ products: first.docs, mixed: [] });
  const second = runMongo(after1, 'db.products.updateOne({ _id: "P2", stock: { $gte: 2 } }, { $inc: { stock: -2 } })');
  const stock = (id: string) => Number(second.docs.find((x) => x._id === id)?.stock);
  out.mgTx = [stock('P1'), stock('P2')];
  out.mgText = [Number(runMongo(shop, 'db.mixed.aggregate([{ $match: { total: { $gt: 5000000 } } }, { $count: "n" }])').docs[0]?.n ?? 0)];
  out.mgCountEmpty = [runMongo(shop, 'db.orders.aggregate([{ $match: { channel: "store" } }, { $count: "n" }])').docs.length];
  if ((runMongo(shop, 'db.orders.countDocuments({})') as { value?: unknown }).value !== CMP_ORDERS) throw new Error('orders not loaded into the Mongo dataset');

  // ---- DynamoDB (dynoxide)
  const eng = await dynamo();
  const get = (consistent: boolean) => eng.run(q('GetItem', { TableName: 'Shop', Key: { PK: S('ORDER#O001'), SK: S('ORDER') }, ConsistentRead: consistent }));
  out.dyRead = [readCost(await get(false)).rcu ?? -1, readCost(await get(true)).rcu ?? -1];
  out.dyGsiStrong = [await errName(eng.run(q('Query', { TableName: 'Shop', IndexName: 'byStatus', ConsistentRead: true, KeyConditionExpression: '#s = :s', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': S('PAID') } })))];
  const scan = await eng.run(q('Scan', { TableName: 'Shop', FilterExpression: '#s = :s', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': S('PAID') } }));
  const all = await eng.run(q('Scan', { TableName: 'Shop' }));
  const gsi = await eng.run(q('Query', { TableName: 'Shop', IndexName: 'byStatus', KeyConditionExpression: '#s = :s', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': S('PAID') } }));
  if (scan.Count !== paid || gsi.Count !== paid) throw new Error(`PAID ${paid}: scan ${scan.Count}, gsi ${gsi.Count}`);
  out.dyScanQuery = [scan.ScannedCount ?? -1, readCost(scan).rcu ?? -1, readCost(all).rcu ?? -1, gsi.ScannedCount ?? -1, readCost(gsi).rcu ?? -1];
  const tr = await eng.run(q('ExecuteTransaction', { TransactStatements: [
    { Statement: `UPDATE "Shop" SET stock = stock - 2 WHERE PK = 'PROD#P1' AND SK = 'STOCK' AND stock >= 2` },
    { Statement: `UPDATE "Shop" SET stock = stock - 2 WHERE PK = 'PROD#P2' AND SK = 'STOCK' AND stock >= 2` }] }), q('GetItem', { TableName: 'Shop', Key: { PK: S('PROD#P1'), SK: S('STOCK') } })).then(
    () => ['ok', '', -1], async (e: unknown) => {
      const reasons = /\[([^\]]*)\]\s*$/.exec((e as Error).message)?.[1] ?? '';
      const p1 = await eng.run(q('GetItem', { TableName: 'Shop', Key: { PK: S('PROD#P1'), SK: S('STOCK') } }));
      return [(e as { type?: string }).type ?? '', reasons, Number((p1.Items[0]?.stock as { N: string }).N)];
    });
  out.dyTx = tr as (string | number)[];
  const sparse = await eng.run(q('Query', { TableName: 'Shop', IndexName: 'byChannel', KeyConditionExpression: 'channel = :c', ExpressionAttributeValues: { ':c': S('store') } }));
  out.dySparse = [CMP_ORDERS, sparse.Count];
  const gt = await eng.run(q('Scan', { TableName: 'Shop', FilterExpression: 'begins_with(PK, :m) AND #t > :n', ExpressionAttributeNames: { '#t': 'total' }, ExpressionAttributeValues: { ':m': S('MIX#'), ':n': N(5_000_000) } }));
  out.dyText = [gt.Count];
  out.dyReserved = [await errName(eng.run(q('Scan', { TableName: 'Shop', FilterExpression: 'total > :n', ExpressionAttributeValues: { ':n': N(5_000_000) } })))];
  const page = await eng.run(q('Scan', { TableName: 'Shop', Limit: 20, FilterExpression: '#s = :s', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': S('PAID') } }));
  out.dyPage = [20, page.Count, page.LastEvaluatedKey ? 'more' : 'end'];
  return out;
}
