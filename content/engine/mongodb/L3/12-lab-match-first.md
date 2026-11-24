---
id: e-mg-l3-12
engine: mongodb
level: L3
module: planner-agg
title: "Lab: đưa $match lên đầu pipeline"
title_en: "Lab: move $match to the front of the pipeline"
kind: lab
minutes: 15
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Viết pipeline lọc trước khi `$unwind` và `$group`"
    en: "Write a pipeline that filters before `$unwind` and `$group`"
  - vi: "Biết stage đầu nào được gộp vào `$cursor` và dùng được index trên `mongod`"
    en: "Know which leading stages are absorbed into `$cursor` and can use an index on `mongod`"
  - vi: "Lọc lại sau `$unwind` khi chỉ muốn một phần tử của mảng"
    en: "Filter again after `$unwind` when you want only one array element"
requires: [e-mg-l3-10]
sources:
  - https://www.mongodb.com/docs/manual/reference/explain-results/
  - https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/
lab:
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "store": "S1", "status": "paid", "lines": [{"sku": "A", "qty": 2, "price": 10}, {"sku": "B", "qty": 1, "price": 25}]},
      {"_id": 2, "store": "S1", "status": "cancelled", "lines": [{"sku": "A", "qty": 5, "price": 10}]},
      {"_id": 3, "store": "S2", "status": "paid", "lines": [{"sku": "C", "qty": 3, "price": 8}]},
      {"_id": 4, "store": "S2", "status": "paid", "lines": [{"sku": "A", "qty": 1, "price": 10}, {"sku": "C", "qty": 1, "price": 8}]},
      {"_id": 5, "store": "S3", "status": "pending", "lines": [{"sku": "B", "qty": 2, "price": 25}]},
      {"_id": 6, "store": "S3", "status": "paid", "lines": [{"sku": "B", "qty": 4, "price": 25}]},
      {"_id": 7, "store": "S1", "status": "paid", "lines": [{"sku": "C", "qty": 2, "price": 8}]}
    ]}}
  steps:
    - task:
        vi: "Tính doanh thu từng cửa hàng chỉ từ đơn có `status` là `paid`: doanh thu = tổng `qty` nhân `price` của mọi dòng trong `lines`. Trả `_id` là mã cửa hàng và `revenue`, xếp `revenue` giảm dần, hòa thì `_id` tăng dần."
        en: "Compute each store's revenue from orders whose `status` is `paid` only: revenue = sum of `qty` times `price` over every entry in `lines`. Return `_id` as the store code and `revenue`, ordered by `revenue` descending, ties by `_id` ascending."
      solution: |
        db.orders.aggregate([
          { $match: { status: "paid" } },
          { $unwind: "$lines" },
          { $group: { _id: "$store", revenue: { $sum: { $multiply: [ "$lines.qty", "$lines.price" ] } } } },
          { $sort: { revenue: -1, _id: 1 } }
        ])
      check: doc
      ordered: true
      rule: match-first
      slow: 'db.orders.aggregate([{ $unwind: "$lines" }, { $match: { status: "paid" } }, { $group: { _id: "$store", revenue: { $sum: { $multiply: ["$lines.qty", "$lines.price"] } } } }, { $sort: { revenue: -1, _id: 1 } }])'
      sql: "SELECT o.store AS _id, SUM(l.qty * l.price) AS revenue FROM orders o JOIN order_lines l ON l.order_id = o.id WHERE o.status = 'paid' GROUP BY o.store ORDER BY revenue DESC, o.store;"
      hint:
        vi: "Bắt đầu bằng `$match` trên `status`, rồi `$unwind` mảng `lines`, rồi `$group` theo `$store` với `$sum` của `$multiply`."
        en: "Start with `$match` on `status`, then `$unwind` the `lines` array, then `$group` by `$store` with a `$sum` of `$multiply`."
    - task:
        vi: "Số lượng bán của từng mã hàng, chỉ tính đơn `paid`. Trả `_id` là `sku` và `qty` là tổng số lượng, xếp `_id` tăng dần. Lọc trước khi tách mảng."
        en: "Units sold per item code, counting `paid` orders only. Return `_id` as the `sku` and `qty` as the total quantity, ordered by `_id` ascending. Filter before you unwind."
      solution: 'db.orders.aggregate([{ $match: { status: "paid" } }, { $unwind: "$lines" }, { $group: { _id: "$lines.sku", qty: { $sum: "$lines.qty" } } }, { $sort: { _id: 1 } }])'
      check: doc
      ordered: true
      rule: match-first
      slow: 'db.orders.aggregate([{ $unwind: "$lines" }, { $match: { status: "paid" } }, { $group: { _id: "$lines.sku", qty: { $sum: "$lines.qty" } } }, { $sort: { _id: 1 } }])'
      hint:
        vi: "`$match` trên `status`, `$unwind`, rồi `$group` theo `$lines.sku`."
        en: "`$match` on `status`, `$unwind`, then `$group` by `$lines.sku`."
    - task:
        vi: "Mỗi cửa hàng có bao nhiêu đơn `paid`? Trả `_id` là mã cửa hàng và `n`, xếp `_id` tăng dần."
        en: "How many `paid` orders does each store have? Return `_id` as the store code and `n`, ordered by `_id` ascending."
      solution: 'db.orders.aggregate([{ $match: { status: "paid" } }, { $group: { _id: "$store", n: { $sum: 1 } } }, { $sort: { _id: 1 } }])'
      check: doc
      ordered: true
      hint:
        vi: "Không cần `$unwind`: đếm đơn, không đếm dòng hàng."
        en: "No `$unwind` needed: you count orders, not lines."
