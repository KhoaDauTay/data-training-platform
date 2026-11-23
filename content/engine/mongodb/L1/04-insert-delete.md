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
quiz:
  - q:
      vi: 'Một đồng nghiệp chạy `db.products.deleteMany({})` để "thử lệnh, vì filter rỗng thì chẳng khớp gì". Chuyện gì xảy ra?'
      en: 'A colleague runs `db.products.deleteMany({})` "as a test, because an empty filter matches nothing". What happens?'
    options:
      - vi: Không xóa gì, vì filter rỗng không khớp tài liệu nào
        en: Nothing is deleted, because an empty filter matches no document
      - vi: Mọi tài liệu của collection bị xóa
        en: Every document in the collection is deleted
      - vi: Lệnh bị từ chối vì thiếu điều kiện
        en: The command is refused because it has no condition
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì không có điều kiện nào được ghi, nhưng filter rỗng `{}` nghĩa là "mọi tài liệu", như `find({})` trả cả collection. Trước khi xóa, chạy `find` với cùng filter để xem trước.'
      en: 'It sounds right because no condition is written, but the empty filter `{}` means "every document", just as `find({})` returns the whole collection. Before deleting, run `find` with the same filter to preview.'
  - q:
      vi: '`insertMany` ba tài liệu theo mặc định, tài liệu thứ hai trùng `_id`. Kết quả là gì?'
      en: 'A default `insertMany` of three documents, where the second one has a duplicate `_id`. What is the result?'
    options:
      - vi: Không tài liệu nào được thêm, cả lệnh quay lui như một transaction
        en: No document is inserted, the whole command rolls back like a transaction
      - vi: Tài liệu thứ nhất được thêm, lệnh dừng ở tài liệu thứ hai, tài liệu thứ ba không được thêm
        en: The first document is inserted, the command stops at the second, the third is not inserted
      - vi: Tài liệu thứ nhất và thứ ba được thêm, chỉ tài liệu trùng bị bỏ
        en: The first and third documents are inserted, only the duplicate is skipped
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì một lệnh hay được coi là một khối, nhưng `insertMany` không phải transaction: mỗi tài liệu là một lần ghi riêng. Mặc định `ordered: true` dừng ở lỗi đầu tiên; với `ordered: false`, MongoDB thêm tiếp các tài liệu còn lại.'
      en: 'It sounds right because one command is often seen as one unit, but `insertMany` is not a transaction: each document is its own write. The default `ordered: true` stops at the first error; with `ordered: false`, MongoDB goes on with the remaining documents.'
---
## Mở bài

Hàng mới về cần thêm vào danh mục, hàng hết cần gỡ xuống. Thêm thì dễ, nhưng một lệnh xóa sai filter có thể xóa cả collection. Làm sao thêm và xóa đúng tài liệu?

## Ý chính

- `insertOne(doc)` thêm một tài liệu, `insertMany([doc, doc])` thêm nhiều. Không có `_id` thì MongoDB tự sinh `ObjectId`.
- Trùng `_id` với tài liệu đã có thì lệnh bị từ chối với lỗi khóa trùng (mã 11000).
- Collection chưa tồn tại sẽ được tạo ở lần thêm đầu tiên.
- `deleteOne(filter)` xóa tài liệu khớp đầu tiên, `deleteMany(filter)` xóa mọi tài liệu khớp.

Cẩn thận: `deleteMany({})` xóa mọi tài liệu của collection. Trước khi xóa, chạy `find` với cùng filter để xem trước những gì sẽ mất.

Làm được: thêm tài liệu mới với `_id` tự chọn, và xóa đúng những tài liệu cần xóa.

## Cú pháp

```text
db.<collection>.insertOne({ _id: <value>, <field>: <value> })
db.<collection>.insertMany([ { … }, { … } ], { ordered: true })
db.<collection>.deleteOne(<filter>)
db.<collection>.deleteMany(<filter>)
```

- `_id` tùy chọn khi thêm; thiếu thì MongoDB sinh.
- Filter của lệnh xóa giống filter của `find`.
- `{}` khớp mọi tài liệu.

