---
id: e-st-l1-05
engine: stack
level: L1
module: ingest
title: "JSON từ API: đọc và trải phẳng"
title_en: "API JSON: read and flatten"
kind: lab
runtime: browser
minutes: 20
figures: [{ name: st-flatten, at: example }]
objectives:
  - vi: Lấy một trường từ cột `jsonb` bằng `->>` và ép sang kiểu số.
    en: Take a field out of a `jsonb` column with `->>` and cast it to a number.
  - vi: Trải một mảng JSON thành nhiều dòng bằng `jsonb_array_elements` trong `LATERAL`.
    en: Flatten a JSON array into rows with `jsonb_array_elements` inside `LATERAL`.
  - vi: Đọc được dạng Snowflake (`VARIANT`, `:`, `FLATTEN`) và viết bản PostgreSQL tương đương.
    en: Read the Snowflake form (`VARIANT`, `:`, `FLATTEN`) and write the PostgreSQL equivalent.
requires: [e-st-l1-02]
sources:
  - https://www.postgresql.org/docs/18/functions-json.html
  - https://www.postgresql.org/docs/18/queries-table-expressions.html#QUERIES-LATERAL
  - { url: "https://docs.snowflake.com/en/sql-reference/functions/flatten", title: "Snowflake docs: FLATTEN" }
  - { url: "https://docs.snowflake.com/en/sql-reference/data-types-semistructured", title: "Snowflake docs: Semi-structured data types" }
lab:
  setup: |
    CREATE SCHEMA raw_pay;
    CREATE TABLE raw_pay.webhooks (
      event_id int, payload jsonb,
      _airbyte_extracted_at timestamp
    );
    INSERT INTO raw_pay.webhooks VALUES
      (1, '{"type": "payment.captured", "amount": 250000, "items": [{"sku": "LAMP-RED", "qty": 2}, {"sku": "LAMP-GOLD", "qty": 1}, {"sku": "SILK-01", "qty": 1}]}', '2026-10-31 01:00'),
      (2, '{"type": "payment.captured", "amount": 120000, "items": [{"sku": "LAMP-RED", "qty": 1}]}', '2026-10-31 01:00'),
      (3, '{"type": "payment.failed", "amount": 90000, "items": []}', '2026-10-31 01:00'),
      (4, '{"type": "payment.captured", "amount": 60000, "items": [{"sku": "TEA-05", "qty": 3}]}', '2026-10-31 01:00');
  steps:
    - task:
        vi: "Mỗi sự kiện trong `raw_pay.webhooks`: trả `event_id`, loại sự kiện `type` (chữ) và số tiền `amount_vnd` (số nguyên)."
        en: "For each event in `raw_pay.webhooks`: return `event_id`, the event `type` (text) and the amount `amount_vnd` (an integer)."
      solution: |
        SELECT event_id,
          payload->>'type' AS type,
          (payload->>'amount')::int
            AS amount_vnd
        FROM raw_pay.webhooks
      check: rows
      hint:
        vi: "`->>` trả chữ; ép số bằng `(payload->>'amount')::int`."
        en: "`->>` returns text; cast with `(payload->>'amount')::int`."
    - task:
        vi: "Tổng tiền của các sự kiện `payment.captured`: trả một cột `total_vnd`."
        en: "Total amount of the `payment.captured` events: return one column `total_vnd`."
      solution: |
        SELECT sum((payload->>'amount')::int)
            AS total_vnd
        FROM raw_pay.webhooks
        WHERE payload->>'type'
          = 'payment.captured'
      check: rows
      hint:
        vi: "So chữ với chữ: `payload->>'type' = 'payment.captured'`, rồi cộng phần đã ép số."
        en: "Compare text with text: `payload->>'type' = 'payment.captured'`, then sum the cast amounts."
    - task:
        vi: "Trải mảng `items`: mỗi sản phẩm của mỗi sự kiện một dòng, trả `event_id`, `sku` (chữ), `qty` (số nguyên)."
        en: "Flatten the `items` array: one row per product of each event, returning `event_id`, `sku` (text), `qty` (an integer)."
      solution: |
        SELECT w.event_id,
          i->>'sku' AS sku,
          (i->>'qty')::int AS qty
        FROM raw_pay.webhooks w
        CROSS JOIN LATERAL
          jsonb_array_elements(
            w.payload->'items') AS i
      check: rows
      hint:
        vi: "`CROSS JOIN LATERAL jsonb_array_elements(w.payload->'items') AS i`; lấy mảng bằng `->` (giữ jsonb), không phải `->>`."
        en: "`CROSS JOIN LATERAL jsonb_array_elements(w.payload->'items') AS i`; take the array with `->` (stays jsonb), not `->>`."
    - task:
        vi: "Tổng số lượng bán theo từng `sku` trên mọi sự kiện, trả `sku`, `qty`, xếp theo `sku` tăng dần."
        en: "Total quantity sold per `sku` across all events, returning `sku`, `qty`, sorted by `sku` ascending."
      solution: |
        SELECT i->>'sku' AS sku,
          sum((i->>'qty')::int) AS qty
        FROM raw_pay.webhooks w
        CROSS JOIN LATERAL
          jsonb_array_elements(
            w.payload->'items') AS i
        GROUP BY 1
        ORDER BY 1
      check: rows
      ordered: true
      hint:
        vi: "Trải mảng như bước trước, rồi `GROUP BY` theo `sku` và `sum` số lượng đã ép số."
        en: "Flatten as in the previous step, then `GROUP BY` the `sku` and `sum` the cast quantities."
