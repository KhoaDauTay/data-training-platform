---
id: e-mg-l3-19
engine: mongodb
level: L3
module: esr-explain
title: "Lab: tenantId đứng đầu index, lọc và lệnh ghi"
title_en: "Lab: tenantId first in the index, the filter and the write"
kind: lab
minutes: 15
runtime: browser
viz: mg-esr
objectives:
  - vi: "Viết index kép mở đầu bằng `tenantId` rồi xếp phần còn lại theo ESR"
    en: "Write a compound index that starts with `tenantId`, then orders the rest by ESR"
  - vi: "Lọc theo `tenantId` ở `$match` đầu pipeline, trước `$unwind` và `$group`"
    en: "Filter on `tenantId` in the first `$match` of a pipeline, before `$unwind` and `$group`"
  - vi: "Giữ `tenantId` trong bộ lọc của mọi lệnh ghi hàng loạt"
    en: "Keep `tenantId` in the filter of every bulk write"
requires: [e-mg-l3-05, e-mg-l3-12]
sources:
  - url: https://www.mongodb.com/docs/atlas/build-multi-tenant-arch/
    title: "Build a Multi-Tenant Architecture"
  - url: https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
    title: "The ESR (Equality, Sort, Range) Guideline"
  - url: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
    title: "Compound Indexes"
