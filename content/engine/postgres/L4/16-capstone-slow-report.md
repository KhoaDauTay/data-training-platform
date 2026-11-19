---
id: e-pg-l4-16
engine: postgres
level: L4
module: capstone-l4
title: "Bài tổng kết L4: báo cáo chậm và migration làm treo"
title_en: "L4 capstone: a slow report and a migration that froze the app"
kind: capstone
runtime: browser
minutes: 30
objectives:
  - { vi: "Đi từ ước lượng sai tới thuật toán nối sai, dùng `pg_stats` và ước lượng thật", en: "Go from a wrong estimate to a wrong join algorithm, using `pg_stats` and real estimates" }
  - { vi: "Chứng minh câu tra một khách dùng Nested Loop qua index", en: "Prove that the one-customer lookup uses a Nested Loop through an index" }
  - { vi: "Đọc lock mà một lệnh ghi thật sự lấy, và đề xuất cách chạy migration không làm treo ứng dụng", en: "Read the locks a write really takes, and propose how to run a migration without freezing the app" }
requires: [e-pg-l4-02, e-pg-l4-03, e-pg-l4-04, e-pg-l4-09, e-pg-l4-12]
sources:
  - https://www.postgresql.org/docs/18/planner-stats.html
  - https://www.postgresql.org/docs/18/sql-createstatistics.html
  - https://www.postgresql.org/docs/18/explicit-locking.html
  - https://www.postgresql.org/docs/18/runtime-config-client.html
  - https://www.postgresql.org/docs/18/transaction-iso.html
viz: pg-plan-tree
lab:
  setup: |
    DROP TABLE IF EXISTS orders, customers CASCADE;
    DROP FUNCTION IF EXISTS est(text);
    -- 500 customers in 5 regions; the country is fixed by the region (country = region * 10)
    CREATE TABLE customers (id int PRIMARY KEY, region int NOT NULL, country int NOT NULL);
    INSERT INTO customers SELECT g, g % 5, (g % 5) * 10 FROM generate_series(1, 500) g;
    CREATE TABLE orders (id int PRIMARY KEY, customer_id int NOT NULL REFERENCES customers, status text NOT NULL, amount int NOT NULL);
    INSERT INTO orders
      SELECT g, (g * 37) % 500 + 1,
             CASE WHEN g % 100 < 80 THEN 'delivered' WHEN g % 100 < 98 THEN 'open' ELSE 'lost' END,
             g % 997
      FROM generate_series(1, 20000) g;
    CREATE INDEX orders_customer_idx ON orders (customer_id);
    CREATE INDEX orders_status_idx ON orders (status);
    ANALYZE customers, orders;
    -- helper: the planner's row estimate for one query (author code, never player text)
    CREATE FUNCTION est(q text) RETURNS bigint LANGUAGE plpgsql AS $$
    DECLARE j json;
    BEGIN
      EXECUTE 'EXPLAIN (FORMAT JSON) ' || q INTO j;
      RETURN (j->0->'Plan'->>'Plan Rows')::bigint;
    END $$;
  steps:
    - task: { vi: "Bước 1, dữ liệu lệch. Đọc các giá trị phổ biến và tần suất của trạng thái đơn hàng (hai cột, ép text).", en: "Step 1, skewed data. Read the most common values and frequencies of the order status (two columns, cast to text)." }
      solution: "SELECT most_common_vals::text, most_common_freqs::text FROM pg_stats WHERE tablename = 'orders' AND attname = 'status'"
      check: rows
      hint: { vi: "`pg_stats` của bảng `orders`, cột `status`.", en: "`pg_stats` of table `orders`, column `status`." }
    - task: { vi: "Bước 2, ước lượng. Báo cáo lọc khách theo vùng 2 và quốc gia 20 (quốc gia do vùng quyết định). So ước lượng của planner trên `customers` với số dòng thật. Hai cột: estimated (dùng `est(text)`), actual.", en: "Step 2, estimates. The report filters customers on region 2 and country 20 (the country is fixed by the region). Compare the planner's estimate on `customers` with the real count. Two columns: estimated (use `est(text)`), actual." }
      solution: "SELECT est('SELECT * FROM customers WHERE region = 2 AND country = 20') AS estimated, (SELECT count(*) FROM customers WHERE region = 2 AND country = 20) AS actual"
      check: rows
      hint: { vi: "Planner nhân hai độ chọn lọc như thể độc lập.", en: "The planner multiplies the two selectivities as if independent." }
    - task: { vi: "Bước 3, câu tra một khách. Mã và số tiền các đơn của khách số 42 (nối `customers` với `orders`). Kế hoạch phải là Nested Loop, phía trong đi qua `orders_customer_idx`.", en: "Step 3, the one-customer lookup. Id and amount of customer 42's orders (join `customers` to `orders`). The plan must be a Nested Loop whose inner side goes through `orders_customer_idx`." }
      solution: "SELECT o.id, o.amount FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.id = 42"
      check: plan
      hint: { vi: "Lọc khách bằng khóa chính rồi JOIN.", en: "Filter the customer by primary key, then JOIN." }
    - task: { vi: "Bước 4, lock. Trong cùng một câu: đặt đơn 1 sang 'open' (CTE UPDATE … RETURNING), rồi liệt kê tên quan hệ và lock mode trong `pg_locks` cho mọi quan hệ có tên bắt đầu bằng `orders`. Sắp theo tên rồi chế độ.", en: "Step 4, locks. In one statement: set order 1 to 'open' (a CTE UPDATE … RETURNING), then list the relation name and lock mode in `pg_locks` for every relation whose name starts with `orders`. Order by name, then mode." }
      solution: "WITH u AS (UPDATE orders SET status = 'open' WHERE id = 1 RETURNING id) SELECT c.relname, l.mode FROM u, pg_locks l JOIN pg_class c ON c.oid = l.relation WHERE c.relname LIKE 'orders%' ORDER BY 1, 2"
      check: rows
      ordered: true
      hint: { vi: "Như bài e-pg-l4-09: nối `pg_locks.relation` với `pg_class.oid`.", en: "As in lesson e-pg-l4-09: join `pg_locks.relation` to `pg_class.oid`." }
