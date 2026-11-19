---
id: e-mg-l4-09
engine: mongodb
level: L4
module: consistency
title: "Transaction đa tài liệu"
title_en: "Multi-document transactions"
kind: concept
minutes: 10
runtime: docs
objectives:
  - vi: "Biết thao tác trên một tài liệu luôn atomic"
    en: "Know that an operation on one document is always atomic"
  - vi: "Biết khi nào cần transaction đa tài liệu và các giới hạn của nó"
    en: "Know when a multi-document transaction is needed and its limits"
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
    why:
      vi: "Tài liệu: thao tác trên một tài liệu là atomic. Nhúng dữ liệu liên quan vào một tài liệu giảm nhu cầu transaction đa tài liệu."
      en: "The docs: an operation on a single document is atomic. Embedding related data in one document reduces the need for multi-document transactions."
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

## Ý chính

Trong MongoDB, thao tác trên một tài liệu là atomic. Khi cần atomic trên nhiều tài liệu (nhiều collection, nhiều shard), dùng transaction đa tài liệu. Tài liệu nhấn mạnh: transaction tốn hơn ghi một tài liệu và không thay thế cho thiết kế schema tốt.

- Cần replica set (FCV từ 4.0) hoặc sharded cluster (từ 4.2). Standalone không có transaction.
- Mặc định phải xong trong dưới một phút (`transactionLifetimeLimitSeconds`).
- Mỗi mục oplog của transaction vẫn phải dưới 16 MB (giới hạn tài liệu BSON).
- Read concern và write concern đặt ở mức transaction. Đọc `snapshot` chỉ bảo đảm khi commit với `w: "majority"`.
- Transaction chờ tối đa 5 ms để lấy khóa, không được thì hủy. Ghi ngoài transaction đụng tài liệu transaction sắp sửa làm transaction hủy vì write conflict.

## Ví dụ

```javascript
session = db.getMongo().startSession( { readPreference: { mode: "primary" } } )
session.startTransaction( { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } } )
session.commitTransaction()
```

Đúng với tài liệu MongoDB hiện hành, kiểm ngày 2026-11-20. Trình duyệt không chạy transaction thật: mingo không có transaction.

# EN

## Key idea

In MongoDB an operation on a single document is atomic. When you need atomicity across documents (several collections, several shards), use a multi-document transaction. The docs stress that a transaction costs more than a single-document write and does not replace good schema design.

- Needs a replica set (FCV 4.0 or later) or a sharded cluster (4.2 or later). A standalone has no transactions.
- By default it must finish in under one minute (`transactionLifetimeLimitSeconds`).
- Each oplog entry of the transaction must still be under 16 MB (the BSON document limit).
- Read concern and write concern are set at the transaction level. A `snapshot` read is guaranteed only when the commit uses `w: "majority"`.
- A transaction waits at most 5 ms for its locks, otherwise it aborts. A write outside the transaction that touches a document the transaction will modify makes the transaction abort with a write conflict.

## Example

```javascript
session = db.getMongo().startSession( { readPreference: { mode: "primary" } } )
session.startTransaction( { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } } )
session.commitTransaction()
```

Matches the current MongoDB manual, checked 2026-11-20. The browser runs no real transaction: mingo has none.
