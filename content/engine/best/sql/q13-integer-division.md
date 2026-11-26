---
id: e-bp-q13
engine: best
track: sql
level: L1
module: q
title: "Chia số nguyên: ép kiểu trước khi chia"
title_en: "Cast before dividing integers"
kind: quiz
minutes: 2
objectives:
  - vi: "Ép một vế sang `numeric` trước khi chia hai số đếm."
    en: "Cast one side to `numeric` before dividing two counts."
avoid:
  vi: "Tỷ lệ 29 % hiện thành 0."
  en: "A 29% share that shows up as 0."
requires: []
skills: [cast, conditional_agg]
adv: []
sources:
  - https://www.postgresql.org/docs/18/functions-math.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT count(*) FILTER (WHERE channel = 'ONLINE') / count(*) AS online_share
    FROM orders
  good: |
    SELECT round(count(*) FILTER (WHERE channel = 'ONLINE')::numeric / count(*), 4) AS online_share
    FROM orders
  expect: null
lint:
  rule: q13
  tip:
    vi: "Chia hai `count` cho nhau là chia số nguyên, phần lẻ bị bỏ. Ép một vế sang `numeric` nhé."
    en: "Dividing two `count`s is integer division and drops the fraction. Cast one side to `numeric`."
quiz:
  - q:
      vi: "`SELECT 415 / 1428` trả gì trong PostgreSQL?"
      en: "What does `SELECT 415 / 1428` return in PostgreSQL?"
    options:
      - { vi: "0,2906", en: "0.2906" }
      - { vi: "0", en: "0" }
      - { vi: "Báo lỗi", en: "An error" }
    answer: 1
    why:
      vi: "Hai vế đều là số nguyên nên phép chia cũng nguyên: 0,29 bị cắt phần lẻ về phía 0, còn 0. Không có lỗi, chỉ mất phần thập phân. `415::numeric / 1428` mới cho 0,2906…"
      en: "Both sides are integers, so the division is integer too: 0.29 is truncated towards zero, leaving 0. There is no error, only the decimals are lost. `415::numeric / 1428` gives 0.2906…"
---

## Ý chính

Tỷ lệ giữa hai số đếm phải ép một vế sang `numeric` (hoặc nhân với `100.0`) trước khi chia.

## Vì sao

- `count(…)` trả `bigint`. Số nguyên chia số nguyên là phép chia nguyên, cắt phần thập phân về phía 0.
- Tỷ lệ 0,29 thành 0, và câu không báo gì.

## Ví dụ

Trên `lab`, tỷ lệ đơn online: bản chia thẳng trả 0. Bản ép `::numeric` trả 0,2906.

# EN

## Key idea

A ratio of two counts must cast one side to `numeric` (or multiply by `100.0`) before dividing.

## Why

- `count(…)` returns `bigint`. An integer divided by an integer is integer division, which truncates the fraction towards zero.
- A share of 0.29 becomes 0, and nothing warns you.

## Example

On `lab`, the share of online orders: the plain division returns 0. The `::numeric` version returns 0.2906.
