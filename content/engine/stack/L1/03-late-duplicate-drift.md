---
id: e-st-l1-03
engine: stack
level: L1
module: ingest
title: Dữ liệu trễ, trùng và lệch schema
title_en: Late, duplicate and drifting data
kind: lab
runtime: browser
minutes: 20
figures: [{ name: st-late-arrival, at: idea }]
objectives:
  - vi: Gom số theo ngày nghiệp vụ, không theo ngày đồng bộ, và tìm dòng về trễ.
    en: Group numbers by business date, not sync date, and find rows that arrived late.
  - vi: Phát hiện bản giao trùng và cộng tiền không bị đếm hai lần.
    en: Spot duplicate deliveries and add up money without counting it twice.
  - vi: Viết câu không gãy khi nguồn thêm một cột mới.
    en: Write queries that do not break when the source adds a new column.
requires: [e-st-l1-02]
sources:
  - { url: "https://fivetran.com/docs/core-concepts/system-columns-and-tables", title: "Fivetran docs: System columns and tables" }
  - { url: "https://docs.airbyte.com/platform/understanding-airbyte/airbyte-metadata-fields", title: "Airbyte docs: Airbyte metadata fields" }
  - { url: "https://docs.airbyte.com/platform/using-airbyte/core-concepts/sync-modes/incremental-append", title: "Airbyte docs: Incremental Sync - Append" }
  - https://www.postgresql.org/docs/18/sql-insert.html
lab:
  setup: |
    CREATE SCHEMA raw_shop;
    CREATE SCHEMA raw_pay;
    CREATE TABLE raw_shop.orders (
      order_id int, order_date date,
      amount_vnd int,
      _fivetran_synced timestamp,
      _fivetran_deleted boolean
    );
    INSERT INTO raw_shop.orders VALUES
      (201, '2026-10-29', 100000, '2026-10-29 23:00', false),
      (202, '2026-10-29', 150000, '2026-10-29 23:00', false),
      (203, '2026-10-30', 200000, '2026-10-30 23:00', false);
    ALTER TABLE raw_shop.orders ADD COLUMN voucher_code text;
    INSERT INTO raw_shop.orders VALUES
      (204, '2026-10-30', 50000, '2026-10-31 11:00', false, 'LANTERN10'),
      (205, '2026-10-31', 80000, '2026-10-31 11:00', false, 'LANTERN10');
    CREATE TABLE raw_pay.events (
      _airbyte_raw_id text,
      _airbyte_extracted_at timestamp,
      payment_id int, amount_vnd int
    );
    INSERT INTO raw_pay.events VALUES
      ('b1', '2026-10-30 23:00', 9101, 100000),
      ('b2', '2026-10-30 23:00', 9102, 150000),
      ('b3', '2026-10-31 11:00', 9102, 150000),
      ('b4', '2026-10-31 11:00', 9103, 200000);
  steps:
    - task:
        vi: "Doanh thu theo ngày đặt hàng (`order_date`), bỏ dòng đã xóa ở nguồn: trả `order_date`, `revenue_vnd`, xếp theo ngày tăng dần."
        en: "Revenue by order date (`order_date`), leaving out rows deleted at the source: return `order_date`, `revenue_vnd`, sorted by date ascending."
      solution: |
        SELECT order_date,
          sum(amount_vnd) AS revenue_vnd
        FROM raw_shop.orders
        WHERE NOT _fivetran_deleted
        GROUP BY order_date
        ORDER BY order_date
      check: rows
      ordered: true
      hint:
        vi: "Nhóm theo `order_date`, không theo ngày của `_fivetran_synced`."
        en: "Group by `order_date`, not by the date of `_fivetran_synced`."
    - task:
        vi: "Báo cáo ngày được chốt lúc 06:00 sáng hôm sau, tức 30 giờ sau đầu ngày đặt hàng. Tìm các đơn về kho sau mốc đó: trả `order_id`, `order_date`."
        en: "A day's report is closed at 06:00 the next morning, 30 hours after the start of the order date. Find the orders that reached the warehouse after that: return `order_id`, `order_date`."
      solution: |
        SELECT order_id, order_date
        FROM raw_shop.orders
        WHERE _fivetran_synced
          > order_date + interval '30 hours'
      check: rows
      hint:
        vi: "So `_fivetran_synced` với `order_date + interval '30 hours'`."
        en: "Compare `_fivetran_synced` with `order_date + interval '30 hours'`."
    - task:
        vi: "Airbyte giao mỗi bản ghi ít nhất một lần, nên đôi khi giao hai lần. Tìm các thanh toán có hơn một bản trong `raw_pay.events`: trả `payment_id`, `copies`."
        en: "Airbyte delivers each record at least once, so sometimes twice. Find the payments with more than one copy in `raw_pay.events`: return `payment_id`, `copies`."
      solution: |
        SELECT payment_id, count(*) AS copies
        FROM raw_pay.events
        GROUP BY payment_id
        HAVING count(*) > 1
      check: rows
      hint:
        vi: "`GROUP BY payment_id HAVING count(*) > 1`."
        en: "`GROUP BY payment_id HAVING count(*) > 1`."
    - task:
        vi: "Tổng tiền thanh toán, mỗi `payment_id` chỉ tính một lần (bản mới nhất): trả một cột `total_vnd`."
        en: "Total payment amount, each `payment_id` counted once (its newest copy): return one column `total_vnd`."
      solution: |
        SELECT sum(amount_vnd) AS total_vnd
        FROM (
          SELECT DISTINCT ON (payment_id)
            payment_id, amount_vnd
          FROM raw_pay.events
          ORDER BY payment_id,
            _airbyte_extracted_at DESC
        ) p
      check: rows
      hint:
        vi: "Bỏ trùng trong một truy vấn con bằng `DISTINCT ON (payment_id)`, rồi `sum` bên ngoài."
        en: "Remove duplicates in a subquery with `DISTINCT ON (payment_id)`, then `sum` outside it."
    - task:
        vi: "Cột `voucher_code` mới xuất hiện; các đơn cũ có giá trị NULL ở cột đó. Đếm đơn theo mã giảm giá, đơn không có mã ghi `none`: trả `voucher`, `orders`."
        en: "Column `voucher_code` just appeared; older orders hold NULL there. Count orders per voucher, writing `none` for orders without one: return `voucher`, `orders`."
      solution: |
        SELECT coalesce(voucher_code, 'none')
            AS voucher,
          count(*) AS orders
        FROM raw_shop.orders
        GROUP BY 1
      check: rows
      hint:
        vi: "`coalesce(voucher_code, 'none')` thay NULL bằng `none`."
        en: "`coalesce(voucher_code, 'none')` replaces NULL with `none`."
