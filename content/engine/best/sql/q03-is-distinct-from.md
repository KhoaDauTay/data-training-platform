---
id: e-bp-q03
engine: best
track: sql
level: L2
module: q
title: "So sánh an toàn với NULL: IS DISTINCT FROM"
title_en: "Null-safe comparison with IS DISTINCT FROM"
kind: quiz
minutes: 3
objectives:
  - vi: "Dùng `IS DISTINCT FROM` khi \"khác giá trị này\" phải tính cả dòng chưa biết."
    en: "Use `IS DISTINCT FROM` when \"different from this value\" must include unknown rows."
avoid:
  vi: "Bộ lọc \"khác X\" âm thầm bỏ mọi dòng có giá trị NULL."
  en: "A \"not X\" filter that silently drops every row whose value is NULL."
requires: [e-pg-l1-05]
skills: [null_logic, where]
adv: []
sources:
  - https://www.postgresql.org/docs/18/functions-comparison.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT count(*) AS customers FROM customers WHERE city <> 'Hanoi'
  good: |
    SELECT count(*) AS customers FROM customers WHERE city IS DISTINCT FROM 'Hanoi'
  expect: null
quiz:
  - q:
      vi: "Bạn cần số khách \"không ở Hà Nội\", kể cả khách chưa khai thành phố. Điều kiện nào đúng?"
      en: "You need the number of customers \"not in Hanoi\", including those who never gave a city. Which condition is right?"
    options:
      - { vi: "`city <> 'Hanoi'`", en: "`city <> 'Hanoi'`" }
      - { vi: "`city IS DISTINCT FROM 'Hanoi'`", en: "`city IS DISTINCT FROM 'Hanoi'`" }
      - { vi: "`NOT (city = 'Hanoi')`", en: "`NOT (city = 'Hanoi')`" }
    answer: 1
    why:
      vi: "`<>` và `NOT (… = …)` cho NULL khi `city` là NULL, nên dòng đó bị bỏ. `IS DISTINCT FROM` coi NULL là một giá trị: NULL khác 'Hanoi' là true."
      en: "`<>` and `NOT (… = …)` yield NULL when `city` is NULL, so that row is dropped. `IS DISTINCT FROM` treats NULL as a value: NULL differs from 'Hanoi', which is true."
---

## Ý chính

Khi cột có thể NULL và bạn muốn "khác giá trị này, kể cả chưa biết", dùng `IS DISTINCT FROM`. Hoặc viết rõ: `city <> 'Hanoi' OR city IS NULL`.

## Vì sao

- `city <> 'Hanoi'` cho NULL ở dòng có `city` là NULL, và `WHERE` bỏ dòng đó.
- Người đọc báo cáo thường không biết có một nhóm đã biến mất.
- `IS DISTINCT FROM` không bao giờ trả NULL.

## Ví dụ

Trên `lab`, `city <> 'Hanoi'` đếm 245 khách. `city IS DISTINCT FROM 'Hanoi'` đếm 262: thêm 17 khách chưa khai thành phố.

# EN

## Key idea

When a column can be NULL and you mean "different from this value, unknown included", use `IS DISTINCT FROM`. Or spell it out: `city <> 'Hanoi' OR city IS NULL`.

## Why

- `city <> 'Hanoi'` yields NULL on rows whose `city` is NULL, and `WHERE` drops those rows.
- People reading the report usually do not know a group has vanished.
- `IS DISTINCT FROM` never returns NULL.

## Example

On `lab`, `city <> 'Hanoi'` counts 245 customers. `city IS DISTINCT FROM 'Hanoi'` counts 262: 17 more customers who never gave a city.
