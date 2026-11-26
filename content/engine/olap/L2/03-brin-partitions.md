---
id: e-ol-l2-03
engine: olap
level: L2
module: pganalytics
title: "BRIN và partition cho bảng sự kiện lớn"
title_en: "BRIN and partitions for large event tables"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: ol-brin, at: idea }]
objectives:
  - vi: Dùng chỉ mục BRIN, chỉ giữ min và max của mỗi khối trang, cho cột tăng dần theo thời gian.
    en: Use a BRIN index, which keeps only the min and max of each block range, on a column that grows with time.
  - vi: Chia bảng theo tháng bằng partition và thêm partition mới trước khi dữ liệu tới.
    en: Split a table by month with partitions and add the next partition before the data arrives.
  - vi: Viết bộ lọc trên cột partition để PostgreSQL bỏ qua partition không khớp.
    en: Write a filter on the partition column so PostgreSQL skips partitions that do not match.
requires: [e-ol-l2-02]
sources:
  - { url: "https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree", title: "ClickHouse docs: MergeTree" }
  - { url: "https://www.postgresql.org/docs/18/brin.html", title: "PostgreSQL 18 docs: BRIN Indexes" }
  - { url: "https://www.postgresql.org/docs/18/ddl-partitioning.html", title: "PostgreSQL 18 docs: Table Partitioning" }
lab:
  setup: |
    CREATE TABLE events (
      id int, ts timestamp,
      port text, teu int
    );
    INSERT INTO events
    SELECT i,
      timestamp '2026-10-01'
        + i * interval '2 minutes',
      (ARRAY['VNDAD','VNSGN','VNHPH'])
        [1 + i % 3],
      1 + i % 2
    FROM generate_series(1, 20000) AS i;
    CREATE TABLE ev_month (
      day date, port text, teu int
    ) PARTITION BY RANGE (day);
    CREATE TABLE ev_2026_09
      PARTITION OF ev_month FOR VALUES
      FROM ('2026-09-01') TO ('2026-10-01');
    CREATE TABLE ev_2026_10
      PARTITION OF ev_month FOR VALUES
      FROM ('2026-10-01') TO ('2026-11-01');
    INSERT INTO ev_month
    SELECT date '2026-09-01' + i % 61,
      (ARRAY['VNDAD','VNSGN'])[1 + i % 2],
      1 + i % 3
    FROM generate_series(1, 2000) AS i;
    ANALYZE events;
    ANALYZE ev_month;
  steps:
    - task:
        vi: "Tạo chỉ mục BRIN `events_ts_brin` trên cột `ts` của `events`."
        en: "Create the BRIN index `events_ts_brin` on column `ts` of `events`."
      solution: |
        CREATE INDEX events_ts_brin
          ON events USING brin (ts);
      check: catalog
      hint:
        vi: "`CREATE INDEX events_ts_brin ON events USING brin (ts)`."
        en: "`CREATE INDEX events_ts_brin ON events USING brin (ts)`."
    - task:
        vi: "Tháng 11 sắp tới: thêm partition `ev_2026_11` của `ev_month` cho các ngày từ `2026-11-01` tới trước `2026-12-01`."
        en: "November is coming: add partition `ev_2026_11` of `ev_month` for days from `2026-11-01` up to `2026-12-01`."
      solution: |
        CREATE TABLE ev_2026_11
          PARTITION OF ev_month FOR VALUES
          FROM ('2026-11-01')
          TO ('2026-12-01');
      check: catalog
      hint:
        vi: "`CREATE TABLE ev_2026_11 PARTITION OF ev_month FOR VALUES FROM (…) TO (…)`."
        en: "`CREATE TABLE ev_2026_11 PARTITION OF ev_month FOR VALUES FROM (…) TO (…)`."
    - task:
        vi: "TEU theo cảng của ngày `2026-10-15` trong `ev_month`, lọc thẳng trên cột `day`: `port`, `teu`."
        en: "TEU by port on day `2026-10-15` in `ev_month`, filtering directly on column `day`: `port`, `teu`."
      solution: |
        SELECT port, sum(teu) AS teu
        FROM ev_month
        WHERE day = '2026-10-15'
        GROUP BY port;
      check: rows
      hint:
        vi: "`WHERE day = '2026-10-15'`, `GROUP BY port`."
        en: "`WHERE day = '2026-10-15'`, `GROUP BY port`."
