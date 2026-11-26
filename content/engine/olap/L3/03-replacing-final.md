---
id: e-ol-l3-03
engine: olap
level: L3
module: clickhouse
title: "ReplacingMergeTree và FINAL"
title_en: "ReplacingMergeTree and FINAL"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: ol-replacing, at: idea }]
objectives:
  - vi: Biết ReplacingMergeTree chỉ bỏ dòng trùng khóa sắp xếp khi gộp part, vào lúc không biết trước.
    en: Know that ReplacingMergeTree drops rows with the same sorting key only when parts merge, at a time you cannot plan.
  - vi: Đọc bản mới nhất của mỗi khóa lúc truy vấn, như `FINAL`, bằng `DISTINCT ON` của PostgreSQL.
    en: Read the latest version of each key at query time, as `FINAL` does, with PostgreSQL's `DISTINCT ON`.
  - vi: "Tự làm bước gộp: dựng bảng chỉ giữ bản có `ver` lớn nhất."
    en: "Do the merge yourself: build a table keeping only the version with the largest `ver`."
requires: [e-ol-l3-01]
sources:
  - { url: "https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree", title: "ClickHouse docs: ReplacingMergeTree" }
  - { url: "https://clickhouse.com/docs/sql-reference/statements/select/from", title: "ClickHouse docs: FROM clause (FINAL modifier)" }
  - { url: "https://www.postgresql.org/docs/18/sql-select.html#SQL-DISTINCT", title: "PostgreSQL 18 docs: SELECT DISTINCT ON" }
lab:
  setup: |
    CREATE TABLE status_events (
      container text, status text,
      ver int
    );
    INSERT INTO status_events
    SELECT 'C' || lpad(c::text, 2, '0'),
      (ARRAY['booked', 'sailed',
        'arrived'])[v], v
    FROM generate_series(1, 40) AS c,
      generate_series(1, 3) AS v
    WHERE v <= 1 + c % 3;
    INSERT INTO status_events
    SELECT * FROM status_events
    WHERE ver = 1
      AND container LIKE '%5';
  steps:
    - task:
        vi: "Chưa gộp thì mỗi container còn bao nhiêu dòng? Trả `container`, `versions`."
        en: "Before any merge, how many rows does each container have? Return `container`, `versions`."
      solution: |
        SELECT container,
          count(*) AS versions
        FROM status_events
        GROUP BY container;
      check: rows
      hint:
        vi: "`count(*)` theo `container`."
        en: "`count(*)` by `container`."
    - task:
        vi: "Đọc như `FINAL`: mỗi container một dòng, bản có `ver` lớn nhất: `container`, `status`, `ver`."
        en: "Read as `FINAL` does: one row per container, the version with the largest `ver`: `container`, `status`, `ver`."
      solution: |
        SELECT DISTINCT ON (container)
          container, status, ver
        FROM status_events
        ORDER BY container, ver DESC;
      check: rows
      hint:
        vi: "`DISTINCT ON (container)` với `ORDER BY container, ver DESC`."
        en: "`DISTINCT ON (container)` with `ORDER BY container, ver DESC`."
    - task:
        vi: "Tự làm bước gộp: dựng bảng `status_merged` chỉ giữ bản mới nhất của mỗi container (`container`, `status`, `ver`)."
        en: "Do the merge yourself: build table `status_merged` keeping only each container's latest version (`container`, `status`, `ver`)."
      solution: |
        CREATE TABLE status_merged AS
        SELECT DISTINCT ON (container)
          container, status, ver
        FROM status_events
        ORDER BY container, ver DESC;
      after: SELECT container, status, ver FROM status_merged
      check: rows
      hint:
        vi: "`CREATE TABLE status_merged AS` rồi câu `DISTINCT ON` của bước 2."
        en: "`CREATE TABLE status_merged AS` followed by the `DISTINCT ON` query of step 2."
