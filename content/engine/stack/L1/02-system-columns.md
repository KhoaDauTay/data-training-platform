---
id: e-st-l1-02
engine: stack
level: L1
module: ingest
title: Những cột lạ trong bảng raw
title_en: The strange columns in raw tables
kind: lab
runtime: browser
minutes: 20
figures: [{ name: st-raw-versions, at: example }]
objectives:
  - vi: Đọc các cột hệ thống của Fivetran (`_fivetran_synced`, `_fivetran_deleted`, chế độ lịch sử) và Airbyte (`_airbyte_extracted_at`).
    en: Read the system columns of Fivetran (`_fivetran_synced`, `_fivetran_deleted`, history mode) and Airbyte (`_airbyte_extracted_at`).
  - vi: Bỏ dòng đã xóa ở nguồn và lấy bản mới nhất của mỗi khóa.
    en: Leave out rows deleted at the source and take the newest version of each key.
  - vi: Hỏi một bảng lịch sử "tại thời điểm t, giá trị là gì".
    en: Ask a history table "what was the value at time t".
requires: [e-st-l1-01]
sources:
  - { url: "https://fivetran.com/docs/core-concepts/system-columns-and-tables", title: "Fivetran docs: System columns and tables", title_vi: "Tài liệu Fivetran: cột và bảng hệ thống" }
  - { url: "https://docs.airbyte.com/platform/understanding-airbyte/airbyte-metadata-fields", title: "Airbyte docs: Airbyte metadata fields", title_vi: "Tài liệu Airbyte: các trường metadata của Airbyte" }
  - { url: "https://fivetran.com/docs/core-concepts/sync-modes/history-mode", title: "Fivetran docs: History mode", title_vi: "Tài liệu Fivetran: chế độ lưu lịch sử" }
  - { url: https://www.postgresql.org/docs/18/sql-select.html#SQL-DISTINCT, title_vi: "SELECT DISTINCT ON" }
lab:
  setup: |
    CREATE SCHEMA raw_shop;
    CREATE SCHEMA raw_pay;
    CREATE TABLE raw_shop.orders (
      order_id int, customer_id int,
      status text, amount_vnd int,
      _fivetran_synced timestamp,
      _fivetran_deleted boolean
    );
    INSERT INTO raw_shop.orders VALUES
      (101, 11, 'paid', 250000, '2026-10-30 23:10', false),
      (102, 12, 'paid', 120000, '2026-10-30 23:10', false),
      (103, 13, 'shipped', 90000, '2026-10-30 23:10', false),
      (104, 14, 'paid', 300000, '2026-10-31 01:05', true),
      (105, 15, 'paid', 60000, '2026-10-31 01:05', false);
    CREATE TABLE raw_shop.customers_history (
      customer_id int, tier text,
      _fivetran_start timestamp,
      _fivetran_end timestamp,
      _fivetran_active boolean
    );
    INSERT INTO raw_shop.customers_history VALUES
      (11, 'basic', '2026-01-05', '2026-08-31 23:59:59.999', false),
      (11, 'gold', '2026-09-01', '9999-12-31 23:59:59.999', true),
      (12, 'basic', '2026-02-10', '9999-12-31 23:59:59.999', true),
      (13, 'silver', '2026-03-01', '2026-10-19 23:59:59.999', false),
      (13, 'gold', '2026-10-20', '9999-12-31 23:59:59.999', true),
      (14, 'basic', '2026-04-02', '9999-12-31 23:59:59.999', true);
    CREATE TABLE raw_pay.payments (
      _airbyte_raw_id text,
      _airbyte_extracted_at timestamp,
      _airbyte_meta jsonb,
      payment_id int, order_id int, status text
    );
    INSERT INTO raw_pay.payments VALUES
      ('a1', '2026-10-30 22:00', '{"changes": []}', 9001, 101, 'pending'),
      ('a2', '2026-10-30 23:00', '{"changes": []}', 9001, 101, 'authorized'),
      ('a3', '2026-10-31 01:00', '{"changes": []}', 9001, 101, 'captured'),
      ('a4', '2026-10-30 22:00', '{"changes": []}', 9002, 102, 'pending'),
      ('a5', '2026-10-31 01:00', '{"changes": []}', 9002, 102, 'failed'),
      ('a6', '2026-10-31 01:00', '{"changes": []}', 9003, 105, 'captured');
  steps:
    - task:
        vi: "Trong `raw_shop.orders`, đếm các đơn vẫn còn ở nguồn và cộng tiền của chúng: trả `orders` và `revenue_vnd`."
        en: "In `raw_shop.orders`, count the orders still present at the source and add up their amounts: return `orders` and `revenue_vnd`."
      solution: |
        SELECT count(*) AS orders,
          sum(amount_vnd) AS revenue_vnd
        FROM raw_shop.orders
        WHERE NOT _fivetran_deleted
      check: rows
      hint:
        vi: "Dòng bị xóa ở nguồn có `_fivetran_deleted` là true: lọc `WHERE NOT _fivetran_deleted`."
        en: "A row deleted at the source has `_fivetran_deleted` true: filter `WHERE NOT _fivetran_deleted`."
    - task:
        vi: "`raw_shop.customers_history` được nạp ở chế độ lịch sử. Lấy hạng hiện tại của mỗi khách: trả `customer_id`, `tier`."
        en: "`raw_shop.customers_history` is loaded in history mode. Get each customer's current tier: return `customer_id`, `tier`."
      solution: |
        SELECT customer_id, tier
        FROM raw_shop.customers_history
        WHERE _fivetran_active
      check: rows
      hint:
        vi: "Ở chế độ lịch sử, đúng một bản mỗi khóa có `_fivetran_active` là true."
        en: "In history mode, exactly one version per key has `_fivetran_active` true."
    - task:
        vi: "Ngày 2026-10-01, khách 13 ở hạng nào? Trả một cột `tier`."
        en: "On 2026-10-01, which tier was customer 13 in? Return one column `tier`."
      solution: |
        SELECT tier
        FROM raw_shop.customers_history
        WHERE customer_id = 13
          AND '2026-10-01' BETWEEN _fivetran_start
            AND _fivetran_end
      check: rows
      hint:
        vi: "Bản đúng tại thời điểm t là bản có t nằm giữa `_fivetran_start` và `_fivetran_end`."
        en: "The version valid at time t is the one where t lies between `_fivetran_start` and `_fivetran_end`."
    - task:
        vi: "`raw_pay.payments` nạp kiểu Airbyte nối thêm (append): mỗi lần đồng bộ thêm một bản. Lấy trạng thái mới nhất của mỗi thanh toán: trả `payment_id`, `status`."
        en: "`raw_pay.payments` is loaded Airbyte-style in append mode: each sync adds a version. Get the newest status of each payment: return `payment_id`, `status`."
      solution: |
        SELECT DISTINCT ON (payment_id)
          payment_id, status
        FROM raw_pay.payments
        ORDER BY payment_id,
          _airbyte_extracted_at DESC
      check: rows
      hint:
        vi: "`DISTINCT ON (payment_id)` giữ dòng đầu của mỗi nhóm theo `ORDER BY`; xếp `_airbyte_extracted_at DESC` để dòng đầu là bản mới nhất."
        en: "`DISTINCT ON (payment_id)` keeps the first row of each group in `ORDER BY` order; sort `_airbyte_extracted_at DESC` so the first row is the newest."
quiz:
  - q:
      vi: "Một đơn bị xóa trong app. Sau lần đồng bộ kế tiếp của Fivetran (không bật chế độ lịch sử), bảng raw có gì?"
      en: "An order is deleted in the app. After Fivetran's next sync (history mode off), what does the raw table hold?"
    options:
      - { vi: "Dòng biến mất khỏi bảng raw ngay lập tức", en: "The row disappears from the raw table at once" }
      - { vi: "Dòng còn đó, với `_fivetran_deleted` là true", en: "The row stays, with `_fivetran_deleted` true" }
      - { vi: "Dòng còn đó và mọi cột tiền về số không", en: "The row stays and every amount becomes zero" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe tự nhiên vì nguồn đã xóa nó, nhưng Fivetran xóa mềm: dòng ở lại và được đánh dấu `_fivetran_deleted`. Mọi model đọc bảng này phải tự lọc."
      en: "It feels natural since the source deleted it, but Fivetran soft-deletes: the row stays and is flagged `_fivetran_deleted`. Every model reading this table has to filter it out."
  - q:
      vi: "Lấy bản mới nhất của mỗi `payment_id` bằng `DISTINCT ON (payment_id) … ORDER BY payment_id, _airbyte_extracted_at` (không có DESC). Kết quả là gì?"
      en: "You take the newest version of each `payment_id` with `DISTINCT ON (payment_id) … ORDER BY payment_id, _airbyte_extracted_at` (no DESC). What do you get?"
    options:
      - { vi: "Bản cũ nhất của mỗi thanh toán", en: "The oldest version of each payment" }
      - { vi: "Bản mới nhất, vì Postgres tự chọn", en: "The newest, because Postgres picks it" }
      - { vi: "Lỗi, vì thiếu hướng sắp xếp", en: "An error, because the direction is missing" }
    answer: 0
    trap: 1
    why:
      vi: "Postgres không đoán ý: `DISTINCT ON` giữ dòng đầu theo thứ tự bạn viết, và mặc định là tăng dần, nên dòng đầu là bản cũ nhất. Phải viết `DESC`."
      en: "Postgres does not guess: `DISTINCT ON` keeps the first row in the order you wrote, and the default is ascending, so the first row is the oldest. Write `DESC`."
---
## Mở bài

Mở một bảng raw ở Chợ Lồng Đèn và bạn thấy những cột bắt đầu bằng gạch dưới mà app bán hàng không hề có. Chúng là dấu vết của công cụ nạp, và chúng quyết định dòng nào được tính.

## Ý chính

Fivetran thêm `_fivetran_synced`: lúc dòng được đồng bộ lần gần nhất. Khi một dòng bị xóa ở nguồn, Fivetran không xóa nó khỏi kho mà đặt `_fivetran_deleted` là true (xóa mềm). Bảng không có khóa chính còn được thêm `_fivetran_id`, một khóa thay thế tính từ giá trị của dòng.

Ở **chế độ lịch sử** (history mode), Fivetran giữ mọi bản của một dòng: `_fivetran_start` là lúc bản đó bắt đầu, `_fivetran_end` là lúc nó hết hiệu lực, `_fivetran_active` đánh dấu bản hiện tại. Chế độ này bỏ cột `_fivetran_deleted`; một dòng bị xóa chỉ không còn bản nào đang hoạt động.

Airbyte ghi `_airbyte_raw_id` (một UUID cho mỗi bản ghi), `_airbyte_extracted_at` (lúc lấy từ nguồn) và `_airbyte_meta` (thông tin thêm, như các thay đổi khi ép kiểu). Ở chế độ nối thêm (append), mỗi lần đồng bộ thêm một bản mới, nên bảng chứa nhiều bản của cùng một khóa: bạn chọn bản mới nhất theo `_airbyte_extracted_at`.

Tên cột là tên trong tài liệu của hai hãng; dữ liệu của bài là hư cấu.

## Cú pháp

```sql
-- Fivetran: rows still at the source
WHERE NOT _fivetran_deleted
-- Fivetran history mode: current row
WHERE _fivetran_active
-- history mode: the row valid at t
WHERE t BETWEEN _fivetran_start
  AND _fivetran_end
-- Airbyte append: newest per key
SELECT DISTINCT ON (key) ...
ORDER BY key, _airbyte_extracted_at DESC
```

- `DISTINCT ON (key)` giữ dòng đầu của mỗi khóa theo `ORDER BY`.
- `9999-12-31` ở `_fivetran_end` nghĩa là bản đó chưa hết hiệu lực.

## Ví dụ

Đơn 104 đã bị xóa ở nguồn nhưng vẫn nằm trong kho:

```sql
SELECT order_id, status,
  _fivetran_deleted
FROM raw_shop.orders
ORDER BY order_id;
```

Lịch sử hạng của khách 13: hai bản, chỉ một bản đang hoạt động.

```sql
SELECT tier, _fivetran_start,
  _fivetran_active
FROM raw_shop.customers_history
WHERE customer_id = 13
ORDER BY _fivetran_start;
```

Thanh toán 9001 được chép ba lần, mỗi lần một trạng thái:

```sql
SELECT status, _airbyte_extracted_at
FROM raw_pay.payments
WHERE payment_id = 9001
ORDER BY _airbyte_extracted_at;
```

Hình cuối mục cho thấy bản nào trong ba bản ấy được giữ.

## Lỗi hay gặp

Đếm cả dòng đã xóa ở nguồn:

```sql
-- WRONG: counts the deleted order 104
SELECT count(*) AS orders
FROM raw_shop.orders;
```

```sql
-- FIX: only rows still at the source
SELECT count(*) AS orders
FROM raw_shop.orders
WHERE NOT _fivetran_deleted;
```

Quên `DESC`: `DISTINCT ON` giữ bản cũ nhất.

```sql
-- WRONG: keeps the oldest version
SELECT DISTINCT ON (payment_id)
  payment_id, status
FROM raw_pay.payments
ORDER BY payment_id,
  _airbyte_extracted_at;
```

```sql
-- FIX: newest first
SELECT DISTINCT ON (payment_id)
  payment_id, status
FROM raw_pay.payments
ORDER BY payment_id,
  _airbyte_extracted_at DESC;
```

## Thực hành

Bốn câu hỏi trên ba bảng raw: đơn còn ở nguồn, hạng hiện tại, hạng tại một ngày, và trạng thái mới nhất của mỗi thanh toán.

## Tóm tắt

- `_fivetran_deleted` là xóa mềm: dòng còn trong kho, bạn phải lọc.
- Chế độ lịch sử: `_fivetran_active` là bản hiện tại; `_fivetran_start` và `_fivetran_end` cho bản đúng tại thời điểm t.
- Airbyte append giữ mọi bản; lấy bản mới nhất theo `_airbyte_extracted_at`.
- `DISTINCT ON` giữ dòng đầu theo `ORDER BY`: nhớ `DESC`.

# EN

## Opening

Open a raw table at Lantern Market and you see columns starting with an underscore that the shop app never had. They are the ingestion tool's footprints, and they decide which rows count.

## Key idea

Fivetran adds `_fivetran_synced`: when the row was last synced. When a row is deleted at the source, Fivetran does not remove it from the warehouse but sets `_fivetran_deleted` to true (a soft delete). A table with no primary key also gets `_fivetran_id`, a surrogate key computed from the row's values.

In **history mode**, Fivetran keeps every version of a row: `_fivetran_start` is when that version began, `_fivetran_end` when it stopped being valid, `_fivetran_active` marks the current one. This mode drops the `_fivetran_deleted` column; a deleted row simply has no active version left.

Airbyte writes `_airbyte_raw_id` (a UUID per record), `_airbyte_extracted_at` (when it was read from the source) and `_airbyte_meta` (extra information, such as changes made while casting types). In append mode every sync adds a new version, so the table holds several versions of one key: you pick the newest by `_airbyte_extracted_at`.

The column names are the names in the two vendors' docs; the lesson's data is fiction.

## Syntax

```sql
-- Fivetran: rows still at the source
WHERE NOT _fivetran_deleted
-- Fivetran history mode: current row
WHERE _fivetran_active
-- history mode: the row valid at t
WHERE t BETWEEN _fivetran_start
  AND _fivetran_end
-- Airbyte append: newest per key
SELECT DISTINCT ON (key) ...
ORDER BY key, _airbyte_extracted_at DESC
```

- `DISTINCT ON (key)` keeps the first row of each key in `ORDER BY` order.
- `9999-12-31` in `_fivetran_end` means that version is still valid.

## Example

Order 104 was deleted at the source but still sits in the warehouse:

```sql
SELECT order_id, status,
  _fivetran_deleted
FROM raw_shop.orders
ORDER BY order_id;
```

Customer 13's tier history: two versions, only one active.

```sql
SELECT tier, _fivetran_start,
  _fivetran_active
FROM raw_shop.customers_history
WHERE customer_id = 13
ORDER BY _fivetran_start;
```

Payment 9001 was copied three times, one status each time:

```sql
SELECT status, _airbyte_extracted_at
FROM raw_pay.payments
WHERE payment_id = 9001
ORDER BY _airbyte_extracted_at;
```

The figure at the end of this section shows which of those three versions is kept.

## Common mistakes

Counting rows deleted at the source:

```sql
-- WRONG: counts the deleted order 104
SELECT count(*) AS orders
FROM raw_shop.orders;
```

```sql
-- FIX: only rows still at the source
SELECT count(*) AS orders
FROM raw_shop.orders
WHERE NOT _fivetran_deleted;
```

Forgetting `DESC`: `DISTINCT ON` keeps the oldest version.

```sql
-- WRONG: keeps the oldest version
SELECT DISTINCT ON (payment_id)
  payment_id, status
FROM raw_pay.payments
ORDER BY payment_id,
  _airbyte_extracted_at;
```

```sql
-- FIX: newest first
SELECT DISTINCT ON (payment_id)
  payment_id, status
FROM raw_pay.payments
ORDER BY payment_id,
  _airbyte_extracted_at DESC;
```

## Practice

Four questions on three raw tables: orders still at the source, the current tier, the tier on a given day, and the newest status of each payment.

## Recap

- `_fivetran_deleted` is a soft delete: the row stays in the warehouse and you must filter it.
- History mode: `_fivetran_active` is the current version; `_fivetran_start` and `_fivetran_end` give the version valid at time t.
- Airbyte append keeps every version; take the newest by `_airbyte_extracted_at`.
- `DISTINCT ON` keeps the first row in `ORDER BY` order: remember `DESC`.
