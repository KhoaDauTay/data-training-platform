---
id: e-mg-l2-07
engine: mongodb
level: L2
module: aggregation
title: Tách mảng với $unwind
title_en: Splitting arrays with $unwind
kind: lab
runtime: browser
minutes: 12
objectives:
  - vi: Dùng `$unwind` để biến mỗi phần tử mảng thành một tài liệu, rồi gom nhóm theo phần tử.
    en: Use `$unwind` to turn each array element into its own document, then group by element.
  - vi: Giữ lại tài liệu có mảng rỗng bằng `preserveNullAndEmptyArrays`.
    en: Keep documents with an empty array using `preserveNullAndEmptyArrays`.
requires: [e-mg-l2-06]
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/
lab:
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "customer": "c1", "store": "S1", "status": "paid", "lines": [{"sku": "p1", "qty": 2, "price": 25000}, {"sku": "p4", "qty": 1, "price": 45000}]},
      {"_id": 2, "customer": "c2", "store": "S2", "status": "shipped", "lines": [{"sku": "p2", "qty": 1, "price": 120000}]},
      {"_id": 3, "customer": "c1", "store": "S1", "status": "shipped", "lines": [{"sku": "p5", "qty": 1, "price": 350000}, {"sku": "p1", "qty": 4, "price": 25000}]},
      {"_id": 4, "customer": "c3", "store": "S1", "status": "cancelled", "lines": [{"sku": "p3", "qty": 10, "price": 15000}]},
      {"_id": 5, "customer": "c4", "store": "S2", "status": "paid", "lines": [{"sku": "p6", "qty": 2, "price": 60000}, {"sku": "p4", "qty": 2, "price": 45000}]},
      {"_id": 6, "customer": "c2", "store": "S2", "status": "paid", "lines": [{"sku": "p1", "qty": 1, "price": 25000}]},
      {"_id": 7, "customer": "c5", "store": "S1", "status": "shipped", "lines": [{"sku": "p2", "qty": 2, "price": 120000}, {"sku": "p3", "qty": 3, "price": 15000}]},
      {"_id": 8, "customer": "c1", "store": "S2", "status": "paid", "lines": [{"sku": "p6", "qty": 1, "price": 60000}]},
      {"_id": 9, "customer": "c4", "store": "S1", "status": "draft", "lines": []}
    ]}}
  steps:
    - task:
        vi: 'Số đơn vị đã bán của từng sản phẩm, chỉ tính đơn `"paid"` và `"shipped"`: `_id` là mã sản phẩm, `units` là tổng `qty`, xếp theo `_id` từ A tới Z.'
        en: 'Units sold per product, counting only `"paid"` and `"shipped"` orders: `_id` is the product code, `units` the sum of `qty`, sorted by `_id` from A to Z.'
      solution: 'db.orders.aggregate([{ $match: { status: { $in: ["paid", "shipped"] } } }, { $unwind: "$lines" }, { $group: { _id: "$lines.sku", units: { $sum: "$lines.qty" } } }, { $sort: { _id: 1 } }])'
      check: doc
      ordered: true
      hint:
        vi: 'Sau `$unwind: "$lines"`, `lines` là một tài liệu chứ không còn là mảng, nên gom theo `"$lines.sku"`.'
        en: 'After `$unwind: "$lines"`, `lines` is one document instead of an array, so group by `"$lines.sku"`.'
    - task:
        vi: 'Ba sản phẩm mang lại doanh thu cao nhất (đơn `"paid"` và `"shipped"`): `_id` là mã sản phẩm, `revenue` là tổng `qty` × `price`, cao nhất trước. Không có hai doanh thu bằng nhau.'
        en: 'The three products with the highest revenue (`"paid"` and `"shipped"` orders): `_id` is the product code, `revenue` the sum of `qty` × `price`, highest first. No two revenues are equal.'
      solution: 'db.orders.aggregate([{ $match: { status: { $in: ["paid", "shipped"] } } }, { $unwind: "$lines" }, { $group: { _id: "$lines.sku", revenue: { $sum: { $multiply: ["$lines.qty", "$lines.price"] } } } }, { $sort: { revenue: -1 } }, { $limit: 3 }])'
      check: doc
      ordered: true
      hint:
        vi: '`$sum` nhận cả biểu thức: `{ $sum: { $multiply: ["$lines.qty", "$lines.price"] } }`.'
        en: '`$sum` accepts an expression: `{ $sum: { $multiply: ["$lines.qty", "$lines.price"] } }`.'
    - task:
        vi: 'Với các đơn `"draft"` và `"cancelled"`, trả mỗi dòng hàng thành một kết quả gồm `_id` của đơn và `sku`. Đơn không có dòng nào vẫn phải hiện (không có `sku`).'
        en: 'For the `"draft"` and `"cancelled"` orders, return one result per line with the order `_id` and `sku`. An order with no line must still appear (without `sku`).'
      solution: 'db.orders.aggregate([{ $match: { status: { $in: ["draft", "cancelled"] } } }, { $unwind: { path: "$lines", preserveNullAndEmptyArrays: true } }, { $project: { sku: "$lines.sku" } }])'
      check: doc
      hint:
        vi: "Mặc định `$unwind` bỏ tài liệu có mảng rỗng. Dùng dạng tài liệu với `preserveNullAndEmptyArrays: true`."
        en: "By default `$unwind` drops documents with an empty array. Use the document form with `preserveNullAndEmptyArrays: true`."
