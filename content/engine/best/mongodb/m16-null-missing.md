---
id: e-bp-m16
engine: best
track: mongodb
level: L1
module: m
title: "{ field: null } khớp cả trường thiếu"
title_en: "{ field: null } also matches missing fields"
kind: quiz
minutes: 3
objectives:
  - vi: "Tách ba ý: giá trị null (`$type: 'null'`), trường thiếu (`$exists: false`), hoặc cả hai (`{ city: null }`)."
    en: "Tell three intents apart: a null value (`$type: 'null'`), a missing field (`$exists: false`), or either (`{ city: null }`)."
avoid:
  vi: "Đếm lẫn \"khai thành phố là null\" với \"chưa có trường thành phố\"."
  en: "Counting \"city set to null\" together with \"no city field at all\"."
requires: [e-mg-l1-09]
skills: [null_logic]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/tutorial/query-for-null-fields/
verified: { version: "mingo 7.2.6", date: "2026-11-20" }
pair:
  runtime: mingo
  check: diff
  setup: |
    {"collections": {"users": [
      {"_id": 1, "name": "An", "city": "Da Nang"},
      {"_id": 2, "name": "Binh", "city": null},
      {"_id": 3, "name": "Chi"},
      {"_id": 4, "name": "Dung", "city": "Hue"}
    ]}}
  bad: |
    db.users.find({ city: null }, { _id: 1 })
  good: |
    db.users.find({ city: { $type: 'null' } }, { _id: 1 })
  expect: null
quiz:
  - q:
      vi: "Collection `users` có `{ _id: 2, city: null }` và `{ _id: 3 }` (không có `city`). `db.users.find({ city: null })` trả những `_id` nào?"
      en: "Collection `users` holds `{ _id: 2, city: null }` and `{ _id: 3 }` (no `city`). What does `db.users.find({ city: null })` return, by `_id`?"
    options:
      - { vi: "Chỉ 2", en: "Only 2" }
      - { vi: "Chỉ 3", en: "Only 3" }
      - { vi: "Cả 2 và 3", en: "Both 2 and 3" }
    answer: 2
    why:
      vi: "`{ city: null }` khớp tài liệu có `city` bằng null **và** tài liệu không có trường `city`. Muốn chỉ null thì dùng `{ $type: 'null' }`; chỉ thiếu thì `{ $exists: false }`."
      en: "`{ city: null }` matches documents whose `city` is null **and** documents with no `city` field. For null only use `{ $type: 'null' }`; for missing only use `{ $exists: false }`."
---

## Ý chính

Nói rõ bạn muốn gì: chỉ giá trị null thì `{ $type: 'null' }`, chỉ trường không có thì `{ $exists: false }`. Chỉ viết `{ city: null }` khi bạn muốn cả hai.

## Vì sao

- Trong MongoDB, `{ city: null }` khớp cả tài liệu (document) có `city: null` lẫn tài liệu không có trường `city`.
- Hai nhóm đó thường khác nghĩa: "đã hỏi, khách không khai" và "dữ liệu cũ, chưa từng hỏi".
- SQL không có khái niệm "thiếu cột", nên người quen SQL hay bỏ sót điểm này.

# EN

## Key idea

Say what you mean: for a null value only use `{ $type: 'null' }`, for a missing field only use `{ $exists: false }`. Write `{ city: null }` only when you want both.

## Why

- In MongoDB, `{ city: null }` matches documents with `city: null` and documents that have no `city` field.
- The two groups usually mean different things: "asked, the customer left it blank" and "old data, never asked".
- SQL has no notion of a "missing column", so people coming from SQL often miss this.

