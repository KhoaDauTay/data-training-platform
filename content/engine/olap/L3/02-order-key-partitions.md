---
id: e-ol-l3-02
engine: olap
level: L3
module: clickhouse
title: "Chọn ORDER BY, partition và cách chèn"
title_en: "Choosing ORDER BY, partitions and how to insert"
kind: concept
runtime: docs
minutes: 25
figures: [{ name: ol-order-key, at: idea }]
objectives:
  - vi: Chọn khóa sắp xếp theo bộ lọc hay dùng, cột ít giá trị khác nhau đứng trước.
    en: Pick the sorting key from the common filters, low-cardinality columns first.
  - vi: Biết partition trong ClickHouse chủ yếu để quản lý dữ liệu, thường không mịn hơn theo tháng.
    en: Know that ClickHouse partitions are mainly for data management, usually no finer than by month.
  - vi: Chèn theo lô lớn, vì mỗi lệnh chèn tạo một part.
    en: Insert in large batches, since every insert creates a part.
requires: [e-ol-l3-01]
sources:
  - { url: "https://clickhouse.com/docs/data-modeling/schema-design", title: "ClickHouse docs: Schema design", title_vi: "Tài liệu ClickHouse: thiết kế schema" }
  - { url: "https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree", title: "ClickHouse docs: MergeTree", title_vi: "Tài liệu ClickHouse: MergeTree" }
  - { url: "https://clickhouse.com/docs/best-practices/selecting-an-insert-strategy", title: "ClickHouse docs: Selecting an insert strategy", title_vi: "Tài liệu ClickHouse: chọn cách ghi dữ liệu" }
  - { url: "https://www.postgresql.org/docs/18/view-pg-stats.html", title: "PostgreSQL 18 docs: pg_stats", title_vi: "pg_stats" }
demo_setup: |
  CREATE TABLE ev (
    port text, ts timestamp
  );
  INSERT INTO ev
  SELECT (ARRAY['VNDAD','VNHPH','VNSGN'])
      [1 + k % 3],
    timestamp '2026-09-01'
      + k * interval '10 minutes'
  FROM generate_series(1, 8000) AS k;
  CREATE TABLE ev_sorted AS
  SELECT * FROM ev ORDER BY port, ts;
  ANALYZE ev;
  ANALYZE ev_sorted;
quiz:
  - q:
      vi: "Hầu hết báo cáo lọc theo cảng (3 giá trị) rồi theo khoảng thời gian. Khóa sắp xếp nào hợp nhất?"
      en: "Most reports filter by port (3 values), then by a time range. Which sorting key fits best?"
    options:
      - { vi: "`ORDER BY (ts, port)`", en: "`ORDER BY (ts, port)`" }
      - { vi: "`ORDER BY (port, ts)`", en: "`ORDER BY (port, ts)`" }
      - { vi: "`ORDER BY (container_id)`", en: "`ORDER BY (container_id)`" }
    answer: 1
    trap: 0
    why:
      vi: "Đặt `ts` trước nghe hợp lý vì dữ liệu tới theo thời gian, nhưng khi đó các dòng của một cảng rải khắp bảng và bộ lọc cảng phải đọc gần như mọi granule. Tài liệu khuyên dùng cột của bộ lọc hay dùng và xếp cột ít giá trị khác nhau trước: `port` rồi `ts` gom mỗi cảng thành một khoảng liền, trong đó thời gian vẫn tăng dần. Khóa theo `container_id` không giúp bộ lọc nào ở đây."
      en: "Putting `ts` first sounds right because data arrives in time order, but then one port's rows are spread across the table and a port filter reads almost every granule. The docs advise using the columns of common filters and putting low-cardinality columns first: `port` then `ts` gathers each port into one stretch, with time still ascending inside it. A key on `container_id` helps none of these filters."
  - q:
      vi: "Một dịch vụ gửi mỗi sự kiện một lệnh `INSERT`, hàng nghìn lệnh mỗi phút. Điều gì xảy ra với bảng MergeTree?"
      en: "A service sends each event as its own `INSERT`, thousands a minute. What happens to the MergeTree table?"
    options:
      - { vi: "Nhanh hơn vì mỗi lệnh nhỏ", en: "Faster, since each insert is small" }
      - { vi: "Không khác gì chèn theo lô", en: "No different from batch inserts" }
      - { vi: "Quá nhiều part, truy vấn chậm", en: "Too many parts, slow queries" }
    answer: 2
    trap: 0
    why:
      vi: "Mỗi lệnh nhỏ thì xong nhanh, nhưng tài liệu ghi mỗi lệnh chèn tạo ngay một part trên đĩa, kèm siêu dữ liệu và chỉ mục. Hàng nghìn part nhỏ mỗi phút làm tiến trình gộp không theo kịp, truy vấn chậm và có lỗi \"too many parts\". Tài liệu khuyên lô ít nhất 1.000 dòng, tốt nhất 10.000 đến 100.000, hoặc bật chèn bất đồng bộ (async insert)."
      en: "Each small insert finishes fast, but the docs say every insert immediately creates a part on disk, with its metadata and indexes. Thousands of small parts a minute leave the merges behind, slowing queries and leading to \"too many parts\" errors. The docs recommend batches of at least 1,000 rows, ideally 10,000 to 100,000, or turning on asynchronous inserts."
