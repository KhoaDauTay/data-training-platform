---
id: e-st-l3-06
engine: stack
level: L3
module: warehouse
title: "Tổng hợp: doanh thu tăng gấp đôi qua đêm"
title_en: "Capstone: revenue doubled overnight"
kind: capstone
runtime: browser
minutes: 35
figures: [{ name: st-revenue-trace, at: idea }]
objectives:
  - vi: Lần một con số sai từ mart qua model trung gian, staging, tới bảng raw.
    en: Trace a wrong number from the mart through the intermediate model and staging to the raw table.
  - vi: Viết test bắt được lỗi, rồi sửa model staging cho tới khi test qua và con số đúng.
    en: Write the test that catches the error, then fix the staging model until the test passes and the number is right.
  - vi: Biết vì sao phải bỏ trùng trước rồi mới bỏ dòng đã xóa.
    en: Know why duplicates must be removed before deleted rows are dropped.
requires: [e-st-l2-08, e-st-l2-04]
sources:
  - { url: "https://fivetran.com/docs/core-concepts/system-columns-and-tables", title: "Fivetran docs: System columns and tables" }
  - { url: "https://docs.getdbt.com/docs/build/data-tests", title: "dbt docs: Add data tests to your DAG" }
  - https://www.postgresql.org/docs/18/sql-select.html#SQL-DISTINCT
