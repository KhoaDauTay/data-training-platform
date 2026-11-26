---
id: e-ts-l3-02
engine: timeseries
level: L3
module: storage
title: Giữ dữ liệu có hạn bằng partition theo tháng
title_en: Retention with monthly partitions
kind: lab
runtime: browser
minutes: 22
figures: [{ name: ts-partition-retention, at: idea }]
objectives:
  - vi: Chia bảng số đo theo tháng bằng `PARTITION BY RANGE (ts)` và xem dòng nằm ở partition nào.
    en: Split a measurements table by month with `PARTITION BY RANGE (ts)` and see which partition holds each row.
  - vi: Tạo sẵn partition cho tháng tới, trước khi dữ liệu của tháng đó về.
    en: Create next month's partition before its data arrives.
  - vi: Xóa cả một tháng cũ bằng `DETACH PARTITION` rồi `DROP TABLE`, thay vì `DELETE` từng dòng.
    en: Remove a whole old month with `DETACH PARTITION` then `DROP TABLE`, instead of a row-by-row `DELETE`.
requires: [e-ts-l3-01]
sources:
  - https://www.postgresql.org/docs/18/ddl-partitioning.html
  - https://www.postgresql.org/docs/18/sql-altertable.html
  - https://www.postgresql.org/docs/18/ddl-partition-pruning.html
lab:
  setup: |
    CREATE TABLE metrics (
      sensor_id int NOT NULL,
      ts timestamptz NOT NULL,
      temp_c numeric(4,1) NOT NULL
    ) PARTITION BY RANGE (ts);
    CREATE TABLE metrics_2026_08
      PARTITION OF metrics FOR VALUES
      FROM ('2026-08-01 00:00+00')
      TO ('2026-09-01 00:00+00');
    CREATE TABLE metrics_2026_09
      PARTITION OF metrics FOR VALUES
      FROM ('2026-09-01 00:00+00')
      TO ('2026-10-01 00:00+00');
    CREATE TABLE metrics_2026_10
      PARTITION OF metrics FOR VALUES
      FROM ('2026-10-01 00:00+00')
      TO ('2026-11-01 00:00+00');
    INSERT INTO metrics
    SELECT 1 + g % 4,
      timestamptz '2026-08-01 00:00+00'
        + g * interval '1 hour',
      -18 + (g % 7) / 2.0
    FROM generate_series(0, 2183) g;
    ANALYZE metrics;
  steps:
    - task:
        vi: "Mỗi partition của `metrics` đang giữ bao nhiêu dòng? Trả `part` (tên partition), `rows`, xếp theo `part`."
        en: "How many rows does each partition of `metrics` hold? Return `part` (the partition's name), `rows`, sorted by `part`."
      solution: |
        SELECT tableoid::regclass::text
            AS part,
          count(*) AS rows
        FROM metrics
        GROUP BY 1
        ORDER BY 1
      check: rows
      ordered: true
      hint:
        vi: "Cột hệ thống `tableoid` cho biết dòng nằm ở bảng nào; `tableoid::regclass::text` là tên bảng đó."
        en: "The system column `tableoid` tells which table a row lives in; `tableoid::regclass::text` is that table's name."
    - task:
        vi: "Tạo sẵn partition `metrics_2026_11` cho tháng 11/2026 (từ 0 giờ ngày 01/11 tới trước 0 giờ ngày 01/12, UTC)."
        en: "Create the partition `metrics_2026_11` for November 2026 (from 00:00 on 1 Nov to before 00:00 on 1 Dec, UTC)."
      solution: |
        CREATE TABLE metrics_2026_11
          PARTITION OF metrics FOR VALUES
          FROM ('2026-11-01 00:00+00')
          TO ('2026-12-01 00:00+00')
      check: catalog
      hint:
        vi: "`CREATE TABLE metrics_2026_11 PARTITION OF metrics FOR VALUES FROM (...) TO (...)`; mốc `TO` không thuộc partition."
        en: "`CREATE TABLE metrics_2026_11 PARTITION OF metrics FOR VALUES FROM (...) TO (...)`; the `TO` bound is not part of the partition."
    - task:
        vi: "Kho chỉ giữ dữ liệu từ tháng 9. Tách partition tháng 8 khỏi `metrics` (giữ lại bảng đó để lưu trữ, chưa xóa)."
        en: "The store keeps data from September only. Detach the August partition from `metrics` (keep that table for the archive, do not drop it yet)."
      solution: |
        ALTER TABLE metrics
          DETACH PARTITION metrics_2026_08
      check: rows
      after: |
        SELECT tableoid::regclass::text
            AS part,
          count(*) AS rows
        FROM metrics
        GROUP BY 1
        ORDER BY 1
      hint:
        vi: "`ALTER TABLE metrics DETACH PARTITION metrics_2026_08`; bài chấm bằng số dòng còn lại trong từng partition."
        en: "`ALTER TABLE metrics DETACH PARTITION metrics_2026_08`; the step is graded on the rows left in each partition."
    - task:
        vi: "Bảng tháng 8 đã được lưu trữ ở nơi khác. Xóa hẳn bảng `metrics_2026_08`."
        en: "The August table has been archived elsewhere. Drop the table `metrics_2026_08` for good."
      solution: |
        DROP TABLE metrics_2026_08
      check: rows
      after: |
        SELECT relname
        FROM pg_class
        WHERE relname LIKE 'metrics%'
          AND relkind IN ('r', 'p')
        ORDER BY relname
      hint:
        vi: "`DROP TABLE metrics_2026_08` xóa cả tháng trong một lệnh, không quét từng dòng."
        en: "`DROP TABLE metrics_2026_08` removes the whole month in one statement, without scanning rows."
