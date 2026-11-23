---
id: e-pg-l5-11
engine: postgres
level: L5
module: observe-tune
title: "Tìm câu tốn nhất: pg_stat_statements và pg_stat_*"
title_en: "Finding the costliest queries: pg_stat_statements and pg_stat_*"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Đọc `pg_stat_statements`: câu đã chuẩn hóa (hằng thành `$1`), số lần gọi, số dòng", en: "Read `pg_stat_statements`: normalised query text (constants become `$1`), calls, rows" }
  - { vi: "Đọc `pg_stat_user_tables` để thấy bảng nào bị quét tuần tự nhiều", en: "Read `pg_stat_user_tables` to see which tables get many sequential scans" }
  - { vi: "Xếp hạng câu theo tổng thời gian thay vì theo một lần chạy chậm", en: "Rank queries by total time instead of by one slow run" }
requires: []
sources:
  - https://www.postgresql.org/docs/18/pgstatstatements.html
  - https://www.postgresql.org/docs/18/monitoring-stats.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
    DROP TABLE IF EXISTS hits CASCADE;
    SELECT pg_stat_statements_reset();
    CREATE TABLE hits (id int PRIMARY KEY, n int NOT NULL);
    INSERT INTO hits SELECT g, g % 100 FROM generate_series(1, 1000) g;
    SELECT n FROM hits WHERE id = 1;
    SELECT n FROM hits WHERE id = 2;
    SELECT n FROM hits WHERE id = 3;
    SELECT count(*) FROM hits WHERE n = 7;
    SELECT count(*) FROM hits WHERE n = 8;
    SELECT pg_stat_force_next_flush();
  steps:
    - task: { vi: "Trong `pg_stat_statements`, liệt kê các câu có nhắc tới bảng `hits`: câu (đã chuẩn hóa), số lần gọi, số dòng. Sắp theo số lần gọi giảm dần rồi theo câu.", en: "In `pg_stat_statements`, list the statements that mention table `hits`: query (normalised), calls, rows. Order by calls descending, then by query." }
      solution: "SELECT query, calls, rows FROM pg_stat_statements WHERE query LIKE '%hits%' ORDER BY calls DESC, query"
      check: rows
      ordered: true
      hint: { vi: "Hằng số trong câu được thay bằng `$1`, `$2`…, nên ba câu tra theo id gộp thành một dòng.", en: "Constants are replaced with `$1`, `$2`…, so the three lookups by id collapse into one row." }
    - task: { vi: "Đọc trong `pg_stat_user_tables` số lần quét tuần tự và quét index của `hits` (hai cột: seq_scan, idx_scan).", en: "Read from `pg_stat_user_tables` the number of sequential and index scans of `hits` (two columns: seq_scan, idx_scan)." }
      solution: "SELECT seq_scan, idx_scan FROM pg_stat_user_tables WHERE relname = 'hits'"
      check: rows
      hint: { vi: "Phần dựng dữ liệu đã gọi `pg_stat_force_next_flush()` để số liệu hiện ngay.", en: "The setup called `pg_stat_force_next_flush()` so the numbers show at once." }
    - task: { vi: "Trước khi tin ước lượng của planner trên `hits`, xem bảng đã được ghi và phân tích ra sao. Đọc trong `pg_stat_user_tables`: n_tup_ins, n_live_tup, n_dead_tup và cột analyzed (true nếu `last_analyze` hoặc `last_autoanalyze` có giá trị).", en: "Before trusting the planner's estimates on `hits`, see how the table was written and analysed. Read from `pg_stat_user_tables`: n_tup_ins, n_live_tup, n_dead_tup and a column analyzed (true if `last_analyze` or `last_autoanalyze` has a value)." }
      solution: "SELECT n_tup_ins, n_live_tup, n_dead_tup, last_analyze IS NOT NULL OR last_autoanalyze IS NOT NULL AS analyzed FROM pg_stat_user_tables WHERE relname = 'hits'"
      check: rows
      hint: { vi: "Hai cột thời gian là NULL khi chưa từng chạy; nối bằng `IS NOT NULL OR ...`.", en: "Both timestamp columns are NULL when it never ran; join them with `IS NOT NULL OR ...`." }
      fact:
        vi: "1000 dòng thêm, 1000 dòng sống, 0 dòng chết, và chưa từng ANALYZE: planner đang đoán bằng giá trị mặc định. PGlite không có autovacuum nền; trên server thật autoanalyze thường đã chạy sau lần nạp này."
        en: "1000 rows inserted, 1000 live, 0 dead, and never analysed: the planner is guessing with default values. PGlite has no background autovacuum; on a real server autoanalyze would usually have run after this load."
        probe: "SELECT n_tup_ins, n_live_tup, n_dead_tup, last_analyze IS NOT NULL OR last_autoanalyze IS NOT NULL FROM pg_stat_user_tables WHERE relname = 'hits'"
        expect: [[1000, 1000, 0, false]]
