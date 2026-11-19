// Spike: MongoDB-like editor on mingo inside a Web Worker. Not product code.
import { find, aggregate, updateMany, updateOne } from 'mingo';

const t0 = performance.now();

// Deterministic data: customers, orders with nested items (like a shop chain).
let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const cities = ['Da Nang', 'Ha Noi', 'HCMC', 'Hue', 'Can Tho'];
const skus = Array.from({ length: 200 }, (_, i) => ({ _id: `SKU${i}`, name: `Item ${i}`, price: 10 + (i % 50) * 3, cat: ['tea', 'cake', 'toy', 'book'][i % 4] }));
const customers = Array.from({ length: 2000 }, (_, i) => ({ _id: i + 1, name: `Customer ${i + 1}`, city: cities[i % 5], tier: ['gold', 'silver', 'none'][i % 3] }));
const orders = Array.from({ length: 20000 }, (_, i) => {
  const n = 1 + Math.floor(rnd() * 4);
  const items = Array.from({ length: n }, () => { const s = skus[Math.floor(rnd() * 200)]; return { sku: s._id, qty: 1 + Math.floor(rnd() * 5), price: s.price }; });
  return { _id: i + 1, customerId: 1 + Math.floor(rnd() * 2000), status: ['paid', 'shipped', 'cancelled'][Math.floor(rnd() * 3)], createdAt: new Date(Date.UTC(2026, 0, 1) + Math.floor(rnd() * 300) * 864e5), items, tags: rnd() < 0.2 ? ['promo'] : [] };
});
const data = { customers, orders, skus };
const seedMs = performance.now() - t0;

const opts = { collectionResolver: (name) => data[name] };

// A cursor that mimics the shell chain find().sort().skip().limit().
function cursorOf(coll, filter = {}, proj) {
  const st = { sort: null, skip: 0, limit: 0 };
  const c = {
    sort(s) { st.sort = s; return c; }, skip(n) { st.skip = n; return c; }, limit(n) { st.limit = n; return c; },
    count() { return find(data[coll], filter, undefined, opts).all().length; },
    explain() { return { queryPlanner: { winningPlan: { stage: 'COLLSCAN' } }, note: 'mingo has no indexes: every find is a full scan' }; },
    toArray() { let cur = find(data[coll], filter, proj, opts); if (st.sort) cur = cur.sort(st.sort); if (st.skip) cur = cur.skip(st.skip); if (st.limit) cur = cur.limit(st.limit); return cur.all(); },
  };
  return c;
}

function collection(name, scratch) {
  if (!data[name]) throw new Error(`ns not found: ${name}`);
  return {
    find: (f, p) => cursorOf(name, f, p),
    findOne: (f, p) => cursorOf(name, f, p).limit(1).toArray()[0] ?? null,
    countDocuments: (f) => cursorOf(name, f).count(),
    aggregate: (p) => aggregate(data[name], p, opts),
    // Writes run on a copy, then are thrown away: the BEGIN … ROLLBACK idea.
    updateMany: (f, u) => updateMany(scratch(name), f, u, {}, opts),
    updateOne: (f, u) => updateOne(scratch(name), f, u, {}, opts),
    insertOne: (d) => { scratch(name).push(d); return { acknowledged: true, insertedId: d._id }; },
    createIndex: () => { throw new Error('createIndex: not supported by mingo (no indexes)'); },
  };
}

self.onmessage = ({ data: { id, src } }) => {
  const start = performance.now();
  try {
    const copies = {};
    const scratch = (n) => (copies[n] ??= structuredClone(data[n]));
    const db = new Proxy({}, { get: (_, k) => collection(String(k), scratch) });
    const ISODate = (s) => new Date(s);
    // ponytail: Function() runs player text inside this worker only (no DOM, no network
    // needed); a product build would parse shell syntax to literals (acorn/EJSON) instead.
    let out = new Function('db', 'ISODate', `"use strict"; return (${src});`)(db, ISODate);
    if (out && typeof out.toArray === 'function') out = out.toArray();
    const rows = Array.isArray(out) ? out : [out];
    self.postMessage({ id, ok: true, ms: performance.now() - start, n: rows.length, sample: rows.slice(0, 3) });
  } catch (e) {
    self.postMessage({ id, ok: false, ms: performance.now() - start, error: String(e && e.message || e) });
  }
};
self.postMessage({ ready: true, bootMs: performance.now(), seedMs, docs: orders.length + customers.length + skus.length });
