---
id: e-mg-l5-05
engine: mongodb
level: L5
module: sharding-ts
title: "Sharding: shard key, chunk và balancer"
title_en: "Sharding: shard keys, chunks and the balancer"
kind: concept
minutes: 14
runtime: docs
viz: mg-sharding
objectives:
  - vi: "Đánh giá shard key theo cardinality, tần suất và tính đơn điệu"
    en: "Judge a shard key by cardinality, frequency and monotonic growth"
  - vi: "Biết khi nào balancer chuyển dữ liệu giữa các shard"
    en: "Know when the balancer moves data between shards"
  - vi: "Chọn sharding theo khoảng hay hashed"
    en: "Choose ranged or hashed sharding"
requires: [e-mg-l5-03]
sources:
  - https://www.mongodb.com/docs/manual/core/sharding-shard-key/
  - https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/
  - https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/
quiz:
  - q:
      vi: "Shard theo `continent` (7 giá trị). Thêm shard thứ 8 có giúp gì không?"
      en: "Sharding on `continent` (7 values). Does adding an 8th shard help?"
    options:
      - { vi: "Có, balancer chia đều ra 8 shard", en: "Yes, the balancer spreads data over 8 shards" }
      - { vi: "Không, mỗi giá trị shard key chỉ nằm trong một chunk, nên tối đa 7 chunk", en: "No, each shard key value lives in one chunk, so there are at most 7 chunks" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì thêm máy thường thêm sức, nhưng cardinality giới hạn số chunk: 7 giá trị thì tối đa 7 chunk, nên shard thứ 8 không có gì để giữ. Docs chính thức khuyên dùng shard key kép (nhiều trường) để tăng cardinality."
      en: "It sounds right because more machines usually mean more capacity, but cardinality caps the number of chunks: 7 values means at most 7 chunks, so an 8th shard has nothing to hold. The docs suggest a compound shard key to raise cardinality."
  - q:
      vi: "Shard key là thời điểm tạo, luôn tăng. Điều gì xảy ra với lượt chèn mới?"
      en: "The shard key is the creation time, always increasing. What happens to new inserts?"
    options:
      - { vi: "Rải đều ra mọi shard", en: "They spread evenly over every shard" }
      - { vi: "Dồn vào chunk có cận trên `MaxKey`, một shard thành điểm nóng", en: "They all go to the chunk bounded by `MaxKey`, one shard becomes a hot spot" }
    answer: 1
    trap: 0
    why:
      vi: "Rải đều nghe hợp lý vì có nhiều giá trị khác nhau, nhưng giá trị luôn tăng đi vào chunk có cận trên `MaxKey`. Docs chính thức khuyên dùng hashed sharding cho khóa đơn điệu."
      en: "Spreading evenly sounds right because there are many distinct values, but ever-increasing values go to the chunk bounded by `MaxKey`. The docs recommend hashed sharding for a monotonic key."
---
## Mở bài

Collection đơn hàng đã lớn hơn ổ đĩa của một máy, và giờ cao điểm một máy không ghi kịp. Sharding chia collection ra nhiều máy, nhưng chia theo trường nào là quyết định khó đổi nhất của cả hệ thống.

## Ý chính

Sharded cluster chia một collection ra nhiều shard theo shard key. MongoDB chia miền giá trị shard key (hoặc giá trị hash của nó) thành các khoảng không chồng nhau, mỗi khoảng là một chunk. `mongos` định tuyến truy vấn theo metadata lấy từ config server.

Chọn shard key theo ba tiêu chí, không tiêu chí nào một mình đủ. Cardinality: số giá trị khác nhau giới hạn số chunk tối đa. Tần suất: vài giá trị chiếm phần lớn tài liệu thì chunk của chúng thành nút cổ chai và có thể thành chunk không chia được (jumbo). Đơn điệu: khóa luôn tăng (hay luôn giảm) dồn mọi lượt chèn vào chunk có `MaxKey` (hay `MinKey`); dùng hashed sharding cho khóa như vậy.

Nhiều người nghĩ cứ thêm shard là hệ thống nhanh hơn. Thật ra shard key xấu giới hạn mọi thứ: 7 giá trị thì tối đa 7 chunk, khóa đơn điệu thì mọi lượt ghi vẫn dồn vào một shard.

Balancer chạy trên primary của config server. Collection coi là cân bằng khi chênh lệch dữ liệu giữa các shard dưới ba lần range size; với mặc định 128 MB, phải chênh ít nhất 384 MB mới di chuyển. Từ 5.0 đổi được shard key bằng `reshardCollection`; `refineCollectionShardKey` thêm trường vào cuối khóa; từ 7.0, `analyzeShardKey` đo các chỉ số từ truy vấn mẫu.

## Cú pháp

```text
sh.shardCollection("<db>.<coll>", { <field>: 1 | "hashed" [, <field>: 1 ...] })
db.adminCommand({ reshardCollection: "<db>.<coll>", key: { ... } })
db.adminCommand({ refineCollectionShardKey: "<db>.<coll>", key: { <old fields>, <new field>: 1 } })
db.adminCommand({ analyzeShardKey: "<db>.<coll>", key: { ... } })
```

- `1`: sharding theo khoảng; truy vấn theo khoảng đi tới ít shard.
- `"hashed"`: rải đều khóa đơn điệu; truy vấn theo khoảng phải đi mọi shard.
- `reshardCollection`: đổi hẳn shard key (từ 5.0).
- `analyzeShardKey`: đo cardinality, tần suất, tính đơn điệu (từ 7.0).

## Ví dụ

Đo cardinality và tần suất của một ứng viên trên dữ liệu `shop` (chạy bằng mingo):

```javascript
db.orders.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }, { $sort: { n: -1 } }])
```

Chỉ 3 giá trị, và `paid` giữ 35 trên 80 đơn: `status` cho tối đa 3 chunk, là shard key xấu.

```javascript
db.orders.aggregate([{ $group: { _id: "$customerId", n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 3 }])
```

`customerId` có 22 giá trị, khách nhiều đơn nhất chỉ giữ 9 trên 80: ứng viên tốt hơn.

Hai cách shard cho hai kiểu khóa (cần cluster thật):

```text
sh.shardCollection("shop.orders", { customerId: 1 })
sh.shardCollection("shop.events", { deviceId: "hashed" })
```

## Lỗi hay gặp

Shard theo khóa luôn tăng bằng khoảng:

```text
// WRONG: every new order goes to the chunk bounded by MaxKey
sh.shardCollection("shop.orders", { createdAt: 1 })
```

```text
// FIX: hash the monotonic key, or lead with a high-cardinality field
sh.shardCollection("shop.orders", { createdAt: "hashed" })
```

Shard theo trường có ít giá trị:

```text
// WRONG: 3 statuses means at most 3 chunks
sh.shardCollection("shop.orders", { status: 1 })
```

```text
// FIX: a compound key with more distinct values
sh.shardCollection("shop.orders", { status: 1, customerId: 1 })
```

Chờ balancer chuyển ngay khi lệch một chút: lệch 300 MB với range size 128 MB vẫn là "cân bằng", vì ngưỡng là 384 MB.

## Tóm tắt

- Chunk = một khoảng giá trị shard key; `mongos` định tuyến theo metadata của config server.
- Cardinality, tần suất, tính đơn điệu: xét cả ba, không tiêu chí nào đủ một mình.
- Khóa đơn điệu cần hashed sharding hoặc một trường dẫn có nhiều giá trị.
- Balancer chỉ chuyển khi lệch từ ba lần range size (384 MB với mặc định).

# EN

## Opening

The orders collection has outgrown one machine's disk, and at peak time one machine cannot keep up with writes. Sharding splits the collection across many machines, but which field to split on is the hardest decision in the whole system to change.

## Key idea

A sharded cluster splits one collection across many shards by the shard key. MongoDB divides the span of shard key values (or of their hashes) into non-overlapping ranges, each one a chunk. `mongos` routes queries using metadata from the config servers.

Choose a shard key on three criteria; none is enough on its own. Cardinality: the number of distinct values caps the number of chunks. Frequency: if a few values hold most documents, their chunks become a bottleneck and can turn into indivisible (jumbo) chunks. Monotonic growth: an always increasing (or decreasing) key sends every insert to the chunk with `MaxKey` (or `MinKey`); use hashed sharding for such a key.

Many people think adding shards always makes the system faster. In fact a poor shard key caps everything: 7 values means at most 7 chunks, and a monotonic key still sends every write to one shard.

The balancer runs on the primary of the config server replica set. A collection counts as balanced when the data difference between shards is under three times the range size; with the default 128 MB, the difference must reach 384 MB before a migration. From 5.0 you can change the shard key with `reshardCollection`; `refineCollectionShardKey` adds fields to the end of the key; from 7.0, `analyzeShardKey` measures the metrics from sampled queries.

## Syntax

```text
sh.shardCollection("<db>.<coll>", { <field>: 1 | "hashed" [, <field>: 1 ...] })
db.adminCommand({ reshardCollection: "<db>.<coll>", key: { ... } })
db.adminCommand({ refineCollectionShardKey: "<db>.<coll>", key: { <old fields>, <new field>: 1 } })
db.adminCommand({ analyzeShardKey: "<db>.<coll>", key: { ... } })
```

- `1`: ranged sharding; range queries go to few shards.
- `"hashed"`: spreads a monotonic key evenly; range queries must go to every shard.
- `reshardCollection`: changes the shard key outright (from 5.0).
- `analyzeShardKey`: measures cardinality, frequency and monotonicity (from 7.0).

## Example

Measure the cardinality and frequency of a candidate on the `shop` data (runs on mingo):

```javascript
db.orders.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }, { $sort: { n: -1 } }])
```

Only 3 values, and `paid` holds 35 of 80 orders: `status` allows at most 3 chunks, a poor shard key.

```javascript
db.orders.aggregate([{ $group: { _id: "$customerId", n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 3 }])
```

`customerId` has 22 values, and the busiest customer holds only 9 of 80: a better candidate.

Two ways to shard for two kinds of key (needs a real cluster):

```text
sh.shardCollection("shop.orders", { customerId: 1 })
sh.shardCollection("shop.events", { deviceId: "hashed" })
```

## Common mistakes

Ranged sharding on an ever-increasing key:

```text
// WRONG: every new order goes to the chunk bounded by MaxKey
sh.shardCollection("shop.orders", { createdAt: 1 })
```

```text
// FIX: hash the monotonic key, or lead with a high-cardinality field
sh.shardCollection("shop.orders", { createdAt: "hashed" })
```

Sharding on a field with few values:

```text
// WRONG: 3 statuses means at most 3 chunks
sh.shardCollection("shop.orders", { status: 1 })
```

```text
// FIX: a compound key with more distinct values
sh.shardCollection("shop.orders", { status: 1, customerId: 1 })
```

Expecting the balancer to move data at the first small gap: a 300 MB gap with a 128 MB range size still counts as "balanced", because the threshold is 384 MB.

## Recap

- A chunk = a range of shard key values; `mongos` routes with the config servers' metadata.
- Cardinality, frequency, monotonicity: weigh all three, none is enough alone.
- A monotonic key needs hashed sharding or a high-cardinality leading field.
- The balancer moves data only from a gap of three times the range size (384 MB by default).
