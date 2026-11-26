---
id: e-st-l2-04
engine: stack
level: L2
module: dbt
title: "Test: dữ liệu tự báo lỗi"
title_en: "Tests: data that reports its own errors"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: st-test-failing-rows, at: idea }]
objectives:
  - vi: Viết bốn test chung (`unique`, `not_null`, `accepted_values`, `relationships`) dưới dạng câu trả về dòng hỏng.
    en: Write the four generic tests (`unique`, `not_null`, `accepted_values`, `relationships`) as queries that return failing rows.
  - vi: Sửa model cho tới khi test trả 0 dòng, và biết lỗi nào phải báo cho chủ nguồn thay vì tự sửa.
    en: Fix a model until its tests return 0 rows, and know which failures to raise with the source's owner instead of patching.
requires: [e-st-l2-02]
sources:
  - { url: "https://docs.getdbt.com/docs/build/data-tests", title: "dbt docs: Add data tests to your DAG" }
  - { url: "https://docs.getdbt.com/reference/resource-properties/data-tests", title: "dbt docs: data_tests" }
  - { url: "https://docs.airbyte.com/platform/understanding-airbyte/airbyte-metadata-fields", title: "Airbyte docs: Airbyte metadata fields" }
lab:
  setup: |
    CREATE SCHEMA raw_shop;
    CREATE SCHEMA staging;
    CREATE TABLE raw_shop.orders (
      _airbyte_extracted_at timestamp,
      order_id int, customer_id int,
      status text, amount_vnd int
    );
    INSERT INTO raw_shop.orders VALUES
      ('2026-10-30 23:00', 401, 11, 'paid', 250000),
      ('2026-10-30 23:00', 402, 12, 'pending', 120000),
      ('2026-10-31 06:00', 402, 12, 'paid', 120000),
      ('2026-10-30 23:00', 403, 99, 'paid', 90000),
      ('2026-10-31 06:00', 404, 13, 'PAID ', 60000),
      ('2026-10-31 06:00', 405, 14, 'shipped', 120000);
    CREATE TABLE raw_shop.customers (id int, name text);
    INSERT INTO raw_shop.customers VALUES
      (11, 'Lan Silk'), (12, 'Minh Tea'),
      (13, 'Hoa Lamp'), (14, 'An Wood');
    CREATE TABLE staging.stg_orders AS
      SELECT order_id, customer_id, status,
        amount_vnd, _airbyte_extracted_at
      FROM raw_shop.orders;
    CREATE TABLE staging.stg_customers AS
      SELECT id AS customer_id, name
      FROM raw_shop.customers;
  steps:
    - task:
        vi: "Test `unique` trên `order_id` của model `stg_orders`: trả mỗi `order_id` xuất hiện hơn một lần, kèm số lần `n` (bỏ qua NULL)."
        en: "The `unique` test on `order_id` of model `stg_orders`: return each `order_id` that appears more than once, with its count `n` (ignore NULLs)."
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
    - task:
        vi: "Test `accepted_values` trên `status`, với các giá trị `paid`, `pending`, `shipped`, `cancelled`: trả mỗi giá trị lạ và số dòng `n` của nó."
        en: "The `accepted_values` test on `status`, with the values `paid`, `pending`, `shipped`, `cancelled`: return each unexpected value and its row count `n`."
      solution: |
        select status, count(*) as n
        from {{ ref('stg_orders') }}
        where status not in ('paid',
          'pending', 'shipped', 'cancelled')
        group by status
      check: rows
      hint:
        vi: "`where status not in (...)` rồi `group by status`."
        en: "`where status not in (...)` then `group by status`."
    - task:
        vi: "Test `relationships`: mỗi `customer_id` của `stg_orders` phải có trong `stg_customers`. Trả các `customer_id` không có."
        en: "The `relationships` test: every `customer_id` of `stg_orders` must exist in `stg_customers`. Return the `customer_id` values that do not."
      solution: |
        select o.customer_id
        from {{ ref('stg_orders') }} o
        left join {{ ref('stg_customers') }} c
          on c.customer_id = o.customer_id
        where o.customer_id is not null
          and c.customer_id is null
      check: rows
      hint:
        vi: "`left join` sang `{{ ref('stg_customers') }}` rồi giữ dòng có `c.customer_id is null`."
        en: "`left join` to `{{ ref('stg_customers') }}`, then keep rows where `c.customer_id is null`."
    - task:
        vi: "Sửa model `stg_orders` (staging, bảng) từ nguồn `shop`, bảng `orders`: mỗi `order_id` giữ bản mới nhất theo `_airbyte_extracted_at`, và `status` được cắt khoảng trắng rồi viết thường. Giữ cột: `order_id`, `customer_id`, `status`, `amount_vnd`, `_airbyte_extracted_at`. Lab chấm bằng cách chạy lại hai test đầu (phải ra 0) và đếm đơn."
        en: "Fix model `stg_orders` (staging, a table) from source `shop`, table `orders`: keep the newest version of each `order_id` by `_airbyte_extracted_at`, with `status` trimmed and lower-cased. Keep the columns `order_id`, `customer_id`, `status`, `amount_vnd`, `_airbyte_extracted_at`. The lab grades it by rerunning the first two tests (they must give 0) and counting orders."
      model: { name: stg_orders, layer: staging, materialized: table }
      solution: |
        {{ config(materialized='table') }}
        select distinct on (order_id)
          order_id, customer_id,
          lower(trim(status)) as status,
          amount_vnd, _airbyte_extracted_at
        from {{ source('shop', 'orders') }}
        order by order_id,
          _airbyte_extracted_at desc
      after: |
        SELECT
          (SELECT count(*) FROM (SELECT order_id FROM staging.stg_orders GROUP BY order_id HAVING count(*) > 1) u) AS dupes,
          (SELECT count(*) FROM staging.stg_orders WHERE status NOT IN ('paid', 'pending', 'shipped', 'cancelled')) AS bad_status,
          (SELECT count(*) FROM staging.stg_orders) AS order_count
      check: rows
      hint:
        vi: "`select distinct on (order_id) …` với `order by order_id, _airbyte_extracted_at desc`, và `lower(trim(status))`."
        en: "`select distinct on (order_id) …` with `order by order_id, _airbyte_extracted_at desc`, and `lower(trim(status))`."
