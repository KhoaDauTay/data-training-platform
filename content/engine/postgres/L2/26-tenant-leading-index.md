---
id: e-pg-l2-26
engine: postgres
level: L2
module: btree-multi
title: "Index dẫn đầu bằng tenant_id"
title_en: "Indexes that lead with tenant_id"
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-25" }
objectives:
  - { vi: "Đặt `tenant_id` đứng đầu index nhiều cột, rồi tới cột lọc bằng, cuối cùng là cột khoảng hoặc sắp xếp", en: "Put `tenant_id` first in a multicolumn index, then the equality columns, last the range or sort column" }
  - { vi: "Đọc trong EXPLAIN khi một câu của một khách phải đi qua dòng của mọi khách", en: "Read in EXPLAIN when one tenant's query has to walk through every tenant's rows" }
  - { vi: "Giữ điều kiện khách ở dạng index dùng được (`tenant_id = 7`, không bọc biểu thức)", en: "Keep the tenant condition in a form the index can use (`tenant_id = 7`, not wrapped in an expression)" }
requires: [e-pg-l2-02]
sources:
  - https://www.postgresql.org/docs/18/indexes-multicolumn.html
  - https://www.postgresql.org/docs/18/indexes-ordering.html
  - https://www.postgresql.org/docs/18/using-explain.html
lab:
  setup: |
    -- Cargo Query customer portal: 50 shippers share one invoices table (loaded from several systems, so created_at is not in heap order)
    CREATE TABLE invoices (
      tenant_id int NOT NULL,
      id int NOT NULL,
      created_at timestamptz NOT NULL,
      amount int NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );
    INSERT INTO invoices
    SELECT g % 50 + 1, g, timestamptz '2026-01-01 00:00+00' + ((g * 7919) % 20000) * interval '20 minutes', g % 900 + 100
    FROM generate_series(1, 20000) AS g;
    CREATE INDEX invoices_created_idx ON invoices (created_at);
    ANALYZE invoices;
  steps:
    - task: { vi: "Trang của mỗi khách hiện 10 hóa đơn mới nhất của họ. Tạo index tên `invoices_tenant_created_idx` phục vụ đúng câu đó (khách trước, thời gian sau).", en: "Each tenant's page shows their 10 newest invoices. Create an index named `invoices_tenant_created_idx` that serves exactly that query (tenant first, time second)." }
      solution: "CREATE INDEX invoices_tenant_created_idx ON invoices (tenant_id, created_at)"
      target: "SELECT tenant_id, id, created_at FROM invoices WHERE tenant_id = 7 ORDER BY created_at DESC LIMIT 10"
      check: catalog
      hint: { vi: "`CREATE INDEX … ON invoices (tenant_id, created_at)`.", en: "`CREATE INDEX … ON invoices (tenant_id, created_at)`." }
    - task: { vi: "Lấy tenant_id, id, created_at của 10 hóa đơn mới nhất của khách 7, mới nhất trước. Kế hoạch phải đọc `invoices_tenant_created_idx` và không có Sort.", en: "Return tenant_id, id, created_at of tenant 7's 10 newest invoices, newest first. The plan must read `invoices_tenant_created_idx` with no Sort." }
      solution: "SELECT tenant_id, id, created_at FROM invoices WHERE tenant_id = 7 ORDER BY created_at DESC LIMIT 10"
      check: plan
      ordered: true
      hint: { vi: "`WHERE tenant_id = 7 ORDER BY created_at DESC LIMIT 10`.", en: "`WHERE tenant_id = 7 ORDER BY created_at DESC LIMIT 10`." }
    - task: { vi: "Một dòng cho khách 7 trong tháng 3/2026 theo giờ UTC: tenant_id, n (số hóa đơn), total (tổng tiền). Bài chấm cả tốc độ: index phải thu hẹp được cả khách lẫn khoảng thời gian.", en: "One row for tenant 7 in March 2026, UTC time: tenant_id, n (invoice count), total (sum of amounts). Speed is graded too: the index must narrow both the tenant and the time range." }
      solution: "SELECT tenant_id, count(*) AS n, sum(amount) AS total FROM invoices WHERE tenant_id = 7 AND created_at >= timestamptz '2026-03-01 00:00+00' AND created_at < timestamptz '2026-04-01 00:00+00' GROUP BY tenant_id"
      check: rows
      perf: { table: invoices }
      slow: "SELECT tenant_id, count(*) AS n, sum(amount) AS total FROM invoices WHERE tenant_id + 0 = 7 AND created_at >= timestamptz '2026-03-01 00:00+00' AND created_at < timestamptz '2026-04-01 00:00+00' GROUP BY tenant_id"
      hint: { vi: "So thẳng `tenant_id = 7`, và `created_at` với hai mốc `>=` và `<`.", en: "Compare `tenant_id = 7` directly, and `created_at` with two bounds, `>=` and `<`." }
