---
id: e-bp-m34
engine: best
track: mongodb
level: L4
module: m
title: "Đọc ngay sau ghi trên secondary: causally consistent session với majority"
title_en: "Read your writes with a causal session"
kind: quiz
minutes: 4
objectives:
  - vi: "Khi một luồng ghi rồi đọc lại (có thể từ secondary), dùng một session `causalConsistency: true` với read concern và write concern đều `majority`."
    en: "When one flow writes and then reads back (maybe from a secondary), use a `causalConsistency: true` session with both read concern and write concern `majority`."
avoid:
  vi: "Khách vừa đặt đơn, mở trang \"đơn của tôi\" lại không thấy đơn đó."
  en: "A customer places an order, opens \"my orders\" and does not see it."
requires: [e-mg-l4-08]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/core/causal-consistency-read-write-concerns/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.orders.insertOne({ _id: 9, status: 'NEW' })
    db.getMongo().setReadPref('secondary')
    db.orders.findOne({ _id: 9 })
  good: |
    const s = db.getMongo().startSession({ causalConsistency: true })
    const o = s.getDatabase('shop').orders.withOptions({ readConcern: { level: 'majority' }, writeConcern: { w: 'majority' }, readPreference: 'secondary' })
    o.insertOne({ _id: 9, status: 'NEW' })
    o.findOne({ _id: 9 })
  expect: null
quiz:
  - q:
      vi: "Trong causally consistent session, tổ hợp read concern và write concern nào cho đủ bốn đảm bảo (đọc lại được lần ghi của mình, đọc đơn điệu, ghi đơn điệu, ghi theo sau đọc)?"
      en: "In a causally consistent session, which read concern and write concern pair gives all four guarantees (read your own writes, monotonic reads, monotonic writes, writes follow reads)?"
    options:
      - { vi: "`local` và `{ w: 1 }`", en: "`local` and `{ w: 1 }`" }
      - { vi: "`majority` và `{ w: 1 }`", en: "`majority` and `{ w: 1 }`" }
      - { vi: "`majority` và `majority`", en: "`majority` and `majority`" }
    answer: 2
    why:
      vi: "Bảng trong docs: chỉ `majority` + `majority` có đủ bốn đảm bảo. `majority` + `{ w: 1 }` mất hai; `local` + `{ w: 1 }` không có cái nào."
      en: "The table in the docs: only `majority` + `majority` has all four guarantees. `majority` + `{ w: 1 }` loses two; `local` + `{ w: 1 }` has none."
---

## Ý chính

Một luồng ghi rồi đọc lại, có thể đọc từ secondary: dùng một session `causalConsistency: true`, đặt read concern và write concern đều là `majority`, và làm cả ghi lẫn đọc trong session đó.

## Vì sao

- Secondary có thể chưa nhận lần ghi vừa xong, nên đọc ngoài session có thể không thấy nó.
- Docs: muốn nhất quán nhân quả mà dữ liệu vẫn bền, chỉ tổ hợp read concern và write concern đều `majority` giữ đủ các đảm bảo.
- Thẻ này chỉ cú pháp: mingo không có session hay replica set.

# EN

## Key idea

One flow writes and then reads back, maybe from a secondary: use a `causalConsistency: true` session, set both read concern and write concern to `majority`, and do both the write and the read inside that session.

## Why

- A secondary may not have the write that just finished, so a read outside the session may miss it.
- The docs: for causal consistency with durable data, only read concern and write concern both at `majority` keep every guarantee.
- This card is syntax only: mingo has no sessions or replica set.