lab:
  setup: |
    CREATE SCHEMA raw_shop;
    CREATE SCHEMA staging;
    CREATE SCHEMA intermediate;
    CREATE SCHEMA marts;
    CREATE TABLE raw_shop.orders (
      order_id int, order_date date,
      amount_vnd int, status text,
      _fivetran_synced timestamp,
      _fivetran_deleted boolean
    );
    INSERT INTO raw_shop.orders VALUES
      (1001, '2026-10-29', 300000, 'paid', '2026-10-29 23:00', false),
      (1002, '2026-10-29', 200000, 'paid', '2026-10-29 23:00', false),
      (1003, '2026-10-30', 400000, 'paid', '2026-10-30 23:00', false),
      (1004, '2026-10-30', 250000, 'paid', '2026-10-30 23:00', false),
      (1005, '2026-10-30', 150000, 'paid', '2026-10-30 23:00', false),
      (1003, '2026-10-30', 400000, 'paid', '2026-10-31 02:00', false),
      (1004, '2026-10-30', 250000, 'paid', '2026-10-31 02:00', false),
      (1005, '2026-10-30', 150000, 'paid', '2026-10-31 02:00', true),
      (1006, '2026-10-31', 100000, 'paid', '2026-10-31 07:00', false);
    CREATE VIEW staging.stg_orders AS
      SELECT order_id, order_date, amount_vnd,
        status, _fivetran_synced,
        _fivetran_deleted
      FROM raw_shop.orders;
    CREATE VIEW intermediate.int_orders AS
      SELECT order_id, order_date, amount_vnd
      FROM staging.stg_orders
      WHERE status = 'paid';
    CREATE VIEW marts.fct_revenue_daily AS
      SELECT order_date,
        sum(amount_vnd) AS revenue_vnd,
        count(*) AS orders
      FROM intermediate.int_orders
      GROUP BY order_date;
  steps:
    - name: { vi: Mart, en: Mart }
      task:
        vi: "Bắt đầu từ con số trên dashboard: `order_date` và `revenue_vnd` của mart `fct_revenue_daily`, xếp theo ngày."
        en: "Start from the dashboard's number: `order_date` and `revenue_vnd` of the mart `fct_revenue_daily`, sorted by date."
      solution: |
        select order_date, revenue_vnd
        from {{ ref('fct_revenue_daily') }}
        order by order_date
      check: rows
      ordered: true
      hint:
        vi: "`select order_date, revenue_vnd from {{ ref('fct_revenue_daily') }} order by order_date`."
        en: "`select order_date, revenue_vnd from {{ ref('fct_revenue_daily') }} order by order_date`."
    - name: { vi: Trung gian, en: Intermediate }
      task:
        vi: "Đi lên một bước, model `int_orders`: mỗi ngày, `row_count` (số dòng) và `order_count` (số đơn khác nhau)."
        en: "One step up, model `int_orders`: for each day, `row_count` (rows) and `order_count` (distinct orders)."
      solution: |
        select order_date,
          count(*) as row_count,
          count(distinct order_id)
            as order_count
        from {{ ref('int_orders') }}
        group by order_date
      check: rows
      hint:
        vi: "`count(*)` và `count(distinct order_id)` trên `{{ ref('int_orders') }}`, `group by order_date`."
        en: "`count(*)` and `count(distinct order_id)` on `{{ ref('int_orders') }}`, `group by order_date`."
    - name: { vi: Test, en: Test }
      task:
        vi: "Viết test lẽ ra đã bắt được lỗi: test `unique` trên `order_id` của model `stg_orders`, trả mỗi `order_id` lặp lại và số lần `n` (bỏ qua NULL)."
        en: "Write the test that would have caught it: the `unique` test on `order_id` of model `stg_orders`, returning each repeated `order_id` and its count `n` (ignore NULLs)."
      solution: |
        select order_id, count(*) as n
        from {{ ref('stg_orders') }}
        where order_id is not null
        group by order_id
        having count(*) > 1
      check: rows
      hint:
        vi: "`group by order_id having count(*) > 1` trên `{{ ref('stg_orders') }}`."
        en: "`group by order_id having count(*) > 1` on `{{ ref('stg_orders') }}`."
    - name: { vi: Raw, en: Raw }
      task:
        vi: "Tới bảng raw, nguồn `shop`, bảng `orders`: với mỗi `order_id` có hơn một bản, trả `versions` (số bản), `deleted` (có bản nào bị đánh dấu xóa không) và `last_synced` (lần đồng bộ cuối)."
        en: "Down to the raw table, source `shop`, table `orders`: for each `order_id` with more than one version, return `versions` (version count), `deleted` (whether any version is flagged deleted) and `last_synced` (the last sync)."
      solution: |
        select order_id,
          count(*) as versions,
          bool_or(_fivetran_deleted)
            as deleted,
          max(_fivetran_synced)
            as last_synced
        from {{ source('shop', 'orders') }}
        group by order_id
        having count(*) > 1
      check: rows
      hint:
        vi: "`count(*)`, `bool_or(_fivetran_deleted)`, `max(_fivetran_synced)` trên `{{ source('shop', 'orders') }}`, `having count(*) > 1`."
        en: "`count(*)`, `bool_or(_fivetran_deleted)`, `max(_fivetran_synced)` on `{{ source('shop', 'orders') }}`, `having count(*) > 1`."
    - name: { vi: Sửa model, en: Fix the model }
      task:
        vi: "Sửa model `stg_orders` (staging, view) từ nguồn `shop`, bảng `orders`: giữ bản mới nhất của mỗi `order_id` theo `_fivetran_synced`, rồi bỏ bản mới nhất nào bị đánh dấu xóa. Giữ đủ sáu cột như cũ. Lab chấm bằng `dupes` (số dòng hỏng của test `unique`, phải là 0) và `revenue_1030` (doanh thu ngày 30/10 trên mart)."
        en: "Fix model `stg_orders` (staging, a view) from source `shop`, table `orders`: keep each `order_id`'s newest version by `_fivetran_synced`, then drop the newest versions flagged deleted. Keep all six columns as before. The lab grades it with `dupes` (the `unique` test's failing rows, must be 0) and `revenue_1030` (30 Oct revenue on the mart)."
      model: { name: stg_orders, layer: staging, materialized: view }
      solution: |
        select * from (
          select distinct on (order_id)
            order_id, order_date, amount_vnd,
            status, _fivetran_synced,
            _fivetran_deleted
          from {{ source('shop', 'orders') }}
          order by order_id,
            _fivetran_synced desc
        ) latest
        where not _fivetran_deleted
      after: |
        SELECT
          (SELECT count(*) FROM (SELECT order_id FROM staging.stg_orders GROUP BY order_id HAVING count(*) > 1) u) AS dupes,
          (SELECT revenue_vnd FROM marts.fct_revenue_daily WHERE order_date = '2026-10-30') AS revenue_1030
      check: rows
      hint:
        vi: "Bỏ trùng trước trong một subquery (`distinct on (order_id)` với `order by order_id, _fivetran_synced desc`), rồi `where not _fivetran_deleted` ở câu ngoài."
        en: "Deduplicate first in a subquery (`distinct on (order_id)` with `order by order_id, _fivetran_synced desc`), then `where not _fivetran_deleted` in the outer query."
