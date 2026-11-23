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
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Đọc `most_common_vals`, `most_common_freqs`, `null_frac` và `n_distinct` trong `pg_stats`.
    en: Read `most_common_vals`, `most_common_freqs`, `null_frac` and `n_distinct` in `pg_stats`.
  - vi: Tính lại con số `rows=` của `EXPLAIN` từ thống kê, để biết khi nào ước lượng đáng tin.
    en: Recompute the `rows=` figure of `EXPLAIN` from the statistics, so you know when an estimate can be trusted.
  - vi: Giải thích vì sao planner đoán 1 dòng cho một giá trị nó chưa từng thấy.
    en: Explain why the planner guesses 1 row for a value it has never seen.
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
    vi: "Bảng có 30.000 phiếu, `ANALYZE` vừa chạy. `EXPLAIN` của câu này sẽ ước lượng bao nhiêu dòng (`rows=`)?"
    en: "The table holds 30,000 tickets and `ANALYZE` has just run. What will `EXPLAIN` estimate for this query (`rows=`)?"
  options:
    - { vi: "10.000: chia đều cho 3 giá trị", en: "10,000: split evenly over 3 values" }
    - { vi: "3000: tần suất của 'closed' trong danh sách giá trị phổ biến nhân với số dòng", en: "3000: the frequency of 'closed' in the most-common-values list times the row count" }
    - { vi: "150: mặc định 0,5 % cho mọi điều kiện bằng", en: "150: a default 0.5% for any equality" }
    - { vi: "Không biết được nếu chưa chạy câu", en: "Unknowable without running the query" }
  answer: 1
  trap: 0
  why:
    vi: "Nghe hợp lý nếu bạn nghĩ planner chỉ biết có 3 giá trị rồi chia đều; nhưng `ANALYZE` ghi cả tần suất: `most_common_vals = {open,pending,closed}` và `most_common_freqs = {0.6,0.3,0.1}`. Với `status = 'closed'`, planner lấy 0,1 × 30.000 = 3000. Bảng chỉ 30.000 dòng nên `ANALYZE` đọc hết, thống kê đúng tuyệt đối; với bảng lớn nó lấy mẫu, nên ước lượng chỉ gần đúng."
    en: "It sounds right if you think the planner only knows there are 3 values and splits evenly, but `ANALYZE` also recorded frequencies: `most_common_vals = {open,pending,closed}` and `most_common_freqs = {0.6,0.3,0.1}`. For `status = 'closed'` the planner takes 0.1 x 30,000 = 3000. The table has only 30,000 rows, so `ANALYZE` read all of them and the statistics are exact; on a large table it samples, so estimates are only approximate."
