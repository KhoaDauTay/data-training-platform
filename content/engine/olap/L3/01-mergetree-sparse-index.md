---
id: e-ol-l3-01
engine: olap
level: L3
module: clickhouse
title: "MergeTree và chỉ mục thưa"
title_en: "MergeTree and the sparse index"
kind: concept
runtime: docs
minutes: 25
figures: [{ name: ol-granules, at: idea }]
objectives:
  - vi: Mô tả cách MergeTree ghi dữ liệu thành các phần (part) đã sắp theo `ORDER BY`, rồi gộp chúng ở nền.
    en: Describe how MergeTree writes data as parts sorted by `ORDER BY`, then merges them in the background.
  - vi: Giải thích chỉ mục thưa (sparse index) có một mục cho mỗi granule 8.192 dòng, không cho mỗi dòng.
    en: Explain that the sparse index has one entry per granule of 8,192 rows, not one per row.
  - vi: Biết khóa chính của ClickHouse không bắt buộc duy nhất.
    en: Know that a ClickHouse primary key does not have to be unique.
requires: [e-ol-l2-03]
sources:
  - { url: "https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree", title: "ClickHouse docs: MergeTree", title_vi: "Tài liệu ClickHouse: MergeTree" }
  - { url: "https://clickhouse.com/docs/optimize/sparse-primary-indexes", title: "ClickHouse docs: A practical introduction to primary indexes", title_vi: "Tài liệu ClickHouse: nhập môn primary index" }
  - { url: "https://www.postgresql.org/docs/18/brin.html", title: "PostgreSQL 18 docs: BRIN Indexes", title_vi: "Index BRIN" }
demo_setup: |
  CREATE TABLE ev AS
  SELECT row_number() OVER (
      ORDER BY port, ts) AS rn,
    port, ts
  FROM (
    SELECT p AS port,
      timestamp '2026-10-01'
        + k * interval '1 minute' AS ts
    FROM unnest(ARRAY['VNDAD',
      'VNHPH', 'VNSGN']) AS p,
      generate_series(1, 20000) AS k
  ) s;
quiz:
  - q:
      vi: "Bảng MergeTree có 60.000 dòng, `index_granularity` mặc định. Chỉ mục chính có khoảng bao nhiêu mục (mark)?"
      en: "A MergeTree table has 60,000 rows and the default `index_granularity`. About how many entries (marks) does the primary index have?"
    options:
      - { vi: "60.000, mỗi dòng một mục", en: "60,000, one per row" }
      - { vi: "Khoảng 8", en: "About 8" }
      - { vi: "3, mỗi cảng một mục", en: "3, one per port" }
    answer: 1
    trap: 0
    why:
      vi: "Một mục mỗi dòng là cách của B-tree, không phải của MergeTree. Tài liệu ghi chỉ mục chính trỏ tới khối 8.192 dòng gọi là granule, mỗi granule một mark: 60.000 / 8.192 ≈ 7,3, làm tròn lên thành 8 granule. Chỉ mục không theo giá trị cảng: một cảng trải qua nhiều granule."
      en: "One entry per row is how a B-tree works, not MergeTree. The docs say the primary index points to blocks of 8,192 rows called granules, one mark per granule: 60,000 / 8,192 ≈ 7.3, rounded up to 8 granules. The index does not follow port values: one port spans several granules."
  - q:
      vi: "Hai dòng có cùng `(port, ts)`, đúng bằng khóa chính, được chèn vào bảng MergeTree. Điều gì xảy ra?"
      en: "Two rows with the same `(port, ts)`, exactly the primary key, are inserted into a MergeTree table. What happens?"
    options:
      - { vi: "Lỗi trùng khóa, như PostgreSQL", en: "A duplicate key error, like PostgreSQL" }
      - { vi: "Cả hai dòng được giữ", en: "Both rows are kept" }
      - { vi: "Dòng sau ghi đè dòng trước", en: "The later row overwrites the earlier" }
    answer: 1
    trap: 0
    why:
      vi: "Ở PostgreSQL khóa chính là ràng buộc duy nhất nên sẽ báo lỗi, nhưng tài liệu ClickHouse ghi rõ ClickHouse không đòi khóa chính duy nhất: khóa chỉ quyết định thứ tự sắp và chỉ mục thưa. MergeTree thường giữ cả hai dòng; chỉ ReplacingMergeTree mới bỏ dòng trùng, và chỉ khi gộp part."
      en: "In PostgreSQL a primary key is a unique constraint, so it would fail, but the ClickHouse docs state that ClickHouse does not require a unique primary key: the key only decides the sort order and the sparse index. Plain MergeTree keeps both rows; only ReplacingMergeTree drops duplicates, and only when parts merge."
