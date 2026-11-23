---
id: e-mg-l2-09
engine: mongodb
level: L2
module: aggregation
title: Chia khoảng với $bucket, nhiều báo cáo với $facet
title_en: Ranges with $bucket, several reports with $facet
kind: lab
runtime: browser
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
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortbycount/
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
        vi: 'Đếm số đơn theo ba khoảng `total`: dưới `100000`, từ `100000` tới dưới `300000`, từ `300000` tới dưới `1000000`. Mỗi khoảng một kết quả: `_id` là cận dưới, `orders` là số đơn.'
        en: 'Count orders in three `total` ranges: under `100000`, `100000` up to `300000`, `300000` up to `1000000`. One result per range: `_id` is the lower bound, `orders` the number of orders.'
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
    - task:
        vi: 'Đếm số đơn theo hai khoảng `total`: dưới `100000` và từ `100000` tới dưới `300000`. Đơn từ `300000` trở lên vào nhóm `"big"`. Mỗi nhóm một kết quả: `_id` là cận dưới hoặc `"big"`, `orders` là số đơn.'
        en: 'Count orders in two `total` ranges: under `100000` and `100000` up to `300000`. Orders of `300000` or more go to the group `"big"`. One result per group: `_id` is the lower bound or `"big"`, `orders` the number of orders.'
      solution: 'db.orders.aggregate([{ $bucket: { groupBy: "$total", boundaries: [0, 100000, 300000], default: "big", output: { orders: { $sum: 1 } } } }])'
      check: doc
      hint:
        vi: '`default` đặt tên nhóm cho giá trị nằm ngoài mọi khoảng.'
        en: '`default` names the group for values outside every range.'
quiz:
  - q:
      vi: 'Với `boundaries: [0, 100000, 300000]`, một đơn có `total` đúng `100000` vào nhóm nào?'
      en: 'With `boundaries: [0, 100000, 300000]`, which group does an order with a `total` of exactly `100000` fall into?'
    options:
      - vi: 'Nhóm `_id` `0`, vì `100000` là cận trên của nó'
        en: 'Group `_id` `0`, because `100000` is its upper bound'
      - vi: 'Nhóm `_id` `100000`'
        en: 'Group `_id` `100000`'
      - vi: Không nhóm nào, nên lệnh báo lỗi
        en: No group, so the command fails
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý nếu coi mỗi khoảng là "từ … đến …" gồm cả hai đầu, nhưng mỗi khoảng của `$bucket` gồm cận dưới và không gồm cận trên. `100000` là cận dưới của nhóm thứ hai.'
      en: 'It sounds right if each range is "from … to …" with both ends included, but each `$bucket` range includes its lower bound and excludes its upper bound. `100000` is the lower bound of the second group.'
  - q:
      vi: '`$facet` có hai pipeline con. Nó trả ra bao nhiêu tài liệu?'
      en: 'A `$facet` has two sub-pipelines. How many documents does it return?'
    options:
      - vi: Hai, mỗi pipeline con một tài liệu
        en: Two, one per sub-pipeline
      - vi: Một, mỗi pipeline con là một trường mảng của nó
        en: One, with each sub-pipeline as an array field of it
      - vi: Bằng số tài liệu đầu vào
        en: As many as the input documents
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì có hai báo cáo, nhưng `$facet` luôn trả đúng một tài liệu; mỗi tên trong `$facet` là một trường chứa mảng kết quả của pipeline con đó.'
      en: 'It sounds right because there are two reports, but `$facet` always returns exactly one document; each name in `$facet` is a field holding the array result of that sub-pipeline.'
---
## Mở bài

Trang tổng quan cần biểu đồ đơn theo khoảng giá trị, số đơn theo trạng thái và đơn lớn nhất. Ba lệnh `aggregate` là ba lần đọc cùng dữ liệu. Có cách nào chia khoảng và trả nhiều báo cáo trong một lần?

## Ý chính

`$bucket` gom tài liệu theo khoảng của một giá trị:

- `groupBy`: giá trị để chia, ví dụ `"$total"`;
- `boundaries`: các cận tăng dần; khoảng `[a, b)` gồm a, không gồm b;
- `default`: tên nhóm cho giá trị nằm ngoài mọi khoảng (thiếu `default` mà có giá trị ngoài khoảng thì lệnh báo lỗi);
- `output`: các phép tổng hợp, như `$group`.

`$facet` chạy nhiều pipeline con trên cùng một dòng tài liệu đầu vào và trả về đúng một tài liệu, mỗi trường là kết quả của một pipeline con. Hợp với trang tổng quan cần nhiều con số cùng lúc.

`$sortByCount: "$status"` là cách viết gọn của gom nhóm đếm rồi sắp giảm dần.

