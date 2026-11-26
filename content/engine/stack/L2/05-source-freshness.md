---
id: e-st-l2-05
engine: stack
level: L2
module: dbt
title: "Source freshness: dữ liệu hôm nay đã về chưa"
title_en: "Source freshness: is today's data in?"
kind: lab
runtime: browser
minutes: 25
figures: [{ name: st-freshness, at: idea }]
objectives:
  - vi: Đo độ trễ của một nguồn bằng mốc `_fivetran_synced` mới nhất so với giờ hiện tại.
    en: Measure a source's lag from its newest `_fivetran_synced` against the current time.
  - vi: Xếp từng bảng nguồn vào qua, cảnh báo hay lỗi theo hai ngưỡng `warn_after` và `error_after`.
    en: Sort each source table into pass, warn or error with the two thresholds `warn_after` and `error_after`.
  - vi: Biết vì sao không đo độ tươi bằng ngày nghiệp vụ hay bằng một số chung cho cả nguồn.
    en: Know why freshness is not measured on a business date or with one number for a whole source.
requires: [e-st-l2-04]
sources:
  - { url: "https://docs.getdbt.com/reference/resource-properties/freshness", title: "dbt docs: freshness" }
  - { url: "https://docs.getdbt.com/reference/commands/source", title: "dbt docs: source command" }
  - { url: "https://fivetran.com/docs/core-concepts/system-columns-and-tables", title: "Fivetran docs: System columns and tables" }
lab:
  setup: |
    CREATE SCHEMA raw_shop;
    CREATE SCHEMA raw_pay;
    CREATE SCHEMA raw_ads;
    CREATE TABLE raw_shop.orders (
      order_id int, amount_vnd int,
      _fivetran_synced timestamp
    );
    INSERT INTO raw_shop.orders VALUES
      (501, 250000, '2026-10-30 22:05'),
      (502, 120000, '2026-10-31 03:10'),
      (503, 90000, '2026-10-31 07:40');
    CREATE TABLE raw_pay.payments (
      payment_id int, order_id int,
      _fivetran_synced timestamp
    );
    INSERT INTO raw_pay.payments VALUES
      (9101, 501, '2026-10-30 21:30'),
      (9102, 502, '2026-10-30 22:10');
    CREATE TABLE raw_ads.spend (
      day date, cost_vnd int,
      _fivetran_synced timestamp
    );
    INSERT INTO raw_ads.spend VALUES
      ('2026-10-29', 800000, '2026-10-29 06:00'),
      ('2026-10-30', 900000, '2026-10-29 06:00'),
      ('2026-10-31', 900000, '2026-10-29 06:00');
  steps:
    - task:
        vi: "Lần đồng bộ cuối của nguồn `shop`, bảng `orders`: một dòng, cột `last_synced` là `_fivetran_synced` mới nhất."
        en: "The last sync of source `shop`, table `orders`: one row, column `last_synced` is the newest `_fivetran_synced`."
      solution: |
        select max(_fivetran_synced)
          as last_synced
        from {{ source('shop', 'orders') }}
      check: rows
      hint:
        vi: "`max(_fivetran_synced)` trên `{{ source('shop', 'orders') }}`."
        en: "`max(_fivetran_synced)` on `{{ source('shop', 'orders') }}`."
    - task:
        vi: "Dựng model `src_freshness` (staging, view): mỗi bảng nguồn một dòng, cột `tbl` (`orders`, `payments`, `spend`) và `last_synced`. Đọc ba bảng bằng `source()`: `shop`/`orders`, `pay`/`payments`, `ads`/`spend`."
        en: "Build model `src_freshness` (staging, a view): one row per source table, columns `tbl` (`orders`, `payments`, `spend`) and `last_synced`. Read the three tables with `source()`: `shop`/`orders`, `pay`/`payments`, `ads`/`spend`."
      model: { name: src_freshness, layer: staging, materialized: view }
      solution: |
        select 'orders' as tbl,
          max(_fivetran_synced) as last_synced
        from {{ source('shop', 'orders') }}
        union all
        select 'payments',
          max(_fivetran_synced)
        from {{ source('pay', 'payments') }}
        union all
        select 'spend', max(_fivetran_synced)
        from {{ source('ads', 'spend') }}
      after: SELECT tbl, last_synced FROM staging.src_freshness
      check: rows
      hint:
        vi: "Ba câu `select '…' as tbl, max(_fivetran_synced)` nối bằng `union all`, mỗi câu một `source()`."
        en: "Three `select '…' as tbl, max(_fivetran_synced)` queries joined with `union all`, one `source()` each."
    - task:
        vi: "Giờ hiện tại là `2026-10-31 08:00`. Từ `{{ ref('src_freshness') }}`: mỗi bảng, `hours_late` (số giờ từ `last_synced` tới giờ hiện tại, làm tròn 1 chữ số) và `status`: `error` khi trễ hơn 24 giờ, `warn` khi trễ hơn 6 giờ, còn lại `pass`."
        en: "The current time is `2026-10-31 08:00`. From `{{ ref('src_freshness') }}`: for each table, `hours_late` (hours from `last_synced` to now, rounded to 1 decimal) and `status`: `error` when more than 24 hours late, `warn` when more than 6, else `pass`."
      solution: |
        select tbl, hours_late,
          case
            when hours_late > 24 then 'error'
            when hours_late > 6 then 'warn'
            else 'pass'
          end as status
        from (
          select tbl, round(extract(epoch
            from timestamp '2026-10-31 08:00'
              - last_synced) / 3600, 1)
            as hours_late
          from {{ ref('src_freshness') }}
        ) f
      check: rows
      hint:
        vi: "`extract(epoch from <now> - last_synced) / 3600` cho số giờ; xét `error` trước `warn`."
        en: "`extract(epoch from <now> - last_synced) / 3600` gives hours; test `error` before `warn`."
