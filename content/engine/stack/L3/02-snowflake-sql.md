---
id: e-st-l3-02
engine: stack
level: L3
module: warehouse
title: "SQL kiểu Snowflake mà DA hay gặp"
title_en: "Snowflake SQL a DA meets"
kind: lab
runtime: browser
minutes: 25
figures: [{ name: st-qualify, at: idea }]
objectives:
  - vi: Đọc `QUALIFY`, `IFF`, `ILIKE`, đường dẫn `:` và `DATE_TRUNC` của Snowflake.
    en: Read Snowflake's `QUALIFY`, `IFF`, `ILIKE`, `:` paths and `DATE_TRUNC`.
  - vi: Viết bản PostgreSQL tương đương chạy được cho từng cái.
    en: Write a runnable PostgreSQL equivalent for each.
  - vi: Biết vì sao `QUALIFY` lọc sau hàm cửa sổ, còn `WHERE` thì không lọc được trên nó.
    en: Know why `QUALIFY` filters after window functions while `WHERE` cannot filter on them.
requires: [e-st-l1-05]
sources:
  - { url: "https://docs.snowflake.com/en/sql-reference/constructs/qualify", title: "Snowflake docs: QUALIFY", title_vi: "Tài liệu Snowflake: QUALIFY" }
  - { url: "https://docs.snowflake.com/en/sql-reference/functions/iff", title: "Snowflake docs: IFF", title_vi: "Tài liệu Snowflake: IFF" }
  - { url: "https://docs.snowflake.com/en/sql-reference/functions/ilike", title: "Snowflake docs: ILIKE", title_vi: "Tài liệu Snowflake: ILIKE" }
  - { url: https://www.postgresql.org/docs/18/tutorial-window.html, title_vi: "Hướng dẫn › hàm cửa sổ" }
  - { url: https://www.postgresql.org/docs/18/functions-json.html, title_vi: "Hàm và toán tử JSON" }
lab:
  setup: |
    CREATE SCHEMA raw_pay;
    CREATE TABLE raw_pay.events (
      event_id int, order_id int, status text,
      amount_vnd int, at timestamp,
      payload jsonb
    );
    INSERT INTO raw_pay.events VALUES
      (1, 901, 'pending', 150000, '2026-10-30 09:00', '{"method": "card"}'),
      (2, 901, 'Captured', 150000, '2026-10-30 09:05', '{"method": "card"}'),
      (3, 902, 'pending', 80000, '2026-10-30 20:00', '{"method": "wallet"}'),
      (4, 903, 'CAPTURED', 220000, '2026-10-31 07:30', '{"method": "wallet"}'),
      (5, 902, 'failed', 80000, '2026-10-31 08:10', '{"method": "wallet"}'),
      (6, 904, 'captured', 60000, '2026-10-31 09:00', '{"method": "cash"}');
  steps:
    - task:
        vi: "Bản PostgreSQL của `QUALIFY row_number() over (partition by order_id order by at desc) = 1`: sự kiện mới nhất của mỗi đơn trong `raw_pay.events`, trả `order_id`, `status`, `at`."
        en: "The PostgreSQL form of `QUALIFY row_number() over (partition by order_id order by at desc) = 1`: the newest event of each order in `raw_pay.events`, returning `order_id`, `status`, `at`."
      solution: |
        select order_id, status, at
        from (
          select order_id, status, at,
            row_number() over (
              partition by order_id
              order by at desc) as rn
          from raw_pay.events
        ) e
        where rn = 1
      check: rows
      hint:
        vi: "Tính `row_number()` trong một subquery, rồi `where rn = 1` ở câu ngoài."
        en: "Compute `row_number()` in a subquery, then `where rn = 1` in the outer query."
    - task:
        vi: "Bản PostgreSQL của `payload:method::string`: số sự kiện theo phương thức thanh toán, trả `method` (chữ) và `n`."
        en: "The PostgreSQL form of `payload:method::string`: the number of events per payment method, returning `method` (text) and `n`."
      solution: |
        select payload ->> 'method' as method,
          count(*) as n
        from raw_pay.events
        group by payload ->> 'method'
      check: rows
      hint:
        vi: "`payload ->> 'method'` trả chữ; `->` sẽ trả `jsonb`."
        en: "`payload ->> 'method'` returns text; `->` would return `jsonb`."
    - task:
        vi: "Bản PostgreSQL của `DATE_TRUNC('day', at)` và `status ILIKE 'captured'`: doanh thu đã thu mỗi ngày, trả `day` (kiểu `date`) và `revenue_vnd`. Trạng thái được ghi lẫn hoa thường."
        en: "The PostgreSQL form of `DATE_TRUNC('day', at)` and `status ILIKE 'captured'`: captured revenue per day, returning `day` (type `date`) and `revenue_vnd`. Statuses are stored in mixed case."
      solution: |
        select date_trunc('day', at)::date
            as day,
          sum(amount_vnd) as revenue_vnd
        from raw_pay.events
        where status ilike 'captured'
        group by 1
      check: rows
      hint:
        vi: "`date_trunc('day', at)::date`, `where status ilike 'captured'`, `group by 1`."
        en: "`date_trunc('day', at)::date`, `where status ilike 'captured'`, `group by 1`."
    - task:
        vi: "Bản PostgreSQL của `IFF(status ILIKE 'captured', 'paid', 'open')` trên sự kiện mới nhất của mỗi đơn: trả `order_id` và `state`."
        en: "The PostgreSQL form of `IFF(status ILIKE 'captured', 'paid', 'open')` on each order's newest event: return `order_id` and `state`."
      solution: |
        select order_id,
          case when status ilike 'captured'
            then 'paid' else 'open' end
            as state
        from (
          select order_id, status,
            row_number() over (
              partition by order_id
              order by at desc) as rn
          from raw_pay.events
        ) e
        where rn = 1
      check: rows
      hint:
        vi: "`IFF(c, a, b)` là `case when c then a else b end`; lấy sự kiện mới nhất như bước 1."
        en: "`IFF(c, a, b)` is `case when c then a else b end`; take the newest event as in step 1."
quiz:
  - q:
      vi: "Vì sao trong Postgres không viết được `WHERE row_number() OVER (…) = 1`?"
      en: "Why can't you write `WHERE row_number() OVER (…) = 1` in Postgres?"
    options:
      - { vi: "Vì `row_number()` chỉ có ở Snowflake", en: "Because `row_number()` exists only in Snowflake" }
      - { vi: "Vì `WHERE` chạy trước khi hàm cửa sổ được tính", en: "Because `WHERE` runs before window functions are computed" }
      - { vi: "Vì phải có `GROUP BY` trước", en: "Because a `GROUP BY` must come first" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe như do Postgres thiếu hàm, nhưng `row_number()` có sẵn trong Postgres. Lý do là thứ tự chạy: `WHERE` lọc dòng trước, hàm cửa sổ được tính sau đó, nên Postgres báo lỗi 42P20. Snowflake thêm `QUALIFY`, chạy sau hàm cửa sổ; trong Postgres, đặt hàm vào subquery rồi lọc ở ngoài. Không cần `GROUP BY`."
      en: "It sounds like Postgres lacks the function, but `row_number()` is built into Postgres. The reason is the order of evaluation: `WHERE` filters rows first and window functions are computed afterwards, so Postgres raises 42P20. Snowflake adds `QUALIFY`, evaluated after window functions; in Postgres, put the function in a subquery and filter outside. No `GROUP BY` is needed."
  - q:
      vi: "Trạng thái ghi là `pending`, `Captured`, `CAPTURED`, `captured`, `failed`. Doanh thu ngày 31/10 với `status = 'captured'` là bao nhiêu, và với `ILIKE 'captured'`? (Ngày 31/10: 220.000 `CAPTURED`, 60.000 `captured`.)"
      en: "Statuses are stored as `pending`, `Captured`, `CAPTURED`, `captured`, `failed`. What is 31 Oct's revenue with `status = 'captured'`, and with `ILIKE 'captured'`? (31 Oct: 220,000 `CAPTURED`, 60,000 `captured`.)"
    options:
      - { vi: "280.000 và 280.000", en: "280,000 and 280,000" }
      - { vi: "220.000 và 280.000", en: "220,000 and 280,000" }
      - { vi: "60.000 và 280.000", en: "60,000 and 280,000" }
    answer: 2
    trap: 0
    why:
      vi: "Hai câu trông như cùng một điều kiện, nhưng `=` phân biệt hoa thường: nó chỉ khớp `captured` viết thường, tức 60.000. `ILIKE` không phân biệt nên khớp cả `CAPTURED`: 220.000 + 60.000 = 280.000. 220.000 là khi chỉ khớp chữ hoa."
      en: "The two look like the same condition, but `=` is case-sensitive: it matches only lowercase `captured`, that is 60,000. `ILIKE` is case-insensitive, so it also matches `CAPTURED`: 220,000 + 60,000 = 280,000. 220,000 would be matching only the uppercase one."
---
## Mở bài

Kho dữ liệu mới của Chợ Lồng Đèn chạy Snowflake, và các câu đồng nghiệp gửi bạn có `QUALIFY`, `IFF`, `payload:method`. Bài này đọc từng cái và chạy bản PostgreSQL tương đương ngay đây.

## Ý chính

Snowflake có vài tiện ích mà Postgres viết khác. `QUALIFY` lọc **sau** khi hàm cửa sổ được tính, như `HAVING` lọc sau `GROUP BY`; trong Postgres, đặt hàm cửa sổ vào subquery rồi lọc ở câu ngoài. `IFF(c, a, b)` là `CASE WHEN c THEN a ELSE b END`.

Cột `VARIANT` đọc bằng đường dẫn `:`, như `payload:method::string`; trong Postgres đó là `payload ->> 'method'` trên cột `jsonb`. `ILIKE` (không phân biệt hoa thường) và `DATE_TRUNC` thì Postgres có y như vậy.

Cú pháp Snowflake ở bài này chỉ để đọc; câu chạy được là bản PostgreSQL tương đương. Hình cuối mục cho thấy `QUALIFY` giữ dòng nào sau khi đánh số trong từng đơn.

## Cú pháp

```text
-- Snowflake (read only)
SELECT order_id, status,
  IFF(status ILIKE 'captured',
    'paid', 'open') AS state,
  payload:method::string AS method
FROM raw_pay.events
QUALIFY row_number() OVER (
  PARTITION BY order_id
  ORDER BY at DESC) = 1;
```

```sql
-- PostgreSQL: filter outside
SELECT order_id, status
FROM (SELECT order_id, status,
    row_number() OVER (
      PARTITION BY order_id
      ORDER BY at DESC) AS rn
  FROM raw_pay.events) e
WHERE rn = 1;
```

- `IFF(c, a, b)` → `CASE WHEN c THEN a ELSE b END`.
- `v:key::string` → `v ->> 'key'`; `ILIKE` và `date_trunc` giữ nguyên.

## Ví dụ

Đánh số sự kiện trong từng đơn, mới nhất là 1: đây là cột `QUALIFY` sẽ lọc.

```sql
SELECT order_id, status, at,
  row_number() OVER (
    PARTITION BY order_id
    ORDER BY at DESC) AS rn
FROM raw_pay.events
ORDER BY order_id, rn;
```

Đường dẫn JSON và `ILIKE`:

```sql
SELECT event_id,
  payload ->> 'method' AS method
FROM raw_pay.events
WHERE status ILIKE 'captured'
ORDER BY event_id;
```

## Lỗi hay gặp

Lọc hàm cửa sổ trong `WHERE`: Postgres từ chối vì `WHERE` chạy trước.

```sql
-- ERROR 42P20: window in WHERE
SELECT order_id, status
FROM raw_pay.events
WHERE row_number() OVER (
  PARTITION BY order_id
  ORDER BY at DESC) = 1;
```

So bằng `=` trên chữ lẫn hoa thường: sót `Captured` và `CAPTURED`.

```sql
-- WRONG: = is case-sensitive
SELECT count(*) AS captured
FROM raw_pay.events
WHERE status = 'captured';
```

```sql
-- FIX: ILIKE ignores case
SELECT count(*) AS captured
FROM raw_pay.events
WHERE status ILIKE 'captured';
```

## Thực hành

Bốn bước, mỗi bước một câu Snowflake viết lại bằng PostgreSQL: `QUALIFY`, đường dẫn `:`, `DATE_TRUNC` với `ILIKE`, rồi `IFF` trên sự kiện mới nhất của mỗi đơn.

## Tóm tắt

- `QUALIFY` lọc sau hàm cửa sổ; Postgres làm bằng subquery rồi `WHERE` ở ngoài.
- `IFF(c, a, b)` là `CASE WHEN c THEN a ELSE b END`.
- `v:key::string` là `v ->> 'key'` trên `jsonb`.
- `ILIKE` không phân biệt hoa thường; `=` thì có.

# EN

## Opening

Lantern Market's new warehouse runs Snowflake, and the queries colleagues send you have `QUALIFY`, `IFF`, `payload:method`. This lesson reads each one and runs the PostgreSQL equivalent right here.

## Key idea

Snowflake has a few conveniences that Postgres writes differently. `QUALIFY` filters **after** window functions are computed, as `HAVING` filters after `GROUP BY`; in Postgres, put the window function in a subquery and filter in the outer query. `IFF(c, a, b)` is `CASE WHEN c THEN a ELSE b END`.

A `VARIANT` column is read with `:` paths, as in `payload:method::string`; in Postgres that is `payload ->> 'method'` on a `jsonb` column. `ILIKE` (case-insensitive) and `DATE_TRUNC` exist in Postgres as they are.

The Snowflake syntax in this lesson is read only; the runnable query is the PostgreSQL equivalent. The figure at the end of this section shows which rows `QUALIFY` keeps after numbering within each order.

## Syntax

```text
-- Snowflake (read only)
SELECT order_id, status,
  IFF(status ILIKE 'captured',
    'paid', 'open') AS state,
  payload:method::string AS method
FROM raw_pay.events
QUALIFY row_number() OVER (
  PARTITION BY order_id
  ORDER BY at DESC) = 1;
```

```sql
-- PostgreSQL: filter outside
SELECT order_id, status
FROM (SELECT order_id, status,
    row_number() OVER (
      PARTITION BY order_id
      ORDER BY at DESC) AS rn
  FROM raw_pay.events) e
WHERE rn = 1;
```

- `IFF(c, a, b)` → `CASE WHEN c THEN a ELSE b END`.
- `v:key::string` → `v ->> 'key'`; `ILIKE` and `date_trunc` stay as they are.

## Example

Numbering the events within each order, newest first: this is the column `QUALIFY` would filter.

```sql
SELECT order_id, status, at,
  row_number() OVER (
    PARTITION BY order_id
    ORDER BY at DESC) AS rn
FROM raw_pay.events
ORDER BY order_id, rn;
```

A JSON path and `ILIKE`:

```sql
SELECT event_id,
  payload ->> 'method' AS method
FROM raw_pay.events
WHERE status ILIKE 'captured'
ORDER BY event_id;
```

## Common mistakes

Filtering a window function in `WHERE`: Postgres refuses, because `WHERE` runs first.

```sql
-- ERROR 42P20: window in WHERE
SELECT order_id, status
FROM raw_pay.events
WHERE row_number() OVER (
  PARTITION BY order_id
  ORDER BY at DESC) = 1;
```

Comparing mixed-case text with `=`: it misses `Captured` and `CAPTURED`.

```sql
-- WRONG: = is case-sensitive
SELECT count(*) AS captured
FROM raw_pay.events
WHERE status = 'captured';
```

```sql
-- FIX: ILIKE ignores case
SELECT count(*) AS captured
FROM raw_pay.events
WHERE status ILIKE 'captured';
```

## Practice

Four steps, each a Snowflake query rewritten in PostgreSQL: `QUALIFY`, a `:` path, `DATE_TRUNC` with `ILIKE`, then `IFF` on each order's newest event.

## Recap

- `QUALIFY` filters after window functions; Postgres does it with a subquery and an outer `WHERE`.
- `IFF(c, a, b)` is `CASE WHEN c THEN a ELSE b END`.
- `v:key::string` is `v ->> 'key'` on `jsonb`.
- `ILIKE` ignores case; `=` does not.
