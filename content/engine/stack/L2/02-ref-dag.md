---
id: e-st-l2-02
engine: stack
level: L2
module: dbt
title: ref() và đồ thị phụ thuộc
title_en: ref() and the dependency graph
kind: lab
runtime: browser
minutes: 25
figures: [{ name: st-dag, at: idea }]
objectives:
  - vi: Dựng ba model theo đúng thứ tự phụ thuộc, từ staging tới mart.
    en: Build three models in dependency order, from staging to a mart.
  - vi: Đọc một đồ thị phụ thuộc (DAG) và nói model nào phải chạy trước.
    en: Read a dependency graph (DAG) and say which model must run first.
  - vi: Nhận ra hai lỗi của DAG, ref tới model không có và vòng lặp, trước khi chạy.
    en: Recognise the two DAG errors, a ref to a missing model and a cycle, before running.
requires: [e-st-l2-01]
sources:
  - { url: "https://docs.getdbt.com/reference/dbt-jinja-functions/ref", title: "dbt docs: ref", title_vi: "Tài liệu dbt: ref" }
  - { url: "https://docs.getdbt.com/docs/build/models", title: "dbt docs: About dbt models", title_vi: "Tài liệu dbt: model trong dbt" }
  - { url: https://www.postgresql.org/docs/18/infoschema-view-table-usage.html, title_vi: "information_schema.view_table_usage" }
lab:
  setup: |
    CREATE SCHEMA raw_shop;
    CREATE TABLE raw_shop.orders (
      id int, customer int, status text,
      amount_vnd int, created_at timestamp,
      _fivetran_deleted boolean
    );
    INSERT INTO raw_shop.orders VALUES
      (1, 11, 'paid', 250000, '2026-10-30 09:12', false),
      (2, 12, 'paid', 120000, '2026-10-30 14:40', false),
      (3, 13, 'cancelled', 90000, '2026-10-30 16:05', false),
      (4, 11, 'paid', 300000, '2026-10-31 08:30', true),
      (5, 14, 'paid', 60000, '2026-10-31 10:02', false),
      (6, 13, 'paid', 180000, '2026-10-31 11:20', false);
    CREATE TABLE raw_shop.customers (
      id int, name text, tier text,
      _fivetran_deleted boolean
    );
    INSERT INTO raw_shop.customers VALUES
      (11, 'Lan Silk', 'GOLD', false),
      (12, 'Minh Tea', 'basic', false),
      (13, 'Hoa Lamp', 'Gold', false),
      (14, 'An Wood', 'basic', false);
  steps:
    - task:
        vi: "Model `stg_orders` (staging, view) từ nguồn `shop`, bảng `orders`: trả `order_id`, `customer_id`, `status`, `amount_vnd`, `order_date` (ngày của `created_at`), bỏ dòng đã xóa ở nguồn. Lab chấm bằng cách đọc lại `staging.stg_orders` sau khi dựng."
        en: "Model `stg_orders` (staging, a view) from source `shop`, table `orders`: return `order_id`, `customer_id`, `status`, `amount_vnd`, `order_date` (the date of `created_at`), leaving out rows deleted at the source. The lab grades it by reading `staging.stg_orders` back after the build."
      model: { name: stg_orders, layer: staging }
      solution: |
        select id as order_id,
          customer as customer_id,
          status, amount_vnd,
          created_at::date as order_date
        from {{ source('shop', 'orders') }}
        where not _fivetran_deleted
      after: SELECT * FROM staging.stg_orders ORDER BY order_id
      check: rows
      ordered: true
      hint:
        vi: "Như bài trước: `from {{ source('shop', 'orders') }}` và `where not _fivetran_deleted`."
        en: "As in the previous lesson: `from {{ source('shop', 'orders') }}` and `where not _fivetran_deleted`."
    - task:
        vi: "Model `stg_customers` (staging, view) từ nguồn `shop`, bảng `customers`: trả `customer_id` (cột `id`), `name`, `tier` viết thường, bỏ dòng đã xóa. Lab chấm bằng cách đọc lại `staging.stg_customers` sau khi dựng."
        en: "Model `stg_customers` (staging, a view) from source `shop`, table `customers`: return `customer_id` (column `id`), `name`, `tier` in lower case, leaving out deleted rows. The lab grades it by reading `staging.stg_customers` back after the build."
      model: { name: stg_customers, layer: staging }
      solution: |
        select id as customer_id, name,
          lower(tier) as tier
        from {{ source('shop', 'customers') }}
        where not _fivetran_deleted
      after: SELECT * FROM staging.stg_customers ORDER BY customer_id
      check: rows
      ordered: true
      hint:
        vi: "`lower(tier) as tier` vì nguồn viết lẫn `GOLD` và `Gold`."
        en: "`lower(tier) as tier` because the source mixes `GOLD` and `Gold`."
    - task:
        vi: "Model `fct_orders` (marts, bảng) ghép hai model staging bằng `ref()`: mỗi đơn một dòng, trả `order_id`, `order_date`, `customer_id`, `tier`, `status`, `amount_vnd`. Lab chấm bằng cách đọc lại `marts.fct_orders` sau khi dựng."
        en: "Model `fct_orders` (marts, a table) joins the two staging models with `ref()`: one row per order, returning `order_id`, `order_date`, `customer_id`, `tier`, `status`, `amount_vnd`. The lab grades it by reading `marts.fct_orders` back after the build."
      model: { name: fct_orders, layer: marts, materialized: table }
      solution: |
        {{ config(materialized='table') }}
        select o.order_id, o.order_date,
          o.customer_id, c.tier,
          o.status, o.amount_vnd
        from {{ ref('stg_orders') }} o
        join {{ ref('stg_customers') }} c
          on c.customer_id = o.customer_id
      after: SELECT * FROM marts.fct_orders ORDER BY order_id
      check: rows
      ordered: true
      hint:
        vi: "`{{ config(materialized='table') }}` ở dòng đầu, rồi `join {{ ref('stg_customers') }} c on c.customer_id = o.customer_id`."
        en: "`{{ config(materialized='table') }}` on the first line, then `join {{ ref('stg_customers') }} c on c.customer_id = o.customer_id`."
    - task:
        vi: "Từ mart `fct_orders` (qua `ref()`), doanh thu các đơn `paid` theo hạng khách: trả `tier`, `revenue_vnd`, xếp theo `tier` tăng dần."
        en: "From the mart `fct_orders` (through `ref()`), revenue of `paid` orders by customer tier: return `tier`, `revenue_vnd`, sorted by `tier` ascending."
      solution: |
        select tier,
          sum(amount_vnd) as revenue_vnd
        from {{ ref('fct_orders') }}
        where status = 'paid'
        group by tier
        order by tier
      check: rows
      ordered: true
      hint:
        vi: "`from {{ ref('fct_orders') }}`, lọc `status = 'paid'`, `group by tier`."
        en: "`from {{ ref('fct_orders') }}`, filter `status = 'paid'`, `group by tier`."
quiz:
  - q:
      vi: "`fct_orders` dùng `ref('stg_orders')` và `ref('stg_customers')`. Thứ tự chạy nào đúng?"
      en: "`fct_orders` uses `ref('stg_orders')` and `ref('stg_customers')`. Which run order is right?"
    options:
      - { vi: "Hai model staging trước, theo bất kỳ thứ tự nào, rồi tới `fct_orders`", en: "Both staging models first, in any order, then `fct_orders`" }
      - { vi: "Theo bảng chữ cái của tên file", en: "Alphabetical order of the file names" }
      - { vi: "`fct_orders` trước, vì mart là thứ người dùng cần", en: "`fct_orders` first, since the mart is what users need" }
    answer: 0
    trap: 1
    why:
      vi: "Thứ tự chữ cái sẽ đặt f trước s, tức là sai ở đây. Thứ tự chạy đến từ đồ thị phụ thuộc: một model chạy sau mọi model nó `ref()`. Hai model staging không phụ thuộc nhau nên chạy song song được."
      en: "Alphabetical order would put f before s, which is wrong here. The run order comes from the dependency graph: a model runs after every model it `ref()`s. The two staging models do not depend on each other, so they can run in parallel."
  - q:
      vi: "Model A `ref('B')` và model B `ref('A')`. Chuyện gì xảy ra?"
      en: "Model A does `ref('B')` and model B does `ref('A')`. What happens?"
    options:
      - { vi: "Hai model chạy lần lượt rồi ổn định sau hai vòng", en: "Both run in turn and settle after two rounds" }
      - { vi: "Công cụ báo vòng lặp và không chạy model nào", en: "The tool reports a cycle and runs neither model" }
      - { vi: "Model nào có tên đứng trước sẽ chạy trước", en: "Whichever model sorts first runs first" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe như một vòng lặp sẽ \"hội tụ\", nhưng đồ thị phụ thuộc phải không có vòng: không model nào chạy trước được vì mỗi cái cần cái kia. Công cụ dừng khi dựng đồ thị (ở đây là lỗi `ref-cycle`)."
      en: "It sounds like a loop that would \"converge\", but the dependency graph must have no cycle: neither model can run first, because each needs the other. The tool stops while building the graph (here the error `ref-cycle`)."
---
## Mở bài

Mart doanh thu theo hạng khách ở Chợ Lồng Đèn cần hai model staging chạy xong trước nó. Bài này để `ref()` tự sắp thứ tự đó, và đọc đồ thị phụ thuộc mà nó tạo ra.

## Ý chính

Mỗi `{{ ref('m') }}` trong một model là một **cạnh** của đồ thị: model `m` phải được dựng trước model đang viết. Gom mọi cạnh lại, ta có một **DAG** (đồ thị có hướng, không vòng). Công cụ sắp các model theo phụ thuộc trong DAG đó để ra thứ tự chạy: model không phụ thuộc ai chạy trước, mart chạy sau cùng. Model không phụ thuộc nhau có thể chạy song song.

DAG có hai lỗi. **Ref tới model không có** (gõ sai tên, hay model chưa được viết): ở đây là `ref-missing`. **Vòng lặp** (A cần B, B cần A, hay một model `ref` chính nó): ở đây là `ref-cycle`; model muốn đọc chính nó thì dùng `{{ this }}`. Cả hai bị bắt khi dịch, trước khi một câu SQL nào chạy.

Postgres cũng tự ghi phụ thuộc: một view nhớ nó đọc bảng nào (`information_schema.view_table_usage`), và từ chối xóa một view khi view khác còn đọc nó. Đồ thị của dbt nằm ở tầng trên: nó biết cả các model là bảng, và biết trước khi dựng gì.

Hình cuối mục là DAG của chính lab này.

## Cú pháp

```text
-- models/marts/fct_orders.sql
{{ config(materialized='table') }}
select ...
from {{ ref('stg_orders') }} o
join {{ ref('stg_customers') }} c
  on c.customer_id = o.customer_id
```

- Mỗi `ref()` là một cạnh: model kia chạy trước.
- Thứ tự viết các bước không quan trọng với công cụ; đồ thị mới quan trọng.
- `ref-missing`, `ref-cycle`: lỗi dựng đồ thị, báo trước khi chạy.

## Ví dụ

Câu đã dịch của ba model, theo thứ tự đồ thị (staging trước, mart sau):

```sql
CREATE SCHEMA staging;
CREATE SCHEMA marts;
CREATE VIEW staging.stg_orders AS
SELECT id AS order_id,
  customer AS customer_id,
  status, amount_vnd
FROM raw_shop.orders
WHERE NOT _fivetran_deleted;
CREATE VIEW staging.stg_customers AS
SELECT id AS customer_id,
  lower(tier) AS tier
FROM raw_shop.customers;
CREATE VIEW marts.fct_orders AS
SELECT o.order_id, c.tier,
  o.status, o.amount_vnd
FROM staging.stg_orders o
JOIN staging.stg_customers c
  ON c.customer_id = o.customer_id;
SELECT * FROM marts.fct_orders
ORDER BY order_id;
```

Postgres cũng thấy các cạnh đó trong catalog của nó:

```sql
SELECT view_name AS model,
  table_schema || '.' || table_name
    AS reads
FROM information_schema
  .view_table_usage
WHERE view_schema
  IN ('staging', 'marts')
ORDER BY 1, 2;
```

## Lỗi hay gặp

Dựng mart trước staging: thứ nó đọc chưa tồn tại.

```sql
-- ERROR 42P01
CREATE VIEW marts.fct_daily AS
SELECT order_id
FROM staging.stg_payments;
```

Xóa một model mà model khác còn đọc:

```sql
-- ERROR 2BP01
DROP VIEW staging.stg_orders;
```

## Thực hành

Ba model theo đúng thứ tự (hai staging, một mart là bảng), rồi một câu đọc mart bằng `ref()`. Mỗi bước model được chấm bằng cách đọc lại thứ nó vừa dựng.

## Tóm tắt

- Mỗi `ref()` là một cạnh; các cạnh tạo thành một DAG.
- Thứ tự chạy = sắp theo phụ thuộc trong DAG; model độc lập chạy song song được.
- `ref-missing` và `ref-cycle` bị bắt khi dịch, trước khi chạy.
- Đọc chính mình thì dùng `{{ this }}`, không `ref()`.

# EN

## Opening

Lantern Market's revenue-by-tier mart needs two staging models to finish before it. This lesson lets `ref()` work out that order, and reads the dependency graph it creates.

## Key idea

Every `{{ ref('m') }}` in a model is an **edge** of a graph: model `m` must be built before the model being written. Put all the edges together and you have a **DAG** (a directed graph with no cycle). The tool sorts that DAG topologically to get the run order: models that depend on nothing run first, marts run last. Models that do not depend on each other can run in parallel.

A DAG has two errors. **A ref to a missing model** (a typo, or a model not written yet): here `ref-missing`. **A cycle** (A needs B, B needs A, or a model that `ref`s itself): here `ref-cycle`; a model that wants to read itself uses `{{ this }}`. Both are caught at compile time, before any SQL runs.

Postgres records dependencies too: a view remembers which tables it reads (`information_schema.view_table_usage`), and refuses to drop a view while another view still reads it. dbt's graph sits one level up: it also knows the models that are tables, and it knows before building anything.

The figure at the end of this section is this lab's own DAG.

## Syntax

```text
-- models/marts/fct_orders.sql
{{ config(materialized='table') }}
select ...
from {{ ref('stg_orders') }} o
join {{ ref('stg_customers') }} c
  on c.customer_id = o.customer_id
```

- Each `ref()` is an edge: the other model runs first.
- The order you write the steps in does not matter to the tool; the graph does.
- `ref-missing`, `ref-cycle`: graph errors, reported before running.

## Example

The compiled queries of the three models, in graph order (staging first, mart last):

```sql
CREATE SCHEMA staging;
CREATE SCHEMA marts;
CREATE VIEW staging.stg_orders AS
SELECT id AS order_id,
  customer AS customer_id,
  status, amount_vnd
FROM raw_shop.orders
WHERE NOT _fivetran_deleted;
CREATE VIEW staging.stg_customers AS
SELECT id AS customer_id,
  lower(tier) AS tier
FROM raw_shop.customers;
CREATE VIEW marts.fct_orders AS
SELECT o.order_id, c.tier,
  o.status, o.amount_vnd
FROM staging.stg_orders o
JOIN staging.stg_customers c
  ON c.customer_id = o.customer_id;
SELECT * FROM marts.fct_orders
ORDER BY order_id;
```

Postgres sees those edges in its own catalog too:

```sql
SELECT view_name AS model,
  table_schema || '.' || table_name
    AS reads
FROM information_schema
  .view_table_usage
WHERE view_schema
  IN ('staging', 'marts')
ORDER BY 1, 2;
```

## Common mistakes

Building the mart before staging: what it reads does not exist yet.

```sql
-- ERROR 42P01
CREATE VIEW marts.fct_daily AS
SELECT order_id
FROM staging.stg_payments;
```

Dropping a model another model still reads:

```sql
-- ERROR 2BP01
DROP VIEW staging.stg_orders;
```

## Practice

Three models in the right order (two staging views, one mart table), then a query that reads the mart with `ref()`. Each model step is graded by reading back what it just built.

## Recap

- Each `ref()` is an edge; the edges form a DAG.
- Run order = a topological sort of the DAG; independent models can run in parallel.
- `ref-missing` and `ref-cycle` are caught at compile time, before running.
- To read itself a model uses `{{ this }}`, not `ref()`.
