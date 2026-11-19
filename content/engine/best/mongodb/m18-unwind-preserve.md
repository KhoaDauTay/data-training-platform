---
id: e-bp-m18
engine: best
track: mongodb
level: L2
module: m
title: "$unwind bỏ mất tài liệu có mảng rỗng hoặc thiếu"
title_en: "$unwind drops empty and missing arrays"
kind: quiz
minutes: 3
objectives:
  - vi: "Dùng `preserveNullAndEmptyArrays: true` khi báo cáo phải giữ mọi tài liệu cha, rồi đếm có điều kiện."
    en: "Use `preserveNullAndEmptyArrays: true` when a report must keep every parent document, then count conditionally."
avoid:
  vi: "Khách có giỏ rỗng biến khỏi báo cáo thay vì hiện số 0."
  en: "Customers with an empty cart vanish from the report instead of showing 0."
requires: [e-mg-l2-07]
skills: [left_join, coalesce]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/
verified: { version: "mingo 7.2.6", date: "2026-11-20" }
pair:
  runtime: mingo
  check: diff
  setup: |
    {"collections": {"carts": [
      {"_id": 1, "userId": 1, "items": [{"sku": "A", "qty": 1}, {"sku": "B", "qty": 2}]},
      {"_id": 2, "userId": 2, "items": []},
      {"_id": 3, "userId": 3}
    ]}}
  bad: |
    db.carts.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$userId', lines: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
  good: |
    db.carts.aggregate([
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$userId', lines: { $sum: { $cond: [{ $ifNull: ['$items', false] }, 1, 0] } } } },
      { $sort: { _id: 1 } }
    ])
  expect: null
quiz:
  - q:
      vi: "Giỏ của người dùng 2 có `items: []`, giỏ của người dùng 3 không có `items`. Sau `{ $unwind: '$items' }` mặc định, còn tài liệu nào của họ?"
      en: "User 2's cart has `items: []` and user 3's cart has no `items`. After a default `{ $unwind: '$items' }`, which of their documents remain?"
    options:
      - { vi: "Mỗi người một tài liệu với `items` là null", en: "One document each, with `items` null" }
      - { vi: "Không còn tài liệu nào của họ", en: "None of their documents" }
      - { vi: "Chỉ của người dùng 2", en: "Only user 2's" }
    answer: 1
    why:
      vi: "Mặc định `$unwind` không sinh tài liệu nào khi mảng rỗng, null hoặc thiếu, giống INNER JOIN. `preserveNullAndEmptyArrays: true` giữ họ lại, như LEFT JOIN."
      en: "By default `$unwind` outputs nothing for an empty, null or missing array, like an INNER JOIN. `preserveNullAndEmptyArrays: true` keeps them, like a LEFT JOIN."
---

## Ý chính

Khi báo cáo phải giữ mọi tài liệu (document) cha (khách có giỏ rỗng vẫn phải hiện 0), dùng `preserveNullAndEmptyArrays: true`, rồi đếm có điều kiện.

## Vì sao

- Mặc định `$unwind` không sinh tài liệu nào khi mảng null, thiếu hoặc rỗng.
- Giống INNER JOIN thay cho LEFT JOIN trong SQL: dòng có số 0 biến khỏi báo cáo.
- Sau khi giữ lại, `$sum: 1` sẽ đếm cả tài liệu không có phần tử, nên phải đếm có điều kiện (`$cond` + `$ifNull`).

# EN

## Key idea

When a report must keep every parent document (a customer with an empty cart must still show 0), use `preserveNullAndEmptyArrays: true` and count conditionally.

## Why

- By default `$unwind` outputs no document when the array is null, missing or empty.
- It is like an INNER JOIN instead of a LEFT JOIN in SQL: the rows with 0 vanish from the report.
- Once they are kept, `$sum: 1` would also count documents with no element, so count conditionally (`$cond` + `$ifNull`).

