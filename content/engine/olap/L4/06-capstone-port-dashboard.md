---
id: e-ol-l4-06
engine: olap
level: L4
module: chtuning
title: "Bài tổng kết: dashboard cảng đọc quá nhiều"
title_en: "Capstone: the port dashboard reads too much"
kind: capstone
runtime: browser
minutes: 45
figures: [{ name: ol-capstone-l4, at: idea }]
objectives:
  - vi: Tìm cột nên mã hóa từ điển và đo số byte câu dashboard thật sự cần.
    en: Find the columns worth dictionary encoding and measure the bytes the dashboard query really needs.
  - vi: Dựng bảng tổng hợp theo ngày (như SummingMergeTree) và bảng tra cảng mỗi khóa một dòng (như dictionary).
    en: Build a daily summary table (like SummingMergeTree) and a port lookup table with one row per key (like a dictionary).
  - vi: Viết lại câu dashboard trên hai bảng đó, gộp trước khi nối.
    en: Rewrite the dashboard query on those two tables, aggregating before the join.
requires: [e-ol-l4-01, e-ol-l4-02, e-ol-l4-04, e-ol-l4-05]
sources:
  - { url: "https://clickhouse.com/docs/sql-reference/data-types/lowcardinality", title: "ClickHouse docs: LowCardinality(T)" }
  - { url: "https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree", title: "ClickHouse docs: SummingMergeTree" }
  - { url: "https://clickhouse.com/docs/dictionary", title: "ClickHouse docs: Dictionary" }
  - { url: "https://clickhouse.com/docs/intro", title: "ClickHouse docs: What is ClickHouse? (column-oriented storage)" }
  - { url: "https://www.postgresql.org/docs/18/functions-admin.html", title: "PostgreSQL 18 docs: Database Object Size Functions" }