quiz:
  - q:
      vi: "Một test viết `select count(*) as failures from … where order_id is null`. Khi không có dòng hỏng, test qua hay trượt?"
      en: "A test is written `select count(*) as failures from … where order_id is null`. When nothing is broken, does it pass or fail?"
    options:
      - { vi: "Qua, vì số đếm là 0", en: "It passes, because the count is 0" }
      - { vi: "Trượt, vì câu luôn trả một dòng", en: "It fails, because it always returns a row" }
      - { vi: "Báo lỗi, vì count không dùng trong test được", en: "It errors, since count is not allowed in tests" }
    answer: 1
    trap: 0
    why:
      vi: "Con số 0 trông như \"qua\", nhưng test kiểu dbt đếm số **dòng** câu trả về: 0 dòng là qua. `count(*)` luôn trả đúng một dòng (dù giá trị là 0), nên test luôn trượt. Hãy trả chính các dòng hỏng."
      en: "A 0 looks like a pass, but a dbt-style test counts the **rows** the query returns: 0 rows means pass. `count(*)` always returns exactly one row (even when its value is 0), so the test always fails. Return the failing rows themselves."
  - q:
      vi: "Test `relationships` báo đơn 403 có `customer_id` 99 không có trong bảng khách. Bạn làm gì?"
      en: "The `relationships` test reports order 403 with `customer_id` 99, which is not in the customers table. What do you do?"
    options:
      - { vi: "Báo chủ nguồn và để test trượt tới khi nguồn sửa", en: "Raise it with the source owner; let the test fail until fixed" }
      - { vi: "Xóa đơn 403 trong model cho test qua", en: "Delete order 403 in the model so the test passes" }
      - { vi: "Đổi `customer_id` 99 thành 11 cho khớp", en: "Change `customer_id` 99 to 11 so it matches" }
    answer: 0
    trap: 1
    why:
      vi: "Xóa đơn làm test xanh, nhưng làm mất 90.000 đồng doanh thu thật và giấu lỗi của nguồn. Một khách thiếu là lỗi dữ liệu ở nguồn: báo người lo nguồn, ghi chú trên báo cáo, đừng sửa tay số liệu."
      en: "Deleting the order turns the test green, but it loses 90,000 VND of real revenue and hides the source's fault. A missing customer is a data error at the source: tell the source's owner, note it on the report, do not patch the numbers by hand."
