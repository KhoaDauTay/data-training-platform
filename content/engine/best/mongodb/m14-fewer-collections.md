---
id: e-bp-m14
engine: best
track: mongodb
level: L2
module: m
title: "Ít collection, đa hình có chủ đích"
title_en: "Fewer collections, intentional polymorphism"
kind: quiz
minutes: 3
objectives:
  - vi: "Để tài liệu cùng mục đích nhưng khác vài trường trong chung một collection, có trường phân loại; không tạo một collection cho mỗi khách, mỗi ngày hay mỗi loại nhỏ."
    en: "Keep documents with the same purpose but a few different fields in one collection with a type field; do not create one collection per customer, per day or per small kind."
avoid:
  vi: "Hàng nghìn collection, mỗi cái kéo theo index và tệp riêng, làm server chậm và khó quản lý."
  en: "Thousands of collections, each with its own indexes and files, slowing the server and becoming hard to manage."
requires: [e-mg-l4-06]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/reduce-collections/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/polymorphic-data/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.orders_customer_11.find({})
  good: |
    db.orders.find({ customerId: 11 }, { _id: 1 })
  expect: null
quiz:
  - q:
      vi: "Mỗi collection mới mặc nhiên có gì, kể cả khi bạn chưa tạo index nào?"
      en: "What does every new collection get by default, even before you create any index?"
    options:
      - { vi: "Không có gì, collection rỗng không tốn gì", en: "Nothing, an empty collection costs nothing" }
      - { vi: "Một index trên `_id`, tốn thêm dung lượng", en: "An index on `_id`, which takes extra storage" }
      - { vi: "Một bản sao trên mỗi shard", en: "A copy on every shard" }
    answer: 1
    why:
      vi: "Docs: với mỗi collection, MongoDB tạo một index `_id` mặc định, dùng thêm dung lượng. Quá nhiều collection và index làm căng tài nguyên của replica set."
      en: "The docs: for every collection MongoDB creates a default `_id` index, which uses extra storage. Too many collections and indexes strain the replica set's resources."
---

## Ý chính

Tài liệu cùng mục đích nhưng khác vài trường để chung một collection, với một trường phân loại như `type` (dữ liệu đa hình). Đừng tạo collection cho mỗi khách, mỗi ngày hay mỗi loại nhỏ; lọc theo trường thay vì theo tên collection.

## Vì sao

- Mỗi collection kéo theo index, tệp và metadata riêng.
- Quá nhiều collection làm server chậm và việc quản lý index rối.
- Tài liệu trong một collection không cần cùng cấu trúc, nên đa hình là cách dùng bình thường của MongoDB.
- Thẻ này chỉ cú pháp: mingo không có chi phí cho mỗi collection để đo.

# EN

## Key idea

Documents with the same purpose but a few different fields share one collection, with a type field such as `type` (polymorphic data). Do not create a collection per customer, per day or per small kind; filter on a field instead of on the collection name.

## Why

- Every collection brings its own indexes, files and metadata.
- Too many collections slow the server and make index management messy.
- Documents in one collection need not share a structure, so polymorphism is normal MongoDB use.
- This card is syntax only: mingo has no per-collection cost to measure.