lab:
  setup: |
    CREATE TABLE ports (
      code text, name text,
      valid_from date
    );
    INSERT INTO ports VALUES
      ('VNDAD', 'Tien Sa', '2020-01-01'),
      ('VNHPH', 'Hai Phong', '2020-01-01'),
      ('VNSGN', 'Sai Gon', '2020-01-01'),
      ('VNSGN', 'Cat Lai', '2025-06-01');
    CREATE TABLE events_raw (
      id int, container text,
      port text, status text,
      teu int, day date, notes text
    );
    INSERT INTO events_raw
    SELECT g,
      'C' || lpad((g % 2500)::text,
        4, '0'),
      (ARRAY['VNDAD', 'VNHPH',
        'VNSGN'])[1 + g % 3],
      (ARRAY['booked', 'loaded',
        'sailed', 'arrived'])[1 + g % 4],
      1 + g % 4,
      date '2026-10-01' + g % 30,
      'remark ' || repeat('r', 73)
    FROM generate_series(1, 30000) AS g;
  steps:
    - name: { vi: "Cột ít giá trị", en: "Few-value columns" }
      task:
        vi: "Cột nào nên mã hóa từ điển? Trả số giá trị khác nhau: `ports`, `statuses`, `containers`."
        en: "Which columns are worth dictionary encoding? Return the distinct counts: `ports`, `statuses`, `containers`."
      solution: |
        SELECT count(DISTINCT port) AS ports,
          count(DISTINCT status)
            AS statuses,
          count(DISTINCT container)
            AS containers
        FROM events_raw;
      check: rows
      hint:
        vi: "Ba lần `count(DISTINCT …)` trên `events_raw`."
        en: "Three `count(DISTINCT …)` on `events_raw`."
    - name: { vi: "Số byte cần", en: "Bytes needed" }
      task:
        vi: "Câu dashboard dùng `port`, `day`, `teu`. Trả `needed_bytes` (ba cột đó) và `all_bytes` (cả dòng)."
        en: "The dashboard query uses `port`, `day`, `teu`. Return `needed_bytes` (those three columns) and `all_bytes` (whole rows)."
      solution: |
        SELECT sum(pg_column_size(port)
            + pg_column_size(day)
            + pg_column_size(teu))
            AS needed_bytes,
          sum(pg_column_size(e.*))
            AS all_bytes
        FROM events_raw e;
      check: rows
      hint:
        vi: "Cộng `pg_column_size` của ba cột; `pg_column_size(e.*)` cho cả dòng."
        en: "Add the `pg_column_size` of the three columns; `pg_column_size(e.*)` for whole rows."
    - name: { vi: "Bảng tổng hợp", en: "Summary table" }
      task:
        vi: "Dựng bảng tổng hợp `teu_daily` (`port`, `day`, `teu`): mỗi cảng mỗi ngày một dòng tổng, như SummingMergeTree sau khi gộp."
        en: "Build the summary table `teu_daily` (`port`, `day`, `teu`): one total row per port per day, like SummingMergeTree after a merge."
      solution: |
        CREATE TABLE teu_daily AS
        SELECT port, day,
          sum(teu) AS teu
        FROM events_raw
        GROUP BY port, day;
      after: SELECT count(*) AS row_count, sum(teu) AS teu FROM teu_daily
      check: rows
      hint:
        vi: "`CREATE TABLE teu_daily AS SELECT port, day, sum(teu) AS teu FROM events_raw GROUP BY port, day`."
        en: "`CREATE TABLE teu_daily AS SELECT port, day, sum(teu) AS teu FROM events_raw GROUP BY port, day`."
    - name: { vi: "Bảng tra cảng", en: "Port lookup" }
      task:
        vi: "Dựng bảng tra `port_dict` (`code`, `name`): mỗi mã cảng một dòng, tên của bản có `valid_from` mới nhất."
        en: "Build the lookup table `port_dict` (`code`, `name`): one row per port code, the name of the row with the latest `valid_from`."
      solution: |
        CREATE TABLE port_dict AS
        SELECT DISTINCT ON (code)
          code, name
        FROM ports
        ORDER BY code, valid_from DESC;
      after: SELECT code, name FROM port_dict
      check: rows
      hint:
        vi: "`DISTINCT ON (code)` với `ORDER BY code, valid_from DESC`."
        en: "`DISTINCT ON (code)` with `ORDER BY code, valid_from DESC`."
    - name: { vi: "Dashboard mới", en: "New dashboard" }
      task:
        vi: "Câu dashboard mới: tổng TEU theo tên cảng, từ `teu_daily` nối với `port_dict`: `name`, `teu`."
        en: "The new dashboard query: total TEU by port name, from `teu_daily` joined with `port_dict`: `name`, `teu`."
      solution: |
        SELECT d.name,
          sum(t.teu) AS teu
        FROM teu_daily t
        JOIN port_dict d
          ON d.code = t.port
        GROUP BY d.name;
      check: rows
      hint:
        vi: "`JOIN port_dict d ON d.code = t.port`, `sum(t.teu)` theo `d.name`."
        en: "`JOIN port_dict d ON d.code = t.port`, `sum(t.teu)` by `d.name`."