quiz:
  - q:
      vi: "Pipeline `[ { $unwind: \"$lines\" }, { $match: { status: \"paid\" } }, ... ]` cho đúng kết quả. Trên `mongod`, có gì đáng lo?"
      en: "The pipeline `[ { $unwind: \"$lines\" }, { $match: { status: \"paid\" } }, ... ]` gives the right result. On `mongod`, what is the concern?"
    options:
      - { vi: "Không có gì: trình tối ưu luôn tự đưa `$match` lên đầu", en: "Nothing: the optimizer always moves `$match` to the front by itself" }
      - { vi: "`$unwind` chạy trên mọi đơn trước, và `$match` không còn là stage đầu để dùng index", en: "`$unwind` runs over every order first, and `$match` is no longer the first stage that can use an index" }
      - { vi: "Kết quả sẽ thiếu các đơn có nhiều dòng", en: "The result will miss orders with several lines" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì trình tối ưu có dời `$match`, nhưng trang tối ưu pipeline chỉ mô tả việc dời qua `$sort`, `$project`, `$addFields`; không có gì hứa dời qua `$unwind`. Tự đặt `$match` đầu tiên rồi kiểm bằng `explain`."
      en: "It sounds right because the optimizer does move `$match`, but the pipeline optimization page only describes moves across `$sort`, `$project`, `$addFields`; nothing promises a move across `$unwind`. Put `$match` first yourself and check with `explain`."
  - q:
      vi: "Bạn muốn tổng số lượng của mã `A`. Pipeline `$match: { \"lines.sku\": \"A\" }`, `$unwind`, `$group` cộng `lines.qty` ra 10 thay vì 8. Vì sao?"
      en: "You want the total quantity of item `A`. The pipeline `$match: { \"lines.sku\": \"A\" }`, `$unwind`, `$group` summing `lines.qty` gives 10 instead of 8. Why?"
    options:
      - { vi: "`$match` giữ cả đơn có `A`, nên sau `$unwind` còn cả dòng `B` của đơn đó", en: "`$match` keeps whole orders containing `A`, so after `$unwind` the `B` line of that order is still there" }
      - { vi: "`$unwind` nhân đôi dòng `A`", en: "`$unwind` duplicates the `A` line" }
      - { vi: "`$group` cộng cả đơn bị hủy", en: "`$group` also adds cancelled orders" }
    answer: 0
    why:
      vi: "`$match` trên mảng chọn tài liệu, không cắt mảng. Cần thêm một `$match` sau `$unwind` để chỉ giữ dòng `A`; `$match` đầu vẫn có ích vì nó bỏ sớm các đơn không có `A`."
      en: "A `$match` on an array selects documents, it does not trim the array. Add another `$match` after `$unwind` to keep only the `A` lines; the first `$match` still helps because it drops orders without `A` early."
---
## Mở bài

Báo cáo doanh thu chạy trên hàng triệu đơn, và pipeline đầu tiên bạn viết tách mọi dòng hàng trước rồi mới lọc đơn đã trả tiền. Kết quả đúng, nhưng server làm việc gấp nhiều lần. Thứ tự stage quyết định bao nhiêu tài liệu đi qua mỗi bước.

## Ý chính

Mỗi stage nhận đầu ra của stage trước. `$unwind` nhân một đơn thành một tài liệu cho mỗi dòng hàng, `$lookup` nối thêm dữ liệu, `$group` gom lại: đó là các stage nặng. Đặt `$match` đầu tiên thì chúng chỉ xử lý tài liệu cần thiết.

Trên `mongod`, trang "Explain Results" mô tả: các stage `$match`, `$sort`, `$limit` đứng đầu pipeline được gộp vào `$cursor`; `$match` gộp vào thành `filter` của kế hoạch truy vấn, nên có thể dùng index (chỉ mục). Trang "Aggregation Pipeline Optimization" ghi: server dùng được index cho `$match` nếu nó là stage đầu sau các tối ưu của planner.

Nhiều người nghĩ trình tối ưu luôn tự đưa `$match` lên đầu. Thật ra trang đó mô tả việc dời `$match` qua `$sort`, `$project`, `$addFields`, nhưng không mô tả việc dời qua `$unwind` hay `$group`, nên đừng trông vào nó: tự đặt `$match` đầu tiên và kiểm bằng `explain`.

Lab chạy bằng mingo trong trình duyệt: kết quả được chấm thật, thứ tự stage được chấm theo quy tắc; phần index chỉ đúng trên `mongod`.

## Cú pháp

```text
db.<coll>.aggregate([
  { $match: { <filter on top-level fields> } },     // first: fewer documents, can use an index
  { $unwind: "$<array>" },                           // one document per array element
  { $match: { "<array>.<field>": <value> } },        // optional: keep only some elements
  { $group: { _id: <key>, <field>: { $sum: <expression> } } },
  { $sort: { <field>: 1 } }
])
```

- `$match` đầu tiên: giảm tài liệu cho mọi stage sau, dùng được index trên `mongod`.
- `$unwind`: mỗi phần tử mảng thành một tài liệu.
- `$match` trên mảng chọn tài liệu, không cắt mảng.

## Ví dụ

Lọc trước rồi mới tách mảng:

```javascript
db.orders.aggregate([{ $match: { status: "paid" } }, { $unwind: "$lines" }])
```

7 tài liệu sau `$unwind` (5 đơn `paid`, 2 đơn có hai dòng).

Tách mảng trước, không lọc:

```javascript
db.orders.aggregate([{ $unwind: "$lines" }])
```

9 tài liệu: `$unwind` làm việc cả với đơn hủy và đơn chờ. Trên dữ liệu thật, khoảng cách này là hàng triệu tài liệu.

Đếm đơn theo trạng thái:

```javascript
db.orders.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }, { $sort: { _id: 1 } }])
```

5 đơn `paid`, 1 `cancelled`, 1 `pending`.

## Lỗi hay gặp

Lọc sau khi đã gom nhóm:

```javascript
// WRONG: after $group only _id and n remain, status is gone
db.orders.aggregate([{ $group: { _id: "$store", n: { $sum: 1 } } }, { $match: { status: "paid" } }])
```

```javascript
// FIX: filter first, then group
db.orders.aggregate([{ $match: { status: "paid" } }, { $group: { _id: "$store", n: { $sum: 1 } } }, { $sort: { _id: 1 } }])
```

Câu sai trả rỗng mà không báo lỗi: sau `$group` không còn trường `status` để lọc.

Tưởng `$match` trên mảng sẽ cắt mảng:

```javascript
// WRONG: keeps whole orders with an A line, B lines included
db.orders.aggregate([{ $match: { "lines.sku": "A" } }, { $unwind: "$lines" }, { $group: { _id: null, qty: { $sum: "$lines.qty" } } }])
```

```javascript
// FIX: match again after $unwind
db.orders.aggregate([{ $match: { "lines.sku": "A" } }, { $unwind: "$lines" }, { $match: { "lines.sku": "A" } }, { $group: { _id: null, qty: { $sum: "$lines.qty" } } }])
```

Câu sai ra 10 vì cộng cả dòng `B` của đơn `1` và dòng `C` của đơn `4`; câu sửa ra 8.

## Thực hành

Ba bước trên cùng collection `orders`: doanh thu theo cửa hàng, số lượng theo mã hàng, số đơn theo cửa hàng. Hai bước đầu có thanh quy tắc: `$match` phải đứng trước `$unwind`. Xem phần "Pipeline từng bước" dưới kết quả để so số tài liệu sau mỗi stage.

## Tóm tắt

- Đặt `$match` đầu tiên: các stage nặng xử lý ít tài liệu hơn.
- Trên `mongod`, `$match` đứng đầu được gộp vào `$cursor` và dùng được index.
- Đừng trông vào trình tối ưu dời `$match` qua `$unwind` hay `$group`.
- `$match` trên mảng chọn tài liệu; muốn chọn phần tử thì `$match` lại sau `$unwind`.

# EN

## Opening

The revenue report runs over millions of orders, and the first pipeline you wrote unwinds every line before filtering the paid orders. The result is right, but the server does many times the work. Stage order decides how many documents go through each step.

## Key idea

Each stage takes the output of the one before. `$unwind` turns one order into one document per line, `$lookup` joins more data, `$group` folds them together: those are the heavy stages. Put `$match` first and they only handle the documents you need.

On `mongod`, the page "Explain Results" describes that leading `$match`, `$sort` and `$limit` stages are absorbed into `$cursor`; an absorbed `$match` becomes the `filter` of the query plan, so it can use an index. The page "Aggregation Pipeline Optimization" says the server can use an index for `$match` if it is the first stage after the planner's optimizations.

Many people think the optimizer always moves `$match` to the front by itself. In fact that page describes moving `$match` across `$sort`, `$project`, `$addFields`, but no move across `$unwind` or `$group`, so do not count on it: put `$match` first yourself and check with `explain`.

The lab runs on mingo in the browser: the result is really graded, the stage order is graded by rule; the index part only holds on `mongod`.

## Syntax

```text
db.<coll>.aggregate([
  { $match: { <filter on top-level fields> } },     // first: fewer documents, can use an index
  { $unwind: "$<array>" },                           // one document per array element
  { $match: { "<array>.<field>": <value> } },        // optional: keep only some elements
  { $group: { _id: <key>, <field>: { $sum: <expression> } } },
  { $sort: { <field>: 1 } }
])
```

- `$match` first: fewer documents for every later stage, can use an index on `mongod`.
- `$unwind`: each array element becomes a document.
- A `$match` on an array selects documents, it does not trim the array.

## Example

Filter first, then unwind:

```javascript
db.orders.aggregate([{ $match: { status: "paid" } }, { $unwind: "$lines" }])
```

7 documents after `$unwind` (5 `paid` orders, 2 of them with two lines).

Unwind first, no filter:

```javascript
db.orders.aggregate([{ $unwind: "$lines" }])
```

9 documents: `$unwind` also works on the cancelled and pending orders. On real data, that gap is millions of documents.

Count orders by status:

```javascript
db.orders.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }, { $sort: { _id: 1 } }])
```

5 `paid` orders, 1 `cancelled`, 1 `pending`.

## Common mistakes

Filtering after grouping:

```javascript
// WRONG: after $group only _id and n remain, status is gone
db.orders.aggregate([{ $group: { _id: "$store", n: { $sum: 1 } } }, { $match: { status: "paid" } }])
```

```javascript
// FIX: filter first, then group
db.orders.aggregate([{ $match: { status: "paid" } }, { $group: { _id: "$store", n: { $sum: 1 } } }, { $sort: { _id: 1 } }])
```

The wrong one returns nothing and raises no error: after `$group` there is no `status` field left to filter on.

Expecting a `$match` on an array to trim the array:

```javascript
// WRONG: keeps whole orders with an A line, B lines included
db.orders.aggregate([{ $match: { "lines.sku": "A" } }, { $unwind: "$lines" }, { $group: { _id: null, qty: { $sum: "$lines.qty" } } }])
```

```javascript
// FIX: match again after $unwind
db.orders.aggregate([{ $match: { "lines.sku": "A" } }, { $unwind: "$lines" }, { $match: { "lines.sku": "A" } }, { $group: { _id: null, qty: { $sum: "$lines.qty" } } }])
```

The wrong one gives 10 because it also adds the `B` line of order `1` and the `C` line of order `4`; the fix gives 8.

## Practice

Three steps on the same `orders` collection: revenue per store, units per item code, orders per store. The first two have a rule bar: `$match` must come before `$unwind`. Look at the "Pipeline step by step" part under the result to compare document counts after each stage.

## Recap

- Put `$match` first: the heavy stages handle fewer documents.
- On `mongod`, a leading `$match` is absorbed into `$cursor` and can use an index.
- Do not count on the optimizer moving `$match` across `$unwind` or `$group`.
- A `$match` on an array selects documents; to select elements, `$match` again after `$unwind`.
