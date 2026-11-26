---
id: e-st-l2-03
engine: stack
level: L2
module: dbt
title: View, table hay incremental
title_en: View, table or incremental
kind: lab
runtime: browser
minutes: 30
figures: [{ name: st-incremental, at: idea }]
objectives:
  - vi: Chọn view, table hay incremental cho một model và nói cái giá của từng cách.
    en: Choose view, table or incremental for a model and say what each one costs.
  - vi: Viết một model incremental với `is_incremental()`, `{{ this }}` và `unique_key`, rồi chạy nó hai lần.
    en: Write an incremental model with `is_incremental()`, `{{ this }}` and `unique_key`, then run it twice.
  - vi: Tránh bộ lọc incremental làm rơi dòng về trễ.
    en: Avoid an incremental filter that drops late rows.
requires: [e-st-l2-02]
sources:
  - { url: "https://docs.getdbt.com/docs/build/materializations", title: "dbt docs: Materializations" }
  - { url: "https://docs.getdbt.com/docs/build/incremental-models", title: "dbt docs: Configure incremental models" }
  - https://www.postgresql.org/docs/18/queries-with.html#QUERIES-WITH-MODIFYING
lab:
  setup: |
    CREATE SCHEMA raw_shop;
    CREATE TABLE raw_shop.orders (
      order_id int PRIMARY KEY,
      status text, amount_vnd int,
      order_date date,
      _fivetran_synced timestamp
    );
    INSERT INTO raw_shop.orders VALUES
      (1, 'paid', 250000, '2026-10-30', '2026-10-30 23:00'),
      (2, 'paid', 120000, '2026-10-30', '2026-10-30 23:00'),
      (3, 'paid', 90000, '2026-10-30', '2026-10-30 23:00'),
      (4, 'pending', 300000, '2026-10-31', '2026-10-31 01:00');
  steps:
    - task:
        vi: "Model `fct_orders` (marts) dạng incremental với khóa `order_id`: trả `order_id`, `status`, `amount_vnd`, `order_date`, `_fivetran_synced` từ nguồn `shop`, bảng `orders`. Khi chạy lại, chỉ lấy dòng có `_fivetran_synced` mới hơn mức lớn nhất đã có trong chính model."
        en: "Model `fct_orders` (marts) as incremental with key `order_id`: return `order_id`, `status`, `amount_vnd`, `order_date`, `_fivetran_synced` from source `shop`, table `orders`. On later runs, take only rows whose `_fivetran_synced` is newer than the largest one already in the model itself."
      model: { name: fct_orders, layer: marts, materialized: incremental }
      solution: |
        {{ config(materialized='incremental', unique_key='order_id') }}
        select order_id, status, amount_vnd,
          order_date, _fivetran_synced
        from {{ source('shop', 'orders') }}
        {% if is_incremental() %}
        where _fivetran_synced > (
          select max(_fivetran_synced)
          from {{ this }})
        {% endif %}
      after: SELECT order_id, status, amount_vnd FROM marts.fct_orders ORDER BY order_id
      check: rows
      ordered: true
      hint:
        vi: "Dòng đầu: `{{ config(materialized='incremental', unique_key='order_id') }}`. Bộ lọc nằm giữa `{% if is_incremental() %}` và `{% endif %}`, đọc mức lớn nhất từ `{{ this }}`. Lần chạy đầu, khối đó bị bỏ qua."
        en: "First line: `{{ config(materialized='incremental', unique_key='order_id') }}`. The filter sits between `{% if is_incremental() %}` and `{% endif %}`, reading the largest value from `{{ this }}`. On the first run that block is skipped."
    - task:
        vi: "Lần đồng bộ 06:00 ngày 31 mang về: đơn 2 đổi sang `refunded`, và đơn 5 mới (`paid`, 70000, ngày đặt 2026-10-29, về trễ). Ghi vào `raw_shop.orders` như connector làm: thêm mới, hoặc cập nhật `status` và `_fivetran_synced` nếu `order_id` đã có. Thời điểm đồng bộ là `2026-10-31 06:00`."
        en: "The 06:00 sync on 31 Oct brings: order 2 changes to `refunded`, and a new order 5 (`paid`, 70000, ordered 2026-10-29, arriving late). Write it into `raw_shop.orders` as the connector does: insert, or update `status` and `_fivetran_synced` when the `order_id` exists. The sync time is `2026-10-31 06:00`."
      solution: |
        INSERT INTO raw_shop.orders VALUES
          (2, 'refunded', 120000,
           '2026-10-30', '2026-10-31 06:00'),
          (5, 'paid', 70000,
           '2026-10-29', '2026-10-31 06:00')
        ON CONFLICT (order_id) DO UPDATE
        SET status = EXCLUDED.status,
          _fivetran_synced
            = EXCLUDED._fivetran_synced
      after: SELECT order_id, status, _fivetran_synced FROM raw_shop.orders ORDER BY order_id
      check: rows
      ordered: true
      hint:
        vi: "`INSERT … ON CONFLICT (order_id) DO UPDATE SET status = EXCLUDED.status, _fivetran_synced = EXCLUDED._fivetran_synced`."
        en: "`INSERT … ON CONFLICT (order_id) DO UPDATE SET status = EXCLUDED.status, _fivetran_synced = EXCLUDED._fivetran_synced`."
    - task:
        vi: "Chạy lại đúng model `fct_orders` của bước 1. Lần này model đã tồn tại, nên chỉ hai dòng mới được lấy và đơn 2 được thay chứ không bị nhân đôi."
        en: "Run the same `fct_orders` model from step 1 again. This time the model exists, so only the two new rows are taken and order 2 is replaced, not doubled."
      model: { name: fct_orders, layer: marts, materialized: incremental }
      solution: |
        {{ config(materialized='incremental', unique_key='order_id') }}
        select order_id, status, amount_vnd,
          order_date, _fivetran_synced
        from {{ source('shop', 'orders') }}
        {% if is_incremental() %}
        where _fivetran_synced > (
          select max(_fivetran_synced)
          from {{ this }})
        {% endif %}
      after: SELECT order_id, status, amount_vnd FROM marts.fct_orders ORDER BY order_id
      check: rows
      ordered: true
      hint:
        vi: "Dán lại model của bước 1. Không có `unique_key` thì đơn 2 có hai dòng."
        en: "Paste step 1's model again. Without `unique_key`, order 2 gets two rows."
    - task:
        vi: "Kiểm tra mart không có đơn trùng: từ `ref('fct_orders')`, trả `row_count` (số dòng) và `order_count` (số `order_id` khác nhau)."
        en: "Check that the mart has no duplicate order: from `ref('fct_orders')`, return `row_count` (the number of rows) and `order_count` (the number of distinct `order_id` values)."
      solution: |
        select count(*) as row_count,
          count(distinct order_id)
            as order_count
        from {{ ref('fct_orders') }}
      check: rows
      hint:
        vi: "`count(*)` và `count(distinct order_id)`: bằng nhau thì không có đơn trùng."
        en: "`count(*)` and `count(distinct order_id)`: equal means no duplicate order."
