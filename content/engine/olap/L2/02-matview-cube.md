---
id: e-ol-l2-02
engine: olap
level: L2
module: pganalytics
title: "Materialized view làm khối dữ liệu"
title_en: "Materialized views as cubes"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: ol-matview, at: idea }]
objectives:
  - vi: Lưu sẵn một kết quả gộp bằng materialized view để báo cáo đọc bảng nhỏ thay vì quét fact.
    en: Store an aggregate in advance with a materialized view, so reports read a small table instead of scanning the fact.
  - vi: Biết matview không tự cập nhật, và làm mới nó bằng `REFRESH`.
    en: Know that a matview does not update itself, and refresh it with `REFRESH`.
  - vi: Làm mới không khóa người đọc bằng `CONCURRENTLY`, cần một chỉ mục duy nhất.
    en: Refresh without blocking readers with `CONCURRENTLY`, which needs a unique index.
requires: [e-ol-l2-01]
sources:
  - { url: "https://clickhouse.com/docs/materialized-view/incremental-materialized-view", title: "ClickHouse docs: Incremental materialized view", title_vi: "Tài liệu ClickHouse: materialized view tăng dần" }
  - { url: "https://www.postgresql.org/docs/18/rules-materializedviews.html", title: "PostgreSQL 18 docs: Materialized Views", title_vi: "Materialized view" }
  - { url: "https://www.postgresql.org/docs/18/sql-refreshmaterializedview.html", title: "PostgreSQL 18 docs: REFRESH MATERIALIZED VIEW", title_vi: "REFRESH MATERIALIZED VIEW" }
lab:
  setup: |
    CREATE TABLE moves (
      day date, port text, teu int
    );
    INSERT INTO moves
    SELECT date '2026-10-01' + i % 31,
      (ARRAY['VNDAD','VNSGN','VNHPH'])
        [1 + i % 3],
      1 + i % 4
    FROM generate_series(1, 3000) AS i;
    CREATE MATERIALIZED VIEW daily_port AS
    SELECT day, port, sum(teu) AS teu
    FROM moves
    GROUP BY day, port
    WITH NO DATA;
  steps:
    - task:
        vi: "Matview `daily_port` đã có định nghĩa nhưng chưa có dữ liệu. Nạp nó lần đầu."
        en: "Matview `daily_port` has a definition but no data yet. Load it for the first time."
      solution: |
        REFRESH MATERIALIZED VIEW daily_port;
      after: SELECT day, port, teu FROM daily_port
      check: rows
      hint:
        vi: "`REFRESH MATERIALIZED VIEW daily_port`."
        en: "`REFRESH MATERIALIZED VIEW daily_port`."
    - task:
        vi: "Tạo chỉ mục duy nhất `daily_port_key` trên `(day, port)` của `daily_port`."
        en: "Create the unique index `daily_port_key` on `(day, port)` of `daily_port`."
      solution: |
        CREATE UNIQUE INDEX daily_port_key
          ON daily_port (day, port);
      check: catalog
      hint:
        vi: "`CREATE UNIQUE INDEX daily_port_key ON daily_port (day, port)`."
        en: "`CREATE UNIQUE INDEX daily_port_key ON daily_port (day, port)`."
    - task:
        vi: "Một lô muộn về: thêm vào `moves` dòng ngày `2026-10-31`, cảng `VNDAD`, 5 TEU."
        en: "A late shipment arrives: add to `moves` a row for day `2026-10-31`, port `VNDAD`, 5 TEU."
      solution: |
        INSERT INTO moves
        VALUES ('2026-10-31', 'VNDAD', 5);
      after: SELECT count(*) AS n, sum(teu) AS teu FROM moves
      check: rows
      hint:
        vi: "`INSERT INTO moves VALUES ('2026-10-31', 'VNDAD', 5)`."
        en: "`INSERT INTO moves VALUES ('2026-10-31', 'VNDAD', 5)`."
    - task:
        vi: "Matview vẫn là số cũ. Làm mới nó mà không khóa người đang đọc."
        en: "The matview still holds the old numbers. Refresh it without blocking readers."
      solution: |
        REFRESH MATERIALIZED VIEW
          CONCURRENTLY daily_port;
      after: SELECT day, port, teu FROM daily_port WHERE day = '2026-10-31'
      check: rows
      hint:
        vi: "`REFRESH MATERIALIZED VIEW CONCURRENTLY daily_port`: chỉ mục duy nhất của bước 2 cho phép điều này."
        en: "`REFRESH MATERIALIZED VIEW CONCURRENTLY daily_port`: the unique index of step 2 allows it."