quiz:
  - q:
      vi: "Vì sao chỉ mục BRIN trên `ts` nhỏ hơn B-tree trên cùng cột hàng chục lần?"
      en: "Why is a BRIN index on `ts` dozens of times smaller than a B-tree on the same column?"
    options:
      - { vi: "Nó nén từng khóa của B-tree", en: "It compresses each B-tree key" }
      - { vi: "Nó giữ một min, max cho mỗi khối trang", en: "It keeps one min, max per block range" }
      - { vi: "Nó chỉ giữ các giá trị khác nhau", en: "It keeps only distinct values" }
    answer: 1
    trap: 0
    why:
      vi: "BRIN không nén khóa B-tree: nó không có khóa cho từng dòng. Nó chỉ ghi giá trị nhỏ nhất và lớn nhất cho mỗi khối trang liền nhau (mặc định 128 trang), nên vài trăm trang bảng chỉ cần vài dòng chỉ mục. Mọi `ts` đều khác nhau, nên giữ giá trị khác nhau cũng không làm nó nhỏ đi."
      en: "BRIN does not compress B-tree keys: it has no per-row key at all. It records only the smallest and largest value for each range of adjacent pages (128 pages by default), so hundreds of table pages need only a few index entries. Every `ts` is distinct, so keeping distinct values would not make it small either."
  - q:
      vi: "BRIN trên cột `port` (ba cảng trộn đều trong mọi trang) giúp được gì?"
      en: "What does a BRIN on column `port` (three ports mixed evenly in every page) help with?"
    options:
      - { vi: "Gần như không gì", en: "Almost nothing" }
      - { vi: "Lọc một cảng rất nhanh", en: "Filtering one port very fast" }
      - { vi: "Đảm bảo cảng là duy nhất", en: "Making ports unique" }
    answer: 0
    trap: 1
    why:
      vi: "BRIN chỉ bỏ được một khối khi giá trị cần tìm nằm ngoài min và max của khối đó. Khi ba cảng trộn đều, khối nào cũng có min `VNDAD` và max `VNSGN`, nên không khối nào bị bỏ và câu lệnh vẫn đọc hết. BRIN cũng không có ràng buộc duy nhất. Nó hợp với cột tăng theo thứ ghi, như thời gian."
      en: "BRIN can skip a range only when the value sought lies outside that range's min and max. With three ports mixed evenly, every range has min `VNDAD` and max `VNSGN`, so no range is skipped and the query still reads everything. BRIN has no unique constraint either. It suits columns that grow in insert order, like time."
---
## Mở bài

Bảng sự kiện container của Cargo Query thêm hàng nghìn dòng mỗi ngày và hầu như chỉ bị đọc theo khoảng thời gian. PostgreSQL lưu theo dòng, nhưng có hai công cụ cho kiểu bảng này: chỉ mục BRIN và partition.

## Ý chính

**BRIN** (block range index) chia bảng thành các khối trang liền nhau (mặc định 128 trang) và chỉ ghi min, max của cột cho mỗi khối. Khi cột tăng theo thứ ghi, như `ts`, mỗi khối có một khoảng hẹp, và câu lọc theo thời gian bỏ được hầu hết các khối. Chỉ mục rất nhỏ; đổi lại, mỗi khối còn lại phải đọc hết và kiểm lại từng dòng.

**Partition** chia một bảng thành các bảng con theo khoảng giá trị, ở đây một tháng một partition. Bộ lọc trên chính cột partition cho phép bỏ qua cả partition (partition pruning), và xóa dữ liệu cũ là bỏ một partition thay vì `DELETE` hàng triệu dòng. Partition cho tháng tới phải có trước khi dữ liệu tới, nếu không lệnh chèn báo lỗi.

Cả hai là bản "theo dòng" của một ý mà ClickHouse làm sẵn: chỉ mục thưa trên dữ liệu đã sắp xếp, và partition theo tháng (bài cấp L3).

## Cú pháp

```sql
CREATE INDEX events_ts_brin
  ON events USING brin (ts);
```

- `USING brin (col)`: một min, max cho mỗi 128 trang (tham số `pages_per_range`).
- `PARTITION OF t FOR VALUES FROM (a) TO (b)`: `a` có, `b` không.

## Ví dụ

BRIN nhỏ hơn B-tree trên cùng cột rất nhiều.

```sql
CREATE INDEX ev_ts_brin
  ON events USING brin (ts);
CREATE INDEX ev_ts_btree
  ON events (ts);
SELECT
  pg_relation_size('ev_ts_brin')
    AS brin_bytes,
  pg_relation_size('ev_ts_btree')
    AS btree_bytes;
```