quiz:
  - q:
      vi: "Bảng ReplacingMergeTree vừa nhận hai bản của container C05. Một `SELECT` thường (không `FINAL`) ngay sau đó trả mấy dòng C05?"
      en: "A ReplacingMergeTree table just received two versions of container C05. How many C05 rows does a plain `SELECT` (no `FINAL`) return right after?"
    options:
      - { vi: "Luôn 1, engine đã bỏ bản cũ", en: "Always 1, the engine dropped the old one" }
      - { vi: "Có thể 2, cho tới khi part được gộp", en: "Maybe 2, until the parts merge" }
      - { vi: "0, cho tới khi gộp xong", en: "0, until the merge is done" }
    answer: 1
    trap: 0
    why:
      vi: "Tên engine nghe như nó thay ngay bản cũ, nhưng tài liệu ghi việc bỏ dòng trùng chỉ xảy ra khi gộp part, ở nền, vào lúc không biết trước, và không bảo đảm hết trùng. Hai bản nằm ở hai part khác nhau nên đều được đọc. Dòng cũng không biến mất trong lúc chờ: chúng vẫn được trả về."
      en: "The engine's name sounds like it replaces the old version at once, but the docs say duplicates are dropped only during a merge, in the background, at an unknown time, with no guarantee of no duplicates. The two versions sit in two different parts, so both are read. Nor do rows vanish while waiting: they are still returned."
  - q:
      vi: "`ReplacingMergeTree(ver)` gặp ba bản của một khóa với `ver` 1, 3, 2 (chèn theo thứ tự đó). Bản nào được giữ khi gộp?"
      en: "`ReplacingMergeTree(ver)` meets three versions of one key with `ver` 1, 3, 2 (inserted in that order). Which one is kept on merge?"
    options:
      - { vi: "Bản chèn sau cùng (`ver` 2)", en: "The last inserted (`ver` 2)" }
      - { vi: "Bản có `ver` lớn nhất (3)", en: "The largest `ver` (3)" }
      - { vi: "Bản chèn đầu tiên (`ver` 1)", en: "The first inserted (`ver` 1)" }
    answer: 1
    trap: 0
    why:
      vi: "Giữ bản chèn sau cùng là luật khi không khai `ver`. Có `ver` thì tài liệu ghi bản có phiên bản lớn nhất được giữ, ở đây `ver` 3, dù nó không được chèn sau cùng. Chỉ khi nhiều bản cùng `ver` lớn nhất thì mới quay về luật chèn sau cùng. Bản đầu tiên không bao giờ thắng chỉ vì đến trước."
      en: "Keeping the last inserted row is the rule when no `ver` is declared. With `ver`, the docs say the row with the largest version is kept, here `ver` 3, even though it was not inserted last. Only when several rows share the largest `ver` does the last-inserted rule apply. The first row never wins just for coming first."
---
## Mở bài

Hệ thống cảng gửi lại trạng thái container mỗi khi có thay đổi, đôi khi gửi trùng. Trong ClickHouse, Cargo Query dùng ReplacingMergeTree để chỉ giữ bản mới nhất; bài này cho thấy "chỉ giữ" xảy ra khi nào, và làm lại từng bước trên PostgreSQL.

## Ý chính

**ReplacingMergeTree** khác MergeTree ở chỗ bỏ các dòng có cùng giá trị khóa sắp xếp: tính duy nhất xét theo `ORDER BY`, không theo `PRIMARY KEY`. Theo tài liệu, việc bỏ dòng trùng **chỉ xảy ra khi gộp part**, ở nền, vào lúc không biết trước, và không bảo đảm hết trùng. Với tham số `ver`, bản có `ver` lớn nhất được giữ; không có `ver` thì bản chèn sau cùng được giữ.

Muốn kết quả đúng ngay, thêm **`FINAL`** sau tên bảng: ClickHouse gộp đầy đủ dữ liệu trước khi trả kết quả. Tài liệu ghi truy vấn có `FINAL` chạy chậm hơn, vì phải gộp trong lúc chạy và có thể đọc thêm cột khóa chính.

Trên PostgreSQL: bảng `status_events` là các part chưa gộp, `DISTINCT ON` là cách đọc như `FINAL`, và một bảng dựng từ câu đó là kết quả sau khi gộp.

## Cú pháp

```text
-- ClickHouse (read only)
CREATE TABLE status_events (
  container String,
  status String, ver UInt32
)
ENGINE = ReplacingMergeTree(ver)
ORDER BY container;

SELECT container, status
FROM status_events FINAL;
```

```sql
SELECT DISTINCT ON (container)
  container, status, ver
FROM status_events
ORDER BY container, ver DESC;
```

- `DISTINCT ON (k)` giữ dòng đầu tiên của mỗi `k` theo `ORDER BY`.
- `ORDER BY k, ver DESC` đưa bản mới nhất lên đầu mỗi nhóm.

## Ví dụ

Các bản của container C05: một bản gửi trùng, chưa có gì bỏ đi.

```sql
SELECT container, status, ver
FROM status_events
WHERE container = 'C05'
ORDER BY ver;
```

Bao nhiêu dòng là bản cũ hoặc bản trùng, sẽ mất khi gộp.

```sql
SELECT count(*) - count(DISTINCT
    container) AS extra_rows
FROM status_events;
```

