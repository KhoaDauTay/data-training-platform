---
id: e-pg-l4-02
engine: postgres
level: L4
module: planner
title_en: "Column statistics: MCV, histogram, correlation"
kind: lab
minutes: 15
objectives:
  - { vi: "Đọc `most_common_vals`, `most_common_freqs`, `n_distinct` và `correlation` trong `pg_stats`", en: "Read `most_common_vals`, `most_common_freqs`, `n_distinct` and `correlation` in `pg_stats`" }
  - { vi: "Tự tính số dòng ước lượng của một điều kiện bằng từ danh sách MCV", en: "Compute the row estimate of an equality condition from the MCV list" }
  - { vi: "Giải thích vì sao cùng một câu có thể chọn Bitmap Scan cho giá trị hiếm và Seq Scan cho giá trị phổ biến", en: "Explain why the same query can pick a Bitmap Scan for a rare value and a Seq Scan for a common one" }
requires: [e-pg-l4-01]
sources:
  - https://www.postgresql.org/docs/18/planner-stats.html
  - https://www.postgresql.org/docs/18/row-estimation-examples.html
  - https://www.postgresql.org/docs/18/view-pg-stats.html
viz: planTree
lab:
  setup: |
    DROP TABLE IF EXISTS parcels;
    CREATE TABLE parcels (id int PRIMARY KEY, hub int NOT NULL, status text NOT NULL, day int NOT NULL, weight int NOT NULL);
    INSERT INTO parcels
      SELECT g, g % 20 + 1,
             CASE WHEN g % 100 < 70 THEN 'delivered' WHEN g % 100 < 90 THEN 'in_transit' WHEN g % 100 < 99 THEN 'returned' ELSE 'lost' END,
             (g - 1) / 100 + 1, (g * 7919) % 5000
      FROM generate_series(1, 20000) g;
    CREATE INDEX parcels_status_idx ON parcels (status);
    ANALYZE parcels;
  steps:
    - task: { vi: "Liệt kê các giá trị phổ biến nhất của cột `status` và tần suất của chúng (hai cột, ép sang text).", en: "List the most common values of column `status` and their frequencies (two columns, cast to text)." }
      solution: "SELECT most_common_vals::text, most_common_freqs::text FROM pg_stats WHERE tablename = 'parcels' AND attname = 'status'"
      check: catalog
      hint: { vi: "Hai mảng song song trong view `pg_stats`.", en: "Two parallel arrays in the `pg_stats` view." }
    - task: { vi: "Với mỗi cột của `parcels`, cho biết `n_distinct` và `correlation`, sắp theo tên cột.", en: "For every column of `parcels`, show `n_distinct` and `correlation`, ordered by column name." }
      solution: "SELECT attname, n_distinct, correlation FROM pg_stats WHERE tablename = 'parcels' ORDER BY attname"
      check: catalog
      ordered: true
      hint: { vi: "`n_distinct` âm nghĩa là tỉ lệ so với số dòng (-1 = mọi giá trị khác nhau).", en: "A negative `n_distinct` is a fraction of the row count (-1 = every value is distinct)." }
    - task: { vi: "Đọc mọi cột của các kiện đã thất lạc (trạng thái 'lost', khoảng 1%). Planner nên dùng index trên trạng thái.", en: "Read every column of the lost parcels (status 'lost', about 1%). The planner should use the status index." }
      solution: "SELECT * FROM parcels WHERE status = 'lost'"
      check: plan
      hint: { vi: "Giá trị hiếm → ít trang → đáng đi qua index.", en: "A rare value means few pages, so the index pays off." }
predict:
  sql: "EXPLAIN SELECT * FROM parcels WHERE status = 'delivered'"
  q: { vi: "'delivered' chiếm 70% bảng. Postgres sẽ đọc thế nào, và ước lượng bao nhiêu dòng?", en: "'delivered' is 70% of the table. How will Postgres read it, and how many rows will it estimate?" }
  options:
    - { vi: "Bitmap Heap Scan qua `parcels_status_idx`, khoảng 200 dòng", en: "Bitmap Heap Scan through `parcels_status_idx`, about 200 rows" }
    - { vi: "Seq Scan với Filter, 14000 dòng (0.7 × 20000)", en: "Seq Scan with a Filter, 14000 rows (0.7 × 20000)" }
    - { vi: "Index Scan, 14000 dòng", en: "Index Scan, 14000 rows" }
  answer: 1
  why: { vi: "Ước lượng = tần suất MCV × reltuples = 0.7 × 20000 = 14000. Đọc 70% bảng qua index thì nhảy trang ngẫu nhiên nhiều hơn đọc tuần tự, nên Seq Scan rẻ hơn.", en: "Estimate = MCV frequency × reltuples = 0.7 × 20000 = 14000. Reading 70% of the table through an index means more random page jumps than a sequential read, so the Seq Scan is cheaper." }