predict:
  sql: "SELECT * FROM orders WHERE status = 'lost'"
  q: { vi: "Đơn thất lạc chiếm 2 %. Postgres đọc thế nào?", en: "Lost orders are 2%. How does Postgres read them?" }
  options:
    - { vi: "Seq Scan với Filter", en: "A Seq Scan with a Filter" }
    - { vi: "Bitmap Heap Scan qua `orders_status_idx`", en: "A Bitmap Heap Scan through `orders_status_idx`" }
    - { vi: "Index Only Scan", en: "An Index Only Scan" }
  answer: 1
  why: { vi: "Tần suất MCV 0,02 × 20.000 = 400 dòng: đủ hiếm để đi qua index, đủ nhiều để gom theo trang bằng bitmap. Câu cần mọi cột nên không thể Index Only Scan.", en: "MCV frequency 0.02 × 20,000 = 400 rows: rare enough for the index, enough rows to group by page with a bitmap. The query needs every column, so an Index Only Scan is impossible." }
quiz:
  - q: { vi: "Kết luận 1. Bước 2 ước lượng 20, thật 100. Khi bảng này là phía ngoài của một phép nối lớn, hậu quả và cách sửa?", en: "Conclusion 1. Step 2 estimated 20 against 100 real rows. When this table is the outer side of a big join, what follows and what is the fix?" }
    options:
      - { vi: "Planner có thể chọn Nested Loop vì tưởng ít dòng; sửa bằng `CREATE STATISTICS … (dependencies) ON region, country` rồi ANALYZE", en: "The planner may choose a Nested Loop because it expects few rows; fix with `CREATE STATISTICS … (dependencies) ON region, country`, then ANALYZE" }
      - { vi: "Không ảnh hưởng gì", en: "No effect at all" }
      - { vi: "Tắt `enable_nestloop` cho cả server", en: "Turn `enable_nestloop` off for the whole server" }
    answer: 0
    why: { vi: "Ước lượng thấp ở phía ngoài nhân lên số lần lặp phía trong. Sửa ước lượng, không tắt tính năng của planner.", en: "A low estimate on the outer side multiplies the inner loops. Fix the estimate; do not switch planner features off." }
  - q: { vi: "Kết luận 2. Cần chạy `ALTER TABLE orders ADD COLUMN note text` giữa giờ làm việc, khi một báo cáo dài đang đọc `orders`. Cách an toàn?", en: "Conclusion 2. You must run `ALTER TABLE orders ADD COLUMN note text` during business hours while a long report is reading `orders`. The safe way?" }
    options:
      - { vi: "`SET lock_timeout = '2s'` rồi chạy ALTER, thất bại thì thử lại sau; vì ALTER cần ACCESS EXCLUSIVE và lệnh đang chờ sẽ chặn mọi lệnh đến sau", en: "`SET lock_timeout = '2s'`, then run the ALTER and retry on failure; the ALTER needs ACCESS EXCLUSIVE, and a waiting command blocks every command behind it" }
      - { vi: "Chạy thẳng, ALTER không lấy lock nào", en: "Just run it, ALTER locks nothing" }
      - { vi: "Đặt `deadlock_timeout = 0`", en: "Set `deadlock_timeout = 0`" }
    answer: 0
    why: { vi: "Hàng đợi lock là FIFO: ALTER đang chờ báo cáo sẽ chặn cả các SELECT ngắn phía sau. `lock_timeout` để migration tự bỏ cuộc thay vì làm treo ứng dụng.", en: "The lock queue is FIFO: an ALTER waiting for the report blocks even short SELECTs behind it. `lock_timeout` makes the migration give up instead of freezing the app." }
  - q: { vi: "Kết luận 3. Báo cáo gồm ba câu (tổng đơn, tổng tiền, theo vùng) phải khớp nhau trong khi đơn mới vẫn được ghi. Mức cô lập nào?", en: "Conclusion 3. The report runs three statements (order count, total amount, by region) that must agree while new orders keep arriving. Which isolation level?" }
    options:
      - { vi: "Read Committed (mặc định)", en: "Read Committed (the default)" }
      - { vi: "Repeatable Read (khai báo `READ ONLY`): cả ba câu thấy cùng một snapshot", en: "Repeatable Read (as a `READ ONLY` transaction): all three statements see the same snapshot" }
      - { vi: "Read Uncommitted", en: "Read Uncommitted" }
    answer: 1
    why: { vi: "Read Committed lấy snapshot mỗi câu, nên ba con số có thể lệch nhau. Transaction chỉ đọc không gặp lỗi xung đột ghi.", en: "Read Committed takes a snapshot per statement, so the three figures can disagree. A read-only transaction never hits a write conflict." }
