---
id: e-pg-l2-15
engine: postgres
level: L2
module: explain-analyze
title: "pg_stats: planner đoán số dòng từ đâu"
title_en: "pg_stats: where the planner's row guesses come from"
kind: predict
runtime: browser
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Đọc `most_common_vals`, `most_common_freqs`, `null_frac` và `n_distinct` trong `pg_stats`.
    en: Read `most_common_vals`, `most_common_freqs`, `null_frac` and `n_distinct` in `pg_stats`.
  - vi: Tính lại con số `rows=` của `EXPLAIN` từ thống kê, để biết khi nào ước lượng đáng tin.
    en: Recompute the `rows=` figure of `EXPLAIN` from the statistics, so you know when an estimate can be trusted.
requires: [e-pg-l2-14]
sources:
  - https://www.postgresql.org/docs/18/planner-stats.html
  - https://www.postgresql.org/docs/18/view-pg-stats.html
  - https://www.postgresql.org/docs/18/sql-analyze.html
lab:
  setup: |
    CREATE TABLE tickets (
      id int PRIMARY KEY,
      status text NOT NULL,
      closed_at date
    );
    INSERT INTO tickets
    SELECT g,
           CASE WHEN g % 10 < 6 THEN 'open' WHEN g % 10 < 9 THEN 'pending' ELSE 'closed' END,
           CASE WHEN g % 10 = 9 THEN date '2026-01-01' + (g % 300) END
    FROM generate_series(1, 30000) AS g;
    ANALYZE tickets;
  steps:
    - task:
        vi: "Đọc thống kê của cột `status` trong bảng `tickets`: trả về `n_distinct`, và `most_common_vals`, `most_common_freqs` dưới dạng chữ (`::text`)."
        en: "Read the statistics of column `status` in table `tickets`: return `n_distinct`, plus `most_common_vals` and `most_common_freqs` as text (`::text`)."
      solution: SELECT n_distinct, most_common_vals::text, most_common_freqs::text FROM pg_stats WHERE tablename = 'tickets' AND attname = 'status'
      check: rows
      hint:
        vi: "Lọc `pg_stats` bằng `tablename` và `attname`."
        en: "Filter `pg_stats` on `tablename` and `attname`."
    - task:
        vi: "Tỉ lệ dòng có `closed_at` là NULL là bao nhiêu? Trả về `null_frac` của cột đó."
        en: "What share of rows have a NULL `closed_at`? Return that column's `null_frac`."
      solution: SELECT null_frac FROM pg_stats WHERE tablename = 'tickets' AND attname = 'closed_at'
      check: rows
      hint:
        vi: "Cùng view `pg_stats`, cột `null_frac`."
        en: "Same `pg_stats` view, column `null_frac`."
predict:
  sql: SELECT * FROM tickets WHERE status = 'closed'
  expect: { node: Seq Scan, table: tickets, rows: 3000 }
  q:
    vi: "Bảng có 30 000 phiếu, `ANALYZE` vừa chạy. `EXPLAIN` của câu này sẽ ước lượng bao nhiêu dòng (`rows=`)?"
    en: "The table holds 30,000 tickets and `ANALYZE` has just run. How many rows (`rows=`) will `EXPLAIN` estimate for this query?"
  options:
    - { vi: "10000: chia đều cho 3 giá trị", en: "10000: split evenly over 3 values" }
    - { vi: "3000: tần suất của 'closed' trong danh sách giá trị phổ biến nhân với số dòng", en: "3000: the frequency of 'closed' in the most-common-values list times the row count" }
    - { vi: "150: mặc định 0,5% cho mọi điều kiện bằng", en: "150: a default 0.5% for any equality" }
    - { vi: "Không biết được nếu chưa chạy câu", en: "Unknowable without running the query" }
  answer: 1
  why:
    vi: "`ANALYZE` ghi `most_common_vals = {open,pending,closed}` và `most_common_freqs = {0.6,0.3,0.1}`. Với `status = 'closed'`, planner lấy 0.1 × 30 000 = 3000. Bảng chỉ 30 000 dòng nên `ANALYZE` đọc hết, thống kê đúng tuyệt đối; với bảng lớn nó lấy mẫu, nên ước lượng chỉ gần đúng."
    en: "`ANALYZE` recorded `most_common_vals = {open,pending,closed}` and `most_common_freqs = {0.6,0.3,0.1}`. For `status = 'closed'` the planner takes 0.1 x 30,000 = 3000. The table has only 30,000 rows, so `ANALYZE` read all of them and the statistics are exact; on a large table it samples, so estimates are only approximate."
---
## Ý chính

Planner không đếm dòng trước khi chọn kế hoạch. Nó đoán từ thống kê mà `ANALYZE` (hoặc autovacuum) ghi vào catalog. View `pg_stats` cho đọc thống kê đó, mỗi cột một dòng:

- `null_frac`: tỉ lệ NULL.
- `n_distinct`: số giá trị khác nhau; số âm nghĩa là tỉ lệ so với số dòng (`-1` = mọi giá trị khác nhau).
- `most_common_vals` / `most_common_freqs`: danh sách giá trị phổ biến (MCV) và tần suất.
- `histogram_bounds`: ranh giới chia các giá trị còn lại thành nhóm đều nhau, dùng cho điều kiện khoảng.
- `correlation`: thứ tự vật lý khớp thứ tự giá trị tới đâu (1 = khớp hoàn toàn), ảnh hưởng tới giá của Index Scan.

Mỗi cột giữ tối đa `default_statistics_target` (mặc định 100) mục MCV và nhóm histogram. Dữ liệu đổi nhiều sau lần `ANALYZE` cuối thì ước lượng lệch, kế hoạch có thể sai.

## Ví dụ

```sql
SELECT attname, n_distinct, null_frac FROM pg_stats WHERE tablename = 'tickets' ORDER BY attname;
```

## Thực hành

Đoán `rows=` trước, xem kế hoạch thật, rồi đọc chính những con số planner đã dùng.

# EN

## Key idea

The planner does not count rows before choosing a plan. It guesses from statistics that `ANALYZE` (or autovacuum) stores in the catalog. The `pg_stats` view lets you read them, one row per column:

- `null_frac`: the share of NULLs.
- `n_distinct`: the number of distinct values; a negative number is a fraction of the row count (`-1` = every value distinct).
- `most_common_vals` / `most_common_freqs`: the most common values (MCV) and their frequencies.
- `histogram_bounds`: boundaries splitting the remaining values into equal groups, used for range conditions.
- `correlation`: how well physical order matches value order (1 = perfectly), which affects the cost of an Index Scan.

Each column keeps at most `default_statistics_target` (100 by default) MCV entries and histogram buckets. If data changed a lot since the last `ANALYZE`, estimates drift and plans can go wrong.

## Example

```sql
SELECT attname, n_distinct, null_frac FROM pg_stats WHERE tablename = 'tickets' ORDER BY attname;
```

## Practice

Guess `rows=` first, see the real plan, then read the very numbers the planner used.
