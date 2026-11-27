---
id: e-st-l2-01
engine: stack
level: L2
module: dbt
title: Một model là một câu SELECT
title_en: A model is a SELECT
kind: lab
runtime: browser
minutes: 25
figures: [{ name: st-model-compile, at: idea }]
objectives:
  - vi: "Viết một model staging kiểu dbt từ `source()`: đổi tên, ép kiểu, bỏ dòng đã xóa."
    en: "Write a dbt-style staging model from `source()`: rename, cast, drop deleted rows."
  - vi: Biết `source()` và `ref()` được dịch thành tên bảng thật nào.
    en: Know which real table names `source()` and `ref()` compile to.
  - vi: Đọc một model khác bằng `ref()` thay vì gõ tên bảng.
    en: Read another model with `ref()` instead of typing a table name.
requires: [e-st-l1-02]
sources:
  - { url: "https://docs.getdbt.com/docs/build/models", title: "dbt docs: About dbt models", title_vi: "Tài liệu dbt: model trong dbt" }
  - { url: "https://docs.getdbt.com/reference/dbt-jinja-functions/source", title: "dbt docs: source", title_vi: "Tài liệu dbt: source" }
  - { url: "https://docs.getdbt.com/reference/dbt-jinja-functions/ref", title: "dbt docs: ref", title_vi: "Tài liệu dbt: ref" }
  - { url: "https://docs.getdbt.com/docs/build/materializations", title: "dbt docs: Materializations", title_vi: "Tài liệu dbt: materialization" }
lab:
  setup: |
    CREATE SCHEMA raw_shop;
    CREATE SCHEMA raw_mkt;
    CREATE TABLE raw_shop.orders (
      id int, customer int, status text,
      amount_vnd int, created_at timestamp,
      _fivetran_synced timestamp,
      _fivetran_deleted boolean
    );
    INSERT INTO raw_shop.orders VALUES
      (1, 11, 'PAID', 250000, '2026-10-30 09:12', '2026-10-30 23:00', false),
      (2, 12, 'paid', 120000, '2026-10-30 14:40', '2026-10-30 23:00', false),
      (3, 13, 'Cancelled', 90000, '2026-10-30 16:05', '2026-10-30 23:00', false),
      (4, 11, 'paid', 300000, '2026-10-31 08:30', '2026-10-31 11:00', true),
      (5, 14, 'Paid', 60000, '2026-10-31 10:02', '2026-10-31 11:00', false);
    CREATE TABLE raw_mkt.spend (
      day text, channel text, cost text
    );
    INSERT INTO raw_mkt.spend VALUES
      ('2026-10-30', 'Facebook', '1,200,000'),
      ('2026-10-30', 'zalo', '800,000'),
      ('2026-10-31', 'Facebook', '950,000');
  steps:
    - task:
        vi: "Viết model `stg_orders` (tầng staging, view) từ nguồn `shop`, bảng `orders`. Trả theo thứ tự: `order_id` (cột `id`), `customer_id` (cột `customer`), `status` viết thường, `amount_vnd`, `order_date` (ngày của `created_at`). Bỏ dòng đã xóa ở nguồn. Lab chấm bằng cách đọc lại `staging.stg_orders` sau khi dựng."
        en: "Write model `stg_orders` (staging layer, a view) from source `shop`, table `orders`. Return in this order: `order_id` (column `id`), `customer_id` (column `customer`), `status` in lower case, `amount_vnd`, `order_date` (the date of `created_at`). Leave out rows deleted at the source. The lab grades it by reading `staging.stg_orders` back after the build."
      model: { name: stg_orders, layer: staging, materialized: view }
      solution: |
        select
          id as order_id,
          customer as customer_id,
          lower(status) as status,
          amount_vnd,
          created_at::date as order_date
        from {{ source('shop', 'orders') }}
        where not _fivetran_deleted
      after: SELECT * FROM staging.stg_orders ORDER BY order_id
      check: rows
      ordered: true
      hint:
        vi: "`from {{ source('shop', 'orders') }}`; đổi tên bằng `as`, `lower(status)`, `created_at::date`, và `where not _fivetran_deleted`."
        en: "`from {{ source('shop', 'orders') }}`; rename with `as`, `lower(status)`, `created_at::date`, and `where not _fivetran_deleted`."
    - task:
        vi: "Viết model `stg_spend` (staging, view) từ nguồn `mkt`, bảng `spend` (một bảng tính, mọi cột là chữ). Trả: `spend_date` (ngày), `channel` viết thường, `cost_vnd` (số nguyên, bỏ dấu phẩy). Lab chấm bằng cách đọc lại `staging.stg_spend` sau khi dựng."
        en: "Write model `stg_spend` (staging, a view) from source `mkt`, table `spend` (a spreadsheet, every column is text). Return: `spend_date` (a date), `channel` in lower case, `cost_vnd` (an integer, commas removed). The lab grades it by reading `staging.stg_spend` back after the build."
      model: { name: stg_spend, layer: staging, materialized: view }
      solution: |
        select
          day::date as spend_date,
          lower(channel) as channel,
          replace(cost, ',', '')::int
            as cost_vnd
        from {{ source('mkt', 'spend') }}
      after: SELECT * FROM staging.stg_spend ORDER BY spend_date, channel
      check: rows
      ordered: true
      hint:
        vi: "`replace(cost, ',', '')::int` bỏ dấu phẩy rồi ép số; `day::date` ép ngày."
        en: "`replace(cost, ',', '')::int` removes the commas, then casts; `day::date` casts the date."
    - task:
        vi: "Đọc model `stg_orders` bằng `ref()`: doanh thu các đơn `paid` theo `order_date`, trả `order_date`, `revenue_vnd`, xếp theo ngày tăng dần."
        en: "Read model `stg_orders` with `ref()`: revenue of `paid` orders by `order_date`, returning `order_date`, `revenue_vnd`, sorted by date ascending."
      solution: |
        select order_date,
          sum(amount_vnd) as revenue_vnd
        from {{ ref('stg_orders') }}
        where status = 'paid'
        group by order_date
        order by order_date
      check: rows
      ordered: true
      hint:
        vi: "`from {{ ref('stg_orders') }}`: status đã viết thường ở staging, nên `where status = 'paid'` là đủ."
        en: "`from {{ ref('stg_orders') }}`: status is already lower case in staging, so `where status = 'paid'` is enough."