quiz:
  - q:
      vi: "Bảng chưa có partition cho tháng 12. Thiết bị gửi một số đo ngày 05/12. Điều gì xảy ra?"
      en: "The table has no partition for December. A device sends a reading dated 5 Dec. What happens?"
    options:
      - { vi: "PostgreSQL tự tạo partition tháng 12", en: "PostgreSQL creates the December partition itself" }
      - { vi: "Dòng vào partition gần nhất là tháng 11", en: "The row goes to the nearest partition, November" }
      - { vi: "Lệnh `INSERT` báo lỗi, dòng không được ghi", en: "The `INSERT` fails and the row is not written" }
    answer: 2
    trap: 0
    why:
      vi: "Nghe như cơ sở dữ liệu sẽ tự lo, nhưng PostgreSQL không bao giờ tự tạo partition: dòng không thuộc khoảng nào thì `INSERT` báo lỗi 23514 (\"no partition of relation found for row\"). Nó cũng không nhét dòng vào partition gần nhất, vì mỗi partition chỉ nhận đúng khoảng của mình. Vì vậy phải tạo sẵn partition cho các tháng tới, bằng một lịch chạy định kỳ hoặc extension như pg_partman (bài \"pg_partman và pg_cron: tự bảo trì phân vùng và lịch chạy\"), hoặc thêm một partition `DEFAULT` để hứng dòng lạc."
      en: "It sounds like the database will take care of it, but PostgreSQL never creates a partition by itself: a row that fits no range makes the `INSERT` fail with error 23514 (\"no partition of relation found for row\"). Nor does it put the row into the nearest partition, because each partition accepts only its own range. So you create the coming months' partitions ahead of time, with a scheduled job or an extension such as pg_partman (lesson \"pg_partman and pg_cron: partition upkeep and schedules\"), or add a `DEFAULT` partition to catch stray rows."
  - q:
      vi: "Vì sao xóa một tháng cũ bằng `DETACH` rồi `DROP TABLE` tốt hơn `DELETE FROM metrics WHERE ts < '2026-09-01'`?"
      en: "Why is removing an old month with `DETACH` then `DROP TABLE` better than `DELETE FROM metrics WHERE ts < '2026-09-01'`?"
    options:
      - { vi: "`DELETE` xóa sai dòng khi bảng có partition", en: "`DELETE` removes the wrong rows when the table is partitioned" }
      - { vi: "`DROP TABLE` bỏ cả file, không ghi từng dòng xóa", en: "`DROP TABLE` removes the whole file, with no per-row deletes" }
      - { vi: "`DELETE` không chạy được trên bảng có partition", en: "`DELETE` cannot run on a partitioned table" }
    answer: 1
    trap: 2
    why:
      vi: "`DELETE` vẫn chạy được và xóa đúng dòng trên bảng có partition, nên đó không phải lý do. Lý do là chi phí: `DELETE` phải tìm và đánh dấu xóa từng dòng của tháng (744 dòng ở lab này, hàng triệu dòng ở hệ thống thật), ghi nhật ký cho từng dòng, rồi để lại dòng chết chờ VACUUM dọn. `DROP TABLE` trên partition đã tách chỉ bỏ cả file của tháng đó trong một lệnh. `DETACH` trước giúp giữ lại bảng để lưu trữ trước khi xóa hẳn."
      en: "`DELETE` does run and removes the right rows on a partitioned table, so that is not the reason. The reason is cost: `DELETE` must find and mark every row of the month (744 rows in this lab, millions in a real system), log each one, and leave dead rows for VACUUM to clean up. `DROP TABLE` on a detached partition just removes that month's whole file in one statement. `DETACH` first lets you keep the table for the archive before dropping it."