quiz:
  - q:
      vi: "Đơn ngày 30/10 về kho lúc 11:00 ngày 31/10, sau khi báo cáo ngày 30 đã gửi. Cách xử lý nào đúng?"
      en: "An order from 30 Oct reaches the warehouse at 11:00 on 31 Oct, after the 30 Oct report was sent. Which handling is right?"
    options:
      - { vi: "Cộng nó vào ngày 31, ngày nó về kho", en: "Add it to 31 Oct, the day it arrived" }
      - { vi: "Bỏ nó đi vì báo cáo ngày 30 đã chốt", en: "Drop it because the 30 Oct report is closed" }
      - { vi: "Tính lại ngày 30 theo ngày đặt hàng", en: "Recompute 30 Oct by the order date" }
    answer: 2
    trap: 0
    why:
      vi: "Cộng vào ngày về kho nghe tiện, nhưng làm sai cả hai ngày. Số nghiệp vụ gom theo ngày đặt hàng; dòng trễ nghĩa là ngày cũ phải được tính lại, và báo cáo nên ghi rõ giờ chốt."
      en: "Adding it to the arrival day sounds convenient, but it makes both days wrong. Business numbers group by order date; a late row means the old day must be recomputed, and the report should state its cut-off time."
  - q:
      vi: "Nguồn thêm cột `voucher_code`. Câu nào trong model dễ gãy nhất?"
      en: "The source adds a column `voucher_code`. Which statement in a model breaks most easily?"
    options:
      - { vi: "`INSERT INTO t SELECT * FROM raw`", en: "`INSERT INTO t SELECT * FROM raw`" }
      - { vi: "`SELECT order_id, amount_vnd FROM raw`", en: "`SELECT order_id, amount_vnd FROM raw`" }
      - { vi: "`SELECT count(*) FROM raw`", en: "`SELECT count(*) FROM raw`" }
    answer: 0
    trap: 2
    why:
      vi: "`count(*)` trông có vẻ đụng tới mọi cột, nhưng nó chỉ đếm dòng nên không đổi. `SELECT *` đổ thêm một cột vào bảng đích có số cột cũ, và `INSERT` báo lỗi. Gọi tên cột thì cột mới không ảnh hưởng."
      en: "`count(*)` looks like it touches every column, but it only counts rows, so it does not change. `SELECT *` pours one more column into a target with the old column count, and the `INSERT` fails. Naming the columns keeps a new column harmless."
