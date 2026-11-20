---
id: e-bp-a17
engine: best
track: sql
level: L2
module: a
title: "Top N: chọn luật hòa có chủ đích"
title_en: "Top N: choose the tie rule on purpose"
kind: quiz
minutes: 3
objectives:
  - vi: "Nói rõ luật hòa của \"top N\": `rank()` giữ mọi dòng bằng điểm, hoặc `row_number()` với tiebreaker nghiệp vụ trong `ORDER BY`."
    en: "State the tie rule of a \"top N\": `rank()` keeps every tied row, or `row_number()` with a business tiebreaker in `ORDER BY`."
avoid:
  vi: "Danh sách top đổi giữa các lần chạy, và hai sản phẩm bằng điểm bị đối xử khác nhau."
  en: "A top list that changes between runs, with two tied products treated differently."
requires: []
skills: [window_rank]
adv: [a9]
sources:
  - https://www.postgresql.org/docs/18/functions-window.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT product_id, lines
    FROM (
      SELECT product_id, count(*) AS lines,
             row_number() OVER (ORDER BY count(*) DESC) AS rn
      FROM order_items
      GROUP BY product_id
    ) AS t
    WHERE rn <= 2
    ORDER BY lines DESC, product_id
  good: |
    SELECT product_id, lines
    FROM (
      SELECT product_id, count(*) AS lines,
             rank() OVER (ORDER BY count(*) DESC) AS rnk
      FROM order_items
      GROUP BY product_id
    ) AS t
    WHERE rnk <= 2
    ORDER BY lines DESC, product_id
  expect: null
quiz:
  - q:
      vi: "Sản phẩm A có 159 dòng bán; B, C, D cùng có 158. Lọc `rank() … <= 2` trả mấy sản phẩm?"
      en: "Product A has 159 order lines; B, C and D have 158 each. How many products does a `rank() … <= 2` filter return?"
    options:
      - { vi: "2", en: "2" }
      - { vi: "4", en: "4" }
      - { vi: "3", en: "3" }
    answer: 1
    why:
      vi: "`rank()` cho A hạng 1 và cả B, C, D cùng hạng 2, nên giữ cả bốn. `row_number()` thì chọn một trong ba sản phẩm bằng điểm, không theo luật nào."
      en: "`rank()` gives A rank 1 and B, C and D all rank 2, so all four stay. `row_number()` picks one of the three tied products by no rule at all."
---

## Ý chính

"Top N" phải nói rõ khi bằng điểm thì sao: `rank()` (giữ mọi dòng bằng điểm, có thể hơn N dòng), `dense_rank()`, hay `row_number()` với tiebreaker nghiệp vụ trong `ORDER BY`. Không dùng `row_number()` với `ORDER BY` không duy nhất.

## Vì sao

- `row_number()` đánh số các dòng bằng nhau theo thứ tự tùy ý, nên sản phẩm nào lọt top có thể đổi giữa các lần chạy.
- Hai sản phẩm bằng điểm bị đối xử khác nhau mà người đọc báo cáo không biết.
- `rank()` cho dòng bằng nhau cùng một hạng, nên luật hòa là rõ ràng.

# EN

## Key idea

A "top N" must say what happens on a tie: `rank()` (keeps every tied row, possibly more than N), `dense_rank()`, or `row_number()` with a business tiebreaker in `ORDER BY`. Never use `row_number()` with an `ORDER BY` that is not unique.

## Why

- `row_number()` numbers tied rows in an arbitrary order, so which product makes the top can change between runs.
- Two tied products are treated differently, and the report's reader cannot tell.
- `rank()` gives tied rows the same rank, so the tie rule is explicit.
