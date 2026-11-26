---
id: e-ol-l3-07
engine: olap
level: L3
module: clickhouse
title: "Bài tổng kết: số container cập bến bị đếm gấp đôi"
title_en: "Capstone: arrivals counted twice"
kind: capstone
runtime: browser
minutes: 45
figures: [{ name: ol-capstone, at: idea }]
objectives:
  - vi: Tìm vì sao báo cáo đếm sự kiện ra số cao hơn số container thật, trên dữ liệu có bản cũ và bản gửi trùng.
    en: Find why an event-count report gives more than the real number of containers, on data with old versions and resent duplicates.
  - vi: Dựng bảng trạng thái mới nhất (như ReplacingMergeTree sau khi gộp) và báo cáo trên nó.
    en: Build a latest-status table (like ReplacingMergeTree after a merge) and report on it.
  - vi: Thêm chỉ mục BRIN cho bảng sự kiện và tổng theo cảng kèm tổng chung bằng `ROLLUP`.
    en: Add a BRIN index to the events table and total by port with a grand total using `ROLLUP`.
requires: [e-ol-l3-03, e-ol-l3-04, e-ol-l2-01]
sources:
  - { url: "https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree", title: "ClickHouse docs: ReplacingMergeTree" }
  - { url: "https://clickhouse.com/docs/sql-reference/statements/select/from", title: "ClickHouse docs: FROM clause (FINAL modifier)" }
  - { url: "https://www.postgresql.org/docs/18/sql-select.html#SQL-DISTINCT", title: "PostgreSQL 18 docs: SELECT DISTINCT ON" }
  - { url: "https://www.postgresql.org/docs/18/brin.html", title: "PostgreSQL 18 docs: BRIN Indexes" }
lab:
  setup: |
    CREATE TABLE container_events (
      container text, port text,
      status text, ver int,
      ts timestamp
    );
    INSERT INTO container_events
    SELECT 'C' || lpad(c::text, 3, '0'),
      (ARRAY['VNDAD','VNSGN','VNHPH'])
        [1 + c % 3],
      (ARRAY['booked', 'loaded',
        'sailed', 'arrived'])[v],
      v,
      timestamp '2026-10-01'
        + (c * 3 + v * 20)
        * interval '1 hour'
    FROM generate_series(1, 120) AS c,
      generate_series(1, 4) AS v
    WHERE v <= 1 + c % 4;
    INSERT INTO container_events
    SELECT * FROM container_events
    WHERE ver = 4
      AND container LIKE '%3';
  steps:
    - name: { vi: "Báo cáo cũ", en: "Old report" }
      task:
        vi: "Báo cáo cũ đếm sự kiện `arrived` theo cảng. Chạy lại nó: `port`, `arrivals`."
        en: "The old report counts `arrived` events by port. Run it again: `port`, `arrivals`."
      solution: |
        SELECT port, count(*) AS arrivals
        FROM container_events
        WHERE status = 'arrived'
        GROUP BY port;
      check: rows
      hint:
        vi: "`WHERE status = 'arrived'`, `count(*)` theo `port`."
        en: "`WHERE status = 'arrived'`, `count(*)` by `port`."
    - name: { vi: "Đọc như FINAL", en: "Read as FINAL" }
      task:
        vi: "Mỗi container một dòng, bản có `ver` lớn nhất: `container`, `port`, `status`."
        en: "One row per container, the version with the largest `ver`: `container`, `port`, `status`."
      solution: |
        SELECT DISTINCT ON (container)
          container, port, status
        FROM container_events
        ORDER BY container, ver DESC;
      check: rows
      hint:
        vi: "`DISTINCT ON (container)` với `ORDER BY container, ver DESC`."
        en: "`DISTINCT ON (container)` with `ORDER BY container, ver DESC`."
    - name: { vi: "Bảng mới nhất", en: "Latest table" }
      task:
        vi: "Dựng bảng `latest_status` từ câu của bước 2 (`container`, `port`, `status`), như kết quả sau khi gộp."
        en: "Build table `latest_status` from step 2's query (`container`, `port`, `status`), like the result after a merge."
      solution: |
        CREATE TABLE latest_status AS
        SELECT DISTINCT ON (container)
          container, port, status
        FROM container_events
        ORDER BY container, ver DESC;
      after: SELECT status, count(*) AS n FROM latest_status GROUP BY status
      check: rows
      hint:
        vi: "`CREATE TABLE latest_status AS` rồi câu `DISTINCT ON`."
        en: "`CREATE TABLE latest_status AS` followed by the `DISTINCT ON` query."
    - name: { vi: "BRIN theo giờ", en: "BRIN on time" }
      task:
        vi: "Bảng sự kiện thường bị đọc theo khoảng thời gian: tạo chỉ mục BRIN `container_events_ts_brin` trên `ts`."
        en: "The events table is usually read by time range: create the BRIN index `container_events_ts_brin` on `ts`."
      solution: |
        CREATE INDEX container_events_ts_brin
          ON container_events
          USING brin (ts);
      check: catalog
      hint:
        vi: "`CREATE INDEX container_events_ts_brin ON container_events USING brin (ts)`."
        en: "`CREATE INDEX container_events_ts_brin ON container_events USING brin (ts)`."
    - name: { vi: "Báo cáo đúng", en: "Right report" }
      task:
        vi: "Báo cáo mới từ `latest_status`: số container đã cập bến theo cảng, kèm một dòng tổng chung: `port`, `arrivals`."
        en: "The new report from `latest_status`: containers arrived by port, with one grand-total row: `port`, `arrivals`."
      solution: |
        SELECT port, count(*) AS arrivals
        FROM latest_status
        WHERE status = 'arrived'
        GROUP BY ROLLUP (port);
      check: rows
      hint:
        vi: "`WHERE status = 'arrived'` trên `latest_status`, `GROUP BY ROLLUP (port)`."
        en: "`WHERE status = 'arrived'` on `latest_status`, `GROUP BY ROLLUP (port)`."
