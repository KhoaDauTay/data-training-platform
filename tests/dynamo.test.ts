// ENG-DYNAMO: editor parser, item grader (pure) and the real dynoxide engine (wasm) in Node.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DynamoEngine, labProblem, MAX_LAB_ITEMS } from '../src/engine/dynamo/engine';
import { canonItem, gradeItems, readCost } from '../src/engine/dynamo/grade';
import { inputText, parseRequest } from '../src/engine/dynamo/request';
import { DynamoError, DynamoInputError, type DynamoLab, type DynamoRequest, type DynamoResult, type Item } from '../src/engine/dynamo/types';

const inputErr = (text: string) => {
  try {
    parseRequest(text);
  } catch (e) {
    return e as DynamoInputError;
  }
  throw new Error('parsed');
};

describe('parseRequest', () => {
  it('reads JSON requests and PartiQL', () => {
    expect(parseRequest('{ "op": "Scan", "input": { "TableName": "Shop" } }')).toEqual({ op: 'Scan', input: { TableName: 'Shop' } });
    expect(parseRequest('{ "op": "DescribeTable" }')).toEqual({ op: 'DescribeTable', input: {} });
    expect(parseRequest(`  SELECT * FROM "Shop" WHERE PK = 'C#1'\n`)).toEqual({ op: 'ExecuteStatement', input: { Statement: `SELECT * FROM "Shop" WHERE PK = 'C#1'` } });
  });
  it('refuses what is not a request, with a stable code', () => {
    expect(inputErr('  ').code).toBe('empty');
    expect(inputErr('{"op":"Scan"' + ' '.repeat(20_001) + '}').code).toBe('tooLong');
    expect(inputErr('{"op":"Scan","input":{}}x').code).toBe('json');
    expect(inputErr('{"op":"Scan","table":"x"}').code).toBe('shape');
    expect(inputErr('{"op":"DeleteTable","input":{"TableName":"Shop"}}').code).toBe('op');
    expect(inputErr('{"op":"constructor","input":{}}').code).toBe('op');
    expect(inputErr('{"op":"Scan","input":[]}').code).toBe('input');
  });
  it('points at the JSON error and at an untyped value', () => {
    const e = inputErr('{\n  "op": "Query",\n  "input": { "TableName": "Shop", }\n}');
    expect(e.code).toBe('json');
    expect(e.line).toBe(3);
    expect(inputText(e, 'en')).toMatch(/line 3, column \d+/);
    const u = inputErr('{"op":"Query","input":{"TableName":"Shop","KeyConditionExpression":"PK = :c","ExpressionAttributeValues":{":c":"CUST#1"}}}');
    expect(u.code).toBe('untyped');
    expect(inputText(u, 'vi')).toContain('ExpressionAttributeValues.:c');
    expect(inputErr('{"op":"GetItem","input":{"TableName":"Shop","Key":{"PK":{"S":"a","N":"1"}}}}').code).toBe('untyped');
    expect(inputErr('{"op":"PutItem","input":{"TableName":"Shop","Item":{"PK":{"X":"a"}}}}').code).toBe('untyped');
  });
});

const res = (Items: Item[], extra: Partial<DynamoResult> = {}): DynamoResult => ({ op: 'Query', Items, Count: Items.length, raw: { Items }, ms: 0, ...extra });
const a = { PK: { S: 'C#1' }, SK: { S: 'O#1' }, total: { N: '1.50' } };
const b = { PK: { S: 'C#1' }, SK: { S: 'O#2' }, tags: { SS: ['x', 'y'] } };