quiz:
  - q:
      vi: "Nguồn thanh toán có `warn_after` 6 giờ, `error_after` 24 giờ. Lần đồng bộ cuối lúc 22:10 ngày 30/10, bây giờ là 08:00 ngày 31/10. Trạng thái là gì?"
      en: "The payments source has `warn_after` 6 hours, `error_after` 24 hours. Its last sync was at 22:10 on 30 Oct, and it is now 08:00 on 31 Oct. What is the status?"
    options:
      - { vi: "Qua, vì chưa tới 24 giờ", en: "Pass, because it is under 24 hours" }
      - { vi: "Cảnh báo, vì trễ quá 6 giờ", en: "Warn, because it is over 6 hours late" }
      - { vi: "Lỗi, vì dữ liệu là của hôm qua", en: "Error, because the data is from yesterday" }
    answer: 1
    trap: 0
    why:
      vi: "\"Chưa tới 24 giờ\" nghe như qua, nhưng 24 giờ là ngưỡng **lỗi**, không phải ngưỡng duy nhất. Từ 22:10 tới 08:00 là 9 giờ 50 phút, tức 9,8 giờ: lớn hơn 6 (cảnh báo) và nhỏ hơn 24 (lỗi), nên là cảnh báo. \"Của hôm qua\" không phải luật nào: freshness chỉ đo số giờ trễ."
      en: "\"Under 24 hours\" sounds like a pass, but 24 hours is the **error** threshold, not the only one. From 22:10 to 08:00 is 9 hours 50 minutes, that is 9.8 hours: more than 6 (warn) and less than 24 (error), so it warns. \"From yesterday\" is not a rule at all: freshness only measures hours late."
  - q:
      vi: "Bảng chi phí quảng cáo có dòng ngày 31/10, nhưng lần đồng bộ cuối là 06:00 ngày 29/10. Với `error_after` 24 giờ, lúc 08:00 ngày 31/10 nguồn này ra sao?"
      en: "The ad spend table has a row dated 31 Oct, but its last sync was at 06:00 on 29 Oct. With `error_after` 24 hours, at 08:00 on 31 Oct how does this source stand?"
    options:
      - { vi: "Tươi, vì đã có dòng của hôm nay", en: "Fresh, because today's row is already there" }
      - { vi: "Không biết được nếu chưa đếm số dòng", en: "Cannot tell without counting the rows" }
      - { vi: "Lỗi, vì đã trễ 50 giờ", en: "Error, because it is 50 hours late" }
    answer: 2
    trap: 0
    why:
      vi: "Dòng ngày 31/10 trông như dữ liệu hôm nay đã về, nhưng đó là ngày nghiệp vụ người nhập gõ trước vào bảng tính, không phải lúc dữ liệu tới kho. Freshness đo bằng `_fivetran_synced`: từ 06:00 ngày 29 tới 08:00 ngày 31 là 48 + 2 = 50 giờ, quá 24 nên là lỗi. Đếm số dòng cũng không nói gì về độ trễ."
      en: "The 31 Oct row looks like today's data is in, but that is a business date someone typed into the sheet ahead of time, not when the data reached the warehouse. Freshness is measured on `_fivetran_synced`: from 06:00 on the 29th to 08:00 on the 31st is 48 + 2 = 50 hours, over 24, so it is an error. Counting rows says nothing about lag either."
