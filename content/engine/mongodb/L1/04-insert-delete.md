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
  - { url: https://www.mongodb.com/docs/manual/tutorial/insert-documents/, title_vi: "Thêm tài liệu" }
  - { url: https://www.mongodb.com/docs/manual/tutorial/delete-documents/, title_vi: "Xóa tài liệu" }
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
      vi: 'Nghe hợp lý vì không có điều kiện nào được ghi, nhưng filter rỗng `{}` nghĩa là "mọi tài liệu", như `find({})` trả cả collection, nên cả sáu sản phẩm bị xóa. MongoDB cũng không từ chối lệnh thiếu điều kiện: `deleteMany({})` là cách hợp lệ để làm rỗng collection. Trước khi xóa, chạy `find` với cùng filter để xem trước.'
      en: 'It sounds right because no condition is written, but the empty filter `{}` means "every document", just as `find({})` returns the whole collection, so all six products are deleted. MongoDB does not refuse a delete with no condition either: `deleteMany({})` is a valid way to empty a collection. Before deleting, run `find` with the same filter to preview.'
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
      vi: 'Nghe hợp lý vì một lệnh hay được coi là một khối, nhưng `insertMany` không phải transaction: mỗi tài liệu là một lần ghi riêng, nên tài liệu thứ nhất đã được ghi thì vẫn ở lại. Mặc định `ordered: true` dừng ở lỗi đầu tiên, nên tài liệu thứ ba không được thử. Chỉ khi ghi rõ `ordered: false`, MongoDB mới bỏ qua tài liệu trùng và thêm tiếp tài liệu thứ ba.'
      en: 'It sounds right because one command is often seen as one unit, but `insertMany` is not a transaction: each document is its own write, so the first document, already written, stays. The default `ordered: true` stops at the first error, so the third document is never tried. Only when you write `ordered: false` does MongoDB skip the duplicate and go on to insert the third.'
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

Chỉ một tài liệu khớp: `p5` (Tea set). `p4` có nhãn `"gift"` trong `tags` nhưng thuộc nhóm `snack`, nên filter trên `category` không chạm tới nó.

Rồi mới xóa với cùng filter:

```js
db.products.deleteMany({ category: "gift" })
```

Ở đây một lần ghi hiện collection sau khi ghi: còn năm sản phẩm, đúng là thiếu `p5`, khớp với bản xem trước. Trong mongosh thật, lệnh xóa trả `deletedCount` thay vì danh sách tài liệu.

Thêm một sản phẩm không có `_id`, MongoDB tự sinh:

```js
db.products.insertOne({ name: "Jasmine tea", category: "drink", price: 40000, stock: 15, tags: [] })
```

Tài liệu mới đứng cuối với một `_id` do bộ chạy sinh. Mingo trong trình duyệt sinh chuỗi đếm như `"000000000000000000000001"`; MongoDB thật sinh một `ObjectId` có thời điểm tạo ở 4 byte đầu.

## Lỗi hay gặp

Thêm tài liệu với `_id` đã có:

```js
// ERROR duplicate_key
db.products.insertOne({ _id: "p1", name: "Green tea 2", category: "drink", price: 26000, stock: 5, tags: [] })
```

`p1` đã có, nên lệnh bị từ chối và collection không đổi. Mã `duplicate_key` là của mingo; MongoDB thật báo lỗi khóa trùng mã 11000 với cùng thông báo `E11000 duplicate key error`. Sửa bằng cách bỏ `_id` hoặc chọn một giá trị chưa dùng.

Dùng `deleteOne` khi muốn xóa mọi tài liệu khớp:

```js
// WRONG: only the first drink is deleted
db.products.deleteOne({ category: "drink" })
```

```js
// FIX: every matching document goes
db.products.deleteMany({ category: "drink" })
```

Bản sai chỉ xóa `p1`; `p2` và `p6` vẫn còn và không có lỗi nào nhắc bạn. Bản sửa xóa cả ba đồ uống. `deleteOne` hợp khi filter chắc chắn trúng một tài liệu, ví dụ lọc theo `_id`.

## Thực hành

Bốn bước. Mỗi bước chạy trên một bản sao mới của collection, nên bước sau không thấy thay đổi của bước trước. Bước 1 thêm một sản phẩm với `_id` tự chọn bằng `insertOne`. Bước 2 thêm hai sản phẩm trong một lệnh `insertMany`. Bước 3 xóa mọi sản phẩm hết hàng. Bước 4 xóa đúng một sản phẩm theo `_id`. Mỗi bước được chấm trên collection sau khi ghi, nên mọi trường của tài liệu mới phải đúng.

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

Only one document matches: `p5` (Tea set). `p4` has the label `"gift"` in `tags` but belongs to category `snack`, so a filter on `category` does not touch it.

Only then delete, with the same filter:

```js
db.products.deleteMany({ category: "gift" })
```

Here a write shows the collection after the write: five products are left, `p5` is the one missing, matching the preview. In a real mongosh the delete returns `deletedCount` instead of a list of documents.

Insert a product without `_id`, and MongoDB generates one:

```js
db.products.insertOne({ name: "Jasmine tea", category: "drink", price: 40000, stock: 15, tags: [] })
```

The new document comes last with an `_id` made by the runtime. Mingo in the browser makes a counter string such as `"000000000000000000000001"`; a real MongoDB generates an `ObjectId` whose first 4 bytes hold the creation time.

## Common mistakes

Inserting a document with an `_id` that already exists:

```js
// ERROR duplicate_key
db.products.insertOne({ _id: "p1", name: "Green tea 2", category: "drink", price: 26000, stock: 5, tags: [] })
```

`p1` already exists, so the command is refused and the collection is unchanged. The code `duplicate_key` comes from mingo; a real MongoDB reports a duplicate key error with code 11000 and the same message `E11000 duplicate key error`. Fix it by leaving `_id` out or picking a value not in use.

Using `deleteOne` when every match must go:

```js
// WRONG: only the first drink is deleted
db.products.deleteOne({ category: "drink" })
```

```js
// FIX: every matching document goes
db.products.deleteMany({ category: "drink" })
```

The wrong version deletes only `p1`; `p2` and `p6` remain and no error warns you. The fix deletes all three drinks. `deleteOne` suits a filter that surely hits one document, for example a filter on `_id`.

## Practice

Four steps. Each step runs on a fresh copy of the collection, so a step never sees the changes of the step before. Step 1 adds a product with a chosen `_id` using `insertOne`. Step 2 adds two products in one `insertMany`. Step 3 deletes every product out of stock. Step 4 deletes exactly one product by `_id`. Each step is graded on the collection after the write, so every field of a new document must be right.

## Recap

- `insertOne` inserts one document, `insertMany` several; without `_id`, MongoDB generates one.
- A duplicate `_id` is refused with a duplicate key error.
- `deleteOne` deletes the first match, `deleteMany` every match.
- `{}` matches every document: preview with `find`, then delete.