---
## Mở bài

Đường ống ở Chợ Lồng Đèn không gửi dữ liệu đúng giờ, đúng một lần và đúng hình dạng. Bài này luyện ba thói quen giữ số đúng khi dữ liệu về trễ, về hai lần, hoặc đổi hình dạng.

## Ý chính

**Trễ.** Công cụ nạp chạy theo lịch, nên một đơn đặt hôm qua có thể chỉ về kho sáng nay. Gom số theo ngày nghiệp vụ (`order_date`), không theo ngày đồng bộ (`_fivetran_synced`). Báo cáo một ngày nên ghi giờ chốt, và một ngày đã báo có thể phải tính lại khi dòng trễ về.

**Trùng.** Nhiều công cụ hứa giao **ít nhất một lần**: khi lỗi mạng, cùng một bản ghi có thể được giao lại với `_airbyte_raw_id` mới. Bỏ trùng theo khóa nghiệp vụ (`payment_id`), không theo id của công cụ.

**Lệch schema.** Khi nguồn thêm cột, công cụ nạp thường thêm cột đó vào bảng raw, và các dòng cũ mang NULL. Câu gọi tên cột vẫn chạy; câu dùng `SELECT *` để đổ vào bảng khác thì gãy. Dùng `coalesce` khi cột mới còn trống ở dữ liệu cũ.

Hình cuối mục cho thấy một ngày nhận thêm đơn sau khi báo cáo đã gửi.

## Cú pháp

```sql
-- late: arrived after the cut-off
WHERE _fivetran_synced
  > order_date + interval '30 hours'
-- duplicate deliveries
GROUP BY key HAVING count(*) > 1
-- a new column, NULL in old rows
coalesce(new_col, 'none')
-- name the columns, never SELECT *
INSERT INTO t (a, b) SELECT a, b ...
```

- `interval '30 hours'`: 24 giờ của ngày đặt hàng cộng 6 giờ tới lúc chốt.
- `DISTINCT ON` ở bài trước bỏ trùng theo khóa nghiệp vụ.

## Ví dụ

Đơn 204 thuộc ngày 30 nhưng về kho trưa ngày 31:

```sql
SELECT order_id, order_date,
  _fivetran_synced
FROM raw_shop.orders
ORDER BY order_id;
```

Thanh toán 9102 có hai bản với hai `_airbyte_raw_id` khác nhau:

```sql
SELECT payment_id, _airbyte_raw_id
FROM raw_pay.events
ORDER BY payment_id, _airbyte_raw_id;
```

Cột `voucher_code` là NULL ở các đơn về trước khi cột xuất hiện:

```sql
SELECT order_id, voucher_code
FROM raw_shop.orders
ORDER BY order_id;
```

## Lỗi hay gặp

Gom theo ngày đồng bộ đẩy đơn 204 sang ngày 31:

```sql
-- WRONG: grouped by sync date
SELECT _fivetran_synced::date AS day,
  sum(amount_vnd) AS revenue_vnd
FROM raw_shop.orders
GROUP BY 1 ORDER BY 1;
```

```sql
-- FIX: grouped by business date
SELECT order_date AS day,
  sum(amount_vnd) AS revenue_vnd
FROM raw_shop.orders
GROUP BY 1 ORDER BY 1;
```

Cộng cả bản giao trùng:

```sql
-- WRONG: 9102 counted twice
SELECT sum(amount_vnd) AS total_vnd
FROM raw_pay.events;
```

```sql
-- FIX: one copy per payment
SELECT sum(amount_vnd) AS total_vnd
FROM (SELECT DISTINCT ON (payment_id)
    payment_id, amount_vnd
  FROM raw_pay.events
  ORDER BY payment_id) p;
```

Bảng đích có số cột cũ, nguồn đã thêm một cột: `SELECT *` gãy.

```sql
CREATE TABLE report_orders (
  order_id int, order_date date,
  amount_vnd int,
  _fivetran_synced timestamp,
  _fivetran_deleted boolean);
-- ERROR 42601
INSERT INTO report_orders
SELECT * FROM raw_shop.orders;
```

## Thực hành

