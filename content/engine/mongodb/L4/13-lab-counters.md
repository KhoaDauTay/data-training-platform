---
id: e-mg-l4-13
engine: mongodb
level: L4
module: patterns
title: "Lab: bộ đếm và số thứ tự"
title_en: "Lab: counters and sequence numbers"
kind: lab
minutes: 14
runtime: browser
objectives:
  - vi: "Cấp số đơn tiếp theo bằng một lệnh `findOneAndUpdate` với `$inc`, không đọc rồi ghi hai lần"
    en: "Hand out the next order number with one `findOneAndUpdate` and `$inc`, never a read then a write"
  - vi: "Tạo bộ đếm còn thiếu bằng upsert, và thấy `_id` trùng bị từ chối"
    en: "Create a missing counter with an upsert, and see a duplicate `_id` refused"
  - vi: "Biết cái giá của bộ đếm: một tài liệu nóng mà mọi lần ghi đều chạm vào"
    en: "Know the cost of a counter: one hot document that every write touches"
requires: [e-mg-l1-05, e-mg-l4-01]
sources:
  - https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
  - https://www.mongodb.com/docs/manual/reference/operator/update/inc/
  - https://www.mongodb.com/docs/manual/core/write-operations-atomicity/
  - https://www.mongodb.com/docs/manual/core/document/
lab:
  setup: |
    {"collections": {
      "counters": [
        {"_id": "order", "seq": 1042}
      ],
      "orders": [
        {"_id": 1041, "customer": "c07", "total": 180000},
        {"_id": 1042, "customer": "c02", "total": 95000}
      ]
    }}
  steps:
    - name: { vi: "Số đơn tiếp theo", en: "Next order number" }
      task:
        vi: "Cửa hàng cần số cho đơn mới. Tăng `seq` của bộ đếm có `_id` là `order` thêm 1 và trả về tài liệu bộ đếm **sau** khi tăng, trong một lệnh."
        en: "The shop needs a number for a new order. Add 1 to the `seq` of the counter whose `_id` is `order` and return the counter document **after** the increase, in one command."
      solution: 'db.counters.findOneAndUpdate({ _id: "order" }, { $inc: { seq: 1 } }, { returnDocument: "after" })'
      check: doc
      sql: "UPDATE counters SET seq = seq + 1 WHERE id = 'order' RETURNING id, seq;"
      hint:
        vi: "`findOneAndUpdate(filter, { $inc: … }, options)`. Mặc định nó trả tài liệu **trước** khi sửa; thêm `returnDocument: \"after\"` để nhận số mới."
        en: "`findOneAndUpdate(filter, { $inc: … }, options)`. By default it returns the document **before** the change; add `returnDocument: \"after\"` to get the new number."
      fact:
        vi: "Đọc `seq` rồi `updateOne` riêng là hai lệnh: hai người cùng đọc 1042 sẽ cùng lấy 1043. Một `findOneAndUpdate` sửa và trả về trên cùng một tài liệu nên là một thao tác atomic."
        en: "Reading `seq` and then a separate `updateOne` are two commands: two clients that both read 1042 both take 1043. One `findOneAndUpdate` changes and returns the same document, so it is one atomic operation."
    - name: { vi: "Bộ đếm mới bằng upsert", en: "A new counter by upsert" }
      task:
        vi: "Hóa đơn chưa có bộ đếm. Trong một lệnh: tăng `seq` của bộ đếm `_id` là `invoice` thêm 1, tạo nó nếu chưa có, và trả về tài liệu sau khi tăng (lần đầu phải ra `seq` bằng 1)."
        en: "Invoices have no counter yet. In one command: add 1 to the `seq` of the counter whose `_id` is `invoice`, create it if it is missing, and return the document after the increase (the first time must give `seq` 1)."
      solution: 'db.counters.findOneAndUpdate({ _id: "invoice" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" })'
      check: doc
      hint:
        vi: "Thêm `upsert: true` vào options. Khi không có tài liệu khớp, MongoDB tạo tài liệu từ `_id` trong bộ lọc, rồi `$inc` trên trường chưa có coi nó là 0."
        en: "Add `upsert: true` to the options. When no document matches, MongoDB builds one from the `_id` in the filter, and `$inc` on a missing field treats it as 0."
    - name: { vi: "Số đã dùng thì bị từ chối", en: "A used number is refused" }
      task:
        vi: "Thử dùng lại một số đã cấp: thêm một đơn có `_id` là 1042, `customer` là `c09`, `total` là 50000. Bước này đạt khi MongoDB **từ chối** lệnh vì `_id` trùng."
        en: "Try to reuse a number that was already handed out: insert an order with `_id` 1042, `customer` `c09`, `total` 50000. This step passes when MongoDB **refuses** the command because the `_id` is a duplicate."
      solution: 'db.orders.insertOne({ _id: 1042, customer: "c09", total: 50000 })'
      check: doc
      error: duplicate_key
      hint:
        vi: "Mọi collection có index duy nhất trên `_id`. `insertOne` với `_id` đã có trả lỗi E11000 duplicate key."
        en: "Every collection has a unique index on `_id`. `insertOne` with an `_id` that exists fails with an E11000 duplicate key error."