quiz:
  - q:
      vi: "Báo cáo cũ ra nhiều container cập bến hơn bảng `latest_status`. Vì sao?"
      en: "The old report shows more arrived containers than table `latest_status`. Why?"
    options:
      - { vi: "Bảng mới nhất làm mất dòng", en: "The latest table lost rows" }
      - { vi: "Sự kiện `arrived` gửi trùng", en: "Resent `arrived` events" }
      - { vi: "BRIN làm sai kết quả", en: "BRIN made the result wrong" }
    answer: 1
    trap: 0
    why:
      vi: "Bảng mới nhất không mất container nào: mỗi container vẫn có đúng một dòng. Báo cáo cũ đếm sự kiện, và các container có mã tận cùng bằng 3 đã nhận sự kiện `arrived` hai lần, nên chúng được đếm hai lần. Chỉ mục BRIN chỉ giúp đọc nhanh hơn, không bao giờ đổi kết quả của câu lệnh."
      en: "The latest table lost no container: each still has exactly one row. The old report counts events, and the containers whose code ends in 3 received the `arrived` event twice, so they are counted twice. A BRIN index only speeds up reads; it never changes a query's result."
  - q:
      vi: "Trên ClickHouse, bảng là `ReplacingMergeTree(ver) ORDER BY container`. Báo cáo cần làm gì để không đếm trùng ngay cả trước khi gộp?"
      en: "On ClickHouse, the table is `ReplacingMergeTree(ver) ORDER BY container`. What must the report do so it never double counts, even before a merge?"
    options:
      - { vi: "Không cần gì, engine đã bỏ trùng", en: "Nothing, the engine dropped duplicates" }
      - { vi: "Thêm `FINAL` sau tên bảng", en: "Add `FINAL` after the table name" }
      - { vi: "Chạy lại câu hai lần", en: "Run the query twice" }
    answer: 1
    trap: 0
    why:
      vi: "Engine chỉ bỏ dòng trùng khi gộp part, vào lúc không biết trước, nên ngay sau khi chèn vẫn có thể còn hai bản. `FINAL` bắt ClickHouse gộp đầy đủ trước khi trả kết quả: đúng ngay, đổi lại chạy chậm hơn. Chạy lại không đổi gì nếu chưa gộp."
      en: "The engine drops duplicates only when parts merge, at an unknown time, so right after an insert two versions may still exist. `FINAL` makes ClickHouse fully merge before returning the result: right at once, at the cost of a slower query. Running it again changes nothing if no merge has happened."
---
## Mở bài

Báo cáo tháng 10 của Cargo Query nói số container cập bến tăng vọt, nhưng bến bãi không thấy thêm container nào. Dữ liệu là bảng sự kiện container, nơi mỗi lần đổi trạng thái là một dòng mới và hệ thống cảng đôi khi gửi lại.

## Ý chính

Bảng `container_events` giống một bảng ReplacingMergeTree chưa gộp: mỗi container có nhiều bản (`ver` 1 đến 4) và vài bản gửi trùng. Báo cáo cũ đếm **sự kiện**, nên mỗi bản `arrived` gửi lại là thêm một lần cập bến.

Cách sửa theo các bài trước: đọc bản mới nhất của mỗi container (như `FINAL`), lưu thành bảng trạng thái (như kết quả sau khi gộp), rồi đếm **container** trên bảng đó. `ROLLUP` thêm dòng tổng chung trong cùng câu, và một chỉ mục BRIN trên `ts` giữ cho các câu đọc theo thời gian rẻ khi bảng lớn lên.

## Cú pháp

```sql
SELECT DISTINCT ON (container)
  container, port, status
FROM container_events
ORDER BY container, ver DESC;
```

```text
-- ClickHouse (read only)
SELECT port, count()
FROM container_events FINAL
WHERE status = 'arrived'
GROUP BY port;
```

- `DISTINCT ON` + `ORDER BY … ver DESC`: bản mới nhất mỗi khóa.
- `GROUP BY ROLLUP (port)`: mỗi cảng và một dòng tổng chung.

## Ví dụ

Các container nhận sự kiện `arrived` nhiều hơn một lần.