---
## Mở bài

Ở Chợ Lồng Đèn, một số trên dashboard từng sai vì một đơn bị nạp hai lần. Bài này viết các test để dữ liệu tự báo lỗi đó trước khi ai kịp đọc số.

## Ý chính

Một **test** kiểu dbt là một câu `SELECT` trả về **các dòng hỏng**. Không dòng nào: test qua. Có dòng: test trượt, và chính các dòng đó cho bạn biết hỏng ở đâu. Vì vậy test không trả số đếm: `count(*)` luôn trả một dòng.

dbt có bốn test chung, khai báo trong file YAML cạnh model và được dịch thành câu SQL. `unique`: giá trị nào lặp lại. `not_null`: dòng nào để trống. `accepted_values`: giá trị nào nằm ngoài danh sách cho phép. `relationships`: khóa ngoại nào không có dòng cha. Cần luật riêng thì viết một **test đơn lẻ** (singular test): một file `.sql` trả dòng hỏng.

Khi test trượt, hỏi lỗi nằm ở đâu. Lỗi của model (quên bỏ bản trùng, quên chuẩn hóa chữ) thì sửa model. Lỗi của nguồn (một khách không tồn tại) thì báo chủ nguồn; xóa dòng cho test xanh chỉ là giấu lỗi. Hình cuối mục cho thấy một test trước và sau khi sửa model.

## Cú pháp

```text
# models/staging/schema.yml
models:
  - name: stg_orders
    columns:
      - name: order_id
        data_tests: [unique, not_null]
      - name: status
        data_tests:
          - accepted_values:
              arguments:
                values: [paid, pending]
```

```sql
-- unique, compiled
SELECT col, count(*) AS n
FROM model
WHERE col IS NOT NULL
GROUP BY col HAVING count(*) > 1
```

- 0 dòng = qua; mỗi dòng trả về là một lỗi.
- `relationships` = `LEFT JOIN` sang bảng cha, giữ dòng không có cặp.

## Ví dụ

Test `unique` đã dịch, chạy trên model staging chưa sửa: đơn 402 có hai bản.

```sql
SELECT order_id, count(*) AS n
FROM staging.stg_orders
WHERE order_id IS NOT NULL
GROUP BY order_id
HAVING count(*) > 1;
```

Test `relationships` đã dịch: một đơn trỏ tới khách không tồn tại.

```sql
SELECT o.order_id, o.customer_id
FROM staging.stg_orders o
LEFT JOIN staging.stg_customers c
  ON c.customer_id = o.customer_id
WHERE o.customer_id IS NOT NULL
  AND c.customer_id IS NULL;
```

## Lỗi hay gặp

Test `unique` nhóm theo hai cột: đơn 402 có hai trạng thái khác nhau nên lọt qua.

```sql
-- WRONG: grouped by order_id, status
SELECT order_id, status, count(*)
FROM staging.stg_orders
GROUP BY order_id, status
HAVING count(*) > 1;
```

```sql
-- FIX: grouped by the key only
SELECT order_id, count(*) AS n
FROM staging.stg_orders
GROUP BY order_id
HAVING count(*) > 1;
```

Che bản trùng ngay trong câu báo cáo bằng `DISTINCT`: hai đơn khác nhau có cùng số tiền bị gộp làm một.

```sql
-- WRONG: DISTINCT on the amount
SELECT sum(DISTINCT amount_vnd)
  AS revenue_vnd
FROM staging.stg_orders;
```

```sql
-- FIX: one row per order, then sum
SELECT sum(amount_vnd) AS revenue_vnd
FROM (SELECT DISTINCT ON (order_id)
    order_id, amount_vnd
  FROM staging.stg_orders
  ORDER BY order_id) o;
```

## Thực hành

Ba test trên model staging chưa sửa, mỗi test trả dòng hỏng của nó. Rồi sửa model `stg_orders` cho tới khi `unique` và `accepted_values` ra 0 dòng. Đơn 403 vẫn làm `relationships` trượt: đó là lỗi của nguồn, để báo, không để xóa.