quiz:
  - q:
      vi: "Mỗi giây có 2.000 đơn mới, mỗi đơn lấy số từ cùng một tài liệu bộ đếm. Điều gì đáng lo nhất?"
      en: "2,000 new orders arrive every second, and each one takes its number from the same counter document. What is the main worry?"
    options:
      - { vi: "Hai đơn nhận trùng số", en: "Two orders get the same number" }
      - { vi: "Mọi lần ghi xếp hàng trên một tài liệu nóng", en: "Every write queues on one hot document" }
      - { vi: "Bộ đếm vượt giới hạn 16 MiB", en: "The counter grows past the 16 MiB limit" }
    answer: 1
    why:
      vi: "Nghe hợp lý khi lo trùng số, nhưng `$inc` trên một tài liệu là atomic nên không trùng. Cái giá thật là mọi lần cấp số cùng ghi vào một tài liệu, nên chúng phải lần lượt. Khi không cần số liền nhau, `_id` kiểu `ObjectId` tránh được tài liệu nóng này."
      en: "Worrying about duplicates sounds right, but `$inc` on one document is atomic, so numbers never repeat. The real cost is that every number handed out writes to the same document, so the writes take turns. When numbers need not be consecutive, an `ObjectId` `_id` avoids this hot document."
---

## Ý chính

MongoDB không có kiểu tự tăng như `SERIAL` hay `IDENTITY` của SQL. Khi cần số liền nhau (số đơn, số hóa đơn), cách thường dùng là một collection `counters`: mỗi bộ đếm là một tài liệu, và mỗi lần cấp số là một lệnh `findOneAndUpdate` với `$inc`.

Thao tác trên một tài liệu là atomic, nên tăng và trả về trong cùng một lệnh không bao giờ cấp trùng số. Đọc trước rồi ghi sau là hai lệnh và có thể cấp trùng.

Cái giá: mọi lần cấp số đều ghi vào cùng một tài liệu. Đó là một tài liệu nóng, giới hạn số lần ghi mỗi giây. Nếu chỉ cần mã duy nhất, không cần liền nhau, để MongoDB sinh `ObjectId`.

## Ví dụ

Bộ đếm cho phiếu nhập kho, cùng cách với bài:

```javascript
db.counters.findOneAndUpdate(
  { _id: "receipt" },
  { $inc: { seq: 1 } },
  { upsert: true, returnDocument: "after" }
)
```

`upsert: true` tạo bộ đếm ở lần đầu; `returnDocument: "after"` trả số vừa cấp. Không có option này, lệnh trả tài liệu trước khi tăng.

## Thực hành

Làm ba bước: cấp số đơn tiếp theo, tạo bộ đếm hóa đơn bằng upsert, rồi thấy MongoDB từ chối một `_id` đã dùng. Bước 3 đạt khi lệnh **bị từ chối**.

# EN

## Key idea

MongoDB has no auto-increment type like SQL's `SERIAL` or `IDENTITY`. When you need consecutive numbers (order numbers, invoice numbers), the usual approach is a `counters` collection: each counter is one document, and each number handed out is one `findOneAndUpdate` with `$inc`.

An operation on one document is atomic, so increasing and returning in the same command never hands out a number twice. Reading first and writing after is two commands and can.

The cost: every number handed out writes to the same document. That is a hot document, which limits writes per second. If you only need a unique id, not a consecutive one, let MongoDB generate an `ObjectId`.

## Example

A counter for stock receipts, the same way as the lab:

```javascript
db.counters.findOneAndUpdate(
  { _id: "receipt" },
  { $inc: { seq: 1 } },
  { upsert: true, returnDocument: "after" }
)
```

`upsert: true` creates the counter the first time; `returnDocument: "after"` returns the number just handed out. Without that option the command returns the document before the increase.

## Practice

Do three steps: hand out the next order number, create the invoice counter with an upsert, then watch MongoDB refuse an `_id` that is already used. Step 3 passes when the command **is refused**.
