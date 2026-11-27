---
id: e-ol-l4-05
engine: olap
level: L4
module: chtuning
title: "Nghĩ theo chi phí: số byte phải đọc và EXPLAIN"
title_en: "Thinking in cost: bytes read and EXPLAIN"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: ol-bytes, at: idea }]
objectives:
  - vi: Ước số byte một câu phân tích phải đọc khi kho lưu theo cột chỉ đọc các cột câu cần.
    en: Estimate the bytes an analytical query has to read when a column store reads only the columns the query needs.
  - vi: Đọc dòng `Granules` sau/trước của `EXPLAIN indexes = 1` và `read_rows`, `read_bytes` trong nhật ký truy vấn.
    en: Read the after/before `Granules` line of `EXPLAIN indexes = 1` and `read_rows`, `read_bytes` in the query log.
  - vi: Làm lại các con số đó trên PostgreSQL bằng `pg_column_size` và `EXPLAIN (ANALYZE, BUFFERS)`.
    en: Redo those numbers on PostgreSQL with `pg_column_size` and `EXPLAIN (ANALYZE, BUFFERS)`.
requires: [e-ol-l1-02, e-ol-l3-01]
sources:
  - { url: "https://clickhouse.com/docs/intro", title: "ClickHouse docs: What is ClickHouse? (column-oriented storage)" }
  - { url: "https://clickhouse.com/docs/sql-reference/statements/explain", title: "ClickHouse docs: EXPLAIN statement" }
  - { url: "https://clickhouse.com/docs/guides/clickhouse/performance-and-monitoring/diagnose-slow-queries", title: "ClickHouse docs: Diagnose slow queries" }
  - { url: "https://www.postgresql.org/docs/18/using-explain.html", title: "PostgreSQL 18 docs: Using EXPLAIN" }
  - { url: "https://www.postgresql.org/docs/18/functions-admin.html", title: "PostgreSQL 18 docs: Database Object Size Functions" }
lab:
  setup: |
    CREATE TABLE shipments_wide (
      id int, port text, teu int,
      customer text, vessel text,
      eta date, status text,
      notes text
    );
    INSERT INTO shipments_wide
    SELECT g,
      (ARRAY['VNDAD', 'VNHPH',
        'VNSGN'])[1 + (g - 1) * 3
        / 20000],
      1 + g % 4,
      'CUST' || g % 200,
      'VSL' || g % 40,
      date '2026-10-01' + g % 30,
      (ARRAY['booked', 'sailed',
        'arrived'])[1 + g % 3],
      'note ' || repeat('n', 95)
    FROM generate_series(1, 20000) AS g;
  steps:
    - task:
        vi: "Câu dashboard chỉ cần `port` và `teu`. Kho lưu theo cột đọc bao nhiêu byte, so với đọc trọn mọi dòng? Trả `needed_bytes`, `all_bytes`."
        en: "The dashboard query needs only `port` and `teu`. How many bytes does a column store read, compared with reading whole rows? Return `needed_bytes`, `all_bytes`."
      solution: |
        SELECT sum(pg_column_size(port)
            + pg_column_size(teu))
            AS needed_bytes,
          sum(pg_column_size(s.*))
            AS all_bytes
        FROM shipments_wide s;
      check: rows
      hint:
        vi: "`sum(pg_column_size(port) + pg_column_size(teu))` và `sum(pg_column_size(s.*))`."
        en: "`sum(pg_column_size(port) + pg_column_size(teu))` and `sum(pg_column_size(s.*))`."
    - task:
        vi: "Số byte của bốn cột `port`, `teu`, `customer`, `notes`, lớn nhất trước: `col`, `bytes`."
        en: "The bytes of four columns `port`, `teu`, `customer`, `notes`, largest first: `col`, `bytes`."
      solution: |
        SELECT c.col, sum(c.b) AS bytes
        FROM shipments_wide s,
          LATERAL (VALUES
            ('port', pg_column_size(s.port)),
            ('teu', pg_column_size(s.teu)),
            ('customer',
              pg_column_size(s.customer)),
            ('notes',
              pg_column_size(s.notes))
          ) AS c(col, b)
        GROUP BY c.col
        ORDER BY bytes DESC;
      check: rows
      ordered: true
      hint:
        vi: "`LATERAL (VALUES ('port', pg_column_size(s.port)), …) AS c(col, b)`, rồi `GROUP BY c.col ORDER BY bytes DESC`."
        en: "`LATERAL (VALUES ('port', pg_column_size(s.port)), …) AS c(col, b)`, then `GROUP BY c.col ORDER BY bytes DESC`."
    - task:
        vi: "Bảng sắp theo `port` qua `id`. Chia thành granule 2.048 dòng theo `id`, và cho lọc `port = 'VNSGN'` một dòng Granules dạng sau/trước: `granules_after`, `granules_before`."
        en: "The table is sorted by `port` through `id`. Split it into granules of 2,048 rows by `id`, and give filter `port = 'VNSGN'` a Granules line in after/before form: `granules_after`, `granules_before`."
      solution: |
        SELECT count(*) FILTER (
            WHERE lo <= 'VNSGN'
              AND hi >= 'VNSGN')
            AS granules_after,
          count(*) AS granules_before
        FROM (
          SELECT (id - 1) / 2048 AS g,
            min(port) AS lo,
            max(port) AS hi
          FROM shipments_wide
          GROUP BY 1
        ) m;
      check: rows
      hint:
        vi: "Câu con: `min(port)`, `max(port)` theo `(id - 1) / 2048`; ngoài: `count(*) FILTER (WHERE …)` và `count(*)`."
        en: "Subquery: `min(port)`, `max(port)` by `(id - 1) / 2048`; outside: `count(*) FILTER (WHERE …)` and `count(*)`."
