---
id: e-mg-l2-02
engine: mongodb
level: L2
module: update-pipeline
title: Update bằng aggregation pipeline
title_en: Updates with an aggregation pipeline
kind: lab
runtime: browser
minutes: 14
objectives:
  - vi: Tính lại một trường từ các trường khác của chính tài liệu bằng update dạng pipeline.
    en: Recompute a field from the document's own fields with a pipeline-style update.
  - vi: Dùng `$set`, `$project`, `$cond` trong update và biết `$$NOW` cho thời điểm hiện tại.
    en: Use `$set`, `$project` and `$cond` in an update and know `$$NOW` gives the current time.
requires: [e-mg-l2-01]
sources:
  - https://www.mongodb.com/docs/manual/tutorial/update-documents-with-aggregation-pipeline/
  - https://www.mongodb.com/docs/manual/reference/aggregation-variables/
lab:
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "customer": "c1", "status": "paid", "lines": [{"sku": "p1", "qty": 2, "price": 25000}, {"sku": "p4", "qty": 1, "price": 45000}]},
      {"_id": 2, "customer": "c2", "status": "shipped", "lines": [{"sku": "p2", "qty": 1, "price": 120000}]},
      {"_id": 3, "customer": "c1", "status": "shipped", "lines": [{"sku": "p5", "qty": 1, "price": 350000}, {"sku": "p1", "qty": 4, "price": 25000}]},
      {"_id": 4, "customer": "c3", "status": "cancelled", "note": "out of stock", "lines": [{"sku": "p3", "qty": 10, "price": 15000}]},
      {"_id": 5, "customer": "c4", "status": "paid", "lines": [{"sku": "p6", "qty": 2, "price": 60000}, {"sku": "p4", "qty": 2, "price": 45000}]},
      {"_id": 6, "customer": "c2", "status": "paid", "lines": [{"sku": "p1", "qty": 1, "price": 25000}]}
    ]}}
  steps:
    - task:
        vi: Thêm trường `total` cho mọi đơn, bằng tổng `qty` × `price` của các dòng hàng.
        en: Add a `total` field to every order, equal to the sum of `qty` × `price` over its lines.
      solution: 'db.orders.updateMany({}, [{ $set: { total: { $sum: { $map: { input: "$lines", as: "l", in: { $multiply: ["$$l.qty", "$$l.price"] } } } } } }])'
      check: doc
      hint:
        vi: 'Update dạng pipeline là một mảng stage. `$map` biến mỗi dòng thành `qty` × `price`, `$sum` cộng mảng đó lại.'
        en: 'A pipeline update is an array of stages. `$map` turns each line into `qty` × `price`, `$sum` adds that array up.'
    - task:
        vi: Đặt `size` là `"multi"` cho đơn có từ 2 dòng hàng trở lên, `"single"` cho đơn còn lại, ở mọi đơn.
        en: Set `size` to `"multi"` for orders with 2 or more lines and `"single"` for the rest, on every order.
      solution: 'db.orders.updateMany({}, [{ $set: { size: { $cond: [{ $gte: [{ $size: "$lines" }, 2] }, "multi", "single"] } } }])'
      check: doc
      hint:
        vi: "`$cond: [if, then, else]` (điều kiện, giá trị nếu đúng, giá trị nếu sai); `$size` đếm phần tử của mảng."
        en: "`$cond: [if, then, else]` (condition, value if true, value if false); `$size` counts the array's elements."
    - task:
        vi: Đơn đã hủy chỉ cần giữ `_id`, `customer` và `status`. Bỏ mọi trường khác của các đơn `"cancelled"`.
        en: Cancelled orders only need `_id`, `customer` and `status`. Drop every other field of the `"cancelled"` orders.
      solution: 'db.orders.updateMany({ status: "cancelled" }, [{ $project: { customer: 1, status: 1 } }])'
      check: doc
      hint:
        vi: "Stage `$project` trong update giữ đúng các trường được chọn (cộng `_id`)."
        en: "A `$project` stage in an update keeps exactly the chosen fields (plus `_id`)."
