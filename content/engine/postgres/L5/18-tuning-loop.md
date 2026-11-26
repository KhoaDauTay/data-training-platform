---
id: e-pg-l5-18
engine: postgres
level: L5
module: observe-tune
title: "Vòng tinh chỉnh: EXPLAIN, index, thống kê, cấu hình"
title_en: "The tuning loop: EXPLAIN, index, statistics, configuration"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Đi một vòng tinh chỉnh theo thứ tự: đo bằng `EXPLAIN`, thêm index, làm mới thống kê, rồi mới chỉnh cấu hình", en: "Walk one tuning loop in order: measure with `EXPLAIN`, add an index, refresh the statistics, and only then change the configuration" }
  - { vi: "Đọc `n_distinct` trong `pg_stats` và biết đặt đè nó chỉ có hiệu lực sau `ANALYZE` kế tiếp", en: "Read `n_distinct` in `pg_stats` and know that an override only takes effect at the next `ANALYZE`" }
  - { vi: "Thấy một thay đổi `work_mem` đổi hẳn kế hoạch, và chứng minh bằng kế hoạch chứ không bằng cảm giác", en: "See a `work_mem` change switch the whole plan, and prove it with the plan, not a feeling" }
requires: [e-pg-l5-12]
figures: [{ name: pg-tuning-loop, at: idea }]
sources:
  - https://www.postgresql.org/docs/18/performance-tips.html
  - https://www.postgresql.org/docs/18/using-explain.html
  - https://www.postgresql.org/docs/18/planner-stats.html
  - https://www.postgresql.org/docs/18/sql-altertable.html
  - https://www.postgresql.org/docs/18/runtime-config-resource.html
lab:
  setup: |
    CREATE TABLE orders (id int PRIMARY KEY, customer_id int NOT NULL, status text NOT NULL, created date NOT NULL, amount int NOT NULL);
    INSERT INTO orders SELECT g, 1 + (g * 7919) % 2000, CASE WHEN g % 50 = 0 THEN 'refunded' WHEN g % 10 = 0 THEN 'pending' ELSE 'paid' END, DATE '2026-01-01' + (g % 300), 1000 + (g * 37) % 90000 FROM generate_series(1, 25000) g;
    SET work_mem = '64kB';
  steps:
    - task: { vi: "Câu hay chạy nhất là \"đơn của một khách\". Thêm index B-tree trên `orders(customer_id)` (để Postgres tự đặt tên).", en: "The most frequent query is \"one customer's orders\". Add a B-tree index on `orders(customer_id)` (let Postgres name it)." }
      solution: "CREATE INDEX ON orders (customer_id)"
      check: catalog
      hint: { vi: "`CREATE INDEX ON orders (customer_id)`; tên tự đặt là `orders_customer_id_idx`.", en: "`CREATE INDEX ON orders (customer_id)`; the generated name is `orders_customer_id_idx`." }
    - task: { vi: "Bảng vừa nạp chưa có thống kê nên planner đang đoán. Thu thập thống kê cho `orders`. Bài chấm bằng `n_distinct` của `customer_id` và `status` trong `pg_stats`.", en: "The freshly loaded table has no statistics, so the planner is guessing. Gather statistics for `orders`. It is graded by `n_distinct` of `customer_id` and `status` in `pg_stats`." }
      solution: "ANALYZE orders"
      after: "SELECT attname, n_distinct FROM pg_stats WHERE tablename = 'orders' AND attname IN ('customer_id', 'status') ORDER BY attname"
      check: rows
      ordered: true
      hint: { vi: "Một lệnh, một tên bảng. Autovacuum không chạy trong phòng lab này.", en: "One command, one table name. Autovacuum does not run in this lab." }
    - task: { vi: "Mã và số tiền các đơn của khách 42. Kế hoạch phải đi qua index của bước 1.", en: "The id and amount of customer 42's orders. The plan must go through the index from step 1." }
      solution: "SELECT id, amount FROM orders WHERE customer_id = 42"
      check: plan
      hint: { vi: "So sánh thẳng cột với giá trị; `customer_id + 0 = 42` cùng kết quả nhưng làm mất index.", en: "Compare the column directly with the value; `customer_id + 0 = 42` gives the same rows but loses the index." }
    - task: { vi: "Lab bắt đầu với `work_mem = 64kB`, quá nhỏ cho câu gom theo khách. Nâng `work_mem` của phiên này lên ít nhất `4MB` (không đổi toàn server).", en: "The lab starts with `work_mem = 64kB`, too small for the per-customer grouping. Raise this session's `work_mem` to at least `4MB` (not the whole server)." }
      solution: "SET work_mem = '4MB'"
      after: "SELECT setting::int >= 4096 AS enough FROM pg_settings WHERE name = 'work_mem'"
      check: rows
      hint: { vi: "`SET` có hiệu lực tới hết phiên. `SET LOCAL` ngoài transaction không đổi gì.", en: "`SET` holds until the session ends. `SET LOCAL` outside a transaction changes nothing." }
    - task: { vi: "Tổng tiền mỗi khách (mã khách, tổng). Với bộ nhớ mới, kế hoạch phải là `HashAggregate` trên một `Seq Scan`, không còn đọc từng dòng qua index.", en: "Total amount per customer (customer id, total). With the new memory the plan must be a `HashAggregate` over a `Seq Scan`, no longer reading row by row through the index." }
      solution: "SELECT customer_id, sum(amount) FROM orders GROUP BY customer_id"
      check: plan
      hint: { vi: "Câu gom bình thường; kế hoạch tự đổi nhờ bước 4.", en: "A plain grouping; the plan changes by itself thanks to step 4." }