quiz:
  - q:
      vi: "Một lô mới vào `moves`. Báo cáo đọc `daily_port` khi nào thấy lô đó?"
      en: "A new shipment goes into `moves`. When does a report reading `daily_port` see it?"
    options:
      - { vi: "Ngay lập tức, như một view thường", en: "At once, like a plain view" }
      - { vi: "Sau lần `REFRESH` kế tiếp", en: "After the next `REFRESH`" }
      - { vi: "Sau khi `ANALYZE` chạy", en: "After `ANALYZE` runs" }
    answer: 1
    trap: 0
    why:
      vi: "View thường chạy lại câu lệnh mỗi lần đọc nên thấy ngay, nhưng materialized view lưu kết quả của lần chạy cuối. PostgreSQL không tự cập nhật nó khi bảng gốc đổi; chỉ `REFRESH MATERIALIZED VIEW` chạy lại câu lệnh. `ANALYZE` chỉ cập nhật thống kê cho bộ lập kế hoạch, không đổi dữ liệu."
      en: "A plain view reruns its query on every read so it sees it at once, but a materialized view stores the result of its last run. PostgreSQL does not update it when the base table changes; only `REFRESH MATERIALIZED VIEW` reruns the query. `ANALYZE` only updates the planner's statistics, it changes no data."
  - q:
      vi: "`REFRESH MATERIALIZED VIEW CONCURRENTLY daily_port` báo lỗi. Thiếu gì?"
      en: "`REFRESH MATERIALIZED VIEW CONCURRENTLY daily_port` fails. What is missing?"
    options:
      - { vi: "Một chỉ mục B-tree bất kỳ", en: "Any B-tree index" }
      - { vi: "Quyền ghi trên `moves`", en: "Write access on `moves`" }
      - { vi: "Một chỉ mục duy nhất trên cột", en: "A unique index on columns" }
    answer: 2
    trap: 0
    why:
      vi: "Một chỉ mục thường không đủ: để thay từng dòng mà người đọc vẫn đọc được, PostgreSQL so bản cũ với bản mới theo một khóa, nên tài liệu yêu cầu ít nhất một chỉ mục duy nhất chỉ dùng tên cột, không có điều kiện `WHERE`. Làm mới chỉ đọc `moves`, nên quyền ghi trên `moves` không liên quan."
      en: "An ordinary index is not enough: to replace rows while readers keep reading, PostgreSQL compares the old and new versions by a key, so the docs require at least one unique index using only column names and no `WHERE` clause. A refresh only reads `moves`, so write access on `moves` is not the issue."
---
## Mở bài

Báo cáo TEU theo ngày và cảng của Cargo Query quét hết bảng `moves` mỗi lần mở. Một materialized view lưu sẵn kết quả gộp, như một lát của khối dữ liệu, để báo cáo đọc vài chục dòng thay vì vài nghìn.

## Ý chính

**Materialized view** (matview) là một câu `SELECT` mà kết quả được lưu như một bảng. Đọc nó nhanh vì không gộp lại; đổi lại, nó chỉ đúng tới lần làm mới cuối. `WITH NO DATA` tạo định nghĩa mà chưa chạy; đọc nó lúc đó là lỗi.

`REFRESH MATERIALIZED VIEW` chạy lại câu lệnh và thay toàn bộ nội dung, khóa người đọc trong lúc đó. Thêm `CONCURRENTLY` thì người đọc vẫn đọc được bản cũ; PostgreSQL so bản mới với bản cũ theo một **chỉ mục duy nhất** trên matview, nên chỉ mục đó là bắt buộc, và matview phải đã có dữ liệu.

Đây là cách PostgreSQL làm "khối dữ liệu tính sẵn" của OLAP: gộp trước theo các chiều hay dùng, làm mới theo lịch. ClickHouse làm khác: matview của nó chạy mỗi lần chèn dữ liệu (bài cấp L3).

## Cú pháp

```sql
REFRESH MATERIALIZED VIEW
  CONCURRENTLY daily_port;
```

- `CREATE MATERIALIZED VIEW v AS SELECT … WITH NO DATA` tạo mà chưa nạp.
- `CONCURRENTLY` cần một chỉ mục duy nhất và matview đã có dữ liệu.

## Ví dụ

Nạp matview rồi đọc một ngày: vài dòng thay vì quét cả bảng.

