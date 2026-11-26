---
id: e-st-l1-01
engine: stack
level: L1
module: ingest
title: Dữ liệu đi đường nào tới bảng của bạn
title_en: How data reaches your table
kind: concept
runtime: browser
minutes: 12
figures: [{ name: st-stack-map, at: idea }]
objectives:
  - vi: Kể đúng thứ tự các chặng từ nguồn tới dashboard và công cụ nào lo chặng nào.
    en: Name the stages from source to dashboard in order and which tool owns each.
  - vi: Nói ELT khác ETL ở đâu và vì sao chữ T giờ là SQL trong kho.
    en: Say where ELT differs from ETL and why the T is now SQL inside the warehouse.
  - vi: Biết vì sao người phân tích đọc mart thay vì bảng raw.
    en: Know why an analyst reads marts instead of raw tables.
requires: []
sources:
  - { url: "https://docs.getdbt.com/docs/build/models", title: "dbt docs: About dbt models" }
  - { url: "https://fivetran.com/docs/core-concepts/system-columns-and-tables", title: "Fivetran docs: System columns and tables" }
  - { url: "https://docs.airbyte.com/platform/understanding-airbyte/airbyte-metadata-fields", title: "Airbyte docs: Airbyte metadata fields" }
lab:
  setup: |
    CREATE SCHEMA raw_shop;
    CREATE TABLE raw_shop.orders (
      order_id int, customer_id int, status text, amount_vnd int,
      _fivetran_synced timestamp, _fivetran_deleted boolean
    );
    INSERT INTO raw_shop.orders VALUES
      (1, 11, 'PAID', 250000, '2026-10-30 23:10', false),
      (2, 12, 'paid', 120000, '2026-10-30 23:10', false),
      (3, 13, 'Cancelled', 90000, '2026-10-30 23:10', false),
      (4, 11, 'paid', 300000, '2026-10-31 01:05', true),
      (5, 14, 'pending', 60000, '2026-10-31 01:05', false);
  steps:
    - task:
        vi: "Doanh thu các đơn đã trả tiền còn ở nguồn, đọc thẳng bảng raw: trả một cột `revenue_vnd`. Trạng thái viết lẫn chữ hoa, chữ thường."
        en: "Revenue of paid orders still at the source, read straight from the raw table: return one column `revenue_vnd`. The status mixes upper and lower case."
      solution: |
        SELECT sum(amount_vnd) AS revenue_vnd
        FROM raw_shop.orders
        WHERE NOT _fivetran_deleted
          AND lower(status) = 'paid'
      check: rows
      hint:
        vi: "Hai việc của tầng staging: `WHERE NOT _fivetran_deleted` và `lower(status) = 'paid'`."
        en: "Two staging jobs: `WHERE NOT _fivetran_deleted` and `lower(status) = 'paid'`."
    - task:
        vi: "Số đơn theo trạng thái đã viết thường, bỏ dòng đã xóa ở nguồn: trả `status`, `orders`."
        en: "Order count per lower-cased status, leaving out rows deleted at the source: return `status`, `orders`."
      solution: |
        SELECT lower(status) AS status,
          count(*) AS orders
        FROM raw_shop.orders
        WHERE NOT _fivetran_deleted
        GROUP BY 1
      check: rows
      hint:
        vi: "`lower(status)` rồi `GROUP BY 1`."
        en: "`lower(status)` then `GROUP BY 1`."
