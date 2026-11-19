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
objectives:
  - { vi: "Đọc `Gather`/`Gather Merge` và nhận ra phần nào của kế hoạch chạy song song", en: "Read `Gather`/`Gather Merge` and spot which part of a plan runs in parallel" }
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
  why: { vi: "PGlite là một backend đơn (`max_parallel_workers_per_gather` = 0 và không có tiến trình nền). Tài liệu: giá trị này bằng 0 hoặc chạy ở chế độ một người dùng thì không có kế hoạch song song.", en: "PGlite is a single backend (`max_parallel_workers_per_gather` = 0 and no background workers). The docs: with that setting at zero, or in single-user mode, no parallel plan is made." }
quiz:
  - q: { vi: "Câu nào KHÔNG bao giờ dùng kế hoạch song song?", en: "Which query never uses a parallel plan?" }
    options:
      - { vi: "`SELECT count(*) FROM big WHERE v > 10`", en: "`SELECT count(*) FROM big WHERE v > 10`" }
      - { vi: "`UPDATE big SET v = v + 1 WHERE id < 100`", en: "`UPDATE big SET v = v + 1 WHERE id < 100`" }
      - { vi: "`SELECT v, count(*) FROM big GROUP BY v`", en: "`SELECT v, count(*) FROM big GROUP BY v`" }
    answer: 1
    why: { vi: "Câu ghi dữ liệu hoặc khóa dòng (ở mức trên cùng hay trong CTE) không được song song; ngoại lệ là phần SELECT của `CREATE TABLE … AS`, `SELECT INTO`, `CREATE/REFRESH MATERIALIZED VIEW`. Hàm do người dùng viết mặc định `PARALLEL UNSAFE` cũng chặn song song.", en: "A query that writes data or locks rows (at the top level or in a CTE) is never parallel; the exceptions are the SELECT part of `CREATE TABLE … AS`, `SELECT INTO`, `CREATE/REFRESH MATERIALIZED VIEW`. User-defined functions are `PARALLEL UNSAFE` by default, which also blocks it." }
  - q: { vi: "JIT được dùng cho một câu khi nào?", en: "When is JIT used for a query?" }
    options:
      - { vi: "Luôn luôn khi `jit = on`", en: "Always when `jit = on`" }
      - { vi: "Khi tổng chi phí ước lượng vượt `jit_above_cost` (mặc định 100000); inline và tối ưu thêm từ 500000", en: "When the estimated total cost exceeds `jit_above_cost` (default 100000); inlining and extra optimisation from 500000" }
      - { vi: "Khi câu chạy lâu hơn 1 giây", en: "When the query runs longer than 1 second" }
    answer: 1
    why: { vi: "Quyết định JIT dựa trên chi phí planner, không dựa trên thời gian. Câu OLTP ngắn mà ước lượng sai có thể tốn thời gian biên dịch JIT nhiều hơn thời gian chạy; khi đó `EXPLAIN ANALYZE` hiện phần `JIT:` với thời gian biên dịch.", en: "The JIT decision is based on planner cost, not time. A short OLTP query with a bad estimate can spend more time compiling than running; `EXPLAIN ANALYZE` then shows a `JIT:` section with the compile time." }
---

## Ý chính

- Song song: planner thêm nút `Gather` (hoặc `Gather Merge` để giữ thứ tự). Mọi thứ dưới nó chạy trong nhiều tiến trình worker và cả tiến trình chính (leader). Nút "Parallel" (ví dụ `Parallel Seq Scan`) chia trang cho các worker; `Partial Aggregate` + `Finalize Aggregate` gộp hai tầng.
- Mặc định: `max_parallel_workers_per_gather` 2, `max_parallel_workers` 8, `max_worker_processes` 8.
- Không có kế hoạch song song khi: `max_parallel_workers_per_gather` = 0; chế độ một người dùng; câu ghi hoặc khóa dòng; câu có thể bị tạm dừng giữa chừng (cursor, vòng `FOR` trong PL/pgSQL); dùng hàm `PARALLEL UNSAFE`; câu chạy bên trong một câu song song khác. Kể cả có kế hoạch, lúc chạy có thể không còn worker rảnh.
- JIT biên dịch biểu thức và việc tách tuple bằng LLVM. Cần bản build có LLVM. Quyết định theo chi phí: `jit_above_cost` 100000, `jit_inline_above_cost` và `jit_optimize_above_cost` 500000.

Giới hạn của PGlite (đo): một backend đơn, `max_parallel_workers_per_gather` = 0 và `max_worker_processes` = 0, đặt giá trị đầu lên 2 vẫn không ra `Gather`; `pg_jit_available()` = false dù `jit` = on. Hai chủ đề này cần server PostgreSQL thật để thực hành.

## Ví dụ

Trên PGlite (đo):

```text
EXPLAIN (COSTS OFF) SELECT count(*) FROM big;
Aggregate
  ->  Seq Scan on big
```

Hình dạng điển hình trên một server có worker (gộp hai tầng như mục "Parallel Aggregation" của tài liệu; không chạy ở đây):

```text
Finalize Aggregate
  ->  Gather
        Workers Planned: 2
        ->  Partial Aggregate
              ->  Parallel Seq Scan on big
```

## Thực hành

Đọc thiết lập, kiểm JIT, rồi đoán kế hoạch trên PGlite. Kỹ năng chuyên gia: biết khi nào một câu được song song, vì sao không, và khi nào nên tắt JIT cho tải OLTP.

# EN

## Key idea

- Parallel: the planner adds a `Gather` node (or `Gather Merge` to keep order). Everything below it runs in several worker processes and in the main (leader) process too. "Parallel" nodes (for example `Parallel Seq Scan`) split the pages among workers; `Partial Aggregate` + `Finalize Aggregate` combine in two stages.
- Defaults: `max_parallel_workers_per_gather` 2, `max_parallel_workers` 8, `max_worker_processes` 8.
- No parallel plan when: `max_parallel_workers_per_gather` = 0; single-user mode; the query writes or locks rows; the query can be suspended halfway (a cursor, a PL/pgSQL `FOR` loop); it uses a `PARALLEL UNSAFE` function; it runs inside another parallel query. Even with a parallel plan, no worker may be free at run time.
- JIT compiles expressions and tuple deforming with LLVM. It needs an LLVM build. The decision is by cost: `jit_above_cost` 100000, `jit_inline_above_cost` and `jit_optimize_above_cost` 500000.

PGlite limits (measured): a single backend, `max_parallel_workers_per_gather` = 0 and `max_worker_processes` = 0, and setting the first to 2 still gives no `Gather`; `pg_jit_available()` = false even though `jit` = on. Both topics need a real PostgreSQL server for hands-on practice.

## Example

On PGlite (measured):

```text
EXPLAIN (COSTS OFF) SELECT count(*) FROM big;
Aggregate
  ->  Seq Scan on big
```

The typical shape on a server with workers (two-stage aggregation as in the "Parallel Aggregation" section of the docs; not run here):

```text
Finalize Aggregate
  ->  Gather
        Workers Planned: 2
        ->  Partial Aggregate
              ->  Parallel Seq Scan on big
```

## Practice

Read the settings, check JIT, then predict the plan on PGlite. Expert skill: know when a query goes parallel, why it does not, and when to turn JIT off for an OLTP workload.
