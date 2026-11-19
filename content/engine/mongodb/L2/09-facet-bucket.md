---
id: e-mg-l2-09
engine: mongodb
level: L2
module: aggregation
title: Chia khoảng với $bucket, nhiều báo cáo với $facet
title_en: Ranges with $bucket, several reports with $facet
kind: lab
minutes: 12
objectives:
  - vi: Chia tài liệu vào các khoảng giá trị bằng `$bucket`.
    en: Put documents into value ranges with `$bucket`.
  - vi: Chạy nhiều pipeline con trên cùng dữ liệu trong một lần bằng `$facet`.
    en: Run several sub-pipelines over the same data in one pass with `$facet`.
requires: [e-mg-l2-06]
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortByCount/
lab:
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "customer": "c1", "store": "S1", "status": "paid", "total": 95000},
      {"_id": 2, "customer": "c2", "store": "S2", "status": "shipped", "total": 120000},
      {"_id": 3, "customer": "c1", "store": "S1", "status": "shipped", "total": 450000},
      {"_id": 4, "customer": "c3", "store": "S1", "status": "cancelled", "total": 150000},
      {"_id": 5, "customer": "c4", "store": "S2", "status": "paid", "total": 210000},
      {"_id": 6, "customer": "c2", "store": "S2", "status": "paid", "total": 25000},
      {"_id": 7, "customer": "c5", "store": "S1", "status": "shipped", "total": 285000},
      {"_id": 8, "customer": "c1", "store": "S2", "status": "paid", "total": 60000}
    ]}}
  steps:
    - task:
        vi: 'Đếm số đơn theo ba khoảng `total`: dưới 100000, từ 100000 tới dưới 300000, từ 300000 tới dưới 1000000. Mỗi khoảng một kết quả: `_id` là cận dưới, `orders` là số đơn.'
        en: 'Count orders in three `total` ranges: under 100000, 100000 up to 300000, 300000 up to 1000000. One result per range: `_id` is the lower bound, `orders` the number of orders.'
      solution: 'db.orders.aggregate([{ $bucket: { groupBy: "$total", boundaries: [0, 100000, 300000, 1000000], output: { orders: { $sum: 1 } } } }])'
      check: doc
      ordered: true
      hint:
        vi: '`boundaries` liệt kê các cận; mỗi khoảng gồm cận dưới, không gồm cận trên. `output` đặt tên trường đếm.'
        en: '`boundaries` lists the bounds; each range includes its lower bound and excludes its upper bound. `output` names the count field.'
    - task:
        vi: 'Trong một lệnh, trả về một tài liệu có hai trường: `byStatus` là số đơn theo `status` (nhiều nhất trước, mỗi phần tử có `_id` và `count`) và `top` là mảng chỉ có đơn có `total` lớn nhất, gồm `_id` và `total`.'
        en: 'In one command, return one document with two fields: `byStatus`, the number of orders per `status` (most first, each element with `_id` and `count`), and `top`, an array holding only the order with the largest `total`, with `_id` and `total`.'
      solution: 'db.orders.aggregate([{ $facet: { byStatus: [{ $sortByCount: "$status" }], top: [{ $sort: { total: -1 } }, { $limit: 1 }, { $project: { total: 1 } }] } }])'
      check: doc
      hint:
        vi: '`$facet: { a: [ ... ], b: [ ... ] }`, mỗi tên một pipeline con. `$sortByCount` là `$group` đếm + `$sort` giảm dần.'
        en: '`$facet: { a: [ ... ], b: [ ... ] }`, one sub-pipeline per name. `$sortByCount` is a counting `$group` plus a descending `$sort`.'
---
## Ý chính

`$bucket` gom tài liệu theo khoảng của một giá trị:

- `groupBy`: giá trị để chia, ví dụ `"$total"`;
- `boundaries`: các cận tăng dần; khoảng `[a, b)` gồm a, không gồm b;
- `default`: tên nhóm cho giá trị nằm ngoài mọi khoảng (thiếu `default` mà có giá trị ngoài khoảng thì lệnh báo lỗi);
- `output`: các phép tổng hợp, như `$group`.

`$facet` chạy nhiều pipeline con trên cùng một dòng tài liệu đầu vào và trả về đúng một tài liệu, mỗi trường là kết quả của một pipeline con. Hợp với trang tổng quan cần nhiều con số cùng lúc.

`$sortByCount: "$status"` là cách viết gọn của gom nhóm đếm rồi sắp giảm dần.

Làm được: dựng biểu đồ phân bố theo khoảng và trả nhiều chỉ số cho một trang tổng quan trong một lệnh.

## Ví dụ

```js
db.orders.aggregate([
  { $match: { status: "paid" } },
  { $facet: {
      count: [{ $count: "n" }],
      byStore: [{ $sortByCount: "$store" }]
  } }
])
```

## Thực hành

Hai bước trên `orders` (8 đơn, `total` từ 25000 tới 450000).

# EN

## Key idea

`$bucket` groups documents by ranges of a value:

- `groupBy`: the value to split on, such as `"$total"`;
- `boundaries`: ascending bounds; a range `[a, b)` includes a and excludes b;
- `default`: the group name for values outside every range (without `default`, a value outside the ranges makes the command fail);
- `output`: accumulators, as in `$group`.

`$facet` runs several sub-pipelines over the same input documents and returns exactly one document, each field holding the result of one sub-pipeline. It suits a dashboard that needs many numbers at once.

`$sortByCount: "$status"` is shorthand for a counting group followed by a descending sort.

You can now: build a range histogram and return several dashboard numbers in one command.

## Example

```js
db.orders.aggregate([
  { $match: { status: "paid" } },
  { $facet: {
      count: [{ $count: "n" }],
      byStore: [{ $sortByCount: "$store" }]
  } }
])
```

## Practice

Two steps on `orders` (8 orders, `total` from 25000 to 450000).