---
## Mở bài

Ba quyết định của một bảng ClickHouse khó đổi về sau: khóa sắp xếp, khóa partition và cách dữ liệu được chèn vào. Bài này đọc lời khuyên của tài liệu ClickHouse và đo phần dễ thấy nhất trên PostgreSQL: dữ liệu đã sắp thì thứ tự trên đĩa trùng với thứ tự của cột.

## Ý chính

**Khóa sắp xếp** quyết định cả chỉ mục lẫn thứ tự ghi trên đĩa. Tài liệu khuyên chọn cột của các bộ lọc hay dùng, xếp theo số giá trị khác nhau tăng dần: cột ít giá trị (cảng) trước, cột nhiều giá trị (thời gian) sau. Lọc trên cột đứng sau trong khóa kém hiệu quả hơn.

**Partition** (`PARTITION BY`), theo tài liệu, chủ yếu là kỹ thuật quản lý dữ liệu (xóa, chuyển cả một tháng), không phải công cụ tăng tốc truy vấn. Đừng chia quá mịn: thường không cần khóa partition mịn hơn theo tháng.

**Chèn theo lô**: mỗi lệnh `INSERT` tạo ngay một part. Tài liệu khuyên lô ít nhất 1.000 dòng, tốt nhất 10.000 đến 100.000; nhiều lô nhỏ đồng bộ dẫn tới lỗi "too many parts". Trên PostgreSQL, `pg_stats.correlation` cho thấy bảng đã sắp có thứ tự trên đĩa khớp với cột (1 là khớp hẳn).

## Ví dụ

```text
-- ClickHouse (read only)
CREATE TABLE ev (
  port String,
  ts DateTime
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (port, ts);
```

Độ khớp giữa thứ tự trên đĩa và cột `port`: chèn theo thời gian thì thấp, sắp theo `port, ts` thì bằng 1.

```sql
SELECT tablename, correlation
FROM pg_stats
WHERE attname = 'port'
  AND tablename IN ('ev', 'ev_sorted')
ORDER BY tablename;
```

Dữ liệu trải qua mấy tháng, mấy ngày: số partition mỗi cách chia sẽ tạo.

```sql
SELECT count(DISTINCT
    date_trunc('month', ts)) AS months,
  count(DISTINCT
    date_trunc('day', ts)) AS days
FROM ev;
```

## Lỗi hay gặp

Chia partition theo ngày: mỗi ngày một partition, hàng chục partition chỉ cho hai tháng dữ liệu.

```sql
-- WRONG: one partition per day
SELECT count(DISTINCT ts::date)
  AS partitions
FROM ev;
```

```sql
-- FIX: one partition per month
SELECT count(DISTINCT
    date_trunc('month', ts))
  AS partitions
FROM ev;
```

