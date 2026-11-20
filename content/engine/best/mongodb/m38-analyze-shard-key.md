---
id: e-bp-m38
engine: best
track: mongodb
level: L5
module: m
title: "Đo shard key bằng analyzeShardKey trước khi chọn"
title_en: "Measure a candidate shard key with analyzeShardKey"
kind: quiz
minutes: 3
objectives:
  - vi: "Trước khi shard hay reshard, chạy `analyzeShardKey` trên khóa ứng viên và đọc số đo cardinality, tần suất và tính đơn điệu; bật lấy mẫu truy vấn để xem thêm phân bố đọc và ghi."
    en: "Before sharding or resharding, run `analyzeShardKey` on the candidate key and read its cardinality, frequency and monotonicity metrics; turn on query sampling to also see the read and write distribution."
avoid:
  vi: "Chọn shard key theo cảm giác rồi mới thấy mọi lần ghi dồn vào một shard."
  en: "Choosing a shard key by feel and only then finding every write landing on one shard."
requires: [e-mg-l5-07]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/reference/command/analyzeshardkey/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    sh.shardCollection('shop.orders', { createdAt: 1 })
  good: |
    db.adminCommand({ analyzeShardKey: 'shop.orders', key: { customerId: 1, createdAt: 1 } })
  expect: null
quiz:
  - q:
      vi: "Phần `keyCharacteristics` trong kết quả `analyzeShardKey` đo những gì?"
      en: "What does the `keyCharacteristics` part of the `analyzeShardKey` output measure?"
    options:
      - { vi: "Cardinality, tần suất và tính đơn điệu của khóa", en: "The key's cardinality, frequency and monotonicity" }
      - { vi: "Tốc độ mạng giữa các shard", en: "Network speed between shards" }
      - { vi: "Dung lượng đĩa còn trống", en: "Free disk space" }
    answer: 0
    why:
      vi: "Docs: `keyCharacteristics` gồm số đo về cardinality, tần suất và tính đơn điệu, tính từ tài liệu lấy mẫu. Phân bố đọc và ghi cần lấy mẫu truy vấn bật bằng `configureQueryAnalyzer`."
      en: "The docs: `keyCharacteristics` holds metrics about cardinality, frequency and monotonicity, computed from sampled documents. The read and write distribution needs query sampling turned on with `configureQueryAnalyzer`."
---

## Ý chính

Trước khi shard (hay reshard), chạy `analyzeShardKey` trên khóa ứng viên. Đọc số đo về số giá trị riêng, tần suất giá trị phổ biến nhất và tính tăng đơn điệu. Bật lấy mẫu truy vấn một thời gian để xem thêm phân bố đọc và ghi.

## Vì sao

- Shard key tốt cần nhiều giá trị, tần suất đều và không tăng đơn điệu; lệnh này đo cả ba trên dữ liệu thật thay vì đoán.
- Lệnh có từ MongoDB 7.0.
- Thẻ này chỉ cú pháp: lệnh cần một cluster, mingo không có.

# EN

## Key idea

Before sharding (or resharding), run `analyzeShardKey` on the candidate key. Read its metrics for distinct values, the frequency of the most common value and monotonic growth. Turn on query sampling for a while to also see the read and write distribution.

## Why

- A good shard key needs many values, even frequency and no monotonic growth; this command measures all three on real data instead of guessing.
- The command exists since MongoDB 7.0.
- This card is syntax only: the command needs a cluster, which mingo does not have.
