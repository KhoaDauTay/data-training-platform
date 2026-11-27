---
id: e-ol-l4-03
engine: olap
level: L4
module: chtuning
title: "Chỉ mục bỏ qua và projection"
title_en: "Skip indexes and projections"
kind: lab
runtime: browser
minutes: 35
figures: [{ name: ol-skip-index, at: idea }]
objectives:
  - vi: Giải thích chỉ mục bỏ qua (data skipping index) loại cả khối granule, không tìm từng dòng như B-tree.
    en: Explain that a data skipping index excludes whole blocks of granules, instead of finding single rows like a B-tree.
  - vi: Thấy chỉ mục `minmax` chỉ bỏ được khối khi cột đi cùng thứ tự sắp của bảng.
    en: See that a `minmax` index skips blocks only when the column follows the table's sort order.
  - vi: Dùng một bản sắp theo thứ tự khác (như projection) khi cột lọc không đi cùng khóa.
    en: Use a copy sorted another way (like a projection) when the filtered column does not follow the key.
requires: [e-ol-l3-01, e-ol-l3-02]
sources:
  - { url: "https://clickhouse.com/docs/optimize/skipping-indexes", title: "ClickHouse docs: Understanding data skipping indexes" }
  - { url: "https://clickhouse.com/docs/data-modeling/projections", title: "ClickHouse docs: Projections" }
  - { url: "https://www.postgresql.org/docs/18/functions-admin.html", title: "PostgreSQL 18 docs: Database Object Size Functions" }
lab:
  setup: |
    CREATE TABLE ev AS
    SELECT row_number() OVER (
        ORDER BY port, k) AS rn,
      port, k AS minute,
      k / 100 AS trip,
      (k * 7919) % 5000 AS box
    FROM unnest(ARRAY['VNDAD',
        'VNHPH', 'VNSGN']) AS port,
      generate_series(1, 20000) AS k;
  steps:
    - task:
        vi: "Dựng chỉ mục `minmax` trên `trip` bằng tay: mỗi khối 8.192 dòng theo `rn`, giá trị nhỏ nhất và lớn nhất: `block`, `lo`, `hi`."
        en: "Build a `minmax` index on `trip` by hand: each block of 8,192 rows by `rn`, its smallest and largest value: `block`, `lo`, `hi`."
      solution: |
        SELECT (rn - 1) / 8192 AS block,
          min(trip) AS lo,
          max(trip) AS hi
        FROM ev
        GROUP BY 1;
      check: rows
      hint:
        vi: "`(rn - 1) / 8192` là số khối; `min(trip)`, `max(trip)` theo khối."
        en: "`(rn - 1) / 8192` is the block number; `min(trip)`, `max(trip)` per block."
    - task:
        vi: "Lọc `trip = 150`: chỉ mục đó bắt đọc bao nhiêu khối? Trả `blocks_read`."
        en: "Filtering `trip = 150`: how many blocks does that index make you read? Return `blocks_read`."
      solution: |
        SELECT count(*) AS blocks_read
        FROM (
          SELECT (rn - 1) / 8192 AS b
          FROM ev GROUP BY 1
          HAVING min(trip) <= 150
            AND max(trip) >= 150
        ) m;
      check: rows
      hint:
        vi: "Đếm khối có `min(trip) <= 150 AND max(trip) >= 150`."
        en: "Count the blocks with `min(trip) <= 150 AND max(trip) >= 150`."
    - task:
        vi: "Cùng cách đó cho `box = 1234`, cột mà giá trị rải khắp bảng: `blocks_read`."
        en: "The same for `box = 1234`, a column whose values are scattered over the table: `blocks_read`."
      solution: |
        SELECT count(*) AS blocks_read
        FROM (
          SELECT (rn - 1) / 8192 AS b
          FROM ev GROUP BY 1
          HAVING min(box) <= 1234
            AND max(box) >= 1234
        ) m;
      check: rows
      hint:
        vi: "Như bước 2, thay `trip` bằng `box` và 150 bằng 1234."
        en: "As in step 2, with `box` for `trip` and 1234 for 150."
    - task:
        vi: "Làm một bản sắp theo `box`, như projection: bảng `ev_by_box` với `rn` đánh lại theo `box, port, minute`, cùng `box`, `port`, `minute`."
        en: "Make a copy sorted by `box`, like a projection: table `ev_by_box` with `rn` renumbered by `box, port, minute`, plus `box`, `port`, `minute`."
      solution: |
        CREATE TABLE ev_by_box AS
        SELECT row_number() OVER (
            ORDER BY box, port, minute)
            AS rn,
          box, port, minute
        FROM ev;
      after: SELECT count(*) AS blocks_read FROM (SELECT (rn - 1) / 8192 AS b FROM ev_by_box GROUP BY 1 HAVING min(box) <= 1234 AND max(box) >= 1234) m
      check: rows
      hint:
        vi: "`CREATE TABLE ev_by_box AS SELECT row_number() OVER (ORDER BY box, port, minute) AS rn, box, port, minute FROM ev`."
        en: "`CREATE TABLE ev_by_box AS SELECT row_number() OVER (ORDER BY box, port, minute) AS rn, box, port, minute FROM ev`."