quiz:
  - q:
      vi: "Bảng có 50 cột, câu phân tích chỉ dùng 3 cột. Kho lưu theo cột đọc gì từ đĩa?"
      en: "A table has 50 columns and an analytical query uses only 3. What does a column store read from disk?"
    options:
      - { vi: "Chỉ 3 cột đó", en: "Only those 3 columns" }
      - { vi: "Cả 50 cột của mọi dòng", en: "All 50 columns of every row" }
      - { vi: "Mọi cột của dòng khớp", en: "Every column of matching rows" }
    answer: 0
    trap: 1
    why:
      vi: "Đọc cả 50 cột là điều xảy ra ở kho lưu theo dòng như PostgreSQL, vì một trang giữ trọn các dòng. Tài liệu ClickHouse ghi ở kho lưu theo cột chỉ những cột câu cần mới được đọc từ đĩa, nên chỉ 3 cột. Đọc mọi cột của các dòng khớp cũng là cách nghĩ theo dòng; kho theo cột không lấy các cột không dùng."
      en: "Reading all 50 columns is what happens in a row store like PostgreSQL, because a page holds whole rows. The ClickHouse docs say a column store reads from disk only the columns the query needs, so just 3. Reading every column of the matching rows is row thinking too; a column store does not fetch unused columns."
  - q:
      vi: "`EXPLAIN indexes = 1` in ra `\"Granules\": 6/10` ở mục `PrimaryKey`. Nghĩa là gì?"
      en: "`EXPLAIN indexes = 1` prints `\"Granules\": 6/10` under `PrimaryKey`. What does it mean?"
    options:
      - { vi: "Bỏ qua 6 trên 10 granule", en: "Skips 6 of 10 granules" }
      - { vi: "6 part trên 10 part", en: "6 parts out of 10" }
      - { vi: "Còn đọc 6 trên 10 granule", en: "Still reads 6 of 10 granules" }
    answer: 2
    trap: 0
    why:
      vi: "Dễ đọc 6 là số bị bỏ, nhưng tài liệu ghi dạng là \"sau/trước\" khi áp chỉ mục: trước có 10 granule, sau khi chỉ mục chính lọc còn 6 phải đọc, tức chỉ bỏ được 4. Số part nằm ở khóa `Parts` riêng, không phải `Granules`."
      en: "It is easy to read 6 as the skipped count, but the docs say the format is \"after/before\" the index is applied: 10 granules before, 6 left to read after the primary key filters, so only 4 are skipped. The part count is in its own `Parts` key, not `Granules`."
  - q:
      vi: "Trong nhật ký truy vấn, `read_rows` bằng đúng số dòng của bảng, và `EXPLAIN` không có mục `Indexes`. Điều đó cho biết gì?"
      en: "In the query log, `read_rows` equals the table's row count, and `EXPLAIN` has no `Indexes` section. What does that tell you?"
    options:
      - { vi: "Câu đã đọc cả bảng", en: "The query read the whole table" }
      - { vi: "Câu đã dùng chỉ mục chính", en: "The query used the primary key" }
      - { vi: "Câu lấy từ bộ nhớ đệm", en: "The query came from a cache" }
    answer: 0
    trap: 1
    why:
      vi: "Nếu chỉ mục chính được dùng, `EXPLAIN` sẽ có mục `Indexes` với số granule sau/trước, và `read_rows` nhỏ hơn số dòng của bảng. Tài liệu chẩn đoán câu chậm ghi đúng tổ hợp này, không có `Indexes` và `read_rows` bằng số dòng, là dấu hiệu ClickHouse đọc cả bảng. `read_rows` đếm dòng đã đọc, nên nó không cho biết có lấy từ bộ nhớ đệm hay không."
      en: "If the primary key were used, `EXPLAIN` would show an `Indexes` section with after/before granules, and `read_rows` would be below the table's row count. The diagnose-slow-queries docs name exactly this pair, no `Indexes` and `read_rows` equal to the row count, as the sign that ClickHouse read the whole table. `read_rows` counts rows read, so it says nothing about a cache."