## Ví dụ

Xem trước những gì sẽ bị xóa:

```js
db.products.find({ category: "gift" })
```

Rồi mới xóa với cùng filter:

```js
db.products.deleteMany({ category: "gift" })
```

Thêm một sản phẩm không có `_id`, MongoDB tự sinh:

```js
db.products.insertOne({ name: "Jasmine tea", category: "drink", price: 40000, stock: 15, tags: [] })
```

## Lỗi hay gặp

Thêm tài liệu với `_id` đã có:

```js
// ERROR duplicate_key
db.products.insertOne({ _id: "p1", name: "Green tea 2", category: "drink", price: 26000, stock: 5, tags: [] })
```

Dùng `deleteOne` khi muốn xóa mọi tài liệu khớp:

```js
// WRONG: only the first drink is deleted
db.products.deleteOne({ category: "drink" })
```

```js
// FIX: every matching document goes
db.products.deleteMany({ category: "drink" })
```

## Thực hành

Bốn bước. Mỗi bước chạy trên một bản sao mới của collection, nên bước sau không thấy thay đổi của bước trước.

## Tóm tắt

- `insertOne` thêm một tài liệu, `insertMany` thêm nhiều; thiếu `_id` thì MongoDB sinh.
- `_id` trùng bị từ chối với lỗi khóa trùng.
- `deleteOne` xóa tài liệu khớp đầu tiên, `deleteMany` xóa mọi tài liệu khớp.
- `{}` khớp mọi tài liệu: xem trước bằng `find` rồi mới xóa.

# EN

## Opening

New stock needs to go into the catalogue, and sold-out lines need to come off. Inserting is easy, but one delete with the wrong filter can empty the collection. How do you insert and delete exactly the right documents?

## Key idea

- `insertOne(doc)` inserts one document, `insertMany([doc, doc])` inserts several. Without `_id`, MongoDB generates an `ObjectId`.
- An `_id` that already exists makes the insert fail with a duplicate key error (code 11000).
- A collection that does not exist yet is created by its first insert.
- `deleteOne(filter)` deletes the first matching document, `deleteMany(filter)` deletes every match.

Careful: `deleteMany({})` deletes every document in the collection. Before deleting, run `find` with the same filter to preview what will go.

You can now: insert new documents with an `_id` you choose, and delete exactly the documents that must go.

## Syntax

```text
db.<collection>.insertOne({ _id: <value>, <field>: <value> })
db.<collection>.insertMany([ { … }, { … } ], { ordered: true })
db.<collection>.deleteOne(<filter>)
db.<collection>.deleteMany(<filter>)
```

- `_id` is optional on insert; if it is missing, MongoDB generates one.
- A delete takes the same filter as `find`.
- `{}` matches every document.

## Example

Preview what will be deleted:

```js
db.products.find({ category: "gift" })
```

Only then delete, with the same filter:

```js
db.products.deleteMany({ category: "gift" })
```

Insert a product without `_id`, and MongoDB generates one:

```js
db.products.insertOne({ name: "Jasmine tea", category: "drink", price: 40000, stock: 15, tags: [] })
```

## Common mistakes

Inserting a document with an `_id` that already exists:

```js
// ERROR duplicate_key
db.products.insertOne({ _id: "p1", name: "Green tea 2", category: "drink", price: 26000, stock: 5, tags: [] })
```

Using `deleteOne` when every match must go:

```js
// WRONG: only the first drink is deleted
db.products.deleteOne({ category: "drink" })
```

```js
// FIX: every matching document goes
db.products.deleteMany({ category: "drink" })
```

## Practice

Four steps. Each step runs on a fresh copy of the collection, so a step never sees the changes of the step before.

## Recap

- `insertOne` inserts one document, `insertMany` several; without `_id`, MongoDB generates one.
- A duplicate `_id` is refused with a duplicate key error.
- `deleteOne` deletes the first match, `deleteMany` every match.
- `{}` matches every document: preview with `find`, then delete.
