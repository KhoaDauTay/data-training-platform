---
id: e-ol-l4-01
engine: olap
level: L4
module: chtuning
title: "LowCardinality: mã hóa từ điển cho cột ít giá trị"
title_en: "LowCardinality: dictionary encoding for columns with few values"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: ol-lowcard, at: idea }]
objectives:
  - vi: Giải thích mã hóa từ điển (dictionary encoding) mà `LowCardinality` áp cho một cột.
    en: Explain the dictionary encoding that `LowCardinality` applies to a column.
  - vi: Đếm số giá trị khác nhau để chọn cột nên mã hóa, theo ngưỡng của tài liệu.
    en: Count distinct values to pick the columns worth encoding, using the thresholds in the docs.
  - vi: Tự mã hóa một cột trên PostgreSQL và đo số byte trước và sau.
    en: Encode a column yourself on PostgreSQL and measure the bytes before and after.
requires: [e-ol-l3-01]
sources:
  - { url: "https://clickhouse.com/docs/sql-reference/data-types/lowcardinality", title: "ClickHouse docs: LowCardinality(T)" }
  - { url: "https://www.postgresql.org/docs/18/functions-admin.html", title: "PostgreSQL 18 docs: Database Object Size Functions (pg_column_size)" }
lab:
  setup: |
    CREATE TABLE events (
      id int, container text,
      port text, status text
    );
    INSERT INTO events
    SELECT g,
      'C' || lpad((g % 3000)::text,
        4, '0'),
      (ARRAY['VNDAD', 'VNHPH',
        'VNSGN'])[1 + g % 3],
      (ARRAY['booked', 'loaded',
        'sailed', 'arrived'])[1 + g % 4]
    FROM generate_series(1, 30000) AS g;
  steps:
    - task:
        vi: "Mỗi cột có bao nhiêu giá trị khác nhau? Trả `ports`, `statuses`, `containers`."
        en: "How many distinct values does each column have? Return `ports`, `statuses`, `containers`."
      solution: |
        SELECT count(DISTINCT port) AS ports,
          count(DISTINCT status)
            AS statuses,
          count(DISTINCT container)
            AS containers
        FROM events;
      check: rows
      hint:
        vi: "Ba lần `count(DISTINCT …)` trong một câu."
        en: "Three `count(DISTINCT …)` in one query."
    - task:
        vi: "Dựng từ điển `status_dict`: mỗi trạng thái một dòng, `code` kiểu `smallint` đánh số theo thứ tự chữ cái, và `status`."
        en: "Build the dictionary `status_dict`: one row per status, a `smallint` `code` numbered in alphabetical order, and `status`."
      solution: |
        CREATE TABLE status_dict AS
        SELECT row_number() OVER (
            ORDER BY status)::smallint
            AS code,
          status
        FROM (SELECT DISTINCT status
          FROM events) s;
      after: SELECT code, status FROM status_dict
      check: rows
      hint:
        vi: "`row_number() OVER (ORDER BY status)` trên `SELECT DISTINCT status`, ép về `smallint`."
        en: "`row_number() OVER (ORDER BY status)` over `SELECT DISTINCT status`, cast to `smallint`."
    - task:
        vi: "Dựng bảng đã mã hóa `events_lc`: `id` và `status_code` (mã lấy từ `status_dict`)."
        en: "Build the encoded table `events_lc`: `id` and `status_code` (the code taken from `status_dict`)."
      solution: |
        CREATE TABLE events_lc AS
        SELECT e.id,
          d.code AS status_code
        FROM events e
        JOIN status_dict d
          USING (status);
      after: SELECT status_code, count(*) AS n FROM events_lc GROUP BY status_code
      check: rows
      hint:
        vi: "Nối `events` với `status_dict` bằng `USING (status)`, lấy `d.code AS status_code`."
        en: "Join `events` to `status_dict` with `USING (status)`, take `d.code AS status_code`."
    - task:
        vi: "Đo số byte cột trạng thái trước và sau khi mã hóa: `text_bytes` (cột `status` của `events`), `code_bytes` (cột `status_code` của `events_lc`)."
        en: "Measure the status column's bytes before and after encoding: `text_bytes` (column `status` of `events`), `code_bytes` (column `status_code` of `events_lc`)."
      solution: |
        SELECT (SELECT sum(
            pg_column_size(status))
            FROM events) AS text_bytes,
          (SELECT sum(
            pg_column_size(status_code))
            FROM events_lc) AS code_bytes;
      check: rows
      hint:
        vi: "Hai câu con, mỗi câu `sum(pg_column_size(…))` trên một bảng."
        en: "Two subqueries, each `sum(pg_column_size(…))` over one table."