---

## Ý chính

Đội bán hàng báo hai vấn đề cùng tuần:

- báo cáo theo vùng lúc nhanh lúc chậm;
- một migration giữa giờ làm việc làm cả ứng dụng treo vài phút.

Nhiệm vụ: tìm bằng chứng cho từng vấn đề bằng số liệu thật, rồi kết luận. Bốn bước dùng lại cả L4: thống kê cột (MCV), thống kê mở rộng, thuật toán nối, lock trên bảng; ba câu kết luận thêm mức cô lập.

## Ví dụ

Số liệu thật trên PGlite:

```text
status MCV: {delivered,open,lost}  {0.8,0.18,0.02}

estimated  actual
20         100

Nested Loop
  ->  Index Only Scan using customers_pkey on customers c
  ->  Bitmap Heap Scan on orders o
        ->  Bitmap Index Scan on orders_customer_idx
```

## Thực hành

Bốn bước có chấm, một câu đoán kế hoạch, ba câu kết luận. Kỹ năng chuyên gia: tách một "hệ thống chậm" thành hai nguyên nhân khác nhau (ước lượng sai, chờ lock), chứng minh từng cái bằng `pg_stats`, `EXPLAIN` và `pg_locks`, và đề xuất cách sửa đúng chỗ.

# EN

## Key idea

The sales team reports two incidents in the same week:

- the per-region report is sometimes fast, sometimes slow;
- a migration during business hours froze the whole app for minutes.

The task: find evidence for each incident from real numbers, then conclude. The four steps reuse all of L4: column statistics (MCV), extended statistics, join algorithms, table locks; the three conclusion questions add isolation levels.

## Example

Real figures from PGlite:

```text
status MCV: {delivered,open,lost}  {0.8,0.18,0.02}

estimated  actual
20         100

Nested Loop
  ->  Index Only Scan using customers_pkey on customers c
  ->  Bitmap Heap Scan on orders o
        ->  Bitmap Index Scan on orders_customer_idx
```

## Practice

Four graded steps, one plan prediction, three conclusion questions. Expert skill: split a "slow system" into two different causes (a wrong estimate, a lock wait), prove each with `pg_stats`, `EXPLAIN` and `pg_locks`, and propose the fix in the right place.
