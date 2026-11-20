---
id: e-bp-m11
engine: best
track: mongodb
level: L5
module: m
title: "Shard key: nhiều giá trị, tần suất đều, không tăng đơn điệu"
title_en: "Choosing a shard key"
kind: quiz
minutes: 4
objectives:
  - vi: "Chọn shard key có nhiều giá trị, mỗi giá trị xuất hiện ít, không tăng đơn điệu, và có mặt trong các truy vấn chính; với khóa tăng dần thì dùng hashed sharding hoặc khóa ghép."
    en: "Choose a shard key with many values, each one rare, not monotonically increasing, and present in the main queries; for an increasing key use hashed sharding or a compound key."
avoid:
  vi: "Mọi đơn mới dồn vào một chunk cuối trên một shard, trong khi các shard khác ngồi chơi."
  en: "Every new order piling into one last chunk on one shard while the other shards sit idle."
requires: [e-mg-l5-05]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/
  - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-hashed/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    sh.shardCollection('shop.orders', { createdAt: 1 })
  good: |
    sh.shardCollection('shop.orders', { customerId: 'hashed' })
  expect: null
quiz:
  - q:
      vi: "Collection được shard theo khoảng trên `createdAt`, giá trị luôn tăng. Các đơn mới được ghi vào đâu?"
      en: "A collection is range-sharded on `createdAt`, whose value always increases. Where do new orders get written?"
    options:
      - { vi: "Rải đều qua mọi shard", en: "Spread evenly across all shards" }
      - { vi: "Vào chunk có cận trên `MaxKey`, tức một shard duy nhất", en: "Into the chunk whose upper bound is `MaxKey`, so a single shard" }
      - { vi: "Vào shard có ít dữ liệu nhất", en: "Into the shard with the least data" }
    answer: 1
    why:
      vi: "Khóa luôn tăng thì mọi giá trị mới lớn hơn mọi giá trị cũ, nên rơi vào chunk cuối có cận trên `MaxKey`. Hashed sharding băm giá trị nên lần ghi mới rải qua nhiều chunk."
      en: "With an always increasing key every new value is larger than all old ones, so it lands in the last chunk, bounded above by `MaxKey`. Hashed sharding hashes the value, so new writes spread over many chunks."
---

## Ý chính

Shard key tốt có cardinality cao (nhiều giá trị), tần suất mỗi giá trị thấp, không tăng hay giảm đơn điệu, và nằm trong các truy vấn chính để router hỏi đúng một shard. Khóa tăng dần (`ObjectId`, thời điểm) thì dùng hashed sharding hoặc khóa ghép như `{ customerId: 1, createdAt: 1 }`.

## Vì sao

- Khóa đơn điệu dồn mọi lần ghi mới vào một chunk, nên một shard "nóng".
- Khóa ít giá trị tạo chunk lớn không chia nhỏ được.
- Truy vấn không có shard key phải hỏi mọi shard (scatter-gather).
- Thẻ này chỉ cú pháp: mingo chạy trên một tập dữ liệu trong bộ nhớ, không có shard.

# EN

## Key idea

A good shard key has high cardinality (many values), low frequency per value, does not increase or decrease monotonically, and appears in the main queries so the router asks exactly one shard. For an increasing key (`ObjectId`, a timestamp), use hashed sharding or a compound key such as `{ customerId: 1, createdAt: 1 }`.

## Why

- A monotonic key sends every new write to one chunk, so one shard runs hot.
- A key with few values creates large chunks that cannot be split.
- A query without the shard key must ask every shard (scatter-gather).
- This card is syntax only: mingo runs on one in-memory dataset and has no shards.
