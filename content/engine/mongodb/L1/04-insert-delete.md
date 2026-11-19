---
id: e-mg-l1-04
engine: mongodb
level: L1
module: crud
title: Thêm và xóa tài liệu
title_en: Inserting and deleting documents
kind: lab
runtime: browser
minutes: 10
objectives:
  - vi: Thêm một hoặc nhiều tài liệu bằng `insertOne` và `insertMany`.
    en: Insert one or many documents with `insertOne` and `insertMany`.
  - vi: Xóa đúng tài liệu bằng `deleteOne` và `deleteMany`, và biết filter rỗng xóa sạch collection.
    en: Delete the right documents with `deleteOne` and `deleteMany`, and know that an empty filter empties the collection.
requires: [e-mg-l1-03]
sources:
  - https://www.mongodb.com/docs/manual/tutorial/insert-documents/
  - https://www.mongodb.com/docs/manual/tutorial/delete-documents/
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
        vi: 'Thêm sản phẩm `_id` `"p7"`, `name` `"Ginger tea"`, `category` `"drink"`, `price` `30000`, `stock` `20`, `tags` là mảng chỉ có `"hot"`.'
        en: 'Insert product `_id` `"p7"`, `name` `"Ginger tea"`, `category` `"drink"`, `price` `30000`, `stock` `20`, `tags` an array holding only `"hot"`.'
      solution: 'db.products.insertOne({ _id: "p7", name: "Ginger tea", category: "drink", price: 30000, stock: 20, tags: ["hot"] })'
      check: doc
      hint:
        vi: "`insertOne` nhận một tài liệu. Viết đủ sáu trường."
        en: "`insertOne` takes one document. Write all six fields."
    - task:
        vi: 'Thêm cùng lúc hai sản phẩm nhóm `"snack"`: `"p8"` `"Peanut brittle"` giá `20000`, tồn `30`; `"p9"` `"Coconut candy"` giá `35000`, tồn `15`. Cả hai có `tags` rỗng.'
        en: 'Insert two `"snack"` products at once: `"p8"` `"Peanut brittle"` price `20000`, stock `30`; `"p9"` `"Coconut candy"` price `35000`, stock `15`. Both have empty `tags`.'
      solution: 'db.products.insertMany([{ _id: "p8", name: "Peanut brittle", category: "snack", price: 20000, stock: 30, tags: [] }, { _id: "p9", name: "Coconut candy", category: "snack", price: 35000, stock: 15, tags: [] }])'
      check: doc
      hint:
        vi: "`insertMany` nhận một mảng tài liệu."
        en: "`insertMany` takes an array of documents."
    - task:
        vi: Xóa mọi sản phẩm đã hết hàng (`stock` bằng 0).
        en: Delete every product that is out of stock (`stock` equal to 0).
      solution: 'db.products.deleteMany({ stock: 0 })'
      check: doc
      hint:
        vi: "`deleteMany` nhận một filter giống `find`."
        en: "`deleteMany` takes a filter just like `find`."
    - task:
        vi: Xóa đúng một sản phẩm, `"p5"`.
        en: Delete exactly one product, `"p5"`.
      solution: 'db.products.deleteOne({ _id: "p5" })'
      check: doc
      hint:
        vi: Lọc theo `_id` là cách chắc chắn nhất để chỉ trúng một tài liệu.
        en: Filtering on `_id` is the surest way to hit exactly one document.
---
## Ý chính

- `insertOne(doc)` thêm một tài liệu, `insertMany([doc, doc])` thêm nhiều. Không có `_id` thì MongoDB tự sinh `ObjectId`.
- Trùng `_id` với tài liệu đã có thì lệnh bị từ chối với lỗi khóa trùng (mã 11000).
- Collection chưa tồn tại sẽ được tạo ở lần thêm đầu tiên.
- `deleteOne(filter)` xóa tài liệu khớp đầu tiên, `deleteMany(filter)` xóa mọi tài liệu khớp.

Cẩn thận: `deleteMany({})` xóa mọi tài liệu của collection. Trước khi xóa, chạy `find` với cùng filter để xem trước những gì sẽ mất.

Làm được: thêm tài liệu mới với `_id` tự chọn, và xóa đúng những tài liệu cần xóa.

## Ví dụ

```js
db.products.find({ category: "gift" })
db.products.deleteMany({ category: "gift" })
```

Câu đầu xem trước, câu sau mới xóa.

## Thực hành

Bốn bước. Mỗi bước chạy trên một bản sao mới của collection, nên bước sau không thấy thay đổi của bước trước.

# EN

## Key idea

- `insertOne(doc)` inserts one document, `insertMany([doc, doc])` inserts several. Without `_id`, MongoDB generates an `ObjectId`.
- An `_id` that already exists makes the insert fail with a duplicate key error (code 11000).
- A collection that does not exist yet is created by its first insert.
- `deleteOne(filter)` deletes the first matching document, `deleteMany(filter)` deletes every match.

Careful: `deleteMany({})` deletes every document in the collection. Before deleting, run `find` with the same filter to preview what will go.

You can now: insert new documents with an `_id` you choose, and delete exactly the documents that must go.

## Example

```js
db.products.find({ category: "gift" })
db.products.deleteMany({ category: "gift" })
```

The first line previews, the second one deletes.

## Practice

Four steps. Each step runs on a fresh copy of the collection, so a step never sees the changes of the step before.