quiz:
  - q: { vi: "Câu A chạy 2 giây mỗi lần, 10 lần một ngày. Câu B chạy 5 ms mỗi lần, 2 triệu lần một ngày. Tối ưu câu nào trước để giảm tải server?", en: "Query A takes 2 seconds per run, 10 runs a day. Query B takes 5 ms per run, 2 million runs a day. Which do you optimise first to cut server load?" }
    options:
      - { vi: "A, vì nó chậm nhất", en: "A, because it is the slowest" }
      - { vi: "B: tổng 10.000 giây/ngày so với 20 giây; xếp theo `total_exec_time`, không theo `mean_exec_time`", en: "B: 10,000 seconds a day against 20; rank by `total_exec_time`, not by `mean_exec_time`" }
    answer: 1
    trap: 0
    why: { vi: "A hấp dẫn vì 2 giây mỗi lần là thứ đập vào mắt, nhưng B chạy 2 triệu lần. `pg_stat_statements` có `total_exec_time`, `mean_exec_time`, `calls`, `shared_blks_hit/read`… Tải server là tổng; câu chậm lẻ tẻ thì quan trọng cho trải nghiệm người dùng, nhưng là câu hỏi khác.", en: "A is tempting because 2 seconds per run is what catches the eye, but B runs 2 million times. `pg_stat_statements` has `total_exec_time`, `mean_exec_time`, `calls`, `shared_blks_hit/read`… Server load is the total; an occasional slow query matters for user experience, but that is a different question." }
  - q: { vi: "`pg_stat_user_tables` cho thấy một bảng 50 triệu dòng có `seq_scan` tăng hàng nghìn mỗi giờ. Bước tiếp theo?", en: "`pg_stat_user_tables` shows a 50-million-row table whose `seq_scan` grows by thousands an hour. Next step?" }
    options:
      - { vi: "Tìm trong `pg_stat_statements` các câu chạm bảng đó, xem `EXPLAIN` của câu có tổng thời gian lớn nhất, rồi mới quyết định index", en: "Find the statements touching that table in `pg_stat_statements`, look at the `EXPLAIN` of the one with the largest total time, then decide on an index" }
      - { vi: "Tạo index trên mọi cột", en: "Index every column" }
      - { vi: "Tăng `shared_buffers`", en: "Raise `shared_buffers`" }
    answer: 0
    trap: 1
    why: { vi: "Tạo index trên mọi cột nghe như cách nhanh nhất để hết Seq Scan, nhưng bạn chưa biết câu nào đang quét. Số đếm cho biết có vấn đề; `pg_stat_statements` cho biết câu nào; `EXPLAIN` cho biết vì sao. Index mọi cột làm chậm ghi và phần lớn không được dùng.", en: "Indexing every column sounds like the fastest way to end the Seq Scans, but you do not yet know which query is scanning. The counters say there is a problem; `pg_stat_statements` says which query; `EXPLAIN` says why. Indexing every column slows writes and most of those indexes go unused." }