## Lỗi hay gặp

Lấy `max(status)` làm trạng thái mới nhất: `max` so chữ theo bảng chữ cái, nên `sailed` thắng `arrived`.

```sql
-- WRONG: alphabetical, not latest
SELECT container,
  max(status) AS status
FROM status_events
GROUP BY container;
```

```sql
-- FIX: the row with the largest ver
SELECT DISTINCT ON (container)
  container, status
FROM status_events
ORDER BY container, ver DESC;
```

Đếm dòng làm số container: bản cũ và bản trùng bị đếm theo.

```sql
-- WRONG: counts every version
SELECT count(*) AS containers
FROM status_events;
```

```sql
-- FIX: one per container
SELECT count(DISTINCT container)
  AS containers
FROM status_events;
```

## Thực hành

Ba bước: đếm số bản mỗi container trước khi gộp, đọc bản mới nhất như `FINAL`, rồi tự làm bước gộp thành bảng `status_merged`.

## Tóm tắt

- ReplacingMergeTree bỏ dòng trùng khóa `ORDER BY`, nhưng chỉ khi gộp part.
- Lúc gộp không biết trước và không bảo đảm hết trùng.
- Có `ver` thì bản `ver` lớn nhất thắng; không có thì bản chèn sau cùng.
- `FINAL` gộp lúc truy vấn: đúng ngay, chậm hơn; trên PostgreSQL là `DISTINCT ON`.

# EN

## Opening

The port system resends a container's status every time it changes, and sometimes sends duplicates. In ClickHouse, Cargo Query uses ReplacingMergeTree to keep only the latest version; this lesson shows when "keep only" actually happens, and redoes each step on PostgreSQL.

## Key idea

**ReplacingMergeTree** differs from MergeTree in that it removes rows with the same sorting key value: uniqueness is decided by `ORDER BY`, not `PRIMARY KEY`. According to the docs, duplicates are removed **only during a merge**, in the background, at an unknown time, with no guarantee that none remain. With the `ver` parameter, the row with the largest `ver` is kept; without `ver`, the last inserted row is kept.

For a result that is right at once, add **`FINAL`** after the table name: ClickHouse fully merges the data before returning the result. The docs say queries with `FINAL` run slower, since the merge happens during the query and extra primary key columns may be read.

On PostgreSQL: table `status_events` is the unmerged parts, `DISTINCT ON` is the `FINAL`-style read, and a table built from that query is the result after the merge.

## Syntax

```text
-- ClickHouse (read only)
CREATE TABLE status_events (
  container String,
  status String, ver UInt32
)
ENGINE = ReplacingMergeTree(ver)
ORDER BY container;

SELECT container, status
FROM status_events FINAL;
```

```sql
SELECT DISTINCT ON (container)
  container, status, ver
FROM status_events
ORDER BY container, ver DESC;
```

- `DISTINCT ON (k)` keeps the first row of each `k` by `ORDER BY`.
- `ORDER BY k, ver DESC` puts the latest version first in each group.

## Example

Container C05's versions: one resent duplicate, nothing dropped yet.

```sql
SELECT container, status, ver
FROM status_events
WHERE container = 'C05'
ORDER BY ver;
```

How many rows are old versions or duplicates, to be dropped on merge.

```sql
SELECT count(*) - count(DISTINCT
    container) AS extra_rows
FROM status_events;
```

## Common mistakes

Taking `max(status)` as the latest status: `max` compares text alphabetically, so `sailed` beats `arrived`.

```sql
-- WRONG: alphabetical, not latest
SELECT container,
  max(status) AS status
FROM status_events
GROUP BY container;
```

```sql
-- FIX: the row with the largest ver
SELECT DISTINCT ON (container)
  container, status
FROM status_events
ORDER BY container, ver DESC;
```

Counting rows as the number of containers: old versions and duplicates are counted too.

```sql
-- WRONG: counts every version
SELECT count(*) AS containers
FROM status_events;
```

```sql
-- FIX: one per container
SELECT count(DISTINCT container)
  AS containers
FROM status_events;
```

## Practice

Three steps: count each container's versions before a merge, read the latest version as `FINAL` does, then do the merge yourself into table `status_merged`.

## Recap

- ReplacingMergeTree drops rows with the same `ORDER BY` key, but only when parts merge.
- The merge time is unknown and duplicates are not guaranteed gone.
- With `ver` the largest `ver` wins; without it, the last inserted row.
- `FINAL` merges at query time: right at once, slower; on PostgreSQL it is `DISTINCT ON`.
