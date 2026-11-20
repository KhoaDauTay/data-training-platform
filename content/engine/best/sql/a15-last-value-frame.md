---
id: e-bp-a15
engine: best
track: sql
level: L3
module: a
title: "last_value cần khung tới cuối partition"
title_en: "last_value needs a frame to the end of the partition"
kind: quiz
minutes: 3
objectives:
  - vi: "Dùng `last_value` với khung `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`, hoặc đảo chiều sang `first_value(…) OVER (… ORDER BY … DESC)`."
    en: "Use `last_value` with the frame `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`, or flip it to `first_value(…) OVER (… ORDER BY … DESC)`."
avoid:
  vi: "\"Ngày đơn cuối\" trả về ngày của chính dòng hiện tại, nên mỗi cửa hàng có hàng trăm \"ngày cuối\"."
  en: "A \"last order date\" that returns the current row's own date, so each store gets hundreds of \"last dates\"."
requires: []
skills: [window_agg]
adv: [a1]
sources:
  - https://www.postgresql.org/docs/18/functions-window.html
  - https://www.postgresql.org/docs/18/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT count(*) AS store_dates
    FROM (
      SELECT DISTINCT store_id,
             last_value(order_date) OVER (PARTITION BY store_id ORDER BY order_date) AS last_order
      FROM orders
    ) AS t
  good: |
    SELECT count(*) AS store_dates
    FROM (
      SELECT DISTINCT store_id,
             last_value(order_date) OVER (
               PARTITION BY store_id ORDER BY order_date
               ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
             ) AS last_order
      FROM orders
    ) AS t
  expect: null
quiz:
  - q:
      vi: "`last_value(order_date) OVER (PARTITION BY store_id ORDER BY order_date)` không ghi khung. Ở mỗi dòng nó trả gì?"
      en: "`last_value(order_date) OVER (PARTITION BY store_id ORDER BY order_date)` with no frame. What does it return on each row?"
    options:
      - { vi: "Ngày đơn cuối cùng của cửa hàng", en: "The store's last order date" }
      - { vi: "Ngày của chính dòng đó (dòng cuối của khung mặc định)", en: "That row's own date (the last row of the default frame)" }
      - { vi: "NULL", en: "NULL" }
    answer: 1
    why:
      vi: "Có `ORDER BY`, khung mặc định chạy từ đầu partition tới dòng hiện tại (và các dòng ngang hàng). Dòng cuối của khung đó là dòng hiện tại, nên `last_value` trả ngày của chính nó."
      en: "With `ORDER BY`, the default frame runs from the start of the partition to the current row (and its peers). The last row of that frame is the current row, so `last_value` returns its own date."
---

## Ý chính

Dùng `last_value` (hay `nth_value`) thì luôn ghi khung `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`. Cách khác: đảo chiều, `first_value(…) OVER (… ORDER BY … DESC)`.

## Vì sao

- Khi `OVER` có `ORDER BY`, khung mặc định chỉ chạy tới dòng hiện tại và các dòng ngang hàng.
- Nên `last_value` trả về giá trị của chính dòng hiện tại, không phải của dòng cuối partition. Docs chính thức nói khung này "likely to give unhelpful results for last_value".
- Câu vẫn chạy và ra số, chỉ là sai.

# EN

## Key idea

When you use `last_value` (or `nth_value`), always write the frame `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`. Or flip it: `first_value(…) OVER (… ORDER BY … DESC)`.

## Why

- When `OVER` has an `ORDER BY`, the default frame only runs up to the current row and its peers.
- So `last_value` returns the current row's own value, not the last row of the partition. The official docs say this frame is "likely to give unhelpful results for last_value".
- The query still runs and returns numbers; they are just wrong.
