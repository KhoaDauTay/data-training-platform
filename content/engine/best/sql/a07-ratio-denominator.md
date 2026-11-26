---
id: e-bp-a07
engine: best
track: sql
level: L2
module: a
title: "Tỷ lệ phải có mẫu số rõ ràng"
title_en: "Ratios need an explicit denominator"
kind: quiz
minutes: 3
objectives:
  - vi: "Viết tỷ lệ bằng `count(*) FILTER (WHERE …)::numeric / count(*)`, hoặc `avg(CASE … THEN 1 ELSE 0 END)` có `ELSE 0`."
    en: "Write a ratio as `count(*) FILTER (WHERE …)::numeric / count(*)`, or `avg(CASE … THEN 1 ELSE 0 END)` with `ELSE 0`."
avoid:
  vi: "Một tỷ lệ luôn ra 100 % vì các dòng không thỏa bị bỏ khỏi mẫu số."
  en: "A ratio that always comes out at 100% because the rows that fail the test drop out of the denominator."
requires: [e-pg-l1-05]
skills: [case_when, conditional_agg]
adv: [b1]
sources:
  - https://www.postgresql.org/docs/18/functions-aggregate.html
  - https://www.postgresql.org/docs/18/functions-conditional.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT avg(CASE WHEN delivered_on IS NOT NULL THEN 1 END) AS delivered_share
    FROM orders
    WHERE channel = 'ONLINE'
  good: |
    SELECT round(count(*) FILTER (WHERE delivered_on IS NOT NULL)::numeric / count(*), 4) AS delivered_share
    FROM orders
    WHERE channel = 'ONLINE'
  expect: null
quiz:
  - q:
      vi: "`avg(CASE WHEN delivered_on IS NOT NULL THEN 1 END)` trên 100 đơn, 90 đơn đã giao. Kết quả là bao nhiêu?"
      en: "`avg(CASE WHEN delivered_on IS NOT NULL THEN 1 END)` over 100 orders, 90 of them delivered. What is the result?"
    options:
      - { vi: "0,9", en: "0.9" }
      - { vi: "1", en: "1" }
      - { vi: "90", en: "90" }
    answer: 1
    why:
      vi: "Không có `ELSE`, 10 đơn chưa giao cho NULL. `avg` bỏ qua NULL, nên nó chia tổng 90 cho 90 giá trị còn lại: ra 1, không phải 0,9 (cũng không phải 90, vì `avg` chia chứ không chỉ cộng). Thêm `ELSE 0` hoặc dùng `FILTER` thì mẫu số là đủ 100 đơn."
      en: "With no `ELSE`, the 10 undelivered orders give NULL. `avg` ignores NULLs, so it divides the sum 90 by the 90 values left: 1, not 0.9 (and not 90, since `avg` divides rather than just adds). Add `ELSE 0`, or use `FILTER`, and the denominator is all 100 orders."
---

## Ý chính

Viết tỷ lệ sao cho mẫu số hiện rõ: `count(*) FILTER (WHERE …)::numeric / count(*)`. Nếu dùng `avg(CASE …)` thì phải có `ELSE 0`.

## Vì sao

- `CASE WHEN … THEN 1 END` không có `ELSE` cho NULL ở mọi dòng không thỏa.
- Mọi hàm gộp trừ `count(*)` bỏ qua NULL, nên `avg` chỉ thấy các số 1. Kết quả luôn là 1, tức 100 %.
- `count(*)` ở mẫu số đếm đủ mọi dòng, nên người đọc thấy ngay tỷ lệ này "trên bao nhiêu".

# EN

## Key idea

Write a ratio so its denominator is visible: `count(*) FILTER (WHERE …)::numeric / count(*)`. If you use `avg(CASE …)`, it needs `ELSE 0`.

## Why

- `CASE WHEN … THEN 1 END` with no `ELSE` gives NULL on every row that fails the test.
- Every aggregate except `count(*)` ignores NULLs, so `avg` sees only the 1s. The result is always 1, that is 100%.
- `count(*)` in the denominator counts every row, so the reader sees at once what the ratio is "out of".