```sql
SELECT container, count(*) AS arrived
FROM container_events
WHERE status = 'arrived'
GROUP BY container
HAVING count(*) > 1
ORDER BY container;
```

Số sự kiện so với số container của cùng trạng thái.

```sql
SELECT count(*) AS events,
  count(DISTINCT container)
    AS containers
FROM container_events
WHERE status = 'arrived';
```

## Lỗi hay gặp

Đếm sự kiện thay vì container: bản gửi trùng bị đếm thêm.

```sql
-- WRONG: counts events
SELECT count(*) AS arrivals
FROM container_events
WHERE status = 'arrived';
```

```sql
-- FIX: counts containers
SELECT count(DISTINCT container)
  AS arrivals
FROM container_events
WHERE status = 'arrived';
```

Lấy bản mới nhất bằng `max(status)`: chữ `sailed` lớn hơn `arrived` theo bảng chữ cái, nên container đã cập bến bị coi là còn trên tàu.

```sql
-- WRONG: alphabetical max
SELECT count(*) AS arrivals
FROM (
  SELECT container,
    max(status) AS status
  FROM container_events
  GROUP BY container
) s
WHERE status = 'arrived';
```

```sql
-- FIX: the largest ver
SELECT count(*) AS arrivals
FROM (
  SELECT DISTINCT ON (container)
    container, status
  FROM container_events
  ORDER BY container, ver DESC
) s
WHERE status = 'arrived';
```

## Thực hành

Năm bước: chạy lại báo cáo cũ, đọc bản mới nhất như `FINAL`, dựng `latest_status`, thêm BRIN trên `ts`, rồi viết báo cáo đúng có tổng chung.

## Tóm tắt

- Bảng sự kiện có bản cũ và bản gửi trùng: đếm sự kiện không phải đếm container.
- Đọc bản mới nhất bằng `DISTINCT ON`, như `FINAL` của ClickHouse.
- Lưu kết quả thành bảng trạng thái, như sau khi ReplacingMergeTree gộp.
- `ROLLUP` cho tổng chung; BRIN giữ câu đọc theo thời gian rẻ.

# EN

## Opening

Cargo Query's October report says container arrivals jumped, but the yard saw no extra containers. The data is the container events table, where every status change is a new row and the port system sometimes resends.

## Key idea

Table `container_events` is like an unmerged ReplacingMergeTree table: each container has several versions (`ver` 1 to 4) and a few resent duplicates. The old report counts **events**, so every resent `arrived` version is one more arrival.

The fix, from the earlier lessons: read each container's latest version (as `FINAL` does), store it as a status table (like the result after a merge), then count **containers** on that table. `ROLLUP` adds a grand-total row in the same query, and a BRIN index on `ts` keeps time-range reads cheap as the table grows.

## Syntax

```sql
SELECT DISTINCT ON (container)
  container, port, status
FROM container_events
ORDER BY container, ver DESC;
```

```text
-- ClickHouse (read only)
SELECT port, count()
FROM container_events FINAL
WHERE status = 'arrived'
GROUP BY port;
```

- `DISTINCT ON` + `ORDER BY … ver DESC`: the latest version per key.
- `GROUP BY ROLLUP (port)`: each port and one grand-total row.

## Example

The containers that received the `arrived` event more than once.

```sql
SELECT container, count(*) AS arrived
FROM container_events
WHERE status = 'arrived'
GROUP BY container
HAVING count(*) > 1
ORDER BY container;
```

Events against containers for the same status.

```sql
SELECT count(*) AS events,
  count(DISTINCT container)
    AS containers
FROM container_events
WHERE status = 'arrived';
```

## Common mistakes

Counting events instead of containers: resent duplicates are counted again.

```sql
-- WRONG: counts events
SELECT count(*) AS arrivals
FROM container_events
WHERE status = 'arrived';
```

```sql
-- FIX: counts containers
SELECT count(DISTINCT container)
  AS arrivals
FROM container_events
WHERE status = 'arrived';
```

Taking the latest version with `max(status)`: `sailed` sorts after `arrived` alphabetically, so an arrived container is treated as still at sea.

```sql
-- WRONG: alphabetical max
SELECT count(*) AS arrivals
FROM (
  SELECT container,
    max(status) AS status
  FROM container_events
  GROUP BY container
) s
WHERE status = 'arrived';
```

```sql
-- FIX: the largest ver
SELECT count(*) AS arrivals
FROM (
  SELECT DISTINCT ON (container)
    container, status
  FROM container_events
  ORDER BY container, ver DESC
) s
WHERE status = 'arrived';
```

## Practice

Five steps: rerun the old report, read the latest version as `FINAL` does, build `latest_status`, add a BRIN on `ts`, then write the right report with a grand total.

## Recap

- An events table holds old versions and resent duplicates: counting events is not counting containers.
- Read the latest version with `DISTINCT ON`, like ClickHouse's `FINAL`.
- Store the result as a status table, like ReplacingMergeTree after a merge.
- `ROLLUP` gives the grand total; BRIN keeps time-range reads cheap.