quiz:
  - q:
      vi: "Cột `container` có khoảng 2 triệu giá trị khác nhau. Theo tài liệu ClickHouse, bọc nó trong `LowCardinality(String)` thì sao?"
      en: "Column `container` has about 2 million distinct values. According to the ClickHouse docs, what happens if you wrap it in `LowCardinality(String)`?"
    options:
      - { vi: "Luôn nhỏ hơn và nhanh hơn", en: "Always smaller and faster" }
      - { vi: "Có thể chạy kém hơn String", en: "It can perform worse than String" }
      - { vi: "Bị cấm với kiểu String", en: "It is forbidden for String" }
    answer: 1
    trap: 0
    why:
      vi: "Mã hóa từ điển chỉ lợi khi từ điển nhỏ: mỗi giá trị khác nhau là một mục trong từ điển. Tài liệu ghi dưới 10.000 giá trị khác nhau thì thường hiệu quả hơn, còn trên 100.000 thì có thể chạy kém hơn kiểu thường; 2 triệu nằm xa phía trên ngưỡng đó. String là kiểu đầu tiên tài liệu liệt kê cho `LowCardinality`, nên không hề bị cấm."
      en: "Dictionary encoding only pays off when the dictionary is small: every distinct value is one dictionary entry. The docs say under 10,000 distinct values it is mostly more efficient, and over 100,000 it can perform worse than the plain type; 2 million is far above that. String is the first type the docs list for `LowCardinality`, so it is not forbidden."
  - q:
      vi: "Cột `status` có 4 giá trị trên 30.000 dòng. Sau khi mã hóa từ điển, dữ liệu gồm những gì?"
      en: "Column `status` has 4 values over 30,000 rows. After dictionary encoding, what is stored?"
    options:
      - { vi: "4 chuỗi và 30.000 mã nhỏ", en: "4 strings and 30,000 small codes" }
      - { vi: "30.000 chuỗi và 4 mã", en: "30,000 strings and 4 codes" }
      - { vi: "4 chuỗi, các dòng bị gộp", en: "4 strings, the rows are merged" }
    answer: 0
    trap: 1
    why:
      vi: "Từ điển giữ mỗi chuỗi một lần (4 chuỗi), còn mỗi dòng chỉ giữ một mã số nhỏ trỏ vào từ điển, nên có 30.000 mã. Ngược lại 30.000 chuỗi là cột chưa mã hóa. Số dòng không đổi: mã hóa đổi cách lưu giá trị, không gộp dòng như SummingMergeTree."
      en: "The dictionary keeps each string once (4 strings), and each row keeps only a small code pointing into the dictionary, so there are 30,000 codes. The reverse, 30,000 strings, is the unencoded column. The row count does not change: encoding changes how values are stored, it does not merge rows the way SummingMergeTree does."
---
## Mở bài

Bảng sự kiện của Cargo Query có cột trạng thái chỉ gồm 4 chữ, lặp lại trên mọi dòng. Trong ClickHouse, kiểu `LowCardinality` lưu mỗi chữ một lần; bài này làm lại cách đó trên PostgreSQL để thấy số byte giảm bao nhiêu.

## Ý chính

`LowCardinality(T)` bọc một kiểu dữ liệu và đổi cách lưu cột: tài liệu ghi ClickHouse áp **mã hóa từ điển** (dictionary encoding) cho cột này. Mỗi giá trị khác nhau được ghi một lần vào **từ điển**, và mỗi dòng chỉ giữ một mã số nhỏ trỏ vào đó. Tài liệu liệt kê các kiểu bọc được: String, FixedString, Date, DateTime và các kiểu số trừ Decimal.

Lợi hay hại tùy số giá trị khác nhau (cardinality). Theo tài liệu, dưới 10.000 giá trị khác nhau thì ClickHouse thường hiệu quả hơn; trên 100.000 thì có thể chạy kém hơn kiểu thường. Tài liệu cũng gợi ý cân nhắc `LowCardinality` thay cho Enum khi làm việc với chuỗi.

PostgreSQL không có kiểu này. Ở bài lab, bạn tự làm: đếm giá trị khác nhau, dựng bảng từ điển, thay chuỗi bằng mã `smallint` (2 byte), rồi đo bằng `pg_column_size`.

## Cú pháp

```text
-- ClickHouse (read only)
CREATE TABLE events (
  id UInt32,
  container String,
  status LowCardinality(String)
)
ENGINE = MergeTree
ORDER BY id;
```

```sql
SELECT row_number() OVER (
    ORDER BY status)::smallint
    AS code,
  status
FROM (SELECT DISTINCT status
  FROM events) s;
```

- Từ điển: mỗi giá trị một dòng, kèm một mã nhỏ.
- Bảng chính chỉ giữ mã; nối với từ điển để đọc lại chữ.

## Ví dụ

Số giá trị khác nhau so với số dòng: cột nào lặp lại nhiều.

```sql
SELECT count(*) AS row_count,
  count(DISTINCT port) AS ports,
  count(DISTINCT container)
    AS containers
FROM events;
```

Một từ điển cho cột cảng, dựng ngay trong câu.

```sql
WITH d AS (
  SELECT row_number() OVER (
      ORDER BY port)::smallint
      AS code,
    port
  FROM (SELECT DISTINCT port
    FROM events) s
)
SELECT code, port FROM d;
```

Mỗi giá trị chữ tốn bao nhiêu byte, so với 2 byte của `smallint`.

