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
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Đi từ ước lượng sai tới thuật toán nối sai, dùng `pg_stats` và ước lượng thật", en: "Go from a wrong estimate to a wrong join algorithm, using `pg_stats` and real estimates" }
  - { vi: "Chứng minh câu tra một khách dùng Nested Loop qua index", en: "Prove that the one-customer lookup uses a Nested Loop through an index" }
  - { vi: "Đọc lock mà một lệnh ghi thật sự lấy, và đề xuất cách chạy migration không làm treo ứng dụng", en: "Read the locks a write really takes, and propose how to run a migration without freezing the app" }
  - { vi: "Viết câu tra đơn của một khách vừa đúng vừa đi qua index", en: "Write a customer's order lookup that is both right and goes through an index" }
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
    - task: { vi: "Bước 2, ước lượng. Báo cáo lọc khách theo vùng 2 và quốc gia 20 (cột `region`, `country` của `customers`) (quốc gia do vùng quyết định). So ước lượng của planner trên `customers` với số dòng thật. Hai cột: estimated (dùng `est(text)`), actual.", en: "Step 2, estimates. The report filters customers on region 2 and country 20 (columns `region`, `country` of `customers`) (the country is fixed by the region). Compare the planner's estimate on `customers` with the real count. Two columns: estimated (use `est(text)`), actual." }
      solution: "SELECT est('SELECT * FROM customers WHERE region = 2 AND country = 20') AS estimated, (SELECT count(*) FROM customers WHERE region = 2 AND country = 20) AS actual"
      check: rows
      hint: { vi: "Planner nhân hai độ chọn lọc như thể độc lập.", en: "The planner multiplies the two selectivities as if independent." }
    - task: { vi: "Bước 3, câu tra một khách. Mã và số tiền (`amount`) các đơn của khách số 42 (nối `customers` với `orders`). Kế hoạch phải là Nested Loop, phía trong đi qua `orders_customer_idx`.", en: "Step 3, the one-customer lookup. Id and amount (`amount`) of customer 42's orders (join `customers` to `orders`). The plan must be a Nested Loop whose inner side goes through `orders_customer_idx`." }
      solution: "SELECT o.id, o.amount FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.id = 42"
      check: plan
      hint: { vi: "Lọc khách bằng khóa chính rồi JOIN.", en: "Filter the customer by primary key, then JOIN." }
    - task: { vi: "Bước 4, lock. Trong cùng một câu: đặt đơn 1 sang 'open' (CTE UPDATE … RETURNING), rồi liệt kê tên quan hệ và lock mode trong `pg_locks` cho mọi quan hệ có tên bắt đầu bằng `orders`. Sắp theo tên rồi chế độ.", en: "Step 4, locks. In one statement: set order 1 to 'open' (a CTE UPDATE … RETURNING), then list the relation name and lock mode in `pg_locks` for every relation whose name starts with `orders`. Order by name, then mode." }
      solution: "WITH u AS (UPDATE orders SET status = 'open' WHERE id = 1 RETURNING id) SELECT c.relname, l.mode FROM u, pg_locks l JOIN pg_class c ON c.oid = l.relation WHERE c.relname LIKE 'orders%' ORDER BY 1, 2"
      check: rows
      ordered: true
      hint: { vi: "Như bài lock mode trên bảng: nối `pg_locks.relation` với `pg_class.oid`, trong cùng câu với UPDATE vì lock nhả khi câu xong.", en: "As in the table lock modes lesson: join `pg_locks.relation` to `pg_class.oid`, in the same statement as the UPDATE because the locks are released when it ends." }
    - task: { vi: "Bước 5, trang khách hàng. Mã và số tiền các đơn của khách số 77, sắp theo mã đơn. Bài chấm cả tốc độ: câu trả đúng dòng mà không đọc `orders` qua index vẫn chưa đạt.", en: "Step 5, the customer page. Id and amount of customer 77's orders, sorted by order id. Speed is graded too: a query that returns the right rows without reading `orders` through an index does not pass yet." }
      solution: "SELECT id, amount FROM orders WHERE customer_id = 77 ORDER BY id"
      check: rows
      ordered: true
      perf: { table: orders }
      slow: "SELECT id, amount FROM orders WHERE customer_id + 0 = 77 ORDER BY id"
      hint: { vi: "So sánh cột `customer_id` trực tiếp với số 77; một phép tính trên cột (`customer_id + 0`) làm planner bỏ `orders_customer_idx`.", en: "Compare column `customer_id` directly with the number 77; arithmetic on the column (`customer_id + 0`) makes the planner drop `orders_customer_idx`." }