quiz:
  - q:
      vi: "`payload->'type' = 'payment.captured'` báo lỗi. Vì sao?"
      en: "`payload->'type' = 'payment.captured'` raises an error. Why?"
    options:
      - { vi: "Vì trường `type` không có trong JSON", en: "Because the `type` field is missing" }
      - { vi: "Vì `->` trả jsonb nên chữ bên phải bị đọc như JSON", en: "Because `->` returns jsonb, so the right side is read as JSON" }
      - { vi: "Vì so sánh chữ phải dùng `LIKE`", en: "Because comparing text needs `LIKE`" }
    answer: 1
    trap: 0
    why:
      vi: "Trường `type` có thật; nếu thiếu thì kết quả chỉ là NULL, không lỗi. `->` giữ kiểu jsonb, nên Postgres cố đọc `'payment.captured'` như một giá trị JSON và báo 22P02. Dùng `->>` để lấy chữ."
      en: "The `type` field exists; if it were missing the result would just be NULL, not an error. `->` keeps the jsonb type, so Postgres tries to read `'payment.captured'` as a JSON value and raises 22P02. Use `->>` to get text."
  - q:
      vi: "Snowflake viết `LATERAL FLATTEN(input => w.payload:items) i` và đọc `i.value:sku`. Bản PostgreSQL tương đương là gì?"
      en: "Snowflake writes `LATERAL FLATTEN(input => w.payload:items) i` and reads `i.value:sku`. What is the PostgreSQL equivalent?"
    options:
      - { vi: "`unnest(w.payload)` rồi đọc `i.sku`", en: "`unnest(w.payload)` then read `i.sku`" }
      - { vi: "`jsonb_each(w.payload)` rồi đọc `i.key`", en: "`jsonb_each(w.payload)` then read `i.key`" }
      - { vi: "`jsonb_array_elements(w.payload->'items')` rồi `i->>'sku'`", en: "`jsonb_array_elements(w.payload->'items')` then `i->>'sku'`" }
    answer: 2
    trap: 0
    why:
      vi: "`unnest` nghe giống FLATTEN, nhưng nó dành cho mảng SQL, không cho jsonb. FLATTEN trên một mảng trả mỗi phần tử ở cột `VALUE`; Postgres làm việc đó bằng `jsonb_array_elements`, và `:sku` thành `->>'sku'`."
      en: "`unnest` sounds like FLATTEN, but it is for SQL arrays, not jsonb. FLATTEN on an array returns each element in its `VALUE` column; Postgres does that with `jsonb_array_elements`, and `:sku` becomes `->>'sku'`."
---
## Mở bài

Cổng thanh toán của Chợ Lồng Đèn gửi mỗi sự kiện là một khối JSON, và công cụ nạp cất nguyên khối vào một cột. Bài này lấy trường ra, ép kiểu, và trải mảng sản phẩm thành dòng để SQL thường làm tiếp được.

## Ý chính