quiz:
  - q:
      vi: "Một model kiểu dbt là gì?"
      en: "What is a dbt-style model?"
    options:
      - { vi: "Một câu SELECT; công cụ tự bọc nó thành view hay bảng", en: "A SELECT; the tool wraps it into a view or table" }
      - { vi: "Một bảng bạn tự tạo bằng CREATE TABLE", en: "A table you create yourself with CREATE TABLE" }
      - { vi: "Một biểu đồ trên dashboard có tên riêng", en: "A named chart on the dashboard" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe giống vì kết quả cuối cùng là một bảng hay view, nhưng bạn không viết DDL: bạn chỉ viết SELECT, còn `config` (mặc định là view) quyết định công cụ dựng nó thành gì."
      en: "It sounds close because the end result is a table or view, but you do not write the DDL: you only write the SELECT, and `config` (a view by default) decides what the tool builds."
  - q:
      vi: "Vì sao model `stg_orders` viết `{{ source('shop', 'orders') }}` thay vì gõ thẳng `raw_shop.orders`?"
      en: "Why does model `stg_orders` write `{{ source('shop', 'orders') }}` instead of typing `raw_shop.orders`?"
    options:
      - { vi: "Vì câu chạy nhanh hơn khi dùng source()", en: "Because the query runs faster with source()" }
      - { vi: "Vì công cụ biết model đọc nguồn nào, để vẽ lineage", en: "Because the tool learns which source it reads, for lineage" }
      - { vi: "Vì Postgres không cho gõ tên schema trong view", en: "Because Postgres forbids schema names in views" }
    answer: 1
    trap: 0
    why:
      vi: "Câu đã dịch giống hệt câu gõ tay, nên không nhanh hơn. Lợi ích là phụ thuộc: công cụ ghi lại model này đọc nguồn nào, để dựng thứ tự chạy, kiểm tra độ tươi của nguồn và vẽ lineage."
      en: "The compiled query is identical to the hand-typed one, so it is not faster. The gain is the dependency: the tool records which source this model reads, to order the runs, check source freshness and draw lineage."
---
## Mở bài

Ở Chợ Lồng Đèn, bảng raw không ai đọc trực tiếp: mỗi nguồn có một model staging làm sạch nó. Bài này viết model đầu tiên, và cho thấy một model thật ra chỉ là một câu SELECT.

## Ý chính

Trong dbt, một **model** là một file `.sql` chứa đúng một câu `SELECT`. Bạn không viết `CREATE`: công cụ đọc `config` (mặc định là view) rồi tự bọc câu đó thành `CREATE VIEW` hay `CREATE TABLE AS`. Tên file là tên model; thư mục (staging, intermediate, marts) là tầng của nó.

Thay cho tên bảng, model dùng hai hàm Jinja. `{{ source('shop', 'orders') }}` trỏ tới một bảng raw do công cụ nạp tạo; `{{ ref('stg_orders') }}` trỏ tới một model khác. Khi dịch, cả hai thành tên thật, và công cụ ghi lại ai đọc ai: đó là cách nó biết thứ tự chạy và vẽ lineage.

Một model staging làm sạch đúng **một** nguồn: đổi tên cột cho rõ, ép kiểu (bảng tính cho mọi thứ là chữ), viết thường các giá trị trạng thái, bỏ dòng đã xóa ở nguồn. Nó không ghép nguồn, không gom số: việc đó của tầng sau.

Ở đây BoonData tự dịch Jinja: `source('s', 't')` thành `raw_s.t`, `ref('m')` thành `<layer>.m` (layer là tầng của model). Đây là mô phỏng kiểu dbt, không phải dbt; cú pháp lạ khác bị báo lỗi `jinja-unsupported` kèm dòng và cột. Hình cuối mục đi từ file model tới view được tạo.

## Cú pháp

```text
-- models/staging/stg_orders.sql
{{ config(materialized='view') }}
select id as order_id, ...
from {{ source('shop', 'orders') }}
where not _fivetran_deleted
-- another model reads it
from {{ ref('stg_orders') }}
```

- `source('shop', 'orders')` thành `raw_shop.orders`.
- `ref('stg_orders')` thành `staging.stg_orders`.
- Không có `config`: model là một view.

## Ví dụ

File model như bạn viết (Jinja, chỉ để đọc):

```text
select
  id as order_id,
  lower(status) as status,
  amount_vnd
from {{ source('shop', 'orders') }}
where not _fivetran_deleted
```

Câu mà công cụ dịch ra và chạy:

```sql
CREATE SCHEMA staging;
CREATE VIEW staging.stg_orders AS
SELECT id AS order_id,
  lower(status) AS status,
  amount_vnd
FROM raw_shop.orders
WHERE NOT _fivetran_deleted;
SELECT * FROM staging.stg_orders
ORDER BY order_id;
```

Model sau đọc model trước như một bảng thường:

```sql
SELECT status, count(*) AS orders
FROM staging.stg_orders
GROUP BY status
ORDER BY status;
```

## Lỗi hay gặp

Ép kiểu chữ của bảng tính mà chưa bỏ dấu phẩy:

```sql
-- ERROR 22P02
SELECT cost::int AS cost_vnd
FROM raw_mkt.spend;
```

Model staging quên bỏ dòng đã xóa ở nguồn: mọi model phía sau đếm thừa.

```sql
-- WRONG: deleted order 4 included
SELECT count(*) AS orders
FROM raw_shop.orders;
```

```sql
-- FIX: the staging filter
SELECT count(*) AS orders
FROM raw_shop.orders
WHERE NOT _fivetran_deleted;
```

## Thực hành

Hai model staging, một cho đơn hàng, một cho chi phí quảng cáo, rồi một câu đọc model đơn hàng bằng `ref()`. Bước model được chấm bằng cách đọc lại view vừa dựng.

## Tóm tắt

- Model = một câu `SELECT`; công cụ bọc nó thành view hay bảng theo `config`.
- `source()` trỏ tới bảng raw, `ref()` trỏ tới model khác; cả hai ghi lại phụ thuộc.
- Staging làm sạch đúng một nguồn: đổi tên, ép kiểu, viết thường, bỏ dòng đã xóa.
- Ở đây Jinja được BoonData dịch (mô phỏng); cú pháp lạ báo `jinja-unsupported`.

# EN

## Opening

At Lantern Market nobody reads raw tables directly: each source has a staging model that cleans it. This lesson writes the first model and shows that a model is really just a SELECT.

## Key idea

In dbt a **model** is a `.sql` file holding exactly one `SELECT`. You do not write `CREATE`: the tool reads `config` (a view by default) and wraps the query into `CREATE VIEW` or `CREATE TABLE AS` itself. The file name is the model's name; the folder (staging, intermediate, marts) is its layer.

Instead of table names, a model uses two Jinja functions. `{{ source('shop', 'orders') }}` points at a raw table the ingestion tool created; `{{ ref('stg_orders') }}` points at another model. When compiled, both become real names, and the tool records who reads whom: that is how it knows the run order and draws lineage.

A staging model cleans exactly **one** source: clearer column names, casts (a spreadsheet makes everything text), lower-case status values, rows deleted at the source dropped. It does not join sources or aggregate numbers: that is the next layers' job.

Here BoonData resolves the Jinja itself: `source('s', 't')` becomes `raw_s.t`, `ref('m')` becomes `<layer>.m`. This is a dbt-style simulation, not dbt; any other syntax is reported as `jinja-unsupported` with its line and column. The figure at the end of this section goes from the model file to the view it creates.

## Syntax

```text
-- models/staging/stg_orders.sql
{{ config(materialized='view') }}
select id as order_id, ...
from {{ source('shop', 'orders') }}
where not _fivetran_deleted
-- another model reads it
from {{ ref('stg_orders') }}
```

- `source('shop', 'orders')` becomes `raw_shop.orders`.
- `ref('stg_orders')` becomes `staging.stg_orders`.
- No `config`: the model is a view.

## Example

The model file as you write it (Jinja, read only):

```text
select
  id as order_id,
  lower(status) as status,
  amount_vnd
from {{ source('shop', 'orders') }}
where not _fivetran_deleted
```

The query the tool compiles and runs:

```sql
CREATE SCHEMA staging;
CREATE VIEW staging.stg_orders AS
SELECT id AS order_id,
  lower(status) AS status,
  amount_vnd
FROM raw_shop.orders
WHERE NOT _fivetran_deleted;
SELECT * FROM staging.stg_orders
ORDER BY order_id;
```

A later model reads the earlier one like a plain table:

```sql
SELECT status, count(*) AS orders
FROM staging.stg_orders
GROUP BY status
ORDER BY status;
```

## Common mistakes

Casting the spreadsheet's text before removing the commas:

```sql
-- ERROR 22P02
SELECT cost::int AS cost_vnd
FROM raw_mkt.spend;
```

A staging model that forgets to drop rows deleted at the source: every model after it over-counts.

```sql
-- WRONG: deleted order 4 included
SELECT count(*) AS orders
FROM raw_shop.orders;
```

```sql
-- FIX: the staging filter
SELECT count(*) AS orders
FROM raw_shop.orders
WHERE NOT _fivetran_deleted;
```

## Practice

Two staging models, one for orders and one for marketing spend, then a query that reads the orders model with `ref()`. A model step is graded by reading back the view it built.

## Recap

- A model = one `SELECT`; the tool wraps it into a view or table according to `config`.
- `source()` points at a raw table, `ref()` at another model; both record a dependency.
- Staging cleans exactly one source: rename, cast, lower-case, drop deleted rows.
- Here the Jinja is resolved by BoonData (a simulation); unknown syntax reports `jinja-unsupported`.
