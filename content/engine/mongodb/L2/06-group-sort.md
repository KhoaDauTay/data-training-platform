---
id: e-mg-l2-06
engine: mongodb
level: L2
module: aggregation
title: Gom nhóm với $group
title_en: Grouping with $group
kind: lab
runtime: browser
minutes: 14
objectives:
  - vi: Gom tài liệu theo một khóa và tổng hợp bằng `$sum`, `$avg`, `$max`.
    en: Group documents by a key and summarise them with `$sum`, `$avg`, `$max`.
  - vi: Xếp hạng nhóm bằng `$sort` + `$limit` và đếm bằng `$count`.
    en: Rank groups with `$sort` + `$limit` and count with `$count`.
requires: [e-mg-l2-05]
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/count/
lab:
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "customer": "c1", "store": "S1", "status": "paid", "createdAt": {"$date": "2026-10-05T09:00:00Z"}, "total": 95000, "lines": [{"sku": "p1", "qty": 2, "price": 25000}, {"sku": "p4", "qty": 1, "price": 45000}]},
      {"_id": 2, "customer": "c2", "store": "S2", "status": "shipped", "createdAt": {"$date": "2026-10-06T10:30:00Z"}, "total": 120000, "lines": [{"sku": "p2", "qty": 1, "price": 120000}]},
      {"_id": 3, "customer": "c1", "store": "S1", "status": "shipped", "createdAt": {"$date": "2026-10-12T08:15:00Z"}, "total": 450000, "lines": [{"sku": "p5", "qty": 1, "price": 350000}, {"sku": "p1", "qty": 4, "price": 25000}]},
      {"_id": 4, "customer": "c3", "store": "S1", "status": "cancelled", "createdAt": {"$date": "2026-10-13T14:00:00Z"}, "total": 150000, "lines": [{"sku": "p3", "qty": 10, "price": 15000}]},
      {"_id": 5, "customer": "c4", "store": "S2", "status": "paid", "createdAt": {"$date": "2026-10-14T11:45:00Z"}, "total": 210000, "lines": [{"sku": "p6", "qty": 2, "price": 60000}, {"sku": "p4", "qty": 2, "price": 45000}]},
      {"_id": 6, "customer": "c2", "store": "S2", "status": "paid", "createdAt": {"$date": "2026-10-20T16:20:00Z"}, "total": 25000, "lines": [{"sku": "p1", "qty": 1, "price": 25000}]},
      {"_id": 7, "customer": "c5", "store": "S1", "status": "shipped", "createdAt": {"$date": "2026-10-21T09:10:00Z"}, "total": 285000, "lines": [{"sku": "p2", "qty": 2, "price": 120000}, {"sku": "p3", "qty": 3, "price": 15000}]},
      {"_id": 8, "customer": "c1", "store": "S2", "status": "paid", "createdAt": {"$date": "2026-10-27T13:05:00Z"}, "total": 60000, "lines": [{"sku": "p6", "qty": 1, "price": 60000}]}
    ]}}
  steps:
    - task:
        vi: 'Doanh thu theo cửa hàng, bỏ đơn `"cancelled"`. Mỗi kết quả: `_id` là mã cửa hàng, `revenue` là tổng `total`, `orders` là số đơn.'
        en: 'Revenue per store, leaving out `"cancelled"` orders. Each result: `_id` is the store code, `revenue` the sum of `total`, `orders` the number of orders.'
      solution: 'db.orders.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: "$store", revenue: { $sum: "$total" }, orders: { $sum: 1 } } }])'
      check: doc
      hint:
        vi: '`{ $sum: "$total" }` cộng một trường; `{ $sum: 1 }` đếm tài liệu.'
        en: '`{ $sum: "$total" }` adds up a field; `{ $sum: 1 }` counts documents.'
    - task:
        vi: 'Hai khách chi nhiều nhất (bỏ đơn `"cancelled"`): `_id` là mã khách, `spent` là tổng `total`, chi nhiều nhất trước. Không có hai khách chi bằng nhau.'
        en: 'The two customers who spent the most (leaving out `"cancelled"` orders): `_id` is the customer code, `spent` the sum of `total`, biggest first. No two customers spent the same.'
      solution: 'db.orders.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: "$customer", spent: { $sum: "$total" } } }, { $sort: { spent: -1 } }, { $limit: 2 }])'
      check: doc
      ordered: true
      hint:
        vi: "`$group` rồi `$sort` giảm dần theo `spent`, rồi `$limit`."
        en: "`$group`, then `$sort` descending on `spent`, then `$limit`."
    - task:
        vi: 'Giá trị đơn trung bình và lớn nhất theo trạng thái: `_id` là `status`, `avgTotal`, `maxTotal`, xếp theo `_id` từ A tới Z.'
        en: 'Average and largest order value per status: `_id` is the `status`, `avgTotal`, `maxTotal`, sorted by `_id` from A to Z.'
      solution: 'db.orders.aggregate([{ $group: { _id: "$status", avgTotal: { $avg: "$total" }, maxTotal: { $max: "$total" } } }, { $sort: { _id: 1 } }])'
      check: doc
      ordered: true
      hint:
        vi: "Thứ tự ra của `$group` không cố định, nên phải `$sort` nếu cần thứ tự."
        en: "`$group` output order is not fixed, so `$sort` when you need an order."
    - task:
        vi: 'Đếm số đơn có `total` trên `100000`. Kết quả là một tài liệu với trường `bigOrders`.'
        en: 'Count the orders whose `total` is above `100000`. The result is one document with field `bigOrders`.'
      solution: 'db.orders.aggregate([{ $match: { total: { $gt: 100000 } } }, { $count: "bigOrders" }])'
      check: doc
      hint:
        vi: '`{ $count: "bigOrders" }` trả một tài liệu với số tài liệu đi vào nó.'
        en: '`{ $count: "bigOrders" }` returns one document with the number of documents that reached it.'