quiz:
  - q:
      vi: "Một model incremental lọc `where order_date > (select max(order_date) from {{ this }})`. Đơn ngày 29 về trễ vào ngày 31. Chuyện gì xảy ra?"
      en: "An incremental model filters `where order_date > (select max(order_date) from {{ this }})`. An order dated the 29th arrives late on the 31st. What happens?"
    options:
      - { vi: "Đơn được lấy vì nó là dòng mới trong raw", en: "It is taken because it is a new row in raw" }
      - { vi: "Đơn bị bỏ mãi, vì ngày đặt nhỏ hơn mức đã có", en: "It is skipped for good, its date is below the mark" }
      - { vi: "Model báo lỗi vì ngày đặt nhỏ hơn mức cũ", en: "The model fails because the date is below the mark" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe đúng vì dòng thật sự mới với kho, nhưng bộ lọc hỏi ngày đặt hàng, không hỏi lúc về. Ngày 29 nhỏ hơn mức lớn nhất nên lần nào cũng bị bỏ, không báo lỗi. Lọc theo thời điểm đồng bộ (`_fivetran_synced`) thì dòng trễ vẫn được lấy."
      en: "It sounds right because the row really is new to the warehouse, but the filter asks for the order date, not the arrival time. The 29th is below the largest value, so it is skipped every time, with no error. Filtering on the sync time (`_fivetran_synced`) still picks the late row up."
  - q:
      vi: "Model nào hợp làm view nhất?"
      en: "Which model suits a view best?"
    options:
      - { vi: "Một mart nặng mà dashboard đọc mỗi phút", en: "A heavy mart the dashboard reads every minute" }
      - { vi: "Một bảng sự kiện vài trăm triệu dòng chỉ thêm", en: "An append-only event table of hundreds of millions of rows" }
      - { vi: "Một model staging nhẹ chỉ đổi tên và ép kiểu", en: "A light staging model that only renames and casts" }
    answer: 2
    trap: 0
    why:
      vi: "View không lưu gì và chạy lại mỗi lần được đọc: hợp với model nhẹ như staging. Mart nặng được đọc liên tục nên làm bảng; bảng sự kiện rất lớn chỉ thêm dòng thì làm incremental."
      en: "A view stores nothing and reruns every time it is read: a good fit for a light model such as staging. A heavy mart read all the time should be a table; a very large append-only event table should be incremental."
---
## Mở bài

Mart đơn hàng của Chợ Lồng Đèn lớn dần mỗi ngày, và dựng lại từ đầu mỗi lần thì tốn. Bài này so ba cách dựng một model và chạy một model incremental hai lần.

## Ý chính

**View** không lưu dữ liệu: mỗi lần đọc là chạy lại câu SELECT, nên luôn mới nhưng chậm nếu câu nặng. **Table** lưu kết quả: đọc nhanh, nhưng chỉ đúng tới lần dựng gần nhất, và mỗi lần dựng là chạy lại toàn bộ. Không ghi `materialized` thì model là view.

**Incremental** cũng là bảng, nhưng lần chạy sau chỉ xử lý dòng mới. `is_incremental()` đúng khi ba điều cùng đúng: model đã tồn tại như một bảng, không chạy kiểu dựng lại hoàn toàn (full refresh), và model khai báo `materialized='incremental'`. Lần đầu nó sai, nên khối `{% if is_incremental() %}` bị bỏ qua và cả bảng được dựng. `{{ this }}` là chính bảng của model, để đọc mức lớn nhất đã nạp.

`unique_key` cho phép **cập nhật** dòng đã có thay vì chỉ thêm. Ở đây, với `unique_key`, BoonData xóa các dòng có khóa trùng rồi thêm lại trong một câu; không có nó thì chỉ thêm, và một đơn đổi trạng thái sẽ có hai dòng.

Bộ lọc incremental nên dựa vào **thời điểm dòng về kho** (`_fivetran_synced`), không vào ngày nghiệp vụ: dòng về trễ có ngày cũ và sẽ bị bỏ mãi. Hình cuối mục so lần chạy đầu với lần chạy sau.

## Cú pháp

```text
{{ config(
    materialized='incremental',
    unique_key='order_id') }}
select ...
from {{ source('shop', 'orders') }}
{% if is_incremental() %}
where _fivetran_synced > (
  select max(_fivetran_synced)
  from {{ this }})
{% endif %}
```

- Lần đầu: `CREATE TABLE … AS` cả câu.
- Lần sau: chỉ dòng qua bộ lọc; có `unique_key` thì thay dòng trùng khóa.
- `materialized='view'` (mặc định) và `'table'` không có khối `is_incremental()`.

## Ví dụ

Lần chạy đầu: dựng cả bảng.

```sql
CREATE SCHEMA marts;
CREATE TABLE marts.fct_orders AS
SELECT order_id, status, amount_vnd,
  order_date, _fivetran_synced
FROM raw_shop.orders;
SELECT count(*) AS row_count
FROM marts.fct_orders;
```

Đồng bộ mới về, rồi câu lọc của lần chạy sau tìm dòng mới:

```sql
INSERT INTO raw_shop.orders VALUES
  (2, 'refunded', 120000,
   '2026-10-30', '2026-10-31 06:00'),
  (5, 'paid', 70000,
   '2026-10-29', '2026-10-31 06:00')
ON CONFLICT (order_id) DO UPDATE
SET status = EXCLUDED.status,
  _fivetran_synced
    = EXCLUDED._fivetran_synced;
SELECT order_id, status
FROM raw_shop.orders
WHERE _fivetran_synced > (
  SELECT max(_fivetran_synced)
  FROM marts.fct_orders)
ORDER BY order_id;
```

Lần chạy sau với `unique_key`: xóa dòng trùng khóa, thêm bản mới.

```sql
WITH s AS (
  SELECT order_id, status, amount_vnd,
    order_date, _fivetran_synced
  FROM raw_shop.orders
  WHERE _fivetran_synced > (
    SELECT max(_fivetran_synced)
    FROM marts.fct_orders)
), d AS (
  DELETE FROM marts.fct_orders t
  USING s
  WHERE t.order_id = s.order_id)
INSERT INTO marts.fct_orders
SELECT * FROM s;
SELECT order_id, status
FROM marts.fct_orders
ORDER BY order_id;
```

## Lỗi hay gặp

Lọc theo ngày đặt hàng: mức lớn nhất của lần đầu là ngày 31, nên đơn 5 (ngày 29, về trễ) không bao giờ được lấy.

```sql
-- WRONG: new = later order date
SELECT order_id
FROM raw_shop.orders
WHERE order_date > '2026-10-31';
```

```sql
-- FIX: new = later sync time
SELECT order_id
FROM raw_shop.orders
WHERE _fivetran_synced
  > '2026-10-31 01:00'
ORDER BY order_id;
```

Một bảng chỉ đúng tới lần dựng gần nhất:

```sql
-- WRONG: a table built before a sync
CREATE TABLE marts.snap AS
SELECT count(*) AS n
FROM raw_shop.orders;
INSERT INTO raw_shop.orders VALUES
  (6, 'paid', 40000,
   '2026-10-31', '2026-10-31 12:00');
SELECT n FROM marts.snap;
```

```sql
-- FIX: a view reads the source now
CREATE VIEW marts.live AS
SELECT count(*) AS n
FROM raw_shop.orders;
SELECT n FROM marts.live;
```

## Thực hành

Một model incremental chạy hai lần, với một lần đồng bộ ở giữa, rồi một câu kiểm tra mart không có đơn trùng. Bước 3 dùng lại đúng model của bước 1: lần này nó đi vào nhánh `is_incremental()`.

## Tóm tắt

- View: luôn mới, chạy lại mỗi lần đọc. Table: đọc nhanh, đúng tới lần dựng cuối.
- Incremental: lần đầu dựng cả bảng, lần sau chỉ dòng qua bộ lọc trong `is_incremental()`.
- `{{ this }}` là bảng của chính model; `unique_key` thay dòng trùng khóa thay vì thêm.
- Lọc incremental theo thời điểm về kho, không theo ngày nghiệp vụ, để không rơi dòng trễ.

# EN

## Opening

Lantern Market's orders mart grows every day, and rebuilding it from scratch each time is costly. This lesson compares three ways to build a model and runs an incremental model twice.

## Key idea

A **view** stores no data: every read reruns the SELECT, so it is always fresh but slow if the query is heavy. A **table** stores the result: fast to read, but only right as of the last build, and every build reruns everything. Without `materialized`, a model is a view.

**Incremental** is a table too, but later runs process only new rows. `is_incremental()` is true when three things hold: the model already exists as a table, the run is not a full rebuild (full refresh), and the model declares `materialized='incremental'`. On the first run it is false, so the `{% if is_incremental() %}` block is skipped and the whole table is built. `{{ this }}` is the model's own table, to read the largest value already loaded.

`unique_key` lets a run **update** existing rows instead of only appending. Here, with `unique_key`, BoonData deletes the rows whose key repeats and inserts them again in one statement; without it rows are only appended, and an order that changed status ends up with two rows.

An incremental filter should rely on **when the row reached the warehouse** (`_fivetran_synced`), not on a business date: a late row carries an old date and would be skipped for good. The figure at the end of this section compares the first run with a later one.

## Syntax

```text
{{ config(
    materialized='incremental',
    unique_key='order_id') }}
select ...
from {{ source('shop', 'orders') }}
{% if is_incremental() %}
where _fivetran_synced > (
  select max(_fivetran_synced)
  from {{ this }})
{% endif %}
```

- First run: `CREATE TABLE … AS` the whole query.
- Later runs: only rows that pass the filter; with `unique_key` they replace rows with the same key.
- `materialized='view'` (the default) and `'table'` have no `is_incremental()` block.

## Example

The first run: build the whole table.

```sql
CREATE SCHEMA marts;
CREATE TABLE marts.fct_orders AS
SELECT order_id, status, amount_vnd,
  order_date, _fivetran_synced
FROM raw_shop.orders;
SELECT count(*) AS row_count
FROM marts.fct_orders;
```

A new sync arrives, then the later run's filter finds the new rows:

```sql
INSERT INTO raw_shop.orders VALUES
  (2, 'refunded', 120000,
   '2026-10-30', '2026-10-31 06:00'),
  (5, 'paid', 70000,
   '2026-10-29', '2026-10-31 06:00')
ON CONFLICT (order_id) DO UPDATE
SET status = EXCLUDED.status,
  _fivetran_synced
    = EXCLUDED._fivetran_synced;
SELECT order_id, status
FROM raw_shop.orders
WHERE _fivetran_synced > (
  SELECT max(_fivetran_synced)
  FROM marts.fct_orders)
ORDER BY order_id;
```

The later run with `unique_key`: delete rows whose key repeats, insert the new versions.

```sql
WITH s AS (
  SELECT order_id, status, amount_vnd,
    order_date, _fivetran_synced
  FROM raw_shop.orders
  WHERE _fivetran_synced > (
    SELECT max(_fivetran_synced)
    FROM marts.fct_orders)
), d AS (
  DELETE FROM marts.fct_orders t
  USING s
  WHERE t.order_id = s.order_id)
INSERT INTO marts.fct_orders
SELECT * FROM s;
SELECT order_id, status
FROM marts.fct_orders
ORDER BY order_id;
```

## Common mistakes

Filtering on the order date: the first run's largest value is the 31st, so order 5 (dated the 29th, arriving late) is never taken.

```sql
-- WRONG: new = later order date
SELECT order_id
FROM raw_shop.orders
WHERE order_date > '2026-10-31';
```

```sql
-- FIX: new = later sync time
SELECT order_id
FROM raw_shop.orders
WHERE _fivetran_synced
  > '2026-10-31 01:00'
ORDER BY order_id;
```

A table is only right as of its last build:

```sql
-- WRONG: a table built before a sync
CREATE TABLE marts.snap AS
SELECT count(*) AS n
FROM raw_shop.orders;
INSERT INTO raw_shop.orders VALUES
  (6, 'paid', 40000,
   '2026-10-31', '2026-10-31 12:00');
SELECT n FROM marts.snap;
```

```sql
-- FIX: a view reads the source now
CREATE VIEW marts.live AS
SELECT count(*) AS n
FROM raw_shop.orders;
SELECT n FROM marts.live;
```

## Practice

One incremental model run twice, with a sync in between, then a query checking the mart has no duplicate order. Step 3 reuses step 1's model unchanged: this time it takes the `is_incremental()` branch.

## Recap

- View: always fresh, reruns on every read. Table: fast to read, right as of the last build.
- Incremental: the first run builds the whole table, later runs only the rows that pass the filter inside `is_incremental()`.
- `{{ this }}` is the model's own table; `unique_key` replaces rows with the same key instead of appending.
- Filter incremental runs on arrival time, not business date, so late rows are not lost.
