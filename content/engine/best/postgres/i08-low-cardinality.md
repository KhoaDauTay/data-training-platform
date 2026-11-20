---
id: e-bp-i08
engine: best
track: postgres
level: L3
module: i
title: "Cột ít giá trị: index thường vô ích, partial index mới đúng"
title_en: "Low-cardinality columns: a plain index is useless, a partial one helps"
kind: quiz
minutes: 3
objectives:
  - vi: "Không index cột chỉ có vài giá trị để tìm giá trị phổ biến; dùng partial index cho giá trị hiếm mà truy vấn hay tìm."
    en: "Do not index a column with a handful of values to find a common value; use a partial index for the rare value that queries look for."
avoid:
  vi: "Một index trên `status` mà planner không bao giờ dùng, chỉ còn là chi phí ở mỗi lần ghi."
  en: "An index on `status` that the planner never uses, left as a cost on every write."
requires: [e-pg-l1-10, e-pg-l2-03]
skills: [index_design, explain_read]
adv: []
sources:
  - https://www.postgresql.org/docs/18/indexes-partial.html
  - https://www.postgresql.org/docs/18/planner-stats.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: plan
  setup: |
    CREATE TABLE orders (id int PRIMARY KEY, order_date date NOT NULL, status text NOT NULL);
    INSERT INTO orders SELECT i, DATE '2025-01-01' + i % 670, CASE WHEN i % 50 = 0 THEN 'REFUNDED' WHEN i % 10 = 0 THEN 'PENDING' ELSE 'PAID' END FROM generate_series(1, 20000) AS i;
    CREATE INDEX orders_status_ix ON orders (status);
    CREATE INDEX orders_refunded_ix ON orders (order_date) WHERE status = 'REFUNDED';
    ANALYZE orders;
  bad: |
    SELECT count(*) AS orders
    FROM orders
    WHERE status = 'PAID'
  good: |
    SELECT count(*) AS orders
    FROM orders
    WHERE status = 'REFUNDED' AND order_date >= DATE '2026-01-01'
  expect: { table: orders, bad: "Seq Scan", good: "Bitmap Heap Scan" }
quiz:
  - q:
      vi: "90 % đơn có `status = 'PAID'`. Bảng có index trên `status`. Planner đọc `WHERE status = 'PAID'` thế nào?"
      en: "90% of orders have `status = 'PAID'`. The table has an index on `status`. How does the planner read `WHERE status = 'PAID'`?"
    options:
      - { vi: "Qua index trên `status`", en: "Through the index on `status`" }
      - { vi: "Seq Scan, vì gần như phải đọc cả bảng", en: "A Seq Scan, because it has to read almost the whole table anyway" }
      - { vi: "Báo lỗi vì index không hợp", en: "An error, because the index does not fit" }
    answer: 1
    why:
      vi: "Lấy 90 % bảng qua index tốn hơn đọc tuần tự mọi trang, nên planner bỏ qua index. Index đó chỉ còn tốn chỗ và tốn mỗi lần ghi."
      en: "Fetching 90% of a table through an index costs more than reading every page in order, so the planner ignores the index. It only costs space and every write."
---

## Ý chính

Đừng index cột chỉ có vài giá trị (`status`, `channel`) để tìm giá trị phổ biến. Nếu hay tìm giá trị hiếm (`REFUNDED`), dùng partial index cho đúng giá trị đó: `CREATE INDEX … WHERE status = 'REFUNDED'`.

## Vì sao

- Lấy phần lớn bảng qua index tốn hơn đọc tuần tự, nên planner chọn Seq Scan.
- Index không được dùng vẫn phải cập nhật ở mỗi lần ghi.
- Partial index chỉ chứa dòng hiếm nên nhỏ, và vẫn dùng được cho câu có cùng điều kiện.

## Ví dụ

Trên bảng 20.000 đơn của thẻ này, index trên `status` nặng 155.648 byte, còn partial index cho `REFUNDED` nặng 16.384 byte.

# EN

## Key idea

Do not index a column with only a few values (`status`, `channel`) to find a common value. If you often look up a rare value (`REFUNDED`), use a partial index for exactly that value: `CREATE INDEX … WHERE status = 'REFUNDED'`.

## Why

- Fetching most of a table through an index costs more than reading it in order, so the planner picks a Seq Scan.
- An index that is never used still has to be updated on every write.
- A partial index holds only the rare rows, so it is small, and queries with the same condition can still use it.

## Example

On this card's table of 20,000 orders, the index on `status` takes 155,648 bytes; the partial index for `REFUNDED` takes 16,384 bytes.
