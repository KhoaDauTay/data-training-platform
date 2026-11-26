---
id: e-bp-a01
engine: best
track: sql
level: L2
module: a
title: "Trục ngày cho kỳ không có dữ liệu"
title_en: "Use a date spine for empty periods"
kind: quiz
minutes: 4
objectives:
  - vi: "Sinh đủ các kỳ bằng `generate_series`, rồi `LEFT JOIN` dữ liệu vào."
    en: "Generate every period with `generate_series`, then `LEFT JOIN` the data onto it."
avoid:
  vi: "Tháng không có đơn biến khỏi báo cáo, biểu đồ nối liền hai điểm xa nhau."
  en: "Months with no orders vanish from the report, and the chart joins two distant points."
requires: []
skills: [date_bucket, left_join]
adv: [a3]
sources:
  - https://www.postgresql.org/docs/18/functions-srf.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT date_trunc('month', order_date)::date AS month, count(*) AS orders
    FROM orders
    WHERE store_id = 4 AND order_date >= DATE '2025-06-01' AND order_date < DATE '2025-12-01'
    GROUP BY date_trunc('month', order_date)
    ORDER BY month
  good: |
    SELECT m.month::date AS month, count(o.id) AS orders
    FROM generate_series(DATE '2025-06-01', DATE '2025-11-01', INTERVAL '1 month') AS m (month)
    LEFT JOIN orders o
      ON o.store_id = 4
     AND o.order_date >= m.month
     AND o.order_date < m.month + INTERVAL '1 month'
    GROUP BY m.month
    ORDER BY m.month
  expect: null
quiz:
  - q:
      vi: "Cửa hàng mở từ tháng 9. Báo cáo tháng 6 tới tháng 11 viết bằng `GROUP BY` trên bảng đơn trả mấy dòng?"
      en: "A store opened in September. A June-to-November report written as a `GROUP BY` on the orders table returns how many rows?"
    options:
      - { vi: "6, các tháng trống có số 0", en: "6, with 0 for the empty months" }
      - { vi: "3, chỉ các tháng có đơn", en: "3, only the months with orders" }
      - { vi: "6, các tháng trống có NULL", en: "6, with NULL for the empty months" }
    answer: 1
    why:
      vi: "`GROUP BY` chỉ tạo nhóm từ dòng có thật. Tháng 6–8 không có đơn nào nên không có nhóm, không ra dòng nào, kể cả dòng 0 hay NULL: chỉ còn 3 dòng (tháng 9–11). Trục ngày (`generate_series`) + `LEFT JOIN` + `count(o.id)` mới cho đủ 6 tháng với số 0."
      en: "`GROUP BY` only builds groups from rows that exist. June to August have no orders, so no group and no row at all, not even a 0 or NULL one: 3 rows remain (September to November). A date spine (`generate_series`) + `LEFT JOIN` + `count(o.id)` gives all 6 months, with 0s."
---

## Ý chính

Báo cáo theo ngày hay tháng phải sinh đủ các kỳ bằng `generate_series`, rồi `LEFT JOIN` dữ liệu vào, thay vì chỉ `GROUP BY` trên bảng sự kiện.

## Vì sao

- Kỳ không có sự kiện nào biến khỏi kết quả.
- Biểu đồ nối thẳng hai điểm xa nhau, trông như dữ liệu liên tục.
- So với kỳ trước (`lag`) sẽ so nhầm kỳ.

## Ví dụ

Cửa hàng 4 mở ngày 2025-09-01. Từ tháng 6 tới tháng 11/2025, bản `GROUP BY` trả 3 tháng. Bản trục ngày trả 6 tháng, ba tháng đầu có 0 đơn.

# EN

## Key idea

A daily or monthly report must generate every period with `generate_series` and `LEFT JOIN` the data onto it, instead of only running `GROUP BY` on the event table.

## Why

- Periods with no events vanish from the result.
- A chart draws a straight line between two distant points, as if the data were continuous.
- A comparison with the previous period (`lag`) compares the wrong periods.

## Example

Store 4 opened on 2025-09-01. From June to November 2025, the `GROUP BY` version returns 3 months. The date-spine version returns 6, with 0 orders in the first three.