quiz:
  - q: { vi: "Một báo cáo chậm. Đồng nghiệp đề xuất nâng `work_mem` toàn server ngay. Nên làm gì trước?", en: "A report is slow. A colleague proposes raising `work_mem` for the whole server right away. What should come first?" }
    options:
      - { vi: "Nâng `work_mem` trước vì đó là cách nhanh nhất", en: "Raise `work_mem` first because it is the fastest fix" }
      - { vi: "Đọc kế hoạch: nếu thấy Seq Scan lọc ít dòng, ước lượng lệch xa thực tế, hay tràn đĩa thì sửa theo đó (index, `ANALYZE`, rồi mới bộ nhớ)", en: "Read the plan: a Seq Scan that keeps few rows, estimates far from the actual rows, or a spill to disk each point to their own fix (index, `ANALYZE`, and only then memory)" }
      - { vi: "Chạy `VACUUM FULL` cho mọi bảng", en: "Run `VACUUM FULL` on every table" }
    answer: 1
    trap: 0
    why: { vi: "Nâng `work_mem` nghe hợp lý vì bộ nhớ hay giúp, nhưng nếu câu chậm vì thiếu index hay thống kê cũ thì thêm bộ nhớ không sửa gì; và `work_mem` áp cho từng nút sort/hash của từng phiên, nên nâng toàn server có thể làm hết RAM. `VACUUM FULL` mọi bảng giữ lock chặn từng bảng mà không nhắm vào nguyên nhân nào. Kế hoạch (execution plan) chỉ ra nguyên nhân: Seq Scan bỏ gần hết dòng thì thiếu index; ước lượng số dòng (row estimate) lệch xa thực tế thì cần `ANALYZE`; sort tràn ra đĩa thì mới tới bộ nhớ. Vòng đúng: đo, sửa nguyên nhân rẻ nhất, đo lại.", en: "Raising `work_mem` sounds reasonable because memory often helps, but if the query is slow from a missing index or stale statistics, more memory fixes nothing; and `work_mem` applies per sort/hash node of each session, so raising it server-wide can run out of RAM. `VACUUM FULL` on every table locks each table without targeting any cause. The plan shows the cause: a Seq Scan that discards almost every row means a missing index; a row estimate far from the actual rows calls for `ANALYZE`; only a sort spilling to disk points at memory. The right loop: measure, fix the cheapest cause, measure again." }
  - q: { vi: "Bạn chạy `ALTER TABLE orders ALTER COLUMN customer_id SET (n_distinct = 5000)`. Đọc `pg_stats` ngay sau đó thấy gì?", en: "You run `ALTER TABLE orders ALTER COLUMN customer_id SET (n_distinct = 5000)`. What does `pg_stats` show right after?" }
    options:
      - { vi: "`5000` ngay lập tức", en: "`5000` at once" }
      - { vi: "Giá trị cũ, cho tới lần `ANALYZE` kế tiếp", en: "The old value, until the next `ANALYZE`" }
      - { vi: "Lỗi, vì `n_distinct` chỉ đọc được", en: "An error, because `n_distinct` is read-only" }
    answer: 1
    trap: 0
    why: { vi: "\"`5000` ngay lập tức\" nghe hợp lý vì lệnh trông như sửa thẳng thống kê, nhưng `pg_stats` chỉ hiện kết quả của lần `ANALYZE` gần nhất. Lệnh này cũng không lỗi: nó chỉ lưu một tùy chọn của cột, và `ANALYZE` lần sau mới dùng tùy chọn đó thay cho số giá trị khác nhau tự ước lượng từ mẫu. Phần Lỗi hay gặp chạy đúng cảnh này.", en: "\"`5000` at once\" sounds right because the command looks like it edits the statistics, but `pg_stats` only shows the result of the latest `ANALYZE`. The command does not error either: it only stores a column option, and the next `ANALYZE` uses that option instead of the distinct-value count it estimates from its sample. The Common mistakes section runs exactly this." }
