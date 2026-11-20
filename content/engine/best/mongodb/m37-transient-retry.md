---
id: e-bp-m37
engine: best
track: mongodb
level: L4
module: m
title: "Transaction gặp TransientTransactionError: chạy lại cả transaction"
title_en: "Retry the whole transaction on transient errors"
kind: quiz
minutes: 3
objectives:
  - vi: "Dùng callback API (`withTransaction`) để tự chạy lại cả transaction khi gặp `TransientTransactionError` và chạy lại lệnh commit khi gặp `UnknownTransactionCommitResult`; với core API thì tự viết hai vòng lặp đó."
    en: "Use the callback API (`withTransaction`) so the whole transaction is retried on `TransientTransactionError` and the commit is retried on `UnknownTransactionCommitResult`; with the core API, write those two loops yourself."
avoid:
  vi: "Hai transaction cùng sửa một tài liệu, một bên bị hủy, và việc của bên đó mất luôn."
  en: "Two transactions changing one document, one of them aborted, and its work simply lost."
requires: [e-mg-l5-02, e-mg-l4-09]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/core/transactions-in-applications/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    s.startTransaction()
    orders.updateOne({ _id: 9 }, { $set: { status: 'PAID' } })
    s.commitTransaction()
  good: |
    s.withTransaction(() => {
      orders.updateOne({ _id: 9 }, { $set: { status: 'PAID' } })
    })
  expect: null
quiz:
  - q:
      vi: "Callback API `withTransaction` xử lý `TransientTransactionError` thế nào?"
      en: "How does the callback API `withTransaction` handle a `TransientTransactionError`?"
    options:
      - { vi: "Bỏ qua lỗi và commit phần đã làm", en: "It ignores the error and commits what was done" }
      - { vi: "Chạy lại cả transaction", en: "It retries the whole transaction" }
      - { vi: "Chỉ chạy lại lệnh cuối cùng", en: "It retries only the last command" }
    answer: 1
    why:
      vi: "Docs: callback API chạy lại cả transaction khi gặp `TransientTransactionError`, và chỉ chạy lại commit khi gặp `UnknownTransactionCommitResult`. Core API không có logic này, bạn phải tự viết."
      en: "The docs: the callback API retries the whole transaction on `TransientTransactionError`, and retries only the commit on `UnknownTransactionCommitResult`. The core API has no such logic; you write it yourself."
---

## Ý chính

Dùng callback API (`session.withTransaction`): nó tự chạy lại cả transaction khi gặp `TransientTransactionError` (ví dụ xung đột ghi) và chạy lại riêng lệnh commit khi gặp `UnknownTransactionCommitResult`. Dùng core API thì phải tự viết đúng hai vòng lặp đó.

## Vì sao

- Hai transaction cùng sửa một tài liệu thì một bên bị hủy vì xung đột ghi.
- Không chạy lại là mất việc; chạy lại sai chỗ (chỉ lệnh cuối) là nửa transaction.
- Giữ transaction ngắn để ít xung đột và mỗi lần chạy lại rẻ.
- Thẻ này chỉ cú pháp: transaction cần replica set, mingo không có.

# EN

## Key idea

Use the callback API (`session.withTransaction`): it retries the whole transaction on `TransientTransactionError` (a write conflict, for example) and retries just the commit on `UnknownTransactionCommitResult`. With the core API you must write exactly those two loops yourself.

## Why

- When two transactions change one document, one of them is aborted with a write conflict.
- Not retrying loses the work; retrying the wrong part (only the last command) leaves half a transaction.
- Keep transactions short so conflicts are rare and each retry is cheap.
- This card is syntax only: transactions need a replica set, which mingo does not have.