---
## Mở bài

Cargo Query muốn chuyển bảng sự kiện container sang ClickHouse. Trước khi chọn khóa, cần hiểu bảng MergeTree lưu dữ liệu và tìm dữ liệu thế nào; PostgreSQL ở đây chỉ dùng để đếm granule cho dễ thấy.

## Ý chính

**MergeTree** là họ engine bảng chính của ClickHouse. Mỗi lệnh chèn tạo một **phần** (part) trên đĩa, dữ liệu trong part đã sắp theo `ORDER BY`. Theo tài liệu, một tiến trình nền gộp các part với nhau. Nếu không khai `PRIMARY KEY`, khóa sắp xếp `ORDER BY` được dùng làm khóa chính.

Khóa chính không trỏ tới từng dòng mà tới các khối 8.192 dòng gọi là **granule** (mặc định `index_granularity`). Mỗi granule có một mục gọi là **mark**, nên đây là **chỉ mục thưa** (sparse index). Khi lọc theo khóa, ClickHouse tìm nhị phân trên các mark để chọn granule có thể khớp, rồi đọc các granule đó. ClickHouse không đòi khóa chính duy nhất.

Ý này gần với BRIN của PostgreSQL: một tóm tắt cho mỗi khối, không cho mỗi dòng. Các ví dụ dưới chia bảng `ev` (đã sắp theo `port, ts`) thành granule 8.192 dòng và đếm granule một bộ lọc phải đọc.

## Ví dụ

```text
-- ClickHouse (read only)
CREATE TABLE ev (
  port String, ts DateTime
)
ENGINE = MergeTree
ORDER BY (port, ts);
```

Các "mark": mỗi granule 8.192 dòng, cảng nhỏ nhất và lớn nhất trong nó.

```sql
SELECT (rn - 1) / 8192 AS granule,
  min(port) AS min_port,
  max(port) AS max_port
FROM ev
GROUP BY 1
ORDER BY 1;
```

Lọc `port = 'VNSGN'`: chỉ những granule có khoảng chứa `VNSGN` phải đọc.

```sql
SELECT count(*) AS granules_read
FROM (
  SELECT (rn - 1) / 8192 AS g
  FROM ev GROUP BY 1
  HAVING min(port) <= 'VNSGN'
    AND max(port) >= 'VNSGN'
) m;
```

## Lỗi hay gặp

Lọc chỉ theo cột thứ hai của khóa. Khóa là `(port, ts)`, nên một giờ của mọi cảng nằm rải trong các granule của từng cảng.

```sql
-- WRONG: ts alone, many granules
SELECT count(*) AS granules_read
FROM (
  SELECT (rn - 1) / 8192 AS g
  FROM ev GROUP BY 1
  HAVING min(ts) <= '2026-10-05'
    AND max(ts) >= '2026-10-05'
) m;
```

```sql
-- FIX: the key's first column too
SELECT count(*) AS granules_read
FROM (
  SELECT (rn - 1) / 8192 AS g
  FROM ev GROUP BY 1
  HAVING min(port) <= 'VNSGN'
    AND max(port) >= 'VNSGN'
    AND min(ts) <= '2026-10-05'
    AND max(ts) >= '2026-10-05'
) m;
```

Nghĩ khóa chính ngăn dòng trùng. Bảng `ev` sắp theo `(port, ts)` nhưng không có ràng buộc nào: chèn lại một dòng là có hai.

```sql
-- WRONG: assume the key is unique
INSERT INTO ev
SELECT rn, port, ts FROM ev
WHERE rn = 1;
SELECT count(*) AS row_count
FROM ev;
```

