---
id: e-mg-l4-09
engine: mongodb
level: L4
module: consistency
title: "Transaction nhiều tài liệu"
title_en: "Multi-document transactions"
kind: concept
minutes: 12
runtime: docs
objectives:
  - vi: "Biết thao tác trên một tài liệu luôn atomic"
    en: "Know that an operation on one document is always atomic"
  - vi: "Biết khi nào cần transaction nhiều tài liệu và các giới hạn của nó"
    en: "Know when a multi-document transaction is needed and its limits"
  - vi: "Viết mọi lệnh của transaction qua đúng session"
    en: "Send every command of a transaction through its session"
requires: [e-mg-l4-07]
sources:
  - https://www.mongodb.com/docs/manual/core/transactions/
  - https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
quiz:
  - q:
      vi: "Một đơn hàng và các dòng của nó nằm trong cùng một tài liệu. Cập nhật tổng tiền và thêm một dòng trong một lệnh `updateOne`. Có cần transaction không?"
      en: "An order and its lines live in one document. One `updateOne` updates the total and adds a line. Is a transaction needed?"
    options:
      - { vi: "Có, vì hai trường cùng đổi", en: "Yes, because two fields change together" }
      - { vi: "Không, thao tác trên một tài liệu là atomic", en: "No, an operation on one document is atomic" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì hai trường cùng đổi, như hai câu UPDATE trong SQL. Nhưng docs chính thức nói thao tác trên một tài liệu là atomic, nên một `updateOne` đã đủ. Transaction nhiều tài liệu tốn hơn ghi một tài liệu; nhúng dữ liệu liên quan vào một tài liệu giảm nhu cầu dùng nó."
      en: "It sounds right because two fields change, like two UPDATE statements in SQL. But the docs say an operation on a single document is atomic, so one `updateOne` is enough. A multi-document transaction costs more than a single-document write; embedding related data in one document reduces the need for it."
  - q:
      vi: "Một transaction chạy quá lâu với cấu hình mặc định. Điều gì xảy ra?"
      en: "A transaction runs too long with the default settings. What happens?"
    options:
      - { vi: "Nó chạy tiếp cho tới khi commit", en: "It keeps running until commit" }
      - { vi: "Quá một phút thì nó bị coi là hết hạn và bị hủy", en: "After one minute it is considered expired and aborted" }
    answer: 1
    why:
      vi: "Mặc định transaction phải chạy dưới một phút (`transactionLifetimeLimitSeconds`); quá hạn thì một tiến trình dọn định kỳ hủy nó."
      en: "By default a transaction must run for less than one minute (`transactionLifetimeLimitSeconds`); an expired one is aborted by a periodic cleanup."
---
## Mở bài

Chuyển 100 điểm thưởng từ ví An sang ví Bình là hai tài liệu khác nhau. Nếu máy chủ sập giữa hai lệnh ghi, 100 điểm biến mất. Đây là chỗ cần transaction, và cũng là chỗ nên hỏi: có cách thiết kế nào không cần nó?

## Ý chính

Trong MongoDB, thao tác trên một tài liệu là atomic, kể cả khi nó đổi nhiều trường hay mảng nhúng. Khi cần atomic trên nhiều tài liệu (nhiều collection, nhiều shard), dùng transaction nhiều tài liệu. Docs chính thức nhấn mạnh: transaction tốn hơn ghi một tài liệu và không thay thế cho thiết kế schema tốt.

Giới hạn chính: cần replica set hoặc sharded cluster (standalone không có transaction); mặc định phải xong dưới một phút (`transactionLifetimeLimitSeconds`); read concern và write concern đặt ở mức transaction, và đọc `snapshot` chỉ được bảo đảm khi commit với `w: "majority"`. Transaction chờ tối đa 5 ms để lấy lock, không được thì hủy; một lệnh ghi ngoài transaction đổi tài liệu mà transaction sắp đổi làm transaction hủy vì write conflict. Lỗi như vậy mang nhãn `TransientTransactionError`, và cách xử lý đúng là chạy lại cả transaction; `session.withTransaction()` làm việc đó giúp bạn.

Nhiều người nghĩ cứ bọc mọi lệnh ghi vào transaction cho an toàn. Thật ra một lệnh trên một tài liệu đã atomic; transaction thêm chi phí, giữ lock lâu hơn và dễ xung đột hơn. Mỗi lệnh muốn nằm trong transaction phải đi qua collection lấy từ session, không phải `db` thường.

Mingo trong trình duyệt không có session hay transaction, nên các lệnh dưới đây lấy theo docs.

## Cú pháp

```text
session = db.getMongo().startSession()
session.startTransaction({ readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } })
coll = session.getDatabase("<db>").<coll>      // commands on coll join the transaction
coll.updateOne(...)
session.commitTransaction()                    // or session.abortTransaction()
session.withTransaction(async () => { ... })   // driver API: retries TransientTransactionError
```

- `startTransaction`: mở transaction trên session, kèm read và write concern.
- Chỉ lệnh qua collection của session mới thuộc transaction.
- `commitTransaction` / `abortTransaction`: kết thúc; không commit thì mọi thay đổi bị bỏ.

## Ví dụ

Chuyển điểm giữa hai ví trong một transaction:

```text
s = db.getMongo().startSession()
s.startTransaction({ readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } })
w = s.getDatabase("shop").wallets
w.updateOne({ _id: "an", points: { $gte: 100 } }, { $inc: { points: -100 } })
w.updateOne({ _id: "binh" }, { $inc: { points: 100 } })
s.commitTransaction()
```

Nếu có lỗi giữa chừng, `s.abortTransaction()` bỏ cả hai thay đổi.

Cùng nhu cầu nhưng dữ liệu nằm trong một tài liệu, không cần transaction:

```text
db.orders.updateOne({ _id: 7 }, { $push: { lines: { sku: "A", qty: 1, price: 12.5 } }, $inc: { total: 12.5 } })
```

Một lệnh, một tài liệu: thêm dòng và sửa tổng cùng thành công hoặc cùng không.

## Lỗi hay gặp

Ghi bằng `db` thường giữa một transaction:

```text
// WRONG: the second write goes through db, not the session; it commits on its own
w.updateOne({ _id: "an" }, { $inc: { points: -100 } })
db.wallets.updateOne({ _id: "binh" }, { $inc: { points: 100 } })
```

```text
// FIX: both writes through the session's collection
w.updateOne({ _id: "an" }, { $inc: { points: -100 } })
w.updateOne({ _id: "binh" }, { $inc: { points: 100 } })
```

Nếu transaction bị hủy, ví An được hoàn lại nhưng Bình vẫn giữ 100 điểm: điểm sinh ra từ hư không.

Dùng transaction cho việc một tài liệu đã làm được:

```text
// WRONG: a transaction around a single-document update
s.startTransaction(); o.updateOne({ _id: 7 }, { $inc: { total: 12.5 } }); s.commitTransaction()
```

```text
// FIX: one update on one document is already atomic
db.orders.updateOne({ _id: 7 }, { $inc: { total: 12.5 } })
```

## Tóm tắt

- Một lệnh trên một tài liệu luôn atomic; nhúng dữ liệu liên quan để khỏi cần transaction.
- Transaction cần replica set hoặc sharded cluster và mặc định phải xong dưới một phút.
- Chỉ lệnh qua collection của session mới thuộc transaction.
- `TransientTransactionError` thì chạy lại cả transaction; `withTransaction` làm việc đó.

# EN

## Opening

Moving 100 reward points from An's wallet to Binh's touches two different documents. If the server fails between the two writes, 100 points vanish. This is where a transaction is needed, and also where you should ask: is there a design that does not need one?

## Key idea

In MongoDB an operation on a single document is atomic, even when it changes several fields or embedded arrays. When you need atomicity across documents (several collections, several shards), use a multi-document transaction. The docs stress that a transaction costs more than a single-document write and does not replace good schema design.

The main limits: it needs a replica set or a sharded cluster (a standalone has no transactions); by default it must finish in under one minute (`transactionLifetimeLimitSeconds`); read concern and write concern are set at the transaction level, and a `snapshot` read is guaranteed only when the commit uses `w: "majority"`. A transaction waits at most 5 ms for its locks, otherwise it aborts; a write outside the transaction that changes a document the transaction will change makes the transaction abort with a write conflict. Such errors carry the `TransientTransactionError` label, and the right handling is to run the whole transaction again; `session.withTransaction()` does that for you.

Many people think every write should be wrapped in a transaction to be safe. In fact one command on one document is already atomic; a transaction adds cost, holds locks longer and conflicts more easily. Every command meant to be inside the transaction must go through a collection taken from the session, not the plain `db`.

Mingo in the browser has no sessions or transactions, so the commands below follow the docs.

## Syntax

```text
session = db.getMongo().startSession()
session.startTransaction({ readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } })
coll = session.getDatabase("<db>").<coll>      // commands on coll join the transaction
coll.updateOne(...)
session.commitTransaction()                    // or session.abortTransaction()
session.withTransaction(async () => { ... })   // driver API: retries TransientTransactionError
```

- `startTransaction`: opens a transaction on the session, with read and write concern.
- Only commands through the session's collection belong to the transaction.
- `commitTransaction` / `abortTransaction`: end it; without a commit every change is dropped.

## Example

Moving points between two wallets in one transaction:

```text
s = db.getMongo().startSession()
s.startTransaction({ readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } })
w = s.getDatabase("shop").wallets
w.updateOne({ _id: "an", points: { $gte: 100 } }, { $inc: { points: -100 } })
w.updateOne({ _id: "binh" }, { $inc: { points: 100 } })
s.commitTransaction()
```

If something fails halfway, `s.abortTransaction()` drops both changes.

The same need with the data in one document, no transaction needed:

```text
db.orders.updateOne({ _id: 7 }, { $push: { lines: { sku: "A", qty: 1, price: 12.5 } }, $inc: { total: 12.5 } })
```

One command, one document: the new line and the new total succeed or fail together.

## Common mistakes

Writing through the plain `db` in the middle of a transaction:

```text
// WRONG: the second write goes through db, not the session; it commits on its own
w.updateOne({ _id: "an" }, { $inc: { points: -100 } })
db.wallets.updateOne({ _id: "binh" }, { $inc: { points: 100 } })
```

```text
// FIX: both writes through the session's collection
w.updateOne({ _id: "an" }, { $inc: { points: -100 } })
w.updateOne({ _id: "binh" }, { $inc: { points: 100 } })
```

If the transaction aborts, An's wallet gets its points back but Binh keeps the 100: points made out of thin air.

Using a transaction for what one document already does:

```text
// WRONG: a transaction around a single-document update
s.startTransaction(); o.updateOne({ _id: 7 }, { $inc: { total: 12.5 } }); s.commitTransaction()
```

```text
// FIX: one update on one document is already atomic
db.orders.updateOne({ _id: 7 }, { $inc: { total: 12.5 } })
```

## Recap

- One command on one document is always atomic; embed related data to avoid needing a transaction.
- A transaction needs a replica set or a sharded cluster and by default must finish in under one minute.
- Only commands through the session's collection belong to the transaction.
- On `TransientTransactionError`, run the whole transaction again; `withTransaction` does that.
