---
id: e-mg-l2-05
engine: mongodb
level: L2
module: aggregation
title: $match, $project và $set trong pipeline
title_en: $match, $project and $set in a pipeline
kind: lab
runtime: browser
minutes: 12
figures: [{ name: mg-pipeline, at: idea }]
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
        vi: Với các đơn `"shipped"`, trả về `_id`, `total` và `vat` bằng 8 % của `total`.
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
quiz:
  - q:
      vi: 'Sau stage `{ $set: { big: true } }`, mỗi tài liệu có những trường nào?'
      en: 'After the stage `{ $set: { big: true } }`, which fields does each document have?'
    options:
      - vi: Chỉ `_id` và `big`
        en: Only `_id` and `big`
      - vi: Mọi trường cũ, thêm `big`
        en: Every existing field, plus `big`
      - vi: Mọi trường cũ, nhưng `big` chỉ có ở tài liệu đã có trường đó
        en: Every existing field, but `big` only on documents that already had it
    answer: 1
    trap: 0
    why:
      vi: '"Chỉ `_id` và `big`" là kết quả của `$project`, không phải `$set`: `$set` (hay `$addFields`) giữ mọi trường cũ và chỉ thêm hoặc ghi đè trường được nêu. Nó cũng không xét tài liệu đã có `big` hay chưa: giá trị `true` là hằng, nên mọi tài liệu đi qua stage đều nhận `big: true`; tài liệu đã có `big` thì bị ghi đè.'
      en: '"Only `_id` and `big`" is what `$project` gives, not `$set`: `$set` (or `$addFields`) keeps every existing field and only adds or overwrites the ones it names. Nor does it check whether a document already has `big`: `true` is a constant, so every document passing the stage gets `big: true`; one that already had `big` is overwritten.'
  - q:
      vi: 'Stage `{ $project: { lines: 0 } }` trả về gì?'
      en: 'What does the stage `{ $project: { lines: 0 } }` return?'
    options:
      - vi: Mọi trường trừ `lines`
        en: Every field except `lines`
      - vi: Chỉ `_id`
        en: Only `_id`
      - vi: Một trường `lines` bằng 0
        en: A field `lines` equal to 0
    answer: 0
    why:
      vi: '`0` (hoặc `false`) là loại trừ: bỏ `lines`, giữ mọi trường khác như `customer`, `total`. "Chỉ `_id`" là cách đọc nhầm sang kiểu chọn, nơi `1` chỉ giữ các trường được nêu cộng `_id`. Muốn tạo trường có giá trị số 0 thì phải viết biểu thức `{ $literal: 0 }`; số `0` trần trong `$project` luôn là cờ loại trừ.'
      en: '`0` (or `false`) excludes: `lines` is dropped and every other field, such as `customer` and `total`, stays. "Only `_id`" mixes it up with the include style, where `1` keeps only the named fields plus `_id`. To create a field holding the number 0 you write the expression `{ $literal: 0 }`; a bare `0` in `$project` is always the exclude flag.'
---
## Mở bài

Màn hình hóa đơn cần đơn đã giao, mỗi đơn kèm tiền VAT tính sẵn, và không cần mảng dòng hàng. Nếu trả cả tài liệu, ứng dụng phải tự cắt và tự tính. Pipeline làm việc đó thế nào?

## Ý chính

- `$match` lọc tài liệu, dùng đúng cú pháp filter của `find`.
- `$project` chọn trường giống projection, và thêm được trường tính từ biểu thức: `{ vat: { $multiply: ["$total", 0.08] } }`.
- `$set` (hay `$addFields`) giữ mọi trường cũ và thêm hoặc ghi đè trường mới. Dùng `$set` khi chỉ muốn thêm vài trường, `$project` khi muốn chọn hẳn hình kết quả.

Trong biểu thức, `"$total"` là giá trị của trường `total`, còn `"total"` không có dấu `$` chỉ là chữ. Một số toán tử biểu thức hay dùng: `$add`, `$subtract`, `$multiply`, `$divide`, `$round`, `$size`, `$cond`, `$dateToString`.

Một `$project` hoặc chọn (`1`) hoặc loại (`0`), không trộn hai kiểu; riêng `_id` được loại trong một projection chọn.

