---
id: e-bp-q16
engine: best
track: sql
level: L2
module: q
title: "UNION ALL, trừ khi thật sự cần khử trùng"
title_en: "UNION ALL unless you mean DISTINCT"
kind: quiz
minutes: 3
objectives:
  - vi: "Ghép hai tập dòng bằng `UNION ALL`; chỉ dùng `UNION` khi nghiệp vụ muốn bỏ dòng trùng."
    en: "Stack two sets of rows with `UNION ALL`; use `UNION` only when the business wants duplicates removed."
avoid:
  vi: "Tổng tiền thiếu vì hai khoản trả hợp lệ giống hệt nhau bị gộp làm một."
  en: "A money total that comes up short because two identical, valid payments were merged into one."
requires: []
skills: [union]
adv: []
sources:
  - https://www.postgresql.org/docs/18/queries-union.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT sum(amount_vnd) AS net_vnd
    FROM (
      SELECT order_id, amount_vnd FROM payments WHERE amount_vnd > 0
      UNION
      SELECT order_id, amount_vnd FROM payments WHERE amount_vnd < 0
    ) AS t
  good: |
    SELECT sum(amount_vnd) AS net_vnd
    FROM (
      SELECT order_id, amount_vnd FROM payments WHERE amount_vnd > 0
      UNION ALL
      SELECT order_id, amount_vnd FROM payments WHERE amount_vnd < 0
    ) AS t
  expect: null
quiz:
  - q:
      vi: "Một đơn được trả hai lần, mỗi lần 150.000 đồng. Hai dòng `(order_id, amount_vnd)` giống hệt nhau. Sau `UNION` còn mấy dòng của đơn đó?"
      en: "An order was paid twice, 150,000 dong each time. The two `(order_id, amount_vnd)` rows are identical. How many rows of that order are left after `UNION`?"
    options:
      - { vi: "2", en: "2" }
      - { vi: "1", en: "1" }
      - { vi: "0", en: "0" }
    answer: 1
    why:
      vi: "`UNION` bỏ mọi dòng trùng, kể cả dòng trùng trong cùng một nhánh. Hai khoản trả thật thành một, nên tổng thiếu 150.000 đồng. `UNION ALL` giữ cả hai."
      en: "`UNION` removes every duplicate row, even duplicates inside one branch. Two real payments become one, so the total is 150,000 dong short. `UNION ALL` keeps both."
---

## Ý chính

Ghép hai tập dòng bằng `UNION ALL`. Chỉ dùng `UNION` khi nghiệp vụ thật sự muốn bỏ dòng trùng, và ghi rõ điều đó.

## Vì sao

- `UNION` khử trùng trên cả kết quả, kể cả dòng trùng trong cùng một nhánh.
- Hai khoản trả hợp lệ giống hệt nhau (cùng đơn, cùng số tiền) bị gộp làm một, nên tổng sai mà không báo gì.
- Khử trùng còn tốn thêm một bước sort hoặc hash mà `UNION ALL` không cần.

# EN

## Key idea

Stack two sets of rows with `UNION ALL`. Use `UNION` only when the business really wants duplicates removed, and say so.

## Why

- `UNION` removes duplicates across the whole result, including duplicates inside one branch.
- Two valid, identical payments (same order, same amount) are merged into one, so the total is wrong with no warning.
- Removing duplicates also costs a sort or hash step that `UNION ALL` does not need.
