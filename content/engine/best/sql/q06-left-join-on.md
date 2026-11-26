---
id: e-bp-q06
engine: best
track: sql
level: L2
module: q
title: "Điều kiện của bảng bên phải đặt trong ON"
title_en: "Right-table filters belong in ON"
kind: quiz
minutes: 3
objectives:
  - vi: "Đặt điều kiện lọc bảng bên phải của `LEFT JOIN` trong `ON`, để nhóm không có gì vẫn ở lại."
    en: "Put filters on the right table of a `LEFT JOIN` in `ON`, so groups with nothing stay in the result."
avoid:
  vi: "LEFT JOIN âm thầm thành INNER JOIN, và nhóm có số 0 biến mất."
  en: "A LEFT JOIN that silently becomes an INNER JOIN, so groups with 0 vanish."
requires: []
skills: [left_join]
adv: []
sources:
  - https://www.postgresql.org/docs/18/queries-table-expressions.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT s.id, count(o.id) AS orders
    FROM stores s
    LEFT JOIN orders o ON o.store_id = s.id
    WHERE o.order_date < DATE '2025-09-01'
    GROUP BY s.id
    ORDER BY s.id
  good: |
    SELECT s.id, count(o.id) AS orders
    FROM stores s
    LEFT JOIN orders o ON o.store_id = s.id AND o.order_date < DATE '2025-09-01'
    GROUP BY s.id
    ORDER BY s.id
  expect: null
lint:
  rule: q06
  tip:
    vi: "Điều kiện trên bảng bên phải của LEFT JOIN đặt ở `WHERE` sẽ bỏ các dòng không khớp, thành INNER JOIN. Bạn muốn đặt nó trong `ON` không?"
    en: "A filter on the right table of a LEFT JOIN in `WHERE` drops unmatched rows, so it acts like an INNER JOIN. Move it into `ON`?"
quiz:
  - q:
      vi: "Bạn cần số đơn trước 2025-09-01 của **mọi** cửa hàng, cửa hàng không có đơn thì ghi 0. Điều kiện ngày đặt ở đâu?"
      en: "You need the number of orders before 2025-09-01 for **every** store, with 0 for stores that have none. Where does the date condition go?"
    options:
      - { vi: "Trong `WHERE`", en: "In `WHERE`" }
      - { vi: "Trong `ON` của `LEFT JOIN`", en: "In the `ON` of the `LEFT JOIN`" }
      - { vi: "Trong `HAVING`", en: "In `HAVING`" }
    answer: 1
    why:
      vi: "`WHERE` chạy sau join: dòng của cửa hàng không có đơn có `o.order_date` là NULL, điều kiện cho NULL, dòng bị bỏ. Trong `ON`, điều kiện chỉ quyết định đơn nào được ghép, cửa hàng vẫn ở lại với số 0. `HAVING` lọc sau khi gom nhóm, lúc đó chỉ còn số đếm của cả cửa hàng, không còn ngày của từng đơn để lọc."
      en: "`WHERE` runs after the join: a store with no orders has `o.order_date` NULL, the condition is NULL, and the row is dropped. In `ON` the condition only decides which orders are matched, and the store stays with a 0. `HAVING` filters after grouping, when only the store's count is left, not each order's date."
---

## Ý chính

Với `LEFT JOIN`, điều kiện lọc trên bảng bên phải đặt trong `ON`, không đặt trong `WHERE`. Ngoại lệ: `WHERE o.id IS NULL` để tìm dòng không khớp (anti join).

## Vì sao

- `WHERE o.col …` chạy sau join và loại các dòng mà `o` là NULL.
- `LEFT JOIN` thành INNER JOIN, nhóm "không có gì" biến khỏi kết quả, không có lỗi nào.

## Ví dụ

Cửa hàng 4 mở ngày 2025-09-01. Bản lọc ở `WHERE` trả 4 cửa hàng, thiếu cửa hàng 4. Bản lọc trong `ON` trả đủ 5, cửa hàng 4 có 0 đơn.

# EN

## Key idea

With a `LEFT JOIN`, put filters on the right table in `ON`, not in `WHERE`. The exception is `WHERE o.id IS NULL`, used to find unmatched rows (an anti join).

## Why

- `WHERE o.col …` runs after the join and removes rows where `o` is NULL.
- The `LEFT JOIN` becomes an INNER JOIN, and groups with nothing vanish from the result, with no error.

## Example

Store 4 opened on 2025-09-01. The version filtering in `WHERE` returns 4 stores, without store 4. The version filtering in `ON` returns all 5, with 0 orders for store 4.
