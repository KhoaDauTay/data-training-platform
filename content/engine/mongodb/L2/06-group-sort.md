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
figures: [{ name: mg-pipeline, at: idea }]
objectives:
  - vi: Gom tài liệu theo một khóa và tổng hợp bằng `$sum`, `$avg`, `$max`.
    en: Group documents by a key and summarise them with `$sum`, `$avg`, `$max`.
  - vi: Xếp hạng nhóm bằng `$sort` + `$limit` và đếm bằng `$count`.
    en: Rank groups with `$sort` + `$limit` and count with `$count`.
requires: [e-mg-l2-05]
sources:
  - { url: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/, title_vi: "$group" }
  - { url: https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/, title_vi: "$sort" }
  - { url: https://www.mongodb.com/docs/manual/reference/operator/aggregation/count/, title_vi: "$count" }
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
quiz:
  - q:
      vi: 'Pipeline chỉ có `{ $group: { _id: "$store", revenue: { $sum: "$total" } } }`. Kết quả ra theo thứ tự nào?'
      en: 'A pipeline holds only `{ $group: { _id: "$store", revenue: { $sum: "$total" } } }`. In what order do the results come out?'
    options:
      - vi: Theo `_id` tăng dần, vì `$group` sắp theo khóa
        en: By `_id` ascending, because `$group` sorts by its key
      - vi: Không có thứ tự cố định; cần `$sort` nếu muốn thứ tự
        en: No fixed order; add `$sort` when you need one
      - vi: Theo `revenue` giảm dần
        en: By `revenue` descending
    answer: 1
    trap: 0
    why:
      vi: 'Với hai nhóm `S1`, `S2`, kết quả thường trông như đã sắp theo khóa, nhưng tài liệu của MongoDB nói rõ `$group` không bảo đảm thứ tự ra; lần chạy khác hoặc máy chủ khác có thể đảo. `$group` cũng không tự sắp theo `revenue`: nó chỉ tính tổng, không xếp hạng. Báo cáo cần thứ tự thì thêm `$sort` sau `$group`, trên một khóa không trùng như `_id`.'
      en: 'With two groups `S1` and `S2` the output often looks sorted by key, but the MongoDB docs state that `$group` does not guarantee its output order; another run or another server may flip it. Nor does `$group` sort by `revenue`: it only computes the sums, it does not rank them. A report that needs an order adds `$sort` after `$group`, on a unique key such as `_id`.'
  - q:
      vi: 'Trong `$group`, `{ $sum: 1 }` và `{ $sum: "$total" }` khác nhau thế nào?'
      en: 'In `$group`, how do `{ $sum: 1 }` and `{ $sum: "$total" }` differ?'
    options:
      - vi: 'Cái đầu đếm tài liệu trong nhóm, cái sau cộng trường `total`'
        en: 'The first counts the documents in the group, the second adds up the field `total`'
      - vi: Giống nhau
        en: They are the same
      - vi: 'Cái đầu cộng trường đầu tiên của tài liệu'
        en: 'The first adds up the first field of each document'
    answer: 0
    why:
      vi: '`$sum` cộng giá trị biểu thức của từng tài liệu trong nhóm. Hằng `1` cho mỗi tài liệu 1, nên tổng là số tài liệu (cửa hàng `S1` có 4 đơn → 4); `"$total"` cộng giá trị trường (`S1` → 980000), nên hai cái không giống nhau. `1` là một số, không phải vị trí trường: MongoDB không có cách đọc "trường đầu tiên" trong `$sum`.'
      en: '`$sum` adds up the expression for each document in the group. The constant `1` gives each document 1, so the sum is the number of documents (store `S1` has 4 orders → 4); `"$total"` adds the field values (`S1` → 980000), so the two differ. `1` is a number, not a field position: `$sum` has no way to read "the first field".'
---
## Mở bài

Cuối tháng, mỗi cửa hàng muốn biết doanh thu và số đơn của mình. Bạn có 8 đơn rời rạc. Làm sao gộp chúng thành một tài liệu cho mỗi cửa hàng?

## Ý chính

`$group` gom mọi tài liệu có cùng giá trị khóa `_id` thành một tài liệu kết quả:

- `_id: "$store"` gom theo cửa hàng; `_id: null` gom tất cả thành một nhóm;
- mỗi trường còn lại là một phép tổng hợp: `$sum`, `$avg`, `$min`, `$max`, `$first`, `$last`, `$push`, `$addToSet`, `$count`;
- `{ $sum: 1 }` đếm số tài liệu trong nhóm.

Kết quả của `$group` không có thứ tự cố định. Cần thứ tự (top N, xếp theo tên) thì thêm `$sort`, và sắp theo khóa không trùng để kết quả luôn như nhau.

`$count` là cách gọn để đếm số tài liệu còn lại ở cuối pipeline.

Làm được: viết báo cáo "tổng, trung bình, lớn nhất theo nhóm" và top N.

Hình từng bước ở cuối mục này cho tài liệu đi qua từng stage; `$group` gộp chúng, `$sort` xếp lại kết quả.

## Cú pháp

```text
{ $group: { _id: "$<key field>", <name>: { <accumulator>: <expression> } } }
{ $count: "<field name>" }
```

- `_id` là khóa nhóm; `null` là một nhóm duy nhất.
- Mọi trường khác phải là một phép tổng hợp.

## Ví dụ

Doanh thu và số đơn của cả tháng:

```js
db.orders.aggregate([
  { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }
])
```

Kết quả là một tài liệu: `{ _id: null, revenue: 1395000, orders: 8 }`. Với `_id: null`, cả collection là một nhóm, giống một `SUM` không có `GROUP BY` trong SQL.

Đơn lớn nhất của mỗi cửa hàng, xếp theo mã cửa hàng:

```js
db.orders.aggregate([
  { $group: { _id: "$store", biggest: { $max: "$total" } } },
  { $sort: { _id: 1 } }
])
```

Hai tài liệu: `S1` với đơn lớn nhất 450000, rồi `S2` với 210000. `$sort` trên `_id` làm thứ tự này luôn như nhau, dù `$group` trả nhóm theo thứ tự nào.

## Lỗi hay gặp

Quên dấu `$` ở khóa nhóm:

```js
// WRONG: "store" is a constant, so every order lands in one group
db.orders.aggregate([{ $group: { _id: "store", orders: { $sum: 1 } } }])
```

```js
// FIX: "$store" groups by the field's value
db.orders.aggregate([{ $group: { _id: "$store", orders: { $sum: 1 } } }])
```

Bản sai ra một tài liệu `{ _id: "store", orders: 8 }`: chữ `"store"` là hằng, giống nhau với mọi đơn. Bản sửa ra hai nhóm, mỗi cửa hàng 4 đơn. Một kết quả chỉ có một nhóm khi bạn chờ nhiều nhóm là dấu hiệu quên `$`.

Gõ sai tên trường trong phép tổng hợp:

```js
// WRONG: there is no field "totals", so every revenue is 0
db.orders.aggregate([{ $group: { _id: "$store", revenue: { $sum: "$totals" } } }])
```

```js
// FIX: the real field name
db.orders.aggregate([{ $group: { _id: "$store", revenue: { $sum: "$total" } } }])
```

`$sum` bỏ qua giá trị thiếu, nên tên sai không báo lỗi. Bản sai cho cả hai cửa hàng doanh thu 0; bản sửa cho `S1` 980000 và `S2` 415000. Doanh thu bằng 0 ở mọi nhóm gần như luôn là tên trường sai, không phải dữ liệu thật.

## Thực hành

Bốn bước trên `orders`. Hai bước giữa chấm cả thứ tự. Bước 1 bỏ đơn đã hủy rồi gom theo cửa hàng với hai phép tổng hợp. Bước 2 là top 2 khách: `$group`, `$sort` giảm dần, rồi `$limit`. Bước 3 tính trung bình và lớn nhất theo trạng thái, sắp theo `_id`. Bước 4 đếm bằng `$count`, không cần `$group`.

## Tóm tắt

- `$group` gộp tài liệu cùng `_id` thành một kết quả.
- Mỗi trường khác là một phép tổng hợp; `{ $sum: 1 }` đếm.
- Kết quả không có thứ tự; thêm `$sort` khi cần.
- Khóa nhóm và trường trong biểu thức cần dấu `$`.

# EN

## Opening

At the end of the month, each store wants its revenue and its number of orders. You have 8 separate orders. How do you merge them into one document per store?

## Key idea

`$group` merges every document with the same `_id` key value into one result document:

- `_id: "$store"` groups by store; `_id: null` puts everything into one group;
- every other field is an accumulator: `$sum`, `$avg`, `$min`, `$max`, `$first`, `$last`, `$push`, `$addToSet`, `$count`;
- `{ $sum: 1 }` counts the documents in the group.

`$group` output has no fixed order. When you need one (top N, by name), add `$sort`, and sort on a unique key so the result is always the same.

`$count` is a short way to count the documents left at the end of a pipeline.

You can now: write "total, average, maximum per group" reports and top-N lists.

The step-through figure at the end of this section sends documents through each stage; `$group` folds them, `$sort` orders the result.

## Syntax

```text
{ $group: { _id: "$<key field>", <name>: { <accumulator>: <expression> } } }
{ $count: "<field name>" }
```

- `_id` is the group key; `null` is a single group.
- Every other field must be an accumulator.

## Example

Revenue and order count for the whole month:

```js
db.orders.aggregate([
  { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }
])
```

The result is one document: `{ _id: null, revenue: 1395000, orders: 8 }`. With `_id: null` the whole collection is one group, like a `SUM` without `GROUP BY` in SQL.

The largest order of each store, sorted by store code:

```js
db.orders.aggregate([
  { $group: { _id: "$store", biggest: { $max: "$total" } } },
  { $sort: { _id: 1 } }
])
```

Two documents: `S1` with its largest order of 450000, then `S2` with 210000. The `$sort` on `_id` keeps this order the same, whatever order `$group` returns the groups in.

## Common mistakes

Forgetting the `$` on the group key:

```js
// WRONG: "store" is a constant, so every order lands in one group
db.orders.aggregate([{ $group: { _id: "store", orders: { $sum: 1 } } }])
```

```js
// FIX: "$store" groups by the field's value
db.orders.aggregate([{ $group: { _id: "$store", orders: { $sum: 1 } } }])
```

The wrong version gives one document `{ _id: "store", orders: 8 }`: the text `"store"` is a constant, the same for every order. The fix gives two groups, 4 orders per store. A single group when you expected several is a sign of a missing `$`.

Mistyping the field name in an accumulator:

```js
// WRONG: there is no field "totals", so every revenue is 0
db.orders.aggregate([{ $group: { _id: "$store", revenue: { $sum: "$totals" } } }])
```

```js
// FIX: the real field name
db.orders.aggregate([{ $group: { _id: "$store", revenue: { $sum: "$total" } } }])
```

`$sum` ignores missing values, so the wrong name raises no error. The wrong version gives both stores a revenue of 0; the fix gives `S1` 980000 and `S2` 415000. A revenue of 0 in every group is almost always a wrong field name, not real data.

## Practice

Four steps on `orders`. The two middle steps are graded in order. Step 1 leaves out cancelled orders, then groups by store with two accumulators. Step 2 is the top 2 customers: `$group`, a descending `$sort`, then `$limit`. Step 3 computes the average and the largest per status, sorted by `_id`. Step 4 counts with `$count`, no `$group` needed.

## Recap

- `$group` merges the documents with the same `_id` into one result.
- Every other field is an accumulator; `{ $sum: 1 }` counts.
- The output has no order; add `$sort` when you need one.
- The group key and fields inside expressions need the `$` sign.
