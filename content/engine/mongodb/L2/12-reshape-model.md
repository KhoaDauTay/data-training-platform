---
id: e-mg-l2-12
engine: mongodb
level: L2
module: modeling
title: Đổi mô hình bằng pipeline
title_en: Reshaping a model with a pipeline
kind: lab
minutes: 14
objectives:
  - vi: Dựng hình "nhúng" (khách kèm số đơn và tổng chi) từ hai collection tham chiếu nhau.
    en: Build an embedded shape (a customer with order count and total spent) from two collections that reference each other.
  - vi: Tạo extended reference, chép vài trường của khách vào đơn, và tính sẵn giá trị (computed pattern).
    en: Build an extended reference by copying a few customer fields into the order, and precompute a value (computed pattern).
requires: [e-mg-l2-11]
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/best-practices/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayelemat/
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
        vi: 'Màn hình đơn hàng cần tên và thành phố của khách mà không gọi `$lookup` mỗi lần. Trả mọi đơn với `_id`, `status` và `buyer` là tài liệu lồng gồm `name` và `city` của khách.'
        en: 'The order screen needs the customer''s name and city without a `$lookup` on every read. Return every order with `_id`, `status` and `buyer`, an embedded document holding the customer''s `name` and `city`.'
      solution: 'db.orders.aggregate([{ $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "c" } }, { $project: { status: 1, buyer: { name: { $arrayElemAt: ["$c.name", 0] }, city: { $arrayElemAt: ["$c.city", 0] } } } }])'
      check: doc
      hint:
        vi: '`"$c.name"` là mảng tên của các khách khớp; `$arrayElemAt` với chỉ số 0 lấy phần tử đầu.'
        en: '`"$c.name"` is the array of names of the matching customers; `$arrayElemAt` with index 0 takes the first one.'
---
## Ý chính

Mô hình không cố định mãi: khi câu hỏi của ứng dụng đổi, bạn đổi hình dữ liệu. Pipeline cho thấy trước hình mới trông thế nào, trước khi ghi lại.

Ba kiểu đổi hay gặp:

- computed pattern: tính sẵn một giá trị hay đọc (như `total` của đơn) và lưu vào tài liệu, thay vì tính ở mỗi lần đọc;
- gộp để đọc một lần: `$lookup` rồi tóm tắt (số đơn, tổng) thành các trường của khách;
- extended reference: chép vài trường ít đổi của tài liệu được tham chiếu vào tài liệu tham chiếu.

Mỗi bản chép là một chỗ phải giữ cho khớp. Chỉ chép trường ít đổi, hoặc trường mà giá trị lúc ghi mới là điều cần nhớ.

Làm được: chuyển dữ liệu giữa hình tham chiếu và hình nhúng bằng pipeline, và tính sẵn giá trị cần đọc nhiều.

## Ví dụ

```js
db.customers.aggregate([
  { $lookup: { from: "orders", localField: "_id", foreignField: "customer", as: "orders" } },
  { $set: { lastOrder: { $max: "$orders._id" } } },
  { $unset: "orders" }
])
```

## Thực hành

Ba bước trên `customers` và `orders`. Khách `"c6"` chưa có đơn.

# EN

## Key idea

A model is not fixed forever: when your application's questions change, you change the data's shape. A pipeline shows what the new shape looks like before you write it.

Three common reshapes:

- computed pattern: precompute a frequently read value (such as an order's `total`) and store it in the document instead of computing it on every read;
- merge for one read: `$lookup` and summarise (order count, totals) into the customer's fields;
- extended reference: copy a few rarely changing fields of the referenced document into the referencing one.

Every copy is one more place to keep consistent. Copy only fields that rarely change, or fields whose value at write time is what you must remember.

You can now: move data between referenced and embedded shapes with a pipeline, and precompute values that are read often.

## Example

```js
db.customers.aggregate([
  { $lookup: { from: "orders", localField: "_id", foreignField: "customer", as: "orders" } },
  { $set: { lastOrder: { $max: "$orders._id" } } },
  { $unset: "orders" }
])
```

## Practice

Three steps on `customers` and `orders`. Customer `"c6"` has no order yet.
