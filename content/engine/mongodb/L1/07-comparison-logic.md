---
id: e-mg-l1-07
engine: mongodb
level: L1
module: query-ops
title: So sánh và kết hợp điều kiện
title_en: Comparison and logical operators
kind: lab
runtime: browser
minutes: 10
objectives:
  - vi: Lọc theo khoảng với `$gt`, `$gte`, `$lt`, `$lte` và theo danh sách với `$in`, `$nin`.
    en: Filter by range with `$gt`, `$gte`, `$lt`, `$lte` and by list with `$in`, `$nin`.
  - vi: Viết điều kiện "hoặc" bằng `$or` và biết khi nào AND là ngầm định.
    en: Write an "or" condition with `$or` and know when AND is implicit.
requires: [e-mg-l1-02]
sources:
  - https://www.mongodb.com/docs/manual/reference/mql/query-predicates/comparison/
  - https://www.mongodb.com/docs/manual/reference/mql/query-predicates/logical/
lab:
  setup: |
    {"collections": {"products": [
      {"_id": "p1", "name": "Green tea", "category": "drink", "price": 25000, "stock": 40, "tags": ["hot", "cold"]},
      {"_id": "p2", "name": "Coffee beans", "category": "drink", "price": 120000, "stock": 8, "tags": ["hot"]},
      {"_id": "p3", "name": "Rice cracker", "category": "snack", "price": 15000, "stock": 0, "tags": []},
      {"_id": "p4", "name": "Dried mango", "category": "snack", "price": 45000, "stock": 25, "tags": ["gift"]},
      {"_id": "p5", "name": "Tea set", "category": "gift", "price": 350000, "stock": 3, "tags": ["gift", "fragile"]},
      {"_id": "p6", "name": "Lotus tea", "category": "drink", "price": 60000, "stock": 12, "tags": ["hot", "gift"]}
    ]}}
  steps:
    - task:
        vi: Lấy `name` và `price` (không kèm `_id`) của các sản phẩm giá trên `50000`.
        en: Return `name` and `price` (no `_id`) of the products priced above `50000`.
      solution: 'db.products.find({ price: { $gt: 50000 } }, { name: 1, price: 1, _id: 0 })'
      check: doc
      hint:
        vi: "Toán tử nằm trong tài liệu con của trường: `{ price: { $gt: 50000 } }`."
        en: "The operator sits in a sub-document of the field: `{ price: { $gt: 50000 } }`."
    - task:
        vi: Lấy các sản phẩm có giá từ `20000` tới `60000`, tính cả hai đầu.
        en: Return the products priced from `20000` to `60000`, both ends included.
      solution: 'db.products.find({ price: { $gte: 20000, $lte: 60000 } })'
      check: doc
      hint:
        vi: Hai toán tử trên cùng một trường đặt chung trong một tài liệu con.
        en: Two operators on the same field go together in one sub-document.
    - task:
        vi: Lấy các sản phẩm thuộc nhóm `"snack"` hoặc `"gift"`.
        en: Return the products in category `"snack"` or `"gift"`.
      solution: 'db.products.find({ category: { $in: ["snack", "gift"] } })'
      check: doc
      hint:
        vi: Nhiều giá trị cho cùng một trường thì `$in` gọn hơn `$or`.
        en: For several values of one field, `$in` is shorter than `$or`.
    - task:
        vi: Lấy các sản phẩm sắp hết (tồn dưới 10) hoặc đắt (giá từ `100000` trở lên).
        en: Return the products that are running low (stock under 10) or expensive (price `100000` or more).
      solution: 'db.products.find({ $or: [{ stock: { $lt: 10 } }, { price: { $gte: 100000 } }] })'
      check: doc
      hint:
        vi: "`$or` nhận một mảng điều kiện trên các trường khác nhau."
        en: "`$or` takes an array of conditions on different fields."
---
## Ý chính

Toán tử so sánh đặt trong tài liệu con của trường:

- `$eq`, `$ne`: bằng, khác;
- `$gt`, `$gte`, `$lt`, `$lte`: lớn hơn, lớn hơn hoặc bằng, nhỏ hơn, nhỏ hơn hoặc bằng;
- `$in`, `$nin`: nằm trong, không nằm trong một danh sách.

Các điều kiện trong cùng filter được nối AND. Muốn "hoặc" giữa các trường khác nhau thì dùng `$or: [ ... ]`. `$and` chỉ cần khi phải lặp lại cùng một toán tử, ví dụ hai `$or`.

Bẫy: `$ne` và `$nin` cũng khớp tài liệu không có trường đó. `{ color: { $ne: "red" } }` trả cả các sản phẩm không có `color`.

Làm được: lọc theo khoảng, theo danh sách và kết hợp nhiều điều kiện bằng AND/OR.

## Ví dụ

```js
db.products.find({ category: "drink", stock: { $lt: 15 } })
db.products.find({ $or: [{ category: "gift" }, { tags: "gift" }] })
```

## Thực hành

Bốn bước trên `products` (6 sản phẩm, giá từ 15.000 tới 350.000).

# EN

## Key idea

Comparison operators sit in a sub-document of the field:

- `$eq`, `$ne`: equal, not equal;
- `$gt`, `$gte`, `$lt`, `$lte`: greater, greater or equal, less, less or equal;
- `$in`, `$nin`: in, not in a list.

Conditions in the same filter are joined with AND. For "or" across different fields use `$or: [ ... ]`. You only need `$and` when you must repeat the same operator, such as two `$or`.

Trap: `$ne` and `$nin` also match documents that lack the field. `{ color: { $ne: "red" } }` returns the products without `color` too.

You can now: filter by range and by list, and combine conditions with AND/OR.

## Example

```js
db.products.find({ category: "drink", stock: { $lt: 15 } })
db.products.find({ $or: [{ category: "gift" }, { tags: "gift" }] })
```

## Practice

Four steps on `products` (6 products, priced from 15,000 to 350,000).