---
## Mở bài

Một câu dashboard của Cargo Query chạy chậm dần khi bảng lô hàng lớn lên. Trước khi thêm máy, hãy hỏi câu đó phải đọc bao nhiêu byte và bỏ qua được bao nhiêu granule; bài này đo hai con số đó trên PostgreSQL.

## Ý chính

Ở kho lưu theo cột, tài liệu ClickHouse ghi chỉ những cột câu cần mới được đọc từ đĩa. Vì thế chi phí của một câu phân tích gần với **số byte của các cột nó dùng**, nhân với số dòng nó không bỏ qua được. Bỏ một cột rộng khỏi `SELECT` có thể giảm số byte nhiều hơn mọi cách khác.

Để biết bỏ qua được bao nhiêu, `EXPLAIN indexes = 1` in mỗi chỉ mục đã dùng (`PrimaryKey`, `Skip`, `Partition`…) kèm `Parts` và `Granules` dạng **sau/trước**: `6/10` là còn đọc 6 trên 10 granule. Sau khi chạy, `system.query_log` ghi `read_rows`, `read_bytes`, `memory_usage`, `query_duration_ms`. Tài liệu chẩn đoán câu chậm ghi: không có mục `Indexes` và `read_rows` bằng số dòng của bảng nghĩa là đọc cả bảng.

PostgreSQL lưu theo dòng: một trang giữ trọn các dòng, nên `EXPLAIN (ANALYZE, BUFFERS)` cho thấy cùng số trang dù câu cần một cột hay tám cột. Ở bài lab, `pg_column_size` cho số byte của từng cột, như kho theo cột sẽ đọc.

## Cú pháp

