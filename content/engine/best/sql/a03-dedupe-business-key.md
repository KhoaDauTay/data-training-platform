---
id: e-bp-a03
engine: best
track: sql
level: L2
module: a
title: "Khử trùng lặp theo khóa nghiệp vụ, có thứ tự xác định"
title_en: "Deduplicate on a business key, deterministically"
kind: quiz
minutes: 4
objectives:
  - vi: "Định nghĩa \"trùng\" bằng khóa nghiệp vụ và giữ một dòng bằng `DISTINCT ON` có tiebreaker."
    en: "Define \"duplicate\" by a business key and keep one row with a `DISTINCT ON` that has a tiebreaker."
avoid:
  vi: "`DISTINCT` không bỏ được bản ghi trùng chỉ khác `id` hay thời điểm."
  en: "A `DISTINCT` that cannot remove duplicates differing only in `id` or timestamp."
requires: []
skills: [distinct_on, window_rank]
adv: [c1]
sources:
  - https://www.postgresql.org/docs/18/sql-select.html#SQL-DISTINCT
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT count(*) AS payments
    FROM (SELECT DISTINCT * FROM payments WHERE amount_vnd > 0) t
  good: |
    SELECT count(*) AS payments
    FROM (
      SELECT DISTINCT ON (order_id, amount_vnd) id
      FROM payments
      WHERE amount_vnd > 0
      ORDER BY order_id, amount_vnd, paid_at, id
    ) t
  expect: null
quiz:
  - q:
      vi: "Hai dòng `payments` cùng đơn, cùng số tiền, khác `id` và `paid_at`. `SELECT DISTINCT *` giữ mấy dòng?"
      en: "Two `payments` rows share the order and the amount but differ in `id` and `paid_at`. How many rows does `SELECT DISTINCT *` keep?"
    options:
      - { vi: "1", en: "1" }
      - { vi: "2", en: "2" }
      - { vi: "0", en: "0" }
    answer: 1
    why:
      vi: "`DISTINCT *` so cả dòng. Khác `id` là khác dòng, nên cả hai ở lại. `DISTINCT ON (order_id, amount_vnd)` so theo khóa nghiệp vụ; `ORDER BY …, paid_at, id` quyết định dòng nào được giữ, lần chạy nào cũng vậy."
      en: "`DISTINCT *` compares whole rows. A different `id` makes a different row, so both stay. `DISTINCT ON (order_id, amount_vnd)` compares the business key; `ORDER BY …, paid_at, id` decides which row is kept, the same on every run."
---

## Ý chính

Định nghĩa "trùng" bằng khóa nghiệp vụ (ví dụ cùng đơn, cùng số tiền), không bằng cả dòng. Giữ một dòng bằng `DISTINCT ON (key) … ORDER BY key, keep_rule, id` hoặc `row_number()`, luôn có tiebreaker.

## Vì sao

- `SELECT DISTINCT *` không bỏ được bản ghi trùng có `id` hay thời điểm khác nhau.
- Thiếu tiebreaker thì dòng được giữ có thể đổi giữa hai lần chạy.

## Ví dụ

Bảng `payments` của `lab` có khoản trả trùng có chủ đích. Bản `DISTINCT *` còn 1.357 dòng, bản `DISTINCT ON` còn 1.344: 13 khoản trùng được bỏ.

# EN

## Key idea

Define "duplicate" by a business key (for example same order, same amount), not by the whole row. Keep one row with `DISTINCT ON (key) … ORDER BY key, keep_rule, id` or `row_number()`, always with a tiebreaker.

## Why

- `SELECT DISTINCT *` cannot remove duplicates whose `id` or timestamp differ.
- Without a tiebreaker, the row that is kept can change between runs.

## Example

The `payments` table in `lab` has deliberate duplicate payments. The `DISTINCT *` version keeps 1,357 rows, the `DISTINCT ON` version keeps 1,344: 13 duplicates removed.