---
## Mở bài

Sáng 31/10, trưởng nhóm của Chợ Lồng Đèn hỏi vì sao doanh thu thanh toán hôm qua thấp. Trước khi tìm lỗi trong số, hãy hỏi một câu đơn giản hơn: dữ liệu hôm qua đã về kho chưa.

## Ý chính

**Độ tươi** (freshness) của một nguồn là khoảng cách từ lần dữ liệu về kho gần nhất tới bây giờ. Mốc đúng là cột hệ thống của công cụ nạp, như `_fivetran_synced`, vì nó ghi lúc dòng tới kho. Ngày trong dữ liệu (ngày đơn, ngày chi) là ngày nghiệp vụ: nó có thể được gõ trước hoặc về trễ, nên không nói gì về đường ống.

dbt khai báo freshness cho từng bảng nguồn: cột mốc (`loaded_at_field`) và hai ngưỡng. Quá `warn_after` là **cảnh báo**, quá `error_after` là **lỗi**. Lệnh kiểm tra chạy một câu `max()` trên cột mốc của mỗi bảng rồi so với giờ hiện tại; mỗi bảng có trạng thái riêng.

Người phân tích chạy kiểm tra này trước khi gửi số. Một bảng trễ thì ghi rõ trên báo cáo số liệu tới giờ nào, và báo người lo connector. Hình cuối mục đặt ba bảng nguồn lên cùng một đồng hồ với hai ngưỡng.

## Cú pháp

```text
# models/staging/sources.yml
sources:
  - name: pay
    schema: raw_pay
    config:
      loaded_at_field: _fivetran_synced
      freshness:
        warn_after:
          {count: 6, period: hour}
        error_after:
          {count: 24, period: hour}
    tables:
      - name: payments
```

```sql
-- what the check runs per table
SELECT max(_fivetran_synced)
FROM raw_pay.payments;
```

- `period` là `minute`, `hour` hoặc `day`; mỗi ngưỡng cần cả `count` và `period`.
- Lệnh `dbt source freshness` (bản mới: `dbt freshness`) chạy kiểm tra; ở đây bạn viết câu đó bằng SQL.

## Ví dụ

Lần đồng bộ cuối của mỗi bảng nguồn:

```sql
SELECT 'payments' AS tbl,
  max(_fivetran_synced) AS last_synced
FROM raw_pay.payments
UNION ALL
SELECT 'spend', max(_fivetran_synced)
FROM raw_ads.spend;
```

Số giờ trễ của bảng thanh toán lúc 08:00 ngày 31/10 (9 giờ 50 phút):

```sql
SELECT round(extract(epoch FROM
  timestamp '2026-10-31 08:00'
  - max(_fivetran_synced)) / 3600, 1)
  AS hours_late
FROM raw_pay.payments;
```

## Lỗi hay gặp

Đo độ tươi bằng ngày nghiệp vụ: bảng chi phí có dòng ngày 31/10 nên trông như đã cập nhật.

```sql
-- WRONG: the business date says fresh
SELECT max(day) AS newest
FROM raw_ads.spend;
```

```sql
-- FIX: when the data reached the store
SELECT max(_fivetran_synced) AS newest
FROM raw_ads.spend;
```

Một số chung cho cả đường ống: bảng đơn mới đồng bộ lúc 07:40 che mất bảng chi phí trễ hai ngày.

```sql
-- WRONG: one max over every table
SELECT max(s) AS last_synced FROM (
  SELECT _fivetran_synced s
  FROM raw_shop.orders
  UNION ALL
  SELECT _fivetran_synced
  FROM raw_ads.spend) t;
```

```sql
-- FIX: one row per table
SELECT 'orders' AS tbl,
  max(_fivetran_synced) AS last_synced
FROM raw_shop.orders
UNION ALL
SELECT 'spend', max(_fivetran_synced)
FROM raw_ads.spend;
```

## Thực hành