quiz:
  - q:
      vi: "Bảng sắp theo `(port, minute)`. Bạn thêm chỉ mục `minmax` trên `box`, cột mà giá trị rải đều khắp bảng. Lọc `box = 1234` bỏ được bao nhiêu khối?"
      en: "The table is sorted by `(port, minute)`. You add a `minmax` index on `box`, a column whose values are spread all over the table. How many blocks does `box = 1234` skip?"
    options:
      - { vi: "Gần như không khối nào", en: "Almost none" }
      - { vi: "Gần hết, như một B-tree", en: "Nearly all, like a B-tree" }
      - { vi: "Mọi khối trừ một", en: "All blocks but one" }
    answer: 0
    trap: 1
    why:
      vi: "Một B-tree tìm thẳng tới dòng, nhưng chỉ mục bỏ qua chỉ loại cả khối, và tài liệu ghi chỉ cần giá trị xuất hiện một lần trong khối là phải đọc cả khối. Ở đây mỗi khối có `box` từ gần 0 tới gần 4.999, nên khoảng [lo, hi] của khối nào cũng chứa 1234 và không khối nào bị bỏ. Chỉ còn một khối là kết quả của bản sắp theo `box`, không phải của chỉ mục này."
      en: "A B-tree goes straight to the row, but a skip index only excludes whole blocks, and the docs say that if a value occurs even once in a block, the whole block must be read. Here each block holds `box` from near 0 to near 4,999, so every block's [lo, hi] range contains 1234 and none is skipped. One block left is what the copy sorted by `box` gives, not this index."
  - q:
      vi: "Bạn chạy `ALTER TABLE ev ADD PROJECTION by_box (SELECT * ORDER BY box)` trên bảng đã có dữ liệu. Dữ liệu cũ thì sao?"
      en: "You run `ALTER TABLE ev ADD PROJECTION by_box (SELECT * ORDER BY box)` on a table that already has data. What about the old data?"
    options:
      - { vi: "Được sắp lại ngay lập tức", en: "It is re-sorted at once" }
      - { vi: "Chỉ có sau `MATERIALIZE PROJECTION`", en: "Only after `MATERIALIZE PROJECTION`" }
      - { vi: "Không bao giờ, chỉ dữ liệu mới", en: "Never, only new data" }
    answer: 1
    trap: 0
    why:
      vi: "Thêm projection không sắp lại dữ liệu đã có: tài liệu ghi khi chưa materialize, projection chỉ được tạo cho dữ liệu chèn mới. Muốn phần cũ cũng có bản sắp theo `box`, phải chạy `ALTER TABLE ev MATERIALIZE PROJECTION by_box`. Vì có lệnh đó nên \"không bao giờ\" cũng sai."
      en: "Adding a projection does not re-sort existing data: the docs say that without materializing, the projection is created only for newly inserted data. For the old data to get the copy sorted by `box`, run `ALTER TABLE ev MATERIALIZE PROJECTION by_box`. Because that command exists, \"never\" is wrong too."
  - q:
      vi: "Bảng có projection `by_box`. Câu lọc `box = 1234` phải ghi tên bảng nào?"
      en: "The table has projection `by_box`. Which table must a query filtering `box = 1234` name?"
    options:
      - { vi: "Bảng gốc; ClickHouse tự chọn", en: "The base table; ClickHouse picks" }
      - { vi: "Bảng ẩn của projection", en: "The projection's hidden table" }
      - { vi: "Một materialized view riêng", en: "A separate materialized view" }
    answer: 0
    trap: 2
    why:
      vi: "Với materialized view, người dùng phải tự chọn bảng đích hoặc viết lại câu. Projection thì khác: tài liệu ghi câu vẫn gửi tới bảng gốc, và ClickHouse tự chọn nguồn cho cùng kết quả mà đọc ít dữ liệu nhất. Bảng ẩn của projection không phải thứ bạn ghi tên trong câu."
      en: "With a materialized view, the user has to pick the target table or rewrite the query. A projection is different: the docs say queries still go to the base table, and ClickHouse picks the source that gives the same result while reading the least data. The projection's hidden table is not something you name in the query."
---
## Mở bài

