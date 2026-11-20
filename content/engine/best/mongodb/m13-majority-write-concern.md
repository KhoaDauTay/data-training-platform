---
id: e-bp-m13
engine: best
track: mongodb
level: L4
module: m
title: "Write concern majority cho dữ liệu quan trọng"
title_en: "Use majority write concern for data that matters"
kind: quiz
minutes: 4
objectives:
  - vi: "Ghi dữ liệu không được mất (thanh toán, đơn) với `w: 'majority'`, đọc dữ liệu đã xác nhận với read concern `majority`, và không hạ write concern để \"nhanh hơn\"."
    en: "Write data that must not be lost (payments, orders) with `w: 'majority'`, read acknowledged data with read concern `majority`, and never lower the write concern \"for speed\"."
avoid:
  vi: "Một khoản thanh toán đã báo \"thành công\" biến mất sau khi primary đổi."
  en: "A payment reported as \"successful\" disappearing after the primary changes."
requires: [e-mg-l4-07]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/reference/write-concern/
  - https://www.mongodb.com/docs/manual/reference/read-concern/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.payments.insertOne({ orderId: 1, amount: 120 }, { writeConcern: { w: 0 } })
  good: |
    db.payments.insertOne({ orderId: 1, amount: 120 }, { writeConcern: { w: 'majority', wtimeout: 5000 } })
  expect: null
quiz:
  - q:
      vi: "Một lần ghi với `w: 1` được primary xác nhận. Ngay sau đó primary sập trước khi secondary nào nhận được bản ghi. Lần ghi đó ra sao?"
      en: "A write with `w: 1` is acknowledged by the primary. Right after, the primary fails before any secondary has received it. What happens to that write?"
    options:
      - { vi: "Luôn còn, vì đã được xác nhận", en: "It always survives, because it was acknowledged" }
      - { vi: "Có thể bị rollback khi primary mới lên", en: "It can be rolled back when a new primary takes over" }
      - { vi: "Được secondary tự chép lại từ ứng dụng", en: "The secondaries copy it again from the application" }
    answer: 1
    why:
      vi: "Docs: với `w: 1`, dữ liệu có thể bị rollback nếu primary rời vai trò trước khi lần ghi tới secondary nào. `w: 'majority'` chỉ xác nhận khi đa số thành viên có phiếu đã nhận."
      en: "The docs: with `w: 1`, data can be rolled back if the primary steps down before the write reaches any secondary. `w: 'majority'` acknowledges only once a majority of voting members have it."
---

## Ý chính

Dữ liệu không được mất dùng write concern `w: 'majority'`. Đọc cần thấy dữ liệu đã được đa số xác nhận thì dùng read concern `majority`. Không hạ `w: 0` hay `w: 1` cho dữ liệu này để "nhanh hơn".

## Vì sao

- Lần ghi chỉ primary xác nhận có thể bị rollback khi primary đổi trước lúc nhân bản xong.
- `w: 'majority'` là mặc định của đa số cấu hình, nhưng driver hay từng lệnh có thể đặt khác: ghi rõ ở chỗ quan trọng.
- `wtimeout` giới hạn thời gian chờ xác nhận, để ứng dụng không đứng mãi.
- Thẻ này chỉ cú pháp: mingo không có replica set.

# EN

## Key idea

Data that must not be lost uses write concern `w: 'majority'`. Reads that must see majority-acknowledged data use read concern `majority`. Never drop to `w: 0` or `w: 1` for this data "for speed".

## Why

- A write acknowledged only by the primary can be rolled back if the primary changes before replication finishes.
- `w: 'majority'` is the default in most deployments, but a driver or a single command can set something else: state it where it matters.
- `wtimeout` limits how long to wait for the acknowledgement, so the application never hangs.
- This card is syntax only: mingo has no replica set.
