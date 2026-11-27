---
id: e-st-l2-07
engine: stack
level: L2
module: dbt
title: "Docs và lineage: một cột từ đâu ra"
title_en: "Docs and lineage: where a column came from"
kind: concept
runtime: browser
minutes: 15
figures: [{ name: st-column-lineage, at: idea }]
objectives:
  - vi: Lần một cột của mart ngược về bảng raw qua từng model, và biết mỗi bước đã làm gì với nó.
    en: Trace a mart's column back to the raw table through each model, and know what each step did to it.
  - vi: Biết exposure cho biết dashboard nào dùng mart nào, để đoán việc gì hỏng khi một model đổi.
    en: Know that an exposure records which dashboard uses which mart, so you can tell what breaks when a model changes.
requires: [e-st-l2-02]
sources:
  - { url: "https://docs.getdbt.com/docs/build/documentation", title: "dbt docs: About documentation", title_vi: "Tài liệu dbt: viết tài liệu cho project" }
  - { url: "https://docs.getdbt.com/docs/build/exposures", title: "dbt docs: Add exposures to your DAG", title_vi: "Tài liệu dbt: thêm exposure vào DAG" }
  - { url: https://www.postgresql.org/docs/18/infoschema-view-table-usage.html, title_vi: "information_schema.view_table_usage" }
  - { url: https://www.postgresql.org/docs/18/infoschema-view-column-usage.html, title_vi: "information_schema.view_column_usage" }
lab:
  setup: |
    CREATE SCHEMA raw_shop;
    CREATE SCHEMA staging;
    CREATE SCHEMA marts;
    CREATE TABLE raw_shop.orders (
      id int, customer_id int, amount text,
      _fivetran_deleted boolean
    );
    INSERT INTO raw_shop.orders VALUES
      (701, 31, '250,000', false),
      (702, 32, '120,000', false),
      (703, 31, '90,000', true);
    CREATE TABLE raw_shop.customers (
      id int, tier text
    );
    INSERT INTO raw_shop.customers VALUES
      (31, 'gold'), (32, 'silver');
    CREATE VIEW staging.stg_orders AS
      SELECT id AS order_id, customer_id,
        replace(amount, ',', '')::int
          AS amount_vnd
      FROM raw_shop.orders
      WHERE NOT _fivetran_deleted;
    CREATE VIEW staging.stg_customers AS
      SELECT id AS customer_id, tier
      FROM raw_shop.customers;
    CREATE VIEW marts.fct_orders AS
      SELECT o.order_id, o.customer_id,
        c.tier, o.amount_vnd
      FROM staging.stg_orders o
      JOIN staging.stg_customers c
        ON c.customer_id = o.customer_id;
    CREATE VIEW marts.revenue_by_tier AS
      SELECT tier,
        sum(amount_vnd) AS revenue_vnd
      FROM marts.fct_orders
      GROUP BY tier;
    COMMENT ON COLUMN marts.fct_orders.amount_vnd
      IS 'Order total in VND; deleted orders left out';
  steps:
    - task:
        vi: "Cha trực tiếp của mart `revenue_by_tier`: trả `table_schema`, `table_name` của mọi bảng hay view mà nó đọc, từ `information_schema.view_table_usage`."
        en: "The direct parents of the mart `revenue_by_tier`: return `table_schema`, `table_name` of every table or view it reads, from `information_schema.view_table_usage`."
      solution: |
        select table_schema, table_name
        from information_schema
          .view_table_usage
        where view_schema = 'marts'
          and view_name = 'revenue_by_tier'
      check: rows
      hint:
        vi: "`where view_schema = 'marts' and view_name = 'revenue_by_tier'`."
        en: "`where view_schema = 'marts' and view_name = 'revenue_by_tier'`."
    - task:
        vi: "Đi ngược hết lineage của `marts.revenue_by_tier` và trả các bảng raw ở gốc (schema `raw_shop`): `table_schema`, `table_name`, mỗi bảng một dòng."
        en: "Walk all the way up the lineage of `marts.revenue_by_tier` and return the raw tables at the root (schema `raw_shop`): `table_schema`, `table_name`, one row per table."
      solution: |
        with recursive up as (
          select table_schema as s,
            table_name as t
          from information_schema
            .view_table_usage
          where view_schema = 'marts'
            and view_name = 'revenue_by_tier'
          union
          select u.table_schema, u.table_name
          from information_schema
            .view_table_usage u
          join up on u.view_schema = up.s
            and u.view_name = up.t)
        select s as table_schema,
          t as table_name
        from up
        where s = 'raw_shop'
      check: rows
      hint:
        vi: "Một CTE `with recursive`: bắt đầu từ cha của `revenue_by_tier`, rồi nối `view_table_usage` với chính CTE theo `view_schema`, `view_name`; cuối cùng giữ `raw_shop`."
        en: "A `with recursive` CTE: start from `revenue_by_tier`'s parents, then join `view_table_usage` to the CTE itself on `view_schema`, `view_name`; finally keep `raw_shop`."
    - task:
        vi: "Đi xuôi: mọi view đọc `staging.stg_customers`, trực tiếp hay gián tiếp. Trả `view_schema`, `view_name`, mỗi view một dòng."
        en: "Downstream: every view that reads `staging.stg_customers`, directly or indirectly. Return `view_schema`, `view_name`, one row per view."
      solution: |
        with recursive down as (
          select view_schema as s,
            view_name as v
          from information_schema
            .view_table_usage
          where table_schema = 'staging'
            and table_name = 'stg_customers'
          union
          select u.view_schema, u.view_name
          from information_schema
            .view_table_usage u
          join down on u.table_schema = down.s
            and u.table_name = down.v)
        select s as view_schema,
          v as view_name
        from down
      check: rows
      hint:
        vi: "Như bước trước nhưng ngược chiều: bắt đầu từ các view đọc `stg_customers`, rồi tìm view đọc chúng."
        en: "Like the step before, the other way round: start from the views reading `stg_customers`, then find the views reading those."
quiz:
  - q:
      vi: "Dashboard \"Doanh thu theo hạng\" đọc `marts.revenue_by_tier`. Một người định đổi tên cột `tier` trong `stg_customers`. Điều gì cho bạn biết trước là dashboard sẽ hỏng?"
      en: "The \"Revenue by tier\" dashboard reads `marts.revenue_by_tier`. Someone plans to rename column `tier` in `stg_customers`. What tells you in advance that the dashboard will break?"
    options:
      - { vi: "Lineage xuôi từ `stg_customers` tới một exposure", en: "Lineage downstream of `stg_customers` to an exposure" }
      - { vi: "Test `unique` trên `stg_customers` đang qua", en: "The `unique` test on `stg_customers` passing" }
      - { vi: "Kiểm tra freshness của nguồn khách hàng", en: "The freshness check of the customer source" }
    answer: 0
    trap: 1
    why:
      vi: "Test đang qua nghe như an toàn, nhưng test chỉ kiểm dữ liệu của chính model, không biết ai đọc nó. Freshness chỉ đo dữ liệu về trễ bao lâu. Chỉ lineage đi xuôi `stg_customers` → `fct_orders` → `revenue_by_tier` → exposure của dashboard mới cho thấy cột đổi tên sẽ làm hỏng gì."
      en: "A passing test sounds safe, but a test only checks the model's own data and knows nothing about who reads it. Freshness only measures how late data is. Only lineage running downstream `stg_customers` → `fct_orders` → `revenue_by_tier` → the dashboard's exposure shows what the renamed column will break."
  - q:
      vi: "`fct_orders` đọc `stg_orders` và `stg_customers`; mỗi model staging đọc một bảng raw. Từ `fct_orders` về `raw_shop.orders` là mấy bước, và gốc có mấy bảng raw?"
      en: "`fct_orders` reads `stg_orders` and `stg_customers`; each staging model reads one raw table. From `fct_orders` to `raw_shop.orders` is how many hops, and how many raw tables sit at the root?"
    options:
      - { vi: "1 bước, 1 bảng raw", en: "1 hop, 1 raw table" }
      - { vi: "2 bước, 1 bảng raw", en: "2 hops, 1 raw table" }
      - { vi: "2 bước, 2 bảng raw", en: "2 hops, 2 raw tables" }
    answer: 2
    trap: 0
    why:
      vi: "\"1 bước\" là kết quả khi chỉ xem cha trực tiếp, nhưng cha trực tiếp của `fct_orders` là hai model staging, chưa phải raw. Đi tiếp: `fct_orders` → `stg_orders` (bước 1) → `raw_shop.orders` (bước 2). Nhánh `stg_customers` cũng tới một bảng raw ở bước 2, nên gốc có 2 bảng: `raw_shop.orders` và `raw_shop.customers`."
      en: "\"1 hop\" is what you get looking only at direct parents, but `fct_orders`' direct parents are two staging models, not raw yet. Keep going: `fct_orders` → `stg_orders` (hop 1) → `raw_shop.orders` (hop 2). The `stg_customers` branch also reaches a raw table at hop 2, so the root has 2 tables: `raw_shop.orders` and `raw_shop.customers`."
---
## Mở bài

Kế toán của Chợ Lồng Đèn hỏi: cột `amount_vnd` trên dashboard có tính đơn đã xóa không? Bạn không đoán: bạn lần cột đó ngược về bảng raw và đọc từng bước.

## Ý chính

**Lineage** là đồ thị "model nào đọc gì". dbt dựng nó từ chính các `ref()` và `source()`, rồi trang docs vẽ nó ra: chọn một mart, đi ngược lên từng model tới bảng raw. Lần một **cột** là đọc câu SQL ở mỗi bước: ở staging, `amount` dạng chữ được bỏ dấu phẩy, ép sang số và đơn đã xóa bị bỏ; ở mart, cột chỉ được chép qua.

Docs là chữ đi cùng model: mỗi model và cột có một `description` trong YAML, và có thể ghi thẳng vào database làm comment. Một **exposure** khai báo ai dùng dữ liệu (một dashboard, một notebook) và nó phụ thuộc mart nào, nên lineage đi xuôi được tới tận người đọc số.

Trong Postgres, phần lineage giữa các view nằm sẵn trong catalog: `information_schema.view_table_usage` cho biết view nào đọc bảng nào, `view_column_usage` cho biết nó dùng cột nào. Hình cuối mục lần cột `amount_vnd` từ raw tới dashboard.

## Cú pháp

```text
# models/marts/schema.yml
models:
  - name: fct_orders
    description: One row per order.
    columns:
      - name: amount_vnd
        description: Total in VND.
exposures:
  - name: revenue_by_tier
    type: dashboard
    owner: {name: Data team}
    depends_on:
      - ref('revenue_by_tier')
```

```sql
SELECT table_schema, table_name
FROM information_schema
  .view_table_usage
WHERE view_name = 'fct_orders';
```

- `type` của exposure: `dashboard`, `notebook`, `analysis`, `ml`, `application`.
- Lineage xuôi (ai đọc tôi) quan trọng như lineage ngược (tôi đọc ai).

## Ví dụ

Cha trực tiếp của mart `fct_orders`:

```sql
SELECT table_schema, table_name
FROM information_schema
  .view_table_usage
WHERE view_schema = 'marts'
  AND view_name = 'fct_orders'
ORDER BY table_name;
```

Các cột mà `stg_orders` dùng từ bảng raw: `amount` vào, `_fivetran_deleted` dùng để lọc.

```sql
SELECT table_name, column_name
FROM information_schema
  .view_column_usage
WHERE view_name = 'stg_orders'
ORDER BY column_name;
```

Mô tả của cột, ghi vào database như dbt làm khi bật lưu docs:

```sql
SELECT col_description(
  'marts.fct_orders'::regclass, 4)
  AS amount_vnd_doc;
```

## Lỗi hay gặp

Chỉ nhìn cha trực tiếp: thấy hai model staging và tưởng đó là nguồn.

```sql
-- WRONG: one hop only
SELECT table_schema, table_name
FROM information_schema
  .view_table_usage
WHERE view_schema = 'marts'
  AND view_name = 'fct_orders';
```

```sql
-- FIX: walk up to the raw tables
WITH RECURSIVE up AS (
  SELECT table_schema AS s,
    table_name AS t, 1 AS hop
  FROM information_schema
    .view_table_usage
  WHERE view_schema = 'marts'
    AND view_name = 'fct_orders'
  UNION ALL
  SELECT u.table_schema,
    u.table_name, up.hop + 1
  FROM information_schema
    .view_table_usage u
  JOIN up ON u.view_schema = up.s
    AND u.view_name = up.t)
SELECT DISTINCT s, t, hop FROM up
ORDER BY hop, s, t;
```

Tìm model phụ thuộc bằng tên giống nhau: ra cả bảng raw, và sót `revenue_by_tier`.

```sql
-- WRONG: guessing by name
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name LIKE '%orders%'
ORDER BY 1, 2;
```

```sql
-- FIX: who really reads fct_orders
SELECT view_schema, view_name
FROM information_schema
  .view_table_usage
WHERE table_schema = 'marts'
  AND table_name = 'fct_orders';
```

## Thực hành

Ba bước đọc lineage từ catalog: cha trực tiếp của evenue_by_tier, các bảng raw ở gốc của nó, rồi mọi view đứng sau stg_customers, tức những gì hỏng nếu model đó đổi.

## Tóm tắt

- Lineage dựng từ `ref()` và `source()`: đi ngược tới raw, đi xuôi tới người đọc.
- Lần một cột là đọc SQL ở từng bước, không đoán theo tên.
- `description` ghi nghĩa của model và cột; exposure ghi dashboard nào dùng mart nào.
- Trong Postgres, `information_schema.view_table_usage` cho lineage giữa các view.

# EN

## Opening

Lantern Market's accountant asks: does the dashboard's `amount_vnd` column include deleted orders? You do not guess: you trace that column back to the raw table and read each step.

## Key idea

**Lineage** is the graph of "which model reads what". dbt builds it from the `ref()` and `source()` calls themselves, and the docs site draws it: pick a mart and walk up through each model to the raw table. Tracing a **column** means reading the SQL at each step: in staging, the text `amount` loses its commas, is cast to a number and deleted orders are dropped; in the mart the column is only passed through.

Docs are the words that travel with a model: each model and column has a `description` in YAML, which can also be written into the database as a comment. An **exposure** declares who uses the data (a dashboard, a notebook) and which marts it depends on, so lineage can run downstream all the way to the person reading the number.

In Postgres the lineage between views already sits in the catalog: `information_schema.view_table_usage` says which view reads which table, and `view_column_usage` which columns it uses. The figure at the end of this section traces the `amount_vnd` column from raw to the dashboard.

## Syntax

```text
# models/marts/schema.yml
models:
  - name: fct_orders
    description: One row per order.
    columns:
      - name: amount_vnd
        description: Total in VND.
exposures:
  - name: revenue_by_tier
    type: dashboard
    owner: {name: Data team}
    depends_on:
      - ref('revenue_by_tier')
```

```sql
SELECT table_schema, table_name
FROM information_schema
  .view_table_usage
WHERE view_name = 'fct_orders';
```

- An exposure's `type`: `dashboard`, `notebook`, `analysis`, `ml`, `application`.
- Downstream lineage (who reads me) matters as much as upstream (whom I read).

## Example

The direct parents of the mart `fct_orders`:

```sql
SELECT table_schema, table_name
FROM information_schema
  .view_table_usage
WHERE view_schema = 'marts'
  AND view_name = 'fct_orders'
ORDER BY table_name;
```

The columns `stg_orders` uses from the raw table: `amount` goes in, `_fivetran_deleted` is used to filter.

```sql
SELECT table_name, column_name
FROM information_schema
  .view_column_usage
WHERE view_name = 'stg_orders'
ORDER BY column_name;
```

The column's description, written into the database as dbt does when docs are persisted:

```sql
SELECT col_description(
  'marts.fct_orders'::regclass, 4)
  AS amount_vnd_doc;
```

## Common mistakes

Looking only at the direct parents: you see two staging models and take them for the source.

```sql
-- WRONG: one hop only
SELECT table_schema, table_name
FROM information_schema
  .view_table_usage
WHERE view_schema = 'marts'
  AND view_name = 'fct_orders';
```

```sql
-- FIX: walk up to the raw tables
WITH RECURSIVE up AS (
  SELECT table_schema AS s,
    table_name AS t, 1 AS hop
  FROM information_schema
    .view_table_usage
  WHERE view_schema = 'marts'
    AND view_name = 'fct_orders'
  UNION ALL
  SELECT u.table_schema,
    u.table_name, up.hop + 1
  FROM information_schema
    .view_table_usage u
  JOIN up ON u.view_schema = up.s
    AND u.view_name = up.t)
SELECT DISTINCT s, t, hop FROM up
ORDER BY hop, s, t;
```

Finding dependent models by a similar name: it returns the raw table too, and misses `revenue_by_tier`.

```sql
-- WRONG: guessing by name
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name LIKE '%orders%'
ORDER BY 1, 2;
```

```sql
-- FIX: who really reads fct_orders
SELECT view_schema, view_name
FROM information_schema
  .view_table_usage
WHERE table_schema = 'marts'
  AND table_name = 'fct_orders';
```

## Practice

Three steps reading lineage from the catalog: the direct parents of evenue_by_tier, the raw tables at its root, then every view downstream of stg_customers, that is, what breaks if that model changes.

## Recap

- Lineage is built from `ref()` and `source()`: upstream to raw, downstream to the reader.
- Tracing a column means reading the SQL at each step, not guessing from names.
- A `description` records what a model and column mean; an exposure records which dashboard uses which mart.
- In Postgres, `information_schema.view_table_usage` gives the lineage between views.
