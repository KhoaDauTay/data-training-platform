---
id: e-bp-i03
engine: best
track: postgres
level: L3
module: i
title: "Partial index cho tập con hay hỏi"
title_en: "Partial indexes for the hot subset"
kind: quiz
minutes: 3
objectives:
  - vi: "Index chỉ tập con mà truy vấn luôn nhắm tới, bằng `CREATE INDEX … WHERE …`."
    en: "Index only the subset a query always targets, with `CREATE INDEX … WHERE …`."
avoid:
  vi: "Một index to gấp mười lần cần thiết, tốn bộ nhớ và tốn mỗi lần ghi."
  en: "An index ten times bigger than needed, costing memory and every write."
requires: [e-pg-l2-03]
skills: [index_design]
adv: []
sources:
  - https://www.postgresql.org/docs/18/indexes-partial.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: runs
  setup: |
    CREATE TABLE web_orders (id int PRIMARY KEY, customer_id int NOT NULL, delivered_on date);
    INSERT INTO web_orders SELECT i, i % 500, CASE WHEN i % 40 = 0 THEN NULL ELSE DATE '2026-01-01' + i % 300 END FROM generate_series(1, 20000) AS i;
    CREATE INDEX web_orders_cust_ix ON web_orders (customer_id);
    CREATE INDEX web_orders_cust_pending_ix ON web_orders (customer_id) WHERE delivered_on IS NULL;
    ANALYZE web_orders;
  bad: |
    SELECT pg_relation_size('web_orders_cust_ix') AS index_bytes
  good: |
    SELECT pg_relation_size('web_orders_cust_pending_ix') AS index_bytes
  expect: { compare: size }
quiz:
  - q:
      vi: "Index `ON web_orders (customer_id) WHERE delivered_on IS NULL`. Truy vấn nào dùng được nó?"
      en: "Index `ON web_orders (customer_id) WHERE delivered_on IS NULL`. Which query can use it?"
    options:
      - { vi: "`WHERE customer_id = 40`", en: "`WHERE customer_id = 40`" }
      - { vi: "`WHERE customer_id = 40 AND delivered_on IS NULL`", en: "`WHERE customer_id = 40 AND delivered_on IS NULL`" }
      - { vi: "`WHERE delivered_on IS NOT NULL`", en: "`WHERE delivered_on IS NOT NULL`" }
    answer: 1
    why:
      vi: "Index này chỉ chứa đơn chưa giao. Planner chỉ dùng nó khi điều kiện của truy vấn bảo đảm mọi dòng cần tìm nằm trong đó, tức có `delivered_on IS NULL`. Câu chỉ có `customer_id = 40` cũng cần đơn đã giao, không có trong index; câu `IS NOT NULL` lại cần đúng các dòng index bỏ ra."
      en: "This index holds only undelivered orders. The planner uses it only when the query's condition guarantees every wanted row is inside, which means it has `delivered_on IS NULL`. The query with only `customer_id = 40` also wants delivered orders, which are not in the index; the `IS NOT NULL` query wants exactly the rows the index leaves out."
---

## Ý chính

Khi truy vấn luôn nhắm một tập con nhỏ (đơn chưa giao, việc đang chờ), index chỉ tập đó: `CREATE INDEX … WHERE delivered_on IS NULL`.

## Vì sao

- Index nhỏ hơn nhiều, rẻ hơn khi ghi, dễ nằm vừa bộ nhớ.
- Planner dùng nó khi điều kiện của truy vấn suy ra được điều kiện của index.
- Dòng ngoài tập con không tốn gì trong index.

## Ví dụ

Bảng 20.000 đơn, 500 đơn chưa giao. Index đủ trên `customer_id` nặng 163.840 byte (`pg_relation_size`). Partial index chỉ đơn chưa giao nặng 16.384 byte, và câu "đơn chưa giao của khách 40" vẫn đọc bằng `Index Scan` trên nó.

# EN

## Key idea

When queries always target a small subset (orders not yet delivered, pending jobs), index only that subset: `CREATE INDEX … WHERE delivered_on IS NULL`.

## Why

- The index is much smaller, cheaper on every write, and more likely to fit in memory.
- The planner uses it when the query's condition implies the index's condition.
- Rows outside the subset cost nothing in the index.

## Example

A table of 20,000 orders, 500 not yet delivered. The full index on `customer_id` takes 163,840 bytes (`pg_relation_size`). The partial index on undelivered orders takes 16,384 bytes, and the question "undelivered orders of customer 40" still reads it with an `Index Scan`.