quiz:
  - q:
      vi: "Cùng bảng đó, `EXPLAIN SELECT * FROM tickets WHERE status = 'archived'`. Không phiếu nào có trạng thái này. Planner ước lượng bao nhiêu dòng?"
      en: "Same table, `EXPLAIN SELECT * FROM tickets WHERE status = 'archived'`. No ticket has this status. How many rows does the planner estimate?"
    options:
      - { vi: "0: giá trị không có trong danh sách giá trị phổ biến, nên không có dòng nào", en: "0: the value is not in the most-common-values list, so there are no rows" }
      - { vi: "1: planner không bao giờ đoán 0, nó làm tròn lên ít nhất 1 dòng", en: "1: the planner never guesses 0, it rounds up to at least 1 row" }
      - { vi: "10.000: một phần ba bảng", en: "10,000: a third of the table" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì danh sách MCV đã phủ 100 % số dòng, nhưng thống kê chỉ là ảnh chụp lúc `ANALYZE` chạy: từ đó tới giờ có thể đã có dòng mới. Nếu planner đoán 0, mọi nút phía trên sẽ được định giá như không tốn gì, nên nó luôn giữ ít nhất 1 dòng. `EXPLAIN` in `rows=1`."
      en: "It sounds right because the MCV list already covers 100% of the rows, but statistics are only a snapshot from when `ANALYZE` ran: new rows may have arrived since. If the planner guessed 0, every node above would be priced as free, so it always keeps at least 1 row. `EXPLAIN` prints `rows=1`."
---
## Mở bài

Planner phải chọn giữa đọc cả bảng và đi qua index trước khi chạy câu, tức là trước khi biết câu sẽ trả bao nhiêu dòng. Vậy con số `rows=` trong `EXPLAIN` lấy từ đâu ra? Hãy đoán thử, rồi mở chính sổ tay của planner ra xem.

## Ý chính

Planner không đếm dòng trước khi chọn kế hoạch. Nó đoán từ thống kê mà `ANALYZE` (hoặc autovacuum) ghi vào catalog. View `pg_stats` cho đọc thống kê đó, mỗi cột một dòng:

- `null_frac`: tỉ lệ NULL.
- `n_distinct`: số giá trị khác nhau; số âm nghĩa là tỉ lệ so với số dòng (`-1` = mọi giá trị khác nhau, như khóa chính).
- `most_common_vals` / `most_common_freqs`: danh sách giá trị phổ biến (MCV) và tần suất.
- `histogram_bounds`: ranh giới chia các giá trị còn lại thành nhóm đều nhau, dùng cho điều kiện khoảng.
- `correlation`: thứ tự vật lý khớp thứ tự giá trị tới đâu (1 = khớp hoàn toàn), ảnh hưởng tới giá của Index Scan.

Với `col = x`, nếu `x` nằm trong MCV thì planner nhân tần suất của nó với số dòng của bảng. Nếu không, nó chia phần còn lại đều cho các giá trị không có trong danh sách. Với `col IS NULL`, nó dùng `null_frac`. Số dòng của bảng lấy từ `pg_class.reltuples`.

Mỗi cột giữ tối đa `default_statistics_target` (mặc định 100) mục MCV và nhóm histogram. Dữ liệu đổi nhiều sau lần `ANALYZE` cuối thì ước lượng lệch, kế hoạch có thể sai. Bảng vừa nạp mà chưa `ANALYZE` thì `pg_stats` trống, và planner dùng các hằng số mặc định.

Nhiều người nghĩ planner chia đều cho các giá trị nó biết. Thật ra với giá trị phổ biến, nó dùng đúng tần suất đo được, nên phân bố lệch vẫn được ước lượng chuẩn.

## Ví dụ

```sql
SELECT attname, n_distinct, null_frac FROM pg_stats WHERE tablename = 'tickets' ORDER BY attname;
```

`id` có `n_distinct = -1` (mọi giá trị khác nhau), `status` có 3 giá trị, và `closed_at` có `null_frac = 0.9`.

## Thực hành

Đoán `rows=` trước, xem kế hoạch thật, đọc chính những con số planner đã dùng, rồi trả lời thêm một câu về giá trị planner chưa từng thấy.

## Tóm tắt

- Planner đoán số dòng từ `pg_stats`, không đếm trước khi chạy.
- Giá trị trong MCV: tần suất nhân số dòng; `IS NULL`: `null_frac` nhân số dòng.
- Planner không bao giờ đoán 0 dòng; tối thiểu là 1.
- Dữ liệu đổi nhiều thì chạy `ANALYZE` để ước lượng theo kịp.

# EN

## Opening

The planner must choose between reading the whole table and going through an index before the query runs, that is, before it knows how many rows will come back. So where does the `rows=` figure in `EXPLAIN` come from? Make a guess, then open the planner's own notebook.

## Key idea

The planner does not count rows before choosing a plan. It guesses from statistics that `ANALYZE` (or autovacuum) stores in the catalog. The `pg_stats` view lets you read them, one row per column:

- `null_frac`: the share of NULLs.
- `n_distinct`: the number of distinct values; a negative number is a fraction of the row count (`-1` = every value distinct, like a primary key).
- `most_common_vals` / `most_common_freqs`: the most common values (MCV) and their frequencies.
- `histogram_bounds`: boundaries splitting the remaining values into equal groups, used for range conditions.
- `correlation`: how well physical order matches value order (1 = perfectly), which affects the cost of an Index Scan.

For `col = x`, if `x` is in the MCV list the planner multiplies its frequency by the table's row count. If not, it spreads the rest evenly over the values missing from the list. For `col IS NULL` it uses `null_frac`. The table's row count comes from `pg_class.reltuples`.

Each column keeps at most `default_statistics_target` (100 by default) MCV entries and histogram buckets. If data changed a lot since the last `ANALYZE`, estimates drift and plans can go wrong. A freshly loaded table that never had an `ANALYZE` has nothing in `pg_stats`, and the planner falls back to default constants.

Many people think the planner splits evenly over the values it knows. In fact for common values it uses the measured frequency, so a skewed distribution is still estimated well.

## Example

```sql
SELECT attname, n_distinct, null_frac FROM pg_stats WHERE tablename = 'tickets' ORDER BY attname;
```

`id` has `n_distinct = -1` (every value distinct), `status` has 3 values, and `closed_at` has `null_frac = 0.9`.

## Practice

Guess `rows=` first, see the real plan, read the very numbers the planner used, then answer one more question about a value the planner has never seen.

## Recap

- The planner guesses row counts from `pg_stats`; it does not count before running.
- A value in the MCV list: frequency times row count; `IS NULL`: `null_frac` times row count.
- The planner never guesses 0 rows; the minimum is 1.
- When data changes a lot, run `ANALYZE` so estimates keep up.
