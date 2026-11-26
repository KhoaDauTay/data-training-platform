---
id: e-pg-l4-02
engine: postgres
level: L4
module: planner-stats
title: "Thống kê cột: MCV, histogram, correlation"
title_en: "Column statistics: MCV, histogram, correlation"
kind: lab
runtime: browser
minutes: 15
figures: [{ name: pg-stats-estimate, at: idea, variant: mcv }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Đọc `most_common_vals`, `most_common_freqs`, `n_distinct` và `correlation` trong `pg_stats`", en: "Read `most_common_vals`, `most_common_freqs`, `n_distinct` and `correlation` in `pg_stats`" }
  - { vi: "Tự tính số dòng ước lượng của một điều kiện bằng từ danh sách MCV", en: "Compute the row estimate of an equality condition from the MCV list" }
  - { vi: "Giải thích vì sao cùng một câu có thể chọn Bitmap Scan cho giá trị hiếm và Seq Scan cho giá trị phổ biến", en: "Explain why the same query can pick a Bitmap Scan for a rare value and a Seq Scan for a common one" }
requires: [e-pg-l4-01]
sources:
  - https://www.postgresql.org/docs/18/planner-stats.html
  - https://www.postgresql.org/docs/18/row-estimation-examples.html
  - https://www.postgresql.org/docs/18/view-pg-stats.html
viz: pg-plan-tree
lab:
  setup: |
    DROP TABLE IF EXISTS parcels CASCADE;
    CREATE TABLE parcels (id int PRIMARY KEY, hub int NOT NULL, status text NOT NULL, day int NOT NULL, weight int NOT NULL);
    INSERT INTO parcels
      SELECT g, g % 20 + 1,
             CASE WHEN g % 100 < 70 THEN 'delivered' WHEN g % 100 < 90 THEN 'in_transit' WHEN g % 100 < 99 THEN 'returned' ELSE 'lost' END,
             (g - 1) / 100 + 1, (g * 7919) % 5000
      FROM generate_series(1, 20000) g;
    CREATE INDEX parcels_status_idx ON parcels (status);
    ANALYZE parcels;
  steps:
    - task: { vi: "Liệt kê các giá trị phổ biến nhất của cột `status` và tần suất của chúng (một dòng, hai cột: hai mảng ép sang text).", en: "List the most common values of column `status` and their frequencies (one row, two columns: the two arrays cast to text)." }
      solution: "SELECT most_common_vals::text, most_common_freqs::text FROM pg_stats WHERE tablename = 'parcels' AND attname = 'status'"
      check: rows
      hint: { vi: "Hai mảng song song trong view `pg_stats`.", en: "Two parallel arrays in the `pg_stats` view." }
    - task: { vi: "Với mỗi cột của `parcels`, cho biết `n_distinct` và `correlation`, sắp theo tên cột.", en: "For every column of `parcels`, show `n_distinct` and `correlation`, ordered by column name." }
      solution: "SELECT attname, n_distinct, correlation FROM pg_stats WHERE tablename = 'parcels' ORDER BY attname"
      check: rows
      ordered: true
      hint: { vi: "`n_distinct` âm nghĩa là tỉ lệ so với số dòng (-1 = mọi giá trị khác nhau).", en: "A negative `n_distinct` is a fraction of the row count (-1 = every value is distinct)." }
    - task: { vi: "Đọc mọi cột của các kiện đã thất lạc (trạng thái 'lost', khoảng 1 %). Planner nên dùng index trên trạng thái.", en: "Read every column of the lost parcels (status 'lost', about 1%). The planner should use the status index." }
      solution: "SELECT * FROM parcels WHERE status = 'lost'"
      check: plan
      hint: { vi: "Giá trị hiếm → ít trang → đáng đi qua index.", en: "A rare value means few pages, so the index pays off." }
predict:
  sql: "SELECT * FROM parcels WHERE status = 'delivered'"
  q: { vi: "'delivered' chiếm 70 % bảng. Postgres sẽ đọc thế nào, và ước lượng bao nhiêu dòng?", en: "'delivered' is 70% of the table. How will Postgres read it, and how many rows will it estimate?" }
  options:
    - { vi: "Bitmap Heap Scan qua `parcels_status_idx`, khoảng 200 dòng", en: "Bitmap Heap Scan through `parcels_status_idx`, about 200 rows" }
    - { vi: "Seq Scan với Filter, 14.000 dòng (0,7 × 20.000)", en: "Seq Scan with a Filter, 14,000 rows (0.7 × 20,000)" }
    - { vi: "Index Scan, 14.000 dòng", en: "Index Scan, 14,000 rows" }
  answer: 1
  trap: 0
  why: { vi: "Nghe hợp lý vì có index trên trạng thái, nhưng index chỉ đáng khi giá trị hiếm. Ước lượng = tần suất MCV × reltuples = 0,7 × 20.000 = 14.000. Đọc 70 % bảng qua index thì nhảy trang ngẫu nhiên nhiều hơn đọc tuần tự, nên Seq Scan rẻ hơn.", en: "It sounds right because there is an index on the status, but an index only pays off for a rare value. Estimate = MCV frequency × reltuples = 0.7 × 20,000 = 14,000. Reading 70% of the table through an index means more random page jumps than a sequential read, so the Seq Scan is cheaper." }
  expect: { node: Seq Scan, table: parcels }
quiz:
  - q: { vi: "Bảng có 50 triệu dòng, cấu hình mặc định. `ANALYZE` đọc bao nhiêu dòng để lập thống kê?", en: "A table holds 50 million rows, default settings. How many rows does `ANALYZE` read to build the statistics?" }
    options:
      - { vi: "Cả 50 triệu dòng, nếu không thì thống kê sai", en: "All 50 million rows, otherwise the statistics would be wrong" }
      - { vi: "Một mẫu ngẫu nhiên khoảng 30.000 dòng (300 × `default_statistics_target`)", en: "A random sample of about 30,000 rows (300 × `default_statistics_target`)" }
      - { vi: "100 dòng đầu tiên của bảng", en: "The first 100 rows of the table" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì thống kê càng đầy đủ càng đúng, nhưng đọc hết một bảng lớn sau mỗi đợt ghi là quá đắt. `ANALYZE` lấy mẫu ngẫu nhiên 300 × `default_statistics_target` dòng (mặc định 30.000), đủ để ước lượng tần suất và histogram. Bảng nhỏ hơn mức đó thì được đọc hết, như bảng `parcels` ở đây. Cột cần chính xác hơn thì tăng mục tiêu riêng bằng `SET STATISTICS`.", en: "It sounds right because fuller statistics are more accurate, but reading a whole big table after every batch of writes is too expensive. `ANALYZE` takes a random sample of 300 × `default_statistics_target` rows (30,000 by default), enough to estimate frequencies and a histogram. A table smaller than that is read in full, like `parcels` here. A column that needs more precision gets its own target with `SET STATISTICS`." }
---
## Mở bài

Cùng một câu `WHERE status = …`, với 'lost' Postgres đi qua index, với 'delivered' nó đọc cả bảng. Nó chưa chạy câu nào, vậy làm sao nó biết giá trị nào hiếm?

## Ý chính

Planner đoán số dòng từ thống kê mà `ANALYZE` ghi vào `pg_statistic`; view dễ đọc là `pg_stats`, mỗi cột một dòng. `ANALYZE` lấy mẫu tối đa 300 × `default_statistics_target` (mặc định 100) = 30.000 dòng mỗi bảng. Bảng nhỏ hơn thì được đọc hết, nên thống kê trong bài này đúng tuyệt đối.

MCV (`most_common_vals` cùng `most_common_freqs`) là danh sách giá trị gặp nhiều nhất và tần suất của chúng. Với điều kiện `col = x` mà x có trong danh sách, ước lượng = tần suất × `reltuples`. Các giá trị còn lại được chia vào histogram (`histogram_bounds`): các ô có số dòng bằng nhau, và điều kiện khoảng như `<` hay `BETWEEN` được ước lượng bằng phần ô bị cắt.

`n_distinct` dương là số giá trị khác nhau; âm là tỉ lệ trên số dòng (-1 = mọi giá trị khác nhau, như khóa chính). `correlation` (-1 đến 1) cho biết thứ tự vật lý khớp thứ tự giá trị tới đâu. Gần ±1 thì đọc một khoảng qua index chạm các trang liền nhau, rẻ; gần 0 thì mỗi dòng có thể nằm ở một trang khác.

Nhiều người nghĩ có index là Postgres sẽ dùng. Thật ra planner so chi phí: với giá trị chiếm 70 % bảng, nhảy qua index tới từng trang đắt hơn đọc tuần tự, nên Seq Scan thắng. Thống kê đúng là thứ giúp nó chọn đúng.

Bọc cột trong một hàm, như `lower(status)`, làm planner mất thống kê của cột: nó quay về độ chọn lọc mặc định 0,5 % cho điều kiện bằng. Cột lệch mạnh hoặc có rất nhiều giá trị thì tăng mục tiêu riêng cho cột bằng `SET STATISTICS` (tối đa 10.000) rồi ANALYZE lại.

Hình cuối mục này làm phép nhân đó với cột `status` của `parcels`: tần suất của `lost` nhân số dòng của bảng ra đúng số `rows` trong kế hoạch.

## Cú pháp

```sql
ANALYZE [ table_name [ ( column [, ...] ) ] ];
ALTER TABLE table_name ALTER COLUMN column SET STATISTICS target;
SELECT attname, null_frac, n_distinct, most_common_vals, most_common_freqs, histogram_bounds, correlation
FROM pg_stats WHERE tablename = 'table_name' [ AND attname = 'column' ];
```

- `target`: số mục MCV và ô histogram tối đa cho cột; -1 = dùng `default_statistics_target`.
- `most_common_vals` có kiểu `anyarray`: ép `::text` để đọc hoặc so.
- `null_frac`: tỉ lệ NULL, dùng cho `IS NULL`.

## Ví dụ

Tổng quan thống kê của mọi cột:

```sql
SELECT attname, null_frac, n_distinct, correlation
FROM pg_stats WHERE tablename = 'parcels'
ORDER BY attname;
```

`id` và `day` có correlation = 1 vì được chèn theo thứ tự; `weight` bị xáo nên gần 0 và có `n_distinct` = -0,25 (5.000 giá trị trên 20.000 dòng).

Một giá trị trong MCV, tần suất 0,09:

```sql
EXPLAIN SELECT * FROM parcels WHERE status = 'returned';
```

Ước lượng 0,09 × 20.000 = 1.800 dòng, vẫn đủ ít để Bitmap Heap Scan qua `parcels_status_idx` thắng.

Điều kiện khoảng dùng histogram:

```sql
SELECT array_length(histogram_bounds, 1) AS bounds
FROM pg_stats WHERE tablename = 'parcels' AND attname = 'weight';
```

```sql
EXPLAIN SELECT * FROM parcels WHERE weight < 500;
```

101 ranh giới chia 100 ô đều nhau. `weight < 500` cắt khoảng 10 ô, nên ước lượng là 2.000 dòng.

Giảm mục tiêu thống kê của một cột:

```sql
ALTER TABLE parcels ALTER COLUMN weight SET STATISTICS 10;
ANALYZE parcels;
SELECT array_length(histogram_bounds, 1) AS bounds
FROM pg_stats WHERE tablename = 'parcels' AND attname = 'weight';
```

Histogram chỉ còn 11 ranh giới: rẻ hơn để lưu và đọc, nhưng điều kiện khoảng được ước lượng thô hơn.

## Lỗi hay gặp

Bọc cột trong hàm làm planner mất thống kê:

```sql
-- WRONG: lower() hides the column statistics and the index
EXPLAIN SELECT * FROM parcels WHERE lower(status) = 'lost';
```

```sql
-- FIX: compare the column itself
EXPLAIN SELECT * FROM parcels WHERE status = 'lost';
```

Câu sai ước lượng 100 dòng (0,5 % mặc định thay vì 1 % thật) và đọc cả bảng. Câu đúng dùng MCV, ra 200 dòng và đi qua index. Nếu thật sự cần `lower()`, tạo index biểu thức: `ANALYZE` sẽ ghi thống kê cho chính biểu thức đó.

Tạo bảng mới rồi truy vấn ngay, chưa ANALYZE:

```sql
-- WRONG: a new table has no column statistics yet
CREATE TABLE parcels_copy AS SELECT * FROM parcels;
EXPLAIN SELECT * FROM parcels_copy WHERE status = 'lost';
```

```sql
-- FIX: analyze it first
ANALYZE parcels_copy;
EXPLAIN SELECT * FROM parcels_copy WHERE status = 'lost';
```

Không có thống kê, planner đoán khoảng 100 dòng bằng hằng số mặc định; sau ANALYZE nó ra đúng 200. Bảng vừa nạp xong chưa được autovacuum ANALYZE ngay, nên hãy tự chạy.

## Thực hành

Ba bước: đọc MCV của `status`, đọc `n_distinct` và `correlation` của mọi cột, rồi viết câu cho giá trị hiếm để thấy planner chọn index. Sau đó là hai câu hỏi.

## Tóm tắt

- Planner đoán số dòng từ `pg_stats`, do `ANALYZE` ghi từ một mẫu tối đa 30.000 dòng.
- Giá trị trong MCV: tần suất × số dòng; điều kiện khoảng: phần histogram bị cắt.
- Có index chưa chắc được dùng: giá trị phổ biến thì Seq Scan rẻ hơn.
- Hàm bọc cột và bảng chưa ANALYZE đều đẩy planner về hằng số mặc định.

# EN

## Opening

The same `WHERE status = …` query goes through the index for 'lost' and reads the whole table for 'delivered'. Postgres has not run anything yet, so how does it know which value is rare?

## Key idea

The planner guesses row counts from the statistics `ANALYZE` writes into `pg_statistic`; the readable view is `pg_stats`, one row per column. `ANALYZE` samples up to 300 × `default_statistics_target` (100 by default) = 30,000 rows per table. A smaller table is read in full, so the statistics in this lesson are exact.

The MCV list (`most_common_vals` with `most_common_freqs`) holds the most frequent values and their frequencies. For a condition `col = x` with x in the list, the estimate is frequency × `reltuples`. The other values go into a histogram (`histogram_bounds`): buckets with equal row counts, and range conditions such as `<` or `BETWEEN` are estimated from the part of the buckets they cover.

A positive `n_distinct` is the number of distinct values; a negative one is a fraction of the row count (-1 = every value distinct, like a primary key). `correlation` (-1 to 1) says how closely the physical order follows the value order. Near ±1, reading a range through an index touches neighbouring pages and is cheap; near 0, each row can sit on a different page.

Many people think that if an index exists, Postgres will use it. In fact the planner compares costs: for a value that is 70% of the table, jumping through the index to each page costs more than a sequential read, so the Seq Scan wins. Correct statistics are what let it choose well.

Wrapping the column in a function, such as `lower(status)`, makes the planner lose the column's statistics: it falls back to a default selectivity of 0.5% for an equality. For a heavily skewed column, or one with very many values, raise its own target with `SET STATISTICS` (up to 10,000) and ANALYZE again.

The figure at the end of this section does that multiplication with column `status` of `parcels`: the frequency of `lost` times the table's row count gives exactly the plan's `rows`.

## Syntax

```sql
ANALYZE [ table_name [ ( column [, ...] ) ] ];
ALTER TABLE table_name ALTER COLUMN column SET STATISTICS target;
SELECT attname, null_frac, n_distinct, most_common_vals, most_common_freqs, histogram_bounds, correlation
FROM pg_stats WHERE tablename = 'table_name' [ AND attname = 'column' ];
```

- `target`: the maximum number of MCV entries and histogram buckets for the column; -1 = use `default_statistics_target`.
- `most_common_vals` has type `anyarray`: cast it `::text` to read or compare it.
- `null_frac`: the fraction of NULLs, used for `IS NULL`.

## Example

An overview of every column's statistics:

```sql
SELECT attname, null_frac, n_distinct, correlation
FROM pg_stats WHERE tablename = 'parcels'
ORDER BY attname;
```

`id` and `day` have correlation = 1 because they were inserted in order; `weight` is shuffled, so it is close to 0, and its `n_distinct` is -0.25 (5,000 values over 20,000 rows).

A value in the MCV list, frequency 0.09:

```sql
EXPLAIN SELECT * FROM parcels WHERE status = 'returned';
```

The estimate is 0.09 × 20,000 = 1,800 rows, still few enough for a Bitmap Heap Scan through `parcels_status_idx` to win.

A range condition uses the histogram:

```sql
SELECT array_length(histogram_bounds, 1) AS bounds
FROM pg_stats WHERE tablename = 'parcels' AND attname = 'weight';
```

```sql
EXPLAIN SELECT * FROM parcels WHERE weight < 500;
```

101 bounds make 100 equal buckets. `weight < 500` covers about 10 of them, so the estimate is 2,000 rows.

Lowering one column's statistics target:

```sql
ALTER TABLE parcels ALTER COLUMN weight SET STATISTICS 10;
ANALYZE parcels;
SELECT array_length(histogram_bounds, 1) AS bounds
FROM pg_stats WHERE tablename = 'parcels' AND attname = 'weight';
```

The histogram keeps only 11 bounds: cheaper to store and read, but range conditions are estimated more roughly.

## Common mistakes

Wrapping the column in a function hides its statistics:

```sql
-- WRONG: lower() hides the column statistics and the index
EXPLAIN SELECT * FROM parcels WHERE lower(status) = 'lost';
```

```sql
-- FIX: compare the column itself
EXPLAIN SELECT * FROM parcels WHERE status = 'lost';
```

The wrong query estimates 100 rows (the 0.5% default instead of the real 1%) and reads the whole table. The right one uses the MCV list, gets 200 rows and goes through the index. If you really need `lower()`, create an expression index: `ANALYZE` then records statistics for that expression itself.

Creating a table and querying it right away, before any ANALYZE:

```sql
-- WRONG: a new table has no column statistics yet
CREATE TABLE parcels_copy AS SELECT * FROM parcels;
EXPLAIN SELECT * FROM parcels_copy WHERE status = 'lost';
```

```sql
-- FIX: analyze it first
ANALYZE parcels_copy;
EXPLAIN SELECT * FROM parcels_copy WHERE status = 'lost';
```

With no statistics the planner guesses about 100 rows from a default constant; after ANALYZE it gets exactly 200. Autovacuum does not analyze a freshly loaded table at once, so run it yourself.

## Practice

Three steps: read the MCV list of `status`, read `n_distinct` and `correlation` for every column, then query a rare value and watch the planner pick the index. Then two questions.

## Recap

- The planner guesses row counts from `pg_stats`, written by `ANALYZE` from a sample of at most 30,000 rows.
- A value in the MCV list: frequency × row count; a range condition: the covered part of the histogram.
- An index is not always used: for a common value a Seq Scan is cheaper.
- A function around the column and a table never analyzed both push the planner back to default constants.
