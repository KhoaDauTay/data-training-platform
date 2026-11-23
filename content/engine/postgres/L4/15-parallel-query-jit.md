---
id: e-pg-l4-15
engine: postgres
level: L4
module: parallel-jit
title: "Truy vấn song song và JIT (và vì sao PGlite không có)"
title_en: "Parallel query and JIT (and why PGlite shows neither)"
kind: predict
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Đọc `Gather`/`Gather Merge` và nhận ra phần nào của kế hoạch được chạy song song", en: "Read `Gather`/`Gather Merge` and spot which part of a plan runs in parallel" }
  - { vi: "Kể các điều kiện làm Postgres không lập kế hoạch song song", en: "List the conditions under which Postgres does not build a parallel plan" }
  - { vi: "Biết JIT bật theo chi phí (`jit_above_cost`) và cần bản build có LLVM", en: "Know that JIT switches on by cost (`jit_above_cost`) and needs an LLVM build" }
requires: [e-pg-l4-01]
sources:
  - https://www.postgresql.org/docs/18/how-parallel-query-works.html
  - https://www.postgresql.org/docs/18/when-can-parallel-query-be-used.html
  - https://www.postgresql.org/docs/18/parallel-plans.html
  - https://www.postgresql.org/docs/18/jit-decision.html
  - https://www.postgresql.org/docs/18/runtime-config-resource.html
viz: pg-plan-tree
lab:
  setup: |
    DROP TABLE IF EXISTS big CASCADE;
    CREATE TABLE big (id int, v int);
    INSERT INTO big SELECT g, (g * 7919) % 100000 FROM generate_series(1, 30000) g;
    ANALYZE big;
  steps:
    - task: { vi: "Đọc ba thiết lập trong `pg_settings`: `max_parallel_workers_per_gather`, `max_worker_processes`, `jit` (tên và giá trị, sắp theo tên).", en: "Read three settings from `pg_settings`: `max_parallel_workers_per_gather`, `max_worker_processes`, `jit` (name and value, ordered by name)." }
      solution: "SELECT name, setting FROM pg_settings WHERE name IN ('max_parallel_workers_per_gather', 'max_worker_processes', 'jit') ORDER BY name"
      check: rows
      ordered: true
      hint: { vi: "Lọc `pg_settings` theo cột `name`.", en: "Filter `pg_settings` on the `name` column." }
    - task: { vi: "Kiểm tra bản PostgreSQL này có JIT không (một cột).", en: "Check whether this PostgreSQL build has JIT available (one column)." }
      solution: "SELECT pg_jit_available()"
      check: rows
      hint: { vi: "Có một hàm trả về boolean cho đúng câu hỏi này.", en: "One function returns a boolean for exactly this question." }
predict:
  sql: "SELECT count(*) FROM big"
  q: { vi: "Trên một server PostgreSQL 18 bình thường (mặc định 2 worker mỗi Gather), bảng lớn sẽ có `Gather` → `Partial Aggregate` → `Parallel Seq Scan`. Trên PGlite thì kế hoạch là gì?", en: "On a normal PostgreSQL 18 server (default 2 workers per Gather), a big table gets `Gather` → `Partial Aggregate` → `Parallel Seq Scan`. What is the plan on PGlite?" }
  options:
    - { vi: "Giống server: có `Gather`", en: "Same as the server: it has `Gather`" }
    - { vi: "`Aggregate` → `Seq Scan`, không có `Gather`", en: "`Aggregate` → `Seq Scan`, no `Gather`" }
    - { vi: "Lỗi vì không có worker", en: "An error because there are no workers" }
  answer: 1
  trap: 0
  why: { vi: "Nghe hợp lý vì PGlite chạy cùng mã PostgreSQL 18, nhưng nó không có worker để song song. PGlite là một backend đơn (`max_parallel_workers_per_gather` = 0 và không có tiến trình nền). Docs chính thức: giá trị này bằng 0 hoặc chạy ở chế độ một người dùng thì không có kế hoạch song song.", en: "It sounds right because PGlite runs the same PostgreSQL 18 code, but it has no workers to run in parallel. PGlite is a single backend (`max_parallel_workers_per_gather` = 0 and no background workers). The docs: with that setting at zero, or in single-user mode, no parallel plan is made." }
  expect: { node: Seq Scan, table: big }
