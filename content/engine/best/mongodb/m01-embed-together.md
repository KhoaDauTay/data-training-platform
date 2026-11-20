---
id: e-bp-m01
engine: best
track: mongodb
level: L1
module: m
title: "Đọc cùng nhau thì lưu cùng nhau: embed"
title_en: "Data read together is stored together: embed"
kind: quiz
minutes: 4
objectives:
  - vi: "Embed dữ liệu con luôn đọc cùng cha và có số lượng giới hạn (dòng hàng của một đơn) vào tài liệu cha."
    en: "Embed child data that is always read with its parent and bounded in size (an order's lines) into the parent document."
avoid:
  vi: "Một `$lookup` ở mọi báo cáo chỉ để ghép lại thứ lẽ ra nằm chung một tài liệu."
  en: "A `$lookup` in every report just to put back together what belongs in one document."
requires: [e-mg-l2-11]
skills: [join]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/best-practices/#link-related-data
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/
verified: { version: "mingo 7.2.6", date: "2026-11-20" }
pair:
  runtime: mingo
  check: same
  setup: |
    {"collections": {
      "orders": [
        {"_id": 1, "customerId": 10, "status": "PAID", "total": 120, "createdAt": {"$date": "2026-10-01T00:00:00Z"}, "items": [{"sku": "A", "qty": 1, "price": 100}, {"sku": "B", "qty": 2, "price": 10}]},
        {"_id": 2, "customerId": 11, "status": "PAID", "total": 50, "createdAt": {"$date": "2026-10-03T00:00:00Z"}, "items": [{"sku": "B", "qty": 5, "price": 10}]},
        {"_id": 3, "customerId": 10, "status": "CANCELLED", "total": 30, "createdAt": {"$date": "2026-10-05T00:00:00Z"}, "items": [{"sku": "C", "qty": 1, "price": 30}]},
        {"_id": 4, "customerId": 12, "status": "PAID", "total": 300, "createdAt": {"$date": "2026-10-20T00:00:00Z"}, "items": [{"sku": "A", "qty": 3, "price": 100}]},
        {"_id": 5, "customerId": 11, "status": "PAID", "total": 75, "createdAt": {"$date": "2026-10-28T00:00:00Z"}, "items": [{"sku": "C", "qty": 2, "price": 30}, {"sku": "B", "qty": 1, "price": 15}]}
      ],
      "order_lines": [
        {"orderId": 1, "sku": "A", "qty": 1, "price": 100}, {"orderId": 1, "sku": "B", "qty": 2, "price": 10},
        {"orderId": 2, "sku": "B", "qty": 5, "price": 10}, {"orderId": 3, "sku": "C", "qty": 1, "price": 30},
        {"orderId": 4, "sku": "A", "qty": 3, "price": 100},
        {"orderId": 5, "sku": "C", "qty": 2, "price": 30}, {"orderId": 5, "sku": "B", "qty": 1, "price": 15}
      ]
    }}
  bad: |
    db.orders.aggregate([
      { $match: { status: 'PAID' } },
      { $lookup: { from: 'order_lines', localField: '_id', foreignField: 'orderId', as: 'lines' } },
      { $unwind: '$lines' },
      { $group: { _id: '$lines.sku', revenue: { $sum: { $multiply: ['$lines.qty', '$lines.price'] } } } },
      { $sort: { _id: 1 } }
    ])
  good: |
    db.orders.aggregate([
      { $match: { status: 'PAID' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.sku', revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } } } },
      { $sort: { _id: 1 } }
    ])
  expect: null
quiz:
  - q:
      vi: "Dòng hàng của một đơn luôn được đọc và sửa cùng đơn, mỗi đơn vài chục dòng là nhiều. Nên mô hình thế nào?"
      en: "An order's lines are always read and changed with the order, and an order has a few dozen lines at most. How should you model them?"
    options:
      - { vi: "Collection `order_lines` riêng, `$lookup` khi đọc", en: "A separate `order_lines` collection, `$lookup` on read" }
      - { vi: "Mảng `items` embed trong tài liệu đơn", en: "An `items` array embedded in the order document" }
      - { vi: "Mỗi dòng hàng một collection", en: "One collection per line" }
    answer: 1
    why:
      vi: "Đọc cùng nhau, ghi cùng nhau, số lượng có giới hạn: embed. Một lần đọc lấy đủ, và sửa trong một tài liệu là atomic nên không cần transaction. Reference hợp khi con được đọc riêng, dùng chung, hoặc tăng không giới hạn."
      en: "Read together, written together, bounded in number: embed. One read fetches everything, and a change inside one document is atomic, so no transaction is needed. References fit children that are read on their own, shared, or unbounded."
---

## Ý chính

Mô hình hóa từ access pattern. Dữ liệu con luôn đọc và ghi cùng cha, số lượng có giới hạn (dòng hàng của một đơn) thì **embed** vào tài liệu (document) cha. Dùng **reference** khi con được đọc riêng, dùng chung giữa nhiều cha, hoặc tăng không giới hạn.

## Vì sao

- Một lần đọc lấy đủ dữ liệu, không cần `$lookup`.
- Sửa trong một tài liệu là atomic, nên không cần transaction nhiều tài liệu.
- Đây là chỗ MongoDB khác SQL nhiều nhất: thay vì chuẩn hóa rồi JOIN, bạn gom theo cách đọc.

## Ví dụ

Doanh thu theo SKU của đơn đã trả: bản `$lookup` sang `order_lines` và bản `$unwind` mảng `items` cho cùng kết quả (A 400, B 85, C 60). Bản embed không cần ghép collection.

# EN

## Key idea

Model from the access patterns. Child data that is always read and written with its parent and bounded in number (an order's lines) is **embedded** in the parent document. Use a **reference** when the child is read on its own, shared by many parents, or grows without bound.

## Why

- One read fetches everything, with no `$lookup`.
- A change inside one document is atomic, so no multi-document transaction is needed.
- This is where MongoDB differs most from SQL: instead of normalising and joining, you group data the way it is read.

## Example

Revenue per SKU of paid orders: the `$lookup` into `order_lines` and the `$unwind` of the `items` array give the same result (A 400, B 85, C 60). The embedded version needs no second collection.