## Tóm tắt

- Test = câu trả về dòng hỏng; 0 dòng là qua.
- Bốn test chung: `unique`, `not_null`, `accepted_values`, `relationships`; luật riêng là test đơn lẻ.
- Lỗi của model thì sửa model; lỗi của nguồn thì báo chủ nguồn.
- Đừng che lỗi bằng `DISTINCT` trong câu báo cáo.

# EN

## Opening

At Lantern Market a dashboard number was once wrong because an order was loaded twice. This lesson writes the tests that make the data report that error before anyone reads the number.

## Key idea

A dbt-style **test** is a `SELECT` that returns **the failing rows**. No rows: the test passes. Some rows: it fails, and those rows tell you where. That is why a test does not return a count: `count(*)` always returns one row.

dbt has four generic tests, declared in a YAML file next to the model and compiled into SQL. `unique`: which values repeat. `not_null`: which rows are empty. `accepted_values`: which values fall outside the allowed list. `relationships`: which foreign keys have no parent row. For a rule of your own, write a **singular test**: a `.sql` file that returns failing rows.

When a test fails, ask where the error lives. A model's error (duplicates not removed, text not normalised) is fixed in the model. A source's error (a customer that does not exist) is raised with the source's owner; deleting rows to turn the test green only hides it. The figure at the end of this section shows one test before and after the model is fixed.

## Syntax

```text
# models/staging/schema.yml
models:
  - name: stg_orders
    columns:
      - name: order_id
        data_tests: [unique, not_null]
      - name: status
        data_tests:
          - accepted_values:
              arguments:
                values: [paid, pending]
```

```sql
-- unique, compiled
SELECT col, count(*) AS n
FROM model
WHERE col IS NOT NULL
GROUP BY col HAVING count(*) > 1
```

- 0 rows = pass; every row returned is a failure.
- `relationships` = a `LEFT JOIN` to the parent table, keeping rows with no partner.

## Example

The compiled `unique` test on the unfixed staging model: order 402 has two versions.

```sql
SELECT order_id, count(*) AS n
FROM staging.stg_orders
WHERE order_id IS NOT NULL
GROUP BY order_id
HAVING count(*) > 1;
```

The compiled `relationships` test: one order points at a customer that does not exist.

```sql
SELECT o.order_id, o.customer_id
FROM staging.stg_orders o
LEFT JOIN staging.stg_customers c
  ON c.customer_id = o.customer_id
WHERE o.customer_id IS NOT NULL
  AND c.customer_id IS NULL;
```

## Common mistakes

A `unique` test grouped by two columns: order 402 has two different statuses, so it slips through.

```sql
-- WRONG: grouped by order_id, status
SELECT order_id, status, count(*)
FROM staging.stg_orders
GROUP BY order_id, status
HAVING count(*) > 1;
```

```sql
-- FIX: grouped by the key only
SELECT order_id, count(*) AS n
FROM staging.stg_orders
GROUP BY order_id
HAVING count(*) > 1;
```

Hiding duplicates in the report query with `DISTINCT`: two different orders with the same amount merge into one.

```sql
-- WRONG: DISTINCT on the amount
SELECT sum(DISTINCT amount_vnd)
  AS revenue_vnd
FROM staging.stg_orders;
```

```sql
-- FIX: one row per order, then sum
SELECT sum(amount_vnd) AS revenue_vnd
FROM (SELECT DISTINCT ON (order_id)
    order_id, amount_vnd
  FROM staging.stg_orders
  ORDER BY order_id) o;
```

## Practice

Three tests on the unfixed staging model, each returning its failing rows. Then fix model `stg_orders` until `unique` and `accepted_values` return 0 rows. Order 403 still fails `relationships`: that is the source's error, to raise, not to delete.

## Recap

- A test = a query returning failing rows; 0 rows is a pass.
- Four generic tests: `unique`, `not_null`, `accepted_values`, `relationships`; your own rule is a singular test.
- A model's error is fixed in the model; a source's error goes to the source's owner.
- Do not hide errors with `DISTINCT` in a report query.
