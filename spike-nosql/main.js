// Spike page: runs a fixed benchmark for mingo (Mongo) and dynoxide (DynamoDB), then offers an editor box.
import { EngineClient } from '@dynoxide/wasm-engine';

const out = document.getElementById('out');
const log = (x) => { out.textContent += (typeof x === 'string' ? x : JSON.stringify(x)) + '\n'; };
const R = (window.__results = { mongo: {}, dynamo: {}, done: false });
const tPage = performance.now();

// ---------- MongoDB (mingo) ----------
const mw = new Worker('./mongo-worker.js', { type: 'module' });
let seq = 0; const wait = new Map();
const mongoReady = new Promise((res) => mw.addEventListener('message', ({ data }) => {
  if (data.ready) return res(data);
  wait.get(data.id)?.(data); wait.delete(data.id);
}));
const mongo = (src) => new Promise((res) => { const id = ++seq; wait.set(id, res); mw.postMessage({ id, src }); });

const MONGO = {
  find_filter_sort: `db.orders.find({ status: 'paid', 'items.qty': { $gte: 4 } }, { _id: 1, createdAt: 1 }).sort({ createdAt: -1, _id: 1 }).limit(10)`,
  find_regex_in: `db.customers.find({ name: /99$/, city: { $in: ['Hue', 'Da Nang'] } })`,
  group_unwind: `db.orders.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $unwind: '$items' }, { $group: { _id: '$items.sku', revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } } } }, { $sort: { revenue: -1, _id: 1 } }, { $limit: 5 }])`,
  lookup_20k: `db.orders.aggregate([{ $match: { status: 'paid' } }, { $lookup: { from: 'customers', localField: 'customerId', foreignField: '_id', as: 'c' } }, { $unwind: '$c' }, { $group: { _id: '$c.city', n: { $sum: 1 } } }, { $sort: { _id: 1 } }])`,
  window_fields: `db.orders.aggregate([{ $group: { _id: { $month: '$createdAt' }, n: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $setWindowFields: { sortBy: { _id: 1 }, output: { running: { $sum: '$n', window: { documents: ['unbounded', 'current'] } }, prev: { $shift: { output: '$n', by: -1 } } } } }])`,
  facet_bucket: `db.orders.aggregate([{ $facet: { byStatus: [{ $sortByCount: '$status' }], promo: [{ $match: { tags: 'promo' } }, { $count: 'n' }] } }])`,
  update_many: `db.orders.updateMany({ status: 'paid', customerId: { $lt: 100 } }, { $set: { vip: true }, $inc: { _rev: 1 } })`,
  count: `db.orders.countDocuments({ createdAt: { $gte: ISODate('2026-06-01') } })`,
  explain: `db.orders.find({ customerId: 7 }).explain()`,
  error_unknown_op: `db.orders.find({ total: { $foo: 1 } })`,
  error_ns: `db.nope.find({})`,
};

async function benchMongo() {
  const r = await mongoReady;
  R.mongo.ready = { pageToReadyMs: performance.now() - tPage, workerMs: r.bootMs, seedMs: r.seedMs, docs: r.docs };
  for (const [k, src] of Object.entries(MONGO)) {
    const times = []; let last;
    for (let i = 0; i < 5; i++) { last = await mongo(src); times.push(last.ms); }
    times.sort((a, b) => a - b);
    R.mongo[k] = { ok: last.ok, n: last.n, medianMs: +times[2].toFixed(2), firstMs: +times[0].toFixed(2), error: last.error, sample: last.sample?.[0] };
  }
}

