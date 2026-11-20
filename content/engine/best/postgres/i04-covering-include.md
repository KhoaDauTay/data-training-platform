---
id: e-bp-i04
engine: best
track: postgres
level: L3
module: i
title: "Covering index với INCLUDE cho index-only scan"
title_en: "Covering indexes with INCLUDE"
kind: quiz
minutes: 4
objectives:
  - vi: "Thêm các cột mà truy vấn nóng đọc vào index bằng `INCLUDE (…)`, và giữ bảng được vacuum."
    en: "Add the columns a hot query reads to the index with `INCLUDE (…)`, and keep the table vacuumed."
avoid:
  vi: "Index tìm đúng dòng nhưng vẫn phải đọc heap cho mỗi dòng."
  en: "An index that finds the right rows but still visits the heap for each one."
requires: [e-pg-l2-02, e-pg-l3-09]
skills: [index_design]
adv: [a10]
sources:
  - https://www.postgresql.org/docs/18/indexes-index-only-scans.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine-hb
  check: runs
  setup: |
    CREATE TABLE orders_x (id int PRIMARY KEY, store_id int NOT NULL, order_date date NOT NULL, note text);
    INSERT INTO orders_x SELECT i, i % 50, DATE '2025-01-01' + i % 670, repeat('x', 40) FROM generate_series(1, 20000) AS i;
    CREATE TABLE orders_y AS SELECT * FROM orders_x;
    CREATE INDEX orders_x_store_ix ON orders_x (store_id);
    CREATE INDEX orders_y_store_cover_ix ON orders_y (store_id) INCLUDE (order_date);
    VACUUM ANALYZE orders_x;
    VACUUM ANALYZE orders_y;
  bad: |
    SELECT store_id, order_date FROM orders_x WHERE store_id = 3
  good: |
    SELECT store_id, order_date FROM orders_y WHERE store_id = 3
  expect: { compare: cost }
quiz:
  - q:
      vi: "Index `(store_id) INCLUDE (order_date)`. Truy vấn `SELECT store_id, order_date … WHERE store_id = 3` trên bảng vừa `VACUUM` có thể đọc bằng nút nào?"
      en: "Index `(store_id) INCLUDE (order_date)`. Which node can `SELECT store_id, order_date … WHERE store_id = 3` use on a table just after `VACUUM`?"
    options:
      - { vi: "`Seq Scan`", en: "`Seq Scan`" }
      - { vi: "`Index Only Scan`", en: "`Index Only Scan`" }
      - { vi: "`Bitmap Heap Scan`, vì `INCLUDE` không dùng để tìm", en: "`Bitmap Heap Scan`, because `INCLUDE` is not searchable" }
    answer: 1
    why:
      vi: "Mọi cột truy vấn cần đều có trong index, và visibility map báo các trang đều thấy được, nên Postgres trả kết quả từ index mà không đọc heap. `INCLUDE` không cần để tìm, chỉ cần để trả."
      en: "Every column the query needs is in the index, and the visibility map says the pages are all-visible, so Postgres answers from the index without reading the heap. `INCLUDE` columns need not be searchable, only returnable."
---

## Ý chính

Truy vấn nóng chỉ đọc vài cột thì thêm các cột đó vào index bằng `INCLUDE (…)`. Giữ bảng được vacuum để visibility map cho phép index-only scan.

## Vì sao

- Index-only scan trả kết quả từ index, không đọc heap.
- Cột trong `INCLUDE` không vào thứ tự khóa và không bị ràng buộc `UNIQUE`.
- Đừng nhét cột rộng: index phình theo.

## Ví dụ

Cùng 20.000 đơn, đã `VACUUM ANALYZE`. Index `(store_id)`: `Bitmap Heap Scan`, cost 220,8. Index `(store_id) INCLUDE (order_date)`: `Index Only Scan`, cost 15,3. Cả hai trả cùng 400 dòng.

# EN

## Key idea

When a hot query reads only a few columns, add them to the index with `INCLUDE (…)`. Keep the table vacuumed so the visibility map allows an index-only scan.

## Why

- An index-only scan answers from the index without reading the heap.
- `INCLUDE` columns are not part of the key order and are not bound by `UNIQUE`.
- Do not stuff in wide columns: the index grows with them.

## Example

Same 20,000 orders, after `VACUUM ANALYZE`. Index `(store_id)`: `Bitmap Heap Scan`, cost 220.8. Index `(store_id) INCLUDE (order_date)`: `Index Only Scan`, cost 15.3. Both return the same 400 rows.