Lọc một ngày trên `ev_month`: kế hoạch chỉ quét `ev_2026_10`.

```sql
EXPLAIN (COSTS OFF)
SELECT sum(teu) FROM ev_month
WHERE day = '2026-10-15';
```

## Lỗi hay gặp

Bọc cột partition trong biểu thức: PostgreSQL không bỏ được partition nào.

```sql
-- WRONG: both partitions scanned
EXPLAIN (COSTS OFF)
SELECT sum(teu) FROM ev_month
WHERE day + 1 = '2026-10-16';
```

```sql
-- FIX: the bare partition column
EXPLAIN (COSTS OFF)
SELECT sum(teu) FROM ev_month
WHERE day = '2026-10-15';
```

Chèn một ngày chưa có partition.

```sql
-- ERROR 23514: no partition for row
INSERT INTO ev_month
VALUES ('2026-12-02', 'VNDAD', 1);
```

## Thực hành

Ba bước: tạo BRIN trên `ts`, thêm partition tháng 11, rồi gộp một ngày bằng bộ lọc trên cột partition.

## Tóm tắt

- BRIN giữ min, max mỗi khối trang: rất nhỏ, hợp với cột tăng theo thời gian.
- Trên cột trộn đều, BRIN không bỏ được khối nào.
- Partition theo tháng cho phép bỏ partition khi lọc và xóa cả tháng một lần.
- Tạo partition tháng tới trước; lọc thẳng trên cột partition.

# EN

## Opening

Cargo Query's container events table grows by thousands of rows a day and is almost only read by time range. PostgreSQL stores rows, but it has two tools for this kind of table: the BRIN index and partitions.

## Key idea

**BRIN** (block range index) splits the table into ranges of adjacent pages (128 pages by default) and records only the column's min and max for each range. When the column grows in insert order, like `ts`, each range covers a narrow span, and a time filter skips most ranges. The index is tiny; in exchange, every remaining range is read in full and each row is checked again.

**Partitions** split one table into child tables by value range, here one partition per month. A filter on the partition column itself lets PostgreSQL skip whole partitions (partition pruning), and deleting old data is dropping a partition instead of a `DELETE` of millions of rows. Next month's partition must exist before its data arrives, or the insert fails.

Both are the row-store version of an idea ClickHouse has built in: a sparse index over sorted data, and monthly partitions (a lesson in level L3).

## Syntax

```sql
CREATE INDEX events_ts_brin
  ON events USING brin (ts);
```

- `USING brin (col)`: one min, max per 128 pages (parameter `pages_per_range`).
- `PARTITION OF t FOR VALUES FROM (a) TO (b)`: `a` included, `b` not.

## Example

A BRIN is far smaller than a B-tree on the same column.

```sql
CREATE INDEX ev_ts_brin
  ON events USING brin (ts);
CREATE INDEX ev_ts_btree
  ON events (ts);
SELECT
  pg_relation_size('ev_ts_brin')
    AS brin_bytes,
  pg_relation_size('ev_ts_btree')
    AS btree_bytes;
```

Filtering one day on `ev_month`: the plan scans only `ev_2026_10`.

```sql
EXPLAIN (COSTS OFF)
SELECT sum(teu) FROM ev_month
WHERE day = '2026-10-15';
```

## Common mistakes

Wrapping the partition column in an expression: PostgreSQL cannot skip any partition.

```sql
-- WRONG: both partitions scanned
EXPLAIN (COSTS OFF)
SELECT sum(teu) FROM ev_month
WHERE day + 1 = '2026-10-16';
```

```sql
-- FIX: the bare partition column
EXPLAIN (COSTS OFF)
SELECT sum(teu) FROM ev_month
WHERE day = '2026-10-15';
```

Inserting a day that has no partition yet.

```sql
-- ERROR 23514: no partition for row
INSERT INTO ev_month
VALUES ('2026-12-02', 'VNDAD', 1);
```

## Practice

Three steps: create a BRIN on `ts`, add the November partition, then aggregate one day with a filter on the partition column.

## Recap

- BRIN keeps a min, max per page range: tiny, suited to columns that grow with time.
- On a column mixed evenly, BRIN skips no range.
- Monthly partitions skip partitions when filtering and drop a whole month at once.
- Create next month's partition first; filter on the bare partition column.