---
## Ý chính

`$unwind: "$lines"` biến một đơn có 3 dòng hàng thành 3 tài liệu, mỗi tài liệu giữ mọi trường của đơn và một dòng trong `lines`. Đây là cách gom nhóm theo thứ nằm trong mảng: theo sản phẩm, theo nhãn, theo từng dòng.

Hai điều cần nhớ:

- tài liệu có mảng rỗng, `null` hoặc thiếu trường bị bỏ, trừ khi dùng `{ path: "$lines", preserveNullAndEmptyArrays: true }`;
- số tài liệu tăng lên, nên lọc bằng `$match` trước `$unwind` khi được.

Không phải lúc nào cũng cần `$unwind`: tổng của một đơn tính ngay trong tài liệu bằng `$sum` trên mảng, không cần tách.

Làm được: báo cáo theo sản phẩm từ các đơn có dòng hàng nhúng.

## Ví dụ

```js
db.orders.aggregate([
  { $unwind: "$lines" },
  { $match: { "lines.qty": { $gte: 4 } } },
  { $project: { sku: "$lines.sku", qty: "$lines.qty" } }
])
```

## Thực hành

Ba bước trên `orders`. Đơn 9 là đơn nháp chưa có dòng hàng nào. Trước bước 3, đoán trước: với `$unwind` mặc định, đơn 9 có hiện trong kết quả không?

# EN

## Key idea

`$unwind: "$lines"` turns an order with 3 lines into 3 documents, each keeping every field of the order plus one line in `lines`. This is how you group by what sits inside an array: per product, per tag, per line.

Two things to remember:

- documents whose array is empty, `null` or missing are dropped, unless you use `{ path: "$lines", preserveNullAndEmptyArrays: true }`;
- the number of documents grows, so filter with `$match` before `$unwind` when you can.

You do not always need `$unwind`: an order's own total is computed inside the document with `$sum` over the array, with no split.

You can now: report per product from orders with embedded lines.

## Example

```js
db.orders.aggregate([
  { $unwind: "$lines" },
  { $match: { "lines.qty": { $gte: 4 } } },
  { $project: { sku: "$lines.sku", qty: "$lines.qty" } }
])
```

## Practice

Three steps on `orders`. Order 9 is a draft with no line yet. Before step 3, predict: with a default `$unwind`, does order 9 show up in the result?
