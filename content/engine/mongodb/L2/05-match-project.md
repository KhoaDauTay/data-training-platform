---
id: e-mg-l2-05
engine: mongodb
level: L2
module: aggregation
title: $match, $project và $set trong pipeline
title_en: $match, $project and $set in a pipeline
kind: lab
minutes: 12
objectives:
  - vi: Lọc bằng `$match` rồi đổi hình kết quả bằng `$project`.
    en: Filter with `$match`, then reshape the result with `$project`.
  - vi: Tính trường mới bằng biểu thức (`$multiply`, `$size`, `$dateToString`) với `$project` hoặc `$set`.
    en: Compute new fields with expressions (`$multiply`, `$size`, `$dateToString`) in `$project` or `$set`.
requires: [e-mg-l2-04]
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/set/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/datetostring/
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
        vi: Lấy các đơn `"paid"` của cửa hàng `"S2"`, mỗi kết quả chỉ có `_id`, `customer`, `total`.
        en: Return the `"paid"` orders of store `"S2"`, each result holding only `_id`, `customer`, `total`.
      solution: 'db.orders.aggregate([{ $match: { status: "paid", store: "S2" } }, { $project: { customer: 1, total: 1 } }])'
      check: doc
      hint:
        vi: "`$match` trước, `$project` sau. `_id` tự giữ lại."
        en: "`$match` first, `$project` second. `_id` is kept automatically."
    - task:
        vi: Với các đơn `"shipped"`, trả về `_id`, `total` và `vat` bằng 8% của `total`.
        en: For the `"shipped"` orders, return `_id`, `total` and `vat` equal to 8% of `total`.
      solution: 'db.orders.aggregate([{ $match: { status: "shipped" } }, { $project: { total: 1, vat: { $multiply: ["$total", 0.08] } } }])'
      check: doc
      hint:
        vi: 'Trong `$project`, một trường mới có thể là biểu thức: `{ $multiply: ["$total", 0.08] }`.'
        en: 'In `$project`, a new field can be an expression: `{ $multiply: ["$total", 0.08] }`.'
    - task:
        vi: 'Với các đơn của cửa hàng `"S1"`, trả về `_id`, `day` là ngày tạo dạng chuỗi `"YYYY-MM-DD"` (theo UTC) và `lineCount` là số dòng hàng.'
        en: 'For the orders of store `"S1"`, return `_id`, `day` as the creation date in the string form `"YYYY-MM-DD"` (UTC) and `lineCount` as the number of lines.'
      solution: 'db.orders.aggregate([{ $match: { store: "S1" } }, { $project: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, lineCount: { $size: "$lines" } } }])'
      check: doc
      hint:
        vi: '`$dateToString` với `format: "%Y-%m-%d"`; `$size` đếm phần tử của `lines`.'
        en: '`$dateToString` with `format: "%Y-%m-%d"`; `$size` counts the elements of `lines`.'
---
## Ý chính

- `$match` lọc tài liệu, dùng đúng cú pháp filter của `find`.
- `$project` chọn trường giống projection, và thêm được trường tính từ biểu thức: `{ vat: { $multiply: ["$total", 0.08] } }`.
- `$set` (hay `$addFields`) giữ mọi trường cũ và thêm hoặc ghi đè trường mới. Dùng `$set` khi chỉ muốn thêm vài trường, `$project` khi muốn chọn hẳn hình kết quả.

Trong biểu thức, `"$total"` là giá trị của trường `total`. Một số toán tử biểu thức hay dùng: `$add`, `$subtract`, `$multiply`, `$divide`, `$round`, `$size`, `$cond`, `$dateToString`.

Làm được: lọc rồi trả đúng hình dữ liệu một màn hình cần, kèm các cột tính sẵn.

## Ví dụ

```js
db.orders.aggregate([
  { $match: { total: { $gte: 100000 } } },
  { $set: { big: true } },
  { $project: { lines: 0 } }
])
```

## Thực hành

Ba bước trên `orders` (8 đơn ở hai cửa hàng `"S1"` và `"S2"`, tháng 10/2026).

# EN

## Key idea

- `$match` filters documents with exactly the filter syntax of `find`.
- `$project` picks fields like a projection and can add fields computed from expressions: `{ vat: { $multiply: ["$total", 0.08] } }`.
- `$set` (or `$addFields`) keeps every existing field and adds or overwrites new ones. Use `$set` to add a few fields, `$project` to choose the result's exact shape.

In an expression, `"$total"` is the value of field `total`. Some common expression operators: `$add`, `$subtract`, `$multiply`, `$divide`, `$round`, `$size`, `$cond`, `$dateToString`.

You can now: filter and return exactly the data shape a screen needs, with computed columns.

## Example

```js
db.orders.aggregate([
  { $match: { total: { $gte: 100000 } } },
  { $set: { big: true } },
  { $project: { lines: 0 } }
])
```

## Practice

Three steps on `orders` (8 orders at two stores `"S1"` and `"S2"`, October 2026).
