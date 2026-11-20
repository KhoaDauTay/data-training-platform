---
id: e-bp-q08
engine: best
track: sql
level: L1
module: q
title: "Viết JOIN … ON, không join bằng dấu phẩy"
title_en: "Explicit JOIN syntax, not comma joins"
kind: quiz
minutes: 2
objectives:
  - vi: "Nối bảng bằng `JOIN … ON`, để điều kiện nối nằm ngay cạnh bảng nó nối."
    en: "Join tables with `JOIN … ON`, so the join condition sits right next to the table it joins."
avoid:
  vi: "Một cross join âm thầm khi điều kiện nối lẫn trong `WHERE` bị quên hay bị xóa nhầm."
  en: "A silent cross join when a join condition mixed into `WHERE` is forgotten or deleted by mistake."
requires: []
skills: [join]
adv: []
sources:
  - https://www.postgresql.org/docs/18/queries-table-expressions.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: same
  setup: null
  bad: |
    SELECT s.name, count(*) AS orders
    FROM orders o, stores s
    WHERE o.store_id = s.id AND o.order_date >= DATE '2026-10-01'
    GROUP BY s.name
    ORDER BY s.name
  good: |
    SELECT s.name, count(*) AS orders
    FROM orders AS o
    JOIN stores AS s ON s.id = o.store_id
    WHERE o.order_date >= DATE '2026-10-01'
    GROUP BY s.name
    ORDER BY s.name
  expect: null
quiz:
  - q:
      vi: "Trong bản dấu phẩy, ai đó xóa nhầm `o.store_id = s.id AND`. Chuyện gì xảy ra?"
      en: "In the comma version, someone deletes `o.store_id = s.id AND` by mistake. What happens?"
    options:
      - { vi: "Postgres báo lỗi cú pháp", en: "Postgres reports a syntax error" }
      - { vi: "Câu vẫn chạy: mỗi đơn ghép với cả 5 cửa hàng, mọi cửa hàng nhận cùng một số đơn", en: "The query still runs: every order pairs with all 5 stores, and every store gets the same order count" }
      - { vi: "Câu trả 0 dòng", en: "The query returns 0 rows" }
    answer: 1
    why:
      vi: "Hai bảng cách nhau bằng dấu phẩy là một cross join; điều kiện nối chỉ là một bộ lọc trong `WHERE`. Mất bộ lọc thì còn cross join. Với `JOIN` mà thiếu `ON`, Postgres báo lỗi cú pháp ngay."
      en: "Two tables separated by a comma are a cross join; the join condition is just a filter in `WHERE`. Lose the filter and the cross join remains. A `JOIN` without `ON` is a syntax error straight away."
---

## Ý chính

Nối bảng bằng `JOIN … ON`. Không liệt kê bảng bằng dấu phẩy rồi để điều kiện nối lẫn với bộ lọc trong `WHERE`.

## Vì sao

- Điều kiện nối nằm cạnh bảng nó nối, nên dễ đọc và dễ kiểm.
- Quên `ON` là lỗi cú pháp, không phải một cross join âm thầm nhân số dòng.
- Đổi sang `LEFT JOIN` chỉ cần sửa một chữ; bản dấu phẩy phải viết lại.
- Kết quả hai bản như nhau: khác ở chỗ người sau sửa có an toàn không.

# EN

## Key idea

Join tables with `JOIN … ON`. Do not list tables with commas and leave the join condition mixed in with the filters in `WHERE`.

## Why

- The join condition sits next to the table it joins, so it is easy to read and check.
- Forgetting `ON` is a syntax error, not a silent cross join that multiplies rows.
- Switching to `LEFT JOIN` is a one-word change; the comma version has to be rewritten.
- Both versions return the same result: the difference is whether the next edit is safe.
