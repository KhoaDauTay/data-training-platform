---
id: e-mg-l4-07
engine: mongodb
level: L4
module: consistency
title: "Write concern và read concern"
title_en: "Write concern and read concern"
kind: concept
minutes: 14
runtime: docs
viz: mg-replica-election
figures: [{ name: mg-majority-psa, at: idea, variant: pss }]
objectives:
  - vi: "Đọc `w`, `j`, `wtimeout` và biết mỗi mức xác nhận điều gì"
    en: "Read `w`, `j`, `wtimeout` and know what each level acknowledges"
  - vi: "Chọn read concern `local`, `majority`, `linearizable` hay `snapshot`"
    en: "Choose read concern `local`, `majority`, `linearizable` or `snapshot`"
  - vi: "Đọc đúng một lỗi hết giờ của write concern"
    en: "Read a write concern timeout error correctly"
requires: []
sources:
  - { url: https://www.mongodb.com/docs/manual/reference/write-concern/, title_vi: "Write concern" }
  - { url: https://www.mongodb.com/docs/manual/reference/read-concern/, title_vi: "Read concern" }
quiz:
  - q:
      vi: "Replica set P-S-S, ghi với `{ w: 1 }`. Primary sập trước khi secondary nào chép được. Điều gì có thể xảy ra?"
      en: "A P-S-S replica set, a write with `{ w: 1 }`. The primary fails before any secondary copies it. What can happen?"
    options:
      - { vi: "Không gì cả, `w: 1` đã ghi xuống đĩa nên an toàn", en: "Nothing, `w: 1` is on disk so it is safe" }
      - { vi: "Lần ghi có thể bị rollback khi primary mới được bầu", en: "The write can be rolled back once a new primary is elected" }
      - { vi: "Client nhận lỗi và ghi lại tự động", en: "The client gets an error and writes again automatically" }
    answer: 1
    trap: 0
    why:
      vi: "Primary đã xác nhận nên nghe an toàn, nhưng `w: 1` chỉ chờ primary, nên lần ghi chỉ nằm trên primary cũ; hai secondary chưa có nó, và một trong hai được bầu làm primary mới. Khi primary cũ quay lại làm secondary, nó phải rollback (gỡ bỏ) mọi lần ghi mà primary mới không có, dù lần ghi đã nằm trên đĩa của nó. Client cũng không nhận lỗi nào để tự ghi lại: nó đã nhận \"OK\" từ trước. `w: \"majority\"` chờ 2 trong 3 thành viên ghi bền vào oplog, nên primary mới nào cũng đã có lần ghi đó."
      en: "The primary acknowledged it, so it sounds safe, but `w: 1` waits only for the primary, so the write lives only on the old primary; neither secondary has it, and one of them is elected the new primary. When the old primary comes back as a secondary, it must roll back (remove) every write the new primary lacks, even though the write is on its disk. Nor does the client get an error to retry on: it already received \"OK\". `w: \"majority\"` waits for 2 of the 3 members to durably write it to their oplog, so any new primary already has it."
  - q:
      vi: "Lần ghi `w: \"majority\"` với `wtimeout: 1000` trả lỗi hết giờ. Dữ liệu đã ghi trên primary thì sao?"
      en: "A `w: \"majority\"` write with `wtimeout: 1000` returns a timeout error. What about the data already written on the primary?"
    options:
      - { vi: "MongoDB hoàn tác nó", en: "MongoDB undoes it" }
      - { vi: "MongoDB không hoàn tác: lần ghi vẫn có thể đạt write concern sau đó", en: "MongoDB does not undo it: the write may still reach the write concern later" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì \"lỗi\" thường nghĩa là không có gì xảy ra, nhưng docs chính thức nói: quá `wtimeout`, MongoDB trả lỗi write concern mà không hoàn tác thay đổi đã thành công. Lỗi chỉ nói chưa xác nhận kịp; ghi lại mù quáng có thể tạo bản trùng."
      en: "It sounds right because an \"error\" usually means nothing happened, but the docs say that past `wtimeout`, MongoDB returns a write concern error without undoing the successful change. The error only says it was not confirmed in time; blindly writing again can create a duplicate."
---
## Mở bài

Ứng dụng thanh toán nhận "OK" từ MongoDB, rồi ba giây sau primary sập và khoản thanh toán biến mất. Không ai làm sai lệnh ghi: lệnh chỉ đòi quá ít xác nhận. Write concern và read concern là chỗ bạn nói mình cần chắc tới đâu.

## Ý chính

Write concern là mức xác nhận bạn đòi cho một lần ghi: `{ w, j, wtimeout }`. `w: 1` chỉ cần primary xác nhận; lần ghi có thể bị rollback nếu primary bước xuống trước khi chép sang secondary. `w: "majority"` chờ đa số thành viên mang dữ liệu có quyền bầu ghi bền vào oplog; với P-S-S, đa số là 2. Đây là mặc định ngầm của hầu hết hệ thống; ngoại lệ là hệ có arbiter mà số thành viên mang dữ liệu không vượt đa số phiếu, khi đó mặc định là `w: 1`. `j: true` đòi đã ghi vào journal trên đĩa.

`wtimeout` là giới hạn chờ. Quá giờ thì trả lỗi, nhưng không hoàn tác thay đổi: lần ghi vẫn có thể đạt write concern sau đó.

Read concern quyết định lần đọc thấy gì. `local`: dữ liệu của node, có thể bị rollback; mặc định cho đọc trên primary và secondary. `majority`: dữ liệu đa số đã xác nhận, bền kể cả khi primary sập. `linearizable`: phản ánh mọi lần ghi majority đã xong trước khi đọc bắt đầu; chỉ trên primary, bộ lọc phải trúng một tài liệu, nên kèm `maxTimeMS`. `snapshot`: dữ liệu majority tại một thời điểm, dùng trong transaction nhiều tài liệu.

Nhiều người nghĩ "OK" từ primary nghĩa là dữ liệu đã an toàn. Thật ra mức an toàn chính là mức bạn đòi: `w: 1` an toàn chừng nào primary còn giữ vai trò.

Bài này cần replica set thật, nên các lệnh dưới đây lấy theo docs chính thức, không chạy trong trình duyệt.

## Cú pháp

```text
{ writeConcern: { w: <number> | "majority", j: <boolean>, wtimeout: <ms> } }
db.<coll>.insertOne(<doc>, { writeConcern: { w: "majority", wtimeout: 5000 } })
db.<coll>.find(<filter>).readConcern("local" | "majority" | "linearizable")
session.startTransaction({ readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } })
```

- `w`: số node phải xác nhận, hoặc `"majority"`.
- `j: true`: xác nhận sau khi ghi journal.
- `wtimeout`: giới hạn chờ xác nhận, không hủy lần ghi.
- `readConcern`: `local`, `available`, `majority`, `linearizable`, `snapshot`.

## Ví dụ

Ghi một khoản thanh toán, chờ đa số xác nhận tối đa 5 giây:

```text
db.payments.insertOne(
  { orderId: 7, amount: 120 },
  { writeConcern: { w: "majority", wtimeout: 5000 } }
)
```

Đọc lại chỉ dữ liệu đã được đa số xác nhận:

```text
db.payments.find({ orderId: 7 }).readConcern("majority")
```

Lần đọc này không bao giờ trả một bản ghi sau đó bị rollback.

Đọc một tài liệu với bảo đảm mạnh nhất:

```text
db.accounts.find({ _id: "A-1" }).readConcern("linearizable").maxTimeMS(10000)
```

Chỉ chạy trên primary; `maxTimeMS` chặn trường hợp không có đa số để xác nhận.

## Lỗi hay gặp

Ghi tiền với `w: 1`:

```text
// WRONG: acknowledged by the primary only, can be rolled back
db.payments.insertOne({ orderId: 8, amount: 300 }, { writeConcern: { w: 1 } })
```

```text
// FIX: wait for a majority of voting members
db.payments.insertOne({ orderId: 8, amount: 300 }, { writeConcern: { w: "majority" } })
```

Hiểu lỗi hết giờ là "chưa ghi" rồi ghi lại:

```text
// WRONG: wtimeout fired, the app inserts the payment a second time
db.payments.insertOne({ orderId: 8, amount: 300 }, { writeConcern: { w: "majority", wtimeout: 1000 } })   // writeConcernError: timeout
db.payments.insertOne({ orderId: 8, amount: 300 })
```

```text
// FIX: the write may already exist; check or use an idempotent key before retrying
db.payments.updateOne({ orderId: 8 }, { $setOnInsert: { amount: 300 } }, { upsert: true, writeConcern: { w: "majority" } })
```

Lần ghi đầu không bị hoàn tác; nếu ghi lại bằng `insertOne` không có khóa duy nhất, khách bị trừ tiền hai lần.

## Tóm tắt

- Write concern = mức xác nhận: `w: 1` có thể rollback, `w: "majority"` bền khi primary sập.
- `wtimeout` chỉ giới hạn việc chờ; nó không hoàn tác lần ghi.
- Read concern `majority` chỉ thấy dữ liệu không bị rollback; `local` là mặc định.
- `linearizable` chỉ trên primary, cho một tài liệu, kèm `maxTimeMS`.

# EN

## Opening

A payments application gets "OK" from MongoDB, then three seconds later the primary fails and the payment is gone. Nobody wrote a bad command: it simply asked for too little acknowledgement. Write concern and read concern are where you say how sure you need to be.

## Key idea

Write concern is the acknowledgement you ask for on a write: `{ w, j, wtimeout }`. `w: 1` needs only the primary to acknowledge; the write can be rolled back if the primary steps down before it reaches a secondary. `w: "majority"` waits for a majority of data-bearing voting members to durably write it to their oplog; for P-S-S the majority is 2. This is the implicit default for most deployments; the exception is a set with arbiters where data-bearing members are not more than the voting majority, and then the default is `w: 1`. `j: true` asks for the write to be in the on-disk journal.

`wtimeout` is a time limit. Past it you get an error, but the change is not undone: the write may still reach the write concern later.

Read concern decides what a read can see. `local`: the node's data, which may be rolled back; the default for reads on the primary and on secondaries. `majority`: data acknowledged by a majority, durable even if the primary fails. `linearizable`: reflects every majority write completed before the read started; primary only, the filter must hit one document, and it should come with `maxTimeMS`. `snapshot`: majority data at one point in time, used in multi-document transactions.

Many people think an "OK" from the primary means the data is safe. In fact the safety is exactly what you asked for: `w: 1` is safe only as long as the primary keeps its role.

This lesson needs a real replica set, so the commands below follow the official docs and do not run in the browser.

## Syntax

```text
{ writeConcern: { w: <number> | "majority", j: <boolean>, wtimeout: <ms> } }
db.<coll>.insertOne(<doc>, { writeConcern: { w: "majority", wtimeout: 5000 } })
db.<coll>.find(<filter>).readConcern("local" | "majority" | "linearizable")
session.startTransaction({ readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } })
```

- `w`: how many nodes must acknowledge, or `"majority"`.
- `j: true`: acknowledge after the journal write.
- `wtimeout`: a limit on waiting for acknowledgement; it does not cancel the write.
- `readConcern`: `local`, `available`, `majority`, `linearizable`, `snapshot`.

## Example

Write a payment and wait up to 5 seconds for a majority to acknowledge:

```text
db.payments.insertOne(
  { orderId: 7, amount: 120 },
  { writeConcern: { w: "majority", wtimeout: 5000 } }
)
```

Read back only data a majority has acknowledged:

```text
db.payments.find({ orderId: 7 }).readConcern("majority")
```

This read never returns a record that is later rolled back.

Read one document with the strongest guarantee:

```text
db.accounts.find({ _id: "A-1" }).readConcern("linearizable").maxTimeMS(10000)
```

It runs on the primary only; `maxTimeMS` guards against the case where no majority is there to confirm.

## Common mistakes

Writing money with `w: 1`:

```text
// WRONG: acknowledged by the primary only, can be rolled back
db.payments.insertOne({ orderId: 8, amount: 300 }, { writeConcern: { w: 1 } })
```

```text
// FIX: wait for a majority of voting members
db.payments.insertOne({ orderId: 8, amount: 300 }, { writeConcern: { w: "majority" } })
```

Reading a timeout as "not written" and writing again:

```text
// WRONG: wtimeout fired, the app inserts the payment a second time
db.payments.insertOne({ orderId: 8, amount: 300 }, { writeConcern: { w: "majority", wtimeout: 1000 } })   // writeConcernError: timeout
db.payments.insertOne({ orderId: 8, amount: 300 })
```

```text
// FIX: the write may already exist; check or use an idempotent key before retrying
db.payments.updateOne({ orderId: 8 }, { $setOnInsert: { amount: 300 } }, { upsert: true, writeConcern: { w: "majority" } })
```

The first write is not undone; writing again with an `insertOne` and no unique key charges the customer twice.

## Recap

- Write concern = the acknowledgement level: `w: 1` can roll back, `w: "majority"` survives a primary failure.
- `wtimeout` only limits the wait; it does not undo the write.
- Read concern `majority` sees only data that will not roll back; `local` is the default.
- `linearizable` is primary only, for one document, with `maxTimeMS`.
