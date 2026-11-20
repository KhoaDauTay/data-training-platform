---
id: e-pg-l2-02
engine: postgres
level: L2
module: btree-multi
title: "INCLUDE, index-only scan và index cho lọc + sắp xếp"
title_en: "INCLUDE, index-only scans and an index for filter + sort"
kind: lab
runtime: browser
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Thiết kế một index (cột lọc, cột sắp xếp) để câu "5 đơn mới nhất của một khách" không cần Sort.
    en: Design an index (filter column, sort column) so "a customer's 5 newest orders" needs no Sort.
  - vi: Dùng `INCLUDE` để index chứa thêm cột trả về, và biết index-only scan cần visibility map (do VACUUM bật).
    en: Use `INCLUDE` to carry extra returned columns, and know an index-only scan needs the visibility map (set by VACUUM).
requires: [e-pg-l2-01]
sources:
  - https://www.postgresql.org/docs/18/indexes-index-only-scans.html
  - https://www.postgresql.org/docs/18/indexes-multicolumn.html
  - https://www.postgresql.org/docs/18/indexes-ordering.html
  - https://www.postgresql.org/docs/18/sql-createindex.html
lab:
  setup: |
    CREATE TABLE orders (
      id bigint PRIMARY KEY,
      customer_id int NOT NULL,
      created_at timestamptz NOT NULL,
      amount numeric(10,2) NOT NULL,
      note text
    );
    INSERT INTO orders
    SELECT g, 1 + (g * 7919) % 500, timestamptz '2026-01-01 00:00+00' + g * interval '13 minutes',
           (g % 900) + 0.5, repeat('x', 40)
    FROM generate_series(1, 30000) AS g;
    ANALYZE orders;
  steps:
    - task:
        vi: "Tạo index tên `orders_customer_incl_idx` trên `customer_id`, mang thêm cột `amount` bằng `INCLUDE`."
        en: "Create an index named `orders_customer_incl_idx` on `customer_id` that also carries `amount` through `INCLUDE`."
      solution: CREATE INDEX orders_customer_incl_idx ON orders (customer_id) INCLUDE (amount)
      target: SELECT customer_id, amount FROM orders WHERE customer_id = 42
      check: catalog
      hint:
        vi: "`CREATE INDEX name ON table (key) INCLUDE (extra)`."
        en: "`CREATE INDEX name ON table (key) INCLUDE (extra)`."
    - task:
        vi: "Bảng vừa nạp và chưa VACUUM. Đoán trước: số này là 0, một nửa hay bằng số trang của bảng? Đọc `relallvisible` (số trang có bit all-visible) của bảng `orders` trong `pg_class`."
        en: "The table was just loaded and never vacuumed. Guess first: is the number 0, half, or every page of the table? Read `relallvisible` (pages marked all-visible) of table `orders` from `pg_class`."
      solution: SELECT relallvisible FROM pg_class WHERE relname = 'orders'
      check: rows
      hint:
        vi: "`pg_class` có một dòng mỗi bảng; lọc theo `relname`."
        en: "`pg_class` has one row per table; filter on `relname`."
    - task:
        vi: "Trang khách hàng hiện 5 đơn mới nhất của một khách. Tạo index tên `orders_customer_created_idx` phục vụ đúng câu đó (lọc theo khách, sắp theo thời gian)."
        en: "The customer page shows a customer's 5 newest orders. Create an index named `orders_customer_created_idx` that serves exactly that query (filter by customer, sort by time)."
      solution: CREATE INDEX orders_customer_created_idx ON orders (customer_id, created_at)
      target: SELECT id, created_at FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 5
      check: catalog
      hint:
        vi: Cột lọc bằng đứng trước, cột sắp xếp đứng sau.
        en: The equality column first, the sort column second.
    - task:
        vi: "Lấy `id, created_at` của 5 đơn mới nhất của khách 42. Kế hoạch phải đọc `orders_customer_created_idx` và không có Sort."
        en: "Return `id, created_at` of customer 42's 5 newest orders. The plan must read `orders_customer_created_idx` with no Sort."
      solution: SELECT id, created_at FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 5
      check: plan
      ordered: true
      hint:
        vi: "`WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 5`."
        en: "`WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 5`."
---
## Ý chính

Index `(customer_id, created_at)` giữ các đơn của mỗi khách nằm liền nhau và đã xếp theo thời gian. Câu "5 đơn mới nhất của khách 42" chỉ cần nhảy tới cuối đoạn của khách 42, đọc ngược 5 mục rồi dừng: không Sort, không đọc đơn của khách khác.

Index-only scan trả kết quả chỉ từ index, không về bảng. Nó cần hai điều:

- Mọi cột câu dùng đều có trong index. `INCLUDE (amount)` thêm cột vào lá của B-tree mà không làm nó thành một phần của khóa.
- Postgres phải biết dòng đó nhìn thấy được mà không cần mở trang heap. Nó hỏi visibility map: trang nào có bit all-visible thì bỏ qua heap. Bit này do VACUUM bật.

## Ví dụ

Bảng vừa nạp có `relallvisible = 0`, nên planner tính rằng index-only scan vẫn phải về heap cho mọi dòng và thường chọn Bitmap Heap Scan. Sau VACUUM, cùng câu đó thành Index Only Scan với `Heap Fetches: 0`. Ở L3 bạn sẽ chạy VACUUM thật và đọc visibility map.

```sql
CREATE INDEX demo_incl_idx ON orders (customer_id) INCLUDE (amount);
EXPLAIN SELECT customer_id, amount FROM orders WHERE customer_id = 42;
```

Trên bảng chưa VACUUM, kế hoạch là Bitmap Heap Scan qua `demo_incl_idx`, chưa phải Index Only Scan.

## Thực hành

Tạo một index `INCLUDE`, xem vì sao nó chưa thành index-only, rồi thiết kế index cho câu lọc + sắp xếp.

# EN

## Key idea

An index on `(customer_id, created_at)` keeps each customer's orders next to each other, already sorted by time. "Customer 42's 5 newest orders" just jumps to the end of customer 42's stretch, reads 5 entries backwards and stops: no Sort, no other customers' orders.

An index-only scan answers from the index alone, without visiting the table. It needs two things:

- Every column the query uses is in the index. `INCLUDE (amount)` adds a column to the B-tree leaves without making it part of the key.
- Postgres must know the row is visible without opening the heap page. It asks the visibility map: pages with the all-visible bit skip the heap. VACUUM sets that bit.

## Example

A freshly loaded table has `relallvisible = 0`, so the planner reckons an index-only scan would still visit the heap for every row and usually picks a Bitmap Heap Scan. After VACUUM, the same query becomes an Index Only Scan with `Heap Fetches: 0`. In L3 you will run a real VACUUM and read the visibility map.

```sql
CREATE INDEX demo_incl_idx ON orders (customer_id) INCLUDE (amount);
EXPLAIN SELECT customer_id, amount FROM orders WHERE customer_id = 42;
```

On the never-vacuumed table the plan is a Bitmap Heap Scan through `demo_incl_idx`, not yet an Index Only Scan.

## Practice

Create an `INCLUDE` index, see why it is not index-only yet, then design the index for the filter + sort query.