predict:
  sql: "SELECT * FROM orders WHERE status = 'lost'"
  q: { vi: "Đơn thất lạc chiếm 2 %. Postgres đọc thế nào?", en: "Lost orders are 2%. How does Postgres read them?" }
  options:
    - { vi: "Seq Scan với Filter", en: "A Seq Scan with a Filter" }
    - { vi: "Bitmap Heap Scan qua `orders_status_idx`", en: "A Bitmap Heap Scan through `orders_status_idx`" }
    - { vi: "Index Only Scan", en: "An Index Only Scan" }
  answer: 1
  trap: 0
  why: { vi: "Seq Scan nghe hợp lý vì 400 dòng vẫn là khá nhiều, nhưng ước lượng số dòng là tần suất của 'lost' trong danh sách giá trị phổ biến (MCV) × số dòng = 0,02 × 20.000 = 400, đủ hiếm để đi qua index rẻ hơn đọc cả bảng. Vì 400 dòng rải trên nhiều trang, Postgres dùng bitmap: gom vị trí các dòng theo trang trước, rồi đọc mỗi trang một lần (Bitmap Heap Scan). Câu cần mọi cột mà index chỉ chứa `status`, nên không thể Index Only Scan.", en: "A Seq Scan sounds right because 400 rows is still quite a few, but the row estimate is the frequency of 'lost' in the most-common-values (MCV) list × the row count = 0.02 × 20,000 = 400, rare enough that the index is cheaper than reading the whole table. Since the 400 rows are spread over many pages, Postgres uses a bitmap: it first groups the row positions by page, then reads each page once (Bitmap Heap Scan). The query needs every column and the index only holds `status`, so an Index Only Scan is impossible." }
  expect: { node: Bitmap Index Scan, index: orders_status_idx }