Đội cảng của Cargo Query lọc bảng sự kiện theo chuyến (`trip`) và theo số hộp (`box`), hai cột không nằm trong khóa sắp xếp. Bài này đo trên PostgreSQL xem một chỉ mục bỏ qua kiểu `minmax` bỏ được bao nhiêu khối cho mỗi cột, và khi nào cần một bản sắp khác như projection.

## Ý chính

**Chỉ mục bỏ qua** (data skipping index) chỉ có trên bảng họ MergeTree. Nó lưu một tóm tắt cho mỗi khối dữ liệu; `GRANULARITY n` nghĩa là một khối gồm n granule. Kiểu `minmax` lưu giá trị nhỏ nhất và lớn nhất của khối; kiểu `set(max_size)` lưu các giá trị khác nhau; kiểu `bloom_filter` cho phép kiểm tra "có thể có" với tỉ lệ báo nhầm nhỏ. Tài liệu ghi ClickHouse không thể làm chỉ mục từng dòng như B-tree vì trên đĩa không có từng dòng riêng: chỉ mục chỉ loại cả khối, và giá trị xuất hiện một lần là phải đọc cả khối.

Vì thế tài liệu nói phần lớn chỉ mục bỏ qua có ích cần **tương quan mạnh** giữa khóa chính và cột được lọc. Thêm chỉ mục cũng tốn khi chèn và khi chạy câu không dùng nó; tài liệu khuyên thử đổi khóa chính, projection hoặc materialized view trước, rồi đo kỹ trên dữ liệu thật.

**Projection** là một bảng ẩn đi kèm bảng gốc, có thể sắp theo thứ tự khác. Câu vẫn gửi tới bảng gốc; ClickHouse tự chọn nguồn đọc ít nhất. Đổi lại dữ liệu được ghi hai lần và tốn thêm chỗ.

## Cú pháp

```text
-- ClickHouse (read only)
ALTER TABLE ev
  ADD INDEX trip_idx trip
  TYPE minmax GRANULARITY 1;
ALTER TABLE ev
  MATERIALIZE INDEX trip_idx;
ALTER TABLE ev
  ADD PROJECTION by_box (
    SELECT * ORDER BY box
  );
ALTER TABLE ev
  MATERIALIZE PROJECTION by_box;
```

```sql
SELECT (rn - 1) / 8192 AS block,
  min(trip) AS lo,
  max(trip) AS hi
FROM ev
GROUP BY 1;
```

- Một khối = n granule; ở đây n = 1, mỗi khối 8.192 dòng.
- Khối phải đọc khi khoảng `[lo, hi]` có thể chứa giá trị lọc.

## Ví dụ

Tóm tắt từng khối cho cả hai cột: `trip` đi theo thứ tự sắp, `box` thì không.

```sql
SELECT (rn - 1) / 8192 AS block,
  min(trip) AS trip_lo,
  max(trip) AS trip_hi,
  min(box) AS box_lo,
  max(box) AS box_hi
FROM ev
GROUP BY 1
ORDER BY 1;
```

Chỉ vài dòng có `box = 1234`, nhưng chúng nằm rải trong các khối.

```sql
SELECT (rn - 1) / 8192 AS block,
  count(*) AS rows_with_box
FROM ev
WHERE box = 1234
GROUP BY 1
ORDER BY 1;
```

## Lỗi hay gặp

Mong chỉ mục `minmax` trên cột rải rác bỏ được khối như một B-tree: mọi khối đều phải đọc.

```sql
-- WRONG: minmax on a scattered column
SELECT count(*) AS blocks_read
FROM (
  SELECT (rn - 1) / 8192 AS b
  FROM ev GROUP BY 1
  HAVING min(box) <= 1234
    AND max(box) >= 1234
) m;
```

```sql
-- FIX: a copy sorted by box
WITH p AS (
  SELECT row_number() OVER (
      ORDER BY box) AS rn,
    box
  FROM ev
)
SELECT count(*) AS blocks_read
FROM (
  SELECT (rn - 1) / 8192 AS b
  FROM p GROUP BY 1
  HAVING min(box) <= 1234
    AND max(box) >= 1234
) m;
```

Quên rằng bản sắp thứ hai cũng chiếm chỗ: chỉ đo bảng gốc là đếm thiếu.

```sql
-- WRONG: only the base table
CREATE TABLE ev_sorted AS
SELECT * FROM ev ORDER BY box;
SELECT pg_total_relation_size('ev')
  AS bytes;
```

```sql
-- FIX: both copies
SELECT pg_total_relation_size('ev')
  + pg_total_relation_size(
    'ev_sorted') AS bytes;
```

## Thực hành

Bốn bước: dựng chỉ mục `minmax` trên `trip` bằng tay, đếm khối phải đọc cho `trip = 150`, rồi cho `box = 1234`, và cuối cùng làm bản `ev_by_box` sắp theo `box` để chỉ còn một khối.