lab:
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "tenantId": "S07", "status": "paid", "createdAt": {"$date": "2026-10-02T09:00:00Z"}, "total": 120000, "lines": [{"sku": "L-01", "qty": 2, "price": 60000}]},
      {"_id": 2, "tenantId": "S07", "status": "pending", "createdAt": {"$date": "2026-10-05T09:00:00Z"}, "total": 45000, "lines": [{"sku": "L-02", "qty": 1, "price": 45000}]},
      {"_id": 3, "tenantId": "S03", "status": "paid", "createdAt": {"$date": "2026-10-03T09:00:00Z"}, "total": 300000, "lines": [{"sku": "D-01", "qty": 3, "price": 100000}]},
      {"_id": 4, "tenantId": "S07", "status": "paid", "createdAt": {"$date": "2026-10-11T09:00:00Z"}, "total": 90000, "lines": [{"sku": "L-01", "qty": 1, "price": 60000}, {"sku": "L-03", "qty": 1, "price": 30000}]},
      {"_id": 5, "tenantId": "S12", "status": "pending", "createdAt": {"$date": "2026-10-12T09:00:00Z"}, "total": 80000, "lines": [{"sku": "T-01", "qty": 4, "price": 20000}]},
      {"_id": 6, "tenantId": "S03", "status": "pending", "createdAt": {"$date": "2026-10-14T09:00:00Z"}, "total": 100000, "lines": [{"sku": "D-01", "qty": 1, "price": 100000}]},
      {"_id": 7, "tenantId": "S07", "status": "paid", "createdAt": {"$date": "2026-10-20T09:00:00Z"}, "total": 60000, "lines": [{"sku": "L-01", "qty": 1, "price": 60000}]},
      {"_id": 8, "tenantId": "S12", "status": "paid", "createdAt": {"$date": "2026-10-21T09:00:00Z"}, "total": 40000, "lines": [{"sku": "T-01", "qty": 2, "price": 20000}]},
      {"_id": 9, "tenantId": "S07", "status": "pending", "createdAt": {"$date": "2026-10-25T09:00:00Z"}, "total": 30000, "lines": [{"sku": "L-03", "qty": 1, "price": 30000}]}
    ]}}
  steps:
    - name: { vi: "Index cho trang đơn của người bán", en: "An index for the seller's order page" }
      task:
        vi: "Trang \"Đơn đã trả\" của mỗi người bán chạy `db.orders.find({ tenantId: \"S07\", status: \"paid\" }).sort({ createdAt: -1 })`. Viết một `createIndex` mở đầu bằng `tenantId` và theo ESR."
        en: "Each seller's \"Paid orders\" page runs `db.orders.find({ tenantId: \"S07\", status: \"paid\" }).sort({ createdAt: -1 })`. Write one `createIndex` that starts with `tenantId` and follows ESR."
      solution: |
        db.orders.createIndex({
          tenantId: 1,
          status: 1,
          createdAt: -1
        })
      check: doc
      rule: esr
      target: 'db.orders.find({ tenantId: "S07", status: "paid" }).sort({ createdAt: -1 })'
      slow: 'db.orders.createIndex({ createdAt: -1, tenantId: 1, status: 1 })'
      hint:
        vi: "`tenantId` và `status` là hai phép bằng, `createdAt` là trường sắp xếp."
        en: "`tenantId` and `status` are two equalities, `createdAt` is the sort field."
      fact:
        vi: "Bước này chấm theo luật ESR (Equality, Sort, Range: trường so bằng, rồi trường sắp xếp, rồi trường so khoảng), không đo trên `mongod`: mingo không có index. Quy tắc chấp nhận hai phép bằng theo thứ tự nào cũng được; đặt `tenantId` đầu tiên là quy ước của bài."
        en: "This step is graded by the ESR rule (Equality, Sort, Range: equality fields, then sort fields, then range fields), not measured on `mongod`: mingo has no indexes. The rule accepts the two equalities in either order; `tenantId` first is this lesson's convention."
    - name: { vi: "Báo cáo của một người bán", en: "One seller's report" }
      task:
        vi: "Số lượng đã bán theo mã hàng của người bán `S07`, chỉ tính đơn `paid`. Trả `_id` là `sku` và `qty` là tổng số lượng, xếp `_id` tăng dần."
        en: "Units sold per item code for seller `S07`, counting `paid` orders only. Return `_id` as the `sku` and `qty` as the total quantity, ordered by `_id` ascending."
      solution: |
        db.orders.aggregate([
          { $match: {
              tenantId: "S07",
              status: "paid" } },
          { $unwind: "$lines" },
          { $group: {
              _id: "$lines.sku",
              qty: { $sum: "$lines.qty" } } },
          { $sort: { _id: 1 } }
        ])
      check: doc
      ordered: true
      rule: match-first
      slow: 'db.orders.aggregate([{ $unwind: "$lines" }, { $match: { tenantId: "S07", status: "paid" } }, { $group: { _id: "$lines.sku", qty: { $sum: "$lines.qty" } } }, { $sort: { _id: 1 } }])'
      hint:
        vi: "`$match` trên `tenantId` và `status` trước, rồi `$unwind`, rồi `$group` theo `$lines.sku`."
        en: "`$match` on `tenantId` and `status` first, then `$unwind`, then `$group` by `$lines.sku`."
    - name: { vi: "Lệnh ghi của một người bán", en: "One seller's write" }
      task:
        vi: "Người bán `S07` hủy mọi đơn còn `pending` của mình. Viết một `updateMany` đặt `status` thành `cancelled`, không chạm đơn của người bán khác."
        en: "Seller `S07` cancels all of its orders that are still `pending`. Write one `updateMany` that sets `status` to `cancelled` without touching other sellers' orders."
      solution: |
        db.orders.updateMany(
          { tenantId: "S07", status: "pending" },
          { $set: { status: "cancelled" } }
        )
      check: doc
      hint:
        vi: "Bộ lọc cần cả `tenantId` lẫn `status`; lệnh ghi được chấm trên collection sau khi ghi."
        en: "The filter needs both `tenantId` and `status`; the write is graded on the collection after it."
