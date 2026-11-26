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
    trap: 0
    why:
      vi: "Lo trùng số là tự nhiên, nhưng `findOneAndUpdate` với `$inc` tăng và trả về trong một thao tác atomic trên một tài liệu, nên hai đơn không bao giờ nhận cùng số. Giới hạn 16 MiB cũng không đáng lo: bộ đếm chỉ có `_id` và một số `seq`, tăng bao nhiêu lần cũng vẫn vài chục byte. Cái giá thật là 2.000 lần ghi mỗi giây cùng chạm một tài liệu nóng, nên chúng phải xếp hàng lần lượt. Khi không cần số liền nhau, `_id` kiểu `ObjectId` tránh được tài liệu nóng này."
      en: "Worrying about duplicates is natural, but `findOneAndUpdate` with `$inc` increases and returns in one atomic operation on one document, so two orders never get the same number. The 16 MiB limit is no worry either: the counter holds only `_id` and one `seq` number, a few dozen bytes however often it grows. The real cost is that 2,000 writes a second all touch one hot document, so they queue and take turns. When numbers need not be consecutive, an `ObjectId` `_id` avoids this hot document."
  - q:
      vi: "`db.counters.findOneAndUpdate({ _id: \"order\" }, { $inc: { seq: 1 } })` chạy khi `seq` đang là 1042. Lệnh trả `seq` bằng mấy?"
      en: "`db.counters.findOneAndUpdate({ _id: \"order\" }, { $inc: { seq: 1 } })` runs while `seq` is 1042. What `seq` does the command return?"
    options:
      - { vi: "1043, số vừa cấp", en: "1043, the number just handed out" }
      - { vi: "1042, tài liệu trước khi tăng; trên đĩa đã là 1043", en: "1042, the document before the increase; on disk it is already 1043" }
      - { vi: "Không trả gì, chỉ báo số tài liệu đã sửa", en: "Nothing, only how many documents changed" }
    answer: 1
    trap: 0
    why:
      vi: "Lệnh vừa tăng nên 1043 nghe hợp lý, nhưng mặc định `findOneAndUpdate` trả tài liệu trước khi sửa: `seq` là 1042, dù trên đĩa đã là 1043. Dùng 1042 làm số đơn là cấp lại số của đơn `1042` đã có. Lệnh cũng có trả tài liệu: chỉ `updateOne` mới trả số tài liệu khớp và đã sửa. Muốn nhận 1043 thì thêm `returnDocument: \"after\"`."
      en: "The command just increased it, so 1043 sounds right, but by default `findOneAndUpdate` returns the document before the change: `seq` is 1042, even though on disk it is already 1043. Using 1042 as the order number hands out the number of the existing order `1042` again. The command does return a document: it is `updateOne` that returns only the matched and modified counts. To get 1043, add `returnDocument: \"after\"`."
---
## Mở bài

Kế toán muốn số đơn liền nhau: 1041, 1042, 1043, không trùng, không nhảy. MongoDB không có cột tự tăng như SQL. Làm sao hai máy chủ ứng dụng cùng cấp số mà không bao giờ cấp trùng?

## Ý chính

MongoDB không có kiểu tự tăng như `SERIAL` hay `IDENTITY` của SQL. Khi cần số liền nhau (số đơn, số hóa đơn), cách thường dùng là một collection `counters`: mỗi bộ đếm là một tài liệu, và mỗi lần cấp số là một lệnh `findOneAndUpdate` với `$inc`. Thao tác trên một tài liệu là atomic, nên tăng và trả về trong cùng một lệnh không bao giờ cấp trùng số. Đọc trước rồi ghi sau là hai lệnh, và hai máy cùng đọc 1042 sẽ cùng cấp 1043.

Mặc định `findOneAndUpdate` trả tài liệu **trước** khi sửa; muốn số vừa cấp thì thêm `returnDocument: "after"`. Bộ đếm chưa có thì `upsert: true` tạo nó, và `$inc` trên trường chưa có coi giá trị cũ là 0.