```sql
SELECT status,
  pg_column_size(status) AS bytes,
  pg_column_size(1::smallint)
    AS code_bytes
FROM (SELECT DISTINCT status
  FROM events) s;
```

## Lỗi hay gặp

Đo cỡ bằng `length()`: hàm này đếm ký tự, bỏ qua byte đầu mà PostgreSQL ghi kèm mỗi giá trị chữ ngắn.

```sql
-- WRONG: counts characters
SELECT sum(length(status))
  AS bytes
FROM events;
```

```sql
-- FIX: bytes really stored
SELECT sum(pg_column_size(status))
  AS bytes
FROM events;
```

Dựng từ điển mà quên `DISTINCT`: mỗi dòng thành một mục, từ điển to bằng chính cột.

```sql
-- WRONG: one entry per row
SELECT count(*) AS dict_entries
FROM (SELECT status
  FROM events) s;
```

```sql
-- FIX: one entry per value
SELECT count(*) AS dict_entries
FROM (SELECT DISTINCT status
  FROM events) s;
```

## Thực hành

Bốn bước: đếm giá trị khác nhau của từng cột, dựng từ điển `status_dict`, dựng bảng đã mã hóa `events_lc`, rồi so số byte cột trạng thái trước và sau.

## Tóm tắt

- `LowCardinality(T)` áp mã hóa từ điển: giá trị ghi một lần, dòng giữ mã nhỏ.
- Dưới 10.000 giá trị khác nhau thường lợi; trên 100.000 có thể kém hơn.
- Đếm `count(DISTINCT …)` trước khi chọn cột.
- Trên PostgreSQL: bảng từ điển + mã `smallint`, đo bằng `pg_column_size`.

# EN

## Opening

Cargo Query's events table has a status column of just 4 words, repeated on every row. In ClickHouse, the `LowCardinality` type stores each word once; this lesson redoes that on PostgreSQL to see how many bytes it saves.

## Key idea

`LowCardinality(T)` wraps a data type and changes how the column is stored: the docs say ClickHouse applies **dictionary encoding** to such a column. Each distinct value is written once into a **dictionary**, and each row keeps only a small code pointing into it. The docs list the types it can wrap: String, FixedString, Date, DateTime and the numeric types except Decimal.

Whether it helps depends on the number of distinct values (cardinality). According to the docs, under 10,000 distinct values ClickHouse mostly shows higher efficiency; over 100,000 it can perform worse than the plain type. The docs also suggest considering `LowCardinality` instead of Enum when working with strings.

PostgreSQL has no such type. In the lab you do it yourself: count distinct values, build a dictionary table, replace the strings with `smallint` codes (2 bytes), then measure with `pg_column_size`.

## Syntax

```text
-- ClickHouse (read only)
CREATE TABLE events (
  id UInt32,
  container String,
  status LowCardinality(String)
)
ENGINE = MergeTree
ORDER BY id;
```

```sql
SELECT row_number() OVER (
    ORDER BY status)::smallint
    AS code,
  status
FROM (SELECT DISTINCT status
  FROM events) s;
```

- The dictionary: one row per value, with a small code.
- The main table keeps only the code; join the dictionary to read the text back.

## Example

Distinct values compared with the row count: which columns repeat a lot.

```sql
SELECT count(*) AS row_count,
  count(DISTINCT port) AS ports,
  count(DISTINCT container)
    AS containers
FROM events;
```

A dictionary for the port column, built inside the query.

```sql
WITH d AS (
  SELECT row_number() OVER (
      ORDER BY port)::smallint
      AS code,
    port
  FROM (SELECT DISTINCT port
    FROM events) s
)
SELECT code, port FROM d;
```

How many bytes each text value takes, compared with the 2 bytes of a `smallint`.

```sql
SELECT status,
  pg_column_size(status) AS bytes,
  pg_column_size(1::smallint)
    AS code_bytes
FROM (SELECT DISTINCT status
  FROM events) s;
```

## Common mistakes

Measuring size with `length()`: it counts characters and ignores the header byte PostgreSQL stores with each short text value.

```sql
-- WRONG: counts characters
SELECT sum(length(status))
  AS bytes
FROM events;
```

```sql
-- FIX: bytes really stored
SELECT sum(pg_column_size(status))
  AS bytes
FROM events;
```

Building the dictionary without `DISTINCT`: every row becomes an entry, and the dictionary is as big as the column.

```sql
-- WRONG: one entry per row
SELECT count(*) AS dict_entries
FROM (SELECT status
  FROM events) s;
```

```sql
-- FIX: one entry per value
SELECT count(*) AS dict_entries
FROM (SELECT DISTINCT status
  FROM events) s;
```

## Practice

Four steps: count each column's distinct values, build the dictionary `status_dict`, build the encoded table `events_lc`, then compare the status column's bytes before and after.

## Recap

- `LowCardinality(T)` applies dictionary encoding: values are written once, rows keep small codes.
- Under 10,000 distinct values it mostly helps; over 100,000 it can be worse.
- Count `count(DISTINCT …)` before choosing a column.
- On PostgreSQL: a dictionary table + `smallint` codes, measured with `pg_column_size`.