---
## Mở bài

CPU của server ở mức 90% cả buổi chiều, nhưng không câu nào trong log chậm quá một giây. Câu nào đang ăn tài nguyên, khi không có câu nào trông chậm?

## Ý chính

`pg_stat_statements` gom thống kê theo câu đã chuẩn hóa: hằng số được thay bằng `$1`, `$2`…, nên mọi lần tra theo id gộp thành một dòng, với `calls` (số lần gọi), `rows`, `total_exec_time`, `mean_exec_time`, `shared_blks_hit`, `shared_blks_read`, `temp_blks_written`. Trên server thật extension cần `shared_preload_libraries = 'pg_stat_statements'` và khởi động lại; trên PGlite nó ghi nhận ngay sau `CREATE EXTENSION`.

Nhiều người nghĩ câu cần tối ưu là câu chậm nhất. Thật ra tải của server là tổng: một câu 5 ms chạy hai triệu lần tốn hơn một câu 2 giây chạy mười lần. Sắp theo `total_exec_time` để tìm tải, xem `mean_exec_time` cho trải nghiệm người dùng, `temp_blks_written` cho các lần tràn `work_mem`, và tỉ lệ `shared_blks_read` cho việc đọc đĩa.

`pg_stat_user_tables` đếm theo bảng: `seq_scan`, `idx_scan`, `n_tup_ins/upd/del`, `n_live_tup`, `n_dead_tup`, lần (auto)vacuum và (auto)analyze cuối. Bộ đếm được ghi theo lô; trong lab, `pg_stat_force_next_flush()` làm số liệu hiện ngay. `pg_stat_statements_reset()` xóa thống kê, nên hãy chụp lại số liệu trước khi reset để so trước và sau.

## Cú pháp

```sql
CREATE EXTENSION [ IF NOT EXISTS ] pg_stat_statements;
SELECT query, calls, rows, total_exec_time, mean_exec_time
FROM pg_stat_statements
[ WHERE ... ] ORDER BY total_exec_time DESC [ LIMIT n ];
SELECT seq_scan, idx_scan, n_live_tup, n_dead_tup
FROM pg_stat_user_tables WHERE relname = 'table_name';
SELECT pg_stat_statements_reset();
```

- `query`: câu đã chuẩn hóa, hằng số thành `$1`, `$2`…
- `total_exec_time`, `mean_exec_time`: tính bằng mili giây.
- `pg_read_all_stats`: vai trò có sẵn cho phép xem chữ của câu do vai trò khác chạy.

## Ví dụ

Thêm hai lần tra theo id, rồi đọc dòng của câu đã chuẩn hóa:

```sql
SELECT n FROM hits WHERE id = 10;
SELECT n FROM hits WHERE id = 11;
SELECT query, calls, rows
FROM pg_stat_statements
WHERE query = 'SELECT n FROM hits WHERE id = $1';
```

Năm lần tra với năm hằng số khác nhau vẫn chỉ là một dòng, `calls` = 5.

Thêm index trên `n` rồi xem bộ đếm theo bảng:

```sql
CREATE INDEX hits_n_idx ON hits (n);
SELECT count(*) FROM hits WHERE n = 9;
SELECT pg_stat_force_next_flush();
SELECT seq_scan, idx_scan FROM pg_stat_user_tables WHERE relname = 'hits';
```

Câu đếm theo `n` giờ đi qua index, nên `idx_scan` tăng thêm.

Ba câu chạm `hits` tốn nhiều thời gian nhất tính tổng:

```sql
SELECT query, calls, round(total_exec_time::numeric, 3) AS total_ms, round(mean_exec_time::numeric, 3) AS mean_ms
FROM pg_stat_statements
WHERE query LIKE '%hits%'
ORDER BY total_exec_time DESC
LIMIT 3;
```