Làm được: lọc rồi trả đúng hình dữ liệu một màn hình cần, kèm các trường tính sẵn.

Hình từng bước ở cuối mục này cho tài liệu đi qua từng stage của một pipeline. Nó mở đầu bằng `$match`, stage đầu tiên của bài này; `$project` đứng ở cùng chỗ khi bạn cần đổi hình tài liệu.

## Cú pháp

```text
{ $match: { <filter like find> } }
{ $project: { <field>: 1, <newField>: <expression> } }
{ $set: { <newField>: <expression> } }
```

- `$project` chọn hình kết quả; `$set` chỉ thêm hoặc ghi đè.
- Biểu thức đọc trường bằng `"$<field>"`.

## Ví dụ

Đơn từ 100000, đánh dấu `big` và bỏ mảng `lines`:

```js
db.orders.aggregate([
  { $match: { total: { $gte: 100000 } } },
  { $set: { big: true } },
  { $project: { lines: 0 } }
])
```

Năm đơn từ 100000 trở lên trở về, mỗi đơn có thêm `big: true` và không còn `lines`. Các stage chạy theo thứ tự: `$set` thêm trường, rồi `$project` kiểu loại bỏ đúng một trường.

Đơn đã giao với tiền VAT làm tròn tới đồng:

```js
db.orders.aggregate([
  { $match: { status: "shipped" } },
  { $project: { total: 1, vat: { $round: [{ $multiply: ["$total", 0.08] }, 0] } } }
])
```

Ba đơn đã giao: 2, 3, 7, với `vat` lần lượt 9600, 36000, 22800. Mỗi kết quả chỉ có `_id`, `total`, `vat`, vì `$project` kiểu chọn bỏ mọi trường khác.

## Lỗi hay gặp

Quên dấu `$` trước tên trường trong biểu thức:

```js
// WRONG: "customer" without $ is just text
db.orders.aggregate([{ $match: { store: "S2" } }, { $project: { buyer: { $concat: ["customer", "-", "$store"] } } }])
```

```js
// FIX: "$customer" reads the field
db.orders.aggregate([{ $match: { store: "S2" } }, { $project: { buyer: { $concat: ["$customer", "-", "$store"] } } }])
```

Bản sai cho cả bốn đơn cùng `buyer: "customer-S2"`, không lỗi nào. Bản sửa ra `"c2-S2"`, `"c4-S2"`… Thấy cùng một giá trị lặp ở mọi tài liệu là dấu hiệu quên `$`.

Dùng `$project` khi chỉ muốn thêm một trường:

```js
// WRONG: only _id and vat are left
db.orders.aggregate([{ $match: { status: "paid" } }, { $project: { vat: { $multiply: ["$total", 0.08] } } }])
```

```js
// FIX: $set keeps the order and adds vat
db.orders.aggregate([{ $match: { status: "paid" } }, { $set: { vat: { $multiply: ["$total", 0.08] } } }])
```

Bản sai chỉ còn `_id` và `vat` (ví dụ đơn 1: 7600); `customer`, `total`, `lines` đều mất. Bản sửa giữ cả đơn và thêm `vat`. Chọn stage theo câu hỏi: cần đúng vài trường thì `$project`, cần thêm vào tài liệu thì `$set`.

## Thực hành

Ba bước trên `orders` (8 đơn ở hai cửa hàng `"S1"` và `"S2"`, tháng 10/2026). Bước 1 lọc theo hai điều kiện rồi chọn ba trường. Bước 2 thêm một trường tính bằng `$multiply`. Bước 3 dùng hai biểu thức cùng lúc: `$dateToString` đổi ngày tạo thành chuỗi theo UTC, `$size` đếm dòng hàng. Mỗi bước đều là `$match` trước, `$project` sau.

## Tóm tắt

- `$match` lọc bằng cú pháp filter của `find`.
- `$project` chọn hình kết quả và tính được trường mới.
- `$set` giữ mọi trường cũ, chỉ thêm hoặc ghi đè.
- Trong biểu thức, `"$total"` là giá trị trường; không có `$` là chữ.

# EN

## Opening

