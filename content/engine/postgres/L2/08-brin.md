---
id: e-pg-l2-08
engine: postgres
level: L2
module: index-types
title: BRIN cho dữ liệu ghi theo thời gian
title_en: BRIN for data written in time order
kind: predict
runtime: browser
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-brin-ranges
objectives:
  - vi: Chọn BRIN cho cột tăng dần theo thứ tự ghi (thời gian đo, log), và giải thích vì sao index của 30.000 dòng chỉ chiếm vài trang.
    en: Choose BRIN for a column that grows in write order (measurement time, logs), and explain why the index for 30,000 rows takes only a few pages.
  - vi: 'Biết BRIN là index "thô": nó loại trừ khối trang, rồi phải kiểm lại từng dòng (`Recheck Cond`).'
    en: Know BRIN is a lossy index that rules out block ranges and then rechecks each row (`Recheck Cond`).
  - vi: Kiểm tương quan giữa giá trị và vị trí vật lý trước khi chọn BRIN.
    en: Check the correlation between values and physical position before choosing BRIN.
requires: [e-pg-l2-07]
sources:
  - { url: https://www.postgresql.org/docs/18/brin.html, title_vi: "Index BRIN" }
  - { url: https://www.postgresql.org/docs/18/indexes-types.html, title_vi: "Các loại index" }
  - { url: https://www.postgresql.org/docs/18/view-pg-stats.html, title_vi: "pg_stats" }
lab:
  setup: |
    CREATE TABLE readings (
      id bigint PRIMARY KEY,
      taken_at timestamptz NOT NULL,
      value numeric(6,2) NOT NULL
    );
    INSERT INTO readings
    SELECT g, timestamptz '2026-01-01 00:00+00' + g * interval '10 minutes', (g % 400) / 4.0
    FROM generate_series(1, 30000) AS g;
    CREATE INDEX readings_taken_brin ON readings USING brin (taken_at) WITH (pages_per_range = 8);
    ANALYZE readings;
  steps:
    - task:
        vi: "So kích thước, hai cột `relname` và `relpages`: trả về số trang (`relpages`) của bảng `readings` và của index `readings_taken_brin`, sắp theo tên (`relname`)."
        en: "Compare sizes, two columns `relname` and `relpages`: return the page count (`relpages`) of table `readings` and of index `readings_taken_brin`, ordered by name (`relname`)."
      solution: SELECT relname, relpages FROM pg_class WHERE relname IN ('readings', 'readings_taken_brin') ORDER BY relname
      check: rows
      ordered: true
      hint:
        vi: "`pg_class` có cột `relname` và `relpages`; lọc bằng `IN (...)`."
        en: "`pg_class` has columns `relname` and `relpages`; filter with `IN (...)`."
    - task:
        vi: "Đếm số đo và giá trị trung bình (làm tròn 2 chữ số) của ngày 2026-04-10 theo giờ UTC (hai cột, một dòng). Bài chấm cả tốc độ: đúng mà không dùng được `readings_taken_brin` là chưa đạt."
        en: "Count the readings and their average value (rounded to 2 decimals) on 2026-04-10, UTC time (two columns, one row). Speed is graded too: a right answer that cannot use `readings_taken_brin` does not pass."
      solution: SELECT count(*), round(avg(value), 2) FROM readings WHERE taken_at >= timestamptz '2026-04-10 00:00+00' AND taken_at < timestamptz '2026-04-11 00:00+00'
      check: rows
      perf: { table: readings }
      slow: SELECT count(*), round(avg(value), 2) FROM readings WHERE (taken_at AT TIME ZONE 'UTC')::date = date '2026-04-10'
      hint:
        vi: "So thẳng `taken_at` với hai mốc: `>=` đầu ngày và `<` đầu ngày hôm sau."
        en: "Compare `taken_at` itself with two bounds: `>=` the start of the day and `<` the start of the next day."
quiz:
  - q:
      vi: "Một bảng log được nạp lại theo thứ tự ngẫu nhiên, nên `taken_at` không còn tăng theo vị trí dòng. Index BRIN trên `taken_at` giúp được gì?"
      en: "A log table was reloaded in random order, so `taken_at` no longer grows with row position. What does a BRIN index on `taken_at` do for it?"
    options:
      - { vi: "Vẫn nhanh như trước: index nào cũng giúp câu lọc khoảng", en: "Still as fast as before: any index helps a range filter" }
      - { vi: "Gần như không gì: khối nào cũng có min nhỏ và max lớn, không khối nào bị loại", en: "Almost nothing: every range has a small min and a large max, so no range is ruled out" }
      - { vi: "BRIN tự sắp lại bảng khi tạo index", en: "BRIN re-sorts the table when the index is created" }
    answer: 1
    trap: 0
    why:
      vi: "B-tree giúp câu khoảng bất kể thứ tự dòng, nên dễ nghĩ index nào cũng vậy; nhưng BRIN chỉ lưu giá trị nhỏ nhất và lớn nhất của mỗi nhóm trang (block range). Khi giá trị bị xáo trộn, nhóm nào cũng chứa cả thời điểm sớm lẫn muộn, nên khoảng min–max của mọi nhóm phủ gần hết năm, index không loại được nhóm nào và planner chọn Seq Scan. Tạo BRIN cũng không sắp lại bảng: nó chỉ đọc bảng như đang có. Dấu hiệu cảnh báo là `pg_stats.correlation` gần 0 (giá trị không đi theo vị trí dòng)."
      en: "A B-tree helps a range query whatever the row order, so it is easy to think every index does; but a BRIN stores only the smallest and largest value of each block range. When values are shuffled, every range holds both early and late times, so each range's min–max spans nearly the whole year, the index rules nothing out and the planner picks a Seq Scan. Creating a BRIN does not re-sort the table either: it reads the table as it is. The warning sign is a `pg_stats.correlation` near 0 (values do not follow row position)."
predict:
  sql: SELECT count(*) FROM readings WHERE taken_at >= timestamptz '2026-03-01 00:00+00' AND taken_at < timestamptz '2026-03-02 00:00+00'
  expect: { node: Bitmap Index Scan, index: readings_taken_brin }
  q:
    vi: "30.000 số đo, mỗi 10 phút một số, ghi theo đúng thứ tự thời gian. Có index BRIN trên `taken_at`. Đếm số đo của một ngày thì kế hoạch là gì?"
    en: "30,000 readings, one every 10 minutes, written in time order. There is a BRIN index on `taken_at`. What is the plan for counting one day's readings?"
  options:
    - { vi: "Seq Scan: BRIN chỉ là bản tóm tắt, không dùng để tìm được", en: "Seq Scan: BRIN is only a summary and cannot be used for lookups" }
    - { vi: "Bitmap Heap Scan với `Recheck Cond`, qua Bitmap Index Scan trên `readings_taken_brin`", en: "Bitmap Heap Scan with `Recheck Cond`, over a Bitmap Index Scan on `readings_taken_brin`" }
    - { vi: "Index Scan trả đúng 144 dòng, không cần kiểm lại", en: "Index Scan returning exactly 144 rows, no recheck needed" }
  answer: 1
  trap: 0
  why:
    vi: "Seq Scan nghe hợp lý vì BRIN chỉ là bản tóm tắt, không biết từng dòng nằm đâu; nhưng bản tóm tắt đó đủ để bỏ qua các nhóm trang không liên quan: BRIN lưu min/max của `taken_at` cho mỗi nhóm 8 trang (block range). Vì dữ liệu ghi theo thời gian, chỉ một, hai nhóm có khoảng giao với ngày cần đếm. Bitmap Index Scan đánh dấu các nhóm đó, Bitmap Heap Scan đọc trang của chúng, và `Recheck Cond` kiểm lại từng dòng, vì nhóm trang chứa cả dòng của ngày khác; còn lại 144 dòng (24 giờ × 6 số đo mỗi giờ). BRIN không bao giờ trỏ thẳng tới một dòng, nên không có Index Scan trả đúng 144 dòng."
    en: "A Seq Scan sounds right because BRIN is only a summary and does not know where each row is, but that summary is enough to skip unrelated page groups: BRIN stores the min/max of `taken_at` for each 8-page block range. Because data was written in time order, only one or two ranges overlap the day. The Bitmap Index Scan marks those ranges, the Bitmap Heap Scan reads their pages, and `Recheck Cond` checks each row again, because a range also holds rows of other days; 144 rows remain (24 hours × 6 readings an hour). BRIN never points at a single row, so there is no Index Scan returning exactly 144 rows."
---
## Mở bài

Cảm biến ghi một số đo mỗi 10 phút, và bảng chỉ lớn lên ở cuối. Một B-tree trên cột thời gian giữ một mục cho mỗi dòng, nên to dần theo bảng. Nếu dữ liệu đã nằm sẵn theo thứ tự thời gian, liệu index có cần biết từng dòng không?

## Ý chính

BRIN (Block Range INdex) không lưu từng dòng. Nó chia bảng thành các khối liên tiếp gồm `pages_per_range` trang (mặc định 128) và với mỗi khối chỉ lưu một bản tóm tắt, thường là min và max của cột. Một dòng tóm tắt cho cả khối, thay vì một mục cho mỗi dòng như B-tree, nên index cực nhỏ.

Với câu lọc khoảng, khối nào có [min, max] không giao với khoảng cần tìm thì bị bỏ qua cả khối. Các khối còn lại được Bitmap Heap Scan đọc hết, và `Recheck Cond` kiểm lại từng dòng, vì bản tóm tắt chỉ nói "khối này có thể chứa dòng khớp".

Nhiều người nghĩ index nào cũng giúp câu lọc khoảng. Thật ra BRIN chỉ hiệu quả khi giá trị tương quan với vị trí vật lý trong bảng: dữ liệu ghi theo thời gian, id tăng dần. Nếu giá trị bị xáo trộn, mọi khối đều có min nhỏ và max lớn, và BRIN không loại được khối nào. `pg_stats.correlation` gần 1 (hoặc -1) là dấu hiệu tốt, gần 0 là dấu hiệu xấu.

Ngoài opclass `minmax` mặc định còn có `minmax-multi` (nhiều khoảng mỗi khối, chịu được vài giá trị lạc chỗ), `bloom` và `inclusion` (cho kiểu hình học, range). BRIN không làm unique.

## Ví dụ

Thứ tự ghi có trùng thứ tự thời gian không?

```sql
SELECT round(corr(id, extract(epoch FROM taken_at))::numeric, 3) AS physical_order
FROM readings;
```

Kết quả `1.000`: `id` tăng cùng thời gian, đúng điều kiện để BRIN có ích.

```sql
SELECT attname, correlation FROM pg_stats
WHERE tablename = 'readings' AND attname = 'taken_at';
```

Planner cũng thấy điều đó: `correlation` của `taken_at` là `1`, tức thứ tự giá trị trùng thứ tự dòng trên đĩa.

## Lỗi hay gặp

Dùng BRIN trên dữ liệu bị xáo trộn:

```sql
-- WRONG: shuffled values, so every block range spans the whole year
CREATE TABLE demo_shuffled (id bigint PRIMARY KEY, taken_at timestamptz NOT NULL);
INSERT INTO demo_shuffled
SELECT g, timestamptz '2026-01-01 00:00+00' + ((g * 7919) % 30000) * interval '10 minutes'
FROM generate_series(1, 30000) AS g;
CREATE INDEX demo_shuffled_brin ON demo_shuffled USING brin (taken_at) WITH (pages_per_range = 8);
ANALYZE demo_shuffled;
EXPLAIN SELECT count(*) FROM demo_shuffled
WHERE taken_at >= timestamptz '2026-03-01 00:00+00' AND taken_at < timestamptz '2026-03-02 00:00+00';
```

```sql
-- FIX: shuffled data needs a B-tree, which does not depend on row order
CREATE INDEX demo_shuffled_btree ON demo_shuffled (taken_at);
EXPLAIN SELECT count(*) FROM demo_shuffled
WHERE taken_at >= timestamptz '2026-03-01 00:00+00' AND taken_at < timestamptz '2026-03-02 00:00+00';
```

Có BRIN mà kế hoạch vẫn là `Seq Scan`: không khối nào bị loại. Với B-tree, cùng câu đó đi qua index.

Dùng BRIN để chặn trùng:

```sql
-- ERROR 0A000: access method "brin" does not support unique indexes
CREATE UNIQUE INDEX demo_taken_key ON readings USING brin (taken_at);
```

BRIN chỉ biết khoảng của cả khối, không biết từng giá trị, nên không thể kiểm trùng.

## Thực hành

Đoán kế hoạch đếm số đo của một ngày, xem kế hoạch thật, so số trang của bảng và của index BRIN, rồi tổng hợp một ngày khác sao cho vừa đúng vừa nhanh.

## Tóm tắt

- BRIN lưu min/max cho mỗi khối `pages_per_range` trang, nên rất nhỏ.
- Nó loại cả khối, rồi `Recheck Cond` kiểm lại từng dòng; không bao giờ là Index Scan thường.
- Chỉ hiệu quả khi giá trị tương quan với thứ tự dòng; xem `pg_stats.correlation`.
- So thẳng cột với các mốc; bọc cột trong hàm thì BRIN cũng mất tác dụng.

# EN

## Opening

A sensor writes a reading every 10 minutes, and the table only grows at the end. A B-tree on the time column keeps one entry per row, so it grows with the table. If the data already sits in time order, does the index really need to know every row?

## Key idea

BRIN (Block Range INdex) does not store individual rows. It divides the table into consecutive ranges of `pages_per_range` pages (128 by default) and keeps only a summary per range, usually the min and max of the column. One summary row for a whole range, instead of one entry per row like a B-tree, makes the index tiny.

For a range query, a range whose [min, max] does not overlap the search is skipped entirely. The remaining ranges are read in full by a Bitmap Heap Scan, and `Recheck Cond` checks each row again, because the summary only says "this range may hold matching rows".

Many people think any index helps a range query. In fact BRIN only works when values correlate with the physical position in the table: data written in time order, increasing ids. If values are shuffled, every range has a small min and a large max, and BRIN rules out nothing. A `pg_stats.correlation` near 1 (or -1) is a good sign, near 0 a bad one.

Besides the default `minmax` opclass there are `minmax-multi` (several intervals per range, tolerates a few stray values), `bloom` and `inclusion` (for geometric and range types). BRIN does not enforce uniqueness.

## Example

Does write order match time order?

```sql
SELECT round(corr(id, extract(epoch FROM taken_at))::numeric, 3) AS physical_order
FROM readings;
```

Result `1.000`: `id` grows with time, exactly the condition for BRIN to help.

```sql
SELECT attname, correlation FROM pg_stats
WHERE tablename = 'readings' AND attname = 'taken_at';
```

The planner sees it too: the `correlation` of `taken_at` is `1`, so value order matches the order of rows on disk.

## Common mistakes

Using BRIN on shuffled data:

```sql
-- WRONG: shuffled values, so every block range spans the whole year
CREATE TABLE demo_shuffled (id bigint PRIMARY KEY, taken_at timestamptz NOT NULL);
INSERT INTO demo_shuffled
SELECT g, timestamptz '2026-01-01 00:00+00' + ((g * 7919) % 30000) * interval '10 minutes'
FROM generate_series(1, 30000) AS g;
CREATE INDEX demo_shuffled_brin ON demo_shuffled USING brin (taken_at) WITH (pages_per_range = 8);
ANALYZE demo_shuffled;
EXPLAIN SELECT count(*) FROM demo_shuffled
WHERE taken_at >= timestamptz '2026-03-01 00:00+00' AND taken_at < timestamptz '2026-03-02 00:00+00';
```

```sql
-- FIX: shuffled data needs a B-tree, which does not depend on row order
CREATE INDEX demo_shuffled_btree ON demo_shuffled (taken_at);
EXPLAIN SELECT count(*) FROM demo_shuffled
WHERE taken_at >= timestamptz '2026-03-01 00:00+00' AND taken_at < timestamptz '2026-03-02 00:00+00';
```

With a BRIN index the plan is still a `Seq Scan`: no range is ruled out. With a B-tree, the same query goes through the index.

Using BRIN to block duplicates:

```sql
-- ERROR 0A000: access method "brin" does not support unique indexes
CREATE UNIQUE INDEX demo_taken_key ON readings USING brin (taken_at);
```

BRIN only knows the span of a whole range, not each value, so it cannot check for duplicates.

## Practice

Guess the plan for counting one day's readings, look at the real plan, compare the page counts of the table and of the BRIN index, then summarise another day so the answer is both right and fast.

## Recap

- BRIN stores the min/max of each range of `pages_per_range` pages, so it is very small.
- It rules out whole ranges, then `Recheck Cond` checks each row; never a plain Index Scan.
- It only works when values correlate with row order; check `pg_stats.correlation`.
- Compare the column itself with bounds; wrapping the column in a function defeats BRIN too.