Số mili giây và thứ tự tùy máy. Trên lab nhỏ này các câu tạo và nạp bảng thường đứng đầu; trên server thật, đứng đầu thường là một câu ngắn chạy rất nhiều lần.

## Lỗi hay gặp

Dùng tên cột cũ trong bài viết trên mạng:

```sql
-- ERROR 42703: column "total_time" does not exist
SELECT query, total_time FROM pg_stat_statements;
```

Từ PostgreSQL 13, cột đã tách thành `total_plan_time` và `total_exec_time`. Đọc docs đúng phiên bản trước khi chép câu giám sát.

Tìm câu bằng hằng số đã chạy:

```sql
-- WRONG: the stored text has $1, not the constant
SELECT query, calls FROM pg_stat_statements WHERE query LIKE '%WHERE id = 2%';
```

```sql
-- FIX: search the normalised text
SELECT query, calls FROM pg_stat_statements WHERE query LIKE '%WHERE id = $1%';
```

Câu sai không ra dòng nào. Hằng số không được lưu, nên hãy tìm theo khung câu với `$1`.

Xem thống kê bằng một vai trò giám sát chưa đủ quyền:

```sql
-- WRONG: other roles' query text is hidden
CREATE ROLE monitor NOLOGIN;
SET ROLE monitor;
SELECT query, calls FROM pg_stat_statements WHERE calls = 5;
RESET ROLE;
```

```sql
-- FIX: grant the built-in role pg_read_all_stats
GRANT pg_read_all_stats TO monitor;
SET ROLE monitor;
SELECT query, calls FROM pg_stat_statements WHERE calls = 5;
RESET ROLE;
```

Câu sai vẫn ra số `calls` nhưng chữ của câu là `<insufficient privilege>`. Cấp `pg_read_all_stats` thay vì cho tài khoản giám sát quyền superuser.

## Thực hành

Ba bước: đọc `pg_stat_statements` cho các câu chạm `hits`, đọc số lần quét của bảng, rồi xem bảng đã được ghi và phân tích ra sao. Sau đó là hai câu hỏi.

## Tóm tắt

- `pg_stat_statements` gộp câu theo khung đã chuẩn hóa; hằng số thành `$1`.
- Tối ưu theo `total_exec_time` (tải) trước, `mean_exec_time` (trải nghiệm) sau.
- `pg_stat_user_tables` cho biết bảng bị quét tuần tự hay qua index, và lần analyze cuối.
- Cho vai trò giám sát `pg_read_all_stats`, không cho superuser.

# EN

## Opening

The server's CPU sits at 90% all afternoon, yet no query in the log takes over a second. Which query is eating the resources, when none of them looks slow?

## Key idea

`pg_stat_statements` aggregates statistics per normalised query: constants are replaced with `$1`, `$2`…, so every lookup by id collapses into one row, with `calls`, `rows`, `total_exec_time`, `mean_exec_time`, `shared_blks_hit`, `shared_blks_read`, `temp_blks_written`. On a real server the extension needs `shared_preload_libraries = 'pg_stat_statements'` and a restart; on PGlite it records right after `CREATE EXTENSION`.

Many people think the query to optimise is the slowest one. In fact server load is a total: a 5 ms query run two million times costs more than a 2 second query run ten times. Sort by `total_exec_time` to find the load, look at `mean_exec_time` for user experience, `temp_blks_written` for spills past `work_mem`, and the share of `shared_blks_read` for disk reads.

`pg_stat_user_tables` counts per table: `seq_scan`, `idx_scan`, `n_tup_ins/upd/del`, `n_live_tup`, `n_dead_tup`, the last (auto)vacuum and (auto)analyze. The counters are flushed in batches; in the lab, `pg_stat_force_next_flush()` makes them show at once. `pg_stat_statements_reset()` clears the statistics, so take a snapshot before resetting to compare before and after.

## Syntax

