---
id: e-pg-ext-12
engine: postgres
level: EXT
module: ext-server
title: "TimescaleDB: chuỗi thời gian"
title_en: "TimescaleDB: time series"
kind: concept
runtime: docs
docs_why: ext
minutes: 14
verified: { version: "PostgreSQL 18.x (PGlite 0.5.16)", date: "2026-11-26" }
figures:
  - { name: pg-ext-hypertable-chunks, at: idea }
objectives:
  - vi: Giải thích hypertable, khúc theo thời gian và vì sao câu về tuần gần nhất vẫn rẻ.
    en: Explain hypertables, time chunks and why a question about the last week stays cheap.
  - vi: Đọc `time_bucket`, continuous aggregate và chính sách giữ dữ liệu của TimescaleDB.
    en: Read TimescaleDB's `time_bucket`, continuous aggregates and retention policies.
  - vi: Dựng bản tương đương bằng Postgres lõi - phân vùng theo khoảng, `date_bin`, materialized view - và biết chỗ nó thiếu.
    en: Build the core Postgres equivalent - range partitions, `date_bin`, a materialized view - and know where it falls short.
demo_setup: |
  CREATE TABLE container_events (
    container_id int NOT NULL,
    event_time timestamp NOT NULL,
    port text NOT NULL
  ) PARTITION BY RANGE (event_time);
  CREATE TABLE container_events_2026_08 PARTITION OF container_events
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
  CREATE TABLE container_events_2026_09 PARTITION OF container_events
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
  CREATE TABLE container_events_2026_10 PARTITION OF container_events
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
  INSERT INTO container_events
  SELECT g % 40 + 1, timestamp '2026-08-01' + g * interval '13 minutes',
         (ARRAY['VNDAD', 'VNSGN', 'VNHPH'])[g % 3 + 1]
  FROM generate_series(0, 10150) AS g;
  ANALYZE container_events;