The invoice screen needs the shipped orders, each with its VAT already computed, and without the array of lines. If you return whole documents, the application has to trim and compute them itself. How does a pipeline do that?

## Key idea

- `$match` filters documents with exactly the filter syntax of `find`.
- `$project` picks fields like a projection and can add fields computed from expressions: `{ vat: { $multiply: ["$total", 0.08] } }`.
- `$set` (or `$addFields`) keeps every existing field and adds or overwrites new ones. Use `$set` to add a few fields, `$project` to choose the result's exact shape.

In an expression, `"$total"` is the value of field `total`, while `"total"` without `$` is just text. Some common expression operators: `$add`, `$subtract`, `$multiply`, `$divide`, `$round`, `$size`, `$cond`, `$dateToString`.

A `$project` either includes (`1`) or excludes (`0`), never both; only `_id` may be excluded in an including projection.

You can now: filter and return exactly the data shape a screen needs, with computed fields.

The step-through figure at the end of this section sends documents through each stage of a pipeline. It opens with `$match`, the first stage of this lesson; `$project` sits in the same place when you need to reshape the documents.

## Syntax

```text
{ $match: { <filter like find> } }
{ $project: { <field>: 1, <newField>: <expression> } }
{ $set: { <newField>: <expression> } }
```

- `$project` chooses the result's shape; `$set` only adds or overwrites.
- An expression reads a field with `"$<field>"`.

## Example

Orders from 100000, flagged `big`, without the `lines` array:

```js
db.orders.aggregate([
  { $match: { total: { $gte: 100000 } } },
  { $set: { big: true } },
  { $project: { lines: 0 } }
])
```

Five orders of 100000 or more come back, each with an extra `big: true` and without `lines`. The stages run in order: `$set` adds the field, then an exclude-style `$project` drops exactly one field.

Shipped orders with VAT rounded to the dong:

```js
db.orders.aggregate([
  { $match: { status: "shipped" } },
  { $project: { total: 1, vat: { $round: [{ $multiply: ["$total", 0.08] }, 0] } } }
])
```

Three shipped orders: 2, 3, 7, with `vat` 9600, 36000 and 22800. Each result holds only `_id`, `total`, `vat`, because an include-style `$project` drops every other field.

## Common mistakes

Forgetting the `$` before a field name in an expression:

```js
// WRONG: "customer" without $ is just text
db.orders.aggregate([{ $match: { store: "S2" } }, { $project: { buyer: { $concat: ["customer", "-", "$store"] } } }])
```

```js
// FIX: "$customer" reads the field
db.orders.aggregate([{ $match: { store: "S2" } }, { $project: { buyer: { $concat: ["$customer", "-", "$store"] } } }])
```

The wrong version gives all four orders the same `buyer: "customer-S2"`, with no error. The fix gives `"c2-S2"`, `"c4-S2"`… The same value repeated on every document is a sign of a missing `$`.

Using `$project` when you only want to add a field:

```js
// WRONG: only _id and vat are left
db.orders.aggregate([{ $match: { status: "paid" } }, { $project: { vat: { $multiply: ["$total", 0.08] } } }])
```

```js
// FIX: $set keeps the order and adds vat
db.orders.aggregate([{ $match: { status: "paid" } }, { $set: { vat: { $multiply: ["$total", 0.08] } } }])
```

The wrong version keeps only `_id` and `vat` (for example order 1: 7600); `customer`, `total` and `lines` are gone. The fix keeps the whole order and adds `vat`. Pick the stage by the question: exactly a few fields means `$project`, adding to the document means `$set`.

## Practice

Three steps on `orders` (8 orders at two stores `"S1"` and `"S2"`, October 2026). Step 1 filters on two conditions, then picks three fields. Step 2 adds a field computed with `$multiply`. Step 3 uses two expressions at once: `$dateToString` turns the creation date into a UTC string, `$size` counts the lines. Every step is `$match` first, `$project` second.

## Recap

- `$match` filters with the filter syntax of `find`.
- `$project` chooses the result's shape and can compute new fields.
- `$set` keeps every existing field and only adds or overwrites.
- In an expression, `"$total"` is a field's value; without `$` it is text.
