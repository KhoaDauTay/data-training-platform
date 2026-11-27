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
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Chẩn đoán một bảng sự kiện nhiều khách hàng từ `pg_stats`, ước lượng và kế hoạch thật", en: "Diagnose a multi-tenant events table from `pg_stats`, estimates and real plans" }
  - { vi: "Chứng minh pruning và index đúng cho câu bảng điều khiển của một khách", en: "Prove pruning and the right index for one tenant's dashboard query" }
  - { vi: "Chọn BRIN hay B-tree cho cột thời gian theo `correlation` và kích thước, rồi viết kết luận", en: "Choose BRIN or B-tree for the time column from `correlation` and size, then write the conclusion" }
requires: [e-pg-l4-03, e-pg-l4-07, e-pg-l5-05, e-pg-l5-07]
sources:
  - { url: https://www.postgresql.org/docs/18/planner-stats.html, title_vi: "Thống kê mà planner dùng" }
  - { url: https://www.postgresql.org/docs/18/ddl-partitioning.html, title_vi: "Phân vùng bảng (partitioning)" }
  - { url: https://www.postgresql.org/docs/18/brin.html, title_vi: "Index BRIN" }
  - { url: https://www.postgresql.org/docs/18/indexes-multicolumn.html, title_vi: "Index nhiều cột" }
  - { url: https://www.postgresql.org/docs/18/sql-createstatistics.html, title_vi: "CREATE STATISTICS" }
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
      hint: { vi: "Điều kiện bằng trên cột đầu của index (khách), điều kiện khoảng trên cột thứ hai (thời gian). Điều kiện khoảng đó cũng nằm trên khóa phân vùng, nên Postgres bỏ qua hai tháng kia (partition pruning).", en: "Equality on the index's first column (tenant), a range on its second (time). That range is also on the partition key, so Postgres skips the other two months (partition pruning)." }
    - task: { vi: "Bước 4, báo cáo toàn hệ thống. Đếm mọi sự kiện ngày 2026-10-01 (không lọc khách). Planner phải dùng index BRIN của phân vùng tháng 10.", en: "Step 4, the system-wide report. Count every event on 2026-10-01 (no tenant filter). The planner must use the October partition's BRIN index." }
      solution: "SELECT count(*) FROM events WHERE created_at >= '2026-10-01' AND created_at < '2026-10-02'"
      check: plan
      hint: { vi: "Chỉ điều kiện khoảng trên `created_at`.", en: "Only a range condition on `created_at`." }
    - task: { vi: "Bước 5, cái giá. Liệt kê kích thước (số trang 8 KB) của phân vùng tháng 10 và các index của nó: mọi quan hệ có tên bắt đầu bằng `events_2026_10`, sắp theo tên.", en: "Step 5, the cost. List the size (8 KB pages) of the October partition and its indexes: every relation whose name starts with `events_2026_10`, ordered by name." }
      solution: "SELECT relname, pg_relation_size(oid) / 8192 AS pages FROM pg_class WHERE relname LIKE 'events_2026_10%' ORDER BY relname"
      check: rows
      ordered: true
      hint: { vi: "`pg_class` + `pg_relation_size`.", en: "`pg_class` + `pg_relation_size`." }
    - task: { vi: "Bước 6, trang chi tiết. Liệt kê `id, kind, created_at` các sự kiện của khách 7 từ 2026-10-01 tới trước 2026-10-08, sắp theo `created_at`. Câu chỉ được đọc phân vùng tháng 10, qua index.", en: "Step 6, the detail page. List `id, kind, created_at` of tenant 7's events from 2026-10-01 up to, not including, 2026-10-08, ordered by `created_at`. The query may only read the October partition, through an index." }
      solution: "SELECT id, kind, created_at FROM events WHERE tenant_id = 7 AND created_at >= '2026-10-01' AND created_at < '2026-10-08' ORDER BY created_at"
      check: rows
      ordered: true
      perf: { table: events_2026_10 }
      slow: "SELECT id, kind, created_at FROM events WHERE tenant_id = 7 AND created_at::date BETWEEN '2026-10-01' AND '2026-10-07' ORDER BY created_at"
      hint: { vi: "So sánh `created_at` trực tiếp với hai mốc; ép kiểu khóa phân vùng (`created_at::date`) làm mất pruning, nên câu đọc cả ba phân vùng.", en: "Compare `created_at` directly with two bounds; casting the partition key (`created_at::date`) loses pruning, so the query reads all three partitions." }
predict:
  sql: "SELECT count(*) FROM events WHERE tenant_id = 7 AND created_at >= '2026-10-01' AND created_at < '2026-10-08'"
  q: { vi: "Trước bước 3: câu bảng điều khiển sẽ được đọc thế nào?", en: "Before step 3: how will the dashboard query be read?" }
  options:
    - { vi: "Append trên cả ba phân vùng, mỗi phân vùng một Seq Scan", en: "An Append over all three partitions, one Seq Scan each" }
    - { vi: "Chỉ phân vùng tháng 10, Bitmap Index Scan trên index (tenant_id, created_at) của nó", en: "Only the October partition, a Bitmap Index Scan on its (tenant_id, created_at) index" }
    - { vi: "Chỉ phân vùng tháng 10, Bitmap Index Scan trên BRIN", en: "Only the October partition, a Bitmap Index Scan on the BRIN" }
  answer: 1
  why: { vi: "Không phải Append trên ba phân vùng: điều kiện khoảng trên `created_at` (khóa phân vùng) cho partition pruning, nên hai tháng kia bị loại trước khi đọc. BRIN nghe hợp lý vì `created_at` có correlation = 1 (dòng được ghi đúng theo thứ tự thời gian), nhưng BRIN chỉ biết thời gian: nó phải đọc cả 1 440 sự kiện của tuần (7 ngày × 1 440 phút ÷ 7 phút một sự kiện) rồi mới lọc khách (tenant) 7. Index B-tree (tenant_id, created_at) đi thẳng tới 24 dòng của khách 7 (1 440 ÷ 60 khách), nên planner chọn nó.", en: "Not an Append over three partitions: the range on `created_at` (the partition key) gives partition pruning, so the other two months are dropped before any read. The BRIN sounds right because `created_at` has correlation = 1 (rows are written in time order), but a BRIN only knows time: it must read all 1,440 events of the week (7 days × 1,440 minutes ÷ one event every 7 minutes) and then filter tenant 7. The B-tree index (tenant_id, created_at) goes straight to tenant 7's 24 rows (1,440 ÷ 60 tenants), so the planner picks it." }
  expect: { node: Bitmap Index Scan, index: events_2026_10_tenant_id_created_at_idx }
quiz:
  - q: { vi: "Kết luận 1. Bước 2 cho ước lượng 30, thật 91. Nguyên nhân và cách sửa?", en: "Conclusion 1. Step 2 estimated 30 against 91 real rows. Cause and fix?" }
    options:
      - { vi: "Thống kê cũ; chạy ANALYZE", en: "Stale statistics; run ANALYZE" }
      - { vi: "Gói phụ thuộc vào khách nhưng planner coi hai cột là độc lập (1/60 × 1/3); sửa bằng `CREATE STATISTICS … (dependencies) ON tenant_id, plan_tier` rồi ANALYZE", en: "The tier depends on the tenant but the planner treats the columns as independent (1/60 × 1/3); fix with `CREATE STATISTICS … (dependencies) ON tenant_id, plan_tier`, then ANALYZE" }
      - { vi: "Thiếu index trên `plan_tier`", en: "A missing index on `plan_tier`" }
    answer: 1
    why: { vi: "Không phải do thống kê (statistics) cũ: ANALYZE vừa chạy, nên số liệu của từng cột đều mới. Lỗi nằm ở chỗ planner coi `tenant_id` và `plan_tier` là hai điều kiện độc lập rồi nhân xác suất: khoảng 5 450 dòng của tháng 10 × 1/60 × 1/3 ≈ 30. Thực tế mỗi khách (tenant) chỉ dùng một gói, nên lọc thêm theo gói không bớt dòng nào: 5 450 ÷ 60 ≈ 91. `CREATE STATISTICS … (dependencies)` là thống kê mở rộng (extended statistics), cho planner biết gói đi theo khách; thêm index thì không đổi được con số ước lượng.", en: "It is not stale statistics: ANALYZE has just run, so every column's figures are fresh. The planner treats `tenant_id` and `plan_tier` as independent conditions and multiplies the probabilities: about 5,450 October rows × 1/60 × 1/3 ≈ 30. In fact each tenant uses one plan tier, so filtering by tier removes no rows: 5,450 ÷ 60 ≈ 91. `CREATE STATISTICS … (dependencies)` is extended statistics that tell the planner the tier follows the tenant; an extra index cannot change the estimate." }
  - q: { vi: "Kết luận 2. Báo cáo toàn hệ thống chỉ lọc theo thời gian. Giữ BRIN hay thêm B-tree trên `created_at`?", en: "Conclusion 2. The system-wide report filters only by time. Keep the BRIN or add a B-tree on `created_at`?" }
    options:
      - { vi: "Giữ BRIN: `created_at` có correlation = 1 (chỉ chèn thêm), BRIN 3 trang so với 23 trang của B-tree (khách, thời gian), và planner đã dùng nó", en: "Keep the BRIN: `created_at` has correlation = 1 (append-only), the BRIN is 3 pages against 23 for the (tenant, time) B-tree, and the planner already uses it" }
      - { vi: "Thêm B-tree vì BRIN luôn chậm", en: "Add a B-tree, because BRIN is always slow" }
      - { vi: "Bỏ cả hai index", en: "Drop both indexes" }
    answer: 0
    why: { vi: "\"BRIN luôn chậm\" sai: ở bước 4 planner đã chọn BRIN cho báo cáo một ngày. BRIN chỉ lưu giá trị nhỏ nhất và lớn nhất của mỗi nhóm 8 trang (page), nên chỉ tốn 3 trang so với 23 trang của B-tree (khách, thời gian). Nó lọc tốt vì correlation = 1: dòng nằm trên đĩa đúng theo thứ tự thời gian, nên mỗi nhóm trang chứa một khoảng thời gian hẹp. Bỏ cả hai index thì câu bảng điều khiển ở bước 3 phải quét cả phân vùng. Nếu sau này nạp bù dữ liệu cũ lộn thứ tự (backfill), correlation giảm và cần xem lại.", en: "\"BRIN is always slow\" is wrong: in step 4 the planner already picked the BRIN for the one-day report. A BRIN stores only the smallest and largest value of each group of 8 pages, so it costs 3 pages against 23 for the (tenant, time) B-tree. It filters well because correlation = 1: rows sit on disk in time order, so each page group covers a narrow time range. Dropping both indexes would make the step 3 dashboard query scan the whole partition. If old data is later loaded out of order (a backfill), correlation drops and the choice must be revisited." }
  - q: { vi: "Kết luận 3. Vì sao index (tenant_id, created_at) đúng thứ tự cột này mà không phải (created_at, tenant_id)?", en: "Conclusion 3. Why is the index (tenant_id, created_at) in this column order and not (created_at, tenant_id)?" }
    options:
      - { vi: "Điều kiện bằng (khách) đứng trước, điều kiện khoảng (thời gian) đứng sau, nên các dòng cần đọc nằm liền nhau trong index", en: "The equality condition (tenant) comes first and the range condition (time) second, so the rows needed sit next to each other in the index" }
      - { vi: "Thứ tự cột không quan trọng", en: "Column order does not matter" }
      - { vi: "Vì `tenant_id` là số nguyên", en: "Because `tenant_id` is an integer" }
    answer: 0
    why: { vi: "Thứ tự cột nghe như không quan trọng vì cả hai index chứa đúng hai cột, nhưng B-tree sắp theo cột đầu trước, rồi mới theo cột thứ hai trong cùng một giá trị cột đầu. Với (tenant_id, created_at), mọi mục của khách 7 nằm liền nhau và đã sắp theo thời gian, nên câu đọc một đoạn liền: 24 dòng của tuần. Với (created_at, tenant_id), mục của khách 7 rải khắp tuần giữa mục của 59 khách khác, nên câu phải đọc cả 1 440 mục của tuần rồi mới lọc ra 24. Kiểu số nguyên của `tenant_id` không liên quan.", en: "Column order sounds irrelevant because both indexes hold the same two columns, but a B-tree sorts by the first column, then by the second within each first-column value. With (tenant_id, created_at), all of tenant 7's entries sit together, already in time order, so the query reads one contiguous stretch: the week's 24 rows. With (created_at, tenant_id), tenant 7's entries are spread across the week among 59 other tenants, so the query must read all 1,440 entries of the week and then keep 24. The integer type of `tenant_id` has nothing to do with it." }
---
## Mở bài

Người dùng báo bảng điều khiển của từng khách chậm, và ước lượng số dòng trong kế hoạch lệch xa số thật. Việc của bạn là chẩn đoán từ số liệu thật của bảng `events`, chứng minh bằng kế hoạch, rồi đề xuất có lý do.

## Ý chính

Một hệ thống nhiều khách hàng (60 khách, mỗi khách một gói cố định) ghi sự kiện vào bảng `events`, phân vùng theo tháng. Hai câu chính:

- bảng điều khiển của một khách: "khách X trong 7 ngày qua";
- báo cáo toàn hệ thống: "mọi sự kiện trong một ngày".

Sáu bước dùng lại cả L4 và L5: thống kê cột, thống kê mở rộng, pruning, luật cột đầu của B-tree, BRIN, chi phí index. Bước 6 có thanh hiệu năng: câu trả đúng dòng mà làm mất pruning hay bỏ index vẫn chưa qua.

## Ví dụ

Số liệu thật trên PGlite cho phân vùng tháng 9 (6171 dòng), không phải tháng 10 mà bài hỏi. Cùng cách đọc, số của bạn sẽ khác:

```text
attname     n_distinct  correlation
created_at  -1          1
plan_tier   3           0.3331172
tenant_id   60          0.016897237

estimated  actual   (tenant_id = 8 AND plan_tier = 2)
34         103

events_2026_09                            46 pages
events_2026_09_created_at_idx              3 pages   (BRIN)
events_2026_09_tenant_id_created_at_idx   26 pages   (B-tree)
```

## Thực hành

Sáu bước có chấm, một câu đoán kế hoạch trước bước 3, và ba câu kết luận. Đi từ triệu chứng tới bằng chứng (thống kê, ước lượng, kế hoạch, kích thước) và một đề xuất: thống kê phụ thuộc cho cặp khách/gói, index (khách, thời gian) cho bảng điều khiển, BRIN cho báo cáo theo thời gian, phân vùng tháng để pruning và xóa dữ liệu cũ.

## Tóm tắt

- Ước lượng sai khi hai cột phụ thuộc nhau: thống kê mở rộng `dependencies` sửa được, ANALYZE thường thì không.
- Điều kiện khoảng trên khóa phân vùng cho pruning; ép kiểu khóa đó làm câu đọc mọi phân vùng.
- Index nhiều cột: điều kiện bằng ở cột đầu, điều kiện khoảng ở cột sau.
- BRIN rất nhỏ và hợp cột tăng dần theo thứ tự ghi (correlation gần 1).
- Bảng nhiều khách: index dẫn đầu bằng `tenant_id` (`e-pg-l2-26`), RLS sâu hơn ở `e-pg-l5-19`.

# EN

## Opening

Users report that each tenant's dashboard is slow, and the row estimates in the plan are far from the real counts. Your job is to diagnose from the real numbers of table `events`, prove it with plans, then make a reasoned proposal.

## Key idea

A multi-tenant system (60 tenants, each on a fixed plan tier) writes events into the `events` table, partitioned by month. Two main queries:

- one tenant's dashboard: "tenant X over the last 7 days";
- the system-wide report: "every event on one day".

The six steps reuse both L4 and L5: column statistics, extended statistics, pruning, the B-tree leading-column rule, BRIN, index cost. Step 6 has a performance bar: a query that returns the right rows but loses pruning or drops the index does not pass yet.

## Example

Real figures from PGlite for the September partition (6171 rows), not the October one the lesson asks about. Same way of reading, your numbers will differ:

```text
attname     n_distinct  correlation
created_at  -1          1
plan_tier   3           0.3331172
tenant_id   60          0.016897237

estimated  actual   (tenant_id = 8 AND plan_tier = 2)
34         103

events_2026_09                            46 pages
events_2026_09_created_at_idx              3 pages   (BRIN)
events_2026_09_tenant_id_created_at_idx   26 pages   (B-tree)
```

## Practice

Six graded steps, one plan prediction before step 3, and three conclusion questions. Go from the symptom to evidence (statistics, estimates, plans, sizes) and a proposal: dependency statistics for the tenant/tier pair, the (tenant, time) index for the dashboard, BRIN for time-based reports, monthly partitions for pruning and dropping old data.

## Recap

- Estimates go wrong when two columns depend on each other: `dependencies` extended statistics fix that, a plain ANALYZE does not.
- A range on the partition key gives pruning; casting that key makes the query read every partition.
- A multi-column index: equality on the leading column, the range on the next one.
- BRIN is tiny and suits a column that grows in write order (correlation near 1).
- Multi-tenant tables: indexes that lead with `tenant_id` (`e-pg-l2-26`), RLS in depth in `e-pg-l5-19`.
