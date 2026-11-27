---
id: e-mg-l4-02
engine: mongodb
level: L4
module: patterns
title: "Lab: mẫu Computed Values cho tổng đơn hàng"
title_en: "Lab: the Computed Values pattern for order totals"
kind: lab
minutes: 15
runtime: browser
viz: mg-pipeline
figures: [{ name: mg-computed-bucket, at: idea, variant: computed }]
objectives:
  - vi: "Tính trước tổng tiền và số món của mỗi đơn bằng biểu thức trên mảng"
    en: "Precompute each order's total and item count with array expressions"
  - vi: "Lưu giá trị đã tính vào chính tài liệu bằng update dạng pipeline"
    en: "Store the computed values in the document itself with a pipeline-style update"
  - vi: "Giữ giá trị đã tính đúng khi đơn đổi, trong cùng một lệnh ghi"
    en: "Keep the computed values right when the order changes, in the same write"
requires: [e-mg-l4-01]
sources:
  - { url: https://www.mongodb.com/docs/manual/data-modeling/design-patterns/handle-computed-values/, title_vi: "Lưu sẵn giá trị tính toán" }
  - { url: https://www.mongodb.com/docs/manual/tutorial/update-documents-with-aggregation-pipeline/, title_vi: "Cập nhật bằng aggregation pipeline" }
  - { url: https://www.mongodb.com/docs/manual/reference/operator/aggregation/map/, title_vi: "$map" }
lab:
  setup: |
    {"collections": {"orders": [
      {"_id": 101, "customer": "c01", "lines": [{"sku": "A", "qty": 2, "price": 12.5}, {"sku": "B", "qty": 1, "price": 40}]},
      {"_id": 102, "customer": "c02", "lines": [{"sku": "C", "qty": 3, "price": 8}], "itemCount": 3, "total": 24},
      {"_id": 103, "customer": "c01", "lines": [{"sku": "A", "qty": 1, "price": 12.5}, {"sku": "C", "qty": 2, "price": 8}, {"sku": "D", "qty": 1, "price": 99}]},
      {"_id": 104, "customer": "c03", "lines": []}
    ]}}
  steps:
    - task:
        vi: "Trả mỗi đơn ở dạng đã tính sẵn: `_id`, `customer`, `itemCount` = tổng `qty`, `total` = tổng `qty` nhân `price` của mọi dòng trong `lines`. Đơn không có dòng nào có `itemCount` và `total` bằng 0. Xếp theo `_id` tăng dần."
        en: "Return each order in its precomputed shape: `_id`, `customer`, `itemCount` = sum of `qty`, `total` = sum of `qty` times `price` over every entry in `lines`. An order with no lines has `itemCount` and `total` of 0. Order by `_id` ascending."
      solution: |
        db.orders.aggregate([
          { $project: {
              customer: 1,
              itemCount: { $sum: "$lines.qty" },
              total: { $sum: { $map: { input: "$lines", as: "l", in: { $multiply: [ "$$l.qty", "$$l.price" ] } } } }
          } },
          { $sort: { _id: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "Trong `$project`, `$sum` nhận cả một mảng: `$lines.qty` là mảng các `qty`. Với tiền, dùng `$map` để nhân từng dòng rồi `$sum`."
        en: "Inside `$project`, `$sum` accepts a whole array: `$lines.qty` is the array of `qty` values. For money, use `$map` to multiply each line, then `$sum`."
    - task:
        vi: "Giờ lưu hẳn hai giá trị vào mọi đơn: một `updateMany` dạng pipeline đặt `itemCount` và `total` như bước trước."
        en: "Now store both values in every order: one pipeline-style `updateMany` that sets `itemCount` and `total` as in the previous step."
      solution: |
        db.orders.updateMany({}, [
          { $set: {
              itemCount: { $sum: "$lines.qty" },
              total: { $sum: { $map: { input: "$lines", as: "l", in: { $multiply: [ "$$l.qty", "$$l.price" ] } } } }
          } }
        ])
      check: doc
      hint:
        vi: "Đối số thứ hai là một mảng stage (`[ { $set: … } ]`), nên `$set` đọc được trường của chính tài liệu."
        en: "The second argument is an array of stages (`[ { $set: … } ]`), so `$set` can read the document's own fields."
    - task:
        vi: "Đơn `102` đã có `itemCount: 3` và `total: 24`. Khách thêm 1 món `A` giá 12.5. Viết một `updateOne` vừa thêm dòng vào `lines` vừa tăng `itemCount` và `total` cho khớp."
        en: "Order `102` already has `itemCount: 3` and `total: 24`. The customer adds 1 item `A` priced 12.5. Write one `updateOne` that both appends the line to `lines` and raises `itemCount` and `total` to match."
      solution: 'db.orders.updateOne({ _id: 102 }, { $push: { lines: { sku: "A", qty: 1, price: 12.5 } }, $inc: { itemCount: 1, total: 12.5 } })'
      check: doc
      hint:
        vi: "Gộp `$push` và `$inc` trong cùng một tài liệu update: một lệnh ghi trên một tài liệu là nguyên tử."
        en: "Put `$push` and `$inc` in the same update document: one write on one document is atomic."
quiz:
  - q:
      vi: "Một trang đọc tổng đơn 10.000 lần mỗi giờ, còn đơn chỉ đổi vài lần. Lưu sẵn `total` trong đơn thì sao?"
      en: "A page reads order totals 10,000 times an hour, while an order changes only a few times. What does storing `total` in the order give you?"
    options:
      - { vi: "Mỗi lần đọc rẻ hơn, đổi lại mỗi lần ghi phải cập nhật `total`", en: "Every read gets cheaper, and in exchange every write must update `total`" }
      - { vi: "Không cần cập nhật gì: MongoDB tự tính lại `total` khi `lines` đổi", en: "Nothing to maintain: MongoDB recomputes `total` by itself when `lines` changes" }
      - { vi: "Đọc nhanh hơn, và `total` không bao giờ lệch vì nó chỉ là bản sao", en: "Reads are faster, and `total` can never drift because it is only a copy" }
    answer: 0
    trap: 1
    why:
      vi: "Cột tính toán ở vài hệ khác tự cập nhật nên nghe hợp lý, nhưng trường MongoDB là dữ liệu thường: không ai tính lại nó khi `lines` đổi. Chính vì là bản sao nên `total` mới lệch được: thêm một dòng mà không sửa `total` thì 10.000 lần đọc mỗi giờ đều thấy số cũ. Đổi chác thật là: đọc rẻ hơn vì không phải cộng lại mỗi lần, đổi lại mọi lệnh ghi đổi `lines` phải sửa `total` trong cùng lệnh đó."
      en: "Computed columns update themselves in some other systems, so it sounds right, but a MongoDB field is plain data: nothing recomputes it when `lines` changes. Being a copy is exactly why `total` can drift: add a line without fixing `total` and all 10,000 reads an hour see the old number. The real trade: reads get cheaper because nothing is summed again, and in exchange every write that changes `lines` must fix `total` in that same write."
  - q:
      vi: "Vì sao bước 2 viết `updateMany({}, [ { $set: … } ])` với dấu `[ ]`?"
      en: "Why does step 2 write `updateMany({}, [ { $set: … } ])` with the `[ ]`?"
    options:
      - { vi: "Để cập nhật nhiều tài liệu một lúc", en: "To update many documents at once" }
      - { vi: "Mảng làm update thành pipeline, nên `$set` đọc được `$lines` của chính tài liệu", en: "The array turns the update into a pipeline, so `$set` can read the document's own `$lines`" }
      - { vi: "Bắt buộc với mọi `updateMany`", en: "Every `updateMany` requires it" }
    answer: 1
    why:
      vi: "Update dạng pipeline chạy các stage như `$set`, `$unset`, `$replaceWith` trên từng tài liệu, nên biểu thức như `$sum`, `$map` dùng được giá trị hiện có. Số tài liệu bị đổi do bộ lọc `{}` và `updateMany` quyết định, không phải do mảng. Mảng cũng không bắt buộc: `updateMany` với tài liệu update thường như `{ $inc: … }` vẫn chạy, chỉ là `$set` thường không đọc được `$lines` của tài liệu."
      en: "A pipeline-style update runs stages such as `$set`, `$unset`, `$replaceWith` on each document, so expressions like `$sum` and `$map` can use the existing values. How many documents change is decided by the filter `{}` and `updateMany`, not by the array. Nor is the array required: `updateMany` with a plain update document such as `{ $inc: … }` still runs, but a plain `$set` cannot read the document's `$lines`."
---
## Mở bài

Trang lịch sử đơn hiện tổng tiền của hàng nghìn đơn, và mỗi lần mở trang lại cộng từng dòng hàng. Đơn thì gần như không đổi sau khi đặt. Sao không cộng một lần rồi giữ kết quả?

## Ý chính

Mẫu Computed Values: khi một giá trị được đọc nhiều hơn hẳn số lần được ghi, hãy tính nó một lần lúc ghi và lưu cạnh dữ liệu gốc, thay vì tính lại ở mỗi lần đọc. Ở đây tổng tiền và số món của đơn được lưu ngay trong đơn.

Cái giá là việc giữ cho đúng. Trường đã tính chỉ là dữ liệu thường: MongoDB không tự tính lại khi `lines` đổi. Mọi lệnh ghi đổi dòng hàng phải sửa luôn `itemCount` và `total`, tốt nhất trong cùng lệnh, vì một lệnh ghi trên một tài liệu là nguyên tử.

Nhiều người nghĩ mẫu này chỉ là "thêm một trường". Thật ra nó là một hợp đồng: ai cũng ghi đơn qua cùng một đường, hoặc có một tác vụ định kỳ (ví dụ pipeline kết thúc bằng `$merge`) tính lại để sửa chỗ lệch.

Lab chạy bằng mingo trong trình duyệt: mỗi lần chạy bắt đầu lại từ dữ liệu gốc, và lệnh ghi trả về collection sau khi ghi.

## Cú pháp

```text
{ $sum: "$<array>.<field>" }
{ $map: { input: "$<array>", as: "<name>", in: <expression using "$$<name>"> } }
db.<coll>.updateMany(<filter>, [ { $set: { <field>: <expression>, ... } } ])
db.<coll>.updateOne(<filter>, { $push: { <array>: <value> }, $inc: { <field>: <number>, ... } })
```

- `$sum` trên một mảng: cộng các phần tử; mảng rỗng cho 0.
- `$map`: biến từng phần tử của mảng; `$$` trỏ tới biến `as`.
- Update có `[ ]`: một pipeline, stage đọc được trường hiện có.
- `$push` + `$inc` trong một tài liệu update: đổi cả hai trong một lần ghi.

## Ví dụ

Số món của mỗi đơn, cộng thẳng trên mảng:

```javascript
db.orders.aggregate([{ $project: { itemCount: { $sum: "$lines.qty" } } }])
```

Đơn `101` có 3 món, `103` có 4, `104` không có dòng nào nên ra 0.

Tổng tiền cần nhân từng dòng trước khi cộng:

```javascript
db.orders.aggregate([{ $project: { total: { $sum: { $map: { input: "$lines", as: "l", in: { $multiply: ["$$l.qty", "$$l.price"] } } } } } }])
```

Đơn `101` = 2 × 12.5 + 1 × 40 = 65, đơn `103` = 127.5.

Lưu kết quả vào mọi đơn bằng update dạng pipeline:

```javascript
db.orders.updateMany({}, [{ $set: { itemCount: { $sum: "$lines.qty" } } }])
```

Kết quả là collection sau khi ghi: mỗi đơn giờ có thêm `itemCount`.

## Lỗi hay gặp

Cộng giá mà quên số lượng:

```javascript
// WRONG: adds prices, ignores qty
db.orders.aggregate([{ $project: { total: { $sum: "$lines.price" } } }])
```

```javascript
// FIX: multiply each line first
db.orders.aggregate([{ $project: { total: { $sum: { $map: { input: "$lines", as: "l", in: { $multiply: ["$$l.qty", "$$l.price"] } } } } } }])
```

Câu sai cho đơn `101` là 12.5 + 40 = 52.5 thay vì 65, vì dòng hàng `A` có `qty: 2` mà chỉ được cộng một lần; không có lỗi nào báo, chỉ số sai.

Thêm dòng hàng mà quên sửa giá trị đã tính:

```javascript
// WRONG: the line is added, the stored count is not
db.orders.updateOne({ _id: 102 }, { $push: { lines: { sku: "A", qty: 1, price: 12.5 } } })
```

```javascript
// FIX: change the line and the computed fields in one write
db.orders.updateOne({ _id: 102 }, { $push: { lines: { sku: "A", qty: 1, price: 12.5 } }, $inc: { itemCount: 1, total: 12.5 } })
```

Sau câu sai, `itemCount` và `total` của đơn `102` vẫn là số cũ: trang lịch sử sẽ hiện tổng sai cho tới khi có ai tính lại.

## Thực hành

Ba bước: tính hai giá trị bằng pipeline đọc, lưu chúng vào mọi đơn, rồi thêm một dòng hàng mà vẫn giữ hai giá trị đúng.

## Tóm tắt

- Computed Values: tính một lần lúc ghi, đọc nhiều lần không phải tính lại.
- `$sum` cộng được một mảng; tiền cần `$map` nhân từng dòng trước.
- Update dạng pipeline (`[ { $set: … } ]`) đọc được trường của chính tài liệu.
- Trường đã tính không tự cập nhật: sửa nó trong cùng lệnh ghi đổi dữ liệu gốc.

# EN

## Opening

The order history page shows the totals of thousands of orders, and every time it opens it adds up each line again. Yet an order hardly ever changes once it is placed. Why not add it up once and keep the result?

## Key idea

The Computed Values pattern: when a value is read far more often than it is written, compute it once at write time and store it next to the source data, instead of computing it on every read. Here an order's total and item count are stored right in the order.

The price is keeping it right. A computed field is plain data: MongoDB does not recompute it when `lines` changes. Every write that changes the lines must also fix `itemCount` and `total`, best in the same command, because one write on one document is atomic.

Many people think this pattern is just "add a field". In fact it is a contract: everyone writes orders through the same path, or a scheduled job (for example a pipeline ending in `$merge`) recomputes the values to repair any drift.

The lab runs on mingo in the browser: every run starts again from the original data, and a write returns the collection as it left it.

## Syntax

```text
{ $sum: "$<array>.<field>" }
{ $map: { input: "$<array>", as: "<name>", in: <expression using "$$<name>"> } }
db.<coll>.updateMany(<filter>, [ { $set: { <field>: <expression>, ... } } ])
db.<coll>.updateOne(<filter>, { $push: { <array>: <value> }, $inc: { <field>: <number>, ... } })
```

- `$sum` over an array: adds the elements; an empty array gives 0.
- `$map`: transforms each array element; `$$` points to the `as` variable.
- An update with `[ ]`: a pipeline, its stages can read existing fields.
- `$push` + `$inc` in one update document: both change in one write.

## Example

Each order's item count, summed straight over the array:

```javascript
db.orders.aggregate([{ $project: { itemCount: { $sum: "$lines.qty" } } }])
```

Order `101` has 3 items, `103` has 4, and `104` has no lines so it gives 0.

The total needs each line multiplied before the sum:

```javascript
db.orders.aggregate([{ $project: { total: { $sum: { $map: { input: "$lines", as: "l", in: { $multiply: ["$$l.qty", "$$l.price"] } } } } } }])
```

Order `101` = 2 × 12.5 + 1 × 40 = 65, order `103` = 127.5.

Store the result in every order with a pipeline-style update:

```javascript
db.orders.updateMany({}, [{ $set: { itemCount: { $sum: "$lines.qty" } } }])
```

The result is the collection after the write: every order now has `itemCount`.

## Common mistakes

Adding prices and forgetting the quantity:

```javascript
// WRONG: adds prices, ignores qty
db.orders.aggregate([{ $project: { total: { $sum: "$lines.price" } } }])
```

```javascript
// FIX: multiply each line first
db.orders.aggregate([{ $project: { total: { $sum: { $map: { input: "$lines", as: "l", in: { $multiply: ["$$l.qty", "$$l.price"] } } } } } }])
```

The wrong query gives 12.5 + 40 = 52.5 for order `101` instead of 65, because line `A` has `qty: 2` but is added only once; no error is raised, only the number is wrong.

Adding a line and forgetting the computed values:

```javascript
// WRONG: the line is added, the stored count is not
db.orders.updateOne({ _id: 102 }, { $push: { lines: { sku: "A", qty: 1, price: 12.5 } } })
```

```javascript
// FIX: change the line and the computed fields in one write
db.orders.updateOne({ _id: 102 }, { $push: { lines: { sku: "A", qty: 1, price: 12.5 } }, $inc: { itemCount: 1, total: 12.5 } })
```

After the wrong command, order `102` keeps its old `itemCount` and `total`: the history page shows a wrong total until someone recomputes it.

## Practice

Three steps: compute both values with a read pipeline, store them in every order, then add a line while keeping both values right.

## Recap

- Computed Values: compute once at write time, read many times without recomputing.
- `$sum` can add an array; money needs `$map` to multiply each line first.
- A pipeline-style update (`[ { $set: … } ]`) can read the document's own fields.
- A computed field never updates itself: fix it in the same write that changes the source data.