quiz:
  - q:
      vi: '`db.orders.updateMany({}, [{ $set: { checkedAt: "$$NOW" } }])` chạy trên 6 đơn. Giá trị `checkedAt` của các đơn ra sao?'
      en: '`db.orders.updateMany({}, [{ $set: { checkedAt: "$$NOW" } }])` runs on 6 orders. What do their `checkedAt` values look like?'
    options:
      - vi: Mỗi đơn một thời điểm, theo lúc đơn đó được ghi
        en: Each order gets its own time, from the moment it was written
      - vi: Cả 6 đơn cùng một thời điểm
        en: All 6 orders get the same time
      - vi: Chuỗi `"$$NOW"`
        en: The string `"$$NOW"`
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì các tài liệu được ghi lần lượt, nhưng `$$NOW` được lấy một lần cho cả lệnh và giống nhau với mọi tài liệu. Trong pipeline, `"$$NOW"` là biến, không phải chuỗi.'
      en: 'It sounds right because the documents are written one after another, but `$$NOW` is taken once for the whole command and is the same for every document. In a pipeline, `"$$NOW"` is a variable, not a string.'
  - q:
      vi: Stage nào không dùng được trong update dạng pipeline?
      en: Which stage cannot be used in a pipeline-style update?
    options:
      - { vi: '`$unset`', en: '`$unset`' }
      - { vi: '`$group`', en: '`$group`' }
      - { vi: '`$replaceWith`', en: '`$replaceWith`' }
    answer: 1
    why:
      vi: 'Update dạng pipeline sửa từng tài liệu tại chỗ, nên chỉ nhận các stage đổi hình một tài liệu: `$set`/`$addFields`, `$unset`, `$project`, `$replaceRoot`/`$replaceWith`. `$group` gộp nhiều tài liệu thành một, không có chỗ trong một lần update.'
      en: 'A pipeline update changes each document in place, so it only takes stages that reshape one document: `$set`/`$addFields`, `$unset`, `$project`, `$replaceRoot`/`$replaceWith`. `$group` merges many documents into one and has no place in an update.'
---
## Mở bài

Bạn cần thêm trường `total` cho mọi đơn, tính từ chính các dòng hàng của đơn. Đọc từng đơn về ứng dụng, cộng, rồi ghi lại thì tốn nhiều lượt đi về. MongoDB có tính ngay trên máy chủ được không?

## Ý chính

Đối số thứ hai của `updateOne`/`updateMany` có thể là một mảng stage thay vì tài liệu toán tử. Khi đó mỗi tài liệu đi qua các stage như một aggregation nhỏ, nên giá trị mới được tính từ chính các trường của nó. Các stage được phép: `$set`/`$addFields`, `$unset`, `$project`, `$replaceRoot`/`$replaceWith`.

- `"$lines"` là giá trị của trường `lines`; `"$$l"` là biến do `$map` đặt.
- `$$NOW` là thời điểm hiện tại, giống nhau cho mọi tài liệu trong cùng lệnh: `{ $set: { checkedAt: "$$NOW" } }`.
- Một chuỗi bắt đầu bằng `$` được hiểu là đường dẫn trường. Muốn ghi đúng chuỗi đó thì bọc trong `$literal` (bài sau).

Lợi ích: không cần đọc tài liệu ra ứng dụng, tính rồi ghi lại. Một lệnh làm hết, nguyên tử (atomic) trên mỗi tài liệu.

Làm được: sửa hàng loạt bằng biểu thức tính từ dữ liệu của chính tài liệu.

## Cú pháp

```text
db.<collection>.updateMany(<filter>, [ { $set: { <field>: <expression> } }, { $unset: "<field>" } ])
```

- Dấu `[ ]` biến update thành pipeline: giá trị là biểu thức.
- Không có `[ ]` thì là update kiểu toán tử: giá trị là dữ liệu.

## Ví dụ

Đếm số dòng và ghi giờ kiểm tra cho các đơn đã thanh toán:

```js
db.orders.updateMany(
  { status: "paid" },
  [{ $set: { lineCount: { $size: "$lines" }, checkedAt: "$$NOW" } }]
)
```

Chép mã khách sang trường mới `buyer` của đơn 2:

