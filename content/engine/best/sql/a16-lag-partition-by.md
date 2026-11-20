---
id: e-bp-a16
engine: best
track: sql
level: L2
module: a
title: "lag/lead theo thực thể phải có PARTITION BY"
title_en: "lag and lead need PARTITION BY the entity"
kind: quiz
minutes: 3
objectives:
  - vi: "Lấy \"đơn trước của cùng khách\" bằng `lag(…) OVER (PARTITION BY customer_id ORDER BY …)`."
    en: "Get \"the same customer's previous order\" with `lag(…) OVER (PARTITION BY customer_id ORDER BY …)`."
avoid:
  vi: "Khoảng cách giữa hai lần mua bị tính từ đơn của một khách khác, mà không có NULL nào báo hiệu."
  en: "A gap between purchases measured from another customer's order, with no NULL to warn you."
requires: []
skills: [window_lag]
adv: [b2]
sources:
  - https://www.postgresql.org/docs/18/tutorial-window.html
  - https://www.postgresql.org/docs/18/functions-window.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT count(*) FILTER (WHERE prev_date IS NOT NULL) AS orders_with_previous
    FROM (
      SELECT customer_id,
             lag(order_date) OVER (ORDER BY customer_id, order_date, id) AS prev_date
      FROM orders
      WHERE customer_id IS NOT NULL
    ) AS t
  good: |
    SELECT count(*) FILTER (WHERE prev_date IS NOT NULL) AS orders_with_previous
    FROM (
      SELECT customer_id,
             lag(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, id) AS prev_date
      FROM orders
      WHERE customer_id IS NOT NULL
    ) AS t
  expect: null
quiz:
  - q:
      vi: "Viết `lag(order_date) OVER (ORDER BY customer_id, order_date)` không có `PARTITION BY`. Đơn đầu tiên của khách 2 nhận giá trị gì?"
      en: "You write `lag(order_date) OVER (ORDER BY customer_id, order_date)` with no `PARTITION BY`. What does customer 2's first order get?"
    options:
      - { vi: "NULL, vì khách 2 chưa có đơn trước", en: "NULL, because customer 2 has no earlier order" }
      - { vi: "Ngày đơn cuối của khách 1", en: "The date of customer 1's last order" }
      - { vi: "Báo lỗi vì thiếu `PARTITION BY`", en: "An error, because `PARTITION BY` is missing" }
    answer: 1
    why:
      vi: "Không có `PARTITION BY`, cả bảng là một partition. Dòng đứng trước đơn đầu của khách 2 là đơn cuối của khách 1, nên `lag` trả ngày đó. Câu vẫn chạy, không báo gì."
      en: "With no `PARTITION BY`, the whole table is one partition. The row before customer 2's first order is customer 1's last order, so `lag` returns that date. The query still runs, with no warning."
---

## Ý chính

"Đơn trước của cùng khách", "tháng trước của cùng cửa hàng": `lag(…)` và `lead(…)` luôn có `PARTITION BY` theo thực thể, và `ORDER BY` có tiebreaker: `OVER (PARTITION BY customer_id ORDER BY order_date, id)`.

## Vì sao

- Thiếu `PARTITION BY`, cả bảng là một partition. Đơn đầu của mỗi khách nhận ngày đơn cuối của khách đứng trước trong thứ tự sắp.
- Đúng ra đơn đầu phải nhận NULL. Khoảng cách giữa hai lần mua bị tính sai mà không có NULL nào báo hiệu.
- Thêm tiebreaker (`id`) để hai đơn cùng ngày luôn có cùng thứ tự.

# EN

## Key idea

"The same customer's previous order", "the same store's previous month": `lag(…)` and `lead(…)` always get a `PARTITION BY` on the entity and an `ORDER BY` with a tiebreaker: `OVER (PARTITION BY customer_id ORDER BY order_date, id)`.

## Why

- Without `PARTITION BY`, the whole table is one partition. Each customer's first order gets the last order date of the customer sorted before them.
- That first order should get NULL. The gap between purchases is wrong, and no NULL warns you.
- Add a tiebreaker (`id`) so two orders on the same day always come in the same order.