quiz:
  - q: { vi: "Kết luận 1. Bước 2 ước lượng 20, thật 100. Khi bảng này là phía ngoài của một phép nối lớn, hậu quả và cách sửa?", en: "Conclusion 1. Step 2 estimated 20 against 100 real rows. When this table is the outer side of a big join, what follows and what is the fix?" }
    options:
      - { vi: "Planner có thể chọn Nested Loop vì tưởng ít dòng; sửa bằng `CREATE STATISTICS … (dependencies) ON region, country` rồi ANALYZE", en: "The planner may choose a Nested Loop because it expects few rows; fix with `CREATE STATISTICS … (dependencies) ON region, country`, then ANALYZE" }
      - { vi: "Không ảnh hưởng gì", en: "No effect at all" }
      - { vi: "Tắt `enable_nestloop` cho cả server", en: "Turn `enable_nestloop` off for the whole server" }
    answer: 0
    trap: 2
    why: { vi: "Ước lượng 20 đến từ việc planner coi vùng và quốc gia là độc lập: 500 khách × 1/5 × 1/5 = 20; thật ra quốc gia do vùng quyết định, nên có 500 ÷ 5 = 100 khách. \"Không ảnh hưởng\" sai: ở phía ngoài của Nested Loop, mỗi dòng phía ngoài là một lần lặp phía trong, nên planner tưởng 20 lần lặp mà thật ra chạy 100 lần, và với số liệu lệch hơn thì một cách nối khác đã rẻ hơn. Tắt `enable_nestloop` cho cả server chỉ che triệu chứng và làm hỏng các câu mà Nested Loop là cách tốt nhất, như câu tra một khách ở bước 3. Sửa gốc là thống kê mở rộng (extended statistics) loại `dependencies`.", en: "The estimate of 20 comes from treating region and country as independent: 500 customers × 1/5 × 1/5 = 20; in fact the country is fixed by the region, so there are 500 ÷ 5 = 100 customers. \"No effect\" is wrong: on the outer side of a Nested Loop each outer row is one inner loop, so the planner expects 20 loops that really run 100 times, and with more skewed data another join method would have been cheaper. Turning off `enable_nestloop` server-wide only hides the symptom and hurts queries where a Nested Loop is best, like the one-customer lookup in step 3. The root fix is extended statistics of kind `dependencies`." }
  - q: { vi: "Kết luận 2. Cần chạy `ALTER TABLE orders ADD COLUMN note text` giữa giờ làm việc, khi một báo cáo dài đang đọc `orders`. Cách an toàn?", en: "Conclusion 2. You must run `ALTER TABLE orders ADD COLUMN note text` during business hours while a long report is reading `orders`. The safe way?" }
    options:
      - { vi: "`SET lock_timeout = '2s'` rồi chạy ALTER, thất bại thì thử lại sau; vì ALTER cần ACCESS EXCLUSIVE và lệnh đang chờ sẽ chặn mọi lệnh đến sau", en: "`SET lock_timeout = '2s'`, then run the ALTER and retry on failure; the ALTER needs ACCESS EXCLUSIVE, and a waiting command blocks every command behind it" }
      - { vi: "Chạy thẳng, ALTER không lấy lock nào", en: "Just run it, ALTER locks nothing" }
      - { vi: "Đặt `deadlock_timeout = 0`", en: "Set `deadlock_timeout = 0`" }
    answer: 0
    trap: 1
    why: { vi: "Chạy thẳng nghe ổn vì thêm một cột không giá trị mặc định chỉ sửa danh mục hệ thống (system catalog), xong trong tích tắc, nhưng nó vẫn cần lock ACCESS EXCLUSIVE, mà báo cáo dài đang giữ ACCESS SHARE. Lock được cấp theo thứ tự đến: ALTER đang chờ báo cáo, và mọi SELECT ngắn đến sau phải xếp hàng sau ALTER, nên ứng dụng treo cho tới khi báo cáo xong. `deadlock_timeout` không giúp vì không có vòng chờ nào, chỉ có một hàng chờ dài. `SET lock_timeout = '2s'` làm ALTER tự bỏ cuộc sau 2 giây, giải phóng hàng đợi, rồi thử lại lúc vắng.", en: "Running it directly sounds fine because adding a column with no default only changes the system catalog and finishes in an instant, but it still needs an ACCESS EXCLUSIVE lock, and the long report holds ACCESS SHARE. Locks are granted in arrival order: the ALTER waits for the report, and every short SELECT arriving later queues behind the ALTER, so the app hangs until the report ends. `deadlock_timeout` does not help because there is no wait cycle, only a long queue. `SET lock_timeout = '2s'` makes the ALTER give up after 2 seconds, which frees the queue, and you retry at a quiet time." }
  - q: { vi: "Kết luận 3. Báo cáo gồm ba câu (tổng đơn, tổng tiền, theo vùng) phải khớp nhau trong khi đơn mới vẫn được ghi. Mức cô lập nào?", en: "Conclusion 3. The report runs three statements (order count, total amount, by region) that must agree while new orders keep arriving. Which isolation level?" }
    options:
      - { vi: "Read Committed (mặc định)", en: "Read Committed (the default)" }
      - { vi: "Repeatable Read (khai báo `READ ONLY`): cả ba câu thấy cùng một snapshot", en: "Repeatable Read (as a `READ ONLY` transaction): all three statements see the same snapshot" }
      - { vi: "Read Uncommitted", en: "Read Uncommitted" }
    answer: 1
    trap: 0
    why: { vi: "Read Committed hấp dẫn vì nó là mặc định và không bao giờ thấy dữ liệu chưa commit, nhưng nó lấy một snapshot mới cho mỗi câu: một đơn được commit giữa câu 1 và câu 2 sẽ có trong tổng tiền mà không có trong tổng đơn, nên ba con số lệch nhau. Read Uncommitted ở Postgres chạy như Read Committed, nên cũng lệch. Repeatable Read cho cả transaction một snapshot, nên ba câu thấy cùng một tập đơn; transaction chỉ đọc thì không bao giờ gặp lỗi xung đột ghi 40001.", en: "Read Committed is tempting because it is the default and never sees uncommitted data, but it takes a new snapshot for each statement: an order committed between statement 1 and statement 2 lands in the total amount but not in the order count, so the three figures disagree. Read Uncommitted behaves like Read Committed in Postgres, so it disagrees too. Repeatable Read gives the whole transaction one snapshot, so all three statements see the same set of orders; a read-only transaction never hits the 40001 write-conflict error." }