```sql
-- FIX: count distinct keys
SELECT count(DISTINCT (port, ts))
  AS row_count
FROM ev;
```

## Tóm tắt

- MergeTree ghi mỗi lần chèn thành một part đã sắp theo `ORDER BY`, rồi gộp ở nền.
- Không có `PRIMARY KEY` thì `ORDER BY` là khóa chính.
- Chỉ mục thưa có một mark cho mỗi granule 8.192 dòng, không cho mỗi dòng.
- Lọc theo cột đầu của khóa mới bỏ được nhiều granule.
- Khóa chính ClickHouse không bắt buộc duy nhất.

# EN

## Opening

Cargo Query wants to move its container events table to ClickHouse. Before choosing a key, you need to know how a MergeTree table stores and finds data; PostgreSQL is used here only to count granules so they are easy to see.

## Key idea

**MergeTree** is ClickHouse's main family of table engines. Each insert creates a **part** on disk, with the data in the part sorted by `ORDER BY`. According to the docs, a background process merges parts together. If no `PRIMARY KEY` is declared, the sorting key `ORDER BY` serves as the primary key.

The primary key does not point to single rows but to blocks of 8,192 rows called **granules** (the default `index_granularity`). Each granule has one entry called a **mark**, so this is a **sparse index**. When filtering on the key, ClickHouse binary-searches the marks to pick the granules that could match, then reads those granules. ClickHouse does not require a unique primary key.

The idea is close to PostgreSQL's BRIN: one summary per block, not per row. The examples below split table `ev` (already sorted by `port, ts`) into granules of 8,192 rows and count the granules a filter has to read.

## Example

```text
-- ClickHouse (read only)
CREATE TABLE ev (
  port String, ts DateTime
)
ENGINE = MergeTree
ORDER BY (port, ts);
```

The "marks": each granule of 8,192 rows, with the smallest and largest port in it.

```sql
SELECT (rn - 1) / 8192 AS granule,
  min(port) AS min_port,
  max(port) AS max_port
FROM ev
GROUP BY 1
ORDER BY 1;
```

Filtering `port = 'VNSGN'`: only the granules whose span holds `VNSGN` have to be read.

```sql
SELECT count(*) AS granules_read
FROM (
  SELECT (rn - 1) / 8192 AS g
  FROM ev GROUP BY 1
  HAVING min(port) <= 'VNSGN'
    AND max(port) >= 'VNSGN'
) m;
```

## Common mistakes

Filtering only on the key's second column. The key is `(port, ts)`, so one hour of every port is scattered across each port's granules.

```sql
-- WRONG: ts alone, many granules
SELECT count(*) AS granules_read
FROM (
  SELECT (rn - 1) / 8192 AS g
  FROM ev GROUP BY 1
  HAVING min(ts) <= '2026-10-05'
    AND max(ts) >= '2026-10-05'
) m;
```

```sql
-- FIX: the key's first column too
SELECT count(*) AS granules_read
FROM (
  SELECT (rn - 1) / 8192 AS g
  FROM ev GROUP BY 1
  HAVING min(port) <= 'VNSGN'
    AND max(port) >= 'VNSGN'
    AND min(ts) <= '2026-10-05'
    AND max(ts) >= '2026-10-05'
) m;
```

Thinking the primary key prevents duplicates. Table `ev` is sorted by `(port, ts)` but has no constraint: inserting a row again gives two.

```sql
-- WRONG: assume the key is unique
INSERT INTO ev
SELECT rn, port, ts FROM ev
WHERE rn = 1;
SELECT count(*) AS row_count
FROM ev;
```

```sql
-- FIX: count distinct keys
SELECT count(DISTINCT (port, ts))
  AS row_count
FROM ev;
```

## Recap

- MergeTree writes each insert as a part sorted by `ORDER BY`, then merges parts in the background.
- Without a `PRIMARY KEY`, `ORDER BY` is the primary key.
- The sparse index has one mark per granule of 8,192 rows, not one per row.
- Only a filter on the key's first column skips many granules.
- A ClickHouse primary key does not have to be unique.
