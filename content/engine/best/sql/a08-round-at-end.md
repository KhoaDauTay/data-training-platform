---
id: e-bp-a08
engine: best
track: sql
level: L1
module: a
title: "Làm tròn ở bước cuối"
title_en: "Round once, at the end"
kind: quiz
minutes: 2
objectives:
  - vi: "Tính bằng độ chính xác đầy đủ và chỉ `round()` con số cuối cùng, trừ khi nghiệp vụ bắt làm tròn từng dòng."
    en: "Compute at full precision and `round()` only the final figure, unless the business requires rounding each line."
avoid:
  vi: "Hai báo cáo cùng nguồn ra hai con số khác nhau vì một bên làm tròn từng dòng."
  en: "Two reports from the same data showing two different figures because one rounds every line."
requires: [e-pg-l1-01]
skills: [aggregate, cast]
adv: []
sources:
  - https://www.postgresql.org/docs/18/functions-math.html
  - https://www.postgresql.org/docs/18/datatype-numeric.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT sum(round(qty * unit_price_vnd * 0.9, -3)) AS discounted_vnd
    FROM order_items
    WHERE order_id < 500
  good: |
    SELECT round(sum(qty * unit_price_vnd * 0.9), -3) AS discounted_vnd
    FROM order_items
    WHERE order_id < 500
  expect: null
quiz:
  - q:
      vi: "Ba dòng, mỗi dòng 1.400 đồng. Làm tròn tới nghìn từng dòng rồi cộng, so với cộng rồi mới làm tròn. Hai kết quả là gì?"
      en: "Three lines of 1,400 dong each. Round each line to the thousand and add, versus add first and round once. What are the two results?"
    options:
      - { vi: "3.000 và 4.000", en: "3,000 and 4,000" }
      - { vi: "Cả hai là 4.000", en: "Both are 4,000" }
      - { vi: "Cả hai là 3.000", en: "Both are 3,000" }
    answer: 0
    why:
      vi: "Mỗi dòng 1.400 làm tròn thành 1.000, cộng lại 3.000. Cộng trước được 4.200, làm tròn thành 4.000. Sai số của từng dòng cộng dồn lại."
      en: "Each 1,400 line rounds to 1,000, which adds up to 3,000. Adding first gives 4,200, which rounds to 4,000. The error of each line accumulates."
---

## Ý chính

Tính bằng độ chính xác đầy đủ, chỉ `round()` con số cuối cùng. Nếu nghiệp vụ bắt làm tròn từng dòng (ví dụ từng dòng hóa đơn), ghi rõ điều đó trong truy vấn.

## Vì sao

- Mỗi lần làm tròn bỏ đi một phần nhỏ. Làm tròn từng dòng rồi cộng thì các phần nhỏ đó cộng dồn lại.
- Hai báo cáo cùng nguồn, một bên làm tròn từng dòng, một bên làm tròn cuối, ra hai con số khác nhau.
- `numeric` giữ đủ chữ số khi tính, nên không có lý do làm tròn sớm.

# EN

## Key idea

Compute at full precision and `round()` only the final figure. If the business requires rounding each line (each invoice line, say), make that explicit in the query.

## Why

- Every rounding drops a small amount. Round each line and then add, and those small amounts accumulate.
- Two reports from the same data, one rounding each line and one rounding at the end, show two different figures.
- `numeric` keeps every digit while computing, so there is no reason to round early.