describe('gradeItems', () => {
  it('compares items as maps: attribute order, N by value, sets unordered', () => {
    expect(canonItem({ total: { N: '1.5' }, SK: { S: 'O#1' }, PK: { S: 'C#1' } })).toBe(canonItem(a));
    expect(canonItem({ ...b, tags: { SS: ['y', 'x'] } })).toBe(canonItem(b));
    expect(canonItem({ m: { M: { y: { N: '01' }, x: { S: 'a' } } } })).toBe(canonItem({ m: { M: { x: { S: 'a' }, y: { N: '1' } } } }));
    expect(canonItem({ l: { L: [{ N: '1' }, { N: '2' }] } })).not.toBe(canonItem({ l: { L: [{ N: '2' }, { N: '1' }] } }));
    expect(canonItem({ v: { S: '1' } })).not.toBe(canonItem({ v: { N: '1' } })); // the type counts
  });
  it('is a multiset unless ordered', () => {
    expect(gradeItems(res([b, a]), res([a, b]))).toEqual({ ok: true });
    expect(gradeItems(res([b, a]), res([a, b]), { ordered: true })).toMatchObject({ ok: false, why: 'order' });
    expect(gradeItems(res([a]), res([a, b]))).toEqual({ ok: false, why: 'items', missing: [b], extra: [] });
    expect(gradeItems(res([a, a]), res([a]))).toEqual({ ok: false, why: 'items', missing: [], extra: [a] });
  });
  it('grades Count for Select COUNT and `after` for writes', () => {
    const count = (n: number) => res([], { Count: n, raw: { Count: n, ScannedCount: 9 } });
    expect(gradeItems(count(3), count(3))).toEqual({ ok: true });
    expect(gradeItems(count(2), count(3))).toEqual({ ok: false, why: 'count', expected: 3, actual: 2 });
    expect(gradeItems(res([], { after: [a, b] }), res([], { after: [b, a] }))).toEqual({ ok: true });
    expect(gradeItems(res([], { after: [a] }), res([], { after: [a, b] }))).toMatchObject({ ok: false, why: 'items' });
  });
  it('turns a right answer read the expensive way into a weak pass', () => {
    const scan = res([a], { op: 'Scan', ScannedCount: 200, ConsumedCapacity: { TableName: 'Shop', CapacityUnits: 6.5 } });
    expect(readCost(scan)).toEqual({ count: 1, scanned: 200, rcu: 6.5 });
    expect(gradeItems(scan, res([a]), { noScan: true })).toEqual({ ok: true, weak: 'scan' });
    expect(gradeItems({ ...scan, op: 'Query' }, res([a]), { maxScanned: 10 })).toEqual({ ok: true, weak: 'scanned' });
    expect(gradeItems({ ...scan, op: 'Query', ScannedCount: 1 }, res([a]), { maxScanned: 10, maxRcu: 1 })).toEqual({ ok: true, weak: 'rcu' });
    expect(readCost(res([], { ConsumedCapacity: [{ CapacityUnits: 0.5 }, { CapacityUnits: 1 }] })).rcu).toBe(1.5);
  });
});

describe('labProblem', () => {
  it('refuses empty and oversized labs', () => {
    expect(labProblem({ tables: [] })).toBeUndefined(); // L247: a CreateTable lab starts with no table
    expect(labProblem({ tables: Array.from({ length: 11 }, () => ({})) })).toBeDefined();
    expect(labProblem({ tables: [{}], items: { T: Array.from({ length: MAX_LAB_ITEMS + 1 }, () => ({})) } })).toMatch(/items/);
    expect(labProblem({ tables: [{}], items: { T: [] } })).toBeUndefined();
  });
});

// ---- the real engine (dynoxide 1.5.0 wasm) in this Node process ----
// Its worker script resolves both .wasm with new URL(…, import.meta.url) = file:// URLs, which Node's fetch refuses.
type NodeProcess = { getBuiltinModule(id: string): unknown };
const node = (globalThis as unknown as { process: NodeProcess }).process;
const { readFile } = node.getBuiltinModule('fs/promises') as { readFile(p: string): Promise<Uint8Array<ArrayBuffer>> };
const { fileURLToPath } = node.getBuiltinModule('url') as { fileURLToPath(u: string): string };

