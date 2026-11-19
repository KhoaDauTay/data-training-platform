---
id: e-bp-q11
engine: best
track: sql
level: L2
module: q
title: "Điều kiện sargable: đừng bọc cột trong hàm"
title_en: "Keep predicates sargable"
kind: quiz
minutes: 3
objectives:
  - vi: "Viết điều kiện để cột đứng một mình ở một vế (`col >= a AND col < b`), cho index dùng được."
    en: "Write conditions with the bare column on one side (`col >= a AND col < b`), so an index can be used."
avoid:
  vi: "Quét cả bảng dù cột đã có index, chỉ vì cột bị bọc trong hàm."
  en: "A full table scan on an indexed column, only because the column is wrapped in a function."
requires: [e-pg-l1-10, e-pg-l2-04]
skills: [sargable, explain_read]
adv: []
sources:
  - https://www.postgresql.org/docs/18/indexes-types.html
  - https://www.postgresql.org/docs/18/indexes-expressional.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: plan
  setup: null
  bad: |
    SELECT count(*) AS orders
    FROM orders
    WHERE date_trunc('month', order_date) = DATE '2026-10-01'
  good: |
    SELECT count(*) AS orders
    FROM orders
    WHERE order_date >= DATE '2026-10-01' AND order_date < DATE '2026-11-01'
  expect: { table: orders, bad: "Seq Scan", good: "Index Only Scan" }
lint:
  rule: q11
  tip:
    vi: "Câu này chạy đúng. Nhưng cột bị bọc trong hàm ở `WHERE`, nên index trên cột đó không dùng được. Thử viết thành khoảng trên chính cột."
    en: "This query is correct. But the column is wrapped in a function in `WHERE`, so its index cannot be used. Try a range on the bare column."
quiz:
  - q:
      vi: "Bảng `orders` có index B-tree trên `order_date`. Điều kiện nào cho phép dùng index đó?"
      en: "Table `orders` has a B-tree index on `order_date`. Which condition lets that index be used?"
    options:
      - { vi: "`date_trunc('month', order_date) = DATE '2026-10-01'`", en: "`date_trunc('month', order_date) = DATE '2026-10-01'`" }
      - { vi: "`extract(month FROM order_date) = 10`", en: "`extract(month FROM order_date) = 10`" }
      - { vi: "`order_date >= DATE '2026-10-01' AND order_date < DATE '2026-11-01'`", en: "`order_date >= DATE '2026-10-01' AND order_date < DATE '2026-11-01'`" }
    answer: 2
    why:
      vi: "Index B-tree lưu giá trị của chính `order_date`. Nó trả lời được `<`, `<=`, `=`, `>=`, `>` trên cột đó, không trả lời được một biểu thức tính từ cột, trừ khi có index trên đúng biểu thức ấy."
      en: "A B-tree index stores the values of `order_date` itself. It answers `<`, `<=`, `=`, `>=`, `>` on that column, not on an expression computed from it, unless there is an index on that exact expression."
---

## Ý chính

Viết điều kiện để cột đứng một mình ở một vế: `col >= a AND col < b`. Đừng viết `date_trunc('month', col) = …` hay `extract(year FROM col) = …`.

## Vì sao

- Index B-tree trên `order_date` chỉ dùng được khi điều kiện so sánh chính cột đó.
- Hàm bọc cột buộc đọc cả bảng, trừ khi có index trên đúng biểu thức ấy (expression index).
- Hai cách cho cùng kết quả, chỉ khác giá.

## Ví dụ

Trên `lab`, hai câu cùng đếm 217 đơn tháng 10/2026. Bản `date_trunc` đọc cả bảng bằng `Seq Scan`, cost 42. Bản khoảng ngày đọc qua index: `Index Only Scan`, cost 9,3, sau khi bảng đã `VACUUM ANALYZE`; trước đó là `Bitmap Heap Scan`, cost 27,5.

# EN

## Key idea

Write conditions with the bare column on one side: `col >= a AND col < b`. Do not write `date_trunc('month', col) = …` or `extract(year FROM col) = …`.

## Why

- A B-tree index on `order_date` is only usable when the condition compares that column itself.
- A function around the column forces a read of the whole table, unless there is an index on that exact expression (an expression index).
- Both versions give the same result; only the cost differs.

## Example

On `lab`, both queries count 217 orders in October 2026. The `date_trunc` version reads the whole table with a `Seq Scan`, cost 42. The date-range version goes through the index: an `Index Only Scan`, cost 9.3, once the table has had `VACUUM ANALYZE`; before that, a `Bitmap Heap Scan`, cost 27.5.
