import { beforeAll, describe, expect, it } from 'vitest';
import { loadDataset, runMongo, type Dataset } from '../src/engine/mongo/engineMongo';
import { MongoRunError, type MongoDoc } from '../src/engine/mongo/types';

let ds: Dataset;
beforeAll(async () => {
  ds = await loadDataset('shop');
});
const run = (src: string) => runMongo(ds, src);
const docs = (src: string) => run(src).docs as MongoDoc[];

describe('Mongo lab engine (mingo) on the shop dataset', () => {
  it('seed: ngày được khôi phục thành Date, null khác thiếu trường', () => {
    const c = ds.collections;
    expect(Object.keys(c).sort()).toEqual(['customers', 'orders', 'products']);
    expect([c.products.length, c.customers.length, c.orders.length]).toEqual([16, 24, 80]);
    expect(c.orders[0].createdAt).toBeInstanceOf(Date);
    expect(run(`db.customers.countDocuments({ email: null })`).value).toBe(6); // 3 null + 3 missing
    expect(run(`db.customers.countDocuments({ email: { $exists: false } })`).value).toBe(3);
    expect(run(`db.customers.countDocuments({ email: { $type: "null" } })`).value).toBe(3);
  });

  it('find: lọc mảng lồng, projection, sort → skip → limit theo thứ tự mongosh', () => {
    const out = docs(`db.orders.find({ "items.qty": { $gte: 4 }, status: "paid" }, { _id: 1 }).limit(3).sort({ _id: -1 }).skip(1)`);
    const all = ds.collections.orders.filter((o) => o.status === 'paid' && (o.items as MongoDoc[]).some((i) => (i.qty as number) >= 4)).map((o) => o._id as number).sort((a, b) => b - a);
    expect(out).toEqual(all.slice(1, 4).map((_id) => ({ _id })));
    expect(docs(`db.orders.findOne({ _id: 1001 })`)).toHaveLength(1);
    expect(docs(`db.customers.find({ name: /^customer 1/i }).limit(0)`).length).toBe(11);
    expect(docs(`db.orders.find({ createdAt: { $gte: ISODate("2026-10-01") } })`).every((o) => (o.createdAt as Date) >= new Date('2026-10-01'))).toBe(true);
  });

  it('countDocuments và distinct (sắp xếp)', () => {
    expect(run(`db.orders.countDocuments({ status: "cancelled" })`).value).toBe(ds.collections.orders.filter((o) => o.status === 'cancelled').length);
    expect(run(`db.orders.countDocuments()`).value).toBe(80);
    expect(run(`db.products.distinct("category")`).value).toEqual(['book', 'cake', 'tea', 'toy']);
    expect(run(`db.products.distinct("tags", { category: "tea" })`).value).toEqual(['gift', 'new', 'sale']);
  });

  it('$match $project $group $sort trả tổng tiền theo trạng thái', () => {
    const out = docs(`db.orders.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      { $group: { _id: "$status", revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } }, orders: { $addToSet: "$_id" } } },
      { $project: { _id: 0, status: "$_id", revenue: 1, n: { $size: "$orders" } } },
      { $sort: { status: 1 } }
    ])`);
    expect(out.map((d) => d.status)).toEqual(['paid', 'shipped']);
    let paid = 0;
    for (const o of ds.collections.orders) if (o.status === 'paid') for (const i of o.items as MongoDoc[]) paid += (i.qty as number) * (i.price as number);
    expect(out[0].revenue).toBe(paid);
    expect(Object.keys(out[0]).sort()).toEqual(['n', 'revenue', 'status']);
  });

  it('$lookup + $unwind nối khách hàng', () => {
    const out = docs(`db.orders.aggregate([
      { $match: { _id: 1001 } },
      { $lookup: { from: "customers", localField: "customerId", foreignField: "_id", as: "c" } },
      { $unwind: "$c" },
      { $project: { _id: 0, city: "$c.city" } }
    ])`);
    const o = ds.collections.orders[0];
    expect(out).toEqual([{ city: ds.collections.customers.find((c) => c._id === o.customerId)!.city }]);
  });

  it('$setWindowFields: tổng chạy theo khách hàng', () => {
    const out = docs(`db.orders.aggregate([
      { $match: { customerId: 1 } },
      { $set: { n: { $size: "$items" } } },
      { $setWindowFields: { partitionBy: "$customerId", sortBy: { _id: 1 }, output: { running: { $sum: "$n", window: { documents: ["unbounded", "current"] } } } } },
      { $project: { _id: 1, n: 1, running: 1 } }
    ])`);
    let sum = 0;
    for (const d of out) {
      sum += d.n as number;
      expect(d.running).toBe(sum);
    }
  });

  it('$facet + $bucket + $sortByCount + $count', () => {
    const [f] = docs(`db.products.aggregate([{ $facet: {
      byPrice: [{ $bucket: { groupBy: "$price", boundaries: [0, 40, 60, 1000], default: "other", output: { n: { $sum: 1 } } } }],
      byCat: [{ $sortByCount: "$category" }],
      total: [{ $count: "n" }]
    } }])`);
    expect(f.total).toEqual([{ n: 16 }]);
    expect((f.byPrice as MongoDoc[]).reduce((s, b) => s + (b.n as number), 0)).toBe(16);
    expect((f.byCat as MongoDoc[]).map((b) => b.count)).toEqual([4, 4, 4, 4]);
  });

  it('ghi chạy trên bản sao: trả trạng thái sau khi ghi, seed không đổi', () => {
    const before = JSON.stringify(ds.collections.products);
    const ins = run(`db.products.insertOne({ _id: "P99", name: "new tea", price: 10 })`);
    expect(ins.kind).toBe('write');
    expect(ins.ack).toEqual({ acknowledged: true, insertedId: 'P99' });
    expect(ins.docs).toHaveLength(17);
    const many = run(`db.products.insertMany([{ name: "a" }, { name: "b" }])`);
    expect((many.ack!.insertedIds as string[]).every((id) => /^[0-9a-f]{24}$/.test(id))).toBe(true);
    expect(() => run(`db.products.insertOne({ _id: "P01" })`)).toThrow(/E11000/);

    const up = run(`db.products.updateMany({ category: "tea" }, { $inc: { price: 5 }, $push: { tags: "hot" } })`);
    expect(up.ack).toMatchObject({ matchedCount: 4, modifiedCount: 4 });
    expect(up.docs.filter((d) => (d.tags as string[] | undefined)?.includes('hot'))).toHaveLength(4);
    const one = run(`db.products.updateOne({ category: "tea" }, { $set: { price: 1 } })`);
    expect(one.ack).toMatchObject({ matchedCount: 1, modifiedCount: 1 });
    const pipe = run(`db.products.updateMany({}, [{ $set: { label: { $concat: ["$category", ":", "$name"] } } }, { $unset: "tags" }])`);
    expect(pipe.docs.every((d) => typeof d.label === 'string' && !('tags' in d))).toBe(true);
    const ups = run(`db.products.updateOne({ _id: "P77", category: "map" }, { $set: { price: 9 } }, { upsert: true })`);
    expect(ups.ack).toMatchObject({ matchedCount: 0, upsertedCount: 1, upsertedId: 'P77' });
    expect(ups.docs.at(-1)).toEqual({ _id: 'P77', category: 'map', price: 9 });
    const del = run(`db.products.deleteMany({ price: { $gte: 50 } })`);
    expect(del.docs.every((d) => (d.price as number) < 50)).toBe(true);
    expect(run(`db.products.deleteOne({ category: "toy" })`).ack).toEqual({ acknowledged: true, deletedCount: 1 });
    expect(JSON.stringify(ds.collections.products)).toBe(before);
  });

  it('createIndex chỉ ghi metadata; getIndexes', () => {
    const r = run(`db.customers.createIndex({ city: 1, tier: -1 }, { name: "city_tier" })`);
    expect(r.kind).toBe('index');
    expect(r.docs.map((i) => i.name)).toEqual(['_id_', 'city_tier']);
    expect(run(`db.customers.createIndex({ email: 1 })`).ack).toEqual({ createdIndex: 'email_1' });
    expect(run(`db.customers.getIndexes()`).docs).toHaveLength(1);
  });

  it('lỗi chạy: toán tử lạ, update thiếu $, script tắt, collection lạ trả rỗng', () => {
    expect(() => run(`db.orders.find({ a: { $foo: 1 } })`)).toThrow(MongoRunError);
    expect(() => run(`db.orders.updateOne({}, { status: "x" })`)).toThrow(/atomic operators/);
    expect(() => run(`db.orders.find({}, {}, {})`)).toThrow(/at most 2/);
    expect(() => run(`db.orders.updateOne({}, { $set: { a: 1 } }, { multi: true })`)).toThrow(/option "multi"/);
    const none = run(`db.order.find({})`);
    expect(none.docs).toEqual([]);
    expect(none.unknownCollection).toBe(true);
  });

  it('chunk: chỉ src/engine/mongo/engineMongo.ts import mingo, và chỉ worker.ts import nó (động)', () => {
    const src = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const fromMingo = /(?:from\s+|import\s*\(\s*)['"]mingo(?:\/[^'"]*)?['"]/;
    const toEngine = /(?:from\s+|import\s*\(\s*)['"][^'"]*engineMongo['"]/;
    for (const [file, code] of Object.entries(src)) {
      expect(fromMingo.test(code), file).toBe(file === '../src/engine/mongo/engineMongo.ts');
      if (file !== '../src/engine/mongo/worker.ts') expect(toEngine.test(code.replace(/import\s+type[^;]*;/g, '')), file).toBe(false);
    }
  });

  it('dataset lạ bị từ chối', async () => {
    await expect(loadDataset('nope')).rejects.toThrow(MongoRunError);
  });
});