---
## Mở bài

Báo cáo theo khách chạy chậm dần, và ai cũng có một cách chữa: thêm RAM, thêm index, tăng `work_mem`. Đoán thì dễ trúng nhầm chỗ. Bài này đi một vòng tinh chỉnh có thứ tự, mỗi bước chứng minh bằng kế hoạch.

## Ý chính

Tinh chỉnh là một vòng lặp, không phải một danh sách mẹo: đo, sửa nguyên nhân rẻ nhất, đo lại. Đo bằng `EXPLAIN` (kế hoạch và ước lượng) và `EXPLAIN ANALYZE` (số dòng thật, `Buffers`, tràn đĩa). Trên server thật, `pg_stat_statements` cho biết câu nào đáng đo trước.

Thứ tự sửa theo giá rẻ. Một: câu viết sao cho dùng được index (so sánh thẳng cột) và có index hợp với câu hay chạy. Hai: thống kê. Planner chọn kế hoạch từ `pg_stats`; bảng vừa nạp hay vừa đổi nhiều mà chưa `ANALYZE` thì planner đoán bằng số mặc định. `n_distinct` là số giá trị khác nhau ước lượng (số âm nghĩa là tỉ lệ theo số dòng); khi mẫu đoán sai, `ALTER TABLE … ALTER COLUMN … SET (n_distinct = …)` đặt đè và `SET STATISTICS` lấy mẫu lớn hơn, cả hai chỉ có hiệu lực ở `ANALYZE` sau.

Ba: cấu hình, và ở phạm vi hẹp nhất. Nhiều người nghĩ cấu hình là chỗ chỉnh đầu tiên. Thật ra nó đứng cuối: nâng `work_mem` cho phiên hay vai trò cần nó, rồi đo lại. Trong lab, cùng một câu gom đổi từ `GroupAggregate` đọc 25.000 lần qua index sang `HashAggregate` đọc 161 trang chỉ vì `work_mem`.

Hình từng bước ở cuối mục này đi hết vòng đó trên bảng `orders` của lab, mỗi lần sửa nằm giữa hai lần đo.

## Cú pháp

```sql
EXPLAIN [ ( ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF ) ] query;
CREATE INDEX [ name ] ON table ( column [, ...] );
ANALYZE [ table [ ( column [, ...] ) ] ];
ALTER TABLE table ALTER COLUMN column SET ( n_distinct = value );
ALTER TABLE table ALTER COLUMN column SET STATISTICS integer;
SET work_mem = 'value';  RESET work_mem;
```

- `EXPLAIN ANALYZE` chạy thật câu lệnh; với câu ghi, bọc trong `BEGIN … ROLLBACK`.
- `n_distinct`: số dương là số giá trị khác nhau; từ `-1` tới `0` là tỉ lệ so với số dòng (`-1` = mọi giá trị khác nhau).
- `SET STATISTICS`: số mẫu cho cột đó (mặc định theo `default_statistics_target` = 100).

## Ví dụ

Đo trước: chưa có index, chưa có thống kê. Planner ước 86 dòng cho mọi điều kiện bằng.

```sql
EXPLAIN SELECT id, amount FROM orders WHERE customer_id = 42;
```

Thêm index, thu thập thống kê, đọc lại kế hoạch: `Bitmap Index Scan on orders_customer_id_idx`, ước 13 dòng.

```sql
CREATE INDEX ON orders (customer_id);
ANALYZE orders;
EXPLAIN SELECT id, amount FROM orders WHERE customer_id = 42;
```

Thống kê planner vừa đọc: 2.000 khách, 3 trạng thái và các giá trị hay gặp nhất.

