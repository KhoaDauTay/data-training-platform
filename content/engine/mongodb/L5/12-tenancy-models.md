---
id: e-mg-l5-12
engine: mongodb
level: L5
module: multi-tenant
title: "Mô hình tenant trong MongoDB: collection chung, database riêng, zone"
title_en: "Tenancy models in MongoDB: shared collection, own database, zones"
figures: [{ name: mg-tenancy-zones, at: idea }]
kind: concept
minutes: 14
runtime: docs
docs_why: server
objectives:
  - vi: "Chọn collection chung, database cho mỗi tenant hay cụm riêng theo số tenant và yêu cầu quyền"
    en: "Choose a shared collection, a database per tenant or a cluster of its own by tenant count and access needs"
  - vi: "Nói vì sao MongoDB khuyên tránh collection cho mỗi tenant trong một database"
    en: "Say why MongoDB advises against a collection per tenant in one database"
  - vi: "Đặt `tenantId` đầu shard key và ghim khoảng của một tenant lên shard chọn sẵn bằng zone"
    en: "Put `tenantId` first in the shard key and pin one tenant's range to chosen shards with a zone"
requires: [e-mg-l5-05, e-mg-l3-19]
sources:
  - url: https://www.mongodb.com/docs/atlas/build-multi-tenant-arch/
    title: "Build a Multi-Tenant Architecture"
    title_vi: "Xây kiến trúc nhiều khách thuê"
  - url: https://www.mongodb.com/docs/manual/core/zone-sharding/
    title: "Zones"
    title_vi: "Zone"
  - url: https://www.mongodb.com/docs/manual/reference/method/sh.addShardToZone/
    title: "sh.addShardToZone()"
    title_vi: "sh.addShardToZone()"
  - url: https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/
    title: "Choose a Shard Key"
    title_vi: "Chọn shard key"