---
## Mở bài

Kho số đo của cảng giữ ba tháng gần nhất; mỗi đầu tháng, một tháng cũ phải ra đi. Với bảng chia partition theo tháng, việc đó là bỏ cả một bảng con, không phải xóa từng dòng.

## Ý chính

**Partition theo khoảng thời gian.** `PARTITION BY RANGE (ts)` biến `metrics` thành bảng cha không chứa dòng nào; mỗi tháng là một bảng con với khoảng `FROM ... TO ...` (gồm mốc đầu, không gồm mốc cuối). Dòng được ghi vào đúng bảng con theo `ts`, và câu đọc có điều kiện trên `ts` chỉ quét những bảng con cần (partition pruning, bài `e-pg-l4-07`).

**Tạo trước.** PostgreSQL không tự tạo partition. Ghi một dòng không thuộc khoảng nào thì báo lỗi, nên partition tháng tới phải có trước khi dữ liệu về. pg_partman và pg_cron làm việc này theo lịch (bài `e-pg-ext-13`); TimescaleDB gọi các bảng con là chunk và tạo tự động (bài `e-pg-ext-12`).

**Xóa theo khối.** `ALTER TABLE metrics DETACH PARTITION metrics_2026_08` tách tháng 8 thành một bảng độc lập: dữ liệu vẫn còn, nhưng không còn trong `metrics`. Lưu trữ xong thì `DROP TABLE` bỏ cả file, không quét dòng nào, không để lại dòng chết như `DELETE`.

Thiết kế partition chi tiết hơn (chọn khóa, cỡ khoảng) nằm ở bài `e-pg-l4-08`. Hình cuối mục cho thấy bốn tháng: một tháng tách ra để xóa, một tháng tạo sẵn.

## Cú pháp

```sql
CREATE TABLE metrics (...)
  PARTITION BY RANGE (ts);
CREATE TABLE metrics_2026_11
  PARTITION OF metrics FOR VALUES
  FROM ('2026-11-01 00:00+00')
  TO ('2026-12-01 00:00+00');
ALTER TABLE metrics
  DETACH PARTITION metrics_2026_08;
DROP TABLE metrics_2026_08;
```

- `tableoid::regclass` cho biết một dòng nằm ở partition nào.
- Một partition `DEFAULT` hứng dòng không thuộc khoảng nào, nhưng làm việc tạo partition mới sau đó chậm hơn (phải kiểm tra dòng trong `DEFAULT`).

## Ví dụ

Khoảng của từng partition, đọc từ catalog:

```sql
SELECT c.relname,
  pg_get_expr(c.relpartbound, c.oid)
    AS bounds
FROM pg_class c
WHERE c.relispartition
ORDER BY c.relname;
```

Lọc theo `ts` chỉ quét partition tháng 10:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM metrics
WHERE ts >= '2026-10-15 00:00+00'
  AND ts < '2026-10-16 00:00+00';
```

## Lỗi hay gặp

Bọc `ts` trong hàm: PostgreSQL không biết tháng nào cần đọc nên quét mọi partition.

```sql
-- WRONG: every partition is scanned
EXPLAIN (COSTS OFF)
SELECT count(*) FROM metrics
WHERE date_trunc('day', ts)
  = '2026-10-15 00:00+00';
```

```sql
-- FIX: a range on ts prunes
EXPLAIN (COSTS OFF)
SELECT count(*) FROM metrics
WHERE ts >= '2026-10-15 00:00+00'
  AND ts < '2026-10-16 00:00+00';
