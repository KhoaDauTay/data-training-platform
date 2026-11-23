# MongoDB

Status: mixed. The query/aggregation behaviours marked **[mingo]** were run on `mingo` 7.2.6 (the repo's in-browser engine) with asserted results (scratch script `bd-wt/research-db/mingo-check.mjs`; the v25 `$count` and `findOneAndUpdate` lines by `tests/mongoEngine.test.ts`). Everything else is to-verify: the map-reduce deprecation page was read in full on 2026-11-23; the other MongoDB manual citations were link-checked (HTTP 200) and rest on the author's knowledge and on `docs/team/best-practice-catalogue.md` (M items).

Route points: tutorialspoint MongoDB tutorial, in its order ([tutorial-routes.md](tutorial-routes.md#mongodb)). Deeper material and every best-practice card: `docs/team/db-engine-knowledge.md` §4, `docs/team/best-practice-catalogue.md` (M01–M38), `content/engine/mongodb/**`.

## 1. Data model

Status: to-verify (level per file header).

- A deployment holds databases, a database holds collections, a collection holds documents (BSON: JSON plus types such as `ObjectId`, `Date`, `Decimal128`, `Int32/Int64`, `Binary`). Databases and collections are created implicitly on the first write; `use <db>` only selects a database. `db.coll.drop()` removes a collection and its indexes, `db.dropDatabase()` the selected database. Capped collections (fixed size, insertion order, the oldest documents overwritten when full) and time series collections must be created explicitly with `db.createCollection(name, { capped: true, size, max })` / `{ timeseries: { timeField, metaField } }`; the docs suggest a TTL index or a time series collection over a capped one in most cases (https://www.mongodb.com/docs/manual/core/databases-and-collections/, https://www.mongodb.com/docs/manual/core/capped-collections/).
- Every document has a unique `_id`; the default `ObjectId` is 12 bytes: a 4-byte timestamp, a 5-byte random value, a 3-byte counter (https://www.mongodb.com/docs/manual/reference/bson-types/#objectid). There is no auto-increment; a counter document emulates one: `findOneAndUpdate({ _id: "order" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" })` is one atomic single-document operation (a read then a separate update can hand out a number twice), at the price of a hot document every insert writes to. `findOneAndUpdate` returns the document *before* the change unless `returnDocument: "after"` **[mingo]** (https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/).
- Maximum document size is 16 MiB; nesting depth 100 (https://www.mongodb.com/docs/manual/reference/limits/).
- **Embed** data that is read together and bounded in size (order lines inside an order); **reference** (store the other `_id`) when the related set is large, unbounded or shared (https://www.mongodb.com/docs/manual/data-modeling/concepts/embedding-vs-references/). Unbounded arrays are the classic anti-pattern (catalogue M02).
- Schema is flexible but can be enforced with `$jsonSchema` validation on the collection (https://www.mongodb.com/docs/manual/core/schema-validation/).
- Store money as `Decimal128`, dates as `Date`, never as strings (catalogue M19).

BoonData: Engine `content/engine/mongodb/L1/01-documents.md`, `L2/11-embed-vs-reference.md`, `L2/13-schema-validation.md`, `L4/01-patterns.md`, `L4/13-lab-counters.md`.

## 2. CRUD

Status: query semantics **[mingo]**; write semantics to-verify (link-checked).

- `insertOne/insertMany`, `find(filter, projection)`, `updateOne/updateMany(filter, update, {upsert})`, `replaceOne`, `deleteOne/deleteMany` (https://www.mongodb.com/docs/manual/crud/).
- Update operators: `$set`, `$unset`, `$inc`, `$push`, `$addToSet`, `$pull`, positional `$`, `$[]`, `$[id]` + `arrayFilters`; a pipeline (`[ { $set: … } ]`) can compute new values from old ones.
- A write to one document is atomic, including its embedded arrays (https://www.mongodb.com/docs/manual/core/write-operations-atomicity/).
- Projection: include or exclude, not both (except `_id`).
- `sort`, `skip`, `limit`; sort on an unindexed field is limited by memory (100 MB per stage unless spilling to disk is allowed).

Traps verified **[mingo]**:

```js
// documents: {_id:1..4}; only _id 3 has coupon: null, the others lack the field
db.orders.find({ coupon: null })               // matches missing AND null → 1, 2, 3, 4
db.orders.find({ coupon: { $exists: false } }) // only missing → 1, 2, 4
db.orders.find({ coupon: { $ne: null } })      // excludes missing too → none here

// items: [{sku, qty}]
db.orders.find({ "items.sku": "B", "items.qty": { $gte: 2 } })            // conditions may hit different elements → 1, 3
db.orders.find({ items: { $elemMatch: { sku: "B", qty: { $gte: 2 } } } }) // same element → 3
```

(Catalogue M15, M16, M17; https://www.mongodb.com/docs/manual/tutorial/query-for-null-fields/, https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/.)

BoonData: Engine `L1/02` … `L1/10`, `L2/01-positional-updates.md`, `L2/02-pipeline-updates.md`, `L2/03-literal-trap.md`; NoSQL path parts 1–6 (`content/engine/mongodb/path/`).

## 3. Aggregation pipeline

Status: three behaviours **[mingo]**; rest link-checked.

- A pipeline is an array of stages, each transforming the stream of documents: `$match`, `$project`/`$set`/`$unset`, `$group` (accumulators `$sum`, `$avg`, `$min`, `$max`, `$push`, `$addToSet`, `$first`, `$last`, `$count`), `$sort`, `$limit`, `$unwind`, `$lookup` (left outer join), `$facet`, `$bucket`, `$setWindowFields`, `$unionWith`, `$out`, `$merge` (https://www.mongodb.com/docs/manual/core/aggregation-pipeline/).
- SQL mapping: `WHERE` → `$match`, `GROUP BY` → `$group`, `HAVING` → `$match` after `$group`, `JOIN` → `$lookup` (+ `$unwind`), `UNION ALL` → `$unionWith`, window functions → `$setWindowFields`.
- Put `$match` (and `$sort` + `$limit`) first so they can use indexes; the optimiser moves some stages but not across every stage (https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/, catalogue M09).
- Each stage has a 100 MB memory limit. Since MongoDB 6.0 the server parameter `allowDiskUseByDefault` is `true`, so a stage that needs more spills to temporary files unless the command passes `allowDiskUse: false` (https://www.mongodb.com/docs/manual/core/aggregation-pipeline-limits/).
- `$count` on an empty input returns **no** document ("If the input dataset is empty, `$count` doesn't return a result"), unlike SQL `COUNT(*)`, which always returns one row. mingo 7.2.6 returns `[{ n: 0 }]` here; BoonData's runner rewrites `$count` as `$group` + `$project` so the lab matches MongoDB **[mingo]** (`countLikeMongo`, `src/engine/mongo/engineMongo.ts`; https://www.mongodb.com/docs/manual/reference/operator/aggregation/count/).
- `$unwind` drops documents whose array is empty or missing unless `preserveNullAndEmptyArrays: true` **[mingo]** (catalogue M18).
- Map-reduce is deprecated since MongoDB 5.0; use the pipeline (https://www.mongodb.com/docs/manual/core/map-reduce/).

```js
// [mingo] revenue per customer for paid orders → an 100, binh 80, chi 20
db.orders.aggregate([
  { $match: { status: "paid" } },
  { $group: { _id: "$customer", revenue: { $sum: "$total" } } },
  { $sort: { revenue: -1 } }
])
```

BoonData: Engine `L2/04` … `L2/15`; NoSQL path parts 2–10.

## 4. Indexes and explain

Status: to-verify (mingo has no indexes; link-checked).

- Default index on `_id`; single-field, compound, multikey (arrays), text, 2dsphere, hashed, wildcard, partial, sparse, TTL, unique, hidden (https://www.mongodb.com/docs/manual/indexes/).
- **ESR rule** for compound indexes: Equality fields first, then Sort fields, then Range fields (https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/).
- A **covered query** is answered from the index alone: every filtered and returned field is in the index and `_id` is excluded unless indexed (https://www.mongodb.com/docs/manual/core/query-optimization/#covered-query).
- `explain("executionStats")`: compare `nReturned`, `totalKeysExamined`, `totalDocsExamined`; `COLLSCAN` means no index; an in-memory `SORT` stage means the index does not provide the order (https://www.mongodb.com/docs/manual/reference/explain-results/).
- Limits: 64 indexes per collection; one text index per collection; a compound multikey index may contain at most one array field per document (https://www.mongodb.com/docs/manual/reference/limits/).

BoonData: Engine `L3/*`. mingo has no planner: predict-the-plan lessons carry `recorded` (the figures or the conclusion the manual prints, labelled "theo tài liệu"; only `L3/06`–`07` quote numbers, from *Analyze Query Performance*), and lab steps with a rule bar (`rule: esr | covered | match-first`) are graded by rule, never measured (`L3/05`, `L3/12`, `L3/18`, `L2/15`).

## 5. Consistency and transactions

Status: to-verify (level per file header; not runnable in the browser engine).

- Multi-document ACID transactions on replica sets (4.0+) and sharded clusters (4.2+); keep them short (60 s default limit) (https://www.mongodb.com/docs/manual/core/transactions/).
- Write concern (`w: 1`, `w: "majority"`, `j: true`) says when a write is acknowledged; read concern (`local`, `majority`, `snapshot`, `linearizable`) what a read may return; `majority` writes survive a failover (https://www.mongodb.com/docs/manual/reference/write-concern/).
- Causal consistency within a session guarantees read-your-own-writes across secondaries.

BoonData: Engine `L4/07` … `L4/12`, `L5/02`, `L5/04`.

## 6. Replication, sharding, operations

Status: to-verify (level per file header).

- A replica set is one primary and secondaries replaying the primary's oplog; an election picks a new primary on failure (https://www.mongodb.com/docs/manual/replication/).
- Sharding splits a collection across shards by a shard key (ranged or hashed); a query that includes the shard key is routed to one shard, others go to all shards (https://www.mongodb.com/docs/manual/sharding/). Pick a key with high cardinality, even frequency and no monotonic hot spot (catalogue M11).
- Backups: `mongodump`/`mongorestore` are simple and efficient for small deployments but not ideal for large ones (they read all the data, and indexes are rebuilt on restore); larger ones use file system snapshots (journaling on, one consistent point in time) or a backup service such as Atlas (https://www.mongodb.com/docs/manual/core/backups/).
- Access control: enable authentication, use role-based access with built-in roles (`read`, `readWrite`, `dbAdmin`) and least privilege (https://www.mongodb.com/docs/manual/core/authorization/).
- GridFS stores a file larger than the 16 MiB document limit as chunks (255 KiB by default): file details in `fs.files`, one document per chunk in `fs.chunks`; a driver can read a range without loading the whole file. A file under 16 MiB can live in one document (`BinData`), and GridFS does not fit when a whole file must be replaced atomically (https://www.mongodb.com/docs/manual/core/gridfs/).

BoonData: Engine `L5/*`, `L5/11-backup-gridfs.md`.

## Sources

MongoDB Manual pages cited inline (the current manual was 9.0 when re-checked on 2026-11-20; some lessons still say "8.x", the version they were first checked against). mingo 7.2.6 (MIT) for the runnable checks. Coverage suggested by https://www.tutorialspoint.com/mongodb/index.htm (no text taken).