const LAB: DynamoLab = {
  tables: [{
    TableName: 'Shop', BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [{ AttributeName: 'PK', AttributeType: 'S' }, { AttributeName: 'SK', AttributeType: 'S' }, { AttributeName: 'status', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'PK', KeyType: 'HASH' }, { AttributeName: 'SK', KeyType: 'RANGE' }],
    GlobalSecondaryIndexes: [{ IndexName: 'byStatus', KeySchema: [{ AttributeName: 'status', KeyType: 'HASH' }, { AttributeName: 'SK', KeyType: 'RANGE' }], Projection: { ProjectionType: 'ALL' } }],
  }],
  items: {
    Shop: Array.from({ length: 60 }, (_, i) => ({
      PK: { S: `CUST#${i % 6}` }, SK: { S: `ORDER#2026-${String(1 + (i % 10)).padStart(2, '0')}#${String(i).padStart(3, '0')}` },
      status: { S: ['paid', 'shipped', 'cancelled'][i % 3] }, total: { N: String((i * 37) % 100) },
    })),
  },
};
const q = (op: DynamoRequest['op'], input: Record<string, unknown>): DynamoRequest => ({ op, input });
const byCust = (c: string) => q('Query', { TableName: 'Shop', KeyConditionExpression: 'PK = :c', ExpressionAttributeValues: { ':c': { S: c } } });