```sql
SELECT attname, n_distinct, most_common_vals::text AS common
FROM pg_stats WHERE tablename = 'orders' AND attname IN ('customer_id', 'status') ORDER BY attname;
```

Câu gom với `work_mem = 64kB`: bảng băm 2.000 nhóm không vừa, nên planner chọn `GroupAggregate` trên `Index Scan`, `Buffers: shared hit=25000`.

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT customer_id, sum(amount) FROM orders GROUP BY customer_id;
```

Nâng bộ nhớ cho phiên rồi đo lại: `HashAggregate`, `Memory Usage: 161kB`, chỉ 161 trang.

```sql
SET work_mem = '4MB';
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT customer_id, sum(amount) FROM orders GROUP BY customer_id;
RESET work_mem;
```

## Lỗi hay gặp

Có index nhưng câu bọc cột trong phép tính:

```sql
-- WRONG: customer_id + 0 hides the column, the index is skipped
EXPLAIN (COSTS OFF) SELECT id, amount FROM orders WHERE customer_id + 0 = 42;
```

```sql
-- FIX: compare the column itself
EXPLAIN (COSTS OFF) SELECT id, amount FROM orders WHERE customer_id = 42;
```

Đặt đè `n_distinct` rồi đọc ngay:

```sql
-- WRONG: the override is stored, but pg_stats still shows the old estimate
ALTER TABLE orders ALTER COLUMN customer_id SET (n_distinct = 5000);
SELECT n_distinct FROM pg_stats WHERE tablename = 'orders' AND attname = 'customer_id';
```

```sql
-- FIX: the next ANALYZE applies it
ANALYZE orders;
SELECT n_distinct FROM pg_stats WHERE tablename = 'orders' AND attname = 'customer_id';
```

Câu sai vẫn thấy `2000`; sau `ANALYZE` thấy `5000`. Chỉ đặt đè khi chắc chắn số thật, vì từ giờ `ANALYZE` không tự ước lượng cột này nữa.

Giá trị `n_distinct` ngoài miền:

```sql
-- ERROR 22023: value -2 out of bounds for option "n_distinct"
ALTER TABLE orders ALTER COLUMN customer_id SET (n_distinct = -2);
```

## Thực hành

Năm bước theo đúng vòng: thêm index, `ANALYZE`, viết câu tra một khách có kế hoạch qua index, nâng `work_mem` cho phiên, rồi viết câu gom mà kế hoạch chuyển sang `HashAggregate`. Hai bước được chấm bằng kế hoạch. Sau đó là hai câu hỏi.

## Tóm tắt

- Tinh chỉnh là vòng lặp đo, sửa, đo lại; bằng chứng là kế hoạch và `EXPLAIN ANALYZE`, không phải cảm giác.
- Thứ tự theo giá: cách viết câu và index, rồi thống kê (`ANALYZE`, `n_distinct`, `SET STATISTICS`), rồi mới cấu hình.
- Đặt đè `n_distinct` và `SET STATISTICS` chỉ có hiệu lực ở `ANALYZE` kế tiếp.
- Chỉnh `work_mem` ở phạm vi hẹp nhất (phiên, vai trò, transaction); bài `e-pg-l5-12` nói vì sao.

# EN

## Opening

The per-customer report gets slower and slower, and everyone has a fix: more RAM, another index, a bigger `work_mem`. Guessing easily hits the wrong spot. This lesson walks one tuning loop in order, and proves each step with the plan.

## Key idea

Tuning is a loop, not a list of tips: measure, fix the cheapest cause, measure again. Measure with `EXPLAIN` (the plan and its estimates) and `EXPLAIN ANALYZE` (actual rows, `Buffers`, spills to disk). On a real server, `pg_stat_statements` tells you which query to measure first.

Fix in order of cost. One: the query is written so it can use an index (compare the column directly) and there is an index that fits the frequent query. Two: statistics. The planner picks a plan from `pg_stats`; a freshly loaded or heavily changed table that has not been through `ANALYZE` makes the planner guess with default numbers. `n_distinct` is the estimated number of distinct values (a negative number means a ratio of the row count); when the sample guesses wrong, `ALTER TABLE … ALTER COLUMN … SET (n_distinct = …)` overrides it and `SET STATISTICS` takes a bigger sample, both only at the next `ANALYZE`.

Three: configuration, at the narrowest scope. Many people think configuration is the first thing to tune. In fact it comes last: raise `work_mem` for the session or role that needs it, then measure again. In the lab the same grouping switches from a `GroupAggregate` reading 25,000 times through the index to a `HashAggregate` reading 161 pages, only because of `work_mem`.

The step-through figure at the end of this section walks that loop on the lab's `orders` table, each fix sitting between two measurements.

## Syntax

```sql
EXPLAIN [ ( ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF ) ] query;
CREATE INDEX [ name ] ON table ( column [, ...] );
ANALYZE [ table [ ( column [, ...] ) ] ];
ALTER TABLE table ALTER COLUMN column SET ( n_distinct = value );
ALTER TABLE table ALTER COLUMN column SET STATISTICS integer;
SET work_mem = 'value';  RESET work_mem;
```

- `EXPLAIN ANALYZE` really runs the statement; wrap a write in `BEGIN … ROLLBACK`.
- `n_distinct`: a positive number is the count of distinct values; from `-1` to `0` it is a ratio of the row count (`-1` = every value distinct).
- `SET STATISTICS`: the sample size for that column (by default `default_statistics_target` = 100).

## Example

Measure first: no index, no statistics yet. The planner expects 86 rows for any equality condition.

```sql
EXPLAIN SELECT id, amount FROM orders WHERE customer_id = 42;
```

Add the index, gather statistics, read the plan again: `Bitmap Index Scan on orders_customer_id_idx`, 13 rows expected.

```sql
CREATE INDEX ON orders (customer_id);
ANALYZE orders;
EXPLAIN SELECT id, amount FROM orders WHERE customer_id = 42;
```

The statistics the planner just read: 2,000 customers, 3 statuses and the most common values.

```sql
SELECT attname, n_distinct, most_common_vals::text AS common
FROM pg_stats WHERE tablename = 'orders' AND attname IN ('customer_id', 'status') ORDER BY attname;
```

The grouping with `work_mem = 64kB`: a hash table of 2,000 groups does not fit, so the planner picks a `GroupAggregate` over an `Index Scan`, `Buffers: shared hit=25000`.

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT customer_id, sum(amount) FROM orders GROUP BY customer_id;
```

