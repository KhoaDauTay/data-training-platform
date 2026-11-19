---
id: e-pg-l5-15
engine: postgres
level: L5
module: capstone-l5
title: "Bài tổng kết L5: bảng sự kiện chậm"
title_en: "L5 capstone: the slow events table"
kind: capstone
runtime: browser
minutes: 35
objectives:
  - { vi: "Chẩn đoán một bảng sự kiện nhiều khách hàng từ `pg_stats`, ước lượng và kế hoạch thật", en: "Diagnose a multi-tenant events table from `pg_stats`, estimates and real plans" }
  - { vi: "Chứng minh pruning và index đúng cho câu bảng điều khiển của một khách", en: "Prove pruning and the right index for one tenant's dashboard query" }
  - { vi: "Chọn BRIN hay B-tree cho cột thời gian theo `correlation` và kích thước, rồi viết kết luận", en: "Choose BRIN or B-tree for the time column from `correlation` and size, then write the conclusion" }
requires: [e-pg-l4-03, e-pg-l4-07, e-pg-l5-05, e-pg-l5-07]
sources:
  - https://www.postgresql.org/docs/18/planner-stats.html
  - https://www.postgresql.org/docs/18/ddl-partitioning.html
  - https://www.postgresql.org/docs/18/brin.html
  - https://www.postgresql.org/docs/18/indexes-multicolumn.html
  - https://www.postgresql.org/docs/18/sql-createstatistics.html
viz: pg-plan-tree
lab:
  setup: |
    DROP TABLE IF EXISTS events CASCADE;
    DROP FUNCTION IF EXISTS est(text);
    CREATE TABLE events (id int NOT NULL, tenant_id int NOT NULL, plan_tier int NOT NULL, created_at timestamp NOT NULL, kind text NOT NULL) PARTITION BY RANGE (created_at);
    CREATE TABLE events_2026_08 PARTITION OF events FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
    CREATE TABLE events_2026_09 PARTITION OF events FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
    CREATE TABLE events_2026_10 PARTITION OF events FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
    -- 60 tenants; a tenant's plan tier never changes (plan_tier depends on tenant_id); one event every 7 minutes
    INSERT INTO events
      SELECT g, (g * 7) % 60 + 1, ((g * 7) % 60 + 1) % 3, TIMESTAMP '2026-08-01' + (g - 1) * INTERVAL '7 minutes',
             CASE WHEN g % 4 = 0 THEN 'export' ELSE 'view' END
      FROM generate_series(1, 18000) g;
    CREATE INDEX ON events (tenant_id, created_at);
    CREATE INDEX events_created_brin ON events USING brin (created_at) WITH (pages_per_range = 8);
    ANALYZE events;
    -- helper: the planner's row estimate for one query (author code, never player text)
    CREATE FUNCTION est(q text) RETURNS bigint LANGUAGE plpgsql AS $$
    DECLARE j json;
    BEGIN
      EXECUTE 'EXPLAIN (FORMAT JSON) ' || q INTO j;
      RETURN (j->0->'Plan'->>'Plan Rows')::bigint;
    END $$;
  steps:
    - task: { vi: "Bước 1, thống kê. Với phân vùng tháng 10 (`events_2026_10`), đọc `n_distinct` và `correlation` của ba cột `created_at`, `plan_tier`, `tenant_id`, sắp theo tên cột.", en: "Step 1, statistics. For the October partition (`events_2026_10`), read `n_distinct` and `correlation` of the three columns `created_at`, `plan_tier`, `tenant_id`, ordered by column name." }
      solution: "SELECT attname, n_distinct, correlation FROM pg_stats WHERE tablename = 'events_2026_10' AND attname IN ('created_at', 'plan_tier', 'tenant_id') ORDER BY attname"
      check: rows
      ordered: true
      hint: { vi: "Mỗi phân vùng có thống kê riêng trong `pg_stats`.", en: "Each partition has its own statistics in `pg_stats`." }
    - task: { vi: "Bước 2, ước lượng. Bảng điều khiển hay lọc theo khách và gói. Với `events_2026_10`, so ước lượng của planner cho khách 7 ở gói 1 với số dòng thật. Hai cột: estimated (dùng hàm `est(text)` có sẵn), actual.", en: "Step 2, estimates. The dashboard often filters by tenant and plan tier. On `events_2026_10`, compare the planner's estimate for tenant 7 on tier 1 with the real row count. Two columns: estimated (use the ready-made `est(text)` function), actual." }
      solution: "SELECT est('SELECT * FROM events_2026_10 WHERE tenant_id = 7 AND plan_tier = 1') AS estimated, (SELECT count(*) FROM events_2026_10 WHERE tenant_id = 7 AND plan_tier = 1) AS actual"
      check: rows
      hint: { vi: "`est` nhận cả câu SQL dưới dạng chuỗi; `actual` là một `count(*)` thường.", en: "`est` takes the whole SQL query as a string; `actual` is a plain `count(*)`." }
    - task: { vi: "Bước 3, câu bảng điều khiển. Đếm sự kiện của khách 7 trong tuần đầu tháng 10/2026 (từ 2026-10-01 tới trước 2026-10-08). Kế hoạch chỉ được đọc phân vùng tháng 10, qua index (khách, thời gian) của nó.", en: "Step 3, the dashboard query. Count tenant 7's events in the first week of October 2026 (from 2026-10-01 up to, not including, 2026-10-08). The plan may only read the October partition, through its (tenant, time) index." }
      solution: "SELECT count(*) FROM events WHERE tenant_id = 7 AND created_at >= '2026-10-01' AND created_at < '2026-10-08'"
      check: plan
      hint: { vi: "Điều kiện bằng trên cột đầu của index, điều kiện khoảng trên cột thứ hai, và điều kiện khoảng trên khóa phân vùng cho pruning.", en: "Equality on the index's first column, a range on its second, and the range on the partition key gives pruning." }
    - task: { vi: "Bước 4, báo cáo toàn hệ thống. Đếm mọi sự kiện ngày 2026-10-01 (không lọc khách). Planner phải dùng index BRIN của phân vùng tháng 10.", en: "Step 4, the system-wide report. Count every event on 2026-10-01 (no tenant filter). The planner must use the October partition's BRIN index." }
      solution: "SELECT count(*) FROM events WHERE created_at >= '2026-10-01' AND created_at < '2026-10-02'"
      check: plan
      hint: { vi: "Chỉ điều kiện khoảng trên `created_at`.", en: "Only a range condition on `created_at`." }
    - task: { vi: "Bước 5, cái giá. Liệt kê kích thước (số trang 8 KB) của phân vùng tháng 10 và các index của nó: mọi quan hệ có tên bắt đầu bằng `events_2026_10`, sắp theo tên.", en: "Step 5, the cost. List the size (8 KB pages) of the October partition and its indexes: every relation whose name starts with `events_2026_10`, ordered by name." }
      solution: "SELECT relname, pg_relation_size(oid) / 8192 AS pages FROM pg_class WHERE relname LIKE 'events_2026_10%' ORDER BY relname"
      check: rows
      ordered: true
      hint: { vi: "`pg_class` + `pg_relation_size`.", en: "`pg_class` + `pg_relation_size`." }