```text
-- ClickHouse (read only)
EXPLAIN indexes = 1
SELECT port, sum(teu)
FROM shipments_wide
WHERE port = 'VNSGN'
GROUP BY port;

SELECT read_rows, read_bytes
FROM system.query_log
WHERE type = 'QueryFinish';
```

```sql
SELECT sum(pg_column_size(port)
    + pg_column_size(teu))
    AS needed_bytes
FROM shipments_wide;
```

- `pg_column_size(x)`: số byte giá trị `x` chiếm.
- `pg_column_size(s.*)`: số byte của cả dòng.

## Ví dụ

PostgreSQL đọc bao nhiêu trang cho một câu chỉ cần cột `teu`.

```sql
EXPLAIN (ANALYZE, BUFFERS,
  COSTS OFF, TIMING OFF,
  SUMMARY OFF)
SELECT sum(teu)
FROM shipments_wide;
```

Cả bảng có bao nhiêu trang 8 KB: con số trên gần bằng nó.

```sql
SELECT pg_relation_size(
    'shipments_wide') / 8192
  AS pages;
```

Phần trăm số byte mỗi dòng nằm ở cột `notes`.

```sql
SELECT round(100.0
    * sum(pg_column_size(notes))
    / sum(pg_column_size(s.*)), 1)
  AS notes_pct
FROM shipments_wide s;
```

## Lỗi hay gặp

Tính chi phí như `SELECT *`: kho theo cột không đọc các cột câu không dùng.

```sql
-- WRONG: bytes of whole rows
SELECT sum(pg_column_size(s.*))
  AS bytes_read
FROM shipments_wide s
WHERE port = 'VNSGN';
```

```sql
-- FIX: only the columns used
SELECT sum(pg_column_size(port)
    + pg_column_size(teu))
  AS bytes_read
FROM shipments_wide
WHERE port = 'VNSGN';
```

Lọc theo cột không nằm trong thứ tự sắp: granule nào cũng có thể khớp, không bỏ được granule nào.

```sql
-- WRONG: status is not the sort key
SELECT count(*) FILTER (
    WHERE lo <= 'sailed'
      AND hi >= 'sailed') AS after,
  count(*) AS before
FROM (SELECT (id - 1) / 2048 AS g,
    min(status) AS lo,
    max(status) AS hi
  FROM shipments_wide
  GROUP BY 1) m;
```

```sql
-- FIX: filter on the sort key
SELECT count(*) FILTER (
    WHERE lo <= 'VNSGN'
      AND hi >= 'VNSGN') AS after,
  count(*) AS before
FROM (SELECT (id - 1) / 2048 AS g,
    min(port) AS lo,
    max(port) AS hi
  FROM shipments_wide
  GROUP BY 1) m;
```

## Thực hành

Ba bước: so số byte của hai cột câu cần với cả dòng, xếp bốn cột theo số byte, rồi viết dòng Granules dạng sau/trước cho bộ lọc theo cảng (granule 2.048 dòng ở đây để có nhiều granule hơn; mặc định của ClickHouse là 8.192).

## Tóm tắt

- Kho theo cột chỉ đọc các cột câu cần: chi phí gần với số byte của các cột đó.
- `EXPLAIN indexes = 1` in `Granules` dạng sau/trước cho từng chỉ mục.
- `system.query_log` có `read_rows`, `read_bytes`; không có `Indexes` và `read_rows` bằng số dòng là đọc cả bảng.
- PostgreSQL đọc trọn trang dù câu cần một cột; đo từng cột bằng `pg_column_size`.

# EN

## Opening

A Cargo Query dashboard query gets slower as the shipments table grows. Before adding machines, ask how many bytes that query has to read and how many granules it can skip; this lesson measures both numbers on PostgreSQL.

## Key idea

In a column store, the ClickHouse docs say only the columns a query needs are read from disk. So the cost of an analytical query is close to **the bytes of the columns it uses**, times the rows it cannot skip. Dropping one wide column from `SELECT` can save more bytes than anything else.