Ba bước: lần đồng bộ cuối của bảng đơn, rồi một model `src_freshness` gom mốc của ba bảng nguồn, rồi trạng thái của từng bảng lúc 08:00 ngày 31/10. Đọc nguồn bằng `source()` và đọc model bằng `ref()`, như một kiểm tra freshness thật.

## Tóm tắt

- Độ tươi = bây giờ trừ mốc nạp mới nhất (`_fivetran_synced`), tính cho từng bảng.
- Hai ngưỡng: quá `warn_after` là cảnh báo, quá `error_after` là lỗi.
- Đừng đo bằng ngày nghiệp vụ; đừng gộp mọi bảng vào một số.
- Bảng trễ thì ghi giờ dữ liệu trên báo cáo và báo người lo connector.

# EN

## Opening

On the morning of 31 Oct, Lantern Market's team lead asks why yesterday's payment revenue is low. Before hunting for an error in the number, ask a simpler question: has yesterday's data reached the warehouse yet?

## Key idea

A source's **freshness** is the gap between the last time data reached the warehouse and now. The right mark is the loader's system column, such as `_fivetran_synced`, because it records when a row arrived. Dates inside the data (order date, spend date) are business dates: they can be typed ahead or arrive late, so they say nothing about the pipeline.

dbt declares freshness per source table: the mark column (`loaded_at_field`) and two thresholds. Past `warn_after` is a **warning**, past `error_after` is an **error**. The check runs one `max()` on each table's mark column and compares it with the current time; every table gets its own status.

An analyst runs this check before sending a number. When a table is late, state on the report how far the data runs, and tell the connector's owner. The figure at the end of this section puts three source tables on one clock with the two thresholds.

## Syntax

```text
# models/staging/sources.yml
sources:
  - name: pay
    schema: raw_pay
    config:
      loaded_at_field: _fivetran_synced
      freshness:
        warn_after:
          {count: 6, period: hour}
        error_after:
          {count: 24, period: hour}
    tables:
      - name: payments
```

```sql
-- what the check runs per table
SELECT max(_fivetran_synced)
FROM raw_pay.payments;
```

- `period` is `minute`, `hour` or `day`; each threshold needs both `count` and `period`.
- The command `dbt source freshness` (newer: `dbt freshness`) runs the check; here you write that query in SQL.

## Example

The last sync of each source table:

```sql
SELECT 'payments' AS tbl,
  max(_fivetran_synced) AS last_synced
FROM raw_pay.payments
UNION ALL
SELECT 'spend', max(_fivetran_synced)
FROM raw_ads.spend;
```

The payments table's hours late at 08:00 on 31 Oct (9 hours 50 minutes):

```sql
SELECT round(extract(epoch FROM
  timestamp '2026-10-31 08:00'
  - max(_fivetran_synced)) / 3600, 1)
  AS hours_late
FROM raw_pay.payments;
```

## Common mistakes

Measuring freshness on a business date: the spend table has a row dated 31 Oct, so it looks up to date.

```sql
-- WRONG: the business date says fresh
SELECT max(day) AS newest
FROM raw_ads.spend;
```

```sql
-- FIX: when the data reached the store
SELECT max(_fivetran_synced) AS newest
FROM raw_ads.spend;
```

One number for the whole pipeline: the orders table, synced at 07:40, hides a spend table two days late.

```sql
-- WRONG: one max over every table
SELECT max(s) AS last_synced FROM (
  SELECT _fivetran_synced s
  FROM raw_shop.orders
  UNION ALL
  SELECT _fivetran_synced
  FROM raw_ads.spend) t;
```

```sql
-- FIX: one row per table
SELECT 'orders' AS tbl,
  max(_fivetran_synced) AS last_synced
FROM raw_shop.orders
UNION ALL
SELECT 'spend', max(_fivetran_synced)
FROM raw_ads.spend;
```

## Practice

Three steps: the orders table's last sync, then a model `src_freshness` gathering the marks of the three source tables, then each table's status at 08:00 on 31 Oct. Read sources with `source()` and the model with `ref()`, as a real freshness check does.

## Recap

- Freshness = now minus the newest load mark (`_fivetran_synced`), per table.
- Two thresholds: past `warn_after` warns, past `error_after` errors.
- Do not measure on a business date; do not merge every table into one number.
- When a table is late, state the data's time on the report and tell the connector's owner.
