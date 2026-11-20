---
id: e-bp-d21
engine: best
track: dynamodb
level: L3
module: d
title: "Nhiều item phải đổi cùng nhau thì dùng transaction"
title_en: "Use a transaction when several items must change together"
kind: quiz
minutes: 4
objectives:
  - vi: "Ghi các item phải nhất quán với nhau trong một transaction (`TransactWriteItems` hoặc `ExecuteTransaction`), và chỉ dùng khi thật cần."
    en: "Write items that must stay consistent with each other in one transaction (`TransactWriteItems` or `ExecuteTransaction`), and only when needed."
avoid:
  vi: "Đơn thành `PAID` ở một item nhưng vẫn `PENDING` ở bản sao vì lệnh thứ hai hỏng."
  en: "An order that is `PAID` in one item but still `PENDING` in its copy because the second write failed."
requires: [e-dy-l4-11, e-dy-l4-13]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.multiplestatements.transactions.html
verified: { version: "dynoxide 1.5.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    {"op": "ExecuteStatement", "input": {"Statement": "UPDATE \"Shop\" SET \"status\" = 'PAID' WHERE \"pk\" = 'ORDER#100' AND \"sk\" = 'META'"}}
  good: |
    {"op": "ExecuteTransaction", "input": {"TransactStatements": [
      {"Statement": "UPDATE \"Shop\" SET \"status\" = 'PAID' WHERE \"pk\" = 'ORDER#100' AND \"sk\" = 'META' AND \"status\" = 'PENDING'"},
      {"Statement": "UPDATE \"Shop\" SET \"status\" = 'PAID' WHERE \"pk\" = 'CUST#7' AND \"sk\" = 'ORDER#2026-10-01#100' AND \"status\" = 'PENDING'"}
    ]}}
  expect: null
quiz:
  - q:
      vi: "Một transaction PartiQL gồm một `SELECT` và một `UPDATE` được không?"
      en: "Can one PartiQL transaction hold a `SELECT` and an `UPDATE`?"
    options:
      - { vi: "Được", en: "Yes" }
      - { vi: "Không: cả transaction phải toàn câu đọc hoặc toàn câu ghi", en: "No: the whole transaction must be all reads or all writes" }
      - { vi: "Được, tối đa 25 câu", en: "Yes, up to 25 statements" }
    answer: 1
    why:
      vi: "Docs: transaction PartiQL phải toàn câu đọc hoặc toàn câu ghi, tối đa 100 câu. Mỗi item trong transaction tính hai lần đọc hoặc ghi bên dưới, nên chỉ dùng khi nhiều item thật sự phải đổi cùng nhau."
      en: "The docs: a PartiQL transaction must be all reads or all writes, at most 100 statements. Each item in a transaction costs two underlying reads or writes, so use one only when several items truly must change together."
---

## Ý chính

Khi nhiều item phải nhất quán (đơn và bản sao của nó trong item collection của khách, chuyển tiền giữa hai tài khoản), ghi chúng trong một transaction: `TransactWriteItems` hoặc PartiQL `ExecuteTransaction`. Một item thì không cần transaction.

## Vì sao

- Hai `UpdateItem` riêng lẻ có thể thành công một nửa.
- Transaction hủy cả nhóm khi một điều kiện sai (`TransactionCanceledException`), không ghi gì.
- Transaction tốn gấp đôi mỗi item.

## Ví dụ

Thẻ chỉ cú pháp: ở đây bản Nên **đúng** khi báo lỗi, mà khung "Chạy cả hai" chỉ coi bản Không nên là bản được báo lỗi. Đã chạy trên dynoxide 1.5.0: bản Nên trả `TransactionCanceledException` với lý do `[None, ConditionalCheckFailed]`, và `ORDER#100` vẫn `PENDING`; bản Không nên đổi `ORDER#100` thành `PAID` một mình. dynoxide chưa có `TransactWriteItems`, nên ví dụ dùng PartiQL.

# EN

## Key idea

When several items must stay consistent (an order and its copy in the customer's item collection, a transfer between two accounts), write them in one transaction: `TransactWriteItems` or PartiQL `ExecuteTransaction`. A single item needs no transaction.

## Why

- Two separate `UpdateItem` calls can half succeed.
- A transaction cancels the whole group when one condition is false (`TransactionCanceledException`), writing nothing.
- A transaction costs twice as much per item.

## Example

Syntax only: here the Prefer version is **right** when it fails, while the "Run both" panel only treats the Avoid version as the one that may fail. Run on dynoxide 1.5.0: Prefer returns `TransactionCanceledException` with reasons `[None, ConditionalCheckFailed]`, and `ORDER#100` stays `PENDING`; Avoid turns `ORDER#100` into `PAID` on its own. dynoxide has no `TransactWriteItems` yet, so the example uses PartiQL.
