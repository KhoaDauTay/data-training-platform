---
id: e-bp-i01
engine: best
track: postgres
level: L2
module: i
title: "Index cho một truy vấn, rồi kiểm bằng EXPLAIN"
title_en: "Index for a query, then check with EXPLAIN"
kind: quiz
minutes: 3
objectives:
  - vi: "Tạo index từ một truy vấn thật hay chạy, có điều kiện chọn lọc, rồi xác nhận bằng `EXPLAIN` rằng planner dùng nó."
    en: "Create an index from a real, frequent query with a selective condition, then confirm with `EXPLAIN` that the planner uses it."
avoid:
  vi: "Index được tạo \"cho chắc\" mà không truy vấn nào dùng, chỉ tốn chỗ và tốn mỗi lần ghi."
  en: "An index created \"just in case\" that no query uses, costing space and every write."
requires: [e-pg-l1-09, e-pg-l1-10]
skills: [index_design, explain_read]
adv: [a10]
sources:
  - https://www.postgresql.org/docs/18/indexes-intro.html
  - https://www.postgresql.org/docs/18/using-explain.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: runs
  setup: |
    CREATE TABLE payments_plain (id int PRIMARY KEY, order_id int NOT NULL, amount_vnd bigint NOT NULL);
    INSERT INTO payments_plain SELECT i, i / 2, 50000 + i % 7 * 1000 FROM generate_series(1, 20000) AS i;
    CREATE TABLE payments_indexed (id int PRIMARY KEY, order_id int NOT NULL, amount_vnd bigint NOT NULL);
    INSERT INTO payments_indexed SELECT * FROM payments_plain;
    CREATE INDEX payments_indexed_order_ix ON payments_indexed (order_id);
    ANALYZE payments_plain;
    ANALYZE payments_indexed;
  bad: |
    SELECT id, amount_vnd
    FROM payments_plain
    WHERE order_id = 1234
    ORDER BY id
  good: |
    SELECT id, amount_vnd
    FROM payments_indexed
    WHERE order_id = 1234
    ORDER BY id
  expect: { compare: cost }
quiz:
  - q:
      vi: "Bạn vừa tạo index cho câu \"các khoản trả của đơn 1234\". Làm sao biết chắc index đó được dùng?"
      en: "You just created an index for \"the payments of order 1234\". How do you know for sure the index is used?"
    options:
      - { vi: "Index đã tạo thì Postgres luôn dùng", en: "Once an index exists, Postgres always uses it" }
      - { vi: "Chạy `EXPLAIN` câu đó và tìm nút `Index Scan` (hoặc Bitmap) trên bảng", en: "Run `EXPLAIN` on that query and look for an `Index Scan` (or Bitmap) node on the table" }
      - { vi: "Đếm số index trong `pg_indexes`", en: "Count the indexes in `pg_indexes`" }
    answer: 1
    why:
      vi: "Planner chọn theo cost ước lượng, nên có index vẫn có thể là Seq Scan, ví dụ khi điều kiện lấy phần lớn bảng. Chỉ kế hoạch thực thi mới cho biết index có được dùng."
      en: "The planner chooses by estimated cost, so an existing index can still lose to a Seq Scan, for example when the condition matches most of the table. Only the execution plan tells you whether the index is used."
---

## Ý chính

Tạo index từ một truy vấn thật, chạy thường xuyên, có điều kiện chọn lọc (`WHERE`, `JOIN`, `ORDER BY … LIMIT`). Sau khi tạo, chạy `EXPLAIN` để xác nhận planner dùng nó.

## Vì sao

- Index (chỉ mục) không được dùng chỉ tốn chỗ và làm chậm mọi lần ghi.
- Planner chọn kế hoạch thực thi theo cost ước lượng; điều kiện lấy phần lớn bảng thì Seq Scan vẫn thắng.
- `EXPLAIN` là bằng chứng, không phải cảm giác "chắc nó dùng".

## Ví dụ

Hai bảng cùng 20.000 khoản trả, cùng câu. Bảng không có index: `Seq Scan`, cost 359. Bảng có index trên `order_id`: `Index Scan` trên `payments_indexed_order_ix`, cost 8,34.

# EN

## Key idea

Create an index from a real query that runs often and has a selective condition (`WHERE`, `JOIN`, `ORDER BY … LIMIT`). After creating it, run `EXPLAIN` to confirm the planner uses it.

## Why

- An index that is never used only takes space and slows every write.
- The planner picks the execution plan by estimated cost; when a condition matches most of the table, a Seq Scan still wins.
- `EXPLAIN` is evidence, not a feeling that "it probably uses it".

## Example

Two tables with the same 20,000 payments, same query. Without an index: `Seq Scan`, cost 359. With an index on `order_id`: `Index Scan` on `payments_indexed_order_ix`, cost 8.34.