quiz:
  - q: { vi: "Mọi câu của cổng khách hàng đều có `tenant_id = $1` và sắp theo `created_at`. Bạn có index `(created_at, tenant_id)`. Nó tốt như `(tenant_id, created_at)` không?", en: "Every query of the customer portal has `tenant_id = $1` and sorts by `created_at`. You have an index `(created_at, tenant_id)`. Is it as good as `(tenant_id, created_at)`?" }
    options:
      - { vi: "Như nhau: index có đủ hai cột là được", en: "The same: the index has both columns, that is enough" }
      - { vi: "Không: với `created_at` đứng đầu, dòng của một khách rải khắp index, nên câu phải đi qua dòng của mọi khách", en: "No: with `created_at` first, one tenant's rows are spread over the whole index, so the query walks through every tenant's rows" }
      - { vi: "Tốt hơn, vì thời gian chọn lọc hơn", en: "Better, because time is more selective" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì cả hai cột đều có mặt, nhưng B-tree sắp theo cột đầu trước. `tenant_id` đứng đầu thì dòng của một khách nằm liền nhau, đã xếp theo thời gian: đọc một đoạn ngắn là xong. `created_at` đứng đầu thì phải lướt qua mọi khách rồi lọc bỏ: một khách lớn làm chậm câu của mọi khách khác.", en: "It sounds right because both columns are there, but a B-tree sorts by its first column first. With `tenant_id` first, one tenant's rows sit together, already in time order: reading one short stretch is enough. With `created_at` first, the query skims every tenant and filters them out: one big tenant slows every other tenant's query." }
  - q: { vi: "Bảng có `PRIMARY KEY (id)` và index `(tenant_id)`. Câu \"đơn mới nhất của khách 7\" vẫn có Sort. Vì sao?", en: "A table has `PRIMARY KEY (id)` and an index `(tenant_id)`. The query \"tenant 7's newest orders\" still has a Sort. Why?" }
    options:
      - { vi: "Index `(tenant_id)` tìm đúng khách, nhưng trong một khách các dòng không xếp theo thời gian", en: "The `(tenant_id)` index finds the tenant, but within one tenant the rows are not in time order" }
      - { vi: "Vì khóa chính không có `tenant_id`", en: "Because the primary key has no `tenant_id`" }
      - { vi: "Index hỏng", en: "The index is broken" }
    answer: 0
    trap: 1
    why: { vi: "Khóa chính thiếu `tenant_id` nghe như thủ phạm vì đó là lời khuyên đúng cho bảng nhiều khách, nhưng nó không quyết định Sort ở đây. Sort còn vì index chỉ có `tenant_id`: thêm `created_at` làm cột thứ hai thì thứ tự có sẵn trong index.", en: "A primary key without `tenant_id` sounds like the culprit because that is good advice for multi-tenant tables, but it does not decide the Sort here. The Sort stays because the index holds only `tenant_id`: add `created_at` as the second column and the order comes ready from the index." }
---
## Mở bài

Năm mươi chủ hàng dùng chung bảng `invoices` của cổng khách hàng Cargo Query. Trang của một khách nhỏ chậm dần theo số hóa đơn của các khách lớn, dù khách nhỏ chỉ có vài trăm dòng. Thủ phạm là thứ tự cột trong index.

## Ý chính

Ở bảng nhiều khách, gần như mọi câu đều có `tenant_id = …`. Index nhiều cột có `tenant_id` đứng đầu, rồi tới cột lọc bằng, cuối cùng là cột khoảng hoặc sắp xếp, giữ dòng của một khách liền nhau trong index, đã xếp theo cột cuối: câu "10 hóa đơn mới nhất" đọc ngược một đoạn ngắn, không cần Sort.

Nhiều người nghĩ index có đủ cột là được, thứ tự không quan trọng. Thật ra B-tree sắp theo cột đầu trước. Index chỉ có `created_at` (hoặc `created_at` đứng đầu) bắt câu của khách 7 lướt qua hóa đơn của cả 50 khách rồi lọc bỏ: dòng "Rows Removed by Filter" lớn là dấu hiệu, và một khách lớn làm chậm mọi khách khác.

Điều kiện khách phải ở dạng index dùng được: `tenant_id = 7`, không phải `tenant_id + 0 = 7`. Khi bật RLS, policy thêm `tenant_id = …` vào mọi câu (xem `e-pg-l5-19`), nên chính index này giữ cho mọi câu dưới RLS vẫn rẻ.

## Cú pháp

```sql
CREATE INDEX name ON t
  (tenant_id, created_at);
SELECT … FROM t
WHERE tenant_id = 7
ORDER BY created_at DESC
LIMIT 10;
```

- Cột lọc bằng đứng trước, cột khoảng hoặc sắp xếp đứng sau.
- `ORDER BY created_at DESC`: B-tree đọc ngược được, không cần index `DESC` riêng.

## Ví dụ

Trước khi có index ghép, câu của khách 7:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF,
         SUMMARY OFF)
