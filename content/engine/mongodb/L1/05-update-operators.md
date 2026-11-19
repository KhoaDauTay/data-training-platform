---
id: e-mg-l1-05
engine: mongodb
level: L1
module: crud
title: Sửa tài liệu và upsert
title_en: Updating documents and upserts
kind: lab
runtime: browser
minutes: 12
objectives:
  - vi: Dùng `$set`, `$inc`, `$unset` với `updateOne` và `updateMany`.
    en: Use `$set`, `$inc` and `$unset` with `updateOne` and `updateMany`.
  - vi: Dùng `upsert` để sửa nếu đã có, thêm mới nếu chưa có.
    en: Use `upsert` to update a document if it exists and insert it if it does not.
requires: [e-mg-l1-04]
sources:
  - https://www.mongodb.com/docs/manual/tutorial/update-documents/
  - https://www.mongodb.com/docs/manual/reference/mql/update/
  - https://www.mongodb.com/docs/manual/reference/method/db.collection.updateone/
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
        vi: Đổi giá (`price`) của sản phẩm `"p2"` thành `115000`.
        en: Change the `price` of product `"p2"` to `115000`.
      solution: 'db.products.updateOne({ _id: "p2" }, { $set: { price: 115000 } })'
      check: doc
      hint:
        vi: "Đối số thứ hai là tài liệu update: `{ $set: { price: 115000 } }`."
        en: "The second argument is the update document: `{ $set: { price: 115000 } }`."
    - task:
        vi: Nhập thêm 10 đơn vị cho mọi sản phẩm nhóm `"drink"` (tăng `stock` thêm 10).
        en: Restock every `"drink"` product by 10 units (raise `stock` by 10).
      solution: 'db.products.updateMany({ category: "drink" }, { $inc: { stock: 10 } })'
      check: doc
      hint:
        vi: "`$inc` cộng thêm một số vào giá trị đang có. Nhiều tài liệu thì dùng `updateMany`."
        en: "`$inc` adds a number to the current value. For many documents use `updateMany`."
    - task:
        vi: Bỏ hẳn trường `tags` khỏi sản phẩm `"p4"`.
        en: Remove the `tags` field from product `"p4"` entirely.
      solution: 'db.products.updateOne({ _id: "p4" }, { $unset: { tags: "" } })'
      check: doc
      hint:
        vi: "`$unset` xóa trường; giá trị ghi kèm (thường là `\"\"`) không quan trọng."
        en: "`$unset` removes the field; the value you write (usually `\"\"`) does not matter."
    - task:
        vi: 'Sản phẩm `"p10"` có thể chưa tồn tại. Đặt `name` `"Sesame candy"`, `category` `"snack"`, `price` `20000` và tăng `stock` thêm 5; chưa có thì tạo mới.'
        en: 'Product `"p10"` may not exist yet. Set `name` `"Sesame candy"`, `category` `"snack"`, `price` `20000` and raise `stock` by 5; create it if it is missing.'
      solution: 'db.products.updateOne({ _id: "p10" }, { $set: { name: "Sesame candy", category: "snack", price: 20000 }, $inc: { stock: 5 } }, { upsert: true })'
      check: doc
      hint:
        vi: "Thêm đối số thứ ba `{ upsert: true }`. `$inc` trên trường chưa có sẽ đặt trường đó bằng số cộng thêm."
        en: "Add a third argument `{ upsert: true }`. `$inc` on a missing field sets it to the increment."
---
## Ý chính

`updateOne(filter, update)` sửa tài liệu khớp đầu tiên, `updateMany(filter, update)` sửa mọi tài liệu khớp. Tài liệu update dùng toán tử:

- `$set`: đặt giá trị (tạo trường nếu chưa có);
- `$inc`: cộng thêm một số (số âm để trừ);
- `$unset`: xóa trường.

Thiếu toán tử, ví dụ `{ price: 1 }`, là lỗi với `updateOne`; muốn thay cả tài liệu thì dùng `replaceOne`.

Upsert: với `{ upsert: true }`, nếu không có tài liệu nào khớp, MongoDB tạo tài liệu mới từ các điều kiện bằng của filter (ở đây `_id`) rồi áp các toán tử update lên nó. `$setOnInsert` đặt giá trị chỉ khi tài liệu được tạo mới.

Một lệnh update trên một tài liệu luôn nguyên tử (atomic): mọi thay đổi trong lệnh cùng xảy ra hoặc không cái nào xảy ra.

Làm được: sửa đúng trường trên đúng tài liệu và ghi "sửa hoặc tạo" trong một lệnh.

## Ví dụ

```js
db.products.updateMany({ stock: { $lt: 5 } }, { $set: { lowStock: true } })
db.products.updateOne({ _id: "p1" }, { $inc: { stock: -2 } })
```

## Thực hành

Bốn bước trên `products`, mỗi bước bắt đầu lại từ dữ liệu gốc.

# EN

## Key idea

`updateOne(filter, update)` changes the first matching document, `updateMany(filter, update)` changes every match. The update document uses operators:

- `$set`: set a value (creating the field if needed);
- `$inc`: add a number (negative to subtract);
- `$unset`: remove the field.

Leaving out the operator, as in `{ price: 1 }`, is an error for `updateOne`; to replace a whole document use `replaceOne`.

Upsert: with `{ upsert: true }`, if no document matches, MongoDB builds a new document from the filter's equality conditions (here `_id`) and applies the update operators to it. `$setOnInsert` sets values only when the document is newly created.

An update on a single document is always atomic: every change in the command happens, or none does.

You can now: change the right fields on the right documents and write "update or create" as one command.

## Example

```js
db.products.updateMany({ stock: { $lt: 5 } }, { $set: { lowStock: true } })
db.products.updateOne({ _id: "p1" }, { $inc: { stock: -2 } })
```

## Practice

Four steps on `products`; each step starts again from the original data.
