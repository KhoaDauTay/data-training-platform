---
id: e-bp-m10
engine: best
track: mongodb
level: L4
module: m
title: "Transaction nhiều tài liệu chỉ khi cần, và ngắn"
title_en: "Multi-document transactions: rare and short"
kind: quiz
minutes: 4
objectives:
  - vi: "Thiết kế để một thay đổi nằm trong một tài liệu (vốn atomic), và chỉ dùng transaction nhiều tài liệu khi thật sự phải, giữ nó ngắn và ít tài liệu."
    en: "Design so one change lives in one document (atomic already), and use a multi-document transaction only when you truly must, keeping it short and small."
avoid:
  vi: "Bọc hai lệnh sửa cùng một tài liệu trong transaction, giữ tài nguyên và gây xung đột ghi mà không được gì."
  en: "Wrapping two updates of the same document in a transaction, holding resources and causing write conflicts for nothing."
requires: [e-mg-l4-09]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/core/transactions/
  - https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
  - https://www.mongodb.com/docs/manual/core/write-operations-atomicity/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    session.withTransaction(async () => {
      await orders.updateOne({ _id: 1 }, { $set: { status: 'PAID' } }, { session })
      await orders.updateOne({ _id: 1 }, { $set: { paidAt: ISODate('2026-10-31T09:00:00Z') } }, { session })
    })
  good: |
    db.orders.updateOne({ _id: 1, status: 'PENDING' }, { $set: { status: 'PAID', paidAt: ISODate('2026-10-31T09:00:00Z') } })
  expect: null
quiz:
  - q:
      vi: "Bạn cần đổi `status` và thêm `paidAt` cho **một** đơn trong collection `orders`. Cách nào đúng?"
      en: "You need to change `status` and add `paidAt` on **one** order in the `orders` collection. Which way is right?"
    options:
      - { vi: "Một transaction bọc hai lệnh `updateOne`", en: "A transaction around two `updateOne` commands" }
      - { vi: "Một lệnh `updateOne` có cả hai trường trong `$set`", en: "One `updateOne` with both fields in its `$set`" }
      - { vi: "Hai lệnh `updateOne` riêng, không transaction", en: "Two separate `updateOne` commands, no transaction" }
    answer: 1
    why:
      vi: "Một lệnh ghi trên một tài liệu đã atomic, kể cả khi sửa nhiều trường. Transaction ở đây chỉ thêm chi phí; hai lệnh rời thì có lúc người khác thấy đơn `PAID` mà chưa có `paidAt`."
      en: "A write to one document is already atomic, even when it changes several fields. A transaction here only adds cost; two separate commands let someone briefly see a `PAID` order with no `paidAt`."
---

## Ý chính

Ưu tiên thiết kế để một thay đổi nằm trong **một** tài liệu: thao tác trên một tài liệu đã atomic. Chỉ dùng transaction nhiều tài liệu khi thật sự phải sửa nhiều tài liệu cùng lúc, và giữ nó ngắn, ít tài liệu, có xử lý lỗi để chạy lại.

## Vì sao

- Transaction tốn hơn thao tác đơn lẻ, giữ tài nguyên và dễ gây xung đột ghi.
- Mặc định transaction phải xong trong dưới một phút, quá hạn thì bị hủy.
- Cần transaction thường xuyên thường là dấu hiệu mô hình chưa khớp access pattern (xem thẻ embed).
- Thẻ này chỉ cú pháp: mingo không có phiên (session) hay transaction.

# EN

## Key idea

Prefer a design where one change lives in **one** document: an operation on a single document is already atomic. Use a multi-document transaction only when you really must change several documents together, and keep it short, small, and able to retry on error.

## Why

- A transaction costs more than a single operation, holds resources and invites write conflicts.
- By default a transaction must finish in under one minute, or it is aborted.
- Needing transactions often usually means the model does not fit the access pattern (see the embed card).
- This card is syntax only: mingo has no sessions or transactions.