quiz:
  - q:
      vi: "Nếu `stg_orders` lọc `NOT _fivetran_deleted` **trước** rồi mới bỏ trùng, doanh thu ngày 30/10 là bao nhiêu? (30/10: đơn 1003 400.000, 1004 250.000, 1005 150.000; bản mới nhất của 1005 bị đánh dấu xóa.)"
      en: "If `stg_orders` filters `NOT _fivetran_deleted` **first** and deduplicates after, what is 30 Oct's revenue? (30 Oct: order 1003 400,000, 1004 250,000, 1005 150,000; 1005's newest version is flagged deleted.)"
    options:
      - { vi: "650.000 đồng", en: "650,000 VND" }
      - { vi: "800.000 đồng", en: "800,000 VND" }
      - { vi: "1.600.000 đồng", en: "1,600,000 VND" }
    answer: 1
    trap: 0
    why:
      vi: "650.000 là số đúng nên dễ chọn, nhưng lọc trước thì bản đã xóa của 1005 bị bỏ, còn bản cũ chưa xóa của nó ở lại; bỏ trùng xong, 1005 vẫn được tính. Tổng: 400.000 + 250.000 + 150.000 = 800.000. Bỏ trùng trước thì bản mới nhất của 1005 là bản đã xóa, lọc nó đi còn 400.000 + 250.000 = 650.000. 1.600.000 là khi không làm gì."
      en: "650,000 is the true figure, so it is tempting, but filtering first drops 1005's deleted version and keeps its older, undeleted one; after deduplicating, 1005 still counts. Total: 400,000 + 250,000 + 150,000 = 800,000. Deduplicating first makes 1005's newest version the deleted one, and filtering it out leaves 400,000 + 250,000 = 650,000. 1,600,000 is doing nothing at all."
  - q:
      vi: "Sáng nay dashboard ghi doanh thu 30/10 là 1.600.000, gấp đôi hôm qua báo. Việc đầu tiên nên làm là gì?"
      en: "This morning the dashboard says 30 Oct revenue is 1,600,000, twice what was reported yesterday. What should you do first?"
    options:
      - { vi: "Chia đôi số trên dashboard tới khi sửa xong", en: "Halve the dashboard's number until it is fixed" }
      - { vi: "Chạy lại connector cho chắc", en: "Rerun the connector to be safe" }
      - { vi: "Lần lineage từ mart xuống raw và chạy test", en: "Trace lineage from mart to raw and run the tests" }
    answer: 2
    trap: 0
    why:
      vi: "Chia đôi nghe như đưa số về đúng, nhưng 1.600.000 / 2 = 800.000, vẫn sai: số đúng là 650.000 vì đơn 1005 đã bị xóa. Chia đôi cũng làm sai các ngày không bị trùng. Chạy lại connector có thể chép trùng thêm lần nữa. Lần từ mart xuống raw cho thấy lỗi ở đâu, và test giữ cho nó không quay lại."
      en: "Halving sounds like it restores the number, but 1,600,000 / 2 = 800,000, still wrong: the right figure is 650,000 because order 1005 was deleted. Halving also breaks the days that were not duplicated. Rerunning the connector may copy duplicates once more. Tracing from mart to raw shows where the error is, and the test keeps it from coming back."
---
## Mở bài

Sáng 31/10, dashboard của Chợ Lồng Đèn ghi doanh thu ngày 30/10 là 1.600.000 đồng, gấp đôi con số 800.000 báo hôm qua. Tuần trước có người "dọn gọn" model `stg_orders`, và đêm qua connector gửi lại cả ngày 30/10. Bài tổng hợp này lần con số đó từ mart xuống raw, viết test bắt lỗi, rồi sửa model.

