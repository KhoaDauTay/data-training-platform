---
id: e-bp-q02
engine: best
track: sql
level: L2
module: q
title: "Dùng NOT EXISTS thay NOT IN (truy vấn con)"
title_en: "Use NOT EXISTS, not NOT IN"
kind: quiz
minutes: 3
objectives:
  - vi: "Viết anti join bằng `NOT EXISTS` để lọc \"không có trong tập kia\"."
    en: "Write an anti join with `NOT EXISTS` to keep rows \"not in the other set\"."
avoid:
  vi: "Kết quả rỗng âm thầm khi danh sách so sánh có một NULL."
  en: "Silently empty results when the compared list holds a NULL."
requires: [e-pg-l1-05]
skills: [anti_join, in_subquery, exists]
adv: []
sources:
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_NOT_IN
  - https://www.postgresql.org/docs/18/functions-subquery.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT count(*) AS customers
    FROM customers c
    WHERE c.id NOT IN (
      SELECT o.customer_id FROM orders o WHERE o.order_date >= DATE '2026-10-01'
    )
  good: |
    SELECT count(*) AS customers
    FROM customers c
    WHERE NOT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.customer_id = c.id AND o.order_date >= DATE '2026-10-01'
    )
  expect: null
lint:
  rule: q02
  tip:
    vi: "`NOT IN` với một truy vấn con (subquery) sẽ ra rỗng nếu truy vấn con trả một NULL. Mình hay dùng `NOT EXISTS` cho chắc."
    en: "`NOT IN` over a subquery returns nothing if the subquery yields a NULL. `NOT EXISTS` is the safe choice."
quiz:
  - q:
      vi: "Bảng `orders` có đơn vãng lai với `customer_id` là NULL. Câu nào đếm đúng số khách chưa đặt đơn nào từ tháng 10?"
      en: "Table `orders` holds walk-in orders whose `customer_id` is NULL. Which query correctly counts customers with no order since October?"
    options:
      - { vi: "Bản dùng `NOT IN`", en: "The `NOT IN` version" }
      - { vi: "Bản dùng `NOT EXISTS`", en: "The `NOT EXISTS` version" }
      - { vi: "Cả hai cho cùng một số", en: "Both give the same number" }
    answer: 1
    why:
      vi: "Chỉ cần truy vấn con (subquery) có một NULL, `x NOT IN (…)` cho NULL chứ không phải true, nên `WHERE` bỏ mọi dòng và bản `NOT IN` đếm ra 0; hai bản vì thế không cho cùng một số. `NOT EXISTS` chỉ hỏi \"có dòng khớp không\", nên NULL không ảnh hưởng."
      en: "One NULL in the subquery makes `x NOT IN (…)` NULL rather than true, so `WHERE` drops every row and the `NOT IN` version counts 0; the two versions do not agree. `NOT EXISTS` only asks \"is there a matching row\", so a NULL changes nothing."
---

## Ý chính

Để lọc "không có trong tập kia", dùng `NOT EXISTS`. Chỉ dùng `NOT IN` với một danh sách hằng chắc chắn không có NULL.

## Vì sao

- `x NOT IN (a, b, NULL)` nghĩa là `x <> a AND x <> b AND x <> NULL`. Vế cuối là NULL, nên cả điều kiện không bao giờ true.
- Lỗi này không báo gì: câu vẫn chạy, chỉ trả 0.
- Planner biến `NOT EXISTS` thành anti join, thường rẻ hơn.

# EN

## Key idea

To keep rows "not in the other set", use `NOT EXISTS`. Use `NOT IN` only with a constant list that surely holds no NULL.

## Why

- `x NOT IN (a, b, NULL)` means `x <> a AND x <> b AND x <> NULL`. The last part is NULL, so the whole condition is never true.
- Nothing warns you: the query runs and simply returns 0.
- The planner turns `NOT EXISTS` into an anti join, which is usually cheaper.

