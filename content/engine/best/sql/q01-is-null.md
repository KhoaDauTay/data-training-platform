---
id: e-bp-q01
engine: best
track: sql
level: L1
module: q
title: "So sánh với NULL bằng IS NULL"
title_en: "Compare with NULL using IS NULL"
kind: quiz
minutes: 2
objectives:
  - vi: "Kiểm giá trị thiếu bằng `IS NULL` / `IS NOT NULL`."
    en: "Test for a missing value with `IS NULL` / `IS NOT NULL`."
avoid:
  vi: "Bộ lọc `= NULL` luôn trả 0 dòng mà không báo lỗi."
  en: "An `= NULL` filter that always returns 0 rows and no error."
requires: [e-pg-l1-05]
skills: [null_logic]
adv: []
sources:
  - https://www.postgresql.org/docs/18/functions-comparison.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT count(*) AS customers FROM customers WHERE email = NULL
  good: |
    SELECT count(*) AS customers FROM customers WHERE email IS NULL
  expect: null
lint:
  rule: q01
  tip:
    vi: "Mình thấy so sánh `= NULL`: so với NULL luôn ra \"không biết\", nên điều kiện này không bao giờ đúng. Thử `IS NULL` nhé."
    en: "I see a comparison with `= NULL`: it is never true, so no row passes. Try `IS NULL`."
quiz:
  - q:
      vi: "Bảng `customers` có 13 khách không có email. `WHERE email = NULL` trả bao nhiêu dòng?"
      en: "Table `customers` has 13 customers with no email. How many rows does `WHERE email = NULL` return?"
    options:
      - { vi: "13", en: "13" }
      - { vi: "0", en: "0" }
      - { vi: "Báo lỗi cú pháp", en: "A syntax error" }
    answer: 1
    why:
      vi: "`email = NULL` cho NULL (không biết) ở mọi dòng, kể cả dòng có email là NULL. `WHERE` chỉ giữ dòng true, nên không còn dòng nào. Câu vẫn chạy, không báo gì."
      en: "`email = NULL` yields NULL (unknown) on every row, even where email is NULL. `WHERE` keeps only true rows, so none is left. The query still runs, with no warning."
---

## Ý chính

Kiểm giá trị thiếu bằng `IS NULL` hoặc `IS NOT NULL`. Không bao giờ viết `= NULL` hay `<> NULL`.

## Vì sao

- So sánh thường với NULL cho ra NULL (không biết), không phải true.
- `WHERE` chỉ giữ dòng có điều kiện true, nên `= NULL` luôn trả 0 dòng.
- Postgres không báo lỗi, nên bạn chỉ thấy một con số 0 trông rất hợp lý.

## Ví dụ

Trên dữ liệu cửa hàng (`lab`), bản `= NULL` đếm 0 khách. Bản `IS NULL` đếm 13 khách chưa có email.

# EN

## Key idea

Test for a missing value with `IS NULL` or `IS NOT NULL`. Never write `= NULL` or `<> NULL`.

## Why

- An ordinary comparison with NULL yields NULL (unknown), not true.
- `WHERE` keeps only rows whose condition is true, so `= NULL` always returns 0 rows.
- Postgres raises no error, so all you see is a plausible-looking 0.

## Example

On the shop data (`lab`), the `= NULL` version counts 0 customers. The `IS NULL` version counts the 13 customers with no email.
