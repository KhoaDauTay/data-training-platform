---
id: e-mg-l2-12
engine: mongodb
level: L2
module: modeling
title: Đổi mô hình bằng pipeline
title_en: Reshaping a model with a pipeline
kind: lab
runtime: browser
minutes: 14
objectives:
  - vi: Dựng hình "nhúng" (khách kèm số đơn và tổng chi) từ hai collection tham chiếu nhau.
    en: Build an embedded shape (a customer with order count and total spent) from two collections that reference each other.
  - vi: Tạo extended reference, chép vài trường của khách vào đơn, và tính sẵn giá trị (computed pattern).
    en: Build an extended reference by copying a few customer fields into the order, and precompute a value (computed pattern).
requires: [e-mg-l2-11]
sources:
  - { url: https://www.mongodb.com/docs/manual/data-modeling/best-practices/, title_vi: "Mô hình hóa dữ liệu: thực hành tốt" }
  - { url: https://www.mongodb.com/docs/manual/data-modeling/design-patterns/, title_vi: "Mẫu thiết kế" }
  - { url: https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayelemat/, title_vi: "$arrayElemAt" }
lab:
  setup: |
    {"collections": {
      "customers": [
        {"_id": "c1", "name": "An", "city": "Da Nang", "tier": "gold"},
        {"_id": "c2", "name": "Binh", "city": "Hue", "tier": "silver"},
        {"_id": "c3", "name": "Chi", "city": "Da Nang", "tier": "silver"},
        {"_id": "c6", "name": "Giang", "city": "Hoi An", "tier": "bronze"}
      ],
      "orders": [
        {"_id": 1, "customer": "c1", "status": "paid", "lines": [{"sku": "p1", "qty": 2, "price": 25000}, {"sku": "p4", "qty": 1, "price": 45000}]},
        {"_id": 2, "customer": "c2", "status": "shipped", "lines": [{"sku": "p2", "qty": 1, "price": 120000}]},
        {"_id": 3, "customer": "c1", "status": "shipped", "lines": [{"sku": "p5", "qty": 1, "price": 350000}, {"sku": "p1", "qty": 4, "price": 25000}]},
        {"_id": 6, "customer": "c2", "status": "paid", "lines": [{"sku": "p1", "qty": 1, "price": 25000}]},
        {"_id": 9, "customer": "c3", "status": "paid", "lines": [{"sku": "p6", "qty": 3, "price": 60000}]}
      ]
    }}
  steps:
    - task:
        vi: 'Mỗi đơn chưa có tổng tiền. Thêm `total` (tổng `qty` × `price` các dòng) vào mọi đơn, để màn hình danh sách không phải tính lại mỗi lần đọc.'
        en: 'Orders have no total yet. Add `total` (the sum of `qty` × `price` over the lines) to every order, so the list screen does not recompute it on every read.'
      solution: 'db.orders.updateMany({}, [{ $set: { total: { $sum: { $map: { input: "$lines", as: "l", in: { $multiply: ["$$l.qty", "$$l.price"] } } } } } }])'
      check: doc
      hint:
        vi: 'Update dạng pipeline với `$map` và `$sum`, như bài update bằng pipeline.'
        en: 'A pipeline update with `$map` and `$sum`, as in the pipeline-update lesson.'
    - task:
        vi: 'Trang hồ sơ cần mỗi khách kèm `name`, `orderCount` là số đơn và `items` là tổng số dòng hàng trên mọi đơn của khách. Trả về `_id`, `name`, `orderCount`, `items` cho mọi khách.'
        en: 'The profile page needs each customer with `name`, `orderCount` (the number of orders) and `items` (the total number of lines over all their orders). Return `_id`, `name`, `orderCount`, `items` for every customer.'
      solution: 'db.customers.aggregate([{ $lookup: { from: "orders", localField: "_id", foreignField: "customer", as: "orders" } }, { $project: { name: 1, orderCount: { $size: "$orders" }, items: { $sum: { $map: { input: "$orders", as: "o", in: { $size: "$$o.lines" } } } } } }])'
      check: doc
      hint:
        vi: 'Sau `$lookup`, `orders` là mảng đơn. `$size` đếm đơn; `$map` lấy số dòng mỗi đơn rồi `$sum` cộng lại.'
        en: 'After `$lookup`, `orders` is an array of orders. `$size` counts them; `$map` takes each order''s line count and `$sum` adds them up.'
    - task:
        vi: 'Màn hình đơn hàng cần tên và thành phố của khách mà không gọi `$lookup` mỗi lần. Trả mọi đơn với `_id`, `status` và `buyer` là tài liệu nhúng (embedded document) gồm `name` và `city` của khách.'
        en: 'The order screen needs the customer''s name and city without a `$lookup` on every read. Return every order with `_id`, `status` and `buyer`, an embedded document holding the customer''s `name` and `city`.'
      solution: 'db.orders.aggregate([{ $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "c" } }, { $project: { status: 1, buyer: { name: { $arrayElemAt: ["$c.name", 0] }, city: { $arrayElemAt: ["$c.city", 0] } } } }])'
      check: doc
      hint:
        vi: '`"$c.name"` là mảng tên của các khách khớp; `$arrayElemAt` với chỉ số 0 lấy phần tử đầu.'
        en: '`"$c.name"` is the array of names of the matching customers; `$arrayElemAt` with index 0 takes the first one.'
quiz:
  - q:
      vi: 'Sau bước 1, mỗi đơn có `total` tính sẵn. Một lệnh sau đó `$push` thêm một dòng vào `lines` của đơn 2. `total` của đơn 2 thế nào?'
      en: 'After step 1, every order has a precomputed `total`. A later command uses `$push` to add a line to the `lines` of order 2. What happens to the `total` of order 2?'
    options:
      - vi: MongoDB tự tính lại vì `total` được dựng từ `lines`
        en: MongoDB recomputes it because `total` was built from `lines`
      - vi: Giữ giá trị cũ; lệnh ghi dòng mới phải tự cập nhật `total`
        en: It keeps the old value; the write that adds the line must update `total` too
      - vi: Bị xóa vì không còn khớp với `lines`
        en: It is removed because it no longer matches `lines`
    answer: 1
    trap: 0
    why:
      vi: '`total` được tính từ `lines` ở bước 1, nhưng MongoDB chỉ lưu kết quả 120000 như một trường bình thường, không lưu công thức, nên không tự tính lại. Nó cũng không xóa trường vì "không khớp": MongoDB không biết hai trường liên quan nhau, nên `total` cũ (sai) cứ nằm đó. Lệnh `$push` ghi vào `lines` phải tự cập nhật `total` trong cùng lệnh, ví dụ thêm `$inc` vào `total`; một lệnh trên một tài liệu là nguyên tử, nên hai trường không bao giờ lệch nhau giữa chừng.'
      en: '`total` was computed from `lines` in step 1, but MongoDB stores only the result, 120000, as a plain field, not the formula, so it does not recompute it. Nor does it delete the field for "not matching": MongoDB does not know the two fields are related, so the old (wrong) `total` just stays. The `$push` that writes to `lines` must update `total` in the same command, for example with an `$inc` on `total`; one command on one document is atomic, so the two fields never disagree midway.'
  - q:
      vi: 'Bước 3 chép `name` và `city` của khách vào đơn dưới `buyer`. Sau đó khách `"c1"` chuyển tới Hue. `buyer.city` trong các đơn cũ của `"c1"` là gì?'
      en: 'Step 3 copies the customer''s `name` and `city` into the order under `buyer`. Later customer `"c1"` moves to Hue. What is `buyer.city` in the old orders of `"c1"`?'
    options:
      - { vi: '`"Da Nang"`', en: '`"Da Nang"`' }
      - { vi: '`"Hue"`', en: '`"Hue"`' }
      - { vi: '`null`', en: '`null`' }
    answer: 0
    trap: 1
    why:
      vi: '`"Hue"` chỉ đúng nếu `buyer` là tham chiếu được đọc lại mỗi lần, nhưng extended reference là bản chép thật: đơn cũ giữ `"Da Nang"`, giá trị lúc ghi. Cũng không thành `null`: đổi tài liệu khách không chạm tới đơn nào, vì MongoDB không biết bản chép đến từ đâu. Với thành phố giao của một đơn cũ, giữ giá trị lúc ghi thường là điều bạn muốn; nếu cần luôn mới thì phải tự cập nhật các bản chép.'
      en: '`"Hue"` would only be right if `buyer` were a reference read again each time, but an extended reference is a real copy: old orders keep `"Da Nang"`, the value at write time. Nor does it become `null`: changing the customer document touches no order, since MongoDB does not know where the copy came from. For an old order''s shipping city, keeping the value at write time is usually what you want; if it must stay current, you update the copies yourself.'
---
## Mở bài

Màn hình danh sách đơn tính lại tổng tiền ở mỗi lần đọc, và trang đơn gọi `$lookup` sang khách mỗi lần mở. Khi câu hỏi của ứng dụng đổi, có nên đổi luôn hình dữ liệu?

## Ý chính

Mô hình không cố định mãi: khi câu hỏi của ứng dụng đổi, bạn đổi hình dữ liệu. Pipeline cho thấy trước hình mới trông thế nào, trước khi ghi lại.

Ba kiểu đổi hay gặp:

- computed pattern: tính sẵn một giá trị hay đọc (như `total` của đơn) và lưu vào tài liệu, thay vì tính ở mỗi lần đọc;
- gộp để đọc một lần: `$lookup` rồi tóm tắt (số đơn, tổng) thành các trường của khách;
- extended reference: chép vài trường ít đổi của tài liệu được tham chiếu vào tài liệu tham chiếu.

Mỗi bản chép là một chỗ phải giữ cho khớp. Chỉ chép trường ít đổi, hoặc trường mà giá trị lúc ghi mới là điều cần nhớ.

Làm được: chuyển dữ liệu giữa hình tham chiếu và hình nhúng bằng pipeline, và tính sẵn giá trị cần đọc nhiều.

## Cú pháp

```text
db.<coll>.updateMany({}, [{ $set: { <field>: <expression> } }])          // computed pattern
db.<coll>.aggregate([{ $lookup: { ... } }, { $project: { ... } }])       // preview a new shape
{ $arrayElemAt: ["$<array>.<field>", 0] }                                 // first match as a value
```

- Update dạng pipeline (mảng stage) mới đọc được trường của chính tài liệu.
- `$lookup` luôn cho mảng; lấy một giá trị thì dùng `$arrayElemAt`.

## Ví dụ

Mỗi khách kèm `_id` của đơn mới nhất, rồi bỏ mảng tạm:

```js
db.customers.aggregate([{ $lookup: { from: "orders", localField: "_id", foreignField: "customer", as: "orders" } }, { $set: { lastOrder: { $max: "$orders._id" } } }, { $unset: "orders" }])
```

Bốn khách trở về: `c1` có `lastOrder` là 3, `c2` là 6, `c3` là 9. Khách `c6` chưa có đơn nên `$max` trên mảng rỗng cho `null`. `$unset` bỏ mảng tạm, nên kết quả chỉ còn các trường của khách cộng một trường tóm tắt.

Xem trước số dòng hàng của mỗi đơn trước khi lưu nó:

```js
db.orders.aggregate([{ $project: { lineCount: { $size: "$lines" } } }])
```

Năm đơn trở về với `lineCount` lần lượt 2, 1, 2, 1, 1. Đây chỉ là `aggregate`, không ghi gì: bạn kiểm hình mới trước khi chạy lệnh ghi thật.

## Lỗi hay gặp

Tính tổng tiền mà quên số lượng:

```js
// WRONG: adds the prices and ignores qty
db.orders.updateMany({}, [{ $set: { total: { $sum: "$lines.price" } } }])
```

```js
// FIX: qty × price for each line, then the sum
db.orders.updateMany({}, [{ $set: { total: { $sum: { $map: { input: "$lines", as: "l", in: { $multiply: ["$$l.qty", "$$l.price"] } } } } } }])
```

Bản sai ghi `total` 70000 cho đơn 1 (25000 + 45000), trong khi đúng là 95000 vì dòng đầu có `qty` 2; đơn 9 thành 60000 thay vì 180000. Giá trị tính sẵn sai sẽ bị đọc mãi, nên kiểm lệnh ghi bằng `aggregate` trước. Ở đây mỗi lần chạy bắt đầu từ dữ liệu gốc, nên bạn thử lại được.

Chép thẳng trường của mảng `$lookup`:

```js
// WRONG: buyer.name is an array such as ["An"], not a name
db.orders.aggregate([{ $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "c" } }, { $project: { buyer: { name: "$c.name" } } }])
```

```js
// FIX: take the first element
db.orders.aggregate([{ $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "c" } }, { $project: { buyer: { name: { $arrayElemAt: ["$c.name", 0] } } } }])
```

Bản sai cho `buyer: { name: ["An"] }`; bản sửa cho `buyer: { name: "An" }`. Một mảng một phần tử trông gần đúng, nhưng mọi truy vấn và màn hình đọc nó như chuỗi sẽ lệch.

## Thực hành

Ba bước trên `customers` và `orders`. Khách `"c6"` chưa có đơn. Bước 1 là computed pattern: lệnh ghi thêm `total` vào mọi đơn. Bước 2 gộp đơn vào hồ sơ khách: số đơn và tổng số dòng hàng. Bước 3 là extended reference: nhúng tên và thành phố của khách vào từng đơn.

## Tóm tắt

- Đổi hình dữ liệu khi câu hỏi của ứng dụng đổi; xem trước bằng pipeline.
- Computed pattern lưu sẵn giá trị hay đọc; lệnh ghi phải tự giữ nó đúng.
- Extended reference chép vài trường ít đổi để bỏ `$lookup` khi đọc.
- Trường lấy từ mảng `$lookup` là mảng; dùng `$arrayElemAt` để lấy một giá trị.

# EN

## Opening

The order list recomputes each total on every read, and the order page runs a `$lookup` to the customer every time it opens. When your application's questions change, should the data's shape change too?

## Key idea

A model is not fixed forever: when your application's questions change, you change the data's shape. A pipeline shows what the new shape looks like before you write it.

Three common reshapes:

- computed pattern: precompute a frequently read value (such as an order's `total`) and store it in the document instead of computing it on every read;
- merge for one read: `$lookup` and summarise (order count, totals) into the customer's fields;
- extended reference: copy a few rarely changing fields of the referenced document into the referencing one.

Every copy is one more place to keep consistent. Copy only fields that rarely change, or fields whose value at write time is what you must remember.

You can now: move data between referenced and embedded shapes with a pipeline, and precompute values that are read often.

## Syntax

```text
db.<coll>.updateMany({}, [{ $set: { <field>: <expression> } }])          // computed pattern
db.<coll>.aggregate([{ $lookup: { ... } }, { $project: { ... } }])       // preview a new shape
{ $arrayElemAt: ["$<array>.<field>", 0] }                                 // first match as a value
```

- Only a pipeline update (an array of stages) can read the document's own fields.
- `$lookup` always gives an array; use `$arrayElemAt` to take one value.

## Example

Each customer with the `_id` of their latest order, then drop the temporary array:

```js
db.customers.aggregate([{ $lookup: { from: "orders", localField: "_id", foreignField: "customer", as: "orders" } }, { $set: { lastOrder: { $max: "$orders._id" } } }, { $unset: "orders" }])
```

Four customers come back: `c1` has `lastOrder` 3, `c2` 6, `c3` 9. Customer `c6` has no order, so `$max` over an empty array gives `null`. `$unset` drops the temporary array, so the result keeps only the customer fields plus one summary field.

Preview each order's line count before storing it:

```js
db.orders.aggregate([{ $project: { lineCount: { $size: "$lines" } } }])
```

Five orders come back with `lineCount` 2, 1, 2, 1, 1. This is only an `aggregate` and writes nothing: you check the new shape before running the real write.

## Common mistakes

Computing a total and forgetting the quantity:

```js
// WRONG: adds the prices and ignores qty
db.orders.updateMany({}, [{ $set: { total: { $sum: "$lines.price" } } }])
```

```js
// FIX: qty × price for each line, then the sum
db.orders.updateMany({}, [{ $set: { total: { $sum: { $map: { input: "$lines", as: "l", in: { $multiply: ["$$l.qty", "$$l.price"] } } } } } }])
```

The wrong version stores a `total` of 70000 for order 1 (25000 + 45000), while the right one is 95000 because the first line has `qty` 2; order 9 becomes 60000 instead of 180000. A wrong precomputed value is read forever, so check the write with an `aggregate` first. Here each run starts from the original data, so you can try again.

Copying a field of the `$lookup` array as it is:

```js
// WRONG: buyer.name is an array such as ["An"], not a name
db.orders.aggregate([{ $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "c" } }, { $project: { buyer: { name: "$c.name" } } }])
```

```js
// FIX: take the first element
db.orders.aggregate([{ $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "c" } }, { $project: { buyer: { name: { $arrayElemAt: ["$c.name", 0] } } } }])
```

The wrong version gives `buyer: { name: ["An"] }`; the fix gives `buyer: { name: "An" }`. A one-element array looks almost right, but every query and screen that reads it as a string goes wrong.

## Practice

Three steps on `customers` and `orders`. Customer `"c6"` has no order yet. Step 1 is the computed pattern: a write adds `total` to every order. Step 2 folds orders into the customer profile: order count and total line items. Step 3 is the extended reference: it embeds the customer's name and city into each order.

## Recap

- Change the data's shape when the application's questions change; preview it with a pipeline.
- The computed pattern stores a value that is read often; writes must keep it right.
- An extended reference copies a few rarely changing fields to drop the `$lookup` on reads.
- A field taken from a `$lookup` array is an array; use `$arrayElemAt` to get one value.