predict:
  sql: "SELECT count(*) FROM events WHERE tenant_id = 7 AND created_at >= '2026-10-01' AND created_at < '2026-10-08'"
  q: { vi: "Trước bước 3: câu bảng điều khiển sẽ được đọc thế nào?", en: "Before step 3: how will the dashboard query be read?" }
  options:
    - { vi: "Append trên cả ba phân vùng, mỗi phân vùng một Seq Scan", en: "An Append over all three partitions, one Seq Scan each" }
    - { vi: "Chỉ phân vùng tháng 10, Bitmap Index Scan trên index (tenant_id, created_at) của nó", en: "Only the October partition, a Bitmap Index Scan on its (tenant_id, created_at) index" }
    - { vi: "Chỉ phân vùng tháng 10, Bitmap Index Scan trên BRIN", en: "Only the October partition, a Bitmap Index Scan on the BRIN" }
  answer: 1
  why: { vi: "Khoảng ngày cho pruning còn một phân vùng. Trong phân vùng đó, index B-tree (khách, thời gian) chọn đúng 24 dòng; BRIN chỉ lọc theo thời gian, phải đọc lại mọi dòng của cả tuần rồi lọc khách.", en: "The date range prunes down to one partition. Inside it, the (tenant, time) B-tree picks exactly the 24 rows; the BRIN only filters by time, so it would re-read every row of the week and then filter the tenant." }