quiz:
  - q:
      vi: "Trong mô hình ELT, việc làm sạch và tính toán dữ liệu diễn ra ở đâu?"
      en: "In the ELT pattern, where does cleaning and computing the data happen?"
    options:
      - { vi: "Trong công cụ nạp, trước khi dữ liệu vào kho", en: "In the ingestion tool, before the data lands" }
      - { vi: "Trong kho, bằng SQL, sau khi dữ liệu thô đã vào", en: "In the warehouse, in SQL, after raw data lands" }
      - { vi: "Trong dashboard, bằng công thức của từng biểu đồ", en: "In the dashboard, in each chart's formula" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì đó là cách ETL cũ làm. ELT đảo thứ tự: chép nguyên trạng trước (E, L), rồi biến đổi trong kho bằng SQL (T), như các model kiểu dbt. Dashboard không phải chỗ sửa số."
      en: "It sounds right because that is how classic ETL worked. ELT swaps the order: copy as is first (E, L), then transform inside the warehouse in SQL (T), as dbt-style models do. A dashboard is not the place to fix numbers."
  - q:
      vi: "Doanh thu tính thẳng trên `raw_shop.orders` cao hơn số trong mart. Lý do hợp lý nhất?"
      en: "Revenue computed straight on `raw_shop.orders` is higher than the mart's number. The most likely reason?"
    options:
      - { vi: "Mart làm tròn số tiền xuống nghìn đồng", en: "The mart rounds amounts down to thousands" }
      - { vi: "Bảng raw còn giữ dòng đã xóa ở nguồn", en: "The raw table still keeps rows deleted at the source" }
      - { vi: "Kho tính tổng sai khi bảng có nhiều dòng", en: "The warehouse sums wrongly on large tables" }
    answer: 1
    trap: 2
    why:
      vi: "Dễ đổ cho kho, nhưng kho cộng đúng. Bảng raw là bản chép nguyên: dòng bị xóa ở nguồn chỉ được đánh dấu (`_fivetran_deleted`), không biến mất. Model staging lọc chúng đi; tính trên raw thì cộng cả chúng."
      en: "It is tempting to blame the warehouse, but it adds correctly. A raw table is a plain copy: a row deleted at the source is only flagged (`_fivetran_deleted`), not removed. The staging model filters those out; summing raw counts them too."
---
## Mở bài

Mỗi con số bạn báo cáo ở Chợ Lồng Đèn đều đi qua một đường ống bạn không tự xây. Bài này vẽ đường ống đó từ đầu tới cuối, để khi một số lạ xuất hiện, bạn biết đi ngược về đâu.

## Ý chính

Dữ liệu xuất phát từ các **nguồn**: Postgres của app bán hàng, API của cổng thanh toán, một bảng tính chi phí quảng cáo. Một công cụ nạp như Fivetran hay Airbyte (gọi là EL: extract, load) chép nguyên trạng từng nguồn vào **kho dữ liệu** như Snowflake hay BigQuery, mỗi nguồn một schema `raw_`. Bản chép mang thêm cột hệ thống của công cụ, như `_fivetran_synced` (lần đồng bộ gần nhất) hay `_fivetran_deleted` (dòng đã xóa ở nguồn).

Sau đó dữ liệu được biến đổi ngay trong kho, bằng SQL. Đó là **ELT**: chép trước, biến đổi sau. Kiểu cũ **ETL** biến đổi trên một máy riêng trước khi nạp, nên dữ liệu thô không còn để xem lại. Ở ELT, các file `SELECT` (model kiểu dbt) xếp thành tầng: **staging** làm sạch từng nguồn (đổi tên, ép kiểu, bỏ dòng đã xóa), **intermediate** ghép các nguồn, **marts** là bảng sự kiện và chiều mà người phân tích đọc.

Người phân tích đứng ở cuối: đọc mart, biết mỗi mart một dòng là gì, và khi số sai thì lần ngược qua các tầng thay vì sửa tay trên dashboard. Hình cuối mục vẽ đủ các chặng ấy.

## Ví dụ

Bảng raw là bản chép nguyên: chữ hoa chữ thường lẫn lộn, và dòng 4 đã bị xóa ở nguồn nhưng vẫn nằm đây.

```sql
SELECT order_id, status, amount_vnd,
  _fivetran_deleted
FROM raw_shop.orders
ORDER BY order_id;
```

Chữ T của ELT là SQL chạy trong kho. Một view staging làm sạch nguồn này:

```sql
CREATE SCHEMA staging;
CREATE VIEW staging.stg_orders AS
SELECT order_id, customer_id,
  lower(status) AS status,
  amount_vnd
FROM raw_shop.orders
WHERE NOT _fivetran_deleted;
SELECT status, count(*) AS orders
FROM staging.stg_orders
GROUP BY status
ORDER BY status;
```

Mart đọc từ staging, không bao giờ đọc thẳng raw:

```sql
CREATE SCHEMA marts;
CREATE VIEW marts.fct_revenue AS
SELECT sum(amount_vnd) AS revenue_vnd
FROM staging.stg_orders
WHERE status = 'paid';
SELECT revenue_vnd
FROM marts.fct_revenue;
```

## Lỗi hay gặp

Tính số trên bảng raw: dòng đã xóa ở nguồn vẫn được cộng.

```sql
-- WRONG: raw rows, deleted ones too
SELECT sum(amount_vnd) AS revenue_vnd
FROM raw_shop.orders
WHERE lower(status) = 'paid';
```

```sql
-- FIX: read the mart
SELECT revenue_vnd
FROM marts.fct_revenue;
```

Hỏi một mart chưa ai xây: kho báo không có quan hệ đó. Hãy hỏi người lo đường ống, đừng tự dựng một bảng tạm rồi báo cáo từ đó.

```sql
-- ERROR 42P01
SELECT * FROM marts.fct_daily;
```

## Tóm tắt

- Nguồn → công cụ nạp (Fivetran, Airbyte) → schema `raw_` trong kho → staging → intermediate → marts → dashboard.
- ELT: chép nguyên trạng trước, biến đổi trong kho bằng SQL sau.
- Bảng raw giữ cả dòng đã xóa ở nguồn, đánh dấu bằng cột hệ thống.
- Người phân tích đọc mart; số sai thì lần ngược các tầng, không sửa tay.

# EN

## Opening

Every number you report at Lantern Market passes through a pipeline you did not build. This lesson draws that pipeline end to end, so when an odd number shows up you know where to walk back to.

## Key idea

Data starts in the **sources**: the shop app's Postgres, the payment gateway's API, a marketing-spend spreadsheet. An ingestion tool such as Fivetran or Airbyte (called EL: extract, load) copies each source as it is into a **warehouse** such as Snowflake or BigQuery, one `raw_` schema per source. The copy carries the tool's system columns, such as `_fivetran_synced` (the last sync) or `_fivetran_deleted` (a row deleted at the source).

Then the data is transformed inside the warehouse, in SQL. That is **ELT**: copy first, transform after. Classic **ETL** transformed on a separate machine before loading, so the raw data was no longer there to look at. In ELT, `SELECT` files (dbt-style models) form layers: **staging** cleans one source (renames, casts, drops deleted rows), **intermediate** combines sources, and **marts** are the fact and dimension tables the analyst reads.

The analyst stands at the end: reads marts, knows what one row of each mart is, and when a number is wrong walks back through the layers instead of patching the dashboard. The figure at the end of this section draws all of these stages.

## Example

A raw table is a plain copy: mixed upper and lower case, and row 4 was deleted at the source but still sits here.

```sql
SELECT order_id, status, amount_vnd,
  _fivetran_deleted
FROM raw_shop.orders
ORDER BY order_id;
```

The T of ELT is SQL running in the warehouse. A staging view cleans this source:

```sql
CREATE SCHEMA staging;
CREATE VIEW staging.stg_orders AS
SELECT order_id, customer_id,
  lower(status) AS status,
  amount_vnd
FROM raw_shop.orders
WHERE NOT _fivetran_deleted;
SELECT status, count(*) AS orders
FROM staging.stg_orders
GROUP BY status
ORDER BY status;
```

A mart reads from staging, never straight from raw:

```sql
CREATE SCHEMA marts;
CREATE VIEW marts.fct_revenue AS
SELECT sum(amount_vnd) AS revenue_vnd
FROM staging.stg_orders
WHERE status = 'paid';
SELECT revenue_vnd
FROM marts.fct_revenue;
```

## Common mistakes

Computing on the raw table: rows deleted at the source are still added up.

```sql
-- WRONG: raw rows, deleted ones too
SELECT sum(amount_vnd) AS revenue_vnd
FROM raw_shop.orders
WHERE lower(status) = 'paid';
```

```sql
-- FIX: read the mart
SELECT revenue_vnd
FROM marts.fct_revenue;
```

Asking for a mart nobody has built: the warehouse says the relation does not exist. Ask whoever runs the pipeline; do not build a scratch table and report from it.

```sql
-- ERROR 42P01
SELECT * FROM marts.fct_daily;
```

## Recap

- Source → ingestion tool (Fivetran, Airbyte) → `raw_` schemas in the warehouse → staging → intermediate → marts → dashboard.
- ELT: copy as is first, transform in the warehouse in SQL after.
- Raw tables keep rows deleted at the source, flagged by a system column.
- The analyst reads marts; a wrong number means walking back through the layers, not patching by hand.
