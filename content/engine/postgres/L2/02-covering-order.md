---
id: e-pg-l2-02
engine: postgres
level: L2
module: btree-multi
title: "INCLUDE, index-only scan và index cho lọc + sắp xếp"
title_en: "INCLUDE, index-only scans and an index for filter + sort"
kind: lab
runtime: browser
minutes: 14
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: pg-index-only-scan, at: idea }]
objectives:
  - vi: Thiết kế một index (cột lọc, cột sắp xếp) để câu "5 đơn mới nhất của một khách" không cần Sort.
    en: Design an index (filter column, sort column) so "a customer's 5 newest orders" needs no Sort.
  - vi: Dùng `INCLUDE` để index chứa thêm cột trả về, và biết index-only scan cần visibility map (do VACUUM bật).
    en: Use `INCLUDE` to carry extra returned columns, and know an index-only scan needs the visibility map (set by VACUUM).
  - vi: Viết điều kiện khoảng trên cột thứ hai sao cho index thu hẹp được đoạn cần đọc.
    en: Write the range on the second column so the index can narrow the part it reads.
requires: [e-pg-l2-01]
sources:
  - { url: https://www.postgresql.org/docs/18/indexes-index-only-scans.html, title_vi: "Index-only scan và covering index" }
  - { url: https://www.postgresql.org/docs/18/indexes-multicolumn.html, title_vi: "Index nhiều cột" }
  - { url: https://www.postgresql.org/docs/18/indexes-ordering.html, title_vi: "Index và ORDER BY" }
  - { url: https://www.postgresql.org/docs/18/sql-createindex.html, title_vi: "CREATE INDEX" }
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
    - task:
        vi: "Đếm số đơn và tổng tiền của khách 42 trong tháng 3/2026 theo giờ UTC (hai cột, một dòng). Bài chấm cả tốc độ: index phải thu hẹp được cả khách lẫn khoảng thời gian."
        en: "Count customer 42's orders and sum their amounts in March 2026, UTC time (two columns, one row). Speed is graded too: the index must narrow both the customer and the time range."
      solution: SELECT count(*), sum(amount) FROM orders WHERE customer_id = 42 AND created_at >= timestamptz '2026-03-01 00:00+00' AND created_at < timestamptz '2026-04-01 00:00+00'
      check: rows
      perf: { table: orders }
      slow: SELECT count(*), sum(amount) FROM orders WHERE customer_id = 42 AND date_trunc('month', created_at AT TIME ZONE 'UTC') = timestamp '2026-03-01'
      hint:
        vi: "So thẳng cột `created_at` với hai mốc: `>=` đầu tháng 3 và `<` đầu tháng 4."
        en: "Compare column `created_at` itself with two bounds: `>=` the start of March and `<` the start of April."
quiz:
  - q:
      vi: "Bạn vừa tạo `orders_customer_incl_idx ON orders (customer_id) INCLUDE (amount)`, nhưng `EXPLAIN SELECT customer_id, amount ... WHERE customer_id = 42` vẫn là Bitmap Heap Scan. Vì sao?"
      en: "You just created `orders_customer_incl_idx ON orders (customer_id) INCLUDE (amount)`, yet `EXPLAIN SELECT customer_id, amount ... WHERE customer_id = 42` is still a Bitmap Heap Scan. Why?"
    options:
      - { vi: "Cột trong `INCLUDE` không bao giờ được index-only scan đọc", en: "Columns in `INCLUDE` are never read by an index-only scan" }
      - { vi: "Visibility map chưa có trang all-visible; sau VACUUM mới thành Index Only Scan", en: "The visibility map has no all-visible page yet; after VACUUM it becomes an Index Only Scan" }
      - { vi: "Index hỏng, phải chạy `REINDEX`", en: "The index is broken and needs `REINDEX`" }
    answer: 1
    trap: 0
    why:
      vi: "Cột `INCLUDE` không dùng để tìm, nhưng nó vẫn nằm ở lá của index và index-only scan đọc được nó: `INCLUDE` có ra chính là để khỏi về bảng. Thứ còn thiếu là visibility map (bản đồ đánh dấu trang mà mọi dòng đều nhìn thấy được, do VACUUM bật): bảng vừa nạp có `relallvisible = 0`, nên planner tính rằng dòng nào cũng phải mở trang heap để kiểm. Index không hỏng, nên `REINDEX` không đổi gì. Sau VACUUM, cùng câu đó thành Index Only Scan với `Heap Fetches: 0`."
      en: "An `INCLUDE` column is not used for searching, but it sits in the index leaves and an index-only scan can read it: avoiding the table is exactly why `INCLUDE` exists. What is missing is the visibility map (the map of pages whose rows are all visible, set by VACUUM): a freshly loaded table has `relallvisible = 0`, so the planner reckons every row needs a heap page visit to check it. The index is not broken, so `REINDEX` changes nothing. After VACUUM the same query becomes an Index Only Scan with `Heap Fetches: 0`."
  - q:
      vi: "Câu chạy nhiều nhất là `WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 5`. Index nào phục vụ nó tốt nhất?"
      en: "The most frequent query is `WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 5`. Which index serves it best?"
    options:
      - { vi: "`(customer_id) INCLUDE (created_at)`", en: "`(customer_id) INCLUDE (created_at)`" }
      - { vi: "`(created_at, customer_id)`", en: "`(created_at, customer_id)`" }
      - { vi: "`(customer_id, created_at)`", en: "`(customer_id, created_at)`" }
    answer: 2
    trap: 0
    why:
      vi: "`INCLUDE` đưa `created_at` vào index, nhưng cột `INCLUDE` không được sắp xếp: Postgres vẫn lấy hết khoảng 60 đơn của khách (30.000 đơn ÷ 500 khách) rồi Sort. `(created_at, customer_id)` có thứ tự thời gian, nhưng đi ngược thời gian qua đơn của mọi khách để nhặt đơn của một khách. `(customer_id, created_at)` đặt đơn của một khách liền nhau và đã xếp theo thời gian: nhảy tới cuối đoạn đó, đọc ngược 5 mục là xong, không Sort."
      en: "`INCLUDE` puts `created_at` in the index, but `INCLUDE` columns are not sorted: Postgres still fetches the customer's roughly 60 orders (30,000 orders ÷ 500 customers) and then Sorts them. `(created_at, customer_id)` is in time order, but walks back through every customer's orders to pick one customer's. `(customer_id, created_at)` keeps one customer's orders together, already in time order: jump to the end of that stretch and read 5 entries backwards, no Sort."
---
## Mở bài

Trang khách hàng hiện 5 đơn mới nhất, và trang đó được mở hàng nghìn lần mỗi giờ. Mỗi lần, Postgres lấy hết đơn của khách rồi sắp xếp chỉ để giữ 5 dòng. Một index đúng thứ tự cột trả 5 dòng đó mà không phải sắp xếp gì.

## Ý chính

Index `(customer_id, created_at)` giữ các đơn của mỗi khách nằm liền nhau và đã xếp theo thời gian. Câu "5 đơn mới nhất của khách 42" chỉ cần nhảy tới cuối đoạn của khách 42, đọc ngược 5 mục rồi dừng: không Sort, không đọc đơn của khách khác. Cùng index đó cũng phục vụ "đơn của khách 42 trong tháng 3": điều kiện bằng trên cột đầu, điều kiện khoảng trên cột thứ hai, đọc đúng một đoạn liền.

Điều kiện khoảng chỉ thu hẹp được đoạn đọc khi nó so thẳng cột với hằng số. Bọc cột trong hàm, như `date_trunc('month', ...)`, thì index chỉ còn dùng được cột đầu; mọi đơn của khách phải được đọc rồi lọc lại.

Index-only scan trả kết quả chỉ từ index, không về bảng. Nó cần hai điều. Một: mọi cột câu dùng đều có trong index; `INCLUDE (amount)` thêm cột vào lá của B-tree mà không biến nó thành khóa, nên cột đó không được sắp xếp và không dùng để tìm. Hai: Postgres phải biết dòng đó nhìn thấy được mà không mở trang heap. Nó hỏi visibility map, và bit all-visible của mỗi trang do VACUUM bật.

Nhiều người nghĩ thêm `INCLUDE` là có ngay index-only scan. Thật ra bảng vừa nạp chưa có trang all-visible nào, nên planner vẫn chọn đọc qua heap cho tới khi VACUUM chạy.

Hình từng bước ở cuối mục này đặt hai điều kiện đó lên lá của index và visibility map: chỉ trang có bit all-visible mới được trả thẳng từ index.

## Cú pháp

```sql
CREATE [ UNIQUE ] INDEX index_name ON table_name
  ( filter_column, sort_column [ ASC | DESC ] [, ...] )
  [ INCLUDE ( extra_column [, ...] ) ];
```

- Cột lọc bằng đứng trước, cột lọc khoảng hoặc cột sắp xếp đứng sau.
- `INCLUDE`: cột chỉ để trả về, không phải khóa; chỉ là cột thật, không là biểu thức.
- `DESC`: hiếm khi cần cho một cột, vì B-tree đọc ngược được.

## Ví dụ

Index có cột `INCLUDE` đã thành index-only chưa?

```sql
CREATE INDEX demo_incl_idx ON orders (customer_id) INCLUDE (amount);
EXPLAIN SELECT customer_id, amount FROM orders WHERE customer_id = 7;
```

Index có đủ hai cột, nhưng kế hoạch là `Bitmap Heap Scan` qua `demo_incl_idx`, chưa phải Index Only Scan. Ở L3 bạn sẽ chạy VACUUM thật và thấy nó đổi.

```sql
EXPLAIN SELECT id, created_at FROM orders
WHERE customer_id = 7 ORDER BY created_at DESC LIMIT 5;
```

Chỉ với index trên `customer_id`, kế hoạch lấy cả 60 đơn của khách rồi `Sort` theo `created_at`.

## Lỗi hay gặp

Đặt cột sắp xếp lên trước cột lọc:

```sql
-- WRONG: sort column first, so the scan walks every customer's orders
CREATE INDEX demo_time_cust ON orders (created_at, customer_id);
EXPLAIN SELECT id, created_at FROM orders
WHERE customer_id = 7 ORDER BY created_at DESC LIMIT 5;
```

```sql
-- FIX: equality column first, sort column second
DROP INDEX demo_time_cust;
CREATE INDEX demo_cust_time ON orders (customer_id, created_at);
EXPLAIN SELECT id, created_at FROM orders
WHERE customer_id = 7 ORDER BY created_at DESC LIMIT 5;
```

Index sai vẫn được dùng, nhưng nó đi ngược thời gian qua đơn của mọi khách để nhặt đơn của khách 7; chi phí ước cao hơn khoảng ba lần. Index đúng nhảy thẳng tới khách 7: `Index Scan Backward`, không Sort.

Đưa một biểu thức vào `INCLUDE`:

```sql
-- ERROR 0A000: expressions are not supported in included columns
CREATE INDEX demo_note_idx ON orders (customer_id) INCLUDE (lower(note));
```

`INCLUDE` chỉ nhận cột thật. Cần tìm theo biểu thức thì đặt biểu thức vào phần khóa (bài sau: index trên biểu thức).

## Thực hành

Bảng `orders` có 30.000 đơn của 500 khách, chưa có index nào ngoài khóa chính. Tạo một index `INCLUDE`, xem vì sao nó chưa thành index-only, thiết kế index cho câu lọc + sắp xếp, rồi viết một câu tổng hợp theo tháng vừa đúng vừa nhanh.

## Tóm tắt

- Index `(customer_id, created_at)` (cột lọc trước, cột sắp xếp sau) trả "N dòng mới nhất" mà không cần Sort.
- Điều kiện khoảng trên cột thứ hai phải so thẳng cột với hằng số thì mới thu hẹp đoạn đọc.
- `INCLUDE` thêm cột để trả về, không sắp xếp, không tìm, không nhận biểu thức.
- Index-only scan còn cần visibility map; bảng chưa VACUUM thì chưa có.

# EN

## Opening

The customer page shows the 5 newest orders, and it is opened thousands of times an hour. Each time, Postgres fetches all of the customer's orders and sorts them just to keep 5 rows. An index with the right column order returns those 5 rows with no sorting at all.

## Key idea

An index on `(customer_id, created_at)` keeps each customer's orders next to each other, already sorted by time. "Customer 42's 5 newest orders" just jumps to the end of customer 42's stretch, reads 5 entries backwards and stops: no Sort, no other customers' orders. The same index serves "customer 42's orders in March": an equality on the leading column and a range on the second column read one contiguous stretch.

A range only narrows the scan when it compares the column itself with constants. Wrap the column in a function, such as `date_trunc('month', ...)`, and the index can only use the leading column; every order of the customer is read and then filtered.

An index-only scan answers from the index alone, without visiting the table. It needs two things. First, every column the query uses is in the index; `INCLUDE (amount)` adds a column to the B-tree leaves without making it a key, so it is not sorted and not searchable. Second, Postgres must know the row is visible without opening the heap page. It asks the visibility map, and VACUUM sets each page's all-visible bit.

Many people think adding `INCLUDE` gives an index-only scan right away. In fact a freshly loaded table has no all-visible page yet, so the planner keeps reading through the heap until VACUUM runs.

The step-through figure at the end of this section puts both conditions on the index leaf and the visibility map: only pages with the all-visible bit are answered straight from the index.

## Syntax

```sql
CREATE [ UNIQUE ] INDEX index_name ON table_name
  ( filter_column, sort_column [ ASC | DESC ] [, ...] )
  [ INCLUDE ( extra_column [, ...] ) ];
```

- The equality column goes first, the range or sort column after.
- `INCLUDE`: columns only to return, not keys; real columns only, no expressions.
- `DESC`: rarely needed for a single column, because a B-tree can be read backwards.

## Example

Is an index with an `INCLUDE` column index-only yet?

```sql
CREATE INDEX demo_incl_idx ON orders (customer_id) INCLUDE (amount);
EXPLAIN SELECT customer_id, amount FROM orders WHERE customer_id = 7;
```

The index holds both columns, but the plan is a `Bitmap Heap Scan` through `demo_incl_idx`, not yet an Index Only Scan. In L3 you will run a real VACUUM and watch it change.

```sql
EXPLAIN SELECT id, created_at FROM orders
WHERE customer_id = 7 ORDER BY created_at DESC LIMIT 5;
```

With only the index on `customer_id`, the plan fetches all 60 orders of the customer and then runs a `Sort` on `created_at`.

## Common mistakes

Putting the sort column before the filter column:

```sql
-- WRONG: sort column first, so the scan walks every customer's orders
CREATE INDEX demo_time_cust ON orders (created_at, customer_id);
EXPLAIN SELECT id, created_at FROM orders
WHERE customer_id = 7 ORDER BY created_at DESC LIMIT 5;
```

```sql
-- FIX: equality column first, sort column second
DROP INDEX demo_time_cust;
CREATE INDEX demo_cust_time ON orders (customer_id, created_at);
EXPLAIN SELECT id, created_at FROM orders
WHERE customer_id = 7 ORDER BY created_at DESC LIMIT 5;
```

The wrong index is still used, but it walks back through time over every customer's orders to pick customer 7's; the estimated cost is about three times higher. The right index jumps straight to customer 7: `Index Scan Backward`, no Sort.

Putting an expression in `INCLUDE`:

```sql
-- ERROR 0A000: expressions are not supported in included columns
CREATE INDEX demo_note_idx ON orders (customer_id) INCLUDE (lower(note));
```

`INCLUDE` takes real columns only. To search by an expression, put the expression in the key part (next lesson: indexes on expressions).

## Practice

Table `orders` holds 30,000 orders of 500 customers, with no index besides the primary key. Create an `INCLUDE` index, see why it is not index-only yet, design the index for the filter + sort query, then write a monthly summary that is both right and fast.

## Recap

- An index on `(customer_id, created_at)` (filter column first, sort column second) returns "the N newest rows" with no Sort.
- A range on the second column must compare the column itself with constants to narrow the scan.
- `INCLUDE` adds columns to return: not sorted, not searchable, no expressions.
- An index-only scan also needs the visibility map; a never-vacuumed table does not have it yet.
