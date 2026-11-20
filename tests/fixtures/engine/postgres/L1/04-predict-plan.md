---
id: e-pg-l1-04
engine: postgres
level: L1
module: types
title: Đoán kế hoạch của một câu lọc
title_en: Guess the plan of a filter
kind: predict
minutes: 4
objectives:
  - vi: Đoán planner đọc bảng bằng nút nào
    en: Guess which node the planner reads the table with
requires: [e-pg-l1-01]
sources:
  - https://www.postgresql.org/docs/current/using-explain.html
lab:
  setup: |
    CREATE TABLE orders (id int PRIMARY KEY, status text);
    INSERT INTO orders SELECT g, CASE WHEN g % 2 = 0 THEN 'paid' ELSE 'new' END FROM generate_series(1, 2000) g;
    CREATE INDEX orders_status_idx ON orders (status);
    ANALYZE orders;
  steps:
    - task:
        vi: Đếm các đơn `paid`.
        en: Count the `paid` orders.
      solution: SELECT count(*) FROM orders WHERE status = 'paid'
      check: rows
      hint:
        vi: Lọc theo trạng thái rồi đếm.
        en: Filter on the status, then count.
predict:
  sql: SELECT * FROM orders WHERE status = 'paid'
  q:
    vi: Một nửa bảng có trạng thái `paid`. Planner đọc bằng nút nào?
    en: Half the table has status `paid`. Which node does the planner read it with?
  options:
    - vi: Index Scan qua `orders_status_idx`
      en: Index Scan through `orders_status_idx`
    - vi: Seq Scan có Filter
      en: Seq Scan with a Filter
  answer: 1
  expect: { node: Seq Scan, table: orders }
  why:
    vi: Đọc một nửa bảng qua index tốn nhiều bước nhảy trang hơn đọc tuần tự, nên Seq Scan rẻ hơn.
    en: Reading half the table through an index costs more page jumps than a sequential read, so the Seq Scan is cheaper.
---

## Ý chính

Đoán trước, rồi bấm Xem thật để thấy kế hoạch thật.

# EN

## Key idea

Guess first, then press See it for real to see the real plan.