Nhiều người nghĩ rủi ro lớn nhất của bộ đếm là cấp trùng số. Thật ra `$inc` trên một tài liệu đã chặn chuyện đó; cái giá thật là mọi lần cấp số cùng ghi vào một tài liệu nóng, nên chúng phải lần lượt. Nếu chỉ cần mã duy nhất, không cần liền nhau, để MongoDB sinh `ObjectId`.

Lab chạy bằng mingo trong trình duyệt; mỗi lần chạy bắt đầu lại từ dữ liệu gốc (bộ đếm `order` ở 1042).

## Cú pháp

```text
db.counters.findOneAndUpdate(
  { _id: "<counter name>" },
  { $inc: { seq: 1 } },
  { upsert: <boolean>, returnDocument: "before" | "after" }
)
```

- `$inc`: cộng vào trường; trường chưa có coi là 0.
- `upsert: true`: tạo bộ đếm khi chưa có.
- `returnDocument`: `"before"` là mặc định; `"after"` trả số vừa cấp.

## Ví dụ

Bộ đếm cho phiếu nhập kho, tạo ở lần đầu:

```javascript
db.counters.findOneAndUpdate({ _id: "receipt" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" })
```

Trả `{ _id: "receipt", seq: 1 }`: chưa có bộ đếm nên upsert tạo nó từ `_id` của bộ lọc.

Cấp hai số một lúc cho một lô hai đơn:

```javascript
db.counters.findOneAndUpdate({ _id: "order" }, { $inc: { seq: 2 } }, { returnDocument: "after" })
```

Trả `seq: 1044`: lô này dùng 1043 và 1044, và không ai khác nhận được hai số đó.

Khi không cần số liền nhau, đừng cấp số:

```javascript
db.orders.insertOne({ customer: "c09", total: 50000 })
```

MongoDB tự sinh `_id` kiểu `ObjectId`; không có tài liệu nóng nào phải ghi.

## Lỗi hay gặp

Quên `returnDocument` và dùng số cũ:

```javascript
// WRONG: returns the counter before the increase (1042, already used)
db.counters.findOneAndUpdate({ _id: "order" }, { $inc: { seq: 1 } })
```

```javascript
// FIX: return the number just handed out
db.counters.findOneAndUpdate({ _id: "order" }, { $inc: { seq: 1 } }, { returnDocument: "after" })
```

Quên upsert với bộ đếm chưa có:

```javascript
// WRONG: no invoice counter yet, nothing matches, nothing is returned
db.counters.findOneAndUpdate({ _id: "invoice" }, { $inc: { seq: 1 } }, { returnDocument: "after" })
```

```javascript
// FIX: create it on first use
db.counters.findOneAndUpdate({ _id: "invoice" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" })
```

Dùng lại một số đã cấp:

```javascript
// ERROR duplicate_key
db.orders.insertOne({ _id: 1041, customer: "c09", total: 50000 })
```

Index duy nhất trên `_id` là lưới an toàn cuối cùng: lỗi E11000 tốt hơn hai đơn cùng số.

## Thực hành

Làm ba bước: cấp số đơn tiếp theo, tạo bộ đếm hóa đơn bằng upsert, rồi thấy MongoDB từ chối một `_id` đã dùng. Bước 3 đạt khi lệnh **bị từ chối**.

## Tóm tắt

- MongoDB không có tự tăng; dùng collection `counters` và `findOneAndUpdate` với `$inc`.
- Tăng và trả về trong một lệnh thì không trùng; đọc rồi ghi hai lệnh thì có thể trùng.
- Mặc định trả tài liệu trước khi sửa: thêm `returnDocument: "after"`, và `upsert: true` cho lần đầu.
- Bộ đếm là một tài liệu nóng; không cần số liền nhau thì dùng `ObjectId`.

# EN

## Opening