## Ý chính

Một con số sai trên mart hiếm khi sai ở mart. Đi ngược lineage từng bước, và ở mỗi bước hỏi một câu: mart cộng gì, model trung gian có bao nhiêu dòng cho mỗi đơn, staging có giữ mỗi đơn một dòng không, bảng raw có gì lạ. Chỗ đầu tiên con số "lệch" là chỗ có lỗi.

Ở đây, bảng raw nhận lại ba đơn của ngày 30/10 trong lần đồng bộ 02:00, và bản mới của đơn 1005 mang `_fivetran_deleted` vì đơn đã bị xóa ở nguồn. Model staging sau khi "dọn gọn" không còn bỏ trùng và không lọc dòng xóa, nên mọi thứ phía sau cộng hai lần.

Sửa ở staging, không ở dashboard: giữ bản mới nhất của mỗi đơn, rồi bỏ bản mới nhất đã bị đánh dấu xóa. Thứ tự này quan trọng: lọc trước thì bản cũ chưa xóa của 1005 lại lọt vào. Cuối cùng giữ test `unique` để lỗi này báo đỏ ngay lần sau. Hình cuối mục đi ngược từ mart tới raw rồi cho thấy con số sau khi sửa.

## Cú pháp

```text
# models/staging/schema.yml
models:
  - name: stg_orders
    columns:
      - name: order_id
        data_tests: [unique, not_null]
```

```sql
-- newest version per key, then
-- drop the deleted ones
SELECT * FROM (
  SELECT DISTINCT ON (key) *
  FROM raw_table
  ORDER BY key, loaded_at DESC) t
WHERE NOT is_deleted;
```

- Lần ngược: mart → trung gian → staging → raw; dừng ở chỗ đầu tiên số lệch.
- Sửa model, thêm test; không vá số trên dashboard.

## Ví dụ

Bảng raw theo từng lần đồng bộ: lần 02:00 ngày 31/10 gửi lại ba dòng.

```sql
SELECT _fivetran_synced,
  count(*) AS rows
FROM raw_shop.orders
GROUP BY _fivetran_synced
ORDER BY _fivetran_synced;
```

Lineage của các model trong lab, đọc từ catalog như bài `e-st-l2-07`:

```sql
SELECT view_schema, view_name,
  table_schema, table_name
FROM information_schema
  .view_table_usage
WHERE view_schema IN
  ('staging', 'intermediate', 'marts')
ORDER BY view_schema, view_name;
```

## Lỗi hay gặp

Vá con số trên dashboard: chia đôi làm sai cả hai ngày không bị trùng, và 30/10 vẫn sai.

```sql
-- WRONG: patch the number
SELECT order_date,
  revenue_vnd / 2 AS revenue_vnd
FROM marts.fct_revenue_daily
ORDER BY order_date;
```

```sql
-- FIX: find which orders repeat
SELECT order_id, count(*) AS n
FROM intermediate.int_orders
GROUP BY order_id
HAVING count(*) > 1
ORDER BY order_id;
```

Viết lại view staging mà bỏ bớt cột: các model phía sau còn đọc chúng, và Postgres không cho bỏ cột của một view.

```sql
-- ERROR 42P16: cannot drop view columns
CREATE OR REPLACE VIEW
  staging.stg_orders AS
SELECT order_id, order_date, amount_vnd
FROM raw_shop.orders;
```

## Thực hành

Năm bước, đi ngược rồi sửa: đọc mart, đếm dòng và đơn ở model trung gian, viết test `unique` trên staging (nó trượt ngay), xem các bản trong bảng raw, rồi sửa `stg_orders`. Bước cuối được chấm bằng cách chạy lại test và đọc mart: test phải ra 0 dòng và ngày 30/10 phải là 650.000.

## Tóm tắt