Đặt cột nhiều giá trị trước trong khóa: các dòng của một cảng bị cắt vụn. Đếm số đoạn liền một cảng theo mỗi thứ tự.

```sql
-- WRONG: ORDER BY (ts, port)
SELECT count(*) AS port_runs
FROM (
  SELECT port, lag(port)
    OVER (ORDER BY ts, port) AS prev
  FROM ev
) r
WHERE prev IS DISTINCT FROM port;
```

```sql
-- FIX: ORDER BY (port, ts)
SELECT count(*) AS port_runs
FROM (
  SELECT port, lag(port)
    OVER (ORDER BY port, ts) AS prev
  FROM ev
) r
WHERE prev IS DISTINCT FROM port;
```

## Tóm tắt

- Khóa sắp xếp quyết định chỉ mục và thứ tự trên đĩa: chọn theo bộ lọc hay dùng.
- Xếp cột ít giá trị khác nhau trước, cột thời gian sau.
- Partition để quản lý dữ liệu; thường không mịn hơn theo tháng.
- Mỗi `INSERT` tạo một part: chèn lô 10.000 đến 100.000 dòng.

# EN

## Opening

Three decisions of a ClickHouse table are hard to change later: the sorting key, the partition key and how data is inserted. This lesson reads the ClickHouse docs' advice and measures the easiest part to see on PostgreSQL: once data is sorted, its order on disk matches the column's order.

## Key idea

The **sorting key** decides both the index and the order written on disk. The docs advise choosing the columns of common filters, ordered by ascending cardinality: the low-cardinality column (port) first, the high-cardinality one (time) after. Filtering on a later key column is less efficient.

A **partition** (`PARTITION BY`), according to the docs, is mainly a data management technique (dropping or moving a whole month), not a query optimisation tool. Do not partition too finely: you generally do not need a partition key finer than by month.

**Insert in batches**: every `INSERT` immediately creates a part. The docs recommend batches of at least 1,000 rows, ideally 10,000 to 100,000; many small synchronous batches lead to "too many parts" errors. On PostgreSQL, `pg_stats.correlation` shows that a sorted table's order on disk matches the column (1 means a perfect match).

## Example

```text
-- ClickHouse (read only)
CREATE TABLE ev (
  port String,
  ts DateTime
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (port, ts);
```

How well the order on disk matches column `port`: low when inserted by time, 1 when sorted by `port, ts`.

```sql
SELECT tablename, correlation
FROM pg_stats
WHERE attname = 'port'
  AND tablename IN ('ev', 'ev_sorted')
ORDER BY tablename;
```

How many months and days the data spans: the partitions each split would create.

```sql
SELECT count(DISTINCT
    date_trunc('month', ts)) AS months,
  count(DISTINCT
    date_trunc('day', ts)) AS days
FROM ev;
```

## Common mistakes

Partitioning by day: one partition per day, dozens of partitions for just two months of data.

```sql
-- WRONG: one partition per day
SELECT count(DISTINCT ts::date)
  AS partitions
FROM ev;
```

```sql
-- FIX: one partition per month
SELECT count(DISTINCT
    date_trunc('month', ts))
  AS partitions
FROM ev;
```

Putting the high-cardinality column first in the key: one port's rows get chopped up. Count the runs of one port under each order.

```sql
-- WRONG: ORDER BY (ts, port)
SELECT count(*) AS port_runs
FROM (
  SELECT port, lag(port)
    OVER (ORDER BY ts, port) AS prev
  FROM ev
) r
WHERE prev IS DISTINCT FROM port;
```

```sql
-- FIX: ORDER BY (port, ts)
SELECT count(*) AS port_runs
FROM (
  SELECT port, lag(port)
    OVER (ORDER BY port, ts) AS prev
  FROM ev
) r
WHERE prev IS DISTINCT FROM port;
```

## Recap

- The sorting key decides the index and the order on disk: pick it from the common filters.
- Put low-cardinality columns first, the time column after.
- Partitions are for data management; usually no finer than by month.
- Every `INSERT` creates a part: insert batches of 10,000 to 100,000 rows.