Raise the session's memory and measure again: `HashAggregate`, `Memory Usage: 161kB`, only 161 pages.

```sql
SET work_mem = '4MB';
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT customer_id, sum(amount) FROM orders GROUP BY customer_id;
RESET work_mem;
```

## Common mistakes

An index exists, but the query wraps the column in arithmetic:

```sql
-- WRONG: customer_id + 0 hides the column, the index is skipped
EXPLAIN (COSTS OFF) SELECT id, amount FROM orders WHERE customer_id + 0 = 42;
```

```sql
-- FIX: compare the column itself
EXPLAIN (COSTS OFF) SELECT id, amount FROM orders WHERE customer_id = 42;
```

Overriding `n_distinct` and reading it at once:

```sql
-- WRONG: the override is stored, but pg_stats still shows the old estimate
ALTER TABLE orders ALTER COLUMN customer_id SET (n_distinct = 5000);
SELECT n_distinct FROM pg_stats WHERE tablename = 'orders' AND attname = 'customer_id';
```

```sql
-- FIX: the next ANALYZE applies it
ANALYZE orders;
SELECT n_distinct FROM pg_stats WHERE tablename = 'orders' AND attname = 'customer_id';
```

The wrong version still shows `2000`; after `ANALYZE` it shows `5000`. Only override when you are sure of the real number, because from now on `ANALYZE` no longer estimates this column itself.

An `n_distinct` value out of range:

```sql
-- ERROR 22023: value -2 out of bounds for option "n_distinct"
ALTER TABLE orders ALTER COLUMN customer_id SET (n_distinct = -2);
```

## Practice

Five steps along the loop: add the index, `ANALYZE`, write the one-customer query with a plan through the index, raise `work_mem` for the session, then write the grouping whose plan switches to `HashAggregate`. Two steps are graded by the plan. Then two questions.

## Recap

- Tuning is a loop of measure, fix, measure again; the proof is the plan and `EXPLAIN ANALYZE`, not a feeling.
- Order by cost: how the query is written and the index, then statistics (`ANALYZE`, `n_distinct`, `SET STATISTICS`), then configuration.
- An `n_distinct` override and `SET STATISTICS` only take effect at the next `ANALYZE`.
- Tune `work_mem` at the narrowest scope (session, role, transaction); lesson `e-pg-l5-12` explains why.