SELECT id FROM invoices
WHERE tenant_id = 7
ORDER BY created_at DESC LIMIT 10;
```

Kế hoạch có Sort hoặc lướt index thời gian rồi lọc bỏ khách khác. Thêm index dẫn đầu bằng khách:

```sql
CREATE INDEX invoices_tenant_created_idx
  ON invoices (tenant_id, created_at);
EXPLAIN (COSTS OFF)
SELECT id FROM invoices
WHERE tenant_id = 7
ORDER BY created_at DESC LIMIT 10;
```

Giờ là Index Scan Backward trên index mới, không Sort. Khoảng thời gian của một khách:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM invoices
WHERE tenant_id = 7
  AND created_at >= '2026-03-01'
  AND created_at < '2026-04-01';
```

Cả hai điều kiện nằm trong `Index Cond`.

## Lỗi hay gặp

Đặt thời gian đứng đầu:

```sql
-- WRONG: time first in the index
CREATE INDEX invoices_created_tenant_idx
  ON invoices (created_at, tenant_id);
DROP INDEX invoices_tenant_created_idx;
EXPLAIN (COSTS OFF)
SELECT count(*) FROM invoices
WHERE tenant_id = 7
  AND created_at >= '2026-03-01'
  AND created_at < '2026-04-01';
```

```sql
-- FIX: tenant first
CREATE INDEX invoices_tenant_created_idx
  ON invoices (tenant_id, created_at);
EXPLAIN (COSTS OFF)
SELECT count(*) FROM invoices
WHERE tenant_id = 7
  AND created_at >= '2026-03-01'
  AND created_at < '2026-04-01';
```

Index có thời gian đứng đầu không giúp câu của một khách: planner bỏ nó, đọc mọi hóa đơn của khách qua khóa chính rồi lọc thời gian từng dòng. Bọc cột khách trong biểu thức:

```sql
-- WRONG: tenant_id + 0 hides the column
EXPLAIN (COSTS OFF)
SELECT count(*) FROM invoices
WHERE tenant_id + 0 = 7;
```

```sql
-- FIX: the column itself
EXPLAIN (COSTS OFF)
SELECT count(*) FROM invoices
WHERE tenant_id = 7;
```

## Thực hành

Ba bước: tạo index dẫn đầu bằng khách, lấy 10 hóa đơn mới nhất không cần Sort, rồi đếm một tháng của một khách với thanh tốc độ: cách viết bọc cột khách bị từ chối vì chậm.

## Tóm tắt

- Index cho bảng nhiều khách: `tenant_id` trước, cột lọc bằng, rồi cột khoảng hoặc sắp xếp.
- Thời gian đứng đầu thì câu của một khách lướt qua mọi khách: một khách lớn làm chậm tất cả.
- Viết `tenant_id = 7`; `tenant_id + 0` làm mất index.
- Dưới RLS, policy thêm điều kiện khách vào mọi câu; đọc tiếp: `e-pg-l5-19`, `e-pg-l5-22`.

