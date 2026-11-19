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
quiz:
  - q: { vi: "Câu A chạy 2 giây mỗi lần, 10 lần một ngày. Câu B chạy 5 ms mỗi lần, 2 triệu lần một ngày. Tối ưu câu nào trước để giảm tải server?", en: "Query A takes 2 seconds per run, 10 runs a day. Query B takes 5 ms per run, 2 million runs a day. Which do you optimise first to cut server load?" }
    options:
      - { vi: "A, vì nó chậm nhất", en: "A, because it is the slowest" }
      - { vi: "B: tổng 10 000 giây/ngày so với 20 giây; xếp theo `total_exec_time`, không theo `mean_exec_time`", en: "B: 10,000 seconds a day against 20; rank by `total_exec_time`, not by `mean_exec_time`" }
    answer: 1
    why: { vi: "`pg_stat_statements` có `total_exec_time`, `mean_exec_time`, `calls`, `shared_blks_hit/read`… Tải server là tổng; câu chậm lẻ tẻ thì quan trọng cho trải nghiệm người dùng, nhưng là câu hỏi khác.", en: "`pg_stat_statements` has `total_exec_time`, `mean_exec_time`, `calls`, `shared_blks_hit/read`… Server load is the total; an occasional slow query matters for user experience, but that is a different question." }
  - q: { vi: "`pg_stat_user_tables` cho thấy một bảng 50 triệu dòng có `seq_scan` tăng hàng nghìn mỗi giờ. Bước tiếp theo?", en: "`pg_stat_user_tables` shows a 50-million-row table whose `seq_scan` grows by thousands an hour. Next step?" }
    options:
      - { vi: "Tìm trong `pg_stat_statements` các câu chạm bảng đó, xem `EXPLAIN` của câu có tổng thời gian lớn nhất, rồi mới quyết định index", en: "Find the statements touching that table in `pg_stat_statements`, look at the `EXPLAIN` of the one with the largest total time, then decide on an index" }
      - { vi: "Tạo index trên mọi cột", en: "Index every column" }
      - { vi: "Tăng `shared_buffers`", en: "Raise `shared_buffers`" }
    answer: 0
    why: { vi: "Số đếm cho biết có vấn đề; `pg_stat_statements` cho biết câu nào; `EXPLAIN` cho biết vì sao. Index mọi cột làm chậm ghi và phần lớn không được dùng.", en: "The counters say there is a problem; `pg_stat_statements` says which query; `EXPLAIN` says why. Indexing every column slows writes and most of those indexes go unused." }
---

## Ý chính

- `pg_stat_statements` gom thống kê theo câu đã chuẩn hóa: hằng số được thay bằng `$1`, `$2`…, nên mọi lần tra theo id gộp thành một dòng. Cột chính: `calls`, `rows`, `total_exec_time`, `mean_exec_time`, `shared_blks_hit`, `shared_blks_read`, `temp_blks_written`.
- Trên server thật, extension cần `shared_preload_libraries = 'pg_stat_statements'` và khởi động lại; trên PGlite đo được là ghi nhận ngay sau `CREATE EXTENSION`.
- Tìm câu đáng tối ưu: sắp theo `total_exec_time` (tải), xem `mean_exec_time` (trải nghiệm), `temp_blks_written` (tràn `work_mem`), tỉ lệ `shared_blks_read` (đọc đĩa).
- `pg_stat_user_tables`: `seq_scan`, `idx_scan`, `n_tup_ins/upd/del`, `n_dead_tup`, lần (auto)vacuum/analyze cuối. Số liệu được ghi theo lô; trong lab gọi `pg_stat_force_next_flush()` để thấy ngay.
- `pg_stat_statements_reset()` xóa số liệu; hãy chụp lại trước khi reset để so trước/sau.

## Ví dụ

Kết quả thật trên PGlite:

```text
query                                                        calls  rows
SELECT n FROM hits WHERE id = $1                             3      3
SELECT count(*) FROM hits WHERE n = $1                       2      2
CREATE TABLE hits (id int PRIMARY KEY, n int NOT NULL)       1      0
INSERT INTO hits SELECT g, g % $1 FROM generate_series($2, $3) g   1   1000
```

## Thực hành

Đọc `pg_stat_statements` rồi `pg_stat_user_tables`. Kỹ năng chuyên gia: từ số liệu thống kê tìm ra câu tốn nhất cho server, rồi chuyển sang `EXPLAIN` để sửa đúng chỗ.

# EN

## Key idea

- `pg_stat_statements` aggregates statistics per normalised query: constants are replaced with `$1`, `$2`…, so every lookup by id collapses into one row. Main columns: `calls`, `rows`, `total_exec_time`, `mean_exec_time`, `shared_blks_hit`, `shared_blks_read`, `temp_blks_written`.
- On a real server the extension needs `shared_preload_libraries = 'pg_stat_statements'` and a restart; on PGlite it was measured recording right after `CREATE EXTENSION`.
- Finding queries worth optimising: sort by `total_exec_time` (load), look at `mean_exec_time` (user experience), `temp_blks_written` (spills past `work_mem`), the share of `shared_blks_read` (disk reads).
- `pg_stat_user_tables`: `seq_scan`, `idx_scan`, `n_tup_ins/upd/del`, `n_dead_tup`, last (auto)vacuum/analyze. The counters are flushed in batches; the lab calls `pg_stat_force_next_flush()` to see them at once.
- `pg_stat_statements_reset()` clears the statistics; take a snapshot before resetting so you can compare before and after.

## Example

Real output from PGlite:

```text
query                                                        calls  rows
SELECT n FROM hits WHERE id = $1                             3      3
SELECT count(*) FROM hits WHERE n = $1                       2      2
CREATE TABLE hits (id int PRIMARY KEY, n int NOT NULL)       1      0
INSERT INTO hits SELECT g, g % $1 FROM generate_series($2, $3) g   1   1000
```

## Practice

Read `pg_stat_statements`, then `pg_stat_user_tables`. Expert skill: go from the statistics to the query that costs the server most, then switch to `EXPLAIN` to fix the right thing.