```

Ghi một dòng của tháng chưa có partition:

```sql
-- ERROR 23514
INSERT INTO metrics VALUES
  (1, '2026-12-05 00:00+00', -18);
```

## Thực hành

Bốn câu: đếm dòng ở mỗi partition, tạo partition tháng 11, tách partition tháng 8, rồi xóa hẳn nó.

## Tóm tắt

- `PARTITION BY RANGE (ts)` chia bảng số đo theo tháng.
- PostgreSQL không tự tạo partition: tạo trước, theo lịch.
- Xóa một tháng cũ bằng `DETACH PARTITION` rồi `DROP TABLE`, không `DELETE` từng dòng.
- Lọc thẳng trên `ts` để PostgreSQL chỉ quét các partition cần.

# EN

## Opening

The port's measurement store keeps the last three months; at the start of each month an old month has to go. With a table partitioned by month, that means dropping one child table, not deleting row by row.

## Key idea

**Partitions by time range.** `PARTITION BY RANGE (ts)` turns `metrics` into a parent table that holds no rows; each month is a child table with a `FROM ... TO ...` range (start included, end excluded). Each row is written to the right child by its `ts`, and a read with a condition on `ts` scans only the children it needs (partition pruning, lesson `e-pg-l4-07`).

**Create ahead.** PostgreSQL does not create partitions by itself. Writing a row that fits no range fails, so next month's partition must exist before its data arrives. pg_partman and pg_cron do this on a schedule (lesson `e-pg-ext-13`); TimescaleDB calls the children chunks and creates them automatically (lesson `e-pg-ext-12`).

**Remove in blocks.** `ALTER TABLE metrics DETACH PARTITION metrics_2026_08` turns August into a standalone table: the data is still there, but no longer in `metrics`. Once archived, `DROP TABLE` removes the whole file, without scanning any row and without leaving dead rows like `DELETE` does.

More detailed partition design (choosing the key, the range size) is in lesson `e-pg-l4-08`. The figure at the end of this section shows four months: one detached to be dropped, one created ahead.

## Syntax

```sql
CREATE TABLE metrics (...)
  PARTITION BY RANGE (ts);
CREATE TABLE metrics_2026_11
  PARTITION OF metrics FOR VALUES
  FROM ('2026-11-01 00:00+00')
  TO ('2026-12-01 00:00+00');
ALTER TABLE metrics
  DETACH PARTITION metrics_2026_08;
DROP TABLE metrics_2026_08;
```

- `tableoid::regclass` tells which partition a row lives in.
- A `DEFAULT` partition catches rows that fit no range, but makes creating a new partition later slower (the rows in `DEFAULT` must be checked).

## Example

Each partition's range, read from the catalog:

```sql
SELECT c.relname,
  pg_get_expr(c.relpartbound, c.oid)
    AS bounds
FROM pg_class c
WHERE c.relispartition
ORDER BY c.relname;
```

A filter on `ts` scans only the October partition:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM metrics
WHERE ts >= '2026-10-15 00:00+00'
  AND ts < '2026-10-16 00:00+00';
```

## Common mistakes

Wrapping `ts` in a function: PostgreSQL cannot tell which month to read, so it scans every partition.

```sql
-- WRONG: every partition is scanned
EXPLAIN (COSTS OFF)
SELECT count(*) FROM metrics
WHERE date_trunc('day', ts)
  = '2026-10-15 00:00+00';
```

```sql
-- FIX: a range on ts prunes
EXPLAIN (COSTS OFF)
SELECT count(*) FROM metrics
WHERE ts >= '2026-10-15 00:00+00'
  AND ts < '2026-10-16 00:00+00';
```

Writing a row for a month that has no partition yet:

```sql
-- ERROR 23514
INSERT INTO metrics VALUES
  (1, '2026-12-05 00:00+00', -18);
```

## Practice

Four questions: count the rows in each partition, create the November partition, detach the August partition, then drop it for good.

## Recap

- `PARTITION BY RANGE (ts)` splits a measurements table by month.
- PostgreSQL does not create partitions by itself: create them ahead, on a schedule.
- Remove an old month with `DETACH PARTITION` then `DROP TABLE`, not a row-by-row `DELETE`.
- Filter on `ts` itself so PostgreSQL scans only the partitions it needs.
