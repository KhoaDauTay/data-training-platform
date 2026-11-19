---
id: e-bp-q05
engine: best
track: sql
level: L1
module: q
title: "COALESCE tổng của LEFT JOIN về 0"
title_en: "COALESCE outer-join sums to 0"
kind: quiz
minutes: 3
objectives:
  - vi: "Viết `coalesce(sum(…), 0)` khi nhóm không khớp dòng nào phải hiện 0."
    en: "Write `coalesce(sum(…), 0)` when a group with no matching rows must show 0."
avoid:
  vi: "Ô trống trong báo cáo và phép tính sau đó thành NULL."
  en: "Blank cells in a report, and arithmetic on them that turns NULL."
requires: [e-pg-l1-05]
skills: [coalesce, left_join]
adv: []
sources:
  - https://www.postgresql.org/docs/18/functions-conditional.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT s.id, sum(oi.qty) AS units
    FROM stores s
    LEFT JOIN orders o ON o.store_id = s.id AND o.order_date < DATE '2025-09-01'
    LEFT JOIN order_items oi ON oi.order_id = o.id
    GROUP BY s.id
    ORDER BY s.id
  good: |
    SELECT s.id, coalesce(sum(oi.qty), 0) AS units
    FROM stores s
    LEFT JOIN orders o ON o.store_id = s.id AND o.order_date < DATE '2025-09-01'
    LEFT JOIN order_items oi ON oi.order_id = o.id
    GROUP BY s.id
    ORDER BY s.id
  expect: null
quiz:
  - q:
      vi: "Sau `LEFT JOIN`, một cửa hàng không có đơn nào. `sum(oi.qty)` của nó là gì?"
      en: "After a `LEFT JOIN`, one store has no orders. What is its `sum(oi.qty)`?"
    options:
      - { vi: "0", en: "0" }
      - { vi: "NULL", en: "NULL" }
      - { vi: "Cửa hàng đó không có trong kết quả", en: "That store is not in the result" }
    answer: 1
    why:
      vi: "`LEFT JOIN` giữ cửa hàng, nhưng mọi cột bên phải là NULL. `sum` của toàn NULL là NULL, không phải 0. `coalesce(sum(oi.qty), 0)` đổi nó thành 0."
      en: "The `LEFT JOIN` keeps the store, but every right-hand column is NULL. The `sum` of nothing but NULLs is NULL, not 0. `coalesce(sum(oi.qty), 0)` turns it into 0."
---

## Ý chính

Sau `LEFT JOIN`, `sum` hay `max` của một nhóm không khớp dòng nào là NULL. Nếu nghĩa nghiệp vụ là 0, viết `coalesce(sum(…), 0)`.

## Vì sao

- NULL lan sang phép tính sau đó: `NULL + 1` là NULL.
- Trong báo cáo, NULL hiện thành ô trống, người đọc không biết là 0 hay là thiếu dữ liệu.

## Ví dụ

Cửa hàng 4 mở ngày 2025-09-01. Trước ngày đó nó không có đơn: bản `sum` trả NULL cho cửa hàng 4, bản `coalesce` trả 0.

# EN

## Key idea

After a `LEFT JOIN`, the `sum` or `max` of a group with no matching rows is NULL. If the business meaning is 0, write `coalesce(sum(…), 0)`.

## Why

- NULL spreads into any arithmetic that uses it: `NULL + 1` is NULL.
- In a report NULL shows as a blank cell, and readers cannot tell 0 from missing data.

## Example

Store 4 opened on 2025-09-01. Before that date it has no orders: the `sum` version returns NULL for store 4, the `coalesce` version returns 0.