quiz:
  - q: { vi: "Kết luận 1. Bước 2 cho ước lượng 30, thật 91. Nguyên nhân và cách sửa?", en: "Conclusion 1. Step 2 estimated 30 against 91 real rows. Cause and fix?" }
    options:
      - { vi: "Thống kê cũ; chạy ANALYZE", en: "Stale statistics; run ANALYZE" }
      - { vi: "Gói phụ thuộc vào khách nhưng planner coi hai cột là độc lập (1/60 × 1/3); sửa bằng `CREATE STATISTICS … (dependencies) ON tenant_id, plan_tier` rồi ANALYZE", en: "The tier depends on the tenant but the planner treats the columns as independent (1/60 × 1/3); fix with `CREATE STATISTICS … (dependencies) ON tenant_id, plan_tier`, then ANALYZE" }
      - { vi: "Thiếu index trên `plan_tier`", en: "A missing index on `plan_tier`" }
    answer: 1
    why: { vi: "ANALYZE vừa chạy, nên thống kê từng cột là mới. Lỗi là giả định độc lập; thống kê phụ thuộc hàm sửa đúng chỗ đó (bài e-pg-l4-03). Thêm index không đổi ước lượng.", en: "ANALYZE has just run, so per-column statistics are fresh. The error is the independence assumption, and dependency statistics fix exactly that (lesson e-pg-l4-03). An extra index does not change the estimate." }
  - q: { vi: "Kết luận 2. Báo cáo toàn hệ thống chỉ lọc theo thời gian. Giữ BRIN hay thêm B-tree trên `created_at`?", en: "Conclusion 2. The system-wide report filters only by time. Keep the BRIN or add a B-tree on `created_at`?" }
    options:
      - { vi: "Giữ BRIN: `created_at` có correlation = 1 (chỉ chèn thêm), BRIN 3 trang so với 23 trang của B-tree (khách, thời gian), và planner đã dùng nó", en: "Keep the BRIN: `created_at` has correlation = 1 (append-only), the BRIN is 3 pages against 23 for the (tenant, time) B-tree, and the planner already uses it" }
      - { vi: "Thêm B-tree vì BRIN luôn chậm", en: "Add a B-tree, because BRIN is always slow" }
      - { vi: "Bỏ cả hai index", en: "Drop both indexes" }
    answer: 0
    why: { vi: "BRIN hợp khi giá trị đi theo thứ tự vật lý. Nếu sau này dữ liệu được nạp lộn xộn (backfill), correlation giảm và cần xem lại.", en: "BRIN fits when values follow physical order. If data is later loaded out of order (a backfill), correlation drops and the choice must be revisited." }
  - q: { vi: "Kết luận 3. Vì sao index (tenant_id, created_at) đúng thứ tự cột này mà không phải (created_at, tenant_id)?", en: "Conclusion 3. Why is the index (tenant_id, created_at) in this column order and not (created_at, tenant_id)?" }
    options:
      - { vi: "Điều kiện bằng (khách) đứng trước, điều kiện khoảng (thời gian) đứng sau, nên các dòng cần đọc nằm liền nhau trong index", en: "The equality condition (tenant) comes first and the range condition (time) second, so the rows needed sit next to each other in the index" }
      - { vi: "Thứ tự cột không quan trọng", en: "Column order does not matter" }
      - { vi: "Vì `tenant_id` là số nguyên", en: "Because `tenant_id` is an integer" }
    answer: 0
    why: { vi: "Luật cột đầu: bằng trên các cột đầu, khoảng trên cột tiếp theo. Với (created_at, tenant_id), câu phải quét cả tuần của mọi khách rồi mới lọc khách 7.", en: "The leading-column rule: equality on the leading columns, a range on the next one. With (created_at, tenant_id), the query would scan a whole week for every tenant before filtering tenant 7." }
---

## Ý chính

Một hệ thống nhiều khách hàng (60 khách, mỗi khách một gói cố định) ghi sự kiện vào bảng `events`, phân vùng theo tháng. Hai câu chính:

- bảng điều khiển của một khách: "khách X trong 7 ngày qua";
- báo cáo toàn hệ thống: "mọi sự kiện trong một ngày".

Người dùng báo bảng điều khiển chậm và ước lượng số dòng sai. Nhiệm vụ: chẩn đoán từ số liệu thật, không đoán mò. Năm bước dùng lại cả L4 và L5: thống kê cột, thống kê mở rộng, pruning, luật cột đầu của B-tree, BRIN và chi phí index.

## Ví dụ

Số liệu thật trên PGlite (phân vùng tháng 10: 5451 dòng):

```text
attname     n_distinct  correlation
created_at  -1          1
plan_tier   3           0.33308864
tenant_id   60          0.016817184

estimated  actual
30         91

events_2026_10                            41 pages
events_2026_10_created_at_idx              3 pages   (BRIN)
events_2026_10_tenant_id_created_at_idx   23 pages   (B-tree)
```

## Thực hành

Năm bước có chấm, một câu đoán kế hoạch trước bước 3, và ba câu kết luận. Kỹ năng chuyên gia: đi từ triệu chứng ("bảng điều khiển chậm") tới bằng chứng (thống kê, ước lượng, kế hoạch, kích thước) và một đề xuất có lý do: thống kê phụ thuộc cho cặp khách/gói, giữ index (khách, thời gian) cho bảng điều khiển, BRIN cho báo cáo theo thời gian, phân vùng tháng để pruning và xóa dữ liệu cũ.

# EN

## Key idea

A multi-tenant system (60 tenants, each on a fixed plan tier) writes events into the `events` table, partitioned by month. Two main queries:

- one tenant's dashboard: "tenant X over the last 7 days";
- the system-wide report: "every event on one day".

Users report a slow dashboard and the row estimates look wrong. The task: diagnose from real numbers, not guesses. The five steps reuse both L4 and L5: column statistics, extended statistics, pruning, the B-tree leading-column rule, BRIN and index cost.

## Example

Real figures from PGlite (October partition: 5451 rows):

```text
attname     n_distinct  correlation
created_at  -1          1
plan_tier   3           0.33308864
tenant_id   60          0.016817184

estimated  actual
30         91

events_2026_10                            41 pages
events_2026_10_created_at_idx              3 pages   (BRIN)
events_2026_10_tenant_id_created_at_idx   23 pages   (B-tree)
```

## Practice

Five graded steps, one plan prediction before step 3, and three conclusion questions. Expert skill: go from a symptom ("the dashboard is slow") to evidence (statistics, estimates, plans, sizes) and a reasoned proposal: dependency statistics for the tenant/tier pair, keep the (tenant, time) index for the dashboard, BRIN for time-based reports, monthly partitions for pruning and dropping old data.
