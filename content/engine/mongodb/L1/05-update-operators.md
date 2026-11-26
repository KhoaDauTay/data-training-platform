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
figures: [{ name: mg-upsert-flow, at: idea }]
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
quiz:
  - q:
      vi: 'Bạn chạy `db.products.updateOne({ _id: "p2" }, { price: 115000 })`. Chuyện gì xảy ra?'
      en: 'You run `db.products.updateOne({ _id: "p2" }, { price: 115000 })`. What happens?'
    options:
      - vi: '`price` của `p2` thành 115000, các trường khác giữ nguyên'
        en: 'The `price` of `p2` becomes 115000, other fields stay'
      - vi: Lệnh bị từ chối vì tài liệu update thiếu toán tử như `$set`
        en: The command is refused because the update document has no operator such as `$set`
      - vi: 'Tài liệu `p2` bị thay bằng `{ _id: "p2", price: 115000 }`'
        en: 'Document `p2` is replaced by `{ _id: "p2", price: 115000 }`'
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì giống `SET price = 115000` trong SQL, nhưng `updateOne` đòi tài liệu update có toán tử (`$set`, `$inc`…). Thay cả tài liệu là việc của `replaceOne`, nên MongoDB không đoán và từ chối.'
      en: 'It sounds right because it reads like `SET price = 115000` in SQL, but `updateOne` requires an update document with operators (`$set`, `$inc`…). Replacing a whole document is the job of `replaceOne`, so MongoDB does not guess and refuses.'
  - q:
      vi: 'Không có sản phẩm `"p11"`. Bạn chạy `db.products.updateOne({ _id: "p11" }, { $inc: { stock: 5 } })` (không có `upsert`). Kết quả là gì?'
      en: 'There is no product `"p11"`. You run `db.products.updateOne({ _id: "p11" }, { $inc: { stock: 5 } })` (no `upsert`). What is the result?'
    options:
      - vi: 'Tài liệu `p11` được tạo với `stock` bằng 5'
        en: 'Document `p11` is created with `stock` equal to 5'
      - vi: 'Lệnh báo lỗi không tìm thấy'
        en: 'The command fails with a not-found error'
      - vi: 'Không có gì thay đổi: `matchedCount` bằng 0, không lỗi'
        en: 'Nothing changes: `matchedCount` is 0, no error'
    answer: 2
    trap: 0
    why:
      vi: 'Nghe hợp lý vì `$inc` trên trường thiếu sẽ tạo trường, nhưng chỉ khi có tài liệu để sửa. Không khớp gì thì update không làm gì và không báo lỗi; muốn tạo mới phải thêm `{ upsert: true }`.'
      en: 'It sounds right because `$inc` on a missing field creates the field, but only when there is a document to change. When nothing matches, the update does nothing and raises no error; to create the document you must add `{ upsert: true }`.'
---
## Mở bài

Giá cà phê đổi, hàng nhập thêm, một sản phẩm mới có thể đã có hoặc chưa. Ghi đè cả tài liệu cho từng thay đổi nhỏ vừa phí vừa dễ mất dữ liệu. Làm sao chỉ sửa đúng trường cần sửa?

## Ý chính

`updateOne(filter, update)` sửa tài liệu khớp đầu tiên, `updateMany(filter, update)` sửa mọi tài liệu khớp. Tài liệu update dùng toán tử:

- `$set`: đặt giá trị (tạo trường nếu chưa có);
- `$inc`: cộng thêm một số (số âm để trừ);
- `$unset`: xóa trường.

Thiếu toán tử, ví dụ `{ price: 1 }`, là lỗi với `updateOne`; muốn thay cả tài liệu thì dùng `replaceOne`.

Upsert: với `{ upsert: true }`, nếu không có tài liệu nào khớp, MongoDB tạo tài liệu mới từ các điều kiện bằng của filter (ở đây `_id`) rồi áp các toán tử update lên nó. `$setOnInsert` đặt giá trị chỉ khi tài liệu được tạo mới.

Một lệnh update trên một tài liệu luôn nguyên tử (atomic): mọi thay đổi trong lệnh cùng xảy ra hoặc không cái nào xảy ra.

Làm được: sửa đúng trường trên đúng tài liệu và ghi "sửa hoặc tạo" trong một lệnh.

Hình từng bước ở cuối mục này chạy cùng một lệnh lên `p10` chưa có, một lần không có `upsert`, một lần có `{ upsert: true }`.

## Cú pháp

```text
db.<collection>.updateOne(<filter>, { $set: { <field>: <value> }, $inc: { <field>: <number> }, $unset: { <field>: "" } })
db.<collection>.updateMany(<filter>, <update>)
db.<collection>.updateOne(<filter>, <update>, { upsert: true })
```

- Tài liệu update luôn bắt đầu bằng toán tử.
- Mỗi trường chỉ chịu một toán tử trong một lệnh.
- `upsert: true` tạo tài liệu khi không có gì khớp.

## Ví dụ

Đánh dấu mọi sản phẩm sắp hết:

```js
db.products.updateMany({ stock: { $lt: 5 } }, { $set: { lowStock: true } })
```

Bán 2 hộp `"p1"`, trừ tồn kho bằng số âm:

```js
db.products.updateOne({ _id: "p1" }, { $inc: { stock: -2 } })
```

## Lỗi hay gặp

Quên toán tử, như viết `SET` của SQL:

```js
// ERROR bad_update
db.products.updateOne({ _id: "p2" }, { price: 115000 })
```

MongoDB thật cũng từ chối: tài liệu update của `updateOne` phải có toán tử.

Sửa một tài liệu chưa có mà quên `upsert`:

```js
// WRONG: no product p10 exists, so nothing changes
db.products.updateOne({ _id: "p10" }, { $set: { name: "Sesame candy", price: 20000 } })
```

```js
// FIX: upsert creates it from the filter's _id
db.products.updateOne({ _id: "p10" }, { $set: { name: "Sesame candy", price: 20000 } }, { upsert: true })
```

Bản sai không báo lỗi, chỉ trả `matchedCount` bằng 0, nên dễ tưởng đã ghi xong. Bản sửa tạo `p10` với `_id` lấy từ filter, rồi áp `$set` lên tài liệu mới.

Hai toán tử trên cùng một trường:

```js
// ERROR mingo
db.products.updateOne({ _id: "p2" }, { $set: { price: 115000 }, $inc: { price: 1000 } })
```

`$set` và `$inc` cùng muốn đổi `price`, và thứ tự quyết định kết quả: đặt rồi cộng ra 116000, cộng rồi đặt ra 115000. MongoDB không chọn hộ nên từ chối cả lệnh (MongoDB thật báo xung đột đường dẫn trường). Gộp thành một toán tử: đặt thẳng `price` bằng giá cuối cùng.

## Thực hành

Bốn bước trên `products`, mỗi bước bắt đầu lại từ dữ liệu gốc.

## Tóm tắt

- `updateOne` sửa tài liệu khớp đầu tiên, `updateMany` sửa mọi tài liệu khớp.
- `$set` đặt, `$inc` cộng, `$unset` xóa trường; thiếu toán tử là lỗi.
- Không khớp gì thì update không làm gì và không báo lỗi.
- `{ upsert: true }` tạo tài liệu mới từ điều kiện bằng của filter.
- Một update trên một tài liệu là nguyên tử.

# EN

## Opening

The price of coffee changes, stock arrives, and a new product may or may not exist yet. Overwriting the whole document for each small change is wasteful and can lose data. How do you change only the fields that need it?

## Key idea

`updateOne(filter, update)` changes the first matching document, `updateMany(filter, update)` changes every match. The update document uses operators:

- `$set`: set a value (creating the field if needed);
- `$inc`: add a number (negative to subtract);
- `$unset`: remove the field.

Leaving out the operator, as in `{ price: 1 }`, is an error for `updateOne`; to replace a whole document use `replaceOne`.

Upsert: with `{ upsert: true }`, if no document matches, MongoDB builds a new document from the filter's equality conditions (here `_id`) and applies the update operators to it. `$setOnInsert` sets values only when the document is newly created.

An update on a single document is always atomic: every change in the command happens, or none does.

You can now: change the right fields on the right documents and write "update or create" as one command.

The step-through figure at the end of this section runs one command on `p10`, which does not exist yet, once without `upsert` and once with `{ upsert: true }`.

## Syntax

```text
db.<collection>.updateOne(<filter>, { $set: { <field>: <value> }, $inc: { <field>: <number> }, $unset: { <field>: "" } })
db.<collection>.updateMany(<filter>, <update>)
db.<collection>.updateOne(<filter>, <update>, { upsert: true })
```

- An update document always starts with operators.
- Each field takes only one operator per command.
- `upsert: true` creates a document when nothing matches.

## Example

Flag every product that is running low:

```js
db.products.updateMany({ stock: { $lt: 5 } }, { $set: { lowStock: true } })
```

Sell 2 boxes of `"p1"`, taking stock down with a negative number:

```js
db.products.updateOne({ _id: "p1" }, { $inc: { stock: -2 } })
```

## Common mistakes

Leaving out the operator, as in an SQL `SET`:

```js
// ERROR bad_update
db.products.updateOne({ _id: "p2" }, { price: 115000 })
```

A real MongoDB refuses it too: the update document of `updateOne` must hold operators.

Updating a document that does not exist yet and forgetting `upsert`:

```js
// WRONG: no product p10 exists, so nothing changes
db.products.updateOne({ _id: "p10" }, { $set: { name: "Sesame candy", price: 20000 } })
```

```js
// FIX: upsert creates it from the filter's _id
db.products.updateOne({ _id: "p10" }, { $set: { name: "Sesame candy", price: 20000 } }, { upsert: true })
```

The wrong version raises no error and only returns `matchedCount` 0, so it is easy to think the write happened. The fix creates `p10` with the `_id` taken from the filter, then applies `$set` to the new document.

Two operators on the same field:

```js
// ERROR mingo
db.products.updateOne({ _id: "p2" }, { $set: { price: 115000 }, $inc: { price: 1000 } })
```

`$set` and `$inc` both want to change `price`, and the order decides the result: set then add gives 116000, add then set gives 115000. MongoDB does not pick one, so it refuses the whole command (a real MongoDB reports a field path conflict). Use one operator: set `price` straight to the final value.

## Practice

Four steps on `products`; each step starts again from the original data.

## Recap

- `updateOne` changes the first match, `updateMany` every match.
- `$set` sets, `$inc` adds, `$unset` removes a field; no operator is an error.
- When nothing matches, an update does nothing and raises no error.
- `{ upsert: true }` builds a new document from the filter's equality conditions.
- An update on one document is atomic.
