---
id: e-bp-p35
engine: best
track: postgres
level: L3
module: p
title: "Báo cáo nhiều câu: một snapshot REPEATABLE READ READ ONLY"
title_en: "One snapshot for a multi-query report"
kind: quiz
minutes: 3
objectives:
  - vi: "Chạy các câu của một báo cáo (tổng, chi tiết, tỷ lệ) trong một `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`."
    en: "Run the queries of one report (total, detail, ratio) inside one `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`."
avoid:
  vi: "Dòng tổng và bảng chi tiết của cùng một báo cáo không khớp nhau vì có người ghi xen giữa hai câu."
  en: "A report whose total and detail table disagree because someone wrote between the two queries."
requires: [e-pg-l4-12]
skills: [aggregate]
adv: []
sources:
  - https://www.postgresql.org/docs/18/transaction-iso.html#XACT-REPEATABLE-READ
  - https://www.postgresql.org/docs/18/sql-set-transaction.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    SELECT sum(total_vnd) AS revenue_vnd
    FROM orders
    WHERE order_date >= DATE '2026-10-01' AND order_date < DATE '2026-11-01';
    SELECT order_date, sum(total_vnd) AS revenue_vnd
    FROM orders
    WHERE order_date >= DATE '2026-10-01' AND order_date < DATE '2026-11-01'
    GROUP BY order_date
    ORDER BY order_date;
  good: |
    BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
    SELECT sum(total_vnd) AS revenue_vnd
    FROM orders
    WHERE order_date >= DATE '2026-10-01' AND order_date < DATE '2026-11-01';
    SELECT order_date, sum(total_vnd) AS revenue_vnd
    FROM orders
    WHERE order_date >= DATE '2026-10-01' AND order_date < DATE '2026-11-01'
    GROUP BY order_date
    ORDER BY order_date;
    COMMIT;
  expect: null
quiz:
  - q:
      vi: "Báo cáo chạy hai câu ở mức mặc định Read Committed. Giữa hai câu, một phiên khác ghi thêm một đơn tháng 10. Chuyện gì có thể xảy ra?"
      en: "A report runs two queries at the default Read Committed level. Between them, another session commits a new October order. What can happen?"
    options:
      - { vi: "Không gì: hai câu luôn thấy cùng dữ liệu", en: "Nothing: both queries always see the same data" }
      - { vi: "Câu thứ hai thấy đơn mới, câu thứ nhất thì không, nên tổng và chi tiết lệch nhau", en: "The second query sees the new order and the first does not, so total and detail disagree" }
      - { vi: "Câu thứ hai báo lỗi", en: "The second query fails" }
    answer: 1
    why:
      vi: "Ở Read Committed, mỗi câu lấy một snapshot mới. Ở Repeatable Read, mọi câu trong transaction thấy cùng snapshot từ câu đầu tiên, nên các con số khớp nhau."
      en: "At Read Committed, each statement takes a fresh snapshot. At Repeatable Read, every statement in the transaction sees the snapshot taken at the first one, so the figures agree."
---

## Ý chính

Báo cáo gồm nhiều câu (tổng, chi tiết, tỷ lệ) chạy trong một `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, để mọi câu thấy cùng dữ liệu.

## Vì sao

- Ở mức cô lập (isolation level) mặc định Read Committed, mỗi câu thấy dữ liệu mới nhất, nên tổng và chi tiết có thể lệch khi có người đang ghi.
- Repeatable Read giữ một snapshot từ câu đầu tiên cho cả transaction.
- `READ ONLY` từ chối mọi lệnh ghi lỡ tay (lỗi `25006`), và transaction chỉ đọc ở mức này không phải thử lại vì lỗi tuần tự hóa.
- Cần hai phiên mới thấy được chỗ lệch, nên thẻ này chỉ có cú pháp.

# EN

## Key idea

A report made of several queries (total, detail, ratio) runs inside one `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, so every query sees the same data.

## Why

- At the default isolation level, Read Committed, each query sees the latest data, so total and detail can disagree while someone is writing.
- Repeatable Read keeps one snapshot, taken at the first query, for the whole transaction.
- `READ ONLY` refuses any accidental write (error `25006`), and a read-only transaction at this level never needs a retry for a serialization failure.
- Seeing the mismatch needs two sessions, so this card is syntax only.
