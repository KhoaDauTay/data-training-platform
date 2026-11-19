---
id: e-bp-s03
engine: best
track: postgres
level: L1
module: s
title: "Tiền dùng numeric, không dùng float"
title_en: "Money as numeric, never float"
kind: quiz
minutes: 2
objectives:
  - vi: "Lưu tiền bằng `numeric(p, s)` hoặc `bigint` theo đơn vị nhỏ nhất, không bằng `float8`, `real` hay `money`."
    en: "Store money as `numeric(p, s)` or as `bigint` in the smallest unit, never as `float8`, `real` or `money`."
avoid:
  vi: "Tổng lệch vài đồng và phép so sánh bằng trả false."
  en: "Totals a few units off, and equality checks that return false."
requires: [e-pg-l1-01]
skills: [cast]
adv: []
sources:
  - https://www.postgresql.org/docs/18/datatype-numeric.html
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_money
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT 0.1::float8 + 0.2::float8 = 0.3::float8 AS equal
  good: |
    SELECT 0.1::numeric + 0.2::numeric = 0.3::numeric AS equal
  expect: null
quiz:
  - q:
      vi: "`SELECT 0.1::float8 + 0.2::float8 = 0.3::float8` trả gì?"
      en: "What does `SELECT 0.1::float8 + 0.2::float8 = 0.3::float8` return?"
    options:
      - { vi: "true", en: "true" }
      - { vi: "false", en: "false" }
      - { vi: "NULL", en: "NULL" }
    answer: 1
    why:
      vi: "Số thực nhị phân không biểu diễn đúng 0,1 và 0,2, nên tổng là 0,30000000000000004. `numeric` lưu số thập phân chính xác, nên phép so sánh trả true."
      en: "Binary floating point cannot represent 0.1 and 0.2 exactly, so the sum is 0.30000000000000004. `numeric` stores decimals exactly, so the comparison returns true."
---

## Ý chính

Tiền lưu bằng `numeric(p, s)`, hoặc `bigint` theo đơn vị nhỏ nhất (đồng, cent). Không dùng `float8`/`real`, cũng không dùng kiểu `money`.

## Vì sao

- Số thực nhị phân không biểu diễn đúng 0,1: docs gọi nó là "inexact". Tổng lệch vài đồng và phép so sánh bằng sai.
- `money` phụ thuộc thiết lập `lc_monetary` và không có phần lẻ dưới cent.

# EN

## Key idea

Store money as `numeric(p, s)`, or as `bigint` in the smallest unit (dong, cents). Do not use `float8`/`real`, and do not use the `money` type either.

## Why

- Binary floating point cannot represent 0.1 exactly: the docs call it "inexact". Totals drift by a few units and equality checks fail.
- `money` depends on the `lc_monetary` setting and has no fraction below a cent.