Năm câu hỏi: doanh thu theo ngày đặt hàng, đơn về trễ, thanh toán bị giao trùng, tổng tiền không trùng, và đếm đơn theo cột mới.

## Tóm tắt

- Gom số theo ngày nghiệp vụ; ghi giờ chốt và tính lại ngày cũ khi dòng trễ về.
- "Ít nhất một lần" nghĩa là có thể trùng: bỏ trùng theo khóa nghiệp vụ.
- Cột mới mang NULL ở dòng cũ: `coalesce` khi cần.
- Gọi tên cột; `SELECT *` vào một bảng khác sẽ gãy khi nguồn đổi hình dạng.

# EN

## Opening

The pipeline at Lantern Market does not deliver data on time, exactly once and in the same shape. This lesson practises three habits that keep numbers right when data arrives late, twice, or in a new shape.

## Key idea

**Late.** The ingestion tool runs on a schedule, so an order placed yesterday may only reach the warehouse this morning. Group numbers by business date (`order_date`), not by sync date (`_fivetran_synced`). A day's report should state its cut-off time, and a day already reported may need recomputing when a late row arrives.

**Duplicate.** Many tools promise **at-least-once** delivery: after a network error the same record can be delivered again with a new `_airbyte_raw_id`. Deduplicate on the business key (`payment_id`), not on the tool's id.

**Schema drift.** When the source adds a column, the ingestion tool usually adds it to the raw table too, and older rows hold NULL. Queries that name their columns keep running; a `SELECT *` poured into another table breaks. Use `coalesce` while the new column is empty in old data.

The figure at the end of this section shows a day receiving one more order after its report was sent.

## Syntax

```sql
-- late: arrived after the cut-off
WHERE _fivetran_synced
  > order_date + interval '30 hours'
-- duplicate deliveries
GROUP BY key HAVING count(*) > 1
-- a new column, NULL in old rows
coalesce(new_col, 'none')
-- name the columns, never SELECT *
INSERT INTO t (a, b) SELECT a, b ...
```

- `interval '30 hours'`: the order date's 24 hours plus 6 hours until the cut-off.
- `DISTINCT ON` from the previous lesson removes duplicates by business key.

## Example

Order 204 belongs to 30 Oct but reached the warehouse at noon on 31 Oct:

```sql
SELECT order_id, order_date,
  _fivetran_synced
FROM raw_shop.orders
ORDER BY order_id;
```

Payment 9102 has two copies with two different `_airbyte_raw_id` values:

```sql
SELECT payment_id, _airbyte_raw_id
FROM raw_pay.events
ORDER BY payment_id, _airbyte_raw_id;
```

Column `voucher_code` is NULL on orders that arrived before the column existed:

```sql
SELECT order_id, voucher_code
FROM raw_shop.orders
ORDER BY order_id;
```

## Common mistakes

Grouping by sync date pushes order 204 to 31 Oct:

```sql
-- WRONG: grouped by sync date
SELECT _fivetran_synced::date AS day,
  sum(amount_vnd) AS revenue_vnd
FROM raw_shop.orders
GROUP BY 1 ORDER BY 1;
```

```sql
-- FIX: grouped by business date
SELECT order_date AS day,
  sum(amount_vnd) AS revenue_vnd
FROM raw_shop.orders
GROUP BY 1 ORDER BY 1;
```

Adding up the duplicate delivery:

```sql
-- WRONG: 9102 counted twice
SELECT sum(amount_vnd) AS total_vnd
FROM raw_pay.events;
```

```sql
-- FIX: one copy per payment
SELECT sum(amount_vnd) AS total_vnd
FROM (SELECT DISTINCT ON (payment_id)
    payment_id, amount_vnd
  FROM raw_pay.events
  ORDER BY payment_id) p;
```

The target has the old column count and the source added a column: `SELECT *` breaks.

```sql
CREATE TABLE report_orders (
  order_id int, order_date date,
  amount_vnd int,
  _fivetran_synced timestamp,
  _fivetran_deleted boolean);
-- ERROR 42601
INSERT INTO report_orders
SELECT * FROM raw_shop.orders;
```

## Practice

Five questions: revenue by order date, late orders, payments delivered twice, a total without duplicates, and a count by the new column.

## Recap

- Group numbers by business date; state the cut-off and recompute old days when late rows arrive.
- "At least once" means duplicates can happen: deduplicate on the business key.
- A new column holds NULL in old rows: `coalesce` where needed.
- Name your columns; a `SELECT *` into another table breaks when the source changes shape.
