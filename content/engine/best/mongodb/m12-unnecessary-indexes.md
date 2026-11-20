---
id: e-bp-m12
engine: best
track: mongodb
level: L3
module: m
title: "Bỏ index thừa"
title_en: "Remove unnecessary indexes"
kind: quiz
minutes: 3
objectives:
  - vi: "Đọc `$indexStats` định kỳ trên mọi node, và xóa index không được dùng hoặc đã nằm trong một compound index khác."
    en: "Read `$indexStats` regularly on every node, and drop indexes that are unused or already covered by another compound index."
avoid:
  vi: "Mỗi lần ghi phải cập nhật thêm một index không truy vấn nào đọc."
  en: "Every write updating one more index that no query reads."
requires: [e-mg-l3-14]
skills: [index_design]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/unnecessary-indexes/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.orders.createIndex({ status: 1 })
    db.orders.createIndex({ status: 1, total: -1 })
  good: |
    db.orders.aggregate([{ $indexStats: {} }])
    db.orders.dropIndex({ status: 1 })
  expect: null
quiz:
  - q:
      vi: "Collection có `{ status: 1 }` và `{ status: 1, total: -1 }`. Index nào thường bỏ được?"
      en: "A collection has `{ status: 1 }` and `{ status: 1, total: -1 }`. Which index can usually be dropped?"
    options:
      - { vi: "`{ status: 1 }`, vì `{ status: 1, total: -1 }` phục vụ được truy vấn lọc theo `status`", en: "`{ status: 1 }`, because `{ status: 1, total: -1 }` can serve queries that filter on `status`" }
      - { vi: "`{ status: 1, total: -1 }`, vì index ngắn luôn tốt hơn", en: "`{ status: 1, total: -1 }`, because a shorter index is always better" }
      - { vi: "Không cái nào, hai index không bao giờ trùng việc", en: "Neither, two indexes never overlap" }
    answer: 0
    why:
      vi: "`{ status: 1 }` là tiền tố của compound index kia, nên thường thừa. Trước khi xóa, đọc `accesses` của `$indexStats` trên từng node, vì số đó chỉ tính cho node trả lời truy vấn."
      en: "`{ status: 1 }` is a prefix of the other compound index, so it is usually redundant. Before dropping it, read `accesses` from `$indexStats` on each node, because that count only covers the node that ran the queries."
---

## Ý chính

Định kỳ xem `$indexStats`. Xóa index không được dùng, hoặc là tiền tố của một compound index khác (`{ a: 1 }` khi đã có `{ a: 1, b: 1 }`).

## Vì sao

- Index thừa làm collection phình và làm chậm lần ghi.
- Docs xếp index hiếm dùng, thừa vì đã có compound index, hay không dùng vào cùng một anti-pattern.
- Index thừa đẩy dữ liệu hay dùng ra khỏi working set.
- Thẻ này chỉ cú pháp: mingo chỉ ghi lại định nghĩa index, không đếm lượt dùng.

# EN

## Key idea

Check `$indexStats` regularly. Drop indexes that are unused, or that are a prefix of another compound index (`{ a: 1 }` when `{ a: 1, b: 1 }` exists).

## Why

- Unneeded indexes bloat the collection and slow down writes.
- The docs file rarely used indexes, indexes made redundant by a compound index, and unused indexes under one anti-pattern.
- Unneeded indexes push frequently used data out of the working set.
- This card is syntax only: mingo only records index definitions and does not count their use.
