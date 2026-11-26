---
id: e-st-l3-04
engine: stack
level: L3
module: warehouse
title: "BigQuery: trả tiền theo byte quét"
title_en: "BigQuery: paying for bytes scanned"
kind: concept
runtime: docs
minutes: 15
figures: [{ name: st-bytes-scanned, at: idea }]
objectives:
  - vi: Biết BigQuery theo yêu cầu tính tiền theo số byte câu lệnh đọc, và cột, partition, `LIMIT` ảnh hưởng con số đó ra sao.
    en: Know that on-demand BigQuery bills by the bytes a query reads, and how columns, partitions and `LIMIT` affect that number.
  - vi: Thấy cắt partition (partition pruning) bằng `EXPLAIN` trên một bảng partition của Postgres.
    en: See partition pruning with `EXPLAIN` on a partitioned Postgres table.
  - vi: Ước byte một câu đọc từ kích thước từng cột và số partition nó chạm.
    en: Estimate the bytes a query reads from each column's size and the partitions it touches.
requires: [e-st-l3-01]
sources:
  - { url: "https://docs.cloud.google.com/bigquery/docs/best-practices-costs", title: "BigQuery docs: Best practices for controlling costs" }
  - { url: "https://docs.cloud.google.com/bigquery/docs/best-practices-performance-compute", title: "BigQuery docs: Optimize query computation (Avoid SELECT *)" }
  - { url: "https://docs.cloud.google.com/bigquery/docs/partitioned-tables", title: "BigQuery docs: Introduction to partitioned tables" }
  - { url: "https://docs.cloud.google.com/bigquery/docs/clustered-tables", title: "BigQuery docs: Introduction to clustered tables" }
  - https://www.postgresql.org/docs/18/ddl-partitioning.html
demo_setup: |
  CREATE TABLE app_events (
    day date, user_id int, kind text,
    payload text
  ) PARTITION BY RANGE (day);
  CREATE TABLE app_events_1029
    PARTITION OF app_events FOR VALUES
    FROM ('2026-10-29') TO ('2026-10-30');
  CREATE TABLE app_events_1030
    PARTITION OF app_events FOR VALUES
    FROM ('2026-10-30') TO ('2026-10-31');
  CREATE TABLE app_events_1031
    PARTITION OF app_events FOR VALUES
    FROM ('2026-10-31') TO ('2026-11-01');
  INSERT INTO app_events
  SELECT date '2026-10-29' + (i % 3),
    1000 + i % 50,
    (ARRAY['view', 'cart', 'buy'])[1 + i % 3],
    repeat('x', 200)
  FROM generate_series(1, 300) AS i;
quiz:
  - q:
      vi: "Bảng 500 GB, không phân cụm (clustering). `SELECT * FROM t LIMIT 10` bị tính bao nhiêu byte?"
      en: "A 500 GB table, not clustered. How many bytes does `SELECT * FROM t LIMIT 10` bill?"
    options:
      - { vi: "Chỉ cỡ 10 dòng", en: "Only about 10 rows" }
      - { vi: "Cả 500 GB của mọi cột", en: "All 500 GB of every column" }
      - { vi: "0, vì chỉ là xem thử", en: "0, since it is only a preview" }
    answer: 1
    trap: 0
    why:
      vi: "`LIMIT 10` nghe như chỉ đọc 10 dòng, nhưng tài liệu ghi rõ: với bảng không phân cụm, `LIMIT` không đổi lượng dữ liệu được đọc. `SELECT *` đọc mọi cột, trên mọi dòng, nên là cả 500 GB. Muốn xem thử thì dùng nút xem trước bảng (preview) trong giao diện, không phải một câu `SELECT`."
      en: "`LIMIT 10` sounds like reading 10 rows, but the docs state that for non-clustered tables a `LIMIT` does not change the amount of data read. `SELECT *` reads every column over every row, so all 500 GB. For a quick look, use the table preview in the console, not a `SELECT`."
  - q:
      vi: "Bảng chia partition theo ngày, 100 ngày đều nhau. Cột `user_id` 8 GB, `kind` 2 GB, `payload` 90 GB. `SELECT user_id, kind … WHERE day = '2026-10-31'` đọc bao nhiêu?"
      en: "A table partitioned by day, 100 even days. Column `user_id` is 8 GB, `kind` 2 GB, `payload` 90 GB. How much does `SELECT user_id, kind … WHERE day = '2026-10-31'` read?"
    options:
      - { vi: "100 GB", en: "100 GB" }
      - { vi: "10 GB", en: "10 GB" }
      - { vi: "0,1 GB", en: "0.1 GB" }
    answer: 2
    trap: 1
    why:
      vi: "10 GB đúng là hai cột đã chọn (8 + 2), nên dễ dừng ở đó, nhưng bộ lọc trên cột partition còn bỏ 99 ngày kia: 10 GB / 100 = 0,1 GB. 100 GB là đọc mọi cột của mọi ngày, như `SELECT *` không lọc."
      en: "10 GB is indeed the two chosen columns (8 + 2), so it is easy to stop there, but the filter on the partition column also skips the other 99 days: 10 GB / 100 = 0.1 GB. 100 GB is every column of every day, like an unfiltered `SELECT *`."