---
## Ý chính

`$group` gom mọi tài liệu có cùng giá trị khóa `_id` thành một tài liệu kết quả:

- `_id: "$store"` gom theo cửa hàng; `_id: null` gom tất cả thành một nhóm;
- mỗi trường còn lại là một phép tổng hợp: `$sum`, `$avg`, `$min`, `$max`, `$first`, `$last`, `$push`, `$addToSet`, `$count`;
- `{ $sum: 1 }` đếm số tài liệu trong nhóm.

Kết quả của `$group` không có thứ tự cố định. Cần thứ tự (top N, xếp theo tên) thì thêm `$sort`, và sắp theo khóa không trùng để kết quả luôn như nhau.

`$count` là cách gọn để đếm số tài liệu còn lại ở cuối pipeline.

Làm được: viết báo cáo "tổng, trung bình, lớn nhất theo nhóm" và top N.

## Ví dụ

```js
db.orders.aggregate([
  { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }
])
```

## Thực hành

Bốn bước trên `orders`. Hai bước giữa chấm cả thứ tự.

# EN

## Key idea

`$group` merges every document with the same `_id` key value into one result document:

- `_id: "$store"` groups by store; `_id: null` puts everything into one group;
- every other field is an accumulator: `$sum`, `$avg`, `$min`, `$max`, `$first`, `$last`, `$push`, `$addToSet`, `$count`;
- `{ $sum: 1 }` counts the documents in the group.

`$group` output has no fixed order. When you need one (top N, by name), add `$sort`, and sort on a unique key so the result is always the same.

`$count` is a short way to count the documents left at the end of a pipeline.

You can now: write "total, average, maximum per group" reports and top-N lists.

## Example

```js
db.orders.aggregate([
  { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }
])
```

## Practice

Four steps on `orders`. The two middle steps are graded in order.
