---
id: e-bp-q07
engine: best
track: sql
level: L2
module: q
title: "Gộp trước rồi mới join hai bảng con"
title_en: "Aggregate before joining two child tables"
kind: quiz
minutes: 4
objectives:
  - vi: "Gộp mỗi bảng con về đúng grain của bảng cha trước khi join, để tổng không bị nhân lên."
    en: "Aggregate each child table to the parent's grain before joining, so totals are not multiplied."
avoid:
  vi: "Tổng tiền gấp ba sổ sách vì join fan-out, không có lỗi nào."
  en: "A money total three times the books because of join fan-out, with no error."
requires: []
skills: [multi_join, cte]
adv: [c2]
sources:
  - https://www.postgresql.org/docs/18/queries-with.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT sum(p.amount_vnd) AS paid
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN payments p ON p.order_id = o.id
    WHERE o.order_date >= DATE '2026-10-01'
  good: |
    WITH paid AS (
      SELECT order_id, sum(amount_vnd) AS amount_vnd
      FROM payments
      GROUP BY order_id
    )
    SELECT sum(paid.amount_vnd) AS paid
    FROM orders o
    JOIN paid ON paid.order_id = o.id
    WHERE o.order_date >= DATE '2026-10-01'
  expect: null
quiz:
  - q:
      vi: "Một đơn có 3 dòng hàng và 1 khoản trả 100.000. Join `orders` với `order_items` và `payments` rồi `sum(p.amount_vnd)`. Kết quả cho đơn này là bao nhiêu?"
      en: "An order has 3 lines and 1 payment of 100,000. You join `orders` to `order_items` and `payments`, then `sum(p.amount_vnd)`. What is the result for this order?"
    options:
      - { vi: "100.000", en: "100,000" }
      - { vi: "300.000", en: "300,000" }
      - { vi: "Báo lỗi vì join mơ hồ", en: "An error, because the join is ambiguous" }
    answer: 1
    why:
      vi: "Join với 3 dòng hàng tạo 3 dòng, mỗi dòng mang cùng khoản trả 100.000, nên `sum` ra 3 × 100.000 = 300.000. Không có lỗi: join nhiều bảng là hợp lệ, chỉ số dòng bị nhân lên. Gộp `payments` theo đơn trước, rồi mới join, thì mỗi đơn chỉ còn một dòng."
      en: "Joining 3 lines makes 3 rows, each carrying the same 100,000 payment, so `sum` gives 3 × 100,000 = 300,000. There is no error: joining several tables is valid, it just multiplies the rows. Aggregate `payments` per order first, then join, and each order has one row."
---

## Ý chính

Không join một bảng cha với **hai** bảng con (cùng là quan hệ 1-n: một dòng cha, nhiều dòng con) rồi mới `sum`. Gộp từng bảng con về đúng grain (mức chi tiết) của bảng cha trước, bằng truy vấn con (subquery) hoặc CTE, rồi mới join.

## Vì sao

- Join hai quan hệ 1-n nhân số dòng (fan-out).
- Mỗi khoản trả lặp lại theo số dòng hàng, nên tổng tiền bị nhân lên.
- Câu vẫn chạy, con số chỉ "to hơn một chút".

## Ví dụ

Trên `lab`, đơn từ 2026-10-01: bản join thẳng cho tổng đã trả 295.481.100. Bản gộp `payments` trước cho 98.493.700, đúng sổ.

# EN

## Key idea

Never join a parent table to **two** child tables (both 1-n: one parent row, many child rows) and then `sum`. Aggregate each child to the parent's grain (level of detail) first, in a subquery or CTE, and only then join.

## Why

- Joining two 1-n relations multiplies the rows (fan-out).
- Each payment repeats once per order line, so the money total is multiplied.
- The query still runs; the number is just "a bit bigger".

## Example

On `lab`, orders since 2026-10-01: the direct join gives a paid total of 295,481,100. Aggregating `payments` first gives 98,493,700, which matches the books.