- Một số sai trên mart: đi ngược lineage, dừng ở chỗ đầu tiên số lệch.
- Đồng bộ gửi lại và dòng bị xóa nằm ở raw; staging phải bỏ trùng và bỏ dòng xóa.
- Bỏ trùng trước, rồi mới bỏ bản mới nhất đã xóa.
- Sửa model và giữ test; không vá số trên dashboard.

# EN

## Opening

On the morning of 31 Oct, Lantern Market's dashboard shows 30 Oct revenue of 1,600,000 VND, twice the 800,000 reported yesterday. Last week someone "tidied up" the `stg_orders` model, and last night the connector resent the whole of 30 Oct. This capstone traces that number from the mart down to raw, writes the test that catches the error, then fixes the model.

## Key idea

A wrong number on a mart is rarely wrong in the mart. Walk back up the lineage one step at a time, and at each step ask one question: what does the mart sum, how many rows per order does the intermediate model have, does staging keep one row per order, what is odd in the raw table. The first place the number "drifts" is where the error is.

Here the raw table received three 30 Oct orders again in the 02:00 sync, and order 1005's new version carries `_fivetran_deleted` because the order was deleted at the source. After the "tidy-up", the staging model no longer deduplicates and no longer filters deleted rows, so everything downstream counts twice.

Fix it in staging, not on the dashboard: keep each order's newest version, then drop the newest versions flagged deleted. The order matters: filter first and 1005's older, undeleted version slips back in. Finally keep the `unique` test so this error turns red at once next time. The figure at the end of this section walks back from the mart to raw, then shows the number after the fix.

## Syntax

```text
# models/staging/schema.yml
models:
  - name: stg_orders
    columns:
      - name: order_id
        data_tests: [unique, not_null]
```

```sql
-- newest version per key, then
-- drop the deleted ones
SELECT * FROM (
  SELECT DISTINCT ON (key) *
  FROM raw_table
  ORDER BY key, loaded_at DESC) t
WHERE NOT is_deleted;
```

- Trace back: mart → intermediate → staging → raw; stop at the first place the number drifts.
- Fix the model, add the test; never patch the number on the dashboard.

## Example

The raw table by sync: the 02:00 sync on 31 Oct resent three rows.

```sql
SELECT _fivetran_synced,
  count(*) AS rows
FROM raw_shop.orders
GROUP BY _fivetran_synced
ORDER BY _fivetran_synced;
```

The lineage of the lab's models, read from the catalog as in lesson `e-st-l2-07`:

```sql
SELECT view_schema, view_name,
  table_schema, table_name
FROM information_schema
  .view_table_usage
WHERE view_schema IN
  ('staging', 'intermediate', 'marts')
ORDER BY view_schema, view_name;
```

## Common mistakes

Patching the number on the dashboard: halving breaks both days that were not duplicated, and 30 Oct is still wrong.

```sql
-- WRONG: patch the number
SELECT order_date,
  revenue_vnd / 2 AS revenue_vnd
FROM marts.fct_revenue_daily
ORDER BY order_date;
```

```sql
-- FIX: find which orders repeat
SELECT order_id, count(*) AS n
FROM intermediate.int_orders
GROUP BY order_id
HAVING count(*) > 1
ORDER BY order_id;
```

Rewriting the staging view with fewer columns: downstream models still read them, and Postgres does not let a view drop columns.

```sql
-- ERROR 42P16: cannot drop view columns
CREATE OR REPLACE VIEW
  staging.stg_orders AS
SELECT order_id, order_date, amount_vnd
FROM raw_shop.orders;
```

## Practice

Five steps, back up the chain and then the fix: read the mart, count rows and orders in the intermediate model, write the `unique` test on staging (it fails at once), look at the versions in the raw table, then fix `stg_orders`. The last step is graded by rerunning the test and reading the mart: the test must return 0 rows and 30 Oct must be 650,000.

## Recap

- A wrong number on a mart: walk back up the lineage, stop at the first place it drifts.
- Resent syncs and deleted rows live in raw; staging must deduplicate and drop deleted rows.
- Deduplicate first, then drop the newest versions that are deleted.
- Fix the model and keep the test; never patch the number on the dashboard.