quiz:
  - q:
      vi: "Dashboard cũ nối thẳng `events_raw` với `ports` và báo TEU của Cát Lái bằng của Sài Gòn. Vì sao?"
      en: "The old dashboard joined `events_raw` directly with `ports` and showed Cat Lai's TEU equal to Sai Gon's. Why?"
    options:
      - { vi: "Bảng tổng hợp cộng hai lần", en: "The summary table added twice" }
      - { vi: "Mã VNSGN có hai dòng trong `ports`", en: "Code VNSGN has two rows in `ports`" }
      - { vi: "Mã hóa từ điển làm sai số", en: "Dictionary encoding broke numbers" }
    answer: 1
    trap: 0
    why:
      vi: "Dashboard cũ không dùng bảng tổng hợp, nên không thể do nó. Mã VNSGN có hai dòng trong `ports` (Sai Gon và Cat Lai), và JOIN thường trả mọi cặp khớp, nên mỗi dòng VNSGN của `events_raw` xuất hiện một lần dưới mỗi tên. Mã hóa từ điển chỉ đổi cách lưu giá trị, không đổi giá trị đọc ra."
      en: "The old dashboard did not use the summary table, so it cannot be the cause. Code VNSGN has two rows in `ports` (Sai Gon and Cat Lai), and a regular join returns every matching pair, so each VNSGN row of `events_raw` appears once under each name. Dictionary encoding only changes how values are stored, not the values read back."
  - q:
      vi: "Chuyển bước 3 và bước 4 sang ClickHouse thì chọn gì?"
      en: "Moving steps 3 and 4 to ClickHouse, what do you pick?"
    options:
      - { vi: "ReplacingMergeTree cho cả hai", en: "ReplacingMergeTree for both" }
      - { vi: "Chỉ mục bỏ qua trên `teu`", en: "A skip index on `teu`" }
      - { vi: "SummingMergeTree và một dictionary", en: "SummingMergeTree and a dictionary" }
    answer: 2
    trap: 0
    why:
      vi: "ReplacingMergeTree giữ một bản mỗi khóa và bỏ bản khác, nên tổng TEU sẽ mất phần lớn; bảng `teu_daily` cần cộng các dòng cùng khóa, đúng việc của SummingMergeTree. Bảng cảng nhỏ đọc trong mọi câu hợp với dictionary nạp sẵn trong bộ nhớ, tra bằng `dictGet`. Chỉ mục bỏ qua giúp bỏ khối khi lọc, không tạo ra tổng."
      en: "ReplacingMergeTree keeps one version per key and drops the others, so most of the TEU total would be lost; table `teu_daily` needs the rows with the same key added up, which is SummingMergeTree's job. A small port table read in every query fits a dictionary loaded in memory, looked up with `dictGet`. A skip index helps skip blocks when filtering; it produces no totals."
---
## Mở bài

Dashboard cảng của Cargo Query đọc cả bảng sự kiện cho mỗi lần tải trang, và tuần này còn báo TEU của Cát Lái trùng với Sài Gòn. Bạn dùng các công cụ của cấp L4 để biết câu cần đọc gì, rồi dựng lại nó trên bảng nhỏ hơn.

## Ý chính

Câu dashboard chỉ cần ba cột `port`, `day`, `teu`. Ở kho lưu theo cột, chỉ ba cột đó được đọc; các cột có ít giá trị như `port`, `status` còn nhỏ hơn nữa nếu mã hóa từ điển (`LowCardinality`). Bước đầu là đo: đếm giá trị khác nhau, rồi so số byte câu cần với cả dòng.

Bước sau là đọc ít dòng hơn. Một bảng **tổng hợp theo ngày** (như SummingMergeTree) chỉ còn 90 dòng thay cho 30.000; một bảng **tra cảng mỗi khóa một dòng** (như dictionary) vừa nhỏ vừa sửa lỗi khóa VNSGN bị trùng làm nhân dòng khi nối.

## Cú pháp

```text
-- ClickHouse (read only)
CREATE TABLE teu_daily (
  port LowCardinality(String),
  day Date, teu UInt64
)
ENGINE = SummingMergeTree((teu))
ORDER BY (port, day);
```

```sql
SELECT d.name, sum(t.teu) AS teu
FROM teu_daily t
JOIN port_dict d
  ON d.code = t.port
GROUP BY d.name;
```

- `teu_daily`: một dòng tổng mỗi khóa, đọc lại bằng `sum`.
- `port_dict`: mỗi mã cảng một dòng, nên nối không nhân dòng.

## Ví dụ

Số dòng thô so với số dòng của bảng tổng hợp theo ngày.

```sql
SELECT count(*) AS raw_rows,
  (SELECT count(*) FROM (
    SELECT DISTINCT port, day
    FROM events_raw) s)
    AS summary_rows
FROM events_raw;
```

Câu dashboard cũ: nối thẳng, nên VNSGN hiện dưới hai tên.

```sql
SELECT p.name, sum(e.teu) AS teu
FROM events_raw e
JOIN ports p ON p.code = e.port
GROUP BY p.name
ORDER BY p.name;
```

## Lỗi hay gặp

Tổng hợp bằng `count(*)` thay cho `sum(teu)`: ra số dòng, không phải số TEU.

```sql
-- WRONG: counts rows, not TEU
SELECT port, count(*) AS teu
FROM events_raw
GROUP BY port;
```

```sql
-- FIX: add the TEU
SELECT port, sum(teu) AS teu
FROM events_raw
GROUP BY port;
```

Nối với bảng cảng có khóa trùng: tổng chung lớn hơn tổng thật.