```sql
CREATE EXTENSION [ IF NOT EXISTS ] pg_stat_statements;
SELECT query, calls, rows, total_exec_time, mean_exec_time
FROM pg_stat_statements
[ WHERE ... ] ORDER BY total_exec_time DESC [ LIMIT n ];
SELECT seq_scan, idx_scan, n_live_tup, n_dead_tup
FROM pg_stat_user_tables WHERE relname = 'table_name';
SELECT pg_stat_statements_reset();
```

- `query`: the normalised statement, constants turned into `$1`, `$2`…
- `total_exec_time`, `mean_exec_time`: in milliseconds.
- `pg_read_all_stats`: a built-in role that may see the text of other roles' queries.

## Example

Two more lookups by id, then read the row of the normalised query:

```sql
SELECT n FROM hits WHERE id = 10;
SELECT n FROM hits WHERE id = 11;
SELECT query, calls, rows
FROM pg_stat_statements
WHERE query = 'SELECT n FROM hits WHERE id = $1';
```

Five lookups with five different constants are still one row, `calls` = 5.

Add an index on `n`, then look at the table counters:

```sql
CREATE INDEX hits_n_idx ON hits (n);
SELECT count(*) FROM hits WHERE n = 9;
SELECT pg_stat_force_next_flush();
SELECT seq_scan, idx_scan FROM pg_stat_user_tables WHERE relname = 'hits';
```

The count by `n` now goes through the index, so `idx_scan` goes up.

The three queries touching `hits` with the largest total time:

```sql
SELECT query, calls, round(total_exec_time::numeric, 3) AS total_ms, round(mean_exec_time::numeric, 3) AS mean_ms
FROM pg_stat_statements
WHERE query LIKE '%hits%'
ORDER BY total_exec_time DESC
LIMIT 3;
```

The milliseconds and the order depend on the machine. In this small lab the statements that create and load the table usually come first; on a real server the top one is often a short query run very many times.

## Common mistakes

Using an old column name from a blog post:

```sql
-- ERROR 42703: column "total_time" does not exist
SELECT query, total_time FROM pg_stat_statements;
```

Since PostgreSQL 13 the column is split into `total_plan_time` and `total_exec_time`. Read the docs for your version before copying a monitoring query.

Searching for a query by the constant it ran with:

```sql
-- WRONG: the stored text has $1, not the constant
SELECT query, calls FROM pg_stat_statements WHERE query LIKE '%WHERE id = 2%';
```

```sql
-- FIX: search the normalised text
SELECT query, calls FROM pg_stat_statements WHERE query LIKE '%WHERE id = $1%';
```

The wrong query returns no row. Constants are not stored, so search for the shape of the query with `$1`.

Reading the statistics with a monitoring role that lacks the privilege:

```sql
-- WRONG: other roles' query text is hidden
CREATE ROLE monitor NOLOGIN;
SET ROLE monitor;
SELECT query, calls FROM pg_stat_statements WHERE calls = 5;
RESET ROLE;
```

```sql
-- FIX: grant the built-in role pg_read_all_stats
GRANT pg_read_all_stats TO monitor;
SET ROLE monitor;
SELECT query, calls FROM pg_stat_statements WHERE calls = 5;
RESET ROLE;
```

The wrong query still shows `calls` but the query text is `<insufficient privilege>`. Grant `pg_read_all_stats` instead of making the monitoring account a superuser.

## Practice

Three steps: read `pg_stat_statements` for the queries touching `hits`, read the table's scan counts, then see how the table was written and analysed. Then two questions.

## Recap

- `pg_stat_statements` groups queries by their normalised shape; constants become `$1`.
- Optimise by `total_exec_time` (load) first, `mean_exec_time` (user experience) second.
- `pg_stat_user_tables` shows whether a table is scanned sequentially or through an index, and when it was last analysed.
- Give monitoring roles `pg_read_all_stats`, not superuser.