```sql
REFRESH MATERIALIZED VIEW daily_port;
SELECT port, teu FROM daily_port
WHERE day = '2026-10-31'
ORDER BY port;
```

Đọc từ matview ra cùng số với gộp trực tiếp trên `moves`.

```sql
SELECT port, sum(teu) AS teu
FROM daily_port
GROUP BY port
ORDER BY port;
```

## Lỗi hay gặp

Đọc một matview vừa tạo bằng `WITH NO DATA`.

```sql
-- ERROR 55000: not populated
CREATE MATERIALIZED VIEW port_teu AS
SELECT port, sum(teu) AS teu
FROM moves GROUP BY port
WITH NO DATA;
SELECT * FROM port_teu;
```

Làm mới `CONCURRENTLY` khi matview chưa có chỉ mục duy nhất.

```sql
-- ERROR 55000: no unique index
CREATE MATERIALIZED VIEW port_n AS
SELECT port, count(*) AS n
FROM moves GROUP BY port;
REFRESH MATERIALIZED VIEW
  CONCURRENTLY port_n;
```

## Thực hành

Bốn bước: nạp `daily_port`, tạo chỉ mục duy nhất, thêm một lô muộn, rồi làm mới không khóa người đọc và thấy số mới.

## Tóm tắt

- Matview lưu kết quả của một `SELECT`, đọc nhanh như một bảng nhỏ.
- Nó không tự cập nhật: `REFRESH` chạy lại câu lệnh.
- `CONCURRENTLY` giữ người đọc, cần chỉ mục duy nhất và dữ liệu sẵn có.
- Đây là khối tính sẵn của OLAP trên PostgreSQL, làm mới theo lịch.

# EN

## Opening

Cargo Query's TEU report by day and port scans the whole `moves` table each time it opens. A materialized view stores the aggregate in advance, like a slice of a data cube, so the report reads a few dozen rows instead of a few thousand.

## Key idea

A **materialized view** (matview) is a `SELECT` whose result is stored like a table. Reading it is fast because nothing is aggregated again; in exchange, it is only right as of its last refresh. `WITH NO DATA` creates the definition without running it; reading it then is an error.

`REFRESH MATERIALIZED VIEW` reruns the query and replaces the whole content, blocking readers meanwhile. Add `CONCURRENTLY` and readers keep reading the old version; PostgreSQL compares the new version with the old one by a **unique index** on the matview, so that index is required, and the matview must already hold data.

This is how PostgreSQL builds the "precomputed cube" of OLAP: aggregate in advance along the common dimensions, refresh on a schedule. ClickHouse does it differently: its matview runs on every insert (a lesson in level L3).

## Syntax

```sql
REFRESH MATERIALIZED VIEW
  CONCURRENTLY daily_port;
```

- `CREATE MATERIALIZED VIEW v AS SELECT … WITH NO DATA` creates without loading.
- `CONCURRENTLY` needs a unique index and a matview that already holds data.

## Example

Load the matview, then read one day: a few rows instead of a full scan.

```sql
REFRESH MATERIALIZED VIEW daily_port;
SELECT port, teu FROM daily_port
WHERE day = '2026-10-31'
ORDER BY port;
```

Reading from the matview gives the same numbers as aggregating `moves` directly.

```sql
SELECT port, sum(teu) AS teu
FROM daily_port
GROUP BY port
ORDER BY port;
```

## Common mistakes

Reading a matview just created `WITH NO DATA`.

```sql
-- ERROR 55000: not populated
CREATE MATERIALIZED VIEW port_teu AS
SELECT port, sum(teu) AS teu
FROM moves GROUP BY port
WITH NO DATA;
SELECT * FROM port_teu;
```

Refreshing `CONCURRENTLY` when the matview has no unique index.

```sql
-- ERROR 55000: no unique index
CREATE MATERIALIZED VIEW port_n AS
SELECT port, count(*) AS n
FROM moves GROUP BY port;
REFRESH MATERIALIZED VIEW
  CONCURRENTLY port_n;
```

## Practice

Four steps: load `daily_port`, create the unique index, add a late shipment, then refresh without blocking readers and see the new number.

## Recap

- A matview stores a `SELECT`'s result and reads as fast as a small table.
- It does not update itself: `REFRESH` reruns the query.
- `CONCURRENTLY` keeps readers going, and needs a unique index and data already loaded.
- This is OLAP's precomputed cube on PostgreSQL, refreshed on a schedule.