---
## Mở bài

Nhóm marketing của Chợ Lồng Đèn chạy BigQuery, và một câu `SELECT *` để "xem thử" đã đọc hết bảng sự kiện. Bài này đọc luật tính byte trong tài liệu, rồi xem cắt partition chạy thật trên Postgres.

## Ý chính

Ở chế độ theo yêu cầu (on-demand), BigQuery tính tiền theo **số byte câu lệnh đọc** (byte logic, chưa nén), không theo thời gian chạy. BigQuery lưu theo cột, và tài liệu của BigQuery gọi số cột câu đọc là projection, khuyên chỉ chọn cột cần dùng: `SELECT *` đọc và tính tiền mọi cột, kể cả cột `payload` nặng nhất. Với bảng không phân cụm, `LIMIT` không giảm lượng dữ liệu đọc.

Bảng **partition** chia theo một cột (thường là ngày): một bộ lọc trên chính cột đó cho phép bỏ qua partition không khớp. Bảng **phân cụm** (clustering) xếp dữ liệu theo vài cột trong mỗi partition, nên lọc theo các cột đó, và cả `LIMIT`, có thể đọc ít hơn. Trước khi chạy, dry run cho một ước lượng byte (cận trên), và thiết lập số byte tối đa được tính chặn những câu quá đắt.

Postgres không tính tiền theo byte và lưu theo dòng, nhưng cắt partition thì giống: `EXPLAIN` cho thấy partition nào bị bỏ. Hình cuối mục tô những ô một câu thật sự đọc.

## Cú pháp

```text
-- BigQuery (read only)
CREATE TABLE shop.app_events (
  day DATE, user_id INT64,
  kind STRING, payload STRING)
PARTITION BY day
CLUSTER BY kind;
```

```sql
-- PostgreSQL: one partition scanned
EXPLAIN (COSTS OFF)
SELECT count(*) FROM app_events
WHERE day = '2026-10-31';
```

- Lọc thẳng trên cột partition; một biểu thức bọc quanh nó có thể làm mất việc cắt partition.
- Chỉ chọn cột cần dùng; `LIMIT` trên bảng không phân cụm không giảm byte.

## Ví dụ

Cắt partition: chỉ `app_events_1031` được quét.

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM app_events
WHERE day = '2026-10-31';
```

Mỗi cột nặng bao nhiêu trong một ngày: `payload` chiếm gần hết.

```sql
SELECT sum(pg_column_size(user_id))
    AS user_id_b,
  sum(pg_column_size(kind)) AS kind_b,
  sum(pg_column_size(payload))
    AS payload_b
FROM app_events
WHERE day = '2026-10-31';
```

## Lỗi hay gặp

Bọc cột partition trong một biểu thức: Postgres không cắt được, cả ba partition đều bị quét.

```sql
-- WRONG: expression on the column
EXPLAIN (COSTS OFF)
SELECT count(*) FROM app_events
WHERE day + 1 = '2026-11-01';
```

```sql
-- FIX: compare the bare column
EXPLAIN (COSTS OFF)
SELECT count(*) FROM app_events
WHERE day = '2026-10-31';
```

`SELECT *` để lấy một cột: ở kho lưu theo cột, câu đọc cả `payload`. Bản Postgres ước số byte đó bằng kích thước cả dòng.

```sql
-- WRONG: every column is read
SELECT sum(pg_column_size(e.*))
  AS bytes_read
