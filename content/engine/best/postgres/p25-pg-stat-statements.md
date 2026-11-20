---
id: e-bp-p25
engine: best
track: postgres
level: L5
module: p
title: "Tìm truy vấn tốn nhất bằng pg_stat_statements"
title_en: "Find the costliest queries with pg_stat_statements"
kind: quiz
minutes: 3
objectives:
  - vi: "Chọn truy vấn cần tối ưu theo `total_exec_time` cộng dồn trong `pg_stat_statements`, không theo một lần chạy chậm."
    en: "Pick the queries to tune by cumulative `total_exec_time` in `pg_stat_statements`, not by one slow run."
avoid:
  vi: "Tối ưu một báo cáo chạy mỗi tuần một lần trong khi một truy vấn nhỏ chạy triệu lần mỗi ngày mới là chỗ tốn."
  en: "Tuning a weekly report while a small query that runs a million times a day is where the time really goes."
requires: [e-pg-l5-11]
skills: [explain_read]
adv: [a10]
sources:
  - https://www.postgresql.org/docs/18/pgstatstatements.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    EXPLAIN ANALYZE SELECT count(*) FROM orders WHERE status = 'PAID';
  good: |
    SELECT query, calls,
           round(total_exec_time) AS total_ms,
           round(mean_exec_time::numeric, 2) AS mean_ms
    FROM pg_stat_statements
    ORDER BY total_exec_time DESC
    LIMIT 10;
  expect: null
quiz:
  - q:
      vi: "Truy vấn A chạy một lần mỗi ngày, mỗi lần 5 giây. Truy vấn B chạy một triệu lần mỗi ngày, mỗi lần chỉ tốn một phần nghìn thời gian của A. Tối ưu cái nào trước?"
      en: "Query A runs once a day, 5 seconds each time. Query B runs a million times a day, each run taking a thousandth of A's time. Which do you tune first?"
    options:
      - { vi: "A, vì nó chậm nhất", en: "A, because it is the slowest" }
      - { vi: "B, vì tổng thời gian của nó lớn gấp khoảng nghìn lần", en: "B, because its total time is about a thousand times larger" }
      - { vi: "Như nhau", en: "Either one" }
    answer: 1
    why:
      vi: "B tốn khoảng 5.000 giây mỗi ngày, A chỉ 5 giây. `total_exec_time` cộng dồn mọi lần chạy, nên nó chỉ ra chỗ tốn thật."
      en: "B costs about 5,000 seconds a day, A only 5. `total_exec_time` adds up every run, so it points at where the time really goes."
---

## Ý chính

Bật `pg_stat_statements` (qua `shared_preload_libraries`) trên mọi môi trường thật. Tối ưu theo `total_exec_time` cộng dồn, không theo một lần chạy chậm. So `mean_exec_time` trước và sau mỗi lần deploy. Lưu ảnh chụp rồi mới `pg_stat_statements_reset()`.

## Vì sao

- Một `EXPLAIN ANALYZE` chỉ nói về một câu, một lần chạy.
- `pg_stat_statements` gộp các câu cùng dạng (hằng số thành `$1`) và cộng dồn số lần gọi và thời gian.
- Extension này phải nạp khi khởi động database, nên thẻ chỉ có cú pháp. Trên PGlite có nạp extension, 50 lần chạy `WHERE id = …` với hằng số khác nhau thành một dòng `WHERE id = $1`, `calls` = 50.

# EN

## Key idea

Enable `pg_stat_statements` (through `shared_preload_libraries`) on every real environment. Tune by cumulative `total_exec_time`, not by one slow run. Compare `mean_exec_time` before and after each deploy. Save a snapshot before `pg_stat_statements_reset()`.

## Why

- One `EXPLAIN ANALYZE` is about one query, run once.
- `pg_stat_statements` groups queries of the same shape (constants become `$1`) and adds up calls and time.
- The extension must be loaded when the database starts, so this card is syntax only. On PGlite with the extension loaded, 50 runs of `WHERE id = …` with different constants become one row `WHERE id = $1` with `calls` = 50.