---

## Mở bài

Đội bán hàng báo hai sự cố trong cùng một tuần: báo cáo theo vùng lúc nhanh lúc chậm, và một migration giữa giờ làm việc làm cả ứng dụng treo vài phút. Hai triệu chứng nghe như một, nhưng nguyên nhân khác nhau. Việc của bạn là tìm bằng chứng cho từng cái bằng số liệu thật, rồi kết luận.

## Ý chính

Năm bước dùng lại cả cấp L4: thống kê cột (MCV), thống kê mở rộng, thuật toán nối, lock trên bảng, và một câu đọc vừa đúng vừa nhanh. Ba câu kết luận thêm mức cô lập.

Bước 5 có thanh hiệu năng: câu trả đúng dòng mà không đọc `orders` qua index vẫn chưa qua. Mỗi bước chạy trên một database mới dựng từ setup; các bước trước của bài chỉ đọc, nên không bước nào đổi dữ liệu cho bước sau.

## Ví dụ

Số liệu thật trên PGlite, để bạn biết mình đang tìm gì:

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

Năm bước có chấm, một câu đoán kế hoạch, ba câu kết luận. Tách một "hệ thống chậm" thành hai nguyên nhân (ước lượng sai, chờ lock), chứng minh từng cái bằng `pg_stats`, `EXPLAIN` và `pg_locks`, rồi viết câu tra đơn của một khách đi qua index.

## Tóm tắt

- Ước lượng sai bắt đầu từ thống kê: đọc `pg_stats`, và dùng `CREATE STATISTICS` khi hai cột phụ thuộc nhau.
- Ước lượng thấp ở phía ngoài làm planner chọn sai thuật toán nối; sửa ước lượng, đừng tắt tính năng của planner.
- DDL cần ACCESS EXCLUSIVE và lock được cấp theo thứ tự đến (FIFO): đặt `lock_timeout` trước migration.
- So sánh cột trực tiếp với giá trị; phép tính trên cột làm planner bỏ index.

# EN

## Opening

The sales team reports two incidents in the same week: the per-region report is sometimes fast, sometimes slow, and a migration during business hours froze the whole app for minutes. The two symptoms sound like one, but their causes differ. Your job is to find evidence for each from real numbers, then conclude.

## Key idea

The five steps reuse all of level L4: column statistics (MCV), extended statistics, join algorithms, table locks, and a read that is both right and fast. The three conclusion questions add isolation levels.

Step 5 has a performance bar: a query that returns the right rows without reading `orders` through an index does not pass yet. Each step runs on a fresh database built from the setup; the earlier steps only read, so no step changes the data for the next.

## Example

Real figures from PGlite, so you know what you are looking for:

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

Five graded steps, one plan prediction, three conclusion questions. Split a "slow system" into two causes (a wrong estimate, a lock wait), prove each with `pg_stats`, `EXPLAIN` and `pg_locks`, then write a customer's order lookup that goes through an index.

## Recap

- A wrong estimate starts in the statistics: read `pg_stats`, and use `CREATE STATISTICS` when two columns depend on each other.
- A low estimate on the outer side makes the planner pick the wrong join algorithm; fix the estimate, do not switch planner features off.
- DDL needs ACCESS EXCLUSIVE and locks are granted in arrival order (FIFO): set `lock_timeout` before a migration.
- Compare the column directly with the value; arithmetic on the column makes the planner drop the index.