quiz:
  - q:
      vi: "Trang người bán chạy `find({ tenantId, status }).sort({ createdAt: -1 })` và đã có index `{ status: 1, createdAt: -1 }`. Có nên đổi sang index mở đầu bằng `tenantId` không?"
      en: "The seller page runs `find({ tenantId, status }).sort({ createdAt: -1 })` and already has the index `{ status: 1, createdAt: -1 }`. Should it switch to an index that starts with `tenantId`?"
    options:
      - { vi: "Không cần: `status` đã lọc gần hết, phần đọc thêm rất nhỏ", en: "No need: `status` already filters most out, the extra reading is tiny" }
      - { vi: "Nên: để phép `sort` theo `createdAt` dùng được index", en: "Yes: so that the `sort` on `createdAt` can use an index" }
      - { vi: "Nên: thiếu nó, mỗi lần đọc đi qua khóa của mọi người bán", en: "Yes: without it, every read walks the keys of every seller" }
    answer: 2
    trap: 0
    why:
      vi: "\"Phần đọc thêm rất nhỏ\" nghe hợp lý khi chỉ có vài người bán. Nhưng đoạn `status: \"paid\"` của index chứa đơn đã trả của cả chợ, nên trang một người bán vẫn đi qua khóa của mọi người khác, mở từng tài liệu để xem `tenantId` rồi lọc bỏ. Phép `sort` không phải lý do: index cũ đã có `createdAt` ngay sau trường bằng `status`, nên thứ tự sắp đã lấy được từ index. Thêm `tenantId` đầu tiên thì đoạn quét chỉ còn đơn của người đó."
      en: "\"The extra reading is tiny\" sounds right while there are only a few sellers. But the `status: \"paid\"` part of the index holds the whole market's paid orders, so one seller's page still walks everyone else's keys, opening each document to check `tenantId` and filtering it out. The `sort` is not the reason: the old index already has `createdAt` right after the equality field `status`, so the sort order already comes from the index. With `tenantId` first, the scanned range holds only that seller's orders."
  - q:
      vi: "Báo cáo của `S07` đặt `$unwind` trước rồi mới `$match: { tenantId: \"S07\" }`, và kết quả đúng. Điều gì đáng lo trên `mongod`?"
      en: "The `S07` report puts `$unwind` first and only then `$match: { tenantId: \"S07\" }`, and the result is right. What is the concern on `mongod`?"
    options:
      - { vi: "`$unwind` tách đơn của mọi người bán trước khi lọc ra một người", en: "`$unwind` splits every seller's orders before one seller is picked out" }
      - { vi: "`$unwind` luôn ghi ra đĩa, nên cần bật `allowDiskUse`", en: "`$unwind` always spills to disk, so it needs `allowDiskUse`" }
      - { vi: "Không gì: `mongod` luôn tự dời `$match` qua `$unwind` cho bạn", en: "Nothing: `mongod` always moves `$match` across `$unwind` for you" }
    answer: 0
    trap: 2
    why:
      vi: "\"Không gì\" nghe hợp lý vì trình tối ưu có dời `$match`, nhưng trang tối ưu pipeline không hứa dời qua `$unwind`. Khi đó `$unwind` tách mọi đơn của cả ba người bán thành từng dòng hàng, rồi `$match` mới bỏ phần của `S03` và `S12`. `allowDiskUse` không liên quan: `$unwind` xử lý từng tài liệu một, không gom cả tập vào bộ nhớ nên không phải ghi ra đĩa. Tự đặt `$match` trên `tenantId` đầu tiên: stage đó dùng được index mở đầu bằng `tenantId`."
      en: "\"Nothing\" sounds right because the optimizer does move `$match`, but the pipeline optimization page promises no move across `$unwind`. Then `$unwind` splits every order of all three sellers into single lines, and only then does `$match` drop the `S03` and `S12` part. `allowDiskUse` is beside the point: `$unwind` handles one document at a time and never gathers the whole set in memory, so it does not spill to disk. Put the `$match` on `tenantId` first yourself: that stage can use an index that starts with `tenantId`."
---
## Mở bài

Chợ Lồng Đèn cho mỗi người bán xem đơn của riêng mình, và mọi đơn nằm chung một collection `orders`. Một index thiếu `tenantId` hay một lệnh ghi quên `tenantId` là lúc một người bán đọc chậm vì người khác, hoặc sửa nhầm đơn của người khác. Bài này đặt `tenantId` vào ba chỗ: index, `$match` đầu tiên và bộ lọc của lệnh ghi.

## Ý chính

Mô hình collection dùng chung: mọi tài liệu có trường `tenantId` (ở đây là mã người bán) và mọi truy vấn phải lọc theo nó. Tài liệu của MongoDB Atlas về kiến trúc nhiều khách nói rõ: ở mô hình này dữ liệu chỉ được tách bằng điều kiện lọc, và chính ứng dụng phải giữ điều kiện đó. Một tài khoản database đọc được dữ liệu của mọi tenant.

