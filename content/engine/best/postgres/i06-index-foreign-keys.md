---
id: e-bp-i06
engine: best
track: postgres
level: L2
module: i
title: "Index cột foreign key"
title_en: "Index your foreign keys"
kind: quiz
minutes: 3
objectives:
  - vi: "Tạo index cho cột foreign key ở bảng con, vì Postgres không tự tạo."
    en: "Create an index on the foreign key column of the child table, because Postgres does not create one for you."
avoid:
  vi: "Mỗi lần join từ cha sang con, hay xóa một dòng cha, là một lần quét cả bảng con."
  en: "Every join from parent to child, or every delete of a parent row, scans the whole child table."
requires: [e-pg-l1-04, e-pg-l1-09]
skills: [index_design, join]
adv: []
sources:
  - https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-FK
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: runs
  setup: |
    CREATE TABLE products (id int PRIMARY KEY, name text NOT NULL);
    INSERT INTO products SELECT i, 'Product ' || i FROM generate_series(1, 200) AS i;
    CREATE TABLE lines_a (order_id int NOT NULL, line_no int NOT NULL, product_id int NOT NULL REFERENCES products (id), qty int NOT NULL, PRIMARY KEY (order_id, line_no));
    INSERT INTO lines_a SELECT i / 3, i % 3, 1 + (i * 13) % 200, 1 + i % 5 FROM generate_series(1, 30000) AS i;
    CREATE TABLE lines_b (LIKE lines_a INCLUDING ALL);
    ALTER TABLE lines_b ADD FOREIGN KEY (product_id) REFERENCES products (id);
    INSERT INTO lines_b SELECT * FROM lines_a;
    CREATE INDEX lines_b_product_ix ON lines_b (product_id);
    ANALYZE lines_a;
    ANALYZE lines_b;
  bad: |
    SELECT order_id, qty FROM lines_a WHERE product_id = 7
  good: |
    SELECT order_id, qty FROM lines_b WHERE product_id = 7
  expect: { compare: cost }
quiz:
  - q:
      vi: "Bạn khai `product_id int REFERENCES products (id)` ở bảng dòng hàng. Postgres tự tạo index nào?"
      en: "You declare `product_id int REFERENCES products (id)` on the order lines table. Which index does Postgres create for you?"
    options:
      - { vi: "Index trên `product_id` của bảng dòng hàng", en: "An index on the lines table's `product_id`" }
      - { vi: "Không có index mới; chỉ `products (id)` đã có index nhờ khóa chính", en: "No new index; only `products (id)` is indexed, by its primary key" }
      - { vi: "Cả hai bên", en: "Both sides" }
    answer: 1
    why:
      vi: "Postgres tự tạo index cho PRIMARY KEY và UNIQUE, không cho foreign key. Bên tham chiếu (bảng con) cần index riêng nếu bạn join hoặc xóa dòng cha thường xuyên."
      en: "Postgres creates indexes for PRIMARY KEY and UNIQUE, not for foreign keys. The referencing side (the child table) needs its own index if you join or delete parent rows often."
---

## Ý chính

Cột foreign key ở bảng con (như `product_id` của dòng hàng) thường cần index riêng. Postgres tự tạo index cho PRIMARY KEY và UNIQUE, **không** tự tạo cho foreign key.

## Vì sao

- Join từ cha sang con phải tìm các dòng con theo cột đó.
- Mỗi `DELETE` hay `UPDATE` khóa ở bảng cha cũng phải tìm dòng con để kiểm ràng buộc.
- Thiếu index thì mỗi lần là một lần quét cả bảng con.

## Ví dụ

Cùng 30.000 dòng hàng, tìm dòng của sản phẩm 7. Không index: `Seq Scan`, cost 538. Có index trên `product_id`: `Bitmap Heap Scan`, cost 173,7.

# EN

## Key idea

The foreign key column of a child table (such as an order line's `product_id`) usually needs its own index. Postgres creates indexes for PRIMARY KEY and UNIQUE, **not** for foreign keys.

## Why

- A join from parent to child must find child rows by that column.
- Every `DELETE` or key `UPDATE` on the parent must also find child rows to check the constraint.
- Without an index, each of these scans the whole child table.

## Example

Same 30,000 order lines, looking up product 7. No index: `Seq Scan`, cost 538. With an index on `product_id`: `Bitmap Heap Scan`, cost 173.7.
