---
id: e-bp-m09
engine: best
track: mongodb
level: L2
module: m
title: "Pipeline: $match sớm, $sort + $limit cạnh nhau"
title_en: "Pipelines: $match early, $sort next to $limit"
kind: quiz
minutes: 4
objectives:
  - vi: "Đặt `$match` (và `$project` bớt trường) trước `$unwind`, `$group`, `$lookup`; viết top N bằng `$sort` ngay trước `$limit`."
    en: "Put `$match` (and a trimming `$project`) before `$unwind`, `$group` and `$lookup`; write a top N as `$sort` right before `$limit`."
avoid:
  vi: "Pipeline tách mảng và gom nhóm mọi tài liệu rồi mới bỏ phần lớn đi."
  en: "A pipeline that unwinds and groups every document before throwing most of them away."
requires: [e-mg-l3-12]
skills: [where, group_by]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
verified: { version: "mingo 7.2.6", date: "2026-11-20" }
pair:
  runtime: mingo
  check: same
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "customerId": 10, "status": "PAID", "total": 120, "items": [{"sku": "A", "qty": 1, "price": 100}, {"sku": "B", "qty": 2, "price": 10}]},
      {"_id": 2, "customerId": 11, "status": "PAID", "total": 50, "items": [{"sku": "B", "qty": 5, "price": 10}]},
      {"_id": 3, "customerId": 10, "status": "CANCELLED", "total": 30, "items": [{"sku": "C", "qty": 1, "price": 30}]},
      {"_id": 4, "customerId": 12, "status": "PAID", "total": 300, "items": [{"sku": "A", "qty": 3, "price": 100}]},
      {"_id": 5, "customerId": 11, "status": "PAID", "total": 75, "items": [{"sku": "C", "qty": 2, "price": 30}, {"sku": "B", "qty": 1, "price": 15}]}
    ]}}
  bad: |
    db.orders.aggregate([
      { $unwind: '$items' },
      { $group: { _id: { order: '$_id', status: '$status' }, units: { $sum: '$items.qty' } } },
      { $match: { '_id.status': 'PAID' } },
      { $sort: { units: -1, '_id.order': 1 } },
      { $project: { _id: 0, order: '$_id.order', units: 1 } },
      { $limit: 2 }
    ])
  good: |
    db.orders.aggregate([
      { $match: { status: 'PAID' } },
      { $project: { items: 1 } },
      { $unwind: '$items' },
      { $group: { _id: '$_id', units: { $sum: '$items.qty' } } },
      { $sort: { units: -1, _id: 1 } },
      { $limit: 2 },
      { $project: { _id: 0, order: '$_id', units: 1 } }
    ])
  expect: null
quiz:
  - q:
      vi: "Pipeline nào để MongoDB dùng được index trên `status` và gộp `$sort` với `$limit` thành top-k?"
      en: "Which pipeline lets MongoDB use an index on `status` and merge `$sort` with `$limit` into a top-k?"
    options:
      - { vi: "`$unwind` → `$group` → `$match` → `$sort` → `$project` → `$limit`", en: "`$unwind` → `$group` → `$match` → `$sort` → `$project` → `$limit`" }
      - { vi: "`$match` → `$project` → `$unwind` → `$group` → `$sort` → `$limit` → `$project`", en: "`$match` → `$project` → `$unwind` → `$group` → `$sort` → `$limit` → `$project`" }
      - { vi: "Như nhau: optimizer luôn tự sắp lại mọi stage", en: "Either: the optimizer always reorders every stage" }
    answer: 1
    why:
      vi: "Chỉ `$match` ở đầu pipeline mới dùng được index, và nó giảm số tài liệu đi qua các stage sau. `$sort` đứng ngay trước `$limit` thì server chỉ giữ k tài liệu tốt nhất. Optimizer chỉ tự đẩy `$match` lên trong một số trường hợp."
      en: "Only a `$match` at the start of the pipeline can use an index, and it cuts the documents flowing into the stages after it. A `$sort` right before `$limit` lets the server keep only the best k documents. The optimizer moves `$match` up only in some cases."
---

## Ý chính

Đặt `$match` (và `$project` bớt trường) càng sớm càng tốt, trước `$unwind`, `$group`, `$lookup`. Viết top N bằng `$sort` ngay trước `$limit`.

## Vì sao

- `$match` ở đầu pipeline dùng được index và giảm số tài liệu đi qua các stage sau.
- `$sort` + `$limit` cạnh nhau được gộp thành top-k, không phải sắp xếp toàn bộ.
- Optimizer chỉ tự đẩy `$match` lên trong một số trường hợp, đừng trông vào nó.

## Ví dụ

Hai pipeline cùng trả 2 đơn đã trả có nhiều sản phẩm nhất: đơn 2 (5 sản phẩm) và đơn 1 (3 sản phẩm, thắng hòa nhờ `_id` nhỏ hơn). Bản tốt tách mảng 4 đơn đã trả; bản kia tách cả 5 đơn rồi mới lọc. Chạy bằng mingo; lợi ích index chỉ có trên server thật.

# EN

## Key idea

Put `$match` (and a trimming `$project`) as early as possible, before `$unwind`, `$group` and `$lookup`. Write a top N as `$sort` right before `$limit`.

## Why

- A `$match` at the start can use an index and cuts the documents flowing into the stages after it.
- Adjacent `$sort` + `$limit` become a top-k, not a full sort.
- The optimizer moves `$match` up only in some cases, so do not rely on it.

## Example

Both pipelines return the 2 paid orders with the most units: order 2 (5 units) and order 1 (3 units, winning the tie by its smaller `_id`). The good one unwinds the 4 paid orders; the other unwinds all 5 and filters afterwards. This runs on mingo; the index benefit exists only on a real server.