```sql
-- WRONG: VNSGN counted twice
SELECT sum(e.teu) AS teu
FROM events_raw e
JOIN ports p ON p.code = e.port;
```

```sql
-- FIX: one row per code
SELECT sum(e.teu) AS teu
FROM events_raw e
JOIN (SELECT DISTINCT ON (code)
    code, name
  FROM ports
  ORDER BY code,
    valid_from DESC) p
  ON p.code = e.port;
```

## Thực hành

Năm bước: đếm giá trị khác nhau, so số byte câu cần với cả dòng, dựng `teu_daily`, dựng `port_dict`, rồi viết câu dashboard mới trên hai bảng đó.

## Tóm tắt

- Đo trước: số giá trị khác nhau và số byte của các cột câu cần.
- Cột ít giá trị hợp với mã hóa từ điển.
- Bảng tổng hợp theo khóa (như SummingMergeTree) giảm số dòng phải đọc.
- Bảng tra mỗi khóa một dòng (như dictionary) không làm nhân dòng khi nối.

# EN

## Opening

Cargo Query's port dashboard reads the whole events table on every page load, and this week it also shows Cat Lai's TEU equal to Sai Gon's. You use the L4 tools to find what the query needs to read, then rebuild it on smaller tables.

## Key idea

The dashboard query needs only three columns: `port`, `day`, `teu`. In a column store, only those three are read; few-value columns like `port` and `status` get smaller still with dictionary encoding (`LowCardinality`). The first step is to measure: count distinct values, then compare the bytes the query needs with whole rows.

The next step is to read fewer rows. A **daily summary table** (like SummingMergeTree) has only 90 rows instead of 30,000; a **port lookup table with one row per key** (like a dictionary) is small and also fixes the duplicate VNSGN key that multiplies rows in the join.

## Syntax

```text
-- ClickHouse (read only)
CREATE TABLE teu_daily (
  port LowCardinality(String),
  day Date, teu UInt64
)
ENGINE = SummingMergeTree((teu))
ORDER BY (port, day);
```

```sql
SELECT d.name, sum(t.teu) AS teu
FROM teu_daily t
JOIN port_dict d
  ON d.code = t.port
GROUP BY d.name;
```

- `teu_daily`: one total row per key, read back with `sum`.
- `port_dict`: one row per port code, so the join multiplies nothing.

## Example

Raw rows compared with the rows of the daily summary table.

```sql
SELECT count(*) AS raw_rows,
  (SELECT count(*) FROM (
    SELECT DISTINCT port, day
    FROM events_raw) s)
    AS summary_rows
FROM events_raw;
```

The old dashboard query: a direct join, so VNSGN shows up under two names.

```sql
SELECT p.name, sum(e.teu) AS teu
FROM events_raw e
JOIN ports p ON p.code = e.port
GROUP BY p.name
ORDER BY p.name;
```

## Common mistakes

Summarizing with `count(*)` instead of `sum(teu)`: it gives the row count, not the TEU.

```sql
-- WRONG: counts rows, not TEU
SELECT port, count(*) AS teu
FROM events_raw
GROUP BY port;
```

```sql
-- FIX: add the TEU
SELECT port, sum(teu) AS teu
FROM events_raw
GROUP BY port;
```

Joining a port table with a duplicate key: the grand total is larger than the real one.

```sql
-- WRONG: VNSGN counted twice
SELECT sum(e.teu) AS teu
FROM events_raw e
JOIN ports p ON p.code = e.port;
```

```sql
-- FIX: one row per code
SELECT sum(e.teu) AS teu
FROM events_raw e
JOIN (SELECT DISTINCT ON (code)
    code, name
  FROM ports
  ORDER BY code,
    valid_from DESC) p
  ON p.code = e.port;
```

## Practice

Five steps: count distinct values, compare the bytes the query needs with whole rows, build `teu_daily`, build `port_dict`, then write the new dashboard query on those two tables.

## Recap

- Measure first: distinct counts and the bytes of the columns the query needs.
- Few-value columns suit dictionary encoding.
- A summary table by key (like SummingMergeTree) cuts the rows to read.
- A lookup table with one row per key (like a dictionary) does not multiply rows in a join.
