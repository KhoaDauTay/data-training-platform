---
id: e-pg-l1-10
engine: postgres
level: L1
module: first-index
title: "Có index, sao vẫn Seq Scan?"
title_en: "There is an index, so why a Seq Scan?"
kind: predict
runtime: browser
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-query-path
objectives:
  - vi: "Đọc một dòng `EXPLAIN`: tên nút, `cost=A..B`, `rows=` ước lượng."
    en: "Read an `EXPLAIN` line: the node name, `cost=A..B`, the estimated `rows=`."
  - vi: Giải thích vì sao planner bỏ qua index khi câu lấy phần lớn bảng.
    en: Explain why the planner skips an index when a query reads most of the table.
  - vi: Viết câu lọc một phần nhỏ của bảng sao cho planner đi qua index.
    en: Write a query on a small part of the table so the planner goes through the index.
requires: [e-pg-l1-09]
sources:
  - { url: https://www.postgresql.org/docs/18/using-explain.html, title_vi: "Dùng EXPLAIN" }
  - { url: https://www.postgresql.org/docs/18/sql-explain.html, title_vi: "EXPLAIN" }
  - { url: https://www.postgresql.org/docs/18/runtime-config-query.html, title_vi: "Cấu hình planner" }
  - { url: https://www.postgresql.org/docs/18/indexes-intro.html, title_vi: "Nhập môn index" }
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
    - task:
        vi: "Đếm các đơn `'new'` và cộng `amount` của chúng (hai cột, một dòng). Bài chấm cả tốc độ: đúng mà không đi qua index là chưa đạt."
        en: "Count the `'new'` orders and sum their `amount` (two columns, one row). Speed is graded too: a right answer that skips the index does not pass."
      solution: SELECT count(*), sum(amount) FROM orders WHERE status = 'new'
      check: rows
      perf: { table: orders }
      slow: SELECT count(*), sum(amount) FROM orders WHERE lower(status) = 'new'
      hint:
        vi: "`count(*)` và `sum(amount)` với điều kiện bằng trên chính cột `status`, không bọc cột trong hàm."
        en: "`count(*)` and `sum(amount)` with an equality filter on column `status` itself, without wrapping it in a function."
quiz:
  - q:
      vi: "Một dòng kế hoạch ghi `Seq Scan on orders (cost=0.00..329.00 rows=20000 width=19)`. Số 329.00 là gì?"
      en: "A plan line says `Seq Scan on orders (cost=0.00..329.00 rows=20000 width=19)`. What is 329.00?"
    options:
      - { vi: "Thời gian chạy dự kiến, tính bằng mili giây", en: "The expected run time, in milliseconds" }
      - { vi: "Chi phí ước lượng để trả xong mọi dòng, theo đơn vị của planner", en: "The estimated cost to return every row, in planner units" }
      - { vi: "Số trang của bảng", en: "The number of pages in the table" }
    answer: 1
    trap: 0
    why:
      vi: "\"Mili giây\" nghe hợp lý vì con số nằm cạnh chữ cost và trông như thời gian, nhưng `EXPLAIN` không chạy câu nên không đo được giờ. Đó là cost (chi phí ước lượng) theo đơn vị của planner: đọc tuần tự một trang (page) tính 1, xử lý một dòng tính 0,01. Số trang chỉ là một phần của nó: 329 = 129 trang × 1 + 20.000 dòng × 0,01. Muốn thời gian thật thì dùng `EXPLAIN ANALYZE`."
      en: "\"Milliseconds\" sounds right because the number sits next to the word cost and looks like a time, but `EXPLAIN` does not run the query, so it cannot measure time. It is the estimated cost in planner units: reading one page in order counts 1, handling one row counts 0.01. The page count is only part of it: 329 = 129 pages × 1 + 20,000 rows × 0.01. For real times use `EXPLAIN ANALYZE`."
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
  trap: 0
  why:
    vi: "Index Scan nghe hợp lý vì `status` có index, mà có index thì tưởng nên dùng; nhưng câu lấy 90 % của 20.000 đơn, tức 18.000 dòng, nằm trên gần như mọi trang của bảng. Đi qua index rồi nhảy tới từng dòng tốn hơn đọc thẳng cả bảng theo thứ tự, nên planner chọn Seq Scan với `Filter: (status = 'paid'::text)`. Index chỉ có lợi khi câu lấy một phần nhỏ của bảng."
    en: "An Index Scan sounds right because `status` has an index, and an index seems made to be used, but the query takes 90% of 20,000 orders, that is 18,000 rows, spread over nearly every page of the table. Going through the index and jumping to each row costs more than reading the whole table in order, so the planner picks a Seq Scan with `Filter: (status = 'paid'::text)`. An index only pays off when a query reads a small part of the table."
---
## Mở bài

Bạn vừa tạo index trên `status`, chạy lại câu lọc đơn đã trả tiền, và `EXPLAIN` vẫn ghi Seq Scan. Index hỏng, hay planner có lý do riêng?

## Ý chính

Mỗi câu SQL đi qua bốn tầng: parser đọc chữ, rewriter mở view, planner chọn cách chạy rẻ nhất, executor chạy. `EXPLAIN` in ra lựa chọn của planner mà không chạy câu.

Mỗi dòng của kế hoạch là một nút, ví dụ `Seq Scan on orders (cost=0.00..329.00 rows=20000 width=19)`:

- `Seq Scan`, `Index Scan`, `Bitmap Heap Scan`...: cách đọc bảng.
- `cost=A..B`: chi phí ước lượng để ra dòng đầu và để xong. Đơn vị là "chi phí planner" (mặc định đọc tuần tự một trang = 1), không phải mili giây.
- `rows=`: số dòng planner đoán, dựa vào thống kê do `ANALYZE` thu.
- `width=`: số byte trung bình của một dòng kết quả.

Nhiều người nghĩ có index thì planner phải dùng. Thật ra planner tính chi phí của từng cách rồi chọn cách rẻ nhất. Đọc tuần tự rẻ hơn nhảy ngẫu nhiên tới từng trang (`random_page_cost` mặc định 4, gấp bốn `seq_page_cost`). Lấy ít dòng thì index thắng; lấy phần lớn bảng thì đọc thẳng cả bảng thắng, dù index có sẵn.

Giữa hai đầu đó là Bitmap Heap Scan: gom địa chỉ từ index, sắp theo trang, rồi đọc mỗi trang cần thiết đúng một lần.

## Ví dụ

Đọc cả bảng, không điều kiện:

```sql
EXPLAIN SELECT * FROM orders;
```

Ra `cost=0.00..329.00 rows=20000`. Con số 329 đến từ thống kê của bảng:

```sql
SELECT relpages, reltuples FROM pg_class WHERE relname = 'orders';
```

129 trang × 1 cộng 20.000 dòng × 0,01 (`cpu_tuple_cost`) là 329. Thêm một điều kiện thì mỗi dòng còn tốn thêm 0,0025 để so sánh.

```sql
EXPLAIN SELECT * FROM orders WHERE status = 'new';
```

Chỉ 5 % đơn là 'new', nên kế hoạch đổi sang Bitmap Heap Scan qua `orders_status_idx`, chi phí khoảng 154 thay vì hơn 300.

```sql
EXPLAIN SELECT * FROM orders WHERE id = 7;
```

Một dòng duy nhất qua khóa chính: `Index Scan using orders_pkey`, chi phí chừng 8.

## Lỗi hay gặp

Tưởng `EXPLAIN ANALYZE` chỉ in kế hoạch như `EXPLAIN`:

```sql
-- WRONG: EXPLAIN ANALYZE really runs the DELETE
EXPLAIN ANALYZE DELETE FROM orders WHERE status = 'cancelled';
SELECT count(*) AS left_rows FROM orders WHERE status = 'cancelled';
```

```sql
-- FIX: wrap it in a transaction and roll back
BEGIN;
EXPLAIN ANALYZE DELETE FROM orders WHERE status = 'new';
ROLLBACK;
SELECT count(*) AS left_rows FROM orders WHERE status = 'new';
```

Bản sai xóa thật 1000 đơn đã hủy (còn 0). `ANALYZE` chạy câu để đo thời gian thật, nên với câu ghi hãy đặt nó giữa `BEGIN` và `ROLLBACK`: bản sửa vẫn còn đủ 1000 đơn 'new'.

## Thực hành

Chọn đáp án, rồi bấm "Xem thật" để so với kế hoạch thật của PGlite. Sau đó viết hai câu đi qua index: một câu lấy các đơn 'new', một câu tổng hợp được chấm cả tốc độ.

## Tóm tắt

- `EXPLAIN` in kế hoạch mà không chạy câu; `EXPLAIN ANALYZE` chạy thật.
- `cost=A..B` là chi phí theo đơn vị planner, không phải mili giây; `rows=` là số dòng đoán.
- Planner chọn cách rẻ nhất: lấy phần lớn bảng thì Seq Scan thắng dù có index.
- Lấy một phần nhỏ thì Index Scan hoặc Bitmap Heap Scan thắng, miễn là cột không bị bọc trong hàm.

# EN

## Opening

You just indexed `status`, rerun the query for paid orders, and `EXPLAIN` still says Seq Scan. Is the index broken, or does the planner have its own reasons?

## Key idea

Every SQL statement goes through four stages: the parser reads the text, the rewriter expands views, the planner picks the cheapest way to run it, the executor runs it. `EXPLAIN` prints the planner's choice without running the query.

Each line of a plan is a node, for example `Seq Scan on orders (cost=0.00..329.00 rows=20000 width=19)`:

- `Seq Scan`, `Index Scan`, `Bitmap Heap Scan`...: how the table is read.
- `cost=A..B`: estimated cost to return the first row and to finish. The unit is "planner cost" (by default one sequential page read = 1), not milliseconds.
- `rows=`: the number of rows the planner expects, based on statistics gathered by `ANALYZE`.
- `width=`: the average size of a result row in bytes.

Many people think that if there is an index the planner must use it. In fact the planner prices each option and picks the cheapest. Reading in order is cheaper than jumping randomly to each page (`random_page_cost` defaults to 4, four times `seq_page_cost`). Few rows: the index wins. Most of the table: reading the whole table straight through wins, even with an index in place.

Between those two ends sits the Bitmap Heap Scan: collect addresses from the index, sort them by page, then read each needed page exactly once.

## Example

Read the whole table, no filter:

```sql
EXPLAIN SELECT * FROM orders;
```

It shows `cost=0.00..329.00 rows=20000`. The 329 comes from the table's statistics:

```sql
SELECT relpages, reltuples FROM pg_class WHERE relname = 'orders';
```

129 pages x 1 plus 20,000 rows x 0.01 (`cpu_tuple_cost`) is 329. Add a filter and each row costs another 0.0025 for the comparison.

```sql
EXPLAIN SELECT * FROM orders WHERE status = 'new';
```

Only 5% of orders are 'new', so the plan switches to a Bitmap Heap Scan through `orders_status_idx`, costing about 154 instead of over 300.

```sql
EXPLAIN SELECT * FROM orders WHERE id = 7;
```

A single row through the primary key: `Index Scan using orders_pkey`, costing about 8.

## Common mistakes

Believing `EXPLAIN ANALYZE` only prints the plan like `EXPLAIN`:

```sql
-- WRONG: EXPLAIN ANALYZE really runs the DELETE
EXPLAIN ANALYZE DELETE FROM orders WHERE status = 'cancelled';
SELECT count(*) AS left_rows FROM orders WHERE status = 'cancelled';
```

```sql
-- FIX: wrap it in a transaction and roll back
BEGIN;
EXPLAIN ANALYZE DELETE FROM orders WHERE status = 'new';
ROLLBACK;
SELECT count(*) AS left_rows FROM orders WHERE status = 'new';
```

The wrong version really deletes the 1000 cancelled orders (0 left). `ANALYZE` runs the statement to measure real times, so for a write put it between `BEGIN` and `ROLLBACK`: the fix still has all 1000 'new' orders.

## Practice

Pick an answer, then press "See the real plan" to compare with PGlite's actual plan. Then write two queries that go through the index: one returning the 'new' orders, and one summary graded on speed too.

## Recap

- `EXPLAIN` prints the plan without running the query; `EXPLAIN ANALYZE` really runs it.
- `cost=A..B` is a cost in planner units, not milliseconds; `rows=` is the estimated row count.
- The planner picks the cheapest way: for most of the table a Seq Scan wins even with an index.
- For a small part of the table an Index Scan or Bitmap Heap Scan wins, as long as the column is not wrapped in a function.
