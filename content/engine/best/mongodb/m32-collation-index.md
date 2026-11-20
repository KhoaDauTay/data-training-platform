---
id: e-bp-m32
engine: best
track: mongodb
level: L3
module: m
title: "Index có collation chỉ phục vụ truy vấn cùng collation"
title_en: "Queries must use the index's collation"
kind: quiz
minutes: 3
objectives:
  - vi: "Khi so chữ không phân biệt hoa thường bằng collation, tạo index với collation đó và gửi truy vấn kèm đúng collation ấy (hoặc đặt collation mặc định cho collection)."
    en: "When comparing text case-insensitively with a collation, create the index with that collation and send the query with the same collation (or set a default collation on the collection)."
avoid:
  vi: "Tạo index collation tiếng Việt rồi truy vấn không kèm collation, nên index không được dùng để so chữ."
  en: "Creating a Vietnamese-collation index and then querying without a collation, so the index is not used for the string comparison."
requires: [e-mg-l3-15]
skills: [index_design]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/reference/collation/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.customers.createIndex({ city: 1 }, { collation: { locale: 'vi', strength: 2 } })
    db.customers.find({ city: 'da nang' })
  good: |
    db.customers.createIndex({ city: 1 }, { collation: { locale: 'vi', strength: 2 } })
    db.customers.find({ city: 'da nang' }).collation({ locale: 'vi', strength: 2 })
  expect: null
quiz:
  - q:
      vi: "Index `{ city: 1 }` có collation `{ locale: 'vi', strength: 2 }`. Truy vấn `find({ city: 'da nang' })` không kèm collation. Index có phục vụ phép so chữ không?"
      en: "Index `{ city: 1 }` has collation `{ locale: 'vi', strength: 2 }`. The query `find({ city: 'da nang' })` has no collation. Does the index serve the string comparison?"
    options:
      - { vi: "Có, index tự áp collation của nó", en: "Yes, the index applies its own collation" }
      - { vi: "Không, truy vấn phải nêu cùng collation", en: "No, the query must specify the same collation" }
      - { vi: "Có, nhưng chỉ khi chữ viết thường", en: "Yes, but only for lower-case text" }
    answer: 1
    why:
      vi: "Docs: muốn dùng index để so chữ, thao tác phải nêu cùng collation. Collation khác thì index không phục vụ phép so chữ trên trường đó. Đặt collation mặc định cho collection thì truy vấn không cần nêu lại."
      en: "The docs: to use an index for string comparisons, the operation must specify the same collation. With a different collation the index cannot support string comparisons on that field. A collection default collation removes the need to repeat it."
---

## Ý chính

Muốn so chữ không phân biệt hoa thường hay dấu bằng collation, tạo index **với** collation đó và gửi truy vấn kèm **đúng** collation ấy. Hoặc đặt collation mặc định cho collection, để mọi truy vấn dùng chung.

## Vì sao

- Index có collation chỉ phục vụ so chữ cho thao tác nêu cùng collation đó.
- Khi ấy truy vấn vẫn chạy, nhưng phép so chữ không đi qua index: chậm mà không báo gì.
- Thẻ này chỉ cú pháp: mingo không có index.

# EN

## Key idea

To compare text ignoring case or accents with a collation, create the index **with** that collation and send the query with **the same** collation. Or set a default collation on the collection so every query shares it.

## Why

- An index with a collation serves string comparisons only for operations that specify that same collation.
- The query still runs, but the string comparison does not go through the index: slow, with no warning.
- This card is syntax only: mingo has no indexes.
