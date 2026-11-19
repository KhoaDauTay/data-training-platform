---
id: e-pg-l1-10
engine: postgres
level: L1
module: first-index
title: "Có index, sao vẫn Seq Scan?"
title_en: "There is an index, so why a Seq Scan?"
kind: predict
runtime: browser
minutes: 8
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
viz: pg-plan-tree
objectives:
  - vi: "Đọc một dòng `EXPLAIN`: tên nút, `cost=A..B`, `rows=` ước lượng."
    en: "Read an `EXPLAIN` line: the node name, `cost=A..B`, the estimated `rows=`."
  - vi: Giải thích vì sao planner bỏ qua index khi câu lấy phần lớn bảng.
    en: Explain why the planner skips an index when a query reads most of the table.
requires: [e-pg-l1-09]
sources:
  - https://www.postgresql.org/docs/18/using-explain.html
  - https://www.postgresql.org/docs/18/indexes-intro.html
lab:
  setup: |
    CREATE TABLE orders (
      id bigint PRIMARY KEY,
      status text NOT NULL,
      amount numeric(10,2) NOT NULL
    );
    INSERT INTO orders
    SELECT g,
           CASE g % 20 WHEN 0 THEN 'cancelled' WHEN 1 THEN 'new' ELSE 'paid' END,
           (g % 500) + 0.99
    FROM generate_series(1, 20000) AS g;
    CREATE INDEX orders_status_idx ON orders (status);
    ANALYZE orders;
  steps:
    - task:
        vi: "Viết câu lấy `id, amount` của các đơn `status = 'new'`. Kế hoạch phải đi qua `orders_status_idx`."
        en: "Write a query returning `id, amount` of the orders with `status = 'new'`. The plan must go through `orders_status_idx`."
      solution: SELECT id, amount FROM orders WHERE status = 'new'
      check: plan
      hint:
        vi: Chỉ 5 % đơn là "new", đủ ít để index có lợi.
        en: Only 5% of orders are "new", few enough for the index to pay off.
predict:
  sql: SELECT * FROM orders WHERE status = 'paid'
  expect: { node: Seq Scan, table: orders }
  q:
    vi: "Bảng `orders` có 20.000 đơn, 90 % là 'paid', và có index `orders_status_idx` trên `status`. Postgres đọc câu này thế nào?"
    en: "Table `orders` has 20,000 orders, 90% of them 'paid', and an index `orders_status_idx` on `status`. How does Postgres read this query?"
  options:
    - { vi: "Index Scan dùng `orders_status_idx`", en: "Index Scan using `orders_status_idx`" }
    - { vi: "Bitmap Heap Scan dùng `orders_status_idx`", en: "Bitmap Heap Scan using `orders_status_idx`" }
    - { vi: "Seq Scan trên `orders`", en: "Seq Scan on `orders`" }
    - { vi: "Index Only Scan", en: "Index Only Scan" }
  answer: 2
  why:
    vi: "Câu lấy khoảng 18.000 trên 20.000 dòng, tức gần như mọi trang của bảng. Đi qua index rồi nhảy tới từng dòng tốn hơn đọc thẳng cả bảng theo thứ tự, nên planner chọn Seq Scan với `Filter: (status = 'paid'::text)`. Index chỉ có lợi khi câu lấy một phần nhỏ của bảng."
    en: "The query takes about 18,000 of 20,000 rows, which is nearly every page of the table. Going through the index and jumping to each row costs more than reading the whole table in order, so the planner picks a Seq Scan with `Filter: (status = 'paid'::text)`. An index only pays off when a query reads a small part of the table."
---
## Ý chính

Mỗi câu SQL đi qua bốn tầng: parser đọc chữ, rewriter mở view, planner chọn cách chạy rẻ nhất, executor chạy. `EXPLAIN` in ra lựa chọn của planner mà không chạy câu.

Mỗi dòng của kế hoạch là một nút, ví dụ `Seq Scan on orders (cost=0.00..379.00 rows=18000 width=19)`:

- `Seq Scan`, `Index Scan`, `Bitmap Heap Scan`...: cách đọc bảng.
- `cost=A..B`: chi phí ước lượng để ra dòng đầu và để xong. Đơn vị là "chi phí planner" (mặc định đọc tuần tự một trang = 1), không phải mili giây.
- `rows=`: số dòng planner đoán, dựa vào thống kê do `ANALYZE` thu.

Planner so chi phí từng cách. Lấy ít dòng thì index thắng; lấy phần lớn bảng thì đọc tuần tự thắng, vì đọc tuần tự rẻ hơn nhảy ngẫu nhiên tới từng trang.

## Ví dụ

```sql
EXPLAIN SELECT * FROM orders WHERE status = 'new';
```

Chỉ 5 % đơn là 'new', nên kế hoạch đổi sang Bitmap Heap Scan qua `orders_status_idx`.

## Thực hành

Chọn đáp án, rồi bấm "Xem thật" để so với kế hoạch thật của PGlite.

# EN

## Key idea

Every SQL statement goes through four stages: the parser reads the text, the rewriter expands views, the planner picks the cheapest way to run it, the executor runs it. `EXPLAIN` prints the planner's choice without running the query.

Each line of a plan is a node, for example `Seq Scan on orders (cost=0.00..379.00 rows=18000 width=19)`:

- `Seq Scan`, `Index Scan`, `Bitmap Heap Scan`...: how the table is read.
- `cost=A..B`: estimated cost to return the first row and to finish. The unit is "planner cost" (by default one sequential page read = 1), not milliseconds.
- `rows=`: the number of rows the planner expects, based on statistics gathered by `ANALYZE`.

The planner compares the cost of each option. Few rows: the index wins. Most of the table: a sequential read wins, because reading in order is cheaper than jumping randomly to each page.

## Example

```sql
EXPLAIN SELECT * FROM orders WHERE status = 'new';
```

Only 5% of orders are 'new', so the plan switches to a Bitmap Heap Scan through `orders_status_idx`.

## Practice

Pick an answer, then press "See the real plan" to compare with PGlite's actual plan.