```js
db.orders.updateOne({ _id: 2 }, [{ $set: { buyer: "$customer" } }])
```

## Lỗi hay gặp

Viết biểu thức trong update kiểu toán tử:

```js
// WRONG: operator style stores the string "$customer"
db.orders.updateOne({ _id: 2 }, { $set: { buyer: "$customer" } })
```

```js
// FIX: the pipeline form reads the field
db.orders.updateOne({ _id: 2 }, [{ $set: { buyer: "$customer" } }])
```

Dùng `$project` khi chỉ muốn thêm một trường:

```js
// WRONG: $project keeps only _id and the new field
db.orders.updateOne({ _id: 1 }, [{ $project: { lineCount: { $size: "$lines" } } }])
```

```js
// FIX: $set keeps every existing field
db.orders.updateOne({ _id: 1 }, [{ $set: { lineCount: { $size: "$lines" } } }])
```

## Thực hành

Ba bước trên `orders`. Đơn 4 đã hủy và có thêm trường `note`.

## Tóm tắt

- Update với mảng stage tính giá trị mới từ chính tài liệu.
- Chỉ các stage đổi hình một tài liệu được dùng: `$set`, `$unset`, `$project`, `$replaceWith`.
- `$$NOW` giống nhau cho mọi tài liệu trong một lệnh.
- `$project` bỏ các trường không chọn; `$set` giữ chúng.

# EN

## Opening

You need a `total` field on every order, computed from the order's own lines. Reading each order into the application, adding up and writing back costs many round trips. Can MongoDB compute it on the server?

## Key idea

The second argument of `updateOne`/`updateMany` can be an array of stages instead of an operator document. Each document then goes through the stages like a small aggregation, so new values are computed from its own fields. Allowed stages: `$set`/`$addFields`, `$unset`, `$project`, `$replaceRoot`/`$replaceWith`.

- `"$lines"` is the value of field `lines`; `"$$l"` is a variable set by `$map`.
- `$$NOW` is the current time, the same for every document in one command: `{ $set: { checkedAt: "$$NOW" } }`.
- A string starting with `$` is read as a field path. To store that exact string, wrap it in `$literal` (next lesson).

The benefit: no need to read documents into the application, compute and write them back. One command does it all, atomic per document.

You can now: update in bulk with expressions computed from each document's own data.

## Syntax

```text
db.<collection>.updateMany(<filter>, [ { $set: { <field>: <expression> } }, { $unset: "<field>" } ])
```

- The `[ ]` makes the update a pipeline: values are expressions.
- Without `[ ]` it is an operator-style update: values are data.

## Example

Count the lines and stamp a check time on the paid orders:

```js
db.orders.updateMany(
  { status: "paid" },
  [{ $set: { lineCount: { $size: "$lines" }, checkedAt: "$$NOW" } }]
)
```

Copy the customer code into a new field `buyer` of order 2:

```js
db.orders.updateOne({ _id: 2 }, [{ $set: { buyer: "$customer" } }])
```

## Common mistakes

Writing an expression in an operator-style update:

```js
// WRONG: operator style stores the string "$customer"
db.orders.updateOne({ _id: 2 }, { $set: { buyer: "$customer" } })
```

```js
// FIX: the pipeline form reads the field
db.orders.updateOne({ _id: 2 }, [{ $set: { buyer: "$customer" } }])
```

Using `$project` when you only want to add a field:

```js
// WRONG: $project keeps only _id and the new field
db.orders.updateOne({ _id: 1 }, [{ $project: { lineCount: { $size: "$lines" } } }])
```

```js
// FIX: $set keeps every existing field
db.orders.updateOne({ _id: 1 }, [{ $set: { lineCount: { $size: "$lines" } } }])
```

## Practice

Three steps on `orders`. Order 4 is cancelled and has an extra `note` field.

## Recap

- An update with an array of stages computes new values from the document itself.
- Only stages that reshape one document are allowed: `$set`, `$unset`, `$project`, `$replaceWith`.
- `$$NOW` is the same for every document in one command.
- `$project` drops the fields it does not pick; `$set` keeps them.