Dữ liệu từ API thường đến dưới dạng JSON lồng nhau. Ở PostgreSQL, cột `jsonb` giữ nguyên khối đó. Toán tử `->` lấy một trường và **giữ kiểu jsonb** (dùng để đi sâu tiếp hay lấy mảng); `->>` lấy một trường và **trả chữ** (dùng để so sánh hay hiển thị). Số trong JSON ra dạng chữ, nên phải ép: `(payload->>'amount')::int`.

Một mảng như `items` chứa nhiều sản phẩm trong một ô. `jsonb_array_elements` trả mỗi phần tử một dòng; đặt nó trong `LATERAL` để mỗi dòng của bảng gọi hàm với mảng của chính nó. `CROSS JOIN LATERAL` bỏ sự kiện có mảng rỗng; `LEFT JOIN LATERAL … ON true` giữ chúng lại.

Snowflake làm việc này bằng kiểu `VARIANT`: `payload:items` đi vào trường, `::string` ép kiểu, và `LATERAL FLATTEN(input => …)` trả mỗi phần tử ở cột `VALUE`. Đó là cú pháp chỉ để đọc ở đây; câu chạy được là bản PostgreSQL tương đương.

```text
-- Snowflake syntax (read only)
SELECT w.event_id,
  i.value:sku::string AS sku,
  i.value:qty::int AS qty
FROM raw_pay.webhooks w,
  LATERAL FLATTEN(
    input => w.payload:items) i;
```

## Cú pháp

```sql
payload->'items'       -- jsonb
payload->>'type'       -- text
(payload->>'amount')::int
FROM t CROSS JOIN LATERAL
  jsonb_array_elements(t.col->'arr')
    AS e
-- keep rows with an empty array
FROM t LEFT JOIN LATERAL
  jsonb_array_elements(t.col->'arr')
    AS e ON true
```

- `->>` luôn trả chữ: ép kiểu trước khi so sánh hay cộng số.
- `e` là jsonb: đọc trường của nó bằng `e->>'sku'`.

## Ví dụ

Đọc loại sự kiện từ JSON:

```sql
SELECT event_id,
  payload->>'type' AS type
FROM raw_pay.webhooks
ORDER BY event_id;
```

Mỗi sự kiện có bao nhiêu sản phẩm:

```sql
SELECT event_id,
  jsonb_array_length(
    payload->'items') AS n_items
FROM raw_pay.webhooks
ORDER BY event_id;
```

Trải mảng của sự kiện 1 thành dòng:

```sql
SELECT i->>'sku' AS sku,
  i->>'qty' AS qty
FROM raw_pay.webhooks w,
  jsonb_array_elements(
    w.payload->'items') i
WHERE w.event_id = 1;
```

Hình cuối mục vẽ đúng phép trải này.

## Lỗi hay gặp

`->>` trả chữ, nên so với một số thì Postgres không có toán tử nào khớp:

```sql
-- ERROR 42883
SELECT event_id
FROM raw_pay.webhooks
WHERE payload->>'amount' > 100000;
```

`->` giữ jsonb, nên chữ bên phải bị đọc như JSON và không hợp lệ:

```sql
-- ERROR 22P02
SELECT event_id
FROM raw_pay.webhooks
WHERE payload->'type'
  = 'payment.captured';
```

`CROSS JOIN LATERAL` làm mất sự kiện 3 (mảng rỗng):

```sql
-- WRONG: the empty array drops event 3
SELECT count(DISTINCT w.event_id)
  AS events
FROM raw_pay.webhooks w
CROSS JOIN LATERAL
  jsonb_array_elements(
    w.payload->'items') i;
```

```sql
-- FIX: LEFT JOIN LATERAL ... ON true
SELECT count(DISTINCT w.event_id)
  AS events
FROM raw_pay.webhooks w
LEFT JOIN LATERAL
  jsonb_array_elements(
    w.payload->'items') i ON true;
```

## Thực hành

Bốn bước trên `raw_pay.webhooks`: lấy trường, cộng tiền đã thu, trải mảng sản phẩm, rồi gom số lượng theo sản phẩm.

## Tóm tắt

- `->` giữ jsonb, `->>` trả chữ; ép kiểu trước khi tính.
- `jsonb_array_elements` trong `LATERAL` trải một mảng thành dòng.
- `LEFT JOIN LATERAL … ON true` giữ dòng có mảng rỗng.
- Snowflake `VARIANT`, `:` và `FLATTEN` ứng với `jsonb`, `->>` và `jsonb_array_elements`.

