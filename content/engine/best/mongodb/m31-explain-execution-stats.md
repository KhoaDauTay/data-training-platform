---
id: e-bp-m31
engine: best
track: mongodb
level: L3
module: m
title: "Đọc explain('executionStats'): so tài liệu đã xét với tài liệu trả về"
title_en: "Compare examined vs returned in explain('executionStats')"
kind: quiz
minutes: 4
objectives:
  - vi: "Chạy `explain('executionStats')` cho câu chậm, và so `totalDocsExamined`, `totalKeysExamined` với `nReturned` để biết truy vấn có dùng index và đọc thừa bao nhiêu."
    en: "Run `explain('executionStats')` on a slow query and compare `totalDocsExamined` and `totalKeysExamined` with `nReturned` to see whether an index is used and how much is read for nothing."
avoid:
  vi: "Thêm index theo cảm giác, không biết truy vấn đang đọc bao nhiêu tài liệu cho mỗi tài liệu trả về."
  en: "Adding indexes by feel, without knowing how many documents a query reads for each one it returns."
requires: [e-mg-l3-06]
skills: [explain_read]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/tutorial/analyze-query-plan/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.orders.find({ status: 'PAID', store: 'S1' })
  good: |
    db.orders.find({ status: 'PAID', store: 'S1' }).explain('executionStats')
  expect: null
quiz:
  - q:
      vi: "`explain('executionStats')` báo `totalKeysExamined: 0`, `totalDocsExamined: 21349`, `nReturned: 3809`. Điều đó nghĩa là gì?"
      en: "`explain('executionStats')` reports `totalKeysExamined: 0`, `totalDocsExamined: 21349`, `nReturned: 3809`. What does that mean?"
    options:
      - { vi: "Truy vấn dùng index tốt, chỉ đọc đúng tài liệu cần", en: "The query uses a good index and reads only the documents it needs" }
      - { vi: "Không dùng index: quét cả collection để lấy 3.809 tài liệu", en: "No index is used: the whole collection is scanned to get 3,809 documents" }
      - { vi: "Truy vấn lỗi giữa chừng", en: "The query failed half-way" }
    answer: 1
    why:
      vi: "`totalKeysExamined: 0` là không đọc khóa index nào; số tài liệu đã xét gấp gần 6 lần số trả về, đúng dấu hiệu của `COLLSCAN`. Ví dụ này lấy từ docs; sau khi có index, ba con số bằng nhau."
      en: "`totalKeysExamined: 0` means no index key was read; documents examined are almost 6 times those returned, the mark of a `COLLSCAN`. The example comes from the docs; with an index, the three numbers become equal."
---

## Ý chính

Với câu chậm, chạy `explain('executionStats')` và so ba con số: `totalKeysExamined`, `totalDocsExamined` và `nReturned`. Tài liệu đã xét gấp nhiều lần tài liệu trả về, hay stage `COLLSCAN`, là dấu hiệu thiếu index đúng.

## Vì sao

- Đây là số đếm, không phụ thuộc tốc độ máy, như planner cost của Postgres.
- `totalKeysExamined` bằng 0 nghĩa là không index nào được đọc.
- Index tốt đưa tài liệu đã xét về gần số tài liệu trả về.
- Thẻ này chỉ cú pháp: mingo không có index hay `explain()`.

# EN

## Key idea

For a slow query, run `explain('executionStats')` and compare three numbers: `totalKeysExamined`, `totalDocsExamined` and `nReturned`. Many more documents examined than returned, or a `COLLSCAN` stage, signals a missing index.

## Why

- These are counts, independent of machine speed, like Postgres' planner cost.
- `totalKeysExamined` equal to 0 means no index was read.
- A good index brings documents examined close to documents returned.
- This card is syntax only: mingo has no indexes and no `explain()`.