FROM app_events e
WHERE day = '2026-10-31';
```

```sql
-- FIX: only the column you need
SELECT sum(pg_column_size(user_id))
  AS bytes_read
FROM app_events
WHERE day = '2026-10-31';
```

## Tóm tắt

- BigQuery theo yêu cầu tính theo byte đọc, không theo thời gian chạy.
- Mỗi cột thêm vào là thêm byte phải đọc: tránh `SELECT *`.
- Lọc thẳng trên cột partition để bỏ partition; phân cụm giúp đọc ít hơn nữa.
- `LIMIT` trên bảng không phân cụm không giảm byte; dùng dry run để ước trước.

# EN

## Opening

Lantern Market's marketing team runs BigQuery, and a `SELECT *` meant as "a quick look" read the whole events table. This lesson reads the byte rules in the docs, then watches partition pruning run for real on Postgres.

## Key idea

In on-demand mode, BigQuery bills by **the bytes a query reads** (logical, uncompressed bytes), not by running time. BigQuery stores data by column, and its docs call the number of columns a query reads its projection and advise selecting only the columns you need: `SELECT *` reads and bills every column, including the heaviest `payload`. On a non-clustered table, `LIMIT` does not reduce the data read.

A **partitioned** table is split on one column (often a date): a filter on that very column lets the query skip partitions that do not match. A **clustered** table sorts data by a few columns within each partition, so filtering on them, and even `LIMIT`, can read less. Before running, a dry run gives a byte estimate (an upper bound), and a maximum-bytes-billed setting blocks queries that would cost too much.

Postgres does not bill by bytes and stores rows, but partition pruning works the same: `EXPLAIN` shows which partitions are skipped. The figure at the end of this section shades the cells a query really reads.

## Syntax

```text
-- BigQuery (read only)
CREATE TABLE shop.app_events (
  day DATE, user_id INT64,
  kind STRING, payload STRING)
PARTITION BY day
CLUSTER BY kind;
```

```sql
-- PostgreSQL: one partition scanned
EXPLAIN (COSTS OFF)
SELECT count(*) FROM app_events
WHERE day = '2026-10-31';
```

- Filter on the bare partition column; an expression wrapped around it can lose the pruning.
- Select only the columns you use; `LIMIT` on a non-clustered table does not reduce bytes.

## Example

Partition pruning: only `app_events_1031` is scanned.

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM app_events
WHERE day = '2026-10-31';
```

How heavy each column is in one day: `payload` takes nearly all of it.

```sql
SELECT sum(pg_column_size(user_id))
    AS user_id_b,
  sum(pg_column_size(kind)) AS kind_b,
  sum(pg_column_size(payload))
    AS payload_b
FROM app_events
WHERE day = '2026-10-31';
```

## Common mistakes

Wrapping the partition column in an expression: Postgres cannot prune, and all three partitions are scanned.

```sql
-- WRONG: expression on the column
EXPLAIN (COSTS OFF)
SELECT count(*) FROM app_events
WHERE day + 1 = '2026-11-01';
```

```sql
-- FIX: compare the bare column
EXPLAIN (COSTS OFF)
SELECT count(*) FROM app_events
WHERE day = '2026-10-31';
```

`SELECT *` to get one column: in a column store the query also reads `payload`. The Postgres version estimates those bytes with the whole row's size.

```sql
-- WRONG: every column is read
SELECT sum(pg_column_size(e.*))
  AS bytes_read
FROM app_events e
WHERE day = '2026-10-31';
```

```sql
-- FIX: only the column you need
SELECT sum(pg_column_size(user_id))
  AS bytes_read
FROM app_events
WHERE day = '2026-10-31';
```

## Recap

- On-demand BigQuery bills by bytes read, not by running time.
- Every extra column adds bytes to read: avoid `SELECT *`.
- Filter on the bare partition column to skip partitions; clustering helps read even less.
- `LIMIT` on a non-clustered table does not reduce bytes; use a dry run to estimate first.