// ---------- DynamoDB (dynoxide wasm) ----------
async function benchDynamo() {
  const t = performance.now();
  const c = new EngineClient({ assetBase: new URL('./dynoxide/', location.href), ephemeral: true });
  const boot = await c.ready();
  const D = R.dynamo; D.ready = { ms: performance.now() - t, ...boot };
  const time = async (k, op, req, expectErr) => {
    const s = performance.now();
    try { const res = await c.execute(op, req); D[k] = { ok: !expectErr, ms: +(performance.now() - s).toFixed(2), count: res?.Count ?? res?.Items?.length, item: res?.Item ?? res?.Items?.[0] }; return res; }
    catch (e) { D[k] = { ok: !!expectErr, ms: +(performance.now() - s).toFixed(2), error: (e.type || '') + ' ' + String(e.message || e).slice(0, 160) }; }
  };
  await time('create_table', 'CreateTable', {
    TableName: 'Orders', BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }, { AttributeName: 'sk', AttributeType: 'S' }, { AttributeName: 'status', AttributeType: 'S' }, { AttributeName: 'total', AttributeType: 'N' }],
    KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }, { AttributeName: 'sk', KeyType: 'RANGE' }],
    GlobalSecondaryIndexes: [{ IndexName: 'byStatus', KeySchema: [{ AttributeName: 'status', KeyType: 'HASH' }, { AttributeName: 'sk', KeyType: 'RANGE' }], Projection: { ProjectionType: 'ALL' } }],
    LocalSecondaryIndexes: [{ IndexName: 'byTotal', KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }, { AttributeName: 'total', KeyType: 'RANGE' }], Projection: { ProjectionType: 'KEYS_ONLY' } }],
  });
  // 10,000 orders for 500 customers, 25 per BatchWriteItem (the API limit).
  const s = performance.now();
  for (let b = 0; b < 400; b++) {
    const reqs = [];
    for (let j = 0; j < 25; j++) {
      const i = b * 25 + j;
      reqs.push({ PutRequest: { Item: { pk: { S: `CUST#${i % 500}` }, sk: { S: `ORDER#2026-${String(1 + (i % 10)).padStart(2, '0')}#${i}` }, status: { S: ['paid', 'shipped', 'cancelled'][i % 3] }, total: { N: String((i * 37) % 1000) } } } });
    }
    await c.execute('BatchWriteItem', { RequestItems: { Orders: reqs } });
  }
  D.load_10k = { ms: +(performance.now() - s).toFixed(0), calls: 400 };
  await time('get_item', 'GetItem', { TableName: 'Orders', Key: { pk: { S: 'CUST#7' }, sk: { S: 'ORDER#2026-08#7' } } });
  await time('query_begins_with', 'Query', { TableName: 'Orders', KeyConditionExpression: 'pk = :p AND begins_with(sk, :m)', ExpressionAttributeValues: { ':p': { S: 'CUST#7' }, ':m': { S: 'ORDER#2026-08' } } });
  await time('query_filter_desc', 'Query', { TableName: 'Orders', KeyConditionExpression: 'pk = :p', FilterExpression: '#t > :x', ExpressionAttributeNames: { '#t': 'total' }, ExpressionAttributeValues: { ':p': { S: 'CUST#7' }, ':x': { N: '500' } }, ScanIndexForward: false, Limit: 5 });
  await time('query_gsi', 'Query', { TableName: 'Orders', IndexName: 'byStatus', KeyConditionExpression: '#s = :s', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': { S: 'cancelled' } }, Select: 'COUNT' });
  await time('query_lsi', 'Query', { TableName: 'Orders', IndexName: 'byTotal', KeyConditionExpression: 'pk = :p AND #t BETWEEN :a AND :b', ExpressionAttributeNames: { '#t': 'total' }, ExpressionAttributeValues: { ':p': { S: 'CUST#7' }, ':a': { N: '100' }, ':b': { N: '600' } } });
  await time('scan_filter', 'Scan', { TableName: 'Orders', FilterExpression: '#t >= :x', ExpressionAttributeNames: { '#t': 'total' }, ExpressionAttributeValues: { ':x': { N: '990' } }, Select: 'COUNT' });
  await time('put_conditional_fail', 'PutItem', { TableName: 'Orders', Item: { pk: { S: 'CUST#7' }, sk: { S: 'ORDER#2026-08#7' } }, ConditionExpression: 'attribute_not_exists(pk)' }, true);
  await time('update_expr', 'UpdateItem', { TableName: 'Orders', Key: { pk: { S: 'CUST#7' }, sk: { S: 'ORDER#2026-08#7' } }, UpdateExpression: 'SET #t = #t + :d ADD visits :one', ConditionExpression: '#s = :paid OR #s = :sh', ExpressionAttributeNames: { '#t': 'total', '#s': 'status' }, ExpressionAttributeValues: { ':d': { N: '5' }, ':one': { N: '1' }, ':paid': { S: 'paid' }, ':sh': { S: 'shipped' } }, ReturnValues: 'ALL_NEW' });
  await time('partiql_select', 'ExecuteStatement', { Statement: `SELECT * FROM "Orders" WHERE pk = 'CUST#7'` });
  await time('transact_write', 'TransactWriteItems', { TransactItems: [{ Put: { TableName: 'Orders', Item: { pk: { S: 'X' }, sk: { S: 'Y' } } } }] });
  await time('bad_key_type', 'GetItem', { TableName: 'Orders', Key: { pk: { N: '7' }, sk: { S: 'x' } } }, true);
  // Teaching probes: the "EXPLAIN" of DynamoDB is ScannedCount vs Count, consumed capacity and paging.
  const sc = await c.execute('Scan', { TableName: 'Orders', FilterExpression: '#t >= :x', ExpressionAttributeNames: { '#t': 'total' }, ExpressionAttributeValues: { ':x': { N: '990' } }, ReturnConsumedCapacity: 'TOTAL', Limit: 1000 });
  D.scan_cost = { Count: sc.Count, ScannedCount: sc.ScannedCount, ConsumedCapacity: sc.ConsumedCapacity, hasLEK: !!sc.LastEvaluatedKey };
  const qc = await c.execute('Query', { TableName: 'Orders', KeyConditionExpression: 'pk = :p', ExpressionAttributeValues: { ':p': { S: 'CUST#7' } }, ReturnConsumedCapacity: 'INDEXES', Limit: 7 });
  const q2 = await c.execute('Query', { TableName: 'Orders', KeyConditionExpression: 'pk = :p', ExpressionAttributeValues: { ':p': { S: 'CUST#7' } }, Limit: 7, ExclusiveStartKey: qc.LastEvaluatedKey });
  D.query_cost = { Count: qc.Count, ConsumedCapacity: qc.ConsumedCapacity, page2: q2.Count, page2HasLEK: !!q2.LastEvaluatedKey };
  await time('partiql_txn', 'ExecuteTransaction', { TransactStatements: [{ Statement: `INSERT INTO "Orders" VALUE {'pk': 'T', 'sk': '1'}` }, { Statement: `UPDATE "Orders" SET total = 1 WHERE pk = 'CUST#7' AND sk = 'ORDER#2026-08#7'` }] });
  // Seed cost: single PutItem per call vs BatchWriteItem of 25.
  let s2 = performance.now();
  for (let i = 0; i < 200; i++) await c.execute('PutItem', { TableName: 'Orders', Item: { pk: { S: 'P' }, sk: { S: String(i) } } });
  D.put_single_200 = { ms: +(performance.now() - s2).toFixed(0) };
  // Reset options: DeleteTable + CreateTable, or a fresh worker.
  s2 = performance.now();
  await c.execute('DeleteTable', { TableName: 'Orders' });
  await c.execute('CreateTable', { TableName: 'Orders', BillingMode: 'PAY_PER_REQUEST', AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }], KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }] });
  D.reset_drop_create = { ms: +(performance.now() - s2).toFixed(1) };
  s2 = performance.now();
  const c2 = new EngineClient({ assetBase: new URL('./dynoxide/', location.href), ephemeral: true, name: 'second' });
  await c2.ready();
  D.reset_new_worker = { ms: +(performance.now() - s2).toFixed(1) };
}

(async () => {
  try { await benchMongo(); } catch (e) { R.mongo.fatal = String(e); }
  try { await benchDynamo(); } catch (e) { R.dynamo.fatal = String(e && e.stack || e); }
  R.done = true; log(R);
})();

// Editor-like box for manual tries.
document.getElementById('run').onclick = async () => log(await mongo(document.getElementById('src').value));