## Tóm tắt

- Chỉ mục bỏ qua loại cả khối; giá trị có một lần trong khối là đọc cả khối.
- `minmax` chỉ có ích khi cột đi cùng thứ tự sắp của bảng.
- Thêm chỉ mục tốn khi chèn; đổi khóa hoặc projection có thể tốt hơn, và phải đo.
- Projection là bản ẩn sắp khác; câu vẫn gửi tới bảng gốc, đổi lại tốn chỗ.

# EN

## Opening

Cargo Query's port team filters the events table by trip (`trip`) and by box number (`box`), two columns outside the sorting key. This lesson measures on PostgreSQL how many blocks a `minmax` skip index skips for each column, and when a copy sorted another way, like a projection, is needed.

## Key idea

A **data skipping index** exists only on MergeTree-family tables. It stores one summary per block of data; `GRANULARITY n` means one block is n granules. The `minmax` type stores the block's smallest and largest value; `set(max_size)` stores its distinct values; `bloom_filter` gives a "maybe present" test with a small false-positive rate. The docs say ClickHouse cannot index single rows like a B-tree because there are no individual rows on disk: the index only excludes whole blocks, and a value occurring once means the whole block is read.

That is why the docs say most useful skip indexes need a **strong correlation** between the primary key and the filtered column. An index also costs on inserts and on queries that do not use it; the docs advise trying a different primary key, a projection or a materialized view first, then testing carefully on real data.

A **projection** is a hidden table kept with the base table, which can be sorted another way. Queries still go to the base table; ClickHouse picks the source that reads the least. The price is data written twice and extra storage.

## Syntax

```text
-- ClickHouse (read only)
ALTER TABLE ev
  ADD INDEX trip_idx trip
  TYPE minmax GRANULARITY 1;
ALTER TABLE ev
  MATERIALIZE INDEX trip_idx;
ALTER TABLE ev
  ADD PROJECTION by_box (
    SELECT * ORDER BY box
  );
ALTER TABLE ev
  MATERIALIZE PROJECTION by_box;
```

```sql
SELECT (rn - 1) / 8192 AS block,
  min(trip) AS lo,
  max(trip) AS hi
FROM ev
GROUP BY 1;
```

- One block = n granules; here n = 1, so each block is 8,192 rows.
- A block is read when its `[lo, hi]` range could hold the filtered value.

## Example

Each block's summary for both columns: `trip` follows the sort order, `box` does not.

```sql
SELECT (rn - 1) / 8192 AS block,
  min(trip) AS trip_lo,
  max(trip) AS trip_hi,
  min(box) AS box_lo,
  max(box) AS box_hi
FROM ev
GROUP BY 1
ORDER BY 1;
```

Only a few rows have `box = 1234`, but they are scattered over the blocks.

```sql
SELECT (rn - 1) / 8192 AS block,
  count(*) AS rows_with_box
FROM ev
WHERE box = 1234
GROUP BY 1
ORDER BY 1;
```

## Common mistakes

Expecting a `minmax` index on a scattered column to skip blocks like a B-tree: every block has to be read.

```sql
-- WRONG: minmax on a scattered column
SELECT count(*) AS blocks_read
FROM (
  SELECT (rn - 1) / 8192 AS b
  FROM ev GROUP BY 1
  HAVING min(box) <= 1234
    AND max(box) >= 1234
) m;
```

```sql
-- FIX: a copy sorted by box
WITH p AS (
  SELECT row_number() OVER (
      ORDER BY box) AS rn,
    box
  FROM ev
)
SELECT count(*) AS blocks_read
FROM (
  SELECT (rn - 1) / 8192 AS b
  FROM p GROUP BY 1
  HAVING min(box) <= 1234
    AND max(box) >= 1234
) m;
```

Forgetting that the second sorted copy takes space too: measuring only the base table undercounts.

```sql
-- WRONG: only the base table
CREATE TABLE ev_sorted AS
SELECT * FROM ev ORDER BY box;
SELECT pg_total_relation_size('ev')
  AS bytes;
```

```sql
-- FIX: both copies
SELECT pg_total_relation_size('ev')
  + pg_total_relation_size(
    'ev_sorted') AS bytes;
```

## Practice

Four steps: build a `minmax` index on `trip` by hand, count the blocks read for `trip = 150`, then for `box = 1234`, and finally make the copy `ev_by_box` sorted by `box` so only one block is left.

## Recap

- A skip index excludes whole blocks; a value present once in a block means the block is read.
- `minmax` helps only when the column follows the table's sort order.
- An index costs on inserts; a new key or a projection may be better, and you must measure.
- A projection is a hidden copy sorted another way; queries still name the base table, at the cost of space.
