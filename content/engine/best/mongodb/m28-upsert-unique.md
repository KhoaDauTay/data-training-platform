---
id: e-bp-m28
engine: best
track: mongodb
level: L2
module: m
title: "Upsert phải có unique index trên trường lọc"
title_en: "Upserts need a unique index on the filter fields"
kind: quiz
minutes: 3
objectives:
  - vi: "Tạo unique index trên các trường của `filter` trước khi dùng `updateOne(filter, update, { upsert: true })`, và cho bên nhận lỗi trùng khóa chạy lại."
    en: "Create a unique index on the `filter` fields before using `updateOne(filter, update, { upsert: true })`, and let the side that gets a duplicate key error retry."
avoid:
  vi: "Hai lần nhập kho cùng lúc tạo hai tài liệu tồn kho cho cùng một mã hàng và cửa hàng."
  en: "Two simultaneous stock receipts creating two stock documents for the same SKU and store."
requires: [e-mg-l1-05]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/reference/method/db.collection.updateone/
  - https://www.mongodb.com/docs/manual/core/index-unique/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.stock.updateOne({ sku: 'TEA-01', store: 'S1' }, { $inc: { qty: 5 } }, { upsert: true })
  good: |
    db.stock.createIndex({ sku: 1, store: 1 }, { unique: true })
    db.stock.updateOne({ sku: 'TEA-01', store: 'S1' }, { $inc: { qty: 5 } }, { upsert: true })
  expect: null
quiz:
  - q:
      vi: "Chưa có tài liệu nào cho `{ sku: 'TEA-01', store: 'S1' }`, không có unique index. Hai upsert bản Không nên chạy cùng lúc. Kết quả có thể là gì?"
      en: "No document exists for `{ sku: 'TEA-01', store: 'S1' }` and there is no unique index. Two upserts from the bad version run at the same time. What can the result be?"
    options:
      - { vi: "Luôn đúng một tài liệu với `qty: 10`", en: "Always exactly one document with `qty: 10`" }
      - { vi: "Hai tài liệu, mỗi cái `qty: 5`", en: "Two documents, each with `qty: 5`" }
      - { vi: "Lệnh thứ hai luôn báo lỗi", en: "The second command always fails" }
    answer: 1
    why:
      vi: "Cả hai cùng không thấy tài liệu nào nên cùng chèn. Docs: muốn tránh upsert nhiều lần thì các trường lọc phải có unique index. Có unique index thì database không lưu giá trị trùng: bên thua bị từ chối, chạy lại thì thành `$inc` trên tài liệu đã có."
      en: "Neither sees a document, so both insert. The docs: to avoid multiple upserts, the filter fields must be uniquely indexed. With a unique index the database stores no duplicate values: the losing side is refused and, on retry, becomes an `$inc` on the existing document."
---

## Ý chính

Dùng `updateOne(filter, update, { upsert: true })` thì các trường trong `filter` phải có unique index. Bên nhận lỗi trùng khóa thì chạy lại lệnh.

## Vì sao

- Upsert là "tìm, không thấy thì chèn". Hai lệnh đồng thời có thể cùng không thấy và cùng chèn.
- Unique index để database chặn bản thứ hai, thay vì để dữ liệu trùng lặng lẽ tích lại.
- Giống luật `INSERT … ON CONFLICT` của Postgres: phải có ràng buộc duy nhất thì mới có xung đột để bắt.
- Thẻ này chỉ cú pháp: cần hai client chạy song song và một unique index thật, mingo không có cả hai.

# EN

## Key idea

When you use `updateOne(filter, update, { upsert: true })`, the `filter` fields need a unique index. The side that gets a duplicate key error retries the command.

## Why

- An upsert is "find, and insert if not found". Two concurrent commands can both find nothing and both insert.
- A unique index lets the database stop the second copy, instead of duplicates quietly piling up.
- It mirrors Postgres' `INSERT … ON CONFLICT`: there must be a unique constraint for a conflict to catch.
- This card is syntax only: it needs two clients in parallel and a real unique index, and mingo has neither.