---

## Ý chính

- ANALYZE lấy mẫu tối đa 300 × `default_statistics_target` (100) = 30000 dòng mỗi bảng, rồi ghi vào `pg_statistic`. View dễ đọc là `pg_stats`.
- **MCV** (`most_common_vals` + `most_common_freqs`): các giá trị gặp nhiều nhất. Với điều kiện bằng một hằng số có trong MCV, số dòng ước lượng = tần suất × `reltuples`.
- **Histogram** (`histogram_bounds`): các giá trị còn lại chia thành các ô có số dòng bằng nhau. Điều kiện khoảng (`<`, `BETWEEN`) được ước lượng bằng cách đếm phần ô bị cắt.
- **`n_distinct`**: dương = số giá trị khác nhau; âm = tỉ lệ trên số dòng (-1 = duy nhất).
- **`correlation`**: thứ tự vật lý trên đĩa khớp với thứ tự giá trị tới đâu (-1..1). Gần ±1: Index Scan theo khoảng đọc trang liền nhau, rẻ; gần 0: mỗi dòng có thể là một trang khác.
- Cột lệch mạnh hoặc nhiều giá trị: tăng mục tiêu riêng cho cột bằng `ALTER TABLE … ALTER COLUMN … SET STATISTICS`, rồi ANALYZE lại.

## Ví dụ

Kết quả thật trên PGlite sau `ANALYZE parcels` (20000 dòng, ANALYZE đọc hết nên kết quả cố định):

```text
status: most_common_vals {delivered,in_transit,returned,lost}
        most_common_freqs {0.7,0.2,0.09,0.01}
day     n_distinct 200     correlation 1
weight  n_distinct -0.25   correlation 0.00084351

EXPLAIN SELECT * FROM parcels WHERE status = 'lost';
Bitmap Heap Scan on parcels  (cost=5.84..164.18 rows=200 width=26)
  Recheck Cond: (status = 'lost'::text)
  ->  Bitmap Index Scan on parcels_status_idx  (cost=0.00..5.79 rows=200 width=0)
```

0.01 × 20000 = 200 dòng ước lượng. `day` được chèn theo thứ tự nên correlation = 1; `weight` bị xáo trộn nên gần 0.

## Thực hành

Đọc MCV, đọc `n_distinct`/`correlation`, rồi viết câu cho giá trị hiếm để thấy planner chọn index. Kỹ năng chuyên gia: từ `pg_stats` đoán được số `rows=` trong kế hoạch trước khi chạy, và nhận ra khi nào ước lượng sai vì thống kê cũ hay thiếu.

# EN

## Key ideas

- ANALYZE samples up to 300 × `default_statistics_target` (100) = 30000 rows per table and writes the result to `pg_statistic`. The readable view is `pg_stats`.
- **MCV** (`most_common_vals` + `most_common_freqs`): the most frequent values. For an equality with a constant that is in the MCV list, the estimate is frequency × `reltuples`.
- **Histogram** (`histogram_bounds`): the remaining values split into buckets with equal row counts. Range conditions (`<`, `BETWEEN`) are estimated by counting the part of the buckets they cover.
- **`n_distinct`**: positive = number of distinct values; negative = a fraction of the row count (-1 = unique).
- **`correlation`**: how closely the physical order on disk follows the value order (-1..1). Near ±1, a range Index Scan reads neighbouring pages and is cheap; near 0, each row can be a different page.
- For a skewed column or one with many values, raise its own target with `ALTER TABLE … ALTER COLUMN … SET STATISTICS` and ANALYZE again.

## Example

Real output from PGlite after `ANALYZE parcels` (20000 rows, ANALYZE reads them all, so the result is fixed):

```text
status: most_common_vals {delivered,in_transit,returned,lost}
        most_common_freqs {0.7,0.2,0.09,0.01}
day     n_distinct 200     correlation 1
weight  n_distinct -0.25   correlation 0.00084351

EXPLAIN SELECT * FROM parcels WHERE status = 'lost';
Bitmap Heap Scan on parcels  (cost=5.84..164.18 rows=200 width=26)
  Recheck Cond: (status = 'lost'::text)
  ->  Bitmap Index Scan on parcels_status_idx  (cost=0.00..5.79 rows=200 width=0)
```

0.01 × 20000 = 200 estimated rows. `day` was inserted in order, so its correlation is 1; `weight` is shuffled, so it is close to 0.

## Practice

Read the MCV list, read `n_distinct`/`correlation`, then query a rare value and watch the planner pick the index. Expert skill: predict the `rows=` figure of a plan from `pg_stats` before running it, and spot when an estimate is wrong because statistics are stale or missing.
