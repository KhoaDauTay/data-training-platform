---
id: e-bp-q04
engine: best
track: sql
level: L1
module: q
title: "count(*) đếm dòng, count(cột) đếm giá trị"
title_en: "count(*) counts rows, count(column) counts values"
kind: quiz
minutes: 2
objectives:
  - vi: "Đếm dòng bằng `count(*)`; dùng `count(col)` chỉ khi muốn đếm giá trị khác NULL, và đặt tên nói đúng điều đó."
    en: "Count rows with `count(*)`; use `count(col)` only to count non-NULL values, and name the result to say so."
avoid:
  vi: "\"Số khách\" thiếu những khách chưa có email."
  en: "A \"number of customers\" that misses customers with no email."
requires: [e-pg-l1-05]
skills: [aggregate]
adv: []
sources:
  - https://www.postgresql.org/docs/18/functions-aggregate.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT count(email) AS customers FROM customers
  good: |
    SELECT count(*) AS customers, count(email) AS customers_with_email FROM customers
  expect: null
quiz:
  - q:
      vi: "Cột `v` có ba dòng: 1, NULL, 3. `SELECT count(*), count(v)` cho ra gì?"
      en: "Column `v` has three rows: 1, NULL, 3. What does `SELECT count(*), count(v)` return?"
    options:
      - { vi: "3 và 3", en: "3 and 3" }
      - { vi: "3 và 2", en: "3 and 2" }
      - { vi: "2 và 2", en: "2 and 2" }
    answer: 1
    why:
      vi: "`count(*)` đếm dòng. `count(v)` chỉ đếm dòng có `v` khác NULL. `sum`, `avg`, `min`, `max` cũng bỏ qua NULL."
      en: "`count(*)` counts rows. `count(v)` counts only rows where `v` is not NULL. `sum`, `avg`, `min` and `max` skip NULLs too."
---

## Ý chính

Đếm dòng thì dùng `count(*)`. Chỉ dùng `count(col)` khi bạn muốn đếm giá trị khác NULL, và đặt tên cột kết quả nói đúng điều đó.

## Vì sao

- Mọi hàm gộp trừ `count(*)` đều bỏ qua NULL.
- "Số khách" tính bằng `count(email)` thiếu những khách không có email, và không có gì báo.
- Một cái tên như `customers_with_email` giúp người đọc hiểu đúng con số.

## Ví dụ

Trên `lab`, `count(email)` đặt tên `customers` cho ra 287. Thật ra có 300 khách; 287 là số khách có email.

# EN

## Key idea

To count rows, use `count(*)`. Use `count(col)` only when you want to count non-NULL values, and give the result a name that says so.

## Why

- Every aggregate except `count(*)` skips NULLs.
- A "number of customers" computed as `count(email)` misses customers with no email, and nothing tells you.
- A name such as `customers_with_email` helps readers understand the number.

## Example

On `lab`, `count(email)` named `customers` returns 287. There are really 300 customers; 287 is the number with an email.