Index kép phục vụ truy vấn trên tiền tố (prefix) của nó. Index `{ tenantId: 1, status: 1, createdAt: -1 }` phục vụ `find({ tenantId })`, `find({ tenantId, status })` và cả phần sắp xếp theo `createdAt`. Mọi truy vấn của trang người bán đều có `tenantId`, nên đặt nó đầu mọi index kép thì đoạn quét chỉ còn khóa của một người bán. Phần sau `tenantId` vẫn theo ESR: bằng, sắp, khoảng.

Pipeline cũng vậy: `$match` trên `tenantId` đứng đầu, trước `$unwind`, `$lookup`, `$group`. Lệnh ghi hàng loạt (`updateMany`, `deleteMany`) quên `tenantId` thì đổi đơn của cả chợ.

Lab chạy bằng mingo: kết quả và lệnh ghi được chấm thật; thứ tự index và vị trí `$match` được chấm theo quy tắc, không đo.

## Cú pháp

```text
db.<coll>.createIndex({
  tenantId: 1,
  <equality>: 1,
  <sort>: -1,
  <range>: 1
})
{ $match: { tenantId: <id>, ... } }
db.<coll>.updateMany(
  { tenantId: <id>, ... },
  { $set: { ... } })
```

- `tenantId` đầu tiên, rồi ESR cho phần còn lại.
- `$match` trên `tenantId` là stage đầu tiên.
- Lệnh ghi hàng loạt luôn có `tenantId` trong bộ lọc.

## Ví dụ

Trang "Đơn đã trả" của người bán `S07`, mới nhất trước:

```javascript
db.orders.find({
  tenantId: "S07",
  status: "paid"
}).sort({ createdAt: -1 })
```

Ba đơn: `7`, `4`, `1`. Không có đơn nào của `S03` hay `S12`.

Index cho câu đó, `tenantId` đầu tiên:

```javascript
db.orders.createIndex({
  tenantId: 1,
  status: 1,
  createdAt: -1
})
```

mingo chỉ trả danh sách index; trên `mongod`, đoạn khóa `S07` + `paid` đã theo thứ tự `createdAt`.

Cùng index phục vụ câu chỉ có `tenantId`, nhờ quy tắc tiền tố:

```javascript
db.orders.countDocuments({
  tenantId: "S07"
})
```

## Lỗi hay gặp

Quên `tenantId` trong câu đọc. Câu sai trả đơn chờ của cả ba người bán:

```javascript
// WRONG
db.orders.find({ status: "pending" })
```

```javascript
// FIX
db.orders.find({
  tenantId: "S07",
  status: "pending"
})
```

Index không có `tenantId`. Kết quả không lộ lỗi; trên `mongod`, mỗi trang người bán đi qua khóa của cả chợ:

```javascript
// WRONG
db.orders.createIndex({
  status: 1,
  createdAt: -1
})
```

```javascript
// FIX
db.orders.createIndex({
  tenantId: 1,
  status: 1,
  createdAt: -1
})
```

Lệnh ghi quên `tenantId`. Câu sai hủy cả đơn của `S03` và `S12`:

```javascript
// WRONG
db.orders.updateMany(
  { status: "pending" },
  { $set: { status: "cancelled" } })
```

```javascript
// FIX
db.orders.updateMany(
  { tenantId: "S07",
    status: "pending" },
  { $set: { status: "cancelled" } })
```

## Thực hành

Ba bước trên collection `orders` của ba người bán: index cho trang đơn đã trả, báo cáo số lượng của `S07`, rồi hủy đơn chờ của `S07`. Hai bước đầu có thanh quy tắc (ESR, `$match` đứng đầu); bước ghi được chấm trên collection sau khi ghi.

## Tóm tắt

- Mọi tài liệu, truy vấn và lệnh ghi đều mang `tenantId`.
- `tenantId` đứng đầu index kép; phần còn lại theo ESR.
- `$match` trên `tenantId` là stage đầu tiên của pipeline.
- Bản đồ chủ đề nhiều tenant: `e-ds-l4-09`; mô hình tenant trong MongoDB: `e-mg-l5-12`.