Accounting wants consecutive order numbers: 1041, 1042, 1043, no repeats, no gaps. MongoDB has no auto-increment column like SQL. How can two application servers hand out numbers at the same time and never hand out the same one?

## Key idea

MongoDB has no auto-increment type like SQL's `SERIAL` or `IDENTITY`. When you need consecutive numbers (order numbers, invoice numbers), the usual approach is a `counters` collection: each counter is one document, and each number handed out is one `findOneAndUpdate` with `$inc`. An operation on one document is atomic, so increasing and returning in the same command never hands out a number twice. Reading first and writing after is two commands, and two servers that both read 1042 both hand out 1043.

By default `findOneAndUpdate` returns the document **before** the change; for the number just handed out, add `returnDocument: "after"`. If the counter does not exist yet, `upsert: true` creates it, and `$inc` on a missing field treats the old value as 0.

Many people think the biggest risk of a counter is handing out a duplicate. In fact `$inc` on one document already prevents that; the real cost is that every number handed out writes to one hot document, so the writes take turns. If you only need a unique id, not a consecutive one, let MongoDB generate an `ObjectId`.

The lab runs on mingo in the browser; every run starts again from the original data (the `order` counter at 1042).

## Syntax

```text
db.counters.findOneAndUpdate(
  { _id: "<counter name>" },
  { $inc: { seq: 1 } },
  { upsert: <boolean>, returnDocument: "before" | "after" }
)
```

- `$inc`: adds to a field; a missing field counts as 0.
- `upsert: true`: creates the counter when it is missing.
- `returnDocument`: `"before"` is the default; `"after"` returns the number just handed out.

## Example

A counter for stock receipts, created on first use:

```javascript
db.counters.findOneAndUpdate({ _id: "receipt" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" })
```

It returns `{ _id: "receipt", seq: 1 }`: there was no counter, so the upsert built one from the filter's `_id`.

Handing out two numbers at once for a batch of two orders:

```javascript
db.counters.findOneAndUpdate({ _id: "order" }, { $inc: { seq: 2 } }, { returnDocument: "after" })
```

It returns `seq: 1044`: this batch uses 1043 and 1044, and nobody else can get those two numbers.

When numbers need not be consecutive, do not hand out numbers:

```javascript
db.orders.insertOne({ customer: "c09", total: 50000 })
```

MongoDB generates an `ObjectId` `_id`; there is no hot document to write.

## Common mistakes

Forgetting `returnDocument` and using the old number:

```javascript
// WRONG: returns the counter before the increase (1042, already used)
db.counters.findOneAndUpdate({ _id: "order" }, { $inc: { seq: 1 } })
```

```javascript
// FIX: return the number just handed out
db.counters.findOneAndUpdate({ _id: "order" }, { $inc: { seq: 1 } }, { returnDocument: "after" })
```

Forgetting the upsert for a counter that does not exist yet:

```javascript
// WRONG: no invoice counter yet, nothing matches, nothing is returned
db.counters.findOneAndUpdate({ _id: "invoice" }, { $inc: { seq: 1 } }, { returnDocument: "after" })
```

```javascript
// FIX: create it on first use
db.counters.findOneAndUpdate({ _id: "invoice" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" })
```

Reusing a number that was already handed out:

```javascript
// ERROR duplicate_key
db.orders.insertOne({ _id: 1041, customer: "c09", total: 50000 })
```

The unique index on `_id` is the last safety net: an E11000 error beats two orders with the same number.

## Practice

Do three steps: hand out the next order number, create the invoice counter with an upsert, then watch MongoDB refuse an `_id` that is already used. Step 3 passes when the command **is refused**.

## Recap

- MongoDB has no auto-increment; use a `counters` collection and `findOneAndUpdate` with `$inc`.
- Increasing and returning in one command never repeats; a read then a write in two commands can.
- It returns the document before the change by default: add `returnDocument: "after"`, and `upsert: true` for the first use.
- A counter is one hot document; when numbers need not be consecutive, use an `ObjectId`.