# EN

## Opening

Fifty shippers share the `invoices` table of the Cargo Query customer portal. A small tenant's page gets slower as the big tenants' invoices grow, though the small tenant has only a few hundred rows. The culprit is the column order in the index.

## Key idea

In a multi-tenant table nearly every query has `tenant_id = …`. A multicolumn index with `tenant_id` first, then the equality columns, last the range or sort column, keeps one tenant's rows together in the index, already sorted by the last column: "the 10 newest invoices" reads one short stretch backwards, with no Sort.

Many people think an index only needs the right columns, in any order. In fact a B-tree sorts by its first column first. An index on `created_at` alone (or with `created_at` first) makes tenant 7's query skim the invoices of all 50 tenants and filter them out: a large "Rows Removed by Filter" is the sign, and one big tenant slows every other one.

The tenant condition must be in a form the index can use: `tenant_id = 7`, not `tenant_id + 0 = 7`. With RLS on, the policy adds `tenant_id = …` to every query (see `e-pg-l5-19`), so this very index keeps every query under RLS cheap.

## Syntax

```sql
CREATE INDEX name ON t
  (tenant_id, created_at);
SELECT … FROM t
WHERE tenant_id = 7
ORDER BY created_at DESC
LIMIT 10;
```

- Equality columns first, the range or sort column after them.
- `ORDER BY created_at DESC`: a B-tree can be read backwards, no separate `DESC` index needed.

## Example

Before the composite index, tenant 7's query:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF,
         SUMMARY OFF)
SELECT id FROM invoices
WHERE tenant_id = 7
ORDER BY created_at DESC LIMIT 10;
```

The plan has a Sort, or skims the time index and filters the other tenants out. Add an index that leads with the tenant:

```sql
CREATE INDEX invoices_tenant_created_idx
  ON invoices (tenant_id, created_at);
EXPLAIN (COSTS OFF)
SELECT id FROM invoices
WHERE tenant_id = 7
ORDER BY created_at DESC LIMIT 10;
```

Now it is an Index Scan Backward on the new index, no Sort. One tenant's time range:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM invoices
WHERE tenant_id = 7
  AND created_at >= '2026-03-01'
  AND created_at < '2026-04-01';
```

Both conditions are in the `Index Cond`.

## Common mistakes

Putting time first:

```sql
-- WRONG: time first in the index
CREATE INDEX invoices_created_tenant_idx
  ON invoices (created_at, tenant_id);
DROP INDEX invoices_tenant_created_idx;
EXPLAIN (COSTS OFF)
SELECT count(*) FROM invoices
WHERE tenant_id = 7
  AND created_at >= '2026-03-01'
  AND created_at < '2026-04-01';
```

```sql
-- FIX: tenant first
CREATE INDEX invoices_tenant_created_idx
  ON invoices (tenant_id, created_at);
EXPLAIN (COSTS OFF)
SELECT count(*) FROM invoices
WHERE tenant_id = 7
  AND created_at >= '2026-03-01'
  AND created_at < '2026-04-01';
```

An index with time first does not help one tenant's query: the planner skips it, reads all the tenant's invoices through the primary key and filters the time row by row. Wrapping the tenant column in an expression:

```sql
-- WRONG: tenant_id + 0 hides the column
EXPLAIN (COSTS OFF)
SELECT count(*) FROM invoices
WHERE tenant_id + 0 = 7;
```

```sql
-- FIX: the column itself
EXPLAIN (COSTS OFF)
SELECT count(*) FROM invoices
WHERE tenant_id = 7;
```

## Practice

Three steps: create an index that leads with the tenant, fetch the 10 newest invoices with no Sort, then count one tenant's month under a speed bar: the version that wraps the tenant column is refused as slow.

## Recap

- An index for a multi-tenant table: `tenant_id` first, the equality columns, then the range or sort column.
- With time first, one tenant's query skims every tenant: one big tenant slows them all.
- Write `tenant_id = 7`; `tenant_id + 0` loses the index.
- Under RLS the policy adds the tenant condition to every query; read next: `e-pg-l5-19`, `e-pg-l5-22`.