describe('DynamoEngine (dynoxide wasm in Node)', () => {
  let eng: DynamoEngine;
  const realFetch = globalThis.fetch;
  beforeAll(async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {}); // sqlite3 reports its OPFS VFS as unavailable (we run in memory)
    const g = globalThis as Record<string, unknown>;
    g.self ??= globalThis;
    globalThis.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!url.startsWith('file:')) return realFetch(input, init);
      return new Response(await readFile(fileURLToPath(url)), { headers: { 'content-type': 'application/wasm' } });
    };
    eng = await DynamoEngine.open(() => import('@dynoxide/wasm-engine/worker'));
    await eng.setup('shop', LAB);
  });
  afterAll(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it('runs Query, Scan, GetItem, PartiQL with counts and capacity', async () => {
    const query = await eng.run(byCust('CUST#1'));
    expect(query).toMatchObject({ op: 'Query', Count: 10, ScannedCount: 10 });
    expect(readCost(query).rcu).toBeGreaterThan(0);
    const scan = await eng.run(q('Scan', { TableName: 'Shop', FilterExpression: 'PK = :c', ExpressionAttributeValues: { ':c': { S: 'CUST#1' } } }));
    expect(scan).toMatchObject({ Count: 10, ScannedCount: 60 });
    // Query vs Scan: same items, the Scan read every item and is a weak pass.
    expect(gradeItems(scan, query, { noScan: true })).toEqual({ ok: true, weak: 'scan' });
    expect(gradeItems(query, scan, { noScan: true, maxScanned: 10 })).toEqual({ ok: true });
    const get = await eng.run(q('GetItem', { TableName: 'Shop', Key: { PK: { S: 'CUST#1' }, SK: { S: 'ORDER#2026-02#001' } } }));
    expect(get.Items).toHaveLength(1);
    expect((await eng.run(q('GetItem', { TableName: 'Shop', Key: { PK: { S: 'X' }, SK: { S: 'Y' } } }))).Items).toEqual([]);
    const pq = await eng.run(parseRequest(`SELECT * FROM "Shop" WHERE PK = 'CUST#1'`));
    expect(pq.Count).toBe(10);
    expect(pq.ScannedCount).toBeUndefined();
    expect(gradeItems(pq, query)).toEqual({ ok: true });
    const gsi = await eng.run(q('Query', { TableName: 'Shop', IndexName: 'byStatus', KeyConditionExpression: '#s = :s', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': { S: 'paid' } }, Select: 'COUNT' }));
    expect(gsi).toMatchObject({ Count: 20, Items: [] });
    const page = await eng.run(q('Scan', { TableName: 'Shop', Limit: 7 }));
    expect(page.Count).toBe(7);
    expect(page.LastEvaluatedKey).toBeDefined();
    const batch = await eng.run(q('BatchGetItem', { RequestItems: { Shop: { Keys: [{ PK: { S: 'CUST#1' }, SK: { S: 'ORDER#2026-02#001' } }] } } }));
    expect(batch.Items).toHaveLength(1);
    expect(((await eng.run(q('DescribeTable', { TableName: 'Shop' }))).raw as { Table: { ItemCount: number } }).Table).toBeDefined();
  });

  it('starts every run from the pristine lab: writes are re-seeded away', async () => {
    const put = await eng.run(q('PutItem', { TableName: 'Shop', Item: { PK: { S: 'CUST#1' }, SK: { S: 'ORDER#2027' } } }), byCust('CUST#1'));
    expect(put.after).toHaveLength(11);
    expect((await eng.run(byCust('CUST#1'))).Count).toBe(10);
    const upd = await eng.run(q('UpdateItem', { TableName: 'Shop', Key: { PK: { S: 'CUST#1' }, SK: { S: 'ORDER#2026-02#001' } }, UpdateExpression: 'SET #t = #t + :d', ExpressionAttributeNames: { '#t': 'total' }, ExpressionAttributeValues: { ':d': { N: '5' } }, ReturnValues: 'ALL_NEW' }));
    expect(upd.Items[0].total).toEqual({ N: '42' });
    const del = await eng.run(q('DeleteItem', { TableName: 'Shop', Key: { PK: { S: 'CUST#1' }, SK: { S: 'ORDER#2026-02#001' } } }), byCust('CUST#1'));
    expect(del.after).toHaveLength(9);
    const bw = await eng.run(q('BatchWriteItem', { RequestItems: { Shop: [{ DeleteRequest: { Key: { PK: { S: 'CUST#1' }, SK: { S: 'ORDER#2026-02#001' } } } }] } }));
    expect(bw.raw).toMatchObject({ UnprocessedItems: {} });
    await eng.run(parseRequest(`DELETE FROM "Shop" WHERE PK = 'CUST#1' AND SK = 'ORDER#2026-02#001'`));
    await eng.run(q('CreateTable', { TableName: 'Mine', BillingMode: 'PAY_PER_REQUEST', AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }], KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }] }));
    expect((await eng.run(byCust('CUST#1'))).Count).toBe(10);
    expect(((await eng.exec('ListTables', {})).TableNames as string[])).toEqual(['Shop']);
  });

  it('reports DynamoDB errors by exception name', async () => {
    const err = (req: DynamoRequest) => eng.run(req).then(() => undefined, (e: DynamoError) => [e.name, e.type]);
    expect(await err(q('PutItem', { TableName: 'Shop', Item: { PK: { S: 'CUST#1' }, SK: { S: 'ORDER#2026-02#001' } }, ConditionExpression: 'attribute_not_exists(PK)' })))
      .toEqual(['DynamoError', 'ConditionalCheckFailedException']);
    expect(await err(q('GetItem', { TableName: 'Shop', Key: { PK: { N: '1' }, SK: { S: 'x' } } }))).toEqual(['DynamoError', 'ValidationException']);
    expect(await err(q('Scan', { TableName: 'Nope' }))).toEqual(['DynamoError', 'ResourceNotFoundException']);
    // `total` is a reserved word: DynamoDB refuses it without an #alias, so does the engine (a lesson in itself).
    expect(await err(q('Scan', { TableName: 'Shop', FilterExpression: 'total > :x', ExpressionAttributeValues: { ':x': { N: '1' } } }))).toEqual(['DynamoError', 'ValidationException']);
    expect(await err(parseRequest('SELEC * FROM "Shop"'))).toEqual(['DynamoError', 'ValidationException']);
  });

  it('refuses a broken lab clearly', async () => {
    await expect(eng.setup('bad', { tables: [{ TableName: 'x' }] })).rejects.toMatchObject({ name: 'LabFailedError' });
    await eng.setup('shop', LAB);
    expect((await eng.run(byCust('CUST#1'))).Count).toBe(10);
  });
});