quiz:
  - q: { vi: "Câu nào KHÔNG bao giờ dùng kế hoạch song song?", en: "Which query never uses a parallel plan?" }
    options:
      - { vi: "`SELECT count(*) FROM big WHERE v > 10`", en: "`SELECT count(*) FROM big WHERE v > 10`" }
      - { vi: "`UPDATE big SET v = v + 1 WHERE id < 100`", en: "`UPDATE big SET v = v + 1 WHERE id < 100`" }
      - { vi: "`SELECT v, count(*) FROM big GROUP BY v`", en: "`SELECT v, count(*) FROM big GROUP BY v`" }
    answer: 1
    trap: 2
    why: { vi: "Nghe hợp lý vì `GROUP BY` có vẻ khó chia cho nhiều worker, nhưng Postgres gom từng phần rồi gộp lại, nên nó vẫn song song được. Câu ghi dữ liệu hoặc row lock (ở mức trên cùng hay trong CTE) không được song song; ngoại lệ là phần SELECT của `CREATE TABLE … AS`, `SELECT INTO`, `CREATE/REFRESH MATERIALIZED VIEW`. Hàm do người dùng viết mặc định `PARALLEL UNSAFE` cũng chặn song song.", en: "It sounds right because `GROUP BY` seems hard to split across workers, but Postgres aggregates in parts and combines them, so it can still run in parallel. A query that writes data or locks rows (at the top level or in a CTE) is never parallel; the exceptions are the SELECT part of `CREATE TABLE … AS`, `SELECT INTO`, `CREATE/REFRESH MATERIALIZED VIEW`. User-defined functions are `PARALLEL UNSAFE` by default, which also blocks it." }
  - q: { vi: "JIT được dùng cho một câu khi nào?", en: "When is JIT used for a query?" }
    options:
      - { vi: "Luôn luôn khi `jit = on`", en: "Always when `jit = on`" }
      - { vi: "Khi tổng chi phí ước lượng vượt `jit_above_cost` (mặc định 100.000); inline và tối ưu thêm từ 500.000", en: "When the estimated total cost exceeds `jit_above_cost` (default 100,000); inlining and extra optimisation from 500,000" }
      - { vi: "Khi câu chạy lâu hơn 1 giây", en: "When the query runs longer than 1 second" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì `jit = on` là mặc định, nhưng bật chỉ cho phép dùng JIT, không bắt buộc. Quyết định JIT dựa trên chi phí planner, không dựa trên thời gian. Câu OLTP ngắn mà ước lượng sai có thể tốn thời gian biên dịch JIT nhiều hơn thời gian chạy; khi đó `EXPLAIN ANALYZE` hiện phần `JIT:` với thời gian biên dịch.", en: "It sounds right because `jit = on` is the default, but on only allows JIT, it does not force it. The JIT decision is based on planner cost, not time. A short OLTP query with a bad estimate can spend more time compiling than running; `EXPLAIN ANALYZE` then shows a `JIT:` section with the compile time." }
---

## Mở bài

Cùng một câu `SELECT count(*)` trên bảng lớn: trên server của công ty, `EXPLAIN` có `Gather` và hai worker; trong trình duyệt thì không. Cùng mã PostgreSQL 18, vì sao kế hoạch khác nhau?

## Ý chính

Truy vấn song song: planner thêm một nút `Gather` (hoặc `Gather Merge` khi cần giữ thứ tự). Mọi thứ bên dưới nút đó chạy trong nhiều tiến trình worker và cả tiến trình chính (leader). Nút "Parallel" như `Parallel Seq Scan` chia các trang cho các worker; `Partial Aggregate` ở mỗi worker cộng với `Finalize Aggregate` ở trên gộp kết quả theo hai tầng. Mặc định trên server: `max_parallel_workers_per_gather` 2, `max_parallel_workers` 8, `max_worker_processes` 8.

Planner không lập kế hoạch song song khi `max_parallel_workers_per_gather` bằng 0, khi chạy ở chế độ một người dùng, khi câu ghi dữ liệu hoặc khóa dòng, khi câu có thể bị tạm dừng giữa chừng (cursor, vòng `FOR` trong PL/pgSQL), khi câu gọi hàm `PARALLEL UNSAFE`, hoặc khi nó đã chạy bên trong một câu song song khác. Kể cả có kế hoạch song song, lúc chạy có thể không còn worker rảnh.

Nhiều người nghĩ `jit = on` nghĩa là mọi câu đều được biên dịch. Thật ra JIT (biên dịch biểu thức và việc tách tuple bằng LLVM) chỉ dùng khi tổng chi phí ước lượng vượt `jit_above_cost` (100.000); inline và tối ưu thêm từ 500.000. Nó còn cần một bản build có LLVM: `pg_jit_available()` cho biết điều đó.

PGlite chạy cùng mã PostgreSQL 18 nhưng là một backend đơn, không có tiến trình nền, và bản build không có LLVM.

## Ví dụ

Hình dạng mà mục "Parallel Aggregation" của tài liệu chính thức mô tả, áp vào bảng `big` trên một server có worker (không chạy được trong trình duyệt): gộp hai tầng.

```text
Finalize Aggregate
  ->  Gather
        Workers Planned: 2
        ->  Partial Aggregate
              ->  Parallel Seq Scan on big
```

## Thực hành

Đọc ba thiết lập, kiểm tra JIT, rồi đoán kế hoạch của câu đếm trên PGlite. Sau đó là hai câu hỏi về khi nào song song và khi nào JIT bật. Song song và JIT thật cần một server PostgreSQL thật.

## Tóm tắt

- `Gather` đánh dấu chỗ bắt đầu phần song song; các nút Parallel bên dưới chia trang cho worker.
- Không song song khi số worker cho phép bằng 0, khi câu ghi hoặc khóa dòng, hoặc khi gọi hàm `PARALLEL UNSAFE`.
- JIT bật theo chi phí (`jit_above_cost`), không theo thời gian, và cần bản build có LLVM.
- PGlite là backend đơn: không có kế hoạch song song, `pg_jit_available()` trả `false`.

# EN

## Opening

The same `SELECT count(*)` on a big table: on the company server, `EXPLAIN` shows `Gather` and two workers; in the browser it does not. Same PostgreSQL 18 code, so why do the plans differ?

## Key idea

Parallel query: the planner adds a `Gather` node (or `Gather Merge` when order must be kept). Everything below that node runs in several worker processes and in the main (leader) process too. "Parallel" nodes such as `Parallel Seq Scan` split the pages among the workers; a `Partial Aggregate` in each worker plus a `Finalize Aggregate` on top combine the result in two stages. Server defaults: `max_parallel_workers_per_gather` 2, `max_parallel_workers` 8, `max_worker_processes` 8.

The planner makes no parallel plan when `max_parallel_workers_per_gather` is 0, in single-user mode, when the query writes data or locks rows, when the query can be suspended halfway (a cursor, a PL/pgSQL `FOR` loop), when it calls a `PARALLEL UNSAFE` function, or when it already runs inside another parallel query. Even with a parallel plan, no worker may be free at run time.

Many people think `jit = on` means every query gets compiled. In fact JIT (compiling expressions and tuple deforming with LLVM) is only used when the estimated total cost exceeds `jit_above_cost` (100,000); inlining and extra optimisation start at 500,000. It also needs a build with LLVM: `pg_jit_available()` tells you.

PGlite runs the same PostgreSQL 18 code but as a single backend, with no background processes, and its build has no LLVM.

## Example

The shape the "Parallel Aggregation" section of the official docs describes, applied to table `big` on a server with workers (not runnable in the browser): two-stage aggregation.

```text
Finalize Aggregate
  ->  Gather
        Workers Planned: 2
        ->  Partial Aggregate
              ->  Parallel Seq Scan on big
```

## Practice

Read three settings, check JIT, then predict the plan of the count on PGlite. Then two questions on when a query goes parallel and when JIT kicks in. Real parallel query and JIT need a real PostgreSQL server.

## Recap

- `Gather` marks where the parallel part starts; the Parallel nodes below it split pages among workers.
- No parallel plan when the allowed workers are 0, when the query writes or locks rows, or when it calls a `PARALLEL UNSAFE` function.
- JIT switches on by cost (`jit_above_cost`), not by time, and needs a build with LLVM.
- PGlite is a single backend: no parallel plan, and `pg_jit_available()` returns `false`.
