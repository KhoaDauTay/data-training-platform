---
id: ecom-ch7-04
chapter: 7
title: Món nào bị chấm 1–2 sao?
title_en: Which items got one or two stars?
from: { name: Mạc Thùy Linh, dept: Category }
difficulty: 2
beat: rest
requires: [null_logic, multi_join, aggregate, group_by, where, order_by]
grants: []
tables: [reviews, products, sellers]
ordered: true
columns:
  - { vi: "Mã SKU", en: "SKU code" }
  - { vi: "Số đánh giá 1–2 sao", en: "One- and two-star reviews" }
  - { vi: "Số đánh giá chỉ chấm sao", en: "Stars only, no comment" }
variants:
  - { from: "2026-07-01", to: "2026-10-01", q: "3/2026", q_en: "Q3 2026" }
  - { from: "2026-04-01", to: "2026-07-01", q: "2/2026", q_en: "Q2 2026" }
  - { from: "2026-01-01", to: "2026-04-01", q: "1/2026", q_en: "Q1 2026" }
reflect:
  q: { vi: "Vì sao đếm cột lời nhận xét lại ra số nhỏ hơn đếm mọi dòng?", en: "Why does counting the comment column give a smaller number than counting every row?" }
  options:
    - { vi: "Đếm một cột bỏ qua ô trống, và đánh giá chỉ chấm sao có ô lời nhận xét trống", en: "Counting a column skips empty cells, and a stars-only review has an empty comment" }
    - { vi: "Vì lời nhận xét ngắn không được đếm", en: "Because short comments are not counted" }
    - { vi: "Vì đánh giá trùng bị bỏ", en: "Because duplicate reviews are dropped" }
  answer: 0
  why: { vi: "Đếm mọi dòng trừ đếm một cột chính là số ô trống của cột đó.", en: "Counting every row minus counting one column is exactly the number of empty cells in that column." }
wrong:
  - sql: "SELECT p.sku, count(*), count(*) - count(r.comment) FROM reviews r JOIN products p ON p.id = r.product_id JOIN sellers s ON s.id = p.seller_id WHERE s.name = 'Highland Gadget Hub' AND r.rating < 2 AND r.created_on >= '{{from}}' AND r.created_on < '{{to}}' GROUP BY p.sku ORDER BY 2 DESC, p.sku"
    vi: "Bạn chỉ lấy đánh giá 1 sao. Đề cần cả 1 và 2 sao."
    en: "You only take one-star reviews. The request wants one and two stars."
---
Mình làm việc với các shop. Trước khi gọi cho Highland Gadget Hub, mình cần biết món nào của họ bị chấm thấp, và bao nhiêu khách chấm thấp mà không viết lời nào (những khách này mình sẽ gọi hỏi).

## Task
Các đánh giá 1 hoặc 2 sao viết trong quý {{q}} cho sản phẩm của shop Highland Gadget Hub. Với mỗi mã SKU có ít nhất một đánh giá như vậy: số đánh giá đó, và bao nhiêu trong số đó chỉ chấm sao, không có lời nhận xét. Nhiều đánh giá thấp nhất lên đầu; bằng nhau thì xếp theo mã SKU.

## Hints
1. Lọc đánh giá thấp của shop, gom theo SKU; đếm mọi dòng, và đếm dòng có lời nhận xét để suy ra dòng không có.
2. `count(r.comment)` bỏ qua ô trống, nên `count(*) - count(r.comment)` là số đánh giá chỉ chấm sao.
3. `SELECT p.sku, count(*), count(*) - count(r.comment) FROM reviews r JOIN products p ... JOIN sellers s ... WHERE ... GROUP BY p.sku ORDER BY 2 DESC, p.sku`

## Solution
```sql
SELECT p.sku, count(*), count(*) - count(r.comment)
FROM reviews r
JOIN products p ON p.id = r.product_id
JOIN sellers s ON s.id = p.seller_id
WHERE s.name = 'Highland Gadget Hub' AND r.rating <= 2
  AND r.created_on >= '{{from}}' AND r.created_on < '{{to}}'
GROUP BY p.sku
ORDER BY 2 DESC, p.sku
```

# EN
I work with the shops. Before I call Highland Gadget Hub, I need to know which of their items got low ratings, and how many customers rated low without writing anything (those are the ones I will call).

## Task
Reviews of one or two stars written in {{q_en}} for Highland Gadget Hub's products. For each SKU code with at least one such review: the number of those reviews, and how many of them are stars only, with no comment. Most low reviews first; on equal numbers, by SKU code.

## Hints
1. Filter the shop's low reviews and group by SKU; count every row, and count the rows with a comment to work out the ones without.
2. `count(r.comment)` skips empty cells, so `count(*) - count(r.comment)` is the number of stars-only reviews.
3. `SELECT p.sku, count(*), count(*) - count(r.comment) FROM reviews r JOIN products p ... JOIN sellers s ... WHERE ... GROUP BY p.sku ORDER BY 2 DESC, p.sku`
