---
id: e-bp-i02
engine: best
track: postgres
level: L3
module: i
title: "Index nhiều cột: cột so bằng trước, cột khoảng sau"
title_en: "Composite indexes: equality first, range last"
kind: quiz
minutes: 4
objectives:
  - vi: "Xếp cột của index nhiều cột: các cột so `=` trước, cột so khoảng hoặc cột sắp xếp sau cùng."
    en: "Order the columns of a multicolumn index: `=` columns first, the range or sort column last."
avoid:
  vi: "Index đọc gần cả khoảng ngày của mọi cửa hàng chỉ để lấy một cửa hàng."
  en: "An index that reads the date range of every store just to answer for one store."
requires: [e-pg-l2-01]
skills: [index_design]
adv: []
sources:
  - https://www.postgresql.org/docs/18/indexes-multicolumn.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: runs
  setup: |
    CREATE TABLE orders_a (id int PRIMARY KEY, store_id int NOT NULL, order_date date NOT NULL);
    INSERT INTO orders_a SELECT i, i % 20, DATE '2025-01-01' + (i * 7) % 670 FROM generate_series(1, 20000) AS i;
    CREATE TABLE orders_b AS SELECT * FROM orders_a;
    CREATE INDEX orders_a_date_store_ix ON orders_a (order_date, store_id);
    CREATE INDEX orders_b_store_date_ix ON orders_b (store_id, order_date);
    ANALYZE orders_a;
    ANALYZE orders_b;
  bad: |
    SELECT count(*) AS orders
    FROM orders_a
    WHERE store_id = 3 AND order_date >= DATE '2026-01-01'
  good: |
    SELECT count(*) AS orders
    FROM orders_b
    WHERE store_id = 3 AND order_date >= DATE '2026-01-01'
  expect: { compare: cost }
quiz:
  - q:
      vi: "Truy vấn hay chạy là `WHERE store_id = 3 AND order_date >= DATE '2026-01-01'`. Index nào tốt hơn?"
      en: "The hot query is `WHERE store_id = 3 AND order_date >= DATE '2026-01-01'`. Which index is better?"
    options:
      - { vi: "`(order_date, store_id)`", en: "`(order_date, store_id)`" }
      - { vi: "`(store_id, order_date)`", en: "`(store_id, order_date)`" }
      - { vi: "Như nhau, thứ tự cột không quan trọng", en: "The same, column order does not matter" }
    answer: 1
    why:
      vi: "Với `(store_id, order_date)`, các khóa của cửa hàng 3 nằm liền nhau, xếp theo ngày: Postgres đọc đúng một đoạn. Với `(order_date, store_id)`, phải đọc mọi cửa hàng trong khoảng ngày rồi lọc lại."
      en: "With `(store_id, order_date)`, store 3's keys sit together, sorted by date: Postgres reads exactly one slice. With `(order_date, store_id)`, it must read every store in the date range and filter."
---

## Ý chính

Index nhiều cột đặt các cột so sánh bằng (`=`) trước, cột so sánh khoảng (`>=`, `<`, `BETWEEN`) hoặc cột sắp xếp sau cùng.

## Vì sao

- Phần index phải đọc được xác định bởi điều kiện `=` trên các cột đầu, cộng điều kiện khoảng trên cột ngay sau.
- Cột khoảng đứng đầu buộc đọc mọi `store_id` trong khoảng ngày rồi lọc lại.
- Từ PostgreSQL 18, B-tree có skip scan, nhưng thứ tự "bằng trước, khoảng sau" vẫn rẻ nhất.

## Ví dụ

Cùng 20.000 đơn, cùng câu hỏi, cùng 447 đơn. Index `(order_date, store_id)`: `Bitmap Index Scan` cost 135,5, tổng cost 252,6. Index `(store_id, order_date)`: `Bitmap Index Scan` cost 8,9, tổng cost 145.

# EN

## Key idea

A multicolumn index puts the equality (`=`) columns first and the range (`>=`, `<`, `BETWEEN`) or sort column last.

## Why

- The part of the index to read is fixed by the `=` conditions on the leading columns plus a range on the next column.
- A leading range column forces a read of every `store_id` in the date range, then a filter.
- PostgreSQL 18 B-trees have skip scan, but "equality first, range last" is still the cheapest.

## Example

Same 20,000 orders, same question, same 447 orders. Index `(order_date, store_id)`: `Bitmap Index Scan` cost 135.5, total cost 252.6. Index `(store_id, order_date)`: `Bitmap Index Scan` cost 8.9, total cost 145.