To see how much is skipped, `EXPLAIN indexes = 1` prints each index used (`PrimaryKey`, `Skip`, `Partition`…) with `Parts` and `Granules` in **after/before** form: `6/10` means 6 of 10 granules are still read. After the run, `system.query_log` records `read_rows`, `read_bytes`, `memory_usage`, `query_duration_ms`. The diagnose-slow-queries docs say that no `Indexes` section plus `read_rows` equal to the table's row count means the whole table was read.

PostgreSQL stores by row: a page holds whole rows, so `EXPLAIN (ANALYZE, BUFFERS)` shows the same page count whether the query needs one column or eight. In the lab, `pg_column_size` gives each column's bytes, as a column store would read them.

## Syntax

```text
-- ClickHouse (read only)
EXPLAIN indexes = 1
SELECT port, sum(teu)
FROM shipments_wide
WHERE port = 'VNSGN'
GROUP BY port;

SELECT read_rows, read_bytes
FROM system.query_log
WHERE type = 'QueryFinish';
```

```sql
SELECT sum(pg_column_size(port)
    + pg_column_size(teu))
    AS needed_bytes
FROM shipments_wide;
```

- `pg_column_size(x)`: the bytes value `x` takes.
- `pg_column_size(s.*)`: the bytes of the whole row.

## Example

How many pages PostgreSQL reads for a query that needs only column `teu`.

```sql
EXPLAIN (ANALYZE, BUFFERS,
  COSTS OFF, TIMING OFF,
  SUMMARY OFF)
SELECT sum(teu)
FROM shipments_wide;
```

How many 8 KB pages the whole table has: the number above is close to it.

```sql
SELECT pg_relation_size(
    'shipments_wide') / 8192
  AS pages;
```

The share of each row's bytes held by column `notes`.

```sql
SELECT round(100.0
    * sum(pg_column_size(notes))
    / sum(pg_column_size(s.*)), 1)
  AS notes_pct
FROM shipments_wide s;
```

## Common mistakes

Costing a query as `SELECT *`: a column store does not read the columns the query does not use.

```sql
-- WRONG: bytes of whole rows
SELECT sum(pg_column_size(s.*))
  AS bytes_read
FROM shipments_wide s
WHERE port = 'VNSGN';
```

```sql
-- FIX: only the columns used
SELECT sum(pg_column_size(port)
    + pg_column_size(teu))
  AS bytes_read
FROM shipments_wide
WHERE port = 'VNSGN';
```

Filtering on a column outside the sort order: any granule could match, so none is skipped.

```sql
-- WRONG: status is not the sort key
SELECT count(*) FILTER (
    WHERE lo <= 'sailed'
      AND hi >= 'sailed') AS after,
  count(*) AS before
FROM (SELECT (id - 1) / 2048 AS g,
    min(status) AS lo,
    max(status) AS hi
  FROM shipments_wide
  GROUP BY 1) m;
```

```sql
-- FIX: filter on the sort key
SELECT count(*) FILTER (
    WHERE lo <= 'VNSGN'
      AND hi >= 'VNSGN') AS after,
  count(*) AS before
FROM (SELECT (id - 1) / 2048 AS g,
    min(port) AS lo,
    max(port) AS hi
  FROM shipments_wide
  GROUP BY 1) m;
```

## Practice

Three steps: compare the bytes of the two columns the query needs with whole rows, rank four columns by bytes, then write the Granules line in after/before form for the port filter (granules of 2,048 rows here to get more of them; ClickHouse's default is 8,192).

## Recap

- A column store reads only the columns a query needs: the cost is close to those columns' bytes.
- `EXPLAIN indexes = 1` prints `Granules` as after/before for each index.
- `system.query_log` has `read_rows`, `read_bytes`; no `Indexes` plus `read_rows` equal to the row count means a full read.
- PostgreSQL reads whole pages even for one column; measure each column with `pg_column_size`.
