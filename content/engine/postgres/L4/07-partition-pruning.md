---
id: e-pg-l4-07
engine: postgres
level: L4
module: partitioning
title: "Phân vùng khai báo và partition pruning"
title_en: "Declarative partitioning and partition pruning"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Viết câu để planner chỉ đọc đúng phân vùng cần (pruning lúc lập kế hoạch)", en: "Write a query the planner prunes to the one partition it needs (plan-time pruning)" }
  - { vi: "Nhận ra pruning lúc chạy qua `(never executed)` khi giá trị chỉ biết lúc thực thi", en: "Recognise run-time pruning through `(never executed)` when the value is only known at execution" }
  - { vi: "Đọc cây phân vùng bằng `pg_partition_tree`", en: "Read the partition tree with `pg_partition_tree`" }
requires: [e-pg-l4-02]
sources:
  - { url: https://www.postgresql.org/docs/18/ddl-partitioning.html, title_vi: "Phân vùng bảng (partitioning)" }
  - { url: https://www.postgresql.org/docs/18/functions-admin.html, title_vi: "Hàm quản trị hệ thống" }
viz: pg-partition-prune
lab:
  setup: |
    DROP TABLE IF EXISTS events CASCADE;
    CREATE TABLE events (id int NOT NULL, tenant_id int NOT NULL, created_on date NOT NULL, kind text NOT NULL) PARTITION BY RANGE (created_on);
    CREATE TABLE events_2026_08 PARTITION OF events FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
    CREATE TABLE events_2026_09 PARTITION OF events FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
    CREATE TABLE events_2026_10 PARTITION OF events FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
    CREATE TABLE events_default PARTITION OF events DEFAULT;
    INSERT INTO events SELECT g, g % 50 + 1, DATE '2026-08-01' + (g % 92), CASE WHEN g % 3 = 0 THEN 'scan' ELSE 'view' END FROM generate_series(1, 9200) g;
    ANALYZE events;
  steps:
    - task: { vi: "Đếm sự kiện trong tuần đầu tháng 10/2026 (từ 2026-10-01 đến trước 2026-10-08). Chỉ một phân vùng được đọc.", en: "Count the events in the first week of October 2026 (from 2026-10-01 up to, not including, 2026-10-08). Only one partition may be read." }
      solution: "SELECT count(*) FROM events WHERE created_on >= '2026-10-01' AND created_on < '2026-10-08'"
      check: plan
      hint: { vi: "Lọc trực tiếp trên khóa phân vùng bằng hằng số ngày.", en: "Filter directly on the partition key with literal dates." }
    - task: { vi: "Liệt kê cây phân vùng của `events` bằng hàm `pg_partition_tree('events')`: tên quan hệ, tên cha (đều ép text), có phải lá không, cấp. Sắp theo tên quan hệ.", en: "List the partition tree of `events` with the function `pg_partition_tree('events')`: relation name, parent name (both cast to text), whether it is a leaf, level. Order by relation name." }
      solution: "SELECT relid::text, parentrelid::text, isleaf, level FROM pg_partition_tree('events') ORDER BY relid::text"
      check: rows
      ordered: true
      hint: { vi: "Hàm `pg_partition_tree(regclass)`.", en: "The `pg_partition_tree(regclass)` function." }
    - task: { vi: "Đếm sự kiện của tenant 7 (cột `tenant_id`) trong cả tháng 9/2026. Kế hoạch chỉ được chạm `events_2026_09`.", en: "Count tenant 7's events (column `tenant_id`) in the whole of September 2026. The plan may only touch `events_2026_09`." }
      solution: "SELECT count(*) FROM events WHERE tenant_id = 7 AND created_on >= '2026-09-01' AND created_on < '2026-10-01'"
      check: plan
      hint: { vi: "Điều kiện tenant không giúp pruning; điều kiện ngày thì có.", en: "The tenant condition does not prune; the date condition does." }
predict:
  sql: "SELECT count(*) FROM events WHERE created_on = (SELECT max(created_on) FROM events_2026_09)"
  q: { vi: "Ngày cần lọc chỉ biết lúc chạy (từ truy vấn con). Kế hoạch (trước khi chạy) giữ mấy phân vùng của `events` dưới Append?", en: "The date to filter on is only known at run time (from a sub-query). How many `events` partitions does the plan (before running) keep under the Append?" }
  options:
    - { vi: "Một: phân vùng tháng 9", en: "One: the September partition" }
    - { vi: "Cả bốn; ba cái sẽ bị bỏ lúc chạy (`EXPLAIN ANALYZE` hiện chúng là `(never executed)`)", en: "All four; three will be skipped at run time (`EXPLAIN ANALYZE` shows them as `(never executed)`)" }
    - { vi: "Không phân vùng nào, vì truy vấn con chạy trước", en: "None, because the sub-query runs first" }
  answer: 1
  trap: 0
  why: { vi: "\"Một phân vùng\" nghe hợp lý vì cuối cùng chỉ tháng 9 khớp, nhưng ngày đó do truy vấn con tính ra, và truy vấn con chỉ chạy khi câu đã bắt đầu thực thi. Lúc lập kế hoạch Postgres chưa biết ngày, nên chưa bỏ được phân vùng nào: cả bốn (ba tháng và `events_default`) nằm dưới Append. Lúc chạy, truy vấn con (trong kế hoạch là InitPlan, phần chạy một lần trước khi đọc bảng) trả về ngày, rồi Postgres bỏ qua ba phân vùng không thể khớp, nên `EXPLAIN ANALYZE` ghi chúng `(never executed)`.", en: "\"One partition\" sounds right because only September matches in the end, but the date comes from a sub-query, and the sub-query only runs once execution has started. At plan time Postgres does not know the date, so it can prune nothing: all four (three months plus `events_default`) stay under the Append. At run time the sub-query (an InitPlan in the plan, a part that runs once before the table is read) returns the date, then Postgres skips the three partitions that cannot match, so `EXPLAIN ANALYZE` marks them `(never executed)`." }
  expect: { node: Seq Scan, table: events_default }
quiz:
  - q: { vi: "Bảng đơn 2 triệu dòng, câu hay chạy nhất lọc theo mã khách và đã có index trên cột đó. Đồng nghiệp đề nghị phân vùng theo tháng để câu này nhanh hơn. Điều gì đúng?", en: "An orders table holds 2 million rows; the most frequent query filters by customer id and already has an index on it. A colleague suggests monthly partitions to make that query faster. What is true?" }
    options:
      - { vi: "Nhanh hơn chắc chắn: bảng phân vùng luôn nhanh hơn bảng thường", en: "Faster for sure: a partitioned table is always faster than a plain one" }
      - { vi: "Không nhanh hơn, có thể chậm hơn: điều kiện không chứa khóa phân vùng nên câu phải dò index của mọi phân vùng", en: "Not faster, maybe slower: the condition does not hold the partition key, so the query must probe the index of every partition" }
      - { vi: "Chỉ nhanh hơn khi có phân vùng `DEFAULT`", en: "Only faster when there is a `DEFAULT` partition" }
    answer: 1
    trap: 0
    why: { vi: "\"Chắc chắn nhanh hơn\" nghe hợp lý vì mỗi phân vùng nhỏ hơn, nhưng partition pruning (bỏ qua phân vùng không cần đọc) chỉ dùng điều kiện trên khóa phân vùng, ở đây là tháng. Câu lọc theo mã khách không nói gì về tháng, nên không phân vùng nào bị bỏ: thay vì một lần tra index trên bảng 2 triệu dòng, Postgres tra index của từng phân vùng, mỗi tháng một lần. Phân vùng `DEFAULT` chỉ hứng các dòng không thuộc khoảng nào, không giúp pruning. Lợi ích chính của phân vùng thường là vận hành: xóa dữ liệu cũ bằng `DROP` một phân vùng, VACUUM từng phần nhỏ.", en: "\"Faster for sure\" sounds right because each partition is smaller, but partition pruning (skipping partitions that need no read) only uses conditions on the partition key, here the month. A filter on the customer id says nothing about the month, so no partition is skipped: instead of one index probe on a 2-million-row table, Postgres probes each partition's index, once per month. A `DEFAULT` partition only catches rows outside every range and does not help pruning. The main benefit of partitioning is usually operational: removing old data with a `DROP` of one partition, running VACUUM on small pieces." }
---
## Mở bài

Bảng sự kiện chia theo tháng, và báo cáo chỉ cần tuần đầu tháng 10. Postgres có biết bỏ qua các tháng khác, hay vẫn đọc hết? Câu trả lời tùy vào cách bạn viết điều kiện.

## Ý chính

Phân vùng khai báo: bảng cha khai báo `PARTITION BY RANGE`, `LIST` hoặc `HASH` trên một khóa, còn mỗi phân vùng là một bảng thật với giới hạn riêng. Bảng cha không chứa dòng nào; mỗi dòng ghi vào bảng cha được chuyển tới đúng phân vùng. Phân vùng `DEFAULT` nhận mọi dòng không khớp phân vùng nào khác.

Pruning là bỏ những phân vùng không thể chứa dòng khớp. Nó xảy ra ở hai thời điểm. Lúc lập kế hoạch: điều kiện so khóa với hằng số, nên phân vùng thừa biến mất khỏi kế hoạch. Lúc chạy: giá trị đến từ tham số hay truy vấn con, nên phân vùng vẫn có trong kế hoạch nhưng `EXPLAIN` ghi `Subplans Removed: n`, hoặc `EXPLAIN ANALYZE` ghi `(never executed)`.

Pruning chỉ dùng điều kiện đặt thẳng trên khóa phân vùng. Bọc khóa trong hàm hay ép kiểu, như `date_trunc('month', created_on)` hay `created_on::text`, làm mất pruning; hãy viết điều kiện khoảng trên chính cột. Điều kiện trên cột khác, như `tenant_id`, không bỏ được phân vùng nào.

Nhiều người nghĩ bảng phân vùng luôn nhanh hơn bảng thường. Thật ra một bảng có index tốt thường nhanh ngang, và câu không lọc theo khóa phân vùng còn phải dò mọi phân vùng. Lợi ích chính thường là vận hành: xóa dữ liệu cũ bằng `DETACH` hoặc `DROP` một phân vùng thay vì `DELETE` hàng triệu dòng, và VACUUM từng phần nhỏ.

## Cú pháp

```sql
CREATE TABLE parent (...) PARTITION BY { RANGE | LIST | HASH } ( column );
CREATE TABLE part PARTITION OF parent
  { FOR VALUES FROM ( low ) TO ( high ) | FOR VALUES IN ( value [, ...] ) | DEFAULT };
SELECT relid, parentrelid, isleaf, level FROM pg_partition_tree('parent');
SET enable_partition_pruning = { on | off };
```

- `FROM ( low ) TO ( high )`: cận dưới tính vào, cận trên không tính vào.
- `DEFAULT`: nhận dòng không khớp phân vùng nào.
- `tableoid`: cột hệ thống cho biết bảng thật đang giữ dòng.

## Ví dụ

Điều kiện bằng trên khóa phân vùng, với hằng số:

```sql
EXPLAIN (COSTS OFF) SELECT count(*) FROM events WHERE created_on = '2026-09-15';
```

Chỉ còn `events_2026_09`: ba phân vùng kia bị bỏ lúc lập kế hoạch. Mỗi dòng nằm ở đâu:

```sql
SELECT tableoid::regclass AS part, count(*) AS n FROM events GROUP BY 1 ORDER BY 1;
```

Ba phân vùng tháng có 3.100, 3.000 và 3.100 dòng; `events_default` rỗng nên không có trong kết quả. Lọc trên cột không phải khóa:

```sql
EXPLAIN (COSTS OFF) SELECT count(*) FROM events WHERE kind = 'scan';
```

Cả bốn phân vùng nằm dưới `Append`. Giá trị chỉ biết lúc chạy, ở đây là kế hoạch chung của một câu đã chuẩn bị:

```sql
PREPARE by_day(date) AS SELECT count(*) FROM events WHERE created_on = $1;
SET plan_cache_mode = force_generic_plan;
EXPLAIN (COSTS OFF) EXECUTE by_day('2026-10-05');
RESET plan_cache_mode;
```

Kế hoạch ghi `Subplans Removed: 3`: pruning xảy ra lúc chạy, khi `$1` đã có giá trị. Ngày ngoài mọi khoảng rơi vào phân vùng mặc định:

```sql
EXPLAIN (COSTS OFF) SELECT count(*) FROM events WHERE created_on = '2026-12-01';
```

## Lỗi hay gặp

Bọc khóa phân vùng trong hàm:

```sql
-- WRONG: date_trunc() on the key disables pruning
EXPLAIN (COSTS OFF)
SELECT count(*) FROM events WHERE date_trunc('month', created_on) = '2026-09-01';
```

```sql
-- FIX: a range on the key itself
EXPLAIN (COSTS OFF)
SELECT count(*) FROM events WHERE created_on >= '2026-09-01' AND created_on < '2026-10-01';
```

Câu sai tính hàm trên từng dòng của cả bốn phân vùng; câu đúng chỉ đọc tháng 9.

Tạo phân vùng chồng lên phân vùng có sẵn:

```sql
-- ERROR 42P17: partition "events_mid" would overlap partition "events_2026_09"
CREATE TABLE events_mid PARTITION OF events FOR VALUES FROM ('2026-09-15') TO ('2026-10-15');
```

Các khoảng không được chồng nhau, nên mỗi dòng chỉ có một chỗ. Muốn đổi ranh giới thì `DETACH` phân vùng cũ trước.

Ghi thẳng vào một phân vùng một dòng không thuộc khoảng của nó:

```sql
-- ERROR 23514: new row for relation "events_2026_09" violates partition constraint
INSERT INTO events_2026_09 VALUES (99999, 1, '2026-10-02', 'view');
```

Ghi vào bảng cha `events` để Postgres tự chọn phân vùng; ghi thẳng vào phân vùng chỉ dùng khi bạn chắc chắn về khoảng.

## Thực hành

Ba bước: một câu bị pruning còn một phân vùng, một lần đọc cây phân vùng, rồi một câu có thêm điều kiện tenant mà vẫn chỉ chạm tháng 9. Sau đó là hai câu hỏi.

## Tóm tắt

- Mỗi phân vùng là một bảng thật; bảng cha không chứa dòng, `DEFAULT` nhận phần còn lại.
- Pruning lúc lập kế hoạch cần điều kiện so khóa với hằng số; với tham số hay truy vấn con thì pruning xảy ra lúc chạy.
- Hàm hay ép kiểu trên khóa phân vùng làm mất pruning; viết điều kiện khoảng trên chính cột.
- Phân vùng không tự làm câu nhanh hơn; lợi ích chính là xóa và bảo trì từng phần.
- Phân vùng theo khách: `e-pg-l4-20`.

# EN

## Opening

An events table is split by month, and the report only needs the first week of October. Does Postgres know to skip the other months, or does it still read them all? The answer depends on how you write the condition.

## Key idea

Declarative partitioning: the parent table declares `PARTITION BY RANGE`, `LIST` or `HASH` on a key, and each partition is a real table with its own bounds. The parent holds no rows; every row written to the parent is routed to the right partition. A `DEFAULT` partition takes every row that matches no other partition.

Pruning means skipping the partitions that cannot hold matching rows. It happens at two moments. At plan time: the condition compares the key with a constant, so the extra partitions disappear from the plan. At run time: the value comes from a parameter or a sub-query, so the partitions stay in the plan but `EXPLAIN` shows `Subplans Removed: n`, or `EXPLAIN ANALYZE` shows `(never executed)`.

Pruning only uses conditions placed directly on the partition key. Wrapping the key in a function or a cast, such as `date_trunc('month', created_on)` or `created_on::text`, loses pruning; write a range condition on the column itself. A condition on another column, such as `tenant_id`, cannot skip any partition.

Many people think a partitioned table is always faster than a plain one. In fact a well-indexed table is often just as fast, and a query that does not filter on the partition key must probe every partition. The main benefit is usually operational: removing old data with a `DETACH` or `DROP` of one partition instead of a `DELETE` of millions of rows, and running VACUUM on small pieces.

## Syntax

```sql
CREATE TABLE parent (...) PARTITION BY { RANGE | LIST | HASH } ( column );
CREATE TABLE part PARTITION OF parent
  { FOR VALUES FROM ( low ) TO ( high ) | FOR VALUES IN ( value [, ...] ) | DEFAULT };
SELECT relid, parentrelid, isleaf, level FROM pg_partition_tree('parent');
SET enable_partition_pruning = { on | off };
```

- `FROM ( low ) TO ( high )`: the lower bound is included, the upper bound is not.
- `DEFAULT`: takes the rows that match no partition.
- `tableoid`: a system column naming the real table that holds the row.

## Example

An equality on the partition key, with a constant:

```sql
EXPLAIN (COSTS OFF) SELECT count(*) FROM events WHERE created_on = '2026-09-15';
```

Only `events_2026_09` is left: the other three were pruned at plan time. Where each row lives:

```sql
SELECT tableoid::regclass AS part, count(*) AS n FROM events GROUP BY 1 ORDER BY 1;
```

The three month partitions hold 3,100, 3,000 and 3,100 rows; `events_default` is empty, so it is not in the result. A filter on a column that is not the key:

```sql
EXPLAIN (COSTS OFF) SELECT count(*) FROM events WHERE kind = 'scan';
```

All four partitions sit under the `Append`. A value only known at run time, here the generic plan of a prepared statement:

```sql
PREPARE by_day(date) AS SELECT count(*) FROM events WHERE created_on = $1;
SET plan_cache_mode = force_generic_plan;
EXPLAIN (COSTS OFF) EXECUTE by_day('2026-10-05');
RESET plan_cache_mode;
```

The plan shows `Subplans Removed: 3`: pruning happened at run time, once `$1` had a value. A date outside every range falls into the default partition:

```sql
EXPLAIN (COSTS OFF) SELECT count(*) FROM events WHERE created_on = '2026-12-01';
```

## Common mistakes

Wrapping the partition key in a function:

```sql
-- WRONG: date_trunc() on the key disables pruning
EXPLAIN (COSTS OFF)
SELECT count(*) FROM events WHERE date_trunc('month', created_on) = '2026-09-01';
```

```sql
-- FIX: a range on the key itself
EXPLAIN (COSTS OFF)
SELECT count(*) FROM events WHERE created_on >= '2026-09-01' AND created_on < '2026-10-01';
```

The wrong query evaluates the function on every row of all four partitions; the right one reads September only.

Creating a partition that overlaps an existing one:

```sql
-- ERROR 42P17: partition "events_mid" would overlap partition "events_2026_09"
CREATE TABLE events_mid PARTITION OF events FOR VALUES FROM ('2026-09-15') TO ('2026-10-15');
```

Ranges may not overlap, so each row has exactly one home. To move a boundary, `DETACH` the old partition first.

Writing straight into a partition a row outside its range:

```sql
-- ERROR 23514: new row for relation "events_2026_09" violates partition constraint
INSERT INTO events_2026_09 VALUES (99999, 1, '2026-10-02', 'view');
```

Write to the parent `events` and let Postgres pick the partition; write straight into a partition only when you are sure of the range.

## Practice

Three steps: a query pruned to one partition, a read of the partition tree, then a query with an extra tenant condition that still only touches September. Then two questions.

## Recap

- Each partition is a real table; the parent holds no rows, `DEFAULT` takes the rest.
- Plan-time pruning needs a condition comparing the key with a constant; with a parameter or a sub-query, pruning happens at run time.
- A function or cast on the partition key loses pruning; write a range condition on the column itself.
- Partitioning does not make queries faster by itself; its main benefit is removing and maintaining data piece by piece.
- Partitioning by tenant: `e-pg-l4-20`.
