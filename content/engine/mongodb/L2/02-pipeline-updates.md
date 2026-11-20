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
---
## Ý chính

Đối số thứ hai của `updateOne`/`updateMany` có thể là một mảng stage thay vì tài liệu toán tử. Khi đó mỗi tài liệu đi qua các stage như một aggregation nhỏ, nên giá trị mới được tính từ chính các trường của nó. Các stage được phép: `$set`/`$addFields`, `$unset`, `$project`, `$replaceRoot`/`$replaceWith`.

- `"$lines"` là giá trị của trường `lines`; `"$$l"` là biến do `$map` đặt.
- `$$NOW` là thời điểm hiện tại, giống nhau cho mọi tài liệu trong cùng lệnh: `{ $set: { checkedAt: "$$NOW" } }`.
- Một chuỗi bắt đầu bằng `$` được hiểu là đường dẫn trường. Muốn ghi đúng chuỗi đó thì bọc trong `$literal` (bài sau).

Lợi ích: không cần đọc tài liệu ra ứng dụng, tính rồi ghi lại. Một lệnh làm hết, nguyên tử (atomic) trên mỗi tài liệu.

## Ví dụ

Làm được: sửa hàng loạt bằng biểu thức tính từ dữ liệu của chính tài liệu.

```js
db.orders.updateMany(
  { status: "paid" },
  [{ $set: { lineCount: { $size: "$lines" }, checkedAt: "$$NOW" } }]
)
```

## Thực hành

Ba bước trên `orders`. Đơn 4 đã hủy và có thêm trường `note`.

# EN

## Key idea

The second argument of `updateOne`/`updateMany` can be an array of stages instead of an operator document. Each document then goes through the stages like a small aggregation, so new values are computed from its own fields. Allowed stages: `$set`/`$addFields`, `$unset`, `$project`, `$replaceRoot`/`$replaceWith`.

- `"$lines"` is the value of field `lines`; `"$$l"` is a variable set by `$map`.
- `$$NOW` is the current time, the same for every document in one command: `{ $set: { checkedAt: "$$NOW" } }`.
- A string starting with `$` is read as a field path. To store that exact string, wrap it in `$literal` (next lesson).

The benefit: no need to read documents into the application, compute and write them back. One command does it all, atomic per document.

## Example

You can now: update in bulk with expressions computed from each document's own data.

```js
db.orders.updateMany(
  { status: "paid" },
  [{ $set: { lineCount: { $size: "$lines" }, checkedAt: "$$NOW" } }]
)
```

## Practice

Three steps on `orders`. Order 4 is cancelled and has an extra `note` field.