# EN

## Opening

Lantern Market lets each seller see only its own orders, and every order sits in one shared `orders` collection. An index without `tenantId` or a write that forgets `tenantId` is when one seller reads slowly because of the others, or changes another seller's orders by mistake. This lesson puts `tenantId` in three places: the index, the first `$match` and the filter of the write.

## Key idea

The shared-collection model: every document has a `tenantId` field (here the seller code) and every query must filter on it. MongoDB Atlas's multi-tenant architecture page says plainly that the separation is logical and kept by the application tier: one database user can read every tenant's data.

A compound index serves queries on its prefix. The index `{ tenantId: 1, status: 1, createdAt: -1 }` serves `find({ tenantId })`, `find({ tenantId, status })` and the sort on `createdAt` too. Every seller-page query has `tenantId`, so with it first in every compound index the scanned range holds one seller's keys only. The part after `tenantId` still follows ESR: equality, sort, range.

The same goes for pipelines: the `$match` on `tenantId` comes first, before `$unwind`, `$lookup`, `$group`. A bulk write (`updateMany`, `deleteMany`) that forgets `tenantId` changes the whole market's orders.

The lab runs on mingo: results and writes are really graded; index order and the position of `$match` are graded by rule, not measured.

## Syntax

```text
db.<coll>.createIndex({
  tenantId: 1,
  <equality>: 1,
  <sort>: -1,
  <range>: 1
})
{ $match: { tenantId: <id>, ... } }
db.<coll>.updateMany(
  { tenantId: <id>, ... },
  { $set: { ... } })
```

- `tenantId` first, then ESR for the rest.
- The `$match` on `tenantId` is the first stage.
- A bulk write always has `tenantId` in its filter.

## Example

The "Paid orders" page of seller `S07`, newest first:

```javascript
db.orders.find({
  tenantId: "S07",
  status: "paid"
}).sort({ createdAt: -1 })
```

Three orders: `7`, `4`, `1`. None from `S03` or `S12`.

The index for that query, `tenantId` first:

```javascript
db.orders.createIndex({
  tenantId: 1,
  status: 1,
  createdAt: -1
})
```

mingo only returns the index list; on `mongod`, the `S07` + `paid` part of the keys is already in `createdAt` order.

The same index serves a query with `tenantId` alone, by the prefix rule:

```javascript
db.orders.countDocuments({
  tenantId: "S07"
})
```

## Common mistakes

Forgetting `tenantId` in a read. The wrong one returns the pending orders of all three sellers:

```javascript
// WRONG
db.orders.find({ status: "pending" })
```

```javascript
// FIX
db.orders.find({
  tenantId: "S07",
  status: "pending"
})
```

An index without `tenantId`. The result hides the mistake; on `mongod`, every seller page walks the whole market's keys:

```javascript
// WRONG
db.orders.createIndex({
  status: 1,
  createdAt: -1
})
```

```javascript
// FIX
db.orders.createIndex({
  tenantId: 1,
  status: 1,
  createdAt: -1
})
```

A write that forgets `tenantId`. The wrong one also cancels the orders of `S03` and `S12`:

```javascript
// WRONG
db.orders.updateMany(
  { status: "pending" },
  { $set: { status: "cancelled" } })
```

```javascript
// FIX
db.orders.updateMany(
  { tenantId: "S07",
    status: "pending" },
  { $set: { status: "cancelled" } })
```

## Practice

Three steps on the `orders` collection of three sellers: an index for the paid-orders page, a units report for `S07`, then cancelling the pending orders of `S07`. The first two have a rule bar (ESR, `$match` first); the write is graded on the collection after it.

## Recap

- Every document, query and write carries `tenantId`.
- `tenantId` leads the compound index; the rest follows ESR.
- The `$match` on `tenantId` is the first stage of the pipeline.
- The multi-tenant topic map: `e-ds-l4-09`; tenancy models in MongoDB: `e-mg-l5-12`.
