---
id: e-pg-l4-07
engine: postgres
level: L4
module: partitioning
title: "Phân vùng khai báo và partition pruning"
title_en: "Declarative partitioning and partition pruning"
kind: lab
minutes: 20
objectives:
  - { vi: "Viết câu để planner chỉ đọc đúng phân vùng cần (pruning lúc lập kế hoạch)", en: "Write a query the planner prunes to the one partition it needs (plan-time pruning)" }
  - { vi: "Nhận ra pruning lúc chạy qua `(never executed)` khi giá trị chỉ biết lúc thực thi", en: "Recognise run-time pruning through `(never executed)` when the value is only known at execution" }
  - { vi: "Đọc cây phân vùng bằng `pg_partition_tree`", en: "Read the partition tree with `pg_partition_tree`" }
requires: [e-pg-l4-02]
sources:
  - https://www.postgresql.org/docs/18/ddl-partitioning.html
  - https://www.postgresql.org/docs/18/functions-admin.html
viz: plan-tree
lab:
  setup: |
    DROP TABLE IF EXISTS events;
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
    - task: { vi: "Liệt kê cây phân vùng của `events`: tên quan hệ, tên cha (đều ép text), có phải lá không, cấp. Sắp theo tên quan hệ.", en: "List the partition tree of `events`: relation name, parent name (both cast to text), whether it is a leaf, level. Order by relation name." }
      solution: "SELECT relid::text, parentrelid::text, isleaf, level FROM pg_partition_tree('events') ORDER BY relid::text"
      check: catalog
      ordered: true
      hint: { vi: "Hàm `pg_partition_tree(regclass)`.", en: "The `pg_partition_tree(regclass)` function." }
    - task: { vi: "Đếm sự kiện của tenant 7 trong cả tháng 9/2026. Kế hoạch chỉ được chạm `events_2026_09`.", en: "Count tenant 7's events in the whole of September 2026. The plan may only touch `events_2026_09`." }
      solution: "SELECT count(*) FROM events WHERE tenant_id = 7 AND created_on >= '2026-09-01' AND created_on < '2026-10-01'"
      check: plan
      hint: { vi: "Điều kiện tenant không giúp pruning; điều kiện ngày thì có.", en: "The tenant condition does not prune; the date condition does." }
predict:
  sql: "EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF) SELECT count(*) FROM events WHERE created_on = (SELECT max(created_on) FROM events_2026_09)"
  q: { vi: "Ngày cần lọc chỉ biết lúc chạy (từ truy vấn con). Kế hoạch có mấy phân vùng của `events` và chúng được xử lý ra sao?", en: "The date to filter on is only known at run time (from a sub-query). How many `events` partitions are in the plan, and what happens to them?" }
  options:
    - { vi: "Chỉ một phân vùng trong kế hoạch", en: "Only one partition is in the plan" }
    - { vi: "Cả bốn phân vùng có trong kế hoạch, nhưng ba cái hiện `(never executed)`: pruning lúc chạy", en: "All four partitions are in the plan, but three show `(never executed)`: run-time pruning" }
    - { vi: "Cả bốn phân vùng đều bị quét hết", en: "All four partitions are fully scanned" }
  answer: 1
  why: { vi: "Lúc lập kế hoạch Postgres chưa biết ngày, nên giữ mọi phân vùng dưới Append. Lúc chạy, sau khi InitPlan cho ra ngày, nó bỏ qua các phân vùng không thể khớp.", en: "At plan time Postgres does not know the date, so it keeps every partition under the Append. At run time, once the InitPlan returns the date, it skips the partitions that cannot match." }
---

## Ý chính

- Phân vùng khai báo: bảng cha `PARTITION BY RANGE | LIST | HASH`, mỗi phân vùng là một bảng thật với giới hạn riêng. Phân vùng `DEFAULT` nhận mọi dòng không khớp.
- Pruning = bỏ phân vùng không thể chứa dòng khớp. Hai thời điểm:
  - lúc lập kế hoạch: điều kiện là hằng → phân vùng thừa biến mất khỏi kế hoạch;
  - lúc chạy: giá trị đến từ tham số hay truy vấn con → phân vùng vẫn trong kế hoạch, nhưng hiện `(never executed)` hoặc `Subplans Removed: n`.
- Pruning chỉ dùng điều kiện trên khóa phân vùng. Bọc khóa trong hàm (`date_trunc('month', created_on) = …`) thường làm mất pruning; hãy viết điều kiện khoảng.
- Lợi ích thật của phân vùng thường là vận hành: xóa dữ liệu cũ bằng `DETACH`/`DROP` một phân vùng thay vì `DELETE` hàng triệu dòng, VACUUM từng phần nhỏ. Không phải lúc nào cũng nhanh hơn một bảng có index tốt.

## Ví dụ

Kế hoạch thật trên PGlite (`COSTS OFF`):

```text
Aggregate
  ->  Seq Scan on events_2026_10 events
        Filter: ((created_on >= '2026-10-01'::date) AND (created_on < '2026-10-08'::date))
```

Pruning lúc chạy (giá trị từ truy vấn con):

```text
Append (actual rows=100.00 loops=1)
  ->  Seq Scan on events_2026_08 events_1 (never executed)
  ->  Seq Scan on events_2026_09 events_2 (actual rows=100.00 loops=1)
  ->  Seq Scan on events_2026_10 events_3 (never executed)
  ->  Seq Scan on events_default events_4 (never executed)
```

## Thực hành

Hai câu bị pruning lúc lập kế hoạch và một lần đọc cây phân vùng. Kỹ năng chuyên gia: viết điều kiện để pruning chạy, và đọc kế hoạch để chứng minh nó đã chạy.

# EN

## Key idea

- Declarative partitioning: a parent table `PARTITION BY RANGE | LIST | HASH`, where each partition is a real table with its own bounds. A `DEFAULT` partition takes every row that matches no other.
- Pruning drops partitions that cannot hold matching rows. It happens at two moments:
  - at plan time: the condition is a constant, so the extra partitions disappear from the plan;
  - at run time: the value comes from a parameter or a sub-query, so the partitions stay in the plan but show `(never executed)` or `Subplans Removed: n`.
- Pruning only uses conditions on the partition key. Wrapping the key in a function (`date_trunc('month', created_on) = …`) usually loses pruning; write a range condition instead.
- The real benefit of partitioning is often operational: drop old data with `DETACH`/`DROP` of one partition instead of a `DELETE` of millions of rows, and VACUUM small pieces. It is not always faster than one well-indexed table.

## Example

Real plan from PGlite (`COSTS OFF`):

```text
Aggregate
  ->  Seq Scan on events_2026_10 events
        Filter: ((created_on >= '2026-10-01'::date) AND (created_on < '2026-10-08'::date))
```

Run-time pruning (value from a sub-query):

```text
Append (actual rows=100.00 loops=1)
  ->  Seq Scan on events_2026_08 events_1 (never executed)
  ->  Seq Scan on events_2026_09 events_2 (actual rows=100.00 loops=1)
  ->  Seq Scan on events_2026_10 events_3 (never executed)
  ->  Seq Scan on events_default events_4 (never executed)
```

## Practice

Two queries pruned at plan time and one read of the partition tree. Expert skill: write conditions that let pruning work, and read the plan to prove that it did.