demo_setup: '{"collections": {"orders": [{"_id": 1, "tenantId": "S07", "total": 120000}, {"_id": 2, "tenantId": "S07", "total": 45000}, {"_id": 3, "tenantId": "S03", "total": 300000}, {"_id": 4, "tenantId": "S07", "total": 90000}, {"_id": 5, "tenantId": "S12", "total": 80000}, {"_id": 6, "tenantId": "S07", "total": 60000}, {"_id": 7, "tenantId": "S07", "total": 30000}, {"_id": 8, "tenantId": "S03", "total": 100000}, {"_id": 9, "tenantId": "S07", "total": 70000}, {"_id": 10, "tenantId": "S07", "total": 55000}]}}'
quiz:
  - q:
      vi: "Chợ Lồng Đèn có 4.000 người bán nhỏ, mỗi tháng thêm người mới, và mọi người bán dùng cùng một dạng đơn. Mô hình nào hợp?"
      en: "Lantern Market has 4,000 small sellers, new ones join every month, and every seller uses the same order shape. Which model fits?"
    options:
      - { vi: "Một database cho mỗi người bán, để quyền tách thật rõ", en: "A database per seller, so that access is cleanly split" }
      - { vi: "Một collection chung, mọi tài liệu và truy vấn có `tenantId`", en: "One shared collection, every document and query has `tenantId`" }
      - { vi: "Một collection cho mỗi người bán, cùng trong một database", en: "A collection per seller, all inside one database" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì database riêng tách quyền tốt nhất trong một cụm. Nhưng trang của Atlas dành mô hình đó cho số tenant nhỏ và ổn định (tới vài trăm): mỗi collection và mỗi index là một tệp, Atlas khuyên dưới 1000 tệp dữ liệu mỗi nút. Với 4.000 người bán, mỗi người ít nhất một collection `orders` và index `_id` của nó, đã là 4.000 × 2 = 8.000 tệp, gấp tám lần mức khuyên, và còn tăng mỗi tháng. Collection cho mỗi người bán trong một database gặp đúng giới hạn tệp đó, và trang này khuyên tránh vì mọi truy vấn phải ghép tên collection. Số tenant tăng mãi, dạng dữ liệu giống nhau là trường hợp của collection chung."
      en: "It sounds right because an own database splits access best inside one cluster. But the Atlas page keeps that model for a small, stable number of tenants (up to a few hundred): every collection and every index is a file, and Atlas advises under 1000 data files per node. With 4,000 sellers, each with at least one `orders` collection and its `_id` index, that is already 4,000 × 2 = 8,000 files, eight times the advice, and growing every month. A collection per seller in one database hits the same file limit, and the page advises against it because every query has to build the collection name. An ever-growing number of tenants with the same data shape is the shared-collection case."
  - q:
      vi: "`orders` đã shard theo `{ tenantId: 1, createdAt: 1 }`. Bạn muốn đơn của người bán `S07` nằm trên shard phần cứng mạnh. Khoảng của zone viết thế nào?"
      en: "`orders` is sharded on `{ tenantId: 1, createdAt: 1 }`. You want seller `S07`'s orders on the powerful shard. How is the zone range written?"
    options:
      - { vi: "Một khoảng chỉ trên `createdAt`, không cần nhắc tới `tenantId`", en: "A range on `createdAt` alone, with no need to mention `tenantId`" }
      - { vi: "Không được: zone chỉ dùng để đặt dữ liệu theo vùng địa lý", en: "It cannot be done: zones only place data by geographic region" }
      - { vi: "Một khoảng phủ mọi giá trị `createdAt` của `tenantId` là `S07`", en: "A range covering every `createdAt` value of `tenantId` `S07`" }
    answer: 2
    trap: 1
    why:
      vi: "Nghe hợp lý vì tên gọi gợi tới địa lý, nhưng docs zone sharding nêu ba cách dùng: tách một phần dữ liệu lên shard chọn sẵn, đặt dữ liệu gần ứng dụng, và chia theo phần cứng. Với shard key kép, khoảng của zone phải chứa tiền tố của shard key, nên khoảng chỉ trên `createdAt` không viết được: nó cũng sẽ gom đơn của mọi người bán trong khoảng thời gian đó. Khoảng đúng đi từ `tenantId` là `S07` với `createdAt` là `MinKey` tới `S07` với `MaxKey`, nên phủ mọi đơn của `S07` và không đơn nào của người khác."
      en: "It sounds right because the name hints at geography, but the zone sharding docs list three uses: isolate a subset of data on chosen shards, keep data close to the application, and split by hardware. With a compound shard key the zone range must include the shard key prefix, so a range on `createdAt` alone cannot be written: it would also catch every seller's orders in that period. The right range runs from `tenantId` `S07` with `createdAt` `MinKey` to `S07` with `MaxKey`, so it covers every order of `S07` and none of anyone else's."
---
## Mở bài

Chợ Lồng Đèn mở cửa với ba người bán, giờ có hàng nghìn, và một người bán lớn đã có nhiều đơn hơn cả trăm người nhỏ cộng lại. Câu hỏi không còn là viết truy vấn thế nào, mà là đặt dữ liệu của mỗi người bán ở đâu. MongoDB cho ba câu trả lời, mỗi câu có giá riêng.

## Ý chính

**Collection chung** (bài `e-mg-l3-19`): mọi tài liệu có `tenantId`, mọi truy vấn lọc theo nó. Trang kiến trúc nhiều tenant của Atlas dành mô hình này cho số tenant tăng mãi, dạng dữ liệu giống nhau và yêu cầu quyền không quá chặt. Nó shard được và chỉ cần tạo index một lần. Đổi lại, bảo trì chạm mọi tenant cùng lúc, và tenant chênh lệch kích thước thì khó cân.

**Database cho mỗi tenant**: hợp với số tenant nhỏ và ổn định (tới vài trăm) cần quyền chặt. Mỗi tenant sao lưu, bảo trì, dời sang cụm khác mà không chạm người khác. Giới hạn: mỗi collection và mỗi index là một tệp trên đĩa, Atlas khuyên dưới 1000 tệp dữ liệu mỗi nút; Atlas mặc định 100 người dùng database mỗi project; báo cáo chéo tenant phải mở nhiều kết nối.

**Collection cho mỗi tenant trong một database**: trang đó khuyên tránh, vì code phức tạp hơn và khó mở rộng về lâu dài. Muốn tách thật sự thì mỗi tenant một replica set nhỏ với thông tin đăng nhập riêng: mọi mô hình trong một cụm vẫn chung oplog.

**Zone**: khi shard collection chung, đặt `tenantId` đầu shard key, thêm một trường thứ hai (ví dụ `createdAt`) để đơn của một người bán lớn vẫn chia được ra nhiều chunk. Zone phủ một khoảng shard key; với khóa kép, khoảng phải chứa tiền tố. Nhờ đó zone sharding ghim khoảng của một người bán lên shard phần cứng mạnh. Zone không hỗ trợ time series collection.

Phần sharding cần cụm thật nên bài này chưa chạy trong trình duyệt; các ví dụ đếm đơn chạy bằng mingo.

Hình dưới vẽ đơn của S07 dồn một chỗ, rồi chia thành nhiều chunk trong một zone.

## Cú pháp

```text
sh.shardCollection("market.orders",
  { tenantId: 1, createdAt: 1 })
sh.addShardToZone("shard-gold", "GOLD")
sh.updateZoneKeyRange("market.orders",
  { tenantId: "S07",
    createdAt: MinKey },
  { tenantId: "S07",
    createdAt: MaxKey },
  "GOLD")
```

- Shard key mở đầu bằng `tenantId`, thêm một trường để chia nhỏ.
- `sh.addShardToZone`: gắn một shard vào zone; một shard thuộc được nhiều zone.
- Khoảng của zone: gồm cận dưới, không gồm cận trên, và chứa tiền tố shard key.

## Ví dụ

Ứng viên shard key bắt đầu từ số đơn của mỗi người bán:

```javascript
db.orders.aggregate([
  { $group: {
      _id: "$tenantId",
      n: { $sum: 1 } } },
  { $sort: { n: -1 } }
])
```

`S07` có 7 trong 10 đơn: một người bán lớn. Nếu shard key chỉ là `{ tenantId: 1 }`, mọi đơn của `S07` chung một giá trị khóa và không chia được qua nhiều chunk.

Một người bán chỉ đọc phần của mình:

```javascript
db.orders.find({ tenantId: "S12" })
```

Doanh thu của từng người bán, cho báo cáo nội bộ:

```javascript
db.orders.aggregate([
  { $group: {
      _id: "$tenantId",
      total: { $sum: "$total" } } },
  { $sort: { _id: 1 } }
])
```

Báo cáo chéo tenant như thế chạy được ngay trên collection chung; với database riêng, nó phải đi qua từng database.

## Lỗi hay gặp

Tách người bán bằng tên collection. Mỗi người bán thêm vài tệp, và mọi truy vấn phải ghép tên:

```text
// WRONG
orders_S03, orders_S07, ...
db["orders_" + seller]
  .find({ status: "paid" })
```

```text
// FIX
// one orders collection, tenantId
db.orders.find({
  tenantId: "S07",
  status: "paid" })
```

Shard key chỉ có `tenantId`. Mọi đơn của một người bán lớn có cùng một giá trị khóa:

```text
// WRONG
sh.shardCollection("market.orders",
  { tenantId: 1 })
```

```text
// FIX
sh.shardCollection("market.orders",
  { tenantId: 1, createdAt: 1 })
```

Với khóa đơn, chunk không chia được bên trong `S07`, nên một shard gánh cả người bán đó. Khóa kép giữ đơn của một người bán gần nhau mà vẫn chia được.

## Tóm tắt

- Tenant nhiều và giống nhau: collection chung có `tenantId`.
- Vài trăm tenant ổn định, quyền chặt: database cho mỗi tenant, nhớ giới hạn tệp và người dùng.
- Tránh collection cho mỗi tenant; cách ly thật cần cụm riêng.
- Shard key `{ tenantId, ... }` và zone ghim một người bán lên shard chọn sẵn.
- Bản đồ chủ đề nhiều tenant: `e-ds-l4-09`.

# EN

## Opening

Lantern Market opened with three sellers, now it has thousands, and one big seller already has more orders than a hundred small ones together. The question is no longer how to write a query, but where to put each seller's data. MongoDB gives three answers, each with its own price.

## Key idea

**Shared collection** (lesson `e-mg-l3-19`): every document has `tenantId`, every query filters on it. The Atlas multi-tenant architecture page keeps this model for an ever-growing number of tenants, a similar data shape and access needs that are not too strict. It can be sharded and indexes are built once. In exchange, maintenance touches every tenant at the same time, and tenants of very different sizes are hard to balance.

**Database per tenant**: fits a small, stable number of tenants (up to a few hundred) with strict access needs. Each tenant can be backed up, maintained and moved to another cluster without touching the others. Limits: every collection and every index is a file on disk, and Atlas advises under 1000 data files per node; Atlas allows 100 database users per project by default; cross-tenant reports must open several connections.

**Collection per tenant in one database**: that page advises against it, because the code gets more complex and scaling gets harder in the long term. Real isolation means a small replica set per tenant with its own credentials: every model inside one cluster still shares the oplog.

**Zones**: when you shard the shared collection, put `tenantId` first in the shard key and add a second field (for example `createdAt`) so a big seller's orders can still split over several chunks. A zone covers a range of the shard key; with a compound key, the range must include the prefix. That way zone sharding pins one seller's range to the powerful shard. Zones do not support time series collections.

The sharding part needs a real cluster, so this lesson does not run in the browser yet; the order-count examples run on mingo.

The figure below draws S07's orders stuck in one place, then split into chunks inside one zone.

## Syntax

```text
sh.shardCollection("market.orders",
  { tenantId: 1, createdAt: 1 })
sh.addShardToZone("shard-gold", "GOLD")
sh.updateZoneKeyRange("market.orders",
  { tenantId: "S07",
    createdAt: MinKey },
  { tenantId: "S07",
    createdAt: MaxKey },
  "GOLD")
```

- The shard key starts with `tenantId`, plus one field to split further.
- `sh.addShardToZone`: attaches a shard to a zone; one shard may belong to several zones.
- A zone range: lower bound included, upper bound excluded, and it holds the shard key prefix.

## Example

A shard key candidate starts from the order count of each seller:

```javascript
db.orders.aggregate([
  { $group: {
      _id: "$tenantId",
      n: { $sum: 1 } } },
  { $sort: { n: -1 } }
])
```

`S07` holds 7 of the 10 orders: a big seller. If the shard key were only `{ tenantId: 1 }`, every order of `S07` would share one key value and could not split over several chunks.

One seller reads only its own part:

```javascript
db.orders.find({ tenantId: "S12" })
```

Revenue per seller, for an internal report:

```javascript
db.orders.aggregate([
  { $group: {
      _id: "$tenantId",
      total: { $sum: "$total" } } },
  { $sort: { _id: 1 } }
])
```

A cross-tenant report like this runs directly on the shared collection; with a database per tenant, it has to go through each database.

## Common mistakes

Splitting sellers by collection name. Every seller adds a few files, and every query has to build the name:

```text
// WRONG
orders_S03, orders_S07, ...
db["orders_" + seller]
  .find({ status: "paid" })
```

```text
// FIX
// one orders collection, tenantId
db.orders.find({
  tenantId: "S07",
  status: "paid" })
```

A shard key with `tenantId` only. Every order of a big seller has the same key value:

```text
// WRONG
sh.shardCollection("market.orders",
  { tenantId: 1 })
```

```text
// FIX
sh.shardCollection("market.orders",
  { tenantId: 1, createdAt: 1 })
```

With the single-field key, chunks cannot split inside `S07`, so one shard carries that whole seller. The compound key keeps one seller's orders close together and still splits.

## Recap

- Many similar tenants: a shared collection with `tenantId`.
- A few hundred stable tenants with strict access: a database per tenant, minding the file and user limits.
- Avoid a collection per tenant; real isolation needs a cluster of its own.
- Shard key `{ tenantId, ... }` and a zone pin one seller to chosen shards.
- The multi-tenant topic map: `e-ds-l4-09`.
