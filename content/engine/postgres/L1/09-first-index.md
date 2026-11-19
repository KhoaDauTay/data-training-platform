---
id: e-pg-l1-09
engine: postgres
level: L1
module: first-index
title: Index B-tree đầu tiên
title_en: Your first B-tree index
kind: lab
runtime: browser
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
viz: pg-btree
objectives:
  - vi: Tạo một index B-tree cho cột hay lọc và kiểm tra Postgres có dùng nó không.
    en: Create a B-tree index on a column you filter often and check that Postgres uses it.
  - vi: Biết index tăng tốc đọc nhưng làm mỗi lần ghi tốn thêm việc.
    en: Know that an index speeds up reads but adds work to every write.
requires: [e-pg-l1-08]
sources:
  - https://www.postgresql.org/docs/18/indexes-intro.html
  - https://www.postgresql.org/docs/18/indexes-types.html
  - https://www.postgresql.org/docs/18/sql-createindex.html
lab:
  setup: |
    SELECT setseed(0.42);
    CREATE TABLE orders (
      id bigint PRIMARY KEY,
      customer_id int NOT NULL,
      amount numeric(10,2) NOT NULL,
      created_at date NOT NULL
    );
    INSERT INTO orders
    SELECT g, 1 + (g * 7919) % 500, round((10 + random() * 990)::numeric, 2), date '2026-01-01' + (g % 300)
    FROM generate_series(1, 20000) AS g;
    ANALYZE orders;
  steps:
    - task:
        vi: Tạo index B-tree tên `orders_customer_idx` trên cột `customer_id` của bảng `orders`.
        en: Create a B-tree index named `orders_customer_idx` on column `customer_id` of table `orders`.
      solution: CREATE INDEX orders_customer_idx ON orders (customer_id)
      check: catalog
      hint:
        vi: "Cú pháp: `CREATE INDEX name ON table (column)`. B-tree là kiểu mặc định nên không cần `USING`."
        en: "Syntax: `CREATE INDEX name ON table (column)`. B-tree is the default type, so `USING` is optional."
    - task:
        vi: Lấy mọi đơn (`id`, `amount`) của khách `customer_id = 42`. Kế hoạch phải đọc bảng qua index vừa tạo.
        en: Return every order (`id`, `amount`) of customer `customer_id = 42`. The plan must read the table through the new index.
      solution: SELECT id, amount FROM orders WHERE customer_id = 42
      check: plan
      hint:
        vi: Một điều kiện bằng trên cột đã có index là đủ. Thử thêm `EXPLAIN` phía trước để xem kế hoạch.
        en: An equality filter on the indexed column is enough. Put `EXPLAIN` in front to see the plan.
    - task:
        vi: Đếm số đơn và tổng tiền của khách 42 (hai cột, một dòng).
        en: Count the orders of customer 42 and sum their amounts (two columns, one row).
      solution: SELECT count(*), sum(amount) FROM orders WHERE customer_id = 42
      check: rows
      hint:
        vi: Dùng `count(*)` và `sum(amount)` với cùng điều kiện.
        en: Use `count(*)` and `sum(amount)` with the same filter.
---
## Ý chính

Không có index, muốn tìm đơn của một khách thì Postgres phải đọc mọi dòng (Seq Scan). Index (chỉ mục) B-tree giữ các giá trị của cột theo thứ tự, mỗi giá trị kèm địa chỉ dòng trong bảng. Tìm một giá trị chỉ cần đi từ gốc xuống lá, vài trang, rồi nhảy thẳng tới các dòng khớp.

B-tree là kiểu mặc định của `CREATE INDEX`. Nó dùng được cho `=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `IN`, `IS NULL` và cho `ORDER BY`.

Index không miễn phí: mỗi `INSERT` và mỗi `UPDATE` cột được index đều phải ghi thêm vào index (`DELETE` để lại mục cũ cho VACUUM dọn sau). Chỉ tạo index cho câu hỏi bạn thật sự chạy thường xuyên.

## Ví dụ

Khi số dòng khớp vừa phải, kế hoạch thường là Bitmap Index Scan rồi Bitmap Heap Scan: gom địa chỉ từ index, sắp theo trang, rồi đọc mỗi trang một lần.

```sql
CREATE INDEX orders_day_idx ON orders (created_at);
EXPLAIN SELECT id FROM orders WHERE created_at = date '2026-03-01';
```

`EXPLAIN` chỉ in kế hoạch, không chạy câu. Dòng có chữ `orders_day_idx` cho biết planner chọn index.

## Thực hành

Bảng `orders` có 20.000 dòng, 500 khách. Tạo index cho `customer_id`, rồi xem câu lọc theo khách đổi kế hoạch thế nào.

# EN

## Key idea

Without an index, finding one customer's orders means reading every row (Seq Scan). A B-tree index keeps the column's values in order, each with the address of its row in the table. Looking up a value walks from the root down to a leaf, a few pages, and then jumps straight to the matching rows.

B-tree is the default type of `CREATE INDEX`. It serves `=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `IN`, `IS NULL` and `ORDER BY`.

An index is not free: every `INSERT` and every `UPDATE` of an indexed column must also write to the index (`DELETE` leaves the old entry for VACUUM to clean up later). Only index what you really query often.

## Example

When a moderate number of rows match, the plan is often a Bitmap Index Scan then a Bitmap Heap Scan: collect addresses from the index, sort them by page, then read each page once.

```sql
CREATE INDEX orders_day_idx ON orders (created_at);
EXPLAIN SELECT id FROM orders WHERE created_at = date '2026-03-01';
```

`EXPLAIN` only prints the plan; it does not run the query. A line mentioning `orders_day_idx` means the planner chose the index.

## Practice

Table `orders` has 20,000 rows and 500 customers. Index `customer_id`, then see how the plan of a per-customer query changes.