# EN

## Opening

Lantern Market's payment gateway sends each event as a JSON block, and the ingestion tool stores the whole block in one column. This lesson takes fields out, casts them, and flattens the product array into rows so plain SQL can carry on.

## Key idea

Data from an API usually arrives as nested JSON. In PostgreSQL a `jsonb` column keeps that block as is. The `->` operator takes a field and **keeps the jsonb type** (to go deeper or to take an array); `->>` takes a field and **returns text** (to compare or display). Numbers in JSON come out as text, so cast them: `(payload->>'amount')::int`.

An array such as `items` holds several products in one cell. `jsonb_array_elements` returns one row per element; put it inside `LATERAL` so each row of the table calls the function with its own array. `CROSS JOIN LATERAL` drops events with an empty array; `LEFT JOIN LATERAL … ON true` keeps them.

Snowflake does this with the `VARIANT` type: `payload:items` walks into a field, `::string` casts, and `LATERAL FLATTEN(input => …)` returns each element in its `VALUE` column. That syntax is read only here; the runnable query is the PostgreSQL equivalent.

```text
-- Snowflake syntax (read only)
SELECT w.event_id,
  i.value:sku::string AS sku,
  i.value:qty::int AS qty
FROM raw_pay.webhooks w,
  LATERAL FLATTEN(
    input => w.payload:items) i;
```

## Syntax

```sql
payload->'items'       -- jsonb
payload->>'type'       -- text
(payload->>'amount')::int
FROM t CROSS JOIN LATERAL
  jsonb_array_elements(t.col->'arr')
    AS e
-- keep rows with an empty array
FROM t LEFT JOIN LATERAL
  jsonb_array_elements(t.col->'arr')
    AS e ON true
```

- `->>` always returns text: cast before comparing or adding numbers.
- `e` is jsonb: read its fields with `e->>'sku'`.

## Example

Read the event type out of the JSON:

```sql
SELECT event_id,
  payload->>'type' AS type
FROM raw_pay.webhooks
ORDER BY event_id;
```

How many products each event holds:

```sql
SELECT event_id,
  jsonb_array_length(
    payload->'items') AS n_items
FROM raw_pay.webhooks
ORDER BY event_id;
```

Flatten event 1's array into rows:

```sql
SELECT i->>'sku' AS sku,
  i->>'qty' AS qty
FROM raw_pay.webhooks w,
  jsonb_array_elements(
    w.payload->'items') i
WHERE w.event_id = 1;
```

The figure at the end of this section draws exactly this flattening.

## Common mistakes

`->>` returns text, so compared with a number Postgres has no matching operator:

```sql
-- ERROR 42883
SELECT event_id
FROM raw_pay.webhooks
WHERE payload->>'amount' > 100000;
```

`->` keeps jsonb, so the text on the right is read as JSON and is not valid:

```sql
-- ERROR 22P02
SELECT event_id
FROM raw_pay.webhooks
WHERE payload->'type'
  = 'payment.captured';
```

`CROSS JOIN LATERAL` loses event 3 (an empty array):

```sql
-- WRONG: the empty array drops event 3
SELECT count(DISTINCT w.event_id)
  AS events
FROM raw_pay.webhooks w
CROSS JOIN LATERAL
  jsonb_array_elements(
    w.payload->'items') i;
```

```sql
-- FIX: LEFT JOIN LATERAL ... ON true
SELECT count(DISTINCT w.event_id)
  AS events
FROM raw_pay.webhooks w
LEFT JOIN LATERAL
  jsonb_array_elements(
    w.payload->'items') i ON true;
```

## Practice

Four steps on `raw_pay.webhooks`: take fields out, add up the captured money, flatten the product array, then sum the quantities per product.

## Recap

- `->` keeps jsonb, `->>` returns text; cast before computing.
- `jsonb_array_elements` inside `LATERAL` flattens an array into rows.
- `LEFT JOIN LATERAL … ON true` keeps rows whose array is empty.
- Snowflake's `VARIANT`, `:` and `FLATTEN` map to `jsonb`, `->>` and `jsonb_array_elements`.
