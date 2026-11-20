---
id: e-bp-p01
engine: best
track: postgres
level: L2
module: p
title: "Đọc EXPLAIN ANALYZE: so số dòng ước lượng với số dòng thật"
title_en: "Read EXPLAIN ANALYZE: compare estimated and actual rows"
kind: quiz
minutes: 4
objectives:
  - vi: "Dùng `EXPLAIN (ANALYZE, BUFFERS)` để so `rows` ước lượng với `actual rows` ở từng nút, và chạy `ANALYZE` khi hai số lệch xa."
    en: "Use `EXPLAIN (ANALYZE, BUFFERS)` to compare estimated `rows` with `actual rows` at each node, and run `ANALYZE` when they are far apart."
avoid:
  vi: "Tối ưu theo một con số ước lượng sai, vì thống kê đã cũ sau một lần sửa dữ liệu lớn."
  en: "Tuning a query around a wrong estimate, because the statistics went stale after a big data change."
requires: [e-pg-l2-14, e-pg-l2-15]
skills: [explain_read]
adv: [a10]
sources:
  - https://www.postgresql.org/docs/18/using-explain.html
  - https://www.postgresql.org/docs/18/planner-stats.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: runs
  setup: |
    CREATE TABLE orders (id int PRIMARY KEY, status text NOT NULL);
    INSERT INTO orders SELECT i, 'PAID' FROM generate_series(1, 20000) AS i;
    ANALYZE orders;
    UPDATE orders SET status = 'REFUNDED' WHERE id % 10 = 0;
  bad: |
    EXPLAIN SELECT id FROM orders WHERE status = 'REFUNDED'
  good: |
    EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY OFF) SELECT id FROM orders WHERE status = 'REFUNDED'
  expect: null
quiz:
  - q:
      vi: "`EXPLAIN ANALYZE` cho một nút `rows=1` nhưng `actual rows=2000.00`. Việc đầu tiên nên làm là gì?"
      en: "`EXPLAIN ANALYZE` shows a node with `rows=1` but `actual rows=2000.00`. What should you do first?"
    options:
      - { vi: "Tạo thêm index", en: "Create another index" }
      - { vi: "Chạy `ANALYZE` trên bảng rồi xem lại kế hoạch", en: "Run `ANALYZE` on the table, then look at the plan again" }
      - { vi: "Không cần làm gì, ước lượng luôn lệch", en: "Nothing, estimates are always off" }
    answer: 1
    why:
      vi: "Lệch gấp hàng nghìn lần nghĩa là thống kê không còn đúng với dữ liệu. Planner chọn cách quét và cách join theo ước lượng, nên sửa thống kê trước rồi mới nghĩ tới index."
      en: "A gap of thousands of times means the statistics no longer match the data. The planner picks scans and joins from estimates, so fix the statistics before thinking about indexes."
---

## Ý chính

Tối ưu từ kế hoạch thật, không đoán. `EXPLAIN (ANALYZE, BUFFERS)` cho cả số dòng planner ước lượng (`rows`) lẫn số dòng thật (`actual rows`) ở từng nút. Lệch hàng chục lần trở lên thì chạy `ANALYZE` trước.

## Vì sao

- Planner chọn cách quét và thứ tự join theo ước lượng. Ước lượng sai thì kế hoạch thực thi sai, dù index đủ.
- Thống kê chỉ cập nhật khi `ANALYZE` chạy, nên sau khi nạp hay sửa nhiều dữ liệu chúng có thể cũ.
- `EXPLAIN ANALYZE` thật sự chạy câu lệnh: với `UPDATE`/`DELETE` thì bọc trong `BEGIN … ROLLBACK`.
- `TIMING OFF` bỏ số mili giây, vốn đổi theo máy.

# EN

## Key idea

Tune from the real plan, not from guesses. `EXPLAIN (ANALYZE, BUFFERS)` shows both the planner's estimate (`rows`) and the real count (`actual rows`) at each node. When they are tens of times apart or more, run `ANALYZE` first.

## Why

- The planner picks scans and join order from its estimates. A wrong estimate gives a wrong execution plan, even with the right indexes.
- Statistics change only when `ANALYZE` runs, so after a big load or update they can be stale.
- `EXPLAIN ANALYZE` really runs the statement: wrap an `UPDATE`/`DELETE` in `BEGIN … ROLLBACK`.
- `TIMING OFF` drops the milliseconds, which change from machine to machine.