sources:
  - { url: https://www.tigerdata.com/docs/use-timescale/latest/hypertables, title_vi: "Hypertable" }
  - { url: https://www.tigerdata.com/docs/reference/timescaledb/hypertables/create_table, title_vi: "Tạo hypertable bằng CREATE TABLE" }
  - { url: https://www.tigerdata.com/docs/use-timescale/latest/continuous-aggregates/create-a-continuous-aggregate, title_vi: "Tạo continuous aggregate" }
  - { url: https://www.tigerdata.com/docs/use-timescale/latest/data-retention/create-a-retention-policy, title_vi: "Tạo chính sách giữ dữ liệu (retention)" }
  - { url: https://www.tigerdata.com/docs/about/latest/timescaledb-editions, title_vi: "Các phiên bản TimescaleDB" }
  - { url: https://www.postgresql.org/docs/18/ddl-partitioning.html, title_vi: "Phân vùng bảng (partitioning)" }
  - { url: https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-BIN, title_vi: "Hàm ngày giờ › date_bin" }
quiz:
  - q:
      vi: "Bảng sự kiện container phân vùng theo tháng bằng Postgres lõi. Ngày 1/11 một sự kiện mới được ghi nhưng chưa ai tạo phân vùng tháng 11. Chuyện gì xảy ra?"
      en: "The container event table is partitioned by month in core Postgres. On 1 Nov a new event is written but nobody created November's partition. What happens?"
    options:
      - { vi: "Câu ghi bị từ chối: không có phân vùng nào chứa dòng đó", en: "The write is refused: no partition holds that row" }
      - { vi: "Postgres tự tạo phân vùng tháng 11, như hypertable tạo khúc", en: "Postgres creates November's partition, as a hypertable makes a chunk" }
      - { vi: "Dòng vào phân vùng tháng 10, phân vùng cuối cùng đang có", en: "The row goes into October, the last partition there is" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe hợp lý vì hypertable tự tạo khúc khi có dữ liệu mới, nhưng phân vùng lõi thì không: câu ghi lỗi 23514. Phải tạo trước phân vùng các tháng sắp tới (bằng tay, bằng lịch chạy, hoặc bằng pg_partman ở bài sau), hoặc có một phân vùng `DEFAULT`."
      en: "It sounds right because a hypertable creates chunks as new data arrives, but core partitioning does not: the write fails with 23514. Create the coming months' partitions ahead of time (by hand, on a schedule, or with pg_partman in the next lesson), or keep a `DEFAULT` partition."
  - q:
      vi: "Bảng báo cáo theo ngày là một materialized view thường. Sáng nay có sự kiện mới. Bảng báo cáo cho số nào?"
      en: "The daily report is a plain materialized view. New events arrived this morning. Which numbers does the report show?"
    options:
      - { vi: "Số mới nhất, vì view luôn đọc lại bảng gốc mỗi lần hỏi", en: "The newest numbers, since a view always rereads the base table" }
      - { vi: "Số của lần `REFRESH MATERIALIZED VIEW` cuối cùng", en: "The numbers from the last `REFRESH MATERIALIZED VIEW`" }
      - { vi: "Không số nào: view bị khóa đến khi có lần làm mới sau", en: "None: the view is locked until the next refresh runs" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì view thường đọc lại bảng gốc, nhưng materialized view lưu kết quả lại và chỉ đổi khi bạn `REFRESH`, mỗi lần tính lại toàn bộ. Continuous aggregate của TimescaleDB làm mới từng khoảng theo chính sách, và có thể ghép phần chưa làm mới lúc đọc."
      en: "It sounds right because a plain view rereads the base table, but a materialized view stores its result and changes only when you `REFRESH`, recomputing everything each time. A TimescaleDB continuous aggregate refreshes range by range on a policy, and can merge in the part not yet refreshed at read time."
---
## Mở bài

Cargo Query ghi mỗi lần container qua cổng, lên tàu, xuống tàu: hàng nghìn dòng mỗi ngày, không bao giờ sửa, gần như chỉ hỏi về vài tuần gần nhất. Bảng cứ dài ra, còn câu "tuần này cảng Tiên Sa có bao nhiêu lượt" phải giữ được tốc độ.

## Ý chính

TimescaleDB là extension cho dữ liệu chuỗi thời gian. Bảng chính là hypertable: với người dùng nó là một bảng, bên dưới là các khúc (chunk), mỗi khúc giữ một khoảng thời gian, mặc định 7 ngày. Dòng mới tự vào khúc đúng, khúc mới tự được tạo. Câu lọc theo cột thời gian chỉ mở các khúc chạm khoảng hỏi, nên câu về tuần này rẻ dù bảng giữ cả năm.

Quanh hypertable có thêm công cụ: `time_bucket` gom thời gian thành ô đều nhau; continuous aggregate là bảng tổng hợp tự làm mới từng khoảng theo chính sách; chính sách giữ dữ liệu xóa cả khúc cũ, rẻ hơn nhiều so với `DELETE` từng dòng; lưu dạng cột (columnstore) nén khúc cũ. Lưu ý giấy phép: bản Apache 2 không có continuous aggregate, nén hay chính sách giữ dữ liệu; các tính năng đó thuộc bản Community dưới Tiger Data License (TSL).

TimescaleDB cần cài trên server, không chạy trong trình duyệt. Phần chạy được ở bài này là bản tương đương bằng Postgres lõi: bảng phân vùng theo khoảng thời gian, `date_bin` thay cho `time_bucket`, và một materialized view. Nhiều người nghĩ phân vùng lõi là hypertable không có tên thương mại. Thật ra phần lõi không tự tạo phân vùng mới, không tự làm mới bảng tổng hợp và không tự xóa dữ liệu cũ: mỗi việc đó bạn phải tự lên lịch.

## Cú pháp

```text
CREATE TABLE container_events (
  container_id int NOT NULL,
  event_time timestamptz NOT NULL,
  port text NOT NULL
) WITH (
  tsdb.hypertable,
  tsdb.partition_column='event_time',
  tsdb.chunk_interval='7 days'
);
SELECT time_bucket('1 day', event_time)
         AS day, count(*)
FROM container_events GROUP BY day;
```

- `tsdb.hypertable`: tạo hypertable thay cho bảng thường.
- `tsdb.chunk_interval`: độ dài mỗi khúc; mặc định 7 ngày.
- `time_bucket`: gom thời gian thành ô; bản lõi gần nhất là `date_bin`.

## Ví dụ

Bảng tổng hợp tự làm mới và chính sách giữ dữ liệu của TimescaleDB (chỉ để đọc):

```text
CREATE MATERIALIZED VIEW daily_moves
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 day', event_time)
         AS day, port, count(*) AS n
FROM container_events
GROUP BY day, port;
SELECT add_continuous_aggregate_policy(
  'daily_moves',
  start_offset => INTERVAL '1 month',
  end_offset => INTERVAL '1 day',
  schedule_interval =>
    INTERVAL '1 hour');
SELECT add_retention_policy(
  'container_events',
  INTERVAL '90 days');
```

Bản lõi: số lượt theo ngày ở Tiên Sa trong tuần cuối, gom bằng `date_bin`:

```sql
SELECT date_bin('1 day', event_time,
         timestamp '2026-01-01')
         AS day,
       count(*) AS moves
FROM container_events
WHERE port = 'VNDAD'
  AND event_time >= '2026-10-24'
GROUP BY day
ORDER BY day;
```

Một dòng mỗi ngày từ 24/10, mỗi ngày khoảng 37 lượt.

Câu về tuần cuối chỉ đọc phân vùng tháng 10:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*)
FROM container_events
WHERE event_time >= '2026-10-24';
```

Kế hoạch chỉ có `container_events_2026_10`: phân vùng tháng 8 và 9 bị bỏ qua lúc lập kế hoạch.

Bảng tổng hợp theo ngày bằng materialized view:

```sql
CREATE MATERIALIZED VIEW daily_moves AS
SELECT date_bin('1 day', event_time,
         timestamp '2026-01-01')
         AS day,
       port, count(*) AS n
FROM container_events
GROUP BY day, port;
SELECT day, n FROM daily_moves
WHERE port = 'VNDAD'
ORDER BY day DESC LIMIT 3;
```

Ba ngày gần nhất của Tiên Sa, đọc từ bảng đã tính sẵn.

Giữ dữ liệu: tách phân vùng cũ ra khỏi bảng thay vì `DELETE` từng dòng:

```sql
ALTER TABLE container_events
  DETACH PARTITION
  container_events_2026_08;
SELECT count(*) AS left_rows
FROM container_events;
```

Chỉ còn các dòng tháng 9 và 10; bảng tháng 8 vẫn còn, riêng ra, có thể lưu trữ hoặc `DROP`.

## Lỗi hay gặp

Ghi dòng vào tháng chưa có phân vùng:

```sql
-- ERROR 23514:
INSERT INTO container_events
VALUES (7, '2026-11-01 08:00',
        'VNDAD');
```

Phân vùng lõi không tự tạo tháng mới; hypertable thì có. Tạo trước các tháng sắp tới hoặc giữ một phân vùng `DEFAULT`.

Lọc theo biểu thức trên cột thời gian:

```sql
-- WRONG: every month is read
EXPLAIN (COSTS OFF)
SELECT count(*)
FROM container_events
WHERE event_time::date
      >= '2026-10-24';
```

```sql
-- FIX: compare the column itself
EXPLAIN (COSTS OFF)
SELECT count(*)
FROM container_events
WHERE event_time >= '2026-10-24';
```

Câu sai quét mọi phân vùng còn lại vì Postgres không suy được khoảng từ `event_time::date`; câu đúng chỉ đọc tháng 10. Hypertable cũng chỉ bỏ khúc khi điều kiện đặt trên chính cột thời gian.

Tin materialized view luôn mới:

```sql
-- WRONG: the view is not refreshed
INSERT INTO container_events
VALUES (7, '2026-10-30 23:50',
        'VNDAD');
SELECT n FROM daily_moves
WHERE port = 'VNDAD'
  AND day = '2026-10-30';
```

```sql
-- FIX: refresh, then read
REFRESH MATERIALIZED VIEW daily_moves;
SELECT n FROM daily_moves
WHERE port = 'VNDAD'
  AND day = '2026-10-30';
```

Câu sai vẫn ra số cũ; sau `REFRESH` số tăng 1. Continuous aggregate có chính sách tự làm mới; materialized view lõi cần bạn lên lịch.

## Tóm tắt

- Hypertable là một bảng trên nhiều khúc thời gian; câu lọc theo thời gian chỉ mở khúc cần.
- `time_bucket`, continuous aggregate, chính sách giữ dữ liệu: chỉ có trên server cài TimescaleDB, phần lớn dưới giấy phép TSL.
- Bản lõi: phân vùng theo khoảng, `date_bin`, materialized view, `DETACH PARTITION`.
- Bản lõi không tự tạo phân vùng, không tự làm mới, không tự xóa: phải lên lịch.

# EN

## Opening

Cargo Query logs every time a container passes a gate, is loaded or is discharged: thousands of rows a day, never updated, almost always queried for the last few weeks. The table keeps growing, and "how many moves at Tien Sa this week" must stay fast.

## Key idea

TimescaleDB is an extension for time-series data. The main table is a hypertable: to users it is one table, underneath it is a set of chunks, each holding one time range, 7 days by default. New rows go to the right chunk on their own, and new chunks are created on their own. A query filtered on the time column opens only the chunks that touch the range asked for, so a question about this week is cheap even when the table holds a whole year.

Around the hypertable come more tools: `time_bucket` groups time into even buckets; a continuous aggregate is a summary table refreshed range by range on a policy; a retention policy drops whole old chunks, far cheaper than a row-by-row `DELETE`; columnstore storage compresses old chunks. Mind the licence: the Apache 2 edition has no continuous aggregates, compression or retention policies; those belong to the Community edition under the Tiger Data License (TSL).

TimescaleDB must be installed on a server and does not run in the browser. What runs in this lesson is the core Postgres equivalent: a table partitioned by time range, `date_bin` in place of `time_bucket`, and a materialized view. Many people think core partitioning is a hypertable without the brand name. In fact the core version does not create new partitions, refresh summaries or remove old data by itself: you must schedule each of those.

## Syntax

```text
CREATE TABLE container_events (
  container_id int NOT NULL,
  event_time timestamptz NOT NULL,
  port text NOT NULL
) WITH (
  tsdb.hypertable,
  tsdb.partition_column='event_time',
  tsdb.chunk_interval='7 days'
);
SELECT time_bucket('1 day', event_time)
         AS day, count(*)
FROM container_events GROUP BY day;
```

- `tsdb.hypertable`: creates a hypertable instead of a plain table.
- `tsdb.chunk_interval`: the length of each chunk; 7 days by default.
- `time_bucket`: groups time into buckets; the closest core function is `date_bin`.

## Example

TimescaleDB's self-refreshing summary and retention policy (to read only):

```text
CREATE MATERIALIZED VIEW daily_moves
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 day', event_time)
         AS day, port, count(*) AS n
FROM container_events
GROUP BY day, port;
SELECT add_continuous_aggregate_policy(
  'daily_moves',
  start_offset => INTERVAL '1 month',
  end_offset => INTERVAL '1 day',
  schedule_interval =>
    INTERVAL '1 hour');
SELECT add_retention_policy(
  'container_events',
  INTERVAL '90 days');
```

Core version: moves per day at Tien Sa in the last week, bucketed with `date_bin`:

```sql
SELECT date_bin('1 day', event_time,
         timestamp '2026-01-01')
         AS day,
       count(*) AS moves
FROM container_events
WHERE port = 'VNDAD'
  AND event_time >= '2026-10-24'
GROUP BY day
ORDER BY day;
```

One row per day from 24 Oct, about 37 moves a day.

The last-week query reads only October's partition:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*)
FROM container_events
WHERE event_time >= '2026-10-24';
```

The plan holds only `container_events_2026_10`: the August and September partitions are skipped at planning time.

A daily summary as a materialized view:

```sql
CREATE MATERIALIZED VIEW daily_moves AS
SELECT date_bin('1 day', event_time,
         timestamp '2026-01-01')
         AS day,
       port, count(*) AS n
FROM container_events
GROUP BY day, port;
SELECT day, n FROM daily_moves
WHERE port = 'VNDAD'
ORDER BY day DESC LIMIT 3;
```

Tien Sa's three latest days, read from the precomputed table.

Retention: detach the old partition from the table instead of a row-by-row `DELETE`:

```sql
ALTER TABLE container_events
  DETACH PARTITION
  container_events_2026_08;
SELECT count(*) AS left_rows
FROM container_events;
```

Only September's and October's rows remain; the August table still exists on its own, ready to archive or `DROP`.

## Common mistakes

Writing a row into a month with no partition:

```sql
-- ERROR 23514:
INSERT INTO container_events
VALUES (7, '2026-11-01 08:00',
        'VNDAD');
```

Core partitioning does not create the new month; a hypertable does. Create the coming months ahead of time or keep a `DEFAULT` partition.

Filtering on an expression over the time column:

```sql
-- WRONG: every month is read
EXPLAIN (COSTS OFF)
SELECT count(*)
FROM container_events
WHERE event_time::date
      >= '2026-10-24';
```

```sql
-- FIX: compare the column itself
EXPLAIN (COSTS OFF)
SELECT count(*)
FROM container_events
WHERE event_time >= '2026-10-24';
```

The wrong query scans every remaining partition because Postgres cannot derive a range from `event_time::date`; the right one reads October only. A hypertable also skips chunks only when the condition is on the time column itself.

Trusting a materialized view to be current:

```sql
-- WRONG: the view is not refreshed
INSERT INTO container_events
VALUES (7, '2026-10-30 23:50',
        'VNDAD');
SELECT n FROM daily_moves
WHERE port = 'VNDAD'
  AND day = '2026-10-30';
```

```sql
-- FIX: refresh, then read
REFRESH MATERIALIZED VIEW daily_moves;
SELECT n FROM daily_moves
WHERE port = 'VNDAD'
  AND day = '2026-10-30';
```

The wrong query still shows the old number; after `REFRESH` it goes up by 1. A continuous aggregate has a refresh policy; a core materialized view needs you to schedule it.

## Recap

- A hypertable is one table over time chunks; a time-filtered query opens only the chunks it needs.
- `time_bucket`, continuous aggregates, retention policies: only on a server with TimescaleDB, mostly under the TSL licence.
- Core version: range partitions, `date_bin`, a materialized view, `DETACH PARTITION`.
- The core version does not create partitions, refresh or delete by itself: schedule it.
