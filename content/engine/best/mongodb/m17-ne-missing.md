---
id: e-bp-m17
engine: best
track: mongodb
level: L2
module: m
title: "$ne và $nin trả cả tài liệu thiếu trường"
title_en: "$ne and $nin include missing fields"
kind: quiz
minutes: 3
objectives:
  - vi: "Thêm `$exists: true` và loại `null` khi \"khác X\" chỉ được tính tài liệu có giá trị thật."
    en: "Add `$exists: true` and exclude `null` when \"not X\" must count only documents with a real value."
avoid:
  vi: "Danh sách \"khách ngoài Đà Nẵng\" lẫn cả khách chưa khai thành phố."
  en: "A list of \"customers outside Da Nang\" that also holds customers who never gave a city."
requires: [e-mg-l1-07, e-mg-l1-09]
skills: [null_logic]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/query/ne/
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
    db.users.find({ city: { $ne: 'Da Nang' } }, { _id: 1 })
  good: |
    db.users.find({ city: { $exists: true, $nin: ['Da Nang', null] } }, { _id: 1 })
  expect: null
quiz:
  - q:
      vi: "SQL `WHERE city <> 'Da Nang'` bỏ dòng có `city` NULL. MongoDB `{ city: { $ne: 'Da Nang' } }` làm gì với tài liệu `city: null` và tài liệu không có `city`?"
      en: "SQL `WHERE city <> 'Da Nang'` drops rows whose `city` is NULL. What does MongoDB `{ city: { $ne: 'Da Nang' } }` do with a `city: null` document and a document without `city`?"
    options:
      - { vi: "Bỏ cả hai, như SQL", en: "Drops both, like SQL" }
      - { vi: "Giữ cả hai", en: "Keeps both" }
      - { vi: "Giữ tài liệu null, bỏ tài liệu thiếu trường", en: "Keeps the null one, drops the one without the field" }
    answer: 1
    why:
      vi: "Docs của `$ne` nói rõ nó chọn cả tài liệu không có trường đó; null cũng khác 'Da Nang'. Đây là bẫy ngược với SQL. Muốn chỉ giá trị thật thì thêm `$exists: true` và loại `null`."
      en: "The `$ne` docs say it also selects documents without the field; null is also not 'Da Nang'. It is the opposite trap from SQL. For real values only, add `$exists: true` and exclude `null`."
---

## Ý chính

"Khác X" mà chỉ muốn tài liệu có giá trị thật thì viết thêm `$exists: true` và loại `null`: `{ $exists: true, $nin: ['Da Nang', null] }`.

## Vì sao

- `$ne` và `$nin` chọn cả tài liệu không có trường đó, và cả tài liệu có giá trị null.
- Đây là bẫy ngược với SQL: `city <> 'Da Nang'` trong SQL **bỏ** NULL, còn MongoDB **giữ** cả null lẫn thiếu.
- Người chuyển từ SQL sang dễ đếm thừa mà không biết.

## Ví dụ

Trên bốn tài liệu `users`, `$ne` trả `_id` 2, 3 và 4. Bản có `$exists` và loại `null` chỉ trả 4.

# EN

## Key idea

When "not X" should cover only documents with a real value, add `$exists: true` and exclude `null`: `{ $exists: true, $nin: ['Da Nang', null] }`.

## Why

- `$ne` and `$nin` select documents without the field, and documents whose value is null.
- It is the opposite trap from SQL: `city <> 'Da Nang'` in SQL **drops** NULLs, while MongoDB **keeps** both null and missing.
- People moving from SQL easily over-count without noticing.

## Example

On four `users` documents, `$ne` returns `_id` 2, 3 and 4. The version with `$exists` that excludes `null` returns only 4.
