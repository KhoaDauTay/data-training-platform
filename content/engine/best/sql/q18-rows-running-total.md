---
id: e-bp-q18
engine: best
track: sql
level: L3
module: q
title: "Lũy kế từng dòng: nói rõ khung ROWS"
title_en: "Spell out ROWS for running totals"
kind: quiz
minutes: 3
objectives:
  - vi: "Viết lũy kế từng dòng với `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` và một `ORDER BY` duy nhất trong `OVER`."
    en: "Write a row-by-row running total with `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` and a unique `ORDER BY` in `OVER`."
avoid:
  vi: "Lũy kế nhảy cóc: mọi dòng cùng ngày nhận cùng một tổng thay vì tăng dần."
  en: "A running total that jumps: every row of the same day gets the same total instead of counting up."
requires: []
skills: [window_agg]
adv: [a1]
sources:
  - https://www.postgresql.org/docs/18/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS
  - https://www.postgresql.org/docs/18/tutorial-window.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT id, order_date,
           count(*) OVER (ORDER BY order_date) AS running_orders
    FROM orders
    WHERE store_id = 1 AND order_date >= DATE '2026-10-01'
    ORDER BY order_date, id
  good: |
    SELECT id, order_date,
           count(*) OVER (
             ORDER BY order_date, id
             ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
           ) AS running_orders
    FROM orders
    WHERE store_id = 1 AND order_date >= DATE '2026-10-01'
    ORDER BY order_date, id
  expect: null
quiz:
  - q:
      vi: "Ngày 2026-10-01 có hai đơn. Với `count(*) OVER (ORDER BY order_date)`, đơn đầu tiên của ngày đó có lũy kế bao nhiêu?"
      en: "There are two orders on 2026-10-01. With `count(*) OVER (ORDER BY order_date)`, what running count does the first of them get?"
    options:
      - { vi: "1", en: "1" }
      - { vi: "2", en: "2" }
      - { vi: "NULL", en: "NULL" }
    answer: 1
    why:
      vi: "Khung mặc định là `RANGE … CURRENT ROW`, gồm mọi dòng ngang hàng (cùng `order_date`). Hai đơn cùng ngày đều thấy cả hai, nên đều nhận 2. Với `ROWS` và tiebreaker `id`, chúng nhận 1 rồi 2."
      en: "The default frame is `RANGE … CURRENT ROW`, which includes every peer row (same `order_date`). Both orders of that day see both, so both get 2. With `ROWS` and the `id` tiebreaker they get 1, then 2."
---

## Ý chính

Lũy kế từng dòng thì ghi khung `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, và `ORDER BY` trong `OVER` có tiebreaker duy nhất (`order_date, id`).

## Vì sao

- Khi có `ORDER BY`, khung mặc định là `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`.
- `RANGE` gồm cả các dòng ngang hàng, tức các dòng cùng giá trị sắp xếp. Mọi dòng cùng ngày nhận cùng một tổng, bằng tổng tới hết ngày đó.
- Tổng cuối vẫn đúng, nên lỗi chỉ lộ ra khi ai đó đọc từng dòng.

# EN

## Key idea

For a row-by-row running total, write the frame `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, and give the `ORDER BY` in `OVER` a unique tiebreaker (`order_date, id`).

## Why

- With an `ORDER BY`, the default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`.
- `RANGE` includes peer rows, the rows with the same sort value. Every row of one day gets the same total, the total up to the end of that day.
- The final total is still right, so the mistake only shows when someone reads the rows one by one.