Làm được: dựng biểu đồ phân bố theo khoảng và trả nhiều chỉ số cho một trang tổng quan trong một lệnh.

## Cú pháp

```text
{ $bucket: { groupBy: "$<field>", boundaries: [a, b, c], default: "<other>", output: { <name>: { <accumulator> } } } }
{ $facet: { <name>: [ <stages> ], <name>: [ <stages> ] } }
{ $sortByCount: "$<field>" }
```

- Mỗi khoảng `[a, b)` gồm cận dưới, không gồm cận trên.
- `$facet` trả một tài liệu, mỗi tên là một mảng kết quả.

## Ví dụ

Số đơn và cửa hàng của các đơn đã thanh toán, trong một lệnh:

```js
db.orders.aggregate([
  { $match: { status: "paid" } },
  { $facet: {
      count: [{ $count: "n" }],
      byStore: [{ $sortByCount: "$store" }]
  } }
])
```

Số đơn theo cửa hàng, nhiều nhất trước:

```js
db.orders.aggregate([{ $sortByCount: "$store" }])
```

## Lỗi hay gặp

Có giá trị nằm ngoài mọi khoảng mà không có `default`:

```js
// ERROR mingo
db.orders.aggregate([{ $bucket: { groupBy: "$total", boundaries: [0, 100000, 300000] } }])
```

Đơn 3 có `total` là 450000, không thuộc khoảng nào.

Quên dấu `$` ở `$sortByCount`:

```js
// WRONG: "status" is a constant, so all 8 orders form one group
db.orders.aggregate([{ $sortByCount: "status" }])
```

```js
// FIX: "$status" counts per status value
db.orders.aggregate([{ $sortByCount: "$status" }])
```

## Thực hành

Ba bước trên `orders` (8 đơn, `total` từ 25.000 tới 450.000).

## Tóm tắt

- `$bucket` chia tài liệu theo khoảng `[a, b)` của một giá trị.
- Giá trị ngoài mọi khoảng cần `default`, nếu không lệnh báo lỗi.
- `$facet` chạy nhiều pipeline con và trả đúng một tài liệu.
- `$sortByCount` là đếm theo nhóm rồi sắp giảm dần.

# EN

## Opening

The dashboard needs a histogram of orders by value range, the number of orders per status and the largest order. Three `aggregate` commands read the same data three times. Is there a way to bucket and return several reports in one pass?

## Key idea

`$bucket` groups documents by ranges of a value:

- `groupBy`: the value to split on, such as `"$total"`;
- `boundaries`: ascending bounds; a range `[a, b)` includes a and excludes b;
- `default`: the group name for values outside every range (without `default`, a value outside the ranges makes the command fail);
- `output`: accumulators, as in `$group`.

`$facet` runs several sub-pipelines over the same input documents and returns exactly one document, each field holding the result of one sub-pipeline. It suits a dashboard that needs many numbers at once.

`$sortByCount: "$status"` is shorthand for a counting group followed by a descending sort.

You can now: build a range histogram and return several dashboard numbers in one command.

## Syntax

```text
{ $bucket: { groupBy: "$<field>", boundaries: [a, b, c], default: "<other>", output: { <name>: { <accumulator> } } } }
{ $facet: { <name>: [ <stages> ], <name>: [ <stages> ] } }
{ $sortByCount: "$<field>" }
```

- Each range `[a, b)` includes its lower bound and excludes its upper bound.
- `$facet` returns one document, each name holding an array of results.

## Example

The count and the stores of the paid orders, in one command:

```js
db.orders.aggregate([
  { $match: { status: "paid" } },
  { $facet: {
      count: [{ $count: "n" }],
      byStore: [{ $sortByCount: "$store" }]
  } }
])
```

The number of orders per store, most first:

```js
db.orders.aggregate([{ $sortByCount: "$store" }])
```

## Common mistakes

A value outside every range and no `default`:

```js
// ERROR mingo
db.orders.aggregate([{ $bucket: { groupBy: "$total", boundaries: [0, 100000, 300000] } }])
```

Order 3 has a `total` of 450000, which fits no range.

Forgetting the `$` in `$sortByCount`:

```js
// WRONG: "status" is a constant, so all 8 orders form one group
db.orders.aggregate([{ $sortByCount: "status" }])
```

```js
// FIX: "$status" counts per status value
db.orders.aggregate([{ $sortByCount: "$status" }])
```

## Practice

Three steps on `orders` (8 orders, `total` from 25,000 to 450,000).

## Recap

- `$bucket` splits documents by `[a, b)` ranges of a value.
- Values outside every range need `default`, or the command fails.
- `$facet` runs several sub-pipelines and returns exactly one document.
- `$sortByCount` counts per group and sorts descending.
