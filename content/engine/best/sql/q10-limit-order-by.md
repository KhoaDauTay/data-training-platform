---
id: e-bp-q10
engine: best
track: sql
level: L1
module: q
title: "LIMIT luôn đi với ORDER BY có tiebreaker"
title_en: "LIMIT needs an ORDER BY with a tiebreaker"
kind: quiz
minutes: 2
objectives:
  - vi: "Viết `ORDER BY` kết thúc bằng một cột duy nhất (thường là khóa) mỗi khi dùng `LIMIT`."
    en: "Write an `ORDER BY` that ends with a unique column (usually the key) whenever you use `LIMIT`."
avoid:
  vi: "Top N đổi dòng giữa hai lần chạy cùng một câu."
  en: "A top N that returns different rows on two runs of the same query."
requires: [e-pg-l1-11]
skills: [order_by, limit]
adv: []
sources:
  - https://www.postgresql.org/docs/18/queries-limit.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: runs
  setup: null
  bad: |
    SELECT id, order_date FROM orders LIMIT 5
  good: |
    SELECT id, order_date
    FROM orders
    ORDER BY order_date DESC, id DESC
    LIMIT 5
  expect: null
lint:
  rule: q10
  tip:
    vi: "Có `LIMIT` mà không có `ORDER BY`: mỗi lần chạy có thể ra những dòng khác nhau."
    en: "`LIMIT` without `ORDER BY` can return different rows on each run."
quiz:
  - q:
      vi: "Năm đơn mới nhất đều có `order_date` là 2026-10-31. `ORDER BY order_date DESC LIMIT 5` có chắc trả cùng 5 đơn mỗi lần chạy không?"
      en: "The five latest orders all have `order_date` 2026-10-31. Does `ORDER BY order_date DESC LIMIT 5` surely return the same 5 orders on every run?"
    options:
      - { vi: "Có, vì đã có `ORDER BY`", en: "Yes, because there is an `ORDER BY`" }
      - { vi: "Không: các dòng hòa nhau có thể đổi chỗ; thêm `id DESC` làm tiebreaker", en: "No: tied rows can swap; add `id DESC` as a tiebreaker" }
      - { vi: "Không, vì `LIMIT` luôn chọn ngẫu nhiên", en: "No, because `LIMIT` always picks at random" }
    answer: 1
    why:
      vi: "Có `ORDER BY` chưa đủ: Postgres chỉ bảo đảm thứ tự theo đúng các cột trong `ORDER BY`, và cả 5 đơn hòa nhau ở `order_date` 2026-10-31, nên khi kế hoạch thực thi đổi chúng có thể ra thứ tự khác (và đơn thứ 6 cùng ngày có thể chen vào). `LIMIT` không ngẫu nhiên, nó lấy N dòng đầu của thứ tự đã có. Thêm `id DESC` (mỗi đơn một `id`) thì thứ tự hoàn toàn xác định."
      en: "An `ORDER BY` is not enough: Postgres only guarantees the order of the columns in `ORDER BY`, and all 5 orders tie on `order_date` 2026-10-31, so when the plan changes they can come out in another order (and a sixth order of that day can slip in). `LIMIT` is not random; it takes the first N rows of the order it is given. Adding `id DESC` (one `id` per order) makes the order fully determined."
---

## Ý chính

`LIMIT` và `OFFSET` chỉ có nghĩa khi có `ORDER BY`. `ORDER BY` phải kết thúc bằng một cột duy nhất, thường là khóa, để thứ tự hoàn toàn xác định.

## Vì sao

- Không có `ORDER BY`, thứ tự dòng không được bảo đảm: docs gọi tập con đó là "unpredictable".
- Có `ORDER BY` nhưng trùng giá trị, các dòng hòa nhau có thể đổi chỗ giữa hai lần chạy, nên top N "nhảy".

## Ví dụ

Trên `lab`, bản không `ORDER BY` trả 5 đơn đầu bảng, từ tháng 1/2025. Bản có `ORDER BY order_date DESC, id DESC` trả 5 đơn mới nhất của ngày 2026-10-31, theo `id` giảm dần.

# EN

## Key idea

`LIMIT` and `OFFSET` only make sense with an `ORDER BY`. The `ORDER BY` must end with a unique column, usually the key, so the order is fully determined.

## Why

- Without `ORDER BY` the row order is not guaranteed: the docs call that subset "unpredictable".
- With an `ORDER BY` on tied values, tied rows can swap between runs, so a top N "jumps".

## Example

On `lab`, the version without `ORDER BY` returns the first 5 orders in the table, from January 2025. The version with `ORDER BY order_date DESC, id DESC` returns the 5 latest orders of 2026-10-31, by descending `id`.
